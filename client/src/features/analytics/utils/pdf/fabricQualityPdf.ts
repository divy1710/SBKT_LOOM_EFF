import autoTable from 'jspdf-autotable';
import type {
  FabricQualityAnalyticsData,
  FabricQualityItem,
} from '../../types/analytics.types';
import {
  createBasePdfReport,
  drawMetricCards,
  embedChartImage,
  applyPdfPageNumbersAndFooters,
  type MetricCardItem,
} from './pdfHelpers';

export interface FabricQualityPdfOptions {
  data: FabricQualityAnalyticsData;
  tableItems: FabricQualityItem[];
  chartImage?: string | null;
  startDate: string;
  endDate: string;
  shift: string;
  factoryName?: string;
  factoryLogo?: string | null;
  factoryTimezone?: string;
}

export function exportFabricQualityPdf({
  data,
  tableItems,
  chartImage,
  startDate,
  endDate,
  shift,
  factoryName,
  factoryLogo,
  factoryTimezone,
}: FabricQualityPdfOptions): void {
  const { doc, pageWidth, pageHeight, startContentY } = createBasePdfReport({
    title: 'Fabric Quality Production Report',
    factoryName,
    factoryLogo,
    factoryTimezone,
    startDate,
    endDate,
    shift,
    orientation: 'portrait',
  });

  let curY = startContentY;

  // 1. Metric Cards
  const cards: MetricCardItem[] = [
    {
      label: 'Total Production',
      value: `${data.grandTotalProduction.toLocaleString('en-IN')} m`,
      subtext: 'Across all fabric qualities',
    },
    {
      label: 'Qualities Produced',
      value: `${data.fabricsCount}`,
      subtext: 'Distinct fabrics active',
    },
    {
      label: 'Top Producing Quality',
      value: data.topFabric ? data.topFabric.fabricName : 'None',
      subtext: data.topFabric
        ? `${data.topFabric.totalProductionMeters.toLocaleString('en-IN')} m (${data.topFabric.percentageShare.toFixed(1)}% of total)`
        : 'No records',
    },
    {
      label: 'Total Shift Entries',
      value: `${data.fabrics.reduce((acc, i) => acc + i.entriesCount, 0)}`,
      subtext: 'Entries across all sheets',
    },
  ];

  curY = drawMetricCards(doc, curY, cards, pageWidth, 4);

  // 2. Embedded Distribution Chart
  if (chartImage) {
    curY = embedChartImage(
      doc,
      curY + 3,
      chartImage,
      'Fabric Quality Production Volume Distribution',
      pageWidth,
      pageHeight,
    );
  }

  // 3. Fabric Production Table (All Individual Fabrics)
  const itemsToRender = tableItems && tableItems.length > 0 ? tableItems : data.fabrics;

  if (itemsToRender.length > 0) {
    if (curY + 30 > pageHeight - 20) {
      doc.addPage();
      curY = 15;
    }

    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59);
    doc.text('FABRIC QUALITY PERFORMANCE TABLE', 14, curY);

    const tableRows = itemsToRender.map((item) => [
      item.fabricName,
      item.fabricCode || '—',
      `${item.totalProductionMeters.toFixed(1)} m`,
      `${item.percentageShare.toFixed(1)}%`,
      item.entriesCount.toString(),
      `${item.avgProductionPerEntry.toFixed(1)} m`,
    ]);

    autoTable(doc, {
      startY: curY + 4,
      head: [
        [
          'Fabric Quality Name',
          'Fabric Code',
          'Total Meters',
          'Production Share',
          'Entries',
          'Avg / Entry',
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
        cellPadding: 2.2,
        textColor: [51, 65, 85],
      },
      columnStyles: {
        0: { cellWidth: 55, fontStyle: 'bold' },
        1: { cellWidth: 30 },
        2: { cellWidth: 32, halign: 'right', fontStyle: 'bold' },
        3: { cellWidth: 28, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 'auto', halign: 'right' },
      },
      alternateRowStyles: {
        fillColor: [248, 250, 252],
      },
    });
  }

  // 4. Page Numbers & Footers
  applyPdfPageNumbersAndFooters(doc);

  // 5. Save PDF
  const filename = `Fabric_Quality_Report_${startDate}_to_${endDate}_${shift}.pdf`;
  doc.save(filename);
}
