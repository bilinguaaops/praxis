import React, { useState, useMemo } from 'react';
import {
  Users,
  ArrowLeft,
  GraduationCap,
  TrendingUp,
  Award,
  BookOpen,
  Calendar,
  Search,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  UserCheck,
  ChevronRight,
  Filter,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { ClassGroup, SavedEvaluation, StudentSubmission } from '../types';

interface ClassDetailViewProps {
  classGroup: ClassGroup;
  evaluations: SavedEvaluation[];
  currentSubmissions: StudentSubmission[];
  onBack: () => void;
  onUpdateClass: (updated: ClassGroup) => void;
  onSelectStudentDetail?: (submission: StudentSubmission) => void;
  onUseClassForCorrection: (classGroup: ClassGroup) => void;
  onLoadEvaluation?: (evaluation: SavedEvaluation) => void;
}

interface StudentClassRecord {
  studentName: string;
  evaluationsCount: number;
  averageOn20: number | null;
  bestGradeOn20: number | null;
  latestGradeOn20: number | null;
  gradesHistory: {
    evalId: string;
    evalTitle: string;
    discipline: string;
    date: string;
    note: number;
    note_sur: number;
    noteOn20: number;
    appreciation?: string;
    submission: StudentSubmission;
    evaluation?: SavedEvaluation;
  }[];
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  classGroup,
  evaluations,
  currentSubmissions,
  onBack,
  onUpdateClass,
  onSelectStudentDetail,
  onUseClassForCorrection,
  onLoadEvaluation,
}) => {
  const [studentSearch, setStudentSearch] = useState('');
  const [selectedStudentName, setSelectedStudentName] = useState<string | null>(null);
  const [newStudentName, setNewStudentName] = useState('');
  const [showAddStudentForm, setShowAddStudentForm] = useState(false);
  const [selectedDisciplineFilter, setSelectedDisciplineFilter] = useState<string>('ALL');

  // Quick lookup set for students belonging to this class
  const classStudentSet = useMemo(() => {
    return new Set(classGroup.students.map((s) => s.trim().toLowerCase()));
  }, [classGroup.students]);

  // Aggregate all evaluations that have submissions from this class's students
  const classEvaluations = useMemo(() => {
    const list: {
      evaluation: SavedEvaluation;
      matchingSubmissions: StudentSubmission[];
      classAverageOn20: number;
    }[] = [];

    evaluations.forEach((ev) => {
      const matches = ev.submissions.filter(
        (sub) => sub.studentName && classStudentSet.has(sub.studentName.trim().toLowerCase()) && sub.result
      );

      if (matches.length > 0) {
        const sumOn20 = matches.reduce((acc, sub) => {
          const res = sub.result!;
          return acc + (res.note / res.note_sur) * 20;
        }, 0);
        const avgOn20 = Number((sumOn20 / matches.length).toFixed(2));

        list.push({
          evaluation: ev,
          matchingSubmissions: matches,
          classAverageOn20: avgOn20,
        });
      }
    });

    return list;
  }, [evaluations, classStudentSet]);

  // Unique disciplines across this class's recorded evaluations
  const availableDisciplines = useMemo(() => {
    const set = new Set<string>();
    classEvaluations.forEach((item) => {
      if (item.evaluation.discipline) set.add(item.evaluation.discipline);
    });
    return Array.from(set).sort();
  }, [classEvaluations]);

  // Per-student aggregated records
  const studentRecords: StudentClassRecord[] = useMemo(() => {
    return classGroup.students.map((rawName) => {
      const studentNameLower = rawName.trim().toLowerCase();
      const gradesHistory: StudentClassRecord['gradesHistory'] = [];

      // 1. Saved evaluations
      evaluations.forEach((ev) => {
        if (selectedDisciplineFilter !== 'ALL' && ev.discipline !== selectedDisciplineFilter) {
          return;
        }

        const match = ev.submissions.find(
          (s) => s.studentName && s.studentName.trim().toLowerCase() === studentNameLower && s.result
        );

        if (match && match.result) {
          const noteOn20 = Number(((match.result.note / match.result.note_sur) * 20).toFixed(2));
          gradesHistory.push({
            evalId: ev.id,
            evalTitle: ev.title,
            discipline: ev.discipline,
            date: ev.date,
            note: match.result.note,
            note_sur: match.result.note_sur,
            noteOn20,
            appreciation: match.result.appreciation,
            submission: match,
            evaluation: ev,
          });
        }
      });

      // 2. Current live session if active
      const currentMatch = currentSubmissions.find(
        (s) => s.studentName && s.studentName.trim().toLowerCase() === studentNameLower && s.result
      );
      if (currentMatch && currentMatch.result) {
        if (selectedDisciplineFilter === 'ALL') {
          const noteOn20 = Number(
            ((currentMatch.result.note / currentMatch.result.note_sur) * 20).toFixed(2)
          );
          gradesHistory.push({
            evalId: 'current-live',
            evalTitle: 'Évaluation en cours de correction',
            discipline: 'Session en cours',
            date: new Date().toISOString(),
            note: currentMatch.result.note,
            note_sur: currentMatch.result.note_sur,
            noteOn20,
            appreciation: currentMatch.result.appreciation,
            submission: currentMatch,
          });
        }
      }

      // Sort grades history by date newest first
      gradesHistory.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      let averageOn20: number | null = null;
      let bestGradeOn20: number | null = null;
      let latestGradeOn20: number | null = null;

      if (gradesHistory.length > 0) {
        const sum = gradesHistory.reduce((acc, g) => acc + g.noteOn20, 0);
        averageOn20 = Number((sum / gradesHistory.length).toFixed(2));
        bestGradeOn20 = Math.max(...gradesHistory.map((g) => g.noteOn20));
        latestGradeOn20 = gradesHistory[0].noteOn20;
      }

      return {
        studentName: rawName,
        evaluationsCount: gradesHistory.length,
        averageOn20,
        bestGradeOn20,
        latestGradeOn20,
        gradesHistory,
      };
    });
  }, [classGroup.students, evaluations, currentSubmissions, selectedDisciplineFilter]);

  // Overall class metrics computed across all students with recorded grades
  const classOverallStats = useMemo(() => {
    const studentsWithGrades = studentRecords.filter((s) => s.averageOn20 !== null);
    if (studentsWithGrades.length === 0) {
      return {
        classAverageOn20: null,
        highestStudentAverage: null,
        lowestStudentAverage: null,
        successRate: null,
        totalEvaluationsLinked: classEvaluations.length,
      };
    }

    const averages = studentsWithGrades.map((s) => s.averageOn20 as number);
    const sum = averages.reduce((acc, val) => acc + val, 0);
    const classAvg = Number((sum / averages.length).toFixed(2));
    const highest = Math.max(...averages);
    const lowest = Math.min(...averages);
    const successCount = averages.filter((a) => a >= 10).length;
    const successRate = Math.round((successCount / averages.length) * 100);

    return {
      classAverageOn20: classAvg,
      highestStudentAverage: highest,
      lowestStudentAverage: lowest,
      successRate,
      totalEvaluationsLinked: classEvaluations.length,
    };
  }, [studentRecords, classEvaluations]);

  // Filter students by search input
  const filteredStudentRecords = useMemo(() => {
    if (!studentSearch.trim()) return studentRecords;
    const q = studentSearch.trim().toLowerCase();
    return studentRecords.filter((s) => s.studentName.toLowerCase().includes(q));
  }, [studentRecords, studentSearch]);

  // Currently inspected student details
  const activeStudentDetail = useMemo(() => {
    if (!selectedStudentName) return null;
    return (
      studentRecords.find(
        (s) => s.studentName.trim().toLowerCase() === selectedStudentName.trim().toLowerCase()
      ) || null
    );
  }, [studentRecords, selectedStudentName]);

  // Handler to add a student to this class
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStudentName.trim();
    if (!trimmed) return;

    if (classGroup.students.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      alert("Cet élève est déjà présent dans cette classe.");
      return;
    }

    const updatedStudents = [...classGroup.students, trimmed].sort((a, b) =>
      a.localeCompare(b, 'fr')
    );
    onUpdateClass({
      ...classGroup,
      students: updatedStudents,
    });
    setNewStudentName('');
    setShowAddStudentForm(false);
  };

  // Handler to remove a student from this class
  const handleRemoveStudent = (studentName: string) => {
    if (
      !window.confirm(
        `Retirer "${studentName}" de la classe ${classGroup.name} ? (Ses notes passées dans l'historique restent conservées)`
      )
    ) {
      return;
    }

    const updatedStudents = classGroup.students.filter((s) => s !== studentName);
    onUpdateClass({
      ...classGroup,
      students: updatedStudents,
    });
    if (selectedStudentName === studentName) {
      setSelectedStudentName(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb and Actions Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1.5">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-blue-600 transition-colors cursor-pointer group mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            <span>Retour à la liste des classes</span>
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 border border-blue-200/80 flex items-center justify-center font-extrabold text-lg shadow-xs">
              {classGroup.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>{classGroup.name}</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                  {classGroup.students.length}{' '}
                  {classGroup.students.length > 1 ? 'élèves' : 'élève'}
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Fiche de classe • Vue d'ensemble des moyennes et notes individuelles
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={() => onUseClassForCorrection(classGroup)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-xs transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-blue-200" />
            <span>Corriger un devoir pour cette classe</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Class KPI Metric Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Moyenne Générale */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Moyenne de la classe
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-3xl font-black text-slate-900">
                {classOverallStats.classAverageOn20 !== null
                  ? `${classOverallStats.classAverageOn20.toFixed(1)}`
                  : '—'}
              </span>
              <span className="text-xs font-bold text-slate-400">/ 20</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {classOverallStats.classAverageOn20 !== null
                ? classOverallStats.classAverageOn20 >= 10
                  ? 'Moyenne satisfaisante'
                  : 'Moyenne à consolider'
                : 'Aucune évaluation notée'}
            </p>
          </div>
          <div
            className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              classOverallStats.classAverageOn20 !== null &&
              classOverallStats.classAverageOn20 >= 10
                ? 'bg-emerald-50 text-emerald-600 border border-emerald-200/60'
                : 'bg-blue-50 text-blue-600 border border-blue-200/60'
            }`}
          >
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Taux de réussite */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Taux de réussite
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900">
                {classOverallStats.successRate !== null
                  ? `${classOverallStats.successRate}%`
                  : '—'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Moyenne ≥ 10/20</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200/60 flex items-center justify-center">
            <Award className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Évaluations associées */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Évaluations liées
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-slate-900">
                {classEvaluations.length}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Devoirs enregistrés</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center">
            <BookOpen className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Extrêmes de la classe */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Fourchette de notes
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-sm font-bold text-rose-600">
                {classOverallStats.lowestStudentAverage !== null
                  ? `${classOverallStats.lowestStudentAverage}/20`
                  : '—'}
              </span>
              <span className="text-xs text-slate-400">à</span>
              <span className="text-sm font-bold text-emerald-600">
                {classOverallStats.highestStudentAverage !== null
                  ? `${classOverallStats.highestStudentAverage}/20`
                  : '—'}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">Moy. min & max élève</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/80 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Main Content Layout: Left = Student Table with filters, Right = Student Detail Drawer / Modal preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2 cols wide): Students Table */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            {/* Table Control Bar */}
            <div className="p-4 sm:p-5 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <h2 className="font-extrabold text-sm text-slate-900">
                  Liste des élèves ({filteredStudentRecords.length})
                </h2>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* Discipline Filter */}
                {availableDisciplines.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <Filter className="w-3.5 h-3.5 text-slate-400" />
                    <select
                      value={selectedDisciplineFilter}
                      onChange={(e) => setSelectedDisciplineFilter(e.target.value)}
                      className="text-xs font-semibold bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer"
                    >
                      <option value="ALL">Toutes les matières</option>
                      {availableDisciplines.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Search field */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Chercher un élève..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 w-44"
                  />
                </div>

                {/* Add student toggle button */}
                <button
                  type="button"
                  onClick={() => setShowAddStudentForm(!showAddStudentForm)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Ajouter</span>
                </button>
              </div>
            </div>

            {/* Quick add student form */}
            {showAddStudentForm && (
              <form
                onSubmit={handleAddStudent}
                className="p-4 bg-blue-50/60 border-b border-blue-100 flex items-center gap-3 animate-in slide-in-from-top-1"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    required
                    placeholder="Nom et prénom de l'élève (ex: Thomas Dubois)..."
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full text-xs bg-white border border-blue-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    autoFocus
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer"
                >
                  Enregistrer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddStudentForm(false);
                    setNewStudentName('');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer"
                >
                  Annuler
                </button>
              </form>
            )}

            {/* Students Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Élève</th>
                    <th className="py-3 px-3 text-center">Devoirs notés</th>
                    <th className="py-3 px-3 text-center">Dernière note</th>
                    <th className="py-3 px-3 text-center">Moyenne</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredStudentRecords.map((record) => {
                    const isSelected = selectedStudentName === record.studentName;
                    const avg = record.averageOn20;

                    return (
                      <tr
                        key={record.studentName}
                        onClick={() => setSelectedStudentName(record.studentName)}
                        className={`transition-colors cursor-pointer group ${
                          isSelected
                            ? 'bg-blue-50/80 hover:bg-blue-50'
                            : 'hover:bg-slate-50/80'
                        }`}
                      >
                        {/* Student Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 border border-slate-200/80 flex items-center justify-center font-bold text-[11px] shrink-0 group-hover:border-blue-300">
                              {record.studentName.slice(0, 1).toUpperCase()}
                            </div>
                            <div>
                              <span className="font-bold text-slate-900 block group-hover:text-blue-600 transition-colors">
                                {record.studentName}
                              </span>
                              {record.bestGradeOn20 !== null && (
                                <span className="text-[10px] text-slate-400">
                                  Meilleure : {record.bestGradeOn20}/20
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Number of evaluations */}
                        <td className="py-3 px-3 text-center">
                          {record.evaluationsCount > 0 ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                              {record.evaluationsCount}{' '}
                              {record.evaluationsCount > 1 ? 'notes' : 'note'}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[11px] italic">0</span>
                          )}
                        </td>

                        {/* Latest grade */}
                        <td className="py-3 px-3 text-center">
                          {record.latestGradeOn20 !== null ? (
                            <span
                              className={`font-extrabold ${
                                record.latestGradeOn20 >= 10
                                  ? 'text-emerald-700'
                                  : 'text-amber-700'
                              }`}
                            >
                              {record.latestGradeOn20} / 20
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>

                        {/* Average */}
                        <td className="py-3 px-3 text-center">
                          {avg !== null ? (
                            <span
                              className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-black ${
                                avg >= 14
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : avg >= 10
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {avg.toFixed(1)} / 20
                            </span>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">En attente</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div
                            className="flex items-center justify-end gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <button
                              type="button"
                              onClick={() => setSelectedStudentName(record.studentName)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                              title="Voir l'historique et les copies"
                            >
                              <ChevronRight className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRemoveStudent(record.studentName)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Retirer de la classe"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {filteredStudentRecords.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-400">
                        <Users className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium">Aucun élève trouvé.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Evaluations attached to this class */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                <span>Évaluations historiques associées à cette classe</span>
              </h3>
              <span className="text-xs font-bold text-slate-400">
                {classEvaluations.length} trouvée(s)
              </span>
            </div>

            {classEvaluations.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {classEvaluations.map(({ evaluation, matchingSubmissions, classAverageOn20 }) => (
                  <div
                    key={evaluation.id}
                    className="p-3.5 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-all flex flex-col justify-between gap-3 bg-white"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">
                          {evaluation.discipline || 'Matière'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {new Date(evaluation.date).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 line-clamp-1">
                        {evaluation.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {matchingSubmissions.length} copies notées pour cette classe
                      </p>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px]">
                        <span className="text-slate-400">Moyenne : </span>
                        <span className="font-extrabold text-slate-800">
                          {classAverageOn20} / 20
                        </span>
                      </div>
                      {onLoadEvaluation && (
                        <button
                          type="button"
                          onClick={() => onLoadEvaluation(evaluation)}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 cursor-pointer"
                        >
                          <span>Voir bilan</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center">
                <p className="text-xs text-slate-500">
                  Aucun devoir archivé ne correspond encore aux élèves de cette classe.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Les devoirs créés et corrigés avec ces élèves apparaîtront automatiquement ici avec leurs moyennes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Student Drilldown Drawer */}
        <div className="space-y-4">
          {activeStudentDetail ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4 sticky top-24">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black text-sm">
                    {activeStudentDetail.studentName.slice(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-extrabold text-sm text-slate-900">
                      {activeStudentDetail.studentName}
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Fiche individuelle • {classGroup.name}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedStudentName(null)}
                  className="text-xs font-semibold text-slate-400 hover:text-slate-600 p-1"
                >
                  Fermer
                </button>
              </div>

              {/* Student KPI Card */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Moyenne élève
                  </span>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-xl font-black text-slate-900">
                      {activeStudentDetail.averageOn20 !== null
                        ? activeStudentDetail.averageOn20.toFixed(1)
                        : '—'}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">/ 20</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-bold uppercase text-slate-400 block">
                    Devoirs notés
                  </span>
                  <span className="text-xl font-black text-slate-900 block mt-0.5">
                    {activeStudentDetail.evaluationsCount}
                  </span>
                </div>
              </div>

              {/* Grade history breakdown for this student */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Historique des notes ({activeStudentDetail.gradesHistory.length})</span>
                </h4>

                {activeStudentDetail.gradesHistory.length > 0 ? (
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {activeStudentDetail.gradesHistory.map((item, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl border border-slate-200 hover:border-blue-300 transition-colors bg-white space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-bold text-xs text-slate-900 line-clamp-1">
                            {item.evalTitle}
                          </span>
                          <span
                            className={`font-black text-xs px-2 py-0.5 rounded-md ${
                              item.noteOn20 >= 10
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-rose-50 text-rose-700'
                            }`}
                          >
                            {item.note}/{item.note_sur}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{item.discipline}</span>
                          <span>{new Date(item.date).toLocaleDateString('fr-FR')}</span>
                        </div>

                        {item.appreciation && (
                          <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg italic border border-slate-100">
                            « {item.appreciation} »
                          </p>
                        )}

                        {onSelectStudentDetail && item.submission && (
                          <button
                            type="button"
                            onClick={() => onSelectStudentDetail(item.submission)}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-700 pt-1 cursor-pointer"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Consulter la copie annotée</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic py-2">
                    Aucune note enregistrée pour le moment.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 mx-auto flex items-center justify-center">
                <UserCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-slate-900">Détails d'un élève</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Cliquez sur un élève dans le tableau pour afficher l'historique complet de ses notes, son appréciation et consulter sa copie corrigée.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
