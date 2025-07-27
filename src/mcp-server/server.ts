/**
 * MAIN MCP SERVER - COMPLETE TUTORIAL
 * 
 * This file implements a complete MCP (Model Context Protocol) server
 * that demonstrates all fundamental concepts:
 * 
 * 🔧 TOOLS: Actions that the model can execute
 * 📊 RESOURCES: Data that the model can read
 * 💬 PROMPTS: Reusable templates for interactions
 * 
 * WHAT DOES THIS SERVER DO?
 * - Exposes mathematical, weather, notes, etc. tools
 * - Provides access to an SQLite d/**
 * STEP 5: SERVER INITIALIZATION
 * 
 * Finally, we initialize all services and connect the server
 * using stdio transport (standard input/output).
 */
async function initializeServer() {
  try {
    console.error("🚀 Starting MCP server...");

    // Initialize database
    await dbService.initialize();
    console.error("✅ Database initialized");Allows file reading and dynamic resources
 * - Defines reusable prompts for different tasks
 */

import dotenv from 'dotenv';
import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Load environment variables
dotenv.config();
import { DatabaseService } from "./database/database.js";
import { WeatherService } from "./services/weather.js";
import { FileService } from "./services/files.js";
import { NotesService } from "./services/notes.js";

/**
 * STEP 1: CREATE THE MCP SERVER
 * 
 * McpServer is the main class that handles all MCP communication.
 * Defines the name and version of our server.
 */
const server = new McpServer({
  name: process.env.MCP_SERVER_NAME || "tutorial-mcp-server",
  version: process.env.MCP_SERVER_VERSION || "1.0.0"
});

// Initialize services
const dbService = new DatabaseService();
const weatherService = new WeatherService();
const fileService = new FileService();
const notesService = new NotesService(dbService);

/**
 * STEP 2: DEFINE TOOLS
 * 
 * Tools are ACTIONS that the model can execute.
 * Think of them as "functions" that the model can call.
 * 
 * Each tool has:
 * - name: unique identifier
 * - title: name shown to user
 * - description: what the tool does
 * - inputSchema: what parameters it needs (Zod validation)
 * - handler: function that executes the action
 */

// 🧮 TOOL: CALCULATOR
server.registerTool(
  "calculator",
  {
    title: "🧮 Mathematical Calculator",
    description: "Performs basic mathematical operations (addition, subtraction, multiplication, division)",
    inputSchema: {
      operation: z.enum(["addition", "subtraction", "multiplication", "division"], {
        description: "Type of operation to perform"
      }),
      number1: z.number({ description: "First number" }),
      number2: z.number({ description: "Second number" })
    }
  },
  async ({ operation, number1, number2 }) => {
    let result: number;
    let symbol: string;

    switch (operation) {
      case "addition":
        result = number1 + number2;
        symbol = "+";
        break;
      case "subtraction":
        result = number1 - number2;
        symbol = "-";
        break;
      case "multiplication":
        result = number1 * number2;
        symbol = "×";
        break;
      case "division":
        if (number2 === 0) {
          throw new Error("❌ Error: Cannot divide by zero");
        }
        result = number1 / number2;
        symbol = "÷";
        break;
      default:
        throw new Error(`❌ Invalid operation: ${operation}`);
    }

    return {
      content: [{
        type: "text",
        text: `🧮 Result: ${number1} ${symbol} ${number2} = ${result}`
      }]
    };
  }
);

// 🌤️ TOOL: WEATHER
server.registerTool(
  "get_weather",
  {
    title: "🌤️ Weather Information",
    description: "Gets current weather information for any city",
    inputSchema: {
      city: z.string({ description: "City name" }),
      country: z.string({ description: "Country code (e.g. US, GB)" }).optional()
    }
  },
  async ({ city, country }) => {
    try {
      const weather = await weatherService.getCurrentWeather(city, country);
      return {
        content: [{
          type: "text",
          text: `🌤️ Weather in ${weather.city}:
📍 Condition: ${weather.description}
🌡️ Temperature: ${weather.temperature}°C (feels like: ${weather.feelsLike}°C)
💧 Humidity: ${weather.humidity}%
💨 Wind: ${weather.windSpeed} m/s`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error getting weather: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 📝 TOOL: CREATE NOTE
server.registerTool(
  "create_note",
  {
    title: "📝 Create Note",
    description: "Creates a new note with title and content",
    inputSchema: {
      title: z.string({ description: "Note title" }),
      content: z.string({ description: "Note content" }),
      category: z.string({ description: "Note category" }).optional()
    }
  },
  async ({ title, content, category }) => {
    try {
      const note = await notesService.createNote(title, content, category);
      return {
        content: [{
          type: "text",
          text: `📝 Note created successfully:
🆔 ID: ${note.id}
📋 Title: ${note.title}
📁 Category: ${note.category || 'Uncategorized'}
📅 Created: ${note.creationDate}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error creating note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 🔍 TOOL: SEARCH NOTES
server.registerTool(
  "search_notes",
  {
    title: "🔍 Search Notes",
    description: "Search notes by title, content or category",
    inputSchema: {
      query: z.string({ description: "Search term" }).optional(),
      category: z.string({ description: "Filter by category" }).optional(),
      limit: z.number({ description: "Maximum number of results" }).default(10)
    }
  },
  async ({ query, category, limit }) => {
    try {
      const notes = await notesService.searchNotes(query, category, limit);

      if (notes.length === 0) {
        return {
          content: [{
            type: "text",
            text: "🔍 No notes found with the specified criteria"
          }]
        };
      }

      const result = notes.map((note: any) =>
        `📝 **${note.title}** (ID: ${note.id})
📁 Category: ${note.category || 'Uncategorized'}
📅 ${note.creationDate}
💬 ${note.content.substring(0, 100)}${note.content.length > 100 ? '...' : ''}`
      ).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `🔍 Found ${notes.length} note(s):\n\n${result}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error searching notes: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 🗄️ TOOL: DATABASE QUERY
server.registerTool(
  "execute_sql",
  {
    title: "🗄️ Execute SQL Query",
    description: "Executes SQL queries on the database (SELECT only for security)",
    inputSchema: {
      sql: z.string({ description: "SQL query to execute (SELECT only)" })
    }
  },
  async ({ sql }) => {
    try {
      // Security validation: only allow SELECT
      const sqlTrimmed = sql.trim().toLowerCase();
      if (!sqlTrimmed.startsWith('select')) {
        throw new Error("For security reasons, only SELECT queries are allowed");
      }

      const results = await dbService.executeQuery(sql);

      if (results.length === 0) {
        return {
          content: [{
            type: "text",
            text: "🗄️ Query returned no results"
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `🗄️ Query results:\n\`\`\`json\n${JSON.stringify(results, null, 2)}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

/**
 * PASO 3: DEFINIR RECURSOS (RESOURCES)
 * 
 * Los recursos son DATOS que el modelo puede leer.
 * Piensa en ellos como "archivos" o "endpoints" de solo lectura.
 * 
 * Pueden ser:
 * - Estáticos: siempre devuelven lo mismo
 * - Dinámicos: cambian según parámetros
 */

// 📊 RECURSO ESTÁTICO: Información del servidor
server.registerResource(
  "server-info",
  "mcp://server/info",
  {
    title: "📊 Información del Servidor",
    description: "Información básica sobre este servidor MCP",
    mimeType: "application/json"
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        nombre: process.env.MCP_SERVER_NAME || "Tutorial MCP Server",
        version: process.env.MCP_SERVER_VERSION || "1.0.0",
        descripcion: "Servidor de ejemplo para aprender MCP",
        herramientas: ["calculadora", "clima", "notas", "sql"],
        autor: "Tutorial MCP",
        fechaCreacion: new Date().toISOString()
      }, null, 2)
    }]
  })
);

// 📁 RECURSO DINÁMICO: Archivos
server.registerResource(
  "archivo",
  new ResourceTemplate("file://{ruta}", { list: undefined }),
  {
    title: "📁 Lector de Archivos",
    description: "Lee el contenido de archivos del sistema"
  },
  async (uri, { ruta }) => {
    try {
      // Asegurar que ruta es un string
      const rutaArchivo = Array.isArray(ruta) ? ruta[0] : ruta;
      const contenido = await fileService.readFile(rutaArchivo);
      return {
        contents: [{
          uri: uri.href,
          text: contenido
        }]
      };
    } catch (error) {
      throw new Error(`No se pudo leer el archivo: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
);

// 📊 RECURSO DINÁMICO: Estadísticas de base de datos
server.registerResource(
  "db-stats",
  new ResourceTemplate("db://stats/{tabla}", { list: undefined }),
  {
    title: "📊 Estadísticas de Base de Datos",
    description: "Obtiene estadísticas de tablas de la base de datos"
  },
  async (uri, { tabla }) => {
    try {
      // Asegurar que tabla es un string
      const nombreTabla = Array.isArray(tabla) ? tabla[0] : tabla;
      const stats = await dbService.getTableStats(nombreTabla);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(stats, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`No se pudieron obtener estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }
);

/**
 * PASO 4: DEFINIR PROMPTS
 * 
 * Los prompts son PLANTILLAS reutilizables para interacciones comunes.
 * Ayudan a estandarizar cómo el modelo interactúa con las herramientas.
 */

// 💬 PROMPT: Análisis de datos
server.registerPrompt(
  "analizar_datos",
  {
    title: "📊 Análisis de Datos",
    description: "Plantilla para analizar datos usando las herramientas disponibles",
    argsSchema: {
      dataset: z.string({ description: "Descripción del conjunto de datos a analizar" }),
      objetivo: z.string({ description: "Objetivo del análisis" }).optional()
    }
  },
  ({ dataset, objetivo }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Analiza el siguiente conjunto de datos: ${dataset}

${objetivo ? `Objetivo del análisis: ${objetivo}` : ''}

Por favor:
1. Examina los datos disponibles usando las herramientas SQL
2. Calcula estadísticas relevantes con la calculadora
3. Identifica patrones importantes
4. Proporciona insights y conclusiones
5. Crea una nota con el resumen del análisis

Usa las herramientas MCP disponibles para realizar un análisis completo.`
      }
    }]
  })
);

// 🌤️ PROMPT: Reporte del clima
server.registerPrompt(
  "reporte_clima",
  {
    title: "🌤️ Reporte Meteorológico",
    description: "Genera un reporte completo del clima para una ubicación",
    argsSchema: {
      ciudad: z.string({ description: "Ciudad principal para el reporte" }),
      incluir_consejos: z.string({ description: "Incluir consejos (si/no)" }).optional()
    }
  },
  ({ ciudad, incluir_consejos }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Genera un reporte meteorológico completo para la ciudad: ${ciudad}

Por favor:
1. Obtén información actual del clima para la ciudad
2. Analiza las condiciones meteorológicas
3. ${incluir_consejos === 'si' ? 'Proporciona consejos útiles basados en las condiciones' : ''}
4. Crea una nota con el reporte completo

Usa la herramienta de clima y otras herramientas disponibles.`
      }
    }]
  })
);

/**
 * PASO 5: INICIALIZAR Y CONECTAR EL SERVIDOR
 * 
 * Finalmente, inicializamos todos los servicios y conectamos el servidor
 * usando el transporte stdio (entrada/salida estándar).
 */
async function inicializarServidor() {
  try {
    console.error("🚀 Iniciando servidor MCP...");

    // Inicializar base de datos
    await dbService.initialize();
    console.error("✅ Base de datos inicializada");

    // Inicializar servicios
    await notesService.initialize();
    console.error("✅ Servicio de notas inicializado");

    // Crear transporte stdio
    const transport = new StdioServerTransport();

    // Conectar servidor
    await server.connect(transport);

    console.error("🎉 Servidor MCP iniciado exitosamente!");
    console.error("📋 Herramientas disponibles: calculadora, clima, notas, SQL");
    console.error("📊 Recursos disponibles: info del servidor, archivos, estadísticas DB");
    console.error("💬 Prompts disponibles: análisis de datos, reporte del clima");

  } catch (error) {
    console.error("❌ Error iniciando servidor MCP:", error);
    process.exit(1);
  }
}

// Manejar cierre graceful
process.on('SIGINT', async () => {
  console.error("🛑 Cerrando servidor MCP...");
  await dbService.close();
  process.exit(0);
});

// Iniciar el servidor
inicializarServidor().catch(console.error);
