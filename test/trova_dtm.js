// DTM PER LE PROVE (071t): dalle coordinate delle prove la regione e la provincia (senza rete),
// il riquadro, le tessere Copernicus e Terrarium; la finestra dal Terreno e dal 3D, coi filtri
// DTM/DSM; la scheda e l'area per cercare fuori dall'app; i caricamenti dalla rete, con servizi
// finti: tessere Terrarium (PNG fatti qui col piano noto, tutti i filtri PNG), un GeoTIFF in rete
// letto a pezzi (Range, come i COG di Copernicus), un WCS 1.0.0. Gli errori dicono cosa fare.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const DTM = n => fs.readFileSync(path.join(__dirname, 'dati', 'dtm', n));
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const vicino = (a, b, tol) => a !== null && a !== undefined && Math.abs(a - b) <= tol;

// I piani dei DTM di prova (vedi terreno_dtm.js): in UTM 33 e in gradi.
const pianoUtm = (e, n) => 40 + 0.02 * (e - 754000) + 0.03 * (n - 4453000);
const PIANO_UTM = [pianoUtm(754689.842, 4453962.543), pianoUtm(754723.654, 4453920.337)];
const PIANO_GRADI = [40 + 1000 * (17.99213 - 17.99) + 2000 * (40.19741 - 40.19), 40 + 1000 * (17.99251 - 17.99) + 2000 * (40.19702 - 40.19)];

// ---- Un PNG RGB a 8 bit, con i cinque filtri a rotazione (così il decodificatore li prova tutti) ----
function png(w, h, rgb) {
  const riga = w * 3, raw = Buffer.alloc((riga + 1) * h);
  for (let y = 0; y < h; y++) {
    const f = y % 5, o = y * (riga + 1), cur = rgb.subarray(y * riga, (y + 1) * riga), su = y ? rgb.subarray((y - 1) * riga, y * riga) : null;
    raw[o] = f;
    for (let x = 0; x < riga; x++) {
      const a = x >= 3 ? cur[x - 3] : 0, b = su ? su[x] : 0, c = x >= 3 && su ? su[x - 3] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      raw[o + 1 + x] = (cur[x] - p) & 255;
    }
  }
  const crc = (() => { const tab = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; tab[n] = c >>> 0; } return b => { let c = 0xFFFFFFFF; for (const x of b) c = tab[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }; })();
  const pezzo = (tipo, dati) => { const l = Buffer.alloc(4); l.writeUInt32BE(dati.length); const td = Buffer.concat([Buffer.from(tipo), dati]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), pezzo('IHDR', ihdr), pezzo('IDAT', zlib.deflateSync(raw)), pezzo('IEND', Buffer.alloc(0))]);
}

