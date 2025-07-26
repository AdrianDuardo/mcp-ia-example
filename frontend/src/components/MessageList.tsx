/**
 * COMPONENTE MESSAGE LIST - FRONTEND
 * 
 * Lista de mensajes del chat con soporte para renderizado de código,
 * acciones MCP y diferentes tipos de contenido.
 */

import React, { useEffect, useRef } from 'react';
import { User, Bot, Settings, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import type { ChatMessage } from '../types';
import './MessageList.css';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({ messages, isLoading }) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /**
   * Auto-scroll al final cuando lleguen nuevos mensajes
   */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  /**
   * Formatea el timestamp para mostrar
   */
  const formatTimestamp = (timestamp: string): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  /**
   * Detecta si el contenido tiene código
   */
  const hasCodeBlock = (content: string): boolean => {
    return content.includes('```') || content.includes('`');
  };

  /**
   * Renderiza contenido con formato de código
   */
  const renderContent = (content: string): React.ReactElement => {
    if (!hasCodeBlock(content)) {
      return <div className="message-text">{content}</div>;
    }

    // Separar bloques de código del texto normal
    const parts = content.split(/(```[\s\S]*?```|`[^`]*`)/);
    
    return (
      <div className="message-text">
        {parts.map((part, index) => {
          if (part.startsWith('```') && part.endsWith('```')) {
            // Bloque de código multilínea
            const code = part.slice(3, -3);
            const lines = code.split('\n');
            const language = lines[0].trim();
            const codeContent = lines.slice(1).join('\n');
            
            return (
              <div key={index} className="code-block">
                {language && (
                  <div className="code-language">{language}</div>
                )}
                <pre>
                  <code>{codeContent}</code>
                </pre>
              </div>
            );
          } else if (part.startsWith('`') && part.endsWith('`')) {
            // Código inline
            return (
              <code key={index} className="inline-code">
                {part.slice(1, -1)}
              </code>
            );
          } else {
            // Texto normal
            return <span key={index}>{part}</span>;
          }
        })}
      </div>
    );
  };

  /**
   * Renderiza metadata del mensaje (herramientas MCP, errores, etc.)
   */
  const renderMetadata = (metadata?: { 
    mcpTool?: string; 
    mcpResult?: boolean; 
    error?: boolean; 
    responseTime?: number; 
    tokens?: number; 
  }): React.ReactElement | null => {
    if (!metadata) return null;

    return (
      <div className="message-metadata">
        {/* Herramienta MCP utilizada */}
        {metadata.mcpTool && (
          <div className="mcp-tool-info">
            <Settings className="icon" />
            <span>Herramienta: {metadata.mcpTool}</span>
            {metadata.mcpResult && (
              <span className="mcp-result">
                <CheckCircle className="icon success" />
                Ejecutada correctamente
              </span>
            )}
          </div>
        )}

        {/* Error */}
        {metadata.error && (
          <div className="error-info">
            <AlertCircle className="icon error" />
            <span>Error en el mensaje</span>
          </div>
        )}

        {/* Tiempo de respuesta */}
        {metadata.responseTime && (
          <div className="response-time">
            <span>Tiempo: {metadata.responseTime}ms</span>
          </div>
        )}

        {/* Tokens utilizados */}
        {metadata.tokens && (
          <div className="tokens-info">
            <span>Tokens: {metadata.tokens}</span>
          </div>
        )}
      </div>
    );
  };

  /**
   * Renderiza un mensaje individual
   */
  const renderMessage = (message: ChatMessage): React.ReactElement => {
    const isUser = message.role === 'user';
    const isError = message.metadata?.error;
    const hasMCPTool = message.metadata?.mcpTool;

    return (
      <div
        key={message.id}
        className={`message ${isUser ? 'user' : 'assistant'} ${isError ? 'error' : ''} ${hasMCPTool ? 'mcp-enhanced' : ''}`}
      >
        <div className="message-header">
          <div className="message-avatar">
            {isUser ? (
              <User className="icon" />
            ) : (
              <Bot className="icon" />
            )}
          </div>
          
          <div className="message-info">
            <span className="message-role">
              {isUser ? 'Usuario' : 'Asistente'}
            </span>
            <span className="message-time">
              {formatTimestamp(message.timestamp)}
            </span>
          </div>
        </div>

        <div className="message-body">
          {renderContent(message.content)}
          {renderMetadata(message.metadata)}
        </div>
      </div>
    );
  };

  return (
    <div className="message-list">
      {messages.length === 0 ? (
        <div className="empty-state">
          <Bot className="empty-icon" />
          <p>No hay mensajes aún. ¡Comienza la conversación!</p>
        </div>
      ) : (
        <>
          {messages.map(renderMessage)}
          
          {/* Indicador de carga */}
          {isLoading && (
            <div className="message assistant loading">
              <div className="message-header">
                <div className="message-avatar">
                  <Bot className="icon" />
                </div>
                <div className="message-info">
                  <span className="message-role">Asistente</span>
                  <span className="message-time">Escribiendo...</span>
                </div>
              </div>
              
              <div className="message-body">
                <div className="typing-indicator">
                  <Loader2 className="icon spinning" />
                  <span>Procesando con herramientas MCP...</span>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Referencia para auto-scroll */}
      <div ref={messagesEndRef} />
    </div>
  );
};
