import React, { useState } from 'react';
import {
  AssignmentConfig,
  Discipline,
  SchoolLevel,
  CorrectionMode,
  AssessmentType,
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
  PenTool,
  ScrollText,
  Calculator,
  CheckSquare,
  Layers,
  Languages,
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
  'Autre discipline',
];

const LEVELS: SchoolLevel[] = [
  'Primaire (CP1 - CM2)',
  '6e',
  '5e',
  '4e',
  '3e (Brevet)',
  '2nde (Lycée)',
  '1ère (Baccalauréat)',
  'Terminale (Baccalauréat)',
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
  const [titleFeedback, setTitleFeedback] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

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

  // Helpers to identify academic nature of disciplines
  const isLiteraryDiscipline = (d: Discipline): boolean => {
    return [
      'Français',
      'Philosophie',
      'Histoire-Géographie',
      'Anglais (LV1)',
      'Espagnol (LV2)',
      'Allemand',
      'Sciences Économiques et Sociales (SES)',
    ].includes(d);
  };

  const isScientificDiscipline = (d: Discipline): boolean => {
    return [
      'Mathématiques',
      'Physique-Chimie',
      'Sciences de la Vie et de la Terre (SVT)',
      'Technologie',
    ].includes(d);
  };

  // Dynamic options tailored to each discipline
  const getOptionsForDiscipline = (discipline: Discipline) => {
    if (discipline === 'Français') {
      return [
        { id: 'standard', label: 'Standard', desc: 'Exercices & questions de texte', icon: BookOpen },
        { id: 'dictee', label: 'Dictée', desc: 'Barème déductif & accords (-1/-0.5/-0.25)', icon: PenTool },
        { id: 'dissertation', label: 'Dissertation', desc: 'Problématique, plan 3 parties & citations', icon: ScrollText },
        { id: 'commentaire', label: 'Commentaire', desc: 'Analyse linéaire / composé & procédés', icon: FileText },
        { id: 'qcm', label: 'QCM', desc: 'Grammaire, vocabulaire ou lecture', icon: CheckSquare },
      ];
    }
    if (discipline === 'Philosophie') {
      return [
        { id: 'standard', label: 'Standard', desc: 'Devoir classique', icon: BookOpen },
        { id: 'dissertation', label: 'Dissertation philo', desc: 'Concepts, thèse/antithèse & auteurs', icon: ScrollText },
        { id: 'commentaire', label: 'Explication de texte', desc: 'Thèse de l\'auteur & démarche argumentative', icon: FileText },
        { id: 'qcm', label: 'QCM', desc: 'Notions et histoire de la pensée', icon: CheckSquare },
      ];
    }
    if (discipline === 'Histoire-Géographie') {
      return [
        { id: 'standard', label: 'Standard', desc: 'Questions de cours & repères', icon: BookOpen },
        { id: 'dissertation', label: 'Composition', desc: 'Plan chrono/thématique & faits précis', icon: ScrollText },
        { id: 'etude_document', label: 'Étude critique', desc: 'Confrontation des sources & recul critique', icon: FileText },
        { id: 'qcm', label: 'QCM', desc: 'Repères chronologiques & spatiaux', icon: CheckSquare },
      ];
    }
    if (['Anglais (LV1)', 'Espagnol (LV2)', 'Allemand'].includes(discipline)) {
      return [
        { id: 'standard', label: 'Standard', desc: 'Devoir de langue classique', icon: BookOpen },
        { id: 'expression_ecrite', label: 'Essay / Rédaction', desc: 'Richesse lexicale, idiomes & grammaire CECRL', icon: ScrollText },
        { id: 'traduction', label: 'Traduction', desc: 'Version / Thème, faux-amis & fidélité', icon: Languages },
        { id: 'dictee', label: 'Dictée en langue', desc: 'Phonétique & orthographe de la langue', icon: PenTool },
        { id: 'qcm', label: 'QCM', desc: 'Compréhension écrite & grammaire', icon: CheckSquare },
      ];
    }
    if (discipline === 'Sciences Économiques et Sociales (SES)') {
      return [
        { id: 'standard', label: 'Standard', desc: 'Questions & calculs économiques', icon: BookOpen },
        { id: 'dissertation', label: 'Dissertation / Raisonnement', desc: 'Mobilisation des concepts & argumentation', icon: ScrollText },
        { id: 'etude_document', label: 'Étude de documents', desc: 'Analyse de graphiques et données chiffrées', icon: FileText },
        { id: 'qcm', label: 'QCM', desc: 'Notions et définitions', icon: CheckSquare },
      ];
    }
    return [
      { id: 'standard', label: 'Standard', desc: 'Devoir général', icon: BookOpen },
      { id: 'dissertation', label: 'Rédaction / Dissertation', desc: 'Plan structuré et argumentation', icon: ScrollText },
      { id: 'qcm', label: 'QCM', desc: 'Notation par item', icon: CheckSquare },
    ];
  };

  // Smart discipline change handler
  const handleDisciplineChange = (newDiscipline: Discipline) => {
    const isSci = isScientificDiscipline(newDiscipline);
    const isLit = isLiteraryDiscipline(newDiscipline);

    let newAssessmentType: AssessmentType = config.assessmentType || 'standard';

    if (isSci) {
      // For scientific disciplines, switch to scientific system
      if (['dictee', 'dissertation', 'commentaire', 'etude_document', 'expression_ecrite', 'traduction'].includes(newAssessmentType)) {
        newAssessmentType = 'mathematiques';
      }
    } else if (isLit) {
      if (newAssessmentType === 'mathematiques') {
        newAssessmentType = 'standard';
      }
    }

    const updated: AssignmentConfig = {
      ...config,
      discipline: newDiscipline,
      assessmentType: newAssessmentType,
    };

    if (isSci) {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: true,
        rewardEffortAndMethod: true,
        rigorousJustification: true,
        customInstructions:
          'Système scientifique : valoriser les étapes de calcul, la démarche et la formulation des théorèmes. Tolérer les erreurs d\'inattention si le raisonnement est bon.',
      };
    }

    onChange(updated);
  };

  // Helper to change assessment type and specialize guidelines/rubric dynamically
  const selectAssessmentType = (type: AssessmentType) => {
    const updated: AssignmentConfig = { ...config, assessmentType: type };

    if (type === 'dictee') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: false,
        rigorousJustification: false,
        rewardEffortAndMethod: false,
        encourageClarity: true,
        customInstructions:
          'Barème déductif officiel : -1 pt par faute grammaticale (accords, terminaisons), -0.5 pt par faute lexicale, -0.25 pt par ponctuation ou accent.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore')) {
        updated.rubricContent = `TEXTE INTÉGRAL DE LA DICTÉE :
[Saisissez ici le texte de référence dicté aux élèves]

Barème officiel indicatif :
- 20/20 de départ.
- Fautes grammaticales (-1 pt) : accords sujet-verbe, participes passés en -é/-er, pluriels, homophones.
- Fautes d'usage (-0,5 pt) : vocabulaire, consonnes doubles.
- Fautes de ponctuation ou accents (-0,25 pt).`;
      }
    } else if (type === 'dissertation') {
      if (config.discipline === 'Philosophie') {
        updated.pedagogicalGuidelines = {
          ...updated.pedagogicalGuidelines,
          spellingTolerance: false,
          rigorousJustification: true,
          rewardEffortAndMethod: true,
          customInstructions:
            'Évaluer la problématisation du sujet, la confrontation des concepts, la progression dialectique (thèse/antithèse/synthèse) et la mobilisation rigoureuse des auteurs.',
        };
        if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
          updated.rubricContent = `SUJET DE DISSERTATION PHILOSOPHIQUE :
[Exemple : "La liberté consiste-t-elle à faire tout ce qui nous plaît ?"]

Grille d'évaluation :
1. Introduction (4 pts) : Définition des termes, paradoxe, problématisation rigoureuse, annonce de plan.
2. Développement (10 pts) : Thèse (Axe 1), Antithèse / Limites (Axe 2), Dépassement / Synthèse (Axe 3).
3. Conclusion (3 pts) : Réponse nuancée et ouverture.
4. Rigueur conceptuelle et langue (3 pts).`;
        }
      } else if (config.discipline === 'Histoire-Géographie') {
        updated.pedagogicalGuidelines = {
          ...updated.pedagogicalGuidelines,
          spellingTolerance: true,
          rigorousJustification: true,
          rewardEffortAndMethod: true,
          customInstructions:
            'Évaluer la problématisation, la structuration chronologique ou thématique du plan, l\'exactitude des repères et faits historiques/géographiques.',
        };
        if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
          updated.rubricContent = `SUJET DE COMPOSITION :
[Exemple : "L'Europe et le monde au sortir de la Seconde Guerre mondiale (1945-1949)"]

Grille d'évaluation :
1. Introduction (4 pts) : Contexte spatiotemporel, problématisation, plan ordonné.
2. Développement (10 pts) : 2 ou 3 parties étayées par des dates, faits, acteurs et notions précises.
3. Conclusion (3 pts) : Bilan historique et mise en perspective.
4. Précision du vocabulaire disciplinaire (3 pts).`;
        }
      } else {
        updated.pedagogicalGuidelines = {
          ...updated.pedagogicalGuidelines,
          spellingTolerance: false,
          rigorousJustification: true,
          rewardEffortAndMethod: true,
          encourageClarity: true,
          customInstructions:
            'Évaluer la problématisation, la pertinence des citations littéraires, la clarté du plan en 2 ou 3 parties et la qualité du style.',
        };
        if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
          updated.rubricContent = `SUJET DE DISSERTATION :
[Exemple : "La poésie a-t-elle pour seule vocation de célébrer la beauté ?"]

Grille d'évaluation analytique :
1. Introduction (4 pts) : Amorce, définition des termes, problématique, annonce de plan.
2. Développement (8 pts) : Axes équilibrés, transitions fluides, exemples et citations analysés.
3. Conclusion (3 pts) : Synthèse claire et ouverture.
4. Qualité rédactionnelle et style (5 pts).`;
        }
      }
    } else if (type === 'commentaire') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: false,
        rigorousJustification: true,
        rewardEffortAndMethod: true,
        customInstructions:
          'Commentaire / Explication : sanctionner la simple paraphrase, valoriser l\'analyse des procédés stylistiques ou concepts philosophiques et l\'appui direct sur les citations.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
        updated.rubricContent = `TEXTE À ANALYSER & AXES D'ÉTUDE :
[Collez ici le texte ou l'extrait d'œuvre]

Grille d'évaluation :
1. Introduction (4 pts) : Présentation de l'extrait, situation, projet de lecture ou problème philosophique.
2. Analyse linéaire ou thématique (10 pts) : Procédés stylistiques, concepts, interprétation rigoureuse du sens.
3. Conclusion (3 pts) : Bilan esthétique ou philosophique de l'extrait.
4. Qualité de la langue (3 pts).`;
      }
    } else if (type === 'etude_document') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: true,
        rigorousJustification: true,
        rewardEffortAndMethod: true,
        customInstructions:
          'Étude de documents : valoriser la présentation critique des sources, le croisement avec les connaissances du cours et la mise en évidence des limites des documents.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
        updated.rubricContent = `DOCUMENTS DE L'ÉPREUVE :
Doc 1 : [Titre, auteur, date, nature]
Doc 2 : [Titre, auteur, date, nature]

Barème :
1. Présentation contextualisée des documents (4 pts)
2. Analyse et croisement avec le cours (10 pts)
3. Regard critique et limites des documents (4 pts)
4. Rigueur des notions (2 pts)`;
      }
    } else if (type === 'expression_ecrite') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: false,
        rigorousJustification: true,
        rewardEffortAndMethod: true,
        customInstructions:
          'Grille CECRL : évaluer la richesse lexicale, la correction grammaticale (temps, accords, prépositions), les connecteurs logiques et la pertinence du propos.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
        updated.rubricContent = `ESSAY PROMPT / SUJET :
[Exemple : "To what extent can digital technology foster environmental awareness?"]

Grille CECRL :
1. Adéquation au sujet et cohérence argumentative (6 pts)
2. Richesse lexicale et tournures idiomatiques (5 pts)
3. Correction grammaticale et morphosyntaxe (5 pts)
4. Organisation textuelle et connecteurs (4 pts)`;
      }
    } else if (type === 'traduction') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: false,
        rigorousJustification: true,
        rewardEffortAndMethod: false,
        customInstructions:
          'Notation par segment : pénaliser les contresens, faux-sens et omissions, valoriser le naturel et la précision lexicale.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
        updated.rubricContent = `TEXTE SOURCE ET TRADUCTION ATTENDUE :
[Collez ici le texte source et le corrigé modèle segment par segment]

Barème par segment :
- Contresens : -2 pts
- Faux-sens : -1 pt
- Omission : -1 pt
- Maladresse d'expression : -0.5 pt`;
      }
    } else if (type === 'mathematiques') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: true,
        rigorousJustification: true,
        rewardEffortAndMethod: true,
        encourageClarity: true,
        customInstructions:
          'Système scientifique : valoriser les étapes de calcul, la démarche et la formulation des théorèmes. Tolérer les étourderies de calcul si la méthode est correcte.',
      };
    } else if (type === 'qcm') {
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: true,
        rigorousJustification: false,
        rewardEffortAndMethod: false,
        encourageClarity: false,
        customInstructions: 'Attribution binaire des points par question selon la clé de réponse.',
      };
      if (!updated.rubricContent || updated.rubricContent.includes('Pythagore') || updated.rubricContent.includes('DICTÉE')) {
        updated.rubricContent = `CLÉ DE RÉPONSES DU QCM :
Q1 : B
Q2 : C
Q3 : A
Q4 : D
Q5 : B`;
      }
    } else {
      // Standard
      updated.pedagogicalGuidelines = {
        ...updated.pedagogicalGuidelines,
        spellingTolerance: isLiteraryDiscipline(config.discipline) ? false : true,
        rewardEffortAndMethod: true,
      };
    }

    onChange(updated);
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
          aiEngine: config.aiEngine || 'auto',
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

  const handleProposeTitleFromRubric = async () => {
    const imagesToUse = config.rubricImages || (config.rubricImage ? [config.rubricImage] : []);
    const textToUse = config.rubricContent;

    if (imagesToUse.length === 0 && (!textToUse || !textToUse.trim())) {
      setTitleFeedback({
        message: "Veuillez d'abord importer un corrigé (PDF ou image) ou saisir le texte de votre corrigé dans la section ci-dessous.",
        type: 'info',
      });
      const rubricEl = document.getElementById('rubric-section');
      if (rubricEl) {
        rubricEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    setIsAnalyzingRubric(true);
    setTitleFeedback(null);
    try {
      const res = await fetch('/api/analyze-rubric', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rubricImages: imagesToUse,
          rubricContent: textToUse,
          currentTitle: config.title,
          aiEngine: config.aiEngine || 'auto',
        }),
      });

      if (!res.ok) {
        throw new Error("Impossible d'analyser le corrigé");
      }

      const data = await res.json();
      if (data.success && data.analysis?.suggestedTitle) {
        const {
          suggestedTitle,
          suggestedDiscipline,
          suggestedLevel,
          suggestedMaxGrade,
          extractedRubricText,
          summary,
        } = data.analysis;

        const updatedConfig: AssignmentConfig = {
          ...config,
          title: suggestedTitle,
          discipline: (suggestedDiscipline as Discipline) || config.discipline,
          level: (suggestedLevel as SchoolLevel) || config.level,
          maxGrade: Number(suggestedMaxGrade) || config.maxGrade,
          rubricContent: (config.rubricContent && config.rubricContent.trim().length > 10)
            ? config.rubricContent
            : (extractedRubricText || config.rubricContent),
        };

        onChange(updatedConfig);
        setTitleFeedback({
          message: `Titre proposé avec succès : « ${suggestedTitle} »`,
          type: 'success',
        });
        setAiDetectionBanner({
          suggestedTitle,
          suggestedDiscipline,
          suggestedLevel,
          suggestedMaxGrade: Number(suggestedMaxGrade) || 20,
          summary: summary || `Sujet du devoir identifié : ${suggestedTitle}`,
        });
      } else {
        setTitleFeedback({
          message: "Aucun titre spécifique n'a pu être extrait automatiquement. Vous pouvez le saisir librement.",
          type: 'info',
        });
      }
    } catch (err: any) {
      console.warn('Erreur proposition titre:', err);
      setTitleFeedback({
        message: "Impossible d'analyser le corrigé pour le moment. Vous pouvez saisir le titre manuellement.",
        type: 'error',
      });
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

          setTitleFeedback({
            message: "Document de corrigé importé. Saisissez votre titre ci-dessus ou cliquez sur « Proposer un titre depuis le corrigé ».",
            type: 'info',
          });
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

          setTitleFeedback({
            message: "Document de corrigé importé. Saisissez votre titre ci-dessus ou cliquez sur « Proposer un titre depuis le corrigé ».",
            type: 'info',
          });
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
              onChange={(e) => handleDisciplineChange(e.target.value as Discipline)}
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
            <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
              <label htmlFor="assignment-title" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Titre du Devoir ou de l'Épreuve <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={handleProposeTitleFromRubric}
                disabled={isAnalyzingRubric}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-all cursor-pointer disabled:opacity-50 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 shadow-2xs"
                title="L'IA analyse votre corrigé (PDF, image ou texte) pour en extraire et vous proposer le titre officiel"
              >
                {isAnalyzingRubric ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
                ) : (
                  <Wand2 className="w-3.5 h-3.5 text-indigo-600" />
                )}
                <span>Proposer un titre depuis le corrigé</span>
              </button>
            </div>
            <input
              type="text"
              id="assignment-title"
              value={config.title}
              onChange={(e) => {
                setTitleFeedback(null);
                updateField('title', e.target.value);
              }}
              placeholder="Écrivez le titre de votre devoir (ou cliquez sur « Proposer un titre depuis le corrigé »)"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-hidden transition-all"
            />
            {titleFeedback && (
              <div
                className={`text-xs mt-2 px-3 py-2 rounded-lg flex items-center justify-between gap-2 transition-all ${
                  titleFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : titleFeedback.type === 'info'
                    ? 'bg-blue-50 text-blue-800 border border-blue-200'
                    : 'bg-amber-50 text-amber-800 border border-amber-200'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span>{titleFeedback.message}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setTitleFeedback(null)}
                  className="text-slate-400 hover:text-slate-700 font-bold px-1"
                >
                  ✕
                </button>
              </div>
            )}
          </div>

          {/* Max Grade */}
          <div>
            <label htmlFor="max-grade-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Barème Global (Note Maximale) <span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  id="max-grade-input"
                  min={1}
                  max={100}
                  value={config.maxGrade}
                  onChange={(e) => updateField('maxGrade', Math.max(1, Number(e.target.value) || 20))}
                  className="w-24 sm:w-28 px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-sm font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-hidden transition-all"
                />
                <span className="text-sm font-medium text-slate-500">pts</span>
              </div>
              <div className="flex items-center gap-1 sm:ml-auto flex-wrap">
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

        {/* Specialized Assessment Type Selection (Uniquement pour les matières littéraires et sciences humaines) */}
        {!isScientificDiscipline(config.discipline) && (
          <div className="pt-4 border-t border-slate-100 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Type d'épreuve littéraire — {config.discipline} (Spécialise l'IA)</span>
              </label>
              <span className="text-[11px] text-slate-500">
                Adapte instantanément le barème et les critères d'évaluation
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5">
              {getOptionsForDiscipline(config.discipline).map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = (!config.assessmentType && opt.id === 'standard') || config.assessmentType === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => selectAssessmentType(opt.id as AssessmentType)}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/80 shadow-xs ring-1 ring-indigo-500/40 text-indigo-950'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/80 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <IconComponent className={`w-4 h-4 ${isSelected ? 'text-indigo-600' : 'text-slate-400'}`} />
                      {isSelected && <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold leading-tight">{opt.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{opt.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Contextual notification badge explaining what was tuned */}
            {config.assessmentType && config.assessmentType !== 'standard' && (
              <div className={`p-3 rounded-lg border text-xs flex items-start gap-2.5 ${
                config.assessmentType === 'dictee'
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-900'
                  : config.assessmentType === 'dissertation'
                  ? 'bg-purple-50/90 border-purple-200 text-purple-900'
                  : config.assessmentType === 'commentaire'
                  ? 'bg-indigo-50/90 border-indigo-200 text-indigo-900'
                  : config.assessmentType === 'etude_document'
                  ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                  : config.assessmentType === 'expression_ecrite'
                  ? 'bg-sky-50/90 border-sky-200 text-sky-900'
                  : config.assessmentType === 'traduction'
                  ? 'bg-rose-50/90 border-rose-200 text-rose-900'
                  : 'bg-teal-50/90 border-teal-200 text-teal-900'
              }`}>
                <Sparkles className="w-4 h-4 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">
                    {config.assessmentType === 'dictee' && 'Mode Dictée activé : Barème déductif & rigueur orthographique'}
                    {config.assessmentType === 'dissertation' && 'Mode Dissertation / Composition activé : Problématique, plan et argumentation'}
                    {config.assessmentType === 'commentaire' && 'Mode Commentaire / Explication activé : Analyse des procédés et fidélité au texte'}
                    {config.assessmentType === 'etude_document' && 'Mode Étude critique activé : Confrontation des documents et recul critique'}
                    {config.assessmentType === 'expression_ecrite' && 'Mode Expression écrite / Essay activé : Grille CECRL (vocabulaire, syntaxe, connecteurs)'}
                    {config.assessmentType === 'traduction' && 'Mode Traduction activé : Notation segmentée (contresens, faux-sens, omissions)'}
                    {config.assessmentType === 'qcm' && 'Mode QCM activé : Notation par clé de réponses et exactitude'}
                  </p>
                  <p className="text-[11px] leading-relaxed opacity-90">
                    {config.assessmentType === 'dictee' && 'Les consignes pédagogiques ont été configurées en tolérance orthographique stricte (-1 pt grammaire, -0.5 pt lexique, -0.25 pt ponctuation/accent).'}
                    {config.assessmentType === 'dissertation' && 'La grille d\'évaluation intègre l\'introduction problématisée, le plan en 2 ou 3 parties équilibrées, l\'analyse des exemples et la qualité de la langue.'}
                    {config.assessmentType === 'commentaire' && 'La simple paraphrase est sanctionnée, l\'analyse stylistique ou conceptuelle et l\'appui direct sur le texte sont valorisés.'}
                    {config.assessmentType === 'etude_document' && 'L\'IA analyse le croisement entre les documents et les connaissances historiques/géographiques/économiques.'}
                    {config.assessmentType === 'expression_ecrite' && 'L\'évaluation valorise l\'amplitude du vocabulaire, la maîtrise des temps verbaux et la structure du paragraphe.'}
                    {config.assessmentType === 'traduction' && 'L\'évaluation applique les pénalités usuelles par unité de sens (contresens -2, faux-sens -1, omission -1).'}
                    {config.assessmentType === 'qcm' && 'L\'IA compare directement les choix cochés par l\'élève sans pénaliser la syntaxe.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
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
          <div id="rubric-section" className="mt-4 p-5 bg-slate-50 border border-slate-200 rounded-xl space-y-4 scroll-mt-6">
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
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                <label htmlFor="rubric-text-content" className="block text-xs font-semibold text-slate-700">
                  Ou saisissez le corrigé type et les critères en texte :
                  <span className="ml-2 text-[11px] text-slate-400 font-normal italic">
                    (Le contenu grisé ci-dessous est un exemple indicatif en texte fantôme)
                  </span>
                </label>
                <div className="flex items-center gap-2">
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
              </div>
              <textarea
                id="rubric-text-content"
                rows={6}
                value={config.rubricContent}
                onChange={(e) => updateField('rubricContent', e.target.value)}
                placeholder={
                  config.assessmentType === 'dictee'
                    ? `TEXTE DE LA DICTÉE & BARÈME (Exemple indicatif) :
Texte à dicter :
"Les enfants s'élancèrent dans la cour sous les rayons dorés du soleil..."

Barème déductif :
- 20/20 initial.
- Faute d'accord ou grammaticale : -1 pt
- Faute lexicale / mot d'usage : -0.5 pt
- Accent / ponctuation : -0.25 pt`
                    : config.assessmentType === 'dissertation'
                    ? `SUJET & CRITÈRES DE DISSERTATION (Exemple indicatif) :
Sujet : "La littérature permet-elle de transformer le regard que l'on porte sur le monde ?"

Barème analytique :
1. Introduction & Problématique : /4 pts
2. Axe 1 - Thèse et exemples littéraires : /4 pts
3. Axe 2 - Antithèse et mise en perspective : /4 pts
4. Conclusion & ouverture : /3 pts
5. Qualité du style et connecteurs logiques : /5 pts`
                    : config.assessmentType === 'commentaire'
                    ? `TEXTE À COMMENTER & CRITÈRES D'ANALYSE (Exemple indicatif) :
Texte : [Extrait du texte ou poème à commenter]

Axes de correction :
1. Introduction : Présentation de l'auteur, situation du passage, projet de lecture (/4 pts)
2. Axe 1 : Analyse des procédés stylistiques, métaphores et figures (/6 pts)
3. Axe 2 : Portée symbolique ou philosophique de l'extrait (/6 pts)
4. Conclusion & qualité stylistique (/4 pts)`
                    : config.assessmentType === 'etude_document'
                    ? `DOCUMENTS D'HISTOIRE-GÉO / SES & CONSIGNES :
Doc 1 : Discours ou texte source [Auteur, Date, Contexte]
Doc 2 : Carte ou graphique statistique

Barème :
1. Présentation contextualisée des sources (/4 pts)
2. Analyse croisée avec les connaissances du cours (/10 pts)
3. Regard critique et limites des documents (/4 pts)
4. Rigueur du vocabulaire disciplinaire (/2 pts)`
                    : config.assessmentType === 'expression_ecrite'
                    ? `ESSAY PROMPT & GRILLE CECRL (Exemple indicatif) :
Topic: "Some people believe that school uniforms foster equality. Discuss and give your opinion."

Grille d'évaluation CECRL :
1. Respect de la consigne et cohérence des arguments : /6 pts
2. Richesse du vocabulaire et expressions idiomatiques : /5 pts
3. Correction grammaticale (temps, passif, modaux) : /5 pts
4. Articulation logique et fluidité : /4 pts`
                    : config.assessmentType === 'traduction'
                    ? `TEXTE SOURCE ET CORRIGÉ MODÈLE SEGMENT PAR SEGMENT :
Source : "He had never imagined that this discovery would change his life forever..."
Traduction attendue : "Il n'avait jamais imaginé que cette découverte changerait sa vie à tout jamais..."

Barème par segment :
- Contresens grave : -2 pts
- Faux-sens : -1 pt
- Omission : -1 pt
- Maladresse d'expression : -0.5 pt`
                    : config.assessmentType === 'qcm'
                    ? `CLÉ DE RÉPONSE DU QCM :
Q1 : B
Q2 : A
Q3 : C
Q4 : D`
                    : `BARÈME & CORRIGÉ OFFICIEL (Exemple indicatif / texte fantôme) :
Exercice 1 (8 points) - Question 1 (5 pts)
Attendu : Le triangle ABC est rectangle en A. D'après le théorème de Pythagore, BC² = AB² + AC² = 36 + 64 = 100, donc BC = 10 cm. (Formule 2 pts, calcul 2 pts, unité 1 pt)
Question 2 (3 pts)
Attendu : AM / AB = 3 / 6 = 0,5 (ou 1/2 ou 50%).

Exercice 2 (12 points) - Question 1 (7 pts)...`
                }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Info className="w-4 h-4 text-blue-500 shrink-0" />
          <span>Vous pourrez modifier vos copies et ajuster les notes à tout moment.</span>
        </div>

        <button
          onClick={onNext}
          disabled={!canProceed}
          id="btn-step1-next"
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-bold text-sm transition-all shadow-xs cursor-pointer ${
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
