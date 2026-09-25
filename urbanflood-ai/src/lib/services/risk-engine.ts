import { NowcastZone, WeatherData, DrainageNetwork, RiskLevel } from '@/types';
import * as turf from '@turf/turf';
import { fetchTerrainElevation } from './index';

// Define the weights for our coupled model
const WEIGHTS = {
  rainfall: 0.30,
  saturation: 0.20,
  drainage: 0.20,
  terrain: 0.15,
  waterBody: 0.10,
  rainfallProb: 0.05
};

export interface RiskEngineResult {
  score: number;
  level: RiskLevel;
  factors: {
    rainfall: number;
    saturation: number;
    drainage: number;
    terrain: number;
    waterBody: number;
    rainfallProb: number;
  };
  explanation: string[];
}

/**
 * Normalizes a value between a min and max to a 0-1 scale.
 */
function normalize(val: number, min: number, max: number): number {
  if (val <= min) return 0;
  if (val >= max) return 1;
  return (val - min) / (max - min);
}

/**
 * Re-normalizes weights if some data is missing.
 */
function getActiveWeights(availableFactors: (keyof typeof WEIGHTS)[]): Record<string, number> {
  let total = 0;
  for (const factor of availableFactors) {
    total += WEIGHTS[factor];
  }
  const activeWeights: Record<string, number> = {};
  for (const factor of availableFactors) {
    activeWeights[factor] = WEIGHTS[factor] / total;
  }
  return activeWeights;
}

export function calculateFloodRisk(
  rainfallMmHr: number,
  rainfallProbability: number | null,
  soilMoisture: number | null,
  maxEncroachment: number | null,
  waterBodyContext: number | null,
  terrainElevation: number | null,
  baseElevation: number = 459 // Default mean elevation for Hyderabad from DEM
): RiskEngineResult {

  const availableFactors: (keyof typeof WEIGHTS)[] = ['rainfall'];
  if (rainfallProbability !== null) availableFactors.push('rainfallProb');
  if (soilMoisture !== null) availableFactors.push('saturation');
  if (maxEncroachment !== null) availableFactors.push('drainage');
  if (waterBodyContext !== null) availableFactors.push('waterBody');
  if (terrainElevation !== null) availableFactors.push('terrain');

  const activeWeights = getActiveWeights(availableFactors);

  // 1. Rainfall factor (0 to 1, maxes out around 50mm/hr)
  const fRainfall = normalize(rainfallMmHr, 0, 50);

  // 2. Rainfall Prob factor
  const fRainfallProb = rainfallProbability !== null ? normalize(rainfallProbability, 0, 100) : 0;

  // 3. Soil Saturation factor (0 to 1, usually between 0.1 and 0.5 in open-meteo)
  const fSaturation = soilMoisture !== null ? normalize(soilMoisture, 0, 1.0) : 0;

  // 4. Drainage constraint (Encroachment)
  const fDrainage = maxEncroachment !== null ? normalize(maxEncroachment, 0, 10) : 0; // Cap at 10m

  // 5. Water Body Context (e.g. 1 if intersecting, 0 if far away)
  const fWaterBody = waterBodyContext !== null ? normalize(waterBodyContext, 0, 1) : 0;

  // 6. Terrain Context (Lower elevation = higher susceptibility)
  let fTerrain = 0;
  if (terrainElevation !== null) {
    const diff = baseElevation - terrainElevation;
    if (diff > 0) {
      fTerrain = normalize(diff, 0, 20); // 20m below mean = max terrain factor
    }
  }

  // Combine
  let score = 0;
  score += fRainfall * (activeWeights['rainfall'] || 0);
  score += fRainfallProb * (activeWeights['rainfallProb'] || 0);
  score += fSaturation * (activeWeights['saturation'] || 0);
  score += fDrainage * (activeWeights['drainage'] || 0);
  score += fWaterBody * (activeWeights['waterBody'] || 0);
  score += fTerrain * (activeWeights['terrain'] || 0);

  // Clamp 0-100
  score = Math.max(0, Math.min(100, score * 100));

  // Determine Level
  let level: RiskLevel = 'low';
  if (score >= 75) level = 'critical';
  else if (score >= 50) level = 'high';
  else if (score >= 25) level = 'moderate'; // "moderate" / "watch"

  // Explanations
  const explanation: string[] = [];
  if (fRainfall > 0.5) explanation.push("High rainfall intensity");
  if (fSaturation > 0.6) explanation.push("High soil moisture");
  if (fDrainage > 0.3) explanation.push("Drainage constraint detected");
  if (fTerrain > 0.5) explanation.push("Low-lying terrain context");
  if (fWaterBody > 0) explanation.push("Area is spatially influenced by a water body");

  return {
    score,
    level,
    factors: {
      rainfall: fRainfall,
      saturation: fSaturation,
      drainage: fDrainage,
      terrain: fTerrain,
      waterBody: fWaterBody,
      rainfallProb: fRainfallProb
    },
    explanation
  };
}

