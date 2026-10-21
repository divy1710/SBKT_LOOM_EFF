import {
  exportProductionAnalysisPdf,
  type ProductionAnalysisPdfOptions,
} from '../utils/pdf/productionAnalysisPdf';
import {
  exportMachineAnalyticsPdf,
  type MachineAnalyticsPdfOptions,
} from '../utils/pdf/machineAnalyticsPdf';
import {
  exportFabricQualityPdf,
  type FabricQualityPdfOptions,
} from '../utils/pdf/fabricQualityPdf';
import {
  exportMachinePerformancePdf,
  type MachinePerformancePdfOptions,
} from '../utils/pdf/machinePerformancePdf';
import {
  exportEfficiencySummaryPdf,
  exportDetailedEfficiencyPdf,
  type EfficiencySummaryPdfOptions,
  type DetailedEfficiencyPdfOptions,
} from '../utils/pdf/efficiencyAnalyticsPdf';
import { captureChartImage } from '../utils/pdf/pdfHelpers';

export class AnalyticsPdfService {
  /**
   * Helper to capture a chart container as PNG Data URL
   */
  static async captureChart(elementId: string): Promise<string | null> {
    return captureChartImage(elementId);
  }

  /**
   * Export Production Analysis Report PDF
   */
  static exportProductionAnalysis(options: ProductionAnalysisPdfOptions): void {
    exportProductionAnalysisPdf(options);
  }

  /**
   * Export Machine Analytics Report PDF
   */
  static exportMachineAnalytics(options: MachineAnalyticsPdfOptions): void {
    exportMachineAnalyticsPdf(options);
  }

  /**
   * Export Fabric Quality Analytics Report PDF
   */
  static exportFabricQuality(options: FabricQualityPdfOptions): void {
    exportFabricQualityPdf(options);
  }

  /**
   * Export Machine Performance Report PDF
   */
  static exportMachinePerformance(options: MachinePerformancePdfOptions): void {
    exportMachinePerformancePdf(options);
  }

  /**
   * Export Efficiency Summary Report PDF
   */
  static exportEfficiencySummary(options: EfficiencySummaryPdfOptions): void {
    exportEfficiencySummaryPdf(options);
  }

  /**
   * Export Detailed Efficiency Log PDF
   */
  static exportDetailedEfficiency(options: DetailedEfficiencyPdfOptions): void {
    exportDetailedEfficiencyPdf(options);
  }
}
