export type Discipline =
  | 'Mathématiques'
  | 'Français'
  | 'Histoire-Géographie'
  | 'Sciences de la Vie et de la Terre (SVT)'
  | 'Physique-Chimie'
  | 'Anglais (LV1)'
  | 'Espagnol (LV2)'
  | 'Allemand'
  | 'Philosophie'
  | 'Sciences Économiques et Sociales (SES)'
  | 'Technologie'
  | 'Autre discipline';

export type SchoolLevel =
  | 'Primaire (CP1 - CM2)'
  | '6e'
  | '5e'
  | '4e'
  | '3e (Brevet)'
  | '2nde (Lycée)'
  | '1ère (Baccalauréat)'
  | 'Terminale (Baccalauréat)';

export type CorrectionMode = 'with_rubric' | 'autonomous';

export type AssessmentType =
  | 'standard'
  | 'dictee'
  | 'dissertation'
  | 'commentaire'
  | 'etude_document'
  | 'expression_ecrite'
  | 'traduction'
  | 'mathematiques'
  | 'qcm';

export interface PedagogicalGuidelines {
  spellingTolerance: boolean;
  rewardEffortAndMethod: boolean;
  rigorousJustification: boolean;
  encourageClarity: boolean;
  customInstructions: string;
}

export interface AssignmentConfig {
  discipline: Discipline;
  level: SchoolLevel;
  title: string;
  maxGrade: number;
  correctionMode: CorrectionMode;
  assessmentType?: AssessmentType; // 'standard' | 'dictee' | 'dissertation' | 'mathematiques' | 'qcm'
  rubricContent: string;
  rubricImage?: string; // base64 (page 1 or single image)
  rubricImages?: string[]; // base64 array (for multi-page PDF or multiple images)
  rubricFileName?: string;
  pedagogicalGuidelines: PedagogicalGuidelines;
  analysisSpeed?: 'turbo' | 'deep'; // 'turbo' (~4-6s par copie) ou 'deep' (~15-20s avec raisonnement étendu)
  aiEngine?: 'auto' | 'haiku' | 'gemini'; // 'auto' (Gemini Flash puis Haiku) | 'haiku' (Claude Haiku économique) | 'gemini' (Gemini Flash)
  pagesPerCopy?: number; // Nombre de pages par copie pour le regroupement automatique des photos (ex: 1, 2, 3, 4...)
}

export interface StudentSubmission {
  id: string;
  studentName: string;
  imageDataUrl: string; // primary preview page
  allPages?: string[]; // all pages for multi-page copies (e.g. 4 pages for 1 student)
  pageCount?: number;
  fileName: string;
  rotation: number; // 0, 90, 180, 270
  pageIndex?: number;
  status: 'pending' | 'analyzing' | 'completed' | 'error';
  errorMessage?: string;
  result?: CorrectionResult;
}

export interface CompetenceItem {
  nom: string;
  statut: 'Acquis' | 'En cours' | 'Non acquis';
  commentaire?: string;
}

export interface QuestionEvaluation {
  numero_ou_titre: string;
  reponse_eleve: string;
  reponse_attendue: string;
  note: number;
  note_max: number;
  justification: string;
  confiance?: 'elevee' | 'moyenne' | 'faible';
  verification_recommandee?: boolean;
  difficulte_lecture?: boolean;
  remarque_enseignant?: string;
}

export interface CorrectionResult {
  nom_eleve: string;
  note: number;
  note_sur: number;
  note_ia?: number;
  confiance_globale?: 'elevee' | 'moyenne' | 'faible';
  verification_humaine_recommandee?: boolean;
  motif_verification?: string;
  statut_validation?: 'propose_ia' | 'en_cours_examen' | 'valide_professeur';
  valide_par_nom?: string;
  valide_le?: string;
  appreciation: string;
  points_forts: string[];
  points_ameliorer: string[];
  competences: CompetenceItem[];
  questions: QuestionEvaluation[];
  texte_transcrit_resume?: string;
  nom_manuscrit_detecte?: string;
  lisibilite?: 'excellente' | 'bonne' | 'moyenne' | 'faible' | 'illisible';
  avertissement_lisibilite?: string;
  teacherNotes?: string;
  manuallyAdjusted?: boolean;
}

