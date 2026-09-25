// ============================================================
// City Registry — single point of access for all city data
// ============================================================

import { CityConfig } from '@/types';
import { hyderabadConfig } from './hyderabad/config';
import {
  indiaConfig,
  mumbaiConfig,
  delhiConfig,
  chennaiConfig,
  bengaluruConfig,
  kolkataConfig,
} from './stubs';

const cityRegistry: Map<string, CityConfig> = new Map([
  [indiaConfig.id, indiaConfig],
  [hyderabadConfig.id, hyderabadConfig],
  [mumbaiConfig.id, mumbaiConfig],
  [delhiConfig.id, delhiConfig],
  [chennaiConfig.id, chennaiConfig],
  [bengaluruConfig.id, bengaluruConfig],
  [kolkataConfig.id, kolkataConfig],
]);

export function getCity(id: string): CityConfig | undefined {
  return cityRegistry.get(id);
}

export function listCities(): CityConfig[] {
  return Array.from(cityRegistry.values());
}

export function getActiveCities(): CityConfig[] {
  return listCities().filter(
    (c) => c.status === 'active_pilot' || c.status === 'configured'
  );
}

export function getDefaultCity(): CityConfig {
  return indiaConfig;
}

export { indiaConfig, hyderabadConfig };
