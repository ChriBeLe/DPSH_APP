// LE FINESTRE «PORTA SU UN ALTRO DISPOSITIVO» E «RICEVI UN PROGETTO» (Fase 2, pezzo 044c).
//
// Il giro come lo fa l'utente, coi tocchi: ⋯ del progetto → Porta su un altro dispositivo → Cambia
// nome → Crea il pacchetto; sull'altro dispositivo Ricevi in Home → anteprima → Importa. Poi le
// varianti della finestra Ricevi che il prototipo disegna: progetto già presente e identico, già
// presente e più recente di qui (riquadro giallo, «Tieni entrambi (consigliato)»), la scelta che
// cambia l'etichetta del bottone, il pacchetto rovinato. E: «Ricevi» accetta ancora i JSON di oggi.
// Controprova: nell'app di prima il ⋯ del progetto non ha niente del genere.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const conNome = (nome) => ({ primaDellApp(w) { w.localStorage.setItem('dpsh_nome_dispositivo', nome); } });
const $ = (app, id) => app.d.getElementById(id);
const aperta = (app, id) => $(app, id).classList.contains('open');
async function aspetta(cond, ms = 4000) { const fine = Date.now() + ms; while (Date.now() < fine) { if (cond()) return true; await attesa(30); } return false; }

(async () => {
  console.log('--- Telefono: ⋯ del progetto → Porta su un altro dispositivo ---');
  const tel = await avviaApp(Object.assign({ stato: STATO_V0, idb: telefonoV0() }));
  const pid = tel.E('Object.keys(state.projects)[0]');
  tel.E('openProjectActionsModal(' + JSON.stringify(pid) + ')');
  t('nel ⋯ del progetto c è «Porta su un altro dispositivo»', /Porta su un altro dispositivo/.test($(tel, 'btnProjActPorta').textContent));
  clic(tel, $(tel, 'btnProjActPorta'));
  t('si apre il foglio, e il ⋯ si chiude', aperta(tel, 'modalPortaProgetto') && !aperta(tel, 'modalProjectActions'));
  t('titolo e nome del progetto', $(tel, 'titoloPortaProgetto').textContent === 'Porta su un altro dispositivo' && $(tel, 'lblPortaProgettoNome').textContent === 'Nardò - Scuola Via Roma');
  const numeri = [...$(tel, 'portaProgettoNumeri').querySelectorAll('.numero')].map(n => n.querySelector('b').textContent + ' ' + n.querySelector('span').textContent);
  t('quattro numeri: prove, intervalli, foto, strati (con parametri)', numeri.length === 4 && numeri[0] === '4 prove' && /^\d+ intervalli$/.test(numeri[1]) && numeri[2] === '3 foto' && numeri[3] === '3 strati, con parametri');
  t('tre righe con la spunta verde', $(tel, 'modalPortaProgetto').querySelectorAll('.spunta').length === 3 && /copia esatta/.test($(tel, 'modalPortaProgetto').querySelector('.spunta').textContent));
  t('riga del dispositivo: il nome di serie qui è «PC» (jsdom non è un telefono)', $(tel, 'lblPortaProgettoDispositivo').textContent === 'PC');
  t('mentre calcola, il bottone aspetta', $(tel, 'btnCreaPacchetto').disabled === true);
  await aspetta(() => !$(tel, 'btnCreaPacchetto').disabled);
  t('poi «Crea il pacchetto · peso»', /^Crea il pacchetto · \d+ KB$/.test($(tel, 'lblCreaPacchetto').textContent));
  t('nessun avviso: le foto ci sono tutte', $(tel, 'portaProgettoMancanti').style.display === 'none');
  t('e la nota sui Download', /finisce nei Download/.test($(tel, 'modalPortaProgetto').querySelector('.nota').textContent));

  console.log('--- Cambia nome ---');
  clic(tel, $(tel, 'btnCambiaNomeDispositivo'));
  await attesa(100);
  const d = tel.dialogo();
  t('chiede il nome', !!d && d.titolo === 'Nome di questo dispositivo');
  const campo = tel.d.querySelector('#appDialog [data-campo="valore"]');
  campo.value = 'Telefono di Mario';
  clic(tel, d.ok);
  await attesa(100);
  t('la riga lo mostra, ed è memorizzato sul dispositivo (non nei dati)', $(tel, 'lblPortaProgettoDispositivo').textContent === 'Telefono di Mario'
    && tel.w.localStorage.getItem('dpsh_nome_dispositivo') === 'Telefono di Mario' && !tel.salvato().includes('Telefono di Mario'));

  console.log('--- Crea il pacchetto ---');
  clic(tel, $(tel, 'btnCreaPacchetto'));
  await aspetta(() => tel.dialogo());
  const scaricato = tel.scaricati[tel.scaricati.length - 1];
  t('il file finisce nei Download, col nome del progetto', !!scaricato && /^Nardò_-_Scuola_Via_Roma_\d{4}-\d\d-\d\d\.dpsh\.zip$/.test(scaricato.nome));
  t('il foglio si chiude e un messaggio dice dove è e cosa fare', !aperta(tel, 'modalPortaProgetto') && tel.dialogo().titolo === 'Pacchetto creato' && /Ricevi/.test(tel.dialogo().testo));
  clic(tel, tel.dialogo().ok);
  const pacchetto = Buffer.from(await scaricato.blob.arrayBuffer());

  console.log('--- PC: Ricevi in Home ---');
  const pc = await avviaApp(Object.assign({ stato: null }, conNome('PC ufficio')));
  t('in Home il bottone si chiama «Ricevi»', /Ricevi/.test($(pc, 'btnHomeImportProject').textContent) && !/Importa/.test($(pc, 'btnHomeImportProject').textContent));
  t('e accetta ancora .json e .zip', /\.json/.test($(pc, 'fileImportProjectJson').accept) && /\.zip/.test($(pc, 'fileImportProjectJson').accept));
  const file = new pc.w.File([pacchetto], scaricato.nome, { type: 'application/zip' });
  const ricevi = pc.E('handleImportJsonFile')(file);
  await aspetta(() => aperta(pc, 'modalRiceviProgetto'));
  t('si apre «Ricevi un progetto» col nome del file', aperta(pc, 'modalRiceviProgetto') && $(pc, 'lblRiceviProgettoFile').textContent === scaricato.nome);
  await ricevi;
  await aspetta(() => !$(pc, 'btnRiceviConferma').disabled);
  const corpo = () => $(pc, 'riceviProgettoCorpo').textContent.replace(/\s+/g, ' ');
  t('Controlli: pacchetto integro · N file verificati', /Pacchetto integro · \d+ file verificati/.test(corpo()));
  t('Controlli: versione compatibile, nessuna anomalia', /Versione dei dati compatibile/.test(corpo()) && /Nessuna anomalia nei dati/.test(corpo()));
  t('Cosa arriva: conteggi, da quale dispositivo e quando', /4 prove · \d+ intervalli · 3 foto · 3 strati/.test(corpo()) && /Da Telefono di Mario, esportato il \d\d\/\d\d\/\d{4} alle \d\d:\d\d/.test(corpo()));
  t('non c è sul PC: niente confronto né scelte, bottone «Importa»', !$(pc, 'riceviConfronto') && !pc.d.querySelector('#modalRiceviProgetto .scelta') && $(pc, 'btnRiceviConferma').textContent === 'Importa');
  clic(pc, $(pc, 'btnRiceviConferma'));
  await aspetta(() => pc.dialogo());
  t('importato: il progetto è sul PC e un messaggio lo dice', pc.E('!!state.projects[' + JSON.stringify(pid) + ']') && pc.dialogo().titolo === 'Progetto ricevuto' && !aperta(pc, 'modalRiceviProgetto'));
  t('e compare in Home', /Nardò - Scuola Via Roma/.test($(pc, 'homeProjectsContainer') ? $(pc, 'homeProjectsContainer').textContent : pc.d.body.textContent));
  clic(pc, pc.dialogo().ok);

  console.log('--- Lo stesso pacchetto di nuovo: identico ---');
  pc.E('handleImportJsonFile')(new pc.w.File([pacchetto], scaricato.nome));
  await aspetta(() => aperta(pc, 'modalRiceviProgetto') && !$(pc, 'btnRiceviConferma').disabled);
  t('riquadro neutro: identico, niente da aggiornare', $(pc, 'riceviConfronto') && !$(pc, 'riceviConfronto').classList.contains('avviso') && /identico al pacchetto/.test($(pc, 'riceviConfronto').textContent) && /Sul PC ufficio/.test($(pc, 'riceviConfronto').textContent));
  t('niente scelte; «Chiudi», e «Importa una copia» se proprio si vuole', !pc.d.querySelector('#modalRiceviProgetto .scelta') && $(pc, 'btnRiceviConferma').textContent === 'Chiudi' && $(pc, 'btnRiceviAnnulla').textContent === 'Importa una copia');
  clic(pc, $(pc, 'btnRiceviConferma'));
  t('Chiudi chiude senza toccare niente', !aperta(pc, 'modalRiceviProgetto') && pc.E('Object.keys(state.projects).length') === 1);

  console.log('--- Quello sul PC è più recente: giallo, «Tieni entrambi (consigliato)» ---');
  pc.E('openProject(' + JSON.stringify(pid) + ')');
  for (let i = 0; i < 5; i++) $(pc, 'btnPlus').click();
  $(pc, 'btnConfirmStepAction').click();
  await attesa(30);
  pc.E('saveState()');
  pc.E('handleImportJsonFile')(new pc.w.File([pacchetto], scaricato.nome));
  await aspetta(() => aperta(pc, 'modalRiceviProgetto') && !$(pc, 'btnRiceviConferma').disabled);
  t('riquadro giallo che lo dice', $(pc, 'riceviConfronto').classList.contains('avviso') && /PIÙ RECENTE del pacchetto: modificato il \d\d\/\d\d\/\d{4} alle/.test($(pc, 'riceviConfronto').textContent));
  const scelte = [...pc.d.querySelectorAll('#modalRiceviProgetto .scelta')];
  t('due scelte a radio', scelte.length === 2 && scelte.every(s => s.getAttribute('role') === 'radio'));
  t('«Sostituisci quello sul PC ufficio» e «Tieni entrambi (consigliato)», selezionata', /^Sostituisci quello sul PC ufficio/.test(scelte[0].textContent.trim()) && /Tieni entrambi \(consigliato\)/.test(scelte[1].textContent) && scelte[1].getAttribute('aria-checked') === 'true');
  t('col nome della copia', /«Nardò - Scuola Via Roma \(Telefono di Mario \d\d\/\d\d\)»/.test(scelte[1].textContent));
  t('bottone «Importa come copia»', $(pc, 'btnRiceviConferma').textContent === 'Importa come copia');
  clic(pc, scelte[0]);
  t('scegliendo Sostituisci il bottone diventa «Sostituisci»', $(pc, 'btnRiceviConferma').textContent === 'Sostituisci' && pc.d.querySelectorAll('#modalRiceviProgetto .scelta')[0].getAttribute('aria-checked') === 'true');
  clic(pc, $(pc, 'btnRiceviAnnulla'));
  t('Annulla chiude senza toccare niente', !aperta(pc, 'modalRiceviProgetto') && pc.E('Object.keys(state.projects).length') === 1);

  console.log('--- Pacchetto rovinato ---');
  const rovinato = Buffer.from(pacchetto);
  rovinato[rovinato.length >> 1] ^= 0xff;
  const primaDati = pc.salvato();
  pc.E('handleImportJsonFile')(new pc.w.File([rovinato], 'rovinato.dpsh.zip'));
  await aspetta(() => aperta(pc, 'modalRiceviProgetto') && !$(pc, 'btnRiceviConferma').disabled);
  t('riquadro rosso: non si può ricevere, non è stato importato niente', /non si può ricevere: non è stato importato niente/.test(corpo()) && pc.d.querySelector('#riceviProgettoCorpo .riquadro.errore'));
  t('solo «Chiudi»', $(pc, 'btnRiceviConferma').textContent === 'Chiudi' && $(pc, 'btnRiceviAnnulla').style.display === 'none');
  clic(pc, $(pc, 'btnRiceviConferma'));
  t('e i dati sono quelli di prima', pc.salvato() === primaDati);

  console.log('--- Ricevi accetta ancora i JSON di oggi ---');
  await pc.E('handleImportJsonFile')(new pc.w.File([fs.readFileSync(path.join(__dirname, 'dati', 'progetto_v0.json'))], 'progetto_v0.json', { type: 'application/json' }));
  await attesa(200);
  t('JSON del progetto (formato 0): importato come prima', !!pc.dialogo() && /Importazione completata: 1 progetto importato/.test(pc.dialogo().testo) && !aperta(pc, 'modalRiceviProgetto'));
  pc.chiudi(); tel.chiudi();

  console.log('--- CONTROPROVA sull app di prima ---');
  {
    const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0 });
    t('(controprova) nel ⋯ del progetto non c era niente per portarlo su un altro dispositivo', !vecchia.d.getElementById('btnProjActPorta') && !vecchia.d.getElementById('modalRiceviProgetto'));
    t('(controprova) e in Home c era «Importa»', /Importa/.test(vecchia.d.getElementById('btnHomeImportProject').textContent));
    vecchia.chiudi();
  }

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
