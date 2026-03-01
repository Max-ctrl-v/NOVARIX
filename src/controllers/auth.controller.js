import * as authService from '../services/auth.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

const REFRESH_COOKIE = 'novarix_refresh';
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.isProd,
  sameSite: config.isProd ? 'none' : 'lax',
  path: '/api/v1/auth',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  const result = await authService.login(email, password, { ip: req.ip, userAgent: req.get('user-agent') });

  // Set refresh token as HttpOnly cookie
  res.cookie(REFRESH_COOKIE, result.refreshToken, COOKIE_OPTIONS);

  res.json({
    accessToken: result.accessToken,
    user: result.user,
  });
});

export const refresh = asyncHandler(async (req, res) => {
  // Read refresh token exclusively from HttpOnly cookie (no body fallback)
  const refreshToken = req.cookies?.[REFRESH_COOKIE];
  if (!refreshToken) {
    return res.status(401).json({ error: 'Kein Refresh Token vorhanden.' });
  }

  const tokens = await authService.refreshTokens(refreshToken);

  // Set new refresh token cookie
  res.cookie(REFRESH_COOKIE, tokens.refreshToken, COOKIE_OPTIONS);

  res.json({ accessToken: tokens.accessToken });
});

export const logout = asyncHandler(async (req, res) => {
  await authService.logout(req.user.id, { ip: req.ip, userAgent: req.get('user-agent') });

  // Clear refresh token cookie
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  });

  res.json({ message: 'Erfolgreich abgemeldet.' });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  await authService.changePassword(req.user.id, currentPassword, newPassword, { ip: req.ip, userAgent: req.get('user-agent') });

  // Clear refresh token cookie (forces re-login)
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: config.isProd,
    sameSite: config.isProd ? 'none' : 'lax',
    path: '/api/v1/auth',
  });

  res.json({ message: 'Passwort erfolgreich geändert.' });
});

export const me = asyncHandler(async (req, res) => {
  const user = await authService.getCurrentUser(req.user.id);
  res.json(user);
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  await authService.requestPasswordReset(email);
  // Always return success to prevent email enumeration
  res.json({ message: 'Wenn ein Konto mit dieser E-Mail existiert, wurde ein Reset-Link gesendet.' });
});

export const resetPasswordHandler = asyncHandler(async (req, res) => {
  const { token, newPassword } = req.body;
  await authService.resetPassword(token, newPassword);
  res.json({ message: 'Passwort erfolgreich zurückgesetzt. Bitte melden Sie sich an.' });
});