// Un fetch finto: le risposte le decide chi lo usa; ogni richiesta resta registrata.
function rispostaFinta(app, corpo, { status = 200, tipo = 'application/octet-stream' } = {}) {
  const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(corpo);
  return {
    ok: status >= 200 && status < 300, status, headers: { get: k => /content-type/i.test(k) ? tipo : null },
    arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.length),
    text: async () => buf.toString('utf8')
  };
}
function servi(app, gestore) {
  const richieste = [];
  app.w.fetch = async (url, opz = {}) => {
    const range = opz.headers && opz.headers.Range;
    richieste.push({ url: String(url), range });
    return gestore(String(url), range, richieste);
  };
  return richieste;
}
// Un file servito come S3: Range → 206 coi soli byte chiesti.
function conRange(app, buf, range) {
  if (!range) return rispostaFinta(app, buf);
  const [, a, b] = /bytes=(\d+)-(\d+)/.exec(range);
  return rispostaFinta(app, buf.subarray(+a, Math.min(buf.length, +b + 1)), { status: 206 });
}

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.DecompressionStream = globalThis.DecompressionStream;
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const idNardo = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(idNardo)}]`;
  app.E(`openProject(${JSON.stringify(idNardo)}); switchView('project')`);
  await attesa(50);
  const quote = () => [1, 2].map(n => app.E(`(() => { const s = Object.values(${P}.surveys).find(s => s.header.provaNr == '${n}'); return quotaDellaProva(${P}, s.header); })()`));

  // ---- Dove sono: regione e provincia senza rete ----
  const luogo = app.E(`(() => { const l = luogoDelleProve(${P}); return { regioni: l.regioni, province: l.province.map(v => v[0]), zona: l.zona, n: l.punti.length, tot: l.totaleProve, bbox: l.bbox }; })()`);
  t(`le prove di Nardò sono in Puglia, provincia di Lecce, fuso 33 (${JSON.stringify(luogo.regioni)} ${luogo.province} ${luogo.zona})`, luogo.regioni.join() === '16' && luogo.province.join() === 'LE' && luogo.zona === 33 && luogo.n === 2 && luogo.tot === 4);
  const prov = (lat, lng) => app.E(`(() => { const r = provinceDelPunto(${lat}, ${lng}); return r.dentro ? r.dentro[0] + ':' + r.dentro[2] : null; })()`);
  const casi = [[45.4642, 9.19, 'MI:3'], [41.9028, 12.4964, 'RM:12'], [46.4983, 11.3548, 'BZ:4'], [46.0679, 11.1211, 'TN:4'], [38.1157, 13.3615, 'PA:19'], [39.2238, 9.1217, 'CA:20'], [43.7696, 11.2558, 'FI:9'], [44.4949, 11.3426, 'BO:8']];
  const sbagliati = casi.filter(([la, lo, att]) => prov(la, lo) !== att).map(([la, lo, att]) => `${att} → ${prov(la, lo)}`);
  t(`capoluoghi riconosciuti (Milano, Roma, Bolzano, Trento, Palermo, Cagliari, Firenze, Bologna)${sbagliati.length ? ': ' + sbagliati.join(', ') : ''}`, !sbagliati.length);
  t('in mare aperto e all\'estero: nessuna provincia', prov(39.5, 15.0) === null && prov(48.85, 2.35) === null);
  const confine = app.E(`(() => { const r = provinceDelPunto(44.885, 11.605); return [r.dentro && r.dentro[0], r.vicine.map(v => v[0])]; })()`);
  t(`vicino a un confine si propongono le province accanto (Pontelagoscuro, sul Po: ${confine[0]}, accanto ${confine[1].join(', ')})`, confine[0] === 'FE' && confine[1].includes('RO'));

  // ---- Tessere ----
  const cop = app.E(`tessereCopernicus({ s: 40.19, n: 40.2, o: 17.98, e: 18.01 }).map(t => t.nome)`);
  t(`Copernicus: le tessere da 1° che coprono il riquadro (${cop.join(', ')})`, cop.join() === 'Copernicus_DSM_COG_10_N40_00_E017_00_DEM,Copernicus_DSM_COG_10_N40_00_E018_00_DEM');
  t('Copernicus: l\'indirizzo è quello del bucket pubblico', /^https:\/\/copernicus-dem-30m\.s3\.amazonaws\.com\/Copernicus_DSM_COG_10_N40_00_E017_00_DEM\/Copernicus_DSM_COG_10_N40_00_E017_00_DEM\.tif$/.test(app.E(`tessereCopernicus({ s: 40.19, n: 40.2, o: 17.98, e: 17.99 })[0].url`)));
  const ter = app.E(`tessereTerrarium(luogoDelleProve(${P}).bbox).map(t => t.nome)`);
  t(`Terrarium: tessere z15 del riquadro (${ter.join(' ')})`, ter.length >= 1 && ter.length <= 4 && ter.every(n => /^15\/\d+\/\d+$/.test(n)) && ter.includes('15/18021/12381'));
  t('Terrarium: con prove lontane si scende di livello per non chiedere troppe tessere', app.E(`(() => { const ts = tessereTerrarium({ s: 40, n: 40.5, o: 17.5, e: 18.2 }); return ts.length <= 30 && ts[0].z < 15; })()`));

  // ---- La finestra, dal Terreno ----
  app.E('apriTerreno()');
  await attesa(20);
  clic(app, $(app, 'btnTrovaDtm'));
  await attesa(20);
  t('da «Terreno e sezioni», «Trova un DTM» apre la finestra sopra', !$(app, 'trovaDtm').hidden && $(app, 'modalTerreno').classList.contains('open'));
  const testoLuogo = $(app, 'trovaDtmLuogo').textContent;
  t('la finestra dice regione, provincia, quante prove col GPS e il riquadro in UTM e gradi', /Puglia/.test(testoLuogo) && /Lecce \(LE\)/.test(testoLuogo) && /2 su 4/.test(testoLuogo) && /UTM 33N/.test(testoLuogo) && /lat 40\.19/.test(testoLuogo));
  const fonti = () => [...app.d.querySelectorAll('#trovaDtmFonti .fonte-dtm')].map(a => a.dataset.fonte);
  const tutte = fonti();
  t(`prima le fonti della regione, poi quelle nazionali (${tutte.join(', ')})`, tutte[0] === 'puglia' && ['copernicus30', 'terrarium', 'tinitaly', 'mase-lidar'].every(id => tutte.includes(id)) && !tutte.includes('emilia'));
  const scheda = id => app.d.querySelector(`#trovaDtmFonti [data-fonte="${id}"]`);
  t('Copernicus: nella sua scheda la tessera da scaricare, col link', /Copernicus_DSM_COG_10_N40_00_E017_00_DEM/.test(scheda('copernicus30').textContent) && scheda('copernicus30').querySelector('a[href$="E017_00_DEM.tif"]'));
  t('TINITALY: il riquadro in UTM 32 (il suo sistema per tutta Italia)', /Riquadro UTM 32N/.test(scheda('tinitaly').textContent));
  t('ogni fonte ha «Apri la pagina»; «Carica» solo dove si può', [...app.d.querySelectorAll('#trovaDtmFonti .fonte-dtm')].every(a => a.querySelector('a.bt[href^="http"]')) && !!scheda('terrarium').querySelector('[data-azione-dtm="carica"]') && !scheda('tinitaly').querySelector('[data-azione-dtm="carica"]'));
  t('ogni fonte dice quanto è verificata l\'informazione', [...app.d.querySelectorAll('.fonte-dtm-verifica')].every(p => /provato|cataloghi|da confermare/.test(p.textContent)));
  clic(app, app.d.querySelector('#trovaDtm [data-tipo-dtm="DSM"]'));
  const soloDsm = fonti();
  t(`filtro DSM: restano solo i modelli di superficie (${soloDsm.join(', ')})`, soloDsm.includes('copernicus30') && !soloDsm.includes('tinitaly') && !soloDsm.includes('puglia'));
  clic(app, app.d.querySelector('#trovaDtm [data-tipo-dtm="tutti"]'));
  t('«Cerca anche»: cataloghi e ricerca col nome della regione', /RNDT/.test($(app, 'trovaDtmCerca').textContent) && !!app.d.querySelector('#trovaDtmCerca a[href*="Puglia"]'));
  t('senza DTM nel progetto non c\'è «DTM del progetto (.asc)»', $(app, 'trovaDtmRitaglio').hidden);

  // ---- Scheda e area ----
  clic(app, $(app, 'trovaDtmScheda'));
  await attesa(10);
  const txt = app.scaricati.length ? await app.scaricati[app.scaricati.length - 1].blob.text() : '';
  t('la scheda (.txt) ha tutto per cercare fuori dall\'app: luogo, riquadro in gradi/UTM 32 e 33/WKT, prove, fonti con pagine e tessere',
    /Regione: Puglia/.test(txt) && /Provincia: Lecce \(LE\)/.test(txt) && /UTM 33N \(fuso naturale\)/.test(txt) && /UTM 32N \(fuso esteso\)/.test(txt) && /EPSG:25833/.test(txt)
    && /WKT: POLYGON\(\(/.test(txt) && /DPSH 1: lat 40\.197410, lng 17\.992130/.test(txt) && /tinitaly\.pi\.ingv\.it/.test(txt) && /Copernicus_DSM_COG_10_N40_00_E017_00_DEM\.tif/.test(txt));
  clic(app, $(app, 'trovaDtmArea'));
  await attesa(10);
  const gj = JSON.parse(await app.scaricati[app.scaricati.length - 1].blob.text());
  t('l\'area (GeoJSON): il riquadro e le prove, in gradi', gj.features.length === 3 && gj.features[0].geometry.type === 'Polygon' && gj.features[1].geometry.coordinates[0] === 17.99213);

  // ---- Caricare: Terrarium (PNG fatti qui col piano in UTM 33) ----
  const utmDaGeo = app.w.eval(`(${app.E('utmDaGeo.toString()')})`);
  const tessera = (z, x, y) => {
    const rgb = new Uint8Array(256 * 256 * 3), n = 256 * Math.pow(2, z);
    for (let py = 0; py < 256; py++) for (let px = 0; px < 256; px++) {
      const gx = x * 256 + px + 0.5, gy = y * 256 + py + 0.5;
      const lng = gx / n * 360 - 180, lat = Math.atan(Math.sinh(Math.PI * (1 - 2 * gy / n))) * 180 / Math.PI;
      const u = utmDaGeo(lat, lng, 33), v = pianoUtm(u.x, u.y) + 32768, o = (py * 256 + px) * 3;
      rgb[o] = Math.floor(v / 256); rgb[o + 1] = Math.floor(v) % 256; rgb[o + 2] = Math.floor((v - Math.floor(v)) * 256);
    }
    return png(256, 256, rgb);
  };
  let richieste = servi(app, (url) => {
    const m = /terrarium\/(\d+)\/(\d+)\/(\d+)\.png$/.exec(url);
    return m ? rispostaFinta(app, tessera(+m[1], +m[2], +m[3]), { tipo: 'image/png' }) : rispostaFinta(app, '', { status: 404 });
  });
  clic(app, scheda('terrarium').querySelector('[data-azione-dtm="carica"]'));
  for (let i = 0; i < 200 && !app.E(`!!${P}.dtm`); i++) await attesa(30);
  let q = quote();
  t(`Terrarium: le quote delle prove dal piano (${q.map(v => v && v.toFixed(2)).join(' e ')}, attese ${PIANO_UTM.map(v => v.toFixed(2)).join(' e ')})`, vicino(q[0], PIANO_UTM[0], 0.1) && vicino(q[1], PIANO_UTM[1], 0.1));
  t('Terrarium: chieste solo le tessere del riquadro', richieste.length === ter.length && richieste.every(r => /terrarium\/15\//.test(r.url)));
  const dtmT = app.E(`JSON.parse(JSON.stringify(${P}.dtm))`);
  t(`Terrarium: ritaglio in UTM 33, la fonte lo dice (${dtmT.fonte})`, dtmT.crs.tipo === 'utm' && dtmT.crs.zona === 33 && /Terrarium/.test(dtmT.fonte) && dtmT.nx < 260);
  t('dopo il caricamento la finestra resta aperta e lo dice; ora c\'è «DTM del progetto (.asc)»', !$(app, 'trovaDtm').hidden && /Caricato: Tessere di quota Terrarium/.test($(app, 'trovaDtmEsito').textContent) && !$(app, 'trovaDtmRitaglio').hidden);
  t('«Terreno e sezioni» sotto è già aggiornato (quote delle prove)', /Prova 1\s*\d+,\d m s\.l\.m\./.test($(app, 'statoTerreno').textContent));

  // ---- Il ritaglio in .asc, e si ricarica uguale ----
  clic(app, $(app, 'trovaDtmRitaglio'));
  await attesa(10);
  const asc = app.scaricati[app.scaricati.length - 1];
  t(`DTM del progetto in ASCII Grid, col sistema nel nome (${asc.nome})`, /_EPSG32633\.asc$/.test(asc.nome));
  const ascTesto = await asc.blob.text();
  const qAsc = app.E(`(async () => { const s = leggiAsciiGrid(${JSON.stringify(ascTesto)}); s.epsg = 32633; const d = await ritaglioDaSorgente(s, 'asc', ${P}); return [1, 2].map(n => { const h = Object.values(${P}.surveys).find(s => s.header.provaNr == String(n)).header; return quotaDtm(d, parseFloat(h.lat), parseFloat(h.lng)); }); })()`);
  const qa = await qAsc;
  t(`l'.asc riletto dà le stesse quote (${qa.map(v => v && v.toFixed(2)).join(' e ')})`, vicino(qa[0], q[0], 0.05) && vicino(qa[1], q[1], 0.05));

  // ---- Copernicus: GeoTIFF in rete letto a pezzi (Range) ----
  const tif = DTM('copernicus_N40_E017.tif');
  richieste = servi(app, (url, range) => /N40_00_E017_00_DEM\.tif$/.test(url) ? conRange(app, tif, range) : rispostaFinta(app, 'NoSuchKey', { status: 404 }));
  const prima = app.E(`${P}.dtm.fonte`);
  clic(app, scheda('copernicus30').querySelector('[data-azione-dtm="carica"]'));
  for (let i = 0; i < 200 && app.E(`${P}.dtm.fonte`) === prima; i++) await attesa(30);
  q = quote();
  t(`Copernicus: quote dal piano in gradi (${q.map(v => v && v.toFixed(2)).join(' e ')}, attese ${PIANO_GRADI.map(v => v.toFixed(2)).join(' e ')})`, vicino(q[0], PIANO_GRADI[0], 0.1) && vicino(q[1], PIANO_GRADI[1], 0.1));
  const pezzi = richieste.filter(r => r.range && !/bytes=0-/.test(r.range));
  t(`Copernicus: si leggono le intestazioni e solo la tessera interna che serve (${pezzi.length} pezzo su 4), mai il file intero`, richieste.every(r => r.range) && pezzi.length === 1);
  t('Copernicus: la fonte nomina la tessera', /Copernicus DEM GLO-30.*N40_00_E017/.test(app.E(`${P}.dtm.fonte`)));
  t('sostituire un DTM si annulla: c\'è il banner, e Annulla rimette quello di prima', $(app, 'undoNotificationBanner').style.display === 'flex');
  clic(app, $(app, 'btnUndoDeleteProject'));
  t('(Annulla ha rimesso il Terrarium)', app.E(`${P}.dtm.fonte`) === prima);

  // ---- Il servizio non lascia leggere (CORS) o non risponde ----
  servi(app, () => { throw new TypeError('Failed to fetch'); });
  clic(app, scheda('copernicus30').querySelector('[data-azione-dtm="carica"]'));
  for (let i = 0; i < 100 && !/non permette/.test($(app, 'trovaDtmEsito').textContent); i++) await attesa(20);
  t('rete bloccata (CORS): l\'errore dice di usare «Scarica» o «Apri la pagina», e il DTM resta', /non permette.*Scarica.*Apri la pagina/.test($(app, 'trovaDtmEsito').textContent) && app.E(`${P}.dtm.fonte`) === prima);

  // ---- «Scarica» delle tessere Copernicus: l'indirizzo diretto, che il CORS non blocca ----
  const aperti = [];
  const clicVero = app.w.HTMLAnchorElement.prototype.click;
  app.w.HTMLAnchorElement.prototype.click = function () { if (/^https?:/.test(this.href)) aperti.push(this.href); else clicVero.call(this); };
  clic(app, scheda('copernicus30').querySelector('[data-azione-dtm="scarica"]'));
  await attesa(20);
  t('«Scarica» Copernicus apre l\'indirizzo della tessera', aperti.length === 1 && /E017_00_DEM\.tif$/.test(aperti[0]) && /Scaricamento chiesto/.test($(app, 'trovaDtmEsito').textContent));

  // ---- WCS 1.0.0: GetCapabilities, DescribeCoverage, GetCoverage (servizio finto) ----
  const CAP = '<WCS_Capabilities><ContentMetadata><CoverageOfferingBrief><name>dtm5</name><label>DTM 5 m</label></CoverageOfferingBrief></ContentMetadata></WCS_Capabilities>';
  const DESC = '<CoverageDescription><CoverageOffering><name>dtm5</name><supportedCRSs><requestResponseCRSs>EPSG:3003</requestResponseCRSs><requestResponseCRSs>EPSG:25832</requestResponseCRSs><requestResponseCRSs>EPSG:25833</requestResponseCRSs></supportedCRSs><supportedFormats><formats>PNG</formats><formats>GTiff</formats></supportedFormats></CoverageOffering></CoverageDescription>';
  const lzw = DTM('utm33_lzw_pred3.tif');
  let rispostaCoverage = () => rispostaFinta(app, lzw, { tipo: 'image/tiff' });
  richieste = servi(app, (url) => /GetCapabilities/.test(url) ? rispostaFinta(app, CAP) : /DescribeCoverage/.test(url) ? rispostaFinta(app, DESC) : rispostaCoverage(url));
  app.E(`_wcsScoperti.clear(); caricaFonteDtm(FONTI_DTM.find(f => f.id === 'emilia'))`);
  for (let i = 0; i < 200 && !/Caricato|Emilia/.test($(app, 'trovaDtmEsito').textContent); i++) await attesa(20);
  const gc = richieste.find(r => /GetCoverage/.test(r.url));
  t(`WCS: scopre il coverage e chiede il riquadro nel fuso delle prove, in GeoTIFF (${gc && gc.url.replace(/^.*\?/, '').slice(0, 120)}…)`, !!gc && /COVERAGE=dtm5/.test(gc.url) && /CRS=EPSG:25833/.test(gc.url) && /FORMAT=GTiff/.test(gc.url) && /BBOX=754\d{3},4453\d{3},754\d{3},445\d{4}/.test(gc.url));
  q = quote();
  t(`WCS: le quote dal GeoTIFF ricevuto (${q.map(v => v && v.toFixed(2)).join(' e ')})`, vicino(q[0], PIANO_UTM[0], 0.05) && vicino(q[1], PIANO_UTM[1], 0.05) && /WCS/.test(app.E(`${P}.dtm.fonte`)));
  const fonteWcs = app.E(`${P}.dtm.fonte`);
  rispostaCoverage = () => rispostaFinta(app, '<?xml version="1.0"?><ServiceExceptionReport><ServiceException code="InvalidParameterValue">BBOX fuori dal coverage</ServiceException></ServiceExceptionReport>', { tipo: 'application/vnd.ogc.se_xml' });
  app.E(`_wcsScoperti.clear(); caricaFonteDtm(FONTI_DTM.find(f => f.id === 'emilia'))`);
  for (let i = 0; i < 100 && !/BBOX fuori/.test($(app, 'trovaDtmEsito').textContent); i++) await attesa(20);
  t('WCS: se il servizio risponde con un errore, lo riporta con le sue parole', /BBOX fuori dal coverage/.test($(app, 'trovaDtmEsito').textContent) && app.E(`${P}.dtm.fonte`) === fonteWcs);
  richieste = servi(app, (url) => /GetCapabilities/.test(url) ? rispostaFinta(app, CAP) : rispostaFinta(app, DESC.replace(/EPSG:2583\d/g, 'EPSG:3003')));
  app.E(`_wcsScoperti.clear(); caricaFonteDtm(FONTI_DTM.find(f => f.id === 'emilia'))`);
  for (let i = 0; i < 100 && !/non converte/.test($(app, 'trovaDtmEsito').textContent); i++) await attesa(20);
  t('WCS solo in Gauss-Boaga: lo dice, senza chiedere il coverage', /EPSG:3003/.test($(app, 'trovaDtmEsito').textContent) && !richieste.some(r => /GetCoverage/.test(r.url)));

  // ---- Esc chiude solo questa finestra ----
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  t('Esc chiude la finestra, non «Terreno e sezioni» sotto', $(app, 'trovaDtm').hidden && $(app, 'modalTerreno').classList.contains('open'));

  // ---- Un progetto senza GPS ----
  const idSenza = app.E(`Object.keys(state.projects).find(id => !proveConCoordinate(state.projects[id]).length) || null`);
  if (idSenza) {
    app.E(`apriTrovaDtm(${JSON.stringify(idSenza)})`);
    t('progetto senza GPS: dice cosa serve e lascia caricare da file', /serve il GPS/.test($(app, 'trovaDtmLuogo').textContent) && $(app, 'trovaDtmScheda').disabled && !$(app, 'trovaDtmDaFile').disabled);
    app.E('chiudiTrovaDtm()');
  }

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
