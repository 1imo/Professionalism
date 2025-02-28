"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var express_1 = require("express");
var cors_1 = require("cors");
var express_rate_limit_1 = require("express-rate-limit");
var sessionManager_1 = require("./sessionManager");
var config_1 = require("./config");
var loggingManager_1 = require("./loggingManager");
var app = (0, express_1.default)();
var sessionManager = new sessionManager_1.SessionManager();
// Middleware
app.use((0, cors_1.default)({
    origin: [
        "https://mail.google.com"
    ]
}));
app.use(express_1.default.json());
// Error handling middleware
var errorHandler = function (err, req, res, next) {
    console.error('Unhandled error:', err);
    loggingManager_1.logger.error(err.message, getClientIp(req));
    res.status(500).json({ error: 'Internal server error' });
};
app.use(errorHandler);
// Get client IP middleware
var getClientIp = function (req) {
    var _a, _b, _c, _d;
    var forwardedFor = (_a = req.headers['x-forwarded-for']) === null || _a === void 0 ? void 0 : _a.toString();
    var realIp = (_b = req.headers['x-real-ip']) === null || _b === void 0 ? void 0 : _b.toString();
    return (_d = (_c = forwardedFor !== null && forwardedFor !== void 0 ? forwardedFor : realIp) !== null && _c !== void 0 ? _c : req.ip) !== null && _d !== void 0 ? _d : '0.0.0.0';
};
// Rate limiting
var limiter = (0, express_rate_limit_1.default)({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit
    message: { error: 'Too many requests, please try again later' }
});
app.use(limiter);
// Route Handlers
var improveHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var _a, deviceId, persistentUuid, sessionId, content, ipAddress, _b, returnedPersistentUuid, returnedSessionId, requestDate, requestCount, response, improvedContent, error_1, errorMessage;
    return __generator(this, function (_c) {
        switch (_c.label) {
            case 0:
                _a = req.body, deviceId = _a.deviceId, persistentUuid = _a.persistentUuid, sessionId = _a.sessionId, content = _a.content;
                // Validate required fields
                if (!(content === null || content === void 0 ? void 0 : content.body)) {
                    loggingManager_1.logger.warn('Missing email content', getClientIp(req), sessionId);
                    res.status(400).json({ error: 'Missing email content' });
                    return [2 /*return*/];
                }
                ipAddress = getClientIp(req);
                loggingManager_1.logger.info('Improvement request received', ipAddress, sessionId);
                _c.label = 1;
            case 1:
                _c.trys.push([1, 7, , 8]);
                return [4 /*yield*/, sessionManager.validateSession(deviceId !== null && deviceId !== void 0 ? deviceId : '', persistentUuid !== null && persistentUuid !== void 0 ? persistentUuid : '', sessionId !== null && sessionId !== void 0 ? sessionId : '', ipAddress)];
            case 2:
                _b = _c.sent(), returnedPersistentUuid = _b.persistentUuid, returnedSessionId = _b.sessionId;
                if (!returnedPersistentUuid) {
                    loggingManager_1.logger.warn('Invalid session', ipAddress, sessionId);
                    res.status(401).json({ error: 'Invalid session' });
                    return [2 /*return*/];
                }
                requestDate = new Date().toISOString().split('T')[0];
                return [4 /*yield*/, sessionManager.checkRequestLimit(sessionId !== null && sessionId !== void 0 ? sessionId : '', returnedPersistentUuid, deviceId !== null && deviceId !== void 0 ? deviceId : '', requestDate)];
            case 3:
                requestCount = _c.sent();
                if (requestCount >= 50) {
                    loggingManager_1.logger.warn('Daily request limit reached', ipAddress, sessionId);
                    res.status(429).json({ error: 'Daily request limit reached' });
                    return [2 /*return*/];
                }
                // Increment request count
                return [4 /*yield*/, sessionManager.incrementRequestCount(sessionId !== null && sessionId !== void 0 ? sessionId : '', returnedPersistentUuid, deviceId !== null && deviceId !== void 0 ? deviceId : '', requestDate)];
            case 4:
                // Increment request count
                _c.sent();
                // Check if the returned session ID is null
                if (!returnedSessionId) {
                    loggingManager_1.logger.error('Session ID is null', ipAddress, sessionId);
                    res.status(500).json({ error: 'Failed to retrieve session ID' });
                    return [2 /*return*/];
                }
                // Set the session ID in the response headers
                res.setHeader('X-Session-ID', returnedSessionId);
                loggingManager_1.logger.info('API KEY used', ipAddress, sessionId);
                return [4 /*yield*/, fetch("".concat(config_1.config.GEMINI_API_ENDPOINT, "?key=").concat(config_1.config.GEMINI_API_KEY), {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            contents: [{
                                    parts: [{
                                            text: "Rewrite this email to be more professional, maintaining the same core message but with improved language and structure. Use consistent formatting with exactly one blank line between paragraphs. Use \"".concat(content.recipient, "\" as the recipient name if provided. Keep any original signature if found, otherwise use [Your Name]. Format your response exactly like this:\n            SUBJECT: [subject line]\n            ---\n            Most fitting greeting e.g Dear, Hi, Hey, etc. for ").concat(content.recipient, ",\n\n            [email body with consistent single-line spacing between paragraphs]\n\n            Most suitable sign off message e.g Thanks, Best Regards, Sincerely etc.,\n\n            [original signature / signer or [Your Name]]\n            \n            Original email:\n            Subject: ").concat(content.subject, "\n            Body: ").concat(content.body)
                                        }]
                                }]
                        })
                    })];
            case 5:
                response = _c.sent();
                if (!response.ok) {
                    loggingManager_1.logger.error("Gemini API request failed: ".concat(response.statusText), ipAddress, sessionId);
                    throw new Error("Gemini API request failed: ".concat(response.statusText));
                }
                return [4 /*yield*/, response.json()];
            case 6:
                improvedContent = _c.sent();
                res.set('Access-Control-Expose-Headers', 'X-Session-ID');
                res.json({ persistentUuid: returnedPersistentUuid, improvedContent: improvedContent });
                return [3 /*break*/, 8];
            case 7:
                error_1 = _c.sent();
                errorMessage = error_1 instanceof Error ? error_1.message : 'Unknown error occurred while improving email';
                loggingManager_1.logger.error('Error improving email: ' + errorMessage, getClientIp(req), sessionId);
                res.status(500).json({ error: 'Failed to improve email content' });
                return [3 /*break*/, 8];
            case 8: return [2 /*return*/];
        }
    });
}); };
var sessionsHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, sessions, error_2, errorMessage;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                sessionId = req.params.identifier;
                _a.label = 1;
            case 1:
                _a.trys.push([1, 3, , 4]);
                return [4 /*yield*/, sessionManager.getUserSessions(sessionId)];
            case 2:
                sessions = _a.sent();
                loggingManager_1.logger.info('Fetched user sessions', getClientIp(req), sessionId);
                res.json({
                    sessions: sessions.map(function (session) { return (__assign(__assign({}, session), { ip_address: session.ip_address })); })
                });
                return [3 /*break*/, 4];
            case 3:
                error_2 = _a.sent();
                errorMessage = error_2 instanceof Error ? error_2.message : 'Unknown error occurred while fetching sessions';
                loggingManager_1.logger.error('Error fetching sessions: ' + errorMessage, getClientIp(req), sessionId);
                res.status(500).json({ error: 'Failed to fetch sessions' });
                return [3 /*break*/, 4];
            case 4: return [2 /*return*/];
        }
    });
}); };
var healthHandler = function (req, res) {
    var ipAddress = getClientIp(req);
    loggingManager_1.logger.info('Health check performed', ipAddress);
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ip: "".concat(ipAddress.split('.').slice(0, 2).join('.'), ".xx.xx") // Masked IP
    });
};
// Log entry handler
var logEntryHandler = function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sessionId, ipAddress, _a, level, message, file, functionName, deviceId, persistentUuid, sessionValid, errorMessage;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sessionId = req.params.identifier;
                ipAddress = getClientIp(req);
                _a = req.body, level = _a.level, message = _a.message, file = _a.file, functionName = _a.function;
                deviceId = req.body.deviceId;
                persistentUuid = req.body.persistentUuid;
                return [4 /*yield*/, sessionManager.validateSession(deviceId, persistentUuid, sessionId, ipAddress)];
            case 1:
                sessionValid = _b.sent();
                if (!sessionValid) {
                    loggingManager_1.logger.warn('Invalid session', ipAddress, sessionId);
                    res.status(401).json({ error: 'Invalid session' });
                    return [2 /*return*/];
                }
                try {
                    loggingManager_1.logger.log(level, message, ipAddress, sessionId, functionName, file);
                    loggingManager_1.logger.info('Log entry received', ipAddress, sessionId);
                    res.status(200).json({ message: 'Log entry recorded successfully' });
                }
                catch (error) {
                    errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while logging';
                    loggingManager_1.logger.error('Error logging entry: ' + errorMessage, ipAddress, sessionId);
                    res.status(500).json({ error: 'Failed to log entry' });
                }
                return [2 /*return*/]; // Explicitly return void
        }
    });
}); };
// Routes
app.post('/improve', improveHandler);
app.get('/sessions/:identifier', sessionsHandler);
app.get('/health', healthHandler);
app.post('/logs/:identifier', logEntryHandler);
// Start server
var startServer = function () {
    var server = app.listen(config_1.config.PORT, function () {
        console.log("\uD83D\uDE80 Server running on port ".concat(config_1.config.PORT));
    });
    // Graceful shutdown
    var shutdown = function () {
        console.log('Shutting down gracefully...');
        server.close(function () {
            console.log('Server closed');
            process.exit(0);
        });
    };
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
    return server;
};
if (require.main === module) {
    startServer();
}
exports.default = app;
