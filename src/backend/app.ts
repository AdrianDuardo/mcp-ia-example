/**
 * BACKEND NODE.JS - MCP TUTORIAL
 * 
 * This backend acts as the ORCHESTRATOR between:
 * 1. React Frontend (user chat)
 * 2. OpenAI API (language model)
 * 3. MCP Server (tools and resources)
 * 
 * 🚀 FUNCTIONALITIES:
 * - REST API for frontend
 * - OpenAI GPT integration
 * - MCP server connection
 * - Conversation management
 * - WebSocket for real-time
 */

import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { createServer } from 'http';
import dotenv from 'dotenv';
import { ChatService } from './services/chat.js';
import { MCPClientService } from './services/mcp-client.js';
import { ConversationManager } from './services/conversation.js';
import type {
  ChatRequest,
  ChatResponse,
  ApiResponse,
  ServerStats
} from '../shared/types.js';

// Load environment variables
dotenv.config();

/**
 * MAIN SERVER CLASS
 * 
 * Handles all backend logic and coordinates different services.
 */
class MCPBackendServer {
  private app: express.Application;
  private server: any;
  private wss: WebSocketServer | null = null;
  private chatService: ChatService;
  private mcpClient: MCPClientService;
  private conversationManager: ConversationManager;
  private startTime: number;

