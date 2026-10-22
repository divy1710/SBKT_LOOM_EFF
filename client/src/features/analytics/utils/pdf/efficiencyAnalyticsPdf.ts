import autoTable from 'jspdf-autotable';
import type {
  EfficiencySummaryData,
  EfficiencyRankingItem,
  MachineEfficiencyDetailRow,
} from '../../types/analytics.types';
import {
  createBasePdfReport,
  drawMetricCards,
  embedChartImage,
  applyPdfPageNumbersAndFooters,
  formatFriendlyDate,
  type MetricCardItem,
} from './pdfHelpers';

export interface EfficiencySummaryPdfOptions {
  summary: EfficiencySummaryData;
  ranking: EfficiencyRankingItem[];
  belowThreshold: EfficiencyRankingItem[];
  minThreshold: number;
  selectedMachineNumber?: string;
  chartImage?: string | null;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
}

export function exportEfficiencySummaryPdf({
  summary,
  ranking,
  belowThreshold,
  minThreshold,
  selectedMachineNumber,
  chartImage,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryLogo,
  factoryTimezone,
}: EfficiencySummaryPdfOptions): void {
  const extraFilters = [
    { label: 'Selected Loom', value: selectedMachineNumber ? `Loom ${selectedMachineNumber}` : 'All Looms' },
    { label: 'Benchmark Target', value: `>= ${minThreshold}%` },
    { label: 'Averaging Method', value: 'Arithmetic mean of valid recorded entries' },
  ];

  const { doc, pageWidth, pageHeight, startContentY } = createBasePdfReport({
    title: 'Machine Efficiency Analysis Report',
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

  // 1. Summary Cards
  const cards: MetricCardItem[] = [
    {
      label: 'Overall Avg Efficiency',
      value: summary.overallAvgEfficiency !== null ? `${summary.overallAvgEfficiency.toFixed(2)}%` : '—',
      subtext: `Across ${summary.overallEntriesCount} valid records`,
    },
    {
      label: 'Day-Shift Avg Efficiency',
      value: summary.dayAvgEfficiency !== null ? `${summary.dayAvgEfficiency.toFixed(2)}%` : '—',
      subtext: `Across ${summary.dayEntriesCount} day records`,
    },
    {
      label: 'Night-Shift Avg Efficiency',
      value: summary.nightAvgEfficiency !== null ? `${summary.nightAvgEfficiency.toFixed(2)}%` : '—',
      subtext: `Across ${summary.nightEntriesCount} night records`,
    },
    {
      label: 'Below Benchmark Target',
      value: `${belowThreshold.length} Looms`,
      subtext: `< ${minThreshold}% minimum efficiency`,
    },
  ];

  curY = drawMetricCards(doc, curY, cards, pageWidth, 4);

  // 2. Embedded Trend Chart (if machine selected)
  if (chartImage) {
    curY = embedChartImage(
      doc,
      curY + 3,
      chartImage,
      selectedMachineNumber
        ? `Loom ${selectedMachineNumber} Efficiency Trend (% Over Time)`
        : 'Machine Efficiency Trend',
      pageWidth,
      pageHeight,
    );
  }

  // 3. Efficiency Ranking Table
  if (ranking.length > 0) {
    if (curY + 25 > pageHeight - 25) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('MACHINE EFFICIENCY RANKINGS (ARITHMETIC MEAN)', 14, curY);

    const rankingRows = ranking.map((r) => [
      `#${r.rank}`,
      `Loom ${r.machineNumber}`,
      r.avgEfficiency !== null ? `${r.avgEfficiency.toFixed(2)}%` : '—',
      r.dayAvgEfficiency !== null ? `${r.dayAvgEfficiency.toFixed(2)}%` : '—',
      r.nightAvgEfficiency !== null ? `${r.nightAvgEfficiency.toFixed(2)}%` : '—',
      r.validEntriesCount.toString(),
      r.avgEfficiency !== null && r.avgEfficiency >= minThreshold ? 'COMPLIANT' : 'BELOW TARGET',
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [
        [
          'Rank',
          'Machine Number',
          'Average Efficiency (%)',
          'Day Avg (%)',
          'Night Avg (%)',
          'Valid Shifts',
          'Status vs Target',
        ],
      ],
      body: rankingRows,
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
        2: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right' },
        5: { cellWidth: 28, halign: 'center' },
        6: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });

    curY = (doc as any).lastAutoTable?.finalY ? (doc as any).lastAutoTable.finalY + 6 : curY + 30;
  }

  // 4. Below Benchmark Threshold Looms
  if (belowThreshold.length > 0) {
    if (curY + 25 > pageHeight - 25) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(9.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28);
    doc.text(`LOOMS BELOW MINIMUM EFFICIENCY BENCHMARK (< ${minThreshold}%)`, 14, curY);

    const belowRows = belowThreshold.map((r) => [
      `Loom ${r.machineNumber}`,
      r.avgEfficiency !== null ? `${r.avgEfficiency.toFixed(2)}%` : '—',
      r.dayAvgEfficiency !== null ? `${r.dayAvgEfficiency.toFixed(2)}%` : '—',
      r.nightAvgEfficiency !== null ? `${r.nightAvgEfficiency.toFixed(2)}%` : '—',
      r.avgEfficiency !== null ? `-${(minThreshold - r.avgEfficiency).toFixed(2)}%` : '—',
      r.validEntriesCount.toString(),
    ]);

    autoTable(doc, {
      startY: curY + 3,
      head: [
        [
          'Machine Number',
          'Recorded Efficiency (%)',
          'Day Avg (%)',
          'Night Avg (%)',
          'Gap to Benchmark',
          'Valid Shifts',
        ],
      ],
      body: belowRows,
      theme: 'grid',
      headStyles: {
        fillColor: [185, 28, 28],
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
        0: { cellWidth: 40, fontStyle: 'bold' },
        1: { cellWidth: 45, halign: 'right', fontStyle: 'bold' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 35, halign: 'right' },
        4: { cellWidth: 35, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [254, 242, 242],
      },
    });
  }

  // 5. Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // 6. Save PDF
  const filename = `Efficiency_Analytics_Report_${startDate}_to_${endDate}_${shift}.pdf`;
  doc.save(filename);
}

export interface DetailedEfficiencyPdfOptions {
  records: MachineEfficiencyDetailRow[];
  machineNumber?: string;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
}

export function exportDetailedEfficiencyPdf({
  records,
  machineNumber,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryLogo,
  factoryTimezone,
}: DetailedEfficiencyPdfOptions): void {
  const loomText = machineNumber ? `Machine ${machineNumber}` : 'All Machines';

  const extraFilters = [
    { label: 'Scope', value: `${loomText} Detailed Production & Efficiency Snapshots` },
    { label: 'Total Records', value: `${records.length} shift entries` },
  ];

  const { doc, pageWidth, startContentY } = createBasePdfReport({
    title: `Detailed Efficiency Analysis — ${loomText}`,
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

  // Informative Methodology Note
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, curY, pageWidth - 28, 12, 1.5, 1.5, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(51, 65, 85);
  doc.text(
    'METHODOLOGY NOTE: AUTO efficiency is calculated from textile specifications: (RPM * 60 * Hours) / (39.37 * PPI). ' +
    'MANUAL efficiency preserves operator recorded values directly without recalculation. Historical snapshots reflect machine state at sheet completion.',
    17,
    curY + 5,
    { maxWidth: pageWidth - 34 }
  );

  curY += 16;

  // Table Data
  const tableRows = records.map((r) => [
    formatFriendlyDate(r.productionDate),
    r.shift,
    machineNumber ? `Loom ${machineNumber}` : '—',
    r.fabricQuality || '—',
    `${r.actualProductionMeters.toFixed(1)} m`,
    r.efficiencyPercent !== null ? `${r.efficiencyPercent.toFixed(1)}%` : '—',
    r.efficiencyMode || 'AUTO',
    r.rpmSnapshot ? String(r.rpmSnapshot) : '—',
    r.ppiSnapshot ? String(r.ppiSnapshot) : '—',
    r.theoreticalProductionMeters !== null ? `${r.theoreticalProductionMeters.toFixed(1)} m` : '—',
  ]);

  autoTable(doc, {
    startY: curY,
    head: [
      [
        'Date',
        'Shift',
        'Machine',
        'Fabric Quality (Snapshot)',
        'Actual (m)',
        'Efficiency',
        'Mode',
        'RPM',
        'PPI',
        'Theoretical (m)',
      ],
    ],
    body: tableRows,
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
      0: { cellWidth: 26, fontStyle: 'bold' },
      1: { cellWidth: 18, halign: 'center' },
      2: { cellWidth: 22, fontStyle: 'bold' },
      3: { cellWidth: 55 },
      4: { cellWidth: 26, halign: 'right', fontStyle: 'bold' },
      5: { cellWidth: 24, halign: 'right', fontStyle: 'bold' },
      6: { cellWidth: 20, halign: 'center' },
      7: { cellWidth: 18, halign: 'right' },
      8: { cellWidth: 18, halign: 'right' },
      9: { cellWidth: 'auto', halign: 'right' },
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
  });

  // Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // Save PDF
  const filename = `Detailed_Efficiency_Log_${machineNumber ? `Loom_${machineNumber}` : 'All'}_${startDate}_to_${endDate}.pdf`;
  doc.save(filename);
}
