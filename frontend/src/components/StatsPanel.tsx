/**
 * COMPONENTE STATS PANEL - FRONTEND
 * 
 * Panel de estadísticas que muestra información sobre
 * la conversación actual y el estado del servidor MCP.
 */

import React from 'react';
import { BarChart3, MessageSquare, Settings, Activity } from 'lucide-react';
import './StatsPanel.css';

interface StatsPanelProps {
  conversationStats: {
    totalMessages: number;
    userMessages: number;
    assistantMessages: number;
    mcpActions: number;
    errors: number;
    conversationId: string | null;
  };
  mcpStats: {
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
    categorizedTools: number;
    resourceTypes: number;
    promptsWithArgs: number;
  };
}

export const StatsPanel: React.FC<StatsPanelProps> = ({ 
  conversationStats, 
  mcpStats 
}) => {
  /**
   * Calcula el porcentaje de éxito de las acciones MCP
   */
  const getMCPSuccessRate = (): number => {
    if (conversationStats.mcpActions === 0) return 100;
    const successfulActions = conversationStats.mcpActions - conversationStats.errors;
    return Math.round((successfulActions / conversationStats.mcpActions) * 100);
  };

  /**
   * Determina el estado del sistema basado en errores
   */
  const getSystemStatus = (): { status: string; color: string; label: string } => {
    const errorRate = conversationStats.totalMessages > 0 
      ? (conversationStats.errors / conversationStats.totalMessages) * 100 
      : 0;

    if (errorRate === 0) return { status: 'excellent', color: 'green', label: 'Excelente' };
    if (errorRate < 5) return { status: 'good', color: 'blue', label: 'Bueno' };
    if (errorRate < 15) return { status: 'warning', color: 'yellow', label: 'Advertencia' };
    return { status: 'error', color: 'red', label: 'Problemático' };
  };

  const systemStatus = getSystemStatus();
  const mcpSuccessRate = getMCPSuccessRate();

  // Función para crear clases de progreso
  const getProgressClass = (value: number): string => {
    const percentage = Math.min(100, Math.max(0, value));
    const rounded = Math.round(percentage / 10) * 10;
    return `progress-${rounded}`;
  };

  return (
    <div className="stats-panel">
      <div className="panel-header">
        <BarChart3 className="icon" />
        <h3>Estadísticas</h3>
      </div>

      {/* Estadísticas de conversación */}
      <div className="stats-section">
        <h4>
          <MessageSquare className="section-icon" />
          Conversación
        </h4>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{conversationStats.totalMessages}</span>
            <span className="stat-label">Total mensajes</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{conversationStats.userMessages}</span>
            <span className="stat-label">Usuario</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{conversationStats.assistantMessages}</span>
            <span className="stat-label">Asistente</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{conversationStats.mcpActions}</span>
            <span className="stat-label">Acciones MCP</span>
          </div>
        </div>

        {/* Estado del sistema */}
        <div className="system-status">
          <div className="status-header">
            <Activity className="status-icon" />
            <span>Estado del sistema</span>
          </div>
          <div className={`status-badge ${systemStatus.color}`}>
            {systemStatus.label}
          </div>
          {conversationStats.errors > 0 && (
            <div className="error-count">
              {conversationStats.errors} error{conversationStats.errors !== 1 ? 'es' : ''}
            </div>
          )}
        </div>
      </div>

      {/* Estadísticas MCP */}
      <div className="stats-section">
        <h4>
          <Settings className="section-icon" />
          Servidor MCP
        </h4>
        
        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-value">{mcpStats.totalTools}</span>
            <span className="stat-label">Herramientas</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{mcpStats.totalResources}</span>
            <span className="stat-label">Recursos</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{mcpStats.totalPrompts}</span>
            <span className="stat-label">Prompts</span>
          </div>
          
          <div className="stat-item">
            <span className="stat-value">{mcpStats.categorizedTools}</span>
            <span className="stat-label">Categorías</span>
          </div>
        </div>

        {/* Métricas adicionales */}
        <div className="additional-metrics">
          <div className="metric-row">
            <span className="metric-label">Tasa de éxito MCP:</span>
            <span className={`metric-value ${mcpSuccessRate >= 90 ? 'excellent' : mcpSuccessRate >= 70 ? 'good' : 'warning'}`}>
              {mcpSuccessRate}%
            </span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Tipos de recursos:</span>
            <span className="metric-value">{mcpStats.resourceTypes}</span>
          </div>
          
          <div className="metric-row">
            <span className="metric-label">Prompts con argumentos:</span>
            <span className="metric-value">{mcpStats.promptsWithArgs}</span>
          </div>
        </div>
      </div>

      {/* Información de sesión */}
      {conversationStats.conversationId && (
        <div className="stats-section">
          <h4>Sesión</h4>
          <div className="session-info">
            <div className="session-id">
              ID: {conversationStats.conversationId.slice(0, 8)}...
            </div>
          </div>
        </div>
      )}

      {/* Indicadores de rendimiento */}
      <div className="performance-indicators">
        <div className="indicator">
          <div className="indicator-label">Herramientas activas</div>
          <div className={`indicator-bar ${mcpStats.totalTools > 0 ? 'active' : 'inactive'}`}>
            <div 
              className={`indicator-fill ${getProgressClass((mcpStats.totalTools / 10) * 100)}`}
            />
          </div>
        </div>
        
        <div className="indicator">
          <div className="indicator-label">Actividad MCP</div>
          <div className={`indicator-bar ${conversationStats.mcpActions > 0 ? 'active' : 'inactive'}`}>
            <div 
              className={`indicator-fill ${getProgressClass((conversationStats.mcpActions / 5) * 100)}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
