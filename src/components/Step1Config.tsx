import React, { useState } from 'react';
import {
  AssignmentConfig,
  Discipline,
  SchoolLevel,
  CorrectionMode,
} from '../types';
import { convertPdfToImages, compressImageFile } from '../lib/pdfUtils';
import {
  BookOpen,
  GraduationCap,
  Scale,
  Sparkles,
  FileCheck2,
  Brain,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  ArrowRight,
  Info,
  Trash2,
  FileText,
  Loader2,
  X,
  Wand2,
} from 'lucide-react';

interface Step1ConfigProps {
  config: AssignmentConfig;
  onChange: (config: AssignmentConfig) => void;
  onNext: () => void;
}

const DISCIPLINES: Discipline[] = [
  'Mathématiques',
  'Français',
  'Histoire-Géographie',
  'Sciences de la Vie et de la Terre (SVT)',
  'Physique-Chimie',
  'Anglais (LV1)',
  'Espagnol (LV2)',
  'Allemand',
  'Philosophie',
  'Sciences Économiques et Sociales (SES)',
  'Technologie',
  'Enseignement Supérieur / Autre',
];

const LEVELS: SchoolLevel[] = [
  '6e (Cycle 3)',
  '5e (Cycle 4)',
  '4e (Cycle 4)',
  '3e (Brevet)',
  '2nde (Lycée)',
  '1ère (Baccalauréat)',
  'Terminale (Baccalauréat)',
  'Supérieur / BTS / CPGE / Université',
];

