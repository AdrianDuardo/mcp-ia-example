/**
 * SERVICIO DEL CLIMA - TUTORIAL MCP
 * 
 * Este servicio demuestra cómo MCP puede integrar APIs externas.
 * Usa OpenWeatherMap API para obtener información meteorológica.
 * 
 * 🌤️ FUNCIONALIDADES:
 * - Clima actual por ciudad
 * - Manejo de errores de API
 * - Cache simple para evitar llamadas excesivas
 * - Validación de datos
 */

import axios from 'axios';

export interface WeatherData {
  ciudad: string;
  pais: string;
  temperatura: number;
  sensacionTermica: number;
  descripcion: string;
  humedad: number;
  velocidadViento: number;
  presion: number;
  visibilidad: number;
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
    this.cacheTimeout = 10 * 60 * 1000; // 10 minutos

    // Si no hay API key, usar datos de ejemplo
    if (!this.apiKey) {
      console.error("⚠️ No se encontró OPENWEATHER_API_KEY. Usando datos de ejemplo.");
    }
  }

  /**
   * Obtiene el clima actual de una ciudad
   */
  async getCurrentWeather(ciudad: string, pais?: string): Promise<WeatherData> {
    const cacheKey = `${ciudad}-${pais || 'default'}`.toLowerCase();

    // Verificar cache
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.error(`📊 Clima obtenido del cache para ${ciudad}`);
      return cached.data;
    }

    // Si no hay API key, retornar datos de ejemplo
    if (!this.apiKey) {
      return this.generateMockWeatherData(ciudad, pais);
    }

    try {
      const query = pais ? `${ciudad},${pais}` : ciudad;

      const response = await axios.get(`${this.baseUrl}/weather`, {
        params: {
          q: query,
          appid: this.apiKey,
          units: 'metric', // Celsius
          lang: 'es' // Español
        },
        timeout: 5000 // 5 segundos timeout
      });

      const data = response.data;

      const weatherData: WeatherData = {
        ciudad: data.name,
        pais: data.sys.country,
        temperatura: Math.round(data.main.temp),
        sensacionTermica: Math.round(data.main.feels_like),
        descripcion: data.weather[0].description,
        humedad: data.main.humidity,
        velocidadViento: data.wind.speed,
        presion: data.main.pressure,
        visibilidad: data.visibility ? Math.round(data.visibility / 1000) : 0
      };

      // Guardar en cache
      this.cache.set(cacheKey, {
        data: weatherData,
        timestamp: Date.now()
      });

      console.error(`🌤️ Clima obtenido de API para ${ciudad}`);
      return weatherData;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 404) {
          throw new Error(`Ciudad no encontrada: ${ciudad}`);
        } else if (error.response?.status === 401) {
          throw new Error("API key de OpenWeather inválida o expirada");
        } else if (error.code === 'ECONNABORTED') {
          throw new Error("Timeout: El servicio del clima no responde");
        } else {
          throw new Error(`Error del servicio del clima: ${error.response?.data?.message || error.message}`);
        }
      }

      throw new Error(`Error obteniendo clima: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Genera datos de ejemplo cuando no hay API key disponible
   */
  private generateMockWeatherData(ciudad: string, pais?: string): WeatherData {
    // Datos de ejemplo para diferentes ciudades
    const mockData: { [key: string]: Partial<WeatherData> } = {
      'madrid': {
        temperatura: 22,
        sensacionTermica: 24,
        descripcion: 'soleado',
        humedad: 45,
        velocidadViento: 3.2
      },
      'barcelona': {
        temperatura: 25,
        sensacionTermica: 26,
        descripcion: 'parcialmente nublado',
        humedad: 55,
        velocidadViento: 4.1
      },
      'valencia': {
        temperatura: 24,
        sensacionTermica: 25,
        descripcion: 'despejado',
        humedad: 50,
        velocidadViento: 2.8
      },
      'new york': {
        temperatura: 18,
        sensacionTermica: 16,
        descripcion: 'lluvia ligera',
        humedad: 78,
        velocidadViento: 5.5
      },
      'london': {
        temperatura: 15,
        sensacionTermica: 13,
        descripcion: 'nublado',
        humedad: 82,
        velocidadViento: 6.2
      }
    };

    const cityKey = ciudad.toLowerCase();
    const baseData = mockData[cityKey] || {
      temperatura: Math.floor(Math.random() * 30) + 5,
      sensacionTermica: Math.floor(Math.random() * 30) + 5,
      descripcion: 'clima variable',
      humedad: Math.floor(Math.random() * 50) + 30,
      velocidadViento: Math.random() * 10 + 1
    };

    return {
      ciudad: ciudad.charAt(0).toUpperCase() + ciudad.slice(1),
      pais: pais || 'N/A',
      temperatura: baseData.temperatura || 20,
      sensacionTermica: baseData.sensacionTermica || 21,
      descripcion: baseData.descripcion || 'soleado',
      humedad: baseData.humedad || 50,
      velocidadViento: Math.round((baseData.velocidadViento || 3) * 10) / 10,
      presion: 1013,
      visibilidad: 10
    };
  }

  /**
   * Compara el clima entre múltiples ciudades
   */
  async compareWeather(ciudades: string[]): Promise<WeatherData[]> {
    if (ciudades.length === 0) {
      throw new Error("Se debe proporcionar al menos una ciudad");
    }

    if (ciudades.length > 5) {
      throw new Error("Máximo 5 ciudades por comparación");
    }

    const results: WeatherData[] = [];
    const errors: string[] = [];

    for (const ciudad of ciudades) {
      try {
        const weather = await this.getCurrentWeather(ciudad);
        results.push(weather);
      } catch (error) {
        errors.push(`${ciudad}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
      }
    }

    if (results.length === 0) {
      throw new Error(`No se pudo obtener clima para ninguna ciudad. Errores: ${errors.join(', ')}`);
    }

    if (errors.length > 0) {
      console.error(`⚠️ Errores obteniendo clima: ${errors.join(', ')}`);
    }

    return results;
  }

  /**
   * Limpia el cache (útil para testing)
   */
  clearCache(): void {
    this.cache.clear();
    console.error("🧹 Cache del clima limpiado");
  }

  /**
   * Obtiene estadísticas del cache
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
