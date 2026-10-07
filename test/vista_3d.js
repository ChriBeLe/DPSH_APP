// VISTA 3D: col DTM, terreno ombreggiato e colonne «DPSH N»; pannelli di correlazione tra prove
// vicine, superfici di contatto con la giacitura (esatta su un piano noto), misure; ogni livello
// si spegne. Si gira con le frecce (e trascinando), l'esagerazione cambia la figura, il nord ruota.
// Clic su una colonna: il fumetto. Senza DTM le prove stanno sul piano campagna. Si scarica in SVG e in OBJ.
// Ci si arriva anche dalla sezione e dal confronto tra prove; il DTM si carica anche da qui.
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
  app.w.HTMLCanvasElement.prototype.getContext = () => null; // come un browser senza canvas
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const idNardo = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(idNardo)}]`;
  app.E(`openProject(${JSON.stringify(idNardo)}); switchView('project')`);
  clic(app, $(app, 'btnProgettoTerreno'));
  t('senza DTM il bottone «Vista 3D» è acceso, e dice che le prove partono dal piano campagna', !$(app, 'btnApriVista3d').disabled && /piano campagna/.test($(app, 'btnApriVista3d').title));
  clic(app, $(app, 'btnApriVista3d'));
  {
    const div = app.d.createElement('div'); div.innerHTML = app.E('svgDaScena(ultimaScena3d)');
    const sv = div.firstElementChild, quante = sel => sv.querySelectorAll(sel).length;
    const nomi = [...sv.querySelectorAll('.vista3d-nome')].map(e => e.textContent).sort();
    t(`senza DTM: piano campagna, colonne delle prove col GPS (${nomi.join(', ')}), pannelli e distanza`, quante('.vista3d-faccia') > 0 && nomi.join() === 'DPSH 1,DPSH 2' && quante('.vista3d-pannello') > 0 && quante('.vista3d-distanza') === 1);
    t('(e lo dice nella figura)', /senza DTM: prove tutte dal piano campagna/.test(sv.textContent));
    const obj = app.E('modelloObj(datiVista3dCorrenti).obj');
    t('(il modello OBJ si scarica lo stesso, con il piano campagna)', /o Piano_campagna/.test(obj) && /o DPSH_1/.test(obj) && /quota dal piano campagna/.test(obj));
  }
  app.E(`(() => { const S = Object.values(${P}.surveys), salvate = S.map(s => [s.header.lat, s.header.lng]); S.forEach(s => { s.header.lat = ''; s.header.lng = ''; }); apriVista3d(); S.forEach((s, i) => { [s.header.lat, s.header.lng] = salvate[i]; }); })()`);
  t('senza prove col GPS la vista dice cosa serve', /almeno una prova col GPS/.test($(app, 'graficoVista3d').textContent));

  const buf = fs.readFileSync(path.join(__dirname, 'dati', 'dtm', 'utm33_lzw_pred3.tif'));
  const file = new app.w.File([buf], 'dtm.tif');
  file.arrayBuffer = async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length);
  // Dalla sezione e dal confronto si passa al 3D.
  app.E('apriSezione()');
  clic(app, $(app, 'btnSezioneA3d'));
  t('dalla sezione, «Vista 3D» apre il 3D (e chiude la sezione)', $(app, 'modalVista3d').classList.contains('open') && !$(app, 'modalSezione').classList.contains('open'));
  t('(senza DTM la vista lo dice, e offre di caricarlo)', /carica un DTM qui sotto/.test($(app, 'notaVista3d').textContent) && $(app, 'lblCaricaDtm3d').textContent === 'Carica un DTM');
  app.E(`closeAnyOpenModal(); apriConfrontoProve(${JSON.stringify(idNardo)})`);
  clic(app, $(app, 'btnConfrontoA3d'));
  t('dal confronto tra prove, «Vista 3D» apre il 3D dello stesso progetto', $(app, 'modalVista3d').classList.contains('open') && !$(app, 'modalConfrontoProve').classList.contains('open') && app.E('vista3d.projId') === idNardo);
  // Il DTM si carica dal 3D, che si ridisegna col terreno.
  clic(app, $(app, 'btnCaricaDtm3d'));
  Object.defineProperty($(app, 'fileDtm'), 'files', { value: [file], configurable: true });
  $(app, 'fileDtm').dispatchEvent(new app.w.Event('change'));
  for (let i = 0; i < 100 && !app.E(`!!${P}.dtm`); i++) await attesa(30);
  await attesa(30);
  t('dal 3D si carica il DTM: va nel progetto e la vista resta aperta, col terreno', app.E(`!!${P}.dtm`) && $(app, 'modalVista3d').classList.contains('open') && $(app, 'notaVista3d').textContent === '' && $(app, 'lblCaricaDtm3d').textContent === 'Carica un altro DTM' && !/senza DTM/.test(app.E('svgDaScena(ultimaScena3d)')));
  app.E('apriTerreno()');
  t('col DTM il bottone si accende', !$(app, 'btnApriVista3d').disabled);
  clic(app, $(app, 'btnApriVista3d'));
  // A schermo è un canvas (qui jsdom non lo disegna: la figura si legge dalla stessa scena in SVG).
  const svg = () => { const div = app.d.createElement('div'); div.innerHTML = app.E('svgDaScena(ultimaScena3d)'); return div.firstElementChild; };
  const nQuad = svg().querySelectorAll('.vista3d-faccia').length;
  const prove = [...svg().querySelectorAll('.vista3d-nome')].map(e => e.textContent).sort();
  t(`il terreno è una superficie (${nQuad} facce) con le colonne delle prove col GPS (${prove.join(', ')})`, nQuad > 300 && prove.join() === 'DPSH 1,DPSH 2');
  const colori = new Set([...svg().querySelectorAll('.vista3d-faccia')].map(p => p.getAttribute('fill')));
  t('ombreggiato e colorato per quota (tanti colori, non uno)', colori.size > 20);
  const prima = svg().querySelector('line.vista3d-nord').getAttribute('x2');
  $(app, 'graficoVista3d').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  t('→ gira la vista (il nord si sposta)', svg().querySelector('line.vista3d-nord').getAttribute('x2') !== prima);
  const testoEsag = () => svg().lastElementChild.previousElementSibling.textContent;
  const r = $(app, 'rngEsag3d'); r.value = '12'; r.dispatchEvent(new app.w.Event('input'));
  await attesa(60);
  app.E('renderVista3d()');
  t('l\'esagerazione verticale si sceglie ed è scritta nella figura', /×12/.test(svg().textContent) && $(app, 'lblEsag3d').textContent === '×12');
  clic(app, $(app, 'btnScaricaVista3d'));
  const sc = app.scaricati[app.scaricati.length - 1];
  const testo = sc && sc.blob ? await sc.blob.text() : '';
  t('si scarica in SVG, senza variabili dell\'app', /Vista3D_.*\.svg$/.test(sc && sc.nome) && /<svg/.test(testo) && !/var\(--|currentColor/.test(testo));

  const conta = sel => svg().querySelectorAll(sel).length;
  t('con due prove: pannelli di correlazione tra loro e la distanza scritta; niente superfici (serve un triangolo)', conta('.vista3d-pannello') > 0 && conta('.vista3d-distanza') === 1 && conta('.vista3d-superficie') === 0);
  t('misure: l\'asta graduata delle quote', conta('text.vista3d-misure') >= 3);
  const livello = n => $(app, 'livelliVista3d').querySelector(`[data-livello="${n}"]`);
  clic(app, livello('terreno')); clic(app, livello('pannelli')); clic(app, livello('misure'));
  t('i livelli si spengono (terreno, pannelli, misure)', conta('.vista3d-faccia') === 0 && conta('.vista3d-pannello') === 0 && conta('.vista3d-misure') === 0 && livello('terreno').getAttribute('aria-pressed') === 'false');
  clic(app, livello('terreno')); clic(app, livello('pannelli')); clic(app, livello('misure'));
  const nome = app.E('ultimaScena3d.sopra.find(f => f.cls === "vista3d-nome")');
  t('a schermo è un canvas', !!$(app, 'graficoVista3d').querySelector('canvas'));
  $(app, 'graficoVista3d').querySelector('canvas').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: nome.x, clientY: nome.y - 5 }));
  t('clic su una prova: il suo fumetto', !!app.d.querySelector('.fumetto-prova') && /^DPSH \d/.test(app.d.querySelector('.fumetto-prova strong').textContent));

  // Con la terza prova col GPS c'è un triangolo: superfici di contatto e giaciture.
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d()');
  // Qui la DPSH 2 ha solo il terreno vegetale: nessuno strato sotterraneo è comune alle tre prove,
  // quindi nessuna superficie; i pannelli ci sono su tutti e tre i lati del triangolo.
  t('con tre prove: pannelli sui tre lati del triangolo; superfici solo per strati comuni a tutte e tre (qui nessuno)', conta('.vista3d-distanza') === 3 && conta('.vista3d-superficie') === 0);
  const n0 = app.scaricati.length;
  clic(app, $(app, 'btnScaricaObj3d'));
  const zip = app.scaricati.length > n0 ? Buffer.from(await app.scaricati[app.scaricati.length - 1].blob.arrayBuffer()).toString('latin1') : '';
  t('«Modello 3D»: uno ZIP con OBJ e MTL (terreno, colonne DPSH, pannelli)', /Modello3D_.*\.zip$/.test(app.scaricati[app.scaricati.length - 1].nome) && /modello\.obj/.test(zip) && /mtllib modello\.mtl/.test(zip) && /o Terreno/.test(zip) && /o DPSH_1/.test(zip) && /o Pannello_/.test(zip) && /newmtl/.test(zip));

  // Giacitura su un piano noto: tetto della sabbia a 99, 98, 99 m in (0,0), (10,0), (0,10):
  // scende verso est di 1 m ogni 10 → immersione 090°, inclinazione atan(0,1) = 5,71°.
  const g = app.E(`(() => {
    const F = (nome, da, a) => ({ nome, da, a, colore: '#123456' });
    const prova = (x, y, fasce) => ({ x, y, z: 100, fasce, occ: occorrenzeFasce(fasce), s: { header: { provaNr: 'x' } } });
    const d = { prove: [prova(0, 0, [F('Limo', 0, 1), F('Sabbia', 1, 3)]), prova(10, 0, [F('Limo', 0, 2), F('Sabbia', 2, 4)]), prova(0, 10, [F('Limo', 0, 1), F('Sabbia', 1, 3)])],
      triangoli: [[0, 1, 2]], lati: [[0, 1], [1, 2], [2, 0]], zSuolo: () => 100 };
    const m = modelloCorrelazione(d);
    return { sup: m.superfici.map(s => [s.f.nome, Math.round(s.immersione), +s.inclinazione.toFixed(2)]), pannelli: m.pannelli.length };
  })()`);
  t(`giacitura del tetto della sabbia: ${JSON.stringify(g.sup)} (attesa 090°/5,71°; il tetto del limo è il terreno e non conta)`, JSON.stringify(g.sup) === JSON.stringify([['Sabbia', 90, 5.71]]) && g.pannelli === 6);
  const tri = app.E('triangolaDelaunay([{x:0,y:0},{x:10,y:0},{x:0,y:10},{x:10,y:10},{x:5,y:5}])');
  t(`Delaunay: 5 punti (quadrato e centro) → 4 triangoli (${tri.length})`, tri.length === 4);
  t('(punti in fila: nessun triangolo)', app.E('triangolaDelaunay([{x:0,y:0},{x:10,y:0},{x:20,y:0}])').length === 0);

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
