            // =========================================================================
            // ALLEGATO — Compendio delle formule di correlazione: NON servono formule nuove.
            // Ogni categoria (CATEGORIE, usata dal wizard/Parametri Avanzati) contiene già TUTTI
            // i candidati/autori — l'app oggi mostra solo quello selezionato; qui si iterano
            // TUTTI i candidati "master" e per ciascuno si va a cercare, per ogni strato, il
            // valore già calcolato in dati[i].ris.categorie[catId].candidati (stessa formula,
            // stesso contesto ctx) — "#N/D" quando quella formula non è applicabile alla natura
            // (granulare/coesiva) di quello strato specifico.
            // =========================================================================

            /** Trova, tra i candidati già calcolati per uno strato, quello che corrisponde
             * esattamente ad autore+terreno del candidato "master" di CATEGORIE_PER_ID. */
            function candidatoAllegato(datiStrato, catId, autore, terreno){
                const arr = (datiStrato.ris.categorie[catId] && datiStrato.ris.categorie[catId].candidati) || [];
                return arr.find(c => c.autore === autore && c.terreno === terreno);
            }

            function buildAllegatoHtml(dati, numeroProva, header){
                const C = COLORI_EXPORT;
                const { fontSize, padding, tableClass } = autoFitTabellaExport(dati.length, 200);
                const cssFontSize = `calc(${fontSize}px * var(--tpl-font-scale, 1))`;
                const cellStyle = (colore, extra) => `style="${bordoExp}padding:${padding};${colore?`background:#${colore};`:''}color:#1e293b;${extra||''}"`;
                const riga = (etichetta, celle, colore) => `<tr><td ${cellStyle(colore, 'text-align:left;font-weight:700;')}>${etichetta}</td>${celle.map(v=>`<td ${cellStyle(colore, 'text-align:right;')}>${v}</td>`).join('')}</tr>`;
                const rigaAutoreSolo = (autore) => `<tr><td ${cellStyle(null, 'text-align:left;font-style:italic;font-weight:700;')}>${autore}</td>${dati.map(()=>`<td ${cellStyle(null,'')}></td>`).join('')}</tr>`;
                const sezioneHeader = (titolo, colore) => `<tr><th colspan="${dati.length + 1}" ${cellStyle(colore, 'font-weight:800;text-align:left;')}>${titolo}</th></tr>`;

                // Ogni voce di "gruppi" diventa una mini-tabella a sé, con la propria intestazione
                // colorata in un vero <thead> (vedi costruisciTabellaCategoria) invece di
                // un'unica sequenza piatta di <tr>: richiesto esplicitamente dopo aver notato una
                // categoria spezzata a metà tra due pagine in stampa senza che si vedesse più a
                // quale categoria appartenevano le righe rimaste sulla pagina successiva. La
                // categoria 0 (descrizione/profondità) non ha una riga di titolo propria — è
                // sempre stata così, il vero titolo della colonna è "Stratigrafia [m]" nella
                // testata generale — quindi si appoggia alla STESSA mini-tabella della testata
                // invece di averne una a parte (vedi tabellaTitolo sotto, headerRowHtml=rigaHeader
                // passato lì, non qui).
                const gruppi = [];

                gruppi.push({ titolo: null, colore: null, righe: [
                    riga('descrizione', dati.map(d=>escapeHtmlDidascalia(d.strato.name)), C.intestazione),
                    riga('da metri', dati.map(d=>fmtIT(d.agg.profonditaDa,1)), C.preElaborazione),
                    riga('a metri', dati.map(d=>fmtIT(d.agg.profonditaA,1)), C.preElaborazione),
                    riga('spessore', dati.map(d=>fmtIT(d.ris.preElaborazione.spessore,1)), C.preElaborazione),
                    riga('Nspt medio', dati.map(d=>fmtIT(d.agg.nsptGrezzo)), C.preElaborazione)
                ]});

                gruppi.push({ titolo: 'Condizioni e tipologia', colore: C.condizioni, righe: [
                    riga('in falda', dati.map(d=>d.ris.preElaborazione.inFalda)),
                    riga("Nspt medio'", dati.map(d=>fmtIT(d.ris.preElaborazione.nsptFalda))),
                    riga('Rpd [kg/cm²]', dati.map(d=>fmtIT(d.agg.rpdMedio))),
                    riga('prof. media strato [m]', dati.map(d=>fmtIT(d.ris.preElaborazione.profonditaMedia,2))),
                    riga("σ'v0 [t/m²]", dati.map(d=>fmtIT(d.ris.preElaborazione.sigmaV0))),
                    riga('incoerente', dati.map(d=>d.agg.isIncoerente?'SI':'NO')),
                    riga('coesivo', dati.map(d=>d.agg.isCoesivo?'SI':'NO')),
                    riga('stato di consistenza (A.G.I. 1977)', dati.map(d=>d.ris.preElaborazione.statoConsistenza??'N/D'))
                ]});

                // Peso di volume: ogni candidato calcola {secco,saturo} invece di un valore singolo.
                const righePeso = [];
                CATEGORIE_PER_ID.pesoDiVolume.candidati.forEach(mc => {
                    righePeso.push(rigaAutoreSolo(mc.autore));
                    righePeso.push(riga('peso secco', dati.map(d=>{
                        const f = candidatoAllegato(d, 'pesoDiVolume', mc.autore, mc.terreno);
                        return (f && f.valore) ? fmtIT(f.valore.secco) : '#N/D';
                    })));
                    righePeso.push(riga('peso saturo', dati.map(d=>{
                        const f = candidatoAllegato(d, 'pesoDiVolume', mc.autore, mc.terreno);
                        return (f && f.valore) ? fmtIT(f.valore.saturo) : '#N/D';
                    })));
                });
                gruppi.push({ titolo: 'Peso unità di volume [t/m³]', colore: C.pesoDiVolume, righe: righePeso });

                // Tutte le altre categorie: un valore per candidato, righe raggruppate per autore
                // (l'autore compare come riga a sé solo se ha più varianti di "terreno").
                const righeCandidati = (catId) => {
                    const master = CATEGORIE_PER_ID[catId].candidati;
                    const righe = [];
                    let autoreCorrente = null;
                    master.forEach(mc => {
                        const valori = dati.map(d => {
                            const f = candidatoAllegato(d, catId, mc.autore, mc.terreno);
                            return f ? fmtIT(f.valore) : '#N/D';
                        });
                        if (mc.terreno == null) {
                            righe.push(riga(mc.autore, valori));
                            autoreCorrente = null;
                        } else {
                            if (mc.autore !== autoreCorrente) { righe.push(rigaAutoreSolo(mc.autore)); autoreCorrente = mc.autore; }
                            righe.push(riga(mc.terreno, valori));
                        }
                    });
                    return righe;
                };
                gruppi.push({ titolo: 'Angolo di attrito [°]', colore: C.angoloAttrito, righe: righeCandidati('angoloAttrito') });
                gruppi.push({ titolo: 'Coesione non drenata [kg/cm²]', colore: C.coesioneNonDrenata, righe: righeCandidati('coesioneNonDrenata') });
                gruppi.push({ titolo: 'Modulo Elastico (Young) [kg/cm²]', colore: C.moduloElastico, righe: righeCandidati('moduloElastico') });
                gruppi.push({ titolo: 'Modulo Edometrico [kg/cm²]', colore: C.moduloEdometrico, righe: righeCandidati('moduloEdometrico') });
                gruppi.push({ titolo: 'Densità relativa [%]', colore: C.densitaRelativa, righe: righeCandidati('densitaRelativa') });
                gruppi.push({ titolo: 'Modulo di taglio [kg/cm²]', colore: C.moduloTaglio, righe: righeCandidati('moduloTaglio') });
                gruppi.push({ titolo: 'Resistenza punta CPT [kg/cm²]', colore: C.resistenzaCPT, righe: righeCandidati('resistenzaCPT') });

                gruppi.push({ titolo: 'Resistenza compressione [kg/cm²]', colore: C.resistenzaCompressione, righe: [
                    riga('qu', dati.map(d=>fmtIT(d.ris.derivati.qu,2)))
                ]});

                // Riga "strato 1/2/3" RIMOSSA (richiesta esplicitamente, "va eliminata da
                // qualsiasi tipo di tabella, è inutile" — segnalata con screenshot): duplicava in
                // etichette generiche le stesse colonne che la riga "descrizione" subito sotto
                // (prima riga di gruppi[0].righe) etichetta già con il nome VERO di ogni strato —
                // nessuna informazione persa. Al suo posto un titolo di sezione "Stratigrafia",
                // stesso stile a barra colorata di ogni altra categoria (sezioneHeader), invece di
                // un'eccezione strutturale solo per la categoria 0.
                const rigaHeader = sezioneHeader('Stratigrafia', C.intestazione);
                const colgroupHtml = colgroupExp(dati.length);
                // Categoria 0 condivide la mini-tabella della testata generale (vedi commento
                // sopra su gruppi[0].titolo===null): è la SUA <thead> a fare anche da titolo di
                // colonna, il suo <tbody data-righe-categoria> porta comunque data-categoria-index
                // ="0" così resta misurabile/nascondibile come le altre.
                const tabellaTitoloECategoria0 = costruisciTabellaCategoria(0, rigaHeader, gruppi[0].righe, colgroupHtml, tableClass, cssFontSize, true);
                const corpoTabelle = gruppi.slice(1).map((grp, i) => costruisciTabellaCategoria(i + 1, sezioneHeader(grp.titolo, grp.colore), grp.righe, colgroupHtml, tableClass, cssFontSize, false)).join('');

                // Titolo "Allegato N – Compendio delle formule..." RIMOSSO (richiesto
                // esplicitamente: "elimina quel maledetto titolo... che fotte spazio prezioso") —
                // occupava una riga intera solo per un'etichetta ridondante (il blocco si chiama già
                // "Allegato formule" nell'editor, e la didascalia/indice del report lo identificano
                // comunque). tabellaTitoloECategoria0 resta comunque il primo elemento del flusso,
                // quindi niente più necessità della classe "chunk-titolo-glue" qui: non c'è più un
                // titolo separato da tenere incollato al blocco successivo.
                return `${tabellaTitoloECategoria0}${corpoTabelle}`;
            }