export const Step1Config: React.FC<Step1ConfigProps> = ({ config, onChange, onNext }) => {
  const [rubricFileName, setRubricFileName] = useState<string>(config.rubricFileName || '');
  const [isProcessingRubric, setIsProcessingRubric] = useState<boolean>(false);
  const [isAnalyzingRubric, setIsAnalyzingRubric] = useState<boolean>(false);
  const [aiDetectionBanner, setAiDetectionBanner] = useState<{
    suggestedTitle: string;
    suggestedDiscipline: string;
    suggestedLevel?: string;
    suggestedMaxGrade: number;
    summary: string;
  } | null>(null);

  const updateField = <K extends keyof AssignmentConfig>(field: K, value: AssignmentConfig[K]) => {
    onChange({
      ...config,
      [field]: value,
    });
  };

  const updateGuideline = (key: keyof AssignmentConfig['pedagogicalGuidelines'], value: boolean | string) => {
    onChange({
      ...config,
      pedagogicalGuidelines: {
        ...config.pedagogicalGuidelines,
        [key]: value,
      },
    });
  };

  // AI analysis function: reads the answer key / correction document or text to detect the real title, discipline, and level
  const triggerAnalyzeRubric = async (
    imagesToAnalyze?: string[],
    textToAnalyze?: string,
    fileNameHint?: string
  ) => {
    const imagesToUse = imagesToAnalyze || config.rubricImages || (config.rubricImage ? [config.rubricImage] : []);
    const textToUse = textToAnalyze !== undefined ? textToAnalyze : config.rubricContent;

    if (imagesToUse.length === 0 && (!textToUse || !textToUse.trim())) {
      alert("Veuillez d'abord importer un document de corrigé (PDF ou image) ou saisir le texte de votre corrigé.");
      return;
    }

    setIsAnalyzingRubric(true);
    try {
      const res = await fetch('/api/analyze-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubricImages: imagesToUse,
          rubricContent: textToUse,
          currentTitle: config.title,
        }),
      });

      if (!res.ok) {
        throw new Error("Impossible d'analyser le corrigé");
      }

      const data = await res.json();
      if (data.success && data.analysis) {
        const {
          suggestedTitle,
          suggestedDiscipline,
          suggestedLevel,
          suggestedMaxGrade,
          extractedRubricText,
          summary,
        } = data.analysis;

        // Automatically update the config with the detected subject title, discipline, and criteria
        const updatedConfig: AssignmentConfig = {
          ...config,
          correctionMode: 'with_rubric',
          rubricImage: imagesToUse.length > 0 ? imagesToUse[0] : config.rubricImage,
          rubricImages: imagesToUse.length > 0 ? imagesToUse : config.rubricImages,
          rubricFileName: fileNameHint || config.rubricFileName || rubricFileName,
          title: suggestedTitle || config.title,
          discipline: (suggestedDiscipline as Discipline) || config.discipline,
          level: (suggestedLevel as SchoolLevel) || config.level,
          maxGrade: Number(suggestedMaxGrade) || config.maxGrade,
          rubricContent: (config.rubricContent && config.rubricContent.trim().length > 10)
            ? config.rubricContent
            : (extractedRubricText || config.rubricContent),
        };

        onChange(updatedConfig);

        setAiDetectionBanner({
          suggestedTitle,
          suggestedDiscipline,
          suggestedLevel,
          suggestedMaxGrade: Number(suggestedMaxGrade) || 20,
          summary: summary || `Sujet du devoir identifié : ${suggestedTitle}`,
        });
      }
    } catch (err: any) {
      console.warn('Erreur analyse IA corrigé:', err);
    } finally {
      setIsAnalyzingRubric(false);
    }
  };

  const handleRubricUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setRubricFileName(file.name);

    if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
      setIsProcessingRubric(true);
      try {
        const pages = await convertPdfToImages(file);
        if (pages.length > 0) {
          const pageUrls = pages.map((p) => p.dataUrl);
          const newFileName = `${file.name} (${pages.length} page${pages.length > 1 ? 's' : ''})`;

          onChange({
            ...config,
            correctionMode: 'with_rubric',
            rubricImage: pages[0].dataUrl,
            rubricImages: pageUrls,
            rubricFileName: newFileName,
          });

          // Automatically trigger AI reading of the uploaded answer key to detect title and subject!
          await triggerAnalyzeRubric(pageUrls, undefined, newFileName);
        }
      } catch (err) {
        console.error('Erreur lecture PDF corrigé:', err);
        alert('Impossible de lire le document PDF du corrigé. Assurez-vous qu’il n’est pas corrompu.');
      } finally {
        setIsProcessingRubric(false);
      }
    } else if (file.type.startsWith('image/')) {
      try {
        setIsProcessingRubric(true);
        const compressed = await compressImageFile(file);
        if (compressed) {
          onChange({
            ...config,
            correctionMode: 'with_rubric',
            rubricImage: compressed,
            rubricImages: [compressed],
            rubricFileName: file.name,
          });

          // Automatically trigger AI reading of the uploaded answer key
          await triggerAnalyzeRubric([compressed], undefined, file.name);
        }
      } catch (err) {
        console.error('Erreur compression image corrigé:', err);
      } finally {
        setIsProcessingRubric(false);
      }
    }
  };

  const removeRubricImage = () => {
    setRubricFileName('');
    setAiDetectionBanner(null);
    onChange({
      ...config,
      rubricImage: undefined,
      rubricImages: undefined,
      rubricFileName: undefined,
    });
  };

  const canProceed = config.title.trim().length > 0 && config.maxGrade > 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Intro banner */}
      <div className="bg-gradient-to-r from-blue-900 to-indigo-900 text-white rounded-2xl p-6 sm:p-8 shadow-sm">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-800/80 border border-blue-700 text-xs font-semibold text-blue-200 mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            Étape 1 sur 4 : Paramétrage Pédagogique
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Configurez votre évaluation
          </h1>
          <p className="mt-2 text-sm sm:text-base text-blue-100/90 leading-relaxed">
            Définissez la matière, le niveau académique, le barème et vos critères d'évaluation.
            L'IA adaptera automatiquement son niveau d'exigence et son vocabulaire à vos élèves.
          </p>
        </div>
      </div>

      {/* AI Rubric Detection Notification */}
      {aiDetectionBanner && (
        <div className="p-4 bg-emerald-50/90 border border-emerald-300 rounded-xl flex items-start justify-between gap-3 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-extrabold text-sm text-emerald-950">
                  Corrigé analysé avec succès par l'IA !
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-200/90 text-emerald-900 border border-emerald-300">
                  Titre actualisé
                </span>
              </div>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                Le nom de l'évaluation a été automatiquement mis à jour à partir de votre corrigé :{' '}
                <strong className="text-slate-900 font-bold">« {aiDetectionBanner.suggestedTitle} »</strong>.
              </p>
              <div className="flex items-center gap-3 mt-1.5 text-[11px] text-emerald-800 font-medium">
                <span>Matière : <strong>{aiDetectionBanner.suggestedDiscipline}</strong></span>
                <span>•</span>
                <span>Barème détecté : <strong>/{aiDetectionBanner.suggestedMaxGrade}</strong></span>
                {aiDetectionBanner.suggestedLevel && (
                  <>
                    <span>•</span>
                    <span>Niveau : <strong>{aiDetectionBanner.suggestedLevel}</strong></span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAiDetectionBanner(null)}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-md transition-colors cursor-pointer"
            title="Masquer la notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Loading state when AI is reading the rubric */}
      {isAnalyzingRubric && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-3 shadow-xs">
          <Loader2 className="w-5 h-5 text-blue-600 animate-spin shrink-0" />
          <div>
            <p className="text-xs font-bold text-blue-950">
              Lecture et analyse de votre corrigé par l'IA...
            </p>
            <p className="text-[11px] text-blue-700 mt-0.5">
              L'IA déchiffre votre document pour proposer le titre officiel, la matière et le barème de l'évaluation.
            </p>
          </div>
        </div>
      )}

      {/* Main Settings Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <BookOpen className="w-5 h-5 text-blue-600" />
          Informations Générales du Devoir
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Discipline */}
          <div>
            <label htmlFor="discipline-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Matière / Discipline <span className="text-red-500">*</span>
            </label>
            <select
              id="discipline-select"
              value={config.discipline}
              onChange={(e) => updateField('discipline', e.target.value as Discipline)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
            >
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* School Level */}
          <div>
            <label htmlFor="level-select" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Niveau Scolaire <span className="text-red-500">*</span>
            </label>
            <select
              id="level-select"
              value={config.level}
              onChange={(e) => updateField('level', e.target.value as SchoolLevel)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
            >
              {LEVELS.map((lvl) => (
                <option key={lvl} value={lvl}>
                  {lvl}
                </option>
              ))}
            </select>
          </div>

          {/* Title */}
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="assignment-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Titre du Devoir ou de l'Épreuve <span className="text-red-500">*</span>
              </label>
              {(config.rubricImage || (config.rubricImages && config.rubricImages.length > 0) || (config.rubricContent && config.rubricContent.trim().length > 0)) && (
                <button
                  type="button"
                  onClick={() => triggerAnalyzeRubric()}
                  disabled={isAnalyzingRubric}
                  className="inline-flex items-center gap-1.5 text-xs text-blue-700 hover:text-blue-900 font-semibold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  {isAnalyzingRubric ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5 text-blue-600" />
                  )}
                  <span>Proposer un titre depuis le corrigé</span>
                </button>
              )}
            </div>
            <input
              type="text"
              id="assignment-title"
              value={config.title}
              onChange={(e) => updateField('title', e.target.value)}
              placeholder="Ex : Devoir Surveillé N°3 — Théorème de Pythagore et Géométrie"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
            />
          </div>

          {/* Max Grade */}
          <div>
            <label htmlFor="max-grade-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Barème Global (Note Maximale) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                id="max-grade-input"
                min={1}
                max={100}
                value={config.maxGrade}
                onChange={(e) => updateField('maxGrade', Math.max(1, Number(e.target.value) || 20))}
                className="w-28 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
              />
              <span className="text-sm font-medium text-slate-500">points</span>
              <div className="flex items-center gap-1 ml-auto">
                {[10, 20, 40, 100].map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => updateField('maxGrade', val)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors cursor-pointer ${
                      config.maxGrade === val
                        ? 'bg-blue-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    /{val}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mode de Correction */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-6">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <Scale className="w-5 h-5 text-indigo-600" />
          Mode d'Analyse et de Correction
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Mode 1: Avec Corrigé */}
          <div
            onClick={() => updateField('correctionMode', 'with_rubric')}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              config.correctionMode === 'with_rubric'
                ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600/30'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <FileCheck2 className="w-5 h-5" />
                </div>
                {config.correctionMode === 'with_rubric' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base">Avec corrigé officiel</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Vous fournissez le barème détaillé et les réponses attendues (en texte ou en scannant votre propre feuille de corrigé). L'IA applique strictement votre barème.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60 text-xs font-semibold text-blue-700">
              Recommandé pour les examens stricts
            </div>
          </div>

          {/* Mode 2: Autonome */}
          <div
            onClick={() => updateField('correctionMode', 'autonomous')}
            className={`p-5 rounded-xl border-2 cursor-pointer transition-all flex flex-col justify-between ${
              config.correctionMode === 'autonomous'
                ? 'border-blue-600 bg-blue-50/40 shadow-xs ring-1 ring-blue-600/30'
                : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <Brain className="w-5 h-5" />
                </div>
                {config.correctionMode === 'autonomous' && (
                  <CheckCircle className="w-5 h-5 text-blue-600" />
                )}
              </div>
              <h3 className="font-bold text-slate-900 text-base">Mode autonome (sans corrigé)</h3>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                L'IA analyse l'énoncé figurant sur la copie de l'élève, résout elle-même le sujet selon le niveau académique sélectionné, et établit un barème équitable.
              </p>
            </div>
            <div className="mt-4 pt-2 border-t border-slate-200/60 text-xs font-semibold text-indigo-700">
              Idéal pour gagner du temps sur les interrogations rapides
            </div>
          </div>
        </div>

        {/* Corrigé content area if with_rubric */}
        {config.correctionMode === 'with_rubric' && (
          <div className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Fournir le corrigé type ou les réponses attendues
              </span>
              <span className="text-xs text-slate-500">Texte et/ou photo du corrigé</span>
            </div>

            {/* Rubric Image/PDF Upload */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label
                htmlFor="rubric-image-upload"
                className={`inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-300 hover:border-blue-500 text-slate-700 text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-2xs ${
                  isProcessingRubric ? 'opacity-60 pointer-events-none' : ''
                }`}
              >
                {isProcessingRubric ? (
                  <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4 text-blue-600" />
                )}
                <span>
                  {isProcessingRubric ? 'Lecture du document PDF...' : 'Importer le corrigé (PDF ou Image)'}
                </span>
                <input
                  type="file"
                  id="rubric-image-upload"
                  accept="image/png,image/jpeg,image/webp,application/pdf,.pdf"
                  className="hidden"
                  onChange={handleRubricUpload}
                  disabled={isProcessingRubric}
                />
              </label>

              {config.rubricImage ? (
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  {config.rubricFileName?.toLowerCase().includes('.pdf') ? (
                    <FileText className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <ImageIcon className="w-4 h-4 text-emerald-600" />
                  )}
                  <span className="font-semibold">{config.rubricFileName || rubricFileName || 'Corrigé officiel chargé'}</span>
                  {config.rubricImages && config.rubricImages.length > 1 && (
                    <span className="px-1.5 py-0.5 rounded-sm bg-emerald-200/70 text-emerald-800 text-[10px] font-bold">
                      {config.rubricImages.length} pages
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={removeRubricImage}
                    className="p-1 text-slate-400 hover:text-red-600 transition-colors ml-1 cursor-pointer"
                    title="Supprimer le corrigé importé"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-slate-400 italic">
                  Format accepté : PDF multipage ou photo (JPG, PNG) de votre corrigé manuscrit
                </span>
              )}
            </div>

            {/* Rubric Textarea */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="rubric-text-content" className="block text-xs font-semibold text-slate-700">
                  Ou saisissez le corrigé type et les critères en texte :
                  <span className="ml-2 text-[11px] text-slate-400 font-normal italic">
                    (Le contenu grisé ci-dessous est un exemple indicatif en texte fantôme)
                  </span>
                </label>
                {config.rubricContent && config.rubricContent.trim().length > 0 && (
                  <button
                    type="button"
                    onClick={() => updateField('rubricContent', '')}
                    className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer transition-colors"
                  >
                    Effacer le texte saisi
                  </button>
                )}
              </div>
              <textarea
                id="rubric-text-content"
                rows={6}
                value={config.rubricContent}
                onChange={(e) => updateField('rubricContent', e.target.value)}
                placeholder={`BARÈME & CORRIGÉ OFFICIEL (Exemple indicatif / texte fantôme) :
Exercice 1 (8 points) - Question 1 (5 pts)
Attendu : Le triangle ABC est rectangle en A. D'après le théorème de Pythagore, BC² = AB² + AC² = 36 + 64 = 100, donc BC = 10 cm. (Formule 2 pts, calcul 2 pts, unité 1 pt)
Question 2 (3 pts)
Attendu : AM / AB = 3 / 6 = 0,5 (ou 1/2 ou 50%).

Exercice 2 (12 points) - Question 1 (7 pts)...`}
                className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden font-mono text-xs leading-relaxed placeholder:text-slate-400/80 placeholder:italic"
              />
            </div>

            {/* AI Rubric Action Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => triggerAnalyzeRubric()}
                disabled={isAnalyzingRubric || (!config.rubricImage && !(config.rubricContent && config.rubricContent.trim().length > 0))}
                className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAnalyzingRubric ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyse du corrigé par l'IA en cours...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Lire le corrigé pour proposer un nom & barème au devoir</span>
                  </>
                )}
              </button>

              <span className="text-[11px] text-slate-500">
                L'IA analyse le sujet et adapte automatiquement le titre, la matière et le barème.
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Consignes Pédagogiques Personnalisables */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
        <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2 pb-3 border-b border-slate-100">
          <GraduationCap className="w-5 h-5 text-blue-600" />
          Consignes Pédagogiques & Bienveillance
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="pref-spelling"
              checked={config.pedagogicalGuidelines.spellingTolerance}
              onChange={(e) => updateGuideline('spellingTolerance', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Tolérance orthographique</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Ne pas pénaliser les fautes de langue si le raisonnement ou le concept est exact.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="pref-effort"
              checked={config.pedagogicalGuidelines.rewardEffortAndMethod}
              onChange={(e) => updateGuideline('rewardEffortAndMethod', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Valorisation de la démarche</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Attribuer des points significatifs pour la méthode même si le calcul numérique final est faux.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="pref-rigor"
              checked={config.pedagogicalGuidelines.rigorousJustification}
              onChange={(e) => updateGuideline('rigorousJustification', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Rigueur des justifications</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Exiger la formulation explicite des propriétés, théorèmes ou citations attendues.
              </p>
            </div>
          </label>

          <label className="flex items-start gap-3 p-3.5 rounded-lg border border-slate-200 hover:bg-slate-50/70 cursor-pointer transition-colors">
            <input
              type="checkbox"
              id="pref-clarity"
              checked={config.pedagogicalGuidelines.encourageClarity}
              onChange={(e) => updateGuideline('encourageClarity', e.target.checked)}
              className="mt-1 w-4 h-4 text-blue-600 rounded-sm border-slate-300 focus:ring-blue-500 cursor-pointer"
            />
            <div>
              <span className="text-sm font-semibold text-slate-900">Soin et présentation de la copie</span>
              <p className="text-xs text-slate-500 mt-0.5">
                Valoriser l'effort de présentation, la lisibilité de l'écriture et l'encadrement des réponses.
              </p>
            </div>
          </label>
        </div>

        {/* Freeform guidelines */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label htmlFor="custom-instructions-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Consignes Spécifiques Complémentaires (Optionnel)
              <span className="ml-2 text-[11px] text-slate-400 font-normal italic lowercase">
                (exemple en texte fantôme ci-dessous)
              </span>
            </label>
            {config.pedagogicalGuidelines.customInstructions && config.pedagogicalGuidelines.customInstructions.trim().length > 0 && (
              <button
                type="button"
                onClick={() => updateGuideline('customInstructions', '')}
                className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer transition-colors"
              >
                Effacer la consigne
              </button>
            )}
          </div>
          <div className="relative">
            <input
              type="text"
              id="custom-instructions-input"
              value={config.pedagogicalGuidelines.customInstructions}
              onChange={(e) => updateGuideline('customInstructions', e.target.value)}
              placeholder="Exemple indicatif (texte fantôme) : Valoriser les élèves qui précisent bien les théorèmes cités et encadrent les résultats..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all placeholder:text-slate-400/80 placeholder:italic"
            />
            {config.pedagogicalGuidelines.customInstructions && (
              <button
                type="button"
                onClick={() => updateGuideline('customInstructions', '')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                title="Vider"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex items-center justify-between pt-4">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Vous pourrez modifier vos copies et ajuster les notes à tout moment.</span>
        </div>

        <button
          onClick={onNext}
          disabled={!canProceed}
          id="btn-step1-next"
          className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer ${
            canProceed
              ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/20 hover:shadow-md'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Continuer vers le Dépôt des copies</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
