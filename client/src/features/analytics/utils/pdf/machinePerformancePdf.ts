import autoTable from 'jspdf-autotable';
import type { MachinePerformanceData } from '../../types/analytics.types';
import {
  createBasePdfReport,
  drawMetricCards,
  embedChartImage,
  applyPdfPageNumbersAndFooters,
  type MetricCardItem,
} from './pdfHelpers';

export interface MachinePerformancePdfOptions {
  data: MachinePerformanceData;
  threshold: number;
  chartImage?: string | null;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
}

export function exportMachinePerformancePdf({
  data,
  threshold,
  chartImage,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryLogo,
  factoryTimezone,
}: MachinePerformancePdfOptions): void {
  const extraFilters = [
    { label: 'Shift Output Threshold', value: `${threshold} m / recorded shift` },
    { label: 'Active Looms Logged', value: `${data.totalActiveMachines - data.unrecordedMachinesCount} of ${data.totalActiveMachines}` },
  ];

  const { doc, pageWidth, pageHeight, startContentY } = createBasePdfReport({
    title: 'Machine Production Performance Report',
    factoryName,
    factoryLogo,
    factoryTimezone,
    startDate,
    endDate,
    shift,
    orientation: 'landscape',
    extraFilters,
  });

  let curY = startContentY;

  // 1. Metric Cards
  const cards: MetricCardItem[] = [
    {
      label: 'Top Producer',
      value: data.top5.length > 0 ? `Loom ${data.top5[0]!.machineNumber}` : '—',
      subtext: data.top5.length > 0 ? `${data.top5[0]!.totalProductionMeters.toLocaleString('en-IN')} m` : 'No data',
    },
    {
      label: 'Lowest Recorded Loom',
      value: data.bottom5.length > 0 ? `Loom ${data.bottom5[0]!.machineNumber}` : '—',
      subtext: data.bottom5.length > 0 ? `${data.bottom5[0]!.totalProductionMeters.toLocaleString('en-IN')} m` : 'No data',
    },
    {
      label: 'Below-Threshold Looms',
      value: `${data.belowThreshold.length} Looms`,
      subtext: `< ${threshold} m / shift average`,
    },
    {
      label: 'Looms Without Records',
      value: `${data.unrecordedMachinesCount} Looms`,
      subtext: 'Excluded from performance rankings',
    },
  ];

  curY = drawMetricCards(doc, curY, cards, pageWidth, 4);

  // 2. Embedded Comparison Chart
  if (chartImage) {
    curY = embedChartImage(
      doc,
      curY + 3,
      chartImage,
      'Machine Production Output Comparison',
      pageWidth,
      pageHeight,
    );
  }

  // 3. Top 5 Machines Table
  if (data.top5.length > 0) {
    if (curY + 25 > pageHeight - 25) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('TOP 5 PERFORMING MACHINES (BY PRODUCTION VOLUME)', 14, curY);

    const topRows = data.top5.map((m) => [
      `#${m.rank}`,
      `Loom ${m.machineNumber}`,
      m.fabricName || '—',
      `${m.totalProductionMeters.toLocaleString('en-IN')} m`,
      `${m.avgProductionPerShift.toFixed(1)} m`,
      m.entriesCount.toString(),
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [
        [
          'Rank',
          'Machine Number',
          'Fabric Quality (Current / Snapshot)',
          'Total Production (m)',
          'Avg / Shift (m)',
          'Recorded Shifts',
        ],
      ],
      body: topRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    curY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : curY + 30;
  }

  // 4. Bottom 5 Machines Table
  if (data.bottom5.length > 0) {
    if (curY + 25 > pageHeight - 25) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('BOTTOM 5 MACHINES (PRODUCTION-BASED RANKING)', 14, curY);

    const bottomRows = data.bottom5.map((m) => [
      `#${m.rank}`,
      `Loom ${m.machineNumber}`,
      m.fabricName || '—',
      `${m.totalProductionMeters.toLocaleString('en-IN')} m`,
      `${m.avgProductionPerShift.toFixed(1)} m`,
      m.entriesCount.toString(),
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [
        [
          'Rank',
          'Machine Number',
          'Fabric Quality',
          'Total Production (m)',
          'Avg / Shift (m)',
          'Recorded Shifts',
        ],
      ],
      body: bottomRows,
      theme: 'grid',
      headStyles: {
        fillColor: [71, 85, 105], // slate-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 18, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 35, fontStyle: 'bold' },
        2: { cellWidth: 70 },
        3: { cellWidth: 40, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    curY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : curY + 30;
  }

  // 5. Below-Threshold Machines Audit Table
  if (data.belowThreshold.length > 0) {
    if (curY + 25 > pageHeight - 25) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // red-700
    doc.text(`MACHINES PRODUCING BELOW THRESHOLD (< ${threshold} M / RECORDED SHIFT)`, 14, curY);

    const thresholdRows = data.belowThreshold.map((m) => [
      `Loom ${m.machineNumber}`,
      m.fabricName || '—',
      `${m.totalProductionMeters.toLocaleString('en-IN')} m`,
      `${m.avgProductionPerShift.toFixed(1)} m`,
      `${threshold} m`,
      `Deficit: ${(threshold - m.avgProductionPerShift).toFixed(1)} m`,
      m.entriesCount.toString(),
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [
        [
          'Machine Number',
          'Fabric Quality',
          'Total Output (m)',
          'Avg / Shift Output',
          'Threshold Target',
          'Variance / Gap',
          'Shifts',
        ],
      ],
      body: thresholdRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28], // red-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8,
      },
      styles: {
        fontSize: 7.5,
        cellPadding: 1.8,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 35, fontStyle: 'bold' },
        1: { cellWidth: 65 },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 30, halign: 'right' },
        5: { cellWidth: 35, halign: 'right' },
        6: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242], // red-50
      },
    });
  }

  // 6. Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // 7. Save PDF
  const filename = `Machine_Performance_Report_${startDate}_to_${endDate}_${shift}.pdf`;
  doc.save(filename);
}
