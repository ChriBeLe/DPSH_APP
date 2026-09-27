            // ================= IL MENU DELLA CHIOCCIOLA =================
            // Scritto a mano come plugin di ProseMirror, non con l'estensione `suggestion` di
            // TipTap: quella non e' nel nostro pacchetto, e aggiungerla avrebbe voluto dire
            // rifare e riverificare tutto il motore per un menu. La barretta sulla selezione e
            // la ricerca nelle note sono gia' scritte cosi' e funzionano: stessa strada.
            //
            // Il meccanismo e' semplice: si guarda il testo appena PRIMA del cursore; se e' una
            // chiocciola seguita da lettere, si mostra l'elenco filtrato; scegliendo, si
            // cancella quel pezzo di testo e si inserisce il nodo.
            {
                let pannelloTag = null;
                let indiceTag = 0;

                // QUALE EDITOR. Ce ne sono DUE montati sullo stesso motore: quello delle note di
                // progetto e quello del blocco di testo del template. Il menu era agganciato solo
                // al primo — e i tag servono soprattutto nel secondo, che e' dove si scrive la
                // relazione: ecco perche' scrivendo @ non compariva niente.
                // Qui si chiede quale dei due ha davvero il fuoco. E' l'unica domanda sensata, e
                // non va rifatta il giorno in cui nascera' un terzo editor.
                // editorAttivo() e' definita accanto ai due editor: vedi sopra.

                function chiudiMenuTag() {
                    if (pannelloTag) { pannelloTag.remove(); pannelloTag = null; }
                }
                /** Il pezzo "@qualcosa" davanti al cursore, se c'e'. */
                function chiocciolaDavantiAlCursore() {
                    const ed = editorAttivo();
                    if (!ed) return null;
                    const { state } = ed;
                    const { from, empty } = state.selection;
                    if (!empty) return null;
                    const inizioRiga = state.doc.resolve(from).start();
                    const prima = state.doc.textBetween(inizioRiga, from, '\n', '\0');
                    // La chiocciola vale solo a inizio parola: un indirizzo di posta scritto nel
                    // testo non deve far comparire un menu.
                    const m = prima.match(/(?:^|\s)@([\p{L}àèéìòù ]{0,24})$/u);
                    if (!m) return null;
                    return { filtro: m[1], daPos: from - m[1].length - 1 };
                }
                function mostraMenuTag(ctx) {
                    const voci = TAG_DISPONIBILI.concat(tagFigureDisponibili()).filter(t => {
                        const q = ctx.filtro.trim().toLowerCase();
                        return !q || t.etichetta.toLowerCase().includes(q) || t.tipo.toLowerCase().includes(q);
                    });
                    if (voci.length === 0) { chiudiMenuTag(); return; }
                    if (indiceTag >= voci.length) indiceTag = 0;
                    if (!pannelloTag) {
                        pannelloTag = document.createElement('div');
                        pannelloTag.id = 'menuTagNota';
                        pannelloTag.className = 'menu-tag';
                        document.body.appendChild(pannelloTag);
                    }
                    let gruppo = '';
                    pannelloTag.innerHTML = voci.map((t, i) => {
                        const testa = t.gruppo !== gruppo ? `<div class="menu-tag-gruppo">${t.gruppo}</div>` : '';
                        gruppo = t.gruppo;
                        const r = globalThis.risolviTagPerVista(t.tipo);
                        return testa + `<button type="button" class="menu-tag-voce${i === indiceTag ? ' is-active' : ''}" data-tag-scelto="${t.tipo}">
                            <span class="menu-tag-nome">${escapeHtmlDidascalia(t.etichetta)}</span>
                            <span class="menu-tag-valore">${r.valore ? escapeHtmlDidascalia(r.valore) : '— da compilare'}</span>
                        </button>`;
                    }).join('');
                    // Sotto il cursore, non in un angolo: il menu deve stare dove si guarda.
                    try {
                        const ed2 = editorAttivo();
                        if (!ed2) return;
                        const coord = ed2.view.coordsAtPos(ed2.state.selection.from);
                        pannelloTag.style.left = Math.max(8, Math.min(window.innerWidth - 268, coord.left)) + 'px';
                        pannelloTag.style.top = (coord.bottom + 6) + 'px';
                    } catch (e) { /* senza geometria il menu resta dov'e': meglio che non comparire */ }
                    pannelloTag.querySelectorAll('[data-tag-scelto]').forEach(b => {
                        b.addEventListener('mousedown', (ev) => {
                            ev.preventDefault();
                            scegliTag(b.dataset.tagScelto, ctx);
                        });
                    });
                }
                function scegliTag(tipo, ctx) {
                    const ed = editorAttivo();
                    if (!ed || !ctx) return;
                    const a = ed.state.selection.from;
                    ed.chain().focus()
                        .deleteRange({ from: ctx.daPos, to: a })
                        .inserisciTag(tipo)
                        .run();
                    chiudiMenuTag();
                }
                function aggiornaMenuTag() {
                    const ctx = chiocciolaDavantiAlCursore();
                    if (!ctx) { chiudiMenuTag(); return; }
                    mostraMenuTag(ctx);
                }
                globalThis.__aggiornaMenuTag = aggiornaMenuTag;
                globalThis.__chiudiMenuTag = chiudiMenuTag;

                // Frecce e Invio: il menu si usa senza staccare le mani dalla tastiera.
                document.addEventListener('keydown', (e) => {
                    if (!pannelloTag) return;
                    const voci = [...pannelloTag.querySelectorAll('[data-tag-scelto]')];
                    if (voci.length === 0) return;
                    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        indiceTag = (indiceTag + (e.key === 'ArrowDown' ? 1 : voci.length - 1)) % voci.length;
                        voci.forEach((v, i) => v.classList.toggle('is-active', i === indiceTag));
                    } else if (e.key === 'Enter') {
                        e.preventDefault();
                        const ctx = chiocciolaDavantiAlCursore();
                        if (ctx) scegliTag(voci[indiceTag].dataset.tagScelto, ctx);
                    } else if (e.key === 'Escape') {
                        chiudiMenuTag();
                    }
                }, true);

                /** LA SCELTA DELLA FIGURA, dalla pastiglia sul foglio.
                 *
                 * L'elenco e' lo stesso del menu @, ma qui conta soprattutto l'ultima parte:
                 * i ruoli («l'inquadramento», «la figura seguente») si arrangiano da soli e
                 * quasi non si toccano — e' fra le FOTO DELLE PROVE che serve dire quale, ed e'
                 * per quello che questa finestra esiste.
                 *
                 * Il tag si riscrive nel documento, non si cancella e rifa': cosi' il testo
                 * attorno non si muove di una virgola. */
                async function scegliBersaglioFigura(pastiglia, chiaveAttuale) {
                    const contenitore = pastiglia.closest('[data-block-id]');
                    const blockId = contenitore ? contenitore.getAttribute('data-block-id') : null;
                    const indice = parseInt(pastiglia.getAttribute('data-tag-i'), 10);
                    const voci = tagFigureDisponibili();
                    if (!blockId || !isFinite(indice)) {
                        appAlert(etichettaBersaglioFigura(chiaveAttuale).toUpperCase()
                            + '\n\nQuesto riferimento si puo\' cambiare dal foglio dell\'editor: toccalo li\'.');
                        return;
                    }
                    const attuale = (chiaveAttuale === 'figuraSeguente') ? 'figura' : chiaveAttuale;
                    const esito = await appPromptCampi(
                        'Il numero lo calcola l\'app: cambia da solo se sposti le figure o ne aggiungi una.',
                        [{ name: 'bersaglio', label: 'A quale figura punta questo riferimento?',
                           type: 'select', value: attuale,
                           options: voci.map(v => ({ value: v.tipo, label: v.etichetta })) }],
                        { title: 'Riferimento alla figura', okLabel: 'Usa questa' }
                    );
                    if (!esito || !esito.bersaglio || esito.bersaglio === chiaveAttuale) return;
                    const pagina = paginaOrigineBlocco(blockId);
                    const blk = pagina ? trovaBloccoPerId(pagina, blockId) : null;
                    if (!blk) { appAlert('Il blocco di testo non si trova piu\': riapri l\'editor e riprova.'); return; }
                    const nuovo = cambiaTipoTagNelBlocco(blk.richHtml, indice, esito.bersaglio);
                    if (nuovo === null) { appAlert('Non sono riuscito a cambiare il riferimento. Riprova aprendo il testo del blocco.'); return; }
                    if (typeof salvaUndoSnapshotEditor === 'function') salvaUndoSnapshotEditor();
                    blk.richHtml = nuovo;
                    aggiornaPastiglieTag();
                    if (typeof renderTemplateEditorCanvas === 'function') renderTemplateEditorCanvas();
                }

                // ---- toccare una pastiglia: si compila o si corregge, SUL PROGETTO ----
                document.addEventListener('click', async (e) => {
                    if (!e.target || !e.target.closest) return;
                    // DUE FORME DELLO STESSO CONCETTO. Il tag `@` inserito a mano porta
                    // data-tag; il segnaposto del testo generato porta data-dato. Sono nati in
                    // momenti diversi ma dicono la stessa cosa — "qui va il dato X" — e le
                    // chiavi coincidono. Quindi si toccano allo stesso modo: quello che conta,
                    // per chi guarda il foglio, e' che dove si vede il buco ci sia anche il
                    // posto per tapparlo.
                    const pastiglia = e.target.closest('.dpsh-tag[data-tag], .dato-cantiere[data-dato]');
                    if (!pastiglia) return;
                    const chiave = pastiglia.getAttribute('data-tag') || pastiglia.getAttribute('data-dato');
                    // Un tag fuori dal registro NON deve restare muto al tocco: prima usciva da
                    // qui in silenzio, e la pastiglia sembrava semplicemente rotta. Se la chiave
                    // e' un valore che l'app conosce, si spiega da dove viene; se non lo e', si
                    // dice anche quello.
                    const def = tagPerTipo(chiave) || { tipo: chiave, etichetta: etichettaTag(chiave, valoriCantiere(progettoPerTag())), campo: null };
                    // Il tocco non deve anche selezionare il blocco sotto: sono due gesti, e
                    // l'utente ne ha chiesto uno solo.
                    e.preventDefault();
                    e.stopPropagation();
                    const proj = progettoPerTag();
                    if (!proj) { appAlert('Scegli prima un cantiere nella tendina «Anteprima con i dati di», in alto nell\'editor: senza, non c\'e\' nessun posto dove scrivere il dato.'); return; }
                    const dove = nomeProgettoPerAvviso(proj);
                    if (TAG_RISOLTI_A_DOCUMENTO[chiave] || eRiferimentoFigura(chiave)) {
                        // SI SCEGLIE QUI, toccando. Prima la finestra diceva «cancella il tag e
                        // riscrivilo con @»: non e' una risposta, e' il programma che scarica sul
                        // lettore un lavoro che sa fare da solo.
                        await scegliBersaglioFigura(pastiglia, chiave);
                        return;
                    }
                    if (!def.campo) {
                        // Dati calcolati (numero di prove, coefficiente, frasi concordate): non
                        // si correggono a mano, si correggono alla fonte. Dirlo — e dire QUALE
                        // fonte — e' piu' utile che aprire un campo che verrebbe ricalcolato
                        // sopra al primo cambiamento.
                        const r = globalThis.risolviTagPerVista(def.tipo);
                        appAlert(def.etichetta.toUpperCase() + '\n\nCantiere: ' + dove
                            + '\n\nValore attuale: ' + (r.valore || '— non ancora disponibile')
                            + '\n\nQuesto dato l\'app lo calcola da sola, dalle prove e dallo strumento: si corregge li\', non qui. Cambiando i dati alla fonte, il testo si riadatta da solo.');
                        return;
                    }
                    const attuale = proj[def.campo] || '';
                    // DIRE COSA SI STA COMPILANDO, E DI QUALE CANTIERE. La finestra mostrava
                    // «Inserisci / [object Object]»: appPrompt vuole (messaggio, valore, opzioni)
                    // e le si passava un oggetto, che finiva stampato cosi'. Peggio: il valore
                    // di ritorno e' una stringa, e il codice leggeva `esito.v` — cioe' avrebbe
                    // scritto `undefined` nel campo del cantiere.
                    const casaDelDato = def.dove === 'prova'
                        ? 'Verra\' scritto nell\'Intestazione Cantiere, per tutte le prove di questo cantiere.'
                        : 'Verra\' scritto nell\'anagrafica del cantiere.';
                    const esito = await appPromptCampi(
                        'Cantiere: ' + dove + '\n' + casaDelDato,
                        [{ name: 'valore', label: def.etichetta, value: attuale,
                           placeholder: attuale ? '' : 'non ancora compilato', required: false }],
                        { title: 'Compila: ' + def.etichetta, okLabel: 'Salva nel cantiere' }
                    );
                    if (!esito) return;
                    // LA CORREZIONE VA SUI DATI DEL CANTIERE, non su una copia dentro il testo:
                    // cosi' vale ovunque quel dato compaia, adesso e nelle prossime relazioni.
                    scriviDatoCantiere(proj, def, esito.valore);
                    aggiornaPastiglieTag();
                    if (typeof renderTemplateEditorCanvas === 'function') renderTemplateEditorCanvas();
                });
            }

            // ---- Formule: pedice, apice, carattere matematico, simboli ----
            {
                // CHIEDEVA L'EDITOR ATTIVO E POI SCRIVEVA NELLE NOTE. Premuto dalla barra del
                // blocco di testo, il pedice finiva nelle note del progetto: non un pulsante
                // inerte — un pulsante che scrive nel posto sbagliato, che e' peggio, perche'
                // non si vede nemmeno che e' successo.
                const azioni = {
                    pedice: (e) => e.chain().focus().toggleSubscript().run(),
                    apice: (e) => e.chain().focus().toggleSuperscript().run(),
                    formula: (e) => e.chain().focus().alternaFormula().run()
                };
                Object.keys(azioni).forEach(nome => {
                    document.querySelectorAll('.note-toolbar [data-comando-nota="' + nome + '"]').forEach(b => {
                        b.addEventListener('click', () => { const e = editorAttivo(); if (e) { azioni[nome](e); dopoComandoTesto(true); } });
                    });
                });
                // LA PALETTA. Non un editor di equazioni — quello e' un progetto a se' — ma i
                // simboli che servono davvero alle formule di una relazione geotecnica: con
                // questi, pedice e apice, la formula olandese si scrive in venti secondi.
                const SIMBOLI = ['√', '∙', '×', '÷', '±', '≤', '≥', '≠', '≈', '°', '′', '″',
                                 'α', 'β', 'γ', 'δ', 'θ', 'λ', 'μ', 'π', 'ρ', 'σ', 'τ', 'φ', 'ω',
                                 'Δ', 'Σ', 'Ω', '∞', '∫', '∂', '≡', '⁄'];
                document.querySelectorAll('.note-toolbar [data-comando-nota="simboli"]').forEach(btnSimboli => {
                  btnSimboli.addEventListener('click', () => {
                    if (!editorAttivo()) return;
                    let pannello = document.getElementById('palettaSimboli');
                    if (pannello) { pannello.remove(); return; }
                    pannello = document.createElement('div');
                    pannello.id = 'palettaSimboli';
                    pannello.className = 'note-toolbar';
                    pannello.style.cssText = 'flex-wrap:wrap; gap:2px; padding:6px; border:1px solid var(--border); border-radius:8px; background:var(--bg-sunken); margin-top:4px;';
                    pannello.innerHTML = SIMBOLI.map(c =>
                        `<button type="button" class="note-tb-btn" data-simbolo="${c}" style="font-family:var(--tpl-font-formule, serif); font-size:14px;">${c}</button>`).join('');
                    // .closest('#noteToolbar') era null quando il pulsante stava nella barra del
                    // blocco di testo: la paletta non compariva e non c'era nessun errore a
                    // dirlo. Si ancora alla barra che contiene il pulsante, qualunque sia.
                    const barra = btnSimboli.closest('.note-toolbar');
                    if (barra) barra.insertAdjacentElement('afterend', pannello);
                    else btnSimboli.insertAdjacentElement('afterend', pannello);
                    pannello.querySelectorAll('[data-simbolo]').forEach(b => {
                        b.addEventListener('click', () => {
                            const ed3 = editorAttivo();
                            if (ed3) ed3.chain().focus().insertContent(b.dataset.simbolo).run();
                        });
                    });
                  });
                });
            }

            // ---- Interruzione di pagina e regole del paragrafo ----
            {
                document.querySelectorAll('.note-toolbar [data-comando-nota="interruzione"]').forEach(btnInt => {
                    btnInt.addEventListener('click', () => {
                        const ed = editorAttivo();
                        if (ed) ed.chain().focus().inserisciInterruzionePagina().run();
                    });
                });
                // IL TASTO @: scrive la chiocciola dove sta il cursore e apre lo stesso menu.
                // Una funzione che esiste solo per chi indovina la scorciatoia, per la maggior
                // parte delle persone non esiste.
                document.querySelectorAll('.note-toolbar [data-comando-nota="inserisci-tag"]').forEach(btnAt => {
                    btnAt.addEventListener('click', () => {
                        const ed = editorAttivo();
                        if (!ed) return;
                        // Uno spazio davanti se il cursore non e' a inizio riga: la chiocciola
                        // vale solo a inizio parola, e senza lo spazio il menu non si aprirebbe.
                        const testoPrima = ed.state.doc.textBetween(
                            ed.state.doc.resolve(ed.state.selection.from).start(), ed.state.selection.from, '\n', '\0');
                        const prefisso = (testoPrima === '' || /\s$/.test(testoPrima)) ? '@' : ' @';
                        ed.chain().focus().insertContent(prefisso).run();
                        if (globalThis.__aggiornaMenuTag) globalThis.__aggiornaMenuTag();
                    });
                });
                document.querySelectorAll('.note-toolbar [data-comando-nota="regola-pagina"]').forEach(selReg => {
                  selReg.addEventListener('change', () => {
                    const ed = editorAttivo();
                    if (!ed) return;
                    // Stringa vuota = nessuna regola. Si passa null, non '': l'attributo deve
                    // SPARIRE, non restare come dichiarazione vuota che poi qualcuno legge.
                    ed.chain().focus().impostaRegolaPagina(selReg.value || null).run();
                  });
                });
            }

            // ---- Tabella ----
            /** Chiede righe e colonne e inserisce una tabella VERA: non piu' una stringa HTML
             * infilata nel documento (che nasceva e poi era quasi immodificabile), ma un nodo che
             * il motore conosce — da cui i comandi aggiungi/togli riga e colonna della barra
             * contestuale qui sotto funzionano davvero. */
            async function inserisciTabellaNellaNota() {
                // L'editor ATTIVO: dalla barra del blocco di testo, la tabella finiva nelle note
                // del progetto invece che nel blocco.
                const editorNote = editorAttivo();
                if (!editorNote) return;
                const misure = await appPromptCampi('', [
                    { name: 'righe', label: 'Righe (inclusa l\'intestazione)', value: 3, type: 'number', min: 1, max: 20 },
                    { name: 'colonne', label: 'Colonne', value: 3, type: 'number', min: 1, max: 10 }
                ], { title: 'Inserisci tabella', okLabel: 'Inserisci' });
                if (!misure) return; // annullato: nessuna tabella inserita
                let righe = parseInt(misure.righe, 10);
                if (!righe || righe < 1) righe = 3;
                righe = Math.min(righe, 20);
                let colonne = parseInt(misure.colonne, 10);
                if (!colonne || colonne < 1) colonne = 3;
                colonne = Math.min(colonne, 10);
                editorNote.chain().focus().insertTable({ rows: righe, cols: colonne, withHeaderRow: true }).run();
                dopoComandoTesto(true);
            }
            collegaComandoTesto('tabella', inserisciTabellaNellaNota);

            // ---- Barra contestuale della tabella ----
            // Compare solo col cursore dentro una tabella. Prima non poteva esistere: una tabella
            // inserita come stringa non era un oggetto a cui chiedere "aggiungi una riga".
            const noteTableBar = document.getElementById('noteTableBar');
            function aggiornaBarraTabellaNota() {
                if (!noteTableBar) return;
                noteTableBar.style.display = (editorNote && editorNote.isActive('table')) ? 'flex' : 'none';
            }
            if (noteTableBar) {
                const AZIONI_TABELLA = {
                    'riga-dopo': 'addRowAfter', 'riga-via': 'deleteRow',
                    'col-dopo': 'addColumnAfter', 'col-via': 'deleteColumn',
                    'intestazione': 'toggleHeaderRow', 'tabella-via': 'deleteTable'
                };
                noteTableBar.querySelectorAll('[data-tab-cmd]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const nome = AZIONI_TABELLA[btn.dataset.tabCmd];
                        if (!editorNote || !nome) return;
                        editorNote.chain().focus()[nome]().run();
                        salvaNoteProgettoCorrente(true);
                    });
                });
            }

            // ---- Link ----
            collegaComandoTesto('link', async () => {
                {
                    const editorNote = editorAttivo();
                    if (!editorNote) return;
                    // Su un link gia' esistente il pulsante lo TOGLIE: prima non c'era modo di
                    // disfare un link se non cancellando il testo e riscrivendolo.
                    if (editorNote.isActive('link')) {
                        editorNote.chain().focus().extendMarkRange('link').unsetLink().run();
                        salvaNoteProgettoCorrente(true);
                        return;
                    }
                    const selezioneVuota = editorNote.state.selection.empty;
                    const campi = [{ name: 'url', label: 'Indirizzo', value: 'https://', placeholder: 'https://esempio.it' }];
                    if (selezioneVuota) campi.push({ name: 'testo', label: 'Testo da mostrare', value: '', placeholder: 'lascia vuoto per usare l\'indirizzo', required: false });
                    const dati = await appPromptCampi('', campi, { title: 'Inserisci link', okLabel: 'Inserisci' });
                    if (!dati) return;
                    const url = String(dati.url || '').trim();
                    if (!url) return;
                    if (selezioneVuota) {
                        const testo = String(dati.testo || '').trim() || url;
                        editorNote.chain().focus().insertContent({
                            type: 'text', text: testo,
                            marks: [{ type: 'link', attrs: { href: url, target: '_blank', rel: 'noopener' } }]
                        }).run();
                    } else {
                        editorNote.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
                    }
                    dopoComandoTesto(true);
                }
            });

            // ---- Linea divisoria ----
            collegaComandoTesto('riga-divisoria', () => {
                const ed = editorAttivo();
                if (!ed) return;
                ed.chain().focus().setHorizontalRule().run();
                dopoComandoTesto(true);
            });

            // ---- Annulla / Ripeti / Pulisci formattazione ----
            // Annulla e ripeti conoscono ANCHE immagini, disegni e tabelle: passano tutti dalla
            // stessa pila di transazioni. Con execCommand('undo') non era cosi', ed e' il motivo
            // per cui a volte l'annulla saltava un passo o ne disfaceva uno sbagliato.
            collegaComandoTesto('annulla', () => { const e = editorAttivo(); if (e) { e.chain().focus().undo().run(); dopoComandoTesto(false); } });
            collegaComandoTesto('ripeti',  () => { const e = editorAttivo(); if (e) { e.chain().focus().redo().run(); dopoComandoTesto(false); } });
            /** RIPORTA ALLO STILE DEL TEMPLATE.
             *
             * Diverso da «pulisci», che toglie tutto e riporta a paragrafo: qui si tolgono solo
             * le ECCEZIONI di impaginazione — colore, evidenziazione, allineamento, rientri —
             * e restano grassetti, corsivi, titoli, elenchi e tag. Sono due gesti diversi e
             * vanno tenuti separati: «annulla i miei pasticci» non e' «cancella il mio lavoro»,
             * e un tasto solo che facesse entrambe le cose sarebbe usato da nessuno dei due. */
            collegaComandoTesto('riporta-stile', () => {
                const e = editorAttivo();
                if (!e) return;
                const vuoto = e.state.selection.empty;
                let c = e.chain().focus();
                // Su una selezione vuota vale per tutto il testo: e' il caso normale — si preme
                // quando si e' fatto un pasticcio, non si sta selezionando con cura.
                if (vuoto) c = c.selectAll();
                c.unsetHighlight().togliColoreTesto().togliAllineamento();
                c.run();
                // Le eccezioni del BLOCCO (corpo in punti scelto per questo blocco, rientri):
                // vivono sul blocco, non nel testo, e vanno tolte da li'.
                const blk = (typeof tplTextEditorTargetBlockId !== 'undefined' && tplTextEditorTargetBlockId)
                    ? trovaBloccoPerIdOvunque(tplTextEditorTargetBlockId) : null;
                if (blk) { delete blk.fontSizePt; delete blk.fontScale; }
                if (vuoto && e.commands && e.commands.setTextSelection) {
                    // Non lasciare tutto selezionato: sembrerebbe che stia per essere cancellato.
                    e.commands.setTextSelection(e.state.selection.to);
                }
                dopoComandoTesto(true);
                if (typeof aggiornaStatoBarraNote === 'function') aggiornaStatoBarraNote();
            });

            collegaComandoTesto('pulisci', () => {
                const e = editorAttivo();
                if (!e) return;
                // Due gesti distinti e dichiarati: togli i marcatori dal testo, e riporta la
                // riga a paragrafo. removeFormat faceva le due cose insieme e ne portava via
                // anche di terze, senza che si potesse sapere quali.
                e.chain().focus().unsetAllMarks().clearNodes().run();
                dopoComandoTesto(true);
            });

            // ---- Allineamento ----
            // L'allineamento non e' un marcatore che avvolge il testo: e' un attributo della
            // RIGA. Per questo non vive nel gruppo del testo ma in quello della riga, accanto a
            // titolo, citazione ed elenco — le cose che decidono "che cos'e' questa riga".
            const ALLINEAMENTI_NOTA = ['left', 'center', 'right', 'justify'];

            /** L'icona del pulsante mostra l'allineamento della riga in cui si trova il cursore:
             * cosi' il pulsante e' insieme comando e indicatore, e non serve aprirlo per sapere
             * come sta la riga. Vale per TUTTE le barre aperte, non solo per quella delle note. */
            function aggiornaPulsanteAllineamento() {
                const ed = editorAttivo();
                if (!ed) return;
                const attivo = ALLINEAMENTI_NOTA.find(a => ed.isActive({ textAlign: a })) || 'left';
                document.querySelectorAll('[data-comando-nota="allineamento"]').forEach(btn => {
                    const uso = btn.querySelector('use');
                    if (uso) uso.setAttribute('href', '#i-align-' + attivo);
                    btn.classList.toggle('is-active', attivo !== 'left');
                    const pop = pannelloDelPulsante(btn);
                    if (pop) pop.querySelectorAll('[data-allinea]').forEach(b => {
                        b.classList.toggle('is-active', b.dataset.allinea === attivo);
                    });
                });
            }
            collegaComandoTesto('allineamento', (btn, e) => {
                e.stopPropagation();
                e.preventDefault();
                const pop = pannelloDelPulsante(btn);
                if (!pop) return;
                const aperto = pop.style.display === 'block';
                chiudiTuttiIPannelliTesto();
                pop.style.display = aperto ? 'none' : 'block';
            });
            document.querySelectorAll('.note-shape-popover [data-allinea]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const ed = editorAttivo();
                    if (!ed) return;
                    const valore = btn.dataset.allinea;
                    // Ripremere l'allineamento gia' attivo lo toglie, come ogni altro
                    // interruttore della barra: si torna a com'era senza dover indovinare
                    // qual era il valore "normale".
                    if (ed.isActive({ textAlign: valore })) ed.chain().focus().togliAllineamento().run();
                    else ed.chain().focus().impostaAllineamento(valore).run();
                    chiudiTuttiIPannelliTesto();
                    dopoComandoTesto(true);
                    aggiornaPulsanteAllineamento();
                });
            });
            document.querySelectorAll('.note-shape-popover').forEach(p => p.addEventListener('click', (e) => e.stopPropagation()));
            document.addEventListener('click', chiudiTuttiIPannelliTesto);

            // ---- Evidenziatore ----
            // UN solo pulsante al posto di due: toggleHighlight sa spegnersi da solo, quindi
            // ripremere lo stesso colore toglie l'evidenziazione. Con hiliteColor/backColor non
            // era possibile — sapevano solo accendere — ed e' per questo che serviva un secondo
            // pulsante "Nessuna", che resta come scorciatoia per togliere qualunque colore.
            const NOTE_HIGHLIGHT_PALETTE = ['#fef08a', '#bbf7d0', '#bfdbfe', '#fecaca', '#fbcfe8', '#e5e7eb'];
            function applicaEvidenziatoreNota(colore) {
                const ed = editorAttivo();
                if (!ed) return;
                if (colore) ed.chain().focus().toggleHighlight({ color: colore }).run();
                else ed.chain().focus().unsetHighlight().run();
            }
            // I colori si disegnano in OGNI contenitore che li chiede: uno per barra. Erano
            // scritti solo in quello delle note, e nel blocco di testo il pannello si apriva
            // vuoto — un pannello vuoto sembra un guasto, e in effetti lo era.
            document.querySelectorAll('[data-colori-evidenziatore]').forEach(cassa => {
                cassa.innerHTML = NOTE_HIGHLIGHT_PALETTE.map(c => `<button type="button" class="note-draw-color" data-hl-color="${c}" style="background:${c};"></button>`).join('');
                cassa.querySelectorAll('[data-hl-color]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        applicaEvidenziatoreNota(btn.dataset.hlColor);
                        chiudiTuttiIPannelliTesto();
                        dopoComandoTesto(true);
                    });
                });
            });
            collegaComandoTesto('evidenzia-nessuna', () => {
                applicaEvidenziatoreNota(null);
                chiudiTuttiIPannelliTesto();
                dopoComandoTesto(true);
            });
            collegaComandoTesto('evidenzia', (btn, e) => {
                e.stopPropagation();
                e.preventDefault();
                const pop = pannelloDelPulsante(btn);
                if (!pop) return;
                const aperto = pop.style.display === 'block';
                chiudiTuttiIPannelliTesto();
                pop.style.display = aperto ? 'none' : 'block';
            });

