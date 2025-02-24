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
        device_id TEXT NOT NULL,
        persistent_uuid TEXT NOT NULL,
        session_id TEXT NOT NULL,
        ip_address TEXT NOT NULL,
        last_accessed INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      )
    `);

        // Create requests table for session limits
        this.db.run(`
      CREATE TABLE IF NOT EXISTS requests (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        request_date DATE NOT NULL,
        request_count INTEGER NOT NULL DEFAULT 0,
        FOREIGN KEY (session_id) REFERENCES sessions(session_id)
      )
    `);

        this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_sessions_access 
      ON sessions(last_accessed)
    `);
    }

    async validateSession(
        deviceId: string,
        persistentUuid: string,
        sessionId: string | null,
        ipAddress: string
    ): Promise<{ persistentUuid: string | null, sessionId: string | null }> {
        const now = Date.now();
        const expiryTime = now - this.SESSION_TIMEOUT;

        try {
            const existingSessions = this.db.prepare(`
        SELECT * FROM sessions 
        WHERE (device_id = ? OR persistent_uuid = ?)
        AND last_accessed > ?
        ORDER BY last_accessed DESC
        LIMIT 1
      `).all(deviceId, persistentUuid, expiryTime) as Session[];

            // If found valid session, return the existing persistent UUID and session ID
            if (existingSessions.length > 0) {
                return {
                    persistentUuid: existingSessions[0].persistent_uuid,
                    sessionId: existingSessions[0].session_id
                };
            }

            // No valid session found, create a new one
            const newSession = await this.createSessionRecord(deviceId, sessionId, ipAddress);
            return {
                persistentUuid: newSession.persistentUuid,
                sessionId: newSession.sessionId
            };
        } catch (error) {
            console.error('Session validation error:', error);
            return { persistentUuid: null, sessionId: null }; // Return nulls in case of error
        }
    }

    private async createSessionRecord(
        deviceId: string,
        sessionId: string | null,
        ipAddress: string
    ): Promise<{ persistentUuid: string, sessionId: string }> {
        const now = Date.now();
        const persistentUuid = this.generatePersistentUuid();

        if (!sessionId) sessionId = this.generatePersistentUuid();

        try {
            this.db.prepare(`
        INSERT INTO sessions (
          device_id, persistent_uuid, session_id, 
          ip_address, last_accessed, created_at
        ) 
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(deviceId, persistentUuid, sessionId, ipAddress, now, now);

            return { persistentUuid, sessionId };
        } catch (error) {
            console.error('Failed to create session record:', error);
            throw error;
        }
    }

    private generatePersistentUuid(): string {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            const r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
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

    async checkRequestLimit(
        sessionId: string,
        persistentUuid: string,
        deviceId: string,
        requestDate: string
    ): Promise<number> {
        const result = this.db.prepare(`
      SELECT request_count FROM requests 
      WHERE (session_id = ? OR session_id = ? OR session_id = ?)
      AND request_date = ?
    `).get(sessionId, persistentUuid, deviceId, requestDate) as { request_count: number } | undefined;

        return result ? result.request_count : 0; // Return 0 if no record found
    }

    async incrementRequestCount(
        sessionId: string,
        persistentUuid: string,
        deviceId: string,
        requestDate: string
    ): Promise<void> {
        const existingRecord = this.db.prepare(`
    SELECT * FROM requests 
    WHERE (session_id = ? OR session_id = ? OR session_id = ?)
    AND request_date = ?
  `).get(sessionId, persistentUuid, deviceId, requestDate);

        if (existingRecord) {
            // Increment the existing count
            this.db.prepare(`
      UPDATE requests 
      SET request_count = request_count + 1 
      WHERE (session_id = ? OR session_id = ? OR session_id = ?)
      AND request_date = ?
    `).run(sessionId, persistentUuid, deviceId, requestDate);
        } else {
            // Insert a new record with count 1
            this.db.prepare(`
      INSERT INTO requests (session_id, request_date, request_count) 
      VALUES (?, ?, 1)
    `).run(sessionId, requestDate);
        }
    }
}