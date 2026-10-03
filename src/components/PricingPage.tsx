import React, { useState, useEffect } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  X,
  ShieldCheck,
  Lock,
  ArrowRight,
  Sparkles,
  CreditCard,
  Smartphone,
  Info,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { PaywallPlanId, LeadData } from '../types';

interface PricingPageProps {
  currentLead?: LeadData | null;
  initialPlanId?: PaywallPlanId;
  partnerRefCode?: string;
  onPaymentSuccess?: (updatedTeacher: LeadData) => void;
  onStartCorrection: () => void;
  onBackToApp?: () => void;
  onOpenContact?: () => void;
}

export type PricingCardId = 'free' | 'monthly' | 'quarterly' | 'school_year';

interface PlanDefinition {
  id: PricingCardId | 'extra_100' | 'extra_500' | 'extra_1000';
  name: string;
  category: 'free' | 'subscription' | 'pack';
  priceFcfa: number;
  priceEur: number;
  periodLabel: string;
  corrections: number;
  unitCostFcfa?: string;
  monthlyEquivalentFcfa?: string;
  monthlyEquivalentEur?: string;
  savingsLabel?: string;
  badge?: string;
  featured?: boolean;
  description: string;
  features: string[];
  ctaLabel: string;
}

// THE 4 MAIN OFFERS REQUESTED: Gratuit, Mensuel, 3 mois, Année scolaire
const MAIN_OFFERS: PlanDefinition[] = [
  {
    id: 'free',
    name: 'Gratuit',
    category: 'free',
    priceFcfa: 0,
    priceEur: 0,
    periodLabel: 'découverte',
    corrections: 50,
    unitCostFcfa: 'Offert',
    description: 'Pour découvrir la correction intelligente sur vos propres copies d’élèves.',
    features: [
      '50 corrections d’essai offertes',
      'Détection d’écriture manuscrite et barème',
      'Annotations et appréciations détaillées',
      'Multi-pages par copie sans frais',
      'Aucune carte bancaire requise',
    ],
    ctaLabel: 'Commencer gratuitement',
  },
  {
    id: 'monthly',
    name: 'Mensuel',
    category: 'subscription',
    priceFcfa: 5000,
    priceEur: 7.60,
    periodLabel: '/ mois',
    corrections: 500,
    unitCostFcfa: '10 F / correction',
    description: 'Idéal pour une utilisation régulière sans engagement de durée.',
    features: [
      '500 corrections incluses par mois',
      'Report automatique des corrections non utilisées',
      'Cumulable jusqu’à 1 500 corrections',
      'Corrections multi-pages et devoirs illimités',
      'Sans engagement, annulable à tout moment',
    ],
    ctaLabel: 'Choisir cette formule',
  },
  {
    id: 'quarterly',
    name: '3 mois',
    category: 'subscription',
    priceFcfa: 12000,
    priceEur: 18.30,
    periodLabel: 'pour 3 mois',
    corrections: 1500,
    unitCostFcfa: '8 F / correction',
    monthlyEquivalentFcfa: '4 000 FCFA / mois',
    monthlyEquivalentEur: '6,10 € / mois',
    savingsLabel: 'Économisez 3 000 FCFA',
    description: 'La formule équilibrée pour couvrir un trimestre d’enseignement complet.',
    features: [
      '1 500 corrections pour tout le trimestre',
      'Revient à seulement 4 000 FCFA / mois',
      'Économisez 3 000 FCFA par rapport au mensuel',
      'Corrections reportées d’un mois sur l’autre',
      'Export des moyennes et bilans de classe',
    ],
    ctaLabel: 'Choisir cette formule',
  },
  {
    id: 'school_year',
    name: 'Année scolaire',
    category: 'subscription',
    priceFcfa: 30000,
    priceEur: 45.75,
    periodLabel: 'pour 9 mois scolaires',
    corrections: 4500,
    unitCostFcfa: '6,6 F / correction',
    monthlyEquivalentFcfa: '≈ 3 333 FCFA / mois',
    monthlyEquivalentEur: '5,08 € / mois',
    savingsLabel: 'Économisez 15 000 FCFA (soit 3 mois offerts)',
    badge: 'Recommandé pour l’année scolaire',
    featured: true,
    description: 'La formule complète pour corriger sereinement de la rentrée aux examens de fin d’année.',
    features: [
      '4 500 corrections pour toute l’année scolaire',
      'Tarif le plus avantageux : ≈ 3 333 FCFA / mois',
      '3 mois complets offerts par rapport au mensuel',
      'Vos corrections vous accompagnent toute l’année',
      'Assistance prioritaire sur WhatsApp 7j/7',
    ],
    ctaLabel: 'Choisir cette formule',
  },
];

