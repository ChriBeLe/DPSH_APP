            // ==================================================================================
            //  RICERCA NELLE NOTE
            //  Due domande diverse, una sola casella. "Dov'e' in questa nota?" -> le occorrenze
            //  si accendono nel testo e ci si sposta con le frecce. "In quale cantiere l'avevo
            //  scritto?" -> sotto compaiono gli altri progetti che contengono quel testo.
            //
            //  Le occorrenze sono DECORAZIONI di ProseMirror: dipingono, non modificano. Quindi
            //  non entrano nella pila dell'annulla, non fanno scattare un salvataggio e non
            //  finiscono nell'HTML della nota — che e' esattamente cio' che serve da una ricerca.
            // ==================================================================================
            const noteSearchRow = document.getElementById('noteSearchRow');
            const noteSearchInput = document.getElementById('noteSearchInput');
            const noteSearchConteggio = document.getElementById('noteSearchConteggio');
            const noteSearchAltri = document.getElementById('noteSearchAltri');
            // Se per qualunque ragione il motore non fosse a bordo, la ricerca semplicemente non
            // esiste: non deve far cadere tutto il resto dello script insieme a se'.
            const RICERCA_DISPONIBILE = !!(window.NoteEditor && window.NoteEditor.pm);
            const CHIAVE_RICERCA_NOTE = RICERCA_DISPONIBILE ? new window.NoteEditor.pm.PluginKey('ricercaNote') : null;
            let testoRicercaNote = '';
            let occorrenzeRicercaNote = [];
            let occorrenzaCorrenteNote = 0;

            function pluginRicercaNote() {
                if (!RICERCA_DISPONIBILE) return null;
                const { Plugin, Decoration, DecorationSet } = window.NoteEditor.pm;
                return new Plugin({
                    key: CHIAVE_RICERCA_NOTE,
                    props: {
                        decorations(stato) {
                            if (!testoRicercaNote || occorrenzeRicercaNote.length === 0) return DecorationSet.empty;
                            const dec = occorrenzeRicercaNote.map((o, i) => Decoration.inline(o.from, o.to, {
                                class: i === occorrenzaCorrenteNote ? 'nota-trovato nota-trovato-corrente' : 'nota-trovato'
                            }));
                            return DecorationSet.create(stato.doc, dec);
                        }
                    }
                });
            }

            /** Ricalcola dove si trova il testo cercato dentro la nota aperta. */
            function ricalcolaRicercaNota(mantieniPosizione) {
                if (!editorNote || !RICERCA_DISPONIBILE) return;
                const prima = occorrenzeRicercaNote.length;
                occorrenzeRicercaNote = [];
                const ago = testoRicercaNote.trim().toLowerCase();
                if (ago) {
                    editorNote.state.doc.descendants((nodo, pos) => {
                        if (!nodo.isText || !nodo.text) return;
                        const testo = nodo.text.toLowerCase();
                        let da = testo.indexOf(ago);
                        while (da !== -1) {
                            occorrenzeRicercaNote.push({ from: pos + da, to: pos + da + ago.length });
                            da = testo.indexOf(ago, da + ago.length);
                        }
                    });
                }
                if (!mantieniPosizione || occorrenzaCorrenteNote >= occorrenzeRicercaNote.length) occorrenzaCorrenteNote = 0;
                if (noteSearchConteggio) {
                    noteSearchConteggio.textContent = !ago ? '—'
                        : (occorrenzeRicercaNote.length === 0 ? 'niente'
                        : `${occorrenzaCorrenteNote + 1} di ${occorrenzeRicercaNote.length}`);
                }
                // Una transazione vuota con un contrassegno: serve solo a far ridisegnare le
                // decorazioni. Non cambia il documento, quindi non fa scattare onUpdate.
                if (prima || occorrenzeRicercaNote.length) {
                    editorNote.view.dispatch(editorNote.state.tr.setMeta(CHIAVE_RICERCA_NOTE, Date.now()));
                }
            }

            function vaiAOccorrenzaNota(passo) {
                if (!editorNote || occorrenzeRicercaNote.length === 0) return;
                const n = occorrenzeRicercaNote.length;
                occorrenzaCorrenteNote = ((occorrenzaCorrenteNote + passo) % n + n) % n;
                const o = occorrenzeRicercaNote[occorrenzaCorrenteNote];
                editorNote.chain().setTextSelection({ from: o.from, to: o.to }).scrollIntoView().run();
                if (noteSearchConteggio) noteSearchConteggio.textContent = `${occorrenzaCorrenteNote + 1} di ${n}`;
                editorNote.view.dispatch(editorNote.state.tr.setMeta(CHIAVE_RICERCA_NOTE, Date.now()));
            }

            /** Cerca la stessa parola nelle note di TUTTI GLI ALTRI progetti, con un pezzo di
             * frase attorno per riconoscere il punto senza doverlo aprire. */
            function cercaNelleAltreNote(ago) {
                const risultati = [];
                const q = String(ago || '').trim().toLowerCase();
                if (q.length < 2) return risultati;
                Object.keys(state.projects || {}).forEach(pid => {
                    if (noteProjectContext && pid === noteProjectContext.projId) return;
                    const proj = state.projects[pid];
                    const html = proj && proj.notes && proj.notes.html;
                    if (!html) return;
                    const testo = noteHtmlToPlainText(html).replace(/\s+/g, ' ').trim();
                    const idx = testo.toLowerCase().indexOf(q);
                    if (idx === -1) return;
                    const quante = testo.toLowerCase().split(q).length - 1;
                    const da = Math.max(0, idx - 30), a = Math.min(testo.length, idx + q.length + 40);
                    risultati.push({
                        projId: pid,
                        nome: proj.name || proj.comune || 'Progetto',
                        quante,
                        pezzo: (da > 0 ? '…' : '') + testo.slice(da, idx) + '\u0000' + testo.slice(idx, idx + q.length) + '\u0001' + testo.slice(idx + q.length, a) + (a < testo.length ? '…' : '')
                    });
                });
                return risultati;
            }

            function renderAltreNoteTrovate(ago) {
                if (!noteSearchAltri) return;
                const risultati = cercaNelleAltreNote(ago);
                if (risultati.length === 0) { noteSearchAltri.classList.remove('aperta'); noteSearchAltri.innerHTML = ''; return; }
                noteSearchAltri.innerHTML = risultati.map(r => {
                    const pezzo = escapeHtmlDidascalia(r.pezzo).replace('\u0000', '<b>').replace('\u0001', '</b>');
                    return `<button type="button" class="note-search-hit" data-vai-progetto="${r.projId}">`
                        + `<b>${escapeHtmlDidascalia(r.nome)}</b> · ${r.quante} ${r.quante === 1 ? 'volta' : 'volte'}<br>${pezzo}</button>`;
                }).join('');
                noteSearchAltri.classList.add('aperta');
                noteSearchAltri.querySelectorAll('[data-vai-progetto]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const pid = btn.dataset.vaiProgetto;
                        const cercato = testoRicercaNote;
                        chiudiNoteProgetto();
                        await apriNoteProgetto(pid);
                        apriRicercaNote(cercato);
                    });
                });
            }

            function apriRicercaNote(precompilato) {
                if (!noteSearchRow) return;
                noteSearchRow.classList.add('aperta');
                if (noteSearchInput) {
                    if (precompilato != null) noteSearchInput.value = precompilato;
                    noteSearchInput.focus();
                    noteSearchInput.select();
                    aggiornaRicercaNote();
                }
            }
            function chiudiRicercaNote() {
                if (noteSearchRow) noteSearchRow.classList.remove('aperta');
                if (noteSearchInput) noteSearchInput.value = '';
                testoRicercaNote = '';
                if (noteSearchAltri) { noteSearchAltri.classList.remove('aperta'); noteSearchAltri.innerHTML = ''; }
                ricalcolaRicercaNota();
            }
            function aggiornaRicercaNote() {
                testoRicercaNote = noteSearchInput ? noteSearchInput.value : '';
                ricalcolaRicercaNota();
                renderAltreNoteTrovate(testoRicercaNote);
            }

            collegaComandoTesto('cerca', () => {
                if (noteSearchRow && noteSearchRow.classList.contains('aperta')) chiudiRicercaNote();
                else apriRicercaNote(null);
            });

            if (noteSearchInput) {
                let attesaRicerca = null;
                noteSearchInput.addEventListener('input', () => {
                    clearTimeout(attesaRicerca);
                    attesaRicerca = setTimeout(aggiornaRicercaNote, 180);
                });
                noteSearchInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); vaiAOccorrenzaNota(e.shiftKey ? -1 : 1); }
                    else if (e.key === 'Escape') { e.preventDefault(); chiudiRicercaNote(); }
                });
            }
            const btnNoteSearchPrec = document.getElementById('btnNoteSearchPrec');
            const btnNoteSearchSucc = document.getElementById('btnNoteSearchSucc');
            const btnNoteSearchChiudi = document.getElementById('btnNoteSearchChiudi');
            if (btnNoteSearchPrec) btnNoteSearchPrec.addEventListener('click', () => vaiAOccorrenzaNota(-1));
            if (btnNoteSearchSucc) btnNoteSearchSucc.addEventListener('click', () => vaiAOccorrenzaNota(1));
            if (btnNoteSearchChiudi) btnNoteSearchChiudi.addEventListener('click', chiudiRicercaNote);

            /** Porta la nota sul nuovo schema UNA volta sola, mettendo da parte l'originale.
             * L'originale non e' un backup tecnico: e' la riga di conferma in fondo alla finestra,
             * che resta li' finche' e' l'utente a dire che la conversione e' andata bene. */
            function preparaNotaPerIlMotore(notes) {
                if (notes.schemaMotore === 2) return;
                if (notes.html) {
                    notes.htmlPrimaDelMotore = notes.html;
                    notes.convertitaIl = Date.now();
                    notes.html = convertiNotaAlNuovoSchema(notes.html);
                }
                notes.schemaMotore = 2;
            }

            function renderRigaConversioneNota() {
                const riga = document.getElementById('noteConversioneRow');
                if (!riga) return;
                const proj = noteProjectContext && state.projects[noteProjectContext.projId];
                const notes = proj ? getProjNotes(proj) : null;
                const originale = notes && notes.htmlPrimaDelMotore;
                riga.style.display = originale ? 'flex' : 'none';
                const lbl = document.getElementById('lblNoteConversione');
                if (lbl && originale) {
                    const quando = notes.convertitaIl ? new Date(notes.convertitaIl).toLocaleDateString('it-IT') : '';
                    lbl.textContent = 'Questa nota e\' passata al nuovo editor' + (quando ? ' il ' + quando : '')
                        + '. Il testo di prima e\' ancora conservato: controlla che ci sia tutto.';
                }
            }

            async function apriNoteProgetto(projId) {
                const proj = state.projects[projId];
                if (!proj) return;
                noteProjectContext = { projId };
                const notes = getProjNotes(proj);
                if (lblNoteProjectTitle) lblNoteProjectTitle.textContent = `Note — ${proj.name || proj.comune || 'Progetto'}`;
                creaEditorNote();
                preparaNotaPerIlMotore(notes);
                if (editorNote) {
                    // Le immagini si reincorporano nella STRINGA, prima di consegnarla al motore,
                    // e non nel DOM dopo: il DOM lo governa ProseMirror, e un src cambiato da fuori
                    // verrebbe rimesso com'era al primo ridisegno.
                    const html = await rehydrateNoteImagesInHtmlString(notes.html || '');
                    editorNote.commands.setContent(html || '', { emitUpdate: false });
                    aggiornaSegnapostoNota();
                    aggiornaStatoBarraNote();
                }
                renderRigaConversioneNota();
                if (lblNoteSavedStatus) {
                    lblNoteSavedStatus.textContent = notes.updatedAt
                        ? `Salvato ${new Date(notes.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`
                        : 'Nuova nota';
                }
                nascondiBarraImmagineNota();
                if (modalProjectNotesOverlay) modalProjectNotesOverlay.classList.add('open');
                if (modalProjectNotes) modalProjectNotes.classList.add('open');
                triggerVibrate(30);
            }

            function salvaNoteProgettoCorrente(immediate) {
                if (!noteProjectContext) return;
                const proj = state.projects[noteProjectContext.projId];
                if (!proj || !editorNote) return;
                const notes = getProjNotes(proj);
                // Un documento vuoto, per il motore, non e' la stringa vuota: e' "<p></p>".
                // Salvandolo cosi' com'e', l'elenco dei progetti mostrerebbe il segno "ha una
                // nota" su ogni progetto in cui la nota e' stata soltanto aperta e richiusa.
                notes.html = (editorNote && editorNote.isEmpty) ? '' : htmlNotaCorrente();
                notes.updatedAt = Date.now();
                if (lblNoteSavedStatus) { lblNoteSavedStatus.textContent = 'Salvataggio…'; lblNoteSavedStatus.classList.add('note-saving'); }
                clearTimeout(noteSaveDebounceTimer);
                const doSave = () => {
                    saveState();
                    if (lblNoteSavedStatus) {
                        lblNoteSavedStatus.textContent = `Salvato ${new Date(notes.updatedAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
                        lblNoteSavedStatus.classList.remove('note-saving');
                    }
                };
                // COSTO DEL SALVATAGGIO MENTRE SI SCRIVE. `saveState()` fa una copia profonda
                // dell'INTERO stato (tutti i progetti, tutte le prove, tutti i log) prima di
                // scriverlo: farlo ogni 600ms di digitazione è la ragione principale per cui
                // scrivere una nota "scatta" sotto le dita. Due correzioni, nessuna delle quali
                // tocca cosa viene salvato:
                //  1. la pausa passa da 600ms a 2500ms. Da sola sarebbe un rischio (più tempo
                //     scoperto se l'app muore), ed è per questo che c'è la 2.
                //  2. si salva SUBITO quando l'app va in secondo piano o viene chiusa (vedi
                //     gli agganci a visibilitychange/pagehide più sotto): sono i momenti in cui
                //     un telefono uccide davvero una pagina. Con quelli, la pausa più lunga non
                //     espone a niente che prima fosse protetto.
                // `renderHomeProjects()` invece esce del tutto da qui: ridisegna l'elenco dei
                // progetti che sta DIETRO la finestra aperta, quindi mentre scrivi non lo vedi
                // nemmeno. Si fa una volta alla chiusura, che è quando l'elenco torna visibile.
                if (immediate) doSave(); else noteSaveDebounceTimer = setTimeout(doSave, 2500);
            }

            /** Salvataggio d'emergenza: l'app sta per finire in secondo piano o essere chiusa.
             * È questo che rende sicura la pausa lunga di sopra — senza, allungarla vorrebbe
             * dire allungare la finestra in cui si perde quello che hai appena scritto. */
            function salvaNoteSeInSospeso() {
                if (!noteProjectContext) return;
                clearTimeout(noteSaveDebounceTimer);
                salvaNoteProgettoCorrente(true);
            }
            document.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') salvaNoteSeInSospeso();
            });
            // pagehide copre la chiusura vera (e su iOS è l'unico affidabile): `beforeunload` no,
            // sui browser mobili spesso non arriva mai.
            window.addEventListener('pagehide', salvaNoteSeInSospeso);

            function chiudiNoteProgetto() {
                clearTimeout(noteSaveDebounceTimer);
                salvaNoteProgettoCorrente(true);
                // L'elenco dei progetti si ridisegna QUI, non a ogni battuta: mostra la data di
                // ultima modifica, che mentre scrivi sta dietro alla finestra e non guarda nessuno.
                renderHomeProjects();
                nascondiBarraImmagineNota();
                nascondiBollaSelezione();
                if (modalProjectNotesOverlay) modalProjectNotesOverlay.classList.remove('open');
                if (modalProjectNotes) modalProjectNotes.classList.remove('open');
                noteProjectContext = null;
            }
            // ---- La riga di conferma della conversione ----
            // Tre uscite, in ordine di quanto si fida l'utente: portati via l'originale, rimetti
            // l'originale al suo posto, oppure di' che va bene e la copia sparisce. Finche' la
            // riga e' li', niente di quello che c'era prima e' andato perduto.
            const btnNoteScaricaPrima = document.getElementById('btnNoteScaricaPrima');
            const btnNoteRipristinaPrima = document.getElementById('btnNoteRipristinaPrima');
            const btnNoteConversioneOk = document.getElementById('btnNoteConversioneOk');

            function noteDelProgettoCorrente() {
                const proj = noteProjectContext && state.projects[noteProjectContext.projId];
                return proj ? getProjNotes(proj) : null;
            }
            if (btnNoteScaricaPrima) {
                btnNoteScaricaPrima.addEventListener('click', async () => {
                    const notes = noteDelProgettoCorrente();
                    if (!notes || !notes.htmlPrimaDelMotore) return;
                    const html = await rehydrateNoteImagesInHtmlString(notes.htmlPrimaDelMotore);
                    scaricaBlob('<!DOCTYPE html><meta charset="utf-8">' + html, 'text/html;charset=utf-8', nomeFileNotaCorrente('originale.html'));
                });
            }
            if (btnNoteRipristinaPrima) {
                btnNoteRipristinaPrima.addEventListener('click', async () => {
                    const notes = noteDelProgettoCorrente();
                    if (!notes || !notes.htmlPrimaDelMotore) return;
                    const ok = await appConfirmDelete('Rimetto nella nota il testo che c\'era prima del passaggio al nuovo editor. Quello che hai scritto o modificato da allora andra\' perso.');
                    if (!ok) return;
                    notes.html = convertiNotaAlNuovoSchema(notes.htmlPrimaDelMotore);
                    if (editorNote) {
                        const html = await rehydrateNoteImagesInHtmlString(notes.html);
                        editorNote.commands.setContent(html || '', { emitUpdate: false });
                        aggiornaSegnapostoNota();
                    }
                    salvaNoteProgettoCorrente(true);
                });
            }
            if (btnNoteConversioneOk) {
                btnNoteConversioneOk.addEventListener('click', () => {
                    const notes = noteDelProgettoCorrente();
                    if (!notes) return;
                    delete notes.htmlPrimaDelMotore;
                    delete notes.convertitaIl;
                    renderRigaConversioneNota();
                    salvaNoteProgettoCorrente(true);
                });
            }

            if (btnCloseProjectNotesX) btnCloseProjectNotesX.addEventListener('click', chiudiNoteProgetto);
            if (modalProjectNotesOverlay) modalProjectNotesOverlay.addEventListener('click', chiudiNoteProgetto);

            /** Inserisce nella nota un'immagine gia' disponibile come dataUrl (da file, dalla
             * galleria del progetto, dallo strumento di disegno o da una forma rapida) e la salva
             * su IndexedDB, come le foto delle prove: punto unico riusato da tutte le sorgenti.
             * opts.inline=true per le forme rapide — piccole, in linea col testo, misurate in pixel.
             *
             * Una cosa cambia rispetto a prima: l'immagine non viene piu' infilata nel DOM con un
             * Range, entra come NODO dentro la transazione del motore. E' esattamente questo che
             * la fa finire nella pila dell'annulla insieme a tutto il resto. */
            function inserisciImmagineDataUrlNellaNota(dataUrl, opts) {
                // Stessa storia della tabella: l'immagine caricata dalla barra del blocco di
                // testo finiva nelle note del progetto.
                const editorNote = editorAttivo();
                if (!dataUrl || !editorNote) return;
                opts = opts || {};
                const imgId = 'nimg_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
                const attrs = { 'data-note-img-id': imgId, src: dataUrl };
                if (opts.inline) {
                    attrs.class = 'note-inline-shape';
                    attrs['data-note-inline'] = '1';
                    attrs.style = `width: ${opts.width || 32}px; height: ${opts.height || 32}px;`;
                }
                noteImageMemoryCache[imgId] = dataUrl;
                try { saveNoteImageToIDB(imgId, dataUrl); } catch (e) { ignoraErrore('inserisciImmagineDataUrlNellaNota', e); }
                editorNote.chain().focus().insertContent({ type: 'image', attrs }).run();
                dopoComandoTesto(true);
            }

            /** Legge il file scelto dall'utente e lo inserisce come immagine nella nota. */
            function inserisciImmagineNellaNota(file) {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (ev) => inserisciImmagineDataUrlNellaNota(ev.target.result);
                reader.readAsDataURL(file);
            }

            if (fileNoteImageInput) {
                collegaComandoTesto('immagine', () => fileNoteImageInput.click());
                fileNoteImageInput.addEventListener('change', (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) inserisciImmagineNellaNota(file);
                    fileNoteImageInput.value = '';
                });
            }

            // ---- I quattro marcatori del testo ----
            // Nessun ripristino della selezione prima di agire: la selezione la tiene il motore,
            // e .focus() nella catena la riporta dov'era. Era quella la pezza che serviva prima.
            const COMANDI_MARCATORE_NOTA = { bold: 'toggleBold', italic: 'toggleItalic', underline: 'toggleUnderline', strikeThrough: 'toggleStrike' };
            document.querySelectorAll('.note-toolbar .note-tb-btn[data-note-cmd]').forEach(btn => {
                btn.addEventListener('click', () => {
                    const nome = COMANDI_MARCATORE_NOTA[btn.dataset.noteCmd];
                    const editorNote = editorAttivo();
                    if (!editorNote || !nome) return;
                    editorNote.chain().focus()[nome]().run();
                    salvaNoteProgettoCorrente(true);
                });
            });

            // ---- Stile di riga (¶ / H1 / H2 / citazione / elenco / lista di controllo) ----
            document.querySelectorAll('.note-toolbar [data-format-tag]').forEach(btn => {
                btn.addEventListener('click', () => comandoBloccoNota(btn.dataset.formatTag));
            });

