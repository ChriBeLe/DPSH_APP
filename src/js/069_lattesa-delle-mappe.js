                    // ================= L'ATTESA DELLE MAPPE =================
                    // Segnalato: nel PDF le mappe uscivano vuote. La causa e' che 'load' non e'
                    // una garanzia sufficiente: le tessere sono decine di immagini remote,
                    // caricate in parallelo, e su una rete lenta o dentro la WebView di Android
                    // la finestra di stampa si apriva con i riquadri ancora grigi. Peggio: un
                    // documento firmato con una figura vuota non ha nessun segnale che avvisi —
                    // te ne accorgi dal PDF gia' consegnato.
                    //
                    // Quindi non si aspetta un evento: si CONTANO le tessere e si guarda una per
                    // una se sono arrivate davvero. 'complete' da solo non basta, perche' e' true
                    // anche per un'immagine fallita: serve naturalWidth > 0, che e' l'unico modo
                    // di distinguere "scaricata" da "andata in errore".
                    function tessereMappa(){
                        return Array.prototype.slice.call(
                            document.querySelectorAll('[data-mappa-inquadramento] img, [data-inset-regionale] img'));
                    }
                    function arrivata(img){ return img.complete && img.naturalWidth > 0; }
                    function fallita(img){ return img.complete && img.naturalWidth === 0; }

                    var velo = null;
                    function mostraVelo(){
                        if (IN_CORNICE) return;   // qui dentro nessuno lo vedrebbe
                        if (velo) return;
                        velo = document.createElement('div');
                        velo.className = 'no-print';
                        velo.style.cssText = 'position:fixed; inset:0; z-index:99999; background:rgba(15,23,42,0.93); color:#fff; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:14px; font-family:system-ui,-apple-system,sans-serif;';
                        velo.innerHTML = '<div style="font-size:16px; font-weight:800;">Scarico le mappe…</div>'
                            + '<div style="width:min(300px,70vw); height:8px; background:rgba(255,255,255,0.2); border-radius:99px; overflow:hidden;"><div id="dpshBarraMappe" style="height:100%; width:0%; background:#f59e0b; transition:width .2s linear;"></div></div>'
                            + '<div id="dpshStatoMappe" style="font-size:12.5px; opacity:.85;"></div>'
                            + '<div style="font-size:11px; opacity:.6; max-width:min(420px,80vw); text-align:center; line-height:1.5;">La stampa parte solo quando i riquadri sono pieni: un PDF con le mappe vuote non si puo\\' correggere dopo.</div>';
                        document.body.appendChild(velo);
                    }
                    function togliVelo(){ if (velo && velo.parentNode) velo.parentNode.removeChild(velo); velo = null; }
                    function aggiornaVelo(fatte, totali){
                        if (riferisciAlPadre('Avanzamento', { fatte: fatte, totali: totali })) return;
                        var barra = document.getElementById('dpshBarraMappe');
                        var testo = document.getElementById('dpshStatoMappe');
                        if (barra) barra.style.width = Math.round(fatte / Math.max(1, totali) * 100) + '%';
                        if (testo) testo.textContent = fatte + ' di ' + totali + ' riquadri';
                    }

                    // Tetto d'attesa: 45 secondi. Non e' un numero magico, e' il punto oltre il
                    // quale aspettare ancora non aiuta — se una tessera non e' arrivata in 45s,
                    // o la rete non c'e' o il servizio non risponde, e in entrambi i casi la
                    // decisione (stampare comunque o no) spetta a chi firma il documento.
                    // Tetto d'attesa: 20 secondi. La prima stesura ne metteva 45 e, soprattutto,
                    // chiedeva conferma con window.confirm(). Ed e' li' che si e' rotto tutto —
                    // SEGNALATO: "quando esporto il pdf non compare piu' la finestra per salvare
                    // il documento". Il documento da stampare vive in un window.open(), e in quel
                    // contesto (la WebView di Android in particolare) confirm() puo' tornare false
                    // SENZA mostrare niente: scattava da solo il ramo "l'utente ha detto no" e la
                    // stampa non partiva mai. Un dialogo di sistema non e' un posto sicuro dove
                    // mettere la decisione da cui dipende l'unica cosa che l'utente voleva fare.
                    //
                    // Ora la scelta sta dentro la pagina, su pulsanti veri. In piu' un clic e' un
                    // gesto dell'utente, e print() dentro un gesto e' molto piu' affidabile di
                    // print() chiamato da un timer.
                    var LIMITE_MS = 20000;
                    function mostraEsito(mancanti, totali, procedi){
                        mostraVelo();
                        velo.innerHTML = '';
                        var box = document.createElement('div');
                        box.style.cssText = 'max-width:min(460px,86vw); text-align:center; display:flex; flex-direction:column; gap:14px; align-items:center;';
                        var titolo = document.createElement('div');
                        titolo.style.cssText = 'font-size:16px; font-weight:800; color:#fbbf24;';
                        titolo.textContent = mancanti + ' riquadr' + (mancanti === 1 ? 'o' : 'i') + ' di mappa su ' + totali + ' non si e caricato';
                        var testo = document.createElement('div');
                        testo.style.cssText = 'font-size:12.5px; line-height:1.6; opacity:.9;';
                        testo.textContent = 'Nel PDF quella parte resterebbe vuota o incompleta. Se sei senza rete, o il servizio cartografico non risponde, conviene riprovare piu tardi.';
                        var riga = document.createElement('div');
                        riga.style.cssText = 'display:flex; gap:10px; flex-wrap:wrap; justify-content:center;';
                        var bStampa = document.createElement('button');
                        bStampa.textContent = 'Stampa comunque';
                        bStampa.style.cssText = 'background:#f59e0b; color:#0f172a; border:none; padding:11px 20px; font-weight:800; font-size:14px; border-radius:8px; cursor:pointer;';
                        bStampa.onclick = function(){ togliVelo(); procedi(); };
                        var bRiprova = document.createElement('button');
                        bRiprova.textContent = 'Riprova a caricarle';
                        bRiprova.style.cssText = 'background:transparent; color:#fff; border:1.5px solid rgba(255,255,255,0.5); padding:11px 20px; font-weight:700; font-size:14px; border-radius:8px; cursor:pointer;';
                        bRiprova.onclick = function(){ togliVelo(); ricarica(); };
                        riga.appendChild(bStampa); riga.appendChild(bRiprova);
                        box.appendChild(titolo); box.appendChild(testo); box.appendChild(riga);
                        velo.appendChild(box);
                    }
                    // Riprovare significa rimettere in coda le sole immagini fallite: riassegnare
                    // il src a se stesso fa rifare la richiesta al browser.
                    function ricarica(){
                        tessereMappa().forEach(function(img){
                            if (fallita(img) || !img.complete) { var u = img.src; img.src = ''; img.src = u; }
                        });
                        avvia();
                    }
                    function aspettaMappe(poi){
                        var tessere = tessereMappa();
                        if (tessere.length === 0) { poi(0, 0); return; }
                        mostraVelo();
                        var inizio = Date.now();
                        (function controlla(){
                            var t = tessereMappa();
                            var arrivate = 0, fallite = 0;
                            for (var i = 0; i < t.length; i++) {
                                if (arrivata(t[i])) arrivate++;
                                else if (fallita(t[i])) fallite++;
                            }
                            aggiornaVelo(arrivate + fallite, t.length);
                            if (arrivate + fallite >= t.length) { togliVelo(); poi(fallite, t.length); return; }
                            if (Date.now() - inizio > LIMITE_MS) {
                                togliVelo();
                                poi(t.length - arrivate, t.length);
                                return;
                            }
                            setTimeout(controlla, 220);
                        })();
                    }

                    function avvia(){
                        aspettaMappe(function(mancanti, totali){
                            // DENTRO LA CORNICE non si decide: si riferisce. Il controllo di
                            // sforamento si esegue qui (le pagine stanno qui) ma il suo esito
                            // viaggia al padre, che ha uno schermo su cui mostrarlo — prima
                            // finiva in un banner .no-print dentro un iframe invisibile.
                            if (IN_CORNICE) {
                                var ecc = [];
                                try { ecc = eseguiControlloImpaginazioneStampa() || []; } catch(e) {}
                                riferisciAlPadre('Pronta', { mancanti: mancanti, totali: totali, eccedenti: ecc });
                                return;
                            }
                            if (mancanti > 0) { mostraEsito(mancanti, totali, eseguiPassaggioFinale); return; }
                            eseguiPassaggioFinale();
                        });
                    }
                    // Il padre deve poter dire "riprova a scaricarle" da un pulsante che l'utente
                    // vede davvero: il pulsante sta di là, le immagini stanno di qua.
                    try { window.__dpshRicaricaMappe = ricarica; } catch(e) {}
                    if (document.readyState === 'complete') { avvia(); }
                    else { window.addEventListener('load', avvia); }
                })();
                <\/script>`;
            }

            /** Pagina indice automatica del Report Completo multi-prova (richiesta esplicitamente):
             * una riga per prova con la pagina in cui inizia, stile classico "sommario" con puntini
             * guida. La pagina è sempre la 1 del documento (l'indice stesso), quindi la prima riga
             * comincia sempre da pagina 2 — vedi buildCompleteReportHtml per il calcolo delle
             * pagine di partenza, che riusa lo stesso conteggio già mostrato nel piè di pagina
             * "Pagina X di Y" di ciascuna prova (nessuna nuova assunzione, stessa fonte di verità).
             * Limite noto: se una tabella molto lunga si spezza su più pagine fisiche per
             * l'impaginazione naturale del browser in stampa (classe "tbl-long"), quel conteggio non
             * lo sa in anticipo — caso raro, non gestito qui. */
            function buildIndiceReportCompletoHtml(proj, righeIndice, stileIndice) {
                // Righe cliccabili (richiesto esplicitamente: "l'indice dev'essere cliccabile nel
                // pdf") — ogni riga è un vero <a href="#prova-report-{id}"> che punta all'ancora
                // messa a inizio prova da buildSurveyReportHtml; text-decoration/color azzerati per
                // restare visivamente identica a prima (un link, ma senza sembrarlo). r.id è
                // richiesto — i chiamanti (vedi buildCompleteReportHtml) devono passarlo insieme a
                // numero/pagina. QUESTO NON CAMBIA IN NESSUNA VESTE: cliccabile e numero di pagina
                // non sono alternative, coesistono sempre — richiesto esplicitamente («naturalmente,
                // come un normalissimo documento», dopo che una sessione precedente aveva tolto il
                // numero perché in conflitto SOLO con l'elenco delle prove, non come rifiuto generale).
                // Il Word ne fa un Sommario vero (071i): per questo ogni riga dice la sua voce e il suo
                // livello, il foglio il divisore, e testo e pagina sono segnati.
                // GERARCHIA. Il livello (1/2/3) viene dai blocchi Titolo del documento finito, non da
                // un elenco scritto a parte: cosi' l'indice descrive il documento che esiste davvero,
                // e non quello che qualcuno ha dichiarato.
                const st = Object.assign(stileIndiceDiDefault(), stileIndice || {});
                const LIVELLI_KEY = ['h1', 'h2', 'h3'];
                const numeriGerarchici = st.gutter ? numeriGerarchiciDiRighe(righeIndice) : null;
                const righe = righeIndice.map((r, i) => {
                    const liv = Math.max(1, Math.min(3, parseInt(r.livello, 10) || 1));
                    const isH1 = liv === 1;
                    const cfgLiv = st.livelli[LIVELLI_KEY[liv - 1]];
                    const varLiv = `--idx-${LIVELLI_KEY[liv - 1]}`;
                    // DIVISORE: tre rami letterali, non un'astrazione generica — sono davvero solo
                    // tre modi diversi di chiudere la riga, non varianti di uno stesso comando.
                    // DIVISORE: rami letterali, non un'astrazione generica — sono davvero modi
                    // diversi di chiudere la riga, non varianti di uno stesso comando.
                    let divisoreHtml, rigaBordo = '', stilePagina = '';
                    if (st.divisore === 'punti') {
                        divisoreHtml = `<span style="flex:1; min-width:20px; border-bottom:1px dotted var(--idx-colore-divisore); margin:0 2px 3px;"></span>`;
                    } else if (st.divisore === 'puntiRadi') {
                        // Passo doppio rispetto a "punti": il "dotted" del bordo non è regolabile,
                        // quindi i puntini radi si disegnano come sfondo ripetuto ogni 7px.
                        divisoreHtml = `<span style="flex:1; min-width:20px; height:3px; margin:0 2px 3px; background-image:radial-gradient(circle at 1px 50%, var(--idx-colore-divisore) 1px, transparent 1.2px); background-size:7px 100%; background-repeat:repeat-x;"></span>`;
                    } else if (st.divisore === 'trattini') {
                        divisoreHtml = `<span style="flex:1; min-width:20px; border-bottom:1px dashed var(--idx-colore-divisore); margin:0 2px 3px;"></span>`;
                    } else if (st.divisore === 'linea') {
                        divisoreHtml = `<span style="flex:1;"></span>`;
                        if (isH1) rigaBordo = 'border-bottom:1px solid var(--idx-colore-divisore);';
                    } else if (st.divisore === 'lineaTutti') {
                        divisoreHtml = `<span style="flex:1;"></span>`;
                        rigaBordo = 'border-bottom:1px solid var(--idx-colore-divisore);';
                    } else if (st.divisore === 'colonna') {
                        // Nessuna guida: i numeri si allineano fra loro in una colonna a destra
                        // invece di restare appesi alla fine di ogni riga.
                        divisoreHtml = `<span style="flex:1;"></span>`;
                        stilePagina = ' display:inline-block; min-width:12mm; text-align:right;';
                    } else {
                        divisoreHtml = `<span style="flex:1;"></span>`;
                    }
                    // NUMERAZIONE, UNA SOLA. Il numero già scritto nel titolo viene staccato sempre:
                    // acceso l'interruttore si mostra quello calcolato dalla gerarchia (mai due
                    // numeri in fila), spento non ne resta nessuno. Formattazione tutta sua
                    // (--idx-numero-pt/-peso), mai quella del livello della voce accanto.
                    const parti = separaNumeroDaEtichetta(r.etichetta || ('Prova N° ' + r.numero));
                    const gutterHtml = st.gutter
                        ? `<span style="display:inline-block; min-width:30px; flex-shrink:0; font-variant-numeric:tabular-nums; font-size:var(--idx-numero-pt); font-weight:var(--idx-numero-peso); color:var(--idx-colore-testo);">${numeriGerarchici[i]}</span>`
                        : '';
                    return `
                    <a href="#prova-report-${r.id}" data-voce-indice="${i}" data-livello="${liv}" style="display:flex; align-items:baseline; gap:6px; padding:${isH1 ? '8px' : '5px'} 2px; ${rigaBordo} margin-left:${st.gutter ? '0' : cfgLiv.rientroMm + 'mm'}; text-decoration:none; color:inherit; font-family:var(--idx-font);">
                        ${gutterHtml}
                        <span data-testo-voce style="font-size:var(${varLiv}-pt); font-weight:var(${varLiv}-peso); ${cfgLiv.corsivo ? 'font-style:italic;' : ''} color:var(--idx-colore-testo); white-space:nowrap;">${parti.testo}</span>
                        ${divisoreHtml}
                        ${st.mostraPagina && r.pagina ? `<span data-pagina-voce style="font-size:var(--idx-pagina-pt); font-weight:var(--idx-pagina-peso); color:var(--idx-colore-testo); white-space:nowrap; font-variant-numeric:tabular-nums;${stilePagina}">${r.pagina}</span>` : ''}
                    </a>`;
                }).join('');
                // data-tpl-report-page: anche l'indice è una pagina fisica vera come le altre, deve
                // entrare nel conteggio totale di eseguiNumerazionePagineFinale — senza, il totale
                // "di Y" sarebbe sottostimato di 1 su tutto il documento. Nessun piè di pagina/numero
                // proprio (mai ne ha avuto uno, invariato), quindi nessun data-tpl-page-number-slot qui.
                // Fase A del piano di unificazione: prima aveva 14/14 scritti a mano invece di
                // leggere i margini veri del template (calcolaBudgetPaginaMm/marginiPaginaDiDefault)
                // — innocuo finché i margini restavano quelli di default, ma una bomba a orologeria
                // per il giorno in cui l'utente li avesse cambiati dalla barra laterale.
                const maxHeightMmIndice = calcolaBudgetPaginaMm(null, false).areaStampabileMm.toFixed(2);
                // FOGLIO RIGIDO: anche l'indice è un foglio fisico come tutti gli altri, quindi usa
                // esattamente la stessa struttura .dpsh-sheet/.dpsh-sheet-inner — se restasse un
                // blocco a flusso libero sarebbe l'unico punto del documento ancora in grado di
                // traboccare e far slittare tutte le pagine successive (indice lungo, molte prove).
                return `
                    <div class="dpsh-sheet" data-tpl-report-page="1" data-tpl-max-height-mm="${maxHeightMmIndice}" data-tpl-page-label="Indice" data-sommario="${st.divisore || ''}" style="font-family: var(--idx-font, Arial, sans-serif); ${cssVariabiliStileIndice(st)}"><div class="dpsh-sheet-inner">
                        <h1 style="font-size:var(--idx-titolo-pt); font-weight:var(--idx-titolo-peso); color:var(--idx-colore-testo); margin:0 0 16px; font-family:var(--idx-font);">${(st.titoloTesto || 'Indice')}</h1>
                        ${righe}
                    </div></div>`;
            }

            /** Costruisce l'HTML di UNA O PIÙ prove nel formato "standard" (scheda di campo, senza
             * le tabelle Parametri Avanzati — quelle sono il Report Completo, vedi
             * buildCompleteReportHtml) con indice cliccabile opzionale davanti — funzione condivisa
             * dalla nuova schermata di esportazione PDF (vedi avviaGenerazioneEsportazionePdf) sia
             * per l'export di una singola prova sia per un sottoinsieme scelto dall'utente delle
             * prove di un progetto: prima era duplicata (quasi identica) tra generatePrintableReport
             * ed exportProjectPDF. onProgress(i, totale), se passato, è chiamato dopo ogni prova
             * costruita — usato per la barra di avanzamento. */
            async function buildSelezioneReportHtml(survList, proj, opzioni, onProgress) {
                const includiIndice = !!(opzioni && opzioni.includiIndice) && survList.length > 1;
                // Precalcolo delle pagine di OGNI prova PRIMA di costruire l'HTML RIMOSSO (Fase 3
                // della riscrittura): serviva solo a passare paginaGlobaleIniziale/
                // totalPagineDocumento a buildSurveyReportHtml per il "Pagina X di Y" a piè di
                // pagina — la numerazione è stata tolta del tutto da tempo (richiesto
                // esplicitamente), quei due parametri erano già vestigiali/mai letti, quindi questo
                // precalcolo (basato su stimaPagineProva, una STIMA non reale) era lavoro sprecato
                // ad ogni export.
                const sezioni = [];
                for (let i = 0; i < survList.length; i++) {
                    const result = await buildSurveyReportHtml(survList[i], proj, i < survList.length - 1);
                    sezioni.push({ numero: (survList[i].header && survList[i].header.provaNr) || (i + 1), id: survList[i].id, html: result.html, pageCount: result.pageCount });
                    if (typeof onProgress === 'function') onProgress(i + 1, survList.length);
                }
                let paginaCorrente = includiIndice ? 2 : 1;
                const righeIndice = sezioni.map(s => {
                    const riga = { numero: s.numero, id: s.id, pagina: paginaCorrente };
                    paginaCorrente += s.pageCount;
                    return riga;
                });
                const indiceHtml = includiIndice ? buildIndiceReportCompletoHtml(proj || { name: 'Prove selezionate' }, righeIndice, stileIndiceDelProgetto(proj)) : '';
                const totalPageCount = (includiIndice ? 1 : 0) + sezioni.reduce((sum, s) => sum + s.pageCount, 0);
                return { pagesHtml: indiceHtml + sezioni.map(s => s.html).join(''), totalPageCount };
            }

