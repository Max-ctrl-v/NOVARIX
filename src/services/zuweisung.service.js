import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const notDeleted = { deletedAt: null };

async function validateAllocation(mitarbeiterId, von, bis, prozentAnteil, excludeId = null) {
  const vonDate = new Date(von);
  const bisDate = new Date(bis);

  const where = {
    mitarbeiterId,
    ...notDeleted,
    von: { lte: bisDate },
    bis: { gte: vonDate },
  };
  if (excludeId) where.id = { not: excludeId };

  const existing = await prisma.zuweisung.findMany({
    where,
    select: { id: true, von: true, bis: true, prozentAnteil: true, projekt: { select: { name: true } } },
  });

  if (existing.length === 0) return;

  // Sweep-line: find peak allocation across all overlapping intervals
  const events = [];
  for (const z of existing) {
    events.push({ date: z.von.getTime(), delta: Number(z.prozentAnteil) });
    const dayAfter = new Date(z.bis);
    dayAfter.setDate(dayAfter.getDate() + 1);
    events.push({ date: dayAfter.getTime(), delta: -Number(z.prozentAnteil) });
  }
  // Add the new/updated assignment
  events.push({ date: vonDate.getTime(), delta: Number(prozentAnteil) });
  const dayAfterNew = new Date(bisDate);
  dayAfterNew.setDate(dayAfterNew.getDate() + 1);
  events.push({ date: dayAfterNew.getTime(), delta: -Number(prozentAnteil) });

  events.sort((a, b) => a.date - b.date);

  let current = 0;
  let maxAlloc = 0;
  for (const ev of events) {
    current += ev.delta;
    if (current > maxAlloc) maxAlloc = current;
  }

  if (maxAlloc > 100) {
    const names = existing.map(z => `"${z.projekt.name}" (${Number(z.prozentAnteil)}%)`).join(', ');
    throw new AppError(
      `Überlastung: Mitarbeiter hat bereits ${names} in diesem Zeitraum. ` +
      `Maximale Gesamtauslastung wäre ${maxAlloc}% (max. 100%).`, 400
    );
  }
}

