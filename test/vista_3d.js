// VISTA 3D: col DTM, terreno ombreggiato e colonne «DPSH N»; pannelli di correlazione tra prove
// vicine, superfici di contatto con la giacitura (esatta su un piano noto), misure; ogni livello
// si spegne. Si gira con le frecce (e trascinando), l'esagerazione cambia la figura, il nord ruota.
// Clic su una colonna: il fumetto. Senza DTM le prove stanno sul piano campagna. Si scarica in SVG e in OBJ.
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
  await app.E('(f, P) => ritaglioDtmPerProgetto(f, P).then(d => { P.dtm = d; })')(file, app.E(P));
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
  const rosa = () => app.d.querySelector('#bussola3d .b-rosa').getAttribute('transform');
  const prima = rosa();
  $(app, 'graficoVista3d').dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }));
  t('→ gira la vista (l\'anello della bussola gira col nord)', rosa() !== prima);
  t('a schermo il nord è la bussola; nel file scaricato è disegnato nella figura', !svg().querySelector('.vista3d-nord') && /vista3d-nord/.test(app.E('svgDaScena(scena3d(datiVista3dCorrenti, 1000, false, true))')));
  const testoEsag = () => svg().lastElementChild.previousElementSibling.textContent;
  // la riga dell'esagerazione nella bussola: premuta in fondo alla traccia va al massimo
  const premi = (sel, x) => app.d.querySelector(sel).dispatchEvent(new app.w.MouseEvent('pointerdown', { button: 0, clientX: x, bubbles: true, cancelable: true }));
  premi('#bussola3d [data-trac="esag"]', 1000);
  await attesa(60);
  app.E('renderVista3d()');
  t('l\'esagerazione verticale si sceglie nella bussola ed è scritta nella figura', /×30/.test(svg().textContent) && app.d.querySelector('#bussola3d [data-riga="esag"] .b-val').textContent === '×30');
  app.E('vista3d.ex = 12; renderVista3d()');
  clic(app, $(app, 'btnScaricaVista3d'));
  const sc = app.scaricati[app.scaricati.length - 1];
  const testo = sc && sc.blob ? await sc.blob.text() : '';
  t('si scarica in SVG, senza variabili dell\'app', /Vista3D_.*\.svg$/.test(sc && sc.nome) && /<svg/.test(testo) && !/var\(--|currentColor/.test(testo));

  const conta = sel => svg().querySelectorAll(sel).length;
  t('con due prove: pannelli di correlazione tra loro e la distanza scritta; niente superfici (serve un triangolo)', conta('.vista3d-pannello') > 0 && conta('.vista3d-distanza') === 1 && conta('.vista3d-superficie') === 0);
  t('misure: l\'asta graduata delle quote', conta('text.vista3d-misure') >= 3);
  const livello = n => $(app, 'livelliVista3d').querySelector(`[data-livello="${n}"]`);
  const spunta = n => livello(n).querySelector('input');
  clic(app, spunta('terreno')); clic(app, spunta('pannelli')); clic(app, spunta('misure'));
  t('i livelli si spengono (terreno, pannelli, misure)', conta('.vista3d-faccia') === 0 && conta('.vista3d-pannello') === 0 && conta('.vista3d-misure') === 0 && livello('terreno').getAttribute('aria-pressed') === 'false');
  clic(app, spunta('terreno')); clic(app, spunta('pannelli')); clic(app, spunta('misure'));
  const nome = app.E('ultimaScena3d.sopra.find(f => f.cls === "vista3d-nome")');
  t('a schermo è un canvas', !!$(app, 'graficoVista3d').querySelector('canvas'));
  $(app, 'graficoVista3d').querySelector('canvas').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true, clientX: nome.x, clientY: nome.y - 5 }));
  t('clic su una prova: la sua scheda (la stessa della mappa 2D)', !$(app, 'schedaProvaMappa').hidden && /Prova \d/.test($(app, 'schedaProvaMappa').textContent));

  // Con la terza prova col GPS c'è un triangolo: superfici di contatto e giaciture.
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d()');
  // Qui la DPSH 2 ha solo il terreno vegetale: nessuno strato sotterraneo è comune alle tre prove,
  // quindi nessuna superficie; i pannelli ci sono su tutti e tre i lati del triangolo.
  t('con tre prove: pannelli sui tre lati del triangolo; superfici solo per strati comuni a tutte e tre (qui nessuno)', conta('.vista3d-distanza') === 3 && conta('.vista3d-superficie') === 0);
  // La falda: con la falda in tutte e tre, la sua superficie nel triangolo e un segno su ogni colonna.
  app.E(`Object.values(${P}.surveys).forEach(s => { s.header.faldaDa = '1.5'; }); renderVista3d()`);
  t('la falda: superficie tra le prove che l\'hanno e un segno blu su ogni colonna', conta('.vista3d-falda') === 1 && conta('.vista3d-falda-segno') === 6 && !!app.d.querySelector('#livelliVista3d [data-livello="falda"]'));
  clic(app, app.d.querySelector('#livelliVista3d [data-livello="falda"] input'));
  t('(e si spegne)', conta('.vista3d-falda') === 0 && conta('.vista3d-falda-segno') === 0);
  clic(app, app.d.querySelector('#livelliVista3d [data-livello="falda"] input'));
  app.E(`Object.values(${P}.surveys).forEach(s => { s.header.faldaDa = ''; }); renderVista3d()`);
  // IL PANNELLO LIVELLI: ogni prova e ogni strato sono un livello; i gruppi si accendono e spengono interi.
  {
    const righe = sel => [...app.d.querySelectorAll('#livelliVista3d ' + sel)];
    const nomi = () => [...svg().querySelectorAll('.vista3d-nome')].map(e => e.textContent).sort().join();
    t(`gruppi: ${[...app.d.querySelectorAll('#livelliVista3d .liv-gruppo span')].map(e => e.textContent).join(', ')}`, [...app.d.querySelectorAll('#livelliVista3d .liv-gruppo span')].map(e => e.textContent).join() === 'Prove,Strati,Modello,Riferimenti,Sfondo');
    t('una riga per prova (con la profondità) e una per strato', righe('[data-prova3d]').length === 3 && righe('[data-strato3d]').length >= 2 && /m$/.test(righe('[data-prova3d]')[0].querySelector('.liv-conta').textContent));
    const colonne0 = conta('.vista3d-colonna');
    clic(app, righe('[data-prova3d]').find(r => /DPSH 2/.test(r.textContent)).querySelector('input'));
    t('spenta una prova: spariscono la sua colonna e il suo nome', conta('.vista3d-colonna') < colonne0 && nomi() === 'DPSH 1,DPSH 3' && righe('[data-prova3d]').find(r => /DPSH 2/.test(r.textContent)).classList.contains('spento'));
    clic(app, righe('[data-prova3d]').find(r => /DPSH 2/.test(r.textContent)).querySelector('input'));
    const strato = righe('[data-strato3d]')[0], nomeStrato = strato.dataset.strato3d;
    clic(app, strato.querySelector('input'));
    t(`spento uno strato («${nomeStrato}»): non c'è più nelle colonne`, ![...svg().querySelectorAll('.vista3d-colonna title')].some(e => e.textContent.endsWith(': ' + nomeStrato)) && conta('.vista3d-colonna') > 0);
    clic(app, righe('[data-strato3d]')[0].querySelector('input'));
    clic(app, app.d.querySelector('#livelliVista3d [data-gruppo3d="prove"]'));
    t('la spunta del gruppo «Prove» le spegne tutte', conta('.vista3d-colonna') === 0 && nomi() === '');
    clic(app, app.d.querySelector('#livelliVista3d [data-gruppo3d="prove"]'));
    t('(e le riaccende)', conta('.vista3d-colonna') === colonne0 && nomi() === 'DPSH 1,DPSH 2,DPSH 3');
    clic(app, app.d.querySelector('#livelliVista3d [data-apri-gruppo="strati"]'));
    t('un gruppo si richiude (e lo ricorda)', app.d.querySelector('#livelliVista3d [data-corpo="strati"]').classList.contains('chiuso') && /strati/.test(app.w.localStorage.getItem('dpsh.livelli3dGruppiChiusi')));
    clic(app, app.d.querySelector('#livelliVista3d [data-apri-gruppo="strati"]'));
    clic(app, $(app, 'btnLivelli3d'));
    t('il pannello si riduce alla sua testata', $(app, 'pannelloLivelli3d').classList.contains('red'));
    clic(app, $(app, 'btnLivelli3d'));
  }
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
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071h_vista-3d.js'), 'utf8');
    t('giaciture: simbolo col colore dello strato, scritta solo immersione/inclinazione; il nome dello strato a richiesta (spento)', /\[sf\.f\.colore, 2\.6\]/.test(src) && /\$\{vista3d\.etichette\.giaciture \? ' ' \+ sf\.f\.nome : ''\}/.test(src)
      && app.E('vista3d.etichette.giaciture') === false);
    t('e le scritte non si accavallano: una che ne coprirebbe un\'altra non si scrive', /if \(scrittaLibera\(o\[0\] \+ 8, y,/.test(src) && /if \(scrittaLibera\(m\[0\] - w \/ 2/.test(src));
  }
  const tri = app.E('triangolaDelaunay([{x:0,y:0},{x:10,y:0},{x:0,y:10},{x:10,y:10},{x:5,y:5}])');
  t(`Delaunay: 5 punti (quadrato e centro) → 4 triangoli (${tri.length})`, tri.length === 4);
  t('(punti in fila: nessun triangolo)', app.E('triangolaDelaunay([{x:0,y:0},{x:10,y:0},{x:20,y:0}])').length === 0);

  // MODELLO SOLIDO: tre prove; la sabbia c'è in A e C e manca in B (lì si assottiglia a zero).
  const so = app.E(`(() => {
    const F = (nome, da, a) => ({ nome, da, a, colore: '#123456' });
    const prova = (x, y, fasce) => ({ x, y, z: 100, fasce, fondo: Math.max(...fasce.map(f => f.a)), occ: occorrenzeFasce(fasce), s: { header: { provaNr: 'x' } } });
    const d = { prove: [prova(0, 0, [F('Limo', 0, 1), F('Sabbia', 1, 3)]), prova(10, 0, [F('Limo', 0, 2), F('Argilla', 2, 4)]), prova(0, 10, [F('Limo', 0, 1), F('Sabbia', 1, 2), F('Argilla', 2, 3)])],
      triangoli: [[0, 1, 2]], lati: [[0, 1], [1, 2], [2, 0]], zSuolo: () => NaN };
    const m = modelloSolido(d), inA = colonnaSolido(d, m, 0, 0), meta = colonnaSolido(d, m, 5, 0);
    const quadrato = ritagliaPoligono([[0, 0], [10, 0], [10, 10], [0, 10]], p => p[0] - 5);
    return { strati: m.strati.map(s => s.nome), basiB: m.basi[1], inA: inA.basi, z: inA.z, sabbiaMeta: meta.basi[1] - meta.basi[0],
      strato: stratoAProfondita(inA, 2), involucro: m.involucro.length, quadrato: quadrato.map(p => p.join(',')).join(' ') };
  })()`);
  t(`modello solido: ordine degli strati dalle colonne (${so.strati.join(', ')})`, so.strati.join() === 'Limo,Sabbia,Argilla,Non indagato');
  t('dove uno strato manca ha spessore zero, sotto il fondo «Non indagato»', so.basiB.join() === '2,2,4,4' && so.inA.join() === '1,3,3,4');
  t(`a metà strada lo spessore si interpola (${so.sabbiaMeta} m di sabbia, 2 in A e 0 in B)`, so.sabbiaMeta > 0 && so.sabbiaMeta < 2);
  t('in un punto: la quota (dalle prove, senza DTM) e lo strato a una profondità', so.z === 100 && so.strato === 1 && so.involucro === 3);
  t('il taglio di un poligono tiene la metà giusta', so.quadrato === '5,0 10,0 10,10 5,10');
  app.E('vista3d.livelli.solido = true; renderVista3d()');
  t('acceso, il corpo chiuso prende il posto di pannelli e superfici', conta('.vista3d-solido') > 0 && conta('.vista3d-pannello') === 0);
  app.E("vista3d.taglio = { dir: 'ns', pos: 0.5, lato: 1, prof: 1 }; renderVista3d()");
  t('tagliato di lato e in profondità: si vede il contorno del taglio', conta('.vista3d-solido') > 0 && conta('.vista3d-taglio') > 0);
  app.E("vista3d.livelli.solido = false; vista3d.taglio = { dir: null, pos: 0.5, lato: 1, prof: 0 }; renderVista3d()");

  // I COMANDI DELLA VISTA
  t('quattro schede: Vista, Modello e tagli, Immagine, Sezioni (i livelli stanno nel pannello sulla figura)', [...app.d.querySelectorAll('#schedeVista3d [data-scheda3d]')].map(b => b.textContent).join() === 'Vista,Modello e tagli,Immagine,Sezioni' && !!app.d.querySelector('#scenaAreaMappa #pannelloLivelli3d #livelliVista3d'));
  clic(app, app.d.querySelector('[data-scheda3d="immagine"]'));
  t('una scheda alla volta', !app.d.querySelector('[data-pannello3d="immagine"]').hidden && app.d.querySelector('[data-pannello3d="vista"]').hidden);
  clic(app, app.d.querySelector('[data-scheda3d="vista"]'));
  premi('#bussola3d [data-trac="incl"]', 1000);
  t('la traccia dell\'inclinazione porta la vista dall\'alto', Math.abs(app.E('vista3d.el') - Math.PI / 2) < 1e-9);
  premi('#bussola3d [data-trac="incl"]', -1000);
  t('e da sotto, fino a −90°', Math.abs(app.E('vista3d.el') + Math.PI / 2) < 1e-9);
  app.E('vista3d.el = Math.PI / 2; vista3d.az = Math.PI / 2; renderVista3d()');
  t('direzione di vista 90° (verso Est): l\'anello gira di −90°, l\'inclinazione dice 90°', rosa() === 'rotate(-90.00 60 60)' && app.d.querySelector('#bussola3d [data-riga="incl"] .b-val').textContent === '90°');
  const larghezza = () => { const xs = app.E('ultimaScena3d.pezzi').filter(f => f.cls === 'vista3d-faccia').flatMap(f => f.p.map(q => q[0])); return Math.max(...xs) - Math.min(...xs); };
  const senza = larghezza();
  clic(app, $(app, 'btnProspettiva3d'));
  t('la prospettiva si accende e cambia il disegno (dall\'alto, il terreno lontano rimpicciolisce)', app.E('vista3d.prospettiva') === true && Math.abs(larghezza() - senza) > 1 && /campo visivo/.test($(app, 'lblFov3d').textContent));
  clic(app, $(app, 'btnProspettiva3d'));
  t('la bussola: anello, leva, quattro tasti agli angoli, righe di zoom, inclinazione ed esagerazione', !!app.d.querySelector('#bussola3d .b-presa-anello') && !!app.d.querySelector('#bussola3d .b-pomello') && app.d.querySelectorAll('#bussola3d .b-ang').length === 4 && [...app.d.querySelectorAll('#bussola3d [data-riga]')].map(r => r.dataset.riga).join() === 'zoom,incl,esag');
  t('le viste pronte: dall\'alto, isometrica (35,26°), dai quattro lati, da sotto', app.E('Object.keys(VISTE_PRONTE_3D).join()') === 'alto,iso,nord,est,sud,ovest,sotto' && Math.abs(app.E('VISTE_PRONTE_3D.iso.el') * 180 / Math.PI - 35.264) < 0.01);
  // SPOSTARSI E GIRARE ATTORNO A LÌ: il punto spostato al centro resta al centro girando.
  {
    const testa = () => { const W = app.E('ultimaScena3d.W'), H = app.E('ultimaScena3d.H'), c = app.E('ultimaScena3d.sopra').find(f => f.cls === 'vista3d-testa' && f.prova === app.E('datiVista3dCorrenti.prove[0].s.id')); return [c.x - W / 2, c.y - H / 2]; };
    app.E('vista3d.prospettiva = false; const p0 = datiVista3dCorrenti.prove[0], d0 = datiVista3dCorrenti; vista3d.centro = [p0.x, p0.y, p0.z - (d0.zMin + d0.zMax) / 2]; renderVista3d()');
    const giri = [0.3, 1.7, -2.4].map(az => { app.E(`vista3d.az = ${az}; vista3d.el = 0.9; renderVista3d()`); return testa(); });
    t('girando, il punto attorno a cui si gira resta fermo al centro', giri.every(([x, y]) => Math.abs(x) < 0.01 && Math.abs(y) < 0.01));
    app.E('sposta3d(100, 40); renderVista3d()');
    const [x, y] = testa();
    t('trascinare col tasto destro (o centrale) porta la scena con sé, di quanto si trascina', Math.abs(x - 100) < 0.01 && Math.abs(y - 40) < 0.01);
    t('(il centrale sposta come il destro)', /sposta: e\.button === 1 \|\| e\.button === 2/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071h_vista-3d.js'), 'utf8')));
  }
  app.E('vistaIniziale3d(); renderVista3d()');

  // IMMAGINE SUL TERRENO
  const rt = app.E('(() => { const u = utmDaGeo(40.1974, 17.9912, 33), g = geoDaUtm(u.x, u.y, 33); return [g.lat, g.lng]; })()');
  t(`UTM → gradi: andata e ritorno tornano al punto (${rt.map(v => v.toFixed(7)).join(', ')})`, Math.abs(rt[0] - 40.1974) < 1e-7 && Math.abs(rt[1] - 17.9912) < 1e-7);
  const voci = [...$(app, 'selSfondo3d').querySelectorAll('optgroup')].map(g => g.label);
  t(`il menù delle immagini: ${voci.join(', ')}, più «Nessuna»`, voci.join() === 'Google,Esri,OpenStreetMap,WMS' && $(app, 'selSfondo3d').querySelector('option[value="google-satellite"]') && $(app, 'selSfondo3d').querySelector('option[value="osm"]'));
  $(app, 'selSfondo3d').value = 'esri-satellite';
  $(app, 'selSfondo3d').dispatchEvent(new app.w.Event('change'));
  t('scelta Esri satellite: si ricorda nelle impostazioni, e il terreno prende i pezzi d\'immagine', app.E('state.settings.sfondo3d.id') === 'esri-satellite' && app.E('ultimaScena3d.pezzi.some(f => f.sfondo && f.uv && f.uv.length === 3)'));
  t('le tessere chieste sono quelle di Esri, allo zoom che sta in circa 2048 pixel', app.E('datiVista3dCorrenti._sfondo.totali') > 0 && app.E('datiVista3dCorrenti._sfondo.totali') <= 81);
  t('(un cambio di immagine non tocca il progetto: è una preferenza dell\'app)', app.E("IMPOSTAZIONI_DELL_APP.has('sfondo3d')"));
  $(app, 'selSfondo3d').value = 'wms';
  $(app, 'selSfondo3d').dispatchEvent(new app.w.Event('change'));
  t('«Altro indirizzo WMS…» apre la riga per indirizzo e layer', $(app, 'rigaWms3d').style.display === '' && /Incolla l'indirizzo/.test($(app, 'lblSfondo3d').textContent));
  $(app, 'selSfondo3d').value = '';
  $(app, 'selSfondo3d').dispatchEvent(new app.w.Event('change'));
  t('«Nessuna» torna ai colori della quota', !app.E('ultimaScena3d.pezzi.some(f => f.sfondo)'));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
