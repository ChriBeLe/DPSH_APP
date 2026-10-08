            // ======================= BLOCCO IN SPOSTAMENTO (fra pagine) =======================
            /* Richiesto esplicitamente, e con un'idea di interazione migliore del copia/incolla
             * classico: «ogni blocco può diventare icona fluttuante e quando questa viene premuta
             * su un'altra pagina viene data l'opzione di piazzare automaticamente, trascinare,
             * eliminare il blocco o annullare lo spostamento».
             *
             * Perché è meglio di un appunti nascosto: un appunti invisibile costringe a ricordare
             * cosa si è tagliato e non dice mai se c'è ancora qualcosa dentro. Qui la cosa che si
             * sta spostando SI VEDE, quindi lo stato "ho tagliato e non me lo ricordo" non esiste.
             *
             * SOLO SPOSTAMENTO, MAI DUPLICAZIONE (deciso esplicitamente: «la copia creerebbe molti
             * disagi per gli ID, quindi non permettere di duplicare ma solo di spostare»). È la
             * decisione che ha tolto di mezzo il pericolo più grosso: spostando, l'oggetto blocco
             * è SEMPRE lo stesso e si porta dietro il suo id, che quindi resta unico per
             * costruzione. Duplicare avrebbe richiesto di rigenerare gli id anche dentro gli stack,
             * e due blocchi con lo stesso id significano menu che agiscono sul blocco sbagliato e
             * anteprime che aggiornano la fetta sbagliata — la famiglia di bug che in questo
             * progetto è costata più tempo di ogni altra.
             *
             * Il blocco viene tolto dalla pagina appena lo si prende (si vede "sollevarsi"), e
             * l'origine viene registrata per poterlo rimettere esattamente dov'era. */
            function bloccoInSpostamento() { return templateEditorState.bloccoInSpostamento || null; }

            /** Solleva un blocco dalla pagina e lo mette IN SPOSTAMENTO. Rispetta gli stessi divieti di
             * eliminazione e trascinamento: un blocco bloccato, o uno in una riga che ne contiene
             * uno bloccato, non si può prendere. */
            function avviaSpostamentoBlocco(blockId) {
                if (bloccoInSpostamento()) { mostraToastTemplateEditor('Stai già spostando un blocco: posalo o annulla prima di sceglierne un altro'); return false; }
                const page = paginaOrigineBlocco(blockId) || templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return false;
                const voce = trovaVoceContenenteBlocco(page, blockId);
                if (voce && voce.posizioneBloccata) {
                    mostraToastTemplateEditor('Blocco bloccato: sbloccalo dal menu per poterlo spostare');
                    return false;
                }
                const blk = trovaBloccoPerId(page, blockId);
                const etichetta = blk ? ((REPORT_BLOCK_TYPES[blk.type] || {}).label || blk.type) : 'Blocco';
                const tipo = blk ? blk.type : null;
                salvaUndoSnapshotEditor();
                // rimuoviBloccoDaPagina porta con sé TUTTE le guardie già scritte (riga bloccata,
                // riserve rowSpan da ripulire, stack che si scioglie quando resta un elemento
                // solo). Restituisce null quando rifiuta: non è un errore da nascondere.
                const tolto = rimuoviBloccoDaPagina(page, blockId);
                if (!tolto) {
                    mostraToastTemplateEditor('Quella riga contiene un blocco bloccato: non si può modificare finché non lo sblocchi');
                    return false;
                }
                templateEditorState.bloccoInSpostamento = {
                    blocco: tolto.block,
                    etichetta, tipo,
                    origine: {
                        pageId: page.id,
                        rowIndex: tolto.rowIndex,
                        blockIndex: tolto.blockIndex,
                        rowWasRemoved: !!tolto.rowWasRemoved,
                        wasStacked: !!tolto.wasStacked
                    }
                };
                deselezionaBloccoEditor();
                chiudiMenuBloccoEditor();
                templateEditorState.flowSyncNecessario = true;
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
                renderBarraSpostamento();
                triggerVibrate(25);
                mostraToastTemplateEditor(`${etichetta} in spostamento: vai sulla pagina che vuoi e scegli dove posarlo`);
                return true;
            }

            /** Rimette il blocco esattamente dove stava. Usata da "Annulla", e automaticamente su
             * ogni via d'uscita dall'editor (chiusura e salvataggio) — deciso esplicitamente:
             * «se l'utente decide di uscire dall'editor allora il blocco ritornerà nella posizione
             * iniziale senza perdita di niente». Il ripristino passa da inserisciBloccoInPagina,
             * non da uno splice a mano: così anche il ritorno rispetta i divieti (flowable, righe
             * bloccate) invece di poter ricreare uno stato che il motore non accetta. */
            function annullaSpostamentoBlocco(silenzioso) {
                const spost = bloccoInSpostamento();
                if (!spost) return false;
                templateEditorState.bloccoInSpostamento = null;
                const o = spost.origine;
                let page = (templateEditorState.pages || []).find(p => p.id === o.pageId);
                let tornatoAltrove = false;
                // La pagina d'origine può non esistere più (eliminata mentre il blocco era
                // in spostamento): meglio la pagina attiva che la perdita del blocco, ma va detto.
                if (!page) { page = templateEditorState.pages[templateEditorState.activePageIdx]; tornatoAltrove = true; }
                if (!page) return false;
                let pos;
                if (o.rowWasRemoved || !page.rows[o.rowIndex]) {
                    pos = { newRow: true, rowIndex: Math.min(o.rowIndex, page.rows.length), insertIndex: 0 };
                } else if (o.wasStacked) {
                    pos = { stackInto: { rowIndex: o.rowIndex, columnIndex: Math.min(o.blockIndex, page.rows[o.rowIndex].blocks.length - 1) } };
                } else {
                    pos = { rowIndex: o.rowIndex, insertIndex: Math.min(o.blockIndex, page.rows[o.rowIndex].blocks.length) };
                }
                if (!inserisciBloccoInPagina(page, spost.blocco, pos)) {
                    // Il posto esatto non è più disponibile (la riga si è riempita, o è stata
                    // bloccata nel frattempo): riga nuova in fondo, mai la perdita del blocco.
                    page.rows.push({ id: nuovoIdEditor('r'), blocks: [spost.blocco] });
                    tornatoAltrove = true;
                }
                templateEditorState.flowSyncNecessario = true;
                if (!silenzioso) {
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPalette();
                    renderBarraSpostamento();
                    mostraToastTemplateEditor(tornatoAltrove
                        ? `${spost.etichetta} rimesso in fondo alla pagina: il posto di prima non era più libero`
                        : `${spost.etichetta} rimesso al suo posto`);
                }
                return true;
            }

            /** Butta via il blocco che stai spostando. Distinta da "Annulla" perché sono due
             * intenzioni diverse: annullare è "avevo sbagliato a prenderlo", eliminare è "l'ho
             * preso e ho deciso che non mi serve". Resta comunque recuperabile con l'annulla
             * generale (lo snapshot è stato salvato quando l'hai preso). */
            function eliminaBloccoInSpostamento() {
                const spost = bloccoInSpostamento();
                if (!spost) return;
                templateEditorState.bloccoInSpostamento = null;
                templateEditorState.flowSyncNecessario = true;
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
                renderBarraSpostamento();
                mostraToastTemplateEditor(`${spost.etichetta} eliminato — la freccia indietro lo recupera`);
            }

            /** "Posa qui": in fondo alla pagina che stai guardando, come nuova riga a piena
             * larghezza. È lo stesso posto prevedibile in cui finisce un blocco aggiunto col tocco
             * dalla palette (vedi inserisciBloccoATocco) — una sola convenzione da imparare. */
            async function posaBloccoQui() {
                const spost = bloccoInSpostamento();
                if (!spost) return;
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;
                // Lo stato si azzera PRIMA dell'inserimento: se il tocco arrivasse due volte di
                // seguito (doppio tap involontario) il secondo non troverebbe più niente in spostamento e
                // non potrebbe inserire lo stesso oggetto due volte — cioè non potrebbe creare due
                // blocchi con lo stesso id, che è esattamente ciò che questa funzione non deve
                // permettere.
                templateEditorState.bloccoInSpostamento = null;
                const blocco = spost.blocco;
                if (!inserisciBloccoInPagina(page, blocco, { newRow: true, rowIndex: page.rows.length, insertIndex: 0 })) {
                    page.rows.push({ id: nuovoIdEditor('r'), blocks: [blocco] });
                }
                templateEditorState.flowSyncNecessario = true;
                renderBarraSpostamento();
                renderTemplateEditorPalette();
                // Stessa domanda già esistente per i blocchi nuovi ("non ci sta: nuova pagina o
                // adatta?") invece di inventarne una seconda che dice la stessa cosa: è anche
                // l'avviso "non entra nella pagina" chiesto esplicitamente.
                await gestisciInserimentoBloccoNuovoConOverflow(page, blocco);
                selezionaBloccoEditor(blocco.id);
                portaBloccoInVista(blocco.id);
                avvisaSeBloccoContinuaSuPiuPagine(blocco, spost.etichetta);
            }

            /** Avviso "questo blocco continuerà su altre N pagine", chiesto esplicitamente per i
             * blocchi lunghi. Il numero NON è una stima: viene dalle pagine di continuazione che
             * il motore ha DAVVERO costruito subito dopo il piazzamento (page.continuaBloccoId).
             * Se non c'è una misura vera non si scrive un numero. */
            function avvisaSeBloccoContinuaSuPiuPagine(blocco, etichetta) {
                if (!blocco || !BLOCCHI_FLOWABLE.has(blocco.type)) return;
                setTimeout(() => {
                    const continuazioni = (templateEditorState.pages || []).filter(p => p.continuaBloccoId === blocco.id).length;
                    if (continuazioni > 0) {
                        mostraToastTemplateEditor(`${etichetta}: continua su ${continuazioni === 1 ? "un'altra pagina" : `altre ${continuazioni} pagine`}`);
                    }
                }, 0);
            }

            /** La pillola fluttuante: l'unica parte davvero nuova di questa funzione. Sta sopra il
             * canvas, resta visibile mentre cambi pagina, e si apre in quattro voci.
             * Costruita a runtime invece che nel markup del modale perché esiste solo mentre hai
             * qualcosa in spostamento: un elemento permanente e quasi sempre nascosto sarebbe una cosa in
             * più che può restare accesa per sbaglio. */
            function renderBarraSpostamento() {
                const modal = document.getElementById('modalTemplateEditor');
                if (!modal) return;
                let barra = document.getElementById('tplEditorBarraSpostamento');
                const spost = bloccoInSpostamento();
                if (!spost) { if (barra) barra.remove(); return; }
                if (!barra) {
                    barra = document.createElement('div');
                    barra.id = 'tplEditorBarraSpostamento';
                    barra.className = 'tpl-editor-spostamento';
                    modal.appendChild(barra);
                }
                const icona = (REPORT_BLOCK_TYPES[spost.tipo] || {}).icon || 'clipboard';
                // Quattro voci, un verbo ciascuna, tutte della stessa forma: verbo in grassetto +
                // una riga sola di spiegazione. Prima erano frasi di lunghezza diversa ("Piazza
                // qui, in fondo alla pagina" contro "Trascina dove vuoi"): un elenco di azioni si
                // legge a colpo d'occhio solo se le voci sono parallele. L'eliminazione è staccata
                // in fondo da una linea, come per "Rimuovi blocco" nel menu del blocco: l'azione
                // distruttiva non deve stare in mezzo alle altre.
                const voci = [
                    { azione: 'posa',     icona: 'check',  verbo: 'Posa qui',  nota: 'in fondo a questa pagina' },
                    { azione: 'trascina', icona: 'move-y', verbo: 'Trascina',  nota: 'scegli tu il punto esatto' },
                    { azione: 'annulla',  icona: 'reset',  verbo: 'Annulla',   nota: 'torna da dove era partito' }
                ];
                barra.innerHTML = `
                    <div class="tpl-editor-spostamento-menu" data-role="spostamento-menu" hidden>
                        ${voci.map(v => `
                            <button type="button" data-sposta="${v.azione}">
                                <svg class="ico"><use href="#i-${v.icona}"/></svg>
                                <span class="sp-testo"><span class="sp-verbo">${v.verbo}</span><span class="sp-nota">${v.nota}</span></span>
                            </button>
                        `).join('')}
                        <button type="button" data-sposta="elimina" class="pericolo">
                            <svg class="ico"><use href="#i-trash"/></svg>
                            <span class="sp-testo"><span class="sp-verbo">Elimina</span><span class="sp-nota">togli il blocco dal template</span></span>
                        </button>
                    </div>
                    <button type="button" class="tpl-editor-spostamento-pill" data-sposta="apri" aria-expanded="false" title="Tocca per scegliere dove posare il blocco">
                        <span class="sp-ico"><svg class="ico"><use href="#i-${icona}"/></svg></span>
                        <span class="sp-etichette">
                            <span class="sp-stato">In spostamento</span>
                            <span class="sp-nome">${escapeHtmlDidascalia(spost.etichetta)}</span>
                        </span>
                        <svg class="ico sp-freccia"><use href="#i-chevron-down"/></svg>
                    </button>
                `;
                const tendina = barra.querySelector('[data-role="spostamento-menu"]');
                const pill = barra.querySelector('.tpl-editor-spostamento-pill');
                barra.querySelectorAll('[data-sposta]').forEach(b => {
                    b.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const azione = b.dataset.sposta;
                        if (azione === 'apri') {
                            const apri = tendina.hidden;
                            tendina.hidden = !apri;
                            pill.setAttribute('aria-expanded', apri ? 'true' : 'false');
                            barra.classList.toggle('aperta', apri);
                            return;
                        }
                        tendina.hidden = true;
                        barra.classList.remove('aperta');
                        pill.setAttribute('aria-expanded', 'false');
                        if (azione === 'posa') posaBloccoQui();
                        else if (azione === 'annulla') annullaSpostamentoBlocco(false);
                        else if (azione === 'elimina') eliminaBloccoInSpostamento();
                        else if (azione === 'trascina') {
                            mostraToastTemplateEditor('Trascina la scheda evidenziata nella barra degli strumenti fin dove vuoi');
                            evidenziaVoceSpostamentoNellaPalette();
                        }
                    });
                });
            }

            /** "Trascina": non apre un secondo modo di trascinare — porta l'attenzione sulla voce
             * che il blocco in spostamento occupa già nella barra degli strumenti, da cui si trascina
             * esattamente come un blocco nuovo (stesso fantasma, stesso indicatore di rilascio).
             * È l'idea suggerita — «meglio mostrando il blocco che sarebbe stato presente nella
             * barra degli strumenti» — ed è anche la ragione per cui questa funzione costa poco:
             * di meccanica di trascinamento non ne serve nessuna di nuova. */
            function evidenziaVoceSpostamentoNellaPalette() {
                aprTendinaPaletteSeMobile();
                requestAnimationFrame(() => {
                    const voce = document.querySelector('.tpl-editor-palette-item.in-spostamento');
                    if (!voce) return;
                    if (typeof voce.scrollIntoView === 'function') voce.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' });
                    voce.classList.add('spostamento-lampeggia');
                    setTimeout(() => voce.classList.remove('spostamento-lampeggia'), 1400);
                });
            }

            /** Su mobile la palette è un foglio a comparsa: se è chiusa, "Trascina" indicherebbe una
             * voce invisibile. Si apre solo se esiste la funzione della modalità mobile, così su
             * desktop (palette sempre visibile) non succede niente. */
            function aprTendinaPaletteSeMobile() {
                if (!modalitaMobileTemplateEditor()) return;
                const pannello = document.getElementById('templateEditorPaletteSidebar');
                if (pannello && !pannello.classList.contains('mobile-open')) apriTendinaPaletteMobile();
            }

            /** Scorre il canvas per mettere un blocco al centro della parte visibile. Usato dopo un
             * inserimento a tocco: senza, il risultato dell'azione può restare fuori schermo.
             * Attende un frame perché il blocco esiste nel DOM solo dopo il render appena chiesto. */
            function portaBloccoInVista(blockId) {
                requestAnimationFrame(() => {
                    const el = document.querySelector(`.tpl-editor-block[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`);
                    if (el && typeof el.scrollIntoView === 'function') {
                        el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
                    }
                });
            }

            function apriTendinaPaletteMobile() {
                const sidebar = document.getElementById('templateEditorPaletteSidebar');
                if (sidebar) sidebar.classList.add('mobile-open');
                aggiornaIconaFabPalette();
            }
            function chiudiTendinaPaletteMobile() {
                const sidebar = document.getElementById('templateEditorPaletteSidebar');
                if (sidebar) sidebar.classList.remove('mobile-open');
                aggiornaIconaFabPalette();
            }
            /** Il "+" diventa "✕" a pannello aperto (richiesto esplicitamente). Non si cambia icona:
             * si RUOTA la stessa di 45°, così il passaggio è un movimento continuo invece di uno
             * scambio secco — e resta chiaro che è lo stesso bottone con due stati, non due bottoni
             * diversi. La rotazione vive nel CSS (.tpl-editor-mobile-fab.aperto), qui si aggiunge
             * solo la classe e si aggiorna l'etichetta per chi usa un lettore di schermo. */
            function aggiornaIconaFabPalette() {
                const fab = document.getElementById('btnTemplateEditorMobileAddBlock');
                const sidebar = document.getElementById('templateEditorPaletteSidebar');
                if (!fab || !sidebar) return;
                const aperto = sidebar.classList.contains('mobile-open');
                fab.classList.toggle('aperto', aperto);
                fab.setAttribute('title', aperto ? 'Chiudi' : 'Aggiungi blocco');
                fab.setAttribute('aria-label', aperto ? 'Chiudi il pannello dei blocchi' : 'Aggiungi blocco');
            }

            /** Piazza un blocco (nuovo o trascinato via) nella posizione calcolata dal drag. Riga
             * bloccata (richiesto esplicitamente, ribadito più volte: il blocco bloccato deve
             * restare "fisso" in senso assoluto, "non deve venire riadattato") = intoccabile anche
             * dall'ESTERNO: prima di questa correzione si poteva comunque impilare un altro blocco
             * SOPRA una colonna bloccata (la trasformava in uno stack nuovo di zecca, perdendo
             * silenziosamente posizioneBloccata perché finiva sul singolo blocco impilato invece
             * che sul contenitore) oppure infilare un blocco affiancato in mezzo a una riga
             * bloccata, scalandone comunque l'ordine — è esattamente il "il sistema lo sposta come
             * meglio crede" segnalato. Ora si rifiuta il piazzamento (restituendo false) se la riga
             * di destinazione contiene un blocco bloccato: il chiamante deve gestire il fallback
             * (vedi terminaTrascinamentoEditor). Le nuove righe (pos.newRow) non sono mai
             * interessate: creano contenuto a parte, non toccano righe esistenti. */
            /** Una pagina di continuazione la costruisce e la distrugge il programma a ogni
             * ricalcolo: qualunque cosa ci si appoggi sopra sparisce al giro dopo.
             *
             * Prima non lo diceva nessuno — si posava un blocco, si tornava indietro, e non
             * c'era piu': una cancellazione silenziosa, cioe' il difetto peggiore possibile.
             * Ora il rifiuto e' esplicito e dice dove mettere il blocco davvero. */
            function paginaGenerataDalProgramma(page) {
                if (!page || !page.autoContinuazione) return false;
                appAlert('QUESTA PAGINA LA COSTRUISCE L\'APP.\n\nE\' il seguito di un blocco troppo lungo per una pagina sola, e viene rifatta da capo a ogni modifica: un blocco appoggiato qui sparirebbe al primo ricalcolo.\n\nMettilo sulla pagina di origine — quella con la riga tratteggiata dell\'interruzione — oppure su una pagina tua, aggiunta dalla striscia in basso.');
                return true;
            }

            function inserisciBloccoInPagina(page, block, pos) {
                // La stessa porta chiusa, ma senza avviso: qui ci si arriva anche trascinando, e
                // il chiamante ha gia' il suo modo di dire che il piazzamento non e' andato.
                if (page && page.autoContinuazione) return false;
                if (pos.newRow) {
                    page.rows.splice(pos.rowIndex, 0, { id: nuovoIdEditor('r'), blocks: [block] });
                    return true;
                } else if (pos.stackInto) {
                    const rigaDest = page.rows[pos.stackInto.rowIndex];
                    if (!rigaDest || rigaHaBloccoGenuinamenteBloccato(page, rigaDest)) return false;
                    const entry = rigaDest.blocks[pos.stackInto.columnIndex];
                    if (!entry) return false;
                    // Un blocco flowable (Allegato Formule/Tabella Dettagliata) non può MAI entrare
                    // in uno stack, né come nuovo arrivato né come voce già impilata sotto cui
                    // infilarne un'altra (richiesto esplicitamente dopo un audit: un blocco così
                    // dentro uno stack diventa invisibile al sistema di continuazione per categoria
                    // — sincronizzaFlussiBlocchiLunghi/impaginaBlocchiSuPagineFisiche cercano solo
                    // "ultima riga, un blocco solo, non impilato" — stesso identico bug del blocco
                    // vuoto già risolto altrove, qui semplicemente raggiungibile trascinando). Si
                    // rifiuta il piazzamento, stesso schema già usato per le righe bloccate: il
                    // chiamante mostra il fallback (vedi terminaTrascinamentoEditor).
                    if (BLOCCHI_FLOWABLE.has(block.type)) return false;
                    if (entry.stack) {
                        if (entry.stack.some(it => BLOCCHI_FLOWABLE.has(it.type))) return false;
                        entry.stack.push(block);
                    } else if (BLOCCHI_FLOWABLE.has(entry.type)) {
                        return false;
                    } else {
                        // Trasforma la voce singola in uno stack di due elementi: il blocco che
                        // c'era già (che mantiene le sue impostazioni scala/font/larghezza/
                        // allineamento) più quello appena trascinato, ora impilati nella STESSA
                        // colonna invece che affiancati in un'altra — è esattamente lo spazio
                        // verticale "sprecato" sotto un blocco corto a diventare finalmente utile.
                        const { colSpan, ...bloccoEsistenteSenzaColSpan } = entry;
                        rigaDest.blocks[pos.stackInto.columnIndex] = {
                            id: nuovoIdEditor('col'), colSpan,
                            stack: [bloccoEsistenteSenzaColSpan, block]
                        };
                    }
                    return true;
                } else {
                    const rigaDest = page.rows[pos.rowIndex];
                    if (!rigaDest || rigaHaBloccoGenuinamenteBloccato(page, rigaDest)) return false;
                    // Stesso divieto di cui sopra, qui per l'inserimento AFFIANCATO (non in stack):
                    // un blocco flowable deve restare SEMPRE l'unico blocco della sua riga (richiesto
                    // esplicitamente dopo un audit — bug trovato, non solo teorico: mancava qui, si
                    // poteva trascinare un blocco normale accanto a uno flowable già solo sulla sua
                    // riga, oppure trascinare un flowable accanto a un altro blocco, ottenendo una
                    // riga con più blocchi che nessuna delle due condizioni "ultima riga, un blocco
                    // solo" (sincronizzaFlussiBlocchiLunghi/impaginaBlocchiSuPagineFisiche/
                    // rangeFlowableOrigine) riconosce più — il blocco torna invisibile al sistema di
                    // continuazione per categoria, stesso identico bug del blocco vuoto). Si rifiuta
                    // se la riga di destinazione contiene già un flowable, O se il blocco che arriva è
                    // flowable e la riga di destinazione non è vuota.
                    const rigaHaGiaFlowable = rigaDest.blocks.some(b => BLOCCHI_FLOWABLE.has(b.type));
                    if (rigaHaGiaFlowable) return false;
                    if (BLOCCHI_FLOWABLE.has(block.type) && rigaDest.blocks.length > 0) return false;
                    rigaDest.blocks.splice(pos.insertIndex, 0, block);
                    return true;
                }
            }

            // Interrogare il DOM (getBoundingClientRect) è un reflow sincrono: farlo ad ogni
            // pointermove (anche 100+ volte al secondo) è la causa vera dello scatto durante il
            // trascinamento. Durante un drag il layout della pagina non cambia (nessun re-render
            // avviene finché non si rilascia), quindi i rettangoli di righe/blocchi si catturano
            // UNA SOLA VOLTA all'avvio (vedi avviaTrascinamentoEditor) e da qui in poi è pura
            // aritmetica sui numeri già in memoria: zero reflow per frame durante il movimento.
            let editorDragRowsCache = null;
            let editorDragCanvasRect = null;
            let editorDragSourceRect = null;
            // Stato aggiuntivo per il semaforo predittivo (valutaQualitaPiazzamento): il limite
            // fisico di pagina si sposta con lo scroll come le righe, quindi va ricatturato insieme
            // a loro in catturaRettangoliEditor, non misurato una tantum all'avvio del drag. Tipo/
            // scala del blocco trascinato e la sua dimensione naturale (per un blocco 'new'/
            // 'spostamento', che non ha un editorDragSourceRect) si risolvono invece una sola volta
            // in avviaTrascinamentoEditor, vedi misuraDimensioneNaturaleGhost.
            let editorDragLimiteY = null;
            let editorDragBlockType = null;
            let editorDragScaleAttuale = 1;
            let editorDragNaturalSize = null;

            function catturaRettangoliEditor() {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) { editorDragRowsCache = []; editorDragCanvasRect = null; return; }
                editorDragCanvasRect = canvas.getBoundingClientRect();
                const linea = document.getElementById('templateEditorA4Line');
                editorDragLimiteY = linea ? linea.getBoundingClientRect().top : null;
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                editorDragRowsCache = Array.from(canvas.querySelectorAll('.tpl-editor-row')).map(rowEl => ({
                    el: rowEl,
                    rect: rowEl.getBoundingClientRect(),
                    // Riga bloccata (richiesto esplicitamente): l'indicatore di piazzamento durante
                    // il trascinamento non deve MAI proporre di affiancare o impilare un blocco
                    // dentro una riga che ne contiene già uno bloccato — altrimenti si vedrebbe
                    // un'anteprima di un piazzamento che poi verrebbe comunque rifiutato al rilascio
                    // (vedi inserisciBloccoInPagina), inconsistente e confusionario. Un elemento
                    // ".tpl-editor-row-group" rappresenta più righe insieme (rowSpan): si considera
                    // bloccato se ANCHE UNA SOLA delle righe che raggruppa lo è.
                    bloccata: (() => {
                        if (!page) return false;
                        const rowId = rowEl.dataset.rowId;
                        const count = parseInt(rowEl.dataset.rowsCount || '1', 10);
                        const startIdx = page.rows.findIndex(r => r.id === rowId);
                        if (startIdx < 0) return false;
                        for (let k = 0; k < count; k++) {
                            const r = page.rows[startIdx + k];
                            if (r && rigaHaBloccoGenuinamenteBloccato(page, r)) return true;
                        }
                        return false;
                    })(),
                    // Le colonne NON si allungano più per riempire la riga (vedi align-items:flex-start
                    // sulla riga stessa, sotto): il riquadro di ogni colonna è già alto quanto il suo
                    // contenuto vero, punto e basta. Lo spazio "sprecato" quando una colonna è più
                    // corta delle altre non è più dentro al suo riquadro (niente più sfondo bianco
                    // che si allunga a vuoto) ma resta comunque visibile come area libera nella riga,
                    // tra il fondo di questa colonna e il fondo della riga (quello della colonna più
                    // alta) — è lì che si può "impilare" un altro blocco, vedi calcolaPosizioneDropEditor.
                    blockRects: Array.from(rowEl.querySelectorAll('.tpl-editor-block')).map(colEl => ({
                        rect: colEl.getBoundingClientRect()
                    }))
                }));
            }

            /** Dove finirebbe il blocco se lo lasciassi cadere in (clientX, clientY): dentro una
             * riga esistente — affiancato agli altri blocchi come nuova colonna, oppure IMPILATO
             * sotto una colonna già esistente se quella colonna ha spazio verticale sprecato (più
             * corta della riga: si rilascia proprio in quello spazio vuoto) — oppure come nuova riga
             * sopra/sotto quella su cui ci si trova (fascia stretta in cima/fondo di ogni riga,
             * SOLO per non perdere mai la possibilità di creare una riga nuova, senza però "risucchiare"
             * il blocco lì appena ci si avvicina al bordo). Mai posizione assoluta a piacere: resta
             * sempre e solo una di queste tre destinazioni ordinate — RIPENSAMENTO RADICALE
             * (richiesto esplicitamente): un solo comportamento uguale per tutti i blocchi, niente
             * più doppio livello "magnetico globale / libero per singolo blocco" da tenere a mente. */
            function calcolaPosizioneDropEditor(clientX, clientY) {
                const rows = editorDragRowsCache;
                if (!rows) return null;
                if (rows.length === 0) return { rowIndex: 0, insertIndex: 0, newRow: true };
                const FRAZIONE_ZONA_RIGA = 0.12;

                for (let i = 0; i < rows.length; i++) {
                    const rect = rows[i].rect;
                    if (clientY < rect.top) return { rowIndex: i, insertIndex: 0, newRow: true };
                    if (clientY <= rect.bottom) {
                        // Riga bloccata: mai affiancare né impilare qui (vedi bloccata calcolato in
                        // catturaRettangoliEditor) — l'unica destinazione possibile resta una riga
                        // NUOVA sopra o sotto, a seconda di quale metà della riga si è sfiorata, così
                        // l'anteprima durante il trascinamento corrisponde sempre esattamente a quello
                        // che poi succede davvero al rilascio (vedi inserisciBloccoInPagina).
                        if (rows[i].bloccata) {
                            const metaRiga = rect.top + rect.height / 2;
                            // bloccataAdiacente: il semaforo predittivo (valutaQualitaPiazzamento)
                            // lo legge per forzare subito il rosso — qui il motivo non è lo spazio,
                            // è il lucchetto, quindi nessun calcolo di restringimento ha senso.
                            return clientY < metaRiga
                                ? { rowIndex: i, insertIndex: 0, newRow: true, bloccataAdiacente: true }
                                : { rowIndex: i + 1, insertIndex: 0, newRow: true, bloccataAdiacente: true };
                        }
                        const topZone = rect.top + rect.height * FRAZIONE_ZONA_RIGA;
                        const bottomZone = rect.bottom - rect.height * FRAZIONE_ZONA_RIGA;
                        if (clientY < topZone) return { rowIndex: i, insertIndex: 0, newRow: true };
                        if (clientY > bottomZone) return { rowIndex: i + 1, insertIndex: 0, newRow: true };
                        // Zona "impila qui sotto": lo spazio libero tra il fondo di QUESTA colonna
                        // (ormai alta solo quanto il suo contenuto, non più "stretch") e il fondo
                        // della riga (quello della colonna più alta) — sotto una soglia minima di
                        // qualche pixel non vale la pena proporlo (colonne di altezza quasi uguale).
                        const colonneStack = rows[i].blockRects;
                        const SOGLIA_MIN_SPAZIO = 14;
                        for (let c = 0; c < colonneStack.length; c++) {
                            const col = colonneStack[c];
                            if (rect.bottom - col.rect.bottom < SOGLIA_MIN_SPAZIO) continue;
                            if (clientX >= col.rect.left && clientX <= col.rect.right &&
                                clientY > col.rect.bottom && clientY <= rect.bottom) {
                                return { rowIndex: i, newRow: false, stackInto: { rowIndex: i, columnIndex: c } };
                            }
                        }
                        const colonne = rows[i].blockRects;
                        let insertIndex = colonne.length;
                        for (let j = 0; j < colonne.length; j++) {
                            if (clientX < colonne[j].rect.left + colonne[j].rect.width / 2) { insertIndex = j; break; }
                        }
                        return { rowIndex: i, insertIndex, newRow: false };
                    }
                }
                return { rowIndex: rows.length, insertIndex: 0, newRow: true };
            }

            /** Altezza stimata che il blocco trascinato assumerebbe a una data larghezza target —
             * stessa idea approssimativa già usata più sotto per largStimata (il contenuto reflow-a
             * in modo grosso modo inversamente proporzionale alla larghezza): non è fisicamente
             * esatta per ogni tipo di blocco, ma è solo un'anteprima — l'algoritmo reale al drop
             * (gestisciInserimentoBloccoNuovoConOverflow) misura per davvero. */
            function stimaAltezzaPerLarghezza(targetWidth) {
                let baseW, baseH;
                if (editorDragSourceRect) { baseW = editorDragSourceRect.width; baseH = editorDragSourceRect.height; }
                else if (editorDragNaturalSize) { baseW = editorDragNaturalSize.width; baseH = editorDragNaturalSize.height; }
                else return 100;
                if (!baseW || !targetWidth) return baseH;
                return baseH * (baseW / targetWidth);
            }

            /** Stima ECONOMICA (pura aritmetica su editorDragRowsCache/editorDragLimiteY già in
             * cache, zero DOM) di quanto "pulito" sarebbe il piazzamento pos — usata per il
             * semaforo live durante il drag (richiesto esplicitamente: un vero sistema predittivo,
             * non più solo un'area gialla generica). NON è l'algoritmo reale di "Adatta" (vedi
             * gestisciInserimentoBloccoNuovoConOverflow, che rimisura dal vivo fino a 14 volte):
             * qui ci si può permettere solo una singola approssimazione lineare per frame — resta
             * comunque solo un'anteprima, l'algoritmo reale (invariato) è l'unico eseguito davvero
             * al rilascio. Il rosso non blocca mai il drop (richiesto esplicitamente): serve solo
             * ad avvisare. */
            function valutaQualitaPiazzamento(pos) {
                if (!pos) return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };
                if (pos.bloccataAdiacente) return { livello: 'rosso', percentoStimato: 0, bloccataAdiacente: true };
                if (editorDragBlockType && BLOCCHI_SENZA_SCALA.has(editorDragBlockType)) {
                    return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };
                }
                if (editorDragLimiteY == null) return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };

                const rows = editorDragRowsCache || [];
                let neededH, neededW, topY, spazioDisponibile;

                if (pos.stackInto) {
                    const rigaInfo = rows[pos.stackInto.rowIndex];
                    const col = rigaInfo && rigaInfo.blockRects[pos.stackInto.columnIndex];
                    if (!rigaInfo || !col) return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };
                    neededW = col.rect.width;
                    neededH = stimaAltezzaPerLarghezza(neededW);
                    topY = col.rect.bottom;
                    spazioDisponibile = rigaInfo.rect.bottom - col.rect.bottom;
                    // Se la riga bersaglio sfora già la pagina, impilarci dentro non può mai essere pulito.
                    if (rigaInfo.rect.bottom > editorDragLimiteY + 0.5) spazioDisponibile = Math.min(spazioDisponibile, 0);
                } else if (pos.newRow) {
                    const larghezzaRiga = rows.length ? rows[0].rect.width : (editorDragCanvasRect ? editorDragCanvasRect.width : 0);
                    neededW = larghezzaRiga;
                    neededH = stimaAltezzaPerLarghezza(neededW);
                    topY = pos.rowIndex < rows.length ? rows[pos.rowIndex].rect.top
                         : (rows.length ? rows[rows.length - 1].rect.bottom : 0);
                    spazioDisponibile = editorDragLimiteY - topY;
                } else {
                    const rigaInfo = rows[pos.rowIndex];
                    if (!rigaInfo) return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };
                    const blockRects = rigaInfo.blockRects;
                    neededW = (editorDragSourceRect ? editorDragSourceRect.width : null) || (rigaInfo.rect.width / (blockRects.length + 1));
                    const altezzaBlocco = stimaAltezzaPerLarghezza(neededW);
                    topY = rigaInfo.rect.top;
                    spazioDisponibile = editorDragLimiteY - topY;
                    neededH = Math.max(rigaInfo.rect.height, altezzaBlocco);
                }

                const overflowPx = neededH - spazioDisponibile;
                if (overflowPx <= MARGINE_SICUREZZA_PX) return { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };

                // Stessa forma della riduzione reale (vedi gestisciInserimentoBloccoNuovoConOverflow),
                // applicata una sola volta invece che iterativamente: sufficiente per un'anteprima.
                const fattore = Math.max(0, (neededH - overflowPx - MARGINE_SICUREZZA_PX) / neededH);
                const scalaMin = scalaMinimaBlocco(editorDragBlockType);
                const scalaStimata = editorDragScaleAttuale * fattore;
                const percentoStimato = Math.round((1 - fattore) * 100);

                if (scalaStimata < scalaMin - 0.001) return { livello: 'rosso', percentoStimato, bloccataAdiacente: false };
                if (percentoStimato <= SOGLIA_RESTRINGIMENTO_OK * 100) return { livello: 'verde', percentoStimato, bloccataAdiacente: false };
                if (percentoStimato <= SOGLIA_RESTRINGIMENTO_LIMITE * 100) return { livello: 'giallo', percentoStimato, bloccataAdiacente: false };
                return { livello: 'rosso', percentoStimato, bloccataAdiacente: false };
            }

            // Raggio di aggancio del "magnete" di piazzamento: più largo dei 5px di SOGLIA_MAGNETE_PX
            // (il magnete dei manici di ridimensionamento, che aggancia un bordo pixel-preciso) perché
            // qui si sceglie tra ZONE discrete di una riga, non un singolo bordo — stesso spirito,
            // soglia più larga per lo stesso motivo per cui il bersaglio è più "largo".
            const SOGLIA_MAGNETE_DROP_PX = 18;

            /** Se pos valuta non-verde, cerca — SOLO nella riga coinvolta e al suo bordo con quella
             * immediatamente sopra/sotto, MAI un giro su tutte le righe della pagina (il magnete deve
             * restare "vicino", non diventare una ricerca del miglior punto ovunque, richiesto
             * esplicitamente) — un'alternativa che valuterebbe verde ed è entro SOGLIA_MAGNETE_DROP_PX
             * dal puntatore attuale, e se la trova aggancia il ghost lì. */
            function applicaMagneteDropEditor(pos, clientX, clientY) {
                const qualitaBase = valutaQualitaPiazzamento(pos);
                if (qualitaBase.livello === 'verde') return { pos, qualita: qualitaBase, agganciato: false };
                const rows = editorDragRowsCache;
                if (!rows || !rows.length) return { pos, qualita: qualitaBase, agganciato: false };

                const rigaIdxRif = pos.stackInto ? pos.stackInto.rowIndex : Math.min(pos.rowIndex, rows.length - 1);
                const rigaRif = rows[rigaIdxRif];
                if (!rigaRif) return { pos, qualita: qualitaBase, agganciato: false };

                const SOGLIA_MIN_SPAZIO_MAGNETE = 14; // stessa soglia di calcolaPosizioneDropEditor
                const candidati = [];
                rigaRif.blockRects.forEach((col, c) => {
                    if (rigaRif.rect.bottom - col.rect.bottom < SOGLIA_MIN_SPAZIO_MAGNETE) return;
                    const centroX = (col.rect.left + col.rect.right) / 2;
                    const centroY = col.rect.bottom + (rigaRif.rect.bottom - col.rect.bottom) / 2;
                    const dist = Math.hypot(clientX - centroX, clientY - centroY);
                    if (dist <= SOGLIA_MAGNETE_DROP_PX) {
                        candidati.push({ dist, pos: { rowIndex: rigaIdxRif, newRow: false, stackInto: { rowIndex: rigaIdxRif, columnIndex: c } } });
                    }
                });
                const distSopra = Math.abs(clientY - rigaRif.rect.top);
                if (distSopra <= SOGLIA_MAGNETE_DROP_PX) candidati.push({ dist: distSopra, pos: { rowIndex: rigaIdxRif, insertIndex: 0, newRow: true } });
                const distSotto = Math.abs(clientY - rigaRif.rect.bottom);
                if (distSotto <= SOGLIA_MAGNETE_DROP_PX) candidati.push({ dist: distSotto, pos: { rowIndex: rigaIdxRif + 1, insertIndex: 0, newRow: true } });

                candidati.sort((a, b) => a.dist - b.dist);
                for (const c of candidati) {
                    const q = valutaQualitaPiazzamento(c.pos);
                    if (q.livello === 'verde') return { pos: c.pos, qualita: q, agganciato: true };
                }
                return { pos, qualita: qualitaBase, agganciato: false };
            }

            const COLORE_QUALITA_DROP = { verde: 'var(--success)', giallo: 'var(--warning)', rosso: 'var(--danger)' };
            const ICONA_QUALITA_DROP = { verde: 'check', giallo: 'alert', rosso: 'alert' };

            function messaggioQualitaDrop(qualita, testoBase) {
                if (qualita.bloccataAdiacente) return `${testoBase} — riga bloccata qui accanto`;
                if (qualita.livello === 'giallo') return `${testoBase} — richiede un piccolo adattamento (~${qualita.percentoStimato}%)`;
                if (qualita.livello === 'rosso') return `${testoBase} — non entra bene (${qualita.percentoStimato}% di riduzione stimata)`;
                return testoBase;
            }

            /** Applica lo stato del semaforo (colore + icona) ai quattro elementi del drop-indicator
             * — SEMPRE un remove incondizionato delle classi precedenti prima di aggiungere quella
             * corrente: altrimenti lo stato del frame prima resterebbe appiccicato passando ad
             * esempio da rosso a verde senza mai transitare per "nessuna classe". Il rosso qui è
             * solo un avviso: non impedisce mai il drop (richiesto esplicitamente), lo segnala e
             * basta — icona lucchetto riusata da quella già mostrata sui blocchi bloccati altrove. */
            function applicaStatoQualitaGhost(ind, lbl, forma, zona, qualita, testoBase) {
                const livello = (qualita && qualita.livello) || 'verde';
                const classiStato = ['tpl-ghost-verde', 'tpl-ghost-giallo', 'tpl-ghost-rosso'];
                [forma, zona, ind, lbl].forEach(el => { if (el) { el.classList.remove(...classiStato); el.classList.add('tpl-ghost-' + livello); } });
                const colore = COLORE_QUALITA_DROP[livello] || 'var(--accent)';
                ind.style.background = colore;
                lbl.style.background = colore;
                const icona = (qualita && qualita.bloccataAdiacente) ? 'lock' : ICONA_QUALITA_DROP[livello];
                lbl.innerHTML = `<svg class="ico" style="width:11px;height:11px;vertical-align:-2px;margin-right:4px;"><use href="#i-${icona}"/></svg>${escapeHtmlDidascalia(messaggioQualitaDrop(qualita, testoBase))}`;
            }

            /** Indicatore di piazzamento durante il drag: non più una semplice barretta colorata
             * (poco leggibile, come segnalato) ma tre segnali insieme — (1) la riga coinvolta si
             * illumina con un contorno tratteggiato, (2) la barra è più spessa e pulsante, (3) una
             * "pillola" di testo spiega a parole cosa succederebbe lasciando il blocco lì. Dalla
             * versione col semaforo predittivo (richiesto esplicitamente: un vero sistema che
             * capisce se il piazzamento è pulito, non più solo un'area gialla generica) i quattro
             * elementi cambiano anche colore/icona in base a qualita (vedi valutaQualitaPiazzamento
             * e applicaStatoQualitaGhost). */
            function mostraIndicatoreDropEditor(pos, qualita) {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas || !editorDragCanvasRect) return;
                if (!qualita) qualita = { livello: 'verde', percentoStimato: 0, bloccataAdiacente: false };
                let ind = document.getElementById('templateEditorDropIndicator');
                if (!ind) {
                    ind = document.createElement('div');
                    ind.id = 'templateEditorDropIndicator';
                    ind.style.position = 'absolute';
                    ind.style.borderRadius = '3px';
                    ind.style.zIndex = '5';
                    ind.style.pointerEvents = 'none';
                    canvas.style.position = 'relative';
                    canvas.appendChild(ind);
                }
                let lbl = document.getElementById('templateEditorDropLabel');
                if (!lbl) {
                    lbl = document.createElement('div');
                    lbl.id = 'templateEditorDropLabel';
                    canvas.appendChild(lbl);
                }
                // Rettangolo tratteggiato che evidenzia ESATTAMENTE lo spazio libero (fondo colonna
                // → fondo riga) in cui il blocco verrebbe impilato — solo per pos.stackInto, creato
                // qui e nascosto/rimosso negli altri casi (vedi sotto e nascondiIndicatoreDropEditor).
                // Condivide la classe .tpl-editor-drop-ghost-shape con "forma" (sotto): stesso alone
                // colorato in base allo stato, un solo posto dove definirlo in CSS.
                let zona = document.getElementById('templateEditorStackZoneOverlay');
                if (!zona) {
                    zona = document.createElement('div');
                    zona.id = 'templateEditorStackZoneOverlay';
                    zona.className = 'tpl-editor-drop-ghost-shape';
                    zona.style.position = 'absolute';
                    zona.style.zIndex = '4';
                    zona.style.pointerEvents = 'none';
                    canvas.appendChild(zona);
                }
                // Riquadro fantasma (richiesto esplicitamente): mostra la forma/dimensione VERA che
                // il blocco assumerà una volta rilasciato, non solo la sottile linea di inserimento
                // — per pos.stackInto questo ruolo lo svolge già "zona" sopra (nascosto qui, non
                // serve un secondo rettangolo sovrapposto).
                let forma = document.getElementById('templateEditorDropGhostShape');
                if (!forma) {
                    forma = document.createElement('div');
                    forma.id = 'templateEditorDropGhostShape';
                    forma.className = 'tpl-editor-drop-ghost-shape';
                    canvas.appendChild(forma);
                }
                const canvasRect = editorDragCanvasRect;
                const rows = editorDragRowsCache || [];
                // Dimensioni previste: un blocco "existing" mantiene la sua dimensione attuale
                // (misurata all'avvio del trascinamento, vedi editorDragSourceRect) ovunque lo si
                // sposti; un blocco NUOVO dalla palette non ha ancora una dimensione reale, quindi
                // si stima — a piena riga se diventa una nuova riga (è così che nasce, colSpan
                // pieno), altrimenti proporzionalmente diviso tra i blocchi già presenti.
                const altezzaBloccoTrascinato = editorDragSourceRect ? editorDragSourceRect.height : 100;
                const larghezzaBloccoTrascinato = editorDragSourceRect ? editorDragSourceRect.width : null;

                // La riga coinvolta si evidenzia sempre (quella su cui si affianca, oppure — per
                // una nuova riga — quella sopra/sotto a cui ci si sta agganciando), le altre no.
                rows.forEach(r => r.el && r.el.classList.remove('tpl-editor-row-drop-target'));
                zona.style.display = 'none';
                forma.style.display = 'none';

                if (pos.newRow) {
                    let y, testo, primaDiRiga;
                    if (pos.rowIndex < rows.length) {
                        y = rows[pos.rowIndex].rect.top - canvasRect.top - 5;
                        if (rows[pos.rowIndex].el) rows[pos.rowIndex].el.classList.add('tpl-editor-row-drop-target');
                        testo = pos.rowIndex === 0 ? '＋ Nuova riga in cima alla pagina' : '＋ Nuova riga qui, tra le due righe';
                        primaDiRiga = true;
                    } else if (rows.length > 0) {
                        y = rows[rows.length - 1].rect.bottom - canvasRect.top + 3;
                        rows[rows.length - 1].el && rows[rows.length - 1].el.classList.add('tpl-editor-row-drop-target');
                        testo = '＋ Nuova riga in fondo alla pagina';
                        primaDiRiga = false;
                    } else {
                        y = 0;
                        testo = '＋ Nuova riga (prima di questa pagina)';
                        primaDiRiga = true;
                    }
                    ind.style.left = '0'; ind.style.width = '100%'; ind.style.height = '6px'; ind.style.top = y + 'px';
                    applicaStatoQualitaGhost(ind, lbl, forma, zona, qualita, testo);
                    lbl.style.top = Math.max(0, y - 26) + 'px';
                    lbl.style.left = '50%';
                    lbl.style.transform = 'translateX(-50%)';
                    // Una nuova riga nasce sempre a piena larghezza (colSpan = cols): il riquadro
                    // fantasma occupa quindi tutta la larghezza del foglio, nel gap sopra/sotto la
                    // riga a cui ci si sta agganciando.
                    forma.style.display = 'block';
                    forma.style.left = '0px';
                    forma.style.width = '100%';
                    forma.style.height = altezzaBloccoTrascinato + 'px';
                    forma.style.top = (primaDiRiga ? Math.max(0, y - altezzaBloccoTrascinato) : y) + 'px';
                } else if (pos.stackInto) {
                    const rowInfo = rows[pos.stackInto.rowIndex];
                    if (!rowInfo) return;
                    if (rowInfo.el) rowInfo.el.classList.add('tpl-editor-row-drop-target');
                    const col = rowInfo.blockRects[pos.stackInto.columnIndex];
                    if (!col) return;
                    // Il rettangolo tratteggiato copre TUTTO lo spazio libero vero (fondo di questa
                    // colonna → fondo della riga, cioè della colonna più alta) — non solo una sottile
                    // barra — così si vede esattamente quanto spazio si sta per riempire.
                    zona.style.display = 'block';
                    zona.style.top = (col.rect.bottom - canvasRect.top) + 'px';
                    zona.style.left = (col.rect.left - canvasRect.left) + 'px';
                    zona.style.width = col.rect.width + 'px';
                    zona.style.height = (rowInfo.rect.bottom - col.rect.bottom) + 'px';
                    ind.style.top = (col.rect.bottom - canvasRect.top + 3) + 'px';
                    ind.style.height = '6px';
                    ind.style.width = col.rect.width + 'px';
                    ind.style.left = (col.rect.left - canvasRect.left) + 'px';
                    applicaStatoQualitaGhost(ind, lbl, forma, zona, qualita, '⬇ Impila sotto questo blocco (spazio libero)');
                    lbl.style.top = (col.rect.bottom - canvasRect.top + 12) + 'px';
                    lbl.style.left = (col.rect.left - canvasRect.left + col.rect.width / 2) + 'px';
                    lbl.style.transform = 'translateX(-50%)';
                } else {
                    const rowInfo = rows[pos.rowIndex];
                    if (!rowInfo) return;
                    if (rowInfo.el) rowInfo.el.classList.add('tpl-editor-row-drop-target');
                    const rowRect = rowInfo.rect;
                    const blockRects = rowInfo.blockRects;
                    let x, lato, edgeX;
                    if (pos.insertIndex < blockRects.length) {
                        edgeX = blockRects[pos.insertIndex].rect.left - canvasRect.left;
                        x = edgeX - 5;
                        lato = pos.insertIndex === 0 ? 'a sinistra di tutti' : 'in mezzo';
                    } else if (blockRects.length > 0) {
                        edgeX = blockRects[blockRects.length - 1].rect.right - canvasRect.left;
                        x = edgeX + 3;
                        lato = 'a destra di tutti';
                    } else {
                        edgeX = rowRect.left - canvasRect.left;
                        x = edgeX;
                        lato = 'qui';
                    }
                    ind.style.top = (rowRect.top - canvasRect.top) + 'px';
                    ind.style.height = rowRect.height + 'px';
                    ind.style.width = '6px';
                    ind.style.left = x + 'px';
                    applicaStatoQualitaGhost(ind, lbl, forma, zona, qualita, `↔ Affianca ${lato}, stessa riga`);
                    lbl.style.top = Math.max(0, (rowRect.top - canvasRect.top) - 26) + 'px';
                    lbl.style.left = x + 'px';
                    lbl.style.transform = 'none';
                    // Larghezza prevista: un blocco "existing" mantiene la sua (larghezzaBloccoTrascinato);
                    // uno nuovo dalla palette non ce l'ha ancora — si stima proporzionalmente diviso
                    // tra sé e i blocchi già presenti nella riga (non è ESATTAMENTE come si comporterà
                    // il flex una volta inserito, ma comunica bene l'ingombro relativo).
                    const largStimata = larghezzaBloccoTrascinato || (rowRect.width / (blockRects.length + 1));
                    const largForma = Math.min(largStimata, rowRect.width);
                    const altForma = Math.max(altezzaBloccoTrascinato, rowRect.height);
                    forma.style.display = 'block';
                    forma.style.top = (rowRect.top - canvasRect.top) + 'px';
                    forma.style.height = altForma + 'px';
                    forma.style.width = largForma + 'px';
                    forma.style.left = Math.max(0, (pos.insertIndex < blockRects.length ? edgeX - largForma : edgeX)) + 'px';
                }
            }
            function nascondiIndicatoreDropEditor() {
                const ind = document.getElementById('templateEditorDropIndicator');
                if (ind) ind.remove();
                const lbl = document.getElementById('templateEditorDropLabel');
                if (lbl) lbl.remove();
                const zona = document.getElementById('templateEditorStackZoneOverlay');
                if (zona) zona.remove();
                const forma = document.getElementById('templateEditorDropGhostShape');
                if (forma) forma.remove();
                (editorDragRowsCache || []).forEach(r => r.el && r.el.classList.remove('tpl-editor-row-drop-target'));
            }

            /** Gli elementi flottanti dell'editor template (menu blocco, etichetta maniglia, ghost
             * di trascinamento, anteprima hover della palette) sono tutti `position:fixed` agganciati
             * a `document.body` — che però, quando la modale è in Fullscreen nativo del browser, non
             * viene più disegnato (solo l'elemento in fullscreen e i suoi discendenti lo sono): è
             * il bug segnalato ("non compare quella finestra di dialogo con il blocco"). Agganciandoli
             * invece dentro l'elemento in fullscreen restano visibili — e le coordinate calcolate
             * come "fixed rispetto al viewport" restano comunque corrette perché, a schermo intero,
             * la modale occupa esattamente tutto il viewport (vedi CSS .tpl-editor-fullscreen). */
            function hostFloatingUiEditor() {
                return document.fullscreenElement || document.body;
            }
            /** Anteprima REALE del blocco trascinato, da mostrare nel ghost quando "morfa" sopra il
             * foglio (richiesto esplicitamente: deve diventare l'effettivo blocco di info) — stesso
             * motore di rendering usato per il blocco vero (buildBlockContentHtml), solo scalato in
             * miniatura. Per un blocco NUOVO dalla palette di tipo "Foto prova"/"Inquadramento" non
             * è possibile (dipendono dalla posizione finale nel template, non ancora nota mentre si
             * trascina): in quel caso, come per i dati mancanti, si ricade su un segnaposto
             * icona+etichetta invece di lasciare la card vuota. Ritorna anche tipo/blockObj (non
             * solo l'HTML): servono a avviaTrascinamentoEditor per risolvere scala attuale e tipo
             * del blocco trascinato senza rifare da capo la stessa risoluzione (vedi
             * valutaQualitaPiazzamento). Unico call-site: avviaTrascinamentoEditor. */
            function costruisciContenutoGhostTrascinamento(source) {
                const ctx = templateEditorState.ctx;
                let tipo = null, blockObj = null;
                if (source.kind === 'existing') {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    blockObj = page ? trovaBloccoPerId(page, source.blockId) : null;
                    if (blockObj) tipo = blockObj.type;
                } else if (source.kind === 'spostamento') {
                    // Il blocco in spostamento non sta più su nessuna pagina, quindi trovaBloccoPerId non
                    // lo troverebbe: l'oggetto ce l'abbiamo già, e con lui l'anteprima vera —
                    // con le sue larghezze, il suo carattere, le sue impostazioni.
                    const spost = bloccoInSpostamento();
                    if (spost) { blockObj = spost.blocco; tipo = spost.tipo; }
                } else {
                    tipo = source.blockType;
                }
                let contenuto = '';
                const posizioneNonNota = source.kind === 'new' && (tipo === 'immagine-libera' || tipo === 'inquadramento');
                if (ctx && tipo && !posizioneNonNota) {
                    try { contenuto = buildBlockContentHtml(tipo, ctx, blockObj) || ''; } catch (err) { contenuto = ''; }
                }
                if (contenuto) return { tipo, blockObj, html: `<div style="width:52.5mm; zoom:0.5;">${contenuto}</div>` };
                const def = tipo ? REPORT_BLOCK_TYPES[tipo] : null;
                if (!def) return { tipo, blockObj, html: '' };
                return { tipo, blockObj, html: `<div style="padding:16px; text-align:center;"><svg class="ico" style="width:26px; height:26px; color:var(--accent-ink);"><use href="#i-${def.icon}"/></svg><div style="margin-top:6px; font-size:10px; font-weight:700; color:var(--text-main);">${escapeHtmlDidascalia(def.label)}</div></div>` };
            }
            /** Misura UNA VOLTA, offscreen e senza i vincoli di dimensione del ghost mostrato a
             * video (.tpl-editor-drag-ghost-card è width:150px;max-height:210px;overflow:hidden —
             * inutilizzabile per una misura reale), la dimensione naturale del contenuto vero che
             * costruisciContenutoGhostTrascinamento ha già costruito: dà a un blocco NUOVO/in
             * spostamento (che non ha un editorDragSourceRect) una stima paragonabile a quella di
             * un blocco esistente, invece della vecchia proporzione a occhio — usata dal semaforo
             * predittivo (valutaQualitaPiazzamento/stimaAltezzaPerLarghezza). */
            function misuraDimensioneNaturaleGhost(contenutoHtml) {
                if (!contenutoHtml) return null;
                const probe = document.createElement('div');
                probe.style.cssText = 'position:absolute; visibility:hidden; left:-99999px; top:0; pointer-events:none;';
                probe.innerHTML = contenutoHtml;
                hostFloatingUiEditor().appendChild(probe);
                const rect = probe.getBoundingClientRect();
                probe.remove();
                if (rect.height < 1) return null;
                // Il ramo "contenuto vero" sopra avvolge sempre in <div style="width:52.5mm; zoom:0.5">:
                // si riporta a scala 1 raddoppiando, per essere confrontabile con editorDragSourceRect.
                return { width: rect.width * 2, height: rect.height * 2 };
            }
            let editorDragGhostMorphed = false;
            /** Crea il ghost UNA SOLA VOLTA all'avvio del trascinamento (contenuto statico per
             * tutta la durata del gesto: cambia solo la sua posizione e se è "morfato" o no, mai
             * la struttura interna) — evita di ricostruire l'HTML della mini-anteprima ad ogni
             * pointermove, che con un grafico o una tabella dentro sarebbe uno spreco inutile. */
            function creaGhostTrascinamentoEditor(label, contenutoHtml) {
                rimuoviGhostTrascinamentoEditor();
                const ghost = document.createElement('div');
                ghost.id = 'templateEditorDragGhost';
                ghost.className = 'tpl-editor-drag-ghost';
                ghost.innerHTML = `
                    <div class="tpl-editor-drag-ghost-chip">${escapeHtmlDidascalia(label)}</div>
                    <div class="tpl-editor-drag-ghost-card">
                        <div class="tpl-editor-drag-ghost-card-label">${escapeHtmlDidascalia(label)}</div>
                        <div class="tpl-editor-drag-ghost-card-body">${contenutoHtml}</div>
                    </div>
                `;
                hostFloatingUiEditor().appendChild(ghost);
                editorDragGhostMorphed = false;
            }
            /** Sposta il ghost (ad ogni pointermove, via requestAnimationFrame) e lo fa "morfare"
             * dalla semplice etichetta alla mini-card con l'anteprima reale non appena il puntatore
             * è sopra il foglio — così il blocco trascinato "diventa" visivamente quello che
             * rappresenterà una volta piazzato, come richiesto esplicitamente, e torna alla forma
             * semplice quando si è ancora sopra la palette o altri controlli fuori dal foglio. Solo
             * posizione/classe cambiano qui: leggero, sicuro da chiamare ad ogni frame. */
            function posizionaGhostTrascinamentoEditor(clientX, clientY) {
                const ghost = document.getElementById('templateEditorDragGhost');
                if (!ghost) return;
                ghost.style.left = (clientX + 14) + 'px';
                ghost.style.top = (clientY + 14) + 'px';
                const sopraFoglio = !!(editorDragCanvasRect && clientX >= editorDragCanvasRect.left - 20 && clientX <= editorDragCanvasRect.right + 20 && clientY >= editorDragCanvasRect.top - 40 && clientY <= editorDragCanvasRect.bottom + 40);
                if (sopraFoglio !== editorDragGhostMorphed) {
                    editorDragGhostMorphed = sopraFoglio;
                    ghost.classList.toggle('morphed', sopraFoglio);
                }
            }
            function rimuoviGhostTrascinamentoEditor() {
                const ghost = document.getElementById('templateEditorDragGhost');
                if (ghost) ghost.remove();
                editorDragGhostMorphed = false;
            }

            // pointermove spara anche 100+ volte al secondo: calcolare la posizione di drop ad
            // ogni evento significa un getBoundingClientRect() per ogni riga/blocco (reflow
            // sincrono forzato) ripetuto altrettante volte — "layout thrashing" che impianta la
            // UI e può far sembrare la finestra bloccata. Si coalescono gli eventi con
            // requestAnimationFrame: al massimo un ricalcolo per frame, come per qualunque drag
            // performante.
            let editorDragRafPending = false;
            let editorDragLastEvent = null;

            function avviaTrascinamentoEditor(e, source, label) {
                e.preventDefault();
                editorDragSource = source;
                editorDragLastPos = null;
                catturaRettangoliEditor();
                // Dimensione ORIGINALE del blocco trascinato — solo per uno "existing": un blocco
                // NUOVO dalla palette non esiste ancora da nessuna parte nel DOM, e comunque parte
                // sempre a piena larghezza di riga (vedi colSpan di default in
                // terminaTrascinamentoEditor), quindi non c'è nulla da misurare. Usata per dare al
                // riquadro fantasma la stessa identica forma che il blocco avrà una volta rilasciato
                // (richiesto esplicitamente).
                editorDragSourceRect = null;
                if (source.kind === 'existing') {
                    const srcEl = document.querySelector(`.tpl-editor-block[data-block-id="${source.blockId}"], .tpl-editor-stack-item[data-item-id="${source.blockId}"]`);
                    if (srcEl) editorDragSourceRect = srcEl.getBoundingClientRect();
                }
                // Stato per il semaforo predittivo (valutaQualitaPiazzamento): tipo/scala attuale
                // del blocco trascinato, e — solo se non è un 'existing' già misurato sopra — una
                // stima della sua dimensione naturale (vedi misuraDimensioneNaturaleGhost).
                const ghostInfo = costruisciContenutoGhostTrascinamento(source);
                editorDragBlockType = ghostInfo.tipo;
                editorDragScaleAttuale = ghostInfo.blockObj
                    ? (BLOCCHI_CON_FONT_REGOLABILE.has(ghostInfo.tipo) ? (ghostInfo.blockObj.rigaScale || 1) : (ghostInfo.blockObj.scale || 1))
                    : 1;
                editorDragNaturalSize = editorDragSourceRect ? null : misuraDimensioneNaturaleGhost(ghostInfo.html);
                creaGhostTrascinamentoEditor(label || '', ghostInfo.html);
                posizionaGhostTrascinamentoEditor(e.clientX, e.clientY);
                document.addEventListener('pointermove', gestisciSpostamentoEditor);
                document.addEventListener('pointerup', terminaTrascinamentoEditor, { once: true });
                avviaAutoScrollBordoEditor();
                document.body.classList.add('tpl-trascinamento-in-corso');
                // Il cestino compare solo per un blocco GIÀ sul foglio: trascinando un blocco nuovo
                // dalla palette non c'è niente da eliminare, e offrirlo sarebbe un comando che non
                // fa niente.
                // Il cestino compare anche col blocco in spostamento: se l'hai preso e non lo vuoi
                // più, buttarlo mentre lo trascini è il gesto più diretto che ci sia.
                if (source.kind === 'existing' || source.kind === 'spostamento') mostraCestinoTrascinamento();
                // PRESA: impulso breve. Il rilascio valido ne ha uno diverso (vedi
                // terminaTrascinamentoEditor) — due momenti distinti devono avere due sensazioni
                // distinte, altrimenti il dito non sa se ha afferrato o lasciato.
                triggerVibrate(15);
            }

            // ---- CESTINO DURANTE IL TRASCINAMENTO ----
            // Prima l'unico modo di togliere un blocco era selezionarlo, aprire il menu e trovare
            // "Rimuovi": tre passaggi per un'operazione che il dito sta già facendo (ha il blocco in
            // mano). Il cestino compare solo mentre trascini e solo per i blocchi che esistono già.
            let sopraCestinoTrascinamento = false;
            function mostraCestinoTrascinamento() {
                let cestino = document.getElementById('templateEditorCestino');
                if (!cestino) {
                    cestino = document.createElement('div');
                    cestino.id = 'templateEditorCestino';
                    cestino.className = 'tpl-editor-cestino';
                    cestino.innerHTML = '<svg class="ico"><use href="#i-trash"/></svg><span>Trascina qui per eliminare</span>';
                    hostFloatingUiEditor().appendChild(cestino);
                }
                sopraCestinoTrascinamento = false;
                cestino.classList.remove('attivo');
                cestino.hidden = false;
            }
            function nascondiCestinoTrascinamento() {
                const cestino = document.getElementById('templateEditorCestino');
                if (cestino) { cestino.hidden = true; cestino.classList.remove('attivo'); }
                sopraCestinoTrascinamento = false;
            }
            /** @returns {boolean} true se il puntatore è sopra il cestino in questo momento */
            function aggiornaCestinoTrascinamento(x, y) {
                const cestino = document.getElementById('templateEditorCestino');
                if (!cestino || cestino.hidden) { sopraCestinoTrascinamento = false; return false; }
                const r = cestino.getBoundingClientRect();
                const dentro = x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
                if (dentro !== sopraCestinoTrascinamento) {
                    sopraCestinoTrascinamento = dentro;
                    cestino.classList.toggle('attivo', dentro);
                    // Vibrazione all'INGRESSO nel cestino, una volta sola: entrare in una zona che
                    // distrugge deve farsi sentire, ma non deve ronzare finché ci resti sopra.
                    if (dentro) triggerVibrate(25);
                }
                return dentro;
            }

            /** Auto-scroll ai bordi durante lo spostamento di un blocco: la visuale NON scorre da
             * sola mentre si trascina in mezzo al canvas, solo quando il puntatore si avvicina al
             * bordo del viewport — e in quel caso scorre con continuità finché il puntatore resta
             * lì, non solo a scatti a ogni movimento del dito/mouse (per questo un intervallo fisso,
             * non un semplice controllo dentro gestisciSpostamentoEditor: quello scatta solo sui
             * pointermove, che smettono di arrivare se il puntatore resta fermo sul bordo). */
            let editorAutoScrollInterval = null;
            /** Auto-scroll generico ai bordi del viewport dell'editor (richiesto esplicitamente:
             * prima esisteva solo per il trascinamento di un blocco intero — vedi
             * avviaAutoScrollBordoEditor sotto — non per le sue maniglie di ridimensionamento, che
             * restavano irraggiungibili quando un blocco troppo alto sforava sotto il bordo visibile
             * del canvas). `leggiUltimoEvento` ritorna l'ultimo evento pointer noto (o null per
             * fermarsi silenziosamente, es. gesto già finito) — ogni chiamante tiene il proprio stato
             * di "quale gesto è in corso" e lo passa qui invece di condividerlo, così un trascinamento
             * blocco e un ridimensionamento maniglia non si confondono a vicenda. `suOgniScroll`
             * (opzionale) gira DOPO lo scroll, per chi deve ricalcolare qualcosa che dipende dalle
             * coordinate schermo reali (il drop-target del drag&drop); le maniglie di ridimensionamento
             * non ne hanno bisogno, il browser continua a mandare pointermove veri durante lo scroll. */
            function avviaAutoScrollViewportEditor(leggiUltimoEvento, suOgniScroll) {
                if (editorAutoScrollInterval) return;
                editorAutoScrollInterval = setInterval(() => {
                    const ev = leggiUltimoEvento();
                    if (!ev || !templateEditorViewportEl) return;
                    const rect = templateEditorViewportEl.getBoundingClientRect();
                    const SOGLIA = 56;
                    const VELOCITA_MAX = 16;
                    const x = ev.clientX, y = ev.clientY;
                    let dx = 0, dy = 0;
                    if (x < rect.left + SOGLIA) dx = -VELOCITA_MAX * (1 - Math.max(0, x - rect.left) / SOGLIA);
                    else if (x > rect.right - SOGLIA) dx = VELOCITA_MAX * (1 - Math.max(0, rect.right - x) / SOGLIA);
                    if (y < rect.top + SOGLIA) dy = -VELOCITA_MAX * (1 - Math.max(0, y - rect.top) / SOGLIA);
                    else if (y > rect.bottom - SOGLIA) dy = VELOCITA_MAX * (1 - Math.max(0, rect.bottom - y) / SOGLIA);
                    if (!dx && !dy) return;
                    templateEditorViewportEl.scrollLeft += dx;
                    templateEditorViewportEl.scrollTop += dy;
                    if (suOgniScroll) suOgniScroll(ev);
                }, 16);
            }
            function avviaAutoScrollBordoEditor() {
                avviaAutoScrollViewportEditor(
                    () => (editorDragSource && editorDragLastEvent) ? editorDragLastEvent : null,
                    (ev) => {
                        // I rettangoli del drop-target sono catturati UNA VOLTA all'inizio del
                        // trascinamento (vedi catturaRettangoliEditor): senza rinfrescarli qui,
                        // scorrendo la vista durante l'auto-scroll finirebbero disallineati rispetto
                        // alle coordinate schermo reali del puntatore.
                        catturaRettangoliEditor();
                        const posGrezza = calcolaPosizioneDropEditor(ev.clientX, ev.clientY);
                        if (posGrezza) {
                            const { pos, qualita } = applicaMagneteDropEditor(posGrezza, ev.clientX, ev.clientY);
                            editorDragLastPos = pos;
                            mostraIndicatoreDropEditor(pos, qualita);
                        }
                    }
                );
            }
            function fermaAutoScrollBordoEditor() {
                if (editorAutoScrollInterval) { clearInterval(editorAutoScrollInterval); editorAutoScrollInterval = null; }
            }
            function gestisciSpostamentoEditor(e) {
                if (!editorDragSource) return;
                editorDragLastEvent = e;
                if (editorDragRafPending) return;
                editorDragRafPending = true;
                requestAnimationFrame(() => {
                    editorDragRafPending = false;
                    if (!editorDragSource || !editorDragLastEvent) return;
                    const ev = editorDragLastEvent;
                    posizionaGhostTrascinamentoEditor(ev.clientX, ev.clientY);
                    // Sopra il cestino non ha senso calcolare dove atterrerebbe il blocco: lì non
                    // atterra, sparisce. L'indicatore di rilascio si spegne, così non si vedono
                    // due promesse contraddittorie nello stesso momento.
                    if (aggiornaCestinoTrascinamento(ev.clientX, ev.clientY)) {
                        nascondiIndicatoreDropEditor();
                        editorDragLastPos = null;
                        return;
                    }
                    const posGrezza = calcolaPosizioneDropEditor(ev.clientX, ev.clientY);
                    if (posGrezza) {
                        const { pos, qualita } = applicaMagneteDropEditor(posGrezza, ev.clientX, ev.clientY);
                        editorDragLastPos = pos;
                        mostraIndicatoreDropEditor(pos, qualita);
                    }
                });
            }
            function terminaTrascinamentoEditor() {
                document.removeEventListener('pointermove', gestisciSpostamentoEditor);
                fermaAutoScrollBordoEditor();
                editorDragLastEvent = null;
                editorDragRowsCache = null;
                editorDragCanvasRect = null;
                editorDragSourceRect = null;
                editorDragLimiteY = null;
                editorDragBlockType = null;
                editorDragScaleAttuale = 1;
                editorDragNaturalSize = null;
                rimuoviGhostTrascinamentoEditor();
                nascondiIndicatoreDropEditor();
                document.body.classList.remove('tpl-trascinamento-in-corso');
                const suCestino = sopraCestinoTrascinamento;
                nascondiCestinoTrascinamento();
                const pos = editorDragLastPos;
                const source = editorDragSource;
                editorDragSource = null;
                editorDragLastPos = null;
                // Rilascio sul cestino: si elimina. Nessuna richiesta di conferma perché l'undo
                // c'è ed è a un tocco — chiedere "sei sicuro?" per qualcosa di annullabile è solo
                // un ostacolo in più. Il messaggio dice cosa è successo e come tornare indietro.
                if (suCestino && source && source.kind === 'spostamento') {
                    // Già fuori da ogni pagina: basta lasciar cadere lo stato. L'undo salvato al
                    // momento in cui l'hai preso lo riporta indietro.
                    eliminaBloccoInSpostamento();
                    triggerVibrate(40);
                    return;
                }
                if (suCestino && source && source.kind === 'existing') {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (page) {
                        salvaUndoSnapshotEditor();
                        if (rimuoviBloccoDaPagina(page, source.blockId)) {
                            if (templateEditorState.selectedBlockId === source.blockId) {
                                templateEditorState.selectedBlockId = null;
                                chiudiMenuBloccoEditor();
                            }
                            renderTemplateEditorCanvas();
                            // Il tipo torna disponibile nella palette: ogni blocco-dati serve una
                            // volta sola nel report, e togliendolo deve poter essere ripreso.
                            renderTemplateEditorPalette();
                            triggerVibrate(40);
                            mostraToastTemplateEditor('Blocco eliminato — annulla con ↩ se non volevi');
                        }
                    }
                    return;
                }
                if (!pos || !source) return;

                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;

                salvaUndoSnapshotEditor();
                let blockObj, removalInfo = null, etichettaSpostamento = null;
                if (source.kind === 'existing') {
                    removalInfo = rimuoviBloccoDaPagina(page, source.blockId);
                    if (!removalInfo) return;
                    blockObj = removalInfo.block;
                } else if (source.kind === 'spostamento') {
                    // Blocco già in spostamento: NON è un blocco nuovo (non si generano id) e non è
                    // nemmeno "esistente" su questa pagina (è già stato tolto dalla sua, quindi
                    // niente da rimuovere e niente indici da compensare). È lo stesso identico
                    // oggetto di prima, id compreso: spostare non può creare doppioni.
                    const spost = bloccoInSpostamento();
                    if (!spost) return;
                    blockObj = spost.blocco;
                    etichettaSpostamento = spost.etichetta;
                    // Azzerato PRIMA dell'inserimento: un secondo rilascio non troverebbe più
                    // niente in spostamento, quindi non potrebbe inserire due volte lo stesso oggetto.
                    templateEditorState.bloccoInSpostamento = null;
                } else {
                    blockObj = { id: nuovoIdEditor('b'), type: source.blockType, colSpan: page.cols || 4 };
                }

                let posFinale = pos;
                if (removalInfo) {
                    if (removalInfo.rowWasRemoved && pos.rowIndex > removalInfo.rowIndex) {
                        posFinale = { ...pos, rowIndex: pos.rowIndex - 1 };
                    } else if (!removalInfo.rowWasRemoved && !removalInfo.wasStacked && !pos.newRow) {
                        // Togliere una colonna intera da una riga fa scalare a sinistra tutte le
                        // colonne successive: se il drop cade più avanti nella STESSA riga bisogna
                        // compensare l'indice (sia per l'affiancamento sia per l'impilamento).
                        if (pos.stackInto && pos.stackInto.rowIndex === removalInfo.rowIndex && pos.stackInto.columnIndex > removalInfo.blockIndex) {
                            posFinale = { ...pos, stackInto: { ...pos.stackInto, columnIndex: pos.stackInto.columnIndex - 1 } };
                        } else if (!pos.stackInto && pos.rowIndex === removalInfo.rowIndex && pos.insertIndex > removalInfo.blockIndex) {
                            posFinale = { ...pos, insertIndex: pos.insertIndex - 1 };
                        }
                    }
                    // Se il blocco proveniva da dentro uno stack (wasStacked), toglierlo non cambia
                    // né la lunghezza né l'ordine di row.blocks: nessuna compensazione necessaria.
                }
                // La riga di destinazione può essere bloccata (vedi inserisciBloccoInPagina, che in
                // quel caso rifiuta il piazzamento restituendo false): se il blocco trascinato
                // veniva da un'altra riga ed è già stato tolto da lì (removalInfo), va rimesso da
                // qualche parte, altrimenti sparirebbe nel nulla. Si rimette dov'era se quella riga
                // esiste ancora, altrimenti (riga sparita perché era rimasta vuota) come nuova riga
                // in fondo alla pagina — non deve mai succedere silenziosamente: un avviso spiega
                // perché non è finito dove l'utente lo trascinava.
                const piazzato = inserisciBloccoInPagina(page, blockObj, posFinale);
                if (!piazzato) {
                    if (removalInfo && !removalInfo.rowWasRemoved && page.rows[removalInfo.rowIndex]) {
                        const rigaOriginaria = page.rows[removalInfo.rowIndex];
                        const idx = Math.min(removalInfo.blockIndex, rigaOriginaria.blocks.length);
                        rigaOriginaria.blocks.splice(idx, 0, blockObj);
                    } else {
                        page.rows.push({ id: nuovoIdEditor('r'), blocks: [blockObj] });
                    }
                    mostraToastTemplateEditor('Quella riga contiene un blocco bloccato: non si può modificare finché non lo sblocchi');
                }
                // Blocco NUOVO dalla palette (mai uno esistente riposizionato, vedi
                // gestisciInserimentoBloccoNuovoConOverflow): se supera lo spazio residuo della
                // pagina, richiesta esplicitamente una scelta invece del riflusso silenzioso di
                // sempre — "chiedimi se aggiungerlo su una nuova pagina o adattarlo alla pagina".
                if (source.kind !== 'existing') {
                    // Vale anche per il blocco in spostamento: arrivando da un'altra pagina può benissimo
                    // non starci, ed è l'avviso "non entra nella pagina" chiesto esplicitamente.
                    // Si riusa la domanda che esiste già invece di scriverne una seconda uguale.
                    gestisciInserimentoBloccoNuovoConOverflow(page, blockObj);
                } else {
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPalette();
                    renderSuggerimentiLayoutEditor();
                }
                if (source.kind === 'spostamento') {
                    templateEditorState.flowSyncNecessario = true;
                    renderBarraSpostamento();
                    avvisaSeBloccoContinuaSuPiuPagine(blockObj, etichettaSpostamento || 'Blocco');
                }
            }

            /** Insieme dei tipi di blocco già presenti in QUALSIASI pagina del template in
             * modifica: ogni tipo serve una sola volta in tutto il report, quindi una volta
             * piazzato sparisce dalla palette (niente doppioni accidentali). */
            function tipiBloccoGiaUsatiNelTemplate() {
                const usati = new Set();
                (templateEditorState.pages || []).forEach(p => {
                    (p.rows || []).forEach(row => {
                        (row.blocks || []).forEach(entry => {
                            // Una voce impilata (stack) non ha un .type proprio: sono i singoli
                            // blocchi al suo interno ad averlo, vanno considerati "usati" uno per uno.
                            if (entry.stack) entry.stack.forEach(item => usati.add(item.type));
                            else usati.add(entry.type);
                        });
                    });
                });
                return usati;
            }

            function renderTemplateEditorPalette() {
                const el = document.getElementById('templateEditorPalette');
                if (!el) return;
                // "Foto (una per pagina)" resta fuori dalla palette: le pagine-foto sono generate
                // automaticamente in base al numero di foto della prova, non compongono qui.
                // "Foto prova" invece resta SEMPRE disponibile anche dopo averla usata: a differenza
                // di tutti gli altri tipi (dati calcolati una volta sola per l'intera prova, non ha
                // senso duplicarli), ogni blocco "Foto prova" pesca automaticamente la foto
                // successiva della galleria (vedi calcolaIndiciImmaginePerBlocco) — se ne possono
                // voler piazzare più di una per mostrare più foto della prova nel layout.
                nascondiAnteprimaPaletteHover();
                const usati = tipiBloccoGiaUsatiNelTemplate();
                // fuoriPalette: tipi che esistono ancora per i template gia' salvati ma che non
                // si offrono piu' quando si costruisce. E' il modo di ritirare un blocco senza
                // rompere il lavoro fatto.
                const tipiUtilizzabili = Object.keys(REPORT_BLOCK_TYPES).filter(t => t !== 'foto-singola'
                    && !(REPORT_BLOCK_TYPES[t] || {}).fuoriPalette
                    && (TIPI_BLOCCO_RIPETIBILI.has(t) || !usati.has(t)));
                // IL BLOCCO IN SPOSTAMENTO COMPARE QUI, in testa alla barra, come una scheda qualsiasi ma
                // evidenziata (idea esplicita: "meglio mostrando il blocco che sarebbe stato
                // presente nella barra degli strumenti"). Si trascina esattamente come un blocco
                // nuovo — stesso fantasma, stesso indicatore di rilascio — e questo è il motivo per
                // cui lo spostamento fra pagine non ha richiesto NESSUNA meccanica di
                // trascinamento nuova: cambia solo il "kind" passato ad avviaTrascinamentoEditor.
                const spost = bloccoInSpostamento();
                const htmlSpostamento = spost ? `
                    <div class="tpl-editor-palette-item in-spostamento" data-spostamento="1" title="${escapeHtmlDidascalia(spost.etichetta)} — in spostamento: trascinala dove vuoi, oppure usa la barra in basso a sinistra">
                        <svg class="ico" style="width:20px; height:20px; flex-shrink:0;"><use href="#i-${(REPORT_BLOCK_TYPES[spost.tipo] || {}).icon || 'clipboard'}"/></svg>
                        <span>${escapeHtmlDidascalia(spost.etichetta)}</span>
                        <span class="tpl-editor-palette-badge-spostamento" aria-hidden="true"></span>
                    </div>
                ` : '';
                if (tipiUtilizzabili.length === 0 && !spost) {
                    el.innerHTML = `<div style="grid-column: 1 / -1; font-size:10.5px; color:var(--text-muted); text-align:center; padding:14px 4px;">Tutti i blocchi disponibili sono già stati inseriti nel template.</div>`;
                    return;
                }
                // Griglia a 2 colonne, icona grande + etichetta (niente più anteprima dal vivo
                // incorporata: era quella a rendere ogni card alta ~90px, costringendo a scorrere
                // parecchio per vedere tutti gli 8 tipi disponibili). L'anteprima reale resta
                // raggiungibile passandoci sopra col mouse (vedi mostraAnteprimaPaletteHover), per chi
                // vuole comunque controllare il contenuto prima di trascinare.
                el.innerHTML = htmlSpostamento + tipiUtilizzabili.map(t => {
                    const def = REPORT_BLOCK_TYPES[t];
                    return `
                        <div class="tpl-editor-palette-item" data-block-type="${t}">
                            <svg class="ico" style="width:20px; height:20px; color:var(--accent-ink); flex-shrink:0;"><use href="#i-${def.icon}"/></svg>
                            <span>${def.label}</span>
                        </div>
                    `;
                }).join('');
                el.querySelectorAll('.tpl-editor-palette-item').forEach(item => {
                    item.addEventListener('pointerdown', (e) => {
                        nascondiAnteprimaPaletteHover();
                        // Animazione di pressione (richiesta esplicitamente): un piccolo
                        // "schiacciamento" immediato al tocco, che si annulla da solo poco dopo —
                        // indipendente dal drag&drop che parte comunque subito dopo, così l'utente
                        // ha un riscontro visivo del tocco anche se il trascinamento non supera mai
                        // la soglia di movimento (cioè viene interpretato come un semplice tap).
                        item.classList.add('tpl-editor-palette-pressed');
                        setTimeout(() => item.classList.remove('tpl-editor-palette-pressed'), 140);
                        // Scheda del blocco IN SPOSTAMENTO: stessa card, sorgente diversa. Su mobile il
                        // tocco lo posa in fondo alla pagina, esattamente come per un blocco nuovo.
                        if (item.dataset.spostamento) {
                            const inSpostamento = bloccoInSpostamento();
                            if (!inSpostamento) return;
                            if (modalitaMobileTemplateEditor()) {
                                e.preventDefault();
                                chiudiTendinaPaletteMobile();
                                posaBloccoQui();
                                return;
                            }
                            avviaTrascinamentoEditor(e, { kind: 'spostamento' }, inSpostamento.etichetta);
                            return;
                        }
                        const type = item.dataset.blockType;
                        // Redesign mobile "Opzione B": qui il tocco piazza subito il blocco invece
                        // di avviare un trascinamento, scomodo da controllare col dito su schermi
                        // piccoli (vedi modalitaMobileTemplateEditor/inserisciBloccoATocco).
                        if (modalitaMobileTemplateEditor()) {
                            e.preventDefault();
                            inserisciBloccoATocco(type);
                            return;
                        }
                        avviaTrascinamentoEditor(e, { kind: 'new', blockType: type }, REPORT_BLOCK_TYPES[type].label);
                    });
                    // Solo col mouse (niente hover reale su touch): un piccolo ritardo evita che
                    // l'anteprima lampeggi mentre si passa velocemente sopra più card in fila.
                    item.addEventListener('pointerenter', (e) => {
                        if (e.pointerType !== 'mouse') return;
                        clearTimeout(paletteAnteprimaHoverTimeout);
                        const type = item.dataset.blockType;
                        paletteAnteprimaHoverTimeout = setTimeout(() => mostraAnteprimaPaletteHover(item, type), 280);
                    });
                    item.addEventListener('pointerleave', () => {
                        clearTimeout(paletteAnteprimaHoverTimeout);
                        nascondiAnteprimaPaletteHover();
                    });
                });
            }

            let paletteAnteprimaHoverTimeout = null;

            /** Popover con l'anteprima reale (contenuto della prova attiva) di un tipo di blocco
             * della palette, mostrato al passaggio del mouse — la griglia a icone qui sopra è
             * volutamente compatta, ma prima di trascinare un blocco può servire vedere davvero
             * cosa contiene. "Foto prova" mostra una foto diversa a seconda di QUALE posizione
             * occuperà nel layout (vedi calcolaIndiciImmaginePerBlocco) — posizione che si decide
             * solo trascinandolo davvero, non prima: niente anteprima qui, il popover non si apre. */
            function mostraAnteprimaPaletteHover(item, tipo) {
                nascondiAnteprimaPaletteHover();
                const ctx = templateEditorState.ctx;
                if (!ctx || tipo === 'immagine-libera') return;
                const contenuto = buildBlockContentHtml(tipo, ctx);
                if (!contenuto) return;
                const pop = document.createElement('div');
                pop.id = 'templateEditorPalettePreviewPopover';
                pop.className = 'tpl-editor-anim-in-scale';
                pop.style.position = 'fixed';
                pop.style.zIndex = '400';
                pop.style.background = '#fff';
                pop.style.color = '#1e293b';
                pop.style.border = '1px solid var(--border)';
                pop.style.borderRadius = '8px';
                pop.style.boxShadow = '0 8px 24px rgba(0,0,0,0.35)';
                pop.style.padding = '6px';
                pop.style.pointerEvents = 'none';
                pop.style.width = '160px';
                pop.style.maxHeight = '240px';
                pop.style.overflow = 'hidden';
                pop.innerHTML = `<div style="width:52.5mm; zoom:0.82;">${contenuto}</div>`;
                hostFloatingUiEditor().appendChild(pop);
                const r = item.getBoundingClientRect();
                pop.style.left = (r.right + 8) + 'px';
                pop.style.top = r.top + 'px';
                requestAnimationFrame(() => {
                    if (!pop.isConnected) return;
                    const popRect = pop.getBoundingClientRect();
                    if (popRect.right > window.innerWidth) pop.style.left = Math.max(8, r.left - popRect.width - 8) + 'px';
                    if (popRect.bottom > window.innerHeight) pop.style.top = Math.max(8, window.innerHeight - popRect.height - 8) + 'px';
                });
            }
            function nascondiAnteprimaPaletteHover() {
                const pop = document.getElementById('templateEditorPalettePreviewPopover');
                if (pop) pop.remove();
            }

            function renderTemplateEditorPageControls() {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;
                const selCols = document.getElementById('selTemplateEditorCols');
                if (selCols) selCols.value = String(page.cols || 4);

                // Mostra/nascondi (headerOn) è del TEMPLATE, non di questa pagina (vedi
                // templateEditorState.headerEnabled, stesso ragionamento di footerShowPageNumber
                // qui sotto) — solo contenuto (immagine/testo) resta per-pagina.
                const chkHeader = document.getElementById('chkPageHeaderEnabled');
                const headerControls = document.getElementById('pageHeaderControls');
                const headerOn = !!templateEditorState.headerEnabled;
                if (chkHeader) chkHeader.checked = headerOn;
                if (headerControls) headerControls.style.display = headerOn ? 'flex' : 'none';
                const chkTutte = document.getElementById('chkHeaderTuttePagine');
                if (chkTutte) chkTutte.checked = !!templateEditorState.headerTutte;

                const previewImg = document.getElementById('previewHeaderImage');
                const btnRemoveImg = document.getElementById('btnRemoveHeaderImage');
                if (page.header && page.header.imageDataUrl) {
                    if (previewImg) { previewImg.src = page.header.imageDataUrl; previewImg.style.display = 'block'; }
                    if (btnRemoveImg) btnRemoveImg.style.display = 'block';
                } else {
                    if (previewImg) previewImg.style.display = 'none';
                    if (btnRemoveImg) btnRemoveImg.style.display = 'none';
                }
                const inputHeaderTextEl = document.getElementById('inputHeaderText');
                if (inputHeaderTextEl) inputHeaderTextEl.value = (page.header && page.header.text) || '';

                // Stesso ragionamento dell'intestazione qui sopra: mostra/nascondi è del TEMPLATE.
                const chkFooter = document.getElementById('chkPageFooterEnabled');
                const footerControls = document.getElementById('pageFooterControls');
                const footerOn = !!templateEditorState.footerEnabled;
                if (chkFooter) chkFooter.checked = footerOn;
                if (footerControls) footerControls.style.display = footerOn ? 'flex' : 'none';
                const inputFooterTextEl = document.getElementById('inputFooterText');
                if (inputFooterTextEl) inputFooterTextEl.value = (page.footer && page.footer.text) || '';
                // Impostazione del TEMPLATE, non della singola pagina (vedi
                // templateEditorState.footerShowPageNumber) — non dipende più da "page" qui sopra.


                const chkDistribuisci = document.getElementById('chkPageDistribuisciSpazio');
                if (chkDistribuisci) chkDistribuisci.checked = !!page.distribuisciSpazioVerticale;

                sincronizzaControlliMarginiSidebar();
            }

            /** Riporta i 4 slider dei margini nella barra laterale allo stato vero di
             * templateEditorState.margins — chiamata sia da renderTemplateEditorPageControls (ogni
             * volta che la pagina attiva cambia o un'altra impostazione viene toccata) sia dopo un
             * trascinamento delle maniglie sul foglio, così i due modi di regolare i margini
             * (slider in barra, maniglie sul foglio — richiesti esplicitamente entrambi: "anche
             * dalla barra al lato sinistro", le maniglie esistevano già) restano sempre coerenti tra
             * loro, mai uno dei due indietro rispetto all'altro. */
            function sincronizzaControlliMarginiSidebar() {
                const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                ['top', 'bottom', 'left', 'right'].forEach(side => {
                    const cap = side.charAt(0).toUpperCase() + side.slice(1);
                    const range = document.getElementById(`rangeMargine${cap}`);
                    const lbl = document.getElementById(`lblMargine${cap}`);
                    if (range && document.activeElement !== range) range.value = String(mrg[side]);
                    if (lbl) lbl.textContent = `${mrg[side]}mm`;
                });
            }

            /** Passo "First" del FLIP: posizione/dimensione di ogni blocco (o, con selettore
             * '.tpl-editor-block-inner', del suo contenuto interno — serve per animare anche
             * larghezza/allineamento, che non spostano il riquadro esterno) PRIMA di rigenerare
             * l'HTML della pagina, indicizzata per id blocco (l'id sopravvive al re-render finché
             * il blocco resta sulla stessa pagina — è quello il caso che vogliamo animare). */
            function catturaRectBlocchiPerFlip(canvas, selector) {
                const mappa = new Map();
                if (!canvas) return mappa;
                canvas.querySelectorAll(selector || '.tpl-editor-block').forEach(el => {
                    mappa.set(el.dataset.blockId, el.getBoundingClientRect());
                });
                return mappa;
            }

            /** Passi "Invert, Play" del FLIP: per ogni blocco ancora presente confronta la
             * posizione/dimensione nuova con quella catturata prima del render — se differiscono
             * (drag&drop, cambio colSpan, cambio scala/font/larghezza/allineamento, riflusso
             * automatico...) lo si "teletrasporta" via transform alla vecchia posizione e lo si
             * anima verso transform:none, dando l'illusione di un movimento fluido invece di uno
             * scatto secco. I blocchi senza una vecchia posizione (appena inseriti, o arrivati da
             * un'altra pagina) entrano invece con un fade+scale (vedi .tpl-editor-block-enter in
             * CSS) — animaIngresso=false quando questa stessa funzione viene richiamata una seconda
             * volta sul CONTENUTO interno del blocco, per non sommare due fade sullo stesso pixel. */
            function applicaFlipBlocchi(vecchiRect, canvas, selector, animaIngresso) {
                if (!canvas) return;
                if (animaIngresso === undefined) animaIngresso = true;
                const blocchi = canvas.querySelectorAll(selector || '.tpl-editor-block');
                blocchi.forEach(el => {
                    const id = el.dataset.blockId;
                    const vecchio = vecchiRect.get(id);
                    if (!vecchio) {
                        if (animaIngresso) {
                            el.classList.add('tpl-editor-block-enter');
                            el.addEventListener('animationend', function fine() {
                                el.classList.remove('tpl-editor-block-enter');
                                el.removeEventListener('animationend', fine);
                            });
                        }
                        return;
                    }
                    const nuovo = el.getBoundingClientRect();
                    const dx = vecchio.left - nuovo.left;
                    const dy = vecchio.top - nuovo.top;
                    const sx = nuovo.width > 0 ? vecchio.width / nuovo.width : 1;
                    const sy = nuovo.height > 0 ? vecchio.height / nuovo.height : 1;
