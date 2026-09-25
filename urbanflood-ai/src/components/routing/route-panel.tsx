'use client';

import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Navigation, AlertTriangle, Clock, Route, Zap, Shield, ChevronDown, ChevronUp, Loader2, Info } from 'lucide-react';
import { SafeRoutingResult, NowcastZone } from '@/types';
import { RISK_COLORS } from '@/types';
import { cn } from '@/lib/utils';

interface RoutePanelProps {
  nowcastZones?: NowcastZone[];
  onRouteResult?: (result: SafeRoutingResult | null) => void;
  onActiveRouteChange?: (type: 'fastest' | 'safer') => void;
  className?: string;
}

const FORECAST_OPTIONS = [
  { label: 'Now', value: 0 },
  { label: '+30 min', value: 30 },
  { label: '+60 min', value: 60 },
  { label: '+90 min', value: 90 },
  { label: '+120 min', value: 120 },
  { label: '+180 min', value: 180 },
];

function formatDuration(seconds: number): string {
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem > 0 ? `${h}h ${rem}m` : `${h}h`;
}

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function RiskBadge({ level, score }: { level: string; score: number }) {
  const color = RISK_COLORS[level as keyof typeof RISK_COLORS] || '#64748b';
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider"
      style={{ backgroundColor: `${color}22`, color, border: `1px solid ${color}44` }}
    >
      {level} ({score})
    </span>
  );
}

