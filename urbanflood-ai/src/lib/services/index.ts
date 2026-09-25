// ============================================================
// Service Layer — abstracts data access for future API replacement
// Each function returns mock data now but exposes async interfaces
// ============================================================

import { CityConfig, RainfallData, FloodZoneCollection, DrainageNetwork, TraceResponse, SimulateFailureResponse, DrainageStatistics, NowcastData, HistoricalFloodEvent, FloodAlert, AnalyticsData, WaterBodyCollection, CriticalInfrastructureCollection } from '@/types';
import { getCity, listCities, getDefaultCity } from '@/data/cities';

import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { hyderabadDrainage } from '@/data/cities/hyderabad/drainage';
import { hyderabadNowcast } from '@/data/cities/hyderabad/nowcast';
import { hyderabadHistoricalEvents } from '@/data/cities/hyderabad/historical-events';
import { hyderabadAlerts } from '@/data/cities/hyderabad/alerts';
import { hyderabadAnalytics } from '@/data/cities/hyderabad/analytics';
import { hyderabadInfrastructure } from '@/data/cities/hyderabad/infrastructure';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// --- City ---
export async function fetchCity(id: string): Promise<CityConfig | undefined> {
  return getCity(id);
}

export async function fetchCities(): Promise<CityConfig[]> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';
    const response = await fetch(`${apiUrl}/cities`, { cache: 'no-store' });
    if (!response.ok) {
      console.warn('API returned error status, falling back to static cities', response.status);
      return listCities();
    }
    const data = await response.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.map((city: any) => ({
      ...city,
      dataSources: city.data_sources || [],
      enabledLayers: city.enabled_layers || [],
      center: city.center_lng !== undefined && city.center_lat !== undefined 
        ? [city.center_lng, city.center_lat] 
        : city.center,
    }));
  } catch (err) {
    console.warn('Failed to fetch cities from API, falling back to static cities', err);
    return listCities();
  }
}

export async function fetchDefaultCity(): Promise<CityConfig> {
  return getDefaultCity();
}

// --- Rainfall ---
export async function getRainfall(cityId: string): Promise<RainfallData | null> {
  // Mock rainfall is deprecated; rainfall is now handled via WeatherData
  return null;
}

// --- Flood Zones ---
export async function fetchFloodZones(cityId: string): Promise<FloodZoneCollection | null> {
  if (cityId === 'hyderabad') return hyderabadFloodZones;
  return null;
}

// --- Water Bodies ---
export async function fetchWaterBodies(cityId: string): Promise<WaterBodyCollection | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/v1/cities/${cityId}/waterbodies`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch water bodies for city ${cityId}`);
    }
    const data = await res.json();
    return data as WaterBodyCollection;
  } catch (error) {
    console.error(`Error fetching water bodies for ${cityId}:`, error);
    return null;
  }
}

// --- Terrain ---
export async function fetchTerrainElevation(cityId: string, lon: number, lat: number): Promise<number | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/v1/cities/${cityId}/terrain/elevation?lon=${lon}&lat=${lat}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.elevation;
  } catch (error) {
    console.error(`Error fetching terrain elevation for ${cityId}:`, error);
    return null;
  }
}

// --- Drainage ---
export async function fetchDrainage(cityId: string): Promise<DrainageNetwork | null> {
  try {
    const res = await fetch(`http://localhost:8000/api/v1/cities/${cityId}/drainage/network`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error(`Failed to fetch drainage for city ${cityId}`);
    }
    const data = await res.json();
    return data as DrainageNetwork;
  } catch (error) {
    console.error(`Error fetching drainage for ${cityId}:`, error);
    return null;
  }
}

export async function simulateDrainageFailure(cityId: string, nodeId: string): Promise<SimulateFailureResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cities/${cityId}/drainage/simulate-failure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId }),
    });
    if (!response.ok) throw new Error('Simulation failed');
    return await response.json() as SimulateFailureResponse;
  } catch (error) {
    console.error('Simulation error:', error);
    return null;
  }
}

export async function traceDrainageNetwork(cityId: string, nodeId: string, direction: 'upstream' | 'downstream'): Promise<TraceResponse | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cities/${cityId}/drainage/trace`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ node_id: nodeId, direction }),
    });
    if (!response.ok) throw new Error('Trace failed');
    return await response.json() as TraceResponse;
  } catch (error) {
    console.error('Trace error:', error);
    return null;
  }
}

export async function fetchDrainageStatistics(cityId: string): Promise<DrainageStatistics | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/cities/${cityId}/drainage/statistics`);
    if (!response.ok) return null;
    return await response.json() as DrainageStatistics;
  } catch (error) {
    console.error('Error fetching drainage stats:', error);
    return null;
  }
}

// --- Nowcast ---
export async function fetchNowcast(cityId: string): Promise<NowcastData | null> {
  if (cityId === 'hyderabad') return hyderabadNowcast;
  return null;
}

// --- Historical Events ---
export async function fetchHistoricalEvents(cityId: string): Promise<HistoricalFloodEvent[]> {
  if (cityId === 'hyderabad') return hyderabadHistoricalEvents;
  return [];
}

export async function fetchHistoricalEvent(cityId: string, eventId: string): Promise<HistoricalFloodEvent | null> {
  if (cityId === 'hyderabad') {
    return hyderabadHistoricalEvents.find(e => e.id === eventId) ?? null;
  }
  return null;
}

// --- Alerts ---
export async function fetchAlerts(cityId: string): Promise<FloodAlert[]> {
  if (cityId === 'hyderabad') return hyderabadAlerts;
  return [];
}

// --- Analytics ---
export async function fetchAnalytics(cityId: string): Promise<AnalyticsData | null> {
  if (cityId === 'hyderabad') return hyderabadAnalytics;
  return null;
}

// --- Infrastructure ---
export async function fetchInfrastructure(cityId: string): Promise<CriticalInfrastructureCollection | null> {
  if (cityId === 'hyderabad') return hyderabadInfrastructure;
  return null;
}
