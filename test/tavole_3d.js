// LE TAVOLE DEL 3D (come l'anteprima delle tavole di HyperGram): una finestra con le pagine a sinistra
// (spunta = si esporta; Tutte / Nessuna), la pagina in mezzo che si gira e si sposta, i comandi a destra.
// Le pagine: il modello in isometria verso Nord e verso Est, poi per ogni sezione la 3D (il corpo
// tagliato lungo la traccia, guardando la faccia del taglio, A a sinistra) e la 2D. Un PDF solo
// (scritto a mano: titolo vero e figura JPEG per pagina) o immagini. Col taglio, gli spigoli del pezzo
// tolto a tratteggio; sul terreno la freccia del Nord. La mappa di base si ricarica «con permesso»
// (Google, che non lo dà, diventa Esri).
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
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  // Venti prove su una griglia ruotata: c'è il corpo solido.
  app.E(`(() => { const S = ${P}.surveys, base = Object.values(S).find(s => (s.logs || []).length > 3);
    Object.keys(S).forEach(k => delete S[k]);
    const ang = 0.6, c = Math.cos(ang), s = Math.sin(ang);
    for (let i = 0; i < 5; i++) for (let j = 0; j < 4; j++) { const id = 'g' + i + '_' + j, x = i * 40, y = j * 35;
      const sv = JSON.parse(JSON.stringify(base)); sv.id = id; sv.header.provaNr = String(i * 4 + j + 1); delete sv.header.interpretazioneDi;
      sv.header.lat = 40.1968 + (x * s + y * c) / 111000; sv.header.lng = 17.993 + (x * c - y * s) / 85000; S[id] = sv; } })()`);
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d')`);
  await attesa(50);
  app.E('vista3d.livelli.solido = true; creaGrigliaAssi3d(2, 2); renderVista3d()');

  console.log('--- Le pagine ---');
  const voci = app.E('vociEsportazione3d(datiVista3dCorrenti).map(v => v.titolo)');
  t(`prima il modello verso Nord e verso Est, poi per ogni sezione la 3D e la 2D: ${voci.join(' · ')}`,
    voci[0] === 'Modello · vista isometrica verso Nord' && voci[1] === 'Modello · vista isometrica verso Est'
    && JSON.stringify(voci.slice(2)) === JSON.stringify(["Sezione 3D A-A'", "Sezione A-A'", "Sezione 3D B-B'", "Sezione B-B'", "Sezione 3D 1-1'", "Sezione 1-1'", "Sezione 3D 2-2'", "Sezione 2-2'"]));

  console.log('--- La sezione 3D ---');
  const sez = app.E(`(() => {
    const d = datiVista3dCorrenti, v = vociEsportazione3d(d).find(v => v.titolo === "Sezione 3D A-A'"), t = tracceDelProgetto().find(x => x.id === v.traccia);
    const sc = scenaVoce3d(v, d, 1400, 860, {}), { a, b } = tracciaInScena(d, t);
    // la parte «davanti» a chi guarda: dal lato della traccia verso cui punta lo sguardo
    const ux = b[0] - a[0], uy = b[1] - a[1], lx = Math.sin(sc.vista.az), ly = Math.cos(sc.vista.az), versoSx = lx * -uy + ly * ux >= 0;
    const avanti = p => { const sx = ux * (p.y - a[1]) - uy * (p.x - a[0]); return versoSx ? sx >= -1e-6 : sx <= 1e-6; };
    const teste = new Set(sc.tutte.filter(f => f.cls === 'vista3d-testa').map(f => f.prova));
    const bb = ingombroScena3d(sc);
    const v1 = vociEsportazione3d(d).find(v => v.titolo === "Sezione 3D 1-1'");
    return { restano: d.prove.filter(p => teste.has(p.s.id)).every(avanti), tolte: d.prove.filter(p => !teste.has(p.s.id)).every(p => !avanti(p)), n: teste.size,
      versoA: versoTavola3d(v), verso1: versoTavola3d(v1), fantasma: sc.tutte.filter(f => f.cls === 'vista3d-fantasma').length, tracce: [...new Set(sc.tutte.filter(f => f.cls === 'vista3d-traccia').map(f => f.traccia))].length,
      bb, taglioDopo: JSON.stringify(vista3d.taglio), solido: sc.tutte.some(f => f.cls === 'vista3d-solido') };
  })()`);
  t(`il corpo è tagliato lungo la traccia: restano le ${sez.n} prove dalla parte verso cui si guarda (si vede la faccia del taglio)`, sez.restano && sez.tolte && sez.n > 0 && sez.n < 20 && sez.solido);
  t('come il modello: la sezione Nord–Sud (A-A\') si guarda verso Est, quella Est–Ovest (1-1\') verso Nord', sez.versoA === 1 && sez.verso1 === 0);
  t('nella sezione 3D solo la sua traccia', sez.tracce === 1);
  t(`gli spigoli del pezzo tolto, a tratteggio (${sez.fantasma} tratti)`, sez.fantasma > 10);
  t('inquadrata: il modello sta nel foglio, grande', sez.bb.x0 >= 0 && sez.bb.x1 <= 1400 && sez.bb.y0 >= 0 && sez.bb.y1 <= 860 && (sez.bb.x1 - sez.bb.x0) > 1400 * 0.6);
  t('(e la vista a schermo non se ne accorge: taglio e livelli tornano com\'erano)', sez.taglioDopo === JSON.stringify({ dir: null, pos: 0.5, lato: 1, prof: 0 }));
  t('spenti gli spigoli del pezzo tolto, niente tratteggio', app.E(`(() => { const d = datiVista3dCorrenti, v = vociEsportazione3d(d)[2]; return scenaVoce3d(v, d, 1400, 860, { fantasma: false }).tutte.filter(f => f.cls === 'vista3d-fantasma').length; })()`) === 0);
  t('senza taglio niente tratteggio (le isometriche)', app.E(`(() => { const d = datiVista3dCorrenti; return scenaVoce3d(vociEsportazione3d(d)[0], d, 1400, 860, {}).tutte.filter(f => f.cls === 'vista3d-fantasma').length; })()`) === 0);
  t('nel 3D a schermo, col taglio Nord–Sud, il tratteggio c\'è (livello «Spigoli del pezzo tagliato»)', app.E(`(() => { tagliaSullaTraccia3d(tracceDelProgetto().find(t => t.asse === 'ns')); const n = ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-fantasma').length; vista3d.taglio = { dir: null, pos: 0.5, lato: 1, prof: 0 }; renderVista3d(); return n; })()`) > 10
    && !!$(app, 'livelliVista3d').querySelector('[data-livello="fantasma"]'));

  console.log('--- Viste e Nord ---');
  const iso = app.E(`(() => { const d = datiVista3dCorrenti, v = vociEsportazione3d(d), r = [];
    [0, 1].forEach(i => { const sc = scenaVoce3d(v[i], d, 1400, 860, {}); r.push({ az: vistaBaseVoce3d(v[i], d).az, el: vistaBaseVoce3d(v[i], d).el, freccia: sc.tutte.filter(f => f.cls === 'vista3d-nord-terreno').length,
      nord: sc.tutte.filter(f => f.cls === 'vista3d-nord').length }); });
    return r; })()`);
  t('verso Nord si guarda a Nord, verso Est a Est (girati di 30°), dall\'alto di 35,26°', Math.abs(iso[0].az - Math.PI / 6) < 1e-9 && Math.abs(iso[1].az - (Math.PI / 2 + Math.PI / 6)) < 1e-9 && Math.abs(iso[0].el * 180 / Math.PI - 35.264) < 0.01);
  t('sul terreno la freccia del Nord (due metà e la N), oltre alla bussola', iso.every(x => x.freccia === 3 && x.nord > 5));
  t('(la freccia sul terreno si spegne dai Livelli)', app.E(`(() => { vista3d.livelli.nordTerreno = false; renderVista3d(); const n = ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-nord-terreno').length; vista3d.livelli.nordTerreno = true; renderVista3d(); return n; })()`) === 0
    && !!$(app, 'livelliVista3d').querySelector('[data-livello="nordTerreno"]'));
  const reg = app.E(`(() => { const d = datiVista3dCorrenti, v = vociEsportazione3d(d)[0];
    const a = ingombroScena3d(scenaVoce3d(v, d, 1400, 860, {})), b = ingombroScena3d(scenaVoce3d(v, d, 1400, 860, { reg: { zoom: 0.5 } })), c = ingombroScena3d(scenaVoce3d(v, d, 1400, 860, { reg: { dx: 100, dy: 0 } }));
    return { a: a.x1 - a.x0, b: b.x1 - b.x0, sposta: (c.x0 + c.x1) / 2 - (a.x0 + a.x1) / 2 }; })()`);
  t(`le regolazioni: zoom a metà → metà larghezza (${Math.round(reg.a)} → ${Math.round(reg.b)} px), spostata di 100 px → ${Math.round(reg.sposta)} px`, Math.abs(reg.b / reg.a - 0.5) < 0.08 && Math.abs(reg.sposta - 100) < 3);

  console.log('--- Terreno esteso, foglio, scritte ---');
  const est = app.E(`(() => { const d = datiVista3dCorrenti, v = vociEsportazione3d(d)[0];
    const conta = sc => sc.tutte.filter(f => f.cls === 'vista3d-faccia').length;
    const dentro = (sc, x, y) => sc.tutte.some(f => f.cls === 'vista3d-faccia' && f.t === 'poli' && (() => { let c = false; const p = f.p; for (let i = 0, j = p.length - 1; i < p.length; j = i++) if ((p[i][1] > y) !== (p[j][1] > y) && x < (p[j][0] - p[i][0]) * (y - p[i][1]) / (p[j][1] - p[i][1]) + p[i][0]) c = !c; return c; })());
    const con = scenaVoce3d(v, d, 1400, 860, {}), senza = scenaVoce3d(v, d, 1400, 860, { terrenoEsteso: false });
    return { con: conta(con), senza: conta(senza), angoli: [[5, 5], [1395, 5], [5, 855], [1395, 855]].map(([x, y]) => dentro(con, x, y)), angoliSenza: [[5, 5], [1395, 5], [5, 855], [1395, 855]].filter(([x, y]) => dentro(senza, x, y)).length,
      esteso: vista3d.terrenoEsteso === undefined || vista3d.terrenoEsteso === null }; })()`);
  t(`il terreno continua oltre il riquadro del DTM fin dove serve: gli angoli del foglio sono coperti (${est.senza} → ${est.con} facce)`, est.con > est.senza && est.angoli.every(Boolean) && est.angoliSenza < 4);
  t('(solo nelle tavole: la vista a schermo resta col suo terreno)', est.esteso);
  const fogli = app.E(`(() => { const r = {}; [['A4', 'o'], ['A4', 'v'], ['A3', 'o'], ['A3', 'v']].forEach(([c, v]) => { tavole3d.carta = c; tavole3d.verso = v; r[c + v] = Object.assign(foglioTavole3d(), misureTavola3d()); }); tavole3d.carta = 'A4'; tavole3d.verso = 'o'; return r; })()`);
  t(`il foglio: A4 o A3, orizzontale o verticale (A4o ${fogli.A4o.W}×${fogli.A4o.H}, A3v ${fogli.A3v.W}×${fogli.A3v.H} px)`, fogli.A4o.PW === 841.89 && fogli.A4v.PH === 841.89 && fogli.A3o.PW === 1190.55 && fogli.A3v.PH === 1190.55
    && fogli.A4v.H > fogli.A4v.W && fogli.A3o.W > fogli.A4o.W * 1.4 && Math.abs(fogli.A4o.W - 1400) <= 1);
  const scr = app.E(`(() => { const d = datiVista3dCorrenti, v = vociEsportazione3d(d)[0]; const nome = sc => sc.tutte.find(f => f.cls === 'vista3d-nome').size;
    const a = scenaVoce3d(v, d, 1400, 860, { scritte: 1 }), b = scenaVoce3d(v, d, 1400, 860, { scritte: 1.6 });
    const la = conLegenda3d(a, d, 1).legenda, lb = conLegenda3d(b, d, 1.6).legenda;
    return { a: nome(a), b: nome(b), la: la.w, lb: lb.w, schermo: ultimaScena3d.tutte.find(f => f.cls === 'vista3d-nome').size }; })()`);
  t(`la grandezza delle scritte: nomi da ${scr.a} a ${scr.b} px, e la legenda con loro (${scr.la} → ${scr.lb} px)`, Math.abs(scr.b / scr.a - 1.6) < 0.01 && scr.lb > scr.la * 1.5 && scr.schermo === 13);

  console.log('--- La foto sopra il modello ---');
  const foto = app.E(`(() => {
    salvaSceltaSfondo3d({ id: 'esri-satellite' }); datiVista3dCorrenti._sfondo = null;
    const d = datiVista3dCorrenti, voci = vociEsportazione3d(d), conta = sc => sc.tutte.filter(f => f.cls === 'vista3d-foto-sopra');
    const senza = conta(scenaVoce3d(voci[0], d, 1400, 860, { basemap: true })).length;
    const iso = conta(scenaVoce3d(voci[0], d, 1400, 860, { basemap: true, fotoSopra: true }));
    const v3 = voci.find(v => v.tipo === 'sez3d'), sc3 = scenaVoce3d(v3, d, 1400, 860, { basemap: true, fotoSopra: true }), sez = conta(sc3);
    // la foto della sezione 3D: sopra la parte che resta e sul terreno davanti ai lati, mai sullo scavo davanti alla sezione
    const scavo = new Set(sc3.tutte.filter(f => f.cls === 'vista3d-faccia' && f.scavo).map(f => f.p));
    const terraSopra = new Set(sc3.tutte.filter(f => f.cls === 'vista3d-faccia' && !f.scavo).map(f => f.p));
    const dentro = scavo.size > 0 && sez.every(f => !scavo.has(f.p)) && sez.some(f => terraSopra.has(f.p));
    const luci = sc3.tutte.filter(f => f.cls === 'vista3d-solido').map(f => f.luce), luciIso = scenaVoce3d(voci[0], d, 1400, 860, {}).tutte.filter(f => f.cls === 'vista3d-solido').map(f => f.luce);
    const opaca = conta(scenaVoce3d(voci[0], d, 1400, 860, { basemap: true, fotoSopra: true, opacitaFoto: 0.3 })).every(f => f.fo === 0.3);
    vista3d.livelli.solido = true; vista3d.livelli.fotoSopra = true; renderVista3d();
    const schermo = ultimaScena3d.tutte.filter(f => f.cls === 'vista3d-foto-sopra').length, svg = svgDaScena(ultimaScena3d);
    vista3d.livelli.fotoSopra = false; renderVista3d();
    return { senza, iso: iso.length, trasparente: iso.every(f => f.fo === 0.5 && f.sfondo && f.uv), sez: sez.length, dentro, schermo, opaca,
      taglioInLuce: luci.includes('taglio') && luci.includes('ombra') && luci.every(l => l === 'taglio' || l === 'ombra'), isoSenzaLuci: luciIso.every(l => l === undefined), nelSvg: /vista3d-foto-sopra/.test(svg), riga: !!document.querySelector('#livelliVista3d [data-livello="fotoSopra"]') };
  })()`);
  t(`la foto satellitare stesa sopra il modello, trasparente (${foto.iso} pezzi d'immagine al 50%), solo se la si chiede`, foto.senza === 0 && foto.iso > 50 && foto.trasparente);
  t('anche sulla sezione 3D: sopra la parte che resta e sul terreno davanti ai lati (sepolti), mai davanti alla sezione', foto.sez > 50 && foto.dentro);
  t('l\'opacità della foto si sceglie (qui 30%)', foto.opaca);
  t('col taglio la faccia della sezione è in luce, il resto del corpo in ombra (senza taglio niente)', foto.taglioInLuce && foto.isoSenzaLuci);
  t('nel 3D la spunta «Foto sopra il modello» nei Livelli (Sfondo)', foto.riga && foto.schermo > 0);
  t('(nell\'SVG, che le immagini non le porta, niente velo)', !foto.nelSvg);

  console.log('--- Ritagliare la mappa, la freccia che segue la vista ---');
  const rit = app.E(`(() => {
    const d = datiVista3dCorrenti, v3 = vociEsportazione3d(d).find(v => v.tipo === 'sez3d');
    const facce = tm => scenaVoce3d(v3, d, 1400, 860, { tagliaMappa: tm }).tutte.filter(f => f.cls === 'vista3d-faccia');
    const a = facce(false), b = facce(true), fo = [...new Set(b.map(f => +f.fo.toFixed(4)))].sort();
    return { senza: a.length, con: b.length, tolti: b.filter(f => f.scavo).length, fo, foSenza: [...new Set(a.map(f => +f.fo.toFixed(4)))] };
  })()`);
  t(`«Ritaglia anche la mappa»: la parte tolta resta ma molto più trasparente (opacità ${rit.fo.join(' e ')}, prima ${rit.foSenza.join()})`, rit.fo.length === 2 && Math.abs(rit.fo[0] / rit.fo[1] - 0.25) < 1e-6 && rit.tolti > 0 && rit.con >= rit.senza);
  t('(nel 3D è un tasto della scheda «Modello e tagli»)', !!app.d.querySelector('#tagliVista3d [data-livello="tagliaMappa"]'));
  const segue = app.E(`(() => {
    const d = datiVista3dCorrenti, v = vociEsportazione3d(d)[0], out = [];
    [1, 2.5, 6].forEach(z => { const sc = scenaVoce3d(v, d, 1400, 860, { reg: { zoom: z }, legenda: false }), e = sc.elementi.nordTerreno; out.push(e ? { w: e.x1 - e.x0, h: e.y1 - e.y0, dentro: e.x0 >= 0 && e.x1 <= 1400 && e.y0 >= 0 && e.y1 <= 860 } : null); });
    return out;
  })()`);
  t(`la freccia del Nord sul terreno segue la vista: avvicinando resta nel quadro e grande uguale (${segue.map(e => e && Math.round(e.w) + '×' + Math.round(e.h)).join(', ')})`, segue.every(e => e && e.dentro) && Math.max(...segue.map(e => e.w)) / Math.min(...segue.map(e => e.w)) < 1.6);

  console.log('--- La finestra ---');
  clic(app, $(app, 'btnTavole3d'));
  await attesa(80);
  t('il tasto «Tavole» apre la finestra sopra la mappa', !$(app, 'tavole3d').hidden && $(app, 'modalVista3d').classList.contains('open'));
  const pagine = () => [...$(app, 'tavole3dPagine').querySelectorAll('.tavole-pag')];
  t(`a sinistra le ${voci.length} pagine con la spunta, tutte accese («${$(app, 'tavole3dConta').textContent}»)`, pagine().length === voci.length && pagine().every(p => p.querySelector('input').checked) && $(app, 'tavole3dConta').textContent === `${voci.length} di ${voci.length}`);
  t('in mezzo la prima pagina, col titolo e senza sottotitolo (se non lo scrivi tu)', $(app, 'tavole3dFoglioTit').textContent === voci[0] && $(app, 'tavole3dFoglioSotto').hidden && $(app, 'tavole3dFoglioSotto').textContent === '' && /1 \/ 10/.test($(app, 'tavole3dNome').textContent));
  clic(app, $(app, 'tavole3dDopo'));
  t('freccia: la pagina dopo', $(app, 'tavole3dFoglioTit').textContent === voci[1]);
  clic(app, pagine()[3]);
  t('clic su una pagina dell\'elenco: si vede quella (la sezione 2D, ferma)', $(app, 'tavole3dFoglioTit').textContent === voci[3] && !$(app, 'tavole3dImg').hidden && $(app, 'tavole3dRegola').classList.contains('spenta'));
  clic(app, pagine()[2]);
  clic(app, $(app, 'tavole3dRegola').querySelector('[data-regola="az+"]'));
  clic(app, $(app, 'tavole3dRegola').querySelector('[data-regola="zoom+"]'));
  const r = app.E(`${P}.tavole3d.regola[tavole3d.voci[2].id]`);
  t('i tasti girano e avvicinano la pagina scelta, e il progetto se lo ricorda', r && Math.abs(r.dAz + 15 * Math.PI / 180) < 1e-9 && Math.abs(r.zoom - 1.15) < 1e-9);
  clic(app, $(app, 'tavole3dRegola').querySelector('[data-regola="reset"]'));
  t('«Inquadra» la rimette com\'era', app.E(`JSON.stringify(${P}.tavole3d.regola[tavole3d.voci[2].id])`) === JSON.stringify({ dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 }));
  const chk = pagine()[1].querySelector('input');
  clic(app, chk);
  t('tolta la spunta: la pagina non si esporta (e lo dice il conto)', $(app, 'tavole3dConta').textContent === `${voci.length - 1} di ${voci.length}` && pagine()[1].classList.contains('esclusa'));
  clic(app, $(app, 'tavole3dNessuna'));
  t('«Nessuna»: niente da esportare, il tasto si spegne', $(app, 'tavole3dConta').textContent === `0 di ${voci.length}` && $(app, 'tavole3dEsporta').disabled);
  clic(app, $(app, 'tavole3dTutte'));
  t('«Tutte»: di nuovo tutte', $(app, 'tavole3dConta').textContent === `${voci.length} di ${voci.length}` && !$(app, 'tavole3dEsporta').disabled);
  clic(app, $(app, 'tavole3dFormato').querySelector('[data-formato="png"]'));
  t('formato: PDF unico o immagini (PNG, JPG): il riepilogo lo dice', /immagini PNG in un file ZIP/.test($(app, 'tavole3dRiepilogo').textContent));
  clic(app, $(app, 'tavole3dFormato').querySelector('[data-formato="pdf"]'));
  t('(PDF: pagine A4 orizzontali in un PDF solo)', /pagine A4 orizzontali in un PDF solo/.test($(app, 'tavole3dRiepilogo').textContent));
  clic(app, $(app, 'tavole3dSfondo').querySelector('[data-sfondo="scuro"]'));
  t('sfondo chiaro o scuro: il foglio dell\'anteprima cambia', $(app, 'tavole3dFoglio').classList.contains('scuro'));
  app.E(`document.getElementById('tavole3dBasemap').checked = true; document.getElementById('tavole3dFornitore').value = 'google-satellite'; document.getElementById('tavole3dFornitore').dispatchEvent(new Event('change'))`);
  t('con Google come mappa di base avvisa che nel file va Esri (Google non lo permette)', !$(app, 'tavole3dAvviso').hidden && /Esri/.test($(app, 'tavole3dAvviso').textContent) && app.E(`SOSTITUTI_ESPORTA_3D['google-satellite']`) === 'esri-satellite');
  t('nel piede della pagina solo il numero, niente nome del progetto', $(app, 'tavole3dPiede').textContent === '' && /^\d+ \/ \d+$/.test($(app, 'tavole3dNumero').textContent)
    && !/piede:/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071p_esporta-viste-3d.js'), 'utf8')));
  // Il titolo: automatico, si riscrive, si toglie; «così su tutte».
  clic(app, pagine()[0]);
  t('il titolo della pagina: quello automatico, scritto nel campo', $(app, 'tavole3dTitolo').value === voci[0] && $(app, 'tavole3dConTitolo').checked);
  $(app, 'tavole3dTitolo').value = 'Il modello del sottosuolo';
  $(app, 'tavole3dTitolo').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('si riscrive: cambia sul foglio e nell\'elenco, e il progetto se lo ricorda', $(app, 'tavole3dFoglioTit').textContent === 'Il modello del sottosuolo' && /Il modello del sottosuolo/.test(pagine()[0].textContent)
    && app.E(`${P}.tavole3d.titoli[tavole3d.voci[0].id].testo`) === 'Il modello del sottosuolo');
  $(app, 'tavole3dSottotitolo').value = 'Scavi Cerignola';
  $(app, 'tavole3dSottotitolo').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('il sottotitolo lo scrivi tu: compare sotto il titolo', !$(app, 'tavole3dFoglioSotto').hidden && $(app, 'tavole3dFoglioSotto').textContent === 'Scavi Cerignola' && app.E(`${P}.tavole3d.titoli[tavole3d.voci[0].id].sotto`) === 'Scavi Cerignola');
  $(app, 'tavole3dSottotitolo').value = '';
  $(app, 'tavole3dSottotitolo').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('(cancellato, sparisce)', $(app, 'tavole3dFoglioSotto').hidden);
  $(app, 'tavole3dConTitolo').checked = false;
  $(app, 'tavole3dConTitolo').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('senza titolo: il foglio non ha la riga del titolo', app.d.querySelector('#tavole3dFoglio .tavole-foglio-tit').hidden && $(app, 'tavole3dTitolo').disabled && app.E('titoloTavola3d(tavole3d.voci[0])') === null);
  clic(app, $(app, 'tavole3dTitoliTutte'));
  t('«Così su tutte»: tutte senza titolo', app.E('tavole3d.voci.every(v => titoloTavola3d(v) === null)'));
  $(app, 'tavole3dConTitolo').checked = true;
  $(app, 'tavole3dConTitolo').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  clic(app, $(app, 'tavole3dTitoliTutte'));
  clic(app, $(app, 'tavole3dTitoloAuto'));
  t('…e di nuovo tutte col titolo; «Automatico» rimette quello automatico', app.E('tavole3d.voci.every(v => titoloTavola3d(v) === v.titolo)') && $(app, 'tavole3dTitolo').value === voci[0]);
  clic(app, pagine()[3]);
  t('la sezione 2D nel foglio: solo lei (la tela del 3D è nascosta)', $(app, 'tavole3dTela').hidden && !$(app, 'tavole3dImg').hidden);
  clic(app, $(app, 'tavole3dCarta').querySelector('[data-carta="A3"]'));
  clic(app, $(app, 'tavole3dVerso').querySelector('[data-verso="v"]'));
  clic(app, $(app, 'tavole3dScritte').querySelector('[data-scritte="2"]'));
  t('dalla finestra: A3 verticale, scritte molto grandi; il riepilogo lo dice e il progetto lo ricorda', /pagine A3 verticali/.test($(app, 'tavole3dRiepilogo').textContent)
    && JSON.stringify(app.E(`${P}.tavole3d.foglio`)) === JSON.stringify({ carta: 'A3', verso: 'v', scritte: 2 }));
  clic(app, $(app, 'tavole3dCarta').querySelector('[data-carta="A4"]'));
  clic(app, $(app, 'tavole3dVerso').querySelector('[data-verso="o"]'));
  // Gli elementi della tavola: si spengono e si trascinano.
  clic(app, pagine()[0]);
  const conta = cls => app.E(`tavole3d.ultima.sc.tutte.filter(f => f.cls === '${cls}').length`);
  t('di base nella tavola: legenda, bussola, scala, freccia sul terreno', conta('vista3d-legenda') > 0 && conta('vista3d-nord') > 0 && conta('vista3d-scala') > 0 && conta('vista3d-nord-terreno') > 0);
  ['tavole3dBussola', 'tavole3dScala', 'tavole3dNordTerreno', 'tavole3dLegenda'].forEach(id => { $(app, id).checked = false; $(app, id).dispatchEvent(new app.w.Event('change', { bubbles: true })); });
  t('ognuno si spegne con la sua spunta (e il progetto se lo ricorda)', conta('vista3d-legenda') === 0 && conta('vista3d-nord') === 0 && conta('vista3d-scala') === 0 && conta('vista3d-nord-terreno') === 0
    && JSON.stringify(app.E(`${P}.tavole3d.elementi`)) === JSON.stringify({ legenda: false, bussola: false, nordTerreno: false, scala: false, nordPianta: true, fantasma: true, fotoSopra: false, tagliaMappa: false }));
  ['tavole3dBussola', 'tavole3dScala', 'tavole3dNordTerreno', 'tavole3dLegenda'].forEach(id => { $(app, id).checked = true; $(app, id).dispatchEvent(new app.w.Event('change', { bubbles: true })); });
  const trascina = (x0, y0, dx, dy) => {
    const k = app.E('tavole3d.ultima.k'), tela = $(app, 'tavole3dTela'), ev = (tipo, x, y) => { const e = new app.w.MouseEvent(tipo, { bubbles: true, clientX: x * k, clientY: y * k, button: 0 }); tela.dispatchEvent(e); };
    ev('pointerdown', x0, y0); ev('pointermove', x0 + dx / 2, y0 + dy / 2); ev('pointermove', x0 + dx, y0 + dy); ev('pointerup', x0 + dx, y0 + dy);
  };
  // Trascinare la figura gira la vista come nel 3D normale (stessi versi): a destra = azimut che cresce.
  app.E(`tavole3d.regola[tavole3d.voci[tavole3d.scelta].id] = { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 }`);
  trascina(150, 700, 80, 0);
  const dAzT = app.E(`tavole3d.regola[tavole3d.voci[tavole3d.scelta].id].dAz`);
  const az3d = app.E(`(() => { const box = document.getElementById('graficoVista3d'), a = vista3d.az, ev = (t, x) => box.dispatchEvent(new MouseEvent(t, { bubbles: true, clientX: x, clientY: 5, button: 0 })); ev('pointerdown', 5); ev('pointermove', 85); ev('pointerup', 85); const d = vista3d.az - a; vista3d.az = a; return d; })()`);
  t(`trascinando a destra la tavola gira come il 3D (Δaz ${dAzT.toFixed(2)} e ${az3d.toFixed(2)})`, dAzT > 0 && az3d > 0);
  app.E(`tavole3d.regola[tavole3d.voci[tavole3d.scelta].id] = { dAz: 0, dEl: 0, zoom: 1, dx: 0, dy: 0 }; mostraTavola3d()`);
  const leg0 = app.E('tavole3d.ultima.sc.legenda');
  trascina(leg0.x + leg0.w / 2, leg0.y + leg0.h / 2, -400, 200);
  const leg1 = app.E('tavole3d.ultima.sc.legenda');
  t(`la legenda si trascina dove vuoi (da ${Math.round(leg0.x)},${Math.round(leg0.y)} a ${Math.round(leg1.x)},${Math.round(leg1.y)}), la vista non gira`, Math.abs(leg1.x - (leg0.x - 400)) < 2 && Math.abs(leg1.y - (leg0.y + 200)) < 2
    && !(app.E(`(${P}.tavole3d.regola[tavole3d.voci[0].id] || {}).dAz`)) && Array.isArray(app.E(`${P}.tavole3d.posizioni.legenda`)));
  const bu0 = app.E('tavole3d.ultima.sc.elementi.bussola');
  trascina((bu0.x0 + bu0.x1) / 2, (bu0.y0 + bu0.y1) / 2, -300, -250);
  const bu1 = app.E('tavole3d.ultima.sc.elementi.bussola');
  t('anche la bussola', Math.abs(bu1.x0 - (bu0.x0 - 300)) < 2 && Math.abs(bu1.y0 - (bu0.y0 - 250)) < 2);
  const sca0 = app.E('tavole3d.ultima.sc.elementi.scala');
  trascina(sca0.x0 + 30, sca0.y1 - 10, 200, -60);
  const sca1 = app.E('tavole3d.ultima.sc.elementi.scala');
  t('anche la scala metrica', Math.abs(sca1.x0 - (sca0.x0 + 200)) < 2 && Math.abs(sca1.y0 - (sca0.y0 - 60)) < 2);
  const nt0 = app.E('tavole3d.ultima.sc.elementi.nordTerreno');
  trascina((nt0.x0 + nt0.x1) / 2, (nt0.y0 + nt0.y1) / 2, 120, 40);
  const nt1 = app.E('tavole3d.ultima.sc.elementi.nordTerreno');
  t('e la freccia sul terreno (resta stesa sul terreno, nel punto nuovo: solo su questa pagina)', Math.abs((nt1.x0 + nt1.x1) / 2 - (nt0.x0 + nt0.x1) / 2 - 120) < 25 && Math.abs((nt1.y0 + nt1.y1) / 2 - (nt0.y0 + nt0.y1) / 2 - 40) < 25
    && Array.isArray(app.E(`${P}.tavole3d.regola[tavole3d.voci[0].id].nordTerreno`)));
  clic(app, $(app, 'tavole3dRiposiziona'));
  const leg2 = app.E('tavole3d.ultima.sc.legenda');
  t('«Rimettili al loro posto»', Math.abs(leg2.x - leg0.x) < 2 && Math.abs(leg2.y - leg0.y) < 2 && JSON.stringify(app.E(`${P}.tavole3d.posizioni`)) === '{}' && !app.E(`${P}.tavole3d.regola[tavole3d.voci[0].id].nordTerreno`));
  // I tasti di vista: isometrica (che gira Nord → Est → Sud → Ovest), trasversale, pianta; mai dal basso.
  clic(app, pagine()[0]);
  const tasto = tipo => $(app, 'tavole3dRegola').querySelector(`[data-vista="${tipo}"]`);
  const vista = () => app.E(`(() => { const v = tavole3d.voci[tavole3d.scelta], r = tavole3d.regola[v.id]; return { vista: r && r.vista, az: tavole3d.ultima.sc.vista.az, el: tavole3d.ultima.sc.vista.el, titolo: v.titolo }; })()`);
  clic(app, tasto('iso'));
  let vi = vista();
  t(`«Isometrica»: la pagina del modello verso Nord (${vi.titolo})`, vi.vista.tipo === 'iso' && vi.vista.verso === 0 && Math.abs(vi.az - Math.PI / 4) < 1e-9 && Math.abs(vi.el - Math.atan(1 / Math.SQRT2)) < 1e-9 && tasto('iso').getAttribute('aria-pressed') === 'true' && /Nord/.test(tasto('iso').textContent));
  const giro = [];
  for (let n = 0; n < 4; n++) { clic(app, tasto('iso')); giro.push(vista().vista.verso); }
  t(`premuta ancora gira: ${giro.map(v => ['Nord', 'Est', 'Sud', 'Ovest'][v]).join(' → ')}`, JSON.stringify(giro) === '[1,2,3,0]' && /verso Nord/.test(vista().titolo));
  clic(app, tasto('trasv'));
  vi = vista();
  t('«Trasversale»: di lato, in orizzontale (verso dove guardava)', vi.vista.tipo === 'trasv' && vi.el === 0 && /trasversale verso Nord/.test(vi.titolo));
  clic(app, tasto('trasv'));
  t('(anche lei gira: verso Est)', vista().vista.verso === 1 && Math.abs(vista().az - Math.PI / 2) < 1e-9);
  clic(app, tasto('pianta'));
  vi = vista();
  t('«Pianta»: dall\'alto, Nord in alto', vi.vista.tipo === 'pianta' && Math.abs(vi.el - Math.PI / 2) < 1e-3 && vi.az === 0 && vi.titolo === 'Modello · pianta');
  clic(app, tasto('trasv'));
  for (let n = 0; n < 8; n++) clic(app, $(app, 'tavole3dRegola').querySelector('[data-regola="el-"]'));
  t('mai dal basso: dall\'orizzonte in giù i tasti non scendono più', vista().el >= 0 && vista().el < 1e-9);
  clic(app, $(app, 'tavole3dRegola').querySelector('[data-regola="reset"]'));
  t('«Inquadra» torna alla vista di partenza della pagina', !vista().vista && vista().titolo === voci[0]);
  // L'ordine delle pagine.
  const ordine = () => app.E('tavole3d.voci.map(v => v.titolo)');
  clic(app, pagine()[1].querySelector('[data-sposta-pag="-1"]'));
  t('la freccia ▲ sposta su la pagina', ordine()[0] === voci[1] && ordine()[1] === voci[0] && app.E(`${P}.tavole3d.ordine[0]`) === app.E('tavole3d.voci[0].id'));
  clic(app, $(app, 'tavole3dOrdinaDirezione'));
  const perDir = ordine();
  t(`«Per direzione»: ${perDir.join(' · ')}`, JSON.stringify(perDir) === JSON.stringify(['Modello · vista isometrica verso Nord', "Sezione 3D 1-1'", "Sezione 3D 2-2'", 'Modello · vista isometrica verso Est', "Sezione 3D A-A'", "Sezione 3D B-B'", "Sezione A-A'", "Sezione B-B'", "Sezione 1-1'", "Sezione 2-2'"]));
  t('(nell\'elenco ogni pagina 3D dice dove guarda)', /verso Nord/.test(pagine()[1].textContent) && /verso Est/.test(pagine()[4].textContent));
  clic(app, $(app, 'tavole3dChiudi'));
  clic(app, $(app, 'btnTavole3d'));
  await attesa(30);
  t('riaprendo, l\'ordine è quello scelto', JSON.stringify(ordine()) === JSON.stringify(perDir));
  clic(app, $(app, 'tavole3dOrdinaPartenza'));
  t('«Di partenza» lo rimette com\'era', JSON.stringify(ordine()) === JSON.stringify(voci));
  // Le prove nelle sezioni 2D: con la spunta, si tolgono o si rimettono a mano.
  const i2d = app.E(`tavole3d.voci.findIndex(v => v.tipo === 'sez2d')`);
  clic(app, pagine()[i2d]);
  const caselle = () => [...$(app, 'tavole3dProve').querySelectorAll('[data-prova-tavola]')];
  t(`sulla pagina 2D: «Prove in questa sezione», ${caselle().length} con la spunta`, !$(app, 'tavole3dProveBox').hidden && caselle().length > 1 && caselle().every(c => c.checked));
  const togli = caselle()[0], idTolta = togli.dataset.provaTavola, nomeTolta = app.E(`nomeDpsh(datiVista3dCorrenti.prove.find(p => p.s.id === ${JSON.stringify(idTolta)}).s)`);
  const svgSez = () => decodeURIComponent($(app, 'tavole3dImg').getAttribute('src').split(',')[1]);
  t(`(${nomeTolta} è nella sezione)`, svgSez().includes('>' + nomeTolta + '<'));
  togli.checked = false; togli.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('tolta la spunta: la prova esce dalla sezione (e la traccia se lo ricorda)', !svgSez().includes('>' + nomeTolta + '<') && app.E(`tracceDelProgetto().find(t => t.id === tavole3d.voci[tavole3d.scelta].traccia).escluse`).includes(idTolta));
  const torna = caselle().find(c => c.dataset.provaTavola === idTolta);
  torna.checked = true; torna.dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('rimessa: torna', svgSez().includes('>' + nomeTolta + '<'));
  const prima2 = caselle().length;
  $(app, 'tavole3dFascia').value = '0'; $(app, 'tavole3dFascia').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t(`la distanza dalla traccia decide quali prove si possono mettere (${prima2} → ${caselle().length} a 0 m)`, caselle().length < prima2 && $(app, 'numFasciaSezione3d').value === '0');
  $(app, 'tavole3dFascia').value = '25'; $(app, 'tavole3dFascia').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  clic(app, pagine()[0]);
  t('(sulle pagine 3D la scelta delle prove non c\'è)', $(app, 'tavole3dProveBox').hidden);
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('Esc chiude le tavole, non la mappa del progetto sotto', $(app, 'tavole3d').hidden && $(app, 'modalVista3d').classList.contains('open'));
  clic(app, $(app, 'btnPdfSezioni3d'));
  await attesa(30);
  t('dalla scheda Sezioni «Tavole 2D e 3D…» apre la finestra sulla prima sezione', !$(app, 'tavole3d').hidden && /Sezione 3D A-A'/.test($(app, 'tavole3dFoglioTit').textContent));
  clic(app, $(app, 'tavole3dChiudi'));

  console.log('--- Il PDF ---');
  // Una «JPEG» finta: il PDF la porta così com'è (DCTDecode), basta che la struttura sia giusta.
  app.E(`window.__pdfProva = (async () => {
    const j = new Uint8Array([0xFF, 0xD8, 0xFF, 0xD9, 1, 2, 3]);
    const blob = pdfDaTavole3d([{ titolo: 'Modello · vista isometrica verso Nord', sotto: 'Nardò', jpeg: j, w: 2800, h: 1720, pxW: 2800, pxH: 1720 }, { titolo: "Sezione 3D A-A'", jpeg: j, w: 2800, h: 1720, pxW: 2800, pxH: 1720 }, { titolo: null, sotto: null, jpeg: j, w: 2800, h: 1720, pxW: 2800, pxH: 1720 }], { sfondo: 'chiaro', titolo: 'Tavole', piede: 'Nardò' });
    const b = new Uint8Array(await blob.arrayBuffer());
    return { testo: Array.from(b, c => String.fromCharCode(c)).join(''), tipo: blob.type };
  })()`);
  const pdf = await app.w.__pdfProva;
  const s = pdf.testo;
  t('un PDF vero: intestazione, tre pagine A4 orizzontali, catalogo, xref e fine', s.startsWith('%PDF-1.4') && /\/Count 3/.test(s) && (s.match(/\/MediaBox \[0 0 841\.89 595\.28\]/g) || []).length === 3 && /%%EOF\n$/.test(s) && pdf.tipo === 'application/pdf');
  t('ogni pagina: la figura JPEG (DCTDecode) e il titolo in testo vero (la terza senza: figura più grande)', (s.match(/\/Filter \/DCTDecode/g) || []).length === 3 && (s.match(/\/F2 15 Tf/g) || []).length === 2 && /\(Modello \xB7 vista isometrica verso Nord\) Tj/.test(s) && /\(Sezione 3D A-A'\) Tj/.test(s));
  // l'indice xref punta davvero agli oggetti
  const xref = Number(/startxref\n(\d+)/.exec(s)[1]);
  const voceXref = s.slice(xref).split('\n').slice(3, 4)[0];
  t('(l\'indice dei byte è giusto: punta agli oggetti)', s.slice(xref, xref + 4) === 'xref' && s.slice(Number(voceXref.slice(0, 10)), Number(voceXref.slice(0, 10)) + 7) === '1 0 obj');

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
