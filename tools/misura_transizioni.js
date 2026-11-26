// Misura (non un test): fotogrammi persi passando da una prova all'altra, nel Chromium vero.
// node tools/misura_transizioni.js [dist/DPSH.html]   → per ogni caso: fotogramma più lungo, fotogrammi > 50 ms, blocco totale.
const fs = require('fs'), path = require('path'), os = require('os');
const { chromium } = require('playwright');
const file = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'DPSH.html'));
const src = fs.readFileSync(file, 'utf8').split('\n');
const chiusura = src.lastIndexOf('        })();');
src.splice(chiusura, 0, '            window.__dpshEval = (codice) => eval(codice);');
const tmp = path.join(os.tmpdir(), 'dpsh_misura_transizioni.html');
fs.writeFileSync(tmp, src.join('\n'));
const STATO = fs.readFileSync(path.join(__dirname, '..', 'test', 'dati', 'stato_v0.json'), 'utf8');

async function caso(browser, nome, viewport, azione) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  await page.addInitScript((s) => { if (!localStorage.getItem('dpsh_app_state')) localStorage.setItem('dpsh_app_state', s); }, STATO);
  await page.goto('file://' + tmp);
  await page.waitForTimeout(800);
  await page.evaluate(() => window.__dpshEval(`(function(){
    const pid = state.currentProjectId, proj = state.projects[pid];
    const base = proj.surveys[Object.keys(proj.surveys)[0]];
    for (let i = 0; i < 30; i++) {
      const s = JSON.parse(JSON.stringify(base));
      s.id = 'SURV_M_' + i; s.header.provaNr = String(100 + i);
      s.logs = []; for (let j = 0; j < 150; j++) s.logs.push({ start: j*0.2, end: (j+1)*0.2, blows: 5 + (j*7+i) % 30, rod: 1 + Math.floor(j/5), lithology: '', note: '' });
      proj.surveys[s.id] = s;
    }
    saveState(); syncProjectToActiveState(pid, 'SURV_M_0'); switchView('field');
  })()`));
  // Telefono: CPU rallentata 4 volte, come un telefono di fascia media.
  if (viewport.width < 600) { const c = await ctx.newCDPSession(page); await c.send('Emulation.setCPUThrottlingRate', { rate: 4 }); }
  if (process.env.PRIMA) await page.evaluate((c) => window.__dpshEval(c), process.env.PRIMA);
  await page.waitForTimeout(1500);
  const cdp = process.env.PROFILO ? await ctx.newCDPSession(page) : null;
  if (cdp) { await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start'); }
  const risultati = [];
  for (let k = 0; k < 4; k++) {
    const r = await page.evaluate(async ([az, k]) => {
      const tempi = []; let vivo = true;
      const giro = (t) => { tempi.push(t); if (vivo) requestAnimationFrame(giro); };
      await new Promise(r => requestAnimationFrame(t => { tempi.push(t); requestAnimationFrame(giro); r(); }));
      const t0 = performance.now();
      window.__dpshEval(az.replace('%ID%', 'SURV_M_' + (1 + k % 3)));
      const sincrono = performance.now() - t0;
      await new Promise(r => setTimeout(r, 1400));
      vivo = false;
      const d = tempi.slice(1).map((t, i) => t - tempi[i]);
      return { sincrono, max: Math.max(...d), lenti: d.filter(x => x > 50).length, bloccato: d.filter(x => x > 17).reduce((a, x) => a + x - 16.7, 0) };
    }, [azione, k]);
    risultati.push(r);
    await page.waitForTimeout(400);
  }
  if (cdp) {
    const { profile } = await cdp.send('Profiler.stop');
    const dt = {}; const per = {}; profile.nodes.forEach(n => per[n.id] = n);
    const tot = {}; const conta = {};
    profile.samples.forEach((id, i) => { let n = per[id]; let k = (n.callFrame.functionName || '(anon)') + ':' + n.callFrame.lineNumber;
      if (n.callFrame.lineNumber < 0 && process.env.PROFILO === '2') { const padre = {}; profile.nodes.forEach(x => (x.children || []).forEach(c => padre[c] = x)); let q = padre[n.id]; while (q && q.callFrame.lineNumber < 0) q = padre[q.id]; if (q) k += ' ← ' + (q.callFrame.functionName || '(anon)') + ':' + q.callFrame.lineNumber; } tot[k] = (tot[k] || 0) + (profile.timeDeltas[i] || 0) / 1000; });
    console.log(Object.entries(tot).sort((a, b) => b[1] - a[1]).slice(0, 25).map(([k, v]) => '   ' + v.toFixed(0).padStart(5) + ' ms ' + k).join('\n'));
  }
  const m = (f) => (risultati.slice(1).reduce((a, r) => a + r[f], 0) / (risultati.length - 1)).toFixed(0);
  console.log(nome.padEnd(34), 'sincrono', m('sincrono').padStart(5), 'ms | fotogramma max', m('max').padStart(5), 'ms | >50ms', m('lenti').padStart(3), '| tempo perso', m('bloccato').padStart(5), 'ms');
  await ctx.close();
}
(async () => {
  const browser = await chromium.launch();
  await caso(browser, 'PC: prova dal lato (morph)', { width: 1366, height: 820 }, `apriDalLato(state.currentProjectId, '%ID%')`);
  await caso(browser, 'Telefono: chip della barra (morph)', { width: 412, height: 880 }, `[...document.querySelectorAll('#surveySwitcherBar .prova-chip')].find(b => b.textContent === String(100 + Number('%ID%'.split('_').pop()))).click()`);
  await caso(browser, 'PC: prova → progetto', { width: 1366, height: 820 }, `switchView(state.uiState.currentView === 'field' ? 'project' : 'field')`);
  await caso(browser, 'Telefono: prova → progetto', { width: 412, height: 880 }, `switchView(state.uiState.currentView === 'field' ? 'project' : 'field')`);
  await caso(browser, 'Conta ↔ Registro', { width: 412, height: 880 }, `(document.querySelector('.schede-prova [aria-selected="false"]')||{click(){}}).click()`);
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
