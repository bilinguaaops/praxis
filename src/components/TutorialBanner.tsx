import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Smartphone, FileText, UploadCloud, Settings, CheckCircle2, Zap } from 'lucide-react';

export const TutorialBanner: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-md text-white mb-6">
      {/* Header clickable */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-5 py-3.5 flex items-center justify-between hover:bg-slate-850 transition-colors text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-extrabold uppercase tracking-wider bg-blue-600/30 text-blue-400 border border-blue-500/30">
            Guide
          </span>
          <span className="font-bold text-sm sm:text-base text-slate-100">
            Comment utiliser PRAXIS ?
          </span>
        </div>
        <div className="flex items-center gap-1 text-xs font-semibold text-slate-400">
          <span>{isOpen ? 'Masquer' : 'Voir le guide'}</span>
          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </button>

      {/* Body */}
      {isOpen && (
        <div className="p-5 sm:p-6 border-t border-slate-800/80 bg-slate-950/60 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Step 1 */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">
                  1
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-blue-400" />
                  Scannez les copies
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Photographiez ou scannez chaque copie au stylo bille. Utilisez un scanner à défilement ou une application mobile.
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {['CamScanner', 'Adobe Scan', 'Lens', 'Notes iOS', 'Google Drive'].map((app) => (
                    <span key={app} className="text-[10px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                      {app}
                    </span>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-blue-300/80 bg-blue-950/40 p-2 rounded border border-blue-900/40 leading-tight">
                💡 <strong>Astuce :</strong> Nommez les fichiers avec le nom de l'élève (ex : <em>Dupont_Lucas.pdf</em>).
              </p>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">
                  2
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                  Exportez en PDF
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Exportez en <strong>PDF</strong> ou images (JPG/PNG). Un fichier par élève, ou un seul PDF de toute la classe à la suite.
                </p>
              </div>
              <p className="text-[11px] text-indigo-300/80 bg-indigo-950/40 p-2 rounded border border-indigo-900/40 leading-tight">
                📋 <strong>PDF de classe :</strong> L'outil découpe automatiquement chaque copie page par page.
              </p>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">
                  3
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
                  Déposez les fichiers
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Glissez-déposez vos scans. Vérifiez et ajustez le nom de chaque élève en direct si souhaité.
                </p>
              </div>
              <p className="text-[11px] text-emerald-300/80 bg-emerald-950/40 p-2 rounded border border-emerald-900/40 leading-tight">
                🔄 <strong>Depuis le téléphone :</strong> Transférez vos PDF par WhatsApp ou AirDrop vers votre ordinateur.
              </p>
            </div>

            {/* Step 4 */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">
                  4
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  Réglez le barème
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Renseignez la matière, le niveau, la note max (/20, /10, /100) et le corrigé officiel si vous en avez un.
                </p>
              </div>
              <p className="text-[11px] text-amber-300/80 bg-amber-950/40 p-2 rounded border border-amber-900/40 leading-tight">
                ✏️ <strong>Sans corrigé ?</strong> Le <em>Mode autonome</em> résout et note lui-même selon le niveau scolaire.
              </p>
            </div>

            {/* Step 5 */}
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl flex flex-col justify-between space-y-3">
              <div>
                <div className="w-7 h-7 rounded-full bg-blue-600 text-white font-black text-xs flex items-center justify-center mb-2">
                  5
                </div>
                <h4 className="font-bold text-xs sm:text-sm text-slate-100 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-rose-400" />
                  Lancez & Restituez
                </h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  L'IA analyse les calculs, rédige les appréciations, calcule les statistiques de classe et génère les fiches.
                </p>
              </div>
              <p className="text-[11px] text-rose-300/80 bg-rose-950/40 p-2 rounded border border-rose-900/40 leading-tight">
                📊 <strong>Export Pronote :</strong> Téléchargez le tableur CSV prêt pour votre logiciel scolaire.
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex items-center gap-2 text-xs text-slate-400">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Vitesse d'exécution :</strong> ~15 à 20 secondes par copie. Une classe entière de 30 élèves se traite en quelques minutes. L'IA déchiffre l'écriture manuscrite et les ratures.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
