import crypto from 'crypto';
import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

// Streaming JSON-Export aller Daten (inkl. soft-deleted + Users)
// Schreibt JSON direkt in den Response-Stream um Speicher zu sparen
export async function streamExport(res) {
  const hash = crypto.createHash('sha256');

  // Schreibt in Response UND aktualisiert den Hash gleichzeitig
  function w(str) { hash.update(str); res.write(str); }

  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  // JSON-Hülle öffnen
  res.write(`{"exportedAt":"${new Date().toISOString()}","version":"2.1","data":`);

  // --- Daten-Objekt (gehasht) ---
  w('{');

  // Kleine Entitäten sequentiell laden und streamen
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, createdAt: true, lastLogin: true },
  });
  w(`"users":${JSON.stringify(users)}`);

  const ueberProjekte = await prisma.ueberProjekt.findMany();
  w(`,"ueberProjekte":${JSON.stringify(ueberProjekte)}`);

  const projekte = await prisma.projekt.findMany();
  w(`,"projekte":${JSON.stringify(projekte)}`);

  const arbeitspakete = await prisma.arbeitspaket.findMany();
  w(`,"arbeitspakete":${JSON.stringify(arbeitspakete)}`);

  const mitarbeiter = await prisma.mitarbeiter.findMany();
  w(`,"mitarbeiter":${JSON.stringify(mitarbeiter)}`);

  const blockierungen = await prisma.blockierung.findMany();
  w(`,"blockierungen":${JSON.stringify(blockierungen)}`);

  const zuweisungen = await prisma.zuweisung.findMany();
  w(`,"zuweisungen":${JSON.stringify(zuweisungen)}`);

  const apVerteilungen = await prisma.aPVerteilung.findMany();
  w(`,"apVerteilungen":${JSON.stringify(apVerteilungen)}`);

  const feiertage = await prisma.feiertag.findMany();
  w(`,"feiertage":${JSON.stringify(feiertage)}`);

  const exportLog = await prisma.exportLog.findMany();
  w(`,"exportLog":${JSON.stringify(exportLog)}`);

  // Änderungslog in Batches streamen (kann sehr groß werden)
  w(',"aenderungsLog":[');
  const BATCH_SIZE = 2000;
  let offset = 0;
  let firstEntry = true;
  while (true) {
    const batch = await prisma.aenderungsLog.findMany({
      orderBy: { zeitpunkt: 'desc' },
      skip: offset,
      take: BATCH_SIZE,
    });
    for (const entry of batch) {
      if (!firstEntry) w(',');
      w(JSON.stringify(entry));
      firstEntry = false;
    }
    if (batch.length < BATCH_SIZE) break;
    offset += BATCH_SIZE;
  }
  w(']');

  const exportCounter = await prisma.exportCounter.findMany();
  w(`,"exportCounter":${JSON.stringify(exportCounter)}`);

  // Daten-Objekt schließen
  w('}');

  // Integritäts-Hash anhängen und Response beenden
  const integrityHash = hash.digest('hex');
  res.write(`,"integrityHash":"${integrityHash}"}`);
  res.end();
}

