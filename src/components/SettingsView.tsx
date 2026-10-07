import React, { useState, useEffect } from 'react';
import {
  User,
  Sliders,
  Bell,
  CreditCard,
  ShieldCheck,
  Check,
  Save,
  Building,
  Mail,
  Phone,
  BookOpen,
  GraduationCap,
  Sparkles,
  Zap,
  Lock,
  Download,
  AlertTriangle,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LeadData, Discipline, SchoolLevel } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface SettingsViewProps {
  currentLead: LeadData | null;
  onUpdateLead: (updated: LeadData) => void;
  onOpenBilling: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentLead,
  onUpdateLead,
  onOpenBilling,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'correction' | 'notifications' | 'billing' | 'security'>('profile');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Profile fields
  const [name, setName] = useState(currentLead?.name || '');
  const [email, setEmail] = useState(currentLead?.email || '');
  const [whatsapp, setWhatsapp] = useState(currentLead?.whatsapp || '');
  const [school, setSchool] = useState(currentLead?.school || '');
  const [discipline, setDiscipline] = useState<Discipline>('Mathématiques');
  const [level, setLevel] = useState<SchoolLevel>('3e (Brevet)');

  // Correction default preferences
  const [defaultMaxGrade, setDefaultMaxGrade] = useState<number>(20);
  const [spellingTolerance, setSpellingTolerance] = useState<'faible' | 'moyenne' | 'forte'>('moyenne');
  const [alwaysRequireValidation, setAlwaysRequireValidation] = useState(true);
  const [showConfidenceScores, setShowConfidenceScores] = useState(true);
  const [analysisSpeed, setAnalysisSpeed] = useState<'turbo' | 'deep'>('turbo');

  // Notifications
  const [notifCorrectionDone, setNotifCorrectionDone] = useState(true);
  const [notifLowCredits, setNotifLowCredits] = useState(true);
  const [notifPaymentConfirmed, setNotifPaymentConfirmed] = useState(true);
  const [notifNews, setNotifNews] = useState(false);
  const [notifWhatsAppDirect, setNotifWhatsAppDirect] = useState(true);

  // Load saved preferences from localStorage on mount
  useEffect(() => {
    try {
      const savedSettings = localStorage.getItem('praxis_teacher_settings');
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings);
        if (parsed.discipline) setDiscipline(parsed.discipline);
        if (parsed.level) setLevel(parsed.level);
        if (parsed.defaultMaxGrade) setDefaultMaxGrade(parsed.defaultMaxGrade);
        if (parsed.spellingTolerance) setSpellingTolerance(parsed.spellingTolerance);
        if (typeof parsed.alwaysRequireValidation === 'boolean') setAlwaysRequireValidation(parsed.alwaysRequireValidation);
        if (typeof parsed.showConfidenceScores === 'boolean') setShowConfidenceScores(parsed.showConfidenceScores);
        if (parsed.analysisSpeed) setAnalysisSpeed(parsed.analysisSpeed);
        if (typeof parsed.notifCorrectionDone === 'boolean') setNotifCorrectionDone(parsed.notifCorrectionDone);
        if (typeof parsed.notifLowCredits === 'boolean') setNotifLowCredits(parsed.notifLowCredits);
        if (typeof parsed.notifPaymentConfirmed === 'boolean') setNotifPaymentConfirmed(parsed.notifPaymentConfirmed);
        if (typeof parsed.notifNews === 'boolean') setNotifNews(parsed.notifNews);
        if (typeof parsed.notifWhatsAppDirect === 'boolean') setNotifWhatsAppDirect(parsed.notifWhatsAppDirect);
      }
    } catch {}
  }, []);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Update lead profile
    const updatedLead: LeadData = {
      ...(currentLead || { plan: 'trial', quota: 50, subscriptionCredits: 50, extraCredits: 0, copiesCorrected: 0 }),
      name: name.trim() || currentLead?.name || 'Enseignant',
      email: email.trim() || currentLead?.email || '',
      whatsapp: whatsapp.trim() || currentLead?.whatsapp || '',
      school: school.trim() || currentLead?.school || '',
    };

    localStorage.setItem('praxis_lead', JSON.stringify(updatedLead));
    onUpdateLead(updatedLead);

    // Sync directly with Supabase profiles table if logged in
    if (isSupabaseConfigured && currentLead?.userId) {
      supabase
        .from('profiles')
        .update({
          full_name: name.trim() || currentLead.name,
          phone_whatsapp: whatsapp.trim() || '',
          school_name: school.trim() || '',
          updated_at: new Date().toISOString(),
        })
        .eq('id', currentLead.userId)
        .then(({ error }) => {
          if (error) {
            console.warn('[Settings] Note sync profil Supabase:', error.message);
          }
        });
    }

    // 2. Save settings preferences
    const settingsObj = {
      discipline,
      level,
      defaultMaxGrade,
      spellingTolerance,
      alwaysRequireValidation,
      showConfidenceScores,
      analysisSpeed,
      notifCorrectionDone,
      notifLowCredits,
      notifPaymentConfirmed,
      notifNews,
      notifWhatsAppDirect,
    };
    localStorage.setItem('praxis_teacher_settings', JSON.stringify(settingsObj));

    setSavedSuccess(true);
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.7 } });
    } catch {}
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
      {/* Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
            Paramètres du compte
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1">
            Gérez vos informations personnelles, vos préférences pédagogiques et vos notifications.
          </p>
        </div>

        {savedSuccess && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 text-xs font-medium animate-in fade-in">
            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Modifications enregistrées</span>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-px">
        <button
          type="button"
          onClick={() => setActiveTab('profile')}
          className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors shrink-0 cursor-pointer border-b-2 ${
            activeTab === 'profile'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <User className="w-3.5 h-3.5" />
          <span>Profil</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('correction')}
          className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors shrink-0 cursor-pointer border-b-2 ${
            activeTab === 'correction'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>Préférences de correction</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('notifications')}
          className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors shrink-0 cursor-pointer border-b-2 ${
            activeTab === 'notifications'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <Bell className="w-3.5 h-3.5" />
          <span>Notifications</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('billing')}
          className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors shrink-0 cursor-pointer border-b-2 ${
            activeTab === 'billing'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <CreditCard className="w-3.5 h-3.5" />
          <span>Abonnement</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('security')}
          className={`flex items-center gap-2 px-3 py-2 text-xs transition-colors shrink-0 cursor-pointer border-b-2 ${
            activeTab === 'security'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
              : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white font-medium'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Sécurité</span>
        </button>
      </div>

      {/* TAB CONTENT */}
      <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs space-y-6">
        {/* TAB 1: PROFIL */}
        {activeTab === 'profile' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Profil de l'enseignant</h2>
              <p className="text-xs text-slate-500">Ces informations apparaissent sur vos synthèses de devoirs et fiches d'évaluation.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Nom complet / Titre :</label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: M. Jean-Marc Kouassi"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Adresse Email :</label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jean.kouassi@education.ci"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Numéro WhatsApp / Téléphone :</label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    placeholder="+225 07 XX XX XX XX"
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 block">Établissement scolaire :</label>
                <div className="relative">
                  <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Lycée Classique, Collège Notre Dame..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CORRECTION PREFERENCES */}
        {activeTab === 'correction' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Préférences par défaut de correction</h2>
              <p className="text-xs text-slate-500">Ces critères s'appliqueront automatiquement à chacun de vos nouveaux devoirs.</p>
            </div>

            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Barème par défaut :</label>
                  <select
                    value={defaultMaxGrade}
                    onChange={(e) => setDefaultMaxGrade(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900"
                  >
                    <option value={20}>Sur 20 points (Standard)</option>
                    <option value={10}>Sur 10 points</option>
                    <option value={40}>Sur 40 points</option>
                    <option value={100}>Sur 100 points</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 block">Tolérance orthographique :</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(['faible', 'moyenne', 'forte'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setSpellingTolerance(t)}
                        className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-colors cursor-pointer border ${
                          spellingTolerance === t
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3 pt-2">
                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alwaysRequireValidation}
                    onChange={(e) => setAlwaysRequireValidation(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Toujours demander validation humaine par le professeur
                    </span>
                    <span className="text-[11px] text-slate-500">
                      L'IA propose la correction et la note, mais le professeur conserve le contrôle total pour valider ou ajuster chaque copie.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showConfidenceScores}
                    onChange={(e) => setShowConfidenceScores(e.target.checked)}
                    className="mt-0.5 rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 block">
                      Afficher les scores de confiance et alertes de lisibilité
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Met en évidence d'une étiquette orange les copies dont l'écriture manuscrite nécessite une relecture particulière.
                    </span>
                  </div>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: NOTIFICATIONS */}
        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Préférences de notification</h2>
              <p className="text-xs text-slate-500">Choisissez les alertes que vous souhaitez recevoir dans l'application et sur WhatsApp.</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Série de correction terminée</span>
                  <span className="text-[11px] text-slate-500">Notification dès que toutes les copies du devoir sont prêtes.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifCorrectionDone}
                  onChange={(e) => setNotifCorrectionDone(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Alerte crédits faibles (&lt; 50 copies)</span>
                  <span className="text-[11px] text-slate-500">Rappel pour recharger vos crédits avant un gros devoir.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifLowCredits}
                  onChange={(e) => setNotifLowCredits(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Paiement & Recharge confirmés</span>
                  <span className="text-[11px] text-slate-500">Reçu et confirmation d'activation instantanée de crédits.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifPaymentConfirmed}
                  onChange={(e) => setNotifPaymentConfirmed(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 cursor-pointer">
                <div>
                  <span className="text-xs font-bold text-slate-900 block">Alertes directes sur WhatsApp</span>
                  <span className="text-[11px] text-slate-500">Recevez un ping dès la fin de correction sur votre téléphone.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifWhatsAppDirect}
                  onChange={(e) => setNotifWhatsAppDirect(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                />
              </label>
            </div>
          </div>
        )}

        {/* TAB 4: BILLING OVERVIEW */}
        {activeTab === 'billing' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Abonnement & Solde financier</h2>
              <p className="text-xs text-slate-500">Gérez vos forfaits mensuels, trimestriels, annuels et recharges permanentes.</p>
            </div>

            <div className="p-5 rounded-2xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-blue-800 uppercase tracking-wider block">
                  Formule active
                </span>
                <h3 className="text-xl font-black text-slate-900 mt-0.5">
                  {currentLead?.plan === 'school_year'
                    ? 'Pass Année Scolaire (9 mois)'
                    : currentLead?.plan === 'quarterly'
                    ? 'Abonnement Trimestriel (3 mois)'
                    : currentLead?.plan === 'monthly'
                    ? 'Abonnement Mensuel'
                    : 'Période d’essai gratuit'}
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  Solde actuel : <strong>{(currentLead?.subscriptionCredits ?? 460) + (currentLead?.extraCredits ?? 0)} corrections</strong> disponibles
                </p>
              </div>

              <button
                type="button"
                onClick={onOpenBilling}
                className="px-5 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
              >
                Gérer la formule & Recharger
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: SECURITY */}
        {activeTab === 'security' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="border-b border-slate-100 pb-4">
              <h2 className="text-base font-extrabold text-slate-900">Sécurité & Confidentialité des données</h2>
              <p className="text-xs text-slate-500">Protection des copies élèves et gestion des accès.</p>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Session de connexion active</h4>
                  <p className="text-[11px] text-slate-500">Connecté via ce navigateur • Dernière activité il y a quelques instants</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Actif
                </span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900">Exportation complète de sauvegarde</h4>
                  <p className="text-[11px] text-slate-500">Téléchargez l'intégralité de vos notes et évaluations archivées.</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const data = localStorage.getItem('praxis_history') || '[]';
                    const blob = new Blob([data], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `praxis_sauvegarde_${new Date().toISOString().slice(0, 10)}.json`;
                    a.click();
                  }}
                  className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600" />
                  <span>Sauvegarder JSON</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit button bar */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="submit"
            className="px-6 py-3 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Enregistrer les paramètres</span>
          </button>
        </div>
      </form>
    </div>
  );
};
