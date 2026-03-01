// ─── Test-Setup für Novarix Backend ──────────────────────────
// HINWEIS: DATABASE_URL, JWT_SECRET und JWT_REFRESH_SECRET müssen
// als Umgebungsvariablen gesetzt sein, damit die Tests gegen die
// Live-Datenbank laufen können.

import supertest from 'supertest';

// ─── Test-Accounts ───────────────────────────────────────────
export const TEST_ACCOUNTS = {
  admin: {
    email: 'maxnodes@gmail.com',
    password: 'Novarix2024!Secure',
  },
  editor: {
    email: 'm.menz@novaris-consulting.de',
    password: 'Menz4652.',
  },
  viewer: {
    email: 's.abdalla@novaris-consulting.de',
    password: 'Abdalla4652.',
  },
};

// ─── App-Import (lazy, gecacht) ──────────────────────────────
let _app = null;

/**
 * Gibt die Express-App zurück (importiert sie beim ersten Aufruf).
 * Der Import wird gecacht, sodass nur eine Instanz existiert.
 */
export async function getApp() {
  if (!_app) {
    const mod = await import('../src/server.js');
    _app = mod.default;
  }
  return _app;
}

/**
 * Authentifiziert sich mit E-Mail und Passwort und gibt das accessToken zurück.
 * @param {string} email
 * @param {string} password
 * @returns {Promise<string>} accessToken
 */
export async function getAuthToken(email, password) {
  const app = await getApp();
  const res = await supertest(app)
    .post('/api/v1/auth/login')
    .send({ email, password })
    .expect(200);

  if (!res.body.accessToken) {
    throw new Error(`Login fehlgeschlagen für ${email}: Kein accessToken in Response`);
  }

  return res.body.accessToken;
}
