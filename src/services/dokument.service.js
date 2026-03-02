import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function upload(projektId, file, userId) {
  const projekt = await prisma.projekt.findFirst({ where: { id: projektId, deletedAt: null } });
  if (!projekt) throw new AppError('Projekt nicht gefunden.', 404);

  const doc = await prisma.dokument.create({
    data: {
      projektId,
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      data: file.buffer,
      createdBy: userId,
    },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Dokument',
    entitaetId: doc.id,
    name: doc.name,
    details: `Dokument "${doc.name}" hochgeladen (${Math.round(file.size / 1024)} KB).`,
  });

  return doc;
}

export async function uploadGeneric(file, userId) {
  const doc = await prisma.dokument.create({
    data: {
      name: file.originalname,
      size: file.size,
      mimeType: file.mimetype,
      data: file.buffer,
      createdBy: userId,
    },
    select: { id: true, name: true, size: true, mimeType: true, createdAt: true },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Dokument',
    entitaetId: doc.id,
    name: doc.name,
    details: `Dokument "${doc.name}" hochgeladen (${Math.round(file.size / 1024)} KB).`,
  });

  return doc;
}

export async function listByIds(ids) {
  if (!ids || ids.length === 0) return [];
  return prisma.dokument.findMany({
    where: { id: { in: ids } },
    select: { id: true, name: true, size: true, mimeType: true, createdBy: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function listByProjekt(projektId) {
  return prisma.dokument.findMany({
    where: { projektId },
    select: { id: true, name: true, size: true, mimeType: true, createdBy: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
}

export async function download(id) {
  const doc = await prisma.dokument.findUnique({ where: { id } });
  if (!doc) throw new AppError('Dokument nicht gefunden.', 404);
  return doc;
}

export async function remove(id, userId) {
  const doc = await prisma.dokument.findUnique({
    where: { id },
    select: { id: true, name: true },
  });
  if (!doc) throw new AppError('Dokument nicht gefunden.', 404);

  await prisma.dokument.delete({ where: { id } });

  await logChange({
    userId,
    aktion: 'gelöscht',
    entitaet: 'Dokument',
    entitaetId: doc.id,
    name: doc.name,
    details: `Dokument "${doc.name}" gelöscht.`,
  });

  return doc;
}
