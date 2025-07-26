/**
 * TIPOS PARA EL FRONTEND - TUTORIAL MCP
 * 
 * Definiciones de tipos TypeScript específicas para el frontend React.
 * Reutiliza tipos del backend y añade tipos específicos de UI.
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
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// === TIPOS DE HERRAMIENTAS MCP ===

export interface MCPTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
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

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// === TIPOS DE ESTADO DE LA APLICACIÓN ===

export interface AppState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentConversationId: string | null;
  availableTools: MCPTool[];
  availableResources: MCPResource[];
  availablePrompts: MCPPrompt[];
}

// === TIPOS DE COMPONENTES UI ===

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
}

export interface MessageItemProps {
  message: ChatMessage;
  isLast?: boolean;
}

export interface ToolsListProps {
  tools: MCPTool[];
  onToolSelect?: (tool: MCPTool) => void;
}

export interface StatsDisplayProps {
  stats: ServerStats;
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

// === TIPOS DE EVENTOS ===

export interface WebSocketMessage {
  type: 'welcome' | 'chat_response' | 'error' | 'ping' | 'pong';
  data?: unknown;
  message?: string;
  error?: string;
}

// === TIPOS DE CONFIGURACIÓN ===

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

// === TIPOS DE HOOKS ===

export interface UseChatReturn {
  messages: ChatMessage[];
  sendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  error: string | null;
  clearMessages: () => void;
  conversationId: string | null;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  sendMessage: (message: string) => void;
  lastMessage: WebSocketMessage | null;
  error: string | null;
}

export interface UseMCPReturn {
  tools: MCPTool[];
  resources: MCPResource[];
  prompts: MCPPrompt[];
  isLoading: boolean;
  error: string | null;
  refreshMCPData: () => Promise<void>;
}

// === TIPOS DE UTILIDADES ===

export interface FormattedTime {
  hours: number;
  minutes: number;
  seconds: number;
  formatted: string;
}

export interface MessageAction {
  id: string;
  label: string;
  icon?: string;
  onClick: (message: ChatMessage) => void;
}

// === CONSTANTES DE TIPOS ===

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export const MCP_ACTION_TYPES = ['tool_call', 'resource_read', 'prompt_get'] as const;
export const WEBSOCKET_MESSAGE_TYPES = ['welcome', 'chat_response', 'error', 'ping', 'pong'] as const;
