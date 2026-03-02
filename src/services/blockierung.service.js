import prisma from '../config/database.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const notDeleted = { deletedAt: null };

export async function getByMitarbeiter(mitarbeiterId) {
  return prisma.blockierung.findMany({
    where: { mitarbeiterId, ...notDeleted },
    orderBy: { von: 'asc' },
  });
}

export async function create(mitarbeiterId, data, userId) {
  const ma = await prisma.mitarbeiter.findFirst({
    where: { id: mitarbeiterId, ...notDeleted },
  });
  if (!ma) throw new AppError('Mitarbeiter nicht gefunden.', 404);

  const blockierung = await prisma.blockierung.create({
    data: {
      mitarbeiterId,
      von: new Date(data.von),
      bis: new Date(data.bis),
      typ: data.typ,
    },
  });

  await logChange({
    userId,
    aktion: 'erstellt',
    entitaet: 'Blockierung',
    entitaetId: blockierung.id,
    name: `${data.typ} (${ma.name})`,
    details: `${data.typ === 'urlaub' ? 'Urlaub' : data.typ === 'krank' ? 'Krankheit' : 'Feiertag'} für "${ma.name}" von ${data.von} bis ${data.bis} erstellt.`,
    nachherJson: blockierung,
  });

  return blockierung;
}

export async function update(id, data, userId) {
  const existing = await prisma.blockierung.findFirst({
    where: { id, ...notDeleted },
    include: { mitarbeiter: { select: { name: true } } },
  });
  if (!existing) throw new AppError('Blockierung nicht gefunden.', 404);

  const updateData = {};
  if (data.von !== undefined) updateData.von = new Date(data.von);
  if (data.bis !== undefined) updateData.bis = new Date(data.bis);
  if (data.typ !== undefined) updateData.typ = data.typ;

  const blockierung = await prisma.blockierung.update({
    where: { id },
    data: updateData,
  });

  await logChange({
    userId,
    aktion: 'geändert',
    entitaet: 'Blockierung',
    entitaetId: id,
    name: `${blockierung.typ} (${existing.mitarbeiter.name})`,
    details: `Blockierung für "${existing.mitarbeiter.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: blockierung,
  });

  return blockierung;
}

export async function remove(id, userId) {
  const existing = await prisma.blockierung.findFirst({
    where: { id, ...notDeleted },
    include: { mitarbeiter: { select: { name: true } } },
  });
  if (!existing) throw new AppError('Blockierung nicht gefunden.', 404);

  await prisma.$transaction(async (tx) => {
    await tx.blockierung.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: userId },
    });

    await logChange({
      userId,
      aktion: 'gelöscht',
      entitaet: 'Blockierung',
      entitaetId: id,
      name: `${existing.typ} (${existing.mitarbeiter.name})`,
      details: `Blockierung für "${existing.mitarbeiter.name}" gelöscht.`,
      vorherJson: existing,
      tx,
    });
  });
}
