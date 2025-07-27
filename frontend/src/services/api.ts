/**
 * API SERVICE - FRONTEND
 * 
 * This service handles all HTTP communication with the backend.
 * Provides methods for chat, MCP and statistics.
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
      timeout: 30000, // 30 seconds
      retries: 3
    };

    // Configure axios
    this.api = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Setup interceptors
    this.setupInterceptors();
  }

  /**
   * Sets up interceptors for error handling and logging
   */
  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('❌ Request error:', error);
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
        console.error('❌ Response error:', error);

        // If it's a network error, try retry
        if (error.code === 'NETWORK_ERROR' || error.code === 'ECONNABORTED') {
          return this.retryRequest(() => this.api.request(error.config));
        }

        return Promise.reject(error);
      }
    );
  }

  /**
   * Retries a failed request
   */
  private async retryRequest<T>(originalRequest: () => Promise<T>, retryCount = 0): Promise<T> {
    if (retryCount >= this.config.retries) {
      throw new Error('Maximum number of retries reached');
    }

    console.log(`🔄 Retrying request (${retryCount + 1}/${this.config.retries})...`);

    // Wait before retrying
    await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));

    try {
      return await originalRequest();
    } catch {
      return this.retryRequest(originalRequest, retryCount + 1);
    }
  }

  // ===============================
  // CHAT METHODS
  // ===============================

  /**
   * Sends a message to chat
   */
  async sendMessage(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await this.api.post<ApiResponse<ChatResponse>>('/api/chat', request);
      if (!response.data.data) {
        throw new Error('No response received from server');
      }
      return response.data.data;
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Gets message history
   */
  async getMessages(): Promise<ChatResponse[]> {
    try {
      const response = await this.api.get<ApiResponse<ChatResponse[]>>('/api/chat/messages');
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting messages:', error);
      throw error;
    }
  }

  /**
   * Clears chat history
   */
  async clearMessages(): Promise<void> {
    try {
      await this.api.delete('/api/chat/messages');
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }

  // ===============================
  // MCP METHODS
  // ===============================

  /**
   * Gets the list of available MCP tools
   */
  async getMCPTools(): Promise<MCPTool[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPTool[]>>('/api/mcp/tools');
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting MCP tools:', error);
      throw error;
    }
  }

  /**
   * Gets the list of available MCP resources
   */
  async getMCPResources(): Promise<MCPResource[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPResource[]>>('/api/mcp/resources');
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting MCP resources:', error);
      throw error;
    }
  }

  /**
   * Gets the list of available MCP prompts
   */
  async getMCPPrompts(): Promise<MCPPrompt[]> {
    try {
      const response = await this.api.get<ApiResponse<MCPPrompt[]>>('/api/mcp/prompts');
      return response.data.data || [];
    } catch (error) {
      console.error('Error getting MCP prompts:', error);
      throw error;
    }
  }

  /**
   * Executes a specific MCP tool
   */
  async callMCPTool(toolName: string, args: Record<string, unknown>): Promise<unknown> {
    try {
      const response = await this.api.post(`/api/mcp/tools/${toolName}`, { args });
      return response.data;
    } catch (error) {
      console.error(`Error executing tool ${toolName}:`, error);
      throw error;
    }
  }

  // ===============================
  // STATISTICS METHODS
  // ===============================

  /**
   * Gets server statistics
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
      console.error('Error getting statistics:', error);
      throw error;
    }
  }

  // ===============================
  // HELPER METHODS
  // ===============================

  /**
   * Checks server health
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
