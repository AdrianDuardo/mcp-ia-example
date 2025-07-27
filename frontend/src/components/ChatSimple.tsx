/**
 * COMPONENTE CHAT SIMPLIFICADO - FRONTEND
 * 
 * Versión básica del chat para demostrar integración MCP
 */

import React, { useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import './Chat.css';

export const Chat: React.FC = () => {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Array<{ role: string; content: string; id: string }>>([]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!message.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: message.trim()
    };

    setMessages(prev => [...prev, userMessage]);
    setMessage('');
    setIsLoading(true);

    try {
      // Aquí iría la integración real con el backend
      const response = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: null
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();
      
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.data?.message?.content || 'Lo siento, no pude procesar tu mensaje.'
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al procesar tu mensaje.'
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="chat-container">
      {/* Header */}
      <div className="chat-header">
        <div className="header-title">
          <h1>MCP Chat Assistant</h1>
          <span className="subtitle">
            Powered by OpenAI GPT-4 + Model Context Protocol
          </span>
        </div>
        
        <div className="header-actions">
          <button
            onClick={() => setMessages([])}
            className="clear-button"
            title="Limpiar conversación"
          >
            Limpiar
          </button>
        </div>
      </div>

      <div className="chat-content">
        <div className="chat-main">
          {/* Messages */}
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
                      {[
                        '🧮 Calcula la raíz cuadrada de 144',
                        '🌤️ ¿Qué tiempo hace en Madrid?',
                        '📝 Crea una nota sobre MCP',
                        '📊 Ejecuta una consulta SQL',
                        '📁 Lista los archivos del directorio'
                      ].map((prompt, index) => (
                        <button
                          key={index}
                          onClick={() => setMessage(prompt)}
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
              <div className="message-list">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`message ${msg.role}`}
                  >
                    <div className="message-content">
                      <strong>{msg.role === 'user' ? 'Usuario' : 'Asistente'}:</strong>
                      <p>{msg.content}</p>
                    </div>
                  </div>
                ))}
                
                {isLoading && (
                  <div className="message assistant loading">
                    <div className="message-content">
                      <strong>Asistente:</strong>
                      <div className="typing-indicator">
                        <Loader2 className="icon spinning" />
                        <span>Procesando con herramientas MCP...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Input */}
          <div className="input-container">
            <form onSubmit={handleSubmit} className="input-form">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu mensaje aquí..."
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
                {messages.length} mensajes en la conversación
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
