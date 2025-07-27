/**
 * SERVICIO DE NOTAS - TUTORIAL MCP
 * 
 * Este servicio demuestra un CRUD completo usando MCP.
 * Permite crear, buscar, actualizar y eliminar notas.
 * 
 * 📝 FUNCIONALIDADES:
 * - Crear notas con categorías
 * - Buscar notas por contenido
 * - Listar notas por categoría
 * - Validación de datos
 */

import { DatabaseService } from '../database/database.js';

export interface Note {
  id: number;
  titulo: string;
  contenido: string;
  categoria?: string;
  fechaCreacion: string;
  fechaModificacion: string;
}

export interface CreateNoteRequest {
  titulo: string;
  contenido: string;
  categoria?: string;
}

export class NotesService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  /**
   * Inicializa el servicio de notas
   */
  async initialize(): Promise<void> {
    // El servicio de base de datos ya debe estar inicializado
    // Crear algunas notas de ejemplo si no existen
    await this.createExampleNotes();
  }

  /**
   * Crea una nueva nota
   */
  async createNote(titulo: string, contenido: string, categoria?: string): Promise<Note> {
    // Validaciones
    if (!titulo.trim()) {
      throw new Error("El título de la nota no puede estar vacío");
    }

    if (!contenido.trim()) {
      throw new Error("El contenido de la nota no puede estar vacío");
    }

    if (titulo.length > 200) {
      throw new Error("El título no puede tener más de 200 caracteres");
    }

    if (contenido.length > 10000) {
      throw new Error("El contenido no puede tener más de 10,000 caracteres");
    }

    try {
      const result = await this.dbService.executeWrite(
        `INSERT INTO notas (titulo, contenido, categoria) 
         VALUES (?, ?, ?)`,
        [titulo.trim(), contenido.trim(), categoria?.trim() || null]
      );

      if (!result.lastID) {
        throw new Error("Error creando la nota");
      }

      // Obtener la nota creada
      const nota = await this.dbService.getOne(
        "SELECT * FROM notas WHERE id = ?",
        [result.lastID]
      );

      return this.formatNote(nota);
    } catch (error) {
      throw new Error(`Error creando nota: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Busca notas por título, contenido o categoría
   */
  async searchNotes(query?: string, categoria?: string, limite: number = 10): Promise<Note[]> {
    try {
      let sql = "SELECT * FROM notas WHERE 1=1";
      const params: any[] = [];

      // Filtro por query (busca en título y contenido)
      if (query && query.trim()) {
        sql += " AND (titulo LIKE ? OR contenido LIKE ?)";
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm);
      }

      // Filtro por categoría
      if (categoria && categoria.trim()) {
        sql += " AND categoria = ?";
        params.push(categoria.trim());
      }

      // Ordenar por fecha de modificación (más recientes primero)
      sql += " ORDER BY fecha_modificacion DESC";

      // Limitar resultados
      if (limite > 0) {
        sql += " LIMIT ?";
        params.push(limite);
      }

      const notas = await this.dbService.executeQuery(sql);
      return notas.map(nota => this.formatNote(nota));
    } catch (error) {
      throw new Error(`Error buscando notas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene una nota por ID
   */
  async getNoteById(id: number): Promise<Note | null> {
    try {
      const nota = await this.dbService.getOne(
        "SELECT * FROM notas WHERE id = ?",
        [id]
      );

      return nota ? this.formatNote(nota) : null;
    } catch (error) {
      throw new Error(`Error obteniendo nota: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Actualiza una nota existente
   */
  async updateNote(id: number, updates: Partial<CreateNoteRequest>): Promise<Note> {
    try {
      // Verificar que la nota existe
      const notaExistente = await this.getNoteById(id);
      if (!notaExistente) {
        throw new Error(`Nota con ID ${id} no encontrada`);
      }

      // Construir consulta de actualización
      const campos: string[] = [];
      const valores: any[] = [];

      if (updates.titulo !== undefined) {
        if (!updates.titulo.trim()) {
          throw new Error("El título no puede estar vacío");
        }
        if (updates.titulo.length > 200) {
          throw new Error("El título no puede tener más de 200 caracteres");
        }
        campos.push("titulo = ?");
        valores.push(updates.titulo.trim());
      }

      if (updates.contenido !== undefined) {
        if (!updates.contenido.trim()) {
          throw new Error("El contenido no puede estar vacío");
        }
        if (updates.contenido.length > 10000) {
          throw new Error("El contenido no puede tener más de 10,000 caracteres");
        }
        campos.push("contenido = ?");
        valores.push(updates.contenido.trim());
      }

      if (updates.categoria !== undefined) {
        campos.push("categoria = ?");
        valores.push(updates.categoria?.trim() || null);
      }

      if (campos.length === 0) {
        throw new Error("No hay campos para actualizar");
      }

      // Agregar fecha de modificación
      campos.push("fecha_modificacion = CURRENT_TIMESTAMP");
      valores.push(id);

      const sql = `UPDATE notas SET ${campos.join(', ')} WHERE id = ?`;

      const result = await this.dbService.executeWrite(sql, valores);

      if (result.changes === 0) {
        throw new Error("No se pudo actualizar la nota");
      }

      // Obtener la nota actualizada
      const notaActualizada = await this.getNoteById(id);
      if (!notaActualizada) {
        throw new Error("Error obteniendo la nota actualizada");
      }

      return notaActualizada;
    } catch (error) {
      throw new Error(`Error actualizando nota: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Elimina una nota por ID
   */
  async deleteNote(id: number): Promise<boolean> {
    try {
      const result = await this.dbService.executeWrite(
        "DELETE FROM notas WHERE id = ?",
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error eliminando nota: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene todas las categorías únicas
   */
  async getCategories(): Promise<string[]> {
    try {
      const result = await this.dbService.executeQuery(
        "SELECT DISTINCT categoria FROM notas WHERE categoria IS NOT NULL ORDER BY categoria"
      );

      return result.map(row => row.categoria);
    } catch (error) {
      throw new Error(`Error obteniendo categorías: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene estadísticas de las notas
   */
  async getStats(): Promise<{
    totalNotas: number;
    categorias: number;
    notaSinCategoria: number;
    promedioCaracteres: number;
  }> {
    try {
      const totalNotas = await this.dbService.getOne(
        "SELECT COUNT(*) as count FROM notas"
      );

      const categorias = await this.dbService.getOne(
        "SELECT COUNT(DISTINCT categoria) as count FROM notas WHERE categoria IS NOT NULL"
      );

      const sinCategoria = await this.dbService.getOne(
        "SELECT COUNT(*) as count FROM notas WHERE categoria IS NULL"
      );

      const promedio = await this.dbService.getOne(
        "SELECT AVG(LENGTH(contenido)) as promedio FROM notas"
      );

      return {
        totalNotas: totalNotas.count,
        categorias: categorias.count,
        notaSinCategoria: sinCategoria.count,
        promedioCaracteres: Math.round(promedio.promedio || 0)
      };
    } catch (error) {
      throw new Error(`Error obteniendo estadísticas: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Formatea una nota de la base de datos
   */
  private formatNote(nota: any): Note {
    return {
      id: nota.id,
      titulo: nota.titulo,
      contenido: nota.contenido,
      categoria: nota.categoria,
      fechaCreacion: new Date(nota.fecha_creacion).toISOString(),
      fechaModificacion: new Date(nota.fecha_modificacion).toISOString()
    };
  }

  /**
   * Crea notas de ejemplo para demostración
   */
  private async createExampleNotes(): Promise<void> {
    try {
      // Verificar si ya hay notas
      const existingNotes = await this.dbService.getOne("SELECT COUNT(*) as count FROM notas");

      if (existingNotes.count === 0) {
        const ejemplos = [
          {
            titulo: "Bienvenido a MCP",
            contenido: "Este es tu primer sistema de notas usando Model Context Protocol.\n\nPuedes crear, buscar y gestionar notas usando comandos de chat natural.\n\nPrueba comandos como:\n- 'Crea una nota sobre mi reunión'\n- 'Busca notas sobre MCP'\n- 'Muestra todas mis notas de trabajo'",
            categoria: "Tutorial"
          },
          {
            titulo: "Ideas para el proyecto",
            contenido: "Lista de ideas para mejorar este tutorial:\n\n1. Agregar más herramientas MCP\n2. Implementar autenticación\n3. Añadir notificaciones en tiempo real\n4. Crear API REST completa\n5. Agregar tests automatizados\n\nRecordar: Mantener el código simple y bien documentado.",
            categoria: "Desarrollo"
          },
          {
            titulo: "Comandos útiles",
            contenido: "Comandos de terminal útiles para desarrollo:\n\n```bash\nnpm run dev          # Ejecutar en modo desarrollo\nnpm run build        # Compilar TypeScript\nnpm test             # Ejecutar tests\nnpm run clean        # Limpiar archivos compilados\n```\n\nRecordar configurar las variables de entorno antes de ejecutar.",
            categoria: "Referencia"
          },
          {
            titulo: "Lista de tareas",
            contenido: "Tareas pendientes:\n\n- [x] Configurar servidor MCP\n- [x] Implementar herramientas básicas\n- [x] Crear base de datos\n- [ ] Agregar autenticación\n- [ ] Mejorar interfaz de usuario\n- [ ] Escribir documentación completa\n- [ ] Crear videos tutoriales",
            categoria: "Tareas"
          }
        ];

        for (const ejemplo of ejemplos) {
          await this.dbService.executeWrite(
            `INSERT INTO notas (titulo, contenido, categoria) VALUES (?, ?, ?)`,
            [ejemplo.titulo, ejemplo.contenido, ejemplo.categoria]
          );
        }

        console.error("✅ Notas de ejemplo creadas");
      }
    } catch (error) {
      console.error("⚠️ Error creando notas de ejemplo:", error);
    }
  }
}
