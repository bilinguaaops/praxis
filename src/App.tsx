import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { AssignmentConfig, StudentSubmission, ClassGroup, SavedEvaluation, MainView, LeadData } from './types';
import { Header } from './components/Header';
import { TutorialBanner } from './components/TutorialBanner';
import { LeadGateModal } from './components/LeadGateModal';
import { ClassesView } from './components/ClassesView';
import { ClassDetailView } from './components/ClassDetailView';
import { SuiviView } from './components/SuiviView';
import { HistoriqueView } from './components/HistoriqueView';
import { Step1Config } from './components/Step1Config';
import { Step2Upload } from './components/Step2Upload';
import { Step3Progress } from './components/Step3Progress';
import { Step4Dashboard } from './components/Step4Dashboard';
import { StudentDetailModal } from './components/StudentDetailModal';
import { PrintCorrectionSheets } from './components/PrintCorrectionSheets';
import {
  SAMPLE_ASSIGNMENT_CONFIG,
  generateSampleStudents,
  generateSampleSavedEvaluations,
} from './lib/sampleData';

const DEFAULT_CONFIG: AssignmentConfig = {
  discipline: 'Mathématiques',
  level: '3e (Brevet)',
  title: 'Devoir Surveillé N°3 : Fonctions et Géométrie',
  maxGrade: 20,
  correctionMode: 'with_rubric',
  rubricContent: '',
  pedagogicalGuidelines: {
    spellingTolerance: true,
    rewardEffortAndMethod: true,
    rigorousJustification: true,
    encourageClarity: true,
    customInstructions: '',
  },
};

const DEFAULT_CLASSES: ClassGroup[] = [
  {
    id: 'class_demo_3b',
    name: '3ème B (Collège)',
    students: [
      'Lucas Martin',
      'Sarah Benali',
      'Thomas Leroy',
      'Emma Dubois',
      'Maxime Petit',
      'Chloé Moreau',
      'Nathan Bernard',
      'Camille Roux',
    ],
    createdAt: new Date().toISOString(),
  },
];

