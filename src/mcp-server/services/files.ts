/**
 * FILE SERVICE - MCP TUTORIAL
 * 
 * This service demonstrates how MCP can access the file system
 * in a secure and controlled way.
 * 
 * 📁 FEATURES:
 * - File reading with security validations
 * - File writing in secure directory
 * - File listing
 * - Allowed extensions validation
 */

import { promises as fs } from 'fs';
import path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  extension: string;
  modificationDate: string;
  isDirectory: boolean;
}

export class FileService {
  private basePath: string;
  private allowedExtensions: Set<string>;
  private maxFileSize: number;

  constructor() {
    // Secure base directory for file operations
    this.basePath = path.join(process.cwd(), 'data');

    // Allowed extensions for security
    this.allowedExtensions = new Set([
      '.txt', '.md', '.json', '.csv', '.log',
      '.yml', '.yaml', '.xml', '.config',
      '.js', '.ts', '.html', '.css'
    ]);

    // Maximum file size: 10MB
    this.maxFileSize = 10 * 1024 * 1024;

    // Create base directory if it doesn't exist
    this.ensureBaseDirectory();
  }

  /**
   * Ensures the base directory exists
   */
  private async ensureBaseDirectory(): Promise<void> {
    try {
      await fs.mkdir(this.basePath, { recursive: true });
    } catch (error) {
      console.error("Error creating base directory:", error);
    }
  }

  /**
   * Validates that a path is secure (doesn't exit the base directory)
   */
  private validatePath(filePath: string): string {
    // Resolve absolute path
    const absolutePath = path.resolve(this.basePath, filePath);

    // Verify it doesn't exit the base directory
    if (!absolutePath.startsWith(this.basePath)) {
      throw new Error("Access denied: Path is outside the allowed directory");
    }

    return absolutePath;
  }

  /**
   * Validates that an extension is allowed
   */
  private validateExtension(filePath: string): void {
    const extension = path.extname(filePath).toLowerCase();

    if (!this.allowedExtensions.has(extension)) {
      throw new Error(`Extension not allowed: ${extension}. Allowed extensions: ${Array.from(this.allowedExtensions).join(', ')}`);
    }
  }

