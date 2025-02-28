"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SessionManager = void 0;
var bun_sqlite_1 = require("bun:sqlite");
var SessionManager = /** @class */ (function () {
    function SessionManager() {
        this.SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
        this.db = new bun_sqlite_1.Database('sessions.db');
        this.initializeDatabase();
    }
    SessionManager.prototype.initializeDatabase = function () {
        // Create sessions table
        this.db.run("\n      CREATE TABLE IF NOT EXISTS sessions (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        device_id TEXT NOT NULL,\n        persistent_uuid TEXT NOT NULL,\n        session_id TEXT NOT NULL,\n        ip_address TEXT NOT NULL,\n        last_accessed INTEGER NOT NULL,\n        created_at INTEGER NOT NULL\n      )\n    ");
        // Create requests table for session limits
        this.db.run("\n      CREATE TABLE IF NOT EXISTS requests (\n        id INTEGER PRIMARY KEY AUTOINCREMENT,\n        session_id TEXT NOT NULL,\n        request_date DATE NOT NULL,\n        request_count INTEGER NOT NULL DEFAULT 0,\n        FOREIGN KEY (session_id) REFERENCES sessions(session_id)\n      )\n    ");
        this.db.run("\n      CREATE INDEX IF NOT EXISTS idx_sessions_access \n      ON sessions(last_accessed)\n    ");
    };
    SessionManager.prototype.validateSession = function (deviceId, persistentUuid, sessionId, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var now, expiryTime, existingSessions, newSession, error_1;
            return __generator(this, function (_a) {
                switch (_a.label) {
                    case 0:
                        now = Date.now();
                        expiryTime = now - this.SESSION_TIMEOUT;
                        _a.label = 1;
                    case 1:
                        _a.trys.push([1, 3, , 4]);
                        existingSessions = this.db.prepare("\n        SELECT * FROM sessions \n        WHERE (device_id = ? OR persistent_uuid = ?)\n        AND last_accessed > ?\n        ORDER BY last_accessed DESC\n        LIMIT 1\n      ").all(deviceId, persistentUuid, expiryTime);
                        // If found valid session, return the existing persistent UUID and session ID
                        if (existingSessions.length > 0) {
                            return [2 /*return*/, {
                                    persistentUuid: existingSessions[0].persistent_uuid,
                                    sessionId: existingSessions[0].session_id
                                }];
                        }
                        return [4 /*yield*/, this.createSessionRecord(deviceId, sessionId, ipAddress)];
                    case 2:
                        newSession = _a.sent();
                        return [2 /*return*/, {
                                persistentUuid: newSession.persistentUuid,
                                sessionId: newSession.sessionId
                            }];
                    case 3:
                        error_1 = _a.sent();
                        console.error('Session validation error:', error_1);
                        return [2 /*return*/, { persistentUuid: null, sessionId: null }]; // Return nulls in case of error
                    case 4: return [2 /*return*/];
                }
            });
        });
    };
    SessionManager.prototype.createSessionRecord = function (deviceId, sessionId, ipAddress) {
        return __awaiter(this, void 0, void 0, function () {
            var now, persistentUuid;
            return __generator(this, function (_a) {
                now = Date.now();
                persistentUuid = this.generatePersistentUuid();
                if (!sessionId)
                    sessionId = this.generatePersistentUuid();
                try {
                    this.db.prepare("\n        INSERT INTO sessions (\n          device_id, persistent_uuid, session_id, \n          ip_address, last_accessed, created_at\n        ) \n        VALUES (?, ?, ?, ?, ?, ?)\n      ").run(deviceId, persistentUuid, sessionId, ipAddress, now, now);
                    return [2 /*return*/, { persistentUuid: persistentUuid, sessionId: sessionId }];
                }
                catch (error) {
                    console.error('Failed to create session record:', error);
                    throw error;
                }
                return [2 /*return*/];
            });
        });
    };
    SessionManager.prototype.generatePersistentUuid = function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    };
    SessionManager.prototype.getUserSessions = function (identifier) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                // Get all sessions associated with any of the user's identifiers
                return [2 /*return*/, this.db.prepare("\n      SELECT * FROM sessions \n      WHERE sync_id = ? \n      OR device_id = ? \n      OR persistent_uuid = ?\n      ORDER BY created_at DESC\n    ").all(identifier, identifier, identifier)];
            });
        });
    };
    SessionManager.prototype.checkRequestLimit = function (sessionId, persistentUuid, deviceId, requestDate) {
        return __awaiter(this, void 0, void 0, function () {
            var result;
            return __generator(this, function (_a) {
                result = this.db.prepare("\n      SELECT request_count FROM requests \n      WHERE (session_id = ? OR session_id = ? OR session_id = ?)\n      AND request_date = ?\n    ").get(sessionId, persistentUuid, deviceId, requestDate);
                return [2 /*return*/, result ? result.request_count : 0]; // Return 0 if no record found
            });
        });
    };
    SessionManager.prototype.incrementRequestCount = function (sessionId, persistentUuid, deviceId, requestDate) {
        return __awaiter(this, void 0, void 0, function () {
            var existingRecord;
            return __generator(this, function (_a) {
                existingRecord = this.db.prepare("\n    SELECT * FROM requests \n    WHERE (session_id = ? OR session_id = ? OR session_id = ?)\n    AND request_date = ?\n  ").get(sessionId, persistentUuid, deviceId, requestDate);
                if (existingRecord) {
                    // Increment the existing count
                    this.db.prepare("\n      UPDATE requests \n      SET request_count = request_count + 1 \n      WHERE (session_id = ? OR session_id = ? OR session_id = ?)\n      AND request_date = ?\n    ").run(sessionId, persistentUuid, deviceId, requestDate);
                }
                else {
                    // Insert a new record with count 1
                    this.db.prepare("\n      INSERT INTO requests (session_id, request_date, request_count) \n      VALUES (?, ?, 1)\n    ").run(sessionId, requestDate);
                }
                return [2 /*return*/];
            });
        });
    };
    return SessionManager;
}());
exports.SessionManager = SessionManager;
