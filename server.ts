import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const app = express();
const PORT = 3000;

// Support large payload for high-resolution scanned copies (up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Leads storage helpers
const LEADS_FILE = path.join(process.cwd(), 'leads.json');

interface LeadRecord {
  id: string;
  name: string;
  email: string;
  whatsapp: string;
  school?: string;
  plan?: 'free' | 'pro' | 'ecole';
  notes?: string;
  createdAt: string;
}

function loadLeads(): LeadRecord[] {
  try {
    if (fs.existsSync(LEADS_FILE)) {
      const data = fs.readFileSync(LEADS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.warn('[Leads] Error reading leads file, starting empty:', err);
  }
  return [];
}

function saveLeads(leads: LeadRecord[]) {
  try {
    fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Leads] Error saving leads file:', err);
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

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    hasKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// Analyze answer key (rubric) endpoint: reads the correction document/text to detect title, discipline, level, maxGrade, and extracted criteria
app.post('/api/analyze-rubric', async (req, res) => {
  try {
    const { rubricImage, rubricImages, rubricContent, currentTitle } = req.body;

    const imagesList: string[] = (Array.isArray(rubricImages) && rubricImages.length > 0)
      ? rubricImages
      : (rubricImage ? [rubricImage] : []);

    if (imagesList.length === 0 && (!rubricContent || !rubricContent.trim())) {
      return res.status(400).json({ error: 'Aucun document ou texte de corrigé fourni à analyser.' });
    }

    const ai = getGenAI();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Clé API Gemini non configurée.",
      });
    }

    const promptText = `Tu es un inspecteur pédagogique expert de l'Éducation Nationale française.
L'enseignant te transmet le CORRIGÉ TYPE OFFICIEL (la feuille de correction, le sujet corrigé ou le barème) d'une évaluation scolaire.
Ton rôle est de lire et d'analyser attentivement ce document de corrigé pour en extraire et proposer les métadonnées exactes de l'évaluation :

1. "suggestedTitle" : Le titre exact ou le plus représentatif du sujet traité dans ce corrigé (ex: "Évaluation de SVT : La tectonique des plaques et le volcanisme", "Contrôle d'Histoire : L'Europe dans la Première Guerre mondiale", "Devoir Surveillé de Français : La Poésie romantique", "Interrogation de Mathématiques : Fonctions affines", etc.).
   ATTENTION CRITIQUE : Ne garde JAMAIS un ancien titre hors sujet (comme "Théorème de Pythagore") si le corrigé traite d'un tout autre sujet ! Propose le nom qui correspond fidèlement au corrigé fourni.
2. "suggestedDiscipline" : Choisis impérativement la matière la plus proche parmi cette liste exacte :
   ["Mathématiques", "Français", "Histoire-Géographie", "Sciences de la Vie et de la Terre (SVT)", "Physique-Chimie", "Anglais (LV1)", "Espagnol (LV2)", "Allemand", "Philosophie", "Sciences Économiques et Sociales (SES)", "Technologie", "Enseignement Supérieur / Autre"]
3. "suggestedLevel" : Choisis le niveau scolaire le plus probable parmi :
   ["6e (Cycle 3)", "5e (Cycle 4)", "4e (Cycle 4)", "3e (Brevet)", "2nde (Lycée)", "1ère (Baccalauréat)", "Terminale (Baccalauréat)", "Supérieur / BTS / CPGE / Université"]
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

    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.8-flash',
    ];

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
    for (const model of modelsToTry) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: parts,
          config: {
            temperature: 0.1,
            responseMimeType: 'application/json',
            responseSchema: analysisSchema,
          },
        });

        if (response.text) {
          resultJson = JSON.parse(response.text);
          break;
        }
      } catch (err: any) {
        console.warn(`[AnalyzeRubric] Model ${model} failed, trying next:`, err.message);
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
    const { studentName, studentImage, allPages, studentPages, assignmentConfig } = req.body;

    const pagesList: string[] = (Array.isArray(allPages) && allPages.length > 0)
      ? allPages
      : (Array.isArray(studentPages) && studentPages.length > 0)
      ? studentPages
      : (studentImage ? [studentImage] : []);

    if (pagesList.length === 0) {
      return res.status(400).json({ error: 'Image de la copie manquante.' });
    }

    const ai = getGenAI();
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "Clé API Gemini non configurée. Veuillez renseigner GEMINI_API_KEY dans les variables d'environnement.",
      });
    }

    const discipline = assignmentConfig?.discipline || 'Matière générale';
    const level = assignmentConfig?.level || 'Secondaire';
    const title = assignmentConfig?.title || 'Évaluation scolaire';
    const maxGrade = Number(assignmentConfig?.maxGrade) || 20;
    const rubricContent = assignmentConfig?.rubricContent || '';
    const rubricImagesList: string[] = (Array.isArray(assignmentConfig?.rubricImages) && assignmentConfig.rubricImages.length > 0)
      ? assignmentConfig.rubricImages
      : (assignmentConfig?.rubricImage ? [assignmentConfig.rubricImage] : []);
    const guidelines = assignmentConfig?.pedagogicalGuidelines || {};

    // Check if a rubric is available (either images or text)
    const hasRubric = (rubricImagesList.length > 0 || (rubricContent && rubricContent.trim().length > 0));

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
La copie de cet élève comporte ${pagesList.length} page(s). Analyse TOUTES les pages de façon exhaustive pour noter l'ensemble du devoir.

${guidelinesPrompt}

${rubricPrompt}

RÈGLES D'ÉVALUATION:
1. Transcris mentalement l'écriture manuscrite de l'élève sur l'ensemble des ${pagesList.length} page(s) (calculs, graphiques, phrases, schémas).
2. Si le nom de l'élève est écrit sur la copie (ex: en haut de la page 1), extrais-le. Sinon, utilise "${studentName || 'Élève'}".
3. Sois juste, rigoureux mais bienveillant. Fournis une appréciation globale constructive, encourageante et claire, utile à la progression de l'élève.
4. Établis une note globale réaliste ramenée exactement sur ${maxGrade} (arrondie au demi-point ou quart de point, ex: 14.5 ou 15.25).
5. Détaille au moins 2 points forts et 2 axes concrets d'amélioration.
6. Évalue au moins 3 à 5 compétences clés de la discipline avec le statut exact: "Acquis", "En cours", ou "Non acquis".
7. Détaille chaque question/exercice trouvé sur les ${pagesList.length} pages avec:
   - "numero_ou_titre": intitulé court (ex: "Exercice 1 - Question 2")
   - "reponse_eleve": ce que l'élève a formulé ou calculé (ou "Non traité" s'il n'a rien mis)
   - "reponse_attendue": la réponse correcte attendue (strictement basée sur le corrigé officiel s'il est fourni)
   - "note": points obtenus pour cette question
   - "note_max": points max attribués à cette question
   - "justification": explication bienveillante du barème accordé
8. ÉVALUATION DE LA LISIBILITÉ & HONNÊTETÉ SUR LE DÉCHIFFRAGE :
   - Évalue fidèlement la lisibilité de l'écriture manuscrite de l'élève : "excellente", "bonne", "moyenne", "faible" ou "illisible".
   - Si l'écriture est difficile à lire, raturée, incomplète, floue, coupée ou ambiguë :
     * Définis "lisibilite" sur "moyenne", "faible" ou "illisible".
     * Définis obligatoirement "verification_humaine_recommandee" sur true.
     * Rédige un "avertissement_lisibilite" explicite et bienveillant pour le professeur (ex: "Écriture très serrée et difficile à déchiffrer sur l'exercice 2", "Ratures importantes rendant le calcul de la question 3 ambigu", "Photo floue en bas de page, relecture humaine recommandée").
     * NE DEVINE PAS et n'invente pas des réponses si l'écriture est indéchiffrable : écris "[Passage illisible ou ambigu]" dans "reponse_eleve" et précise dans la justification que l'enseignant doit vérifier la copie originale.
   - Si l'écriture est parfaitement claire et aisée à lire : "lisibilite" = "bonne" ou "excellente", "verification_humaine_recommandee" = false, et "avertissement_lisibilite" = null.

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

    // Cascade models: prioritizing high-throughput flash-lite models with generous quotas, followed by latest models
    const modelsToTry = [
      'gemini-3.1-flash-lite',
      'gemini-flash-lite-latest',
      'gemini-3.5-flash-lite',
      'gemini-3.8-flash',
    ];
    let lastError: any = null;
    let responseText = '';

    const correctionSchema = {
      type: Type.OBJECT,
      properties: {
        nom_eleve: {
          type: Type.STRING,
          description: "Nom et prénom de l'élève détecté sur la copie ou fourni",
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

    modelLoop: for (const modelName of modelsToTry) {
      const maxAttempts = 2;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
          console.log(`[Praxis IA] Requesting correction with model: ${modelName} (attempt ${attempt}/${maxAttempts})...`);
          const response = await ai.models.generateContent({
            model: modelName,
            contents: { parts },
            config: {
              systemInstruction: systemPrompt,
              responseMimeType: 'application/json',
              responseSchema: correctionSchema,
            },
          });

          if (response && response.text) {
            responseText = response.text;
            console.log(`[Praxis IA] Model ${modelName} evaluated successfully!`);
            break modelLoop;
          }
        } catch (err: any) {
          const errMsg = err?.message || String(err);
          console.warn(`[Praxis IA] Model ${modelName} (attempt ${attempt}) failed:`, errMsg);
          lastError = err;

          const isQuotaExhausted =
            errMsg.includes('429') ||
            errMsg.includes('RESOURCE_EXHAUSTED') ||
            errMsg.includes('quota') ||
            errMsg.includes('Quota exceeded');

          // If quota is exhausted on this model, do not retry it; jump to next model immediately
          if (isQuotaExhausted) {
            console.warn(`[Praxis IA] Quota reached for ${modelName}, immediately switching to next model...`);
            break;
          }

          const isTransientDemand =
            errMsg.includes('503') ||
            errMsg.includes('UNAVAILABLE') ||
            errMsg.includes('high demand') ||
            errMsg.includes('overloaded');

          if (isTransientDemand && attempt < maxAttempts) {
            const delay = 1500 + Math.floor(Math.random() * 500);
            console.log(`[Praxis IA] Transient overload on ${modelName}, retrying in ${delay}ms...`);
            await new Promise((r) => setTimeout(r, delay));
          } else {
            break;
          }
        }
      }
    }

    if (!responseText) {
      throw lastError || new Error("Échec de l'analyse avec les modèles IA.");
    }

    // Clean any markdown wrapper if present
    let cleanJson = responseText.trim();
    if (cleanJson.startsWith('```')) {
      cleanJson = cleanJson.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
    }

    let parsed: any;
    try {
      parsed = JSON.parse(cleanJson);
    } catch {
      const match = cleanJson.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        throw new Error("Format JSON d'évaluation invalide.");
      }
    }

    // Normalize and sanitize fields
    parsed.note = typeof parsed.note === 'number' ? Number(parsed.note.toFixed(2)) : 0;
    parsed.note_sur = Number(parsed.note_sur) || maxGrade;
    parsed.nom_eleve = parsed.nom_eleve || studentName || 'Élève';

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

    return res.json({
      success: true,
      data: parsed,
    });
  } catch (error: any) {
    console.error('[Correcteur Pro] Error during correction:', error);

    let displayMessage = error?.message || "Une erreur est survenue lors de l'analyse de la copie.";
    try {
      const parsedErr = JSON.parse(displayMessage);
      if (parsedErr?.error?.message) {
        displayMessage = parsedErr.error.message;
      }
    } catch {}

    if (displayMessage.includes('429') || displayMessage.includes('RESOURCE_EXHAUSTED') || displayMessage.includes('quota')) {
      displayMessage = "Limite de requêtes atteinte sur l'API (quota temporaire). Veuillez patienter 20 à 30 secondes avant de relancer.";
    } else if (displayMessage.includes('503') || displayMessage.includes('UNAVAILABLE') || displayMessage.includes('high demand')) {
      displayMessage = "Forte demande temporaire sur les serveurs IA. Veuillez réessayer dans quelques instants.";
    }

    return res.status(500).json({
      error: displayMessage,
    });
  }
});

// --- Leads Management APIs ---

// Get all leads
app.get('/api/leads', (req, res) => {
  const leads = loadLeads();
  res.json({ leads });
});

// Create new lead (when teacher registers)
app.post('/api/leads', (req, res) => {
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
    plan: 'free',
    notes: '',
    createdAt: new Date().toISOString(),
  };

  leads.unshift(newLead);
  saveLeads(leads);
  res.status(201).json({ success: true, lead: newLead });
});

// Update lead (plan, notes, school, etc.)
app.patch('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  const leads = loadLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: 'Lead non trouvé.' });
  }

  leads[index] = {
    ...leads[index],
    ...updates,
    id: leads[index].id, // protect ID
  };

  saveLeads(leads);
  res.json({ success: true, lead: leads[index] });
});

// Delete lead
app.delete('/api/leads/:id', (req, res) => {
  const { id } = req.params;
  let leads = loadLeads();
  leads = leads.filter((l) => l.id !== id);
  saveLeads(leads);
  res.json({ success: true });
});

// Direct admin panel access
app.get('/admin', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'public', 'admin.html'));
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
