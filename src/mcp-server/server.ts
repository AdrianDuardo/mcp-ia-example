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
 * - Provides access to an SQLite database
 * - Allows file reading and dynamic resources
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
import { Note } from "../shared/types.js";

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

      const result = notes.map((note: Note) =>
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

// � TOOL: GET NOTE BY ID
server.registerTool(
  "get_note",
  {
    title: "📖 Get Note by ID",
    description: "Gets a specific note by its ID",
    inputSchema: {
      id: z.number({ description: "Note ID" })
    }
  },
  async ({ id }) => {
    try {
      const note = await notesService.getNoteById(id);

      if (!note) {
        return {
          content: [{
            type: "text",
            text: `📖 Note with ID ${id} not found`
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `📖 **${note.title}** (ID: ${note.id})
📁 Category: ${note.category || 'Uncategorized'}
📅 Created: ${note.creationDate}
📅 Modified: ${note.lastModified}

💬 **Content:**
${note.content}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error getting note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// ✏️ TOOL: UPDATE NOTE
server.registerTool(
  "update_note",
  {
    title: "✏️ Update Note",
    description: "Updates an existing note with new title, content or category",
    inputSchema: {
      id: z.number({ description: "Note ID to update" }),
      title: z.string({ description: "New note title" }).optional(),
      content: z.string({ description: "New note content" }).optional(),
      category: z.string({ description: "New note category" }).optional()
    }
  },
  async ({ id, title, content, category }) => {
    try {
      const updates: any = {};
      if (title !== undefined) updates.title = title;
      if (content !== undefined) updates.content = content;
      if (category !== undefined) updates.category = category;

      if (Object.keys(updates).length === 0) {
        return {
          content: [{
            type: "text",
            text: "❌ No fields provided to update. Please specify title, content, or category."
          }],
          isError: true
        };
      }

      const note = await notesService.updateNote(id, updates);
      return {
        content: [{
          type: "text",
          text: `✏️ Note updated successfully:
🆔 ID: ${note.id}
📋 Title: ${note.title}
📁 Category: ${note.category || 'Uncategorized'}
📅 Last Modified: ${note.lastModified}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error updating note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 🗑️ TOOL: DELETE NOTE
server.registerTool(
  "delete_note",
  {
    title: "🗑️ Delete Note",
    description: "Deletes a note by its ID",
    inputSchema: {
      id: z.number({ description: "Note ID to delete" })
    }
  },
  async ({ id }) => {
    try {
      const deleted = await notesService.deleteNote(id);

      if (deleted) {
        return {
          content: [{
            type: "text",
            text: `🗑️ Note with ID ${id} deleted successfully`
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `❌ Note with ID ${id} not found or could not be deleted`
          }],
          isError: true
        };
      }
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error deleting note: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);


// 📁 TOOL: READ FILE
server.registerTool(
  "read_file",
  {
    title: "📁 Read File",
    description: "Reads content from a file in the data directory",
    inputSchema: {
      path: z.string({ description: "Relative path to the file" })
    }
  },
  async ({ path }) => {
    try {
      const content = await fileService.readFile(path);
      return {
        content: [{
          type: "text",
          text: `📁 File content from '${path}':\n\n\`\`\`\n${content}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error reading file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// ✍️ TOOL: WRITE FILE
server.registerTool(
  "write_file",
  {
    title: "✍️ Write File",
    description: "Writes content to a file in the data directory",
    inputSchema: {
      path: z.string({ description: "Relative path to the file" }),
      content: z.string({ description: "Content to write to the file" })
    }
  },
  async ({ path, content }) => {
    try {
      await fileService.writeFile(path, content);
      return {
        content: [{
          type: "text",
          text: `✍️ File '${path}' written successfully`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error writing file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 📋 TOOL: LIST FILES
server.registerTool(
  "list_files",
  {
    title: "📋 List Files",
    description: "Lists files and directories in the data directory",
    inputSchema: {
      path: z.string({ description: "Relative path to list (default: root)" }).default("")
    }
  },
  async ({ path }) => {
    try {
      const files = await fileService.listFiles(path);

      if (files.length === 0) {
        return {
          content: [{
            type: "text",
            text: `📋 No files found in '${path || 'root'}'`
          }]
        };
      }

      const result = files.map(file => {
        const icon = file.isDirectory ? "📁" : "📄";
        const size = file.isDirectory ? "" : ` (${(file.size / 1024).toFixed(1)}KB)`;
        return `${icon} **${file.name}**${size}\n   📅 Modified: ${file.modificationDate}`;
      }).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `📋 Files in '${path || 'root'}':\n\n${result}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error listing files: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// 🔍 TOOL: FILE EXISTS
server.registerTool(
  "file_exists",
  {
    title: "🔍 Check File Exists",
    description: "Checks if a file exists in the data directory",
    inputSchema: {
      path: z.string({ description: "Relative path to check" })
    }
  },
  async ({ path }) => {
    try {
      const exists = await fileService.fileExists(path);
      return {
        content: [{
          type: "text",
          text: `🔍 File '${path}' ${exists ? 'exists' : 'does not exist'}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error checking file: ${error instanceof Error ? error.message : 'Unknown error'}`
        }],
        isError: true
      };
    }
  }
);

// �🗄️ TOOL: DATABASE QUERY
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
 * STEP 3: DEFINE RESOURCES
 * 
 * Resources are DATA that the model can read.
 * Think of them as "files" or read-only "endpoints".
 * 
 * They can be:
 * - Static: always return the same thing
 * - Dynamic: change based on parameters
 */

// 📊 STATIC RESOURCE: Server information
server.registerResource(
  "server-info",
  "mcp://server/info",
  {
    title: "📊 Server Information",
    description: "Basic information about this MCP server",
    mimeType: "application/json"
  },
  async (uri) => ({
    contents: [{
      uri: uri.href,
      text: JSON.stringify({
        name: process.env.MCP_SERVER_NAME || "Tutorial MCP Server",
        version: process.env.MCP_SERVER_VERSION || "1.0.0",
        description: "Example server for learning MCP",
        tools: ["calculator", "weather", "notes (CRUD)", "files (CRUD)", "sql"],
        author: "MCP Tutorial",
        creationDate: new Date().toISOString()
      }, null, 2)
    }]
  })
);

// 📁 DYNAMIC RESOURCE: Files
server.registerResource(
  "file",
  new ResourceTemplate("file://{path}", { list: undefined }),
  {
    title: "📁 File Reader",
    description: "Reads content from system files"
  },
  async (uri, { path }) => {
    try {
      // Ensure path is a string
      const filePath = Array.isArray(path) ? path[0] : path;
      const content = await fileService.readFile(filePath);
      return {
        contents: [{
          uri: uri.href,
          text: content
        }]
      };
    } catch (error) {
      throw new Error(`Could not read file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

// 📊 DYNAMIC RESOURCE: Database statistics
server.registerResource(
  "db-stats",
  new ResourceTemplate("db://stats/{table}", { list: undefined }),
  {
    title: "📊 Database Statistics",
    description: "Gets statistics from database tables"
  },
  async (uri, { table }) => {
    try {
      // Ensure table is a string
      const tableName = Array.isArray(table) ? table[0] : table;
      const stats = await dbService.getTableStats(tableName);
      return {
        contents: [{
          uri: uri.href,
          text: JSON.stringify(stats, null, 2)
        }]
      };
    } catch (error) {
      throw new Error(`Could not get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
);

/**
 * STEP 4: DEFINE PROMPTS
 * 
 * Prompts are reusable TEMPLATES for common interactions.
 * They help standardize how the model interacts with tools.
 */

// 💬 PROMPT: Data analysis
server.registerPrompt(
  "analyze_data",
  {
    title: "📊 Data Analysis",
    description: "Template for analyzing data using available tools",
    argsSchema: {
      dataset: z.string({ description: "Description of the dataset to analyze" }),
      objective: z.string({ description: "Analysis objective" }).optional()
    }
  },
  ({ dataset, objective }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Analyze the following dataset: ${dataset}

${objective ? `Analysis objective: ${objective}` : ''}

Please:
1. Examine available data using SQL tools
2. Calculate relevant statistics with the calculator
3. Identify important patterns
4. Provide insights and conclusions
5. Create a note with the analysis summary

Use available MCP tools to perform a complete analysis.`
      }
    }]
  })
);

// 🌤️ PROMPT: Weather report
server.registerPrompt(
  "weather_report",
  {
    title: "🌤️ Weather Report",
    description: "Generate a complete weather report for a location",
    argsSchema: {
      city: z.string({ description: "Main city for the report" }),
      include_tips: z.string({ description: "Include tips (yes/no)" }).optional()
    }
  },
  ({ city, include_tips }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: `Generate a complete weather report for the city: ${city}

Please:
1. Get current weather information for the city
2. Analyze weather conditions
3. ${include_tips === 'yes' ? 'Provide useful tips based on conditions' : ''}
4. Create a note with the complete report

Use the weather tool and other available tools.`
      }
    }]
  })
);

/**
 * STEP 5: INITIALIZE AND CONNECT THE SERVER
 * 
 * Finally, we initialize all services and connect the server
 * using the stdio transport (standard input/output).
 */
async function initializeServer() {
  try {
    console.error("🚀 Starting MCP server...");

    // Initialize database
    await dbService.initialize();
    console.error("✅ Database initialized");

    // Initialize services
    await notesService.initialize();
    console.error("✅ Notes service initialized");

    // Create stdio transport
    const transport = new StdioServerTransport();

    // Connect server
    await server.connect(transport);

    console.error("🎉 MCP server started successfully!");
    console.error("📋 Available tools: calculator, weather, notes (CRUD), files (CRUD), SQL");
    console.error("📊 Available resources: server info, files, DB statistics");
    console.error("💬 Available prompts: data analysis, weather report");

  } catch (error) {
    console.error("❌ Error starting MCP server:", error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.error("🛑 Closing MCP server...");
  await dbService.close();
  process.exit(0);
});

// Start the server
initializeServer().catch(console.error);
