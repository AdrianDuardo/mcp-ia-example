/**
 * TIPOS COMPARTIDOS - TUTORIAL MCP
 * 
 * Definiciones de tipos TypeScript que se comparten entre
 * el servidor MCP, backend y frontend.
 */

// === TIPOS DE MENSAJES DE CHAT ===

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  metadata?: {
    mcpTool?: string;
    mcpResource?: string;
    error?: boolean;
  };
}

export interface ChatRequest {
  message: string;
  conversationId?: string;
}

export interface ChatResponse {
  message: ChatMessage;
  conversationId: string;
  mcpActions?: MCPAction[];
}

// === TIPOS DE ACCIONES MCP ===

export interface MCPAction {
  type: 'tool_call' | 'resource_read' | 'prompt_get';
  name: string;
  arguments?: Record<string, any>;
  result?: any;
  error?: string;
}

// === TIPOS DE HERRAMIENTAS MCP ===

export interface MCPTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPPrompt {
  name: string;
  title: string;
  description: string;
  arguments?: MCPPromptArgument[];
}

export interface MCPPromptArgument {
  name: string;
  description: string;
  required: boolean;
}

// === TIPOS DE RESPUESTAS DE API ===

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// === TIPOS DE CONFIGURACIÓN ===

export interface ServerConfig {
  port: number;
  openaiApiKey: string;
  openweatherApiKey?: string;
  corsOrigins: string[];
  rateLimit: {
    windowMs: number;
    max: number;
  };
}

// === TIPOS DE ESTADO DE CONVERSACIÓN ===

export interface ConversationContext {
  id: string;
  messages: ChatMessage[];
  createdAt: string;
  lastActivity: string;
  mcpState?: {
    availableTools: MCPTool[];
    availableResources: MCPResource[];
    availablePrompts: MCPPrompt[];
  };
}

// === TIPOS DE ESTADÍSTICAS ===

export interface ServerStats {
  uptime: number;
  totalConversations: number;
  totalMessages: number;
  mcpToolCalls: number;
  averageResponseTime: number;
  activeConnections: number;
}

// === TIPOS DE EVENTOS DEL SISTEMA ===

export interface SystemEvent {
  type: 'mcp_connected' | 'mcp_disconnected' | 'tool_executed' | 'error';
  timestamp: string;
  data?: any;
  error?: string;
}
