import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { StudentSubmission, AssignmentConfig, QuestionEvaluation, CompetenceItem } from '../types';

/**
 * Rotates an image Data URL by the specified degrees and returns a new Data URL
 */
export async function getRotatedImageDataUrl(src: string, rotation: number): Promise<string> {
  const normRot = ((rotation % 360) + 360) % 360;
  if (normRot === 0) return src;

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const is90or270 = normRot === 90 || normRot === 270;
      canvas.width = is90or270 ? img.height : img.width;
      canvas.height = is90or270 ? img.width : img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(src);
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((normRot * Math.PI) / 180);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      resolve(canvas.toDataURL('image/jpeg', 0.92));
    };
    img.onerror = () => resolve(src);
    img.src = src;
  });
}

/**
 * Triggers a direct browser file download for a Blob
 */
export function triggerFileDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}

/**
 * Triggers a direct browser file download for a Data URL
 */
export function triggerDataUrlDownload(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

/**
 * Captures an HTML element to a high-resolution Canvas using html2canvas
 */
export async function captureElementToCanvas(element: HTMLElement, scale: number = 2): Promise<HTMLCanvasElement> {
  return await html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#0f172a',
    logging: false,
    imageTimeout: 15000,
    onclone: (clonedDoc) => {
      // Ensure all images in clone are fully displayed
      const images = clonedDoc.querySelectorAll('img');
      images.forEach((img) => {
        img.loading = 'eager';
      });
    },
  });
}

/**
 * Exports an HTML element as an Image (PNG)
 */
export async function exportElementAsPng(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElementToCanvas(element, 2);
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        triggerFileDownload(blob, filename.endsWith('.png') ? filename : `${filename}.png`);
        resolve();
      } else {
        reject(new Error("Échec de la génération du blob image"));
      }
    }, 'image/png');
  });
}

/**
 * Exports an HTML element as a PDF preserving the exact screen aspect ratio (panoramic view)
 */
export async function exportElementAsPanoramicPdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElementToCanvas(element, 2);
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // 1px approx 0.75pt in standard PDF points
  const pdfWidth = canvas.width * 0.75;
  const pdfHeight = canvas.height * 0.75;

  const pdf = new jsPDF({
    orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
    unit: 'pt',
    format: [pdfWidth, pdfHeight],
  });

  pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Exports an HTML element as a multi-page A4 PDF (sliced vertically if it exceeds one page)
 */
export async function exportElementAsMultiPageA4Pdf(element: HTMLElement, filename: string): Promise<void> {
  const canvas = await captureElementToCanvas(element, 2);
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;

  // A4 dimensions in pt: 595.28 x 841.89 (Portrait)
  const a4Width = 595.28;
  const a4Height = 841.89;

  // Calculate page height in canvas pixels equivalent to A4 aspect ratio
  const pageHeightInCanvasPixels = Math.floor((imgWidth * a4Height) / a4Width);
  let renderedHeight = 0;

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  let pageIndex = 0;

  while (renderedHeight < imgHeight) {
    if (pageIndex > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const currentSliceHeight = Math.min(pageHeightInCanvasPixels, imgHeight - renderedHeight);

    // Create a temporary canvas for this slice
    const sliceCanvas = document.createElement('canvas');
    sliceCanvas.width = imgWidth;
    sliceCanvas.height = currentSliceHeight;
    const ctx = sliceCanvas.getContext('2d');

    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        renderedHeight,
        imgWidth,
        currentSliceHeight,
        0,
        0,
        imgWidth,
        currentSliceHeight
      );

      const sliceDataUrl = sliceCanvas.toDataURL('image/jpeg', 0.95);
      const renderPtHeight = (currentSliceHeight * a4Width) / imgWidth;
      pdf.addImage(sliceDataUrl, 'JPEG', 0, 0, a4Width, renderPtHeight);
    }

    renderedHeight += currentSliceHeight;
    pageIndex++;
  }

  pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
}

/**
 * Exports the raw student handwritten copy (single page or all pages) as a PDF or Image
 */
export async function exportRawHandwrittenCopy(
  pages: string[],
  rotation: number,
  studentName: string,
  format: 'png' | 'pdf',
  filename: string
): Promise<void> {
  if (format === 'png') {
    // Export single active page or first page as rotated PNG
    const rotated = await getRotatedImageDataUrl(pages[0], rotation);
    triggerDataUrlDownload(rotated, filename.endsWith('.png') ? filename : `${filename}.png`);
    return;
  }

  // Export as PDF (multi-page if pages > 1)
  let pdf: jsPDF | null = null;

  for (let i = 0; i < pages.length; i++) {
    const rotated = await getRotatedImageDataUrl(pages[i], rotation);

    await new Promise<void>((resolve) => {
      const img = new Image();
      img.onload = () => {
        const orientation = img.width > img.height ? 'landscape' : 'portrait';
        if (i === 0) {
          pdf = new jsPDF({
            orientation,
            unit: 'pt',
            format: [img.width * 0.75, img.height * 0.75],
          });
          pdf.addImage(rotated, 'JPEG', 0, 0, img.width * 0.75, img.height * 0.75);
        } else if (pdf) {
          pdf.addPage([img.width * 0.75, img.height * 0.75], orientation);
          pdf.addImage(rotated, 'JPEG', 0, 0, img.width * 0.75, img.height * 0.75);
        }
        resolve();
      };
      img.src = rotated;
    });
  }

  if (pdf) {
    (pdf as jsPDF).save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`);
  }
}
