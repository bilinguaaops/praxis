import React, { useState, useEffect } from 'react';
import { Sparkles, GraduationCap, CheckCircle2, RotateCcw, FileText, BarChart3, UploadCloud, Settings2, Users, TrendingUp, History, Sun, Moon, Shield, User, LogOut, UserCheck } from 'lucide-react';
import { MainView, LeadData } from '../types';

interface HeaderProps {
  currentStep: number;
  onStepClick: (step: number) => void;
  onReset: () => void;
  onLoadDemo: () => void;
  completedCount: number;
  totalCount: number;
  activeView: MainView;
  onViewChange: (view: MainView) => void;
  savedEvalsCount: number;
  currentLead?: LeadData | null;
  onOpenLoginModal?: () => void;
  onLogout?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentStep,
  onStepClick,
  onReset,
  onLoadDemo,
  completedCount,
  totalCount,
  activeView,
  onViewChange,
  savedEvalsCount,
  currentLead,
  onOpenLoginModal,
  onLogout,
}) => {
  const [isDark, setIsDark] = useState(false);

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
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-sm ring-1 ring-blue-700/20">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg sm:text-xl tracking-tight text-slate-900">
                  PRAXIS
                </span>
                <span className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200/60">
                  <Sparkles className="w-3 h-3 text-blue-600" />
                  IA Vision
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Correction intelligente de copies, analyse de classe & suivi des élèves
              </p>
            </div>
          </div>

          {/* Center: Main Module Navigation Tabs */}
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
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
          </nav>

          {/* Right Tools & Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={onLoadDemo}
              id="btn-load-demo"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer"
              title="Charger une évaluation de démonstration prête"
            >
              <FileText className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Exemple démo</span>
            </button>

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

            {/* Admin Dashboard shortcut */}
            <a
              href="/admin"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-lg transition-colors"
              title="Accéder au panneau d'administration propriétaire (code secret requis)"
            >
              <Shield className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden sm:inline">Admin</span>
            </a>

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
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-lg transition-colors cursor-pointer"
                  title="Se connecter ou créer un compte enseignant"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Connexion</span>
                </button>
              )
            )}
          </div>
        </div>

        {/* Mobile Navigation Tabs (visible under lg) */}
        <div className="lg:hidden flex items-center justify-around py-2 border-t border-slate-100 gap-1 text-xs">
          <button
            type="button"
            onClick={() => onViewChange('corr')}
            className={`px-3 py-1 rounded-lg font-bold ${
              activeView === 'corr' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Correction
          </button>
          <button
            type="button"
            onClick={() => onViewChange('classes')}
            className={`px-3 py-1 rounded-lg font-bold ${
              activeView === 'classes' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Classes
          </button>
          <button
            type="button"
            onClick={() => onViewChange('suivi')}
            className={`px-3 py-1 rounded-lg font-bold ${
              activeView === 'suivi' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            Suivi
          </button>
          <button
            type="button"
            onClick={() => onViewChange('hist')}
            className={`px-3 py-1 rounded-lg font-bold flex items-center gap-1 ${
              activeView === 'hist' ? 'bg-blue-50 text-blue-700' : 'text-slate-600'
            }`}
          >
            <span>Historique</span>
            {savedEvalsCount > 0 && (
              <span className="px-1 text-[10px] bg-blue-100 text-blue-700 rounded-full font-bold">
                {savedEvalsCount}
              </span>
            )}
          </button>
        </div>

        {/* Step Navigation Bar (only visible when in 'corr' view) */}
        {activeView === 'corr' && (
          <div className="py-2.5 border-t border-slate-100 overflow-x-auto">
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
        )}
      </div>
    </header>
  );
};
