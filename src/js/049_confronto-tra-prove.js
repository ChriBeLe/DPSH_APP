            // ============================ CONFRONTO TRA PROVE (voce 12) ============================
            // Serve a correlare gli strati tra verticali dello stesso cantiere. Le profondità sono dal piano
            // campagna: l'app non conosce la quota assoluta delle prove, e l'altitudine del GPS è troppo
            // imprecisa per allinearle.
            const COLORI_CONFRONTO = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
            let confrontoStato = { projId: null, grandezza: 'colpi', attive: new Set() };

            /** Le fasce di una colonna stratigrafica: intervalli contigui con lo stesso strato fusi in una
             * fascia. Lo strato di un intervallo è l'ultimo assegnato fino a lì, come in getEffectiveLithology;
             * prima di qualunque assegnazione, o per uno strato che non esiste più, vale il primo dell'elenco. */
            function colonnaStratigrafica(logs, strati) {
                const elenco = strati || [];
                const trova = id => elenco.find(s => s.id === id) || elenco[0] || { id: '', name: '?', color: '#94a3b8' };
                let corrente = elenco[0] ? elenco[0].id : '';
                const fasce = [];
                (logs || []).forEach(l => {
                    if (l.lithology) corrente = l.lithology;
                    const strato = trova(corrente);
                    const da = parseFloat(l.start) || 0;
                    const a = parseFloat(l.end) || 0;
                    const ultima = fasce[fasce.length - 1];
                    if (ultima && ultima.stratoId === strato.id && Math.abs(ultima.a - da) < 0.001) ultima.a = a;
                    else fasce.push({ da, a, stratoId: strato.id, nome: strato.name, colore: strato.color || '#94a3b8' });
                });
                return fasce;
            }

            /** I punti di una prova per il confronto: un valore per intervallo, colpi N o Rpd (kg/cm²),
             * ordinati per profondità. */
            function serieConfrontoProva(surv, grandezza) {
                const instrument = (surv && surv.instrument) || {};
                const stepCm = parseFloat((surv && surv.settings && surv.settings.stepCm) || 20);
                return ((surv && surv.logs) || [])
                    .map(l => ({
                        da: parseFloat(l.start) || 0,
                        a: parseFloat(l.end) || 0,
                        valore: grandezza === 'rpd' ? rpdDiLog(l, instrument, stepCm) : (parseFloat(l.colpi) || 0)
                    }))
                    .filter(pt => pt.a > pt.da)
                    .sort((x, y) => x.da - y.da);
            }

            /** Un fondo scala «tondo» per l'asse dei valori (1, 2, 2,5, 5 per potenze di 10), mai sotto il dato. */
            function massimoTondo(v) {
                if (!(v > 0)) return 10;
                const potenza = Math.pow(10, Math.floor(Math.log10(v)));
                for (const passo of [1, 2, 2.5, 5, 10]) {
                    if (passo * potenza >= v) return passo * potenza;
                }
                return 10 * potenza;
            }

            function proveConfrontabili(proj) {
                return Object.values((proj && proj.surveys) || {})
                    .filter(s => (s.logs || []).length > 0)
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0) || (a.updatedAt || 0) - (b.updatedAt || 0));
            }

            function apriConfrontoProve(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj) return;
                if (state.uiState && state.uiState.currentView === 'field' && projId === state.currentProjectId) syncStateToProject();
                const prove = proveConfrontabili(proj);
                if (prove.length < 2) {
                    appAlert('Per confrontare servono almeno due prove con intervalli registrati in questo progetto.');
                    return;
                }
                confrontoStato = { projId, grandezza: confrontoStato.grandezza || 'colpi', attive: new Set(proveFisiche(prove).map(s => s.id)) };
                renderConfrontoProve();
                const overlay = document.getElementById('modalConfrontoProveOverlay');
                const finestra = document.getElementById('modalConfrontoProve');
                if (overlay) overlay.classList.add('open');
                if (finestra) finestra.classList.add('open');
            }

            function chiudiConfrontoProve() {
                const overlay = document.getElementById('modalConfrontoProveOverlay');
                const finestra = document.getElementById('modalConfrontoProve');
                if (overlay) overlay.classList.remove('open');
                if (finestra) finestra.classList.remove('open');
            }

            function renderConfrontoProve() {
                const proj = state.projects && state.projects[confrontoStato.projId];
                const boxGrafico = document.getElementById('confrontoGrafico');
                if (!proj || !boxGrafico) return;
                const prove = proveConfrontabili(proj);
                const colore = new Map(prove.map((s, i) => [s.id, COLORI_CONFRONTO[i % COLORI_CONFRONTO.length]]));
                const numero = s => testoSicuro((s.header && s.header.provaNr) || '?');
                const titolo = document.getElementById('lblConfrontoTitolo');
                if (titolo) titolo.textContent = 'Confronta prove · ' + (proj.name || proj.comune || 'Progetto');

                const boxGrandezza = document.getElementById('confrontoGrandezza');
                if (boxGrandezza) {
                    boxGrandezza.innerHTML = [['colpi', 'Colpi N'], ['rpd', 'Rpd (kg/cm²)']].map(([id, nome]) => {
                        const attivo = confrontoStato.grandezza === id;
                        const aspetto = attivo
                            ? 'background: var(--accent); color: var(--on-accent); border: 1px solid var(--accent);'
                            : 'background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border);';
                        return `<button type="button" data-grandezza="${id}" aria-pressed="${attivo}" style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; ${aspetto}">${nome}</button>`;
                    }).join('');
                    boxGrandezza.querySelectorAll('[data-grandezza]').forEach(b => b.addEventListener('click', () => {
                        confrontoStato.grandezza = b.getAttribute('data-grandezza');
                        renderConfrontoProve();
                    }));
                }

                const boxProve = document.getElementById('confrontoProve');
                if (boxProve) {
                    boxProve.innerHTML = prove.map(s => {
                        const attiva = confrontoStato.attive.has(s.id);
                        const c = colore.get(s.id);
                        return `<button type="button" data-prova="${s.id}" aria-pressed="${attiva}" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; background: ${attiva ? 'var(--bg-card)' : 'transparent'}; color: ${attiva ? 'var(--text-main)' : 'var(--text-muted)'}; border: 1.5px solid ${attiva ? c : 'var(--border)'};"><span style="width: 10px; height: 10px; border-radius: 50%; box-sizing: border-box; background: ${attiva ? c : 'transparent'}; border: 2px solid ${c};"></span>DPSH ${numero(s)}</button>`;
                    }).join('');
                    boxProve.querySelectorAll('[data-prova]').forEach(b => b.addEventListener('click', () => {
                        const id = b.getAttribute('data-prova');
                        if (confrontoStato.attive.has(id)) {
                            if (confrontoStato.attive.size > 1) confrontoStato.attive.delete(id);
                        } else {
                            confrontoStato.attive.add(id);
                        }
                        renderConfrontoProve();
                    }));
                }

                const attive = prove.filter(s => confrontoStato.attive.has(s.id));
                const serie = attive.map(s => ({ s, punti: serieConfrontoProva(s, confrontoStato.grandezza) }));
                const maxProf = Math.max(1, ...attive.map(s => (s.logs || []).reduce((m, l) => Math.max(m, parseFloat(l.end) || 0), 0)));
                const maxVal = massimoTondo(Math.max(0, ...serie.map(x => x.punti.reduce((m, pt) => Math.max(m, pt.valore), 0))));
                const padL = 30, padT = 30, padB = 10, padR = 6, plotW = 220, gapMezzo = 18, colW = 22, colGap = 8;
                const larghezzaColonne = attive.length * colW + Math.max(0, attive.length - 1) * colGap;
                const W = padL + plotW + gapMezzo + larghezzaColonne + padR;
                const H = Math.round(Math.min(1100, Math.max(280, maxProf * 36)));
                const y = d => padT + (d / maxProf) * (H - padT - padB);
                const x = v => padL + (v / maxVal) * plotW;
                const asse = v => (v >= 10 || Number.isInteger(v)) ? String(Math.round(v)) : v.toFixed(1);
                let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" style="display: block; max-width: ${Math.round(W * 1.7)}px; margin: 0 auto;" role="img" aria-label="Confronto tra prove per profondità">`;
                const passoProf = maxProf <= 4 ? 0.5 : (maxProf <= 12 ? 1 : 2);
                for (let d = 0; d <= maxProf + 0.0001; d += passoProf) {
                    const metro = Math.abs(d - Math.round(d)) < 0.001;
                    const yy = y(d).toFixed(1);
                    svg += `<line x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" stroke="var(--border)" stroke-width="${metro ? 0.8 : 0.5}"${metro ? '' : ' stroke-dasharray="2 3"'}/>`;
                    svg += `<text x="${padL - 5}" y="${(y(d) + 3).toFixed(1)}" font-size="9" text-anchor="end" fill="var(--text-muted)" font-family="var(--font-mono)">${d.toFixed(passoProf < 1 ? 1 : 0)}</text>`;
                }
                for (let k = 0; k <= 4; k++) {
                    const v = maxVal * k / 4;
                    const xx = x(v).toFixed(1);
                    svg += `<line x1="${xx}" y1="${padT}" x2="${xx}" y2="${H - padB}" stroke="var(--border)" stroke-width="0.5" stroke-dasharray="2 3"/>`;
                    svg += `<text x="${xx}" y="${padT - 6}" font-size="9" text-anchor="middle" fill="var(--text-muted)" font-family="var(--font-mono)">${asse(v)}</text>`;
                }
                svg += `<text x="${padL}" y="11" font-size="9.5" font-weight="700" fill="var(--text-main)">${confrontoStato.grandezza === 'rpd' ? 'Rpd (kg/cm²)' : 'Colpi N'}</text>`;
                svg += `<text x="2" y="${padT - 6}" font-size="9" fill="var(--text-muted)">m</text>`;
                svg += `<line x1="${padL}" y1="${padT}" x2="${padL}" y2="${H - padB}" stroke="var(--border-strong)" stroke-width="1.2"/>`;
                serie.forEach(({ s, punti }) => {
                    let percorso = '';
                    let precedente = null;
                    punti.forEach(pt => {
                        const px = x(pt.valore).toFixed(1);
                        const contiguo = precedente && Math.abs(precedente.a - pt.da) < 0.001;
                        percorso += (contiguo ? 'L' : 'M') + px + ',' + y(pt.da).toFixed(1) + 'L' + px + ',' + y(pt.a).toFixed(1);
                        precedente = pt;
                    });
                    if (percorso) svg += `<path d="${percorso}" fill="none" stroke="${colore.get(s.id)}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" opacity="0.9"><title>DPSH ${numero(s)}</title></path>`;
                });
                const xColonne = padL + plotW + gapMezzo;
                const stratiUsati = new Map();
                attive.forEach((s, i) => {
                    const x0 = xColonne + i * (colW + colGap);
                    svg += `<text x="${(x0 + colW / 2).toFixed(1)}" y="${padT - 6}" font-size="9" font-weight="800" text-anchor="middle" fill="${colore.get(s.id)}" font-family="var(--font-mono)">${numero(s)}</text>`;
                    colonnaStratigrafica(s.logs, proj.strati).forEach(f => {
                        stratiUsati.set(f.stratoId, f);
                        svg += `<rect x="${x0}" y="${y(f.da).toFixed(1)}" width="${colW}" height="${Math.max(0.5, y(f.a) - y(f.da)).toFixed(1)}" fill="${testoSicuro(f.colore)}" stroke="var(--bg-card)" stroke-width="0.6"><title>DPSH ${numero(s)} · ${testoSicuro(f.nome)} · ${f.da.toFixed(2)}–${f.a.toFixed(2)} m</title></rect>`;
                    });
                });
                svg += `</svg>`;
                boxGrafico.innerHTML = svg;

                const legenda = document.getElementById('confrontoLegendaStrati');
                if (legenda) {
                    legenda.innerHTML = Array.from(stratiUsati.values()).map(f =>
                        `<span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width: 12px; height: 12px; border-radius: 3px; background: ${testoSicuro(f.colore)}; border: 1px solid var(--border);"></span>${testoSicuro(f.nome)}</span>`
                    ).join('');
                }
            }

            const btnProjActConfronta = document.getElementById('btnProjActConfronta');
            if (btnProjActConfronta) btnProjActConfronta.addEventListener('click', () => {
                if (!projectActionsContext) return;
                const { projId } = projectActionsContext;
                closeProjectActionsModal();
                apriConfrontoProve(projId);
            });
            const btnCloseConfrontoX = document.getElementById('btnCloseConfrontoX');
            if (btnCloseConfrontoX) btnCloseConfrontoX.addEventListener('click', chiudiConfrontoProve);
            const modalConfrontoProveOverlay = document.getElementById('modalConfrontoProveOverlay');
            if (modalConfrontoProveOverlay) modalConfrontoProveOverlay.addEventListener('click', chiudiConfrontoProve);


            /** Aggiorna la sezione "Spazio occupato" del menu. Gli elementi possono non esistere
             * (drawer mai aperto): in quel caso non fa nulla, come il resto dell'app. */
            let spazioUltimoCalcolo = null;
            async function aggiornaPannelloSpazio() {
                const elRiepilogo = document.getElementById('spazioRiepilogo');
                const elBarra = document.getElementById('spazioBarra');
                const elDettaglio = document.getElementById('spazioDettaglio');
                const btnOrfane = document.getElementById('btnSpazioPulisciOrfane');
                aggiornaRiepilogoCopieEBackup();
                if (!elRiepilogo) return;
                elRiepilogo.textContent = 'Calcolo in corso…';
                const s = await calcolaSpazioOccupato();
                spazioUltimoCalcolo = s;

                if (s.stimaDisponibile && s.quota > 0) {
                    const pct = Math.min(100, (s.usato / s.quota) * 100);
                    elRiepilogo.innerHTML = `<strong>${formattaByte(s.usato)}</strong> usati su <strong>${formattaByte(s.quota)}</strong> concessi all'app (${pct.toFixed(1)}%).`;
                    if (elBarra) {
                        elBarra.style.width = `${Math.max(pct, 1)}%`;
                        // Il colore cambia solo quando c'è davvero da preoccuparsi: una barra sempre
                        // allarmata è una barra che si smette di guardare.
                        elBarra.style.background = pct >= 90 ? 'var(--danger)' : (pct >= 70 ? 'var(--warning, #f59e0b)' : 'var(--accent)');
                    }
                } else {
                    // Alcuni browser (e certe WebView dentro un APK) non espongono la stima: meglio
                    // dirlo che mostrare uno zero che sembrerebbe "non stai occupando niente".
                    elRiepilogo.innerHTML = 'Questo dispositivo non comunica lo spazio totale disponibile. Qui sotto trovi comunque quanto occupano i tuoi dati.';
                    if (elBarra) elBarra.style.width = '0%';
                }

                if (elDettaglio) {
                    elDettaglio.innerHTML = [
                        `📄 Progetti, prove e template: <strong>${formattaByte(s.localStorageBytes)}</strong>`,
                        `📷 Foto: <strong>${formattaByte(s.fotoBytes)}</strong> (${s.fotoCount})`,
                        s.noteCount > 0 ? `🖼️ Immagini nelle note: <strong>${formattaByte(s.noteBytes)}</strong> (${s.noteCount})` : '',
                        copieAutomatiche.indice.length > 0 ? `🕘 Copie automatiche: <strong>${formattaByte(copieAutomatiche.indice.reduce((n, v) => n + (v.byte || 0), 0))}</strong> (${copieAutomatiche.indice.length})` : '',
                        s.orfaneCount > 0
                            ? `<span style="color:var(--danger); font-weight:700;">🗑️ Recuperabili: ${formattaByte(s.orfaneBytes)} in ${s.orfaneCount} immagini di progetti eliminati</span>`
                            : `<span style="color:var(--success);">✓ Nessuna immagine da recuperare</span>`
                    ].filter(Boolean).join('<br>');
                }
                if (btnOrfane) {
                    btnOrfane.disabled = s.orfaneCount === 0;
                    btnOrfane.style.opacity = s.orfaneCount === 0 ? '0.5' : '1';
                    btnOrfane.innerHTML = s.orfaneCount > 0
                        ? `<svg class="ico"><use href="#i-trash"/></svg> Recupera ${formattaByte(s.orfaneBytes)}`
                        : `<svg class="ico"><use href="#i-trash"/></svg> Foto orfane`;
                }
            }

            const btnSpazioRicalcola = document.getElementById('btnSpazioRicalcola');
            if (btnSpazioRicalcola) btnSpazioRicalcola.addEventListener('click', aggiornaPannelloSpazio);
            const btnSpazioPulisciOrfane = document.getElementById('btnSpazioPulisciOrfane');
            if (btnSpazioPulisciOrfane) {
                btnSpazioPulisciOrfane.addEventListener('click', async () => {
                    const s = spazioUltimoCalcolo;
                    if (!s || s.orfaneCount === 0) { await aggiornaPannelloSpazio(); return; }
                    const ok = await appConfirmDelete(
                        `Eliminare definitivamente ${s.orfaneCount} immagini rimaste da progetti già cancellati?\n\nRecuperi circa ${formattaByte(s.orfaneBytes)}.\n\nNessuna prova o nota ancora esistente le usa: non stai perdendo niente di visibile nell'app.`
                    );
                    if (!ok) return;
                    const eliminate = await eliminaFotoOrfane(s.orfaneFotoIds, s.orfaneNoteIds);
                    await aggiornaPannelloSpazio();
                    mostraToast(eliminate === 1 ? 'Rimossa 1 immagine non più utilizzata' : `Rimosse ${eliminate} immagini non più utilizzate`);
                });
            }

            // PROVA A VUOTO DELLA MIGRAZIONE NOTE. Legge, converte in memoria, confronta, e
            // riferisce. Non scrive niente: se il referto è pulito si può passare alla libreria,
            // se non lo è si aggiusta il convertitore PRIMA di toccare una nota vera.
            const btnDiagnosticaNote = document.getElementById('btnDiagnosticaNote');
            if (btnDiagnosticaNote) {
                btnDiagnosticaNote.addEventListener('click', () => {
                    const r = diagnosticaMigrazioneNote();
                    if (r.conNote === 0) {
                        appAlert(`Nessuna nota da controllare: ${r.progetti} progetti, nessuno con appunti scritti.`);
                        return;
                    }
                    const righe = [
                        `Progetti con note: ${r.conNote} su ${r.progetti}`,
                        `Testo complessivo: ${(r.caratteri / 1024).toFixed(1)} KB`,
                        '',
                        r.conPerdite.length === 0
                            ? `✅ Conversione senza perdite su tutte e ${r.senzaPerdite} le note.`
                            : `⚠️ ${r.conPerdite.length} note perderebbero qualcosa:`
                    ];
                    r.conPerdite.slice(0, 6).forEach(p => righe.push(`• ${p.progetto}: ${p.perdite.join('; ')}`));
                    if (r.conPerdite.length > 6) righe.push(`…e altre ${r.conPerdite.length - 6}.`);
                    // Le costruzioni MAI VISTE sono il dato più prezioso del referto: sono
                    // esattamente quelle che una libreria butterebbe senza dire niente.
                    const s2 = r.sconosciuti;
                    if (s2.tag.length || s2.classi.length || s2.attributi.length) {
                        righe.push('', 'Costruzioni fuori dal vocabolario previsto:');
                        if (s2.tag.length) righe.push(`• tag: ${s2.tag.join(', ')}`);
                        if (s2.classi.length) righe.push(`• classi: ${s2.classi.join(', ')}`);
                        if (s2.attributi.length) righe.push(`• attributi: ${s2.attributi.join(', ')}`);
                    } else {
                        righe.push('', 'Nessuna costruzione fuori dal vocabolario previsto.');
                    }
                    righe.push('', 'Nessuna nota è stata modificata: questa è solo una prova.');
                    appAlert(righe.join('\n'));
                });
            }

            /** Avvisa UNA VOLTA SOLA delle foto che non è stato possibile salvare e offre di
             * scaricarle subito sul telefono (finiscono in Download, come già fa "Scarica foto
             * JPG"). È la rete di sicurezza: la foto è ancora in RAM, quindi finché l'app è aperta
             * si può ancora mettere al riparo — chiudere l'app senza farlo la perderebbe. */
            async function avvisaFotoNonSalvate(fallite) {
                if (!Array.isArray(fallite) || fallite.length === 0) return;
                const quante = fallite.length;
                const testo = quante === 1
                    ? 'Non è stato possibile salvare una foto nella memoria dell\'app (spazio esaurito o memoria non disponibile).\n\nLa foto è ancora aperta in questo momento, ma chiudendo l\'app andrebbe persa.\n\nVuoi salvarla subito nei Download del telefono?'
                    : `Non è stato possibile salvare ${quante} foto nella memoria dell'app (spazio esaurito o memoria non disponibile).\n\nLe foto sono ancora aperte in questo momento, ma chiudendo l'app andrebbero perse.\n\nVuoi salvarle subito nei Download del telefono?`;
                const ok = await appConfirm(testo);
                if (!ok) return;
                fallite.forEach((f, i) => {
                    if (!f || !f.dataUrl) return;
                    const a = document.createElement('a');
                    a.href = f.dataUrl;
                    a.download = `${(f.nome || 'Foto_recuperata_' + (i + 1)).replace(/[\\/:*?"<>|]/g, '_')}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            }

            /** Legge una foto da IndexedDB. Ritorna null sia se la foto non c'è, sia se non è stato
             * possibile leggerla: il contratto resta quello di prima (una decina di chiamanti fanno
             * `|| ''`), ma i due casi non sono più indistinguibili nei log. Prima il ramo d'errore
             * era un `catch { return null }` muto: una foto illeggibile diventava un riquadro vuoto
             * nel PDF senza lasciare alcuna traccia del perché, e sembrava non fosse mai stata
             * scattata. Ora nella console resta scritto quale id ha fallito e per quale motivo. */
            async function getPhotoFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return await new Promise((resolve) => {
                        const tx = db.transaction(STORE_NAME, 'readonly');
                        const store = tx.objectStore(STORE_NAME);
                        const req = store.get(id);
                        req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
                        req.onerror = () => { console.warn('IDB: foto presente ma NON LEGGIBILE, id =', id, req.error); resolve(null); };
                    });
                } catch(e) {
                    console.warn('IDB: lettura foto non riuscita, id =', id, e);
                    return null;
                }
            }

            async function deletePhotoFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        store.delete(id);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch (e) { ignoraErrore('deletePhotoFromIDB', e); }
            }

            // Stesse funzioni ma sullo store 'noteImages', per le immagini incorporate nelle
            // Note di progetto (stesso DB, stesso motivo: restare sotto il limite di localStorage).
            async function saveNoteImageToIDB(id, dataUrl) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readwrite');
                        tx.objectStore(STORE_NOTE_IMAGES).put({ id, dataUrl });
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch(e) {
                    console.warn('IDB Save error (noteImages):', e);
                }
            }
            async function getNoteImageFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readonly');
                        const req = tx.objectStore(STORE_NOTE_IMAGES).get(id);
                        req.onsuccess = (e) => resolve(req.result ? req.result.dataUrl : null);
                        req.onerror = (e) => reject(e.target.error);
                    });
                } catch(e) {
                    return null;
                }
            }
            async function deleteNoteImageFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readwrite');
                        tx.objectStore(STORE_NOTE_IMAGES).delete(id);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch (e) { ignoraErrore('deleteNoteImageFromIDB', e); }
            }

