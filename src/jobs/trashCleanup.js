import cron from 'node-cron';
import { cleanupOldTrash } from '../services/papierkorb.service.js';

// Täglich um 02:00 Uhr — Papierkorb bereinigen (> 30 Tage)
export function startTrashCleanup() {
  cron.schedule('0 2 * * *', async () => {
    console.log('Papierkorb-Bereinigung gestartet...');
    try {
      const count = await cleanupOldTrash();
      console.log(`Papierkorb-Bereinigung abgeschlossen: ${count} Einträge entfernt.`);
    } catch (err) {
      console.error('Fehler bei Papierkorb-Bereinigung:', err);
    }
  });

  console.log('Cron-Job: Papierkorb-Bereinigung aktiv (täglich 02:00 Uhr)');
}
