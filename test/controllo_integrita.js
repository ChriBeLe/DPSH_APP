// CONTROLLO DI INTEGRITÀ (Fase 1, punto 4).
//
// verificaIntegrita guarda i dati e dice cosa non torna: intervalli non contigui o disordinati,
// colpi non interi o negativi, id doppi, foto e strati citati che non esistono. Segnala e NON
// corregge, salvo pochi casi banali e sicuri, che corregge e registra. Gira dopo il caricamento
// (avviso una volta sola per le stesse anomalie), prima di un export (riquadro nelle finestre) e
// sui dati che arrivano con un import (riga nel messaggio finale).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const nuovo = () => JSON.parse(STATO_V0);
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

// ---- Le funzioni pure, estratte dal file come sono ----
const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');
const righe = src.split('\n');
function corpo(nome) {
  const i = righe.findIndex(r => r.startsWith('            function ' + nome + '('));
  if (i < 0) throw new Error('non trovata: ' + nome);
  for (let k = i + 1; k < righe.length; k++) if (righe[k] === '            }') return righe.slice(i, k + 1).join('\n');
}
const NOMI = ['verificaIntegrita', 'registraCorrezioni', 'elencoAnomalie'];
const tolleranza = righe.find(r => r.includes('const TOLLERANZA_PROFONDITA_M = '));
// console muta per le sole righe informative: il registro si guarda nei dati, non nell'uscita.
const api = new Function('console', tolleranza + '\n' + NOMI.map(corpo).join('\n\n') + '\nreturn {' + NOMI.join(',') + '};')({ info() {}, warn: console.warn, log: console.log });

// Il progetto e le prove della fixture, per nome.
const PA = 'PROJ_Nard__1790450327664';
const provaDi = (stato, nr) => Object.values(stato.projects[PA].surveys).find(s => s.header.provaNr === nr);
const tipi = (esito) => esito.anomalie.map(a => a.tipo).sort().join(',');

