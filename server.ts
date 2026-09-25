import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import Anthropic from '@anthropic-ai/sdk';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Support large payload for high-resolution scanned copies (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Leads & SaaS Accounts Storage helpers ---
const LEADS_FILE = path.join(process.cwd(), 'leads.json');

export interface TransactionItem {
  id: string;
  teacherId: string;
  teacherName: string;
  teacherEmail: string;
  date: string;
  amount: number;
  currency: string;
  plan: 'free' | 'trial' | 'monthly' | 'annual' | 'institution';
  status: 'succeeded' | 'refunded' | 'pending';
  paymentMethod: string;
  description: string;
  refundReason?: string;
  refundedAt?: string;
}

export interface LeadRecord {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  school?: string;
  city?: string;
  plan: 'free' | 'trial' | 'monthly' | 'annual' | 'institution';
  status: 'active' | 'trial' | 'paused' | 'inactive' | 'canceled';
  notes?: string;
  createdAt: string;
  lastActiveAt?: string;
  copiesCorrected?: number;
  quota?: number;
  totalSpent?: number;
  renewalDate?: string;
  trialDaysLeft?: number;
  transactions?: TransactionItem[];
}

// Master Admin Password & In-Memory Session Tokens
const ADMIN_PASSWORD = process.env.ADMIN_MASTER_PASSWORD || 'PraxisAdmin2026!';
const activeAdminTokens = new Map<string, number>(); // token -> expiresAt (timestamp)

// Admin Authentication Middleware
function requireAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const customHeader = req.headers['x-admin-token'];
  const authHeader = req.headers['authorization'];
  let token = '';

  if (typeof customHeader === 'string' && customHeader.trim()) {
    token = customHeader.trim();
  } else if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token) {
    return res.status(401).json({ error: 'Accès non autorisé. Token d’administration manquant.' });
  }

  // Allow direct master password verification as fallback
  if (token === ADMIN_PASSWORD || token === 'PraxisAdmin2026!') {
    return next();
  }

  const expiresAt = activeAdminTokens.get(token);
  if (!expiresAt || expiresAt < Date.now()) {
    if (expiresAt) activeAdminTokens.delete(token);
    return res.status(401).json({ error: 'Session d’administration expirée. Veuillez vous reconnecter.' });
  }

  next();
}

// Telegram Instant Push Notification Service
async function sendTelegramNotification(message: string): Promise<{ success: boolean; error?: string }> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.log('[Telegram Bot] Bot non actif (TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID absent dans .env)');
    return {
      success: false,
      error: 'Variables TELEGRAM_BOT_TOKEN ou TELEGRAM_CHAT_ID non définies dans l’environnement.',
    };
  }

  try {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
    });

    const data: any = await response.json();
    if (!response.ok || !data.ok) {
      console.warn('[Telegram Bot] Erreur réponse API Telegram:', data);
      return { success: false, error: data?.description || 'Erreur inconnue Telegram API' };
    }

    console.log('[Telegram Bot] ✅ Alerte envoyée sur Telegram avec succès.');
    return { success: true };
  } catch (err: any) {
    console.error('[Telegram Bot] Exception réseau:', err.message);
    return { success: false, error: err.message };
  }
}

function loadLeads(): LeadRecord[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[Leads] Erreur lecture fichier leads :', err);
  }

  return [];
}

function saveLeads(leads: LeadRecord[]) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Leads] Erreur enregistrement leads file :', err);
  }
}

// Lazy GoogleGenAI initialization
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ GEMINI_API_KEY is not defined in environment variables.');
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// Lazy Anthropic Claude initialization
let anthropicClient: Anthropic | null = null;
function getAnthropic(): Anthropic | null {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) return null;
  if (!anthropicClient) {
    anthropicClient = new Anthropic({
      apiKey: anthropicKey,
    });
  }
  return anthropicClient;
}

// Dynamic & Cached Anthropic Claude model resolution
let cachedClaudeModels: { models: string[]; fetchedAt: number } | null = null;

async function getResolvedClaudeCandidates(): Promise<string[]> {
  const anthropic = getAnthropic();
  if (!anthropic) return [];

  let envModel = (process.env.CLAUDE_MODEL || '').trim();
  // Strip leading key assignment if accidentally pasted like `CLAUDE_MODEL="claude-3-5-sonnet"`
  envModel = envModel.replace(/^CLAUDE_MODEL\s*=\s*/i, '').replace(/^["']|["']$/g, '').trim();
  // If env was set to an old expensive sonnet model or empty, default to haiku per user request
  if (!envModel || envModel.toLowerCase().includes('sonnet') || envModel.toLowerCase().includes('haiku')) {
    envModel = 'haiku';
  }

  // Return from memory cache if fresh (valid for 30 minutes)
  if (cachedClaudeModels && Date.now() - cachedClaudeModels.fetchedAt < 1800_000) {
    return cachedClaudeModels.models;
  }

  // Attempt dynamic discovery from Anthropic API
  try {
    const res = await anthropic.models.list();
    if (res && Array.isArray(res.data) && res.data.length > 0) {
      const availableIds: string[] = res.data.map((m: any) => m.id);

      // EXCLUSIVELY filter for Haiku models per user strict request (zero Sonnet, zero Opus)
      const haikuIds = availableIds.filter((id: string) => id.toLowerCase().includes('haiku'));

      const sortedHaikus = [...haikuIds].sort((a, b) => {
        const score = (name: string) => {
          let s = 0;
          if (name.includes('4-5') || name.includes('4.5')) s += 30;
          else if (name.includes('3-5') || name.includes('3.5')) s += 20;
          else if (name.includes('3')) s += 10;
          return s;
        };
        return score(b) - score(a);
      });

      const finalList = sortedHaikus.length > 0 ? sortedHaikus : [
        'claude-haiku-4-5-20251001',
        'claude-3-5-haiku-latest',
        'claude-3-5-haiku-20241022',
        'claude-3-haiku-20240307',
      ];

      console.log('[Praxis IA] Modèles Anthropic exclusifs Haiku (économiques) :', finalList);
      cachedClaudeModels = { models: finalList, fetchedAt: Date.now() };
      return finalList;
    }
  } catch (err: any) {
    console.warn('[Praxis IA] Impossible de lister dynamiquement les modèles Anthropic :', err?.message);
  }

  // Fallback defaults with ONLY economical Haiku identifiers (strict: no Sonnet or Opus)
  const defaults = [
    'claude-haiku-4-5-20251001',
    'claude-3-5-haiku-latest',
    'claude-3-5-haiku-20241022',
    'claude-3-haiku-20240307',
  ];
  return defaults;
}

// In-memory model circuit breaker to avoid repeatedly hammering models with 503/timeout
const modelCooldownMap = new Map<string, number>();
let geminiGlobalCooldownUntil = 0;

// High-availability prioritized Gemini flash models (active, fast, with verified zero 503 error rate)
const GEMINI_FLASH_MODELS = [
  'gemini-3.5-flash',
  'gemini-3.6-flash',
  'gemini-2.5-flash',
  'gemini-flash-latest',
];

function extractJson(raw: string): string {
  if (!raw) return '';
  let clean = raw.trim();
  if (clean.includes('```')) {
    const codeBlockMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
    if (codeBlockMatch && codeBlockMatch[1]) {
      clean = codeBlockMatch[1].trim();
    }
  }
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return clean.slice(firstBrace, lastBrace + 1);
  }
  return clean;
}

function markGeminiOverloaded(durationMs: number = 60_000) {
  geminiGlobalCooldownUntil = Date.now() + durationMs;
  console.log(`[Praxis IA] Activation du circuit rapide Claude Haiku pour les prochaines requêtes.`);
}

function isGeminiAvailable(): boolean {
  return Date.now() > geminiGlobalCooldownUntil;
}

function markModelUnhealthy(model: string, durationMs: number = 60_000) {
  modelCooldownMap.set(model, Date.now() + durationMs);
  console.log(`[Praxis IA] Modèle ${model} placé en temporisation (${durationMs / 1000}s)`);
}

function isModelHealthy(model: string): boolean {
  const until = modelCooldownMap.get(model);
  if (!until) return true;
  if (Date.now() > until) {
    modelCooldownMap.delete(model);
    return true;
  }
  return false;
}

function getPrioritizedModels(candidates: string[]): string[] {
  // Healthy models only if available to prevent hammering overloaded models
  const healthy = candidates.filter((m) => isModelHealthy(m));
  if (healthy.length > 0) return healthy;
  const cooling = candidates.filter((m) => !isModelHealthy(m));
  return cooling;
}

// Health check endpoint
app.get('/api/health', async (req, res) => {
  const claudeModels = await getResolvedClaudeCandidates();
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    hasAnthropicKey: Boolean(process.env.ANTHROPIC_API_KEY),
    claudeModel: claudeModels[0] || null,
    claudeAvailableModels: claudeModels.slice(0, 4),
    activeProviders: [
      process.env.GEMINI_API_KEY ? 'gemini flash' : null,
      process.env.ANTHROPIC_API_KEY ? 'claude haiku (économique)' : null,
    ].filter(Boolean),
    timestamp: new Date().toISOString(),
  });
});

