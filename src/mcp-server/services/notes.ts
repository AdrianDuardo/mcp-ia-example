/**
 * NOTES SERVICE - MCP TUTORIAL
 * 
 * This service demonstrates a complete CRUD using MCP.
 * Allows creating, searching, updating and deleting notes.
 * 
 * 📝 FUNCTIONALITIES:
 * - Create notes with categories
 * - Search notes by content
 * - List notes by category
 * - Data validation
 */

import { DatabaseService } from '../database/database.js';

export interface Note {
  id: number;
  title: string;
  content: string;
  category?: string;
  creationDate: string;
  lastModified: string;
}

export interface CreateNoteRequest {
  title: string;
  content: string;
  category?: string;
}

export class NotesService {
  private dbService: DatabaseService;

  constructor(dbService: DatabaseService) {
    this.dbService = dbService;
  }

  /**
   * Initializes the notes service
   */
  async initialize(): Promise<void> {
    // The database service should already be initialized
    // Create some example notes if they don't exist
    await this.createExampleNotes();
  }

  /**
   * Creates a new note
   */
  async createNote(title: string, content: string, category?: string): Promise<Note> {
    // Validations
    if (!title.trim()) {
      throw new Error("Note title cannot be empty");
    }

    if (!content.trim()) {
      throw new Error("Note content cannot be empty");
    }

    if (title.length > 200) {
      throw new Error("Title cannot have more than 200 characters");
    }

    if (content.length > 10000) {
      throw new Error("Content cannot have more than 10,000 characters");
    }

    try {
      const result = await this.dbService.executeWrite(
        `INSERT INTO notes (title, content, category) 
         VALUES (?, ?, ?)`,
        [title.trim(), content.trim(), category?.trim() || null]
      );

      if (!result.lastID) {
        throw new Error("Error creating note");
      }

      // Get the created note
      const note = await this.dbService.getOne(
        "SELECT * FROM notes WHERE id = ?",
        [result.lastID]
      );

      return this.formatNote(note);
    } catch (error) {
      throw new Error(`Error creating note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Searches notes by title, content or category
   */
  async searchNotes(query?: string, category?: string, limit: number = 10): Promise<Note[]> {
    try {
      let sql = "SELECT * FROM notes WHERE 1=1";
      const params: any[] = [];

      // Filter by query (searches in title and content)
      if (query && query.trim()) {
        sql += " AND (title LIKE ? OR content LIKE ?)";
        const searchTerm = `%${query.trim()}%`;
        params.push(searchTerm, searchTerm);
      }

      // Filter by category
      if (category && category.trim()) {
        sql += " AND category = ?";
        params.push(category.trim());
      }

      // Order by modification date (most recent first)
      sql += " ORDER BY last_modified DESC";

      // Limit results
      if (limit > 0) {
        sql += " LIMIT ?";
        params.push(limit);
      }

      const notes = await this.dbService.executeQuery(sql);
      return notes.map(note => this.formatNote(note));
    } catch (error) {
      throw new Error(`Error searching notes: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets a note by ID
   */
  async getNoteById(id: number): Promise<Note | null> {
    try {
      const note = await this.dbService.getOne(
        "SELECT * FROM notes WHERE id = ?",
        [id]
      );

      return note ? this.formatNote(note) : null;
    } catch (error) {
      throw new Error(`Error getting note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Updates an existing note
   */
  async updateNote(id: number, updates: Partial<CreateNoteRequest>): Promise<Note> {
    try {
      // Check that the note exists
      const existingNote = await this.getNoteById(id);
      if (!existingNote) {
        throw new Error(`Note with ID ${id} not found`);
      }

      // Build dynamic update query
      const fields: string[] = [];
      const values: any[] = [];

      if (updates.title !== undefined) {
        if (!updates.title.trim()) {
          throw new Error("Title cannot be empty");
        }
        if (updates.title.length > 200) {
          throw new Error("Title cannot have more than 200 characters");
        }
        fields.push("title = ?");
        values.push(updates.title.trim());
      }

      if (updates.content !== undefined) {
        if (!updates.content.trim()) {
          throw new Error("Content cannot be empty");
        }
        if (updates.content.length > 10000) {
          throw new Error("Content cannot have more than 10,000 characters");
        }
        fields.push("content = ?");
        values.push(updates.content.trim());
      }

      if (updates.category !== undefined) {
        fields.push("category = ?");
        values.push(updates.category?.trim() || null);
      }

      if (fields.length === 0) {
        throw new Error("No fields to update");
      }

      // Always update modification date
      fields.push("last_modified = CURRENT_TIMESTAMP");
      values.push(id);

      const sql = `UPDATE notes SET ${fields.join(", ")} WHERE id = ?`;
      await this.dbService.executeWrite(sql, values);

      // Return updated note
      const updatedNote = await this.getNoteById(id);
      if (!updatedNote) {
        throw new Error("Error getting updated note");
      }

      return updatedNote;
    } catch (error) {
      throw new Error(`Error updating note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a note by ID
   */
  async deleteNote(id: number): Promise<boolean> {
    try {
      // Check that the note exists
      const existingNote = await this.getNoteById(id);
      if (!existingNote) {
        throw new Error(`Note with ID ${id} not found`);
      }

      const result = await this.dbService.executeWrite(
        "DELETE FROM notes WHERE id = ?",
        [id]
      );

      return result.changes > 0;
    } catch (error) {
      throw new Error(`Error deleting note: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets all available categories
   */
  async getCategories(): Promise<string[]> {
    try {
      const results = await this.dbService.executeQuery(
        "SELECT DISTINCT category FROM notes WHERE category IS NOT NULL ORDER BY category"
      );

      return results.map((row: any) => row.category);
    } catch (error) {
      throw new Error(`Error getting categories: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gets notes statistics
   */
  async getNotesStats(): Promise<{
    total: number;
    byCategory: { [category: string]: number };
    recentCount: number;
  }> {
    try {
      // Total notes
      const totalResult = await this.dbService.getOne("SELECT COUNT(*) as total FROM notes");
      const total = totalResult.total;

      // Notes by category
      const categoryResults = await this.dbService.executeQuery(`
        SELECT 
          COALESCE(category, 'Uncategorized') as category,
          COUNT(*) as count 
        FROM notes 
        GROUP BY category 
        ORDER BY count DESC
      `);

      const byCategory: { [category: string]: number } = {};
      categoryResults.forEach((row: any) => {
        byCategory[row.category] = row.count;
      });

      // Recent notes (last 7 days)
      const recentResult = await this.dbService.getOne(`
        SELECT COUNT(*) as count 
        FROM notes 
        WHERE creation_date >= datetime('now', '-7 days')
      `);
      const recentCount = recentResult.count;

      return {
        total,
        byCategory,
        recentCount
      };
    } catch (error) {
      throw new Error(`Error getting statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Creates some example notes if the table is empty
   */
  private async createExampleNotes(): Promise<void> {
    try {
      const existingNotes = await this.dbService.getOne("SELECT COUNT(*) as count FROM notes");
      
      if (existingNotes.count === 0) {
        const exampleNotes = [
          {
            title: "Welcome to Notes",
            content: "This is your first note! You can create, edit, search and organize your notes by categories.",
            category: "Tutorial"
          },
          {
            title: "Project Ideas",
            content: "List of project ideas to work on:\n1. Task manager app\n2. Weather widget\n3. Recipe organizer\n4. Expense tracker",
            category: "Projects"
          },
          {
            title: "Daily Goals",
            content: "Today's goals:\n- ✅ Complete documentation\n- 📚 Learn TypeScript\n- 🏃 Go for a run\n- 📧 Answer emails",
            category: "Personal"
          },
          {
            title: "Book Recommendations",
            content: "Books to read:\n- 'Clean Code' by Robert Martin\n- 'Design Patterns' by Gang of Four\n- 'The Pragmatic Programmer' by Hunt & Thomas",
            category: "Learning"
          }
        ];

        for (const note of exampleNotes) {
          await this.createNote(note.title, note.content, note.category);
        }

        console.log("✅ Example notes created");
      }
    } catch (error) {
      console.error("⚠️ Error creating example notes:", error);
    }
  }

  /**
   * Formats a database row to Note interface
   */
  private formatNote(note: any): Note {
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      category: note.category,
      creationDate: note.creation_date,
      lastModified: note.last_modified
    };
  }
}
