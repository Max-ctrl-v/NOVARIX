// Zentraler Fehler-Handler — fängt alle unbehandelten Fehler ab

export class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// 404 Handler
export function notFoundHandler(req, res, _next) {
  res.status(404).json({
    error: 'Nicht gefunden',
    message: `Route ${req.method} ${req.originalUrl} existiert nicht`,
  });
}

// Globaler Error Handler
export function errorHandler(err, _req, res, _next) {
  // Prisma-Fehler
  if (err.code === 'P2002') {
    return res.status(409).json({
      error: 'Konflikt',
      message: 'Ein Eintrag mit diesen Daten existiert bereits.',
      field: err.meta?.target,
    });
  }

  if (err.code === 'P2025') {
    return res.status(404).json({
      error: 'Nicht gefunden',
      message: 'Der angeforderte Eintrag existiert nicht.',
    });
  }

  // Bekannter App-Fehler
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      ...(err.details && { details: err.details }),
    });
  }

  // Joi Validierungsfehler
  if (err.isJoi) {
    return res.status(400).json({
      error: 'Validierungsfehler',
      details: err.details.map(d => d.message),
    });
  }

  // JWT Fehler
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Ungültiger Token' });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token abgelaufen' });
  }

  // Unbekannter Fehler — NIEMALS interne Details an Client senden
  console.error('Unbehandelter Fehler:', err);
  res.status(500).json({
    error: 'Interner Serverfehler',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Ein unerwarteter Fehler ist aufgetreten.',
  });
}
