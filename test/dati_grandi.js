// DATI GRANDI FUORI DA LOCALSTORAGE (prestazioni, passo 2).
//
// Carte intestate, DTM e ogni stringa da 64 KB in su escono dal testo salvato in localStorage e
// vanno in IndexedDB (DPSH_DatiGrandi); nel testo resta «dpsh-grande:<id>». In memoria niente cambia.
// Qui si verifica l'ordine che non perde niente (prima il dato, poi il riferimento), la lettura
// all'avvio, il riferimento che non si trova, IndexedDB che non scrive, la migrazione 4 → 5 e,
// come controprova, che il codice di prima lascia le stringhe grandi dentro il testo.
//
//   node test/dati_grandi.js [dist_di_confronto]
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const DIST_VECCHIO = process.argv[2] || process.env.DIST_VECCHIO || RIFERIMENTO;

// Due stringhe da ~200 KB, diverse fra loro (la carta intestata è un'immagine, il DTM un testo base64).
const CARTA = 'data:image/png;base64,' + 'QUJD'.repeat(50000);
const QUOTE = 'DTM' + 'WFla'.repeat(50000);
const PREFISSO = 'dpsh-grande:';

function riempi(app) {
  app.E(`(function () {
    const proj = state.projects[state.currentProjectId];
    const tid = Object.keys(state.reportTemplates)[0];
    state.reportTemplates[tid].cartaIntestata = { id: 'carta_T', prima: ${JSON.stringify(CARTA)} };
    proj.dtm = { passo: 2, quote: ${JSON.stringify(QUOTE)} };
  })()`);
}
const dblob = (app) => (app.idb._dump('DPSH_DatiGrandi') || { blob: [] }).blob;

