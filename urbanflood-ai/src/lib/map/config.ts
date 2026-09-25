// ============================================================
// Map Configuration Layer
// Abstracts tile providers so we can switch without changing map code
// ============================================================

import { MapConfig, MapTileProvider } from '@/types';

const providers: MapTileProvider[] = [
  {
    id: 'osm-carto-dark',
    name: 'OpenStreetMap Dark',
    type: 'raster',
    url: 'https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: 'osm-carto-light',
    name: 'OpenStreetMap Light',
    type: 'raster',
    url: 'https://basemaps.cartocdn.com/light_all/{z}/{x}/{y}@2x.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20,
  },
  {
    id: 'osm-standard',
    name: 'OpenStreetMap Standard',
    type: 'raster',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 17, // Cap at 17 to prevent localhost tile blocks at 18+
  },
];

export const mapConfig: MapConfig = {
  // osm-carto-dark uses basemaps.cartocdn.com — CARTO's CDN renders OSM data
  // and is permissive for localhost development. tile.openstreetmap.org enforces
  // a strict usage policy that blocks/throttles localhost/unapproved User-Agents
  // at high zoom, causing AJAXError: Load failed (0). CARTO's CDN does not.
  // We cap OSM at zoom 17 and use source maxzoom for overzooming to prevent this.
  defaultProvider: 'osm-standard',
  providers,
  defaultStyle: 'dark',
};

export function getMapStyle(providerId?: string): object | string {
  const mapStyleUrl = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
  if (mapStyleUrl) {
    return mapStyleUrl;
  }
  
  const provider = getProvider(providerId || mapConfig.defaultProvider) || getProvider('osm-standard')!;
  
  // CARTO @2x tiles are 512px; standard OSM tiles are 256px
  const tileSize = provider.url.includes('@2x') ? 512 : 256;

  return {
    version: 8,
    sources: {
      'raster-tiles': {
        type: 'raster',
        tiles: [provider.url],
        tileSize,
        attribution: provider.attribution,
        maxzoom: provider.maxZoom, // Crucial: prevents fetching tiles beyond maxZoom, uses overzooming instead
      },
    },
    layers: [
      {
        id: 'simple-tiles',
        type: 'raster',
        source: 'raster-tiles',
        minzoom: 0,
        maxzoom: provider.maxZoom,
      },
    ],
  };
}

export function getProvider(id: string): MapTileProvider | undefined {
  return providers.find((p) => p.id === id);
}

export function listProviders(): MapTileProvider[] {
  return [...providers];
}