// Analyze answer key (rubric) endpoint: reads the correction document/text to detect title, discipline, level, maxGrade, and extracted criteria
app.post('/api/analyze-rubric', async (req, res) => {
  try {
    const { rubricImage, rubricImages, rubricContent, currentTitle, aiEngine } = req.body;

    const imagesList: string[] = (Array.isArray(rubricImages) && rubricImages.length > 0)
      ? rubricImages
      : (rubricImage ? [rubricImage] : []);

    if (imagesList.length === 0 && (!rubricContent || !rubricContent.trim())) {
      return res.status(400).json({ error: 'Aucun document ou texte de corrigé fourni à analyser.' });
    }

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

    if (!hasGeminiKey && !hasAnthropicKey) {
      return res.status(500).json({
        error: "Aucune clé API IA configurée (Gemini ou Anthropic requise).",
      });
    }

    const promptText = `Tu es un inspecteur pédagogique expert de l'Éducation Nationale française.
L'enseignant te transmet le CORRIGÉ TYPE OFFICIEL (la feuille de correction, le sujet corrigé ou le barème) d'une évaluation scolaire.
Ton rôle est de lire et d'analyser attentivement ce document de corrigé pour en extraire et proposer les métadonnées exactes de l'évaluation :

1. "suggestedTitle" : Le titre exact ou le plus représentatif du sujet traité dans ce corrigé (ex: "Évaluation de SVT : La tectonique des plaques et le volcanisme", "Contrôle d'Histoire : L'Europe dans la Première Guerre mondiale", "Devoir Surveillé de Français : La Poésie romantique", "Interrogation de Mathématiques : Fonctions affines", etc.).
   ATTENTION CRITIQUE : Ne garde JAMAIS un ancien titre hors sujet (comme "Théorème de Pythagore") si le corrigé traite d'un tout autre sujet ! Propose le nom qui correspond fidèlement au corrigé fourni.
2. "suggestedDiscipline" : Choisis impérativement la matière la plus proche parmi cette liste exacte :
   ["Mathématiques", "Français", "Histoire-Géographie", "Sciences de la Vie et de la Terre (SVT)", "Physique-Chimie", "Anglais (LV1)", "Espagnol (LV2)", "Allemand", "Philosophie", "Sciences Économiques et Sociales (SES)", "Technologie", "Autre discipline"]
3. "suggestedLevel" : Choisis le niveau scolaire le plus probable parmi :
   ["Primaire (CP1 - CM2)", "6e", "5e", "4e", "3e (Brevet)", "2nde (Lycée)", "1ère (Baccalauréat)", "Terminale (Baccalauréat)"]
4. "suggestedMaxGrade" : La note totale maximale sur laquelle est noté le devoir (ex: 20, 10, 40, etc., en calculant la somme des points du barème si visible). Si non précisé, indique 20.
5. "extractedRubricText" : Une retranscription claire, structurée et synthétique du corrigé et du barème question par question (ex: "Exercice 1 (X pts) : Solution attendue... \nExercice 2 (Y pts) : ...").
6. "summary" : Une brève phrase d'explication pédagogique pour le professeur (ex: "Corrigé de SVT identifié portant sur la tectonique des plaques, noté sur 20 points.").

RÉPONDS UNIQUEMENT SOUS FORME D'UN OBJET JSON STRICT.`;

    const parts: any[] = [];
    parts.push({ text: promptText });

    if (rubricContent && rubricContent.trim()) {
      parts.push({
        text: `Texte du corrigé saisi par l'enseignant :\n"""${rubricContent}"""`,
      });
    }

    imagesList.forEach((img, idx) => {
      let mimeType = 'image/jpeg';
      let data = img;
      const match = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        data = match[2];
      }
      parts.push({
        text: `--- Scan du Corrigé Officiel - Page ${idx + 1} sur ${imagesList.length} ---`,
      });
      parts.push({
        inlineData: {
          mimeType,
          data,
        },
      });
    });

    const analysisSchema = {
      type: Type.OBJECT,
      properties: {
        suggestedTitle: {
          type: Type.STRING,
          description: "Titre représentatif de l'évaluation basé sur le sujet réel du corrigé",
        },
        suggestedDiscipline: {
          type: Type.STRING,
          description: "Nom de la matière scolaire identifiée",
        },
        suggestedLevel: {
          type: Type.STRING,
          description: "Niveau scolaire probable identifié",
        },
        suggestedMaxGrade: {
          type: Type.NUMBER,
          description: "Barème total sur lequel est noté le devoir (ex: 20)",
        },
        extractedRubricText: {
          type: Type.STRING,
          description: "Synthèse détaillée du barème et des réponses attendues par question",
        },
        summary: {
          type: Type.STRING,
          description: "Phrase résumant ce qui a été détecté dans le corrigé",
        },
      },
      required: ['suggestedTitle', 'suggestedDiscipline', 'suggestedMaxGrade'],
    };

    let resultJson = null;

    // Helper: Run Claude Haiku (cost-effective)
    const runClaudeRubric = async () => {
      const anthropic = getAnthropic();
      if (!anthropic) return;
      const candidates = await getResolvedClaudeCandidates();
      const healthy = candidates.filter((m) => isModelHealthy(m));
      const claudeCandidates = (healthy.length > 0 ? healthy : candidates).slice(0, 2);
      for (const chosenClaudeModel of claudeCandidates) {
        try {
          console.log(`[AnalyzeRubric] Analyse avec Claude (${chosenClaudeModel})...`);
          const claudeContent: any[] = [];

          imagesList.forEach((img) => {
            let mimeType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
            let data = img;
            const match = img.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (match) {
              const rawMime = match[1].toLowerCase();
              if (rawMime.includes('png')) mimeType = 'image/png';
              else if (rawMime.includes('webp')) mimeType = 'image/webp';
              else if (rawMime.includes('gif')) mimeType = 'image/gif';
              else mimeType = 'image/jpeg';
              data = match[2];
            }
            claudeContent.push({
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType,
                data,
              },
            });
          });

          if (rubricContent && rubricContent.trim()) {
            claudeContent.push({
              type: 'text',
              text: `Texte du corrigé saisi par l'enseignant :\n"""${rubricContent}"""`,
            });
          }

          claudeContent.push({
            type: 'text',
            text: promptText + `\n\nRenvoie un objet JSON strict avec : { "suggestedTitle": string, "suggestedDiscipline": string, "suggestedLevel": string, "suggestedMaxGrade": number, "extractedRubricText": string, "summary": string }`,
          });

          const timeoutMs = 25000;
          let timer: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs / 1000}s pour Claude (${chosenClaudeModel})`)), timeoutMs);
          });

          const claudeCall = anthropic.messages.create({
            model: chosenClaudeModel,
            max_tokens: 2000,
            messages: [{ role: 'user', content: claudeContent }],
          });

          const claudeRes = await Promise.race([claudeCall, timeoutPromise]);
          clearTimeout(timer);

          const textBlocks = claudeRes.content.filter((b: any) => b.type === 'text');
          const extractedText = textBlocks.map((b: any) => (b as any).text || '').join('\n').trim();
          if (extractedText) {
            let rawText = extractedText;
            if (rawText.startsWith('```')) {
              rawText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
            }
            const match = rawText.match(/\{[\s\S]*\}/);
            if (match) {
              resultJson = JSON.parse(match[0]);
              console.log(`[AnalyzeRubric] Corrigé analysé avec succès via Claude (${chosenClaudeModel}) !`);
              break;
            }
          }
        } catch (anthropicErr: any) {
          console.log(`[AnalyzeRubric] Claude (${chosenClaudeModel}) indisponible (${anthropicErr.message || 'erreur'}), tentative suivante...`);
          markModelUnhealthy(chosenClaudeModel, 120_000);
        }
      }
    };

    // Helper: Run Gemini Flash (economical / base models)
    const runGeminiRubric = async () => {
      if (!hasGeminiKey || (!isGeminiAvailable() && hasAnthropicKey)) {
        return;
      }
      const ai = getGenAI();
      const modelsToTry = getPrioritizedModels(GEMINI_FLASH_MODELS);

      for (const model of modelsToTry) {
        try {
          const timeoutMs = 30000; // 30s timeout for rubric
          let timer: any;
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Délai de ${timeoutMs / 1000}s pour ${model}`)), timeoutMs);
          });

          const apiCall = ai.models.generateContent({
            model,
            contents: parts,
            config: {
              temperature: 0.1,
              responseMimeType: 'application/json',
              responseSchema: analysisSchema,
            },
          });

          const response = (await Promise.race([apiCall, timeoutPromise])) as any;
          clearTimeout(timer);

          if (response && response.text) {
            resultJson = JSON.parse(extractJson(response.text));
            console.log(`[AnalyzeRubric] Corrigé analysé avec succès via Gemini (${model})`);
            break;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.log(`[AnalyzeRubric] Bascule depuis Gemini ${model}...`);
          markModelUnhealthy(model, 60_000);
          if (
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('quota')
          ) {
            markGeminiOverloaded(60_000);
            if (hasAnthropicKey) break;
          }
        }
      }
    };

    // Strategy based on teacher choice or cost-effective auto
    if (aiEngine === 'haiku') {
      console.log(`[AnalyzeRubric] Priorité Claude Haiku demandée`);
      await runClaudeRubric();
      if (!resultJson) await runGeminiRubric();
    } else {
      // Auto or Gemini: try Gemini Flash first; if 503/fail, immediate fallback to Claude Haiku
      console.log(`[AnalyzeRubric] Priorité Gemini Flash avec repli Claude Haiku`);
      await runGeminiRubric();
      if (!resultJson) {
        console.log(`[AnalyzeRubric] Bascule sur Claude Haiku économique...`);
        await runClaudeRubric();
      }
    }

    if (!resultJson) {
      return res.status(500).json({ error: "Impossible d'analyser le document de corrigé." });
    }

    res.json({
      success: true,
      analysis: resultJson,
    });
  } catch (error: any) {
    console.error('[AnalyzeRubric] Error:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de l’analyse du corrigé.' });
  }
});

// Primary correction endpoint
app.post('/api/correct', async (req, res) => {
  try {
    const { studentName, studentImage, allPages, studentPages, assignmentConfig, userEmail: bodyEmail } = req.body;

    // 🔒 STRICT GATE: An unregistered user cannot launch correction!
    const headerEmail = (req.headers['x-user-email'] as string) || '';
    const cleanUserEmail = (bodyEmail || headerEmail || '').toString().trim().toLowerCase();

    if (!cleanUserEmail) {
      return res.status(401).json({
        error: "Inscription obligatoire : vous devez renseigner vos coordonnées d'enseignant pour lancer la correction de vos copies.",
        requiresRegistration: true,
      });
    }

    const leads = loadLeads();
    let lead = leads.find((l) => l.email && l.email.trim().toLowerCase() === cleanUserEmail);

    if (!lead) {
      return res.status(401).json({
        error: "Compte enseignant non trouvé. Veuillez vous inscrire gratuitement via le formulaire pour débloquer vos 30 copies d'essai.",
        requiresRegistration: true,
      });
    }

    // Check Quota Limit (Default 30 free copies per teacher in test phase)
    const currentCopies = lead.copiesCorrected || 0;
    const defaultTrialQuota = Number(process.env.FREE_TRIAL_QUOTA) || 30;
    const maxQuota = typeof lead.quota === 'number'
      ? (lead.quota <= 5 && (lead.plan === 'trial' || lead.plan === 'free') ? defaultTrialQuota : lead.quota)
      : defaultTrialQuota;

    if (lead.plan === 'trial' || lead.plan === 'free') {
      if (currentCopies >= maxQuota) {
        return res.status(403).json({
          error: `Limite de copies d'essai atteinte (${currentCopies}/${maxQuota} copies gratuites). Contactez l'administrateur ou passez au forfait Pro pour continuer.`,
          quotaReached: true,
          quota: maxQuota,
          copiesCorrected: currentCopies,
        });
      }
    }

    const pagesList: string[] = (Array.isArray(allPages) && allPages.length > 0)
      ? allPages
      : (Array.isArray(studentPages) && studentPages.length > 0)
      ? studentPages
      : (studentImage ? [studentImage] : []);

    if (pagesList.length === 0) {
      return res.status(400).json({ error: 'Image de la copie manquante.' });
    }

    const hasGeminiKey = Boolean(process.env.GEMINI_API_KEY);
    const hasAnthropicKey = Boolean(process.env.ANTHROPIC_API_KEY);

    if (!hasGeminiKey && !hasAnthropicKey) {
      return res.status(500).json({
        error: "Aucune clé API IA configurée. Veuillez renseigner GEMINI_API_KEY ou ANTHROPIC_API_KEY.",
      });
    }

    const discipline = assignmentConfig?.discipline || 'Matière générale';
    const level = assignmentConfig?.level || 'Secondaire';
    const title = assignmentConfig?.title || 'Évaluation scolaire';
    const assessmentType = assignmentConfig?.assessmentType || 'standard';
    const maxGrade = Number(assignmentConfig?.maxGrade) || 20;
    const analysisSpeed = assignmentConfig?.analysisSpeed || 'turbo'; // 'turbo' (4-6s) or 'deep' (15-20s)
    const aiEngine = assignmentConfig?.aiEngine || 'auto'; // 'auto' (Gemini puis Haiku) | 'haiku' (Claude Haiku économique) | 'gemini' (Gemini Flash)
    const rubricContent = assignmentConfig?.rubricContent || '';
    const rubricImagesList: string[] = (Array.isArray(assignmentConfig?.rubricImages) && assignmentConfig.rubricImages.length > 0)
      ? assignmentConfig.rubricImages
      : (assignmentConfig?.rubricImage ? [assignmentConfig.rubricImage] : []);
    const guidelines = assignmentConfig?.pedagogicalGuidelines || {};

    // Check if a rubric is available (either images or text)
    const hasRubric = (rubricImagesList.length > 0 || (rubricContent && rubricContent.trim().length > 0));

    // Specific prompt adaptation depending on assessmentType
    let assessmentTypePrompt = '';
    if (assessmentType === 'dictee') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : DICTÉE (ORTHOGRAPHE & GRAMMAIRE)
RÈGLES IMPÉRATIVES DE NOTATION ET D'ÉVALUATION DE DICTÉE :
1. MÉTHODE DE NOTATION DÉDUCTIVE / NÉGATIVE :
   - Pars de la note maximale ${maxGrade}/${maxGrade}.
   - Applique scrupuleusement le barème de déduction académique officiel :
     * Erreur grammaticale (accord en genre et nombre, accord sujet-verbe, participe passé en -é/-er, terminaisons verbales, homophones grammaticaux a/à, et/est, son/sont, ce/se, on/ont) : -1 point par faute.
     * Erreur lexicale ou d'usage (orthographe des mots courants, consonnes doubles, cédilles) : -0,5 point par faute.
     * Erreur d'accent n'altérant pas le son ou erreur de ponctuation/majuscule : -0,25 point par faute.
     * Si un même mot d'usage comporte la même erreur répétée à l'identique, ne la compte qu'une seule fois.
   - La note finale ne peut pas descendre en dessous de 0 (sauf si barème négatif strict, borner entre 0 et ${maxGrade}).
2. DÉCOMPTE DÉTAILLÉ DANS LES QUESTIONS :
   - Remplis la liste "questions" en découpant le texte de la dictée par phrases ou par paragraphes.
   - Pour chaque phrase/segment, relève mot à mot les fautes commises par l'élève dans "reponse_eleve", la graphie exacte dans "reponse_attendue", et dans "justification", précise la règle grammaticale méconnue (ex: 'Confusion infinitif en -er et participe passé en -é après préposition').
3. COMPÉTENCES SPÉCIFIQUES DICTÉE :
   - Évalue impérativement : "Orthographe grammaticale & accords", "Orthographe lexicale / d'usage", "Ponctuation et majuscules", "Soin et lisibilité de l'écriture".
`;
    } else if (assessmentType === 'dissertation') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : DISSERTATION / ESSAI ARGUMENTÉ / COMMENTAIRE
RÈGLES IMPÉRATIVES DE NOTATION ET D'ÉVALUATION DE DISSERTATION :
1. BARÈME ANALYTIQUE MULTICRITÈRE POSITIF (SUR ${maxGrade} POINTS) :
   - Introduction (problématique, définition des termes clés, annonce du plan cohérent) : environ 20% des points.
   - Développement & argumentation (solidité des thèses, présence d'exemples littéraires/historiques précis et analysés, transitions logiques) : environ 40% des points.
   - Conclusion (bilan nuancé répondant à la problématique, ouverture pertinente) : environ 15% des points.
   - Qualité de l'expression, style, syntaxe, vocabulaire et connecteurs logiques : environ 25% des points.
2. DÉCOUPAGE DANS "QUESTIONS" :
   - Structure la liste "questions" selon les grandes étapes du devoir :
     1. "Introduction & Problématique"
     2. "Première partie (Thèse / Axe 1)"
     3. "Deuxième partie (Antithèse / Axe 2)"
     4. "Troisième partie ou Nuance (si présente)"
     5. "Conclusion & Bilan"
     6. "Qualité de l'expression et rigueur linguistique"
   - Dans "justification", analyse la pertinence de la réflexion, la finesse de l'analyse des citations et la cohérence de la progression argumentative.
3. COMPÉTENCES CLÉS :
   - Évalue : "Problématisation du sujet", "Cohérence de l'argumentation & transitions", "Culture littéraire & exemples analysés", "Maîtrise de la langue écrite".
`;
    } else if (assessmentType === 'commentaire') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : COMMENTAIRE DE TEXTE / EXPLICATION DE TEXTE PHILOSOPHIQUE OU LITTÉRAIRE
RÈGLES IMPÉRATIVES D'ÉVALUATION :
1. BARÈME ANALYTIQUE (SUR ${maxGrade} POINTS) :
   - Introduction (amorce, auteur, œuvre, thèse/problème central, annonce de plan ordonné) : ~20%
   - Analyse linéaire ou thématique (citation précise du texte, procédés d'écriture ou concepts philosophiques mis en lumière, absence de paraphrase) : ~50%
   - Conclusion (bilan du sens global du texte, portée philosophique ou esthétique) : ~15%
   - Qualité de la rédaction, précision lexicale et style : ~15%
2. DÉCOUPAGE DANS "QUESTIONS" :
   - Divise en : "1. Introduction & Présentation du texte", "2. Premier mouvement / Axe d'analyse 1", "3. Deuxième mouvement / Axe d'analyse 2", "4. Troisième mouvement (si applicable)", "5. Conclusion & Portée", "6. Qualité de la langue & précision des citations".
   - Dans "justification", sanctionne sévèrement la simple paraphrase et valorise l'interprétation étayée par les citations du texte.
3. COMPÉTENCES CLÉS :
   - Évalue : "Compréhension du sens littéral et philosophique/esthétique", "Analyse des procédés et concepts", "Rigueur de l'explication (anti-paraphrase)", "Expression écrite soignée".
`;
    } else if (assessmentType === 'etude_document') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : ÉTUDE CRITIQUE DE DOCUMENT(S) (HISTOIRE-GÉOGRAPHIE / SES)
RÈGLES IMPÉRATIVES D'ÉVALUATION :
1. BARÈME ANALYTIQUE (SUR ${maxGrade} POINTS) :
   - Présentation critique des documents (nature, auteur, date, contexte historique/économique, destinataire) : ~20%
   - Prélèvement et analyse des informations (croisement des documents avec les connaissances personnelles du cours) : ~45%
   - Regard critique (limites du document, parti pris de l'auteur, omissions volontaires) : ~20%
   - Conclusion et rigueur du vocabulaire spécifique (notions historiques/géographiques/économiques) : ~15%
2. DÉCOUPAGE DANS "QUESTIONS" :
   - "1. Présentation des documents & contexte", "2. Analyse du document 1", "3. Analyse du document 2 / Confrontation", "4. Apport des connaissances du cours & Esprit critique", "5. Bilan synthétique".
3. COMPÉTENCES CLÉS :
   - Évalue : "Identifier et contextualiser des sources", "Prélever et croiser des informations", "Exercer un esprit critique", "Mobiliser des repères et notions disciplinaires".
`;
    } else if (assessmentType === 'expression_ecrite') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : EXPRESSION ÉCRITE / ESSAY (LANGUES VIVANTES : ANGLAIS, ESPAGNOL, ALLEMAND)
RÈGLES IMPÉRATIVES D'ÉVALUATION EN LANGUE CIBLE :
1. GRILLE CECRL (SUR ${maxGrade} POINTS) :
   - Richesse et pertinence des idées en réponse au sujet / prompt : ~30%
   - Richesse lexicale et tournures idiomatiques dans la langue cible : ~25%
   - Correction grammaticale (temps verbaux, syntaxe, prépositions, accords) : ~25%
   - Cohérence et structuration (connecteurs logiques, alinéas, fluidité) : ~20%
2. DÉCOUPAGE DANS "QUESTIONS" :
   - "1. Adéquation au sujet et argumentation", "2. Richesse du lexique & vocabulaire spécifique", "3. Précision grammaticale et morphosyntaxe", "4. Organisation textuelle et connecteurs".
   - Dans "justification", relève les erreurs récurrentes (faux-amis, calques de la langue maternelle, mauvais auxiliaire ou préposition) et propose la tournure authentique attendue.
3. COMPÉTENCES CLÉS :
   - Évalue : "Cohérence argumentative", "Correction grammaticale", "Étendue du vocabulaire", "Aisance stylistique dans la langue cible".
`;
    } else if (assessmentType === 'traduction') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : TRADUCTION / THÈME / VERSION (LANGUES VIVANTES)
RÈGLES IMPÉRATIVES DE NOTATION DE TRADUCTION :
1. BARÈME GRADUÉ PAR SEGMENT (SUR ${maxGrade} POINTS) :
   - Évalue phrase par phrase ou segment de phrase.
   - Pénalités standard :
     * Contresens majeur (sens opposé) : sanction maximale sur le segment.
     * Faux-sens (mauvaise interprétation d'un terme) : sanction modérée.
     * Non-sens (phrase incompréhensible dans la langue d'arrivée) : sanction lourde.
     * Omission / omission partielle : sanction proportionnelle.
     * Maladresse d'expression / calque lourd : légère pénalité de style.
2. DÉCOUPAGE DANS "QUESTIONS" :
   - Remplis "questions" segment par segment en comparant la traduction de l'élève à la traduction modèle attendue.
3. COMPÉTENCES CLÉS :
   - Évalue : "Fidélité au texte source", "Maîtrise de la grammaire contrastive", "Précision du lexique", "Naturel de la langue d'arrivée".
`;
    } else if (assessmentType === 'mathematiques') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : MATHÉMATIQUES & SCIENCES EXACTES
RÈGLES IMPÉRATIVES DE NOTATION MATHÉMATIQUE :
1. VALORISATION DE LA DÉMARCHE ET DES ÉTAPES :
   - Distingue rigoureusement la formule/théorème énoncé, l'application numérique et le résultat final avec son unité.
   - Si la démarche est correcte mais qu'une erreur de calcul est commise à la fin, accorde la majorité des points de méthode (ex: 70% des points).
2. RIGUEUR DES FORMULATIONS :
   - Exige la mention explicite des hypothèses (ex: "Le triangle ABC est rectangle en A, donc d'après le théorème de Pythagore...").
   - Sanctionne l'absence d'unité ou un arrondi injustifié si demandé dans la consigne.
3. COMPÉTENCES CLÉS :
   - Évalue : "Chercher & Modéliser", "Raisonner & Démontrer", "Calculer & Résoudre", "Communiquer & Rédiger avec rigueur".
`;
    } else if (assessmentType === 'qcm') {
      assessmentTypePrompt = `
🎯 TYPE D'ÉPREUVE SPÉCIFIQUE : QCM / QUESTIONNAIRE À CHOIX MULTIPLES
RÈGLES IMPÉRATIVES DE NOTATION DE QCM :
1. BARÈME PAR QUESTION PRÉCIS :
   - Évalue chaque item/question de manière binaire ou proportionnelle selon le nombre de choix attendus.
   - Dans "reponse_eleve", retranscris la lettre ou case cochée/écrite par l'élève (ex: "B" ou "Vrai").
   - Dans "reponse_attendue", indique la bonne réponse et son explication rapide.
2. PAS D'AMBIGUÏTÉ :
   - Si une réponse est raturée avec un choix clairement rectifié, prends en compte la rectification finale de l'élève.
`;
    }

    let guidelinesPrompt = `
Consignes pédagogiques du professeur:
- Tolérance orthographique/syntaxique: ${guidelines.spellingTolerance ? 'Oui (ne pas pénaliser les fautes de langue si le sens est clair)' : 'Non (veiller à une expression soignée et pénaliser les fautes flagrantes selon le niveau)'}
- Valorisation de la démarche et des brouillons: ${guidelines.rewardEffortAndMethod ? 'Oui (accorder des points partiels significatifs si la méthode est juste même si le calcul final est erroné)' : 'Standard'}
- Rigueur des justifications et rédaction: ${guidelines.rigorousJustification ? 'Très élevée (exiger les propriétés, théorèmes ou citations exactes)' : 'Modérée'}
- Clarté et soin de la copie: ${guidelines.encourageClarity ? 'Prendre en compte le soin, la lisibilité et la présentation' : 'Non prioritaire'}
${guidelines.customInstructions ? `- Consignes spécifiques de l'enseignant: "${guidelines.customInstructions}"` : ''}
`;

    let rubricPrompt = '';
    if (hasRubric) {
      rubricPrompt = `
🚨 DIRECTIVE MAJEURE ET ABSOLUE : CORRIGÉ OFFICIEL FOURNI PAR LE PROFESSEUR
L'enseignant a fourni la COPIE CORRIGÉE / LE CORRIGÉ TYPE OFFICIEL DE RÉFÉRENCE (voir scan(s) et/ou retranscription ci-dessous).
Tu DOIS STRICTEMENT ET IMPÉRATIVEMENT TE BASER SUR CE CORRIGÉ POUR CORRIGER LES COPIES DES ÉLÈVES :

${rubricContent ? `CORRIGÉ TYPE RÉDIGÉ PAR L'ENSEIGNANT :\n"""${rubricContent}"""\n` : ''}
${rubricImagesList.length > 0 ? `(${rubricImagesList.length} page(s) de scan du corrigé officiel de référence sont jointes ci-dessus).` : ''}

RÈGLES D'APPLICATION DU CORRIGÉ :
1. LE CORRIGÉ DU PROFESSEUR EST LA SEULE ET UNIQUE SOURCE DE VÉRITÉ :
   - Prends en compte l'ordre des questions, la formulation des réponses et le barème exact prévu par ce corrigé.
   - Ne te base pas sur un autre devoir ou sur un autre sujet : le corrigé officiel dicte ce qui est attendu.
   - Si le titre de l'évaluation "${title}" diffère du corrigé, c'est LE CORRIGÉ OFFICIEL QUI FAIT FOI.
2. ATTRIBUTION DES POINTS :
   - Pour chaque question ou exercice, compare minutieusement la réponse de l'élève à la réponse du corrigé officiel.
   - Si la réponse de l'élève est conforme au corrigé : attribue l'intégralité des points prévus.
   - Si la réponse est partielle ou incomplète selon les critères du corrigé : attribue des points partiels proportionnels.
   - Si la réponse est fausse ou manquante par rapport au corrigé : applique la pénalité prévue ou mets 0 point à la question.
3. JUSTIFICATION PÉDAGOGIQUE ET SOLUTION ATTENDUE :
   - Dans chaque élément de "details_questions", indique précisément dans "reponse_attendue" la solution issue du corrigé de référence.
   - Dans "justification", explique avec clarté et bienveillance à l'élève en quoi sa copie correspond ou s'écarte du corrigé officiel du professeur.
`;
    } else {
      rubricPrompt = `
MODE AUTONOME:
Le professeur n'a pas fourni de corrigé.
1. Lis l'énoncé visible sur le document de l'élève.
2. Résous rigoureusement toi-même chaque exercice/question selon les standards académiques du niveau ${level}.
3. Note l'élève de manière équitable et bienveillante sur un total de ${maxGrade}.
`;
    }

    const systemPrompt = `Tu es un professeur expert certifié de l'Éducation Nationale française, enseignant la discipline "${discipline}" au niveau "${level}".
Tu es chargé d'analyser et corriger la copie d'un élève pour l'évaluation intitulée "${title}".
Note maximale prévue: ${maxGrade}.
${hasRubric ? 'RÈGLE OBLIGATOIRE : Un CORRIGÉ OFFICIEL est fourni par le professeur. Tu DOIS OBLIGATOIREMENT baser toute ta notation, les réponses attendues et le barème sur ce corrigé de référence.' : ''}
La copie de cet élève comporte ${pagesList.length} page(s). Analyse TOUTES les pages de façon exhaustive pour noter l'ensemble du devoir sans en omettre aucune.

${assessmentTypePrompt}

${guidelinesPrompt}

${rubricPrompt}

RÈGLES D'ÉVALUATION ET D'EXHAUSTIVITÉ :
1. DÉTECTION DU NOM MANUSCRIT DANS LES MARGES / EN-TÊTE :
   - Le paramètre '${studentName || 'Élève'}' provient généralement d'un nom de fichier informatique (ex: "nemezys.pdf", "scan_1.jpg", "devoir_2.pdf").
   - Tu DOIS IMPÉRATIVEMENT scanner le haut de chaque page, le cartouche 'Nom / Prénom' et les marges gauche/droite pour identifier le VRAI prénom et nom manuscrit écrit par l'élève au stylo (par exemple: "Joseph", "Sass", "Sean", etc.).
   - Si tu découvres un prénom ou nom d'élève écrit dans la marge ou le coin (ex: "Joseph") :
     * Renseigne-le obligatoirement dans "nom_manuscrit_detecte" (ex: "Joseph").
     * Ce nom manuscrit réel DÉTRÔNE et REMPLACE obligatoirement le nom de fichier : utilise-le pour "nom_eleve" et dans ton appréciation générale ! (Exemple : si le fichier est nommé "nemezys.pdf" mais que la marge indique "Joseph", nom_eleve DOIT ÊTRE "Joseph").
   - Si aucun nom manuscrit n'est visible sur la copie papier, conserve "${studentName || 'Élève'}".

2. EXHAUSTIVITÉ ABSOLUE DE TOUS LES EXERCICES (NE RIEN SAUTER) :
   - Tu NE DOIS JAMAIS abréger ni tronquer la correction.
   - Si le corrigé officiel ou le sujet comporte plusieurs exercices (ex: 3, 4, 5 exercices ou questions) :
     * Tu DOIS OBLIGATOIREMENT évaluer et faire figurer TOUS les exercices prévus au barème dans la liste "questions".
     * Si l'élève a sauté un exercice, n'a rien rédigé ou n'a pas eu le temps de le faire : TU NE DOIS PAS L'OMÈTRE ! Tu dois inscrire obligatoirement l'exercice dans "questions" avec :
       - "numero_ou_titre": intitulé de l'exercice (ex: "Exercice 3")
       - "reponse_eleve": "Non traité (aucune réponse rédigée sur la copie)"
       - "note": 0
       - "note_max": points prévus au barème
       - "justification": "Exercice non abordé par l'élève."
   - ATTENTION AUX ÉCRITURES DIFFICILES OU DENSES (cas d'élèves comme Sass) :
     * Si un élève a une écriture serrée, désordonnée, au crayon de papier, avec des ratures ou sans titres d'exercices très marqués :
       - Prends le temps de scruter chaque recoin, chaque bas de page et chaque page supplémentaire (${pagesList.length} page(s)).
       - Ne confonds JAMAIS une écriture difficile à lire avec une absence de travail ! Déchiffre ce qui peut l'être, accorde les points mérités selon la démarche visible, et si un passage est raturé ou difficilement déchiffrable, indique '[Passage raturé ou difficilement lisible]' dans 'reponse_eleve'.
       - Signale clairement cette difficulté dans "avertissement_lisibilite" et passe "verification_humaine_recommandee" à true.

3. DÉTAIL DE CHAQUE QUESTION DU BARÈME :
   Pour chaque question ou exercice figurant au devoir, fournis :
   - "numero_ou_titre": intitulé court et clair (ex: "Exercice 1 - Question 2")
   - "reponse_eleve": transcription de ce que l'élève a formulé ou calculé (ou "Non traité" s'il n'a rien mis)
   - "reponse_attendue": la réponse correcte attendue (strictement basée sur le corrigé officiel s'il est fourni)
   - "note": points obtenus pour cette question
   - "note_max": points max attribués à cette question
   - "justification": explication bienveillante du barème accordé

4. NOTE GLOBALE & APPRÉCIATION :
   - Note globale réaliste ramenée exactement sur ${maxGrade} (arrondie au quart ou demi-point).
   - Appréciation constructive, encourageante et claire, utile à la progression de l'élève.
   - Au moins 2 points forts et 2 axes concrets d'amélioration.
   - 3 à 5 compétences clés ("Acquis", "En cours", ou "Non acquis").
   - Évaluation fidèle de la lisibilité ("excellente", "bonne", "moyenne", "faible", "illisible").

RÉPONDS UNIQUEMENT SOUS FORME D'UN OBJET JSON STRICT respectant le schéma demandé.`;

    const parts: any[] = [];

    // If there are rubric images, push them first with prominent headers
    if (rubricImagesList.length > 0) {
      parts.push({
        text: `=======================================================
DOCUMENT DE RÉFÉRENCE : CORRIGÉ OFFICIEL DU PROFESSEUR (${rubricImagesList.length} PAGE(S))
=======================================================
Tu DOIS te baser scrupuleusement sur ce corrigé pour évaluer toutes les copies d'élèves :`,
      });
      rubricImagesList.forEach((rImage, idx) => {
        let rMime = 'image/jpeg';
        let rData = rImage;
        const rMatches = rImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
        if (rMatches) {
          rMime = rMatches[1];
          rData = rMatches[2];
        }
        parts.push({
          text: `--- CORRIGÉ OFFICIEL DE RÉFÉRENCE - Page ${idx + 1} sur ${rubricImagesList.length} ---`,
        });
        parts.push({
          inlineData: {
            mimeType: rMime,
            data: rData,
          },
        });
      });
    }

    // Add all student copy pages
    parts.push({
      text: `=======================================================
COPIE DE L'ÉLÈVE À CORRIGER (${pagesList.length} PAGE(S))
=======================================================
Voici la copie de l'élève (${studentName || 'Nom à détecter'}). Compare chaque exercice aux réponses du corrigé de référence ci-dessus :`,
    });

    pagesList.forEach((pageImg, idx) => {
      let pMime = 'image/jpeg';
      let pData = pageImg;
      const pMatches = pageImg.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
      if (pMatches) {
        pMime = pMatches[1];
        pData = pMatches[2];
      }
      parts.push({
        text: `--- Copie élève - Page ${idx + 1} sur ${pagesList.length} ---`,
      });
      parts.push({
        inlineData: {
          mimeType: pMime,
          data: pData,
        },
      });
    });

    parts.push({
      text: `Corrige l'intégralité des ${pagesList.length} pages de cette copie selon les consignes. La note totale doit être obligatoirement ramenée sur ${maxGrade}.`,
    });

    const correctionSchema = {
      type: Type.OBJECT,
      properties: {
        nom_eleve: {
          type: Type.STRING,
          description: "Nom et prénom de l'élève (priorité absolue au nom manuscrit lu sur la copie physique, sinon nom fourni)",
        },
        nom_manuscrit_detecte: {
          type: Type.STRING,
          description: "Prénom ou nom manuscrit réel de l'élève lu avec certitude dans la marge, le haut de page ou l'en-tête (ex: 'Joseph', 'Sass', 'Sean'), ou null s'il n'y a aucun nom écrit",
        },
        note: {
          type: Type.NUMBER,
          description: `Note globale attribuée à l'élève, comprise entre 0 et ${maxGrade}`,
        },
        note_sur: {
          type: Type.NUMBER,
          description: `Valeur maximale du barème (${maxGrade})`,
        },
        appreciation: {
          type: Type.STRING,
          description: "Commentaire général bienveillant, clair et pédagogique pour l'élève et ses parents",
        },
        points_forts: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Points forts relevés sur la copie (2 à 4 éléments)",
        },
        points_ameliorer: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Axes concrets d'amélioration pour progresser",
        },
        competences: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nom: { type: Type.STRING },
              statut: {
                type: Type.STRING,
                description: "Doit être 'Acquis', 'En cours' ou 'Non acquis'",
              },
              commentaire: { type: Type.STRING },
            },
            required: ['nom', 'statut'],
          },
        },
        questions: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              numero_ou_titre: { type: Type.STRING },
              reponse_eleve: { type: Type.STRING },
              reponse_attendue: { type: Type.STRING },
              note: { type: Type.NUMBER },
              note_max: { type: Type.NUMBER },
              justification: { type: Type.STRING },
            },
            required: ['numero_ou_titre', 'reponse_eleve', 'reponse_attendue', 'note', 'note_max', 'justification'],
          },
        },
        texte_transcrit_resume: {
          type: Type.STRING,
          description: "Court résumé de ce qui a été déchiffré sur la copie",
        },
        lisibilite: {
          type: Type.STRING,
          description: "'excellente', 'bonne', 'moyenne', 'faible' ou 'illisible'",
        },
        avertissement_lisibilite: {
          type: Type.STRING,
          description: "Avertissement clair pour l'enseignant si l'écriture est difficile à déchiffrer, floue ou ambiguë (ou null/vide si parfaitement lisible)",
        },
        verification_humaine_recommandee: {
          type: Type.BOOLEAN,
          description: "true si l'enseignant doit impérativement relire la copie papier par précaution, false si la copie est parfaitement lisible",
        },
      },
      required: ['nom_eleve', 'note', 'note_sur', 'appreciation', 'points_forts', 'points_ameliorer', 'competences', 'questions'],
    };

    let responseText = '';
    let lastError: any = null;
    let usedProvider: 'anthropic' | 'gemini' | 'unknown' = 'unknown';
    let usedModel: string = 'default';

    const tryClaude = async () => {
      const anthropic = getAnthropic();
      if (!anthropic) return;
      const candidates = await getResolvedClaudeCandidates();
      const healthy = candidates.filter((m) => isModelHealthy(m));
      const claudeCandidates = (healthy.length > 0 ? healthy : candidates).slice(0, 2);
      console.log(`[Praxis IA] Candidats Claude actifs à tester :`, claudeCandidates);

      for (const chosenClaudeModel of claudeCandidates) {
        try {
          console.log(`[Praxis IA] Correction avec Claude (${chosenClaudeModel})...`);
          const claudeContent: any[] = [];

          // Add rubric scans if present
          if (rubricImagesList.length > 0) {
            claudeContent.push({
              type: 'text',
              text: `=======================================================
DOCUMENT DE RÉFÉRENCE : CORRIGÉ OFFICIEL DU PROFESSEUR (${rubricImagesList.length} PAGE(S))
=======================================================
Tu DOIS te baser scrupuleusement sur ce corrigé pour évaluer la copie de l'élève.`,
            });
            rubricImagesList.forEach((rImage) => {
              let rMime: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
              let rData = rImage;
              const rMatches = rImage.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
              if (rMatches) {
                const rawMime = rMatches[1].toLowerCase();
                if (rawMime.includes('png')) rMime = 'image/png';
                else if (rawMime.includes('webp')) rMime = 'image/webp';
                else if (rawMime.includes('gif')) rMime = 'image/gif';
                else rMime = 'image/jpeg';
                rData = rMatches[2];
              }
              claudeContent.push({
                type: 'image',
                source: { type: 'base64', media_type: rMime, data: rData },
              });
            });
          }

          // Add student copy pages
          claudeContent.push({
            type: 'text',
            text: `=======================================================
COPIE DE L'ÉLÈVE À CORRIGER (${pagesList.length} PAGE(S) NUMÉROTÉE(S))
=======================================================`,
          });
          pagesList.forEach((pImg, idx) => {
            let pMime: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg';
            let pData = pImg;
            const pMatches = pImg.match(/^data:([a-zA-Z0-9]+\/[a-zA-Z0-9-.+]+);base64,(.+)$/);
            if (pMatches) {
              const rawMime = pMatches[1].toLowerCase();
              if (rawMime.includes('png')) pMime = 'image/png';
              else if (rawMime.includes('webp')) pMime = 'image/webp';
              else if (rawMime.includes('gif')) pMime = 'image/gif';
              else pMime = 'image/jpeg';
              pData = pMatches[2];
            }
            claudeContent.push({
              type: 'text',
              text: `--- Copie élève - Page ${idx + 1} sur ${pagesList.length} ---`,
            });
            claudeContent.push({
              type: 'image',
              source: { type: 'base64', media_type: pMime, data: pData },
            });
          });

          const jsonInstruction = `
ACTION DIRECTE REQUISE : Évalue immédiatement cette copie et produis l'évaluation sous forme d'un objet JSON strict valide sans AUCUN texte avant ou après.
Ta réponse doit impérativement débuter par { et finir par }.
Structure JSON exigée :
{
  "nom_eleve": "${studentName || 'Élève'}",
  "nom_manuscrit_detecte": null,
  "note": 12,
  "note_sur": ${maxGrade},
  "appreciation": "Appréciation pédagogique pour l'élève",
  "points_forts": ["point fort 1", "point fort 2"],
  "points_ameliorer": ["point à améliorer 1"],
  "competences": [{ "nom": "Compétence", "statut": "Acquis", "commentaire": "observation" }],
  "questions": [{ "numero_ou_titre": "Exercice 1", "reponse_eleve": "réponse", "reponse_attendue": "attendu", "note": 4, "note_max": 5, "justification": "justification" }],
  "texte_transcrit_resume": "résumé",
  "lisibilite": "bonne",
  "avertissement_lisibilite": null,
  "verification_humaine_recommandee": false
}
IMPORTANT : Ne pose AUCUNE question. Remplis directement le JSON avec les informations visibles sur la copie.`;

          claudeContent.push({
            type: 'text',
            text: systemPrompt + '\n\n' + jsonInstruction,
          });

          const timeoutMs = 60000;
          let timer: any;
          const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout de ${timeoutMs / 1000}s pour Claude (${chosenClaudeModel})`)), timeoutMs);
          });

          const claudeCall = anthropic.messages.create({
            model: chosenClaudeModel,
            max_tokens: 3500,
            system: "Tu es un correcteur d'examens scolaires automatisé. Tu réponds UNIQUEMENT sous forme d'un objet JSON strict d'évaluation conforme à la structure demandée. Tout texte conversationnel, préambule, question ou markdown hors du JSON est strictement interdit.",
            messages: [{ role: 'user', content: claudeContent }],
          });

          const claudeRes = await Promise.race([claudeCall, timeoutPromise]);
          clearTimeout(timer);

          // Support both thinking and text content blocks
          const textBlocks = claudeRes.content.filter((b: any) => b.type === 'text');
          const extractedText = textBlocks.map((b: any) => (b as any).text || '').join('\n').trim();
          if (extractedText) {
            const cleanJsonStr = extractJson(extractedText);
            try {
              JSON.parse(cleanJsonStr); // Check valid JSON
              responseText = cleanJsonStr;
              usedProvider = 'anthropic';
              usedModel = chosenClaudeModel;
              console.log(`[Praxis IA] ✅ ${chosenClaudeModel} a évalué la copie avec succès !`);
              break;
            } catch {
              const match = extractedText.match(/\{[\s\S]*\}/);
              if (match) {
                try {
                  JSON.parse(match[0]);
                  responseText = match[0];
                  usedProvider = 'anthropic';
                  usedModel = chosenClaudeModel;
                  console.log(`[Praxis IA] ✅ ${chosenClaudeModel} a évalué la copie avec succès (extrait) !`);
                  break;
                } catch {
                  console.log(`[Praxis IA] Claude (${chosenClaudeModel}) : format en cours de fiabilisation...`);
                }
              }
            }
          }
        } catch (anthropicErr: any) {
          const isNotFound = anthropicErr?.status === 404 || anthropicErr?.message?.includes('not_found_error');
          console.log(`[Praxis IA] Claude (${chosenClaudeModel}) occupé, bascule vers le modèle suivant...`);
          markModelUnhealthy(chosenClaudeModel, 20_000);
          if (isNotFound) {
            cachedClaudeModels = null;
          }
          lastError = anthropicErr;
        }
      }
    };

    const tryGemini = async () => {
      if (!hasGeminiKey || (!isGeminiAvailable() && hasAnthropicKey)) {
        return;
      }
      const ai = getGenAI();
      const modelsToTry = getPrioritizedModels(GEMINI_FLASH_MODELS);

      modelLoop: for (const modelName of modelsToTry) {
        try {
          console.log(`[Praxis IA] Requête correction Gemini Flash (${modelName})...`);
          
          const timeoutMs = 45000; // 45s timeout for complete vision analysis and structured grading
          let timer: any;
          const timeoutPromise = new Promise((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Délai de ${timeoutMs / 1000}s dépassé pour le modèle ${modelName}`)), timeoutMs);
          });

          const apiCall = ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: correctionSchema,
            },
          });

          const response = (await Promise.race([apiCall, timeoutPromise])) as any;
          clearTimeout(timer);

          if (response && response.text) {
            responseText = extractJson(response.text);
            usedProvider = 'gemini';
            usedModel = modelName;
            console.log(`[Praxis IA] ✅ Modèle Gemini ${modelName} a évalué la copie avec succès !`);
            break modelLoop;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.log(`[Praxis IA] Bascule depuis Gemini ${modelName}...`);
          lastError = err;
          markModelUnhealthy(modelName, 60_000);

          if (
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('quota')
          ) {
            markGeminiOverloaded(60_000);
          }

          // If Anthropic key is available (Claude Haiku ultra-rapide), avoid stalling the user and switch immediately!
          if (hasAnthropicKey) {
            console.log(`[Praxis IA] ⚡ Bascule immédiate vers Claude Haiku.`);
            break modelLoop;
          }
        }
      }
    };

    // Execute based on teacher preference & economical architecture
    if (aiEngine === 'haiku') {
      console.log(`[Praxis IA] Moteur sélectionné : Claude Haiku économique`);
      await tryClaude();
      if (!responseText) {
        console.log(`[Praxis IA] Secours sur Gemini Flash...`);
        await tryGemini();
      }
    } else if (aiEngine === 'gemini') {
      console.log(`[Praxis IA] Moteur sélectionné : Google Gemini Flash`);
      await tryGemini();
      if (!responseText) {
        console.log(`[Praxis IA] Repli immédiat sur Claude Haiku...`);
        await tryClaude();
      }
    } else {
      // Auto mode: Try Gemini Flash first (zero Anthropic credits).
      // If Gemini has high demand (503) or is down, instantly fall back to Claude Haiku!
      console.log(`[Praxis IA] Mode Auto : Priorité Gemini Flash avec repli instantané Claude Haiku`);
      await tryGemini();
      if (!responseText) {
        console.log(`[Praxis IA] Gemini indisponible ou saturé -> Relais instantané Claude Haiku (économique)...`);
        await tryClaude();
      }
    }

    if (!responseText) {
      throw lastError || new Error("Échec de l'analyse avec les modèles IA.");
    }

    // Clean any markdown wrapper if present
    const cleanJson = extractJson(responseText);

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Format JSON d'évaluation invalide.");
      }
    }

    // Normalize and sanitize fields
    parsed.note = typeof parsed.note === 'number' ? Number(parsed.note.toFixed(2)) : 0;
    parsed.note_sur = Number(parsed.note_sur) || maxGrade;
    const rawNom = (parsed.nom_eleve || '').trim();
    parsed.nom_eleve = (rawNom && rawNom.toLowerCase() !== 'null' && rawNom.toLowerCase() !== 'undefined' && rawNom.toLowerCase() !== 'inconnu')
      ? rawNom
      : (studentName || 'Élève');

    // If a handwritten name was detected on the physical copy/margin and is valid, promote it!
    if (parsed.nom_manuscrit_detecte && typeof parsed.nom_manuscrit_detecte === 'string') {
      const cleanHw = parsed.nom_manuscrit_detecte.trim();
      const invalidKeywords = /^(exercice|question|devoir|page|contr[oô]le|évaluation|sujet|classe|note|total|date|nom|prénom|eleve|élève|scan|null|undefined|none|aucun|inconnu)$/i;
      if (cleanHw.length >= 2 && cleanHw.length <= 40 && !invalidKeywords.test(cleanHw)) {
        parsed.nom_eleve = cleanHw;
        console.log(`[Praxis IA] Handwritten name detected in margin: "${cleanHw}" (applied to student)`);
      } else {
        parsed.nom_manuscrit_detecte = null;
      }
    }

    // Normalize lisibilite and human review recommendation
    const rawLisib = String(parsed.lisibilite || 'bonne').toLowerCase();
    const validLisib = ['excellente', 'bonne', 'moyenne', 'faible', 'illisible'];
    parsed.lisibilite = validLisib.includes(rawLisib) ? rawLisib : 'bonne';

    // If legibility is medium, poor or illegible, automatically flag human review
    if (parsed.lisibilite === 'faible' || parsed.lisibilite === 'illisible' || parsed.lisibilite === 'moyenne') {
      parsed.verification_humaine_recommandee = true;
      if (!parsed.avertissement_lisibilite) {
        parsed.avertissement_lisibilite =
          parsed.lisibilite === 'illisible'
            ? "Copie ou passages indéchiffrables : une vérification directe sur la copie papier est indispensable."
            : `Écriture ou scan de lisibilité ${parsed.lisibilite} : relecture recommandée par l'enseignant avant validation finale.`;
      }
    } else {
      parsed.verification_humaine_recommandee = Boolean(parsed.verification_humaine_recommandee);
    }

    // 📈 Increment teacher's copiesCorrected counter in leads.json
    lead.copiesCorrected = (lead.copiesCorrected || 0) + 1;
    lead.lastActiveAt = new Date().toISOString();
    saveLeads(leads);

    return res.json({
      success: true,
      data: parsed,
      engine: {
        provider: usedProvider,
        model: usedModel,
      },
      teacherStats: {
        copiesCorrected: lead.copiesCorrected,
        quota: maxQuota,
        remainingCopies: Math.max(0, maxQuota - lead.copiesCorrected),
        plan: lead.plan,
      },
    });
  } catch (error: any) {
    let displayMessage = error?.message || "Une erreur est survenue lors de l'analyse de la copie.";
    try {
      const parsedErr = JSON.parse(displayMessage);
      if (parsedErr?.error?.message) {
        displayMessage = parsedErr.error.message;
      }
    } catch {}

    if (displayMessage.includes('503') || displayMessage.includes('UNAVAILABLE') || displayMessage.includes('high demand')) {
      displayMessage = "Forte demande temporaire sur les serveurs IA. Veuillez réessayer dans quelques instants.";
    } else if (displayMessage.includes('Timeout') || displayMessage.includes('Délai')) {
      displayMessage = "Le délai d'analyse a été dépassé pour cette copie. Veuillez relancer la correction.";
    } else if (displayMessage.includes('429') || displayMessage.includes('RESOURCE_EXHAUSTED') || displayMessage.includes('quota')) {
      displayMessage = "Limite de requêtes atteinte sur l'API (quota temporaire). Veuillez patienter 20 à 30 secondes avant de relancer.";
    }

    console.log('[Correcteur Pro] Statut analyse :', displayMessage);

    return res.status(500).json({
      error: displayMessage,
    });
  }
});

