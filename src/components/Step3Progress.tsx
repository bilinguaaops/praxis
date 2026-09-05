import React, { useEffect, useState, useRef } from 'react';
import { AssignmentConfig, StudentSubmission, CorrectionResult } from '../types';
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
} from 'lucide-react';

interface Step3ProgressProps {
  config: AssignmentConfig;
  submissions: StudentSubmission[];
  onSubmissionsChange: (submissions: StudentSubmission[]) => void;
  onFinish: () => void;
  onViewDashboard: () => void;
}

export const Step3Progress: React.FC<Step3ProgressProps> = ({
  config,
  submissions,
  onSubmissionsChange,
  onFinish,
  onViewDashboard,
}) => {
  const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [logs, setLogs] = useState<string[]>([]);
  const isCancelledRef = useRef(false);
  const submissionsRef = useRef(submissions);
  submissionsRef.current = submissions;

  const addLog = (msg: string) => {
    setLogs((prev) => [
      `[${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}] ${msg}`,
      ...prev.slice(0, 40),
    ]);
  };

  // Helper to correct a single student
  const correctStudent = async (sub: StudentSubmission): Promise<CorrectionResult> => {
    addLog(`Envoi de la copie de "${sub.studentName}" au moteur Gemini Vision...`);

    const response = await fetch('/api/correct', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentName: sub.studentName,
        studentImage: sub.imageDataUrl,
        allPages: sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl],
        assignmentConfig: config,
      }),
    });

    if (!response.ok) {
      const errorJson = await response.json().catch(() => ({ error: 'Erreur réseau ou réponse invalide' }));
      throw new Error(errorJson.error || `Erreur serveur HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data.success || !data.data) {
      throw new Error(data.error || "Données d'évaluation manquantes");
    }

    return data.data as CorrectionResult;
  };

  // Process all pending submissions sequentially or in parallel batches
  useEffect(() => {
    let active = true;
    isCancelledRef.current = false;

    const runBatch = async () => {
      setIsRunning(true);
      addLog(`Démarrage de la correction groupée pour ${submissions.length} copies...`);

      for (let i = 0; i < submissions.length; i++) {
        if (!active || isCancelledRef.current) break;

        const sub = submissions[i];
        // Skip already completed unless requested to re-run
        if (sub.status === 'completed' && sub.result) {
          continue;
        }

        setActiveStudentId(sub.id);

        // Mark as analyzing
        onSubmissionsChange(
          submissions.map((s) => (s.id === sub.id ? { ...s, status: 'analyzing', errorMessage: undefined } : s))
        );

        let result: CorrectionResult | null = null;
        let lastErrorMsg = '';

        for (let attempt = 1; attempt <= 2; attempt++) {
          if (!active || isCancelledRef.current) break;
          try {
            result = await correctStudent(sub);
            break;
          } catch (err: any) {
            lastErrorMsg = err.message || 'Échec de la correction';
            if (attempt < 2 && active && !isCancelledRef.current) {
              addLog(`⚠️ Temporisation de 3s et relance pour "${sub.studentName}"...`);
              await new Promise((r) => setTimeout(r, 3000));
            }
          }
        }

        if (!active || isCancelledRef.current) break;

        if (result) {
          addLog(`✅ Copie de "${result.nom_eleve || sub.studentName}" corrigée avec succès : Note ${result.note}/${result.note_sur}`);

          if (
            result.verification_humaine_recommandee ||
            result.lisibilite === 'faible' ||
            result.lisibilite === 'illisible' ||
            result.lisibilite === 'moyenne'
          ) {
            addLog(`⚠️ Signalement lisibilité pour "${result.nom_eleve || sub.studentName}" : écriture ${result.lisibilite || 'délicate'} (relecture conseillée)`);
          }

          // Update submission with result
          onSubmissionsChange(
            submissionsRef.current.map((s) =>
              s.id === sub.id
                ? {
                    ...s,
                    status: 'completed',
                    studentName: result!.nom_eleve || s.studentName,
                    result: result!,
                  }
                : s
            )
          );
        } else {
          console.error(`Error correcting student ${sub.studentName}:`, lastErrorMsg);
          addLog(`❌ Échec de l'analyse pour "${sub.studentName}" : ${lastErrorMsg}`);

          onSubmissionsChange(
            submissionsRef.current.map((s) =>
              s.id === sub.id
                ? {
                    ...s,
                    status: 'error',
                    errorMessage: lastErrorMsg || 'Échec de la correction',
                  }
                : s
            )
          );
        }

        // Add a gentle pause before next student to prevent RPM quota spikes
        if (i < submissions.length - 1 && active && !isCancelledRef.current) {
          addLog(`⏳ Temporisation anti-quota (2s) avant la copie suivante...`);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }

      if (active) {
        setIsRunning(false);
        setActiveStudentId(null);
        addLog('Correction par lot terminée !');

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

    runBatch();

    return () => {
      active = false;
      isCancelledRef.current = true;
    };
  }, []); // Run once on mount

  // Manual retry for a specific failed student
  const retryStudent = async (sub: StudentSubmission) => {
    setActiveStudentId(sub.id);
    onSubmissionsChange(
      submissionsRef.current.map((s) => (s.id === sub.id ? { ...s, status: 'analyzing', errorMessage: undefined } : s))
    );
    addLog(`🔄 Nouvelle tentative d'analyse pour "${sub.studentName}"...`);

    try {
      const result = await correctStudent(sub);
      addLog(`✅ Copie de "${result.nom_eleve || sub.studentName}" corrigée : Note ${result.note}/${result.note_sur}`);

      onSubmissionsChange(
        submissionsRef.current.map((s) =>
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
      addLog(`❌ Échec de la nouvelle tentative pour "${sub.studentName}" : ${err.message}`);
      onSubmissionsChange(
        submissionsRef.current.map((s) =>
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

  // Retry all failed students in sequence with polite pacing
  const retryAllFailed = async () => {
    if (isRunning) return;
    const failedSubs = submissionsRef.current.filter((s) => s.status === 'error');
    if (failedSubs.length === 0) return;

    setIsRunning(true);
    addLog(`🔄 Relance globale des ${failedSubs.length} copies en attente...`);

    for (let i = 0; i < failedSubs.length; i++) {
      if (isCancelledRef.current) break;
      const sub = failedSubs[i];
      await retryStudent(sub);
      if (i < failedSubs.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }

    setIsRunning(false);
  };

  const completedCount = submissions.filter((s) => s.status === 'completed').length;
  const errorCount = submissions.filter((s) => s.status === 'error').length;
  const progressPercent = Math.round((completedCount / (submissions.length || 1)) * 100);
  const allFinished = completedCount + errorCount === submissions.length;

  const currentActiveStudent = submissions.find((s) => s.id === activeStudentId);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12">
      {/* Progress Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
              Étape 3 : Moteur de Vision Multimodal Gemini
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              {isRunning ? 'Correction des copies en cours...' : 'Correction de la classe finalisée !'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              {config.discipline} • {config.level} • {config.title} (Barème sur {config.maxGrade})
            </p>
          </div>

          <div className="flex items-center gap-3">
            {errorCount > 0 && !isRunning && (
              <button
                type="button"
                onClick={retryAllFailed}
                id="btn-retry-all-failed"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-900 font-bold text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
              >
                <RotateCcw className="w-4 h-4 text-amber-700" />
                <span>Relancer les {errorCount} copie{errorCount > 1 ? 's' : ''} en attente</span>
              </button>
            )}

            {allFinished && (
              <button
                type="button"
                onClick={onViewDashboard}
                id="btn-goto-dashboard"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-600/20 transition-all cursor-pointer"
              >
                <span>Accéder au Tableau de bord</span>
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
                    <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      En attente
                    </span>
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
