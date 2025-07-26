/**
 * COMPONENTE CHAT - FRONTEND
 * 
 * Componente principal del chat que integra MCP con OpenAI.
 * Demuestra todas las capacidades del servidor MCP.
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
  
  // Hook de chat
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
   * Manejador para envío de mensajes
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    
    try {
      await sendMessage(userMessage);
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
    }
  };

  /**
   * Manejo de teclas especiales
   */
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  /**
   * Enfocar input al cargar
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  /**
   * Ejemplos de prompts predefinidos
   */
  const examplePrompts = [
    '🧮 Calcula la raíz cuadrada de 144',
    '🌤️ ¿Qué tiempo hace en Madrid?',
    '📝 Crea una nota sobre MCP',
    '📊 Ejecuta una consulta SQL: SELECT * FROM usuarios LIMIT 5',
    '📁 Lista los archivos del directorio actual'
  ];

  /**
   * Inserta un prompt de ejemplo
   */
  const insertExamplePrompt = (prompt: string) => {
    setMessage(prompt);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  /**
   * Categorización de herramientas
   */
  const toolCategories = tools.reduce((acc, tool) => {
    // Simplificar categorización por nombre de herramienta
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
   * Estadísticas completas de la conversación
   */
  const conversationStats = {
    totalMessages: messages.length,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
    mcpActions: messages.filter(m => m.content?.includes('MCP') || m.content?.includes('herramienta')).length,
    errors: error ? 1 : 0,
    conversationId: null // TODO: Implementar conversationId cuando esté disponible
  };

  const mcpStats = {
    totalTools: tools.length,
    totalResources: resources.length,
    totalPrompts: 0, // TODO: Implementar cuando tengamos prompts
    categorizedTools: Object.keys(toolCategories).length,
    resourceTypes: new Set(resources.map(r => r.mimeType || 'unknown')).size,
    promptsWithArgs: 0 // TODO: Implementar cuando tengamos prompts
  };

  /**
   * Limpiar conversación
   */
  const clearConversation = () => {
    // TODO: Implementar limpieza de conversación
    console.log('Limpiar conversación');
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
            title="Mostrar herramientas MCP"
          >
            <Settings className="icon" />
            MCP Tools
          </button>
          
          <button
            onClick={clearConversation}
            className="clear-button"
            title="Limpiar conversación"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="chat-content">
        {/* Panel lateral MCP */}
        {showMCPTools && (
          <div className="mcp-sidebar">
            <div className="sidebar-section">
              <h3>🔧 Herramientas Disponibles</h3>
              {mcpLoading ? (
                <div className="loading-state">
                  <Loader2 className="icon spinning" />
                  <span>Cargando herramientas...</span>
                </div>
              ) : mcpError ? (
                <div className="error-state">
                  <span>❌ Error: {mcpError}</span>
                  <button onClick={refreshMCPData} className="retry-button">
                    Reintentar
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

            {/* Recursos */}
            {resources.length > 0 && (
              <div className="sidebar-section">
                <h3>📊 Recursos</h3>
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

            {/* Estadísticas */}
            <StatsPanel
              conversationStats={conversationStats}
              mcpStats={mcpStats}
            />
          </div>
        )}

        {/* Área principal del chat */}
        <div className="chat-main">
          {/* Lista de mensajes */}
          <div className="messages-container">
            {messages.length === 0 ? (
              <div className="welcome-state">
                <div className="welcome-content">
                  <h2>¡Bienvenido al MCP Chat Assistant! 👋</h2>
                  <p>
                    Este chat está integrado con el <strong>Model Context Protocol (MCP)</strong> 
                    y permite interactuar con múltiples herramientas y servicios.
                  </p>
                  
                  <div className="features-grid">
                    <div className="feature-card">
                      <span>🧮</span>
                      <h3>Calculadora</h3>
                      <p>Operaciones matemáticas avanzadas</p>
                    </div>
                    <div className="feature-card">
                      <span>🌤️</span>
                      <h3>Clima</h3>
                      <p>Información meteorológica en tiempo real</p>
                    </div>
                    <div className="feature-card">
                      <span>📝</span>
                      <h3>Notas</h3>
                      <p>Gestión de notas y documentos</p>
                    </div>
                    <div className="feature-card">
                      <span>📊</span>
                      <h3>Base de Datos</h3>
                      <p>Consultas SQL dinámicas</p>
                    </div>
                    <div className="feature-card">
                      <span>📁</span>
                      <h3>Archivos</h3>
                      <p>Navegación del sistema de archivos</p>
                    </div>
                  </div>

                  <div className="examples-section">
                    <h3>💡 Prueba estos ejemplos:</h3>
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

          {/* Formulario de entrada */}
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
                placeholder="Escribe tu mensaje aquí... (Enter para enviar, Shift+Enter para nueva línea)"
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
                {tools.length} herramientas MCP disponibles • 
                {messages.length} mensajes en la conversación
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
