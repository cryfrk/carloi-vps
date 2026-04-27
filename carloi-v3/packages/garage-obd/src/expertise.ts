import type { ExpertiseCountdown, ExpertiseEvent, ExpertisePhase, ExpertiseReport, ObdLiveSensorReading } from './types.js';

export const DEFAULT_DRIVE_TEST_DURATION_SECONDS = 10 * 60;

export function createDefaultCountdown(): ExpertiseCountdown {
  return {
    totalSeconds: DEFAULT_DRIVE_TEST_DURATION_SECONDS,
    remainingSeconds: DEFAULT_DRIVE_TEST_DURATION_SECONDS
  };
}

export function nextExpertisePhase(current: ExpertisePhase, event: ExpertiseEvent): ExpertisePhase {
  switch (current) {
    case 'idle':
      if (event === 'start-precheck') return 'obd-precheck';
      return current;
    case 'obd-precheck':
      if (event === 'precheck-passed') return 'ready';
      if (event === 'precheck-failed') return 'report-failed';
      return current;
    case 'ready':
      if (event === 'start-countdown') return 'countdown';
      return current;
    case 'countdown':
      if (event === 'countdown-finished') return 'collecting';
      return current;
    case 'collecting':
      if (event === 'data-threshold-met') return 'analyzing';
      return current;
    case 'analyzing':
      if (event === 'analysis-complete') return 'report-ready';
      if (event === 'analysis-failed') return 'report-failed';
      return current;
    case 'report-ready':
    case 'report-failed':
      if (event === 'reset') return 'idle';
      return current;
    default:
      return current;
  }
}

export function hasMinimumExpertiseTelemetry(readings: ObdLiveSensorReading[]): boolean {
  if (readings.length < 20) {
    return false;
  }

  const distinctSensors = new Set(readings.map((reading) => reading.sensorKey));
  return distinctSensors.size >= 5;
}

export function summarizeExpertiseReport(report: ExpertiseReport): string[] {
  const summary: string[] = [];

  if (typeof report.healthScore === 'number') {
    summary.push(`Arac saglik puani ${report.healthScore}/100`);
  }

  if (typeof report.driveScore === 'number') {
    summary.push(`Surus puani ${report.driveScore}/100`);
  }

  if (report.dtcCodes.length > 0) {
    summary.push(`Toplam ${report.dtcCodes.length} DTC bulundu`);
  }

  if (report.riskHints.length > 0) {
    summary.push(`${report.riskHints.length} adet riskli parca adayi isaretlendi`);
  }

  return summary;
}
