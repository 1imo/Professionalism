"use strict";
var _a, _b, _c, _d, _e;
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = void 0;
exports.config = {
    GEMINI_API_ENDPOINT: (_a = process.env.GEMINI_API_ENDPOINT) !== null && _a !== void 0 ? _a : 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent',
    GEMINI_API_KEY: (_b = process.env.GEMINI_API_KEY) !== null && _b !== void 0 ? _b : '',
    PORT: (_c = process.env.PORT) !== null && _c !== void 0 ? _c : 3000,
    HOST: (_d = process.env.HOST) !== null && _d !== void 0 ? _d : 'localhost',
    SESSION_TIMEOUT: parseInt((_e = process.env.SESSION_TIMEOUT) !== null && _e !== void 0 ? _e : '86400000'), // 24 hours
};
