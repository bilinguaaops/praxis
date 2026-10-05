import React, { useState, useEffect } from 'react';
import { RotateCcw, Zap } from 'lucide-react';
import confetti from 'canvas-confetti';
import { AssignmentConfig, StudentSubmission, ClassGroup, SavedEvaluation, MainView, LeadData, PaywallPlanId, SaaSPlan } from './types';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { TopHeader } from './components/TopHeader';
import { TeacherDashboardView } from './components/TeacherDashboardView';
import { ReferralsView } from './components/ReferralsView';
import { SettingsView } from './components/SettingsView';
import { TutorialBanner } from './components/TutorialBanner';
import { LeadGateModal } from './components/LeadGateModal';
import { ClassesView } from './components/ClassesView';
import { SuiviView } from './components/SuiviView';
import { HistoriqueView } from './components/HistoriqueView';
import { Step1Config } from './components/Step1Config';
import { Step2Upload } from './components/Step2Upload';
import { Step3Progress } from './components/Step3Progress';
import { Step4Dashboard } from './components/Step4Dashboard';
import { StudentDetailModal } from './components/StudentDetailModal';
import { PrintCorrectionSheets } from './components/PrintCorrectionSheets';
import { AdminDashboard } from './components/AdminDashboard';
import { FaqView } from './components/FaqView';
import { LandingPage } from './components/LandingPage';
import { PricingPage } from './components/PricingPage';
import { ContactModal } from './components/ContactModal';
import { PaywallModal } from './components/PaywallModal';
import { AuthView } from './components/AuthView';
import { MobilePWAInstallModal } from './components/MobilePWAInstallModal';
import { useSupabaseAuth } from './lib/useSupabaseAuth';

const DEFAULT_CONFIG: AssignmentConfig = {
  discipline: 'Français',
  level: '5e',
  title: '',
  maxGrade: 20,
  correctionMode: 'with_rubric',
  rubricContent: '',
  analysisSpeed: 'turbo',
  aiEngine: 'auto',
  pedagogicalGuidelines: {
    spellingTolerance: true,
    rewardEffortAndMethod: true,
    rigorousJustification: true,
    encourageClarity: true,
    customInstructions: '',
  },
};