  constructor() {
    this.app = express();
    this.startTime = Date.now();

    // Initialize services
    this.mcpClient = new MCPClientService();
    this.chatService = new ChatService(this.mcpClient);
    this.conversationManager = new ConversationManager();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configures Express server middleware
   */
  private setupMiddleware(): void {
    // CORS para permitir acceso desde el frontend
    const corsOrigins = process.env.CORS_ORIGINS ?
      process.env.CORS_ORIGINS.split(',').map(origin => origin.trim()) :
      ['http://localhost:5173', 'http://localhost:3000'];

    this.app.use(cors({
      origin: corsOrigins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Parser JSON
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
      next();
    });

    // Global error handling
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Server error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      } as ApiResponse);
    });
  }

  /**
   * Configures API routes
   */
  private setupRoutes(): void {
    // === MAIN ROUTE ===
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'MCP Backend Server working correctly',
        version: '1.0.0',
        uptime: Date.now() - this.startTime,
        endpoints: [
          'GET  / - This information',
          'POST /api/chat - Send message to chat',
          'GET  /api/conversations/:id - Get conversation',
          'GET  /api/mcp/tools - List MCP tools',
          'GET  /api/mcp/resources - List MCP resources',
          'GET  /api/mcp/prompts - List MCP prompts',
          'GET  /api/stats - Server statistics'
        ]
      } as ApiResponse);
    });

    // === CHAT ROUTES ===

    // Send message to chat
    this.app.post('/api/chat', async (req, res) => {
      try {
        const chatRequest: ChatRequest = req.body;

        if (!chatRequest.message?.trim()) {
          return res.status(400).json({
            success: false,
            error: 'Message cannot be empty'
          } as ApiResponse);
        }

        // Process message with chat service
        const response = await this.chatService.processMessage(
          chatRequest.message,
          chatRequest.conversationId
        );

        // Save conversation
        await this.conversationManager.updateConversation(
          response.conversationId,
          response.message
        );

        // Send response via WebSocket if there are connections
        this.broadcastToWebSocket({
          type: 'chat_response',
          data: response
        });

        res.json({
          success: true,
          data: response
        } as ApiResponse<ChatResponse>);

      } catch (error) {
        console.error('Error processing message:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Error processing message'
        } as ApiResponse);
      }
    });

    // Get specific conversation
    this.app.get('/api/conversations/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const conversation = await this.conversationManager.getConversation(id);

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversation not found'
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: conversation
        } as ApiResponse);

      } catch (error) {
        console.error('Error getting conversation:', error);
        res.status(500).json({
          success: false,
          error: 'Error getting conversation'
        } as ApiResponse);
      }
    });

    // === MCP ROUTES ===

    // List available MCP tools
    this.app.get('/api/mcp/tools', async (req, res) => {
      try {
        const tools = await this.mcpClient.listTools();
        res.json({
          success: true,
          data: tools
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Error getting MCP tools'
        } as ApiResponse);
      }
    });

    // List available MCP resources
    this.app.get('/api/mcp/resources', async (req, res) => {
      try {
        const resources = await this.mcpClient.listResources();
        res.json({
          success: true,
          data: resources
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Error getting MCP resources'
        } as ApiResponse);
      }
    });

    // List available MCP prompts
    this.app.get('/api/mcp/prompts', async (req, res) => {
      try {
        const prompts = await this.mcpClient.listPrompts();
        res.json({
          success: true,
          data: prompts
        } as ApiResponse);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Error getting MCP prompts'
        } as ApiResponse);
      }
    });

    // === STATISTICS ROUTE ===
    this.app.get('/api/stats', async (req, res) => {
      try {
        const stats: ServerStats = {
          uptime: Date.now() - this.startTime,
          totalConversations: await this.conversationManager.getTotalConversations(),
          totalMessages: await this.conversationManager.getTotalMessages(),
          mcpToolCalls: this.chatService.getMCPToolCallCount(),
          averageResponseTime: this.chatService.getAverageResponseTime(),
          activeConnections: this.wss?.clients.size || 0
        };

        res.json({
          success: true,
          data: stats
        } as ApiResponse<ServerStats>);
      } catch (error) {
        res.status(500).json({
          success: false,
          error: 'Error getting statistics'
        } as ApiResponse);
      }
    });

    // === HEALTH CHECK ROUTE ===
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Server working correctly',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime
      } as ApiResponse);
    });
  }

  /**
   * Configures WebSocket for real-time communication
   */
  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      console.log('New WebSocket connection from:', req.socket.remoteAddress);

      // Send welcome message
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Connected to MCP server'
      }));

      // Handle client messages
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('WebSocket message received:', message);

          // Here you could handle different types of WebSocket messages
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error processing WebSocket message:', error);
        }
      });

      // Handle disconnection
      ws.on('close', () => {
        console.log('WebSocket connection closed');
      });

      // Handle errors
      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
    });

    console.log('✅ WebSocket server configured');
  }

  /**
   * Sends message to all WebSocket connections
   */
  private broadcastToWebSocket(message: any): void {
    if (!this.wss) return;

    this.wss.clients.forEach((client) => {
      if (client.readyState === 1) { // WebSocket.OPEN
        client.send(JSON.stringify(message));
      }
    });
  }

  /**
   * Initializes the server and all services
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Initializing MCP backend...');

      // Connect to MCP server
      await this.mcpClient.connect();
      console.log('✅ MCP client connected');

      // Create HTTP server
      this.server = createServer(this.app);

      // Configure WebSocket
      this.setupWebSocket();

      console.log('✅ MCP backend initialized correctly');
    } catch (error) {
      console.error('❌ Error initializing backend:', error);
      throw error;
    }
  }

  /**
   * Starts the server on the specified port
   */
  async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '3001');

    await this.initialize();

    this.server.listen(port, () => {
      console.log(`🎉 Backend server running on port ${port}`);
      console.log(`📡 WebSocket available at ws://localhost:${port}`);
      console.log(`📋 API available at http://localhost:${port}/api`);
      console.log(`🔧 Admin panel at http://localhost:${port}/`);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      console.log('🛑 Closing server...');

      // Close WebSocket connections
      if (this.wss) {
        this.wss.close();
      }

      // Close MCP client
      await this.mcpClient.disconnect();

      // Close HTTP server
      this.server.close(() => {
        console.log('✅ Server closed correctly');
        process.exit(0);
      });
    });
  }
}

// === INITIALIZATION ===

// Validate required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY is not configured');
  console.error('📝 Create a .env file with your OpenAI API key');
  process.exit(1);
}

// Create and start server
const server = new MCPBackendServer();
server.start().catch((error) => {
  console.error('❌ Fatal error starting server:', error);
  process.exit(1);
});
