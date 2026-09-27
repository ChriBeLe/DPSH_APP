// VISTA 3D: col DTM, terreno ombreggiato e colonne delle prove col GPS; si gira con le frecce (e
// trascinando), l'esagerazione cambia la figura; il nord ruota con la vista. Senza DTM il bottone
// è spento e la vista dice cosa serve. Si scarica in SVG.
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
  clic(app, $(app, 'btnProgettoTerreno'));
  t('senza DTM il bottone «Vista 3D» è spento, e dice perché', $(app, 'btnApriVista3d').disabled && /Serve un DTM/.test($(app, 'btnApriVista3d').title));
  app.E('apriVista3d()');
  t('(e la vista, se aperta dalla palette, dice cosa serve)', /serve un DTM/.test($(app, 'graficoVista3d').textContent));

  const buf = fs.readFileSync(path.join(__dirname, 'dati', 'dtm', 'utm33_lzw_pred3.tif'));
  const file = new app.w.File([buf], 'dtm.tif');
  file.arrayBuffer = async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  await app.E('(f, P) => ritaglioDtmPerProgetto(f, P).then(d => { P.dtm = d; })')(file, app.E(P));
  app.E('apriTerreno()');
  t('col DTM il bottone si accende', !$(app, 'btnApriVista3d').disabled);
  clic(app, $(app, 'btnApriVista3d'));
  const svg = () => $(app, 'graficoVista3d').querySelector('svg');
  const nQuad = svg().querySelectorAll('.vista3d-terreno polygon').length;
  const prove = [...svg().querySelectorAll('.vista3d-prova text')].map(e => e.textContent).sort();
  t(`il terreno è una superficie (${nQuad} facce) con le colonne delle prove col GPS (${prove.join(', ')})`, nQuad > 300 && prove.join() === 'P1,P2');
  const colori = new Set([...svg().querySelectorAll('.vista3d-terreno polygon')].map(p => p.getAttribute('fill')));
  t('ombreggiato e colorato per quota (tanti colori, non uno)', colori.size > 20);
  const prima = svg().querySelector('.vista3d-nord line').getAttribute('x2');
  $(app, 'graficoVista3d').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  t('→ gira la vista (il nord si sposta)', svg().querySelector('.vista3d-nord line').getAttribute('x2') !== prima);
  const testoEsag = () => svg().lastElementChild.previousElementSibling.textContent;
  const r = $(app, 'rngEsag3d'); r.value = '12'; r.dispatchEvent(new app.w.Event('input'));
  await attesa(60);
  app.E('renderVista3d()');
  t('l\'esagerazione verticale si sceglie ed è scritta nella figura', /×12/.test(svg().textContent) && $(app, 'lblEsag3d').textContent === '×12');
  clic(app, $(app, 'btnScaricaVista3d'));
  const sc = app.scaricati[app.scaricati.length - 1];
  const testo = sc && sc.blob ? await sc.blob.text() : '';
  t('si scarica in SVG, senza variabili dell\'app', /Vista3D_.*\.svg$/.test(sc && sc.nome) && /<svg/.test(testo) && !/var\(--|currentColor/.test(testo));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
