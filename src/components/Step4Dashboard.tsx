import React, { useState, useMemo, useEffect } from 'react';
import { AssignmentConfig, StudentSubmission, ClassMetrics } from '../types';
import {
  BarChart3,
  Users,
  Award,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  Search,
  Filter,
  Eye,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowUpDown,
  BookOpen,
  Check,
  BookmarkCheck,
  Bookmark,
  AlertTriangle,
  ArrowRight,
  ArrowLeftRight,
  X,
  RefreshCw,
  ShieldCheck,
  Lock,
  Unlock,
  FileText,
} from 'lucide-react';

interface Step4DashboardProps {
  config: AssignmentConfig;
  submissions: StudentSubmission[];
  onSubmissionsChange: (submissions: StudentSubmission[]) => void;
  onSelectStudent: (submission: StudentSubmission) => void;
  onOpenPrint: () => void;
  onBackToCopies: () => void;
  onSaveToHistory?: (teacherNotes: string, isValidated?: boolean) => void;
  initialTeacherNotes?: string;
  onSwapSubmissions?: (subId1: string, subId2: string, mode?: 'names' | 'all') => void;
  isValidated?: boolean;
  onValidateClassCorrection?: () => void;
}

type FilterType = 'all' | 'struggling' | 'success' | 'pending' | 'needs_review';

