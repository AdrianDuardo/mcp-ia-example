/**
 * COMPONENTE MCP TOOL CARD - FRONTEND
 * 
 * Tarjeta que muestra información de una herramienta MCP
 * con opciones de uso y detalles de los parámetros.
 */

import React, { useState } from 'react';
import { ChevronDown, ChevronUp, PlayCircle, Code2 } from 'lucide-react';
import type { MCPTool } from '../types';
import './MCPToolCard.css';

interface MCPToolCardProps {
  tool: MCPTool;
  isSelected: boolean;
  onClick: () => void;
}

export const MCPToolCard: React.FC<MCPToolCardProps> = ({ 
  tool, 
  isSelected, 
  onClick 
}) => {
  const [showExample, setShowExample] = useState(false);

  /**
   * Genera ejemplo de uso de la herramienta
   */
  const generateExample = (): string => {
    switch (tool.name) {
      case 'calculator':
        return 'Calcula la raíz cuadrada de 144';
      case 'weather':
        return '¿Qué tiempo hace en Madrid?';
      case 'notes_create':
        return 'Crea una nota sobre MCP';
      case 'notes_list':
        return 'Lista todas mis notas';
      case 'database_execute':
        return 'Ejecuta: SELECT * FROM usuarios LIMIT 5';
      case 'files_list':
        return 'Lista los archivos del directorio actual';
      case 'files_read':
        return 'Lee el contenido del archivo README.md';
      default:
        return `Usa la herramienta ${tool.title}`;
    }
  };

  /**
   * Determina el color de la categoría por el emoji o nombre
   */
  const getCategoryColor = (): string => {
    const name = tool.name.toLowerCase();
    if (name.includes('calculator') || name.includes('math')) return 'blue';
    if (name.includes('weather') || name.includes('clima')) return 'green';
    if (name.includes('notes') || name.includes('nota')) return 'yellow';
    if (name.includes('database') || name.includes('db')) return 'purple';
    if (name.includes('files') || name.includes('file')) return 'orange';
    return 'gray';
  };

  /**
   * Renderiza los parámetros de entrada de la herramienta
   */
  const renderInputSchema = () => {
    if (!tool.inputSchema?.properties) {
      return <div className="no-params">Sin parámetros</div>;
    }

    const properties = tool.inputSchema.properties;
    const required = (tool.inputSchema.required as string[]) || [];

    return (
      <div className="input-schema">
        <h4>Parámetros:</h4>
        <div className="params-list">
          {Object.entries(properties).map(([paramName, paramSchema]) => {
            const schema = paramSchema as {
              type?: string;
              description?: string;
              enum?: string[];
              default?: string | number | boolean;
            };
            
            return (
              <div 
                key={paramName} 
                className={`param-item ${required.includes(paramName) ? 'required' : 'optional'}`}
              >
                <div className="param-header">
                  <span className="param-name">{paramName}</span>
                  <span className="param-type">{schema.type || 'any'}</span>
                  {required.includes(paramName) && (
                    <span className="required-badge">*</span>
                  )}
                </div>
                {schema.description && (
                  <p className="param-description">{schema.description}</p>
                )}
                {schema.enum && (
                  <div className="param-options">
                    Opciones: {schema.enum.join(', ')}
                  </div>
                )}
                {schema.default !== undefined && (
                  <div className="param-default">
                    Por defecto: {String(schema.default)}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div 
      className={`mcp-tool-card ${isSelected ? 'selected' : ''} ${getCategoryColor()}`}
      onClick={onClick}
    >
      <div className="tool-header">
        <div className="tool-info">
          <h3 className="tool-title">{tool.title}</h3>
          <span className="tool-name">{tool.name}</span>
        </div>
        
        <div className="tool-actions">
          <button
            className="expand-btn"
            onClick={(e) => {
              e.stopPropagation();
              setShowExample(!showExample);
            }}
            title={showExample ? 'Ocultar detalles' : 'Ver detalles'}
          >
            {showExample ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      <p className="tool-description">{tool.description}</p>

      {/* Detalles expandidos */}
      {showExample && (
        <div className="tool-details">
          {renderInputSchema()}
          
          <div className="tool-example">
            <h4>
              <PlayCircle size={16} />
              Ejemplo de uso:
            </h4>
            <div className="example-prompt">
              "{generateExample()}"
            </div>
          </div>

          {/* Información técnica */}
          <div className="tool-technical">
            <h4>
              <Code2 size={16} />
              Información técnica:
            </h4>
            <div className="technical-info">
              <div className="tech-item">
                <span className="tech-label">Nombre interno:</span>
                <code>{tool.name}</code>
              </div>
              {tool.inputSchema && (
                <div className="tech-item">
                  <span className="tech-label">Esquema:</span>
                  <code>JSON Schema</code>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Indicador de selección */}
      {isSelected && (
        <div className="selection-indicator">
          ✓ Seleccionada
        </div>
      )}
    </div>
  );
};