// JSON-Import (überschreibt ALLE Daten — nur Admin)
export async function importAll(importData, userId) {
  if (!importData || !importData.data) {
    throw new AppError('Ungültiges Import-Format. Erwartet: { data: { ... } }', 400);
  }

  // Backup-Integrität prüfen (Hash ist Pflicht)
  if (!importData.integrityHash) {
    throw new AppError('Backup-Import abgelehnt: integrityHash fehlt. GoBD-Pflicht.', 400);
  }
  const computedHash = crypto.createHash('sha256').update(JSON.stringify(importData.data)).digest('hex');
  if (computedHash !== importData.integrityHash) {
    throw new AppError('Backup-Integrität verletzt. Die Daten wurden möglicherweise manipuliert.', 400);
  }

  const d = importData.data;

  await prisma.$transaction(async (tx) => {
    // Alle bestehenden Daten löschen (in korrekter Reihenfolge wegen Foreign Keys)
    // USERS werden NICHT gelöscht — Backup enthält keine Passwort-Hashes (Sicherheit)
    await tx.aPVerteilung.deleteMany();
    await tx.zuweisung.deleteMany();
    await tx.blockierung.deleteMany();
    await tx.arbeitspaket.deleteMany();
    await tx.projekt.deleteMany();
    await tx.ueberProjekt.deleteMany();
    await tx.mitarbeiter.deleteMany();
    await tx.feiertag.deleteMany();
    await tx.exportLog.deleteMany();
    await tx.exportCounter.deleteMany();
    // Änderungslog wird NICHT gelöscht (GoBD)

    // Existierende User-IDs ermitteln (für FK-Validierung)
    const existingUsers = await tx.user.findMany({ select: { id: true } });
    const userIds = new Set(existingUsers.map(u => u.id));
    const cleanUserRef = (data) => data.map(row => {
      const cleaned = { ...row };
      if (cleaned.createdBy && !userIds.has(cleaned.createdBy)) cleaned.createdBy = null;
      if (cleaned.deletedBy && !userIds.has(cleaned.deletedBy)) cleaned.deletedBy = null;
      return cleaned;
    });

    // Daten importieren (User-FKs bereinigen falls User nicht mehr existiert)
    if (d.ueberProjekte?.length) {
      await tx.ueberProjekt.createMany({ data: cleanUserRef(d.ueberProjekte), skipDuplicates: true });
    }
    if (d.projekte?.length) {
      await tx.projekt.createMany({ data: cleanUserRef(d.projekte), skipDuplicates: true });
    }
    if (d.arbeitspakete?.length) {
      await tx.arbeitspaket.createMany({ data: cleanUserRef(d.arbeitspakete), skipDuplicates: true });
    }
    if (d.mitarbeiter?.length) {
      await tx.mitarbeiter.createMany({ data: cleanUserRef(d.mitarbeiter), skipDuplicates: true });
    }
    if (d.blockierungen?.length) {
      await tx.blockierung.createMany({ data: cleanUserRef(d.blockierungen), skipDuplicates: true });
    }
    if (d.zuweisungen?.length) {
      await tx.zuweisung.createMany({ data: cleanUserRef(d.zuweisungen), skipDuplicates: true });
    }
    if (d.apVerteilungen?.length) {
      await tx.aPVerteilung.createMany({ data: d.apVerteilungen, skipDuplicates: true });
    }
    if (d.feiertage?.length) {
      await tx.feiertag.createMany({ data: d.feiertage, skipDuplicates: true });
    }
    if (d.exportLog?.length) {
      await tx.exportLog.createMany({ data: d.exportLog, skipDuplicates: true });
    }
    if (d.exportCounter?.length) {
      await tx.exportCounter.createMany({ data: d.exportCounter, skipDuplicates: true });
    }

    // Import im Audit-Log vermerken
    await logChange({
      userId,
      aktion: 'importiert',
      entitaet: 'System',
      entitaetId: '00000000-0000-0000-0000-000000000000',
      name: 'Daten-Import',
      details: `Kompletter Daten-Import durchgeführt. Version: ${importData.version || 'unbekannt'}, Exportiert am: ${importData.exportedAt || 'unbekannt'}.`,
      tx,
    });
  });

  return { message: 'Import erfolgreich abgeschlossen.' };
}

