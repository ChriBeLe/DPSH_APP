            // ===================== IMPAGINAZIONE REALE DI RIEPILOGO/DETTAGLIATA/ALLEGATO =====================
            // Bug segnalato esplicitamente: nel Report Completo il piè di pagina "Pagina X di Y"
            // compariva subito sotto la tabella invece che in fondo alla vera pagina fisica, e il
            // totale contava 50 pagine quando il PDF reale ne aveva 127. Causa: Riepilogo/Dettagliata/
            // Allegato venivano incollati come un'unica tabella HTML lunga con solo
            // "page-break-before:always" e NESSUN piè di pagina proprio — il motore di stampa nativo
            // del browser la spezzava correttamente su molte pagine fisiche (specialmente l'Allegato,
            // la cui altezza dipende da quanti candidati/autori sono abilitati per categoria — può
            // essere lunghissima), ma il nostro contatore continuava a contarla come 2 pagine fisse,
            // indovinate, non misurate. Qui si sostituisce la stima con una misura VERA, nello stesso
            // foglio di stile di stampa (getReportPrintStyleBlock), dentro un iframe nascosto: ogni
            // mini-tabella di categoria (già una <table> a sé, vedi costruisciTabellaCategoria) è
            // un'unità atomica mai spezzata tra due pagine, esattamente come già succede nel resto
            // dell'app — solo che ora le pagine fisiche risultanti hanno TUTTE il proprio vero piè di
            // pagina in fondo (buildPaginaHeaderFooterHtml, la stessa funzione già usata per le pagine
            // a blocchi, che ha già la posizione position:absolute corretta).

            /** Misura, nel contesto CSS REALE di stampa, l'altezza in mm di ciascun figlio diretto di
             * `contenutoHtml` — usa un iframe nascosto per non essere influenzata dal tema/CSS della
             * finestra principale dell'app (completamente diverso da quello di stampa). Ritorna un
             * array di {html, mm} nello stesso ordine dei figli. */
            function misuraFigliPerStampaMm(contenutoHtml, margins, rigaScale, fontScale, stileTesto) {
                return new Promise((resolve) => {
                    const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                    // LO STESSO CARATTERE E LA STESSA INTERLINEA DEL FOGLIO VERO. Se qui si
                    // misurasse con un font diverso, le parole andrebbero a capo in punti diversi
                    // e ogni altezza uscirebbe sbagliata — la radice di tutti gli sfasamenti di
                    // questa famiglia, come spiega il commento qui sopra sulla larghezza.
                    const stileTestoMisura = stileTesto
                        || (typeof templateEditorState !== 'undefined' && templateEditorState.stileTesto)
                        || stileTestoDiDefault();
                    const iframe = document.createElement('iframe');
                    iframe.style.cssText = 'position:absolute; left:-9999px; top:0; width:210mm; height:10px; border:0; visibility:hidden;';
                    document.body.appendChild(iframe);
                    const doc = iframe.contentDocument;
                    doc.open();
                    // --tpl-riga-scale/--tpl-font-scale sul CONTENITORE (non su un div in più intorno
                    // al contenuto): restano variabili CSS che i figli ereditano, così ogni figlio di
                    // #misuraWrap resta un elemento diretto (un <table data-categoria-index> = un
                    // atomo) — nessuna struttura alterata, vedi il commento sotto su Array.from(wrap.
                    // children). Bug segnalato esplicitamente ("l'altezza delle righe non è
                    // rispettata"): senza questi due parametri (opzionali, di default 1 = nessun
                    // cambiamento per i chiamanti che non li passano) la misura veniva sempre presa
                    // alla scala 100% anche quando il blocco aveva "Altezza righe"/"Dimensione testo"
                    // diversi, disallineando la misura dalla resa finale vera.
                    const scalaStyle = (rigaScale != null || fontScale != null) ? ` --tpl-riga-scale:${rigaScale || 1}; --tpl-font-scale:${fontScale || 1};` : '';
                    // GEOMETRIA DI MISURA ESPLICITA (prima: class="a4-page" con min-height:0, cioè
                    // la larghezza utile arrivava indirettamente dal padding di .a4-page). Ora è
                    // scritta qui in chiaro e deve coincidere ESATTAMENTE con .dpsh-sheet-inner del
                    // foglio finale: foglio largo 210mm meno i margini destro/sinistro. È la
                    // condizione perché "quanto è alto questo blocco" misurato qui valga davvero
                    // anche in stampa — se le due larghezze divergessero, il testo andrebbe a capo
                    // in modo diverso e ogni altezza misurata sarebbe sbagliata in partenza (la
                    // radice di tutti gli sfasamenti di questa famiglia). Nessun padding verticale:
                    // qui si misurano solo le altezze dei figli, non si impagina.
                    doc.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><style>${getReportPrintStyleBlock(mrg, stileTestoMisura)}</style></head><body style="margin:0;"><div id="misuraWrap" style="box-sizing:border-box; width:210mm; padding:0 ${mrg.right}mm 0 ${mrg.left}mm; background:#fff;${scalaStyle}">${contenutoHtml}</div></body></html>`);
                    doc.close();
                    // Nessuna immagine/font esterno in queste tabelle (solo testo con Arial/system-ui,
                    // già disponibile): due giri di rAF bastano a garantire un layout stabile, senza
                    // bisogno di aspettare un evento 'load' che qui non arriverebbe comunque prima.
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            const wrap = doc.getElementById('misuraWrap');
                            const pxPerMm = 96 / 25.4; // conversione CSS fissa (spec), non dipende dal DPI reale dello schermo
                            // categoriaIndex (bug segnalato esplicitamente: interruzioni manuali che
                            // creavano pagine bianche a caso, "da 29 pagine diventano 98"): letto qui
                            // dall'attributo data-categoria-index REALE della tabella (la stessa
                            // identica fonte che l'editor usa per blockObj.categorieForzaPaginaPrima,
                            // vedi il commento lì) — NON più dedotto dalla posizione dell'elemento
                            // nell'array, che è un numero completamente diverso (conta ANCHE titoli/
                            // spaziatori non numerati, quindi scorre rispetto agli indici di categoria
                            // veri) e faceva scattare interruzioni forzate su categorie sbagliate,
                            // qualche volta più di una consecutiva → pagine quasi vuote.
                            const risultato = wrap ? Array.from(wrap.children).map(el => ({
                                html: el.outerHTML,
                                mm: el.getBoundingClientRect().height / pxPerMm,
                                glue: el.classList.contains('chunk-titolo-glue'),
                                categoriaIndex: el.hasAttribute('data-categoria-index') ? parseInt(el.getAttribute('data-categoria-index'), 10) : null
                            })) : [];
                            document.body.removeChild(iframe);
                            resolve(risultato);
                        });
                    });
                });
            }

            /** Incolla ogni elemento "chunk-titolo-glue" (i titoli di sezione) al blocco che lo segue
             * subito dopo, così un titolo non resta mai da solo in fondo a una pagina con la sua
             * tabella rimandata a quella successiva. */
            function fondiTitoliConSuccessivo(elementi) {
                const risultato = [];
                for (let i = 0; i < elementi.length; i++) {
                    const cur = elementi[i];
                    if (cur.glue && i + 1 < elementi.length) {
                        const next = elementi[i + 1];
                        // categoriaIndex del blocco fuso = quello dell'elemento successivo (il
                        // titolo che si incolla non ha mai un suo data-categoria-index): così
                        // l'interruzione manuale continua a puntare alla categoria vera anche dopo
                        // la fusione.
                        risultato.push({ html: cur.html + next.html, mm: cur.mm + next.mm, categoriaIndex: next.categoriaIndex });
                        i++;
                    } else {
                        risultato.push({ html: cur.html, mm: cur.mm, categoriaIndex: cur.categoriaIndex });
                    }
                }
                return risultato;
            }

            /** Impagina una sequenza di atomi (già misurati) su più pagine fisiche A4, senza mai
             * spezzarne uno a metà. Due regole DIVERSE a seconda del tipo di atomo (griglia fissa,
             * richiesto esplicitamente dopo l'ennesimo bug della stessa famiglia — "35 pagine
             * diventano 91" nonostante correzioni mirate ripetute, l'ultima delle quali era proprio
             * quella descritta sotto):
             * — Atomo NORMALE (categoriaIndex null: riga, gruppo rowSpan, titolo...): packing
             *   goloso per altezza come sempre, entra nella pagina corrente se ci sta, altrimenti
             *   apre una pagina nuova.
             * — Atomo di CATEGORIA di una tabella flowable (categoriaIndex non null): MAI spostato
             *   per altezza, SOLO per interruzione manuale dichiarata dall'utente (indiciForzati,
             *   veri indici di CATEGORIA — data-categoria-index, gli stessi che l'editor scrive in
             *   blockObj.categorieForzaPaginaPrima). Ogni tentativo precedente di dedurre
             *   automaticamente il taglio da un'altezza misurata (qui o nell'editor) si è rotto su
             *   dati reali più di una volta ("29→98", poi di nuovo "35→91") — la scelta ora è non
             *   fidarsi mai più di quella misura per QUESTO tipo di contenuto: il numero di righe
             *   per categoria è comunque fisso (vedi buildAllegatoHtml/htmlTabellaDettagliata), è
             *   solo l'altezza resa a schermo che varia (zoom, colonne) e quindi non va più usata
             *   per decidere pagine. */
            function impaginaBlocchiSuPagineFisiche(elementi, maxAltezzaPaginaMm, indiciForzati) {
                const forzati = indiciForzati instanceof Set ? indiciForzati : new Set(Array.isArray(indiciForzati) ? indiciForzati : []);
                const pagine = [];
                let paginaCorrente = [];
                let altezzaCorrente = 0;
                // Traccia l'ID del blocco flowable dell'ultimo atomo piazzato (NON solo "era una
                // categoria", vedi bug seguente): serve a restringere l'isolamento per sforamento
                // (sotto) al solo PUNTO D'INGRESSO in un blocco flowable, mai tra due categorie
                // consecutive dello STESSO blocco — ma un vero cambio di TABELLA (blockId diverso,
                // es. da Tabella Dettagliata ad Allegato formule) deve sempre contare come un
                // ingresso nuovo, anche se entrambi gli atomi hanno categoriaIndex non nullo: due
                // blocchi diversi riusano la stessa numerazione di categoria (0,1,2...), quindi
                // "era una categoria" da solo non basta a distinguere "stessa tabella" da "tabella
                // diversa" — bug segnalato con screenshot ("tra Tabella Dettagliata e Allegato
                // formule si crea ancora una pagina bianca"): la fine dell'una si accodava all'inizio
                // dell'altra senza mai controllare se ci stessero insieme.
                let ultimoBlockId = null;
                elementi.forEach(({ html, mm, categoriaIndex, blockId }) => {
                    // GRIGLIA FISSA (richiesto esplicitamente dopo l'ennesimo bug della stessa
                    // famiglia — "35 pagine diventano 91"): un atomo di CATEGORIA (categoriaIndex
                    // non null, cioè un pezzo di tabella flowable — vedi costruisciAtomiPaginaTemplate)
                    // non viene MAI spezzato a metà per altezza — resta un unico blocco indivisibile,
                    // sempre. TRA una categoria e la successiva DELLO STESSO BLOCCO la decisione di
                    // dove tagliare resta SOLO dell'utente (categorieForzaPaginaPrima/indiciForzati,
                    // lo stesso "+" del menu del blocco) — MAI più dedotta dall'altezza (richiesto
                    // esplicitamente dopo un tentativo troppo aggressivo: isolare OGNI categoria che
                    // non entrava con la precedente, anche dello stesso blocco, produceva una pagina
                    // quasi vuota per ognuna — "poco contenuto in alto, tanto vuoto sotto", ripetuto —
                    // lo stesso identico sintomo dei bug storici di questa famiglia). Se una serie di
                    // categorie non entra tutta insieme, trabocca naturalmente come sempre: l'utente
                    // resta l'unico a decidere dove tagliarla per davvero.
                    //
                    // Resta invece l'isolamento SOLO al punto d'ingresso (bug segnalato con
                    // screenshot: pagine bianche dopo la prima tabella — causa verificata: la PRIMA
                    // categoria di un blocco flowable restava accodata a QUALUNQUE contenuto NON
                    // correlato già presente sulla stessa pagina logica, es. un Titolo appena sopra —
                    // se insieme sforavano, quel div-pagina veniva ripaginato in silenzio dalla stampa
                    // nativa del browser, introducendo pagine fisiche impreviste dal resto del
                    // motore). Se la pagina corrente è vuota, o se l'atomo precedente apparteneva
                    // allo STESSO blocco flowable (stesso blockId — non basta "era una categoria",
                    // due tabelle diverse riusano la stessa numerazione), non c'è nulla da isolare:
                    // si applica SOLO la regola del blocco sopra.
                    if (categoriaIndex != null) {
                        // Chiave delle interruzioni manuali scoperta per blocco (bloccoId:indice,
                        // vedi costruisciAtomiPaginaTemplate) — mai più un indice nudo, che due
                        // blocchi diversi potrebbero condividere per puro caso di numerazione.
                        const chiaveForzata = blockId != null ? `${blockId}:${categoriaIndex}` : categoriaIndex;
                        // Interruzione MANUALE (il "+" del menu del blocco): unica cosa che può
                        // aprire una pagina nuova tra due categorie dello stesso blocco.
                        const forzaNuovaPagina = forzati.has(chiaveForzata) && paginaCorrente.length > 0;
                        // Cambio di TABELLA vero (blockId diverso dall'ultimo atomo piazzato, non
                        // solo "era una categoria qualsiasi") conta sempre come punto d'ingresso.
                        const puntoIngresso = paginaCorrente.length > 0 && blockId !== ultimoBlockId;
                        const nonCiStaAllIngresso = puntoIngresso && (altezzaCorrente + mm > maxAltezzaPaginaMm);
                        if (forzaNuovaPagina || nonCiStaAllIngresso) {
                            pagine.push(paginaCorrente.join(''));
                            paginaCorrente = [];
                            altezzaCorrente = 0;
                        }
                        paginaCorrente.push(html);
                        altezzaCorrente += mm;
                        ultimoBlockId = blockId;
                        return;
                    }
                    // Atomo normale (riga, gruppo rowSpan, titolo...): impaginazione per altezza.
                    // Il vecchio scavalcamento "bypassaMargini" è stato RIMOSSO (vedi il commento in
                    // costruisciHtmlBloccoEditor): con i fogli rigidi non faceva più traboccare
                    // niente, faceva solo tagliare il contenuto in silenzio.
                    if (paginaCorrente.length > 0 && altezzaCorrente + mm > maxAltezzaPaginaMm) {
                        pagine.push(paginaCorrente.join(''));
                        paginaCorrente = [];
                        altezzaCorrente = 0;
                    }
                    paginaCorrente.push(html);
                    altezzaCorrente += mm;
                    ultimoBlockId = null;
                });
                if (paginaCorrente.length > 0) pagine.push(paginaCorrente.join(''));
                return pagine;
            }

            // buildPaginaGenericaConFooterHtml, costruisciPagineParametriAvanzati,
            // costruisciPagineFlowableBloccoTemplateHtml e misuraAltezzaTotaleMm RIMOSSE (Fase 3
            // della riscrittura del motore di impaginazione): le prime due servivano solo alla
            // sezione automatica Riepilogo/Dettagliata/Allegato di buildCompleteReportHtml, già
            // tolta dall'export; le altre due gestivano il caso "blocco flowable dentro una pagina
            // del template" come ramo a parte, ora assorbito nel motore unico qui sotto
            // (costruisciAtomiPaginaTemplate/costruisciPagineTemplateUnificato, che tratta un
            // blocco flowable come una sequenza di atomi invece che come funzione dedicata).
            // Nessun chiamante rimasto per nessuna delle quattro.

