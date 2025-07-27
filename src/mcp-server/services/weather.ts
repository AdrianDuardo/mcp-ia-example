/**
 * WEATHER SERVICE - MCP TUTORIAL
 * 
 * This service demonstrates how MCP can integrate external APIs.
 * Uses OpenWeatherMap API to get weather information.
 * 
 * 🌤️ FEATURES:
 * - Current weather by city
 * - API error handling
 * - Simple cache to avoid excessive calls
 * - Data validation
 */

import axios from 'axios';

export interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;
  pressure: number;
  visibility: number;
}

export class WeatherService {
  private apiKey: string;
  private baseUrl: string;
  private cache: Map<string, { data: WeatherData; timestamp: number }>;
  private cacheTimeout: number;

  constructor() {
    this.apiKey = process.env.OPENWEATHER_API_KEY || '';
    this.baseUrl = 'https://api.openweathermap.org/data/2.5';
    this.cache = new Map();
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutes

    // If no API key, use example data
    if (!this.apiKey) {
      console.error("⚠️ OPENWEATHER_API_KEY not found. Using example data.");
    }
  }

  /**
   * Gets current weather for a city
   */
  async getCurrentWeather(city: string, country?: string): Promise<WeatherData> {
    const cacheKey = `${city}-${country || 'default'}`.toLowerCase();

    // Check cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.error(`📊 Weather obtained from cache for ${city}`);
      return cached.data;
    }

    // If no API key, return example data
    if (!this.apiKey) {
      return this.generateMockWeatherData(city, country);
    }

    try {
      const query = country ? `${city},${country}` : city;

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: query,
          appid: this.apiKey,
          units: 'metric', // Celsius
          lang: 'en' // English
        },
        timeout: 5000 // 5 seconds timeout
      });

      const data = response.data;

      const weatherData: WeatherData = {
        city: data.name,
        country: data.sys.country,
        temperature: Math.round(data.main.temp),
        feelsLike: Math.round(data.main.feels_like),
        description: data.weather[0].description,
        humidity: data.main.humidity,
        windSpeed: data.wind.speed,
        pressure: data.main.pressure,
        visibility: data.visibility ? Math.round(data.visibility / 1000) : 0
      };

      // Save to cache
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      console.error(`🌤️ Weather obtained from API for ${city}`);
      return weatherData;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`City not found: ${city}`);
        } else if (error.response?.status === 401) {
          throw new Error("OpenWeather API key invalid or expired");
        } else if (error.code === 'ECONNABORTED') {
          throw new Error("Timeout: Weather service not responding");
        } else {
          throw new Error(`Weather service error: ${error.response?.data?.message || error.message}`);
        }
      }

      throw new Error(`Error getting weather: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generates example data when no API key available
   */
  private generateMockWeatherData(city: string, country?: string): WeatherData {
    // Example data for different cities
    const mockData: { [key: string]: Partial<WeatherData> } = {
      'madrid': {
        temperature: 22,
        feelsLike: 24,
        description: 'sunny',
        humidity: 45,
        windSpeed: 3.2
      },
      'barcelona': {
        temperature: 25,
        feelsLike: 26,
        description: 'partly cloudy',
        humidity: 55,
        windSpeed: 4.1
      },
      'valencia': {
        temperature: 24,
        feelsLike: 25,
        description: 'clear',
        humidity: 50,
        windSpeed: 2.8
      },
      'new york': {
        temperature: 18,
        feelsLike: 16,
        description: 'light rain',
        humidity: 78,
        windSpeed: 5.5
      },
      'london': {
        temperature: 15,
        feelsLike: 13,
        description: 'cloudy',
        humidity: 82,
        windSpeed: 6.2
      }
    };

    const cityKey = city.toLowerCase();
    const baseData = mockData[cityKey] || {
      temperature: Math.floor(Math.random() * 30) + 5,
      feelsLike: Math.floor(Math.random() * 30) + 5,
      description: 'variable weather',
      humidity: Math.floor(Math.random() * 50) + 30,
      windSpeed: Math.random() * 10 + 1
    };

    return {
      city: city.charAt(0).toUpperCase() + city.slice(1),
      country: country || 'N/A',
      temperature: baseData.temperature || 20,
      feelsLike: baseData.feelsLike || 21,
      description: baseData.description || 'sunny',
      humidity: baseData.humidity || 50,
      windSpeed: Math.round((baseData.windSpeed || 3) * 10) / 10,
      pressure: 1013,
      visibility: 10
    };
  }

  /**
   * Compares weather between multiple cities
   */
  async compareWeather(cities: string[]): Promise<WeatherData[]> {
    if (cities.length === 0) {
      throw new Error("At least one city must be provided");
    }

    if (cities.length > 5) {
      throw new Error("Maximum 5 cities per comparison");
    }

    const results: WeatherData[] = [];
    const errors: string[] = [];

    for (const city of cities) {
      try {
        const weather = await this.getCurrentWeather(city);
        results.push(weather);
      } catch (error) {
        errors.push(`${city}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    if (results.length === 0) {
      throw new Error(`Could not get weather for any city. Errors: ${errors.join(', ')}`);
    }

    if (errors.length > 0) {
      console.error(`⚠️ Errors getting weather: ${errors.join(', ')}`);
    }

    return results;
  }

  /**
   * Clears cache (useful for testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.error("🧹 Weather cache cleared");
  }

  /**
   * Gets cache statistics
   */
  getCacheStats(): { entries: number; oldestEntry: number; newestEntry: number } {
    if (this.cache.size === 0) {
      return { entries: 0, oldestEntry: 0, newestEntry: 0 };
    }

    const timestamps = Array.from(this.cache.values()).map(entry => entry.timestamp);

    return {
      entries: this.cache.size,
      oldestEntry: Math.min(...timestamps),
      newestEntry: Math.max(...timestamps)
    };
  }
}
