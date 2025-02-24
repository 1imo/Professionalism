import express from 'express';
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { SessionManager } from './sessionManager';
import { config } from './config';

const app = express();
const sessionManager = new SessionManager();

// Types
interface ImproveRequestBody {
  syncId: string | null;
  deviceId: string;
  persistentUuid: string;
  sessionId: string;
  content: {
    subject: string;
    body: string;
    recipient: string;
  };
}

// Middleware
app.use(cors());
app.use(express.json());

// Error handling middleware
const errorHandler = (err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Unhandled error:', err);
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
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests, please try again later' }
});

app.use(limiter);

// Route Handlers
const improveHandler: RequestHandler = async (req, res) => {
  const { syncId, deviceId, persistentUuid, sessionId, content } = req.body as ImproveRequestBody;

  // Validate required fields
  if (!deviceId || !persistentUuid || !sessionId) {
    res.status(400).json({ error: 'Missing required identifiers' });
    return;
  }

  if (!content?.body) {
    res.status(400).json({ error: 'Missing email content' });
    return;
  }

  const ipAddress = getClientIp(req);

  try {
    // Validate session using all available identifiers
    const isValidSession = await sessionManager.validateSession(
      syncId,
      deviceId,
      persistentUuid,
      sessionId,
      ipAddress
    );

    if (!isValidSession) {
      res.status(401).json({ error: 'Invalid session' });
      return;
    }

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
      throw new Error(`Gemini API request failed: ${response.statusText}`);
    }

    const improvedContent = await response.json();
    res.json(improvedContent);

  } catch (error) {
    console.error('Error improving email:', error);
    res.status(500).json({ error: 'Failed to improve email content' });
  }
};

const sessionsHandler: RequestHandler = async (req, res) => {
  try {
    const sessions = await sessionManager.getUserSessions(req.params.identifier);
    res.json({ 
      sessions: sessions.map(session => ({
        ...session,
        ip_address: `${session.ip_address.split('.').slice(0, 2).join('.')}.xx.xx` // Mask IP for privacy
      }))
    });
  } catch (error) {
    console.error('Error fetching sessions:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
};

const healthHandler: RequestHandler = (req, res) => {
  const ipAddress = getClientIp(req);
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    ip: `${ipAddress.split('.').slice(0, 2).join('.')}.xx.xx` // Masked IP
  });
};

// Routes
app.post('/improve', improveHandler);
app.get('/sessions/:identifier', sessionsHandler);
app.get('/health', healthHandler);

// Start server
const startServer = () => {
  const server = app.listen(config.PORT, () => {
    console.log(`🚀 Server running on port ${config.PORT}`);
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