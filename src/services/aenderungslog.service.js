import prisma from '../config/database.js';

export async function getAll({ aktion, entitaet, limit = 200, offset = 0 } = {}) {
  const where = {};
  if (aktion) where.aktion = aktion;
  if (entitaet) where.entitaet = entitaet;

  const [logs, total] = await Promise.all([
    prisma.aenderungsLog.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { zeitpunkt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.aenderungsLog.count({ where }),
  ]);

  return { logs, total, limit, offset };
}
