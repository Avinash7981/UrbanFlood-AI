'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useCity } from './city-context';
import { NowcastZone, WeatherData, FloodAlert, CriticalInfrastructureCollection, InfrastructureExposure, GeoJSONFeatureCollection } from '@/types';
import { fetchWeather } from '@/lib/services/weather';
import { generateAlertsFromNowcast } from '@/lib/services/alert-engine';
import { calculateInfrastructureExposure } from '@/lib/services/infrastructure-exposure';

import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { hyderabadDrainage } from '@/data/cities/hyderabad/drainage';
import { hyderabadNowcast } from '@/data/cities/hyderabad/nowcast';

interface RiskContextType {
  weatherData: WeatherData | null;
  adjustedZones: NowcastZone[] | null;
  alerts: FloodAlert[];
  activeAlerts: FloodAlert[];
  exposure: InfrastructureExposure[] | null;
  infrastructure: CriticalInfrastructureCollection | null;
  waterBodies: GeoJSONFeatureCollection | null;
  isLoadingRisk: boolean;
}

const RiskContext = createContext<RiskContextType | undefined>(undefined);

export function RiskProvider({ children }: { children: React.ReactNode }) {
  const { currentCity, isCityConfigured } = useCity();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [waterBodies, setWaterBodies] = useState<GeoJSONFeatureCollection | null>(null);
  const [infrastructure, setInfrastructure] = useState<CriticalInfrastructureCollection | null>(null);
  
  const [adjustedZones, setAdjustedZones] = useState<NowcastZone[] | null>(null);
  const [exposure, setExposure] = useState<InfrastructureExposure[] | null>(null);
  const [alerts, setAlerts] = useState<FloodAlert[]>([]);
  
  const [isLoadingRisk, setIsLoadingRisk] = useState(true);

  // 1. Fetch raw underlying data (Weather, Water bodies, Infra)
  useEffect(() => {
    let active = true;
    async function loadBaseData() {
      if (!currentCity?.id || !isCityConfigured) {
        setIsLoadingRisk(false);
        return;
      }

      setIsLoadingRisk(true);
      
      try {
        const wData = await fetchWeather(currentCity.id);
        if (!active) return;
        setWeatherData(wData);

        const wbRes = await fetch(`/api/v1/cities/${currentCity.id}/waterbodies`).catch(() => null);
        let wb = null;
        if (wbRes?.ok) {
          wb = await wbRes.json();
        }
        if (active) setWaterBodies(wb);

        const infraRes = await fetch(`/api/v1/cities/${currentCity.id}/infrastructure`).catch(() => null);
        let infra = null;
        if (infraRes?.ok) {
          infra = await infraRes.json();
        } else if (currentCity.id === 'hyderabad') {
          const { hyderabadInfrastructure } = await import('@/data/cities/hyderabad/infrastructure');
          infra = hyderabadInfrastructure;
        }
        if (active) setInfrastructure(infra);
      } catch (e) {
        console.error('Error loading base risk data:', e);
      }
    }
    
    loadBaseData();
    return () => { active = false; };
  }, [currentCity, isCityConfigured]);

  // 2. Compute the risk and generate alerts
  useEffect(() => {
    let active = true;
    async function computeRisk() {
      if (currentCity?.id === 'hyderabad' && weatherData) {
        try {
          const { calculateAdjustedFloodRisk } = await import('@/lib/services/risk-engine');
          
          const zones = await calculateAdjustedFloodRisk(
            hyderabadNowcast.zones,
            weatherData,
            hyderabadDrainage,
            (waterBodies as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.features || [],
            null,
            hyderabadFloodZones.features,
            currentCity.id
          );
          
          if (!active) return;
          
          setAdjustedZones(zones);
          
          const generatedAlerts = generateAlertsFromNowcast(zones);
          setAlerts(generatedAlerts);
          
          if (infrastructure && infrastructure.features) {
            const exp = calculateInfrastructureExposure(
              infrastructure.features.map(f => f.properties), 
              hyderabadFloodZones.features, 
              zones, 
              generatedAlerts
            );
            setExposure(exp);
          } else {
            setExposure([]);
          }
          
          setIsLoadingRisk(false);
        } catch (e) {
          console.error("Failed to compute flood risk:", e);
          if (active) setIsLoadingRisk(false);
        }
      } else {
        if (active) setIsLoadingRisk(false);
      }
    }
    
    if (weatherData) {
       computeRisk();
    }
    
    return () => { active = false; };
  }, [weatherData, waterBodies, infrastructure, currentCity]);

  const activeAlerts = alerts.filter(a => a.status === 'active');

  return (
    <RiskContext.Provider value={{ 
      weatherData, 
      adjustedZones, 
      alerts, 
      activeAlerts, 
      exposure, 
      infrastructure, 
      waterBodies, 
      isLoadingRisk 
    }}>
      {children}
    </RiskContext.Provider>
  );
}

export function useRisk() {
  const context = useContext(RiskContext);
  if (context === undefined) {
    throw new Error('useRisk must be used within a RiskProvider');
  }
  return context;
}
