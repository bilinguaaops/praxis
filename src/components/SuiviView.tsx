import React, { useState, useMemo } from 'react';
import { TrendingUp, Search, Award, CheckCircle2, AlertCircle, BookOpen, User, Calendar, FileText } from 'lucide-react';
import { SavedEvaluation, StudentSubmission } from '../types';

interface SuiviViewProps {
  evaluations: SavedEvaluation[];
  currentSubmissions: StudentSubmission[];
  onOpenEvaluation: (evaluation: SavedEvaluation) => void;
}

export const SuiviView: React.FC<SuiviViewProps> = ({
  evaluations,
  currentSubmissions,
  onOpenEvaluation,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  // Collect all unique student names across saved evaluations and current session
  const allStudentNames = useMemo(() => {
    const namesSet = new Set<string>();

    evaluations.forEach((ev) => {
      ev.submissions.forEach((s) => {
        if (s.studentName) namesSet.add(s.studentName);
      });
    });

    currentSubmissions.forEach((s) => {
      if (s.studentName) namesSet.add(s.studentName);
    });

    return Array.from(namesSet).sort((a, b) => a.localeCompare(b));
  }, [evaluations, currentSubmissions]);

  // Selected student (defaults to first matching search query)
  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return allStudentNames;
    return allStudentNames.filter((name) =>
      name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [allStudentNames, searchQuery]);

  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  // Default select first student if none selected
  const activeStudent = selectedStudent || filteredStudents[0] || null;

  // Compute student history
  const studentRecords = useMemo(() => {
    if (!activeStudent) return [];

    const records: {
      evalTitle: string;
      date: string;
      discipline: string;
      grade: number;
      gradeMax: number;
      scaledTo20: number;
      appreciation: string;
      pointsForts: string[];
      pointsAmeliorer: string[];
      evaluation?: SavedEvaluation;
    }[] = [];

    // Search in saved evaluations
    evaluations.forEach((ev) => {
      const match = ev.submissions.find((s) => s.studentName.toLowerCase() === activeStudent.toLowerCase() && s.result);
      if (match && match.result) {
        records.push({
          evalTitle: ev.title,
          date: ev.date,
          discipline: ev.discipline,
          grade: match.result.note,
          gradeMax: match.result.note_sur,
          scaledTo20: Number(((match.result.note / match.result.note_sur) * 20).toFixed(2)),
          appreciation: match.result.appreciation,
          pointsForts: match.result.points_forts || [],
          pointsAmeliorer: match.result.points_ameliorer || [],
          evaluation: ev,
        });
      }
    });

    // Check current session too
    const currentMatch = currentSubmissions.find(
      (s) => s.studentName.toLowerCase() === activeStudent.toLowerCase() && s.result
    );
    if (currentMatch && currentMatch.result) {
      records.push({
        evalTitle: 'Évaluation en cours',
        date: new Date().toISOString(),
        discipline: 'Session active',
        grade: currentMatch.result.note,
        gradeMax: currentMatch.result.note_sur,
        scaledTo20: Number(((currentMatch.result.note / currentMatch.result.note_sur) * 20).toFixed(2)),
        appreciation: currentMatch.result.appreciation,
        pointsForts: currentMatch.result.points_forts || [],
        pointsAmeliorer: currentMatch.result.points_ameliorer || [],
      });
    }

    return records;
  }, [activeStudent, evaluations, currentSubmissions]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (studentRecords.length === 0) return null;
    const sum = studentRecords.reduce((acc, r) => acc + r.scaledTo20, 0);
    const avg = Number((sum / studentRecords.length).toFixed(2));
    const grades = studentRecords.map((r) => r.scaledTo20);
    const max = Math.max(...grades);
    const min = Math.min(...grades);

    // Common points forts
    const strengthsCount: Record<string, number> = {};
    const improvementsCount: Record<string, number> = {};

    studentRecords.forEach((r) => {
      r.pointsForts.forEach((pf) => {
        strengthsCount[pf] = (strengthsCount[pf] || 0) + 1;
      });
      r.pointsAmeliorer.forEach((pa) => {
        improvementsCount[pa] = (improvementsCount[pa] || 0) + 1;
      });
    });

    return {
      evalCount: studentRecords.length,
      averageOn20: avg,
      maxOn20: max,
      minOn20: min,
      topStrengths: Object.keys(strengthsCount).slice(0, 4),
      topImprovements: Object.keys(improvementsCount).slice(0, 4),
    };
  }, [studentRecords]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <TrendingUp className="w-3.5 h-3.5" />
            Suivi individuel & progression
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Suivi Pédagogique des Élèves
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Visualisez l'historique des notes, la trajectoire de progression et les axes de travail pour chaque élève.
          </p>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher un élève..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {allStudentNames.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <User className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Aucune donnée élève disponible</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Corrigez des copies et enregistrez les évaluations pour alimenter automatiquement les fiches de suivi individuel.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left: Student Selection List */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3 lg:col-span-1 max-h-[600px] flex flex-col">
            <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Élèves</span>
              <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                {filteredStudents.length}
              </span>
            </div>

            <div className="overflow-y-auto space-y-1 pr-1 flex-1">
              {filteredStudents.map((name) => {
                const isSelected = activeStudent === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => setSelectedStudent(name)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <span className="truncate">{name}</span>
                    {isSelected && <Award className="w-3.5 h-3.5 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right: Selected Student Dossier */}
          <div className="lg:col-span-3 space-y-6">
            {activeStudent && stats ? (
              <>
                {/* Stats Header */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-extrabold text-lg">
                      {activeStudent.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-xl font-extrabold text-slate-900">{activeStudent}</h2>
                      <p className="text-xs text-slate-500">
                        {stats.evalCount} {stats.evalCount > 1 ? 'évaluations enregistrées' : 'évaluation enregistrée'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div className="text-center">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Moyenne</span>
                      <span className="text-2xl font-black text-slate-900">{stats.averageOn20}</span>
                      <span className="text-[10px] text-slate-400">/20</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">Record</span>
                      <span className="text-2xl font-black text-emerald-700">{stats.maxOn20}</span>
                      <span className="text-[10px] text-slate-400">/20</span>
                    </div>
                    <div className="h-8 w-px bg-slate-200" />
                    <div className="text-center">
                      <span className="text-[10px] font-bold uppercase text-amber-600 block">Minimum</span>
                      <span className="text-2xl font-black text-amber-700">{stats.minOn20}</span>
                      <span className="text-[10px] text-slate-400">/20</span>
                    </div>
                  </div>
                </div>

                {/* Synthesis of strengths and improvements */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      Points forts récurrents
                    </h3>
                    {stats.topStrengths.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {stats.topStrengths.map((st, sidx) => (
                          <li key={sidx} className="flex items-start gap-1.5">
                            <span className="text-emerald-500 font-bold shrink-0">✓</span>
                            <span>{st}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Pas encore de points forts relevés.</p>
                    )}
                  </div>

                  <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-amber-600" />
                      Axes de progrès prioritaires
                    </h3>
                    {stats.topImprovements.length > 0 ? (
                      <ul className="space-y-1 text-xs text-slate-700">
                        {stats.topImprovements.map((imp, iidx) => (
                          <li key={iidx} className="flex items-start gap-1.5">
                            <span className="text-amber-500 font-bold shrink-0">→</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-400 italic">Aucun axe de travail spécifique noté.</p>
                    )}
                  </div>
                </div>

                {/* Detailed Evaluations Timeline */}
                <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                    Historique des devoirs et contrôles
                  </h3>

                  <div className="space-y-3">
                    {studentRecords.map((rec, idx) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-300 transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-extrabold text-sm text-slate-900">{rec.evalTitle}</span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                {rec.discipline}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="w-3 h-3" />
                              {new Date(rec.date).toLocaleDateString('fr-FR', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          </div>

                          <div className="text-right">
                            <span className="text-xl font-black text-slate-900">
                              {rec.grade} <span className="text-xs font-normal text-slate-400">/{rec.gradeMax}</span>
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              ({rec.scaledTo20} / 20)
                            </span>
                          </div>
                        </div>

                        {rec.appreciation && (
                          <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-lg border border-slate-200/70">
                            "{rec.appreciation}"
                          </p>
                        )}

                        {rec.evaluation && (
                          <div className="pt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => rec.evaluation && onOpenEvaluation(rec.evaluation)}
                              className="text-xs font-bold text-blue-600 hover:text-blue-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              <span>Voir l'évaluation complète de la classe</span>
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
                <p className="text-sm text-slate-500">Sélectionnez un élève à gauche pour voir son historique.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
