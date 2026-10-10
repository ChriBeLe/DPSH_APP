            // ===== EDITOR DI TESTO PER I BLOCCHI "TITOLO"/"TESTO" (richiesti esplicitamente,
            // blocchi di libertà d'impaginazione formattabili normalmente) =====
            // Barra ridotta rispetto a quella delle Note di progetto (niente immagini/tabelle/
            // link/checklist, fuori scopo per un titolo o un paragrafo dentro un report), stesso
            // motore execCommand-based già collaudato lì. Il contenuto (blk.richHtml) è HTML vero,
            // reso identicamente sia nell'anteprima dell'editor sia nella stampa/PDF (stessa
            // funzione buildBlockContentHtml, unica fonte di verità).
            let tplTextEditorTargetBlockId = null;
            /** L'intestazione della pagina aperta si scrive con lo stesso editor dei blocchi Testo:
             * questo è il suo «id» per l'editor. Il testo va in page.header.html; page.header.text
             * ne tiene la versione semplice, che leggono le versioni dell'app senza testo formattato. */
            const ID_INTESTAZIONE_EDITOR = '__intestazione__';
            /** Lo stesso per il piè di pagina formattato (page.footer.html). Vale per tutte le pagine:
             * come in Word, il piè di pagina è del documento. */
            const ID_PIEDE_EDITOR = '__piede__';
            function bloccoPiedeEditor() {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return null;
                const ft = page.footer || {};
                const semplice = String(ft.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return { type: 'piede', richHtml: ft.html || (semplice ? `<p style="text-align: center">${semplice}</p>` : '') };
            }
            function bloccoIntestazioneEditor() {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return null;
                const hd = page.header || {};
                const semplice = String(hd.text || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                return { type: 'intestazione', richHtml: hd.html || (semplice ? `<p style="text-align: center">${semplice}</p>` : '') };
            }
            let editorTesto = null;   // il motore montato nell'editor di testo dei template

            /** Stesso motore delle note, montato qui. Il testo di un blocco puo' contenere
             * titoli, elenchi e — nel capitolo introduttivo — una tabella: con execCommand
             * quella tabella non sarebbe nemmeno inseribile, figurarsi modificabile. */
            /** QUALE EDITOR HA IL FUOCO. Ce ne sono due montati sullo stesso motore: quello
             * delle note di progetto e quello del blocco di testo del template. I comandi della
             * barra devono andare a quello in cui si sta scrivendo — prima andavano sempre alle
             * note, ed era il motivo per cui nel blocco di testo mancavano meta' dei comandi.
             * Ripiega su quello delle note per i comandi lanciati senza fuoco (una scorciatoia
             * da tastiera mentre il cursore e' altrove). */
            function editorAttivo() {
                if (typeof editorTesto !== 'undefined' && editorTesto && editorTesto.isFocused) return editorTesto;
                if (typeof editorNote !== 'undefined' && editorNote && editorNote.isFocused) return editorNote;
                return (typeof editorTesto !== 'undefined' && editorTesto && document.getElementById('modalTplTextEditor')
                        && document.getElementById('modalTplTextEditor').classList.contains('open'))
                    ? editorTesto
                    : (typeof editorNote !== 'undefined' ? editorNote : null);
            }

            /** Il gesto e' lo stesso, il seguito no: nelle note si salva subito, nel blocco di
             * testo del template si salva quando si preme «Salva». Questa e' l'unica riga in
             * cui la differenza e' scritta, invece di essere ripetuta in tredici gestori. */
            function dopoComandoTesto(subito) {
                const ed = editorAttivo();
                if (typeof editorNote !== 'undefined' && ed === editorNote) {
                    if (typeof salvaNoteProgettoCorrente === 'function') salvaNoteProgettoCorrente(!!subito);
                    return;
                }
                if (typeof aggiornaSegnapostoTestoTemplate === 'function') aggiornaSegnapostoTestoTemplate();
            }

            /** Collega un comando A TUTTE LE BARRE che lo dichiarano.
             *
             * Le barre sono due — le note e il blocco di testo del template — e finche' i
             * pulsanti sono stati identificati per id sono rimasti due elenchi da tenere
             * allineati a mano. Non ha funzionato: tredici pulsanti della seconda barra erano
             * inerti perche' il gestore cercava btnNote... e li' c'era btnTpl..., e non davano
             * nessun errore, perche' ogni gestore era protetto da `if (el)`. Sembravano
             * pulsanti veri. Con l'attributo il gestore e' uno e vale ovunque il pulsante
             * compaia — anche in una terza barra, se un giorno servira'. */
            function collegaComandoTesto(nome, azione) {
                document.querySelectorAll('[data-comando-nota="' + nome + '"]').forEach(btn => {
                    btn.addEventListener('click', (e) => azione(btn, e));
                });
            }

            /** Il pannellino che si apre sotto un pulsante (allineamento, colori
             * dell'evidenziatore). Si cerca ACCANTO al pulsante invece che per id: due barre,
             * due pannellini, e cercarli per id vorrebbe dire tornare a due elenchi. */
            function pannelloDelPulsante(btn) {
                const cassa = btn && btn.parentElement;
                return cassa ? cassa.querySelector('.note-shape-popover') : null;
            }
            function chiudiTuttiIPannelliTesto() {
                document.querySelectorAll('.note-shape-popover').forEach(p => { p.style.display = 'none'; });
            }

            function creaEditorTesto() {
                if (editorTesto) return editorTesto;
                const contenitore = document.getElementById('tplTextEditorBody');
                if (!contenitore || !window.NoteEditor) return null;
                editorTesto = new window.NoteEditor.Editor({
                    element: contenitore,
                    extensions: window.NoteEditor.ESTENSIONI,
                    content: '',
                    // LA BARRA DEVE DIRE DOVE SI E'. aggiornaStatoBarraNote esisteva ed era
                    // gia' scritta per l'editor attivo, ma qui non la chiamava nessuno: nel
                    // blocco di testo i pulsanti restavano spenti sempre, anche col cursore
                    // dentro un titolo in grassetto. Una barra che non dice in che stato sei
                    // costringe a indovinare, e su un H1 contro un H2 indovinare non si puo'.
                    onUpdate: () => {
                        aggiornaSegnapostoTestoTemplate();
                        if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote();
                        if (globalThis.__aggiornaMenuTag) globalThis.__aggiornaMenuTag();
                    },
                    // Anche spostando il cursore: la chiocciola puo' finire davanti al cursore
                    // senza che sia stato battuto niente (freccia, tocco, incolla). E i pulsanti
                    // devono seguire il cursore, non solo cio' che si batte.
                    onSelectionUpdate: () => {
                        if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote();
                        if (globalThis.__aggiornaMenuTag) globalThis.__aggiornaMenuTag();
                    },
                    onFocus: () => { if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote(); },
                    // ANCHE SU OGNI TRANSAZIONE. Accendere il grassetto col cursore fermo, senza
                    // battere niente, non cambia ne' il documento ne' la selezione: e' un
                    // «marcatore in attesa», e con i soli onUpdate/onSelectionUpdate il pulsante
                    // restava spento fino alla prima lettera scritta — cioe' proprio quando
                    // serviva sapere se era acceso.
                    onTransaction: () => { if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote(); },
                    onBlur: () => { if (globalThis.__chiudiMenuTag) globalThis.__chiudiMenuTag(); },
                    editorProps: {
                        handlePaste: (view, evento) => {
                            const dati = evento.clipboardData;
                            if (!dati) return false;
                            const html = dati.getData('text/html');
                            if (!html) return false;
                            editorTesto.commands.insertContent(ripuliscoHtmlIncollatoNota(html));
                            return true;
                        }
                    }
                });
                return editorTesto;
            }
            function aggiornaSegnapostoTestoTemplate() {
                const contenitore = document.getElementById('tplTextEditorBody');
                if (contenitore) contenitore.classList.toggle('note-vuota', !editorTesto || editorTesto.isEmpty);
            }

            function apriTplTextEditor(blockId) {
                // IN TUTTE LE PAGINE, non solo in quella aperta. Da una pagina di continuazione
                // il blocco vero non c'e': quella pagina mostra solo una fetta, e le sue righe
                // sono vuote per costruzione. Cercandolo li' non si trovava niente e la funzione
                // usciva in silenzio — il comando c'era, si premeva, e non succedeva nulla.
                const blk = blockId === ID_INTESTAZIONE_EDITOR ? bloccoIntestazioneEditor() : blockId === ID_PIEDE_EDITOR ? bloccoPiedeEditor() : trovaBloccoPerIdOvunque(blockId);
                if (!blk) return;
                tplTextEditorTargetBlockId = blockId;
                const lblTitolo = document.getElementById('lblTplTextEditorTitle');
                if (lblTitolo) lblTitolo.textContent = blk.type === 'titolo' ? 'Modifica titolo' : blk.type === 'intestazione' ? 'Testo dell\'intestazione' : blk.type === 'piede' ? 'Testo del piè di pagina' : 'Modifica testo';
                creaEditorTesto();
                if (editorTesto) {
                    editorTesto.commands.setContent(blk.richHtml || '', { emitUpdate: false });
                    aggiornaSegnapostoTestoTemplate();
                }
                // SI SCRIVE COME SI STAMPA. Il corpo dell'editor mostrava sempre il suo stile —
                // testo a bandiera, corpo di sistema — mentre il documento e' giustificato e col
                // carattere scelto: si componeva un paragrafo e sul foglio ne compariva un altro,
                // con altri a capo. Le variabili sono le stesse del foglio, scritte dalla stessa
                // funzione: due sorgenti divergono, una no.
                {
                    const corpo = document.getElementById('tplTextEditorBody');
                    if (corpo) {
                        corpo.setAttribute('style', (corpo.getAttribute('style') || '').replace(/--tpl-[^;]+;\s*/g, '')
                            + ' ' + cssVariabiliStileTesto(templateEditorState.stileTesto));
                        corpo.classList.add('note-editor-come-stampa');
                    }
                }
                const overlay = document.getElementById('modalTplTextEditorOverlay');
                const modal = document.getElementById('modalTplTextEditor');
                if (overlay) overlay.classList.add('open');
                if (modal) modal.classList.add('open');
                if (editorTesto) setTimeout(() => {
                    editorTesto.commands.focus();
                    // Subito, senza aspettare il primo tocco: aprendo la finestra su un titolo la
                    // barra deve gia' dire «H1» e «grassetto».
                    if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote();
                }, 50);
            }
            function chiudiTplTextEditor() {
                tplTextEditorTargetBlockId = null;
                const overlay = document.getElementById('modalTplTextEditorOverlay');
                const modal = document.getElementById('modalTplTextEditor');
                if (overlay) overlay.classList.remove('open');
                if (modal) modal.classList.remove('open');
            }
            const btnCloseTplTextEditorX = document.getElementById('btnCloseTplTextEditorX');
            if (btnCloseTplTextEditorX) btnCloseTplTextEditorX.addEventListener('click', chiudiTplTextEditor);
            const btnTplTextEditorAnnulla = document.getElementById('btnTplTextEditorAnnulla');
            if (btnTplTextEditorAnnulla) btnTplTextEditorAnnulla.addEventListener('click', chiudiTplTextEditor);
            const btnTplTextEditorSalva = document.getElementById('btnTplTextEditorSalva');
            if (btnTplTextEditorSalva) {
                btnTplTextEditorSalva.addEventListener('click', () => {
                    if (!tplTextEditorTargetBlockId) return;
                    if (tplTextEditorTargetBlockId === ID_PIEDE_EDITOR) {
                        if (editorTesto) {
                            const html = editorTesto.isEmpty ? '' : editorTesto.getHTML();
                            const testo = editorTesto.isEmpty ? '' : editorTesto.getText({ blockSeparator: ' · ' }).trim();
                            salvaUndoSnapshotEditor();
                            templateEditorState.pages.forEach(p => {
                                p.footer = Object.assign({}, p.footer, { text: testo });
                                if (html) p.footer.html = html; else { delete p.footer.html; delete p.footer.heightMm; }
                            });
                        }
                        chiudiTplTextEditor();
                        renderTemplateEditorPageControls();
                        renderTemplateEditorCanvas();
                        return;
                    }
                    if (tplTextEditorTargetBlockId === ID_INTESTAZIONE_EDITOR) {
                        const page = templateEditorState.pages[templateEditorState.activePageIdx];
                        if (page && editorTesto) {
                            if (!page.header) page.header = { imageDataUrl: null, text: '' };
                            page.header.html = editorTesto.isEmpty ? '' : editorTesto.getHTML();
                            page.header.text = editorTesto.isEmpty ? '' : editorTesto.getText({ blockSeparator: ' · ' }).trim();
                            if (!page.header.html) delete page.header.html;
                            allineaIntestazioniEditor(page);
                        }
                        chiudiTplTextEditor();
                        renderTemplateEditorPageControls();
                        renderTemplateEditorCanvas();
                        return;
                    }
                    // Stesso motivo dell'apertura: il blocco puo' vivere su un'altra pagina.
                    // Salvare cercandolo solo in quella aperta voleva dire perdere le modifiche
                    // appena fatte, senza dire niente.
                    const blk = trovaBloccoPerIdOvunque(tplTextEditorTargetBlockId);
                    if (!blk || !editorTesto) { chiudiTplTextEditor(); return; }
                    salvaUndoSnapshotEditor();
                    // Un documento vuoto, per il motore, e' "<p></p>": salvarlo cosi' lascerebbe
                    // il blocco "invisibilmente pieno" invece di riportarlo al segnaposto.
                    blk.richHtml = editorTesto.isEmpty ? '' : editorTesto.getHTML();
                    const blockIdAppenaSalvato = tplTextEditorTargetBlockId;
                    chiudiTplTextEditor();
                    renderTemplateEditorCanvas();
                    selezionaBloccoEditor(blockIdAppenaSalvato);
                });
            }
            // QUI STAVANO I RESIDUI DELLA VECCHIA BARRA DEL BLOCCO DI TESTO: la tabella
            // data-tpl-cmd (nomi di execCommand) e i gestori di inputTplTextColor,
            // btnTplTextClearFormat, btnTplTextUndo e btnTplTextRedo. Quei quattro id non
            // esistono piu' da quando la barra e' diventata una copia di quella delle note, e
            // i gestori erano protetti da `if (el)`: non davano errore, non facevano niente,
            // e sembravano il codice che faceva funzionare la barra. I comandi veri sono
            // cablati su #noteToolbar e #tplTextToolbar insieme, piu' in basso.

            function posizionaMenuBloccoEditor(menu, ancoraEl) {
                // Angolo fisso in basso a destra, NON più ancorato al blocco selezionato
                // (segnalato esplicitamente: ancorarlo al blocco lo faceva finire spesso al centro
                // dello schermo, sopra il blocco stesso e le sue maniglie — "appare sempre in mezzo
                // ai coglioni"). Un angolo prevedibile lascia libero il centro del canvas; chi vuole
                // il popover altrove può comunque trascinarlo dalla maniglia in cima (la posizione
                // scelta a mano viene ricordata, vedi menuBloccoPosizioneManuale) o ridurlo a bolla.
                const mw = menu.offsetWidth || 220;
                const mh = menu.offsetHeight || 160;
                let left = window.innerWidth - mw - 14;
                let top = window.innerHeight - mh - 14;
                left = Math.max(8, Math.min(window.innerWidth - mw - 8, left));
                top = Math.max(8, Math.min(window.innerHeight - mh - 8, top));
                menu.style.left = left + 'px';
                menu.style.top = top + 'px';
            }

            /** Trascinamento libero del popover del blocco (richiesto esplicitamente: "dammi la
             * possibilità di trascinare la finestra fluttuante dell'editor del blocco") — utile
             * quando il popover, ancorato di default appena sotto/sopra il blocco, finisce comunque
             * a coprire qualcosa che si vuole vedere nel frattempo (es. un altro punto della mappa).
             * Solo la maniglia in cima (.tpl-editor-block-menu-drag-handle) avvia il trascinamento,
             * non l'intero popover, per non rubare i click sui controlli veri sotto. Stesso schema
             * "solo la maniglia cattura il puntatore" già usato per le maniglie di riordino pagine.
             * A fine trascinamento la posizione si salva in menuBloccoPosizioneManuale: ogni azione
             * dentro il menu ricrea il popover da zero (vedi apriMenuBloccoEditor), senza questo
             * salvataggio "salterebbe" di nuovo accanto al blocco a ogni tocco invece di restare
             * dove l'utente l'aveva messo (segnalato esplicitamente). */
            /* ===================== ALTEZZA DEL MENU SU MOBILE =====================
               Su mobile il menu non si sposta (è ancorato in basso a tutta larghezza): quello che
               serve lì è decidere QUANTO alto sia, perché è ciò che determina se vedi o no il
               blocco che stai modificando. Tre posizioni invece di un ridimensionamento libero: il
               dito non è preciso, e tre scatti chiari si azzeccano sempre al primo colpo.
               - spia   : si vede il nome del blocco e i primi comandi, il foglio resta quasi tutto
                          visibile — la posizione giusta mentre si guarda l'effetto di una modifica
               - metà   : uso normale (predefinita)
               - intero : per le sezioni lunghe, es. le interruzioni di pagina
               La scelta si conserva tra le aperture: chi lavora "a spia" non deve riabbassare il
               foglio ogni volta che tocca un blocco diverso. */
            const ALTEZZE_MENU_MOBILE = ['32vh', '55vh', '88vh'];
            let indiceAltezzaMenuMobile = 1;
            /** Vero quando la sezione "Interruzioni di pagina" è aperta a tutto schermo. Vive qui e
             * non dentro apriMenuBloccoEditor perché il menu viene ricostruito da capo ad ogni
             * azione: senza, ogni "+" farebbe richiudere la schermata piena. Si azzera quando il
             * menu si chiude o si passa a un altro blocco (vedi chiudiMenuBloccoEditor). */
            let menuInterruzioniEspanso = false;
            function applicaAltezzaMenuMobile(menu) {
                if (!menu) return;
                menu.style.setProperty('--tpl-menu-h', ALTEZZE_MENU_MOBILE[indiceAltezzaMenuMobile]);
            }

            /** Trasforma la maniglia in un controllo di altezza a scatti. Trascinando si segue il
             * dito senza scatti (la transizione CSS viene spenta); al rilascio si aggancia alla
             * posizione più vicina. Un tocco secco senza spostamento passa alla posizione
             * successiva in ciclo: sul telefono è spesso più rapido che trascinare. */
            function attivaRidimensionamentoMenuMobile(menu) {
                const handle = menu.querySelector('.tpl-editor-block-menu-drag-handle');
                if (!handle) return;
                applicaAltezzaMenuMobile(menu);
                let stato = null;
                handle.addEventListener('pointerdown', (e) => {
                    if (e.target.closest('.tpl-editor-block-menu-collapse')) return;
                    handle.setPointerCapture(e.pointerId);
                    stato = { y: e.clientY, hIniziale: menu.getBoundingClientRect().height, mosso: false };
                    menu.classList.add('ridimensionamento-in-corso');
                });
                handle.addEventListener('pointermove', (e) => {
                    if (!stato) return;
                    const delta = stato.y - e.clientY; // verso l'alto = più alto
                    if (Math.abs(delta) > 4) stato.mosso = true;
                    const nuova = Math.max(120, Math.min(window.innerHeight * 0.92, stato.hIniziale + delta));
                    menu.style.setProperty('--tpl-menu-h', nuova + 'px');
                });
                const fine = () => {
                    if (!stato) return;
                    menu.classList.remove('ridimensionamento-in-corso');
                    if (!stato.mosso) {
                        // Tocco secco: passa alla posizione successiva, e dopo l'ultima torna alla prima.
                        indiceAltezzaMenuMobile = (indiceAltezzaMenuMobile + 1) % ALTEZZE_MENU_MOBILE.length;
                    } else {
                        // Trascinamento: si aggancia alla posizione più vicina a dove è stato lasciato.
                        const hFinale = menu.getBoundingClientRect().height;
                        let migliore = 0, distanzaMigliore = Infinity;
                        ALTEZZE_MENU_MOBILE.forEach((v, i) => {
                            const px = parseFloat(v) / 100 * window.innerHeight;
                            const d = Math.abs(px - hFinale);
                            if (d < distanzaMigliore) { distanzaMigliore = d; migliore = i; }
                        });
                        indiceAltezzaMenuMobile = migliore;
                    }
                    stato = null;
                    applicaAltezzaMenuMobile(menu);
                    triggerVibrate(10);
                    // L'altezza è cambiata: il blocco selezionato potrebbe essere finito sotto il
                    // foglio, quindi si ricontrolla che resti visibile.
                    portaBloccoSopraIlMenu(menu);
                };
                handle.addEventListener('pointerup', fine);
                handle.addEventListener('pointercancel', fine);
            }

            /** Porta il blocco selezionato nella fascia di schermo che resta libera SOPRA il menu.
             * È il pezzo che toglie il "modifichi alla cieca": senza, il foglio basso copre proprio
             * il blocco su cui stai agendo e l'anteprima dal vivo dei comandi non serve a niente
             * perché è nascosta. Si scorre solo se serve davvero, per non far ballare la vista ad
             * ogni apertura. */
            function portaBloccoSopraIlMenu(menu) {
                if (!modalitaMobileTemplateEditor()) return;
                const blockId = templateEditorState.selectedBlockId;
                if (!blockId || !menu) return;
                requestAnimationFrame(() => {
                    const el = document.querySelector(`.tpl-editor-block[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`);
                    if (!el) return;
                    const rBlocco = el.getBoundingClientRect();
                    const topMenu = menu.getBoundingClientRect().top;
                    // Margine di cortesia: il blocco non deve stare appiccicato al bordo del menu.
                    const margine = 12;
                    const fuoriSotto = rBlocco.bottom > topMenu - margine;
                    const fuoriSopra = rBlocco.top < 0;
                    if (!fuoriSotto && !fuoriSopra) return; // già visibile: non si tocca niente
                    el.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
                });
            }

            function attivaTrascinamentoMenuBloccoEditor(menu, blockId) {
                // Su mobile la maniglia non sposta il menu (è ancorato in basso a tutta larghezza):
                // regola l'altezza. Vedi attivaRidimensionamentoMenuMobile.
                if (modalitaMobileTemplateEditor()) {
                    attivaRidimensionamentoMenuMobile(menu);
                    // Ripristina la schermata piena delle interruzioni se era aperta prima che il
                    // menu venisse ricostruito (ogni "+" lo ricrea da zero): senza, ogni singola
                    // interruzione aggiunta ti rispedirebbe al menu normale.
                    if (menuInterruzioniEspanso && menu.querySelector('.tpl-editor-interr-sezione')) {
                        menu.classList.add('solo-interruzioni');
                    } else {
                        menuInterruzioniEspanso = false;
                        portaBloccoSopraIlMenu(menu);
                    }
                    return;
                }
                const handle = menu.querySelector('.tpl-editor-block-menu-drag-handle');
                if (!handle) return;
                let dragStato = null;
                handle.addEventListener('pointerdown', (e) => {
                    // FIX "quando premo la freccetta non succede nulla": il pulsante "Riduci a
                    // bolla" (.tpl-editor-block-menu-collapse) vive DENTRO questa stessa maniglia —
                    // senza questo controllo, un tocco su di esso faceva comunque scattare
                    // handle.setPointerCapture qui sotto, dirottando il pointerup lontano dal
                    // pulsante (stesso identico meccanismo del bug "il blocco non si seleziona più"
                    // col pan del canvas): il click sul pulsante non arrivava mai a scattare.
                    if (e.target.closest('.tpl-editor-block-menu-collapse')) return;
                    handle.setPointerCapture(e.pointerId);
                    // mw/mh letti UNA VOLTA qui, non ad ogni pointermove: il canvas dell'editor ha
                    // centinaia di elementi (tessere satellitari comprese), quindi offsetWidth/
                    // offsetHeight durante il trascinamento forzavano un reflow sincrono dell'intera
                    // pagina decine di volte al secondo — percepito come un blocco dell'interfaccia
                    // (segnalato esplicitamente: "quando provo a muovere la finestra si impalla"). La
                    // dimensione del popover non cambia durante un trascinamento, quindi leggerla una
                    // sola volta è sicuro.
                    const r = menu.getBoundingClientRect();
                    dragStato = { pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, startLeft: r.left, startTop: r.top, mw: r.width, mh: r.height };
                    e.preventDefault();
                });
                handle.addEventListener('pointermove', (e) => {
                    if (!dragStato || e.pointerId !== dragStato.pointerId) return;
                    let left = dragStato.startLeft + (e.clientX - dragStato.startX);
                    let top = dragStato.startTop + (e.clientY - dragStato.startY);
                    left = Math.max(8, Math.min(window.innerWidth - dragStato.mw - 8, left));
                    top = Math.max(8, Math.min(window.innerHeight - dragStato.mh - 8, top));
                    menu.style.left = left + 'px';
                    menu.style.top = top + 'px';
                    menuBloccoPosizioneManuale = { blockId, left, top };
                });
                const fineTrascinamento = (e) => {
                    if (!dragStato || e.pointerId !== dragStato.pointerId) return;
                    dragStato = null;
                };
                handle.addEventListener('pointerup', fineTrascinamento);
                handle.addEventListener('pointercancel', fineTrascinamento);
            }

            let editorRiflussoInCorso = false;
            // Sospende il riflusso automatico per UN singolo render (vedi renderTemplateEditorCanvas
            // e gestisciInserimentoBloccoNuovoConOverflow) — serve a misurare l'eccesso di un blocco
            // appena inserito PRIMA che il riflusso lo sposti da solo in silenzio.
            let riflussoAutomaticoSospeso = false;
            // Guardia di rientranza per sincronizzaFlussiBlocchiLunghi (vedi sotto) — impedisce
            // che i render interni fatti per navigare/misurare le pagine di continuazione
            // rilancino la sincronizzazione su se stessi.
            let sincronizzazioneFlussoInCorso = false;

            /** Misura (sola LETTURA, non sposta nulla) quale riga REALE della pagina attiva — indice
             * in page.rows, non nel DOM, vedi conversione rowSpan sotto — è la prima a superare
             * fisicamente la linea "fine pagina A4". Ritorna -1 se non c'è overflow, o se sfora solo
             * la primissima riga (un blocco da solo più alto di un'intera pagina non ha altrove dove
             * andare). Estratta da spostaBlocchiInEccessoAllaPaginaSuccessiva così la stessa misura
             * può essere riusata anche da gestisciInserimentoBloccoNuovoConOverflow per decidere SE
             * proporre la scelta "nuova pagina o adatta", senza duplicare la logica di conversione. */
            function trovaRigaRealeInEccesso() {
                const linea = document.getElementById('templateEditorA4Line');
                const canvas = document.getElementById('templateEditorCanvas');
                if (!linea || !canvas) return -1;
                const limiteY = linea.getBoundingClientRect().top;
                const righe = Array.from(canvas.querySelectorAll('.tpl-editor-row'));
                // Una riga che contiene SOLO un blocco "flowable" (Allegato Formule, Tabella
                // Dettagliata: vedi BLOCCHI_FLOWABLE) non va MAI spostata per intero sulla pagina
                // successiva da qui — si "flow-a" da sola su più pagine di continuazione tramite
                // sincronizzaFlussiBlocchiLunghi, che gestisce il suo sforo separatamente e in modo
                // molto più mirato (taglio per categoria, non l'intero blocco). Se la lasciassimo
                // rilevare qui, verrebbe spostata via per intero come una riga qualunque, sprecando
                // tutto lo spazio rimasto sulla pagina corrente.
                const pagina = templateEditorState.pages[templateEditorState.activePageIdx];
                const idRigheFlowable = new Set();
                if (pagina && pagina.rows) {
                    pagina.rows.forEach(r => {
                        if (r.blocks && r.blocks.length === 1 && !r.blocks[0].stack && BLOCCHI_FLOWABLE.has(r.blocks[0].type)) {
                            idRigheFlowable.add(r.id);
                        }
                    });
                }
                let indiceStrabocco = -1;
                for (let i = 0; i < righe.length; i++) {
                    if (idRigheFlowable.has(righe[i].dataset.rowId)) continue;
                    if (righe[i].getBoundingClientRect().bottom > limiteY + 0.5) { indiceStrabocco = i; break; }
                }
                if (indiceStrabocco <= 0) return -1;
                let indiceStraboccoReale = 0;
                for (let k = 0; k < indiceStrabocco; k++) {
                    indiceStraboccoReale += parseInt(righe[k].dataset.rowsCount || '1', 10);
                }
                return indiceStraboccoReale;
            }

            /** Cerca la prima riga della pagina attiva che supera fisicamente la linea "fine
             * pagina A4" e, se non è la primissima riga (un blocco da solo più alto di una pagina
             * intera non ha altrove dove andare: si lascia dov'è, niente loop di pagine infinite),
             * sposta quella riga e tutte quelle sotto sulla pagina successiva — creandola, con lo
             * stesso numero di colonne/intestazione/piè di pagina di quella di partenza, se manca. */
            /** Vero se una riga contiene almeno un blocco con la posizione bloccata (richiesto
             * esplicitamente, ribadito: "il lucchetto deve bloccare in maniera assoluta un blocco
             * in quella posizione, non deve venire riadattato alla posizione sul foglio A4") —
             * controlla anche i segnaposto di un blocco con rowSpan bloccato (entry.reserved),
             * risalendo al blocco proprietario tramite ownerId. Usata da
             * spostaBlocchiInEccessoAllaPaginaSuccessiva per non spostare MAI quella riga
             * sulla pagina successiva, nemmeno quando sfora il margine A4. */
            function rigaContieneBloccoBloccato(page, row) {
                return (row.blocks || []).some(e => {
                    if (e.posizioneBloccata) return true;
                    if (e.reserved && e.ownerId) {
                        const owner = trovaVoceRigaPerId(page, e.ownerId);
                        return !!(owner && owner.posizioneBloccata);
                    }
                    // «Inserisci ugualmente»: l'utente ha visto l'avviso e ha deciso che il blocco
                    // resta qui anche se sfora. Non è un blocco bloccato — tutti i suoi comandi
                    // restano attivi — è solo il riflusso automatico che ha già ricevuto una
                    // risposta e non deve tornare a chiederla spostandolo da solo alla pagina dopo.
                    return !!e.fuoriMargineAccettato;
                });
            }
            /** BUG CORRETTO (segnalato "ENORME BUG": in una riga con un blocco messo con
             * "Inserisci ugualmente" — MAI un lucchetto vero, vedi il commento sopra, "tutti i suoi
             * comandi restano attivi" — rimuovere/spostare QUALUNQUE blocco di quella riga veniva
             * comunque rifiutato, senza alcun modo visibile di sbloccarlo: l'unica via d'uscita
             * trovata era cancellare l'intera pagina). Causa: rigaContieneBloccoBloccato qui sopra
             * considera ANCHE fuoriMargineAccettato "bloccato" — corretto per il suo scopo originale
             * (non far ripartire da solo il riflusso automatico su una riga già "risolta"), ma
             * quello stesso valore veniva letto anche dalle guardie di rimozione/spostamento
             * MANUALE (rimuoviBloccoDaPagina/inserisciBloccoInPagina), che needed la nozione
             * "genuina" di lucchetto, non quella allargata. Questa versione guarda SOLO
             * posizioneBloccata (diretto o via un segnaposto rowSpan il cui proprietario è
             * bloccato) — l'unica cosa che un utente ha davvero attivato apposta dal lucchetto nel
             * menu del blocco. */
            function rigaHaBloccoGenuinamenteBloccato(page, row) {
                return (row.blocks || []).some(e => {
                    if (e.posizioneBloccata) return true;
                    if (e.reserved && e.ownerId) {
                        const owner = trovaVoceRigaPerId(page, e.ownerId);
                        return !!(owner && owner.posizioneBloccata);
                    }
                    return false;
                });
            }
            function spostaBlocchiInEccessoAllaPaginaSuccessiva() {
                const indiceStraboccoReale = trovaRigaRealeInEccesso();
                if (indiceStraboccoReale < 0) return false;
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page || !page.rows) return false;
                // Un blocco con la posizione bloccata non deve MAI essere spostato dal riflusso
                // automatico (richiesto esplicitamente, ribadito: "deve bloccare in maniera
                // assoluta... non deve venire riadattato alla posizione sul foglio A4") — anche se
                // la sua riga sfora il margine A4, resta esattamente dov'è invece di traslocare
                // sulla pagina successiva. Si scorre dal fondo verso indiceStraboccoReale
                // rimuovendo (splice) solo le righe SENZA blocchi bloccati, lasciando le altre al
                // loro posto — l'ordine relativo di quelle spostate resta intatto (unshift).
                const righeDaSpostare = [];
                let bloccatiIgnorati = false;
                for (let i = page.rows.length - 1; i >= indiceStraboccoReale; i--) {
                    if (rigaContieneBloccoBloccato(page, page.rows[i])) { bloccatiIgnorati = true; continue; }
                    righeDaSpostare.unshift(page.rows.splice(i, 1)[0]);
                }
                if (righeDaSpostare.length === 0) return false;
                let paginaSuccessiva = templateEditorState.pages[templateEditorState.activePageIdx + 1];
                let paginaCreataOra = false;
                if (!paginaSuccessiva) {
                    paginaSuccessiva = nuovaPaginaVuota();
                    paginaSuccessiva.cols = page.cols;
                    paginaSuccessiva.header = JSON.parse(JSON.stringify(page.header || { imageDataUrl: null, text: '' }));
                    paginaSuccessiva.footer = JSON.parse(JSON.stringify(page.footer || { text: '' }));
                    templateEditorState.pages.splice(templateEditorState.activePageIdx + 1, 0, paginaSuccessiva);
                    paginaCreataOra = true;
                }
                paginaSuccessiva.rows = righeDaSpostare.concat(paginaSuccessiva.rows);
                // Avviso richiesto esplicitamente: non deve succedere "in silenzio" — l'utente vuole
                // sapere quando un blocco che ha piazzato/ridimensionato supera il margine A4 e
                // finisce (o fa nascere) una pagina successiva. Se nel mezzo c'era anche un blocco
                // bloccato rimasto al suo posto, lo si dice esplicitamente: è lui il motivo per cui
                // la pagina potrebbe restare visivamente "sforata" oltre il margine.
                const suffissoBloccato = bloccatiIgnorati ? ' (un blocco bloccato è rimasto dov\'era)' : '';
                mostraToastTemplateEditor(paginaCreataOra
                    ? `Pagina ${templateEditorState.activePageIdx + 2} creata automaticamente: un blocco superava il margine A4${suffissoBloccato}`
                    : `Blocco spostato a pagina ${templateEditorState.activePageIdx + 2}: superava il margine A4${suffissoBloccato}`);
                return true;
            }

            /** Richiesta esplicitamente: "quando inserisco un blocco che di base è più grande dello
             * spazio residuo della pagina vorrei che venisse chiesto... se aggiungerlo su una nuova
             * pagina o se inserirlo nella stessa pagina con le proporzioni riadattate direttamente
             * per fittare nello spazio residuo". Chiamata SOLO subito dopo aver piazzato un blocco
             * NUOVO dalla palette (mai per un blocco esistente riposizionato — lì il riflusso
             * silenzioso resta come prima, spostare qualcosa che già esisteva altrove non è la
             * stessa cosa di "appena creato troppo grande").
             *
             * Meccanica: un render con riflussoAutomaticoSospeso attivo mostra il blocco alla sua
             * dimensione NATURALE (anche se sfora oltre la linea "fine pagina A4") invece di farlo
             * sparire subito su una pagina successiva — solo così si può MISURARE l'eccesso e
             * decidere prima che accada, non dopo. Se non c'è overflow non si chiede nulla (caso
             * comune, blocco piccolo o pagina con molto spazio libero). */
            async function gestisciInserimentoBloccoNuovoConOverflow(page, blockObj) {
                // Attende che i font siano davvero caricati (bug della stessa famiglia di quelli
                // già risolti altrove in questa zona, qui solo teorico/mai segnalato ma verificato
                // durante un audit: se il primo render dopo l'inserimento capita mentre il font è
                // ancora in caricamento, getBoundingClientRect() qui sotto misura con le metriche
                // del font di fallback, più stretto/più largo di quello vero — l'altezza calcolata
                // può risultare leggermente sbagliata proprio nel momento in cui questa funzione
                // decide se il blocco sfora o no). document.fonts.ready si risolve subito se i font
                // sono già pronti (praticamente sempre, dopo il primissimo caricamento della pagina),
                // quindi qui non introduce un'attesa percepibile nella stragrande maggioranza dei
                // casi — solo una rete di sicurezza per il caso raro.
                if (typeof document !== 'undefined' && document.fonts && document.fonts.ready) {
                    try { await document.fonts.ready; } catch (e) { /* mai bloccare l'inserimento per questo */ }
                }
                riflussoAutomaticoSospeso = true;
                renderTemplateEditorCanvas();
                riflussoAutomaticoSospeso = false;

                const indiceEccesso = trovaRigaRealeInEccesso();
                if (indiceEccesso < 0) {
                    // Non sfora: nessuna domanda, il render "pulito" appena fatto resta valido così.
                    renderTemplateEditorPalette();
                    renderSuggerimentiLayoutEditor();
                    return;
                }

                const etichettaTipo = (REPORT_BLOCK_TYPES[blockObj.type] && REPORT_BLOCK_TYPES[blockObj.type].label) || blockObj.type;
                const scelta = await appDialog(
                    `Il blocco "${etichettaTipo}" appena inserito è più alto dello spazio rimasto su questa pagina.`,
                    /* QUATTRO STRADE, non tre (richiesto esplicitamente: «dev'esserci anche
                     * un'opzione per annullare il piazzamento»). Prima si poteva solo spostarlo,
                     * adattarlo o inserirlo com'è, e non esisteva il caso «niente di tutto questo,
                     * fai sparire il blocco appena messo»: chi lo voleva doveva chiudere il
                     * dialogo (che equivale a "Nuova pagina", non annulla nulla) e poi eliminare il
                     * blocco a mano. L'adattamento resta la scelta principale perché è quella che
                     * quasi sempre si vuole; la rinuncia (ESC, tocco fuori) porta alla nuova
                     * pagina, che è la strada che non modifica niente di quello che l'utente ha
                     * appena messo — "Annulla piazzamento" è l'unica che lo fa sparire del tutto. */
                    { confirm: true, title: 'Il blocco non entra nella pagina',
                      okLabel: 'Adatta a questa pagina', extraLabel: 'Inserisci ugualmente',
                      extra2Label: 'Annulla piazzamento', cancelLabel: 'Nuova pagina' }
                );

                if (scelta === 'extra2') {
                    // Riusa l'undo standard dell'editor: salvaUndoSnapshotEditor() è già stato
                    // chiamato in terminaTrascinamentoEditor subito prima di inserisciBloccoInPagina,
                    // quindi il primo (e unico, nessun'altra mutazione è potuta avvenire nel
                    // frattempo: il dialogo era modale) snapshot in cima allo stack è esattamente lo
                    // stato di prima di questo drop — nessuna logica di rimozione su misura serve.
                    // senzaTraccia: è una rinuncia, non un Annulla — Ripeti non deve poter rimettere
                    // il blocco scavalcando il controllo sullo spazio che questo dialogo ha appena fatto.
                    undoTemplateEditor({ senzaTraccia: true });
                    renderSuggerimentiLayoutEditor();
                    return;
                }

                if (scelta === 'extra') {
                    // Inserisci ugualmente: nessun ridimensionamento, e il riflusso automatico non
                    // lo sposta (vedi rigaContieneBloccoBloccato). Resta l'avviso di sforamento in
                    // stampa, che è l'unico posto in cui questa scelta ha un costo.
                    blockObj.fuoriMargineAccettato = true;
                    mostraToastTemplateEditor('Blocco inserito così com\'è: supera il margine della pagina');
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPagesStrip();
                    renderTemplateEditorPageControls();
                    renderTemplateEditorPalette();
                    renderSuggerimentiLayoutEditor();
                    return;
                }

                if (scelta === true) {
                    // Adatta: riduce scale/rigaScale del blocco appena inserito quanto basta per
                    // farlo stare nello spazio rimasto. Prima versione: un unico calcolo dal
                    // rapporto tra altezza misurata e sforo, poi applicato una sola volta — NON
                    // funzionava sempre (segnalato: "il blocco viene comunque posto in una nuova
                    // pagina"), perché misurava .tpl-editor-block-inner (il solo elemento a cui è
                    // applicato lo zoom) mentre quello che conta davvero per lo sforo di riga è il
                    // contenitore .tpl-editor-block, che ha intorno il padding di
                    // .tpl-editor-block-body e il bordo di .tpl-editor-block — spazio FISSO che non
                    // si restringe con lo zoom, quindi il calcolo sottostimava sempre quanto
                    // ridurre. Ora si misura .tpl-editor-block-body (che include quel padding fisso
                    // — ed esiste con lo stesso id del blocco anche quando è impilato dentro un
                    // .tpl-editor-stack, a differenza del contenitore .tpl-editor-block esterno che
                    // in quel caso userebbe l'id della colonna) e, invece di fidarsi di un solo
                    // calcolo "a occhio" (zoom e aspect-ratio non sono sempre perfettamente lineari
                    // da prevedere), si rimisura dal vivo dopo ogni riduzione e si ripete finché non
                    // entra davvero, fino a un massimo di tentativi.
                    const bloccoARighe = BLOCCHI_CON_FONT_REGOLABILE.has(blockObj.type);
                    // Grafico stratigrafia e foto libere NON usano scale/rigaScale (rispettivamente
                    // altezzaScalaGrafico e heightMm — vedi lo stesso ramo a 4 vie già usato dalle
                    // maniglie di ridimensionamento dirette, poco più sotto in questo file): prima
                    // di questo fix il ciclo sotto mutava sempre blockObj.scale anche per questi due
                    // tipi, che il rendering ignora — 14 tentativi a vuoto, nessun restringimento
                    // visibile, segnalato come "non adatta davvero, va su una pagina nuova da solo".
                    const bloccoFoto = blockObj.type === 'immagine-libera';
                    const bloccoGrafico = blockObj.type === 'grafico-stratigrafia';
                    function leggiValoreAdatta() {
                        return bloccoARighe ? (blockObj.rigaScale || 1)
                             : bloccoFoto ? (blockObj.heightMm || 70)
                             : bloccoGrafico ? (blockObj.altezzaScalaGrafico || 1)
                             : (blockObj.scale || 1);
                    }
                    function scriviValoreAdatta(v) {
                        if (bloccoARighe) blockObj.rigaScale = v;
                        else if (bloccoFoto) blockObj.heightMm = v;
                        else if (bloccoGrafico) blockObj.altezzaScalaGrafico = v;
                        else blockObj.scale = v;
                    }
                    // scalaMin/MARGINE_SICUREZZA_PX: hoisted a costanti di modulo (vedi
                    // scalaMinimaBlocco, vicino a BLOCCHI_FLOWABLE) così il semaforo predittivo del
                    // drag (valutaQualitaPiazzamento) non può mai disallinearsi da questo algoritmo
                    // reale — stessi valori, un solo posto dove sono definiti. scalaMinimaBlocco
                    // conosce solo bloccoARighe/altro: qui serve anche il minimo delle foto (20mm,
                    // in millimetri assoluti, non un rapporto — stesso valore delle maniglie dirette).
                    const scalaMin = bloccoFoto ? 20 : scalaMinimaBlocco(blockObj.type);
                    riflussoAutomaticoSospeso = true;
                    // Rimisura lo sforamento reale (richiede un render: la geometria di un blocco
                    // appena toccato non è valida finché non si ridisegna). Ritorna null se non
                    // riesce a misurare (elemento non trovato) — trattato come "non risolto",
                    // stessa prudenza di prima.
                    function misuraSforamentoAdatta() {
                        renderTemplateEditorCanvas();
                        const linea = document.getElementById('templateEditorA4Line');
                        const blockEl = document.querySelector(`.tpl-editor-block-body[data-block-id="${blockObj.id}"]`);
                        if (!linea || !blockEl) return null;
                        return blockEl.getBoundingClientRect().bottom - linea.getBoundingClientRect().top;
                    }
                    // RISCRITTO su richiesta esplicita, dopo un caso reale rimasto rotto (tabella
                    // colpi con molti intervalli, "Adatta" la piazzava su una nuova pagina SENZA
                    // alcuna modifica visibile): "la prima cosa che deve fare è controllare che il
                    // blocco non tocchi oltre il margine, in tal caso abbassare al minimo TUTTO lo
                    // slider dell'altezza delle righe, e solo dopo controllare lateralmente" — non
                    // più una discesa graduale a piccoli passi (fino a 14 tentativi con un fattore
                    // di riduzione per volta, che con un blocco molto più alto dello spazio residuo
                    // poteva restare indietro o non convergere in tempo utile), ma un salto diretto
                    // al minimo seguito da UNA sola rimisura — più deciso, e più difficile da
                    // lasciare "a metà" per un caso limite non previsto dal calcolo del fattore.
                    let entratoNellaPagina = false;
                    let overflowPx = misuraSforamentoAdatta();
                    if (overflowPx !== null && overflowPx <= MARGINE_SICUREZZA_PX) entratoNellaPagina = true;

                    // PASSO 1 — ALTEZZA (righe) al minimo, subito, se il blocco sfora davvero.
                    if (!entratoNellaPagina) {
                        scriviValoreAdatta(scalaMin);
                        overflowPx = misuraSforamentoAdatta();
                        if (overflowPx !== null && overflowPx <= MARGINE_SICUREZZA_PX) entratoNellaPagina = true;
                    }

                    // PASSO 2 — LARGHEZZA, SOLO DOPO e SOLO se ancora fuori margine E il blocco
                    // condivide la riga con almeno un altro (richiesto esplicitamente: "solo dopo
                    // controllare lateralmente" — da solo il blocco è già a piena riga, non c'è
                    // altra larghezza da guadagnare). Il CSS usa flex:${colSpan} 1 0 (vedi
                    // flexEntryCss): colSpan è un PESO relativo ai fratelli della riga, non una
                    // frazione assoluta di page.cols — aumentarlo sposta proporzionalmente spazio
                    // dai vicini senza dover toccare il LORO colSpan. Salto diretto al massimo
                    // consentito (80% della riga: i vicini mantengono sempre almeno il 20%
                    // combinato), stessa logica "un salto solo, poi rimisura" del passo 1.
                    if (!entratoNellaPagina) {
                        const vocePropria = trovaVoceContenenteBlocco(page, blockObj.id);
                        const indiceRigaPropria = vocePropria ? trovaIndiceRigaPerVoce(page, vocePropria.id) : -1;
                        const rigaPropria = indiceRigaPropria >= 0 ? page.rows[indiceRigaPropria] : null;
                        if (rigaPropria && rigaPropria.blocks.length > 1) {
                            const cols = page.cols || 4;
                            const sommaAltri = rigaPropria.blocks.filter(b => b.id !== blockObj.id).reduce((s, b) => s + (b.colSpan || cols), 0);
                            const colSpanMassimo = sommaAltri * 4;
                            if ((blockObj.colSpan || cols) < colSpanMassimo) {
                                blockObj.colSpan = colSpanMassimo;
                                overflowPx = misuraSforamentoAdatta();
                                if (overflowPx !== null && overflowPx <= MARGINE_SICUREZZA_PX) entratoNellaPagina = true;
                            }
                        }
                    }
                    riflussoAutomaticoSospeso = false;
                    const valoreFinale = leggiValoreAdatta();
                    if (!entratoNellaPagina) {
                        /* L'ADATTAMENTO NON CE L'HA FATTA: si inserisce com'è (richiesto
                         * esplicitamente: «se il ridimensionamento automatico fallisce allora
                         * semplicemente lo inserisce così com'è»). Prima si usciva di qui senza
                         * fare niente e il riflusso, riattivandosi, lo spostava sulla pagina dopo:
                         * l'utente aveva chiesto «adattalo qui» e si ritrovava un blocco
                         * rimpicciolito al minimo E spostato altrove — il peggio di entrambe le
                         * scelte, e nessuna delle due era quella che aveva fatto. */
                        blockObj.fuoriMargineAccettato = true;
                    }
                    // Le foto misurano in mm assoluti, non in percentuale di una scala 0-1: il
                    // messaggio deve dirlo in mm, altrimenti "adattato al 4200%" non ha senso.
                    const descrizioneValoreFinale = bloccoFoto ? `${Math.round(valoreFinale)}mm` : `${Math.round(valoreFinale * 100)}%`;
                    mostraToastTemplateEditor(entratoNellaPagina
                        ? `Blocco adattato a ${descrizioneValoreFinale} per stare nella pagina`
                        : `Ridotto al minimo (${descrizioneValoreFinale}) e inserito comunque: resta più alto dello spazio rimasto`);
                }
                // "Nuova pagina" (esplicito o per rinuncia/chiusura della domanda): nessuna modifica
                // qui, il prossimo render con il riflusso di nuovo attivo lo sposterà da solo, con
                // lo stesso avviso che avrebbe mostrato senza questa domanda.
                renderTemplateEditorCanvas();
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorPalette();
                renderSuggerimentiLayoutEditor();
            }

