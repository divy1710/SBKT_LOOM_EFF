import autoTable from 'jspdf-autotable';
import type { MachineAnalyticsData } from '../../types/analytics.types';
import {
  createBasePdfReport,
  drawMetricCards,
  embedChartImage,
  applyPdfPageNumbersAndFooters,
  formatFriendlyDate,
  type MetricCardItem,
} from './pdfHelpers';

export interface MachineAnalyticsPdfOptions {
  data: MachineAnalyticsData;
  chartImage?: string | null;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
}

export function exportMachineAnalyticsPdf({
  data,
  chartImage,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryLogo,
  factoryTimezone,
}: MachineAnalyticsPdfOptions): void {
  const cfg = data.currentConfig;
  const loomTitle = `Machine ${cfg.machineNumber} (${cfg.name || 'Loom'}) Production Report`;

  const extraFilters = [
    { label: 'Loom #', value: cfg.machineNumber },
    { label: 'Current Fabric', value: cfg.fabricName || 'Unassigned' },
    { label: 'Config RPM', value: String(cfg.rpm) },
    { label: 'Config PPI', value: String(cfg.ppi) },
    { label: 'Loom Status', value: cfg.status },
  ];

  const { doc, pageWidth, pageHeight, startContentY } = createBasePdfReport({
    title: loomTitle,
    factoryName,
    factoryLogo,
    factoryTimezone,
    startDate,
    endDate,
    shift,
    orientation: 'portrait',
    extraFilters,
  });

  let curY = startContentY;

  // 1. Metric Cards
  const cards: MetricCardItem[] = [
    {
      label: 'Total Production',
      value: `${data.totalProductionMeters.toLocaleString('en-IN')} m`,
      subtext: `Across ${data.distinctDaysCount} recorded days`,
    },
    {
      label: 'Avg Daily Output',
      value: `${data.avgDailyProduction.toLocaleString('en-IN')} m`,
      subtext: 'Mean across recorded days',
    },
    {
      label: 'Combined Daily Avg',
      value: `${data.avgCombinedDailyProduction.toLocaleString('en-IN')} m`,
      subtext: 'Grouped Day + Night records',
    },
    {
      label: 'Day-Shift Avg',
      value: `${data.avgDayShiftProduction.toLocaleString('en-IN')} m`,
      subtext: 'Day shift output',
    },
    {
      label: 'Night-Shift Avg',
      value: `${data.avgNightShiftProduction.toLocaleString('en-IN')} m`,
      subtext: 'Night shift output',
    },
    {
      label: 'Best Production Day',
      value: data.bestDay ? `${data.bestDay.meters.toLocaleString('en-IN')} m` : '—',
      subtext: data.bestDay ? formatFriendlyDate(data.bestDay.date) : 'No data',
    },
    {
      label: 'Lowest Production Day',
      value: data.lowestDay ? `${data.lowestDay.meters.toLocaleString('en-IN')} m` : '—',
      subtext: data.lowestDay ? formatFriendlyDate(data.lowestDay.date) : 'No data',
    },
    {
      label: 'Recorded Entries',
      value: `${data.recordCount} shifts`,
      subtext: 'Total valid entries logged',
    },
  ];

  curY = drawMetricCards(doc, curY, cards, pageWidth, 4);

  // 2. Embedded Machine Trend Chart
  if (chartImage) {
    curY = embedChartImage(
      doc,
      curY + 3,
      chartImage,
      `Loom ${cfg.machineNumber} Daily Production Trend`,
      pageWidth,
      pageHeight,
    );
  }

  // 3. Detailed Historical Records Table
  if (data.trend && data.trend.length > 0) {
    if (curY + 30 > pageHeight - 20) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('HISTORICAL DAILY SHIFT PRODUCTION BREAKDOWN', 14, curY);

    const tableRows = data.trend.map((r) => [
      formatFriendlyDate(r.date),
      r.fabricName || '—',
      r.dayMeters > 0 ? `${r.dayMeters.toFixed(1)} m` : '—',
      r.nightMeters > 0 ? `${r.nightMeters.toFixed(1)} m` : '—',
      `${r.totalMeters.toFixed(1)} m`,
      r.efficiencyPercent !== null ? `${r.efficiencyPercent.toFixed(1)}%` : '—',
      r.rpm ? `${r.rpm} / ${r.ppi}` : '—',
    ]);

    autoTable(doc, {
      startY: curY + 4,
      head: [
        [
          'Date',
          'Fabric Quality (Snapshot)',
          'Day Shift (m)',
          'Night Shift (m)',
          'Combined (m)',
          'Efficiency (%)',
          'RPM / PPI',
        ],
      ],
      body: tableRows,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59], // slate-800
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 8.5,
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 30, fontStyle: 'bold' },
        1: { cellWidth: 50 },
        2: { cellWidth: 26, halign: 'right' },
        3: { cellWidth: 26, halign: 'right' },
        4: { cellWidth: 28, halign: 'right', fontStyle: 'bold' },
        5: { cellWidth: 26, halign: 'right' },
        6: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  }

  // 4. Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // 5. Save PDF
  const filename = `Machine_${cfg.machineNumber}_Analysis_${startDate}_to_${endDate}.pdf`;
  doc.save(filename);
}
