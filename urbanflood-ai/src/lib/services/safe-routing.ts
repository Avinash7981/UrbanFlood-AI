// ============================================================
// Flood-Safe Routing Service
//
// Architecture:
//   Origin + Destination
//     → OSRM (candidate route generator only — OSM road data)
//     → Route segmentation (LineString split into chunks)
//     → Flood risk overlay per segment (NowcastZone intersection)
//     → Risk-aware cost calculation (configurable)
//     → Fastest vs Flood-Safer selection
//     → SafeRoutingResult with explanation
//
// IMPORTANT:
//   OSRM provides road geometry and travel times ONLY.
//   Flood risk comes exclusively from the Coupled Flood Risk Engine (NowcastZone data).
//   This is a decision-support prototype, not operational emergency routing.
// ============================================================

import * as turf from '@turf/turf';
import {
  RouteRequest,
  RouteSegment,
  SafeRoute,
  SafeRoutingResult,
  RoutingPolicy,
  RiskLevel,
  GeoJSONLineString,
  NowcastZone,
  GeoJSONFeature,
  FloodZoneProperties,
  GeoJSONPolygon,
  GeoJSONMultiPolygon,
} from '@/types';

// ============================================================
// Configurable Routing Policy
// ============================================================

export const DEFAULT_ROUTING_POLICY: RoutingPolicy = {
  maxTimeIncreasePct: 30,
  minRiskReductionScore: 15,
  penaltySecondsPerRiskUnit: 600,
};

const RISK_MULTIPLIER: Record<RiskLevel, number> = {
  low: 0,
  moderate: 0.25,
  high: 0.70,
  critical: 1.50,
};

const SEGMENT_SAMPLE_POINTS = 5;

// ============================================================
// OSRM Provider Adapter
// ============================================================

export interface RoutingProviderAdapter {
  id: string;
  name: string;
  fetchCandidateRoutes(
    origin: { lng: number; lat: number },
    destination: { lng: number; lat: number },
    maxAlternatives?: number
  ): Promise<OsrmRoute[] | null>;
}

export interface OsrmRoute {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
}

const OSRM_BASE_URL = 'http://router.project-osrm.org';

export class OsrmRoutingProvider implements RoutingProviderAdapter {
  id = 'osrm-public-demo';
  name = 'OSRM / OpenStreetMap';

  async fetchCandidateRoutes(
    origin: { lng: number; lat: number },
    destination: { lng: number; lat: number },
    maxAlternatives = 2
  ): Promise<OsrmRoute[] | null> {
    try {
      const coordStr = `${origin.lng},${origin.lat};${destination.lng},${destination.lat}`;
      const url = `${OSRM_BASE_URL}/route/v1/driving/${coordStr}?overview=full&geometries=geojson&alternatives=${maxAlternatives}`;
      const response = await fetch(url, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) {
        console.warn(`[OSRM] Request failed with status ${response.status}`);
        return null;
      }
      const data = await response.json();
      if (data.code !== 'Ok' || !data.routes || data.routes.length === 0) {
        console.warn('[OSRM] No routes returned:', data.code);
        return null;
      }
      return data.routes.map((r: { geometry: { coordinates: [number, number][] }; distance: number; duration: number }) => ({
        coordinates: r.geometry.coordinates as [number, number][],
        distanceMeters: r.distance,
        durationSeconds: r.duration,
      }));
    } catch (err) {
      console.warn('[OSRM] Provider unavailable:', err);
      return null;
    }
  }
}

let _routingProvider: RoutingProviderAdapter = new OsrmRoutingProvider();

export function setRoutingProvider(provider: RoutingProviderAdapter): void {
  _routingProvider = provider;
}

export function getRoutingProvider(): RoutingProviderAdapter {
  return _routingProvider;
}

// ============================================================
// Route Segmentation
// ============================================================

