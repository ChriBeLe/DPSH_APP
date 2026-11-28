// ISOIPSE E OMBREGGIATURA DELLA MAPPA 2D: si calcolano dal DTM del progetto (senza rete). Qui si prova il
// calcolo (la mappa vera, Leaflet, in jsdom non c'è): su un DTM finto fatto a mano, un cono e un piano.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.HTMLCanvasElement.prototype.getContext = () => null;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  await attesa(30);
  // DTM finto: UTM 33, 60 × 60 celle da 2 m; cono alto 30 m al centro (quota 100 al bordo) e un buco
  app.E(`(() => {
    const nx = 60, ny = 60, cod = new Uint16Array(nx * ny);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) cod[j * nx + i] = Math.round(Math.max(0, 30 - Math.hypot(i - 30, j - 30)) * 100);
    cod[5 * nx + 5] = 65535;
    const by = new Uint8Array(cod.buffer); let b = ''; by.forEach(x => b += String.fromCharCode(x));
    ${P}.dtm = { nx, ny, x0: 700000, y0: 4450000, dx: 2, dy: 2, crs: { tipo: 'utm', zona: 33 }, base: 100, unita: 0.01, quote: btoa(b), fonte: 'prova' };
  })()`);
  const curve = app.E(`JSON.parse(JSON.stringify(isoipseDalDtm(${P}.dtm, 5)))`);
  t('curve ogni 5 m da 100 a 130 (escluse le estreme piatte): ' + curve.map(c => c.quota).join(','), curve.length >= 5 && curve.every(c => c.quota % 5 === 0) && curve[0].quota >= 100 && curve[curve.length - 1].quota <= 130);
  const anello = curve.find(c => c.quota === 115);
  t('una quota di un cono dà un anello chiuso', anello && anello.linee.length === 1 && anello.linee[0].length > 20 && JSON.stringify(anello.linee[0][0]) === JSON.stringify(anello.linee[0][anello.linee[0].length - 1]));
  t('ogni quinta curva è «indice» (passo 5: la 125)', curve.filter(c => c.indice).map(c => c.quota).join() === '125');
  const auto = app.E(`passoIsoipse(${P}.dtm, 0)`);
  t('passo automatico: 30 m di dislivello → ' + auto + ' m (da 8 a 25 curve)', auto === 2 || auto === 5);
  const raggio = c => { const l = c.linee[0], m = app.E(`nodoDtmGeo(${P}.dtm, 30, 30)`); return l.map(p => Math.hypot((p[0] - m.lat) * 110540, (p[1] - m.lng) * 111320 * Math.cos(m.lat * Math.PI / 180))); };
  const r = raggio(anello);
  t('il raggio della curva 115 è ~15 m × 2 m = 30 m: ' + Math.min(...r).toFixed(1) + '–' + Math.max(...r).toFixed(1), Math.min(...r) > 26 && Math.max(...r) < 34);
  t('un buco del DTM non rompe le curve', curve.every(c => c.linee.every(l => l.every(p => isFinite(p[0] + p[1])))));

  console.log('--- Ombreggiatura ---');
  // piano che sale verso Sud (le righe aumentano): il versante guarda a Nord
  const nuovoDtm = f => app.E(`(() => { const nx = 60, ny = 60, c = new Uint16Array(nx * ny); for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) c[j * nx + i] = (${f})(i, j); const by = new Uint8Array(c.buffer); let b = ''; by.forEach(x => b += String.fromCharCode(x)); ${P}.dtm = Object.assign(JSON.parse(JSON.stringify(${P}.dtm)), { quote: btoa(b) }); })()`);
  nuovoDtm('(i, j) => j * 100');
  const l = az => app.E(`(() => { const o = ombreggiaturaDalDtm(${P}.dtm, ${az}, 45, 1, 128); return o.luce[30 * 60 + 30]; })()`);
  t('un versante che guarda a Nord: chiaro con luce da Nord (0,948), scuro con luce da Sud (0,316)', Math.abs(l(0) - 0.948) < 0.01 && Math.abs(l(180) - 0.316) < 0.01);
  t('luce da Est o da Ovest: uguale (versante a Nord) e a metà', Math.abs(l(90) - l(270)) < 0.01 && Math.abs(l(90) - Math.cos(Math.PI / 4)) > 0.001);
  nuovoDtm('(i, j) => 0');
  const piatto = app.E(`ombreggiaturaDalDtm(${P}.dtm, 315, 45, 1, 128).luce[30 * 60 + 30]`);
  t('terreno piano: la luce vale il seno dell\'altezza del sole (0,707)', Math.abs(piatto - Math.SQRT1_2) < 0.001);
  const img = app.E(`(() => { const o = ombreggiaturaDalDtm(${P}.dtm, 315, 45, 1, 128); return { w: o.w, h: o.h, n: o.dati.length, lim: o.limiti, a: o.dati[(o.h / 2 | 0) * o.w * 4 + (o.w / 2 | 0) * 4 + 3] }; })()`);
  t('immagine RGBA con i limiti sulla mappa, piano = trasparente', img.n === img.w * img.h * 4 && img.lim[0][0] < img.lim[1][0] && img.a === 0);

  console.log('--- Scelte, pannello Livelli, assistente ---');
  const imp = JSON.parse(app.E('JSON.stringify(impostazioniMappa2d())'));
  t('di serie spente, luce da Nord-Ovest a 45°, curve automatiche', !imp.isoipse.on && !imp.ombra.on && imp.ombra.az === 315 && imp.ombra.alt === 45 && imp.isoipse.passo === 0);
  const s0 = app.E(`AI_STRUMENTI.find(x => x.n === 'leggi_isoipse_ombreggiatura').run({})`);
  t('l\'assistente legge le scelte e vede il DTM', s0.haDtm && !s0.isoipse.accese && !s0.ombreggiatura.accesa);
  const R = app.E(`AI_STRUMENTI.find(x => x.n === 'imposta_isoipse_ombreggiatura').run({ isoipse: true, passo_m: 2, ombreggiatura: true, luce_azimut: -45, esagerazione: 99 })`);
  const s1 = JSON.parse(app.E('JSON.stringify(state.settings.mappa2d)'));
  t('l\'assistente le accende; azimut -45° = 315°, esagerazione limitata a 5', R.ok && s1.isoipse.on && s1.isoipse.passo === 2 && s1.ombra.on && s1.ombra.az === 315 && s1.ombra.es === 5);
  app.E(`delete ${P}.dtm`);
  let errore = '';
  try { app.E(`AI_STRUMENTI.find(x => x.n === 'imposta_isoipse_ombreggiatura').run({ isoipse: true })`); } catch (e) { errore = e.message; }
  t('senza DTM l\'assistente non le accende e dice cosa fare', /DTM/.test(errore));
  t('lo strumento è scritto «con conferma» e vale per le richieste su isoipse', app.E(`AI_STRUMENTI.find(x => x.n === 'imposta_isoipse_ombreggiatura').w === true && aiStrumentiPer([{ r: 'u', t: 'accendi le isoipse sul terreno' }]).some(x => x.n === 'imposta_isoipse_ombreggiatura')`));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
