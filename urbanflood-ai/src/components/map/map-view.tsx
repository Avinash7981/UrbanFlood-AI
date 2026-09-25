/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import Map, { NavigationControl, Source, Layer, MapRef } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import { getMapStyle } from '@/lib/map/config';
import { useCity } from '@/context/city-context';
import { 
  FloodZoneCollection, 
  DrainageNetwork, 
  FloodZoneProperties, 
  WaterBodyCollection, 
  WaterBodyProperties, 
  FloodAlert, 
  CriticalInfrastructureCollection, 
  SafeRoutingResult,
  NowcastZone
} from '@/types';
import { cn } from '@/lib/utils';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface MapViewProps {
  className?: string;
  floodZones?: FloodZoneCollection | null;
  drainage?: DrainageNetwork | null;
  waterBodies?: WaterBodyCollection | null;
  alerts?: FloodAlert[];
  infrastructure?: CriticalInfrastructureCollection | null;
  enabledLayers?: Record<string, boolean>;
  onZoneClick?: (zone: FloodZoneProperties) => void;
  onDrainageClick?: (segment: Record<string, unknown>) => void;
  onWaterBodyClick?: (wb: WaterBodyProperties) => void;
  highlightZoneId?: string | null;
  tracedNodes?: string[];
  tracedSegments?: string[];
  traceType?: string | null;
  /** Optional flood-safe route overlay — rendered as lines on the map */
  safeRoute?: SafeRoutingResult | null;
  /** Which route type to highlight: 'fastest' | 'safer' */
  activeRouteType?: 'fastest' | 'safer';
  /** Optional nowcast zones to provide timeline-specific risk */
  nowcastZones?: NowcastZone[] | null;
  /** Timeline offset for risk coloring, default 0 */
  forecastOffsetMinutes?: number;
  /** Optional overrides for initial view state (pitch, bearing, zoom) */
  initialViewStateOverride?: { pitch?: number; bearing?: number; zoom?: number };
}

