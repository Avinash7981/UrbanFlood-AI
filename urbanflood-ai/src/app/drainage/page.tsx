/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { MapView } from '@/components/map/map-view';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { 
  fetchDrainage, 
  fetchDrainageStatistics, 
  simulateDrainageFailure, 
  traceDrainageNetwork 
} from '@/lib/services';
import { 
  DrainageNetwork, 
  DrainageStatistics,
  DrainageNodeProperties,
  DrainageSegmentProperties,
} from '@/types';
import { GitBranch, AlertTriangle, Activity, MapPin, Search, ArrowUp, Ban, Loader2, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DrainagePage() {
  const { currentCity, isCityConfigured, isLoading: cityLoading } = useCity();
  
  const [drainage, setDrainage] = useState<DrainageNetwork | null>(null);
  const [stats, setStats] = useState<DrainageStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [selectedFeature, setSelectedFeature] = useState<DrainageNodeProperties | DrainageSegmentProperties | null>(null);
  
  const [tracedNodes, setTracedNodes] = useState<string[]>([]);
  const [tracedSegments, setTracedSegments] = useState<string[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [traceType, setTraceType] = useState<string | null>(null);
  
  const [baseNetwork, setBaseNetwork] = useState<DrainageNetwork | null>(null);

  const resetTrace = React.useCallback(() => {
    setTracedNodes([]);
    setTracedSegments([]);
    setTraceType(null);
    if (baseNetwork) {
      setDrainage(baseNetwork);
    }
  }, [baseNetwork]);

  useEffect(() => {
    async function loadData() {
      if (!currentCity || !isCityConfigured) return;
      setIsLoading(true);
      setError(null);
      
      try {
        const [networkData, statsData] = await Promise.all([
          fetchDrainage(currentCity.id),
          fetchDrainageStatistics(currentCity.id)
        ]);
        
        if (networkData && statsData) {
          setDrainage(networkData);
          setBaseNetwork(networkData);
          setStats(statsData);
        } else {
          setError("Failed to load drainage network.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unable to load drainage data.");
      } finally {
        setIsLoading(false);
        resetTrace();
      }
    }
    loadData();
  }, [currentCity, isCityConfigured, resetTrace]);

  const handleTrace = async (direction: 'upstream' | 'downstream') => {
    if (!currentCity || !selectedFeature || !('node_type' in selectedFeature)) return;
    setIsLoading(true);
    try {
      const traceData = await traceDrainageNetwork(currentCity.id, selectedFeature.id, direction);
      if (traceData) {
        setTracedNodes(traceData.traced_nodes);
        setTracedSegments(traceData.traced_segments);
        setTraceType(direction);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSimulate = async () => {
    if (!currentCity || !selectedFeature || !('node_type' in selectedFeature)) return;
    setIsSimulating(true);
    try {
      const simData = await simulateDrainageFailure(currentCity.id, selectedFeature.id);
      if (simData) {
        setTracedNodes(simData.affected_upstream_nodes);
        setTracedSegments(simData.affected_upstream_segments);
        setTraceType('simulation');
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSimulating(false);
      setIsLoading(false);
    }
  };

  const isNode = (feature: any): feature is DrainageNodeProperties => {
    return 'node_type' in feature;
  };

  if (cityLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) return (
    <div className="flex flex-col items-center justify-center h-full bg-background p-6 gap-4">
      <EmptyState 
        type="unavailable"
        title="Backend unavailable"
        description={error}
      />
      <Button onClick={() => window.location.reload()}>Retry</Button>
    </div>
  );
  
  if (isLoading && !drainage) return (
    <div className="flex items-center justify-center h-full">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );

  if (!currentCity) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No city data available.</p>
      </div>
    );
  }

  if (!isCityConfigured || !drainage) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          type="not-configured"
          title={`${currentCity?.name} is not yet configured`}
          description="Drainage topology data is not available for this city."
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <GitBranch className="h-5 w-5 text-chart-cyan" />
            Drainage Intelligence
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real GIS drainage network mapped as a topological graph
          </p>
        </div>
        {!((currentCity.dataSources ?? []).some(d => d.type === 'drainage' && d.provider === 'file')) && (
            <DemoBadge />
        )}
      </div>

      {/* Main content */}
      <div className="flex flex-1 gap-4 px-4 pb-4 min-h-0">
        {/* Left: Map */}
        <div className="flex-1 relative rounded-lg overflow-hidden border border-border min-h-[300px]">
          <MapView
            drainage={drainage as any}
            enabledLayers={{ drainage: true }}
            onDrainageClick={(feature) => {
              setSelectedFeature(feature as unknown as DrainageNodeProperties | DrainageSegmentProperties);
              resetTrace(); // Clear active traces when a new feature is clicked
            }}
            tracedNodes={tracedNodes}
            tracedSegments={tracedSegments}
            traceType={traceType}
          />
          
          {/* Map Overlay if tracing */}
          {(tracedNodes.length > 0 || tracedSegments.length > 0) && (
             <div className="absolute top-4 left-4 right-4 bg-background/90 backdrop-blur-md border border-border p-3 rounded-lg shadow-lg flex items-center justify-between z-10">
               <div>
                  <p className="text-sm font-semibold flex items-center gap-2">
                    {traceType === 'simulation' ? <Ban className="h-4 w-4 text-risk-critical" /> : <Activity className="h-4 w-4 text-primary" />}
                    {traceType === 'simulation' ? 'Blockage Simulation Active' : 'Network Trace Active'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Highlighting {tracedNodes.length} nodes and {tracedSegments.length} segments.
                    {traceType !== 'simulation' && ' (Undirected connectivity trace)'}
                  </p>
               </div>
               <Button size="sm" variant="outline" onClick={resetTrace}>Clear Trace</Button>
             </div>
          )}
        </div>

        {/* Right: Panel */}
        <div className="w-96 shrink-0 flex flex-col gap-3 min-h-0">
          
          {/* Intelligence Panel (Only show when nothing is selected to save space) */}
          {!selectedFeature && stats && (
            <ScrollArea className="flex-1 min-h-0 rounded-lg border border-border bg-card">
               <div className="p-4 space-y-4">
                 <div>
                   <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                      <Database className="h-4 w-4" />
                      Network Summary
                      <Badge variant="outline" className="ml-auto text-[9px] bg-primary/10 text-primary border-primary/20">REAL GIS DATA</Badge>
                   </h3>
                   <div className="grid grid-cols-2 gap-2">
                     <div className="bg-muted/50 p-2 rounded border border-border/50">
                       <p className="text-[10px] text-muted-foreground uppercase">Total Nodes</p>
                       <p className="text-lg font-bold">{stats.total_nodes}</p>
                     </div>
                     <div className="bg-muted/50 p-2 rounded border border-border/50">
                       <p className="text-[10px] text-muted-foreground uppercase">Total Segments</p>
                       <p className="text-lg font-bold">{stats.total_segments}</p>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2">
                   <div className="flex justify-between items-end mb-2">
                       <p className="text-[10px] text-muted-foreground uppercase font-semibold">Node Stress Distribution</p>
                       <Badge variant="outline" className="text-[9px]">DERIVED NETWORK METRIC</Badge>
                   </div>
                   <div className="flex items-center gap-2 text-xs">
                     <div className="flex-1 bg-risk-low/20 border border-risk-low/30 rounded p-2 text-center">
                       <span className="text-risk-low font-bold block">{stats.healthy_nodes}</span>
                       <span className="text-[9px] text-muted-foreground">Healthy</span>
                     </div>
                     <div className="flex-1 bg-risk-watch/20 border border-risk-watch/30 rounded p-2 text-center">
                       <span className="text-risk-watch font-bold block">{stats.watch_nodes}</span>
                       <span className="text-[9px] text-muted-foreground">Watch</span>
                     </div>
                     <div className="flex-1 bg-risk-critical/20 border border-risk-critical/30 rounded p-2 text-center">
                       <span className="text-risk-critical font-bold block">{stats.critical_nodes}</span>
                       <span className="text-[9px] text-muted-foreground">Critical</span>
                     </div>
                   </div>
                 </div>

                 <div className="space-y-2 pt-2 border-t border-border">
                   <p className="text-[10px] text-muted-foreground uppercase font-semibold">Key Infrastructure</p>
                   
                   <div className="bg-muted/30 p-2 rounded border border-border/50 text-xs flex justify-between items-center cursor-pointer hover:bg-muted/60 transition-colors">
                     <div className="flex items-center gap-2">
                        <Activity className="h-3.5 w-3.5 text-chart-blue" />
                        <span>Highest Influence</span>
                     </div>
                     <span className="font-mono text-muted-foreground">{stats.highest_collection_node_id || 'N/A'}</span>
                   </div>

                   <div className="bg-muted/30 p-2 rounded border border-border/50 text-xs flex justify-between items-center cursor-pointer hover:bg-muted/60 transition-colors">
                     <div className="flex items-center gap-2">
                        <AlertTriangle className="h-3.5 w-3.5 text-risk-critical" />
                        <span>Most Critical</span>
                     </div>
                     <span className="font-mono text-muted-foreground">{stats.most_critical_node_id || 'N/A'}</span>
                   </div>
                 </div>
                 
                 <div className="mt-4 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                    <p className="text-xs text-primary font-medium flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      Explore the Network
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      Click any node or segment on the map to view real GIS attributes, trace connected subgraph paths, or simulate blockage effects.
                    </p>
                 </div>
               </div>
            </ScrollArea>
          )}

          {/* Node/Segment Details */}
          {selectedFeature && (
            <Card className="flex-1 flex flex-col min-h-0 shadow-md border-primary/20">
              <CardHeader className="px-4 py-3 shrink-0 bg-muted/30 border-b border-border flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {isNode(selectedFeature) ? <MapPin className="h-4 w-4 text-primary" /> : <GitBranch className="h-4 w-4 text-chart-cyan" />}
                    {isNode(selectedFeature) ? 'Drainage Node' : (selectedFeature.nala_name || 'Drainage Segment')}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="outline" className="text-[9px] uppercase">
                      {isNode(selectedFeature) ? 'Node' : 'Segment'} • {isNode(selectedFeature) ? selectedFeature.node_type : selectedFeature.type}
                    </Badge>
                    <span className="font-mono">{selectedFeature.id}</span>
                  </div>
                </div>
                <button onClick={() => { setSelectedFeature(null); resetTrace(); }} className="text-xs text-muted-foreground hover:text-foreground">
                  Close
                </button>
              </CardHeader>
              
              <ScrollArea className="flex-1 min-h-0">
                <CardContent className="p-4 space-y-5">
                  {/* Status Section (Nodes Only) */}
                  {isNode(selectedFeature) && (
                      <div>
                        <div className="flex justify-between items-center mb-2">
                           <p className="text-[10px] font-medium text-muted-foreground uppercase">Network-Derived Stress</p>
                           <Badge variant="secondary" className="text-[8px] uppercase">Derived</Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            "h-3 w-3 rounded-full",
                            selectedFeature.stress_level === 'critical' ? 'bg-risk-critical' :
                            selectedFeature.stress_level === 'high' ? 'bg-risk-high' :
                            selectedFeature.stress_level === 'watch' ? 'bg-risk-watch' :
                            selectedFeature.stress_level === 'low' ? 'bg-risk-low' : 'bg-muted-foreground'
                          )} />
                          <span className="text-sm font-medium capitalize">{selectedFeature.stress_level} Stress</span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-2">
                           {selectedFeature.stress_level === 'critical' || selectedFeature.stress_level === 'high' 
                             ? `Critical bottleneck because it connects ${selectedFeature.connected_segment_count} intersecting segments.`
                             : `Healthy condition. Normal connectivity (${selectedFeature.connected_segment_count} intersecting segments).`
                           }
                        </p>
                        
                        {selectedFeature.surcharge_risk && (
                          <div className="mt-2 bg-risk-high/10 border border-risk-high/30 rounded p-2 flex items-center gap-2">
                            <AlertTriangle className="h-3.5 w-3.5 text-risk-high" />
                            <span className="text-[10px] text-risk-high font-semibold">
                              Surcharge Risk: <span className="uppercase">{selectedFeature.surcharge_risk}</span>
                            </span>
                            <Badge variant="outline" className="ml-auto text-[8px] border-risk-high text-risk-high">SIMULATED</Badge>
                          </div>
                        )}
                      </div>
                  )}

                  {/* Node Network Properties */}
                  {isNode(selectedFeature) && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">Topology Metrics</p>
                          <Badge variant="secondary" className="text-[8px] uppercase">Network Analysis</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 border border-border/50 p-2 rounded">
                          <p className="text-[9px] text-muted-foreground uppercase">Influence Score</p>
                          <p className="text-xs font-semibold">{selectedFeature.influence_score ? selectedFeature.influence_score.toFixed(1) : '--'}/100</p>
                        </div>
                        <div className="bg-muted/30 border border-border/50 p-2 rounded">
                          <p className="text-[9px] text-muted-foreground uppercase">Criticality Score</p>
                          <p className="text-xs font-semibold">{selectedFeature.criticality_score ? selectedFeature.criticality_score.toFixed(1) : '--'}/100</p>
                        </div>
                        <div className="bg-muted/30 border border-border/50 p-2 rounded">
                          <p className="text-[9px] text-muted-foreground uppercase">Connected Segments</p>
                          <p className="text-xs font-semibold">{selectedFeature.connected_segment_count}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Segment Specific Properties */}
                  {!isNode(selectedFeature) && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">Real GIS Properties</p>
                          <Badge variant="outline" className="text-[8px] uppercase border-chart-cyan text-chart-cyan bg-chart-cyan/10">REAL GIS DATA</Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div className="bg-muted/30 border border-border/50 p-2 rounded">
                          <p className="text-[9px] text-muted-foreground uppercase">Length (Computed)</p>
                          <p className="text-xs font-semibold">{selectedFeature.length_m ? `${selectedFeature.length_m.toFixed(1)} m` : '--'}</p>
                        </div>
                        <div className="bg-muted/30 border border-border/50 p-2 rounded">
                          <p className="text-[9px] text-muted-foreground uppercase">Flow Direction</p>
                          <p className="text-xs font-semibold capitalize text-risk-watch">{selectedFeature.flow_direction || 'Unknown'}</p>
                        </div>
                        {selectedFeature.layer && (
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">GIS Layer</p>
                              <p className="text-xs font-semibold">{selectedFeature.layer}</p>
                            </div>
                        )}
                        {selectedFeature.zone_name && (
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">GHMC Zone</p>
                              <p className="text-xs font-semibold">{selectedFeature.zone_name}</p>
                            </div>
                        )}
                      </div>
                      
                      {selectedFeature.type === 'nala' && (
                        <div className="mt-4 space-y-2">
                          <div className="flex justify-between items-center">
                            <p className="text-[10px] font-medium text-muted-foreground uppercase">Encroachment Constraints</p>
                            <Badge variant="outline" className="text-[8px] uppercase border-risk-high text-risk-high bg-risk-high/10">CONSTRAINT INDICATOR</Badge>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">Govt Encroachment</p>
                              <p className="text-xs font-semibold">{selectedFeature.metadata_json?.Govt_Encr || 0}</p>
                            </div>
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">Pvt Encroachment</p>
                              <p className="text-xs font-semibold">{selectedFeature.metadata_json?.Pvt_Encr || 0}</p>
                            </div>
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">Religious Encroachment</p>
                              <p className="text-xs font-semibold">{selectedFeature.metadata_json?.Rel_Encr || 0}</p>
                            </div>
                            <div className="bg-muted/30 border border-border/50 p-2 rounded">
                              <p className="text-[9px] text-muted-foreground uppercase">Total Encroachment</p>
                              <p className="text-xs font-semibold text-risk-critical">{selectedFeature.metadata_json?.Total_Encr || 0}</p>
                            </div>
                            <div className="bg-muted/30 border border-border/50 p-2 rounded col-span-2">
                              <p className="text-[9px] text-muted-foreground uppercase">Court Case Status</p>
                              <p className="text-xs font-semibold">{selectedFeature.metadata_json?.Court_Case ? 'Active Case' : 'No Case'}</p>
                            </div>
                          </div>
                          <p className="text-[9px] text-muted-foreground italic">
                            Note: Encroachments act as drainage constraint indicators in the flood model, but do not directly compute physical flooding.
                          </p>
                        </div>
                      )}

                      <p className="text-[9px] text-muted-foreground italic mt-3">
                        Note: Physical hydraulic capacity and exact flow direction are omitted as they are not present in the base GIS dataset.
                      </p>
                    </div>
                  )}

                  {/* Interactive Graph Actions */}
                  {isNode(selectedFeature) && (
                    <div className="pt-2 border-t border-border">
                      <div className="flex justify-between items-center mb-3">
                          <p className="text-[10px] font-medium text-muted-foreground uppercase">Graph Traversal</p>
                          <Badge variant="secondary" className="text-[8px] uppercase bg-chart-blue/20 text-chart-blue">SIMULATION</Badge>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="w-full flex items-center justify-start gap-2"
                          onClick={() => handleTrace('upstream')}
                          disabled={isLoading}
                        >
                          <ArrowUp className="h-3.5 w-3.5 text-chart-blue" />
                          Trace Network Reach
                        </Button>
                        <Button 
                          variant="destructive" 
                          size="sm" 
                          className="w-full flex items-center justify-start gap-2"
                          onClick={handleSimulate}
                          disabled={isSimulating}
                        >
                          {isSimulating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Ban className="h-3.5 w-3.5" />}
                          Simulate Blockage / Failure
                        </Button>
                      </div>
                    </div>
                  )}

                </CardContent>
              </ScrollArea>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
