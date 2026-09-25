import { WeatherData } from '@/types';

export async function fetchWeather(cityId: string): Promise<WeatherData | null> {
  try {
    const response = await fetch(`/api/weather/${cityId}`);
    if (!response.ok) {
      console.error('Failed to fetch weather data:', response.statusText);
      return null;
    }
    const data: WeatherData = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching weather data:', error);
    return null;
  }
}
