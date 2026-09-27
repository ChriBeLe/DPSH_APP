            // =========================================================================
            // BLOCCHI "FLOWABLE" — Allegato Formule di Correlazione, Tabella Dettagliata
            // Parametri: tabelle naturalmente lunghissime (una riga per formula/candidato).
            // Richiesto esplicitamente: "voglio che l'editor si comporti come Word. Se aggiungo
            // un blocco che oltrepassa l'interruzione della pagina allora si deve creare una
            // nuova pagina che riporti il continuo di quel blocco. Non dev'essere un blocco a
            // parte ma lo stesso" — il blocco resta un UNICO oggetto in page.rows della sua
            // pagina di ORIGINE (mai duplicato), e "continua" su una catena di pagine automatiche
            // (page.autoContinuazione) che sanno solo "mostra il blocco X dalla categoria N alla
            // categoria M" (data-categoria-index, vedi buildAllegatoHtml/htmlTabellaDettagliata —
            // mai tagliato A META' di una categoria). Vedi anche BLOCCHI_FLOWABLE più sopra.
            // =========================================================================

            /** Cerca un blocco per id in TUTTE le pagine (non solo quella attiva) — serve a
             * ritrovare l'oggetto reale (voce) di un blocco flowable dalla sua pagina di
             * continuazione, che non lo possiede ma deve comunque renderizzarne il contenuto. */
            function trovaBloccoEPaginaPerId(blockId) {
                for (let pIdx = 0; pIdx < templateEditorState.pages.length; pIdx++) {
                    const pagina = templateEditorState.pages[pIdx];
                    for (const riga of (pagina.rows || [])) {
                        for (const entry of (riga.blocks || [])) {
                            if (entry.id === blockId) return { pagina, pageIdx: pIdx, riga, voce: entry };
                            if (entry.stack) {
                                const trovato = entry.stack.find(it => it.id === blockId);
                                if (trovato) return { pagina, pageIdx: pIdx, riga, voce: trovato };
                            }
                        }
                    }
                }
                return null;
            }

            /** Pagina VERA (con page.rows reali, mai []) a cui un blocco appartiene — richiesto
             * esplicitamente per poter usare il menù fluttuante anche dalle pagine di continuazione
             * ("vorrei poter modificare anche dal continuo"): se la pagina attualmente attiva è una
             * pagina di continuazione (page.rows sempre []), tutte le funzioni del menu che devono
             * MUTARE il blocco/riga (rowspan, rimozione, larghezza fissa, bilancia riga, ecc.) non
             * devono operare sulla pagina attiva ma su questa, la pagina di ORIGINE reale — trovata
             * via trovaBloccoEPaginaPerId (cerca in tutte le pagine). Fallback alla pagina attiva
             * solo se il blocco non si trova da nessuna parte (caso limite, non dovrebbe capitare). */
            function paginaOrigineBlocco(blockId) {
                const trovato = trovaBloccoEPaginaPerId(blockId);
                return trovato ? trovato.pagina : templateEditorState.pages[templateEditorState.activePageIdx];
            }

            /** Colore reale (stesso hex usato davvero in stampa, vedi COLORI_EXPORT/
             * htmlTabellaDettagliata/buildAllegatoHtml) della categoria "indice" per il tipo di
             * blocco dato — richiesto esplicitamente per il menu interruzioni di pagina: "le
             * categorie dovranno avere comunque i colori in modo che siano velocissime da capire
             * per l'utente senza leggerle una alla volta". elencoCategorieBlocco (sotto, più in
             * basso nel file) tiene solo {indice, etichetta}: qui si ricostruisce la stessa
             * sequenza SOLO per risalire al colore, senza duplicare le etichette. */
            function coloreCategoriaBlocco(tipo, indice) {
                const C = COLORI_EXPORT;
                if (tipo === 'tabella-dettagliata-parametri') {
                    if (indice === 0) return C.condizioni;
                    if (indice === 1) return C.pesoDiVolume;
                    if (indice >= 2 && indice <= 1 + ORDINE_PARAMETRI.length) return C[ORDINE_PARAMETRI[indice - 2]];
                    return C.resistenzaCompressione;
                }
                if (tipo === 'allegato-formule') {
                    if (indice === 0) return C.intestazione;
                    if (indice === 1) return C.condizioni;
                    if (indice === 2) return C.pesoDiVolume;
                    if (indice >= 3 && indice <= 2 + ORDINE_PARAMETRI.length) return C[ORDINE_PARAMETRI[indice - 3]];
                    return C.resistenzaCompressione;
                }
                return 'CBD5E1';
            }

            /** Segmenti pagina ATTUALI per un blocco flowable (richiesto esplicitamente: mostrare
             * nel menu, in modo passivo, dove il sistema ha già deciso di tagliare — "possiamo far
             * capire in automatico al sistema dove dovrebbe andare l'interruzione pagina? e solo
             * dopo far scegliere all'utente?"). Ricostruisce, dalla pagina di origine (trovata via
             * trovaBloccoEPaginaPerId) e dalla catena di pagine di continuazione che
             * sincronizzaFlussiBlocchiLunghi ha già calcolato e scritto su page.continuaDaCategoria/
             * page.continuaACategoria, l'elenco ordinato [{pageIdx, da, a}] che copre 0..numCategorie-1
             * senza buchi né sovrapposizioni. Sola lettura, nessuna misurazione DOM: usa solo lo
             * stato già calcolato dall'ultimo render. */
            function elencoSegmentiPaginaBlocco(blockId, tipo) {
                const trovato = trovaBloccoEPaginaPerId(blockId);
                if (!trovato) return [];
                const { pagina, pageIdx } = trovato;
                const numCategorie = elencoCategorieBlocco(tipo).length;
                if (pagina.flowableUltimaCategoriaMostrata == null) {
                    return [{ pageIdx, da: 0, a: numCategorie - 1 }];
                }
                const segmenti = [{ pageIdx, da: 0, a: pagina.flowableUltimaCategoriaMostrata }];
                let i = pageIdx + 1;
                while (i < templateEditorState.pages.length) {
                    const p = templateEditorState.pages[i];
                    if (!(p.autoContinuazione && p.continuaBloccoId === blockId)) break;
                    segmenti.push({ pageIdx: i, da: p.continuaDaCategoria || 0, a: p.continuaACategoria != null ? p.continuaACategoria : (numCategorie - 1) });
                    i++;
                }
                return segmenti;
            }

