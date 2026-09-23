import React, { useState, useRef, useMemo } from 'react';
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

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: StudentSubmission[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Handle PDF (Each PDF file represents 1 student, with 1 or multiple pages)
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
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
      // Handle Images (JPG, PNG, WebP)
      else if (file.type.startsWith('image/')) {
        const studentName = extractStudentNameFromFileName(file.name, submissions.length + newItems.length + 1);
        const imageDataUrl = await compressImageFile(file);

        newItems.push({
          id: 'sub-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7) + '-' + i,
          studentName,
          fileName: file.name,
          pageCount: 1,
          imageDataUrl,
          allPages: [imageDataUrl],
          rotation: 0,
          status: 'pending',
        });
      }
    }

    if (newItems.length > 0) {
      onSubmissionsChange([...submissions, ...newItems]);
    }
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
    <div className="max-w-6xl mx-auto space-y-6 pb-24 sm:pb-12">
      {/* Title banner */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <Users className="w-3.5 h-3.5" />
            Étape 2 sur 4 : Dépôt des copies
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Copies de la classe ({submissions.length})
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Déposez les photos individuelles des copies ou un seul fichier PDF contenant toutes les pages scannées.
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
            <p className="text-xs text-slate-500">Découpage automatique page par page...</p>
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

            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
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
                <span>Prendre en photo (Smartphone / Tablette)</span>
              </button>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] text-slate-500 font-medium">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                📄 PDF multipages
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200">
                🖼️ Images individuelles
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
              </h2>
              <span className="text-xs text-slate-500">
                Vous pouvez renommer un élève ou intervertir deux copies directement
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
                  <div className="p-3.5 flex-1 flex flex-col justify-between space-y-2">
                    <div>
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 mb-1">
                        <span className="truncate">
                          Copie de {sub.studentName} {totalPages > 1 ? `• ${totalPages} pages` : '• 1 page'}
                        </span>
                        <label
                          htmlFor={`add-page-${sub.id}`}
                          className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 text-[10px] font-bold cursor-pointer transition-colors"
                          title="Ajouter une page supplémentaire à cette copie"
                        >
                          <Plus className="w-3 h-3" />
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
                      <span className="truncate max-w-[160px]" title={sub.fileName}>
                        {sub.fileName}
                      </span>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {totalPages > 1 ? `${totalPages} p.` : 'Prête'}
                      </span>
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
    </div>
  );
};
