import React, { useState, useMemo } from 'react';
import {
  History,
  Calendar,
  Trash2,
  BarChart2,
  CheckSquare,
  Square,
  FileText,
  Filter,
  Search,
  X,
  BookOpen,
  RotateCcw,
} from 'lucide-react';
import { SavedEvaluation } from '../types';

interface HistoriqueViewProps {
  evaluations: SavedEvaluation[];
  onDeleteEvaluation: (id: string) => void;
  onLoadEvaluation: (evaluation: SavedEvaluation) => void;
}

export const HistoriqueView: React.FC<HistoriqueViewProps> = ({
  evaluations,
  onDeleteEvaluation,
  onLoadEvaluation,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isComparing, setIsComparing] = useState(false);
  const [deletingEvalId, setDeletingEvalId] = useState<string | null>(null);
  const [selectedDiscipline, setSelectedDiscipline] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Extract distinct disciplines with their count
  const disciplineStats = useMemo(() => {
    const stats: Record<string, number> = {};
    evaluations.forEach((ev) => {
      const d = ev.discipline || 'Autre';
      stats[d] = (stats[d] || 0) + 1;
    });
    return stats;
  }, [evaluations]);

  const uniqueDisciplines = useMemo(() => {
    return Object.keys(disciplineStats).sort((a, b) => a.localeCompare(b));
  }, [disciplineStats]);

  // Filter evaluations based on selected discipline and search query
  const filteredEvaluations = useMemo(() => {
    return evaluations.filter((ev) => {
      const matchDiscipline =
        selectedDiscipline === 'ALL' || ev.discipline === selectedDiscipline;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        ev.title.toLowerCase().includes(q) ||
        (ev.discipline && ev.discipline.toLowerCase().includes(q)) ||
        (ev.level && ev.level.toLowerCase().includes(q));
      return matchDiscipline && matchSearch;
    });
  }, [evaluations, selectedDiscipline, searchQuery]);

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((item) => item !== id));
    } else {
      if (selectedIds.length >= 2) {
        setSelectedIds([selectedIds[1], id]);
      } else {
        setSelectedIds([...selectedIds, id]);
      }
    }
  };

  const evalA = evaluations.find((e) => e.id === selectedIds[0]);
  const evalB = evaluations.find((e) => e.id === selectedIds[1]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <History className="w-3.5 h-3.5" />
            Archives & Historique
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Historique des Évaluations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Consultez vos devoirs passés, réouvrez les tableaux de bord ou comparez les performances de deux sessions.
          </p>
        </div>

        {selectedIds.length === 2 && (
          <button
            type="button"
            onClick={() => setIsComparing(!isComparing)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <BarChart2 className="w-4 h-4" />
            <span>{isComparing ? 'Masquer la comparaison' : '⚖️ Comparer les 2 devoirs sélectionnés'}</span>
          </button>
        )}
      </div>

      {/* Comparison Drawer / Box */}
      {isComparing && evalA && evalB && (
        <div className="bg-white rounded-2xl border-2 border-indigo-300 p-6 shadow-md space-y-4 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <span>⚖️ Comparaison inter-évaluations</span>
            </h3>
            <button
              type="button"
              onClick={() => setIsComparing(false)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700"
            >
              Fermer
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Eval A */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-blue-700">Devoir 1</span>
                <span className="text-xs text-slate-400">{new Date(evalA.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">{evalA.title}</h4>
              <p className="text-xs text-slate-500">{evalA.discipline} • {evalA.level}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Moyenne</span>
                  <span className="text-xl font-black text-slate-900">{evalA.metrics.averageGrade}</span>
                  <span className="text-slate-400 text-[10px]"> / {evalA.maxGrade}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Taux réussite</span>
                  <span className="text-xl font-black text-blue-600">{evalA.metrics.successRate}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Note max</span>
                  <span className="text-xl font-black text-emerald-600">{evalA.metrics.highestGrade}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Note min</span>
                  <span className="text-xl font-black text-amber-600">{evalA.metrics.lowestGrade}</span>
                </div>
              </div>
            </div>

            {/* Eval B */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-700">Devoir 2</span>
                <span className="text-xs text-slate-400">{new Date(evalB.date).toLocaleDateString('fr-FR')}</span>
              </div>
              <h4 className="font-extrabold text-slate-900 text-base">{evalB.title}</h4>
              <p className="text-xs text-slate-500">{evalB.discipline} • {evalB.level}</p>

              <div className="grid grid-cols-2 gap-2 pt-2 text-xs">
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Moyenne</span>
                  <span className="text-xl font-black text-slate-900">{evalB.metrics.averageGrade}</span>
                  <span className="text-slate-400 text-[10px]"> / {evalB.maxGrade}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Taux réussite</span>
                  <span className="text-xl font-black text-blue-600">{evalB.metrics.successRate}%</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Note max</span>
                  <span className="text-xl font-black text-emerald-600">{evalB.metrics.highestGrade}</span>
                </div>
                <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                  <span className="text-slate-400 block text-[10px]">Note min</span>
                  <span className="text-xl font-black text-amber-600">{evalB.metrics.lowestGrade}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Evaluations List */}
      {evaluations.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-xs">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3">
            <History className="w-7 h-7" />
          </div>
          <h3 className="font-bold text-base text-slate-800">Aucune évaluation sauvegardée</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
            Lorsque vous finalisez la correction d'une série de copies, cliquez sur "Sauvegarder" pour la conserver ici.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Discipline Filter and Search Toolbar */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              {/* Search input */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher par titre de devoir, matière, classe..."
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-600 rounded-md cursor-pointer"
                    title="Effacer la recherche"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Reset filter button if any active filter */}
              {(selectedDiscipline !== 'ALL' || searchQuery.trim().length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDiscipline('ALL');
                    setSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Réinitialiser les filtres</span>
                </button>
              )}
            </div>

            {/* Discipline Filter Chips */}
            <div className="pt-2.5 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0 flex items-center gap-1 mr-1">
                <Filter className="w-3 h-3" />
                Discipline :
              </span>

              <button
                type="button"
                onClick={() => setSelectedDiscipline('ALL')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                  selectedDiscipline === 'ALL'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>Toutes</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                    selectedDiscipline === 'ALL'
                      ? 'bg-blue-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {evaluations.length}
                </span>
              </button>

              {uniqueDisciplines.map((discipline) => {
                const count = disciplineStats[discipline] || 0;
                const isActive = selectedDiscipline === discipline;

                return (
                  <button
                    key={discipline}
                    type="button"
                    onClick={() => setSelectedDiscipline(discipline)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold shrink-0 cursor-pointer transition-all flex items-center gap-1.5 ${
                      isActive
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <BookOpen className="w-3 h-3 opacity-70" />
                    <span>{discipline}</span>
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive
                          ? 'bg-blue-500 text-white'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>Cochez jusqu'à 2 devoirs pour les comparer côte à côte.</span>
            <span>
              {filteredEvaluations.length === evaluations.length
                ? `${evaluations.length} ${evaluations.length > 1 ? 'évaluations archivées' : 'évaluation archivée'}`
                : `${filteredEvaluations.length} sur ${evaluations.length} évaluation${evaluations.length > 1 ? 's' : ''}`}
            </span>
          </div>

          {filteredEvaluations.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <Filter className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-800">Aucune évaluation trouvée</h4>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  {selectedDiscipline !== 'ALL'
                    ? `Aucune évaluation archivée pour la discipline « ${selectedDiscipline} ».`
                    : 'Aucun devoir ne correspond à votre recherche.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedDiscipline('ALL');
                  setSearchQuery('');
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Réinitialiser les filtres</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredEvaluations.map((ev) => {
                const isSelected = selectedIds.includes(ev.id);

                return (
                <div
                  key={ev.id}
                  className={`bg-white rounded-2xl border p-5 shadow-xs transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                    isSelected ? 'border-indigo-500 bg-indigo-50/20' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3.5">
                    {/* Checkbox for comparison */}
                    <button
                      type="button"
                      onClick={() => toggleSelect(ev.id)}
                      className="mt-1 text-slate-400 hover:text-indigo-600 transition-colors cursor-pointer"
                      title="Sélectionner pour comparer"
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-indigo-600" />
                      ) : (
                        <Square className="w-5 h-5" />
                      )}
                    </button>

                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="font-extrabold text-slate-900 text-base">{ev.title}</h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          {ev.discipline}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                          {ev.level}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(ev.date).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{ev.submissions.length} copies</span>
                        {ev.teacherComments && (
                          <>
                            <span>•</span>
                            <span className="text-indigo-600 font-medium truncate max-w-xs">
                              "{ev.teacherComments.slice(0, 40)}..."
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Metrics and Action Buttons */}
                  <div className="flex items-center justify-between md:justify-end gap-6 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100">
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Moyenne</span>
                        <div className="text-xl font-black text-slate-900">
                          {ev.metrics.averageGrade}{' '}
                          <span className="text-xs font-semibold text-slate-400">/{ev.maxGrade}</span>
                        </div>
                      </div>
                      <div className="text-center">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Réussite</span>
                        <div className="text-xl font-black text-blue-600">
                          {ev.metrics.successRate}%
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => onLoadEvaluation(ev)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                        title="Réouvrir le tableau de bord, les fiches et l'export CSV"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Consulter</span>
                      </button>

                      {deletingEvalId === ev.id ? (
                        <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-xl px-2 py-1">
                          <button
                            type="button"
                            onClick={() => {
                              onDeleteEvaluation(ev.id);
                              setDeletingEvalId(null);
                            }}
                            className="text-xs font-bold text-rose-700 hover:text-rose-900 px-2 py-1 rounded bg-rose-100 cursor-pointer"
                          >
                            Supprimer
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingEvalId(null)}
                            className="text-xs text-slate-500 hover:text-slate-800 px-1.5 py-1 cursor-pointer"
                          >
                            Annuler
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDeletingEvalId(ev.id)}
                          className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                          title="Supprimer cette évaluation"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      )}
    </div>
  );
};
