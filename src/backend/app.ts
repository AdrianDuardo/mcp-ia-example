/**
 * BACKEND NODE.JS - TUTORIAL MCP
 * 
 * Este backend actúa como el ORQUESTADOR entre:
 * 1. Frontend React (chat del usuario)
 * 2. OpenAI API (modelo de lenguaje)
 * 3. Servidor MCP (herramientas y recursos)
 * 
 * 🚀 FUNCIONALIDADES:
 * - API REST para el frontend
 * - Integración con OpenAI GPT
 * - Conexión al servidor MCP
 * - Gestión de conversaciones
 * - WebSocket para tiempo real
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

// Cargar variables de entorno
dotenv.config();

/**
 * CLASE PRINCIPAL DEL SERVIDOR
 * 
 * Maneja toda la lógica del backend y coordina los diferentes servicios.
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

    // Inicializar servicios
    this.mcpClient = new MCPClientService();
    this.chatService = new ChatService(this.mcpClient);
    this.conversationManager = new ConversationManager();

    this.setupMiddleware();
    this.setupRoutes();
  }

  /**
   * Configura middleware del servidor Express
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

    // Logging de requests
    this.app.use((req, res, next) => {
      console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.get('Origin')}`);
      next();
    });

    // Manejo de errores global
    this.app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      console.error('Error en servidor:', error);
      res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        message: error.message
      } as ApiResponse);
    });
  }

  /**
   * Configura las rutas de la API
   */
  private setupRoutes(): void {
    // === RUTA PRINCIPAL ===
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'MCP Backend Server funcionando correctamente',
        version: '1.0.0',
        uptime: Date.now() - this.startTime,
        endpoints: [
          'GET  / - Esta información',
          'POST /api/chat - Enviar mensaje al chat',
          'GET  /api/conversations/:id - Obtener conversación',
          'GET  /api/mcp/tools - Listar herramientas MCP',
          'GET  /api/mcp/resources - Listar recursos MCP',
          'GET  /api/mcp/prompts - Listar prompts MCP',
          'GET  /api/stats - Estadísticas del servidor'
        ]
      } as ApiResponse);
    });

    // === RUTAS DE CHAT ===

    // Enviar mensaje al chat
    this.app.post('/api/chat', async (req, res) => {
      try {
        const chatRequest: ChatRequest = req.body;

        if (!chatRequest.message?.trim()) {
          return res.status(400).json({
            success: false,
            error: 'El mensaje no puede estar vacío'
          } as ApiResponse);
        }

        // Procesar mensaje con el servicio de chat
        const response = await this.chatService.processMessage(
          chatRequest.message,
          chatRequest.conversationId
        );

        // Guardar conversación
        await this.conversationManager.updateConversation(
          response.conversationId,
          response.message
        );

        // Enviar respuesta por WebSocket si hay conexiones
        this.broadcastToWebSocket({
          type: 'chat_response',
          data: response
        });

        res.json({
          success: true,
          data: response
        } as ApiResponse<ChatResponse>);

      } catch (error) {
        console.error('Error procesando mensaje:', error);
        res.status(500).json({
          success: false,
          error: error instanceof Error ? error.message : 'Error procesando mensaje'
        } as ApiResponse);
      }
    });

    // Obtener conversación específica
    this.app.get('/api/conversations/:id', async (req, res) => {
      try {
        const { id } = req.params;
        const conversation = await this.conversationManager.getConversation(id);

        if (!conversation) {
          return res.status(404).json({
            success: false,
            error: 'Conversación no encontrada'
          } as ApiResponse);
        }

        res.json({
          success: true,
          data: conversation
        } as ApiResponse);

      } catch (error) {
        console.error('Error obteniendo conversación:', error);
        res.status(500).json({
          success: false,
          error: 'Error obteniendo conversación'
        } as ApiResponse);
      }
    });

    // === RUTAS DE MCP ===

    // Listar herramientas MCP disponibles
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
          error: 'Error obteniendo herramientas MCP'
        } as ApiResponse);
      }
    });

    // Listar recursos MCP disponibles
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
          error: 'Error obteniendo recursos MCP'
        } as ApiResponse);
      }
    });

    // Listar prompts MCP disponibles
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
          error: 'Error obteniendo prompts MCP'
        } as ApiResponse);
      }
    });

    // === RUTA DE ESTADÍSTICAS ===
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
          error: 'Error obteniendo estadísticas'
        } as ApiResponse);
      }
    });

    // === RUTA DE HEALTH CHECK ===
    this.app.get('/api/health', (req, res) => {
      res.json({
        success: true,
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        uptime: Date.now() - this.startTime
      } as ApiResponse);
    });
  }

  /**
   * Configura WebSocket para comunicación en tiempo real
   */
  private setupWebSocket(): void {
    this.wss = new WebSocketServer({ server: this.server });

    this.wss.on('connection', (ws, req) => {
      console.log('Nueva conexión WebSocket desde:', req.socket.remoteAddress);

      // Enviar mensaje de bienvenida
      ws.send(JSON.stringify({
        type: 'welcome',
        message: 'Conectado al servidor MCP'
      }));

      // Manejar mensajes del cliente
      ws.on('message', async (data) => {
        try {
          const message = JSON.parse(data.toString());
          console.log('Mensaje WebSocket recibido:', message);

          // Aquí podrías manejar diferentes tipos de mensajes WebSocket
          if (message.type === 'ping') {
            ws.send(JSON.stringify({ type: 'pong' }));
          }
        } catch (error) {
          console.error('Error procesando mensaje WebSocket:', error);
        }
      });

      // Manejar desconexión
      ws.on('close', () => {
        console.log('Conexión WebSocket cerrada');
      });

      // Manejar errores
      ws.on('error', (error) => {
        console.error('Error en WebSocket:', error);
      });
    });

    console.log('✅ WebSocket server configurado');
  }

  /**
   * Envía mensaje a todas las conexiones WebSocket
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
   * Inicializa el servidor y todos los servicios
   */
  async initialize(): Promise<void> {
    try {
      console.log('🚀 Inicializando backend MCP...');

      // Conectar al servidor MCP
      await this.mcpClient.connect();
      console.log('✅ Cliente MCP conectado');

      // Crear servidor HTTP
      this.server = createServer(this.app);

      // Configurar WebSocket
      this.setupWebSocket();

      console.log('✅ Backend MCP inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando backend:', error);
      throw error;
    }
  }

  /**
   * Inicia el servidor en el puerto especificado
   */
  async start(): Promise<void> {
    const port = parseInt(process.env.PORT || '3001');

    await this.initialize();

    this.server.listen(port, () => {
      console.log(`🎉 Servidor backend ejecutándose en puerto ${port}`);
      console.log(`📡 WebSocket disponible en ws://localhost:${port}`);
      console.log(`📋 API disponible en http://localhost:${port}/api`);
      console.log(`🔧 Panel de admin en http://localhost:${port}/`);
    });

    // Manejar cierre graceful
    process.on('SIGINT', async () => {
      console.log('🛑 Cerrando servidor...');

      // Cerrar conexiones WebSocket
      if (this.wss) {
        this.wss.close();
      }

      // Cerrar cliente MCP
      await this.mcpClient.disconnect();

      // Cerrar servidor HTTP
      this.server.close(() => {
        console.log('✅ Servidor cerrado correctamente');
        process.exit(0);
      });
    });
  }
}

// === INICIALIZACIÓN ===

// Validar variables de entorno requeridas
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY no está configurada');
  console.error('📝 Crea un archivo .env con tu API key de OpenAI');
  process.exit(1);
}

// Crear y iniciar servidor
const server = new MCPBackendServer();
server.start().catch((error) => {
  console.error('❌ Error fatal iniciando servidor:', error);
  process.exit(1);
});
