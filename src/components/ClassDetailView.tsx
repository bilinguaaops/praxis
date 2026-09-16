import React, { useState, useMemo } from 'react';
import {
  ArrowLeft,
  Users,
  Plus,
  TrendingUp,
  Award,
  CheckCircle2,
  AlertCircle,
  BookOpen,
  Calendar,
  Download,
  Printer,
  Search,
  Edit2,
  Trash2,
  ArrowRight,
  FileSpreadsheet,
  UserCheck,
  Sparkles,
  BarChart2,
  Eye,
  X,
  Check,
  Save,
  SlidersHorizontal,
} from 'lucide-react';
import { ClassGroup, ClassEvaluation, SavedEvaluation, StudentSubmission } from '../types';

interface ClassDetailViewProps {
  classGroup: ClassGroup;
  onUpdateClass: (updatedClass: ClassGroup) => void;
  onBack: () => void;
  onUseClassForCorrection: (classGroup: ClassGroup) => void;
  evaluations: SavedEvaluation[];
  currentSubmissions?: StudentSubmission[];
  onOpenEvaluation?: (evaluation: SavedEvaluation) => void;
}

interface StudentGradeDetail {
  evalId: string;
  evalTitle: string;
  date: string;
  grade: number;
  maxGrade: number;
  scaledTo20: number;
  savedEval?: SavedEvaluation;
}

