'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { hyderabadHistoricalEvents } from '@/data/cities/hyderabad/historical-events';
import { HistoricalFloodEvent } from '@/types';
import { Clock, Calendar, Droplets, ArrowRight, ArrowLeftRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RiskBadge } from '@/components/map/risk-legend';
import { RainfallChart } from '@/components/charts/rainfall-chart';
import { MapView } from '@/components/map/map-view';

export default function HistoryPage() {
  const { currentCity, isCityConfigured, isLoading } = useCity();
  const events = currentCity?.id === 'hyderabad' ? hyderabadHistoricalEvents : [];
  const [selectedEventId, setSelectedEventId] = useState<string | null>(events[0]?.id || null);
  const [compareMode, setCompareMode] = useState(false);


  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Loading city data...</p>
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
          description="Historical data is not available for this city."
        />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState type="no-data" title="No historical data" description="No historical flood events recorded for this city." />
      </div>
    );
  }

  const selectedEvent = events.find(e => e.id === selectedEventId) || events[0];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Historical Events
          </h1>
          <p className="text-muted-foreground mt-1">There are no historical flood events recorded for this city yet. Check back later or explore another city&apos;s data.</p>
        </div>
        <DemoBadge label="MODELLED" />
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 px-4 pb-4 min-h-0">
        {/* Left: Event list */}
        <div className="w-80 shrink-0 flex flex-col gap-3 min-h-0">
          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="px-4 py-3 shrink-0">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                Event Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 px-3 pb-3 pt-0 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-2 pr-2">
                  {events.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => {
                        setSelectedEventId(event.id);
                        setCompareMode(false);
                      }}
                      className={cn(
                        'w-full text-left rounded-md border p-3 transition-colors',
                        selectedEventId === event.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/30 hover:bg-accent'
                      )}
                    >
                      <div className="text-xs text-muted-foreground mb-1">
                        {new Date(event.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </div>
                      <div className="text-sm font-medium text-foreground mb-2 leading-tight">
                        {event.title}
                      </div>
                      <div className="flex items-center justify-between">
                        <RiskBadge level={event.severity} size="sm" showLabel={false} />
                        <span className="text-[10px] text-muted-foreground">
                          {event.maxRainfallMmHr} mm/hr max
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right: Detail */}
        <div className="flex-1 flex flex-col gap-4 min-h-0 overflow-y-auto pr-2">
           <Card className="shrink-0">
              <CardHeader className="px-4 py-3 flex flex-row justify-between items-start space-y-0">
                 <div>
                    <div className="flex items-center gap-2 mb-1">
                       <CardTitle className="text-lg">{selectedEvent.title}</CardTitle>
                       <RiskBadge level={selectedEvent.severity} size="sm" />
                    </div>
                    <div className="text-sm text-muted-foreground">
                        {new Date(selectedEvent.date).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                 </div>
                 <Badge variant="outline">{selectedEvent.durationHours} hours</Badge>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                 <p className="text-sm text-muted-foreground mb-4">
                    {selectedEvent.description}
                 </p>
                 <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1">
                            <Droplets className="h-3 w-3" /> Total Rainfall
                        </div>
                        <div className="text-lg font-bold">{selectedEvent.totalRainfallMm} mm</div>
                    </div>
                     <div className="bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1">
                            <Droplets className="h-3 w-3 text-risk-critical" /> Max Intensity
                        </div>
                        <div className="text-lg font-bold">{selectedEvent.maxRainfallMmHr} mm/hr</div>
                    </div>
                     <div className="bg-muted/50 p-3 rounded-md">
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground uppercase mb-1">
                            Affected Area
                        </div>
                        <div className="text-lg font-bold">{selectedEvent.affectedAreaSqKm} km²</div>
                    </div>
                 </div>
              </CardContent>
           </Card>

           <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 shrink-0">
               <Card>
                  <CardHeader className="px-4 py-3">
                     <CardTitle className="text-sm">Rainfall Progression</CardTitle>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0">
                     <RainfallChart data={selectedEvent.rainfallProgression} height={200} showAccumulation />
                  </CardContent>
               </Card>
                <Card className="flex flex-col">
                  <CardHeader className="px-4 py-3 flex flex-row items-center justify-between space-y-0">
                     <CardTitle className="text-sm">Flood Extent Verification</CardTitle>
                      <button
                        onClick={() => setCompareMode(!compareMode)}
                        className="text-xs flex items-center gap-1 text-primary hover:underline"
                        disabled={!selectedEvent.predictedExtent || !selectedEvent.observedExtent}
                      >
                         <ArrowLeftRight className="h-3 w-3" />
                         {compareMode ? 'Show Map' : 'Compare Prediction'}
                      </button>
                  </CardHeader>
                  <CardContent className="px-4 pb-4 pt-0 flex-1 relative min-h-[200px]">
                      {(!selectedEvent.predictedExtent || !selectedEvent.observedExtent) ? (
                           <div className="absolute inset-4 flex items-center justify-center bg-muted/50 rounded-md border border-dashed border-border">
                              <span className="text-xs text-muted-foreground">Detailed extent data not available for this event.</span>
                           </div>
                      ) : compareMode ? (
                          <div className="absolute inset-4 rounded-md border border-border flex items-center justify-center bg-card">
                              <div className="text-center p-4">
                                  <div className="text-sm font-semibold mb-2 text-risk-critical">Prediction vs Observation</div>
                                  <div className="text-xs text-muted-foreground mb-4 max-w-[200px] mx-auto">
                                      This view would overlay the model&apos;s predicted flood polygon against the actual Sentinel-1 observed polygon.
                                  </div>
                                  <Badge variant="outline" className="text-[10px]">Awaiting Model Validation</Badge>
                              </div>
                          </div>
                      ) : (
                          <MapView
                             className="rounded-md border border-border"
                             // Pass empty objects for now, as the main MapView doesn't support custom arbitrary geojson rendering easily without modifying it.
                             // In a real app, MapView would take a generic `layers` prop or we'd use a simplified map here.
                             floodZones={undefined}
                             drainage={undefined}
                             enabledLayers={{}}
                          />
                      )}
                  </CardContent>
               </Card>
           </div>
        </div>
      </div>
    </div>
  );
}
