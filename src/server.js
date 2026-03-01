import express from 'express';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { config } from './config/env.js';
import { helmetConfig, corsConfig, generalLimiter } from './config/security.js';
import { notFoundHandler, errorHandler } from './middleware/errorHandler.js';

// Routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/user.routes.js';
import ueberprojekteRoutes from './routes/ueberprojekte.routes.js';
import projekteRoutes from './routes/projekte.routes.js';
import arbeitspaketeRoutes from './routes/arbeitspakete.routes.js';
import mitarbeiterRoutes from './routes/mitarbeiter.routes.js';
import blockierungenRoutes from './routes/blockierungen.routes.js';
import zuweisungenRoutes from './routes/zuweisungen.routes.js';
import feiertageRoutes from './routes/feiertage.routes.js';
import exportRoutes from './routes/export.routes.js';
import aenderungslogRoutes from './routes/aenderungslog.routes.js';
import papierkorbRoutes from './routes/papierkorb.routes.js';
import backupRoutes from './routes/backup.routes.js';

// Startup-Tasks
import { ensureAdminExists } from './services/auth.service.js';
import { startTrashCleanup } from './jobs/trashCleanup.js';

const app = express();

// ─── Railway / Reverse Proxy ─────────────────────────────────
app.set('trust proxy', 1);

// ─── Sicherheits-Middleware ───────────────────────────────────
app.use(helmetConfig);
app.use(corsConfig);
app.use(generalLimiter);

// ─── Request Logging ─────────────────────────────────────────
app.use(morgan(config.isProd ? 'combined' : 'dev'));

// ─── Cookie Parser ───────────────────────────────────────────
app.use(cookieParser());

// ─── Body Parser ──────────────────────────────────────────────
app.use('/api/v1/backup', express.json({ limit: '50mb' }));
app.use(express.json({ limit: '1mb' }));

// ─── Health Check ─────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── API Routes ───────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/ueberprojekte', ueberprojekteRoutes);
app.use('/api/v1/projekte', projekteRoutes);
app.use('/api/v1/arbeitspakete', arbeitspaketeRoutes);
app.use('/api/v1/mitarbeiter', mitarbeiterRoutes);
app.use('/api/v1/blockierungen', blockierungenRoutes);
app.use('/api/v1/zuweisungen', zuweisungenRoutes);
app.use('/api/v1/feiertage', feiertageRoutes);
app.use('/api/v1/export', exportRoutes);
app.use('/api/v1/aenderungslog', aenderungslogRoutes);
app.use('/api/v1/papierkorb', papierkorbRoutes);
app.use('/api/v1/backup', backupRoutes);

// ─── Fehler-Handler ───────────────────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Server starten ───────────────────────────────────────────
const server = app.listen(config.port, '0.0.0.0', async () => {
  console.log(`Novarix Backend läuft auf Port ${config.port} (${config.nodeEnv})`);

  // Admin-Account sicherstellen
  try {
    await ensureAdminExists();
  } catch (err) {
    console.error('KRITISCH: Admin-Account konnte nicht sichergestellt werden – Datenbank erreichbar?', err);
  }

  // Cron-Jobs starten
  startTrashCleanup();
});

// ─── Graceful Shutdown (Railway sendet SIGTERM) ──────────────
function gracefulShutdown(signal) {
  console.log(`${signal} empfangen — Server wird heruntergefahren...`);
  server.close(async () => {
    const { default: prisma } = await import('./config/database.js');
    await prisma.$disconnect();
    console.log('Datenbankverbindung geschlossen. Bye.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('Shutdown-Timeout — erzwungener Exit.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ─── Unbehandelte Fehler abfangen ────────────────────────────
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unbehandelte Promise-Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

process.on('uncaughtException', (err) => {
  console.error('Unbehandelter Fehler (uncaughtException):', err);
  gracefulShutdown('uncaughtException');
});

export default app;
