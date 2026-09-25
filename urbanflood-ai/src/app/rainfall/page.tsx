'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapView } from '@/components/map/map-view';
import { RainfallChart } from '@/components/charts/rainfall-chart';
import { MetricCard } from '@/components/dashboard/metric-card';
import { DemoBadge } from '@/components/shared/demo-badge';
import { EmptyState } from '@/components/shared/empty-state';
import { useCity } from '@/context/city-context';
import { hyderabadFloodZones } from '@/data/cities/hyderabad/flood-zones';
import { CloudRain, Droplets, MapPin, TrendingUp, Cloud, Leaf } from 'lucide-react';
import { RISK_COLORS, WeatherData, RainfallReading, RainfallForecastPoint } from '@/types';
import { fetchWeather } from '@/lib/services/weather';

export default function RainfallPage() {
  const { currentCity, isCityConfigured, isLoading: cityLoading } = useCity();
  const [weatherData, setWeatherData] = useState<WeatherData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadWeather() {
      if (currentCity?.id) {
        setIsLoading(true);
        const data = await fetchWeather(currentCity.id);
        setWeatherData(data);
        setIsLoading(false);
      }
    }
    if (isCityConfigured && currentCity) {
      loadWeather();
    }
  }, [currentCity, isCityConfigured]);


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
          description="Rainfall data is not available for this city."
        />
      </div>
    );
  }

  if (!weatherData) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState type="no-data" title="No weather data" description="No weather data available for this city." />
      </div>
    );
  }

  // Transform WeatherData to RainfallReading format for the chart
  const history: RainfallReading[] = weatherData.hourly.slice(0, 6).map(h => ({
    timestamp: h.timestamp,
    intensityMmHr: h.precipitation,
    accumulationMm: h.rain,
    source: 'gauge'
  }));

  const forecast: RainfallForecastPoint[] = [0, 30, 60, 90, 120, 180].map(offset => {
    // If we have minutely_15 data (every 15 min), find exact match
    let intensity = 0;
    if (weatherData.minutely_15 && weatherData.minutely_15.length > 0) {
      const targetTime = new Date(new Date(weatherData.current.timestamp).getTime() + offset * 60000).toISOString();
      const match = weatherData.minutely_15.find(m => m.timestamp.substring(0, 16) === targetTime.substring(0, 16));
      if (match) {
        intensity = match.precipitation * 4; // mm/15min to mm/hr
      } else {
        // fallback to hourly
        intensity = weatherData.hourly[0]?.precipitation || 0;
      }
    } else {
      intensity = weatherData.hourly[0]?.precipitation || 0;
    }

    return {
      offsetMinutes: offset,
      label: `+${offset}m`,
      intensityMmHr: Number(intensity.toFixed(2)),
      confidence: 85,
      isDemo: false
    };
  });

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Weather & Rainfall</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time conditions and short-term forecast for {currentCity?.name} via Open-Meteo
          </p>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard
          label="Current Precip"
          value={Number(weatherData.current.precipitation.toFixed(1))}
          unit="mm"
          icon={<CloudRain className="h-4 w-4 text-chart-blue" />}
          trend="up"
          trendLabel="Latest observation"
        />
        <MetricCard
          label="Current Rain"
          value={Number(weatherData.current.rain.toFixed(1))}
          unit="mm"
          icon={<Droplets className="h-4 w-4 text-chart-cyan" />}
        />
        <MetricCard
          label="Cloud Cover"
          value={weatherData.current.cloud_cover}
          unit="%"
          icon={<Cloud className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          label="Soil Moisture (0-1cm)"
          value={Number((weatherData.hourly[0]?.soil_moisture_0_to_1cm || 0).toFixed(3))}
          unit="m³/m³"
          icon={<Leaf className="h-4 w-4 text-risk-watch" />}
        />
      </div>

      {/* Charts + Map Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Rainfall Intensity Chart */}
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <CloudRain className="h-4 w-4 text-chart-blue" />
              Precipitation — Last 6 Hours
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <RainfallChart data={history} height={240} />
          </CardContent>
        </Card>

        {/* Rainfall Accumulation */}
        <Card>
          <CardHeader className="px-4 py-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Droplets className="h-4 w-4 text-chart-cyan" />
              Rainfall Accumulation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <RainfallChart data={history} height={240} showAccumulation />
          </CardContent>
        </Card>
      </div>

      {/* Forecast Timeline */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm flex items-center gap-2">
            Forecast Timeline
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="flex items-end gap-4 overflow-x-auto pb-2">
            {forecast.map((point) => (
              <div key={point.offsetMinutes} className="flex flex-col items-center gap-2 min-w-[80px]">
                <div className="text-xs text-muted-foreground">
                  Confidence: {point.confidence}%
                </div>
                <div
                  className="w-14 rounded-md flex items-end justify-center transition-all"
                  style={{
                    height: `${Math.max(20, (point.intensityMmHr / 100) * 140)}px`,
                    backgroundColor: point.intensityMmHr > 60
                      ? RISK_COLORS.critical + '40'
                      : point.intensityMmHr > 40
                        ? RISK_COLORS.high + '40'
                        : point.intensityMmHr > 20
                          ? RISK_COLORS.moderate + '40'
                          : RISK_COLORS.low + '40',
                    borderTop: `3px solid ${
                      point.intensityMmHr > 60
                        ? RISK_COLORS.critical
                        : point.intensityMmHr > 40
                          ? RISK_COLORS.high
                          : point.intensityMmHr > 20
                            ? RISK_COLORS.moderate
                            : RISK_COLORS.low
                    }`,
                  }}
                >
                  <span className="text-xs font-bold pb-1">{point.intensityMmHr}</span>
                </div>
                <span className="text-xs font-medium text-foreground">{point.label}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            Forecast powered by Open-Meteo. Uses 15-minute resolution where available.
          </p>
        </CardContent>
      </Card>

      {/* Map with Rainfall */}
      <Card>
        <CardHeader className="px-4 py-3">
          <CardTitle className="text-sm">Rainfall Distribution Map</CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          <div className="h-[400px] rounded-lg overflow-hidden border border-border">
            <MapView
              floodZones={currentCity?.id === 'hyderabad' ? hyderabadFloodZones : null}
              enabledLayers={{ 'flood-risk': true, rainfall: true }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
