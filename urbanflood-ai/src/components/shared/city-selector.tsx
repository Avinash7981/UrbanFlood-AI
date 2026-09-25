'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { MapPin, Check, X } from 'lucide-react';
import { useCity } from '@/context/city-context';
import { cn } from '@/lib/utils';

interface CitySelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CitySelector({ open, onOpenChange }: CitySelectorProps) {
  const { currentCity, cities, setCity } = useCity();

  const handleSelect = (cityId: string) => {
    setCity(cityId);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Select City
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-1 py-2">
          {cities.map((city) => {
            const isActive = currentCity ? city.id === currentCity.id : false;
            const isConfigured = city.status === 'active_pilot' || city.status === 'configured';

            return (
              <button
                key={city.id}
                onClick={() => handleSelect(city.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-sm transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'hover:bg-accent text-foreground'
                )}
              >
                <div
                  className={cn(
                    'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border',
                    isConfigured
                      ? 'border-primary/30 bg-primary/10'
                      : 'border-border bg-muted'
                  )}
                >
                  {isConfigured ? (
                    <Check className="h-3.5 w-3.5 text-primary" />
                  ) : (
                    <X className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{city.name}</div>
                  <div className="text-xs text-muted-foreground">{city.state}</div>
                </div>
                <div className="shrink-0">
                  {city.status === 'active_pilot' && (
                    <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
                      Active Pilot
                    </Badge>
                  )}
                  {city.status === 'not_configured' && (
                    <span className="text-[10px] text-muted-foreground">Not configured</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
        <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          Cities marked as &quot;Not configured&quot; require data setup before analysis is available.
          The platform architecture supports adding any Indian city through configuration.
        </div>
      </DialogContent>
    </Dialog>
  );
}
