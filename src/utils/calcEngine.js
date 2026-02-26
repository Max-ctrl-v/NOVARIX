// Server-seitige CalcEngine — Spiegel der Frontend-Berechnung
// Wird für serverseitige Validierung benötigt

export function countWorkdays(startStr, endStr) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  let count = 0;
  const d = new Date(start);
  while (d <= end) {
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) count++;
    d.setDate(d.getDate() + 1);
  }
  return count;
}

export function countBlockedDays(blockierungen, feiertage, startStr, endStr, feiertagePflicht = true) {
  const start = new Date(startStr);
  const end = new Date(endStr);
  const blockedSet = new Set();

  // Blockierungen (Urlaub/Krank)
  for (const b of blockierungen) {
    const bStart = new Date(b.von);
    const bEnd = new Date(b.bis);
    const d = new Date(Math.max(bStart, start));
    const dEnd = new Date(Math.min(bEnd, end));
    while (d <= dEnd) {
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        blockedSet.add(d.toISOString().split('T')[0]);
      }
      d.setDate(d.getDate() + 1);
    }
  }

  // Feiertage
  if (feiertagePflicht) {
    for (const f of feiertage) {
      const fd = new Date(f.datum);
      if (fd >= start && fd <= end) {
        const dow = fd.getDay();
        if (dow !== 0 && dow !== 6) {
          blockedSet.add(fd.toISOString().split('T')[0]);
        }
      }
    }
  }

  return blockedSet.size;
}

export function calculateDailyRate(jahresgehalt, lohnnebenkosten, wochenStunden = 40, jahresUrlaub = 30, feiertagCount = 0) {
  const total = (Number(jahresgehalt) || 0) + (Number(lohnnebenkosten) || 0);
  if (total === 0) return 0;
  // Dynamische Berechnung statt hardcoded 260
  const wochenTage = Number(wochenStunden) / 8;
  const basisTage = Math.round(wochenTage * 52);
  const arbeitsTage = Math.max(basisTage - jahresUrlaub - feiertagCount, 1);
  return total / arbeitsTage;
}
