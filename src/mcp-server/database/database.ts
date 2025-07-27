/**
 * DATABASE SERVICE - MCP TUTORIAL
 * 
 * This service handles all SQLite interaction.
 * Demonstrates how MCP servers can access databases safely.
 * 
 * 🔑 KEY CONCEPTS:
 * - Automatic schema initialization
 * - Query validation for security
 * - Table statistics
 * - Robust error handling
 */

import { open, Database } from 'sqlite';
import sqlite3 from 'sqlite3';
import { promises as fs } from 'fs';
import path from 'path';

export interface TableStats {
  table: string;
  totalRows: number;
  columns: string[];
  size: string;
  lastModified: string;
}

export class DatabaseService {
  private db: Database | null = null;
  private dbPath: string;

  constructor() {
    // Create data directory if it doesn't exist
    this.dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'tutorial.sqlite');
  }

  /**
   * Initializes the database and creates necessary tables
   */
  async initialize(): Promise<void> {
    try {
      // Create directory if it doesn't exist
      await fs.mkdir(path.dirname(this.dbPath), { recursive: true });

      // Open database connection
      this.db = await open({
        filename: this.dbPath,
        driver: sqlite3.Database
      });

      // Create example tables
      await this.createTables();

      // Insert sample data
      await this.insertSampleData();

      console.error("✅ SQLite database initialized successfully");
    } catch (error) {
      throw new Error(`Error initializing database: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates example tables to demonstrate MCP functionality
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error("Database not initialized");

    // Users table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        age INTEGER,
        city TEXT,
        registration_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Products table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        price DECIMAL(10,2) NOT NULL,
        stock INTEGER DEFAULT 0,
        description TEXT,
        creation_date DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Sales table
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS sales (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        product_id INTEGER,
        quantity INTEGER NOT NULL,
        total_price DECIMAL(10,2) NOT NULL,
        sale_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    // Notes table (for notes service)
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        category TEXT,
        creation_date DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_modified DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("Tables created successfully");
  }

  /**
   * Inserts sample data if tables are empty
   */
  private async insertSampleData(): Promise<void> {
    if (!this.db) return;

    try {
      // Check if there's already data
      const userCount = await this.db.get("SELECT COUNT(*) as count FROM users");

      if (userCount.count === 0) {
        // Insert sample users
        await this.db.exec(`
          INSERT INTO users (name, email, age, city) VALUES
          ('Ana Garcia', 'ana@email.com', 28, 'Madrid'),
          ('Carlos Lopez', 'carlos@email.com', 35, 'Barcelona'),
          ('María Rodriguez', 'maria@email.com', 31, 'Valencia'),
          ('David Martin', 'david@email.com', 29, 'Sevilla'),
          ('Laura Sanchez', 'laura@email.com', 26, 'Bilbao')
        `);

        // Insert sample products
        await this.db.exec(`
          INSERT INTO products (name, category, price, stock, description) VALUES
          ('Dell XPS 13 Laptop', 'Electronics', 1299.99, 15, 'Ultra-light laptop with Intel i7 processor'),
          ('iPhone 15 Pro', 'Electronics', 999.99, 25, 'Smartphone with professional camera'),
          ('Office Desk', 'Furniture', 199.99, 8, 'Ergonomic desk for work'),
          ('Gaming Chair', 'Furniture', 299.99, 12, 'Comfortable chair for long sessions'),
          ('4K Monitor', 'Electronics', 449.99, 18, '27-inch professional monitor')
        `);

        // Insert sample sales
        await this.db.exec(`
          INSERT INTO sales (user_id, product_id, quantity, total_price) VALUES
          (1, 1, 1, 1299.99),
          (2, 2, 1, 999.99),
          (3, 3, 2, 399.98),
          (1, 4, 1, 299.99),
          (4, 5, 1, 449.99)
        `);

        console.error("✅ Sample data inserted into database");
      }
    } catch (error) {
      console.error("⚠️ Error inserting sample data:", error);
    }
  }

  /**
   * Executes an SQL query (SELECT only for security)
   */
  async executeQuery(sql: string): Promise<any[]> {
    if (!this.db) throw new Error("Database not initialized");

    // Security validation
    const sqlTrimmed = sql.trim().toLowerCase();
    if (!sqlTrimmed.startsWith('select')) {
      throw new Error("For security reasons, only SELECT queries are allowed");
    }

    try {
      const results = await this.db.all(sql);
      return results;
    } catch (error) {
      throw new Error(`Error executing query: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets table statistics
   */
  async getTableStats(table: string): Promise<TableStats> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      // Validate that table exists
      const tableExists = await this.db.get(
        "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
        [table]
      );

      if (!tableExists) {
        throw new Error(`Table '${table}' does not exist`);
      }

      // Get row count
      const rowCount = await this.db.get(`SELECT COUNT(*) as count FROM ${table}`);

      // Get column information
      const columns = await this.db.all(`PRAGMA table_info(${table})`);
      const columnNames = columns.map((col: any) => col.name);

      // Get table size (approximate)
      const stats = await this.db.get(`
        SELECT 
          page_count * page_size as size
        FROM pragma_page_count('${table}'), pragma_page_size()
      `);

      return {
        table,
        totalRows: rowCount.count,
        columns: columnNames,
        size: `${Math.round((stats?.size || 0) / 1024)} KB`,
        lastModified: new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Error getting statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all available tables
   */
  async getTables(): Promise<string[]> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const tables = await this.db.all(
        "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
      );
      return tables.map((table: any) => table.name);
    } catch (error) {
      throw new Error(`Error getting tables: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Executes a query for insert/update (used internally by other services)
   */
  async executeWrite(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.run(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Error executing write: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a specific row
   */
  async getOne(sql: string, params: any[] = []): Promise<any> {
    if (!this.db) throw new Error("Database not initialized");

    try {
      const result = await this.db.get(sql, params);
      return result;
    } catch (error) {
      throw new Error(`Error getting record: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Closes the database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
      console.error("✅ Database connection closed");
    }
  }
}
