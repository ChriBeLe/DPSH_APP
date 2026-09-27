// IMPRONTA E ULTIMA MODIFICA VERA (Fase 2, pezzo 004e) E MIGRAZIONE 1 → 2.
//
// Per dire quale copia di un progetto è la più recente (telefono ↔ PC) updatedAt non serve: cambia a
// ogni salvataggio, anche solo aprendo il progetto. Qui si verifica che:
//  - lo SHA-256 in JavaScript (usato quando crypto.subtle non c'è, come in un'APK) sia quello vero;
//  - proj.modificatoIl si muova SOLO quando il contenuto cambia davvero: non aprendo il progetto, non
//    cambiando tema, non salvando dieci volte; sì con un intervallo in più o un nome cambiato, anche
//    di un progetto che non è quello aperto;
//  - la migrazione 1 → 2 non inventi niente, e i dati della Fase 1 (formato 1) si carichino identici;
//  - il registro delle correzioni sappia a quale progetto si riferisce una voce.
// Controprova: l'app di prima (riferimento/) non ha nessuna data di modifica vera.
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const sha = (b) => crypto.createHash('sha256').update(b).digest('hex');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });

  console.log('--- SHA-256 in JavaScript ---');
  {
    const casi = [0, 1, 3, 55, 56, 57, 63, 64, 65, 119, 120, 127, 128, 1000, 100003];
    const giusti = casi.every(n => {
      const b = crypto.randomBytes(n);
      return app.E('sha256Byte')(new app.w.Uint8Array(b)) === sha(b);
    });
    t('uguale a quello di Node su lunghezze di confine e su 100 KB', giusti);
    t('vettore noto «abc»', app.E('sha256Testo("abc")') === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
    t('testo con accenti: UTF-8', app.E('sha256Testo("Nardò")') === sha(Buffer.from('Nardò', 'utf8')));
    const b = crypto.randomBytes(5000);
    const asincrono = await app.E('sha256Async')(new app.w.Uint8Array(b));
    t('sha256Async senza crypto.subtle ripiega su JavaScript, stesso risultato', asincrono === sha(b));
  }
  {
    // Con crypto.subtle (il browser vero): stesso risultato.
    const conSubtle = await avviaApp({ stato: null, primaDellApp(w) { Object.defineProperty(w.crypto, 'subtle', { value: crypto.webcrypto.subtle }); } });
    const b = crypto.randomBytes(70000);
    t('sha256Async con crypto.subtle: identico', await conSubtle.E('sha256Async')(new conSubtle.w.Uint8Array(b)) === sha(b));
    conSubtle.chiudi();
  }

  console.log('--- JSON canonico ---');
  t('l ordine delle chiavi non conta', app.E('jsonCanonico({b:1,a:{d:[1,{y:2,x:1}],c:null}})') === app.E('jsonCanonico({a:{c:null,d:[1,{x:1,y:2}]},b:1})'));
  t('undefined sparisce come in JSON.stringify', app.E('jsonCanonico({a:undefined,b:[undefined]})') === '{"b":[null]}');

  console.log('--- Ultima modifica vera ---');
  {
    const pids = JSON.parse(app.E('JSON.stringify(Object.keys(state.projects))'));
    const mod = () => JSON.parse(app.E('JSON.stringify(Object.values(state.projects).map(p => p.modificatoIl || null))'));
    const salvatoMod = () => Object.values(JSON.parse(app.salvato()).projects).map(p => p.modificatoIl || null);
    t('dopo la lettura dei dati nessun progetto ha una data inventata', mod().every(x => x === null));
    for (let i = 0; i < 5; i++) app.E('saveState()');
    t('salvare più volte non è modificare', mod().every(x => x === null));
    app.E('openProject')(pids[1]);
    app.E('saveState()');
    app.E('openProject')(pids[0]);
    app.E('saveState()');
    t('aprire i progetti non è modificare', mod().every(x => x === null) && salvatoMod().every(x => x === null));
    const altraProva = app.E('Object.keys(state.projects[state.currentProjectId].surveys)[1]');
    app.E('saveState(); syncProjectToActiveState(state.currentProjectId, ' + JSON.stringify(altraProva) + '); updateUI(); saveState();');
    t('passare a un altra prova non è modificare', mod().every(x => x === null));
    app.E('state.settings.darkMode = !state.settings.darkMode; state.settings.themeHue = "rame"; state.settings.haptic = false; saveState();');
    t('cambiare tema e preferenze dell app non è modificare', mod().every(x => x === null));
    app.E('state.projects[' + JSON.stringify(pids[0]) + '].updatedAt = 1; saveState();');
    t('updatedAt da solo non conta', mod().every(x => x === null));

    const prima = Date.now();
    app.d.getElementById('btnPlus').click();
    app.d.getElementById('btnPlus').click();
    app.d.getElementById('btnConfirmStepAction').click();
    await attesa(50);
    const dopo = mod();
    const quando = Date.parse(dopo[0]);
    t('un intervallo registrato col contatore sì: modificatoIl sul progetto aperto', !!dopo[0] && quando >= prima - 5 && quando <= Date.now());
    t('e solo su quello', dopo[1] === null);
    t('ed è nei dati salvati', salvatoMod()[0] === dopo[0]);
    app.E('state.projects[' + JSON.stringify(pids[1]) + '].name = "Rinominato"; saveState();');
    t('anche un progetto che non è quello aperto, se cambia, prende la sua data', !!mod()[1]);
    const n1 = mod()[1];
    await attesa(20);
    app.E('saveState()');
    t('e la data non si muove più se non cambia altro', mod()[1] === n1);
    const conNota = app.E('Object.keys(state.projects).findIndex(k => state.projects[k].notes)');
    const cartaPrima = mod()[conNota];
    app.E('Object.values(state.projects)[' + conNota + '].notes.updatedAt = 99; saveState();');
    t('l ora di salvataggio della nota non è contenuto', conNota >= 0 && mod()[conNota] === cartaPrima);
  }
  app.chiudi();

  console.log('--- Riaprendo l app: la data resta, nessuna nuova ---');
  {
    const a1 = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    a1.d.getElementById('btnPlus').click();
    a1.d.getElementById('btnConfirmStepAction').click();
    await attesa(50);
    const data = JSON.parse(a1.salvato()).projects[a1.E('state.currentProjectId')].modificatoIl;
    const testo = a1.salvato();
    a1.chiudi();
    const a2 = await avviaApp({ stato: testo, idb: telefonoV0() });
    for (let i = 0; i < 3; i++) a2.E('saveState()');
    t('la data letta è quella di prima', a2.E('state.projects[state.currentProjectId].modificatoIl') === data && !!data);
    a2.chiudi();
  }

  console.log('--- Migrazione 1 → 2 ---');
  {
    // Dati come li scriveva la Fase 1: formato 1.
    const v1 = JSON.parse(STATO_V0);
    v1.versioneSchema = 1;
    const testoV1 = JSON.stringify(v1);
    const a = await avviaApp({ stato: testoV1, idb: telefonoV0() });
    const salvato = JSON.parse(a.salvato());
    // Fase 3: la catena ora continua fino al formato attuale (2 → 3 toglie la «Modalità Espansa»
    // dalle impostazioni). Il confronto qui sotto riguarda la 1 → 2, quindi lascia fuori solo le
    // tre preferenze che la 2 → 3 cambia di proposito (vedi schema_e_migrazioni / tasto_registra).
    const V = a.E('VERSIONE_SCHEMA_DATI');
    t('i dati del formato 1 si caricano e si riscrivono nel formato attuale', salvato.versioneSchema === V && V >= 2);
    const FUORI = new Set(['updatedAt', 'expandedMode', 'compactMode', 'tastoRegistraVisibile']);
    const senza = (x) => JSON.parse(JSON.stringify(x, (k, v) => (FUORI.has(k) ? undefined : v)));
    t('con progetti, prove, intervalli, strati e note identici', JSON.stringify(senza(salvato.projects)) === JSON.stringify(senza(v1.projects)));
    t('senza nessuna data inventata', !/modificatoIl|passaggi|scattataIl/.test(JSON.stringify(salvato.projects)));
    const copie = a.idb._dump('DPSH_CopieAutomatiche');
    const voce = copie.indice.find(v => v.motivo === `prima di aggiornare i dati (formato 1 → ${V})`);
    t('con la copia «prima di aggiornare i dati (formato 1 → ' + V + ')», col testo di prima', !!voce && copie.copie.find(c => c.id === voce.id).json === testoV1);
    a.chiudi();
  }

  console.log('--- Il registro delle correzioni sa di quale progetto parla ---');
  {
    const a = await avviaApp({ stato: null });
    a.E('registraCorrezioni')(a.E('state'), [{ tipo: 'colpi-testo', testo: 'x', projId: 'P1', survId: 'S1' }, { tipo: 'altro', testo: 'y' }], 'import');
    const r = JSON.parse(a.E('JSON.stringify(state.registroCorrezioni)'));
    t('progetto e prova registrati quando ci sono', r[0].projId === 'P1' && r[0].survId === 'S1');
    t('e assenti quando non ci sono', !('projId' in r[1]));
    a.chiudi();
  }

  console.log('--- CONTROPROVA sull app di prima ---');
  {
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
    vecchia.d.getElementById('btnPlus').click();
    vecchia.d.getElementById('btnConfirmStepAction').click();
    await attesa(50);
    const p = JSON.parse(vecchia.salvato()).projects;
    t('(controprova) nessuna data di modifica vera: solo updatedAt, che si muove sempre', Object.values(p).every(x => !x.modificatoIl));
    vecchia.chiudi();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
