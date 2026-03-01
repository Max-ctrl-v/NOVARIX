// ─── Backup-Export Tests ─────────────────────────────────────
// Testet den JSON-Export und die Integritätsprüfung via SHA-256 Hash.
// HINWEIS: Läuft gegen die Live-Datenbank (DATABASE_URL muss gesetzt sein).

import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import supertest from 'supertest';
import { getApp, getAuthToken, TEST_ACCOUNTS } from './setup.js';

let adminToken;
let viewerToken;
let app;

before(async () => {
  app = await getApp();

  [adminToken, viewerToken] = await Promise.all([
    getAuthToken(TEST_ACCOUNTS.admin.email, TEST_ACCOUNTS.admin.password),
    getAuthToken(TEST_ACCOUNTS.viewer.email, TEST_ACCOUNTS.viewer.password),
  ]);
});

describe('Backup – GET /api/v1/backup/export', () => {
  it('sollte 200 + gültiges JSON mit integrityHash zurückgeben', async () => {
    const res = await supertest(app)
      .get('/api/v1/backup/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        // Rohen Response-Body als String sammeln (wegen Streaming)
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { callback(null, data); });
      });

    assert.strictEqual(res.status, 200);

    // Response als JSON parsen
    let exportData;
    try {
      exportData = JSON.parse(res.body);
    } catch (err) {
      assert.fail(`Response ist kein gültiges JSON: ${err.message}`);
    }

    // Strukturprüfung
    assert.ok(exportData.exportedAt, 'Export sollte exportedAt enthalten');
    assert.ok(exportData.version, 'Export sollte version enthalten');
    assert.ok(exportData.data, 'Export sollte data-Objekt enthalten');
    assert.ok(exportData.integrityHash, 'Export sollte integrityHash enthalten');

    // Daten-Objekt prüfen
    assert.ok(exportData.data.users !== undefined, 'data sollte users enthalten');
    assert.ok(exportData.data.ueberProjekte !== undefined, 'data sollte ueberProjekte enthalten');
    assert.ok(exportData.data.mitarbeiter !== undefined, 'data sollte mitarbeiter enthalten');
    assert.ok(exportData.data.feiertage !== undefined, 'data sollte feiertage enthalten');
  });

  it('integrityHash sollte mit SHA-256 von data übereinstimmen', async () => {
    const res = await supertest(app)
      .get('/api/v1/backup/export')
      .set('Authorization', `Bearer ${adminToken}`)
      .buffer(true)
      .parse((res, callback) => {
        let data = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => { data += chunk; });
        res.on('end', () => { callback(null, data); });
      });

    assert.strictEqual(res.status, 200);

    const exportData = JSON.parse(res.body);

    // Der Hash wird im Backend über den gestreamten data-Teil berechnet.
    // Wir berechnen ihn auf die gleiche Weise wie der Import ihn prüft:
    // SHA-256 von JSON.stringify(data.data)
    const computedHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(exportData.data))
      .digest('hex');

    assert.strictEqual(
      exportData.integrityHash,
      computedHash,
      'integrityHash sollte mit SHA-256 von JSON.stringify(data.data) übereinstimmen',
    );
  });
});

describe('Backup – Zugriffskontrolle', () => {
  it('Viewer kann GET /api/v1/backup/export NICHT abrufen (403)', async () => {
    const res = await supertest(app)
      .get('/api/v1/backup/export')
      .set('Authorization', `Bearer ${viewerToken}`);

    assert.strictEqual(res.status, 403);
  });

  it('Ohne Authentifizierung sollte 401 zurückgegeben werden', async () => {
    const res = await supertest(app)
      .get('/api/v1/backup/export');

    assert.strictEqual(res.status, 401);
  });
});
