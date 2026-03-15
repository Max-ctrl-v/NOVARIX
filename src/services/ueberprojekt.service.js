import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

// Nur nicht-gelöschte Einträge
const notDeleted = { deletedAt: null };

export async function getAll({ limit = 100, offset = 0 } = {}) {
  const take = Math.min(Math.max(limit, 1), 500);
  const skip = Math.max(offset, 0);

  const [firmen, total] = await Promise.all([
    prisma.ueberProjekt.findMany({
      where: notDeleted,
      include: {
        projekte: {
          where: notDeleted,
          select: { id: true },
        },
        kommandisten: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.ueberProjekt.count({ where: notDeleted }),
  ]);

  return {
    data: firmen.map(f => ({
      ...f,
      projektCount: f.projekte.length,
      projekte: undefined,
    })),
    total,
    limit: take,
    offset: skip,
  };
}

export async function getById(id) {
  const firma = await prisma.ueberProjekt.findFirst({
    where: { id, ...notDeleted },
    include: {
      kommandisten: {
        orderBy: { createdAt: 'asc' },
      },
      projekte: {
        where: notDeleted,
        include: {
          arbeitspakete: {
            where: { ...notDeleted, parentId: null },
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
          zuweisungen: {
            where: notDeleted,
            include: {
              mitarbeiter: { select: { id: true, name: true, position: true } },
              apVerteilungen: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  if (!firma) throw new AppError('Firma nicht gefunden.', 404);
  return firma;
}

export async function create(data, userId) {
  const firma = await prisma.ueberProjekt.create({
    data: {
      name: data.name,
      beschreibung: data.beschreibung || null,
      unternehmensTyp: data.unternehmensTyp,
      rechtsform: data.rechtsform || 'gmbh',
      createdBy: userId,
      ...(data.kommandisten && data.kommandisten.length > 0 ? {
        kommandisten: {
          create: data.kommandisten.map(k => ({
            name: k.name,
            anteilProzent: k.anteilProzent,
          })),
        },
      } : {}),
    },
    include: { kommandisten: true },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Firma',
    entitaetId: firma.id,
    name: firma.name,
    details: `Firma "${firma.name}" (${firma.unternehmensTyp}) erstellt.`,
    nachherJson: firma,
  });

  return firma;
}

export async function update(id, data, userId) {
  const existing = await prisma.ueberProjekt.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Firma nicht gefunden.', 404);

  // Optimistic Locking via Version
  if (data.version !== undefined && data.version !== existing.version) {
    throw new AppError('Daten wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
  }

  const updateData = {
    version: { increment: 1 },
  };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.beschreibung !== undefined) updateData.beschreibung = data.beschreibung;
  if (data.unternehmensTyp !== undefined) updateData.unternehmensTyp = data.unternehmensTyp;
  if (data.rechtsform !== undefined) updateData.rechtsform = data.rechtsform;

  // Replace-all pattern for Kommandisten
  if (data.kommandisten !== undefined) {
    await prisma.kommandist.deleteMany({ where: { ueberProjektId: id } });
    if (data.kommandisten.length > 0) {
      updateData.kommandisten = {
        create: data.kommandisten.map(k => ({
          name: k.name,
          anteilProzent: k.anteilProzent,
        })),
      };
    }
  }

  const firma = await prisma.ueberProjekt.update({
    where: { id },
    data: updateData,
    include: { kommandisten: true },
  });

  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Firma',
    entitaetId: firma.id,
    name: firma.name,
    details: `Firma "${firma.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: firma,
  });

  return firma;
}

// Soft-Delete mit Kaskade
export async function softDelete(id, userId) {
  const existing = await prisma.ueberProjekt.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Firma nicht gefunden.', 404);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    // Firma soft-deleten
    await tx.ueberProjekt.update({
      where: { id },
      data: { deletedAt: now, deletedBy: userId },
    });

    // Kommandisten hard-delete (keine Audit-Pflicht für Hilfstabelle)
    await tx.kommandist.deleteMany({ where: { ueberProjektId: id } });

    // Alle Projekte der Firma soft-deleten
    const projekte = await tx.projekt.findMany({
      where: { ueberProjektId: id, ...notDeleted },
      select: { id: true },
    });

    const projektIds = projekte.map(p => p.id);

    if (projektIds.length > 0) {
      await tx.projekt.updateMany({
        where: { id: { in: projektIds } },
        data: { deletedAt: now, deletedBy: userId },
      });

      // Alle APs dieser Projekte soft-deleten
      await tx.arbeitspaket.updateMany({
        where: { projektId: { in: projektIds }, ...notDeleted },
        data: { deletedAt: now, deletedBy: userId },
      });

      // Alle Zuweisungen dieser Projekte soft-deleten
      await tx.zuweisung.updateMany({
        where: { projektId: { in: projektIds }, ...notDeleted },
        data: { deletedAt: now, deletedBy: userId },
      });
    }

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Firma',
      entitaetId: id,
      name: existing.name,
      details: `Firma "${existing.name}" in Papierkorb verschoben (inkl. ${projektIds.length} Projekte).`,
      vorherJson: existing,
      tx,
    });
  });
}