export default function App() {
  const [activeView, setActiveView] = useState<MainView>('corr');
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isLeadGateOpen, setIsLeadGateOpen] = useState<boolean>(false);

  // Teacher connection / account state (from PRAXIS storage)
  const [currentLead, setCurrentLead] = useState<LeadData | null>(() => {
    try {
      const saved = localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
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
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [classes, setClasses] = useState<ClassGroup[]>(() => {
    try {
      const saved = localStorage.getItem('cpro_classes');
      return saved ? JSON.parse(saved) : DEFAULT_CLASSES;
    } catch {
      return DEFAULT_CLASSES;
    }
  });

  const [savedEvaluations, setSavedEvaluations] = useState<SavedEvaluation[]>(() => {
    try {
      const saved = localStorage.getItem('cpro_evaluations');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return generateSampleSavedEvaluations();
    } catch {
      return generateSampleSavedEvaluations();
    }
  });

  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [activeTeacherNotes, setActiveTeacherNotes] = useState<string>('');
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

  // Load realistic demo data
  const handleLoadDemo = () => {
    setConfig(SAMPLE_ASSIGNMENT_CONFIG);
    const demoStudents = generateSampleStudents();
    setSubmissions(demoStudents);
    setActiveView('corr');
    setCurrentStep(4);
  };

  // Reset entire assignment
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);

  const handleReset = () => {
    setIsResetModalOpen(true);
  };

  const confirmReset = () => {
    setConfig(DEFAULT_CONFIG);
    setSubmissions([]);
    setActiveTeacherNotes('');
    setCurrentStep(1);
    setActiveView('corr');
    localStorage.removeItem('praxis_config');
    localStorage.removeItem('praxis_submissions');
    setIsResetModalOpen(false);
  };

  // Save current evaluation to history
  const handleSaveToHistory = (notes: string) => {
    setActiveTeacherNotes(notes);

    const graded = submissions.filter((s) => s.status === 'completed' && s.result);
    const grades = graded.map((s) => s.result!.note);
    const avg = grades.length > 0 ? Number((grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(2)) : 0;
    const sorted = [...grades].sort((a, b) => a - b);
    const median = sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0;
    const max = grades.length > 0 ? Math.max(...grades) : 0;
    const min = grades.length > 0 ? Math.min(...grades) : 0;
    const successRate = grades.length > 0 ? Math.round((grades.filter((g) => g >= config.maxGrade / 2).length / grades.length) * 100) : 0;

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
  };

  // Load a past evaluation from history into current view
  const handleLoadEvaluation = (evaluation: SavedEvaluation) => {
    setConfig(evaluation.config);
    setSubmissions(evaluation.submissions);
    setActiveTeacherNotes(evaluation.teacherComments || '');
    setActiveView('corr');
    setCurrentStep(4);
  };

  // Delete an evaluation from history
  const handleDeleteEvaluation = (id: string) => {
    setSavedEvaluations((prev) => prev.filter((e) => e.id !== id));
  };

  // Use a class group for active correction
  const handleUseClassForCorrection = (classGroup: ClassGroup) => {
    // If we have submissions without student names or default names, apply class student names
    if (submissions.length > 0) {
      setSubmissions((prev) =>
        prev.map((sub, idx) => ({
          ...sub,
          studentName: classGroup.students[idx] || sub.studentName || `Élève ${idx + 1}`,
        }))
      );
    }
    setActiveView('corr');
    setCurrentStep(submissions.length > 0 ? 2 : 1);
  };

  // Update a student submission after manual edit
  const handleSaveStudentEdit = (updatedSub: StudentSubmission) => {
    setSubmissions((prev) => prev.map((s) => (s.id === updatedSub.id ? updatedSub : s)));
    setSelectedStudentForModal(updatedSub);
  };

  // Action when teacher triggers the correction process (Step 2 button or direct step navigation)
  const handleRequestStartCorrection = () => {
    const saved = localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead');
    if (saved || currentLead) {
      // Already connected: skip modal entirely and proceed directly to correction!
      setCurrentStep(3);
    } else {
      // Not connected: show the registration / connection portal
      setIsLeadGateOpen(true);
    }
  };

  const handleLeadSubmitSuccess = (lead: LeadData) => {
    setCurrentLead(lead);
    setIsLeadGateOpen(false);
    // Directly proceed to correction
    setCurrentStep(3);
  };

  const handleCloseLeadGate = () => {
    setIsLeadGateOpen(false);
    // If user clicked close/skip while on step 2 with copies ready, allow proceeding
    if (currentStep === 2 && submissions.length > 0) {
      setCurrentStep(3);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('praxis_lead');
    localStorage.removeItem('cpro_lead');
    setCurrentLead(null);
  };

  const completedCount = submissions.filter((s) => s.status === 'completed').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step === 3 && currentStep === 2 && submissions.length > 0) {
            handleRequestStartCorrection();
          } else {
            setActiveView('corr');
            setCurrentStep(step);
          }
        }}
        onReset={handleReset}
        onLoadDemo={handleLoadDemo}
        completedCount={completedCount}
        totalCount={submissions.length}
        activeView={activeView}
        onViewChange={setActiveView}
        savedEvalsCount={savedEvaluations.length}
        currentLead={currentLead}
        onOpenLoginModal={() => setIsLeadGateOpen(true)}
        onLogout={handleLogout}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* VIEW 1: CORRECTION WORKFLOW */}
        {activeView === 'corr' && (
          <div className="space-y-6">
            {/* Collapsible pedagogical tutorial guide */}
            <TutorialBanner />

            {currentStep === 1 && (
              <Step1Config
                config={config}
                onChange={setConfig}
                onNext={() => setCurrentStep(2)}
              />
            )}

            {currentStep === 2 && (
              <Step2Upload
                submissions={submissions}
                onSubmissionsChange={setSubmissions}
                onNext={handleRequestStartCorrection}
                onBack={() => setCurrentStep(1)}
                onLoadDemo={handleLoadDemo}
                config={config}
              />
            )}

            {currentStep === 3 && (
              <Step3Progress
                config={config}
                submissions={submissions}
                onSubmissionsChange={setSubmissions}
                onFinish={() => setCurrentStep(4)}
                onViewDashboard={() => setCurrentStep(4)}
              />
            )}

            {currentStep === 4 && (
              <Step4Dashboard
                config={config}
                submissions={submissions}
                onSubmissionsChange={setSubmissions}
                onSelectStudent={(sub) => setSelectedStudentForModal(sub)}
                onOpenPrint={() => setIsPrintModalOpen(true)}
                onBackToCopies={() => setCurrentStep(2)}
                onSaveToHistory={handleSaveToHistory}
                initialTeacherNotes={activeTeacherNotes}
              />
            )}
          </div>
        )}

        {/* VIEW 2: CLASSES & ROSTERS OR CLASS DETAIL */}
        {activeView === 'classes' && (
          selectedClassId ? (
            (() => {
              const currentClass = classes.find((c) => c.id === selectedClassId);
              if (!currentClass) {
                return (
                  <ClassesView
                    classes={classes}
                    onClassesChange={setClasses}
                    onUseClassForCorrection={handleUseClassForCorrection}
                    onSelectClass={(cls) => setSelectedClassId(cls.id)}
                  />
                );
              }
              return (
                <ClassDetailView
                  classGroup={currentClass}
                  evaluations={savedEvaluations}
                  currentSubmissions={submissions}
                  onBack={() => setSelectedClassId(null)}
                  onUpdateClass={(updated) => {
                    setClasses((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
                  }}
                  onSelectStudentDetail={(submission) => {
                    setSelectedStudentForModal(submission);
                  }}
                  onUseClassForCorrection={(cls) => {
                    handleUseClassForCorrection(cls);
                  }}
                  onLoadEvaluation={handleLoadEvaluation}
                />
              );
            })()
          ) : (
            <ClassesView
              classes={classes}
              onClassesChange={setClasses}
              onUseClassForCorrection={handleUseClassForCorrection}
              onSelectClass={(cls) => setSelectedClassId(cls.id)}
            />
          )
        )}

        {/* VIEW 3: SUIVI INDIVIDUEL */}
        {activeView === 'suivi' && (
          <SuiviView
            evaluations={savedEvaluations}
            currentSubmissions={submissions}
            onOpenEvaluation={handleLoadEvaluation}
          />
        )}

        {/* VIEW 4: HISTORIQUE DES ÉVALUATIONS */}
        {activeView === 'hist' && (
          <HistoriqueView
            evaluations={savedEvaluations}
            onDeleteEvaluation={handleDeleteEvaluation}
            onLoadEvaluation={handleLoadEvaluation}
          />
        )}
      </main>

      {/* Side-by-side Student Inspection and Adjustment Modal */}
      {selectedStudentForModal && (
        <StudentDetailModal
          submission={selectedStudentForModal}
          onClose={() => setSelectedStudentForModal(null)}
          onSave={handleSaveStudentEdit}
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
    </div>
  );
}
