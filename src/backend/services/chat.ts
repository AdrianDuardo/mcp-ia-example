/**
 * CHAT SERVICE - MCP TUTORIAL
 * 
 * This service is the BRAIN of the system. Integrates:
 * 1. OpenAI API to generate intelligent responses
 * 2. MCP Server to execute tools
 * 3. User intention analysis
 * 
 * 🧠 FUNCTIONALITIES:
 * - Detects when to use MCP tools
 * - Executes multiple tools in sequence
 * - Maintains conversation context
 * - Formats responses naturally
 */

import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import type { MCPClientService } from './mcp-client.js';
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

    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    console.log('✅ Chat service initialized with OpenAI');
  }

  /**
   * Processes a user message and generates an intelligent response
   */
  async processMessage(
    userMessage: string,
    conversationId?: string
  ): Promise<ChatResponse> {
    const startTime = Date.now();
    const newConversationId = conversationId || uuidv4();
    const mcpActions: MCPAction[] = [];

    try {
      console.log(`💬 Processing message: "${userMessage.substring(0, 50)}..."`);

      // 1. ANALYZE USER INTENTION
      const intention = await this.analyzeUserIntention(userMessage);
      console.log(`🎯 Detected intention:`, intention);

      // 2. EXECUTE MCP TOOLS IF NECESSARY
      let mcpResults = '';
      if (intention.needsMCPTools && intention.suggestedTools.length > 0) {
        mcpResults = await this.executeMCPTools(intention.suggestedTools, mcpActions);
      }

      // 3. GENERATE RESPONSE WITH OPENAI
      const systemPrompt = this.buildSystemPrompt(mcpResults);
      const assistantResponse = await this.generateOpenAIResponse(
        userMessage,
        systemPrompt,
        mcpResults
      );

      // 4. CREATE RESPONSE MESSAGE
      const responseMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: assistantResponse,
        timestamp: new Date().toISOString(),
        metadata: {
          mcpTool: mcpActions.length > 0 ? mcpActions[0].name : undefined
        }
      };

      // 5. REGISTER STATISTICS
      const responseTime = Date.now() - startTime;
      this.responseTimes.push(responseTime);
      if (mcpActions.length > 0) this.toolCallCount++;

      console.log(`✅ Response generated in ${responseTime}ms`);

      return {
        message: responseMessage,
        conversationId: newConversationId,
        mcpActions
      };

    } catch (error) {
      console.error('❌ Error processing message:', error);

      // Friendly error message
      const errorMessage: ChatMessage = {
        id: uuidv4(),
        role: 'assistant',
        content: `Sorry, an error occurred processing your message: ${error instanceof Error ? error.message : 'Unknown error'}`,
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
   * Analyzes user intention to determine which tools to use
   */
  private async analyzeUserIntention(message: string): Promise<{
    needsMCPTools: boolean;
    suggestedTools: Array<{ name: string; arguments: Record<string, any> }>;
    category: string;
  }> {
    try {
      // Get available tools
      const availableTools = await this.mcpClient.listTools();

      const analysisPrompt = `
Analyze the following user message and determine if it needs to use MCP tools.

Available tools:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

User message: "${message}"

IMPORTANT: Respond ONLY with a valid JSON object, without additional text.

Required format:
{
  "needsMCPTools": boolean,
  "suggestedTools": [{"name": "tool_name", "arguments": {...}}],
  "category": "calculator|weather|notes|database|files|general"
}

EXACT PARAMETERS by tool:
- calculator: {"operation": "add|subtract|multiply|divide", "number1": number, "number2": number}
- get_weather: {"city": "string", "country": "string (optional)"}
- create_note: {"title": "string", "content": "string", "category": "string (optional)"}
- search_notes: {"query": "string (optional)", "category": "string (optional)", "limit": number}
- get_note: {"id": number}
- update_note: {"id": number, "title": "string (optional)", "content": "string (optional)", "category": "string (optional)"}
- delete_note: {"id": number}
- execute_sql: {"sql": "string"}

Examples:
- For "calculate 15 + 30":
{"needsMCPTools": true, "suggestedTools": [{"name": "calculator", "arguments": {"operation": "add", "number1": 15, "number2": 30}}], "category": "calculator"}

- For "hello, how are you":
{"needsMCPTools": false, "suggestedTools": [], "category": "general"}

- For "weather in Madrid":
{"needsMCPTools": true, "suggestedTools": [{"name": "get_weather", "arguments": {"city": "Madrid"}}], "category": "weather"}

- For "show database users":
{"needsMCPTools": true, "suggestedTools": [{"name": "execute_sql", "arguments": {"sql": "SELECT * FROM users"}}], "category": "database"}

- For "get note 5" or "show note with id 5":
{"needsMCPTools": true, "suggestedTools": [{"name": "get_note", "arguments": {"id": 5}}], "category": "notes"}

- For "update note 3 title to New Title":
{"needsMCPTools": true, "suggestedTools": [{"name": "update_note", "arguments": {"id": 3, "title": "New Title"}}], "category": "notes"}

- For "delete note 2":
{"needsMCPTools": true, "suggestedTools": [{"name": "delete_note", "arguments": {"id": 2}}], "category": "notes"}
`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [{ role: 'user', content: analysisPrompt }],
        temperature: 0.1, // Low creativity for precise analysis
        max_tokens: 500
      });

      const responseContent = response.choices[0].message.content?.trim() || '{}';
      console.log('🔍 Intention analysis response:', responseContent);

      // Try to parse JSON
      let analysis;
      try {
        analysis = JSON.parse(responseContent);
      } catch (parseError) {
        console.error('❌ Error parsing analysis JSON:', parseError);
        console.log('📄 Content received:', responseContent);

        // Try to extract JSON from response if wrapped in text
        const jsonMatch = responseContent.match(/\{.*\}/s);
        if (jsonMatch) {
          try {
            analysis = JSON.parse(jsonMatch[0]);
            console.log('✅ JSON extracted successfully');
          } catch {
            // If everything fails, use default values
            analysis = { needsMCPTools: false, suggestedTools: [], category: 'general' };
          }
        } else {
          analysis = { needsMCPTools: false, suggestedTools: [], category: 'general' };
        }
      }

      return {
        needsMCPTools: analysis.needsMCPTools || false,
        suggestedTools: analysis.suggestedTools || [],
        category: analysis.category || 'general'
      };

    } catch (error) {
      console.error('Error analyzing intention:', error);
      return {
        needsMCPTools: false,
        suggestedTools: [],
        category: 'general'
      };
    }
  }

  /**
   * Executes suggested MCP tools
   */
  private async executeMCPTools(
    suggestedTools: Array<{ name: string; arguments: Record<string, any> }>,
    mcpActions: MCPAction[]
  ): Promise<string> {
    let results = '';

    for (const tool of suggestedTools) {
      try {
        console.log(`🔧 Executing tool: ${tool.name}`);

        const action: MCPAction = {
          type: 'tool_call',
          name: tool.name,
          arguments: tool.arguments
        };

        const result = await this.mcpClient.callTool(tool.name, tool.arguments);
        action.result = result;
        mcpActions.push(action);

        // Format result to include in context
        if (result && result.content) {
          const content = Array.isArray(result.content)
            ? result.content.map((c: any) => c.text || c).join('\n')
            : result.content;

          results += `\n=== Result from ${tool.name} ===\n${content}\n`;
        }

      } catch (error) {
        console.error(`Error executing ${tool.name}:`, error);

        const action: MCPAction = {
          type: 'tool_call',
          name: tool.name,
          arguments: tool.arguments,
          error: error instanceof Error ? error.message : 'Unknown error'
        };
        mcpActions.push(action);

        results += `\n=== Error in ${tool.name} ===\n${error instanceof Error ? error.message : 'Unknown error'}\n`;
      }
    }

    return results;
  }

  /**
   * Builds system prompt with MCP context
   */
  private buildSystemPrompt(mcpResults: string): string {
    return `You are an intelligent assistant that can use MCP (Model Context Protocol) tools to help users.

AVAILABLE TOOLS:
- Calculator: for mathematical operations
- Weather: for meteorological information
- Notes: for creating and searching notes
- Database: for SQL queries
- Files: for reading system files

INSTRUCTIONS:
1. ALWAYS respond in the SAME LANGUAGE that the user is writing to you
   - If the user writes in Spanish, respond in Spanish
   - If the user writes in English, respond in English
   - If the user writes in French, respond in French
   - Match the user's language exactly
2. Respond naturally and friendly
3. If MCP tools were executed, integrate the results in your response
4. Explain what you did and the results obtained
5. If there were errors, explain them comprehensibly
6. Offer additional suggestions when appropriate
7. Maintain a conversational and helpful tone

${mcpResults ? `TOOL RESULTS:\n${mcpResults}` : ''}

Respond based on available information and obtained results, ALWAYS in the same language as the user's message.`;
  }

  /**
   * Generates response using OpenAI GPT
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

      // If there are MCP results, include them as additional context
      if (mcpResults) {
        messages.push({
          role: 'assistant',
          content: `I have executed the necessary tools. Here are the results:\n${mcpResults}`
        });
        messages.push({
          role: 'user',
          content: 'Please provide a natural response based on these results.'
        });
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini', // Use latest model
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return response.choices[0].message.content || 'Sorry, I could not generate a response.';

    } catch (error) {
      console.error('Error generating OpenAI response:', error);

      if (error instanceof Error && error.message.includes('API key')) {
        throw new Error('OpenAI authentication error. Check your API key.');
      }

      throw new Error(`Error generating response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets service statistics
   */
  getMCPToolCallCount(): number {
    return this.toolCallCount;
  }

  getAverageResponseTime(): number {
    if (this.responseTimes.length === 0) return 0;
    const sum = this.responseTimes.reduce((acc, time) => acc + time, 0);
    return Math.round(sum / this.responseTimes.length);
  }
}
