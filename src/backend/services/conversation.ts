/**
 * CONVERSATION MANAGER - MCP TUTORIAL
 * 
 * This service manages chat conversation state.
 * Maintains context and history for each conversation.
 * 
 * 💾 FUNCTIONALITIES:
 * - Stores conversations in memory
 * - Maintains message history
 * - Manages multiple simultaneous conversations
 * - Statistics and analytics
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  ConversationContext,
  ChatMessage
} from '../../shared/types.js';

export class ConversationManager {
  private conversations: Map<string, ConversationContext> = new Map();
  private maxConversations: number = 100; // Conversation limit in memory
  private maxMessagesPerConversation: number = 50; // Message limit per conversation

  constructor() {
    console.log('💬 Conversation manager initialized');

    // Clean old conversations every hour
    setInterval(() => {
      this.cleanupOldConversations();
    }, 60 * 60 * 1000);
  }

  /**
   * Creates a new conversation or gets an existing one
   */
  async getOrCreateConversation(conversationId?: string): Promise<ConversationContext> {
    if (conversationId && this.conversations.has(conversationId)) {
      const conversation = this.conversations.get(conversationId)!;
      conversation.lastActivity = new Date().toISOString();
      return conversation;
    }

    // Create new conversation
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

    // Clean conversations if we exceed the limit
    if (this.conversations.size > this.maxConversations) {
      this.cleanupOldConversations();
    }

    console.log(`📝 New conversation created: ${newId}`);
    return conversation;
  }

  /**
   * Gets a specific conversation
   */
  async getConversation(conversationId: string): Promise<ConversationContext | null> {
    const conversation = this.conversations.get(conversationId);

    if (conversation) {
      conversation.lastActivity = new Date().toISOString();
    }

    return conversation || null;
  }

  /**
   * Updates a conversation with a new message
   */
  async updateConversation(conversationId: string, message: ChatMessage): Promise<void> {
    const conversation = await this.getOrCreateConversation(conversationId);

    // Add message to history
    conversation.messages.push(message);

    // Limit number of messages per conversation
    if (conversation.messages.length > this.maxMessagesPerConversation) {
      // Keep only the most recent messages
      conversation.messages = conversation.messages.slice(-this.maxMessagesPerConversation);
    }

    conversation.lastActivity = new Date().toISOString();

    console.log(`💬 Message added to conversation ${conversationId}: ${message.role}`);
  }

  /**
   * Adds multiple messages to a conversation
   */
  async addMessages(conversationId: string, messages: ChatMessage[]): Promise<void> {
    for (const message of messages) {
      await this.updateConversation(conversationId, message);
    }
  }

  /**
   * Gets conversation message history
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
   * Deletes a conversation
   */
  async deleteConversation(conversationId: string): Promise<boolean> {
    const deleted = this.conversations.delete(conversationId);

    if (deleted) {
      console.log(`🗑️ Conversation deleted: ${conversationId}`);
    }

    return deleted;
  }

  /**
   * Lists all conversations
   */
  async listConversations(): Promise<ConversationContext[]> {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
  }

  /**
   * Searches conversations by content
   */
  async searchConversations(query: string): Promise<ConversationContext[]> {
    const searchTerm = query.toLowerCase();
    const results: ConversationContext[] = [];

    for (const conversation of this.conversations.values()) {
      // Search in messages
      const hasMatch = conversation.messages.some(message =>
        message.content.toLowerCase().includes(searchTerm)
      );

      if (hasMatch) {
        results.push(conversation);
      }
    }

    // Sort by most recent activity
    return results.sort((a, b) =>
      new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime()
    );
  }

  /**
   * Updates MCP state of a conversation
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
   * Cleans up old conversations
   */
  private cleanupOldConversations(): void {
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours
    let cleaned = 0;

    for (const [id, conversation] of this.conversations) {
      const lastActivity = new Date(conversation.lastActivity).getTime();

      if (now - lastActivity > maxAge) {
        this.conversations.delete(id);
        cleaned++;
      }
    }

    // If there are still too many conversations, delete the oldest ones
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
      console.log(`🧹 ${cleaned} old conversations deleted`);
    }
  }

  /**
   * Gets conversation statistics
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
    const activeThreshold = 60 * 60 * 1000; // 1 hour

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
   * Gets total number of conversations
   */
  async getTotalConversations(): Promise<number> {
    return this.conversations.size;
  }

  /**
   * Gets total number of messages
   */
  async getTotalMessages(): Promise<number> {
    let total = 0;
    for (const conversation of this.conversations.values()) {
      total += conversation.messages.length;
    }
    return total;
  }

  /**
   * Exports a conversation to JSON
   */
  async exportConversation(conversationId: string): Promise<string | null> {
    const conversation = await this.getConversation(conversationId);

    if (!conversation) {
      return null;
    }

    return JSON.stringify(conversation, null, 2);
  }

  /**
   * Clears all conversations
   */
  async clearAllConversations(): Promise<number> {
    const count = this.conversations.size;
    this.conversations.clear();

    console.log(`🧹 All conversations deleted (${count})`);
    return count;
  }
}
