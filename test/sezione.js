// SEZIONE TRA LE PROVE: le prove col GPS alle distanze vere; col DTM le colonne partono dalla
// loro quota e c'è il profilo del terreno; gli strati con lo stesso nome si uniscono tra prove
// vicine, quelli che mancano si chiudono a metà. Si scarica in SVG leggibile fuori dall'app.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const idNardo = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(idNardo)}]`;
  app.E(`openProject(${JSON.stringify(idNardo)}); switchView('project')`);
  // Prova 3 prende un GPS a 60 m dalle altre, così la sezione ha tre colonne.
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  clic(app, $(app, 'btnProgettoTerreno'));
  clic(app, $(app, 'btnApriSezione'));
  const svg = () => $(app, 'graficoSezione').querySelector('svg');
  const etichette = () => [...svg().querySelectorAll('.sezione-etichetta')].map(e => e.textContent);
  t('dal Terreno si apre la sezione: tre prove col GPS, la 3B (interpretazione) spenta', $(app, 'modalSezione').classList.contains('open') && etichette().join() === 'P1,P2,P3'
    && $(app, 'proveSezione').querySelector('[aria-pressed="false"]').textContent === 'Prova 3B');
  t('senza DTM lo dice, e le quote sono dal piano campagna', /Senza DTM/.test($(app, 'notaSezione').textContent) && /m dal piano campagna/.test(svg().textContent));
  t('le prove sono in fila lungo la direzione principale, con la scala delle distanze e l\'esagerazione verticale', /esagerazione verticale ×\d/.test(svg().textContent));
  t('strati uniti tra prove vicine', svg().querySelectorAll('.sezione-unione').length > 0);

  // Col DTM (piano inclinato in gradi di genera_dtm.py) le colonne partono dalla quota vera.
  app.w.DecompressionStream = globalThis.DecompressionStream;
  const buf = fs.readFileSync(path.join(__dirname, 'dati', 'dtm', 'gradi.asc'));
  const file = new app.w.File([buf], 'gradi.asc');
  file.arrayBuffer = async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  await app.E('(f, P) => ritaglioDtmPerProgetto(f, P).then(d => { P.dtm = d; })')(file, app.E(P));
  app.E('renderSezione()');
  const quote = [...svg().querySelectorAll('.sezione-quota')].map(e => e.textContent);
  t(`col DTM: quote vere sopra le colonne (${quote.join(', ')}) e il profilo del terreno`, quote.length === 3 && quote.every(q => /^5\d,\d$/.test(q)) && /quota \(m s\.l\.m\.\)/.test(svg().textContent)
    && svg().querySelector('.sezione-terreno').getAttribute('points').split(' ').length > 10);
  t('e la nota non parla più di DTM mancante', !/Senza DTM/.test($(app, 'notaSezione').textContent));

  clic(app, $(app, 'proveSezione').querySelector('[aria-pressed="true"]'));
  t('spegnere una prova la toglie dalla sezione', etichette().join() === 'P2,P3');
  clic(app, [...$(app, 'proveSezione').querySelectorAll('button')].find(b => b.getAttribute('aria-pressed') === 'true' && b.textContent === 'Prova 2'));
  t('con una sola prova dice cosa fare', !svg() && /almeno due prove/.test($(app, 'graficoSezione').textContent) && $(app, 'btnScaricaSezione').disabled);
  app.E('apriSezione()');
  clic(app, $(app, 'btnScaricaSezione'));
  const scaricato = app.scaricati[app.scaricati.length - 1];
  const testo = scaricato && scaricato.blob ? await scaricato.blob.text() : '';
  t('si scarica in SVG, senza variabili dell\'app', !!scaricato && /Sezione_.*\.svg$/.test(scaricato.nome) && /<svg/.test(testo) && !/var\(--|currentColor/.test(testo));

  // Unioni: stesso nome unito anche con id diversi; uno strato che manca si chiude a metà.
  const u = app.E(`unioniFasce([{ nome: 'Limo' }, { nome: 'Sabbia' }, { nome: 'Ghiaia' }], [{ nome: 'limo' }, { nome: 'Ghiaia' }])`);
  t('unioni senza incroci: Limo↔limo, Ghiaia↔Ghiaia, Sabbia si chiude', JSON.stringify(u) === JSON.stringify({ coppie: [[0, 0], [2, 1]], soloA: [1], soloB: [] }));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
