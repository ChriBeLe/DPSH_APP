// SALVATAGGIO LEGGERO (prestazioni, Passo 1).
//
// saveState clonava l'intero stato (foto, carte intestate, DTM) a ogni tocco, e rianalizzava con
// DOMParser la nota di ogni progetto anche se non era cambiata. Ora fa copie superficiali dei soli
// rami da ripulire e ricorda il risultato per ogni testo di nota. Il formato NON cambia: il testo
// scritto in localStorage deve restare identico, byte per byte, a quello che scriveva il codice di
// prima. Qui il codice di prima è riscritto come funzione di riferimento e confrontato sullo stesso
// stato; la controprova gira sull'originale in riferimento/ (o su un dist passato come argomento) e mostra che (b) e (c) mordono.
//
//   node test/salvataggio_leggero.js [dist_di_confronto]
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
// Il codice di prima: l'originale in riferimento/ (stesso saveState), o un dist passato a mano.
const DIST_VECCHIO = process.argv[2] || process.env.DIST_VECCHIO || RIFERIMENTO;

const grande = (n) => 'data:image/jpeg;base64,' + 'QUJD'.repeat(n);

// Il corpo del vecchio saveState, da «clone dello stato» a «testo da scrivere», parola per parola.
const RIFERIMENTO_VECCHIO = `(function () {
    const cleanState = JSON.parse(JSON.stringify(state));
    if (cleanState.photos && cleanState.photos.length > 0) {
        cleanState.photos.forEach(p => { if (p.dataUrl) { photoMemoryCache[p.id] = p.dataUrl; delete p.dataUrl; } });
    }
    if (cleanState.projects) {
        Object.keys(cleanState.projects).forEach(pid => {
            const proj = cleanState.projects[pid];
            if (proj.surveys) {
                Object.keys(proj.surveys).forEach(sid => {
                    if (proj.surveys[sid].photos) {
                        proj.surveys[sid].photos.forEach(p => { if (p.dataUrl) { photoMemoryCache[p.id] = p.dataUrl; delete p.dataUrl; } });
                    }
                });
            }
            if (proj.notes && proj.notes.html) proj.notes.html = stripNoteImagesHtml(proj.notes.html);
            if (proj.notes && proj.notes.htmlPrimaDelMotore) proj.notes.htmlPrimaDelMotore = stripNoteImagesHtml(proj.notes.htmlPrimaDelMotore);
        });
    }
    return JSON.stringify(cleanState);
})()`;

// Uno stato ricco: foto con immagine nella prova aperta e in una prova di un altro progetto
// (come le lascia un import), una nota con un'immagine incorporata, carta intestata, DTM.
function riempi(app) {
  app.E(`(function () {
    const grande = (n) => 'data:image/jpeg;base64,' + 'QUJD'.repeat(n);
    const pids = Object.keys(state.projects);
    const proj = state.projects[state.currentProjectId];
    state.photos = [
      { id: 'PH_T1', timestamp: 111, lat: 40.1, lng: 18.2, dataUrl: grande(500) },
      { id: 'PH_T2', timestamp: 222, name: 'senza immagine' }
    ];
    const altro = state.projects[pids.find(p => p !== state.currentProjectId)];
    const sid = Object.keys(altro.surveys)[0];
    altro.surveys[sid].photos = [{ id: 'PH_T3', timestamp: 333, dataUrl: grande(300) }];
    proj.notes = proj.notes || {};
    proj.notes.html = '<p>Nota con foto:<img data-note-img-id="nimg_T" src="' + grande(200) + '"></p>';
    proj.notes.htmlPrimaDelMotore = '<p>Vecchia<img data-note-img-id="nimg_V" src="' + grande(100) + '"></p>';
    const tid = Object.keys(state.reportTemplates)[0];
    state.reportTemplates[tid].cartaIntestata = { prima: grande(400), seguenti: grande(400) };
    proj.dtm = { celle: 'x'.repeat(5000), passo: 2 };
  })()`);
}

