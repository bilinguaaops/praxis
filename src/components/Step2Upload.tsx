import React, { useState, useRef, useMemo, useEffect } from 'react';
import { StudentSubmission, AssignmentConfig, ClassGroup } from '../types';
import { convertPdfToImages, extractStudentNameFromFileName, compressImageFile } from '../lib/pdfUtils';
import {
  UploadCloud,
  FileText,
  Trash2,
  RotateCw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  Users,
  Image as ImageIcon,
  AlertCircle,
  Plus,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  ArrowLeftRight,
  Search,
  X,
  Download,
  Check,
  Camera,
  Layers,
  Split,
  Combine,
  Smartphone,
  Scissors,
} from 'lucide-react';

interface Step2UploadProps {
  submissions: StudentSubmission[];
  onSubmissionsChange: (submissions: StudentSubmission[]) => void;
  onNext: () => void;
  onBack: () => void;
  isRegistered?: boolean;
  config?: AssignmentConfig;
  onConfigChange?: (config: AssignmentConfig) => void;
  classes?: ClassGroup[];
  onSwapSubmissions?: (subId1: string, subId2: string, mode?: 'names' | 'all') => void;
}

export const Step2Upload: React.FC<Step2UploadProps> = ({
  submissions,
  onSubmissionsChange,
  onNext,
  onBack,
  isRegistered = false,
  config,
  onConfigChange,
  classes = [],
  onSwapSubmissions,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [activeCardPages, setActiveCardPages] = useState<Record<string, number>>({});
  const [swapModalTargetSub, setSwapModalTargetSub] = useState<StudentSubmission | null>(null);
  const [swapSearchQuery, setSwapSearchQuery] = useState('');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const guidedCameraInputRef = useRef<HTMLInputElement>(null);

  // Multi-page photo grouping settings
  const [pagesPerCopy, setPagesPerCopy] = useState<number>(() => {
    return config?.pagesPerCopy && config.pagesPerCopy >= 1 ? config.pagesPerCopy : 1;
  });
  const [showCustomPagesInput, setShowCustomPagesInput] = useState(false);
  const [customPagesVal, setCustomPagesVal] = useState<string>('3');

  // Batch grouping modal state
  const [showBatchGroupModal, setShowBatchGroupModal] = useState(false);
  const [batchGroupCount, setBatchGroupCount] = useState<number>(3);

  // Guided camera scanner modal state
  const [isGuidedScannerOpen, setIsGuidedScannerOpen] = useState(false);
  const [guidedStudents, setGuidedStudents] = useState<{ name: string; pages: string[] }[]>([]);
  const [currentDraftName, setCurrentDraftName] = useState<string>('');
  const [currentDraftPages, setCurrentDraftPages] = useState<string[]>([]);
  const [guidedTargetPages, setGuidedTargetPages] = useState<number>(3);
  const [isGuidedProcessing, setIsGuidedProcessing] = useState(false);

  // User notification toast
  const [statusToast, setStatusToast] = useState<{ text: string; type: 'success' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'info' = 'success') => {
    setStatusToast({ text, type });
  };

  useEffect(() => {
    if (statusToast) {
      const timer = setTimeout(() => setStatusToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [statusToast]);

  // Sync pagesPerCopy to config if changed
  const updatePagesPerCopy = (val: number) => {
    const validVal = Math.max(1, Math.min(20, val));
    setPagesPerCopy(validVal);
    if (config && onConfigChange) {
      onConfigChange({ ...config, pagesPerCopy: validVal });
    }
  };

  // All known students from classes for datalist
  const allClassStudents = useMemo(() => {
    const list: string[] = [];
    classes.forEach((c) => {
      c.students.forEach((st) => {
        if (!list.includes(st)) list.push(st);
      });
    });
    return list;
  }, [classes]);

  // Total pages across all submissions
  const totalAllPagesCount = useMemo(() => {
    return submissions.reduce((sum, s) => {
      const p = s.allPages && s.allPages.length > 0 ? s.allPages.length : 1;
      return sum + p;
    }, 0);
  }, [submissions]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    // Separate PDFs from Images
    const pdfFiles: File[] = [];
    const imageFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        pdfFiles.push(file);
      } else if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    const newItems: StudentSubmission[] = [];

    // 1. Process PDFs (Each PDF represents 1 student with 1 or multiple pages)
    for (let i = 0; i < pdfFiles.length; i++) {
      const file = pdfFiles[i];
      setIsProcessingPdf(true);
      setPdfProgressText(`Extraction des pages du document PDF "${file.name}" en cours...`);
      try {
        const pages = await convertPdfToImages(file);
        if (pages.length > 0) {
          const studentName = extractStudentNameFromFileName(file.name, submissions.length + newItems.length + 1);
          const pageUrls = pages.map((p) => p.dataUrl);

          newItems.push({
            id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) + '-' + i,
            studentName,
            fileName: file.name,
            pageCount: pages.length,
            imageDataUrl: pageUrls[0],
            allPages: pageUrls,
            rotation: 0,
            status: 'pending',
          });
        }
      } catch (err: any) {
        console.error('Failed to parse PDF:', err);
        alert('Impossible de lire le document PDF. Vérifiez qu’il n’est pas protégé par mot de passe.');
      } finally {
        setIsProcessingPdf(false);
        setPdfProgressText('');
      }
    }

    // 2. Process Images (JPG, PNG, WebP) with multi-page grouping support!
    if (imageFiles.length > 0) {
      setIsProcessingPdf(true);
      setPdfProgressText(`Compression et analyse de ${imageFiles.length} photo(s)...`);
      const compressedImages: { name: string; url: string }[] = [];

      for (const imgFile of imageFiles) {
        try {
          const url = await compressImageFile(imgFile);
          if (url) compressedImages.push({ name: imgFile.name, url });
        } catch (e) {
          console.error('Erreur compression image:', e);
        }
      }
      setIsProcessingPdf(false);
      setPdfProgressText('');

      if (compressedImages.length > 0) {
        if (pagesPerCopy <= 1) {
          // Standard: 1 image = 1 student copy
          compressedImages.forEach((item, idx) => {
            const studentName = extractStudentNameFromFileName(item.name, submissions.length + newItems.length + 1);
            newItems.push({
              id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) + '-' + idx,
              studentName,
              fileName: item.name,
              pageCount: 1,
              imageDataUrl: item.url,
              allPages: [item.url],
              rotation: 0,
              status: 'pending',
            });
          });
          showToast(`${compressedImages.length} photo(s) ajoutée(s) comme copie(s) individuelle(s).`);
        } else {
          // MULTI-PAGE MODE: Group images by bundles of pagesPerCopy!
          let currentSubs = [...submissions, ...newItems];
          let imgIdx = 0;

          // Check if last existing submission was incomplete (< pagesPerCopy)
          const lastSub = currentSubs.length > 0 ? currentSubs[currentSubs.length - 1] : null;
          const lastPages = lastSub?.allPages || (lastSub?.imageDataUrl ? [lastSub.imageDataUrl] : []);

          if (lastSub && lastPages.length < pagesPerCopy) {
            const needed = pagesPerCopy - lastPages.length;
            const toAdd = compressedImages.slice(0, needed).map((c) => c.url);
            const updatedAll = [...lastPages, ...toAdd];
            currentSubs[currentSubs.length - 1] = {
              ...lastSub,
              allPages: updatedAll,
              pageCount: updatedAll.length,
            };
            imgIdx += toAdd.length;
          }

          // Chunk remaining into groups of pagesPerCopy
          let createdCount = 0;
          while (imgIdx < compressedImages.length) {
            const chunk = compressedImages.slice(imgIdx, imgIdx + pagesPerCopy);
            const chunkUrls = chunk.map((c) => c.url);
            const studentIdx = currentSubs.length;
            const studentName = allClassStudents[studentIdx] || extractStudentNameFromFileName(chunk[0].name, studentIdx + 1);

            currentSubs.push({
              id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) + '-' + imgIdx,
              studentName,
              fileName: chunk.length > 1 ? `${chunk[0].name} (+${chunk.length - 1} pages)` : chunk[0].name,
              pageCount: chunkUrls.length,
              imageDataUrl: chunkUrls[0],
              allPages: chunkUrls,
              rotation: 0,
              status: 'pending',
            });
            createdCount++;
            imgIdx += pagesPerCopy;
          }

          onSubmissionsChange(currentSubs);
          showToast(`📸 ${compressedImages.length} photos assemblées en copies de ${pagesPerCopy} pages !`);
          return;
        }
      }
    }

    if (newItems.length > 0) {
      onSubmissionsChange([...submissions, ...newItems]);
    }
  };

  // Batch group existing submissions into bundles of N pages
  const handleBatchGroupSubmissions = (groupSize: number) => {
    if (submissions.length === 0 || groupSize < 1) return;

    // Collect all pages in order
    const allPagesOrdered: string[] = [];
    submissions.forEach((sub) => {
      const p = sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl];
      allPagesOrdered.push(...p);
    });

    if (groupSize === 1) {
      // Explode into single page copies
      const exploded: StudentSubmission[] = allPagesOrdered.map((pageUrl, idx) => ({
        id: 'sub-exp-' + Date.now() + '-' + idx,
        studentName: allClassStudents[idx] || `Élève ${idx + 1}`,
        fileName: `Page_${idx + 1}.jpg`,
        pageCount: 1,
        imageDataUrl: pageUrl,
        allPages: [pageUrl],
        rotation: 0,
        status: 'pending',
      }));
      onSubmissionsChange(exploded);
      setShowBatchGroupModal(false);
      showToast(`✓ Toutes les pages ont été dégroupées (${exploded.length} copies de 1 page).`);
      return;
    }

    // Chunk into bundles of groupSize
    const newGrouped: StudentSubmission[] = [];
    for (let i = 0; i < allPagesOrdered.length; i += groupSize) {
      const chunk = allPagesOrdered.slice(i, i + groupSize);
      const studentIdx = Math.floor(i / groupSize);
      const studentName = allClassStudents[studentIdx] || submissions[studentIdx]?.studentName || `Élève ${studentIdx + 1}`;
      newGrouped.push({
        id: 'sub-grp-' + Date.now() + '-' + studentIdx,
        studentName,
        fileName: `Copie_${studentIdx + 1} (${chunk.length} pages)`,
        pageCount: chunk.length,
        imageDataUrl: chunk[0],
        allPages: chunk,
        rotation: 0,
        status: 'pending',
      });
    }

    onSubmissionsChange(newGrouped);
    setShowBatchGroupModal(false);
    updatePagesPerCopy(groupSize);
    showToast(`✓ Regroupement appliqué : ${newGrouped.length} copies de ${groupSize} pages créées.`);
  };

  // Merge student card at index with student card at index + 1
  const handleMergeWithNext = (idx: number) => {
    if (idx < 0 || idx >= submissions.length - 1) return;
    const cur = submissions[idx];
    const nxt = submissions[idx + 1];

    const curPages = cur.allPages && cur.allPages.length > 0 ? cur.allPages : [cur.imageDataUrl];
    const nxtPages = nxt.allPages && nxt.allPages.length > 0 ? nxt.allPages : [nxt.imageDataUrl];
    const combined = [...curPages, ...nxtPages];

    const updatedCurrent: StudentSubmission = {
      ...cur,
      allPages: combined,
      pageCount: combined.length,
    };

    const newSubs = [...submissions];
    newSubs.splice(idx, 2, updatedCurrent);
    onSubmissionsChange(newSubs);
    showToast(`✓ Copies fusionnées : ${cur.studentName} comprend maintenant ${combined.length} pages.`);
  };

  // Detach a single page from a multi-page submission into its own copy
  const handleDetachPage = (subId: string, pageIdx: number) => {
    const subIndex = submissions.findIndex((s) => s.id === subId);
    if (subIndex === -1) return;
    const sub = submissions[subIndex];
    const pages = sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl];
    if (pages.length <= 1) return;

    const detachedUrl = pages[pageIdx];
    const remaining = pages.filter((_, i) => i !== pageIdx);

    const updatedOrig: StudentSubmission = {
      ...sub,
      imageDataUrl: remaining[0],
      allPages: remaining,
      pageCount: remaining.length,
    };

    const newSub: StudentSubmission = {
      id: 'sub-det-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      studentName: `Copie détachée (p.${pageIdx + 1})`,
      fileName: `Page_detachee_${pageIdx + 1}.jpg`,
      pageCount: 1,
      imageDataUrl: detachedUrl,
      allPages: [detachedUrl],
      rotation: 0,
      status: 'pending',
    };

    const newSubs = [...submissions];
    newSubs.splice(subIndex, 1, updatedOrig, newSub);
    onSubmissionsChange(newSubs);
    setActiveCardPages((prev) => ({ ...prev, [subId]: 0 }));
    showToast(`✓ La page a été détachée en une nouvelle copie distincte.`);
  };

  // Guided camera scanner functions
  const openGuidedScanner = () => {
    const target = pagesPerCopy > 1 ? pagesPerCopy : 3;
    setGuidedTargetPages(target);
    setGuidedStudents([]);
    setCurrentDraftPages([]);
    const defaultName = allClassStudents[0] || `Élève ${submissions.length + 1}`;
    setCurrentDraftName(defaultName);
    setIsGuidedScannerOpen(true);
  };

  const handleGuidedCameraCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setIsGuidedProcessing(true);
    try {
      for (let i = 0; i < files.length; i++) {
        const compressed = await compressImageFile(files[i]);
        if (compressed) {
          setCurrentDraftPages((prev) => [...prev, compressed]);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la capture guidée:', err);
    } finally {
      setIsGuidedProcessing(false);
      e.target.value = '';
    }
  };

  const handleGuidedValidateAndNextStudent = () => {
    if (currentDraftPages.length === 0) {
      alert('Veuillez prendre au moins une photo pour cet élève.');
      return;
    }

    const completed = {
      name: currentDraftName.trim() || `Élève ${submissions.length + guidedStudents.length + 1}`,
      pages: [...currentDraftPages],
    };

    const newGuidedList = [...guidedStudents, completed];
    setGuidedStudents(newGuidedList);

    // Setup next student
    const nextIdx = submissions.length + newGuidedList.length;
    const nextName = allClassStudents[newGuidedList.length] || `Élève ${nextIdx + 1}`;
    setCurrentDraftName(nextName);
    setCurrentDraftPages([]);
  };

  const handleGuidedFinishAndSave = () => {
    const finalDrafts = [...guidedStudents];
    if (currentDraftPages.length > 0) {
      finalDrafts.push({
        name: currentDraftName.trim() || `Élève ${submissions.length + guidedStudents.length + 1}`,
        pages: [...currentDraftPages],
      });
    }

    if (finalDrafts.length === 0) {
      setIsGuidedScannerOpen(false);
      return;
    }

    const newSubs: StudentSubmission[] = finalDrafts.map((d, idx) => ({
      id: 'sub-cam-' + Date.now() + '-' + idx,
      studentName: d.name,
      fileName: `Scan_Caméra_${d.name.replace(/\s+/g, '_')} (${d.pages.length} pages)`,
      pageCount: d.pages.length,
      imageDataUrl: d.pages[0],
      allPages: d.pages,
      rotation: 0,
      status: 'pending',
    }));

    onSubmissionsChange([...submissions, ...newSubs]);
    setIsGuidedScannerOpen(false);
    showToast(`📸 ${newSubs.length} copie(s) numérisée(s) (${newSubs.reduce((s, c) => s + (c.allPages?.length || 1), 0)} pages au total) !`);
  };

  const handlePagePrev = (subId: string, totalPages: number) => {
    setActiveCardPages((prev) => {
      const cur = prev[subId] || 0;
      return { ...prev, [subId]: cur > 0 ? cur - 1 : totalPages - 1 };
    });
  };

  const handlePageNext = (subId: string, totalPages: number) => {
    setActiveCardPages((prev) => {
      const cur = prev[subId] || 0;
      return { ...prev, [subId]: cur < totalPages - 1 ? cur + 1 : 0 };
    });
  };

  const handleMovePage = (subId: string, fromIndex: number, direction: 'prev' | 'next') => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;
    const pages = [...(sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl])];
    const toIndex = direction === 'prev' ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= pages.length) return;

    const temp = pages[fromIndex];
    pages[fromIndex] = pages[toIndex];
    pages[toIndex] = temp;

    onSubmissionsChange(
      submissions.map((s) =>
        s.id === subId
          ? {
              ...s,
              allPages: pages,
              imageDataUrl: pages[0],
            }
          : s
      )
    );
    setActiveCardPages((prev) => ({ ...prev, [subId]: toIndex }));
  };

  const handleReversePages = (subId: string) => {
    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;
    const pages = [...(sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl])].reverse();

    onSubmissionsChange(
      submissions.map((s) =>
        s.id === subId
          ? {
              ...s,
              allPages: pages,
              imageDataUrl: pages[0],
            }
          : s
      )
    );
    setActiveCardPages((prev) => ({ ...prev, [subId]: 0 }));
  };

  const handleAddPageToStudent = async (subId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const sub = submissions.find((s) => s.id === subId);
    if (!sub) return;

    setIsProcessingPdf(true);
    setPdfProgressText('Ajout des pages à la copie...');

    try {
      const addedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          const pages = await convertPdfToImages(file);
          addedUrls.push(...pages.map((p) => p.dataUrl));
        } else if (file.type.startsWith('image/')) {
          const compressed = await compressImageFile(file);
          if (compressed) addedUrls.push(compressed);
        }
      }

      if (addedUrls.length > 0) {
        const existingPages = sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl];
        const updatedAll = [...existingPages, ...addedUrls];
        onSubmissionsChange(
          submissions.map((s) =>
            s.id === subId
              ? {
                  ...s,
                  allPages: updatedAll,
                  pageCount: updatedAll.length,
                }
              : s
          )
        );
        setActiveCardPages((prev) => ({ ...prev, [subId]: updatedAll.length - 1 }));
        showToast(`✓ Page ajoutée à la copie de ${sub.studentName} (${updatedAll.length} pages).`);
      }
    } catch (err) {
      console.error("Erreur lors de l'ajout de page:", err);
    } finally {
      setIsProcessingPdf(false);
      setPdfProgressText('');
      e.target.value = '';
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const handleNameChange = (id: string, newName: string) => {
    onSubmissionsChange(
      submissions.map((sub) => (sub.id === id ? { ...sub, studentName: newName } : sub))
    );
  };

  const handleRotate = (id: string) => {
    onSubmissionsChange(
      submissions.map((sub) => {
        if (sub.id !== id) return sub;
        const newRotation = ((sub.rotation || 0) + 90) % 360;
        return { ...sub, rotation: newRotation };
      })
    );
  };

  const handleDelete = (id: string) => {
    onSubmissionsChange(submissions.filter((sub) => sub.id !== id));
  };

  const handleClearAll = () => {
    onSubmissionsChange([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-24 sm:pb-12 relative">
      {/* Toast Notification for quick actions */}
      {statusToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-slate-900/95 text-white shadow-xl text-xs font-bold border border-slate-700 backdrop-blur-md">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{statusToast.text}</span>
          </div>
        </div>
      )}

      {/* Hidden input for guided scanner camera capture */}
      <input
        ref={guidedCameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={handleGuidedCameraCapture}
      />

      {/* Title banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Étape 2 sur 4 : Dépôt des copies
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3 flex-wrap">
            <span>Copies de la classe ({submissions.length})</span>
            {submissions.length > 0 && totalAllPagesCount > submissions.length && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">
                {totalAllPagesCount} pages au total
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Déposez les photos des copies (1 ou plusieurs pages par élève) ou un document PDF multipages complet.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {submissions.length > 0 && (
            showClearConfirm ? (
              <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg p-1">
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                >
                  Confirmer
                </button>
                <button
                  type="button"
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-slate-600 hover:text-slate-800 text-xs cursor-pointer"
                >
                  Annuler
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowClearConfirm(true)}
                className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 text-xs font-medium transition-colors cursor-pointer"
                title="Vider la liste"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Tout effacer</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Active Assignment & Rubric Info Banner */}
      {config && (
        <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-slate-900 text-sm">{config.title}</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                  {config.discipline}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-200/80 text-slate-700">
                  {config.level}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-100 text-indigo-800">
                  Barème /{config.maxGrade}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-slate-600 flex-wrap">
                <span className="font-medium">Corrigé de référence :</span>
                {config.rubricFileName ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {config.rubricFileName}
                  </span>
                ) : config.rubricContent && config.rubricContent.trim().length > 0 ? (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Corrigé officiel rédigé en texte
                  </span>
                ) : (
                  <span className="text-amber-700 font-medium">
                    Mode autonome (aucun corrigé fourni)
                  </span>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-white text-slate-700 text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-2xs"
          >
            <span>Modifier l'évaluation / corrigé</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* SÉLECTEUR DE FORMAT DES COPIES & REGROUPEMENT MULTI-PAGES */}
      <div className="bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border border-blue-200/80 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <span className="font-extrabold text-slate-900 text-xs sm:text-sm block">
                Nombre de pages par copie d'élève
              </span>
              <p className="text-[11px] text-slate-500">
                Définissez combien de pages comporte le devoir pour regrouper automatiquement vos photos
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            {[1, 2, 3, 4].map((cnt) => (
              <button
                key={cnt}
                type="button"
                onClick={() => {
                  updatePagesPerCopy(cnt);
                  setShowCustomPagesInput(false);
                  showToast(`Mode configuré : ${cnt} ${cnt === 1 ? 'page' : 'pages'} par copie d'élève.`);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                  pagesPerCopy === cnt && !showCustomPagesInput
                    ? 'bg-blue-600 text-white shadow-blue-500/20'
                    : 'bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:bg-blue-50/50'
                }`}
              >
                {cnt === 1 ? '1 page (recto)' : `${cnt} pages`}
              </button>
            ))}

            <button
              type="button"
              onClick={() => setShowCustomPagesInput(true)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                showCustomPagesInput || pagesPerCopy > 4
                  ? 'bg-blue-600 text-white shadow-blue-500/20'
                  : 'bg-white border border-slate-200 hover:border-blue-300 text-slate-700 hover:bg-blue-50/50'
              }`}
            >
              {pagesPerCopy > 4 && !showCustomPagesInput ? `${pagesPerCopy} pages` : 'Personnalisé...'}
            </button>
          </div>
        </div>

        {/* Custom pages input if active */}
        {showCustomPagesInput && (
          <div className="flex items-center gap-2 pt-2 border-t border-blue-100 animate-in fade-in">
            <span className="text-xs font-semibold text-slate-700">Nombre de pages par élève :</span>
            <input
              type="number"
              min="1"
              max="20"
              value={customPagesVal}
              onChange={(e) => setCustomPagesVal(e.target.value)}
              className="w-16 px-2.5 py-1 text-xs font-bold text-center bg-white border border-blue-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
            />
            <button
              type="button"
              onClick={() => {
                const parsed = parseInt(customPagesVal, 10);
                if (!isNaN(parsed) && parsed >= 1) {
                  updatePagesPerCopy(parsed);
                  setShowCustomPagesInput(false);
                  showToast(`Mode configuré : ${parsed} pages par copie.`);
                }
              }}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg cursor-pointer transition-colors"
            >
              Valider
            </button>
            <button
              type="button"
              onClick={() => setShowCustomPagesInput(false)}
              className="px-2 py-1 text-slate-500 hover:text-slate-700 text-xs cursor-pointer"
            >
              Annuler
            </button>
          </div>
        )}

        {/* Description hint */}
        <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
          {pagesPerCopy > 1 ? (
            <span>
              <strong>Mode multipages actif ({pagesPerCopy} pages par élève) :</strong> Les photos prises avec votre appareil ou sélectionnées en lot dans votre galerie seront automatiquement assemblées par paquets de <strong>{pagesPerCopy} pages par copie</strong> (ex: photos 1 à {pagesPerCopy} pour l'élève 1, les {pagesPerCopy} suivantes pour l'élève 2).
            </span>
          ) : (
            <span>
              <strong>Mode standard (1 page par copie) :</strong> Chaque photo prise ou sélectionnée constituera une copie d'élève distincte (idéal pour les devoirs recto simple).
            </span>
          )}
        </div>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        id="dropzone-copies"
        className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-blue-500 bg-blue-50/70 scale-[1.005]'
            : 'border-slate-300 hover:border-blue-400 bg-white hover:bg-slate-50/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />

        {isProcessingPdf ? (
          <div className="flex flex-col items-center justify-center py-4 space-y-3">
            <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
            <p className="font-semibold text-slate-800 text-sm">{pdfProgressText}</p>
            <p className="text-xs text-slate-500">Traitement automatique page par page...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shadow-xs">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div>
              <p className="text-base font-bold text-slate-800">
                Glissez-déposez les copies ici, ou <span className="text-blue-600 underline underline-offset-2">parcourez vos fichiers</span>
              </p>
              <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
                Accepte les photos de copies (JPG, PNG, WebP) et les documents PDF multipages scannés.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  cameraInputRef.current?.click();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold border border-blue-200 transition-colors shadow-2xs cursor-pointer"
                title="Prendre des photos directement avec la caméra de votre smartphone"
              >
                <Camera className="w-4 h-4 text-blue-600" />
                <span>Prendre en photo (Caméra directe)</span>
              </button>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  openGuidedScanner();
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                title="Ouvrir le mode scanner guidé pas-à-pas pour photographier chaque copie page par page"
              >
                <Smartphone className="w-4 h-4" />
                <span>Scanner guidé pas-à-pas ({pagesPerCopy > 1 ? `${pagesPerCopy} pages/copie` : 'multi-pages'})</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-500 font-medium">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                📄 PDF multipages
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                📸 Photos de copies (1 à 4+ pages)
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                ✍️ Écritures manuscrites
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Copies Grid */}
      {submissions.length > 0 ? (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span>Copies prêtes pour la correction ({submissions.length})</span>
                {totalAllPagesCount > submissions.length && (
                  <span className="text-xs px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-semibold normal-case">
                    {totalAllPagesCount} pages scannées
                  </span>
                )}
              </h2>
              <span className="text-xs text-slate-500">
                Vérifiez l'attribution, regroupez les pages ou renommez un élève
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Batch grouping tool */}
              {submissions.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setBatchGroupCount(pagesPerCopy > 1 ? pagesPerCopy : 3);
                    setShowBatchGroupModal(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-2xs"
                  title="Regrouper automatiquement toutes les photos existantes par paquets de 2, 3 ou 4 pages par copie"
                >
                  <Layers className="w-3.5 h-3.5 text-blue-600" />
                  <span>Regrouper les photos</span>
                </button>
              )}

              {/* Quick Class Roster Linker */}
              {classes.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-slate-600">Associer classe :</span>
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      const selected = classes.find((c) => c.id === e.target.value);
                      if (selected) {
                        const used = new Set<string>();
                        const updated = submissions.map((sub) => {
                          const fLower = (sub.fileName || '').toLowerCase();
                          const curLower = (sub.studentName || '').toLowerCase();
                          const match = selected.students.find(
                            (st) =>
                              !used.has(st) &&
                              (fLower.includes(st.toLowerCase()) || curLower === st.toLowerCase())
                          );
                          if (match) {
                            used.add(match);
                            return { ...sub, studentName: match };
                          }
                          return sub;
                        });

                        const remaining = selected.students.filter((st) => !used.has(st));
                        let remIdx = 0;
                        const finalized = updated.map((sub) => {
                          if (used.has(sub.studentName)) return sub;
                          const next = remaining[remIdx++];
                          return next ? { ...sub, studentName: next } : sub;
                        });

                        onSubmissionsChange(finalized);
                      }
                    }}
                    className="text-xs font-bold px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:ring-2 focus:ring-blue-500 outline-hidden cursor-pointer"
                  >
                    <option value="" disabled>
                      Choisir une classe pour pré-remplir...
                    </option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.students.length} élèves)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Intervertir deux copies button */}
              {onSwapSubmissions && submissions.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSwapModalTargetSub(submissions[0]);
                    setSwapSearchQuery('');
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  title="Ouvrir la liste pour intervertir deux copies facilement"
                >
                  <ArrowLeftRight className="w-3.5 h-3.5 text-amber-600" />
                  <span>Intervertir des copies</span>
                </button>
              )}
            </div>
          </div>

          {/* Datalist for autocomplete */}
          <datalist id="class-students-datalist">
            {allClassStudents.map((st) => (
              <option key={st} value={st} />
            ))}
          </datalist>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-4">
            {submissions.map((sub, index) => {
              const pages = sub.allPages && sub.allPages.length > 0 ? sub.allPages : [sub.imageDataUrl];
              const totalPages = pages.length;
              const activePageIdx = Math.min(activeCardPages[sub.id] || 0, totalPages - 1);
              const currentDisplayImage = pages[activePageIdx] || sub.imageDataUrl;

              return (
                <div
                  key={sub.id}
                  id={`student-card-${sub.id}`}
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs flex flex-col hover:border-slate-300 transition-all group relative"
                >
                  {/* Image Preview with page navigation */}
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden rounded-t-xl flex items-center justify-center border-b border-slate-100">
                    <img
                      src={currentDisplayImage}
                      alt={sub.studentName}
                      style={{
                        transform: `rotate(${sub.rotation || 0}deg)`,
                        transition: 'transform 0.2s ease',
                      }}
                      className="max-h-full max-w-full object-contain p-2"
                    />

                    {/* Left overlay: student index & page badge */}
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className="w-6 h-6 rounded-full bg-slate-900/85 backdrop-blur-xs text-white text-xs font-bold flex items-center justify-center shadow-xs">
                        {index + 1}
                      </span>
                      {totalPages > 1 && (
                        <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[11px] font-extrabold flex items-center gap-1 shadow-xs">
                          <FileText className="w-3 h-3" />
                          {totalPages} pages
                        </span>
                      )}
                    </div>

                    {/* Right overlay: tools */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                      <a
                        href={currentDisplayImage}
                        download={`${(sub.studentName || 'Copie').replace(/\s+/g, '_')}_page_${activePageIdx + 1}.jpg`}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-emerald-600 shadow-xs hover:bg-white transition-colors cursor-pointer"
                        title="Télécharger l'image de cette page"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleRotate(sub.id)}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-blue-600 shadow-xs hover:bg-white transition-colors cursor-pointer"
                        title="Faire pivoter de 90°"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(sub.id)}
                        className="p-1.5 rounded-lg bg-white/95 text-slate-700 hover:text-red-600 shadow-xs hover:bg-white transition-colors cursor-pointer"
                        title="Supprimer cette copie"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Multi-page switcher and reorder bar */}
                    {totalPages > 1 && (
                      <div className="absolute bottom-2 inset-x-2 flex flex-col gap-1 px-2 py-1.5 rounded-lg bg-slate-900/90 backdrop-blur-xs text-white text-xs shadow-md">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePagePrev(sub.id, totalPages);
                            }}
                            className="p-1 hover:text-blue-300 transition-colors cursor-pointer"
                            title="Page précédente"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-[11px] tracking-wide">
                            Page {activePageIdx + 1} sur {totalPages}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePageNext(sub.id, totalPages);
                            }}
                            className="p-1 hover:text-blue-300 transition-colors cursor-pointer"
                            title="Page suivante"
                          >
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Reorder tools */}
                        <div className="flex items-center justify-center gap-1 pt-1 border-t border-white/15 text-[10px]">
                          <button
                            type="button"
                            disabled={activePageIdx === 0}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(sub.id, activePageIdx, 'prev');
                            }}
                            className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
                            title="Déplacer cette page vers la gauche"
                          >
                            ← Déplacer
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleReversePages(sub.id);
                            }}
                            className="px-1.5 py-0.5 rounded bg-blue-600/90 hover:bg-blue-600 text-white font-medium transition-colors cursor-pointer"
                            title="Inverser l'ordre de toutes les pages de cette copie"
                          >
                            ⇄ Inverser
                          </button>
                          <button
                            type="button"
                            disabled={activePageIdx === totalPages - 1}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(sub.id, activePageIdx, 'next');
                            }}
                            className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/30 disabled:opacity-25 disabled:cursor-not-allowed transition-colors cursor-pointer font-medium"
                            title="Déplacer cette page vers la droite"
                          >
                            Déplacer →
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Body with Name Input */}
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1.5 gap-2">
                        <span className="truncate">
                          Copie de {sub.studentName} {totalPages > 1 ? `• ${totalPages} pages` : '• 1 page'}
                        </span>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {/* Snap additional photo with camera */}
                          <label
                            htmlFor={`camera-page-${sub.id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Prendre une photo supplémentaire avec la caméra pour cet élève"
                          >
                            <Camera className="w-3 h-3 text-emerald-600" />
                            <span>+ Photo</span>
                            <input
                              type="file"
                              id={`camera-page-${sub.id}`}
                              accept="image/*"
                              capture="environment"
                              className="hidden"
                              onChange={(e) => handleAddPageToStudent(sub.id, e)}
                            />
                          </label>

                          {/* Add page from file */}
                          <label
                            htmlFor={`add-page-${sub.id}`}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[10px] font-bold cursor-pointer transition-colors"
                            title="Ajouter un fichier image ou PDF à cette copie"
                          >
                            <Plus className="w-3 h-3 text-blue-600" />
                            <span>+ Page</span>
                            <input
                              type="file"
                              id={`add-page-${sub.id}`}
                              accept="image/png,image/jpeg,image/webp,application/pdf"
                              className="hidden"
                              onChange={(e) => handleAddPageToStudent(sub.id, e)}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Interactive page selector pills if multi-page */}
                      {totalPages > 1 && (
                        <div className="flex items-center gap-1 overflow-x-auto py-1 mb-1.5">
                          <span className="text-[10px] text-slate-400 font-bold mr-0.5">Pages :</span>
                          {pages.map((_, pIdx) => (
                            <button
                              key={pIdx}
                              type="button"
                              onClick={() => setActiveCardPages((prev) => ({ ...prev, [sub.id]: pIdx }))}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                                activePageIdx === pIdx
                                  ? 'bg-blue-600 text-white shadow-2xs'
                                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                              }`}
                            >
                              p.{pIdx + 1}
                            </button>
                          ))}

                          {totalPages > 1 && (
                            <button
                              type="button"
                              onClick={() => handleDetachPage(sub.id, activePageIdx)}
                              className="ml-auto inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 hover:bg-amber-100 text-amber-700 text-[10px] font-bold border border-amber-200 transition-colors cursor-pointer shrink-0"
                              title={`Détacher la page ${activePageIdx + 1} en une nouvelle copie d'élève distincte`}
                            >
                              <Scissors className="w-2.5 h-2.5" />
                              <span>Détacher p.{activePageIdx + 1}</span>
                            </button>
                          )}
                        </div>
                      )}

                      <div className="relative">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`name-input-${sub.id}`}
                            type="text"
                            list="class-students-datalist"
                            value={sub.studentName}
                            onChange={(e) => handleNameChange(sub.id, e.target.value)}
                            placeholder="Nom de l'élève..."
                            className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                          />

                          {onSwapSubmissions && submissions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => {
                                setSwapModalTargetSub(sub);
                                setSwapSearchQuery('');
                              }}
                              className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-amber-600 hover:bg-amber-50 hover:border-amber-300 transition-colors cursor-pointer shrink-0"
                              title="Intervertir cette copie avec un autre élève"
                            >
                              <ArrowLeftRight className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1.5 border-t border-slate-100">
                      <span className="truncate max-w-[130px]" title={sub.fileName}>
                        {sub.fileName}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {index < submissions.length - 1 && (
                          <button
                            type="button"
                            onClick={() => handleMergeWithNext(index)}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors cursor-pointer"
                            title="Fusionner cette copie avec la suivante dans la liste"
                          >
                            <Combine className="w-3 h-3 text-indigo-600" />
                            <span>Fusionner</span>
                          </button>
                        )}

                        <span className="inline-flex items-center gap-1 text-emerald-600 font-bold">
                          <CheckCircle2 className="w-3 h-3" />
                          {totalPages > 1 ? `${totalPages} p.` : 'Prête'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="p-8 text-center bg-slate-50 border border-slate-200 rounded-xl">
          <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aucune copie déposée pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            Déposez les scans PDF ou photos de vos vraies copies d'élèves ci-dessus pour préparer la correction IA.
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          id="btn-step2-back"
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la configuration</span>
        </button>

        <div className="flex flex-col items-center sm:items-end gap-1.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onNext}
            disabled={submissions.length === 0}
            id="btn-step2-launch"
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer ${
              submissions.length > 0
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md'
                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isRegistered
                ? `Lancer la correction IA (${submissions.length} ${submissions.length > 1 ? 'copies' : 'copie'})`
                : `S'inscrire et lancer la correction IA (${submissions.length} ${submissions.length > 1 ? 'copies' : 'copie'})`}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>

          {!isRegistered && submissions.length > 0 && (
            <span className="text-[11px] text-amber-700 font-medium">
              🔒 Inscription gratuite obligatoire pour débloquer vos 30 copies d'essai offertes
            </span>
          )}
        </div>
      </div>

      {/* Mobile Sticky Quick Launch Bar (appears when copies are loaded) */}
      {submissions.length > 0 && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-3 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-xl z-40 flex items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="p-3 rounded-xl border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 transition-colors shrink-0 cursor-pointer shadow-2xs"
            title="Retour à la configuration"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={onNext}
            className="flex-1 inline-flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span className="truncate">
              {isRegistered
                ? `Lancer correction (${submissions.length})`
                : `S'inscrire & Lancer (${submissions.length})`}
            </span>
            <ArrowRight className="w-4 h-4 shrink-0" />
          </button>
        </div>
      )}

      {/* Dedicated Swap Copies Modal with search filter and full scrolling */}
      {swapModalTargetSub && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-sm">
                    Intervertir la copie
                  </h3>
                  <p className="text-xs text-slate-500">
                    Copie sélectionnée : <strong className="text-slate-800">{swapModalTargetSub.studentName}</strong> ({swapModalTargetSub.fileName})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSwapModalTargetSub(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative shrink-0">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Rechercher par nom d'élève ou fichier (ex: Sean, Sass)..."
                value={swapSearchQuery}
                onChange={(e) => setSwapSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden"
                autoFocus
              />
            </div>

            <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1 shrink-0">
              Sélectionnez la copie avec laquelle permuter ({submissions.filter((s) => s.id !== swapModalTargetSub.id).length} élèves) :
            </div>

            {/* Scrollable list with zero clipping and high visibility */}
            <div className="overflow-y-auto space-y-2 pr-1 flex-1 min-h-0 divide-y divide-slate-100 max-h-72">
              {submissions
                .filter((s) => s.id !== swapModalTargetSub.id)
                .filter((s) => {
                  if (!swapSearchQuery.trim()) return true;
                  const q = swapSearchQuery.toLowerCase();
                  return (
                    s.studentName.toLowerCase().includes(q) ||
                    (s.fileName || '').toLowerCase().includes(q)
                  );
                })
                .map((other) => (
                  <div
                    key={other.id}
                    className="pt-2 first:pt-0 flex items-center justify-between gap-3 p-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={other.imageDataUrl}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div className="truncate">
                        <span className="font-bold text-slate-900 text-sm block truncate">
                          {other.studentName}
                        </span>
                        <span className="text-xs text-slate-500 truncate block">
                          Fichier : {other.fileName} {other.allPages && other.allPages.length > 1 ? `(${other.allPages.length} pages)` : '(1 page)'}
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        onSwapSubmissions?.(swapModalTargetSub.id, other.id, 'names');
                        setSwapModalTargetSub(null);
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-extrabold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Échanger</span>
                    </button>
                  </div>
                ))}
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between shrink-0 text-xs text-slate-500">
              <span>Permute instantanément les attributions de copies.</span>
              <button
                type="button"
                onClick={() => setSwapModalTargetSub(null)}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: BATCH GROUPING TOOL (Regrouper les photos existantes par 2, 3 ou 4 pages) */}
      {showBatchGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-5 space-y-4 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Regrouper les photos par copie
                  </h3>
                  <p className="text-xs text-slate-500">
                    Assemble automatiquement les photos existantes en paquets par élève
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchGroupModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-slate-700 space-y-1">
              <div className="font-bold text-blue-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                <span>État actuel de vos copies :</span>
              </div>
              <p>
                Vous avez <strong>{totalAllPagesCount} pages / photos</strong> réparties sur <strong>{submissions.length} fiches</strong>.
              </p>
              <p className="text-[11px] text-slate-500">
                Toutes les pages seront conservées dans l'ordre et regroupées par élève.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-800 uppercase tracking-wide block">
                Combien de pages comporte la copie de chaque élève ?
              </label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[2, 3, 4, 5].map((num) => {
                  const estCopies = Math.ceil(totalAllPagesCount / num);
                  return (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setBatchGroupCount(num)}
                      className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                        batchGroupCount === num
                          ? 'border-blue-600 bg-blue-50/80 text-blue-900 ring-2 ring-blue-500/20 font-bold'
                          : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50 font-medium'
                      }`}
                    >
                      <div className="text-base font-extrabold">{num} pages</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        ≈ {estCopies} copies
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom or Explode Options */}
            <div className="pt-2 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-slate-600">Autre nombre de pages :</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="1"
                    max="20"
                    value={batchGroupCount}
                    onChange={(e) => setBatchGroupCount(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="w-16 px-2 py-1 text-xs font-bold text-center border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-hidden"
                  />
                  <span className="text-slate-500">pages / copie</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleBatchGroupSubmissions(1)}
                  className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800 font-semibold cursor-pointer underline underline-offset-2"
                  title="Séparer chaque page en une copie distincte"
                >
                  <Split className="w-3.5 h-3.5" />
                  <span>Dégrouper en pages uniques (1 page/copie)</span>
                </button>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowBatchGroupModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleBatchGroupSubmissions(batchGroupCount)}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
              >
                <Layers className="w-4 h-4" />
                <span>Appliquer le regroupement ({batchGroupCount} pages/copie)</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: GUIDED CAMERA SCANNER (Prise de vue pas-à-pas multi-pages) */}
      {isGuidedScannerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-5 space-y-4 max-h-[92vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Scanner photo pas-à-pas
                  </h3>
                  <p className="text-xs text-slate-500">
                    Photographiez les pages de chaque copie d'élève à la suite
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsGuidedScannerOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target pages selector */}
            <div className="flex items-center justify-between bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs shrink-0">
              <span className="font-semibold text-slate-700">Pages attendues par copie :</span>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4].map((num) => (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setGuidedTargetPages(num)}
                    className={`px-2.5 py-1 rounded-lg font-bold text-xs transition-colors cursor-pointer ${
                      guidedTargetPages === num
                        ? 'bg-emerald-600 text-white'
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    {num} {num === 1 ? 'page' : 'pages'}
                  </button>
                ))}
              </div>
            </div>

            {/* Active Student Draft Section */}
            <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-h-0">
              <div className="border-2 border-emerald-200 bg-emerald-50/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-bold flex items-center justify-center">
                      {guidedStudents.length + 1}
                    </span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      Copie en cours de numérisation
                    </span>
                  </div>

                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-emerald-800 border border-emerald-200 self-start sm:self-auto">
                    {currentDraftPages.length} {guidedTargetPages > 0 ? `sur ${guidedTargetPages}` : ''} page(s) prise(s)
                  </span>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1">
                    Nom de l'élève :
                  </label>
                  <input
                    type="text"
                    list="class-students-datalist"
                    value={currentDraftName}
                    onChange={(e) => setCurrentDraftName(e.target.value)}
                    placeholder="Nom ou prénom de l'élève..."
                    className="w-full px-3 py-2 bg-white border border-emerald-300 rounded-xl text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 outline-hidden"
                  />
                </div>

                {/* Thumbnails of pages taken for current student */}
                {currentDraftPages.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block mb-1.5">
                      Pages prises pour cet élève :
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {currentDraftPages.map((url, pIdx) => (
                        <div
                          key={pIdx}
                          className="relative aspect-3/4 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden group shadow-2xs"
                        >
                          <img src={url} alt="" className="w-full h-full object-cover" />
                          <span className="absolute top-1 left-1 px-1.5 py-0.5 rounded bg-slate-900/80 text-white text-[10px] font-bold">
                            Page {pIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => setCurrentDraftPages((prev) => prev.filter((_, i) => i !== pIdx))}
                            className="absolute top-1 right-1 p-1 rounded bg-rose-600 text-white opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                            title="Supprimer cette page"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Big Camera Trigger Button */}
                <div className="pt-2">
                  <label
                    htmlFor="guided-camera-file"
                    className={`w-full py-3.5 px-4 rounded-xl text-white font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer transition-all shadow-md ${
                      isGuidedProcessing
                        ? 'bg-slate-400 cursor-wait'
                        : 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20 active:scale-[0.99]'
                    }`}
                  >
                    {isGuidedProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Traitement de la photo...</span>
                      </>
                    ) : (
                      <>
                        <Camera className="w-5 h-5" />
                        <span>📸 Photographier la page {currentDraftPages.length + 1}</span>
                      </>
                    )}
                    <input
                      type="file"
                      id="guided-camera-file"
                      accept="image/*"
                      capture="environment"
                      className="hidden"
                      onChange={handleGuidedCameraCapture}
                      disabled={isGuidedProcessing}
                    />
                  </label>
                </div>

                {/* Target reached message */}
                {guidedTargetPages > 0 && currentDraftPages.length >= guidedTargetPages && (
                  <div className="p-2.5 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs font-bold flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                      Toutes les {guidedTargetPages} pages ont été prises !
                    </span>
                    <button
                      type="button"
                      onClick={handleGuidedValidateAndNextStudent}
                      className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-extrabold cursor-pointer transition-colors"
                    >
                      Élève suivant ➔
                    </button>
                  </div>
                )}
              </div>

              {/* Already Completed Students Summary */}
              {guidedStudents.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                    Copies prêtes ({guidedStudents.length}) :
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto divide-y divide-slate-100">
                    {guidedStudents.map((st, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs py-1.5 px-2 bg-slate-50 rounded-lg">
                        <div className="flex items-center gap-2 truncate">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="font-bold text-slate-800 truncate">{st.name}</span>
                          <span className="text-slate-500 font-medium">({st.pages.length} pages)</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setGuidedStudents((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-red-600 p-1 cursor-pointer"
                          title="Supprimer cette copie"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-2.5 shrink-0">
              <button
                type="button"
                onClick={handleGuidedValidateAndNextStudent}
                disabled={currentDraftPages.length === 0}
                className="w-full sm:w-auto px-4 py-2 rounded-xl border border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Valider cet élève et passer au suivant</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={handleGuidedFinishAndSave}
                disabled={guidedStudents.length === 0 && currentDraftPages.length === 0}
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-extrabold shadow-sm transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>
                  Terminer et ajouter ({guidedStudents.length + (currentDraftPages.length > 0 ? 1 : 0)} copies)
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
