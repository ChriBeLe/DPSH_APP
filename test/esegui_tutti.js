// Esegue tutte le suite di test/ una per una, ciascuna nel suo processo, e fa il riepilogo.
//
//   node test/esegui_tutti.js            tutte le suite
//   node test/esegui_tutti.js foto note  solo quelle il cui nome contiene "foto" o "note"
//
// Una suite è "OK" se esce con codice 0 e non stampa righe che iniziano con "KO" o "✗".
// Le suite storiche non hanno tutte lo stesso formato di uscita: per questo si guardano
// entrambe le cose. Il riepilogo finale confronta con test/base_attesa.json, che elenca le
// suite che erano già rosse al momento della copia (Fase 0): un rosso NUOVO è una regressione,
// un rosso già noto no — ma resta scritto, così non ce lo si dimentica.

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const DIR = __dirname;
const filtri = process.argv.slice(2);
const escluse = new Set(['esegui_tutti.js', '_probe.js']);
const suite = fs.readdirSync(DIR)
  .filter(f => f.endsWith('.js') && !escluse.has(f))
  .filter(f => filtri.length === 0 || filtri.some(x => f.includes(x)))
  .sort();

let base = {};
try { base = JSON.parse(fs.readFileSync(path.join(DIR, 'base_attesa.json'), 'utf8')); } catch (e) { /* nessuna base: tutto deve passare */ }
const giaRosse = new Set(base.giaRosse || []);

const esiti = [];
for (const f of suite) {
  const inizio = Date.now();
  const r = spawnSync(process.execPath, [path.join(DIR, f)], { encoding: 'utf8', timeout: 180000, cwd: path.dirname(DIR) });
  const uscita = (r.stdout || '') + (r.stderr || '');
  const righeKo = uscita.split('\n').filter(l => /^\s*(KO\b|✗|FAIL\b)/.test(l));
  const ok = r.status === 0 && righeKo.length === 0;
  esiti.push({ f, ok, codice: r.status, righeKo, uscita, ms: Date.now() - inizio });
  const segno = ok ? 'OK ' : (giaRosse.has(f) ? 'ko*' : 'KO ');
  console.log(`${segno} ${f}  (${esiti[esiti.length - 1].ms} ms)`);
  if (!ok) {
    const mostra = righeKo.length ? righeKo : uscita.trim().split('\n').slice(-6);
    mostra.slice(0, 8).forEach(l => console.log('      ' + l.trim()));
  }
}

const rosse = esiti.filter(e => !e.ok).map(e => e.f);
const nuove = rosse.filter(f => !giaRosse.has(f));
const guarite = [...giaRosse].filter(f => suite.includes(f) && !rosse.includes(f));
console.log('\n' + '-'.repeat(60));
console.log(`${esiti.length - rosse.length}/${esiti.length} suite verdi.`);
if (rosse.length) console.log(`Rosse già note (ko*): ${rosse.filter(f => giaRosse.has(f)).join(', ') || 'nessuna'}`);
if (guarite.length) console.log(`Tornate verdi: ${guarite.join(', ')} — toglile da test/base_attesa.json`);
if (nuove.length) {
  console.log(`REGRESSIONI (rosse nuove): ${nuove.join(', ')}`);
  process.exit(1);
}
console.log('Nessuna regressione.');
