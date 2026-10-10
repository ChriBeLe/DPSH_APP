            // ============ UN SOLO BLOCCO DI TESTO: I TITOLI LI DICHIARA IL CONTENUTO ============
            //
            // Segnalato: "se inserisco un titolo nel blocco di testo, questo titolo verra' si'
            // mostrato come un titolo ma non avra' lo stesso valore del blocco titolo".
            // Esatto, ed era un difetto strutturale: il marcatore che l'indice cerca stava sul
            // CONTENITORE del blocco (data-titolo-indice sul <div> del blocco 'titolo'), non sul
            // contenuto. Quindi un <h2> scritto dentro un blocco di testo si vedeva come un
            // titolo ma per l'indice non esisteva: il documento mostrava una gerarchia che
            // l'indice non conosceva. Non e' un dettaglio estetico, e' un documento che dice due
            // cose diverse su se stesso.
            //
            // La correzione non e' unire due blocchi: e' spostare la dichiarazione dal TIPO DI
            // BLOCCO al CONTENUTO. E' lo stesso schema gia' applicato tre volte in questo
            // progetto — indice, numerazione delle figure, numeri di pagina — che si risolve
            // sempre sul documento finito invece che su una dichiarazione fatta a parte.
            // L'unificazione dei blocchi ne e' la conseguenza, non la causa.
            /** I TAG SI CUCINANO SOLO QUI, nel documento che si stampa. Nell'app restano
             * riferimenti vivi; nel PDF diventano testo, perche' un PDF e' un documento morto
             * e un riferimento a un dato che potrebbe cambiare non avrebbe senso.
             * Il valore si legge dal cantiere della prova che si sta stampando, non da quello
             * scelto nell'anteprima: sono due cose diverse, e confonderle vorrebbe dire
             * stampare i dati del progetto sbagliato. */
            function risolviTagInStampa(html, ctx, blockObj) {
                if (!html || html.indexOf('data-tag=') === -1) return html || '';
                try {
                    // IL PROGETTO SI RICAVA DAL CONTESTO DELLA STAMPA. Avevo scritto ctx.proj:
                    // non esiste, il contesto porta ctx.projId. Sarebbe stato un guasto muto —
                    // valoriCantiere(undefined) risponde senza errori, e OGNI tag sarebbe uscito
                    // come «mancante» fra parentesi quadre in una relazione firmata.
                    const proj = (ctx && ctx.projId && state.projects) ? state.projects[ctx.projId] : null;
                    // Più i valori della prova di questo pezzo di documento (nome, numero): nel
                    // Report Completo ogni prova ha i suoi.
                    const valori = Object.assign(valoriCantiere(proj), valoriDellaProva(ctx && ctx.provaNr));
                    const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
                    doc.getElementById('r').querySelectorAll('span[data-tag]').forEach((el, iTag) => {
                        // IL NUMERO D'ORDINE DEL TAG dentro questo blocco. E' cio' che permette
                        // di tornare dalla pastiglia toccata sul foglio al pezzo di documento che
                        // l'ha prodotta, senza doverla riconoscere dal testo (che cambia) o dal
                        // tipo (che si ripete).
                        el.setAttribute('data-tag-i', String(iTag));
                        const tipo = el.getAttribute('data-tag');
                        // IL RIFERIMENTO ALLA FIGURA PASSA DI QUI SENZA ESSERE RISOLTO, e ci
                        // passa apposta: e' un tag come gli altri (cosi' l'editor non lo
                        // cancella piu'), ma il suo numero lo sa solo il documento finito.
                        // Qui si ricostruisce il marcatore che la passata finale cerca —
                        // l'attributo non sopravvive al motore, il tipo del nodo si'.
                        if (TAG_RISOLTI_A_DOCUMENTO[tipo] || eRiferimentoFigura(tipo)) {
                            // Il bersaglio viaggia nel marcatore: e' l'unica cosa che la passata
                            // finale sul documento ha bisogno di sapere per trovare la figura
                            // giusta invece della prima che capita.
                            const b = bersaglioFigura(tipo);
                            el.setAttribute('data-rif-figura', b.modo === 'seguente' ? 'seguente' : (b.modo + ':' + b.valore));
                            // NELL'ANTEPRIMA IL NUMERO SI VEDE. Restava «fig. ?» solo perche' la
                            // numerazione girava unicamente sul documento assemblato: ma il
                            // template aperto le sue figure le conosce, e lasciare un punto
                            // interrogativo dove si puo' scrivere un numero e' un buco inutile.
                            // In stampa questo ramo non scatta (ctx.anteprima e' assente) e il
                            // numero vero lo mette numeraFigureERisolviRiferimenti.
                            const trovata = (ctx && ctx.anteprima)
                                ? figuraBersagliataNelTemplate(b, blockObj, ctx.figureTemplate) : null;
                            if (trovata) {
                                el.textContent = 'fig. ' + trovata.numero;
                                el.removeAttribute('data-mancante');
                            } else {
                                // Senza figura, la pastiglia porta il NOME del riferimento: si
                                // legge, e dice da sola cosa manca. Resta marcata come mancante,
                                // cosi' e' chiaro che non e' testo definitivo.
                                el.textContent = etichettaVuotaFigura(b);
                                el.setAttribute('data-mancante', '1');
                            }
                            return;
                        }
                        const voce = valori && valori[tipo];
                        if (voce && !voce.mancante && voce.testo) {
                            el.textContent = voce.testo;
                            el.removeAttribute('data-mancante');
                        } else {
                            // Un dato che manca NON esce come casella vuota: esce fra parentesi
                            // quadre, come gli altri segnaposto non compilati. Un buco muto in
                            // una relazione firmata e' il difetto che questa app deve rendere
                            // impossibile.
                            el.textContent = '[' + etichettaTag(tipo, valori) + ']';
                            el.setAttribute('data-mancante', '1');
                        }
                    });
                    return doc.getElementById('r').innerHTML;
                } catch (e) { return html; }
            }

            /** La figura bersagliata, dentro il template aperto.
             *
             * Stessa regola della passata di stampa — la piu' vicina, prima per pagina e poi per
             * posizione — perche' due regole diverse vorrebbero dire un'anteprima che mente. */
            function figuraBersagliataNelTemplate(bersaglio, blockObj, elenco) {
                if (!elenco || !elenco.figure || elenco.figure.length === 0) return null;
                const mio = (blockObj && elenco.indicePerBlocco[blockObj.id] !== undefined)
                    ? elenco.indicePerBlocco[blockObj.id] : -1;
                let ammessa;
                if (bersaglio.modo === 'ruolo') ammessa = f => f.ruolo === bersaglio.valore;
                else if (bersaglio.modo === 'blocco') ammessa = f => f.id === bersaglio.valore;
                else ammessa = f => f.indice > mio;
                let scelta = null, meglio = null;
                elenco.figure.forEach(f => {
                    if (!ammessa(f)) return;
                    const punteggio = [Math.abs(f.indice - mio), f.indice > mio ? 0 : 1];
                    if (!meglio || punteggio[0] < meglio[0]
                        || (punteggio[0] === meglio[0] && punteggio[1] < meglio[1])) {
                        scelta = f; meglio = punteggio;
                    }
                });
                return scelta;
            }

            /** Riscrive il tipo del k-esimo tag di un blocco di testo.
             *
             * Il documento non si tocca a mano da nessun'altra parte: qui si passa dal parser,
             * si cambia UN attributo e si riscrive. Cercare e sostituire nel testo sarebbe
             * bastato finche' i tag sono uno diverso dall'altro, e avrebbe cominciato a
             * sbagliare il giorno in cui due sono uguali — cioe' quasi subito. */
            function cambiaTipoTagNelBlocco(html, indice, tipoNuovo) {
                try {
                    const doc = new DOMParser().parseFromString('<div id="r">' + (html || '') + '</div>', 'text/html');
                    const tag = doc.getElementById('r').querySelectorAll('span[data-tag]')[indice];
                    if (!tag) return null;
                    tag.setAttribute('data-tag', tipoNuovo);
                    return doc.getElementById('r').innerHTML;
                } catch (e) { return null; }
            }

            function marcaTitoliPerIndice(html, stileTesto) {
                if (!html || (!/<h[1-3]/i.test(html) && !/data-formula/.test(html))) return html || '';
                try {
                    const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
                    doc.getElementById('r').querySelectorAll('h1, h2, h3').forEach(el => {
                        el.setAttribute('data-titolo-indice', el.tagName.substring(1));
                        // IL GRASSETTO SCRITTO SUL TITOLO. Stava solo in una regola del foglio di
                        // stile, e un foglio di stile lo si puo' non ricevere: e' successo per le
                        // tabelle del testo (nessun bordo) e per le variabili dello stile (corpo e
                        // carattere di serie al posto dei tuoi). Un titolo che si legge come il
                        // testo attorno non e' piu' un titolo, quindi il peso se lo porta dietro.
                        const gia = el.getAttribute('style') || '';
                        if (!/font-weight/i.test(gia)) {
                            // IL NUMERO, non var(--tpl-peso-titoli). Una variabile CSS si risolve
                            // solo se qualcuno l'ha definita da qualche parte sopra: basta un
                            // contenitore fuori dalla catena — l'anteprima di stampa, il Word,
                            // una miniatura costruita a parte — e il titolo torna del peso del
                            // testo. Il valore scritto per esteso non ha questa dipendenza.
                            const peso = (Object.assign(stileTestoDiDefault(), stileTesto || {}).pesoTitoli) || 700;
                            el.setAttribute('style', (gia ? gia.replace(/;\s*$/, '') + '; ' : '') + 'font-weight:' + peso);
                        }
                    });
                    // UNA FORMULA DA SOLA E' UN BLOCCO, non una riga di testo. Il capoverso che
                    // contiene SOLO una formula si riconosce da solo — non serve chiedere
                    // all'utente di centrarlo a mano ogni volta — e va centrato, senza rientro e
                    // senza giustificazione: su una riga corta, giustificare apre voragini fra i
                    // simboli. Dentro un capoverso, invece, la formula resta testo: cambia solo il
                    // carattere. Sono le due sole forme sensate, ed e' quello che e' stato chiesto.
                    doc.getElementById('r').querySelectorAll('p').forEach(p => {
                        const formule = p.querySelectorAll('[data-formula]');
                        if (formule.length === 0) return;
                        const tuttoTesto = (p.textContent || '').replace(/\s+/g, '');
                        let testoFormule = '';
                        formule.forEach(f => { testoFormule += (f.textContent || ''); });
                        if (tuttoTesto && tuttoTesto === testoFormule.replace(/\s+/g, '')) {
                            p.setAttribute('data-formula-blocco', '1');
                        }
                    });
                    return doc.getElementById('r').innerHTML;
                } catch (e) {
                    // Un HTML malformato non deve impedire di stampare: peggio che vada,
                    // l'indice non vedra' quel titolo. Meglio un indice incompleto di un
                    // documento che non esce.
                    return html;
                }
            }

            /** Converte un vecchio blocco 'titolo' in un blocco 'testo' il cui contenuto comincia
             * con l'intestazione vera. Il livello non si perde: diventa il tag h1/h2/h3, che e'
             * il posto dove quell'informazione doveva stare fin dall'inizio. */
            function convertiBloccoTitoloInTesto(blk) {
                if (!blk || blk.type !== 'titolo') return blk;
                const liv = Math.max(1, Math.min(3, parseInt(String(blk.livelloTitolo || 'H1').replace(/[^0-9]/g, ''), 10) || 1));
                const dentro = (blk.richHtml || '').trim();
                // Se il contenuto e' gia' un paragrafo, se ne prende il testo: un <p> dentro un
                // <h2> non e' HTML valido e ProseMirror lo butterebbe via in silenzio.
                let interno = dentro;
                const m = dentro.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
                if (m) interno = m[1];
                blk.type = 'testo';
                blk.richHtml = interno ? '<h' + liv + '>' + interno + '</h' + liv + '>' : '';
                delete blk.livelloTitolo;
                return blk;
            }
            /** Passa tutte le pagine di un template e converte i blocchi 'titolo' rimasti. */
            function convertiTitoliDelTemplate(pages) {
                let quanti = 0;
                (pages || []).forEach(pg => {
                    ((pg && pg.rows) || []).forEach(riga => {
                        ((riga && riga.blocks) || []).forEach(b => {
                            if (b && b.type === 'titolo') { convertiBloccoTitoloInTesto(b); quanti++; }
                        });
                    });
                });
                return quanti;
            }

            function stileTestoDiDefault() {
                return {
                    font: 'Calibri',
                    corpoPt: 11,
                    interlinea: 1.5,
                    // Giustificato di serie (richiesto esplicitamente): e' l'allineamento di una
                    // relazione tecnica. Resta cambiabile.
                    allineamento: 'justify',
                    rientroMm: 0,
                    spazioParagrafoPt: 6,
                    h1Pt: 16, h2Pt: 13, h3Pt: 11.5,
                    // IL PESO DEI TITOLI. Era scritto in un solo posto — la regola CSS del foglio
                    // di stampa — e bastava un contenitore che non ereditasse quella regola
                    // perche' un titolo comparisse chiaro come il testo attorno. Adesso e' un
                    // dato dello stile del documento, e viaggia anche SCRITTO SUL TITOLO STESSO:
                    // cosi' non dipende piu' da quale foglio di stile riesce a raggiungerlo.
                    pesoTitoli: 700
                };
            }
            /** Legge lo stile del template completandolo coi valori di serie: un template salvato
             * prima di oggi non ha nessuno di questi campi, e deve continuare a funzionare. */
            function stileTestoDelTemplate(tpl) {
                return Object.assign(stileTestoDiDefault(), (tpl && tpl.stileTesto) || {});
            }
            function pilaFont(idFont) {
                const f = FONT_DOCUMENTO.find(x => x.id === idFont) || FONT_DOCUMENTO[0];
                return f.pila;
            }
            /** Le variabili CSS che portano lo stile ai blocchi. Un solo punto che le scrive,
             * cosi' anteprima e stampa non possono divergere: e' la stessa stringa. */
            function cssVariabiliStileTesto(stile) {
                const st = Object.assign(stileTestoDiDefault(), stile || {});
                return `--tpl-font:${pilaFont(st.font)}; --tpl-font-formule:${FONT_FORMULE};`
                    + ` --tpl-corpo-pt:${st.corpoPt}pt; --tpl-interlinea:${st.interlinea};`
                    + ` --tpl-allineamento:${st.allineamento}; --tpl-rientro:${st.rientroMm}mm;`
                    + ` --tpl-spazio-par:${st.spazioParagrafoPt}pt;`
                    + ` --tpl-h1:${st.h1Pt}pt; --tpl-h2:${st.h2Pt}pt; --tpl-h3:${st.h3Pt}pt;`
                    + ` --tpl-peso-titoli:${st.pesoTitoli || 700};`;
            }

            /** STILE DELL'INDICE (richiesto esplicitamente: tre vesti di partenza — Classico a
             * puntini, Moderno con filo e numero in accento, Tecnico con colonna numerica — poi
             * personalizzabili in tutto). E' una scelta del PROGETTO, non del template di pagina:
             * un indice riassume più prove, quindi vive un livello sopra la singola prova — stesso
             * ragionamento già fatto per proj.introduzione (inizializzazione pigra alla lettura).
             * Stesso schema di stileTestoDiDefault/stileTestoDelTemplate qui sopra: un default, un
             * merge all'indietro-compatibile per i progetti salvati prima che questo esistesse. */
            function stileIndiceDiDefault() {
                return {
                    font: 'Calibri',               // id di FONT_DOCUMENTO — stesso elenco del testo, non duplicato
                    mostraPagina: true,
                    divisore: 'punti',              // 'punti' | 'linea' | 'nessuna'
                    gutter: false,                  // colonna numerica gerarchica (1 / 2.1 / 2.2.1) — attivabile da chiunque, non solo "tecnico"
                    numero: { pt: 11, peso: 700 },  // formattazione PROPRIA del numero gerarchico — mai quella di H1/H2/H3
                    titolo: { pt: 20, peso: 800 },  // la scritta in cima alla pagina
                    titoloTesto: 'Indice',          // ...e la scritta stessa: "Sommario", "Indice generale", quello che serve
                    pagina: { pt: 11, peso: 400 },  // numeri di pagina: UNA misura per tutti i livelli, mai quella del titolo accanto
                    coloreTesto: '#1e293b',
                    coloreDivisore: '#cbd5e1',
                    livelli: {
                        h1: { pt: 12.5, rientroMm: 0,  peso: 700, corsivo: false },
                        h2: { pt: 11.5, rientroMm: 6,  peso: 400, corsivo: false },
                        h3: { pt: 10.5, rientroMm: 12, peso: 400, corsivo: false }
                    }
                };
            }
            /** Id del template indice usato da un progetto — libreria vera (state.indiceTemplates),
             * mirror esatto di getReportTemplateIdPerProva: un id che punta a un template sparito
             * (eliminato) ripiega su "idx_classico" in lettura, nessun aggiustamento da fare altrove. */
            function getIndiceTemplateIdPerProgetto(proj) {
                if (!proj) return 'idx_classico';
                // Migrazione una tantum e pigra: un progetto salvato PRIMA che l'indice diventasse una
                // libreria di template portava lo stile incorporato in proj.indice — lo si trasforma
                // in un vero template nominato la prima volta che viene letto, così una
                // personalizzazione già fatta non si perde silenziosamente.
                if (proj.indice && !proj.indiceTemplateId) {
                    const newId = 'idx_' + Date.now() + '_' + Math.round(Math.random() * 1000);
                    const nome = nomeIndiceTemplateGiaEsistente('Personalizzato') ? prossimoNomeIndiceTemplateDisponibile('Personalizzato') : 'Personalizzato';
                    state.indiceTemplates[newId] = Object.assign({}, stileIndiceDiDefault(), proj.indice, { id: newId, name: nome, builtIn: false, createdAt: Date.now(), updatedAt: Date.now() });
                    delete state.indiceTemplates[newId].preset;
                    proj.indiceTemplateId = newId;
                    delete proj.indice;
                    saveState();
                }
                const tid = proj.indiceTemplateId;
                return (tid && state.indiceTemplates[tid]) ? tid : 'idx_classico';
            }
            /** Stile dell'indice usato da un progetto — legge dalla libreria, mai più una proprietà
             * privata del progetto: l'oggetto ritornato è condiviso da ogni progetto che usa lo
             * stesso template, quindi non va mutato in place (vedi apriModalPersonalizzaIndice). */
            function stileIndiceDelProgetto(proj) {
                if (!proj) return stileIndiceDiDefault();
                return state.indiceTemplates[getIndiceTemplateIdPerProgetto(proj)] || stileIndiceDiDefault();
            }
            /** Le variabili CSS dell'indice — stesso principio di cssVariabiliStileTesto: un solo
             * punto che le scrive, cosi' l'anteprima nel modale di personalizzazione e l'export vero
             * non possono mai raccontare due storie diverse. */
            function cssVariabiliStileIndice(stile) {
                const st = Object.assign(stileIndiceDiDefault(), stile || {});
                return `--idx-font:${pilaFont(st.font)};`
                    + ` --idx-h1-pt:${st.livelli.h1.pt}px; --idx-h2-pt:${st.livelli.h2.pt}px; --idx-h3-pt:${st.livelli.h3.pt}px;`
                    + ` --idx-h1-peso:${st.livelli.h1.peso}; --idx-h2-peso:${st.livelli.h2.peso}; --idx-h3-peso:${st.livelli.h3.peso};`
                    + ` --idx-numero-pt:${st.numero.pt}px; --idx-numero-peso:${st.numero.peso};`
                    + ` --idx-titolo-pt:${st.titolo.pt}px; --idx-titolo-peso:${st.titolo.peso};`
                    + ` --idx-pagina-pt:${st.pagina.pt}px; --idx-pagina-peso:${st.pagina.peso};`
                    + ` --idx-colore-testo:${st.coloreTesto}; --idx-colore-divisore:${st.coloreDivisore};`;
            }
            /** Stacca da un'etichetta la numerazione già scritta a mano ("1. Introduzione",
             * "2.1.1 Correlazioni") dal testo vero. Serve perché la numerazione dell'indice deve
             * essere UNA SOLA COSA accendibile o spegnibile (richiesto esplicitamente: «identificare
             * il numero dei titoli e renderli accesi o spenti, che ci siano già scritti o che no»):
             * accesa, il numero è quello calcolato dalla gerarchia e quello a mano non va raddoppiato;
             * spenta, spariscono entrambi. Un numero SENZA punto o parentesi non è numerazione
             * ("2026 – campagna di indagini" resta intatto): senza questa cautela un titolo che
             * comincia per anno verrebbe decapitato. */
            function separaNumeroDaEtichetta(etichetta) {
                const testo = String(etichetta || '');
                const m = testo.match(/^\s*(\d+(?:\.\d+)+\.?|\d+[.)])\s+/);
                return m ? { numero: m[1], testo: testo.slice(m[0].length) } : { numero: '', testo: testo.trim() };
            }
            /** Numerazione gerarchica (1 / 2.1 / 2.2.1) per la veste "tecnico": pura presentazione,
             * calcolata camminando le voci nell'ordine in cui il documento le presenta davvero — non
             * serve a raccogliVociIndice, che resta solo estrazione dati dal documento assemblato. */
            function numeriGerarchiciDiRighe(righeIndice) {
                const c = [0, 0, 0];
                return righeIndice.map(r => {
                    const liv = Math.max(1, Math.min(3, parseInt(r.livello, 10) || 1));
                    c[liv - 1]++;
                    for (let k = liv; k < 3; k++) c[k] = 0;
                    return c.slice(0, liv).join('.');
                });
            }

            /** FONTE UNICA del "budget" di spazio verticale su una pagina fisica A4 (mm) — richiesto
             * esplicitamente dopo l'ennesimo disallineamento editor/export ("non c'è margine di
             * miglioramento nell'allineamento... riscrivere completamente da zero"): la vera causa
             * non erano bug isolati, era questa stessa formula (297 - margini [- piè di pagina])
             * riscritta a mano in almeno 6 punti diversi del file (canvas editor, miniature pagina,
             * riga di riferimento "fine pagina", motore export, pagina indice — quest'ultima aveva
             * perfino 14/14 hardcoded invece di leggere i margini veri), ognuno con la sua stessa
             * identica logica ma nessuna garanzia di restare allineati tra loro quando uno veniva
             * corretto e gli altri no. Fase A del piano di unificazione (vedi
             * Piano_Riscrittura_Layout_Export.md): ogni punto che aveva questa formula ora chiama
             * SOLO questa funzione, mai più ricalcolata a mano.
             * - areaStampabileMm: 297 meno i margini sopra/sotto — l'altezza utile del foglio al
             *   netto dei margini, usata per min-height del canvas/miniature e per il vecchio
             *   data-tpl-max-height-mm (che il controllo di impaginazione stampa confronta con
             *   l'altezza reale renderizzata).
             * - riservaFooterMm: 8mm SOLO se il piè di pagina è davvero attivo (bug corretto in
             *   precedenza in questa stessa sessione: veniva sottratto sempre, anche a piè di
             *   pagina spento — spazio realmente disponibile sprecato su ogni pagina).
             * - limiteImpaginazioneMm: il numero che conta davvero per decidere se un atomo entra
             *   nella pagina corrente o va sulla successiva (usato da
             *   costruisciPagineTemplateUnificato) e per la riga di riferimento nell'editor
             *   (mostraLineaFinePaginaA4) — DEVONO restare sempre lo stesso numero, per questo
             *   vengono dalla stessa funzione invece che da due calcoli separati. */
            function calcolaBudgetPaginaMm(margins, footerEnabled) {
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                const areaStampabileMm = 297 - mrg.top - mrg.bottom;
                // Il piè di pagina nel margine (margineConIntestazione) non toglie spazio al testo.
                const riservaFooterMm = footerEnabled && !mrg.piedeNelMargine ? 8 : 0;
                // MARGINE DI SICUREZZA (2mm) — l'altra metà della riscrittura a "fogli rigidi".
                // Gli atomi vengono misurati in un iframe nascosto e poi resi nella finestra di
                // stampa: due contesti di rendering diversi, che sullo stesso contenuto possono
                // differire di frazioni di millimetro (arrotondamenti sub-pixel che si sommano su
                // decine di righe, font non ancora identici al momento della misura...). Prima
                // quello scarto faceva sforare il blocco e il browser rispondeva inventando una
                // pagina; ora il foglio ha altezza fissa, quindi lo stesso scarto taglierebbe
                // silenziosamente l'ultima riga. Impaginare contro un limite leggermente più
                // stretto dello spazio realmente disponibile assorbe lo scarto in entrambe le
                // direzioni: il contenuto entra sempre con un filo di margine. Sottratto SOLO al
                // limite di impaginazione (la decisione "quanto ci sta"), mai ad areaStampabileMm
                // (la geometria reale del foglio), altrimenti si sprecherebbero 2mm veri di carta.
                const margineSicurezzaMm = 2;
                const limiteImpaginazioneMm = areaStampabileMm - riservaFooterMm - margineSicurezzaMm;
                // limiteAssolutoDaCimaFoglioMm: SOLO per posizionare qualcosa via CSS "top" dentro
                // un contenitore il cui y=0 è la cima FISICA del foglio (es. templateEditorPageFrame,
                // che ha il margine superiore come proprio padding-top) — è un'altezza dal bordo del
                // foglio, non un'altezza di contenuto, quindi include anche mrg.top. Diverso da
                // limiteImpaginazioneMm (che invece è l'altezza di contenuto disponibile, usata per
                // confronti con l'altezza accumulata degli atomi — NON sommare mrg.top a quella,
                // altrimenti si conta il margine due volte). Bug reale trovato e corretto durante la
                // Fase A: la prima stesura di questo refactor usava per sbaglio limiteImpaginazioneMm
                // anche per posizionare la riga rossa in mostraLineaFinePaginaA4, disegnandola
                // sistematicamente più in alto di mrg.top millimetri — trovato dal test di
                // regressione scritto apposta per questa fase, non da un controllo a occhio.
                const limiteAssolutoDaCimaFoglioMm = mrg.top + limiteImpaginazioneMm;
                // LARGHEZZA utile della riga, in millimetri di carta veri: 210 (A4 in verticale)
                // meno i margini laterali. Sta qui e non altrove per lo stesso motivo per cui ci sta
                // l'altezza — è geometria della pagina, e riscriverla a mano in un secondo punto è
                // esattamente il modo in cui era nato il disallineamento che questa funzione ha
                // chiuso. Serve al menu del blocco per dire "93mm" invece di "50%": nessun margine
                // di sicurezza qui, perché non è una decisione di impaginazione ma una misura.
                const larghezzaUtileMm = 210 - mrg.left - mrg.right;
                return { mrg, areaStampabileMm, riservaFooterMm, limiteImpaginazioneMm, limiteAssolutoDaCimaFoglioMm, larghezzaUtileMm };
            }

            function apriTemplateEditor(templateId) {
                const tpl = state.reportTemplates[templateId];
                // "Classico" ora ha pages valorizzato come un template vero (vedi
                // classicoPaginaDefault) quindi è modificabile come qualunque altro — builtIn
                // continua a proteggerlo solo da eliminazione/rinomina (vedi eliminaTemplateReport/
                // rinominaTemplateReport), non più dalla modifica del layout.
                if (!tpl) return;
                let pages = tpl.pages ? JSON.parse(JSON.stringify(tpl.pages)) : null;
                if (!pages || pages.length === 0) pages = [seedPaginaDefaultClassico()];
                // Ogni pagina deve avere sempre rows/header/footer validi anche se il template
                // salvato è più vecchio di un campo aggiunto in seguito.
                pages = pages.map(p => ({
                    id: p.id || nuovoIdEditor('p'),
                    cols: p.cols || 4,
                    header: p.header || { imageDataUrl: null, text: '' },
                    footer: p.footer || { text: '' },
                    rows: Array.isArray(p.rows) ? p.rows : []
                }));
                // Ripara un template salvato PRIMA che esistessero i divieti in
                // inserisciBloccoInPagina/impostaRowSpanVoce (bug segnalato in un audit: un
                // blocco flowable finito impilato o con rowSpan>1 in una sessione precedente
                // continuerebbe altrimenti a caricarsi in silenzio nel vecchio stato non valido,
                // tornando al comportamento non paginato per categoria senza nessun avviso) —
                // va fatto SUBITO, prima che qualunque calcolo di paginazione veda queste pagine.
                sanitizzaBlocchiFlowableIsolati(pages);
                // I margini sono del TEMPLATE (condivisi da tutte le sue pagine, non regolabili
                // pagina per pagina): un unico @page CSS governa l'intero documento di stampa, quindi
                // margini realmente diversi da pagina a pagina non sarebbero comunque riproducibili
                // fedelmente nel PDF esportato — l'intestazione invece resta per-pagina (vedi sopra).
                const margins = Object.assign(marginiPaginaDiDefault(), tpl.margins || {});
                // Numero di pagina nel piè di pagina: STESSO ragionamento dei margini, ora del
                // TEMPLATE e non più di ogni singola pagina (richiesto esplicitamente: "quella
                // funzione del piè pagina dev'essere universale per tutte le pagine mentre per il
                // momento funziona per singola pagina, creando un paradosso che sminchia tutte le
                // volte tutto quanto"). Prima era page.footer.showPageNumber: ogni pagina nuova lo
                // ereditava per copia dalla pagina precedente AL MOMENTO della creazione, quindi
                // cambiarlo su una pagina più avanti non si propagava mai a quelle già esistenti —
                // un documento con alcune pagine numerate e altre no, senza che l'utente avesse
                // scelto quella incoerenza. Un solo interruttore per l'intero template elimina il
                // problema alla radice. Default spento (richiesto esplicitamente: "rendilo di base
                // spento"): i vecchi template salvati non hanno questo campo, tpl.footerShowPageNumber
                // è undefined, "!!undefined" è false — coerente col nuovo default per chiunque non
                // l'abbia mai attivato esplicitamente.
                const footerShowPageNumber = !!tpl.footerShowPageNumber;
                // Intestazione/piè di pagina: mostra/nascondi è ora anch'esso del TEMPLATE, non più
                // di ogni singola pagina (richiesto esplicitamente: "come per il numero pagine,
                // questi devono essere globali per tutte le pagine, altrimenti mi continua a
                // sminchiare tutto" — stesso identico paradosso di footerShowPageNumber qui sopra:
                // una pagina nuova copiava l'enabled della precedente solo al momento della
                // creazione, quindi accenderlo/spegnerlo più avanti non si propagava mai alle
                // pagine già esistenti). Default spento per entrambi (richiesto esplicitamente,
                // "tieni di base piè pagina e intestazione disattivati"): i vecchi template salvati
                // non hanno questi campi, "!!undefined" è false, coerente col nuovo default.
                const headerEnabled = !!tpl.headerEnabled;
                const footerEnabled = !!tpl.footerEnabled;
                // «Usa per tutte le pagine» (vedi allineaIntestazioniEditor): spenta di base.
                const headerTutte = !!tpl.headerTutte;

                // I vecchi blocchi 'titolo' diventano blocchi di testo con dentro un'intestazione
                // vera. Si converte all'apertura, come gia' fatto per le note e per il modello
                // dell'inquadramento: un template salvato ieri si apre e funziona, senza che
                // nessuno debba rifarlo a mano.
                const titoliConvertiti = convertiTitoliDelTemplate(pages);
                if (titoliConvertiti > 0) console.info('Template: convertiti ' + titoliConvertiti + ' blocchi Titolo in blocchi Testo.');
                const stileTesto = stileTestoDelTemplate(tpl);
                templateEditorState = { templateId, pages, margins, stileTesto, footerShowPageNumber, headerEnabled, headerTutte, footerEnabled, activePageIdx: 0, ctx: null, manualZoom: null, pagesStripExpanded: true, undoStack: [], redoStack: [], redoStackScartato: [], previewMode: false, selectedBlockId: null, justSelectedAnimKey: null, pageSelectionMode: false, selectedPageIndices: [], gridGuidesVisible: false, pageHandlesVisible: false, previewProjectId: state.currentProjectId || null, previewSurveyId: null, flowSyncNecessario: true, avvisiOverflowPerBlocco: {}, verificaPagineReali: {} };
                // Istantanea di riferimento per capire, alla chiusura, se ci sono modifiche non
                // salvate (vedi templateEditorHasUnsavedChanges/richiediChiusuraTemplateEditor):
                // stesso identico contenuto che salvaTemplateEditor scriverebbe sul template.
                templateEditorState.savedSnapshot = istantaneaTemplate();
                // Calcolato SUBITO (non lasciato al primo renderTemplateEditorCanvas): la palette qui
                // sotto mostra un'anteprima col contenuto vero di ogni tipo di blocco, quindi le
                // serve il ctx già pronto fin dal primo render, non solo da quello successivo.
                templateEditorState.ctx = computeEditorPreviewCtx();
                // templateEditorState è appena stato ricreato da zero, quindi bloccoInSpostamento è
                // undefined: qui si toglie di mezzo la PILLOLA, che è un nodo del DOM e come tale
                // sopravviverebbe alla chiusura del modale, restando accesa su un template nuovo
                // per un blocco che non esiste più.
                renderBarraSpostamento();
                aggiornaBottoneUndoEditor();
                aggiornaBottoneAnteprimaPulita();
                aggiornaBottoneFullscreenPreview();
                aggiornaBottoneGridGuides();
                attivaLongPressManigliePagina();
                const paletteElReset = document.getElementById('templateEditorPalette');
                if (paletteElReset) { paletteElReset.style.opacity = ''; paletteElReset.style.pointerEvents = ''; }

                const lbl = document.getElementById('lblTemplateEditorTitle');
                if (lbl) lbl.textContent = tpl.name;

                renderTemplateEditorPreviewProjectSelector();
                renderTemplateEditorPreviewSurveySelector();
                renderTemplateEditorPalette();
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderSuggerimentiLayoutEditor();

                // La tendina blocchi e il cassetto pagine (redesign mobile) sono elementi fissi nel
                // DOM, non ricreati ad ogni apertura: senza questo reset resterebbero aperti da una
                // sessione di modifica precedente della stessa pagina web.
                chiudiTendinaPaletteMobile();
                const pagesDrawerReset = document.getElementById('templateEditorPagesDrawer');
                if (pagesDrawerReset) pagesDrawerReset.classList.remove('drawer-open');

                if (modalTemplateEditorOverlay) modalTemplateEditorOverlay.classList.add('open');
                if (modalTemplateEditor) modalTemplateEditor.classList.add('open');
            }
            function chiudiTemplateEditor() {
                // Non deve mai restare "bloccato" a schermo intero se si chiude la modale da lì.
                if (document.fullscreenElement === modalTemplateEditor && document.exitFullscreen) document.exitFullscreen();
                if (modalTemplateEditorOverlay) modalTemplateEditorOverlay.classList.remove('open');
                if (modalTemplateEditor) modalTemplateEditor.classList.remove('open');
                nascondiAnteprimaPaletteHover();
                chiudiMenuBloccoEditor();
                chiudiTendinaPaletteMobile();
            }
            /** Vero se lo stato corrente dell'editor (pagine + margini) differisce dall'istantanea
             * presa all'apertura (o dall'ultimo salvataggio riuscito) — usato per decidere se la
             * chiusura richiede conferma. Confronto per contenuto (non per riferimento) perché
             * "pages" viene mutato in-place da moltissime funzioni dell'editor. */
            function templateEditorHasUnsavedChanges() {
                if (!templateEditorState || !templateEditorState.savedSnapshot) return false;
                try {
                    const attuale = istantaneaTemplate();
                    return attuale !== templateEditorState.savedSnapshot;
                } catch (e) { return false; }
            }
            /** Unico punto d'ingresso per "l'utente vuole chiudere l'editor" (X, Esc, click fuori):
             * se non ci sono modifiche, chiude subito; altrimenti chiede se salvare, uscire senza
             * salvare, o restare — cosi la X non perde mai lavoro per sbaglio senza che "Chiudi
             * senza salvare" debba esistere come bottone separato sempre visibile. */
            async function richiediChiusuraTemplateEditor() {
                // Deciso esplicitamente: "se l'utente decide di uscire dall'editor allora il blocco
                // ritornerà nella posizione iniziale senza perdita di niente". Va fatto PRIMA del
                // controllo sulle modifiche non salvate, altrimenti quel controllo — e l'eventuale
                // salvataggio che ne segue — lavorerebbero su un template a cui manca un blocco.
                annullaSpostamentoBlocco(true);
                if (!templateEditorHasUnsavedChanges()) { chiudiTemplateEditor(); return; }
                const scelta = await appDialog(
                    'Ci sono modifiche non salvate a questo template. Vuoi salvarle prima di uscire, oppure uscire comunque senza salvare?',
                    { confirm: true, title: 'Modifiche non salvate', cancelLabel: 'Continua a modificare', extraLabel: 'Esci senza salvare', okLabel: 'Salva ed esci' }
                );
                if (scelta === true) {
                    salvaTemplateEditor();
                } else if (scelta === 'extra') {
                    chiudiTemplateEditor();
                }
                // scelta === false (Continua a modificare / Esc / click fuori dal dialogo): resta aperto.
            }
            function salvaTemplateEditor() {
                // Stessa ragione della chiusura: salvare con un blocco in spostamento lo scriverebbe fuori
                // dal template, cioè lo perderebbe. Torna al suo posto e il salvataggio è completo.
                if (annullaSpostamentoBlocco(true)) {
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPalette();
                    renderBarraSpostamento();
                }
                if (!templateEditorState.templateId) return;
                const tpl = state.reportTemplates[templateEditorState.templateId];
                if (!tpl) return;
                // Le pagine di continuazione automatiche (page.continuaBloccoId, vedi
                // sincronizzaFlussiBlocchiLunghi) non hanno righe proprie per costruzione — non
                // sono "pagine vuote" da bloccare qui, e non vanno MAI salvate: sono un dettaglio
                // di anteprima puramente a runtime, ricreato da solo ad ogni apertura
                // dell'editor. In stampa non serve nessun oggetto pagina a parte per loro: un
                // blocco flowable continua già da solo oltre il margine della sua pagina di
                // origine grazie alla sua struttura a categorie (vedi buildAllegatoHtml/
                // htmlTabellaDettagliata, page-break-inside:avoid) — il motore di stampa del
                // browser lo pagina correttamente da solo, senza bisogno di saperlo.
                const paginaVuota = templateEditorState.pages.some(p => !p.continuaBloccoId && (!p.rows || p.rows.length === 0));
                if (paginaVuota) {
                    appAlert('Ogni pagina deve contenere almeno un blocco prima di salvare. Trascina un blocco dalla palette oppure elimina la pagina vuota.');
                    return;
                }
                tpl.pages = JSON.parse(JSON.stringify(templateEditorState.pages.filter(p => !p.continuaBloccoId)));
                tpl.margins = Object.assign({}, templateEditorState.margins);
                tpl.footerShowPageNumber = !!templateEditorState.footerShowPageNumber;
                    tpl.stileTesto = Object.assign(stileTestoDiDefault(), templateEditorState.stileTesto || {});
                tpl.headerEnabled = !!templateEditorState.headerEnabled;
                tpl.headerTutte = !!templateEditorState.headerTutte;
                tpl.footerEnabled = !!templateEditorState.footerEnabled;
                tpl.updatedAt = Date.now();
                saveState();
                chiudiTemplateEditor();
                renderReportTemplatesList();
            }
            /** "Salva come copia" (richiesto esplicitamente): crea un NUOVO template dal contenuto
             * attualmente in modifica, senza toccare quello di partenza — utile per usare un
             * template esistente come base senza rischiare di sovrascriverlo. A differenza di
             * salvaTemplateEditor NON chiude l'editor: si continua a lavorare, ma da questo punto
             * in poi ogni "Salva Template" successivo aggiorna la COPIA appena creata (si passa
             * templateEditorState.templateId al nuovo id), esattamente come ci si aspetterebbe da
             * un "Salva con nome" — stesso principio di qualunque editor di documenti. */
            async function salvaTemplateEditorComeCopia() {
                if (!templateEditorState.templateId) return;
                const origine = state.reportTemplates[templateEditorState.templateId];
                if (!origine) return;
                const paginaVuota = templateEditorState.pages.some(p => !p.continuaBloccoId && (!p.rows || p.rows.length === 0));
                if (paginaVuota) {
                    appAlert('Ogni pagina deve contenere almeno un blocco prima di salvare. Trascina un blocco dalla palette oppure elimina la pagina vuota.');
                    return;
                }
                let nome = await appPrompt('', `Copia di ${origine.name}`, { title: 'Salva come copia', label: 'Nome della copia', okLabel: 'Salva copia' });
                if (!nome || !nome.trim()) return;
                nome = await risolviCollisioneNomeTemplate(nome.trim());
                if (nome === null) return;
                const newId = 'tpl_' + Date.now();
                const ora = Date.now();
                const paginePulite = JSON.parse(JSON.stringify(templateEditorState.pages.filter(p => !p.continuaBloccoId)));
                const marginiPuliti = Object.assign({}, templateEditorState.margins);
                state.reportTemplates[newId] = {
                    id: newId,
                    name: nome,
                    builtIn: false,
                    pages: paginePulite,
                    margins: marginiPuliti,
                    footerShowPageNumber: !!templateEditorState.footerShowPageNumber,
                    headerEnabled: !!templateEditorState.headerEnabled,
                    headerTutte: !!templateEditorState.headerTutte,
                    footerEnabled: !!templateEditorState.footerEnabled,
                    createdAt: ora,
                    updatedAt: ora
                };
                saveState();
                // L'editor resta aperto ma "punta" ora alla copia appena creata (stesso pattern di
                // "Salva con nome"): un successivo "Salva Template" aggiorna la copia, non l'originale.
                templateEditorState.templateId = newId;
                templateEditorState.savedSnapshot = istantaneaTemplate();
                const lbl = document.getElementById('lblTemplateEditorTitle');
                if (lbl) lbl.textContent = nome;
                renderReportTemplatesList();
            }

            const btnCloseTemplateEditorX = document.getElementById('btnCloseTemplateEditorX');
            const btnSaveTemplateEditor = document.getElementById('btnSaveTemplateEditor');
            const btnSaveTemplateEditorAsCopy = document.getElementById('btnSaveTemplateEditorAsCopy');
            // L'unica via di chiusura (X, e il click sull'overlay nel raro caso resti raggiungibile)
            // passa sempre da richiediChiusuraTemplateEditor, che chiede conferma solo se serve.
            if (btnCloseTemplateEditorX) btnCloseTemplateEditorX.addEventListener('click', richiediChiusuraTemplateEditor);
            if (modalTemplateEditorOverlay) modalTemplateEditorOverlay.addEventListener('click', richiediChiusuraTemplateEditor);
            if (btnSaveTemplateEditor) btnSaveTemplateEditor.addEventListener('click', salvaTemplateEditor);
            if (btnSaveTemplateEditorAsCopy) btnSaveTemplateEditorAsCopy.addEventListener('click', salvaTemplateEditorComeCopia);

            // --- Redesign mobile "Opzione B" (vedi CSS @media max-width:760px) ---------------
            // FAB "+": apre la tendina blocchi a tutto schermo invece del trascinamento dalla
            // colonna laterale fissa (rimossa sotto quella soglia).
            const btnTemplateEditorMobileAddBlock = document.getElementById('btnTemplateEditorMobileAddBlock');
            // Un solo bottone, due stati: apre se chiuso, chiude se aperto. Prima apriva soltanto,
            // e per chiudere bisognava trovare la ✕ in alto o toccare fuori — con il pannello a
            // schermo intero "fuori" non esisteva.
            if (btnTemplateEditorMobileAddBlock) btnTemplateEditorMobileAddBlock.addEventListener('click', () => {
                const sidebar = document.getElementById('templateEditorPaletteSidebar');
                if (sidebar && sidebar.classList.contains('mobile-open')) chiudiTendinaPaletteMobile();
                else apriTendinaPaletteMobile();
            });
            const btnCloseMobilePalette = document.getElementById('btnCloseMobilePalette');
            if (btnCloseMobilePalette) btnCloseMobilePalette.addEventListener('click', chiudiTendinaPaletteMobile);
            // Toccare il foglio chiude il pannello dei blocchi. Prima non serviva — il pannello era
            // a schermo intero, un "fuori" non esisteva. Ora che si ferma a metà schermo, toccare
            // sopra è il gesto che chiunque prova per primo.
            //
            // MA solo per un TOCCO vero, non per uno scorrimento (segnalato: "potrebbe succedere
            // che io scorra per trovare un oggetto o una maniglia"). Chiudere su pointerdown era
            // sbagliato: quell'evento scatta anche quando inizi a scorrere il foglio, a trascinare
            // un blocco o ad afferrare una maniglia — gesti in cui il pannello NON va toccato,
            // perché ti serve ancora e magari lo stai solo scavalcando per arrivare al foglio.
            // Si decide quindi al RILASCIO: se il dito non si è praticamente mosso ed è stato giù
            // poco, era un tocco; altrimenti stavi facendo altro e il pannello resta dov'è.
            /** Esegue un'azione solo per un TOCCO vero su un elemento, mai per uno scorrimento o un
             * trascinamento che partono da lì. Serve a chiudere i pannelli toccando fuori senza
             * che si chiudano mentre scorri il foglio o afferri una maniglia.
             * - 10px: sotto questa soglia è un tocco fermo, non l'inizio di uno scorrimento (è la
             *   stessa soglia che i browser usano per distinguere tap da pan).
             * - 600ms: oltre, è una pressione prolungata — di solito l'inizio di un gesto, non la
             *   richiesta di chiudere qualcosa.
             * attivo() decide caso per caso se c'è davvero qualcosa da chiudere: senza, si
             * registrerebbero tocchi anche quando non serve. */
            function chiudiAlToccoFuori(elemento, attivo, azione, selettoreDaIgnorare) {
                if (!elemento) return;
                let tocco = null;
                elemento.addEventListener('pointerdown', (e) => {
                    // Un tocco che nasce DENTRO il pannello stesso (o dentro un altro pannello che
                    // deve restare aperto) non è un tocco "fuori": va ignorato, altrimenti usare i
                    // comandi del pannello lo chiuderebbe.
                    if (selettoreDaIgnorare && e.target.closest(selettoreDaIgnorare)) { tocco = null; return; }
                    tocco = attivo() ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
                });
                elemento.addEventListener('pointerup', (e) => {
                    if (!tocco) return;
                    const spostamento = Math.hypot(e.clientX - tocco.x, e.clientY - tocco.y);
                    const durata = Date.now() - tocco.t;
                    tocco = null;
                    if (spostamento <= 10 && durata <= 600) azione();
                });
                // Un gesto interrotto dal sistema (chiamata in arrivo, gesto di sistema) non deve
                // lasciare un tocco "in sospeso" che chiuderebbe al rilascio successivo.
                elemento.addEventListener('pointercancel', () => { tocco = null; });
            }

            const viewportWrapPalette = document.getElementById('templateEditorViewportWrap');
            chiudiAlToccoFuori(
                viewportWrapPalette,
                () => {
                    const sidebar = document.getElementById('templateEditorPaletteSidebar');
                    return !!(sidebar && sidebar.classList.contains('mobile-open'));
                },
                chiudiTendinaPaletteMobile
            );
            // Cassetto delle pagine (richiesto esplicitamente: "si deve chiudere appena tocco
            // qualsiasi altro punto al di fuori"). Agganciato all'INTERA modale dell'editor, non
            // solo al foglio: "fuori" comprende anche la barra degli strumenti in alto e la riga
            // di scelta della prova, non soltanto l'area del foglio.
            // Le esclusioni sono due: il cassetto stesso (usare le sue miniature non deve
            // chiuderlo) e il pannello dei blocchi, che ha una vita propria — chiudere il cassetto
            // mentre si sceglie un blocco sarebbe un effetto collaterale inatteso.
            // Resta la cautela sul tocco vero: dentro il cassetto le miniature si scorrono di lato
            // e si trascinano per riordinare, e sopra si scorre il foglio.
            chiudiAlToccoFuori(
                document.getElementById('modalTemplateEditor'),
                () => {
                    const drawer = document.getElementById('templateEditorPagesDrawer');
                    return !!(drawer && drawer.classList.contains('drawer-open'));
                },
                () => {
                    const drawer = document.getElementById('templateEditorPagesDrawer');
                    if (drawer) drawer.classList.remove('drawer-open');
                },
                '#templateEditorPagesDrawer, #templateEditorPaletteSidebar'
            );
            // STESSA REGOLA SU DESKTOP (richiesto esplicitamente: "esattamente come per la versione
            // mobile, se premo fuori dal menù delle pagine o degli strumenti, l'anteprima delle
            // pagine deve collassare"). Su mobile il cassetto è un pannello che si apre e si chiude
            // con la classe drawer-open; su desktop la stessa striscia vive sempre in fondo e
            // "aperta" vuol dire ESPANSA — stati diversi, stesso gesto, quindi stesso helper e
            // stesse cautele (chiude solo per un tocco fermo, mai mentre scorri o trascini).
            // Le esclusioni sono le stesse due — la striscia e la barra degli strumenti — più i
            // pannelli che hanno una vita propria: il menu di un blocco e la barra di spostamento.
            // Chiudere le anteprime mentre regoli un cursore nel menu sarebbe un effetto
            // collaterale che nessuno ha chiesto.
            chiudiAlToccoFuori(
                document.getElementById('modalTemplateEditor'),
                () => !modalitaMobileTemplateEditor() && templateEditorState.pagesStripExpanded !== false,
                () => impostaAnteprimePagineEspanse(false),
                '#templateEditorPagesDrawer, #templateEditorPaletteSidebar, .tpl-editor-block-menu, .tpl-editor-spostamento, #templateEditorMobileMoreMenu'
            );

            // Menu "altro" della barra titolo: raccoglie Anteprima pulita/Schermo intero, azioni
            // occasionali su mobile — i suoi bottoni inoltrano semplicemente un click al bottone
            // "vero" corrispondente (nascosto ma sempre presente/funzionante), zero logica duplicata.
            const btnTemplateEditorMobileMore = document.getElementById('btnTemplateEditorMobileMore');
            const templateEditorMobileMoreMenu = document.getElementById('templateEditorMobileMoreMenu');
            if (btnTemplateEditorMobileMore && templateEditorMobileMoreMenu) {
                btnTemplateEditorMobileMore.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const apri = !templateEditorMobileMoreMenu.classList.contains('open');
                    templateEditorMobileMoreMenu.classList.toggle('open', apri);
                    btnTemplateEditorMobileMore.setAttribute('aria-expanded', apri ? 'true' : 'false');
                });
                templateEditorMobileMoreMenu.querySelectorAll('button[data-more-target]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        templateEditorMobileMoreMenu.classList.remove('open');
                        btnTemplateEditorMobileMore.setAttribute('aria-expanded', 'false');
                        const target = document.getElementById(btn.dataset.moreTarget);
                        if (target) target.click();
                    });
                });
                document.addEventListener('click', (e) => {
                    if (!templateEditorMobileMoreMenu.classList.contains('open')) return;
                    if (e.target === btnTemplateEditorMobileMore || templateEditorMobileMoreMenu.contains(e.target)) return;
                    templateEditorMobileMoreMenu.classList.remove('open');
                    btnTemplateEditorMobileMore.setAttribute('aria-expanded', 'false');
                });
            }

            // Cassetto pagine: un tocco sulla maniglia apre/chiude, esattamente come le altre
            // tendine a comparsa dell'app — niente trascinamento vero e proprio, più affidabile col
            // dito e coerente con FAB/palette qui sopra.
            const templateEditorPagesDrawer = document.getElementById('templateEditorPagesDrawer');
            const templateEditorPagesDrawerHandle = document.getElementById('templateEditorPagesDrawerHandle');
            if (templateEditorPagesDrawerHandle && templateEditorPagesDrawer) {
                templateEditorPagesDrawerHandle.addEventListener('click', () => {
                    templateEditorPagesDrawer.classList.toggle('drawer-open');
                });
            }

            const selTemplateEditorCols = document.getElementById('selTemplateEditorCols');
            if (selTemplateEditorCols) {
                selTemplateEditorCols.addEventListener('change', (e) => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (!page) return;
                    salvaUndoSnapshotEditor();
                    page.cols = parseInt(e.target.value, 10) || 4;
                    renderTemplateEditorCanvas();
                });
            }

            /** Popola la tendina di scelta del PROGETTO da cui pescare la prova di anteprima
             * (vedi renderTemplateEditorPreviewSurveySelector subito sotto): un template è
             * riutilizzabile su qualunque cantiere, quindi l'anteprima non deve restare bloccata sul
             * progetto attualmente aperto — l'utente può scegliere qualunque cantiere salvato in
             * state.projects per controllare il layout anche con le sue prove. Richiamata
             * all'apertura dell'editor e ogni volta che la scelta di progetto cambia. */
            function renderTemplateEditorPreviewProjectSelector() {
                const sel = document.getElementById('selTemplateEditorPreviewProject');
                if (!sel || !templateEditorState) return;
                syncStateToProject(); // garantisce che il progetto corrente sia presente in state.projects
                const progetti = Object.values(state.projects || {})
                    .filter(p => p.surveys && Object.keys(p.surveys).length > 0)
                    .sort((a, b) => {
                        if (a.id === state.currentProjectId) return -1;
                        if (b.id === state.currentProjectId) return 1;
                        return (a.name || a.comune || '').localeCompare(b.name || b.comune || '');
                    });
                sel.innerHTML = progetti.map(p => {
                    const nome = p.name || p.comune || 'Cantiere senza nome';
                    const lbl = p.id === state.currentProjectId ? `${nome} (attuale)` : nome;
                    return `<option value="${p.id}">${lbl}</option>`;
                }).join('');
                const scelto = (templateEditorState.previewProjectId && state.projects[templateEditorState.previewProjectId])
                    ? templateEditorState.previewProjectId
                    : (state.currentProjectId || (progetti[0] && progetti[0].id) || '');
                templateEditorState.previewProjectId = scelto;
                aggiornaPastiglieTag();   // cambiato cantiere: le pastiglie devono rileggere il loro dato
                sel.value = scelto;
            }
            /** Popola la tendina "Anteprima con i dati di" con le prove del progetto scelto nella
             * tendina precedente (renderTemplateEditorPreviewProjectSelector): se il progetto scelto
             * è quello attualmente aperto, la prova attiva (non salvata) resta disponibile come
             * opzione di default "(attualmente aperta)" — per qualunque altro progetto, invece, non
             * esiste una prova "aperta", quindi si elencano semplicemente tutte le sue prove salvate.
             * Permette di verificare il layout del template con dati reali diversi da quelli della
             * prova attualmente aperta, invece di scoprire solo in stampa che un blocco non ci sta più
             * (vedi computeEditorPreviewCtx). Richiamata all'apertura dell'editor e ogni volta che la
             * scelta di progetto o di prova cambia (per aggiornare l'avviso accanto, vedi sotto). */
            function renderTemplateEditorPreviewSurveySelector() {
                const sel = document.getElementById('selTemplateEditorPreviewSurvey');
                if (!sel || !templateEditorState) return;
                const projId = templateEditorState.previewProjectId || state.currentProjectId;
                const isProgettoCorrente = projId === state.currentProjectId;
                let html = '';
                if (isProgettoCorrente) {
                    const altre = elencoProveProgetto().filter(s => s.id !== state.currentSurveyId);
                    const provaAttualeLabel = `Prova ${state.header?.provaNr || '1'} (attualmente aperta)`;
                    html = `<option value="">${provaAttualeLabel}</option>`;
                    altre.forEach(s => {
                        const lbl = `Prova ${s.header?.provaNr || '?'}${s.header?.localita ? ' — ' + s.header.localita : ''}`;
                        html += `<option value="${s.id}">${lbl}</option>`;
                    });
                } else {
                    const proj = state.projects[projId];
                    const prove = proj ? Object.values(proj.surveys || {}).sort((a, b) =>
                        (parseInt(a.header?.provaNr) || 0) - (parseInt(b.header?.provaNr) || 0)) : [];
                    html = prove.map(s => {
                        const lbl = `Prova ${s.header?.provaNr || '?'}${s.header?.localita ? ' — ' + s.header.localita : ''}`;
                        return `<option value="${s.id}">${lbl}</option>`;
                    }).join('');
                    // Nessuna prova "attualmente aperta" per un progetto diverso da quello attivo:
                    // se la prova salvata in previewSurveyId non appartiene più a questo progetto
                    // (es. subito dopo aver cambiato progetto), si punta alla prima disponibile.
                    if (!templateEditorState.previewSurveyId || !proj || !proj.surveys[templateEditorState.previewSurveyId]) {
                        templateEditorState.previewSurveyId = prove[0] ? prove[0].id : null;
                    }
                }
                sel.innerHTML = html;
                sel.value = templateEditorState.previewSurveyId || '';
                aggiornaAvvisoTemplateEditorPreviewSurvey();
            }
            /** Avviso leggero accanto alla tendina: quando la prova scelta per l'anteprima non ha
             * coordinate GPS (il blocco Inquadramento, se presente nel template, resta un
             * placeholder molto più corto di quanto sarebbe con GPS reali) ricorda che il layout va
             * ricontrollato anche con una prova che le abbia, prima di fidarsi che stia comodo per
             * tutte — non blocca nulla, è solo un promemoria per evitare la sorpresa in stampa. */
            function aggiornaAvvisoTemplateEditorPreviewSurvey() {
                const lbl = document.getElementById('lblTemplateEditorPreviewWarning');
                if (!lbl || !templateEditorState) return;
                const usaInquadramento = templateEditorState.pages.some(p => (p.rows || []).some(r => (r.blocks || []).some(entry =>
                    (entry.stack || [entry]).some(item => item.type === 'inquadramento')
                )));
                const ctx = templateEditorState.ctx;
                const senzaGps = usaInquadramento && ctx && !ctx.gpsInfo;
                if (senzaGps) {
                    lbl.textContent = 'Questa prova non ha GPS: il blocco Inquadramento è più corto del reale';
                    lbl.style.display = '';
                } else {
                    lbl.style.display = 'none';
                }
            }
            const selTemplateEditorPreviewProject = document.getElementById('selTemplateEditorPreviewProject');
            if (selTemplateEditorPreviewProject) {
                selTemplateEditorPreviewProject.addEventListener('change', (e) => {
                    templateEditorState.previewProjectId = e.target.value || state.currentProjectId;
                    aggiornaPastiglieTag();   // cambiato cantiere: le pastiglie devono rileggere il loro dato
                    // Cambiando progetto la prova precedentemente scelta non è più valida (appartiene
                    // al progetto di prima): renderTemplateEditorPreviewSurveySelector la resetta da
                    // sola alla prima prova disponibile del nuovo progetto (o a "attualmente aperta"
                    // se si torna sul progetto corrente).
                    templateEditorState.previewSurveyId = null;
                    renderTemplateEditorPreviewSurveySelector();
                    templateEditorState.ctx = computeEditorPreviewCtx();
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPagesStrip();
                    aggiornaAvvisoTemplateEditorPreviewSurvey();
                });
            }
            const selTemplateEditorPreviewSurvey = document.getElementById('selTemplateEditorPreviewSurvey');
            if (selTemplateEditorPreviewSurvey) {
                selTemplateEditorPreviewSurvey.addEventListener('change', (e) => {
                    templateEditorState.previewSurveyId = e.target.value || null;
                    // Il ctx va ricalcolato da zero (non solo aggiornaCtxFotoEditor): cambia la
                    // prova sorgente di TUTTI i dati, non solo delle foto.
                    templateEditorState.ctx = computeEditorPreviewCtx();
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPagesStrip();
                    aggiornaAvvisoTemplateEditorPreviewSurvey();
                });
            }
            /** Guide leggere di colonne/righe sovrapposte al canvas (tocco sul bottone accanto a
             * "Colonne pagina"): puramente un aiuto visivo per l'editing, niente di salvato nel
             * template — si spengono/riaccendono a piacere, sempre coerenti col numero di colonne
             * scelto in quel momento (vedi renderGrigliaGuidaEditor). */
            const btnToggleGridGuides = document.getElementById('btnToggleGridGuides');
            if (btnToggleGridGuides) {
                btnToggleGridGuides.addEventListener('click', () => {
                    templateEditorState.gridGuidesVisible = !templateEditorState.gridGuidesVisible;
                    aggiornaBottoneGridGuides();
                    renderGrigliaGuidaEditor();
                });
            }
            function aggiornaBottoneGridGuides() {
                const btn = document.getElementById('btnToggleGridGuides');
                if (!btn) return;
                const attivo = !!templateEditorState.gridGuidesVisible;
                btn.style.background = attivo ? 'var(--accent)' : 'var(--bg-card)';
                btn.style.borderColor = attivo ? 'var(--accent)' : 'var(--border)';
                btn.style.color = attivo ? 'var(--on-accent)' : 'var(--text-muted)';
                btn.setAttribute('aria-pressed', String(attivo));
            }

            /** Linee guida tratteggiate leggere che mostrano dove cadono le `cols` colonne della
             * pagina (divisione uniforme dell'area stampabile, in mm — coerente a qualunque zoom
             * senza bisogno di ricalcoli) e i confini tra le righe REALMENTE presenti in pagina
             * (altezza dinamica, quindi lette dalle posizioni DOM effettive dopo il render). Vive
             * dentro #templateEditorPageFrame così segue automaticamente lo stesso zoom/scroll
             * della pagina, nessun ricalcolo extra necessario quando si cambia zoom. */
            function renderGrigliaGuidaEditor() {
                const frame = document.getElementById('templateEditorPageFrame');
                let overlay = document.getElementById('templateEditorGridGuides');
                if (!templateEditorState.gridGuidesVisible) {
                    if (overlay) overlay.remove();
                    return;
                }
                if (!frame) return;
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'templateEditorGridGuides';
                    overlay.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:1;';
                    frame.appendChild(overlay);
                }
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                const cols = (page && page.cols) || 4;
                const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                let html = '';
                for (let i = 1; i < cols; i++) {
                    html += `<div style="position:absolute; top:${mrg.top}mm; bottom:${mrg.bottom}mm; left:calc(${mrg.left}mm + (100% - ${mrg.left + mrg.right}mm) * ${i} / ${cols}); width:0; border-left:1px dashed rgba(100,116,139,0.55);"></div>`;
                }
                const scale = zoomAttualeEditorTemplate();
                const canvas = document.getElementById('templateEditorCanvas');
                if (canvas && scale > 0) {
                    const frameRect = frame.getBoundingClientRect();
                    Array.from(canvas.querySelectorAll('.tpl-editor-row')).forEach((riga, idx) => {
                        if (idx === 0) return; // la prima riga comincia già dove finisce l'intestazione
                        const r = riga.getBoundingClientRect();
                        const localTop = (r.top - frameRect.top) / scale;
                        html += `<div style="position:absolute; left:${mrg.left}mm; right:${mrg.right}mm; top:${localTop}px; height:0; border-top:1px dashed rgba(100,116,139,0.55);"></div>`;
                    });
                }
                overlay.innerHTML = html;
            }

            /** Tocco prolungato (senza trascinare) sullo sfondo "vuoto" del foglio — la fascia dei
             * margini, o la zona dell'intestazione — fa comparire le maniglie dirette per regolare
             * margini e altezza dell'intestazione OLTRE i valori fissi di prima ("out of bound"),
             * esattamente come richiesto. Un tocco su un blocco/riga non attiva questo gesto: quello
             * ha già la propria gestione (selezione/spostamento, vedi attivaGestureTapBloccoEditor). */
            let paginaHandleLongPress = null;
            function attivaLongPressManigliePagina() {
                const frame = document.getElementById('templateEditorPageFrame');
                if (!frame || frame.dataset.longpressBound) return;
                frame.dataset.longpressBound = '1';
                frame.addEventListener('pointerdown', (e) => {
                    if (templateEditorState.previewMode) return;
                    const suSfondo = e.target === frame;
                    const suIntestazione = !!e.target.closest('.tpl-editor-header-zone');
                    if (!suSfondo && !suIntestazione) return;
                    paginaHandleLongPress = {
                        startX: e.clientX, startY: e.clientY, moved: false,
                        timer: setTimeout(() => {
                            if (!paginaHandleLongPress || paginaHandleLongPress.moved) return;
                            templateEditorState.pageHandlesVisible = true;
                            triggerVibrate(12);
                            renderManigliePaginaEditor();
                        }, 480)
                    };
                });
                frame.addEventListener('pointermove', (e) => {
                    if (!paginaHandleLongPress) return;
                    if (Math.abs(e.clientX - paginaHandleLongPress.startX) > 8 || Math.abs(e.clientY - paginaHandleLongPress.startY) > 8) {
                        clearTimeout(paginaHandleLongPress.timer);
                        paginaHandleLongPress = null;
                    }
                });
                const fine = () => { if (paginaHandleLongPress) { clearTimeout(paginaHandleLongPress.timer); paginaHandleLongPress = null; } };
                frame.addEventListener('pointerup', fine);
                frame.addEventListener('pointercancel', fine);
            }
            function nascondiManigliePaginaEditor() {
                if (!templateEditorState.pageHandlesVisible) return;
                templateEditorState.pageHandlesVisible = false;
                const ov = document.getElementById('templateEditorPageHandles');
                if (ov) ov.remove();
            }

            /** Le 4 maniglie dei margini (in mm, coerenti a qualunque zoom perché dentro al frame,
             * vedi renderGrigliaGuidaEditor) più, se l'intestazione è attiva, la maniglia della sua
             * altezza — tutte vive solo mentre templateEditorState.pageHandlesVisible è true (tocco
             * prolungato sullo sfondo del foglio, vedi sopra; scompaiono al primo tocco altrove). */
            function renderManigliePaginaEditor() {
                const frame = document.getElementById('templateEditorPageFrame');
                let overlay = document.getElementById('templateEditorPageHandles');
                if (!templateEditorState.pageHandlesVisible) {
                    if (overlay) overlay.remove();
                    return;
                }
                if (!frame) return;
                if (!overlay) {
                    overlay = document.createElement('div');
                    overlay.id = 'templateEditorPageHandles';
                    overlay.className = 'tpl-editor-anim-in';
                    overlay.style.cssText = 'position:absolute; inset:0; pointer-events:none; z-index:8;';
                    frame.appendChild(overlay);
                }
                const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                let html = `
                    <div class="tpl-editor-page-margin-handle" data-side="top" style="left:50%; top:${mrg.top}mm; transform:translate(-50%,-50%);" title="Margine superiore: ${mrg.top}mm — trascina per regolarlo"></div>
                    <div class="tpl-editor-page-margin-handle" data-side="bottom" style="left:50%; bottom:${mrg.bottom}mm; transform:translate(-50%,50%);" title="Margine inferiore: ${mrg.bottom}mm — trascina per regolarlo"></div>
                    <div class="tpl-editor-page-margin-handle vert" data-side="left" style="top:50%; left:${mrg.left}mm; transform:translate(-50%,-50%);" title="Margine sinistro: ${mrg.left}mm — trascina per regolarlo"></div>
                    <div class="tpl-editor-page-margin-handle vert" data-side="right" style="top:50%; right:${mrg.right}mm; transform:translate(50%,-50%);" title="Margine destro: ${mrg.right}mm — trascina per regolarlo"></div>
                `;
                const headerZone = document.getElementById('templateEditorHeaderZone');
                if (page && templateEditorState.headerEnabled && page.header && headerZone) {
                    const scale = zoomAttualeEditorTemplate() || 1;
                    const frameRect = frame.getBoundingClientRect();
                    const hzRect = headerZone.getBoundingClientRect();
                    const localBottom = (hzRect.bottom - frameRect.top) / scale;
                    html += `<div class="tpl-editor-page-margin-handle header" data-side="header" style="left:50%; top:${localBottom}px; transform:translate(-50%,-50%);" title="Altezza intestazione — trascina per regolarla"></div>`;
                }
                overlay.innerHTML = html;
                overlay.querySelectorAll('.tpl-editor-page-margin-handle').forEach(h => attivaTrascinamentoManigliaPagina(h, h.dataset.side));
            }

            // Stato del trascinamento di una maniglia di pagina (margine o altezza intestazione):
            // durante il trascinamento si aggiorna dal vivo SOLO lo stile del foglio (economico,
            // niente re-render completo a ogni pixel), la scrittura nello stato/undo avviene una
            // sola volta al rilascio — stesso principio delle maniglie dirette dei blocchi.
            let paginaMarginDragStato = null;
            /** Riporta una maniglia di pagina (margine o altezza intestazione) al suo valore di
             * default — richiesto esplicitamente, doppio tocco per resettare invece di dover
             * trascinare a occhio fino al valore giusto. Per l'intestazione "default" vuol dire
             * tornare all'altezza NATURALE (heightMm = null, si adatta al contenuto come prima di
             * toccare la maniglia), non un numero fisso arbitrario. */
            function resettaManigliaPagina(side) {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;
                salvaUndoSnapshotEditor();
                if (side === 'header') {
                    if (page.header) page.header.heightMm = null;
                    allineaIntestazioniEditor(page);
                } else {
                    templateEditorState.margins = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                    templateEditorState.margins[side] = marginiPaginaDiDefault()[side];
                }
                triggerVibrate(12);
                renderTemplateEditorCanvas();
                renderManigliePaginaEditor();
                sincronizzaControlliMarginiSidebar();
            }
            let ultimoTapManigliaPagina = { side: null, t: 0 };
            function attivaTrascinamentoManigliaPagina(handleEl, side) {
                handleEl.addEventListener('pointerdown', (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // Doppio tocco (richiesto esplicitamente): entro 350ms dal tocco precedente
                    // SULLA STESSA maniglia, resetta invece di iniziare un trascinamento — al
                    // contrario del "tocco singolo poi trascina" delle altre gesture di questo
                    // editor, qui non c'è ambiguità da risolvere: un doppio tocco non è mai
                    // l'inizio naturale di un trascinamento con le dita.
                    const ora = Date.now();
                    if (ultimoTapManigliaPagina.side === side && (ora - ultimoTapManigliaPagina.t) < 350) {
                        ultimoTapManigliaPagina = { side: null, t: 0 };
                        resettaManigliaPagina(side);
                        return;
                    }
                    ultimoTapManigliaPagina = { side, t: ora };
                    const frame = document.getElementById('templateEditorPageFrame');
                    if (!frame) return;
                    const scale = zoomAttualeEditorTemplate() || 1;
                    const pxPerMm = frame.offsetWidth / 210;
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    let valoreIniziale;
                    if (side === 'header') {
                        const hz = document.getElementById('templateEditorHeaderZone');
                        valoreIniziale = (page.header && page.header.heightMm) || (hz ? Math.max(8, Math.round(hz.getBoundingClientRect().height / scale / pxPerMm) - respiroIntestazioneMm(templateEditorState.margins, page.header)) : 20);
                    } else {
                        const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                        valoreIniziale = mrg[side];
                    }
                    paginaMarginDragStato = { side, startX: e.clientX, startY: e.clientY, valoreIniziale, valoreCorrente: valoreIniziale, scale, pxPerMm };
                    // La cattura del puntatore è un miglioramento, non una condizione: se il
                    // motore la rifiuta il trascinamento deve continuare a funzionare invece di
                    // morire qui portandosi dietro tutto il resto del gesto.
                    try { handleEl.setPointerCapture(e.pointerId); } catch (err) { /* si tira avanti senza */ }
                    mostraEtichettaManigliaBlocco(handleEl, `${cmMargine(valoreIniziale)} cm`);
                });
                handleEl.addEventListener('pointermove', (e) => {
                    const st = paginaMarginDragStato;
                    if (!st || st.side !== side) return;
                    const dxLocal = (e.clientX - st.startX) / st.scale / st.pxPerMm;
                    const dyLocal = (e.clientY - st.startY) / st.scale / st.pxPerMm;
                    let nuovo;
                    if (side === 'top') nuovo = st.valoreIniziale + dyLocal;
                    else if (side === 'bottom') nuovo = st.valoreIniziale - dyLocal;
                    else if (side === 'left') nuovo = st.valoreIniziale + dxLocal;
                    else if (side === 'right') nuovo = st.valoreIniziale - dxLocal;
                    else nuovo = st.valoreIniziale + dyLocal; // header: solo verticale
                    const max = side === 'header' ? 100 : 60;
                    const min = side === 'header' ? 8 : 0;
                    nuovo = Math.round(Math.max(min, Math.min(max, nuovo)) * 2) / 2;
                    st.valoreCorrente = nuovo;
                    mostraEtichettaManigliaBlocco(handleEl, `${cmMargine(nuovo)} cm`);
                    if (side === 'header') {
                        // L'intestazione sta nel margine superiore: crescendo oltre il margine allarga
                        // la fascia e il contenuto scende (margineConIntestazione), come nell'export.
                        const hz = document.getElementById('templateEditorHeaderZone');
                        if (hz) hz.style.height = (nuovo + respiroIntestazioneMm(templateEditorState.margins, templateEditorState.pages[templateEditorState.activePageIdx] && templateEditorState.pages[templateEditorState.activePageIdx].header)) + 'mm';
                        const frameH = document.getElementById('templateEditorPageFrame');
                        const pagH = templateEditorState.pages[templateEditorState.activePageIdx];
                        if (frameH && pagH) frameH.style.paddingTop = margineConIntestazione(templateEditorState.margins, Object.assign({}, pagH.header, { heightMm: nuovo }), true).top + 'mm';
                        // Anche dal vivo (non solo dopo il rilascio, vedi renderTemplateEditorCanvas):
                        // il resto della pagina deve restare fermo, quindi lo spazio minimo del
                        // contenuto sotto si riduce esattamente di quanto cresce l'intestazione —
                        // altrimenti durante il trascinamento si vede il piè di pagina "scappare"
                        // più in basso del bordo reale del foglio (bug segnalato).
                        const canvas = document.getElementById('templateEditorCanvas');
                        if (canvas) {
                            const mrgLive = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                            // Fase A del piano di unificazione: fonte unica anche nel trascinamento dal vivo.
                            const pagLive = templateEditorState.pages[templateEditorState.activePageIdx];
                            canvas.style.minHeight = `${calcolaBudgetPaginaMm(margineConIntestazione(mrgLive, Object.assign({}, pagLive && pagLive.header, { heightMm: nuovo }), true), false).areaStampabileMm}mm`;
                        }
                    } else {
                        const frame = document.getElementById('templateEditorPageFrame');
                        const canvas = document.getElementById('templateEditorCanvas');
                        if (frame && canvas) {
                            const base = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                            base[side] = nuovo;
                            const pagLive = templateEditorState.pages[templateEditorState.activePageIdx];
                            const mrgLive = margineConIntestazione(base, pagLive && pagLive.header, templateEditorState.headerEnabled, pagLive && pagLive.footer, templateEditorState.footerEnabled);
                            frame.style.padding = `${mrgLive.top}mm ${mrgLive.right}mm ${mrgLive.bottom}mm ${mrgLive.left}mm`;
                            canvas.style.minHeight = `${calcolaBudgetPaginaMm(mrgLive, false).areaStampabileMm}mm`;
                            const hz = document.getElementById('templateEditorHeaderZone');
                            if (hz) { hz.style.left = base.left + 'mm'; hz.style.right = base.right + 'mm'; hz.style.height = Math.max(base.top, altezzaIntestazioneMm(pagLive && pagLive.header, base) + respiroIntestazioneMm(base, pagLive && pagLive.header)) + 'mm'; }
                        }
                    }
                });
                const fine = () => {
                    const st = paginaMarginDragStato;
                    if (!st || st.side !== side) return;
                    paginaMarginDragStato = null;
                    nascondiEtichettaManigliaBlocco();
                    if (st.valoreCorrente !== st.valoreIniziale) {
                        salvaUndoSnapshotEditor();
                        const page = templateEditorState.pages[templateEditorState.activePageIdx];
                        if (side === 'header') {
                            if (page.header) page.header.heightMm = st.valoreCorrente;
                            allineaIntestazioniEditor(page);
                        } else {
                            templateEditorState.margins = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                            templateEditorState.margins[side] = st.valoreCorrente;
                            sincronizzaControlliMarginiSidebar();
                        }
                    }
                    renderTemplateEditorCanvas();
                };
                handleEl.addEventListener('pointerup', fine);
                handleEl.addEventListener('pointercancel', fine);
            }

            // Mostra/nascondi intestazione: impostazione del TEMPLATE (templateEditorState.
            // headerEnabled), non della singola pagina — richiesto esplicitamente, "come per il
            // numero pagine, questi devono essere globali per tutte le pagine, altrimenti mi
            // continua a sminchiare tutto" — niente più salvaUndoSnapshotEditor qui (quella
            // cronologia copre solo "pages", questa impostazione vive a parte, come i margini/
            // footerShowPageNumber) e ridisegna SEMPRE tutta la pagina attiva, mai solo quella
            // corrente in isolamento.
            // Slider margini in barra laterale (richiesto esplicitamente: "comandi più facili per
            // controllare anche dalla barra al lato sinistro quanto i margini influiscono...
            // universale per tutto il template" — 4 slider, uno per lato, tutti sullo stesso
            // templateEditorState.margins già usato dalle maniglie sul foglio e da OGNI pagina/
            // dall'export: nessun valore per-pagina, esattamente come richiesto). 'input' (non
            // 'change') per un aggiornamento live del foglio mentre si trascina lo slider, non solo
            // al rilascio — coerente con l'aggiornamento live delle maniglie sul foglio.
            ['top', 'bottom', 'left', 'right'].forEach(side => {
                const cap = side.charAt(0).toUpperCase() + side.slice(1);
                const range = document.getElementById(`rangeMargine${cap}`);
                if (!range) return;
                range.addEventListener('input', (e) => {
                    const nuovo = parseFloat(e.target.value) || 0;
                    templateEditorState.margins = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                    templateEditorState.margins[side] = nuovo;
                    sincronizzaControlliMarginiSidebar();
                    renderTemplateEditorCanvas();
                    renderManigliePaginaEditor();
                });
                // Il valore scritto in centimetri, come in Word: vale quando si esce dal campo o con Invio.
                const campo = document.getElementById(`lblMargine${cap}`);
                if (campo) {
                    const applica = () => {
                        const mm = mmDaCm(campo.value);
                        const attuale = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                        if (mm === null || Math.abs(mm - attuale[side]) < 0.05) { campo.value = cmMargine(attuale[side]); return; }
                        salvaUndoSnapshotEditor();
                        templateEditorState.margins = Object.assign(attuale, { [side]: mm });
                        campo.value = cmMargine(mm);
                        sincronizzaControlliMarginiSidebar();
                        renderTemplateEditorCanvas();
                        renderManigliePaginaEditor();
                    };
                    campo.addEventListener('change', applica);
                    campo.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); campo.blur(); } });
                }
                // Un solo salvataggio undo a fine trascinamento (non ad ogni tick dello slider),
                // stesso principio delle maniglie dirette sul foglio (vedi
                // attivaTrascinamentoManigliaPagina) — 'change' scatta solo al rilascio.
                range.addEventListener('change', () => salvaUndoSnapshotEditor());
            });
            document.querySelectorAll('[data-margini-preset]').forEach(b => b.addEventListener('click', () => {
                salvaUndoSnapshotEditor();
                // Le distanze di intestazione e piè di pagina dal bordo restano: non sono margini.
                const attuali = templateEditorState.margins || {};
                templateEditorState.margins = Object.assign({}, MARGINI_WORD[b.dataset.marginiPreset],
                    attuali.header != null ? { header: attuali.header } : {}, attuali.footer != null ? { footer: attuali.footer } : {});
                sincronizzaControlliMarginiSidebar();
                renderTemplateEditorCanvas();
                renderManigliePaginaEditor();
                triggerVibrate(12);
            }));
            // «Distanza dal bordo» dell'intestazione (Word: «Intestazione: da bordo»), nei margini.
            const impostaDistanzaIntestazione = (mm) => {
                const attuale = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                if (Math.abs(mm - distanzaIntestazioneMm(attuale)) < 0.05) { sincronizzaControlliMarginiSidebar(); return; }
                templateEditorState.margins = Object.assign(attuale, { header: mm });
                sincronizzaControlliMarginiSidebar();
                renderTemplateEditorCanvas();
                renderManigliePaginaEditor();
            };
            const campoDistanza = document.getElementById('inputDistanzaIntestazione');
            if (campoDistanza) {
                campoDistanza.addEventListener('change', () => {
                    const mm = mmDaCm(campoDistanza.value);
                    if (mm === null) { sincronizzaControlliMarginiSidebar(); return; }
                    impostaDistanzaIntestazione(mm);
                });
                campoDistanza.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); campoDistanza.blur(); } });
            }
            const campoDistanzaPiede = document.getElementById('inputDistanzaPiede');
            if (campoDistanzaPiede) {
                campoDistanzaPiede.addEventListener('change', () => {
                    const mm = mmDaCm(campoDistanzaPiede.value);
                    const attuale = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                    if (mm !== null && Math.abs(mm - distanzaPiedeMm(attuale)) >= 0.05) {
                        templateEditorState.margins = Object.assign(attuale, { footer: mm });
                        renderTemplateEditorCanvas();
                        renderManigliePaginaEditor();
                    }
                    sincronizzaControlliMarginiSidebar();
                });
                campoDistanzaPiede.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); campoDistanzaPiede.blur(); } });
            }
            const btnFormattaPiede = document.getElementById('btnFormattaPiede');
            if (btnFormattaPiede) btnFormattaPiede.addEventListener('click', () => apriTplTextEditor(ID_PIEDE_EDITOR));
            const btnDistanzaWord = document.getElementById('btnDistanzaIntestazioneWord');
            if (btnDistanzaWord) btnDistanzaWord.addEventListener('click', () => impostaDistanzaIntestazione(12.5));
            const btnResetMarginiTemplate = document.getElementById('btnResetMarginiTemplate');
            if (btnResetMarginiTemplate) {
                btnResetMarginiTemplate.addEventListener('click', () => {
                    salvaUndoSnapshotEditor();
                    templateEditorState.margins = marginiPaginaDiDefault();
                    sincronizzaControlliMarginiSidebar();
                    renderTemplateEditorCanvas();
                    renderManigliePaginaEditor();
                    triggerVibrate(12);
                });
            }

            const chkPageHeaderEnabled = document.getElementById('chkPageHeaderEnabled');
            if (chkPageHeaderEnabled) {
                chkPageHeaderEnabled.addEventListener('change', (e) => {
                    templateEditorState.headerEnabled = e.target.checked;
                    renderTemplateEditorPageControls();
                    renderTemplateEditorCanvas();
                });
            }
            // «Usa per tutte le pagine»: accendendola, l'intestazione della pagina aperta va su
            // tutte (si annulla con Annulla); spegnendola ogni pagina tiene la sua copia.
            const chkHeaderTuttePagine = document.getElementById('chkHeaderTuttePagine');
            if (chkHeaderTuttePagine) {
                chkHeaderTuttePagine.addEventListener('change', (e) => {
                    templateEditorState.headerTutte = e.target.checked;
                    if (e.target.checked) {
                        salvaUndoSnapshotEditor();
                        allineaIntestazioniEditor(templateEditorState.pages[templateEditorState.activePageIdx]);
                    }
                    renderTemplateEditorPageControls();
                    renderTemplateEditorCanvas();
                });
            }
            const inputHeaderText = document.getElementById('inputHeaderText');
            if (inputHeaderText) {
                inputHeaderText.addEventListener('input', (e) => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (!page) return;
                    if (!page.header) page.header = { imageDataUrl: null, text: '' };
                    page.header.text = e.target.value;
                    allineaIntestazioniEditor(page);
                    renderTemplateEditorCanvas();
                });
            }
            const chkHeaderTuttaPagina = document.getElementById('chkHeaderTuttaPagina');
            if (chkHeaderTuttaPagina) chkHeaderTuttaPagina.addEventListener('change', (e) => {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page || !page.header) return;
                salvaUndoSnapshotEditor();
                if (e.target.checked) page.header.tuttaPagina = true; else delete page.header.tuttaPagina;
                allineaIntestazioniEditor(page);
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
            });
            const btnFormattaIntestazione = document.getElementById('btnFormattaIntestazione');
            if (btnFormattaIntestazione) btnFormattaIntestazione.addEventListener('click', () => apriTplTextEditor(ID_INTESTAZIONE_EDITOR));
            const btnUploadHeaderImage = document.getElementById('btnUploadHeaderImage');
            const fileHeaderImage = document.getElementById('fileHeaderImage');
            if (btnUploadHeaderImage && fileHeaderImage) {
                btnUploadHeaderImage.addEventListener('click', () => fileHeaderImage.click());
                fileHeaderImage.addEventListener('change', (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                        const page = templateEditorState.pages[templateEditorState.activePageIdx];
                        if (!page) return;
                        salvaUndoSnapshotEditor();
                        if (!page.header) page.header = { imageDataUrl: null, text: '' };
                        page.header.imageDataUrl = reader.result;
                        allineaIntestazioniEditor(page);
                        // Caricare un'immagine accende l'intestazione per l'intero template, non
                        // solo per questa pagina (stesso ragionamento del checkbox qui sopra) — utile
                        // di suo, chi carica un logo si aspetta di vederlo comparire subito.
                        templateEditorState.headerEnabled = true;
                        renderTemplateEditorPageControls();
                        renderTemplateEditorCanvas();
                    };
                    reader.readAsDataURL(file);
                    fileHeaderImage.value = '';
                });
            }
            const btnRemoveHeaderImage = document.getElementById('btnRemoveHeaderImage');
            if (btnRemoveHeaderImage) {
                btnRemoveHeaderImage.addEventListener('click', () => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (!page || !page.header) return;
                    salvaUndoSnapshotEditor();
                    page.header.imageDataUrl = null;
                    allineaIntestazioniEditor(page);
                    renderTemplateEditorPageControls();
                    renderTemplateEditorCanvas();
                });
            }
            // Mostra/nascondi piè di pagina: impostazione del TEMPLATE, stesso ragionamento
            // dell'intestazione qui sopra.
            const chkPageFooterEnabled = document.getElementById('chkPageFooterEnabled');
            if (chkPageFooterEnabled) {
                chkPageFooterEnabled.addEventListener('change', (e) => {
                    templateEditorState.footerEnabled = e.target.checked;
                    renderTemplateEditorPageControls();
                    renderTemplateEditorCanvas();
                });
            }
            const inputFooterText = document.getElementById('inputFooterText');
            if (inputFooterText) {
                inputFooterText.addEventListener('input', (e) => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (!page) return;
                    if (!page.footer) page.footer = { text: '' };
                    page.footer.text = e.target.value;
                    renderTemplateEditorCanvas();
                });
            }
            // Numero di pagina: impostazione del TEMPLATE (vedi templateEditorState.footerShowPageNumber
            // e il commento in apriTemplateEditor), non più di ogni singola pagina — un solo
            // interruttore che vale per tutto il documento, niente più salvaUndoSnapshotEditor qui
            // (quella cronologia copre solo "pages", questa impostazione vive a parte, come i margini).
            const chkFooterPageNumber = document.getElementById('chkFooterPageNumber');
            if (chkFooterPageNumber) {
                chkFooterPageNumber.addEventListener('change', (e) => {
                    templateEditorState.footerShowPageNumber = e.target.checked;
                    renderTemplateEditorCanvas();
                });
            }
            // Distribuisci righe sulla pagina (vedi renderTemplateEditorCanvas/buildPaginaRigheHtml
            // per il meccanismo): per pagina, come intestazione/piè di pagina.
            const chkPageDistribuisciSpazio = document.getElementById('chkPageDistribuisciSpazio');
            if (chkPageDistribuisciSpazio) {
                chkPageDistribuisciSpazio.addEventListener('change', (e) => {
                    const page = templateEditorState.pages[templateEditorState.activePageIdx];
                    if (!page) return;
                    salvaUndoSnapshotEditor();
                    page.distribuisciSpazioVerticale = e.target.checked;
                    renderTemplateEditorCanvas();
                });
            }
            const btnRiordinaPagina = document.getElementById('btnRiordinaPagina');
            if (btnRiordinaPagina) {
                btnRiordinaPagina.addEventListener('click', () => riordinaAutomaticoPagina());
            }

            // Bug corretto: le foto in state.projects[...].surveys[...].photos[].dataUrl vengono
            // svuotate da saveState() prima di scrivere su localStorage (per restare sotto i 5MB
            // del limite del browser) — il dato pieno resta solo in RAM (photoMemoryCache) finché
            // la pagina non viene ricaricata, e su disco solo dentro IndexedDB (savePhotoToIDB).
            // Un semplice JSON.stringify(proj) quindi esportava le foto scattate nella sessione
            // corrente ma "perdeva" quelle di sessioni precedenti (dataUrl assente sia in proj che
            // in RAM dopo un reload). Qui si fa lo stesso fallback a 3 livelli già usato per
            // KML/Excel/PDF/galleria (dataUrl diretto -> cache RAM -> IndexedDB) prima di esportare,
            // così il JSON scaricato contiene sempre tutte le foto disponibili.
            async function rehydrateProjectPhotosForExport(proj) {
                const clone = JSON.parse(JSON.stringify(proj));
                if (clone.surveys) {
                    for (const sid of Object.keys(clone.surveys)) {
                        const photos = clone.surveys[sid].photos;
                        if (!photos || photos.length === 0) continue;
                        for (const p of photos) {
                            if (!p.dataUrl) {
                                p.dataUrl = photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : null) || null;
                            }
                        }
                    }
                }
                // Stesso trattamento per le immagini incorporate nelle Note di progetto. Anche nella
                // copia conservata prima della conversione al nuovo motore (htmlPrimaDelMotore): fino
                // alla Fase 1 usciva senza le sue immagini.
                if (clone.notes && typeof rehydrateNoteImagesInHtmlString === 'function') {
                    if (clone.notes.html) clone.notes.html = await rehydrateNoteImagesInHtmlString(clone.notes.html);
                    if (clone.notes.htmlPrimaDelMotore) clone.notes.htmlPrimaDelMotore = await rehydrateNoteImagesInHtmlString(clone.notes.htmlPrimaDelMotore);
                }
                return clone;
            }

            // =========================================================================
            // EXPORT A BASSO CONSUMO DI MEMORIA — con più prove che contengono più foto ad alta
            // risoluzione (scattate SENZA compressione, per fedeltà del rilievo: vedi
            // handlePhotoFileSelected), un JSON.stringify(...) diretto sull'intero progetto
            // costringe il browser a tenere in memoria, TUTTE INSIEME e PIÙ VOLTE duplicate
            // (l'oggetto clonato, la stringa JSON risultante, poi il Blob), decine o centinaia di
            // MB di testo base64 — è questo il motivo più probabile del crash con 7 prove x 3
            // foto, non il numero di foto in sé ma la loro dimensione moltiplicata per le copie
            // ridondanti tenute in RAM nello stesso istante.
            //
            // Qui si evita la duplicazione: ogni dataUrl foto viene sostituito con un segnaposto
            // breve PRIMA di chiamare JSON.stringify (che quindi lavora solo sulla struttura,
            // sempre piccola), poi il testo JSON risultante viene tagliato nei punti dei
            // segnaposto e il Blob finale viene costruito passando tutti i pezzi (frammenti di
            // JSON + foto originali) direttamente al costruttore Blob — mai concatenati a mano in
            // un'unica stringa gigante. Il base64 di un'immagine non contiene mai virgolette o
            // backslash, quindi può essere reinserito così com'è senza bisogno di rielaborarlo.
            //
            // IL SEGNAPOSTO DEVE USCIRE DA JSON.stringify IDENTICO (Fase 1). Prima era racchiuso fra
            // due caratteri \u0000: JSON.stringify li scrive come la sequenza di sei caratteri
            // "\u0000", il segnaposto non si ritrovava più nel testo e la foto non veniva rimessa.
            // Risultato: i backup JSON (progetto e prova) uscivano SENZA NESSUNA FOTO, con al loro
            // posto il segnaposto — e reimportandoli, quel segnaposto finiva in IndexedDB al posto
            // della foto vera con lo stesso id. Ora è solo testo semplice, e assemblaBlobConSegnaposto
            // si ferma con un errore se anche un solo segnaposto non si ritrova.
            function segnapostoFoto(parts) {
                return '@@DPSH_FOTO_' + Math.random().toString(36).slice(2, 10) + '_' + parts.length + '@@';
            }
            function placeholderizzaFotoProgetto(projClone, tokenPrefix, parts) {
                if (!projClone || !projClone.surveys) return;
                Object.keys(projClone.surveys).forEach(sid => {
                    const photos = projClone.surveys[sid].photos;
                    if (!photos) return;
                    photos.forEach(p => {
                        if (p.dataUrl) {
                            const token = segnapostoFoto(parts);
                            parts.push({ placeholder: token, value: p.dataUrl });
                            p.dataUrl = token;
                        }
                    });
                });
            }
            function assemblaBlobConSegnaposto(jsonStr, parts) {
                // Nell'ordine in cui i segnaposto compaiono nel TESTO, non in quello in cui sono stati
                // creati (Fase 2): nel JSON della prova le foto della prova aperta (state.photos) sono
                // create per prime ma nel testo vengono dopo i progetti, e la ricerca in sequenza non le
                // ritrovava: con una prova aperta che ha foto, quel backup si fermava con l'errore qui
                // sotto.
                const posizioni = parts.map(p => {
                    const idx = jsonStr.indexOf(p.placeholder);
                    // Un segnaposto che non si trova vuol dire una foto che nel file non ci sarebbe:
                    // meglio nessun file che un backup che sembra completo e non lo è.
                    if (idx === -1) throw new Error('una foto non è stata inserita nel file (segnaposto non trovato): backup annullato.');
                    return { idx, placeholder: p.placeholder, value: p.value };
                }).sort((a, b) => a.idx - b.idx);
                const blobParts = [];
                let da = 0;
                posizioni.forEach(({ idx, placeholder, value }) => {
                    blobParts.push(jsonStr.slice(da, idx));
                    blobParts.push(value || '');
                    da = idx + placeholder.length;
                });
                blobParts.push(jsonStr.slice(da));
                return blobParts;
            }

            /** Quante foto citate non hanno un'immagine da mettere nel file (non sono né in memoria né
             * in IndexedDB). Serve a dirlo a chi esporta: il file uscirebbe senza, in silenzio. */
            function contaFotoSenzaImmagine(proj) {
                let n = 0;
                Object.values((proj && proj.surveys) || {}).forEach(s => (s.photos || []).forEach(p => { if (p && !p.dataUrl) n++; }));
                return n;
            }
            function avvisaFotoMancantiNelBackup(n) {
                if (n > 0) appAlert(`Attenzione: ${n === 1 ? '1 foto citata dalle prove non è stata trovata' : n + ' foto citate dalle prove non sono state trovate'} su questo dispositivo, quindi nel file non ${n === 1 ? 'c\'è' : 'ci sono'}.\n\nIl resto del backup è completo.`);
            }

            function scaricaBlobJson(blobParts, nomeFile) {
                const blob = new Blob(blobParts, { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nomeFile;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                triggerVibrate([40, 60]);
            }

            async function exportProjectJSON(projId) {
                if (!projId || !state.projects[projId]) return;
                const proj = await rehydrateProjectPhotosForExport(state.projects[projId]);
                const mancanti = contaFotoSenzaImmagine(proj);
                // La forma dei dati viaggia col progetto: chi lo importa sa se va aggiornato (004b).
                proj.versioneSchema = VERSIONE_SCHEMA_DATI;
                // I template e le voci d'archivio che il progetto usa (Fase 2, pezzo 044a): senza,
                // sull'altro dispositivo il report usciva col «Classico» di là.
                proj.librerie = librerieUsateDa({ [projId]: state.projects[projId] }, state);
                const parts = [];
                placeholderizzaFotoProgetto(proj, 'P', parts);
                const jsonStr = JSON.stringify(proj, null, 2);
                scaricaBlobJson(assemblaBlobConSegnaposto(jsonStr, parts), `Progetto_${nomeFileProgetto(state.projects[projId])}_Backup.json`);
                avvisaFotoMancantiNelBackup(mancanti);
            }

            /** Lo stato intero con le foto reidratate (prova aperta e tutti i progetti) e già al posto
             * dei segnaposto: la base comune del JSON della prova e del Backup completo JSON. */
            async function statoConFotoPerExport(parts) {
                // Stesso bug/fix di exportProjectJSON: reidrata anche le foto della prova attiva
                // (state.photos) e di TUTTI i progetti/prove annidati nello stato completo, prima
                // di esportare il backup — altrimenti le foto di sessioni precedenti risultano
                // senza dataUrl (svuotato da saveState per stare sotto il limite di localStorage).
                // E, come exportProjectJSON, evita di tenere tutte le foto duplicate in memoria
                // passando per i segnaposto invece di un JSON.stringify diretto sull'intero stato.
                const clone = JSON.parse(JSON.stringify(state));
                let mancanti = 0;
                if (clone.photos && clone.photos.length > 0) {
                    for (const p of clone.photos) {
                        if (!p.dataUrl) {
                            p.dataUrl = photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : null) || null;
                        }
                    }
                    clone.photos.forEach(p => {
                        if (p.dataUrl) {
                            const token = segnapostoFoto(parts);
                            parts.push({ placeholder: token, value: p.dataUrl });
                            p.dataUrl = token;
                        }
                    });
                }
                if (clone.projects) {
                    for (const pid of Object.keys(clone.projects)) {
                        const rehydrated = await rehydrateProjectPhotosForExport(clone.projects[pid]);
                        mancanti += contaFotoSenzaImmagine(rehydrated);
                        placeholderizzaFotoProgetto(rehydrated, `PJ${pid}_`, parts);
                        clone.projects[pid] = rehydrated;
                    }
                }
                return { clone, mancanti };
            }

            async function exportSingleJSON() {
                const parts = [];
                const { clone, mancanti } = await statoConFotoPerExport(parts);
                const jsonStr = JSON.stringify(clone, null, 2);
                const progettoAperto = state.projects && state.projects[state.currentProjectId];
                scaricaBlobJson(assemblaBlobConSegnaposto(jsonStr, parts), `Prova_${progettoAperto ? nomeFileProgetto(progettoAperto) : (state.header.comune || 'DPSH').replace(/\s+/g, '_')}_Backup.json`);
                avvisaFotoMancantiNelBackup(mancanti);
            }

