import React, { useState, useEffect } from 'react';
import { RotateCcw } from 'lucide-react';
import { AssignmentConfig, StudentSubmission, ClassGroup, SavedEvaluation, MainView, LeadData } from './types';
import { Header } from './components/Header';
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
import { ContactModal } from './components/ContactModal';
import {
  SAMPLE_ASSIGNMENT_CONFIG,
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

export default function App() {
  const [activeView, setActiveView] = useState<MainView>(() => {
    try {
      const path = window.location.pathname;
      const search = window.location.search;
      const hash = window.location.hash;
      if (path === '/dashboard' || path === '/admin' || search.includes('view=dashboard') || search.includes('admin=true')) {
        return 'dashboard';
      }
      if (path === '/faq' || hash === '#faq' || search.includes('view=faq')) {
        return 'faq';
      }
      if (path === '/correction' || search.includes('view=corr')) {
        return 'corr';
      }
      if (path === '/classes' || search.includes('view=classes')) {
        return 'classes';
      }
      if (path === '/suivi' || search.includes('view=suivi')) {
        return 'suivi';
      }
      if (path === '/historique' || search.includes('view=hist')) {
        return 'hist';
      }
    } catch {}
    return 'landing';
  });

  const handleViewChange = (view: MainView) => {
    setActiveView(view);
    try {
      if (view === 'dashboard') {
        if (window.location.pathname !== '/dashboard') {
          window.history.pushState(null, '', '/dashboard');
        }
      } else if (view === 'faq') {
        if (window.location.pathname !== '/faq') {
          window.history.pushState(null, '', '/faq');
        }
      } else if (view === 'landing') {
        if (window.location.pathname !== '/') {
          window.history.pushState(null, '', '/');
        }
      } else {
        if (window.location.pathname === '/dashboard' || window.location.pathname === '/admin' || window.location.pathname === '/faq') {
          window.history.pushState(null, '', '/');
        }
      }
    } catch {}
  };

  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/dashboard' || path === '/admin') {
        setActiveView('dashboard');
      } else if (path === '/faq' || hash === '#faq') {
        setActiveView('faq');
      } else {
        setActiveView('landing');
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

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
      if (saved) {
        const parsed: StudentSubmission[] = JSON.parse(saved);
        const demoNames = ['lucas martin', 'sarah benali', 'thomas dubois'];
        return parsed.filter(
          (s) =>
            s.id !== 'sub-1' &&
            s.id !== 'sub-2' &&
            s.id !== 'sub-3' &&
            !demoNames.includes((s.studentName || '').toLowerCase())
        );
      }
      return [];
    } catch {
      return [];
    }
  });

  // Purge any residual demo submissions from local storage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('praxis_submissions');
      if (saved) {
        const parsed: StudentSubmission[] = JSON.parse(saved);
        const demoNames = ['lucas martin', 'sarah benali', 'thomas dubois'];
        const filtered = parsed.filter(
          (s) =>
            s.id !== 'sub-1' &&
            s.id !== 'sub-2' &&
            s.id !== 'sub-3' &&
            !demoNames.includes((s.studentName || '').toLowerCase())
        );
        if (filtered.length !== parsed.length) {
          setSubmissions(filtered);
          localStorage.setItem('praxis_submissions', JSON.stringify(filtered));
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
    const isRegistered = Boolean(localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead') || currentLead);
    if (isRegistered) {
      setCurrentStep(3);
    } else {
      // Registration is strictly required before launching correction in this demo version
      setIsLeadGateOpen(true);
    }
  };

  const handleLeadSubmitSuccess = (lead: LeadData) => {
    setCurrentLead(lead);
    setIsLeadGateOpen(false);
    // Registration completed: immediately launch correction
    setCurrentStep(3);
  };

  const handleCloseLeadGate = () => {
    // Strictly stay on current step; correction is NOT started unless registered
    setIsLeadGateOpen(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('praxis_lead');
    localStorage.removeItem('cpro_lead');
    setCurrentLead(null);
  };

  const completedCount = submissions.filter((s) => s.status === 'completed').length;

  if (activeView === 'dashboard') {
    return <AdminDashboard onBackToApp={() => handleViewChange('corr')} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Header
        currentStep={currentStep}
        onStepClick={(step) => {
          if (step >= 3) {
            const isRegistered = Boolean(localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead') || currentLead);
            if (!isRegistered) {
              setIsLeadGateOpen(true);
              return;
            }
          }
          handleViewChange('corr');
          setCurrentStep(step);
        }}
        onReset={handleReset}
        completedCount={completedCount}
        totalCount={submissions.length}
        activeView={activeView}
        onViewChange={handleViewChange}
        savedEvalsCount={savedEvaluations.length}
        currentLead={currentLead}
        onOpenLoginModal={() => setIsLeadGateOpen(true)}
        onLogout={handleLogout}
        onOpenContactModal={() => setIsContactModalOpen(true)}
      />

      {/* VIEW 0: NOTIE AI INSPIRED LANDING PAGE */}
      {activeView === 'landing' && (
        <LandingPage
          onStartCorrection={() => {
            handleViewChange('corr');
            setCurrentStep(1);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToView={(view) => {
            handleViewChange(view);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onOpenContact={() => setIsContactModalOpen(true)}
        />
      )}

      {activeView !== 'landing' && (
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
                  isRegistered={Boolean(currentLead || localStorage.getItem('praxis_lead') || localStorage.getItem('cpro_lead'))}
                  config={config}
                  classes={classes}
                  onSwapSubmissions={handleSwapSubmissions}
                />
              )}

              {currentStep === 3 && (
                <Step3Progress
                  config={config}
                  submissions={submissions}
                  onSubmissionsChange={setSubmissions}
                  onFinish={() => setCurrentStep(4)}
                  onViewDashboard={() => setCurrentStep(4)}
                  currentLead={currentLead}
                  onRequireRegistration={() => setIsLeadGateOpen(true)}
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

          {/* VIEW 5: FAQ & GUIDE PÉDAGOGIQUE */}
          {activeView === 'faq' && (
            <FaqView
              onStartCorrection={() => {
                handleViewChange('corr');
                setCurrentStep(1);
              }}
              onOpenContact={() => setIsContactModalOpen(true)}
            />
          )}
        </main>
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
