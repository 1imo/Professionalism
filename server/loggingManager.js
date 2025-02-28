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
exports.logger = exports.LoggingManager = void 0;
var bun_sqlite_1 = require("bun:sqlite");
var LoggingManager = /** @class */ (function () {
    function LoggingManager() {
        this.db = new bun_sqlite_1.Database('sessions.db');
        this.initializeDatabase();
    }
    LoggingManager.prototype.initializeDatabase = function () {
        this.db.run("\n            CREATE TABLE IF NOT EXISTS logs (\n                id INTEGER PRIMARY KEY AUTOINCREMENT,\n                level TEXT,\n                message TEXT,\n                ip TEXT,\n                session_id TEXT,\n                function_name TEXT,\n                file_name TEXT,\n                created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))\n            )\n        ");
    };
    LoggingManager.prototype.log = function (level, message, ip, sessionId, functionName, fileName) {
        return __awaiter(this, void 0, void 0, function () {
            return __generator(this, function (_a) {
                try {
                    this.db.prepare("\n                INSERT INTO logs (level, message, ip, session_id, function_name, file_name) \n                VALUES (?, ?, ?, ?, ?, ?)\n            ").run(String(level !== null && level !== void 0 ? level : null), String(message !== null && message !== void 0 ? message : null), String(ip !== null && ip !== void 0 ? ip : null), String(sessionId !== null && sessionId !== void 0 ? sessionId : null), String(functionName !== null && functionName !== void 0 ? functionName : null), String(fileName !== null && fileName !== void 0 ? fileName : null));
                }
                catch (error) {
                    console.error('Failed to log message:', error);
                }
                return [2 /*return*/];
            });
        });
    };
    LoggingManager.prototype.info = function (message, ip, sessionId) {
        var callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('INFO', message, ip !== null && ip !== void 0 ? ip : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, callerInfo.functionName, callerInfo.fileName);
    };
    LoggingManager.prototype.warn = function (message, ip, sessionId) {
        var callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('WARN', message, ip !== null && ip !== void 0 ? ip : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, callerInfo.functionName, callerInfo.fileName);
    };
    LoggingManager.prototype.error = function (message, ip, sessionId) {
        var callerInfo = this.extractCallerInfo(new Error().stack);
        this.log('ERROR', message, ip !== null && ip !== void 0 ? ip : null, sessionId !== null && sessionId !== void 0 ? sessionId : null, callerInfo.functionName, callerInfo.fileName);
    };
    LoggingManager.prototype.extractCallerInfo = function (stack) {
        if (!stack)
            return { functionName: 'unknown', fileName: 'unknown' };
        var stackLines = stack.split('\n');
        var callerLine = stackLines[2] || '';
        var match = callerLine.match(/at (.+) \((.+):(\d+):(\d+)\)/);
        if (match) {
            return {
                functionName: match[1] || 'unknown',
                fileName: match[2] || 'unknown'
            };
        }
        return { functionName: 'unknown', fileName: 'unknown' };
    };
    LoggingManager.prototype.getLogs = function () {
        return this.db.prepare("\n            SELECT * FROM logs \n            ORDER BY created_at DESC\n        ").all();
    };
    return LoggingManager;
}());
exports.LoggingManager = LoggingManager;
exports.logger = new LoggingManager();