export interface ClassMetrics {
  totalStudents: number;
  gradedStudents: number;
  averageGrade: number;
  medianGrade: number;
  highestGrade: number;
  lowestGrade: number;
  successRate: number; // percentage >= 50%
}

export interface ClassEvaluation {
  id: string;
  title: string;
  date: string;
  discipline?: string;
  maxGrade: number;
  grades: Record<string, number>; // studentName -> grade
  savedEvaluationId?: string;
}

export interface ClassGroup {
  id: string;
  name: string;
  level?: string;
  discipline?: string;
  students: string[];
  createdAt: string;
  evaluations?: ClassEvaluation[];
}

export interface SavedEvaluation {
  id: string;
  title: string;
  discipline: string;
  level: string;
  date: string;
  maxGrade: number;
  config: AssignmentConfig;
  submissions: StudentSubmission[];
  metrics: ClassMetrics;
  teacherComments?: string;
  classId?: string;
  className?: string;
  isValidated?: boolean;
  validatedAt?: string;
}

export interface LeadData {
  name: string;
  email: string;
  whatsapp: string;
  school?: string;
  plan?: SaaSPlan;
  quota?: number;
  copiesCorrected?: number;
  subscriptionCredits?: number; // Incluses dans l'abonnement (max 1500)
  extraCredits?: number; // Séries supplémentaires achetées à part (sans expiration)
  status?: AccountStatus;
  totalSpent?: number;
  firstPurchaseDiscountUsed?: boolean;
  usedPromoCodes?: string[];
  referredByPartner?: string;
  userId?: string;
  role?: 'teacher' | 'admin' | 'partner';
  referralCode?: string;
}

export interface ReferralItem {
  id: string;
  referrerUserId: string;
  referredUserId: string;
  referredName: string;
  referredSchool?: string;
  referralCode: string;
  status: 'pending' | 'rewarded' | 'canceled';
  rewardGranted: boolean;
  rewardAmount: number;
  rewardedAt?: string | null;
  createdAt: string;
}

export type MainView =
  | 'landing'
  | 'login'
  | 'register'
  | 'forgot-password'
  | 'dashboard'
  | 'corr'
  | 'classes'
  | 'suivi'
  | 'hist'
  | 'faq'
  | 'pricing'
  | 'referrals'
  | 'settings'
  | 'admin';

export type SaaSPlan = 'free' | 'trial' | 'monthly' | 'quarterly' | 'school_year' | 'annual' | 'institution' | 'pack';
export type PaywallPlanId = 'monthly' | 'quarterly' | 'school_year' | 'extra_100' | 'extra_500';
export type AccountStatus = 'active' | 'trial' | 'paused' | 'inactive' | 'canceled';

export interface TransactionRecord {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  amount: number;
  currency: string;
  plan: SaaSPlan;
  status: 'succeeded' | 'refunded' | 'pending';
  paymentMethod: string;
  description: string;
  refundReason?: string;
  refundedAt?: string;
  originalAmount?: number;
  discountAmount?: number;
  promoCode?: string;
  discountPercent?: number;
  partnerAttribution?: string;
  partnerCommission?: number;
}

export interface TeacherAccount {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  school: string;
  city?: string;
  plan: SaaSPlan;
  status: AccountStatus;
  notes: string;
  createdAt: string;
  lastActiveAt?: string;
  copiesCorrected: number;
  quota: number;
  totalSpent: number;
  renewalDate?: string;
  trialDaysLeft?: number;
  transactions?: TransactionRecord[];
}

export interface AdminKPISummary {
  mrr: number;
  arr: number;
  totalTeachers: number;
  freeCount: number;
  trialCount: number;
  paidCount: number;
  activeSubscribers: number;
  conversionRate: number;
  newTeachers30d: number;
  growthRate30d: number;
  activeTrials: number;
  arpu: number;
  mrrMonthlyHistory: Array<{ month: string; mrr: number; users: number; paidUsers: number }>;
  planDistribution: {
    free: number;
    trial: number;
    monthly: number;
    annual: number;
    institution: number;
  };
}
