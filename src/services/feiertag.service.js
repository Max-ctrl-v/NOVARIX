import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getAll() {
  return prisma.feiertag.findMany({
    orderBy: { datum: 'asc' },
  });
}

export async function create(data, userId) {
  const feiertag = await prisma.feiertag.create({
    data: {
      datum: new Date(data.datum),
      name: data.name,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Feiertag',
    entitaetId: feiertag.id,
    name: feiertag.name,
    details: `Feiertag "${feiertag.name}" am ${data.datum} erstellt.`,
    nachherJson: feiertag,
  });

  return feiertag;
}

export async function remove(id, userId) {
  const existing = await prisma.feiertag.findUnique({ where: { id } });
  if (!existing) throw new AppError('Feiertag nicht gefunden.', 404);

  // Audit-Log ZUERST schreiben (vor dem Löschen), damit GoBD-konform
  await logChange({
    userId,
    aktion: 'gelöscht',
    entitaet: 'Feiertag',
    entitaetId: id,
    name: existing.name,
    details: `Feiertag "${existing.name}" am ${existing.datum.toISOString().split('T')[0]} gelöscht.`,
    vorherJson: existing,
  });

  await prisma.feiertag.delete({ where: { id } });
}
