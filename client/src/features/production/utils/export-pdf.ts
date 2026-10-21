import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ProductionSheet } from '../types/production.types';
import { formatFriendlyDate, getShiftTimingText } from './production-calc';

interface ExportPdfOptions {
  sheet: ProductionSheet;
  factoryName: string;
}

export function exportProductionSheetPdf({ sheet, factoryName }: ExportPdfOptions): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();

  // Header Title
  doc.setFontSize(18);
  doc.setTextColor(30, 41, 59); // slate-800
  doc.setFont('helvetica', 'bold');
  doc.text(factoryName.toUpperCase(), 14, 16);

  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'normal');
  doc.text('SHIFT PRODUCTION & EFFICIENCY REPORT', 14, 23);

  // Metadata Card / Details
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139); // slate-500
  const dateFormatted = formatFriendlyDate(sheet.productionDate);
  const shiftText = `${sheet.shift} SHIFT (${getShiftTimingText(sheet.shift)})`;
  const statusText = `STATUS: ${sheet.status}`;

  doc.text(`Date: ${dateFormatted}`, 14, 30);
  doc.text(`Shift: ${shiftText}`, 70, 30);
  doc.text(statusText, 180, 30);
  doc.text(`Exported: ${new Date().toLocaleString('en-IN')}`, pageWidth - 14, 30, { align: 'right' });

  // Divider
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(14, 33, pageWidth - 14, 33);

  // Prepare table data
  const tableRows = sheet.entries.map((entry) => [
    entry.machineNumberSnapshot,
    entry.fabricCodeSnapshot
      ? `${entry.fabricNameSnapshot} (${entry.fabricCodeSnapshot})`
      : entry.fabricNameSnapshot,
    entry.machineStatusSnapshot,
    entry.rpmSnapshot,
    entry.ppiSnapshot,
    entry.efficiencyMode,
    entry.efficiencyPercent !== null ? `${entry.efficiencyPercent.toFixed(1)}%` : '—',
    entry.actualProductionMeters.toFixed(1),
    entry.notes || '—',
  ]);

  // Generate AutoTable
  autoTable(doc, {
    startY: 36,
    head: [
      [
        'Machine',
        'Fabric Quality',
        'Status',
        'RPM',
        'PPI',
        'Mode',
        'Efficiency',
        'Meters',
        'Notes',
      ],
    ],
    body: tableRows,
    theme: 'grid',
    headStyles: {
      fillColor: [30, 41, 59], // slate-800
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 9,
      halign: 'left',
    },
    styles: {
      fontSize: 8.5,
      cellPadding: 2.5,
      textColor: [51, 65, 85],
    },
    columnStyles: {
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 55 },
      2: { cellWidth: 26 },
      3: { cellWidth: 18, halign: 'right' },
      4: { cellWidth: 18, halign: 'right' },
      5: { cellWidth: 20 },
      6: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
      8: { cellWidth: 'auto' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Summary section at end of table
  const finalY = (doc as any).lastAutoTable?.finalY || 160;

  if (finalY + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
  }

  const summaryY = finalY + 8 > doc.internal.pageSize.getHeight() - 35
    ? doc.internal.pageSize.getHeight() - 30
    : finalY + 8;

  // Summary box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, summaryY, pageWidth - 28, 20, 2, 2, 'F');
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, summaryY, pageWidth - 28, 20, 2, 2, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);

  const col1 = 20;
  const col2 = 80;
  const col3 = 140;
  const col4 = 200;

  doc.text(`TOTAL PRODUCTION: ${sheet.totalProductionMeters.toLocaleString('en-IN')} m`, col1, summaryY + 8);
  doc.text(
    `AVG EFFICIENCY: ${sheet.averageEfficiency !== null ? `${sheet.averageEfficiency.toFixed(2)}%` : '—'}`,
    col1,
    summaryY + 15,
  );

  doc.setFont('helvetica', 'normal');
  doc.text(`Running Looms: ${sheet.runningMachineCount}`, col2, summaryY + 8);
  doc.text(`Stopped Looms: ${sheet.stoppedMachineCount}`, col2, summaryY + 15);

  doc.text(`Maintenance Looms: ${sheet.maintenanceMachineCount}`, col3, summaryY + 8);
  doc.text(`Total Recorded Looms: ${sheet.entries.length}`, col3, summaryY + 15);

  doc.text(`Status: ${sheet.status}`, col4, summaryY + 8);
  if (sheet.completedAt) {
    doc.text(`Completed: ${new Date(sheet.completedAt).toLocaleTimeString('en-IN')}`, col4, summaryY + 15);
  }

  // Save PDF
  const filename = `Production_${sheet.shift}_${sheet.productionDate}.pdf`;
  doc.save(filename);
}
