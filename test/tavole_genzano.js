// PROGETTO INVENTATO «GENZANO»: la vita completa delle tavole su un progetto con 6 prove inventate
// (GPS, colpi, strati): crea le pagine, aggiunge una vista Sud, il confronto e un disegno libero con
// quota; salva, blocca, cambia i dati e controlla l'avviso («duplica e aggiorna»), l'elenco e
// che il progetto salvato si rilegge uguale (come dopo una chiusura e riapertura).
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
  // Genzano di Roma (inventato): 6 prove su due file, colpi crescenti con la profondità e un po' di rumore ripetibile.
  app.E(`(() => { const pr = ${P}, S = pr.surveys, base = Object.values(S).find(s => (s.logs || []).length > 3);
    Object.keys(S).forEach(k => delete S[k]); delete pr.dtm;
    pr.name = 'GENZANO · Palestra comunale'; pr.comune = 'Genzano di Roma'; pr.localita = 'Via dei Laghi'; pr.committente = 'Comune di Genzano';
    let seme = 7; const caso = () => (seme = (seme * 1103515245 + 12345) % 2147483648) / 2147483648;
    const punti = [[0, 0], [30, 5], [60, 0], [0, 30], [30, 35], [60, 30]];
    punti.forEach(([x, y], i) => { const sv = JSON.parse(JSON.stringify(base)); sv.id = 'gz' + i; sv.header.provaNr = String(i + 1); delete sv.header.interpretazioneDi;
      sv.header.comune = pr.comune; sv.header.localita = pr.localita; sv.header.committente = pr.committente;
      sv.header.lat = 41.7068 + y / 111000; sv.header.lng = 12.6995 + x / 83000;
      const n = 14 + Math.floor(caso() * 8); sv.logs = []; for (let k = 0; k < n; k++) sv.logs.push({ start: k * 0.2, end: (k + 1) * 0.2, colpi: Math.max(1, Math.round(2 + k * 0.7 + caso() * 4)), asta: 1 + Math.floor(k / 5), note: '' });
      S[sv.id] = sv; }); })()`);
  app.E(`openProject(${JSON.stringify(pid)}); apriVista3d('3d')`);
  await attesa(50);
  app.E('vista3d.livelli.solido = true; creaGrigliaAssi3d(1, 1); renderVista3d()');
  clic(app, $(app, 'btnTavole3d')); await attesa(30);

  console.log('--- Genzano: le pagine e le aggiunte ---');
  const n0 = app.E('tavole3d.voci.length');
  t(`ci sono le pagine di base (${n0})`, n0 >= 4);
  $(app, 'tavole3dVersoNuova').value = 'S'; clic(app, $(app, 'tavole3dAggiungiVista'));
  clic(app, $(app, 'tavole3dConfronto'));
  clic(app, $(app, 'tavole3dAggiungiLibero'));
  t('vista Sud, confronto prove e disegno libero sono pagine', app.E('tavole3d.voci.length') === n0 + 3 && app.E('tavole3d.voci.some(v => v.tipo === "confronto") && tavole3d.voci.some(v => v.tipo === "libero") && tavole3d.voci.some(v => v.id.startsWith("iso-x"))'));
  app.E(`(() => { const l = tavole3d.bozza.liberi[0]; l.forme.push(formaLiberaPulita({ t: 'misura', x1: 100, y1: 200, x2: 900, y2: 200 }), formaLiberaPulita({ t: 'scala', x1: 100, y1: 700, testo: '5' }), formaLiberaPulita({ t: 'testo', x1: 120, y1: 150, testo: 'Palestra' })); salvaMemoriaTavole3d(); mostraTavola3d(); })()`);
  t('il disegno libero ha la quota in metri (8,00 m su 800 px a 100 px/m)', /8,00 m/.test($(app, 'tavole3dLiberoSvg').innerHTML));

  console.log('--- La schermata a schede ---');
  const vis = g => !app.d.querySelector(`[data-tavole-gruppo="${g}"]`).hidden;
  t('all\'apertura: scheda Pagina; Foglio e Scena nascosti', vis('pagina') && !vis('foglio') && !vis('mappa') && !vis('modello') && !vis('elementi'));
  clic(app, app.d.querySelector('.tavole-scheda[data-scheda="scena"]'));
  t('scheda Scena: mappa e modello, non il foglio', vis('mappa') && vis('modello') && !vis('pagina') && !vis('foglio'));
  clic(app, app.d.querySelector('.tavole-scheda[data-scheda="foglio"]'));
  t('scheda Foglio: aprire il tab mostra il foglio e segna aria-selected', vis('foglio') && app.d.querySelector('.tavole-scheda[data-scheda="foglio"]').getAttribute('aria-selected') === 'true' && app.d.querySelector('[data-tavole-gruppo="foglio"]').open);
  clic(app, app.d.querySelector('.tavole-scheda[data-scheda="pagina"]'));
  t('il nome del progetto è nella barra', /GENZANO/.test($(app, 'tavole3dProgetto').textContent));

  console.log('--- Genzano: salvare e rileggere ---');
  t('prima di Salva il progetto non ha tavole salvate', app.E(`!(${P}.tavole3d && ${P}.tavole3d.registro && ${P}.tavole3d.registro.length)`));
  clic(app, $(app, 'tavole3dSalva')); await attesa(30);
  const nReg = app.E(`${P}.tavole3d.registro.length`);
  t(`Salva crea una tavola per pagina nel registro (${nReg})`, nReg === n0 + 3 && app.E(`${P}.tavole3d.registro.every(x => x.versione === 1 && !x.bloccata)`));
  const riletto = JSON.parse(app.E(`JSON.stringify(${P}.tavole3d)`));
  t('il progetto salvato si rilegge uguale: registro, vista aggiunta, confronto, disegno', riletto.registro.length === nReg && riletto.extra.length === 1 && !!riletto.confronto && riletto.liberi[0].forme.length === 3);
  t('la tavola del disegno libero ricorda le sue forme', riletto.registro.some(x => x.tipo === 'libero' && x.impostazioni.libero && x.impostazioni.libero.forme.length === 3));

  console.log('--- Genzano: blocco e dati cambiati ---');
  const i = app.E('tavole3d.voci.findIndex(v => v.tipo === "libero")'); app.E(`tavole3d.scelta = ${i}; mostraTavola3d()`);
  clic(app, $(app, 'tavole3dBlocca')); clic(app, $(app, 'tavole3dSalva')); await attesa(30);
  t('il disegno libero è bloccato nel progetto', app.E(`${P}.tavole3d.registro.find(x => x.tipo === 'libero').bloccata`) === true);
  clic(app, $(app, 'tavole3dChiudi')); await attesa(30);
  // una settima prova: i dati sono cambiati
  app.E(`(() => { const S = ${P}.surveys, b = JSON.parse(JSON.stringify(S.gz0)); b.id = 'gz6'; b.header.provaNr = '7'; b.header.lat += 0.0003; b.header.lng += 0.0004; S.gz6 = b; })()`);
  app.E('apriVista3d("3d"); renderVista3d()'); await attesa(30);
  clic(app, $(app, 'btnTavole3d')); await attesa(60);
  const d = app.dialogo();
  t('con una prova in più si apre l\'avviso sui dati cambiati', !!d && /dati delle prove sono cambiati/.test(d.testo) && /Duplica e aggiorna/.test(d.ok.textContent));
  if (d) clic(app, d.ok);
  await attesa(30);
  const nDopo = app.E('registroTavole({ tavole3d: tavole3d.bozza }).length');
  t('«Duplica e aggiorna»: le tavole vecchie restano (storiche) e ne nascono di nuove', nDopo > nReg && app.E('registroTavole({ tavole3d: tavole3d.bozza }).some(x => x.storica && x.bloccata)') === true);
  clic(app, $(app, 'tavole3dSalva')); await attesa(30);
  t('dopo Salva l\'elenco mostra anche le nuove', app.E(`${P}.tavole3d.registro.length`) === nDopo);

  console.log('--- Genzano: il controllo di stampa ---');
  const msg = $(app, 'tavole3dControllo').textContent;
  t('il controllo dice se la tavola è pronta o cosa manca', msg.length > 0);
  if (app.errori.length) console.log('ERRORI:', app.errori.slice(0, 3).map(e => String(e).slice(0, 250)).join(' | '));
  t('l\'app non ha dato errori', app.errori.length === 0);
  console.log(`\n${ok} ok, ${ko} KO`); process.exit(ko ? 1 : 0);
})();
