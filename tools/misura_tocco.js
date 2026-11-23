// Misura (non un test): costo di un +1 su uno stato grande. node --max-old-space-size=8000 tools/misura_tocco.js [dist_di_confronto]
const fs = require('fs'), path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('../test/dati/app_in_jsdom');
const STATO_V0 = fs.readFileSync(path.join(__dirname, '..', 'test', 'dati', 'stato_v0.json'), 'utf8');
(async () => {
  const opz = { stato: STATO_V0, idb: telefonoV0() };
  if (process.argv[2]) opz.file = process.argv[2];
  const app = await avviaApp(opz);
  await attesa(300);
  app.E(`(function(){
    const big = (n) => 'data:image/jpeg;base64,' + 'A'.repeat(n);
    const pid = state.currentProjectId;
    const proj = state.projects[pid];
    // 80 prove x 150 intervalli
    const base = state.projects[pid].surveys[Object.keys(proj.surveys)[0]];
    for (let i = 0; i < 80; i++) {
      const s = JSON.parse(JSON.stringify(base));
      s.id = 'SURV_B_' + i; s.header.provaNr = String(100 + i);
      s.logs = []; for (let j = 0; j < 150; j++) s.logs.push({ start: j*0.2, end: (j+1)*0.2, blows: 10 + j % 7, rod: 1 + Math.floor(j/5), lithology: '', note: '' });
      proj.surveys[s.id] = s;
    }
    // 10 foto da 4 MB nello stato della prova aperta (come le lascia renderPhotoGallery)
    state.photos = []; for (let i = 0; i < 10; i++) state.photos.push({ id: 'PH_B_' + i, timestamp: Date.now(), dataUrl: big(1e6) });
    // carta intestata e DTM
    const tid = Object.keys(state.reportTemplates || {})[0];
    if (tid) state.reportTemplates[tid].cartaIntestata = { prima: big(6e5), seguenti: big(6e5) };
    proj.dtm = { celle: 'x'.repeat(8e5) };
    if (proj.notes) proj.notes.html = (proj.notes.html || '') + '<p>' + 'testo '.repeat(2000) + '</p>';
  })()`);
  app.E('saveState()');
  // Dati grandi (passo 2): le stringhe grandi escono dal testo salvato solo dopo che la scrittura in
  // IndexedDB è confermata, quindi serve una breve attesa e un secondo salvataggio prima di misurare.
  await attesa(1500);
  app.E('saveState()');
  const misura = (nome, codice, n = 10) => {
    app.E(codice); // riscaldamento
    const t0 = process.hrtime.bigint();
    for (let i = 0; i < n; i++) app.E(codice);
    const ms = Number(process.hrtime.bigint() - t0) / 1e6 / n;
    console.log(nome.padEnd(28), ms.toFixed(1), 'ms');
  };
  misura('saveState dopo +1', 'state.currentCount++; saveState()');
  misura('updateUI', 'updateUI()', 3);
  console.log('dialogo', JSON.stringify(app.dialogo() && app.dialogo().testo).slice(0,200)); console.log('chiave localStorage', (app.salvato() || '').length, 'caratteri');
  app.chiudi(); process.exit(0);
})().catch(e => { console.error(e); process.exit(1); });
