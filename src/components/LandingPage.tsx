import React, { useState } from 'react';
import {
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  BookOpen,
  FileCheck,
  Users,
  Award,
  ChevronRight,
  Check,
  Star,
  Quote,
  Eye,
  Calculator,
  PenTool,
  Sliders,
  Download,
  HelpCircle,
  Play,
} from 'lucide-react';
import { FaqView } from './FaqView';

interface LandingPageProps {
  onStartCorrection: () => void;
  onNavigateToView: (view: 'corr' | 'classes' | 'suivi' | 'hist' | 'faq') => void;
}

type DemoDiscipline = 'philo' | 'francais' | 'maths';

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartCorrection,
  onNavigateToView,
}) => {
  const [activeDemo, setActiveDemo] = useState<DemoDiscipline>('philo');

  const demoCases = {
    philo: {
      tag: 'Philosophie · Terminale',
      topic: "Dissertation : « L'État est-il nécessairement l'ennemi de la liberté ? »",
      studentName: 'Emma Rousseau',
      grade: '15.5',
      maxGrade: '20',
      timeSaved: '28s',
      criteria: [
        { label: 'Problématisation & Définitions', score: '3.5 / 4', pct: '88%' },
        { label: 'Rigueur argumentative & Plan dialectique', score: '4 / 4', pct: '100%' },
        { label: 'Mobilisation des auteurs (Spinoza, Hobbes)', score: '4 / 5', pct: '80%' },
        { label: 'Expression & Analyse conceptuelle', score: '4 / 7', pct: '57%' },
      ],
      handwrittenSnippet: `Page 2 - Partie II :
"Si pour Thomas Hobbes dans le Léviathan, l'État impose l'ordre face à l'état de nature où l'homme est un loup pour l'homme, Spinoza démontre que la véritable fin de l'État n'est pas la contrainte mais la liberté."`,
      feedback:
        'Très bonne problématisation. La distinction conceptuelle entre sécurité négative (Hobbes) et liberté positive (Spinoza) est clairement articulée. Veillez toutefois à mieux soigner la transition vers la troisième partie sur la loi républicaine.',
      strengths: ['Citation pertinente du Léviathan', 'Réfutation soignée du contresens sécuritaire'],
      improvements: ['Nuancer l’antithèse avec la notion d’aliénation démocratique'],
    },
    francais: {
      tag: 'Français · 1ère Générale',
      topic: 'Commentaire littéraire : « L’Albatros », Charles Baudelaire',
      studentName: 'Lucas Bernard',
      grade: '14.0',
      maxGrade: '20',
      timeSaved: '22s',
      criteria: [
        { label: 'Compréhension du texte & Axes d’étude', score: '4 / 5', pct: '80%' },
        { label: 'Analyse stylistique (oxymores, registres)', score: '4.5 / 5', pct: '90%' },
        { label: 'Interprétation au service du sens', score: '3 / 5', pct: '60%' },
        { label: 'Qualité de la rédaction & Transitions', score: '2.5 / 5', pct: '50%' },
      ],
      handwrittenSnippet: `Axe II - Le poète déchu :
"L'antithèse entre 'prince des nuées' et 'infirme qui pleure' souligne la condition tragique du créateur poétique, incapable de marcher sur le sol terrestre sans être la risée des matelots."`,
      feedback:
        'Analyse fine et sensible des procédés poétiques. Le repérage de l’antithèse est parfaitement relié au statut d’exil du poète dans la société moderne. Attention à ne pas négliger la conclusion sur la modernité poétique baudelairienne.',
      strengths: ['Justification stylistique précise', 'Vocabulaire littéraire maîtrisé'],
      improvements: ['Développer la portée symbolique du vers final'],
    },
    maths: {
      tag: 'Mathématiques · 3e / 2nde',
      topic: 'Problème de géométrie & Démonstration : Théorème de Thalès et réciproque',
      studentName: 'Sarah Benali',
      grade: '17.5',
      maxGrade: '20',
      timeSaved: '18s',
      criteria: [
        { label: 'Hypothèses & Propriétés citées', score: '4 / 4', pct: '100%' },
        { label: 'Calculs & Résolution algébrique', score: '5 / 5', pct: '100%' },
        { label: 'Démonstration rigoureuse pas-à-pas', score: '4.5 / 5', pct: '90%' },
        { label: 'Précision de l’unité et conclusion', score: '4 / 6', pct: '67%' },
      ],
      handwrittenSnippet: `Question 3 :
"Puisque les droites (AB) et (CD) sont sécantes en O, et que (AC) // (BD), d'après le théorème de Thalès :
OA/OB = OC/OD = AC/BD.
Donc BD = (OB * AC) / OA = (4.5 * 6) / 3 = 9 cm."`,
      feedback:
        'Démonstration exemplaire et très bien rédigée. Toutes les conditions d’application du théorème de Thalès sont rigoureusement posées avant le calcul. Pensez à toujours souligner ou encadrer le résultat final pour la lisibilité.',
      strengths: ['Rédaction géométrique parfaite', 'Calculs intermédiaires détaillés'],
      improvements: ['Encadrer le résultat final avec l’unité'],
    },
  };

  const currentCase = demoCases[activeDemo];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      {/* 1. HERO SECTION */}
      <section className="relative overflow-hidden pt-8 pb-16 lg:pt-14 lg:pb-24 border-b border-slate-200/80 bg-gradient-to-b from-white via-slate-50/70 to-slate-100/50">
        {/* Subtle background ambient mesh */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-gradient-to-tr from-blue-100/40 via-indigo-100/30 to-purple-100/20 rounded-full blur-3xl opacity-70" />
          <div className="absolute top-1/2 -right-40 w-96 h-96 bg-blue-100/30 rounded-full blur-2xl" />
        </div>

        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          {/* Eyebrow badge */}
          <div className="flex justify-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-50 border border-blue-200/80 shadow-xs mb-6 text-xs font-semibold text-blue-800">
              <span className="flex h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
              <span>Conçu pour les enseignants du secondaire et supérieur</span>
              <span className="hidden sm:inline text-blue-400">·</span>
              <span className="hidden sm:inline font-normal text-blue-700">100% Souverain & RGPD</span>
            </div>
          </div>

          {/* Main Headline */}
          <div className="text-center max-w-4xl mx-auto space-y-5">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-950 leading-[1.15]">
              Corrigez un paquet de copies en{' '}
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800 bg-clip-text text-transparent">
                quelques minutes.
              </span>
              <br className="hidden sm:inline" />
              {' '}Pas tout votre week-end.
            </h1>

            <p className="text-base sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
              Photographiez ou scannez n'importe quelle copie manuscrite (dissertation, exercice,
              commentaire ou problème de maths). Obtenez une note précise, des appréciations
              constructives et un export Pronote direct en moins de 30 secondes par copie.
            </p>

            {/* Action CTAs */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4">
              <button
                type="button"
                onClick={onStartCorrection}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all cursor-pointer"
              >
                <Sparkles className="w-5 h-5 text-blue-200" />
                <span>Lancer une correction</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <a
                href="#demo-interactive"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 font-semibold text-base border border-slate-200 shadow-xs hover:border-slate-300 transition-all cursor-pointer"
              >
                <Play className="w-4 h-4 text-slate-500 fill-slate-500" />
                <span>Voir la simulation en direct</span>
              </a>
            </div>

            {/* Trust highlights */}
            <div className="pt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-500 font-medium">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Version Démo Ouverte & Gratuite</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Reconnaissance de l'écriture manuscrite</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Vous gardez 100% du contrôle</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. STATS BAR (Notie AI style impact numbers) */}
      <section className="bg-white border-b border-slate-200/80 py-8 sm:py-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 text-center">
            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-blue-600 tracking-tight">30 sec</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">Par copie manuscrite</div>
              <p className="text-[11px] sm:text-xs text-slate-500">Transcrit, évalué et annoté</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-indigo-600 tracking-tight">+12 h</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">Gagnées chaque semaine</div>
              <p className="text-[11px] sm:text-xs text-slate-500">Fini les dimanches gâchés</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">54+</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">Matières & Niveaux</div>
              <p className="text-[11px] sm:text-xs text-slate-500">Du Collège aux Classes Prépa</p>
            </div>

            <div className="space-y-1">
              <div className="text-3xl sm:text-4xl font-extrabold text-emerald-600 tracking-tight">100%</div>
              <div className="text-xs sm:text-sm font-semibold text-slate-800">Souveraineté Enseignant</div>
              <p className="text-[11px] sm:text-xs text-slate-500">Ajustez chaque note en 1 clic</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE LIVE PRODUCT DEMO (Signature Notie AI Experience) */}
      <section id="demo-interactive" className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6 scroll-mt-16">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Démonstration Interactive
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Voyez comment Praxis analyse une copie manuscrite
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Sélectionnez une discipline pour observer la lecture OCR, l'extraction de citations textuelles
            et la génération de commentaires pédagogiques détaillés.
          </p>

          {/* Discipline selector pills */}
          <div className="inline-flex p-1 bg-slate-200/70 rounded-xl gap-1 text-xs font-bold mt-2">
            <button
              type="button"
              onClick={() => setActiveDemo('philo')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeDemo === 'philo'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              🎓 Philosophie
            </button>
            <button
              type="button"
              onClick={() => setActiveDemo('francais')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeDemo === 'francais'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📚 Français
            </button>
            <button
              type="button"
              onClick={() => setActiveDemo('maths')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer ${
                activeDemo === 'maths'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              📐 Mathématiques
            </button>
          </div>
        </div>

        {/* The Split Screen Simulation Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
          {/* Header bar of the demo card */}
          <div className="px-5 py-3.5 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/30">
                {currentCase.tag}
              </span>
              <span className="text-xs text-slate-300 font-medium truncate max-w-xs sm:max-w-md">
                {currentCase.topic}
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <Zap className="w-3.5 h-3.5" />
                <span>Analysé en {currentCase.timeSaved}</span>
              </span>
            </div>
          </div>

          {/* Split Content: Left = Handwritten student sheet, Right = Praxis AI analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left: Original manuscript paper mockup (5 cols) */}
            <div className="lg:col-span-5 p-5 sm:p-6 bg-amber-50/30 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-amber-200/60 mb-4">
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                      Copie manuscrite élève
                    </span>
                    <span className="text-sm font-bold text-slate-900">{currentCase.studentName}</span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-100 text-amber-900 border border-amber-300">
                    Scan photo OCR
                  </span>
                </div>

                {/* Simulated lined paper with handwriting simulation */}
                <div className="bg-white p-4 rounded-xl border border-amber-200/80 shadow-xs relative overflow-hidden font-serif">
                  {/* Subtle faint notebook lines */}
                  <div className="space-y-3 text-slate-800 text-xs sm:text-sm leading-relaxed italic">
                    <p className="text-[11px] text-slate-400 font-mono not-italic uppercase tracking-wider">
                      Extrait transcrit de la copie :
                    </p>
                    <div className="p-3 bg-amber-50/50 rounded-lg border-l-4 border-amber-400 font-mono text-xs not-italic text-slate-700 whitespace-pre-line">
                      {currentCase.handwrittenSnippet}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-amber-200/40 text-[11px] text-slate-500 flex items-center gap-1.5">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span>Vision multimodale : gère les ratures, écritures cursives et notations marginales.</span>
              </div>
            </div>

            {/* Right: AI evaluation & critériated feedback (7 cols) */}
            <div className="lg:col-span-7 p-5 sm:p-7 bg-white space-y-5">
              {/* Score & Teacher Note header */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200/90">
                <div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                    Évaluation critériée
                  </span>
                  <span className="text-2xl font-extrabold text-blue-700">
                    {currentCase.grade} <span className="text-sm font-semibold text-slate-400">/ {currentCase.maxGrade}</span>
                  </span>
                </div>
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Prêt pour Pronote
                  </span>
                </div>
              </div>

              {/* Criteria bars */}
              <div className="space-y-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
                  Détail par compétences / critères :
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  {currentCase.criteria.map((crit, idx) => (
                    <div key={idx} className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/70 space-y-1">
                      <div className="flex justify-between font-semibold text-slate-700">
                        <span className="truncate">{crit.label}</span>
                        <span className="text-blue-700 shrink-0 ml-1">{crit.score}</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600 rounded-full" style={{ width: crit.pct }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pedagogical comment */}
              <div className="p-3.5 bg-blue-50/50 rounded-xl border border-blue-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                  <Quote className="w-3.5 h-3.5 text-blue-600" />
                  <span>Appréciation personnalisée proposée au professeur :</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed font-normal">
                  "{currentCase.feedback}"
                </p>
              </div>

              {/* Strengths & Improvements */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-900 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Points forts :
                  </span>
                  <ul className="space-y-0.5 text-slate-600 pl-4 list-disc">
                    {currentCase.strengths.map((str, i) => (
                      <li key={i}>{str}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 space-y-1">
                  <span className="font-bold text-amber-900 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-amber-600" /> Axe de progrès prioritaire :
                  </span>
                  <ul className="space-y-0.5 text-slate-600 pl-4 list-disc">
                    {currentCase.improvements.map((imp, i) => (
                      <li key={i}>{imp}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Action buttons on demo */}
              <div className="pt-2 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  * L'enseignant peut ajuster la note ou le commentaire en un clic.
                </span>
                <button
                  type="button"
                  onClick={onStartCorrection}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <span>Tester avec mes propres copies</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW IT WORKS (3 Simple Steps inspired by Notie AI) */}
      <section className="py-16 sm:py-20 bg-slate-100/60 border-y border-slate-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              Processus Pédagogique
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
              Comment ça marche en 3 étapes simples
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Aucune formation technique requise. Une prise en main instantanée pensée pour le quotidien de la classe.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Step 1 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xl flex items-center justify-center border border-blue-100">
                1
              </div>
              <h3 className="text-lg font-bold text-slate-900">Définissez votre sujet & barème</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Renseignez le barème sur 20, ou photographiez simplement votre corrigé manuscrit. Praxis comprend vos attentes et critères d'évaluation.
              </p>
              <div className="pt-2 text-xs font-medium text-blue-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Tolérance orthographique ou barème strict paramétrable
              </div>
            </div>

            {/* Step 2 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 font-extrabold text-xl flex items-center justify-center border border-indigo-100">
                2
              </div>
              <h3 className="text-lg font-bold text-slate-900">Déposez les copies d'élèves</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Prenez en photo les copies avec votre smartphone ou glissez le fichier PDF scanné de la classe entière. L'OCR Vision lit chaque page simultanément.
              </p>
              <div className="pt-2 text-xs font-medium text-indigo-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Copies simples ou copies doubles multi-pages
              </div>
            </div>

            {/* Step 3 */}
            <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs relative space-y-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 font-extrabold text-xl flex items-center justify-center border border-emerald-100">
                3
              </div>
              <h3 className="text-lg font-bold text-slate-900">Validez & Restituez à la classe</h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                Passez en revue les suggestions de notes et d'appréciations. Ajustez en un clic si nécessaire, puis exportez vers Pronote ou imprimez les fiches élèves.
              </p>
              <div className="pt-2 text-xs font-medium text-emerald-600 flex items-center gap-1">
                <Check className="w-3.5 h-3.5" /> Export Excel/Pronote & fiches PDF individuelles
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. BENTO GRID FEATURES (Capabilities inspired by Notie AI) */}
      <section className="py-16 sm:py-24 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Fonctionnalités Clés
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-950 tracking-tight">
            Tout ce dont vous avez besoin pour évaluer sereinement
          </h2>
          <p className="text-sm sm:text-base text-slate-600">
            Une technologie de vision IA avancée spécialement calibrée pour le système scolaire et universitaire.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1: OCR Vision Poussée */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Eye className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Lecture Manuscrite Multi-Pages</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Déchiffre les écritures cursives d'élèves, les ratures, les ajouts en marge et les copies doubles de 4 à 6 pages sans aucune perte de fil directeur.
            </p>
          </div>

          {/* Card 2: Matières Littéraires & Philosophie */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Analyse Littéraire & Philosophique</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Évalue la problématisation, la dialectique du plan, la mobilisation des doctrines et cite directement les phrases de l'élève pour justifier chaque retour.
            </p>
          </div>

          {/* Card 3: Calculs Scientifiques Pas-à-Pas */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Calculator className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Démonstrations Scientifiques</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              En Maths et Physique-Chimie, Praxis vérifie la méthode étape par étape et accorde les points intermédiaires même si le résultat final comporte une faute de calcul.
            </p>
          </div>

          {/* Card 4: Appréciations Constructives */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Quote className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Commentaires Bienveillants & Formateurs</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Finies les appréciations lapidaires. Chaque élève reçoit une explication claire sur ses réussites et un conseil précis pour progresser au prochain devoir.
            </p>
          </div>

          {/* Card 5: Suivi de Classe & Remédiation */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Détection des Lacunes Collectives</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Un tableau de bord identifie instantanément les questions mal réussies par la classe entière, vous permettant d'organiser des séances de remédiation ciblées.
            </p>
          </div>

          {/* Card 6: Export Pronote & ÉcoleDirecte */}
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-3 hover:border-slate-300 transition-colors">
            <div className="w-10 h-10 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Intégration Pronote & ÉcoleDirecte</h3>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Exportez le tableau des notes au format compatible en 1 clic pour remplir votre relevé de notes officiel sans aucune saisie manuelle fastidieuse.
            </p>
          </div>
        </div>
      </section>

      {/* 6. TEACHER TESTIMONIALS (Social Proof) */}
      <section className="py-16 sm:py-20 bg-slate-900 text-white relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 relative">
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800">
              Retours d'Expérience
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Adopté par des professeurs passionnés
            </h2>
            <p className="text-sm sm:text-base text-slate-400">
              Découvrez comment vos collègues ont récupéré leur temps tout en offrant des retours plus riches à leurs élèves.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "J'avais 3 classes de Terminale en Philosophie, soit plus de 90 dissertations à chaque devoir commun. Praxis m'a permis de pré-évaluer le plan dialectique et les références en un temps record. Je garde la main sur la note finale, mais je ne passe plus mes nuits à annoter."
              </p>
              <div className="pt-2 border-t border-slate-700 text-xs">
                <span className="font-bold text-white block">Valérie D.</span>
                <span className="text-slate-400">Professeure agrégée de Philosophie · Lycée public</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "En Mathématiques, la détection des calculs intermédiaires est bluffante. Quand un élève se trompe sur la dernière ligne mais a fait un raisonnement juste, Praxis attribue les points partiels comme je l'aurais fait moi-même."
              </p>
              <div className="pt-2 border-t border-slate-700 text-xs">
                <span className="font-bold text-white block">Thomas B.</span>
                <span className="text-slate-400">Professeur certifié de Mathématiques · Collège</span>
              </div>
            </div>

            <div className="bg-slate-800/80 border border-slate-700/80 p-6 rounded-2xl space-y-4">
              <div className="flex text-amber-400 gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400" />
                ))}
              </div>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                "Les élèves adorent les fiches de restitution imprimées. Au lieu d'un simple '11/20 Bien', ils reçoivent des citations précises de leur copie et des axes d'amélioration. La relation pédagogique est décuplée."
              </p>
              <div className="pt-2 border-t border-slate-700 text-xs">
                <span className="font-bold text-white block">Sarah L.</span>
                <span className="text-slate-400">Professeure de Lettres Modernes · Lycée</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. FAQ SECTION AT THE BOTTOM OF THE HOME PAGE (As requested by user) */}
      <section className="py-16 sm:py-24 max-w-5xl mx-auto px-4 sm:px-6">
        <FaqView onStartCorrection={onStartCorrection} />
      </section>

      {/* 8. FINAL CALL TO ACTION BANNER */}
      <section className="py-14 sm:py-20 bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center space-y-6">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Prêt à transformer vos séances de correction ?
          </h2>
          <p className="text-base sm:text-lg text-blue-100 max-w-2xl mx-auto font-normal leading-relaxed">
            Rejoignez les enseignants qui corrigent plus vite et mieux. Déposez vos premières copies manuscrites dès maintenant.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onStartCorrection}
              className="inline-flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-white hover:bg-slate-100 text-blue-900 font-bold text-base shadow-xl hover:-translate-y-0.5 transition-all cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-blue-600" />
              <span>Commencer à corriger mes copies</span>
              <ArrowRight className="w-4 h-4 text-blue-700" />
            </button>
          </div>
        </div>
      </section>

      {/* 9. FOOTER */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-bold text-slate-800 text-sm">
            <span className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs">
              P
            </span>
            <span>PRAXIS</span>
            <span className="text-slate-400 font-normal text-xs">· Évaluation Pédagogique Intelligente</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs">
            <button
              type="button"
              onClick={onStartCorrection}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Correction
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView('classes')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Classes
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView('suivi')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              Suivi
            </button>
            <button
              type="button"
              onClick={() => onNavigateToView('faq')}
              className="hover:text-blue-600 transition-colors cursor-pointer"
            >
              FAQ
            </button>
            <span className="text-slate-300">|</span>
            <span>Hébergement sécurisé France & UE</span>
            <span>·</span>
            <span>Conforme RGPD</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
