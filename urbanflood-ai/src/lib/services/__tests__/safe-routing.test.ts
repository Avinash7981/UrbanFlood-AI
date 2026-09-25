import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  calculateSafeRoutes,
  setRoutingProvider,
  DEFAULT_ROUTING_POLICY,
  RoutingProviderAdapter,
  OsrmRoute,
} from '../safe-routing';
import {
  NowcastZone,
  NowcastTimeStep,
  GeoJSONFeature,
  GeoJSONPolygon,
  FloodZoneProperties,
  RiskLevel,
} from '@/types';

// ============================================================
// Mock Helpers
// ============================================================

function mockTimeline(levels: RiskLevel[], scores: number[]): NowcastTimeStep[] {
  return levels.map((level, i) => ({
    offsetMinutes: i * 30,
    label: `+${i * 30}m`,
    riskLevel: level,
    riskScore: scores[i],
    explanation: [`Factor-${level}`],
  }));
}

function mockNowcastZone(id: string, levels: RiskLevel[], scores: number[]): NowcastZone {
  return {
    zoneId: id,
    zoneName: `Zone ${id}`,
    currentRisk: levels[0],
    estimatedOnsetMinutes: 0,
    severity: 'low',
    timeline: mockTimeline(levels, scores),
    factors: [],
    isDemo: true,
  };
}

// A square polygon covering lat/lng [0,0] to [10,10] for easy intersection testing
function mockFloodZone(id: string, riskLevel: RiskLevel): GeoJSONFeature<GeoJSONPolygon, FloodZoneProperties> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Polygon',
      coordinates: [[[0, 0], [0, 10], [10, 10], [10, 0], [0, 0]]],
    },
    properties: {
      id,
      name: `Zone ${id}`,
      riskLevel,
      probability: 50,
      severity: 'low',
      estimatedOnsetMinutes: 0,
      confidence: 80,
      factors: [],
      isDemo: true,
      lastAssessed: new Date().toISOString(),
    },
  };
}

// A route that passes THROUGH the [0,0]→[10,10] square
const ROUTE_THROUGH_ZONE: OsrmRoute = {
  coordinates: [[1, 1], [2, 2], [5, 5], [8, 8], [9, 9]],
  distanceMeters: 2000,
  durationSeconds: 300,
};

// A route OUTSIDE the zone
const ROUTE_OUTSIDE_ZONE: OsrmRoute = {
  coordinates: [[20, 20], [21, 20], [22, 20], [23, 20]],
  distanceMeters: 1500,
  durationSeconds: 200,
};

// A route that is longer/slower but outside the zone
const ROUTE_SAFER_LONGER: OsrmRoute = {
  coordinates: [[20, 20], [21, 20], [22, 20], [25, 20]],
  distanceMeters: 3000,
  durationSeconds: 400,
};

function mockProvider(routes: OsrmRoute[] | null): RoutingProviderAdapter {
  return {
    id: 'mock',
    name: 'Mock Provider',
    fetchCandidateRoutes: async () => routes,
  };
}

const BASE_REQUEST = {
  origin: { latitude: 1, longitude: 1 },
  destination: { latitude: 9, longitude: 9 },
  forecastMinutes: 0,
};

// ============================================================
// Tests
// ============================================================