function splitRouteIntoSegments(
  coordinates: [number, number][],
  totalDistanceMeters: number,
  totalDurationSeconds: number
): Array<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number }> {
  if (coordinates.length < 2) return [];

  const cumulativeDist: number[] = [0];
  for (let i = 1; i < coordinates.length; i++) {
    const d = turf.distance(turf.point(coordinates[i - 1]), turf.point(coordinates[i]), { units: 'meters' });
    cumulativeDist.push(cumulativeDist[i - 1] + d);
  }
  const actualTotalDist = cumulativeDist[cumulativeDist.length - 1] || totalDistanceMeters;

  const targetSegmentLength = 500;
  const nSegments = Math.min(8, Math.max(2, Math.round(actualTotalDist / targetSegmentLength)));
  const segmentDist = actualTotalDist / nSegments;

  const segments: Array<{ coordinates: [number, number][]; distanceMeters: number; durationSeconds: number }> = [];
  let coordIdx = 0;

  for (let s = 0; s < nSegments; s++) {
    const endDist = (s + 1) * segmentDist;
    const startIdx = coordIdx;
    let endIdx = coordIdx;

    for (let i = coordIdx; i < coordinates.length; i++) {
      if (cumulativeDist[i] <= endDist || i === coordinates.length - 1) {
        endIdx = i;
      } else {
        break;
      }
    }

    const segCoords = coordinates.slice(startIdx, endIdx + 1);
    if (segCoords.length < 2) continue;

    const segDistM = cumulativeDist[endIdx] - cumulativeDist[startIdx];
    const segDurationS = totalDurationSeconds * (segDistM / (actualTotalDist || 1));

    segments.push({ coordinates: segCoords, distanceMeters: segDistM, durationSeconds: segDurationS });
    coordIdx = endIdx;
    if (coordIdx >= coordinates.length - 1) break;
  }

  return segments;
}

// ============================================================
// Flood Risk Overlay
// ============================================================

type FloodZoneFeature = GeoJSONFeature<GeoJSONPolygon | GeoJSONMultiPolygon, FloodZoneProperties>;

function getZoneRiskAtForecast(zone: NowcastZone, forecastMinutes: number): { score: number; level: RiskLevel; factors: string[] } {
  if (!zone.timeline || zone.timeline.length === 0) return { score: 0, level: 'low', factors: [] };

  let closestStep = zone.timeline[0];
  let minDiff = Math.abs((closestStep.offsetMinutes ?? 0) - forecastMinutes);

  for (const step of zone.timeline) {
    const diff = Math.abs((step.offsetMinutes ?? 0) - forecastMinutes);
    if (diff < minDiff) { minDiff = diff; closestStep = step; }
  }

  return { score: closestStep.riskScore ?? 0, level: closestStep.riskLevel, factors: closestStep.explanation ?? [] };
}

function overlayFloodRiskOnSegment(
  segmentCoords: [number, number][],
  nowcastZones: NowcastZone[],
  floodZoneFeatures: FloodZoneFeature[],
  forecastMinutes: number
): { score: number; level: RiskLevel; factors: string[]; zoneId: string | null } {
  if (segmentCoords.length < 2) return { score: 0, level: 'low', factors: [], zoneId: null };

  const line = turf.lineString(segmentCoords);
  const lengthKm = turf.length(line, { units: 'kilometers' });

  const samplePoints: ReturnType<typeof turf.point>[] = [];
  for (let i = 0; i <= SEGMENT_SAMPLE_POINTS; i++) {
    try {
      samplePoints.push(turf.along(line, lengthKm * (i / SEGMENT_SAMPLE_POINTS), { units: 'kilometers' }));
    } catch { /* skip degenerate */ }
  }

  let maxScore = 0;
  let maxLevel: RiskLevel = 'low';
  let maxFactors: string[] = [];
  let matchedZoneId: string | null = null;

  for (const pt of samplePoints) {
    for (const zone of floodZoneFeatures) {
      if (!zone.geometry) continue;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (!turf.booleanPointInPolygon(pt, zone.geometry as any)) continue;
        const zoneId = zone.properties.id;
        const nowcastZone = nowcastZones.find(nz => nz.zoneId === zoneId);
        if (!nowcastZone) continue;
        const { score, level, factors } = getZoneRiskAtForecast(nowcastZone, forecastMinutes);
        if (score > maxScore) { maxScore = score; maxLevel = level; maxFactors = factors; matchedZoneId = zoneId; }
      } catch { /* skip invalid geometry */ }
    }
  }

  return { score: maxScore, level: maxLevel, factors: maxFactors, zoneId: matchedZoneId };
}

