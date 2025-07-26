/**
 * SERVIDOR MCP PRINCIPAL - TUTORIAL COMPLETO
 * 
 * Este archivo implementa un servidor MCP (Model Context Protocol) completo
 * que demuestra todos los conceptos fundamentales:
 * 
 * 🔧 HERRAMIENTAS (Tools): Acciones que el modelo puede ejecutar
 * 📊 RECURSOS (Resources): Datos que el modelo puede leer
 * 💬 PROMPTS: Plantillas reutilizables para interacciones
 * 
 * ¿QUÉ HACE ESTE SERVIDOR?
 * - Expone herramientas matemáticas, del clima, notas, etc.
 * - Proporciona acceso a una base de datos SQLite
 * - Permite lectura de archivos y recursos dinámicos
 * - Define prompts reutilizables para diferentes tareas
 */

import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { DatabaseService } from "./database/database";
import { WeatherService } from "./services/weather";
import { FileService } from "./services/files";
import { NotesService } from "./services/notes";

/**
 * PASO 1: CREAR EL SERVIDOR MCP
 * 
 * McpServer es la clase principal que maneja toda la comunicación MCP.
 * Define el nombre y versión de nuestro servidor.
 */
const server = new McpServer({
  name: "tutorial-mcp-server",
  version: "1.0.0"
});

// Inicializar servicios
const dbService = new DatabaseService();
const weatherService = new WeatherService();
const fileService = new FileService();
const notesService = new NotesService();

/**
 * PASO 2: DEFINIR HERRAMIENTAS (TOOLS)
 * 
 * Las herramientas son ACCIONES que el modelo puede ejecutar.
 * Piensa en ellas como "funciones" que el modelo puede llamar.
 * 
 * Cada herramienta tiene:
 * - name: identificador único
 * - title: nombre mostrado al usuario
 * - description: qué hace la herramienta
 * - inputSchema: qué parámetros necesita (validación con Zod)
 * - handler: función que ejecuta la acción
 */

// 🧮 HERRAMIENTA: CALCULADORA
server.registerTool(
  "calculadora",
  {
    title: "🧮 Calculadora Matemática",
    description: "Realiza operaciones matemáticas básicas (suma, resta, multiplicación, división)",
    inputSchema: {
      operacion: z.enum(["suma", "resta", "multiplicacion", "division"], {
        description: "Tipo de operación a realizar"
      }),
      numero1: z.number({ description: "Primer número" }),
      numero2: z.number({ description: "Segundo número" })
    }
  },
  async ({ operacion, numero1, numero2 }) => {
    let resultado: number;
    let simbolo: string;

    switch (operacion) {
      case "suma":
        resultado = numero1 + numero2;
        simbolo = "+";
        break;
      case "resta":
        resultado = numero1 - numero2;
        simbolo = "-";
        break;
      case "multiplicacion":
        resultado = numero1 * numero2;
        simbolo = "×";
        break;
      case "division":
        if (numero2 === 0) {
          throw new Error("❌ Error: No se puede dividir por cero");
        }
        resultado = numero1 / numero2;
        simbolo = "÷";
        break;
      default:
        throw new Error(`❌ Operación no válida: ${operacion}`);
    }

    return {
      content: [{
        type: "text",
        text: `🧮 Resultado: ${numero1} ${simbolo} ${numero2} = ${resultado}`
      }]
    };
  }
);

