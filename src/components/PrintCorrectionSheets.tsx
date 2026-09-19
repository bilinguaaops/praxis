import React from 'react';
import { AssignmentConfig, StudentSubmission } from '../types';
import { Printer, X, Download, FileText, CheckCircle2, AlertTriangle } from 'lucide-react';

interface PrintCorrectionSheetsProps {
  config: AssignmentConfig;
  submissions: StudentSubmission[];
  onClose: () => void;
}

export const PrintCorrectionSheets: React.FC<PrintCorrectionSheetsProps> = ({
  config,
  submissions,
  onClose,
}) => {
  const gradedStudents = submissions.filter((s) => s.status === 'completed' && s.result);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-6 bg-slate-950/80 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white print:static">
      {/* Screen container */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col max-h-[95vh] overflow-hidden print:border-none print:shadow-none print:max-h-none print:w-full print:rounded-none">
        {/* Screen Header (Hidden on print) */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 shrink-0 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
              <Printer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-extrabold text-sm sm:text-base text-white">
                Fiches Individuelles de Correction prêtes à imprimer
              </h2>
              <p className="text-xs text-slate-400">
                Génération de {gradedStudents.length} fiches élèves personnalisées (1 page par élève, format A4)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 justify-between sm:justify-end">
            <button
              type="button"
              onClick={handlePrint}
              id="btn-trigger-print"
              className="inline-flex items-center justify-center gap-2 px-3.5 sm:px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex-1 sm:flex-initial"
            >
              <Printer className="w-4 h-4" />
              <span>Imprimer / PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer shrink-0"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Content Area */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-8 space-y-8 sm:space-y-12 bg-slate-100 print:bg-white print:p-0 print:space-y-0">
          {gradedStudents.map((sub, idx) => {
            const res = sub.result!;

            return (
              <div
                key={sub.id}
                className="bg-white p-4 sm:p-8 rounded-xl border border-slate-300 shadow-xs max-w-3xl mx-auto space-y-4 sm:space-y-6 print:border-none print:shadow-none print:p-6 print:rounded-none print:break-after-page print:m-0 print:max-w-none min-h-[900px] flex flex-col justify-between"
              >
                {/* School Header */}
                <div>
                  <div className="flex items-start justify-between border-b-2 border-slate-900 pb-4">
                    <div>
                      <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-700 block">
                        RÉPUBLIQUE FRANÇAISE • ÉDUCATION NATIONALE
                      </span>
                      <h1 className="text-xl font-black text-slate-900 mt-1">
                        FICHE D'ÉVALUATION ET DE RESTITUTION
                      </h1>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">
                        {config.discipline} • {config.level} • {config.title}
                      </p>
                    </div>

                    {/* Grade Box */}
                    <div className="text-center border-2 border-slate-900 rounded-xl px-5 py-3 bg-slate-50 min-w-[120px]">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        NOTE GLOBALE
                      </span>
                      <div className="text-2xl font-black text-slate-900">
                        {res.note}{' '}
                        <span className="text-sm font-semibold text-slate-500">
                          / {res.note_sur}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Student Identity Banner */}
                  <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-slate-500 font-medium">Élève : </span>
                      <span className="font-extrabold text-slate-900 text-sm">{sub.studentName}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-medium">Date d'évaluation : </span>
                      <span className="font-semibold text-slate-800">
                        {new Date().toLocaleDateString('fr-FR', {
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Legibility notice if copy was difficult to decipher */}
                  {(res.verification_humaine_recommandee ||
                    res.lisibilite === 'moyenne' ||
                    res.lisibilite === 'faible' ||
                    res.lisibilite === 'illisible' ||
                    Boolean(res.avertissement_lisibilite)) && (
                    <div className="mt-3 p-2.5 bg-amber-50/80 rounded-lg border border-amber-200 text-[11px] text-amber-900 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>
                          <strong>Lisibilité manuscrite :</strong> {res.lisibilite || 'délicate'}
                          {res.avertissement_lisibilite ? ` — ${res.avertissement_lisibilite}` : ' — vérification sur la copie papier recommandée'}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider shrink-0 ml-2">
                        Contrôle enseignant
                      </span>
                    </div>
                  )}

                  {/* Appreciation Section */}
                  <div className="mt-5 space-y-1.5">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      Appréciation du professeur
                    </h3>
                    <div className="p-3.5 bg-blue-50/50 rounded-lg border border-blue-100 text-xs text-slate-800 leading-relaxed italic">
                      "{res.appreciation}"
                    </div>
                  </div>

                  {/* Strengths and Improvements */}
                  <div className="mt-5 grid grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-800">
                        Points forts constatés :
                      </h4>
                      <ul className="text-xs text-slate-700 space-y-1">
                        {res.points_forts.map((pf, pidx) => (
                          <li key={pidx} className="flex items-start gap-1.5">
                            <span className="text-emerald-600 font-bold shrink-0">✓</span>
                            <span>{pf}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-1.5">
                      <h4 className="text-[11px] font-extrabold uppercase tracking-wider text-amber-800">
                        Axes prioritaires de progrès :
                      </h4>
                      <ul className="text-xs text-slate-700 space-y-1">
                        {res.points_ameliorer.map((pa, paidx) => (
                          <li key={paidx} className="flex items-start gap-1.5">
                            <span className="text-amber-600 font-bold shrink-0">→</span>
                            <span>{pa}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* Competence Table */}
                  {res.competences && res.competences.length > 0 && (
                    <div className="mt-5 space-y-1.5">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Bilan des compétences du socle commun
                      </h3>
                      <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                        <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                          <tr>
                            <th className="text-left p-2 border-b border-slate-200">Compétence évaluée</th>
                            <th className="text-center p-2 border-b border-slate-200 w-28">Niveau atteint</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                          {res.competences.map((comp, cidx) => (
                            <tr key={cidx}>
                              <td className="p-2 text-slate-800 font-medium">{comp.nom}</td>
                              <td className="p-2 text-center">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                    comp.statut === 'Acquis'
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : comp.statut === 'En cours'
                                      ? 'bg-amber-100 text-amber-800'
                                      : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {comp.statut}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Question-by-Question Breakdown */}
                  {res.questions && res.questions.length > 0 && (
                    <div className="mt-5 space-y-1.5">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                        Détail du barème par question
                      </h3>
                      <div className="grid grid-cols-1 gap-1.5 text-xs">
                        {res.questions.map((q, qidx) => (
                          <div
                            key={qidx}
                            className="flex items-center justify-between p-2 rounded bg-slate-50 border border-slate-200/80"
                          >
                            <span className="font-semibold text-slate-800 truncate max-w-md">
                              {q.numero_ou_titre} :{' '}
                              <span className="font-normal text-slate-600">{q.justification}</span>
                            </span>
                            <span className="font-bold text-slate-900 shrink-0 ml-2">
                              {q.note} / {q.note_max}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer Signatures */}
                <div className="pt-8 border-t border-slate-300 mt-6 grid grid-cols-2 gap-8 text-xs text-slate-500">
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 h-24">
                    <span className="font-bold text-slate-600 block mb-1">Signature du professeur :</span>
                  </div>
                  <div className="border border-dashed border-slate-300 rounded-lg p-4 h-24">
                    <span className="font-bold text-slate-600 block mb-1">Visa des parents / responsables :</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