(async () => {
  console.log('--- (a) Prima il dato, poi il riferimento ---');
  let testoConRiferimenti, idbDopo, pid;
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    pid = app.E('state.currentProjectId');
    riempi(app);
    app.E('saveState()');
    const primo = app.salvato();
    t('primo salvataggio: carta intestata e DTM ancora dentro il testo (il dato è al sicuro)', primo.includes(CARTA) && primo.includes(QUOTE));
    t('...e nessun riferimento ancora', !primo.includes(PREFISSO));
    await attesa(600);
    const dopo = app.salvato();
    t('scrittura confermata: i due blob sono in IndexedDB, uguali agli originali', dblob(app).length === 2 && dblob(app).some(b => b.testo === CARTA) && dblob(app).some(b => b.testo === QUOTE));
    t('il salvataggio dopo la conferma parte da solo (nessun saveState manuale)', dopo.includes(PREFISSO) && !dopo.includes(CARTA) && !dopo.includes(QUOTE));
    t('il testo salvato è molto più piccolo', dopo.length < primo.length - 350000);
    t('in memoria, carta e DTM sono ancora stringhe intere', app.E(`Object.values(state.reportTemplates).some(x => x.cartaIntestata && x.cartaIntestata.prima === ${JSON.stringify(CARTA)}) && state.projects[state.currentProjectId].dtm.quote === ${JSON.stringify(QUOTE)}`) === true);
    app.E('saveState()');
    const senzaOra = (x) => x.replace(/"updatedAt":\d+/g, '');
    t('un altro salvataggio dà lo stesso testo (a parte le ore) e non riscrive blob', senzaOra(app.salvato()) === senzaOra(dopo) && dblob(app).length === 2);
    t('versione dei dati 5 nel testo salvato', JSON.parse(app.salvato()).versioneSchema === 5);
    t('nessun avviso all\'utente', !app.dialogo());
    testoConRiferimenti = app.salvato();
    idbDopo = app.idb;
    // «Spazio occupato» mostra il peso del database
    const sp = await app.E('calcolaSpazioOccupato()');
    t('Spazio occupato: dati grandi contati', sp.grandiCount === 2 && sp.grandiBytes >= CARTA.length + QUOTE.length);
    app.chiudi();
  }

  console.log('--- (b) Riavvio: i riferimenti tornano stringhe vere ---');
  {
    const app = await avviaApp({ stato: testoConRiferimenti, idb: idbDopo, attesaAvvio: 0 });
    // Subito dopo l'avvio sono ancora riferimenti; gli export aspettano.
    t('appena avviata, lo stato porta ancora il riferimento', String(app.E('state.projects[state.currentProjectId].dtm.quote')).startsWith(PREFISSO));
    await app.E('attendiDatiGrandi()');
    t('attendiDatiGrandi risolta: DTM intero', app.E('state.projects[state.currentProjectId].dtm.quote') === QUOTE);
    t('carta intestata intera', app.E(`Object.values(state.reportTemplates).some(x => x.cartaIntestata && x.cartaIntestata.prima === ${JSON.stringify(CARTA)})`) === true);
    await attesa(300);
    t('nessun riferimento rimasto nello stato', !app.E('JSON.stringify(state)').includes(PREFISSO));
    t('rimettere le stringhe non è una modifica vera del progetto', app.E('state.projects[state.currentProjectId].modificatoIl') === JSON.parse(testoConRiferimenti).projects[pid].modificatoIl);
    t('né un passo da annullare', app.E('cronologia().indietro.length') === 0);
    t('il testo salvato dopo il riavvio porta ancora i riferimenti', app.salvato().includes(PREFISSO) && !app.salvato().includes(QUOTE));
    t('nessun avviso (nessuna anomalia)', !app.dialogo());
    await app.E('exportProjectJSON')(pid);
    await attesa(100);
    const file = await app.scaricati[app.scaricati.length - 1].blob.text();
    t('l\'export JSON del progetto contiene il DTM vero e nessun riferimento', file.includes(QUOTE) && !file.includes(PREFISSO));
    app.chiudi();
  }
  {
    // Gli export aspettano la lettura: avviati PRIMA che finisca, escono comunque con le stringhe vere.
    const app = await avviaApp({ stato: testoConRiferimenti, idb: idbDopo, attesaAvvio: 0 });
    const lavoro = app.E('exportProjectJSON')(pid);
    await lavoro;
    await attesa(100);
    const file = await app.scaricati[app.scaricati.length - 1].blob.text();
    t('export lanciato durante la lettura: stringhe vere nel file', file.includes(QUOTE) && !file.includes(PREFISSO));
    app.chiudi();
  }

  console.log('--- (c) Riferimento che in IndexedDB non c\'è ---');
  {
    const app = await avviaApp({ stato: testoConRiferimenti, idb: telefonoV0(), attesaAvvio: 0 });
    await app.E('attendiDatiGrandi()');
    await attesa(500);
    t('il riferimento resta nello stato', String(app.E('state.projects[state.currentProjectId].dtm.quote')).startsWith(PREFISSO));
    const d = app.dialogo();
    t('anomalia segnalata con l\'avviso del controllo dei dati', !!d && /Controllo dei dati/.test(d.titolo) && /immagine grande/.test(d.testo));
    app.E('saveState()');
    t('il salvataggio successivo non perde il riferimento', app.salvato().includes(PREFISSO) && JSON.parse(app.salvato()).projects[pid].dtm.quote.startsWith(PREFISSO));
    app.chiudi();
  }

  console.log('--- (d) IndexedDB non scrive: tutto resta dentro il testo ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    app.idb._guasto = { scritture: true };
    riempi(app);
    app.E('saveState()');
    await attesa(600);
    app.E('saveState()');
    const s = app.salvato();
    t('con la scrittura che fallisce restano le stringhe intere nel testo', s.includes(CARTA) && s.includes(QUOTE) && !s.includes(PREFISSO));
    t('nessun blob scritto', dblob(app).length === 0);
    t('nessun avviso né perdita', !app.dialogo() && app.E('state.projects[state.currentProjectId].dtm.quote') === QUOTE);
    app.chiudi();
  }
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    app.idb._guasto = { apertura: true };
    riempi(app);
    app.E('saveState()');
    await attesa(300);
    app.E('saveState()');
    t('con IndexedDB che non si apre: tutto inline come prima', app.salvato().includes(QUOTE) && !app.salvato().includes(PREFISSO));
    app.chiudi();
  }

  console.log('--- (e) Formato 4 → 5 ---');
  {
    const v4 = JSON.parse(STATO_V0);
    v4.versioneSchema = 4;
    const app = await avviaApp({ stato: JSON.stringify(v4), idb: telefonoV0() });
    await attesa(400);
    t('i dati del formato 4 si caricano', app.E('Object.keys(state.projects).length') === Object.keys(v4.projects).length);
    const m = app.E('caricamentoDati.migrazione');
    t('migrazione registrata 4 → 5, con descrizione', m && m.da === 4 && m.a === 5 && m.applicate.length === 1 && /dati grandi/.test(m.applicate[0].descrizione));
    app.E('saveState()');
    t('il testo salvato dichiara il formato 5', JSON.parse(app.salvato()).versioneSchema === 5);
    const copie = (app.idb._dump('DPSH_CopieAutomatiche') || { indice: [] }).indice;
    t('la copia «prima di aggiornare i dati (formato 4 → 5)» c\'è', copie.some(v => /formato 4 → 5/.test(v.motivo)));
    t('registro: 5 è la versione attuale e quella letta', app.E('VERSIONE_SCHEMA_DATI') === 5 && app.E('VERSIONE_SCHEMA_LETTA') === 5 && app.E('MIGRAZIONI_DATI.length') === 5);
    app.chiudi();
  }
  {
    const v6 = JSON.parse(STATO_V0);
    v6.versioneSchema = 6;
    const app = await avviaApp({ stato: JSON.stringify(v6), idb: telefonoV0() });
    t('dati del formato 6 (più nuovi): rifiutati, niente sovrascritto', app.E('caricamentoDati.esito') === 'piu-nuovo');
    app.chiudi();
  }

  console.log('--- (f) Controprova: il codice di prima lascia le stringhe grandi dentro ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0(), file: DIST_VECCHIO });
    await attesa(200);
    app.E(`(function () {
      const proj = state.projects[state.currentProjectId];
      proj.dtm = { passo: 2, quote: ${JSON.stringify(QUOTE)} };
    })()`);
    app.E('saveState()');
    await attesa(600);
    app.E('saveState()');
    const s = app.salvato();
    t('(riferimento) il DTM resta nel testo salvato, nessun riferimento', s.includes(QUOTE) && !s.includes(PREFISSO));
    t('(riferimento) nessun database dei dati grandi', !app.idb._dump('DPSH_DatiGrandi'));
    app.chiudi();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
