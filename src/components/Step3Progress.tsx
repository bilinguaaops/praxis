import React, { useEffect, useState, useRef } from 'react';
import { AssignmentConfig, StudentSubmission, CorrectionResult, LeadData } from '../types';
import confetti from 'canvas-confetti';
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ArrowRight,
  GraduationCap,
  Eye,
  FileText,
  Clock,
  ShieldCheck,
  Play,
  Pause,
  Lock,
} from 'lucide-react';

interface Step3ProgressProps {
  config: AssignmentConfig;
  submissions: StudentSubmission[];
  onSubmissionsChange: (submissions: StudentSubmission[]) => void;
  onFinish: () => void;
  onViewDashboard: () => void;
  currentLead?: LeadData | null;
  onRequireRegistration?: () => void;
}

export const Step3Progress: React.FC<Step3ProgressProps> = ({
  config,
  submissions,
  onSubmissionsChange,
  onFinish,
  onViewDashboard,
  currentLead,
  onRequireRegistration,
}) => {
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [logs, setLogs] = useState<string[]>([]);
  const [quotaError, setQuotaError] = useState<string | null>(null);
  const isCancelledRef = useRef(false);
  const submissionsRef = useRef(submissions);
  submissionsRef.current = submissions;

  const getActiveLead = (): LeadData | null => {
    if (currentLead && currentLead.email) return currentLead;
    try {
      const saved = localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.email) return parsed;
      }
    } catch {}
    return null;
  };

  // Thread-safe update helper that prevents stale closures from reverting other student states
  const updateSubmissions = (
    updater: (prev: StudentSubmission[]) => StudentSubmission[]
  ) => {
    const updated = updater(submissionsRef.current);
    submissionsRef.current = updated;
    onSubmissionsChange(updated);
    return updated;
  };

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${msg}`,
      ...prev.slice(0, 40),
    ]);
  };

  // Helper to correct a single student with an 80-second timeout guard
  const correctStudent = async (sub: StudentSubmission): Promise<CorrectionResult> => {
    const activeLead = getActiveLead();
    if (!activeLead || !activeLead.email) {
      if (onRequireRegistration) onRequireRegistration();
      throw new Error("Inscription obligatoire : veuillez renseigner votre email d'enseignant.");
    }

    addLog(`Envoi de la copie de "${sub.studentName}" au moteur Claude / Gemini...`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, 80000);

    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': activeLead.email,
        },
        signal: controller.signal,
        body: JSON.stringify({
          userEmail: activeLead.email,
          studentName: sub.studentName,
          studentImage: sub.imageDataUrl,
          allPages: sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl],
          assignmentConfig: config,
        }),
      });

      if (!response.ok) {
        const errorJson = await response.json().catch(() => ({ error: 'Erreur réseau ou réponse serveur' }));
        if (errorJson.requiresRegistration && onRequireRegistration) {
          onRequireRegistration();
        }
        if (errorJson.quotaReached) {
          setQuotaError(errorJson.error || "Limite d'essai atteinte (30 copies gratuites).");
          isCancelledRef.current = true;
          setIsRunning(false);
        }
        throw new Error(errorJson.error || `Erreur serveur HTTP ${response.status}`);
      }

      const data = await response.json();
      if (!data.success || !data.data) {
        throw new Error(data.error || "Données d'évaluation manquantes");
      }

      return data.data as CorrectionResult;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error("Délai d'analyse dépassé (80s). Veuillez relancer cette copie.");
      }
      throw err;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  // Reconciliation for inverted pairwise copies
  const runReconciliation = () => {
    const currentBatch = [...submissionsRef.current];
    let swappedCount = 0;
    for (let a = 0; a < currentBatch.length; a++) {
      for (let b = a + 1; b < currentBatch.length; b++) {
        const subA = currentBatch[a];
        const subB = currentBatch[b];
        if (!subA.result || !subB.result) continue;

        const nameA = subA.studentName.trim().toLowerCase();
        const nameB = subB.studentName.trim().toLowerCase();
        const hwA = (subA.result.nom_manuscrit_detecte || '').toLowerCase();
        const hwB = (subB.result.nom_manuscrit_detecte || '').toLowerCase();
        const fileA = (subA.fileName || '').toLowerCase();
        const fileB = (subB.fileName || '').toLowerCase();

        const aIsActuallyB = (hwA && hwA.includes(nameB)) || (fileA.includes(nameB) && !fileA.includes(nameA));
        const bIsActuallyA = (hwB && hwB.includes(nameA)) || (fileB.includes(nameA) && !fileB.includes(nameB));

        if (aIsActuallyB && bIsActuallyA) {
          const originalNameA = subA.studentName;
          const originalNameB = subB.studentName;
          currentBatch[a] = {
            ...subA,
            studentName: originalNameB,
            result: { ...subA.result, nom_eleve: originalNameB },
          };
          currentBatch[b] = {
            ...subB,
            studentName: originalNameA,
            result: { ...subB.result, nom_eleve: originalNameA },
          };
          swappedCount++;
          addLog(`🔄 Inversion rectifiée automatiquement : « ${originalNameA} » et « ${originalNameB} » ont été réalignés avec leurs copies.`);
        }
      }
    }

    if (swappedCount > 0) {
      updateSubmissions(() => currentBatch);
    }
  };

  // Manual retry for a specific student
  const retryStudent = async (sub: StudentSubmission) => {
    setActiveStudentId(sub.id);
    updateSubmissions((prev) =>
      prev.map((s) => (s.id === sub.id ? { ...s, status: 'analyzing', errorMessage: undefined } : s))
    );
    addLog(`🔄 Analyse lancée pour "${sub.studentName}"...`);

    try {
      const result = await correctStudent(sub);
      addLog(`✅ Copie de "${result.nom_eleve || sub.studentName}" corrigée : Note ${result.note}/${result.note_sur}`);

      if (result.nom_manuscrit_detecte) {
        if (result.nom_manuscrit_detecte.toLowerCase() !== sub.studentName.toLowerCase()) {
          addLog(`✍️ Nom manuscrit repéré en marge : « ${result.nom_manuscrit_detecte} »`);
        }
      }

      updateSubmissions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: 'completed',
                studentName: result.nom_eleve || s.studentName,
                result,
              }
            : s
        )
      );
    } catch (err: any) {
      addLog(`❌ Échec de la tentative pour "${sub.studentName}" : ${err.message}`);
      updateSubmissions((prev) =>
        prev.map((s) =>
          s.id === sub.id
            ? {
                ...s,
                status: 'error',
                errorMessage: err.message || 'Échec de la correction',
              }
            : s
        )
      );
    } finally {
      setActiveStudentId(null);
    }
  };

  // Core processing queue loop
  const processQueue = async (itemsToProcess?: StudentSubmission[]) => {
    if (isRunning) return;
    setIsRunning(true);
    isCancelledRef.current = false;

    const queue = itemsToProcess || submissionsRef.current.filter((s) => s.status !== 'completed' || !s.result);
    if (queue.length === 0) {
      setIsRunning(false);
      return;
    }

    addLog(`Démarrage du traitement pour ${queue.length} copie(s)...`);

    for (let i = 0; i < queue.length; i++) {
      if (isCancelledRef.current) break;

      const targetId = queue[i].id;
      const currentSub = submissionsRef.current.find((s) => s.id === targetId) || queue[i];

      // Skip already completed unless explicitly passed as error
      if (currentSub.status === 'completed' && currentSub.result) {
        continue;
      }

      await retryStudent(currentSub);

      if (i < queue.length - 1 && !isCancelledRef.current) {
        addLog(`⏳ Temporisation anti-quota (1.5s) avant la copie suivante...`);
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    // Check reconciliation pass
    runReconciliation();

    setIsRunning(false);
    setActiveStudentId(null);

    const completed = submissionsRef.current.filter((s) => s.status === 'completed').length;
    if (completed === submissionsRef.current.length) {
      addLog('🎉 Toutes les copies ont été évaluées avec succès !');
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if canvas unavailable
      }
    }
  };

  // Auto-run on mount for any pending copies
  useEffect(() => {
    isCancelledRef.current = false;

    const activeLead = getActiveLead();
    if (!activeLead || !activeLead.email) {
      setIsRunning(false);
      if (onRequireRegistration) {
        onRequireRegistration();
      }
      return;
    }

    const pendingOrIncomplete = submissionsRef.current.filter(
      (s) => s.status !== 'completed' || !s.result
    );

    if (pendingOrIncomplete.length > 0) {
      processQueue(pendingOrIncomplete);
    } else {
      setIsRunning(false);
    }

    return () => {
      isCancelledRef.current = true;
    };
  }, []); // Run once on mount

  // Pause batch processing
  const handlePauseCorrection = () => {
    isCancelledRef.current = true;
    setIsRunning(false);
    setActiveStudentId(null);
    addLog('⏸️ Traitement mis en pause par l’enseignant.');
  };

  // Run all pending (waiting) copies
  const runAllPending = () => {
    const activeLead = getActiveLead();
    if (!activeLead || !activeLead.email) {
      if (onRequireRegistration) onRequireRegistration();
      return;
    }
    const pending = submissionsRef.current.filter((s) => s.status === 'pending');
    if (pending.length > 0) {
      processQueue(pending);
    }
  };

  // Retry all failed students
  const retryAllFailed = () => {
    const activeLead = getActiveLead();
    if (!activeLead || !activeLead.email) {
      if (onRequireRegistration) onRequireRegistration();
      return;
    }
    const failedSubs = submissionsRef.current.filter((s) => s.status === 'error');
    if (failedSubs.length > 0) {
      processQueue(failedSubs);
    }
  };

  const completedCount = submissions.filter((s) => s.status === 'completed').length;
  const errorCount = submissions.filter((s) => s.status === 'error').length;
  const pendingCount = submissions.filter((s) => s.status === 'pending').length;
  const progressPercent = Math.round((completedCount / (submissions.length || 1)) * 100);
  const allFinished = completedCount + errorCount === submissions.length && pendingCount === 0;

  const currentActiveStudent = submissions.find((s) => s.id === activeStudentId);
  const activeLead = getActiveLead();

  // Strict visual barrier if teacher is not registered
  if (!activeLead || !activeLead.email) {
    return (
      <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center space-y-5 animate-in fade-in">
        <div className="w-16 h-16 rounded-2xl bg-amber-100 border border-amber-200 text-amber-700 flex items-center justify-center mx-auto shadow-inner">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <span className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold border border-emerald-200 mb-2">
            🎁 30 copies d'essai gratuites par professeur
          </span>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">Inscription requise pour lancer la correction</h2>
          <p className="text-xs text-slate-600 mt-2 max-w-md mx-auto leading-relaxed">
            Pour activer le moteur IA Claude / Gemini et débloquer vos 30 corrections offertes, veuillez renseigner vos coordonnées d’enseignant.
          </p>
        </div>
        <div className="pt-2">
          <button
            type="button"
            onClick={() => onRequireRegistration && onRequireRegistration()}
            className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl transition-all shadow-md inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>S'inscrire et démarrer l'évaluation</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Quota Exceeded Alert */}
      {quotaError && (
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-start gap-3 text-amber-900 shadow-xs animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs leading-relaxed flex-1">
            <span className="font-bold text-amber-950 block text-sm mb-0.5">Quota d'essai de 30 copies atteint</span>
            <span>{quotaError}</span>
            <span className="block mt-1 text-amber-800">
              Pour débloquer la correction de l'intégralité de vos paquets de copies sans limite, activez votre abonnement enseignant Pro.
            </span>
          </div>
        </div>
      )}

      {/* Progress Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              Étape 3 : Moteur de Vision Multimodal Gemini
            </div>
            <h1 className="text-xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isRunning
                ? 'Correction des copies en cours...'
                : allFinished
                ? 'Correction de la classe finalisée !'
                : pendingCount > 0
                ? `${completedCount} sur ${submissions.length} copies évaluées`
                : 'Correction terminée'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {config.discipline} • {config.level} • {config.title} (Barème sur {config.maxGrade})
            </p>
          </div>

          <div className="grid grid-cols-1 sm:flex sm:flex-wrap items-stretch sm:items-center gap-2.5 w-full sm:w-auto">
            {isRunning && (
              <button
                type="button"
                onClick={handlePauseCorrection}
                className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs sm:text-sm transition-all cursor-pointer"
              >
                <Pause className="w-4 h-4 text-slate-600" />
                <span>Mettre en pause</span>
              </button>
            )}

            {!isRunning && pendingCount > 0 && (
              <button
                type="button"
                onClick={runAllPending}
                id="btn-run-all-pending"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Lancer les {pendingCount} copie{pendingCount > 1 ? 's' : ''} restante{pendingCount > 1 ? 's' : ''}</span>
              </button>
            )}

            {!isRunning && errorCount > 0 && (
              <button
                type="button"
                onClick={retryAllFailed}
                id="btn-retry-all-failed"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Relancer les {errorCount} copie{errorCount > 1 ? 's' : ''} en erreur</span>
              </button>
            )}

            {completedCount > 0 && (
              <button
                type="button"
                onClick={onViewDashboard}
                id="btn-goto-dashboard"
                className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer ${
                  allFinished
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
                }`}
              >
                <span>{allFinished ? 'Accéder au Tableau de bord' : `Tableau de bord (${completedCount}/${submissions.length})`}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Real-time Progress Bar */}
        <div className="pt-6 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
            <span className="flex items-center gap-2">
              {isRunning ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              )}
              {completedCount} sur {submissions.length} copies évaluées
            </span>
            <span className="text-sm font-bold text-blue-700">{progressPercent}%</span>
          </div>

          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {currentActiveStudent && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50/80 px-3 py-2 rounded-lg border border-blue-200/50">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
              <span>
                Analyse de la copie de <strong className="font-bold">{currentActiveStudent.studentName}</strong> (détection de l'écriture, comparaison au corrigé et calcul des notes)...
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Submissions Live Status List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-blue-600" />
            Statut des élèves ({submissions.length})
          </h2>
          <span className="text-xs text-slate-500">
            {errorCount > 0 ? (
              <span className="text-amber-600 font-semibold">{errorCount} à vérifier</span>
            ) : (
              'Traitement en temps réel'
            )}
          </span>
        </div>

        <div className="divide-y divide-slate-100">
          {submissions.map((sub, index) => {
            const isAnalyzing = sub.status === 'analyzing';
            const isCompleted = sub.status === 'completed';
            const isError = sub.status === 'error';

            return (
              <div
                key={sub.id}
                className={`px-6 py-3.5 flex items-center justify-between gap-4 transition-colors ${
                  isAnalyzing ? 'bg-blue-50/50' : isCompleted ? 'bg-white' : 'bg-slate-50/30'
                }`}
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={sub.imageDataUrl}
                      alt={sub.studentName}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{index + 1}</span>
                      <p className="text-sm font-bold text-slate-900 truncate">
                        {sub.studentName}
                      </p>
                      {sub.pageCount && sub.pageCount > 1 && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 text-[10px] font-bold shrink-0 border border-blue-200">
                          <FileText className="w-3 h-3" />
                          {sub.pageCount} pages
                        </span>
                      )}
                      {isCompleted &&
                        sub.result &&
                        (sub.result.verification_humaine_recommandee ||
                          sub.result.lisibilite === 'faible' ||
                          sub.result.lisibilite === 'illisible' ||
                          sub.result.lisibilite === 'moyenne' ||
                          Boolean(sub.result.avertissement_lisibilite)) && (
                          <span
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-bold shrink-0 border border-amber-300"
                            title={sub.result.avertissement_lisibilite || "Lisibilité difficile : relecture conseillée"}
                          >
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Lisibilité : {sub.result.lisibilite || 'délicate'}
                          </span>
                        )}
                    </div>

                    {isCompleted && sub.result && (
                      <p className="text-xs text-slate-500 truncate max-w-md">
                        {sub.result.appreciation}
                      </p>
                    )}

                    {isError && (
                      <p className="text-xs text-red-600 font-medium truncate">
                        {sub.errorMessage || "Échec de l'analyse"}
                      </p>
                    )}

                    {isAnalyzing && (
                      <p className="text-xs text-blue-600 font-medium animate-pulse">
                        Transcription et évaluation en cours...
                      </p>
                    )}
                  </div>
                </div>

                {/* Status indicator / actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {isCompleted && sub.result && (
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-base font-extrabold text-slate-900">
                          {sub.result.note}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          /{sub.result.note_sur}
                        </span>
                      </div>
                      <span className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <CheckCircle2 className="w-4 h-4" />
                      </span>
                    </div>
                  )}

                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-xs font-semibold text-blue-700 bg-blue-100/80 px-2.5 py-1 rounded-full">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Analyse IA</span>
                    </div>
                  )}

                  {isError && (
                    <button
                      type="button"
                      onClick={() => retryStudent(sub)}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-800 text-xs font-bold transition-colors cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Relancer cet élève</span>
                    </button>
                  )}

                  {sub.status === 'pending' && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        En attente
                      </span>
                      {!isRunning && (
                        <button
                          type="button"
                          onClick={() => retryStudent(sub)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold transition-colors cursor-pointer"
                          title="Lancer l'évaluation de cette copie"
                        >
                          <Play className="w-3 h-3 text-blue-600 fill-current" />
                          <span>Corriger</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom action if finished */}
      <div className="flex items-center justify-between pt-4">
        <span className="text-xs text-slate-500">
          {completedCount} copie(s) prête(s) pour consultation et export.
        </span>

        <button
          type="button"
          onClick={onViewDashboard}
          disabled={completedCount === 0}
          id="btn-bottom-dashboard"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm shadow-xs transition-all cursor-pointer ${
            completedCount > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Consulter les résultats de la classe</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
