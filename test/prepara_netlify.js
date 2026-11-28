// PUBBLICAZIONE NETLIFY E SERVICE WORKER (tools/prepara_netlify.py, web/, netlify.toml, 076).
//
// 1) prepara_netlify.py su una radice finta e su quella vera: index.html con il manifest su file e non
//    più incorporato, sw.js col nome di cache preso dall'impronta sha256 di index.html, dist/ intatto.
// 2) web/sw.js eseguito in un finto ambiente di worker: activate cancella TUTTE le altre cache (anche
//    dpsh-v5 del sito vecchio), le richieste di altri domini non si intercettano né si mettono in cache,
//    le navigazioni rispondono dalla cache.
// 3) netlify.toml e la CSP della testata; la registrazione è solo su https/localhost.
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const RADICE = path.join(__dirname, '..');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const python = () => { for (const p of ['python3', 'python']) { if (spawnSync(p, ['--version']).status === 0) return p; } return null; };
const PY = python();

(async () => {
  console.log('--- prepara_netlify.py su una radice finta ---');
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dpsh-netlify-'));
  fs.mkdirSync(path.join(tmp, 'dist')); fs.mkdirSync(path.join(tmp, 'web', 'icone'), { recursive: true });
  const manifestIncorporato = `<link rel="manifest" href='data:application/manifest+json,{"name":"X","icons":[{"src":"data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22/>"}]}'>`;
  const html = `<!DOCTYPE html><html><head>${manifestIncorporato}<title>x</title></head><body>app</body></html>`;
  fs.writeFileSync(path.join(tmp, 'dist', 'DPSH.html'), html);
  fs.writeFileSync(path.join(tmp, 'web', 'manifest.webmanifest'), '{"name":"X"}');
  fs.writeFileSync(path.join(tmp, 'web', 'sw.js'), "const VERSIONE = '__VERSIONE_CACHE__';");
  fs.writeFileSync(path.join(tmp, 'web', 'icone', 'a.png'), Buffer.from([1, 2, 3]));
  const script = path.join(RADICE, 'tools', 'prepara_netlify.py');
  const esegui = (radice) => spawnSync(PY, ['-c', `import sys; sys.path.insert(0, ${JSON.stringify(path.join(RADICE, 'tools'))}); import prepara_netlify as p; p.prepara(${JSON.stringify(radice)})`], { encoding: 'utf8' });
  t('python disponibile', !!PY);
  const r = esegui(tmp);
  t('lo script esce senza errori', r.status === 0);
  if (r.status !== 0) console.log(r.stderr);
  const idx = fs.readFileSync(path.join(tmp, 'pubblica', 'index.html'), 'utf8');
  t('il manifest incorporato è sostituito da href="manifest.webmanifest"', idx.includes('<link rel="manifest" href="manifest.webmanifest">') && !idx.includes('application/manifest+json'));
  t('del resto index.html è identico a dist', idx.replace('<link rel="manifest" href="manifest.webmanifest">', manifestIncorporato) === html);
  t('dist/DPSH.html non è stato toccato', fs.readFileSync(path.join(tmp, 'dist', 'DPSH.html'), 'utf8') === html);
  t('manifest e icone copiati da web/', fs.existsSync(path.join(tmp, 'pubblica', 'manifest.webmanifest')) && fs.existsSync(path.join(tmp, 'pubblica', 'icone', 'a.png')));
  t('sw.js: il segnaposto diventa l\'impronta sha256 di index.html', fs.readFileSync(path.join(tmp, 'pubblica', 'sw.js'), 'utf8') === `const VERSIONE = '${sha(idx).slice(0, 16)}';`);
  const senzaDist = fs.mkdtempSync(path.join(os.tmpdir(), 'dpsh-netlify-'));
  t('senza dist/DPSH.html si ferma con un messaggio', esegui(senzaDist).status !== 0);
  fs.writeFileSync(path.join(tmp, 'dist', 'DPSH.html'), '<html><head></head></html>');
  t('senza il manifest incorporato si ferma (la pagina non resterebbe installabile)', esegui(tmp).status !== 0);

  console.log('--- Sui file veri del repo ---');
  const distVero = path.join(RADICE, 'dist', 'DPSH.html');
  if (!fs.existsSync(distVero)) { console.log('  (dist/DPSH.html non c\'è: esegui prima python build.py)'); }
  else {
    const copiaRepo = fs.mkdtempSync(path.join(os.tmpdir(), 'dpsh-netlify-'));
    fs.mkdirSync(path.join(copiaRepo, 'dist'));
    fs.copyFileSync(distVero, path.join(copiaRepo, 'dist', 'DPSH.html'));
    fs.cpSync(path.join(RADICE, 'web'), path.join(copiaRepo, 'web'), { recursive: true });
    const rv = esegui(copiaRepo);
    t('prepara_netlify.py sull\'app vera', rv.status === 0);
    const pub = path.join(copiaRepo, 'pubblica');
    const ix = fs.readFileSync(path.join(pub, 'index.html'), 'utf8');
    t('un solo link al manifest, su file', (ix.match(/<link rel="manifest"/g) || []).length === 1 && ix.includes('<link rel="manifest" href="manifest.webmanifest">'));
    const man = JSON.parse(fs.readFileSync(path.join(pub, 'manifest.webmanifest'), 'utf8'));
    t('il manifest ha le icone 192 e 512, anche maskable, e tutte esistono', ['192x192', '512x512'].every(s => man.icons.some(i => i.sizes === s && i.purpose === 'any') && man.icons.some(i => i.sizes === s && i.purpose === 'maskable')) && man.icons.every(i => fs.existsSync(path.join(pub, i.src))));
    t('start_url e scope relativi', man.start_url === './' && man.scope === './' && man.display === 'standalone');
    const sw = fs.readFileSync(path.join(pub, 'sw.js'), 'utf8');
    t('sw.js senza segnaposto, con l\'impronta di index.html', !sw.includes('__VERSIONE_CACHE__') && sw.includes(`'${sha(ix).slice(0, 16)}'`));
    t('tutto ciò che sw.js mette in precache è pubblicato', [...sw.matchAll(/'((?:icone\/|manifest|index)[^']*)'/g)].every(m => fs.existsSync(path.join(pub, m[1]))));
    t('le icone sono PNG veri della misura giusta', [['icona-192.png', 192], ['icona-512.png', 512], ['icona-maskable-192.png', 192], ['icona-maskable-512.png', 512]].every(([n, l]) => { const b = fs.readFileSync(path.join(pub, 'icone', n)); return b.slice(1, 4).toString() === 'PNG' && b.readUInt32BE(16) === l && b.readUInt32BE(20) === l; }));
  }

  console.log('--- web/sw.js in un finto ambiente di worker ---');
  const swSrc = fs.readFileSync(path.join(RADICE, 'web', 'sw.js'), 'utf8').split('__VERSIONE_CACHE__').join('abc123');
  const casse = new Map(); // nome -> Map(url -> Response finta)
  const chiave = (r) => new URL(typeof r === 'string' ? r : r.url, 'https://dpsh.netlify.app/').href;
  const apri = (nome) => { if (!casse.has(nome)) casse.set(nome, new Map()); const m = casse.get(nome); return { add: async (r) => m.set(chiave(r), { ok: true, type: 'basic', da: 'rete', clone() { return this; } }), put: async (r, x) => m.set(chiave(r), x), match: async (r) => m.get(chiave(r)) }; };
  ['dpsh-v5', 'dpsh-vecchia', 'qualunque'].forEach(n => casse.set(n, new Map()));
  const ascoltatori = {}; const richieste = [];
  const ambiente = {
    self: { location: new URL('https://dpsh.netlify.app/sw.js'), addEventListener: (n, f) => { ascoltatori[n] = f; }, clients: { claim: async () => {} }, skipWaiting: () => { ambiente.saltato = true; } },
    caches: { open: async (n) => apri(n), keys: async () => [...casse.keys()], delete: async (n) => casse.delete(n), match: async (r) => { for (const m of casse.values()) { if (m.has(chiave(r))) return m.get(chiave(r)); } } },
    fetch: async (r) => { richieste.push(chiave(r)); return { ok: true, type: 'basic', da: 'rete', clone() { return this; } }; },
    Request: class { constructor(u, o) { this.url = u; this.opts = o; } }, URL, Promise
  };
  vm.createContext(ambiente); vm.runInContext(swSrc, ambiente);
  const evento = (extra) => { const e = Object.assign({ attese: [], waitUntil(p) { this.attese.push(p); }, respondWith(p) { this.risposta = p; } }, extra); return e; };
  const ei = evento(); ascoltatori.install(ei); await Promise.all(ei.attese);
  const nomeCache = [...casse.keys()].find(n => n === 'dpsh-abc123');
  t('install: cache col nome versionato dall\'impronta', !!nomeCache);
  t('install: precache di ./ e index.html', casse.get('dpsh-abc123').has('https://dpsh.netlify.app/index.html') && casse.get('dpsh-abc123').has('https://dpsh.netlify.app/'));
  t('install non salta l\'attesa da solo', !ambiente.saltato);
  const ea = evento(); ascoltatori.activate(ea); await Promise.all(ea.attese);
  t('activate: cancella TUTTE le altre cache, anche dpsh-v5', JSON.stringify([...casse.keys()]) === '["dpsh-abc123"]');
  const nav = evento({ request: { method: 'GET', url: 'https://dpsh.netlify.app/', mode: 'navigate' } }); ascoltatori.fetch(nav);
  const rn = await nav.risposta; await Promise.all(nav.attese);
  t('navigazione: risponde dalla cache e intanto aggiorna dalla rete', !!rn && rn.da === 'rete' && richieste.includes('https://dpsh.netlify.app/'));
  const fuori = evento({ request: { method: 'GET', url: 'https://tile.openstreetmap.org/1/2/3.png', mode: 'cors' } }); ascoltatori.fetch(fuori);
  t('altri domini (mappe, IA, Google): non intercettati', fuori.risposta === undefined);
  const ia = evento({ request: { method: 'POST', url: 'https://dpsh.netlify.app/x', mode: 'cors' } }); ascoltatori.fetch(ia);
  t('le richieste non GET non si toccano', ia.risposta === undefined);
  t('nessuna risorsa esterna è finita in cache', [...casse.get('dpsh-abc123').keys()].every(u => u.startsWith('https://dpsh.netlify.app/')));
  ascoltatori.message({ data: 'SKIP_WAITING' });
  t('SKIP_WAITING attiva il worker in attesa', ambiente.saltato === true);

  console.log('--- netlify.toml, CSP e registrazione ---');
  const toml = fs.readFileSync(path.join(RADICE, 'netlify.toml'), 'utf8');
  t('build e cartella pubblicata', /command = "python3 build\.py && python3 tools\/prepara_netlify\.py"/.test(toml) && /publish = "pubblica"/.test(toml));
  t('index.html e sw.js senza cache', /for = "\/index\.html"[\s\S]*?Cache-Control = "no-cache"/.test(toml) && /for = "\/sw\.js"[\s\S]*?Cache-Control = "no-cache"/.test(toml));
  t('nosniff e Referrer-Policy', /X-Content-Type-Options = "nosniff"/.test(toml) && /Referrer-Policy = "strict-origin-when-cross-origin"/.test(toml));
  t('pubblica/ è ignorata da git', /^pubblica\/$/m.test(fs.readFileSync(path.join(RADICE, '.gitignore'), 'utf8')));
  const head = fs.readFileSync(path.join(RADICE, 'src', 'shell', '01_head.html'), 'utf8');
  const csp = (head.match(/Content-Security-Policy" content="([^"]+)"/) || [])[1] || '';
  t('CSP: worker-src \'self\' e il manifest su file (default-src \'self\') ammessi', /worker-src 'self'/.test(csp) && /default-src 'self'/.test(csp) && !/manifest-src/.test(csp));
  const reg = fs.readFileSync(path.join(RADICE, 'src', 'js', '076_aggiornamenti-e-uso-senza-rete.js'), 'utf8');
  t('la registrazione è solo su https o localhost, mai APK o Electron', /location\.protocol === 'https:'/.test(reg) && /localhost/.test(reg) && /Electron/.test(reg) && /Capacitor/.test(reg));
  t('l\'avviso usa il toast dell\'app: «Nuova versione disponibile: ricarica»', /mostraToast\('Nuova versione disponibile: ricarica'/.test(reg));

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO eccezione: ' + (e && e.stack || e)); process.exit(1); });
