// FOTO E COPIE DI SICUREZZA CHE DICONO LA VERITA (revisione 2026-11, B1-B4 e «Foto orfane»).
//
// Niente deve perdere una foto o un'immagine in silenzio, e una copia di sicurezza prima di un'azione
// che toglie dati deve esserci davvero:
//  - B1: importare un JSON/ZIP vecchio non sostituisce le foto già sul telefono con lo stesso id;
//  - B2: la scrittura delle immagini delle note si aspetta, e una che fallisce non è contata;
//  - «Foto orfane»: l'immagine citata solo dalla nota conservata (htmlPrimaDelMotore) non è orfana;
//  - B4: copiaPrimaDi aspetta, ritorna l'esito, e chi elimina chiede se la copia non c'è;
//  - B3: «Importa archivio» JSON non sostituisce i progetti con lo stesso id.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { creaIndexedDB } = require('./dati/idb_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const DATI = path.join(__dirname, 'dati');
const STATO_V0 = fs.readFileSync(path.join(DATI, 'stato_v0.json'), 'utf8');
const IDB_V0 = JSON.parse(fs.readFileSync(path.join(DATI, 'idb_v0.json'), 'utf8'));
const telefono = () => creaIndexedDB({ DPSH_PhotoStorageDB: IDB_V0.DPSH_PhotoStorageDB });
const fotoVere = new Map(IDB_V0.DPSH_PhotoStorageDB.stores.photos.map(r => [r.id, r.dataUrl]));
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const IMG_A = 'data:image/png;base64,AAAAAAAAAAAAAAAAAAAA';
const IMG_B = 'data:image/png;base64,BBBBBBBBBBBBBBBBBBBB';
const righe = (app, store) => ((app.idb._dump('DPSH_PhotoStorageDB') || {})[store]) || [];