// RECHARGE PACKS (CORRECTIONS SUPPLÉMENTAIRES)
const EXTRA_PACKS: PlanDefinition[] = [
  {
    id: 'extra_100',
    name: '+100 corrections',
    category: 'pack',
    priceFcfa: 1000,
    priceEur: 1.50,
    periodLabel: 'paiement unique',
    corrections: 100,
    unitCostFcfa: '10 F / correction',
    description: 'Recharge ponctuelle pour terminer un devoir ou un contrôle imprévu.',
    features: [
      '+100 corrections ajoutées immédiatement',
      'Sans date d’expiration (crédits permanents)',
      'Utilisable avec ou sans abonnement actif',
    ],
    ctaLabel: 'Acheter +100',
  },
  {
    id: 'extra_500',
    name: '+500 corrections',
    category: 'pack',
    priceFcfa: 5000,
    priceEur: 7.60,
    periodLabel: 'paiement unique',
    corrections: 500,
    unitCostFcfa: '10 F / correction',
    description: 'Idéal pour absorber une série d’examens blancs ou devoirs départementaux.',
    features: [
      '+500 corrections permanentes',
      'Sans aucune date d’expiration',
      'Idéal examens blancs et fins de semestre',
    ],
    ctaLabel: 'Acheter +500',
  },
  {
    id: 'extra_1000',
    name: '+1 000 corrections',
    category: 'pack',
    priceFcfa: 10000,
    priceEur: 15.20,
    periodLabel: 'paiement unique',
    corrections: 1000,
    unitCostFcfa: '10 F / correction',
    description: 'Grand volume économique pour les enseignants ayant de nombreuses classes.',
    features: [
      '+1 000 corrections permanentes',
      'Sans date d’expiration',
      'Gestion sereine des gros effectifs',
    ],
    ctaLabel: 'Acheter +1 000',
  },
];

const PURCHASABLE_PLANS: PlanDefinition[] = [
  ...MAIN_OFFERS.filter((p) => p.category !== 'free'),
  ...EXTRA_PACKS,
];

