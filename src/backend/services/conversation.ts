/**
 * GESTOR DE CONVERSACIONES - TUTORIAL MCP
 * 
 * Este servicio maneja el estado de las conversaciones del chat.
 * Mantiene el contexto y historial de cada conversación.
 * 
 * 💾 FUNCIONALIDADES:
 * - Almacena conversaciones en memoria
 * - Mantiene historial de mensajes
 * - Gestiona múltiples conversaciones simultáneas
 * - Estadísticas y análisis
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ConversationContext,
  ChatMessage
} from '../../shared/types.js';

export class ConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();
  private maxConversations: number = 100; // Límite de conversaciones en memoria
  private maxMessagesPerConversation: number = 50; // Límite de mensajes por conversación

  constructor() {
    console.log('💬 Gestor de conversaciones inicializado');

    // Limpiar conversaciones antiguas cada hora
    setInterval(() => {
      this.cleanupOldConversations();
    }, 60 * 60 * 1000);
  }

  /**
   * Crea una nueva conversación o obtiene una existente
   */
  async getOrCreateConversation(conversationId?: string): Promise<ConversationContext> {
    if (conversationId && this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId)!;
      conversation.lastActivity = new Date().toISOString();
      return conversation;
    }

    // Crear nueva conversación
    const newId = conversationId || uuidv4();
    const conversation: ConversationContext = {
      id: newId,
      messages: [],
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
      mcpState: {
        availableTools: [],
        availableResources: [],
        availablePrompts: []
      }
    };

    this.conversations.set(newId, conversation);

    // Limpiar conversaciones si excedemos el límite
    if (this.conversations.size > this.maxConversations) {
      this.cleanupOldConversations();
    }

    console.log(`📝 Nueva conversación creada: ${newId}`);
    return conversation;
  }

  /**
   * Obtiene una conversación específica
   */
  async getConversation(conversationId: string): Promise<ConversationContext | null> {
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      conversation.lastActivity = new Date().toISOString();
    }

    return conversation || null;
  }

  /**
   * Actualiza una conversación con un nuevo mensaje
   */
  async updateConversation(conversationId: string, message: ChatMessage): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);

    // Agregar mensaje al historial
    conversation.messages.push(message);

    // Limitar número de mensajes por conversación
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      // Mantener solo los mensajes más recientes
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }

    conversation.lastActivity = new Date().toISOString();

    console.log(`💬 Mensaje agregado a conversación ${conversationId}: ${message.role}`);
  }

  /**
   * Agrega múltiples mensajes a una conversación
   */
  async addMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    for (const message of messages) {
      await this.updateConversation(conversationId, message);
    }
  }

  /**
   * Obtiene el historial de mensajes de una conversación
   */
  async getConversationHistory(conversationId: string, limit?: number): Promise<ChatMessage[]> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      return [];
    }

    const messages = conversation.messages;

    if (limit && limit > 0) {
      return messages.slice(-limit);
    }

    return messages;
  }

  /**
   * Elimina una conversación
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const deleted = this.conversations.delete(conversationId);

    if (deleted) {
      console.log(`🗑️ Conversación eliminada: ${conversationId}`);
    }

    return deleted;
  }

  /**
   * Lista todas las conversaciones
   */
  async listConversations(): Promise<ConversationContext[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  /**
   * Busca conversaciones por contenido
   */
  async searchConversations(query: string): Promise<ConversationContext[]> {
    const searchTerm = query.toLowerCase();
    const results: ConversationContext[] = [];

    for (const conversation of this.conversations.values()) {
      // Buscar en mensajes
      const hasMatch = conversation.messages.some(message =>
        message.content.toLowerCase().includes(searchTerm)
      );

      if (hasMatch) {
        results.push(conversation);
      }
    }

    // Ordenar por actividad más reciente
    return results.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Actualiza el estado MCP de una conversación
   */
  async updateMCPState(
    conversationId: string,
    mcpState: ConversationContext['mcpState']
  ): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);
    conversation.mcpState = mcpState;
    conversation.lastActivity = new Date().toISOString();
  }

  /**
   * Limpia conversaciones antiguas
   */
  private cleanupOldConversations(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 horas
    let cleaned = 0;

    for (const [id, conversation] of this.conversations) {
      const lastActivity = new Date(conversation.lastActivity).getTime();

      if (now - lastActivity > maxAge) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    // Si aún hay demasiadas conversaciones, eliminar las más antiguas
    if (this.conversations.size > this.maxConversations) {
      const sorted = Array.from(this.conversations.entries())
        .sort((a, b) =>
          new Date(a[1].lastActivity).getTime() - new Date(b[1].lastActivity).getTime()
        );

      const toDelete = sorted.slice(0, sorted.length - this.maxConversations);

      for (const [id] of toDelete) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 ${cleaned} conversaciones antiguas eliminadas`);
    }
  }

  /**
   * Obtiene estadísticas de conversaciones
   */
  async getStats(): Promise<{
    totalConversations: number;
    totalMessages: number;
    averageMessagesPerConversation: number;
    activeConversations: number;
    oldestConversation: string;
    newestConversation: string;
  }> {
    const conversations = Array.from(this.conversations.values());
    const now = Date.now();
    const activeThreshold = 60 * 60 * 1000; // 1 hora

    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0
    );

    const activeConversations = conversations.filter(conv =>
      now - new Date(conv.lastActivity).getTime() < activeThreshold
    ).length;

    let oldestConversation = '';
    let newestConversation = '';

    if (conversations.length > 0) {
      const sorted = conversations.sort((a, b) =>
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      oldestConversation = sorted[0].createdAt;
      newestConversation = sorted[sorted.length - 1].createdAt;
    }

    return {
      totalConversations: conversations.length,
      totalMessages,
      averageMessagesPerConversation: conversations.length > 0
        ? Math.round(totalMessages / conversations.length)
        : 0,
      activeConversations,
      oldestConversation,
      newestConversation
    };
  }

  /**
   * Obtiene el número total de conversaciones
   */
  async getTotalConversations(): Promise<number> {
    return this.conversations.size;
  }

  /**
   * Obtiene el número total de mensajes
   */
  async getTotalMessages(): Promise<number> {
    let total = 0;
    for (const conversation of this.conversations.values()) {
      total += conversation.messages.length;
    }
    return total;
  }

  /**
   * Exporta una conversación a JSON
   */
  async exportConversation(conversationId: string): Promise<string | null> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      return null;
    }

    return JSON.stringify(conversation, null, 2);
  }

  /**
   * Limpia todas las conversaciones
   */
  async clearAllConversations(): Promise<number> {
    const count = this.conversations.size;
    this.conversations.clear();

    console.log(`🧹 Todas las conversaciones eliminadas (${count})`);
    return count;
  }
}
