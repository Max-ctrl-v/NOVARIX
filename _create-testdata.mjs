const BASE = process.env.NOVARIX_API || 'https://novarix-backend-production.up.railway.app/api/v1';
const EMAIL = process.env.NOVARIX_EMAIL;
const PW = process.env.NOVARIX_PASSWORD;
if (!EMAIL || !PW) { console.error('Set NOVARIX_EMAIL and NOVARIX_PASSWORD env vars'); process.exit(1); }

async function api(path, token, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, ...opts.headers },
    signal: AbortSignal.timeout(30000),
  });
  const json = await res.json();
  if (!res.ok) console.error(`FAIL ${opts.method||'GET'} ${path}: ${res.status}`, JSON.stringify(json).slice(0, 200));
  return json;
}

async function main() {
  // === LOGIN ===
  const login = await api('/auth/login', '', {
    method: 'POST',
    body: JSON.stringify({ email: EMAIL, password: PW }),
  });
  const token = login.accessToken;
  console.log('Logged in as:', login.user.name);

  // === First clean existing data ===
  console.log('\nCleaning existing data...');
  const existing = (await api('/ueberprojekte', token)).data || [];
  for (const u of existing) {
    await api(`/ueberprojekte/${u.id}`, token, { method: 'DELETE' });
  }
  // Clean via backup import with empty data
  await api('/backup/import', token, {
    method: 'POST',
    body: JSON.stringify({
      version: '2.1',
      exportedAt: new Date().toISOString(),
      data: {
        ueberProjekte: [], projekte: [], arbeitspakete: [], mitarbeiter: [],
        blockierungen: [], zuweisungen: [], apVerteilungen: [], feiertage: [],
        exportLog: [], exportCounter: [],
      },
    }),
  });
  console.log('Clean slate ready.');

  // ═══════════════════════════════════════════════════
  // CREATE: Über-Projekt (Company)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING COMPANY ═══');
  const firma = await api('/ueberprojekte', token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'TechNova Solutions GmbH',
      beschreibung: 'Innovative Softwarelösungen für mittelständische Unternehmen. Spezialisiert auf Cloud-Infrastruktur, KI-Integration und digitale Transformation.',
      unternehmensTyp: 'kmu',
    }),
  });
  console.log('Created company:', firma.name, firma.id);

  // ═══════════════════════════════════════════════════
  // CREATE: Projekt
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING PROJECT ═══');
  const projekt = await api(`/ueberprojekte/${firma.id}/projekte`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'CloudPilot – KI-gestützte Cloud-Migration',
      beschreibung: 'Entwicklung einer KI-gestützten Plattform zur automatisierten Migration von On-Premise-Systemen in die Cloud. Das Projekt umfasst Analyse-Tools, automatisierte Migrationspfade, Kostenkalkulation und ein Dashboard für Echtzeit-Monitoring.',
      status: 'aktiv',
      startDatum: '2026-02-24',
      endDatum: '2026-11-30',
    }),
  });
  console.log('Created project:', projekt.name, projekt.id);

  // ═══════════════════════════════════════════════════
  // CREATE: Arbeitspakete (Work Packages)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING WORK PACKAGES ═══');

  const ap1 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP1: Anforderungsanalyse & Konzeption',
      beschreibung: 'Stakeholder-Interviews, Ist-Analyse bestehender Infrastrukturen, Definition der Migrationskriterien, Erstellung des technischen Konzepts und Architektur-Design.',
      status: 'abgeschlossen',
      startDatum: '2026-02-24',
      endDatum: '2026-03-21',
    }),
  });
  console.log('  AP1:', ap1.name);

  const ap2 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP2: KI-Analyse-Engine',
      beschreibung: 'Entwicklung des KI-Modells zur automatischen Erkennung und Klassifizierung von Systemkomponenten. Training mit historischen Migrationsdaten, Implementierung der Bewertungslogik für Migrationsrisiken.',
      status: 'in_bearbeitung',
      startDatum: '2026-03-22',
      endDatum: '2026-06-15',
    }),
  });
  console.log('  AP2:', ap2.name);

  // Sub-AP under AP2
  const ap2a = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP2.1: ML-Modell Training',
      beschreibung: 'Aufbau des Trainingsdatensatzes, Feature-Engineering, Modellauswahl und Hyperparameter-Optimierung.',
      status: 'in_bearbeitung',
      startDatum: '2026-03-22',
      endDatum: '2026-05-10',
      parentId: ap2.id,
    }),
  });
  console.log('    AP2.1:', ap2a.name);

  const ap2b = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP2.2: Risikobewertungs-Algorithmus',
      beschreibung: 'Implementierung der automatisierten Risikobewertung für Migrationsszenarien basierend auf Systemkomplexität, Abhängigkeiten und Datenkritikalität.',
      status: 'offen',
      startDatum: '2026-05-11',
      endDatum: '2026-06-15',
      parentId: ap2.id,
    }),
  });
  console.log('    AP2.2:', ap2b.name);

  const ap3 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP3: Migrations-Orchestrator',
      beschreibung: 'Entwicklung des automatisierten Migrationsprozesses: Terraform-Templates, Container-Konvertierung, Datenbank-Migration, DNS-Umstellung. Inklusive Rollback-Mechanismen.',
      status: 'offen',
      startDatum: '2026-05-01',
      endDatum: '2026-08-31',
    }),
  });
  console.log('  AP3:', ap3.name);

  const ap4 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP4: Dashboard & Monitoring',
      beschreibung: 'Echtzeit-Dashboard mit Kostenübersicht, Migrationsfortschritt, Performance-Vergleich Alt vs. Neu, Alarmierung bei Problemen. React-Frontend mit WebSocket-Updates.',
      status: 'offen',
      startDatum: '2026-06-01',
      endDatum: '2026-09-30',
    }),
  });
  console.log('  AP4:', ap4.name);

  const ap5 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP5: Testing & Qualitätssicherung',
      beschreibung: 'End-to-End-Tests der gesamten Plattform, Penetrationstests, Lasttests, UAT mit Pilotkunden. Dokumentation der Testergebnisse und Abnahmeprotokoll.',
      status: 'offen',
      startDatum: '2026-08-01',
      endDatum: '2026-10-31',
    }),
  });
  console.log('  AP5:', ap5.name);

  const ap6 = await api(`/projekte/${projekt.id}/arbeitspakete`, token, {
    method: 'POST',
    body: JSON.stringify({
      name: 'AP6: Go-Live & Rollout',
      beschreibung: 'Produktionsdeployment, Kundenschulungen, Übergabe an den Support, Marketing-Launch, Dokumentation für Endnutzer und Administratoren.',
      status: 'offen',
      startDatum: '2026-10-01',
      endDatum: '2026-11-30',
    }),
  });
  console.log('  AP6:', ap6.name);

  // ═══════════════════════════════════════════════════
  // CREATE: Mitarbeiter (Workers)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING WORKERS ═══');

  const workers = [];
  const workerData = [
    { name: 'Dr. Sarah Chen', position: 'Lead Architect / KI-Spezialistin', wochenStunden: 40, jahresUrlaub: 30, jahresgehalt: 95000, lohnnebenkosten: 19000 },
    { name: 'Markus Weber', position: 'Senior Cloud Engineer', wochenStunden: 40, jahresUrlaub: 30, jahresgehalt: 82000, lohnnebenkosten: 16400 },
    { name: 'Lisa Hoffmann', position: 'Full-Stack Entwicklerin', wochenStunden: 40, jahresUrlaub: 28, jahresgehalt: 72000, lohnnebenkosten: 14400 },
    { name: 'Tom Richter', position: 'DevOps Engineer', wochenStunden: 40, jahresUrlaub: 30, jahresgehalt: 78000, lohnnebenkosten: 15600 },
    { name: 'Nina Schulz', position: 'UX/UI Designerin', wochenStunden: 32, jahresUrlaub: 28, jahresgehalt: 58000, lohnnebenkosten: 11600 },
    { name: 'Jan Müller', position: 'QA Engineer', wochenStunden: 40, jahresUrlaub: 30, jahresgehalt: 65000, lohnnebenkosten: 13000 },
  ];

  for (const w of workerData) {
    const ma = await api('/mitarbeiter', token, { method: 'POST', body: JSON.stringify(w) });
    workers.push(ma);
    console.log(`  ${ma.name} – ${ma.position}`);
  }

  // ═══════════════════════════════════════════════════
  // CREATE: Feiertage (German public holidays 2026)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING HOLIDAYS ═══');
  const feiertage = [
    { datum: '2026-01-01', name: 'Neujahr' },
    { datum: '2026-04-03', name: 'Karfreitag' },
    { datum: '2026-04-06', name: 'Ostermontag' },
    { datum: '2026-05-01', name: 'Tag der Arbeit' },
    { datum: '2026-05-14', name: 'Christi Himmelfahrt' },
    { datum: '2026-05-25', name: 'Pfingstmontag' },
    { datum: '2026-10-03', name: 'Tag der Deutschen Einheit' },
    { datum: '2026-12-25', name: '1. Weihnachtstag' },
    { datum: '2026-12-26', name: '2. Weihnachtstag' },
  ];
  for (const f of feiertage) {
    await api('/feiertage', token, { method: 'POST', body: JSON.stringify(f) });
  }
  console.log(`  ${feiertage.length} Feiertage created`);

  // ═══════════════════════════════════════════════════
  // CREATE: Blockierungen (Vacation / Sick)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING ABSENCES ═══');

  // Sarah: 2 weeks vacation in July
  await api(`/mitarbeiter/${workers[0].id}/blockierungen`, token, {
    method: 'POST', body: JSON.stringify({ von: '2026-07-06', bis: '2026-07-17', typ: 'urlaub' }),
  });
  console.log('  Dr. Sarah Chen: Urlaub 06.07–17.07');

  // Markus: 1 week sick in April
  await api(`/mitarbeiter/${workers[1].id}/blockierungen`, token, {
    method: 'POST', body: JSON.stringify({ von: '2026-04-13', bis: '2026-04-17', typ: 'krank' }),
  });
  console.log('  Markus Weber: Krank 13.04–17.04');

  // Lisa: 3 weeks vacation in August
  await api(`/mitarbeiter/${workers[2].id}/blockierungen`, token, {
    method: 'POST', body: JSON.stringify({ von: '2026-08-03', bis: '2026-08-21', typ: 'urlaub' }),
  });
  console.log('  Lisa Hoffmann: Urlaub 03.08–21.08');

  // Tom: 1 week vacation in June
  await api(`/mitarbeiter/${workers[3].id}/blockierungen`, token, {
    method: 'POST', body: JSON.stringify({ von: '2026-06-15', bis: '2026-06-19', typ: 'urlaub' }),
  });
  console.log('  Tom Richter: Urlaub 15.06–19.06');

  // Nina: 2 days sick in May
  await api(`/mitarbeiter/${workers[4].id}/blockierungen`, token, {
    method: 'POST', body: JSON.stringify({ von: '2026-05-18', bis: '2026-05-19', typ: 'krank' }),
  });
  console.log('  Nina Schulz: Krank 18.05–19.05');

  // ═══════════════════════════════════════════════════
  // CREATE: Zuweisungen (Worker Assignments to Project)
  // ═══════════════════════════════════════════════════
  console.log('\n═══ CREATING ASSIGNMENTS ═══');

  // Sarah Chen – Lead: 80% on project, Feb–Nov, assigned to AP1+AP2
  const zuw1 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[0].id,
      ueberProjektId: firma.id,
      prozentAnteil: 80,
      von: '2026-02-24',
      bis: '2026-11-30',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap1.id, prozentAnteil: 20 },
        { arbeitspaketId: ap2.id, prozentAnteil: 50 },
        { arbeitspaketId: ap5.id, prozentAnteil: 10 },
      ],
    }),
  });
  console.log('  Dr. Sarah Chen: 80% → AP1, AP2, AP5');

  // Markus Weber – Cloud: 100% on project, Mar–Oct
  const zuw2 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[1].id,
      ueberProjektId: firma.id,
      prozentAnteil: 100,
      von: '2026-03-01',
      bis: '2026-10-31',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap2.id, prozentAnteil: 30 },
        { arbeitspaketId: ap3.id, prozentAnteil: 50 },
        { arbeitspaketId: ap5.id, prozentAnteil: 20 },
      ],
    }),
  });
  console.log('  Markus Weber: 100% → AP2, AP3, AP5');

  // Lisa Hoffmann – Full-Stack: 100%, Apr–Nov
  const zuw3 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[2].id,
      ueberProjektId: firma.id,
      prozentAnteil: 100,
      von: '2026-04-01',
      bis: '2026-11-30',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap3.id, prozentAnteil: 40 },
        { arbeitspaketId: ap4.id, prozentAnteil: 50 },
        { arbeitspaketId: ap6.id, prozentAnteil: 10 },
      ],
    }),
  });
  console.log('  Lisa Hoffmann: 100% → AP3, AP4, AP6');

  // Tom Richter – DevOps: 60%, Mar–Nov
  const zuw4 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[3].id,
      ueberProjektId: firma.id,
      prozentAnteil: 60,
      von: '2026-03-01',
      bis: '2026-11-30',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap3.id, prozentAnteil: 40 },
        { arbeitspaketId: ap5.id, prozentAnteil: 30 },
        { arbeitspaketId: ap6.id, prozentAnteil: 30 },
      ],
    }),
  });
  console.log('  Tom Richter: 60% → AP3, AP5, AP6');

  // Nina Schulz – UX/UI: 50%, May–Oct
  const zuw5 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[4].id,
      ueberProjektId: firma.id,
      prozentAnteil: 50,
      von: '2026-05-01',
      bis: '2026-10-31',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap4.id, prozentAnteil: 80 },
        { arbeitspaketId: ap6.id, prozentAnteil: 20 },
      ],
    }),
  });
  console.log('  Nina Schulz: 50% → AP4, AP6');

  // Jan Müller – QA: 80%, Jul–Nov
  const zuw6 = await api(`/projekte/${projekt.id}/zuweisungen`, token, {
    method: 'POST',
    body: JSON.stringify({
      mitarbeiterId: workers[5].id,
      ueberProjektId: firma.id,
      prozentAnteil: 80,
      von: '2026-07-01',
      bis: '2026-11-30',
      arbeitspaketVerteilung: [
        { arbeitspaketId: ap5.id, prozentAnteil: 70 },
        { arbeitspaketId: ap6.id, prozentAnteil: 30 },
      ],
    }),
  });
  console.log('  Jan Müller: 80% → AP5, AP6');

  // ═══════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════
  console.log('\n══════════════════════════════════════════');
  console.log('TEST COMPANY CREATED SUCCESSFULLY');
  console.log('──────────────────────────────────────────');
  console.log('Company:    TechNova Solutions GmbH');
  console.log('Project:    CloudPilot – KI-gestützte Cloud-Migration');
  console.log('Duration:   24.02.2026 – 30.11.2026');
  console.log('APs:        8 (6 main + 2 sub)');
  console.log('Workers:    6');
  console.log('Holidays:   9');
  console.log('Absences:   5');
  console.log('Assignments:6 (with AP distribution)');
  console.log('══════════════════════════════════════════');
}

main().catch(e => console.error('FATAL:', e));