(async () => {
  console.log('--- B1: un JSON vecchio non sostituisce le foto che ci sono già ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    await app.E('exportProjectJSON')(pid);
    await attesa(100);
    const fileVecchio = await app.scaricati[app.scaricati.length - 1].blob.text();
    // Dopo il backup una foto viene ritagliata: quella di qui ora è un'altra.
    const idCambiata = Array.from(fotoVere.keys())[0];
    await app.E('salvaFotoConGaranzia')(idCambiata, IMG_A);
    app.E('photoMemoryCache')[idCambiata] = IMG_A;
    const prima = righe(app, 'photos').length;
    const r = app.E('importProjectsFromJSON')(JSON.parse(fileVecchio));
    await attesa(500);
    const dopo = righe(app, 'photos');
    t('il progetto entra come copia', r.renamedCount === 1);
    t('la foto cambiata dopo il backup resta quella di qui', dopo.find(x => x.id === idCambiata).dataUrl === IMG_A);
    t('quella del file è stata scritta sotto un id nuovo', dopo.length === prima + 1 && dopo.some(x => x.id !== idCambiata && x.id.startsWith(idCambiata + '_r') && x.dataUrl === fotoVere.get(idCambiata)));
    const copia = app.E('Object.values(state.projects).find(p => /Importato/.test(p.name))');
    const idNellaCopia = app.E('(p) => Object.values(p.surveys).flatMap(s => (s.photos || []).map(f => f.id))')(copia);
    t('la copia punta alla foto nuova, non a quella di qui', idNellaCopia.some(i => i.startsWith(idCambiata + '_r')) && !idNellaCopia.includes(idCambiata));
    t('l originale punta ancora alla sua foto', app.E('(id) => Object.values(state.projects[id].surveys).some(s => (s.photos || []).some(f => f.id === ' + JSON.stringify(idCambiata) + '))')(pid));
    t('le foto uguali non si riscrivono (nessun id nuovo in più)', dopo.length === prima + 1);
    t('l id nuovo è salvato nell archivio dell app', JSON.parse(app.salvato()).projects && Object.values(JSON.parse(app.salvato()).projects).some(p => /Importato/.test(p.name) && Object.values(p.surveys).some(s => (s.photos || []).some(f => f.id.startsWith(idCambiata + '_r')))));
    t('nessun avviso di foto non salvate', !app.dialogo());
    app.chiudi();
  }

  console.log('--- B2: immagine della nota che non si scrive ---');
  {
    const progetto = () => ({ id: 'P_NOTA', name: 'Con nota', surveys: {}, notes: { html: `<p>x</p><img data-note-img-id="N_NUOVA" src="${IMG_A}">` } });
    const app = await avviaApp({ stato: null });
    app.idb._guasto = { scritture: true };
    const r = app.E('salvaImmaginiImportate')(progetto(), []);
    const fine = await r.conclusione;
    t('con lo spazio esaurito la scrittura fallisce e non è contata', fine.ripristinate === 0 && fine.fallite.length === 1 && fine.fallite[0].id === 'N_NUOVA');
    t('(l immagine non è in IndexedDB)', righe(app, 'noteImages').length === 0);
    app.idb._guasto = {};
    const r2 = await app.E('salvaImmaginiImportate')(progetto(), []).conclusione;
    t('senza guasto è contata e scritta', r2.ripristinate === 1 && r2.fallite.length === 0 && righe(app, 'noteImages').some(x => x.id === 'N_NUOVA' && x.dataUrl === IMG_A));
    app.chiudi();

    // Fino in fondo: l import avvisa l utente, che può salvare l immagine nei Download.
    const app2 = await avviaApp({ stato: null });
    app2.idb._guasto = { scritture: true };
    app2.E('importProjectsFromJSON')(JSON.parse(JSON.stringify({ projects: { P_NOTA: progetto() } })));
    await attesa(600);
    const d = app2.dialogo();
    t('l import avvisa che un immagine non è stata salvata', !!d && /non è stato possibile salvare/i.test(d.testo));
    app2.chiudi();

    // E l immagine inserita a mano nella nota: la scrittura ritorna l esito.
    const app3 = await avviaApp({ stato: null });
    app3.idb._guasto = { scritture: true };
    t('saveNoteImageToIDB ritorna false se non scrive', (await app3.E('saveNoteImageToIDB')('X', IMG_A)) === false);
    app3.idb._guasto = {};
    t('e true se scrive', (await app3.E('saveNoteImageToIDB')('X', IMG_A)) === true);
    app3.chiudi();
  }

  console.log('--- Foto orfane: l immagine della nota conservata non è orfana ---');
  {
    const idb = creaIndexedDB({ DPSH_PhotoStorageDB: { version: 2, stores: { photos: [], noteImages: [
      { id: 'N_ORIG', dataUrl: IMG_A }, { id: 'N_VERA_ORFANA', dataUrl: IMG_B }, { id: 'N_NUOVA', dataUrl: IMG_B }] } } });
    const app = await avviaApp({ stato: null, idb });
    app.E(`state.projects.P1 = { id: 'P1', name: 'Nota convertita', surveys: {}, notes: {
      html: '<p>nuova</p><img data-note-img-id="N_NUOVA" src="">',
      htmlPrimaDelMotore: '<p>vecchia</p><img data-note-img-id="N_ORIG" src="">' } }`);
    const vive = app.E('idImmaginiNoteAncoraInUso')();
    t('l immagine della nota originale conservata conta come in uso', vive.has('N_ORIG') && vive.has('N_NUOVA') && !vive.has('N_VERA_ORFANA'));
    const spazio = await app.E('calcolaSpazioOccupato')();
    t('«Foto orfane» propone solo quella davvero orfana', spazio.orfaneNoteIds.length === 1 && spazio.orfaneNoteIds[0] === 'N_VERA_ORFANA');
    const riassunto = app.E('riassuntoStatoPerCopia')(JSON.parse(app.E('JSON.stringify(state)')));
    t('le copie automatiche proteggono anche quell immagine', riassunto.note.includes('N_ORIG') && riassunto.note.includes('N_NUOVA'));
    app.chiudi();
  }

  console.log('--- B4: copiaPrimaDi aspetta e dice com è andata ---');
  {
    // Subito dopo l avvio le copie non sono pronte: prima si aspetta, poi si scrive.
    const app = await avviaApp({ stato: STATO_V0, idb: telefono(), attesaAvvio: 0 });
    t('(le copie non sono ancora pronte)', app.E('copieAutomatiche.pronto') === false);
    // Uno stato diverso da quello già copiato all'avvio, così la copia va scritta davvero.
    app.w.localStorage.setItem('dpsh_app_state', STATO_V0 + ' ');
    const esito = await app.E('copiaPrimaDi')('provare');
    t('ritorna true, e la copia «prima di provare» c\'è davvero', esito === true && app.E('copieAutomatiche.pronto') === true
      && (app.idb._dump('DPSH_CopieAutomatiche').indice || []).some(v => v.motivo === 'prima di provare'));
    app.chiudi();
  }
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    app.E(`state.projects[${JSON.stringify(pid)}].name = 'Cambiato ' + Date.now(); saveState()`);
    app.idb._guasto = { scritture: true };
    t('con la scrittura che fallisce copiaPrimaDi ritorna false', (await app.E('copiaPrimaDi')('provare 2')) === false);

    // Eliminare il progetto: l app chiede, e se si rifiuta non parte.
    app.E(`state.projects[${JSON.stringify(pid)}].name = 'Cambiato ancora'; saveState()`);
    const eliminazione = app.E('performDeleteProject')(pid, null);
    await attesa(400);
    const d = app.dialogo();
    t('chiede se procedere senza copia', !!d && /Non sono riuscito a fare la copia di sicurezza/.test(d.testo) && /Procedo lo stesso\?/.test(d.testo));
    clic(app, d && d.annulla);
    await eliminazione;
    await attesa(800);
    t('rifiutando, il progetto resta', app.E(`!!state.projects[${JSON.stringify(pid)}]`) === true);

    app.E(`state.projects[${JSON.stringify(pid)}].name = 'Cambiato la terza'; saveState()`);
    const el2 = app.E('performDeleteProject')(pid, null);
    await attesa(400);
    clic(app, app.dialogo() && app.dialogo().ok);
    await el2;
    await attesa(800);
    t('accettando, procede lo stesso', app.E(`!state.projects[${JSON.stringify(pid)}]`) === true);
    app.chiudi();
  }
  {
    // Con la copia riuscita non chiede niente.
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    app.E(`state.projects[${JSON.stringify(pid)}].name = 'Cambiato ' + Date.now(); saveState()`);
    const el = app.E('performDeleteProject')(pid, null);
    await attesa(400);
    t('con la copia riuscita non chiede nulla', !app.dialogo());
    await el;
    await attesa(800);
    t('e il progetto è eliminato', app.E(`!state.projects[${JSON.stringify(pid)}]`) === true);
    t('con una copia «prima di eliminare» in archivio', app.E('copieAutomatiche.indice.some(v => /prima di eliminare il progetto/.test(v.motivo))'));
    app.chiudi();
  }

  console.log('--- B3: Importa archivio JSON non sostituisce i progetti con lo stesso id ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const pid = app.E('Object.keys(state.projects)[0]');
    const quanti = app.E('Object.keys(state.projects).length');
    await app.E('exportGlobalJSONBackup()');
    await attesa(100);
    const archivio = await app.scaricati[app.scaricati.length - 1].blob.text();
    // Dopo il backup il progetto di qui cambia: se l import lo sostituisse, si perderebbe.
    app.E(`state.projects[${JSON.stringify(pid)}].name = 'ORIGINALE DI QUI'; saveState()`);
    app.E('importGlobalJSONBackup')(new app.w.File([archivio], 'archivio.json'));
    await attesa(400);
    t('il testo della conferma promette di non cancellare', !!app.dialogo() && /senza cancellare/.test(app.dialogo().testo));
    clic(app, app.dialogo().ok);
    await attesa(800);
    const nomi = app.E('Object.values(state.projects).map(p => p.name)');
    t('il progetto di qui è rimasto intatto', app.E(`state.projects[${JSON.stringify(pid)}].name`) === 'ORIGINALE DI QUI');
    t('e il progetto del file è entrato come copia', Object.keys(JSON.parse(app.salvato()).projects).length === 2 * quanti && nomi.filter(n => /\(Importato\)/.test(n)).length === quanti);
    t('con id propri', app.E('Object.entries(state.projects).every(([k, p]) => p.id === k || !p.id)'));
    app.chiudi();

    // Un id «__proto__» (lecito in JSON) non cambia il prototipo dell elenco dei progetti.
    const app2 = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const obj = JSON.parse(archivio);
    const contenitore = obj.state || obj;
    const nuovi = JSON.parse('{"__proto__":null}');
    nuovi['__proto__'] = contenitore.projects[pid];
    contenitore.projects = nuovi;
    const testo = JSON.stringify(obj);
    t('(il file di prova contiene davvero «__proto__»)', /"__proto__"/.test(testo));
    app2.E('importGlobalJSONBackup')(new app2.w.File([testo], 'archivio.json'));
    await attesa(400);
    clic(app2, app2.dialogo() && app2.dialogo().ok);
    await attesa(800);
    t('l elenco dei progetti ha ancora il suo prototipo', app2.E('Object.getPrototypeOf(state.projects) === Object.prototype'));
    t('e il progetto è entrato con un id normale',app2.E('Object.keys(state.projects).length') === 3 && app2.E('Object.keys(state.projects).every(k => k !== "__proto__")'));
    app2.chiudi();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
