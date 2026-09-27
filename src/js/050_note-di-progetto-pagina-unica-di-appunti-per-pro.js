            // =========================================================================
            // NOTE DI PROGETTO — pagina unica di appunti per progetto (non per singola prova,
            // scelta esplicita: raccoglie osservazioni trasversali a tutte le prove del
            // cantiere), con testo formattabile e immagini incorporate. Le immagini seguono lo
            // stesso schema delle foto (offload su IndexedDB, cache RAM, dataUrl svuotato prima
            // di scrivere su localStorage — vedi stripNoteImagesHtml più sopra).
            // =========================================================================

            const modalProjectNotesOverlay = document.getElementById('modalProjectNotesOverlay');
            const modalProjectNotes = document.getElementById('modalProjectNotes');
            const btnCloseProjectNotesX = document.getElementById('btnCloseProjectNotesX');
            const noteEditorBody = document.getElementById('noteEditorBody');
            const lblNoteProjectTitle = document.getElementById('lblNoteProjectTitle');
            const lblNoteSavedStatus = document.getElementById('lblNoteSavedStatus');
            const fileNoteImageInput = document.getElementById('fileNoteImageInput');
            const btnNoteInsertImage = document.getElementById('btnNoteInsertImage');

            let noteProjectContext = null; // { projId }
            let noteSaveDebounceTimer = null;

            // ==================================================================================
            //  IL MOTORE DELL'EDITOR
            //
            //  Fino a ieri qui c'era una selezione salvata a mano, un ricostruttore di blocchi e
            //  document.execCommand. Tre cose che il browser non garantisce piu' da anni e che
            //  sbagliavano ognuna a modo suo: la citazione che si annidava invece di sostituirsi,
            //  l'annulla che saltava un passo, l'incolla che entrava senza controlli.
            //
            //  Adesso il documento vive dentro uno SCHEMA (window.NoteEditor, compilato nel file
            //  piu' sopra; sorgenti in note-editor/): esiste solo cio' che e' dichiarato, la
            //  selezione la tiene il motore, e ogni modifica — testo, immagini, tabelle — passa
            //  da un'unica transazione. E' per questo che adesso l'annulla annulla davvero anche
            //  un'immagine inserita.
            //
            //  Il prezzo di uno schema: quello che non conosce lo scarta IN SILENZIO. Ed e' il
            //  motivo per cui la conversione (convertiNotaAlNuovoSchema, qui sotto) viene PRIMA
            //  del montaggio, e l'HTML originale resta conservato a fianco finche' non e' l'utente
            //  a dire che la conversione e' andata bene.
            // ==================================================================================

            let editorNote = null;

            function creaEditorNote() {
                if (editorNote) return editorNote;
                if (!noteEditorBody || !window.NoteEditor) return null;
                editorNote = new window.NoteEditor.Editor({
                    element: noteEditorBody,
                    extensions: window.NoteEditor.ESTENSIONI,
                    content: '',
                    onUpdate: () => { aggiornaSegnapostoNota(); salvaNoteProgettoCorrente(false); ricalcolaRicercaNota();  if (globalThis.__aggiornaMenuTag) globalThis.__aggiornaMenuTag(); },
                    onSelectionUpdate: () => { aggiornaStatoBarraNote(); aggiornaBollaSelezione(); },
                    onBlur: () => { setTimeout(aggiornaBollaSelezione, 0); },
                    editorProps: {
                        // L'incolla passa da qui e non da un listener sul contenitore: un listener
                        // esterno riceverebbe l'evento DOPO il motore (bolle dall'interno verso
                        // l'esterno), e il testo finirebbe incollato due volte.
                        handlePaste: (view, evento) => {
                            const dati = evento.clipboardData;
                            if (!dati) return false;
                            for (const item of (dati.items || [])) {
                                if (item.type && item.type.indexOf('image') === 0) {
                                    const file = item.getAsFile();
                                    if (file) { inserisciImmagineNellaNota(file); return true; }
                                }
                            }
                            const html = dati.getData('text/html');
                            // Testo semplice: niente da filtrare, lo inserisce il motore da solo.
                            if (!html) return false;
                            editorNote.commands.insertContent(ripuliscoHtmlIncollatoNota(html));
                            return true;
                        }
                    }
                });
                const plugin = pluginRicercaNote();
                if (plugin) editorNote.registerPlugin(plugin);
                return editorNote;
            }

            /** Il segnaposto non puo' piu' essere una regola CSS :empty — dentro al contenitore
             * c'e' sempre almeno il paragrafo vuoto del motore. Chi sa davvero se la nota e'
             * vuota e' l'editor, quindi e' lui a mettere e togliere la classe. */
            function aggiornaSegnapostoNota() {
                if (noteEditorBody) noteEditorBody.classList.toggle('note-vuota', !editorNote || editorNote.isEmpty);
            }

            /** L'HTML della nota come si trova ADESSO nell'editor. Unico punto da cui leggerlo:
             * prima ogni export andava a prendersi noteEditorBody.innerHTML, che adesso e' il
             * contenitore e non il documento. */
            function htmlNotaCorrente() {
                return editorNote ? editorNote.getHTML() : '';
            }

            /** Se la selezione e' su un'immagine — ProseMirror seleziona il NODO intero quando la
             * tocchi — restituisce il nodo, altrimenti null. Sostituisce il vecchio giro di
             * click-handler piu' classe .note-img-selected messa e tolta a mano. */
            function immagineSelezionataNota() {
                if (!editorNote) return null;
                const sel = editorNote.state.selection;
                const nodo = sel && sel.node;
                return (nodo && nodo.type && nodo.type.name === 'image') ? nodo : null;
            }

            /** Accende i pulsanti della barra secondo lo stato REALE del documento, chiesto al
             * motore. Prima la stessa cosa si tentava con document.queryCommandState: e' la
             * funzione che sbagliava piu' spesso di tutte, e su un blocco non ha nemmeno una
             * risposta sensata da dare. */
            function aggiornaStatoBarraNote() {
                // L'EDITOR ATTIVO, non sempre quello delle note: la stessa barra serve due
                // editor, e chiedere lo stato a quello sbagliato accendeva i pulsanti secondo
                // un documento che l'utente non stava guardando.
                const e = editorAttivo();
                if (!e) return;
                const marcatori = { bold: 'bold', italic: 'italic', underline: 'underline', strikeThrough: 'strike' };
                document.querySelectorAll('.note-toolbar [data-note-cmd]').forEach(btn => {
                    const nome = marcatori[btn.dataset.noteCmd];
                    btn.classList.toggle('is-active', !!nome && e.isActive(nome));
                });
                const inElenco = e.isActive('bulletList'), inChecklist = e.isActive('taskList');
                const stato = {
                    H1: e.isActive('heading', { level: 1 }),
                    H2: e.isActive('heading', { level: 2 }),
                    H3: e.isActive('heading', { level: 3 }),
                    pedice: e.isActive('subscript'),
                    apice: e.isActive('superscript'),
                    formula: e.isActive('formula'),
                    // La regola del paragrafo sotto il cursore: la tendina deve dire cosa vale
                    // QUI, non restare ferma sull'ultima scelta fatta altrove.
                    regolaPagina: (e.getAttributes('paragraph') || {}).regolaPagina
                        || (e.getAttributes('heading') || {}).regolaPagina || '',
                    BLOCKQUOTE: e.isActive('blockquote'),
                    UL: inElenco,
                    CHECKLIST: inChecklist,
                    P: e.isActive('paragraph') && !inElenco && !inChecklist && !e.isActive('blockquote')
                };
                document.querySelectorAll('.note-toolbar [data-format-tag]').forEach(btn => {
                    btn.classList.toggle('is-active', !!stato[btn.dataset.formatTag]);
                });
                document.querySelectorAll('.note-toolbar [data-comando-nota]').forEach(btn => {
                    const chiave = btn.dataset.comandoNota;
                    if (chiave in stato) btn.classList.toggle('is-active', !!stato[chiave]);
                });
                // La tendina delle regole segue il cursore: deve dire cosa vale nel paragrafo
                // dove sto scrivendo, non restare ferma sull'ultima scelta fatta altrove.
                document.querySelectorAll('.note-toolbar [data-comando-nota="regola-pagina"]').forEach(sel => {
                    if (document.activeElement !== sel) sel.value = stato.regolaPagina || '';
                });
                document.querySelectorAll('[data-comando-nota="evidenzia"]').forEach(b => b.classList.toggle('is-active', e.isActive('highlight')));
                aggiornaPulsanteAllineamento();
                document.querySelectorAll('[data-comando-nota="link"]').forEach(b => b.classList.toggle('is-active', e.isActive('link')));
                aggiornaBarraImmagineNota();
            }

            /** Applica UNO stile di riga, alternativo a tutti gli altri: paragrafo, titolo,
             * citazione, elenco puntato e lista di controllo non sono mai cumulabili tra loro, e
             * riapplicare quello gia' attivo riporta al paragrafo. E' la stessa regola di prima —
             * cambia che a farla rispettare adesso e' il motore, in una transazione sola, invece
             * di una ricostruzione a mano dei nodi del DOM (che e' il posto dove nascevano le
             * citazioni annidate all'infinito). */
            function comandoBloccoNota(tag) {
                const e = editorAttivo();
                if (!e) return;
                switch (tag) {
                    case 'P':
                        e.chain().focus().clearNodes().setParagraph().run();
                        break;
                    case 'H1':
                    case 'H2':
                    case 'H3': {
                        if (e.isActive('bulletList') || e.isActive('taskList')) e.chain().focus().clearNodes().run();
                        e.chain().focus().toggleHeading({ level: parseInt(tag.substring(1), 10) }).run();
                        break;
                    }
                    case 'BLOCKQUOTE':
                        if (e.isActive('bulletList') || e.isActive('taskList')) e.chain().focus().clearNodes().run();
                        e.chain().focus().toggleBlockquote().run();
                        break;
                    case 'UL':
                        // Due transazioni separate, non una catena sola: passare da un tipo di
                        // lista all'altro dentro la stessa transazione lascia lo stato a meta'.
                        if (e.isActive('taskList')) e.chain().focus().toggleTaskList().run();
                        e.chain().focus().toggleBulletList().run();
                        break;
                    case 'CHECKLIST':
                        if (e.isActive('bulletList')) e.chain().focus().toggleBulletList().run();
                        e.chain().focus().toggleTaskList().run();
                        break;
                }
                salvaNoteProgettoCorrente(true);
            }

            function getProjNotes(proj) {
                if (!proj.notes) proj.notes = { html: '', updatedAt: null };
                return proj.notes;
            }

            // ==================================================================================
            //  MIGRAZIONE DELLE NOTE — PASSO 1: CENSIMENTO, INVARIANTI, CONVERTITORE
            //  (vedi Piano_Note_Motore.md)
            //
            //  Perché questo viene PRIMA della libreria. Un editor serio non lavora su HTML
            //  libero: lavora su uno schema, e quello che non riconosce lo scarta IN SILENZIO.
            //  Le note già scritte contengono costruzioni fatte in casa — checklist a <div>,
            //  immagini con il src svuotato, tabelle con la loro classe — che nessuno schema
            //  standard conosce. Aprirle nel motore nuovo senza una conversione dichiarata
            //  vorrebbe dire vederle tornare indietro mutilate, e sono osservazioni di cantiere
            //  che finiscono in un documento professionale.
            //
            //  Qui non si converte niente sul serio: si CONTA e si CONFRONTA. Il convertitore
            //  esiste, ma per ora serve solo alla prova a vuoto — nessuna nota viene toccata.
            // ==================================================================================

            /** Tutto ciò che le note possono contenere oggi, dichiarato una volta sola.
             * Serve a distinguere "conosciuto" da "mai visto": è l'ignoto che fa perdere dati,
             * non il noto. Ricavato leggendo ogni punto del codice che scrive nel corpo nota. */
            const VOCABOLARIO_NOTE = {
                blocchi: ['p', 'h1', 'h2', 'h3', 'blockquote', 'ul', 'ol', 'li', 'hr', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
                inline: ['b', 'strong', 'i', 'em', 'u', 's', 'strike', 'span', 'a', 'br', 'img', 'font', 'label', 'input'],
                classi: ['note-check-item', 'note-check-label', 'note-check-box', 'note-check-text', 'checked', 'note-table'],
                // `color` e `align` sono i residui di execCommand su <font>: li avevo
                // dimenticati, e il censimento me li ha segnalati alla prima esecuzione. Sono
                // "conosciuti" a tutti gli effetti — il convertitore li traduce — quindi vanno
                // dichiarati, altrimenti il referto avrebbe gridato al lupo su ogni nota che
                // contiene un colore, e un allarme che suona sempre non lo guarda più nessuno.
                attributi: ['href', 'src', 'style', 'class', 'type', 'checked', 'contenteditable',
                            'data-note-img-id', 'data-note-photo-idx', 'data-note-photo-thumb-id',
                            'colspan', 'rowspan', 'alt', 'title', 'color', 'align', 'width', 'height']
            };

            /** Analizza UN html di nota e restituisce cosa contiene, separando ciò che il
             * vocabolario dichiara da ciò che non è mai stato previsto. */
            function censisciVocabolarioNota(html) {
                const doc = new DOMParser().parseFromString('<div id="r">' + (html || '') + '</div>', 'text/html');
                const radice = doc.getElementById('r');
                const tag = {}, classi = {}, attributi = {};
                const noti = new Set([...VOCABOLARIO_NOTE.blocchi, ...VOCABOLARIO_NOTE.inline]);
                const classiNote = new Set(VOCABOLARIO_NOTE.classi);
                const attrNoti = new Set(VOCABOLARIO_NOTE.attributi);
                const sconosciuti = { tag: new Set(), classi: new Set(), attributi: new Set() };
                radice.querySelectorAll('*').forEach(el => {
                    const t = el.tagName.toLowerCase();
                    tag[t] = (tag[t] || 0) + 1;
                    if (!noti.has(t)) sconosciuti.tag.add(t);
                    el.classList.forEach(c => {
                        classi[c] = (classi[c] || 0) + 1;
                        if (!classiNote.has(c)) sconosciuti.classi.add(c);
                    });
                    Array.from(el.attributes).forEach(a => {
                        attributi[a.name] = (attributi[a.name] || 0) + 1;
                        if (!attrNoti.has(a.name)) sconosciuti.attributi.add(a.name);
                    });
                });
                return {
                    tag, classi, attributi,
                    sconosciuti: {
                        tag: [...sconosciuti.tag].sort(),
                        classi: [...sconosciuti.classi].sort(),
                        attributi: [...sconosciuti.attributi].sort()
                    }
                };
            }

            /** Le grandezze che DEVONO sopravvivere a qualunque conversione. Non è "l'HTML è
             * uguale" — l'HTML cambierà per forza: è "il contenuto c'è ancora tutto".
             * Il testo si confronta normalizzando gli spazi, perché la conversione può
             * legittimamente cambiare dove va a capo il sorgente senza cambiare cosa si legge. */
            function invariantiNota(html) {
                const doc = new DOMParser().parseFromString('<div id="r">' + (html || '') + '</div>', 'text/html');
                const r = doc.getElementById('r');
                const testo = (r.textContent || '').replace(/\s+/g, ' ').trim();
                const idImmagini = Array.from(r.querySelectorAll('img[data-note-img-id]'))
                    .map(i => i.getAttribute('data-note-img-id')).sort();
                const link = Array.from(r.querySelectorAll('a[href]')).map(a => a.getAttribute('href')).sort();
                const checklist = Array.from(r.querySelectorAll('.note-check-item, li[data-checked], li[data-type="taskItem"]'));
                const spuntate = checklist.filter(el =>
                    el.classList.contains('checked') ||
                    el.getAttribute('data-checked') === 'true' ||
                    !!el.querySelector('input[checked]')).length;
                return {
                    testo,
                    lunghezzaTesto: testo.length,
                    immagini: idImmagini,
                    link,
                    checklist: checklist.length,
                    spuntate,
                    titoli: r.querySelectorAll('h1, h2, h3').length,
                    citazioni: r.querySelectorAll('blockquote').length,
                    righeElenco: r.querySelectorAll('li:not([data-checked]):not([data-type="taskItem"])').length,
                    divisori: r.querySelectorAll('hr').length,
                    tabelle: r.querySelectorAll('table').length,
                    celle: r.querySelectorAll('td, th').length
                };
            }

            /** Confronta gli invarianti di prima e dopo e restituisce SOLO le perdite.
             * Un array vuoto vuol dire "niente si è perso": è l'unica risposta accettabile
             * prima di far girare una conversione sulle note vere. */
            function confrontaInvariantiNota(htmlPrima, htmlDopo) {
                const a = invariantiNota(htmlPrima), b = invariantiNota(htmlDopo);
                const perdite = [];
                const conta = (nome, x, y) => { if (y < x) perdite.push(`${nome}: ${x} → ${y}`); };
                conta('checklist', a.checklist, b.checklist);
                conta('voci spuntate', a.spuntate, b.spuntate);
                conta('titoli', a.titoli, b.titoli);
                conta('citazioni', a.citazioni, b.citazioni);
                conta('righe elenco', a.righeElenco, b.righeElenco);
                conta('divisori', a.divisori, b.divisori);
                conta('tabelle', a.tabelle, b.tabelle);
                conta('celle', a.celle, b.celle);
                if (a.testo !== b.testo) perdite.push('il testo non coincide');
                const mancanti = a.immagini.filter(id => b.immagini.indexOf(id) === -1);
                if (mancanti.length) perdite.push(`immagini perse: ${mancanti.join(', ')}`);
                // Non basta che ci siano tutte: devono essere anche nello stesso ordine. Una
                // conversione che sposta in cima la foto che stava in fondo non perde niente da
                // contare, e infatti questo controllo mancava — l'ha reso necessario un difetto
                // vero, trovato confrontando il testo esportato prima e dopo.
                else if (a.immagini.join('|') !== b.immagini.join('|')) perdite.push('immagini fuori ordine');
                const linkPersi = a.link.filter(h => b.link.indexOf(h) === -1);
                if (linkPersi.length) perdite.push(`link persi: ${linkPersi.length}`);
                return perdite;
            }

            /** Ripulisce l'HTML che arriva dagli appunti prima di farlo entrare nella nota.
             *
             * La lista di ciò che si tiene NON è "tutto tranne le cose brutte" — quella è una
             * lista nera, e una lista nera è sbagliata per costruzione perché domani esce un tag
             * nuovo e passa. È una lista BIANCA: entra solo ciò che è nominato qui, e coincide
             * esattamente con quello che le note sanno già produrre e stampare.
             *
             * Gli attributi seguono la stessa regola. `style` in particolare NON passa: è il
             * veicolo principale di font, colori e dimensioni di un altro documento, ed è quello
             * che faceva sembrare le note "sporche" senza che si capisse da dove venisse.
             * L'unica eccezione è lo sfondo, che si converte in evidenziazione vera.
             *
             * Funzione pura: stringa in, stringa fuori. */
            function ripuliscoHtmlIncollatoNota(html) {
                const CONSENTITI = {
                    p: [], br: [], strong: [], b: [], em: [], i: [], u: [], s: [], strike: [],
                    h1: [], h2: [], h3: [], blockquote: [], ul: [], ol: [], li: [], hr: [],
                    a: ['href'], mark: ['data-color'],
                    table: [], thead: [], tbody: [], tr: [], th: ['colspan', 'rowspan'], td: ['colspan', 'rowspan']
                };
                const BLOCCHI_ALLINEABILI = ['p', 'h1', 'h2', 'h3'];
                const doc = new DOMParser().parseFromString('<div id="r">' + (html || '') + '</div>', 'text/html');
                const r = doc.getElementById('r');
                // Via subito ciò che non è contenuto: sono le cose che un incolla può portarsi
                // dietro e che non hanno niente a che fare con una nota.
                r.querySelectorAll('script, style, meta, link, iframe, object, embed, svg, form, input, button, video, audio').forEach(el => el.remove());
                // Le immagini incollate da fuori si scartano di proposito: un'immagine della nota
                // deve passare da inserisciImmagineNellaNota, che la salva in IndexedDB e le dà
                // il suo data-note-img-id. Un <img> con un src remoto sarebbe un buco nero — non
                // si vede offline, non finisce nel backup, e in cantiere non c'è rete.
                r.querySelectorAll('img').forEach(el => el.remove());
                const visita = (el) => {
                    Array.from(el.children).forEach(visita);
                    const tag = el.tagName.toLowerCase();
                    if (!Object.prototype.hasOwnProperty.call(CONSENTITI, tag)) {
                        // Non consentito: si tiene il CONTENUTO e si butta l'involucro. Scartare
                        // anche il testo sarebbe la reazione sbagliata — chi incolla vuole le sue
                        // parole, non la sua formattazione.
                        const sfondo = el.style && el.style.backgroundColor;
                        if (sfondo && sfondo !== 'transparent' && el.textContent.trim()) {
                            const mark = doc.createElement('mark');
                            mark.setAttribute('data-color', sfondo);
                            while (el.firstChild) mark.appendChild(el.firstChild);
                            el.parentNode.replaceChild(mark, el);
                            return;
                        }
                        while (el.firstChild) el.parentNode.insertBefore(el.firstChild, el);
                        el.parentNode.removeChild(el);
                        return;
                    }
                    // L'allineamento si salva PRIMA di spazzare via gli attributi: da quando la
                    // nota sa allineare, un testo centrato incollato da Word e' informazione che
                    // la nota puo' reggere, e buttarla sarebbe una perdita gratuita. Si tiene
                    // solo `text-align`, e solo sulle righe: tutto il resto dello `style` se ne va
                    // come prima.
                    const allineamento = (BLOCCHI_ALLINEABILI.indexOf(tag) !== -1 && el.style)
                        ? (el.style.textAlign || el.getAttribute('align') || '') : '';
                    Array.from(el.attributes).forEach(a => {
                        if (CONSENTITI[tag].indexOf(a.name) === -1) el.removeAttribute(a.name);
                    });
                    if (['left', 'center', 'right', 'justify'].indexOf(allineamento) !== -1 && allineamento !== 'left') {
                        el.setAttribute('style', 'text-align: ' + allineamento);
                    }
                    // Un link che punta a qualcosa di eseguibile non è un link: è un tranello.
                    if (tag === 'a') {
                        const href = el.getAttribute('href') || '';
                        if (!/^(https?:|mailto:|tel:)/i.test(href)) el.removeAttribute('href');
                    }
                };
                Array.from(r.children).forEach(visita);
                return r.innerHTML;
            }

            /** Traduce l'HTML di una nota nella forma che uno schema di editor moderno accetta.
             * Ogni regola qui sotto esiste perché SENZA di lei quella costruzione verrebbe
             * scartata: non è pulizia estetica, è sopravvivenza del contenuto.
             * Funzione PURA: prende una stringa, restituisce una stringa. Non tocca il documento,
             * non tocca lo stato, e si può quindi eseguire davvero in un test. */
            function convertiNotaAlNuovoSchema(html) {
                const doc = new DOMParser().parseFromString('<div id="r">' + (html || '') + '</div>', 'text/html');
                const r = doc.getElementById('r');
                const nuovo = (tag) => doc.createElement(tag);

                // 1) CHECKLIST: da <div class="note-check-item"> a una lista di attività.
                //    Le voci consecutive vanno raggruppate in UNA lista: una lista per voce
                //    sarebbe formalmente valida ma spezzerebbe l'elenco in tanti blocchi
                //    separati, e all'utente sembrerebbe che la spaziatura sia impazzita.
                Array.from(r.querySelectorAll('.note-check-item')).forEach(item => {
                    if (!item.parentNode) return;
                    const precedente = item.previousElementSibling;
                    let lista;
                    if (precedente && precedente.getAttribute && precedente.getAttribute('data-type') === 'taskList') {
                        lista = precedente;
                    } else {
                        lista = nuovo('ul');
                        lista.setAttribute('data-type', 'taskList');
                        item.parentNode.insertBefore(lista, item);
                    }
                    const voce = nuovo('li');
                    voce.setAttribute('data-type', 'taskItem');
                    // Lo stato spuntato sta in DUE posti (la classe sull'item e l'attributo
                    // sulla casella): si accettano entrambi, perché note vecchie potrebbero
                    // averne solo uno — l'attributo è stato aggiunto in un secondo momento.
                    const spuntata = item.classList.contains('checked') || !!item.querySelector('input[checked]');
                    voce.setAttribute('data-checked', spuntata ? 'true' : 'false');
                    const testo = item.querySelector('.note-check-text');
                    const p = nuovo('p');
                    while (testo && testo.firstChild) p.appendChild(testo.firstChild);
                    voce.appendChild(p);
                    lista.appendChild(voce);
                    item.parentNode.removeChild(item);
                });

                // 2) EVIDENZIATORE: <span style="background-color:…"> → <mark>.
                //    Il colore si conserva come attributo: perderlo vorrebbe dire trasformare
                //    tre evidenziazioni di colore diverso nella stessa evidenziazione.
                Array.from(r.querySelectorAll('span[style]')).forEach(sp => {
                    const sfondo = (sp.style && (sp.style.backgroundColor || '')) || '';
                    if (!sfondo || sfondo === 'transparent') return;
                    const mark = nuovo('mark');
                    mark.setAttribute('data-color', sfondo);
                    while (sp.firstChild) mark.appendChild(sp.firstChild);
                    sp.parentNode.replaceChild(mark, sp);
                });

                // 3) I TAG CHE execCommand PRODUCE A CASO. Lo stesso pulsante generava <b> o
                //    <strong> a seconda del punto: si normalizzano, altrimenti la stessa
                //    formattazione risulterebbe di due tipi diversi nello stesso documento.
                const equivalenze = { b: 'strong', i: 'em', strike: 's' };
                Object.keys(equivalenze).forEach(vecchio => {
                    Array.from(r.querySelectorAll(vecchio)).forEach(el => {
                        const nn = nuovo(equivalenze[vecchio]);
                        while (el.firstChild) nn.appendChild(el.firstChild);
                        el.parentNode.replaceChild(nn, el);
                    });
                });
                // <font color> è il residuo più vecchio di execCommand: diventa un colore vero.
                Array.from(r.querySelectorAll('font')).forEach(f => {
                    const sp = nuovo('span');
                    const col = f.getAttribute('color');
                    if (col) sp.setAttribute('style', 'color:' + col);
                    while (f.firstChild) sp.appendChild(f.firstChild);
                    f.parentNode.replaceChild(sp, f);
                });

                // 4) CELLE E VOCI DI ELENCO: il contenuto deve stare dentro un blocco.
                //    Uno schema di documento non ammette testo "nudo" dentro <td> o <li>: se
                //    non lo avvolgiamo noi, lo avvolge la libreria — e nel farlo a volte perde
                //    la formattazione in linea che c'era attorno.
                Array.from(r.querySelectorAll('td, th, li')).forEach(cella => {
                    if (cella.getAttribute('data-type') === 'taskItem') return; // già a posto
                    const haBlocco = Array.from(cella.children).some(c => /^(p|h1|h2|h3|ul|ol|blockquote|table)$/i.test(c.tagName));
                    if (haBlocco || !cella.childNodes.length) return;
                    const p = nuovo('p');
                    while (cella.firstChild) p.appendChild(cella.firstChild);
                    cella.appendChild(p);
                });

                // 5) TESTO E IMMAGINI NUDI ALLA RADICE. Le note vecchie cominciano spesso senza
                //    nessun paragrafo (il contenteditable lo permette), e un'immagine inserita in
                //    fondo alla nota vive anche lei alla radice: senza un involucro finirebbero
                //    fuori dal documento.
                //
                //    Si avvolge ogni GRUPPO DI VICINI, ciascuno dove si trova. La prima versione
                //    di questa regola li raccoglieva TUTTI in un unico paragrafo messo dove
                //    stava il primo: non perdeva niente, e infatti nessun invariante protestava —
                //    ma spostava in cima alla nota l'immagine che stava in fondo. Contare le cose
                //    non e' la stessa cosa che lasciarle al loro posto; e' stato il confronto del
                //    testo esportato prima e dopo a farlo vedere.
                const eBloccoRadice = (n) => n.nodeType === 1 && /^(p|h1|h2|h3|ul|ol|blockquote|hr|table|div|pre)$/i.test(n.tagName);
                const eSpazioVuoto = (n) => n.nodeType === 3 && !n.textContent.trim();
                let gruppoRadice = [];
                const chiudiGruppoRadice = () => {
                    if (!gruppoRadice.length) return;
                    const p = nuovo('p');
                    r.insertBefore(p, gruppoRadice[0]);
                    gruppoRadice.forEach(n => p.appendChild(n));
                    gruppoRadice = [];
                };
                Array.from(r.childNodes).forEach(n => {
                    if (eBloccoRadice(n)) chiudiGruppoRadice();
                    // Uno spazio si unisce al gruppo aperto (fa parte della frase), ma da solo
                    // non ne apre uno nuovo tra due blocchi.
                    else if (eSpazioVuoto(n)) { if (gruppoRadice.length) gruppoRadice.push(n); }
                    else gruppoRadice.push(n);
                });
                chiudiGruppoRadice();

                // 6) LE IMMAGINI RESTANO COME SONO, ED È LA REGOLA PIÙ IMPORTANTE DI TUTTE.
                //    Il `src` è VUOTO di proposito (saveState lo svuota, il file vero sta in
                //    IndexedDB e viene reidratato all'apertura): l'unico collegamento è
                //    data-note-img-id. Qui non si tocca niente — la nota va al motore nuovo con
                //    quell'attributo intatto, e sarà lo schema a doverlo dichiarare.
                //    Scriverlo come una NON-azione è il punto: è la cosa che si perde per prima
                //    quando qualcuno "ripulisce" l'HTML senza sapere cosa sta guardando.
                return r.innerHTML;
            }

            /** Prova a vuoto su TUTTE le note salvate: converte in memoria, confronta gli
             * invarianti, e riferisce. NON scrive niente da nessuna parte — serve a decidere se
             * la conversione è sicura, prima ancora di installare qualunque libreria. */
            function diagnosticaMigrazioneNote() {
                const progetti = (state && state.projects) || {};
                const esito = { progetti: 0, conNote: 0, caratteri: 0, senzaPerdite: 0, conPerdite: [], sconosciuti: { tag: new Set(), classi: new Set(), attributi: new Set() } };
                Object.keys(progetti).forEach(pid => {
                    esito.progetti++;
                    const html = (progetti[pid].notes && progetti[pid].notes.html) || '';
                    if (!html.trim()) return;
                    esito.conNote++;
                    esito.caratteri += html.length;
                    const cens = censisciVocabolarioNota(html);
                    ['tag', 'classi', 'attributi'].forEach(k => cens.sconosciuti[k].forEach(v => esito.sconosciuti[k].add(v)));
                    let perdite;
                    try { perdite = confrontaInvariantiNota(html, convertiNotaAlNuovoSchema(html)); }
                    catch (err) { perdite = ['la conversione è fallita: ' + err.message]; }
                    if (perdite.length === 0) esito.senzaPerdite++;
                    else esito.conPerdite.push({ progetto: progetti[pid].name || pid, perdite });
                });
                ['tag', 'classi', 'attributi'].forEach(k => { esito.sconosciuti[k] = [...esito.sconosciuti[k]].sort(); });
                return esito;
            }

            /** Sostituisce ogni <img data-note-img-id> senza src reale (svuotato da saveState per
             * stare sotto i 5MB di localStorage) con l'immagine vera, presa dalla cache RAM o da
             * IndexedDB — stesso schema già usato per le foto (photoMemoryCache/getPhotoFromIDB). */
            async function rehydrateNoteImagesInDom(container) {
                const imgs = Array.from(container.querySelectorAll('img[data-note-img-id]'));
                for (const img of imgs) {
                    const id = img.getAttribute('data-note-img-id');
                    if (!id) continue;
                    const srcAttuale = img.getAttribute('src');
                    if (srcAttuale && srcAttuale.indexOf('data:') === 0) continue;
                    const cached = noteImageMemoryCache[id] || await getNoteImageFromIDB(id);
                    if (cached) {
                        noteImageMemoryCache[id] = cached;
                        img.setAttribute('src', cached);
                    }
                }
            }

            /** Come rehydrateNoteImagesInDom ma lavora su una STRINGA html (non sul DOM live):
             * usata per gli export (JSON di backup, .md, .pdf, Word), dove serve l'HTML completo
             * con le immagini reincorporate come base64, non un elemento nella pagina. */
            async function rehydrateNoteImagesInHtmlString(html) {
                if (!html || html.indexOf('data-note-img-id') === -1) return html;
                const doc = new DOMParser().parseFromString(html, 'text/html');
                await rehydrateNoteImagesInDom(doc.body);
                return doc.body.innerHTML;
            }

