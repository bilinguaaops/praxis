import React, { useState, useEffect, useMemo, useRef } from 'react';
import { StudentSubmission, CorrectionResult, QuestionEvaluation, CompetenceItem, AssignmentConfig } from '../types';
import {
  X,
  RotateCw,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  Save,
  Award,
  TrendingUp,
  BookmarkCheck,
  Edit3,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Minimize2,
  ChevronLeft,
  ChevronRight,
  FileText,
  ArrowLeftRight,
  RefreshCw,
  Search,
  ShieldCheck,
  Download,
  FileDown,
  Image as ImageIcon,
  ChevronDown,
  Layers,
  Loader2,
  Check,
} from 'lucide-react';
import {
  exportElementAsPng,
  exportElementAsPanoramicPdf,
  exportElementAsMultiPageA4Pdf,
  exportRawHandwrittenCopy,
  getRotatedImageDataUrl,
  exportDirectStudentReportPdf,
} from '../lib/exportUtils';
import { CopyExportRenderer } from './CopyExportRenderer';

interface StudentDetailModalProps {
  submission: StudentSubmission;
  allSubmissions?: StudentSubmission[];
  config?: AssignmentConfig;
  onClose: () => void;
  onSave: (updatedSubmission: StudentSubmission) => void;
  onSwapSubmissions?: (subId1: string, subId2: string, mode?: 'names' | 'all') => void;
  isValidated?: boolean;
}