export function RoutePanel({ nowcastZones = [], onRouteResult, onActiveRouteChange, className }: RoutePanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [originLat, setOriginLat] = useState('17.3850');
  const [originLng, setOriginLng] = useState('78.4867');
  const [destLat, setDestLat] = useState('17.4100');
  const [destLng, setDestLng] = useState('78.5200');
  const [forecastMinutes, setForecastMinutes] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SafeRoutingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeRoute, setActiveRoute] = useState<'fastest' | 'safer'>('safer');

  const handleFindRoute = useCallback(async () => {
    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const body = {
        origin: { latitude: parseFloat(originLat), longitude: parseFloat(originLng) },
        destination: { latitude: parseFloat(destLat), longitude: parseFloat(destLng) },
        forecastMinutes,
        nowcastZones,
      };
      const res = await fetch('/api/v1/routing/safe-route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const errData = await res.json();
        setError(errData.error || 'Routing request failed.');
        return;
      }
      const data: SafeRoutingResult = await res.json();
      if (data.status === 'no_route' || data.status === 'provider_unavailable') {
        setError(data.saferRouteMessage || 'No route available.');
        return;
      }
      setResult(data);
      onRouteResult?.(data);
      const preferred = data.safer ? 'safer' : 'fastest';
      setActiveRoute(preferred);
      onActiveRouteChange?.(preferred);
    } catch {
      setError('Flood-safe routing requires a routable road network. Service temporarily unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, [originLat, originLng, destLat, destLng, forecastMinutes, nowcastZones, onRouteResult, onActiveRouteChange]);

  const handleSelectRoute = (type: 'fastest' | 'safer') => {
    setActiveRoute(type);
    onActiveRouteChange?.(type);
  };

  return (
    <Card className={cn('bg-card/95 backdrop-blur-sm border-border', className)}>
      <CardHeader className="px-3 py-2 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <CardTitle className="flex items-center justify-between text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <span className="flex items-center gap-1.5">
            <Route className="h-3.5 w-3.5 text-emerald-400" />
            Flood-Safe Routing
          </span>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="px-3 pb-3 pt-0 space-y-3 flex-1 overflow-y-auto min-h-0">
          {/* Disclaimer */}
          <div className="flex items-start gap-1.5 p-2 rounded bg-muted/40 border border-border text-[10px] text-muted-foreground">
            <Info className="h-3 w-3 mt-0.5 shrink-0 text-blue-400" />
            <span>Decision-support prototype. Routing data: OSRM / OpenStreetMap. Flood risk is modelled — not guaranteed safe.</span>
          </div>

          {/* Origin */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Origin (lat, lng)</p>
            <div className="flex gap-1">
              <input
                id="route-origin-lat"
                type="number"
                step="0.0001"
                value={originLat}
                onChange={e => setOriginLat(e.target.value)}
                placeholder="Latitude"
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                id="route-origin-lng"
                type="number"
                step="0.0001"
                value={originLng}
                onChange={e => setOriginLng(e.target.value)}
                placeholder="Longitude"
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Destination */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Destination (lat, lng)</p>
            <div className="flex gap-1">
              <input
                id="route-dest-lat"
                type="number"
                step="0.0001"
                value={destLat}
                onChange={e => setDestLat(e.target.value)}
                placeholder="Latitude"
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
              <input
                id="route-dest-lng"
                type="number"
                step="0.0001"
                value={destLng}
                onChange={e => setDestLng(e.target.value)}
                placeholder="Longitude"
                className="flex-1 bg-background border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Forecast horizon */}
          <div className="space-y-1">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Forecast Horizon</p>
            <div className="flex flex-wrap gap-1">
              {FORECAST_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  id={`route-forecast-${opt.value}`}
                  onClick={() => setForecastMinutes(opt.value)}
                  className={cn(
                    'px-2 py-0.5 rounded text-[10px] font-medium transition-colors',
                    forecastMinutes === opt.value
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-muted text-muted-foreground border border-border hover:bg-accent'
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Find Route Button */}
          <button
            id="route-find-btn"
            onClick={handleFindRoute}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-semibold text-white transition-colors"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Navigation className="h-3.5 w-3.5" />}
            {isLoading ? 'Calculating...' : 'Find Flood-Safer Route'}
          </button>

          {/* Error State */}
          {error && (
            <div className="flex items-start gap-2 p-2 rounded bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
              <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Route Results */}
          {result && result.fastest && (
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Route Comparison</p>

              {/* Alert: active risk on route */}
              {(result.fastest.riskLevel === 'high' || result.fastest.riskLevel === 'critical') && (
                <div className="flex items-start gap-2 p-2 rounded bg-orange-500/10 border border-orange-500/20 text-[11px] text-orange-400">
                  <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  <span>
                    Route intersects a modelled <strong>{result.fastest.riskLevel}</strong> flood-risk area.
                    {result.safer ? ' Consider the flood-safer alternative.' : ''}
                  </span>
                </div>
              )}

              {/* Fastest Route Card */}
              <div
                id="route-fastest-card"
                onClick={() => handleSelectRoute('fastest')}
                className={cn(
                  'rounded border p-2 cursor-pointer transition-colors space-y-1.5',
                  activeRoute === 'fastest'
                    ? 'border-blue-500/50 bg-blue-500/10'
                    : 'border-border bg-muted/30 hover:bg-accent/30'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400">
                    <Zap className="h-3.5 w-3.5" />
                    Fastest Route
                  </div>
                  <RiskBadge level={result.fastest.riskLevel} score={result.fastest.estimatedFloodExposure} />
                </div>
                <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {formatDistance(result.fastest.distanceMeters)}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(result.fastest.durationSeconds)}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Modelled Flood Exposure: <span className="font-semibold text-foreground">{result.fastest.estimatedFloodExposure}/100</span>
                  {result.fastest.criticalRiskSegmentCount > 0 && (
                    <span className="ml-1 text-red-400">· {result.fastest.criticalRiskSegmentCount} critical segment{result.fastest.criticalRiskSegmentCount !== 1 ? 's' : ''}</span>
                  )}
                </div>
              </div>

              {/* Flood-Safer Route Card */}
              {result.safer ? (
                <div
                  id="route-safer-card"
                  onClick={() => handleSelectRoute('safer')}
                  className={cn(
                    'rounded border p-2 cursor-pointer transition-colors space-y-1.5',
                    activeRoute === 'safer'
                      ? 'border-emerald-500/50 bg-emerald-500/10'
                      : 'border-border bg-muted/30 hover:bg-accent/30'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                      <Shield className="h-3.5 w-3.5" />
                      Flood-Safer Route
                    </div>
                    <RiskBadge level={result.safer.riskLevel} score={result.safer.estimatedFloodExposure} />
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Route className="h-3 w-3" /> {formatDistance(result.safer.distanceMeters)}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {formatDuration(result.safer.durationSeconds)}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    Modelled Flood Exposure: <span className="font-semibold text-emerald-400">{result.safer.estimatedFloodExposure}/100</span>
                  </div>
                  {result.safer.explanation.slice(-1).map((line, i) => (
                    <p key={i} className="text-[10px] text-emerald-500/80 italic">{line}</p>
                  ))}
                </div>
              ) : (
                <div className="rounded border border-border bg-muted/20 p-2 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">No alternative available.</span>{' '}
                  {result.saferRouteMessage}
                </div>
              )}

              {/* Attribution */}
              {result.status === 'risk_data_unavailable' && (
                <p className="text-[10px] text-amber-500/80 italic">
                  ⚠ Flood-risk data unavailable for route assessment. Route displayed without risk scoring.
                </p>
              )}
              <p className="text-[9px] text-muted-foreground/60">
                Routing: OSRM / OpenStreetMap · Flood risk: UrbanFlood AI Coupled Risk Engine
              </p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
