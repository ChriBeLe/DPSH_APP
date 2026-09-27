            // ===================== EDITOR A RIGHE DEL TEMPLATE DI REPORT =====================
            // Working copy separata da state.reportTemplates: si scrive nello stato solo al Salva,
            // così "Chiudi senza salvare" è davvero senza conseguenze.
            // manualZoom=null => scala automatica "adatta alla finestra" (comportamento storico);
            // valorizzato quando l'utente usa rotella/pinch/pulsanti, finché non preme "Adatta".
            let templateEditorState = { templateId: null, pages: [], margins: { top: 14, bottom: 14, left: 12, right: 12 }, footerShowPageNumber: false, headerEnabled: false, footerEnabled: false, activePageIdx: 0, ctx: null, manualZoom: null, pagesStripExpanded: true, previewMode: false, selectedBlockId: null, justSelectedAnimKey: null, pageSelectionMode: false, selectedPageIndices: [], gridGuidesVisible: false, pageHandlesVisible: false, flowSyncNecessario: true, avvisiOverflowPerBlocco: {}, verificaPagineReali: {} };
            let editorDragSource = null;   // { kind:'existing', blockId } | { kind:'new', blockType }
            let editorDragLastPos = null;
            let editorIdCounter = 0;

            function nuovoIdEditor(prefix) {
                editorIdCounter++;
                return `${prefix}_${Date.now()}_${editorIdCounter}`;
            }

            function nuovaPaginaVuota() {
                return {
                    id: nuovoIdEditor('p'), cols: 4,
                    // enabled non vive più qui, vedi templateEditorState.headerEnabled/footerEnabled
                    // (commento completo in classicoPaginaDefault).
                    header: { imageDataUrl: null, text: '' },
                    footer: { text: '' },
                    rows: []
                };
            }

            /** Layout iniziale di un template appena creato: riproduce l'ordine visivo del
             * report Classico (inquadramento, poi dati+tabella affiancati, poi il grafico) così
             * chi apre l'editor per la prima volta parte da qualcosa di già sensato da modificare,
             * invece che da una pagina vuota. */
            function seedPaginaDefaultClassico() {
                return {
                    id: nuovoIdEditor('p'), cols: 4,
                    // enabled non vive più qui, vedi templateEditorState.headerEnabled/footerEnabled
                    // (commento completo in classicoPaginaDefault).
                    header: { imageDataUrl: null, text: '' },
                    footer: { text: '' },
                    rows: [
                        { id: nuovoIdEditor('r'), blocks: [{ id: nuovoIdEditor('b'), type: 'inquadramento', colSpan: 4 }] },
                        { id: nuovoIdEditor('r'), blocks: [{ id: nuovoIdEditor('b'), type: 'dati-prova', colSpan: 2 }, { id: nuovoIdEditor('b'), type: 'tabella-colpi', colSpan: 2 }] },
                        { id: nuovoIdEditor('r'), blocks: [{ id: nuovoIdEditor('b'), type: 'grafico-stratigrafia', colSpan: 4 }] }
                    ]
                };
            }

            /** Stesso identico calcolo fatto in buildSurveyReportHtml, ma sincrono (niente foto,
             * qui non servono) e sulla prova ATTIVA (state) invece che su una survData qualunque:
             * l'editor deve mostrare dati reali per capire come ridimensionare/riordinare i blocchi. */
            /** ctx per l'anteprima nell'editor del template. Di default legge la prova ATTIVA
             * (state, non salvata) come sempre — ma se templateEditorState.previewSurveyId punta a
             * un'altra prova salvata (scelta con le tendine "Anteprima con i dati di" — progetto +
             * prova, vedi renderTemplateEditorPreviewProjectSelector/renderTemplateEditorPreviewSurveySelector),
             * i dati "grezzi" vengono presi da QUELLA prova invece che da state, cercandola nel
             * progetto scelto (templateEditorState.previewProjectId), non necessariamente quello
             * attualmente aperto: un template è condiviso da TUTTI i cantieri, non solo da quello
             * attivo. Bug che ha portato a questo: un template è condiviso da tutte le prove del
             * progetto, ma l'anteprima usava SEMPRE e SOLO la prova aperta al momento — due blocchi
             * che stavano comodi sulla stessa pagina in editor (con quella prova, magari senza
             * coordinate GPS: il blocco "Inquadramento" mostrava solo un placeholder corto)
             * potevano non starci più per un'ALTRA prova con dati reali più ingombranti (GPS
             * presente: il blocco Inquadramento diventa un riquadro di 140mm), che l'editor non
             * aveva mai modo di mostrare. */
            function computeEditorPreviewCtx() {
                const previewProjId = (templateEditorState && templateEditorState.previewProjectId) || state.currentProjectId;
                const isProgettoCorrente = previewProjId === state.currentProjectId;
                let survOverride = null;
                if (templateEditorState && templateEditorState.previewSurveyId) {
                    survOverride = isProgettoCorrente
                        ? elencoProveProgetto().find(s => s.id === templateEditorState.previewSurveyId)
                        : (state.projects[previewProjId]?.surveys?.[templateEditorState.previewSurveyId] || null);
                }
                const surv = survOverride || state;
                const h = surv.header || {};
                const inst = surv.instrument || {};
                const logs = surv.logs || [];
                // Gli Strati Litologici sono condivisi a livello di PROGETTO (vedi syncStateToProject),
                // non per singola prova: quindi vanno letti dal progetto CHE CONTIENE la prova scelta
                // per l'anteprima, non sempre da state.strati (che è quello del progetto attivo — sbagliato
                // se la prova di anteprima appartiene a un altro cantiere).
                const strati = survOverride
                    ? (state.projects[previewProjId]?.strati || [])
                    : (state.strati || []);
                const provaNr = h.provaNr || '1';
                const comune = h.comune || 'Cantiere';
                const localita = h.localita || 'Non specificata';
                const committente = h.committente || 'Non specificato';
                const dateStr = h.date || new Date().toISOString().split('T')[0];
                const hasGps = !!(h.lat && h.lng);
                const passoCm = parseFloat(surv.settings?.stepCm || state.settings?.stepCm || 20);
                const falda = faldaDaHeader(h);
                const logsCalc = arricchisciLogsConNsptRpd(logs, inst, passoCm, falda);
                const stratiEff = stratiEffettiviProva(logs, strati, inst, passoCm, falda);
                // Riepilogo/Dettagliata/Allegato usano gli stessi dati calcolati già usati
                // dall'export "Parametri Avanzati" (vedi datiCalcolatiProva) — sulla prova scelta
                // per l'anteprima (surv), che sia quella attiva (state) o un'altra prova salvata.
                const datiParametri = datiCalcolatiProva(surv, strati);
                return {
                    provaNr,
                    // IL PROGETTO DA CUI LEGGERE I TAG. Mancava, e nessuno se n'era accorto:
                    // risolviTagInStampa fa `ctx.projId ? state.projects[ctx.projId] : null` e
                    // con null OGNI tag usciva come «[Committente]» invece del valore. Il
                    // controllo che c'era verificava che il codice CHIEDESSE ctx.projId, non che
                    // qualcuno glielo desse: verde, e sbagliato.
                    projId: previewProjId,
                    // ANTEPRIMA, non stampa: qui i riferimenti alle figure si risolvono subito
                    // col numero del template aperto, invece di restare «fig. ?». In stampa no —
                    // li' il numero vero lo sa solo il documento assemblato.
                    anteprima: true,
                    figureTemplate: elencoFigureTemplate((typeof templateEditorState !== 'undefined' && templateEditorState.pages) || []),
                    // Coordinate GPS "grezze" (non più un HTML mappa già pronto a zoom fisso): ogni
                    // blocco "Inquadramento" può scegliere il proprio zoom (blockObj.satelliteZoom),
                    // quindi la mappa si costruisce per-blocco in buildBlockContentHtml.
                    gpsInfo: hasGps ? { lat: h.lat, lng: h.lng, provaNr } : null,
                    // Le coordinate di TUTTE le prove del cantiere. Il blocco Inquadramento
                    // nasceva per il template di una prova e ne mostrava una sola; nel capitolo
                    // introduttivo deve mostrarle tutte insieme, ed e' un dato del progetto, non
                    // della prova aperta.
                    puntiProveProgetto: puntiProveDelProgetto(state.projects && state.projects[previewProjId]),
                    // Parametri "grezzi" del box dati (non solo l'HTML già pronto): servono a
                    // ricostruire il blocco "Dati Prova" con disposizione/ordine delle schede
                    // personalizzati per-blocco (vedi buildBlockContentHtml case 'dati-prova').
                    // Larghezza utile della riga in millimetri VERI: il blocco grafico se ne serve
                    // per sapere quanti pixel di foglio ha davvero a disposizione (vedi
                    // larghezzaBloccoGraficoPx). Senza, resterebbe alla stima «tante colonne su
                    // quattro», che è una frazione, non una misura.
                    larghezzaUtileMm: calcolaBudgetPaginaMm(templateEditorState.margins, templateEditorState.footerEnabled).larghezzaUtileMm,
                    datiBoxRawParams: { numero: provaNr, comune, localita, committente, dateStr, inst, passoCm, falda, stratiEff },
                    datiBoxHtml: buildDatiBoxHtml(provaNr, comune, localita, committente, dateStr, inst, passoCm, falda, stratiEff),
                    colpiTableHtml: buildColpiNsptTableHtml(logsCalc),
                    // `falda` passata esplicitamente: il grafico ne disegna la colonna dedicata.
                    // Il dato esisteva già da sempre (correzione Nspt′, peso di volume saturo,
                    // colonna "in falda" nelle tabelle) ma non arrivava fin qui — la colonna non
                    // mancava per una scelta grafica, mancava perché il parametro non veniva passato.
                    stratigrafiaChartHtml: stratiEff.length > 0 ? buildStratigrafiaColpiRpdSvg(stratiEff, logsCalc, provaNr, LARGH_GRAFICO_DEFAULT_PX, { falda }) : '',
                    // "Grezzi" come datiBoxRawParams sopra: servono a ricostruire il grafico con la
                    // compattezza (larghezza) PER-BLOCCO scelta nell'editor (vedi buildBlockContentHtml
                    // case 'grafico-stratigrafia') invece di riusare sempre l'HTML già pronto qui sopra
                    // a dimensione naturale, che ignorerebbe la richiesta di condensarlo lateralmente.
                    stratigrafiaChartRawParams: { stratiEff, logsCalc, provaNr, falda },
                    tabellaRiepilogoHtml: datiParametri.length > 0 ? htmlTabellaRiepilogo(datiParametri, provaNr, h) : '',
                    tabellaDettagliataHtml: datiParametri.length > 0 ? htmlTabellaDettagliata(datiParametri, provaNr, h) : '',
                    allegatoHtml: datiParametri.length > 0 ? buildAllegatoHtml(datiParametri, provaNr, h) : '',
                    // Foto della prova ("Foto prova" nel template, vedi calcolaIndiciImmaginePerBlocco):
                    // valorizzati/aggiornati a ogni render tramite aggiornaCtxFotoEditor (che legge
                    // anch'essa surv invece di state fisso, vedi sotto), qui solo un valore iniziale.
                    photoUrls: (surv.photos || []).map(p => p.dataUrl || photoMemoryCache[p.id] || ''),
                    immagineIndexPerBlocco: {},
                    figureIndexPerBlocco: {}
                };
            }

            /** Come buildBlockContentHtml, ma con un placeholder leggibile quando la prova attiva
             * non ha ancora i dati per quel blocco (niente GPS, niente intervalli...) — nel report
             * finale un blocco senza contenuto semplicemente non occupa spazio, ma durante l'editing
             * lasciarlo vuoto senza spiegazione sembrerebbe un bug. */
            function contenutoBloccoOPlaceholder(type, ctx, blockObj, rangeCategorie, geo) {
                let content = buildBlockContentHtml(type, ctx, blockObj, geo);
                if (content) {
                    // rangeCategorie: SOLO quando questa chiamata arriva dalla tela dell'editor per
                    // una pagina già tagliata (origine con un taglio calcolato, o continuazione) —
                    // vedi filtraCategorieHtmlFlowable. Mai passato da qui per l'export o le
                    // miniature, che devono continuare a ricevere il blocco per intero come sempre.
                    if (rangeCategorie && BLOCCHI_FLOWABLE.has(type)) {
                        content = filtraCategorieHtmlFlowable(content, rangeCategorie.da, rangeCategorie.a);
                    } else if (rangeCategorie && type === 'testo' && eBloccoSpezzabile(blockObj)) {
                        // Il testo non si filtra dopo: si ricostruisce dai soli segmenti di questa
                        // pagina. Cosi' il contenuto passa da capo per la risoluzione dei tag e la
                        // marcatura dei titoli, invece di essere ritagliato a valle — dove un
                        // ritaglio a meta' di un tag lo avrebbe rotto.
                        const pezzi = segmentiTesto(blockObj.richHtml);
                        const a = (rangeCategorie.a == null) ? pezzi.length - 1 : rangeCategorie.a;
                        content = buildBlockContentHtml(type, ctx, Object.assign({}, blockObj, {
                            richHtml: pezzi.slice(rangeCategorie.da, a + 1).join('')
                        }));
                    }
                    return content;
                }
                if (type === 'immagine-libera') {
                    // Niente più "carica qui": la foto arriva automaticamente dalla galleria della
                    // prova (vedi calcolaIndiciImmaginePerBlocco) — se manca è perché la prova non ha
                    // (ancora) abbastanza foto per questa posizione, non perché manca un'azione da
                    // compiere qui nell'editor.
                    const idx = blockObj && ctx.immagineIndexPerBlocco ? ctx.immagineIndexPerBlocco[blockObj.id] : undefined;
                    const totaleFoto = (ctx.photoUrls || []).length;
                    const msg = totaleFoto === 0
                        ? 'Questa prova non ha ancora foto in galleria.'
                        : `Nessuna foto in posizione ${(idx !== undefined ? idx : 0) + 1} (la prova ne ha ${totaleFoto}).`;
                    return `<div style="padding:16px; text-align:center; font-size:11px; color:#94a3b8; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px;">
                        <svg class="ico" style="width:20px; height:20px; display:block; margin:0 auto 6px; color:#cbd5e1;"><use href="#i-camera"/></svg>
                        ${msg}
                    </div>`;
                }
                const messaggi = {
                    'inquadramento': 'Nessuna coordinata GPS su questa prova: resterà vuoto nel report finché non la acquisisci.',
                    'grafico-stratigrafia': 'Nessun intervallo registrato su questa prova: resterà vuoto nel report finché non ne aggiungi.',
                    'tabella-riepilogo-parametri': 'Nessuno strato con intervalli assegnati su questa prova: resterà vuoto nel report finché non ne assegni.',
                    'tabella-dettagliata-parametri': 'Nessuno strato con intervalli assegnati su questa prova: resterà vuoto nel report finché non ne assegni.',
                    'allegato-formule': 'Nessuno strato con intervalli assegnati su questa prova: resterà vuoto nel report finché non ne assegni.',
                    'titolo': 'Blocco vuoto: tocca il blocco e poi "Modifica testo" dal menu per scrivere il titolo.',
                    'testo': 'Blocco vuoto: tocca il blocco e poi "Modifica testo" dal menu per scrivere il testo.'
                };
                const msg = messaggi[type] || 'Nessun dato disponibile su questa prova per l\'anteprima.';
                return `<div style="padding:16px; text-align:center; font-size:11px; color:#94a3b8; background:#f8fafc; border:1px dashed #cbd5e1; border-radius:6px;">${msg}</div>`;
            }

            // Una voce di row.blocks[] è normalmente un blocco singolo (forma storica, invariata:
            // {id,type,colSpan,scale,fontScale,widthPct,align}). Ora può anche essere uno STACK —
            // due o più blocchi impilati verticalmente nella STESSA colonna, quando quella colonna
            // ha spazio verticale "sprecato" perché più corta della riga (vedi commento su
            // calcolaPosizioneDropEditor): {id,colSpan,stack:[blocco1,blocco2,...]}. Riconoscibile
            // dalla presenza di "stack" invece di "type". Il colSpan vive sempre sulla VOCE (che è
            // anche l'intero blocco quando non è uno stack), mai sui singoli elementi impilati.

            /** Blocco "Foto prova" (ex "Immagine"): NON è più uno slot da riempire a mano — mostra
             * automaticamente le foto già presenti nella galleria della prova, una per blocco,
             * assegnate nell'ordine in cui i blocchi compaiono nel template (prima pagina, prima
             * riga, prima colonna... vedi calcolaIndiciImmaginePerBlocco). Il primo blocco "Foto
             * prova" piazzato nel layout mostra la prima foto della prova, il secondo la seconda,
             * e così via — se le foto sono meno dei blocchi, quelli in eccesso restano vuoti con un
             * messaggio esplicativo invece di un placeholder "carica qui" (non c'è più nulla da
             * caricare dall'editor: le foto si aggiungono dalla fotocamera della prova). Un singolo
             * blocco può però fissare a mano la propria posizione (item.fotoIndiceManuale, scelta
             * dal menu "Foto da mostrare" — richiesto esplicitamente: poter indicare "la prima" o
             * "la seconda" foto invece di dipendere solo dall'ordine dei blocchi nel layout): in tal
             * caso quel blocco usa SEMPRE quella posizione e NON consuma un numero della sequenza
             * automatica, che continua a contare solo tra i blocchi rimasti "Automatica". */
            function calcolaIndiciImmaginePerBlocco(pages) {
                const mappa = {};
                let idx = 0;
                (pages || []).forEach(page => {
                    (page.rows || []).forEach(row => {
                        (row.blocks || []).forEach(entry => {
                            const items = entry.stack && entry.stack.length > 0 ? entry.stack : [entry];
                            items.forEach(item => {
                                if (item.type !== 'immagine-libera') return;
                                mappa[item.id] = (item.fotoIndiceManuale != null) ? item.fotoIndiceManuale : idx++;
                            });
                        });
                    });
                });
                return mappa;
            }
            // Numerazione "Figura N" condivisa tra TUTTI i blocchi con didascalia (foto + inquadramento
            // satellitare), nell'ordine in cui compaiono nel template — non un contatore separato per
            // tipo, così "Figura 1 - DPSH 1", "Figura 2 - Inquadramento" ecc. seguono l'ordine reale
            // di lettura del report, qualunque sia il tipo di blocco.
            const TIPI_BLOCCO_CON_DIDASCALIA = new Set(['immagine-libera', 'inquadramento']);
            function calcolaIndiciFigulaPerBlocco(pages) {
                const mappa = {};
                let n = 1;
                (pages || []).forEach(page => {
                    (page.rows || []).forEach(row => {
                        (row.blocks || []).forEach(entry => {
                            const items = entry.stack && entry.stack.length > 0 ? entry.stack : [entry];
                            items.forEach(item => {
                                if (TIPI_BLOCCO_CON_DIDASCALIA.has(item.type)) mappa[item.id] = n++;
                            });
                        });
                    });
                });
                return mappa;
            }
            /** Testo didascalia AUTOMATICO per un blocco (foto o inquadramento): "Figura N - DPSH X"
             * per le foto, "Figura N - Inquadramento" per la mappa — l'utente può sovrascriverlo a
             * mano (vedi blockObj.captionOverride in apriMenuBloccoEditor), qui si calcola solo il
             * default quando non l'ha ancora fatto. */
            function didascaliaAutomaticaBlocco(type, blockObj, ctx) {
                const n = blockObj && ctx && ctx.figureIndexPerBlocco ? ctx.figureIndexPerBlocco[blockObj.id] : undefined;
                if (n === undefined) return '';
                if (type === 'immagine-libera') return `Figura ${n} - DPSH ${(ctx && ctx.provaNr) || '1'}`;
                if (type === 'inquadramento') return `Figura ${n} - Inquadramento`;
                return `Figura ${n}`;
            }

            /** Il NUMERO dentro una didascalia diventa un pezzo sostituibile.
             *
             * Qui vale l'indice di questo template, che e' l'unica cosa che si sa mentre si
             * costruisce una prova alla volta. In un fascicolo completo pero' quel numero e'
             * quasi sempre sbagliato: tre prove darebbero tre "Figura 1". A documento assemblato
             * viene riscritto (numeraFigureERisolviRiferimenti), ed e' li' che diventa vero.
             * Nell'anteprima dell'editor, dove un documento non c'e', resta questo — che per una
             * prova sola e' comunque giusto. */
            function marcaNumeroDidascalia(testo, blockObj, tipoBlocco) {
                if (!testo) return '';
                const escaped = escapeHtmlDidascalia(testo);
                const idBlocco = (blockObj && blockObj.id) || Math.random().toString(36).slice(2, 8);
                const ancora = 'figura-' + idBlocco;
                // Il numero e' il primo gruppo di cifre della didascalia: "Figura 3 - DPSH 1".
                const conSlot = escaped.replace(/(\d+(?:\.\d+)*)/, '<span data-figura-numero>$1</span>');
                // LA FIGURA DICE CHI E'. Senza, un riferimento poteva solo dire "quella dopo di
                // me": non c'era modo di scrivere "vedi l'inquadramento" e farlo puntare li'
                // qualunque cosa ci sia in mezzo. Il ruolo (che tipo di figura e') e il blocco
                // (quale esattamente) viaggiano nel documento accanto al numero.
                return '<span data-figura-ancora="' + ancora + '"'
                    + ' data-figura-ruolo="' + escapeHtmlDidascalia(ruoloFigura(tipoBlocco)) + '"'
                    + ' data-figura-blocco="' + escapeHtmlDidascalia(String(idBlocco)) + '">' + conSlot + '</span>';
            }

            /** Il RUOLO di una figura: che cosa e', non dove sta.
             * E' il pezzo che permette di scrivere «vedi l'inquadramento» invece di «vedi la
             * figura qui sotto» — e di restare giusto anche spostando i blocchi. */
            function ruoloFigura(tipoBlocco) {
                if (tipoBlocco === 'inquadramento') return 'inquadramento';
                if (tipoBlocco === 'immagine-libera') return 'foto';
                return 'figura';
            }
            /** LE FIGURE DEL TEMPLATE APERTO, in ordine di lettura.
             *
             * Serve a far vedere il numero SUBITO, nell'anteprima: «fig. ?» sul foglio e' un
             * buco, e non c'era ragione di lasciarlo li' — il template aperto le sue figure le
             * conosce tutte, quindi il numero si puo' calcolare adesso, esattamente come fa gia'
             * la didascalia sotto ogni figura. In stampa il numero vero lo rifa' la passata sul
             * documento assemblato (dove i capitoli e le altre prove cambiano il conto), ma qui
             * il numero mostrato e' quello giusto per il template che si sta componendo.
             *
             * Torna anche l'indice di OGNI blocco, figura o no: un riferimento deve sapere dove
             * si trova lui per poter dire «la piu' vicina». */
            function elencoFigureTemplate(pages) {
                const figure = [];
                const indicePerBlocco = {};
                let indice = 0, numero = 0;
                (pages || []).forEach((pag, iPag) => (pag.rows || []).forEach(riga => (riga.blocks || []).forEach(entry => {
                    const items = (entry.stack && entry.stack.length > 0) ? entry.stack : [entry];
                    items.forEach(item => {
                        indicePerBlocco[item.id] = indice;
                        if (TIPI_BLOCCO_CON_DIDASCALIA.has(item.type)) {
                            numero++;
                            figure.push({ id: item.id, tipo: item.type, ruolo: ruoloFigura(item.type),
                                          numero: String(numero), indice, pagina: iPag });
                        }
                        indice++;
                    });
                })));
                return { figure, indicePerBlocco };
            }

            /** Ricalcola indici-foto, indici-figura e URL delle foto della prova attiva sul ctx già in
             * cache dell'editor: chiamata a ogni render (canvas e striscia miniature) invece che una
             * sola volta all'apertura, perché l'ordine dei blocchi può cambiare in qualunque momento
             * (drag&drop, aggiunta/rimozione blocchi o pagine). */
            function aggiornaCtxFotoEditor() {
                const ctx = templateEditorState.ctx;
                if (!ctx) return;
                // Stesse foto della prova scelta per l'anteprima (vedi computeEditorPreviewCtx): se
                // è impostata una prova diversa da quella attiva, le foto devono essere le SUE, non
                // sempre quelle di state — altrimenti "Foto prova" mostrerebbe la galleria sbagliata
                // appena si cambia la prova di anteprima.
                const survOverride = templateEditorState.previewSurveyId
                    ? elencoProveProgetto().find(s => s.id === templateEditorState.previewSurveyId)
                    : null;
                const surv = survOverride || state;
                ctx.immagineIndexPerBlocco = calcolaIndiciImmaginePerBlocco(templateEditorState.pages);
                ctx.figureIndexPerBlocco = calcolaIndiciFigulaPerBlocco(templateEditorState.pages);
                // Anche l'elenco delle figure va rifatto a ogni render, non solo all'apertura:
                // il ctx e' in cache, e senza questa riga aggiungere il blocco Inquadramento
                // avrebbe lasciato i riferimenti a «fig. ?» finche' non si riapriva l'editor —
                // che e' esattamente cio' che e' stato segnalato.
                ctx.figureTemplate = elencoFigureTemplate(templateEditorState.pages);
                ctx.photoUrls = (surv.photos || []).map(p => p.dataUrl || photoMemoryCache[p.id] || '');
            }

            /** Trova un blocco FOGLIA per id, sia voce singola che dentro uno stack. */
            function trovaBloccoPerId(page, blockId) {
                for (const row of (page.rows || [])) {
                    for (const entry of row.blocks) {
                        if (entry.stack) {
                            const found = entry.stack.find(b => b.id === blockId);
                            if (found) return found;
                        } else if (entry.id === blockId) {
                            return entry;
                        }
                    }
                }
                return null;
            }

            /** Trova la VOCE di riga (colonna) per id — la singola voce stessa se non è uno stack,
             * altrimenti il contenitore stack: usata dai controlli che agiscono sulla larghezza
             * (colSpan) della colonna intera, condivisa da tutti i blocchi impilati al suo interno. */
            function trovaVoceRigaPerId(page, entryId) {
                for (const row of (page.rows || [])) {
                    const found = row.blocks.find(e => e.id === entryId);
                    if (found) return found;
                }
                return null;
            }

            /** Come trovaVoceRigaPerId/trovaBloccoPerId, ma cercano in TUTTE le pagine invece che
             * solo in una data — servono alle maniglie dirette di larghezza/altezza (richiesto
             * esplicitamente: "vorrei poter modificare anche dal continuo giusto la lunghezza e
             * l'altezza") quando agiscono su un blocco flowable mostrato sulla sua pagina di
             * CONTINUAZIONE: quella pagina non ha righe proprie (page.rows è sempre []), quindi
             * cercare solo nella pagina ATTIVA non troverebbe mai nulla lì — il blocco vive per
             * intero sulla sua pagina di origine, che può essere una qualunque altra pagina. */
            function trovaVoceRigaPerIdOvunque(entryId) {
                for (const p of templateEditorState.pages) {
                    const trovata = trovaVoceRigaPerId(p, entryId);
                    if (trovata) return trovata;
                }
                return null;
            }
            function trovaBloccoPerIdOvunque(blockId) {
                for (const p of templateEditorState.pages) {
                    const trovato = trovaBloccoPerId(p, blockId);
                    if (trovato) return trovato;
                }
                return null;
            }

            /** Trova la voce di riga (colonna) che CONTIENE un dato blocco, sia che il blocco SIA
             * la voce stessa (colonna semplice, non impilata) sia che sia un elemento dentro
             * entry.stack — usata per raggiungere proprietà di colonna (colSpan,
             * espandiSuSpazioVuoto) partendo dall'id del singolo blocco selezionato nel menu. */
            function trovaVoceContenenteBlocco(page, blockId) {
                for (const row of (page.rows || [])) {
                    for (const entry of row.blocks) {
                        if (entry.id === blockId) return entry;
                        if (entry.stack && entry.stack.some(b => b.id === blockId)) return entry;
                    }
                }
                return null;
            }

            /** Valore CSS "flex" di una colonna di riga, condiviso da editor e stampa/PDF (unica
             * fonte di verità, stesso schema di buildInquadramentoSatellitareHtml ecc.): di default
             * (espandiSuSpazioVuoto non impostato o true) la colonna cresce per riempire lo spazio
             * libero della riga in proporzione al proprio colSpan, come sempre. Disattivata
             * esplicitamente (richiesta esplicitamente, spunta nel menu del blocco), resta fissata
             * esattamente alla frazione di riga che le spetta, senza mai crescere oltre — lo spazio
             * libero risultante resta vuoto invece di essere "rubato". */
            /** Lo span minimo di una colonna della griglia, in colonne. È UN NUMERO SOLO, e sta
             * qui, perché era scritto a mano in sei punti diversi come `Math.max(1, ...)` — e
             * bastava dimenticarne uno perché il cursore della larghezza scendesse e il blocco
             * no. È esattamente il difetto segnalato («non si riesce a portarlo sotto i 48px»),
             * moltiplicato per il numero di copie.
             *
             * Una colonna intera è il minimo giusto per un blocco di CONTENUTO: sotto, una
             * tabella non è stretta, è illeggibile, e sulla tela diventa impossibile da
             * afferrare. Per il divisore no: è spazio vuoto, e uno spazio vuoto di due
             * millimetri è esattamente il suo mestiere. */
            function spanMinimoVoce(entry) { return (entry && entry.type === 'divisore') ? 0.02 : 1; }
            /* ============ IL GRAFICO SEGUE LA LARGHEZZA MENTRE LA CAMBI ============
             * Segnalato: «non sembra applicare le variazioni sulle dimensioni che invece vengono
             * mostrate durante la modifica dello slider o della maniglia», e «non riesco più a
             * posizionarlo al fianco di un altro blocco».
             *
             * Stessa causa. Il grafico si impagina in unità fisiche a partire dalla larghezza
             * REALE della sua colonna (vedi larghezzaBloccoGraficoPx): quel numero entra nel
             * disegno quando il contenuto viene COSTRUITO, cioè al re-render della tela. Le
             * anteprime della larghezza — il cursore «Scala» e la maniglia destra — non
             * ricostruiscono niente: ritoccano solo il `flex` del contenitore, che è quanto basta
             * per un blocco di testo (il testo si riadatta da sé) ma non per un disegno, che
             * resta largo quanto era stato calcolato. Da fuori: muovi il cursore e il grafico non
             * cambia; lo lasci e cambia di colpo. E finché il disegno resta largo 695px mentre la
             * colonna ne vuole 343, la riga misura più di quanto sia davvero — ed è per questo
             * che affiancargli un blocco non riusciva più.
             *
             * Qui il disegno si rifà con lo span che sta per avere, non con quello che aveva. Una
             * sola funzione, usata da entrambe le anteprime: erano due strade verso lo stesso
             * errore, e tenerle separate voleva dire correggerlo due volte. */
            function ridisegnaGraficoAnteprima(blockId, spanNuovo, cols) {
                if (!templateEditorState || !templateEditorState.ctx) return;
                const blk = trovaBloccoPerIdOvunque(blockId);
                if (!blk || blk.type !== 'grafico-stratigrafia') return;
                const nuovo = buildBlockContentHtml('grafico-stratigrafia', templateEditorState.ctx, blk,
                    { span: spanNuovo, cols: cols || 4 });
                if (!nuovo) return;
                document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`)
                    .forEach(el => { el.innerHTML = nuovo; });
            }

            function spanVoceInGriglia(entry, cols) {
                return Math.max(spanMinimoVoce(entry), Math.min(cols, (entry && entry.colSpan) || cols));
            }

            function flexEntryCss(entry, span, cols) {
                if (entry && entry.espandiSuSpazioVuoto === false) {
                    /* IL PAVIMENTO NON È UGUALE PER TUTTI (segnalato: «orizzontalmente non si
                     * riesce a portarlo sotto i 48px circa»). Erano due limiti diversi che non
                     * coincidevano: il cursore della larghezza scende al 5% della riga, ma qui
                     * c'era un Math.max(0.3, span) — 0,3 colonne su 4, cioè il 7,5% ≈ 14mm ≈ 53px.
                     * Il numero scendeva e il blocco no.
                     *
                     * Quel pavimento serve, ma per i blocchi di CONTENUTO: una tabella larga tre
                     * millimetri non è una tabella stretta, è una tabella illeggibile, e per giunta
                     * diventa impossibile da afferrare sulla tela. Un divisore è l'esatto
                     * contrario: è spazio vuoto, e uno spazio vuoto di due millimetri è
                     * esattamente ciò per cui esiste. Da qui in poi il divisore ha un pavimento
                     * suo, praticamente inesistente; sulla tela resta afferrabile perché la sua
                     * area di presa è disegnata dall'editor (vedi .tpl-editor-block-divisore),
                     * non dalla larghezza del blocco. */
                    const pct = (Math.max(spanMinimoVoce(entry), span) / Math.max(1, cols) * 100).toFixed(4);
                    return `0 0 ${pct}%`;
                }
                return `${span} 1 0`;
            }

            /** Stile completo (flex + margini di allineamento) di una colonna di riga, unica fonte
             * di verità condivisa da editor e stampa/PDF — RIORGANIZZAZIONE POSIZIONAMENTO/
             * RIDIMENSIONAMENTO (richiesta esplicitamente): l'allineamento non riguarda più il
             * contenuto DENTRO il blocco (quella distinzione non esiste più, il contenuto riempie
             * sempre per intero il proprio blocco) ma dove il blocco stesso si posiziona nella riga
             * quando resta più piccolo del 100% (Larghezza<100%, quindi non cresce, vedi
             * flexEntryCss) — con margin:auto, la stessa tecnica CSS di sempre per centrare/spingere
             * un elemento flex, per-blocco anche quando altri blocchi condividono la riga. Quando la
             * Larghezza è 100% (il caso comune) il blocco riempie comunque tutto lo spazio: i
             * margini non hanno nulla su cui agire, l'allineamento diventa innocuo da solo, senza
             * bisogno di nasconderlo o disabilitarlo esplicitamente. */
            function styleDimensioneVoce(entry, span, cols) {
                const flex = flexEntryCss(entry, span, cols);
                const align = (entry && entry.align) || 'left';
                const margine = align === 'right' ? 'margin-left:auto;' : align === 'center' ? 'margin-left:auto; margin-right:auto;' : '';
                return `flex: ${flex}; ${margine}`;
            }

            /** Trova l'indice (in page.rows) della riga che contiene DIRETTAMENTE una data voce
             * (colonna) — usata dal rowSpan per sapere da dove partire a riservare le righe sotto.
             * Cerca solo tra le voci di primo livello (rowSpan/colSpan vivono lì, non dentro
             * entry.stack), stesso ambito di trovaVoceRigaPerId. */
            function trovaIndiceRigaPerVoce(page, voceId) {
                const righe = page.rows || [];
                for (let i = 0; i < righe.length; i++) {
                    if (righe[i].blocks.some(e => e.id === voceId)) return i;
                }
                return -1;
            }

            /** Rimuove tutti i "segnaposto" invisibili (voce.reserved === true) lasciati nelle righe
             * sottostanti da un blocco con rowSpan>1 (vedi impostaRowSpanVoce) quando si riduce il
             * suo rowSpan o lo si elimina — ripulisce anche le righe che erano state create SOLO per
             * ospitare quel segnaposto (row.autoCreatedForRowSpan) se restano vuote, ma lascia intatte
             * righe che nel frattempo hanno ricevuto contenuto vero da parte dell'utente. */
            /** Toglie da un template ogni traccia del vecchio rowSpan: i blocchi tornano a
             * occupare una riga sola e i segnaposto invisibili (entry.reserved) che riservavano
             * le righe sotto vengono eliminati. Idempotente — su un template già normalizzato non
             * tocca niente — così può girare a ogni avvio senza dover ricordare chi l'ha già
             * subita. Le righe rimaste vuote solo perché ospitavano un segnaposto se ne vanno con
             * lui: erano spazio occupato da niente. */
            /** IL BLOCCO "SEPARATORE" NON ESISTE PIÙ (richiesto esplicitamente: «ora che abbiamo
             * dato la possibilità al divisore di inserire linee di separazione, possiamo
             * definitivamente rimuovere il blocco separatore»). Era un <hr> e basta: nessuna
             * impostazione, nessuno spessore, nessun colore, nessuna lunghezza. Il divisore fa
             * la stessa cosa e altre quattro, quindi tenerli tutti e due voleva dire due voci
             * nella palette per un lavoro solo — e la voce peggiore era proprio quella che non
             * si poteva regolare.
             *
             * I template che lo usano non perdono niente: il separatore diventa un divisore con
             * la linea accesa, riproducendo esattamente il vecchio <hr> (1,5px continuo scuro a
             * tutta larghezza, pochissimo spazio sopra e sotto). Da quel momento è regolabile,
             * cosa che prima non era. Una conversione, non una rimozione: cancellarlo e basta
             * avrebbe lasciato un buco in mezzo a relazioni già impaginate. */
            /** LO `scale` DEI GRAFICI SALVATI PRIMA (segnalato: «non riesco più a posizionarlo al
             * fianco di un altro blocco»).
             *
             * Il grafico usava lo zoom del contenitore come tutti gli altri blocchi non
             * tabellari. Da quando si impagina da sé in unità fisiche quello zoom non viene più
             * letto — giustamente, era il riscalamento uniforme da cui nascevano cinque difetti —
             * ma i template già salvati se lo portano ancora addosso. Risultato: un grafico
             * messo a `scale:0.6` per stare in mezza pagina è tornato di colpo alto quanto vuole,
             * la pagina ha cominciato a sforare e il riflusso automatico spostava via qualunque
             * cosa gli si provasse ad affiancare. Da fuori sembra che il blocco «non si possa più
             * mettere accanto a un altro»; in realtà ci sta, ma la riga non ci sta nella pagina.
             *
             * Lo zoom viene quindi convertito in altezza: è la componente che decide l'ingombro
             * sul foglio, ed è l'unica delle due che il grafico sa ancora fare. La larghezza no —
             * quella ora la decide la colonna, ed è esattamente la separazione che si voleva. Un
             * template convertito occupa la stessa altezza di prima; se poi era stato zoomato
             * anche per stringerlo, si stringe con la maniglia destra, che ora fa quello. */
            function convertiScalaGraficoSalvata(tpl) {
                if (!tpl || !Array.isArray(tpl.pages)) return 0;
                let convertiti = 0;
                const converti = (voce) => {
                    if (!voce || voce.type !== 'grafico-stratigrafia') return;
                    const scala = parseFloat(voce.scale);
                    if (isFinite(scala) && Math.abs(scala - 1) > 0.001) {
                        const gia = parseFloat(voce.altezzaScalaGrafico);
                        const base = (isFinite(gia) && gia > 0) ? gia : 1;
                        const nuova = Math.max(0.4, Math.min(3, Math.round(base * scala * 100) / 100));
                        if (Math.abs(nuova - 1) < 0.001) delete voce.altezzaScalaGrafico;
                        else voce.altezzaScalaGrafico = nuova;
                        convertiti++;
                    }
                    // Lo zoom se ne va comunque: se restasse, un domani basterebbe rileggerlo per
                    // sbaglio in un punto qualsiasi per rimettere in piedi il riscalamento tolto.
                    delete voce.scale;
                };
                tpl.pages.forEach(page => (page.rows || []).forEach(row => (row.blocks || []).forEach(entry => {
                    converti(entry);
                    (entry.stack || []).forEach(converti);
                })));
                return convertiti;
            }

            function convertiSeparatoriInDivisori(tpl) {
                if (!tpl || !Array.isArray(tpl.pages)) return 0;
                let convertiti = 0;
                const converti = (voce) => {
                    if (!voce || voce.type !== 'separatore') return;
                    voce.type = 'divisore';
                    voce.spacerHeightMm = 3;
                    voce.divisoreLinea = 'orizzontale';
                    voce.divisoreStile = 'continua';
                    voce.divisoreSpessore = 1.5;
                    voce.divisoreTinta = 'scuro';
                    voce.divisoreLunghezza = 100;
                    convertiti++;
                };
                tpl.pages.forEach(page => (page.rows || []).forEach(row => (row.blocks || []).forEach(entry => {
                    converti(entry);
                    (entry.stack || []).forEach(converti);
                })));
                return convertiti;
            }

            function appiattisciRowSpanTemplate(tpl) {
                if (!tpl || !Array.isArray(tpl.pages)) return 0;
                let toccati = 0;
                tpl.pages.forEach(page => {
                    (page.rows || []).forEach(row => {
                        (row.blocks || []).forEach(entry => {
                            if (entry.rowSpan) { delete entry.rowSpan; toccati++; }
                        });
                        const prima = row.blocks.length;
                        row.blocks = row.blocks.filter(e => !e.reserved);
                        toccati += prima - row.blocks.length;
                    });
                    page.rows = (page.rows || []).filter(r => r.blocks.length > 0 || !r.autoCreatedForRowSpan);
                });
                return toccati;
            }

            function rimuoviRiserveRowSpan(page, voceId) {
                for (let i = page.rows.length - 1; i >= 0; i--) {
                    const row = page.rows[i];
                    const idx = row.blocks.findIndex(e => e.reserved && e.ownerId === voceId);
                    if (idx >= 0) {
                        row.blocks.splice(idx, 1);
                        if (row.blocks.length === 0 && row.autoCreatedForRowSpan) {
                            page.rows.splice(i, 1);
                        }
                    }
                }
            }

            /** Ripara un template salvato PRIMA che esistessero i divieti "un blocco flowable resta
             * sempre l'unico della sua riga, mai in uno stack, mai con rowSpan>1" (vedi
             * inserisciBloccoInPagina/impostaRowSpanVoce, aggiunti dopo un audit su questo stesso
             * bug). Non scarta MAI un blocco: lo sposta in una riga tutta sua, subito dopo quella
             * in cui si trovava, pulendo eventuali segnaposto rowSpan orfani (rimuoviRiserveRowSpan)
             * e il campo rowSpan stesso — così torna a essere riconosciuto ovunque serve ("ultima
             * riga, un blocco solo, non impilato": sincronizzaFlussiBlocchiLunghi,
             * impaginaBlocchiSuPagineFisiche, rangeFlowableOrigine). Chiamata SOLO da
             * apriTemplateEditor, PRIMA di ogni calcolo di paginazione — un template già sano non
             * viene mai toccato (nessuna voce da estrarre, nessuna riga spostata). */
            function sanitizzaBlocchiFlowableIsolati(pages) {
                (pages || []).forEach(page => {
                    if (!Array.isArray(page.rows)) return;
                    for (let i = 0; i < page.rows.length; i++) {
                        const row = page.rows[i];
                        if (!Array.isArray(row.blocks)) continue;
                        const daEstrarre = [];
                        for (let j = row.blocks.length - 1; j >= 0; j--) {
                            const entry = row.blocks[j];
                            if (!entry) continue;
                            if (entry.stack && Array.isArray(entry.stack)) {
                                const flowNelloStack = entry.stack.filter(it => it && BLOCCHI_FLOWABLE.has(it.type));
                                if (flowNelloStack.length === 0) continue;
                                entry.stack = entry.stack.filter(it => !(it && BLOCCHI_FLOWABLE.has(it.type)));
                                flowNelloStack.forEach(it => { delete it.rowSpan; daEstrarre.push(it); });
                                if (entry.stack.length === 0) {
                                    row.blocks.splice(j, 1);
                                } else if (entry.stack.length === 1) {
                                    const rimasto = entry.stack[0];
                                    row.blocks[j] = Object.assign({}, rimasto, { colSpan: entry.colSpan });
                                }
                            } else if (BLOCCHI_FLOWABLE.has(entry.type)) {
                                const rigaCondivisa = row.blocks.length > 1;
                                const haRowSpan = entry.rowSpan && entry.rowSpan > 1;
                                if (!rigaCondivisa && !haRowSpan) continue;
                                rimuoviRiserveRowSpan(page, entry.id);
                                delete entry.rowSpan;
                                row.blocks.splice(j, 1);
                                daEstrarre.push(entry);
                            }
                        }
                        if (daEstrarre.length === 0) continue;
                        // iOrig: posizione della riga di partenza, che non cambia mai finché si
                        // inserisce solo DOPO di lei — "i" invece avanza ad ogni inserimento (serve
                        // al ciclo esterno per non rielaborare le righe appena create), quindi non è
                        // più l'indice giusto per un'eventuale rimozione della riga di partenza qui
                        // sotto (bug trovato rileggendo: usare "i" lì avrebbe cancellato l'ULTIMA
                        // riga appena creata invece di quella di partenza, ormai vuota, rimasta a
                        // iOrig).
                        const iOrig = i;
                        // daEstrarre è stato riempito scorrendo j a ritroso (destra verso sinistra):
                        // va invertito per reinserire le voci nel loro ordine di lettura originale.
                        daEstrarre.reverse().forEach(entry => {
                            page.rows.splice(i + 1, 0, { id: nuovoIdEditor('r'), blocks: [entry] });
                            i++;
                        });
                        // Riga di partenza svuotata dall'estrazione (conteneva SOLO blocchi
                        // flowable ormai spostati altrove): la si elimina; se invece le restavano
                        // altri blocchi (normali, o un secondo flowable non toccato) resta com'è.
                        if (row.blocks.length === 0) {
                            page.rows.splice(iOrig, 1);
                            i--;
                        }
                    }
                });
            }

            /* impostaRowSpanVoce RIMOSSA insieme al campo "Righe" del menu: era l'unica cosa
             * che poteva creare un rowSpan>1, e senza di lei i template normalizzati all'avvio
             * (appiattisciRowSpanTemplate) non possono più contenerne uno. Il ramo "gruppo" di
             * calcolaGruppiRowSpanPagina qui sotto resta come rete: legge il dato, e su un dato
             * che non esiste più restituisce sempre righe singole — cioè il rendering di sempre. */

            function calcolaGruppiRowSpanPagina(page) {
                const righe = page.rows || [];
                const segmenti = [];
                let i = 0;
                while (i < righe.length) {
                    const row = righe[i];
                    let maxEnd = i;
                    (row.blocks || []).forEach(entry => {
                        if (entry.reserved) return;
                        const rs = entry.rowSpan || 1;
                        if (rs > 1) maxEnd = Math.max(maxEnd, Math.min(righe.length - 1, i + rs - 1));
                    });
                    if (maxEnd > i) {
                        segmenti.push({ tipo: 'gruppo', startIndex: i, endIndex: maxEnd });
                        i = maxEnd + 1;
                    } else {
                        segmenti.push({ tipo: 'singola', rowIndex: i });
                        i++;
                    }
                }
                return segmenti;
            }

            function rimuoviBloccoDaPagina(page, blockId) {
                for (let i = 0; i < page.rows.length; i++) {
                    const row = page.rows[i];
                    const idx = row.blocks.findIndex(e => e.id === blockId);
                    if (idx >= 0) {
                        // Riga bloccata (richiesto esplicitamente, ribadito più volte: il blocco
                        // bloccato deve restare "fisso" in senso assoluto): non si tocca NULLA
                        // dentro una riga che contiene un blocco bloccato, nemmeno per trascinare
                        // via un blocco VICINO non bloccato — altrimenti il blocco bloccato
                        // scalerebbe comunque di posizione dentro alla riga, che è esattamente il
                        // tipo di "riadattamento automatico" che non deve più poter succedere.
                        // (Il blocco bloccato stesso non arriva mai qui: la sua etichetta rifiuta
                        // già di avviare un trascinamento, vedi attivaChipSpostamentoBlocco.)
                        // rigaHaBloccoGenuinamenteBloccato, non rigaContieneBloccoBloccato (bug
                        // corretto, "ENORME BUG" segnalato): quest'ultima considera bloccata anche
                        // una riga con un blocco solo "inserito ugualmente" fuori margine, che pero'
                        // non e' un lucchetto vero — rimuovere/spostare i suoi vicini veniva
                        // rifiutato senza alcun modo di sbloccarli.
                        if (rigaHaBloccoGenuinamenteBloccato(page, row)) return null;
                        const [entry] = row.blocks.splice(idx, 1);
                        // Un blocco rimosso che aveva rowSpan>1 lascia dietro segnaposto invisibili
                        // nelle righe sotto (vedi impostaRowSpanVoce) — vanno tolti insieme a lui,
                        // altrimenti resterebbero "riserve orfane" a bloccare spazio per sempre.
                        rimuoviRiserveRowSpan(page, entry.id);
                        const rowWasRemoved = row.blocks.length === 0;
                        if (rowWasRemoved) page.rows.splice(i, 1);
                        // Caso raro (si trascina via l'intera colonna-stack tramite il suo id): si
                        // restituisce il primo blocco impilato, i pulsanti "Rimuovi" del singolo
                        // blocco intercettano sempre prima il ramo sotto (cercano l'id del blocco,
                        // non quello dello stack che lo contiene).
                        return { block: entry.stack ? entry.stack[0] : entry, rowIndex: i, blockIndex: idx, rowWasRemoved };
                    }
                    if (rigaHaBloccoGenuinamenteBloccato(page, row)) continue;
                    for (let c = 0; c < row.blocks.length; c++) {
                        const entry = row.blocks[c];
                        if (!entry.stack) continue;
                        const si = entry.stack.findIndex(b => b.id === blockId);
                        if (si < 0) continue;
                        const [blk] = entry.stack.splice(si, 1);
                        if (entry.stack.length === 1) {
                            // Resta un solo blocco impilato: la colonna torna una voce singola
                            // normale, niente più wrapper "stack" superfluo con un elemento solo.
                            const { colSpan, ...rimasto } = entry.stack[0];
                            const nuovaVoce = { ...rimasto, colSpan: entry.colSpan };
                            if (entry.rowSpan) {
                                nuovaVoce.rowSpan = entry.rowSpan;
                                // Le riserve rowSpan erano agganciate all'id del vecchio contenitore
                                // stack: vanno riassegnate al nuovo id (quello del blocco superstite),
                                // altrimenti resterebbero orfane e lo spazio riservato si perderebbe.
                                page.rows.forEach(r2 => r2.blocks.forEach(e2 => {
                                    if (e2.reserved && e2.ownerId === entry.id) e2.ownerId = nuovaVoce.id;
                                }));
                            }
                            row.blocks[c] = nuovaVoce;
                        } else if (entry.stack.length === 0) {
                            row.blocks.splice(c, 1);
                            rimuoviRiserveRowSpan(page, entry.id);
                        }
                        const rowWasRemoved = row.blocks.length === 0;
                        if (rowWasRemoved) page.rows.splice(i, 1);
                        return { block: blk, rowIndex: i, blockIndex: c, rowWasRemoved, wasStacked: true };
                    }
                }
                return null;
            }

            /** Vero sotto la soglia della redesign mobile "Opzione B" (vedi CSS @media
             * max-width:760px): sotto quella soglia il drag&drop dalla palette è sostituito dal
             * tocco diretto (vedi inserisciBloccoATocco) e la palette/il cassetto pagine diventano
             * fogli a comparsa invece della colonna/riga fisse di sempre. */
            function modalitaMobileTemplateEditor() {
                return window.matchMedia('(max-width: 760px)').matches;
            }

            /** Piazzamento di un blocco col semplice tocco (redesign mobile): niente drag&drop, il
             * blocco scelto dalla tendina viene aggiunto direttamente come nuova riga a piena
             * larghezza in fondo alla pagina attiva — la posizione più prevedibile ed esente da
             * ambiguità quando non si può trascinare col dito per scegliere dove. Chiude la tendina
             * e seleziona subito il blocco appena creato così i suoi controlli (menu contestuale)
             * sono immediatamente a portata di tocco. */
            function inserisciBloccoATocco(type) {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;
                if (paginaGenerataDalProgramma(page)) return;
                salvaUndoSnapshotEditor();
                const blockObj = { id: nuovoIdEditor('b'), type, colSpan: page.cols || 4 };
                inserisciBloccoInPagina(page, blockObj, { newRow: true, rowIndex: page.rows.length, insertIndex: 0 });
                chiudiTendinaPaletteMobile();
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
                triggerVibrate(15);
                selezionaBloccoEditor(blockObj.id);
                // ESITO VISIBILE (segnalato: "non c'è nessun elemento che suggerisca che si sta
                // trascinando qualcosa"). Il blocco veniva inserito IN FONDO alla pagina e la
                // palette si chiudeva, ma niente portava lo sguardo sul risultato: su una pagina
                // già piena, e col foglio ridotto al 30%, il blocco nuovo finiva fuori dalla parte
                // visibile. Toccavi, il pannello spariva, e sembrava non fosse successo niente.
                // Ora il canvas si porta sul blocco appena creato e un messaggio dice cosa è
                // successo e dove — l'azione è breve e va confermata subito, non spiegata dopo.
                portaBloccoInVista(blockObj.id);
                mostraToastTemplateEditor(`${(REPORT_BLOCK_TYPES[type] || {}).label || 'Blocco'} aggiunto in fondo alla pagina`);
            }

