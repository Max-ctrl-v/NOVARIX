import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const notDeleted = { deletedAt: null };

// Rekursiver Include für Baumstruktur (3 Ebenen)
const treeInclude = {
  children: {
    where: notDeleted,
    include: {
      children: {
        where: notDeleted,
        include: {
          children: {
            where: notDeleted,
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
    orderBy: { sortOrder: 'asc' },
  },
};

export async function getByProjekt(projektId) {
  return prisma.arbeitspaket.findMany({
    where: { projektId, parentId: null, ...notDeleted },
    include: treeInclude,
    orderBy: { sortOrder: 'asc' },
  });
}

export async function getById(id) {
  const ap = await prisma.arbeitspaket.findFirst({
    where: { id, ...notDeleted },
    include: treeInclude,
  });
  if (!ap) throw new AppError('Arbeitspaket nicht gefunden.', 404);
  return ap;
}

// Top-Level AP erstellen
export async function create(projektId, data, userId) {
  const projekt = await prisma.projekt.findFirst({
    where: { id: projektId, ...notDeleted },
  });
  if (!projekt) throw new AppError('Projekt nicht gefunden.', 404);

  const ap = await prisma.arbeitspaket.create({
    data: {
      projektId,
      name: data.name,
      beschreibung: data.beschreibung || null,
      status: data.status || 'offen',
      startDatum: data.startDatum ? new Date(data.startDatum) : null,
      endDatum: data.endDatum ? new Date(data.endDatum) : null,
      sortOrder: data.sortOrder || 0,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Arbeitspaket',
    entitaetId: ap.id,
    name: ap.name,
    details: `Arbeitspaket "${ap.name}" in Projekt "${projekt.name}" erstellt.`,
    nachherJson: ap,
  });

  return ap;
}

// Unter-AP erstellen
export async function createChild(parentId, data, userId) {
  const parent = await prisma.arbeitspaket.findFirst({
    where: { id: parentId, ...notDeleted },
  });
  if (!parent) throw new AppError('Eltern-Arbeitspaket nicht gefunden.', 404);

  const ap = await prisma.arbeitspaket.create({
    data: {
      projektId: parent.projektId,
      parentId,
      name: data.name,
      beschreibung: data.beschreibung || null,
      status: data.status || 'offen',
      startDatum: data.startDatum ? new Date(data.startDatum) : null,
      endDatum: data.endDatum ? new Date(data.endDatum) : null,
      sortOrder: data.sortOrder || 0,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Arbeitspaket',
    entitaetId: ap.id,
    name: ap.name,
    details: `Unter-Arbeitspaket "${ap.name}" unter "${parent.name}" erstellt.`,
    nachherJson: ap,
  });

  return ap;
}

export async function update(id, data, userId) {
  const existing = await prisma.arbeitspaket.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Arbeitspaket nicht gefunden.', 404);

  if (data.updatedAt && existing.updatedAt) {
    if (new Date(data.updatedAt).getTime() !== new Date(existing.updatedAt).getTime()) {
      throw new AppError('Daten wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
    }
  }

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.beschreibung !== undefined) updateData.beschreibung = data.beschreibung;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDatum !== undefined) updateData.startDatum = data.startDatum ? new Date(data.startDatum) : null;
  if (data.endDatum !== undefined) updateData.endDatum = data.endDatum ? new Date(data.endDatum) : null;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;

  const ap = await prisma.arbeitspaket.update({
    where: { id },
    data: updateData,
  });

  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Arbeitspaket',
    entitaetId: ap.id,
    name: ap.name,
    details: `Arbeitspaket "${ap.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: ap,
  });

  return ap;
}

// Soft-Delete mit Kaskade (alle Kinder)
export async function softDelete(id, userId) {
  const existing = await prisma.arbeitspaket.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Arbeitspaket nicht gefunden.', 404);

  const now = new Date();

  // Rekursiv alle Kind-IDs sammeln
  async function collectChildIds(parentId) {
    const children = await prisma.arbeitspaket.findMany({
      where: { parentId, ...notDeleted },
      select: { id: true },
    });
    let ids = children.map(c => c.id);
    for (const child of children) {
      const grandChildIds = await collectChildIds(child.id);
      ids = ids.concat(grandChildIds);
    }
    return ids;
  }

  const childIds = await collectChildIds(id);
  const allIds = [id, ...childIds];

  await prisma.$transaction(async (tx) => {
    // Alle APs (Parent + Kinder) soft-deleten
    await tx.arbeitspaket.updateMany({
      where: { id: { in: allIds } },
      data: { deletedAt: now, deletedBy: userId },
    });

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Arbeitspaket',
      entitaetId: id,
      name: existing.name,
      details: `Arbeitspaket "${existing.name}" in Papierkorb verschoben (inkl. ${childIds.length} Unter-APs).`,
      vorherJson: existing,
      tx,
    });
  });
}
