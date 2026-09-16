import { AssignmentConfig, StudentSubmission } from '../types';

export const SAMPLE_ASSIGNMENT_CONFIG: AssignmentConfig = {
  discipline: 'Mathématiques',
  level: '3e (Brevet)',
  title: 'Contrôle N°4 : Théorème de Pythagore et Géométrie',
  maxGrade: 20,
  correctionMode: 'with_rubric',
  rubricContent: `BARÈME & CORRIGÉ OFFICIEL :
Exercice 1 (8 points) - Triangle rectangle et calcul de l'hypoténuse
Soit ABC un triangle rectangle en A tel que AB = 6 cm et AC = 8 cm.
1) Calculer la longueur BC en justifiant rigoureusement. (5 pts)
   Attendu : Le triangle ABC est rectangle en A. D'après le théorème de Pythagore, on a BC² = AB² + AC².
   BC² = 6² + 8² = 36 + 64 = 100.
   Donc BC = √100 = 10 cm. (Justification 2 pts, calcul 2 pts, unité 1 pt).
2) Soit M un point du segment [AB] tel que AM = 3 cm. Quelle fraction de AB représente AM ? (3 pts)
   Attendu : AM / AB = 3 / 6 = 1/2 (ou 0,5 ou 50%).

Exercice 2 (12 points) - Réciproque de Pythagore et Problème concret
Un menuisier veut vérifier si l'étagère qu'il a posée forme un angle droit avec le mur vertical.
Les mesures prises sont : Hauteur sur le mur = 120 cm, Longueur de l'étagère = 90 cm, Diagonale mesurée = 150 cm.
1) L'étagère est-elle perpendiculaire au mur ? Justifier à l'aide de la réciproque ou contraposée de Pythagore. (7 pts)
   Attendu : Dans le triangle formé, le plus grand côté est la diagonale (150 cm).
   D'une part : 150² = 22 500.
   D'autre part : 120² + 90² = 14 400 + 8 100 = 22 500.
   On constate que 150² = 120² + 90². L'égalité de Pythagore est vérifiée.
   D'après la réciproque du théorème de Pythagore, le triangle est rectangle. L'étagère est donc bien perpendiculaire au mur.
2) Calculer l'aire délimitée par cette structure triangulaire en m². (5 pts)
   Attendu : Aire = (Base × Hauteur) / 2 = (90 × 120) / 2 = 10 800 / 2 = 5 400 cm².
   En m² : 5 400 cm² = 0,54 m² (ou 0.54 m²).`,
  pedagogicalGuidelines: {
    spellingTolerance: true,
    rewardEffortAndMethod: true,
    rigorousJustification: true,
    encourageClarity: true,
    customInstructions: 'Valoriser les élèves qui précisent bien la phrase clé "D\'après le théorème de Pythagore" et "D\'après la réciproque".',
  },
};

/**
 * Generates an authentic school copy image on canvas (grid paper with handwritten style notes)
 */