// ============================================================
// Core Route Builder
// ============================================================

function buildRouteLevel(maxScore: number): RiskLevel {
  if (maxScore >= 75) return 'critical';
  if (maxScore >= 50) return 'high';
  if (maxScore >= 25) return 'moderate';
  return 'low';
}

function buildSafeRoute(
  routeId: string,
  candidate: OsrmRoute,
  nowcastZones: NowcastZone[],
  floodZoneFeatures: FloodZoneFeature[],
  forecastMinutes: number,
  policy: RoutingPolicy
): SafeRoute {
  const rawSegments = splitRouteIntoSegments(candidate.coordinates, candidate.distanceMeters, candidate.durationSeconds);

  let totalExposureWeighted = 0;
  let totalWeightDistance = 0;
  let maxRiskScore = 0;
  let highRiskCount = 0;
  let criticalRiskCount = 0;

  const segments: RouteSegment[] = rawSegments.map((seg, idx) => {
    const { score, level, factors, zoneId } = overlayFloodRiskOnSegment(
      seg.coordinates, nowcastZones, floodZoneFeatures, forecastMinutes
    );

    // Cost formula (configurable):
    //   normalizedRisk = riskScore / 100
    //   exposurePenalty = normalizedRisk * riskMultiplier * penaltySecondsPerRiskUnit
    const normalizedRisk = score / 100;
    const riskMultiplier = RISK_MULTIPLIER[level];
    const exposurePenalty = normalizedRisk * riskMultiplier * policy.penaltySecondsPerRiskUnit;

    // Length-weighted accumulation
    totalExposureWeighted += score * seg.distanceMeters;
    totalWeightDistance += seg.distanceMeters;
    if (score > maxRiskScore) maxRiskScore = score;
    if (level === 'high') highRiskCount++;
    if (level === 'critical') criticalRiskCount++;

    return {
      id: `${routeId}-seg-${idx}`,
      geometry: { type: 'LineString', coordinates: seg.coordinates } as GeoJSONLineString,
      distanceMeters: seg.distanceMeters,
      durationSeconds: seg.durationSeconds,
      floodRiskScore: score,
      floodRiskLevel: level,
      exposurePenalty,
      intersectingZoneId: zoneId,
      contributingFactors: factors,
    };
  });

  const estimatedFloodExposure = totalWeightDistance > 0
    ? Math.round(totalExposureWeighted / totalWeightDistance)
    : 0;

  const riskLevel = buildRouteLevel(maxRiskScore);

  const explanation: string[] = [];
  if (highRiskCount > 0) explanation.push(`Crosses ${highRiskCount} high-risk modelled zone${highRiskCount !== 1 ? 's' : ''}`);
  if (criticalRiskCount > 0) explanation.push(`Intersects ${criticalRiskCount} critical flood-risk area${criticalRiskCount !== 1 ? 's' : ''}`);
  if (estimatedFloodExposure === 0) explanation.push('No modelled flood-risk zones along this route');
  if (forecastMinutes > 0) explanation.push(`Risk assessed at +${forecastMinutes}-minute forecast horizon`);
  explanation.push('Routing data: OSRM / OpenStreetMap contributors');

  return {
    id: routeId,
    geometry: { type: 'LineString', coordinates: candidate.coordinates } as GeoJSONLineString,
    distanceMeters: candidate.distanceMeters,
    durationSeconds: candidate.durationSeconds,
    estimatedFloodExposure,
    maxFloodRiskScore: maxRiskScore,
    riskLevel,
    segments,
    highRiskSegmentCount: highRiskCount,
    criticalRiskSegmentCount: criticalRiskCount,
    explanation,
    dataSource: 'osrm/openstreetmap',
  };
}

// ============================================================
// Route Pair Selection
// ============================================================

