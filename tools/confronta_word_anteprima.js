// Confronta le tabelle del .docx (reso da LibreOffice) con quelle dell'anteprima (DOM del documento di stampa).
//   node tools/confronta_word_anteprima.js [cartella_uscita] [report|avanzati]   (richiede: playwright, soffice, pdftoppm, python3+pdfplumber)
// Passi: carica dist/DPSH.html con lo stato di test, esporta il progetto in Word agganciandosi a
// documentoStampaInDocx (cattura HTML e blob), misura le tabelle nel DOM, converte il .docx in PDF,
// estrae i bordi/riempimenti dal PDF e stampa le differenze in px (1 px = 0,75 pt).
const fs = require('fs'), path = require('path'), cp = require('child_process');
const { chromium } = require('playwright');
const RADICE = path.join(__dirname, '..');
const SCENARIO = process.argv[3] || 'report';   // 'report' (export completo) | 'avanzati' (riepilogo + dettagliata)
const out = path.resolve(process.argv[2] || path.join(require('os').tmpdir(), 'confronta_word'));
fs.mkdirSync(out, { recursive: true });
(async () => {
    let src = fs.readFileSync(path.join(RADICE, 'dist', 'DPSH.html'), 'utf8');
    const righe = src.split('\n'); const ch = righe.lastIndexOf('        })();');
    righe.splice(ch, 0, '            window.__dpshEval = (codice) => eval(codice);');
    fs.writeFileSync(path.join(out, 'app.html'), righe.join('\n'));
    const stato = fs.readFileSync(path.join(RADICE, 'test', 'dati', 'stato_v0.json'), 'utf8');
    const br = await chromium.launch();
    const pg = await br.newPage({ viewport: { width: 1200, height: 900 } });
    pg.on('pageerror', e => console.log('pageerror', e.message));
    await pg.addInitScript(s => { localStorage.setItem('dpsh_app_state', s); }, stato);
    await pg.goto('file://' + path.join(out, 'app.html'));
    await pg.waitForTimeout(1500);
    await pg.evaluate(() => { const b = document.querySelector('.modal.open [id*=ok],#appDialogOk'); });
    const E = (c) => pg.evaluate(c2 => window.__dpshEval(c2), c);
    await pg.evaluate(() => {
        window.__dpshEval(`(() => { const o = documentoStampaInDocx; documentoStampaInDocx = async (h, op) => { window.__html = h; const r = await o(h, op);
            window.__b64 = await new Promise(ok => { const f = new FileReader(); f.onload = () => ok(f.result.split(',')[1]); f.readAsDataURL(r.blob); }); return r; }; })()`);
    });
    const pid = await E(`Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))`);
    await E(`openProject(${JSON.stringify(pid)})`);
    await pg.waitForTimeout(800);
    if (SCENARIO === 'lunga') {
        // Tabella lunga sintetica (testata su 2 righe, celle unite, colonne di larghezza diversa, 90 righe): prova ripetizione testata e unione righe.
        await pg.evaluate(() => { window.__dpshEval(`(async () => {
            let righe = ''; for (let i = 1; i <= 90; i++) righe += '<tr><td style="border:1px solid #999;padding:4px 6px;text-align:center">' + i + '</td><td style="border:1px solid #999;padding:4px 6px">Riga ' + i + '</td><td style="border:1px solid #999;padding:4px 6px;text-align:right;background:' + (i % 2 ? '#f1f5f9' : '#fff') + '">' + (i * 1.37).toFixed(2) + '</td><td style="border:1px solid #999;padding:4px 6px" ' + (i % 10 === 1 ? 'rowspan="3"' : '') + '>' + (i % 10 === 1 ? 'Gruppo ' + i : '') + '</td></tr>';
            const h = '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' + getReportPrintStyleBlock() + '</style></head><body><div class="a4-page"><h2>Tabella lunga</h2><table class="tbl-long" style="width:80%;margin:0 auto;border-collapse:collapse;font-size:10px;table-layout:fixed"><colgroup><col style="width:10%"><col style="width:40%"><col style="width:25%"><col style="width:25%"></colgroup><thead><tr><th colspan="4" style="border:1px solid #999;padding:5px;background:#dbeafe">Titolo della testata</th></tr><tr><th style="border:1px solid #999;padding:5px;background:#dbeafe">N</th><th style="border:1px solid #999;padding:5px;background:#dbeafe">Voce</th><th style="border:1px solid #999;padding:5px;background:#dbeafe">Valore</th><th style="border:1px solid #999;padding:5px;background:#dbeafe">Note</th></tr></thead><tbody>' + righe + '</tbody></table></div></body></html>';
            await documentoStampaInDocx(h, {}); })()`); });
    } else if (SCENARIO === 'avanzati') {
        // Riepilogo e dettagliata (parametri avanzati): stesso percorso del pulsante «Word» dei parametri.
        await pg.evaluate(() => { window.__dpshEval(`(async () => { const c = await documentoEsportazioneAvanzata(); const prove = elencoProveProgetto();
            await documentoStampaInDocx('<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parametri Avanzati</title><style>' + getReportPrintStyleBlock() + '</style></head><body>' + getIconSpriteHtml() + '<div class="a4-page"><h2 style="color:#0f172a;">Parametri Avanzati</h2>' + c + '</div></body></html>', {}); })()`); });
    } else {
        await E(`openExportModal('project', ${JSON.stringify(pid)})`);
        await pg.evaluate(() => document.getElementById('btnOptExportCompleteWord').click());
        await pg.waitForTimeout(500);
        await pg.evaluate(() => document.getElementById('btnEsportaPdfGenera').click());
    }
    await pg.waitForFunction(() => window.__b64, null, { timeout: 120000 });
    const b64 = await pg.evaluate(() => window.__b64), html = await pg.evaluate(() => window.__html);
    fs.writeFileSync(path.join(out, 'prova.docx'), Buffer.from(b64, 'base64'));
    fs.writeFileSync(path.join(out, 'doc.html'), html);
    // Misure DOM nello stesso modo dell'export: cornice larga quanto lo spazio utile.
    const m = await E(`marginiPaginaDiDefault()`);
    const pd = await br.newPage({ viewport: { width: 1200, height: 900 } });
    await pd.setContent(`<iframe id=f style="position:fixed;left:0;top:0;width:${210 - m.left - m.right}mm;height:297mm;border:0"></iframe>`);
    await pd.evaluate(h => { const d = document.getElementById('f').contentWindow.document; d.open(); d.write(h); d.close(); }, html);
    await pd.waitForTimeout(800);
    const tabelle = await pd.evaluate(() => {
        const d = document.getElementById('f').contentWindow.document;
        const st = d.createElement('style');
        st.textContent = 'html,body{margin:0!important;padding:0!important;background:#fff!important;} .a4-page{width:auto!important;min-height:0!important;margin:0!important;padding:0!important;box-shadow:none!important;} .dpsh-sheet{margin:0!important;}';
        d.head.appendChild(st);
        const out = [];
        d.querySelectorAll('table').forEach((t, i) => {
            const r = t.getBoundingClientRect();
            if (!r.width || t.closest('table') !== t) return;
            const righe = Array.from(t.rows).map(tr => { const q = tr.getBoundingClientRect(); return { y: q.top, h: q.height, celle: Array.from(tr.cells).map(c => { const b = c.getBoundingClientRect(); const tx = (c.textContent || '').replace(/\s+/g, ' ').trim(); let rt = null;
                    if (tx) { const rg = d.createRange(); rg.selectNodeContents(c); const rr = Array.from(rg.getClientRects()).filter(q => q.width > 0); if (rr.length) rt = { x: Math.min(...rr.map(q => q.left)), y: Math.min(...rr.map(q => q.top)) }; }
                    return { x: b.left, w: b.width, t: tx.slice(0, 30), rt }; }) }; });
            out.push({ i, foglio: !!t.closest('.dpsh-sheet'), x: r.left, w: r.width, y: r.top, h: r.height, righe });
        });
        return out;
    });
    fs.writeFileSync(path.join(out, 'dom.json'), JSON.stringify({ margini: m, tabelle }, null, 1));
    await br.close();
    cp.execSync(`soffice --headless --convert-to pdf --outdir ${out} ${path.join(out, 'prova.docx')}`, { stdio: 'ignore' });
    console.log('uscita in', out, '— tabelle DOM:', tabelle.length);
    cp.execSync(`python3 ${path.join(__dirname, 'confronta_word_anteprima.py')} ${out}`, { stdio: 'inherit' });
})().catch(e => { console.error(e); process.exit(1); });
