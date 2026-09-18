import React from 'react';
import { StudentSubmission, AssignmentConfig, QuestionEvaluation, CompetenceItem } from '../types';
import {
  Sparkles,
  FileText,
  AlertTriangle,
  Award,
  Edit3,
  CheckCircle2,
  TrendingUp,
  BookmarkCheck,
  ShieldCheck,
  Calendar,
} from 'lucide-react';

interface CopyExportRendererProps {
  submission: StudentSubmission;
  studentName: string;
  grade: number;
  gradeMax: number;
  appreciation: string;
  questions: QuestionEvaluation[];
  competences: CompetenceItem[];
  teacherNotes: string;
  pages: string[];
  activePageIndex: number;
  exportAllPages?: boolean;
  rotatedImages: string[];
  config?: AssignmentConfig;
  isValidated?: boolean;
}

export const CopyExportRenderer = React.forwardRef<HTMLDivElement, CopyExportRendererProps>(
  (
    {
      submission,
      studentName,
      grade,
      gradeMax,
      appreciation,
      questions,
      competences,
      teacherNotes,
      pages,
      activePageIndex,
      exportAllPages = false,
      rotatedImages,
      config,
      isValidated = false,
    },
    ref
  ) => {
    const result = submission.result;
    if (!result) return null;

    const displayPages = exportAllPages
      ? rotatedImages.length > 0 ? rotatedImages : pages
      : [rotatedImages[activePageIndex] || pages[activePageIndex] || submission.imageDataUrl];

    const todayDate = new Date().toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return (
      <div
        ref={ref}
        id="export-clone-container"
        className="w-[1360px] bg-slate-900 text-slate-900 font-sans p-6 rounded-2xl shadow-2xl flex flex-col gap-5 select-none"
        style={{
          boxSizing: 'border-box',
          backgroundColor: '#0b1329',
          color: '#0f172a',
        }}
      >
        {/* Top Header: Identical to the App's Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white rounded-xl flex items-center justify-between border border-slate-800 shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center font-bold shadow-md">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-black text-2xl text-white tracking-tight">{studentName}</span>
                <span className="text-xs text-slate-400 font-medium">
                  ({submission.fileName} {pages.length > 1 ? `• ${pages.length} pages` : ''})
                </span>

                {result.nom_manuscrit_detecte && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-semibold">
                    <span>✍️ Nom en marge : {result.nom_manuscrit_detecte}</span>
                  </span>
                )}

                {isValidated && (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Correction validée</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                <span>
                  Aperçu de la copie manuscrite (
                  {exportAllPages
                    ? `${pages.length} pages incluses`
                    : pages.length > 1
                    ? `Page ${activePageIndex + 1} sur ${pages.length}`
                    : '1 page'}
                  ) et évaluation détaillée
                </span>
                {config && (
                  <span className="text-blue-400 font-semibold">
                    • {config.discipline} • {config.level} {config.title ? `— ${config.title}` : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <Calendar className="w-3.5 h-3.5" />
              <span>{todayDate}</span>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-slate-500 font-bold block mt-0.5">
              PRAXIS • Évaluation Certifiée
            </span>
          </div>
        </div>

        {/* Main Split Layout: Left side = Student Copy; Right side = Assessment */}
        <div className="flex items-start gap-6 bg-slate-900 rounded-2xl overflow-hidden min-h-[800px]">
          {/* Left Column: Student Handwritten Work */}
          <div className="w-[580px] shrink-0 flex flex-col gap-4 bg-slate-950 p-4 rounded-xl border border-slate-800">
            <div className="flex items-center justify-between px-2 text-xs text-slate-300 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-400" />
                <span>Copie manuscrite originale</span>
              </span>
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-[11px]">Lisibilité :</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                    result.lisibilite === 'excellente' || result.lisibilite === 'bonne'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : result.lisibilite === 'moyenne'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-rose-950 text-rose-300 border border-rose-800'
                  }`}
                >
                  {result.lisibilite || 'bonne'}
                </span>
              </div>
            </div>

            {/* Display single or all pages */}
            <div className="flex flex-col gap-4">
              {displayPages.map((pageUrl, pIdx) => (
                <div key={pIdx} className="flex flex-col gap-1.5">
                  {displayPages.length > 1 && (
                    <div className="px-2 py-1 bg-slate-900 rounded text-slate-300 text-xs font-bold flex items-center justify-between">
                      <span>Feuille {pIdx + 1} sur {displayPages.length}</span>
                      <span className="text-[10px] text-slate-400">{submission.fileName}</span>
                    </div>
                  )}
                  <div className="bg-slate-900 rounded-lg p-2 border border-slate-800 flex items-center justify-center">
                    <img
                      src={pageUrl}
                      alt={`Copie manuscrite ${studentName} - Page ${pIdx + 1}`}
                      className="max-w-full h-auto object-contain rounded shadow-lg"
                      style={{ maxHeight: exportAllPages ? '800px' : '980px' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="text-[11px] text-slate-400 text-center pt-2 border-t border-slate-800/80">
              <span>Document scanné original de l'élève {studentName}</span>
            </div>
          </div>

          {/* Right Column: AI & Teacher Evaluation (Fully expanded, no scrollbars!) */}
          <div className="flex-1 bg-slate-50 p-6 rounded-xl border border-slate-200 flex flex-col gap-5 text-slate-800">
            {/* Prominent Legibility / Teacher Control Alert if applicable */}
            {(result.verification_humaine_recommandee ||
              result.lisibilite === 'moyenne' ||
              result.lisibilite === 'faible' ||
              result.lisibilite === 'illisible' ||
              result.avertissement_lisibilite) && (
              <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 shadow-xs space-y-2 text-amber-950">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-sm text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Vérification humaine recommandée (Lisibilité : {result.lisibilite || 'délicate'})</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                    Contrôle prof
                  </span>
                </div>
                <p className="text-xs text-amber-800 leading-relaxed font-medium">
                  {result.avertissement_lisibilite ||
                    "L'IA a éprouvé des difficultés à déchiffrer avec certitude certains calculs, mots ou passages manuscrits sur cette copie. Ne vous fiez pas à 100% à la note automatique et vérifiez directement la copie originale ci-contre."}
                </p>

                {result.texte_transcrit_resume && (
                  <div className="mt-2 pt-2 border-t border-amber-300/80 space-y-1.5">
                    <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-amber-700 shrink-0" />
                      <span>Trace & transcription déchiffrée par l'IA (intégrale) :</span>
                    </div>
                    <div className="text-xs text-amber-950 bg-amber-100/90 p-3 rounded-lg border border-amber-300 font-mono whitespace-pre-wrap leading-relaxed">
                      {result.texte_transcrit_resume}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Standalone Transcription Trace if not already in alert */}
            {result.texte_transcrit_resume &&
              !(
                result.verification_humaine_recommandee ||
                result.lisibilite === 'moyenne' ||
                result.lisibilite === 'faible' ||
                result.lisibilite === 'illisible' ||
                result.avertissement_lisibilite
              ) && (
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span>Trace & transcription de la copie manuscrite</span>
                    </h3>
                    <span className="text-[10px] text-slate-400 font-semibold">Texte déchiffré par l'IA</span>
                  </div>
                  <div className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap leading-relaxed">
                    {result.texte_transcrit_resume}
                  </div>
                </div>
              )}

            {/* Grade Card: Exact duplicate of App's Note Box */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  NOTE ATTRIBUÉE PAR L'IA (MODIFIABLE)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-slate-900">{grade}</span>
                  <span className="text-xl font-bold text-slate-400">/ {gradeMax}</span>
                  {result.manuallyAdjusted && (
                    <span className="ml-2 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      Ajustée manuellement
                    </span>
                  )}
                </div>
              </div>

              <div>
                <div
                  className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-bold shadow-xs ${
                    grade >= gradeMax * 0.7
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : grade >= gradeMax * 0.5
                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  <Award className="w-4 h-4" />
                  <span>
                    {grade >= gradeMax * 0.7
                      ? 'Très bon travail'
                      : grade >= gradeMax * 0.5
                      ? 'Acquis / Satisfaisant'
                      : 'À encourager / consolider'}
                  </span>
                </div>
              </div>
            </div>

            {/* Appreciation */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                  <span>APPRÉCIATION PÉDAGOGIQUE POUR L'ÉLÈVE</span>
                </label>
                <span className="text-[11px] text-slate-400">Figurera sur la fiche imprimable</span>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 leading-relaxed font-medium">
                {appreciation}
              </div>
            </div>

            {/* Strengths & Improvements */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Points forts relevés</span>
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

              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-xs space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-amber-600" />
                  <span>Axes de progrès</span>
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
                  <span>Grille des compétences du socle</span>
                </h3>

                <div className="space-y-2">
                  {competences.map((comp, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800">{comp.nom}</span>
                      <span
                        className={`px-3 py-1 rounded text-[11px] font-bold ${
                          comp.statut === 'Acquis'
                            ? 'bg-emerald-600 text-white'
                            : comp.statut === 'En cours'
                            ? 'bg-amber-500 text-white'
                            : 'bg-rose-600 text-white'
                        }`}
                      >
                        {comp.statut}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Questions Breakdown */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-blue-600" />
                  <span>Détail question par question</span>
                </h3>
                <span className="text-[11px] text-slate-400 font-medium">Barème et vérification</span>
              </div>

              <div className="space-y-3">
                {questions.map((q, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-sm">{q.numero_ou_titre}</span>
                      <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded border border-slate-200 font-bold text-slate-800">
                        <span className="text-blue-600 font-extrabold">{q.note}</span>
                        <span className="text-slate-400">/</span>
                        <span>{q.note_max}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-slate-700">
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

            {/* Internal Teacher Notes if filled */}
            {teacherNotes && (
              <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  Notes internes pour le professeur
                </span>
                <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
                  {teacherNotes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Export Footer */}
        <div className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-400 text-xs flex items-center justify-between">
          <span>
            Document de correction officiel • {studentName} ({submission.fileName})
          </span>
          <span className="font-semibold text-slate-300">
            Note finale : <strong className="text-white">{grade}/{gradeMax}</strong>
          </span>
        </div>
      </div>
    );
  }
);

CopyExportRenderer.displayName = 'CopyExportRenderer';
