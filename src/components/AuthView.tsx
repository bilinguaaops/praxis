import React, { useState } from 'react';
import {
  Sparkles,
  Lock,
  Mail,
  User,
  School,
  Phone,
  ArrowRight,
  LogIn,
  UserPlus,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ShieldCheck,
  RefreshCw,
  X,
  HelpCircle,
  ArrowLeft,
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LeadData, MainView } from '../types';

interface AuthViewProps {
  initialMode?: 'login' | 'register' | 'forgot-password';
  isModal?: boolean;
  onClose?: () => void;
  onAuthSuccess?: (user: any, profile?: any) => void;
  onNavigate?: (view: MainView) => void;
  onBack?: () => void;
}

export const AuthView: React.FC<AuthViewProps> = ({
  initialMode = 'login',
  isModal = false,
  onClose,
  onAuthSuccess,
  onNavigate,
  onBack,
}) => {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot-password'>(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [schoolName, setSchoolName] = useState('');
  const [phoneWhatsapp, setPhoneWhatsapp] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Détection du code de parrainage (?ref=PRAXIS-XXXXXX)
  const [referralCode] = useState<string>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const code = search.get('ref') || search.get('code') || localStorage.getItem('praxis_partner_ref') || '';
      return code.trim().toUpperCase();
    } catch {
      return '';
    }
  });

  const resetFormState = () => {
    setErrorMsg('');
    setSuccessMsg('');
  };

  const switchMode = (newMode: 'login' | 'register' | 'forgot-password') => {
    resetFormState();
    setMode(newMode);
    if (onNavigate) {
      onNavigate(newMode as MainView);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim() || !password) {
      setErrorMsg('Veuillez renseigner un email et un mot de passe.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Le mot de passe doit comporter au moins 6 caractères.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Enregistrement direct et persistant sur le serveur Praxis
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: fullName.trim() || 'Enseignant',
            email: email.trim().toLowerCase(),
            whatsapp: phoneWhatsapp.trim(),
            school: schoolName.trim(),
          }),
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Erreur lors de l’inscription.');
        }

        const lead: LeadData = {
          name: data.lead.name,
          email: data.lead.email,
          whatsapp: data.lead.whatsapp || '',
          school: data.lead.school || 'Établissement non précisé',
          plan: data.lead.plan || 'trial',
          status: data.lead.status || 'trial',
          quota: data.lead.quota || 50,
          subscriptionCredits: data.lead.subscriptionCredits || 50,
          extraCredits: data.lead.extraCredits || 0,
          copiesCorrected: data.lead.copiesCorrected || 0,
          userId: data.lead.id,
          role: 'teacher',
        };

        localStorage.setItem('praxis_lead', JSON.stringify(lead));
        localStorage.setItem('cpro_lead', JSON.stringify(lead));

        if (onAuthSuccess) {
          onAuthSuccess(lead, lead);
        }
        if (onClose) {
          onClose();
        }
        if (onNavigate) {
          onNavigate('dashboard');
        }
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          data: {
            full_name: fullName.trim() || 'Enseignant',
            school_name: schoolName.trim() || 'Établissement non précisé',
            phone_whatsapp: phoneWhatsapp.trim() || '',
            referral_code: referralCode || undefined,
          },
        },
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrorMsg('Cette adresse email est déjà enregistrée. Veuillez vous connecter.');
        } else if (error.message.includes('Password should be')) {
          setErrorMsg('Le mot de passe est trop court (6 caractères minimum).');
        } else {
          setErrorMsg(error.message || 'Erreur lors de l\'inscription.');
        }
        return;
      }

      // Inscription immédiate : quand la confirmation email est désactivée dans Supabase,
      // la session est retournée directement.
      if (data?.session && data?.user) {
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
        if (onClose) {
          onClose();
        }
        if (onNavigate) {
          onNavigate('dashboard');
        }
        return;
      }

      // Si le compte a été créé mais que data.session n'a pas été renvoyée directement,
      // connexion automatique immédiate avec l'email et le mot de passe
      if (data?.user) {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (!signInError && signInData?.session && signInData?.user) {
          if (onAuthSuccess) {
            onAuthSuccess(signInData.user);
          }
          if (onClose) {
            onClose();
          }
          if (onNavigate) {
            onNavigate('dashboard');
          }
          return;
        }

        if (signInError) {
          if (signInError.message.toLowerCase().includes('email not confirmed')) {
            setErrorMsg(
              "Compte créé. L'option 'Confirm email' est encore activée dans votre tableau de bord Supabase (Authentication > Providers > Email). Désactivez-la pour un accès 100% instantané sans confirmation."
            );
            return;
          }
          setErrorMsg(signInError.message || 'Compte créé. Veuillez vous connecter.');
          setMode('login');
          return;
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Une erreur réseau est survenue. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim() || !password) {
      setErrorMsg('Veuillez renseigner votre email et mot de passe.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        // Recherche du compte enseignant sur le serveur Praxis
        const res = await fetch(`/api/teacher/me?email=${encodeURIComponent(email.trim().toLowerCase())}`);
        const data = await res.json();

        if (!res.ok || !data.email) {
          setErrorMsg('Aucun compte trouvé avec cette adresse email. Veuillez d’abord vous inscrire.');
          return;
        }

        const lead: LeadData = {
          name: data.name || 'Enseignant',
          email: data.email,
          whatsapp: data.whatsapp || '',
          school: data.school || 'Établissement non précisé',
          plan: data.plan || 'trial',
          status: data.status || 'trial',
          quota: data.quota || 50,
          subscriptionCredits: data.subscriptionCredits || 50,
          extraCredits: data.extraCredits || 0,
          copiesCorrected: data.copiesCorrected || 0,
          userId: data.id,
          role: 'teacher',
        };

        localStorage.setItem('praxis_lead', JSON.stringify(lead));
        localStorage.setItem('cpro_lead', JSON.stringify(lead));

        if (onAuthSuccess) {
          onAuthSuccess(lead, lead);
        }
        if (onClose) {
          onClose();
        }
        if (onNavigate) {
          onNavigate('dashboard');
        }
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes('invalid login credentials') || msg.includes('invalid grant')) {
          setErrorMsg('Email ou mot de passe incorrect.');
        } else if (msg.includes('email not confirmed')) {
          setErrorMsg(
            'Votre adresse email n\'a pas encore été confirmée. Veuillez vérifier votre boîte de réception (et vos spams).'
          );
        } else {
          setErrorMsg(error.message || 'Échec de la connexion.');
        }
        return;
      }

      if (data.user) {
        if (onAuthSuccess) {
          onAuthSuccess(data.user);
        }
        if (onNavigate) {
          onNavigate('dashboard');
        }
        if (onClose) {
          onClose();
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la connexion. Veuillez vérifier votre réseau.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetFormState();

    if (!email.trim()) {
      setErrorMsg('Veuillez saisir votre adresse email.');
      return;
    }

    setLoading(true);

    try {
      if (!isSupabaseConfigured) {
        throw new Error('Supabase n\'est pas configuré.');
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: window.location.origin + '/login',
      });

      if (error) {
        setErrorMsg(error.message || 'Erreur lors de l\'envoi du lien.');
      } else {
        setSuccessMsg(
          `Si un compte existe pour ${email}, un lien de réinitialisation vous a été envoyé par email.`
        );
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Impossible de contacter le serveur.');
    } finally {
      setLoading(false);
    }
  };

  const content = (
    <div className="bg-white w-full max-w-md rounded-2xl shadow-xl border border-slate-200 overflow-hidden relative">
      {/* Bouton de fermeture si affiché dans un modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer z-10"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Header visuel */}
      <div className="p-6 text-center border-b border-slate-100 bg-gradient-to-b from-blue-50/70 to-white">
        {mode === 'register' && referralCode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-100 text-blue-900 text-xs font-bold mb-2 border border-blue-200">
            <span>🤝 Parrainage ({referralCode}) : +50 crédits offerts après votre 1er abonnement</span>
          </div>
        )}

        {mode === 'register' && !referralCode && (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-bold mb-3 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>30 corrections IA offertes • Sans engagement</span>
          </div>
        )}

        <div className="flex justify-center mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Sparkles className="w-5 h-5" />
          </div>
        </div>

        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {mode === 'register' && 'Créer votre compte Enseignant'}
          {mode === 'login' && 'Connexion à votre espace Praxis'}
          {mode === 'forgot-password' && 'Réinitialiser votre mot de passe'}
        </h2>

        <p className="text-xs text-slate-600 mt-1 max-w-xs mx-auto leading-relaxed">
          {mode === 'register' &&
            'Accédez à votre espace pédagogique et testez la correction IA sur vos vraies copies d\'élèves.'}
          {mode === 'login' &&
            'Retrouvez vos séries de devoirs, vos élèves et vos crédits de correction.'}
          {mode === 'forgot-password' &&
            'Renseignez votre adresse email pour recevoir un lien sécurisé.'}
        </p>

        {/* Onglets Connexion / Inscription */}
        {mode !== 'forgot-password' && (
          <div className="flex items-center justify-center gap-1 mt-4 p-1 bg-slate-100 rounded-xl max-w-xs mx-auto text-xs font-bold">
            <button
              type="button"
              onClick={() => switchMode('login')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'login'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Connexion</span>
            </button>
            <button
              type="button"
              onClick={() => switchMode('register')}
              className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                mode === 'register'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Inscription</span>
            </button>
          </div>
        )}
      </div>

      {/* Avertissement configuration Supabase si clés absentes */}
      {!isSupabaseConfigured && (
        <div className="mx-6 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Configuration Supabase requise :</span>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Ajoutez <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_URL</code> et{' '}
              <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">VITE_SUPABASE_PUBLISHABLE_KEY</code> dans votre
              fichier <code className="font-mono">.env</code> pour activer Supabase Auth.
            </p>
          </div>
        </div>
      )}

      {/* Formulaires d'authentification */}
      <div className="p-6 space-y-4">
        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-medium flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

          {/* Formulaire Inscription */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Nom complet ou Titre <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="M. Dupont, Mme Traoré..."
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse email <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="professeur@academie.fr ou gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Mot de passe <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="6 caractères minimum"
                    minLength={6}
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Établissement <span className="font-normal text-slate-400">(opt.)</span>
                  </label>
                  <div className="relative">
                    <School className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    <input
                      type="text"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Collège / Lycée..."
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    WhatsApp <span className="font-normal text-slate-400">(opt.)</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-3" />
                    <input
                      type="tel"
                      value={phoneWhatsapp}
                      onChange={(e) => setPhoneWhatsapp(e.target.value)}
                      placeholder="+225... / +33..."
                      className="w-full pl-8 pr-2.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Création de votre compte...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Créer mon compte & obtenir mes 30 crédits</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Déjà inscrit ?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('login')}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Se connecter
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Formulaire Connexion */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Adresse email</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="professeur@academie.fr ou gmail.com"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700">Mot de passe</label>
                  <button
                    type="button"
                    onClick={() => switchMode('forgot-password')}
                    className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline cursor-pointer font-medium"
                  >
                    Mot de passe oublié ?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Votre mot de passe"
                    className="w-full pl-9 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md shadow-blue-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Connexion en cours...</span>
                    </>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Se connecter</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => switchMode('register')}
                    className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                  >
                    Créer un compte gratuit
                  </button>
                </p>
              </div>
            </form>
          )}

          {/* Formulaire Mot de passe oublié */}
          {mode === 'forgot-password' && (
            <form onSubmit={handleForgotPassword} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Adresse email de votre compte
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="professeur@academie.fr"
                    className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                    required
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Envoi du lien...</span>
                    </>
                  ) : (
                    <span>Envoyer le lien de réinitialisation</span>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => switchMode('login')}
                  className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </form>
          )}
        </div>

      {/* Footer sécurité */}
      <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-6">
        <span className="flex items-center gap-1.5 text-slate-600">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Authentification sécurisée Supabase</span>
        </span>
        <span className="text-slate-400">RGPD & Données protégées</span>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
        {content}
      </div>
    );
  }

  // Page complète (sur /login, /register, /forgot-password)
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4 sm:p-6">
      {/* Bouton retour en arrière si navigation depuis l'application */}
      {onBack && (
        <div className="w-full max-w-md mb-4 flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Retour</span>
          </button>
        </div>
      )}

      {/* Brand logo link */}
      <div className="mb-6 flex items-center gap-2">
        <button
          type="button"
          onClick={() => onNavigate && onNavigate('landing')}
          className="flex items-center gap-2 text-slate-900 hover:opacity-80 transition-opacity cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs">
            P
          </div>
          <span className="font-extrabold text-lg tracking-tight">Praxis</span>
          <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            Éducation
          </span>
        </button>
      </div>

      {content}

      <div className="mt-6 text-center text-xs text-slate-400">
        <p>© 2026 SaaS Praxis. Outil pédagogique d'assistance à la correction.</p>
      </div>
    </div>
  );
};
