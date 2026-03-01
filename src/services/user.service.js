import prisma from '../config/database.js';
import { hashPassword } from './auth.service.js';
import { logChange } from './auditLog.service.js';
import { AppError } from '../middleware/errorHandler.js';

const userSelect = {
  id: true,
  email: true,
  name: true,
  role: true,
  createdAt: true,
  lastLogin: true,
};

export async function getAll() {
  return prisma.user.findMany({
    select: userSelect,
    orderBy: { createdAt: 'asc' },
  });
}

export async function getById(id) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!user) throw new AppError('Benutzer nicht gefunden.', 404);
  return user;
}

export async function create(data, actingUserId) {
  const passwordHash = await hashPassword(data.password);

  const user = await prisma.user.create({
    data: {
      email: data.email.toLowerCase().trim(),
      passwordHash,
      name: data.name,
      role: data.role || 'viewer',
    },
    select: userSelect,
  });

  await logChange({
    userId: actingUserId,
    aktion: 'erstellt',
    entitaet: 'Benutzer',
    entitaetId: user.id,
    name: user.name,
    details: `Benutzer "${user.name}" (${user.email}) mit Rolle "${user.role}" erstellt.`,
    nachherJson: user,
  });

  return user;
}

export async function update(id, data, actingUserId) {
  const existing = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!existing) throw new AppError('Benutzer nicht gefunden.', 404);

  // Letzten Admin schützen: Rolle darf nicht geändert werden
  if (data.role && data.role !== 'admin' && existing.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin', email: { not: { startsWith: 'deleted_' } } } });
    if (adminCount <= 1) {
      throw new AppError('Der letzte Admin kann nicht herabgestuft werden.', 400);
    }
  }

  const updateData = {};
  if (data.email) updateData.email = data.email.toLowerCase().trim();
  if (data.name) updateData.name = data.name;
  if (data.role) updateData.role = data.role;
  if (data.password) {
    updateData.passwordHash = await hashPassword(data.password);
    updateData.failedLoginAttempts = 0;
    updateData.lockedUntil = null;
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    select: userSelect,
  });

  await logChange({
    userId: actingUserId,
    aktion: 'geändert',
    entitaet: 'Benutzer',
    entitaetId: user.id,
    name: user.name,
    details: `Benutzer "${user.name}" bearbeitet.`,
    vorherJson: existing,
    nachherJson: user,
  });

  return user;
}

export async function remove(id, actingUserId) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: userSelect,
  });
  if (!user) throw new AppError('Benutzer nicht gefunden.', 404);

  if (user.id === actingUserId) {
    throw new AppError('Sie können Ihren eigenen Account nicht löschen.', 400);
  }

  // Letzten Admin schützen
  if (user.role === 'admin') {
    const adminCount = await prisma.user.count({ where: { role: 'admin', email: { not: { startsWith: 'deleted_' } } } });
    if (adminCount <= 1) {
      throw new AppError('Der letzte Admin kann nicht gelöscht werden.', 400);
    }
  }

  // Soft-delete: Account deaktivieren statt hart löschen
  await prisma.user.update({
    where: { id },
    data: {
      email: `deleted_${Date.now()}_${user.email}`,
      refreshToken: null,
      name: `[Gelöscht] ${user.name}`,
    },
  });

  await logChange({
    userId: actingUserId,
    aktion: 'gelöscht',
    entitaet: 'Benutzer',
    entitaetId: user.id,
    name: user.name,
    details: `Benutzer "${user.name}" (${user.email}) deaktiviert.`,
    vorherJson: user,
  });
}
