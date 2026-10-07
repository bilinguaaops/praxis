import React from 'react';
import {
  Plus,
  BookOpen,
  ArrowRight,
  ChevronRight,
  TrendingUp,
  CreditCard,
  Users,
  Sparkles,
  FileCheck2,
  Calendar,
  Layers,
} from 'lucide-react';
import { LeadData, SavedEvaluation, ClassGroup } from '../types';
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Separator } from './ui';

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

  // Credits calculation (Garantie de 50 crédits d'essai offerts pour tout nouvel enseignant)
  const isTrial = !currentLead?.plan || currentLead.plan === 'trial' || currentLead.plan === 'free';
  const rawSubCredits = currentLead?.subscriptionCredits ?? 50;
  const copiesUsed = currentLead?.copiesCorrected ?? 0;
  const subscriptionCredits = isTrial && rawSubCredits <= 30
    ? Math.max(0, 50 - copiesUsed)
    : rawSubCredits;
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
  const recentEvaluations = savedEvaluations.slice(0, 5);

  return (
    <div className="space-y-8 max-w-5xl mx-auto animate-in fade-in duration-200">
      {/* 1. EN-TÊTE ÉDITORIAL AVEC ACTION PRINCIPALE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">
            <span>Espace enseignant</span>
            <span aria-hidden="true">·</span>
            <span>{currentLead?.school || 'Établissement académique'}</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bonjour, {teacherName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Suivi centralisé de vos copies, barèmes et évaluations par IA Vision.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="md"
            onClick={onStartNewCorrection}
            className="shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle correction</span>
          </Button>
        </div>
      </div>

      {/* 2. STATISTIQUES MÉTIER (METRICS CARDS ANTI-SLOP) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* CARTE 1: SOLDE DE CORRECTIONS */}
        <div
          onClick={onOpenBilling}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-blue-400/80 dark:hover:border-blue-500/50 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Corrections disponibles</span>
            <span className="text-[11px] text-blue-600 dark:text-blue-400 group-hover:underline">
              Gérer →
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {totalCredits}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">restantes</span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>{isTrial ? 'Formule d’essai' : 'Abonnement actif'}</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {copiesUsed} corrigée{copiesUsed > 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* CARTE 2: SÉRIES CORRIGÉES */}
        <div
          onClick={onViewSeries}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Séries de devoirs</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
              Historique →
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {seriesCount}
            </span>
            <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              {seriesCount > 1 ? 'séries archivées' : 'série archivée'}
            </span>
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Dernière analyse</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
              {lastEvaluation?.title || 'Aucune'}
            </span>
          </div>
        </div>

        {/* CARTE 3: MOYENNE GÉNÉRALE */}
        <div
          onClick={onViewResults}
          className="p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/70 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer shadow-xs group"
        >
          <div className="flex items-center justify-between text-xs font-medium text-slate-500 dark:text-slate-400">
            <span>Moyenne générale</span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white">
              Rapports →
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums tracking-tight">
              {globalAverage !== null ? `${globalAverage}` : '—'}
            </span>
            {globalAverage !== null && (
              <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">/ 20</span>
            )}
          </div>
          <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
            <span>Indicateur global</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {globalAverage !== null
                ? globalAverage >= 12
                  ? 'Niveau satisfaisant'
                  : 'Soutien recommandé'
                : 'En attente'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. SECTION DERNIÈRE SÉRIE DE CORRECTION */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Dernière série de correction
            </h2>
          </div>
          {seriesCount > 0 && (
            <button
              type="button"
              onClick={onViewSeries}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
            >
              Consulter tout l'historique ({seriesCount}) →
            </button>
          )}
        </div>

        {lastEvaluation ? (
          <div className="p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="space-y-1.5 min-w-0">
              <div className="flex items-center gap-2 text-xs">
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {lastEvaluation.discipline || 'Matière'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-600 dark:text-slate-400">
                  {lastEvaluation.className || lastEvaluation.level || 'Niveau non précisé'}
                </span>
                <span className="text-slate-300 dark:text-slate-700">·</span>
                <span className="text-slate-500 dark:text-slate-400">
                  {new Date(lastEvaluation.createdAt).toLocaleDateString('fr-FR')}
                </span>
              </div>

              <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate">
                {lastEvaluation.title || 'Devoir surveillé'}
              </h3>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 dark:text-slate-400 pt-1">
                <span>
                  <strong>{lastEvaluation.submissions?.length || 0}</strong> copies traitées
                </span>
                <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                <span>
                  Moyenne :{' '}
                  <strong className="text-slate-900 dark:text-white tabular-nums">
                    {lastEvaluation.metrics?.averageGrade !== undefined
                      ? `${lastEvaluation.metrics.averageGrade} / ${lastEvaluation.maxGrade}`
                      : 'Calculée'}
                  </strong>
                </span>
                {lastEvaluation.metrics?.highestGrade !== undefined && (
                  <>
                    <span aria-hidden="true" className="text-slate-300 dark:text-slate-700">·</span>
                    <span>
                      Max : <strong className="text-emerald-600 dark:text-emerald-400 tabular-nums">{lastEvaluation.metrics.highestGrade}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <Button
                variant="outline"
                size="md"
                onClick={() => onOpenEvaluation(lastEvaluation)}
                className="w-full sm:w-auto"
              >
                <span>Accéder aux copies</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        ) : (
          <div className="p-8 sm:p-10 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 text-center space-y-3.5">
            <div className="w-11 h-11 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center mx-auto border border-blue-100 dark:border-blue-900/50">
              <BookOpen className="w-5 h-5" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Aucune série de devoirs corrigée pour le moment
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Importez vos copies manuscrites et définissez votre barème pour lancer une première correction assistée par IA Vision.
              </p>
            </div>
            <Button
              variant="primary"
              size="md"
              onClick={onStartNewCorrection}
              className="mt-2"
            >
              <Plus className="w-4 h-4" />
              <span>Démarrer une correction</span>
            </Button>
          </div>
        )}
      </div>

      {/* 4. SÉRIES RÉCENTES (TABLEAU ÉDITORIAL SOBRE) */}
      {recentEvaluations.length > 1 && (
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
              Séries récentes
            </h2>
            <button
              type="button"
              onClick={onViewSeries}
              className="text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            >
              Voir tout ({seriesCount})
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80 shadow-xs">
            {recentEvaluations.map((evalItem) => (
              <div
                key={evalItem.id}
                onClick={() => onOpenEvaluation(evalItem)}
                className="p-4 sm:px-5 flex items-center justify-between hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors cursor-pointer text-xs group"
              >
                <div className="space-y-1 min-w-0 pr-4">
                  <div className="font-bold text-slate-900 dark:text-white truncate text-sm">
                    {evalItem.title || 'Devoir'}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-2">
                    <span className="font-medium text-slate-700 dark:text-slate-300">
                      {evalItem.discipline || 'Matière'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{evalItem.className || evalItem.level || 'Classe'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{evalItem.submissions?.length || 0} copies</span>
                    <span aria-hidden="true">·</span>
                    <span>{new Date(evalItem.createdAt).toLocaleDateString('fr-FR')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  {evalItem.metrics?.averageGrade !== undefined && (
                    <div className="text-right">
                      <span className="font-bold text-slate-900 dark:text-white tabular-nums text-sm">
                        {evalItem.metrics.averageGrade}
                      </span>
                      <span className="text-[11px] text-slate-400"> / {evalItem.maxGrade}</span>
                    </div>
                  )}
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. ACCÈS RAPIDES & GESTION DE CLASSE */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
        <div
          onClick={onViewClasses}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between text-xs shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                Mes classes et élèves
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {classes.length} classe{classes.length > 1 ? 's' : ''} configurée{classes.length > 1 ? 's' : ''} pour les barèmes automatiques
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
        </div>

        <div
          onClick={onOpenReferrals}
          className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:border-slate-300 dark:hover:border-slate-700 transition-all cursor-pointer flex items-center justify-between text-xs shadow-xs group"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-100 dark:border-emerald-900/40">
              <CreditCard className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 dark:text-white block text-sm">
                Programme de parrainage
              </span>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                Recevez +50 corrections gratuites pour chaque collègue abonné
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors" />
        </div>
      </div>
    </div>
  );
};
