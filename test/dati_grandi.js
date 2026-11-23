// DATI GRANDI FUORI DA LOCALSTORAGE (prestazioni, passo 2).
//
// Carte intestate, DTM e ogni stringa da 64 KB in su escono dal testo salvato in localStorage e
// vanno in IndexedDB (DPSH_DatiGrandi); nel testo resta «dpsh-grande:<id>». In memoria niente cambia.
// Qui si verifica l'ordine che non perde niente (prima il dato, poi il riferimento), la lettura
// all'avvio, il riferimento che non si trova, IndexedDB che non scrive, il formato dei dati che resta 4 (compatibilità con le app di prima) e,
// come controprova, che il codice di prima lascia le stringhe grandi dentro il testo.
//
//   node test/dati_grandi.js [dist_di_confronto]
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execSync } = require('child_process');
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
    t('versione dei dati 4 nel testo salvato anche con i riferimenti', JSON.parse(app.salvato()).versioneSchema === 4);
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

  console.log('--- (e) Il formato resta 4 ---');
  {
    const v4 = JSON.parse(STATO_V0);
    v4.versioneSchema = 4;
    const app = await avviaApp({ stato: JSON.stringify(v4), idb: telefonoV0() });
    await attesa(400);
    t('i dati del formato 4 si caricano', app.E('Object.keys(state.projects).length') === Object.keys(v4.projects).length);
    t('nessuna migrazione: 4 è già la forma attuale', !app.E('caricamentoDati.migrazione'));
    app.E('saveState()');
    t('il testo salvato dichiara il formato 4', JSON.parse(app.salvato()).versioneSchema === 4);
    t('registro: 4 è la versione scritta, 5 la massima letta, 4 migrazioni', app.E('VERSIONE_SCHEMA_DATI') === 4 && app.E('VERSIONE_SCHEMA_LETTA') === 5 && app.E('MIGRAZIONI_DATI.length') === 4);
    app.chiudi();
  }
  {
    // Dati scritti come 5 nelle ore in cui l'app ha avuto quel numero: si leggono e si risalvano come 4.
    const v5 = JSON.parse(STATO_V0);
    v5.versioneSchema = 5;
    const app = await avviaApp({ stato: JSON.stringify(v5), idb: telefonoV0() });
    await attesa(400);
    t('i dati salvati come 5 si caricano', app.E('caricamentoDati.esito') === 'ok' && app.E('Object.keys(state.projects).length') === Object.keys(v5.projects).length);
    app.E('saveState()');
    t('...e vengono salvati di nuovo come 4', JSON.parse(app.salvato()).versioneSchema === 4);
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

  console.log('--- (g) L\'export non ha riferimenti ed è formato 4 ---');
  {
    const app = await avviaApp({ stato: testoConRiferimenti, idb: idbDopo, attesaAvvio: 0 });
    await app.E('exportProjectJSON')(pid);
    await attesa(100);
    const file = await app.scaricati[app.scaricati.length - 1].blob.text();
    t('progetto esportato: versioneSchema 4', JSON.parse(file).versioneSchema === 4);
    t('progetto esportato: nessun «dpsh-grande:» e dati veri dentro', !file.includes(PREFISSO) && file.includes(QUOTE));
    app.chiudi();
  }

  console.log('--- (h) Compatibilità all\'indietro: l\'app di prima del passo 2 (fc32ce1) ---');
  {
    let vecchio = null, dir = null;
    const wt = path.join(os.tmpdir(), 'dpsh_wt_fc32ce1_' + process.pid);
    try {
      execSync(`git worktree add --detach "${wt}" fc32ce1`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' });
      dir = wt;
      execSync('python3 build.py', { cwd: wt, stdio: 'pipe' });
      vecchio = path.join(os.tmpdir(), 'DPSH_fc32ce1_' + process.pid + '.html');
      fs.copyFileSync(path.join(wt, 'dist', 'DPSH.html'), vecchio);
    } catch (e) {
      console.log('  --  saltata: non riesco a costruire fc32ce1 (' + String(e.message).split('\n')[0] + ')');
      vecchio = null;
    } finally {
      if (dir) { try { execSync(`git worktree remove --force "${dir}"`, { cwd: path.join(__dirname, '..'), stdio: 'pipe' }); } catch (e) { fs.rmSync(dir, { recursive: true, force: true }); } }
    }
    if (vecchio) {
      const app = await avviaApp({ stato: testoConRiferimenti, idb: idbDopo, file: vecchio, attesaAvvio: 0 });
      await attesa(400);
      t('l\'app di prima apre il testo con i riferimenti (niente «versione più nuova»)', app.E('caricamentoDati.esito') === 'ok');
      t('...e i progetti ci sono', app.E('Object.keys(state.projects).length') === Object.keys(JSON.parse(testoConRiferimenti).projects).length);
      app.E('saveState()');
      t('dopo un saveState il riferimento è ancora nel testo', app.salvato().includes(PREFISSO) && !app.salvato().includes(QUOTE));
      t('...e i blob in IndexedDB sono intatti', dblob(app).length === 2);
      app.chiudi();
      fs.rmSync(vecchio, { force: true });
    }
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
