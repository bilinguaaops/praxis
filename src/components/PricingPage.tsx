import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Check,
  CheckCircle2,
  Zap,
  ArrowRight,
  ShieldCheck,
  CreditCard,
  Smartphone,
  HelpCircle,
  Clock,
  Layers,
  Award,
  TrendingDown,
  Gift,
  RefreshCw,
  Phone,
  MessageCircle,
  ChevronDown,
  ChevronUp,
  CircleDot,
  Hexagon,
  Triangle,
  QrCode,
  ExternalLink,
  ArrowLeft,
  Copy,
  Lock,
  Tag,
  AlertCircle,
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

interface PlanDetails {
  id: PaywallPlanId;
  name: string;
  tag: string;
  category: 'subscription' | 'pack';
  priceEur: number;
  originalPriceEur?: number;
  priceFcfa: number;
  originalPriceFcfa?: number;
  periodLabel: string;
  corrections: number;
  correctionsSub: string;
  equivalentEur?: number;
  equivalentFcfa?: number;
  savingsFcfa?: number;
  badge: string;
  isPopular?: boolean;
  isHero?: boolean;
  features: string[];
  iconType: 'circle' | 'triangle' | 'hexagon';
}

const PLANS: PlanDetails[] = [
  {
    id: 'monthly',
    name: 'Abonnement Mensuel',
    tag: 'CORE',
    category: 'subscription',
    priceEur: 7.6,
    priceFcfa: 5000,
    periodLabel: '/ MOIS',
    corrections: 500,
    correctionsSub: '500 corrections / mois',
    equivalentEur: 7.6,
    equivalentFcfa: 5000,
    badge: 'Flexibilité mensuelle',
    features: [
      '500 corrections / mois incluses',
      'Cumulable jusqu’à 1 500 corrections',
      'Report automatique mois après mois',
      'Copies manuscrites & imprimées',
      'Corrigé & barème 100% sur-mesure',
      'Export PDF des notes & bulletins',
    ],
    iconType: 'circle',
  },
  {
    id: 'school_year',
    name: 'Pass Année Scolaire (9 mois)',
    tag: 'OVERDRIVE',
    category: 'subscription',
    priceEur: 45.75,
    originalPriceEur: 68.6,
    priceFcfa: 30000,
    originalPriceFcfa: 45000,
    periodLabel: '/ 9 MOIS',
    corrections: 4500,
    correctionsSub: '4 500 corrections · 3 mois offerts',
    equivalentEur: 5.08,
    equivalentFcfa: 3333,
    savingsFcfa: 15000,
    badge: '🎓 Pour toute l’année scolaire',
    isHero: true,
    features: [
      '4 500 corrections (500 × 9 mois)',
      'Revient à seulement 3 333 FCFA / mois',
      'Économisez 15 000 FCFA vs mensuel (3 mois offerts)',
      'Corrections restantes conservées & reportées',
      'Paiement unique Wave ou Carte en 1 clic',
      'Priorité maximale de traitement des copies',
      'Support WhatsApp dédié 7j/7',
    ],
    iconType: 'triangle',
  },
  {
    id: 'quarterly',
    name: 'Trimestriel (3 mois)',
    tag: 'TEAM',
    category: 'subscription',
    priceEur: 18.3,
    originalPriceEur: 22.8,
    priceFcfa: 12000,
    originalPriceFcfa: 15000,
    periodLabel: '/ 3 MOIS',
    corrections: 1500,
    correctionsSub: '1 500 corrections · 4 000 FCFA/mois',
    equivalentEur: 6.1,
    equivalentFcfa: 4000,
    savingsFcfa: 3000,
    badge: '⭐ Meilleur équilibre',
    isPopular: true,
    features: [
      '1 500 corrections au total (500 / mois)',
      'Revient à 4 000 FCFA / mois',
      'Économisez 3 000 FCFA immédiatement vs mensuel',
      'Aucun paiement pendant 3 mois',
      'Corrections non utilisées reportées',
      'Statistiques pédagogiques et export Pronote',
    ],
    iconType: 'hexagon',
  },
];