// 🌤️ HERRAMIENTA: CLIMA
server.registerTool(
  "obtener_clima",
  {
    title: "🌤️ Información del Clima",
    description: "Obtiene información meteorológica actual de cualquier ciudad",
    inputSchema: {
      ciudad: z.string({ description: "Nombre de la ciudad" }),
      pais: z.string({ description: "Código del país (ej: ES, US)" }).optional()
    }
  },
  async ({ ciudad, pais }) => {
    try {
      const clima = await weatherService.getCurrentWeather(ciudad, pais);
      return {
        content: [{
          type: "text",
          text: `🌤️ Clima en ${clima.ciudad}:
📍 Condición: ${clima.descripcion}
🌡️ Temperatura: ${clima.temperatura}°C (sensación: ${clima.sensacionTermica}°C)
💧 Humedad: ${clima.humedad}%
💨 Viento: ${clima.velocidadViento} m/s`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error obteniendo clima: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// 📝 HERRAMIENTA: CREAR NOTA
server.registerTool(
  "crear_nota",
  {
    title: "📝 Crear Nota",
    description: "Crea una nueva nota con título y contenido",
    inputSchema: {
      titulo: z.string({ description: "Título de la nota" }),
      contenido: z.string({ description: "Contenido de la nota" }),
      categoria: z.string({ description: "Categoría de la nota" }).optional()
    }
  },
  async ({ titulo, contenido, categoria }) => {
    try {
      const nota = await notesService.createNote(titulo, contenido, categoria);
      return {
        content: [{
          type: "text",
          text: `📝 Nota creada exitosamente:
🆔 ID: ${nota.id}
📋 Título: ${nota.titulo}
📁 Categoría: ${nota.categoria || 'Sin categoría'}
📅 Creada: ${nota.fechaCreacion}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error creando nota: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// 🔍 HERRAMIENTA: BUSCAR NOTAS
server.registerTool(
  "buscar_notas",
  {
    title: "🔍 Buscar Notas",
    description: "Busca notas por título, contenido o categoría",
    inputSchema: {
      query: z.string({ description: "Término de búsqueda" }).optional(),
      categoria: z.string({ description: "Filtrar por categoría" }).optional(),
      limite: z.number({ description: "Número máximo de resultados" }).default(10)
    }
  },
  async ({ query, categoria, limite }) => {
    try {
      const notas = await notesService.searchNotes(query, categoria, limite);

      if (notas.length === 0) {
        return {
          content: [{
            type: "text",
            text: "🔍 No se encontraron notas con los criterios especificados"
          }]
        };
      }

      const resultado = notas.map(nota =>
        `📝 **${nota.titulo}** (ID: ${nota.id})
📁 Categoría: ${nota.categoria || 'Sin categoría'}
📅 ${nota.fechaCreacion}
💬 ${nota.contenido.substring(0, 100)}${nota.contenido.length > 100 ? '...' : ''}`
      ).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `🔍 Encontradas ${notas.length} nota(s):\n\n${resultado}`
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error buscando notas: ${error instanceof Error ? error.message : 'Error desconocido'}`
        }],
        isError: true
      };
    }
  }
);

// 🗄️ HERRAMIENTA: QUERY BASE DE DATOS
server.registerTool(
  "ejecutar_sql",
  {
    title: "🗄️ Ejecutar Query SQL",
    description: "Ejecuta consultas SQL en la base de datos (solo SELECT por seguridad)",
    inputSchema: {
      sql: z.string({ description: "Consulta SQL a ejecutar (solo SELECT)" })
    }
  },
  async ({ sql }) => {
    try {
      // Validación de seguridad: solo permitir SELECT
      const sqlTrimmed = sql.trim().toLowerCase();
      if (!sqlTrimmed.startsWith('select')) {
        throw new Error("Por seguridad, solo se permiten consultas SELECT");
      }

      const resultados = await dbService.executeQuery(sql);

      if (resultados.length === 0) {
        return {
          content: [{
            type: "text",
            text: "🗄️ La consulta no devolvió resultados"
          }]
        };
      }

      return {
        content: [{
          type: "text",
          text: `🗄️ Resultados de la consulta:\n\`\`\`json\n${JSON.stringify(resultados, null, 2)}\n\`\`\``
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `❌ Error ejecutando consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`
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
        nombre: "Tutorial MCP Server",
        version: "1.0.0",
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
