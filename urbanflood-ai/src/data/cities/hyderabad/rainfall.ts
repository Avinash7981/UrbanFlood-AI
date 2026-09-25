import { RainfallData } from '@/types';

function hoursAgo(hours: number): string {
  return new Date(Date.now() - hours * 3600000).toISOString();
}

export const hyderabadRainfall: RainfallData = {
  cityId: 'hyderabad',
  current: {
    timestamp: new Date().toISOString(),
    intensityMmHr: 82,
    accumulationMm: 145,
    source: 'mock',
  },
  history: [
    { timestamp: hoursAgo(6), intensityMmHr: 8, accumulationMm: 12, source: 'mock' },
    { timestamp: hoursAgo(5.5), intensityMmHr: 12, accumulationMm: 18, source: 'mock' },
    { timestamp: hoursAgo(5), intensityMmHr: 15, accumulationMm: 26, source: 'mock' },
    { timestamp: hoursAgo(4.5), intensityMmHr: 22, accumulationMm: 37, source: 'mock' },
    { timestamp: hoursAgo(4), intensityMmHr: 35, accumulationMm: 54, source: 'mock' },
    { timestamp: hoursAgo(3.5), intensityMmHr: 48, accumulationMm: 78, source: 'mock' },
    { timestamp: hoursAgo(3), intensityMmHr: 55, accumulationMm: 105, source: 'mock' },
    { timestamp: hoursAgo(2.5), intensityMmHr: 42, accumulationMm: 126, source: 'mock' },
    { timestamp: hoursAgo(2), intensityMmHr: 58, accumulationMm: 155, source: 'mock' },
    { timestamp: hoursAgo(1.5), intensityMmHr: 72, accumulationMm: 191, source: 'mock' },
    { timestamp: hoursAgo(1), intensityMmHr: 68, accumulationMm: 225, source: 'mock' },
    { timestamp: hoursAgo(0.5), intensityMmHr: 78, accumulationMm: 264, source: 'mock' },
    { timestamp: new Date().toISOString(), intensityMmHr: 82, accumulationMm: 305, source: 'mock' },
  ],
  forecast: [
    { offsetMinutes: 0, label: 'Now', intensityMmHr: 82, confidence: 95, isDemo: true },
    { offsetMinutes: 30, label: '+30 min', intensityMmHr: 75, confidence: 85, isDemo: true },
    { offsetMinutes: 60, label: '+60 min', intensityMmHr: 60, confidence: 72, isDemo: true },
    { offsetMinutes: 90, label: '+90 min', intensityMmHr: 42, confidence: 60, isDemo: true },
    { offsetMinutes: 120, label: '+2 hr', intensityMmHr: 28, confidence: 48, isDemo: true },
    { offsetMinutes: 180, label: '+3 hr', intensityMmHr: 12, confidence: 35, isDemo: true },
  ],
  affectedAreaSqKm: 185,
  lastUpdated: new Date().toISOString(),
  isDemo: true,
};