function createSyntheticCopyCanvas(
  studentName: string,
  classTitle: string,
  date: string,
  contentLines: { text: string; indent?: number; isError?: boolean }[]
): string {
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1250;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background - light warm off-white school paper
  ctx.fillStyle = '#faf9f5';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw school grid lines (Clairefontaine / Séyès style subtle lines)
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  const lineSpacing = 32;

  // Margin line in light pink
  ctx.strokeStyle = '#fecdd3';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(140, 0);
  ctx.lineTo(140, canvas.height);
  ctx.stroke();

  // Horizontal lines
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 0.8;
  for (let y = 70; y < canvas.height - 40; y += lineSpacing) {
    ctx.beginPath();
    ctx.moveTo(30, y);
    ctx.lineTo(canvas.width - 30, y);
    ctx.stroke();
  }

  // Header Box
  ctx.fillStyle = '#1e3a8a'; // Deep academic navy
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('NOM : ' + studentName, 40, 48);

  ctx.fillStyle = '#475569';
  ctx.font = '16px "Plus Jakarta Sans", sans-serif';
  ctx.fillText('Classe : 3e B  |  Date : ' + date, 450, 48);

  // Subtitle
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 18px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(classTitle, 160, 95);

  // Teacher grading box placeholder
  ctx.strokeStyle = '#94a3b8';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(canvas.width - 150, 60, 110, 65);
  ctx.fillStyle = '#64748b';
  ctx.font = '14px sans-serif';
  ctx.fillText('NOTE :', canvas.width - 140, 80);
  ctx.fillText('/ 20', canvas.width - 85, 115);

  // Handwritten body text (using natural blue ink)
  ctx.fillStyle = '#1d4ed8'; // blue ink
  ctx.font = '18px "JetBrains Mono", "Courier New", monospace';

  let currentY = 160;
  for (const item of contentLines) {
    const x = 160 + (item.indent || 0) * 25;
    ctx.fillText(item.text, x, currentY);
    currentY += 32;
    if (currentY > canvas.height - 60) break;
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}

export function generateSampleStudents(): StudentSubmission[] {
  // Student 1: Lucas Martin (Strong math student)
  const lucasLines = [
    { text: 'Exercice 1 :' },
    { text: '1) Le triangle ABC est rectangle en A.', indent: 1 },
    { text: "D'après le théorème de Pythagore :", indent: 1 },
    { text: 'BC² = AB² + AC²', indent: 2 },
    { text: 'BC² = 6² + 8²', indent: 2 },
    { text: 'BC² = 36 + 64 = 100', indent: 2 },
    { text: 'BC = √100 = 10 cm.', indent: 2 },
    { text: 'La longueur de BC est donc de 10 cm.', indent: 1 },
    { text: '' },
    { text: '2) AM = 3 cm et AB = 6 cm.', indent: 1 },
    { text: 'AM / AB = 3 / 6 = 1/2.', indent: 2 },
    { text: 'AM représente donc la moitié (1/2 ou 50%) de AB.', indent: 1 },
    { text: '' },
    { text: 'Exercice 2 :' },
    { text: '1) Dans le triangle formé par le mur et l’étagère :', indent: 1 },
    { text: 'Le plus grand côté est la diagonale = 150 cm.', indent: 1 },
    { text: 'D’une part : 150² = 22 500', indent: 2 },
    { text: 'D’autre part : 120² + 90² = 14 400 + 8 100 = 22 500', indent: 2 },
    { text: 'Comme 150² = 120² + 90², l’égalité est vérifiée.', indent: 1 },
    { text: "D'après la réciproque du théorème de Pythagore,", indent: 1 },
    { text: 'le triangle est rectangle.', indent: 1 },
    { text: 'Donc l’étagère est bien perpendiculaire au mur.', indent: 1 },
    { text: '' },
    { text: '2) Aire = (base × hauteur) / 2', indent: 1 },
    { text: 'Aire = (90 × 120) / 2 = 10 800 / 2 = 5 400 cm²', indent: 2 },
    { text: 'Conversion en m² : 5 400 cm² = 0,54 m².', indent: 2 },
  ];

  // Student 2: Sarah Benali (Good student, minor omissions)
  const sarahLines = [
    { text: 'Exercice 1 :' },
    { text: '1) Dans ABC rectangle en A, avec Pythagore :', indent: 1 },
    { text: 'BC² = 6² + 8²', indent: 2 },
    { text: 'BC² = 36 + 64 = 100', indent: 2 },
    { text: 'BC = √100 = 10', indent: 2 },
    { text: 'BC mesure 10.', indent: 1 },
    { text: '' },
    { text: '2) AM = 3 et AB = 6', indent: 1 },
    { text: 'Fraction = 3/6 = 0,5', indent: 2 },
    { text: '' },
    { text: 'Exercice 2 :' },
    { text: '1) Calcul des carrés :', indent: 1 },
    { text: '150² = 22 500', indent: 2 },
    { text: '120² + 90² = 14400 + 8100 = 22 500', indent: 2 },
    { text: 'Les résultats sont égaux.', indent: 1 },
    { text: 'Donc l’étagère est droite avec le mur.', indent: 1 },
    { text: '' },
    { text: '2) Calcul de l’aire :', indent: 1 },
    { text: '90 × 120 = 10 800', indent: 2 },
    { text: '(oubli de diviser par 2 ?)', indent: 2 },
    { text: 'Aire = 5 400 cm².', indent: 1 },
    { text: 'En m² = 5,4 m² (erreur virgule)', indent: 2 },
  ];

  // Student 3: Thomas Dubois (Needs encouragement and method reinforcement)
  const thomasLines = [
    { text: 'Ex 1 :' },
    { text: '1) On fait Pythagore :', indent: 1 },
    { text: 'BC = 6 + 8 = 14 cm', indent: 2 },
    { text: '(Ah non c’est les carrés)', indent: 2 },
    { text: 'BC² = 36 + 64 = 100', indent: 2 },
    { text: 'BC = 10 cm.', indent: 2 },
    { text: '' },
    { text: '2) AM = 3 cm. C’est la moitié.', indent: 1 },
    { text: '' },
    { text: 'Ex 2 :' },
    { text: '1) On additionne 120 + 90 = 210.', indent: 1 },
    { text: 'Comme 210 est plus grand que 150,', indent: 1 },
    { text: 'ce n’est pas un angle droit.', indent: 1 },
    { text: '' },
    { text: '2) Aire = 120 × 90 = 10 800 cm²', indent: 1 },
    { text: 'Je ne sais pas convertir en m²', indent: 2 },
  ];

  const dateStr = '05/03/2026';
  const examTitle = 'DS N°4 : Théorème de Pythagore';

  return [
    {
      id: 'sub-1',
      studentName: 'Lucas Martin',
      fileName: 'Copie_Lucas_Martin.jpg',
      rotation: 0,
      status: 'pending',
      imageDataUrl: createSyntheticCopyCanvas('Lucas Martin', examTitle, dateStr, lucasLines),
    },
    {
      id: 'sub-2',
      studentName: 'Sarah Benali',
      fileName: 'Copie_Sarah_Benali.jpg',
      rotation: 0,
      status: 'pending',
      imageDataUrl: createSyntheticCopyCanvas('Sarah Benali', examTitle, dateStr, sarahLines),
    },
    {
      id: 'sub-3',
      studentName: 'Thomas Dubois',
      fileName: 'Copie_Thomas_Dubois.jpg',
      rotation: 0,
      status: 'pending',
      imageDataUrl: createSyntheticCopyCanvas('Thomas Dubois', examTitle, dateStr, thomasLines),
    },
  ];
}
