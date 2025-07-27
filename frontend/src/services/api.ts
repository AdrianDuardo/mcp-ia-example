/**
 * SERVICIO DE API - FRONTEND
 * 
 * Este servicio maneja toda la comunicación HTTP con el backend.
 * Proporciona métodos para chat, MCP y estadísticas.
 */

import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import type {
  ApiResponse,
  ChatRequest,
  ChatResponse,
  MCPTool,
  MCPResource,
  MCPPrompt,
  ServerStats,
  ApiConfig
} from '../types';

class ApiService {
  private api: AxiosInstance;
  private config: ApiConfig;

  constructor() {
    this.config = {
      baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001',
      timeout: 30000, // 30 segundos
      retries: 3
    };

    // Configurar axios
    this.api = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Configurar interceptors
    this.setupInterceptors();
  }

  /**
   * Configura los interceptors para el manejo de errores y logs
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Error en request:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`✅ ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        console.error('❌ Error en response:', error);

        // Si es un error de red, intentar retry
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          return this.retryRequest(() => this.api.request(error.config));
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Reintenta una petición fallida
   */
  private async retryRequest<T>(originalRequest: () => Promise<T>, retryCount = 0): Promise<T> {
    if (retryCount >= this.config.retries) {
      throw new Error('Máximo número de reintentos alcanzado');
    }

    console.log(`🔄 Reintentando petición (${retryCount + 1}/${this.config.retries})...`);

    // Esperar antes de reintentar
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

    try {
      return await originalRequest();
    } catch {
      return this.retryRequest(originalRequest, retryCount + 1);
    }
  }

  // ===============================
  // MÉTODOS DE CHAT
  // ===============================

  /**
   * Envía un mensaje al chat
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.api.post<ApiResponse<ChatResponse>>('/api/chat', request);
      if (!response.data.data) {
        throw new Error('No se recibió respuesta del servidor');
      }
      return response.data.data;
    } catch (error) {
      console.error('Error enviando mensaje:', error);
      throw error;
    }
  }

  /**
   * Obtiene el historial de mensajes
   */
  async getMessages(): Promise<ChatResponse[]> {
    try {
      const response = await this.api.get<ApiResponse<ChatResponse[]>>('/api/chat/messages');
      return response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo mensajes:', error);
      throw error;
    }
  }

  /**
   * Limpia el historial de chat
   */
  async clearMessages(): Promise<void> {
    try {
      await this.api.delete('/api/chat/messages');
    } catch (error) {
      console.error('Error limpiando mensajes:', error);
      throw error;
    }
  }

  // ===============================
  // MÉTODOS DE MCP
  // ===============================

  /**
   * Obtiene la lista de herramientas MCP disponibles
   */
  async getMCPTools(): Promise<MCPTool[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPTool[]>>('/api/mcp/tools');
      return response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo herramientas MCP:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de recursos MCP disponibles
   */
  async getMCPResources(): Promise<MCPResource[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPResource[]>>('/api/mcp/resources');
      return response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo recursos MCP:', error);
      throw error;
    }
  }

  /**
   * Obtiene la lista de prompts MCP disponibles
   */
  async getMCPPrompts(): Promise<MCPPrompt[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPPrompt[]>>('/api/mcp/prompts');
      return response.data.data || [];
    } catch (error) {
      console.error('Error obteniendo prompts MCP:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una herramienta MCP específica
   */
  async callMCPTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.api.post(`/api/mcp/tools/${toolName}`, { args });
      return response.data;
    } catch (error) {
      console.error(`Error ejecutando herramienta ${toolName}:`, error);
      throw error;
    }
  }

  // ===============================
  // MÉTODOS DE ESTADÍSTICAS
  // ===============================

  /**
   * Obtiene estadísticas del servidor
   */
  async getServerStats(): Promise<ServerStats> {
    try {
      const response = await this.api.get<ApiResponse<ServerStats>>('/api/stats');
      return response.data.data || {
        uptime: 0,
        totalConversations: 0,
        totalMessages: 0,
        mcpToolCalls: 0,
        averageResponseTime: 0,
        activeConnections: 0
      };
    } catch (error) {
      console.error('Error obteniendo estadísticas:', error);
      throw error;
    }
  }

  // ===============================
  // MÉTODOS AUXILIARES
  // ===============================

  /**
   * Verifica la salud del servidor
   */
  async checkHealth(): Promise<boolean> {
    try {
      await this.api.get('/api/health');
      return true;
    } catch {
      return false;
    }
  }
}

// Exportar instancia singleton
export const apiService = new ApiService();
export default apiService;
