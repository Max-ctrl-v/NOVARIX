import prisma from '../config/database.js';

export async function logSession({ userId, email, aktion, ip, userAgent, details }) {
  return prisma.sessionLog.create({
    data: { userId, email, aktion, ip: ip || 'unknown', userAgent, details },
  });
}

export async function getSessionLogs({ limit = 100, offset = 0 } = {}) {
  const safeLimit = Math.min(Math.max(limit, 1), 500);
  const safeOffset = Math.max(offset, 0);
  const [logs, total] = await Promise.all([
    prisma.sessionLog.findMany({
      orderBy: { zeitpunkt: 'desc' },
      take: safeLimit,
      skip: safeOffset,
    }),
    prisma.sessionLog.count(),
  ]);
  return { data: logs, total, limit: safeLimit, offset: safeOffset };
}
