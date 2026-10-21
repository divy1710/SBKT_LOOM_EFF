import * as XLSX from 'xlsx';
import type { ProductionSheet } from '../types/production.types';
import { formatFriendlyDate, getShiftTimingText } from './production-calc';

interface ExportExcelOptions {
  sheet: ProductionSheet;
  factoryName: string;
}

export function exportProductionSheetExcel({ sheet, factoryName }: ExportExcelOptions): void {
  const wb = XLSX.utils.book_new();

  // Prepare data array for worksheet
  const rows: any[][] = [];

  // Title & Metadata
  rows.push([factoryName.toUpperCase()]);
  rows.push(['SHIFT PRODUCTION & EFFICIENCY REPORT']);
  rows.push([]);
  rows.push(['Production Date:', formatFriendlyDate(sheet.productionDate)]);
  rows.push(['Shift:', `${sheet.shift} SHIFT (${getShiftTimingText(sheet.shift)})`]);
  rows.push(['Status:', sheet.status]);
  rows.push(['Generated At:', new Date().toLocaleString('en-IN')]);
  rows.push([]);

  // Table Headers
  const headers = [
    'Machine No.',
    'Fabric Quality',
    'Fabric Code',
    'Loom Status',
    'RPM',
    'PPI',
    'Mode',
    'Efficiency (%)',
    'Production (Meters)',
    'Theoretical (Meters)',
    'Notes',
  ];
  rows.push(headers);

  // Table Rows
  for (const entry of sheet.entries) {
    rows.push([
      entry.machineNumberSnapshot,
      entry.fabricNameSnapshot,
      entry.fabricCodeSnapshot || '',
      entry.machineStatusSnapshot,
      entry.rpmSnapshot,
      entry.ppiSnapshot,
      entry.efficiencyMode,
      entry.efficiencyPercent !== null ? entry.efficiencyPercent : '',
      entry.actualProductionMeters,
      entry.theoreticalProductionMeters !== null ? entry.theoreticalProductionMeters : '',
      entry.notes || '',
    ]);
  }

  // Summary Totals
  rows.push([]);
  rows.push(['SUMMARY TOTALS']);
  rows.push(['Total Production (Meters):', sheet.totalProductionMeters]);
  rows.push([
    'Average Efficiency (%):',
    sheet.averageEfficiency !== null ? sheet.averageEfficiency : 'N/A',
  ]);
  rows.push(['Running Machines:', sheet.runningMachineCount]);
  rows.push(['Stopped Machines:', sheet.stoppedMachineCount]);
  rows.push(['Maintenance Machines:', sheet.maintenanceMachineCount]);
  rows.push(['Total Looms Recorded:', sheet.entries.length]);

  // Create sheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Set column widths
  ws['!cols'] = [
    { wch: 14 }, // Machine No
    { wch: 24 }, // Fabric Name
    { wch: 16 }, // Fabric Code
    { wch: 14 }, // Status
    { wch: 10 }, // RPM
    { wch: 10 }, // PPI
    { wch: 10 }, // Mode
    { wch: 15 }, // Efficiency
    { wch: 20 }, // Actual Meters
    { wch: 20 }, // Theoretical Meters
    { wch: 30 }, // Notes
  ];

  // Append sheet and save
  const sheetName = `${sheet.shift}_${sheet.productionDate}`.substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const filename = `Production_${sheet.shift}_${sheet.productionDate}.xlsx`;
  XLSX.writeFile(wb, filename);
}
