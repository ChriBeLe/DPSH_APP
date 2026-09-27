            // =========================================================================
            // EXPORT — Tabelle "Riepilogo" e "Dettagliata", stesso formato/colori del
            // file originale (verificato riga per riga su Nardò_DPSH1.ods). Itera su
            // TUTTE le prove del progetto corrente, non solo quella aperta.
            // =========================================================================

            /** Calcola dinamicamente font-size/padding di una tabella "a colonne" (una colonna per
             * strato) in base a quante colonne dati ha, cosi resta compatta e leggibile su A4
             * invece di sforare la larghezza pagina quando gli strati sono tanti. Segnala anche
             * se il numero di righe è alto abbastanza da rendere normale (e preferibile) che la
             * tabella prosegua su più pagine invece di essere forzata a stare su una sola. */
            function autoFitTabellaExport(numColonneDati, numRighe){
                let fontSize = 11, padV = 6, padH = 8;
                if (numColonneDati >= 9) { fontSize = 7.5; padV = 3; padH = 4; }
                else if (numColonneDati >= 7) { fontSize = 8.5; padV = 3.5; padH = 5; }
                else if (numColonneDati >= 5) { fontSize = 9.5; padV = 4.5; padH = 6; }
                else if (numColonneDati >= 3) { fontSize = 10.5; padV = 5; padH = 7; }
                // Il padding VERTICALE (unico che cambia "l'altezza delle righe") è un calc() che
                // legge --tpl-riga-scale (richiesto esplicitamente: la maniglia di ridimensionamento
                // per i blocchi di testo/tabelle deve toccare SOLO lo spazio tra le righe, non più
                // font/larghezze via zoom) — quello orizzontale resta un px fisso, non c'entra con
                // "l'altezza delle righe".
                const padding = `calc(${padV}px * var(--tpl-riga-scale, 1)) ${padH}px`;
                const isLong = numRighe > 24;
                return { fontSize, padding, tableClass: isLong ? 'tbl-long' : 'tbl-nosplit' };
            }
            /** Colonna etichetta più larga quando ci sono poche colonne dati, più stretta (ma mai
             * sotto una soglia leggibile) quando gli strati sono tanti e lo spazio va condiviso. */
            function larghezzaColonnaEtichetta(numColonneDati){
                return Math.max(14, 30 - numColonneDati * 1.4);
            }

            /** Stessa idea di autoFitTabellaExport ma per tabelle a "colonne fisse e tante righe"
             * (es. registro colpi): qui è il numero di RIGHE a decidere il font, per restare
             * compatti su prove profonde con molti intervalli invece di allungare il report
             * inutilmente, e a decidere se è normale che la tabella prosegua su più pagine. */
            function autoFitTabellaRighe(numRighe, sogliaLunga = 28){
                let fontSize = 10, padV = 5, padH = 6;
                if (numRighe > 70) { fontSize = 8; padV = 3; padH = 4; }
                else if (numRighe > 45) { fontSize = 8.7; padV = 3.5; padH = 4.5; }
                else if (numRighe > 25) { fontSize = 9.3; padV = 4; padH = 5; }
                // Stessa logica di autoFitTabellaExport: solo il padding VERTICALE risponde a
                // --tpl-riga-scale (richiesto esplicitamente).
                const padding = `calc(${padV}px * var(--tpl-riga-scale, 1)) ${padH}px`;
                const isLong = numRighe > sogliaLunga;
                return { fontSize, padding, tableClass: isLong ? 'tbl-long' : 'tbl-nosplit' };
            }

            // bordoExp non include più il padding (che ora varia per tabella in base al numero
            // di colonne, vedi autoFitTabellaExport) né white-space:nowrap (che con
            // table-layout:fixed avrebbe fatto traboccare la tabella invece di andare a capo).
            // GRIGLIA REGOLABILE PER BLOCCO (richiesta esplicitamente): i quattro lati sono ora
            // scritti separatamente e leggono due variabili CSS, invece di un "border" unico e
            // fisso. Il valore di fallback dentro var() è esattamente il bordo di prima, quindi
            // senza nessuna scelta esplicita l'aspetto resta identico a sempre — le variabili le
            // imposta solo il blocco che ha scelto una griglia diversa (vedi
            // stileGrigliaTabellaBlocco, applicato sul contenitore del blocco sia nell'editor sia
            // in stampa). Nota: sono i bordi IN LINEA a contare qui, non la regola "th,td" del
            // foglio di stampa — un bordo in linea vince sempre su una regola CSS esterna, quindi
            // vanno resi variabili proprio qui, altrimenti spegnere la griglia non avrebbe effetto.
            const bordoExp = 'border-top:var(--tpl-bordo-h, 1px solid #999);border-bottom:var(--tpl-bordo-h, 1px solid #999);border-left:var(--tpl-bordo-v, 1px solid #999);border-right:var(--tpl-bordo-v, 1px solid #999);';
            // color:#1e293b (quasi nero) SEMPRE esplicito, non lasciato all'ambiente (richiesto
            // esplicitamente, bug segnalato: su sfondo colorato il testo diventava illeggibile) —
            // senza questo, un <th> qui dentro ereditava "color:#fff" dalla regola generica
            // th{...} del foglio di stile di stampa (vedi getReportPrintStyleBlock, pensata per i
            // <th> "nudi" senza sfondo colorato proprio), sparendo su sfondi chiari come questi.
            const thExp = (colore, padding) => `style="${bordoExp}padding:${padding};${colore?`background:#${colore};`:''}color:#1e293b;font-weight:700;text-align:left;"`;
            const tdExp = (colore, padding) => `style="${bordoExp}padding:${padding};${colore?`background:#${colore};`:''}color:#1e293b;text-align:right;"`;
            const tdlExp = (colore, padding) => `style="${bordoExp}padding:${padding};${colore?`background:#${colore};`:''}color:#1e293b;text-align:left;"`;
            // colspan numerico esplicito (dati.length + 1 colonna etichetta): "100%" non è un
            // valore valido per l'attributo colspan e veniva silenziosamente trattato come 1
            // dai browser, restringendo la riga di sezione a una sola colonna invece di tutta
            // la larghezza della tabella.
            const tsecExp = (colore, padding, colspan) => `style="${bordoExp}padding:${padding};background:#${colore};font-weight:700;" colspan="${colspan}"`;

            /** Una sola riga di intestazione: la stringa combinata "Comune/Località/Cliente/Data
             * indagine" + il nome di ogni strato. La vecchia riga sopra ("Tabelle/Parametri - PROVA
             * N°X" + "strato 1/2/3", richiesto RIMOSSA esplicitamente, "va eliminata da qualsiasi
             * tipo di tabella, è inutile" — segnalata con screenshot) era pura ridondanza: le
             * etichette generiche "strato N" delle sue colonne sono le STESSE colonne di questa
             * riga, che però porta già il nome VERO di ogni strato — nessuna informazione persa. */
            function intestazioneColonneExp(dati, padding, titoloTabella, numeroProva, header){
                const C = COLORI_EXPORT;
                const h = header || {};
                // escapeHtmlDidascalia su comune/località/cliente/nome strato (bug segnalato in un
                // audit: sono tutti campi di testo libero dell'utente, mai sfuggiti qui prima —
                // un nome strato o un comune contenente letteralmente "</table>" avrebbe corrotto sia
                // il DOM sia, ora, il taglio per categoria a livello di stringa fatto da
                // filtraCategorieHtmlFlowable, che riconosce le mini-tabelle di categoria cercando
                // proprio "<table...>...</table>" — lo stesso identico bug del blocco vuoto, aperto
                // da una porta diversa). Data non serve: formattaDataIT non restituisce mai testo
                // libero dell'utente.
                const infoStr = `Comune: ${escapeHtmlDidascalia(h.comune || '-')}<br>Località: ${escapeHtmlDidascalia(h.localita || '-')}<br>Cliente: ${escapeHtmlDidascalia(h.committente || '-')}<br>Data indagine: ${formattaDataIT(h.date) || '-'}`;
                const rigaNomi = `<tr><th ${thExp(C.condizioni, padding)}>${infoStr}</th>${dati.map(d=>`<th ${thExp(C.condizioni, padding)}>${escapeHtmlDidascalia(d.strato.name)}</th>`).join('')}</tr>`;
                return rigaNomi;
            }

            function colgroupExp(numColonneDati){
                return `<colgroup><col style="width:${larghezzaColonnaEtichetta(numColonneDati)}%">${Array(numColonneDati).fill('<col>').join('')}</colgroup>`;
            }

            function htmlTabellaRiepilogo(dati, numeroProva, header){
                const C = COLORI_EXPORT;
                const { fontSize, padding, tableClass } = autoFitTabellaExport(dati.length, 18 + ORDINE_PARAMETRI.length);
                const riga = (etichetta, celle, colore) => `<tr><td ${thExp(colore, padding)}>${etichetta}</td>${celle.map(v=>`<td ${tdExp(colore, padding)}>${v}</td>`).join('')}</tr>`;

                let righe = '';
                righe += riga('profondità [m]', dati.map(d=>fmtIT(d.agg.profonditaA,1)), C.preElaborazione);
                righe += riga('spessore [m]', dati.map(d=>fmtIT(d.ris.preElaborazione.spessore,1)), C.preElaborazione);
                righe += riga('in falda', dati.map(d=>d.ris.preElaborazione.inFalda), C.preElaborazione);
                righe += riga("Nspt medio'", dati.map(d=>fmtIT(d.ris.preElaborazione.nsptFalda)), C.preElaborazione);
                righe += riga('Rpd [kg/cm²]', dati.map(d=>fmtIT(d.agg.rpdMedio)), C.preElaborazione);
                righe += riga("σ'v0 [t/m²]", dati.map(d=>fmtIT(d.ris.preElaborazione.sigmaV0)), C.preElaborazione);
                righe += riga('incoerente', dati.map(d=>d.agg.isIncoerente?'SI':'NO'), C.preElaborazione);
                righe += riga('coesivo', dati.map(d=>d.agg.isCoesivo?'SI':'NO'), C.preElaborazione);
                righe += riga('Stato di consistenza (A.G.I. 1977)', dati.map(d=>d.ris.preElaborazione.statoConsistenza??'N/D'), C.condizioni);
                // Peso di volume: due righe separate secco/saturo (bug segnalato esplicitamente:
                // l'etichetta "secco ^ saturo V" precedente usava "^"/"V" come finte frecce su/giù,
                // illeggibile) — stessa struttura a righe distinte già usata dalla tabella
                // Dettagliata/Allegato e dall'export Excel (vedi popolaWorksheetRiepilogo), nessuna
                // nuova convenzione introdotta.
                righe += riga('Peso di volume secco [t/m³]', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSecco)), C.pesoDiVolume);
                righe += riga('Peso di volume saturo [t/m³]', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSaturo)), C.pesoDiVolume);
                for(const catId of ORDINE_PARAMETRI){
                    righe += riga(ETICHETTE_PARAMETRO[catId].compatta, dati.map(d=>fmtIT(d.ris.categorie[catId].selezionato?.valore)), C[catId]);
                }
                righe += riga('Coefficiente K0', dati.map(d=>fmtIT(d.ris.derivati.K0,3)), C.resistenzaCompressione);
                righe += riga('Coefficiente di Poisson', dati.map(d=>fmtIT(d.ris.derivati.poisson,3)), C.resistenzaCompressione);
                righe += riga('Res. compr. qu [kg/cm²]', dati.map(d=>fmtIT(d.ris.derivati.qu,3)), C.resistenzaCompressione);

                return `<table class="${tableClass}" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:calc(${fontSize}px * var(--tpl-font-scale, 1));width:100%;table-layout:fixed;">
                    ${colgroupExp(dati.length)}
                    <thead>${intestazioneColonneExp(dati, padding, 'Parametri', numeroProva, header)}</thead>
                    <tbody>${righe}</tbody>
                </table>`;
            }

            /** Inserisce data-riga-categoria="j" nella prima riga <tr> di una stringa HTML (le
             * righe costruite da riga()/rigaAutoreSolo() qui e in buildAllegatoHtml iniziano
             * sempre con "<tr>" senza attributi propri, quindi questa sostituzione è sicura) —
             * serve alla divisione intelligente per riga (vedi trovaRigheCheEntranoInCategoria/
             * applicaVisibilitaRigheCategoria) per poter nascondere/misurare UNA riga alla volta
             * invece dell'intera categoria. */
            function conIndiceRiga(trHtml, indice) {
                return trHtml.replace('<tr>', `<tr data-riga-categoria="${indice}">`);
            }
            /** Costruisce la mini-tabella di UNA categoria: intestazione colorata dentro un vero
             * <thead> (o null se questa categoria non ha una riga di titolo propria — vedi
             * buildAllegatoHtml categoria 0) e le sue righe dati in un <tbody> a parte, ciascuna
             * marcata con l'indice di riga. Ogni categoria è una <table> A SÉ (non più un <tbody>
             * dentro un'unica tabella condivisa) perché HTML permette un solo <thead> per
             * <table>: è l'UNICO modo per far ripetere nativamente in stampa l'intestazione di
             * una categoria quando entra su una pagina nuova. margin-top:-1px fonde visivamente il
             * bordo di questa tabella con quello della precedente, così la sequenza di mini-tabelle
             * resta indistinguibile da un'unica tabella continua. primaTabella=true evita quel
             * margine negativo (non c'è una tabella prima con cui fondersi) e usa <caption>
             * nessuno — è lo stile normale della prima riga. */
            function costruisciTabellaCategoria(indice, headerRowHtml, righeArr, colgroupHtml, tableClass, cssFontSize, primaTabella) {
                const righeHtml = righeArr.map((tr, j) => conIndiceRiga(tr, j)).join('');
                // break-inside:avoid sul <tbody data-righe-categoria>: una categoria non entra MAI
                // spezzata a metà in stampa, si sposta tutta alla pagina dopo — richiesto
                // esplicitamente come regola assoluta, senza eccezioni ("non deve mai accadere che
                // siano spezzate le righe di una stessa categoria"; la precedente opzione opt-in
                // "divisione intelligente" che rimuoveva questo vincolo è stata rimossa perché
                // produceva tagli senza senso, es. subito dopo la riga "solo autore" e prima di
                // tutte le sue righe di dati).
                return `<table data-categoria-index="${indice}" class="${tableClass}" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:${cssFontSize};width:100%;table-layout:fixed;${primaTabella ? '' : 'margin-top:-1px;'}">
                    ${colgroupHtml}
                    ${headerRowHtml ? `<thead>${headerRowHtml}</thead>` : ''}
                    <tbody data-righe-categoria style="break-inside:avoid; page-break-inside:avoid;">${righeHtml}</tbody>
                </table>`;
            }
            function htmlTabellaDettagliata(dati, numeroProva, header){
                const C = COLORI_EXPORT;
                const numRighe = 13 + ORDINE_PARAMETRI.length * 4;
                const { fontSize, padding, tableClass } = autoFitTabellaExport(dati.length, numRighe);
                const cssFontSize = `calc(${fontSize}px * var(--tpl-font-scale, 1))`;
                const riga = (etichetta, celle, allineaDestra=false) => `<tr><td ${thExp(null, padding)}>${etichetta}</td>${celle.map(v=>`<td ${allineaDestra?tdExp(null, padding):tdlExp(null, padding)}>${v}</td>`).join('')}</tr>`;
                const sezioneHeader = (titolo, colore) => `<tr><th colspan="${dati.length + 1}" ${thExp(colore, padding)}>${titolo}</th></tr>`;

                // Ogni categoria è {titolo, colore, righe:[...]} invece di una stringa HTML piatta:
                // costruisciTabellaCategoria ne fa una mini-tabella a sé (vedi commento lì sopra).
                const gruppi = [];

                gruppi.push({ titolo: 'Condizioni e tipologia', colore: C.condizioni, righe: [
                    riga('profondità [m]', dati.map(d=>fmtIT(d.agg.profonditaA,1)), true),
                    riga('spessore [m]', dati.map(d=>fmtIT(d.ris.preElaborazione.spessore,1)), true),
                    riga('Nspt medio', dati.map(d=>fmtIT(d.agg.nsptGrezzo)), true),
                    riga('in falda', dati.map(d=>d.ris.preElaborazione.inFalda)),
                    riga("Nspt medio'", dati.map(d=>fmtIT(d.ris.preElaborazione.nsptFalda)), true),
                    riga('Rpd [kg/cm²]', dati.map(d=>fmtIT(d.agg.rpdMedio)), true),
                    riga("σ'v0 [t/m²]", dati.map(d=>fmtIT(d.ris.preElaborazione.sigmaV0)), true),
                    riga('incoerente', dati.map(d=>d.agg.isIncoerente?'SI':'NO')),
                    riga('coesivo', dati.map(d=>d.agg.isCoesivo?'SI':'NO')),
                    riga('stato di consistenza (A.G.I. 1977)', dati.map(d=>d.ris.preElaborazione.statoConsistenza??'N/D'))
                ]});

                gruppi.push({ titolo: 'Peso unità di volume [t/m³]', colore: C.pesoDiVolume, righe: [
                    riga('autore', dati.map(d=>d.ris.categorie.pesoDiVolume.selezionato?.autore??'N/D')),
                    riga('valore (secco)', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSecco)), true),
                    riga('valore (saturo)', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSaturo)), true)
                ]});

                for(const catId of ORDINE_PARAMETRI){
                    gruppi.push({ titolo: ETICHETTE_PARAMETRO[catId].estesa, colore: C[catId], righe: [
                        riga('autore', dati.map(d=>d.ris.categorie[catId].selezionato?.autore??'N/D')),
                        riga('terreno', dati.map(d=>d.ris.categorie[catId].selezionato?.terreno??'N/D')),
                        riga('valore', dati.map(d=>fmtIT(d.ris.categorie[catId].selezionato?.valore)), true)
                    ]});
                }

                gruppi.push({ titolo: 'Resistenza a compressione', colore: C.resistenzaCompressione, righe: [
                    riga("K0 (da φ')", dati.map(d=>fmtIT(d.ris.derivati.K0,3)), true),
                    riga("Poisson (da φ')", dati.map(d=>fmtIT(d.ris.derivati.poisson,3)), true),
                    riga('qu [kg/cm²]', dati.map(d=>fmtIT(d.ris.derivati.qu,3)), true)
                ]});

                const colgroupHtml = colgroupExp(dati.length);
                // classe "chunk-titolo-glue" (vedi costruisciPagineParametriAvanzati): questa riga di
                // sole intestazioni colonna (comune/data/strati) non deve mai restare da sola in
                // fondo a una pagina fisica con le sue categorie rimandate a quella successiva.
                // data-titolo-tabella-blocco: marca questa tabella come "titolo/info prova" del
                // blocco, NON una categoria — serve solo nell'EDITOR (vedi
                // filtraCategorieHtmlFlowable/miniaturaPaginaContinuazione) per escluderla sulle
                // pagine di continuazione: il titolo non deve mai ripetersi, deve comparire una
                // volta sola sulla pagina di origine (richiesto esplicitamente: "non deve mai
                // ripetersi l'intestazione"). Nell'export non serve (impaginaBlocchiSuPagineFisiche/
                // fondiTitoliConSuccessivo la incolla già, una volta sola, alla prima categoria).
                const tabellaTitolo = `<table data-titolo-tabella-blocco="1" class="chunk-titolo-glue" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:${cssFontSize};width:100%;table-layout:fixed;">
                    ${colgroupHtml}
                    <thead>${intestazioneColonneExp(dati, padding, 'Tabelle', numeroProva, header)}</thead>
                </table>`;
                const corpoTabelle = gruppi.map((grp, i) => costruisciTabellaCategoria(i, sezioneHeader(grp.titolo, grp.colore), grp.righe, colgroupHtml, tableClass, cssFontSize, false)).join('');

                return tabellaTitolo + corpoTabelle;
            }

