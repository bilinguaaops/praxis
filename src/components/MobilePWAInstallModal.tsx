import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X, Share, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';
import { usePWAInstall } from '../lib/usePWAInstall';

export const MobilePWAInstallModal: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, isMobile, dismissed, install, dismiss } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState<boolean>(false);
  const [hasTriggeredAuto, setHasTriggeredAuto] = useState<boolean>(false);

  // Auto-show only on mobile devices, if not already installed, and not dismissed
  const shouldShowPrompt = isMobile && !isInstalled && !dismissed && (isInstallable || isIOS);

  // Slight 2-second delay on initial mobile visit so it feels smooth and non-intrusive
  const [visible, setVisible] = useState<boolean>(false);

  useEffect(() => {
    if (shouldShowPrompt) {
      const timer = setTimeout(() => {
        setVisible(true);
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [shouldShowPrompt]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await install();
      if (!success) {
        // If user cancelled in native dialog, dismiss for session
        dismiss();
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    }
  };

  // If running in standalone mode (already on home screen) or on desktop: do not render anything
  if (isInstalled || !isMobile) {
    return null;
  }

  return (
    <>
      {/* NATIVE-LIKE BOTTOM SHEET FOR MOBILE (Matches user screenshot: "Ajouter ce site Web à l'écran Applis ?") */}
      {visible && !showIOSModal && (
        <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:hidden animate-in fade-in slide-in-from-bottom-6 duration-300 pointer-events-auto">
          <div className="bg-[#1C2024] text-white rounded-2xl shadow-2xl border border-slate-700/60 p-4 max-w-md mx-auto">
            <div className="flex items-start gap-3.5 mb-3.5">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-sky-600 flex items-center justify-center shrink-0 shadow-md border border-white/10">
                <img
                  src="/icon-192.png"
                  alt="Praxis Logo"
                  className="w-10 h-10 rounded-lg object-cover"
                  onError={(e) => {
                    // Fallback icon if image loading fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 pr-6">
                <h3 className="text-[15px] font-bold text-white leading-tight">
                  Ajouter Praxis IA à l’écran d’accueil ?
                </h3>
                <p className="text-xs text-slate-300 mt-1 leading-snug">
                  Accédez à vos corrections en un clic depuis votre écran d’applications, en plein écran et sans barre de navigateur.
                </p>
              </div>
              <button
                type="button"
                onClick={dismiss}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors absolute top-4 right-4"
                aria-label="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={dismiss}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleInstallClick}
                className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Ajouter</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IOS SAFARI GUIDED MODAL */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-xs p-3">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in slide-in-from-bottom-8 duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold text-sm shadow-sm">
                  P
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Installer sur iPhone / iPad
                  </h4>
                  <p className="text-[11px] text-slate-500">Ajout à l'écran d'accueil</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-200">
              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="p-1.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">
                    1. Appuyez sur « Partager »
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    L'icône avec un carré et une flèche vers le haut dans la barre Safari (en bas de votre écran).
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-lg shrink-0 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-bold block text-slate-900 dark:text-white">
                    2. Choisissez « Sur l'écran d'accueil »
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Faites défiler les options vers le bas et touchez « Sur l'écran d'accueil », puis confirmez avec « Ajouter ».
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setShowIOSModal(false);
                dismiss();
              }}
              className="mt-5 w-full py-2.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-xl text-xs hover:opacity-90 transition-opacity"
            >
              Compris !
            </button>
          </div>
        </div>
      )}
    </>
  );
};

// COMPOSANT BOUTON POUR LE MENU MOBILE
export const MobilePWAInstallMenuItem: React.FC<{ onClick?: () => void }> = ({ onClick }) => {
  const { isInstallable, isInstalled, isIOS, isMobile, install } = usePWAInstall();
  const [showIOS, setShowIOS] = useState(false);

  // Uniquement visible sur mobile et si non installé
  if (isInstalled || !isMobile) {
    return null;
  }

  const handleClick = async () => {
    if (onClick) onClick();
    if (isInstallable) {
      await install();
    } else if (isIOS) {
      setShowIOS(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 rounded-xl border border-blue-200/60 dark:border-blue-900/50 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span>Installer l'application mobile</span>
        </span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 bg-blue-600 text-white rounded-md uppercase">
          App
        </span>
      </button>

      {showIOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl p-5 shadow-xl">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white mb-2">
              Installer sur votre iPhone
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 mb-4 leading-relaxed">
              1. Touchez l'icône <strong>Partager</strong> en bas de Safari.<br />
              2. Sélectionnez <strong>« Sur l'écran d'accueil »</strong>.
            </p>
            <button
              type="button"
              onClick={() => setShowIOS(false)}
              className="w-full py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
