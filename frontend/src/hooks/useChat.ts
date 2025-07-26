/**
 * HOOK DE CHAT - FRONTEND
 * 
 * Hook personalizado para manejar el estado del chat y la comunicación
 * con el backend. Proporciona funcionalidades completas de chat con MCP.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import apiService from '../services/api';
import type { ChatMessage, UseChatReturn } from '../types';

export const useChat = (): UseChatReturn => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);

  // Ref para evitar múltiples envíos
  const isProcessing = useRef(false);

  /**
   * Inicializa la conversación con un mensaje de bienvenida
   */
  useEffect(() => {
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: `¡Hola! 👋 Soy tu asistente con Model Context Protocol (MCP).

Puedo ayudarte con:
🧮 **Cálculos matemáticos** - "Calcula 15% de 200"
🌤️ **Información del clima** - "¿Qué tiempo hace en Madrid?"
📝 **Gestión de notas** - "Crea una nota sobre mi reunión"
🗄️ **Consultas de base de datos** - "Muestra todos los usuarios"
📁 **Lectura de archivos** - "Lee el archivo config.json"

¿En qué puedo ayudarte hoy?`,
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
  }, []);

  /**
   * Envía un mensaje al chat
   */
  const sendMessage = useCallback(async (content: string): Promise<void> => {
    if (!content.trim() || isProcessing.current) {
      return;
    }

    isProcessing.current = true;
    setIsLoading(true);
    setError(null);

    // Crear mensaje del usuario
    const userMessage: ChatMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    };

    // Agregar mensaje del usuario inmediatamente
    setMessages(prev => [...prev, userMessage]);

    try {
      // Enviar mensaje al backend
      const response = await apiService.sendMessage({
        message: content.trim(),
        conversationId: conversationId || undefined
      });

      // Actualizar ID de conversación si es nuevo
      if (!conversationId) {
        setConversationId(response.conversationId);
      }

      // Agregar respuesta del asistente
      setMessages(prev => [...prev, response.message]);

      // Log de acciones MCP ejecutadas
      if (response.mcpActions && response.mcpActions.length > 0) {
        console.log('🔧 Acciones MCP ejecutadas:', response.mcpActions);
      }

    } catch (err) {
      console.error('❌ Error enviando mensaje:', err);

      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Lo siento, ocurrió un error: ${err instanceof Error ? err.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      };

      setMessages(prev => [...prev, errorMessage]);
      setError(err instanceof Error ? err.message : 'Error desconocido');
    } finally {
      setIsLoading(false);
      isProcessing.current = false;
    }
  }, [conversationId]);

  /**
   * Limpia todos los mensajes del chat
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setConversationId(null);
    setError(null);

    // Agregar mensaje de bienvenida nuevamente
    const welcomeMessage: ChatMessage = {
      id: uuidv4(),
      role: 'assistant',
      content: '¡Conversación reiniciada! ¿En qué puedo ayudarte?',
      timestamp: new Date().toISOString()
    };

    setMessages([welcomeMessage]);
  }, []);

  /**
   * Reintenta el último mensaje en caso de error
   */
  const retryLastMessage = useCallback(async () => {
    const lastUserMessage = messages
      .slice()
      .reverse()
      .find(msg => msg.role === 'user');

    if (lastUserMessage) {
      // Remover mensajes después del último mensaje del usuario
      const lastUserIndex = messages.findIndex(msg => msg.id === lastUserMessage.id);
      setMessages(prev => prev.slice(0, lastUserIndex));

      // Reenviar mensaje
      await sendMessage(lastUserMessage.content);
    }
  }, [messages, sendMessage]);

  /**
   * Carga una conversación existente
   */
  const loadConversation = useCallback(async (id: string) => {
    try {
      setIsLoading(true);
      // TODO: Implementar método getConversation en apiService
      // const conversation = await apiService.getConversation(id);

      // Por ahora, solo limpiar los mensajes actuales
      setMessages([]);
      setConversationId(id);
      setError(null);
    } catch (err) {
      console.error('❌ Error cargando conversación:', err);
      setError(err instanceof Error ? err.message : 'Error cargando conversación');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Obtiene estadísticas de la conversación actual
   */
  const getConversationStats = useCallback(() => {
    const userMessages = messages.filter(msg => msg.role === 'user').length;
    const assistantMessages = messages.filter(msg => msg.role === 'assistant').length;
    const mcpActions = messages.filter(msg => msg.metadata?.mcpTool).length;
    const errors = messages.filter(msg => msg.metadata?.error).length;

    return {
      totalMessages: messages.length,
      userMessages,
      assistantMessages,
      mcpActions,
      errors,
      conversationId
    };
  }, [messages, conversationId]);

  /**
   * Exporta la conversación como JSON
   */
  const exportConversation = useCallback(() => {
    const exportData = {
      conversationId,
      messages,
      exportedAt: new Date().toISOString(),
      stats: getConversationStats()
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${conversationId || 'export'}-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [conversationId, messages, getConversationStats]);

  return {
    messages,
    sendMessage,
    isLoading,
    error,
    clearConversation: clearMessages,
    conversationId,
    // Funciones adicionales
    retryLastMessage,
    loadConversation,
    getConversationStats,
    exportConversation
  } as UseChatReturn & {
    clearConversation: () => void;
    retryLastMessage: () => Promise<void>;
    loadConversation: (id: string) => Promise<void>;
    getConversationStats: () => {
      totalMessages: number;
      userMessages: number;
      assistantMessages: number;
      mcpActions: number;
      errors: number;
      conversationId: string | null;
    };
    exportConversation: () => void;
  };
};
