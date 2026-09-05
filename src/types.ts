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
  | 'Enseignement Supérieur / Autre';

export type SchoolLevel =
  | '6e (Cycle 3)'
  | '5e (Cycle 4)'
  | '4e (Cycle 4)'
  | '3e (Brevet)'
  | '2nde (Lycée)'
  | '1ère (Baccalauréat)'
  | 'Terminale (Baccalauréat)'
  | 'Supérieur / BTS / CPGE / Université';

export type CorrectionMode = 'with_rubric' | 'autonomous';

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
  rubricContent: string;
  rubricImage?: string; // base64 (page 1 or single image)
  rubricImages?: string[]; // base64 array (for multi-page PDF or multiple images)
  rubricFileName?: string;
  pedagogicalGuidelines: PedagogicalGuidelines;
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
}

export interface CorrectionResult {
  nom_eleve: string;
  note: number;
  note_sur: number;
  appreciation: string;
  points_forts: string[];
  points_ameliorer: string[];
  competences: CompetenceItem[];
  questions: QuestionEvaluation[];
  texte_transcrit_resume?: string;
  lisibilite?: 'excellente' | 'bonne' | 'moyenne' | 'faible' | 'illisible';
  avertissement_lisibilite?: string;
  verification_humaine_recommandee?: boolean;
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

export interface ClassGroup {
  id: string;
  name: string;
  students: string[];
  createdAt: string;
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
}

export interface LeadData {
  name: string;
  email: string;
  whatsapp: string;
  school?: string;
}

export type MainView = 'corr' | 'classes' | 'suivi' | 'hist';
