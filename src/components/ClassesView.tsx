import React, { useState } from 'react';
import { Users, Plus, Trash2, Edit2, CheckCircle2, BookOpen, ArrowRight, UserCheck, AlertTriangle, X } from 'lucide-react';
import { ClassGroup } from '../types';

interface ClassesViewProps {
  classes: ClassGroup[];
  onClassesChange: (classes: ClassGroup[]) => void;
  onUseClassForCorrection: (classGroup: ClassGroup) => void;
  onSelectClass?: (classGroup: ClassGroup) => void;
}

export const ClassesView: React.FC<ClassesViewProps> = ({
  classes,
  onClassesChange,
  onUseClassForCorrection,
  onSelectClass,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [className, setClassName] = useState('');
  const [studentsInput, setStudentsInput] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingClassId, setDeletingClassId] = useState<string | null>(null);

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
    } else {
      const newClass: ClassGroup = {
        id: 'class_' + Date.now(),
        name: className.trim(),
        students: studentList,
        createdAt: new Date().toISOString(),
      };
      onClassesChange([newClass, ...classes]);
    }

    setClassName('');
    setStudentsInput('');
    setEditingId(null);
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
  };

  const totalStudents = classes.reduce((sum, c) => sum + c.students.length, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Gestion des listes d'élèves
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Mes Classes & Rosters
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Enregistrez vos classes pour pré-remplir instantanément les noms des élèves lors du dépôt des scans.
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
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Classes créées</span>
          <span className="text-3xl font-black text-slate-900 mt-1 block">{classes.length}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Élèves recensés</span>
          <span className="text-3xl font-black text-blue-600 mt-1 block">{totalStudents}</span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs col-span-2 sm:col-span-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">Moyenne par classe</span>
          <span className="text-3xl font-black text-emerald-600 mt-1 block">
            {classes.length ? Math.round(totalStudents / classes.length) : 0} <span className="text-sm font-semibold text-slate-400">élèves</span>
          </span>
        </div>
      </div>

      {/* New/Edit Class Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm animate-in fade-in duration-200 space-y-4">
          <h3 className="font-extrabold text-base text-slate-900">
            {editingId ? 'Modifier la classe' : 'Créer une nouvelle classe'}
          </h3>

          <form onSubmit={handleSaveClass} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom de la classe
              </label>
              <input
                type="text"
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder="Ex : 3ème B, Terminale Spé Maths, 4e 2..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                required
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
                placeholder="Lucas Martin&#10;Sarah Benali&#10;Thomas Leroy&#10;Emma Dubois..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              />
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
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold cursor-pointer shadow-xs"
              >
                Enregistrer la classe
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
            Créez une liste d'élèves pour la réutiliser à chaque évaluation et pré-remplir les copies sans ressaisie.
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
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between hover:border-slate-300 transition-all space-y-4"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div
                    onClick={() => onSelectClass && onSelectClass(cls)}
                    className="flex items-center gap-2.5 cursor-pointer group flex-1"
                  >
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                      {cls.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base group-hover:text-blue-600 transition-colors flex items-center gap-1.5">
                        <span>{cls.name}</span>
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-blue-600" />
                      </h3>
                      <span className="text-xs text-slate-400">
                        {cls.students.length} {cls.students.length > 1 ? 'élèves enregistrés' : 'élève enregistré'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    {onSelectClass && (
                      <button
                        type="button"
                        onClick={() => onSelectClass(cls)}
                        className="px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:text-blue-700 hover:bg-blue-50 border border-slate-200 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-1"
                        title="Ouvrir la fiche de classe et voir les moyennes"
                      >
                        <span>Ouvrir</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleEdit(cls)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                      title="Modifier la liste"
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

                {/* Students tags preview */}
                <div className="mt-3 flex flex-wrap gap-1 max-h-28 overflow-y-auto pr-1">
                  {cls.students.map((student, sidx) => (
                    <span
                      key={sidx}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] bg-slate-100 text-slate-700 border border-slate-200/70"
                    >
                      <UserCheck className="w-3 h-3 text-slate-400" />
                      {student}
                    </span>
                  ))}
                  {cls.students.length === 0 && (
                    <span className="text-xs text-slate-400 italic">Aucun élève dans cette classe.</span>
                  )}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  Créée le {new Date(cls.createdAt).toLocaleDateString('fr-FR')}
                </span>
                <button
                  type="button"
                  onClick={() => onUseClassForCorrection(cls)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                >
                  <span>Utiliser pour corriger</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
