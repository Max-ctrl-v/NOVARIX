import prisma from '../config/database.js';

// GoBD-konforme Dokumentnummer generieren: CLX-YYYY-NNNN
export async function nextDokumentNummer() {
  const jahr = new Date().getFullYear();

  // Atomarer Counter-Increment
  const counter = await prisma.exportCounter.upsert({
    where: { jahr },
    update: { counter: { increment: 1 } },
    create: { jahr, counter: 1 },
  });

  const nummer = String(counter.counter).padStart(4, '0');
  return `CLX-${jahr}-${nummer}`;
}
