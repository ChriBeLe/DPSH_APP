            // ===================== GENERATORE HTML PER SINGOLA PROVA =====================
            // USATO SIA DA PROVA SINGOLA CHE DA PROGETTO MULTI-PAGINA
            async function buildSurveyReportHtml(survData, projData, isMultiPage = false) {
                const h = survData.header || {};
                const inst = survData.instrument || {};
                const logs = survData.logs || [];
                const photos = survData.photos || [];
                const strati = (projData && projData.strati) || survData.strati || state.strati || [];

                const comune = h.comune || (projData ? projData.comune : 'Cantiere');
                const committente = h.committente || (projData ? projData.committente : 'Non specificato');
                const localita = h.localita || (projData ? projData.localita : 'Non specificata');
                const dateStr = h.date || (projData ? projData.date : new Date().toISOString().split('T')[0]);
                const provaNr = h.provaNr || '1';

                const maxD = logs.length > 0 ? Math.max(...logs.map(l => l.end)) : 0;
                const totalColpi = logs.reduce((sum, l) => sum + (l.colpi || 0), 0);
                const hasGps = !!(h.lat && h.lng);
                const gpsText = hasGps ? `${parseFloat(h.lat).toFixed(6)}°, ${parseFloat(h.lng).toFixed(6)}° (Acc: ±${h.acc ? parseFloat(h.acc).toFixed(1) : 'N.D.'}m)` : 'Non acquisite';

                // Inquadramento satellitare: mosaico con pin sulle coordinate esatte + barra di scala.
                const mapSatelliteHtml = hasGps ? buildInquadramentoSatellitareHtml(h.lat, h.lng, provaNr, 16) : '';

                // Dati per i box "PROVA N/DATI INDAGINE/STRUMENTO/STRATIGRAFICI", la tabella
                // Aste/Metri/COLPI/Nspt/Nspt'/Rpd e il grafico a 3 pannelli — stesso layout del
                // report di riferimento (nessuna intestazione aziendale, solo dati tecnici).
                const passoCm = parseFloat(survData.settings?.stepCm || state.settings.stepCm || 20);
                const falda = faldaDaHeader(h);
                const logsCalc = arricchisciLogsConNsptRpd(logs, inst, passoCm, falda);
                const stratiEff = stratiEffettiviProva(logs, strati, inst, passoCm, falda);
                const datiBoxHtml = buildDatiBoxHtml(provaNr, comune, localita, committente, dateStr, inst, passoCm, falda, stratiEff);
                const colpiTableHtml = buildColpiNsptTableHtml(logsCalc);
                const stratigrafiaChartHtml = stratiEff.length > 0 ? buildStratigrafiaColpiRpdSvg(stratiEff, logsCalc, provaNr, LARGH_GRAFICO_DEFAULT_PX, { falda }) : '';

                // Tabelle Riepilogo/Dettagliata/Allegato (parametri avanzati): stessi dati e
                // stesse funzioni già usate dall'export "Elaborazione Dati Speciali", ora
                // disponibili anche come blocchi componibili nel template della singola prova.
                const datiParametri = datiCalcolatiProva(survData, strati);
                const tabellaRiepilogoHtml = datiParametri.length > 0 ? htmlTabellaRiepilogo(datiParametri, provaNr, h) : '';
                const tabellaDettagliataHtml = datiParametri.length > 0 ? htmlTabellaDettagliata(datiParametri, provaNr, h) : '';
                const allegatoHtml = datiParametri.length > 0 ? buildAllegatoHtml(datiParametri, provaNr, h) : '';

                // Template assegnato a questa prova: va saputo PRIMA di costruire le pagine-foto
                // automatiche qui sotto (richiesto esplicitamente, bug segnalato: "c'è sempre una
                // foto extra che non ho piazzato come blocco") — se il template ha già dei blocchi
                // "Foto prova" piazzati a mano, quelle foto sono già mostrate LÌ (vedi
                // calcolaIndiciImmaginePerBlocco, assegna le foto ai blocchi in ordine 0,1,2...): le
                // pagine-foto automatiche devono coprire SOLO le foto "in eccesso" rispetto a quanti
                // blocchi ne ha piazzati il template, altrimenti la stessa foto compare due volte —
                // una nel blocco del layout, una ancora nella pagina automatica dopo. Prima di questa
                // correzione si ripetevano SEMPRE tutte, qualunque fosse il template.
                const templateId = getReportTemplateIdPerProva(survData);
                const template = state.reportTemplates[templateId];
                const usaTemplatePersonalizzato = template && Array.isArray(template.pages) && template.pages.length > 0;
                const immagineIndexPerBlocco = usaTemplatePersonalizzato ? calcolaIndiciImmaginePerBlocco(template.pages) : {};
                const numeroFotoGiaPiazzateDalTemplate = Object.keys(immagineIndexPerBlocco).length;

                // Pagine-foto automatiche RIMOSSE (richiesto esplicitamente: "l'export finale dev'
                // essere basato SOLO su quello che viene scritto nelle impostazioni del template e
                // niente più" — questa generazione automatica aveva sempre una cornice/didascalia
                // fisse, mai definite nel template). Una foto compare nel PDF solo se piazzata a
                // mano come blocco "Foto prova" nel template: le foto "in eccesso" restano salvate
                // nella prova ma non finiscono più nell'export.
                const fotoPagineHtml = '';
                const fotoRestanti = [];

                const paginaDatiHaSeguito = isMultiPage;

                let paginaDatiHtml;
                // Conteggio pagine "dati" (richiesto esplicitamente, per l'indice automatico del
                // Report Completo — vedi buildCompleteReportHtml): di default 1 (il layout fisso di
                // fallback, un unico div), sovrascritto sotto con template.pages.length quando si usa
                // un template personalizzato — stessa cifra già usata per il "Pagina X di Y" a piè di
                // pagina, nessuna nuova assunzione introdotta.
                let paginaDatiCount = 1;
                if (usaTemplatePersonalizzato) {
                    // I blocchi "Foto prova" del template NON caricano un'immagine libera: mostrano
                    // automaticamente le foto della PROVA (survData.photos), una per blocco in ordine
                    // di comparsa nel layout (vedi calcolaIndiciImmaginePerBlocco) — le URL vanno
                    // risolte qui, prima di costruire l'HTML della pagina, con lo stesso fallback su
                    // IndexedDB già usato per le pagine-foto automatiche (vedi buildFotoPaginaHtml):
                    // una foto scattata da poco può non avere ancora un dataUrl inline in memoria.
                    // risolviEComprimiFotoUrl (non solo la risoluzione dataUrl/cache/IndexedDB di
                    // sempre): ricomprime anche secondo la qualità scelta nella schermata di
                    // esportazione PDF (vedi impostazioniEsportazionePdf) — richiesto esplicitamente
                    // per portare giù il peso di PDF che arrivavano a 300Mb.
                    const photoUrls = await Promise.all((survData.photos || []).map(p => risolviEComprimiFotoUrl(p)));
                    // immagineIndexPerBlocco è già stato calcolato più sopra (serviva PRIMA, per
                    // sapere quante pagine-foto automatiche saltare) — riusato qui, non
                    // ricalcolato, unica fonte di verità.
                    const figureIndexPerBlocco = calcolaIndiciFigulaPerBlocco(template.pages);
                    const gpsInfo = hasGps ? { lat: h.lat, lng: h.lng, provaNr } : null;
                    const datiBoxRawParams = { numero: provaNr, comune, localita, committente, dateStr, inst, passoCm, falda, stratiEff };
                    const stratigrafiaChartRawParams = { stratiEff, logsCalc, provaNr };
                    const larghezzaUtileMm = calcolaBudgetPaginaMm(template && template.margins, template && template.footerEnabled).larghezzaUtileMm;
                    const ctx = { provaNr, gpsInfo, larghezzaUtileMm, datiBoxHtml, datiBoxRawParams, colpiTableHtml, stratigrafiaChartHtml, stratigrafiaChartRawParams, mapSatelliteHtml, tabellaRiepilogoHtml, tabellaDettagliataHtml, allegatoHtml, photoUrls, immagineIndexPerBlocco, figureIndexPerBlocco,
                        // Il progetto: senza, i tag del testo escono fra parentesi quadre in una
                        // relazione firmata. E' la stessa riga che mancava nell'anteprima.
                        projId: (projData && projData.id) || state.currentProjectId,
                        puntiProveProgetto: puntiProveDelProgetto(projData) };
                    // FASE 2 della riscrittura (vedi il blocco "MOTORE UNIFICATO DI IMPAGINAZIONE"
                    // più sotto in questo stesso file, subito dopo misuraAltezzaTotaleMm): non
                    // esistono più due rami separati (blocco flowable da solo vs pagina normale) —
                    // ogni pagina del template, qualunque cosa contenga, passa dalla stessa
                    // costruisciPagineTemplateUnificato, che la scompone in atomi misurati per
                    // davvero e la impagina su tante pagine fisiche quante servono. Sostituisce sia
                    // il vecchio codice ad hoc per i blocchi flowable (comprese le righe
                    // prima/dopo) sia buildPaginaRigheHtml (mai misurava nulla) per ogni pagina di
                    // ogni prova.
                    paginaDatiHtml = '';
                    let paginaDatiCountReale = 0;
                    for (let idx = 0; idx < template.pages.length; idx++) {
                        const pageDef = template.pages[idx];
                        const isUltimaPaginaDati = (idx === template.pages.length - 1);
                        const isLastOfDoc = isUltimaPaginaDati && !paginaDatiHaSeguito;
                        const risultatoPagina = await costruisciPagineTemplateUnificato(pageDef, ctx, pageDef.margins || template.margins, provaNr, isLastOfDoc, !!template.headerEnabled, !!template.footerEnabled);
                        paginaDatiHtml += risultatoPagina.pagine.join('');
                        paginaDatiCountReale += risultatoPagina.pageCount;
                    }
                    paginaDatiCount = paginaDatiCountReale;
                } else {
                    // Layout di ripiego fisso RIMOSSO (richiesto esplicitamente: "l'export finale
                    // dev'essere basato SOLO su quello che viene scritto nelle impostazioni del
                    // template e niente più" — questo layout era hardcoded, ignorava del tutto
                    // margini/font/colori del template ed era nato solo come prova per verificare
                    // che l'export funzionasse). Senza un template personalizzato valido assegnato
                    // (praticamente mai, dato che "classico" è di default un vero template a blocchi
                    // — vedi getReportTemplateIdPerProva) questa prova non genera più nessuna pagina
                    // "dati": nessun contenuto inventato al posto del template mancante.
                    paginaDatiHtml = '';
                    paginaDatiCount = 0;
                }

                // Restituisce anche il conteggio pagine, non solo l'HTML (richiesto esplicitamente,
                // per poter costruire un indice automatico nel Report Completo — vedi
                // buildCompleteReportHtml): tutti i chiamanti di questa funzione sono stati
                // aggiornati per leggere .html invece del vecchio valore-stringa diretto.
                // pageCount conta solo le pagine-foto AUTOMATICHE (fotoRestanti), non tutte le
                // photos.length: quelle già mostrate da un blocco "Foto prova" del template non
                // aggiungono una pagina in più — vedi il conteggio corretto più sopra.
                // id di ancoraggio (richiesto esplicitamente: "l'indice dev'essere cliccabile nel
                // pdf") — un <a id="..."> senza href, invisibile (nessuno stile), a inizio della
                // prova: il motore di stampa nativo del browser (vedi getIconSpriteHtml più sotto sul
                // perché window.print() è il meccanismo usato) converte i normali link HTML con
                // href="#ancora" in veri link cliccabili interni al PDF generato — nessuna libreria
                // PDF necessaria per questo, basta che l'ancora esista nel documento stampato.
                return { html: `<a id="prova-report-${survData.id}"></a>${paginaDatiHtml}${fotoPagineHtml}`, pageCount: paginaDatiCount + fotoRestanti.length };
            }

            // Le icone (<svg class="ico"><use href="#i-nome"/></svg>) puntano ai <symbol> definiti
            // nello sprite nascosto in cima al documento PRINCIPALE (id="iconSpriteDefs"). Ogni
            // finestra di stampa aperta con window.open('', '_blank') è però un documento a sé,
            // senza quello sprite: finché non viene reiniettato, ogni <use href="#i-..."> punta al
            // nulla e l'icona non compare — bug silenzioso presente in TUTTE le finestre di stampa
            // dell'app, non solo nel report della singola prova. Va incollata subito dopo <body>.
            function getIconSpriteHtml() {
                const sprite = document.getElementById('iconSpriteDefs');
                return sprite ? sprite.outerHTML : '';
            }