export const ClassDetailView: React.FC<ClassDetailViewProps> = ({
  classGroup,
  onUpdateClass,
  onBack,
  onUseClassForCorrection,
  evaluations,
  currentSubmissions = [],
  onOpenEvaluation,
}) => {
  const [activeTab, setActiveTab] = useState<'students' | 'gradebook' | 'evals'>('students');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPerformance, setFilterPerformance] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Modals state
  const [showAddEvalModal, setShowAddEvalModal] = useState(false);
  const [editingEval, setEditingEval] = useState<ClassEvaluation | null>(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<string | null>(null);
  const [isEditingClassName, setIsEditingClassName] = useState(false);
  const [tempClassName, setTempClassName] = useState(classGroup.name);

  // Combine manual class evaluations and evaluations saved via AI correction
  const allClassEvaluations = useMemo(() => {
    const list: ClassEvaluation[] = [...(classGroup.evaluations || [])];

    // Check if there are saved evaluations matching this class or containing students of this class
    evaluations.forEach((ev) => {
      // Check if already in list
      const alreadyExists = list.some(
        (e) => e.savedEvaluationId === ev.id || (e.title === ev.title && e.date.slice(0, 10) === ev.date.slice(0, 10))
      );
      if (alreadyExists) return;

      // Check if this saved eval contains students from this class
      const matchingStudentsCount = ev.submissions.filter((s) =>
        classGroup.students.some((st) => st.toLowerCase() === s.studentName.toLowerCase())
      ).length;

      // If at least 2 students or explicit classId match, include it
      if (ev.classId === classGroup.id || matchingStudentsCount >= 2 || (classGroup.students.length <= 2 && matchingStudentsCount > 0)) {
        const grades: Record<string, number> = {};
        ev.submissions.forEach((s) => {
          if (s.result) {
            // find exact student case in classGroup
            const matchedName = classGroup.students.find(
              (st) => st.toLowerCase() === s.studentName.toLowerCase()
            );
            if (matchedName) {
              grades[matchedName] = s.result.note;
            }
          }
        });

        list.push({
          id: 'auto_eval_' + ev.id,
          title: ev.title,
          date: ev.date.slice(0, 10),
          discipline: ev.discipline,
          maxGrade: ev.maxGrade,
          grades,
          savedEvaluationId: ev.id,
        });
      }
    });

    return list.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [classGroup, evaluations]);

  // Compute student stats
  const studentStats = useMemo(() => {
    return classGroup.students.map((studentName) => {
      const gradesList: StudentGradeDetail[] = [];

      allClassEvaluations.forEach((ev) => {
        if (ev.grades[studentName] !== undefined) {
          const rawGrade = ev.grades[studentName];
          const scaled = Number(((rawGrade / ev.maxGrade) * 20).toFixed(2));
          const linkedSaved = ev.savedEvaluationId
            ? evaluations.find((e) => e.id === ev.savedEvaluationId)
            : undefined;

          gradesList.push({
            evalId: ev.id,
            evalTitle: ev.title,
            date: ev.date,
            grade: rawGrade,
            maxGrade: ev.maxGrade,
            scaledTo20: scaled,
            savedEval: linkedSaved,
          });
        }
      });

      const avg =
        gradesList.length > 0
          ? Number(
              (gradesList.reduce((acc, g) => acc + g.scaledTo20, 0) / gradesList.length).toFixed(2)
            )
          : null;

      return {
        name: studentName,
        grades: gradesList,
        average: avg,
        notesCount: gradesList.length,
      };
    });
  }, [classGroup.students, allClassEvaluations, evaluations]);

  // Compute global class metrics
  const classMetrics = useMemo(() => {
    const studentsWithGrades = studentStats.filter((s) => s.average !== null);
    if (studentsWithGrades.length === 0) {
      return {
        overallAverage: null,
        successRate: null,
        highestGrade: null,
        highestStudent: null,
        lowestGrade: null,
        medianGrade: null,
        totalEvaluations: allClassEvaluations.length,
      };
    }

    const averages = studentsWithGrades.map((s) => s.average as number);
    const sum = averages.reduce((a, b) => a + b, 0);
    const overallAvg = Number((sum / averages.length).toFixed(2));

    const sortedAverages = [...averages].sort((a, b) => a - b);
    const median = sortedAverages[Math.floor(sortedAverages.length / 2)];

    // Find highest individual grade across all evals
    let max = -1;
    let maxStudent = '';
    let min = 999;

    studentStats.forEach((s) => {
      s.grades.forEach((g) => {
        if (g.scaledTo20 > max) {
          max = g.scaledTo20;
          maxStudent = s.name;
        }
        if (g.scaledTo20 < min) {
          min = g.scaledTo20;
        }
      });
    });

    const successCount = studentsWithGrades.filter((s) => (s.average as number) >= 10).length;
    const successRate = Math.round((successCount / studentsWithGrades.length) * 100);

    return {
      overallAverage: overallAvg,
      successRate,
      highestGrade: max >= 0 ? max : null,
      highestStudent: maxStudent || null,
      lowestGrade: min <= 20 ? min : null,
      medianGrade: median,
      totalEvaluations: allClassEvaluations.length,
    };
  }, [studentStats, allClassEvaluations]);

  // Filtered students for display
  const filteredStudents = useMemo(() => {
    return studentStats.filter((s) => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      if (!matchesSearch) return false;

      if (filterPerformance === 'high') {
        return s.average !== null && s.average >= 14;
      }
      if (filterPerformance === 'medium') {
        return s.average !== null && s.average >= 10 && s.average < 14;
      }
      if (filterPerformance === 'low') {
        return s.average !== null && s.average < 10;
      }
      return true;
    });
  }, [studentStats, searchQuery, filterPerformance]);

  // Handle saving new or edited manual evaluation
  const handleSaveEvaluation = (newEval: ClassEvaluation) => {
    const existing = classGroup.evaluations || [];
    let updatedEvals: ClassEvaluation[];

    if (existing.some((e) => e.id === newEval.id)) {
      updatedEvals = existing.map((e) => (e.id === newEval.id ? newEval : e));
    } else {
      updatedEvals = [newEval, ...existing];
    }

    onUpdateClass({
      ...classGroup,
      evaluations: updatedEvals,
    });
    setShowAddEvalModal(false);
    setEditingEval(null);
  };

  const handleDeleteClassEval = (evalId: string) => {
    const existing = classGroup.evaluations || [];
    onUpdateClass({
      ...classGroup,
      evaluations: existing.filter((e) => e.id !== evalId),
    });
  };

  // Add individual student
  const handleAddStudent = (e: React.FormEvent) => {
    e.preventDefault();
    const names = newStudentName
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && !classGroup.students.includes(n));

    if (names.length > 0) {
      onUpdateClass({
        ...classGroup,
        students: [...classGroup.students, ...names],
      });
      setNewStudentName('');
      setShowAddStudentModal(false);
    }
  };

  // Delete student from class
  const handleRemoveStudent = (studentName: string) => {
    if (window.confirm(`Retirer ${studentName} de la classe ?`)) {
      onUpdateClass({
        ...classGroup,
        students: classGroup.students.filter((s) => s !== studentName),
      });
    }
  };

  // Save class name edit
  const handleSaveClassName = () => {
    if (tempClassName.trim()) {
      onUpdateClass({
        ...classGroup,
        name: tempClassName.trim(),
      });
      setIsEditingClassName(false);
    }
  };

  // Export Gradebook to CSV
  const handleExportCSV = () => {
    const headers = ['Élève', ...allClassEvaluations.map((e) => `"${e.title} (sur ${e.maxGrade})"`), 'Moyenne /20'];
    const rows = studentStats.map((s) => {
      const gradesCells = allClassEvaluations.map((e) => {
        const grade = e.grades[s.name];
        return grade !== undefined ? grade : '';
      });
      return [`"${s.name}"`, ...gradesCells, s.average !== null ? s.average : ''];
    });

    // Add class average row
    const avgRow = [
      '"MOYENNE DE CLASSE"',
      ...allClassEvaluations.map((e) => {
        const studentGrades = (Object.values(e.grades) as number[]).filter((g) => typeof g === 'number');
        if (studentGrades.length === 0) return '';
        const avg = studentGrades.reduce((a: number, b: number) => a + b, 0) / studentGrades.length;
        return Number(avg.toFixed(2));
      }),
      classMetrics.overallAverage !== null ? classMetrics.overallAverage : '',
    ];

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';')), avgRow.join(';')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Carnet_Notes_${classGroup.name.replace(/\s+/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for grade pill color
  const getGradeBadge = (scaled: number | null) => {
    if (scaled === null) {
      return <span className="text-xs text-slate-400 italic">Pas de note</span>;
    }
    if (scaled >= 14) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
          {scaled} / 20
        </span>
      );
    }
    if (scaled >= 10) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
          {scaled} / 20
        </span>
      );
    }
    if (scaled >= 8) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
          {scaled} / 20
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200">
        {scaled} / 20
      </span>
    );
  };

  // Active student for detail modal
  const activeStudentData = selectedStudentForDetail
    ? studentStats.find((s) => s.name === selectedStudentForDetail)
    : null;

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-xl transition-colors cursor-pointer w-fit shadow-2xs"
        >
          <ArrowLeft className="w-4 h-4 text-slate-500" />
          <span>Retour à toutes les classes</span>
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => {
              setEditingEval(null);
              setShowAddEvalModal(true);
            }}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold transition-all shadow-2xs cursor-pointer"
          >
            <Plus className="w-4 h-4 text-blue-600" />
            <span>Saisir une note / devoir</span>
          </button>

          <button
            type="button"
            onClick={() => onUseClassForCorrection(classGroup)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            <span>Corriger un devoir (IA Vision)</span>
          </button>
        </div>
      </div>

      {/* Class Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold">
                <Users className="w-3.5 h-3.5" />
                {classGroup.students.length} élèves
              </span>
              <span className="text-xs text-slate-400">
                • Créée le {new Date(classGroup.createdAt).toLocaleDateString('fr-FR')}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {isEditingClassName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={tempClassName}
                    onChange={(e) => setTempClassName(e.target.value)}
                    className="text-2xl font-black text-slate-900 border border-blue-400 rounded-lg px-2 py-1 outline-none"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleSaveClassName}
                    className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTempClassName(classGroup.name);
                      setIsEditingClassName(false);
                    }}
                    className="p-1.5 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                    {classGroup.name}
                  </h1>
                  <button
                    type="button"
                    onClick={() => setIsEditingClassName(true)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                    title="Renommer la classe"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
            <p className="text-xs sm:text-sm text-slate-500">
              Tableau de bord de classe : moyenne générale, suivi individuel des élèves et carnet de notes centralisé.
            </p>
          </div>

          {/* Quick Action to Add Students */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAddStudentModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
            >
              <UserCheck className="w-4 h-4 text-slate-600" />
              <span>Ajouter des élèves</span>
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors cursor-pointer"
              title="Exporter les notes en CSV"
            >
              <Download className="w-4 h-4 text-slate-600" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </div>

      {/* Class Metrics Banner / Highlights */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne de la classe */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Moyenne de la classe
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            {classMetrics.overallAverage !== null ? (
              <>
                <span
                  className={`text-3xl sm:text-4xl font-black tracking-tight ${
                    classMetrics.overallAverage >= 14
                      ? 'text-emerald-600'
                      : classMetrics.overallAverage >= 10
                      ? 'text-blue-600'
                      : 'text-amber-600'
                  }`}
                >
                  {classMetrics.overallAverage}
                </span>
                <span className="text-sm font-bold text-slate-400">/ 20</span>
              </>
            ) : (
              <span className="text-base font-bold text-slate-400 italic">En attente de notes</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <TrendingUp className="w-3.5 h-3.5 text-blue-500" />
            <span>Médiane : {classMetrics.medianGrade !== null ? `${classMetrics.medianGrade}/20` : '—'}</span>
          </div>
        </div>

        {/* Taux de réussite */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Taux de réussite (≥ 10)
          </span>
          <div className="mt-1.5 flex items-baseline gap-1">
            {classMetrics.successRate !== null ? (
              <>
                <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                  {classMetrics.successRate}%
                </span>
              </>
            ) : (
              <span className="text-base font-bold text-slate-400 italic">—</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {studentStats.filter((s) => s.average !== null && s.average >= 10).length} sur{' '}
              {studentStats.filter((s) => s.average !== null).length} élèves notés
            </span>
          </div>
        </div>

        {/* Meilleure & Moins bonne note */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Fourchette des notes
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            {classMetrics.highestGrade !== null ? (
              <div className="flex items-center gap-2">
                <span className="text-xl sm:text-2xl font-black text-emerald-600">
                  {classMetrics.highestGrade}
                </span>
                <span className="text-xs text-slate-400">max</span>
                <span className="text-slate-300">/</span>
                <span className="text-xl sm:text-2xl font-black text-slate-700">
                  {classMetrics.lowestGrade}
                </span>
                <span className="text-xs text-slate-400">min</span>
              </div>
            ) : (
              <span className="text-base font-bold text-slate-400 italic">—</span>
            )}
          </div>
          <div className="mt-2 text-xs text-slate-500 truncate" title={classMetrics.highestStudent || ''}>
            <Award className="w-3.5 h-3.5 text-amber-500 inline mr-1" />
            <span>{classMetrics.highestStudent ? `Top: ${classMetrics.highestStudent}` : 'Pas encore de devoir'}</span>
          </div>
        </div>

        {/* Évaluations enregistrées */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
            Devoirs enregistrés
          </span>
          <div className="mt-1.5 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              {allClassEvaluations.length}
            </span>
            <span className="text-sm font-semibold text-slate-400">devoirs</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
            <span>{allClassEvaluations.length > 0 ? 'Devoirs IA & manuels' : 'Aucun devoir saisi'}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Inside the Class */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('students')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'students'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Élèves & Notes ({classGroup.students.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gradebook')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'gradebook'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Carnet de notes (Grille)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('evals')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-2 ${
              activeTab === 'evals'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Évaluations du groupe ({allClassEvaluations.length})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: ÉLÈVES & NOTES (Individual Student Cards & Grades) */}
      {activeTab === 'students' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un élève de la classe..."
                className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setFilterPerformance('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterPerformance === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Tous ({studentStats.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterPerformance('high')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterPerformance === 'high'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                Moyenne ≥ 14
              </button>
              <button
                type="button"
                onClick={() => setFilterPerformance('medium')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterPerformance === 'medium'
                    ? 'bg-blue-600 text-white'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
                }`}
              >
                10 à 14
              </button>
              <button
                type="button"
                onClick={() => setFilterPerformance('low')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap cursor-pointer transition-colors ${
                  filterPerformance === 'low'
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                }`}
              >
                &lt; 10
              </button>
            </div>
          </div>

          {/* Students List */}
          {filteredStudents.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Aucun élève trouvé</p>
              <p className="text-xs text-slate-400 mt-0.5">Modifiez votre recherche ou vos filtres.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredStudents.map((student) => {
                const initials = student.name
                  .split(' ')
                  .map((n) => n[0])
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();

                return (
                  <div
                    key={student.name}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 text-slate-800 flex items-center justify-center font-bold text-sm">
                            {initials}
                          </div>
                          <div>
                            <h3 className="font-extrabold text-slate-900 text-base">{student.name}</h3>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className="text-xs text-slate-400">
                                {student.notesCount}{' '}
                                {student.notesCount > 1 ? 'notes enregistrées' : 'note enregistrée'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Moyenne
                          </span>
                          {getGradeBadge(student.average)}
                        </div>
                      </div>

                      {/* Grades Pills / Badges */}
                      <div className="mt-4 pt-3 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-500 block mb-2">
                          Notes obtenues :
                        </span>
                        {student.grades.length === 0 ? (
                          <span className="text-xs text-slate-400 italic">
                            Aucune note pour le moment.
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {student.grades.map((g, gidx) => (
                              <div
                                key={gidx}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs bg-slate-50 border border-slate-200 text-slate-700"
                                title={`${g.evalTitle} (${g.date}) : ${g.grade}/${g.maxGrade}`}
                              >
                                <span className="font-bold text-slate-900">{g.grade}/{g.maxGrade}</span>
                                <span className="text-[10px] text-slate-400 truncate max-w-[110px]">
                                  {g.evalTitle}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setSelectedStudentForDetail(student.name)}
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Fiche détaillée</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleRemoveStudent(student.name)}
                        className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Retirer l'élève de la classe"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CARNET DE NOTES (Gradebook Grid) */}
      {activeTab === 'gradebook' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
            <div>
              <h3 className="text-sm font-extrabold text-slate-900">
                Grille récapitulative des notes
              </h3>
              <p className="text-xs text-slate-500">
                Vue matricielle des élèves et devoirs.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span>Exporter CSV</span>
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold cursor-pointer transition-colors shadow-2xs"
              >
                <Printer className="w-3.5 h-3.5 text-slate-500" />
                <span>Imprimer</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-4 sticky left-0 bg-slate-100 z-10 w-48 border-r border-slate-200">
                    Nom de l'élève
                  </th>
                  {allClassEvaluations.map((ev) => (
                    <th key={ev.id} className="py-3 px-4 min-w-[130px] border-r border-slate-200 text-center">
                      <div className="truncate font-extrabold text-slate-900" title={ev.title}>
                        {ev.title}
                      </div>
                      <div className="text-[10px] font-normal text-slate-500 mt-0.5">
                        sur {ev.maxGrade} • {ev.date}
                      </div>
                    </th>
                  ))}
                  <th className="py-3 px-4 text-center font-extrabold bg-blue-50 text-blue-900 min-w-[100px]">
                    Moyenne (/20)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {studentStats.map((s) => (
                  <tr key={s.name} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900 sticky left-0 bg-white border-r border-slate-200 z-10">
                      {s.name}
                    </td>
                    {allClassEvaluations.map((ev) => {
                      const grade = ev.grades[s.name];
                      return (
                        <td key={ev.id} className="py-3 px-4 text-center border-r border-slate-200 font-mono">
                          {grade !== undefined ? (
                            <span
                              className={`font-bold px-2 py-0.5 rounded text-xs ${
                                (grade / ev.maxGrade) * 20 >= 14
                                  ? 'text-emerald-700 bg-emerald-50'
                                  : (grade / ev.maxGrade) * 20 >= 10
                                  ? 'text-blue-700 bg-blue-50'
                                  : 'text-rose-700 bg-rose-50'
                              }`}
                            >
                              {grade}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-4 text-center font-bold bg-blue-50/40">
                      {getGradeBadge(s.average)}
                    </td>
                  </tr>
                ))}

                {/* Final Row : Moyenne de la classe par devoir */}
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300">
                  <td className="py-3.5 px-4 sticky left-0 bg-slate-100 z-10 border-r border-slate-200">
                    MOYENNE DE CLASSE
                  </td>
                  {allClassEvaluations.map((ev) => {
                    const gradesArray = (Object.values(ev.grades) as number[]).filter((g) => typeof g === 'number');
                    const avg =
                      gradesArray.length > 0
                        ? Number((gradesArray.reduce((a: number, b: number) => a + b, 0) / gradesArray.length).toFixed(2))
                        : null;
                    return (
                      <td key={ev.id} className="py-3.5 px-4 text-center border-r border-slate-200 font-mono">
                        {avg !== null ? (
                          <span className="text-slate-900 font-black">
                            {avg} <span className="text-[10px] text-slate-400 font-normal">/{ev.maxGrade}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-4 text-center bg-blue-100/60 font-black text-blue-900">
                    {classMetrics.overallAverage !== null ? `${classMetrics.overallAverage} / 20` : '—'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: ÉVALUATIONS DU GROUPE */}
      {activeTab === 'evals' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Liste de tous les devoirs et évaluations comptabilisés pour cette classe.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingEval(null);
                setShowAddEvalModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              <span>Nouveau devoir / Saisir des notes</span>
            </button>
          </div>

          {allClassEvaluations.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-2xl border border-slate-200">
              <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">Aucun devoir enregistré</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Saisissez un contrôle rapide ou lancez une correction de copies par IA pour alimenter la classe.
              </p>
              <button
                type="button"
                onClick={() => setShowAddEvalModal(true)}
                className="mt-4 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Ajouter une première évaluation
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {allClassEvaluations.map((ev) => {
                const notesValues = (Object.values(ev.grades) as number[]).filter((g) => typeof g === 'number');
                const avg =
                  notesValues.length > 0
                    ? Number((notesValues.reduce((a: number, b: number) => a + b, 0) / notesValues.length).toFixed(2))
                    : null;
                const scaledAvg = avg !== null ? Number(((avg / ev.maxGrade) * 20).toFixed(2)) : null;

                const linkedSaved = ev.savedEvaluationId
                  ? evaluations.find((e) => e.id === ev.savedEvaluationId)
                  : null;

                return (
                  <div
                    key={ev.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                              {ev.date}
                            </span>
                            {ev.savedEvaluationId && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                                <Sparkles className="w-3 h-3" /> IA Vision
                              </span>
                            )}
                          </div>
                          <h3 className="font-extrabold text-slate-900 text-base mt-1.5">{ev.title}</h3>
                          <span className="text-xs text-slate-400">
                            Barème : noté sur {ev.maxGrade} • {notesValues.length} élèves notés
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            Moyenne
                          </span>
                          <span className="text-lg font-black text-slate-900">
                            {avg !== null ? `${avg} / ${ev.maxGrade}` : '—'}
                          </span>
                          {scaledAvg !== null && (
                            <span className="text-[11px] text-slate-500 block">
                              ({scaledAvg} / 20)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      {linkedSaved && onOpenEvaluation ? (
                        <button
                          type="button"
                          onClick={() => onOpenEvaluation(linkedSaved)}
                          className="inline-flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Voir le rapport complet IA</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingEval(ev);
                            setShowAddEvalModal(true);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-slate-700 hover:text-blue-600"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          <span>Modifier les notes</span>
                        </button>
                      )}

                      {!ev.savedEvaluationId && (
                        <button
                          type="button"
                          onClick={() => handleDeleteClassEval(ev.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Supprimer cette évaluation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL: Saisie rapide de notes / Nouvelle évaluation */}
      {showAddEvalModal && (
        <EvalEntryModal
          classGroup={classGroup}
          existingEval={editingEval}
          onSave={handleSaveEvaluation}
          onClose={() => {
            setShowAddEvalModal(false);
            setEditingEval(null);
          }}
        />
      )}

      {/* MODAL: Ajouter des élèves */}
      {showAddStudentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-extrabold text-slate-900">
                Ajouter des élèves à la classe
              </h3>
              <button
                type="button"
                onClick={() => setShowAddStudentModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddStudent} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Noms des élèves à ajouter (un par ligne ou séparés par des virgules)
                </label>
                <textarea
                  rows={4}
                  value={newStudentName}
                  onChange={(e) => setNewStudentName(e.target.value)}
                  placeholder="Amine Khelil&#10;Julie Vasseur&#10;Kevin Dupont..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Ajouter à la classe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Fiche détaillée de l'élève */}
      {selectedStudentForDetail && activeStudentData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Fiche Élève • {classGroup.name}
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {activeStudentData.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Student Overview Stat */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500 block">Moyenne générale</span>
                <div className="flex items-baseline gap-1 mt-0.5">
                  <span className="text-2xl font-black text-slate-900">
                    {activeStudentData.average !== null ? activeStudentData.average : '—'}
                  </span>
                  <span className="text-xs text-slate-400">/ 20</span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-xs text-slate-500 block">Par rapport à la classe</span>
                {activeStudentData.average !== null && classMetrics.overallAverage !== null ? (
                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-md inline-block mt-1 ${
                      activeStudentData.average >= classMetrics.overallAverage
                        ? 'text-emerald-700 bg-emerald-50'
                        : 'text-amber-700 bg-amber-50'
                    }`}
                  >
                    {activeStudentData.average >= classMetrics.overallAverage ? '+' : ''}
                    {(activeStudentData.average - classMetrics.overallAverage).toFixed(2)} pts
                  </span>
                ) : (
                  <span className="text-xs text-slate-400">—</span>
                )}
              </div>
            </div>

            {/* List of notes for this student */}
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 mb-2">
                Historique des notes ({activeStudentData.grades.length})
              </h4>
              {activeStudentData.grades.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Aucune note enregistrée pour le moment.</p>
              ) : (
                <div className="space-y-2">
                  {activeStudentData.grades.map((g, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between hover:border-slate-300"
                    >
                      <div>
                        <span className="text-xs font-extrabold text-slate-900 block">{g.evalTitle}</span>
                        <span className="text-[10px] text-slate-400">{g.date}</span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold text-sm text-slate-900">
                          {g.grade} / {g.maxGrade}
                        </span>
                        <span className="text-[11px] text-slate-400 block font-mono">
                          ({g.scaledTo20} / 20)
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStudentForDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Modal to add or edit an evaluation and enter notes for all students
 */
interface EvalEntryModalProps {
  classGroup: ClassGroup;
  existingEval: ClassEvaluation | null;
  onSave: (evaluation: ClassEvaluation) => void;
  onClose: () => void;
}

const EvalEntryModal: React.FC<EvalEntryModalProps> = ({
  classGroup,
  existingEval,
  onSave,
  onClose,
}) => {
  const [title, setTitle] = useState(existingEval?.title || 'Contrôle N°' + (classGroup.evaluations?.length ? classGroup.evaluations.length + 1 : 1));
  const [date, setDate] = useState(existingEval?.date || new Date().toISOString().slice(0, 10));
  const [maxGrade, setMaxGrade] = useState<number>(existingEval?.maxGrade || 20);
  const [grades, setGrades] = useState<Record<string, number | ''>>(() => {
    const map: Record<string, number | ''> = {};
    classGroup.students.forEach((name) => {
      map[name] = existingEval?.grades[name] !== undefined ? existingEval.grades[name] : '';
    });
    return map;
  });

  const handleGradeChange = (studentName: string, valStr: string) => {
    if (valStr === '') {
      setGrades((prev) => ({ ...prev, [studentName]: '' }));
      return;
    }
    const parsed = parseFloat(valStr);
    if (!isNaN(parsed)) {
      setGrades((prev) => ({ ...prev, [studentName]: Math.min(Math.max(0, parsed), maxGrade) }));
    }
  };

  // Live average calculation
  const enteredGrades = (Object.values(grades) as (number | '')[]).filter(
    (v): v is number => typeof v === 'number'
  );
  const liveAvg =
    enteredGrades.length > 0
      ? Number((enteredGrades.reduce((a: number, b: number) => a + b, 0) / enteredGrades.length).toFixed(2))
      : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const cleanedGrades: Record<string, number> = {};
    Object.entries(grades).forEach(([name, val]) => {
      if (typeof val === 'number') {
        cleanedGrades[name] = val;
      }
    });

    onSave({
      id: existingEval ? existingEval.id : 'classeval_' + Date.now(),
      title: title.trim(),
      date,
      maxGrade: Number(maxGrade) || 20,
      grades: cleanedGrades,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">
              {existingEval ? 'Modifier les notes du devoir' : 'Saisir un devoir / nouvelles notes'}
            </h3>
            <p className="text-xs text-slate-500">
              Classe : {classGroup.name} ({classGroup.students.length} élèves)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 flex-1 flex flex-col min-h-0">
          {/* Header controls: Title, Date, Max Grade */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Titre du devoir
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex : Contrôle N°2"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">Note sur</label>
              <input
                type="number"
                min={1}
                max={100}
                value={maxGrade}
                onChange={(e) => setMaxGrade(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          {/* Live Average Banner */}
          <div className="bg-blue-50/80 border border-blue-200/80 px-4 py-2.5 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-blue-900">
                Moyenne calculée en direct :
              </span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-base font-black text-blue-700">
                {liveAvg !== null ? liveAvg : '—'}
              </span>
              <span className="text-xs font-bold text-blue-500">/ {maxGrade}</span>
              <span className="text-[11px] text-blue-500 ml-1">
                ({enteredGrades.length} / {classGroup.students.length} saisis)
              </span>
            </div>
          </div>

          {/* Table of Students & Note Input */}
          <div className="flex-1 overflow-y-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-bold text-slate-700">Élève</th>
                  <th className="py-2.5 px-3 font-bold text-slate-700 text-right w-32">
                    Note (sur {maxGrade})
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {classGroup.students.map((studentName) => (
                  <tr key={studentName} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-semibold text-slate-900">{studentName}</td>
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        max={maxGrade}
                        value={grades[studentName] === '' ? '' : grades[studentName]}
                        onChange={(e) => handleGradeChange(studentName, e.target.value)}
                        placeholder="—"
                        className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs text-right font-mono font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Footer Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-xs cursor-pointer inline-flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>Enregistrer les notes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
