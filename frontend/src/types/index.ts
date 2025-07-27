/**
 * FRONTEND TYPES - MCP TUTORIAL
 * 
 * TypeScript type definitions specific for the React frontend.
 * Reuses backend types and adds UI-specific types.
 */

// === CHAT MESSAGE TYPES ===

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

// === MCP ACTION TYPES ===

export interface MCPAction {
  type: 'tool_call' | 'resource_read' | 'prompt_get';
  name: string;
  arguments?: Record<string, unknown>;
  result?: unknown;
  error?: string;
}

// === MCP TOOLS TYPES ===

export interface MCPTool {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

// === NOTES TYPES ===

export interface Note {
  id: number;
  title: string;
  content: string;
  category?: string;
  creationDate: string;
  lastModified: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  category?: string;
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

// === API RESPONSE TYPES ===

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// === APPLICATION STATE TYPES ===

export interface AppState {
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  currentConversationId: string | null;
  availableTools: MCPTool[];
  availableResources: MCPResource[];
  availablePrompts: MCPPrompt[];
}

// === UI COMPONENT TYPES ===

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

// === STATISTICS TYPES ===

export interface ServerStats {
  uptime: number;
  totalConversations: number;
  totalMessages: number;
  mcpToolCalls: number;
  averageResponseTime: number;
  activeConnections: number;
}

// === EVENT TYPES ===

export interface WebSocketMessage {
  type: 'welcome' | 'chat_response' | 'error' | 'ping' | 'pong';
  data?: unknown;
  message?: string;
  error?: string;
}

// === CONFIGURATION TYPES ===

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
}

// === HOOK TYPES ===

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

// === UTILITY TYPES ===

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

// === TYPE CONSTANTS ===

export const MESSAGE_ROLES = ['user', 'assistant', 'system'] as const;
export const MCP_ACTION_TYPES = ['tool_call', 'resource_read', 'prompt_get'] as const;
export const WEBSOCKET_MESSAGE_TYPES = ['welcome', 'chat_response', 'error', 'ping', 'pong'] as const;
