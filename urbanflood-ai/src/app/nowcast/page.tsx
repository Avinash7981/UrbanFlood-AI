'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MapView } from '@/components/map/map-view';
import { RiskBadge } from '@/components/map/risk-legend';
import { RiskZonePopup } from '@/components/map/risk-zone-popup';
import { MapLayerControl } from '@/components/map/map-layer-control';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { FloodZoneProperties, NowcastZone, WaterBodyProperties } from '@/types';
import { AlertTriangle, Waves, Info, Play, Pause, RotateCcw, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { hyderabadNowcast } from '@/data/cities/hyderabad/nowcast';
import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { hyderabadDrainage } from '@/data/cities/hyderabad/drainage';
import { useRisk } from '@/context/risk-context';

const TIMESTEPS = [0, 30, 60, 90, 120, 150, 180];

export default function NowcastPage() {
  const { currentCity, isCityConfigured, isLoading: cityLoading } = useCity();
  const { weatherData, adjustedZones, infrastructure, waterBodies, activeAlerts, isLoadingRisk } = useRisk();
  const isLoading = cityLoading || isLoadingRisk;
  
  const [selectedNowcastZone, setSelectedNowcastZone] = useState<NowcastZone | null>(null);
  const [selectedMapZone, setSelectedMapZone] = useState<FloodZoneProperties | null>(null);
  const [selectedWaterBody, setSelectedWaterBody] = useState<WaterBodyProperties | null>(null);
  
  const [selectedTimestep, setSelectedTimestep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);

  const [enabledLayers, setEnabledLayers] = useState<Record<string, boolean>>({
    'flood-risk': true,
    'drainage': true,
    'water-bodies': true,
    'terrain': true
  });

  const toggleLayer = useCallback((layerId: string) => {
    setEnabledLayers((prev) => ({
      ...prev,
      [layerId]: !prev[layerId]
    }));
  }, []);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setSelectedTimestep((prev) => {
        const currentIndex = TIMESTEPS.indexOf(prev);
        if (currentIndex >= TIMESTEPS.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return TIMESTEPS[currentIndex + 1];
      });
    }, 2000); // 2 seconds per frame for comfortable visual parsing
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleReset = useCallback(() => {
    setIsPlaying(false);
    setSelectedTimestep(0);
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
          description="Flood nowcasting is not available for this city."
        />
      </div>
    );
  }

  const baseNowcast = currentCity?.id === 'hyderabad' ? hyderabadNowcast : null;

  if (!baseNowcast) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState type="model-unavailable" title="Nowcast unavailable" description="Flood prediction model is currently unavailable for this city." />
      </div>
    );
  }

  const floodZones = currentCity?.id === 'hyderabad' ? hyderabadFloodZones : null;
  const drainage = currentCity?.id === 'hyderabad' ? hyderabadDrainage : null;
  const nowcast = adjustedZones ? { ...baseNowcast, zones: adjustedZones } : baseNowcast;
  
  if (!nowcast) return null;

  const currentZoneInfo = selectedNowcastZone?.timeline.find(t => t.offsetMinutes === selectedTimestep);
  const peakZoneInfo = selectedNowcastZone?.timeline.reduce((max, t) => (t.riskScore || 0) > (max.riskScore || 0) ? t : max, selectedNowcastZone.timeline[0]);

  return (
    <div className="flex flex-col h-full bg-background">
      {/* TOP: Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-3 shrink-0">
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Waves className="h-6 w-6 text-primary" />
            Flood Nowcast
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Terrain-Aware 0–180m Modelled Risk
          </p>
          <div className="mt-2 flex items-center gap-1.5 p-1.5 rounded bg-muted/40 border border-border text-[10px] text-muted-foreground w-fit">
            <Info className="h-3 w-3 shrink-0 text-blue-400" />
            <span>Modelled decision-support output. Flood risk is not field-verified and does not represent validated inundation depth.</span>
          </div>
        </div>
        <DemoBadge label="Decision-Support Prototype" />
      </div>

      <div className="flex flex-1 gap-4 px-4 pb-4 min-h-0">
        {/* CENTER: 3D Map */}
        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div className="flex-1 relative rounded-lg overflow-hidden border border-border shadow-sm">
            <MapView 
              floodZones={floodZones} 
              drainage={drainage}
              waterBodies={waterBodies as any /* eslint-disable-line @typescript-eslint/no-explicit-any */}
              alerts={activeAlerts}
              nowcastZones={nowcast.zones}
              forecastOffsetMinutes={selectedTimestep}
              initialViewStateOverride={{ pitch: 60, bearing: -15, zoom: 12.5 }}
              onZoneClick={(z) => {
                setSelectedMapZone(z);
                const nz = nowcast.zones.find(nz => nz.zoneId === z.id);
                if (nz) setSelectedNowcastZone(nz);
              }}
              onWaterBodyClick={setSelectedWaterBody}
              highlightZoneId={selectedNowcastZone?.zoneId}
              infrastructure={infrastructure}
              enabledLayers={enabledLayers}
            />
            
            <div className="absolute top-3 left-3 z-20">
              <MapLayerControl enabledLayers={enabledLayers} onToggle={toggleLayer} />
            </div>
            {selectedMapZone && (
              <div className="absolute top-3 right-14 z-20">
                <RiskZonePopup zone={selectedMapZone} onClose={() => setSelectedMapZone(null)} />
              </div>
            )}
            {selectedWaterBody && (
              <div className="absolute top-3 right-14 z-20 bg-background/95 backdrop-blur shadow-lg border border-border rounded-lg w-72 flex flex-col p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-semibold text-sm truncate">{selectedWaterBody.name || 'Water Body'}</h3>
                  <button onClick={() => setSelectedWaterBody(null)} className="text-muted-foreground hover:text-foreground text-xs">&times;</button>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground text-[10px] uppercase">Type</p>
                    <p className="font-medium">{selectedWaterBody.type || 'N/A'}</p>
                  </div>
                  <div className="bg-muted p-2 rounded">
                    <p className="text-muted-foreground text-[10px] uppercase">Area</p>
                    <p className="font-medium">{selectedWaterBody.area ? selectedWaterBody.area.toFixed(4) : '--'}</p>
                  </div>
                  <div className="bg-muted p-2 rounded col-span-2">
                    <p className="text-muted-foreground text-[10px] uppercase">Description</p>
                    <p className="font-medium">{selectedWaterBody.metadata_json?.Descr_2 || selectedWaterBody.metadata_json?.Descr_1 || 'N/A'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM: Timeline Controls */}
          <Card className="shrink-0 bg-card/95 backdrop-blur shadow-sm">
            <CardContent className="p-3 flex items-center gap-4">
              <div className="flex items-center gap-2 shrink-0 border-r pr-4">
                <button
                  onClick={() => {
                    if (selectedTimestep === 180 && !isPlaying) setSelectedTimestep(0);
                    setIsPlaying(!isPlaying);
                  }}
                  className="h-8 w-8 rounded-full bg-primary/10 hover:bg-primary/20 flex items-center justify-center text-primary transition-colors"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
                </button>
                <button
                  onClick={handleReset}
                  className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors"
                >
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
              
              <div className="flex-1 flex justify-between relative px-2 mb-4">
                <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-muted -translate-y-1/2 rounded-full" />
                <div 
                  className="absolute top-1/2 left-4 h-0.5 bg-primary -translate-y-1/2 rounded-full transition-all duration-300" 
                  style={{ width: `calc(${(selectedTimestep / 180) * 100}% - 2rem)` }}
                />
                {TIMESTEPS.map(t => (
                  <button
                    key={t}
                    onClick={() => { setIsPlaying(false); setSelectedTimestep(t); }}
                    className="relative z-10 flex flex-col items-center gap-1 group mt-2"
                  >
                    <div className={cn(
                      "w-3 h-3 rounded-full border-2 transition-all duration-300",
                      selectedTimestep >= t ? "bg-primary border-primary" : "bg-background border-muted group-hover:border-primary/50",
                      selectedTimestep === t && "ring-4 ring-primary/20 scale-125"
                    )} />
                    <span className={cn(
                      "text-[10px] font-medium absolute top-4 whitespace-nowrap transition-colors",
                      selectedTimestep === t ? "text-foreground" : "text-muted-foreground group-hover:text-foreground"
                    )}>
                      {t === 0 ? 'NOW' : `+${t}m`}
                    </span>
                  </button>
                ))}
              </div>
              <div className="w-16 shrink-0 text-right">
                 <span className="text-sm font-bold text-primary">{selectedTimestep === 0 ? 'NOW' : `+${selectedTimestep}m`}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT: Selected Zone Info */}
        <div className="w-80 shrink-0 flex flex-col gap-3 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="px-4 py-3 shrink-0 border-b">
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                Zone Information
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 p-0 min-h-0">
              <ScrollArea className="h-full">
                {!selectedNowcastZone ? (
                   <div className="p-4 text-center text-sm text-muted-foreground mt-10 flex flex-col items-center gap-2">
                     <AlertTriangle className="h-8 w-8 text-muted-foreground/30" />
                     <p>Select a flood zone on the map to view terrain and forecast details.</p>
                   </div>
                ) : (
                  <div className="p-4 space-y-5">
                     <div>
                       <h3 className="font-bold text-lg mb-1">{selectedNowcastZone.zoneName}</h3>
                       <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Representative Elevation</span>
                          <span className="font-semibold text-foreground">
                            {selectedNowcastZone.elevation !== undefined ? `${Math.round(selectedNowcastZone.elevation)} m` : 'N/A'}
                          </span>
                       </div>
                     </div>

                     <div className="space-y-3 bg-muted/30 p-3 rounded-lg border">
                       <div className="flex items-center justify-between">
                         <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Current Selection</span>
                         <Badge variant="outline" className="text-[10px]">{selectedTimestep === 0 ? 'NOW' : `+${selectedTimestep} min`}</Badge>
                       </div>
                       
                       <div className="flex items-end justify-between">
                         <div>
                           <div className="text-3xl font-black text-foreground">
                             {currentZoneInfo?.riskScore?.toFixed(0) || '0'}
                             <span className="text-sm font-medium text-muted-foreground ml-1">/ 100</span>
                           </div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground mt-1">Modelled Risk Score</p>
                         </div>
                         <RiskBadge level={currentZoneInfo?.riskLevel || 'low'} size="md" />
                       </div>

                       {currentZoneInfo?.explanation && currentZoneInfo.explanation.length > 0 && (
                         <div className="pt-2 border-t mt-2">
                           <p className="text-xs text-muted-foreground italic">
                             {currentZoneInfo.explanation[0]}
                           </p>
                         </div>
                       )}
                     </div>

                     <div className="space-y-2">
                       <div className="flex items-center justify-between text-xs mb-3">
                         <span className="font-bold uppercase tracking-wider text-muted-foreground">Contributing Factors</span>
                       </div>
                       {/* Factor rendering based on active timestep factorScores */}
                       {currentZoneInfo?.factorScores ? (
                         Object.entries(currentZoneInfo.factorScores).sort((a,b) => b[1] - a[1]).map(([key, value]) => {
                           if (value <= 0) return null;
                           const labels: Record<string, string> = {
                             rainfall: 'Rainfall',
                             saturation: 'Soil Saturation',
                             drainage: 'Drainage Constraint',
                             terrain: 'Terrain/Elevation',
                             waterBody: 'Water Body Proximity',
                             rainfallProb: 'Rainfall Probability'
                           };
                           return (
                             <div key={key} className="flex items-center justify-between text-xs p-2 rounded bg-muted/50">
                               <span className="font-medium">{labels[key] || key}</span>
                               <span className="text-muted-foreground">{(value * 100).toFixed(0)}% contribution</span>
                             </div>
                           );
                         })
                       ) : (
                         <p className="text-xs text-muted-foreground">No factors available.</p>
                       )}
                     </div>

                     <div className="space-y-2 pt-4 border-t">
                        <div className="flex items-center justify-between text-xs mb-2">
                         <span className="font-bold uppercase tracking-wider text-muted-foreground">Peak Forecast</span>
                        </div>
                        <div className="flex items-center justify-between text-xs">
                           <span>Expected Peak Risk</span>
                           <RiskBadge level={peakZoneInfo?.riskLevel || 'low'} size="sm" />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                           <span>Peak Timing</span>
                           <span className="font-semibold text-foreground">
                             {peakZoneInfo?.offsetMinutes === 0 ? 'NOW' : `+${peakZoneInfo?.offsetMinutes} min`}
                           </span>
                        </div>
                     </div>

                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