function selectRoutePair(
  candidates: SafeRoute[],
  policy: RoutingPolicy
): { fastest: SafeRoute; safer: SafeRoute | null; message: string | null } {
  if (candidates.length === 0) throw new Error('No candidates');

  const fastest = candidates.reduce((a, b) => a.durationSeconds < b.durationSeconds ? a : b);

  if (candidates.length === 1) {
    return { fastest, safer: null, message: 'Only one candidate route available from routing provider.' };
  }

  const safestByExposure = candidates.reduce((a, b) =>
    a.estimatedFloodExposure < b.estimatedFloodExposure ? a : b
  );

  if (safestByExposure.id === fastest.id) {
    return { fastest, safer: null, message: 'All candidate routes have equivalent flood exposure.' };
  }

  const riskReduction = fastest.estimatedFloodExposure - safestByExposure.estimatedFloodExposure;
  if (riskReduction < policy.minRiskReductionScore) {
    return {
      fastest, safer: null,
      message: `Alternative reduces exposure by only ${riskReduction.toFixed(0)} points (threshold: ${policy.minRiskReductionScore}).`,
    };
  }

  const timeIncreasePct = fastest.durationSeconds > 0
    ? ((safestByExposure.durationSeconds - fastest.durationSeconds) / fastest.durationSeconds) * 100
    : 0;

  if (timeIncreasePct > policy.maxTimeIncreasePct) {
    return {
      fastest, safer: null,
      message: `Safer alternative adds ${timeIncreasePct.toFixed(0)}% travel time (limit: ${policy.maxTimeIncreasePct}%).`,
    };
  }

  const savedMinutes = Math.round((safestByExposure.durationSeconds - fastest.durationSeconds) / 60);
  const timeStr = savedMinutes >= 0
    ? `adds approximately ${savedMinutes} minute${savedMinutes !== 1 ? 's' : ''}`
    : `saves ${Math.abs(savedMinutes)} minutes`;
  const saferExplanation = [
    ...safestByExposure.explanation,
    `Flood-safer route ${timeStr} while reducing modelled flood exposure by ${riskReduction.toFixed(0)} points`,
  ];

  return { fastest, safer: { ...safestByExposure, explanation: saferExplanation }, message: null };
}

// ============================================================
// Public API
// ============================================================

export async function calculateSafeRoutes(
  request: RouteRequest,
  nowcastZones: NowcastZone[],
  floodZoneFeatures: FloodZoneFeature[],
  policy: RoutingPolicy = DEFAULT_ROUTING_POLICY
): Promise<SafeRoutingResult> {
  const forecastMinutes = request.forecastMinutes ?? 0;

  if (
    !Number.isFinite(request.origin.latitude) || !Number.isFinite(request.origin.longitude) ||
    !Number.isFinite(request.destination.latitude) || !Number.isFinite(request.destination.longitude)
  ) {
    return { fastest: null as unknown as SafeRoute, safer: null, forecastMinutes, saferRouteMessage: 'Invalid coordinates provided.', status: 'no_route' };
  }

  const provider = getRoutingProvider();
  const candidates = await provider.fetchCandidateRoutes(
    { lng: request.origin.longitude, lat: request.origin.latitude },
    { lng: request.destination.longitude, lat: request.destination.latitude },
    3
  );

  if (!candidates) {
    return { fastest: null as unknown as SafeRoute, safer: null, forecastMinutes, saferRouteMessage: 'Routing service temporarily unavailable.', status: 'provider_unavailable' };
  }

  if (candidates.length === 0) {
    return { fastest: null as unknown as SafeRoute, safer: null, forecastMinutes, saferRouteMessage: 'No route available between the selected origin and destination.', status: 'no_route' };
  }

  const hasRiskData = nowcastZones.length > 0 && floodZoneFeatures.length > 0;

  const annotatedCandidates = candidates.map((c, i) =>
    buildSafeRoute(`route-${i}`, c, nowcastZones, floodZoneFeatures, forecastMinutes, policy)
  );

  const { fastest, safer, message } = selectRoutePair(annotatedCandidates, policy);

  return {
    fastest,
    safer,
    forecastMinutes,
    saferRouteMessage: message,
    status: hasRiskData ? 'ok' : 'risk_data_unavailable',
  };
}