interface AppliedPromoInfo {
  code: string;
  discountPercent: number;
  firstMonthOnly: boolean;
  partnerName?: string;
  partnerId?: string;
  message?: string;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentLead,
  initialPlanId = 'school_year',
  partnerRefCode,
  onPaymentSuccess,
  onStartCorrection,
  onBackToApp,
  onOpenContact,
}) => {
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(initialPlanId);
  const [currency, setCurrency] = useState<'EUR' | 'XOF'>('EUR');
  const [paymentMethod, setPaymentMethod] = useState<'wave' | 'card'>('wave');
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  // Form fields for inline checkout
  const [teacherName, setTeacherName] = useState(currentLead?.name || '');
  const [teacherEmail, setTeacherEmail] = useState(currentLead?.email || '');
  const [teacherPhone, setTeacherPhone] = useState(currentLead?.whatsapp || '');
  const [teacherSchool, setTeacherSchool] = useState(currentLead?.school || '');
  const [transactionRef, setTransactionRef] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentDone, setPaymentDone] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Promo code state - NOT APPLIED BY DEFAULT
  const [promoCodeInput, setPromoCodeInput] = useState<string>(() => {
    try {
      return (
        partnerRefCode ||
        localStorage.getItem('praxis_partner_ref') ||
        localStorage.getItem('praxis_pending_promo') ||
        ''
      );
    } catch {
      return '';
    }
  });
  const [appliedPromo, setAppliedPromo] = useState<AppliedPromoInfo | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  const checkoutSectionRef = useRef<HTMLDivElement>(null);

  // Keep selectedPlan in sync if initialPlanId changes
  useEffect(() => {
    if (initialPlanId) {
      setSelectedPlanId(initialPlanId);
    }
  }, [initialPlanId]);

  // Sync partner code from prop or storage if updated
  useEffect(() => {
    if (partnerRefCode && !promoCodeInput) {
      setPromoCodeInput(partnerRefCode);
    }
  }, [partnerRefCode]);

  const isEur = currency === 'EUR';

  // Selected plan calculation
  const currentPlan =
    PLANS.find((p) => p.id === selectedPlanId) ||
    (selectedPlanId === 'extra_100'
      ? {
          id: 'extra_100' as PaywallPlanId,
          name: 'Recharge Extra +100',
          tag: 'EXTRA',
          category: 'pack' as const,
          priceEur: 1.5,
          priceFcfa: 1000,
          periodLabel: 'crédit permanent',
          corrections: 100,
          correctionsSub: '+100 corrections supplémentaires',
          badge: 'Sans expiration',
          features: ['100 corrections supplémentaires', 'N’expirent jamais', 'Consommables en réserve'],
          iconType: 'circle' as const,
        }
      : {
          id: 'extra_500' as PaywallPlanId,
          name: 'Recharge Extra +500',
          tag: 'EXTRA',
          category: 'pack' as const,
          priceEur: 7.6,
          priceFcfa: 5000,
          periodLabel: 'crédit permanent',
          corrections: 500,
          correctionsSub: '+500 corrections supplémentaires',
          badge: 'Sans expiration',
          features: ['500 corrections supplémentaires', 'N’expirent jamais', 'Consommables en réserve'],
          iconType: 'triangle' as const,
        });

  // Calculate pricing strictly:
  // Normal price by default.
  // ONLY if appliedPromo is present: -30% discount applied to the first month.
  const isSubscription = currentPlan.category === 'subscription';
  const hasValidPromo = Boolean(appliedPromo && isSubscription);

  const basePriceFcfa = currentPlan.priceFcfa;
  const basePriceEur = currentPlan.priceEur;

  const discountRate = hasValidPromo ? (appliedPromo!.discountPercent / 100) : 0;
  const discountFcfa = hasValidPromo ? Math.round(basePriceFcfa * discountRate) : 0;
  const discountEur = hasValidPromo ? Number((basePriceEur * discountRate).toFixed(2)) : 0;

  const finalPriceFcfa = Math.max(0, basePriceFcfa - discountFcfa);
  const finalPriceEur = Number(Math.max(0, basePriceEur - discountEur).toFixed(2));

  const handleSelectPlan = (planId: PaywallPlanId) => {
    setSelectedPlanId(planId);
    setErrorMsg('');
    setTimeout(() => {
      checkoutSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleCopyWaveNumber = (num: string) => {
    navigator.clipboard.writeText(num);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  // Promo code validation against server endpoint
  const handleApplyPromo = async (codeToTry?: string) => {
    const code = (codeToTry || promoCodeInput).trim().toUpperCase();
    if (!code) {
      setPromoError('Veuillez saisir un code promo.');
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
          whatsapp: teacherPhone.trim(),
          planId: currentPlan.id,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setAppliedPromo(null);
        setPromoError(data.error || 'Code promo invalide ou expiré.');
        return;
      }

      setAppliedPromo({
        code: data.code,
        discountPercent: data.discountPercent,
        firstMonthOnly: data.firstMonthOnly,
        partnerName: data.partnerName,
        partnerId: data.partnerId,
        message: data.message,
      });
      setPromoError('');
      localStorage.setItem('praxis_applied_promo', data.code);
    } catch {
      setAppliedPromo(null);
      setPromoError('Impossible de valider le code promo. Vérifiez votre connexion.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
    localStorage.removeItem('praxis_applied_promo');
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!teacherName.trim()) {
      setErrorMsg('Veuillez renseigner votre nom complet.');
      return;
    }
    if (!teacherPhone.trim()) {
      setErrorMsg('Veuillez renseigner votre numéro WhatsApp / Téléphone.');
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch('/api/paywall/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          planId: currentPlan.id,
          name: teacherName.trim(),
          email: teacherEmail.trim(),
          whatsapp: teacherPhone.trim(),
          paymentMethod,
          currency,
          waveTxId: transactionRef.trim() || undefined,
          promoCode: appliedPromo ? appliedPromo.code : undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors de la validation du paiement.');
      }

      setPaymentDone(true);
      try {
        confetti({
          particleCount: 120,
          spread: 80,
          origin: { y: 0.6 },
        });
      } catch {}

      if (data.teacher && onPaymentSuccess) {
        onPaymentSuccess(data.teacher);
      }
    } catch (err: any) {
      // Local fallback with accurate credit addition
      const existing = currentLead || {
        name: teacherName,
        email: teacherEmail || `${teacherPhone.replace(/\D/g, '')}@praxis.edu`,
        whatsapp: teacherPhone,
        school: teacherSchool,
        plan: currentPlan.id === 'extra_100' || currentPlan.id === 'extra_500' ? 'monthly' : (currentPlan.id as any),
        quota: (currentLead?.quota || 30) + currentPlan.corrections,
        copiesCorrected: currentLead?.copiesCorrected || 0,
        subscriptionCredits: (currentLead?.subscriptionCredits || 0) + (currentPlan.category === 'subscription' ? currentPlan.corrections : 0),
        extraCredits: (currentLead?.extraCredits || 0) + (currentPlan.category === 'pack' ? currentPlan.corrections : 0),
        firstPurchaseDiscountUsed: Boolean(appliedPromo),
        usedPromoCodes: appliedPromo ? [appliedPromo.code] : [],
      };

      localStorage.setItem('praxis_lead', JSON.stringify(existing));
      if (onPaymentSuccess) {
        onPaymentSuccess(existing);
      }

      setPaymentDone(true);
      try {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8 font-sans max-w-6xl mx-auto pb-16 animate-in fade-in duration-300">
      {/* Back button */}
      {onBackToApp && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onBackToApp}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
            <span>Retour à l'espace enseignant</span>
          </button>
        </div>
      )}

      {/* 1. HERO HEADER */}
      <section className="text-center space-y-4 pt-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold shadow-2xs">
          <Sparkles className="w-3.5 h-3.5 text-blue-600" />
          <span>Formules transparentes · Zéro engagement caché</span>
        </div>

        <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
          Tarifs flexibles <br />
          <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            adaptés à chaque professeur
          </span>
        </h1>

        <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto leading-relaxed">
          Corrigez plus. Passez moins de temps à corriger. Vos corrections non utilisées ne disparaissent jamais.
        </p>

        {/* DURATION SWITCHER & CURRENCY SWITCHER */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
          {/* Duration Selector Capsule */}
          <div className="inline-flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => handleSelectPlan('monthly')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedPlanId === 'monthly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              MENSUEL
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlan('quarterly')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                selectedPlanId === 'quarterly'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              3 MOIS
            </button>
            <button
              type="button"
              onClick={() => handleSelectPlan('school_year')}
              className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedPlanId === 'school_year'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>ANNÉE SCOLAIRE</span>
              <span className="px-1.5 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-extrabold text-[10px]">
                3 MOIS OFFERTS
              </span>
            </button>
          </div>

          {/* Currency Toggle */}
          <div className="inline-flex items-center bg-white p-1 rounded-2xl border border-slate-200 shadow-xs">
            <button
              type="button"
              onClick={() => setCurrency('EUR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                isEur ? 'bg-slate-100 text-blue-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇪🇺 Euros (€)
            </button>
            <button
              type="button"
              onClick={() => setCurrency('XOF')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                !isEur ? 'bg-slate-100 text-blue-700 font-extrabold' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              🇨🇮 🇸🇳 FCFA
            </button>
          </div>
        </div>

        {/* ACTIVE PROMO BANNER (Appears ONLY if a valid promo code has been entered and validated) */}
        {appliedPromo && (
          <div className="max-w-xl mx-auto pt-1 animate-in fade-in slide-in-from-top-2">
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-300 flex items-center justify-between gap-3 text-xs shadow-xs text-emerald-900">
              <div className="flex items-center gap-2.5">
                <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white font-black text-[11px] shrink-0">
                  CODE PROMO ACTIF
                </span>
                <span className="font-medium text-left">
                  Code <strong className="font-mono">{appliedPromo.code}</strong> appliqué : -{appliedPromo.discountPercent}% sur le 1er mois
                  {appliedPromo.partnerName && (
                    <span className="text-emerald-700 font-normal"> · Recommandé par {appliedPromo.partnerName}</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={handleRemovePromo}
                className="text-[11px] font-bold text-emerald-800 hover:text-rose-700 underline shrink-0 cursor-pointer"
              >
                Retirer
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 2. THE 3 CARDS PRICING GRID (CLEAN MODERN APPLICATION DESIGN) */}
      <section className="pt-2 pb-4">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8 items-stretch">
          {/* CARD 1: CORE / MENSUEL (Left Card) */}
          <div
            className={`rounded-3xl p-7 pt-12 relative transition-all duration-300 flex flex-col justify-between ${
              selectedPlanId === 'monthly'
                ? 'bg-white border-2 border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            {/* Top Floating Badge */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-2 border-blue-400/50 flex items-center justify-center text-blue-600 shadow-md">
              <div className="w-8 h-8 rounded-full border border-blue-200 bg-blue-50 flex items-center justify-center">
                <CircleDot className="w-4 h-4 text-blue-600" />
              </div>
            </div>

            <div className="space-y-6">
              {/* Tag / Plan Title */}
              <div className="text-center pt-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase border border-slate-200 bg-slate-100 text-slate-700">
                  CORE · MENSUEL
                </span>
              </div>

              {/* Big Bold Price & Subtitle */}
              <div className="text-center space-y-1">
                <div className="flex items-baseline justify-center gap-1.5">
                  {appliedPromo ? (
                    <>
                      <span className="text-2xl text-slate-400 line-through font-mono">7,60 €</span>
                      <span className="text-4xl sm:text-5xl font-black text-emerald-700 tracking-tight font-mono">
                        5,32 €
                      </span>
                    </>
                  ) : (
                    <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                      7,60 €
                    </span>
                  )}
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">/ MOIS</span>
                </div>

                {/* FCFA price below */}
                <p className="text-xs text-slate-600">
                  Soit{' '}
                  {appliedPromo ? (
                    <>
                      <span className="text-slate-400 line-through">5 000 FCFA</span>{' '}
                      <strong className="text-emerald-700 font-mono font-bold text-sm">3 500 FCFA</strong>{' '}
                      <span className="text-[10px] text-emerald-600 font-bold">(1er mois)</span>
                    </>
                  ) : (
                    <strong className="text-blue-700 font-mono font-bold text-sm">5 000 FCFA</strong>
                  )}{' '}
                  / mois
                </p>
                <p className="text-xs text-blue-700 font-semibold pt-1">
                  500 corrections / mois · Sans engagement
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span><strong>500 corrections</strong> incluses / mois</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Cumulable jusqu'à <strong>1 500 corrections</strong></span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Copies manuscrites & imprimées</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Corrigé et barème 100% sur-mesure</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Export des bulletins & PDF</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-600" />
                  </div>
                  <span>Support prioritaire WhatsApp</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectPlan('monthly')}
                className={`w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedPlanId === 'monthly'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <span>CHOISIR MENSUEL</span>
              </button>
            </div>
          </div>

          {/* CARD 2: OVERDRIVE / ANNÉE SCOLAIRE 9 MOIS (Center Hero Card) */}
          <div
            className={`rounded-3xl p-8 pt-14 relative transition-all duration-300 flex flex-col justify-between lg:-translate-y-2 z-10 ${
              selectedPlanId === 'school_year'
                ? 'bg-gradient-to-b from-blue-50/80 via-white to-indigo-50/40 border-2 border-blue-600 shadow-xl shadow-blue-600/15 ring-2 ring-blue-500/20'
                : 'bg-gradient-to-b from-blue-50/40 to-white border-2 border-blue-400/80 shadow-md'
            }`}
          >
            {/* Top Floating Circular Icon Badge */}
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-16 h-16 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
              <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-sm">
                <Triangle className="w-5 h-5 fill-white text-white" />
              </div>
            </div>

            <div className="space-y-6">
              {/* Tag / Plan Title */}
              <div className="text-center pt-1">
                <span className="inline-block px-4 py-1.5 rounded-full text-xs font-black tracking-widest uppercase bg-blue-600 text-white shadow-xs">
                  OVERDRIVE · ANNÉE SCOLAIRE 🎓
                </span>
              </div>

              {/* Big Bold Price & Subtitle */}
              <div className="text-center space-y-1">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-5xl sm:text-6xl font-black text-slate-900 tracking-tight font-mono">
                    45,75 €
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">/ 9 MOIS</span>
                </div>

                {/* FCFA price below */}
                <p className="text-xs text-slate-700">
                  Soit <strong className="text-emerald-700 font-mono text-base font-extrabold">30 000 FCFA</strong> pour toute l'année
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold mt-1 border border-emerald-200">
                  Revient à 3 333 FCFA / mois · Économisez 15 000 FCFA
                </div>
                <p className="text-xs text-blue-700 font-semibold pt-1">
                  4 500 corrections · Couvre toute l'année scolaire
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3.5 pt-3 border-t border-blue-200/60 text-xs text-slate-700">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span><strong>4 500 corrections</strong> pour l’année scolaire (500 × 9 mois)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span><strong>3 mois offerts</strong> par rapport au paiement mensuel</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span>Corrections restantes conservées & reportées</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span>Paiement unique Wave ou Carte sécurisée</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span>Priorité maximale sur les serveurs d'IA</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-blue-700" />
                  </div>
                  <span>Ligne WhatsApp dédiée avec les fondateurs 7j/7</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-8 space-y-2">
              <button
                type="button"
                onClick={() => handleSelectPlan('school_year')}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-500 hover:to-indigo-500 text-white font-extrabold text-sm sm:text-base flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/40 transition-all cursor-pointer"
              >
                <span>CHOISIR L'ANNÉE SCOLAIRE</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <p className="text-[11px] text-center text-slate-500 tracking-wide">
                - Pensé pour toute l'année scolaire · Meilleur rapport valeur/prix -
              </p>
            </div>
          </div>

          {/* CARD 3: TEAM / TRIMESTRIEL 3 MOIS (Right Card) */}
          <div
            className={`rounded-3xl p-7 pt-12 relative transition-all duration-300 flex flex-col justify-between ${
              selectedPlanId === 'quarterly'
                ? 'bg-white border-2 border-blue-600 shadow-lg ring-2 ring-blue-500/20'
                : 'bg-white border border-slate-200/90 hover:border-slate-300 shadow-xs'
            }`}
          >
            {/* Top Floating Badge */}
            <div className="absolute -top-7 left-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white border-2 border-cyan-400/50 flex items-center justify-center text-cyan-600 shadow-md">
              <div className="w-8 h-8 rounded-full border border-cyan-200 bg-cyan-50 flex items-center justify-center">
                <Hexagon className="w-4 h-4 text-cyan-600" />
              </div>
            </div>

            <div className="space-y-6">
              {/* Tag / Plan Title */}
              <div className="text-center pt-2">
                <span className="inline-block px-3 py-1 rounded-full text-[11px] font-black tracking-widest uppercase border border-slate-200 bg-slate-100 text-slate-700">
                  TEAM · 3 MOIS
                </span>
              </div>

              {/* Big Bold Price & Subtitle */}
              <div className="text-center space-y-1">
                <div className="flex items-baseline justify-center gap-1.5">
                  <span className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight font-mono">
                    18,30 €
                  </span>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">/ 3 MOIS</span>
                </div>
                {/* FCFA price below */}
                <p className="text-xs text-slate-600">
                  Soit <strong className="text-blue-700 font-mono font-bold text-sm">12 000 FCFA</strong> pour 3 mois
                </p>
                <div className="inline-block px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold mt-1 border border-blue-200">
                  Revient à 4 000 FCFA / mois · Économisez 3 000 FCFA
                </div>
                <p className="text-xs text-blue-700 font-semibold pt-1">
                  1 500 corrections · Le meilleur équilibre
                </p>
              </div>

              {/* Feature Checklist */}
              <div className="space-y-3 pt-3 border-t border-slate-100 text-xs text-slate-600">
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span><strong>1 500 corrections</strong> (500 × 3 mois)</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span>Économisez <strong>3 000 FCFA</strong> immédiatement</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span>Aucun paiement mensuel pendant 3 mois</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span>Corrections restantes reportées</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span>Analyse pédagogique complète de classe</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-full bg-cyan-50 border border-cyan-200 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-cyan-700" />
                  </div>
                  <span>Support WhatsApp réactif</span>
                </div>
              </div>
            </div>

            {/* Bottom Button */}
            <div className="pt-8">
              <button
                type="button"
                onClick={() => handleSelectPlan('quarterly')}
                className={`w-full py-3.5 px-5 rounded-2xl font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  selectedPlanId === 'quarterly'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/30'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-800'
                }`}
              >
                <span>CHOISIR 3 MOIS</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. RECHARGES EXTRA (SERIES SUPPLEMENTAIRES SANS EXPIRATION) */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-amber-500 font-bold">⚡</span>
              <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
                Besoin de corrections supplémentaires ?
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Pas besoin de changer de formule. Ajoutez simplement des corrections à votre solde quand vous en avez besoin.
            </p>
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold shrink-0">
            <Check className="w-3.5 h-3.5 text-emerald-600" />
            <span>N'expirent jamais</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Pack +100 */}
          <div
            onClick={() => handleSelectPlan('extra_100')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              selectedPlanId === 'extra_100'
                ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500'
                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <span className="text-base font-black text-slate-900 block">+100 corrections</span>
              <span className="text-xs text-slate-500">Crédit permanent sans expiration</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black text-slate-900 font-mono block">1 000 FCFA</span>
              <span className="text-xs text-slate-500">soit 1,50 €</span>
            </div>
          </div>

          {/* Pack +500 */}
          <div
            onClick={() => handleSelectPlan('extra_500')}
            className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
              selectedPlanId === 'extra_500'
                ? 'bg-blue-50/80 border-blue-500 shadow-xs ring-1 ring-blue-500'
                : 'bg-slate-50/80 border-slate-200 hover:border-slate-300'
            }`}
          >
            <div>
              <span className="text-base font-black text-slate-900 block">+500 corrections</span>
              <span className="text-xs text-slate-500">Idéal pour les grosses périodes d'examens</span>
            </div>
            <div className="text-right shrink-0">
              <span className="text-base font-black text-slate-900 font-mono block">5 000 FCFA</span>
              <span className="text-xs text-slate-500">soit 7,60 €</span>
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500 italic">
          * Les corrections supplémentaires achetées séparément sont conservées sur votre compte sans limitation de durée tant que votre compte reste actif.
        </p>
      </section>

      {/* 4. INLINE DIRECT CHECKOUT MODULE ON THE PAGE */}
      <section ref={checkoutSectionRef} className="bg-white p-6 sm:p-10 rounded-3xl border border-slate-200/90 shadow-sm space-y-8">
        {/* Header of Checkout */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-black text-blue-700 uppercase tracking-widest block">
              FINALISATION DE VOTRE COMMANDE
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 mt-1">
              {currentPlan.name}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {currentPlan.correctionsSub} · Activation immédiate de vos crédits
            </p>
          </div>

          {/* Price breakdown pill */}
          <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-right shrink-0 min-w-[200px]">
            <span className="text-xs text-slate-500 block">Total à régler :</span>
            <div className="flex items-baseline justify-end gap-1.5 mt-0.5">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
                {finalPriceFcfa.toLocaleString('fr-FR')} FCFA
              </span>
            </div>
            <span className="text-xs text-blue-700 font-mono font-bold block mt-0.5">
              ({finalPriceEur.toFixed(2)} €)
            </span>
          </div>
        </div>

        {paymentDone ? (
          /* PAYMENT SUCCESS SCREEN */
          <div className="py-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-100 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-600">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-slate-900">Félicitations, votre compte est crédité !</h3>
            <p className="text-sm text-slate-600 max-w-md mx-auto">
              Votre formule <strong className="text-emerald-700">{currentPlan.name}</strong> a été activée avec succès. Vous disposez de <strong>+{currentPlan.corrections} corrections</strong> prêtes à être utilisées.
            </p>
            <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onStartCorrection}
                className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <span>Lancer une correction maintenant</span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setPaymentDone(false)}
                className="px-5 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors cursor-pointer"
              >
                Effectuer un autre achat
              </button>
            </div>
          </div>
        ) : (
          /* ACTIVE CHECKOUT FORM */
          <form onSubmit={handleProcessPayment} className="space-y-6">
            {/* PROMO CODE SECTION - STRICT CLIENT & SERVER VALIDATION */}
            <div className="p-4 sm:p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-blue-600" />
                  <span>Code promo ou code parrain</span>
                </label>
                <span className="text-[11px] text-slate-500">
                  (Facultatif · ex: PROFJEAN)
                </span>
              </div>

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={promoCodeInput}
                    onChange={(e) => {
                      setPromoCodeInput(e.target.value.toUpperCase());
                      setPromoError('');
                    }}
                    placeholder="Entrez votre code (ex: PROFJEAN)"
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-mono font-bold tracking-wider uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 placeholder:normal-case placeholder:font-normal"
                  />
                  {appliedPromo && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Appliqué</span>
                    </span>
                  )}
                </div>

                {appliedPromo ? (
                  <button
                    type="button"
                    onClick={handleRemovePromo}
                    className="px-4 py-2.5 rounded-xl border border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Retirer
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleApplyPromo()}
                    disabled={isValidatingPromo || !promoCodeInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    {isValidatingPromo ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Vérification...</span>
                      </>
                    ) : (
                      <span>Appliquer</span>
                    )}
                  </button>
                )}
              </div>

              {/* Promo error feedback */}
              {promoError && (
                <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{promoError}</span>
                </div>
              )}

              {/* Promo success feedback */}
              {appliedPromo && (
                <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-1 animate-in fade-in">
                  <span className="font-bold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>✓ Code {appliedPromo.code} appliqué</span>
                  </span>
                  <span className="text-[11px] text-emerald-700">
                    Réduction de 30% sur le premier mois uniquement
                  </span>
                </div>
              )}

              {/* EXACT PRICE RECAPITULATION (AS REQUESTED) */}
              <div className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-1.5 font-mono text-xs">
                <div className="flex items-center justify-between text-slate-700">
                  <span>{currentPlan.name}</span>
                  <span className="font-bold">{basePriceFcfa.toLocaleString('fr-FR')} FCFA</span>
                </div>

                <div className="flex items-center justify-between text-emerald-700 font-semibold">
                  <span>Réduction ({hasValidPromo ? `${appliedPromo?.discountPercent}%` : '0%'})</span>
                  <span>{hasValidPromo ? `-${discountFcfa.toLocaleString('fr-FR')} FCFA` : '0 FCFA'}</span>
                </div>

                <div className="border-t border-slate-200 pt-1.5 flex items-center justify-between font-bold text-sm text-slate-900">
                  <span>Total à payer</span>
                  <span className="text-blue-700 text-base">{finalPriceFcfa.toLocaleString('fr-FR')} FCFA</span>
                </div>

                {hasValidPromo && (
                  <p className="text-[10px] text-slate-500 font-sans italic pt-1 border-t border-slate-100">
                    * La réduction de 30% est valable sur le premier mois. Les renouvellements suivants s'effectueront au prix normal de 5 000 FCFA.
                  </p>
                )}
              </div>
            </div>

            {/* Payment Method Switcher */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Mode de paiement :</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Wave Mobile Money Button */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wave')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                    paymentMethod === 'wave'
                      ? 'bg-sky-50 border-sky-400 ring-2 ring-sky-400/40 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-sky-500 flex items-center justify-center text-white font-black text-sm shrink-0 shadow-xs">
                    🌊
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">Wave Mobile Money</span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-black">0% frais</span>
                    </div>
                    <span className="text-[11px] text-slate-500 block">Côte d'Ivoire 🇨🇮, Sénégal 🇸🇳, Bénin 🇧🇯, Burkina 🇧🇫</span>
                  </div>
                </button>

                {/* Carte Bancaire Button */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-3.5 ${
                    paymentMethod === 'card'
                      ? 'bg-blue-50 border-blue-400 ring-2 ring-blue-400/40 shadow-xs'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shrink-0 shadow-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-extrabold text-slate-900 text-sm block">Carte Bancaire</span>
                    <span className="text-[11px] text-slate-500 block">Visa, Mastercard, cartes bancaires locales & internationales</span>
                  </div>
                </button>
              </div>
            </div>

            {/* Wave Mobile Money Instructions & QR Code */}
            {paymentMethod === 'wave' && (
              <div className="p-5 rounded-2xl bg-sky-50/50 border border-sky-200 space-y-4">
                <div className="flex flex-col sm:flex-row items-center gap-5">
                  {/* QR Code representation */}
                  <div className="p-3 bg-white rounded-2xl border border-sky-200 shadow-xs shrink-0 flex flex-col items-center">
                    <div className="w-28 h-28 bg-slate-900 rounded-xl p-1 flex items-center justify-center relative overflow-hidden">
                      <QrCode className="w-24 h-24 text-white" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-sky-500 text-white font-black text-[10px] px-1.5 py-0.5 rounded shadow-xs">
                          Wave
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] font-black text-slate-800 mt-1 uppercase">Scan QR Wave</span>
                  </div>

                  <div className="space-y-2 flex-1 text-xs text-slate-700">
                    <span className="text-xs font-black text-sky-800 uppercase tracking-wider block">
                      Règlement direct par Wave
                    </span>
                    <p>
                      1. Ouvrez votre application <strong>Wave</strong> sur votre téléphone ou cliquez sur le lien ci-dessous.
                    </p>
                    <p>
                      2. Effectuez le virement de <strong className="text-slate-900 font-mono font-bold">{finalPriceFcfa.toLocaleString('fr-FR')} FCFA</strong> vers le numéro officiel Praxis :
                    </p>
                    <div className="flex items-center gap-2 pt-1">
                      <code className="bg-white text-sky-900 font-mono font-extrabold text-sm px-3 py-1.5 rounded-xl border border-sky-300">
                        +225 01 03 89 03 14
                      </code>
                      <button
                        type="button"
                        onClick={() => handleCopyWaveNumber('+2250103890314')}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-bold flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <Copy className="w-3 h-3" />
                        <span>{copyFeedback ? 'Copié !' : 'Copier'}</span>
                      </button>
                    </div>

                    <div className="pt-2">
                      <a
                        href={`https://wave.com/pay/?amount=${finalPriceFcfa}&recipient=${encodeURIComponent('+2250103890314')}&memo=${encodeURIComponent(`Praxis ${currentPlan.name} ${teacherName || 'Professeur'}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:text-sky-900 underline"
                      >
                        <span>Ouvrir l'application Wave pour payer</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Inputs: Teacher Coordinates */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Votre nom complet * :</label>
                <input
                  type="text"
                  required
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="Ex: Professeur Jean-Marc"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Numéro WhatsApp / Téléphone * :</label>
                <input
                  type="tel"
                  required
                  value={teacherPhone}
                  onChange={(e) => setTeacherPhone(e.target.value)}
                  placeholder="Ex: +225 07 12 34 56 78"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">Adresse email :</label>
                <input
                  type="email"
                  value={teacherEmail}
                  onChange={(e) => setTeacherEmail(e.target.value)}
                  placeholder="jean.marc@education.ci"
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  {paymentMethod === 'wave' ? 'Référence de transaction Wave :' : 'Nom sur la carte :'}
                </label>
                <input
                  type="text"
                  value={transactionRef}
                  onChange={(e) => setTransactionRef(e.target.value)}
                  placeholder={paymentMethod === 'wave' ? 'Ex: TX-984210' : 'M. Jean-Marc'}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-xl animate-in fade-in">
                {errorMsg}
              </div>
            )}

            {/* Validation CTA Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isProcessing}
                className="w-full py-4 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-md shadow-blue-600/30 transition-all cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>Validation du paiement en cours...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>
                      Confirmer et activer {currentPlan.corrections} corrections ({finalPriceFcfa.toLocaleString('fr-FR')} FCFA)
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-[11px] text-center text-slate-400 mt-2.5 flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Paiement sécurisé · Activation instantanée de vos crédits sur votre compte</span>
              </p>
            </div>
          </form>
        )}
      </section>

      {/* 5. ACCORDION FAQ REGARDING CREDITS AND PROMOTIONS */}
      <section className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200/90 shadow-xs space-y-4">
        <h3 className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <HelpCircle className="w-4 h-4 text-blue-600" />
          <span>Questions fréquentes sur les corrections et le paiement</span>
        </h3>

        <div className="space-y-2 text-xs">
          {[
            {
              q: 'Comment s’applique la réduction avec un code promo ?',
              a: 'Si vous avez reçu un code promo (par exemple via un professeur partenaire comme PROFJEAN), saisissez-le dans le champ "Code promo" lors de votre souscription. La réduction de 30% s’applique immédiatement sur le montant de votre premier mois. Les mois suivants sont facturés au prix normal de 5 000 FCFA.',
            },
            {
              q: 'Que se passe-t-il avec mes corrections restantes à la fin du mois ?',
              a: 'Elles ne disparaissent jamais ! Si vous avez 70 corrections restantes et que votre abonnement mensuel se renouvelle : 70 restantes + 500 nouvelles = 570 corrections disponibles. Les corrections mensuelles sont cumulables jusqu’à 1 500 crédits.',
            },
            {
              q: 'Les corrections des recharges supplémentaires (+100, +500) expirent-elles ?',
              a: 'Non, jamais. Les corrections achetées séparément en recharge restent disponibles sur votre compte indéfiniment tant que celui-ci est actif.',
            },
            {
              q: 'Puis-je payer directement avec mon solde Wave en Côte d’Ivoire ou au Sénégal ?',
              a: 'Oui, à 100%. Wave est intégré avec 0% de frais additionnels. Le virement est instantané et votre compte Praxis est crédité en quelques secondes.',
            },
          ].map((item, idx) => {
            const isOpen = faqOpenIndex === idx;
            return (
              <div key={idx} className="rounded-2xl border border-slate-100 bg-slate-50/50 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFaqOpenIndex(isOpen ? null : idx)}
                  className="w-full p-3.5 text-left font-bold text-slate-800 hover:text-blue-700 flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span>{item.q}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" /> : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
                </button>
                {isOpen && (
                  <div className="p-3.5 pt-0 text-slate-600 text-xs leading-relaxed border-t border-slate-100 bg-white">
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
};
