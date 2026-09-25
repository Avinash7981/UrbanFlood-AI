import { CriticalInfrastructure, InfrastructureExposure, NowcastZone, FloodAlert, RiskLevel, FloodZoneProperties, ExposureLevel, InfrastructureCategory } from '@/types';
import * as turf from '@turf/turf';
import { GeoJSONFeature, GeoJSONPolygon, GeoJSONMultiPolygon, GeoJSONPoint } from '@/types';

const INFRASTRUCTURE_EXPOSURE_RADIUS_METERS = 500;

function getCategoryPriority(category: InfrastructureCategory): number {
  switch (category) {
    case 'Hospital': return 100;
    case 'Fire Station': return 90;
    case 'Police Station': return 90;
    case 'Emergency Service': return 90;
    case 'School': return 70;
    case 'Transport Facility': return 60;
    case 'Government Facility': return 50;
    default: return 30;
  }
}

function getRiskMultiplier(level: RiskLevel): number {
  switch (level) {
    case 'critical': return 4;
    case 'high': return 3;
    case 'moderate': return 2;
    case 'low': return 1;
    default: return 0;
  }
}

function getExposureLevel(distance: number, riskLevel: RiskLevel): ExposureLevel {
  if (distance > INFRASTRUCTURE_EXPOSURE_RADIUS_METERS) return 'none';
  if (distance > 0 && riskLevel === 'critical') return 'high'; // Near critical zone
  if (distance > 0 && riskLevel === 'high') return 'moderate';
  
  if (distance === 0) {
    // Inside zone
    if (riskLevel === 'critical') return 'critical';
    if (riskLevel === 'high') return 'high';
    if (riskLevel === 'moderate') return 'moderate';
    if (riskLevel === 'low') return 'low';
  }
  
  return 'low'; // Default for near moderate/low
}

export function calculateInfrastructureExposure(
  infrastructure: CriticalInfrastructure[],
  floodZoneFeatures: GeoJSONFeature<GeoJSONPolygon | GeoJSONMultiPolygon, FloodZoneProperties>[],
  nowcastZones: NowcastZone[],
  alerts: FloodAlert[]
): InfrastructureExposure[] {
  
  return infrastructure.map(facility => {
    const facilityCoordinates = [facility.longitude, facility.latitude];
    if (!Number.isFinite(facilityCoordinates[0]) || !Number.isFinite(facilityCoordinates[1])) {
      return {
        infrastructureId: facility.id,
        name: facility.name,
        category: facility.category,
        riskScore: 0,
        riskLevel: 'low',
        distanceToRiskZoneMeters: -1,
        closestZoneId: '',
        exposureLevel: 'none',
        predictedEscalationMinutes: null,
        contributingFactors: [],
        responsePriorityScore: 0,
        responsePriorityLabel: 'low'
      };
    }
    const pt = turf.point(facilityCoordinates);
    
    let closestZone: typeof floodZoneFeatures[0] | null = null;
    let minDistance = Infinity;

    for (const f of floodZoneFeatures) {
      if (!f.geometry) continue;
      
      let dist = Infinity;
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (turf.booleanPointInPolygon(pt, f.geometry as any)) {
          dist = 0;
        } else {
          // @ts-expect-error turf types
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const nearest = turf.pointToLineDistance(pt, turf.polygonToLine(f.geometry as any), { units: 'meters' });
          dist = nearest;
        }
      } catch (_e) {
        // Fallback or skip if geometry invalid
        continue;
      }

      if (dist < minDistance) {
        minDistance = dist;
        closestZone = f;
      }
    }

    const result: InfrastructureExposure = {
      infrastructureId: facility.id,
      name: facility.name,
      category: facility.category,
      riskScore: 0,
      riskLevel: 'low',
      distanceToRiskZoneMeters: minDistance === Infinity ? -1 : Math.round(minDistance),
      closestZoneId: closestZone ? closestZone.properties.id : '',
      exposureLevel: 'none',
      predictedEscalationMinutes: null,
      contributingFactors: [],
      responsePriorityScore: 0,
      responsePriorityLabel: 'low'
    };

    if (!closestZone || minDistance > INFRASTRUCTURE_EXPOSURE_RADIUS_METERS) {
      return result;
    }

    // 2. Get timeline and risk data
    const zoneId = closestZone.properties.id;
    const nowcast = nowcastZones.find(n => n.zoneId === zoneId);
    
    if (nowcast && nowcast.timeline.length > 0) {
      // Find peak risk in timeline
      let peakScore = -1;
      let peakLevel: RiskLevel = 'low';
      let peakEscalationMin: number | null = null;
      const currentLevel = nowcast.timeline[0].riskLevel;
      const factors = new Set<string>();

      nowcast.timeline.forEach(t => {
        const score = t.riskScore || 0;
        if (score > peakScore) {
          peakScore = score;
          peakLevel = t.riskLevel;
          if (t.offsetMinutes > 0 && getRiskMultiplier(t.riskLevel) > getRiskMultiplier(currentLevel)) {
             if (peakEscalationMin === null || t.offsetMinutes < peakEscalationMin) {
                 peakEscalationMin = t.offsetMinutes;
             }
          }
        }
        if (t.explanation) t.explanation.forEach(ex => factors.add(ex));
      });

      result.riskScore = peakScore;
      result.riskLevel = peakLevel;
      result.predictedEscalationMinutes = peakEscalationMin;
      result.contributingFactors = Array.from(factors);
      result.exposureLevel = getExposureLevel(minDistance, peakLevel);
    }

    // 3. Check alerts for active escalation
    const activeAlert = alerts.find(a => a.zoneId === zoneId && a.status === 'active');
    if (activeAlert) {
      if (activeAlert.escalationMinutes !== null && 
         (result.predictedEscalationMinutes === null || activeAlert.escalationMinutes < result.predictedEscalationMinutes)) {
        result.predictedEscalationMinutes = activeAlert.escalationMinutes;
      }
    }

    // 4. Calculate Priority
    if (result.exposureLevel !== 'none') {
      const basePri = getCategoryPriority(facility.category);
      const riskMult = getRiskMultiplier(result.riskLevel);
      const distMult = minDistance === 0 ? 1.5 : (1 - minDistance / INFRASTRUCTURE_EXPOSURE_RADIUS_METERS);
      const escBonus = result.predictedEscalationMinutes !== null && result.predictedEscalationMinutes <= 60 ? 20 : 0;
      
      result.responsePriorityScore = Math.round((basePri * riskMult * distMult) + escBonus);
      
      if (result.responsePriorityScore > 300) result.responsePriorityLabel = 'very_high';
      else if (result.responsePriorityScore > 200) result.responsePriorityLabel = 'high';
      else if (result.responsePriorityScore > 100) result.responsePriorityLabel = 'moderate';
      else result.responsePriorityLabel = 'low';
    }

    return result;
  });
}
