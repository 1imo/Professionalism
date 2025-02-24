export const config = {
  GEMINI_API_ENDPOINT: process.env.GEMINI_API_ENDPOINT ?? 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY ?? '',
  PORT: process.env.PORT ?? 3000,
  HOST: process.env.HOST ?? 'localhost',
  SESSION_TIMEOUT: parseInt(process.env.SESSION_TIMEOUT ?? '86400000'), // 24 hours
};