// Migration von localStorage-Format
export async function importFromLocalStorage(localStorageData, userId) {
  if (!localStorageData) {
    throw new AppError('Keine Daten zum Importieren.', 400);
  }

  const d = localStorageData;

  await prisma.$transaction(async (tx) => {
    // Über-Projekte importieren
    if (d.ueberProjekte?.length) {
      for (const up of d.ueberProjekte) {
        await tx.ueberProjekt.create({
          data: {
            id: up.id,
            name: up.name,
            beschreibung: up.beschreibung || null,
            unternehmensTyp: up.unternehmensTyp || 'kmu',
            createdAt: up.erstelltAm ? new Date(up.erstelltAm) : new Date(),
          },
        });

        // Projekte dieser Firma
        if (up.projekte?.length) {
          for (const p of up.projekte) {
            await tx.projekt.create({
              data: {
                id: p.id,
                ueberProjektId: up.id,
                name: p.name,
                beschreibung: p.beschreibung || null,
                status: p.status || 'geplant',
                startDatum: p.startDatum ? new Date(p.startDatum) : null,
                endDatum: p.endDatum ? new Date(p.endDatum) : null,
                createdAt: p.erstelltAm ? new Date(p.erstelltAm) : new Date(),
              },
            });

            // Arbeitspakete dieses Projekts
            if (p.arbeitspakete?.length) {
              await importAPs(tx, p.arbeitspakete, p.id, null);
            }
          }
        }
      }
    }

    // Mitarbeiter importieren
    if (d.mitarbeiter?.length) {
      for (const m of d.mitarbeiter) {
        await tx.mitarbeiter.create({
          data: {
            id: m.id,
            name: m.name,
            position: m.position || null,
            wochenStunden: m.wochenStunden || 40,
            jahresUrlaub: m.jahresUrlaub || 30,
            jahresgehalt: m.jahresgehalt || null,
            lohnnebenkosten: m.lohnnebenkosten || null,
            feiertagePflicht: m.feiertagePflicht !== false,
            createdAt: m.erstelltAm ? new Date(m.erstelltAm) : new Date(),
          },
        });

        // Blockierungen
        if (m.blockierungen?.length) {
          for (const b of m.blockierungen) {
            await tx.blockierung.create({
              data: {
                mitarbeiterId: m.id,
                von: new Date(b.von),
                bis: new Date(b.bis),
                typ: b.typ,
              },
            });
          }
        }
      }
    }

    // Zuweisungen importieren
    if (d.zuweisungen?.length) {
      for (const z of d.zuweisungen) {
        const zuw = await tx.zuweisung.create({
          data: {
            id: z.id,
            mitarbeiterId: z.mitarbeiterId,
            projektId: z.projektId,
            ueberProjektId: z.ueberProjektId,
            prozentAnteil: z.prozentAnteil,
            von: new Date(z.von),
            bis: new Date(z.bis),
            createdAt: z.erstelltAm ? new Date(z.erstelltAm) : new Date(),
          },
        });

        // AP-Verteilung
        if (z.arbeitspaketVerteilung?.length) {
          await tx.aPVerteilung.createMany({
            data: z.arbeitspaketVerteilung.map(apv => ({
              zuweisungId: zuw.id,
              arbeitspaketId: apv.arbeitspaketId,
              prozentAnteil: apv.prozentAnteil,
            })),
          });
        }
      }
    }

    // Feiertage importieren
    if (d.feiertage?.length) {
      for (const f of d.feiertage) {
        await tx.feiertag.upsert({
          where: { datum: new Date(f.datum) },
          update: { name: f.name },
          create: {
            datum: new Date(f.datum),
            name: f.name,
          },
        });
      }
    }

    // Export-Counter
    if (d.exportCounter) {
      const jahr = new Date().getFullYear();
      await tx.exportCounter.upsert({
        where: { jahr },
        update: { counter: d.exportCounter },
        create: { jahr, counter: d.exportCounter },
      });
    }

    await logChange({
      userId,
      aktion: 'importiert',
      entitaet: 'System',
      entitaetId: '00000000-0000-0000-0000-000000000000',
      name: 'localStorage-Migration',
      details: 'Daten aus localStorage-Format importiert.',
      tx,
    });
  });

  return { message: 'localStorage-Migration erfolgreich abgeschlossen.' };
}

// Rekursiver AP-Import
async function importAPs(tx, aps, projektId, parentId) {
  for (const ap of aps) {
    await tx.arbeitspaket.create({
      data: {
        id: ap.id,
        projektId,
        parentId,
        name: ap.name,
        beschreibung: ap.beschreibung || null,
        status: ap.status || 'offen',
        startDatum: ap.startDatum ? new Date(ap.startDatum) : null,
        endDatum: ap.endDatum ? new Date(ap.endDatum) : null,
      },
    });

    // Unter-Arbeitspakete rekursiv importieren
    if (ap.unterArbeitspakete?.length) {
      await importAPs(tx, ap.unterArbeitspakete, projektId, ap.id);
    }
  }
}
