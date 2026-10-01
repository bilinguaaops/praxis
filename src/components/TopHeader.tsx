import React, { useState, useRef, useEffect } from 'react';
import {
  Bell,
  User,
  LogOut,
  Settings,
  CreditCard,
  Gift,
  Shield,
  Menu,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Receipt,
  Sparkles,
  Phone,
  Moon,
  Sun,
  ArrowLeft,
} from 'lucide-react';
import { MainView, LeadData } from '../types';

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
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(3);

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

  const teacherName = currentLead?.name || 'Kevine';

  // Section title mapping
  const getSectionTitle = () => {
    switch (activeView) {
      case 'dashboard':
        return 'Accueil';
      case 'corr':
        if (currentStep === 1) return 'Correction · 1. Sujet, Corrigé & Barème';
        if (currentStep === 2) return 'Correction · 2. Dépôt des copies d\'élèves';
        if (currentStep === 3) return 'Correction · 3. Analyse & Notation IA';
        if (currentStep === 4) return 'Correction · 4. Révision des notes & commentaires';
        return 'Nouvelle correction de copies';
      case 'hist':
        return 'Mes séries de devoirs';
      case 'classes':
        return 'Mes classes & Élèves';
      case 'suivi':
        return 'Résultats & Suivi';
      case 'pricing':
        return 'Abonnement & Crédits';
      case 'referrals':
        return 'Parrainage collègues';
      case 'settings':
        return 'Paramètres';
      case 'faq':
        return 'Aide & Guide pédagogique';
      case 'admin':
        return 'Administration plateforme';
      default:
        return 'Espace Enseignant';
    }
  };

  const getBackTooltip = () => {
    if (activeView === 'corr') {
      if (currentStep === 2) return 'Retour à l\'étape 1 : Sujet, corrigé & barème';
      if (currentStep === 3) return 'Retour à l\'étape 2 : Dépôt des copies';
      if (currentStep === 4) return 'Retour à l\'étape 2 : Sélection des copies';
      return 'Retour au tableau de bord';
    }
    return 'Revenir en arrière';
  };

  const handleMarkAllRead = () => {
    setUnreadNotifsCount(0);
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between shadow-xs">
      {/* Left: Mobile Hamburger, Back button & Page Context */}
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={onOpenMobileSidebar}
          className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
          aria-label="Ouvrir le menu de navigation"
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
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 transition-colors cursor-pointer"
            title={getBackTooltip()}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Retour</span>
          </button>
        )}

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400 hidden sm:inline">Praxis /</span>
          <h1 className="text-sm sm:text-base font-extrabold text-slate-900 tracking-tight">
            {getSectionTitle()}
          </h1>
        </div>
      </div>

      {/* Right: Quick actions, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Support WhatsApp quick button */}
        <button
          type="button"
          onClick={onOpenContactModal}
          className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 text-emerald-800 text-xs font-bold transition-colors cursor-pointer"
        >
          <Phone className="w-3.5 h-3.5 text-emerald-600" />
          <span>Support 7j/7</span>
        </button>

        {/* Admin Switcher (Discrete toggle as requested in #19) */}
        <button
          type="button"
          onClick={() => onViewChange(activeView === 'admin' ? 'dashboard' : 'admin')}
          className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${
            activeView === 'admin'
              ? 'bg-purple-100 text-purple-900 border-purple-300'
              : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
          }`}
          title="Basculer vers l'espace administrateur / professeur"
        >
          <Shield className="w-3.5 h-3.5 text-purple-600" />
          <span className="hidden md:inline">{activeView === 'admin' ? 'Vue Professeur' : 'Admin'}</span>
        </button>

        {/* 🔔 Notifications Popover (#15) */}
        <div className="relative" ref={notifRef}>
          <button
            type="button"
            onClick={() => setIsNotifOpen(!isNotifOpen)}
            className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Voir les notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-rose-600 text-white rounded-full text-[10px] font-black flex items-center justify-center ring-2 ring-white">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown Panel */}
          {isNotifOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="font-extrabold text-sm text-slate-900">Notifications</span>
                  {unreadNotifsCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 text-rose-700 font-bold">
                      {unreadNotifsCount} nouvelles
                    </span>
                  )}
                </div>
                {unreadNotifsCount > 0 && (
                  <button
                    type="button"
                    onClick={handleMarkAllRead}
                    className="text-[11px] font-bold text-blue-600 hover:text-blue-800 cursor-pointer"
                  >
                    Tout marquer comme lu
                  </button>
                )}
              </div>

              <div className="space-y-2 text-xs">
                {/* Notif 1 */}
                <div
                  onClick={() => {
                    onViewChange('hist');
                    setIsNotifOpen(false);
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 transition-colors cursor-pointer flex gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Votre correction "Équations" est terminée.
                    </span>
                    <span className="text-[11px] text-slate-500">Il y a 12 min · 42 copies notées</span>
                  </div>
                </div>

                {/* Notif 2 */}
                <div
                  onClick={() => {
                    onViewChange('pricing');
                    setIsNotifOpen(false);
                  }}
                  className="p-3 rounded-xl bg-amber-50/60 hover:bg-amber-100/60 border border-amber-200/60 transition-colors cursor-pointer flex gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Attention : il vous reste 30 corrections.
                    </span>
                    <span className="text-[11px] text-slate-500">Hier · Rechargez par Wave ou Carte</span>
                  </div>
                </div>

                {/* Notif 3 */}
                <div
                  onClick={() => {
                    onViewChange('pricing');
                    setIsNotifOpen(false);
                  }}
                  className="p-3 rounded-xl bg-slate-50 hover:bg-blue-50/70 border border-slate-100 transition-colors cursor-pointer flex gap-3"
                >
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                    <Receipt className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block">
                      Paiement de 5 000 FCFA confirmé.
                    </span>
                    <span className="text-[11px] text-slate-500">2 sept. · +500 corrections ajoutées</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 👤 Teacher Profile Dropdown (#18) */}
        <div className="relative" ref={profileRef}>
          {currentLead ? (
            <button
              type="button"
              onClick={() => setIsProfileOpen(!isProfileOpen)}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-2xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-black text-xs flex items-center justify-center shadow-xs">
                {teacherName.charAt(0).toUpperCase()}
              </div>
              <div className="text-left hidden sm:block">
                <span className="text-xs font-bold text-slate-900 block leading-none">
                  {teacherName}
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Professeur</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onOpenLoginModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 text-white font-bold text-xs hover:bg-blue-500 shadow-xs cursor-pointer transition-colors"
            >
              <User className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          )}

          {/* Profile Dropdown Menu */}
          {isProfileOpen && currentLead && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-1 animate-in fade-in slide-in-from-top-2 duration-150 z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-extrabold text-slate-900">{currentLead.name || 'Kevine'}</p>
                <p className="text-[11px] text-slate-500 truncate">{currentLead.email || 'professeur@praxis.edu'}</p>
                <div className="mt-1.5 inline-block px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  {(currentLead.subscriptionCredits ?? 460) + (currentLead.extraCredits ?? 0)} crédits disponibles
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  onViewChange('settings');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <Settings className="w-4 h-4 text-slate-500" />
                <span>Paramètres</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('pricing');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <CreditCard className="w-4 h-4 text-slate-500" />
                <span>Abonnement & Crédits</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onViewChange('referrals');
                  setIsProfileOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer text-left"
              >
                <Gift className="w-4 h-4 text-amber-500" />
                <span>Parrainage (+50 copies)</span>
              </button>

              <div className="h-px bg-slate-100 my-1" />

              <button
                type="button"
                onClick={() => {
                  setIsProfileOpen(false);
                  onLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer text-left"
              >
                <LogOut className="w-4 h-4" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
