// IMPORTATORE DEI DATI DEL SITO VECCHIO (074, 075 e il passaggio in 044).
//
// Su dpsh.netlify.app c'era un'altra app (docs/SITO_VECCHIO_NETLIFY.md): stessa origine, quindi nel
// localStorage restano `dpsh_autosave` e `dpsh_archives`. Qui si mette nel localStorage una prova
// vecchia d'esempio e un archivio, si avvia l'app vera e si controlla che:
//   · all'avvio chieda «Trovati dati della vecchia versione del sito. Importarli?»;
//   · le prove entrino nel formato attuale (generali, strumento, falda, intervalli [da, a, colpi]);
//   · l'autosave identico all'archivio non diventi un doppione;
//   · le voci vecchie del localStorage restino com'erano, e il segno `dpsh_import_sito_vecchio` impedisca
//     di chiedere un'altra volta;
//   · un «progetto_dpsh.json» del sito vecchio si apra dall'importazione JSON di sempre.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

const provaNardo = {
  generali: { comune: 'Nardò', localita: 'Via Roma 12', cliente: 'Rossi Srl', data: '2026-10-05', numero: '3', profMax: '1.00', coords: '40.1799, 18.0310' },
  strumento: { pesoMassa: 63.5, pesoAsta: 6.3, lunghAsta: 1.0, pesoSistema: 8.0, volata: 0.75, passo: 0.20, areaPunta: 20.0, angoloPunta: 90 },
  falda: '2,5',
  colpi: [{ prof: 0.2, n: 3 }, { prof: 0.4, n: 4 }, { prof: 0.6, n: 7 }, { prof: 0.8, n: 12 }, { prof: 1.0, n: 20 }],
  strati: [], liveBlows: 2
};
const provaLecce = {
  generali: { comune: 'Lecce', localita: '', cliente: '', data: '2026-10-06', numero: '1', profMax: '', coords: 'non leggibile' },
  strumento: { massa: 30, pesoAsta: 2.9, lunghAsta: 1.0, pesoSistema: 4.0, volata: 0.5, passo: 0.10, areaPunta: 10, angoloPunta: 90 },
  falda: '', colpi: [{ prof: 0.1, n: 2 }, { prof: 0.2, n: 5 }], strati: [], liveBlows: 0
};
const vuota = { generali: { comune: '', localita: '', cliente: '', data: '', numero: '', profMax: '', coords: '' }, strumento: {}, falda: '', colpi: [], strati: [], liveBlows: 0 };

const archivio = [
  { name: 'DPSH 3', date: '05/10/2026, 10:30:00', data: provaNardo },
  { name: 'DPSH 1', date: '06/10/2026, 09:00:00', data: provaLecce },
  { name: 'Indagine Senza Nome', date: '01/10/2026, 08:00:00', data: vuota }
];
const SEGNO = 'dpsh_import_sito_vecchio';
const copia = (o) => JSON.parse(JSON.stringify(o));

