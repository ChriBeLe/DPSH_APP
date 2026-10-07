// IL CORPO SOLIDO, LE OPZIONI: la mesh a richiesta, gli strati del solo corpo da accendere e spegnere,
// il taglio verticale salvato come traccia (nell'elenco delle sezioni), l'ombreggiatura delle facce e
// le linee addolcite (spline esatta alle prove, mai oltre i loro valori).
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
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '3'); s.header.lat = 40.19690; s.header.lng = 17.99320; })()`);
  app.E('apriVista3d(); accendiSolido3d(); renderVista3d()');
  const solidi = () => app.E("ultimaScena3d.pezzi.filter(f => f.cls === 'vista3d-solido')");

  console.log('--- La mesh ---');
  t('spenta di partenza: il bordo dei triangoli ha il colore della faccia (nessuna riga)', solidi().length > 0 && solidi().every(f => f.stroke === f.fill));
  clic(app, app.d.querySelector('#modalVista3d .pillola[data-livello="mesh"]'));
  t('«Mostra la mesh»: linee scure sottili', app.E('vista3d.livelli.mesh') === true && solidi().every(f => /rgba\(15,23,42/.test(f.stroke) && f.sw === 0.6));
  clic(app, app.d.querySelector('#modalVista3d .pillola[data-livello="mesh"]'));

  console.log('--- Gli strati del corpo solido ---');
  const righe = [...app.d.querySelectorAll('#livelliVista3d [data-solido3d]')].map(r => r.dataset.solido3d);
  t(`il gruppo «Corpo solido»: ${righe.join(', ')}`, righe.length >= 2 && righe.includes('Non indagato'));
  const primo = righe[0], colonne0 = app.E("ultimaScena3d.pezzi.filter(f => f.cls === 'vista3d-colonna').length");
  clic(app, app.d.querySelector(`#livelliVista3d [data-solido3d="${primo}"] input`));
  t(`spento «${primo}»: sparisce dal corpo, non dalle colonne`, !solidi().some(f => f.strato === primo) && app.E("ultimaScena3d.pezzi.filter(f => f.cls === 'vista3d-colonna').length") === colonne0);
  clic(app, app.d.querySelector(`#livelliVista3d [data-solido3d="${primo}"] input`));

  console.log('--- Il taglio come traccia ---');
  t('senza taglio il tasto è spento', $(app, 'btnTaglioTraccia3d').disabled);
  app.E("vista3d.taglio.dir = 'ns'; vista3d.taglio.pos = 0.5; renderVista3d()");
  const n0 = app.E(`(${P}.sezioniTracciate || []).length`);
  clic(app, $(app, 'btnTaglioTraccia3d'));
  const tr = app.E(`(() => { const t = ${P}.sezioniTracciate[${P}.sezioniTracciate.length - 1], d = datiVista3dCorrenti, sc = tracciaInScena(d, t); return { nome: t.nome, a: sc.a, b: sc.b, c: vista3d.taglio.c }; })()`);
  t(`Nord–Sud: la traccia «${tr.nome}» corre lungo il taglio, da sud a nord (x = ${tr.c.toFixed(2)} m)`, app.E(`${P}.sezioniTracciate.length`) === n0 + 1
    && Math.abs(tr.a[0] - tr.c) < 0.05 && Math.abs(tr.b[0] - tr.c) < 0.05 && tr.b[1] > tr.a[1] && tr.b[1] - tr.a[1] > 1);
  t('ed è nell\'elenco delle sezioni', [...app.d.querySelectorAll('#elencoSezioni3d [data-nome-sezione]')].some(i => i.value === tr.nome));
  app.E("vista3d.taglio.dir = null; renderVista3d()");

  console.log('--- Ombreggiatura ---');
  app.E('vista3d.ombre = 0; renderVista3d()');
  const piatti = new Set(solidi().map(f => f.fill));
  app.E('vista3d.ombre = 0.6; renderVista3d()');
  const ombreggiati = new Set(solidi().map(f => f.fill));
  t(`a 0 i colori degli strati (${piatti.size}), con la luce le facce girate diversamente cambiano tono (${ombreggiati.size})`, [...piatti].every(c => /^#/.test(c)) && ombreggiati.size > piatti.size && [...ombreggiati].every(c => /^rgb\(/.test(c)));

  console.log('--- Linee addolcite ---');
  const confronto = app.E(`(() => {
    const d = datiVista3dCorrenti, so = modelloSolido(d);
    const allaProva = () => d.prove.map(p => colonnaSolido(d, so, p.x, p.y).basi.map(v => +v.toFixed(6)).join());
    const lungo = () => { const a = d.prove[0], b = d.prove[1], c = d.prove[2], out = []; for (let i = 1; i < 10; i++) { const t = i / 10, x = (a.x + b.x + c.x) / 3 * t + a.x * (1 - t), y = (a.y + b.y + c.y) / 3 * t + a.y * (1 - t); out.push(colonnaSolido(d, so, x, y).basi); } return out; };
    vista3d.liscio = 0; const p0 = allaProva(), l0 = lungo();
    vista3d.liscio = 1; const p1 = allaProva(), l1 = lungo();
    vista3d.liscio = 0;
    const minMax = so.basi[0].map((_, k) => [Math.min(...so.basi.map(b => b[k])), Math.max(...so.basi.map(b => b[k]))]);
    return { esatte: p0.join('|') === p1.join('|'), cambia: JSON.stringify(l0) !== JSON.stringify(l1),
      dentro: l1.every(b => b.every((v, k) => v >= minMax[k][0] - 1e-9 && v <= minMax[k][1] + 1e-9)), ordinate: l1.every(b => b.every((v, k) => !k || v >= b[k - 1] - 1e-9)) };
  })()`);
  t('alle prove le basi restano esatte', confronto.esatte);
  t('tra le prove cambiano (spline), restano tra i valori delle prove e in ordine', confronto.cambia && confronto.dentro && confronto.ordinate);
  $(app, 'rngLiscio3d').value = '50'; $(app, 'rngLiscio3d').dispatchEvent(new app.w.Event('input'));
  t('il cursore «Linee addolcite» lo regola', app.E('vista3d.liscio') === 0.5 && $(app, 'lblLiscio3d').textContent === '50%');
  $(app, 'rngLiscio3d').value = '0'; $(app, 'rngLiscio3d').dispatchEvent(new app.w.Event('input'));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
