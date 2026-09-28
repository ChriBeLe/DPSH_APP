// IL TERRENO DEL PROGETTO (DTM): GeoTIFF (strisce, tessere, LZW, Deflate, predittori 2 e 3, byte
// order grande) e ASCII Grid (anche senza sistema di riferimento, anche in gradi). Si tiene il
// ritaglio attorno alle prove, dentro il progetto; la quota di ogni prova è quella del piano noto
// dei file di prova (genera_dtm.py). Gli errori dicono cosa fare.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const DTM = n => fs.readFileSync(path.join(__dirname, 'dati', 'dtm', n));
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const vicino = (a, b, tol) => a !== null && Math.abs(a - b) <= tol;

// Quote attese dai piani di genera_dtm.py (coordinate UTM 33 da pyproj).
const PIANO_UTM = [40 + 0.02 * 689.842 + 0.03 * 962.543, 40 + 0.02 * 723.654 + 0.03 * 920.337];
const PIANO_GRADI = [40 + 1000 * (17.99213 - 17.99) + 2000 * (40.19741 - 40.19), 40 + 1000 * (17.99251 - 17.99) + 2000 * (40.19702 - 40.19)];

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.DecompressionStream = globalThis.DecompressionStream;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const idNardo = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(idNardo)}); switchView('project')`);
  await attesa(50);
  clic(app, $(app, 'btnProgettoTerreno'));
  t('dal Progetto si apre «Terreno e sezioni», che spiega cosa serve', $(app, 'modalTerreno').classList.contains('open') && /GeoTIFF/.test($(app, 'statoTerreno').textContent) && $(app, 'btnTogliDtm').style.display === 'none');

  const carica = async (nome) => {
    const file = new app.w.File([DTM(nome)], nome);
    if (!file.arrayBuffer) file.arrayBuffer = async () => { const b = DTM(nome); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); };
    Object.defineProperty($(app, 'fileDtm'), 'files', { value: [file], configurable: true });
    $(app, 'fileDtm').dispatchEvent(new app.w.Event('change'));
    for (let i = 0; i < 100 && /Lettura di/.test($(app, 'statoTerreno').textContent); i++) await attesa(20);
  };
  const quote = () => [1, 2].map(n => app.E(`(() => { const p = state.projects[${JSON.stringify(idNardo)}]; const s = Object.values(p.surveys).find(s => s.header.provaNr == '${n}'); return quotaDellaProva(p, s.header); })()`));

  for (const [nome, tol] of [['utm33_lzw_pred3.tif', 0.02], ['etrs89_deflate_tessere.tif', 0.02], ['utm33_grezzo_bigendian.tif', 0.02], ['utm33_int16_pred2.tif', 0.6], ['utm33_senza_crs.asc', 0.02], ['utm33_con_buchi.tif', 0.02]]) {
    await carica(nome);
    const q = quote();
    t(`${nome}: quote delle prove ${q.map(v => v && v.toFixed(2)).join(' e ')} (attese ${PIANO_UTM.map(v => v.toFixed(2)).join(' e ')})`, vicino(q[0], PIANO_UTM[0], tol) && vicino(q[1], PIANO_UTM[1], tol));
  }
  const dtm = app.E(`JSON.parse(JSON.stringify(state.projects[${JSON.stringify(idNardo)}].dtm))`);
  t('si tiene solo il ritaglio attorno alle prove (± 150 m), non tutto il file', dtm.nx < 200 && dtm.ny < 200 && dtm.nx * dtm.dx < 400 && dtm.crs.zona === 33);
  await carica('gradi.asc');
  const qg = quote();
  t(`ASCII Grid in gradi: ${qg.map(v => v && v.toFixed(2)).join(' e ')} (attese ${PIANO_GRADI.map(v => v.toFixed(2)).join(' e ')})`, vicino(qg[0], PIANO_GRADI[0], 0.05) && vicino(qg[1], PIANO_GRADI[1], 0.05));
  const testo = $(app, 'statoTerreno').textContent;
  t('la finestra elenca le quote, e dice «senza GPS» per le prove che non l\'hanno', /Prova 1\s*5\d,\d m s\.l\.m\./.test(testo) && /Prova 3\s*senza GPS/.test(testo));
  const tag = app.E(`valoriCantiere(state.projects[${JSON.stringify(idNardo)}]).quotaPianoCampagna.testo`);
  t(`nel report, «Quota del piano campagna»: «${tag}»`, /^tra 56,\d e 57,\d m s\.l\.m\.$|^5\d,\d m s\.l\.m\.$/.test(tag));
  const conDtm = app.E(`state.projects[${JSON.stringify(idNardo)}].dtm.fonte`);

  await carica('gauss_boaga.tif');
  t('Gauss-Boaga: errore che dice come riproiettarlo, e il DTM di prima resta', /EPSG:3004.*Riproiettalo/.test($(app, 'statoTerreno').textContent) && app.E(`state.projects[${JSON.stringify(idNardo)}].dtm.fonte`) === conDtm);
  await carica('altrove.tif');
  t('un DTM di un\'altra zona: lo dice', /non copre le prove/.test($(app, 'statoTerreno').textContent));
  const nonTiff = new app.w.File([Buffer.from('ciao')], 'foto.tif');
  nonTiff.arrayBuffer = async () => new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]).buffer;
  Object.defineProperty($(app, 'fileDtm'), 'files', { value: [nonTiff], configurable: true });
  $(app, 'fileDtm').dispatchEvent(new app.w.Event('change'));
  await attesa(50);
  t('un file che non è un TIFF: lo dice', /Non è un file TIFF/.test($(app, 'statoTerreno').textContent));

  clic(app, $(app, 'btnTogliDtm'));
  t('«Togli il DTM» lo toglie subito, con Annulla', !app.E(`state.projects[${JSON.stringify(idNardo)}].dtm`) && $(app, 'undoNotificationBanner').style.display === 'flex');
  clic(app, $(app, 'btnUndoDeleteProject'));
  t('Annulla lo rimette', app.E(`state.projects[${JSON.stringify(idNardo)}].dtm.fonte`) === conDtm);
  t('il DTM è nel progetto: viaggia nel salvataggio', JSON.parse(app.w.localStorage.getItem('dpsh_app_state')).projects[idNardo].dtm.fonte === conDtm);

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
