// SEZIONE TRA LE PROVE: le prove col GPS alle distanze vere; col DTM le colonne partono dalla
// loro quota e c'è il profilo del terreno; gli strati con lo stesso nome si collegano anche
// passando sotto le prove più corte, e si chiudono a metà se una prova li ha attraversati senza
// trovarli. Esagerazione e scala orizzontale regolabili; correlazioni, etichette, scale e grafico
// dei colpi spegnibili; clic su una colonna: il fumetto della prova, bloccabile. Si scarica in SVG.
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
  t('dal Terreno si apre la sezione: tre prove col GPS, la 3B (interpretazione) spenta', $(app, 'modalSezione').classList.contains('open') && etichette().join() === 'DPSH 1,DPSH 2,DPSH 3'
    && $(app, 'proveSezione').querySelector('[aria-pressed="false"]').textContent === 'DPSH 3B');
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
  t('spegnere una prova la toglie dalla sezione', etichette().join() === 'DPSH 2,DPSH 3');
  clic(app, [...$(app, 'proveSezione').querySelectorAll('button')].find(b => b.getAttribute('aria-pressed') === 'true' && b.textContent === 'DPSH 2'));
  t('con una sola prova dice cosa fare', !svg() && /almeno due prove/.test($(app, 'graficoSezione').textContent) && $(app, 'btnScaricaSezione').disabled);
  app.E('apriSezione()');
  clic(app, $(app, 'btnScaricaSezione'));
  const scaricato = app.scaricati[app.scaricati.length - 1];
  const testo = scaricato && scaricato.blob ? await scaricato.blob.text() : '';
  t('si scarica in SVG, senza variabili dell\'app', !!scaricato && /Sezione_.*\.svg$/.test(scaricato.nome) && /<svg/.test(testo) && !/var\(--|currentColor/.test(testo));

  // Opzioni, cursori e fumetto, sulla sezione intera.
  const conta = sel => svg().querySelectorAll(sel).length;
  t('di partenza: correlazioni, etichette lungo i profili, scale delle prove e grafico dei colpi', conta('.sezione-unione') > 0 && conta('.sezione-etichetta-strato') > 0 && conta('.sezione-scala') > 0 && conta('.sezione-grafico') === 3);
  const opz = n => $(app, 'opzioniSezione').querySelector(`[data-opzione="${n}"]`);
  clic(app, opz('correlazioni'));
  t('«Correlazioni» spento: niente colori proiettati né etichette (e il bottone Etichette si spegne)', conta('.sezione-unione') === 0 && conta('.sezione-etichetta-strato') === 0 && opz('etichette').disabled);
  clic(app, opz('correlazioni')); clic(app, opz('scale')); clic(app, opz('grafico'));
  t('scale e grafico si spengono', conta('.sezione-scala') === 0 && conta('.sezione-grafico') === 0 && conta('.sezione-unione') > 0);
  clic(app, opz('scale')); clic(app, opz('grafico'));
  const esag = () => svg().querySelector('.sezione-didascalia').textContent.match(/×([\d,]+)/)[1];
  const r = $(app, 'rngEsagSezione'); r.value = '20'; r.dispatchEvent(new app.w.Event('input'));
  app.E('renderSezione()');
  t('l\'esagerazione verticale si sceglie (×20) ed è scritta', esag() === '20' && $(app, 'lblEsagSezione').textContent === '×20');
  clic(app, $(app, 'btnEsagAutoSezione'));
  t('«Auto» la rimette automatica', $(app, 'lblEsagSezione').textContent === 'auto' && esag() !== '20');
  const h = $(app, 'rngScalaHSezione'); h.value = '3'; h.dispatchEvent(new app.w.Event('input'));
  app.E('renderSezione()');
  t('la scala orizzontale allarga il disegno (×3), che scorre', svg().getAttribute('width') === String(Math.round(1000 * 3)) && $(app, 'lblScalaHSezione').textContent === '×3');
  h.value = '1'; h.dispatchEvent(new app.w.Event('input')); app.E('renderSezione()');

  const colonna = svg().querySelector('.sezione-colonna');
  colonna.querySelector('rect').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: 300, clientY: 200 }));
  const fumetto = () => app.d.querySelector('.fumetto-prova');
  t('clic su una colonna: il fumetto con nome, grafico e dati della prova', !!fumetto() && /^DPSH \d/.test(fumetto().querySelector('.fumetto-testa strong').textContent) && !!fumetto().querySelector('svg path') && /Profondità/.test(fumetto().textContent));
  clic(app, $(app, 'notaSezione'));
  t('un clic altrove lo chiude', !fumetto());
  colonna.querySelector('rect').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: 300, clientY: 200 }));
  clic(app, fumetto().querySelector('.fumetto-blocca'));
  clic(app, $(app, 'notaSezione'));
  t('bloccato, resta', !!fumetto() && fumetto().classList.contains('bloccato'));
  app.E('closeAnyOpenModal()');
  await attesa(20);
  t('chiusa la finestra, via anche i fumetti', !fumetto());

  // Il collegamento degli strati, su prove sintetiche: A e C hanno la sabbia; B, in mezzo, si è
  // fermata prima (la sabbia le passa sotto) oppure è scesa senza trovarla (la sabbia si chiude).
  const F = (nome, da, a) => ({ nome, da, a, colore: '#000' });
  const prova = (d, fasce) => ({ d, z: 0, fondo: Math.max(...fasce.map(f => f.a)), fasce });
  const A = prova(0, [F('Limo', 0, 1), F('Sabbia', 1, 3)]), C = prova(20, [F('limo', 0, 1), F('Sabbia', 1, 4)]);
  const sotto = app.E('correlazioniSezione')([A, prova(10, [F('Limo', 0, 1)]), C]);
  const coppie = c => c.tratti.map(x => `${x.fa.nome}:${x.a}-${x.b}`).sort().join(' ');
  t(`la sabbia passa sotto la prova corta (${coppie(sotto)})`, coppie(sotto) === 'Limo:0-1 Limo:1-2 Sabbia:0-2');
  t('(e non è incerta)', sotto.tratti.every(x => x.contro === null));
  const chiusa = app.E('correlazioniSezione')([A, prova(10, [F('Limo', 0, 1), F('Ghiaia', 1, 4)]), C]);
  const sabbia = chiusa.tratti.find(x => x.fa.nome === 'Sabbia');
  t('se la prova in mezzo l\'ha attraversata senza trovarla, resta collegata ma incerta (dice quale prova)', !!sabbia && sabbia.contro === 1);
  const sola = app.E('correlazioniSezione')([prova(0, [F('Limo', 0, 1), F('Torba', 1, 2)]), prova(10, [F('Limo', 0, 2)])]);
  t('uno strato senza seguito si chiude a metà strada', sola.chiusure.length === 1 && sola.chiusure[0].f.nome === 'Torba' && sola.chiusure[0].verso === 1);

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
