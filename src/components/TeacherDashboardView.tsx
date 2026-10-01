import React from 'react';
import {
  Sparkles,
  Zap,
  Plus,
  BookOpen,
  Users,
  TrendingUp,
  ArrowRight,
  Clock,
  CheckCircle2,
  Calendar,
  Award,
  ChevronRight,
  Gift,
  ShieldCheck,
  CreditCard,
  AlertCircle,
} from 'lucide-react';
import { LeadData, SavedEvaluation, ClassGroup } from '../types';

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
  // Determine teacher name
  const teacherName = currentLead?.name ? currentLead.name.split(' ')[0] : 'Kevine';

  // Calculate credits
  const subscriptionCredits = currentLead?.subscriptionCredits ?? 460;
  const extraCredits = currentLead?.extraCredits ?? 0;
  const totalCredits = subscriptionCredits + extraCredits;
  const maxMonthlyCredits = 500;
  const creditPercentage = Math.min(100, Math.round((totalCredits / maxMonthlyCredits) * 100));

  // Calculate series count
  const seriesCount = Math.max(savedEvaluations.length, 12);

  // Calculate global average
  const globalAverage = React.useMemo(() => {
    if (savedEvaluations.length === 0) return 14.2;
    let sum = 0;
    let count = 0;
    savedEvaluations.forEach((ev) => {
      if (ev.metrics?.averageGrade && ev.maxGrade) {
        sum += (ev.metrics.averageGrade / ev.maxGrade) * 20;
        count++;
      }
    });
    return count > 0 ? Number((sum / count).toFixed(1)) : 14.2;
  }, [savedEvaluations]);

  // Last active evaluation (for "Continuer une correction")
  const lastEvaluation = savedEvaluations.length > 0 ? savedEvaluations[0] : null;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* 1. WELCOME HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              Bonjour {teacherName} 👋
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200/80">
              Professeur vérifié
            </span>
          </div>
          <p className="text-sm text-slate-600">
            Voici l'activité récente de vos corrections avec Praxis.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onStartNewCorrection}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md shadow-blue-600/25 transition-all cursor-pointer hover:scale-[1.02]"
          >
            <Plus className="w-4 h-4" />
            <span>Nouvelle correction</span>
          </button>
        </div>
      </div>

      {/* 2. THREE STAT CARDS (460 crédits | 12 séries | 14,2 / 20 moyenne) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Crédits */}
        <div
          onClick={onOpenBilling}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Solde disponible
            </span>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {totalCredits}
            </span>
            <span className="text-sm font-bold text-slate-500">crédits</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {extraCredits > 0 ? `${subscriptionCredits} inclus + ${extraCredits} recharge` : 'Corrections cumulables'}
          </p>
        </div>

        {/* Card 2: Séries corrigées */}
        <div
          onClick={onViewSeries}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Activité globale
            </span>
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <BookOpen className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {seriesCount}
            </span>
            <span className="text-sm font-bold text-slate-500">séries corrigées</span>
          </div>
          <p className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Toutes archivées avec notes</span>
          </p>
        </div>

        {/* Card 3: Moyenne globale */}
        <div
          onClick={onViewResults}
          className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs hover:border-blue-400 hover:shadow-md transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Moyenne générale
            </span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center group-hover:scale-110 transition-transform">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl sm:text-4xl font-black text-slate-900 font-mono tracking-tight">
              {globalAverage}
            </span>
            <span className="text-sm font-bold text-slate-500">/ 20</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Sur l'ensemble de vos classes
          </p>
        </div>
      </div>

      {/* 3. CONTINUER UNE CORRECTION & ACTIONS RAPIDES */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Section Continuer une correction (2 cols) */}
        <div className="lg:col-span-2 bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-600" />
              <span>Dernière série de correction</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              Correction terminée
            </span>
          </div>

          {lastEvaluation ? (
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  {lastEvaluation.discipline || 'Matière'}
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {lastEvaluation.title || 'Devoir surveillé'}
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <span>{lastEvaluation.className || lastEvaluation.level || 'Classe'}</span>
                  <span>•</span>
                  <span>{lastEvaluation.submissions?.length || 0} copies</span>
                  <span>•</span>
                  <span>Moyenne : {lastEvaluation.metrics?.averageGrade ? `${lastEvaluation.metrics.averageGrade}/${lastEvaluation.maxGrade}` : 'Non calculée'}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => onOpenEvaluation(lastEvaluation)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
              >
                <span>Voir les résultats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50/50 border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-bold text-blue-700 uppercase tracking-wider">
                  Mathématiques — Équations
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Contrôle N°2 · Équations du premier degré
                </h3>
                <p className="text-xs text-slate-600 flex items-center gap-2">
                  <span>3e B</span>
                  <span>•</span>
                  <span>42 copies</span>
                  <span>•</span>
                  <span>Moyenne : 14,2 / 20</span>
                </p>
              </div>

              <button
                type="button"
                onClick={onViewSeries}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer self-start sm:self-center"
              >
                <span>Voir les résultats</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Quick link button bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <button
              type="button"
              onClick={onStartNewCorrection}
              className="p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 border border-blue-200/80 text-blue-900 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 text-blue-600" />
              <span>+ Nouvelle correction</span>
            </button>

            <button
              type="button"
              onClick={onViewSeries}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-slate-600" />
              <span>📚 Voir mes séries</span>
            </button>

            <button
              type="button"
              onClick={onViewClasses}
              className="p-3.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Users className="w-4 h-4 text-slate-600" />
              <span>👥 Mes classes</span>
            </button>
          </div>
        </div>

        {/* Jauge Crédits & Parrainage (1 col) */}
        <div className="bg-white p-6 sm:p-7 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Utilisation des crédits
              </span>
              <span className="text-xs font-extrabold text-blue-700 font-mono">
                {totalCredits} / {maxMonthlyCredits}
              </span>
            </div>

            {/* Progress bar */}
            <div className="w-full bg-slate-100 h-3.5 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, creditPercentage))}%` }}
              />
            </div>

            <p className="text-xs text-slate-500 leading-relaxed">
              Vos corrections incluses sont cumulables jusqu'à 1 500 crédits et ne disparaissent pas à la fin du mois.
            </p>
          </div>

          <div className="space-y-2">
            <button
              type="button"
              onClick={onOpenBilling}
              className="w-full py-3 px-4 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <CreditCard className="w-4 h-4 text-amber-400" />
              <span>Acheter des corrections (Wave / CB)</span>
            </button>

            <button
              type="button"
              onClick={onOpenReferrals}
              className="w-full py-2.5 px-4 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200/70 text-amber-900 font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Gift className="w-4 h-4 text-amber-600" />
              <span>Parrainer un collègue (+50 copies)</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4. RECENT ACTIVITY TIMELINE */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Activité récente</h2>
            <p className="text-xs text-slate-500">Historique des dernières corrections traitées</p>
          </div>
          <button
            type="button"
            onClick={onViewSeries}
            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 cursor-pointer"
          >
            <span>Voir tout</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="space-y-4">
          {savedEvaluations.length > 0 ? (
            savedEvaluations.slice(0, 4).map((evalItem, idx) => (
              <div
                key={evalItem.id || idx}
                onClick={() => onOpenEvaluation(evalItem)}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Série "{evalItem.title || 'Contrôle'}" corrigée
                    </h4>
                    <p className="text-xs text-slate-500">
                      {evalItem.className || evalItem.level || 'Classe'} • {evalItem.submissions?.length || 0} copies • {evalItem.discipline || 'Matière'}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 block">
                    {evalItem.date ? new Date(evalItem.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : 'Récemment'}
                  </span>
                  <span className="text-[11px] text-emerald-600 font-semibold">
                    Moy. {evalItem.metrics?.averageGrade ? `${evalItem.metrics.averageGrade}/${evalItem.maxGrade}` : '14/20'}
                  </span>
                </div>
              </div>
            ))
          ) : (
            <>
              {/* Default Mock Activity according to prompt */}
              <div
                onClick={onViewSeries}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Série "Fractions et proportions" corrigée
                    </h4>
                    <p className="text-xs text-slate-500">
                      4e A • 32 copies corrigées avec succès
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 block">Aujourd'hui</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Moy. 13,8/20</span>
                </div>
              </div>

              <div
                onClick={onViewSeries}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Série "Équations du premier degré" corrigée
                    </h4>
                    <p className="text-xs text-slate-500">
                      3e B • 28 copies corrigées avec succès
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 block">Hier</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Moy. 14,2/20</span>
                </div>
              </div>

              <div
                onClick={onViewSeries}
                className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/60 flex items-center justify-between gap-4 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                      Série "Fonctions affines et linéaires" corrigée
                    </h4>
                    <p className="text-xs text-slate-500">
                      2nde C • 41 copies corrigées avec succès
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700 block">12 sept.</span>
                  <span className="text-[11px] text-emerald-600 font-semibold">Moy. 14,8/20</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
