import React, { useState, useMemo } from 'react';
import {
  Users,
  Plus,
  Trash2,
  Edit2,
  ArrowRight,
  UserCheck,
  AlertTriangle,
  FolderOpen,
  TrendingUp,
  BookOpen,
  Sparkles,
  ChevronRight,
  GraduationCap,
} from 'lucide-react';
import { ClassGroup, SavedEvaluation, StudentSubmission } from '../types';
import { ClassDetailView } from './ClassDetailView';

interface ClassesViewProps {
  classes: ClassGroup[];
  onClassesChange: (classes: ClassGroup[]) => void;
  onUseClassForCorrection: (classGroup: ClassGroup) => void;
  evaluations?: SavedEvaluation[];
  currentSubmissions?: StudentSubmission[];
  onOpenEvaluation?: (evaluation: SavedEvaluation) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  onClassesChange,
  onUseClassForCorrection,
  evaluations = [],
  currentSubmissions = [],
  onOpenEvaluation,
}) => {
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [className, setClassName] = useState('');
  const [studentsInput, setStudentsInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

  // If a class is selected, render the detailed inner view
  const selectedClass = useMemo(() => {
    return classes.find((c) => c.id === selectedClassId) || null;
  }, [classes, selectedClassId]);

  const handleUpdateClass = (updatedClass: ClassGroup) => {
    onClassesChange(classes.map((c) => (c.id === updatedClass.id ? updatedClass : c)));
  };

  const handleSaveClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;

    const studentList = studentsInput
      .split(/[\n,;]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (editingId) {
      const updated = classes.map((c) =>
        c.id === editingId ? { ...c, name: className.trim(), students: studentList } : c
      );
      onClassesChange(updated);
      setEditingId(null);
    } else {
      const newClassId = 'class_' + Date.now();
      const newClass: ClassGroup = {
        id: newClassId,
        name: className.trim(),
        students: studentList,
        createdAt: new Date().toISOString(),
        evaluations: [],
      };
      onClassesChange([newClass, ...classes]);
      // Directly enter inside the newly created class
      setSelectedClassId(newClassId);
    }

    setClassName('');
    setStudentsInput('');
    setShowForm(false);
  };

  const handleEdit = (c: ClassGroup) => {
    setClassName(c.name);
    setStudentsInput(c.students.join('\n'));
    setEditingId(c.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    onClassesChange(classes.filter((c) => c.id !== id));
    setDeletingClassId(null);
    if (selectedClassId === id) {
      setSelectedClassId(null);
    }
  };

  // Helper to compute a class's average preview from manual & saved evaluations
  const getClassPreviewStats = (cls: ClassGroup) => {
    const evals = cls.evaluations || [];
    const notesScaledTo20: number[] = [];

    evals.forEach((e) => {
      Object.values(e.grades).forEach((grade) => {
        notesScaledTo20.push((grade / e.maxGrade) * 20);
      });
    });

    // Also check saved evaluations matching students in this class
    evaluations.forEach((ev) => {
      if (ev.classId === cls.id || ev.className === cls.name) {
        ev.submissions.forEach((s) => {
          if (s.result) {
            notesScaledTo20.push((s.result.note / s.result.note_sur) * 20);
          }
        });
      }
    });

    const avg =
      notesScaledTo20.length > 0
        ? Number((notesScaledTo20.reduce((a, b) => a + b, 0) / notesScaledTo20.length).toFixed(1))
        : null;

    return {
      average: avg,
      evalCount: evals.length,
      notesCount: notesScaledTo20.length,
    };
  };

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  // If a class is currently opened, display its inner view
  if (selectedClass) {
    return (
      <ClassDetailView
        classGroup={selectedClass}
        onUpdateClass={handleUpdateClass}
        onBack={() => setSelectedClassId(null)}
        onUseClassForCorrection={onUseClassForCorrection}
        evaluations={evaluations}
        currentSubmissions={currentSubmissions}
        onOpenEvaluation={onOpenEvaluation}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Gestion des classes & Carnet de notes
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mes Classes & Rosters
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Créez vos classes, entrez à l'intérieur pour suivre la moyenne de la classe, les notes des élèves et générer les bulletins.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setClassName('');
            setStudentsInput('');
            setEditingId(null);
            setShowForm(!showForm);
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>{showForm ? 'Fermer le formulaire' : 'Nouvelle classe'}</span>
        </button>
      </div>

      {/* Global stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Classes actives</span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">{classes.length}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Élèves recensés</span>
          <span className="text-3xl font-black text-blue-600 mt-1 block">{totalStudents}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Effectif moyen</span>
          <span className="text-3xl font-black text-emerald-600 mt-1 block">
            {classes.length ? Math.round(totalStudents / classes.length) : 0}{' '}
            <span className="text-sm font-semibold text-slate-400">élèves / classe</span>
          </span>
        </div>
      </div>

      {/* New/Edit Class Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-blue-200 p-6 shadow-sm animate-in fade-in duration-200 space-y-4 ring-1 ring-blue-500/20">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-blue-600" />
              <span>{editingId ? 'Modifier la classe' : 'Créer une nouvelle classe'}</span>
            </h3>
            <span className="text-xs text-blue-600 font-semibold bg-blue-50 px-2.5 py-1 rounded-full">
              Entrée automatique après création
            </span>
          </div>

          <form onSubmit={handleSaveClass} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom de la classe <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex : 3ème B, Terminale Spé Maths, 4e 2..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Liste des élèves <span className="font-normal text-slate-400">(un par ligne ou séparés par des virgules)</span>
              </label>
              <textarea
                rows={5}
                value={studentsInput}
                onChange={(e) => setStudentsInput(e.target.value)}
                placeholder="Lucas Martin&#10;Sarah Benali&#10;Thomas Leroy&#10;Emma Dubois&#10;Maxime Petit..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Astuce : Vous pourrez ensuite ajouter des notes, consulter la moyenne de la classe et les fiches des élèves.
              </p>
            </div>

            <div className="flex items-center gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>{editingId ? 'Mettre à jour la classe' : 'Créer et entrer dans la classe'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* List of classes */}
      {classes.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Aucune classe enregistrée</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Créez une classe pour entrer à l'intérieur, suivre les notes de chaque élève, calculer la moyenne générale et pré-remplir les corrections.
          </p>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl cursor-pointer shadow-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Créer ma première classe</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {classes.map((cls) => {
            const stats = getClassPreviewStats(cls);

            return (
              <div
                key={cls.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-blue-300 hover:shadow-sm transition-all space-y-4 group"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex items-center gap-3 cursor-pointer"
                      onClick={() => setSelectedClassId(cls.id)}
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors shrink-0">
                        {cls.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                          <span>{cls.name}</span>
                          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </h3>
                        <span className="text-xs text-slate-500">
                          {cls.students.length} {cls.students.length > 1 ? 'élèves' : 'élève'}
                          {stats.evalCount > 0 ? ` • ${stats.evalCount} devoirs` : ''}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleEdit(cls)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="Modifier le nom ou la liste"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeletingClassId(cls.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Supprimer la classe"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Inline Confirmation when deleting */}
                  {deletingClassId === cls.id && (
                    <div className="mt-3 p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 animate-in fade-in">
                      <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Supprimer définitivement cette classe ?</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleDelete(cls.id)}
                          className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg cursor-pointer shadow-xs transition-colors"
                        >
                          Confirmer
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingClassId(null)}
                          className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer transition-colors"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Class average highlight pill */}
                  <div className="mt-3.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-700">Moyenne de la classe :</span>
                    </div>
                    {stats.average !== null ? (
                      <span
                        className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                          stats.average >= 14
                            ? 'bg-emerald-100 text-emerald-800'
                            : stats.average >= 10
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {stats.average} / 20
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pas encore de note</span>
                    )}
                  </div>

                  {/* Students tags preview */}
                  <div className="mt-3 flex flex-wrap gap-1 max-h-20 overflow-y-auto pr-1">
                    {cls.students.slice(0, 10).map((student, sidx) => (
                      <span
                        key={sidx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-white text-slate-700 border border-slate-200"
                      >
                        <UserCheck className="w-3 h-3 text-slate-400" />
                        {student}
                      </span>
                    ))}
                    {cls.students.length > 10 && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] bg-slate-200 text-slate-600 font-bold">
                        +{cls.students.length - 10} autres
                      </span>
                    )}
                    {cls.students.length === 0 && (
                      <span className="text-xs text-slate-400 italic">Aucun élève dans cette classe.</span>
                    )}
                  </div>
                </div>

                {/* Card Footer */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => onUseClassForCorrection(cls)}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
                    title="Pré-remplir la correction IA"
                  >
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    <span>Corriger avec l'IA</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedClassId(cls.id)}
                    className="inline-flex items-center gap-1.5 text-xs font-extrabold text-white bg-blue-600 hover:bg-blue-700 px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Entrer dans la classe</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