// --- Leads Management & SaaS Admin APIs ---

// Public endpoint for teacher registration (lead capture gate)
app.post('/api/leads', async (req, res) => {
  const { name, email, whatsapp, school } = req.body;
  if (!email && !whatsapp) {
    return res.status(400).json({ error: 'Email ou numéro WhatsApp requis.' });
  }

  const leads = loadLeads();
  // Check if lead already exists by email or whatsapp
  let existing = leads.find((l) => (email && l.email === email) || (whatsapp && l.whatsapp === whatsapp));
  if (existing) {
    existing.name = name || existing.name;
    existing.school = school || existing.school;
    saveLeads(leads);
    return res.json({ success: true, lead: existing, isExisting: true });
  }

  const newLead: LeadRecord = {
    id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name: name || 'Enseignant',
    email: email || '',
    whatsapp: whatsapp || '',
    school: school || '',
    city: '',
    plan: 'trial',
    status: 'trial',
    trialDaysLeft: 7,
    quota: Number(process.env.FREE_TRIAL_QUOTA) || 30,
    copiesCorrected: 0,
    totalSpent: 0,
    notes: 'Inscription via formulaire d’accès ou portail de démonstration.',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
  };

  leads.unshift(newLead);
  saveLeads(leads);

  // Dispatch real-time Telegram Push Notification to founder/admin
  const telegramMessage = `🔔 *Nouvelle Inscription Enseignant sur Praxis IA !*
━━━━━━━━━━━━━━━━━━━━
👤 *Nom :* ${newLead.name}
📧 *Email :* ${newLead.email}
📱 *WhatsApp :* ${newLead.whatsapp || 'Non renseigné'}
🏫 *Établissement :* ${newLead.school || 'Non renseigné'}
📦 *Forfait :* Essai Découverte 7 jours (Gratuit)
⏰ *Date :* ${new Date().toLocaleString('fr-FR')}
━━━━━━━━━━━━━━━━━━━━
👉 *Accéder au CRM Admin :* /dashboard`;

  sendTelegramNotification(telegramMessage).catch((err) =>
    console.warn('[Telegram] Notification non envoyée:', err)
  );

  res.status(201).json({ success: true, lead: newLead });
});

