import { NextResponse } from 'next/server';
import { fetchWeatherApi } from 'openmeteo';
import { getCity } from '@/data/cities';

export const revalidate = 900; // Cache for 15 minutes to avoid rate limits

export async function GET(
  request: Request,
  { params }: { params: Promise<{ city: string }> }
) {
  try {
    const { city } = await params;
    const cityConfig = getCity(city);
    
    if (!cityConfig) {
      return NextResponse.json({ error: 'City not found' }, { status: 404 });
    }

    const { center } = cityConfig;
    const lat = center[1];
    const lon = center[0];

    const paramsObj = {
      latitude: lat,
      longitude: lon,
      current: ["precipitation", "rain", "showers", "cloud_cover"],
      minutely_15: ["precipitation", "rain"],
      hourly: ["precipitation", "rain", "precipitation_probability", "showers", "cloud_cover", "surface_pressure", "soil_moisture_0_to_1cm", "soil_moisture_1_to_3cm"],
      daily: ["rain_sum", "showers_sum", "precipitation_sum", "precipitation_hours", "precipitation_probability_max"],
      timezone: "Asia/Kolkata",
      models: "best_match"
    };

    const url = "https://api.open-meteo.com/v1/forecast";
    const responses = await fetchWeatherApi(url, paramsObj);
    
    // Helper function to form time ranges
    const range = (start: number, stop: number, step: number) =>
      Array.from({ length: (stop - start) / step }, (_, i) => start + i * step);
    
    const response = responses[0];
    
    // Attributes for timezone and location
    const utcOffsetSeconds = response.utcOffsetSeconds();
    
    const current = response.current()!;
    const minutely15 = response.minutely15()!;
    const hourly = response.hourly()!;
    const daily = response.daily()!;
    
    const minutely15Times = range(Number(minutely15.time()), Number(minutely15.timeEnd()), minutely15.interval()).map(
      (t) => new Date((t + utcOffsetSeconds) * 1000).toISOString()
    );
    const hourlyTimes = range(Number(hourly.time()), Number(hourly.timeEnd()), hourly.interval()).map(
      (t) => new Date((t + utcOffsetSeconds) * 1000).toISOString()
    );
    const dailyTimes = range(Number(daily.time()), Number(daily.timeEnd()), daily.interval()).map(
      (t) => new Date((t + utcOffsetSeconds) * 1000).toISOString()
    );
    
    const weatherData = {
      location: {
        name: cityConfig.name,
        latitude: response.latitude(),
        longitude: response.longitude(),
        timezone: response.timezone(),
      },
      current: {
        timestamp: new Date((Number(current.time()) + utcOffsetSeconds) * 1000).toISOString(),
        precipitation: current.variables(0)!.value(),
        rain: current.variables(1)!.value(),
        showers: current.variables(2)!.value(),
        cloud_cover: current.variables(3)!.value(),
      },
      minutely_15: minutely15Times.map((time, i) => ({
        timestamp: time,
        precipitation: minutely15.variables(0)!.valuesArray()![i],
        rain: minutely15.variables(1)!.valuesArray()![i],
      })),
      hourly: hourlyTimes.map((time, i) => ({
        timestamp: time,
        precipitation: hourly.variables(0)!.valuesArray()![i],
        rain: hourly.variables(1)!.valuesArray()![i],
        precipitation_probability: hourly.variables(2)!.valuesArray()![i],
        showers: hourly.variables(3)!.valuesArray()![i],
        cloud_cover: hourly.variables(4)!.valuesArray()![i],
        surface_pressure: hourly.variables(5)!.valuesArray()![i],
        soil_moisture_0_to_1cm: hourly.variables(6)!.valuesArray()![i],
        soil_moisture_1_to_3cm: hourly.variables(7)!.valuesArray()![i],
      })),
      daily: dailyTimes.map((time, i) => ({
        timestamp: time,
        rain_sum: daily.variables(0)!.valuesArray()![i],
        showers_sum: daily.variables(1)!.valuesArray()![i],
        precipitation_sum: daily.variables(2)!.valuesArray()![i],
        precipitation_hours: daily.variables(3)!.valuesArray()![i],
        precipitation_probability_max: daily.variables(4)!.valuesArray()![i],
      })),
    };

    return NextResponse.json(weatherData);
    
  } catch (error) {
    console.error('Weather API Error:', error);
    // Return graceful fallback data so the app doesn't crash if Open-Meteo fails
    return NextResponse.json({
      location: { name: 'Unknown', latitude: 0, longitude: 0, timezone: 'Asia/Kolkata' },
      current: { timestamp: new Date().toISOString(), precipitation: 0, rain: 0, showers: 0, cloud_cover: 0 },
      minutely_15: [],
      hourly: [],
      daily: [],
      is_mock: true,
      error: 'Weather service temporarily unavailable'
    });
  }
}
