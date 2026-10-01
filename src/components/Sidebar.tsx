import React from 'react';
import {
  GraduationCap,
  Sparkles,
  Home,
  PlusCircle,
  BookOpen,
  Users,
  BarChart3,
  CreditCard,
  Gift,
  Settings,
  HelpCircle,
  Zap,
  ArrowRight,
  Shield,
  X,
} from 'lucide-react';
import { MainView, LeadData } from '../types';

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
  // Credits calculation
  const subscriptionCredits = currentLead?.subscriptionCredits ?? 460;
  const extraCredits = currentLead?.extraCredits ?? 0;
  const totalCredits = subscriptionCredits + extraCredits;
  const maxMonthlyCredits = 500;
  const creditPercent = Math.min(100, Math.round((totalCredits / maxMonthlyCredits) * 100));

  const navItems = [
    {
      id: 'dashboard' as MainView,
      label: 'Accueil',
      icon: Home,
      badge: null,
      path: '/dashboard',
    },
    {
      id: 'corr' as MainView,
      label: 'Nouvelle correction',
      icon: PlusCircle,
      badge: null,
      highlight: true,
      path: '/series/new',
    },
    {
      id: 'hist' as MainView,
      label: 'Mes séries',
      icon: BookOpen,
      badge: savedEvalsCount > 0 ? savedEvalsCount : null,
      path: '/series',
    },
    {
      id: 'classes' as MainView,
      label: 'Mes classes',
      icon: Users,
      badge: classesCount > 0 ? classesCount : null,
      path: '/classes',
    },
    {
      id: 'suivi' as MainView,
      label: 'Résultats',
      icon: BarChart3,
      badge: null,
      path: '/results',
    },
    {
      id: 'pricing' as MainView,
      label: 'Abonnement & crédits',
      icon: CreditCard,
      badge: null,
      path: '/billing',
    },
    {
      id: 'referrals' as MainView,
      label: 'Parrainage',
      icon: Gift,
      badge: '+50',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      path: '/referrals',
    },
    {
      id: 'settings' as MainView,
      label: 'Paramètres',
      icon: Settings,
      badge: null,
      path: '/settings',
    },
  ];

  const handleItemClick = (viewId: MainView) => {
    onViewChange(viewId);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-xs lg:hidden transition-opacity"
        />
      )}

      {/* Main Persistent Sidebar */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-slate-100 flex flex-col justify-between border-r border-slate-800/90 shadow-2xl transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Top: Logo & Brand */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <button
            type="button"
            onClick={() => handleItemClick('dashboard')}
            className="flex items-center gap-3 text-left group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-blue-900/40 ring-1 ring-white/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-black text-lg tracking-wider text-white">
                  PRAXIS
                </span>
                <span className="px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 text-[10px] font-black border border-blue-500/30">
                  AI
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">Correction de copies IA</p>
            </div>
          </button>

          {/* Close button on mobile */}
          <button
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Center: Navigation Menu items (8 entries) */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-800">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer group ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-700/40'
                    : item.highlight
                    ? 'bg-blue-950/40 hover:bg-blue-900/50 text-blue-300 hover:text-white border border-blue-800/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${
                      item.badgeColor || (isActive ? 'bg-white/20 text-white border-white/30' : 'bg-slate-800 text-slate-300 border-slate-700')
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="pt-2 pb-1">
            <div className="h-px bg-slate-800" />
          </div>

          {/* Help & Support entry */}
          <button
            type="button"
            onClick={() => handleItemClick('faq')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
              activeView === 'faq'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/70'
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            <span>Aide & Support</span>
          </button>
        </div>

        {/* Bottom: Credits Widget (460 crédits ████████░░) */}
        <div className="p-3 m-3 bg-[#0A0F1D] border border-slate-800 rounded-2xl space-y-2.5 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
              <span className="text-xs font-extrabold text-white">
                {totalCredits} crédits
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              {creditPercent}%
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden p-0.5">
            <div
              className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(8, creditPercent))}%` }}
            />
          </div>

          {/* Don't show "Recharger" button if already on pricing view */}
          {activeView !== 'pricing' && (
            <button
              type="button"
              onClick={() => {
                onOpenBilling();
                onCloseMobile();
              }}
              className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow-xs transition-all cursor-pointer"
            >
              <span>+ Recharger (Wave / CB)</span>
            </button>
          )}
        </div>
      </aside>
    </>
  );
};
