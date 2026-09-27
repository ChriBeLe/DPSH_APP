            // ============================ COPIE AUTOMATICHE (voce 11) ============================
            // Fotografie dello stato leggero che saveState scrive in localStorage: tutti i dati, senza le
            // foto. Stanno in un database IndexedDB SEPARATO da quello delle foto: aggiungere un archivio
            // a DPSH_PhotoStorageDB avrebbe richiesto la versione 3, e un APK più vecchio reinstallato non
            // avrebbe più aperto il database delle foto. Due archivi: "indice" (piccolo, letto all'avvio:
            // data, motivo, progetti contenuti, id delle immagini usate) e "copie" (lo stato intero, letto
            // solo per ripristinare). Configurazione e stato in memoria: in cima allo script.

            function openCopieDB() {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(COPIE_DB_NAME, COPIE_DB_VERSION);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains('indice')) db.createObjectStore('indice', { keyPath: 'id' });
                        if (!db.objectStoreNames.contains('copie')) db.createObjectStore('copie', { keyPath: 'id' });
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = (e) => reject(e.target.error);
                });
            }

            /** Firma veloce di un testo (FNV-1a a 32 bit più la lunghezza): serve solo a non salvare due
             * copie identiche di fila, non è una garanzia crittografica. */
            function firmaTesto(testo) {
                const s = String(testo || '');
                let h = 0x811c9dc5;
                for (let i = 0; i < s.length; i++) {
                    h ^= s.charCodeAt(i);
                    h = Math.imul(h, 0x01000193) >>> 0;
                }
                return s.length + ':' + h.toString(16);
            }

            /** Cosa contiene uno stato salvato, in piccolo: per ogni progetto nome, numero di prove e ultima
             * modifica, più gli id di foto e immagini delle note che usa. Finisce nell'indice, così elenco
             * e protezione delle immagini non devono rileggere lo stato intero. */
            function riassuntoStatoPerCopia(statoSalvato) {
                const progetti = {};
                const foto = new Set();
                const note = new Set();
                ((statoSalvato && statoSalvato.photos) || []).forEach(f => { if (f && f.id) foto.add(f.id); });
                Object.entries((statoSalvato && statoSalvato.projects) || {}).forEach(([pid, proj]) => {
                    if (!proj) return;
                    const prove = Object.values(proj.surveys || {});
                    progetti[pid] = { nome: proj.name || proj.comune || 'Progetto', prove: prove.length, modificato: proj.updatedAt || 0 };
                    prove.forEach(s => ((s && s.photos) || []).forEach(f => { if (f && f.id) foto.add(f.id); }));
                    const html = (proj.notes && proj.notes.html) || '';
                    const re = /data-note-img-id="([^"]+)"/g;
                    let m;
                    while ((m = re.exec(html)) !== null) note.add(m[1]);
                });
                return { progetti, foto: Array.from(foto), note: Array.from(note) };
            }

            /** Quali copie cancellare. Le «prima di…» restano `primaGiorni` giorni, al massimo `primaMax`;
             * le periodiche restano le ultime `recenti`, più la più recente di ciascuno degli ultimi `giorni`
             * giorni. `indice` è l'elenco delle voci { id, quando, tipo }. */
            function copieDaEliminare(indice, adesso, regole) {
                const r = regole || { recenti: 20, giorni: 14, primaGiorni: 7, primaMax: 30 };
                const giorno = 86400000;
                const tieni = new Set();
                const voci = (indice || []).slice().sort((a, b) => b.quando - a.quando);
                voci.filter(v => v.tipo === 'prima' && adesso - v.quando <= r.primaGiorni * giorno)
                    .slice(0, r.primaMax)
                    .forEach(v => tieni.add(v.id));
                const periodiche = voci.filter(v => v.tipo !== 'prima');
                periodiche.slice(0, r.recenti).forEach(v => tieni.add(v.id));
                const giorniVisti = new Set();
                periodiche.forEach(v => {
                    if (adesso - v.quando > r.giorni * giorno) return;
                    const d = new Date(v.quando);
                    const chiave = d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate();
                    if (giorniVisti.has(chiave)) return;
                    giorniVisti.add(chiave);
                    tieni.add(v.id);
                });
                return voci.filter(v => !tieni.has(v.id)).map(v => v.id);
            }

            function aggiornaIdProtettiDalleCopie() {
                const foto = new Set();
                const note = new Set();
                copieAutomatiche.indice.forEach(v => {
                    (v.foto || []).forEach(id => foto.add(id));
                    (v.note || []).forEach(id => note.add(id));
                });
                copieAutomatiche.idFoto = foto;
                copieAutomatiche.idNote = note;
            }

            async function caricaIndiceCopieAutomatiche() {
                try {
                    const db = await openCopieDB();
                    try {
                        copieAutomatiche.indice = await new Promise((resolve) => {
                            const req = db.transaction('indice', 'readonly').objectStore('indice').getAll();
                            req.onsuccess = () => resolve(req.result || []);
                            req.onerror = () => resolve([]);
                        });
                    } finally { db.close(); }
                    const ultima = copieAutomatiche.indice.slice().sort((a, b) => b.quando - a.quando)[0];
                    copieAutomatiche.ultimaFirma = ultima ? ultima.firma : null;
                    copieAutomatiche.ultimaPeriodica = copieAutomatiche.indice
                        .filter(v => v.tipo !== 'prima')
                        .reduce((m, v) => Math.max(m, v.quando), 0);
                    aggiornaIdProtettiDalleCopie();
                    await potaCopieAutomatiche();
                } catch (e) { ignoraErrore('caricaIndiceCopieAutomatiche', e); }
                copieAutomatiche.pronto = true;
                aggiornaRiepilogoCopieEBackup();
            }

            async function potaCopieAutomatiche() {
                try {
                    const daTogliere = copieDaEliminare(copieAutomatiche.indice, Date.now(), COPIE_REGOLE);
                    if (daTogliere.length === 0) return;
                    const db = await openCopieDB();
                    try {
                        await new Promise((resolve) => {
                            const tx = db.transaction(['indice', 'copie'], 'readwrite');
                            daTogliere.forEach(id => { tx.objectStore('indice').delete(id); tx.objectStore('copie').delete(id); });
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => resolve();
                            tx.onabort = () => resolve();
                        });
                    } finally { db.close(); }
                    const via = new Set(daTogliere);
                    copieAutomatiche.indice = copieAutomatiche.indice.filter(v => !via.has(v.id));
                    aggiornaIdProtettiDalleCopie();
                } catch (e) { ignoraErrore('potaCopieAutomatiche', e); }
            }

            /** Scrive una copia dello stato salvato. `tipo` è 'periodica' o 'prima' (prima di un'azione che
             * toglie dati, con il `motivo` in chiaro). Non blocca e non lancia mai: una copia che non riesce
             * non deve fermare quello che l'utente sta facendo. Uno stato identico all'ultima copia non
             * viene salvato di nuovo. */
            async function scriviCopiaAutomatica(tipo, motivo, testoStato) {
                try {
                    const json = typeof testoStato === 'string' ? testoStato : localStorage.getItem('dpsh_app_state');
                    if (!json) return false;
                    const firma = firmaTesto(json);
                    if (firma === copieAutomatiche.ultimaFirma) return false;
                    let statoSalvato;
                    try { statoSalvato = JSON.parse(json); } catch (e) { return false; }
                    const quando = Date.now();
                    const voce = Object.assign({
                        id: 'COPIA_' + quando + '_' + Math.random().toString(36).slice(2, 7),
                        quando, tipo, motivo: motivo || '', byte: json.length * 2, firma
                    }, riassuntoStatoPerCopia(statoSalvato));
                    copieAutomatiche.ultimaFirma = firma;
                    const db = await openCopieDB();
                    try {
                        await new Promise((resolve, reject) => {
                            const tx = db.transaction(['indice', 'copie'], 'readwrite');
                            tx.objectStore('indice').put(voce);
                            tx.objectStore('copie').put({ id: voce.id, json });
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                            tx.onabort = () => reject(tx.error);
                        });
                    } finally { db.close(); }
                    copieAutomatiche.indice.push(voce);
                    aggiornaIdProtettiDalleCopie();
                    await potaCopieAutomatiche();
                    aggiornaRiepilogoCopieEBackup();
                    return true;
                } catch (e) {
                    copieAutomatiche.ultimaFirma = null;
                    ignoraErrore('scriviCopiaAutomatica', e);
                    return false;
                }
            }

            /** Copia «prima di…»: va chiamata subito PRIMA di modificare state, perché fotografa lo stato
             * salvato in quel momento. */
            function copiaPrimaDi(motivo) {
                if (!copieAutomatiche.pronto) return;
                scriviCopiaAutomatica('prima', 'prima di ' + motivo, localStorage.getItem('dpsh_app_state'));
            }

            async function leggiCopiaAutomatica(idCopia) {
                const db = await openCopieDB();
                try {
                    return await new Promise((resolve) => {
                        const req = db.transaction('copie', 'readonly').objectStore('copie').get(idCopia);
                        req.onsuccess = () => resolve(req.result || null);
                        req.onerror = () => resolve(null);
                    });
                } finally { db.close(); }
            }

            /** Rimette un progetto com'era in una copia. Tocca SOLO quel progetto: gli altri restano come
             * sono adesso. Prima salva una copia dello stato attuale, così anche un ripristino sbagliato si
             * annulla dalla stessa Cronologia. */
            async function ripristinaProgettoDaCopia(idCopia, projId) {
                const rec = await leggiCopiaAutomatica(idCopia);
                if (!rec || !rec.json) throw new Error('copia non trovata');
                const salvato = JSON.parse(rec.json);
                const progetto = salvato.projects && salvato.projects[projId];
                if (!progetto) throw new Error('il progetto non è in questa copia');
                const nome = progetto.name || progetto.comune || 'Progetto';
                await scriviCopiaAutomatica('prima', `prima di ripristinare «${nome}»`, localStorage.getItem('dpsh_app_state'));
                state.projects[projId] = JSON.parse(JSON.stringify(progetto));
                // Se è il progetto su cui state lavora (anche dalla Home, dove state tiene l'ultima prova
                // aperta) state va ricaricato dal progetto ripristinato: altrimenti il salvataggio qui sotto
                // riscriverebbe la prova e gli strati con i dati di prima del ripristino.
                if (state.currentProjectId === projId) {
                    const prove = Object.keys(state.projects[projId].surveys || {});
                    if (prove.length === 0) {
                        state.currentProjectId = null;
                        state.currentSurveyId = null;
                        if (state.uiState && state.uiState.currentView === 'field') switchView('home');
                    } else {
                        syncProjectToActiveState(projId, prove.includes(state.currentSurveyId) ? state.currentSurveyId : prove[0]);
                        updateUI();
                    }
                }
                saveState();
                if (state.uiState && state.uiState.currentView === 'home' && typeof renderHomeProjects === 'function') renderHomeProjects();
                return nome;
            }

            function formattaQuandoCopia(ts) {
                const d = new Date(ts);
                const due = n => String(n).padStart(2, '0');
                return `${due(d.getDate())}/${due(d.getMonth() + 1)} ${due(d.getHours())}:${due(d.getMinutes())}`;
            }

            /** Testo scritto dall'utente messo dentro HTML costruito a mano. */
            function testoSicuro(s) {
                return String(s === null || s === undefined ? '' : s)
                    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }

            let cronologiaFiltroProgetto = null;

            function apriCronologia(projId) {
                cronologiaFiltroProgetto = projId || null;
                renderCronologia();
                const overlay = document.getElementById('modalCronologiaOverlay');
                const finestra = document.getElementById('modalCronologia');
                if (overlay) overlay.classList.add('open');
                if (finestra) finestra.classList.add('open');
            }

            function chiudiCronologia() {
                const overlay = document.getElementById('modalCronologiaOverlay');
                const finestra = document.getElementById('modalCronologia');
                if (overlay) overlay.classList.remove('open');
                if (finestra) finestra.classList.remove('open');
            }

            function renderCronologia() {
                const elenco = document.getElementById('elencoCronologia');
                if (!elenco) return;
                const pid = cronologiaFiltroProgetto;
                const progettoOra = pid && state.projects ? state.projects[pid] : null;
                const titolo = document.getElementById('lblCronologiaTitolo');
                const sotto = document.getElementById('lblCronologiaSottotitolo');
                if (titolo) titolo.textContent = progettoOra ? `Cronologia · ${progettoOra.name || progettoOra.comune || 'Progetto'}` : 'Copie automatiche';
                if (sotto) sotto.textContent = pid
                    ? `Com'era questo progetto nei momenti salvati. «Ripristina» rimette solo questo progetto: gli altri restano come sono, e prima si salva una copia di adesso.`
                    : `L'app salva da sola i dati dei progetti (le foto restano al loro posto) ogni 5 minuti di lavoro e prima di ogni cancellazione. Tiene le ultime 20, una al giorno per 14 giorni e quelle «prima di…» per 7 giorni. Da qui si ripristina anche un progetto eliminato.`;
                const voci = copieAutomatiche.indice
                    .filter(v => !pid || (v.progetti && v.progetti[pid]))
                    .slice()
                    .sort((a, b) => b.quando - a.quando);
                if (voci.length === 0) {
                    elenco.innerHTML = `<div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 18px 8px; background: var(--bg-sunken); border-radius: var(--radius-sm);">${pid ? 'Nessuna copia contiene ancora questo progetto.' : 'Nessuna copia ancora: la prima arriva dopo qualche minuto di lavoro o prima di una cancellazione.'}</div>`;
                    return;
                }
                elenco.innerHTML = voci.map(v => {
                    const righe = Object.entries(v.progetti || {})
                        .filter(([id]) => !pid || id === pid)
                        .map(([id, info]) => {
                            const eliminato = !(state.projects && state.projects[id]);
                            return `
                                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: 7px;">
                                    <span style="font-size: 12px; min-width: 0; color: var(--text-main);">${testoSicuro(info.nome)}
                                        <span style="color: var(--text-muted);">· ${info.prove} ${info.prove === 1 ? 'prova' : 'prove'}</span>${eliminato ? ' <span style="color: var(--danger); font-weight: 700;">· eliminato</span>' : ''}
                                    </span>
                                    <button type="button" class="btn-action btn-ripristina-copia" data-copia="${v.id}" data-progetto="${testoSicuro(id)}" style="flex-shrink: 0; background: var(--bg-card); color: var(--accent-ink); border: 1px solid var(--border); font-weight: 700; font-size: 12px; padding: 6px 10px;">Ripristina</button>
                                </div>`;
                        }).join('');
                    return `
                        <div style="background: var(--bg-main); border: 1px solid var(--border); border-radius: var(--radius-sm); padding: 9px 11px;">
                            <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 12px;">
                                <strong style="color: var(--text-main); font-family: var(--font-mono);">${formattaQuandoCopia(v.quando)}</strong>
                                <span style="color: var(--text-muted); text-align: right;">${v.tipo === 'prima' ? testoSicuro(v.motivo) : 'automatica'}</span>
                            </div>
                            ${righe}
                        </div>`;
                }).join('');
                elenco.querySelectorAll('.btn-ripristina-copia').forEach(b => b.addEventListener('click', async () => {
                    const idCopia = b.getAttribute('data-copia');
                    const idProgetto = b.getAttribute('data-progetto');
                    const voce = copieAutomatiche.indice.find(x => x.id === idCopia);
                    const info = voce && voce.progetti && voce.progetti[idProgetto];
                    if (!info) return;
                    const ok = await appConfirm(`Ripristinare «${info.nome}» com'era il ${formattaQuandoCopia(voce.quando)}?\n\nTorna indietro solo questo progetto: gli altri restano come sono. Prima si salva una copia di adesso, così puoi tornare indietro anche da qui.`);
                    if (!ok) return;
                    try {
                        const nome = await ripristinaProgettoDaCopia(idCopia, idProgetto);
                        renderCronologia();
                        triggerVibrate([40, 60]);
                        mostraToast(`«${nome}» ripristinato com'era il ${formattaQuandoCopia(voce.quando)}`);
                    } catch (e) {
                        appAlert('Ripristino non riuscito: ' + e.message);
                    }
                }));
            }

            /** Le due righe informative del menu: ultima copia automatica e ultimo backup completo. */
            function aggiornaRiepilogoCopieEBackup() {
                const lblCopie = document.getElementById('lblCopieRiepilogo');
                if (lblCopie) {
                    const n = copieAutomatiche.indice.length;
                    const ultima = copieAutomatiche.indice.reduce((m, v) => Math.max(m, v.quando), 0);
                    const peso = copieAutomatiche.indice.reduce((s, v) => s + (v.byte || 0), 0);
                    lblCopie.innerHTML = n === 0
                        ? 'Nessuna copia ancora: la prima arriva dopo qualche minuto di lavoro o prima di una cancellazione.'
                        : `Ultima: <strong>${formattaQuandoCopia(ultima)}</strong> · ${n} ${n === 1 ? 'copia' : 'copie'} (${formattaByte(peso)}). Si salvano da sole ogni 5 minuti di lavoro e prima di ogni cancellazione.`;
                }
                const lblBackup = document.getElementById('lblUltimoBackup');
                if (lblBackup) {
                    const ts = state.ultimoBackupCompleto;
                    if (!ts) {
                        lblBackup.innerHTML = 'Ultimo backup completo: <strong>mai</strong>, su questo dispositivo.';
                    } else {
                        const dopo = Object.values(state.projects || {}).some(pr => ((pr && pr.updatedAt) || 0) > ts + 120000);
                        lblBackup.innerHTML = `Ultimo backup completo: <strong>${formatUltimoUtilizzo(ts)}</strong>${dopo ? ' · con modifiche successive' : ' · niente di nuovo da allora'}.`;
                    }
                }
            }

            /** Segna l'ora dell'ultimo backup COMPLETO dell'archivio (JSON o ZIP), la sola rete se il telefono
             * si perde o l'app si disinstalla. Vive nello stato, così un Reset la azzera. Il backup del singolo
             * progetto non conta: copre un progetto solo. */
            function registraBackupCompleto() {
                state.ultimoBackupCompleto = Date.now();
                saveState();
                aggiornaRiepilogoCopieEBackup();
                if (state.uiState && state.uiState.currentView === 'home') renderPromemoriaBackup();
            }

            const btnApriCronologia = document.getElementById('btnApriCronologia');
            if (btnApriCronologia) btnApriCronologia.addEventListener('click', () => {
                if (typeof closeDrawer === 'function') closeDrawer();
                apriCronologia(null);
            });
            const btnProjActCronologia = document.getElementById('btnProjActCronologia');
            if (btnProjActCronologia) btnProjActCronologia.addEventListener('click', () => {
                if (!projectActionsContext) return;
                const { projId } = projectActionsContext;
                closeProjectActionsModal();
                apriCronologia(projId);
            });
            const btnCloseCronologiaX = document.getElementById('btnCloseCronologiaX');
            if (btnCloseCronologiaX) btnCloseCronologiaX.addEventListener('click', chiudiCronologia);
            const modalCronologiaOverlay = document.getElementById('modalCronologiaOverlay');
            if (modalCronologiaOverlay) modalCronologiaOverlay.addEventListener('click', chiudiCronologia);


