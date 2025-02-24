import { Database } from 'bun:sqlite';

interface Session {
  id: number;
  sync_id: string | null;
  device_id: string;
  persistent_uuid: string;
  session_id: string;
  ip_address: string;
  last_accessed: number;
  created_at: number;
}

export class SessionManager {
  readonly db: Database;
  private readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.db = new Database('sessions.db');
    this.initializeDatabase();
  }

  private initializeDatabase() {
    // Create sessions table
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        sync_id TEXT,
        device_id TEXT NOT NULL,
        persistent_uuid TEXT NOT NULL,
        session_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_sessions_identifiers 
      ON sessions(sync_id, device_id, persistent_uuid)
    `);

    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_sessions_access 
      ON sessions(last_accessed)
    `);
  }

  async validateSession(
    syncId: string | null,
    deviceId: string,
    persistentUuid: string,
    sessionId: string,
    ipAddress: string
  ): Promise<boolean> {
    const now = Date.now();
    const expiryTime = now - this.SESSION_TIMEOUT;

    try {
      // Look for any valid session matching ANY of our identifiers
      const existingSessions = this.db.prepare(`
        SELECT * FROM sessions 
        WHERE (sync_id = ? OR device_id = ? OR persistent_uuid = ?)
        AND last_accessed > ?
        ORDER BY last_accessed DESC
        LIMIT 1
      `).all(syncId, deviceId, persistentUuid, expiryTime) as Session[];

      // If we found a valid session, create a new session record
      if (existingSessions.length > 0) {
        await this.createSessionRecord(syncId, deviceId, persistentUuid, sessionId, ipAddress);
        return true;
      }

      // No valid session found, but create a new one
      await this.createSessionRecord(syncId, deviceId, persistentUuid, sessionId, ipAddress);
      return true;

    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  private async createSessionRecord(
    syncId: string | null,
    deviceId: string,
    persistentUuid: string,
    sessionId: string,
    ipAddress: string
  ): Promise<void> {
    const now = Date.now();
    
    try {
      this.db.prepare(`
        INSERT INTO sessions (
          sync_id, device_id, persistent_uuid, session_id, 
          ip_address, last_accessed, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(syncId, deviceId, persistentUuid, sessionId, ipAddress, now, now);
    } catch (error) {
      console.error('Failed to create session record:', error);
      throw error;
    }
  }

  async getUserSessions(identifier: string): Promise<Session[]> {
    // Get all sessions associated with any of the user's identifiers
    return this.db.prepare(`
      SELECT * FROM sessions 
      WHERE sync_id = ? 
      OR device_id = ? 
      OR persistent_uuid = ?
      ORDER BY created_at DESC
    `).all(identifier, identifier, identifier) as Session[];
  }
}