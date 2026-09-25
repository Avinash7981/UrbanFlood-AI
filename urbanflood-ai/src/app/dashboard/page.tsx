'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { CloudRain, AlertTriangle, Target, Clock, Waves } from 'lucide-react';
import { MapView } from '@/components/map/map-view';
import { MapLayerControl } from '@/components/map/map-layer-control';
import { RiskLegend } from '@/components/map/risk-legend';
import { RiskZonePopup } from '@/components/map/risk-zone-popup';
import { MetricCard } from '@/components/dashboard/metric-card';
import { AlertCard } from '@/components/alerts/alert-card';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { hyderabadDrainage } from '@/data/cities/hyderabad/drainage';
import { FloodZoneProperties, WeatherData, NowcastZone, FloodAlert, CriticalInfrastructureCollection, InfrastructureExposure, SafeRoutingResult } from '@/types';
import { RoutePanel } from '@/components/routing/route-panel';
import { generateAlertsFromNowcast } from '@/lib/services/alert-engine';
import { calculateInfrastructureExposure } from '@/lib/services/infrastructure-exposure';
import { hyderabadNowcast } from '@/data/cities/hyderabad/nowcast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRisk } from '@/context/risk-context';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { currentCity, isCityConfigured, isLoading: cityLoading } = useCity();
  const { weatherData, adjustedZones, activeAlerts, exposure, infrastructure, waterBodies, isLoadingRisk } = useRisk();
  
  const isLoading = cityLoading || isLoadingRisk;
  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({
    'flood-risk': true,
    rainfall: true,
    drainage: true,
    'water-bodies': true,
    'critical-infrastructure': true,
    'safe-route': true,
    terrain: false,
    'land-cover': false,
    roads: true,
    buildings: false,
  });
  const [selectedZone, setSelectedZone] = useState<FloodZoneProperties | null>(null);
  const [safeRoute, setSafeRoute] = useState<SafeRoutingResult | null>(null);
  const [activeRouteType, setActiveRouteType] = useState<'fastest' | 'safer'>('safer');

  const toggleLayer = useCallback((layerId: string) => {
    setEnabledLayers((prev) => ({ ...prev, [layerId]: !prev[layerId] }));
  }, []);

  const handleZoneClick = useCallback((zone: FloodZoneProperties) => {
    setSelectedZone(zone);
  }, []);



  if (isLoading || cityLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading city and weather data...</p>
      </div>
    );
  }

  if (!currentCity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No city data available.</p>
      </div>
    );
  }

  if (!isCityConfigured) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          type="not-configured"
          title={`${currentCity?.name} is not yet configured`}
          description="This city is not yet configured for live flood analysis. Data setup is required before the platform can display analysis for this city."
        />
      </div>
    );
  }

  const floodZones = currentCity?.id === 'hyderabad' ? hyderabadFloodZones : null;
  const drainage = currentCity?.id === 'hyderabad' ? hyderabadDrainage : null;

  // Calculate dynamic KPIs from the risk engine
  let peakRiskScore = 0;
  let peakRiskLevel = 'Low';
  let peakRiskTime = '+0 min';
  let mainFactors: string[] = [];

  if (adjustedZones && adjustedZones.length > 0) {
    adjustedZones.forEach(z => {
      const zone = z; 
      zone.timeline.forEach((t: {riskScore?: number, riskLevel: string, offsetMinutes: number, explanation?: string[]}) => {
        const score = t.riskScore || 0;
        if (score > peakRiskScore) {
          peakRiskScore = score;
          peakRiskLevel = t.riskLevel.charAt(0).toUpperCase() + t.riskLevel.slice(1);
          peakRiskTime = `+${t.offsetMinutes} min`;
          mainFactors = t.explanation || [];
        }
      });
    });
  }

  const currentMaxScore = adjustedZones ? Math.max(...adjustedZones.map(z => z.timeline[0]?.riskScore || 0)) : 0;
  let currentLevel = 'Low';
  if (currentMaxScore >= 75) currentLevel = 'Critical';
  else if (currentMaxScore >= 50) currentLevel = 'High';
  else if (currentMaxScore >= 25) currentLevel = 'Moderate';

  return (
    <div className="flex flex-col h-full">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 p-4 pb-0">
        <MetricCard
          label="Current Flood Risk"
          badgeText="MODELLED"
          value={currentLevel.toUpperCase()}
          icon={<CloudRain className="h-4 w-4 text-chart-blue" />}
          trend="stable"
          trendLabel={`${currentMaxScore.toFixed(0)} score`}
        />
        <MetricCard
          label="Peak 0–3H Risk"
          badgeText="MODELLED"
          value={peakRiskLevel.toUpperCase()}
          icon={<AlertTriangle className={cn("h-4 w-4", peakRiskScore >= 75 ? "text-risk-critical" : "text-risk-high")} />}
          trend="up"
          trendLabel={`Peak at ${peakRiskTime}`}
        />
        <MetricCard
          label="Main Contributing Factors"
          badgeText="MODELLED"
          value={mainFactors.length > 0 ? mainFactors.length.toString() : 'None'}
          unit="factors"
          icon={<Target className="h-4 w-4 text-risk-watch" />}
          trend="stable"
          trendLabel={mainFactors.length > 0 ? mainFactors[0] : ''}
        />
        <MetricCard
          label="Model Confidence"
          badgeText="MODELLED"
          value="Not yet calibrated"
          icon={<Clock className="h-4 w-4 text-muted-foreground" />}
          valueClassName="text-sm font-medium pt-2"
        />
      </div>

      {/* Main content: Map + Side panel */}
      <div className="flex flex-1 gap-0 p-4 min-h-0">
        {/* Map area */}
        <div className="relative flex-1 rounded-lg overflow-hidden border border-border">
            <MapView
            floodZones={floodZones}
            drainage={drainage}
            // @ts-expect-error ignore typing
            waterBodies={waterBodies}
            infrastructure={infrastructure}
            alerts={activeAlerts}
            enabledLayers={enabledLayers}
            onZoneClick={handleZoneClick}
            highlightZoneId={selectedZone?.id ?? null}
            safeRoute={safeRoute}
            activeRouteType={activeRouteType}
          />

          {/* Layer control overlay */}
          <div className="absolute top-3 left-3 z-10">
            <MapLayerControl enabledLayers={enabledLayers} onToggle={toggleLayer} />
          </div>

          {/* Risk legend overlay */}
          <div className="absolute bottom-3 left-3 z-10">
            <div className="rounded-md bg-card/90 backdrop-blur-sm border border-border px-3 py-2">
              <RiskLegend />
            </div>
          </div>

          {/* Zone popup */}
          {selectedZone && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20">
              <RiskZonePopup zone={selectedZone} onClose={() => setSelectedZone(null)} />
            </div>
          )}

          {/* Flood-Safe Routing Panel — bottom-right map overlay */}
          <div className="absolute bottom-3 right-3 z-10 w-80 max-h-[calc(100%-1.5rem)] flex flex-col pointer-events-none">
            <RoutePanel
              className="pointer-events-auto flex-1 min-h-0 flex flex-col"
              nowcastZones={adjustedZones ?? []}
              onRouteResult={(r) => setSafeRoute(r)}
              onActiveRouteChange={(t) => setActiveRouteType(t)}
            />
          </div>
        </div>

        {/* Side panel: Alerts */}
        <div className="hidden xl:flex flex-col w-80 ml-4">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="px-4 py-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Waves className="h-4 w-4 text-risk-critical" />
                Active Alerts
                <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-risk-critical px-1.5 text-[10px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 px-3 pb-3 pt-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-2">
                  <div className="grid grid-cols-2 gap-2 text-[10px] uppercase font-bold tracking-wider">
                    <div className="bg-risk-critical/10 text-risk-critical p-2 flex justify-between rounded">
                      <span>Critical</span><span>{activeAlerts.filter(a => a.severity === 'critical').length}</span>
                    </div>
                    <div className="bg-risk-high/10 text-risk-high p-2 flex justify-between rounded">
                      <span>Warning</span><span>{activeAlerts.filter(a => a.severity === 'warning').length}</span>
                    </div>
                    <div className="bg-risk-watch/10 text-risk-watch p-2 flex justify-between rounded">
                      <span>Watch</span><span>{activeAlerts.filter(a => a.severity === 'watch').length}</span>
                    </div>
                    <div className="bg-chart-blue/10 text-chart-blue p-2 flex justify-between rounded">
                      <span>Advisory</span><span>{activeAlerts.filter(a => a.severity === 'advisory').length}</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {activeAlerts.map((alert) => (
                      <AlertCard key={alert.id} alert={alert} compact />
                    ))}
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Side panel: Infrastructure */}
          <Card className="flex-1 flex flex-col min-h-0 mt-4">
            <CardHeader className="px-4 py-3 shrink-0">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Target className="h-4 w-4 text-risk-high" />
                Critical Infrastructure
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 px-4 pb-4 pt-0 min-h-0 overflow-y-auto">
              {!infrastructure || !infrastructure.features || infrastructure.features.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground text-xs space-y-2">
                   <Target className="h-8 w-8 text-muted-foreground/30" />
                   <p>Critical infrastructure dataset not currently available for this pilot.</p>
                </div>
              ) : (
                <div className="space-y-4">
                   <div className="grid grid-cols-1 gap-2 text-xs font-medium">
                     <div className="flex justify-between items-center p-2 rounded bg-risk-critical/10 text-risk-critical">
                        <span>Critical Exposure</span>
                        <span>{exposure?.filter(e => e.exposureLevel === 'critical').length || 0}</span>
                     </div>
                     <div className="flex justify-between items-center p-2 rounded bg-risk-high/10 text-risk-high">
                        <span>High Exposure</span>
                        <span>{exposure?.filter(e => e.exposureLevel === 'high').length || 0}</span>
                     </div>
                     <div className="flex justify-between items-center p-2 rounded bg-risk-watch/10 text-risk-watch">
                        <span>Moderate Exposure</span>
                        <span>{exposure?.filter(e => e.exposureLevel === 'moderate').length || 0}</span>
                     </div>
                   </div>
                   {exposure && exposure.length > 0 && (() => {
                     const highest = [...exposure].sort((a,b) => b.responsePriorityScore - a.responsePriorityScore)[0];
                     if (highest.exposureLevel === 'none') return null;
                     return (
                        <div className="mt-4 border-t pt-4">
                           <div className="text-xs uppercase text-muted-foreground font-bold mb-2">Highest Priority:</div>
                           <div className="text-sm font-semibold">{highest.name}</div>
                           <div className="text-xs text-muted-foreground mt-1 capitalize">{highest.exposureLevel} exposure</div>
                           {highest.predictedEscalationMinutes !== null && (
                             <div className="text-xs text-risk-high mt-1">Peak risk in {highest.predictedEscalationMinutes} min</div>
                           )}
                        </div>
                     );
                   })()}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
