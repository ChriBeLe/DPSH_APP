            // ===================== FASE D: RICONCILIAZIONE EDITOR↔EXPORT (vedi Piano_Riscrittura_Layout_Export.md) =====================
            // Indagine preliminare (prima di scrivere qualunque codice): sincronizzaFlussiBlocchiLunghi
            // (editor) e impaginaBlocchiSuPagineFisiche (export) raggruppano già le categorie di una
            // tabella flowable nello STESSO identico modo — solo per interruzione manuale, mai per
            // altezza (scelta esplicita di una fase precedente di questa sessione). Il vero divario
            // trovato è un altro: sincronizzaFlussiBlocchiLunghi mette SEMPRE il primo gruppo di un
            // blocco flowable sulla sua pagina di ORIGINE, qualunque cosa ci sia già sopra — mentre
            // impaginaBlocchiSuPagineFisiche, nel motore di export vero, isola quel primo gruppo su
            // una pagina nuova se non entra insieme al contenuto già presente (vedi "punto d'ingresso"
            // lì). L'editor può quindi mostrare tutto comodo su una pagina che, in stampa, l'export
            // sposta altrove — e lo stesso vale, più in generale, per QUALUNQUE pagina del template,
            // flowable o no: un insieme di righe normali che sembra stare su una pagina nel canvas può
            // comunque risultare più alto del budget reale una volta misurato per davvero.
            //
            // La riscrittura del canvas per spostare live il contenuto tra pagine è stata scartata
            // (già tentata e rimossa due volte in questo progetto per bug di misurazione a metà
            // animazione, vedi commenti storici su sincronizzaFlussiBlocchiLunghi) — troppo rischio
            // per il beneficio. La riconciliazione scelta è invece una VERIFICA: esegue DAVVERO lo
            // stesso motore dell'export (costruisciAtomiPaginaTemplate + impaginaBlocchiSuPagineFisiche,
            // funzioni invariate, zero duplicazione) su ogni pagina di ORIGINE del template (mai sulle
            // pagine di continuazione, che sono un dettaglio di anteprima runtime mai salvato — vedi
            // salvaTemplateEditor) e confronta il numero di pagine fisiche REALI con quante l'editor
            // ne mostra oggi. Se non coincidono, l'utente lo vede súbito sulla miniatura invece di
            // scoprirlo solo aprendo il PDF finale — la stessa "riconciliazione" richiesta, ma sotto
            // forma di verità sempre corretta invece di un tentativo di automagia che ha già fallito
            // due volte su questo stesso file.
            /** Ricalcola, per ogni pagina di ORIGINE del template aperto, il confronto reale tra
             * quante pagine fisiche mostra oggi l'editor (lei stessa + l'eventuale catena di
             * continuazione automatica) e quante ne produce DAVVERO il motore di export. Sulla
             * stessa cadenza "a riposo" di sincronizzaFlussiBlocchiLunghi/ricalcolaAvvisiOverflowTuttiBlocchi
             * — mai durante drag/animazioni, mai atteso dal chiamante (fire-and-forget). */
            async function verificaPagineOrigineControMotoreReale() {
                if (!templateEditorState || !Array.isArray(templateEditorState.pages) || !templateEditorState.ctx) return;
                const risultati = {};
                for (let idx = 0; idx < templateEditorState.pages.length; idx++) {
                    const pagina = templateEditorState.pages[idx];
                    if (pagina.continuaBloccoId) continue; // pagina di continuazione: mai un pageDef reale a sé
                    // Quante pagine canvas mostra oggi l'editor per questa pagina di origine: lei
                    // stessa più l'eventuale catena di autoContinuazione agganciata subito dopo.
                    let paginaCanvasCount = 1;
                    let j = idx + 1;
                    while (j < templateEditorState.pages.length && templateEditorState.pages[j].continuaBloccoId) { paginaCanvasCount++; j++; }
                    try {
                        // pagina.margins || templateEditorState.margins: stessa identica espressione
                        // usata dall'export vero (pageDef.margins || template.margins, vedi
                        // buildSurveyReportHtml) e dall'anteprima di stampa reale (Fase B) — oggi
                        // pagina.margins non è mai valorizzato da nessun punto del codice, ma se in
                        // futuro lo sarà questa verifica resta corretta senza bisogno di ricordarsene.
                        const { atomi, indiciForzati, margins: mrg } = await costruisciAtomiPaginaTemplate(pagina, templateEditorState.ctx, pagina.margins || templateEditorState.margins);
                        if (atomi.length === 0) {
                            risultati[pagina.id] = { paginaCanvasCount, paginePreviste: 0, disallineato: false };
                            continue;
                        }
                        // Come l'export: l'intestazione più alta del margine toglie spazio (margineConIntestazione).
                        const { limiteImpaginazioneMm } = calcolaBudgetPaginaMm(margineConIntestazione(mrg, pagina.header, templateEditorState.headerEnabled), templateEditorState.footerEnabled);
                        const pagineFisiche = impaginaBlocchiSuPagineFisiche(atomi, limiteImpaginazioneMm, indiciForzati);
                        const paginePreviste = pagineFisiche.length;
                        risultati[pagina.id] = { paginaCanvasCount, paginePreviste, disallineato: paginePreviste !== paginaCanvasCount };
                    } catch (e) {
                        // Mai bloccare l'editor per un errore di verifica: nessun avviso è meglio di
                        // un avviso sbagliato — la pagina resta semplicemente non verificata.
                        risultati[pagina.id] = null;
                    }
                }
                templateEditorState.verificaPagineReali = risultati;
            }
            // ===================== FINE FASE D =====================

            // elencoGruppiCategoriaBlocco / applicaVisibilitaCategorieBlocco RIMOSSE (bug segnalato
            // con screenshot: pagina di origine di un blocco flowable completamente vuota subito
            // dopo aver aggiunto un'interruzione manuale, mentre la sua miniatura restava corretta).
            // Il meccanismo era "genera il blocco per intero, POI nascondi via DOM (display:none) le
            // categorie fuori range" — un secondo passaggio separato dal render vero e proprio, che
            // poteva fallire in silenzio (querySelector che non trova ancora l'elemento al momento
            // giusto, valore riletto prima di essere aggiornato) lasciando tutte le categorie
            // nascoste con niente a forzarle di nuovo visibili se elencoGruppiCategoriaBlocco
            // tornava una lista vuota. Sostituito da filtraCategorieHtmlFlowable, che genera
            // DIRETTAMENTE solo l'HTML delle categorie giuste (chiamata da costruisciHtmlBloccoEditor/
            // contenutoBloccoOPlaceholder con il range passato da renderTemplateEditorCanvas per la
            // pagina di origine e da costruisciRigaContinuazionePagina per le continuazioni) — un
            // solo passaggio deterministico, niente più DOM da ripulire dopo.

            // trovaUltimaCategoriaCheEntra RIMOSSA (griglia fissa, richiesta esplicitamente dopo
            // l'ennesimo bug della stessa famiglia — "35 pagine diventano 91"): misurava
            // getBoundingClientRect() dal vivo per decidere quante categorie entrassero in una
            // pagina, la causa comune di ogni bug ricorrente in questa zona (un frame di
            // animazione ancora in corso, un font non ancora caricato, uno zoom diverso bastavano
            // a sballare il conteggio). Il raggruppamento è ora un calcolo puro sugli indici delle
            // categorie forzate dall'utente (vedi sincronizzaFlussiBlocchiLunghi), nessuna misura.

            /** Costruisce l'unica "riga" mostrata su una pagina di continuazione: SOLO l'intervallo
             * di categorie [continuaDaCategoria, continuaACategoria] salvato su questa pagina (vedi
             * sincronizzaFlussiBlocchiLunghi) — generato già filtrato qui, passando il range a
             * costruisciHtmlBloccoEditor (vedi filtraCategorieHtmlFlowable), non più mostrato per
             * intero e poi nascosto dal chiamante via DOM (applicaVisibilitaCategorieBlocco,
             * RIMOSSA). Sempre in sola lettura (vedi costruisciHtmlBloccoEditor: si seleziona/
             * modifica solo dalla pagina di origine). Se il blocco di origine non esiste più
             * (cancellato dall'utente), non c'è nulla da mostrare: la pagina orfana viene ripulita
             * al giro successivo di sincronizzaFlussiBlocchiLunghi. */
            function costruisciRigaContinuazionePagina(page, ctx) {
                const trovato = trovaBloccoEPaginaPerId(page.continuaBloccoId);
                if (!trovato) return '';
                const { voce } = trovato;
                const cols = page.cols || 4;
                const span = spanVoceInGriglia(voce, cols);
                const rangeContinuazione = { blockId: voce.id, da: page.continuaDaCategoria || 0, a: page.continuaACategoria != null ? page.continuaACategoria : Infinity };
                const contenuto = costruisciHtmlBloccoEditor(voce, voce.id, span, cols, ctx, true, rangeContinuazione);
                // Larghezza (richiesto esplicitamente: "il blocco di continuo deve seguire le stesse
                // proporzioni... di larghezza assegnato"): su questa pagina il blocco è sempre SOLO
                // sulla sua riga (nessun blocco affianco con cui condividere lo spazio, page.rows di
                // una pagina di continuazione è sempre []) — un flex:1 1 auto qui lo farebbe sempre
                // riempire l'intera larghezza della pagina, ignorando colSpan/cols. Si usa invece
                // SEMPRE una percentuale fissa span/cols (stessa formula di flexEntryCss quando
                // espandiSuSpazioVuoto:false), così la larghezza visiva coincide con quella
                // sull'origine indipendentemente da espandiSuSpazioVuoto (qui non c'è spazio vuoto di
                // riga da riempire, sarebbe comunque fuorviante espandersi). L'allineamento (align)
                // resta rispettato allo stesso modo di styleDimensioneVoce.
                // LA CODA: le righe che sulla pagina di origine stavano DOPO il blocco. Solo
                // sull'ultima pagina della catena, e rese in sola lettura come il blocco stesso —
                // si modificano dalla pagina di origine, dove vivono davvero. Mostrarle
                // modificabili qui avrebbe voluto dire due posti in cui toccare la stessa riga,
                // e quale dei due vince e' esattamente la domanda che non si vuole dover fare.
                let codaHtml = '';
                if (page.continuaCodaDaPagina) {
                    const pagOrig = (templateEditorState.pages || []).find(p => p.id === page.continuaCodaDaPagina);
                    if (pagOrig && pagOrig.flowableRigaIdx != null) {
                        const dopo = (pagOrig.rows || []).slice(pagOrig.flowableRigaIdx + 1);
                        dopo.forEach(row => {
                            if (!row || !row.blocks) return;
                            codaHtml += `<div class="tpl-editor-row tpl-editor-row-coda" data-row-id="${row.id}" style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; position:relative;">`;
                            row.blocks.forEach(entry => {
                                const spanC = spanVoceInGriglia(entry, cols);
                                const items = (entry.stack && entry.stack.length > 0) ? entry.stack : [entry];
                                codaHtml += `<div class="tpl-editor-block" data-block-id="${entry.id}" style="${styleDimensioneVoce(entry, spanC, cols)} min-width:0;">`;
                                items.forEach(item => { codaHtml += costruisciHtmlBloccoEditor(item, entry.id, spanC, cols, ctx, true, null); });
                                codaHtml += `</div>`;
                            });
                            codaHtml += `</div>`;
                        });
                    }
                }
                const alignCont = voce.align || 'left';
                const pctCont = (Math.max(0.3, Math.min(cols, span)) / Math.max(1, cols) * 100).toFixed(4);
                const margineCont = alignCont === 'right' ? 'margin-left:auto;' : alignCont === 'center' ? 'margin-left:auto; margin-right:auto;' : '';
                return `<div class="tpl-editor-row tpl-editor-row-continuazione" data-row-id="${page.id}-cont" style="display:flex; gap:8px; margin-bottom:10px; align-items:flex-start; position:relative;">
                    <div class="tpl-editor-block" data-block-id="${voce.id}" style="flex: 0 0 ${pctCont}%; ${margineCont} min-width:0;">
                        <div style="font-size:9px; color:#94a3b8; font-style:italic; margin-bottom:2px; padding-left:2px;">↳ continua dalla pagina precedente</div>
                        ${contenuto}
                    </div>
                </div>${codaHtml}`;
            }

            /** Miniatura per la striscia pagine (renderTemplateEditorPagesStrip) di una pagina di
             * continuazione: NON passa da buildPaginaRigheHtml (quella è la funzione usata anche
             * per l'export reale — vedi sotto, le pagine di continuazione non esistono affatto lì,
             * il browser le pagina da solo in stampa) perché renderizzerebbe una pagina vuota
             * (page.rows è sempre [] per una pagina di continuazione). Costruisce invece
             * direttamente dal campo ctx del blocco (allegatoHtml/tabellaDettagliataHtml, lo
             * stesso HTML completo, tutte le categorie) e nasconde via CSS (attribute selector,
             * niente DOM da misurare per una semplice anteprima) l'intervallo [continuaDaCategoria,
             * continuaACategoria] salvato. */
            function miniaturaPaginaContinuazione(page) {
                const trovato = trovaBloccoEPaginaPerId(page.continuaBloccoId);
                if (!trovato || !templateEditorState.ctx) return '';
                const campo = trovato.voce.type === 'allegato-formule' ? 'allegatoHtml'
                    : trovato.voce.type === 'tabella-dettagliata-parametri' ? 'tabellaDettagliataHtml' : null;
                const contenuto = campo ? (templateEditorState.ctx[campo] || '') : '';
                if (!contenuto) return '';
                const da = page.continuaDaCategoria || 0;
                const a = page.continuaACategoria != null ? page.continuaACategoria : 999;
                // ⚠️ QUESTO È IL BUG DEI "BLOCCHI LUNGHI CHE SPARISCONO APRENDO LE ANTEPRIME".
                // Il filtro delle categorie si scrive con un foglio di stile in linea, che NON è confinato
                // al <div> che lo contiene: vale per l'INTERO documento. Queste miniature finiscono
                // dentro la striscia delle anteprime, cioè nella pagina viva — quindi la regola
                //     table[data-categoria-index]{display:none}
                // spegneva ogni tabella di categoria dell'app, comprese quelle vere sul foglio, e
                // l'unica riga `{display:table}` a sopravvivere era quella dell'ULTIMA miniatura
                // costruita. Da qui, alla lettera, il sintomo riferito: «ora sia la prima che la
                // seconda pagina sono non visibili, solo la terza e ultima lo è». Le misure lo
                // dicevano già: le tabelle erano nel DOM (4 su 4), il blocco aveva altezza zero e
                // larghezza giusta, e overflow era visible ovunque — cioè niente veniva ritagliato
                // né spostato: era semplicemente spento. Aprire e chiudere la striscia lo accendeva
                // e spegneva perché la striscia chiusa non costruisce nessuna miniatura.
                //
                // La correzione: ogni selettore parte dal contenitore di QUESTA miniatura.
                // L'ancoraggio è un data-attribute e non un id perché neutralizzaIdentificatoriMiniatura
                // riscrive tutti gli ` id="` delle miniature (per non far trovare i doppioni alle
                // ricerche del canvas): un `#id` qui sarebbe stato rinominato e la regola avrebbe
                // ricominciato a valere per tutti. Stessa tecnica già usata, correttamente, da
                // applicaInterruzioniPaginaManualiCategoria.
                const ambito = `minicont-${String(page.id || 'x').replace(/[^A-Za-z0-9_-]/g, '')}-${da}-${a}`;
                const dentro = `[data-mini-ambito="${ambito}"]`;
                const selettoriVisibili = [];
                for (let i = da; i <= a; i++) selettoriVisibili.push(`${dentro} table[data-categoria-index="${i}"]`);
                // Il titolo/info (data-titolo-tabella-blocco) non deve mai ripetersi: nascosto qui
                // esattamente come nella pagina di continuazione reale (vedi
                // applicaVisibilitaCategorieBlocco), compare solo sulla pagina di origine.
                const stile = `<style>${dentro} table[data-categoria-index]{display:none}${dentro} table[data-titolo-tabella-blocco]{display:none}${selettoriVisibili.join(',')}{display:table}</style>`;
                const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                // Fase A del piano di unificazione: area stampabile dalla fonte unica.
                const areaStampabileMiniatura = calcolaBudgetPaginaMm(mrg, false).areaStampabileMm;
                return `<div data-mini-ambito="${ambito}" style="min-height:${areaStampabileMiniatura}mm; padding:${mrg.top}mm ${mrg.right}mm ${mrg.bottom}mm ${mrg.left}mm; font-family:Arial,sans-serif; box-sizing:border-box;">
                    ${stile}
                    <div style="font-size:9px; color:#94a3b8; font-style:italic; margin-bottom:4px;">↳ continua dalla pagina precedente</div>
                    ${contenuto}
                </div>`;
            }

            /** Orchestratore: chiamato dal render tail di OGNI render del canvas. Scandisce TUTTE
             * le pagine reali (mai quelle di continuazione, che non hanno righe proprie da cui
             * ripartire), non solo quella attiva — richiesto esplicitamente dopo che l'utente ha
             * notato che una pagina di continuazione compariva nella striscia solo dopo aver
             * toccato il blocco o essere navigato fin lì: "mi serve sempre presente... preferirei
             * fosse sempre presente come una normale pagina". Per ogni pagina che termina con un
             * blocco flowable, misura dove cade il taglio e costruisce/aggiorna/elimina la sua
             * catena di pagine di continuazione, navigando temporaneamente una pagina alla volta
             * per misurarle (stessa tecnica di gestisciInserimentoBloccoNuovoConOverflow: tutto
             * sincrono, l'utente non vede mai questi render intermedi). Gli indici delle pagine
             * successive slittano ogni volta che si inserisce una pagina di continuazione, quindi
             * si tiene traccia della pagina che l'utente stava REALMENTE guardando per riferimento
             * d'oggetto (non per indice numerico, che nel frattempo può essere cambiato) e ci si
             * torna sempre alla fine. */
            // azzeraTransformPerMisurazioneFlusso RIMOSSA (griglia fissa, richiesta esplicitamente
            // dopo l'ennesimo bug della stessa famiglia): serviva a ripulire i transform CSS
            // "in volo" prima di misurare getBoundingClientRect() nel calcolo del taglio tra
            // categorie — misura che non esiste più (vedi sincronizzaFlussiBlocchiLunghi qui
            // sotto, ora un calcolo puro sugli indici, nessun DOM coinvolto). Nessun chiamante
            // rimasto.
            function sincronizzaFlussiBlocchiLunghi() {
                // GRIGLIA FISSA (richiesto esplicitamente dopo l'ennesimo bug della stessa
                // famiglia — "35 pagine diventano 91" nonostante la riscrittura del motore): il
                // raggruppamento delle categorie qui sotto è ORA un puro calcolo sugli indici
                // (numero di categorie del blocco + interruzioni manuali dell'utente), MAI più
                // una misura DOM dal vivo — quella misura (getBoundingClientRect contro la riga
                // "fine pagina A4") è la causa comune di ogni bug di questa famiglia: bastava un
                // frame di animazione ancora in corso, un font non ancora caricato, uno zoom
                // diverso, per sballare il conteggio. Il numero di RIGHE per categoria è comunque
                // sempre fisso (elenco autori/formule scritto nel codice, mai dipendente dai dati
                // della prova — vedi buildAllegatoHtml/htmlTabellaDettagliata/elencoCategorieBlocco),
                // quindi l'unica cosa davvero variabile (l'ALTEZZA della riga, che dipende dallo
                // slider "Altezza righe" e dal numero di colonne/strati) semplicemente non entra
                // più nella decisione: si raggruppa PER CATEGORIA dichiarata dall'utente nel menu
                // del blocco, punto — stessa identica logica usata dal motore di export (vedi
                // impaginaBlocchiSuPagineFisiche), quindi editor e PDF non possono più divergere.
                // Il costo esplicito, concordato: se l'utente non mette abbastanza interruzioni,
                // una pagina può contenere più contenuto di quanto ci stia fisicamente e
                // traboccare — un risultato prevedibile e visibile, non più pagine bianche o
                // spezzate a caso.
                if (!document.getElementById('templateEditorCanvas')) return;
                const paginaAttivaOriginale = templateEditorState.pages[templateEditorState.activePageIdx] || null;

                let cambiatoPagine = false;

                // Elimina un'intera catena di pagine automatiche agganciate a un blocco (usata sia
                // quando il blocco non c'è più in fondo alla sua pagina, sia quando si è
                // accorciato e ne servono meno di prima). Non tocca più activePageIdx qui dentro:
                // il ripristino avviene una sola volta, alla fine, per riferimento d'oggetto.
                const eliminaCatenaContinuazione = (blockId, daIndicePagina) => {
                    let cambiato = false;
                    for (let i = templateEditorState.pages.length - 1; i >= (daIndicePagina || 0); i--) {
                        const p = templateEditorState.pages[i];
                        if (p.autoContinuazione && p.continuaBloccoId === blockId) {
                            templateEditorState.pages.splice(i, 1);
                            cambiato = true;
                        }
                    }
                    return cambiato;
                };

                // Pulizia pagine di continuazione rimaste orfane (blocco cancellato o spostato
                // altrove) — scansione globale, sempre, non più solo quando la pagina attiva non
                // ha un blocco flowable in fondo.
                const idViviFlowable = new Set();
                templateEditorState.pages.forEach(p => (p.rows || []).forEach(r => {
                    if (r.blocks && r.blocks.length === 1 && eBloccoSpezzabile(r.blocks[0])) {
                        idViviFlowable.add(r.blocks[0].id);
                    }
                }));
                for (let i = templateEditorState.pages.length - 1; i >= 0; i--) {
                    const p = templateEditorState.pages[i];
                    if (p.autoContinuazione && p.continuaBloccoId && !idViviFlowable.has(p.continuaBloccoId)) {
                        templateEditorState.pages.splice(i, 1);
                        cambiatoPagine = true;
                    }
                }

                riflussoAutomaticoSospeso = true;
                let pageIdx = 0;
                // try/finally attorno a TUTTO il ciclo (bug segnalato: "mi ritrovo con un blocco
                // vuoto" — un'eccezione imprevista in mezzo a questo calcolo, prima d'ora,
                // interrompeva la funzione SENZA MAI eseguire il ripristino di fine funzione qui
                // sotto (riflussoAutomaticoSospeso=false, ritorno alla pagina realmente attiva,
                // render pulito finale): il canvas restava fermo su qualunque stato intermedio
                // (magari con una visibilità di categorie a metà calcolo) e riflussoAutomaticoSospeso
                // restava bloccato a "true" per il resto della sessione, disattivando anche il
                // riflusso automatico normale. Il try/catch interno PER SINGOLA PAGINA (sotto) evita
                // che un problema isolato su UNA pagina interrompa la sincronizzazione delle altre;
                // questo finally più esterno è l'ultima rete di sicurezza, garantisce comunque
                // sempre il ripristino anche se qualcosa di davvero inatteso sfugge al catch interno.
                try {
                while (pageIdx < templateEditorState.pages.length) {
                  try {
                    const pagina = templateEditorState.pages[pageIdx];
                    if (pagina.continuaBloccoId) { pageIdx++; continue; } // pagina di continuazione: niente righe proprie da cui ripartire

                    // IN QUALUNQUE RIGA, non piu' solo nell'ultima. Prima il taglio si calcolava
                    // solo se il blocco stava in fondo alla pagina: bastava mettergli sotto
                    // un'immagine e la divisione spariva, senza dire niente. E il motore di
                    // export, che impagina per atomi in ordine, le righe successive le metteva
                    // GIA' dopo l'ultimo segmento — quindi editor e PDF mostravano due documenti
                    // diversi. Qui si allinea l'editor al motore, non viceversa: e' il motore ad
                    // avere ragione, perche' e' lui che fa il PDF.
                    const righe = pagina.rows || [];
                    let idxRigaFlowable = -1;
                    for (let r = righe.length - 1; r >= 0; r--) {
                        const rg = righe[r];
                        if (rg && rg.blocks && rg.blocks.length === 1 && eBloccoSpezzabile(rg.blocks[0])) { idxRigaFlowable = r; break; }
                    }
                    const bloccoFlowable = idxRigaFlowable >= 0 ? righe[idxRigaFlowable].blocks[0] : null;
                    if (!bloccoFlowable) { pageIdx++; continue; } // pagina normale, nulla da flow-are

                    const pageIdxOrigine = pageIdx;
                    // Nessuna navigazione/render/misura qui: il raggruppamento è un calcolo puro
                    // sugli indici di categoria (vedi commento sopra la funzione), non serve più
                    // vedere il blocco a video per decidere dove taglia. La visibilità delle
                    // categorie viene applicata da sola al prossimo render di ciascuna pagina
                    // (vedi il ramo che legge flowableUltimaCategoriaMostrata/continuaDaCategoria/
                    // continuaACategoria dentro renderTemplateEditorCanvas) — qui si scrivono solo
                    // questi campi sul modello dati.
                    const numCategorie = elencoCategorieBlocco(bloccoFlowable.type, bloccoFlowable).length;
                    if (numCategorie === 0) { pageIdx = pageIdxOrigine + 1; continue; } // tipo di blocco senza categorie note

                    // "Superpotere" di interruzione manuale (richiesto esplicitamente): l'UNICO
                    // criterio che decide dove si taglia — le categorie tra due interruzioni
                    // dichiarate (o dall'inizio/fino alla fine se non ce n'è nessuna) sono sempre
                    // e comunque UNA pagina, che il contenuto ci stia fisicamente o no.
                    const indiciForzati = indiciForzatiBlocco(bloccoFlowable, numCategorie);
                    const gruppiCategorie = [];
                    {
                        let inizioGruppo = 0;
                        for (let idx = 1; idx < numCategorie; idx++) {
                            if (indiciForzati.has(idx)) {
                                gruppiCategorie.push({ da: inizioGruppo, a: idx - 1 });
                                inizioGruppo = idx;
                            }
                        }
                        gruppiCategorie.push({ da: inizioGruppo, a: numCategorie - 1 });
                    }

                    // Le righe che stanno DOPO il blocco: sull'origine non si disegnano piu' —
                    // se ne va con lui l'ultima pagina della catena. Scritto sulla pagina, non
                    // ricalcolato al render: il render deve poter riapplicare da solo la stessa
                    // decisione, senza rifare il conto (e senza rischiare di farlo diverso).
                    pagina.flowableRigaIdx = (gruppiCategorie.length > 1) ? idxRigaFlowable : null;

                    if (gruppiCategorie.length <= 1) {
                        // Nessuna interruzione manuale (o nessuna che tagli davvero qualcosa):
                        // tutto il blocco resta sulla sua pagina di origine, nessuna continuazione.
                        pagina.flowableUltimaCategoriaMostrata = null;
                        pagina.flowableRigaIdx = null;
                        if (eliminaCatenaContinuazione(bloccoFlowable.id, pageIdxOrigine + 1)) cambiatoPagine = true;
                        pageIdx = pageIdxOrigine + 1;
                        continue;
                    }

                    // Persistito sulla pagina (non solo applicato al DOM attuale): il prossimo
                    // render di questa pagina deve poter riapplicare questo stesso taglio da solo
                    // (vedi il ramo "else" aggiunto in renderTemplateEditorCanvas subito dopo
                    // canvas.innerHTML = html).
                    pagina.flowableUltimaCategoriaMostrata = gruppiCategorie[0].a;

                    let idxCatena = pageIdxOrigine + 1;
                    for (let g = 1; g < gruppiCategorie.length; g++) {
                        let pag = templateEditorState.pages[idxCatena];
                        const eNuova = !pag || pag.continuaBloccoId !== bloccoFlowable.id;
                        if (eNuova) {
                            pag = nuovaPaginaVuota();
                            pag.cols = pagina.cols;
                            pag.header = JSON.parse(JSON.stringify(pagina.header || { imageDataUrl: null, text: '' }));
                            pag.footer = JSON.parse(JSON.stringify(pagina.footer || { text: '' }));
                            pag.autoContinuazione = true;
                            templateEditorState.pages.splice(idxCatena, 0, pag);
                            cambiatoPagine = true;
                        }
                        pag.continuaBloccoId = bloccoFlowable.id;
                        pag.continuaDaCategoria = gruppiCategorie[g].da;
                        pag.continuaACategoria = gruppiCategorie[g].a;
                        // Solo l'ULTIMA della catena si porta dietro le righe che seguivano il
                        // blocco sulla pagina di origine: sulle intermedie il blocco continua e
                        // basta, e infilarci qualcosa in mezzo lo spezzerebbe due volte.
                        pag.continuaCodaDaPagina = (g === gruppiCategorie.length - 1) ? pagina.id : null;
                        idxCatena++;
                    }

                    // Il blocco ha meno gruppi rispetto a un giro precedente (interruzione manuale
                    // rimossa): elimina le pagine automatiche rimaste in più oltre l'ultima appena
                    // scritta.
                    if (eliminaCatenaContinuazione(bloccoFlowable.id, idxCatena)) cambiatoPagine = true;

                    // Riprende la scansione subito dopo l'ultima pagina di QUESTA catena — le
                    // pagine di continuazione appena sistemate non vanno riesaminate come se
                    // fossero pagine normali.
                    pageIdx = idxCatena;
                  } catch (errPagina) {
                    // Isolamento per singola pagina (vedi commento sopra): un problema nel calcolo
                    // del flusso di QUESTA pagina non deve impedire di sincronizzare le altre, né
                    // lasciare le sue categorie in uno stato di visibilità indeterminato — si
                    // ripristina tutto visibile (mai un blocco vuoto) e si passa oltre. Basta
                    // azzerare flowableUltimaCategoriaMostrata: renderTemplateEditorCanvas calcola
                    // rangeFlowableOrigine SOLO quando è impostato, quindi con null il prossimo
                    // render genera il blocco per intero, nessuna chiamata DOM aggiuntiva qui
                    // (vedi filtraCategorieHtmlFlowable, applicaVisibilitaCategorieBlocco RIMOSSA).
                    console.error('[sincronizzaFlussiBlocchiLunghi] Errore nel calcolo del flusso per la pagina', pageIdx, errPagina);
                    const paginaErr = templateEditorState.pages[pageIdx];
                    const righeErr = (paginaErr && paginaErr.rows) || [];
                    const ultimaRigaErr = righeErr[righeErr.length - 1];
                    const bloccoErr = (ultimaRigaErr && ultimaRigaErr.blocks && ultimaRigaErr.blocks.length === 1 && !ultimaRigaErr.blocks[0].stack) ? ultimaRigaErr.blocks[0] : null;
                    if (bloccoErr && BLOCCHI_FLOWABLE.has(bloccoErr.type) && paginaErr) {
                        paginaErr.flowableUltimaCategoriaMostrata = null;
                    }
                    pageIdx++;
                  }
                }
                } catch (errGenerale) {
                    console.error('[sincronizzaFlussiBlocchiLunghi] Errore generale durante la sincronizzazione dei flussi', errGenerale);
                } finally {
                    riflussoAutomaticoSospeso = false;
                }

                // Torna sempre sulla pagina che l'utente stava REALMENTE guardando, individuata per
                // riferimento d'oggetto (il suo indice numerico può essere slittato per via delle
                // pagine di continuazione inserite prima di lei) — se quella pagina non esiste più
                // (era lei stessa una pagina di continuazione orfana appena ripulita) si resta
                // sull'indice attuale, clampato.
                let idxFinale = paginaAttivaOriginale ? templateEditorState.pages.indexOf(paginaAttivaOriginale) : -1;
                if (idxFinale < 0) idxFinale = Math.max(0, Math.min(templateEditorState.pages.length - 1, templateEditorState.activePageIdx));
                templateEditorState.activePageIdx = idxFinale;
                renderTemplateEditorCanvas(); // render pulito finale della pagina che l'utente sta davvero guardando
                if (cambiatoPagine) {
                    renderTemplateEditorPagesStrip();
                    renderTemplateEditorPageControls();
                }
            }

            // Avviso non invasivo (auto-scompare) per segnalare il riflusso automatico tra pagine —
            // può capitare più volte di seguito mentre si ridimensiona un blocco vicino al margine,
            // quindi ogni nuova chiamata riparte da zero invece di accodarsi alla precedente.
            // Ora è il toast di tutta l'app (mostraToast, pezzo 002): stesso aspetto e stesso posto
            // ovunque, qui con la durata breve che aveva nell'editor.
            function mostraToastTemplateEditor(testo) {
                mostraToast(testo, { durata: 2600 });
            }

            /** Linea tratteggiata rossa: NON più fissa a 297mm (l'altezza fisica del foglio, che
             * include anche i margini e lo spazio del piè di pagina — mostrarla lì era fuorviante,
             * bug segnalato con screenshot: "quella categoria rientra perfettamente nello spazio
             * A4" ma veniva comunque spostata su una pagina a parte in export, perché 297mm è il
             * bordo della CARTA, non il limite reale usato per impaginare). Ora posizionata
             * all'altezza VERA oltre la quale l'export sposta il contenuto sulla pagina successiva:
             * 297mm meno il margine inferiore del template meno lo spazio riservato al piè di
             * pagina SOLO se è attivo — la stessa identica formula di
             * costruisciPagineTemplateUnificato (maxAltezzaPaginaMm), non una stima separata che
             * può disallinearsi. Resta puramente indicativa: dice "sotto questa riga il contenuto
             * va sulla pagina successiva quando esporti", non taglia né nasconde nulla — ma ora dice
             * la verità. */
            function mostraLineaFinePaginaA4() {
                const frame = document.getElementById('templateEditorPageFrame');
                if (!frame) return;
                const paginaA4 = templateEditorState.pages[templateEditorState.activePageIdx];
                const { riservaFooterMm, limiteAssolutoDaCimaFoglioMm: limiteMm } = calcolaBudgetPaginaMm(margineConIntestazione(templateEditorState.margins, paginaA4 && paginaA4.header, templateEditorState.headerEnabled), templateEditorState.footerEnabled);
                let linea = document.getElementById('templateEditorA4Line');
                if (!linea) {
                    linea = document.createElement('div');
                    linea.id = 'templateEditorA4Line';
                    linea.style.position = 'absolute';
                    linea.style.left = '0';
                    linea.style.right = '0';
                    linea.style.borderTop = '2px dashed #ef4444';
                    linea.style.pointerEvents = 'none';
                    linea.innerHTML = '<span id="templateEditorA4LineLabel" style="position:absolute; right:0; top:3px; font-size:9px; font-weight:800; color:#ef4444; background:#fff; padding:1px 5px; border-radius:3px;"></span>';
                    frame.appendChild(linea);
                }
                // Aggiornata ad ogni render (non solo alla creazione): margini e piè di pagina
                // possono cambiare mentre l'editor resta aperto (maniglie margine, toggle piè di
                // pagina), la riga deve seguirli sempre, mai restare quella della prima apertura.
                linea.style.top = `${limiteMm}mm`;
                const label = document.getElementById('templateEditorA4LineLabel');
                if (label) label.textContent = `limite impaginazione — margine${riservaFooterMm ? ' + piè di pagina' : ''}`;
            }

            /** L'intera pagina deve stare sempre visibile senza scorrere quando lo zoom è
             * automatico: si misura la dimensione naturale del riquadro A4 (che può essere più alto
             * di 297mm se il contenuto trabocca) e la si rimpicciolisce con transform:scale() perché
             * entri nello spazio disponibile, mai il contrario. Se l'utente ha impostato uno zoom
             * manuale (rotella/pinch/pulsanti +/-) quella percentuale prende il sopravvento e la
             * pagina può eccedere lo spazio visibile: è lecito, l'utente ha chiesto esplicitamente
             * di ingrandire, per questo templateEditorViewport scrolla quando serve in quel caso.
             * L'elemento "outer" viene dimensionato alla misura GIÀ scalata, altrimenti il layout
             * lascerebbe vuoto lo spazio della dimensione originale non scalata. */
            function adattaScalaEditorCanvas() {
                const viewport = document.getElementById('templateEditorViewport');
                const outer = document.getElementById('templateEditorScaleOuter');
                const wrap = document.getElementById('templateEditorScaleWrap');
                const frame = document.getElementById('templateEditorPageFrame');
                if (!viewport || !outer || !wrap || !frame) return;
                wrap.style.transform = 'none';
                const naturalW = frame.offsetWidth;
                const naturalH = frame.offsetHeight;
                if (!naturalW || !naturalH) return;

                let scale;
                if (templateEditorState.manualZoom) {
                    scale = templateEditorState.manualZoom;
                } else {
                    const availW = Math.max(50, viewport.clientWidth - 16);
                    const availH = Math.max(50, viewport.clientHeight - 16);
                    scale = Math.max(0.08, Math.min(availW / naturalW, availH / naturalH, 1));
                }
                // Il pan è SEMPRE disponibile (non solo quando si supera lo zoom di adattamento):
                // "display:flex" sul viewport + "margin:auto" sul contenuto centra la pagina quando
                // ci sta per intero, e la lascia liberamente scorribile in orizzontale E verticale
                // (mai bloccata su un solo asse) appena non ci sta più — a differenza di
                // "justify-content:center", con "margin:auto" lo scroll arriva sempre fino all'inizio
                // del contenuto anche quando trabocca, niente "angoli tagliati" irraggiungibili.
                viewport.style.display = 'flex';
                viewport.style.overflow = 'auto';
                outer.style.margin = 'auto';
                // flex-shrink:0 è essenziale: senza, essendo "outer" un figlio diretto di un
                // contenitore flex ("viewport"), il motore di layout lo restringerebbe forzatamente
                // per farlo stare nella larghezza visibile invece di lasciarlo davvero più largo del
                // contenitore (che è proprio quello che serve per avere un overflow orizzontale reale
                // da scorrere/trascinare) — l'altezza non ne risente perché nell'asse trasversale di
                // un flex "row" non c'è restringimento forzato, ed è per questo che finora si poteva
                // spostare la visuale solo in verticale e non in orizzontale.
                outer.style.flexShrink = '0';
                wrap.style.transform = `scale(${scale})`;
                outer.style.width = (naturalW * scale) + 'px';
                outer.style.height = (naturalH * scale) + 'px';

                const lbl = document.getElementById('lblTemplateEditorZoom');
                if (lbl) lbl.textContent = Math.round(scale * 100) + '%';
                // Il cursore segue lo zoom da qualunque strada arrivi — rotella, pinch, "Adatta",
                // doppio tocco, ridimensionamento della finestra — altrimenti mostrerebbe un
                // valore e il foglio ne avrebbe un altro. Non mentre lo si sta trascinando: si
                // sovrascriverebbe la posizione sotto il dito.
                const cursoreZoom = document.getElementById('rangeTemplateEditorZoom');
                if (cursoreZoom && document.activeElement !== cursoreZoom) {
                    cursoreZoom.value = Math.max(Number(cursoreZoom.min), Math.min(Number(cursoreZoom.max), Math.round(scale * 100)));
                }
            }
            window.addEventListener('resize', () => {
                if (modalTemplateEditor && modalTemplateEditor.classList.contains('open') && !templateEditorState.manualZoom) adattaScalaEditorCanvas();
            });

            /** Imposta uno zoom manuale esplicito (rotella, pinch a due dita o pulsanti +/-),
             * limitato a un intervallo ragionevole per non perdere di vista la pagina o farla
             * diventare enorme. */
            // ZOOM MINIMO ALZATO da 0.2 a 0.45 (voce di bacheca): sotto il 45% il foglio non è
            // leggibile, e mostrarne tanto senza poterci fare niente non serve — per avere il
            // colpo d'occhio sull'intero template ci sono già le miniature nella striscia in basso.
            // Il vecchio 0.2 restava raggiungibile solo col pinch, quindi era anche una via per
            // finire in uno stato da cui si usciva solo con "Adatta".
            const ZOOM_MIN_EDITOR = 0.45;
            const ZOOM_MAX_EDITOR = 3;
            function impostaZoomEditorTemplate(valore) {
                templateEditorState.manualZoom = Math.max(ZOOM_MIN_EDITOR, Math.min(ZOOM_MAX_EDITOR, valore));
                adattaScalaEditorCanvas();
            }
            /** Zoom che fa entrare la LARGHEZZA del foglio nella finestra (doppio tocco sul
             * foglio). Diverso da "Adatta", che fa entrare anche l'altezza e quindi rimpicciolisce
             * molto di più: quando stai lavorando su un blocco vuoi vedere la pagina larga quanto
             * lo schermo e scorrere in verticale, non vedere tutto minuscolo. */
            function adattaLarghezzaEditorTemplate() {
                const viewport = document.getElementById('templateEditorViewport');
                const foglio = document.getElementById('templateEditorPageFrame');
                if (!viewport || !foglio) return;
                const larghezzaNaturale = foglio.offsetWidth;
                if (!(larghezzaNaturale > 0)) return;
                // 24px di respiro: incollare il foglio ai bordi rende impossibile afferrare la
                // maniglia dei margini, che vive proprio lì.
                impostaZoomEditorTemplate((viewport.clientWidth - 24) / larghezzaNaturale);
            }
            function reimpostaZoomEditorTemplateAutomatico() {
                templateEditorState.manualZoom = null;
                adattaScalaEditorCanvas();
            }

            const rangeTemplateEditorZoom = document.getElementById('rangeTemplateEditorZoom');
            const btnTemplateZoomFit = document.getElementById('btnTemplateZoomFit');
            if (rangeTemplateEditorZoom) {
                // Un solo evento: qui l'anteprima E il commit coincidono, perché cambiare zoom non
                // scrive niente nel modello — è solo il modo in cui stai guardando il foglio.
                rangeTemplateEditorZoom.addEventListener('input', () => {
                    const v = parseInt(rangeTemplateEditorZoom.value, 10);
                    if (!isNaN(v)) impostaZoomEditorTemplate(v / 100);
                });
                // Doppio tocco sul cursore = torna ad "Adatta", come su tutti gli altri slider
                // dell'editor. Stesso gesto, stesso significato ovunque.
                attivaDoppioTapResetSlider(rangeTemplateEditorZoom, 'zoom-canvas', 100);
            }
            if (btnTemplateZoomFit) btnTemplateZoomFit.addEventListener('click', reimpostaZoomEditorTemplateAutomatico);

            // "Anteprima pulita": nasconde le maniglie/pulsanti sui blocchi per vedere solo il
            // contenuto — mentre è attiva non ha senso poter trascinare nuovi blocchi dalla
            // palette (non si vedrebbe comunque dove cadrebbero, essendo la testata nascosta),
            // quindi la palette viene disattivata visivamente insieme all'anteprima. Non più una
            // spunta ma un bottone che cambia colore quando attivo (vedi aggiornaBottoneAnteprimaPulita).
            const btnTemplatePreviewMode = document.getElementById('btnTemplatePreviewMode');
            if (btnTemplatePreviewMode) {
                btnTemplatePreviewMode.addEventListener('click', () => {
                    templateEditorState.previewMode = !templateEditorState.previewMode;
                    // Anteprima pulita = SOLO il contenuto, niente etichette/maniglie residue.
                    templateEditorState.selectedBlockId = null;
                    chiudiMenuBloccoEditor();
                    const paletteEl = document.getElementById('templateEditorPalette');
                    if (paletteEl) {
                        paletteEl.style.opacity = templateEditorState.previewMode ? '0.35' : '';
                        paletteEl.style.pointerEvents = templateEditorState.previewMode ? 'none' : '';
                    }
                    aggiornaBottoneAnteprimaPulita();
                    renderTemplateEditorCanvas();
                });
            }

            /** Stato del bottone "Riquadri" nella barra. È un INTERRUTTORE DI VISTA, non un comando:
             * acceso (premuto) quando maniglie e pulsanti sui blocchi si vedono, spento quando il
             * foglio mostra solo il contenuto, come nel PDF.
             * Prima l'etichetta cambiava parola a ogni clic ("Nascondi riquadri" / "Visualizza
             * riquadri") per dire cosa avrebbe fatto il clic successivo: ma due parole lunghe su un
             * interruttore di vista lo rendevano il tasto più largo della barra dopo Salva, e lo stato
             * attuale si capiva solo per deduzione ("dice Nascondi, quindi adesso si vedono"). Ora la
             * parola resta ferma e lo stato si vede dal colore (e da aria-pressed per chi non lo vede);
             * cosa farà il prossimo clic lo dice il suggerimento. */
            function aggiornaBottoneAnteprimaPulita() {
                const btn = document.getElementById('btnTemplatePreviewMode');
                if (!btn) return;
                const riquadriVisibili = !templateEditorState.previewMode;
                btn.classList.toggle('premuto', riquadriVisibili);
                btn.setAttribute('aria-pressed', String(riquadriVisibili));
                btn.title = riquadriVisibili
                    ? 'Riquadri visibili: maniglie e pulsanti sui blocchi. Premi per nasconderli e vedere solo il contenuto, come apparirà nel PDF'
                    : 'Riquadri nascosti: vedi solo il contenuto, come apparirà nel PDF. Premi per tornare a mostrare maniglie e pulsanti';
            }

            /** Anteprima a schermo intero (richiesta esplicitamente, di fianco al toggle "riquadri"):
             * usa la Fullscreen API nativa del browser sulla modale intera, così l'utente vede il
             * foglio il più grande possibile. Resta COMPLETAMENTE editabile a schermo intero — non
             * forza più l'anteprima pulita né nasconde la palette (richiesto esplicitamente: "vorrei
             * che fosse direttamente editabile anche a schermo intero"): è solo un ingrandimento del
             * canvas, l'utente sceglie separatamente se attivare "Nascondi riquadri" con l'altro
             * bottone, esattamente come fuori dal fullscreen. */
            function aggiornaBottoneFullscreenPreview() {
                const btn = document.getElementById('btnTemplateFullscreenPreview');
                if (!btn) return;
                const attivo = document.fullscreenElement === document.getElementById('modalTemplateEditor');
                const use = btn.querySelector('use');
                if (use) use.setAttribute('href', attivo ? '#i-minimize' : '#i-maximize');
                btn.title = attivo ? 'Esci da schermo intero' : 'Modifica a schermo intero';
            }
            const btnTemplateFullscreenPreview = document.getElementById('btnTemplateFullscreenPreview');
            if (btnTemplateFullscreenPreview) {
                btnTemplateFullscreenPreview.addEventListener('click', async () => {
                    const modal = document.getElementById('modalTemplateEditor');
                    if (!modal) return;
                    try {
                        if (document.fullscreenElement) {
                            if (document.exitFullscreen) await document.exitFullscreen();
                        } else if (modal.requestFullscreen) {
                            await modal.requestFullscreen();
                        }
                    } catch (err) { /* alcuni browser negano la richiesta in certi contesti: si ignora */ }
                });
            }
            document.addEventListener('fullscreenchange', () => {
                const modal = document.getElementById('modalTemplateEditor');
                if (!modal) return;
                const attivo = document.fullscreenElement === modal;
                modal.classList.toggle('tpl-editor-fullscreen', attivo);
                // La finestra di conferma eliminazione (e ogni altro appAlert/appConfirmDelete) è
                // anch'essa un figlio fisso di document.body: stesso identico problema del menu
                // blocco, va agganciata dentro l'elemento fullscreen quando attivo, altrimenti
                // sparisce se la si apre mentre si è a schermo intero (es. eliminando pagine).
                // Stesso identico problema per l'Anteprima di stampa reale (Fase B): apribile
                // anche mentre l'editor è a schermo intero (è lì che serve di più, canvas grande),
                // quindi va agganciata anch'essa dentro l'elemento fullscreen quando attivo.
                const dialogOverlay = document.getElementById('appDialogOverlay');
                const dialog = document.getElementById('appDialog');
                const anteprimaStampaOverlay = document.getElementById('modalAnteprimaStampaRealeOverlay');
                const anteprimaStampaModal = document.getElementById('modalAnteprimaStampaReale');
                const host = attivo ? modal : document.body;
                if (dialogOverlay && dialogOverlay.parentElement !== host) host.appendChild(dialogOverlay);
                if (dialog && dialog.parentElement !== host) host.appendChild(dialog);
                if (anteprimaStampaOverlay && anteprimaStampaOverlay.parentElement !== host) host.appendChild(anteprimaStampaOverlay);
                if (anteprimaStampaModal && anteprimaStampaModal.parentElement !== host) host.appendChild(anteprimaStampaModal);
                aggiornaBottoneFullscreenPreview();
                // Solo il canvas cambia dimensione: si ricalcola lo zoom-adatta-pagina e si
                // riposizionano le maniglie/guide overlay (le loro coordinate dipendono dalla
                // geometria del riquadro, cambiata insieme alla finestra).
                setTimeout(() => {
                    if (typeof reimpostaZoomEditorTemplateAutomatico === 'function') reimpostaZoomEditorTemplateAutomatico();
                    renderTemplateEditorCanvas();
                }, 60);
            });

