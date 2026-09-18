import React, { useState } from 'react';
import { Sparkles, GraduationCap, X, Lock, ArrowRight, LogIn, UserPlus, CheckCircle2, ShieldCheck } from 'lucide-react';
import { LeadData } from '../types';

interface LeadGateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess: (lead: LeadData) => void;
}

export const LeadGateModal: React.FC<LeadGateModalProps> = ({
  isOpen,
  onClose,
  onSubmitSuccess,
}) => {
  const [mode, setMode] = useState<'register' | 'login'>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [discipline, setDiscipline] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [school, setSchool] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() && !whatsapp.trim()) {
      setErrorMsg('Veuillez renseigner votre adresse email.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim() || 'Enseignant',
          email: email.trim(),
          discipline: discipline.trim(),
          whatsapp: whatsapp.trim(),
          school: school.trim(),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const lead: LeadData = data.lead || {
          name: name.trim() || 'Enseignant',
          email: email.trim(),
          whatsapp: whatsapp.trim(),
          school: school.trim(),
        };
        localStorage.setItem('praxis_lead', JSON.stringify(lead));
        localStorage.setItem('cpro_lead', JSON.stringify(lead));
        onSubmitSuccess(lead);
      } else {
        const err = await res.json();
        setErrorMsg(err.error || 'Erreur lors de la validation.');
      }
    } catch (err: any) {
      console.warn('Fallback local save:', err);
      const lead: LeadData = {
        name: name.trim() || 'Enseignant',
        email: email.trim(),
        whatsapp: whatsapp.trim(),
        school: school.trim(),
      };
      localStorage.setItem('praxis_lead', JSON.stringify(lead));
      localStorage.setItem('cpro_lead', JSON.stringify(lead));
      onSubmitSuccess(lead);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative">
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          id="btn-close-lead-modal"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer z-10"
          title="Fermer et rester sur les copies"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="p-6 text-center border-b border-slate-100 bg-gradient-to-b from-blue-50/80 to-white">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>🎁 Démo Gratuite • 5 copies offertes par enseignant</span>
          </div>

          <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
            {mode === 'register' ? 'Inscription Enseignant (Accès Découverte)' : 'Connexion Enseignant'}
          </h3>
          <p className="text-xs text-slate-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
            {mode === 'register'
              ? 'Renseignez vos coordonnées pour débloquer vos 5 corrections IA gratuites et tester le système sur vos vraies copies.'
              : 'Connectez-vous avec votre email pour retrouver vos copies et lancer la correction.'}
          </p>

          {/* Mode switch */}
          <div className="flex items-center justify-center gap-1 mt-4 p-1 bg-slate-100 rounded-xl max-w-xs mx-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Inscription</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nom complet ou Titre <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex : M. Dupont, Mme Traoré..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                required={mode === 'register'}
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Adresse Email Professionnelle ou Personnelle</span>
              <span className="text-rose-500 font-bold">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="votre.email@ac-academie.fr ou gmail.com"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
              required
            />
          </div>

          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Matière enseignée <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={discipline}
                  onChange={(e) => setDiscipline(e.target.value)}
                  placeholder="Ex : Mathématiques, Français, Histoire..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Numéro WhatsApp / Téléphone</span>
                  <span className="font-normal text-slate-400 text-[11px]">Optionnel</span>
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="+33 6 12 34 56 78"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Établissement scolaire / Ville <span className="font-normal text-slate-400">(optionnel)</span>
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder="Ex : Collège Jean Moulin, Lycée Victor Hugo..."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
              </div>
            </>
          )}

          {errorMsg && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 text-center font-semibold">
              {errorMsg}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              id="btn-submit-lead"
              className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {loading ? (
                <span>Validation de votre accès...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>
                    {mode === 'register'
                      ? "Valider et débloquer mes 5 copies gratuites"
                      : 'Se connecter et lancer la correction'}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
            <span className="flex items-center gap-1 text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              100% gratuit • Sans carte bancaire
            </span>
            <button
              type="button"
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              Fermer
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
