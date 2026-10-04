import React from 'react';
import {
  GraduationCap,
  Home,
  Plus,
  BookOpen,
  Users,
  BarChart3,
  CreditCard,
  Gift,
  Settings,
  HelpCircle,
  X,
  ChevronRight,
  User,
  Sun,
  Moon,
} from 'lucide-react';
import { MainView, LeadData } from '../types';
import { useTheme } from '../lib/useTheme';

interface SidebarProps {
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  currentLead: LeadData | null;
  savedEvalsCount: number;
  classesCount: number;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
  onOpenBilling: () => void;
}

interface NavItem {
  id: MainView;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number | null;
  highlight?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  onViewChange,
  currentLead,
  savedEvalsCount,
  classesCount,
  isOpenMobile,
  onCloseMobile,
  onOpenBilling,
}) => {
  const { isDark, toggleTheme } = useTheme();
  // Credits calculation
  const subscriptionCredits = currentLead?.subscriptionCredits ?? 50;
  const extraCredits = currentLead?.extraCredits ?? 0;
  const totalCredits = subscriptionCredits + extraCredits;
  const maxMonthlyCredits = 500;
  const creditPercent = Math.min(100, Math.round((totalCredits / maxMonthlyCredits) * 100));

  const teacherName = currentLead?.name || 'Professeur';
  const teacherEmail = currentLead?.email || '';

  const mainSectionItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Accueil',
      icon: Home,
    },
    {
      id: 'corr',
      label: 'Nouvelle correction',
      icon: Plus,
      highlight: true,
    },
    {
      id: 'hist',
      label: 'Mes séries',
      icon: BookOpen,
      badge: savedEvalsCount > 0 ? savedEvalsCount : null,
    },
    {
      id: 'classes',
      label: 'Mes classes',
      icon: Users,
      badge: classesCount > 0 ? classesCount : null,
    },
    {
      id: 'suivi',
      label: 'Résultats',
      icon: BarChart3,
    },
  ];

  const billingSectionItems: NavItem[] = [
    {
      id: 'pricing',
      label: 'Abonnement & crédits',
      icon: CreditCard,
    },
    {
      id: 'referrals',
      label: 'Parrainage',
      icon: Gift,
      badge: '+50',
    },
  ];

  const systemSectionItems: NavItem[] = [
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
    },
    {
      id: 'faq',
      label: 'Aide & Support',
      icon: HelpCircle,
    },
  ];

  const handleItemClick = (viewId: MainView) => {
    onViewChange(viewId);
    onCloseMobile();
  };

  const renderNavGroup = (items: NavItem[]) => (
    <div className="space-y-0.5">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeView === item.id;

        return (
          <button
            key={item.id}
            type="button"
            onClick={() => handleItemClick(item.id)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs transition-colors duration-150 cursor-pointer select-none ${
              isActive
                ? 'bg-slate-800 text-white font-medium border-l-2 border-blue-500 pl-2.5'
                : item.highlight
                ? 'text-blue-300 hover:text-white hover:bg-slate-800/60 font-medium'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 font-normal'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <Icon
                className={`w-4 h-4 shrink-0 ${
                  isActive
                    ? 'text-blue-400'
                    : item.highlight
                    ? 'text-blue-400'
                    : 'text-slate-500'
                }`}
              />
              <span className="truncate">{item.label}</span>
            </div>

            {item.badge !== undefined && item.badge !== null && (
              <span
                className={`ml-2 px-1.5 py-0.5 rounded text-[10px] tabular-nums font-medium ${
                  isActive
                    ? 'bg-slate-700 text-slate-200'
                    : item.badge === '+50'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                    : 'bg-slate-800 text-slate-400 border border-slate-700/60'
                }`}
              >
                {item.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Main Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#111722] text-slate-100 flex flex-col justify-between border-r border-slate-800/80 transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 border-b border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleItemClick('dashboard')}
            className="flex items-center gap-2.5 text-left group cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm tracking-wide text-white block leading-none">
                PRAXIS
              </span>
              <span className="text-[11px] text-slate-400 font-normal leading-tight">
                Correction de copies
              </span>
            </div>
          </button>

          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Sections */}
        <div className="flex-1 px-3 py-4 space-y-5 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1.5">
              Espace de travail
            </div>
            {renderNavGroup(mainSectionItems)}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1.5">
              Formules & Accès
            </div>
            {renderNavGroup(billingSectionItems)}
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-1.5">
              Système
            </div>
            {renderNavGroup(systemSectionItems)}
          </div>
        </div>

        {/* Footer: Solde & User Profile */}
        <div className="p-3 border-t border-slate-800/80 space-y-3 bg-[#0D121B]">
          {/* Solde de corrections */}
          <div className="px-2.5 py-2 rounded-lg bg-slate-900/90 border border-slate-800 space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-medium">Corrections</span>
              <span className="text-slate-200 font-semibold tabular-nums">
                {totalCredits} disponibles
              </span>
            </div>

            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-blue-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(5, creditPercent))}%` }}
              />
            </div>

            {activeView !== 'pricing' && (
              <button
                type="button"
                onClick={() => {
                  onOpenBilling();
                  onCloseMobile();
                }}
                className="w-full pt-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Acheter des corrections</span>
                <span>→</span>
              </button>
            )}
          </div>

          {/* User Preview */}
          <div
            onClick={() => handleItemClick('settings')}
            className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 text-xs font-semibold">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-medium text-slate-200 truncate leading-none">
                  {teacherName}
                </div>
                <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                  {teacherEmail || 'Enseignant'}
                </div>
              </div>
            </div>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500 shrink-0" />
          </div>

          {/* Quick Theme Toggle Button */}
          <button
            type="button"
            onClick={toggleTheme}
            id="btn-sidebar-theme-toggle"
            className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 text-xs font-medium transition-colors cursor-pointer"
            title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          >
            <div className="flex items-center gap-2">
              {isDark ? (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              ) : (
                <Moon className="w-3.5 h-3.5 text-slate-400" />
              )}
              <span>{isDark ? 'Mode clair' : 'Mode sombre'}</span>
            </div>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-mono">
              {isDark ? 'Nuit' : 'Jour'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};