const RISK_COLORS: Record<string, string> = {
  low: '#22c55e',
  moderate: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

const DRAINAGE_STRESS_COLORS: Record<string, string> = {
  normal: '#64748b',
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  critical: '#ef4444',
};

export function MapView({
  className,
  floodZones,
  drainage,
  waterBodies,
  alerts = [],
  infrastructure = null,
  enabledLayers = {},
  onZoneClick,
  onDrainageClick,
  onWaterBodyClick,
  highlightZoneId,
  tracedNodes = [],
  tracedSegments = [],
  traceType = null,
  safeRoute = null,
  activeRouteType = 'safer',
  nowcastZones,
  forecastOffsetMinutes = 0,
  initialViewStateOverride
}: MapViewProps) {
  const { currentCity } = useCity();
  const mapRef = useRef<MapRef>(null);
  const mapStyleUrl = useMemo(() => getMapStyle(), []);
  const [mapStyle, setMapStyle] = useState<any>(typeof mapStyleUrl === 'string' ? null : mapStyleUrl);
  const [mapError, setMapError] = useState<string | null>(null);
  const [cursor, setCursor] = useState<string>('');

  React.useEffect(() => {
    if (typeof mapStyleUrl === 'string') {
      fetch(mapStyleUrl)
        .then(res => res.json())
        .then(data => setMapStyle(data))
        .catch(err => {
          console.error('Failed to load map style:', err);
          setMapError('Tile server unreachable');
        });
    }
  }, [mapStyleUrl]);

  useEffect(() => {
    const handleFlyTo = (e: Event) => {
      const customEvent = e as CustomEvent<{ lat: number; lng: number; zoom?: number }>;
      if (customEvent.detail && mapRef.current) {
        mapRef.current.flyTo({
          center: [customEvent.detail.lng, customEvent.detail.lat],
          zoom: customEvent.detail.zoom || 15,
          duration: 1500
        });
      }
    };
    window.addEventListener('map-fly-to', handleFlyTo);
    return () => window.removeEventListener('map-fly-to', handleFlyTo);
  }, []);

  const onMouseEnter = useCallback(() => setCursor('pointer'), []);
  const onMouseLeave = useCallback(() => setCursor(''), []);

  const handleInteractiveClick = useCallback((e: any) => {
    const feature = e.features?.[0];
    if (!feature) return;

    if (feature.layer.id === 'flood-zones-fill' && onZoneClick) {
      onZoneClick(feature.properties as unknown as FloodZoneProperties);
    } else if ((feature.layer.id === 'drainage-lines' || feature.layer.id === 'drainage-nodes') && onDrainageClick) {
      // Pass along the layer ID so the parent can distinguish node vs segment
      const properties = {
        ...feature.properties,
        _layerId: feature.layer.id
      };
      onDrainageClick(properties as unknown as Record<string, unknown>);
    } else if (feature.layer.id === 'waterbodies-fill' && onWaterBodyClick) {
      onWaterBodyClick(feature.properties as unknown as WaterBodyProperties);
    }
  }, [onZoneClick, onDrainageClick, onWaterBodyClick]);

  // Flood Zone Layers
  const floodFillLayer: any = useMemo(() => ({
    id: 'flood-zones-fill',
    type: 'fill',
    layout: {
      visibility: enabledLayers['flood-risk'] !== false ? 'visible' : 'none'
    },
    paint: {
      'fill-color': [
        'match',
        ['get', 'riskLevel'],
        'low', RISK_COLORS.low,
        'moderate', RISK_COLORS.moderate,
        'high', RISK_COLORS.high,
        'critical', RISK_COLORS.critical,
        '#64748b',
      ],
      'fill-opacity': highlightZoneId
        ? ['case', ['==', ['get', 'id'], highlightZoneId], 0.75, 0.2]
        : [
          'match',
          ['get', 'riskLevel'],
          'low', 0.35,
          'moderate', 0.45,
          'high', 0.55,
          'critical', 0.65,
          0.3,
        ],
    }
  }), [highlightZoneId, enabledLayers]);

  const floodLineLayer: any = useMemo(() => ({
    id: 'flood-zones-outline',
    type: 'line',
    layout: {
      visibility: enabledLayers['flood-risk'] !== false ? 'visible' : 'none'
    },
    paint: {
      'line-color': [
        'match',
        ['get', 'riskLevel'],
        'low', RISK_COLORS.low,
        'moderate', RISK_COLORS.moderate,
        'high', RISK_COLORS.high,
        'critical', RISK_COLORS.critical,
        '#64748b',
      ],
      'line-width': highlightZoneId
        ? ['case', ['==', ['get', 'id'], highlightZoneId], 4, 1.5]
        : 2,
      'line-opacity': 0.8,
    }
  }), [highlightZoneId, enabledLayers]);

  const floodLabelLayer: any = useMemo(() => ({
    id: 'flood-zones-labels',
    type: 'symbol',
    layout: {
      visibility: enabledLayers['flood-risk'] !== false ? 'visible' : 'none',
      'text-field': ['get', 'name'],
      'text-size': 11,
      'text-anchor': 'center',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#000000',
      'text-halo-width': 1.5,
    }
  }), [enabledLayers]);

  const floodAlertLayer: any = useMemo(() => ({
    id: 'flood-zones-alerts',
    type: 'symbol',
    layout: {
      visibility: enabledLayers['flood-risk'] !== false ? 'visible' : 'none',
      'text-field': [
        'match',
        ['get', 'alertSeverity'],
        'critical', '🚨',
        'warning', '⚠️',
        'watch', '⚠️',
        ''
      ],
      'text-size': [
        'match',
        ['get', 'alertSeverity'],
        'critical', 24,
        'warning', 20,
        'watch', 16,
        0
      ],
      'text-anchor': 'center',
      'text-allow-overlap': true,
    },
    paint: {
      'text-opacity': 1
    },
    filter: ['has', 'alertSeverity']
  }), [enabledLayers]);

  // Drainage Layers
  const drainageLineLayer: any = useMemo(() => ({
    id: 'drainage-lines',
    type: 'line',
    layout: {
      visibility: enabledLayers['drainage'] !== false ? 'visible' : 'none'
    },
    paint: {
      'line-color': tracedSegments.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedSegments]],
        traceType === 'simulation' ? '#ef4444' : '#06b6d4', // Red for sim, Cyan for trace
        '#334155'  // Dimmed for rest
      ] : [
        'match',
        ['get', 'stress_level'],
        'normal', DRAINAGE_STRESS_COLORS.normal,
        'low', DRAINAGE_STRESS_COLORS.low,
        'medium', DRAINAGE_STRESS_COLORS.medium,
        'high', DRAINAGE_STRESS_COLORS.high,
        'critical', DRAINAGE_STRESS_COLORS.critical,
        '#64748b',
      ],
      'line-width': tracedSegments.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedSegments]],
        6,
        1
      ] : [
        'match',
        ['get', 'type'],
        'drain', 2,
        'nala', 4,
        2,
      ],
      'line-opacity': tracedSegments.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedSegments]],
        1.0,
        0.3
      ] : 0.8,
    }
  }), [tracedSegments, traceType, enabledLayers]);

  const drainageLabelLayer: any = useMemo(() => ({
    id: 'drainage-labels',
    type: 'symbol',
    layout: {
      visibility: enabledLayers['drainage'] !== false ? 'visible' : 'none',
      'text-field': ['get', 'id'],
      'text-size': 10,
      'symbol-placement': 'line',
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#94a3b8',
      'text-halo-color': '#0f172a',
      'text-halo-width': 1,
    }
  }), [enabledLayers]);

  // Drainage Nodes Layers
  const drainageNodeLayer: any = useMemo(() => ({
    id: 'drainage-nodes',
    type: 'circle',
    layout: {
      visibility: enabledLayers['drainage'] !== false ? 'visible' : 'none'
    },
    paint: {
      'circle-color': tracedNodes.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedNodes]],
        traceType === 'simulation' ? '#ef4444' : '#06b6d4',
        '#334155'
      ] : [
        'match',
        ['get', 'stress_level'],
        'low', DRAINAGE_STRESS_COLORS.low,
        'moderate', DRAINAGE_STRESS_COLORS.medium,
        'high', DRAINAGE_STRESS_COLORS.high,
        'critical', DRAINAGE_STRESS_COLORS.critical,
        '#64748b',
      ],
      'circle-radius': tracedNodes.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedNodes]],
        8,
        3
      ] : [
        'interpolate',
        ['linear'],
        ['coalesce', ['get', 'influence_score'], 0],
        0, 3,
        50, 8,
        100, 14
      ],
      'circle-stroke-width': 1.5,
      'circle-stroke-color': '#0f172a',
      'circle-opacity': tracedNodes.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedNodes]],
        1.0,
        0.3
      ] : 1.0,
      'circle-stroke-opacity': tracedNodes.length > 0 ? [
        'case',
        ['in', ['get', 'id'], ['literal', tracedNodes]],
        1.0,
        0.3
      ] : 1.0,
    }
  }), [tracedNodes, traceType, enabledLayers]);

  // Water Bodies Layers
  const waterBodyFillLayer: any = useMemo(() => ({
    id: 'waterbodies-fill',
    type: 'fill',
    layout: {
      visibility: enabledLayers['water-bodies'] !== false ? 'visible' : 'none'
    },
    paint: {
      'fill-color': '#0ea5e9', // Blue color for water
      'fill-opacity': 0.4,
    }
  }), [enabledLayers]);

  const waterBodyLineLayer: any = useMemo(() => ({
    id: 'waterbodies-line',
    type: 'line',
    layout: {
      visibility: enabledLayers['water-bodies'] !== false ? 'visible' : 'none'
    },
    paint: {
      'line-color': '#0284c7', // Darker blue for border
      'line-width': 1.5,
    }
  }), [enabledLayers]);

  const drainageNodeLabelLayer: any = useMemo(() => ({
    id: 'drainage-nodes-labels',
    type: 'symbol',
    layout: {
      visibility: enabledLayers['drainage'] !== false ? 'visible' : 'none',
      'text-field': ['get', 'id'],
      'text-size': 10,
      'text-offset': [0, 1.5],
      'text-allow-overlap': false,
    },
    paint: {
      'text-color': '#ffffff',
      'text-halo-color': '#0f172a',
      'text-halo-width': 1.5,
    }
  }), [enabledLayers]);

  // Infrastructure Layer
  const infrastructureLayer: any = useMemo(() => ({
    id: 'critical-infrastructure',
    type: 'symbol',
    layout: {
      visibility: enabledLayers['critical-infrastructure'] !== false ? 'visible' : 'none',
      'text-field': [
        'match',
        ['get', 'category'],
        'Hospital', '🏥',
        'Fire Station', '🚒',
        'Police Station', '🚓',
        'School', '🏫',
        'Government Facility', '🏛️',
        'Transport Facility', '🚉',
        'Emergency Service', '🚑',
        '🏢' // default
      ],
      'text-size': [
        'match',
        ['get', 'exposureLevel'],
        'critical', 24,
        'high', 20,
        'moderate', 16,
        16 // default / low / none
      ],
      'text-anchor': 'center',
      'text-allow-overlap': true,
    },
    paint: {
      'text-opacity': 1,
      'text-halo-color': [
        'match',
        ['get', 'exposureLevel'],
        'critical', '#ef4444',
        'high', '#f97316',
        'moderate', '#eab308',
        'transparent'
      ],
      'text-halo-width': [
        'match',
        ['get', 'exposureLevel'],
        'critical', 2,
        'high', 1.5,
        'moderate', 1,
        0
      ]
    }
  }), [enabledLayers]);

  const interactiveLayerIds = [
    ...(floodZones && enabledLayers['flood-risk'] !== false ? ['flood-zones-fill'] : []),
    ...(drainage && enabledLayers['drainage'] !== false ? ['drainage-lines', 'drainage-nodes'] : []),
    ...(waterBodies && enabledLayers['water-bodies'] !== false ? ['waterbodies-fill'] : []),
    ...(infrastructure && enabledLayers['critical-infrastructure'] !== false ? ['critical-infrastructure'] : []),
  ];

  const filteredMapStyle = useMemo(() => {
    if (!mapStyle || typeof mapStyle === 'string' || !mapStyle.layers) return mapStyle;

    // Deep clone to avoid mutating state directly, though MapLibre handles it
    const newStyle = { ...mapStyle };
    newStyle.layers = mapStyle.layers.map((layer: any) => {
      let visible = true;
      const id = layer.id.toLowerCase();

      // Filter base map layers based on toggles
      if (enabledLayers['roads'] === false && (id.includes('road') || id.includes('bridge') || id.includes('tunnel'))) visible = false;
      if (enabledLayers['buildings'] === false && id.includes('building')) visible = false;
      if (enabledLayers['land-cover'] === false && (id.includes('landcover') || id.includes('park') || id.includes('wood') || id.includes('grass') || id.includes('forest') || id.includes('agriculture'))) visible = false;

      return {
        ...layer,
        layout: {
          ...layer.layout,
          visibility: visible ? 'visible' : 'none'
        }
      };
    });
    return newStyle;
  }, [mapStyle, enabledLayers]);

  const augmentedFloodZones = useMemo(() => {
    if (!floodZones) return null;
    
    return {
      ...floodZones,
      features: floodZones.features.map((f: any) => {
        const zoneId = f.properties.id;
        const zoneAlert = alerts?.find(a => a.zoneId === zoneId && a.status === 'active');
        
        let dynamicRiskLevel = f.properties.riskLevel;
        let alertSeverity = zoneAlert?.severity;

        if (nowcastZones) {
          const matchingZone = nowcastZones.find(nz => nz.zoneId === zoneId);
          if (matchingZone) {
             const timelineEntry = matchingZone.timeline.find(t => t.offsetMinutes === forecastOffsetMinutes);
             if (timelineEntry) {
               dynamicRiskLevel = timelineEntry.riskLevel;
               if (!alertSeverity && (dynamicRiskLevel === 'high' || dynamicRiskLevel === 'critical')) {
                 alertSeverity = dynamicRiskLevel === 'critical' ? 'critical' : 'warning';
               }
             }
          }
        }

        return {
          ...f,
          properties: {
            ...f.properties,
            riskLevel: dynamicRiskLevel,
            alertSeverity: alertSeverity
          }
        };
      })
    };
  }, [floodZones, alerts, nowcastZones, forecastOffsetMinutes]);

  if (!currentCity) {
    return (
      <div className={cn('flex items-center justify-center w-full h-full min-h-[300px] bg-muted/20 rounded-lg', className)}>
        <p className="text-muted-foreground text-sm">Loading city data...</p>
      </div>
    );
  }

  if (!currentCity.center || currentCity.center.length < 2) {
    return (
      <div className={cn('flex items-center justify-center w-full h-full min-h-[300px] bg-muted/20 rounded-lg', className)}>
        <p className="text-muted-foreground text-sm">City map data is missing or incorrectly configured.</p>
      </div>
    );
  }

  if (!mapStyle) {
    return (
      <div className={cn('flex items-center justify-center w-full h-full min-h-[300px] bg-muted/20 rounded-lg', className)}>
        {mapError ? (
          <div className="text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            <span>Basemap unavailable ({mapError})</span>
          </div>
        ) : (
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading basemap...
          </p>
        )}
      </div>
    );
  }

  return (
    <div className={cn('relative w-full h-full min-h-[300px] bg-muted/20 rounded-lg overflow-hidden', className)}>
      {mapError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-destructive/90 text-destructive-foreground px-4 py-2 rounded-md shadow-lg text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <span>Basemap unavailable ({mapError})</span>
        </div>
      )}
      <Map
        ref={mapRef}
        initialViewState={{
          longitude: currentCity.center[0],
          latitude: currentCity.center[1],
          zoom: currentCity.zoom,
          ...(initialViewStateOverride || {})
        }}
        mapStyle={filteredMapStyle as any}
        terrain={enabledLayers['terrain'] ? { source: 'terrain-dem', exaggeration: 1.5 } : undefined}
        interactiveLayerIds={interactiveLayerIds}
        onClick={handleInteractiveClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        attributionControl={false}
        reuseMaps={true}
        style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}
        onError={(e) => {
          // Only set a persistent error banner for style/source load failures.
          // Individual tile errors (network blip on a single tile) are transient —
          // MapLibre retries them automatically. Do not block the UI for them.
          const msg = e?.error?.message || '';
          const isStyleOrSourceFailure =
            msg.includes('style') ||
            msg.includes('Failed to fetch') ||
            msg.includes('403');
          if (isStyleOrSourceFailure) {
            console.warn('Map source/style unreachable:', msg);
            setMapError('Tile server unreachable');
          } else {
            // Tile-level errors (e.g. transient AJAXError on a single tile): log only
            console.debug('Map tile error (transient, retrying):', msg);
          }
        }}
      >
        <NavigationControl position="top-right" showCompass={false} />

        {augmentedFloodZones && (
          <Source id="flood-zones" type="geojson" data={augmentedFloodZones as any}>
            <Layer {...floodFillLayer} />
            <Layer {...floodLineLayer} />
            <Layer {...floodLabelLayer} />
            <Layer {...floodAlertLayer} />
          </Source>
        )}

        {drainage && (
          <>
            {/* Handle both full DrainageNetwork ({segments, nodes}) and direct FeatureCollection APIs */}
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(drainage.segments || (drainage as any).type === 'FeatureCollection') && (
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Source id="drainage-segments-source" type="geojson" data={(drainage.segments || drainage) as any}>
                <Layer {...drainageLineLayer} />
                <Layer {...drainageLabelLayer} />
              </Source>
            )}
          </>
        )}

        {waterBodies && (
          <Source id="waterbodies-source" type="geojson" data={waterBodies as any}>
            <Layer {...waterBodyFillLayer} />
            <Layer {...waterBodyLineLayer} />
          </Source>
        )}

        {infrastructure && infrastructure.features && infrastructure.features.length > 0 && (
          <Source id="critical-infrastructure-source" type="geojson" data={infrastructure as any}>
            <Layer {...infrastructureLayer} />
          </Source>
        )}

        <Source
          id="terrain-dem"
          type="raster-dem"
          tiles={['http://localhost:8000/static/tiles/dem/{z}/{x}/{y}.png']}
          encoding="mapbox"
          tileSize={256}
          maxzoom={14}
        >
          <Layer
            id="hillshade-layer"
            type="hillshade"
            layout={{
              visibility: enabledLayers['terrain'] ? 'visible' : 'none'
            }}
            paint={{
              'hillshade-exaggeration': 0.8,
              'hillshade-shadow-color': '#4a5568',
              'hillshade-highlight-color': '#ffffff',
              'hillshade-accent-color': '#000000'
            }}
          />
        </Source>

        {/* Flood-Safe Route Layers */}
        {safeRoute && safeRoute.fastest && enabledLayers['safe-route'] !== false && (
          <Source
            id="route-fastest"
            type="geojson"
            data={{ type: 'Feature', geometry: safeRoute.fastest.geometry, properties: {} }}
          >
            <Layer
              id="route-fastest-line"
              type="line"
              paint={{
                'line-color': '#60a5fa',
                'line-width': 4,
                'line-opacity': activeRouteType === 'fastest' ? 0.9 : 0.5,
                'line-dasharray': [2, 1],
              }}
            />
          </Source>
        )}
        {safeRoute && safeRoute.safer && enabledLayers['safe-route'] !== false && (
          <Source
            id="route-safer"
            type="geojson"
            data={{ type: 'Feature', geometry: safeRoute.safer.geometry, properties: {} }}
          >
            <Layer
              id="route-safer-line"
              type="line"
              paint={{
                'line-color': '#34d399',
                'line-width': 5,
                'line-opacity': activeRouteType === 'safer' ? 1.0 : 0.5,
              }}
            />
          </Source>
        )}
      </Map>
    </div>
  );
}
