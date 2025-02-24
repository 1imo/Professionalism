import { Database } from 'bun:sqlite';

interface LogEntry {
    id: number;
    level: string | null;
    message: string | null;
    ip: string | null;
    sessionId: string | null;
    createdAt: number;
}

export class LoggingManager {
    readonly db: Database;

    constructor() {
        this.db = new Database('sessions.db');
        this.initializeDatabase();
    }

    private initializeDatabase() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                level TEXT,
                message TEXT,
                ip TEXT,
                session_id TEXT,
                function_name TEXT,
                file_name TEXT,
                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
            )
        `);
    }

    public async log(level: any, message: any, ip: any, sessionId: any, functionName: any, fileName: any) {
        try {
            this.db.prepare(`
                INSERT INTO logs (level, message, ip, session_id, function_name, file_name) 
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(level ?? null, message ?? null, ip ?? null, sessionId ?? null, functionName ?? null, fileName ?? null);
        } catch (error) {
            console.error('Failed to log message:', error);
        }
    }

    public info(message: string | null, ip?: string | null, sessionId?: string | null) {
        const callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('INFO', message, ip ?? null, sessionId ?? null, callerInfo.functionName, callerInfo.fileName);
    }

    public warn(message: string | null, ip?: string | null, sessionId?: string | null) {
        const callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('WARN', message, ip ?? null, sessionId ?? null, callerInfo.functionName, callerInfo.fileName);
    }

    public error(message: string | null, ip?: string | null, sessionId?: string | null) {
        const callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('ERROR', message, ip ?? null, sessionId ?? null, callerInfo.functionName, callerInfo.fileName);
    }

    private extractCallerInfo(stack: string | undefined): { functionName: string; fileName: string } {
        if (!stack) return { functionName: 'unknown', fileName: 'unknown' };

        const stackLines = stack.split('\n');
        const callerLine = stackLines[2] || '';
        const match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);

        if (match) {
            return {
                functionName: match[1] || 'unknown',
                fileName: match[2] || 'unknown'
            };
        }

        return { functionName: 'unknown', fileName: 'unknown' };
    }

    public getLogs(): LogEntry[] {
        return this.db.prepare(`
            SELECT * FROM logs 
            ORDER BY created_at DESC
        `).all() as LogEntry[];
    }
}

export const logger = new LoggingManager();
