/**
 * Theoretical Production Formula:
 * Theoretical Production Meters = (RPM * 60 * ShiftDurationHours) / (39.37 * PPI)
 *
 * Automatic Efficiency Formula:
 * Efficiency Percent = (Actual Production Meters / Theoretical Production Meters) * 100
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
  const val = (rpm * 60 * shiftDurationHours) / (39.37 * ppi);
  return Number(val.toFixed(2));
}

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
  const val = (actualMeters / theoreticalMeters) * 100;
  return Number(val.toFixed(2));
}

export function getShiftTimingText(shift: 'DAY' | 'NIGHT'): string {
  return shift === 'DAY' ? '08:00 AM – 07:00 PM (11 hrs)' : '07:00 PM – 08:00 AM (13 hrs)';
}

export function formatFriendlyDate(dateStr: string): string {
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  } catch {
    // fallback
  }
  return dateStr;
}

export function getEfficiencyBadgeColor(efficiency: number | null): {
  bg: string;
  text: string;
  border: string;
} {
  if (efficiency === null) {
    return { bg: 'bg-slate-800/60', text: 'text-slate-400', border: 'border-slate-700' };
  }
  if (efficiency >= 85) {
    return { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' };
  }
  if (efficiency >= 70) {
    return { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' };
  }
  return { bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' };
}
