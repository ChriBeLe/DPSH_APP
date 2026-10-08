                    // ===== GUARDIA CONTRO LE MISURE DEGENERI =====
                    // Bug trovato qui dopo tre tentativi a vuoto altrove: se la misura PRECEDENTE
                    // aveva altezza zero, sy diventa 0 e questa riga scrive scale(sx, 0) — cioè
                    // schiaccia l'elemento a un'altezza nulla lasciandogli la larghezza. È
                    // esattamente il referto raccolto sul guasto: "inner: 0x493" dentro un body
                    // alto 579, con il blocco spedito a -15041px dal translate calcolato sulla
                    // stessa misura fasulla. Il contenuto restava nel DOM, alto, con overflow
                    // visibile — e invisibile.
                    // Quando capita: i blocchi lunghi cambiano altezza da un render all'altro
                    // (cambia la fetta di categorie mostrata), e aprire le anteprime scatena una
                    // raffica di render ravvicinati. Basta che uno colga il blocco in un momento
                    // in cui è ancora vuoto — altezza zero — perché quel valore diventi la base
                    // dell'animazione successiva.
                    // Un'animazione non deve MAI poter nascondere il contenuto: se una delle due
                    // misure è degenere, o se il salto è di migliaia di pixel (altro segno che la
                    // base è spazzatura), si rinuncia all'effetto e si lascia l'elemento dov'è.
                    // Rinunciare a un'animazione non si nota; perdere il contenuto sì.
                    const SALTO_ASSURDO_PX = 3000;
                    if (!(vecchio.height > 0) || !(vecchio.width > 0) || !(nuovo.height > 0) || !(nuovo.width > 0)) return;
                    if (Math.abs(dx) > SALTO_ASSURDO_PX || Math.abs(dy) > SALTO_ASSURDO_PX) return;
                    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5 && Math.abs(sx - 1) < 0.01 && Math.abs(sy - 1) < 0.01) return;
                    el.style.transformOrigin = 'top left';
                    el.style.transition = 'none';
                    el.style.transform = `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`;
                    requestAnimationFrame(() => {
                        el.style.transition = 'transform var(--mov-medio) var(--ease-entra)';
                        el.style.transform = '';
                        el.addEventListener('transitionend', function fine() {
                            el.style.transition = '';
                            el.removeEventListener('transitionend', fine);
                        });
                    });
                    // Rete di sicurezza sulla PULIZIA. Il ripristino qui sopra vive dentro un
                    // requestAnimationFrame e si conclude con un transitionend: due eventi che
                    // possono non arrivare mai — la scheda passa in background e i frame si
                    // fermano, oppure un nuovo render sostituisce il nodo a metà strada. In quel
                    // caso l'elemento resterebbe con la trasformazione addosso PER SEMPRE, che è
                    // il modo in cui un effetto grafico diventa una perdita di dati.
                    // Un timer indipendente ripulisce comunque: se l'animazione è andata a buon
                    // fine questa riga non fa niente (la trasformazione è già vuota), se è rimasta
                    // a metà rimette le cose a posto.
                    setTimeout(() => {
                        if (el.isConnected && el.style.transform) {
                            el.style.transition = '';
                            el.style.transform = '';
                        }
                    }, 500);
                });
            }

            /** Markup di UN blocco (testata coi controlli + corpo col contenuto): usato sia per un
             * blocco "normale" (colonna con un solo blocco) sia per ciascun elemento impilato dentro
             * una colonna-stack — in quel caso `item` è la voce FOGLIA dentro entry.stack, mentre
             * `entryId` resta l'id della COLONNA (l'entry di riga: entry.id) perché colSpan è una
             * proprietà della colonna intera, condivisa da tutti i blocchi impilati al suo interno,
             * non del singolo blocco impilato. */
            /** Corpo di un blocco nell'editor, in modalità "maniglie dirette": niente più barra di
             * controlli sempre visibile e affollata di pulsantini minuscoli (inutilizzabile da
             * telefono) — di default si vede SOLO il contenuto. Toccando il blocco lo si seleziona:
             * compaiono un'etichetta trascinabile (per spostarlo) e due maniglie (angolo = dimensione,
             * lato = larghezza colonna); tenendo premuto si apre un menu contestuale compatto con
             * allineamento, compattezza, dimensione testo ed eliminazione (vedi apriMenuBloccoEditor). */
            /** Filtra l'HTML di un blocco flowable (tabella-dettagliata-parametri/allegato-formule)
             * tenendo SOLO le mini-tabelle di categoria (<table data-categoria-index="N">) con N
             * nell'intervallo [daIndice, aIndice] incluso, più l'eventuale titolo/info prova
             * (data-titolo-tabella-blocco) SOLO se daIndice===0 — non deve mai ripetersi, vedi
             * htmlTabellaDettagliata. SOSTITUISCE del tutto il vecchio meccanismo "genera il blocco
             * per intero, poi nascondi via DOM le categorie di troppo" (applicaVisibilitaCategorieBlocco,
             * RIMOSSA): quel meccanismo poteva fallire in silenzio (blocco trovato in un momento
             * sbagliato, valore non ancora aggiornato) lasciando un riquadro completamente vuoto —
             * bug segnalato con screenshot dopo aver aggiunto un'interruzione manuale. Qui invece
             * l'HTML che finisce sulla pagina contiene GIA' solo le categorie giuste, in un unico
             * passaggio deterministico — stessa filosofia "griglia fissa" già usata per calcolare i
             * tagli stessi (vedi sincronizzaFlussiBlocchiLunghi). daIndice==null = nessun filtro,
             * l'HTML passa invariato (usato ovunque NON sia una pagina già tagliata, incluso ogni
             * chiamata lato export/miniatura che deve restare quella di sempre). Nessuna tabella
             * viene mai scartata per un attributo non riconosciuto: in quel caso resta visibile,
             * mai un blocco vuoto per un formato imprevisto. */
            function filtraCategorieHtmlFlowable(html, daIndice, aIndice) {
                if (!html || daIndice == null) return html;
                const aEff = aIndice != null ? aIndice : Infinity;
                const tabelle = html.match(/<table[^>]*>[\s\S]*?<\/table>/g);
                if (!tabelle) return html;
                const risultato = tabelle.filter(tbl => {
                    if (/data-titolo-tabella-blocco/.test(tbl)) return daIndice === 0;
                    const m = tbl.match(/data-categoria-index="(\d+)"/);
                    if (!m) return true;
                    const idx = parseInt(m[1], 10);
                    return idx >= daIndice && idx <= aEff;
                }).join('');
                // RETE DI SICUREZZA (bug segnalato: "il blocco diventa un rigo sottile perché il
                // contenuto non è visibile, anche se appartenente a quella pagina").
                // Un intervallo che non seleziona NESSUNA tabella non è mai una situazione valida:
                // una pagina di un blocco lungo mostra sempre almeno una categoria. Se succede,
                // finora il blocco veniva reso vuoto — cioè il guasto si manifestava come contenuto
                // sparito, senza un solo indizio su chi avesse sbagliato l'intervallo.
                // Ora si preferisce mostrare TUTTO il contenuto: vedere troppo è un difetto
                // evidente e recuperabile, vedere niente sembra perdita di dati. E il messaggio in
                // console dice l'intervallo colpevole, che è l'informazione che finora mancava per
                // risalire alla causa.
                // Non basta controllare che il risultato non sia vuoto: nello screenshot del guasto
                // sopravviveva la SOLA tabella-titolo del blocco (quella con
                // data-titolo-tabella-blocco), ed è per questo che si vedeva una barretta arancione
                // alta un rigo. Il risultato non era vuoto, ma non conteneva nessuna CATEGORIA —
                // che è comunque una pagina senza contenuto.
                const categorieSopravvissute = (risultato.match(/data-categoria-index="/g) || []).length;
                const categorieDisponibili = [...html.matchAll(/data-categoria-index="(\d+)"/g)].map(m => m[1]);
                if (categorieDisponibili.length > 0 && categorieSopravvissute === 0) {
                    console.warn('[filtraCategorieHtmlFlowable] Nessuna categoria selezionata.'
                        + ' Intervallo richiesto: ' + daIndice + '..' + (aIndice != null ? aIndice : '∞') + '.'
                        + ' Indici realmente presenti nel contenuto: ' + categorieDisponibili.join(',') + '.'
                        + ' Mostro tutto invece di lasciare il blocco con la sola riga del titolo.');
                    return html;
                }
                return risultato;
            }
            function costruisciHtmlBloccoEditor(item, entryId, span, cols, ctx, soloLettura, rangeCategorie) {
                const def = REPORT_BLOCK_TYPES[item.type] || { label: item.type };
                const fontScale = item.fontScale || 1;
                // Due meccanismi distinti per la maniglia di ridimensionamento (richiesto
                // esplicitamente, dopo il bug del testo sovrapposto a zoom molto basso): i blocchi
                // "di testo/tabelle" (BLOCCHI_CON_FONT_REGOLABILE) non usano più zoom CSS — la
                // maniglia regola SOLO --tpl-riga-scale, che i loro renderer applicano al padding
                // verticale delle righe/line-height (vedi autoFitTabellaExport/Righe, rigaBox in
                // buildDatiBoxHtml, i case 'titolo'/'testo' in buildBlockContentHtml): font e
                // larghezze restano quindi SEMPRE quelli scelti altrove (campo "Dimensione testo" e
                // maniglia laterale), mai più distorti dalla maniglia di sotto. Per tutti gli altri
                // tipi (foto/mappe/grafici, dove "zoom" serve davvero a ingrandire il contenuto
                // oltre il proprio riquadro) il comportamento resta lo zoom CSS di sempre.
                const bloccoARighe = BLOCCHI_CON_FONT_REGOLABILE.has(item.type);
                // Foto (richiesto esplicitamente: "lo Zoom in teoria non serve, al massimo
                // dovrei poter regolare l'altezza del riquadro" — segnalato insieme al bug della
                // didascalia che si ingrandiva con la foto perché viveva nello stesso contenitore
                // zoomato): terzo ramo distinto, un'altezza diretta in mm invece di un
                // moltiplicatore di zoom, stesso pattern già usato per l'intestazione
                // (page.header.heightMm) — vedi buildBlockContentHtml/attivaManigliaScalaBlocco.
                // Zoom resta invariato per mappe/grafici, dove "ingrandire oltre il riquadro" è un
                // comportamento voluto (vedi commento più sotto in attivaManigliaScalaBlocco).
                const bloccoFoto = item.type === 'immagine-libera';
                const scale = item.scale || 1;
                const rigaScale = item.rigaScale || 1;
                const altezzaFotoMm = item.heightMm || 70;
                const styleInner = bloccoARighe
                    ? `--tpl-riga-scale:${rigaScale}; --tpl-font-scale:${fontScale};${stileGrigliaTabellaBlocco(item)}`
                    : bloccoFoto
                        ? `--tpl-photo-height-mm:${altezzaFotoMm};`
                        // Il grafico stratigrafico non porta piu' ne' zoom ne' --tpl-font-scale: si
                        // impagina da se' in unita' fisiche, e uno zoom sul contenitore rimetterebbe
                        // esattamente il riscalamento uniforme che e' stato tolto. Stessa scelta,
                        // per lo stesso motivo, in buildContenutoVoceStampa: editor e stampa non
                        // possono divergere su una cosa cosi'.
                        : item.type === 'grafico-stratigrafia'
                            ? ''
                            : `zoom:${scale}; --tpl-font-scale:${fontScale};`;
                // soloLettura (richiesto esplicitamente: l'editor deve "comportarsi come Word",
                // creando pagine di continuazione per un blocco più alto di una pagina): il
                // contenuto mostrato sulle pagine DI CONTINUAZIONE è sempre in sola lettura — si
                // seleziona/modifica solo dalla pagina di ORIGINE, altrimenti trovaVoceRigaPerId
                // qui sotto (che cerca solo nella pagina ATTIVA) non troverebbe nemmeno la voce.
                const selezionato = !soloLettura && templateEditorState.selectedBlockId === item.id;
                // Lucchetto posizione (richiesto esplicitamente, versione rafforzata: blocca TUTTO,
                // non solo il trascinamento): l'etichetta trascinabile mostra subito un'icona
                // diversa e un titolo esplicativo quando la colonna è bloccata, senza dover aprire
                // il menu per scoprirlo — il vero blocco (trascinamento E resto delle maniglie)
                // avviene più sotto in renderTemplateEditorCanvas/attiva*, qui è solo l'indicazione
                // visiva. La maniglia "estendi zoom" e il relativo lucchetto sono stati rimossi
                // (richiesto esplicitamente): lo zoom ha ora un unico range fisso e ampio.
                // trovaVoceRigaPerIdOvunque (non più solo trovaVoceRigaPerId sulla pagina attiva):
                // serve anche quando questo blocco è mostrato in sola lettura su una pagina di
                // CONTINUAZIONE (vedi soloLettura sotto), la cui page.rows è sempre vuoto.
                const voceLock = trovaVoceRigaPerIdOvunque(entryId);
                const posizioneBloccata = !!(voceLock && voceLock.posizioneBloccata);
                // LA MANIGLIA DEL BLOCCO DI TESTO NON REGOLA PIU' NIENTE. Trascinava
                // rigaScale, cioe' il moltiplicatore dell'interlinea — ma da quando il testo
                // prende l'interlinea dallo stile del documento (era quel moltiplicatore a
                // "schiacciare riga su riga") quel valore non tocca piu' nulla: la maniglia
                // mostrava una percentuale e non faceva niente. Un controllo che mente e' peggio
                // di un controllo che manca, e qui c'era gia' il gesto giusto che cercava un
                // significato: dove finisce il blocco e' esattamente dove si vuole tagliare.
                // CHI PUO' ESSERE TAGLIATO ha la maniglia delle forbici. Chi ha ANCHE un'altezza
                // righe vera — le due tabelle lunghe — le tiene tutte e due, affiancate: prendere
                // la maniglia dell'altezza per farne un taglio sarebbe stato togliere un comando
                // che funziona per farne uno che esiste gia' altrove, uno scambio in perdita.
                const puoEssereTagliato = item.type === 'testo' || BLOCCHI_FLOWABLE.has(item.type);
                const haAltezzaVera = bloccoARighe && item.type !== 'testo';
                const dueManiglie = puoEssereTagliato && haAltezzaVera;
                const manigliaTaglio = puoEssereTagliato && !haAltezzaVera;   // una sola, ed e' il taglio
                const titoloTaglio = item.type === 'testo'
                    ? 'Trascina fin dove vuoi che finisca la pagina: da li\' il testo continua sulla pagina dopo'
                    : 'Trascina fin dove vuoi che finisca la pagina: da li\' la tabella continua sulla pagina dopo';
                const titoloManigliaBasso = manigliaTaglio
                    ? titoloTaglio
                    : bloccoARighe
                    ? `Trascina per aumentare/diminuire lo spazio tra le righe (${Math.round(rigaScale * 100)}%)`
                    : bloccoFoto
                        ? `Trascina per regolare l'altezza del riquadro (${altezzaFotoMm}mm) — la didascalia non cambia mai dimensione insieme a questa`
                        : `Trascina verso il basso per ingrandire, verso l'alto per rimpicciolire (${Math.round(scale * 100)}%)`;
                // Sulle pagine di continuazione (soloLettura) tutto resta bloccato — trascinamento,
                // menu, eliminazione — TRANNE le due maniglie dirette di larghezza/altezza
                // (richiesto esplicitamente: "vorrei poter modificare anche dal continuo giusto la
                // lunghezza e l'altezza"): niente etichetta/chip (non si sposta né si apre il menu
                // da qui), solo le due maniglie. Rispettano il lucchetto posizione, come sulla
                // pagina di origine, e — da ora — anche la selezione (vedi sotto).
                // MANIGLIE SOLO SUL BLOCCO SCELTO (voce di bacheca "meno rumore visivo").
                // Il commento qui sopra spiegava che su una pagina di continuazione "non esiste un
                // concetto di selezionato" — non è più vero: la selezione di una fetta viene
                // instradata al blocco d'origine, quindi item.id è proprio l'id che finisce in
                // selectedBlockId. Su un blocco lungo distribuito su quattro pagine si vedevano
                // otto maniglie contemporaneamente, tutte uguali, su fette che non stavi toccando.
                // Ora compaiono solo su quello scelto — e ora si riconosce da solo, grazie
                // all'anello di selezione.
                const fettaDelBloccoScelto = templateEditorState.selectedBlockId === item.id;
                const maniglieDircontinuazione = (soloLettura && !posizioneBloccata && fettaDelBloccoScelto) ? `
                    <div class="tpl-editor-block-select-overlay">
                        <div class="tpl-editor-block-handle tpl-editor-handle-bottom${manigliaTaglio ? ' e-taglio' : ''}${dueManiglie ? ' e-coppia-sx' : ''}" data-block-id="${item.id}" title="${titoloManigliaBasso}"><svg class="ico"><use href="#${manigliaTaglio ? 'i-scissors' : 'i-move-y'}"/></svg></div>
                        ${dueManiglie ? `<div class="tpl-editor-block-handle tpl-editor-handle-bottom e-taglio e-coppia-dx" data-block-taglio="${item.id}" title="${titoloTaglio}"><svg class="ico"><use href="#i-scissors"/></svg></div>` : ''}
                        <div class="tpl-editor-block-handle tpl-editor-handle-side" data-entry-id="${entryId}" title="Trascina per cambiare la larghezza (${Math.round(Math.min(cols, span) / cols * 100)}%)"><svg class="ico"><use href="#i-expand-h"/></svg></div>
                    </div>
                ` : '';
                // FASE C (vedi Piano_Riscrittura_Layout_Export.md): avviso di overflow reale SEMPRE
                // visibile (non solo col menu aperto) sul blocco flowable di ORIGINE — mai sulle
                // pagine di continuazione (soloLettura), che sono già delicate di loro (vedi i
                // commenti storici su sincronizzaFlussiBlocchiLunghi) e da cui comunque non si può
                // aprire il menu per correggere: meglio un rimando semplice e sempre corretto
                // ("controlla il menu del blocco d'origine") che un tentativo di localizzare
                // esattamente la fetta sbagliata, rischioso da agganciare a quella logica. Letto
                // dalla stessa cache di ricalcolaAvvisiOverflowTuttiBlocchi già usata dal menu.
                const avvisiOverflowCanvas = (!soloLettura && BLOCCHI_FLOWABLE.has(item.type) && templateEditorState.avvisiOverflowPerBlocco)
                    ? (templateEditorState.avvisiOverflowPerBlocco[item.id] || []) : [];
                const badgeOverflowCanvas = avvisiOverflowCanvas.some(g => g.supera) ? `
                    <div class="tpl-editor-block-select-overlay" style="pointer-events:none;">
                        <div style="position:absolute; top:-12px; right:8px; display:flex; align-items:center; gap:4px; background:#dc2626; color:#fff; font-size:10px; font-weight:800; padding:3px 8px; border-radius:999px; box-shadow:0 2px 6px rgba(0,0,0,0.3); white-space:nowrap;" title="Almeno un gruppo di categorie tra due interruzioni non entra in una pagina fisica (misurato) — apri il menu di questo blocco (⋮) per vedere quale e aggiungere un'interruzione">
                            <svg class="ico" style="width:11px; height:11px; flex-shrink:0;"><use href="#i-alert"/></svg>
                            <span>non entra in una pagina</span>
                        </div>
                    </div>
                ` : '';
                // "Ignora i limiti di pagina" (bypassaMargini) RIMOSSO del tutto — insieme al suo
                // tratteggio diagonale che stava qui. Era nato quando una pagina che sforava
                // traboccava sulla successiva: "ignorare il limite" aveva allora un senso visibile.
                // Con i FOGLI RIGIDI (vedi getReportPrintStyleBlock) il foglio non può più crescere,
                // quindi ignorare il limite non fa più traboccare niente: fa solo TAGLIARE il
                // contenuto in silenzio. Una funzione che ora può soltanto peggiorare il risultato
                // non va lasciata nel menu con un'etichetta rassicurante — rimossa su richiesta
                // esplicita ("non è mai servita a nulla"). Il modo giusto per far entrare più
                // contenuto è ridurre i margini della pagina o la griglia/altezza righe del blocco.
                return `
                    <div class="tpl-editor-block-body${selezionato ? ' selezionato' : ''}" data-block-id="${item.id}"><div class="tpl-editor-block-inner" data-block-id="${item.id}" style="${styleInner}">${contenutoBloccoOPlaceholder(item.type, ctx, item, rangeCategorie, { span, cols })}</div></div>
                    ${badgeOverflowCanvas}
                    ${selezionato ? `
                    <div class="tpl-editor-block-select-overlay">
                        ${eccezioniDiStile(item).length > 0 ? `<span class="tpl-editor-pallino-eccezioni" title="Questo blocco si scosta dallo stile del documento — apri il menu del blocco per vedere in cosa"></span>` : ''}
                        <div class="tpl-editor-block-chip" data-block-id="${item.id}" style="${posizioneBloccata ? 'cursor:not-allowed;' : ''}" title="${posizioneBloccata ? 'Bloccato: sblocca dal menu (tieni premuto) per poterlo modificare' : 'Trascina per spostare il blocco — tieni premuto sul blocco per altre opzioni'}">
                            <svg class="ico" style="width:11px; height:11px; flex-shrink:0;"><use href="#i-${posizioneBloccata ? 'lock' : 'move-y'}"/></svg>
                            <span>${def.label}</span>
                            ${(voceLock && voceLock.larghezzaFissata && !posizioneBloccata) ? '<svg class="ico" style="width:10px; height:10px; flex-shrink:0;" title="Larghezza fissa: ignorato da &quot;Bilancia riga&quot;"><use href="#i-pin"/></svg>' : ''}
                        </div>
                        ${!posizioneBloccata ? `
                        <div class="tpl-editor-block-handle tpl-editor-handle-bottom${manigliaTaglio ? ' e-taglio' : ''}${dueManiglie ? ' e-coppia-sx' : ''}" data-block-id="${item.id}" title="${titoloManigliaBasso}"><svg class="ico"><use href="#${manigliaTaglio ? 'i-scissors' : 'i-move-y'}"/></svg></div>
                        ${dueManiglie ? `<div class="tpl-editor-block-handle tpl-editor-handle-bottom e-taglio e-coppia-dx" data-block-taglio="${item.id}" title="${titoloTaglio}"><svg class="ico"><use href="#i-scissors"/></svg></div>` : ''}
                        <div class="tpl-editor-block-handle tpl-editor-handle-side" data-entry-id="${entryId}" title="Trascina per cambiare la larghezza (${Math.round(Math.min(cols, span) / cols * 100)}%)"><svg class="ico"><use href="#i-expand-h"/></svg></div>
                        ` : ''}
                    </div>
                    ` : maniglieDircontinuazione}
                `;
            }

            /** Rende un "gruppo" di righe consecutive (vedi calcolaGruppiRowSpanPagina) come
             * un'unica griglia CSS invece delle solite righe flex separate: è l'unico modo per far
             * sì che un blocco con rowSpan>1 copra visivamente più righe mentre le altre colonne di
             * quelle righe si dispongono naturalmente intorno allo spazio che occupa. La posizione a
             * griglia (grid-column) di ogni voce si ricava scorrendo in ordine i blocchi della riga
             * e sommandone i colSpan — i segnaposto invisibili (voce.reserved, vedi
             * impostaRowSpanVoce) non producono output ma fanno comunque avanzare il cursore di
             * colonna, così il contenuto vero "salta" esattamente lo spazio occupato dal blocco che
             * si estende da una riga sopra. Limite noto di questa prima versione: dentro un gruppo
             * non compaiono le maniglie divisorie tra colonne né le righe interne della griglia
             * guida (restano visibili solo al bordo del gruppo) — il ridimensionamento resta
             * comunque possibile dalle maniglie dirette del blocco, solo senza anteprima dal vivo. */
            function renderaGruppoRowSpanEditor(page, gruppo, cols, ctx, margineRiga) {
                const righe = page.rows.slice(gruppo.startIndex, gruppo.endIndex + 1);
                let inner = '';
                righe.forEach((row, r) => {
                    const gridRow = r + 1;
                    let colCursor = 1;
                    row.blocks.forEach(entry => {
                        const span = spanVoceInGriglia(entry, cols);
                        if (entry.reserved) { colCursor += span; return; }
                        const rsMax = gruppo.endIndex - gruppo.startIndex - r + 1;
                        const rowSpanEff = Math.max(1, Math.min(rsMax, entry.rowSpan || 1));
                        const margineAllineamento = entry.align === 'right' ? 'margin-left:auto;' : entry.align === 'center' ? 'margin-left:auto; margin-right:auto;' : '';
                        const gridStyle = `grid-column:${colCursor} / span ${span}; grid-row:${gridRow} / span ${rowSpanEff}; min-width:0; ${margineAllineamento}`;
                        if (entry.stack && entry.stack.length > 0) {
                            inner += `<div class="tpl-editor-block tpl-editor-stack" data-block-id="${entry.id}" style="${gridStyle} display:flex; flex-direction:column; gap:8px;">`;
                            entry.stack.forEach(item => {
                                const sel = templateEditorState.selectedBlockId === item.id ? (templateEditorState.justSelectedAnimKey === item.id ? ' tpl-editor-block-selected tpl-editor-block-select-pop' : ' tpl-editor-block-selected') : '';
                                inner += `<div class="tpl-editor-stack-item${sel}" data-item-id="${item.id}">${costruisciHtmlBloccoEditor(item, entry.id, span, cols, ctx)}</div>`;
                            });
                            inner += `</div>`;
                        } else {
                            const sel = templateEditorState.selectedBlockId === entry.id ? (templateEditorState.justSelectedAnimKey === entry.id ? ' tpl-editor-block-selected tpl-editor-block-select-pop' : ' tpl-editor-block-selected') : '';
                            inner += `<div class="tpl-editor-block${sel}" data-block-id="${entry.id}" data-block-tipo="${entry.type || ''}" style="${gridStyle}">${costruisciHtmlBloccoEditor(entry, entry.id, span, cols, ctx)}</div>`;
                        }
                        colCursor += span;
                    });
                });
                // data-rows-count: quante voci REALI di page.rows[] rappresenta questo unico elemento
                // DOM — serve a spostaBlocchiInEccessoAllaPaginaSuccessiva per tradurre l'indice DOM
                // in indice reale e non spezzare mai un gruppo a metà tra due pagine.
                return `<div class="tpl-editor-row tpl-editor-row-group" data-row-id="${righe[0].id}" data-rows-count="${righe.length}" style="display:grid; grid-template-columns:repeat(${cols}, 1fr); grid-auto-rows:min-content; column-gap:8px; row-gap:10px; margin-bottom:${margineRiga != null ? margineRiga : '10px'}; position:relative;">${inner}</div>`;
            }

            function renderTemplateEditorCanvas() {
                const canvas = document.getElementById('templateEditorCanvas');
                if (!canvas) return;
                // FLIP ("First, Last, Invert, Play"): si cattura la posizione/dimensione ATTUALE di
                // ogni blocco prima di ributtare giù l'HTML, così dopo il re-render si può animare
                // la transizione dalla vecchia alla nuova posizione invece di far "scattare" tutto
                // di colpo — vale per il drag&drop, il cambio colSpan e il cambio scala/font.
                // MAI durante riflussoAutomaticoSospeso (impostato da sincronizzaFlussiBlocchiLunghi
                // durante tutto il suo calcolo, vedi lì): quel calcolo è ormai puro (nessuna
                // navigazione tra pagine, nessun render intermedio — griglia fissa sugli indici di
                // categoria), ma la guardia resta comunque per sicurezza contro eventuali render
                // indotti indirettamente durante il calcolo — se mai capitasse, un FLIP calcolato
                // su un render che l'utente non vede mai non avrebbe comunque senso.
                const vecchiRect = riflussoAutomaticoSospeso ? new Map() : catturaRectBlocchiPerFlip(canvas);
                const vecchiRectInterni = riflussoAutomaticoSospeso ? new Map() : catturaRectBlocchiPerFlip(canvas, '.tpl-editor-block-inner');
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) { canvas.innerHTML = ''; return; }
                // L'anteprima con dati reali (specie l'inquadramento: 9 tessere satellitari
                // scaricate dalla rete) non deve essere ricalcolata ad ogni singolo re-render
                // (ogni +/- di larghezza, ogni drag, ogni cambio pagina) — i dati della prova non
                // cambiano mentre l'editor è aperto, quindi si calcola una volta sola all'apertura
                // e si riusa da qui (vedi apriTemplateEditor).
                if (!templateEditorState.ctx) templateEditorState.ctx = computeEditorPreviewCtx();
                aggiornaCtxFotoEditor();
                const ctx = templateEditorState.ctx;
                const cols = page.cols || 4;

                let html = '';
                // page.header.enabled non esiste più: mostra/nascondi è del TEMPLATE
                // (templateEditorState.headerEnabled, vedi apriTemplateEditor) — richiesto
                // esplicitamente, "come per il numero pagine, questi devono essere globali per
                // tutte le pagine". Il contenuto (immagine/testo/altezza) resta per-pagina.
                // L'intestazione non sta più nel contenuto: va nella fascia del margine superiore del
                // foglio, come nell'export (htmlIntestazioneNelMargine, margineConIntestazione). Il
                // riquadro sta nel FOGLIO (che ha i margini come padding), non nella tela.
                {
                    const foglioEditor = document.getElementById('templateEditorPageFrame');
                    const vecchia = document.getElementById('templateEditorHeaderZone');
                    if (vecchia) vecchia.remove();
                    if (foglioEditor && templateEditorState.headerEnabled && page.header) {
                        const mrgH = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                        foglioEditor.insertAdjacentHTML('afterbegin', htmlIntestazioneNelMargine(page.header, mrgH, { id: 'templateEditorHeaderZone', classe: 'tpl-editor-header-zone', anche_vuota: true }));
                        document.getElementById('templateEditorHeaderZone').style.outline = '1px dashed #cbd5e1';
                    }
                }

                // Spaziatura verticale distribuita (richiesta esplicitamente, "SI ASSOLUTAMENTE DA
                // IMPLEMENTARE"): quando page.distribuisciSpazioVerticale è attivo e la pagina non
                // è piena, lo spazio vuoto residuo si distribuisce IN MEZZO alle righe invece di
                // restare tutto ammassato in fondo (sopra il piè di pagina). Le righe vengono
                // accumulate in righeHtml (non più direttamente in html) così possono essere
                // avvolte in un contenitore dedicato: da SPENTO quel contenitore ha altezza
                // naturale (comportamento storico, invariato — il margin-top:auto del piè di
                // pagina sotto continua a consumare da solo tutto lo spazio residuo); da ACCESO il
                // contenitore diventa lui stesso flex:1 (si espande a consumare tutto lo spazio
                // residuo PRIMA del piè di pagina) con justify-content:space-between, che apre gap
                // uguali tra le righe — il margin-bottom fisso di ciascuna riga viene azzerato per
                // non sommarsi al gap distribuito (vedi margineRiga, passato anche a
                // renderaGruppoRowSpanEditor per i gruppi rowSpan).
                const distribuisciSpazio = !!page.distribuisciSpazioVerticale;
                const margineRiga = distribuisciSpazio ? '0' : '12px'; // come la stampa (buildPaginaRigheHtml)
                let righeHtml = '';
                if (page.continuaBloccoId) {
                    // Pagina di continuazione (vedi sincronizzaFlussiBlocchiLunghi): non ha righe
                    // proprie, mostra solo il seguito di un blocco flowable che vive per intero
                    // sulla sua pagina di origine — mai le righe normali di questa pagina (non ne
                    // ha, sono riservate esclusivamente a questo).
                    righeHtml = costruisciRigaContinuazionePagina(page, ctx);
                } else if (!page.rows || page.rows.length === 0) {
                    righeHtml = `<div style="padding:30px; text-align:center; font-size:12px; color:#94a3b8; border:2px dashed #cbd5e1; border-radius:8px;">Trascina qui un blocco dalla palette a sinistra</div>`;
                } else {
                    // Blocco flowable con un taglio già calcolato su QUESTA pagina di origine (vedi
                    // sincronizzaFlussiBlocchiLunghi/page.flowableUltimaCategoriaMostrata): stessa
                    // identica condizione di rilevamento usata da sempre in questa zona (ultima riga,
                    // da sola, non impilata, tipo flowable) — SOLO che ora il range calcolato qui
                    // viene passato DIRETTAMENTE a costruisciHtmlBloccoEditor qualche riga sotto,
                    // invece di essere applicato DOPO via DOM (applicaVisibilitaCategorieBlocco,
                    // RIMOSSA — vedi filtraCategorieHtmlFlowable): l'HTML che finisce sulla pagina
                    // contiene già solo le categorie giuste, un solo passaggio deterministico invece
                    // di due che potevano disallinearsi.
                    const righeQuiOrig = page.rows || [];
                    // In QUALUNQUE riga, non piu' solo nell'ultima: vedi
                    // sincronizzaFlussiBlocchiLunghi, che scrive page.flowableRigaIdx.
                    const rigaFlowQui = (page.flowableRigaIdx != null) ? righeQuiOrig[page.flowableRigaIdx]
                        : righeQuiOrig[righeQuiOrig.length - 1];
                    const bloccoFlowableQuiOrig = (rigaFlowQui && rigaFlowQui.blocks && rigaFlowQui.blocks.length === 1 &&
                        eBloccoSpezzabile(rigaFlowQui.blocks[0]))
                        ? rigaFlowQui.blocks[0] : null;
                    const rangeFlowableOrigine = (bloccoFlowableQuiOrig && page.flowableUltimaCategoriaMostrata != null)
                        ? { blockId: bloccoFlowableQuiOrig.id, da: 0, a: page.flowableUltimaCategoriaMostrata }
                        : null;
                    // La diagnostica che stava qui è stata rimossa: il bug che doveva inseguire —
                    // "il blocco lungo sparisce aprendo le anteprime" — è chiuso, e non era niente
                    // di quello che misurava. Le miniature delle pagine di continuazione scrivevano
                    // il filtro delle categorie in un foglio di stile in linea, che non è confinato al blocco che lo
                    // contiene ma vale per tutto il documento: spegneva le tabelle vere sul foglio.
                    // Vedi miniaturaPaginaContinuazione. I numeri che questa traccia stampava —
                    // tabelle presenti, altezza zero, overflow visible — erano tutti coerenti con
                    // "sono lì ma spente", e nessuno dei tre puntava dove ho continuato a cercare.
                    // Segmenti (vedi calcolaGruppiRowSpanPagina): righe "singola" si rendono come
                    // sempre (flex, invariato — il 100% dei template senza rowSpan passa sempre di
                    // qui); un blocco con rowSpan>1 fa scattare invece un "gruppo" di più righe rese
                    // insieme come un'unica griglia CSS (renderaGruppoRowSpanEditor), l'unico modo
                    // per farlo comparire visivamente esteso su più righe.
                    let gruppiRighe = calcolaGruppiRowSpanPagina(page);
                    // LE RIGHE DOPO IL BLOCCO DIVISO SE NE VANNO CON LUI, in fondo all'ultima
                    // pagina della catena — che e' esattamente cio' che il motore di export fa
                    // gia' oggi, impaginando gli atomi in ordine. Fin qui editor e PDF mostravano
                    // due documenti diversi, e quello giusto era il PDF.
                    // Il modello dati NON si tocca: le righe restano dove le hai messe, cambia
                    // solo su quale foglio compaiono. Spostarle davvero avrebbe voluto dire che
                    // togliendo l'interruzione non tornano piu' indietro da sole.
                    if (page.flowableRigaIdx != null) {
                        gruppiRighe = gruppiRighe.filter(seg => {
                            const idx = (seg.tipo === 'gruppo') ? seg.startIndex : seg.rowIndex;
                            return idx == null || idx <= page.flowableRigaIdx;
                        });
                    }
                    gruppiRighe.forEach(seg => {
                        if (seg.tipo === 'gruppo') {
                            righeHtml += renderaGruppoRowSpanEditor(page, seg, cols, ctx, margineRiga);
                            return;
                        }
                        const row = page.rows[seg.rowIndex];
                        // align-items:flex-start (non più "stretch"): ogni colonna resta alta quanto
                        // il proprio contenuto invece di essere allungata a forza fino all'altezza
                        // della colonna più alta della riga — niente più riquadri con sfondo bianco
                        // che si allungano nel vuoto. Lo spazio libero che ne risulta accanto/sotto
                        // una colonna più corta resta visibile com'è: canvas nudo, pronto per
                        // ospitare un altro blocco impilato (vedi calcolaPosizioneDropEditor). La riga
                        // come contenitore flex resta comunque alta quanto la colonna più alta.
                        righeHtml += `<div class="tpl-editor-row" data-row-id="${row.id}" style="display:flex; gap:8px; margin-bottom:${margineRiga}; align-items:flex-start; position:relative;">`;
                        row.blocks.forEach(entry => {
                            const span = spanVoceInGriglia(entry, cols);
                            if (entry.stack && entry.stack.length > 0) {
                                // Colonna con più blocchi impilati verticalmente (vedi stackInto):
                                // il riquadro esterno resta ".tpl-editor-block" (serve al FLIP e allo
                                // spostamento dell'intera colonna) ma senza bordo/sfondo propri — sono
                                // i singoli ".tpl-editor-stack-item" ad avere l'aspetto di un blocco.
                                righeHtml += `<div class="tpl-editor-block tpl-editor-stack" data-block-id="${entry.id}" style="${styleDimensioneVoce(entry, span, cols)} min-width:0; display:flex; flex-direction:column; gap:8px;">`;
                                entry.stack.forEach(item => {
                                    // La classe "pop" si aggiunge SOLO quando questo blocco è quello
                                    // appena selezionato in questo giro di render (vedi
                                    // selezionaBloccoEditor/justSelectedAnimKey), non ad ogni
                                    // re-render mentre resta selezionato.
                                    const sel = templateEditorState.selectedBlockId === item.id ? (templateEditorState.justSelectedAnimKey === item.id ? ' tpl-editor-block-selected tpl-editor-block-select-pop' : ' tpl-editor-block-selected') : '';
                                    righeHtml += `<div class="tpl-editor-stack-item${sel}" data-item-id="${item.id}">${costruisciHtmlBloccoEditor(item, entry.id, span, cols, ctx, false, rangeFlowableOrigine && rangeFlowableOrigine.blockId === item.id ? rangeFlowableOrigine : null)}</div>`;
                                });
                                righeHtml += `</div>`;
                            } else {
                                const sel = templateEditorState.selectedBlockId === entry.id ? (templateEditorState.justSelectedAnimKey === entry.id ? ' tpl-editor-block-selected tpl-editor-block-select-pop' : ' tpl-editor-block-selected') : '';
                                righeHtml += `<div class="tpl-editor-block${sel}" data-block-id="${entry.id}" data-block-tipo="${entry.type || ''}" style="${styleDimensioneVoce(entry, span, cols)} min-width:0;">${costruisciHtmlBloccoEditor(entry, entry.id, span, cols, ctx, false, rangeFlowableOrigine && rangeFlowableOrigine.blockId === entry.id ? rangeFlowableOrigine : null)}</div>`;
                            }
                        });
                        righeHtml += `</div>`;
                    });
                }
                // "flex:1 0 auto" e non più "1 1 auto": il terzo valore è il RESTRINGIMENTO, e con 1
                // questo contenitore poteva essere compresso sotto l'altezza del proprio contenuto.
                // È esattamente quello che il referto ha fotografato aprendo le anteprime: righe
                // alte 34px con dentro una colonna di 1232px. Da lì il contenuto finiva a coordinate
                // assurde (blocco a -50819px, cioè fuori da qualunque schermo) e spariva — mentre
                // restava nel DOM, alto e con overflow visibile, che è il quadro esatto segnalato
                // ("il blocco diventa un rigo sottile, il contenuto non è visibile anche se
                // appartenente a quella pagina"). Con 0 il contenitore può ancora CRESCERE per
                // distribuire lo spazio (che è il motivo per cui esiste), ma non può più schiacciarsi
                // sotto il proprio contenuto.
                html += `<div id="templateEditorRowsWrap" style="${distribuisciSpazio ? 'flex:1 0 auto; display:flex; flex-direction:column; justify-content:space-between; min-height:0;' : ''}">${righeHtml}</div>`;

                // page.footer.enabled non esiste più: mostra/nascondi è del TEMPLATE, stesso
                // ragionamento dell'intestazione qui sopra.
                if (templateEditorState.footerEnabled && page.footer) {
                    // margin-top:auto (il canvas è ora un flex a colonna con min-height pari
                    // all'area stampabile, vedi sotto) spinge il piè di pagina fino al fondo
                    // FISICO del foglio invece di lasciarlo appiccicato subito sotto l'ultima riga
                    // quando la pagina non è piena — comportamento richiesto esplicitamente
                    // ("il numero delle pagine deve trovarsi sempre in fondo al foglio").
                    // showPageNumber è ora un'impostazione del TEMPLATE (templateEditorState.
                    // footerShowPageNumber), non più della singola pagina — vedi apriTemplateEditor.
                    html += `<div style="margin-top:auto; padding-top:8px; border-top:1px dashed #cbd5e1; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between;">
                        <span>${page.footer.text || ''}</span>
                        ${templateEditorState.footerShowPageNumber ? `<span>Pagina ${templateEditorState.activePageIdx + 1} di ${templateEditorState.pages.length}</span>` : ''}
                    </div>`;
                }

                // Margini del foglio (vedi templateEditorState.margins, regolabili con le maniglie —
                // renderManigliePaginaEditor): applicati qui al riquadro invece che fissi in CSS,
                // così il resto del canvas (area stampabile, guide, riflusso automatico) li segue
                // automaticamente ad ogni render senza doverli ricalcolare altrove.
                const mrg = margineConIntestazione(templateEditorState.margins, page.header, templateEditorState.headerEnabled);
                const frame = document.getElementById('templateEditorPageFrame');
                if (frame) frame.style.padding = `${mrg.top}mm ${mrg.right}mm ${mrg.bottom}mm ${mrg.left}mm`;

                // Area stampabile reale del foglio A4 (297mm meno i margini sopra/sotto): il canvas
                // diventa un contenitore flex a colonna alto ALMENO quanto quest'area, così il
                // margin-top:auto sul piè di pagina sopra ha davvero spazio da consumare per arrivare
                // fino in fondo — se il contenuto supera già quest'altezza (caso transitorio prima del
                // riflusso automatico) min-height non taglia nulla, semplicemente non c'è spazio extra
                // da distribuire.
                canvas.style.display = 'flex';
                canvas.style.flexDirection = 'column';
                // Se l'intestazione ha un'altezza FISSA impostata a mano (page.header.heightMm,
                // maniglia in basso all'intestazione), quello spazio va tolto dall'area minima
                // disponibile per il resto del contenuto — altrimenti intestazione+contenuto insieme
                // finiscono più alti di un intero foglio A4 (297mm - margini) ogni volta che si
                // allarga l'intestazione, e TUTTO il resto (piè di pagina, riga "fine pagina A4",
                // riflusso automatico) si sposta di conseguenza: sembra che ridimensionare
                // l'intestazione ridimensioni "tutta la pagina e i blocchi", quando invece deve
                // restare un cambiamento isolato SOLO all'intestazione (bug segnalato). Senza
                // un'altezza fissa (intestazione ad altezza naturale, comportamento storico) non c'è
                // nulla da sottrarre: la sua altezza reale non è nota prima del layout.
                // Ora l'intestazione sta nel margine (mrg qui sopra ne tiene già conto): niente da togliere.
                const headerHeightMm = 0;
                // Fase A del piano di unificazione: area stampabile dalla fonte unica
                // (calcolaBudgetPaginaMm), non più ricalcolata qui a mano.
                canvas.style.minHeight = `calc(${calcolaBudgetPaginaMm(mrg, false).areaStampabileMm}mm - ${headerHeightMm}mm)`;
                // LO STILE DEL DOCUMENTO ANCHE QUI. La tela non applicava le variabili --tpl-*:
                // i blocchi ripiegavano sui valori di riserva scritti nei var(), quindi
                // l'anteprima mostrava 11pt/Arial qualunque cosa avesse scelto l'utente nel
                // pannello «Stile del testo». Le stesse variabili del foglio di stampa, scritte
                // dalla stessa funzione: due sorgenti divergono, una no.
                canvas.setAttribute('style', (canvas.getAttribute('style') || '').replace(/--tpl-(?!riga-scale|font-scale)[^;]+;\s*/g, '')
                    + ' ' + cssVariabiliStileTesto(templateEditorState.stileTesto));
                canvas.innerHTML = html;
                // Consumata: il PROSSIMO re-render (es. regolando larghezza/font mentre il blocco
                // resta selezionato) non deve rigiocare l'animazione di selezione.
                templateEditorState.justSelectedAnimKey = null;

                // Applicazione del taglio di categorie via DOM DOPO canvas.innerHTML (applicaVisibilitaCategorieBlocco)
                // RIMOSSA (bug segnalato con screenshot: pagina di origine completamente vuota dopo
                // aver aggiunto un'interruzione manuale) — quel secondo passaggio "nascondi dopo"
                // poteva fallire in silenzio. Il taglio è ora già dentro l'HTML generato sopra: la
                // pagina di continuazione lo riceve da costruisciRigaContinuazionePagina (vedi lì,
                // legge page.continuaDaCategoria/continuaACategoria), la pagina di ORIGINE dal
                // rangeFlowableOrigine calcolato poco sopra e passato a costruisciHtmlBloccoEditor
                // nel ciclo delle righe. Nessun passaggio aggiuntivo qui, niente più da poter
                // disallineare.

                // Tocco sul corpo del blocco: seleziona (mostra etichetta+maniglie) oppure, con un
                // doppio tap, apre il menu contestuale — vedi attivaGestureTapBloccoEditor. Attivo
                // ANCHE sul contenuto di una pagina di continuazione (richiesto esplicitamente:
                // "vorrei poter modificare anche dal continuo... dammi la possibilità di usare il
                // menù fluttuante anche sui blocchi di continuazione") — apriMenuBloccoEditor e
                // tutti i suoi handler ora risalgono sempre alla pagina di ORIGINE reale del blocco
                // (vedi paginaOrigineBlocco), non più solo alla pagina attualmente attiva, quindi
                // funzionano correttamente indipendentemente da quale pagina è aperta quando si apre
                // il menu.
                canvas.querySelectorAll('.tpl-editor-block-body').forEach(body => {
                    attivaGestureTapBloccoEditor(body, body.dataset.blockId);
                });
                // Etichetta del blocco selezionato: si trascina per spostarlo (stesso motore di
                // drag&drop di prima, solo spostato dalla vecchia testata a quest'etichetta).
                canvas.querySelectorAll('.tpl-editor-block-chip').forEach(chip => {
                    attivaChipSpostamentoBlocco(chip, chip.dataset.blockId);
                });
                // Maniglia dimensione (lato basso del riquadro di selezione): trascinandola in
                // verticale si ridimensiona il blocco (equivalente del vecchio 🔍−/🔍+, ma
                // diretto invece che a scatti) — invertito su richiesta esplicita: verso il basso
                // ingrandisce, verso l'alto rimpicciolisce.
                canvas.querySelectorAll('.tpl-editor-handle-bottom').forEach(handle => {
                    // data-block-id = altezza (o taglio, se il blocco non ha un'altezza vera);
                    // data-block-taglio = la seconda maniglia, che fa SOLO il taglio.
                    attivaManigliaScalaBlocco(handle, handle.dataset.blockId || handle.dataset.blockTaglio,
                                              !!handle.dataset.blockTaglio);
                });
                // Il lucchetto "estendi il limite di scala" è stato rimosso (richiesto
                // esplicitamente, ripensamento radicale): lo Zoom ha ora un unico range fisso
                // (10%-400%) sempre disponibile, niente più controllo a parte per estenderlo.
                // Maniglia laterale (bordo destro): trascinandola in orizzontale si allarga/stringe
                // la COLONNA (colSpan, condiviso da tutti i blocchi impilati al suo interno).
                canvas.querySelectorAll('.tpl-editor-handle-side').forEach(handle => {
                    attivaManigliaColspanBlocco(handle, handle.dataset.entryId);
                });
                mostraLineaFinePaginaA4();
                adattaScalaEditorCanvas();
                renderGrigliaGuidaEditor();
                renderManigliePaginaEditor();

                // Riflusso automatico: se l'ultimo blocco (o più di uno) supera fisicamente la
                // fine della pagina A4, va spostato sulla pagina successiva SUBITO — l'editor non
                // deve mai mostrare un blocco "a cavallo" tra due pagine senza conseguenze, deve
                // già riflettere dove finirà davvero in stampa. La guardia editorRiflussoInCorso
                // evita che la chiamata ricorsiva a se stessa (per ri-renderizzare la pagina ormai
                // più corta) rientri in questo blocco all'infinito. riflussoAutomaticoSospeso
                // (richiesto esplicitamente: "quando inserisco un blocco più grande dello spazio
                // residuo, chiedimi se aggiungerlo su una nuova pagina o adattarlo alla pagina
                // corrente") permette a gestisciInserimentoBloccoNuovoConOverflow di ottenere UN
                // render "pulito" (col blocco appena inserito alla sua dimensione naturale, anche
                // se sfora) per poterne misurare l'eccesso PRIMA che il riflusso lo sposti da solo
                // in silenzio — la domanda va fatta prima, non dopo che è già sparito su un'altra
                // pagina.
                //
                // ATTENZIONE ALL'ORDINE: questo controllo va fatto PRIMA di applicaFlipBlocchi
                // (spostato qui apposta, era dopo) — bug osservato: cliccare/selezionare un blocco
                // (quindi senza cambiare nulla di strutturale) a volte "sminchiava" le pagine di
                // continuazione di un blocco flowable vicino, spezzandolo in modo diverso e peggiore
                // (una pagina con solo una categoria, un'altra quasi vuota). Causa: applicaFlipBlocchi
                // applica un transform CSS temporaneo (per l'animazione "morbida") e lo azzera solo al
                // frame successivo via requestAnimationFrame — se la misura dell'overflow qui sotto
                // girava DOPO applicaFlipBlocchi ma nello stesso giro di JS, leggeva getBoundingClientRect()
                // con quel transform ancora applicato, cioè geometria temporaneamente falsata. Bastava
                // che UNA riga qualsiasi risultasse per errore "in eccesso" per far scattare
                // flowSyncNecessario=true e ricalcolare da capo (male) le pagine di continuazione di un
                // blocco flowable che non c'entrava nulla con quel click. Misurando PRIMA di applicare
                // qualunque transform d'animazione, la lettura è sempre quella vera e finale.
                if (!editorRiflussoInCorso && !riflussoAutomaticoSospeso) {
                    editorRiflussoInCorso = true;
                    const spostato = spostaBlocchiInEccessoAllaPaginaSuccessiva();
                    editorRiflussoInCorso = false;
                    if (spostato) {
                        // Righe spostate/pagina creata: struttura cambiata davvero, va marcato
                        // esplicitamente anche qui (questo riflusso non passa da
                        // salvaUndoSnapshotEditor, è automatico/silenzioso come sincronizzaFlussi
                        // BlocchiLunghi) così il render qui sotto ricalcola per davvero le pagine di
                        // continuazione se questo spostamento ha cambiato lo spazio disponibile.
                        templateEditorState.flowSyncNecessario = true;
                        renderTemplateEditorPagesStrip();
                        renderTemplateEditorPageControls();
                        renderTemplateEditorPalette();
                        renderTemplateEditorCanvas();
                        // Questo render è ormai superato dal render fresco appena innescato sopra
                        // (che ripartirà da capo, con la sua propria animazione FLIP): applicare qui
                        // sotto il FLIP/flowSync su geometria ormai vecchia servirebbe solo a farli
                        // scontrare con quelli del render nuovo.
                        return;
                    }
                }

                if (!riflussoAutomaticoSospeso) {
                    applicaFlipBlocchi(vecchiRect, canvas);
                    applicaFlipBlocchi(vecchiRectInterni, canvas, '.tpl-editor-block-inner', false);
                }

                const frameEl = document.getElementById('templateEditorPageFrame');
                if (frameEl) frameEl.classList.toggle('tpl-editor-preview-mode', !!templateEditorState.previewMode);

                // Blocchi "flowable" (vedi sincronizzaFlussiBlocchiLunghi): stessa idea del
                // riflusso sopra ma per un blocco che, invece di traslocare per intero, continua
                // da solo su una o più pagine create/aggiornate/eliminate automaticamente.
                // RICHIESTO ESPLICITAMENTE dopo ripetuti bug di instabilità: le pagine di
                // continuazione devono essere FISSE — "modificabili solo quando la lunghezza del
                // blocco viene modificata o vengono aggiunti nuovi blocchi", MAI ricalcolate solo
                // per aver navigato, selezionato un blocco o aperto un menu. Il ricalcolo gira quindi
                // SOLO quando templateEditorState.flowSyncNecessario è vero — marcato da
                // salvaUndoSnapshotEditor (chiamata da ogni azione strutturale, vedi lì) e da
                // undoTemplateEditor; consumato (rimesso a false) qui PRIMA di ricalcolare, così le
                // tante renderizzazioni interne alla sincronizzazione stessa (naviga sulle pagine di
                // continuazione per misurarle) non la rifanno scattare da capo su se stessa. La
                // guardia sincronizzazioneFlussoInCorso resta comunque, a ulteriore protezione contro
                // rientri ricorsivi.
                if (!editorRiflussoInCorso && !riflussoAutomaticoSospeso && !sincronizzazioneFlussoInCorso && templateEditorState.flowSyncNecessario) {
                    templateEditorState.flowSyncNecessario = false;
                    sincronizzazioneFlussoInCorso = true;
                    sincronizzaFlussiBlocchiLunghi();
                    sincronizzazioneFlussoInCorso = false;
                    // Fase C (vedi Piano_Riscrittura_Layout_Export.md): avvisi di overflow reali per
                    // i blocchi flowable, sulla STESSA cadenza "a riposo" di sincronizzaFlussiBlocchiLunghi
                    // qui sopra — mai ricalcolati durante drag/animazioni. Deliberatamente NON atteso
                    // (fire-and-forget): è una misura pesante (iframe di stampa reale per ogni blocco
                    // flowable), non deve mai bloccare il render che l'ha innescata. Aggiorna solo la
                    // cache in background; il menu del blocco la legge alla prossima apertura.
                    // La misura è pesante e non viene attesa, ma quando arriva NON deve restare
                    // in un cassetto: il menu l'ha già letta com'era prima (viene ricostruito
                    // subito dopo questo render), quindi mostrerebbe avvisi già risolti e numeri
                    // vecchi. Segnalato: "il tasto dividi compare anche quando il conflitto è già
                    // stato risolto". Si annota l'impronta di adesso e la si confronta dopo.
                    const idMenuAperto = idBloccoMenuAperto();
                    const firmaMisurePrima = firmaMisureBlocco(idMenuAperto);
                    ricalcolaAvvisiOverflowTuttiBlocchi().then(() => {
                        // Con misure fresche, chi ha una divisione automatica attiva la rifà: è la
                        // richiesta "se il tasto è stato premuto, si accorge della modifica e
                        // ricalcola". Se il risultato coincide con quello attuale non scrive niente
                        // e il giro finisce qui.
                        if (riapplicaDivisioniAutomaticheTemplate()) {
                            templateEditorState.flowSyncNecessario = true;
                            renderTemplateEditorCanvas();
                            return; // il render rientra qui e riallineerà il menu con i numeri nuovi
                        }
                        riallineaMenuBloccoAMisureNuove(idMenuAperto, firmaMisurePrima);
                    });
                    // Fase D: verifica reale pagina-per-pagina, stessa cadenza "a riposo" — a
                    // differenza dell'avviso nel menu (letto alla prossima apertura), la striscia
                    // miniature è quasi sempre già visibile: si ridisegna da sola quando la verifica
                    // è pronta, così il segnale compare senza bisogno di un'altra interazione.
                    verificaPagineOrigineControMotoreReale().then(() => {
                        const modal = document.getElementById('modalTemplateEditor');
                        if (modal && modal.classList.contains('open')) renderTemplateEditorPagesStrip();
                    });
                }
            }

            /** Seleziona un blocco (tocco singolo sul suo corpo): fa comparire l'etichetta
             * trascinabile e le due maniglie dirette al posto della vecchia barra di controlli. */
            function selezionaBloccoEditor(blockId) {
                if (templateEditorState.selectedBlockId === blockId) return;
                templateEditorState.selectedBlockId = blockId;
                // Animazione "pop" da riprodurre SOLO al render immediatamente successivo alla
                // selezione (richiesto esplicitamente: il blocco deve reagire visivamente quando
                // selezionato) — non ad ogni re-render successivo mentre resta selezionato
                // (altrimenti pulserebbe di continuo regolando larghezza/font/zoom). Consumata e
                // azzerata in renderTemplateEditorCanvas subito dopo averla usata.
                templateEditorState.justSelectedAnimKey = blockId;
                chiudiMenuBloccoEditor();
                renderTemplateEditorCanvas();
            }
            function deselezionaBloccoEditor() {
                if (!templateEditorState.selectedBlockId) return;
                templateEditorState.selectedBlockId = null;
                chiudiMenuBloccoEditor();
                renderTemplateEditorCanvas();
            }

            /** Distingue un tocco singolo (seleziona il blocco) da un tocco prolungato (apre il
             * menu contestuale) sul corpo di un blocco. Se nel frattempo il dito/mouse si sposta
             * oltre una piccola soglia si considera l'inizio di un altro gesto (scroll/pan del
             * canvas) e si annulla tutto — niente selezione né menu per sbaglio durante uno
             * scorrimento. */
            // Doppio tap per aprire il menu del blocco (richiesto esplicitamente, al posto della
            // pressione prolungata: "l'utente può aver selezionato il blocco solo per spostarlo o
            // usare le maniglie" — con la pressione prolungata, una pausa naturale prima di
            // afferrare una maniglia bastava a far comparire il popover per sbaglio). Un tap solo
            // seleziona sempre e soltanto (etichetta+maniglie, come oggi); il popover compare SOLO
            // se un secondo tap sullo STESSO blocco arriva entro la soglia — stessa tecnica già
            // in uso per il reset delle maniglie (ultimoTapManigliaBloccoCanvas).
            let ultimoTapSelezioneBlocco = { blockId: null, t: 0 };
            function attivaGestureTapBloccoEditor(bodyEl, blockId) {
                let stato = null;
                bodyEl.addEventListener('pointerdown', (e) => {
                    if (templateEditorState.previewMode) return;
                    stato = { startX: e.clientX, startY: e.clientY, moved: false, lungo: false };
                    // Tocco prolungato = menu (richiesto il 27/09/2026, insieme al tasto destro).
                    const questo = stato;
                    questo.timer = setTimeout(() => {
                        if (stato !== questo || questo.moved) return;
                        questo.lungo = true;
                        apriMenuDaGesto();
                    }, 550);
                    // Riscontro visivo immediato al tocco (richiesto esplicitamente): un piccolo
                    // schiacciamento che si annulla da solo, indipendente dall'esito del gesto
                    // (tap → seleziona, doppio tap → menu, spostamento → pan/drag) — stesso
                    // principio già usato per i blocchi della palette.
                    bodyEl.classList.add('tpl-editor-block-pressed');
                    setTimeout(() => bodyEl.classList.remove('tpl-editor-block-pressed'), 140);
                });
                bodyEl.addEventListener('pointermove', (e) => {
                    if (!stato) return;
                    if (Math.abs(e.clientX - stato.startX) > 8 || Math.abs(e.clientY - stato.startY) > 8) {
                        stato.moved = true;
                        clearTimeout(stato.timer);
                    }
                });
                const apriMenuDaGesto = () => {
                    selezionaBloccoEditor(blockId);
                    apriMenuBloccoEditor(blockId);
                    triggerVibrate(12);
                };
                const fine = () => {
                    if (!stato) return;
                    clearTimeout(stato.timer);
                    const eraFermo = !stato.moved && !stato.lungo;
                    stato = null;
                    if (!eraFermo) return; // un trascinamento o un tocco prolungato non sono un tap
                    selezionaBloccoEditor(blockId);
                    const ora = Date.now();
                    if (ultimoTapSelezioneBlocco.blockId === blockId && (ora - ultimoTapSelezioneBlocco.t) < 350) {
                        ultimoTapSelezioneBlocco = { blockId: null, t: 0 };
                        apriMenuBloccoEditor(blockId);
                        triggerVibrate(12);
                    } else {
                        ultimoTapSelezioneBlocco = { blockId, t: ora };
                    }
                };
                bodyEl.addEventListener('pointerup', fine);
                bodyEl.addEventListener('pointercancel', () => { if (stato) clearTimeout(stato.timer); stato = null; });
                bodyEl.addEventListener('contextmenu', (e) => {
                    e.preventDefault();
                    if (templateEditorState.previewMode) return;
                    // Su Android il tocco prolungato manda anche contextmenu: il menu è già aperto.
                    const menu = document.getElementById('templateEditorBlockMenu');
                    if (menu && menu.dataset.blockId === blockId) return;
                    apriMenuDaGesto();
                });
            }

            /** Etichetta del blocco selezionato: trascinarla riusa esattamente lo stesso motore di
             * drag&drop già usato dalla vecchia testata (avviaTrascinamentoEditor) — solo l'affordance
             * visiva cambia, non la logica di spostamento/riordino. */
            function attivaChipSpostamentoBlocco(chipEl, itemId) {
                chipEl.addEventListener('pointerdown', (e) => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    const blk = trovaBloccoPerId(page, itemId);
                    // Lucchetto posizione (richiesto esplicitamente): un blocco bloccato non parte
                    // proprio in trascinamento, un piccolo scatto comunica "non si muove" senza
                    // dover aprire il menu per scoprirlo.
                    const voce = trovaVoceContenenteBlocco(page, itemId);
                    if (voce && voce.posizioneBloccata) {
                        e.stopPropagation();
                        triggerVibrate(25);
                        chipEl.classList.add('tpl-editor-chip-shake');
                        setTimeout(() => chipEl.classList.remove('tpl-editor-chip-shake'), 320);
                        return;
                    }
                    const label = blk ? ((REPORT_BLOCK_TYPES[blk.type] || {}).label || blk.type) : '';
                    avviaTrascinamentoEditor(e, { kind: 'existing', blockId: itemId }, label);
                });
            }

            // Stato del trascinamento di UNA delle due maniglie dirette (scala o colSpan): durante
            // il trascinamento si aggiorna solo l'aspetto a video (zoom CSS dal vivo per la scala,
            // etichetta numerica per il colSpan) — la scrittura nello stato/undo avviene una sola
            // volta, al rilascio, per non intasare la cronologia undo di un salto per ogni pixel.
            let bloccoManigliaStato = null;
            // Ultimo evento pointer noto durante il trascinamento di una maniglia di blocco (scala o
            // colSpan): serve solo ad avviaAutoScrollViewportEditor (vedi sopra) per sapere dove sta
            // il dito/puntatore quando scorre il viewport da sola, non alla logica di ridimensionamento
            // vera e propria (quella continua a leggere gli eventi pointermove reali del browser).
            let resizeManigliaLastEvent = null;
            // Doppio tocco per resettare a 100% (richiesto esplicitamente, "su tutte le maniglie...
            // possono diventare degli slider? Se premo 2 volte sul cursore si resettano a 100%"):
            // stessa tecnica già usata per le maniglie di margine/intestazione pagina
            // (ultimoTapManigliaPagina), qui riusata per gli slider "Larghezza"/"Zoom" nel menu del
            // blocco — vedi attivaDoppioTapResetSlider più sotto.
            let ultimoTapSliderMenu = { key: null, t: 0 };
            // Stessa tecnica, per le maniglie VERE sul canvas (bottom = scala/altezza righe, side =
            // larghezza) — richiesta esplicitamente di nuovo dopo aver visto che il reset funzionava
            // solo sugli slider del menu, non su queste (bug segnalato: "quando premo due volte su
            // queste maniglie non viene resettata la dimensione"). Chiavi con prefisso diverso
            // ('scala:'/'colspan:') così un doppio tocco su una maniglia non viene "rubato" da un
            // tocco recente su un'altra maniglia diversa.
            let ultimoTapManigliaBloccoCanvas = { key: null, t: 0 };
            /** Sul PRIMO tocco lascia partire il trascinamento nativo dello slider (non fa nulla,
             * si limita a registrare l'istante); se un SECONDO tocco sullo stesso slider arriva
             * entro 350ms, impedisce che parta un trascinamento e lo riporta invece a 100% —
             * stessa soglia e stesso schema "pointerdown, non dblclick" già collaudato per le
             * maniglie di pagina, così funziona identico con mouse e con le dita. */
            function attivaDoppioTapResetSlider(inputEl, key, valoreReset) {
                // valoreReset (richiesto per la foto: il predefinito è 70mm, non 100 — il resto
                // dei blocchi continua a resettarsi a 100% come sempre, parametro opzionale).
                const reset = valoreReset != null ? valoreReset : 100;
                inputEl.addEventListener('pointerdown', (e) => {
                    const ora = Date.now();
                    if (ultimoTapSliderMenu.key === key && (ora - ultimoTapSliderMenu.t) < 350) {
                        ultimoTapSliderMenu = { key: null, t: 0 };
                        e.preventDefault();
                        inputEl.value = reset;
                        inputEl.dispatchEvent(new Event('input', { bubbles: true }));
                        inputEl.dispatchEvent(new Event('change', { bubbles: true }));
                        return;
                    }
                    ultimoTapSliderMenu = { key, t: ora };
                });
            }
            /** Maniglia di ridimensionamento sul lato basso: TRE comportamenti diversi a seconda
             * del tipo di blocco (richiesto esplicitamente, "solo altezza", dopo il bug del testo
             * sovrapposto a zoom molto basso su "Dati Prova" — vedi anche costruisciHtmlBloccoEditor
             * per la spiegazione completa). Per i blocchi "a righe" (BLOCCHI_CON_FONT_REGOLABILE:
             * tabelle/testo) regola SOLO --tpl-riga-scale (spazio verticale tra le righe, font e
             * larghezze intonsi). Per le foto (immagine-libera, richiesto esplicitamente: "lo Zoom
             * non serve, al massimo dovrei poter regolare l'altezza del riquadro" — segnalato
             * insieme al bug della didascalia che si ingrandiva insieme alla foto) regola
             * un'altezza diretta in millimetri (--tpl-photo-height-mm), mai lo zoom — la didascalia
             * vive fuori da quel calcolo, la sua dimensione si regola solo dal selettore "Dimensione"
             * nel menu (blockObj.captionFontSizePt). Per tutti gli altri (mappe/grafici) resta lo
             * zoom CSS di sempre, dove "ingrandire il contenuto oltre il proprio riquadro" ha
             * ancora senso. */
            /** I CONFINI FRA UN CAPOVERSO E L'ALTRO, misurati sul foglio.
             *
             * Un'interruzione si puo' mettere solo FRA due elementi: dentro un capoverso non
             * significa niente — le righe si riformano da sole appena cambia la larghezza, e il
             * taglio si mangerebbe da solo. Quindi il gesto si aggancia ai confini veri, e la
             * riga tratteggiata dell'anteprima si posa esattamente li'. */
            /** I CONFINI DOVE SI PUO' TAGLIARE, qualunque sia il blocco.
             *
             * Un blocco di testo si taglia fra un capoverso e l'altro; una tabella lunga fra una
             * categoria e l'altra. Sono la stessa idea espressa in due unita' diverse — «il pezzo
             * piu' piccolo che ha senso non spezzare» — e da qui in giu' il gesto e' identico:
             * stessa riga arancione, stesso rosso per togliere, stessa vibrazione al cambio.
             * Restava un menu a categorie per le tabelle e una maniglia per il testo: due
             * linguaggi per la stessa cosa, e chi impara l'uno non riconosce l'altro. */
            function confiniTaglioBlocco(itemId, blk) {
                if (blk && BLOCCHI_FLOWABLE.has(blk.type)) {
                    const corpo = document.querySelector(`.tpl-editor-block-body[data-block-id="${itemId}"]`);
                    if (!corpo) return [];
                    const forzati = new Set(Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : []);
                    const confini = [];
                    corpo.querySelectorAll('table[data-categoria-index]').forEach(tb => {
                        const idx = parseInt(tb.getAttribute('data-categoria-index'), 10);
                        if (!isFinite(idx) || idx <= 0) return;   // prima della prima non e' un taglio
                        const r = tb.getBoundingClientRect();
                        if (r.height === 0) return;               // categoria non visibile su questa pagina
                        confini.push({ indice: idx, y: r.top, gia: forzati.has(idx), categoria: true });
                    });
                    return confini;
                }
                const contenuto = document.querySelector(`.tpl-editor-block-body[data-block-id="${itemId}"] .tpl-block-richtext`);
                if (!contenuto) return [];
                const figli = [...contenuto.children];
                const confini = [];
                figli.forEach((el, i) => {
                    if (i === 0) return; // prima del primo non e' un taglio: e' "tutto sulla pagina dopo"
                    const r = el.getBoundingClientRect();
                    // GIA' TAGLIATO QUI? Serve al gesto inverso: portando la maniglia su un
                    // taglio che c'e' gia', lo si toglie. Senza, l'unico modo per disfare era
                    // l'annulla — e dopo tre altre modifiche l'annulla non e' piu' una risposta.
                    const gia = el.hasAttribute('data-interruzione-pagina')
                        || !!(el.previousElementSibling && el.previousElementSibling.hasAttribute
                              && el.previousElementSibling.hasAttribute('data-interruzione-pagina'));
                    confini.push({ indice: i, y: r.top, gia });
                });
                return confini;
            }

            /** La riga tratteggiata che mostra DOVE cadra' il taglio, mentre lo si sceglie. */
            function mostraAnteprimaTaglio(y, togli) {
                let linea = document.getElementById('templateEditorAnteprimaTaglio');
                if (!linea) {
                    linea = document.createElement('div');
                    linea.id = 'templateEditorAnteprimaTaglio';
                    // IL MAGNETISMO SI VEDE, non si subisce. La riga non salta da un capoverso
                    // all'altro: ci SCIVOLA, con una molla corta. E' la differenza fra «questo
                    // aggeggio e' scattoso» e «capisco che si aggancia, e a cosa»: l'animazione
                    // non e' un abbellimento, e' l'unico modo che ha il gesto per spiegarsi.
                    linea.style.cssText = 'position:fixed; left:0; right:0; height:0; border-top:2px dashed #f59e0b; z-index:335; pointer-events:none;'
                        + 'transition: top 140ms cubic-bezier(.22,1.4,.36,1), border-color 120ms linear;';
                    const etichetta = document.createElement('div');
                    etichetta.id = 'templateEditorAnteprimaTaglioEtichetta';
                    etichetta.style.cssText = 'position:absolute; right:8px; top:-9px; color:#1e293b; font-size:10px; font-weight:800; padding:1px 7px; border-radius:8px; transition: background 120ms linear;';
                    linea.appendChild(etichetta);
                    document.body.appendChild(linea);
                }
                const etichetta = document.getElementById('templateEditorAnteprimaTaglioEtichetta');
                if (etichetta) {
                    etichetta.textContent = togli ? 'togli questa interruzione' : 'la pagina finisce qui';
                    etichetta.style.background = togli ? '#dc2626' : '#f59e0b';
                    etichetta.style.color = togli ? '#fff' : '#1e293b';
                }
                linea.style.borderTopColor = togli ? '#dc2626' : '#f59e0b';
                linea.style.top = y + 'px';
                linea.style.display = 'block';
            }
            function nascondiAnteprimaTaglio() {
                const linea = document.getElementById('templateEditorAnteprimaTaglio');
                if (linea) linea.style.display = 'none';
            }

            /** Mette un'interruzione di pagina PRIMA del capoverso numero `indice`.
             * Scrive nel documento del blocco, quindi la si ritrova anche aprendo «Modifica
             * testo»: e' la stessa interruzione, non un doppione che vive altrove. */
            function inserisciInterruzioneNelTesto(blk, indice) {
                if (!blk || !blk.richHtml) return false;
                try {
                    const doc = new DOMParser().parseFromString('<div id="r">' + blk.richHtml + '</div>', 'text/html');
                    const radice = doc.getElementById('r');
                    const figli = [...radice.children];
                    if (indice <= 0 || indice >= figli.length) return false;
                    const bersaglio = figli[indice];
                    // GIA' INTERROTTO PROPRIO LI'. Due controlli, non uno: dopo la prima
                    // interruzione il salto stesso diventa un figlio, quindi lo stesso confine
                    // si presenta a volte come «il bersaglio E' un salto» e a volte come «prima
                    // del bersaglio c'e' un salto». Guardarne solo uno lasciava accumulare
                    // interruzioni sovrapposte, che avrebbero prodotto pagine bianche.
                    if (bersaglio.hasAttribute && bersaglio.hasAttribute('data-interruzione-pagina')) return false;
                    const prima = bersaglio.previousElementSibling;
                    if (prima && prima.hasAttribute && prima.hasAttribute('data-interruzione-pagina')) return false;
                    const salto = doc.createElement('div');
                    salto.setAttribute('data-interruzione-pagina', 'manuale');
                    salto.setAttribute('class', 'dpsh-interruzione');
                    radice.insertBefore(salto, bersaglio);
                    blk.richHtml = radice.innerHTML;
                    return true;
                } catch (e) { return false; }
            }

            /** Toglie l'interruzione che sta PRIMA del capoverso numero `indice`.
             * E' l'inverso esatto di inserisciInterruzioneNelTesto: stesso gesto, stessa
             * maniglia, direzione opposta. Senza, l'unico modo per disfare un taglio di troppo
             * era l'annulla — che dopo altre tre modifiche non e' piu' una risposta. */
            function togliInterruzioneNelTesto(blk, indice) {
                if (!blk || !blk.richHtml) return false;
                try {
                    const doc = new DOMParser().parseFromString('<div id="r">' + blk.richHtml + '</div>', 'text/html');
                    const radice = doc.getElementById('r');
                    const figli = [...radice.children];
                    const bersaglio = figli[indice];
                    if (!bersaglio) return false;
                    let salto = null;
                    if (bersaglio.hasAttribute('data-interruzione-pagina')) salto = bersaglio;
                    else if (bersaglio.previousElementSibling && bersaglio.previousElementSibling.hasAttribute
                             && bersaglio.previousElementSibling.hasAttribute('data-interruzione-pagina')) {
                        salto = bersaglio.previousElementSibling;
                    }
                    if (!salto) return false;
                    salto.parentNode.removeChild(salto);
                    blk.richHtml = radice.innerHTML;
                    return true;
                } catch (e) { return false; }
            }

            function attivaManigliaScalaBlocco(handleEl, itemId, soloTaglio) {
                handleEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Cerca in TUTTE le pagine (non solo quella attiva): questa maniglia può vivere
                    // anche su una pagina di CONTINUAZIONE (vedi trovaVoceRigaPerIdOvunque), la cui
                    // page.rows è sempre vuoto — il blocco vero vive sulla pagina di origine.
                    const blk = trovaBloccoPerIdOvunque(itemId);
                    if (!blk) return;
                    const bloccoARighe = BLOCCHI_CON_FONT_REGOLABILE.has(blk.type);
                    const bloccoFoto = blk.type === 'immagine-libera';
                    /* IL GRAFICO HA UN ASSE VERTICALE SUO (richiesto esplicitamente: «la maniglia
                     * sul lato inferiore deve modificare l'altezza e le proporzioni senza mai
                     * intaccare altri assi di misura scala»). Per tutti gli altri blocchi non
                     * tabellari questa maniglia scrive `zoom` sul contenitore: uno zoom tocca ogni
                     * asse insieme, che è esattamente ciò che si sta togliendo dal grafico. E dopo
                     * che il grafico ha smesso di leggere lo zoom, quella strada era diventata una
                     * maniglia che non faceva più niente — un comando morto, peggio di uno
                     * sbagliato. Qui scrive `altezzaScalaGrafico`, cioè lo stesso dato del cursore
                     * «Altezza» del menu: due gesti, un dato solo. */
                    const bloccoGrafico = blk.type === 'grafico-stratigrafia';
                    const innerEl = document.querySelector(`.tpl-editor-block-inner[data-block-id="${itemId}"]`);

                    // BLOCCO DI TESTO: la maniglia sceglie DOVE FINISCE LA PAGINA. Niente
                    // percentuale — non c'e' niente da misurare in percentuale — e nessun
                    // doppio-tap che azzera: qui il gesto e' uno solo, e ha un effetto solo se
                    // lo si porta su un confine fra due capoversi.
                    if (soloTaglio || blk.type === 'testo') {
                        const confini = confiniTaglioBlocco(itemId, blk);
                        bloccoManigliaStato = { tipo: 'taglio', id: itemId, confini, scelto: null, ultimoIndice: null };
                        // La cattura del puntatore è un miglioramento, non una condizione: se il
                    // motore la rifiuta il trascinamento deve continuare a funzionare invece di
                    // morire qui portandosi dietro tutto il resto del gesto.
                    try { handleEl.setPointerCapture(e.pointerId); } catch (err) { /* si tira avanti senza */ }
                        mostraEtichettaManigliaBlocco(handleEl, confini.length ? 'Interrompi pagina' : 'Un capoverso solo: niente da tagliare');
                        return;
                    }
                    // Conversione px->mm (richiesta solo per le foto): stessa tecnica già usata per
                    // le maniglie di pagina (margini/altezza intestazione, vedi
                    // attivaTrascinamentoManigliaPagina) — larghezza del foglio A4 (210mm) diviso lo
                    // zoom di editor attuale dà quanti px-schermo vale un mm reale sulla pagina.
                    let pxPerMm = 1;
                    if (bloccoFoto) {
                        const frame = document.getElementById('templateEditorPageFrame');
                        const zoomEditor = (typeof zoomAttualeEditorTemplate === 'function' ? zoomAttualeEditorTemplate() : 1) || 1;
                        pxPerMm = frame ? (frame.offsetWidth / 210 * zoomEditor) : 3.78;
                    }

                    // Doppio tocco (richiesto esplicitamente, ribadito dopo che il primo giro copriva
                    // solo gli slider nel menu, non queste maniglie vere: "quando premo due volte su
                    // queste maniglie non viene resettata la dimensione"): resetta al valore
                    // predefinito (100% per righe/zoom, 70mm per le foto) invece di iniziare un
                    // trascinamento — stessa soglia/tecnica di ultimoTapManigliaPagina e
                    // attivaDoppioTapResetSlider.
                    const chiaveTap = (soloTaglio ? 'taglio:' : 'scala:') + itemId;
                    const oraTap = Date.now();
                    if (ultimoTapManigliaBloccoCanvas.key === chiaveTap && (oraTap - ultimoTapManigliaBloccoCanvas.t) < 350) {
                        ultimoTapManigliaBloccoCanvas = { key: null, t: 0 };
                        if (innerEl) {
                            if (bloccoARighe) innerEl.style.setProperty('--tpl-riga-scale', 1);
                            else if (bloccoFoto) innerEl.style.setProperty('--tpl-photo-height-mm', 70);
                            else innerEl.style.zoom = 1;
                        }
                        const valoreAttuale = bloccoARighe ? (blk.rigaScale || 1) : bloccoFoto ? (blk.heightMm || 70) : bloccoGrafico ? (blk.altezzaScalaGrafico || 1) : (blk.scale || 1);
                        const valoreDefault = bloccoFoto ? 70 : 1;
                        if (valoreAttuale !== valoreDefault) {
                            salvaUndoSnapshotEditor();
                            if (bloccoARighe) blk.rigaScale = 1;
                            else if (bloccoFoto) blk.heightMm = null;
                            else if (bloccoGrafico) delete blk.altezzaScalaGrafico;
                            else blk.scale = 1;
                        }
                        renderTemplateEditorCanvas();
                        return;
                    }
                    ultimoTapManigliaBloccoCanvas = { key: chiaveTap, t: oraTap };

                    const valore = bloccoARighe ? (blk.rigaScale || 1) : bloccoFoto ? (blk.heightMm || 70) : bloccoGrafico ? (blk.altezzaScalaGrafico || 1) : (blk.scale || 1);
                    // Range: 10%-400% per lo zoom (invariato); 40%-250% per lo spazio tra le righe
                    // (oltre non ha senso pratico); 20mm-250mm per l'altezza delle foto (un
                    // riquadro utile va da una miniatura a quasi un'intera pagina A4).
                    const scalaMin = bloccoARighe ? 0.4 : bloccoFoto ? 20 : bloccoGrafico ? 0.4 : 0.1;
                    const scalaMax = bloccoARighe ? 2.5 : bloccoFoto ? 250 : bloccoGrafico ? 3 : 4;
                    // Guida magnetica VERTICALE (richiesta esplicitamente: "dovrebbero uscire delle
                    // guide anche lungo quella direzione quando eguaglio la grandezza di ogni blocco
                    // a un altro" — stessa idea della guida orizzontale già esistente sulla maniglia
                    // laterale, qui sull'asse Y): bordi top/bottom degli altri blocchi, catturati una
                    // sola volta all'avvio del trascinamento.
                    const bordiAltriBlocchiY = catturaBordiVerticaliAltriBlocchiEditor(itemId);
                    bloccoManigliaStato = { tipo: 'scala', id: itemId, bloccoGrafico, startY: e.clientY, valoreIniziale: valore, valoreCorrente: valore, innerEl, scalaMin, scalaMax, bloccoARighe, bloccoFoto, pxPerMm, bordiAltriBlocchiY, eraAgganciato: false };
                    resizeManigliaLastEvent = e;
                    // Richiesto esplicitamente: un blocco troppo alto sfora sotto il bordo visibile
                    // del canvas e la sua maniglia diventa irraggiungibile trascinando — stesso
                    // auto-scroll già usato per il trascinamento di un blocco intero.
                    avviaAutoScrollViewportEditor(() => (bloccoManigliaStato && bloccoManigliaStato.tipo === 'scala' && bloccoManigliaStato.id === itemId) ? resizeManigliaLastEvent : null);
                    // La cattura del puntatore è un miglioramento, non una condizione: se il
                    // motore la rifiuta il trascinamento deve continuare a funzionare invece di
                    // morire qui portandosi dietro tutto il resto del gesto.
                    try { handleEl.setPointerCapture(e.pointerId); } catch (err) { /* si tira avanti senza */ }
                    mostraEtichettaManigliaBlocco(handleEl, bloccoFoto ? `${valore}mm` : `${Math.round(valore * 100)}%`);
                });
                handleEl.addEventListener('pointermove', (e) => {
                    if (bloccoManigliaStato && bloccoManigliaStato.tipo === 'taglio' && bloccoManigliaStato.id === itemId) {
                        // Si aggancia al confine PIU' VICINO al dito: dentro un capoverso il
                        // taglio non vuol dire niente, quindi non si offre nemmeno.
                        let vicino = null, distanza = Infinity;
                        for (const c of bloccoManigliaStato.confini) {
                            const d = Math.abs(c.y - e.clientY);
                            if (d < distanza) { distanza = d; vicino = c; }
                        }
                        bloccoManigliaStato.scelto = vicino;
                        if (vicino) {
                            // LA VIBRAZIONE SOLO QUANDO SI CAMBIA CAPOVERSO, non a ogni pixel:
                            // un ronzio continuo non dice piu' niente, e fa sembrare il gesto
                            // scattoso. Uno scatto secco quando l'aggancio si sposta e' invece
                            // esattamente l'informazione che serve — «sei passato al prossimo».
                            if (bloccoManigliaStato.ultimoIndice !== vicino.indice) {
                                bloccoManigliaStato.ultimoIndice = vicino.indice;
                                triggerVibrate(6);
                            }
                            mostraAnteprimaTaglio(vicino.y, vicino.gia);
                            mostraEtichettaManigliaBlocco(handleEl, vicino.gia ? 'Togli interruzione' : 'Interrompi pagina');
                        } else {
                            nascondiAnteprimaTaglio();
                        }
                        return;
                    }
                    if (!bloccoManigliaStato || bloccoManigliaStato.tipo !== 'scala' || bloccoManigliaStato.id !== itemId) return;
                    resizeManigliaLastEvent = e;
                    // Maniglia sul lato basso, trascinamento verticale, invertito su richiesta
                    // esplicita: verso il BASSO ingrandisce, verso l'ALTO rimpicciolisce.
                    const delta = e.clientY - bloccoManigliaStato.startY;
                    let nuovo;
                    if (bloccoManigliaStato.bloccoFoto) {
                        nuovo = Math.round(Math.max(bloccoManigliaStato.scalaMin, Math.min(bloccoManigliaStato.scalaMax, bloccoManigliaStato.valoreIniziale + delta / bloccoManigliaStato.pxPerMm)));
                    } else {
                        nuovo = Math.round(Math.max(bloccoManigliaStato.scalaMin, Math.min(bloccoManigliaStato.scalaMax, bloccoManigliaStato.valoreIniziale + delta / 150)) * 100) / 100;
                    }
                    if (bloccoManigliaStato.innerEl) {
                        if (bloccoManigliaStato.bloccoARighe) bloccoManigliaStato.innerEl.style.setProperty('--tpl-riga-scale', nuovo);
                        else if (bloccoManigliaStato.bloccoFoto) bloccoManigliaStato.innerEl.style.setProperty('--tpl-photo-height-mm', nuovo);
                        else if (bloccoManigliaStato.bloccoGrafico) {
                            // Il grafico si RIDISEGNA con la nuova altezza invece di essere
                            // stirato: stirandolo si allungherebbero anche le scritte e i retini,
                            // mostrando una cosa diversa da quella che poi si stampa. Costa una
                            // stringa, e si può fare a ogni movimento del dito.
                            const blkG = trovaBloccoPerIdOvunque(itemId);
                            const pagG = paginaOrigineBlocco(itemId);
                            if (blkG && templateEditorState.ctx) {
                                const svgNuovo = buildBlockContentHtml('grafico-stratigrafia', templateEditorState.ctx,
                                    Object.assign({}, blkG, { altezzaScalaGrafico: nuovo }),
                                    { span: blkG.colSpan, cols: (pagG || {}).cols });
                                if (svgNuovo) bloccoManigliaStato.innerEl.innerHTML = svgNuovo;
                            }
                        }
                        else bloccoManigliaStato.innerEl.style.zoom = nuovo;

                        // Guida magnetica verticale: il bordo INFERIORE appena disegnato si misura dal
                        // DOM (zoom/--tpl-riga-scale non sono lineari da ricalcolare a mano con
                        // precisione) e si confronta con quelli catturati all'avvio. Correzione
                        // PROPORZIONALE sull'altezza resa per zoom/riga-scale (scalano moltiplicativamente);
                        // per l'altezza foto invece additiva in mm, via lo stesso pxPerMm del trascinamento
                        // (l'altezza lì è già lineare in mm, non serve alcuna proporzione).
                        const rettAttuale = bloccoManigliaStato.innerEl.getBoundingClientRect();
                        const SOGLIA_MAGNETE_PX = 5;
                        let bordoAgganciato = null;
                        for (const y of bloccoManigliaStato.bordiAltriBlocchiY) {
                            if (Math.abs(y - rettAttuale.bottom) < SOGLIA_MAGNETE_PX) { bordoAgganciato = y; break; }
                        }
                        if (bordoAgganciato != null && rettAttuale.height > 1) {
                            if (bloccoManigliaStato.bloccoFoto) {
                                const correzioneMm = (bordoAgganciato - rettAttuale.bottom) / bloccoManigliaStato.pxPerMm;
                                nuovo = Math.round(Math.max(bloccoManigliaStato.scalaMin, Math.min(bloccoManigliaStato.scalaMax, nuovo + correzioneMm)));
                                bloccoManigliaStato.innerEl.style.setProperty('--tpl-photo-height-mm', nuovo);
                            } else {
                                const correzione = (bordoAgganciato - rettAttuale.bottom) / rettAttuale.height;
                                nuovo = Math.round(Math.max(bloccoManigliaStato.scalaMin, Math.min(bloccoManigliaStato.scalaMax, nuovo * (1 + correzione))) * 100) / 100;
                                if (bloccoManigliaStato.bloccoARighe) bloccoManigliaStato.innerEl.style.setProperty('--tpl-riga-scale', nuovo);
                                else bloccoManigliaStato.innerEl.style.zoom = nuovo;
                            }
                            mostraGuidaAllineamentoOrizzontaleEditor(bordoAgganciato);
                            if (!bloccoManigliaStato.eraAgganciato) { triggerVibrate(8); bloccoManigliaStato.eraAgganciato = true; }
                        } else {
                            nascondiGuidaAllineamentoOrizzontaleEditor();
                            bloccoManigliaStato.eraAgganciato = false;
                        }
                    }
                    bloccoManigliaStato.valoreCorrente = nuovo;
                    mostraEtichettaManigliaBlocco(handleEl, bloccoManigliaStato.bloccoFoto ? `${nuovo}mm` : `${Math.round(nuovo * 100)}%`);
                });
                const fine = () => {
                    if (bloccoManigliaStato && bloccoManigliaStato.tipo === 'taglio' && bloccoManigliaStato.id === itemId) {
                        const scelto = bloccoManigliaStato.scelto;
                        bloccoManigliaStato = null;
                        nascondiEtichettaManigliaBlocco();
                        nascondiAnteprimaTaglio();
                        if (!scelto) return;   // solo un tocco, senza trascinare: nessun taglio a sorpresa
                        const blkT = trovaBloccoPerIdOvunque(itemId);
                        if (!blkT) return;
                        salvaUndoSnapshotEditor();
                        // LO STESSO GESTO NEI DUE VERSI. Portarla su un taglio che c'e' gia' lo
                        // toglie: e' la risposta a «se mi accorgo di aver tagliato troppo, come
                        // torno indietro?». Un comando che si puo' solo dare, e mai ritirare, e'
                        // un comando che si usa con paura.
                        if (scelto.categoria) {
                            // TABELLA LUNGA: il taglio e' un indice di categoria nell'elenco del
                            // blocco. La maniglia scrive esattamente lo stesso dato del menu, non
                            // uno parallelo: sono due modi di dire la stessa cosa, e devono
                            // restare la stessa cosa — altrimenti si tornerebbe ai due elenchi da
                            // tenere allineati a mano, che in questo file e' gia' costato tre volte.
                            if (!Array.isArray(blkT.categorieForzaPaginaPrima)) blkT.categorieForzaPaginaPrima = [];
                            const forzati = blkT.categorieForzaPaginaPrima;
                            const dove = forzati.indexOf(scelto.indice);
                            if (scelto.gia) {
                                if (dove !== -1) forzati.splice(dove, 1);
                                triggerVibrate(12);
                                mostraToastTemplateEditor('Interruzione tolta: la tabella torna tutta di seguito.');
                            } else {
                                if (dove === -1) forzati.push(scelto.indice);
                                forzati.sort((a, b) => a - b);
                                triggerVibrate(12);
                                mostraToastTemplateEditor(`Interruzione messa: la tabella ora occupa ${forzati.length + 1} pagine. Riportala su una riga rossa per toglierla.`);
                            }
                            // Il taglio scelto a mano vince sull'automatismo, come da sempre.
                            blkT.tagliAutomatici = [];
                        } else if (scelto.gia) {
                            if (togliInterruzioneNelTesto(blkT, scelto.indice)) {
                                triggerVibrate(12);
                                mostraToastTemplateEditor('Interruzione tolta: il testo torna tutto di seguito.');
                            }
                        } else if (inserisciInterruzioneNelTesto(blkT, scelto.indice)) {
                            triggerVibrate(12);
                            const quante = segmentiTesto(blkT.richHtml).length;
                            mostraToastTemplateEditor(quante > 2
                                ? `Interruzione messa: il blocco ora occupa ${quante} pagine. Riportala su una riga rossa per toglierla.`
                                : 'Interruzione messa: da qui il testo continua sulla pagina dopo. La ritrovi anche in «Modifica testo».');
                        }
                        renderTemplateEditorCanvas();
                        return;
                    }
                    if (!bloccoManigliaStato || bloccoManigliaStato.tipo !== 'scala' || bloccoManigliaStato.id !== itemId) return;
                    const finale = bloccoManigliaStato.valoreCorrente;
                    const iniziale = bloccoManigliaStato.valoreIniziale;
                    const bloccoARighe = bloccoManigliaStato.bloccoARighe;
                    const bloccoFoto = bloccoManigliaStato.bloccoFoto;
                    const bloccoGrafico = bloccoManigliaStato.bloccoGrafico;
                    bloccoManigliaStato = null;
                    resizeManigliaLastEvent = null;
                    fermaAutoScrollBordoEditor();
                    nascondiEtichettaManigliaBlocco();
                    nascondiGuidaAllineamentoOrizzontaleEditor();
                    if (finale !== iniziale) {
                        const blk = trovaBloccoPerIdOvunque(itemId);
                        if (blk) {
                            salvaUndoSnapshotEditor();
                            if (bloccoARighe) blk.rigaScale = finale;
                            else if (bloccoFoto) blk.heightMm = finale;
                            else if (bloccoGrafico) {
                                // A 100% la proprietà si toglie invece di scriverci 1: stessa
                                // regola del cursore nel menu, così i due gesti lasciano lo stesso
                                // dato e i backup restano confrontabili.
                                if (Math.abs(finale - 1) < 0.001) delete blk.altezzaScalaGrafico;
                                else blk.altezzaScalaGrafico = finale;
                                templateEditorState.flowSyncNecessario = true;
                            }
                            else blk.scale = finale;
                        }
                    }
                    renderTemplateEditorCanvas();
                };
                handleEl.addEventListener('pointerup', fine);
                handleEl.addEventListener('pointercancel', fine);
            }
            // Il lucchetto "Segue le colonne" è stato rimosso (richiesto esplicitamente: la
            // compattezza del contenuto è ora sempre libera e indipendente dal colSpan della
            // colonna) — non c'è più bisogno di forzare widthPct=100 dopo un cambio di colSpan.

            // Il divisore trascinabile tra due blocchi affiancati è stato rimosso (richiesto
            // esplicitamente, riorganizzazione posizionamento/ridimensionamento: faceva la stessa
            // cosa della maniglia laterale del singolo blocco — ridimensionare due colonne vicine
            // insieme — solo con un secondo gesto ridondante). Per cambiare la larghezza di una
            // colonna restano la maniglia laterale (attivaManigliaColspanBlocco) e il campo
            // numerico "Colonne" nel menu del blocco.

