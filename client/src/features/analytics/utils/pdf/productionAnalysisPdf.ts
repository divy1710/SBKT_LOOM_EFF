import autoTable from 'jspdf-autotable';
import type {
  ProductionSummaryData,
  ProductionTrendItem,
} from '../../types/analytics.types';
import {
  createBasePdfReport,
  drawMetricCards,
  drawSmartInsightsBox,
  embedChartImage,
  applyPdfPageNumbersAndFooters,
  formatFriendlyDate,
  type MetricCardItem,
} from './pdfHelpers';

export interface ProductionAnalysisPdfOptions {
  summary: ProductionSummaryData;
  trend: ProductionTrendItem[];
  chartImage?: string | null;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryTimezone?: string;
}

export function exportProductionAnalysisPdf({
  summary,
  trend,
  chartImage,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryTimezone,
}: ProductionAnalysisPdfOptions): void {
  const { doc, pageWidth, pageHeight, startContentY } = createBasePdfReport({
    title: 'Production Analysis Report',
    factoryName,
    factoryTimezone,
    startDate,
    endDate,
    shift,
    orientation: 'portrait',
  });

  let curY = startContentY;

  // 1. Metric Cards
  const pctText = summary.percentageChange !== null
    ? `${summary.percentageChange >= 0 ? '+' : ''}${summary.percentageChange.toFixed(1)}% vs prev period`
    : 'No prev comparison';

  const cards: MetricCardItem[] = [
    {
      label: 'Selected Period Output',
      value: `${summary.periodProduction.toLocaleString('en-IN')} m`,
      subtext: pctText,
    },
    {
      label: 'Prev Equivalent Period',
      value: `${summary.previousPeriodProduction.toLocaleString('en-IN')} m`,
      subtext: `${formatFriendlyDate(summary.comparisonPeriod.startDate)} - ${formatFriendlyDate(summary.comparisonPeriod.endDate)}`,
    },
    {
      label: 'This Week Total',
      value: `${summary.weekProduction.toLocaleString('en-IN')} m`,
      subtext: 'Current ISO Week',
    },
    {
      label: 'This Month Total',
      value: `${summary.monthProduction.toLocaleString('en-IN')} m`,
      subtext: 'Current Calendar Month',
    },
    {
      label: 'Avg Daily Production',
      value: `${summary.avgDailyProduction.toLocaleString('en-IN')} m`,
      subtext: `Across ${summary.distinctDaysCount} active days`,
    },
    {
      label: 'Best Production Day',
      value: summary.bestDay ? `${summary.bestDay.meters.toLocaleString('en-IN')} m` : '—',
      subtext: summary.bestDay ? formatFriendlyDate(summary.bestDay.date) : 'No data',
    },
    {
      label: 'Lowest Production Day',
      value: summary.lowestDay ? `${summary.lowestDay.meters.toLocaleString('en-IN')} m` : '—',
      subtext: summary.lowestDay ? formatFriendlyDate(summary.lowestDay.date) : 'No data',
    },
    {
      label: 'Top Performing Loom',
      value: summary.bestMachine ? `Loom ${summary.bestMachine.machineNumber}` : '—',
      subtext: summary.bestMachine
        ? `${summary.bestMachine.meters.toLocaleString('en-IN')} m (${summary.bestMachine.fabricName})`
        : 'No data',
    },
  ];

  curY = drawMetricCards(doc, curY, cards, pageWidth, 4);

  // 2. Smart Insights
  if (summary.insights && summary.insights.length > 0) {
    curY = drawSmartInsightsBox(doc, curY + 2, summary.insights, pageWidth);
  }

  // 3. Embedded Trend Chart Image
  if (chartImage) {
    curY = embedChartImage(
      doc,
      curY + 3,
      chartImage,
      'Daily Production Trend Chart',
      pageWidth,
      pageHeight,
    );
  }

  // 4. Date-wise Production Supporting Table
  if (trend.length > 0) {
    // Check if new page is needed for table
    if (curY + 30 > pageHeight - 20) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('DATE-WISE PRODUCTION BREAKDOWN', 14, curY);

    const tableRows = trend.map((t) => [
      formatFriendlyDate(t.date),
      t.dayMeters > 0 ? `${t.dayMeters.toFixed(1)} m` : '—',
      t.nightMeters > 0 ? `${t.nightMeters.toFixed(1)} m` : '—',
      `${t.totalMeters.toFixed(1)} m`,
      t.runningMachines.toString(),
    ]);

    autoTable(doc, {
      startY: curY + 4,
      head: [
        [
          'Date',
          'Day Shift (m)',
          'Night Shift (m)',
          'Combined Output (m)',
          'Running Looms',
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
        0: { cellWidth: 38, fontStyle: 'bold' },
        1: { cellWidth: 35, halign: 'right' },
        2: { cellWidth: 35, halign: 'right' },
        3: { cellWidth: 42, halign: 'right', fontStyle: 'bold' },
        4: { cellWidth: 'auto', halign: 'center' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  }

  // 5. Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // 6. Save PDF
  const filename = `Production_Analysis_${startDate}_to_${endDate}_${shift}.pdf`;
  doc.save(filename);
}
