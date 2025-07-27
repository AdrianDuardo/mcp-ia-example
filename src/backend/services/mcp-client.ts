/**
 * MCP CLIENT - TUTORIAL
 * 
 * This service connects the backend with the MCP server.
 * Acts as the BRIDGE between our backend and MCP tools.
 * 
 * 🔗 FUNCTIONALITIES:
 * - Connects to MCP server via stdio
 * - Lists tools, resources and prompts
 * - Executes tools with validation
 * - Handles errors and reconnection
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
    console.log('🔧 Initializing MCP client...');
  }

  /**
   * Connects to MCP server
   */
  async connect(): Promise<void> {
    try {
      console.log('🔌 Connecting to MCP server...');

      // Path to compiled MCP server
      const serverPath = path.join(process.cwd(), 'dist', 'mcp-server', 'server.js');

      // Create MCP server process
      this.serverProcess = spawn('node', [serverPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: process.cwd()
      });

      // Handle server process errors
      this.serverProcess.on('error', (error) => {
        console.error('❌ Error in MCP server process:', error);
        this.isConnected = false;
      });

      this.serverProcess.on('exit', (code, signal) => {
        console.log(`⚠️ MCP server terminated (code: ${code}, signal: ${signal})`);
        this.isConnected = false;

        // Attempt reconnection if not intentional termination
        if (code !== 0 && this.reconnectAttempts < this.maxReconnectAttempts) {
          console.log(`🔄 Attempting reconnection (${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})...`);
          setTimeout(() => this.reconnect(), 2000);
        }
      });

      // Create MCP client
      this.client = new Client(
        {
          name: 'mcp-backend-client',
          version: '1.0.0'
        },
        {
          capabilities: {}
        }
      );

      // Create stdio transport using the process
      this.transport = new StdioClientTransport({
        command: 'node',
        args: [serverPath],
        cwd: process.cwd()
      });

      // Connect client
      await this.client.connect(this.transport);

      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log('✅ MCP client connected successfully');

    } catch (error) {
      console.error('❌ Error connecting to MCP:', error);
      this.isConnected = false;
      throw new Error(`Error connecting to MCP server: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Attempts to reconnect to MCP server
   */
  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;

    try {
      await this.disconnect();
      await this.connect();
      console.log('✅ MCP reconnection successful');
    } catch (error) {
      console.error(`❌ Error in reconnection attempt ${this.reconnectAttempts}:`, error);

      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        setTimeout(() => this.reconnect(), 5000);
      } else {
        console.error('❌ Maximum reconnection attempts reached');
      }
    }
  }

  /**
   * Disconnects from MCP server
   */
  async disconnect(): Promise<void> {
    try {
      if (this.client) {
        await this.client.close();
        this.client = null;
      }

      if (this.serverProcess && !this.serverProcess.killed) {
        this.serverProcess.kill('SIGTERM');

        // Wait a bit before forcing close
        setTimeout(() => {
          if (this.serverProcess && !this.serverProcess.killed) {
            this.serverProcess.kill('SIGKILL');
          }
        }, 3000);
      }

      this.transport = null;
      this.serverProcess = null;
      this.isConnected = false;

      console.log('✅ MCP client disconnected');
    } catch (error) {
      console.error('⚠️ Error disconnecting MCP:', error);
    }
  }

  /**
   * Checks if client is connected
   */
  isClientConnected(): boolean {
    return this.isConnected && this.client !== null;
  }

  /**
   * Lists all available tools
   */
  async listTools(): Promise<MCPTool[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
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
      console.error('Error listing MCP tools:', error);
      throw new Error(`Error getting tools: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available resources
   */
  async listResources(): Promise<MCPResource[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
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
      console.error('Error listing MCP resources:', error);
      throw new Error(`Error getting resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
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
      console.error('Error listing MCP prompts:', error);
      throw new Error(`Error getting prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes an MCP tool
   */
  async callTool(name: string, args: Record<string, any>): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      console.log(`🔧 Executing tool: ${name}`, args);

      const response = await this.client.callTool({
        name,
        arguments: args
      });

      console.log(`✅ Tool ${name} executed successfully`);
      return response;
    } catch (error) {
      console.error(`❌ Error executing tool ${name}:`, error);
      throw new Error(`Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Reads an MCP resource
   */
  async readResource(uri: string): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      console.log(`📖 Reading resource: ${uri}`);

      const response = await this.client.readResource({ uri });

      console.log(`✅ Resource ${uri} read successfully`);
      return response;
    } catch (error) {
      console.error(`❌ Error reading resource ${uri}:`, error);
      throw new Error(`Error reading resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets an MCP prompt
   */
  async getPrompt(name: string, args?: Record<string, any>): Promise<any> {
    if (!this.isClientConnected() || !this.client) {
      throw new Error('MCP client not connected');
    }

    try {
      console.log(`💬 Getting prompt: ${name}`, args);

      const response = await this.client.getPrompt({
        name,
        arguments: args || {}
      });

      console.log(`✅ Prompt ${name} retrieved successfully`);
      return response;
    } catch (error) {
      console.error(`❌ Error getting prompt ${name}:`, error);
      throw new Error(`Error getting prompt: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Ping to verify connectivity
   */
  async ping(): Promise<boolean> {
    try {
      if (!this.isClientConnected()) return false;

      // Try to list tools as ping
      await this.listTools();
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets client statistics
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