export const PricingPage: React.FC<PricingPageProps> = ({
  currentLead,
  initialPlanId = 'school_year',
  partnerRefCode,
  onPaymentSuccess,
  onStartCorrection,
  onBackToApp,
  onOpenContact,
}) => {
  const [currency, setCurrency] = useState<'XOF' | 'EUR'>('XOF');
  const [checkoutOpen, setCheckoutOpen] = useState<boolean>(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(
    initialPlanId === 'extra_100' || initialPlanId === 'extra_500' || initialPlanId === 'extra_1000'
      ? initialPlanId
      : (initialPlanId as PaywallPlanId) || 'school_year'
  );
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Form fields
  const [teacherEmail, setTeacherEmail] = useState<string>(currentLead?.email || '');
  const [teacherName, setTeacherName] = useState<string>(currentLead?.name || '');
  const [teacherPhone, setTeacherPhone] = useState<string>(currentLead?.whatsapp || '');

  // Promo code
  const [promoExpanded, setPromoExpanded] = useState<boolean>(false);
  const [promoCodeInput, setPromoCodeInput] = useState<string>('');
  const [isValidatingPromo, setIsValidatingPromo] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    message?: string;
  } | null>(null);
  const [promoError, setPromoError] = useState<string>('');

  // Processing state
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [paymentSuccessData, setPaymentSuccessData] = useState<{
    message: string;
    remainingCopies: number;
    planName: string;
  } | null>(null);

  const selectedPlan =
    PURCHASABLE_PLANS.find((p) => p.id === selectedPlanId) || MAIN_OFFERS[3];

  // Auto-detect promo code from URL
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const codeFromUrl = urlParams.get('promo') || urlParams.get('ref') || partnerRefCode;
    if (codeFromUrl && !appliedPromo) {
      setPromoCodeInput(codeFromUrl.toUpperCase());
      setPromoExpanded(true);
      applyPromoCode(codeFromUrl.toUpperCase());
    }
  }, [partnerRefCode]);

  // Handle Paystack return redirect
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const paystackRef = urlParams.get('paystack_ref') || urlParams.get('reference');
    if (paystackRef) {
      verifyPaystackPayment(paystackRef);
    }
  }, []);

  const verifyPaystackPayment = async (reference: string) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
      const data = await res.json();

      if (res.ok && data.success) {
        try {
          confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
        } catch {
          // ignore
        }

        const planName = data.transaction?.plan
          ? PURCHASABLE_PLANS.find((p) => p.id === data.transaction.plan)?.name || 'Forfait'
          : 'Forfait';

        setPaymentSuccessData({
          message: data.message || 'Paiement confirmé avec succès.',
          remainingCopies: data.remainingCopies || data.teacher?.quota || 0,
          planName,
        });

        if (onPaymentSuccess && data.teacher) {
          onPaymentSuccess(data.teacher);
        }

        const newUrl = window.location.pathname;
        window.history.replaceState({}, document.title, newUrl);
      } else {
        setErrorMsg(data.error || 'Impossible de vérifier la transaction Paystack.');
      }
    } catch {
      setErrorMsg('Erreur réseau lors de la confirmation du paiement.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyPromoCode = async (codeToValidate: string) => {
    const code = codeToValidate.trim().toUpperCase();
    if (!code) {
      setPromoError('Veuillez renseigner un code promo.');
      return;
    }
    setPromoError('');
    setIsValidatingPromo(true);

    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          email: teacherEmail.trim(),
          planId: selectedPlan.id,
          currency,
        }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedPromo({
          code: data.code,
          discountPercent: data.discountPercent,
          message: data.message,
        });
        setPromoError('');
      } else {
        setAppliedPromo(null);
        setPromoError(data.error || 'Code promo invalide ou expiré.');
      }
    } catch {
      setAppliedPromo(null);
      setPromoError('Impossible de valider le code promo.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleOpenCheckout = (planId: PaywallPlanId) => {
    setSelectedPlanId(planId);
    setErrorMsg('');
    setCheckoutOpen(true);
  };

  const handleCloseCheckout = () => {
    setCheckoutOpen(false);
    setErrorMsg('');
  };

  // Price calculations
  const basePriceFcfa = selectedPlan.priceFcfa;
  const basePriceEur = selectedPlan.priceEur;

  const isSubscription = selectedPlan.category === 'subscription';
  const discountPercent = appliedPromo && isSubscription ? appliedPromo.discountPercent : 0;
  const discountFcfa = Math.round(basePriceFcfa * (discountPercent / 100));
  const discountEur = Number((basePriceEur * (discountPercent / 100)).toFixed(2));

  const finalPriceFcfa = Math.max(0, basePriceFcfa - discountFcfa);
  const finalPriceEur = Number(Math.max(0, basePriceEur - discountEur).toFixed(2));

  const handleStartPaystackPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!teacherEmail.trim()) {
      setErrorMsg('Veuillez saisir votre adresse email pour recevoir votre reçu et vos crédits.');
      return;
    }

    setIsProcessing(true);

    try {
      const res = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: selectedPlan.id,
          email: teacherEmail.trim().toLowerCase(),
          name: teacherName.trim() || 'Enseignant',
          whatsapp: teacherPhone.trim(),
          currency: 'XOF',
          promoCode: appliedPromo?.code || undefined,
          callbackUrl: window.location.origin + window.location.pathname,
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de l’initialisation du paiement Paystack.');
      }

      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else {
        throw new Error('URL de paiement non reçue.');
      }
    } catch (err: any) {
      console.error('[Checkout Paystack] Erreur:', err);
      setErrorMsg(err.message || 'Impossible de contacter le service de paiement. Réessayez.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200">
      {/* TOP NAVIGATION / STATUS BAR */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onBackToApp && (
              <button
                type="button"
                onClick={onBackToApp}
                className="text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-blue-700 dark:hover:text-blue-400 flex items-center gap-1.5 py-1.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>←</span>
                <span>Retour à la correction</span>
              </button>
            )}
            <span className="text-xs text-slate-500 dark:text-slate-400 hidden md:inline">
              Praxis · Le copilote de correction des enseignants
            </span>
          </div>

          <div className="flex items-center gap-3">
            {currentLead && (
              <div className="text-xs px-3 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 font-medium">
                Solde actuel : <span className="font-bold">{Math.max(0, (currentLead.quota || 50) - (currentLead.copiesCorrected || 0))}</span> corrections
              </div>
            )}
            {/* Devise switch */}
            <div className="flex items-center rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 bg-slate-100 dark:bg-slate-800 text-xs font-medium">
              <button
                type="button"
                onClick={() => setCurrency('XOF')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  currency === 'XOF'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                FCFA
              </button>
              <button
                type="button"
                onClick={() => setCurrency('EUR')}
                className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                  currency === 'EUR'
                    ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-900'
                }`}
              >
                EUR (€)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {paymentSuccessData && (
        <div className="max-w-4xl mx-auto px-4 mt-6">
          <div className="p-5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                <Check className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-emerald-950 dark:text-emerald-100">
                  {paymentSuccessData.planName} activé avec succès !
                </h4>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 mt-0.5">
                  {paymentSuccessData.message} · Nouveau solde : <strong>{paymentSuccessData.remainingCopies} corrections</strong> disponibles.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onStartCorrection}
              className="text-xs font-bold px-4 py-2 rounded-lg bg-emerald-700 text-white hover:bg-emerald-800 transition-colors shrink-0 cursor-pointer"
            >
              Corriger une copie maintenant →
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      <section className="pt-12 pb-8 sm:pt-16 sm:pb-10 text-center px-4 max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 text-xs font-semibold text-blue-700 dark:text-blue-300 mb-4">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Tarification simple et transparente</span>
        </div>
        <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
          Choisissez votre formule de correction
        </h1>
        <p className="text-sm sm:text-base text-slate-600 dark:text-slate-300 mt-3 max-w-xl mx-auto leading-relaxed">
          Corrigez plus de copies, passez moins de temps à les corriger.
        </p>

        {/* 1 correction = 1 copie */}
        <div className="mt-4 text-xs text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-700 dark:text-slate-300">Règle simple :</span> 1 correction = 1 copie d’élève complète (recto-verso et pages multiples incluses).
        </div>
      </section>

      {/* THE 4 CORE OFFERS (GRATUIT, MENSUEL, 3 MOIS, ANNÉE SCOLAIRE) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {MAIN_OFFERS.map((plan) => {
            const isFeatured = plan.featured;
            const isFree = plan.category === 'free';
            const price = isFree
              ? 'Gratuit'
              : currency === 'XOF'
              ? `${plan.priceFcfa.toLocaleString('fr-FR')} FCFA`
              : `${plan.priceEur.toFixed(2)} €`;

            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl p-6 transition-all duration-200 ${
                  isFeatured
                    ? 'bg-white dark:bg-slate-900 border-2 border-blue-600 dark:border-blue-500 shadow-md ring-1 ring-blue-600/20 md:-translate-y-1'
                    : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
                }`}
              >
                {/* Single recommended badge */}
                {plan.badge && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-blue-600 text-white text-[11px] font-bold tracking-wide shadow-xs whitespace-nowrap">
                    {plan.badge}
                  </div>
                )}

                <div>
                  {/* Plan Name & Tag */}
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                      {plan.name}
                    </h2>
                    {plan.unitCostFcfa && (
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                        {plan.unitCostFcfa}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 min-h-[36px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price Box */}
                  <div className="mt-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-baseline gap-1.5 flex-wrap">
                      <span className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white tabular-nums">
                        {price}
                      </span>
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                        {plan.periodLabel}
                      </span>
                    </div>

                    {/* Calculated monthly rate or summary */}
                    {plan.monthlyEquivalentFcfa ? (
                      <div className="mt-2 text-xs font-semibold text-blue-700 dark:text-blue-400">
                        {currency === 'XOF' ? plan.monthlyEquivalentFcfa : plan.monthlyEquivalentEur}
                        {plan.savingsLabel && (
                          <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-0.5">
                            {plan.savingsLabel}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="mt-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                        {plan.corrections} corrections incluses
                      </div>
                    )}
                  </div>

                  {/* Features list */}
                  <div className="py-4">
                    <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2.5">
                      Inclus dans cette formule :
                    </div>
                    <ul className="space-y-2">
                      {plan.features.map((feat, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-slate-600 dark:text-slate-300 leading-normal">
                          <Check className={`w-3.5 h-3.5 shrink-0 mt-0.5 stroke-[2.5] ${isFeatured ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Call to action button */}
                <div className="pt-4 mt-auto">
                  {isFree ? (
                    <button
                      type="button"
                      onClick={onStartCorrection}
                      className="w-full py-2.5 px-3 rounded-xl text-xs font-bold border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <span>{currentLead ? 'Tester sur une copie' : 'Commencer gratuitement'}</span>
                      <span>→</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(plan.id as PaywallPlanId)}
                      className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                        isFeatured
                          ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm'
                          : 'border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{plan.ctaLabel}</span>
                      <span>→</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CORRECTIONS SUPPLÉMENTAIRES (PACKS DE RECHARGE) */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
          <div className="text-center max-w-xl mx-auto mb-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">
              Besoin de plus de corrections ?
            </h3>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
              Ajoutez des corrections supplémentaires quand votre quota ne suffit plus. Vos corrections achetées restent disponibles séparément de votre abonnement.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {EXTRA_PACKS.map((pack) => {
              const packPrice = currency === 'XOF' ? `${pack.priceFcfa.toLocaleString('fr-FR')} FCFA` : `${pack.priceEur.toFixed(2)} €`;

              return (
                <div
                  key={pack.id}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-2xs"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-base font-bold text-slate-900 dark:text-white">
                        {pack.name}
                      </span>
                      <span className="text-sm font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {packPrice}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {pack.description}
                    </p>

                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                      {pack.features.map((f, i) => (
                        <div key={i} className="text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-2">
                          <Check className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" />
                          <span>{f}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <button
                      type="button"
                      onClick={() => handleOpenCheckout(pack.id as PaywallPlanId)}
                      className="w-full py-2 px-3 text-xs font-bold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>{pack.ctaLabel}</span>
                      <span>→</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* TABLEAU COMPARATIF SIMPLE */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 pb-20">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
          <div className="text-center mb-8">
            <h3 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white">
              Synthèse comparative des formules
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Toutes les formules bénéficient du moteur de correction complet Praxis.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-800 dark:text-slate-200 font-semibold">
                  <th className="py-3 px-4">Critère</th>
                  <th className="py-3 px-3 text-center">Gratuit</th>
                  <th className="py-3 px-3 text-center">Mensuel</th>
                  <th className="py-3 px-3 text-center">3 mois</th>
                  <th className="py-3 px-3 text-center font-bold text-blue-700 dark:text-blue-400">Année scolaire</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-slate-600 dark:text-slate-300">
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Corrections incluses</td>
                  <td className="py-3 px-3 text-center">50 copies</td>
                  <td className="py-3 px-3 text-center">500 / mois</td>
                  <td className="py-3 px-3 text-center">1 500 total</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">4 500 total</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Tarif total</td>
                  <td className="py-3 px-3 text-center font-semibold text-emerald-600">0 FCFA</td>
                  <td className="py-3 px-3 text-center">5 000 FCFA</td>
                  <td className="py-3 px-3 text-center">12 000 FCFA</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">30 000 FCFA</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Coût mensuel équivalent</td>
                  <td className="py-3 px-3 text-center">—</td>
                  <td className="py-3 px-3 text-center">5 000 FCFA / m</td>
                  <td className="py-3 px-3 text-center">4 000 FCFA / m</td>
                  <td className="py-3 px-3 text-center font-bold text-blue-700 dark:text-blue-400">≈ 3 333 FCFA / m</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Report des crédits non utilisés</td>
                  <td className="py-3 px-3 text-center">Sans limite</td>
                  <td className="py-3 px-3 text-center">Jusqu'à 1 500</td>
                  <td className="py-3 px-3 text-center">Oui</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">Toute l'année</td>
                </tr>
                <tr>
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-white">Packs de recharge compatibles</td>
                  <td className="py-3 px-3 text-center">Oui</td>
                  <td className="py-3 px-3 text-center">Oui</td>
                  <td className="py-3 px-3 text-center">Oui</td>
                  <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">Oui</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* FAQ DE 5 QUESTIONS PRÉCISES */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 pb-24">
        <div className="border-t border-slate-200 dark:border-slate-800 pt-12">
          <h3 className="text-xl font-bold text-center text-slate-900 dark:text-white mb-8">
            Questions fréquentes
          </h3>

          <div className="space-y-3">
            {[
              {
                q: 'Qu’est-ce qu’une correction ?',
                a: 'Une correction correspond à une copie d’élève, même si cette copie contient plusieurs pages (recto-verso, copies doubles). Le nombre de pages ne change pas le décompte en corrections.',
              },
              {
                q: 'Que se passe-t-il si je dépasse mes 500 corrections ?',
                a: 'Vos corrections ne sont jamais interrompues. Vous pouvez à tout moment ajouter une recharge de +100, +500 ou +1 000 corrections pour continuer à corriger sans modifier votre formule en cours.',
              },
              {
                q: 'Mes corrections restantes disparaissent-elles à la fin de mon abonnement ?',
                a: 'Non. Vos recharges achetées restent acquises sans date d’expiration. Pour vos crédits d’abonnement, ils sont gelés à l’échéance et sont immédiatement réactivés dès le renouvellement de votre formule.',
              },
              {
                q: 'Quels moyens de paiement sont disponibles ?',
                a: 'Les paiements sont traités de manière sécurisée et instantanée par Paystack. Vous pouvez régler par Mobile Money (Wave, Orange Money, MTN MoMo, Moov) ou par Carte bancaire (Visa, Mastercard).',
              },
              {
                q: 'Les copies de mes élèves sont-elles sécurisées ?',
                a: 'Oui. Les photos et devoirs importés sont traités uniquement dans le cadre de la pré-correction pédagogique demandée. Vos documents restent confidentiels et sous votre contrôle final.',
              },
            ].map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden"
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 text-xs sm:text-sm font-semibold text-slate-900 dark:text-white cursor-pointer"
                  >
                    <span>{faq.q}</span>
                    <span className="text-slate-400 shrink-0">
                      {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-4 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {onOpenContact && (
            <div className="text-center mt-8">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Vous représentez un établissement scolaire ou une coordination ?{' '}
                <button
                  type="button"
                  onClick={onOpenContact}
                  className="font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Contactez notre équipe
                </button>
              </p>
            </div>
          )}
        </div>
      </section>

      {/* CHECKOUT SLIDE-OVER (SÉPARÉ DE LA GRILLE, PROPRE ET SANS IMAGES INEXACTES) */}
      {checkoutOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={handleCloseCheckout}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-4 sm:pl-16">
            <div className="w-screen max-w-lg bg-white dark:bg-slate-900 shadow-2xl flex flex-col justify-between border-l border-slate-200 dark:border-slate-800 animate-in slide-in-from-right duration-200">
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    Finaliser votre commande
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Activation instantanée · Paiement sécurisé Paystack
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCloseCheckout}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Résumé de commande */}
                <div className="rounded-xl p-4 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                    <span>Formule choisie :</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wide">
                      {selectedPlan.category === 'subscription' ? 'Abonnement' : 'Recharge'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-baseline justify-between">
                    <div>
                      <h4 className="text-base font-bold text-slate-900 dark:text-white">
                        {selectedPlan.name}
                      </h4>
                      <div className="text-xs text-slate-600 dark:text-slate-300 mt-0.5">
                        {selectedPlan.corrections} corrections incluses
                      </div>
                    </div>

                    <div className="text-right">
                      {discountPercent > 0 ? (
                        <div>
                          <span className="text-xs line-through text-slate-400 block tabular-nums">
                            {currency === 'XOF' ? `${basePriceFcfa.toLocaleString('fr-FR')} F` : `${basePriceEur.toFixed(2)} €`}
                          </span>
                          <span className="text-lg font-extrabold text-blue-700 dark:text-blue-400 tabular-nums">
                            {currency === 'XOF' ? `${finalPriceFcfa.toLocaleString('fr-FR')} FCFA` : `${finalPriceEur.toFixed(2)} €`}
                          </span>
                        </div>
                      ) : (
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tabular-nums">
                          {currency === 'XOF' ? `${basePriceFcfa.toLocaleString('fr-FR')} FCFA` : `${basePriceEur.toFixed(2)} €`}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                    <span>1 correction = 1 copie d’élève (multi-pages)</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">
                      {selectedPlan.unitCostFcfa}
                    </span>
                  </div>
                </div>

                {/* Moyens de paiement (Texte & Badges typographiques propres - SANS images inexactes) */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                    Moyens de paiement acceptés via Paystack :
                  </label>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Wave</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Mobile Money</div>
                    </div>
                    <div className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Orange</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Orange Money</div>
                    </div>
                    <div className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">MTN & Moov</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">MoMo & Moov</div>
                    </div>
                    <div className="py-2.5 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-center">
                      <div className="text-xs font-bold text-slate-900 dark:text-white">Cartes CB</div>
                      <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5">Visa / Mastercard</div>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
                    Réglez en toute sécurité par Mobile Money ou Carte bancaire. Aucun compte Paystack requis, déblocage automatique immédiat.
                  </p>
                </div>

                {/* Formulaire client */}
                <form id="checkout-form" onSubmit={handleStartPaystackPayment} className="space-y-4">
                  <div>
                    <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                      Votre adresse email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={teacherEmail}
                      onChange={(e) => setTeacherEmail(e.target.value)}
                      placeholder="professeur@etablissement.ci"
                      className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                    />
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 block">
                      Votre reçu et vos crédits de correction seront attribués à cette adresse.
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                        Nom complet (optionnel)
                      </label>
                      <input
                        type="text"
                        value={teacherName}
                        onChange={(e) => setTeacherName(e.target.value)}
                        placeholder="M. / Mme Nom"
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-800 dark:text-slate-200 block mb-1">
                        Numéro WhatsApp (optionnel)
                      </label>
                      <input
                        type="tel"
                        value={teacherPhone}
                        onChange={(e) => setTeacherPhone(e.target.value)}
                        placeholder="+225 07..."
                        className="w-full text-xs px-3.5 py-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-blue-600"
                      />
                    </div>
                  </div>
                </form>

                {/* Promo Code Toggle */}
                <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                  {!promoExpanded && !appliedPromo ? (
                    <button
                      type="button"
                      onClick={() => setPromoExpanded(true)}
                      className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                    >
                      Vous avez un code promo ?
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                          Code promo
                        </label>
                        {!appliedPromo && (
                          <button
                            type="button"
                            onClick={() => {
                              setPromoExpanded(false);
                              setPromoError('');
                            }}
                            className="text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            Annuler
                          </button>
                        )}
                      </div>

                      {appliedPromo ? (
                        <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-xs text-emerald-800 dark:text-emerald-300">
                          <div className="flex items-center gap-2">
                            <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                            <span>Code <strong>{appliedPromo.code}</strong> appliqué (-{appliedPromo.discountPercent}%)</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setAppliedPromo(null)}
                            className="text-[11px] font-medium text-emerald-900 dark:text-emerald-200 underline cursor-pointer"
                          >
                            Retirer
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={promoCodeInput}
                            onChange={(e) => setPromoCodeInput(e.target.value.toUpperCase())}
                            placeholder="Ex: PROMO30"
                            className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase"
                          />
                          <button
                            type="button"
                            disabled={isValidatingPromo || !promoCodeInput.trim()}
                            onClick={() => applyPromoCode(promoCodeInput)}
                            className="px-3 py-2 text-xs font-bold rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 transition-colors cursor-pointer"
                          >
                            {isValidatingPromo ? '...' : 'Appliquer'}
                          </button>
                        </div>
                      )}

                      {promoError && (
                        <p className="text-[11px] text-red-600 dark:text-red-400">
                          {promoError}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300">
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 space-y-3">
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isProcessing}
                  className="w-full py-3.5 px-4 rounded-xl text-sm font-bold bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-60 transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isProcessing ? (
                    <span>Connexion à Paystack...</span>
                  ) : (
                    <>
                      <span>Payer {currency === 'XOF' ? `${finalPriceFcfa.toLocaleString('fr-FR')} FCFA` : `${finalPriceEur.toFixed(2)} €`}</span>
                      <span>→</span>
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Paiement chiffré 256-bit opéré par Paystack · Validation instantanée</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
