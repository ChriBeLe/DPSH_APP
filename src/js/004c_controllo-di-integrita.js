            // =========================== CONTROLLO DI INTEGRITÀ (Fase 1) ===========================
            // Cosa non torna nei dati: intervalli con buchi o sovrapposti, colpi non interi, id doppi,
            // prove che citano foto o strati che non esistono più. Gira dopo il caricamento, prima di
            // un export (riquadro in cima alle finestre di export) e su ciò che arriva con un import.
            //
            // Le anomalie si SEGNALANO e non si correggono da sole: una profondità "aggiustata" in
            // silenzio è peggio di una sbagliata e dichiarata. Fanno eccezione solo i casi banali e
            // sicuri, in cui il valore giusto è certo e nessun dato di misura cambia; quelli si
            // correggono e si registrano in state.registroCorrezioni:
            //  - id del progetto o della prova diverso dalla chiave sotto cui sta (vale la chiave:
            //    è quella che tutta l'app usa per ritrovarlo);
            //  - elenco delle prove o degli intervalli assente (diventa vuoto: non c'era niente);
            //  - colpi scritti come testo di un numero intero («12» → 12).

            // Tolleranza sulle profondità: i passi da 0,20 m sommati in virgola mobile danno
            // 0,6000000000000001. Mezzo centimetro è molto sotto qualsiasi misura reale.
            const TOLLERANZA_PROFONDITA_M = 0.005;

            /** Controlla `stato` (lo stato dell'app, o un contenitore { projects } in arrivo da un file).
             * opzioni.correggi: applica le correzioni banali (vedi sopra) e le elenca in `correzioni`;
             * altrimenti le segnala come anomalie con banale:true.
             * opzioni.fotoPresenti / opzioni.immaginiNotePresenti: insiemi di id disponibili in
             * IndexedDB; se mancano, quei controlli si saltano (il controllo resta sincrono e puro).
             * Ritorna { anomalie: [{ tipo, chiave, projId, survId, testo, banale }], correzioni: [...] }. */
            function verificaIntegrita(stato, opzioni) {
                const o = opzioni || {};
                const anomalie = [];
                const correzioni = [];
                const fmt = (m) => (Math.round(Number(m) * 100) / 100).toFixed(2).replace('.', ',');
                const progetti = stato && stato.projects;
                if (!progetti || typeof progetti !== 'object') {
                    anomalie.push({ tipo: 'archivio', chiave: 'archivio', testo: 'l\'archivio non contiene l\'elenco dei progetti' });
                    return { anomalie, correzioni };
                }
                // Un caso banale: si corregge (e si registra) o si segnala, secondo opzioni.correggi.
                const banale = (voce, correggi) => {
                    if (o.correggi) { correggi(); correzioni.push(voce); }
                    else anomalie.push(Object.assign({ banale: true }, voce));
                };
                const provaDiChi = new Map();
                Object.keys(progetti).forEach(pid => {
                    const proj = progetti[pid];
                    if (!proj || typeof proj !== 'object') {
                        anomalie.push({ tipo: 'progetto', chiave: 'progetto|' + pid, projId: pid, testo: `Il progetto «${pid}» non è leggibile` });
                        return;
                    }
                    const nomeP = proj.name || proj.comune || 'Progetto';
                    if (proj.id !== pid) {
                        banale({ tipo: 'id-progetto', chiave: 'id-progetto|' + pid, projId: pid, testo: `${nomeP}: l'id interno («${proj.id}») non era quello del progetto («${pid}»)` }, () => { proj.id = pid; });
                    }
                    if (proj.surveys === undefined || proj.surveys === null) {
                        banale({ tipo: 'prove-assenti', chiave: 'prove-assenti|' + pid, projId: pid, testo: `${nomeP}: l'elenco delle prove mancava` }, () => { proj.surveys = {}; });
                    }
                    const prove = (proj.surveys && typeof proj.surveys === 'object') ? proj.surveys : {};
                    const idStrati = new Set();
                    (Array.isArray(proj.strati) ? proj.strati : []).forEach(s => {
                        if (!s || !s.id) return;
                        if (idStrati.has(s.id)) anomalie.push({ tipo: 'strato-doppio', chiave: 'strato-doppio|' + pid + '|' + s.id, projId: pid, testo: `${nomeP}: due strati hanno lo stesso id («${s.id}»)` });
                        idStrati.add(s.id);
                    });
                    Object.keys(prove).forEach(sid => {
                        const surv = prove[sid];
                        if (!surv || typeof surv !== 'object') {
                            anomalie.push({ tipo: 'prova', chiave: 'prova|' + pid + '|' + sid, projId: pid, survId: sid, testo: `${nomeP}: una prova («${sid}») non è leggibile` });
                            return;
                        }
                        const h = surv.header || {};
                        const nomeS = `${nomeP} · Prova N° ${h.provaNr || '?'}`;
                        const dove = (tipo, extra) => ({ tipo, chiave: [tipo, pid, sid].concat(extra === undefined ? [] : [extra]).join('|'), projId: pid, survId: sid });
                        if (surv.id !== sid) {
                            banale(Object.assign(dove('id-prova'), { testo: `${nomeS}: l'id interno («${surv.id}») non era quello della prova («${sid}»)` }), () => { surv.id = sid; });
                        }
                        if (provaDiChi.has(sid)) {
                            anomalie.push(Object.assign(dove('prova-doppia'), { testo: `${nomeS}: la stessa prova («${sid}») sta anche in un altro progetto` }));
                        }
                        provaDiChi.set(sid, pid);
                        if (h.interpretazioneDi && !prove[h.interpretazioneDi]) {
                            anomalie.push(Object.assign(dove('interpretazione-orfana'), { testo: `${nomeS}: è l'interpretazione di una prova che non c'è più` }));
                        }

                        if (surv.logs === undefined || surv.logs === null) {
                            banale(Object.assign(dove('intervalli-assenti'), { testo: `${nomeS}: l'elenco degli intervalli mancava` }), () => { surv.logs = []; });
                        } else if (!Array.isArray(surv.logs)) {
                            anomalie.push(Object.assign(dove('intervalli-illeggibili'), { testo: `${nomeS}: gli intervalli non sono un elenco leggibile` }));
                        }
                        const logs = Array.isArray(surv.logs) ? surv.logs : [];
                        let precedente = null;
                        logs.forEach((log, i) => {
                            const n = i + 1;
                            if (!log || typeof log !== 'object') {
                                anomalie.push(Object.assign(dove('intervallo', i), { testo: `${nomeS}: l'intervallo n. ${n} non è leggibile` }));
                                precedente = null;
                                return;
                            }
                            if (typeof log.colpi === 'string' && /^\s*\d+\s*$/.test(log.colpi)) {
                                banale(Object.assign(dove('colpi-testo', i), { testo: `${nomeS}: i colpi dell'intervallo n. ${n} erano scritti come testo («${log.colpi}»)` }), () => { log.colpi = parseInt(log.colpi, 10); });
                            } else if (!(Number.isInteger(log.colpi) && log.colpi >= 0)) {
                                anomalie.push(Object.assign(dove('colpi', i), { testo: `${nomeS}: l'intervallo n. ${n} ha un numero di colpi non valido (${JSON.stringify(log.colpi)})` }));
                            }
                            const inizio = log.start, fine = log.end;
                            if (typeof inizio !== 'number' || !isFinite(inizio) || typeof fine !== 'number' || !isFinite(fine)) {
                                anomalie.push(Object.assign(dove('profondita', i), { testo: `${nomeS}: l'intervallo n. ${n} non ha profondità valide` }));
                                precedente = null;
                                return;
                            }
                            if (!(fine - inizio > TOLLERANZA_PROFONDITA_M)) {
                                anomalie.push(Object.assign(dove('intervallo-vuoto', i), { testo: `${nomeS}: l'intervallo n. ${n} va da ${fmt(inizio)} a ${fmt(fine)} m (lunghezza nulla o negativa)` }));
                            }
                            if (precedente) {
                                const salto = inizio - precedente.end;
                                if (salto > TOLLERANZA_PROFONDITA_M) {
                                    anomalie.push(Object.assign(dove('buco', i), { testo: `${nomeS}: tra ${fmt(precedente.end)} e ${fmt(inizio)} m manca un intervallo` }));
                                } else if (salto < -TOLLERANZA_PROFONDITA_M) {
                                    anomalie.push(Object.assign(dove('sovrapposto', i), { testo: `${nomeS}: l'intervallo n. ${n} (da ${fmt(inizio)} m) comincia prima della fine del precedente (${fmt(precedente.end)} m)` }));
                                }
                            }
                            precedente = log;
                            if (log.lithology && typeof log.lithology === 'string' && !idStrati.has(log.lithology)) {
                                anomalie.push(Object.assign(dove('strato-mancante', i), { testo: `${nomeS}: l'intervallo n. ${n} è assegnato a uno strato che non esiste più` }));
                            }
                        });

                        const idFotoProva = new Set();
                        (Array.isArray(surv.photos) ? surv.photos : []).forEach(p => {
                            if (!p || !p.id) return;
                            if (idFotoProva.has(p.id)) anomalie.push(Object.assign(dove('foto-doppia', p.id), { testo: `${nomeS}: la stessa foto compare due volte` }));
                            idFotoProva.add(p.id);
                            const inclusa = typeof p.dataUrl === 'string' && p.dataUrl.indexOf('data:') === 0;
                            if (o.fotoPresenti && !inclusa && !o.fotoPresenti.has(p.id)) {
                                anomalie.push(Object.assign(dove('foto-mancante', p.id), { testo: `${nomeS}: una foto (${p.timestamp || p.id}) non si trova più sul dispositivo` }));
                            }
                        });
                    });

                    if (o.immaginiNotePresenti && proj.notes && typeof proj.notes.html === 'string') {
                        const re = /<img\b[^>]*data-note-img-id="([^"]+)"[^>]*>/g;
                        let m;
                        while ((m = re.exec(proj.notes.html)) !== null) {
                            const inclusa = /\bsrc="data:/.test(m[0]);
                            if (!inclusa && !o.immaginiNotePresenti.has(m[1])) {
                                anomalie.push({ tipo: 'immagine-nota-mancante', chiave: 'immagine-nota-mancante|' + pid + '|' + m[1], projId: pid, testo: `${nomeP}: un'immagine della nota non si trova più sul dispositivo` });
                            }
                        }
                    }
                });

                if (stato.currentProjectId && !progetti[stato.currentProjectId]) {
                    anomalie.push({ tipo: 'progetto-aperto', chiave: 'progetto-aperto', testo: 'Il progetto aperto per ultimo non esiste più nell\'archivio' });
                } else if (stato.currentProjectId && stato.currentSurveyId) {
                    const pr = progetti[stato.currentProjectId];
                    if (pr && pr.surveys && !pr.surveys[stato.currentSurveyId]) {
                        anomalie.push({ tipo: 'prova-aperta', chiave: 'prova-aperta', testo: 'La prova aperta per ultima non fa parte del suo progetto' });
                    }
                }
                return { anomalie, correzioni };
            }

            /** Mette le correzioni automatiche nel registro dello stato (le più recenti in fondo, al
             * massimo 200: è un registro da consultare, non un archivio da far crescere per sempre). */
            function registraCorrezioni(destinazione, correzioni, origine) {
                if (!correzioni || correzioni.length === 0) return;
                const quando = new Date().toISOString();
                const registro = Array.isArray(destinazione.registroCorrezioni) ? destinazione.registroCorrezioni : [];
                // projId/survId (forma 2): il pacchetto di progetto porta con sé le correzioni del suo progetto.
                correzioni.forEach(c => {
                    const voce = { quando, origine, tipo: c.tipo, cosa: c.testo };
                    if (c.projId) voce.projId = c.projId;
                    if (c.survId) voce.survId = c.survId;
                    registro.push(voce);
                });
                destinazione.registroCorrezioni = registro.slice(-200);
                console.info('Correzioni automatiche (' + origine + '):', correzioni.map(c => c.testo));
            }

            /** Gli id presenti in uno store del database delle foto, o null se non si può leggere
             * (in quel caso il controllo delle foto si salta invece di dare tutto per mancante). */
            async function idPresentiNelDatabaseFoto(nomeStore) {
                try {
                    const db = await openPhotoDB();
                    try {
                        if (!db.objectStoreNames.contains(nomeStore)) return new Set();
                        return await new Promise((resolve) => {
                            const req = db.transaction(nomeStore, 'readonly').objectStore(nomeStore).getAllKeys();
                            req.onsuccess = () => resolve(new Set(req.result || []));
                            req.onerror = () => resolve(null);
                        });
                    } finally { db.close(); }
                } catch (e) {
                    ignoraErrore('idPresentiNelDatabaseFoto', e);
                    return null;
                }
            }

            /** Il controllo completo su un insieme di progetti, foto comprese. */
            async function verificaIntegritaConFoto(stato) {
                const fotoPresenti = await idPresentiNelDatabaseFoto('photos');
                const immaginiNotePresenti = await idPresentiNelDatabaseFoto('noteImages');
                // Le foto ancora in memoria (scattate in questa sessione) contano come presenti.
                if (fotoPresenti) Object.keys(photoMemoryCache).forEach(id => fotoPresenti.add(id));
                if (immaginiNotePresenti) Object.keys(noteImageMemoryCache).forEach(id => immaginiNotePresenti.add(id));
                return verificaIntegrita(stato, { fotoPresenti, immaginiNotePresenti });
            }

            /** Testo per l'utente: un elenco breve, le prime righe e quante ne restano. */
            function elencoAnomalie(anomalie, massimo) {
                const max = massimo || 8;
                const righe = anomalie.slice(0, max).map(a => '· ' + a.testo);
                if (anomalie.length > max) righe.push(`· … e ${anomalie.length - max} ${anomalie.length - max === 1 ? 'altra' : 'altre'}`);
                return righe.join('\n');
            }

            /** Dopo il caricamento: il controllo completo e, se ci sono anomalie NUOVE, un avviso.
             * «Nuove» vuol dire diverse dall'ultima volta che l'avviso è stato mostrato (la firma sta
             * in una chiave a parte di localStorage): una prova con un buco voluto, per esempio dopo
             * aver eliminato un intervallo in mezzo, non deve far ricomparire l'avviso a ogni avvio. */
            async function controllaIntegritaDopoAvvio() {
                if (caricamentoDati.esito !== 'ok') return null;
                const esito = await verificaIntegritaConFoto(state);
                const anomalie = esito.anomalie.filter(a => !a.banale);
                caricamentoDati.integrita = { anomalie: anomalie.length, quando: Date.now() };
                if (anomalie.length === 0) return esito;
                const firma = firmaTesto(anomalie.map(a => a.chiave).sort().join('\n'));
                let vista = null;
                try { vista = localStorage.getItem('dpsh_integrita_segnalata'); } catch (e) { ignoraErrore('controllaIntegritaDopoAvvio', e); }
                if (vista === firma) return esito;
                try { localStorage.setItem('dpsh_integrita_segnalata', firma); } catch (e) { ignoraErrore('controllaIntegritaDopoAvvio', e); }
                appDialog(`Il controllo dei dati salvati ha trovato ${anomalie.length === 1 ? 'un\'anomalia' : anomalie.length + ' anomalie'}. `
                    + `Non ho corretto niente da solo: controlla questi punti.\n\n${elencoAnomalie(anomalie, 8)}\n\n`
                    + `Questo avviso ricompare solo se cambia qualcosa. L'elenco completo è anche nella finestra Esporta del progetto.`,
                    { title: 'Controllo dei dati', okLabel: 'Ho capito', icona: 'alert', coloreIcona: 'var(--warning)' });
                return esito;
            }

            /** Il riquadro «Controllo dei dati» nelle finestre di export: rosso se qualcosa non torna,
             * altrimenti niente (il promemoria dei dati mancanti ha già il suo riquadro). Non blocca. */
            async function renderIntegritaPrimaExport(idContenitore, stato) {
                const box = document.getElementById(idContenitore);
                if (!box) return;
                box.style.display = 'none';
                box.innerHTML = '';
                let anomalie = [];
                try { anomalie = (await verificaIntegritaConFoto(stato)).anomalie; } catch (e) { ignoraErrore('renderIntegritaPrimaExport', e); }
                if (anomalie.length === 0) return;
                box.innerHTML = `
                    <details style="background: var(--danger-soft); border: 1px solid var(--danger); border-radius: var(--radius-sm); padding: 9px 11px;">
                        <summary style="cursor: pointer; font-size: 12px; font-weight: 700; color: var(--text-main); display: flex; align-items: center; gap: 8px; list-style: none;">
                            <span style="color: var(--danger); display: inline-flex;">${ico('alert')}</span>
                            <span style="flex: 1;">Controllo dei dati: ${anomalie.length === 1 ? '1 anomalia' : anomalie.length + ' anomalie'}</span>
                            <span style="font-size: 11px; font-weight: 600; color: var(--text-muted);">Vedi</span>
                        </summary>
                        <div style="display: flex; flex-direction: column; gap: 5px; margin-top: 9px; font-size: 11.5px; color: var(--text-main); line-height: 1.4;">
                            ${anomalie.map(a => `<div>${testoSicuro(a.testo)}</div>`).join('')}
                            <div style="font-size: 10.5px; color: var(--text-muted);">Nel file finiscono così come sono: l'app non le corregge da sola.</div>
                        </div>
                    </details>`;
                box.style.display = 'block';
            }
