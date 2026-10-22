import jsPDF from 'jspdf';
import type { SmartInsight } from '../../types/analytics.types';

export interface BaseReportOptions {
  title: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
  startDate: string;
  endDate: string;
  shift: string;
  orientation?: 'portrait' | 'landscape';
  extraFilters?: Array<{ label: string; value: string }>;
}

export interface MetricCardItem {
  label: string;
  value: string;
  subtext?: string;
}

/**
 * Draws the company logo emblem (or image data url) at specified (x, y) coordinates.
 * Returns the width of the drawn logo in mm.
 */
export function drawCompanyLogo(
  doc: jsPDF,
  x: number,
  y: number,
  size = 12,
  logoDataUrl?: string | null,
): number {
  let drawnImage = false;
  if (logoDataUrl && typeof logoDataUrl === 'string' && logoDataUrl.startsWith('data:image')) {
    try {
      const format =
        logoDataUrl.includes('image/jpeg') || logoDataUrl.includes('image/jpg') ? 'JPEG' : 'PNG';
      doc.addImage(logoDataUrl, format, x, y, size, size);
      drawnImage = true;
    } catch {
      drawnImage = false;
    }
  }

  if (!drawnImage) {
    // High-resolution vector emblem matching SBKT loom weave
    doc.setFillColor(29, 78, 216); // #1d4ed8
    doc.roundedRect(x, y, size, size, 2.5, 2.5, 'F');
    doc.setDrawColor(255, 255, 255);
    doc.setLineWidth(0.55);

    // Weave grid
    const s = size;
    // Horizontal weft lines
    doc.line(x + s * 0.25, y + s * 0.38, x + s * 0.75, y + s * 0.38);
    doc.line(x + s * 0.25, y + s * 0.50, x + s * 0.75, y + s * 0.50);
    doc.line(x + s * 0.25, y + s * 0.62, x + s * 0.75, y + s * 0.62);
    // Vertical warp lines
    doc.line(x + s * 0.38, y + s * 0.26, x + s * 0.38, y + s * 0.74);
    doc.line(x + s * 0.62, y + s * 0.26, x + s * 0.62, y + s * 0.74);
  }

  return size;
}

/**
 * Captures an SVG-based Recharts chart container as a high-resolution PNG Data URL.
 * Gracefully returns null if container or SVG is unavailable or errored.
 */
export async function captureChartImage(elementId: string): Promise<string | null> {
  const container = document.getElementById(elementId);
  if (!container) return null;

  const svg = container.querySelector('svg');
  if (!svg) return null;

  return new Promise((resolve) => {
    try {
      const rect = svg.getBoundingClientRect();
      const width = rect.width || 800;
      const height = rect.height || 350;

      const clonedSvg = svg.cloneNode(true) as SVGElement;
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');

      const xml = new XMLSerializer().serializeToString(clonedSvg);
      const svgBlob = new Blob([xml], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);

      const img = new Image();
      img.onload = () => {
        try {
          const scale = 2; // High-res for sharp PDF display
          const canvas = document.createElement('canvas');
          canvas.width = width * scale;
          canvas.height = height * scale;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            URL.revokeObjectURL(url);
            resolve(null);
            return;
          }

          // Solid white background
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.scale(scale, scale);
          ctx.drawImage(img, 0, 0);

          URL.revokeObjectURL(url);
          resolve(canvas.toDataURL('image/png'));
        } catch {
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };

      img.src = url;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Formats a date string 'YYYY-MM-DD' into human friendly format e.g. '21 Oct 2026'
 */
export function formatFriendlyDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0]!, 10), parseInt(parts[1]!, 10) - 1, parseInt(parts[2]!, 10));
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

/**
 * Format timestamp in factory-local timezone
 */
export function formatReportTimestamp(timezone = 'Asia/Kolkata'): string {
  try {
    return new Intl.DateTimeFormat('en-IN', {
      timeZone: timezone,
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }).format(new Date());
  } catch {
    return new Date().toLocaleString('en-IN');
  }
}

/**
 * Human-friendly shift label
 */
export function formatShiftLabel(shift: string): string {
  if (shift === 'ALL') return 'Combined (Day & Night)';
  if (shift === 'DAY') return 'Day Shift (11 hrs: 08:00 AM - 07:00 PM)';
  if (shift === 'NIGHT') return 'Night Shift (13 hrs: 07:00 PM - 08:00 AM)';
  return shift;
}

/**
 * Initializes a structured jsPDF document with standardized headers, metadata block, and rules.
 */
export function createBasePdfReport(options: BaseReportOptions): {
  doc: jsPDF;
  pageWidth: number;
  pageHeight: number;
  startContentY: number;
} {
  const orientation = options.orientation || 'portrait';
  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  const factory = (options.factoryName || 'Shree Brahmanikrupa Textile').toUpperCase();
  const tz = options.factoryTimezone || 'Asia/Kolkata';

  // 0. Company Logo (rendered directly before company name)
  const logoX = 14;
  const logoY = 9.5;
  const logoSize = 12; // 12mm x 12mm
  drawCompanyLogo(doc, logoX, logoY, logoSize, options.factoryLogo);

  const textX = logoX + logoSize + 3.5;

  // 1. Factory Title (placed immediately after company logo)
  doc.setFontSize(15);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFont('helvetica', 'bold');
  doc.text(factory, textX, 15);

  // 2. Report Subheading
  doc.setFontSize(10.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'bold');
  doc.text(options.title.toUpperCase(), textX, 21.5);

  // 3. Metadata row
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139); // slate-500

  const dateRangeText = `Period: ${formatFriendlyDate(options.startDate)} – ${formatFriendlyDate(options.endDate)}`;
  const shiftText = `Shift: ${formatShiftLabel(options.shift)}`;
  const generatedText = `Generated: ${formatReportTimestamp(tz)} (${tz})`;

  doc.text(dateRangeText, 14, 28);
  doc.text(shiftText, 95, 28);
  doc.text(generatedText, pageWidth - 14, 28, { align: 'right' });

  let curY = 32;

  // 4. Extra filters if any (e.g. Machine, Threshold)
  if (options.extraFilters && options.extraFilters.length > 0) {
    const extraText = options.extraFilters.map((f) => `${f.label}: ${f.value}`).join('   |   ');
    doc.text(extraText, 14, curY);
    curY += 4;
  }

  // 5. Divider
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.4);
  doc.line(14, curY, pageWidth - 14, curY);

  return {
    doc,
    pageWidth,
    pageHeight,
    startContentY: curY + 5,
  };
}

