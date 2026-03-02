import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const notDeleted = { deletedAt: null };

export async function getAll({ limit = 100, offset = 0 } = {}) {
  const take = Math.min(Math.max(limit, 1), 500);
  const skip = Math.max(offset, 0);

  const [mitarbeiter, total] = await Promise.all([
    prisma.mitarbeiter.findMany({
      where: notDeleted,
      include: {
        blockierungen: {
          where: notDeleted,
          orderBy: { von: 'asc' },
        },
        zuweisungen: {
          where: notDeleted,
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
      take,
      skip,
    }),
    prisma.mitarbeiter.count({ where: notDeleted }),
  ]);

  return {
    data: mitarbeiter.map(m => ({
      ...m,
      zuweisungCount: m.zuweisungen.length,
      zuweisungen: undefined,
    })),
    total,
    limit: take,
    offset: skip,
  };
}

export async function getById(id) {
  const ma = await prisma.mitarbeiter.findFirst({
    where: { id, ...notDeleted },
    include: {
      blockierungen: {
        where: notDeleted,
        orderBy: { von: 'asc' },
      },
      zuweisungen: {
        where: notDeleted,
        include: {
          projekt: { select: { id: true, name: true } },
          ueberProjekt: { select: { id: true, name: true } },
          apVerteilungen: {
            include: {
              arbeitspaket: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  if (!ma) throw new AppError('Mitarbeiter nicht gefunden.', 404);
  return ma;
}

export async function create(data, userId) {
  const ma = await prisma.mitarbeiter.create({
    data: {
      name: data.name,
      position: data.position || null,
      wochenStunden: data.wochenStunden,
      jahresUrlaub: data.jahresUrlaub,
      jahresgehalt: data.jahresgehalt ?? null,
      lohnnebenkosten: data.lohnnebenkosten ?? null,
      feiertagePflicht: data.feiertagePflicht,
      createdBy: userId,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Mitarbeiter',
    entitaetId: ma.id,
    name: ma.name,
    details: `Mitarbeiter "${ma.name}" (${ma.position || 'keine Position'}) erstellt.`,
    nachherJson: ma,
  });

  return ma;
}

export async function update(id, data, userId) {
  const existing = await prisma.mitarbeiter.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Mitarbeiter nicht gefunden.', 404);

  // Optimistic Locking via Version
  if (data.version !== undefined && data.version !== existing.version) {
    throw new AppError('Daten wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
  }

  const updateData = { version: { increment: 1 } };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.position !== undefined) updateData.position = data.position;
  if (data.wochenStunden !== undefined) updateData.wochenStunden = data.wochenStunden;
  if (data.jahresUrlaub !== undefined) updateData.jahresUrlaub = data.jahresUrlaub;
  if (data.jahresgehalt !== undefined) updateData.jahresgehalt = data.jahresgehalt;
  if (data.lohnnebenkosten !== undefined) updateData.lohnnebenkosten = data.lohnnebenkosten;
  if (data.feiertagePflicht !== undefined) updateData.feiertagePflicht = data.feiertagePflicht;

  const ma = await prisma.mitarbeiter.update({
    where: { id },
    data: updateData,
  });

  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Mitarbeiter',
    entitaetId: ma.id,
    name: ma.name,
    details: `Mitarbeiter "${ma.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: ma,
  });

  return ma;
}

export async function softDelete(id, userId) {
  const existing = await prisma.mitarbeiter.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Mitarbeiter nicht gefunden.', 404);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.mitarbeiter.update({
      where: { id },
      data: { deletedAt: now, deletedBy: userId },
    });

    // Blockierungen kaskadieren
    await tx.blockierung.updateMany({
      where: { mitarbeiterId: id, ...notDeleted },
      data: { deletedAt: now, deletedBy: userId },
    });

    // Zuweisungen kaskadieren
    await tx.zuweisung.updateMany({
      where: { mitarbeiterId: id, ...notDeleted },
      data: { deletedAt: now, deletedBy: userId },
    });

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Mitarbeiter',
      entitaetId: id,
      name: existing.name,
      details: `Mitarbeiter "${existing.name}" in Papierkorb verschoben.`,
      vorherJson: existing,
      tx,
    });
  });
}
