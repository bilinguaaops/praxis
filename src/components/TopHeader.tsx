import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  User,
  LogOut,
  Settings,
  CreditCard,
  Gift,
  Menu,
  ChevronDown,
  Phone,
  ArrowLeft,
  Sun,
  Moon,
} from 'lucide-react';
import { MainView, LeadData } from '../types';
import { useTheme } from '../lib/useTheme';

interface TopHeaderProps {
  activeView: MainView;
  currentStep?: number;
  onViewChange: (view: MainView) => void;
  currentLead: LeadData | null;
  onOpenMobileSidebar: () => void;
  onLogout: () => void;
  onOpenLoginModal: () => void;
  onOpenContactModal: () => void;
  onOpenBilling: () => void;
  onBack?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeView,
  currentStep = 1,
  onViewChange,
  currentLead,
  onOpenMobileSidebar,
  onLogout,
  onOpenLoginModal,
  onOpenContactModal,
  onOpenBilling,
  onBack,
}) => {
  const { isDark, toggleTheme } = useTheme();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(1);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const teacherName = currentLead?.name || 'Professeur';

  // Section title mapping
  const getSectionTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Accueil';
      case 'corr':
        if (currentStep === 1) return 'Nouvelle correction · Sujet & Barème';
        if (currentStep === 2) return 'Nouvelle correction · Dépôt des copies';
        if (currentStep === 3) return 'Nouvelle correction · Traitement';
        if (currentStep === 4) return 'Nouvelle correction · Révision des notes';
        return 'Nouvelle correction';
      case 'hist':
        return 'Mes séries de devoirs';
      case 'classes':
        return 'Mes classes & Élèves';
      case 'suivi':
        return 'Résultats & Suivi';
      case 'pricing':
        return 'Abonnement & Crédits';
      case 'referrals':
        return 'Programme de parrainage';
      case 'settings':
        return 'Paramètres du compte';
      case 'faq':
        return 'Aide & Support';
      case 'admin':
        return 'Administration';
      default:
        return 'Espace Enseignant';
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FAFAF8]/95 dark:bg-[#0F141C]/95 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between transition-colors">
      {/* Left: Mobile Hamburger, Back button & Page Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          aria-label="Ouvrir le menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        {activeView !== 'dashboard' && (
          <button
            type="button"
            onClick={() => {
              if (onBack) {
                onBack();
              } else if (window.history.length > 1) {
                window.history.back();
              } else {
                onViewChange('dashboard');
              }
            }}
            className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer"
            title="Revenir en arrière"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retour</span>
          </button>
        )}

        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-slate-500 hidden sm:inline">Praxis /</span>
          <h1 className="font-semibold text-slate-900 dark:text-white tracking-tight">
            {getSectionTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Support, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Support contact button */}
        <button
          type="button"
          onClick={onOpenContactModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white text-xs font-medium transition-colors cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-slate-500" />
          <span>Support</span>
        </button>

        {/* Theme Toggle (Light / Dark) */}
        <button
          type="button"
          onClick={toggleTheme}
          id="btn-header-theme-toggle"
          className="p-1.5 sm:px-2.5 sm:py-1 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium transition-colors cursor-pointer flex items-center gap-1.5"
          title={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
          aria-label={isDark ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {isDark ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden md:inline">Clair</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden md:inline">Sombre</span>
            </>
          )}
        </button>

        {/* Notifications Popover */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-1.5 rounded-md text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Voir les notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-blue-600 rounded-full" />
            )}
          </button>

          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-3 space-y-2 z-50 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="font-semibold text-slate-900 dark:text-white">Notifications</span>
                {unreadNotifsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setUnreadNotifsCount(0)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    Marquer tout comme lu
                  </button>
                )}
              </div>

              <div className="space-y-1.5 pt-1">
                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300">
                  <p className="font-medium text-slate-900 dark:text-slate-100">Bienvenue sur Praxis</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Vos 50 corrections d'essai sont prêtes. Vous pouvez lancer votre premier devoir.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          {currentLead ? (
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <div className="w-7 h-7 rounded-md bg-slate-800 text-white font-medium text-xs flex items-center justify-center">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <span className="text-xs font-medium text-slate-800 dark:text-slate-200 hidden sm:inline">
                {teacherName}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-medium text-xs hover:bg-slate-800 dark:hover:bg-slate-100 cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          )}

          {/* Profile Dropdown Menu */}
          {isProfileOpen && currentLead && (
            <div className="absolute right-0 mt-2 w-60 bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 p-2 space-y-1 z-50 text-xs">
              <div className="px-2.5 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="font-semibold text-slate-900 dark:text-white truncate">{teacherName}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{currentLead.email}</p>
                <div className="mt-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                  {(currentLead.subscriptionCredits ?? 50) + (currentLead.extraCredits ?? 0)} corrections disponibles
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onViewChange('settings');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
              >
                <Settings className="w-3.5 h-3.5 text-slate-400" />
                <span>Paramètres</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('pricing');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
              >
                <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                <span>Abonnement & Crédits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('referrals');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors cursor-pointer"
              >
                <Gift className="w-3.5 h-3.5 text-slate-400" />
                <span>Parrainage (+50)</span>
              </button>

              <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded-md text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 text-left transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
