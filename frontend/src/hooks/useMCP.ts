/**
 * HOOK MCP - FRONTEND
 * 
 * Hook personalizado para manejar herramientas, recursos y prompts MCP.
 * Proporciona acceso a todas las capacidades del servidor MCP.
 */

import { useState, useEffect, useCallback } from 'react';
import apiService from '../services/api';
import type { MCPTool, MCPResource, MCPPrompt, UseMCPReturn } from '../types';

export const useMCP = (): UseMCPReturn => {
  const [tools, setTools] = useState<MCPTool[]>([]);
  const [resources, setResources] = useState<MCPResource[]>([]);
  const [prompts, setPrompts] = useState<MCPPrompt[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Carga todos los datos MCP
   */
  const refreshMCPData = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      // Cargar datos en paralelo
      const [toolsData, resourcesData, promptsData] = await Promise.allSettled([
        apiService.getMCPTools(),
        apiService.getMCPResources(),
        apiService.getMCPPrompts()
      ]);

      // Procesar herramientas
      if (toolsData.status === 'fulfilled') {
        setTools(toolsData.value);
        console.log('🔧 Herramientas MCP cargadas:', toolsData.value.length);
      } else {
        console.error('❌ Error cargando herramientas:', toolsData.reason);
      }

      // Procesar recursos
      if (resourcesData.status === 'fulfilled') {
        setResources(resourcesData.value);
        console.log('📊 Recursos MCP cargados:', resourcesData.value.length);
      } else {
        console.error('❌ Error cargando recursos:', resourcesData.reason);
      }

      // Procesar prompts
      if (promptsData.status === 'fulfilled') {
        setPrompts(promptsData.value);
        console.log('💬 Prompts MCP cargados:', promptsData.value.length);
      } else {
        console.error('❌ Error cargando prompts:', promptsData.reason);
      }

      // Si todas fallaron, mostrar error
      if (toolsData.status === 'rejected' &&
        resourcesData.status === 'rejected' &&
        promptsData.status === 'rejected') {
        throw new Error('No se pudo cargar ningún dato MCP');
      }

    } catch (err) {
      console.error('❌ Error cargando datos MCP:', err);
      setError(err instanceof Error ? err.message : 'Error cargando datos MCP');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Carga datos MCP al montar el componente
   */
  useEffect(() => {
    refreshMCPData();
  }, [refreshMCPData]);

  /**
   * Busca herramientas por nombre o descripción
   */
  const searchTools = useCallback((query: string): MCPTool[] => {
    if (!query.trim()) return tools;

    const searchTerm = query.toLowerCase();
    return tools.filter(tool =>
      tool.name.toLowerCase().includes(searchTerm) ||
      tool.title.toLowerCase().includes(searchTerm) ||
      tool.description.toLowerCase().includes(searchTerm)
    );
  }, [tools]);

  /**
   * Busca recursos por nombre o descripción
   */
  const searchResources = useCallback((query: string): MCPResource[] => {
    if (!query.trim()) return resources;

    const searchTerm = query.toLowerCase();
    return resources.filter(resource =>
      resource.name.toLowerCase().includes(searchTerm) ||
      (resource.description && resource.description.toLowerCase().includes(searchTerm)) ||
      resource.uri.toLowerCase().includes(searchTerm)
    );
  }, [resources]);

  /**
   * Busca prompts por nombre o descripción
   */
  const searchPrompts = useCallback((query: string): MCPPrompt[] => {
    if (!query.trim()) return prompts;

    const searchTerm = query.toLowerCase();
    return prompts.filter(prompt =>
      prompt.name.toLowerCase().includes(searchTerm) ||
      prompt.title.toLowerCase().includes(searchTerm) ||
      prompt.description.toLowerCase().includes(searchTerm)
    );
  }, [prompts]);

  /**
   * Obtiene una herramienta específica por nombre
   */
  const getTool = useCallback((name: string): MCPTool | undefined => {
    return tools.find(tool => tool.name === name);
  }, [tools]);

  /**
   * Obtiene un recurso específico por URI
   */
  const getResource = useCallback((uri: string): MCPResource | undefined => {
    return resources.find(resource => resource.uri === uri);
  }, [resources]);

  /**
   * Obtiene un prompt específico por nombre
   */
  const getPrompt = useCallback((name: string): MCPPrompt | undefined => {
    return prompts.find(prompt => prompt.name === name);
  }, [prompts]);

  /**
   * Obtiene herramientas agrupadas por categoría
   */
  const getToolsByCategory = useCallback(() => {
    const categories: { [key: string]: MCPTool[] } = {};

    tools.forEach(tool => {
      // Extraer categoría del título o usar el primer emoji como categoría
      const category = tool.title.split(' ')[0] || '🔧';

      if (!categories[category]) {
        categories[category] = [];
      }
      categories[category].push(tool);
    });

    return categories;
  }, [tools]);

  /**
   * Obtiene estadísticas de MCP
   */
  const getMCPStats = useCallback(() => {
    return {
      totalTools: tools.length,
      totalResources: resources.length,
      totalPrompts: prompts.length,
      categorizedTools: Object.keys(getToolsByCategory()).length,
      resourceTypes: [...new Set(resources.map(r => r.mimeType || 'unknown'))].length,
      promptsWithArgs: prompts.filter(p => p.arguments && p.arguments.length > 0).length
    };
  }, [tools, resources, prompts, getToolsByCategory]);

  type MCPStats = {
    totalTools: number;
    totalResources: number;
    totalPrompts: number;
    categorizedTools: number;
    resourceTypes: number;
    promptsWithArgs: number;
  };

  /**
   * Valida si una herramienta está disponible
   */
  const isToolAvailable = useCallback((toolName: string): boolean => {
    return tools.some(tool => tool.name === toolName);
  }, [tools]);

  /**
   * Valida si un recurso está disponible
   */
  const isResourceAvailable = useCallback((resourceUri: string): boolean => {
    return resources.some(resource => resource.uri === resourceUri);
  }, [resources]);

  return {
    tools,
    resources,
    prompts,
    isLoading,
    error,
    refreshMCPData,
    // Funciones adicionales
    searchTools,
    searchResources,
    searchPrompts,
    getTool,
    getResource,
    getPrompt,
    getToolsByCategory,
    getMCPStats,
    isToolAvailable,
    isResourceAvailable
  } as UseMCPReturn & {
    searchTools: (query: string) => MCPTool[];
    searchResources: (query: string) => MCPResource[];
    searchPrompts: (query: string) => MCPPrompt[];
    getTool: (name: string) => MCPTool | undefined;
    getResource: (uri: string) => MCPResource | undefined;
    getPrompt: (name: string) => MCPPrompt | undefined;
    getToolsByCategory: () => { [key: string]: MCPTool[] };
    getMCPStats: () => MCPStats;
    isToolAvailable: (toolName: string) => boolean;
    isResourceAvailable: (resourceUri: string) => boolean;
  };
};
