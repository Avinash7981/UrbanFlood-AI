'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Layers, Droplets, Waves, GitBranch, Map, Building, Mountain, Trees, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MapLayerConfig {
  id: string;
  label: string;
  icon: React.ReactNode;
  category: 'analytical' | 'base';
  unavailable?: boolean;
}

const layerConfigs: MapLayerConfig[] = [
  { id: 'flood-risk', label: 'Flood Risk', icon: <Waves className="h-3.5 w-3.5 text-risk-critical" />, category: 'analytical' },
  { id: 'drainage', label: 'Drainage', icon: <GitBranch className="h-3.5 w-3.5 text-chart-cyan" />, category: 'analytical' },
  { id: 'water-bodies', label: 'Water Bodies', icon: <Waves className="h-3.5 w-3.5 text-blue-400" />, category: 'analytical' },
  { id: 'terrain', label: 'Terrain', icon: <Mountain className="h-3.5 w-3.5 text-muted-foreground" />, category: 'analytical' },
];

interface MapLayerControlProps {
  enabledLayers: Record<string, boolean>;
  onToggle: (layerId: string) => void;
}

export function MapLayerControl({ enabledLayers, onToggle }: MapLayerControlProps) {
  const analyticalLayers = layerConfigs.filter((l) => l.category === 'analytical');
  const baseLayers = layerConfigs.filter((l) => l.category === 'base');

  return (
    <Card className="bg-card/95 backdrop-blur-sm border-border w-52">
      <CardHeader className="px-3 py-2">
        <CardTitle className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          <Layers className="h-3.5 w-3.5" />
          Map Layers
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 pt-0 space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Analytical</p>
          {analyticalLayers.map((layer) => (
            <label
              key={layer.id}
              className={cn(
                "flex items-center gap-2 rounded-sm px-1.5 py-1 text-xs transition-colors",
                layer.unavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"
              )}
            >
              <Checkbox
                checked={enabledLayers[layer.id] ?? false}
                onCheckedChange={() => !layer.unavailable && onToggle(layer.id)}
                disabled={layer.unavailable}
                className="h-3.5 w-3.5"
              />
              {layer.icon}
              <span className="text-foreground flex-1">{layer.label}</span>
              {layer.unavailable && <span className="text-[9px] text-muted-foreground">(Unavailable)</span>}
            </label>
          ))}
        </div>
        <div className="space-y-1">
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">Base</p>
          {baseLayers.map((layer) => (
            <label
              key={layer.id}
              className={cn(
                "flex items-center gap-2 rounded-sm px-1.5 py-1 text-xs transition-colors",
                layer.unavailable ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-accent"
              )}
            >
              <Checkbox
                checked={enabledLayers[layer.id] ?? false}
                onCheckedChange={() => !layer.unavailable && onToggle(layer.id)}
                disabled={layer.unavailable}
                className="h-3.5 w-3.5"
              />
              {layer.icon}
              <span className="text-foreground flex-1">{layer.label}</span>
              {layer.unavailable && <span className="text-[9px] text-muted-foreground">(Unavailable)</span>}
            </label>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
