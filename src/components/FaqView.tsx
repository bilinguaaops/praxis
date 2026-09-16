import React, { useState, useMemo } from 'react';
import {
  HelpCircle,
  BookOpen,
  Feather,
  Sparkles,
  Search,
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  Zap,
  ChevronDown,
  ChevronUp,
  Quote,
  GraduationCap,
  Scale,
  Brain,
  Layers,
  ArrowRight,
  Download,
  Lock,
} from 'lucide-react';

interface FaqViewProps {
  onStartCorrection: () => void;
}

interface FaqItem {
  id: string;
  category: 'litteraire' | 'ocr' | 'bareme' | 'rgpd' | 'export';
  question: string;
  badge?: string;
  highlight?: boolean;
  shortSummary: string;
  detailedContent: React.ReactNode;
}

export const FaqView: React.FC<FaqViewProps> = ({ onStartCorrection }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({
    'matiere-litteraire-philo': true, // Open by default
  });

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const faqList: FaqItem[] = [
    {
      id: 'matiere-litteraire-philo',
      category: 'litteraire',
      question: 'Comment les matières littéraires comme le français ou la philosophie sont-elles corrigées ?',
      badge: 'Spécificité Pédagogique Clé',
      highlight: true,
      shortSummary:
        'Praxis n’applique pas un barème binaire "vrai/faux". Pour les dissertations et commentaires littéraires ou philosophiques, le modèle analyse la problématisation, la progression argumentative, la mobilisation des concepts et références d’auteurs, et cite directement la copie de l’élève pour justifier chaque appréciation.',
      detailedContent: (
        <div className="space-y-5 text-sm text-slate-700 leading-relaxed">
          <p>
            Contrairement aux exercices scientifiques à solution univoque, la correction d’une copie de <strong>Français</strong> (commentaire composé, dissertation, contraction de texte, essai) ou de <strong>Philosophie</strong> (dissertation philosophique, explication de texte) repose sur la finesse de l’analyse, la cohérence du raisonnement et la qualité de l’expression.
          </p>

          <div className="bg-blue-50/80 border border-blue-200/80 rounded-xl p-4.5 space-y-2">
            <div className="flex items-center gap-2 text-blue-900 font-bold">
              <Brain className="w-4 h-4 text-blue-700" />
              <span>La vision pédagogique de Praxis : Un copilote d’analyse, jamais un substitut</span>
            </div>
            <p className="text-xs text-blue-950/90 leading-relaxed">
              L’IA ne « plaque » pas un avis arbitraire. Elle procède à une lecture intégrale de la copie manuscrite, confronte la copie à la <strong>grille critériée officielle</strong> (ou personnalisée par le professeur), extrait des <strong>citations textuelles exactes</strong> entre guillemets pour appuyer ses remarques, et laisse à l’enseignant le contrôle absolu pour ajuster la note ou l'appréciation.
            </p>
          </div>

          <h4 className="font-bold text-slate-900 text-sm flex items-center gap-2 pt-2 border-t border-slate-200">
            <Scale className="w-4 h-4 text-indigo-600" />
            <span>Les 5 piliers de correction appliqués aux copies littéraires & philosophiques :</span>
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                  1
                </span>
                <span className="font-bold text-slate-900 text-xs">Problématisation & Analyse des Notions</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                En <strong>Philosophie</strong>, vérification du repérage des paradoxes et du sens des concepts (ex: <em>liberté / déterminisme</em>, <em>vérité / opinion</em>, <em>nature / culture</em>). En <strong>Français</strong>, évaluation de la compréhension de la consigne et de l'enjeu esthétique du texte.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                  2
                </span>
                <span className="font-bold text-slate-900 text-xs">Structure & Progression Dialectique</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Examen du plan : structure thématique, dialectique (<em>thèse, antithèse, synthèse/dépassement</em>) ou analytique. L’IA identifie les transitions logiques, les ruptures de cohérence, les pétitions de principe et les digressions hors-sujet.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                  3
                </span>
                <span className="font-bold text-slate-900 text-xs">Mobilisation des Doctrines & Références</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Détection des auteurs mobilisés (Descartes, Spinoza, Kant, Rousseau, Nietzsche, Sartre, etc.) ou des références littéraires au programme (Baudelaire, Molière, Camus...). L’IA vérifie si la référence est <em>expliquée et mise au service de l’argument</em> ou s’il s’agit d’un simple placage superficiel.
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 text-xs font-bold flex items-center justify-center">
                  4
                </span>
                <span className="font-bold text-slate-900 text-xs">Analyse Stylistique & Textuelle (Français)</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Reconnaissance des figures de style (métaphores, anaphores, chiasmes, oxymores), de la versification, des registres (tragique, ironique, lyrique) et de leur interprétation au service du sens (et non un simple étiquetage formel).
              </p>
            </div>
          </div>

          <div className="bg-slate-900 text-slate-100 p-4 rounded-xl space-y-2">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <Quote className="w-3.5 h-3.5" />
              <span>Exemple concret d'appréciation générée par Praxis sur une dissertation de philo</span>
            </div>
            <div className="text-xs text-slate-300 font-mono bg-slate-950/80 p-3 rounded-lg border border-slate-800 leading-relaxed">
              <p className="text-emerald-400 mb-1">
                <strong>Points forts :</strong> "Bonne problématisation dès l'introduction où vous interrogez avec pertinence l'illusion du libre arbitre : <span className="text-white italic">« L'homme a l'illusion de choisir alors qu'il ignore les motifs profonds de sa volonté »</span>. La doctrine de Spinoza (Lettre à Schuller) est bien convoquée en page 2 pour dépasser le sens commun."
              </p>
              <p className="text-amber-300 mt-2">
                <strong>Piste d'amélioration :</strong> "En troisième partie, votre transition vers la liberté comme responsabilité chez Sartre reste trop abrupte. Veillez à mieux relier l'argument à la question initiale du devoir."
              </p>
            </div>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs bg-slate-100/90 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="font-bold text-slate-800">Prêt à tester sur votre prochain paquet de copies ?</span>
              <p className="text-slate-500">Importez votre sujet, votre barème ou votre corrigé-type manuscrit en étape 1.</p>
            </div>
            <button
              type="button"
              onClick={onStartCorrection}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors flex items-center gap-1.5 shrink-0 cursor-pointer shadow-xs"
            >
              <span>Lancer une correction</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ),
    },
    {
      id: 'ecriture-manuscrite-ratures',
      category: 'ocr',
      question: 'Comment Praxis gère-t-il les écritures manuscrites difficiles, ratures et ajouts en marge ?',
      shortSummary:
        'Grâce au modèle Gemini Vision haute résolution, Praxis déchiffre les écritures cursives complexes, ignore les passages proprement barrés et détecte les renvois en bas de page ou en marge.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Praxis s’appuie sur les dernières avancées de la vision multimodale (Gemini 2.5 Flash / Pro Vision). L’OCR est entraîné sur des milliers de styles d’écritures manuscrites d’élèves de collège, lycée et classes préparatoires :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Ratures et corrections :</strong> Le modèle identifie visuellement les mots ou paragraphes rayés et prend en compte la correction insérée au-dessus ou dans l’interligne.</li>
            <li><strong>Annotations en marge et astérisques :</strong> Lorsqu’un élève ajoute un renvoi (<em>« * suite en bas de page »</em>), l’IA réintègre le texte dans le flux logique du paragraphe.</li>
            <li><strong>Indicateur de lisibilité :</strong> Si une copie présente une écriture exceptionnellement dégradée, une tâche d’encre ou une photo floue, Praxis affiche un badge d’alerte <em>« Vérification humaine recommandée »</em> invitant le professeur à relire la zone litigieuse.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'copies-multi-pages',
      category: 'ocr',
      question: 'Peut-on corriger des devoirs de plusieurs pages par élève (copies doubles de 4 pages de Bac) ?',
      shortSummary:
        'Oui, Praxis prend en charge les PDF multipages ou les photos individuelles en regroupant automatiquement les pages d’un même élève pour évaluer la copie dans sa continuité.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Pour les épreuves longues (Baccalauréat, Brevet, concours blancs), chaque copie peut comprendre 2, 4 ou 6 pages manuscrites :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Vous pouvez glisser-déposer un <strong>fichier PDF multipages</strong> numérisé depuis le photocopieur de votre établissement.</li>
            <li>Vous pouvez également téléverser des photos smartphone numérotées (ex: <em>dupont_p1.jpg</em>, <em>dupont_p2.jpg</em>).</li>
            <li>L’IA analyse la cohérence chronologique de la copie, fait la liaison entre les pages et attribue une seule note globale assortie du bilan complet.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'import-bareme-corrige',
      category: 'bareme',
      question: 'Comment fournir mon corrigé ou ma grille de notation à Praxis ?',
      shortSummary:
        'Vous pouvez saisir votre barème par écrit, coller votre corrigé-type, ou simplement photographier votre propre fiche manuscrite grâce à la numérisation de corrigé.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            À l'étape 1 de la configuration de votre devoir, deux modes sont à votre disposition :
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Mode Barème & Grille (Recommandé)
              </span>
              <p className="text-xs text-slate-600">
                Vous détaillez les critères et le nombre de points associés (ex: Q1 sur 4 pts, Q2 sur 6 pts). Vous pouvez joindre la photo de votre corrigé manuscrit d'un simple clic.
              </p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <span className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Mode Autonome Intelligent
              </span>
              <p className="text-xs text-slate-600">
                Vous indiquez uniquement le titre et la note maximale (ex: /20). L’IA déduit le corrigé et la grille d’évaluation standard selon les exigences du niveau scolaire sélectionné (de la 6ème au Supérieur).
              </p>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: 'securite-rgpd-confidentialite',
      category: 'rgpd',
      question: 'Les copies et les données des élèves sont-elles protégées et conformes au RGPD ?',
      shortSummary:
        'Absolument. Aucune copie d’élève n’est utilisée pour ré-entraîner des modèles publics. Le traitement s’effectue en mémoire chiffrée selon les normes européennes RGPD.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            La protection des données scolaires et de la vie privée des mineurs est au cœur de l'architecture Praxis :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li><strong>Non-réutilisation des données :</strong> Les images de devoirs et les annotations pédagogiques ne sont jamais indexées publiquement ni vendues.</li>
            <li><strong>Possibilité d'anonymisation :</strong> Vous pouvez utiliser des identifiants anonymes (Élève A, Copie #12) ou masquer le cartouche de nom de l'élève avant numérisation.</li>
            <li><strong>Hébergement sécurisé :</strong> Les transactions et requêtes s'exécutent sur des serveurs sécurisés conformes aux standards RGPD de l'Union Européenne.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'export-pronote-ecoledirecte',
      category: 'export',
      question: 'Comment exporter les notes vers Pronote, ÉcoleDirecte ou mon tableur ?',
      shortSummary:
        'En fin d’évaluation, Praxis génère un export CSV officiel instantanément importable dans Pronote et ÉcoleDirecte, ainsi que des fiches de restitution PDF pour les élèves.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            Une fois le paquet de copies validé par vos soins à l’étape 4 (Tableau de Bord) :
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
            <li>Cliquez sur <strong>« Exporter CSV (Pronote / Excel) »</strong> : le fichier est structuré pour s'intégrer directement dans les colonnes de relevés de notes Pronote sans ressaisie manuelle.</li>
            <li>Cliquez sur <strong>« Imprimer les fiches d’évaluation »</strong> pour générer les feuillets individuels avec barème détaillé, points forts et conseils personnalisés à coller sur les copies rendues aux élèves.</li>
          </ul>
        </div>
      ),
    },
    {
      id: 'acces-administration-saas',
      category: 'bareme',
      question: 'Comment accéder à la console d’administration de la plateforme ?',
      shortSummary:
        'Pour des raisons de sécurité et de confidentialité, la console d’administration n’est pas visible dans l’interface publique. Elle est accessible exclusivement par lien direct avec mot de passe maître.',
      detailedContent: (
        <div className="space-y-3 text-sm text-slate-700">
          <p>
            La console administrateur SaaS (CRM des enseignants, statistiques MRR/ARR, alertes Telegram) n'a aucun lien visible dans la barre de navigation publique.
          </p>
          <div className="bg-slate-100 p-3 rounded-xl text-xs space-y-1 font-mono text-slate-800">
            <p>
              Lien direct sécurisé : <code className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-blue-700">/dashboard</code> ou <code className="bg-slate-200 px-1.5 py-0.5 rounded font-bold text-blue-700">/admin</code>
            </p>
            <p className="text-slate-600 font-sans mt-1">
              Un mot de passe maître confidentiel est exigé pour déverrouiller la session chiffrée.
            </p>
          </div>
        </div>
      ),
    },
  ];

  // Filtered FAQ items
  const filteredFaqs = useMemo(() => {
    return faqList.filter((item) => {
      const matchCategory = selectedCategory === 'all' || item.category === selectedCategory;
      if (!matchCategory) return false;

      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      return (
        item.question.toLowerCase().includes(q) ||
        item.shortSummary.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q))
      );
    });
  }, [faqList, selectedCategory, searchQuery]);

  return (
    <div id="faq" className="space-y-8 animate-in fade-in duration-300 scroll-mt-20">
      {/* Hero Header Section */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden">
        {/* Ambient glow decoration */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold tracking-wide uppercase">
            <BookOpen className="w-3.5 h-3.5" />
            <span>Base de Connaissance & Guide Pédagogique</span>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
            Foire Aux Questions (FAQ)
          </h1>

          <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-normal">
            Tout ce que vous devez savoir sur le fonctionnement de l’IA Praxis, le traitement des matières littéraires et philosophiques, la lecture des écritures manuscrites et la souveraineté de l'enseignant.
          </p>

          {/* Search Bar */}
          <div className="pt-2">
            <div className="relative max-w-xl">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher : philo, français, barème, manuscrit, RGPD, Pronote..."
                className="w-full pl-11 pr-4 py-3 bg-white/10 hover:bg-white/15 focus:bg-white text-slate-100 focus:text-slate-900 border border-white/20 focus:border-blue-500 rounded-xl text-sm placeholder-slate-400 focus:placeholder-slate-500 focus:outline-hidden transition-all shadow-inner"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 px-2 py-0.5 rounded cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          type="button"
          onClick={() => setSelectedCategory('all')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
            selectedCategory === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          Toutes les questions ({faqList.length})
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('litteraire')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'litteraire'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Feather className="w-3.5 h-3.5 text-indigo-500" />
          <span>Matières Littéraires & Philo</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('ocr')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'ocr'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-blue-500" />
          <span>Écritures Manuscrites & Vision</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('bareme')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'bareme'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scale className="w-3.5 h-3.5 text-amber-500" />
          <span>Barèmes & Corrigés</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('rgpd')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'rgpd'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span>Confidentialité & RGPD</span>
        </button>

        <button
          type="button"
          onClick={() => setSelectedCategory('export')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
            selectedCategory === 'export'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export Pronote & Fiches</span>
        </button>
      </div>

      {/* FAQ Accordion List */}
      <div className="space-y-4">
        {filteredFaqs.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 mx-auto flex items-center justify-center">
              <Search className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-slate-800 text-base">Aucune réponse ne correspond à votre recherche</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Essayez un autre mot-clé (ex: "philo", "note", "manuscrit", "français") ou réinitialisez les filtres.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition-colors cursor-pointer"
            >
              Voir toutes les questions
            </button>
          </div>
        ) : (
          filteredFaqs.map((faq) => {
            const isExpanded = Boolean(expandedIds[faq.id]);

            return (
              <div
                key={faq.id}
                id={`faq-${faq.id}`}
                className={`bg-white rounded-2xl transition-all duration-200 overflow-hidden border ${
                  faq.highlight
                    ? isExpanded
                      ? 'border-indigo-400 ring-2 ring-indigo-500/10 shadow-lg'
                      : 'border-indigo-200/90 shadow-sm'
                    : isExpanded
                    ? 'border-slate-300 shadow-md'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Question Header Row */}
                <div
                  onClick={() => toggleExpand(faq.id)}
                  className={`p-5 sm:p-6 flex items-start justify-between gap-4 cursor-pointer select-none transition-colors ${
                    faq.highlight ? 'bg-gradient-to-r from-indigo-50/40 via-white to-white' : ''
                  }`}
                >
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {faq.badge && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                          <Feather className="w-3 h-3 text-indigo-700" />
                          {faq.badge}
                        </span>
                      )}
                      {faq.category === 'litteraire' && !faq.badge && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                          Français & Philo
                        </span>
                      )}
                      {faq.category === 'ocr' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                          Vision & OCR
                        </span>
                      )}
                      {faq.category === 'rgpd' && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Sécurité RGPD
                        </span>
                      )}
                    </div>

                    <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-snug">
                      {faq.question}
                    </h2>

                    {!isExpanded && (
                      <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed font-normal">
                        {faq.shortSummary}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        isExpanded
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Answer Body */}
                {isExpanded && (
                  <div className="px-5 sm:px-6 pb-6 pt-2 border-t border-slate-100 animate-in fade-in duration-200">
                    <div className="pt-2">{faq.detailedContent}</div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Callout Banner */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 text-white rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl">
        <div className="space-y-1.5 text-center sm:text-left">
          <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
            Vous avez une question spécifique sur votre discipline ?
          </h3>
          <p className="text-xs sm:text-sm text-blue-100 max-w-xl leading-relaxed">
            Testez directement le moteur sur une copie d'élève ou contactez notre équipe pédagogique pour configurer vos grilles d'évaluation sur mesure.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartCorrection}
          className="px-5 py-2.5 bg-white text-blue-700 hover:bg-blue-50 font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md shrink-0 cursor-pointer flex items-center gap-2"
        >
          <span>Démarrer une correction</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