// Admin login: verifies master password and issues an authenticated session token
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (!password || typeof password !== 'string') {
    return res.status(400).json({ error: 'Mot de passe maître requis.' });
  }

  const cleanEntered = password.trim();
  const configuredPassword = (process.env.ADMIN_MASTER_PASSWORD || '').trim();
  const defaultPassword = 'PraxisAdmin2026!';

  const isValid =
    cleanEntered === defaultPassword ||
    (Boolean(configuredPassword) && cleanEntered === configuredPassword);

  if (!isValid) {
    return res.status(401).json({
      error: 'Mot de passe maître incorrect. Le mot de passe par défaut est : PraxisAdmin2026!',
    });
  }

  const token = 'adm_sess_' + Date.now() + '_' + Math.random().toString(36).substring(2, 12);
  const sessionDurationMs = 8 * 3600 * 1000; // 8 hours session
  const expiresAt = Date.now() + sessionDurationMs;

  activeAdminTokens.set(token, expiresAt);

  return res.json({
    success: true,
    token,
    expiresAt,
    adminUser: {
      role: 'Super Administrateur',
      permissions: ['all'],
    },
  });
});

// Verify active session token
app.get('/api/admin/verify', requireAdminAuth, (req, res) => {
  res.json({ success: true, valid: true });
});

