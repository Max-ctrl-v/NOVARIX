import prisma from '../config/database.js';

// Audit-Log Eintrag erstellen — wird von ALLEN Services aufgerufen
// GoBD-konform: Speichert Vorher/Nachher-Zustand
export async function logChange({
  userId,
  aktion,
  entitaet,
  entitaetId,
  name,
  details,
  vorherJson = null,
  nachherJson = null,
  tx = null, // Optional: Prisma Transaction Client
}) {
  const client = tx || prisma;

  await client.aenderungsLog.create({
    data: {
      userId,
      aktion,
      entitaet,
      entitaetId,
      name,
      details,
      vorherJson,
      nachherJson,
    },
  });
}
