import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

// System cleanup uses null userId (AenderungsLog.userId is nullable)

// Alle gelöschten Objekte abrufen (gruppiert nach Typ)
export async function getAll() {
  const [firmen, projekte, arbeitspakete, mitarbeiter, zuweisungen, blockierungen] = await Promise.all([
    prisma.ueberProjekt.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, unternehmensTyp: true, deletedAt: true, deletedBy: true },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.projekt.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, status: true, deletedAt: true, deletedBy: true, ueberProjekt: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.arbeitspaket.findMany({
      where: { deletedAt: { not: null }, parentId: null }, // Nur Top-Level
      select: { id: true, name: true, status: true, deletedAt: true, deletedBy: true, projekt: { select: { name: true } } },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.mitarbeiter.findMany({
      where: { deletedAt: { not: null } },
      select: { id: true, name: true, position: true, deletedAt: true, deletedBy: true },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.zuweisung.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true, prozentAnteil: true, deletedAt: true, deletedBy: true,
        mitarbeiter: { select: { name: true } },
        projekt: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
    prisma.blockierung.findMany({
      where: { deletedAt: { not: null } },
      select: {
        id: true, typ: true, von: true, bis: true, deletedAt: true, deletedBy: true,
        mitarbeiter: { select: { name: true } },
      },
      orderBy: { deletedAt: 'desc' },
    }),
  ]);

  return {
    firmen: firmen.map(f => ({ ...f, entitaet: 'Firma' })),
    projekte: projekte.map(p => ({ ...p, entitaet: 'Projekt' })),
    arbeitspakete: arbeitspakete.map(a => ({ ...a, entitaet: 'Arbeitspaket' })),
    mitarbeiter: mitarbeiter.map(m => ({ ...m, entitaet: 'Mitarbeiter' })),
    zuweisungen: zuweisungen.map(z => ({
      ...z,
      entitaet: 'Zuweisung',
      name: `${z.mitarbeiter.name} → ${z.projekt.name}`,
    })),
    blockierungen: blockierungen.map(b => ({
      ...b,
      entitaet: 'Blockierung',
      name: `${b.typ} (${b.mitarbeiter.name})`,
    })),
  };
}

// Wiederherstellen — erkennt Entitätstyp automatisch
export async function restore(id, userId) {
  // In allen Tabellen suchen
  const targets = [
    { model: 'ueberProjekt', label: 'Firma' },
    { model: 'projekt', label: 'Projekt' },
    { model: 'arbeitspaket', label: 'Arbeitspaket' },
    { model: 'mitarbeiter', label: 'Mitarbeiter' },
    { model: 'zuweisung', label: 'Zuweisung' },
    { model: 'blockierung', label: 'Blockierung' },
  ];

  for (const target of targets) {
    const item = await prisma[target.model].findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (item) {
      return restoreEntity(target.model, target.label, id, item, userId);
    }
  }

  throw new AppError('Gelöschtes Objekt nicht gefunden.', 404);
}

async function restoreEntity(model, label, id, item, userId) {
  await prisma.$transaction(async (tx) => {
    // Haupteintrag wiederherstellen
    await tx[model].update({
      where: { id },
      data: { deletedAt: null, deletedBy: null },
    });

    // Kaskaden-Wiederherstellung
    if (model === 'ueberProjekt') {
      // Projekte mit gleichem deletedAt wiederherstellen
      const projekte = await tx.projekt.findMany({
        where: { ueberProjektId: id, deletedAt: item.deletedAt },
        select: { id: true },
      });
      const projektIds = projekte.map(p => p.id);

      if (projektIds.length > 0) {
        await tx.projekt.updateMany({
          where: { id: { in: projektIds } },
          data: { deletedAt: null, deletedBy: null },
        });
        await tx.arbeitspaket.updateMany({
          where: { projektId: { in: projektIds }, deletedAt: item.deletedAt },
          data: { deletedAt: null, deletedBy: null },
        });
        await tx.zuweisung.updateMany({
          where: { projektId: { in: projektIds }, deletedAt: item.deletedAt },
          data: { deletedAt: null, deletedBy: null },
        });
      }
    }

    if (model === 'projekt') {
      await tx.arbeitspaket.updateMany({
        where: { projektId: id, deletedAt: item.deletedAt },
        data: { deletedAt: null, deletedBy: null },
      });
      await tx.zuweisung.updateMany({
        where: { projektId: id, deletedAt: item.deletedAt },
        data: { deletedAt: null, deletedBy: null },
      });
    }

    if (model === 'arbeitspaket') {
      // Kinder wiederherstellen
      await restoreAPChildren(tx, id, item.deletedAt);
    }

    if (model === 'mitarbeiter') {
      await tx.blockierung.updateMany({
        where: { mitarbeiterId: id, deletedAt: item.deletedAt },
        data: { deletedAt: null, deletedBy: null },
      });
      await tx.zuweisung.updateMany({
        where: { mitarbeiterId: id, deletedAt: item.deletedAt },
        data: { deletedAt: null, deletedBy: null },
      });
    }

    const name = item.name || label;
    await logChange({
      userId,
      aktion: 'wiederhergestellt',
      entitaet: label,
      entitaetId: id,
      name,
      details: `${label} "${name}" aus Papierkorb wiederhergestellt.`,
      tx,
    });
  });

  return { message: `${label} wiederhergestellt.` };
}

async function restoreAPChildren(tx, parentId, deletedAt) {
  const children = await tx.arbeitspaket.findMany({
    where: { parentId, deletedAt },
    select: { id: true },
  });

  if (children.length > 0) {
    await tx.arbeitspaket.updateMany({
      where: { id: { in: children.map(c => c.id) } },
      data: { deletedAt: null, deletedBy: null },
    });
    for (const child of children) {
      await restoreAPChildren(tx, child.id, deletedAt);
    }
  }
}

// Endgültig löschen (nur Admin)
export async function permanentDelete(id, userId) {
  const targets = [
    { model: 'ueberProjekt', label: 'Firma' },
    { model: 'projekt', label: 'Projekt' },
    { model: 'arbeitspaket', label: 'Arbeitspaket' },
    { model: 'mitarbeiter', label: 'Mitarbeiter' },
    { model: 'zuweisung', label: 'Zuweisung' },
    { model: 'blockierung', label: 'Blockierung' },
  ];

  for (const target of targets) {
    const item = await prisma[target.model].findFirst({
      where: { id, deletedAt: { not: null } },
    });

    if (item) {
      await prisma.$transaction(async (tx) => {
        // Kaskaden-Löschung in korrekter Reihenfolge
        if (target.model === 'ueberProjekt') {
          const projektIds = (await tx.projekt.findMany({
            where: { ueberProjektId: id },
            select: { id: true },
          })).map(p => p.id);

          if (projektIds.length > 0) {
            const apIds = (await tx.arbeitspaket.findMany({
              where: { projektId: { in: projektIds } },
              select: { id: true },
            })).map(a => a.id);

            if (apIds.length > 0) {
              await tx.aPVerteilung.deleteMany({ where: { arbeitspaketId: { in: apIds } } });
            }
            await tx.arbeitspaket.deleteMany({ where: { projektId: { in: projektIds } } });

            const zuweisungIds = (await tx.zuweisung.findMany({
              where: { projektId: { in: projektIds } },
              select: { id: true },
            })).map(z => z.id);
            if (zuweisungIds.length > 0) {
              await tx.aPVerteilung.deleteMany({ where: { zuweisungId: { in: zuweisungIds } } });
            }
            await tx.zuweisung.deleteMany({ where: { projektId: { in: projektIds } } });
            await tx.projekt.deleteMany({ where: { ueberProjektId: id } });
          }
          await tx.ueberProjekt.delete({ where: { id } });
        }

        if (target.model === 'projekt') {
          const apIds = (await tx.arbeitspaket.findMany({
            where: { projektId: id },
            select: { id: true },
          })).map(a => a.id);
          if (apIds.length > 0) {
            await tx.aPVerteilung.deleteMany({ where: { arbeitspaketId: { in: apIds } } });
          }
          await tx.arbeitspaket.deleteMany({ where: { projektId: id } });
          const zuweisungIds = (await tx.zuweisung.findMany({
            where: { projektId: id },
            select: { id: true },
          })).map(z => z.id);
          if (zuweisungIds.length > 0) {
            await tx.aPVerteilung.deleteMany({ where: { zuweisungId: { in: zuweisungIds } } });
          }
          await tx.zuweisung.deleteMany({ where: { projektId: id } });
          await tx.projekt.delete({ where: { id } });
        }

        if (target.model === 'arbeitspaket') {
          await deletAPTree(tx, id);
        }

        if (target.model === 'mitarbeiter') {
          await tx.blockierung.deleteMany({ where: { mitarbeiterId: id } });
          const zuweisungIds = (await tx.zuweisung.findMany({
            where: { mitarbeiterId: id },
            select: { id: true },
          })).map(z => z.id);
          if (zuweisungIds.length > 0) {
            await tx.aPVerteilung.deleteMany({ where: { zuweisungId: { in: zuweisungIds } } });
          }
          await tx.zuweisung.deleteMany({ where: { mitarbeiterId: id } });
          await tx.mitarbeiter.delete({ where: { id } });
        }

        if (target.model === 'zuweisung') {
          await tx.aPVerteilung.deleteMany({ where: { zuweisungId: id } });
          await tx.zuweisung.delete({ where: { id } });
        }

        if (target.model === 'blockierung') {
          await tx.blockierung.delete({ where: { id } });
        }

        const name = item.name || target.label;
        await logChange({
          userId,
          aktion: 'endgültig gelöscht',
          entitaet: target.label,
          entitaetId: id,
          name,
          details: `${target.label} "${name}" endgültig gelöscht.`,
          vorherJson: item,
          tx,
        });
      });

      return { message: `${target.label} endgültig gelöscht.` };
    }
  }

  throw new AppError('Gelöschtes Objekt nicht gefunden.', 404);
}

async function deletAPTree(tx, apId) {
  const children = await tx.arbeitspaket.findMany({
    where: { parentId: apId },
    select: { id: true },
  });
  for (const child of children) {
    await deletAPTree(tx, child.id);
  }
  await tx.aPVerteilung.deleteMany({ where: { arbeitspaketId: apId } });
  await tx.arbeitspaket.delete({ where: { id: apId } });
}

// Automatische Bereinigung: Alle > 30 Tage alten gelöschten Einträge endgültig löschen
export async function cleanupOldTrash() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const models = [
    'ueberProjekt', 'projekt', 'arbeitspaket',
    'mitarbeiter', 'zuweisung', 'blockierung',
  ];

  let totalDeleted = 0;

  for (const model of models) {
    const items = await prisma[model].findMany({
      where: { deletedAt: { lt: cutoff } },
      select: { id: true },
    });

    for (const item of items) {
      try {
        await permanentDelete(item.id, null);
        totalDeleted++;
      } catch {
        // Bereits gelöscht durch Kaskade
      }
    }
  }

  if (totalDeleted > 0) {
    console.log(`Papierkorb-Bereinigung: ${totalDeleted} Einträge endgültig gelöscht.`);
  }

  return totalDeleted;
}
