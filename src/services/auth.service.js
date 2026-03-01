import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
import { config } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { logChange } from './auditLog.service.js';

const BCRYPT_ROUNDS = 12;

// Refresh Token hashen (SHA-256) bevor er in der DB gespeichert wird
function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

// Access Token generieren (15 Min)
function generateAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

// Refresh Token generieren (7 Tage)
function generateRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiresIn }
  );
}

// Login
export async function login(email, password) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    throw new AppError('Ungültige Anmeldedaten.', 401);
  }

  if (user.email.startsWith('deleted_')) {
    throw new AppError('Dieser Account wurde deaktiviert.', 401);
  }

  // Account-Lockout prüfen
  if (user.lockedUntil && user.lockedUntil > new Date()) {
    throw new AppError('Konto gesperrt. Bitte versuchen Sie es in 15 Minuten erneut.', 423);
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    const attempts = user.failedLoginAttempts + 1;
    const lockData = { failedLoginAttempts: attempts };
    if (attempts >= 5) {
      lockData.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
    }
    await prisma.user.update({
      where: { id: user.id },
      data: lockData,
    });
    throw new AppError('Ungültige Anmeldedaten.', 401);
  }

  const accessToken = generateAccessToken(user);
  const refreshToken = generateRefreshToken(user);

  // Refresh Token gehasht in DB speichern + lastLogin aktualisieren + Lockout zurücksetzen
  await prisma.user.update({
    where: { id: user.id },
    data: {
      refreshToken: hashToken(refreshToken),
      lastLogin: new Date(),
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
  });

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

// Token erneuern
export async function refreshTokens(oldRefreshToken) {
  let decoded;
  try {
    decoded = jwt.verify(oldRefreshToken, config.jwt.refreshSecret);
  } catch {
    throw new AppError('Ungültiger Refresh Token.', 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: decoded.sub },
  });

  if (!user || user.refreshToken !== hashToken(oldRefreshToken)) {
    // Token wurde widerrufen oder stimmt nicht überein
    if (user) {
      // Sicherheit: Alle Tokens invalidieren
      await prisma.user.update({
        where: { id: user.id },
        data: { refreshToken: null },
      });
    }
    throw new AppError('Refresh Token ungültig oder widerrufen.', 401);
  }

  // Token-Rotation: Neues Paar generieren
  const accessToken = generateAccessToken(user);
  const newRefreshToken = generateRefreshToken(user);

  await prisma.user.update({
    where: { id: user.id },
    data: { refreshToken: hashToken(newRefreshToken) },
  });

  return { accessToken, refreshToken: newRefreshToken };
}

// Logout
export async function logout(userId) {
  await prisma.user.update({
    where: { id: userId },
    data: { refreshToken: null },
  });
}

// Passwort ändern
export async function changePassword(userId, currentPassword, newPassword) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('Benutzer nicht gefunden.', 404);
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) {
    throw new AppError('Aktuelles Passwort ist falsch.', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash,
      refreshToken: null, // Alle Sessions beenden
    },
  });

  // GoBD: Passwortänderung im Audit-Log vermerken
  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Benutzer',
    entitaetId: userId,
    name: user.name,
    details: `Passwort für "${user.name}" (${user.email}) geändert.`,
  });
}

// Aktuellen Benutzer abrufen
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      lastLogin: true,
    },
  });

  if (!user) {
    throw new AppError('Benutzer nicht gefunden.', 404);
  }

  return user;
}

// Admin-Account beim Start erstellen (falls nicht vorhanden)
export async function ensureAdminExists() {
  const adminCount = await prisma.user.count({
    where: { role: 'admin' },
  });

  if (adminCount === 0 && config.admin.email && config.admin.password) {
    const passwordHash = await bcrypt.hash(config.admin.password, BCRYPT_ROUNDS);

    await prisma.user.create({
      data: {
        email: config.admin.email.toLowerCase().trim(),
        passwordHash,
        name: config.admin.name,
        role: 'admin',
      },
    });

    console.log(`Admin-Account erstellt: ${config.admin.email}`);
  }
}

// Passwort hashen (für User-Service)
export async function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}
