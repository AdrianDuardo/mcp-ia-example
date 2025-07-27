/**
 * SERVICIO DE BASE DE DATOS - TUTORIAL MCP
 * 
 * Este servicio maneja toda la interacción con SQLite.
 * Demuestra cómo MCP puede acceder a bases de datos de forma segura.
 * 
 * 🔑 CONCEPTOS CLAVE:
 * - Inicialización automática de esquemas
 * - Validación de consultas por seguridad
 * - Estadísticas de tablas
 * - Manejo de errores robusto
 */

import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export interface TableStats {
  tabla: string;
  totalFilas: number;
  columnas: string[];
  tamaño: string;
  ultimaModificacion: string;
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Crear directorio de datos si no existe
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tutorial.sqlite');
  }

  /**
   * Inicializa la base de datos y crea las tablas necesarias
   */
  async initialize(): Promise<void> {
    try {
      // Crear directorio si no existe
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

      // Abrir conexión a la base de datos
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Crear tablas de ejemplo
      await this.createTables();

      // Insertar datos de ejemplo
      await this.insertSampleData();

      console.error("✅ Base de datos SQLite inicializada correctamente");
    } catch (error) {
      throw new Error(`Error inicializando base de datos: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Crea las tablas de ejemplo para demostrar funcionalidad MCP
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    // Tabla de usuarios
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        edad INTEGER,
        ciudad TEXT,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de productos
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS productos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre TEXT NOT NULL,
        categoria TEXT NOT NULL,
        precio DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        descripcion TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Tabla de ventas
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS ventas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario_id INTEGER,
        producto_id INTEGER,
        cantidad INTEGER NOT NULL,
        precio_total DECIMAL(10,2) NOT NULL,
        fecha_venta DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id),
        FOREIGN KEY (producto_id) REFERENCES productos(id)
      )
    `);

    // Tabla de notas (para el servicio de notas)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        contenido TEXT NOT NULL,
        categoria TEXT,
        fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
        fecha_modificacion DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  /**
   * Inserta datos de ejemplo si las tablas están vacías
   */
  private async insertSampleData(): Promise<void> {
    if (!this.db) return;

    try {
      // Verificar si ya hay datos
      const userCount = await this.db.get("SELECT COUNT(*) as count FROM usuarios");

      if (userCount.count === 0) {
        // Insertar usuarios de ejemplo
        await this.db.exec(`
          INSERT INTO usuarios (nombre, email, edad, ciudad) VALUES
          ('Ana García', 'ana@email.com', 28, 'Madrid'),
          ('Carlos López', 'carlos@email.com', 35, 'Barcelona'),
          ('María Rodríguez', 'maria@email.com', 31, 'Valencia'),
          ('David Martín', 'david@email.com', 29, 'Sevilla'),
          ('Laura Sánchez', 'laura@email.com', 26, 'Bilbao')
        `);

        // Insertar productos de ejemplo
        await this.db.exec(`
          INSERT INTO productos (nombre, categoria, precio, stock, descripcion) VALUES
          ('Laptop Dell XPS 13', 'Electrónicos', 1299.99, 15, 'Laptop ultraligera con procesador Intel i7'),
          ('iPhone 15 Pro', 'Electrónicos', 999.99, 25, 'Smartphone con cámara profesional'),
          ('Mesa de Oficina', 'Muebles', 199.99, 8, 'Mesa ergonómica para trabajo'),
          ('Silla Gaming', 'Muebles', 299.99, 12, 'Silla cómoda para largas sesiones'),
          ('Monitor 4K', 'Electrónicos', 449.99, 18, 'Monitor profesional de 27 pulgadas')
        `);

        // Insertar algunas ventas de ejemplo
        await this.db.exec(`
          INSERT INTO ventas (usuario_id, producto_id, cantidad, precio_total) VALUES
          (1, 1, 1, 1299.99),
          (2, 2, 1, 999.99),
          (3, 3, 2, 399.98),
          (1, 4, 1, 299.99),
          (4, 5, 1, 449.99)
        `);

        console.error("✅ Datos de ejemplo insertados en la base de datos");
      }
    } catch (error) {
      console.error("⚠️ Error insertando datos de ejemplo:", error);
    }
  }

  /**
   * Ejecuta una consulta SQL (solo SELECT por seguridad)
   */
  async executeQuery(sql: string): Promise<any[]> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    // Validación de seguridad
    const sqlTrimmed = sql.trim().toLowerCase();
    if (!sqlTrimmed.startsWith('select')) {
      throw new Error("Por seguridad, solo se permiten consultas SELECT");
    }

    try {
      const resultados = await this.db.all(sql);
      return resultados;
    } catch (error) {
      throw new Error(`Error ejecutando consulta: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene estadísticas de una tabla
   */
  async getTableStats(tabla: string): Promise<TableStats> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    try {
      // Validar que la tabla existe
      const tableExists = await this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [tabla]
      );

      if (!tableExists) {
        throw new Error(`La tabla '${tabla}' no existe`);
      }

      // Obtener número de filas
      const rowCount = await this.db.get(`SELECT COUNT(*) as count FROM ${tabla}`);

      // Obtener información de columnas
      const columns = await this.db.all(`PRAGMA table_info(${tabla})`);
      const columnNames = columns.map((col: any) => col.name);

      // Obtener tamaño de la tabla (aproximado)
      const stats = await this.db.get(`
        SELECT 
          page_count * page_size as size
        FROM pragma_page_count('${tabla}'), pragma_page_size()
      `);

      return {
        tabla,
        totalFilas: rowCount.count,
        columnas: columnNames,
        tamaño: `${Math.round((stats?.size || 0) / 1024)} KB`,
        ultimaModificacion: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Lista todas las tablas disponibles
   */
  async getTables(): Promise<string[]> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    try {
      const tables = await this.db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      return tables.map((table: any) => table.name);
    } catch (error) {
      throw new Error(`Error obteniendo tablas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Ejecuta una consulta para insertar/actualizar (usado internamente por otros servicios)
   */
  async executeWrite(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    try {
      const result = await this.db.run(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Error ejecutando escritura: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene una fila específica
   */
  async getOne(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error("Base de datos no inicializada");

    try {
      const result = await this.db.get(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Error obteniendo registro: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Cierra la conexión a la base de datos
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.error("✅ Conexión a base de datos cerrada");
    }
  }
}
