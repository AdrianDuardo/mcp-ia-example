/**
 * CLIENTE MCP - TUTORIAL
 * 
 * Este servicio conecta el backend con el servidor MCP.
 * Actúa como el PUENTE entre nuestro backend y las herramientas MCP.
 * 
 * 🔗 FUNCIONALIDADES:
 * - Conecta al servidor MCP via stdio
 * - Lista herramientas, recursos y prompts
 * - Ejecuta herramientas con validación
 * - Maneja errores y reconexión
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import type { MCPTool, MCPResource, MCPPrompt } from '../../shared/types.js';

export class MCPClientService {
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private serverProcess: ChildProcess | null = null;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 3;

  constructor() {
    console.log('🔧 Inicializando cliente MCP...');
  }

  /**
   * Conecta al servidor MCP
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Conectando al servidor MCP...');

      // Ruta al servidor MCP compilado
      const serverPath = path.join(process.cwd(), 'dist', 'mcp-server', 'server.js');

      // Crear proceso del servidor MCP
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Manejar errores del proceso servidor
      this.serverProcess.on('error', (error) => {
        console.error('❌ Error en proceso servidor MCP:', error);
        this.isConnected = false;
      });

      this.serverProcess.on('exit', (code, signal) => {
        console.log(`⚠️ Servidor MCP terminó (código: ${code}, señal: ${signal})`);
        this.isConnected = false;

        // Intentar reconexión si no fue terminación intencional
        if (code !== 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`🔄 Intentando reconexión (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.reconnect(), 2000);
        }
      });

      // Crear cliente MCP
      this.client = new Client(
        {
          name: 'mcp-backend-client',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // Crear transporte stdio usando el proceso
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        cwd: process.cwd()
      });

      // Conectar cliente
      await this.client.connect(this.transport);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ Cliente MCP conectado exitosamente');

    } catch (error) {
      console.error('❌ Error conectando a MCP:', error);
      this.isConnected = false;
      throw new Error(`Error conectando al servidor MCP: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Intenta reconectar al servidor MCP
   */
  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;

    try {
      await this.disconnect();
      await this.connect();
      console.log('✅ Reconexión MCP exitosa');
    } catch (error) {
      console.error(`❌ Error en reconexión ${this.reconnectAttempts}:`, error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), 5000);
      } else {
        console.error('❌ Máximo de intentos de reconexión alcanzado');
      }
    }
  }

  /**
   * Desconecta del servidor MCP
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill('SIGTERM');

        // Esperar un poco antes de forzar el cierre
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
          }
        }, 3000);
      }

      this.transport = null;
      this.serverProcess = null;
      this.isConnected = false;

      console.log('✅ Cliente MCP desconectado');
    } catch (error) {
      console.error('⚠️ Error desconectando MCP:', error);
    }
  }

  /**
   * Verifica si el cliente está conectado
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Lista todas las herramientas disponibles
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listTools();

      return response.tools.map((tool: any) => ({
        name: tool.name,
        title: tool.title || tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema
      }));
    } catch (error) {
      console.error('Error listando herramientas MCP:', error);
      throw new Error(`Error obteniendo herramientas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista todos los recursos disponibles
   */
  async listResources(): Promise<MCPResource[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listResources();

      return response.resources.map((resource: any) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType
      }));
    } catch (error) {
      console.error('Error listando recursos MCP:', error);
      throw new Error(`Error obteniendo recursos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista todos los prompts disponibles
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      const response = await this.client.listPrompts();

      return response.prompts.map((prompt: any) => ({
        name: prompt.name,
        title: prompt.title || prompt.name,
        description: prompt.description,
        arguments: prompt.arguments
      }));
    } catch (error) {
      console.error('Error listando prompts MCP:', error);
      throw new Error(`Error obteniendo prompts: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Ejecuta una herramienta MCP
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      console.log(`🔧 Ejecutando herramienta: ${name}`, args);

      const response = await this.client.callTool({
        name,
        arguments: args
      });

      console.log(`✅ Herramienta ${name} ejecutada exitosamente`);
      return response;
    } catch (error) {
      console.error(`❌ Error ejecutando herramienta ${name}:`, error);
      throw new Error(`Error ejecutando ${name}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lee un recurso MCP
   */
  async readResource(uri: string): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      console.log(`📖 Leyendo recurso: ${uri}`);

      const response = await this.client.readResource({ uri });

      console.log(`✅ Recurso ${uri} leído exitosamente`);
      return response;
    } catch (error) {
      console.error(`❌ Error leyendo recurso ${uri}:`, error);
      throw new Error(`Error leyendo recurso: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene un prompt MCP
   */
  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('Cliente MCP no conectado');
    }

    try {
      console.log(`💬 Obteniendo prompt: ${name}`, args);

      const response = await this.client.getPrompt({
        name,
        arguments: args || {}
      });

      console.log(`✅ Prompt ${name} obtenido exitosamente`);
      return response;
    } catch (error) {
      console.error(`❌ Error obteniendo prompt ${name}:`, error);
      throw new Error(`Error obteniendo prompt: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Ping para verificar conectividad
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isClientConnected()) return false;

      // Intentar listar herramientas como ping
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene estadísticas del cliente
   */
  getStats(): {
    connected: boolean;
    reconnectAttempts: number;
    serverPid: number | undefined;
  } {
    return {
      connected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      serverPid: this.serverProcess?.pid
    };
  }
}
