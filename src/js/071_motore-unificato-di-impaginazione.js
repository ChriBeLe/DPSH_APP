            // ===================== MOTORE UNIFICATO DI IMPAGINAZIONE (RISCRITTURA COMPLETA) =====================
            // Richiesto esplicitamente dopo l'ennesimo bug della stessa famiglia ("sempre 94 pagine
            // su 28" nonostante correzioni mirate ripetute): invece di continuare a inseguire casi
            // speciali uno alla volta (blocco flowable da solo sulla pagina, poi con un titolo
            // sopra, poi...) — ogni volta che se ne scopriva uno nuovo, quel caso ripiombava
            // silenziosamente sull'impaginazione nativa del browser, la causa originaria di TUTTI
            // questi bug — questo motore tratta OGNI pagina del template allo stesso identico modo,
            // senza eccezioni: la scompone in "atomi" (unità minime mai spezzate a metà — una riga
            // normale, un gruppo rowSpan, oppure UNA categoria di una tabella lunga), misura
            // ciascuno per davvero nello stesso iframe nascosto già in uso altrove
            // (misuraFigliPerStampaMm) e li impagina con lo stesso bin-packing
            // (impaginaBlocchiSuPagineFisiche) indipendentemente dal tipo di contenuto. Non esiste
            // più un ramo "pagina con tabella lunga" separato da un ramo "pagina normale": è sempre
            // lo stesso percorso, quindi un caso non previsto non può più saltare silenziosamente
            // la misura reale — nel peggiore dei casi produce un atomo grande, mai un intero ramo
            // di codice bypassato. Sostituisce (per ora affiancandosi, la Fase 3 toglierà il
            // vecchio codice) sia buildPaginaRigheHtml sia la rilevazione flowable ad hoc dentro
            // buildSurveyReportHtml.

            /** Scompone UNA pagina del template nei suoi atomi misurati per davvero. Ogni riga
             * normale o gruppo rowSpan diventa un atomo unico (mai spezzato); una riga con dentro
             * una tabella lunga (Dettagliata Parametri/Allegato) si scompone invece in tanti atomi,
             * uno per categoria — stessa tecnica già in uso per i blocchi flowable, ora parte dello
             * stesso motore invece di un ramo a parte. Ritorna anche gli eventuali indici di
             * categoria con interruzione manuale forzata (blockObj.categorieForzaPaginaPrima, il
             * "superpotere" già disponibile nel menu del blocco nell'editor), da passare a
             * impaginaBlocchiSuPagineFisiche. */
            // rigaOGruppoHaBypassMargini RIMOSSA insieme a tutto "ignora i limiti di pagina":
            // esisteva solo per propagare quel flag dalla riga ai suoi atomi. Nessun chiamante
            // rimasto (vedi impaginaBlocchiSuPagineFisiche, che non legge più bypassaMargini).
            async function costruisciAtomiPaginaTemplate(pageDef, ctx, margins) {
                const cols = pageDef.cols || 4;
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || pageDef.margins || {});
                const margineRiga = pageDef.distribuisciSpazioVerticale ? '0' : '12px';
                const gruppiRighe = calcolaGruppiRowSpanPagina(pageDef);
                const atomi = [];
                let indiciForzati = new Set();
                for (const seg of gruppiRighe) {
                    if (seg.tipo === 'gruppo') {
                        // Un gruppo rowSpan (più righe rese insieme come un'unica griglia CSS) resta
                        // un'unica unità indivisibile, come già succede oggi — misurata per davvero
                        // invece di fidarsi che ci stia.
                        const righeGruppo = pageDef.rows.slice(seg.startIndex, seg.endIndex + 1);
                        const html = buildRigheSottoinsiemeHtml(righeGruppo, ctx, cols, margineRiga);
                        if (!html) continue;
                        const misurati = await misuraFigliPerStampaMm(html, mrg);
                        misurati.forEach(el => atomi.push({ html: el.html, mm: el.mm, categoriaIndex: null }));
                        continue;
                    }
                    const row = pageDef.rows[seg.rowIndex];
                    const blocchiRiga = row.blocks || [];
                    const bloccoFlowable = (blocchiRiga.length === 1 && !blocchiRiga[0].stack && BLOCCHI_FLOWABLE.has(blocchiRiga[0].type)) ? blocchiRiga[0] : null;
                    // IL TESTO CON UN'INTERRUZIONE SI COMPORTA COME UNA TABELLA LUNGA. Ogni
                    // segmento e' un atomo con un indice, e ogni confine e' una pagina forzata:
                    // e' la stessa strada dei blocchi flowable, percorsa con unita' diverse.
                    // Prima l'interruzione nel testo era solo un `break-before: page` nel CSS,
                    // cioe' una richiesta all'impaginazione del browser — la stessa da cui questo
                    // motore esiste per NON dipendere piu'.
                    const testoSpezzabile = (blocchiRiga.length === 1 && !bloccoFlowable && eBloccoSpezzabile(blocchiRiga[0])) ? blocchiRiga[0] : null;
                    if (testoSpezzabile) {
                        const pezzi = segmentiTesto(testoSpezzabile.richHtml);
                        for (let iSeg = 0; iSeg < pezzi.length; iSeg++) {
                            const htmlSeg = buildRigheSottoinsiemeHtml(
                                [{ id: row.id, blocks: [Object.assign({}, testoSpezzabile, { richHtml: pezzi[iSeg] })] }],
                                ctx, cols, margineRiga);
                            if (!htmlSeg) continue;
                            const misuratiSeg = await misuraFigliPerStampaMm(htmlSeg, mrg);
                            misuratiSeg.forEach(el => atomi.push({
                                html: el.html, mm: el.mm, categoriaIndex: iSeg, blockId: testoSpezzabile.id
                            }));
                            if (iSeg > 0) indiciForzati.add(`${testoSpezzabile.id}:${iSeg}`);
                        }
                        continue;
                    }
                    if (bloccoFlowable) {
                        const contenuto = bloccoFlowable.type === 'allegato-formule' ? (ctx.allegatoHtml || '') : (ctx.tabellaDettagliataHtml || '');
                        if (contenuto) {
                            // rigaScale/fontScale del blocco (richiesto esplicitamente, "verifica che
                            // l'altezza delle righe sia rispettata"): prima non venivano mai lette qui,
                            // quindi "Altezza righe"/"Dimensione testo" per Allegato formule/Tabella
                            // dettagliata restavano puramente decorativi nell'editor, senza alcun
                            // effetto sul PDF — misura E resa finale ora usano la STESSA scala.
                            const rigaScaleBlocco = bloccoFlowable.rigaScale || 1;
                            const fontScaleBlocco = bloccoFlowable.fontScale || 1;
                            const elementiMisurati = await misuraFigliPerStampaMm(contenuto, mrg, rigaScaleBlocco, fontScaleBlocco);
                            const elementiFusi = fondiTitoliConSuccessivo(elementiMisurati);
                            // La scala va incorporata nell'HTML di OGNI atomo qui (non lasciata a un
                            // contenitore esterno più sotto): un atomo può finire su una pagina fisica
                            // insieme a contenuto di TUTT'ALTRO blocco/scala, quindi deve portarsela
                            // dietro da solo per restare quella giusta ovunque atterri.
                            // stileGrigliaTabellaBlocco: stessa logica della scala (variabili CSS che
                            // il contenuto eredita), quindi anche la griglia scelta viaggia insieme a
                            // OGNI atomo. Indispensabile qui: un atomo può atterrare su una pagina
                            // fisica insieme a contenuto di un altro blocco con griglia diversa.
                            const styleScalaBlocco = ` style="--tpl-riga-scale:${rigaScaleBlocco}; --tpl-font-scale:${fontScaleBlocco};${stileGrigliaTabellaBlocco(bloccoFlowable)}"`;
                            // blockId (bug segnalato con screenshot: "tra Tabella Dettagliata e
                            // Allegato formule si crea ancora una pagina bianca" — root cause
                            // verificata: due blocchi flowable DIVERSI sulla stessa pagina del
                            // template riusano LA STESSA numerazione di categoriaIndex 0..N
                            // (elencoCategorieBlocco è condiviso), quindi impaginaBlocchiSuPagineFisiche
                            // scambiava l'ultima categoria di un blocco per "ancora lo stesso blocco"
                            // di quella del blocco successivo — saltando il controllo di spazio
                            // proprio nel punto di passaggio da una tabella all'altra, e un'eventuale
                            // interruzione manuale con lo stesso indice numerico messa su UN blocco
                            // scattava per errore anche sull'ALTRO). Ogni atomo porta ora l'id VERO
                            // del blocco a cui appartiene: impaginaBlocchiSuPagineFisiche lo usa per
                            // riconoscere davvero un cambio di tabella, e le interruzioni manuali
                            // sotto sono scritte come "idBlocco:indice" invece del solo indice, così
                            // non si mescolano più tra blocchi diversi.
                            elementiFusi.forEach(el => atomi.push({ html: `<div${styleScalaBlocco}>${el.html}</div>`, mm: el.mm, categoriaIndex: el.categoriaIndex, blockId: bloccoFlowable.id }));
                            if (Array.isArray(bloccoFlowable.categorieForzaPaginaPrima)) {
                                bloccoFlowable.categorieForzaPaginaPrima.forEach(i => indiciForzati.add(`${bloccoFlowable.id}:${i}`));
                            }
                        }
                        continue;
                    }
                    // Riga normale (dati prova, tabella colpi, grafico, foto, titolo/testo...):
                    // un'unica unità indivisibile come sempre, ma ora misurata per davvero invece
                    // che data per scontata — è esattamente questo il pezzo che mancava (buildPaginaRigheHtml
                    // non misurava mai queste righe).
                    const html = buildRigheSottoinsiemeHtml([row], ctx, cols, margineRiga);
                    if (!html) continue;
                    const misurati = await misuraFigliPerStampaMm(html, mrg);
                    misurati.forEach(el => atomi.push({ html: el.html, mm: el.mm, categoriaIndex: null }));
                }
                return { atomi, indiciForzati, margins: mrg };
            }

            /** Impagina UNA pagina del template su tante pagine fisiche REALI quante ne servono
             * davvero — mai una stima, mai una speranza che il browser la spezzi bene da solo.
             * Unico punto d'ingresso per QUALUNQUE pagina del template (con o senza tabelle lunghe,
             * con una riga sola o con dieci): sostituisce sia il vecchio buildPaginaRigheHtml sia il
             * ramo speciale per i blocchi flowable scritto nelle sessioni precedenti (ancora
             * presenti più sotto per ora, rimossi nella Fase 3 della riscrittura). */
            async function costruisciPagineTemplateUnificato(pageDef, ctx, margins, provaNr, isLastOfDoc, headerEnabled, footerEnabled) {
                const { atomi, indiciForzati, margins: mrg } = await costruisciAtomiPaginaTemplate(pageDef, ctx, margins);
                if (atomi.length === 0) return { pagine: [], pageCount: 0 };
                // Fase A del piano di unificazione (vedi Piano_Riscrittura_Layout_Export.md e
                // calcolaBudgetPaginaMm): questo era uno dei 6+ punti che ricalcolavano a mano
                // "297 - margini [- piè di pagina]" — ora l'unica fonte è quella funzione, condivisa
                // anche con l'editor (mostraLineaFinePaginaA4/renderTemplateEditorCanvas), così i due
                // non possono più disallinearsi come successo finora (bug storico: "alcune categorie
                // di tabelle sono state escluse... si trovavano molto in prossimità dei margini ma
                // comunque all'interno della grandezza dell'A4").
                const { riservaFooterMm, areaStampabileMm, limiteImpaginazioneMm: maxAltezzaPaginaMm } = calcolaBudgetPaginaMm(mrg, footerEnabled);
                const pagineContenuto = impaginaBlocchiSuPagineFisiche(atomi, maxAltezzaPaginaMm, indiciForzati);
                const maxHeightMm = areaStampabileMm.toFixed(2);
                const numPagineFisiche = pagineContenuto.length;
                const pagine = pagineContenuto.map((contenutoHtml, i) => {
                    // distribuisciSpazioVerticale (stesso comportamento di sempre, vedi
                    // buildPaginaRigheHtml): ha senso solo se la pagina del template resta UNA sola
                    // pagina fisica — se il contenuto reale ne richiede più di una, "distribuire lo
                    // spazio residuo" non è più un concetto sensato (non c'è "spazio residuo" su una
                    // pagina già piena), quindi si applica solo quando numPagineFisiche === 1.
                    // height:100% invece del vecchio "flex:1 1 auto": quel valore aveva senso solo
                    // dentro un genitore flex, che qui non c'è mai stato — la distribuzione dello
                    // spazio verticale era quindi silenziosamente inattiva in stampa (giustamente
                    // segnalato: "il PDF non è la copia del template"). Ora il foglio ha un'altezza
                    // certa, quindi "occupa tutta l'altezza e distribuisci lo spazio tra le righe" è
                    // finalmente un'istruzione ben definita e fa davvero quello che dice.
                    const contenutoAvvolto = (numPagineFisiche === 1 && pageDef.distribuisciSpazioVerticale)
                        ? `<div style="height:100%; display:flex; flex-direction:column; justify-content:space-between;">${contenutoHtml}</div>`
                        : contenutoHtml;
                    const corpo = buildPaginaHeaderFooterHtml(pageDef, 0, 0, contenutoAvvolto, false, headerEnabled, footerEnabled);
                    const pageLabel = `Prova ${provaNr || '?'} — pagina ${i + 1}/${numPagineFisiche}`;
                    // FOGLIO RIGIDO (vedi il commento esteso in getReportPrintStyleBlock): non più
                    // un blocco con min-height che il browser poteva far crescere e spezzare da sé
                    // — causa unica e dimostrata delle pagine bianche e del piè di pagina fuori
                    // posto — ma un .dpsh-sheet di dimensioni fisiche esatte e immutabili. Il salto
                    // pagina non è più calcolato qui (era "isLastOfDoc && isUltimaFisica"): lo
                    // gestisce la regola CSS .dpsh-sheet:last-child, che vale strutturalmente
                    // sull'ULTIMO foglio reale del documento — l'unico modo per non sbagliarlo
                    // quando più prove vengono concatenate in un Report Completo, dove ogni prova
                    // credeva di essere l'ultima. isUltimaFisica resta usato sopra per il resto.
                    // padding-bottom sull'INNER (non sul foglio): riserva lo spazio in cui il piè
                    // di pagina, fuori dal flusso, si disegna senza che il contenuto ci finisca
                    // sopra — e "bottom:0" del piè di pagina ora si appoggia al bordo interno del
                    // margine inferiore di QUESTO foglio, mai più al bordo di un blocco cresciuto.
                    return `<div class="dpsh-sheet" data-tpl-report-page="1" data-tpl-max-height-mm="${maxHeightMm}" data-tpl-page-label="${escapeHtmlDidascalia(pageLabel)}" style="font-family: var(--tpl-font, Arial, sans-serif);"><div class="dpsh-sheet-inner" style="padding-bottom:${riservaFooterMm}mm;">${corpo}</div></div>`;
                });
                return { pagine, pageCount: pagine.length };
            }
            // ===================== FINE MOTORE UNIFICATO (FASE 1) =====================

            // FASE 17: REPORT COMPLETO (report di campo + tabelle Parametri Avanzati) PER L'INTERO PROGETTO
            // Costruisce, per una singola prova, il blocco scheda di campo (colpi/Rpd/litologia/foto) seguito
            // dalle tabelle Riepilogo e Dettagliata dei parametri avanzati (se lo strato ha intervalli assegnati).
            /** LA PROVA SINTETICA DEL CAPITOLO INTRODUTTIVO.
             *
             * «Si comporta esattamente come tutte le altre prove» non e' una descrizione: e' la
             * strategia. Passando dalla stessa funzione delle prove, il capitolo eredita gratis
             * fogli A4 rigidi, margini del template, intestazione, pie' di pagina, indice, PDF e
             * Word. Qualunque altra strada sarebbe una SECONDA impaginazione da tenere allineata
             * alla prima — e questo progetto quel prezzo lo ha gia' pagato una volta.
             *
             * Zero misurazioni e zero foto: che l'intera catena di calcolo lo regga e' stato
             * verificato PRIMA di costruirci sopra qualunque cosa (test/prova_vuota.js). */
            function provaSinteticaIntroduzione(proj) {
                const prima = Object.values(proj.surveys || {})[0] || {};
                const intro = (proj && proj.introduzione) || {};
                return {
                    id: '__introduzione__',
                    eIntroduzione: true,
                    // L'intestazione porta i dati del CANTIERE: servono ai blocchi che li mostrano,
                    // per esempio l'inquadramento, che senza coordinate non disegnerebbe nulla.
                    header: {
                        comune: proj.comune || '',
                        localita: proj.localita || '',
                        committente: proj.committente || '',
                        date: proj.date || '',
                        provaNr: '',
                        lat: (prima.header && prima.header.lat) || null,
                        lng: (prima.header && prima.header.lng) || null
                    },
                    instrument: JSON.parse(JSON.stringify(prima.instrument || state.instrument || {})),
                    settings: JSON.parse(JSON.stringify(prima.settings || state.settings || {})),
                    logs: [], photos: [], strati: [],
                    reportTemplateId: intro.templateId || 'classico'
                };
            }

            /** NUMERA LE PAGINE DEL DOCUMENTO FINITO.
             *
             * Il tentativo precedente numerava dentro il template e usciva sbagliato: un blocco
             * lungo che sforava la sua pagina logica traboccava sulla pagina fisica successiva
             * per impaginazione nativa, e quel foglio in piu' non lasciava nessun marcatore da
             * contare (35 numerate contro 56 vere).
             *
             * Adesso il conteggio e' corretto per una ragione precisa: ogni pagina e' un FOGLIO
             * RIGIDO (.dpsh-sheet, 210x297mm, overflow nascosto). Nessun contenuto puo' piu'
             * traboccare oltre il suo foglio, quindi un foglio nel documento e' una pagina nel
             * PDF — e contarli e' finalmente la stessa cosa che numerarli.
             *
             * Si numera alla FINE, sul documento assemblato: e' l'unico momento in cui esiste
             * davvero il totale. */
            /** Legge le voci dell'indice DAL DOCUMENTO GIA' ASSEMBLATO.
             *
             * E' l'unico modo per avere numeri di pagina veri: si contano i fogli, e i titoli si
             * prendono dove sono finiti davvero, non dove il template diceva che sarebbero
             * andati. Ogni foglio e' rigido, quindi un foglio = una pagina.
             *
             * Regola contro i doppioni: se una sezione contiene blocchi Titolo, l'indice usa
             * QUELLI; se non ne ha nessuno, usa la riga della sezione ("Prova N° 3"). Elencare
             * entrambi darebbe "Introduzione" e subito sotto "1. INTRODUZIONE".
             *
             * `offsetPagine` e' 1 quando davanti c'e' la pagina dell'indice, che sposta tutto. */
            function raccogliVociIndice(corpoHtml, sezioni, offsetPagine) {
                const doc = new DOMParser().parseFromString('<div id="r">' + (corpoHtml || '') + '</div>', 'text/html');
                const fogli = Array.from(doc.getElementById('r').querySelectorAll('.dpsh-sheet'));
                const voci = [];
                let foglioCorrente = 0;
                (sezioni || []).forEach(sez => {
                    const primoFoglio = foglioCorrente;
                    const ultimoFoglio = foglioCorrente + (sez.pageCount || 1);
                    const titoli = [];
                    for (let k = primoFoglio; k < ultimoFoglio && k < fogli.length; k++) {
                        fogli[k].querySelectorAll('[data-titolo-indice]').forEach(el => {
                            const testo = (el.textContent || '').replace(/\s+/g, ' ').trim();
                            if (!testo) return;
                            titoli.push({
                                etichetta: testo,
                                livello: parseInt(el.getAttribute('data-titolo-indice'), 10) || 1,
                                id: sez.id,
                                pagina: k + 1 + (offsetPagine || 0)
                            });
                        });
                    }
                    if (titoli.length > 0) {
                        voci.push.apply(voci, titoli);
                    } else {
                        voci.push({
                            etichetta: sez.etichetta || ('Prova N° ' + sez.numero),
                            livello: 1,
                            id: sez.id,
                            numero: sez.numero,
                            pagina: primoFoglio + 1 + (offsetPagine || 0)
                        });
                    }
                    foglioCorrente = ultimoFoglio;
                });
                return voci;
            }

            /** NUMERA LE FIGURE E RISOLVE I RIFERIMENTI, sul documento assemblato.
             *
             * Perche' qui e non prima: mentre si costruisce una prova alla volta non si sa
             * quante figure la precedono, ne' in che capitolo si e' finiti. Tre prove
             * darebbero tre "Figura 1", e un "fig. 1.1" scritto a mano nel testo resterebbe
             * fermo mentre il documento gli cambia sotto.
             *
             * La numerazione segue i CAPITOLI, cioe' i titoli di primo livello: dopo
             * "1. INTRODUZIONE" le figure sono 1.1, 1.2; dopo "2. PROVE..." ripartono da 2.1.
             * E' la convenzione delle relazioni geologiche, ed e' anche quella che rende un
             * riferimento leggibile senza cercarlo. Se il documento non ha titoli di primo
             * livello — un fascicolo di sole prove — si torna alla numerazione continua 1, 2, 3:
             * inventare capitoli che nessuno ha scritto sarebbe peggio.
             *
             * Un riferimento punta alla PRIMA FIGURA CHE LO SEGUE. E' come si scrive davvero
             * ("nel sito individuato in fig. 1.1" e sotto la mappa), e toglie all'utente il
             * compito di tenere il conto — che e' esattamente il compito che sbaglia sempre. */
            function numeraFigureERisolviRiferimenti(html) {
                if (!html || (html.indexOf('data-figura-numero') === -1 && html.indexOf('data-rif-figura') === -1)) return html;
                const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
                const r = doc.getElementById('r');
                // Un solo querySelectorAll: restituisce gli elementi in ORDINE DI DOCUMENTO, che
                // e' esattamente l'ordine di lettura di cui c'e' bisogno.
                const nodi = Array.from(r.querySelectorAll('[data-titolo-indice], [data-figura-numero], [data-rif-figura]'));
                const conCapitoli = nodi.some(n => n.getAttribute('data-titolo-indice') === '1');

                // PRIMA PASSATA: si numerano le figure e si prende nota di dove stanno.
                // Prima la numerazione e la risoluzione erano un solo giro in avanti, e per
                // questo un riferimento poteva puntare soltanto a qualcosa che veniva DOPO:
                // «vedi l'inquadramento» in fondo al capitolo era impossibile da scrivere.
                // Il FOGLIO su cui sta ogni nodo: serve a preferire una figura della stessa
                // pagina quando due sono ugualmente vicine — vedi figuraPiuVicina.
                const fogli = Array.from(r.querySelectorAll('.dpsh-sheet'));
                const foglioDi = (nodo) => fogli.indexOf(nodo.closest('.dpsh-sheet'));

                const figure = [];
                let capitolo = 0, contatore = 0;
                nodi.forEach((nodo, posizione) => {
                    if (nodo.hasAttribute('data-titolo-indice')) {
                        if (nodo.getAttribute('data-titolo-indice') === '1') { capitolo++; contatore = 0; }
                        return;
                    }
                    if (nodo.hasAttribute('data-rif-figura')) return;
                    contatore++;
                    const numero = (conCapitoli && capitolo > 0) ? (capitolo + '.' + contatore) : String(contatore);
                    nodo.textContent = numero;
                    const contenitore = nodo.closest('[data-figura-ancora]');
                    const ancora = contenitore ? contenitore.getAttribute('data-figura-ancora') : null;
                    if (contenitore && ancora) contenitore.setAttribute('id', ancora);
                    figure.push({
                        posizione, numero, ancora, foglio: foglioDi(nodo),
                        ruolo: contenitore ? (contenitore.getAttribute('data-figura-ruolo') || 'figura') : 'figura',
                        blocco: contenitore ? (contenitore.getAttribute('data-figura-blocco') || '') : ''
                    });
                });

                /** LA PIU' VICINA, in qualunque direzione.
                 *
                 * Non «la prima che segue»: in un Report Completo lo stesso template si ripete
                 * per ogni prova, quindi la stessa figura esiste N volte, e «la foto della
                 * prova» deve voler dire quella DI QUESTA prova. Guardando solo in avanti, il
                 * riferimento della prima prova finiva sulla foto della seconda — un rimando
                 * sbagliato, e per giunta plausibile: nessuno se ne accorge rileggendo.
                 * Siccome le pagine di una prova sono contigue, la piu' vicina e' sempre la sua.
                 *
                 * «Vicina» si misura prima di tutto in FOGLI: una figura sulla stessa pagina
                 * batte una a pari distanza di nodi ma su un'altra: e' li' che passa il confine
                 * fra una prova e la successiva. A parita' anche di foglio vince quella che
                 * segue, perche' e' come si scrive («si veda la figura seguente»). */
                function figuraPiuVicina(posizione, foglio, ammessa) {
                    let scelta = null, meglio = null;
                    for (const f of figure) {
                        if (!ammessa(f)) continue;
                        const punteggio = [
                            Math.abs(f.foglio - foglio),
                            Math.abs(f.posizione - posizione),
                            f.posizione > posizione ? 0 : 1
                        ];
                        if (!meglio || punteggio[0] < meglio[0]
                            || (punteggio[0] === meglio[0] && punteggio[1] < meglio[1])
                            || (punteggio[0] === meglio[0] && punteggio[1] === meglio[1] && punteggio[2] < meglio[2])) {
                            scelta = f; meglio = punteggio;
                        }
                    }
                    return scelta;
                }

                // SECONDA PASSATA: ogni riferimento cerca la SUA figura.
                nodi.forEach((nodo, posizione) => {
                    if (!nodo.hasAttribute('data-rif-figura')) return;
                    // Qualunque cosa non sia «ruolo:» o «blocco:» vale «seguente». Serve perche'
                    // i template salvati prima di oggi portano scritto data-rif-figura="1", e
                    // devono continuare a comportarsi come sempre.
                    const bersaglio = String(nodo.getAttribute('data-rif-figura') || 'seguente');
                    const modo = bersaglio.indexOf('ruolo:') === 0 ? 'ruolo'
                               : (bersaglio.indexOf('blocco:') === 0 ? 'blocco' : 'seguente');
                    let ammessa;
                    if (modo === 'ruolo') {
                        const ruolo = bersaglio.slice(6);
                        ammessa = f => f.ruolo === ruolo;
                    } else if (modo === 'blocco') {
                        const blocco = bersaglio.slice(7);
                        ammessa = f => f.blocco === blocco;
                    } else {
                        // «seguente» resta letterale: solo in avanti, com'e' sempre stato.
                        ammessa = f => f.posizione > posizione;
                    }
                    const bersagliata = figuraPiuVicina(posizione, foglioDi(nodo), ammessa);
                    if (!bersagliata) {
                        // Un riferimento senza figura non resta un "fig. ?" muto: diventa un dato
                        // mancante, contato e visibile come tutti gli altri. In un PDF firmato
                        // «fig. ?» e' un errore che nessuno rilegge.
                        nodo.setAttribute('data-mancante', '1');
                        nodo.className = (nodo.className || '') + ' dato-mancante';
                        nodo.textContent = modo === 'seguente' ? '[figura assente]'
                            : (modo === 'ruolo' ? '[manca ' + bersaglio.slice(6) + ']' : '[figura non trovata]');
                        nodo.removeAttribute('data-rif-figura');
                        return;
                    }
                    nodo.textContent = 'fig. ' + bersagliata.numero;
                    if (bersagliata.ancora) {
                        const link = doc.createElement('a');
                        link.setAttribute('href', '#' + bersagliata.ancora);
                        link.setAttribute('style', 'color:inherit; text-decoration:none;');
                        link.textContent = nodo.textContent;
                        nodo.textContent = '';
                        nodo.appendChild(link);
                    }
                    nodo.removeAttribute('data-rif-figura');
                });
                return r.innerHTML;
            }

            function numeraPagineDocumento(html) {
                if (!html) return html;
                const doc = new DOMParser().parseFromString('<div id="r">' + html + '</div>', 'text/html');
                const r = doc.getElementById('r');
                const fogli = Array.from(r.querySelectorAll('.dpsh-sheet'));
                if (fogli.length === 0) return html;
                fogli.forEach((foglio, i) => {
                    const dentro = foglio.querySelector('.dpsh-sheet-inner') || foglio;
                    // position:relative sul foglio e' gia' garantito dal suo stile; il numero va
                    // in fondo al FOGLIO, non in fondo al contenuto, altrimenti su una pagina
                    // corta finirebbe a mezz'aria.
                    const n = doc.createElement('div');
                    n.setAttribute('data-numero-pagina', String(i + 1));
                    n.setAttribute('style', 'position:absolute; left:0; right:0; bottom:6mm; text-align:center; font-size:9px; color:#64748b; font-family:Arial,Helvetica,sans-serif;');
                    n.textContent = 'Pagina ' + (i + 1) + ' di ' + fogli.length;
                    dentro.appendChild(n);
                });
                return r.innerHTML;
            }

            async function buildCompleteReportHtml(projId, opzioni) {
                if (!projId || !state.projects[projId]) return null;
                const proj = state.projects[projId];
                // survIds/includiIndice (richiesti esplicitamente dalla nuova schermata di
                // esportazione PDF: "poter selezionare quali prove inserire" + indice opzionale):
                // opzionali, di default TUTTE le prove del progetto e indice sempre incluso, per non
                // rompere l'unico altro chiamante rimasto (exportProjectCompleteReportWord).
                const survIdsFiltro = opzioni && Array.isArray(opzioni.survIds) ? new Set(opzioni.survIds) : null;
                let survList = Object.values(proj.surveys || {});
                if (survIdsFiltro) survList = survList.filter(s => survIdsFiltro.has(s.id));
                if (survList.length === 0) return null;
                // Con il capitolo introduttivo anche una prova sola produce DUE sezioni: l'indice
                // torna ad avere senso, e la condizione conta le sezioni vere invece delle prove.
                const sezioniPreviste = survList.length + ((opzioni && opzioni.includiIntroduzione) ? 1 : 0);
                const includiIndice = (!opzioni || opzioni.includiIndice !== false) && sezioniPreviste > 1;

                // Sezione automatica Riepilogo/Dettagliata/Allegato RIMOSSA (richiesto
                // esplicitamente: "l'export finale dev'essere basato SOLO su quello che viene
                // scritto nelle impostazioni del template e niente più. Tutte le altre cose... sono
                // da considerarsi legacy, obsolete e da eliminare"). Prima, per le prove il cui
                // template NON includeva già quelle tabelle come blocchi, questa funzione le
                // costruiva comunque da zero con margini/font/stile FISSI, mai letti dal template —
                // esattamente il tipo di contenuto "inventato" che non doveva esistere. Ora: se una
                // tabella Riepilogo/Dettagliata/Allegato deve comparire nel PDF di una prova, va
                // messa come blocco nel template di quella prova — a quel punto esce già da sola,
                // con la sua vera impaginazione, dentro fieldResult.html qui sotto (vedi
                // buildSurveyReportHtml), senza bisogno di nessuna sezione aggiuntiva qui.

                // Precalcolo della pagina di partenza di OGNI prova RIMOSSO (Fase 3 della
                // riscrittura): serviva solo a passare paginaGlobaleIniziale/totalPagineDocumento a
                // buildSurveyReportHtml per il "Pagina X di Y" a piè di pagina — la numerazione è
                // stata tolta del tutto da tempo (richiesto esplicitamente), quei due parametri
                // erano già vestigiali/mai letti, quindi questo precalcolo (basato su
                // stimaPagineProva, una STIMA non reale) era lavoro sprecato ad ogni export.
                const sezioni = [];

                // IL CAPITOLO INTRODUTTIVO, in testa a tutto. Entra ed esce come una sezione
                // qualunque: da qui in poi il resto del codice non sa nemmeno che e' diverso.
                if (opzioni && opzioni.includiIntroduzione) {
                    const survIntro = provaSinteticaIntroduzione(proj);
                    const introResult = await buildSurveyReportHtml(survIntro, proj, false);
                    sezioni.push({
                        numero: '',
                        id: survIntro.id,
                        etichetta: 'Introduzione',
                        html: introResult.html,
                        pageCount: introResult.pageCount
                    });
                }

                for (let i = 0; i < survList.length; i++) {
                    const surv = survList[i];

                    const fieldResult = await buildSurveyReportHtml(surv, proj, false);

                    const numero = (surv.header && surv.header.provaNr) || (i + 1);
                    // Il <div style="page-break-after:always"> che avvolgeva OGNI prova è stato
                    // RIMOSSO: era una seconda sorgente di salti pagina che si sommava a quella dei
                    // fogli. Ogni .dpsh-sheet porta già il proprio salto, quindi quel wrapper ne
                    // aggiungeva uno in più dopo l'ultimo foglio di ogni prova — un foglio bianco
                    // tra una prova e la successiva in ogni Report Completo multi-prova. Senza
                    // wrapper i fogli restano inoltre figli DIRETTI della pila, condizione perché
                    // la regola .dpsh-sheet:last-child (niente salto dopo l'ultimo foglio del
                    // documento, quindi niente foglio bianco finale) individui davvero l'ultimo.
                    sezioni.push({
                        numero,
                        id: surv.id,
                        html: fieldResult.html,
                        pageCount: fieldResult.pageCount
                    });
                }

                // Pagina indice: se inclusa è sempre la 1 del documento, quindi la prima prova parte
                // da pagina 2 (altrimenti da pagina 1). id passato a ogni riga (vedi
                // buildIndiceReportCompletoHtml): serve a costruire il link cliccabile verso
                // l'ancora <a id="prova-report-{id}"> messa a inizio prova da buildSurveyReportHtml.
                // L'INDICE SI COSTRUISCE DAL DOCUMENTO GIA' ASSEMBLATO, non da un elenco tenuto
                // in parallelo: i titoli si leggono dove sono finiti davvero e le pagine si
                // contano sui fogli veri. Un indice ricavato dalle intenzioni invece che dal
                // risultato e' un indice che prima o poi mente.
                const corpoHtml = sezioni.map(s => s.html).join('');
                const vociIndice = includiIndice ? raccogliVociIndice(corpoHtml, sezioni, 1) : [];
                // Le figure si numerano PRIMA dell'indice: cosi' un titolo dell'indice puo'
                // anche essere una figura, e comunque i riferimenti nel testo sono gia' risolti
                // quando il documento viene consegnato al resto della catena.
                const corpoNumerato = numeraFigureERisolviRiferimenti(corpoHtml);
                let pagesHtml = (includiIndice ? buildIndiceReportCompletoHtml(proj, vociIndice, stileIndiceDelProgetto(proj)) : '') + corpoNumerato;
                // La numerazione arriva per ultima, quando il documento e' completo di indice:
                // e' l'unico momento in cui il totale esiste davvero.
                if (opzioni && opzioni.numeraPagine) pagesHtml = numeraPagineDocumento(pagesHtml);
                const totalPageCount = (includiIndice ? 1 : 0) + sezioni.reduce((sum, s) => sum + s.pageCount, 0);

                return { proj, survList, pagesHtml, totalPageCount };
            }

            async function exportProjectCompleteReportWord(projId) {
                try {
                    const result = await buildCompleteReportHtml(projId);
                    if (!result) {
                        alert('Nessuna prova presente nel progetto da esportare.');
                        return;
                    }
                    const { proj, pagesHtml } = result;
                    const projName = proj.name || proj.comune || 'Progetto';

                    const docHtml = costruisciDocumentoWord(
                        `Report Completo - ${projName}`,
                        `<h1>Report Completo — ${projName}</h1>${pagesHtml}`
                    );
                    const blob = new Blob(['﻿' + docHtml], { type: 'application/msword' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Report_Completo_${projName.replace(/\s+/g, '_')}.doc`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate(30);
                } catch(e) {
                    alert('Errore durante la generazione del Report Completo (Word): ' + e.message);
                }
            }

            // FUNZIONE PER SCARICARE LE FOTO JPEG (.jpg) DELLA PROVA
            async function downloadAllSurveyPhotosJpg() {
                const photos = state.photos || [];
                if (photos.length === 0) {
                    alert('Nessuna foto allegata a questa prova!');
                    return;
                }

                for (let i = 0; i < photos.length; i++) {
                    const p = photos[i];
                    const pUrl = p.dataUrl || photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : '');
                    if (pUrl) {
                        const a = document.createElement('a');
                        a.href = pUrl;
                        a.download = `${p.name || 'Foto_Cantiere_' + (i+1)}.jpg`;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        await new Promise(res => setTimeout(res, 200));
                    }
                }
            }

            // PULSANTE DOWNLOAD FOTO SINGOLA (nella finestra di dettaglio foto)
            const btnDownloadSinglePhotoJpg = document.getElementById('btnDownloadSinglePhotoJpg');

            if (btnDownloadSinglePhotoJpg) {
                btnDownloadSinglePhotoJpg.addEventListener('click', async () => {
                    if (currentPreviewPhotoIdx >= 0 && state.photos && state.photos[currentPreviewPhotoIdx]) {
                        const p = state.photos[currentPreviewPhotoIdx];
                        const pUrl = p.dataUrl || photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : '');
                        if (pUrl) {
                            const a = document.createElement('a');
                            a.href = pUrl;
                            a.download = `${p.name || 'Foto_Cantiere_' + (currentPreviewPhotoIdx+1)}.jpg`;
                            document.body.appendChild(a);
                            a.click();
                            document.body.removeChild(a);
                            triggerVibrate([30, 30]);
                        }
                    }
                });
            }

            // MODAL FLUTTUANTE FOTO PROVA
            const btnOpenSurveyPhotosModal = document.getElementById('btnOpenSurveyPhotosModal');
            const modalSurveyPhotosOverlay = document.getElementById('modalSurveyPhotosOverlay');
            const modalSurveyPhotos = document.getElementById('modalSurveyPhotos');
            const btnClosePhotosModalX = document.getElementById('btnClosePhotosModalX');
            const btnCancelPhotosModal = document.getElementById('btnCancelPhotosModal');
            const fileCameraInputModal = document.getElementById('fileCameraInputModal');
            const fileGalleryInputModal = document.getElementById('fileGalleryInputModal');

            function openSurveyPhotosModal() {
                if (modalSurveyPhotosOverlay) modalSurveyPhotosOverlay.classList.add('open');
                if (modalSurveyPhotos) modalSurveyPhotos.classList.add('open');
                renderPhotoGallery();
            }

            function closeSurveyPhotosModal() {
                if (modalSurveyPhotosOverlay) modalSurveyPhotosOverlay.classList.remove('open');
                if (modalSurveyPhotos) modalSurveyPhotos.classList.remove('open');
            }

            if (btnOpenSurveyPhotosModal) btnOpenSurveyPhotosModal.addEventListener('click', openSurveyPhotosModal);
            if (btnClosePhotosModalX) btnClosePhotosModalX.addEventListener('click', closeSurveyPhotosModal);
            if (btnCancelPhotosModal) btnCancelPhotosModal.addEventListener('click', closeSurveyPhotosModal);
            if (modalSurveyPhotosOverlay) modalSurveyPhotosOverlay.addEventListener('click', closeSurveyPhotosModal);

            // IDEA 4: import multiplo con interpolazione lineare delle coordinate mancanti.
            // Se viene scelto un solo file si comporta come l'import singolo classico.
            async function handleGalleryBatchFiles(fileList) {
                const files = Array.from(fileList || []);
                if (files.length === 0) return;

                if (files.length === 1) {
                    handlePhotoFileSelected(files[0], fileGalleryInputModal);
                    return;
                }

                const progressEl = document.getElementById('lblBatchImportProgress');
                if (progressEl) {
                    progressEl.style.display = 'block';
                    progressEl.textContent = `Analisi 0/${files.length} foto in corso...`;
                }

                const entries = [];
                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (progressEl) progressEl.textContent = `Analisi ${i + 1}/${files.length} foto in corso...`;

                    const arrBuf = await file.arrayBuffer();
                    let exifData = { lat: null, lng: null, dateTimeOriginal: null };
                    try { exifData = parseExifData(arrBuf); } catch (e) { ignoraErrore('handleGalleryBatchFiles', e); }

                    const dataUrl = await new Promise((resolve) => {
                        const r = new FileReader();
                        r.onload = (e) => resolve(e.target.result);
                        r.onerror = () => resolve(null);
                        r.readAsDataURL(file);
                    });
                    if (!dataUrl) continue;

                    const exifTs = parseExifDateStr(exifData.dateTimeOriginal);
                    entries.push({
                        dataUrl,
                        lat: exifData.lat,
                        lng: exifData.lng,
                        ts: exifTs !== null ? exifTs : (file.lastModified || Date.now()),
                        hasExifGps: exifData.lat !== null && exifData.lng !== null,
                        hasRealTimestamp: exifTs !== null,
                        gpsSource: (exifData.lat !== null && exifData.lng !== null) ? 'exif' : null
                    });
                }

                // Ordina cronologicamente (necessario per una corretta interpolazione)
                entries.sort((a, b) => a.ts - b.ts);

                let interpolatedCount = 0;
                let inheritedCount = 0;
                for (let i = 0; i < entries.length; i++) {
                    if (entries[i].lat !== null && entries[i].lng !== null) continue;

                    let prevIdx = -1, nextIdx = -1;
                    for (let j = i - 1; j >= 0; j--) { if (entries[j].lat !== null) { prevIdx = j; break; } }
                    for (let j = i + 1; j < entries.length; j++) { if (entries[j].lat !== null) { nextIdx = j; break; } }

                    if (prevIdx !== -1 && nextIdx !== -1 && entries[i].hasRealTimestamp) {
                        const tPrev = entries[prevIdx].ts, tNext = entries[nextIdx].ts;
                        const span = tNext - tPrev;
                        const t = span > 0 ? (entries[i].ts - tPrev) / span : 0;
                        entries[i].lat = entries[prevIdx].lat + (entries[nextIdx].lat - entries[prevIdx].lat) * t;
                        entries[i].lng = entries[prevIdx].lng + (entries[nextIdx].lng - entries[prevIdx].lng) * t;
                        entries[i].gpsSource = 'interpolata';
                        interpolatedCount++;
                    } else if (prevIdx !== -1) {
                        entries[i].lat = entries[prevIdx].lat;
                        entries[i].lng = entries[prevIdx].lng;
                        entries[i].gpsSource = 'ereditata';
                        inheritedCount++;
                    } else if (liveGpsWatch.lat !== null) {
                        entries[i].lat = liveGpsWatch.lat;
                        entries[i].lng = liveGpsWatch.lng;
                        entries[i].gpsSource = 'live';
                    } else if (state.header.lat !== null && state.header.lat !== undefined && state.header.lat !== '') {
                        entries[i].lat = state.header.lat;
                        entries[i].lng = state.header.lng;
                        entries[i].gpsSource = 'cantiere';
                    }
                }

                if (!state.photos) state.photos = [];
                let withGpsCount = 0;
                // Import MULTIPLO: i fallimenti si accumulano e si avvisa una volta sola alla fine.
                // Un avviso per foto trasformerebbe l'import di 40 immagini in 40 finestre da
                // chiudere — l'utente le chiuderebbe a raffica senza leggerle, che è esattamente il
                // modo in cui un avviso importante smette di funzionare.
                const fotoNonSalvate = [];
                for (let idx = 0; idx < entries.length; idx++) {
                    const entry = entries[idx];
                    const photoId = 'photo_' + Date.now() + '_' + idx;
                    const tsDate = new Date(entry.ts || Date.now());
                    const timeStr = tsDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    if (entry.lat !== null && entry.lng !== null) withGpsCount++;
                    state.photos.push({
                        id: photoId,
                        dataUrl: entry.dataUrl,
                        lat: entry.lat,
                        lng: entry.lng,
                        alt: state.header.alt,
                        hasExifGps: entry.hasExifGps,
                        gpsSource: entry.gpsSource,
                        timestamp: `${tsDate.toLocaleDateString()} ${timeStr}`,
                        scattataIl: tsDate.toISOString()
                    });
                    const alSicuro = await salvaFotoConGaranzia(photoId, entry.dataUrl);
                    if (!alSicuro) fotoNonSalvate.push({ id: photoId, dataUrl: entry.dataUrl, nome: `Foto_importata_${idx + 1}` });
                }

                saveState();
                updateUI();
                if (fotoNonSalvate.length > 0) await avvisaFotoNonSalvate(fotoNonSalvate);
                if (typeof renderPhotoGallery === 'function') renderPhotoGallery();
                triggerVibrate([40, 60, 40]);

                if (progressEl) progressEl.style.display = 'none';

                // Tutte con le loro coordinate: toast. Coordinate ricavate o mancanti: dialogo.
                const righe = [];
                if (interpolatedCount > 0) righe.push(`${interpolatedCount} interpolate tra due foto vicine.`);
                if (inheritedCount > 0) righe.push(`${inheritedCount} ereditate dalla foto precedente più vicina.`);
                if (withGpsCount < entries.length) righe.push(`${entries.length - withGpsCount} foto restano senza coordinate: puoi assegnarle manualmente aprendole dalla galleria.`);
                toastODialogo(`Importazione completata: ${withGpsCount}/${entries.length} foto con coordinate`, righe.join('\n'));
            }

            if (fileCameraInputModal) {
                fileCameraInputModal.addEventListener('change', (e) => {
                    handlePhotoFileSelected(e.target.files[0], fileCameraInputModal);
                });
            }
            if (fileGalleryInputModal) {
                fileGalleryInputModal.addEventListener('change', (e) => {
                    handleGalleryBatchFiles(e.target.files);
                    fileGalleryInputModal.value = '';
                });
            }

