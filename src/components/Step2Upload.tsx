import React, { useState, useRef } from 'react';
import { StudentSubmission, AssignmentConfig } from '../types';
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
} from 'lucide-react';

interface Step2UploadProps {
  submissions: StudentSubmission[];
  onSubmissionsChange: (submissions: StudentSubmission[]) => void;
  onNext: () => void;
  onBack: () => void;
  onLoadDemo: () => void;
  config?: AssignmentConfig;
}

export const Step2Upload: React.FC<Step2UploadProps> = ({
  submissions,
  onSubmissionsChange,
  onNext,
  onBack,
  onLoadDemo,
  config,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessingPdf, setIsProcessingPdf] = useState(false);
  const [pdfProgressText, setPdfProgressText] = useState('');
  const [activeCardPages, setActiveCardPages] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleClearAll = () => {
    onSubmissionsChange([]);
    setShowClearConfirm(false);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12">
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
          <button
            type="button"
            onClick={onLoadDemo}
            id="btn-load-demo-step2"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Charger 3 copies d'exemple</span>
          </button>

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
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <span>Copies prêtes pour la correction ({submissions.length})</span>
            </h2>
            <span className="text-xs text-slate-500">
              Vous pouvez renommer un élève directement dans le champ prévu
            </span>
          </div>

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
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col hover:border-slate-300 transition-all group"
                >
                  {/* Image Preview with page navigation */}
                  <div className="relative aspect-4/3 bg-slate-100 overflow-hidden flex items-center justify-center border-b border-slate-100">
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

                    {/* Multi-page switcher bar */}
                    {totalPages > 1 && (
                      <div className="absolute bottom-2 inset-x-2 flex items-center justify-between px-2.5 py-1 rounded-lg bg-slate-900/85 backdrop-blur-xs text-white text-xs font-semibold shadow-xs">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePagePrev(sub.id, totalPages);
                          }}
                          className="p-0.5 hover:text-blue-300 transition-colors cursor-pointer"
                          title="Page précédente"
                        >
                          <ChevronLeft className="w-3.5 h-3.5" />
                        </button>
                        <span>
                          Page {activePageIdx + 1} / {totalPages}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePageNext(sub.id, totalPages);
                          }}
                          className="p-0.5 hover:text-blue-300 transition-colors cursor-pointer"
                          title="Page suivante"
                        >
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
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

                      <input
                        id={`name-input-${sub.id}`}
                        type="text"
                        value={sub.studentName}
                        onChange={(e) => handleNameChange(sub.id, e.target.value)}
                        placeholder="Nom de l'élève..."
                        className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                      />
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
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Aucune copie déposée pour le moment</p>
          <p className="text-xs text-slate-500 mt-1">
            Déposez des images ou cliquez sur "Charger 3 copies d'exemple" pour tester immédiatement la correction IA.
          </p>
        </div>
      )}

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-6 border-t border-slate-200">
        <button
          type="button"
          onClick={onBack}
          id="btn-step2-back"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Retour à la configuration</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={submissions.length === 0}
          id="btn-step2-launch"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer ${
            submissions.length > 0
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Lancer la correction IA ({submissions.length} {submissions.length > 1 ? 'copies' : 'copie'})</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