  /**
   * Reads the content of a file
   */
  async readFile(relativePath: string): Promise<string> {
    try {
      const absolutePath = this.validatePath(relativePath);
      this.validateExtension(absolutePath);

      // Verify the file exists
      const stats = await fs.stat(absolutePath);

      if (stats.isDirectory()) {
        throw new Error("The specified path is a directory, not a file");
      }

      // Verify size
      if (stats.size > this.maxFileSize) {
        throw new Error(`File too large: ${Math.round(stats.size / 1024 / 1024)}MB. Maximum allowed: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
      }

      // Read file
      const content = await fs.readFile(absolutePath, 'utf-8');

      console.error(`📖 File read: ${relativePath} (${stats.size} bytes)`);
      return content;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`File not found: ${relativePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`No permissions to read file: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error reading file: ${error}`);
    }
  }

  /**
   * Writes content to a file
   */
  async writeFile(relativePath: string, content: string): Promise<void> {
    try {
      const absolutePath = this.validatePath(relativePath);
      this.validateExtension(absolutePath);

      // Create parent directory if it doesn't exist
      const directory = path.dirname(absolutePath);
      await fs.mkdir(directory, { recursive: true });

      // Verify content size
      const contentSize = Buffer.byteLength(content, 'utf-8');
      if (contentSize > this.maxFileSize) {
        throw new Error(`Content too large: ${Math.round(contentSize / 1024 / 1024)}MB. Maximum allowed: ${Math.round(this.maxFileSize / 1024 / 1024)}MB`);
      }

      // Write file
      await fs.writeFile(absolutePath, content, 'utf-8');

      console.error(`💾 File written: ${relativePath} (${contentSize} bytes)`);

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('EACCES')) {
          throw new Error(`No permissions to write file: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error writing file: ${error}`);
    }
  }

  /**
   * Lists files in a directory
   */
  async listFiles(relativePath: string = ''): Promise<FileInfo[]> {
    try {
      const absolutePath = this.validatePath(relativePath);

      // Verify the directory exists
      const stats = await fs.stat(absolutePath);
      if (!stats.isDirectory()) {
        throw new Error("The specified path is not a directory");
      }

      const files = await fs.readdir(absolutePath);
      const fileInfos: FileInfo[] = [];

      for (const file of files) {
        try {
          const filePath = path.join(absolutePath, file);
          const fileStats = await fs.stat(filePath);
          const extension = path.extname(file).toLowerCase();

          // Only include files with allowed extensions or directories
          if (fileStats.isDirectory() || this.allowedExtensions.has(extension)) {
            fileInfos.push({
              name: file,
              path: path.relative(this.basePath, filePath),
              size: fileStats.size,
              extension: extension,
              modificationDate: fileStats.mtime.toISOString(),
              isDirectory: fileStats.isDirectory()
            });
          }
        } catch (error) {
          // Continue with next file if there's an error
          console.error(`Error getting info for ${file}:`, error);
        }
      }

      // Sort: directories first, then files alphabetically
      fileInfos.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });

      console.error(`📁 Listed ${fileInfos.length} elements in: ${relativePath || '/'}`);
      return fileInfos;

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes('ENOENT')) {
          throw new Error(`Directory not found: ${relativePath}`);
        } else if (error.message.includes('EACCES')) {
          throw new Error(`No permissions to access directory: ${relativePath}`);
        }
        throw error;
      }
      throw new Error(`Error listing files: ${error}`);
    }
  }

  /**
   * Checks if a file exists
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
   * Gets file information
   */
  async getFileInfo(relativePath: string): Promise<FileInfo> {
    try {
      const absolutePath = this.validatePath(relativePath);
      const stats = await fs.stat(absolutePath);

      return {
        name: path.basename(absolutePath),
        path: relativePath,
        size: stats.size,
        extension: path.extname(absolutePath).toLowerCase(),
        modificationDate: stats.mtime.toISOString(),
        isDirectory: stats.isDirectory()
      };
    } catch (error) {
      if (error instanceof Error && error.message.includes('ENOENT')) {
        throw new Error(`File not found: ${relativePath}`);
      }
      throw new Error(`Error getting file information: ${error}`);
    }
  }

  /**
   * Creates some example files for demonstration
   */
  async createExampleFiles(): Promise<void> {
    const examples = [
      {
        path: 'example.txt',
        content: 'This is an example file created by the MCP server.\n\nYou can read this content using the file tools.'
      },
      {
        path: 'config.json',
        content: JSON.stringify({
          application: "MCP Tutorial",
          version: process.env.MCP_SERVER_VERSION || "1.0.0",
          configuration: {
            debug: true,
            port: process.env.PORT || 3001,
            database: process.env.DATABASE_PATH || "tutorial.sqlite"
          },
          features: [
            "MCP Server",
            "OpenAI Integration",
            "React Frontend",
            "SQLite Database"
          ]
        }, null, 2)
      },
      {
        path: 'notes.md',
        content: `# MCP Tutorial Notes

## What is MCP?

Model Context Protocol (MCP) is a standard protocol that allows AI models to interact with external tools and data.

## Key Concepts

- **MCP Server**: Exposes tools, resources and prompts
- **MCP Client**: Consumes server services
- **Tools**: Actions the model can execute
- **Resources**: Data the model can read
- **Prompts**: Reusable templates

## This Tutorial Includes

1. 🧮 Mathematical calculator
2. 🌤️ Weather information
3. 📝 Notes system
4. 🗄️ Database queries
5. 📁 File management

Try all the tools from the chat!
`
      }
    ];

    for (const example of examples) {
      try {
        const exists = await this.fileExists(example.path);
        if (!exists) {
          await this.writeFile(example.path, example.content);
          console.error(`📝 Example file created: ${example.path}`);
        }
      } catch (error) {
        console.error(`Error creating example file ${example.path}:`, error);
      }
    }
  }

  /**
   * Gets allowed extensions
   */
  getAllowedExtensions(): string[] {
    return Array.from(this.allowedExtensions);
  }

  /**
   * Gets base path
   */
  getBasePath(): string {
    return this.basePath;
  }
}