export const Step4Dashboard: React.FC<Step4DashboardProps> = ({
  config,
  submissions,
  onSubmissionsChange,
  onSelectStudent,
  onOpenPrint,
  onBackToCopies,
  onSaveToHistory,
  initialTeacherNotes = '',
  onSwapSubmissions,
  isValidated = false,
  onValidateClassCorrection,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<'name' | 'grade_desc' | 'grade_asc'>('grade_desc');
  const [copiedCsvNotice, setCopiedCsvNotice] = useState(false);
  const [teacherNotes, setTeacherNotes] = useState(initialTeacherNotes);
  const [savedBadge, setSavedBadge] = useState(false);
  const [isReviewBannerExpanded, setIsReviewBannerExpanded] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [swapStudent1Id, setSwapStudent1Id] = useState<string>('');
  const [swapStudent2Id, setSwapStudent2Id] = useState<string>('');
  const [swapSearch1, setSwapSearch1] = useState('');
  const [swapSearch2, setSwapSearch2] = useState('');
  const [swapMode, setSwapMode] = useState<'names' | 'all'>('names');
  const [swapSuccessMsg, setSwapSuccessMsg] = useState<string | null>(null);
  const [isValidatedState, setIsValidatedState] = useState(isValidated);
  const [isConfirmValidationModalOpen, setIsConfirmValidationModalOpen] = useState(false);

  useEffect(() => {
    setIsValidatedState(isValidated);
  }, [isValidated]);

  // Auto-detect suspected inversions between pairs of submissions
  const detectedInversions = useMemo(() => {
    const pairs: Array<{ sub1: StudentSubmission; sub2: StudentSubmission; reason: string }> = [];
    const handled = new Set<string>();

    for (const s1 of submissions) {
      if (handled.has(s1.id)) continue;
      for (const s2 of submissions) {
        if (s1.id === s2.id || handled.has(s2.id)) continue;

        const name1 = s1.studentName.trim().toLowerCase();
        const name2 = s2.studentName.trim().toLowerCase();
        const file1 = (s1.fileName || '').toLowerCase();
        const file2 = (s2.fileName || '').toLowerCase();
        const app1 = (s1.result?.appreciation || '').toLowerCase();
        const app2 = (s2.result?.appreciation || '').toLowerCase();
        const hw1 = (s1.result?.nom_manuscrit_detecte || '').toLowerCase();
        const hw2 = (s2.result?.nom_manuscrit_detecte || '').toLowerCase();

        const s1MatchesS2 =
          (name2.length >= 2 && file1.includes(name2) && !file1.includes(name1)) ||
          (hw1 && hw1.includes(name2)) ||
          (name2.length >= 3 && app1.includes(name2) && !app1.includes(name1));

        const s2MatchesS1 =
          (name1.length >= 2 && file2.includes(name1) && !file2.includes(name2)) ||
          (hw2 && hw2.includes(name1)) ||
          (name1.length >= 3 && app2.includes(name1) && !app2.includes(name2));

        if (s1MatchesS2 || s2MatchesS1) {
          pairs.push({
            sub1: s1,
            sub2: s2,
            reason: `L'attribution semble inversée entre « ${s1.studentName} » (${s1.fileName}) et « ${s2.studentName} » (${s2.fileName}).`,
          });
          handled.add(s1.id);
          handled.add(s2.id);
          break;
        }
      }
    }
    return pairs;
  }, [submissions]);

  const gradedList = useMemo(
    () => submissions.filter((s) => s.status === 'completed' && s.result),
    [submissions]
  );

  // Submissions flagged for human review or poor legibility
  const needsReviewSubmissions = useMemo(() => {
    return submissions.filter(
      (s) =>
        s.status === 'completed' &&
        s.result &&
        (s.result.verification_humaine_recommandee ||
          s.result.lisibilite === 'faible' ||
          s.result.lisibilite === 'illisible' ||
          s.result.lisibilite === 'moyenne' ||
          Boolean(s.result.avertissement_lisibilite))
    );
  }, [submissions]);

  const needsReviewCount = needsReviewSubmissions.length;

  const handleShowReviewCopies = () => {
    setIsReviewBannerExpanded(true);
    setFilterType('needs_review');
    setSearchQuery('');
    setTimeout(() => {
      const el = document.getElementById('student-cards-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  // Common errors analysis
  const commonErrors = useMemo(() => {
    const errorCounts: Record<string, number> = {};
    gradedList.forEach((sub) => {
      if (sub.result?.points_ameliorer) {
        sub.result.points_ameliorer.forEach((pt) => {
          const clean = pt.trim();
          if (clean) {
            errorCounts[clean] = (errorCounts[clean] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(errorCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [gradedList]);

  const handleSaveToHistory = () => {
    if (onSaveToHistory) {
      onSaveToHistory(teacherNotes);
      setSavedBadge(true);
      setTimeout(() => setSavedBadge(false), 3000);
    }
  };

  // Calculate metrics
  const metrics: ClassMetrics = useMemo(() => {
    if (gradedList.length === 0) {
      return {
        totalStudents: submissions.length,
        gradedStudents: 0,
        averageGrade: 0,
        medianGrade: 0,
        highestGrade: 0,
        lowestGrade: 0,
        successRate: 0,
      };
    }

    const grades = gradedList.map((s) => s.result!.note).sort((a, b) => a - b);
    const sum = grades.reduce((acc, g) => acc + g, 0);
    const avg = sum / grades.length;
    const mid = Math.floor(grades.length / 2);
    const median = grades.length % 2 !== 0 ? grades[mid] : (grades[mid - 1] + grades[mid]) / 2;
    const passingThreshold = config.maxGrade * 0.5;
    const passingCount = grades.filter((g) => g >= passingThreshold).length;

    return {
      totalStudents: submissions.length,
      gradedStudents: gradedList.length,
      averageGrade: Number(avg.toFixed(2)),
      medianGrade: Number(median.toFixed(2)),
      highestGrade: grades[grades.length - 1],
      lowestGrade: grades[0],
      successRate: Math.round((passingCount / grades.length) * 100),
    };
  }, [submissions, gradedList, config.maxGrade]);

  // Grade Distribution Bins (scaled to maxGrade)
  const distributionBins = useMemo(() => {
    const scale = config.maxGrade / 20; // default 20
    const binDefs = [
      { label: `0 - ${(5 * scale).toFixed(0)}`, min: 0, max: 5 * scale, color: 'bg-rose-500' },
      { label: `${(5 * scale).toFixed(0)} - ${(10 * scale).toFixed(0)}`, min: 5 * scale, max: 10 * scale, color: 'bg-amber-500' },
      { label: `${(10 * scale).toFixed(0)} - ${(14 * scale).toFixed(0)}`, min: 10 * scale, max: 14 * scale, color: 'bg-blue-500' },
      { label: `${(14 * scale).toFixed(0)} - ${(17 * scale).toFixed(0)}`, min: 14 * scale, max: 17 * scale, color: 'bg-indigo-500' },
      { label: `${(17 * scale).toFixed(0)} - ${config.maxGrade}`, min: 17 * scale, max: config.maxGrade + 0.1, color: 'bg-emerald-500' },
    ];

    const counts = binDefs.map((b) => {
      const c = gradedList.filter((s) => s.result!.note >= b.min && s.result!.note < b.max).length;
      return { ...b, count: c };
    });

    const maxCount = Math.max(...counts.map((b) => b.count), 1);
    return counts.map((b) => ({
      ...b,
      percent: Math.round((b.count / maxCount) * 100),
    }));
  }, [gradedList, config.maxGrade]);

  // Overall Competences Distribution
  const competenceSummary = useMemo(() => {
    let acquis = 0;
    let enCours = 0;
    let nonAcquis = 0;

    gradedList.forEach((sub) => {
      sub.result?.competences?.forEach((c) => {
        if (c.statut === 'Acquis') acquis++;
        else if (c.statut === 'En cours') enCours++;
        else nonAcquis++;
      });
    });

    const total = acquis + enCours + nonAcquis || 1;
    return {
      acquis,
      enCours,
      nonAcquis,
      pctAcquis: Math.round((acquis / total) * 100),
      pctEnCours: Math.round((enCours / total) * 100),
      pctNonAcquis: Math.round((nonAcquis / total) * 100),
    };
  }, [gradedList]);

  // Filter and sort students
  const filteredSubmissions = useMemo(() => {
    const passingThreshold = config.maxGrade * 0.5;
    const highThreshold = config.maxGrade * 0.7;

    return submissions
      .filter((s) => {
        const matchesSearch = s.studentName.toLowerCase().includes(searchQuery.toLowerCase());
        if (!matchesSearch) return false;

        if (filterType === 'struggling') {
          return s.status === 'completed' && s.result && s.result.note < passingThreshold;
        }
        if (filterType === 'success') {
          return s.status === 'completed' && s.result && s.result.note >= highThreshold;
        }
        if (filterType === 'needs_review') {
          return (
            s.status === 'completed' &&
            s.result &&
            (s.result.verification_humaine_recommandee ||
              s.result.lisibilite === 'faible' ||
              s.result.lisibilite === 'illisible' ||
              s.result.lisibilite === 'moyenne' ||
              Boolean(s.result.avertissement_lisibilite))
          );
        }
        if (filterType === 'pending') {
          return s.status !== 'completed';
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'name') {
          return a.studentName.localeCompare(b.studentName);
        }
        const noteA = a.result?.note ?? -1;
        const noteB = b.result?.note ?? -1;
        return sortBy === 'grade_desc' ? noteB - noteA : noteA - noteB;
      });
  }, [submissions, searchQuery, filterType, sortBy, config.maxGrade]);

  // Export CSV for Pronote / ÉcoleDirecte
  const exportCsv = () => {
    const headers = [
      'Nom Élève',
      'Note',
      'Barème',
      'Lisibilité',
      'Contrôle Recommandé',
      'Appréciation Générale',
      'Points Forts',
      'Axes de Progrès',
    ];
    const rows = gradedList.map((s) => {
      const res = s.result!;
      return [
        `"${s.studentName.replace(/"/g, '""')}"`,
        res.note,
        res.note_sur,
        `"${res.lisibilite || 'bonne'}"`,
        `"${res.verification_humaine_recommandee ? 'Oui (vérifier copie)' : 'Non'}"`,
        `"${res.appreciation.replace(/"/g, '""')}"`,
        `"${res.points_forts.join(' ; ').replace(/"/g, '""')}"`,
        `"${res.points_ameliorer.join(' ; ').replace(/"/g, '""')}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Praxis_Notes_${config.title.replace(/[^a-zA-Z0-9]/g, '_')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setCopiedCsvNotice(true);
    setTimeout(() => setCopiedCsvNotice(false), 2500);
  };

  const handleSaveEvaluation = () => {
    onSaveToHistory?.(teacherNotes, isValidatedState);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3000);
  };

  const handleConfirmValidation = () => {
    setIsValidatedState(true);
    setIsConfirmValidationModalOpen(false);
    onValidateClassCorrection?.();
    onSaveToHistory?.(teacherNotes, true);
    setSavedBadge(true);
    setTimeout(() => setSavedBadge(false), 3500);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Banner with Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            Étape 4 : Tableau de bord de classe & Restitution
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {config.title}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {config.discipline} • {config.level} • {gradedList.length} sur {submissions.length} copies évaluées
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Valider la correction de la classe Button */}
          <button
            type="button"
            onClick={() => {
              if (isValidatedState) {
                setIsValidatedState(false);
              } else {
                setIsConfirmValidationModalOpen(true);
              }
            }}
            id="btn-validate-class-correction"
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-xs ${
              isValidatedState
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 ring-2 ring-emerald-500/20 hover:scale-[1.02]'
            }`}
            title="Confirmer définitivement les notes et les archiver automatiquement dans l'historique global"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>{isValidatedState ? '✓ Correction validée' : 'Valider la correction de la classe'}</span>
          </button>

          {onSaveToHistory && (
            <button
              type="button"
              onClick={handleSaveEvaluation}
              id="btn-save-history"
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs ${
                savedBadge
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200'
              }`}
              title="Conserver cette évaluation dans l'onglet Historique pour le suivi des élèves"
            >
              {savedBadge ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
              <span>{savedBadge ? '✓ Enregistré !' : 'Sauvegarder dans l\'historique'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={exportCsv}
            id="btn-export-csv"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            title="Exporter pour Pronote ou ÉcoleDirecte"
          >
            {copiedCsvNotice ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4 text-slate-600" />}
            <span>{copiedCsvNotice ? 'CSV téléchargé !' : 'Export CSV / Pronote'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenPrint}
            id="btn-open-print-sheets"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer les fiches élèves</span>
          </button>

          {onSwapSubmissions && submissions.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSwapStudent1Id(submissions[0]?.id || '');
                setSwapStudent2Id(submissions[1]?.id || '');
                setIsSwapModalOpen(true);
              }}
              id="btn-open-swap-modal"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
              title="Intervertir deux copies si des noms ont été intervertis"
            >
              <ArrowLeftRight className="w-4 h-4 text-amber-700" />
              <span>Intervertir deux copies</span>
            </button>
          )}
        </div>
      </div>

      {/* Validated Class Status Banner */}
      {isValidatedState && (
        <div className="p-4 bg-emerald-50 border-2 border-emerald-300 rounded-2xl text-emerald-950 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-extrabold text-emerald-900 text-sm flex items-center gap-2">
                <span>Correction de la classe validée & archivée définitivement</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-black uppercase">
                  Verrouillée
                </span>
              </div>
              <p className="text-emerald-800 text-xs mt-0.5">
                Les notes ont été scellées et automatiquement archivées dans votre historique global pour éviter toute modification accidentelle.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsValidatedState(false)}
            className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 text-xs font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 shadow-2xs"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-700" />
            <span>Déverrouiller pour ajuster</span>
          </button>
        </div>
      )}

      {/* Success banner after swap */}
      {swapSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{swapSuccessMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSwapSuccessMsg(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Automated Inversion Alerts Banner */}
      {detectedInversions.length > 0 && (
        <div className="space-y-3">
          {detectedInversions.map(({ sub1, sub2, reason }, idx) => (
            <div
              key={idx}
              className="bg-indigo-50 border-2 border-indigo-300 rounded-2xl p-4 sm:p-5 text-indigo-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <div className="p-2 bg-indigo-100 rounded-xl text-indigo-700 shrink-0 mt-0.5">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2">
                    <span>Inversion de copies détectée</span>
                    <span className="px-2 py-0.5 rounded-full bg-indigo-200 text-indigo-900 text-[10px] font-extrabold uppercase">
                      Action recommandée
                    </span>
                  </h4>
                  <p className="text-xs text-indigo-800 mt-1">
                    {reason} (Le nom sur la copie ou l'appréciation semble appartenir à l'autre élève).
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onSwapSubmissions) {
                    onSwapSubmissions(sub1.id, sub2.id, 'names');
                    setSwapSuccessMsg(`Copies réalignées : « ${sub1.studentName} » et « ${sub2.studentName} » ont été intervertis avec succès.`);
                    setTimeout(() => setSwapSuccessMsg(null), 4000);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs shrink-0"
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Intervertir {sub1.studentName} et {sub2.studentName}</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Alert banner if any copy needs teacher review due to legibility */}
      {needsReviewCount > 0 && (
        <div
          id="banner-needs-review"
          className="bg-amber-50 border border-amber-300 rounded-2xl p-4 sm:p-5 text-amber-950 space-y-4 shadow-xs"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 rounded-xl shrink-0 text-amber-700">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-900 flex items-center gap-2">
                  <span>{needsReviewCount} copie{needsReviewCount > 1 ? 's' : ''} signalée{needsReviewCount > 1 ? 's' : ''} pour relecture humaine</span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-extrabold uppercase">
                    Lisibilité délicate
                  </span>
                </h4>
                <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                  L'IA a éprouvé des difficultés à déchiffrer certains passages manuscrits ou calculs. Ne vous fiez pas à 100% à cette correction automatique et contrôlez directement la copie originale.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleShowReviewCopies}
                id="btn-show-review-copies"
                className="px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <span>Afficher ces {needsReviewCount} copie{needsReviewCount > 1 ? 's' : ''}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsReviewBannerExpanded(!isReviewBannerExpanded)}
                className="px-2.5 py-2 rounded-xl border border-amber-300 bg-amber-100/70 hover:bg-amber-100 text-amber-900 text-xs font-semibold cursor-pointer transition-colors"
                title={isReviewBannerExpanded ? 'Réduire' : 'Aperçu'}
              >
                {isReviewBannerExpanded ? 'Réduire' : 'Aperçu direct'}
              </button>
            </div>
          </div>

          {/* Direct interactive preview cards of flagged copies */}
          {isReviewBannerExpanded && needsReviewSubmissions.length > 0 && (
            <div className="pt-3 border-t border-amber-200/80 grid grid-cols-1 sm:grid-cols-3 gap-3 animate-in fade-in">
              {needsReviewSubmissions.map((sub) => (
                <div
                  key={sub.id}
                  className="bg-white/95 rounded-xl border border-amber-200 p-3 flex flex-col justify-between gap-2 shadow-2xs hover:shadow-xs transition-shadow"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      {sub.pageImages && sub.pageImages[0] ? (
                        <img
                          src={sub.pageImages[0]}
                          alt={sub.studentName}
                          className="w-8 h-8 rounded-lg object-cover border border-amber-200 shrink-0"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center text-xs shrink-0">
                          {sub.studentName.charAt(0)}
                        </div>
                      )}
                      <span className="font-bold text-xs text-slate-900 truncate">
                        {sub.studentName}
                      </span>
                    </div>
                    {sub.result?.note_globale !== undefined && (
                      <span className="text-xs font-extrabold text-amber-700 shrink-0">
                        {sub.result.note_globale}/{config.maxGrade}
                      </span>
                    )}
                  </div>
                  {sub.result?.avertissement_lisibilite && (
                    <p className="text-[11px] text-amber-800 line-clamp-1 italic">
                      "{sub.result.avertissement_lisibilite}"
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectStudent(sub)}
                    className="w-full py-1.5 px-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    <span>Examiner la copie</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Moyenne */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Moyenne de classe
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-slate-900">{metrics.averageGrade}</span>
            <span className="text-sm font-semibold text-slate-400">/ {config.maxGrade}</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
            <span>Médiane : {metrics.medianGrade} / {config.maxGrade}</span>
          </div>
        </div>

        {/* Taux de réussite */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
            Taux de réussite
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-blue-600">{metrics.successRate}%</span>
            <span className="text-xs text-slate-400">≥ {config.maxGrade / 2} pts</span>
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 pt-1">
            <span>{metrics.gradedStudents} copies comptabilisées</span>
          </div>
        </div>

        {/* Note la plus haute */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
            Note la plus haute
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-emerald-700">{metrics.highestGrade}</span>
            <span className="text-sm font-semibold text-slate-400">/ {config.maxGrade}</span>
          </div>
          <div className="text-[11px] text-emerald-600/80 pt-1 font-medium">
            Meilleure copie de la série
          </div>
        </div>

        {/* Note la plus basse */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5 text-amber-600" />
            Note la plus basse
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-black text-amber-700">{metrics.lowestGrade}</span>
            <span className="text-sm font-semibold text-slate-400">/ {config.maxGrade}</span>
          </div>
          <div className="text-[11px] text-amber-600/80 pt-1 font-medium">
            Élève à accompagner en priorité
          </div>
        </div>
      </div>

      {/* Visual Analytics Row: Histogram + Competences Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Distribution Histogram */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Distribution des notes de la classe
              </h2>
              <p className="text-xs text-slate-500">Répartition par tranche de points</p>
            </div>
            <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
              Effectif : {gradedList.length}
            </span>
          </div>

          <div className="grid grid-cols-5 gap-3 pt-4 h-48 items-end">
            {distributionBins.map((bin, idx) => (
              <div key={idx} className="flex flex-col items-center justify-end h-full group">
                <span className="text-xs font-bold text-slate-700 mb-1 opacity-90">
                  {bin.count} {bin.count > 1 ? 'élèves' : 'élève'}
                </span>
                <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-32">
                  <div
                    className={`w-full ${bin.color} rounded-t-lg transition-all duration-500 group-hover:opacity-90`}
                    style={{ height: `${Math.max(8, bin.percent)}%` }}
                  />
                </div>
                <span className="text-[11px] font-semibold text-slate-600 mt-2 text-center">
                  {bin.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Competence Breakdown */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4 flex flex-col justify-between">
          <div>
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
                Maîtrise des compétences
              </h2>
              <p className="text-xs text-slate-500">Bilan global du socle</p>
            </div>

            <div className="space-y-4 pt-4">
              {/* Acquis */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-emerald-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    Acquis ({competenceSummary.acquis})
                  </span>
                  <span className="text-slate-600">{competenceSummary.pctAcquis}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${competenceSummary.pctAcquis}%` }} />
                </div>
              </div>

              {/* En cours */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-amber-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    En cours d'acquisition ({competenceSummary.enCours})
                  </span>
                  <span className="text-slate-600">{competenceSummary.pctEnCours}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-amber-500 h-full rounded-full" style={{ width: `${competenceSummary.pctEnCours}%` }} />
                </div>
              </div>

              {/* Non acquis */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold mb-1">
                  <span className="text-rose-700 flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Non acquis ({competenceSummary.nonAcquis})
                  </span>
                  <span className="text-slate-600">{competenceSummary.pctNonAcquis}%</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${competenceSummary.pctNonAcquis}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-xs text-blue-900 leading-snug">
            💡 <strong>Conseil pédagogique :</strong> Cliquez sur n'importe quel élève pour réajuster ses points et imprimer sa fiche bilan.
          </div>
        </div>
      </div>

      {/* Common Errors & Teacher Observations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Common errors */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Analyse des erreurs communes de la classe</span>
            </h3>
            <span className="text-[11px] font-semibold text-slate-400">Régularités détectées</span>
          </div>

          {commonErrors.length > 0 ? (
            <div className="space-y-2 pt-1">
              {commonErrors.map(([errorText, count], eidx) => (
                <div
                  key={eidx}
                  className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                >
                  <div className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-800 font-extrabold flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                      {eidx + 1}
                    </span>
                    <span className="text-slate-700 font-medium leading-relaxed">{errorText}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/60 shrink-0">
                    {count} {count > 1 ? 'copies' : 'copie'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic py-4 text-center">
              Toutes les copies ne sont pas encore analysées ou aucune erreur récurrente n'a été isolée.
            </p>
          )}
        </div>

        {/* Teacher Observations & Notes */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between space-y-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-extrabold text-sm text-slate-900 flex items-center gap-2">
                <span>✍️ Remarques et observations de l'enseignant</span>
              </h3>
              {savedBadge && (
                <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 animate-in fade-in">
                  ✓ Pris en compte
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mb-2">
              Ajoutez vos constats généraux pour la séance de remédiation ou le conseil de classe.
            </p>
            <textarea
              rows={4}
              value={teacherNotes}
              onChange={(e) => setTeacherNotes(e.target.value)}
              placeholder="Ex : Exercice 2 bien réussi dans l'ensemble. Revoir la justification du théorème en demi-groupe jeudi prochain..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none leading-relaxed"
            />
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-100">
            <span className="text-[11px] text-slate-400">
              {teacherNotes.length > 0 ? `${teacherNotes.length} caractères` : 'Optionnel'}
            </span>
            {onSaveToHistory && (
              <button
                type="button"
                onClick={handleSaveToHistory}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-xs"
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>Sauvegarder dans l'historique</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Student Cards Section with Filters */}
      <div id="student-cards-section" className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden scroll-mt-6">
        {/* Search and Filters Bar */}
        <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'all'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              Tous ({submissions.length})
            </button>

            {needsReviewCount > 0 && (
              <button
                type="button"
                onClick={() => setFilterType('needs_review')}
                id="filter-needs-review"
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
                  filterType === 'needs_review'
                    ? 'bg-amber-600 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                <span>À vérifier ({needsReviewCount})</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setFilterType('struggling')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'struggling'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-white text-amber-800 hover:bg-amber-50 border border-slate-200'
              }`}
            >
              À encourager (&lt; 10/20)
            </button>

            <button
              type="button"
              onClick={() => setFilterType('success')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                filterType === 'success'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-white text-emerald-800 hover:bg-emerald-50 border border-slate-200'
              }`}
            >
              Bien réussi (≥ 14/20)
            </button>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-60">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un élève..."
                className="w-full pl-9 pr-3.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-hidden"
              />
            </div>

            {/* Sort selection */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:ring-2 focus:ring-blue-500 outline-hidden"
            >
              <option value="grade_desc">Notes décroissantes</option>
              <option value="grade_asc">Notes croissantes</option>
              <option value="name">Nom alphabétique</option>
            </select>
          </div>
        </div>

        {/* Student Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSubmissions.map((sub) => {
            const res = sub.result;
            const isCompleted = sub.status === 'completed' && res;

            return (
              <div
                key={sub.id}
                onClick={() => isCompleted && onSelectStudent(sub)}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-white border-slate-200 hover:border-blue-400 hover:shadow-md cursor-pointer group'
                    : 'bg-slate-50 border-slate-200 opacity-80'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center">
                        <img
                          src={sub.imageDataUrl}
                          alt={sub.studentName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-blue-600 transition-colors">
                            {sub.studentName}
                          </h3>
                          {onSwapSubmissions && submissions.length > 1 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSwapStudent1Id(sub.id);
                                const other = submissions.find((s) => s.id !== sub.id);
                                if (other) setSwapStudent2Id(other.id);
                                setIsSwapModalOpen(true);
                              }}
                              className="p-1 rounded-md text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors"
                              title={`Intervertir cette copie avec un autre élève`}
                            >
                              <ArrowLeftRight className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-500 font-medium truncate block max-w-[180px]" title={sub.fileName}>
                          {sub.fileName} {sub.allPages && sub.allPages.length > 1 ? `(${sub.allPages.length} p.)` : '(1 p.)'}
                        </span>
                        {res?.nom_manuscrit_detecte && (
                          <span
                            className="inline-flex items-center gap-0.5 text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded-md mt-0.5"
                            title={`Prénom ou nom manuscrit repéré sur la copie papier : ${res.nom_manuscrit_detecte}`}
                          >
                            <span>✍️ En marge : {res.nom_manuscrit_detecte}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {isCompleted ? (
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900">
                          {res.note}{' '}
                          <span className="text-xs font-medium text-slate-400">
                            /{res.note_sur}
                          </span>
                        </div>
                        {res.manuallyAdjusted && (
                          <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider block">
                            Modifiée
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-200 text-slate-600">
                        En attente
                      </span>
                    )}
                  </div>

                  {/* Legibility Warning Badge if human verification recommended */}
                  {isCompleted &&
                    (res.verification_humaine_recommandee ||
                      res.lisibilite === 'faible' ||
                      res.lisibilite === 'illisible' ||
                      res.lisibilite === 'moyenne' ||
                      Boolean(res.avertissement_lisibilite)) && (
                      <div className="mt-2.5 p-2 rounded-lg bg-amber-50 border border-amber-300 text-amber-950 text-[11px] flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="leading-tight">
                          <span className="font-bold text-amber-900">
                            Relecture recommandée ({res.lisibilite || 'délicate'})
                          </span>
                          <p className="text-[10px] text-amber-800 line-clamp-1 mt-0.5 font-medium">
                            {res.avertissement_lisibilite || "L'IA a eu des doutes de déchiffrage."}
                          </p>
                        </div>
                      </div>
                    )}

                  {/* Appreciation & Trace Full Display */}
                  {isCompleted && (
                    <div className="mt-3 space-y-2">
                      <div className="text-xs text-slate-700 italic bg-slate-50/80 p-2.5 rounded-lg border border-slate-100 leading-relaxed">
                        <span className="font-semibold text-slate-800 not-italic block text-[11px] mb-0.5">Appréciation :</span>
                        <span>"{res.appreciation}"</span>
                      </div>

                      {res.texte_transcrit_resume && (
                        <div className="p-2 rounded-lg bg-amber-50/70 border border-amber-200/80 text-[11px] text-amber-950 font-mono leading-relaxed">
                          <span className="font-bold text-[10px] uppercase tracking-wider text-amber-900 block mb-0.5 flex items-center gap-1">
                            <FileText className="w-3 h-3 text-amber-700" />
                            Trace manuscrite déchiffrée :
                          </span>
                          <span className="whitespace-pre-wrap">{res.texte_transcrit_resume}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Skills Mini Badges */}
                  {isCompleted && res.competences && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {res.competences.slice(0, 3).map((comp, cidx) => (
                        <span
                          key={cidx}
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            comp.statut === 'Acquis'
                              ? 'bg-emerald-50 text-emerald-700'
                              : comp.statut === 'En cours'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-rose-50 text-rose-700'
                          }`}
                        >
                          {comp.nom.slice(0, 16)}... : {comp.statut}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                  <span className="text-[11px] font-medium text-blue-600 group-hover:underline flex items-center gap-1">
                    <Eye className="w-3.5 h-3.5" />
                    Inspecter la copie & ajuster
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {res?.questions?.length || 0} questions
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Quick Swap Modal with Searchable and Fully Scrollable Lists */}
      {isSwapModalOpen && onSwapSubmissions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4 animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                  <ArrowLeftRight className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Intervertir deux copies
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sélectionnez les deux élèves dont les copies doivent être échangées.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1">
              {/* Student 1 Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  1. Première copie (sélectionnée : {submissions.find(s => s.id === swapStudent1Id)?.studentName || 'Aucune'})
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom ou fichier..."
                    value={swapSearch1}
                    onChange={(e) => setSwapSearch1(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {submissions
                    .filter((s) => {
                      if (!swapSearch1.trim()) return true;
                      const q = swapSearch1.toLowerCase();
                      return s.studentName.toLowerCase().includes(q) || (s.fileName || '').toLowerCase().includes(q);
                    })
                    .map((s) => {
                      const isSelected = s.id === swapStudent1Id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSwapStudent1Id(s.id)}
                          className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                            isSelected ? 'bg-blue-50 text-blue-900 border border-blue-300 font-bold' : 'hover:bg-white text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate font-semibold">{s.studentName}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {s.fileName} {s.result ? `• ${s.result.note}/${s.result.note_sur}` : ''}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              <div className="flex items-center justify-center">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 shadow-2xs">
                  <ArrowUpDown className="w-4 h-4" />
                </div>
              </div>

              {/* Student 2 Picker */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  2. Deuxième copie à échanger (sélectionnée : {submissions.find(s => s.id === swapStudent2Id)?.studentName || 'Aucune'})
                </label>
                <div className="relative mb-2">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Filtrer par nom ou fichier..."
                    value={swapSearch2}
                    onChange={(e) => setSwapSearch2(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-hidden focus:bg-white focus:ring-1 focus:ring-blue-500"
                  />
                </div>
                <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl divide-y divide-slate-100 bg-slate-50/50 p-1">
                  {submissions
                    .filter((s) => s.id !== swapStudent1Id)
                    .filter((s) => {
                      if (!swapSearch2.trim()) return true;
                      const q = swapSearch2.toLowerCase();
                      return s.studentName.toLowerCase().includes(q) || (s.fileName || '').toLowerCase().includes(q);
                    })
                    .map((s) => {
                      const isSelected = s.id === swapStudent2Id;
                      return (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSwapStudent2Id(s.id)}
                          className={`w-full text-left p-2 rounded-lg flex items-center justify-between gap-2 transition-colors cursor-pointer text-xs ${
                            isSelected ? 'bg-amber-50 text-amber-900 border border-amber-300 font-bold' : 'hover:bg-white text-slate-800'
                          }`}
                        >
                          <div className="truncate">
                            <span className="block truncate font-semibold">{s.studentName}</span>
                            <span className="text-[10px] text-slate-400 block truncate">
                              {s.fileName} {s.result ? `• ${s.result.note}/${s.result.note_sur}` : ''}
                            </span>
                          </div>
                          {isSelected && <Check className="w-4 h-4 text-amber-600 shrink-0" />}
                        </button>
                      );
                    })}
                </div>
              </div>

              {/* Mode choice */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="font-semibold text-slate-800">Mode d'interversion :</div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="swapMode"
                    value="names"
                    checked={swapMode === 'names'}
                    onChange={() => setSwapMode('names')}
                    className="text-blue-600"
                  />
                  <span className="text-slate-700">
                    <strong>Échanger les noms d'élèves</strong> (recommandé : chaque copie conserve sa correction et sa note, mais change de destinataire)
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="swapMode"
                    value="all"
                    checked={swapMode === 'all'}
                    onChange={() => setSwapMode('all')}
                    className="text-blue-600"
                  />
                  <span className="text-slate-700">
                    <strong>Échanger les fichiers et notes</strong> (conserve les noms d'élèves à leur place, échange leurs copies)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsSwapModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                disabled={!swapStudent1Id || !swapStudent2Id || swapStudent1Id === swapStudent2Id}
                onClick={() => {
                  if (swapStudent1Id && swapStudent2Id && swapStudent1Id !== swapStudent2Id) {
                    onSwapSubmissions(swapStudent1Id, swapStudent2Id, swapMode);
                    setIsSwapModalOpen(false);
                    const s1 = submissions.find((s) => s.id === swapStudent1Id);
                    const s2 = submissions.find((s) => s.id === swapStudent2Id);
                    setSwapSuccessMsg(`Copies de « ${s1?.studentName} » et « ${s2?.studentName} » interverties avec succès !`);
                    setTimeout(() => setSwapSuccessMsg(null), 4000);
                  }
                }}
                className={`px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                  swapStudent1Id && swapStudent2Id && swapStudent1Id !== swapStudent2Id
                    ? 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <ArrowLeftRight className="w-3.5 h-3.5" />
                <span>Intervertir maintenant</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmation de la validation de la correction de la classe */}
      {isConfirmValidationModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 text-emerald-700 rounded-xl shrink-0">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  Valider la correction de la classe ?
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {config.title} ({config.discipline} • {config.level})
                </p>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs text-slate-700 space-y-2">
              <p className="leading-relaxed">
                Cette validation certifie l'exactitude des notes pour l'ensemble des <strong>{submissions.length} élèves</strong> après votre relecture.
              </p>
              <ul className="space-y-1 text-slate-600 font-medium">
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Verrouillage des notes pour éviter toute modification accidentelle.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Archivage automatique dans l'historique global de l'application.</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Export Pronote/CSV et fiches élèves prêts à distribuer.</span>
                </li>
              </ul>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmValidationModalOpen(false)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmValidation}
                id="btn-confirm-validation"
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Confirmer et archiver la classe</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
