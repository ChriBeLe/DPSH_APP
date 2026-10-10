            // ===================== ANNULLA E RIPETI, PER OGNI AZIONE =====================
            // Ogni azione che cambia i dati passa da saveState: è lì che si scrive la cronologia.
            // Niente da dichiarare azione per azione (sono quasi duecento i punti che salvano): dopo
            // ogni salvataggio si confronta il contenuto con quello di prima e, se è cambiato, quello
            // di prima diventa un passo da annullare. Annulla lo rimette, Ripeti torna avanti.
            //
            // Il contenuto è fatto a pezzi, ognuno col suo testo JSON: ogni prova, ogni campo di un
            // progetto (note, DTM, disegni, strati…), ogni template e ogni voce dell'archivio
            // litologico, più l'ordine dei progetti e delle prove. Un passo tiene solo i pezzi che
            // sono cambiati, com'erano prima e come sono dopo: un colpo in più costa una prova, non
            // l'archivio intero, e la cronologia può essere lunga anche sul telefono.
            //
            // Cosa NON è un passo: aprire una prova o un progetto, cambiare tema, l'ora di
            // salvataggio. Si usa lo stesso testo del contenuto di 004e (testoContenutoProgetto), che
            // queste cose le lascia fuori; quello che lascia fuori (updatedAt, le preferenze dell'app
            // dentro le prove…) viaggia a parte nel passo e si rimette al ripristino.
            //
            // Quando un passo finisce e ne comincia un altro:
            //  - tutto quello che si salva nello stesso giro dell'app è un passo solo (un'azione che
            //    salva tre volte si annulla con un tocco);
            //  - scrivendo in un campo, le lettere battute senza fermarsi più di 2 secondi sono un
            //    passo solo: Annulla toglie la parola, non una lettera.
            //
            // Annulla e Ripeti si usano dalle schermate (Home, Progetto, Prova), non con una finestra
            // aperta: chiusa la finestra, quello che ci si è fatto dentro si annulla come il resto.
            // Le finestre con un annulla loro (editor dei template, note, disegno) restano com'erano.
            //
            // Tutto vive in memoria e riparte vuoto a ogni apertura dell'app (come in ogni
            // programma): per tornare indietro di giorni ci sono le copie automatiche (048).
            // Le foto e le immagini delle note che un passo può ancora rimettere non si cancellano
            // dal database finché il passo esiste (vedi idFotoAncoraInUso, idImmaginiNoteAncoraInUso).

            /** Lo stato della cronologia, creato al primo uso: saveState può arrivare qui prima che lo
             * script abbia valutato questo pezzo, e una const a livello di pezzo sarebbe in zona morta. */
            function cronologia() {
                if (!cronologia.dati) {
                    cronologia.dati = {
                        base: null,        // i pezzi dell'ultimo salvataggio (vedi fotografiaCronologia)
                        indietro: [],      // i passi da annullare, il più recente in fondo
                        avanti: [],        // i passi annullati, da ripetere
                        peso: 0,           // caratteri tenuti dai passi delle due pile
                        silenzio: false,   // il prossimo salvataggio aggiorna la base senza fare un passo
                        turnoAperto: false,// nello stesso giro dell'app di un passo appena fatto
                        tocchi: 0          // contatore dei tocchi (pointerdown): separa due scritture
                    };
                }
                return cronologia.dati;
            }
            // Separatore delle chiavi dei pezzi: non compare negli id dell'app.
            const SEP_CRONOLOGIA = '\u0001';
            const COLLEZIONI_IN_CRONOLOGIA = ['lithologyArchive', 'reportTemplates', 'indiceTemplates'];
            const LIMITI_CRONOLOGIA = { passi: 300, caratteri: 30e6, pausaScrittura: 2000 };

            /** Il testo di un pezzo di progetto: le stesse regole di testoContenutoProgetto (niente ore
             * di salvataggio, niente immagini in memoria, niente preferenze dell'app). */
            function testoPezzoCronologia(v) {
                return JSON.stringify(v, function (k, x) {
                    if (CHIAVI_FUORI_DAL_CONTENUTO.has(k)) return undefined;
                    if (k === 'settings' && x && typeof x === 'object' && !Array.isArray(x)) {
                        const solo = {};
                        Object.keys(x).forEach(c => { if (!IMPOSTAZIONI_DELL_APP.has(c)) solo[c] = x[c]; });
                        return solo;
                    }
                    if ((k === 'html' || k === 'htmlPrimaDelMotore') && typeof x === 'string') return htmlNotaSenzaImmagini(x);
                    return x;
                });
            }

            /** Quello che il testo di una prova lascia fuori e che va rimesso al ripristino. */
            function metaProvaCronologia(surv) {
                const prefs = {};
                const s = surv && surv.settings;
                if (s && typeof s === 'object') Object.keys(s).forEach(c => { if (IMPOSTAZIONI_DELL_APP.has(c)) prefs[c] = s[c]; });
                return { updatedAt: surv && surv.updatedAt, prefs };
            }
            function metaProgettoCronologia(proj) {
                return {
                    updatedAt: proj.updatedAt, modificatoIl: proj.modificatoIl,
                    passaggi: proj.passaggi === undefined ? undefined : JSON.parse(JSON.stringify(proj.passaggi))
                };
            }

            /** I pezzi di un progetto: l'elenco dei suoi campi, ogni campo, l'ordine delle prove, ogni
             * prova. Le chiavi: p␁id (campi), p␁id␁campo, s␁id (ordine prove), s␁id␁prova. */
            function pezziProgettoCronologia(pid, proj, contenuto) {
                const S = SEP_CRONOLOGIA;
                const parti = new Map(), meta = new Map();
                const campi = [];
                Object.keys(proj).forEach(k => {
                    if (CHIAVI_FUORI_DAL_CONTENUTO.has(k)) return;
                    if (k === 'surveys') { campi.push(k); return; }
                    const t = testoPezzoCronologia(proj[k]);
                    if (t === undefined) return;
                    campi.push(k);
                    parti.set('p' + S + pid + S + k, t);
                });
                parti.set('p' + S + pid, JSON.stringify(campi));
                const prove = (proj.surveys && typeof proj.surveys === 'object') ? proj.surveys : {};
                parti.set('s' + S + pid, JSON.stringify(Object.keys(prove)));
                Object.keys(prove).forEach(sid => {
                    const t = testoPezzoCronologia(prove[sid]);
                    parti.set('s' + S + pid + S + sid, t === undefined ? 'null' : t);
                    meta.set('s' + S + pid + S + sid, metaProvaCronologia(prove[sid]));
                });
                meta.set('p' + S + pid, metaProgettoCronologia(proj));
                return { contenuto, parti, meta };
            }

            /** I pezzi dello stato attuale. Un progetto il cui contenuto non è cambiato dall'ultima
             * fotografia riusa i pezzi di allora: il testo del contenuto l'ha appena calcolato
             * registraModificheVere (contenutiConosciuti), qui non si rifà. */
            function fotografiaCronologia(prima) {
                const S = SEP_CRONOLOGIA;
                const globali = new Map();
                COLLEZIONI_IN_CRONOLOGIA.forEach(c => {
                    const m = (state[c] && typeof state[c] === 'object') ? state[c] : {};
                    globali.set('g' + S + c, JSON.stringify(Object.keys(m)));
                    Object.keys(m).forEach(id => {
                        const t = JSON.stringify(m[id]);
                        globali.set('g' + S + c + S + id, t === undefined ? 'null' : t);
                    });
                });
                const tutti = state.projects || {};
                const ids = Object.keys(tutti).filter(pid => tutti[pid] && typeof tutti[pid] === 'object');
                const progetti = new Map();
                ids.forEach(pid => {
                    const proj = tutti[pid];
                    let contenuto = contenutiConosciuti.get(pid);
                    if (contenuto === undefined) contenuto = testoContenutoProgetto(proj);
                    const vecchio = prima && prima.progetti.get(pid);
                    if (vecchio && vecchio.contenuto === contenuto) {
                        // Stesso contenuto: stessi pezzi. Le meta (ora di salvataggio) si rileggono.
                        const meta = new Map();
                        vecchio.meta.forEach((_, k) => {
                            const sid = k.split(S)[2];
                            meta.set(k, sid === undefined ? metaProgettoCronologia(proj) : metaProvaCronologia((proj.surveys || {})[sid]));
                        });
                        progetti.set(pid, { contenuto, parti: vecchio.parti, meta });
                    } else {
                        progetti.set(pid, pezziProgettoCronologia(pid, proj, contenuto));
                    }
                });
                return { globali, ordine: JSON.stringify(ids), progetti };
            }

            /** Il testo di un pezzo in una fotografia (undefined se il pezzo non c'è). */
            function pezzoDellaFotografia(foto, chiave) {
                const S = SEP_CRONOLOGIA;
                if (chiave === 'p') return foto.ordine;
                if (chiave[0] === 'g') return foto.globali.get(chiave);
                const pid = chiave.split(S)[1];
                const p = foto.progetti.get(pid);
                return p ? p.parti.get(chiave) : undefined;
            }

            /** Cosa è cambiato tra due fotografie: null se niente, altrimenti i pezzi di prima e di
             * dopo (undefined = il pezzo non c'era) e le meta dei progetti e delle prove toccati. */
            function differenzaCronologia(a, b) {
                const S = SEP_CRONOLOGIA;
                const prima = new Map(), dopo = new Map(), metaPrima = new Map(), metaDopo = new Map();
                const confronta = (k, x, y) => { if (x !== y) { prima.set(k, x); dopo.set(k, y); } };
                const chiaviG = new Set([...a.globali.keys(), ...b.globali.keys()]);
                chiaviG.forEach(k => confronta(k, a.globali.get(k), b.globali.get(k)));
                confronta('p', a.ordine, b.ordine);
                const pids = new Set([...a.progetti.keys(), ...b.progetti.keys()]);
                pids.forEach(pid => {
                    const x = a.progetti.get(pid), y = b.progetti.get(pid);
                    if (x && y && x.parti === y.parti) return; // stesso contenuto, pezzi riusati
                    const chiavi = new Set([...(x ? x.parti.keys() : []), ...(y ? y.parti.keys() : [])]);
                    let toccato = false;
                    chiavi.forEach(k => {
                        const vx = x ? x.parti.get(k) : undefined, vy = y ? y.parti.get(k) : undefined;
                        if (vx === vy) return;
                        prima.set(k, vx); dopo.set(k, vy);
                        toccato = true;
                        const parti = k.split(S);
                        if (parti[0] === 's' && parti.length === 3) {
                            if (x && x.meta.has(k)) metaPrima.set(k, x.meta.get(k));
                            if (y && y.meta.has(k)) metaDopo.set(k, y.meta.get(k));
                        }
                    });
                    if (toccato) {
                        const kp = 'p' + S + pid;
                        if (x) metaPrima.set(kp, x.meta.get(kp));
                        if (y) metaDopo.set(kp, y.meta.get(kp));
                    }
                });
                if (prima.size === 0) return null;
                return { prima, dopo, metaPrima, metaDopo };
            }

            function pesoPassoCronologia(passo) {
                let n = 0;
                passo.prima.forEach(v => { if (v) n += v.length; });
                passo.dopo.forEach(v => { if (v) n += v.length; });
                return n;
            }

            /** Dentro saveState, dopo registraModificheVere: se il contenuto è cambiato, quello di
             * prima diventa un passo da annullare. Non deve mai fermare un salvataggio. */
            function registraPassoCronologia() {
                const c = cronologia();
                const nuova = fotografiaCronologia(c.base);
                if (!c.base || c.silenzio) {
                    c.base = nuova;
                    c.silenzio = false;
                    aggiornaTastiCronologia();
                    return;
                }
                const diff = differenzaCronologia(c.base, nuova);
                c.base = nuova;
                if (!diff) return;

                const attivo = document.activeElement;
                const scrive = elementoDiScrittura(attivo);
                const ultimo = c.indietro[c.indietro.length - 1];
                const unisci = ultimo && c.avanti.length === 0 && (
                    c.turnoAperto ||
                    (scrive && ultimo.campo === attivo && ultimo.tocchi === c.tocchi && Date.now() - ultimo.quando < LIMITI_CRONOLOGIA.pausaScrittura)
                );
                if (unisci) {
                    c.peso -= ultimo.peso;
                    diff.dopo.forEach((v, k) => {
                        if (!ultimo.prima.has(k)) ultimo.prima.set(k, diff.prima.get(k));
                        ultimo.dopo.set(k, v);
                    });
                    diff.metaPrima.forEach((v, k) => { if (!ultimo.metaPrima.has(k)) ultimo.metaPrima.set(k, v); });
                    diff.metaDopo.forEach((v, k) => ultimo.metaDopo.set(k, v));
                    // Scritto e poi cancellato: il passo non cambia più niente e sparisce.
                    ultimo.prima.forEach((v, k) => { if (ultimo.dopo.get(k) === v) { ultimo.prima.delete(k); ultimo.dopo.delete(k); } });
                    ultimo.quando = Date.now();
                    if (ultimo.prima.size === 0) {
                        c.indietro.pop();
                    } else {
                        ultimo.peso = pesoPassoCronologia(ultimo);
                        c.peso += ultimo.peso;
                    }
                } else {
                    c.avanti.forEach(p => { c.peso -= p.peso; });
                    c.avanti = [];
                    const passo = Object.assign(diff, { quando: Date.now(), campo: scrive ? attivo : null, tocchi: c.tocchi, peso: 0 });
                    passo.peso = pesoPassoCronologia(passo);
                    c.indietro.push(passo);
                    c.peso += passo.peso;
                    // Un passo solo resta sempre, anche se da solo supera il limite.
                    while (c.indietro.length > 1 && (c.indietro.length > LIMITI_CRONOLOGIA.passi || c.peso > LIMITI_CRONOLOGIA.caratteri)) {
                        c.peso -= c.indietro.shift().peso;
                    }
                }
                if (!c.turnoAperto) {
                    c.turnoAperto = true;
                    setTimeout(() => { c.turnoAperto = false; }, 0);
                }
                aggiornaTastiCronologia();
            }

            function elementoDiScrittura(el) {
                if (!el || !el.matches) return false;
                if (el.isContentEditable) return true;
                if (el.matches('textarea')) return true;
                return el.matches('input') && !/^(button|submit|reset|checkbox|radio|range|color|file|image)$/i.test(el.type || '');
            }

            /** Aprire una prova (accettaNormalizzazioneApertura, 004e): il progetto come lo
             * riscriverà il prossimo salvataggio vale come base, così aprire non diventa un passo. */
            function accettaAperturaInCronologia(pid, copia) {
                const c = cronologia();
                if (!c.base || !c.base.progetti.has(pid)) return;
                c.base.progetti.set(pid, pezziProgettoCronologia(pid, copia, testoContenutoProgetto(copia)));
            }

            // ---- Annulla e Ripeti ----

            /** Si può usare adesso? Serve un passo, i dati letti, e nessuna finestra aperta: le
             * finestre tengono copie dei dati che un ripristino lascerebbe indietro. */
            function cronologiaUsabile() {
                if (caricamentoDati.bloccato) return false;
                return !document.querySelector('.modal.open, #drawerMenu.open');
            }
            function puoAnnullare() { return cronologia().indietro.length > 0 && cronologiaUsabile(); }
            function puoRipetere() { return cronologia().avanti.length > 0 && cronologiaUsabile(); }

            function annullaAzione() {
                if (!cronologiaUsabile()) return false;
                const c = cronologia();
                // Quello che non è ancora salvato diventa prima un passo, e si annulla quello.
                saveState();
                const passo = c.indietro.pop();
                if (!passo) return false;
                c.peso -= passo.peso;
                ripristinaPassoCronologia(passo.prima, passo.metaPrima);
                c.avanti.push(passo);
                c.peso += passo.peso;
                dopoRipristinoCronologia('Annullato', passo, { etichetta: 'Ripeti', fn: ripetiAzione });
                return true;
            }

            function ripetiAzione() {
                if (!cronologiaUsabile()) return false;
                const c = cronologia();
                const passo = c.avanti.pop();
                if (!passo) return false;
                c.peso -= passo.peso;
                ripristinaPassoCronologia(passo.dopo, passo.metaDopo);
                c.indietro.push(passo);
                c.peso += passo.peso;
                dopoRipristinoCronologia('Ripetuto', passo, { etichetta: 'Annulla', fn: annullaAzione });
                return true;
            }

            /** Rimette nello stato i pezzi dati (undefined = il pezzo va tolto); gli altri restano
             * quelli della base, cioè dell'ultimo salvataggio. Si ricostruiscono solo i progetti, i
             * template e le voci toccati: gli altri restano gli stessi oggetti. */
            function ripristinaPassoCronologia(pezzi, meta) {
                const S = SEP_CRONOLOGIA;
                const c = cronologia();
                const T = (k) => pezzi.has(k) ? pezzi.get(k) : pezzoDellaFotografia(c.base, k);
                const leggi = (k) => { const t = T(k); return t === undefined ? undefined : JSON.parse(t); };

                COLLEZIONI_IN_CRONOLOGIA.forEach(col => {
                    const pref = 'g' + S + col;
                    if (![...pezzi.keys()].some(k => k === pref || k.startsWith(pref + S))) return;
                    const attuale = state[col] || {};
                    const nuova = {};
                    (leggi(pref) || []).forEach(id => {
                        const k = pref + S + id;
                        nuova[id] = (pezzi.has(k) || !(id in attuale)) ? leggi(k) : attuale[id];
                    });
                    state[col] = nuova;
                });

                const toccati = new Set();
                pezzi.forEach((_, k) => { if (k[0] === 'p' || k[0] === 's') { const pid = k.split(S)[1]; if (pid !== undefined) toccati.add(pid); } });
                if (!pezzi.has('p') && toccati.size === 0) return;

                const attuali = state.projects || {};
                const progetti = {};
                (leggi('p') || []).forEach(pid => {
                    const attuale = attuali[pid];
                    if (attuale && !toccati.has(pid)) { progetti[pid] = attuale; return; }
                    const proj = {};
                    (leggi('p' + S + pid) || []).forEach(campo => {
                        if (campo === 'surveys') {
                            const prove = {};
                            (leggi('s' + S + pid) || []).forEach(sid => {
                                const k = 's' + S + pid + S + sid;
                                const vecchia = attuale && attuale.surveys && attuale.surveys[sid];
                                if (vecchia && !pezzi.has(k)) { prove[sid] = vecchia; return; }
                                const surv = leggi(k);
                                const m = meta.get(k) || (vecchia ? metaProvaCronologia(vecchia) : null);
                                if (surv && typeof surv === 'object' && m) {
                                    if (m.updatedAt !== undefined) surv.updatedAt = m.updatedAt;
                                    if (surv.settings && typeof surv.settings === 'object') Object.assign(surv.settings, m.prefs);
                                }
                                prove[sid] = surv;
                            });
                            proj.surveys = prove;
                            return;
                        }
                        const k = 'p' + S + pid + S + campo;
                        proj[campo] = (pezzi.has(k) || !attuale || !(campo in attuale)) ? leggi(k) : attuale[campo];
                    });
                    const m = meta.get('p' + S + pid) || (attuale ? metaProgettoCronologia(attuale) : {});
                    if (m.updatedAt !== undefined) proj.updatedAt = m.updatedAt;
                    if (m.modificatoIl !== undefined) proj.modificatoIl = m.modificatoIl;
                    if (m.passaggi !== undefined) proj.passaggi = m.passaggi;
                    progetti[pid] = proj;
                });
                state.projects = progetti;

                // La prova aperta si ricarica dal progetto ripristinato: altrimenti il salvataggio
                // qui sotto ci riscriverebbe sopra lo stato attivo di prima (vedi syncStateToProject).
                const pid = state.currentProjectId;
                if (pid && toccati.has(pid)) {
                    const proj = progetti[pid];
                    const prove = proj ? Object.keys(proj.surveys || {}) : [];
                    if (prove.length === 0) {
                        state.currentProjectId = null;
                        state.currentSurveyId = null;
                    } else {
                        syncProjectToActiveState(pid, prove.includes(state.currentSurveyId) ? state.currentSurveyId : prove[0]);
                    }
                }
            }

            function dopoRipristinoCronologia(fatto, passo, azioneToast) {
                const c = cronologia();
                // Il salvataggio del ripristino non è un'azione nuova: aggiorna la base e basta.
                c.silenzio = true;
                if (!state.uiState) state.uiState = { currentView: 'home' };
                if (state.uiState.currentView !== 'home' && !state.currentProjectId) state.uiState.currentView = 'home';
                saveState();
                c.silenzio = false;
                // Il banner «Eliminato… Annulla» parla di un'azione che adesso è già stata gestita.
                if (typeof hideUndoBanner === 'function') hideUndoBanner();
                switchView(state.uiState.currentView);
                aggiornaTastiCronologia();
                triggerVibrate(30);
                mostraToast(`${fatto}: ${descriviPassoCronologia(passo)}`, { azione: azioneToast });
            }

            /** Di cosa parla un passo, per il messaggio: la prova, il progetto, il template… */
            function descriviPassoCronologia(passo) {
                const S = SEP_CRONOLOGIA;
                const leggiDa = (k) => {
                    for (const m of [passo.dopo, passo.prima]) {
                        const t = m.get(k);
                        if (t !== undefined) { try { return JSON.parse(t); } catch (e) { return undefined; } }
                    }
                    return undefined;
                };
                const nomeProgetto = (pid) => {
                    const p = (state.projects || {})[pid];
                    const nome = p ? (p.name || p.comune) : (leggiDa('p' + S + pid + S + 'name') || leggiDa('p' + S + pid + S + 'comune'));
                    return nome ? `«${nome}»` : 'il progetto';
                };
                const prove = [], progetti = new Set(), globali = new Set();
                let ordineProgetti = false;
                passo.prima.forEach((_, k) => {
                    const p = k.split(S);
                    if (k === 'p') ordineProgetti = true;
                    else if (p[0] === 'g') globali.add(p[1]);
                    else if (p[0] === 's' && p.length === 3) prove.push([p[1], p[2]]);
                    else progetti.add(p[1]);
                });
                prove.forEach(([pid]) => progetti.add(pid));
                if (ordineProgetti) {
                    const prima = JSON.parse(passo.prima.get('p') || '[]'), dopo = JSON.parse(passo.dopo.get('p') || '[]');
                    const cambiati = prima.filter(id => !dopo.includes(id)).concat(dopo.filter(id => !prima.includes(id)));
                    if (cambiati.length === 1) return 'progetto ' + nomeProgetto(cambiati[0]);
                    if (cambiati.length > 1) return `${cambiati.length} progetti`;
                }
                if (progetti.size === 1) {
                    const pid = [...progetti][0];
                    const diProva = new Set(prove.map(x => x[1]));
                    if (diProva.size === 1) {
                        const sid = [...diProva][0];
                        const surv = ((state.projects[pid] || {}).surveys || {})[sid] || leggiDa('s' + S + pid + S + sid);
                        const nr = surv && surv.header && surv.header.provaNr;
                        return `Prova ${nr || ''} · ${nomeProgetto(pid)}`.replace('Prova  ·', 'prova ·');
                    }
                    return nomeProgetto(pid);
                }
                if (progetti.size > 1) return `${progetti.size} progetti`;
                const NOMI = { lithologyArchive: 'archivio litologico', reportTemplates: 'template di report', indiceTemplates: 'template dell\'indice' };
                return [...globali].map(g => NOMI[g] || g).join(', ') || 'modifica';
            }

            // ---- I tasti ----

            /** I tasti Annulla e Ripeti di ogni schermata (data-cronologia="indietro"|"avanti").
             * Ripeti con data-nascondi-vuoto sparisce quando non c'è niente da ripetere. */
            function aggiornaTastiCronologia() {
                const c = cronologia();
                const usabile = !caricamentoDati.bloccato;
                // Si chiama a ogni salvataggio, cioè a ogni colpo: i tasti si cercano una volta sola
                // e si toccano solo se cambia qualcosa.
                const firma = `${usabile}|${c.indietro.length > 0}|${c.avanti.length > 0}`;
                if (firma === aggiornaTastiCronologia.firma) return;
                aggiornaTastiCronologia.firma = firma;
                if (!aggiornaTastiCronologia.tasti) aggiornaTastiCronologia.tasti = Array.from(document.querySelectorAll('[data-cronologia]'));
                aggiornaTastiCronologia.tasti.forEach(b => {
                    const indietro = b.dataset.cronologia === 'indietro';
                    const pila = indietro ? c.indietro : c.avanti;
                    b.disabled = !usabile || pila.length === 0;
                    if (b.hasAttribute('data-nascondi-vuoto')) b.hidden = pila.length === 0;
                });
            }

            document.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('[data-cronologia]');
                if (!b || b.disabled) return;
                if (b.dataset.cronologia === 'indietro') annullaAzione(); else ripetiAzione();
            });
            // Un tocco separa due scritture nello stesso campo (vedi registraPassoCronologia).
            document.addEventListener('pointerdown', () => { cronologia().tocchi++; }, true);

            // Ctrl+Z annulla, Ctrl+Y o Ctrl+Maiusc+Z ripete. Mentre si scrive in un campo restano
            // quelli del campo; con una finestra aperta restano quelli della finestra.
            document.addEventListener('keydown', (e) => {
                if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
                const k = (e.key || '').toLowerCase();
                const indietro = k === 'z' && !e.shiftKey;
                const avanti = k === 'y' || (k === 'z' && e.shiftKey);
                if (!indietro && !avanti) return;
                if (e.defaultPrevented || elementoDiScrittura(e.target) || !cronologiaUsabile()) return;
                e.preventDefault();
                // Il banner «Eliminato… Annulla» ha la precedenza finché è visibile: è l'azione di cui
                // parla lo schermo in quel momento.
                const banner = document.getElementById('undoNotificationBanner');
                if (indietro && banner && banner.style.display === 'flex') { document.getElementById('btnUndoDeleteProject').click(); return; }
                if (indietro) annullaAzione(); else ripetiAzione();
            });

            // ---- Foto e immagini delle note che la cronologia può ancora rimettere ----

            /** Gli id che compaiono nelle prove tenute dai passi (un insieme più largo delle sole
             * foto: basta che ci siano tutte). */
            function idFotoNellaCronologia() {
                const S = SEP_CRONOLOGIA;
                const ids = new Set();
                const c = cronologia();
                const re = /"id":"([^"\\]+)"/g;
                const scorri = (m) => m.forEach((t, k) => {
                    if (!t || k[0] !== 's' || k.split(S).length !== 3) return;
                    let x;
                    re.lastIndex = 0;
                    while ((x = re.exec(t)) !== null) ids.add(x[1]);
                });
                c.indietro.concat(c.avanti).forEach(p => { scorri(p.prima); scorri(p.dopo); });
                return ids;
            }

            /** Le immagini delle note tenute dai passi e dall'ultimo salvataggio: l'editor delle note
             * cancella l'immagine prima di salvare la nota che non la contiene più. */
            function idImmaginiNoteNellaCronologia() {
                const S = SEP_CRONOLOGIA;
                const ids = new Set();
                const c = cronologia();
                const re = /data-note-img-id=\\"([^"\\]+)\\"/g;
                const leggi = (t, k) => {
                    if (!t || k[0] !== 'p' || !k.endsWith(S + 'notes')) return;
                    let x;
                    re.lastIndex = 0;
                    while ((x = re.exec(t)) !== null) ids.add(x[1]);
                };
                c.indietro.concat(c.avanti).forEach(p => { p.prima.forEach(leggi); p.dopo.forEach(leggi); });
                if (c.base) c.base.progetti.forEach(p => p.parti.forEach(leggi));
                return ids;
            }