export const StudentDetailModal: React.FC<StudentDetailModalProps> = ({
  submission,
  allSubmissions = [],
  config,
  onClose,
  onSave,
  onSwapSubmissions,
  isValidated = false,
}) => {
  const result = submission.result;
  if (!result) return null;

  const pages = submission.allPages && submission.allPages.length > 0 ? submission.allPages : [submission.imageDataUrl];
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [studentName, setStudentName] = useState(submission.studentName);
  const [grade, setGrade] = useState<number>(result.note);
  const [gradeMax] = useState<number>(result.note_sur);
  const [appreciation, setAppreciation] = useState<string>(result.appreciation);
  const [questions, setQuestions] = useState<QuestionEvaluation[]>(result.questions || []);
  const [competences, setCompetences] = useState<CompetenceItem[]>(result.competences || []);
  const [teacherNotes, setTeacherNotes] = useState<string>(result.teacherNotes || '');
  const [rotation, setRotation] = useState<number>(submission.rotation || 0);
  const [zoom, setZoom] = useState<number>(1);
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [showSwapDropdown, setShowSwapDropdown] = useState(false);
  const [modalSwapSearch, setModalSwapSearch] = useState('');
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Window Fullscreen (Grand écran) and Compact Zero-Scroll layout mode
  const [isModalMaximized, setIsModalMaximized] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('praxis_modal_maximized');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const [compactNoScroll, setCompactNoScroll] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('praxis_modal_compact');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  const toggleModalMaximize = () => {
    setIsModalMaximized((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('praxis_modal_maximized', String(next));
      } catch {}
      return next;
    });
  };

  const toggleCompactNoScroll = () => {
    setCompactNoScroll((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('praxis_modal_compact', String(next));
      } catch {}
      return next;
    });
  };

  // Global hotkey to toggle maximize/grand écran with 'f' or 'F11'
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;

      if (e.key === 'F11' || ((e.key === 'f' || e.key === 'F') && !e.ctrlKey && !e.metaKey && !e.altKey)) {
        e.preventDefault();
        toggleModalMaximize();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, []);

  // Export & Download state
  const exportContainerRef = useRef<HTMLDivElement>(null);
  const [rotatedPages, setRotatedPages] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadStatusMessage, setDownloadStatusMessage] = useState('');
  const [showDownloadDropdown, setShowDownloadDropdown] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'png' | 'pdf_a4' | 'raw_copy_png' | 'raw_copy_pdf'>('pdf');
  const [exportPageChoice, setExportPageChoice] = useState<'active' | 'all'>('active');

  // Pre-cache rotated images so exports are instantaneous and pixel-perfect
  useEffect(() => {
    let isMounted = true;
    Promise.all(pages.map((p) => getRotatedImageDataUrl(p, rotation)))
      .then((rotList) => {
        if (isMounted) setRotatedPages(rotList);
      })
      .catch((err) => {
        console.error('Erreur pré-rotation image :', err);
      });

    return () => {
      isMounted = false;
    };
  }, [pages, rotation]);

  // Keyboard navigation when in fullscreen mode (Escape, Arrows, Zoom)
  useEffect(() => {
    if (!isFullscreen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsFullscreen(false);
      } else if (e.key === 'ArrowLeft') {
        setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1));
      } else if (e.key === 'ArrowRight') {
        setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0));
      } else if (e.key === '+' || e.key === '=') {
        setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))));
      } else if (e.key === '-') {
        setZoom((z) => Math.max(0.4, Number((z - 0.25).toFixed(2))));
      } else if (e.key === 'r' || e.key === 'R') {
        setRotation((r) => (r + 90) % 360);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen, pages.length]);

  // Sync state whenever submission prop updates (e.g. when swapped with another student)
  useEffect(() => {
    setStudentName(submission.studentName);
    setGrade(submission.result?.note ?? 0);
    setAppreciation(submission.result?.appreciation || '');
    setQuestions(submission.result?.questions || []);
    setCompetences(submission.result?.competences || []);
    setTeacherNotes(submission.result?.teacherNotes || '');
    setRotation(submission.rotation || 0);
  }, [submission.id, submission.studentName, submission.result]);

  // Detect if this copy seems to belong to another student in the batch
  const suspectedOtherSubmission = useMemo(() => {
    if (!allSubmissions || allSubmissions.length <= 1) return null;
    const currentNameLower = studentName.trim().toLowerCase();
    const currentFileLower = (submission.fileName || '').toLowerCase();
    const appLower = appreciation.toLowerCase();
    const handwrittenName = (result.nom_manuscrit_detecte || '').toLowerCase();

    return (
      allSubmissions.find((other) => {
        if (other.id === submission.id) return false;
        const otherNameLower = other.studentName.trim().toLowerCase();
        const otherFileLower = (other.fileName || '').toLowerCase();
        if (otherNameLower.length < 2) return false;

        // 1. If AI handwritten detection physically read the other student's name on this paper
        if (handwrittenName && handwrittenName.includes(otherNameLower)) {
          return true;
        }

        // 2. If this submission's filename explicitly contains the other student's name (e.g. "Sass.pdf" labeled as "sean")
        if (currentFileLower.includes(otherNameLower) && !currentFileLower.includes(currentNameLower)) {
          return true;
        }

        // 3. If the other submission's filename contains this student's name (e.g. other file is "sean.pdf" labeled "Sass")
        if (currentNameLower.length >= 2 && otherFileLower.includes(currentNameLower)) {
          return true;
        }

        // 4. If AI appreciation specifically addresses the other student (e.g. "Sean, ton travail est sérieux..." while labeled "Sass")
        const regex = new RegExp(`\\b${otherNameLower}\\b`, 'i');
        if (regex.test(appLower) && !regex.test(currentNameLower)) {
          return true;
        }

        return false;
      }) || null
    );
  }, [allSubmissions, submission, studentName, appreciation, result.nom_manuscrit_detecte]);

  const handleExecuteSwap = (targetSubId: string) => {
    if (onSwapSubmissions) {
      onSwapSubmissions(submission.id, targetSubId, 'names');
      setShowSwapDropdown(false);
      setIsSavedNotice(true);
      setTimeout(() => setIsSavedNotice(false), 3000);
    }
  };

  const handleQuestionGradeChange = (index: number, newNote: number) => {
    const updated = [...questions];
    updated[index] = { ...updated[index], note: newNote };
    setQuestions(updated);

    // Auto calculate new sum if questions have max grades
    const newSum = updated.reduce((acc, q) => acc + (Number(q.note) || 0), 0);
    setGrade(Number(newSum.toFixed(2)));
  };

  const handleCompetenceStatusChange = (index: number, newStatus: 'Acquis' | 'En cours' | 'Non acquis') => {
    const updated = [...competences];
    updated[index] = { ...updated[index], statut: newStatus };
    setCompetences(updated);
  };

  const handleSaveChanges = () => {
    const updatedResult: CorrectionResult = {
      ...result,
      nom_eleve: studentName,
      note: Number(grade),
      note_sur: gradeMax,
      appreciation,
      questions,
      competences,
      teacherNotes,
      manuallyAdjusted: true,
    };

    onSave({
      ...submission,
      studentName,
      rotation,
      result: updatedResult,
    });

    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2000);
  };

  const handleDownload = async (
    format: 'pdf' | 'png' | 'pdf_a4' | 'raw_copy_png' | 'raw_copy_pdf',
    pageChoice: 'active' | 'all' = exportPageChoice
  ) => {
    setIsDownloading(true);
    setShowDownloadDropdown(false);

    if (format === 'png') {
      setDownloadStatusMessage("Génération de l'image haute définition (PNG)...");
    } else if (format === 'pdf') {
      setDownloadStatusMessage("Génération du document PDF (vue intégrale)...");
    } else if (format === 'pdf_a4') {
      setDownloadStatusMessage("Génération du document PDF A4 paginé...");
    } else {
      setDownloadStatusMessage("Export de la copie manuscrite...");
    }

    const safeName = studentName.trim().replace(/[^a-zA-Z0-9À-ÿ_-]/g, '_') || 'Eleve';
    const baseFilename = `Correction_${safeName}_${grade}sur${gradeMax}`;

    try {
      // Ensure layout and pre-rotated images are rendered
      await new Promise((r) => setTimeout(r, 150));

      if (format === 'raw_copy_png') {
        const activeRotated = rotatedPages[activePageIndex] || pages[activePageIndex];
        await exportRawHandwrittenCopy(
          [activeRotated],
          0,
          safeName,
          'png',
          `Copie_${safeName}_Page${activePageIndex + 1}.png`
        );
      } else if (format === 'raw_copy_pdf') {
        const pagesToExport =
          pageChoice === 'all'
            ? rotatedPages.length > 0 ? rotatedPages : pages
            : [rotatedPages[activePageIndex] || pages[activePageIndex]];
        await exportRawHandwrittenCopy(
          pagesToExport,
          0,
          safeName,
          'pdf',
          `Copie_${safeName}_${pageChoice === 'all' ? 'Toutes_Pages' : `Page${activePageIndex + 1}`}.pdf`
        );
      } else {
        // High-definition DOM capture with seamless fallback to direct vector PDF
        let captured = false;
        if (exportContainerRef.current) {
          try {
            if (format === 'png') {
              await exportElementAsPng(exportContainerRef.current, `${baseFilename}.png`);
              captured = true;
            } else if (format === 'pdf') {
              await exportElementAsPanoramicPdf(exportContainerRef.current, `${baseFilename}.pdf`);
              captured = true;
            } else if (format === 'pdf_a4') {
              await exportElementAsMultiPageA4Pdf(exportContainerRef.current, `${baseFilename}_A4.pdf`);
              captured = true;
            }
          } catch (captureErr) {
            console.warn('Capture HTML2Canvas rencontrant une contrainte, bascule automatique sur le moteur PDF direct :', captureErr);
          }
        }

        // If capture didn't complete (or format is PDF and container wasn't available), use direct native vector PDF
        if (!captured) {
          await exportDirectStudentReportPdf(
            {
              submission,
              studentName,
              grade,
              gradeMax,
              appreciation,
              questions,
              competences,
              teacherNotes,
              pages,
              activePageIndex,
              exportAllPages: pageChoice === 'all',
              rotatedPages,
              config,
              isValidated,
            },
            `${baseFilename}.pdf`
          );
        }
      }

      setDownloadStatusMessage("Document téléchargé avec succès !");
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadStatusMessage('');
        setShowDownloadModal(false);
      }, 2000);
    } catch (err) {
      console.error('Erreur lors du téléchargement :', err);
      setDownloadStatusMessage("Erreur lors de l'export. Veuillez réessayer.");
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadStatusMessage('');
      }, 3000);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs overflow-hidden transition-all duration-200 ${
        isModalMaximized ? 'p-0' : 'p-2 sm:p-4 lg:p-6'
      }`}
    >
      <div
        className={`bg-white flex flex-col overflow-hidden transition-all duration-200 ${
          isModalMaximized
            ? 'w-screen h-screen max-w-none rounded-none border-0 shadow-none'
            : 'w-full max-w-7xl h-[92vh] rounded-2xl shadow-2xl border border-slate-200'
        }`}
      >
        {/* Modal Header */}
        <div
          onDoubleClick={toggleModalMaximize}
          className={`bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0 select-none transition-all ${
            isModalMaximized ? 'px-4 py-2.5' : 'px-6 py-4'
          }`}
          title="Double-cliquer pour agrandir en grand écran ou réduire"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <input
                  type="text"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  className="bg-transparent font-extrabold text-lg text-white border-b border-transparent hover:border-slate-600 focus:border-blue-400 focus:outline-hidden px-1 -ml-1 transition-colors"
                />
                <span className="text-xs text-slate-400">
                  ({submission.fileName} {pages.length > 1 ? `• ${pages.length} pages` : ''})
                </span>

                {result.nom_manuscrit_detecte && (
                  <span
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-[11px] font-semibold"
                    title={`Nom manuscrit identifié en marge ou en-tête de la copie papier : ${result.nom_manuscrit_detecte}`}
                  >
                    <span>✍️ Nom en marge : {result.nom_manuscrit_detecte}</span>
                  </span>
                )}

                {/* Quick swap button in header */}
                {onSwapSubmissions && allSubmissions.length > 1 && (
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowSwapDropdown(!showSwapDropdown)}
                      id="btn-modal-swap-student"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/40 text-xs font-semibold cursor-pointer transition-colors"
                      title="Intervertir cette copie avec un autre élève"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Intervertir...</span>
                    </button>

                    {showSwapDropdown && (
                      <div className="absolute top-full left-0 mt-1.5 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2.5 z-50 text-white text-xs space-y-2">
                        <div className="px-1 text-slate-300 font-bold text-xs flex items-center justify-between border-b border-slate-800 pb-1.5">
                          <span className="truncate">Échanger cette copie ({submission.fileName})</span>
                          <button
                            type="button"
                            onClick={() => setShowSwapDropdown(false)}
                            className="text-slate-400 hover:text-white p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="relative">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                          <input
                            type="text"
                            placeholder="Filtrer par nom ou fichier..."
                            value={modalSwapSearch}
                            onChange={(e) => setModalSwapSearch(e.target.value)}
                            className="w-full pl-8 pr-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-400 outline-hidden focus:ring-1 focus:ring-amber-400"
                            autoFocus
                          />
                        </div>

                        <div className="max-h-60 overflow-y-auto space-y-1 divide-y divide-slate-800/60 pr-1">
                          {allSubmissions
                            .filter((s) => s.id !== submission.id)
                            .filter((s) => {
                              if (!modalSwapSearch.trim()) return true;
                              const q = modalSwapSearch.toLowerCase();
                              return (
                                s.studentName.toLowerCase().includes(q) ||
                                (s.fileName || '').toLowerCase().includes(q)
                              );
                            })
                            .map((other) => (
                              <button
                                key={other.id}
                                type="button"
                                onClick={() => {
                                  handleExecuteSwap(other.id);
                                  setShowSwapDropdown(false);
                                }}
                                className="w-full text-left px-2.5 py-2 rounded-lg hover:bg-slate-800 flex items-center justify-between gap-2 group cursor-pointer transition-colors"
                              >
                                <div className="truncate min-w-0">
                                  <span className="font-bold text-slate-100 group-hover:text-amber-300 block truncate">
                                    {other.studentName}
                                  </span>
                                  <span className="text-[10px] text-slate-400 block truncate">
                                    {other.fileName} {other.result ? `• ${other.result.note}/${other.result.note_sur}` : ''}
                                  </span>
                                </div>
                                <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 shrink-0" />
                              </button>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Aperçu de la copie manuscrite ({pages.length > 1 ? `Page ${activePageIndex + 1} sur ${pages.length}` : '1 page'}) et évaluation détaillée
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isValidated && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-bold">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Correction validée</span>
              </span>
            )}

            {isSavedNotice && (
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Modifications enregistrées !
              </span>
            )}

            {/* Prominent Download Dropdown Button */}
            <div className="relative inline-block">
              <button
                type="button"
                onClick={() => setShowDownloadDropdown(!showDownloadDropdown)}
                disabled={isDownloading}
                id="btn-modal-download-header"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                title="Télécharger cette copie et son évaluation (PDF ou Image)"
              >
                {isDownloading ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                <span>Télécharger</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {showDownloadDropdown && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowDownloadDropdown(false)}
                  />
                  <div className="absolute top-full right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-white text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3 py-2 border-b border-slate-800">
                      <span className="font-bold text-slate-100 block">Télécharger la copie corrigée</span>
                      <span className="text-[11px] text-slate-400">
                        Rendu 100% fidèle : copie + tous les détails visibles
                      </span>
                    </div>

                    {/* PDF Format Option */}
                    <button
                      type="button"
                      onClick={() => handleDownload('pdf')}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between gap-3 group cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                          <FileText className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 group-hover:text-emerald-300 block">
                            Document PDF (.pdf)
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Vue intégrale fidèle : copie manuscrite + barème & détails
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold shrink-0">
                        Recommandé
                      </span>
                    </button>

                    {/* PNG Image Format Option */}
                    <button
                      type="button"
                      onClick={() => handleDownload('png')}
                      className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-slate-800 flex items-center justify-between gap-3 group cursor-pointer transition-colors"
                    >
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-500/30">
                          <ImageIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="font-bold text-slate-100 group-hover:text-sky-300 block">
                            Image Haute Définition (.png)
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Capture exacte de la fenêtre avec annotations
                          </span>
                        </div>
                      </div>
                    </button>

                    {/* Multi-page A4 PDF Option */}
                    <button
                      type="button"
                      onClick={() => handleDownload('pdf_a4')}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800 flex items-center gap-2.5 group cursor-pointer transition-colors"
                    >
                      <div className="w-7 h-7 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 border border-amber-500/30">
                        <FileDown className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="font-bold text-slate-100 group-hover:text-amber-300 block">
                          Dossier PDF A4 Paginé
                        </span>
                        <span className="text-[10px] text-slate-400 block">
                          Format optimisé pour impression papier ou archivage
                        </span>
                      </div>
                    </button>

                    <div className="pt-1 border-t border-slate-800">
                      <button
                        type="button"
                        onClick={() => {
                          setShowDownloadDropdown(false);
                          setShowDownloadModal(true);
                        }}
                        className="w-full text-center px-3 py-2 rounded-lg hover:bg-slate-800 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Layers className="w-3.5 h-3.5 text-blue-400" />
                        <span>Options avancées (sélection pages, etc.)...</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Zero-Scroll / Compact Density Toggle */}
            <button
              type="button"
              onClick={toggleCompactNoScroll}
              id="btn-modal-toggle-compact"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                compactNoScroll
                  ? 'bg-blue-600/30 text-blue-200 border-blue-400/40 hover:bg-blue-600/50'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700 hover:text-white'
              }`}
              title={
                compactNoScroll
                  ? "Mode sans défilement actif : mise en page optimisée pour tout afficher d'un coup"
                  : "Activer le mode condensé pour tout voir sans défiler"
              }
            >
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden lg:inline">
                {compactNoScroll ? 'Sans défiler ✓' : 'Vue compacte'}
              </span>
            </button>

            {/* Window Fullscreen (Grand écran) Toggle Button */}
            <button
              type="button"
              onClick={toggleModalMaximize}
              id="btn-modal-toggle-maximize"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer border shadow-xs ${
                isModalMaximized
                  ? 'bg-amber-500/20 text-amber-300 border-amber-400/40 hover:bg-amber-500/30'
                  : 'bg-sky-600 hover:bg-sky-500 text-white border-sky-400/40'
              }`}
              title={
                isModalMaximized
                  ? "Restaurer la taille de fenêtre normale (Touche F ou Échap)"
                  : "Agrandir en Grand Écran (100% de la fenêtre, sans défilement)"
              }
            >
              {isModalMaximized ? (
                <>
                  <Minimize2 className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Réduire</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-3.5 h-3.5 text-white" />
                  <span className="hidden sm:inline">Grand écran</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleSaveChanges}
              id="btn-modal-save"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              id="btn-modal-close"
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Fermer la fenêtre (Échap)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Split Screen */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-slate-200 min-h-0">
          {/* Left Panel: Original Student Copy Image */}
          <div className="w-full lg:w-1/2 h-[50vh] lg:h-full min-h-[380px] bg-slate-900 flex flex-col relative overflow-hidden shrink-0 lg:shrink">
            {/* Viewer Toolbar */}
            <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-slate-900/90 backdrop-blur-xs p-1 rounded-xl border border-slate-700 shadow-md">
              <button
                type="button"
                onClick={() => setZoom((z) => Math.min(3, Number((z + 0.25).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Zoomer (+)"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Dézoomer (-)"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Faire pivoter (90°)"
              >
                <RotateCw className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setZoom(1);
                  setRotation(0);
                }}
                className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                title="Réinitialiser le zoom et l'orientation"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
              <div className="w-px h-4 bg-slate-700 mx-0.5" />
              <button
                type="button"
                onClick={() => setIsFullscreen(true)}
                id="btn-modal-fullscreen"
                className="p-1.5 text-sky-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                title="Afficher la copie en plein écran (⤢) pour examiner les feuilles"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>

            {/* Viewer image container */}
            <div className="flex-1 overflow-auto flex items-center justify-center p-4 min-h-0 min-w-0">
              <img
                src={pages[activePageIndex] || submission.imageDataUrl}
                alt={submission.studentName}
                style={{
                  transform: `rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: 'transform 0.2s ease',
                }}
                className="max-h-full max-w-full object-contain rounded shadow-lg select-none"
              />
            </div>

            {/* Footer with page navigation and Fullscreen button */}
            <div className="px-4 py-2 bg-slate-950/90 border-t border-slate-800 text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2">
              {pages.length > 1 ? (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1))}
                    className="p-1 hover:text-blue-400 transition-colors bg-slate-800 rounded cursor-pointer"
                    title="Page précédente"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-bold text-slate-200">
                    Page {activePageIndex + 1}/{pages.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0))}
                    className="p-1 hover:text-blue-400 transition-colors bg-slate-800 rounded cursor-pointer"
                    title="Page suivante"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <div className="hidden sm:flex items-center gap-1 ml-1">
                    {pages.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActivePageIndex(idx)}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                          idx === activePageIndex
                            ? 'bg-blue-600 text-white'
                            : 'bg-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        P.{idx + 1}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <span>Document scanné original</span>
              )}

              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-slate-400 hidden sm:inline">Lisibilité :</span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold text-[10px] uppercase tracking-wider ${
                      result.lisibilite === 'excellente' || result.lisibilite === 'bonne'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : result.lisibilite === 'moyenne'
                        ? 'bg-amber-950 text-amber-300 border border-amber-800'
                        : 'bg-rose-950 text-rose-300 border border-rose-800'
                    }`}
                  >
                    {(result.lisibilite === 'faible' || result.lisibilite === 'illisible' || result.lisibilite === 'moyenne') && (
                      <AlertTriangle className="w-3 h-3 text-amber-400" />
                    )}
                    <span>{result.lisibilite || 'bonne'}</span>
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsFullscreen(true)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[11px] font-bold transition-colors cursor-pointer border border-slate-700"
                  title="Examiner les feuilles de la copie en plein écran"
                >
                  <Maximize2 className="w-3.5 h-3.5 text-sky-400" />
                  <span>Plein écran</span>
                </button>
              </div>
            </div>
          </div>

          {/* Right Panel: AI Assessment and Editable Criteria */}
          <div
            className={`w-full lg:w-1/2 bg-slate-50 overflow-y-auto ${
              compactNoScroll ? 'p-3 sm:p-4 space-y-3 text-xs' : 'p-6 space-y-6'
            }`}
          >
            {/* Proactive Inversion / Name Mismatch Alert */}
            {suspectedOtherSubmission && (
              <div
                id="alert-student-inversion"
                className="bg-indigo-50 border-2 border-indigo-400 rounded-xl p-3.5 shadow-sm space-y-2.5 text-indigo-950 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2 font-black text-xs sm:text-sm text-indigo-900">
                    <ArrowLeftRight className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>Inversion de copie détectée</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-indigo-200 text-indigo-900 border border-indigo-300">
                    Correction rapide
                  </span>
                </div>

                <p className="text-xs text-indigo-900 leading-relaxed font-medium">
                  L'IA s'adresse à <strong>« {suspectedOtherSubmission.studentName} »</strong> dans l'appréciation ou sur la copie, mais ce devoir (<em>{submission.fileName}</em>) est actuellement attribué à <strong>« {studentName} »</strong>.
                </p>

                <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-200">
                  <button
                    type="button"
                    onClick={() => handleExecuteSwap(suspectedOtherSubmission.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    <span>Intervertir cette copie avec celle de {suspectedOtherSubmission.studentName}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStudentName(suspectedOtherSubmission.studentName)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-100 text-indigo-800 border border-indigo-300 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <span>Renommer cet élève en « {suspectedOtherSubmission.studentName} »</span>
                  </button>
                </div>
              </div>
            )}

            {/* Prominent Human Verification / Legibility Notice */}
            {(result.verification_humaine_recommandee ||
              result.lisibilite === 'moyenne' ||
              result.lisibilite === 'faible' ||
              result.lisibilite === 'illisible' ||
              result.avertissement_lisibilite) && (
              <div
                id="alert-lisibilite-detail"
                className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3 shadow-xs space-y-1.5 text-amber-950 animate-in fade-in duration-200"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-black text-xs text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Vérification humaine recommandée (Lisibilité : {result.lisibilite || 'délicate'})</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-200 text-amber-900 border border-amber-300">
                    Contrôle prof
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                  {result.avertissement_lisibilite ||
                    "L'IA a éprouvé des difficultés à déchiffrer avec certitude certains calculs, mots ou passages manuscrits sur cette copie. Ne vous fiez pas à 100% à la note automatique et vérifiez directement la copie originale ci-contre."}
                </p>

                {result.texte_transcrit_resume && (
                  <div className="mt-1 pt-1 border-t border-amber-300/80 space-y-1">
                    <div className="text-[11px] font-bold text-amber-950 flex items-center gap-1">
                      <FileText className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Trace & transcription déchiffrée par l'IA :</span>
                    </div>
                    <div className="text-[11px] text-amber-950 bg-amber-100/90 p-2 rounded-lg border border-amber-300 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                      {result.texte_transcrit_resume}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Complete Transcription Trace if not already shown in legibility alert */}
            {result.texte_transcrit_resume && !(
              result.verification_humaine_recommandee ||
              result.lisibilite === 'moyenne' ||
              result.lisibilite === 'faible' ||
              result.lisibilite === 'illisible' ||
              result.avertissement_lisibilite
            ) && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 shadow-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Trace & transcription de la copie manuscrite</span>
                  </h3>
                  <span className="text-[10px] text-slate-400 font-semibold">Texte déchiffré par l'IA</span>
                </div>
                <div className="text-xs text-slate-800 bg-white p-2.5 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap leading-relaxed max-h-36 overflow-y-auto">
                  {result.texte_transcrit_resume}
                </div>
              </div>
            )}

            {/* Top Score Box & Appreciation: side-by-side in panoramic/zero-scroll mode */}
            <div className={`grid gap-3 ${compactNoScroll ? 'grid-cols-1 xl:grid-cols-12' : 'grid-cols-1'}`}>
              {/* Main Score Box */}
              <div className={`${compactNoScroll ? 'xl:col-span-5' : ''} bg-white rounded-xl border border-slate-200 ${compactNoScroll ? 'p-3.5' : 'p-5'} shadow-xs flex flex-col justify-between gap-2.5`}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      Note de l'IA (modifiable)
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        step={0.25}
                        min={0}
                        max={gradeMax}
                        value={grade}
                        onChange={(e) => setGrade(Number(e.target.value))}
                        className="w-20 px-2.5 py-1 text-xl font-black text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                      />
                      <span className="text-base font-bold text-slate-500">/ {gradeMax}</span>
                      {result.manuallyAdjusted && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                          Ajustée
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        grade >= gradeMax * 0.7
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : grade >= gradeMax * 0.5
                          ? 'bg-blue-50 text-blue-700 border border-blue-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      <Award className="w-3.5 h-3.5" />
                      <span className="truncate max-w-[120px]">
                        {grade >= gradeMax * 0.7
                          ? 'Très bon travail'
                          : grade >= gradeMax * 0.5
                          ? 'Satisfaisant'
                          : 'À encourager'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-[10px] text-slate-400">
                  Total pondéré sur toutes les questions ci-dessous
                </div>
              </div>

              {/* Appreciation */}
              <div className={`${compactNoScroll ? 'xl:col-span-7' : ''} bg-white rounded-xl border border-slate-200 ${compactNoScroll ? 'p-3' : 'p-5'} shadow-xs space-y-1.5`}>
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="appreciation-textarea"
                    className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5"
                  >
                    <Edit3 className="w-3.5 h-3.5 text-blue-600" />
                    Appréciation pédagogique
                  </label>
                  <span className="text-[10px] text-slate-400">Pour le bulletin / l'élève</span>
                </div>
                <textarea
                  id="appreciation-textarea"
                  rows={compactNoScroll ? 2 : 3}
                  value={appreciation}
                  onChange={(e) => setAppreciation(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden leading-relaxed"
                />
              </div>
            </div>

            {/* Strengths & Improvement Points */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Strengths */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Points forts relevés
                </h3>
                <ul className="space-y-1">
                  {result.points_forts?.map((pf, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold shrink-0">•</span>
                      <span className="line-clamp-2">{pf}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Areas to improve */}
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1.5">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                  Axes de progrès
                </h3>
                <ul className="space-y-1">
                  {result.points_ameliorer?.map((pa, idx) => (
                    <li key={idx} className="text-xs text-slate-700 flex items-start gap-1.5">
                      <span className="text-amber-500 font-bold shrink-0">•</span>
                      <span className="line-clamp-2">{pa}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Competences Grid */}
            {competences.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <BookmarkCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Grille des compétences du socle
                  </h3>
                  <span className="text-[10px] text-slate-400">Évaluation par objectif</span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {competences.map((comp, idx) => (
                    <div
                      key={idx}
                      className="inline-flex items-center gap-2 px-2.5 py-1.5 bg-slate-50 rounded-lg border border-slate-200 text-xs"
                    >
                      <span className="font-semibold text-slate-800 text-[11px]">{comp.nom}</span>
                      <div className="flex items-center gap-0.5">
                        {(['Acquis', 'En cours', 'Non acquis'] as const).map((status) => (
                          <button
                            key={status}
                            type="button"
                            onClick={() => handleCompetenceStatusChange(idx, status)}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-colors cursor-pointer ${
                              comp.statut === status
                                ? status === 'Acquis'
                                  ? 'bg-emerald-600 text-white'
                                  : status === 'En cours'
                                  ? 'bg-amber-500 text-white'
                                  : 'bg-rose-600 text-white'
                                : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300'
                            }`}
                          >
                            {status}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Detailed Questions Evaluation Table: 2-columns grid in zero-scroll mode */}
            <div className="bg-white rounded-xl border border-slate-200 p-3.5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  Détail question par question
                </h3>
                <span className="text-[10px] text-slate-400">
                  {questions.length} questions • Notes ajustables en direct
                </span>
              </div>

              <div className={`grid gap-2.5 ${compactNoScroll ? 'grid-cols-1 xl:grid-cols-2' : 'grid-cols-1'}`}>
                {questions.map((q, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">{q.numero_ou_titre}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-500 text-[11px]">Note :</span>
                        <input
                          type="number"
                          step={0.25}
                          min={0}
                          max={q.note_max}
                          value={q.note}
                          onChange={(e) => handleQuestionGradeChange(idx, Number(e.target.value))}
                          className="w-14 px-1.5 py-0.5 font-bold text-xs bg-white border border-slate-300 rounded text-center focus:ring-2 focus:ring-blue-500 outline-hidden"
                        />
                        <span className="font-semibold text-slate-500 text-[11px]">/ {q.note_max}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-0.5 text-slate-700">
                      <div className="p-2 bg-white rounded-md border border-slate-200/80">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-blue-700 block mb-0.5">
                          Formulation élève :
                        </span>
                        <p className="font-mono text-[11px] text-slate-800 leading-snug line-clamp-3">
                          {q.reponse_eleve || 'Non traité / illisible'}
                        </p>
                      </div>

                      <div className="p-2 bg-white rounded-md border border-slate-200/80">
                        <span className="font-bold text-[9px] uppercase tracking-wider text-emerald-700 block mb-0.5">
                          Attendu du barème :
                        </span>
                        <p className="font-mono text-[11px] text-slate-800 leading-snug line-clamp-3">
                          {q.reponse_attendue}
                        </p>
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-600 bg-blue-50/50 p-1.5 rounded border border-blue-100/70">
                      <strong className="text-blue-900">Barème :</strong> {q.justification}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Private Notes */}
            <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-xs space-y-1.5">
              <label
                htmlFor="teacher-notes-input"
                className="text-[11px] font-bold uppercase tracking-wider text-slate-700"
              >
                Notes internes pour le professeur (non visibles de l'élève)
              </label>
              <input
                id="teacher-notes-input"
                type="text"
                value={teacherNotes}
                onChange={(e) => setTeacherNotes(e.target.value)}
                placeholder="Ex : Convoquer aux heures de soutien, vérifier le carnet..."
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div
          className={`bg-white border-t border-slate-200 flex items-center justify-between shrink-0 flex-wrap gap-2 transition-all ${
            compactNoScroll ? 'px-4 py-2' : 'px-6 py-3.5'
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="hidden md:inline">
              Les ajustements mettent automatiquement à jour les statistiques de la classe.
            </span>
            <span className="text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 inline-flex items-center gap-1">
              Raccourci : <kbd className="font-mono font-bold text-slate-800">F</kbd> (Plein écran)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowDownloadModal(true)}
              disabled={isDownloading}
              id="btn-modal-download-footer"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              title="Télécharger cette copie et sa correction (PDF ou Image)"
            >
              {isDownloading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>Télécharger (PDF / Image)</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              Fermer
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Enregistrer les modifications</span>
            </button>
          </div>
        </div>
      </div>

      {/* Fullscreen Reader Mode: Allows the teacher to inspect sheets across the entire screen */}
      {isFullscreen && (
        <div
          id="student-copy-fullscreen-viewer"
          className="fixed inset-0 z-[100] bg-slate-950/98 flex flex-col text-white animate-in fade-in duration-150 select-none"
        >
          {/* Fullscreen Header */}
          <div className="px-6 py-3 bg-slate-900/95 border-b border-slate-800 flex items-center justify-between shrink-0 gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center font-bold text-sm shrink-0">
                <FileText className="w-4 h-4 text-white" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-white text-base truncate">{studentName}</span>
                  <span className="text-xs text-slate-400 truncate">({submission.fileName})</span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                    Page {activePageIndex + 1} sur {pages.length}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 hidden sm:block">
                  Mode Examen Plein Écran — Vérifiez l'écriture manuscrite et les réponses de l'élève en haute définition.
                </p>
              </div>
            </div>

            {/* Quick Page Jump Buttons (multi-page) */}
            {pages.length > 1 && (
              <div className="hidden lg:flex items-center gap-1.5 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Page précédente (←)"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {pages.map((_, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePageIndex(idx)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                      idx === activePageIndex
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                    }`}
                  >
                    Page {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Page suivante (→)"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* View Controls & Exit Button */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Dézoomer (-)"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="px-2 py-1 text-xs font-mono font-bold text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Cliquer pour réinitialiser le zoom (100%)"
                >
                  {Math.round(zoom * 100)}%
                </button>
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.5, Number((z + 0.25).toFixed(2))))}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Zoomer (+)"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setRotation((r) => (r + 90) % 360)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Faire pivoter de 90° (R)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setZoom(1);
                    setRotation(0);
                  }}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                  title="Réinitialiser zoom et orientation"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              <button
                type="button"
                onClick={() => setIsFullscreen(false)}
                id="btn-close-fullscreen-reader"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-md"
                title="Quitter le plein écran (Touche Échap)"
              >
                <Minimize2 className="w-4 h-4" />
                <span className="hidden sm:inline">Quitter plein écran (Échap)</span>
              </button>
            </div>
          </div>

          {/* Fullscreen Viewer Area with Zoom/Pan */}
          <div className="flex-1 relative overflow-auto flex items-center justify-center p-4 sm:p-8">
            {/* Floating Left Arrow */}
            {pages.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1))}
                className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/85 hover:bg-blue-600 text-white border border-slate-700 shadow-2xl transition-all cursor-pointer hover:scale-110"
                title="Page précédente (Flèche gauche)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* High Definition Page Image */}
            <img
              src={pages[activePageIndex] || submission.imageDataUrl}
              alt={submission.studentName}
              style={{
                transform: `rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: 'center center',
                transition: 'transform 0.15s ease-out',
              }}
              className="max-h-[88vh] max-w-[88vw] object-contain rounded-lg shadow-2xl select-none"
            />

            {/* Floating Right Arrow */}
            {pages.length > 1 && (
              <button
                type="button"
                onClick={() => setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0))}
                className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-20 p-3 rounded-full bg-slate-900/85 hover:bg-blue-600 text-white border border-slate-700 shadow-2xl transition-all cursor-pointer hover:scale-110"
                title="Page suivante (Flèche droite)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Bar: Shortcuts & Mobile page selector */}
          <div className="px-6 py-2 bg-slate-900/90 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between shrink-0">
            <span className="hidden sm:inline">
              Raccourcis clavier : <strong>← / →</strong> pour feuille précédente / suivante, <strong>+ / -</strong> pour zoomer, <strong>R</strong> pour pivoter, <strong>Échap</strong> pour quitter.
            </span>
            {pages.length > 1 && (
              <div className="flex lg:hidden items-center gap-1 mx-auto sm:mx-0">
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => (p > 0 ? p - 1 : pages.length - 1))}
                  className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="font-bold text-slate-200 px-2">
                  Page {activePageIndex + 1} / {pages.length}
                </span>
                <button
                  type="button"
                  onClick={() => setActivePageIndex((p) => (p < pages.length - 1 ? p + 1 : 0))}
                  className="p-1 text-slate-300 hover:text-white bg-slate-800 rounded"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setIsFullscreen(false)}
              className="text-xs text-slate-400 hover:text-white underline cursor-pointer"
            >
              Fermer le plein écran
            </button>
          </div>
        </div>
      )}

      {/* Toast Notification for Download Progress & Completion */}
      {downloadStatusMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2.5 rounded-xl bg-slate-900/95 text-white border border-slate-700 shadow-2xl flex items-center gap-2.5 text-xs font-bold animate-in fade-in slide-in-from-top-4 duration-200">
          {isDownloading ? (
            <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          )}
          <span>{downloadStatusMessage}</span>
        </div>
      )}

      {/* Off-screen safe DOM container for capture & export */}
      <div
        id="praxis-export-host"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '-99999px',
          width: '1280px',
          zIndex: -9999,
          pointerEvents: 'none',
          opacity: 0,
        }}
        aria-hidden="true"
      >
        <CopyExportRenderer
          ref={exportContainerRef}
          submission={submission}
          studentName={studentName}
          grade={grade}
          gradeMax={gradeMax}
          appreciation={appreciation}
          questions={questions}
          competences={competences}
          teacherNotes={teacherNotes}
          pages={pages}
          activePageIndex={activePageIndex}
          exportAllPages={exportPageChoice === 'all'}
          rotatedImages={rotatedPages}
          config={config}
          isValidated={isValidated}
        />
      </div>

      {/* Download Options Modal Dialog */}
      {showDownloadModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold">
                  <Download className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-100">
                    Télécharger la copie et sa correction
                  </h3>
                  <p className="text-xs text-slate-400">
                    {studentName} • {grade} / {gradeMax}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-5 text-xs text-slate-700">
              {/* Format selection */}
              <div className="space-y-2">
                <label className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                  1. Format de téléchargement
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      exportFormat === 'pdf'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-rose-500" />
                        Document PDF (.pdf)
                      </span>
                      {exportFormat === 'pdf' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Vue intégrale fidèle à l'écran : copie + barème + appréciation
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('png')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      exportFormat === 'png'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-sky-500" />
                        Image PNG (.png)
                      </span>
                      {exportFormat === 'png' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Haute définition, identique pixel par pixel à la fenêtre
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('pdf_a4')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      exportFormat === 'pdf_a4'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <FileDown className="w-3.5 h-3.5 text-amber-500" />
                        Dossier PDF A4
                      </span>
                      {exportFormat === 'pdf_a4' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Format standard A4 pour impression papier directe
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportFormat('raw_copy_png')}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col gap-1 ${
                      exportFormat === 'raw_copy_png'
                        ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5 text-indigo-500" />
                        Copie seule (.png)
                      </span>
                      {exportFormat === 'raw_copy_png' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Copie manuscrite originale redressée
                    </p>
                  </button>
                </div>
              </div>

              {/* Pages to include (if multi-page copy) */}
              {pages.length > 1 && (
                <div className="space-y-2">
                  <label className="font-bold text-slate-900 uppercase tracking-wider text-[11px] block">
                    2. Pages de la copie à inclure
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setExportPageChoice('active')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        exportPageChoice === 'active'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Page affichée (Page {activePageIndex + 1})
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportPageChoice('all')}
                      className={`flex-1 py-2 px-3 rounded-lg border text-center font-semibold transition-all cursor-pointer ${
                        exportPageChoice === 'all'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Toutes les pages ({pages.length} feuilles)
                    </button>
                  </div>
                </div>
              )}

              {/* Fidelity Guarantee Note */}
              <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200/80 flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 space-y-0.5 leading-relaxed">
                  <span className="font-bold block">Fidélité garantie à 100% :</span>
                  <span>
                    La copie manuscrite, l'appréciation pédagogique, les barèmes question par question,
                    les compétences et les annotations sont inclus exactement comme affichés à l'écran.
                  </span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setShowDownloadModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDownload(exportFormat, exportPageChoice)}
                disabled={isDownloading}
                id="btn-confirm-download"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Génération en cours...</span>
                  </>
                ) : (
                  <>
                    <Download className="w-3.5 h-3.5" />
                    <span>Télécharger maintenant</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