/**
 * Draws a clean row/grid of metric cards with labels, bold values, and optional subtexts.
 */
export function drawMetricCards(
  doc: jsPDF,
  startY: number,
  cards: MetricCardItem[],
  pageWidth: number,
  maxColumns = 4,
): number {
  if (cards.length === 0) return startY;

  const count = cards.length;
  const cols = Math.min(count, maxColumns);
  const rows = Math.ceil(count / cols);

  const marginX = 14;
  const availableWidth = pageWidth - marginX * 2;
  const gap = 3;
  const cardWidth = (availableWidth - gap * (cols - 1)) / cols;
  const cardHeight = 17;

  let currentY = startY;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const index = r * cols + c;
      if (index >= count) break;
      const card = cards[index]!;
      const cardX = marginX + c * (cardWidth + gap);
      const cardY = currentY + r * (cardHeight + gap);

      // Card Background & Border
      doc.setFillColor(248, 250, 252); // slate-50
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'F');
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.roundedRect(cardX, cardY, cardWidth, cardHeight, 1.5, 1.5, 'S');

      // Label
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139); // slate-500
      doc.text(card.label.toUpperCase(), cardX + 3, cardY + 4.5);

      // Value
      doc.setFontSize(10.5);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(card.value, cardX + 3, cardY + 10.5);

      // Subtext
      if (card.subtext) {
        doc.setFontSize(6.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(71, 85, 105);
        doc.text(card.subtext, cardX + 3, cardY + 14.5);
      }
    }
  }

  return currentY + rows * (cardHeight + gap) + 4;
}

/**
 * Draws a section heading
 */
export function drawSectionHeading(doc: jsPDF, title: string, y: number): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59); // slate-800
  doc.text(title.toUpperCase(), 14, y);
  return y + 4;
}

/**
 * Draws Smart Insights in a structured box
 */
export function drawSmartInsightsBox(
  doc: jsPDF,
  startY: number,
  insights: SmartInsight[],
  pageWidth: number,
): number {
  if (!insights || insights.length === 0) return startY;

  let y = drawSectionHeading(doc, 'Smart Operational Insights', startY);

  const marginX = 14;
  const boxWidth = pageWidth - marginX * 2;

  for (const ins of insights) {
    // Check page overflow
    if (y + 16 > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      y = 15;
    }

    doc.setFillColor(240, 249, 255); // sky-50
    doc.setDrawColor(186, 230, 253); // sky-200
    doc.roundedRect(marginX, y, boxWidth, 14, 1.5, 1.5, 'FD');

    // Title & Metric
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(3, 105, 161); // sky-700
    doc.text(`* ${ins.title}`, marginX + 3, y + 5);

    if (ins.metric) {
      doc.setFontSize(8.5);
      doc.text(`[${ins.metric}]`, marginX + boxWidth - 3, y + 5, { align: 'right' });
    }

    // Description
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85); // slate-700
    const wrappedDesc = doc.splitTextToSize(ins.description, boxWidth - 8);
    doc.text(wrappedDesc, marginX + 3, y + 9.5);

    y += 16;
  }

  return y + 2;
}

/**
 * Embeds chart image onto PDF
 */
export function embedChartImage(
  doc: jsPDF,
  startY: number,
  chartDataUrl: string | null,
  chartTitle: string,
  pageWidth: number,
  pageHeight: number,
): number {
  if (!chartDataUrl) return startY;

  let y = drawSectionHeading(doc, chartTitle, startY);

  const marginX = 14;
  const availableWidth = pageWidth - marginX * 2;
  const chartHeight = 65; // mm

  if (y + chartHeight > pageHeight - 20) {
    doc.addPage();
    y = 15;
    y = drawSectionHeading(doc, chartTitle, y);
  }

  try {
    doc.addImage(chartDataUrl, 'PNG', marginX, y, availableWidth, chartHeight);
    return y + chartHeight + 6;
  } catch (err) {
    console.warn('Failed to embed chart image:', err);
    return y;
  }
}

/**
 * Applies professional page numbering ("Page X of Y") and confidentiality footer to all pages.
 */
export function applyPdfPageNumbersAndFooters(doc: jsPDF): void {
  const totalPages = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(148, 163, 184); // slate-400

    // Footer divider
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, pageHeight - 11, pageWidth - 14, pageHeight - 11);

    // Left note
    doc.text('SBKT Loom Production & Efficiency Management System  |  Confidential Factory Record', 14, pageHeight - 6);

    // Right page number
    doc.text(`Page ${i} of ${totalPages}`, pageWidth - 14, pageHeight - 6, { align: 'right' });
  }
}
