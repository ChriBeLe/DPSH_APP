            // ===================== LEGGI FOGLIO DI CAMPO (OCR con l'assistente IA) =====================
            // Una foto del foglio scritto a mano accanto a una tabella modificabile (profondità da/a e colpi).
            //  - ONLINE, solo se l'utente preme «Leggi»: la foto (compressa) va a un modello con la vista, scelto fra i
            //    provider dell'assistente IA (073: chiavi, modelli e passaggio al successivo se uno fallisce). La
            //    risposta è JSON; si controlla (numeri, profondità crescenti, passo coerente) e le celle dubbie
            //    diventano gialle.
            //  - OFFLINE (niente rete, niente provider): la stessa schermata, con la tabella già riempita con le
            //    profondità del passo della prova: si scrivono solo i colpi, Invio passa alla riga dopo.
            //  - «Inserisci nella prova» scrive negli intervalli con le funzioni dell'app (nuovoIntervallo, saveState),
            //    così calcoli, annulla/ripeti e copie automatiche (copiaOChiedi) funzionano come sempre; la foto resta
            //    allegata alla prova.

            const OCR_MAX_LATO = 1800;
            const OCR_TOLL = 0.0011; // tolleranza sulle profondità (m): un millimetro

            /** Numero da un testo o un numero: «12», «0,2», 0.2. Vuoto o non numerico → null. */
            function ocrNumero(v) {
                if (typeof v === 'number') return isFinite(v) ? v : null;
                if (typeof v !== 'string') return null;
                const t = v.trim().replace(',', '.');
                return /^-?\d+(\.\d+)?$/.test(t) ? parseFloat(t) : null;
            }
            const ocrMostra = v => v === null || v === undefined ? '' : String(Math.round(v * 1000) / 1000).replace('.', ',');

            /** La risposta del modello (testo) → { righe, provaNr, avvisi } oppure { errore }. Tollera i blocchi ```json. */
            function ocrParseRisposta(testo) {
                let t = String(testo == null ? '' : testo).trim().replace(/^```[a-z]*\s*/i, '').replace(/```\s*$/, '').trim();
                let dati = null;
                try { dati = JSON.parse(t); } catch (e) {
                    const i = t.indexOf('{'), j = t.lastIndexOf('}');
                    if (i >= 0 && j > i) { try { dati = JSON.parse(t.slice(i, j + 1)); } catch (e2) { /* non è JSON */ } }
                    if (!dati) { const a = t.indexOf('['), b = t.lastIndexOf(']'); if (a >= 0 && b > a) { try { dati = JSON.parse(t.slice(a, b + 1)); } catch (e3) { /* non è JSON */ } } }
                }
                if (!dati) return { errore: 'la risposta non è nel formato atteso' };
                const elenco = Array.isArray(dati) ? dati : (Array.isArray(dati.righe) ? dati.righe : null);
                if (!elenco) return { errore: 'nella risposta non ci sono righe' };
                const avvisi = [];
                let righe = elenco.filter(r => r && typeof r === 'object').map(r => {
                    let box = null;
                    if (Array.isArray(r.box) && r.box.length === 4 && r.box.every(n => typeof n === 'number' && isFinite(n) && n >= 0 && n <= 1) && r.box[2] > 0 && r.box[3] > 0) box = r.box.slice();
                    return { da: ocrNumero(r.da), a: ocrNumero(r.a), colpi: ocrNumero(r.colpi), nota: String(r.nota == null ? '' : r.nota).slice(0, 200), box, incerto: r.incerto === true, letta: true, dubbi: {} };
                });
                righe = righe.filter(r => r.da !== null || r.a !== null || r.colpi !== null || r.nota);
                if (!righe.length) return { errore: 'nessuna riga letta' };
                // profondità date in centimetri invece che in metri
                const massima = Math.max(...righe.map(r => Math.max(r.da || 0, r.a || 0)));
                const passoMax = Math.max(...righe.map(r => (r.da !== null && r.a !== null) ? r.a - r.da : 0));
                if (massima > 60 || passoMax > 2) { righe.forEach(r => { if (r.da !== null) r.da /= 100; if (r.a !== null) r.a /= 100; }); avvisi.push('Le profondità erano in centimetri: le ho convertite in metri.'); }
                const nr = dati.prova == null ? '' : String(dati.prova).trim().slice(0, 12);
                return { righe, provaNr: /^[0-9A-Za-z]+$/.test(nr) ? nr : '', avvisi };
            }

            /** Segna le celle dubbie (r.dubbi.da / a / colpi) e ritorna quante sono. */
            function ocrValida(righe, stepCm) {
                const passo = (stepCm || 20) / 100;
                let n = 0, prec = null;
                righe.forEach(r => {
                    const d = r.dubbi = { da: false, a: false, colpi: false };
                    const vuota = r.da === null && r.a === null && r.colpi === null && !r.nota;
                    if (vuota) return;
                    if (r.da === null || r.da < 0) d.da = true;
                    if (r.a === null || r.a < 0) d.a = true;
                    if (r.da !== null && r.a !== null) {
                        if (r.a <= r.da) d.a = true;
                        else if (Math.abs((r.a - r.da) - passo) > OCR_TOLL) d.a = true;
                    }
                    if (prec) {
                        if (r.da !== null && prec.a !== null && Math.abs(r.da - prec.a) > OCR_TOLL) d.da = true;
                        if (r.da !== null && prec.da !== null && r.da < prec.da - OCR_TOLL) d.da = true;
                    }
                    if (r.colpi === null) { if (r.letta) d.colpi = true; }
                    else if (r.colpi < 0 || r.colpi !== Math.round(r.colpi) || r.colpi > 100) d.colpi = true;
                    if (r.incerto) d.colpi = true;
                    n += (d.da ? 1 : 0) + (d.a ? 1 : 0) + (d.colpi ? 1 : 0);
                    prec = r;
                });
                return n;
            }

            /** Tabella vuota con le profondità del passo (offline): n righe da `daM` metri. */
            function ocrPrecompila(stepCm, n, daM) {
                const passo = (stepCm || 20) / 100, righe = [];
                for (let i = 0; i < (n || 25); i++) {
                    const da = Math.round(((daM || 0) + i * passo) * 1000) / 1000;
                    righe.push({ da, a: Math.round((da + passo) * 1000) / 1000, colpi: null, nota: '', box: null, incerto: false, letta: false, dubbi: {} });
                }
                return righe;
            }

            /** Le righe pronte da scrivere: profondità valide e colpi interi. */
            function ocrRigheUtili(righe) {
                return righe.filter(r => r.da !== null && r.a !== null && r.a > r.da && r.colpi !== null && r.colpi >= 0 && r.colpi === Math.round(r.colpi));
            }

            // --- lettura con il modello ---
            function ocrPrompt(stepCm) {
                return 'Sei un lettore di fogli di campo di prove penetrometriche dinamiche DPSH scritti a mano. Leggi la tabella nella foto. ' +
                    'Rispondi SOLO con un oggetto JSON, senza testo prima o dopo e senza apici inversi, in questa forma: ' +
                    '{"prova":"numero della prova oppure null","righe":[{"da":0.0,"a":0.2,"colpi":3,"nota":"","incerto":false,"box":[0.1,0.2,0.8,0.05]}]}. ' +
                    'da e a sono profondità in METRI con il punto decimale. colpi è il numero intero di colpi di quell\'intervallo. ' +
                    'nota è il testo scritto accanto alla riga (rifiuto, falda…) oppure stringa vuota. ' +
                    'box è la posizione della riga nella foto: x, y, larghezza, altezza, ognuno da 0 a 1 rispetto a larghezza e altezza dell\'immagine, oppure null. ' +
                    'incerto è true se non sei sicuro di aver letto bene i colpi. Non inventare mai valori: se una cella è illeggibile metti colpi null e incerto true. ' +
                    'Una riga per ogni intervallo, in ordine di profondità. Il passo di norma è di ' + (stepCm || 20) + ' cm.';
            }
            function ocrRichiesta(d, c, dataUrl, stepCm) {
                const m = /^data:([^;,]+);base64,(.*)$/.exec(dataUrl) || [];
                const tipo = m[1] || 'image/jpeg', b64 = m[2] || '', prompt = ocrPrompt(stepCm);
                if (d.tipo === 'anthropic') return {
                    url: d.base + '/messages', headers: { 'x-api-key': c.chiave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                    corpo: { model: c.modello, max_tokens: 4000, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: tipo, data: b64 } }, { type: 'text', text: prompt }] }] },
                    leggi: j => (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
                };
                if (d.tipo === 'gemini') return {
                    url: d.base + '/models/' + encodeURIComponent(c.modello) + ':generateContent', headers: { 'x-goog-api-key': c.chiave },
                    corpo: { contents: [{ role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType: tipo, data: b64 } }] }], generationConfig: { responseMimeType: 'application/json', temperature: 0 } },
                    leggi: j => ((((j.candidates || [])[0] || {}).content || {}).parts || []).filter(p => p.text).map(p => p.text).join('\n')
                };
                const h = { 'Content-Type': 'application/json' };
                if (c.chiave) h.Authorization = 'Bearer ' + c.chiave;
                return {
                    url: (c.base || d.base).replace(/\/$/, '') + '/chat/completions', headers: h,
                    corpo: { model: c.modello, temperature: 0, max_tokens: 4000, messages: [{ role: 'user', content: [{ type: 'text', text: prompt }, { type: 'image_url', image_url: { url: dataUrl } }] }] },
                    leggi: j => { const m2 = ((j.choices || [])[0] || {}).message || {}; return Array.isArray(m2.content) ? m2.content.map(x => x.text || '').join('\n') : (m2.content || ''); }
                };
            }
            /** Prova i provider nell'ordine scelto. Ritorna { righe, provaNr, avvisi, provider } o lancia con i motivi. */
            async function ocrLeggiConIA(dataUrl, stepCm, avvisa) {
                if (!dataUrlImmagineSicuro(dataUrl)) throw new Error('la foto non è un\'immagine valida');
                const pronti = aiProntiInOrdine();
                if (!pronti.length) throw new Error('nessun provider configurato');
                const errori = [];
                for (const id of pronti) {
                    const d = aiDef(id);
                    try {
                        const testo = await aiPostaRichiesta(d, ocrRichiesta(d, aiConf(id), dataUrl, stepCm), 90000);
                        const r = ocrParseRisposta(testo);
                        if (r.errore) throw new Error(r.errore);
                        r.provider = d.nome;
                        return r;
                    } catch (e) {
                        errori.push(d.nome + ': ' + e.message);
                        if (avvisa) avvisa(`${d.nome} non ha funzionato (${e.message}).` + (id !== pronti[pronti.length - 1] ? ' Provo il successivo…' : ''));
                    }
                }
                throw new Error(errori.join('; '));
            }

            /** Foto → data URL JPEG con il lato lungo al massimo OCR_MAX_LATO (meno dati da inviare). */
            async function ocrComprimi(file) {
                const originale = await new Promise((ok, ko) => { const fr = new FileReader(); fr.onload = () => ok(fr.result); fr.onerror = () => ko(fr.error || new Error('lettura non riuscita')); fr.readAsDataURL(file); });
                if (!dataUrlImmagineSicuro(originale)) throw new Error('il file non è un\'immagine');
                try {
                    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('immagine illeggibile')); i.src = originale; });
                    const k = Math.min(1, OCR_MAX_LATO / Math.max(img.naturalWidth || 1, img.naturalHeight || 1));
                    const cv = document.createElement('canvas');
                    cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
                    cv.getContext('2d').drawImage(img, 0, 0, cv.width, cv.height);
                    const out = cv.toDataURL('image/jpeg', 0.85);
                    return dataUrlImmagineSicuro(out) ? out : originale;
                } catch (e) { return originale; }
            }

            // --- scrittura nella prova ---
            /** Scrive le righe nella prova scelta. dest = { projId, survId|null (nuova) }, modo 'sostituisci' | 'aggiungi'.
             * Ritorna { n, saltati } oppure null se annullato (copia di sicurezza rifiutata). */
            async function ocrInserisci({ projId, survId, righe, modo, foto, provaNr }) {
                const utili = ocrRigheUtili(righe).slice().sort((a, b) => a.da - b.da);
                if (!utili.length) throw new Error('nessuna riga con profondità e colpi');
                if (!state.projects || !state.projects[projId]) throw new Error('progetto non trovato');
                if (survId && !state.projects[projId].surveys[survId]) throw new Error('prova non trovata');
                if (survId && (state.currentProjectId !== projId || state.currentSurveyId !== survId)) {
                    saveState();
                    syncProjectToActiveState(projId, survId);
                } else if (!survId && state.currentProjectId !== projId) {
                    saveState();
                    syncProjectToActiveState(projId, Object.keys(state.projects[projId].surveys)[0]);
                }
                if (!survId) {
                    openNewSurveyModal(); // prova nuova col numero successivo e i dati del progetto
                    if (provaNr) {
                        const doppia = Object.values(state.projects[projId].surveys).some(s => s.id !== state.currentSurveyId && String((s.header || {}).provaNr) === provaNr);
                        if (!doppia) state.header.provaNr = provaNr;
                    }
                } else if (modo === 'sostituisci' && state.logs.length) {
                    if (!(await copiaOChiedi('sostituire tutti gli intervalli'))) return null;
                }
                if (modo === 'sostituisci') { state.logs = []; state.currentDepthStart = 0; }
                const stepM = ((state.settings && state.settings.stepCm) || 20) / 100;
                const fineEsistente = state.logs.reduce((m, l) => Math.max(m, l.end), 0);
                let saltati = 0, n = 0;
                utili.forEach(r => {
                    if (modo === 'aggiungi' && r.da < fineEsistente - OCR_TOLL) { saltati++; return; }
                    state.logs.push(nuovoIntervallo({ start: r.da, end: r.a, colpi: r.colpi, asta: getRodForDepth(r.a), note: r.nota || '', lithology: '' }, 'import'));
                    n++;
                });
                state.logs.sort((a, b) => a.start - b.start);
                const fine = state.logs.reduce((m, l) => Math.max(m, l.end), 0);
                state.currentDepthStart = fine;
                state.currentRod = getRodForDepth(fine + stepM);
                state.currentCount = 0;
                if (foto && dataUrlImmagineSicuro(foto)) {
                    const id = 'photo_' + Date.now() + '_foglio', ora = new Date();
                    if (!state.photos) state.photos = [];
                    state.photos.push({ id, dataUrl: foto, lat: null, lng: null, alt: null, hasExifGps: false, gpsSource: null, nota: 'Foglio di campo', timestamp: `${ora.toLocaleDateString()} ${ora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, scattataIl: ora.toISOString() });
                    if (!(await salvaFotoConGaranzia(id, foto))) mostraToast('La foto del foglio non è stata salvata sul dispositivo.');
                }
                saveState();
                updateUI();
                return { n, saltati };
            }

            // --- schermata ---
            function apriLeggiFoglio(dataUrl) {
                if (document.getElementById('ocrSchermata')) return null;
                const stepCm = (state.settings && state.settings.stepCm) || 20;
                const proj = (state.projects || {})[state.currentProjectId];
                const m = { dataUrl, righe: ocrPrecompila(stepCm, 25), provaNr: '', occupato: false };
                const ov = document.createElement('div');
                ov.id = 'ocrSchermata'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Leggi foglio di campo');
                ov.innerHTML = '<div class="ocr-testa"><span>Leggi foglio di campo</span><span class="ocr-spazio"></span><button type="button" class="bt-icona bordato" id="ocrChiudi" aria-label="Chiudi"><svg class="ico"><use href="#i-x"/></svg></button></div>' +
                    '<div class="ocr-corpo"><div class="ocr-foto" id="ocrFoto"><div class="ocr-tela" id="ocrTela"><img id="ocrImg" alt="Foglio di campo"><div class="ocr-box" id="ocrBox"></div></div>' +
                    '<div class="ocr-zoom"><button type="button" id="ocrZoomPiu" aria-label="Ingrandisci">+</button><button type="button" id="ocrZoomMeno" aria-label="Riduci">&minus;</button></div></div>' +
                    '<div class="ocr-dati"><div class="ocr-nota" id="ocrNota" role="status"></div>' +
                    '<div class="ocr-barra"><label>Inserisci in <select id="ocrDest"></select></label><label>Prova N° <input id="ocrProvaNr" inputmode="numeric" maxlength="12"></label>' +
                    '<button type="button" class="bt" id="ocrLeggi"><svg class="ico"><use href="#i-sparkles"/></svg>Leggi</button><button type="button" class="bt" id="ocrPiuRighe">+ righe</button></div>' +
                    '<div class="ocr-tab-scroll"><table><thead><tr><th>Da (m)</th><th>A (m)</th><th>Colpi</th><th>Nota</th></tr></thead><tbody id="ocrCorpoTab"></tbody></table></div>' +
                    '<div class="ocr-piede"><button type="button" class="btn-action" id="ocrAnnulla" style="background:var(--bg-main);color:var(--text-main);border:1px solid var(--border);">Annulla</button><button type="button" class="btn-action" id="ocrInserisci" style="font-weight:800;">Inserisci nella prova</button></div></div></div>';
                document.body.appendChild(ov);
                const $ = id => ov.querySelector('#' + id);
                $('ocrImg').src = dataUrl;
                const nota = t => { $('ocrNota').textContent = t || ''; };

                // destinazione: nuova prova o una del progetto
                const dest = $('ocrDest');
                const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; dest.appendChild(o); };
                opt('', 'Nuova prova');
                Object.values((proj && proj.surveys) || {}).forEach(s => opt(s.id, 'Prova N° ' + ((s.header && s.header.provaNr) || '?')));
                if (state.currentSurveyId && proj && proj.surveys[state.currentSurveyId] && (state.logs || []).length === 0) dest.value = state.currentSurveyId;

                // tabella
                const corpo = $('ocrCorpoTab');
                const aggiornaStile = () => {
                    ocrValida(m.righe, stepCm);
                    [...corpo.rows].forEach((tr, i) => ['da', 'a', 'colpi'].forEach((k, c) => tr.cells[c].firstChild.classList.toggle('dubbio', !!(m.righe[i].dubbi || {})[k])));
                };
                const evidenzia = i => {
                    [...corpo.rows].forEach((tr, k) => tr.classList.toggle('attiva', k === i));
                    const r = m.righe[i], bx = $('ocrBox');
                    if (!r || !r.box) { bx.style.display = 'none'; return; }
                    bx.style.cssText = `display:block;left:${r.box[0] * 100}%;top:${r.box[1] * 100}%;width:${r.box[2] * 100}%;height:${r.box[3] * 100}%;`;
                    centraSu(r.box);
                };
                const campo = (i, k, val, mod) => {
                    const td = document.createElement('td'), inp = document.createElement('input');
                    inp.type = 'text'; inp.value = val; inp.dataset.k = k; inp.setAttribute('autocomplete', 'off'); inp.setAttribute('enterkeyhint', 'next');
                    if (k === 'colpi') inp.inputMode = 'numeric'; else if (k !== 'nota') inp.inputMode = 'decimal';
                    inp.setAttribute('aria-label', { da: 'Da', a: 'A', colpi: 'Colpi', nota: 'Nota' }[k] + ' riga ' + (i + 1));
                    inp.addEventListener('focus', () => evidenzia(i));
                    inp.addEventListener('input', () => { const r = m.righe[i]; r[k] = k === 'nota' ? inp.value.slice(0, 200) : ocrNumero(inp.value); if (k === 'colpi') r.incerto = false; aggiornaStile(); });
                    inp.addEventListener('keydown', e => {
                        if (e.key !== 'Enter') return;
                        e.preventDefault();
                        if (i + 1 >= m.righe.length) aggiungiRighe();
                        const prossimo = corpo.rows[i + 1];
                        if (prossimo) { const el = prossimo.querySelector(`input[data-k="${k}"]`); if (el) { el.focus(); if (el.select) el.select(); } }
                    });
                    td.appendChild(inp); return td;
                };
                const disegna = () => {
                    corpo.textContent = '';
                    m.righe.forEach((r, i) => {
                        const tr = document.createElement('tr');
                        tr.append(campo(i, 'da', ocrMostra(r.da)), campo(i, 'a', ocrMostra(r.a)), campo(i, 'colpi', ocrMostra(r.colpi)), campo(i, 'nota', r.nota || ''));
                        corpo.appendChild(tr);
                    });
                    aggiornaStile();
                };
                function aggiungiRighe() {
                    const ult = [...m.righe].reverse().find(r => r.a !== null);
                    m.righe.push(...ocrPrecompila(stepCm, 10, ult ? ult.a : 0));
                    disegna();
                }
                $('ocrPiuRighe').addEventListener('click', aggiungiRighe);

                // foto: pan e zoom (trascinamento, pizzico, rotella, tasti)
                const foto = $('ocrFoto'), tela = $('ocrTela'), img = $('ocrImg');
                const v = { s: 1, x: 0, y: 0, s0: 1 };
                const applica = () => { tela.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.s})`; };
                const adatta = () => {
                    const W = foto.clientWidth, H = foto.clientHeight, ih = img.clientHeight;
                    if (!W || !H || !ih) { applica(); return; }
                    v.s0 = Math.min(1, H / ih); v.s = v.s0; v.x = (W - W * v.s) / 2; v.y = (H - ih * v.s) / 2; applica();
                };
                const zoomIn = (cx, cy, f) => {
                    const s = Math.max(v.s0 * 0.8, Math.min(v.s0 * 10, v.s * f)), k = s / v.s;
                    v.x = cx - (cx - v.x) * k; v.y = cy - (cy - v.y) * k; v.s = s; applica();
                };
                function centraSu(b) {
                    const W = foto.clientWidth, H = foto.clientHeight, ih = img.clientHeight;
                    if (!W || !H || !ih) return;
                    v.s = Math.max(v.s, v.s0 * 1.5);
                    v.x = W / 2 - (b[0] + b[2] / 2) * W * v.s; v.y = H / 2 - (b[1] + b[3] / 2) * ih * v.s; applica();
                }
                img.addEventListener('load', adatta);
                window.addEventListener('resize', adatta);
                const dita = new Map();
                const distanza = () => { const p = [...dita.values()]; return Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); };
                const centro = () => { const p = [...dita.values()], r = foto.getBoundingClientRect(); return { x: (p[0].x + p[1].x) / 2 - r.left, y: (p[0].y + p[1].y) / 2 - r.top }; };
                foto.addEventListener('pointerdown', e => {
                    dita.set(e.pointerId, { x: e.clientX, y: e.clientY });
                    try { foto.setPointerCapture(e.pointerId); } catch (x) { /* non supportato */ }
                    foto.classList.add('trascina');
                });
                foto.addEventListener('pointermove', e => {
                    const p = dita.get(e.pointerId); if (!p) return;
                    if (dita.size === 1) { v.x += e.clientX - p.x; v.y += e.clientY - p.y; p.x = e.clientX; p.y = e.clientY; applica(); return; }
                    const d0 = distanza(), c0 = centro();
                    p.x = e.clientX; p.y = e.clientY;
                    const d1 = distanza(), c1 = centro();
                    if (d0 > 0) zoomIn(c0.x, c0.y, d1 / d0);
                    v.x += c1.x - c0.x; v.y += c1.y - c0.y; applica();
                });
                const finePizzico = e => { dita.delete(e.pointerId); if (!dita.size) foto.classList.remove('trascina'); };
                foto.addEventListener('pointerup', finePizzico); foto.addEventListener('pointercancel', finePizzico);
                foto.addEventListener('wheel', e => { e.preventDefault(); const r = foto.getBoundingClientRect(); zoomIn(e.clientX - r.left, e.clientY - r.top, e.deltaY < 0 ? 1.15 : 1 / 1.15); }, { passive: false });
                $('ocrZoomPiu').addEventListener('click', () => zoomIn(foto.clientWidth / 2, foto.clientHeight / 2, 1.4));
                $('ocrZoomMeno').addEventListener('click', () => zoomIn(foto.clientWidth / 2, foto.clientHeight / 2, 1 / 1.4));

                // lettura con l'IA: solo quando si preme «Leggi»
                const prontiIA = aiProntiInOrdine();
                const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
                const btnLeggi = $('ocrLeggi');
                if (offline || !prontiIA.length) {
                    btnLeggi.style.display = 'none';
                    nota((offline ? 'Sei offline: l\'IA non si può usare.' : 'Nessun assistente IA configurato (Impostazioni › Assistente IA).') + ' Scrivi i colpi a mano: le profondità sono già pronte, Invio passa alla riga dopo.');
                } else {
                    nota('La foto viene inviata a ' + aiDef(prontiIA[0]).nome + ' solo se premi «Leggi». Altrimenti scrivi i colpi a mano.');
                }
                const chiudi = () => { window.removeEventListener('resize', adatta); ov.remove(); };
                const leggi = async () => {
                    if (m.occupato) return;
                    if (m.righe.some(r => r.colpi !== null) && !(await appConfirm('Sostituire i valori già scritti con la lettura del foglio?'))) return;
                    m.occupato = true; btnLeggi.disabled = true; nota('Sto leggendo il foglio…');
                    try {
                        const r = await ocrLeggiConIA(dataUrl, stepCm, t => nota(t));
                        m.righe = r.righe; m.provaNr = r.provaNr || '';
                        if (m.provaNr) $('ocrProvaNr').value = m.provaNr;
                        disegna();
                        const dubbi = m.righe.reduce((s, x) => s + (x.dubbi.da ? 1 : 0) + (x.dubbi.a ? 1 : 0) + (x.dubbi.colpi ? 1 : 0), 0);
                        nota(`Letto con ${r.provider}: ${m.righe.length} righe` + (dubbi ? `, ${dubbi} celle da controllare (in giallo).` : '.') + ' Controlla sempre con la foto. ' + (r.avvisi || []).join(' '));
                    } catch (e) {
                        nota('Lettura non riuscita (' + e.message + '). Puoi scrivere i colpi a mano.');
                    } finally { m.occupato = false; btnLeggi.disabled = false; }
                };
                btnLeggi.addEventListener('click', leggi);

                const inserisci = async () => {
                    if (m.occupato) return null;
                    m.provaNr = $('ocrProvaNr').value.trim();
                    const utili = ocrRigheUtili(m.righe);
                    if (!utili.length) { await appAlert('Scrivi almeno una riga con i colpi.'); return null; }
                    const survId = dest.value || null;
                    let modo = 'sostituisci';
                    if (survId) {
                        const s = state.projects[state.currentProjectId].surveys[survId];
                        const logs = survId === state.currentSurveyId ? state.logs : (s.logs || []);
                        if (logs.length) {
                            const sc = await appDialog('La prova ha già ' + logs.length + ' intervalli. Cosa faccio?', { confirm: true, okLabel: 'Sostituisci', extraLabel: 'Aggiungi in fondo', cancelLabel: 'Annulla' });
                            if (sc === true) modo = 'sostituisci'; else if (sc === 'extra') modo = 'aggiungi'; else return null;
                        }
                    }
                    m.occupato = true;
                    try {
                        const r = await ocrInserisci({ projId: state.currentProjectId, survId, righe: m.righe, modo, foto: dataUrl, provaNr: m.provaNr });
                        if (!r) return null;
                        chiudi();
                        mostraToast(`Inseriti ${r.n} intervalli` + (r.saltati ? ` (${r.saltati} già presenti, saltati)` : ''));
                        return r;
                    } catch (e) { await appAlert('Non sono riuscito a inserire: ' + e.message); return null; }
                    finally { m.occupato = false; }
                };
                $('ocrInserisci').addEventListener('click', inserisci);
                const esci = async () => {
                    if (m.righe.some(r => r.colpi !== null) && !(await appConfirm('Chiudere senza inserire? I valori scritti andranno persi.'))) return;
                    chiudi();
                };
                $('ocrChiudi').addEventListener('click', esci); $('ocrAnnulla').addEventListener('click', esci);

                disegna();
                const primo = corpo.querySelector('input[data-k="colpi"]');
                if (primo && (offline || !prontiIA.length)) setTimeout(() => { try { primo.focus(); } catch (e) { /* nessun focus */ } }, 50);
                return { el: ov, modello: m, leggi, inserisci, chiudi };
            }

            (function () {
                const btn = document.getElementById('btnProgettoLeggiFoglio'), inp = document.getElementById('fileLeggiFoglio');
                if (!btn || !inp) return;
                btn.addEventListener('click', () => { inp.value = ''; inp.click(); });
                inp.addEventListener('change', async e => {
                    const f = e.target.files && e.target.files[0]; inp.value = '';
                    if (!f) return;
                    try { apriLeggiFoglio(await ocrComprimi(f)); }
                    catch (err) { appAlert('Non riesco ad aprire la foto: ' + err.message); }
                });
            })();
