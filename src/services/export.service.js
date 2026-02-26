import prisma from '../config/database.js';
import { nextDokumentNummer } from '../utils/dokumentNummer.js';
import { hashData } from '../utils/hashData.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getExportLog({ limit = 100, offset = 0 } = {}) {
  const [logs, total] = await Promise.all([
    prisma.exportLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.exportLog.count(),
  ]);
  return { logs, total, limit, offset };
}

export async function registerExport(data, userId) {
  const dokumentNummer = await nextDokumentNummer();
  const datenHash = hashData(data.exportData || data);

  const entry = await prisma.exportLog.create({
    data: {
      userId,
      dokumentNummer,
      typ: data.typ,
      referenzId: data.referenzId || null,
      zeitraumVon: data.zeitraumVon ? new Date(data.zeitraumVon) : null,
      zeitraumBis: data.zeitraumBis ? new Date(data.zeitraumBis) : null,
      datenHash,
    },
  });

  return entry;
}

export async function getNextDokumentNummer() {
  const nummer = await nextDokumentNummer();
  // Rollback: den Counter wieder dekrementieren da wir nur abfragen
  const jahr = new Date().getFullYear();
  await prisma.exportCounter.update({
    where: { jahr },
    data: { counter: { decrement: 1 } },
  });
  return { dokumentNummer: nummer };
}
