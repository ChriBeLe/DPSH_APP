// IL SISTEMA DI RIFERIMENTO DEL PROGETTO: nella finestra GPS si sceglie (di base WGS84 in gradi); in UTM
// le coordinate si scrivono e si incollano come Est e Nord, e dentro restano in gradi WGS84.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.click();
  await attesa(30);
  const $ = id => app.w.document.getElementById(id);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const surv = app.E(`Object.keys(state.projects[${JSON.stringify(pid)}].surveys)`);
  app.E(`openProject(${JSON.stringify(pid)}); syncProjectToActiveState(${JSON.stringify(pid)}, ${JSON.stringify(surv[0])}); switchView('field'); openGpsModal()`);
  t('di base il progetto è in WGS84 gradi: lat e lng', $('selSrProgetto').value === '4326' && $('boxGpsGradi').style.display === 'grid' && $('boxGpsUtm').style.display === 'none');
  t('i sistemi: WGS84 gradi e UTM 32-33-34 in WGS84, ETRS89, RDN2008', $('selSrProgetto').options.length === 10 && [...$('selSrProgetto').options].some(o => o.value === '25833'));

  $('selSrProgetto').value = '25833';
  $('selSrProgetto').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  t('scelto ETRS89 / UTM 33N: resta nel progetto, e si scrivono Est e Nord', app.E(`state.projects[${JSON.stringify(pid)}].sr`) === 25833 && $('boxGpsUtm').style.display === 'grid' && $('boxGpsGradi').style.display === 'none');

  $('numModalGpsE').value = '471719.850'; $('numModalGpsN').value = '4115631.129';
  $('numModalGpsE').dispatchEvent(new app.w.Event('input', { bubbles: true }));
  const lat = parseFloat($('numModalGpsLat').value), lng = parseFloat($('numModalGpsLng').value);
  const torna = app.E(`utmDaGeo(${lat}, ${lng}, 33)`);
  t(`Est e Nord diventano gradi (${lat.toFixed(6)}, ${lng.toFixed(6)}) e tornano uguali al millimetro`, Math.abs(torna.x - 471719.85) < 0.002 && Math.abs(torna.y - 4115631.129) < 0.002 && lat > 37 && lat < 37.3 && lng > 14.5 && lng < 14.8);
  $('btnSaveGpsModal').click();
  t('salvate nella prova in gradi WGS84', Math.abs(app.E('state.header.lat') - lat) < 1e-9);

  app.E('openGpsModal()');
  t(`riaperta, la finestra le mostra in Est e Nord (${$('numModalGpsE').value}, ${$('numModalGpsN').value}) e il riquadro anche nel sistema`, $('numModalGpsE').value === '471719.850' && $('numModalGpsN').value === '4115631.129' && /ETRS89 \/ UTM 33N/.test($('lblModalGpsStatus').textContent));

  $('txtPasteCoords').value = 'DPSH4\t471989.364,4115634.032';
  $('btnApplyPastedCoords').click();
  const inc = app.E(`utmDaGeo(${parseFloat($('numModalGpsLat').value)}, ${parseFloat($('numModalGpsLng').value)}, 33)`);
  t('incollata una riga «DPSH4 <tab> E,N»: riconosciuta', Math.abs(inc.x - 471989.364) < 0.002 && Math.abs(inc.y - 4115634.032) < 0.002 && $('numModalGpsE').value === '471989.364');
  t('anche «E N» con la virgola dei decimali', !!app.E(`geoDaTestoUtm('471719,85 4115631,13', { zona: 33 })`) && !app.E(`geoDaTestoUtm('41.84, 12.56', { zona: 33 })`));

  app.E(`closeAnyOpenModal(); apriVista3d('mappa')`);
  await attesa(80);
  t('nella mappa del progetto c\'è lo stesso menu, sul sistema del progetto', $('selSrMappa').value === '25833');
  app.E('coordinateAreaMappa(37.186697, 14.68138)');
  t(`le coordinate sotto il mouse nel sistema (${$('lblAreaMappaCoord').textContent})`, /^E 471\.?719,\d+ N 4\.?115\.?631,\d+$/.test($('lblAreaMappaCoord').textContent));
  $('selSrMappa').value = '4326';
  $('selSrMappa').dispatchEvent(new app.w.Event('change', { bubbles: true }));
  app.E('coordinateAreaMappa(37.186697, 14.68138)');
  t('cambiato dalla mappa: vale per il progetto e per la finestra GPS', app.E(`state.projects[${JSON.stringify(pid)}].sr`) === 4326 && $('selSrProgetto').value === '4326' && $('lblAreaMappaCoord').textContent === '37.186697, 14.681380');

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