export async function calculateAdjustedFloodRisk(
  baseNowcast: NowcastZone[],
  weatherData: WeatherData | null,
  drainageNetwork: DrainageNetwork | null,
  waterBodies: unknown[] | null,
  terrainElevationsIn: Record<string, number> | null,
  floodZoneFeatures: unknown[],
  cityId: string
): Promise<NowcastZone[]> {
  // Pre-fetch terrain elevations dynamically if not provided
  let terrainElevations = terrainElevationsIn;
  if (!terrainElevations && floodZoneFeatures.length > 0) {
    terrainElevations = {};
    for (const f of floodZoneFeatures as unknown[]) {
      try {
        const centroid = turf.centroid(f as turf.AllGeoJSON);
        const lon = centroid.geometry.coordinates[0];
        const lat = centroid.geometry.coordinates[1];
        const elevation = await fetchTerrainElevation(cityId, lon, lat);
        if (elevation !== null) {
          terrainElevations[(f as { properties: { id: string } }).properties.id] = elevation;
        }
      } catch (e) {
        console.error('Failed to compute centroid or fetch terrain for', (f as { properties?: { id?: string } })?.properties?.id);
      }
    }
  }

  return baseNowcast.map(zone => {
    // 1. Drainage context for this zone
    let maxTotalEncr: number | null = null;
    if (drainageNetwork) {
      // Normalize drainageNetwork to handle both {segments: FeatureCollection} and direct FeatureCollection
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let drainageFeatures: any[] = [];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const dn = drainageNetwork as any;
      if (dn.segments?.features) {
        drainageFeatures = dn.segments.features;
      } else if (dn.type === 'FeatureCollection' && Array.isArray(dn.features)) {
        drainageFeatures = dn.features;
      } else if (Array.isArray(drainageNetwork)) {
        drainageFeatures = drainageNetwork;
      }

      const nalasInZone = drainageFeatures.filter(
        (f: { properties?: { type?: string, zone_name?: string | null } }) => f.properties?.type === 'nala' && f.properties?.zone_name === zone.zoneName
      );
      if (nalasInZone.length > 0) {
        maxTotalEncr = 0;
        nalasInZone.forEach((nala: { properties: { metadata_json?: { Total_Encr?: number } } }) => {
          const encr = nala.properties.metadata_json?.Total_Encr || 0;
          if (encr > maxTotalEncr!) {
            maxTotalEncr = encr;
          }
        });
      }
    }

    // 2. Water Body context for this zone
    let waterBodyContext: number | null = null;
    const zoneFeature = (floodZoneFeatures as { properties: { id: string } }[]).find(f => f.properties.id === zone.zoneId);
    if (waterBodies && zoneFeature) {
      waterBodyContext = 0;
      for (const wb of waterBodies) {
        try {
          // @ts-expect-error turf types are complex
          const intersects = turf.booleanIntersects(zoneFeature, wb);
          if (intersects) {
            waterBodyContext = 1;
            break;
          }
        } catch (e) {
          // ignore invalid geom
        }
      }
    }

    // 3. Terrain Context
    const terrainEl = terrainElevations ? (terrainElevations[zone.zoneId] ?? null) : null;

    // 4. Calculate for each timestep in timeline
    const newTimeline = zone.timeline.map((t) => {
      let rainMmHr = 0;
      let rainProb: number | null = null;
      let soilMoisture: number | null = null;

      if (weatherData) {
        let weatherMatched = false;

        if (weatherData.minutely_15 && weatherData.minutely_15.length > 0) {
          const minIndex = Math.floor(t.offsetMinutes / 15);
          if (minIndex < weatherData.minutely_15.length) {
            rainMmHr = weatherData.minutely_15[minIndex].precipitation;
            weatherMatched = true;
          }
        }

        if (!weatherMatched || soilMoisture === null || rainProb === null) {
          const hrIndex = Math.floor(t.offsetMinutes / 60);
          if (weatherData.hourly && hrIndex < weatherData.hourly.length) {
            const hrData = weatherData.hourly[hrIndex];
            if (!weatherMatched) {
              rainMmHr = hrData.precipitation;
            }
            rainProb = hrData.precipitation_probability ?? null;
            soilMoisture = hrData.soil_moisture_0_to_1cm ?? null;
          }
        }
      }

      const risk = calculateFloodRisk(
        rainMmHr,
        rainProb,
        soilMoisture,
        maxTotalEncr,
        waterBodyContext,
        terrainEl
      );

      return {
        ...t,
        riskLevel: risk.level,
        riskScore: risk.score,
        factorScores: risk.factors,
        explanation: risk.explanation
      };
    });

    const currentRiskObj = newTimeline.find(t => t.offsetMinutes === 0) || newTimeline[0];

    const factorsFormatted = (currentRiskObj.explanation || []).map((desc: string) => ({
      icon: '▪',
      label: 'Model Factor',
      description: desc,
      contribution: 'medium' as const
    }));

    return {
      ...zone,
      currentRisk: currentRiskObj.riskLevel,
      timeline: newTimeline,
      elevation: terrainEl !== null ? terrainEl : undefined,
      factors: factorsFormatted.length > 0 ? factorsFormatted : zone.factors,
      metadata: {
        ...zone.metadata,
        riskScore: currentRiskObj.riskScore?.toFixed(1) || '0',
        explanation: (currentRiskObj.explanation || []).join(', ')
      }
    };
  });
}