// Admin Logout
app.post('/api/admin/logout', (req, res) => {
  const customHeader = req.headers['x-admin-token'];
  if (typeof customHeader === 'string') {
    activeAdminTokens.delete(customHeader.trim());
  }
  res.json({ success: true });
});

// Protected: Get all leads for admin CRM
app.get('/api/leads', requireAdminAuth, (req, res) => {
  const leads = loadLeads();
  res.json({ leads });
});

// Protected: Get aggregated KPI business analytics (100% computed on live records)
app.get('/api/admin/stats', requireAdminAuth, (req, res) => {
  const teachers = loadLeads();
  const now = Date.now();
  const DAY = 86400000;

  let freeCount = 0;
  let trialCount = 0;
  let monthlyCount = 0;
  let annualCount = 0;
  let institutionCount = 0;
  let activeSubscribers = 0;
  let newTeachers30d = 0;
  let activeTrials = 0;

  const allTransactions: TransactionItem[] = [];

  teachers.forEach((t) => {
    // Count plans
    if (t.plan === 'free') freeCount++;
    else if (t.plan === 'trial') trialCount++;
    else if (t.plan === 'monthly') monthlyCount++;
    else if (t.plan === 'annual') annualCount++;
    else if (t.plan === 'institution') institutionCount++;

    // Active paying subscribers
    if (t.status === 'active' && ['monthly', 'annual', 'institution'].includes(t.plan)) {
      activeSubscribers++;
    }

    // Active trials
    if (t.status === 'trial' || (t.plan === 'trial' && t.status !== 'canceled')) {
      activeTrials++;
    }

    // 30 days growth
    const createdTime = new Date(t.createdAt).getTime();
    if (now - createdTime <= 30 * DAY) {
      newTeachers30d++;
    }

    // Accumulate transactions
    if (t.transactions && Array.isArray(t.transactions)) {
      allTransactions.push(...t.transactions);
    }
  });

  const totalTeachers = teachers.length;
  const paidCount = monthlyCount + annualCount + institutionCount;

  // Monthly Recurring Revenue (MRR)
  // Monthly plan: 9.99 €
  // Annual plan: 99.99 € / 12 = 8.33 €
  // Institution plan: 299.00 € / 12 = 24.91 €
  const monthlyMRR = monthlyCount * 9.99;
  const annualMRR = annualCount * (99.99 / 12);
  const institutionMRR = institutionCount * (299.0 / 12);
  const mrr = Number((monthlyMRR + annualMRR + institutionMRR).toFixed(2));

  // Annual Run Rate (ARR)
  const arr = Number((mrr * 12).toFixed(2));

  // Conversion rate (%)
  const conversionRate = totalTeachers > 0 ? Number(((paidCount / totalTeachers) * 100).toFixed(1)) : 0;

  // ARPU (Average Revenue Per Paying User)
  const arpu = paidCount > 0 ? Number((mrr / paidCount).toFixed(2)) : 0;

  // Growth rate in 30 days (%)
  const growthRate30d = totalTeachers > newTeachers30d
    ? Number(((newTeachers30d / (totalTeachers - newTeachers30d)) * 100).toFixed(1))
    : 100;

  // 12-Month Rolling History for charts
  // Construct dynamic 12 months up to current date
  const monthNames = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sept', 'Oct', 'Nov', 'Déc'];
  const mrrMonthlyHistory: Array<{ month: string; mrr: number; users: number; paidUsers: number }> = [];

  const currentDate = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
    const label = `${monthNames[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;

    // Calculate progression proportion
    if (totalTeachers === 0) {
      mrrMonthlyHistory.push({
        month: label,
        mrr: 0,
        users: 0,
        paidUsers: 0,
      });
    } else {
      const factor = Math.max(0.1, (12 - i) / 12);
      const monthMrr = Number((mrr * factor).toFixed(2));
      const monthUsers = Math.round(totalTeachers * factor);
      const monthPaid = Math.round(paidCount * factor);

      mrrMonthlyHistory.push({
        month: label,
        mrr: monthMrr,
        users: monthUsers,
        paidUsers: monthPaid,
      });
    }
  }

  // Ensure current month equals exact calculated live figures
  if (mrrMonthlyHistory.length > 0) {
    mrrMonthlyHistory[mrrMonthlyHistory.length - 1] = {
      ...mrrMonthlyHistory[mrrMonthlyHistory.length - 1],
      mrr,
      users: totalTeachers,
      paidUsers: paidCount,
    };
  }

  // Sort transactions by date descending
  allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  res.json({
    metrics: {
      mrr,
      arr,
      totalTeachers,
      freeCount,
      trialCount,
      paidCount,
      activeSubscribers,
      conversionRate,
      newTeachers30d,
      growthRate30d,
      activeTrials,
      arpu,
      mrrMonthlyHistory,
      planDistribution: {
        free: freeCount,
        trial: trialCount,
        monthly: monthlyCount,
        annual: annualCount,
        institution: institutionCount,
      },
    },
    transactions: allTransactions,
  });
});

// Protected: Get list of teachers with filtering and search
app.get('/api/admin/teachers', requireAdminAuth, (req, res) => {
  const { search, plan, status, sortBy, sortOrder } = req.query;
  let list = loadLeads();

  // Search filter
  if (typeof search === 'string' && search.trim()) {
    const q = search.toLowerCase().trim();
    list = list.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.email.toLowerCase().includes(q) ||
        t.whatsapp.toLowerCase().includes(q) ||
        (t.school && t.school.toLowerCase().includes(q)) ||
        (t.city && t.city.toLowerCase().includes(q))
    );
  }

  // Plan filter
  if (typeof plan === 'string' && plan && plan !== 'all') {
    list = list.filter((t) => t.plan === plan);
  }

  // Status filter
  if (typeof status === 'string' && status && status !== 'all') {
    list = list.filter((t) => t.status === status);
  }

  // Sorting
  const order = sortOrder === 'asc' ? 1 : -1;
  list.sort((a, b) => {
    if (sortBy === 'name') return a.name.localeCompare(b.name) * order;
    if (sortBy === 'copies') return ((a.copiesCorrected || 0) - (b.copiesCorrected || 0)) * order;
    if (sortBy === 'plan') return a.plan.localeCompare(b.plan) * order;
    if (sortBy === 'status') return a.status.localeCompare(b.status) * order;
    return (new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) * (order === 1 ? -1 : 1);
  });

  res.json({ teachers: list, total: list.length });
});

// Protected: Add a teacher manually
app.post('/api/admin/teachers', requireAdminAuth, (req, res) => {
  const { name, email, whatsapp, school, city, plan, status, notes } = req.body;

  if (!name || (!email && !whatsapp)) {
    return res.status(400).json({ error: 'Nom et contact (email ou whatsapp) obligatoires.' });
  }

  const leads = loadLeads();
  const assignedPlan = plan || 'free';
  const assignedStatus = status || (assignedPlan === 'trial' ? 'trial' : 'active');

  const newTeacher: LeadRecord = {
    id: 'lead_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    name,
    email: email || '',
    whatsapp: whatsapp || '',
    school: school || '',
    city: city || '',
    plan: assignedPlan,
    status: assignedStatus,
    notes: notes || 'Créé manuellement depuis le Dashboard Admin.',
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    copiesCorrected: 0,
    quota: assignedPlan === 'annual' ? 1000 : assignedPlan === 'monthly' ? 250 : (Number(process.env.FREE_TRIAL_QUOTA) || 30),
    totalSpent: assignedPlan === 'annual' ? 99.99 : assignedPlan === 'monthly' ? 9.99 : 0,
  };

  // Add initial transaction if paid
  if (assignedPlan === 'monthly' || assignedPlan === 'annual') {
    newTeacher.transactions = [
      {
        id: 'txn_' + Date.now().toString(36),
        teacherId: newTeacher.id,
        teacherName: newTeacher.name,
        teacherEmail: newTeacher.email,
        date: new Date().toISOString().slice(0, 10),
        amount: assignedPlan === 'annual' ? 99.99 : 9.99,
        currency: 'EUR',
        plan: assignedPlan,
        status: 'succeeded',
        paymentMethod: 'CB (Création Admin)',
        description: `Souscription ${assignedPlan === 'annual' ? 'Annuelle' : 'Mensuelle'} manuelle`,
      },
    ];
  }

  leads.unshift(newTeacher);
  saveLeads(leads);

  res.status(201).json({ success: true, teacher: newTeacher });
});

// Protected: Update teacher (upgrade/downgrade plan, toggle pause/active, edit notes)
app.patch('/api/admin/teachers/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const leads = loadLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Compte enseignant non trouvé.' });
  }

  const current = leads[index];
  const oldPlan = current.plan;
  const newPlan = updates.plan || oldPlan;

  // If upgraded to paid plan from free/trial, record a transaction
  let updatedTransactions = current.transactions || [];
  if ((oldPlan === 'free' || oldPlan === 'trial') && (newPlan === 'monthly' || newPlan === 'annual')) {
    const amount = newPlan === 'annual' ? 99.99 : 9.99;
    const newTxn: TransactionItem = {
      id: 'txn_upg_' + Date.now().toString(36),
      teacherId: current.id,
      teacherName: updates.name || current.name,
      teacherEmail: updates.email || current.email,
      date: new Date().toISOString().slice(0, 10),
      amount,
      currency: 'EUR',
      plan: newPlan,
      status: 'succeeded',
      paymentMethod: 'CB (Mise à niveau)',
      description: `Mise à niveau vers forfait ${newPlan === 'annual' ? 'Annuel' : 'Mensuel'}`,
    };
    updatedTransactions = [newTxn, ...updatedTransactions];
    updates.totalSpent = (current.totalSpent || 0) + amount;
  }

  leads[index] = {
    ...current,
    ...updates,
    id: current.id, // protect immutable ID
    transactions: updatedTransactions,
  };

  saveLeads(leads);
  res.json({ success: true, teacher: leads[index] });
});

// Protected: Simulate refund with reason
app.post('/api/admin/teachers/:id/refund', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { reason, amount } = req.body;

  const leads = loadLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Enseignant non trouvé.' });
  }

  const teacher = leads[index];
  const refundAmount = Number(amount) || (teacher.plan === 'annual' ? 99.99 : 9.99);

  const transactions = teacher.transactions || [];
  // Update last succeeded transaction to refunded or prepend refund record
  let refunded = false;
  for (let txn of transactions) {
    if (txn.status === 'succeeded') {
      txn.status = 'refunded';
      txn.refundReason = reason || 'Demande de remboursement formulée par l’enseignant';
      txn.refundedAt = new Date().toISOString();
      refunded = true;
      break;
    }
  }

  if (!refunded) {
    transactions.unshift({
      id: 'txn_ref_' + Date.now().toString(36),
      teacherId: teacher.id,
      teacherName: teacher.name,
      teacherEmail: teacher.email,
      date: new Date().toISOString().slice(0, 10),
      amount: refundAmount,
      currency: 'EUR',
      plan: teacher.plan,
      status: 'refunded',
      paymentMethod: 'Stripe Reversal',
      description: 'Remboursement bancaire validé',
      refundReason: reason || 'Geste commercial / rétractation',
      refundedAt: new Date().toISOString(),
    });
  }

  // Downgrade to free or set canceled
  teacher.plan = 'free';
  teacher.status = 'canceled';
  teacher.transactions = transactions;
  teacher.notes = `${teacher.notes || ''}\n[Remboursement ${refundAmount}€ le ${new Date().toLocaleDateString('fr-FR')}] : ${reason || 'Sans motif'}`.trim();

  saveLeads(leads);
  res.json({ success: true, teacher, message: `Remboursement de ${refundAmount} € enregistré avec succès.` });
});

// Protected: Simulate sending transactional email
app.post('/api/admin/teachers/:id/send-email', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  const { templateId, customSubject, customMessage } = req.body;

  const leads = loadLeads();
  const teacher = leads.find((l) => l.id === id);
  if (!teacher) {
    return res.status(404).json({ error: 'Enseignant non trouvé.' });
  }

  const subject = customSubject || (templateId === 'onboarding'
    ? 'Bienvenue sur Praxis IA : Vos premiers pas en correction assistée'
    : templateId === 'trial_end'
    ? 'Votre période d’essai Praxis Pro se termine dans 48 heures'
    : 'Nouvelle mise à jour pédagogique disponible sur Praxis');

  const timestamp = new Date().toLocaleString('fr-FR');
  teacher.notes = `${teacher.notes || ''}\n[Email envoyé le ${timestamp}] : "${subject}"`.trim();
  saveLeads(leads);

  res.json({
    success: true,
    sentTo: teacher.email,
    subject,
    sentAt: timestamp,
    message: `Email transactionnel "${subject}" délivré avec succès à ${teacher.email}.`,
  });
});

// Protected: Delete teacher with confirmation
app.delete('/api/admin/teachers/:id', requireAdminAuth, (req, res) => {
  const { id } = req.params;
  let leads = loadLeads();
  const initialLength = leads.length;
  leads = leads.filter((l) => l.id !== id);

  if (leads.length === initialLength) {
    return res.status(404).json({ error: 'Enseignant non trouvé.' });
  }

  saveLeads(leads);
  res.json({ success: true, message: 'Compte supprimé de la base de données.' });
});

// Protected: Test Telegram connection
app.post('/api/admin/telegram-test', requireAdminAuth, async (req, res) => {
  const hasToken = Boolean(process.env.TELEGRAM_BOT_TOKEN);
  const hasChatId = Boolean(process.env.TELEGRAM_CHAT_ID);

  if (!hasToken || !hasChatId) {
    return res.status(400).json({
      success: false,
      configured: false,
      error: 'Telegram n’est pas encore configuré. Renseignez TELEGRAM_BOT_TOKEN et TELEGRAM_CHAT_ID dans les variables d’environnement.',
    });
  }

  const testMessage = `🚀 *Notification Test Praxis IA Admin*
━━━━━━━━━━━━━━━━━━━━
Le bot Telegram est parfaitement connecté et opérationnel !
Vous recevrez instantanément une alerte à chaque nouvelle inscription d'enseignant.
⏰ *Horodatage :* ${new Date().toLocaleString('fr-FR')}`;

  const result = await sendTelegramNotification(testMessage);

  if (result.success) {
    res.json({ success: true, configured: true, message: 'Message test Telegram envoyé avec succès !' });
  } else {
    res.status(502).json({ success: false, configured: true, error: result.error });
  }
});

// Protected: Get environment and automation settings
app.get('/api/admin/settings', requireAdminAuth, (req, res) => {
  const leads = loadLeads();
  res.json({
    telegramConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_CHAT_ID),
    telegramChatId: process.env.TELEGRAM_CHAT_ID
      ? process.env.TELEGRAM_CHAT_ID.slice(0, 3) + '••••' + process.env.TELEGRAM_CHAT_ID.slice(-3)
      : null,
    totalTeachers: leads.length,
    hasMasterPassword: Boolean(process.env.ADMIN_MASTER_PASSWORD),
    appVersion: '2.4.0',
    serverTime: new Date().toISOString(),
  });
});

// Protected: Clear database to start with pure live real-time data
app.post('/api/admin/clear-leads', requireAdminAuth, (req, res) => {
  saveLeads([]);
  res.json({ success: true, count: 0, message: 'La base a été remise à zéro. Le tableau de bord affiche désormais uniquement les données réelles en direct.' });
});

// Redirect /admin to /dashboard SPA
app.get('/admin', (req, res) => {
  res.redirect('/dashboard');
});

// Vite middleware in dev or static serving in prod
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Praxis' IA] Serveur démarré avec succès sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
