'use client';

import React from 'react';
import { Bell, Search, Radio, ChevronDown, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useCity } from '@/context/city-context';
import { CitySelector } from '@/components/shared/city-selector';
import { SearchBar } from '@/components/layout/search-bar';
import { useRisk } from '@/context/risk-context';
import Link from 'next/link';

export function Header() {
  const { currentCity } = useCity();
  const { activeAlerts } = useRisk();
  const [citySelectorOpen, setCitySelectorOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [timeStr, setTimeStr] = React.useState('--:--');

  React.useEffect(() => {
    // eslint-disable-next-line
    setMounted(true);
    setTimeStr(new Date().toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    }));
  }, []);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur-sm">
        {/* Left: City selector */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCitySelectorOpen(true)}
            className="gap-2 text-sm"
            disabled={!currentCity}
          >
            <MapPin className="h-3.5 w-3.5" />
            <span className="font-medium">{currentCity?.name ?? 'Loading...'}</span>
            <span className="text-muted-foreground">{currentCity?.state ?? ''}</span>
            <ChevronDown className="h-3 w-3 text-muted-foreground" />
          </Button>
          {currentCity?.status === 'active_pilot' && (
            <Badge variant="outline" className="border-primary/30 bg-primary/10 text-primary text-[10px]">
              Active Pilot
            </Badge>
          )}
        </div>

        {/* Center: Search */}
        <div className="hidden md:flex items-center">
          <SearchBar />
        </div>

        {/* Right: Status + Notifications */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
            <Radio className="h-3 w-3 text-risk-low animate-pulse" />
            <span>System Online</span>
          </div>
          <div className="hidden sm:block text-xs text-muted-foreground min-w-[100px] text-right">
            {mounted ? `Updated ${timeStr}` : 'Updating...'}
          </div>
          <Link href="/alerts">
            <Button variant="ghost" size="icon" className="relative h-8 w-8">
              <Bell className="h-4 w-4" />
              {activeAlerts.length > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-risk-critical text-[9px] font-bold text-white">
                  {activeAlerts.length}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </header>

      <CitySelector open={citySelectorOpen} onOpenChange={setCitySelectorOpen} />
    </>
  );
}
