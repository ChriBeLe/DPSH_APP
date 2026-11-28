            // ===================== PASSA CON I CODICI QR (28/11/2026) =====================
            // Un progetto piccolo da un dispositivo a un altro SENZA rete, file o cavo: chi manda sceglie cosa portare
            // (prove, note, foto piccole), il telefono mostra una sequenza di codici QR, l'altro li legge con la
            // fotocamera. Ogni codice porta una parte del pacchetto: dati compressi, scritti in base 45 (il modo più
            // fitto del QR), con numero d'ordine e impronta (CRC32). La sequenza gira in cerchio: se un codice sfugge,
            // ripassa al giro dopo; l'impronta dice se tutto è arrivato giusto. Foto grandi e DTM NON vanno nei QR:
            // viaggiano con «Porta sul PC».
            const QR_B45 = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:';
            const QR_CARATTERI = 400;          // caratteri di dati per codice (circa 270 byte): codici larghi e facili da leggere
            const QR_FOTO_MAX = 8000;          // una foto piccola: al massimo 8000 caratteri di immagine
            const qrFotoPiccole = new Map();   // id foto → miniatura già fatta (si rifà solo se cambia la foto)
            const statoQr = { progetto: null, scheda: 'mostra', frames: [], i: 0, fps: 4, timer: null, pausa: false, lettore: null, flusso: null, giro: 0, ultimo: null, oggetto: null, scelte: null };

            function qrBase45Codifica(b) {
                let s = '';
                for (let i = 0; i < b.length; i += 2) {
                    if (i + 1 < b.length) { const n = b[i] * 256 + b[i + 1]; s += QR_B45[n % 45] + QR_B45[Math.floor(n / 45) % 45] + QR_B45[Math.floor(n / 2025)]; }
                    else { const n = b[i]; s += QR_B45[n % 45] + QR_B45[Math.floor(n / 45)]; }
                }
                return s;
            }
            function qrBase45Decodifica(s) {
                const v = []; for (const c of s) { const k = QR_B45.indexOf(c); if (k < 0) throw new Error('carattere non valido'); v.push(k); }
                const out = [];
                for (let i = 0; i < v.length; i += 3) {
                    if (i + 2 < v.length) { const n = v[i] + v[i + 1] * 45 + v[i + 2] * 2025; if (n > 65535) throw new Error('dati rovinati'); out.push(n >> 8, n & 255); }
                    else if (i + 1 < v.length) { const n = v[i] + v[i + 1] * 45; if (n > 255) throw new Error('dati rovinati'); out.push(n); }
                    else throw new Error('dati incompleti');
                }
                return Uint8Array.from(out);
            }
            let qrTabellaCrc = null;
            function qrCrc32(b) {
                if (!qrTabellaCrc) { qrTabellaCrc = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; qrTabellaCrc[n] = c >>> 0; } }
                let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = qrTabellaCrc[(c ^ b[i]) & 255] ^ (c >>> 8);
                return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).toUpperCase().padStart(8, '0');
            }
            async function qrFlusso(bytes, CostruttoreFlusso, formato) {
                const fl = new CostruttoreFlusso(formato);
                return new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(fl)).arrayBuffer());
            }
            /** Dati → byte: primo byte 1 = compressi (deflate), 0 = così come sono (se il browser non sa comprimere). */
            async function qrImpacchetta(oggetto) {
                const grezzo = new TextEncoder().encode(JSON.stringify(oggetto));
                if (typeof CompressionStream === 'function') {
                    try { const c = await qrFlusso(grezzo, CompressionStream, 'deflate-raw'); return Uint8Array.from([1, ...c]); } catch (_) { /* si va senza */ }
                }
                return Uint8Array.from([0, ...grezzo]);
            }
            async function qrDisimpacchetta(payload) {
                let dati = payload.slice(1);
                if (payload[0] === 1) {
                    if (typeof DecompressionStream !== 'function') throw new Error('Questo dispositivo non sa leggere i dati compressi: usa un browser più recente.');
                    dati = await qrFlusso(dati, DecompressionStream, 'deflate-raw');
                } else if (payload[0] !== 0) throw new Error('formato dei codici sconosciuto');
                return JSON.parse(new TextDecoder().decode(dati));
            }
            /** I testi dei codici, nell'ordine: DPSH1:<sessione>:<n>:<di>:<impronta>:<dati>. */
            function qrFrames(payload) {
                const b45 = qrBase45Codifica(payload), crc = qrCrc32(payload);
                const sid = Array.from({ length: 4 }, () => QR_B45[Math.floor(Math.random() * 36)]).join('');
                const pezzi = []; for (let i = 0; i < b45.length; i += QR_CARATTERI) pezzi.push(b45.slice(i, i + QR_CARATTERI));
                return pezzi.map((p, i) => `DPSH1:${sid}:${i + 1}:${pezzi.length}:${crc}:${p}`);
            }
            /** Chi legge: raccoglie i codici in qualsiasi ordine e dice a che punto è. */
            function qrNuovoRicevitore() {
                const r = { sid: null, crc: null, totale: 0, pezzi: new Map() };
                r.aggiungi = (testo) => {
                    const m = /^DPSH1:([0-9A-Z]{4}):(\d{1,4}):(\d{1,4}):([0-9A-F]{8}):([0-9A-Z $%*+\-./:]*)$/.exec(String(testo || ''));
                    if (!m) return { esito: 'non-dpsh' };
                    const n = +m[2], tot = +m[3];
                    if (!n || n > tot) return { esito: 'non-dpsh' };
                    if (r.sid === null) { r.sid = m[1]; r.crc = m[4]; r.totale = tot; }
                    if (m[1] !== r.sid || m[4] !== r.crc || tot !== r.totale) return { esito: 'altra-sequenza' };
                    const nuovo = !r.pezzi.has(n); if (nuovo) r.pezzi.set(n, m[5]);
                    return { esito: nuovo ? 'nuovo' : 'doppio', ricevuti: r.pezzi.size, totale: r.totale, completo: r.pezzi.size === r.totale };
                };
                r.completo = () => r.totale > 0 && r.pezzi.size === r.totale;
                r.mancanti = () => { const m = []; for (let i = 1; i <= r.totale; i++) if (!r.pezzi.has(i)) m.push(i); return m; };
                /** Mette insieme i pezzi, controlla l'impronta e restituisce i dati. */
                r.risultato = async () => {
                    if (!r.completo()) throw new Error('mancano ancora ' + r.mancanti().length + ' codici');
                    let s = ''; for (let i = 1; i <= r.totale; i++) s += r.pezzi.get(i);
                    const payload = qrBase45Decodifica(s);
                    if (qrCrc32(payload) !== r.crc) throw new Error('i dati non corrispondono (impronta diversa): rifai la lettura');
                    return qrDisimpacchetta(payload);
                };
                return r;
            }

            // ---------- Cosa si porta ----------
            /** Una foto grande → una foto piccola (lato lungo 240 px, JPEG). Null se non si può (nessuna tela). */
            async function qrMiniaturaFoto(dataUrl) {
                if (!dataUrl || typeof Image === 'undefined' || !document.createElement('canvas').getContext) return null;
                try {
                    const img = await new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = dataUrl; });
                    for (const lato of [240, 180, 130]) {
                        const k = Math.min(1, lato / Math.max(img.width, img.height));
                        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
                        const x = c.getContext('2d'); if (!x) return null; x.drawImage(img, 0, 0, c.width, c.height);
                        for (const q of [0.55, 0.4, 0.3]) { const u = c.toDataURL('image/jpeg', q); if (u.length <= QR_FOTO_MAX) return u; }
                    }
                } catch (_) { /* senza miniatura */ }
                return null;
            }
            const qrSenzaImmaginiNelleNote = html => String(html || '').replace(/<img\b[^>]*>/gi, '');
            /** Il progetto, sfrondato di ciò che non va nei QR. scelte = { prove: [id] | null (tutte), note, foto }. */
            async function qrCostruisciProgetto(pid, scelte) {
                const orig = state.projects && state.projects[pid];
                if (!orig) throw new Error('Progetto non trovato.');
                const sc = Object.assign({ prove: null, note: true, foto: false }, scelte || {});
                const proj = sc.foto || sc.note ? await rehydrateProjectPhotosForExport(orig) : JSON.parse(JSON.stringify(orig));
                const lasciati = [];
                ['dtm', 'tavole3d', 'librerie'].forEach(k => { if (proj[k] !== undefined) { delete proj[k]; lasciati.push(k); } });
                const ammesse = sc.prove ? new Set(sc.prove) : null;
                Object.keys(proj.surveys || {}).forEach(sid => { if (ammesse && !ammesse.has(sid)) delete proj.surveys[sid]; });
                let foto = 0, fotoSenza = 0;
                Object.values(proj.surveys || {}).forEach(s => { delete s.templateImages; });
                for (const s of Object.values(proj.surveys || {})) {
                    for (const f of (s.photos || [])) {
                        if (sc.foto && f.dataUrl) {
                            let m = qrFotoPiccole.get(f.id + ':' + f.dataUrl.length);
                            if (!m) { m = await qrMiniaturaFoto(f.dataUrl); if (m) qrFotoPiccole.set(f.id + ':' + f.dataUrl.length, m); }
                            if (m) { f.dataUrl = m; f.miniaturaQr = true; foto++; continue; }
                        }
                        delete f.dataUrl; fotoSenza++;
                    }
                }
                if (!sc.note) { delete proj.notes; }
                else if (proj.notes) { delete proj.notes.htmlPrimaDelMotore; if (proj.notes.html) proj.notes.html = qrSenzaImmaginiNelleNote(proj.notes.html); }
                proj.versioneSchema = VERSIONE_SCHEMA_DATI;
                return { progetto: proj, foto, fotoSenza, lasciati };
            }
            /** Quanti codici e quanto tempo servono per ciò che è scelto. */
            async function qrPreparaProgetto(pid, scelte) {
                const c = await qrCostruisciProgetto(pid, scelte);
                const payload = await qrImpacchetta(c.progetto);
                const frames = qrFrames(payload);
                return Object.assign(c, { frames, byte: payload.length, secondi: Math.ceil(frames.length / statoQr.fps) });
            }

            // ---------- Finestra ----------
            const modalQr = document.getElementById('modalQr'), modalQrOverlay = document.getElementById('modalQrOverlay');
            const qrEl = id => document.getElementById(id);
            const qrTempo = s => s < 90 ? s + ' secondi' : Math.round(s / 60) + ' minuti';
            function qrScelteDallaFinestra() {
                const prove = [...qrEl('qrScelte').querySelectorAll('input[data-prova]')];
                return { prove: prove.filter(i => i.checked).map(i => i.dataset.prova), note: !!qrEl('qrScelte').querySelector('#qrNote') && qrEl('qrNote').checked, foto: !!qrEl('qrScelte').querySelector('#qrFoto') && qrEl('qrFoto').checked };
            }
            let qrGiroStima = 0;
            async function qrAggiornaRiepilogo() {
                const giro = ++qrGiroStima, r = qrEl('qrRiepilogo'), b = qrEl('btnQrAvvia');
                const sc = qrScelteDallaFinestra();
                if (!sc.prove.length) { r.textContent = 'Scegli almeno una prova.'; b.disabled = true; return null; }
                r.textContent = 'Calcolo…'; b.disabled = true;
                try {
                    const p = await qrPreparaProgetto(statoQr.progetto, sc);
                    if (giro !== qrGiroStima) return null;
                    let t = `${p.frames.length} codici · circa ${qrTempo(p.secondi)} · ${formattaMegabyte(p.byte).replace(/^0[,.]00 MB/, '< 0,01 MB')}`;
                    if (sc.foto) t += `\n${p.foto} foto piccole${p.fotoSenza ? `, ${p.fotoSenza} senza immagine` : ''}.`;
                    else if (p.fotoSenza) t += `\n${p.fotoSenza} foto restano a casa (solo i dati: GPS, ora).`;
                    if (p.lasciati.length) t += '\nNon vanno nei QR: ' + p.lasciati.map(k => ({ dtm: 'DTM', tavole3d: 'tavole', librerie: 'template e archivio' }[k] || k)).join(', ') + ' (usa «Porta sul PC»).';
                    r.style.whiteSpace = 'pre-line'; r.textContent = t;
                    b.disabled = p.frames.length === 0;
                    statoQr.preparato = p; statoQr.scelte = sc;
                    return p;
                } catch (e) { if (giro === qrGiroStima) { r.textContent = 'Errore: ' + ((e && e.message) || e); } return null; }
            }
            function qrDisegnaScelte(proj) {
                const surv = Object.entries(proj.surveys || {});
                const haFoto = surv.some(([, s]) => (s.photos || []).length), haNote = !!(proj.notes && (proj.notes.html || '').length);
                const nomeProva = (s, id) => testoSicuro((s.header && (s.header.nomeProva || s.header.name || s.header.sigla)) || ('Prova ' + id.slice(-4)));
                qrEl('qrScelte').innerHTML = '<strong>Cosa porti</strong>'
                    + '<label><input type="checkbox" checked disabled> Dati del progetto e strati</label>'
                    + surv.map(([id, s]) => `<label class="sotto"><input type="checkbox" data-prova="${testoSicuro(id)}" checked> ${nomeProva(s, id)} <span class="peso">${(s.logs || []).length} int.</span></label>`).join('')
                    + (haNote ? '<label><input type="checkbox" id="qrNote" checked> Note del progetto (senza immagini)</label>' : '')
                    + (haFoto ? '<label><input type="checkbox" id="qrFoto"> Foto piccole (circa 5–8 KB l\'una)</label>' : '');
                qrEl('qrScelte').querySelectorAll('input').forEach(i => i.addEventListener('change', qrAggiornaRiepilogo));
            }
            function apriQr(pid, scheda) {
                const proj = pid && state.projects && state.projects[pid];
                statoQr.progetto = proj ? pid : null;
                qrEl('lblQrNome').textContent = proj ? (proj.name || proj.comune || 'Progetto') : 'Ricevi';
                if (proj) qrDisegnaScelte(proj); else qrEl('qrScelte').innerHTML = '';
                modalQrOverlay.classList.add('open'); modalQr.classList.add('open');
                qrScheda(scheda || (proj ? 'mostra' : 'leggi'));
                if (proj) qrAggiornaRiepilogo();
            }
            function chiudiQr() { qrFerma(); qrSpegniCamera(); qrGiroStima++; modalQrOverlay.classList.remove('open'); modalQr.classList.remove('open'); }
            function qrScheda(nome) {
                statoQr.scheda = nome;
                qrEl('qrPannelloMostra').hidden = nome !== 'mostra'; qrEl('qrPannelloLeggi').hidden = nome !== 'leggi';
                [['btnQrSchedaMostra', 'mostra'], ['btnQrSchedaLeggi', 'leggi']].forEach(([id, n]) => { const b = qrEl(id); b.classList.toggle('premuto', n === nome); b.setAttribute('aria-pressed', n === nome ? 'true' : 'false'); });
                qrEl('btnQrSchedaMostra').disabled = !statoQr.progetto;
                if (nome !== 'mostra') qrFerma(); else qrSpegniCamera();
            }

            // ---------- Mostra ----------
            function qrMostraFrame() {
                if (!statoQr.frames.length) return;
                const testo = statoQr.frames[statoQr.i % statoQr.frames.length];
                const q = qrcode(0, 'L'); q.addData(testo, 'Alphanumeric'); q.make();
                qrEl('qrFigura').innerHTML = q.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
                qrEl('qrContatore').textContent = `${statoQr.i % statoQr.frames.length + 1} / ${statoQr.frames.length}`;
                statoQr.i++;
            }
            function qrAvviaTimer() { clearInterval(statoQr.timer); if (!statoQr.pausa) statoQr.timer = setInterval(qrMostraFrame, 1000 / statoQr.fps); }
            async function qrAvvia() {
                const p = statoQr.preparato || await qrAggiornaRiepilogo(); if (!p) return;
                statoQr.frames = p.frames; statoQr.i = 0; statoQr.pausa = false; qrEl('btnQrPausa').textContent = 'Pausa';
                qrEl('qrSchermo').hidden = false; qrEl('btnQrAvvia').hidden = true;
                qrMostraFrame(); qrAvviaTimer();
                try { if (navigator.wakeLock) navigator.wakeLock.request('screen').catch(() => {}); } catch (_) { /* schermo come capita */ }
            }
            function qrFerma() { clearInterval(statoQr.timer); statoQr.timer = null; statoQr.frames = []; const s = qrEl('qrSchermo'); if (s) s.hidden = true; const b = qrEl('btnQrAvvia'); if (b) b.hidden = false; }
            function qrVelocita(delta) { statoQr.fps = Math.max(1, Math.min(10, statoQr.fps + delta)); if (statoQr.timer || statoQr.pausa) qrAvviaTimer(); qrAggiornaRiepilogo(); }

            // ---------- Leggi ----------
            function qrMostraAvanzamento() {
                const l = statoQr.lettore; if (!l) return;
                qrEl('qrAvanzamento').textContent = l.totale ? `Letti ${l.pezzi.size} codici su ${l.totale}.` + (l.completo() ? ' Fatto.' : '') : 'Cerco il primo codice…';
                qrEl('qrBarra').style.width = l.totale ? (100 * l.pezzi.size / l.totale) + '%' : '0%';
            }
            /** Un testo letto da un codice: lo passa al ricevitore e, a sequenza completa, controlla e prepara l'importazione. */
            async function qrLeggiTesto(testo) {
                if (!statoQr.lettore) statoQr.lettore = qrNuovoRicevitore();
                const e = statoQr.lettore.aggiungi(testo);
                if (e.esito === 'nuovo') { qrMostraAvanzamento(); try { navigator.vibrate && navigator.vibrate(15); } catch (_) { /* nessuna vibrazione */ } }
                if (e.esito === 'altra-sequenza' && !statoQr.avvisoAltra) { statoQr.avvisoAltra = true; mostraToast('Questo codice è di un\'altra sequenza: lo ignoro.'); }
                if (e.completo && !statoQr.oggetto) {
                    try {
                        statoQr.oggetto = await statoQr.lettore.risultato();
                        const o = statoQr.oggetto, prove = Object.keys(o.surveys || {}).length, foto = Object.values(o.surveys || {}).reduce((n, s) => n + (s.photos || []).filter(f => f.dataUrl).length, 0);
                        const esito = qrEl('qrEsito'); esito.hidden = false;
                        esito.textContent = `Arrivato: «${o.name || o.comune || 'progetto'}» · ${prove} prove · ${foto} foto piccole. Tocca Importa.`;
                        qrEl('btnQrImporta').disabled = false; qrSpegniCamera(); qrMostraAvanzamento();
                    } catch (err) { const esito = qrEl('qrEsito'); esito.hidden = false; esito.textContent = 'Lettura non riuscita: ' + ((err && err.message) || err); statoQr.lettore = null; qrMostraAvanzamento(); }
                }
                return e;
            }
            async function qrImportaLetto() {
                const o = statoQr.oggetto; if (!o) return null;
                const r = importProjectsFromJSON(JSON.parse(JSON.stringify(o)));
                statoQr.oggetto = null; statoQr.lettore = null; qrEl('btnQrImporta').disabled = true;
                if (typeof renderHomeProjects === 'function') renderHomeProjects();
                mostraToast(`Importato: ${r.importedCount} progetto. Le foto sono piccole: le originali arrivano col pacchetto.`);
                return r;
            }
            function qrSpegniCamera() {
                if (statoQr.ciclo) { cancelAnimationFrame(statoQr.ciclo); statoQr.ciclo = null; }
                if (statoQr.flusso) { statoQr.flusso.getTracks().forEach(t => t.stop()); statoQr.flusso = null; }
                const v = qrEl('qrVideo'); if (v) v.srcObject = null;
                const b = qrEl('btnQrCamera'); if (b) b.textContent = 'Avvia la fotocamera';
            }
            async function qrAvviaCamera() {
                if (statoQr.flusso) { qrSpegniCamera(); return; }
                if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { qrEl('qrAvanzamento').textContent = 'Questo dispositivo non permette di usare la fotocamera da qui.'; return; }
                try {
                    statoQr.flusso = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
                } catch (e) { qrEl('qrAvanzamento').textContent = 'Fotocamera non disponibile o permesso negato.'; return; }
                const v = qrEl('qrVideo'); v.srcObject = statoQr.flusso; try { await v.play(); } catch (_) { /* parte da sé */ }
                qrEl('btnQrCamera').textContent = 'Ferma la fotocamera'; statoQr.avvisoAltra = false;
                if (!statoQr.lettore) statoQr.lettore = qrNuovoRicevitore(); qrMostraAvanzamento();
                const rilevatore = typeof BarcodeDetector === 'function' ? (() => { try { return new BarcodeDetector({ formats: ['qr_code'] }); } catch (_) { return null; } })() : null;
                const tela = qrEl('qrTela'), x = tela.getContext('2d', { willReadFrequently: true });
                let ultimo = 0;
                const giro = async (t) => {
                    if (!statoQr.flusso) return;
                    statoQr.ciclo = requestAnimationFrame(giro);
                    if (t - ultimo < 90 || v.readyState < 2 || !v.videoWidth) return;
                    ultimo = t;
                    try {
                        let testo = null;
                        if (rilevatore) { const r = await rilevatore.detect(v); if (r.length) testo = r[0].rawValue; }
                        else if (typeof jsQR === 'function') {
                            const k = Math.min(1, 640 / v.videoWidth); tela.width = Math.round(v.videoWidth * k); tela.height = Math.round(v.videoHeight * k);
                            x.drawImage(v, 0, 0, tela.width, tela.height);
                            const im = x.getImageData(0, 0, tela.width, tela.height), r = jsQR(im.data, im.width, im.height, { inversionAttempts: 'dontInvert' });
                            if (r) testo = r.data;
                        }
                        if (testo) await qrLeggiTesto(testo);
                    } catch (_) { /* un fotogramma storto: il prossimo va bene */ }
                };
                statoQr.ciclo = requestAnimationFrame(giro);
            }

            if (modalQr) {
                qrEl('btnChiudiQr').addEventListener('click', chiudiQr);
                modalQrOverlay.addEventListener('click', chiudiQr);
                qrEl('btnQrSchedaMostra').addEventListener('click', () => qrScheda('mostra'));
                qrEl('btnQrSchedaLeggi').addEventListener('click', () => qrScheda('leggi'));
                qrEl('btnQrAvvia').addEventListener('click', qrAvvia);
                qrEl('btnQrFerma').addEventListener('click', qrFerma);
                qrEl('btnQrPausa').addEventListener('click', () => { statoQr.pausa = !statoQr.pausa; qrEl('btnQrPausa').textContent = statoQr.pausa ? 'Riprendi' : 'Pausa'; qrAvviaTimer(); });
                qrEl('btnQrPiuLento').addEventListener('click', () => qrVelocita(-1));
                qrEl('btnQrPiuVeloce').addEventListener('click', () => qrVelocita(1));
                qrEl('btnQrCamera').addEventListener('click', qrAvviaCamera);
                qrEl('btnQrImporta').addEventListener('click', qrImportaLetto);
                // dalla finestra «Porta sul PC» e dalla Home
                const portaQr = document.createElement('button');
                portaQr.type = 'button'; portaQr.className = 'link'; portaQr.id = 'btnPortaQr'; portaQr.textContent = 'Progetto piccolo: passalo con i codici QR';
                const altri = document.getElementById('btnPortaAltriFormati');
                if (altri) altri.parentNode.insertBefore(portaQr, altri.nextSibling);
                portaQr.addEventListener('click', () => { const pid = portaProgettoId; chiudiPortaProgetto(); apriQr(pid, 'mostra'); });
                const homeQr = document.createElement('button');
                homeQr.type = 'button'; homeQr.className = 'bt'; homeQr.id = 'btnHomeQr'; homeQr.title = 'Ricevi un progetto piccolo leggendo codici QR con la fotocamera';
                homeQr.innerHTML = '<svg class="ico"><use href="#i-camera"/></svg>Leggi QR';
                const hi = document.getElementById('btnHomeImportProject');
                if (hi) hi.parentNode.insertBefore(homeQr, hi.nextSibling);
                homeQr.addEventListener('click', () => apriQr(null, 'leggi'));
            }