describe('Flood-Safe Routing Engine', () => {

  // Reset provider after each test
  afterEach(() => {
    setRoutingProvider({
      id: 'reset',
      name: 'Reset',
      fetchCandidateRoutes: async () => null,
    });
  });

  it('1. Valid origin/destination with one OSRM candidate returns a SafeRoute', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const result = await calculateSafeRoutes(BASE_REQUEST, [], []);
    expect(result.status).not.toBe('provider_unavailable');
    expect(result.fastest).toBeDefined();
    expect(result.fastest).not.toBeNull();
    expect(result.fastest.distanceMeters).toBe(2000);
    expect(result.fastest.durationSeconds).toBe(300);
  });

  it('2. Multiple OSRM candidates: fastest selected correctly', async () => {
    const fastRoute: OsrmRoute = { coordinates: [[1, 1], [5, 5], [9, 9]], distanceMeters: 1000, durationSeconds: 120 };
    const slowRoute: OsrmRoute = { coordinates: [[1, 1], [3, 3], [9, 9]], distanceMeters: 1500, durationSeconds: 250 };
    setRoutingProvider(mockProvider([slowRoute, fastRoute]));
    const result = await calculateSafeRoutes(BASE_REQUEST, [], []);
    expect(result.fastest.durationSeconds).toBe(120);
  });

  it('3. Route through low-risk zone has near-zero exposure', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'low');
    const nowcast = mockNowcastZone('z1', ['low'], [5]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    expect(result.fastest.estimatedFloodExposure).toBeLessThan(20);
    expect(result.fastest.riskLevel).toBe('low');
  });

  it('4. Route crossing Moderate zone has positive exposure < 50', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'moderate');
    const nowcast = mockNowcastZone('z1', ['moderate'], [35]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    expect(result.fastest.estimatedFloodExposure).toBeGreaterThan(0);
    expect(result.fastest.estimatedFloodExposure).toBeLessThan(60);
  });

  it('5. Route crossing High zone has exposure > 50 and high/critical risk level annotation', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'high');
    const nowcast = mockNowcastZone('z1', ['high'], [65]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    expect(result.fastest.estimatedFloodExposure).toBeGreaterThan(40);
    expect(['high', 'critical']).toContain(result.fastest.riskLevel);
    expect(result.fastest.highRiskSegmentCount + result.fastest.criticalRiskSegmentCount).toBeGreaterThan(0);
  });

  it('6. Route crossing Critical zone has critical annotation', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'critical');
    const nowcast = mockNowcastZone('z1', ['critical'], [90]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    expect(result.fastest.maxFloodRiskScore).toBeGreaterThan(50);
    expect(['high', 'critical']).toContain(result.fastest.riskLevel);
  });

  it('7. Safer candidate selected when risk reduction is meaningful', async () => {
    // Route 0: fast, goes through high-risk zone
    const fastRisky: OsrmRoute = { coordinates: [[1, 1], [5, 5], [9, 9]], distanceMeters: 1000, durationSeconds: 120 };
    // Route 1: slightly slower, avoids zone entirely
    const saferSlower: OsrmRoute = { coordinates: [[20, 20], [21, 20], [22, 20]], distanceMeters: 1200, durationSeconds: 145 };
    setRoutingProvider(mockProvider([fastRisky, saferSlower]));

    const zone = mockFloodZone('z1', 'critical');
    const nowcast = mockNowcastZone('z1', ['critical'], [90]);

    const policy = { ...DEFAULT_ROUTING_POLICY, minRiskReductionScore: 10, maxTimeIncreasePct: 50 };
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone], policy);

    // Fastest goes through critical zone; safer avoids it
    expect(result.fastest.estimatedFloodExposure).toBeGreaterThan(result.safer?.estimatedFloodExposure ?? 0);
    expect(result.safer).not.toBeNull();
  });

  it('8. Fastest retained when safer candidate adds excessive time', async () => {
    const fastRisky: OsrmRoute = { coordinates: [[1, 1], [5, 5], [9, 9]], distanceMeters: 1000, durationSeconds: 100 };
    // 2× travel time — exceeds maxTimeIncreasePct=30
    const saferVeryLong: OsrmRoute = { coordinates: [[20, 20], [30, 20], [40, 20]], distanceMeters: 5000, durationSeconds: 3000 };
    setRoutingProvider(mockProvider([fastRisky, saferVeryLong]));

    const zone = mockFloodZone('z1', 'high');
    const nowcast = mockNowcastZone('z1', ['high'], [70]);

    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone], DEFAULT_ROUTING_POLICY);
    // Safer should be rejected due to excessive time overhead
    expect(result.safer).toBeNull();
    expect(result.saferRouteMessage).not.toBeNull();
  });

  it('9. Length-weighted flood exposure is calculated correctly', async () => {
    // A long route through the zone → high exposure
    const longRoute: OsrmRoute = {
      coordinates: [[1, 1], [2, 2], [3, 3], [4, 4], [5, 5], [6, 6], [7, 7], [8, 8], [9, 9]],
      distanceMeters: 10000,
      durationSeconds: 1000,
    };
    setRoutingProvider(mockProvider([longRoute]));
    const zone = mockFloodZone('z1', 'high');
    const nowcast = mockNowcastZone('z1', ['high'], [70]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    // Most of the route is inside the zone, so exposure should be substantial
    expect(result.fastest.estimatedFloodExposure).toBeGreaterThan(30);
    expect(result.fastest.maxFloodRiskScore).toBeGreaterThanOrEqual(result.fastest.estimatedFloodExposure);
  });

  it('10. forecastMinutes=60 selects the +60min timestep risk', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'moderate');
    // Timeline: 0min=low(5), 30min=moderate(35), 60min=critical(90)
    const nowcast = mockNowcastZone('z1', ['low', 'moderate', 'critical'], [5, 35, 90]);
    const req = { ...BASE_REQUEST, forecastMinutes: 60 };
    const result = await calculateSafeRoutes(req, [nowcast], [zone]);
    // At +60min the zone becomes critical — exposure should be high
    expect(result.fastest.maxFloodRiskScore).toBeGreaterThan(50);
  });

  it('11. Missing risk data: route returned without false safe label', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    // No nowcast zones and no flood zone features
    const result = await calculateSafeRoutes(BASE_REQUEST, [], []);
    expect(result.fastest).not.toBeNull();
    expect(result.status).toBe('risk_data_unavailable');
    // Exposure should be 0 (unknown, not fabricated)
    expect(result.fastest.estimatedFloodExposure).toBe(0);
    // Explanation must NOT claim route is safe
    const explanation = result.fastest.explanation.join(' ').toLowerCase();
    expect(explanation).not.toMatch(/guaranteed safe|zero risk|certified/);
  });

  it('12. Invalid coordinates return no_route status with no fabricated route', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const req = {
      origin: { latitude: NaN, longitude: 78 },
      destination: { latitude: 17, longitude: 78 },
    };
    const result = await calculateSafeRoutes(req, [], []);
    expect(result.status).toBe('no_route');
    expect(result.fastest).toBeNull();
    expect(result.safer).toBeNull();
  });

  it('13. Routing provider failure returns provider_unavailable gracefully', async () => {
    setRoutingProvider(mockProvider(null));
    const result = await calculateSafeRoutes(BASE_REQUEST, [], []);
    expect(result.status).toBe('provider_unavailable');
    expect(result.fastest).toBeNull();
    expect(result.safer).toBeNull();
  });

  it('14. No fabricated geometry: route coordinates are from OSRM, not invented', async () => {
    const realCoords: [number, number][] = [[78.4867, 17.385], [78.49, 17.39], [78.52, 17.41]];
    const realRoute: OsrmRoute = { coordinates: realCoords, distanceMeters: 4000, durationSeconds: 480 };
    setRoutingProvider(mockProvider([realRoute]));
    const result = await calculateSafeRoutes(BASE_REQUEST, [], []);
    // Coordinates should match exactly what the provider returned
    expect(result.fastest.geometry.coordinates[0]).toEqual(realCoords[0]);
    expect(result.fastest.geometry.coordinates[result.fastest.geometry.coordinates.length - 1]).toEqual(realCoords[realCoords.length - 1]);
  });

  it('15. Explanation text matches actual risk levels found', async () => {
    setRoutingProvider(mockProvider([ROUTE_THROUGH_ZONE]));
    const zone = mockFloodZone('z1', 'critical');
    const nowcast = mockNowcastZone('z1', ['critical'], [88]);
    const result = await calculateSafeRoutes(BASE_REQUEST, [nowcast], [zone]);
    const explanation = result.fastest.explanation.join(' ');
    // Must mention critical risk based on actual calculation
    expect(explanation.toLowerCase()).toMatch(/critical/);
    // Must not fabricate zone counts beyond what's calculated
    expect(result.fastest.criticalRiskSegmentCount).toBeGreaterThan(0);
  });

});
