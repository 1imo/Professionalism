import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { SessionManager } from './sessionManager';
import { config } from './config';
import { logger } from './loggingManager';
import fs from 'fs';
import https from 'https';

const app = express();
const sessionManager = new SessionManager();

// Types
interface ImproveRequestBody {
    deviceId?: string;
    persistentUuid?: string;
    sessionId?: string | null;
    content: {
        subject: string;
        body: string;
        recipient: string;
    };
}

interface LogEntryRequest {
    level: string;
    message: string;
    file: string;
    function: string;
}

// Middleware
app.use(cors({
    origin: [
        "https://mail.google.com"
    ]
}));
app.use(express.json());

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
    console.error('Unhandled error:', err);
    logger.error(err.message, getClientIp(req));
    res.status(500).json({ error: 'Internal server error' });
};

app.use(errorHandler);

// Get client IP middleware
const getClientIp = (req: Request): string => {
    const forwardedFor = req.headers['x-forwarded-for']?.toString();
    const realIp = req.headers['x-real-ip']?.toString();
    return forwardedFor ?? realIp ?? req.ip ?? '0.0.0.0';
};

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit
    message: { error: 'Too many requests, please try again later' }
});

app.use(limiter);

// Route Handlers
const improveHandler: RequestHandler = async (req, res) => {
    const { deviceId, persistentUuid, sessionId, content } = req.body as ImproveRequestBody;

    // Validate required fields
    if (!content?.body) {
        logger.warn('Missing email content', getClientIp(req), sessionId);
        res.status(400).json({ error: 'Missing email content' });
        return;
    }

    const ipAddress = getClientIp(req);
    logger.info('Improvement request received', ipAddress, sessionId);

    try {
        // Validate session using available identifiers
        const { persistentUuid: returnedPersistentUuid, sessionId: returnedSessionId } = await sessionManager.validateSession(
            deviceId ?? '',
            persistentUuid ?? '',
            sessionId ?? '',
            ipAddress
        );

        if (!returnedPersistentUuid) {
            logger.warn('Invalid session', ipAddress, sessionId);
            res.status(401).json({ error: 'Invalid session' });
            return;
        }

        // Check request limits
        const requestDate = new Date().toISOString().split('T')[0]; // Get current date
        const requestCount = await sessionManager.checkRequestLimit(sessionId ?? '', returnedPersistentUuid, deviceId ?? '', requestDate);

        if (requestCount >= 50) {
            logger.warn('Daily request limit reached', ipAddress, sessionId);
            res.status(429).json({ error: 'Daily request limit reached' });
            return;
        }

        // Increment request count
        await sessionManager.incrementRequestCount(sessionId ?? '', returnedPersistentUuid, deviceId ?? '', requestDate);

        // Check if the returned session ID is null
        if (!returnedSessionId) {
            logger.error('Session ID is null', ipAddress, sessionId);
            res.status(500).json({ error: 'Failed to retrieve session ID' });
            return;
        }

        // Set the session ID in the response headers
        res.setHeader('X-Session-ID', returnedSessionId);

        logger.info('API KEY used', ipAddress, sessionId);

        // Make request to Gemini API
        const response = await fetch(`${config.GEMINI_API_ENDPOINT}?key=${config.GEMINI_API_KEY}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Rewrite this email to be more professional, maintaining the same core message but with improved language and structure. Use consistent formatting with exactly one blank line between paragraphs. Use "${content.recipient}" as the recipient name if provided. Keep any original signature if found, otherwise use [Your Name]. Format your response exactly like this:
            SUBJECT: [subject line]
            ---
            Most fitting greeting e.g Dear, Hi, Hey, etc. for ${content.recipient},

            [email body with consistent single-line spacing between paragraphs]

            Most suitable sign off message e.g Thanks, Best Regards, Sincerely etc.,

            [original signature / signer or [Your Name]]
            
            Original email:
            Subject: ${content.subject}
            Body: ${content.body}`
                    }]
                }]
            })
        });

        if (!response.ok) {
            logger.error(`Gemini API request failed: ${response.statusText}`, ipAddress, sessionId);
            throw new Error(`Gemini API request failed: ${response.statusText}`);
        }

        const improvedContent = await response.json();
        res.set('Access-Control-Expose-Headers', 'X-Session-ID');
        res.json({ persistentUuid: returnedPersistentUuid, improvedContent });

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while improving email';
        logger.error('Error improving email: ' + errorMessage, getClientIp(req), sessionId);
        res.status(500).json({ error: 'Failed to improve email content' });
    }
};

const sessionsHandler: RequestHandler = async (req, res) => {
    const sessionId = req.params.identifier;
    try {
        const sessions = await sessionManager.getUserSessions(sessionId);
        logger.info('Fetched user sessions', getClientIp(req), sessionId);
        res.json({
            sessions: sessions.map(session => ({
                ...session,
                ip_address: session.ip_address
            }))
        });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while fetching sessions';
        logger.error('Error fetching sessions: ' + errorMessage, getClientIp(req), sessionId);
        res.status(500).json({ error: 'Failed to fetch sessions' });
    }
};

const healthHandler: RequestHandler = (req, res) => {
    const ipAddress = getClientIp(req);
    logger.info('Health check performed', ipAddress);
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ip: `${ipAddress.split('.').slice(0, 2).join('.')}.xx.xx` // Masked IP
    });
};

// Log entry handler
const logEntryHandler: RequestHandler = async (req, res) => {
    const sessionId = req.params.identifier;
    const ipAddress = getClientIp(req);
    const { level, message, file, function: functionName }: LogEntryRequest = req.body; // Destructure new fields

    const deviceId = req.body.deviceId;
    const persistentUuid = req.body.persistentUuid;

    // Validate session using the session manager
    const sessionValid = await sessionManager.validateSession(deviceId, persistentUuid, sessionId, ipAddress);
    if (!sessionValid) {
        logger.warn('Invalid session', ipAddress, sessionId);
        res.status(401).json({ error: 'Invalid session' });
        return;
    }

    try {
        logger.log(level, message, ipAddress, sessionId, functionName, file);
        logger.info('Log entry received', ipAddress, sessionId);
        res.status(200).json({ message: 'Log entry recorded successfully' });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred while logging';
        logger.error('Error logging entry: ' + errorMessage, ipAddress, sessionId);
        res.status(500).json({ error: 'Failed to log entry' });
    }

    return;
};

// Routes
app.post('/improve', improveHandler);
app.get('/sessions/:identifier', sessionsHandler);
app.get('/health', healthHandler);
app.post('/logs/:identifier', logEntryHandler);

// Start server
const startServer = () => {
    // SSL certificate options
    const httpsOptions = {
        key: fs.readFileSync('/etc/letsencrypt/archive/professionalism.hopto.org/privkey1.pem'),
        cert: fs.readFileSync('/etc/letsencrypt/archive/professionalism.hopto.org/fullchain1.pem')
    };

    // Create HTTPS server
    const server = https.createServer(httpsOptions, app);

    server.listen(config.PORT, "0.0.0.0", () => {
        console.log(`🚀 HTTPS Server running on port ${config.PORT}`);
    });

    // Graceful shutdown
    const shutdown = () => {
        console.log('Shutting down gracefully...');
        server.close(() => {
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

export default app;