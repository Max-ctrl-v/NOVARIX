import prisma from '../config/database.js';
import { nextDokumentNummer } from '../utils/dokumentNummer.js';
import { hashData } from '../utils/hashData.js';
import { AppError } from '../middleware/errorHandler.js';

export async function getExportLog({ limit = 100, offset = 0 } = {}) {
  const take = Math.min(Math.max(limit, 1), 500);
  const skip = Math.max(offset, 0);
  const [logs, total] = await Promise.all([
    prisma.exportLog.findMany({
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
      take,
      skip,
    }),
    prisma.exportLog.count(),
  ]);
  return { logs, total, limit: take, offset: skip };
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
  const jahr = new Date().getFullYear();

  // Nur lesen, nicht inkrementieren – kein atomarer Seiteneffekt
  const existing = await prisma.exportCounter.findUnique({
    where: { jahr },
  });

  const nextCounter = existing ? existing.counter + 1 : 1;
  const nummer = String(nextCounter).padStart(4, '0');
  return { dokumentNummer: `CLX-${jahr}-${nummer}` };
}
