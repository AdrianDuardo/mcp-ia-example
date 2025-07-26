/**
 * SERVICIO DE CHAT - TUTORIAL MCP
 * 
 * Este servicio es el CEREBRO del sistema. Integra:
 * 1. OpenAI API para generar respuestas inteligentes
 * 2. Servidor MCP para ejecutar herramientas
 * 3. Análisis de intenciones del usuario
 * 
 * 🧠 FUNCIONALIDADES:
 * - Detecta cuándo usar herramientas MCP
 * - Ejecuta múltiples herramientas en secuencia
 * - Mantiene contexto de conversación
 * - Formatea respuestas de forma natural
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type { MCPClientService } from './mcp-client';
import type {
  ChatMessage,
  ChatResponse,
  MCPAction
} from '../../shared/types.js';

export class ChatService {
  private openai: OpenAI;
  private mcpClient: MCPClientService;
  private toolCallCount: number = 0;
  private responseTimes: number[] = [];

  constructor(mcpClient: MCPClientService) {
    this.mcpClient = mcpClient;

    // Inicializar OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('✅ Servicio de chat inicializado con OpenAI');
  }

  /**
   * Procesa un mensaje del usuario y genera una respuesta inteligente
   */
  async processMessage(
    userMessage: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const newConversationId = conversationId || uuidv4();
    const mcpActions: MCPAction[] = [];

    try {
      console.log(`💬 Procesando mensaje: "${userMessage.substring(0, 50)}..."`);

      // 1. ANALIZAR INTENCIÓN DEL USUARIO
      const intention = await this.analyzeUserIntention(userMessage);
      console.log(`🎯 Intención detectada:`, intention);

      // 2. EJECUTAR HERRAMIENTAS MCP SI ES NECESARIO
      let mcpResults = '';
      if (intention.needsMCPTools && intention.suggestedTools.length > 0) {
        mcpResults = await this.executeMCPTools(intention.suggestedTools, mcpActions);
      }

      // 3. GENERAR RESPUESTA CON OPENAI
      const systemPrompt = this.buildSystemPrompt(mcpResults);
      const assistantResponse = await this.generateOpenAIResponse(
        userMessage,
        systemPrompt,
        mcpResults
      );

      // 4. CREAR MENSAJE DE RESPUESTA
      const responseMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          mcpTool: mcpActions.length > 0 ? mcpActions[0].name : undefined
        }
      };

      // 5. REGISTRAR ESTADÍSTICAS
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      if (mcpActions.length > 0) this.toolCallCount++;

      console.log(`✅ Respuesta generada en ${responseTime}ms`);

      return {
        message: responseMessage,
        conversationId: newConversationId,
        mcpActions
      };

    } catch (error) {
      console.error('❌ Error procesando mensaje:', error);

      // Mensaje de error amigable
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Lo siento, ocurrió un error procesando tu mensaje: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        timestamp: new Date().toISOString(),
        metadata: { error: true }
      };

      return {
        message: errorMessage,
        conversationId: newConversationId,
        mcpActions
      };
    }
  }

  /**
   * Analiza la intención del usuario para determinar qué herramientas usar
   */
  private async analyzeUserIntention(message: string): Promise<{
    needsMCPTools: boolean;
    suggestedTools: Array<{ name: string; arguments: Record<string, any> }>;
    category: string;
  }> {
    try {
      // Obtener herramientas disponibles
      const availableTools = await this.mcpClient.listTools();

      const analysisPrompt = `
Analiza el siguiente mensaje del usuario y determina si necesita usar herramientas MCP.

Herramientas disponibles:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

Mensaje del usuario: "${message}"

Responde en JSON con:
{
  "needsMCPTools": boolean,
  "suggestedTools": [{"name": "nombre_herramienta", "arguments": {...}}],
  "category": "calculadora|clima|notas|database|archivos|general"
}

Ejemplos de detección:
- "calcula 15 + 30" → calculadora con operacion: "suma", numero1: 15, numero2: 30
- "cómo está el clima en Madrid" → obtener_clima con ciudad: "Madrid"
- "crea una nota sobre mi reunión" → crear_nota con titulo y contenido
- "busca notas sobre proyecto" → buscar_notas con query: "proyecto"
- "ejecuta SELECT * FROM usuarios" → ejecutar_sql con sql: "SELECT * FROM usuarios"
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1, // Baja creatividad para análisis preciso
        max_tokens: 500
      });

      const analysis = JSON.parse(response.choices[0].message.content || '{}');
      return {
        needsMCPTools: analysis.needsMCPTools || false,
        suggestedTools: analysis.suggestedTools || [],
        category: analysis.category || 'general'
      };

    } catch (error) {
      console.error('Error analizando intención:', error);
      return {
        needsMCPTools: false,
        suggestedTools: [],
        category: 'general'
      };
    }
  }

  /**
   * Ejecuta las herramientas MCP sugeridas
   */
  private async executeMCPTools(
    suggestedTools: Array<{ name: string; arguments: Record<string, any> }>,
    mcpActions: MCPAction[]
  ): Promise<string> {
    let results = '';

    for (const tool of suggestedTools) {
      try {
        console.log(`🔧 Ejecutando herramienta: ${tool.name}`);

        const action: MCPAction = {
          type: 'tool_call',
          name: tool.name,
          arguments: tool.arguments
        };

        const result = await this.mcpClient.callTool(tool.name, tool.arguments);
        action.result = result;
        mcpActions.push(action);

        // Formatear resultado para incluir en el contexto
        if (result && result.content) {
          const content = Array.isArray(result.content)
            ? result.content.map((c: any) => c.text || c).join('\n')
            : result.content;

          results += `\n=== Resultado de ${tool.name} ===\n${content}\n`;
        }

      } catch (error) {
        console.error(`Error ejecutando ${tool.name}:`, error);

        const action: MCPAction = {
          type: 'tool_call',
          name: tool.name,
          arguments: tool.arguments,
          error: error instanceof Error ? error.message : 'Error desconocido'
        };
        mcpActions.push(action);

        results += `\n=== Error en ${tool.name} ===\n${error instanceof Error ? error.message : 'Error desconocido'}\n`;
      }
    }

    return results;
  }

  /**
   * Construye el prompt del sistema con contexto MCP
   */
  private buildSystemPrompt(mcpResults: string): string {
    return `Eres un asistente inteligente que puede usar herramientas MCP (Model Context Protocol) para ayudar a los usuarios.

HERRAMIENTAS DISPONIBLES:
- Calculadora: para operaciones matemáticas
- Clima: para información meteorológica
- Notas: para crear y buscar notas
- Base de datos: para consultas SQL
- Archivos: para leer archivos del sistema

INSTRUCCIONES:
1. Responde de forma natural y amigable
2. Si se ejecutaron herramientas MCP, integra los resultados en tu respuesta
3. Explica lo que hiciste y los resultados obtenidos
4. Si hubo errores, explícalos de forma comprensible
5. Ofrece sugerencias adicionales cuando sea apropiado
6. Mantén un tono conversacional y útil

${mcpResults ? `RESULTADOS DE HERRAMIENTAS:\n${mcpResults}` : ''}

Responde basándote en la información disponible y los resultados obtenidos.`;
  }

  /**
   * Genera respuesta usando OpenAI GPT
   */
  private async generateOpenAIResponse(
    userMessage: string,
    systemPrompt: string,
    mcpResults: string
  ): Promise<string> {
    try {
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ];

      // Si hay resultados MCP, incluirlos como contexto adicional
      if (mcpResults) {
        messages.push({
          role: 'assistant',
          content: `He ejecutado las herramientas necesarias. Aquí están los resultados:\n${mcpResults}`
        });
        messages.push({
          role: 'user',
          content: 'Por favor, proporciona una respuesta natural basada en estos resultados.'
        });
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o', // Usar el modelo más reciente
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return response.choices[0].message.content || 'Lo siento, no pude generar una respuesta.';

    } catch (error) {
      console.error('Error generando respuesta OpenAI:', error);

      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('Error de autenticación con OpenAI. Verifica tu API key.');
      }

      throw new Error(`Error generando respuesta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene estadísticas del servicio
   */
  getMCPToolCallCount(): number {
    return this.toolCallCount;
  }

  getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / this.responseTimes.length);
  }

  /**
   * Reinicia estadísticas
   */
  resetStats(): void {
    this.toolCallCount = 0;
    this.responseTimes = [];
  }
}