(async () => {
  console.log('--- Il testo salvato è identico a quello del codice di prima ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    riempi(app);
    app.E('saveState()');
    const nuovo = app.salvato();
    const vecchio = app.E(RIFERIMENTO_VECCHIO);
    t('lo stato ricco si salva (non vuoto, non troncato)', nuovo && nuovo.length > 1000 && !app.dialogo());
    t('testo identico byte per byte al riferimento', nuovo === vecchio);
    t('lunghezza identica', nuovo.length === vecchio.length);
    const salv = JSON.parse(nuovo);
    t('le foto salvate non hanno dataUrl (stato e progetti)', !JSON.stringify(salv.photos).includes('dataUrl') &&
      !Object.values(salv.projects).some(p => Object.values(p.surveys).some(s => JSON.stringify(s.photos).includes('dataUrl'))));
    t('la carta intestata e il DTM restano (formato invariato)', /cartaIntestata/.test(nuovo) && Object.values(salv.projects).some(p => p.dtm));
    t('lo stato in memoria non è stato toccato (foto con dataUrl ancora lì)', app.E('state.photos[0].dataUrl && state.photos[0].dataUrl.length > 1000'));

    // Casi storti: niente foto, progetti o prove strani. Non devono rompere né cambiare il testo.
    app.E('delete state.photos; saveState()');
    t('senza state.photos si salva uguale al riferimento', app.salvato() === app.E(RIFERIMENTO_VECCHIO));
    app.E(`state.photos = [];
      const p0 = state.projects[state.currentProjectId];
      p0.notes = null; saveState();`);
    t('con notes null si salva uguale al riferimento', app.salvato() === app.E(RIFERIMENTO_VECCHIO) && !app.dialogo());
    app.chiudi();
  }

  console.log('--- La copia nel progetto non porta più l immagine, ma l immagine resta raggiungibile ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    riempi(app);
    app.E('saveState()');
    const copia = app.E('state.projects[state.currentProjectId].surveys[state.currentSurveyId].photos');
    t('nella copia la foto con immagine c è, senza dataUrl', copia.length === 2 && copia[0].id === 'PH_T1' && copia[0].dataUrl === undefined && copia[0].lat === 40.1);
    t('photoMemoryCache ha l immagine (prova aperta)', app.E('photoMemoryCache["PH_T1"] && photoMemoryCache["PH_T1"].length > 1000'));
    t('photoMemoryCache ha l immagine (foto portata da un import)', app.E('photoMemoryCache["PH_T3"] && photoMemoryCache["PH_T3"].length > 1000'));
    t('e l immagine della nota è nella cache delle note', app.E('!!noteImageMemoryCache["nimg_T"] && !!noteImageMemoryCache["nimg_V"]'));
    // L'esportazione del progetto ricompone le foto da cache/IndexedDB.
    const esportato = await app.E('rehydrateProjectPhotosForExport(state.projects[state.currentProjectId])');
    const f = esportato.surveys[app.E('state.currentSurveyId')].photos[0];
    t('l esportazione ritrova l immagine anche se la copia non la porta', typeof f.dataUrl === 'string' && f.dataUrl.length > 1000);
    t('la stima del peso PDF la vede (cache)', app.E('stimaByteFotoOriginale(state.projects[state.currentProjectId].surveys[state.currentSurveyId].photos[0])') !== 1200000);
    // Cambiare prova e tornare: la galleria rilegge dalla cache.
    t('la copia nel progetto non cresce a ogni salvataggio', (() => { const a = app.salvato().length; app.E('saveState()'); return app.salvato().length === a; })());
    app.chiudi();
  }

  console.log('--- La nota non cambiata non si rianalizza ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    riempi(app);
    let chiamate = 0;
    const Vero = app.w.DOMParser;
    app.w.DOMParser = function () { chiamate++; return new Vero(); };
    app.E('saveState()');
    const primo = chiamate;
    app.E('saveState(); saveState();');
    t('al primo salvataggio la nota si analizza', primo >= 1);
    t('ai salvataggi successivi, a nota invariata, DOMParser non gira', chiamate === primo);
    app.E('state.projects[state.currentProjectId].notes.html += "<p>altro</p>"; saveState();');
    t('se la nota cambia si rianalizza', chiamate > primo);
    // Se un percorso di eliminazione toglie l'immagine dalla cache, il salvataggio con nota ricordata la rimette.
    app.E('delete noteImageMemoryCache["nimg_V"]; saveState();');
    t('la cache delle immagini si ripristina anche a risultato ricordato', app.E('!!noteImageMemoryCache["nimg_V"]'));
    app.chiudi();
  }

  console.log('--- CONTROPROVA: il codice di prima clonava le foto e rianalizzava la nota ---');
  if (!DIST_VECCHIO || !fs.existsSync(DIST_VECCHIO)) {
    console.log('  (saltata: passare il dist di main come argomento o in DIST_VECCHIO)');
  } else {
    const app = await avviaApp({ file: DIST_VECCHIO, stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    riempi(app);
    let chiamate = 0;
    const Vero = app.w.DOMParser;
    app.w.DOMParser = function () { chiamate++; return new Vero(); };
    app.E('saveState()');
    const primo = chiamate;
    app.E('saveState(); saveState();');
    t('(controprova) a nota invariata il vecchio codice rianalizzava', chiamate > primo);
    const copia = app.E('state.projects[state.currentProjectId].surveys[state.currentSurveyId].photos');
    t('(controprova) la copia nel progetto portava ancora l immagine', copia[0] && typeof copia[0].dataUrl === 'string');
    t('(controprova) il testo salvato è lo stesso (formato invariato)', (() => { const a = app.salvato(); return a === app.E(RIFERIMENTO_VECCHIO); })());
    app.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