(async () => {
  console.log('--- I dati di oggi sono puliti ---');
  {
    const stato = nuovo();
    const prima = JSON.stringify(stato);
    const esito = api.verificaIntegrita(stato);
    t('nessuna anomalia nella fixture (i 0,6000000000000001 non contano)', esito.anomalie.length === 0);
    t('e il controllo non tocca niente', JSON.stringify(stato) === prima);
  }

  console.log('--- Gli intervalli ---');
  {
    const s = nuovo(); provaDi(s, '1').logs.splice(6, 1);
    const e = api.verificaIntegrita(s);
    t('un intervallo tolto in mezzo: un buco, con le profondità', tipi(e) === 'buco' && /tra 1,20 e 1,40 m manca un intervallo/.test(e.anomalie[0].testo));
    t('e il testo dice progetto e prova', /^Nardò - Scuola Via Roma · Prova N° 1:/.test(e.anomalie[0].testo));
  }
  {
    const s = nuovo(); const logs = provaDi(s, '2').logs; [logs[3], logs[4]] = [logs[4], logs[3]];
    const e = api.verificaIntegrita(s);
    t('due intervalli scambiati: l ordine non torna', e.anomalie.some(a => a.tipo === 'sovrapposto') && e.anomalie.some(a => a.tipo === 'buco'));
  }
  {
    const s = nuovo(); const logs = provaDi(s, '2').logs;
    logs[0].colpi = -1; logs[1].colpi = 2.5; logs[2].colpi = null; logs[3].colpi = 'dodici';
    const e = api.verificaIntegrita(s);
    t('colpi negativi, decimali, assenti o non numerici: quattro anomalie', e.anomalie.filter(a => a.tipo === 'colpi').length === 4);
  }
  {
    const s = nuovo(); const logs = provaDi(s, '2').logs;
    logs[5].end = logs[5].start;
    logs[7].start = 'x';
    const e = api.verificaIntegrita(s);
    t('un intervallo di lunghezza zero', e.anomalie.some(a => a.tipo === 'intervallo-vuoto'));
    t('profondità non numeriche', e.anomalie.some(a => a.tipo === 'profondita'));
  }

  console.log('--- I casi banali: corretti e registrati, solo se richiesto ---');
  {
    const s = nuovo();
    provaDi(s, '2').logs[0].colpi = '12';
    const p2 = provaDi(s, '2');
    const sid = p2.id; p2.id = 'SBAGLIATO';
    s.projects[PA].id = 'ALTRO';
    const sB = Object.values(s.projects).find(p => p.id !== 'ALTRO');
    Object.values(sB.surveys)[0].logs = null;
    const senza = api.verificaIntegrita(JSON.parse(JSON.stringify(s)));
    t('senza correggere: segnalati come banali', senza.anomalie.length === 4 && senza.anomalie.every(a => a.banale) && senza.correzioni.length === 0);
    const e = api.verificaIntegrita(s, { correggi: true });
    t('correggendo: nessuna anomalia resta', e.anomalie.length === 0 && e.correzioni.length === 4);
    t('«12» diventa 12', p2.logs[0].colpi === 12);
    t('gli id tornano quelli delle chiavi', p2.id === sid && s.projects[PA].id === PA);
    t('l elenco degli intervalli assente diventa vuoto', Array.isArray(Object.values(sB.surveys)[0].logs));
    const dest = {};
    api.registraCorrezioni(dest, e.correzioni, 'avvio');
    t('il registro le conserva, con ora e origine', dest.registroCorrezioni.length === 4 && dest.registroCorrezioni.every(r => r.origine === 'avvio' && /^\d{4}-\d{2}-\d{2}T/.test(r.quando) && r.cosa));
    const tante = Array.from({ length: 250 }, (_, i) => ({ tipo: 'x', testo: 'n' + i }));
    api.registraCorrezioni(dest, tante, 'import');
    t('fino a 200 voci, le più recenti', dest.registroCorrezioni.length === 200 && dest.registroCorrezioni[199].cosa === 'n249');
  }

  console.log('--- Id, strati, interpretazioni ---');
  {
    const s = nuovo();
    const pB = Object.keys(s.projects).find(k => k !== PA);
    const doppia = JSON.parse(JSON.stringify(provaDi(s, '2')));
    s.projects[pB].surveys[doppia.id] = doppia;
    t('la stessa prova in due progetti', api.verificaIntegrita(s).anomalie.some(a => a.tipo === 'prova-doppia'));
  }
  {
    const s = nuovo();
    provaDi(s, '1').logs[4].lithology = 'strato_cancellato';
    s.projects[PA].strati.push(JSON.parse(JSON.stringify(s.projects[PA].strati[1])));
    const e = api.verificaIntegrita(s);
    t('un intervallo assegnato a uno strato che non c è più', e.anomalie.some(a => a.tipo === 'strato-mancante' && /intervallo n\. 5/.test(a.testo)));
    t('due strati con lo stesso id', e.anomalie.some(a => a.tipo === 'strato-doppio'));
  }
  {
    const s = nuovo();
    const tre = provaDi(s, '3');
    delete s.projects[PA].surveys[tre.id];
    t('un interpretazione la cui prova è sparita', tipi(api.verificaIntegrita(s)) === 'interpretazione-orfana');
  }
  {
    const s = nuovo(); s.currentProjectId = 'PROJ_SPARITO';
    t('il progetto aperto per ultimo che non esiste', tipi(api.verificaIntegrita(s)) === 'progetto-aperto');
    const s2 = nuovo(); s2.currentProjectId = PA; s2.currentSurveyId = 'SURV_ALTROVE';
    t('la prova aperta fuori dal suo progetto', tipi(api.verificaIntegrita(s2)) === 'prova-aperta');
  }

  console.log('--- Foto e immagini delle note ---');
  {
    const s = nuovo();
    const tutte = new Set(['photo_1790450332990', 'photo_1790450333301', 'photo_1790450354252']);
    const note = new Set(['nimg_1790450355305_4fms7']);
    t('tutte presenti: niente da dire (3 e 3B condividono una foto, ed è giusto)', api.verificaIntegrita(s, { fotoPresenti: tutte, immaginiNotePresenti: note }).anomalie.length === 0);
    const meno = new Set(tutte); meno.delete('photo_1790450354252');
    const e = api.verificaIntegrita(s, { fotoPresenti: meno, immaginiNotePresenti: new Set() });
    t('una foto sparita: segnalata in ogni prova che la cita', e.anomalie.filter(a => a.tipo === 'foto-mancante').length === 2);
    t('l immagine della nota sparita', e.anomalie.some(a => a.tipo === 'immagine-nota-mancante'));
    provaDi(s, '3').photos[0].dataUrl = 'data:image/png;base64,AAAA';
    t('una foto che porta con sé l immagine (import) conta come presente', api.verificaIntegrita(s, { fotoPresenti: meno }).anomalie.filter(a => a.tipo === 'foto-mancante').length === 1);
    t('senza l elenco delle foto, il controllo delle foto si salta', api.verificaIntegrita(nuovo()).anomalie.length === 0);
  }

  console.log('--- Dopo il caricamento: un avviso, una volta sola ---');
  {
    const s = nuovo(); provaDi(s, '1').logs.splice(6, 1);
    const conBuco = JSON.stringify(s);
    const app = await avviaApp({ stato: conBuco, idb: telefonoV0() });
    await attesa(200);
    const dlg = app.dialogo();
    t('compare l avviso «Controllo dei dati»', !!dlg && dlg.titolo === 'Controllo dei dati');
    t('con l anomalia e la promessa di non correggere', !!dlg && /manca un intervallo/.test(dlg.testo) && /Non ho corretto niente/.test(dlg.testo));
    const firma = app.w.localStorage.getItem('dpsh_integrita_segnalata');
    t('i dati non sono stati toccati', app.E('state.projects[' + JSON.stringify(PA) + '].surveys[' + JSON.stringify(provaDi(s, '1').id) + '].logs.length') === 19);
    app.chiudi();
    const app2 = await avviaApp({ stato: conBuco, idb: telefonoV0(), primaDellApp: (w) => w.localStorage.setItem('dpsh_integrita_segnalata', firma) });
    await attesa(200);
    t('riaprendo con le stesse anomalie, nessun avviso', !app2.dialogo());
    app2.chiudi();
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: conBuco, idb: telefonoV0() });
    await attesa(200);
    t('(controprova) l app di prima non diceva niente', !vecchia.dialogo());
    vecchia.chiudi();
  }
  {
    const app = await avviaApp({ stato: STATO_V0 });   // nessuna foto in IndexedDB
    await attesa(200);
    const dlg = app.dialogo();
    t('foto sparite dal dispositivo: l avviso lo dice', !!dlg && /non si trova più sul dispositivo/.test(dlg.testo));
    app.chiudi();
  }
  {
    const s = nuovo(); provaDi(s, '2').logs[3].colpi = '8';
    const app = await avviaApp({ stato: JSON.stringify(s), idb: telefonoV0() });
    await attesa(200);
    t('un caso banale: corretto nello stato', app.E('state.projects[' + JSON.stringify(PA) + '].surveys[' + JSON.stringify(provaDi(s, '2').id) + '].logs[3].colpi') === 8);
    t('registrato', app.E('state.registroCorrezioni.length') === 1 && /come testo/.test(app.E('state.registroCorrezioni[0].cosa')));
    t('senza avvisi', !app.dialogo());
    const salvato = JSON.parse(app.salvato());
    t('e salvato col registro', salvato.registroCorrezioni && salvato.registroCorrezioni.length === 1);
    app.chiudi();
  }

  console.log('--- Prima di un export ---');
  {
    const s = nuovo(); provaDi(s, '1').logs.splice(6, 1);
    const app = await avviaApp({ stato: JSON.stringify(s), idb: telefonoV0() });
    await attesa(200);
    if (app.dialogo()) clic(app, app.dialogo().ok);
    app.E('openExportModal')('project', PA);
    await attesa(200);
    const box = app.d.getElementById('integritaPrimaExport');
    t('la finestra Esporta mostra il riquadro, con l anomalia', box.style.display === 'block' && /1 anomalia/.test(box.textContent) && /manca un intervallo/.test(box.textContent));
    const pB = app.E('Object.keys(state.projects).find(k => k !== ' + JSON.stringify(PA) + ')');
    app.E('closeExportModal()');
    app.E('openExportModal')('project', pB);
    await attesa(200);
    t('su un progetto pulito il riquadro non c è', box.style.display === 'none');
    app.E('closeExportModal()');
    app.E('openBackupChoiceModal')({ type: 'global' });
    await attesa(200);
    const boxB = app.d.getElementById('integritaPrimaBackup');
    t('anche la scelta del formato del backup completo', boxB.style.display === 'block' && /manca un intervallo/.test(boxB.textContent));
    app.chiudi();
  }

  console.log('--- Su un import ---');
  {
    const app = await avviaApp({ stato: null });
    const progetto = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.json'), 'utf8'));
    Object.values(progetto.surveys)[1].logs.splice(2, 1);
    Object.values(progetto.surveys)[1].logs[0].colpi = '4';
    const r = app.E('importProjectsFromJSON')(progetto);
    await attesa(200);
    t('l import restituisce l anomalia vera', r.anomalie.filter(a => !a.banale).length === 1);
    t('e il caso banale lo corregge e lo registra', app.E('state.registroCorrezioni.length') === 1 && app.E('state.registroCorrezioni[0].origine') === 'import');
    t('il messaggio di fine import la elenca', /Nei dati importati c'è un'anomalia/.test(app.E('testoAnomalieImportate')(r.anomalie)) && /manca un intervallo/.test(app.E('testoAnomalieImportate')(r.anomalie)));
    app.chiudi();
  }

  // Trovato dal controllo stesso: le copie di un progetto facevano nascere anomalie.
  console.log('--- Le copie di un progetto sono pulite ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(100);
    const copia = app.E('duplicateProject(' + JSON.stringify(PA) + ')');
    const stato = JSON.parse(app.E('JSON.stringify(state)'));
    t('duplicare un progetto con una 3B non lascia anomalie', api.verificaIntegrita(stato).anomalie.length === 0);
    const tb = Object.values(stato.projects[copia].surveys).find(s => s.header.provaNr === '3B');
    t('la 3B della copia punta alla prova 3 della copia', !!tb && !!stato.projects[copia].surveys[tb.header.interpretazioneDi]
      && stato.projects[copia].surveys[tb.header.interpretazioneDi].header.provaNr === '3');
    const progetto = JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.json'), 'utf8'));
    app.E('importProjectsFromJSON')(progetto);
    await attesa(200);
    const dopo = JSON.parse(app.E('JSON.stringify(state)'));
    t('reimportare un progetto già presente (copia rinominata) non raddoppia gli id delle prove',
      Object.keys(dopo.projects).length === 4 && api.verificaIntegrita(dopo).anomalie.length === 0);
    app.chiudi();
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
    await attesa(100);
    vecchia.E('duplicateProject(' + JSON.stringify(PA) + ')');
    vecchia.E('importProjectsFromJSON')(JSON.parse(fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.json'), 'utf8')));
    await attesa(200);
    const tipiVecchi = api.verificaIntegrita(JSON.parse(vecchia.E('JSON.stringify(state)'))).anomalie.map(a => a.tipo);
    t('(controprova) nell app di prima: 3B orfana nel duplicato, prove con lo stesso id nell import',
      tipiVecchi.includes('interpretazione-orfana') && tipiVecchi.includes('prova-doppia'));
    vecchia.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
