            // ===================== SCHEDE DEL MENU DEL BLOCCO =====================
            // Il menu è cresciuto: allineamento, larghezza, altezza, griglia, carattere, foto,
            // didascalia, mappa, interruzioni... In una colonna sola, nella posizione "spia" da
            // 32vh, se ne vedono due o tre. È il debito acceso man mano che i controlli miglioravano.
            //
            // Le schede si costruiscono DAL DOM GIÀ RESO, non riordinando il markup. Il markup è un
            // unico template di ~390 righe fatto di frammenti condizionali annidati: spostarne i
            // pezzi a mano per raggrupparli sarebbe il modo più rapido per romperlo. Qui invece si
            // scorrono i figli del menu e si spostano dentro i pannelli — spostare un nodo NON
            // stacca i suoi gestori, e i gestori vengono comunque agganciati dopo, con querySelector
            // sul menu, che continua a trovarli.
            //
            // Come si decide dove va un pezzo: dall'ultima etichetta di sezione incontrata. Ogni
            // elemento senza etichetta propria eredita quella di chi lo precede, esattamente come
            // lo legge l'occhio.
            /** Sposta "Rimuovi blocco" dal fondo del pannello dentro la tendina ⋮ della testata.
             *
             * Il bottone non viene ricostruito: viene SPOSTATO. Spostare un nodo non ne stacca i
             * gestori, quindi la logica di eliminazione (con tutte le sue guardie sul blocco
             * bloccato) resta esattamente quella di prima — nessuna seconda copia da tenere
             * allineata.
             *
             * Vale su desktop e su mobile: un'azione distruttiva non deve stare nel punto più
             * comodo da toccare, su nessuno schermo.
             */
            function spostaRimuoviNelMenuAltro(menu) {
                const rimuovi = menu.querySelector('.tpl-editor-menu-remove');
                const tendina = menu.querySelector('[data-role="menu-altro"]');
                const bottone = menu.querySelector('[data-action="apri-menu-altro"]');
                if (!rimuovi || !tendina || !bottone) return;
                // "Sposta blocco" vive nella stessa tendina: è un'azione rara come
                // "Rimuovi" (si sposta un blocco una volta ogni tanto, si regolano larghezza e
                // carattere di continuo) e occuperebbe spazio prezioso nella parte sempre visibile
                // del pannello. SPOSTATO, non ricreato: il suo gestore resta quello di sempre.
                const sposta = menu.querySelector('.tpl-editor-menu-sposta');
                if (sposta) tendina.appendChild(sposta);
                tendina.appendChild(rimuovi);
                const chiudi = () => { tendina.hidden = true; bottone.setAttribute('aria-expanded', 'false'); };
                bottone.setAttribute('aria-expanded', 'false');
                bottone.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const apri = tendina.hidden;
                    tendina.hidden = !apri;
                    bottone.setAttribute('aria-expanded', apri ? 'true' : 'false');
                });
                // Un tocco ovunque altrove la richiude. Le azioni distruttive non devono restare
                // aperte alle spalle dell'utente.
                menu.addEventListener('click', (e) => {
                    if (!tendina.hidden && !tendina.contains(e.target) && e.target !== bottone) chiudi();
                });
            }

            const SCHEDE_MENU_BLOCCO = [
                { id: 'posizione', etichetta: 'Posizione', sezioni: ['Allineamento'] },
                { id: 'dimensione', etichetta: 'Dimensione', sezioni: ['Dimensione', 'Larghezza', 'Scala del grafico', 'Altezza spazio', 'Zoom mappa'] },
                { id: 'stile', etichetta: 'Stile', sezioni: ['Griglia tabella', 'Livello', 'Dimensione carattere', 'Dimensione testo', 'Dimensione etichette', 'Disposizione schede', 'Colore schede', 'Ordine delle schede', 'Linea', 'Legenda'] },
                { id: 'contenuto', etichetta: 'Contenuto', sezioni: ['Testo', 'Toponimi', 'Etichetta testo', 'Dimensione etichetta', 'Sposta mappa', 'Foto da mostrare', 'Didascalia', 'Dimensione didascalia'] },
                { id: 'pagine', etichetta: 'Pagine', sezioni: [] }
            ];
            // Scheda scelta, conservata FUORI dalla funzione: il menu viene ricostruito da zero a
            // ogni modifica, e senza questo ogni regolazione ti riporterebbe alla prima scheda.
            let schedaMenuBloccoAttiva = 'dimensione';
            function schedaDiSezione(testoEtichetta) {
                const t = (testoEtichetta || '').trim();
                const trovata = SCHEDE_MENU_BLOCCO.find(s => s.sezioni.includes(t));
                // Sconosciuta → "Contenuto": è la scheda dei comandi specifici del tipo di blocco,
                // quindi una sezione nuova che nessuno ha classificato finisce nel posto meno
                // sbagliato invece di sparire.
                return trovata ? trovata.id : 'contenuto';
            }
            // ORDINE A FASCE (vedi Design_Ordine_Controlli.md): scelte → misure → vincoli → azioni.
            // Vive in una funzione a parte perché vale SEMPRE, desktop compreso: fra le due
            // modalità cambia quanto i comandi sono condensati, non l'ordine in cui si leggono.
            // (Prima stava dentro la funzione delle schede, che su desktop esce subito — quindi il
            // desktop restava con l'ordine di scrittura del codice. Errore mio, corretto qui.)
            // 'scheda-su'/'scheda-giu' tolte: quelle due frecce non esistono piu', il riordino delle
            // schede si fa trascinando (vedi la lista in apriMenuBloccoEditor).
            const AZIONI_NOTE_MENU = new Set(['bilancia-riga', 'modifica-testo', 'pan', 'pan-reset',
                'profondita-asse-auto', 'caption-reset', 'schede-ordine-reset', 'remove']);
            function fasciaDiSezioneMenu(elementi) {
                // Decide il PRIMO comando della sezione: è quello che l'utente incontra per primo
                // leggendo, quindi è quello che dà il carattere alla sezione.
                //
                // ESCAPE HATCH ESPLICITO (richiesto per riorganizzare i menu senza toccare questa
                // euristica per tutti i tipi di blocco): un contenitore con data-fascia="N" dichiara
                // la propria fascia invece di farsela indovinare frugando nei discendenti — necessario
                // perché "contiene una checkbox da qualche parte" (sotto) altrimenti vince SEMPRE,
                // anche quando quella checkbox è solo un dettaglio secondario di un gruppo che deve
                // restare in cima (es. "Spazio" nel Divisore, con dentro "Spaziatore elastico").
                for (const el of elementi) {
                    if (el.dataset && el.dataset.fascia) return parseInt(el.dataset.fascia, 10);
                }
                for (const el of elementi) {
                    if (el.querySelector && el.querySelector('input[type="checkbox"]')) return 3;
                    if (el.classList.contains('tpl-ctrl-num') || (el.querySelector && el.querySelector('.tpl-ctrl-num'))) return 2;
                    const btn = el.querySelector && el.querySelector('[data-action]');
                    if (btn && AZIONI_NOTE_MENU.has(btn.dataset.action)) return 4;
                    if (btn) return 1;
                }
                return 1;
            }
            /** Riordina le SEZIONI di un contenitore per fascia, lasciando intatte le sezioni.
             * @param {HTMLElement} contenitore pannello di una scheda, oppure il menu stesso
             * @param {HTMLElement[]} [soloQuesti] su desktop il menu contiene anche testata e coda,
             *   che non vanno toccate: si passa l'elenco dei figli davvero smistabili. */
            function riordinaSezioniAFasce(contenitore, soloQuesti) {
                const figli = soloQuesti || Array.from(contenitore.children);
                if (figli.length < 2) return;
                const sezioni = [];
                figli.forEach(el => {
                    const apreSezione = el.classList.contains('tpl-editor-menu-section-label')
                        || el.classList.contains('tpl-ctrl-num')
                        || el.classList.contains('tpl-editor-interr-sezione')
                        // Un gruppo con data-fascia (vedi fasciaDiSezioneMenu) è sempre atomico:
                        // comincia una sezione propria, non si fonde mai con quella prima di lui.
                        || (el.dataset && el.dataset.fascia);
                    if (apreSezione || sezioni.length === 0) sezioni.push([]);
                    sezioni[sezioni.length - 1].push(el);
                });
                if (sezioni.length < 2) return;
                // Ancora: dove reinserire. Su desktop la coda (Rimuovi/⋮) deve restare in fondo.
                const dopo = figli[figli.length - 1].nextSibling;
                sezioni
                    .map((elementi, ordineOriginale) => ({ elementi, ordineOriginale, fascia: fasciaDiSezioneMenu(elementi) }))
                    // Ordinamento STABILE: dentro la stessa fascia l'ordine originale resta, così
                    // si sposta il minimo indispensabile e il menu non risulta stravolto.
                    .sort((a, b) => (a.fascia - b.fascia) || (a.ordineOriginale - b.ordineOriginale))
                    .forEach(s => s.elementi.forEach(el => contenitore.insertBefore(el, dopo)));
            }

            function organizzaMenuInSchede(menu) {
                const figliTutti = Array.from(menu.children);
                if (!modalitaMobileTemplateEditor()) {
                    // Su desktop niente schede — il popover è alto e la colonna unica si legge
                    // benissimo, le linguette sarebbero un clic per niente — ma l'ORDINE sì:
                    // è la stessa gerarchia, solo su una colonna sola.
                    const testaD = figliTutti.filter(el => el.classList.contains('tpl-editor-block-menu-drag-handle') || el === figliTutti[1]
                        || el.classList.contains('tpl-editor-menu-altro') || (el.querySelector && el.querySelector('[data-action="apri-menu-altro"]')));
                    riordinaSezioniAFasce(menu, figliTutti.filter(el => !testaD.includes(el)));
                    return;
                }
                const figli = figliTutti;
                // Testa e coda restano SEMPRE visibili: la maniglia serve a ridimensionare il
                // pannello da qualunque scheda, il nome del blocco dice su cosa stai agendo, e
                // "Rimuovi blocco" non deve nascondersi dentro una scheda a caso. Anche la tendina
                // del ⋮ (Sposta / Rimuovi) è testa: smistata nella prima scheda, dalle altre il ⋮
                // si apriva su un pannello nascosto e sembrava non fare niente (27/09/2026).
                const testa = figli.filter(el => el.classList.contains('tpl-editor-block-menu-drag-handle') || el === figli[1]
                    || el.classList.contains('tpl-editor-menu-altro'));
                const coda = figli.filter(el => el.classList.contains('tpl-editor-menu-remove'));
                const daSmistare = figli.filter(el => !testa.includes(el) && !coda.includes(el));
                if (daSmistare.length === 0) return;
                const pannelli = new Map();
                const pannelloDi = (id) => {
                    if (!pannelli.has(id)) {
                        const p = document.createElement('div');
                        p.className = 'tpl-editor-menu-pannello';
                        p.dataset.scheda = id;
                        pannelli.set(id, p);
                    }
                    return pannelli.get(id);
                };
                let schedaCorrente = 'posizione';
                daSmistare.forEach(el => {
                    if (el.classList.contains('tpl-editor-interr-sezione')) {
                        schedaCorrente = 'pagine';
                    } else if (el.classList.contains('tpl-editor-menu-section-label')) {
                        schedaCorrente = schedaDiSezione(el.textContent);
                    } else if (el.dataset && el.dataset.fascia) {
                        // Gruppo esplicito (vedi fasciaDiSezioneMenu): si classifica dalla PROPRIA
                        // etichetta di sezione interna, non da quella del gruppo precedente — altrimenti
                        // su mobile finirebbe nella scheda sbagliata solo perché non tocca il DOM
                        // direttamente con la classe giusta.
                        const etichettaInterna = el.querySelector('.tpl-editor-menu-section-label, .tpl-ctrl-num-etichetta');
                        if (etichettaInterna) schedaCorrente = schedaDiSezione(etichettaInterna.textContent);
                    } else {
                        // I controlli numerici condivisi non hanno un'etichetta di sezione a parte:
                        // la portano dentro di sé (vedi htmlControlloNumerico). Vale come etichetta.
                        const propria = el.classList.contains('tpl-ctrl-num') ? el : el.querySelector(':scope > .tpl-ctrl-num');
                        const testo = propria ? propria.querySelector('.tpl-ctrl-num-etichetta') : null;
                        if (testo) schedaCorrente = schedaDiSezione(testo.textContent);
                    }
                    pannelloDi(schedaCorrente).appendChild(el);
                });
                // Riordino a fasce dentro ogni pannello, con la stessa funzione usata anche su
                // desktop: un solo posto decide l'ordine, quindi le due modalità non possono
                // divergere.
                pannelli.forEach(pannello => riordinaSezioniAFasce(pannello));
                // Schede vuote non esistono: la maggior parte dei blocchi ne riempie due o tre, e
                // una linguetta che apre il vuoto è peggio di nessuna linguetta.
                const presenti = SCHEDE_MENU_BLOCCO.filter(s => pannelli.has(s.id) && pannelli.get(s.id).children.length > 0);
                if (presenti.length <= 1) {
                    // Un solo gruppo: niente barra, si torna alla colonna semplice. Le linguette
                    // servono a scegliere, e con una scelta sola non c'è niente da scegliere.
                    presenti.forEach(s => { while (pannelli.get(s.id).firstChild) menu.insertBefore(pannelli.get(s.id).firstChild, coda[0] || null); });
                    return;
                }
                if (!presenti.some(s => s.id === schedaMenuBloccoAttiva)) schedaMenuBloccoAttiva = presenti[0].id;
                const barra = document.createElement('div');
                barra.className = 'tpl-editor-menu-schede';
                barra.setAttribute('role', 'tablist');
                presenti.forEach(s => {
                    const b = document.createElement('button');
                    b.type = 'button';
                    b.className = 'tpl-editor-menu-scheda-btn' + (s.id === schedaMenuBloccoAttiva ? ' attiva' : '');
                    b.dataset.scheda = s.id;
                    b.setAttribute('role', 'tab');
                    b.setAttribute('aria-selected', s.id === schedaMenuBloccoAttiva ? 'true' : 'false');
                    b.textContent = s.etichetta;
                    b.addEventListener('click', () => {
                        schedaMenuBloccoAttiva = s.id;
                        barra.querySelectorAll('.tpl-editor-menu-scheda-btn').forEach(x => {
                            const att = x.dataset.scheda === s.id;
                            x.classList.toggle('attiva', att);
                            x.setAttribute('aria-selected', att ? 'true' : 'false');
                        });
                        menu.querySelectorAll('.tpl-editor-menu-pannello').forEach(p => p.classList.toggle('attiva', p.dataset.scheda === s.id));
                        triggerVibrate(8);
                    });
                    barra.appendChild(b);
                });
                const primoDopoTesta = coda[0] || null;
                menu.insertBefore(barra, primoDopoTesta);
                presenti.forEach(s => {
                    const p = pannelli.get(s.id);
                    p.classList.toggle('attiva', s.id === schedaMenuBloccoAttiva);
                    menu.insertBefore(p, primoDopoTesta);
                });
            }

            // Un solo aggancio globale per il rilascio, non uno per ogni apertura del menu: il menu
            // viene ricostruito continuamente e i gestori si accumulerebbero.
            let rilascioRegolazioneAgganciato = false;
            /** Mentre si trascina uno slider del menu, il menu si fa da parte per far vedere il
             * blocco che sta cambiando (richiesto esplicitamente: "l'utente lo fa alla cieca
             * siccome non si vede minimamente quello che sta avvenendo").
             *
             * Tre decisioni non ovvie:
             * 1. Il rilascio si ascolta su WINDOW, non sullo slider. Se il dito esce dal menu e
             *    molli lì, lo slider non riceve niente e il pannello resterebbe fantasma per
             *    sempre. Serve anche 'pointercancel': una notifica di sistema che arriva a metà
             *    trascinamento genera quello, non un 'pointerup'.
             * 2. Al rilascio la classe si toglie dal menu ATTUALE, riletto dal DOM. Molti slider
             *    ricostruiscono il menu da zero al commit, quindi un riferimento catturato alla
             *    presa punterebbe a un elemento morto.
             * 3. Sbiadisce TUTTO il pannello, comando compreso ("tanto se sto trascinando so dov'è
             *    lo slider"). Una prima versione teneva pieno il comando attivo: più codice, e
             *    lasciava comunque una macchia opaca sopra il foglio proprio dove stai guardando.
             *    Essendo l'opacità su un unico elemento, basta una riga di CSS.
             */
            function attivaTrasparenzaMenuDuranteRegolazione(menu) {
                menu.addEventListener('pointerdown', (e) => {
                    const slider = e.target && e.target.closest ? e.target.closest('input[type="range"]') : null;
                    if (!slider) return;
                    menu.classList.add('in-regolazione');
                });
                if (rilascioRegolazioneAgganciato) return;
                rilascioRegolazioneAgganciato = true;
                const fineRegolazione = () => {
                    document.querySelectorAll('.tpl-editor-block-menu.in-regolazione').forEach(m => m.classList.remove('in-regolazione'));
                };
                window.addEventListener('pointerup', fineRegolazione);
                window.addEventListener('pointercancel', fineRegolazione);
            }

            /** Aggancia gli eventi di un controllo creato da htmlControlloNumerico.
             * @param {HTMLElement} menu contenitore in cui cercare gli elementi
             * @param {string} azione lo stesso identificatore passato a htmlControlloNumerico
             * @param {object} gestori
             *   anteprima(valore)  — chiamato a ogni tick del cursore: SOLO effetti visivi, mai
             *                        ricostruzioni del menu (sostituirebbero l'elemento sotto il dito)
             *   commit(valore)     — al rilascio del cursore o alla conferma del campo: scrive nel modello
             *   secondario(valore) — HTML della nota accanto all'etichetta (es. "· 50%"), opzionale
             *   resetA             — valore del doppio tocco sul cursore, opzionale
             */
            function collegaControlloNumerico(menu, azione, gestori) {
                const slider = menu.querySelector(`[data-action="${azione}"]`);
                if (!slider) return;
                const campo = menu.querySelector(`[data-role="${azione}-campo"]`);
                const secondario = menu.querySelector(`[data-role="${azione}-secondario"]`);
                const min = parseFloat(slider.min);
                const max = parseFloat(slider.max);
                const decimali = (campo && campo.step && String(campo.step).includes('.')) ? 1 : 0;
                // Riportare dentro i limiti invece di rifiutare: un campo che non reagisce lascia
                // l'utente a chiedersi cosa ha sbagliato.
                const dentroLimiti = (v) => Math.min(max, Math.max(min, v));
                const aggiornaContorno = (v) => {
                    if (campo && document.activeElement !== campo) campo.value = v.toFixed(decimali);
                    if (secondario && gestori.secondario) secondario.innerHTML = gestori.secondario(v);
                };
                slider.addEventListener('input', () => {
                    const v = dentroLimiti(parseFloat(slider.value));
                    if (!isFinite(v)) return;
                    aggiornaContorno(v);
                    if (gestori.anteprima) gestori.anteprima(v);
                });
                slider.addEventListener('change', () => {
                    const v = dentroLimiti(parseFloat(slider.value));
                    if (isFinite(v) && gestori.commit) gestori.commit(v);
                });
                if (campo) {
                    // Di proposito NON su "input": digitando "12" si passerebbe da 1 a 12, e il
                    // blocco verrebbe ricostruito due volte con un lampeggio a metà numero.
                    const confermaCampo = () => {
                        const grezzo = parseFloat(campo.value);
                        if (!isFinite(grezzo)) {
                            // Campo svuotato o illeggibile: si torna al valore in corso invece di
                            // propagare uno stato vuoto nel modello.
                            campo.value = parseFloat(slider.value).toFixed(decimali);
                            return;
                        }
                        const v = dentroLimiti(grezzo);
                        campo.value = v.toFixed(decimali);
                        slider.value = v;
                        if (gestori.commit) gestori.commit(v);
                    };
                    campo.addEventListener('change', confermaCampo);
                    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); campo.blur(); } });
                }
                if (gestori.resetA != null) attivaDoppioTapResetSlider(slider, azione + '-reset', gestori.resetA);
            }

            /** Larghezza utile della riga in millimetri, per il template attualmente aperto
             * nell'editor. Passa da calcolaBudgetPaginaMm (fonte unica della geometria di pagina)
             * invece di rifare "210 - margini" a mano: è esattamente il tipo di formula duplicata
             * che aveva causato il disallineamento editor/export. */
            function larghezzaRigaUtileMm() {
                return calcolaBudgetPaginaMm(templateEditorState.margins, templateEditorState.footerEnabled).larghezzaUtileMm;
            }
            /** Etichetta unica per la larghezza di un blocco: millimetri di carta veri in primo
             * piano, percentuale accanto in piccolo. Una sola funzione per tutti i punti che la
             * mostrano (menu, maniglia laterale sul foglio, aggiornamento dal vivo dello slider):
             * se un giorno si passa ai mm anche come dato salvato, cambia solo qui.
             * @param {number} pct larghezza in percentuale della riga (il dato realmente salvato)
             * @param {number} [utileMm] larghezza utile della riga, se già nota (percorsi caldi)
             * @param {boolean} [soloTesto] true per contesti senza HTML, come l'etichetta della maniglia */
            function etichettaLarghezzaBlocco(pct, utileMm, soloTesto) {
                const utile = (typeof utileMm === 'number' && isFinite(utileMm)) ? utileMm : larghezzaRigaUtileMm();
                const pctArrotondata = Math.round(pct);
                if (!(utile > 0)) return `${pctArrotondata}%`;
                const mm = Math.round(pct / 100 * utile);
                return soloTesto
                    ? `${mm}mm · ${pctArrotondata}%`
                    : `${mm}mm <span style="opacity:.6; font-weight:600;">· ${pctArrotondata}%</span>`;
            }

            function attivaManigliaColspanBlocco(handleEl, entryId) {
                handleEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Cerca la voce in TUTTE le pagine (vedi trovaVoceRigaPerIdOvunque): questa
                    // maniglia può vivere anche su una pagina di CONTINUAZIONE, la cui page.rows è
                    // sempre vuoto. "cols" invece resta letto dalla pagina ATTIVA — anche una
                    // pagina di continuazione eredita lo stesso numero di colonne della pagina di
                    // origine (vedi sincronizzaFlussiBlocchiLunghi), quindi resta corretto così.
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    const voce = trovaVoceRigaPerIdOvunque(entryId);
                    if (!voce) return;
                    const cols = page.cols || 4;
                    const rigaEl = handleEl.closest('.tpl-editor-row');
                    const rigaRect = rigaEl ? rigaEl.getBoundingClientRect() : null;
                    const larghezzaColonnaPx = rigaRect ? Math.max(20, (rigaRect.width - (cols - 1) * 8) / cols) : 60;
                    const attuale = voce.colSpan || cols;

                    // Doppio tocco (richiesto esplicitamente, stessa tecnica della maniglia bassa
                    // qui sopra e di attivaDoppioTapResetSlider): resetta a 100% (piena larghezza,
                    // espandi=true) invece di iniziare un trascinamento.
                    const chiaveTapColspan = 'colspan:' + entryId;
                    const oraTapColspan = Date.now();
                    if (ultimoTapManigliaBloccoCanvas.key === chiaveTapColspan && (oraTapColspan - ultimoTapManigliaBloccoCanvas.t) < 350) {
                        ultimoTapManigliaBloccoCanvas = { key: null, t: 0 };
                        if (attuale !== cols || voce.espandiSuSpazioVuoto === false) {
                            salvaUndoSnapshotEditor();
                            voce.colSpan = cols;
                            voce.espandiSuSpazioVuoto = true;
                        }
                        renderTemplateEditorCanvas();
                        return;
                    }
                    ultimoTapManigliaBloccoCanvas = { key: chiaveTapColspan, t: oraTapColspan };

                    // Blocco vero e proprio a cui appartiene la maniglia: senza aggiornarne il flex
                    // dal vivo (come fa già il divisore tra due blocchi affiancati, vedi
                    // attivaTrascinamentoDivisoreColonne) il trascinamento non dava NESSUN riscontro
                    // visivo — solo l'etichetta numerica cambiava, quindi "sembrava" non funzionare
                    // (segnalato esplicitamente). Qui il blocco è solo, non ha un vicino con cui
                    // dividersi lo spazio: si allarga/restringe rubando o restituendo spazio alla riga.
                    const elBlocco = document.querySelector(`.tpl-editor-block[data-block-id="${entryId}"]`);
                    // Bordi di tutti gli ALTRI blocchi della pagina, catturati una sola volta qui
                    // all'avvio (richiesto esplicitamente, guida di allineamento magnetica — vedi
                    // mostraGuidaAllineamentoEditor): non serve ricalcolarli ad ogni pointermove,
                    // durante il trascinamento solo QUESTO blocco cambia dimensione.
                    const bordiAltriBlocchi = catturaBordiAltriBlocchiEditor(entryId);
                    // Larghezza utile in mm calcolata UNA volta alla presa e portata nello stato:
                    // il pointermove qui sotto gira a ogni fotogramma e non deve rifare il conto
                    // dei margini, che comunque non possono cambiare mentre si trascina.
                    const utileMm = larghezzaRigaUtileMm();
                    bloccoManigliaStato = { tipo: 'colspan', id: entryId, startX: e.clientX, colspanIniziale: attuale, colspanCorrente: attuale, larghezzaColonnaPx, cols, elBlocco, voce, bordiAltriBlocchi, utileMm };
                    resizeManigliaLastEvent = e;
                    // Richiesto esplicitamente: stesso auto-scroll della maniglia di altezza/scala
                    // qui sopra, per raggiungere anche questa maniglia quando il blocco sfora fuori
                    // dal bordo visibile del canvas.
                    avviaAutoScrollViewportEditor(() => (bloccoManigliaStato && bloccoManigliaStato.tipo === 'colspan' && bloccoManigliaStato.id === entryId) ? resizeManigliaLastEvent : null);
                    // La cattura del puntatore è un miglioramento, non una condizione: se il
                    // motore la rifiuta il trascinamento deve continuare a funzionare invece di
                    // morire qui portandosi dietro tutto il resto del gesto.
                    try { handleEl.setPointerCapture(e.pointerId); } catch (err) { /* si tira avanti senza */ }
                    // Millimetri in primo piano e percentuale accanto: stessa etichetta del menu
                    // (etichettaLarghezzaBlocco), così il numero che leggi mentre trascini è lo
                    // stesso che ritrovi quando apri il menu. Niente più linguaggio "colonne",
                    // residuo del vecchio sistema.
                    mostraEtichettaManigliaBlocco(handleEl, etichettaLarghezzaBlocco(Math.min(cols, attuale) / cols * 100, utileMm, true));
                });
                handleEl.addEventListener('pointermove', (e) => {
                    if (!bloccoManigliaStato || bloccoManigliaStato.tipo !== 'colspan' || bloccoManigliaStato.id !== entryId) return;
                    resizeManigliaLastEvent = e;
                    const deltaColonneContinuo = (e.clientX - bloccoManigliaStato.startX) / bloccoManigliaStato.larghezzaColonnaPx;
                    // Larghezza: sempre continua (richiesto esplicitamente, ripensamento radicale —
                    // niente più doppio livello "magnetico globale / libero per blocco" da tenere a
                    // mente, un solo comportamento uguale per tutti). L'etichetta mostra
                    // direttamente la percentuale, coerente col campo numerico "Larghezza" nel menu.
                    let nuovo = Math.round(Math.max(0.05 * bloccoManigliaStato.cols, Math.min(bloccoManigliaStato.cols, bloccoManigliaStato.colspanIniziale + deltaColonneContinuo)) * 100) / 100;
                    // BUG (segnalato: "trascino ma non si stringe il blocco"): flexEntryCss legge
                    // entry.espandiSuSpazioVuoto, che però resta quello VECCHIO fino al rilascio (si
                    // aggiorna solo in "fine" più sotto) — per un blocco che riempiva tutta la riga
                    // (espandi=true, il caso più comune) il valore dal vivo restava sempre in
                    // modalità "cresci", che con un solo blocco nella riga riempie SEMPRE il 100%
                    // qualunque sia il numero, quindi visivamente non si stringeva mai durante il
                    // trascinamento (si vedeva il cambiamento solo al rilascio). Si simula qui la
                    // STESSA regola che "fine" applicherà davvero, cosi l'anteprima dal vivo passa
                    // subito in modalità fissa appena si scende sotto al 100%.
                    if (bloccoManigliaStato.elBlocco) {
                        const voceAnteprima = { espandiSuSpazioVuoto: nuovo >= bloccoManigliaStato.cols, align: bloccoManigliaStato.voce.align };
                        bloccoManigliaStato.elBlocco.style.cssText += styleDimensioneVoce(voceAnteprima, nuovo, bloccoManigliaStato.cols);
                        // Il disegno del grafico si rifà con la larghezza che sta per avere: senza,
                        // il contenitore si stringe e il disegno resta com'era, cioè l'anteprima
                        // mostrerebbe una cosa e il rilascio un'altra.
                        ridisegnaGraficoAnteprima(bloccoManigliaStato.elBlocco.dataset.blockId, nuovo, bloccoManigliaStato.cols);
                        // Guida di allineamento magnetica (richiesto esplicitamente): il bordo destro
                        // appena disegnato si misura DAVVERO dal DOM (il flex non è lineare al 100%,
                        // ricalcolarlo a mano sarebbe impreciso) e si confronta con quelli catturati
                        // all'avvio. Abbastanza vicino a uno di loro → si mostra la linea guida e si
                        // corregge leggermente il valore verso quel bordo (stessa unità di misura
                        // larghezzaColonnaPx già usata sopra per il trascinamento): il fotogramma
                        // successivo ridisegna e converge, senza scatti percepibili.
                        const bordoDestroAttuale = bloccoManigliaStato.elBlocco.getBoundingClientRect().right;
                        const SOGLIA_MAGNETE_PX = 5;
                        let bordoAgganciato = null;
                        for (const x of bloccoManigliaStato.bordiAltriBlocchi) {
                            if (Math.abs(x - bordoDestroAttuale) < SOGLIA_MAGNETE_PX) { bordoAgganciato = x; break; }
                        }
                        if (bordoAgganciato != null) {
                            const correzioneColonne = (bordoAgganciato - bordoDestroAttuale) / bloccoManigliaStato.larghezzaColonnaPx;
                            nuovo = Math.round(Math.max(0.05 * bloccoManigliaStato.cols, Math.min(bloccoManigliaStato.cols, nuovo + correzioneColonne)) * 100) / 100;
                            const voceAnteprimaAgganciata = { espandiSuSpazioVuoto: nuovo >= bloccoManigliaStato.cols, align: bloccoManigliaStato.voce.align };
                            bloccoManigliaStato.elBlocco.style.cssText += styleDimensioneVoce(voceAnteprimaAgganciata, nuovo, bloccoManigliaStato.cols);
                            ridisegnaGraficoAnteprima(bloccoManigliaStato.elBlocco.dataset.blockId, nuovo, bloccoManigliaStato.cols);
                            mostraGuidaAllineamentoEditor(bordoAgganciato);
                            // Vibrazione una volta sola all'AGGANCIO, non ad ogni fotogramma finché si
                            // resta agganciati (altrimenti sarebbe un ronzio continuo e fastidioso).
                            if (!bloccoManigliaStato.eraAgganciato) triggerVibrate(8);
                            bloccoManigliaStato.eraAgganciato = true;
                        } else {
                            nascondiGuidaAllineamentoEditor();
                            bloccoManigliaStato.eraAgganciato = false;
                        }
                    }
                    bloccoManigliaStato.colspanCorrente = nuovo;
                    mostraEtichettaManigliaBlocco(handleEl, etichettaLarghezzaBlocco(nuovo / bloccoManigliaStato.cols * 100, bloccoManigliaStato.utileMm, true));
                });
                const fine = () => {
                    if (!bloccoManigliaStato || bloccoManigliaStato.tipo !== 'colspan' || bloccoManigliaStato.id !== entryId) return;
                    const finale = bloccoManigliaStato.colspanCorrente;
                    const iniziale = bloccoManigliaStato.colspanIniziale;
                    bloccoManigliaStato = null;
                    resizeManigliaLastEvent = null;
                    fermaAutoScrollBordoEditor();
                    nascondiEtichettaManigliaBlocco();
                    nascondiGuidaAllineamentoEditor();
                    if (finale !== iniziale) {
                        const page = templateEditorState.pages[templateEditorState.activePageIdx];
                        const voce = trovaVoceRigaPerIdOvunque(entryId);
                        if (voce) {
                            salvaUndoSnapshotEditor();
                            voce.colSpan = finale;
                            // Stessa regola del campo numerico "Larghezza" (richiesta esplicitamente,
                            // Larghezza unificata): a 100% la colonna si espande, sotto resta fissa.
                            voce.espandiSuSpazioVuoto = finale >= (page.cols || 4);
                        }
                    }
                    renderTemplateEditorCanvas();
                };
                handleEl.addEventListener('pointerup', fine);
                handleEl.addEventListener('pointercancel', fine);
            }
            function mostraEtichettaManigliaBlocco(handleEl, testo) {
                let lbl = document.getElementById('templateEditorHandleLabel');
                if (!lbl) {
                    lbl = document.createElement('div');
                    lbl.id = 'templateEditorHandleLabel';
                    lbl.className = 'tpl-editor-handle-label';
                    hostFloatingUiEditor().appendChild(lbl);
                }
                lbl.textContent = testo;
                const r = handleEl.getBoundingClientRect();
                lbl.style.left = (r.left + r.width / 2) + 'px';
                lbl.style.top = (r.top - 26) + 'px';
                lbl.style.display = 'block';
            }
            function nascondiEtichettaManigliaBlocco() {
                const lbl = document.getElementById('templateEditorHandleLabel');
                if (lbl) lbl.style.display = 'none';
            }

            /** Guide di allineamento "magnetiche" (richiesto esplicitamente: "quando due blocchi
             * affiancati collimano fai apparire una guida magnetica che avvisi l'utente") durante il
             * trascinamento della maniglia larghezza: mentre il bordo destro del blocco si sposta, se
             * si avvicina al bordo di un ALTRO blocco della pagina scatta un leggero magnetismo (il
             * valore si aggancia esattamente a quel bordo) e compare una linea verticale evidenziata,
             * la conferma visiva che i due blocchi sono ora perfettamente allineati — stesso
             * principio delle guide "smart" di Figma/PowerPoint. */
            function catturaBordiAltriBlocchiEditor(entryIdEscluso) {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) return [];
                const bordi = [];
                canvas.querySelectorAll('.tpl-editor-block').forEach(el => {
                    if (el.dataset.blockId === entryIdEscluso) return;
                    const r = el.getBoundingClientRect();
                    bordi.push(r.left, r.right);
                });
                return bordi;
            }
            function mostraGuidaAllineamentoEditor(xClient) {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) return;
                const canvasRect = canvas.getBoundingClientRect();
                let guida = document.getElementById('templateEditorGuidaAllineamento');
                if (!guida) {
                    guida = document.createElement('div');
                    guida.id = 'templateEditorGuidaAllineamento';
                    guida.style.position = 'fixed';
                    guida.style.width = '2px';
                    // Rosa acceso (richiesto: deve "avvisare", quindi un colore che non si confonda
                    // con l'accent blu usato per tutto il resto dell'editor — stessa convenzione delle
                    // guide smart di Figma/PowerPoint).
                    guida.style.background = '#ec4899';
                    guida.style.boxShadow = '0 0 5px rgba(236,72,153,0.7)';
                    guida.style.zIndex = '400';
                    guida.style.pointerEvents = 'none';
                    hostFloatingUiEditor().appendChild(guida);
                }
                guida.style.left = `${xClient}px`;
                guida.style.top = `${canvasRect.top}px`;
                guida.style.height = `${canvasRect.height}px`;
                guida.style.display = 'block';
            }
            function nascondiGuidaAllineamentoEditor() {
                const guida = document.getElementById('templateEditorGuidaAllineamento');
                if (guida) guida.style.display = 'none';
            }

            /** Come catturaBordiAltriBlocchiEditor ma sull'asse VERTICALE (richiesto esplicitamente:
             * "dovrebbero uscire delle guide anche lungo quella direzione quando eguaglio la
             * grandezza di ogni blocco a un altro" — riferito alla maniglia BASSA, che regola
             * altezza/zoom, non a quella laterale) — bordi TOP/BOTTOM di tutti gli altri blocchi
             * della pagina, usati da attivaManigliaScalaBlocco per agganciare l'altezza di un
             * blocco a quella di un altro mentre si trascina. */
            function catturaBordiVerticaliAltriBlocchiEditor(idEscluso) {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) return [];
                const bordi = [];
                canvas.querySelectorAll('.tpl-editor-block').forEach(el => {
                    if (el.dataset.blockId === idEscluso) return;
                    const r = el.getBoundingClientRect();
                    bordi.push(r.top, r.bottom);
                });
                return bordi;
            }
            /** Guida magnetica ORIZZONTALE (stessa idea/stile di mostraGuidaAllineamentoEditor, solo
             * ruotata di 90°): una linea che attraversa la larghezza del canvas all'altezza Y dove
             * il bordo del blocco che si sta ridimensionando ha agganciato quello di un altro. */
            function mostraGuidaAllineamentoOrizzontaleEditor(yClient) {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) return;
                const canvasRect = canvas.getBoundingClientRect();
                let guida = document.getElementById('templateEditorGuidaAllineamentoOrizzontale');
                if (!guida) {
                    guida = document.createElement('div');
                    guida.id = 'templateEditorGuidaAllineamentoOrizzontale';
                    guida.style.position = 'fixed';
                    guida.style.height = '2px';
                    guida.style.background = '#ec4899';
                    guida.style.boxShadow = '0 0 5px rgba(236,72,153,0.7)';
                    guida.style.zIndex = '400';
                    guida.style.pointerEvents = 'none';
                    hostFloatingUiEditor().appendChild(guida);
                }
                guida.style.top = `${yClient}px`;
                guida.style.left = `${canvasRect.left}px`;
                guida.style.width = `${canvasRect.width}px`;
                guida.style.display = 'block';
            }
            function nascondiGuidaAllineamentoOrizzontaleEditor() {
                const guida = document.getElementById('templateEditorGuidaAllineamentoOrizzontale');
                if (guida) guida.style.display = 'none';
            }

            /** Menu contestuale compatto (tocco prolungato su un blocco): qui vivono i controlli
             * meno usati quotidianamente — allineamento, compattezza del contenuto, dimensione
             * testo (solo blocchi testuali/tabellari) ed eliminazione — che prima affollavano la
             * barra sempre visibile. Popover ancorato al blocco, si chiude toccando altrove. */
            // Posizione scelta a mano dall'utente trascinando il popover (vedi
            // attivaTrascinamentoMenuBloccoEditor), per blocco: OGNI azione dentro il menu (bottone
            // allineamento, +/- compattezza, toggle toponimi...) ricrea il popover da zero per
            // riflettere lo stato aggiornato (chiudiMenuBloccoEditor + apriMenuBloccoEditor in
            // sequenza), quindi senza questa memoria "saltava" di nuovo accanto al blocco a ogni
            // tocco invece di restare dove l'utente l'aveva spostato (segnalato esplicitamente).
            // Non si azzera qui in chiudiMenuBloccoEditor apposta: quella chiamata avviene anche
            // internamente a ogni riapertura dello STESSO blocco, non solo alla chiusura "vera"
            // (click fuori). Si invalida da sola aprendo un blocco diverso, vedi apriMenuBloccoEditor.
            let menuBloccoPosizioneManuale = null;
            // Popover ridotto a bolla (richiesto esplicitamente: "rendila richiudibile in una
            // bolla"): { blockId } quando il popover pieno è nascosto e al suo posto c'è solo una
            // bollicina — il blocco resta comunque selezionato (maniglie/etichetta sul canvas
            // restano visibili, solo il pannello opzioni si toglie di mezzo).
            let menuBloccoCollassato = null;
            function chiudiMenuBloccoEditor() {
                const menu = document.getElementById('templateEditorBlockMenu');
                if (menu) menu.remove();
                rimuoviBollicinaMenuBlocco();
                menuBloccoCollassato = null;
                // La schermata piena delle interruzioni è uno stato temporaneo di QUESTA sessione
                // di modifica: chiudendo il menu si torna sempre al comportamento normale, così
                // toccando il blocco successivo non ci si ritrova dentro una schermata che non si
                // è chiesta.
                menuInterruzioniEspanso = false;
                document.removeEventListener('pointerdown', gestisciClickFuoriMenuBlocco, true);
            }
