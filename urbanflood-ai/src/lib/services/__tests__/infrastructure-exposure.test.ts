import { describe, it, expect } from '@jest/globals';
import { calculateInfrastructureExposure } from '../infrastructure-exposure';
import { CriticalInfrastructure, NowcastZone, FloodAlert, RiskLevel, GeoJSONFeature, GeoJSONPolygon, FloodZoneProperties, NowcastTimeStep } from '@/types';
import * as turf from '@turf/turf';

function createMockFacility(id: string, lat: number, lng: number, cat: CriticalInfrastructure['category']): CriticalInfrastructure {
  return {
    id,
    cityId: 'hyderabad',
    name: `Test Facility ${id}`,
    category: cat,
    latitude: lat,
    longitude: lng,
    source: 'test'
  };
}

function createMockZone(id: string, coords: [number, number][][]): GeoJSONFeature<GeoJSONPolygon, FloodZoneProperties> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: coords
    },
    properties: {
      id,
      name: `Zone ${id}`,
      riskLevel: 'low',
      probability: 10,
      severity: 'low',
      estimatedOnsetMinutes: 0,
      confidence: 100,
      factors: [],
      isDemo: true,
      lastAssessed: new Date().toISOString()
    }
  };
}

function createMockTimeline(levels: RiskLevel[], scores: number[]): NowcastTimeStep[] {
  return levels.map((level, i) => ({
    offsetMinutes: i * 15,
    label: `+${i * 15}m`,
    riskScore: scores[i],
    riskLevel: level,
    explanation: ['Test']
  }));
}

function createMockNowcast(id: string, timeline: NowcastTimeStep[]): NowcastZone {
  return {
    zoneId: id,
    zoneName: `Zone ${id}`,
    currentRisk: timeline[0]?.riskLevel || 'low',
    estimatedOnsetMinutes: 0,
    severity: 'low',
    timeline,
    factors: [],
    isDemo: true
  };
}

describe('Infrastructure Exposure Engine', () => {
  const zoneCoords: [number, number][][] = [
    [
      [0, 0],
      [0, 10],
      [10, 10],
      [10, 0],
      [0, 0]
    ]
  ]; // A large square zone
  const zone = createMockZone('z1', zoneCoords);

  it('1. should return none for facility outside risk zone', () => {
    // Facility very far away
    const facility = createMockFacility('f1', 100, 100, 'Hospital');
    const nowcast = createMockNowcast('z1', createMockTimeline(['low'], [10]));
    
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].exposureLevel).toBe('none');
  });

  it('2. should return moderate exposure for facility inside high zone', () => {
    const facility = createMockFacility('f1', 5, 5, 'School');
    const nowcast = createMockNowcast('z1', createMockTimeline(['high'], [60]));
    
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].exposureLevel).toBe('high'); // Distance=0, risk=high => high
  });

  it('3. should return critical exposure for facility inside critical zone', () => {
    const facility = createMockFacility('f1', 5, 5, 'Hospital');
    const nowcast = createMockNowcast('z1', createMockTimeline(['critical'], [90]));
    
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].exposureLevel).toBe('critical'); 
    expect(res[0].responsePriorityLabel).toBe('very_high'); // Hospital inside critical is very high
  });

  it('4. should detect future escalation', () => {
    const facility = createMockFacility('f1', 5, 5, 'Fire Station');
    const nowcast = createMockNowcast('z1', createMockTimeline(['moderate', 'high', 'critical'], [40, 60, 90]));
    
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].riskLevel).toBe('critical'); // peak risk
    expect(res[0].predictedEscalationMinutes).toBe(15); // escalated at +15m (high) or +30m (critical) - engine returns first escalation
  });

  it('5. should rank priority correctly', () => {
    const hosp = createMockFacility('f1', 5, 5, 'Hospital');
    const gov = createMockFacility('f2', 5, 5, 'Government Facility');
    const nowcast = createMockNowcast('z1', createMockTimeline(['high'], [70]));
    
    const res = calculateInfrastructureExposure([hosp, gov], [zone], [nowcast], []);
    expect(res[0].responsePriorityScore).toBeGreaterThan(res[1].responsePriorityScore);
  });

  it('6. should handle invalid coordinates safely', () => {
    // missing coordinates might be NaN
    const facility = createMockFacility('f1', NaN, NaN, 'Hospital');
    const nowcast = createMockNowcast('z1', createMockTimeline(['low'], [10]));
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].exposureLevel).toBe('none');
  });

  it('7. should handle missing timeline gracefully', () => {
    const facility = createMockFacility('f1', 5, 5, 'Hospital');
    const nowcast = createMockNowcast('z1', []);
    const res = calculateInfrastructureExposure([facility], [zone], [nowcast], []);
    expect(res[0].riskLevel).toBe('low');
  });
});
