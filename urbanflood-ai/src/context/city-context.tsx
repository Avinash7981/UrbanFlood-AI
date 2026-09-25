'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CityConfig } from '@/types';
import { getCity, listCities, getDefaultCity } from '@/data/cities';
import { fetchCities } from '@/lib/services';

interface CityContextType {
  currentCity: CityConfig | null;
  cities: CityConfig[];
  setCity: (id: string) => void;
  isCityConfigured: boolean;
  isLoading: boolean;
}

const CityContext = createContext<CityContextType | undefined>(undefined);

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [currentCity, setCurrentCity] = useState<CityConfig | null>(getDefaultCity());
  const [cities, setCities] = useState<CityConfig[]>(listCities());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await fetchCities();
        setCities(data);
        if (data.length > 0) {
          const defaultCity = data.find(c => c.id === 'india') || data[0];
          setCurrentCity(defaultCity);
        } else {
          setCurrentCity(null);
        }
      } catch (e) {
        console.error('Failed to fetch cities from API', e);
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  const setCity = (cityId: string) => {
    const city = cities.find((c) => c.id === cityId);
    if (city) {
      setCurrentCity(city);
    }
  };

  const isCityConfigured = currentCity ? (currentCity.status === 'active_pilot' || currentCity.status === 'configured') : false;

  return (
    <CityContext.Provider value={{ currentCity, cities, setCity, isCityConfigured, isLoading }}>
      {children}
    </CityContext.Provider>
  );
}

export function useCity(): CityContextType {
  const context = useContext(CityContext);
  if (!context) {
    throw new Error('useCity must be used within a CityProvider');
  }
  return context;
}
