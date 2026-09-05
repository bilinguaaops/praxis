import React, { useState } from 'react';
import { StudentSubmission, CorrectionResult, QuestionEvaluation, CompetenceItem } from '../types';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Save,
  Award,
  TrendingUp,
  BookmarkCheck,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';

interface StudentDetailModalProps {
  submission: StudentSubmission;
  onClose: () => void;
  onSave: (updatedSubmission: StudentSubmission) => void;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  submission,
  onClose,
  onSave,
}) => {
  const result = submission.result;
  if (!result) return null;

  const pages = submission.allPages && submission.allPages.length > 0 ? submission.allPages : [submission.imageDataUrl];
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [studentName, setStudentName] = useState(submission.studentName);
  const [grade, setGrade] = useState<number>(result.note);
  const [gradeMax] = useState<number>(result.note_sur);
  const [appreciation, setAppreciation] = useState<string>(result.appreciation);
  const [questions, setQuestions] = useState<QuestionEvaluation[]>(result.questions || []);
  const [competences, setCompetences] = useState<CompetenceItem[]>(result.competences || []);
  const [teacherNotes, setTeacherNotes] = useState<string>(result.teacherNotes || '');
  const [rotation, setRotation] = useState<number>(submission.rotation || 0);
  const [zoom, setZoom] = useState<number>(1);
  const [isSavedNotice, setIsSavedNotice] = useState(false);

  const handleQuestionGradeChange = (index: number, newNote: number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], note: newNote };
    setQuestions(updated);

    // Auto calculate new sum if questions have max grades
    const newSum = updated.reduce((acc, q) => acc + (Number(q.note) || 0), 0);
    setGrade(Number(newSum.toFixed(2)));
  };

  const handleCompetenceStatusChange = (index: number, newStatus: 'Acquis' | 'En cours' | 'Non acquis') => {
    const updated = [...competences];
    updated[index] = { ...updated[index], statut: newStatus };
    setCompetences(updated);
  };

  const handleSaveChanges = () => {
    const updatedResult: CorrectionResult = {
      ...result,
      nom_eleve: studentName,
      note: Number(grade),
      note_sur: gradeMax,
      appreciation,
      questions,
      competences,
      teacherNotes,
      manuallyAdjusted: true,
    };

    onSave({
      ...submission,
      studentName,
      rotation,
      result: updatedResult,
    });

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-transparent font-extrabold text-lg text-white border-b border-transparent hover:border-slate-600 focus:border-blue-400 focus:outline-hidden px-1 -ml-1 transition-colors"
                />
                <span className="text-xs text-slate-400">
                  ({submission.fileName} {pages.length > 1 ? `• ${pages.length} pages` : ''})
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Aperçu de la copie manuscrite ({pages.length > 1 ? `Page ${activePageIndex + 1} sur ${pages.length}` : '1 page'}) et évaluation détaillée
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isSavedNotice && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Modifications enregistrées !
              </span>
            )}

            <button
              type="button"
              onClick={handleSaveChanges}
              id="btn-modal-save"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              id="btn-modal-close"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
          {/* Left Panel: Original Student Copy Image */}
          <div className="w-full lg:w-1/2 bg-slate-900 flex flex-col relative overflow-hidden">
            {/* Viewer Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/80 backdrop-blur-xs p-1 rounded-lg border border-slate-700 shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(2.5, z + 0.25))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Zoomer"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.25))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Dézoomer"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Faire pivoter"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded transition-colors"
                title="Réinitialiser la vue"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer image container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4">
              <img
                src={pages[activePageIndex] || submission.imageDataUrl}
                alt={submission.studentName}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                }}
                className="max-h-full max-w-full object-contain rounded shadow-lg select-none"
              />
            </div>

            {/* Footer with page navigation */}
            <div className="px-4 py-2 bg-slate-950/80 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
              {pages.length > 1 ? (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1))}
                    className="p-1 hover:text-blue-400 transition-colors bg-slate-800 rounded"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-slate-200">
                    Page {activePageIndex + 1} sur {pages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0))}
                    className="p-1 hover:text-blue-400 transition-colors bg-slate-800 rounded"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span>Document scanné original</span>
              )}
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Lisibilité déchiffrée :</span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                    result.lisibilite === 'excellente' || result.lisibilite === 'bonne'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : result.lisibilite === 'moyenne'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {(result.lisibilite === 'faible' || result.lisibilite === 'illisible' || result.lisibilite === 'moyenne') && (
                    <AlertTriangle className="w-3 h-3 text-amber-400" />
                  )}
                  <span>{result.lisibilite || 'bonne'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right Panel: AI Assessment and Editable Criteria */}
          <div className="w-full lg:w-1/2 bg-slate-50 overflow-y-auto p-6 space-y-6">
            {/* Prominent Human Verification / Legibility Notice */}
            {(result.verification_humaine_recommandee ||
              result.lisibilite === 'moyenne' ||
              result.lisibilite === 'faible' ||
              result.lisibilite === 'illisible' ||
              result.avertissement_lisibilite) && (
              <div
                id="alert-lisibilite-detail"
                className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4.5 shadow-xs space-y-2 text-amber-950 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Vérification humaine recommandée (Lisibilité : {result.lisibilite || 'délicate'})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                    Contrôle prof
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  {result.avertissement_lisibilite ||
                    "L'IA a éprouvé des difficultés à déchiffrer avec certitude certains calculs, mots ou passages manuscrits sur cette copie. Ne vous fiez pas à 100% à la note automatique et vérifiez directement la copie originale ci-contre."}
                </p>
                <div className="text-[11px] text-amber-900/80 italic pt-1 border-t border-amber-200/70 flex items-center justify-between">
                  <span>💡 Vous pouvez ajuster les points question par question ci-dessous.</span>
                  {result.texte_transcrit_resume && (
                    <span className="text-[10px] truncate max-w-[240px]" title={result.texte_transcrit_resume}>
                      Trace : {result.texte_transcrit_resume}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Main Score Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Note attribuée par l'IA (modifiable)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="number"
                    step={0.25}
                    min={0}
                    max={gradeMax}
                    value={grade}
                    onChange={(e) => setGrade(Number(e.target.value))}
                    className="w-24 px-3 py-1.5 text-2xl font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="text-xl font-bold text-slate-500">/ {gradeMax}</span>
                  {result.manuallyAdjusted && (
                    <span className="ml-2 px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Ajustée manuellement
                    </span>
                  )}
                </div>
              </div>

              <div className="text-right">
                <div
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                    grade >= gradeMax * 0.7
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : grade >= gradeMax * 0.5
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <Award className="w-3.5 h-3.5" />
                  {grade >= gradeMax * 0.7
                    ? 'Très bon travail'
                    : grade >= gradeMax * 0.5
                    ? 'Acquis / Satisfaisant'
                    : 'À encourager / consolider'}
                </div>
              </div>
            </div>

            {/* Appreciation */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="appreciation-textarea"
                  className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  Appréciation pédagogique pour l'élève
                </label>
                <span className="text-[11px] text-slate-400">Figurera sur la fiche imprimable</span>
              </div>
              <textarea
                id="appreciation-textarea"
                rows={3}
                value={appreciation}
                onChange={(e) => setAppreciation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
              />
            </div>

            {/* Strengths & Improvement Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Strengths */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Points forts relevés
                </h3>
                <ul className="space-y-1.5">
                  {result.points_forts?.map((pf, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span>{pf}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to improve */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  Axes de progrès
                </h3>
                <ul className="space-y-1.5">
                  {result.points_ameliorer?.map((pa, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span>{pa}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Competences Grid */}
            {competences.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <BookmarkCheck className="w-4 h-4 text-indigo-600" />
                  Grille des compétences du socle
                </h3>

                <div className="space-y-2">
                  {competences.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{comp.nom}</span>
                      <div className="flex items-center gap-1 shrink-0">
                        {(['Acquis', 'En cours', 'Non acquis'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleCompetenceStatusChange(idx, status)}
                            className={`px-2 py-0.5 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                              comp.statut === status
                                ? status === 'Acquis'
                                  ? 'bg-emerald-600 text-white'
                                  : status === 'En cours'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Questions Evaluation Table */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  Détail question par question
                </h3>
                <span className="text-[11px] text-slate-400">Modifiez les notes en direct</span>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">{q.numero_ou_titre}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Note :</span>
                        <input
                          type="number"
                          step={0.25}
                          min={0}
                          max={q.note_max}
                          value={q.note}
                          onChange={(e) => handleQuestionGradeChange(idx, Number(e.target.value))}
                          className="w-16 px-2 py-1 font-bold text-sm bg-white border border-slate-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                        <span className="font-semibold text-slate-500">/ {q.note_max}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 text-slate-700">
                      <div className="p-2 bg-white rounded-md border border-slate-200/80">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-blue-700 block mb-0.5">
                          Ce que l'élève a formulé :
                        </span>
                        <p className="font-mono text-[11px] text-slate-800 leading-snug">
                          {q.reponse_eleve || 'Non traité / illisible'}
                        </p>
                      </div>

                      <div className="p-2 bg-white rounded-md border border-slate-200/80">
                        <span className="font-bold text-[10px] uppercase tracking-wider text-emerald-700 block mb-0.5">
                          Attendu du corrigé :
                        </span>
                        <p className="font-mono text-[11px] text-slate-800 leading-snug">
                          {q.reponse_attendue}
                        </p>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 bg-blue-50/50 p-2 rounded border border-blue-100">
                      <strong className="text-blue-900">Justification du barème :</strong> {q.justification}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Private Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <label
                htmlFor="teacher-notes-input"
                className="text-xs font-bold uppercase tracking-wider text-slate-700"
              >
                Notes internes pour le professeur (non visibles de l'élève)
              </label>
              <input
                id="teacher-notes-input"
                type="text"
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="Ex : Convoquer aux heures de soutien, vérifier le carnet de correspondance..."
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-500">
            Les ajustements mettent automatiquement à jour les statistiques de la classe.
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
