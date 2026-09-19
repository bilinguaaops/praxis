import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GraduationCap,
  CheckCircle2,
  RotateCcw,
  FileText,
  BarChart3,
  UploadCloud,
  Settings2,
  Users,
  TrendingUp,
  History,
  Sun,
  Moon,
  HelpCircle,
  User,
  LogOut,
  UserCheck,
  Phone,
  Mail,
  Menu,
  X,
  ChevronRight,
} from 'lucide-react';
import { MainView, LeadData } from '../types';

interface HeaderProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  onReset: () => void;
  completedCount: number;
  totalCount: number;
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  savedEvalsCount: number;
  currentLead?: LeadData | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
  onOpenContactModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStepClick,
  onReset,
  completedCount,
  totalCount,
  activeView,
  onViewChange,
  savedEvalsCount,
  currentLead,
  onOpenLoginModal,
  onLogout,
  onOpenContactModal,
}) => {
  const [isDark, setIsDark] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('cpro_dark_mode') === 'true';
    setIsDark(saved);
    if (saved) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !isDark;
    setIsDark(next);
    localStorage.setItem('cpro_dark_mode', String(next));
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleNavClick = (view: MainView) => {
    onViewChange(view);
    setIsMobileMenuOpen(false);
  };

  const steps = [
    { num: 1, label: 'Configuration', icon: Settings2 },
    { num: 2, label: 'Dépôt des copies', icon: UploadCloud },
    { num: 3, label: 'Correction IA', icon: Sparkles },
    { num: 4, label: 'Tableau de bord', icon: BarChart3 },
  ];

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top bar with Brand, Modules & Utilities */}
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand */}
          <button
            type="button"
            onClick={() => onViewChange('landing')}
            className="flex items-center gap-3 text-left group cursor-pointer focus:outline-none"
            title="Retour à l'accueil"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-700/20 group-hover:scale-105 transition-transform">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900 group-hover:text-blue-700 transition-colors">
                  PRAXIS
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  IA Vision
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Correction intelligente de copies & analyse de classe
              </p>
            </div>
          </button>

          {/* Center: Main Module Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => onViewChange('landing')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'landing'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Accueil</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('corr')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'corr'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>📝 Correction</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('classes')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'classes'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Classes</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('suivi')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'suivi'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" />
              <span>Suivi</span>
            </button>

            <button
              type="button"
              onClick={() => onViewChange('hist')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'hist'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              <span>Historique</span>
              {savedEvalsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 font-extrabold">
                  {savedEvalsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => onViewChange('faq')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeView === 'faq'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Foire Aux Questions et guide pédagogique Praxis"
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>FAQ</span>
            </button>

            {onOpenContactModal && (
              <button
                type="button"
                onClick={onOpenContactModal}
                id="btn-header-contact"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-blue-700 hover:bg-white/80 transition-all cursor-pointer"
                title="Contacter le support direct (+225 0103890314 / agoussoukevin@gmail.com)"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>Contact</span>
              </button>
            )}
          </nav>

          {/* Right Tools & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {onOpenContactModal && (
              <button
                type="button"
                onClick={onOpenContactModal}
                id="btn-quick-contact"
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                title="Contacter par WhatsApp / Téléphone / E-mail"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden md:inline">Support</span>
              </button>
            )}

            <button
              type="button"
              onClick={onReset}
              id="btn-reset-assignment"
              className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title="Réinitialiser l'ensemble du devoir"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Nouveau</span>
            </button>

            {/* Dark Mode toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              title={isDark ? 'Mode clair' : 'Mode sombre'}
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Teacher Connection Status */}
            {currentLead ? (
              <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                <div className="hidden sm:flex flex-col items-end">
                  <span className="text-xs font-bold text-slate-800 leading-none truncate max-w-[130px]">
                    {currentLead.name || 'Enseignant'}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-medium leading-tight flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Connecté
                  </span>
                </div>
                {onLogout && (
                  <button
                    type="button"
                    onClick={onLogout}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Se déconnecter"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              onOpenLoginModal && (
                <button
                  type="button"
                  onClick={onOpenLoginModal}
                  id="btn-header-login"
                  className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  title="Se connecter ou créer un compte enseignant"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Connexion</span>
                </button>
              )
            )}

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer ml-1"
              title="Menu principal"
              aria-label="Ouvrir le menu de navigation"
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {isMobileMenuOpen && (
          <div className="lg:hidden py-3 border-t border-slate-200 space-y-2 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => handleNavClick('landing')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'landing' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span>🏠 Accueil</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('corr')}
                className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'corr' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>📝 Correction</span>
                </div>
                {completedCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activeView === 'corr' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {completedCount}/{totalCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('classes')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'classes' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Users className="w-4 h-4 text-current" />
                <span>Mes Classes</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('suivi')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'suivi' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-current" />
                <span>Suivi Élèves</span>
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('hist')}
                className={`flex items-center justify-between p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'hist' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-current" />
                  <span>Historique</span>
                </div>
                {savedEvalsCount > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${activeView === 'hist' ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700'}`}>
                    {savedEvalsCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleNavClick('faq')}
                className={`flex items-center gap-2 p-2.5 rounded-xl text-left transition-colors ${
                  activeView === 'faq' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <HelpCircle className="w-4 h-4 text-current" />
                <span>Aide & FAQ</span>
              </button>
            </div>

            {/* Quick Actions inside mobile menu */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
              {onOpenContactModal && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onOpenContactModal();
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                >
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Assistance direct</span>
                </button>
              )}
              {currentLead && onLogout && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    onLogout();
                  }}
                  className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg bg-rose-50 text-rose-700 font-bold border border-rose-200"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Horizontal Navigation Pill Bar (always easily swipeable) */}
        <div className="lg:hidden flex items-center py-2 border-t border-slate-100 gap-1.5 text-xs overflow-x-auto no-scrollbar scroll-smooth">
          <button
            type="button"
            onClick={() => onViewChange('landing')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors ${
              activeView === 'landing' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Accueil
          </button>
          <button
            type="button"
            onClick={() => onViewChange('corr')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors ${
              activeView === 'corr' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Correction
          </button>
          <button
            type="button"
            onClick={() => onViewChange('classes')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors ${
              activeView === 'classes' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Classes
          </button>
          <button
            type="button"
            onClick={() => onViewChange('suivi')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors ${
              activeView === 'suivi' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            Suivi
          </button>
          <button
            type="button"
            onClick={() => onViewChange('hist')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap flex items-center gap-1 transition-colors ${
              activeView === 'hist' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <span>Historique</span>
            {savedEvalsCount > 0 && (
              <span className={`px-1.5 py-0.2 text-[10px] rounded-full font-extrabold ${activeView === 'hist' ? 'bg-white/20 text-white' : 'bg-blue-200 text-blue-800'}`}>
                {savedEvalsCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onViewChange('faq')}
            className={`px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap transition-colors ${
              activeView === 'faq' ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            FAQ
          </button>
          {onOpenContactModal && (
            <button
              type="button"
              onClick={onOpenContactModal}
              id="btn-mobile-contact"
              className="px-3 py-1.5 rounded-lg font-bold shrink-0 whitespace-nowrap text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 flex items-center gap-1 cursor-pointer"
            >
              <Phone className="w-3 h-3 text-emerald-600" />
              <span>Contact</span>
            </button>
          )}
        </div>

        {/* Step Navigation Bar (only visible when in 'corr' view) */}
        {activeView === 'corr' && (
          <div className="py-2.5 border-t border-slate-100">
            {/* Mobile Stepper (visible on < sm) */}
            <div className="sm:hidden space-y-2">
              <div className="flex items-center justify-between text-xs font-extrabold text-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    {currentStep}
                  </span>
                  <span>{steps[currentStep - 1]?.label}</span>
                </div>
                <span className="text-[11px] text-slate-500 font-semibold">
                  Étape {currentStep} / 4
                </span>
              </div>

              {/* 4 Touchable Progress Bar Segments */}
              <div className="grid grid-cols-4 gap-1.5">
                {steps.map((step) => {
                  const isCurrent = currentStep === step.num;
                  const isPassed = currentStep > step.num;
                  const canClick = step.num <= Math.max(currentStep, totalCount > 0 ? 2 : 1);

                  return (
                    <button
                      key={step.num}
                      type="button"
                      onClick={() => canClick && onStepClick(step.num)}
                      disabled={!canClick}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-blue-600 shadow-xs'
                          : isPassed
                          ? 'bg-emerald-500'
                          : canClick
                          ? 'bg-slate-300 hover:bg-slate-400'
                          : 'bg-slate-200 cursor-not-allowed opacity-60'
                      }`}
                      title={`${step.label} (${isPassed ? 'Complétée' : isCurrent ? 'En cours' : 'À venir'})`}
                      aria-label={`Aller à l'étape ${step.num}: ${step.label}`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Desktop Stepper (visible on >= sm) */}
            <div className="hidden sm:block overflow-x-auto">
              <nav className="flex items-center justify-between min-w-[580px] gap-2">
                {steps.map((step, idx) => {
                  const isCurrent = currentStep === step.num;
                  const isPassed = currentStep > step.num;
                  const canClick = step.num <= Math.max(currentStep, totalCount > 0 ? 2 : 1);

                  return (
                    <div key={step.num} className="flex items-center flex-1">
                      <button
                        type="button"
                        onClick={() => canClick && onStepClick(step.num)}
                        disabled={!canClick}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          isCurrent
                            ? 'bg-blue-600 text-white shadow-xs'
                            : isPassed
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : canClick
                            ? 'text-slate-600 hover:bg-slate-100'
                            : 'text-slate-300 cursor-not-allowed'
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent
                              ? 'bg-white text-blue-700'
                              : isPassed
                              ? 'bg-emerald-600 text-white'
                              : 'bg-slate-200 text-slate-600'
                          }`}
                        >
                          {isPassed ? <CheckCircle2 className="w-3.5 h-3.5" /> : step.num}
                        </span>
                        <span>{step.label}</span>
                        {step.num === 2 && totalCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-slate-200/80 text-slate-700 text-[10px]">
                            {totalCount}
                          </span>
                        )}
                        {step.num === 4 && completedCount > 0 && (
                          <span className="ml-0.5 px-1.5 py-0.2 rounded-full bg-emerald-200/80 text-emerald-800 text-[10px]">
                            {completedCount}
                          </span>
                        )}
                      </button>

                      {idx < steps.length - 1 && (
                        <div
                          className={`h-0.5 flex-1 mx-2 transition-colors ${
                            isPassed ? 'bg-emerald-400' : 'bg-slate-200'
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
