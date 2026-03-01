// ─── CRUD-Tests für Kern-Entitäten ──────────────────────────
// Testet GET/POST für Über-Projekte, Mitarbeiter und Feiertage.
// Verwendet den Admin-Account für alle Operationen.
// HINWEIS: Läuft gegen die Live-Datenbank (DATABASE_URL muss gesetzt sein).

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import supertest from 'supertest';
import { getApp, getAuthToken, TEST_ACCOUNTS } from './setup.js';

// Gemeinsamer Admin-Token für alle CRUD-Tests
let adminToken;
let app;

before(async () => {
  app = await getApp();
  adminToken = await getAuthToken(
    TEST_ACCOUNTS.admin.email,
    TEST_ACCOUNTS.admin.password,
  );
});

// ─── Über-Projekte ───────────────────────────────────────────

describe('Über-Projekte – GET /api/v1/ueberprojekte', () => {
  it('sollte 200 + ein Array zurückgeben', async () => {
    const res = await supertest(app)
      .get('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });
});

describe('Über-Projekte – POST /api/v1/ueberprojekte', () => {
  // ID des erstellten Test-Über-Projekts (für Cleanup)
  let testUeberprojektId;

  it('sollte ein neues Über-Projekt erstellen (201)', async () => {
    const testName = `Test-Firma-${Date.now()}`;
    const res = await supertest(app)
      .post('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName,
        beschreibung: 'Automatischer Test – kann gelöscht werden',
        unternehmensTyp: 'kmu',
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Response sollte eine ID enthalten');
    assert.strictEqual(res.body.name, testName);
    assert.strictEqual(res.body.unternehmensTyp, 'kmu');

    testUeberprojektId = res.body.id;
  });

  it('sollte das erstellte Über-Projekt per GET abrufen können', async () => {
    // Überspringen wenn vorheriger Test fehlgeschlagen
    if (!testUeberprojektId) {
      return;
    }

    const res = await supertest(app)
      .get(`/api/v1/ueberprojekte/${testUeberprojektId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, testUeberprojektId);
  });

  // Aufräumen: Test-Über-Projekt löschen (soft-delete)
  it('sollte das Test-Über-Projekt wieder löschen können', async () => {
    if (!testUeberprojektId) {
      return;
    }

    const res = await supertest(app)
      .delete(`/api/v1/ueberprojekte/${testUeberprojektId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
  });
});

describe('Über-Projekte – Validierung', () => {
  it('sollte ohne Pflichtfeld "name" 400 zurückgeben', async () => {
    const res = await supertest(app)
      .post('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        beschreibung: 'Fehlender Name',
        unternehmensTyp: 'kmu',
      });

    assert.strictEqual(res.status, 400);
  });

  it('sollte mit ungültigem unternehmensTyp 400 zurückgeben', async () => {
    const res = await supertest(app)
      .post('/api/v1/ueberprojekte')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Validierungstest',
        unternehmensTyp: 'ungueltig',
      });

    assert.strictEqual(res.status, 400);
  });
});

// ─── Mitarbeiter ─────────────────────────────────────────────

describe('Mitarbeiter – GET /api/v1/mitarbeiter', () => {
  it('sollte 200 + ein Array zurückgeben', async () => {
    const res = await supertest(app)
      .get('/api/v1/mitarbeiter')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });
});

describe('Mitarbeiter – POST /api/v1/mitarbeiter', () => {
  let testMitarbeiterId;

  it('sollte einen neuen Mitarbeiter erstellen (201)', async () => {
    const testName = `Test-MA-${Date.now()}`;
    const res = await supertest(app)
      .post('/api/v1/mitarbeiter')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: testName,
        position: 'Test-Position',
        wochenStunden: 40,
        jahresUrlaub: 30,
      });

    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id, 'Response sollte eine ID enthalten');
    assert.strictEqual(res.body.name, testName);
    assert.strictEqual(res.body.position, 'Test-Position');

    testMitarbeiterId = res.body.id;
  });

  it('sollte den erstellten Mitarbeiter per GET abrufen können', async () => {
    if (!testMitarbeiterId) {
      return;
    }

    const res = await supertest(app)
      .get(`/api/v1/mitarbeiter/${testMitarbeiterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.id, testMitarbeiterId);
  });

  // Aufräumen: Test-Mitarbeiter löschen (soft-delete)
  it('sollte den Test-Mitarbeiter wieder löschen können', async () => {
    if (!testMitarbeiterId) {
      return;
    }

    const res = await supertest(app)
      .delete(`/api/v1/mitarbeiter/${testMitarbeiterId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
  });
});

// ─── Feiertage ───────────────────────────────────────────────

describe('Feiertage – GET /api/v1/feiertage', () => {
  it('sollte 200 + ein Array zurückgeben', async () => {
    const res = await supertest(app)
      .get('/api/v1/feiertage')
      .set('Authorization', `Bearer ${adminToken}`);

    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body), 'Response sollte ein Array sein');
  });
});