(async () => {
  console.log('--- All avvio: la domanda, poi la conversione ---');
  const voci = { dpsh_autosave: JSON.stringify(provaNardo), dpsh_archives: JSON.stringify(archivio), dpsh_sheetId: 'abc' };
  const app = await avviaApp({ stato: null, attesaAvvio: 2400, primaDellApp: w => Object.keys(voci).forEach(k => w.localStorage.setItem(k, voci[k])) });
  const E = (s) => app.E(s);
  const dlg = app.dialogo();
  t('compare il dialogo «Trovati dati della vecchia versione del sito. Importarli?»', !!dlg && /Trovati dati della vecchia versione del sito\. Importarli\?/.test(dlg.testo));
  if (dlg) dlg.ok.click();
  await app.attesa(1200);

  const progetti = Object.values(E('state.projects'));
  const comuni = progetti.map(p => p.comune).sort();
  t('due progetti: Lecce e Nardò (uno per comune)', JSON.stringify(comuni) === '["Lecce","Nardò"]');
  const prove = progetti.flatMap(p => Object.values(p.surveys));
  t('due prove sole: l\'autosave uguale all\'archivio e la prova vuota non contano', prove.length === 2);
  const nardo = prove.find(s => s.header.comune === 'Nardò') || { header: {}, instrument: {}, logs: [] };
  const lecce = prove.find(s => s.header.comune === 'Lecce') || { header: {}, instrument: {}, logs: [] };

  console.log('--- La prova di Nardò (vecchia con pesoMassa) ---');
  t('generali: cliente, località, numero, data', nardo.header.committente === 'Rossi Srl' && nardo.header.localita === 'Via Roma 12' && nardo.header.provaNr === '3' && nardo.header.date === '2026-10-05');
  t('coordinate «lat, lon» lette', nardo.header.lat === 40.1799 && nardo.header.lng === 18.031);
  t('falda dalla virgola decimale', nardo.header.faldaDa === '2.5' && nardo.header.faldaA === '2.5');
  t('strumento: massa, aste, sistema, volata, passo, punta', nardo.instrument.pesoMassa === 63.5 && nardo.instrument.pesoAsta === 6.3 && nardo.instrument.lunghAsta === 1 && nardo.instrument.pesoSistema === 8 && nardo.instrument.volata === 0.75 && nardo.instrument.passo === 0.2 && nardo.instrument.areaPunta === 20 && nardo.instrument.angoloPunta === 90);
  t('passo 20 cm nelle impostazioni', nardo.settings.stepCm === 20);
  t('cinque intervalli da 0,2 m con i colpi giusti', nardo.logs.length === 5 && nardo.logs.every((l, i) => Math.abs(l.start - i * 0.2) < 1e-9 && Math.abs(l.end - (i + 1) * 0.2) < 1e-9) && nardo.logs.map(l => l.colpi).join() === '3,4,7,12,20');
  t('asta per intervallo, e la prova riprende da 1,00 m', nardo.logs[0].asta === 1 && nardo.logs[4].asta === 1 && nardo.currentDepthStart === 1 && nardo.currentCount === 2);
  t('la prova ha gli strati iniziali e nessuna foto', Array.isArray(nardo.strati) && nardo.strati.length === 1 && nardo.photos.length === 0);

  console.log('--- La prova di Lecce (vecchia con massa, passo 10 cm, coordinate illeggibili) ---');
  t('massa → pesoMassa, passo 0,10', lecce.instrument.pesoMassa === 30 && lecce.instrument.passo === 0.1 && lecce.settings.stepCm === 10);
  t('coordinate illeggibili: nessuna posizione', lecce.header.lat === null && lecce.header.lng === null);
  t('intervalli da 0,1 m', lecce.logs.length === 2 && lecce.logs[0].start === 0 && lecce.logs[1].end === 0.2 && lecce.logs[1].colpi === 5);
  t('senza falda', lecce.header.faldaDa === '');

  console.log('--- Dati nell\'archivio come quelli di sempre ---');
  t('i progetti sono nel formato attuale (versione schema ' + E('VERSIONE_SCHEMA_DATI') + ') e passano il controllo di integrità', E('VERSIONE_SCHEMA_DATI') === 5 && E('verificaIntegrita({ projects: state.projects }, { correggi: false }).anomalie.filter(a => !a.banale).length') === 0);
  t('il salvataggio dell\'app contiene i progetti', JSON.parse(app.salvato() || '{}').projects && Object.keys(JSON.parse(app.salvato()).projects).length === 2);

  console.log('--- Le voci vecchie non si toccano, il segno c\'è ---');
  t('dpsh_autosave identico', app.w.localStorage.getItem('dpsh_autosave') === voci.dpsh_autosave);
  t('dpsh_archives identico', app.w.localStorage.getItem('dpsh_archives') === voci.dpsh_archives);
  t('dpsh_sheetId identico', app.w.localStorage.getItem('dpsh_sheetId') === 'abc');
  const segno = JSON.parse(app.w.localStorage.getItem(SEGNO) || 'null');
  t('segno dpsh_import_sito_vecchio: importato, 2 prove', !!segno && segno.esito === 'importato' && segno.prove === 2);
  t('con il segno non si chiede più', E('datiSitoVecchioDaImportare()') === false);

  console.log('--- Importare di nuovo (comando esplicito) non crea doppioni ---');
  const di = await E('importaDatiSitoVecchio({ chiedi: false })');
  t('seconda importazione: 0 prove nuove', di.importate === 0 && Object.values(E('state.projects')).flatMap(p => Object.values(p.surveys)).length === 2);

  console.log('--- «progetto_dpsh.json» del sito vecchio dall\'importazione JSON ---');
  const prima = Object.keys(E('state.projects')).length;
  const nuovaProva = copia(provaNardo); nuovaProva.generali.comune = 'Gallipoli'; nuovaProva.generali.numero = '9';
  app.w.__file = JSON.stringify(nuovaProva);
  const r = E('importProjectsFromJSON(JSON.parse(window.__file))');
  t('importProjectsFromJSON legge la forma generali + strumento + colpi', r.importedCount === 1 && Object.keys(E('state.projects')).length === prima + 1);
  const gall = Object.values(E('state.projects')).find(p => p.comune === 'Gallipoli');
  const sg = gall && Object.values(gall.surveys)[0];
  t('la prova importata dal file ha 5 intervalli e numero 9', !!sg && sg.logs.length === 5 && sg.header.provaNr === '9');
  t('un file di questa app resta com\'era (non è del sito vecchio)', E('fileDelSitoVecchioInProgetti({ projects: {}, header: {}, logs: [] })') === null);
  t('l\'elenco di voci d\'archivio {name, date, data} si riconosce', E('Object.keys(fileDelSitoVecchioInProgetti(' + JSON.stringify(archivio) + ').projects).length') === 2);

  console.log('--- Funzioni di lettura ---');
  t('coordinate: virgola decimale, punto e virgola, fuori scala', JSON.stringify(E('[coordinateSitoVecchio("40,35; 18,17"), coordinateSitoVecchio("95, 10"), coordinateSitoVecchio("")]')) === '[{"lat":40.35,"lng":18.17},null,null]');
  console.log('--- L\'assistente IA ha le due azioni ---');
  t('importa_dati_sito_vecchio e controlla_aggiornamenti_app fra gli strumenti, la prima con conferma', E("(() => { const a = AI_STRUMENTI.find(x => x.n === 'importa_dati_sito_vecchio'), b = AI_STRUMENTI.find(x => x.n === 'controlla_aggiornamenti_app'); return !!a && !!b && a.w === true && !b.w; })()") === true);
  t('«importa i dati del sito vecchio» porta con sé i due strumenti', E("aiStrumentiPer([{ r: 'u', t: 'importa i dati del sito vecchio' }]).map(x => x.n).filter(n => /sito_vecchio|aggiornamenti/.test(n)).length") === 2);
  const ag = await E("AI_STRUMENTI.find(x => x.n === 'controlla_aggiornamenti_app').run({})");
  t('senza service worker (qui, o nell\'APK) lo dice e non si rompe', ag.supportato === false && ag.nuovaVersione === false && !!ag.versione_app);
  const ai = await E("AI_STRUMENTI.find(x => x.n === 'importa_dati_sito_vecchio').run({})");
  t('lo strumento di importazione risponde con i conteggi', ai.ok === true && ai.prove_importate === 0);
  t('nessun errore in console', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('--- Rifiutare: il segno c\'è lo stesso e niente entra ---');
  const app2 = await avviaApp({ stato: null, attesaAvvio: 2400, primaDellApp: w => { w.localStorage.setItem('dpsh_autosave', voci.dpsh_autosave); } });
  const d2 = app2.dialogo();
  t('la domanda compare', !!d2);
  if (d2) d2.annulla.click();
  await app2.attesa(400);
  t('nessun progetto importato', Object.keys(app2.E('state.projects')).length === 0);
  t('segno «rifiutato»', JSON.parse(app2.w.localStorage.getItem(SEGNO) || '{}').esito === 'rifiutato');
  app2.chiudi();

  console.log('--- Senza dati vecchi: nessuna domanda ---');
  const app3 = await avviaApp({ stato: null, attesaAvvio: 2400 });
  t('nessun dialogo', !app3.dialogo());
  app3.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO eccezione: ' + (e && e.stack || e)); process.exit(1); });
