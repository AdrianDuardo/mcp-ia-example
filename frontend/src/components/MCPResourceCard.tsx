/**
 * COMPONENTE MCP RESOURCE CARD - FRONTEND
 * 
 * Tarjeta que muestra información de un recurso MCP
 * con opciones de visualización y acceso.
 */

import React from 'react';
import { FileText, Database, Globe, FolderOpen, Image } from 'lucide-react';
import type { MCPResource } from '../types';
import './MCPResourceCard.css';

interface MCPResourceCardProps {
  resource: MCPResource;
}

export const MCPResourceCard: React.FC<MCPResourceCardProps> = ({ resource }) => {
  /**
   * Determina el icono según el tipo de recurso
   */
  const getResourceIcon = () => {
    const uri = resource.uri.toLowerCase();
    const mimeType = resource.mimeType?.toLowerCase();

    // Por URI
    if (uri.startsWith('file://')) return <FolderOpen className="icon" />;
    if (uri.startsWith('http://') || uri.startsWith('https://')) return <Globe className="icon" />;
    if (uri.startsWith('db://') || uri.includes('database')) return <Database className="icon" />;
    
    // Por MIME type
    if (mimeType?.startsWith('image/')) return <Image className="icon" />;
    if (mimeType?.includes('text') || mimeType?.includes('json')) return <FileText className="icon" />;
    
    // Por defecto
    return <FileText className="icon" />;
  };

  /**
   * Obtiene el color de fondo según el tipo
   */
  const getResourceColor = (): string => {
    const uri = resource.uri.toLowerCase();
    
    if (uri.startsWith('file://')) return 'orange';
    if (uri.startsWith('http://') || uri.startsWith('https://')) return 'blue';
    if (uri.startsWith('db://')) return 'purple';
    return 'gray';
  };

  /**
   * Extrae el nombre del recurso de la URI
   */
  const getResourceDisplayName = (): string => {
    if (resource.name && resource.name !== resource.uri) {
      return resource.name;
    }
    
    // Extraer nombre de la URI
    try {
      const url = new URL(resource.uri);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      return fileName || url.hostname || resource.uri;
    } catch {
      // Si no es una URL válida, usar el último segmento
      const parts = resource.uri.split('/');
      return parts[parts.length - 1] || resource.uri;
    }
  };

  /**
   * Formatea el tipo MIME para mostrar
   */
  const formatMimeType = (mimeType?: string): string => {
    if (!mimeType) return 'Desconocido';
    
    const typeMap: { [key: string]: string } = {
      'text/plain': 'Texto plano',
      'text/html': 'HTML',
      'text/css': 'CSS',
      'text/javascript': 'JavaScript',
      'application/json': 'JSON',
      'application/xml': 'XML',
      'application/pdf': 'PDF',
      'image/png': 'Imagen PNG',
      'image/jpeg': 'Imagen JPEG',
      'image/gif': 'Imagen GIF'
    };

    return typeMap[mimeType] || mimeType;
  };

  /**
   * Trunca URIs muy largas
   */
  const truncateUri = (uri: string, maxLength: number = 50): string => {
    if (uri.length <= maxLength) return uri;
    const start = uri.substring(0, maxLength / 2 - 2);
    const end = uri.substring(uri.length - maxLength / 2 + 2);
    return `${start}...${end}`;
  };

  return (
    <div className={`mcp-resource-card ${getResourceColor()}`}>
      <div className="resource-header">
        <div className="resource-icon">
          {getResourceIcon()}
        </div>
        
        <div className="resource-info">
          <h4 className="resource-name">{getResourceDisplayName()}</h4>
          <span className="resource-type">{formatMimeType(resource.mimeType)}</span>
        </div>
      </div>

      {resource.description && (
        <p className="resource-description">{resource.description}</p>
      )}

      <div className="resource-details">
        <div className="resource-uri">
          <span className="label">URI:</span>
          <code className="uri-value" title={resource.uri}>
            {truncateUri(resource.uri)}
          </code>
        </div>
        
        {resource.mimeType && (
          <div className="resource-mime">
            <span className="label">Tipo:</span>
            <span className="mime-value">{resource.mimeType}</span>
          </div>
        )}
      </div>

      {/* Acciones del recurso */}
      <div className="resource-actions">
        <button 
          className="action-btn view"
          onClick={() => {
            // Acción para ver el recurso
            console.log('Ver recurso:', resource.uri);
          }}
          title="Ver recurso"
        >
          Ver
        </button>
        
        <button 
          className="action-btn copy"
          onClick={() => {
            navigator.clipboard.writeText(resource.uri);
          }}
          title="Copiar URI"
        >
          Copiar URI
        </button>
      </div>
    </div>
  );
};
