/**
 * Production Calculations and Shift Timing Utilities
 * Formula confirmed by textile engineering requirements:
 * Theoretical Production Meters = (RPM * 60 * ShiftDurationHours) / (39.37 * PPI)
 */

export interface ShiftTimings {
  shiftStart: Date;
  shiftEnd: Date;
  durationHours: number;
  timeRangeFormatted: string; // e.g. "08:00 AM – 07:00 PM"
}

/**
 * Normalizes 'YYYY-MM-DD' date string to midnight UTC Date
 */
export function normalizeProductionDate(dateStr: string): Date {
  const parts = dateStr.trim().split('-');
  if (parts.length !== 3) {
    throw new Error('Invalid date format. Expected YYYY-MM-DD');
  }
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (isNaN(year) || isNaN(month) || isNaN(day)) {
    throw new Error('Invalid date components');
  }

  // Use UTC midnight for clean, timezone-agnostic date persistence
  return new Date(Date.UTC(year, month, day, 0, 0, 0, 0));
}

/**
 * Formats a Date object or date string to 'YYYY-MM-DD'
 */
export function formatProductionDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Calculates start and end timestamps for Day and Night shifts in factory timezone
 * Day Shift: 08:00 AM to 07:00 PM (11 hours)
 * Night Shift: 07:00 PM to 08:00 AM next morning (13 hours)
 */
export function getShiftTimings(dateStr: string, shift: 'DAY' | 'NIGHT'): ShiftTimings {
  const parts = dateStr.trim().split('-');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10) - 1;
  const day = parseInt(parts[2], 10);

  if (shift === 'DAY') {
    // 08:00 AM to 07:00 PM (11 hours)
    // In IST (UTC+5:30): 08:00 IST is 02:30 UTC, 19:00 IST is 13:30 UTC
    const shiftStart = new Date(Date.UTC(year, month, day, 2, 30, 0, 0));
    const shiftEnd = new Date(Date.UTC(year, month, day, 13, 30, 0, 0));
    return {
      shiftStart,
      shiftEnd,
      durationHours: 11,
      timeRangeFormatted: '08:00 AM – 07:00 PM',
    };
  } else {
    // 07:00 PM to 08:00 AM next morning (13 hours)
    // 19:00 IST on dateStr is 13:30 UTC
    // 08:00 IST next day is 02:30 UTC on day+1
    const shiftStart = new Date(Date.UTC(year, month, day, 13, 30, 0, 0));
    const nextDay = new Date(Date.UTC(year, month, day + 1, 2, 30, 0, 0));
    return {
      shiftStart,
      shiftEnd: nextDay,
      durationHours: 13,
      timeRangeFormatted: '07:00 PM – 08:00 AM (+1 day)',
    };
  }
}

/**
 * Calculates theoretical production in meters for given RPM, PPI, and Shift Hours
 * Formula: (RPM * 60 * ShiftDurationHours) / (39.37 * PPI)
 */
export function calculateTheoreticalProduction(
  rpm: number,
  ppi: number,
  shiftDurationHours: number,
): number | null {
  if (
    typeof rpm !== 'number' ||
    typeof ppi !== 'number' ||
    !isFinite(rpm) ||
    !isFinite(ppi) ||
    rpm <= 0 ||
    ppi <= 0 ||
    shiftDurationHours <= 0
  ) {
    return null;
  }
  const theoretical = (rpm * 60 * shiftDurationHours) / (39.37 * ppi);
  return Number(theoretical.toFixed(2));
}

/**
 * Calculates efficiency percentage
 * Formula: (Actual Production Meters / Theoretical Production Meters) * 100
 */
export function calculateEfficiency(
  actualMeters: number,
  theoreticalMeters: number | null,
): number | null {
  if (
    typeof actualMeters !== 'number' ||
    !isFinite(actualMeters) ||
    actualMeters < 0 ||
    theoreticalMeters === null ||
    theoreticalMeters <= 0
  ) {
    return null;
  }
  if (actualMeters === 0) {
    return 0;
  }
  const efficiency = (actualMeters / theoreticalMeters) * 100;
  return Number(efficiency.toFixed(2));
}

/**
 * Computes production sheet aggregate summary totals
 */
export interface SheetTotals {
  totalProductionMeters: number;
  runningMachineCount: number;
  stoppedMachineCount: number;
  maintenanceMachineCount: number;
  averageEfficiency: number | null;
}

export function computeSheetTotals(
  entries: Array<{
    actualProductionMeters: number;
    machineStatusSnapshot: 'RUNNING' | 'STOPPED' | 'MAINTENANCE';
    efficiencyPercent: number | null;
  }>,
): SheetTotals {
  let totalProductionMeters = 0;
  let runningMachineCount = 0;
  let stoppedMachineCount = 0;
  let maintenanceMachineCount = 0;

  const validEfficiencies: number[] = [];

  for (const entry of entries) {
    const meters = Number(entry.actualProductionMeters) || 0;
    totalProductionMeters += meters;

    if (entry.machineStatusSnapshot === 'RUNNING') {
      runningMachineCount++;
    } else if (entry.machineStatusSnapshot === 'STOPPED') {
      stoppedMachineCount++;
    } else if (entry.machineStatusSnapshot === 'MAINTENANCE') {
      maintenanceMachineCount++;
    }

    if (typeof entry.efficiencyPercent === 'number' && isFinite(entry.efficiencyPercent)) {
      validEfficiencies.push(entry.efficiencyPercent);
    }
  }

  const averageEfficiency =
    validEfficiencies.length > 0
      ? Number((validEfficiencies.reduce((sum, e) => sum + e, 0) / validEfficiencies.length).toFixed(2))
      : null;

  return {
    totalProductionMeters: Number(totalProductionMeters.toFixed(2)),
    runningMachineCount,
    stoppedMachineCount,
    maintenanceMachineCount,
    averageEfficiency,
  };
}
