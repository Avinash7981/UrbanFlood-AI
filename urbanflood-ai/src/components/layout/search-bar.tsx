'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, MapPin, Droplets } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { hyderabadDrainage } from '@/data/cities/hyderabad/drainage';
import * as turf from '@turf/turf';

export function SearchBar() {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }
    const q = query.toLowerCase();
    
    // Search Zones
    const matchedZones = hyderabadFloodZones.features
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((f: any) => f.properties.name?.toLowerCase().includes(q) || f.properties.zoneName?.toLowerCase().includes(q) || f.properties.id?.toLowerCase().includes(q))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => ({
        type: 'zone',
        id: f.properties.id,
        name: f.properties.name || f.properties.zoneName || f.properties.id,
        feature: f
      }));
      
    // Search Nalas (assuming they have nala_name or id)
    const matchedNalas = hyderabadDrainage.features
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((f: any) => f.properties.nala_name?.toLowerCase().includes(q) || f.properties.name?.toLowerCase().includes(q) || f.properties.id?.toLowerCase().includes(q))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((f: any) => ({
        type: 'drainage',
        id: f.properties.id,
        name: f.properties.nala_name || f.properties.name || f.properties.id,
        feature: f
      }));

    return [...matchedZones, ...matchedNalas].slice(0, 5);
  }, [query]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleSelect = (item: any) => {
    setIsOpen(false);
    setQuery('');
    
    try {
      const centroid = turf.centroid(item.feature as any /* eslint-disable-line @typescript-eslint/no-explicit-any */);
      const [lng, lat] = centroid.geometry.coordinates;
      // We dispatch a custom event that MapView will listen for
      window.dispatchEvent(new CustomEvent('map-fly-to', { detail: { lat, lng, zoom: 15 } }));
      
      // Also navigate to dashboard if not already there
      if (window.location.pathname !== '/dashboard') {
        router.push('/dashboard');
      }
    } catch (e) {
      console.error("Failed to compute centroid for search result", e);
    }
  };

  return (
    <div className="relative w-64" ref={wrapperRef}>
      <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <input
        type="text"
        placeholder="Search locations, zones..."
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="h-8 w-full rounded-md border border-input bg-muted/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
      />
      {isOpen && query.trim() !== '' && (
        <div className="absolute top-10 left-0 w-full bg-card border border-border rounded-md shadow-lg z-50 overflow-hidden">
          {results.length > 0 ? (
            <ul className="py-1 max-h-60 overflow-auto">
              {results.map((item, i) => (
                <li 
                  key={i} 
                  className="px-3 py-2 text-sm hover:bg-muted cursor-pointer flex items-center gap-2"
                  onClick={() => handleSelect(item)}
                >
                  {item.type === 'zone' ? <MapPin className="h-3.5 w-3.5 text-chart-blue" /> : <Droplets className="h-3.5 w-3.5 text-chart-cyan" />}
                  <span className="truncate">{item.name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="px-3 py-3 text-sm text-muted-foreground text-center">
              No matching location or zone found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
