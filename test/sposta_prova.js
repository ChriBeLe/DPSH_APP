// SPOSTA LA PROVA: dalla finestra GPS, con coordinate già impostate, si sposta il pin e si conferma
// due volte (annullando una delle due non cambia niente). Solo così la posizione di prima resta in
// memoria (scritta nella finestra, spia «GPS spostato», ripristinabile); spostata di nuovo, la
// memoria resta quella di partenza; se la posizione cambia in un altro modo, la memoria non conta più.
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
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const sid = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys).find(id => state.projects[${JSON.stringify(pid)}].surveys[id].header.lat)`);
  app.E(`apriProvaPerCorreggere(${JSON.stringify(pid)}, ${JSON.stringify(sid)}, 'gps')`);
  await attesa(100);
  app.E('openGpsModal()');
  const pos = () => [Number(app.E('state.header.lat')), Number(app.E('state.header.lng'))];
  const [lat0, lng0] = pos();
  t('con le coordinate, nella finestra GPS c\'è «Sposta la prova» (e non «Torna a prima»)', $(app, 'boxSpostaProva').style.display === 'block' && $(app, 'btnRipristinaPosizione').style.display === 'none');

  const dove = (dLat, dLng) => `({ lat: ${lat0 + dLat}, lng: ${lng0 + dLng} })`;
  const sposta = async (risposte, dLat = 0.0003, dLng = 0.0002) => {
    app.E(`confermaSpostamentoProva(${dove(dLat, dLng)})`);
    const testi = [];
    for (const r of risposte) {
      await attesa(30);
      const dlg = app.dialogo();
      if (!dlg) break;
      testi.push(dlg.titolo + ' | ' + dlg.testo);
      clic(app, r ? dlg.ok : dlg.annulla);
    }
    await attesa(30);
    return testi;
  };
  let testi = await sposta([false]);
  t('prima conferma: da dove a dove e di quanti metri; annullata, la prova resta lì', /Da: .*\nA: .*\nDistanza: 37 m/.test(testi[0].split(' | ')[1]) && pos()[0] === lat0 && !app.E('state.header.spostamento'));
  testi = await sposta([true, false]);
  t('seconda conferma («Sei sicuro…»); annullata, la prova resta lì', testi.length === 2 && /Seconda conferma \| Sei sicuro/.test(testi[1]) && pos()[0] === lat0 && !app.E('state.header.spostamento'));
  await sposta([true, true]);
  t('confermata due volte, la prova si sposta', Math.abs(pos()[0] - (lat0 + 0.0003)) < 1e-12);
  t('e la posizione di prima resta in memoria', app.E('state.header.spostamento.da.lat') === lat0 && app.E('state.header.spostamento.da.lng') === lng0);
  t('la finestra lo dice (quando, di quanto, la posizione di prima) e offre «Torna a prima»', /Prova spostata a mano.*di 37 m/.test($(app, 'lblProvaSpostata').textContent) && $(app, 'lblProvaSpostata').textContent.includes(lat0.toFixed(6)) && $(app, 'btnRipristinaPosizione').style.display === '');
  t('la spia della prova dice «GPS spostato»', $(app, 'lblSpiaGps').textContent === 'GPS spostato');
  t('è salvata nella prova', app.E(`state.projects[${JSON.stringify(pid)}].surveys[${JSON.stringify(sid)}].header.spostamento.da.lat`) === lat0);

  await sposta([true, true], 0.0006, 0.0004);
  t('spostata di nuovo: in memoria resta la posizione di partenza', Math.abs(pos()[0] - (lat0 + 0.0006)) < 1e-12 && app.E('state.header.spostamento.da.lat') === lat0);

  clic(app, $(app, 'btnRipristinaPosizione'));
  await attesa(30);
  clic(app, app.dialogo().ok);
  await attesa(30);
  t('«Torna a prima» la riporta alla posizione di prima e svuota la memoria', pos()[0] === lat0 && pos()[1] === lng0 && !app.E('state.header.spostamento') && $(app, 'lblSpiaGps').textContent === 'GPS');

  await sposta([true, true]);
  // ora la posizione cambia in un altro modo (coordinate scritte a mano e «Salva»): la memoria non conta più
  app.E('openGpsModal()');
  $(app, 'numModalGpsLat').value = String(lat0 + 0.01);
  clic(app, $(app, 'btnSaveGpsModal'));
  await attesa(30);
  app.E('openGpsModal()');
  t('se la posizione cambia in un altro modo, niente «spostata» né «Torna a prima»', $(app, 'lblSpiaGps').textContent === 'GPS' && $(app, 'lblProvaSpostata').style.display === 'none' && $(app, 'btnRipristinaPosizione').style.display === 'none');
  await sposta([true, true], 0.02, 0);
  t('e il prossimo spostamento ricorda quella nuova come «di prima»', Math.abs(app.E('state.header.spostamento.da.lat') - (lat0 + 0.01)) < 1e-12);

  t('nessun errore', app.errori.length === 0);
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
