import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  CheckCircle2,
  ShieldCheck,
  CreditCard,
  Smartphone,
  Zap,
  ArrowRight,
  Phone,
  Lock,
  Layers,
  HelpCircle,
  Clock,
  RefreshCw,
  Gift,
  Award,
  TrendingDown,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { LeadData, SaaSPlan, PaywallPlanId } from '../types';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLead?: LeadData | null;
  onPaymentSuccess: (updatedTeacher: LeadData) => void;
  initialPlanId?: PaywallPlanId;
  partnerRefCode?: string;
}

interface PlanOption {
  id: PaywallPlanId;
  name: string;
  category: 'subscription' | 'pack';
  priceFcfa: number;
  originalPriceFcfa?: number;
  priceEur: number;
  originalPriceEur?: number;
  period: string;
  copiesIncluded: number;
  monthlyEquivalentFcfa?: number;
  monthlyEquivalentEur?: number;
  savingsFcfa?: number;
  badge?: string;
  popular?: boolean;
  bestValue?: boolean;
  description: string;
  features: string[];
}

const PLANS: PlanOption[] = [
  {
    id: 'monthly',
    name: 'Abonnement Mensuel',
    category: 'subscription',
    priceFcfa: 5000,
    priceEur: 7.60,
    period: '/ mois',
    copiesIncluded: 500,
    monthlyEquivalentFcfa: 5000,
    monthlyEquivalentEur: 7.60,
    badge: 'Flexibilité',
    popular: false,
    description: '500 corrections par mois. Vos corrections non utilisées sont reportées chaque mois (plafond 1 500).',
    features: [
      '500 corrections / mois incluses',
      'Cumulable jusqu’à 1 500 corrections max',
      'Corrections reportées d’un mois sur l’autre',
      'Détection manuscrite & multi-pages',
      'Sans engagement, résiliable en 1 clic',
    ],
  },
  {
    id: 'quarterly',
    name: 'Trimestriel (3 mois)',
    category: 'subscription',
    priceFcfa: 12000,
    originalPriceFcfa: 15000,
    priceEur: 18.30,
    originalPriceEur: 22.80,
    period: 'pour 3 mois',
    copiesIncluded: 1500,
    monthlyEquivalentFcfa: 4000,
    monthlyEquivalentEur: 6.10,
    savingsFcfa: 3000,
    badge: '⭐ Meilleur équilibre',
    popular: true,
    description: '1 500 corrections pour tout un trimestre. Revient à 4 000 FCFA/mois (3 000 FCFA d’économie).',
    features: [
      '1 500 corrections au total (500 / mois)',
      'Revient à seulement 4 000 FCFA / mois',
      'Économisez 3 000 FCFA immédiatement',
      'Corrections non utilisées conservées',
      'Support pédagogique prioritaire',
    ],
  },
  {
    id: 'school_year',
    name: 'Pass Année Scolaire (9 mois)',
    category: 'subscription',
    priceFcfa: 30000,
    originalPriceFcfa: 45000,
    priceEur: 45.75,
    originalPriceEur: 68.60,
    period: 'pour 9 mois scolaires',
    copiesIncluded: 4500,
    monthlyEquivalentFcfa: 3333,
    monthlyEquivalentEur: 5.08,
    savingsFcfa: 15000,
    badge: '🎓 Pour toute l’année scolaire',
    popular: false,
    bestValue: true,
    description: '4 500 corrections pour toute l’année scolaire. Revient à 3 333 FCFA/mois (15 000 FCFA d’économie).',
    features: [
      '4 500 corrections (500 × 9 mois)',
      'Revient à seulement 3 333 FCFA / mois',
      'Économisez 15 000 FCFA (3 mois offerts !)',
      'Vos crédits vous accompagnent toute l’année',
      'Ligne WhatsApp directe avec l’équipe 7j/7',
    ],
  },
  {
    id: 'extra_100',
    name: 'Recharge Extra +100',
    category: 'pack',
    priceFcfa: 1000,
    priceEur: 1.50,
    period: 'paiement unique',
    copiesIncluded: 100,
    badge: 'Sans expiration',
    popular: false,
    description: '+100 corrections supplémentaires. Elles n’expirent JAMAIS tant que votre compte est actif.',
    features: [
      '+100 corrections immédiates',
      'Pas d’expiration (crédits permanents)',
      'Consommées en réserve après votre forfait',
      'Idéal paquet imprévu de copies',
    ],
  },
  {
    id: 'extra_500',
    name: 'Recharge Extra +500',
    category: 'pack',
    priceFcfa: 5000,
    priceEur: 7.60,
    period: 'paiement unique',
    copiesIncluded: 500,
    badge: 'Grand Paquet Extra',
    popular: false,
    description: '+500 corrections supplémentaires permanentes. Idéal examens blancs et fins de semestre.',
    features: [
      '+500 corrections permanentes',
      'Validité sans date de fin',
      'Idéal examens blancs et fin de semestre',
      'Cumulable avec tout abonnement',
    ],
  },
  {
    id: 'extra_1000',
    name: 'Recharge Extra +1 000',
    category: 'pack',
    priceFcfa: 10000,
    priceEur: 15.20,
    period: 'paiement unique',
    copiesIncluded: 1000,
    badge: 'Grand Pack Économique',
    popular: false,
    description: '+1 000 corrections supplémentaires permanentes. Idéal pour les grands examens et fins d’année.',
    features: [
      '+1 000 corrections permanentes',
      'Validité sans date de fin',
      'Idéal examens et corrections massives',
      'Cumulable avec tout abonnement',
    ],
  },
];

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  currentLead,
  onPaymentSuccess,
  initialPlanId = 'quarterly',
  partnerRefCode,
}) => {
  const [currency, setCurrency] = useState<'XOF' | 'EUR'>('XOF');
  const [selectedPlanId, setSelectedPlanId] = useState<PaywallPlanId>(initialPlanId);
  const [tabCategory, setTabCategory] = useState<'all' | 'subscriptions' | 'extra'>('all');
  const [paymentMethod, setPaymentMethod] = useState<'paystack' | 'wave' | 'card'>('paystack');

  // Customer form fields
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [wavePhone, setWavePhone] = useState('');
  const [waveTxRef, setWaveTxRef] = useState('');

  // Card form fields
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');

  // Promo Code State - NO DEFAULT REDUCTION
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
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountPercent: number;
    partnerName?: string;
    partnerId?: string;
  } | null>(null);
  const [isValidatingPromo, setIsValidatingPromo] = useState(false);
  const [promoError, setPromoError] = useState('');

  // Loading & feedback state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successData, setSuccessData] = useState<{
    teacher: LeadData;
    message: string;
    copiesUnlocked: number;
    amountPaid: string;
  } | null>(null);

  // Sync state on open
  useEffect(() => {
    if (isOpen) {
      if (initialPlanId) {
        setSelectedPlanId(initialPlanId);
      }
      if (currentLead) {
        setEmail(currentLead.email || '');
        setName(currentLead.name || '');
        setWavePhone(currentLead.whatsapp || '');
        setCardName(currentLead.name || '');
      }
      setSuccessData(null);
      setErrorMsg('');
      setPromoError('');
    }
  }, [isOpen, initialPlanId, currentLead]);

  if (!isOpen) return null;

  const selectedPlan = PLANS.find((p) => p.id === selectedPlanId) || PLANS[1];
  const isXof = currency === 'XOF';

  // Strict discount logic: only applied if a valid promo code is verified
  const isSubscription = selectedPlan.category === 'subscription';
  const hasPromo = Boolean(appliedPromo && isSubscription);

  const basePriceFcfa = selectedPlan.priceFcfa;
  const basePriceEur = selectedPlan.priceEur;

  const discountAmountFcfa = hasPromo ? Math.round(basePriceFcfa * (appliedPromo!.discountPercent / 100)) : 0;
  const discountAmountEur = hasPromo ? Number((basePriceEur * (appliedPromo!.discountPercent / 100)).toFixed(2)) : 0;

  const finalPriceFcfa = Math.max(0, basePriceFcfa - discountAmountFcfa);
  const finalPriceEur = Number(Math.max(0, basePriceEur - discountAmountEur).toFixed(2));

  const priceDisplay = isXof
    ? `${finalPriceFcfa.toLocaleString('fr-FR')} FCFA`
    : `${finalPriceEur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

  const originalPriceDisplay = isXof
    ? `${selectedPlan.priceFcfa.toLocaleString('fr-FR')} FCFA`
    : `${selectedPlan.priceEur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 16);
    const groups = val.match(/.{1,4}/g);
    setCardNumber(groups ? groups.join(' ') : val);
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (val.length >= 3) {
      val = `${val.slice(0, 2)}/${val.slice(2)}`;
    }
    setCardExpiry(val);
  };

  const handleApplyPromo = async () => {
    const code = promoCodeInput.trim().toUpperCase();
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
          email: email.trim(),
          whatsapp: wavePhone.trim(),
          planId: selectedPlanId,
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
        partnerName: data.partnerName,
        partnerId: data.partnerId,
      });
      setPromoError('');
    } catch {
      setAppliedPromo(null);
      setPromoError('Impossible de valider le code promo.');
    } finally {
      setIsValidatingPromo(false);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError('');
  };

  const handleSubmitPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email.trim() && !wavePhone.trim()) {
      setErrorMsg('Veuillez renseigner votre email ou votre numéro de contact.');
      return;
    }

    if (paymentMethod === 'card') {
      const cleanCard = cardNumber.replace(/\s+/g, '');
      if (cleanCard.length < 15) {
        setErrorMsg('Numéro de carte bancaire incomplet (16 chiffres requis).');
        return;
      }
      if (cardExpiry.length < 5) {
        setErrorMsg("Date d'expiration invalide (format MM/AA requis).");
        return;
      }
      if (cardCvc.length < 3) {
        setErrorMsg('Code de sécurité CVC à 3 chiffres requis.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // 1. Paystack Flow: initialize and redirect to Paystack checkout
      if (paymentMethod === 'paystack') {
        if (!email.trim()) {
          setErrorMsg('Votre adresse email est obligatoire pour recevoir votre reçu et activer Paystack.');
          setIsSubmitting(false);
          return;
        }

        const initRes = await fetch('/api/paystack/initialize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            planId: selectedPlanId,
            name: name.trim() || 'Enseignant',
            email: email.trim(),
            whatsapp: wavePhone.trim(),
            currency,
            promoCode: appliedPromo ? appliedPromo.code : undefined,
            callbackUrl: window.location.origin + '/?paystack_ref=init',
          }),
        });

        const initData = await initRes.json();
        if (!initRes.ok || !initData.success) {
          throw new Error(initData.error || 'Impossible d’initialiser le paiement Paystack.');
        }

        if (initData.authorizationUrl) {
          const pendingLead = {
            name: name.trim(),
            email: email.trim(),
            whatsapp: wavePhone.trim(),
            plan: selectedPlanId,
            reference: initData.reference,
          };
          localStorage.setItem('praxis_pending_paystack', JSON.stringify(pendingLead));
          window.location.href = initData.authorizationUrl;
          return;
        }
      }

      // 2. Wave manual or Card flow
      const payload = {
        email: email.trim(),
        name: name.trim() || 'Enseignant',
        whatsapp: wavePhone.trim(),
        planId: selectedPlanId,
        paymentMethod,
        currency,
        promoCode: appliedPromo ? appliedPromo.code : undefined,
        waveNumber: wavePhone.trim(),
        waveTxId: waveTxRef.trim(),
        cardDetails:
          paymentMethod === 'card'
            ? {
                cardholderName: cardName.trim() || name.trim(),
                last4: cardNumber.replace(/\s+/g, '').slice(-4),
                brand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
              }
            : undefined,
      };

      const res = await fetch('/api/paywall/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du traitement du paiement.');
      }

      // Confetti burst
      try {
        confetti({
          particleCount: 90,
          spread: 75,
          origin: { y: 0.6 },
        });
      } catch {
        // Fallback
      }

      const updatedLead: LeadData = {
        name: data.teacher.name,
        email: data.teacher.email,
        whatsapp: data.teacher.whatsapp,
        school: data.teacher.school,
        plan: data.teacher.plan,
        quota: data.teacher.quota,
        subscriptionCredits: data.teacher.subscriptionCredits,
        extraCredits: data.teacher.extraCredits,
        copiesCorrected: data.teacher.copiesCorrected,
        status: data.teacher.status,
        firstPurchaseDiscountUsed: data.teacher.firstPurchaseDiscountUsed,
      };

      localStorage.setItem('praxis_lead', JSON.stringify(updatedLead));
      localStorage.setItem('cpro_lead', JSON.stringify(updatedLead));

      setSuccessData({
        teacher: updatedLead,
        message: data.message,
        copiesUnlocked: selectedPlan.copiesIncluded,
        amountPaid: priceDisplay,
      });

      onPaymentSuccess(updatedLead);
    } catch (err: any) {
      console.warn('Paywall error:', err);
      setErrorMsg(err.message || 'Impossible de finaliser le paiement. Veuillez réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedPlans = PLANS.filter((p) => {
    if (tabCategory === 'subscriptions') return p.category === 'subscription';
    if (tabCategory === 'extra') return p.category === 'pack';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden relative max-h-[94vh] flex flex-col">
        {/* Top Close Button */}
        <button
          type="button"
          onClick={onClose}
          id="btn-close-paywall"
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer z-20"
          title="Fermer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Top Header */}
        <div className="p-5 sm:p-6 border-b border-slate-100 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white relative">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold backdrop-blur-xs border border-white/20">
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Praxis · Choisissez votre rythme</span>
            </div>

            {/* Currency toggle */}
            <div className="flex items-center bg-black/25 p-1 rounded-xl border border-white/20 text-xs font-bold">
              <button
                type="button"
                onClick={() => setCurrency('XOF')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currency === 'XOF' ? 'bg-white text-blue-900 shadow-xs' : 'text-blue-100 hover:text-white'
                }`}
              >
                FCFA (XOF)
              </button>
              <button
                type="button"
                onClick={() => setCurrency('EUR')}
                className={`px-3 py-1 rounded-lg transition-all cursor-pointer ${
                  currency === 'EUR' ? 'bg-white text-blue-900 shadow-xs' : 'text-blue-100 hover:text-white'
                }`}
              >
                Euros (€)
              </button>
            </div>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight mt-3 text-white">
            Vos corrections non utilisées ne sont pas perdues !
          </h2>
          <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl leading-relaxed">
            Paiement direct en FCFA via <strong>Wave Mobile Money (0% de frais)</strong> ou par{' '}
            <strong>Carte Bancaire</strong>. Vos crédits d’abonnement sont reportés chaque mois, et vos recharges extra
            n’expirent jamais.
          </p>
        </div>

        {/* Active Promo Code Banner (only if verified) */}
        {appliedPromo && (
          <div className="bg-emerald-50 border-b border-emerald-200 px-4 sm:px-6 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-900 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-emerald-600 text-white font-black text-[10px]">
                CODE PROMO ACTIF
              </span>
              <span className="font-medium">
                Code <strong>{appliedPromo.code}</strong> appliqué (-{appliedPromo.discountPercent}% sur le 1er mois).
                {appliedPromo.partnerName && (
                  <span className="text-emerald-700"> · Partenaire : {appliedPromo.partnerName}</span>
                )}
              </span>
            </div>
            <button
              type="button"
              onClick={handleRemovePromo}
              className="text-[11px] font-bold text-rose-700 underline hover:text-rose-900 shrink-0 cursor-pointer"
            >
              Retirer
            </button>
          </div>
        )}

        {/* Modal Body */}
        {successData ? (
          /* SUCCESS SCREEN */
          <div className="p-6 sm:p-8 space-y-6 text-center overflow-y-auto flex-1">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-sm animate-in zoom-in">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-2">
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-bold border border-emerald-200">
                Paiement Validé avec Succès !
              </span>
              <h3 className="text-2xl font-extrabold text-slate-900">
                Félicitations {successData.teacher.name || 'Cher Professeur'} !
              </h3>
              <p className="text-sm text-slate-600 max-w-md mx-auto leading-relaxed">
                Votre compte a été crédité de{' '}
                <strong className="text-emerald-700 font-bold">+{successData.copiesUnlocked} corrections</strong>. Vos
                crédits sont immédiatement utilisables.
              </p>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 max-w-sm mx-auto text-xs space-y-2 text-left">
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Formule activée :</span>
                <span className="font-bold text-slate-800">{selectedPlan.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Montant réglé :</span>
                <span className="font-bold text-slate-900">{successData.amountPaid}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Moyen de paiement :</span>
                <span className="font-bold text-blue-700">
                  {paymentMethod === 'wave' ? 'Wave Mobile Money (CI)' : 'Carte Bancaire'}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Nouveau solde total disponible :</span>
                <span className="font-extrabold text-emerald-600 text-sm">
                  {Math.max(
                    0,
                    (successData.teacher.quota || 0) - (successData.teacher.copiesCorrected || 0)
                  )}{' '}
                  corrections
                </span>
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                type="button"
                onClick={onClose}
                id="btn-resume-after-payment"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Reprendre mes corrections immédiatement</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* FORM / CHECKOUT VIEW */
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-6">
            {/* Popcorn Pricing Comparison Table */}
            <div className="rounded-xl border border-blue-200/80 bg-gradient-to-b from-blue-50/50 to-white overflow-hidden shadow-xs">
              <div className="p-3 bg-blue-600 text-white flex items-center justify-between text-xs font-bold">
                <div className="flex items-center gap-2">
                  <span>🍿 Tableau comparatif des engagements</span>
                </div>
                <span className="text-[11px] text-blue-100">Plus vous vous engagez, plus vous économisez</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead>
                    <tr className="border-b border-blue-100 text-slate-500 bg-slate-50/70 font-semibold">
                      <th className="py-2.5 px-3">Formule</th>
                      <th className="py-2.5 px-3">Corrections</th>
                      <th className="py-2.5 px-3">Prix total</th>
                      <th className="py-2.5 px-3">Équivalent / mois</th>
                      <th className="py-2.5 px-3 text-right">Économie</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-blue-50 text-slate-800">
                    <tr
                      onClick={() => setSelectedPlanId('monthly')}
                      className={`cursor-pointer transition-colors ${
                        selectedPlanId === 'monthly' ? 'bg-blue-100/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                        <span>Mensuel</span>
                      </td>
                      <td className="py-2.5 px-3">500 / mois (cumul 1 500)</td>
                      <td className="py-2.5 px-3 font-mono">{isXof ? '5 000 FCFA' : '7,60 €'}</td>
                      <td className="py-2.5 px-3">{isXof ? '5 000 F / mois' : '7,60 €'}</td>
                      <td className="py-2.5 px-3 text-right text-slate-400">—</td>
                    </tr>

                    <tr
                      onClick={() => setSelectedPlanId('quarterly')}
                      className={`cursor-pointer transition-colors ${
                        selectedPlanId === 'quarterly' ? 'bg-blue-100/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                        <span>Trimestriel (3 mois)</span>
                        <span className="text-[10px] bg-blue-600 text-white px-1.5 py-0.2 rounded font-black">
                          POPULAIRE
                        </span>
                      </td>
                      <td className="py-2.5 px-3">1 500 total</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="line-through text-slate-400 mr-1">
                          {isXof ? '15 000' : '22,80 €'}
                        </span>
                        <span className="text-blue-700">{isXof ? '12 000 FCFA' : '18,30 €'}</span>
                      </td>
                      <td className="py-2.5 px-3 text-blue-700">{isXof ? '4 000 F / mois' : '6,10 €'}</td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-extrabold">
                        {isXof ? 'Éco. 3 000 FCFA' : 'Éco. 4,50 €'}
                      </td>
                    </tr>

                    <tr
                      onClick={() => setSelectedPlanId('school_year')}
                      className={`cursor-pointer transition-colors ${
                        selectedPlanId === 'school_year' ? 'bg-blue-100/70 font-bold' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-2.5 px-3 flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                        <span>Année scolaire (9 mois)</span>
                        <span className="text-[10px] bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black">
                          ⭐ TOP VALEUR
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-semibold">4 500 total</td>
                      <td className="py-2.5 px-3 font-mono">
                        <span className="line-through text-slate-400 mr-1">
                          {isXof ? '45 000' : '68,60 €'}
                        </span>
                        <span className="text-indigo-700 font-extrabold">{isXof ? '30 000 FCFA' : '45,75 €'}</span>
                      </td>
                      <td className="py-2.5 px-3 font-bold text-indigo-700">
                        {isXof ? '3 333 F / mois' : '5,08 €'}
                      </td>
                      <td className="py-2.5 px-3 text-right text-emerald-600 font-black">
                        {isXof ? 'Éco. 15 000 FCFA' : 'Éco. 22,85 €'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Plan Filter Categories */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                    1
                  </span>
                  <span>Sélectionnez votre formule ou recharge</span>
                </label>

                {/* Subcategory buttons */}
                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setTabCategory('all')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      tabCategory === 'all' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Tout voir
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabCategory('subscriptions')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      tabCategory === 'subscriptions' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Abonnements
                  </button>
                  <button
                    type="button"
                    onClick={() => setTabCategory('extra')}
                    className={`px-2 py-1 rounded transition-colors cursor-pointer ${
                      tabCategory === 'extra' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Recharges Extra
                  </button>
                </div>
              </div>

              {/* Plans Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {displayedPlans.map((plan) => {
                  const isSelected = selectedPlanId === plan.id;
                  const planPrice = isXof
                    ? `${plan.priceFcfa.toLocaleString('fr-FR')} F`
                    : `${plan.priceEur.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €`;

                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelectedPlanId(plan.id)}
                      className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      {plan.badge && (
                        <div
                          className={`absolute -top-2.5 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            plan.popular
                              ? 'bg-blue-600 text-white'
                              : plan.bestValue
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : 'bg-slate-200 text-slate-800'
                          }`}
                        >
                          {plan.badge}
                        </div>
                      )}

                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-extrabold text-slate-900 text-xs sm:text-sm">{plan.name}</h4>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 bg-white'
                            }`}
                          >
                            {isSelected && <Check className="w-2.5 h-2.5" />}
                          </div>
                        </div>

                        <div className="mt-1 flex items-baseline gap-1">
                          {plan.originalPriceFcfa && (
                            <span className="text-xs text-slate-400 line-through">
                              {isXof
                                ? `${plan.originalPriceFcfa.toLocaleString('fr-FR')} F`
                                : `${plan.originalPriceEur} €`}
                            </span>
                          )}
                          <span className="text-lg sm:text-xl font-black text-slate-900 font-mono">{planPrice}</span>
                          <span className="text-[11px] text-slate-500">{plan.period}</span>
                        </div>

                        {plan.monthlyEquivalentFcfa && plan.id !== 'monthly' && (
                          <div className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            Revient à {isXof ? `${plan.monthlyEquivalentFcfa} F/mois` : `${plan.monthlyEquivalentEur} €`}
                          </div>
                        )}

                        <p className="text-[11px] text-slate-600 mt-1 leading-snug line-clamp-2">{plan.description}</p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100 text-[11px] text-slate-700">
                        <div className="flex items-center gap-1.5 font-bold text-blue-700">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{plan.copiesIncluded.toLocaleString('fr-FR')} corrections incluses</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dual Counters Mechanism Callout */}
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
              <Gift className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-slate-900 block mb-0.5">
                  La règle Praxis : Vos corrections ne disparaissent pas
                </span>
                <span>
                  • <strong>Corrections d'abonnement</strong> : 500 ajoutées chaque mois, cumulables jusqu’à 1 500
                  corrections max.
                  <br />• <strong>Séries supplémentaires (Extra)</strong> : achetées séparément, elles n’expirent jamais
                  tant que votre compte reste actif.
                </span>
              </div>
            </div>

            {/* Step 2: Payment Method Choice (Wave vs CB) */}
            <div>
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 mb-2.5">
                <span className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">
                  2
                </span>
                <span>Choisissez votre moyen de paiement</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* PAYSTACK BUTTON */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('paystack')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
                    paymentMethod === 'paystack'
                      ? 'border-emerald-500 bg-emerald-50/50 shadow-xs ring-1 ring-emerald-500'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shrink-0 shadow-xs font-black text-sm">
                    ⚡
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-slate-900 text-sm">Paystack</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-900">
                        Instantané
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Mobile Money & Cartes CB
                    </p>
                  </div>
                </button>

                {/* WAVE BUTTON */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('wave')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
                    paymentMethod === 'wave'
                      ? 'border-[#00D2FF] bg-cyan-50/40 shadow-xs ring-1 ring-[#00D2FF]'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-[#00D2FF] text-white flex items-center justify-center shrink-0 shadow-xs font-black text-sm">
                    🌊
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">Wave Direct</span>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-extrabold bg-[#00D2FF]/20 text-cyan-900">
                        0% Frais
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Transfert manuel CI / SN
                    </p>
                  </div>
                </button>

                {/* CARTE BANCAIRE BUTTON */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('card')}
                  className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer text-left flex items-start gap-3 ${
                    paymentMethod === 'card'
                      ? 'border-indigo-600 bg-indigo-50/40 shadow-xs ring-1 ring-indigo-600'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-slate-900 to-indigo-700 text-white flex items-center justify-center shrink-0 shadow-xs">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-extrabold text-slate-900 text-sm">Carte Directe</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5 leading-snug">
                      Formulaire classique Visa/MC
                    </p>
                  </div>
                </button>
              </div>
            </div>

            {/* Paystack Instructions Card */}
            {paymentMethod === 'paystack' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-50/70 via-teal-50/40 to-white border border-emerald-200 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg shadow-xs shrink-0">
                    ⚡
                  </div>
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-sm">
                      Paiement Sécurisé Paystack ({selectedPlan.name})
                    </h4>
                    <p className="text-xs text-slate-600">
                      Montant : <strong className="text-emerald-900 font-bold">{priceDisplay}</strong> · Activation instantanée de vos corrections
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-emerald-100">
                  <div className="py-2 px-2.5 rounded-lg bg-white border border-emerald-200/80 text-center font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500"></span>
                    <span>Wave</span>
                  </div>
                  <div className="py-2 px-2.5 rounded-lg bg-white border border-emerald-200/80 text-center font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-orange-500"></span>
                    <span>Orange Money</span>
                  </div>
                  <div className="py-2 px-2.5 rounded-lg bg-white border border-emerald-200/80 text-center font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                    <span>MTN MoMo</span>
                  </div>
                  <div className="py-2 px-2.5 rounded-lg bg-white border border-emerald-200/80 text-center font-bold text-xs text-slate-800 flex items-center justify-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>Cartes CB</span>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Details Form */}
            <form onSubmit={handleSubmitPayment} className="space-y-4">
              {/* PAYSTACK CUSTOMER FORM */}
              {paymentMethod === 'paystack' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                  <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">
                    Vos coordonnées pour le reçu et l'activation automatique
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Adresse e-mail <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.email@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nom complet
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="M. ou Mme Nom"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Numéro WhatsApp / Téléphone Mobile Money
                      </label>
                      <input
                        type="tel"
                        value={wavePhone}
                        onChange={(e) => setWavePhone(e.target.value)}
                        placeholder="+225 07 00 00 00 00"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden font-mono"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* WAVE FORM */}
              {paymentMethod === 'wave' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-cyan-50/50 to-white border border-cyan-200 space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-3 border-b border-cyan-100">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-[#00D2FF] text-white flex items-center justify-center font-black text-xl shadow-xs shrink-0">
                        🌊
                      </div>
                      <div>
                        <h4 className="font-extrabold text-slate-900 text-sm">
                          Paiement instantané Wave ({selectedPlan.name})
                        </h4>
                        <p className="text-xs text-slate-600">
                          Montant à régler : <strong className="text-cyan-950 font-bold">{priceDisplay}</strong>
                        </p>
                      </div>
                    </div>

                    <a
                      href="https://wave.com/pay"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#00D2FF] hover:bg-[#00c0eb] text-slate-950 font-bold text-xs shadow-xs transition-colors"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Ouvrir l'appli Wave</span>
                    </a>
                  </div>

                  {/* QR Code & Direct Transfer instruction */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-cyan-100 items-center">
                    {/* Visual QR Code Card */}
                    <div className="flex flex-col items-center justify-center text-center p-2 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="w-24 h-24 bg-white p-1 rounded-lg border border-slate-300 relative flex items-center justify-center shadow-xs">
                        <svg className="w-full h-full text-slate-800" viewBox="0 0 100 100" fill="currentColor">
                          <rect x="5" y="5" width="25" height="25" fill="#0284c7" rx="3" />
                          <rect x="9" y="9" width="17" height="17" fill="white" />
                          <rect x="13" y="13" width="9" height="9" fill="#0284c7" />

                          <rect x="70" y="5" width="25" height="25" fill="#0284c7" rx="3" />
                          <rect x="74" y="9" width="17" height="17" fill="white" />
                          <rect x="78" y="13" width="9" height="9" fill="#0284c7" />

                          <rect x="5" y="70" width="25" height="25" fill="#0284c7" rx="3" />
                          <rect x="9" y="74" width="17" height="17" fill="white" />
                          <rect x="13" y="78" width="9" height="9" fill="#0284c7" />

                          <rect x="40" y="10" width="6" height="6" />
                          <rect x="50" y="15" width="10" height="6" />
                          <rect x="42" y="25" width="15" height="6" />

                          <rect x="10" y="45" width="12" height="6" />
                          <rect x="25" y="50" width="8" height="10" />

                          <rect x="45" y="45" width="12" height="12" fill="#00D2FF" rx="2" />

                          <rect x="68" y="45" width="10" height="6" />
                          <rect x="80" y="55" width="12" height="8" />
                          <rect x="42" y="70" width="8" height="12" />
                          <rect x="55" y="80" width="12" height="10" />
                          <rect x="75" y="75" width="16" height="16" />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[10px] font-black bg-white px-1 py-0.5 rounded shadow-xs text-cyan-800 border border-cyan-200">
                            WAVE
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 font-bold mt-1">Scanner avec Wave</span>
                    </div>

                    <div className="sm:col-span-2 text-xs space-y-1.5 text-slate-700">
                      <p className="font-semibold text-slate-900">
                        Transfert direct vers le compte marchand Praxis :
                      </p>
                      <div className="p-2 bg-cyan-100/70 rounded-lg font-mono text-cyan-950 font-bold flex items-center justify-between">
                        <span>+225 0103890314</span>
                        <span className="text-[10px] font-sans font-bold bg-white text-cyan-800 px-1.5 py-0.5 rounded">
                          Côte d'Ivoire (Wave CI)
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Titulaire : <strong>Praxis Éducation / Kévin Agoussou</strong>. Vos corrections sont activées
                        dès la validation.
                      </p>
                    </div>
                  </div>

                  {/* Customer confirmation inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Votre adresse e-mail <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="votre.email@gmail.com"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Votre numéro Wave de paiement <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="tel"
                        value={wavePhone}
                        onChange={(e) => setWavePhone(e.target.value)}
                        placeholder="Ex : +225 01 02 03 04 05"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden font-mono"
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Référence de transaction Wave ou ID de reçu</span>
                        <span className="text-[11px] text-slate-400 font-normal">Reçue par SMS / Wave</span>
                      </label>
                      <input
                        type="text"
                        value={waveTxRef}
                        onChange={(e) => setWaveTxRef(e.target.value)}
                        placeholder="Ex : TXN-WAVE-89312 ou numéro de reçu"
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-cyan-500 outline-hidden font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* CARTE BANCAIRE FORM */}
              {paymentMethod === 'card' && (
                <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-indigo-50/40 to-white border border-indigo-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-indigo-100">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">
                        Paiement sécurisé par Carte Bancaire
                      </h4>
                      <p className="text-xs text-slate-600">
                        Compatible Visa, Mastercard, Ecobank, UBA, SGBCI, NSIA...
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-[10px]">
                        VISA
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-600 text-white font-extrabold text-[10px]">
                        MC
                      </span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Adresse e-mail <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="votre.email@gmail.com"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Nom du titulaire <span className="text-rose-500">*</span>
                        </label>
                        <input
                          type="text"
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value)}
                          placeholder="Nom figurant sur la carte"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Numéro de carte bancaire</span>
                        <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-semibold">
                          <Lock className="w-3 h-3" /> SSL 256-bit
                        </span>
                      </label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4532 •••• •••• 8910"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono tracking-wider"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1">
                          Expiration (MM/AA)
                        </label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="12/28"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono text-center"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                          <span>CVC / CVV</span>
                          <span className="text-[10px] text-slate-400">3 chiffres</span>
                        </label>
                        <input
                          type="password"
                          value={cardCvc}
                          onChange={(e) => setCardCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="•••"
                          className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-hidden font-mono text-center"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Promo Code & Price Breakdown Section */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Code promo (ex : PROFJEAN)
                  </label>
                  <span className="text-[11px] text-slate-500">Optionnel</span>
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
                      placeholder="Code promo"
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold tracking-wider uppercase text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
                    />
                    {appliedPromo && (
                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-emerald-600 font-bold text-xs flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Actif</span>
                      </span>
                    )}
                  </div>
                  {appliedPromo ? (
                    <button
                      type="button"
                      onClick={handleRemovePromo}
                      className="px-3 py-2 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs font-bold cursor-pointer"
                    >
                      Retirer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleApplyPromo}
                      disabled={isValidatingPromo || !promoCodeInput.trim()}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shrink-0"
                    >
                      {isValidatingPromo ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Validation...</span>
                        </>
                      ) : (
                        <span>Appliquer</span>
                      )}
                    </button>
                  )}
                </div>

                {promoError && (
                  <p className="text-xs font-semibold text-rose-600">
                    {promoError}
                  </p>
                )}

                {appliedPromo && (
                  <p className="text-xs font-bold text-emerald-700">
                    ✓ Code {appliedPromo.code} appliqué (-{appliedPromo.discountPercent}% sur le premier mois)
                  </p>
                )}

                {/* Exact Price Summary Table */}
                <div className="p-3 bg-white rounded-lg border border-slate-200 space-y-1.5 font-mono text-xs">
                  <div className="flex justify-between text-slate-700">
                    <span>{selectedPlan.name}</span>
                    <span className="font-bold">{isXof ? `${basePriceFcfa.toLocaleString('fr-FR')} FCFA` : `${basePriceEur.toFixed(2)} €`}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Réduction ({hasPromo ? `${appliedPromo?.discountPercent}%` : '0%'})</span>
                    <span>{hasPromo ? `-${isXof ? `${discountAmountFcfa.toLocaleString('fr-FR')} FCFA` : `${discountAmountEur.toFixed(2)} €`}` : (isXof ? '0 FCFA' : '0,00 €')}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
                    <span>Total</span>
                    <span className="text-blue-700">{priceDisplay}</span>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 font-semibold text-center animate-in fade-in">
                  {errorMsg}
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  id="btn-confirm-paywall-payment"
                  className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 ${
                    paymentMethod === 'paystack'
                      ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/30 ring-2 ring-emerald-500/20'
                      : paymentMethod === 'wave'
                      ? 'bg-gradient-to-r from-[#00D2FF] to-blue-600 hover:from-[#00bde6] hover:to-blue-700 text-slate-950 font-black'
                      : 'bg-gradient-to-r from-blue-700 to-indigo-700 hover:from-blue-800 hover:to-indigo-800 text-white'
                  }`}
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>
                        {paymentMethod === 'paystack'
                          ? 'Redirection sécurisée vers Paystack...'
                          : 'Validation du paiement...'}
                      </span>
                    </>
                  ) : paymentMethod === 'paystack' ? (
                    <>
                      <Zap className="w-4 h-4 text-emerald-200" />
                      <span>Payer {priceDisplay} via Paystack (Instantané)</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>
                        {paymentMethod === 'wave'
                          ? `Confirmer mon paiement Wave (${priceDisplay})`
                          : `Régler ${priceDisplay} par Carte Bancaire`}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 pt-1 gap-2 border-t border-slate-100">
                <span className="flex items-center gap-1 text-slate-500">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  Activation instantanée · Facture émise
                </span>
                <span className="flex items-center gap-1 text-slate-500">
                  <Phone className="w-3 h-3 text-blue-600" />
                  Assistance Wave / Abidjan : +225 0103890314
                </span>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
