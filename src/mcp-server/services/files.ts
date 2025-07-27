/**
 * SERVICIO DE ARCHIVOS - TUTORIAL MCP
 * 
 * Este servicio demuestra cómo MCP puede acceder al sistema de archivos
 * de forma segura y controlada.
 * 
 * 📁 FUNCIONALIDADES:
 * - Lectura de archivos con validaciones de seguridad
 * - Escritura de archivos en directorio seguro
 * - Listado de archivos
 * - Validación de extensiones permitidas
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface FileInfo {
  nombre: string;
  ruta: string;
  tamaño: number;
  extension: string;
  fechaModificacion: string;
  esDirectorio: boolean;
}

export class FileService {
  private basePath: string;
  private allowedExtensions: Set<string>;
  private maxFileSize: number;

  constructor() {
    // Directorio base seguro para operaciones de archivos
    this.basePath = path.join(process.cwd(), 'data');

    // Extensiones permitidas por seguridad
    this.allowedExtensions = new Set([
      '.txt', '.md', '.json', '.csv', '.log',
      '.yml', '.yaml', '.xml', '.config',
      '.js', '.ts', '.html', '.css'
    ]);

    // Tamaño máximo de archivo: 10MB
    this.maxFileSize = 10 * 1024 * 1024;

    // Crear directorio base si no existe
    this.ensureBaseDirectory();
  }

  /**
   * Asegura que el directorio base existe
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error("Error creando directorio base:", error);
    }
  }

  /**
   * Valida que una ruta es segura (no sale del directorio base)
   */
  private validatePath(filePath: string): string {
    // Resolver la ruta absoluta
    const absolutePath = path.resolve(this.basePath, filePath);

    // Verificar que no sale del directorio base
    if (!absolutePath.startsWith(this.basePath)) {
      throw new Error("Acceso denegado: La ruta está fuera del directorio permitido");
    }

    return absolutePath;
  }

  /**
   * Valida que una extensión está permitida
   */
  private validateExtension(filePath: string): void {
    const extension = path.extname(filePath).toLowerCase();

    if (!this.allowedExtensions.has(extension)) {
      throw new Error(`Extensión no permitida: ${extension}. Extensiones permitidas: ${Array.from(this.allowedExtensions).join(', ')}`);
    }
  }

  /**
   * Lee el contenido de un archivo
   */
  async readFile(relativePath: string): Promise<string> {
    try {
      const absolutePath = this.validatePath(relativePath);
      this.validateExtension(absolutePath);

      // Verificar que el archivo existe
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        throw new Error("La ruta especificada es un directorio, no un archivo");
      }

      // Verificar tamaño
      if (stats.size > this.maxFileSize) {
        throw new Error(`Archivo demasiado grande: ${Math.round(stats.size / 1024 / 1024)}MB. Máximo permitido: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
      }

      // Leer archivo
      const content = await fs.readFile(absolutePath, 'utf-8');

      console.error(`📖 Archivo leído: ${relativePath} (${stats.size} bytes)`);
      return content;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Archivo no encontrado: ${relativePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Sin permisos para leer el archivo: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error leyendo archivo: ${error}`);
    }
  }

  /**
   * Escribe contenido a un archivo
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    try {
      const absolutePath = this.validatePath(relativePath);
      this.validateExtension(absolutePath);

      // Crear directorio padre si no existe
      const directory = path.dirname(absolutePath);
      await fs.mkdir(directory, { recursive: true });

      // Verificar tamaño del contenido
      const contentSize = Buffer.byteLength(content, 'utf-8');
      if (contentSize > this.maxFileSize) {
        throw new Error(`Contenido demasiado grande: ${Math.round(contentSize / 1024 / 1024)}MB. Máximo permitido: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
      }

      // Escribir archivo
      await fs.writeFile(absolutePath, content, 'utf-8');

      console.error(`💾 Archivo escrito: ${relativePath} (${contentSize} bytes)`);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('EACCES')) {
          throw new Error(`Sin permisos para escribir el archivo: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error escribiendo archivo: ${error}`);
    }
  }

  /**
   * Lista archivos en un directorio
   */
  async listFiles(relativePath: string = ''): Promise<FileInfo[]> {
    try {
      const absolutePath = this.validatePath(relativePath);

      // Verificar que el directorio existe
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error("La ruta especificada no es un directorio");
      }

      const files = await fs.readdir(absolutePath);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(absolutePath, file);
          const fileStats = await fs.stat(filePath);
          const extension = path.extname(file).toLowerCase();

          // Solo incluir archivos con extensiones permitidas o directorios
          if (fileStats.isDirectory() || this.allowedExtensions.has(extension)) {
            fileInfos.push({
              nombre: file,
              ruta: path.relative(this.basePath, filePath),
              tamaño: fileStats.size,
              extension: extension,
              fechaModificacion: fileStats.mtime.toISOString(),
              esDirectorio: fileStats.isDirectory()
            });
          }
        } catch (error) {
          // Continuar con el siguiente archivo si hay error
          console.error(`Error obteniendo info de ${file}:`, error);
        }
      }

      // Ordenar: directorios primero, luego archivos alfabéticamente
      fileInfos.sort((a, b) => {
        if (a.esDirectorio && !b.esDirectorio) return -1;
        if (!a.esDirectorio && b.esDirectorio) return 1;
        return a.nombre.localeCompare(b.nombre);
      });

      console.error(`📁 Listados ${fileInfos.length} elementos en: ${relativePath || '/'}`);
      return fileInfos;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Directorio no encontrado: ${relativePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`Sin permisos para acceder al directorio: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error listando archivos: ${error}`);
    }
  }

  /**
   * Verifica si un archivo existe
   */
  async fileExists(relativePath: string): Promise<boolean> {
    try {
      const absolutePath = this.validatePath(relativePath);
      await fs.access(absolutePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Obtiene información de un archivo
   */
  async getFileInfo(relativePath: string): Promise<FileInfo> {
    try {
      const absolutePath = this.validatePath(relativePath);
      const stats = await fs.stat(absolutePath);

      return {
        nombre: path.basename(absolutePath),
        ruta: relativePath,
        tamaño: stats.size,
        extension: path.extname(absolutePath).toLowerCase(),
        fechaModificacion: stats.mtime.toISOString(),
        esDirectorio: stats.isDirectory()
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`Archivo no encontrado: ${relativePath}`);
      }
      throw new Error(`Error obteniendo información del archivo: ${error}`);
    }
  }

  /**
   * Crea algunos archivos de ejemplo para demostración
   */
  async createExampleFiles(): Promise<void> {
    const examples = [
      {
        path: 'ejemplo.txt',
        content: 'Este es un archivo de ejemplo creado por el servidor MCP.\n\nPuedes leer este contenido usando la herramienta de archivos.'
      },
      {
        path: 'config.json',
        content: JSON.stringify({
          aplicacion: "MCP Tutorial",
          version: process.env.MCP_SERVER_VERSION || "1.0.0",
          configuracion: {
            debug: true,
            puerto: process.env.PORT || 3001,
            baseDatos: process.env.DATABASE_PATH || "tutorial.sqlite"
          },
          caracteristicas: [
            "Servidor MCP",
            "Integración OpenAI",
            "Frontend React",
            "Base de datos SQLite"
          ]
        }, null, 2)
      },
      {
        path: 'notas.md',
        content: `# Notas del Tutorial MCP

## ¿Qué es MCP?

Model Context Protocol (MCP) es un protocolo estándar que permite a los modelos de IA interactuar con herramientas y datos externos.

## Conceptos Clave

- **Servidor MCP**: Expone herramientas, recursos y prompts
- **Cliente MCP**: Consume los servicios del servidor
- **Herramientas**: Acciones que el modelo puede ejecutar
- **Recursos**: Datos que el modelo puede leer
- **Prompts**: Plantillas reutilizables

## Este Tutorial Incluye

1. 🧮 Calculadora matemática
2. 🌤️ Información del clima
3. 📝 Sistema de notas
4. 🗄️ Consultas a base de datos
5. 📁 Manejo de archivos

¡Prueba todas las herramientas desde el chat!
`
      }
    ];

    for (const example of examples) {
      try {
        const exists = await this.fileExists(example.path);
        if (!exists) {
          await this.writeFile(example.path, example.content);
          console.error(`📝 Archivo de ejemplo creado: ${example.path}`);
        }
      } catch (error) {
        console.error(`Error creando archivo de ejemplo ${example.path}:`, error);
      }
    }
  }

  /**
   * Obtiene las extensiones permitidas
   */
  getAllowedExtensions(): string[] {
    return Array.from(this.allowedExtensions);
  }

  /**
   * Obtiene la ruta base
   */
  getBasePath(): string {
    return this.basePath;
  }
}