export default function App() {
  const [activeView, setActiveView] = useState<MainView>(() => {
    try {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      if (path === '/login' || search.includes('view=login')) return 'login';
      if (path === '/register' || search.includes('view=register')) return 'register';
      if (path === '/forgot-password' || search.includes('view=forgot-password')) return 'forgot-password';
      if (path === '/admin' || search.includes('admin=true')) return 'admin';
      if (path === '/dashboard' || search.includes('view=dashboard')) return 'dashboard';
      if (path === '/series/new' || path === '/correction' || search.includes('view=corr')) return 'corr';
      if (path === '/series' || path === '/historique' || search.includes('view=hist')) return 'hist';
      if (path === '/classes' || search.includes('view=classes')) return 'classes';
      if (path === '/results' || path === '/suivi' || search.includes('view=suivi')) return 'suivi';
      if (path === '/billing' || path === '/tarifs' || path === '/pricing' || search.includes('view=pricing')) return 'pricing';
      if (path === '/referrals' || path === '/parrainage' || search.includes('view=referrals')) return 'referrals';
      if (path === '/settings' || path === '/parametres' || search.includes('view=settings')) return 'settings';
      if (path === '/help' || path === '/faq' || hash === '#faq' || search.includes('view=faq')) return 'faq';
    } catch {}
    return 'landing';
  });

  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Supabase Auth Integration (Official SDK Session & Profile)
  const {
    user,
    session,
    profile,
    balance,
    subscription,
    currentLead: supabaseLead,
    loading: authLoading,
    signOut,
    refreshProfile,
  } = useSupabaseAuth();

  // Local state for authenticated teacher (persisted across sessions)
  const [localLead, setLocalLead] = useState<LeadData | null>(() => {
    try {
      const saved = localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Exclure formellement l'ancien compte test générique pour éviter tout contournement
        if (parsed && parsed.email && parsed.email !== 'professeur@praxis.edu') {
          return parsed;
        }
      }
    } catch {}
    // Par défaut, aucun compte test générique : l'utilisateur doit s'inscrire ou se connecter
    return null;
  });

  // Nettoyage immédiat de tout ancien compte test partagé
  useEffect(() => {
    try {
      const saved = localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.email === 'professeur@praxis.edu') {
          localStorage.removeItem('praxis_lead');
          localStorage.removeItem('cpro_lead');
          setLocalLead(null);
        }
      }
    } catch {}
  }, []);

  // Effective authenticated lead (Supabase Auth prend la priorité absolue, puis profil local persistant)
  const currentLead: LeadData | null = supabaseLead || localLead;

  // Paystack Return / Callback Handler
  const [paystackNotice, setPaystackNotice] = useState<string | null>(null);

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const paystackRef = searchParams.get('paystack_ref') || searchParams.get('reference') || searchParams.get('trxref');
      const isDemo = searchParams.get('demo_pay') === '1' || searchParams.get('demo') === 'true';

      if (paystackRef && paystackRef !== 'init') {
        const verifyPayment = async () => {
          try {
            setPaystackNotice('Vérification de votre paiement Paystack en cours...');
            const pending = localStorage.getItem('praxis_pending_paystack');
            const pendingData = pending ? JSON.parse(pending) : {};

            const queryParams = new URLSearchParams({
              demo: isDemo ? '1' : '0',
              email: pendingData.email || '',
              name: pendingData.name || '',
              planId: pendingData.plan || '',
            });

            const res = await fetch(`/api/paystack/verify/${encodeURIComponent(paystackRef)}?${queryParams.toString()}`);
            const data = await res.json();

            if (res.ok && data.success && data.teacher) {
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
              setLocalLead(updatedLead);
              localStorage.removeItem('praxis_pending_paystack');

              try {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
              } catch {}

              setPaystackNotice(data.message || 'Paiement Paystack validé avec succès ! Vos corrections sont disponibles.');
              setTimeout(() => setPaystackNotice(null), 8000);
            } else {
              setPaystackNotice(data.error || 'Paiement non confirmé. Veuillez contacter le support.');
              setTimeout(() => setPaystackNotice(null), 6000);
            }
          } catch (err: any) {
            console.error('Paystack verification error:', err);
            setPaystackNotice('Erreur lors de la vérification Paystack.');
            setTimeout(() => setPaystackNotice(null), 6000);
          } finally {
            try {
              const cleanUrl = window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch {}
          }
        };

        verifyPayment();
      }
    } catch (e) {
      console.warn('Paystack return check error:', e);
    }
  }, []);

  const PATH_MAP: Record<MainView, string> = {
    landing: '/',
    login: '/login',
    register: '/register',
    'forgot-password': '/forgot-password',
    dashboard: '/dashboard',
    corr: '/series/new',
    hist: '/series',
    classes: '/classes',
    suivi: '/results',
    pricing: '/billing',
    referrals: '/referrals',
    settings: '/settings',
    faq: '/help',
    admin: '/admin',
  };

  interface NavigationEntry {
    view: MainView;
    step?: number;
  }

  const [currentStep, setCurrentStep] = useState<number>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const s = parseInt(search.get('step') || '1', 10);
      return s >= 1 && s <= 5 ? s : 1;
    } catch {
      return 1;
    }
  });

  const [viewHistory, setViewHistory] = useState<NavigationEntry[]>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const s = parseInt(search.get('step') || '1', 10);
      if (activeView === 'corr' && s > 1) {
        return [
          { view: 'dashboard' },
          { view: 'corr', step: 1 },
          { view: 'corr', step: s },
        ];
      }
    } catch {}
    return [{ view: activeView, step: activeView === 'corr' ? currentStep : undefined }];
  });

  const goToStep = (step: number) => {
    setCurrentStep(step);
    setActiveView('corr');
    setViewHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.view === 'corr' && last.step === step) return prev;
      return [...prev, { view: 'corr', step }];
    });
    try {
      const targetPath = step > 1 ? `/series/new?step=${step}` : '/series/new';
      window.history.pushState({ view: 'corr', step }, '', targetPath);
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewChange = (view: MainView, step: number = 1) => {
    setActiveView(view);
    if (view === 'corr') {
      setCurrentStep(step);
    }
    setViewHistory((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.view === view && (view !== 'corr' || last.step === step)) return prev;
      return [...prev, { view, step: view === 'corr' ? step : undefined }];
    });
    try {
      const basePath = PATH_MAP[view] || '/';
      const targetPath = view === 'corr' && step > 1 ? `${basePath}?step=${step}` : basePath;
      if (window.location.pathname + window.location.search !== targetPath) {
        window.history.pushState({ view, step: view === 'corr' ? step : undefined }, '', targetPath);
      }
    } catch {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    // 1. Si l'utilisateur est dans le tunnel de correction
    if (activeView === 'corr') {
      // Cas A : Sur la page de soumission des copies (Étape 2)
      // Le bouton retour le ramène DIRECTEMENT à l'étape 1 (Sujet, corrigé, barème, matière)
      if (currentStep === 2) {
        setCurrentStep(1);
        setViewHistory((prev) => {
          const filtered = prev.filter((entry) => !(entry.view === 'corr' && entry.step === 2));
          if (!filtered.some((e) => e.view === 'corr' && e.step === 1)) {
            filtered.push({ view: 'corr', step: 1 });
          }
          return filtered;
        });
        try {
          window.history.pushState({ view: 'corr', step: 1 }, '', '/series/new');
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Cas B : En cours de correction (Étape 3) -> Retour vers le dépôt des copies (Étape 2)
      if (currentStep === 3) {
        setCurrentStep(2);
        setViewHistory((prev) => prev.filter((entry) => !(entry.view === 'corr' && entry.step === 3)));
        try {
          window.history.pushState({ view: 'corr', step: 2 }, '', '/series/new?step=2');
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Cas C : Consultation des résultats (Étape 4) -> Retour vers le tableau des copies (Étape 2)
      if (currentStep === 4) {
        setCurrentStep(2);
        setViewHistory((prev) => prev.filter((entry) => !(entry.view === 'corr' && entry.step === 4)));
        try {
          window.history.pushState({ view: 'corr', step: 2 }, '', '/series/new?step=2');
        } catch {}
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return;
      }

      // Cas D : À l'Étape 1 de correction -> Retour vers la vue précédente (Dashboard, etc.)
    }

    // 2. Navigation d'historique générale entre les pages
    if (viewHistory.length > 1) {
      const nextHistory = [...viewHistory];
      nextHistory.pop(); // Retire la page actuelle
      const prevEntry = nextHistory[nextHistory.length - 1] || { view: 'dashboard' };
      setViewHistory(nextHistory);
      setActiveView(prevEntry.view);
      if (prevEntry.view === 'corr') {
        setCurrentStep(prevEntry.step || 1);
      }
      try {
        const basePath = PATH_MAP[prevEntry.view] || '/';
        const targetPath = prevEntry.view === 'corr' && prevEntry.step && prevEntry.step > 1
          ? `${basePath}?step=${prevEntry.step}`
          : basePath;
        window.history.pushState(prevEntry, '', targetPath);
      } catch {}
    } else {
      handleViewChange('dashboard');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = (event: PopStateEvent) => {
      const state = event.state as { view?: MainView; step?: number } | null;
      if (state && state.view) {
        setActiveView(state.view);
        if (state.view === 'corr') {
          setCurrentStep(state.step || 1);
        }
        return;
      }

      const path = window.location.pathname;
      const search = new URLSearchParams(window.location.search);
      const stepParam = parseInt(search.get('step') || '1', 10);
      const hash = window.location.hash;

      if (path === '/login') {
        setActiveView('login');
      } else if (path === '/register') {
        setActiveView('register');
      } else if (path === '/forgot-password') {
        setActiveView('forgot-password');
      } else if (path === '/admin') {
        setActiveView('admin');
      } else if (path === '/dashboard') {
        setActiveView('dashboard');
      } else if (path === '/series/new' || path === '/correction') {
        setActiveView('corr');
        setCurrentStep(stepParam >= 1 && stepParam <= 5 ? stepParam : 1);
      } else if (path === '/series' || path === '/historique') {
        setActiveView('hist');
      } else if (path === '/classes') {
        setActiveView('classes');
      } else if (path === '/results' || path === '/suivi') {
        setActiveView('suivi');
      } else if (path === '/billing' || path === '/tarifs' || path === '/pricing') {
        setActiveView('pricing');
      } else if (path === '/referrals' || path === '/parrainage') {
        setActiveView('referrals');
      } else if (path === '/settings' || path === '/parametres') {
        setActiveView('settings');
      } else if (path === '/help' || path === '/faq' || hash === '#faq') {
        setActiveView('faq');
      } else {
        setActiveView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // ROUTE GUARDS & PROTECTION (ÉTAPE 9)
  // Routes privées enseignant nécessitant une session active
  const PRIVATE_VIEWS: MainView[] = [
    'dashboard',
    'corr',
    'hist',
    'classes',
    'suivi',
    'pricing',
    'referrals',
    'settings',
  ];

  useEffect(() => {
    if (authLoading) return;

    const isUserAuthenticated = Boolean(
      user || (currentLead && currentLead.email && currentLead.email !== 'professeur@praxis.edu')
    );

    // 1. Utilisateur non authentifié tentant d'accéder à une route privée -> redirection vers l'inscription obligatoire
    if (!isUserAuthenticated && PRIVATE_VIEWS.includes(activeView)) {
      handleViewChange('register');
    }

    // 2. Utilisateur déjà connecté visitant /login ou /register -> redirection vers /dashboard
    if (
      isUserAuthenticated &&
      (activeView === 'login' || activeView === 'register' || activeView === 'forgot-password')
    ) {
      handleViewChange('dashboard');
    }
  }, [user, currentLead, activeView, authLoading]);

  const [isLeadGateOpen, setIsLeadGateOpen] = useState<boolean>(false);
  const [isPaywallOpen, setIsPaywallOpen] = useState<boolean>(false);
  const [selectedPlanForPaywall, setSelectedPlanForPaywall] = useState<PaywallPlanId>('quarterly');

  // Partner / Affiliate Referral code detection (?ref=PROFJEAN or ?promo=PROFJEAN)
  const [partnerRefCode, setPartnerRefCode] = useState<string>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const ref = search.get('ref') || search.get('promo') || search.get('code');
      if (ref && ref.trim()) {
        const cleanRef = ref.trim().toUpperCase();
        localStorage.setItem('praxis_partner_ref', cleanRef);
        return cleanRef;
      }
      return localStorage.getItem('praxis_partner_ref') || '';
    } catch {
      return '';
    }
  });

  const [config, setConfig] = useState<AssignmentConfig>(() => {
    try {
      const saved = localStorage.getItem('praxis_config');
      if (saved) {
        const parsed = JSON.parse(saved);
        // If the stored config still has the old hardcoded demo rubric text or pythagorean instructions, clear them so ghost placeholder shows
        if (typeof parsed.rubricContent === 'string' && parsed.rubricContent.includes("Triangle rectangle et calcul de l'hypoténuse")) {
          parsed.rubricContent = '';
        }
        if (parsed.pedagogicalGuidelines?.customInstructions?.includes("théorème de Pythagore")) {
          parsed.pedagogicalGuidelines.customInstructions = '';
        }
        if (typeof parsed.title === 'string' && (parsed.title.includes("Pythagore") || parsed.title.includes("Dictée préparée") || parsed.title.includes("Devoir Surveillé N°3"))) {
          parsed.title = '';
        }
        return parsed;
      }
      return DEFAULT_CONFIG;
    } catch {
      return DEFAULT_CONFIG;
    }
  });

  const [submissions, setSubmissions] = useState<StudentSubmission[]>(() => {
    try {
      const saved = localStorage.getItem('praxis_submissions');
      if (saved) {
        const parsed: StudentSubmission[] = JSON.parse(saved);
        const demoNames = ['lucas martin', 'sarah benali', 'thomas dubois', 'awa', 'maxime', 'camille rousseau'];
        return parsed.filter(
          (s) =>
            s.id !== 'sub-1' &&
            s.id !== 'sub-2' &&
            s.id !== 'sub-3' &&
            s.id !== 'sub-dictee-1' &&
            s.id !== 'sub-dictee-2' &&
            !demoNames.includes((s.studentName || '').toLowerCase())
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  // Purge any residual demo submissions, classes, and evaluations from local storage on mount
  useEffect(() => {
    try {
      const savedSubmissions = localStorage.getItem('praxis_submissions');
      if (savedSubmissions) {
        const parsed: StudentSubmission[] = JSON.parse(savedSubmissions);
        const demoNames = ['lucas martin', 'sarah benali', 'thomas dubois', 'awa', 'maxime', 'camille rousseau'];
        const filtered = parsed.filter(
          (s) =>
            s.id !== 'sub-1' &&
            s.id !== 'sub-2' &&
            s.id !== 'sub-3' &&
            s.id !== 'sub-dictee-1' &&
            s.id !== 'sub-dictee-2' &&
            !demoNames.includes((s.studentName || '').toLowerCase())
        );
        if (filtered.length !== parsed.length) {
          setSubmissions(filtered);
          localStorage.setItem('praxis_submissions', JSON.stringify(filtered));
        }
      }

      const savedClasses = localStorage.getItem('cpro_classes');
      if (savedClasses) {
        const parsedClasses: ClassGroup[] = JSON.parse(savedClasses);
        const filteredClasses = parsedClasses.filter(
          (c) => c.id !== 'class_demo_3b' && !c.id.startsWith('class_demo') && !c.name.toLowerCase().includes('demo')
        );
        if (filteredClasses.length !== parsedClasses.length) {
          setClasses(filteredClasses);
          localStorage.setItem('cpro_classes', JSON.stringify(filteredClasses));
        }
      }

      const savedEvals = localStorage.getItem('cpro_evaluations');
      if (savedEvals) {
        const parsedEvals: SavedEvaluation[] = JSON.parse(savedEvals);
        const filteredEvals = parsedEvals.filter(
          (e) => e.classId !== 'class_demo_3b' && !e.id.startsWith('eval_demo') && !e.title.toLowerCase().includes('demo')
        );
        if (filteredEvals.length !== parsedEvals.length) {
          setSavedEvaluations(filteredEvals);
          localStorage.setItem('cpro_evaluations', JSON.stringify(filteredEvals));
        }
      }
    } catch {}
  }, []);

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    try {
      const saved = localStorage.getItem('cpro_classes');
      if (saved) {
        const parsed: ClassGroup[] = JSON.parse(saved);
        // Exclude fictitious/demo classes (such as class_demo_3b)
        const realClasses = parsed.filter(
          (c) => c.id !== 'class_demo_3b' && !c.id.startsWith('class_demo') && !c.name.toLowerCase().includes('demo')
        );
        return realClasses;
      }
      return [];
    } catch {
      return [];
    }
  });

  const [savedEvaluations, setSavedEvaluations] = useState<SavedEvaluation[]>(() => {
    try {
      const saved = localStorage.getItem('cpro_evaluations');
      if (saved) {
        const parsed: SavedEvaluation[] = JSON.parse(saved);
        return parsed.filter(
          (e) => e.classId !== 'class_demo_3b' && !e.id.startsWith('eval_demo')
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  const [activeTeacherNotes, setActiveTeacherNotes] = useState<string>('');
  const [isCurrentEvalValidated, setIsCurrentEvalValidated] = useState<boolean>(false);
  const [selectedStudentForModal, setSelectedStudentForModal] = useState<StudentSubmission | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);

  // Auto-persist config
  useEffect(() => {
    try {
      localStorage.setItem('praxis_config', JSON.stringify(config));
    } catch (e) {
      console.warn('Storage quota warning config');
    }
  }, [config]);

  // Auto-persist submissions
  useEffect(() => {
    try {
      localStorage.setItem('praxis_submissions', JSON.stringify(submissions));
    } catch (e) {
      console.warn('Storage quota warning submissions');
    }
  }, [submissions]);

  // Auto-persist classes
  useEffect(() => {
    try {
      localStorage.setItem('cpro_classes', JSON.stringify(classes));
    } catch (e) {
      console.warn('Storage quota warning classes');
    }
  }, [classes]);

  // Auto-persist saved evaluations
  useEffect(() => {
    try {
      localStorage.setItem('cpro_evaluations', JSON.stringify(savedEvaluations));
    } catch (e) {
      console.warn('Storage quota warning evaluations');
    }
  }, [savedEvaluations]);

  // Reset entire assignment
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setConfig(DEFAULT_CONFIG);
    setSubmissions([]);
    setActiveTeacherNotes('');
    setIsCurrentEvalValidated(false);
    setCurrentStep(1);
    setActiveView('corr');
    localStorage.removeItem('praxis_config');
    localStorage.removeItem('praxis_submissions');
    setIsResetModalOpen(false);
  };

  // Save current evaluation to history
  const handleSaveToHistory = (notes: string, isValidated?: boolean) => {
    setActiveTeacherNotes(notes);

    if (isValidated !== undefined) {
      setIsCurrentEvalValidated(isValidated);
    }
    const validatedFlag = isValidated !== undefined ? isValidated : isCurrentEvalValidated;

    const graded = submissions.filter((s) => s.status === 'completed' && s.result);
    const grades = graded.map((s) => s.result!.note);
    const avg = grades.length > 0 ? Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)) : 0;
    const sorted = [...grades].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const max = grades.length > 0 ? Math.max(...grades) : 0;
    const min = grades.length > 0 ? Math.min(...grades) : 0;
    const successRate = grades.length > 0 ? Math.round((grades.filter((g) => g >= config.maxGrade / 2).length / grades.length) * 100) : 0;

    // Match with class if students match
    const matchingClass = classes.find((cls) =>
      cls.students.some((name) =>
        submissions.some((sub) => sub.studentName && sub.studentName.toLowerCase() === name.toLowerCase())
      )
    );

    const newEval: SavedEvaluation = {
      id: 'eval_' + Date.now(),
      title: config.title || 'Évaluation sans titre',
      discipline: config.discipline,
      level: config.level,
      date: new Date().toISOString(),
      maxGrade: config.maxGrade,
      config: config,
      submissions: submissions,
      teacherComments: notes,
      classId: matchingClass?.id,
      className: matchingClass?.name,
      isValidated: validatedFlag,
      validatedAt: validatedFlag ? new Date().toISOString() : undefined,
      metrics: {
        totalStudents: submissions.length,
        gradedStudents: graded.length,
        averageGrade: avg,
        medianGrade: median,
        highestGrade: max,
        lowestGrade: min,
        successRate: successRate,
      },
    };

    setSavedEvaluations((prev) => [newEval, ...prev.filter((e) => e.title !== newEval.title || e.date.slice(0, 10) !== newEval.date.slice(0, 10))]);

    // Also update matching class's evaluations list with new grades
    if (matchingClass) {
      const gradesMap: Record<string, number> = {};
      graded.forEach((sub) => {
        if (sub.result) {
          const matchedName = matchingClass.students.find(
            (st) => st.toLowerCase() === sub.studentName.toLowerCase()
          );
          if (matchedName) {
            gradesMap[matchedName] = sub.result.note;
          }
        }
      });

      setClasses((prev) =>
        prev.map((c) => {
          if (c.id === matchingClass.id) {
            const evs = c.evaluations || [];
            const exists = evs.some((e) => e.savedEvaluationId === newEval.id || e.title === newEval.title);
            if (!exists) {
              return {
                ...c,
                evaluations: [
                  {
                    id: 'classeval_' + Date.now(),
                    title: newEval.title,
                    date: newEval.date.slice(0, 10),
                    discipline: newEval.discipline,
                    maxGrade: newEval.maxGrade,
                    grades: gradesMap,
                    savedEvaluationId: newEval.id,
                  },
                  ...evs,
                ],
              };
            }
          }
          return c;
        })
      );
    }
  };

  // Load a past evaluation from history into current view
  const handleLoadEvaluation = (evaluation: SavedEvaluation) => {
    setConfig(evaluation.config);
    setSubmissions(evaluation.submissions);
    setActiveTeacherNotes(evaluation.teacherComments || '');
    setIsCurrentEvalValidated(Boolean(evaluation.isValidated));
    setActiveView('corr');
    setCurrentStep(4);
  };

  // Delete an evaluation from history
  const handleDeleteEvaluation = (id: string) => {
    setSavedEvaluations((prev) => prev.filter((e) => e.id !== id));
  };

  // Use a class group for active correction with smart name matching
  const handleUseClassForCorrection = (classGroup: ClassGroup) => {
    if (submissions.length > 0) {
      const usedStudents = new Set<string>();
      const matched = submissions.map((sub) => {
        const fileLower = (sub.fileName || '').toLowerCase();
        const currentLower = (sub.studentName || '').toLowerCase();

        // 1. Direct name match in class roster (e.g. "Sass.pdf" -> "Sass")
        const exactMatch = classGroup.students.find(
          (st) => !usedStudents.has(st) && (fileLower.includes(st.toLowerCase()) || currentLower === st.toLowerCase())
        );
        if (exactMatch) {
          usedStudents.add(exactMatch);
          return { sub, matchedStudent: exactMatch };
        }
        return { sub, matchedStudent: null };
      });

      // 2. For remaining submissions, pick from unassigned students
      const remainingStudents = classGroup.students.filter((st) => !usedStudents.has(st));
      let remIdx = 0;

      setSubmissions(
        matched.map(({ sub, matchedStudent }) => {
          if (matchedStudent) {
            return { ...sub, studentName: matchedStudent };
          }
          const nextAvailable = remainingStudents[remIdx++];
          return {
            ...sub,
            studentName: nextAvailable || sub.studentName || 'Élève',
          };
        })
      );
    }
    setActiveView('corr');
    setCurrentStep(submissions.length > 0 ? 2 : 1);
  };

  // Swap two student submissions (identities or whole copies)
  const handleSwapSubmissions = (subId1: string, subId2: string, mode: 'names' | 'all' = 'names') => {
    setSubmissions((prev) => {
      const sub1 = prev.find((s) => s.id === subId1);
      const sub2 = prev.find((s) => s.id === subId2);
      if (!sub1 || !sub2) return prev;

      if (mode === 'names') {
        // Swap names and assign each result to the new student name
        const name1 = sub1.studentName;
        const name2 = sub2.studentName;

        return prev.map((s) => {
          if (s.id === subId1) {
            return {
              ...s,
              studentName: name2,
              result: s.result ? { ...s.result, nom_eleve: name2, manuallyAdjusted: true } : undefined,
            };
          }
          if (s.id === subId2) {
            return {
              ...s,
              studentName: name1,
              result: s.result ? { ...s.result, nom_eleve: name1, manuallyAdjusted: true } : undefined,
            };
          }
          return s;
        });
      } else {
        // Swap entire copies/results between records
        return prev.map((s) => {
          if (s.id === subId1) {
            return {
              ...s,
              fileName: sub2.fileName,
              imageDataUrl: sub2.imageDataUrl,
              allPages: sub2.allPages,
              pageCount: sub2.pageCount,
              rotation: sub2.rotation,
              result: sub2.result,
              status: sub2.status,
            };
          }
          if (s.id === subId2) {
            return {
              ...s,
              fileName: sub1.fileName,
              imageDataUrl: sub1.imageDataUrl,
              allPages: sub1.allPages,
              pageCount: sub1.pageCount,
              rotation: sub1.rotation,
              result: sub1.result,
              status: sub1.status,
            };
          }
          return s;
        });
      }
    });

    // Update active modal submission if open
    setSelectedStudentForModal((curr) => {
      if (!curr) return null;
      if (curr.id === subId1) {
        const other = submissions.find((s) => s.id === subId2);
        if (other) {
          return {
            ...curr,
            studentName: other.studentName,
            result: curr.result ? { ...curr.result, nom_eleve: other.studentName, manuallyAdjusted: true } : curr.result,
          };
        }
      }
      if (curr.id === subId2) {
        const other = submissions.find((s) => s.id === subId1);
        if (other) {
          return {
            ...curr,
            studentName: other.studentName,
            result: curr.result ? { ...curr.result, nom_eleve: other.studentName, manuallyAdjusted: true } : curr.result,
          };
        }
      }
      return curr;
    });
  };

  // Update a student submission after manual edit
  const handleSaveStudentEdit = (updatedSub: StudentSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
    setSelectedStudentForModal(updatedSub);
  };

  // Action when teacher triggers the correction process (Step 2 button or direct step navigation)
  const handleRequestStartCorrection = () => {
    if (!currentLead) {
      const defaultLead: LeadData = {
        name: 'Professeur',
        email: 'professeur@praxis.edu',
        whatsapp: '',
        plan: 'trial',
        quota: 50,
        subscriptionCredits: 50,
        extraCredits: 0,
        copiesCorrected: 0,
        status: 'active',
      };
      localStorage.setItem('praxis_lead', JSON.stringify(defaultLead));
      localStorage.setItem('cpro_lead', JSON.stringify(defaultLead));
      setLocalLead(defaultLead);
    }
    goToStep(3);
  };

  const handleLeadSubmitSuccess = (lead: LeadData) => {
    setLocalLead(lead);
    setIsLeadGateOpen(false);
    refreshProfile();
    // Registration completed: immediately launch correction
    goToStep(3);
  };

  const handleCloseLeadGate = () => {
    // Strictly stay on current step; correction is NOT started unless registered
    setIsLeadGateOpen(false);
  };

  const handleLogout = async () => {
    await signOut();
    localStorage.removeItem('praxis_lead');
    localStorage.removeItem('cpro_lead');
    setLocalLead(null);
    handleViewChange('login');
  };

  const handleOpenPaywall = (planId: PaywallPlanId = 'school_year') => {
    setSelectedPlanForPaywall(planId);
    handleViewChange('pricing');
    setIsPaywallOpen(false);
  };

  const handlePaymentSuccess = (updatedTeacher: LeadData) => {
    setLocalLead(updatedTeacher);
    refreshProfile();
  };

  const completedCount = submissions.filter((s) => s.status === 'completed').length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* PUBLIC VIEW: NOTIE AI INSPIRED LANDING PAGE */}
      {activeView === 'landing' && (
        <LandingPage
          onStartCorrection={() => {
            const isAuth = Boolean(
              user || (currentLead && currentLead.email && currentLead.email !== 'professeur@praxis.edu')
            );
            if (isAuth) {
              handleViewChange('corr');
              setCurrentStep(1);
            } else {
              handleViewChange('register');
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToView={(view) => {
            handleViewChange(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenContact={() => setIsContactModalOpen(true)}
          onOpenPaywall={(plan) => handleOpenPaywall(plan || 'quarterly')}
        />
      )}

      {/* AUTH VIEWS: /login, /register, /forgot-password */}
      {(activeView === 'login' || activeView === 'register' || activeView === 'forgot-password') && (
        <AuthView
          initialMode={activeView}
          onNavigate={(view) => handleViewChange(view)}
          onBack={handleBack}
          onAuthSuccess={(authUser: any, authProfile?: any) => {
            refreshProfile();
            if (authUser) {
              const lead: LeadData = {
                name: authProfile?.full_name || authUser?.name || (authUser?.user_metadata?.full_name as string) || (authUser?.email?.split('@')[0] ?? 'Enseignant'),
                email: authUser?.email || '',
                whatsapp: authProfile?.phone_whatsapp || authUser?.whatsapp || (authUser?.user_metadata?.phone_whatsapp as string) || '',
                school: authProfile?.school_name || authUser?.school || (authUser?.user_metadata?.school_name as string) || 'Établissement non précisé',
                plan: (authProfile?.plan_id as SaaSPlan) || authUser?.plan || 'trial',
                status: 'active',
                subscriptionCredits: authUser?.subscriptionCredits ?? 50,
                extraCredits: authUser?.extraCredits ?? 0,
                quota: authUser?.quota ?? 50,
                copiesCorrected: authUser?.copiesCorrected ?? 0,
                userId: authUser?.id || authUser?.userId,
                role: 'teacher',
              };
              setLocalLead(lead);
              localStorage.setItem('praxis_lead', JSON.stringify(lead));
              localStorage.setItem('cpro_lead', JSON.stringify(lead));
            }
            // Si des copies sont déjà prêtes dans la session, on poursuit vers l'évaluation
            if (submissions.length > 0) {
              handleViewChange('corr', 2);
            } else {
              handleViewChange('dashboard');
            }
          }}
        />
      )}

      {/* AUTHENTICATED APP WORKSPACE (PERSISTENT SIDEBAR + TOP HEADER) */}
      {activeView !== 'landing' &&
        activeView !== 'login' &&
        activeView !== 'register' &&
        activeView !== 'forgot-password' && (
        <div className="min-h-screen flex flex-col bg-[#FAFAF8] dark:bg-[#0F141C] text-[#0F1419] dark:text-slate-100 font-sans transition-colors duration-150">
          {/* Persistent Sidebar Navigation */}
          <Sidebar
            activeView={activeView}
            onViewChange={handleViewChange}
            currentLead={currentLead}
            savedEvalsCount={savedEvaluations.length}
            classesCount={classes.length}
            isOpenMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
            onOpenBilling={() => handleOpenPaywall('quarterly')}
          />

          {/* Main Content Area */}
          <div className="lg:pl-64 flex flex-col min-h-screen">
            <TopHeader
              activeView={activeView}
              currentStep={currentStep}
              onViewChange={handleViewChange}
              currentLead={currentLead}
              onOpenMobileSidebar={() => setIsMobileSidebarOpen(true)}
              onLogout={handleLogout}
              onOpenLoginModal={() => handleViewChange('login')}
              onOpenContactModal={() => setIsContactModalOpen(true)}
              onOpenBilling={() => handleOpenPaywall('quarterly')}
              onBack={handleBack}
            />

            <main className="flex-1 w-full max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
              {/* VIEW 0: TEACHER DASHBOARD (ACCUEIL) */}
              {activeView === 'dashboard' && (
                <TeacherDashboardView
                  currentLead={currentLead}
                  savedEvaluations={savedEvaluations}
                  classes={classes}
                  onStartNewCorrection={() => {
                    handleViewChange('corr');
                    goToStep(1);
                  }}
                  onViewSeries={() => handleViewChange('hist')}
                  onViewClasses={() => handleViewChange('classes')}
                  onViewResults={() => handleViewChange('suivi')}
                  onOpenBilling={() => handleOpenPaywall('quarterly')}
                  onOpenReferrals={() => handleViewChange('referrals')}
                  onOpenEvaluation={handleLoadEvaluation}
                />
              )}

              {/* VIEW 1: CORRECTION WORKFLOW (5 STEPS) */}
              {activeView === 'corr' && (
                <div className="space-y-6">
                  {/* Collapsible pedagogical tutorial guide */}
                  <TutorialBanner />

                  {currentStep === 1 && (
                    <Step1Config
                      config={config}
                      onChange={setConfig}
                      onNext={() => goToStep(2)}
                    />
                  )}

                  {currentStep === 2 && (
                    <Step2Upload
                      submissions={submissions}
                      onSubmissionsChange={setSubmissions}
                      onNext={handleRequestStartCorrection}
                      onBack={handleBack}
                      isRegistered={Boolean(currentLead || localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead'))}
                      config={config}
                      onConfigChange={setConfig}
                      classes={classes}
                      onSwapSubmissions={handleSwapSubmissions}
                      currentLead={currentLead}
                    />
                  )}

                  {currentStep === 3 && (
                    <Step3Progress
                      config={config}
                      submissions={submissions}
                      onSubmissionsChange={setSubmissions}
                      onFinish={() => goToStep(4)}
                      onViewDashboard={() => goToStep(4)}
                      onBack={handleBack}
                      currentLead={currentLead}
                      onRequireRegistration={() => setIsLeadGateOpen(true)}
                      onOpenPaywall={() => handleOpenPaywall('quarterly')}
                      onLeadChange={(updatedLead) => {
                        setLocalLead(updatedLead);
                        refreshProfile();
                      }}
                    />
                  )}

                  {currentStep === 4 && (
                    <Step4Dashboard
                      config={config}
                      submissions={submissions}
                      onSubmissionsChange={setSubmissions}
                      onSelectStudent={(sub) => setSelectedStudentForModal(sub)}
                      onOpenPrint={() => setIsPrintModalOpen(true)}
                      onBackToCopies={handleBack}
                      onSaveToHistory={handleSaveToHistory}
                      initialTeacherNotes={activeTeacherNotes}
                      onSwapSubmissions={handleSwapSubmissions}
                      isValidated={isCurrentEvalValidated}
                      onValidateClassCorrection={() => setIsCurrentEvalValidated(true)}
                    />
                  )}
                </div>
              )}

              {/* VIEW 2: CLASSES & ROSTERS */}
              {activeView === 'classes' && (
                <ClassesView
                  classes={classes}
                  onClassesChange={setClasses}
                  onUseClassForCorrection={handleUseClassForCorrection}
                  evaluations={savedEvaluations}
                  currentSubmissions={submissions}
                  onOpenEvaluation={handleLoadEvaluation}
                />
              )}

              {/* VIEW 3: SUIVI INDIVIDUEL ET STATISTIQUES */}
              {activeView === 'suivi' && (
                <SuiviView
                  evaluations={savedEvaluations}
                  currentSubmissions={submissions}
                  onOpenEvaluation={handleLoadEvaluation}
                />
              )}

              {/* VIEW 4: MES SÉRIES (HISTORIQUE) */}
              {activeView === 'hist' && (
                <HistoriqueView
                  evaluations={savedEvaluations}
                  onDeleteEvaluation={handleDeleteEvaluation}
                  onLoadEvaluation={handleLoadEvaluation}
                />
              )}

              {/* VIEW 5: ABONNEMENT & CRÉDITS */}
              {activeView === 'pricing' && (
                <PricingPage
                  currentLead={currentLead}
                  initialPlanId={selectedPlanForPaywall}
                  partnerRefCode={partnerRefCode}
                  onPaymentSuccess={handlePaymentSuccess}
                  onStartCorrection={() => {
                    handleViewChange('corr', 1);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onBackToApp={() => {
                    handleBack();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onOpenContact={() => setIsContactModalOpen(true)}
                />
              )}

              {/* VIEW 6: PROGRAMME DE PARRAINAGE */}
              {activeView === 'referrals' && (
                <ReferralsView
                  currentLead={currentLead}
                  onOpenBilling={() => handleOpenPaywall('quarterly')}
                  onStartCorrection={() => {
                    handleViewChange('corr', 1);
                  }}
                  onBack={handleBack}
                />
              )}

              {/* VIEW 7: PARAMÈTRES DU COMPTE */}
              {activeView === 'settings' && (
                <SettingsView
                  currentLead={currentLead}
                  onUpdateLead={(updated) => {
                    setLocalLead(updated);
                    refreshProfile();
                  }}
                  onOpenBilling={() => handleOpenPaywall('quarterly')}
                />
              )}

              {/* VIEW 8: FAQ & AIDE PÉDAGOGIQUE */}
              {activeView === 'faq' && (
                <FaqView
                  onStartCorrection={() => {
                    handleViewChange('corr');
                    setCurrentStep(1);
                  }}
                  onOpenContact={() => setIsContactModalOpen(true)}
                />
              )}

              {/* VIEW 9: DASHBOARD ADMIN */}
              {activeView === 'admin' && (
                <AdminDashboard
                  onBackToApp={() => handleViewChange('dashboard')}
                />
              )}
            </main>
          </div>
        </div>
      )}

      {/* Side-by-side Student Inspection and Adjustment Modal */}
      {selectedStudentForModal && (
        <StudentDetailModal
          submission={selectedStudentForModal}
          allSubmissions={submissions}
          config={config}
          onClose={() => setSelectedStudentForModal(null)}
          onSave={handleSaveStudentEdit}
          onSwapSubmissions={handleSwapSubmissions}
          isValidated={isCurrentEvalValidated}
          teacherName={currentLead?.name || 'Professeur'}
        />
      )}

      {/* Printable individual student evaluation sheets modal */}
      {isPrintModalOpen && (
        <PrintCorrectionSheets
          config={config}
          submissions={submissions}
          onClose={() => setIsPrintModalOpen(false)}
        />
      )}

      {/* Teacher Lead Capture Gate Modal */}
      <LeadGateModal
        isOpen={isLeadGateOpen}
        onClose={handleCloseLeadGate}
        onSubmitSuccess={handleLeadSubmitSuccess}
      />

      {/* Support & Contact Modal with Phone & Email */}
      <ContactModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* Wave Mobile Money & Carte Bancaire Paywall Modal */}
      <PaywallModal
        isOpen={isPaywallOpen}
        onClose={() => setIsPaywallOpen(false)}
        currentLead={currentLead}
        onPaymentSuccess={handlePaymentSuccess}
        initialPlanId={selectedPlanForPaywall}
        partnerRefCode={partnerRefCode}
      />

      {/* Paystack Payment Status Banner / Toast */}
      {paystackNotice && (
        <div className="fixed top-5 right-5 z-50 max-w-md p-4 rounded-2xl bg-slate-900/95 backdrop-blur-md text-white shadow-2xl border border-emerald-500/50 animate-in slide-in-from-top-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <Zap className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-xs flex-1">
            <span className="font-extrabold block text-emerald-400">Paiement Paystack</span>
            <p className="text-slate-200 mt-0.5 leading-snug">{paystackNotice}</p>
          </div>
          <button
            type="button"
            onClick={() => setPaystackNotice(null)}
            className="text-slate-400 hover:text-white p-1 text-xs cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* In-app Reset Confirmation Modal */}
      {isResetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-amber-100 text-amber-700 rounded-xl shrink-0">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Réinitialiser le devoir ?</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Cette action réinitialisera la configuration et effacera les copies actuelles pour démarrer un nouveau devoir vierge.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmReset}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Oui, réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PWA Mobile Installation Bottom Sheet (Phones only) */}
      <MobilePWAInstallModal />
    </div>
  );
}
