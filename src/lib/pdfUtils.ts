import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
}

/**
 * Splits a PDF file into individual page image Data URLs (JPEG)
 * Dynamically bounds max resolution to ~2048px for optimal handwriting OCR and crisp line deciphering
 */
export async function convertPdfToImages(file: File): Promise<{ pageNumber: number; dataUrl: string }[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDoc = await loadingTask.promise;
  const totalPages = pdfDoc.numPages;
  const results: { pageNumber: number; dataUrl: string }[] = [];

  for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
    const page = await pdfDoc.getPage(pageNum);
    
    // Calculate balanced scale: ensure max dimension is capped at ~2048px for high readability
    const baseViewport = page.getViewport({ scale: 1.0 });
    const maxDim = Math.max(baseViewport.width, baseViewport.height);
    const targetScale = Math.min(2.5, Math.max(1.2, 2048 / maxDim));
    const viewport = page.getViewport({ scale: targetScale });

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) continue;

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // Fill white background for scans
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };

    await page.render(renderContext).promise;
    const dataUrl = canvas.toDataURL('image/jpeg', 0.90);
    results.push({
      pageNumber: pageNum,
      dataUrl,
    });
  }

  return results;
}

/**
 * Compresses an image file (e.g. smartphone photo) to max 2048px on the longest edge
 * and 0.90 JPEG quality to preserve fine handwriting strokes and accents.
 */
export async function compressImageFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 2048;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressed = canvas.toDataURL('image/jpeg', 0.90);
        resolve(compressed);
      };
      img.onerror = () => {
        resolve(e.target?.result as string);
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to extract student name guess from file name
 * e.g., "Copie_Lucas_Martin.jpg" -> "Lucas Martin"
 * e.g., "Maths_3e_Sarah_Benali.png" -> "Sarah Benali"
 */
export function extractStudentNameFromFileName(fileName: string, pageIndex?: number): string {
  const cleanName = fileName.replace(/\.[^/.]+$/, ''); // Remove extension
  const stripped = cleanName
    .replace(/[_\-.]+/g, ' ')
    .replace(/\b(copie|devoir|ds|dm|controle|contrôle|eval|evaluation|évaluation|scan|scanned|page|pages|eleve|élève|de)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length >= 2) {
    // Capitalize words
    return stripped
      .split(' ')
      .filter(Boolean)
      .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }

  return pageIndex ? `Élève ${pageIndex}` : 'Élève';
}