export async function getByProjekt(projektId) {
  return prisma.zuweisung.findMany({
    where: { projektId, ...notDeleted },
    include: {
      mitarbeiter: { select: { id: true, name: true, position: true } },
      apVerteilungen: {
        include: {
          arbeitspaket: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id) {
  const zuw = await prisma.zuweisung.findFirst({
    where: { id, ...notDeleted },
    include: {
      mitarbeiter: { select: { id: true, name: true, position: true } },
      projekt: { select: { id: true, name: true } },
      ueberProjekt: { select: { id: true, name: true } },
      apVerteilungen: {
        include: {
          arbeitspaket: { select: { id: true, name: true } },
        },
      },
    },
  });
  if (!zuw) throw new AppError('Zuweisung nicht gefunden.', 404);
  return zuw;
}

export async function create(projektId, data, userId) {
  const projekt = await prisma.projekt.findFirst({
    where: { id: projektId, ...notDeleted },
  });
  if (!projekt) throw new AppError('Projekt nicht gefunden.', 404);

  const ma = await prisma.mitarbeiter.findFirst({
    where: { id: data.mitarbeiterId, ...notDeleted },
  });
  if (!ma) throw new AppError('Mitarbeiter nicht gefunden.', 404);

  // Company constraint: employee must belong to the same company
  if (ma.ueberProjektId && ma.ueberProjektId !== data.ueberProjektId) {
    throw new AppError('Mitarbeiter gehört zu einer anderen Firma.', 400);
  }

  // Allocation validation: total must not exceed 100%
  await validateAllocation(data.mitarbeiterId, data.von, data.bis, Number(data.prozentAnteil));

  const zuweisung = await prisma.$transaction(async (tx) => {
    const zuw = await tx.zuweisung.create({
      data: {
        mitarbeiterId: data.mitarbeiterId,
        projektId,
        ueberProjektId: data.ueberProjektId,
        prozentAnteil: data.prozentAnteil,
        von: new Date(data.von),
        bis: new Date(data.bis),
        createdBy: userId,
      },
    });

    // AP-Verteilung erstellen
    if (data.arbeitspaketVerteilung && data.arbeitspaketVerteilung.length > 0) {
      const apSum = data.arbeitspaketVerteilung.reduce((s, apv) => s + apv.prozentAnteil, 0);
      if (apSum > 100) {
        throw new AppError(`AP-Verteilung darf maximal 100% betragen (aktuell: ${apSum}%).`, 400);
      }
      await tx.aPVerteilung.createMany({
        data: data.arbeitspaketVerteilung.map(apv => ({
          zuweisungId: zuw.id,
          arbeitspaketId: apv.arbeitspaketId,
          prozentAnteil: apv.prozentAnteil,
        })),
      });

      // GoBD: Jede AP-Verteilung im Audit-Log vermerken
      const createdAPVs = await tx.aPVerteilung.findMany({
        where: { zuweisungId: zuw.id },
      });
      for (const av of createdAPVs) {
        await logChange({
          userId,
          aktion: 'erstellt',
          entitaet: 'APVerteilung',
          entitaetId: av.id,
          name: 'AP-Verteilung',
          details: `AP-Verteilung für Zuweisung erstellt: ${av.prozentAnteil}%`,
          nachherJson: av,
          tx,
        });
      }
    }

    await logChange({
      userId,
      aktion: 'erstellt',
      entitaet: 'Zuweisung',
      entitaetId: zuw.id,
      name: `${ma.name} → ${projekt.name}`,
      details: `Zuweisung: "${ma.name}" zu "${projekt.name}" mit ${data.prozentAnteil}%.`,
      nachherJson: { ...zuw, arbeitspaketVerteilung: data.arbeitspaketVerteilung },
      tx,
    });

    return zuw;
  });

  return getById(zuweisung.id);
}

export async function update(id, data, userId) {
  const existing = await prisma.zuweisung.findFirst({
    where: { id, ...notDeleted },
    include: {
      mitarbeiter: { select: { name: true } },
      projekt: { select: { name: true } },
      apVerteilungen: true,
    },
  });
  if (!existing) throw new AppError('Zuweisung nicht gefunden.', 404);

  // Optimistic Locking via Version
  if (data.version !== undefined && data.version !== existing.version) {
    throw new AppError('Daten wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
  }

  // Allocation validation on update
  const newProzent = data.prozentAnteil !== undefined ? Number(data.prozentAnteil) : Number(existing.prozentAnteil);
  const newVon = data.von || existing.von;
  const newBis = data.bis || existing.bis;
  await validateAllocation(existing.mitarbeiterId, newVon, newBis, newProzent, id);

  await prisma.$transaction(async (tx) => {
    const updateData = { version: { increment: 1 } };
    if (data.prozentAnteil !== undefined) updateData.prozentAnteil = data.prozentAnteil;
    if (data.von !== undefined) updateData.von = new Date(data.von);
    if (data.bis !== undefined) updateData.bis = new Date(data.bis);

    await tx.zuweisung.update({
      where: { id },
      data: updateData,
    });

    // AP-Verteilung ersetzen wenn angegeben
    if (data.arbeitspaketVerteilung !== undefined) {
      if (data.arbeitspaketVerteilung.length > 0) {
        const apSum = data.arbeitspaketVerteilung.reduce((s, apv) => s + apv.prozentAnteil, 0);
        if (apSum > 100) {
          throw new AppError(`AP-Verteilung darf maximal 100% betragen (aktuell: ${apSum}%).`, 400);
        }
      }

      // GoBD: Bestehende AP-Verteilungen vor Löschung loggen
      const oldAPVs = await tx.aPVerteilung.findMany({ where: { zuweisungId: id } });
      for (const av of oldAPVs) {
        await logChange({
          userId,
          aktion: 'gelöscht',
          entitaet: 'APVerteilung',
          entitaetId: av.id,
          name: 'AP-Verteilung',
          details: `AP-Verteilung gelöscht: ${av.prozentAnteil}%`,
          vorherJson: av,
          tx,
        });
      }

      await tx.aPVerteilung.deleteMany({ where: { zuweisungId: id } });
      if (data.arbeitspaketVerteilung.length > 0) {
        await tx.aPVerteilung.createMany({
          data: data.arbeitspaketVerteilung.map(apv => ({
            zuweisungId: id,
            arbeitspaketId: apv.arbeitspaketId,
            prozentAnteil: apv.prozentAnteil,
          })),
        });

        // GoBD: Neue AP-Verteilungen loggen
        const newAPVs = await tx.aPVerteilung.findMany({ where: { zuweisungId: id } });
        for (const av of newAPVs) {
          await logChange({
            userId,
            aktion: 'erstellt',
            entitaet: 'APVerteilung',
            entitaetId: av.id,
            name: 'AP-Verteilung',
            details: `AP-Verteilung für Zuweisung erstellt: ${av.prozentAnteil}%`,
            nachherJson: av,
            tx,
          });
        }
      }
    }

    await logChange({
      userId,
      aktion: 'geändert',
      entitaet: 'Zuweisung',
      entitaetId: id,
      name: `${existing.mitarbeiter.name} → ${existing.projekt.name}`,
      details: `Zuweisung bearbeitet.`,
      vorherJson: existing,
      nachherJson: { ...updateData, arbeitspaketVerteilung: data.arbeitspaketVerteilung },
      tx,
    });
  });

  return getById(id);
}

export async function softDelete(id, userId) {
  const existing = await prisma.zuweisung.findFirst({
    where: { id, ...notDeleted },
    include: {
      mitarbeiter: { select: { name: true } },
      projekt: { select: { name: true } },
      apVerteilungen: true,
    },
  });
  if (!existing) throw new AppError('Zuweisung nicht gefunden.', 404);

  await prisma.$transaction(async (tx) => {
    // GoBD: AP-Verteilungen vor Soft-Delete loggen
    for (const av of existing.apVerteilungen) {
      await logChange({
        userId,
        aktion: 'gelöscht',
        entitaet: 'APVerteilung',
        entitaetId: av.id,
        name: 'AP-Verteilung',
        details: `AP-Verteilung gelöscht: ${av.prozentAnteil}%`,
        vorherJson: av,
        tx,
      });
    }

    await tx.zuweisung.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Zuweisung',
      entitaetId: id,
      name: `${existing.mitarbeiter.name} → ${existing.projekt.name}`,
      details: `Zuweisung "${existing.mitarbeiter.name}" → "${existing.projekt.name}" in Papierkorb verschoben.`,
      vorherJson: existing,
      tx,
    });
  });
}
