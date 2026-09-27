            // =========================================================================
            // RITAGLIO DELLE IMMAGINI — uno strumento solo, per tutte.
            //
            // Serve alle foto delle prove e alle immagini delle note, disegni compresi. Non ce
            // n'e' una copia per tipo: i blocchi foto, il report e il PDF leggono le foto dallo
            // stesso archivio, quindi ritagliare la foto una volta la ritaglia ovunque compaia.
            //
            // IL RITAGLIO NON DISTRUGGE L'ORIGINALE. Alla prima potatura l'immagine intera viene
            // messa da parte sotto un id derivato, e ogni ritaglio successivo riparte SEMPRE da
            // li'. Due conseguenze pratiche: si puo' allargare un ritaglio fatto troppo stretto,
            // e ritagliare dieci volte non degrada l'immagine come farebbe una catena di
            // ricompressioni una sull'altra.
            // =========================================================================
            const SUFFISSO_ORIGINALE = '__orig';
            const RITAGLIO_MAX_TELA = 900;   // lato massimo della tela a schermo, non del risultato
            const MANIGLIA_RITAGLIO = 13;

            const modalRitaglioOverlay = document.getElementById('modalRitaglioOverlay');
            const modalRitaglio = document.getElementById('modalRitaglio');
            const ritaglioCanvas = document.getElementById('ritaglioCanvas');
            const lblRitaglioTitolo = document.getElementById('lblRitaglioTitolo');
            const lblRitaglioMisura = document.getElementById('lblRitaglioMisura');
            const ritaglioNotaOriginale = document.getElementById('ritaglioNotaOriginale');
            const btnRitaglioChiudiX = document.getElementById('btnRitaglioChiudiX');
            const btnRitaglioAnnulla = document.getElementById('btnRitaglioAnnulla');
            const btnRitaglioConferma = document.getElementById('btnRitaglioConferma');
            const btnRitaglioTutto = document.getElementById('btnRitaglioTutto');

            let ritaglio = null;

            function proporzioneRitaglio() {
                if (!ritaglio || ritaglio.proporzione === 'libero') return null;
                const [a, b] = ritaglio.proporzione.split(':').map(Number);
                return (a && b) ? a / b : null;
            }

            function limitaRiquadroRitaglio() {
                const r = ritaglio.riquadro, W = ritaglioCanvas.width, H = ritaglioCanvas.height;
                r.w = Math.max(24, Math.min(r.w, W));
                r.h = Math.max(24, Math.min(r.h, H));
                r.x = Math.max(0, Math.min(r.x, W - r.w));
                r.y = Math.max(0, Math.min(r.y, H - r.h));
            }

            /** Riporta il riquadro alla proporzione scelta, tenendone fermo il centro. */
            function applicaProporzioneRitaglio() {
                const p = proporzioneRitaglio();
                if (!p || !ritaglio) return;
                const r = ritaglio.riquadro;
                const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
                // Si parte dall'area attuale e si cerca il rettangolo con quella proporzione che
                // ci sta dentro: ingrandire per rispettare la proporzione porterebbe il riquadro
                // fuori dall'immagine, che e' peggio.
                let w = r.w, h = w / p;
                if (h > r.h) { h = r.h; w = h * p; }
                w = Math.min(w, ritaglioCanvas.width); h = Math.min(h, ritaglioCanvas.height);
                if (w / p > ritaglioCanvas.height) { h = ritaglioCanvas.height; w = h * p; }
                r.w = w; r.h = h; r.x = cx - w / 2; r.y = cy - h / 2;
                limitaRiquadroRitaglio();
            }

            function ridisegnaRitaglio() {
                if (!ritaglio || !ritaglioCanvas) return;
                const ctx = ritaglioCanvas.getContext('2d');
                const W = ritaglioCanvas.width, H = ritaglioCanvas.height;
                const r = ritaglio.riquadro;
                ctx.clearRect(0, 0, W, H);
                ctx.drawImage(ritaglio.immagine, 0, 0, W, H);
                // Fuori dal riquadro si scurisce: e' il modo piu' corto per dire "questo va via"
                // senza doverlo scrivere da nessuna parte.
                ctx.fillStyle = 'rgba(15,23,42,0.62)';
                ctx.fillRect(0, 0, W, r.y);
                ctx.fillRect(0, r.y + r.h, W, H - (r.y + r.h));
                ctx.fillRect(0, r.y, r.x, r.h);
                ctx.fillRect(r.x + r.w, r.y, W - (r.x + r.w), r.h);
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.strokeRect(r.x, r.y, r.w, r.h);
                // Terzi: aiutano a mettere in quadro senza aggiungere nessun comando.
                ctx.strokeStyle = 'rgba(255,255,255,0.35)';
                ctx.lineWidth = 1;
                for (let i = 1; i <= 2; i++) {
                    ctx.beginPath();
                    ctx.moveTo(r.x + (r.w * i) / 3, r.y); ctx.lineTo(r.x + (r.w * i) / 3, r.y + r.h);
                    ctx.moveTo(r.x, r.y + (r.h * i) / 3); ctx.lineTo(r.x + r.w, r.y + (r.h * i) / 3);
                    ctx.stroke();
                }
                angoliRiquadroRitaglio().forEach(a => {
                    ctx.beginPath();
                    ctx.rect(a.x - MANIGLIA_RITAGLIO / 2, a.y - MANIGLIA_RITAGLIO / 2, MANIGLIA_RITAGLIO, MANIGLIA_RITAGLIO);
                    ctx.fillStyle = '#ffffff'; ctx.fill();
                    ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke();
                });
                if (lblRitaglioMisura) {
                    const s = ritaglio.scala || 1;
                    lblRitaglioMisura.textContent = Math.round(r.w / s) + ' × ' + Math.round(r.h / s) + ' px';
                }
            }

            function angoliRiquadroRitaglio() {
                const r = ritaglio.riquadro;
                return [{ x: r.x, y: r.y }, { x: r.x + r.w, y: r.y }, { x: r.x + r.w, y: r.y + r.h }, { x: r.x, y: r.y + r.h }];
            }

            function puntoRitaglio(evt) {
                const rect = ritaglioCanvas.getBoundingClientRect();
                const sx = ritaglioCanvas.width / (rect.width || 1);
                const sy = ritaglioCanvas.height / (rect.height || 1);
                return { x: (evt.clientX - rect.left) * sx, y: (evt.clientY - rect.top) * sy };
            }

            /** Apre lo strumento su una immagine qualsiasi. Chi chiama non sa niente di tele e
             * di maniglie: passa un dataUrl e riceve indietro il dataUrl ritagliato. */
            function apriRitaglioImmagine(opzioni) {
                if (!ritaglioCanvas) return;
                const img = new Image();
                img.onload = () => {
                    const naturaleW = img.naturalWidth || img.width || RITAGLIO_MAX_TELA;
                    const naturaleH = img.naturalHeight || img.height || RITAGLIO_MAX_TELA;
                    // La tela mostra l'immagine rimpicciolita per starci a schermo, ma il taglio
                    // finale si prende dall'immagine ORIGINALE a piena risoluzione: ritagliare
                    // non deve anche rimpicciolire di nascosto.
                    const scala = Math.min(1, RITAGLIO_MAX_TELA / Math.max(naturaleW, naturaleH));
                    ritaglioCanvas.width = Math.max(1, Math.round(naturaleW * scala));
                    ritaglioCanvas.height = Math.max(1, Math.round(naturaleH * scala));
                    ritaglio = {
                        immagine: img, scala,
                        naturaleW, naturaleH,
                        riquadro: { x: 0, y: 0, w: ritaglioCanvas.width, h: ritaglioCanvas.height },
                        proporzione: 'libero',
                        pngConTrasparenza: String(opzioni.dataUrl || '').indexOf('data:image/png') === 0,
                        onConferma: opzioni.onConferma,
                        trascina: null
                    };
                    if (lblRitaglioTitolo) lblRitaglioTitolo.textContent = opzioni.titolo || 'Ritaglia';
                    if (ritaglioNotaOriginale) {
                        ritaglioNotaOriginale.style.display = opzioni.nota ? 'block' : 'none';
                        ritaglioNotaOriginale.textContent = opzioni.nota || '';
                    }
                    document.querySelectorAll('#ritaglioToolbar .ritaglio-prop').forEach(b => b.classList.toggle('is-active', b.dataset.ritaglioProp === 'libero'));
                    ridisegnaRitaglio();
                    if (modalRitaglioOverlay) modalRitaglioOverlay.classList.add('open');
                    if (modalRitaglio) modalRitaglio.classList.add('open');
                };
                img.onerror = () => appAlert('Non riesco ad aprire questa immagine per il ritaglio.');
                img.src = opzioni.dataUrl;
            }

            function chiudiRitaglio() {
                if (modalRitaglioOverlay) modalRitaglioOverlay.classList.remove('open');
                if (modalRitaglio) modalRitaglio.classList.remove('open');
                ritaglio = null;
            }
            if (btnRitaglioChiudiX) btnRitaglioChiudiX.addEventListener('click', chiudiRitaglio);
            if (btnRitaglioAnnulla) btnRitaglioAnnulla.addEventListener('click', chiudiRitaglio);
            if (modalRitaglioOverlay) modalRitaglioOverlay.addEventListener('click', chiudiRitaglio);

            document.querySelectorAll('#ritaglioToolbar .ritaglio-prop').forEach(btn => {
                btn.addEventListener('click', () => {
                    if (!ritaglio) return;
                    ritaglio.proporzione = btn.dataset.ritaglioProp;
                    document.querySelectorAll('#ritaglioToolbar .ritaglio-prop').forEach(b => b.classList.toggle('is-active', b === btn));
                    applicaProporzioneRitaglio();
                    ridisegnaRitaglio();
                });
            });
            if (btnRitaglioTutto) {
                btnRitaglioTutto.addEventListener('click', () => {
                    if (!ritaglio) return;
                    ritaglio.riquadro = { x: 0, y: 0, w: ritaglioCanvas.width, h: ritaglioCanvas.height };
                    applicaProporzioneRitaglio();
                    ridisegnaRitaglio();
                });
            }

            if (ritaglioCanvas) {
                ritaglioCanvas.addEventListener('pointerdown', (e) => {
                    if (!ritaglio) return;
                    e.preventDefault();
                    if (ritaglioCanvas.setPointerCapture) ritaglioCanvas.setPointerCapture(e.pointerId);
                    const pt = puntoRitaglio(e);
                    const angoli = angoliRiquadroRitaglio();
                    for (let i = 0; i < 4; i++) {
                        if (Math.hypot(pt.x - angoli[i].x, pt.y - angoli[i].y) <= MANIGLIA_RITAGLIO) {
                            ritaglio.trascina = { modo: 'angolo', indice: i, fisso: angoli[(i + 2) % 4] };
                            return;
                        }
                    }
                    const r = ritaglio.riquadro;
                    if (pt.x >= r.x && pt.x <= r.x + r.w && pt.y >= r.y && pt.y <= r.y + r.h) {
                        ritaglio.trascina = { modo: 'sposta', da: pt, partenza: { x: r.x, y: r.y } };
                    }
                });
                ritaglioCanvas.addEventListener('pointermove', (e) => {
                    if (!ritaglio || !ritaglio.trascina) return;
                    const pt = puntoRitaglio(e);
                    const tr = ritaglio.trascina, r = ritaglio.riquadro;
                    if (tr.modo === 'sposta') {
                        r.x = tr.partenza.x + (pt.x - tr.da.x);
                        r.y = tr.partenza.y + (pt.y - tr.da.y);
                    } else {
                        let x0 = Math.min(tr.fisso.x, pt.x), y0 = Math.min(tr.fisso.y, pt.y);
                        let w = Math.abs(pt.x - tr.fisso.x), h = Math.abs(pt.y - tr.fisso.y);
                        const p = proporzioneRitaglio();
                        if (p) {
                            // Con una proporzione bloccata comanda il lato piu' lungo, e l'angolo
                            // opposto resta fermo: e' l'unico modo perche' il riquadro non
                            // "scappi" mentre lo si tira.
                            if (w / h > p) h = w / p; else w = h * p;
                            x0 = (pt.x < tr.fisso.x) ? tr.fisso.x - w : tr.fisso.x;
                            y0 = (pt.y < tr.fisso.y) ? tr.fisso.y - h : tr.fisso.y;
                        }
                        r.x = x0; r.y = y0; r.w = w; r.h = h;
                    }
                    limitaRiquadroRitaglio();
                    ridisegnaRitaglio();
                });
                const fineRitaglio = () => { if (ritaglio) ritaglio.trascina = null; };
                ritaglioCanvas.addEventListener('pointerup', fineRitaglio);
                ritaglioCanvas.addEventListener('pointercancel', fineRitaglio);
            }

            if (btnRitaglioConferma) {
                btnRitaglioConferma.addEventListener('click', () => {
                    if (!ritaglio) return;
                    const r = ritaglio.riquadro, s = ritaglio.scala || 1;
                    const sx = Math.max(0, Math.round(r.x / s));
                    const sy = Math.max(0, Math.round(r.y / s));
                    const sw = Math.max(1, Math.round(r.w / s));
                    const sh = Math.max(1, Math.round(r.h / s));
                    const fuori = document.createElement('canvas');
                    fuori.width = sw; fuori.height = sh;
                    const c = fuori.getContext('2d');
                    c.drawImage(ritaglio.immagine, sx, sy, sw, sh, 0, 0, sw, sh);
                    // Un disegno con lo sfondo trasparente e' un PNG: convertirlo in JPEG gli
                    // metterebbe sotto un fondo nero. Il formato di partenza decide.
                    const url = ritaglio.pngConTrasparenza ? fuori.toDataURL('image/png') : fuori.toDataURL('image/jpeg', 0.88);
                    const azione = ritaglio.onConferma;
                    chiudiRitaglio();
                    if (azione) azione(url);
                });
            }

            /** Ritaglia un'immagine che vive in IndexedDB, tenendo da parte l'originale.
             * `leggi`/`scrivi` sono le funzioni dell'archivio giusto (foto o immagini delle
             * note): e' l'unica cosa che cambia tra un caso e l'altro. */
            async function ritagliaImmagineArchiviata(opzioni) {
                const { id, leggi, scrivi, cache } = opzioni;
                if (!id) return;
                // L'originale prima di tutto: se c'e', si riparte da li'. E' cio' che rende il
                // ritaglio ripensabile invece che definitivo.
                const originale = (await leggi(id + SUFFISSO_ORIGINALE)) || cache[id] || (await leggi(id));
                if (!originale) { appAlert('Non riesco a leggere questa immagine: potrebbe non essere piu' + ' ' + 'in archivio.'); return; }
                const giaConservato = !!(await leggi(id + SUFFISSO_ORIGINALE));
                apriRitaglioImmagine({
                    dataUrl: originale,
                    titolo: opzioni.titolo || 'Ritaglia',
                    nota: giaConservato
                        ? 'Stai ripartendo dall\'immagine intera: l\'originale e\' conservato, quindi puoi anche allargare un ritaglio fatto troppo stretto.'
                        : 'L\'immagine intera viene conservata: potrai sempre tornarci o rifare il ritaglio piu\' largo.',
                    onConferma: async (ritagliata) => {
                        if (!giaConservato) await scrivi(id + SUFFISSO_ORIGINALE, originale);
                        // savePhotoToIDB risponde con true/false invece di lanciare: uno spazio
                        // esaurito qui vorrebbe dire un ritaglio che sembra fatto e non c'e'.
                        if ((await scrivi(id, ritagliata)) === false) {
                            appAlert('Il ritaglio non e\' stato salvato: spazio esaurito. Libera spazio da Menu \u2630 \u2192 Spazio occupato e riprova.');
                            return;
                        }
                        cache[id] = ritagliata;
                        if (opzioni.onFatto) await opzioni.onFatto(ritagliata);
                    }
                });
            }

