// ─── Autorisierungs-Tests (RBAC) ─────────────────────────────
// Testet rollenbasierte Zugriffskontrolle:
// - Viewer darf keine Entitäten erstellen oder löschen
// - Viewer hat keinen Zugriff auf Admin-Endpunkte
// - Admin hat vollen Zugriff
// HINWEIS: Läuft gegen die Live-Datenbank (DATABASE_URL muss gesetzt sein).

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { getApp, getAuthToken, TEST_ACCOUNTS } from './setup.js';

let viewerToken;
let adminToken;
let app;

before(async () => {
  app = await getApp();

  // Parallel einloggen für beide Rollen
  [adminToken, viewerToken] = await Promise.all([
    getAuthToken(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password),
    getAuthToken(TEST_ACCOUNTS.viewer.email, TEST_ACCOUNTS.viewer.password),
  ]);
});

// ─── Viewer-Einschränkungen ──────────────────────────────────

describe('Autorisierung – Viewer kann keine Über-Projekte erstellen', () => {
  it('POST /api/v1/ueberprojekte sollte 403 zurückgeben', async () => {
    const res = await supertest(app)
      .post('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Viewer-Versuch',
        beschreibung: 'Sollte nicht erstellt werden',
        unternehmensTyp: 'kmu',
      });

    assert.strictEqual(res.status, 403);
  });
});

describe('Autorisierung – Viewer kann keine Entitäten löschen', () => {
  it('DELETE /api/v1/ueberprojekte/:id sollte 403 zurückgeben', async () => {
    // Verwende eine Fake-UUID – der 403 kommt vor dem 404
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await supertest(app)
      .delete(`/api/v1/ueberprojekte/${fakeId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });

  it('DELETE /api/v1/mitarbeiter/:id sollte 403 zurückgeben', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await supertest(app)
      .delete(`/api/v1/mitarbeiter/${fakeId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });

  it('DELETE /api/v1/feiertage/:id sollte 403 zurückgeben', async () => {
    const fakeId = '00000000-0000-0000-0000-000000000000';
    const res = await supertest(app)
      .delete(`/api/v1/feiertage/${fakeId}`)
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });
});

describe('Autorisierung – Viewer kann keine Mitarbeiter erstellen', () => {
  it('POST /api/v1/mitarbeiter sollte 403 zurückgeben', async () => {
    const res = await supertest(app)
      .post('/api/v1/mitarbeiter')
      .set('Authorization', `Bearer ${viewerToken}`)
      .send({
        name: 'Viewer-Versuch-MA',
        position: 'Sollte nicht existieren',
      });

    assert.strictEqual(res.status, 403);
  });
});

// ─── Session-Logs (nur Admin) ────────────────────────────────

describe('Autorisierung – Session-Logs Zugriff', () => {
  it('Admin kann GET /api/v1/session-logs abrufen (200)', async () => {
    const res = await supertest(app)
      .get('/api/v1/session-logs')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
  });

  it('Viewer kann GET /api/v1/session-logs NICHT abrufen (403)', async () => {
    const res = await supertest(app)
      .get('/api/v1/session-logs')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });
});

// ─── Users-Verwaltung (nur Admin) ────────────────────────────

describe('Autorisierung – Users-Verwaltung', () => {
  it('Admin kann GET /api/v1/users abrufen (200)', async () => {
    const res = await supertest(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });

  it('Viewer kann GET /api/v1/users NICHT abrufen (403)', async () => {
    const res = await supertest(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });
});

// ─── Viewer darf lesend zugreifen ────────────────────────────

describe('Autorisierung – Viewer hat Lesezugriff', () => {
  it('Viewer kann GET /api/v1/ueberprojekte abrufen (200)', async () => {
    const res = await supertest(app)
      .get('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });

  it('Viewer kann GET /api/v1/mitarbeiter abrufen (200)', async () => {
    const res = await supertest(app)
      .get('/api/v1/mitarbeiter')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });

  it('Viewer kann GET /api/v1/feiertage abrufen (200)', async () => {
    const res = await supertest(app)
      .get('/api/v1/feiertage')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });
});
