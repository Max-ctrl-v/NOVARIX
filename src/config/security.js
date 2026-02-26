import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { config } from './env.js';

// Helmet — sichere HTTP-Headers
export const helmetConfig = helmet({
  contentSecurityPolicy: config.isProd ? undefined : false,
  crossOriginEmbedderPolicy: false,
});

// CORS — nur erlaubte Origins (unterstützt Array für Railway + lokale Entwicklung)
export const corsConfig = cors({
  origin: (origin, callback) => {
    const allowed = config.cors.origin;
    // Kein Origin = Server-zu-Server oder Postman
    if (!origin) return callback(null, true);
    if (allowed.includes(origin)) return callback(null, true);
    // Railway Preview-URLs erlauben
    if (origin.endsWith('.railway.app')) return callback(null, true);
    callback(new Error(`CORS: ${origin} nicht erlaubt.`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});

// Rate Limiting — allgemein (300 Requests pro 15 Min pro IP)
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Zu viele Anfragen. Bitte warten Sie 15 Minuten.',
  },
});

// Rate Limiting — Auth-Endpoints (50 Versuche pro 15 Min)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Zu viele Login-Versuche. Bitte warten Sie 15 Minuten.',
  },
});
