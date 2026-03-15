import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const notDeleted = { deletedAt: null };

export async function getByUeberProjekt(ueberProjektId) {
  return prisma.projekt.findMany({
    where: { ueberProjektId, ...notDeleted },
    include: {
      arbeitspakete: {
        where: notDeleted,
        select: { id: true },
      },
      zuweisungen: {
        where: notDeleted,
        select: { id: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function getById(id) {
  const projekt = await prisma.projekt.findFirst({
    where: { id, ...notDeleted },
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
  });

  if (!projekt) throw new AppError('Projekt nicht gefunden.', 404);
  return projekt;
}

export async function create(ueberProjektId, data, userId) {
  // Prüfe ob Firma existiert
  const firma = await prisma.ueberProjekt.findFirst({
    where: { id: ueberProjektId, ...notDeleted },
  });
  if (!firma) throw new AppError('Firma nicht gefunden.', 404);

  const projekt = await prisma.projekt.create({
    data: {
      ueberProjektId,
      name: data.name,
      beschreibung: data.beschreibung || null,
      status: data.status || 'geplant',
      startDatum: data.startDatum ? new Date(data.startDatum) : null,
      endDatum: data.endDatum ? new Date(data.endDatum) : null,
      sollKosten: data.sollKosten != null ? data.sollKosten : null,
      bescheinigteKosten: data.bescheinigteKosten != null ? data.bescheinigteKosten : null,
      foerdersatz: data.foerdersatz != null ? data.foerdersatz : null,
      foerdersumme: data.foerdersumme != null ? data.foerdersumme : null,
      honorarProzent: data.honorarProzent != null ? data.honorarProzent : null,
      honorar: data.honorar != null ? data.honorar : null,
      createdBy: userId,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Projekt',
    entitaetId: projekt.id,
    name: projekt.name,
    details: `Projekt "${projekt.name}" in Firma "${firma.name}" erstellt.`,
    nachherJson: projekt,
  });

  return projekt;
}

export async function update(id, data, userId) {
  const existing = await prisma.projekt.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Projekt nicht gefunden.', 404);

  // Optimistic Locking via Version
  if (data.version !== undefined && data.version !== existing.version) {
    throw new AppError('Daten wurden zwischenzeitlich geändert. Bitte neu laden.', 409);
  }

  const updateData = { version: { increment: 1 } };
  if (data.name !== undefined) updateData.name = data.name;
  if (data.beschreibung !== undefined) updateData.beschreibung = data.beschreibung;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.startDatum !== undefined) updateData.startDatum = data.startDatum ? new Date(data.startDatum) : null;
  if (data.endDatum !== undefined) updateData.endDatum = data.endDatum ? new Date(data.endDatum) : null;
  if (data.sollKosten !== undefined) updateData.sollKosten = data.sollKosten != null ? data.sollKosten : null;
  if (data.bescheinigteKosten !== undefined) updateData.bescheinigteKosten = data.bescheinigteKosten != null ? data.bescheinigteKosten : null;
  if (data.foerdersatz !== undefined) updateData.foerdersatz = data.foerdersatz != null ? data.foerdersatz : null;
  if (data.foerdersumme !== undefined) updateData.foerdersumme = data.foerdersumme != null ? data.foerdersumme : null;
  if (data.honorarProzent !== undefined) updateData.honorarProzent = data.honorarProzent != null ? data.honorarProzent : null;
  if (data.honorar !== undefined) updateData.honorar = data.honorar != null ? data.honorar : null;

  const projekt = await prisma.projekt.update({
    where: { id },
    data: updateData,
  });

  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Projekt',
    entitaetId: projekt.id,
    name: projekt.name,
    details: `Projekt "${projekt.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: projekt,
  });

  return projekt;
}

export async function softDelete(id, userId) {
  const existing = await prisma.projekt.findFirst({
    where: { id, ...notDeleted },
  });
  if (!existing) throw new AppError('Projekt nicht gefunden.', 404);

  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.projekt.update({
      where: { id },
      data: { deletedAt: now, deletedBy: userId },
    });

    // APs kaskadieren
    await tx.arbeitspaket.updateMany({
      where: { projektId: id, ...notDeleted },
      data: { deletedAt: now, deletedBy: userId },
    });

    // Zuweisungen kaskadieren
    await tx.zuweisung.updateMany({
      where: { projektId: id, ...notDeleted },
      data: { deletedAt: now, deletedBy: userId },
    });

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Projekt',
      entitaetId: id,
      name: existing.name,
      details: `Projekt "${existing.name}" in Papierkorb verschoben.`,
      vorherJson: existing,
      tx,
    });
  });
}
