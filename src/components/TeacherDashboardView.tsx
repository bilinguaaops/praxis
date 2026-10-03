import React from 'react';
import {
  Plus,
  BookOpen,
  ArrowRight,
  Clock,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Users,
} from 'lucide-react';
import { LeadData, SavedEvaluation, ClassGroup } from '../types';
import { Button } from './ui/Button';
import { Badge } from './ui/Badge';

interface TeacherDashboardViewProps {
  currentLead: LeadData | null;
  savedEvaluations: SavedEvaluation[];
  classes: ClassGroup[];
  onStartNewCorrection: () => void;
  onViewSeries: () => void;
  onViewClasses: () => void;
  onViewResults: () => void;
  onOpenBilling: () => void;
  onOpenReferrals: () => void;
  onOpenEvaluation: (evaluation: SavedEvaluation) => void;
}

export const TeacherDashboardView: React.FC<TeacherDashboardViewProps> = ({
  currentLead,
  savedEvaluations,
  classes,
  onStartNewCorrection,
  onViewSeries,
  onViewClasses,
  onViewResults,
  onOpenBilling,
  onOpenReferrals,
  onOpenEvaluation,
}) => {
  const teacherName = currentLead?.name ? currentLead.name.split(' ')[0] : 'Professeur';

  // Credits calculation
  const subscriptionCredits = currentLead?.subscriptionCredits ?? 50;
  const extraCredits = currentLead?.extraCredits ?? 0;
  const totalCredits = subscriptionCredits + extraCredits;

  const seriesCount = savedEvaluations.length;

  // Global average
  const globalAverage = React.useMemo(() => {
    if (savedEvaluations.length === 0) return null;
    let sum = 0;
    let count = 0;
    savedEvaluations.forEach((ev) => {
      if (ev.metrics?.averageGrade && ev.maxGrade) {
        sum += (ev.metrics.averageGrade / ev.maxGrade) * 20;
        count++;
      }
    });
    return count > 0 ? Number((sum / count).toFixed(1)) : null;
  }, [savedEvaluations]);

  const lastEvaluation = savedEvaluations.length > 0 ? savedEvaluations[0] : null;
  const recentEvaluations = savedEvaluations.slice(0, 4);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-150">
      {/* 1. EDITORIAL HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bonjour, {teacherName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Espace de travail et suivi de vos corrections de devoirs.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={onStartNewCorrection}
            className="shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle correction</span>
          </Button>
        </div>
      </div>

      {/* 2. STATISTIQUES UTILES (MINIMALIST ROW, NO GLOW) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={onOpenBilling}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Corrections disponibles
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {totalCredits}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">restantes</span>
          </div>
          <div className="text-[11px] text-blue-600 dark:text-blue-400 mt-1 flex items-center gap-1 font-medium">
            <span>Gérer l'abonnement</span>
            <span>→</span>
          </div>
        </div>

        <div
          onClick={onViewSeries}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Séries corrigées
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {seriesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {seriesCount > 1 ? 'devoirs' : 'devoir'}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Archivées dans l'historique
          </div>
        </div>

        <div
          onClick={onViewResults}
          className="p-4 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer"
        >
          <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            Moyenne générale calculée
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
              {globalAverage !== null ? `${globalAverage}` : '—'}
            </span>
            {globalAverage !== null && (
              <span className="text-xs text-slate-500 dark:text-slate-400">/ 20</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {globalAverage !== null ? 'Sur l’ensemble des séries' : 'En attente de devoirs'}
          </div>
        </div>
      </div>

      {/* 3. DERNIÈRE CORRECTION OU ÉTAT VIDE */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Dernière série de correction
          </h2>
          {seriesCount > 0 && (
            <button
              type="button"
              onClick={onViewSeries}
              className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Consulter l'historique complet →
            </button>
          )}
        </div>

        {lastEvaluation ? (
          <div className="p-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                  {lastEvaluation.discipline || 'Matière'}
                </span>
                <span className="text-slate-300 dark:text-slate-600">·</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {lastEvaluation.className || lastEvaluation.level || 'Classe non précisée'}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                {lastEvaluation.title || 'Devoir surveillé'}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-3 pt-1">
                <span>{lastEvaluation.submissions?.length || 0} copies corrigées</span>
                <span>·</span>
                <span>
                  Moyenne :{' '}
                  <strong className="text-slate-800 dark:text-slate-200">
                    {lastEvaluation.metrics?.averageGrade
                      ? `${lastEvaluation.metrics.averageGrade} / ${lastEvaluation.maxGrade}`
                      : 'Non calculée'}
                  </strong>
                </span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenEvaluation(lastEvaluation)}
              className="self-start sm:self-center"
            >
              <span>Accéder aux copies</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        ) : (
          <div className="p-8 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 text-center space-y-3">
            <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center mx-auto">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                Aucune série de devoirs pour le moment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                Importez vos copies manuscrites et définissez votre barème pour lancer une première correction assistée.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={onStartNewCorrection}>
              <Plus className="w-3.5 h-3.5" />
              <span>Démarrer une correction</span>
            </Button>
          </div>
        )}
      </div>

      {/* 4. LISTE DES SÉRIES RÉCENTES (TABLE FORMAT) */}
      {recentEvaluations.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Séries récentes
            </h2>
            <button
              type="button"
              onClick={onViewSeries}
              className="text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Voir tout ({seriesCount})
            </button>
          </div>

          <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800">
            {recentEvaluations.map((evalItem) => (
              <div
                key={evalItem.id}
                onClick={() => onOpenEvaluation(evalItem)}
                className="p-3.5 sm:px-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-xs"
              >
                <div className="space-y-0.5 min-w-0 pr-4">
                  <div className="font-semibold text-slate-900 dark:text-white truncate">
                    {evalItem.title || 'Devoir'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span>{evalItem.discipline || 'Matière'}</span>
                    <span>·</span>
                    <span>{evalItem.className || evalItem.level || 'Classe'}</span>
                    <span>·</span>
                    <span>{evalItem.submissions?.length || 0} copies</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {evalItem.metrics?.averageGrade && (
                    <span className="font-semibold text-slate-700 dark:text-slate-300 tabular-nums">
                      {evalItem.metrics.averageGrade} / {evalItem.maxGrade}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ACCÈS RAPIDES UTILES */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
        <div
          onClick={onViewClasses}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2.5">
            <Users className="w-4 h-4 text-slate-500" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">Mes classes et élèves</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">{classes.length} classes configurées</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        <div
          onClick={onOpenReferrals}
          className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-colors cursor-pointer flex items-center justify-between text-xs"
        >
          <div className="flex items-center gap-2.5">
            <CreditCard className="w-4 h-4 text-slate-500" />
            <div>
              <span className="font-semibold text-slate-900 dark:text-white block">Programme de parrainage</span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">+50 corrections par collègue abonné</span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>
      </div>
    </div>
  );
};
