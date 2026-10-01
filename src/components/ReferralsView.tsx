import React, { useState, useEffect } from 'react';
import {
  Gift,
  Copy,
  Check,
  Users,
  Award,
  Clock,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LeadData, ReferralItem } from '../types';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ReferralsViewProps {
  currentLead: LeadData | null;
  onOpenBilling?: () => void;
  onStartCorrection?: () => void;
  onBack?: () => void;
}

export const ReferralsView: React.FC<ReferralsViewProps> = ({
  currentLead,
  onBack,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState<ReferralItem[]>([]);

  // Code de parrainage unique (PRAXIS-XXXXXX)
  const teacherReferralCode = currentLead?.referralCode || (() => {
    const rawName = (currentLead?.name || 'PROF').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
    const prefix = (rawName.substring(0, 4) || 'PROF').padEnd(4, 'X');
    const suffix = (currentLead?.userId || 'DEMO').replace(/[^A-Za-z0-9]/g, '').toUpperCase().substring(0, 4);
    return `PRAXIS-${prefix}${suffix}`;
  })();

  const appOrigin = typeof window !== 'undefined' && !window.location.origin.includes('localhost') && !window.location.origin.includes('run.app')
    ? window.location.origin
    : (typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://praxis-pro.pro');
  const referralLink = `${appOrigin}/register?ref=${teacherReferralCode}`;

  // Récupération des parrainages réels depuis Supabase si connecté
  useEffect(() => {
    let isMounted = true;

    async function loadReferrals() {
      if (!isSupabaseConfigured || !currentLead?.userId) {
        setReferrals([]);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('referrals')
          .select(`
            id,
            referrer_user_id,
            referred_user_id,
            referral_code,
            status,
            reward_granted,
            reward_amount,
            rewarded_at,
            created_at,
            referred:public_profiles_referred_user_id_fkey(full_name, school_name)
          `)
          .eq('referrer_user_id', currentLead.userId)
          .order('created_at', { ascending: false });

        if (error) {
          // Fallback standard sans relation imbriquée si le nom de clé diffère
          const { data: simpleData, error: simpleError } = await supabase
            .from('referrals')
            .select('*')
            .eq('referrer_user_id', currentLead.userId)
            .order('created_at', { ascending: false });

          if (!simpleError && simpleData && isMounted) {
            setReferrals(
              simpleData.map((r: any) => ({
                id: r.id,
                referrerUserId: r.referrer_user_id,
                referredUserId: r.referred_user_id,
                referredName: 'Enseignant invité',
                referralCode: r.referral_code,
                status: r.status,
                rewardGranted: r.reward_granted,
                rewardAmount: r.reward_amount || 50,
                rewardedAt: r.rewarded_at,
                createdAt: r.created_at,
              }))
            );
          }
        } else if (data && isMounted) {
          setReferrals(
            data.map((r: any) => ({
              id: r.id,
              referrerUserId: r.referrer_user_id,
              referredUserId: r.referred_user_id,
              referredName: r.referred?.full_name || 'Enseignant invité',
              referredSchool: r.referred?.school_name,
              referralCode: r.referral_code,
              status: r.status,
              rewardGranted: r.reward_granted,
              rewardAmount: r.reward_amount || 50,
              rewardedAt: r.rewarded_at,
              createdAt: r.created_at,
            }))
          );
        }
      } catch (err) {
        console.warn('[Referrals] Erreur chargement parrainages:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadReferrals();

    return () => {
      isMounted = false;
    };
  }, [currentLead?.userId, teacherReferralCode]);

  // Calcul des statistiques réelles
  const totalInvited = referrals.length;
  const pendingCount = referrals.filter((r) => r.status === 'pending').length;
  const rewardedCount = referrals.filter((r) => r.status === 'rewarded' && r.rewardGranted).length;
  const creditsEarned = rewardedCount * 50;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopiedLink(true);
    try {
      confetti({ particleCount: 40, spread: 50, origin: { y: 0.6 } });
    } catch {}
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(teacherReferralCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `Bonjour cher collègue ! J'utilise le SaaS Praxis pour pré-corriger mes devoirs d'élèves grâce à l'IA Vision. En utilisant mon lien de parrainage, tu reçois 50 crédits offerts en bonus de bienvenue dès ton premier abonnement payé : ${referralLink}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 max-w-5xl mx-auto pb-12">
      {/* Bouton retour en arrière */}
      {onBack && (
        <div className="pt-1">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Retour à l'espace enseignant</span>
          </button>
        </div>
      )}

      {/* 1. EN-TÊTE : PARRAINEZ UN PROFESSEUR */}
      <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-10 shadow-xs relative overflow-hidden">
        <div className="max-w-3xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold border border-blue-200">
            <Gift className="w-3.5 h-3.5 text-blue-600" />
            <span>Programme de parrainage Professeur → Professeur</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Parrainez un professeur
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            Invitez vos collègues enseignants sur Praxis.
            <br />
            Lorsqu'un professeur que vous invitez souscrit son premier abonnement payant,{' '}
            <strong className="text-slate-900 font-bold">vous recevez 50 crédits</strong> et il{' '}
            <strong className="text-slate-900 font-bold">reçoit également 50 crédits en bonus de bienvenue</strong>.
          </p>

          {/* Règle claire */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-600 flex items-start gap-2.5 max-w-2xl mt-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-slate-800">Règle stricte de validation :</span> L'inscription seule donne accès aux 30 corrections d'essai gratuites (aucun crédit de parrainage débloqué). La récompense de parrainage (+50 crédits pour vous, +50 crédits pour votre collègue) est automatiquement débloquée par le système après confirmation du tout premier abonnement payé de votre filleul (hors packs de recharge).
            </div>
          </div>
        </div>

        {/* 2. BLOCS PARTAGE : LIEN & CODE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-6 mt-6 border-t border-slate-100">
          {/* Bloc Votre Lien */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Votre lien :
            </label>
            <div className="bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs font-mono text-slate-800 truncate select-all">
              {referralLink}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Lien copié !</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copier le lien</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="py-2.5 px-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                title="Partager directement sur WhatsApp"
              >
                <MessageCircle className="w-4 h-4" />
                <span className="hidden sm:inline">WhatsApp</span>
              </button>
            </div>
          </div>

          {/* Bloc Votre Code */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <label className="text-xs font-bold text-slate-700 block">
              Votre code :
            </label>
            <div className="bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-base font-mono font-extrabold text-blue-700 flex items-center justify-between">
              <span>{teacherReferralCode}</span>
              <span className="text-[11px] font-sans font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                +50 crédits
              </span>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="w-full py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
            >
              {copiedCode ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Code copié !</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copier le code</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 3. VOS RÉCOMPENSES (STATISTIQUES EXACTES) */}
      <div className="space-y-3">
        <h2 className="text-base font-extrabold text-slate-900">
          Vos récompenses
        </h2>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Professeurs invités
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900 font-mono">
                {totalInvited}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Total des filleuls inscrits</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Parrainages en attente
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-amber-600 font-mono">
                {pendingCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">En attente du 1er abonnement</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Parrainages récompensés
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600 font-mono">
                {rewardedCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Abonnements confirmés</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Crédits gagnés grâce au parrainage
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-blue-600 font-mono">
                +{creditsEarned}
              </span>
            </div>
            <p className="text-[11px] text-blue-600/80 font-medium">Ajoutés à votre solde permanent</p>
          </div>
        </div>
      </div>

      {/* 4. HISTORIQUE */}
      <div className="bg-white rounded-3xl border border-slate-200/90 overflow-hidden shadow-xs">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Historique</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Suivi de l'état de chaque enseignant inscrit avec votre code
            </p>
          </div>
          {loading && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Actualisation...</span>
            </div>
          )}
        </div>

        {referrals.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto border border-blue-100">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">Aucun parrainage pour le moment</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Partagez votre lien de parrainage avec vos collègues enseignants. Dès qu'un professeur s'inscrira et souscrira son premier abonnement, vous recevrez automatiquement 50 crédits et lui également.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copier mon lien de parrainage</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-600 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="py-3 px-6">Professeur invité</th>
                  <th className="py-3 px-6">Statut</th>
                  <th className="py-3 px-6">Récompense</th>
                  <th className="py-3 px-6">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {referrals.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-900">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.referredName.split(' ').map((n) => n[0]).join('').substring(0, 2) || 'PR'}
                        </div>
                        <div>
                          <span>{item.referredName}</span>
                          {item.referredSchool && (
                            <p className="text-[11px] text-slate-400 font-normal">{item.referredSchool}</p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-6">
                      {item.status === 'rewarded' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Récompensé</span>
                        </span>
                      ) : item.status === 'pending' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>En attente</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
                          <span>Annulé</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 font-mono font-bold">
                      {item.status === 'rewarded' ? (
                        <span className="text-emerald-600">+{item.rewardAmount || 50}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>

                    <td className="py-3.5 px-6 text-slate-500 font-mono">
                      {formatDate(item.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
