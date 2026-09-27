            // ===================== FASE C: AVVISI DI OVERFLOW REALI (vedi Piano_Riscrittura_Layout_Export.md) =====================
            // sincronizzaFlussiBlocchiLunghi qui sotto raggruppa le categorie SOLO per interruzione
            // manuale (griglia fissa, richiesto esplicitamente — vedi il suo commento) — quindi il
            // badge "P.N" del menu del blocco (elencoSegmentiPaginaBlocco sopra) è internamente
            // coerente ma non dice MAI se un gruppo senza interruzioni sta davvero in una pagina
            // fisica: può tranquillamente essere alto il triplo di una pagina e finire tagliato dalla
            // stampa nativa del browser in un punto che l'utente non sceglie — probabilmente la causa
            // reale delle "pagine bianche tra i blocchi" rincorse più volte in questa sessione.
            // Le funzioni sotto misurano DAVVERO (stesso iframe nascosto con CSS di stampa vero già
            // usato dal motore di export, misuraFigliPerStampaMm) quanti mm occupa ogni gruppo di
            // categorie tra due interruzioni manuali, e lo confrontano con lo spazio vero di una
            // pagina fisica (calcolaBudgetPaginaMm, la fonte unica della Fase A).
            /** Per UN blocco flowable: quanti mm occupa DAVVERO ciascun gruppo di categorie tra due
             * interruzioni manuali, e se supera lo spazio di una pagina fisica. Risponde sempre alla
             * stessa domanda, indipendente dal resto del documento: "questo gruppo, DA SOLO, sta in
             * una pagina intera?" — se la risposta è no, è GARANTITO che verrà spezzato dalla stampa
             * nativa (il layout, per scelta esplicita, non sposta mai una categoria per altezza),
             * qualunque sia la pagina su cui inizia. Non può invece escludere un overflow con
             * certezza assoluta (un gruppo che da solo sta in mezza pagina può comunque traboccare se
             * inizia a metà di una pagina già mezza piena — quello dipende dal resto del template,
             * territorio della Fase D): quando conferma un problema è sempre vero, quando non lo
             * conferma resta comunque una buona notizia parziale, non una garanzia totale. */
            async function calcolaAvvisiOverflowGruppiCategoria(blk) {
                // Esito vuoto condiviso da tutte le uscite anticipate: chi legge trova sempre la
                // stessa forma, senza dover distinguere "non calcolato" da "calcolato e vuoto".
                const VUOTO = { gruppi: [], mmPerCategoria: {}, limiteMm: 0 };
                if (!blk || blk.stack || !BLOCCHI_FLOWABLE.has(blk.type) || !templateEditorState.ctx) return VUOTO;
                const contenuto = blk.type === 'allegato-formule' ? (templateEditorState.ctx.allegatoHtml || '') : (templateEditorState.ctx.tabellaDettagliataHtml || '');
                if (!contenuto) return VUOTO;
                const numCategorie = elencoCategorieBlocco(blk.type).length;
                if (numCategorie === 0) return VUOTO;
                const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                const rigaScaleBlocco = blk.rigaScale || 1;
                const fontScaleBlocco = blk.fontScale || 1;
                let elementiMisurati;
                try {
                    elementiMisurati = await misuraFigliPerStampaMm(contenuto, mrg, rigaScaleBlocco, fontScaleBlocco);
                } catch (e) {
                    // Mai bloccare l'editor per un errore di misurazione: nessun avviso è meglio di
                    // un avviso sbagliato.
                    return VUOTO;
                }
                // Somma per indice di categoria REALE (data-categoria-index, non la posizione
                // nell'array): più di un elemento misurato può avere lo stesso indice (titolo +
                // tabella, vedi fondiTitoliConSuccessivo altrove) — qui basta sommare tutto ciò che
                // condivide l'indice, non serve fonderli in un solo elemento.
                const mmPerCategoria = {};
                elementiMisurati.forEach(el => {
                    if (el.categoriaIndex == null) return;
                    mmPerCategoria[el.categoriaIndex] = (mmPerCategoria[el.categoriaIndex] || 0) + el.mm;
                });
                // Stesso identico raggruppamento di sincronizzaFlussiBlocchiLunghi/
                // impaginaBlocchiSuPagineFisiche: un gruppo va da un'interruzione manuale (esclusa)
                // alla successiva (inclusa) — mai diviso per altezza, solo dall'utente.
                const indiciForzati = new Set(Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : []);
                const gruppi = [];
                let inizioGruppo = 0;
                for (let idx = 1; idx < numCategorie; idx++) {
                    if (indiciForzati.has(idx)) { gruppi.push({ da: inizioGruppo, a: idx - 1 }); inizioGruppo = idx; }
                }
                gruppi.push({ da: inizioGruppo, a: numCategorie - 1 });
                const { limiteImpaginazioneMm } = calcolaBudgetPaginaMm(mrg, templateEditorState.footerEnabled);
                if (!(limiteImpaginazioneMm > 0)) return VUOTO;
                const gruppiCalcolati = gruppi.map(g => {
                    let mmTotali = 0;
                    for (let i = g.da; i <= g.a; i++) mmTotali += (mmPerCategoria[i] || 0);
                    const paginePreviste = Math.max(1, Math.ceil(mmTotali / limiteImpaginazioneMm));
                    return { da: g.da, a: g.a, mmTotali, paginePreviste, supera: paginePreviste > 1 };
                });
                // I millimetri della SINGOLA categoria venivano sommati per gruppo e poi buttati via,
                // ma sono il dato che serve davvero per decidere dove tagliare: senza, l'avviso dice
                // "servono 2 pagine" e devi indovinare in quale punto mettere l'interruzione. Costano
                // zero (sono già stati misurati qui sopra), quindi escono insieme ai gruppi. Esce
                // anche il limite di pagina: serve a chi legge per capire quanto pesa una categoria
                // RISPETTO alla pagina, che è l'unico confronto che conta.
                return { gruppi: gruppiCalcolati, mmPerCategoria, limiteMm: limiteImpaginazioneMm };
            }
            /** Ricalcola gli avvisi di overflow per TUTTI i blocchi flowable del template aperto,
             * sulla stessa cadenza "a riposo" già usata da sincronizzaFlussiBlocchiLunghi (mai
             * durante drag/animazioni, vedi templateEditorState.flowSyncNecessario) — non blocca il
             * render che l'ha innescata: gira in background e aggiorna la cache
             * templateEditorState.avvisiOverflowPerBlocco quando pronta, letta poi in modo
             * sincrono da chi costruisce il menu del blocco. Le misurazioni sono in sequenza, mai in
             * parallelo (Promise.all): ognuna apre e chiude un proprio iframe nascosto (vedi
             * misuraFigliPerStampaMm), ma restano comunque tante chiamate pesanti — farle una alla
             * volta evita di sommergere il browser se il template ha più blocchi flowable insieme. */
            async function ricalcolaAvvisiOverflowTuttiBlocchi() {
                if (!templateEditorState || !Array.isArray(templateEditorState.pages)) return;
                const risultati = {};
                // Seconda cache, riempita dalla STESSA misurazione: i millimetri per categoria.
                // Tenerla separata invece di appenderla all'array degli avvisi lascia intatti i due
                // punti che leggono avvisiOverflowPerBlocco (badge sul canvas e menu del blocco).
                const misure = {};
                for (const page of templateEditorState.pages) {
                    for (const row of (page.rows || [])) {
                        for (const entry of (row.blocks || [])) {
                            if (entry.stack || !BLOCCHI_FLOWABLE.has(entry.type)) continue;
                            try {
                                const esito = await calcolaAvvisiOverflowGruppiCategoria(entry);
                                risultati[entry.id] = esito.gruppi;
                                misure[entry.id] = { perCategoria: esito.mmPerCategoria, limiteMm: esito.limiteMm };
                            } catch (e) {
                                risultati[entry.id] = [];
                                misure[entry.id] = null;
                            }
                        }
                    }
                }
                templateEditorState.avvisiOverflowPerBlocco = risultati;
                templateEditorState.mmCategoriePerBlocco = misure;
            }
            // ===================== FINE FASE C: AVVISI DI OVERFLOW REALI =====================

