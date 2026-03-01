// ─── Auth-Endpunkt Tests ─────────────────────────────────────
// Testet Login, Token-Refresh, /me, Passwort-vergessen und Passwort-ändern.
// HINWEIS: Läuft gegen die Live-Datenbank (DATABASE_URL muss gesetzt sein).

import { describe, it } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { getApp, getAuthToken, TEST_ACCOUNTS } from './setup.js';

describe('Auth – POST /api/v1/auth/login', () => {
  it('sollte mit gültigen Zugangsdaten 200 + accessToken zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_ACCOUNTS.admin.email,
        password: TEST_ACCOUNTS.admin.password,
      });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.accessToken, 'Response sollte ein accessToken enthalten');
    assert.ok(res.body.user, 'Response sollte ein user-Objekt enthalten');
    assert.strictEqual(res.body.user.email, TEST_ACCOUNTS.admin.email);
  });

  it('sollte mit falschem Passwort 401 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_ACCOUNTS.admin.email,
        password: 'FalschesPasswort123!',
      });

    assert.strictEqual(res.status, 401);
    assert.ok(res.body.error, 'Response sollte eine Fehlermeldung enthalten');
  });

  it('sollte mit fehlender E-Mail 400 zurückgeben (Validierung)', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ password: 'IrgendeinPasswort1!' });

    assert.strictEqual(res.status, 400);
  });

  it('sollte mit fehlender Passwort 400 zurückgeben (Validierung)', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/login')
      .send({ email: TEST_ACCOUNTS.admin.email });

    assert.strictEqual(res.status, 400);
  });
});

describe('Auth – POST /api/v1/auth/refresh', () => {
  it('sollte mit gültigem Refresh-Cookie ein neues accessToken liefern', async () => {
    const app = await getApp();

    // Zuerst einloggen um Refresh-Cookie zu bekommen
    const loginRes = await supertest(app)
      .post('/api/v1/auth/login')
      .send({
        email: TEST_ACCOUNTS.admin.email,
        password: TEST_ACCOUNTS.admin.password,
      });

    assert.strictEqual(loginRes.status, 200);

    // Refresh-Cookie aus Set-Cookie Header extrahieren
    const cookies = loginRes.headers['set-cookie'];
    assert.ok(cookies, 'Login sollte Set-Cookie Header enthalten');

    const refreshCookie = Array.isArray(cookies)
      ? cookies.find(c => c.startsWith('novarix_refresh='))
      : (cookies.startsWith('novarix_refresh=') ? cookies : null);

    assert.ok(refreshCookie, 'Set-Cookie sollte novarix_refresh enthalten');

    // Refresh-Endpoint aufrufen mit Cookie
    const refreshRes = await supertest(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshCookie)
      .send({});

    assert.strictEqual(refreshRes.status, 200);
    assert.ok(refreshRes.body.accessToken, 'Refresh sollte neues accessToken liefern');
  });

  it('sollte ohne Refresh-Token 401 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/refresh')
      .send({});

    assert.strictEqual(res.status, 401);
  });
});

describe('Auth – GET /api/v1/auth/me', () => {
  it('sollte mit gültigem Token Benutzer-Daten zurückgeben', async () => {
    const token = await getAuthToken(
      TEST_ACCOUNTS.admin.email,
      TEST_ACCOUNTS.admin.password,
    );
    const app = await getApp();

    const res = await supertest(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`);

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.email, 'Response sollte eine E-Mail enthalten');
    assert.strictEqual(res.body.email, TEST_ACCOUNTS.admin.email);
    assert.ok(res.body.role, 'Response sollte eine Rolle enthalten');
  });

  it('sollte ohne Token 401 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .get('/api/v1/auth/me');

    assert.strictEqual(res.status, 401);
  });

  it('sollte mit ungültigem Token 401 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .get('/api/v1/auth/me')
      .set('Authorization', 'Bearer ungueltigertoken123');

    assert.strictEqual(res.status, 401);
  });
});

describe('Auth – POST /api/v1/auth/forgot-password', () => {
  it('sollte immer 200 zurückgeben (verhindert E-Mail-Enumeration)', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: TEST_ACCOUNTS.admin.email });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message, 'Response sollte eine Nachricht enthalten');
  });

  it('sollte auch bei nicht-existierender E-Mail 200 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'gibts-nicht@example.com' });

    assert.strictEqual(res.status, 200);
    assert.ok(res.body.message, 'Response sollte eine Nachricht enthalten');
  });
});

describe('Auth – POST /api/v1/auth/change-password', () => {
  it('sollte mit falschem aktuellem Passwort fehlschlagen', async () => {
    const token = await getAuthToken(
      TEST_ACCOUNTS.admin.email,
      TEST_ACCOUNTS.admin.password,
    );
    const app = await getApp();

    const res = await supertest(app)
      .post('/api/v1/auth/change-password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'FalschesAltes123!',
        newPassword: 'NeuesPasswort123!',
      });

    // Sollte 401 oder 400 sein (falsches aktuelles Passwort)
    assert.ok(
      res.status === 401 || res.status === 400,
      `Erwarteter Status 401 oder 400, bekam ${res.status}`,
    );
  });

  it('sollte ohne Authentifizierung 401 zurückgeben', async () => {
    const app = await getApp();
    const res = await supertest(app)
      .post('/api/v1/auth/change-password')
      .send({
        currentPassword: 'Egal12345678!',
        newPassword: 'AuchEgal12345678!',
      });

    assert.strictEqual(res.status, 401);
  });
});
