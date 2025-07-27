/**
 * CHAT COMPONENT - FRONTEND
 * 
 * Main chat component that integrates MCP with OpenAI.
 * Demonstrates all MCP server capabilities.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Settings, MessageSquare } from 'lucide-react';
import { useChat } from '../hooks/useChat';
import { useMCP } from '../hooks/useMCP';
import type { MCPTool } from '../types';
import { MessageList } from './MessageList';
import { MCPToolCard } from './MCPToolCard';
import { MCPResourceCard } from './MCPResourceCard';
import { StatsPanel } from './StatsPanel';
import './Chat.css';

export const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [showMCPTools, setShowMCPTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Chat hook
  const {
    messages,
    isLoading,
    error,
    sendMessage
  } = useChat();

  const {
    tools,
    resources,
    isLoading: mcpLoading,
    error: mcpError,
    refreshMCPData
  } = useMCP();

  /**
   * Message submission handler
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    try {
      await sendMessage(userMessage);
    } catch (error) {
      console.error('❌ Error sending message:', error);
    }
  };

  /**
   * Special key handling
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /**
   * Focus input on load
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Predefined prompt examples
   */
  const examplePrompts = [
    '🧮 Calculate the square root of 144',
    '🌤️ What\'s the weather like in Madrid?',
    '📝 Create a note about MCP',
    '📊 Execute SQL query: SELECT * FROM users LIMIT 5',
    '📁 List files in current directory'
  ];

  /**
   * Insert example prompt
   */
  const insertExamplePrompt = (prompt: string) => {
    setMessage(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Tool categorization
   */
  const toolCategories = tools.reduce((acc, tool) => {
    // Simplify categorization by tool name
    const category = tool.name.includes('calc') ? 'calculator' : 
                    tool.name.includes('weather') ? 'weather' : 
                    tool.name.includes('note') ? 'notes' : 
                    tool.name.includes('file') ? 'files' : 
                    tool.name.includes('db') ? 'database' : 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(tool);
    return acc;
  }, {} as Record<string, MCPTool[]>);

  /**
   * Complete conversation statistics
   */
  const conversationStats = {
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    mcpActions: messages.filter(m => m.content?.includes('MCP') || m.content?.includes('tool')).length,
    errors: error ? 1 : 0,
    conversationId: null // TODO: Implement conversationId when available
  };

  const mcpStats = {
    totalTools: tools.length,
    totalResources: resources.length,
    totalPrompts: 0, // TODO: Implement when we have prompts
    categorizedTools: Object.keys(toolCategories).length,
    resourceTypes: new Set(resources.map(r => r.mimeType || 'unknown')).size,
    promptsWithArgs: 0 // TODO: Implement when we have prompts
  };

  /**
   * Clear conversation
   */
  const clearConversation = () => {
    // TODO: Implement conversation clearing
    console.log('Clear conversation');
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-title">
          <MessageSquare className="icon" />
          <h1>MCP Chat Assistant</h1>
          <span className="subtitle">
            Powered by OpenAI GPT-4 + Model Context Protocol
          </span>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setShowMCPTools(!showMCPTools)}
            className={`toggle-button ${showMCPTools ? 'active' : ''}`}
            title="Show MCP tools"
          >
            <Settings className="icon" />
            MCP Tools
          </button>
          
          <button
            onClick={clearConversation}
            className="clear-button"
            title="Clear conversation"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="chat-content">
        {/* MCP sidebar */}
        {showMCPTools && (
          <div className="mcp-sidebar">
            <div className="sidebar-section">
              <h3>🔧 Available Tools</h3>
              {mcpLoading ? (
                <div className="loading-state">
                  <Loader2 className="icon spinning" />
                  <span>Loading tools...</span>
                </div>
              ) : mcpError ? (
                <div className="error-state">
                  <span>❌ Error: {mcpError}</span>
                  <button onClick={refreshMCPData} className="retry-button">
                    Retry
                  </button>
                </div>
              ) : (
                <div className="tools-grid">
                  {Object.entries(toolCategories).map(([category, categoryTools]) => (
                    <div key={category} className="tool-category">
                      <h4>{category}</h4>
                      {(categoryTools as MCPTool[]).map((tool: MCPTool) => (
                        <MCPToolCard
                          key={tool.name}
                          tool={tool}
                          isSelected={selectedTool === tool.name}
                          onClick={() => setSelectedTool(
                            selectedTool === tool.name ? null : tool.name
                          )}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Resources */}
            {resources.length > 0 && (
              <div className="sidebar-section">
                <h3>📊 Resources</h3>
                <div className="resources-list">
                  {resources.slice(0, 5).map(resource => (
                    <MCPResourceCard
                      key={resource.uri}
                      resource={resource}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Statistics */}
            <StatsPanel
              conversationStats={conversationStats}
              mcpStats={mcpStats}
            />
          </div>
        )}

        {/* Main chat area */}
        <div className="chat-main">
          {/* Message list */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-state">
                <div className="welcome-content">
                  <h2>Welcome to MCP Chat Assistant! 👋</h2>
                  <p>
                    This chat is integrated with the <strong>Model Context Protocol (MCP)</strong> 
                    and allows interaction with multiple tools and services.
                  </p>
                  
                  <div className="features-grid">
                    <div className="feature-card">
                      <span>🧮</span>
                      <h3>Calculator</h3>
                      <p>Advanced mathematical operations</p>
                    </div>
                    <div className="feature-card">
                      <span>🌤️</span>
                      <h3>Weather</h3>
                      <p>Real-time weather information</p>
                    </div>
                    <div className="feature-card">
                      <span>📝</span>
                      <h3>Notes</h3>
                      <p>Note and document management</p>
                    </div>
                    <div className="feature-card">
                      <span>📊</span>
                      <h3>Database</h3>
                      <p>Dynamic SQL queries</p>
                    </div>
                    <div className="feature-card">
                      <span>📁</span>
                      <h3>Files</h3>
                      <p>File system navigation</p>
                    </div>
                  </div>

                  <div className="examples-section">
                    <h3>💡 Try these examples:</h3>
                    <div className="examples-grid">
                      {examplePrompts.map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => insertExamplePrompt(prompt)}
                          className="example-prompt"
                        >
                          {prompt}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <MessageList 
                messages={messages}
                isLoading={isLoading}
              />
            )}
          </div>

          {/* Input form */}
          <div className="input-container">
            {error && (
              <div className="error-message">
                ❌ {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="input-form">
              <textarea
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message here... (Enter to send, Shift+Enter for new line)"
                className="message-input"
                rows={3}
                disabled={isLoading}
              />
              
              <button
                type="submit"
                disabled={!message.trim() || isLoading}
                className="send-button"
              >
                {isLoading ? (
                  <Loader2 className="icon spinning" />
                ) : (
                  <Send className="icon" />
                )}
              </button>
            </form>
            
            <div className="input-info">
              <span>
                {tools.length} MCP tools available • 
                {messages.length} messages in conversation
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
