            // =========================================================================
            // PAGINA PROVA — replica fedele del layout di riferimento (report Eurisko
            // caricato dall'utente, pag. 5): box "PROVA N/DATI INDAGINE/STRUMENTO/
            // STRATIGRAFICI" a sinistra, tabella Aste/Metri/COLPI/Nspt/Nspt'/Rpd a destra,
            // sotto un grafico a 3 pannelli (colonna stratigrafica + Colpi(N) + Rpd, entrambi
            // "a gradini" come un log di sondaggio). Nessuna intestazione aziendale: solo i
            // dati tecnici della prova.
            // =========================================================================

            /** Arricchisce ogni intervallo con Nspt/Nspt'/Rpd calcolati (riusati sia dalla
             * tabella che dal grafico, un solo calcolo). */
            function arricchisciLogsConNsptRpd(logs, instrument, stepCm, falda){
                const betaT = betaTStrumento(instrument, stepCm);
                return (logs || []).map(log => {
                    const { nsptGrezzo, nsptFalda } = nsptDiLog(log, betaT, falda);
                    return { ...log, nsptGrezzo, nsptFalda, rpd: rpdDiLog(log, instrument, stepCm) };
                });
            }

            /* ============ TINTE DEL BLOCCO "DATI PROVA" ============
             * Sette tinte, tutte tenui di proposito: questi box stanno dentro una relazione
             * geotecnica, non in una presentazione. `sfondo` è il colore pieno del box, `alt` la
             * riga alternata quando la zebratura è accesa (mezzo passo più scura, non un colore
             * diverso), `bordo` la cornice. L'azzurro è quello storico, identico al pixel: chi non
             * tocca niente non vede cambiare niente. */
            const TINTE_DATI_PROVA = {
                azzurro: { nome: 'Azzurro', sfondo: '#DCEEFB', alt: '#C9E3F7', bordo: '#9FCBEA' },
                grigio:  { nome: 'Grigio',  sfondo: '#EEF1F5', alt: '#DFE4EB', bordo: '#C2CBD6' },
                salvia:  { nome: 'Salvia',  sfondo: '#E4EFE5', alt: '#D2E5D5', bordo: '#A9CBB0' },
                sabbia:  { nome: 'Sabbia',  sfondo: '#F5EEE1', alt: '#EBE0CB', bordo: '#D9C6A3' },
                lilla:   { nome: 'Lilla',   sfondo: '#EAE7F5', alt: '#DBD6EE', bordo: '#BAB1DC' },
                cipria:  { nome: 'Cipria',  sfondo: '#F7E9E9', alt: '#EFD9D9', bordo: '#DDB6B6' },
                neutro:  { nome: 'Neutro',  sfondo: '#FFFFFF', alt: '#F1F4F7', bordo: '#CBD5E1' }
            };
            const TINTA_DATI_PROVA_DEFAULT = 'azzurro';
            function tintaDatiProva(chiave) { return TINTE_DATI_PROVA[chiave] || TINTE_DATI_PROVA[TINTA_DATI_PROVA_DEFAULT]; }

            /* ============ LE QUATTRO DISPOSIZIONI ============
             * Prima esisteva un solo booleano, `schedeOrizzontali`. Non bastava più: in orizzontale
             * DATI STRUMENTO ha dieci righe contro le quattro di DATI INDAGINE, e tre colonne di
             * altezza molto diversa sprecano mezza pagina. Le tre risposte possibili sono davvero
             * diverse fra loro — quale sia la migliore dipende da quante righe ha QUEL cantiere —
             * quindi si scelgono, non si indovinano:
             *   v     impilate, come da sempre
             *   h3    tre colonne; la scheda con molte righe si dispone su due colonne interne
             *   h2    la scheda alta da sola a sinistra, le due corte impilate a destra
             * Il booleano storico resta leggibile: true valeva "affiancate", cioè h3.
             *
             * C'ERA UNA QUARTA DISPOSIZIONE, "righe distribuite": le righe scorrevano fra le tre
             * colonne fino a pareggiare l'altezza, ignorando i confini delle schede. Sulla carta
             * era la più compatta; alla prova dei fatti era illeggibile, e per un motivo che si
             * vede solo guardandola: pareggiare le altezze spezza i gruppi, e questi tre gruppi
             * SONO l'informazione — «peso asta» sotto DATI STRUMENTO vuol dire una cosa, la
             * stessa riga in mezzo a un'altra colonna non vuol dire niente. Tolta: un layout che
             * risparmia due centimetri e costa la comprensione della tabella è un cattivo
             * affare. Chi avesse un template salvato con quella scelta ricade su h3 da sé, senza
             * migrazione, perché il valore non è più fra quelli riconosciuti. */
            const DISPOSIZIONI_DATI_PROVA = ['v', 'h3', 'h2'];
            function disposizioneSchede(blk) {
                if (!blk) return 'v';
                if (DISPOSIZIONI_DATI_PROVA.indexOf(blk.schedeDisposizione) >= 0) return blk.schedeDisposizione;
                return blk.schedeOrizzontali ? 'h3' : 'v';
            }
            /** Da quante righe in su conviene spezzare una scheda su due colonne interne. Dieci
             * (DATI STRUMENTO) sì, cinque no: sotto la soglia le due mezze colonne sarebbero più
             * strette del testo che devono contenere, e si guadagnerebbe altezza perdendo
             * leggibilità — il contrario di quello che serve. */
            const SOGLIA_SCHEDA_DUE_COLONNE = 8;

            /** I tre box impilati a sinistra della pagina prova, stesso ordine/etichette del
             * report di riferimento: PROVA N°/DATI INDAGINE, DATI STRUMENTO, DATI STRATIGRAFICI. */
            /** Le 3 "schede" (PROVA/DATI INDAGINE, DATI STRUMENTO, DATI STRATIGRAFICI) del blocco
             * "Dati Prova": di default impilate verticalmente nell'ordine storico, ma il template
             * editor può richiedere una disposizione ORIZZONTALE (fianco a fianco) e/o un ordine
             * diverso tramite `opts.orizzontale`/`opts.ordine` (vedi "Disposizione schede" nel menu
             * del blocco, apriMenuBloccoEditor) — richiesto esplicitamente ("le 3 schede devono
             * poter essere distribuite anche orizzontalmente e riarrangiate"). */
            function buildDatiBoxHtml(numero, comune, localita, committente, dateStr, inst, passoCm, falda, stratiEff, opts){
                opts = opts || {};
                // `orizzontale` (booleano) resta accettato: è il modo in cui i template salvati
                // prima di questa modifica descrivono la disposizione, e continuare a leggerlo
                // costa una riga — riscrivere i loro dati costerebbe una migrazione.
                const disposizione = DISPOSIZIONI_DATI_PROVA.indexOf(opts.disposizione) >= 0
                    ? opts.disposizione : (opts.orizzontale ? 'h3' : 'v');
                const ordine = Array.isArray(opts.ordine) && opts.ordine.length === 3 ? opts.ordine : [0, 1, 2];
                const T = tintaDatiProva(opts.tinta);
                const zebra = !!opts.zebra;
                /* ============ PERCHÉ LA LARGHEZZA NON È PIÙ UN NUMERO DI PIXEL ============
                 * La colonna etichetta era `width:74px` fissi, con ogni cella nowrap + ellissi.
                 * Da lì venivano, insieme, i due difetti segnalati con lo screenshot: «località»
                 * che finiva in «Contrada Madonna delle Scra…» invece di andare a capo, e le
                 * colonne dei DATI STRATIGRAFICI che si sovrapponevano stringendo il blocco.
                 * Stessa radice: 74 px non sono una frazione, sono una quantità assoluta. Quando
                 * il blocco scende sotto ~130 px quei 74 si mangiano quasi tutto e alle colonne
                 * `da`/`a` resta uno spazio prossimo allo zero; il nowrap, messo allora come
                 * pezza, trasformava il traboccamento in troncamento — cioè un dato illeggibile
                 * in un dato ASSENTE, che su una relazione firmata è peggio.
                 *
                 * Ora la larghezza è `min(74px, 40%)`: fino a quando il box è largo vale il
                 * vecchio 74 px (impaginazione identica a prima, e le etichette restano allineate
                 * fra le tre schede perché la regola è la stessa per tutte), sotto quella soglia
                 * diventa una frazione e continua a lasciare il 60% ai valori — a QUALUNQUE
                 * larghezza, per costruzione. Con table-layout:fixed una colonna in percentuale
                 * non può azzerarsi, quindi la sovrapposizione non è più possibile: non è stata
                 * corretta, è stata resa irrappresentabile.
                 *
                 * E le celle vanno a capo. `overflow-wrap:anywhere` spezza anche una parola unica
                 * troppo lunga (un nome di committente senza spazi) invece di farla uscire dalla
                 * cella. `vertical-align:top` perché quando il valore prende due righe l'etichetta
                 * deve restare in alto, accanto alla prima. */
                const LARGH_ETICHETTA = 'min(74px, 40%)';
                // Impacchettata su due colonne interne (h3) le colonne etichetta diventano quattro
                // in tutto, quindi la quota per ciascuna si dimezza: stesso ragionamento, stessa
                // garanzia, numeri diversi.
                const LARGH_ETICHETTA_STRETTA = 'min(70px, 24%)';
                const cellaFluida = 'overflow-wrap:anywhere; vertical-align:top;';
                // "solo altezza" (richiesto esplicitamente, seguito al bug del testo che si
                // sovrapponeva con lo zoom): la maniglia di ridimensionamento per questo tipo di
                // blocco non tocca più font/larghezze, regola SOLO lo spazio verticale tra le
                // righe — vedi --tpl-riga-scale, impostato dal wrapper del blocco in
                // costruisciHtmlBloccoEditor/buildContenutoVoceStampa e letto qui in calc().
                const padV = 'calc(2px * var(--tpl-riga-scale, 1))';
                const cella = (extra) => `padding:${padV} 6px; ${cellaFluida} ${extra || ''}`;
                const stEtichetta = cella('color:#334155;');
                const stValore = cella('font-weight:600; color:#0f172a;');
                const stIntestazione = cella('font-weight:700; color:#334155;');
                // Il margine tra le schede NON è più fisso qui dentro: lo aggiunge il chiamante in
                // fondo alla funzione, in base a se le schede finiscono impilate (margin-bottom) o
                // affiancate (gap del flex) — così l'una non si somma all'altro per errore.
                // classe "databox-tabella" (bug segnalato con screenshot a confronto: "guarda come
                // sono diversi gli export dal template" — nell'editor questi box arrivano puliti,
                // sfondo azzurro pieno, righe allineate a sinistra, senza bordi tra le celle; in
                // stampa arrivavano invece grigi/bianchi, con un bordo su ogni cella e testo
                // centrato — perché getReportPrintStyleBlock ha regole GLOBALI "th, td{border...
                // text-align:center}" e "tr:nth-child(even){background:#f8fafc}" pensate per le
                // tabelle dati "normali" (Aste/Metri/Colpi, Riepilogo parametri...), che qui
                // vincevano visivamente sopra lo sfondo azzurro del div — l'editor non soffre dello
                // stesso problema perché il canvas non carica questo foglio di stile di stampa.
                // Questa classe è l'aggancio per le regole di annullamento aggiunte in
                // getReportPrintStyleBlock, specifiche per questi box e senza toccare le altre
                // tabelle del documento.
                // height:100% + box-sizing: il box riempie il contenitore che gli dà il chiamante.
                // In verticale il contenitore è alto quanto il contenuto e non cambia niente; in
                // orizzontale è la colonna, e allora il colore arriva fino in fondo invece di
                // lasciare sotto un rettangolo bianco (segnalato con screenshot).
                // data-scheda-idx: serve a ritrovare QUESTA scheda sul foglio mentre la si
                // trascina nel menu, per accenderla mentre si sposta.
                const boxWrap = (contenutoHtml, idxScheda) => `
                    <div data-scheda-idx="${idxScheda}" style="background:${T.sfondo}; border:1px solid ${T.bordo}; border-radius:4px; overflow:hidden; height:100%; box-sizing:border-box; font-size:calc(10.5px * var(--tpl-font-scale, 1));">${contenutoHtml}</div>`;
                const titoloScheda = (testo, primo, ultimo) =>
                    `<div style="font-weight:800; padding:${primo ? 'calc(4px * var(--tpl-riga-scale, 1))' : '0'} 6px ${ultimo ? 'calc(4px * var(--tpl-riga-scale, 1))' : '0'};">${testo}</div>`;
                const titoloHtml = (righeTitolo) => righeTitolo.map((s, i) => titoloScheda(s, i === 0, i === righeTitolo.length - 1)).join('');

                /* ============ LE SCHEDE COME DATI, NON COME STRINGHE ============
                 * Prima queste tre schede erano tre stringhe HTML già chiuse. Va benissimo finché
                 * l'unica scelta è "impilate o affiancate", ma non si può spezzare a metà una
                 * stringa: per mettere DATI STRUMENTO su due colonne, o per far scorrere le righe
                 * da una colonna all'altra, serve sapere DOVE finisce una riga — e una stringa non
                 * lo dice. Da qui in poi ogni scheda è un elenco di righe, e l'HTML si scrive alla
                 * fine, una volta sola, quando si è deciso come disporle. */
                const betaT = betaTStrumento(inst, passoCm);
                const schede = [
                    {
                        titolo: [`PROVA N°${numero}`, 'DATI INDAGINE'], colonne: 2,
                        righe: [
                            ['comune', comune || ''],
                            ['località', localita || ''],
                            ['cliente', committente || ''],
                            ['data', formattaDataIT(dateStr) || '']
                        ]
                    },
                    {
                        titolo: ['DATI STRUMENTO'], colonne: 2,
                        righe: [
                            ['peso massa', fmtIT(parseFloat(inst.pesoMassa || 63.50), 2) + ' kg'],
                            ['peso asta', fmtIT(parseFloat(inst.pesoAsta || 6.30), 2) + ' kg'],
                            ['lungh. asta', fmtIT(parseFloat(inst.lunghAsta || 1.00), 2) + ' m'],
                            ['cambio asta', fmtIT(parseFloat(inst.cambioAsta || 1.00), 2) + ' m'],
                            ['peso sistema', fmtIT(parseFloat(inst.pesoSistema || 8.00), 2) + ' kg'],
                            ['volata', fmtIT(parseFloat(inst.volata || 0.75), 2) + ' m'],
                            ['passo', fmtIT(parseFloat(passoCm || 20) / 100, 2) + ' m'],
                            ['area punta', fmtIT(parseFloat(inst.areaPunta || 20), 0) + ' cm²'],
                            ['angolo punta', fmtIT(parseFloat(inst.angoloPunta || 90), 0) + ' °'],
                            ['βt', fmtIT(betaT, 3)]
                        ]
                    },
                    {
                        titolo: ['DATI STRATIGRAFICI'], colonne: 3,
                        righe: [
                            { intestazione: true, celle: ['metri', 'da', 'a'] },
                            ['falda', isFinite(falda.faldaDa) ? fmtIT(falda.faldaDa, 1) : '0,0', isFinite(falda.faldaA) ? fmtIT(falda.faldaA, 1) : '0,0']
                        ].concat(stratiEff.map((se, i) => ['strato ' + (i + 1), fmtIT(se.profonditaDa, 1), fmtIT(se.profonditaA, 1)]))
                    }
                ];
                const celleDi = r => Array.isArray(r) ? r : r.celle;
                const eIntestazione = r => !Array.isArray(r) && !!r.intestazione;

                /** Una riga in <tr>. `indice` serve solo alla zebratura: è la posizione della riga
                 * DENTRO la sua tabella, così le bande restano regolari anche quando una scheda è
                 * spezzata fra due colonne. */
                function trRiga(riga, indice) {
                    const celle = celleDi(riga);
                    const sfondo = (zebra && indice % 2 === 1) ? ` background:${T.alt};` : '';
                    const tds = celle.map((c, i) => {
                        const st = eIntestazione(riga) ? stIntestazione : (i === 0 ? stEtichetta : stValore);
                        return `<td style="${st}">${c}</td>`;
                    }).join('');
                    return `<tr style="${sfondo}">${tds}</tr>`;
                }
                const tabella = (colgroup, corpo) =>
                    `<table class="databox-tabella" style="width:100%; border-collapse:collapse; table-layout:fixed;"><colgroup>${colgroup}</colgroup>${corpo}</table>`;

                /** Tabella normale: una riga per riga, etichetta a sinistra. */
                function tabellaSemplice(righe, nColonne) {
                    const col = `<col style="width:${LARGH_ETICHETTA};">` + '<col>'.repeat(Math.max(1, nColonne - 1));
                    return tabella(col, righe.map((r, i) => trRiga(r, i)).join(''));
                }

                /** Tabella impacchettata su due colonne interne: la riga i della prima metà viene
                 * affiancata alla riga i della seconda. Una tabella sola, non due accostate,
                 * perché così le due metà restano allineate riga per riga anche quando un valore
                 * va a capo — e la zebratura attraversa la scheda intera invece di sfasarsi. */
                function tabellaImpacchettata(righe) {
                    const meta = Math.ceil(righe.length / 2);
                    const sinistra = righe.slice(0, meta), destra = righe.slice(meta);
                    const col = `<col style="width:${LARGH_ETICHETTA_STRETTA};"><col><col style="width:${LARGH_ETICHETTA_STRETTA};"><col>`;
                    const corpo = sinistra.map((r, i) => {
                        const a = celleDi(r), b = destra[i] ? celleDi(destra[i]) : ['', ''];
                        const sfondo = (zebra && i % 2 === 1) ? ` background:${T.alt};` : '';
                        return `<tr style="${sfondo}">`
                            + `<td style="${stEtichetta}">${a[0]}</td><td style="${stValore}">${a[1] || ''}</td>`
                            + `<td style="${stEtichetta}">${b[0]}</td><td style="${stValore}">${b[1] || ''}</td></tr>`;
                    }).join('');
                    return tabella(col, corpo);
                }

                /** Una scheda intera. `impacchetta` vale solo per le schede a due colonne: su
                 * DATI STRATIGRAFICI, che di colonne ne ha gia' tre, sei colonne in un terzo di
                 * blocco sarebbero illeggibili — e l'obiettivo qui e' il contrario. */
                function schedaHtml(sc, impacchetta) {
                    const usaDue = impacchetta && sc.colonne === 2 && sc.righe.length >= SOGLIA_SCHEDA_DUE_COLONNE;
                    return boxWrap(titoloHtml(sc.titolo) + (usaDue ? tabellaImpacchettata(sc.righe) : tabellaSemplice(sc.righe, sc.colonne)), schede.indexOf(sc));
                }

                const inOrdine = ordine.map(i => schede[i]);
                const impilate = (elenchi) => elenchi.map((h, i) => i < elenchi.length - 1 ? `<div style="margin-bottom:8px;">${h}</div>` : h).join('');
                /* NIENTE RETTANGOLI BIANCHI SOTTO LE COLONNE (segnalato con screenshot). Prima le
                 * colonne erano allineate in alto e finivano dove finiva il loro contenuto: la
                 * piu' corta lasciava sotto di se' un vuoto bianco dentro il riquadro del blocco.
                 * Ora le colonne si distendono tutte all'altezza della piu' alta (align-items:
                 * stretch) e l'ULTIMO box di ogni colonna si prende lo spazio che avanza — il
                 * colore arriva in fondo e i tre riquadri chiudono alla stessa quota. Non e' un
                 * riempitivo: e' quello che rende leggibile un accostamento di tabelle, perche'
                 * il bordo inferiore diventa una linea sola invece di tre scalini. */
                const colonnaFlex = (boxes) => `<div style="flex:1; min-width:0; display:flex; flex-direction:column;">`
                    + boxes.map((b, i) => `<div style="${i < boxes.length - 1 ? 'margin-bottom:8px;' : 'flex:1; min-height:0;'}">${b}</div>`).join('')
                    + `</div>`;
                const affiancate = (colonne) => `<div style="display:flex; gap:8px; align-items:stretch;">${colonne.map(colonnaFlex).join('')}</div>`;

                if (disposizione === 'h3') {
                    return affiancate(inOrdine.map(sc => [schedaHtml(sc, true)]));
                }

                if (disposizione === 'h2') {
                    // "Alta" = quella con piu' righe, non la seconda per posizione: con molti strati
                    // la scheda piu' lunga diventa DATI STRATIGRAFICI, e la regola deve seguire i
                    // dati di questo cantiere, non l'ordine in cui sono scritti nel codice.
                    let alta = inOrdine[0];
                    inOrdine.forEach(sc => { if (sc.righe.length > alta.righe.length) alta = sc; });
                    const corte = inOrdine.filter(sc => sc !== alta);
                    return affiancate([[schedaHtml(alta, false)], corte.map(sc => schedaHtml(sc, false))]);
                }

                // Verticale: stesso identico markup di prima quando l'ordine è quello di default —
                // margine solo TRA una scheda e la successiva, non dopo l'ultima.
                return impilate(inOrdine.map(sc => schedaHtml(sc, false)));
            }

            /** Tabella Aste/Metri/COLPI/Nspt/Nspt'/Rpd — una riga per intervallo, righe alternate
             * come nel report di riferimento, intestazione con lo stesso azzurro delle altre
             * tabelle colorate dell'app (COLORI_EXPORT.intestazione). */
            function buildColpiNsptTableHtml(logsCalc){
                const C = COLORI_EXPORT;
                const fit = autoFitTabellaRighe(logsCalc.length, 34);
                // Bordi a quattro lati separati, pilotati dalle stesse variabili di bordoExp (vedi
                // lì il perché): senza questo, spegnere la griglia dal menu non avrebbe effetto su
                // questa tabella, perché un bordo scritto in linea vince sulla regola "th,td".
                const bordoCella = 'border-top:var(--tpl-bordo-h, 1px solid #cbd5e1);border-bottom:var(--tpl-bordo-h, 1px solid #cbd5e1);border-left:var(--tpl-bordo-v, 1px solid #cbd5e1);border-right:var(--tpl-bordo-v, 1px solid #cbd5e1);';
                const righe = logsCalc.map((log, i) => `
                    <tr style="${i % 2 === 1 ? 'background:#EAF3FB;' : ''}">
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella}">${log.asta || 1}</td>
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella} font-family:monospace;">${fmtIT(log.end, 1)}</td>
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella} font-weight:700;">${log.colpi || 0}</td>
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella}">${fmtIT(log.nsptGrezzo, 2)}</td>
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella}">${fmtIT(log.nsptFalda, 2)}</td>
                        <td style="padding:${fit.padding}; text-align:center; ${bordoCella} font-weight:700;">${fmtIT(log.rpd, 2)}</td>
                    </tr>`).join('');
                // th con background/color PROPRI in linea (bug segnalato esplicitamente: un <th>
                // senza colore proprio, solo con lo sfondo sul <tr> genitore come qui prima, va in
                // balìa della regola generica th{...} del foglio di stampa — vedi
                // getReportPrintStyleBlock) invece di ereditare/mostrare quello del genitore.
                const thHead = `padding:${fit.padding}; ${bordoCella} background:#${C.intestazione}; color:#1e293b; font-weight:800;`;
                return `<table class="${fit.tableClass}" style="width:100%; border-collapse:collapse; font-size:calc(${fit.fontSize}px * var(--tpl-font-scale, 1)); table-layout:fixed;">
                    <thead><tr>
                        <th style="${thHead}">Aste</th>
                        <th style="${thHead}">Metri</th>
                        <th style="${thHead}">COLPI</th>
                        <th style="${thHead}">Nspt</th>
                        <th style="${thHead}">Nspt'</th>
                        <th style="${thHead}">Rpd</th>
                    </tr></thead>
                    <tbody>${righe}</tbody>
                </table>`;
            }

            /** Sceglie un passo "pulito" per le tacche di un asse (1,2,2.5,5,10,20,25,50,100,...)
             * in modo da avere circa 5 tacche, come nei grafici del report di riferimento. */
            /** targetDivisions: quante suddivisioni (gridline/etichette) mostrare sull'asse, di
             * default 5 come sempre — ma un pannello più stretto (grafico condensato lateralmente,
             * vedi buildStratigrafiaColpiRpdSvg) può chiederne meno, cosi lo "step" scelto tra i
             * valori tondi diventa più grosso e le etichette restano leggibili e distanziate invece
             * di sovrapporsi, invece di rimpicciolire il font. */
            function scalaAssePulita(maxVal, targetDivisions = 5){
                const candidates = [1,2,2.5,5,10,20,25,50,100,200,250,500,1000,2000,2500,5000];
                const target = Math.max(maxVal, 1) / Math.max(2, targetDivisions);
                let step = candidates[candidates.length - 1];
                for (const c of candidates) { if (c >= target) { step = c; break; } }
                return { step, axisMax: Math.ceil(Math.max(maxVal, step) / step) * step };
            }

            /** Grafico a 3 pannelli affiancati — colonna stratigrafica (retini pieni + spessori +
             * legenda), Colpi(N) a "gradini" (convenzione dei log di sondaggio) e Rpd "a punte"
             * (un punto per intervallo, uniti da segmenti a zigzag, richiesto esplicitamente:
             * "non a rettangoli ma a punte... la linea deve fare a zigzag senza creare un
             * intervallo ma solo un punto") — stesso impianto grafico di "Stratigrafia - PROVA
             * N°X" del report di riferimento.
             *
             * `compattezza` (0.4-1, default 1 = dimensione naturale) condensa lateralmente i due
             * pannelli con gli assi numerici (richiesto esplicitamente: "condensare lateralmente
             * i grafici... senza perdere nulla"): NON si limita a rimpicciolire tutto in proporzione
             * (che a un certo punto rende le etichette illeggibili) — restringe davvero i pannelli e
             * lascia che sia lo STEP dell'asse a diventare più grosso (meno gridline, valori più
             * "tondi"), calcolato apposta in base allo spazio libero rimasto per ogni etichetta,
             * cosi il font resta sempre alla stessa dimensione leggibile ("la scala raffigurata
             * sugli assi dei grafici" cambia, il testo no). */
            /** Fondo scala "intelligente" dell'asse profondità: primo passo tondo sopra il dato,
             * con un 5% di respiro perché l'ultimo punto non finisca appiccicato al bordo. Il passo
             * si infittisce sulle prove corte (0,25 m fino a 2 m di profondità) e si allarga su
             * quelle profonde, così il risultato resta un numero "da disegno tecnico" a qualunque
             * scala invece di un valore arbitrario. Esempi: 1,2 m -> 1,5 m; 3,4 m -> 4 m; 12 m -> 13 m. */
            function profonditaAsseAutomatica(maxDepthData) {
                // Ingresso normalizzato prima di qualunque conto: Math.max(0.1, undefined) vale NaN
                // (undefined non si converte a numero), e un NaN qui si propagherebbe fino a un SVG
                // senza asse né griglia — un grafico vuoto senza spiegazione. Trovato dal test di
                // regressione, non a occhio: il chiamante normale passa sempre un numero valido, ma
                // questa funzione è ora usata anche dal menu dell'editor per mostrare l'anteprima
                // del valore automatico, dove il dato può non esserci ancora.
                const base = Number(maxDepthData);
                const conRespiro = (isFinite(base) && base > 0 ? base : 0.1) * 1.05;
                const passo = conRespiro <= 2 ? 0.25 : conRespiro <= 5 ? 0.5 : conRespiro <= 20 ? 1 : 2;
                return Math.max(passo, Math.ceil(conRespiro / passo - 1e-9) * passo);
            }
            /** Manda a capo un'etichetta sulle PAROLE, entro `maxCaratteri` per riga e `maxRighe`
             * righe. Sostituisce il vecchio `substring(0, n)` della legenda del grafico, che
             * tagliava a metà parola ("CALCARENITE TENE-" nel documento di riferimento era
             * proprio questo difetto, lì fatto a mano).
             * Casi limite deliberati:
             *  - una parola più lunga della colonna (es. "CALCARENITE" a compattezza minima) non
             *    può andare a capo: si spezza con un trattino, invece di sfondare la colonna;
             *  - se dopo la mandata a capo le righe restano più di maxRighe si tronca con "…",
             *    che è un troncamento DICHIARATO — diverso dal taglio silenzioso di prima. */
            function spezzaEtichettaInRighe(testo, maxCaratteri, maxRighe) {
                const limite = Math.max(3, Math.floor(maxCaratteri) || 3);
                const massimo = Math.max(1, Math.floor(maxRighe) || 1);
                const parole = String(testo == null ? '' : testo).trim().split(/\s+/).filter(Boolean);
                if (parole.length === 0) return [];
                const righe = [];
                let corrente = '';
                parole.forEach(p => {
                    const tentativo = corrente ? corrente + ' ' + p : p;
                    if (tentativo.length <= limite || !corrente) corrente = tentativo;
                    else { righe.push(corrente); corrente = p; }
                });
                if (corrente) righe.push(corrente);
                const spezzate = [];
                righe.forEach(r => {
                    let resto = r;
                    while (resto.length > limite) {
                        spezzate.push(resto.slice(0, limite - 1) + '-');
                        resto = resto.slice(limite - 1);
                    }
                    spezzate.push(resto);
                });
                if (spezzate.length <= massimo) return spezzate;
                const tagliate = spezzate.slice(0, massimo);
                const ultima = tagliate[massimo - 1];
                tagliate[massimo - 1] = ultima.slice(0, Math.max(1, limite - 1)) + '…';
                return tagliate;
            }

            /** Dispone verticalmente etichette che "vorrebbero" stare a una certa quota (`yIdeale`)
             * senza farle sovrapporre, dentro la fascia [yMin, yMax]. Ogni voce deve avere `h`.
             * Scrive `y` su ciascuna e restituisce lo stesso array.
             *
             * Due passate, e servono entrambe:
             *  1. dall'alto — nessuna voce può iniziare prima della fine della precedente: è questa
             *     che risolve il caso reale (due strati sottili e vicini, due nomi su tre righe);
             *  2. dal basso — se l'ultima esce dal grafico, si recupera risalendo. Senza questa,
             *     su una prova con molti strati sottili le ultime etichette finivano fuori dal
             *     riquadro, cioè fuori dal foglio in stampa.
             * Quando nemmeno impilate ci starebbero, l'ancoraggio è impossibile per aritmetica e
             * non per un difetto: si distribuiscono uniformemente, che è la degradazione onesta. */
            function disponiEtichetteSenzaSovrapposizioni(voci, yMin, yMax, spazio) {
                if (!Array.isArray(voci) || voci.length === 0) return voci;
                const gap = Math.max(0, spazio || 0);
                const altezzaTotale = voci.reduce((s, v) => s + (v.h || 0), 0) + gap * (voci.length - 1);
                if (altezzaTotale > (yMax - yMin)) {
                    const ultimaH = voci[voci.length - 1].h || 0;
                    const passo = voci.length > 1 ? (yMax - yMin - ultimaH) / (voci.length - 1) : 0;
                    voci.forEach((v, i) => { v.y = yMin + i * passo; });
                    return voci;
                }
                let cursore = yMin;
                voci.forEach(v => {
                    v.y = Math.max(v.yIdeale != null ? v.yIdeale : cursore, cursore);
                    cursore = v.y + (v.h || 0) + gap;
                });
                let limite = yMax;
                for (let i = voci.length - 1; i >= 0; i--) {
                    const h = voci[i].h || 0;
                    if (voci[i].y + h > limite) voci[i].y = limite - h;
                    limite = voci[i].y - gap;
                }
                return voci;
            }

            /* ==================================================================================
             * IL GRAFICO STRATIGRAFICO — RISCRITTO IN UNITÀ FISICHE
             *
             * Segnalato, in cinque punti diversi: lo slider della larghezza «regola la scala
             * totale invece dell'espansione laterale»; l'altezza «riduce o aumenta la scala
             * generale»; la larghezza delle colonne «fa espandere il blocco anche verticalmente»;
             * lo spazio dei nomi «complica il posizionamento e non si capisce dove sia»; la
             * dimensione delle etichette «fa rimpicciolire tutti gli altri elementi».
             *
             * Cinque sintomi, UNA causa. Il disegno usciva come
             *     <svg viewBox="0 0 totalW height" width="100%">
             * e un viewBox riscala in modo UNIFORME. Qualunque cosa cambiasse totalW cambiava le
             * proporzioni della scatola, e il browser ri-adattava l'intero disegno: testo,
             * altezza, spessori di linea, tutto. Allargare una colonna non allargava una colonna:
             * cambiava il rapporto larghezza/altezza, e il grafico veniva ridisegnato più grande.
             * Ingrandire il carattere allargava le colonne (per contenerlo) e quindi rimpiccioliva
             * tutto il resto. Non erano cinque difetti da correggere uno alla volta: era un
             * disegno che si comportava come un'immagine invece che come un'impaginazione.
             *
             * Ora la larghezza REALE del blocco entra come dato (larghezzaPx, calcolata dai
             * millimetri veri della riga — vedi larghezzaBloccoPx nel chiamante) e vale la regola:
             *
             *     1 unità SVG = 1 pixel sul foglio. Sempre.
             *
             * Da qui discende tutto il resto, senza bisogno di casi particolari:
             *  · la larghezza del blocco cambia lo SPAZIO da ripartire, non la scala;
             *  · l'altezza cambia solo chartH;
             *  · le due larghezze interne cambiano solo come si divide W;
             *  · il carattere cambia solo il testo.
             * Ogni comando muove un asse solo perché non esiste più il meccanismo che li legava.
             *
             * L'unico caso in cui si torna a riscalare è quello onesto: quando i minimi assoluti
             * non stanno nella larghezza disponibile. Lì il disegno si rimpicciolisce tutto
             * insieme invece di sovrapporsi — è la «soglia di sicurezza», ed è un ripiego
             * dichiarato, non il comportamento normale.
             * ================================================================================== */

            /** Larghezza di riferimento quando il chiamante non sa dire quanto è largo il blocco:
             * la riga piena di un A4 con i margini di default (210 − 12 − 12 mm). */
            const LARGH_GRAFICO_DEFAULT_PX = Math.round(186 * 96 / 25.4);
            /** Sotto questa larghezza il grafico non è più un grafico: si riscala tutto insieme
             * invece di continuare a stringere colonne che devono contenere numeri. */
            const LARGH_GRAFICO_MINIMA_PX = 210;
            /** Corpo di riferimento del grafico, in punti. Tutti gli altri testi del disegno sono
             * multipli di questo, così una sola misura governa l'intero blocco — ed è la stessa
             * unità (pt) e lo stesso comando degli altri blocchi. */
            const PT_GRAFICO_DEFAULT = 5.5;
            const LEGENDE_GRAFICO = ['colonna', 'grigliaBasso', 'rigaBasso', 'nessuna'];
            function legendaGrafico(v) { return LEGENDE_GRAFICO.indexOf(v) >= 0 ? v : 'colonna'; }

            /** La profondità più grande raggiunta in TUTTO il cantiere, non nella singola prova.
             * Serve a una cosa sola ma importante: impaginare più prove sulla stessa scala. Con il
             * fondo scala automatico ogni prova si adatta a sé stessa, quindi due grafici affiancati
             * nella stessa relazione hanno assi diversi e non si possono confrontare a occhio — e
             * per accorgersene bisognerebbe aprire una prova alla volta. Con la spunta il valore lo
             * decide il cantiere, una volta per tutte. */
            function profonditaMassimaProgetto(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj) return 0;
                let massima = 0;
                Object.values(proj.surveys || {}).forEach(sv => {
                    (sv.logs || []).forEach(l => {
                        const e = Number(l.end);
                        if (isFinite(e) && e > massima) massima = e;
                    });
                });
                return massima;
            }
            /** Il fondo scala che questo blocco deve usare davvero: la spunta «massima del
             * cantiere» vince sul valore scritto a mano, che a sua volta vince sull'automatico.
             * Un ordine solo, deciso qui, invece di tre condizioni sparse fra menu e disegno. */
            function profonditaAsseEffettiva(blockObj, ctx) {
                if (blockObj && blockObj.profonditaAsseCantiere) {
                    // Il progetto lo dice il ctx quando lo sa; altrimenti è quello aperto. Senza
                    // questo ripiego la spunta resterebbe accesa senza fare niente in tutti i
                    // percorsi che non popolano projId — un comando che mente, il difetto peggiore.
                    const m = profonditaMassimaProgetto((ctx && ctx.projId) || state.currentProjectId);
                    if (m > 0) return profonditaAsseAutomatica(m);
                }
                return blockObj && blockObj.profonditaAsseM;
            }

            /** Larghezza REALE del blocco in pixel di foglio, dai millimetri veri della riga.
             * È il dato che mancava: prima il grafico sapeva solo «occupo 2 colonne su 4» e da
             * quella frazione ricavava un fattore di condensazione — cioè una SCALA. Sapendo
             * invece quanti pixel ha davvero, può ripartirli, che è un'altra cosa. Gli 8px tolti
             * sono il respiro fra il disegno e il bordo del blocco: senza, a piena larghezza il
             * grafico tocca il margine di stampa. */
            function larghezzaBloccoGraficoPx(utileMm, span, cols) {
                const c = Math.max(1, cols || 4);
                const sp = Math.max(1, Math.min(c, span || c));
                const mm = (utileMm > 0 ? utileMm : 186) * (sp / c);
                return Math.max(LARGH_GRAFICO_MINIMA_PX, Math.round(mm * 96 / 25.4) - 8);
            }

            function buildStratigrafiaColpiRpdSvg(stratiEff, logsCalc, numeroProva, larghezzaPx, opzioni = {}){
                if (!logsCalc || logsCalc.length === 0) return '';

                // ---------- CARATTERE: una misura sola, tutto il resto ne discende ----------
                // Niente più var(--tpl-font-scale) dentro l'SVG: la scala del carattere entrava
                // due volte (una nel CSS del testo, una nella geometria delle colonne) ed era la
                // seconda a rimpicciolire il disegno. Qui il corpo è un numero di punti, e i punti
                // diventano pixel una volta sola.
                const ptBase = Math.max(4, Math.min(24, parseFloat(opzioni.fontPt) || PT_GRAFICO_DEFAULT));
                const px = (mult) => Math.round(ptBase * (96 / 72) * mult * 100) / 100;
                const fTitolo = px(1.30), fScala = px(1.05), fQuota = px(1.05);
                const fAsse = px(1.00), fNome = px(1.00), fPunto = px(0.92), fSpessore = px(1.15);

                // ---------- PROFONDITÀ DELL'ASSE ----------
                const maxDepthData = Math.max(...logsCalc.map(l => l.end), 0.1);
                const profondiaForzata = parseFloat(opzioni.profonditaAsseM);
                const maxDepth = (isFinite(profondiaForzata) && profondiaForzata > 0)
                    ? Math.max(profondiaForzata, 0.1)
                    : profonditaAsseAutomatica(maxDepthData);

                // ---------- ALTEZZA: un comando solo, e non tocca la scala ----------
                // Prima ce n'erano due che facevano quasi la stessa cosa da due punti diversi:
                // «Ingrandimento» (la scala generica del blocco, che moltiplicava tutto) e
                // «Altezza» (che allungava il grafico). Il primo cambiava la dimensione del
                // disegno, il secondo le proporzioni — e a occhio si somigliavano abbastanza da
                // non capire quale stessi usando. Ne resta uno, ed è il secondo: allunga o
                // accorcia il grafico ridistribuendo lo spazio verticale, senza toccare né il
                // carattere né le larghezze.
                const stepM = Math.max(0.01, (logsCalc[0].end - logsCalc[0].start) || 0.2);
                const totalSteps = Math.ceil(maxDepth / stepM);
                const fattoreAltezza = Math.max(0.4, Math.min(3, parseFloat(opzioni.altezza) || 1));
                const chartH = Math.max(70, Math.min(1400, Math.round(totalSteps * 15 * fattoreAltezza)));

                const passoTacche = (() => {
                    for (const p of [0.1, 0.2, 0.25, 0.5, 1, 2, 2.5, 5, 10, 20]) {
                        if (maxDepth / p <= 10) return p;
                    }
                    return 25;
                })();
                const etichettaProf = (d) => fmtIT(Math.round(d * 1000) / 1000, passoTacche < 1 ? (passoTacche < 0.25 ? 1 : 2) : 0);

                // ---------- FALDA ----------
                const faldaGrafico = (() => {
                    const f = opzioni.falda || {};
                    const da = Number(f.faldaDa);
                    if (!isFinite(da) || da < 0) return { presente: false };
                    const aGrezzo = Number(f.faldaA);
                    const aperta = !isFinite(aGrezzo) || aGrezzo <= da;
                    const a = aperta ? maxDepth : Math.min(aGrezzo, maxDepth);
                    if (da >= maxDepth) return { presente: false };
                    return {
                        presente: true, da, a, aperta,
                        // Solo la profondità di inizio (richiesto esplicitamente): il triangolo e il
                        // retino azzurro già disegnano dove comincia/si estende la falda, un'etichetta
                        // con l'intera coppia da-a era ridondante — e disegnata in cima al grafico
                        // (vedi sotto, prima di questa modifica) finiva sempre a sovrapporsi alle
                        // etichette degli strati quando la falda cominciava a metà colonna.
                        etichetta: `${fmtIT(da, 2)} m`
                    };
                })();

                // ---------- RIPARTIZIONE ORIZZONTALE ----------
                // Il cuore della riscrittura. Ogni elemento dichiara un minimo (sotto il quale non
                // mostrerebbe più il suo contenuto) e un desiderata (quanto vorrebbe, moltiplicato
                // dagli slider). Se lo spazio basta, ciascuno prende il suo desiderata e l'avanzo
                // va ai due pannelli dei grafici, che sono gli unici elastici per natura. Se non
                // basta, si scende verso i minimi in ordine di sacrificabilità. Le proporzioni si
                // ridistribuiscono: nessuno viene schiacciato per far posto a un altro senza che
                // sia stato deciso qui.
                const legendaModo = legendaGrafico(opzioni.legenda);
                const legendaInColonna = legendaModo === 'colonna';
                const legendaInBasso = legendaModo === 'grigliaBasso' || legendaModo === 'rigaBasso';
                const larghColonne = Math.max(0.6, Math.min(3, parseFloat(opzioni.larghezzaColonne) || 1));
                const spazioEtichette = Math.max(0.5, Math.min(3, parseFloat(opzioni.spazioEtichette) || 1));

                const axisGap = 4, legendGap = 6, gapPanels = 10;
                // La fascia dei numeri di profondità si misura sul testo che deve contenere:
                // «10,0» a corpo grande vuole più spazio di «2» a corpo piccolo. È l'unico punto
                // in cui il carattere tocca una larghezza, ed è un minimo, non una scala.
                const labW = Math.max(12, Math.ceil(etichettaProf(maxDepth).length * fQuota * 0.62) + 3);
                const stripDes = Math.round(26 * larghColonne), stripMin = 14;
                const faldaDes = faldaGrafico.presente ? Math.round(16 * larghColonne) : 0;
                const faldaMin = faldaGrafico.presente ? 10 : 0;
                const faldaGap = faldaGrafico.presente ? 3 : 0;
                const legendDes = legendaInColonna ? Math.round(104 * spazioEtichette) : 0;
                // 48px: sotto questa soglia nessuna mandata a capo salva i nomi (restano 3-4
                // caratteri per riga) e tornerebbe il troncamento a metà parola.
                const legendMin = legendaInColonna ? 48 : 0;
                const PANEL_MIN = 78, PANEL_DES = 205;

                const fissi = labW * 3 + axisGap * 3 + faldaGap + (legendaInColonna ? legendGap : 0) + gapPanels * 2 + 16;
                const minimoTotale = fissi + stripMin + faldaMin + legendMin + PANEL_MIN * 2;
                const desiderataTotale = fissi + stripDes + faldaDes + legendDes + PANEL_DES * 2;

                let W = Math.max(LARGH_GRAFICO_MINIMA_PX, Math.round(parseFloat(larghezzaPx) || LARGH_GRAFICO_DEFAULT_PX));
                // LA SOGLIA DI SICUREZZA, dichiarata. Se nemmeno i minimi ci stanno, il disegno
                // esce alla sua larghezza minima e sarà il contenitore a rimpicciolirlo tutto
                // insieme: meglio un grafico piccolo e intero che uno a grandezza giusta con le
                // colonne una sopra l'altra. È l'unico caso in cui si riscala.
                if (W < minimoTotale) W = minimoTotale;

                // L'ORDINE IN CUI SI CEDE SPAZIO, ed è tutto qui il comportamento «un comando,
                // un asse». Le colonne di sinistra (retino, falda, nomi) prendono SEMPRE per prime
                // quello che l'utente ha chiesto con i cursori: sono misure che lui ha deciso.
                // L'avanzo va ai due grafici, che sono gli unici elastici per natura — un asse con
                // meno spazio disegna meno tacche, e nessuno se ne lamenta. Solo quando i grafici
                // sono arrivati al loro minimo si comincia a stringere anche a sinistra, tutti
                // insieme in proporzione.
                //
                // È questo ordine a chiudere il difetto segnalato sul carattere: ingrandire le
                // etichette allarga la fascia dei numeri di profondità, e quella larghezza in più
                // la cedono i pannelli, non la colonna del retino. Prima veniva ripartita fra tutti
                // e il risultato era «ingrandisco il testo e mi si rimpicciolisce il disegno».
                let stripW = stripDes, faldaW = faldaDes, legendW = legendDes;
                let restante = W - fissi - stripW - faldaW - legendW;
                if (restante < PANEL_MIN * 2) {
                    const eccesso = PANEL_MIN * 2 - restante;
                    const elastico = (stripDes - stripMin) + (faldaDes - faldaMin) + (legendDes - legendMin);
                    const q = elastico > 0 ? Math.min(1, eccesso / elastico) : 1;
                    stripW = Math.round(stripDes - (stripDes - stripMin) * q);
                    faldaW = Math.round(faldaDes - (faldaDes - faldaMin) * q);
                    legendW = Math.round(legendDes - (legendDes - legendMin) * q);
                    restante = W - fissi - stripW - faldaW - legendW;
                }
                const panelW = Math.max(PANEL_MIN, Math.floor(restante / 2));

                const panelA_x = 0;
                const panelA_gridX = panelA_x + labW + axisGap;
                const faldaX = panelA_gridX + stripW + faldaGap;
                const legendX = faldaX + faldaW + (legendaInColonna ? legendGap : 0);
                const panelA_w = labW + axisGap + stripW + faldaGap + faldaW + (legendaInColonna ? legendGap + legendW : 0);
                const panelB_x = panelA_x + panelA_w + gapPanels;
                const panelB_gridX = panelB_x + labW + axisGap;
                const panelB_w = panelW;
                const panelB_gridW = Math.max(40, panelB_w - labW - axisGap - 8);
                const panelC_x = panelB_x + panelB_w + gapPanels;
                const panelC_gridX = panelC_x + labW + axisGap;
                const panelC_w = panelW;
                const panelC_gridW = Math.max(40, panelC_w - labW - axisGap - 8);
                const totalW = Math.max(W, panelC_x + panelC_w);

                // ---------- INTESTAZIONE E ALTEZZA TOTALE ----------
                const hBanda = Math.round(fTitolo * 1.75);
                // padTop deve contenere: banda del titolo, riga «SCALA 1:N», e i numeri sopra gli
                // assi dei pannelli B/C. Cresce col carattere perché sono testi, non colonne.
                const padTop = Math.round(hBanda + fScala * 1.5 + fAsse * 2.1 + 4);
                const padBottom = 8;
                const yScale = (d) => padTop + (d / maxDepth) * chartH;

                // ---------- LEGENDA ----------
                const retinoScala = Math.max(0.5, Math.min(3, parseFloat(opzioni.retinoLegenda) || 1));
                const swatch = Math.round(Math.max(6, 9 * retinoScala));
                const swatchGap = Math.max(3, Math.round(swatch * 0.38));
                const rigaLegenda = Math.max(fNome * 1.15, swatch * 0.62);
                const vociStrati = [];
                stratiEff.forEach(se => {
                    const lit = se.strato;
                    if (!lit) return;
                    if (vociStrati.some(v => v.id === lit.id)) return;   // una voce per litologia
                    vociStrati.push({ id: lit.id, nome: lit.name || '', strato: lit });
                });

                // Il cartiglio in basso: quante colonne ci stanno, e quindi quanto è alto.
                const larghNomePiuLungo = Math.max(40, Math.ceil(
                    vociStrati.reduce((m, v) => Math.max(m, v.nome.length), 0) * fNome * 0.62));
                let legendaBassaH = 0, legendaColonneN = 1, legendaCellaW = 0, legendaRigheN = 0;
                if (legendaInBasso && vociStrati.length > 0) {
                    const cellaMin = swatch + swatchGap + Math.min(larghNomePiuLungo, 160);
                    legendaColonneN = legendaModo === 'rigaBasso'
                        ? Math.max(1, Math.floor((totalW - 12) / cellaMin))
                        : Math.max(1, Math.min(4, Math.floor((totalW - 12) / cellaMin)));
                    legendaColonneN = Math.min(legendaColonneN, vociStrati.length);
                    legendaCellaW = Math.floor((totalW - 12) / legendaColonneN);
                    legendaRigheN = Math.ceil(vociStrati.length / legendaColonneN);
                    legendaBassaH = 10 + Math.round(fNome * 1.5) + legendaRigheN * Math.round(swatch + swatchGap) + 8;
                }
                const height = padTop + chartH + padBottom + legendaBassaH;

                // ---------- ASSI DEI DUE GRAFICI ----------
                // Meno spazio nel pannello = meno suddivisioni sull'asse, MAI un font più piccolo.
                const MIN_LABEL_SPACING = Math.max(18, fAsse * 3);
                const divB = Math.max(2, Math.floor(panelB_gridW / MIN_LABEL_SPACING));
                const divC = Math.max(2, Math.floor(panelC_gridW / MIN_LABEL_SPACING));
                const { step: colpiStep, axisMax: maxColpi } = scalaAssePulita(Math.max(...logsCalc.map(l => l.colpi || 0), 5), divB);
                const { step: rpdStep, axisMax: maxRpd } = scalaAssePulita(Math.max(...logsCalc.map(l => l.rpd || 0), 10), divC);

                const C = COLORI_EXPORT;
                let svg = '';

                svg += `<rect x="0" y="0" width="${totalW}" height="${hBanda}" fill="#${C.intestazione}"/>`;
                svg += `<text x="${panelA_x + 2}" y="${hBanda * 0.72}" font-size="${fTitolo}" font-weight="800" font-style="italic" fill="#0f172a">Stratigrafia - PROVA N° ${numeroProva}</text>`;
                svg += `<text x="${panelB_x + panelB_w / 2}" y="${hBanda * 0.72}" font-size="${fTitolo}" font-weight="800" font-style="italic" text-anchor="middle" fill="#0f172a">Colpi (N)</text>`;
                svg += `<text x="${panelC_x + panelC_w / 2}" y="${hBanda * 0.72}" font-size="${fTitolo}" font-weight="800" font-style="italic" text-anchor="middle" fill="#0f172a">Rpd [kg/cm²]</text>`;

                const scalaDenominatore = (() => {
                    const chartHmm = chartH * 25.4 / 96;
                    if (!(chartHmm > 0)) return 100;
                    const grezzo = (maxDepth * 1000) / chartHmm;
                    const candidati = [10, 20, 25, 50, 75, 100, 125, 150, 200, 250, 500, 1000];
                    return candidati.reduce((best, c) => Math.abs(c - grezzo) < Math.abs(best - grezzo) ? c : best, candidati[0]);
                })();
                svg += `<text x="${panelA_x + 2}" y="${hBanda + fScala * 1.15}" font-size="${fScala}" fill="#64748b">SCALA 1:${scalaDenominatore}</text>`;

                const litIdsUsed = new Set(logsCalc.map(l => l.lithology).filter(Boolean));
                stratiEff.forEach(se => { if (se.strato) litIdsUsed.add(se.strato.id); });
                svg += '<defs>';
                const litDisegnate = new Set();
                stratiEff.forEach(se => {
                    const lit = se.strato;
                    if (!lit || litDisegnate.has(lit.id)) return;
                    litDisegnate.add(lit.id);
                    svg += getSvgPatternDef(lit.pattern || 'none', `exp-strat-pat-${lit.id}`, lit.color);
                });
                svg += '</defs>';
                const riempimentoDi = (lit) => litDisegnate.has(lit.id) ? `url(#exp-strat-pat-${lit.id})` : lit.color;

                // ---------- Pannello A: colonna stratigrafica ----------
                for (let i = 0; i * passoTacche <= maxDepth + 1e-6; i++) {
                    const d = i * passoTacche;
                    svg += `<text x="${labW}" y="${yScale(d) + fQuota * 0.36}" font-size="${fQuota}" font-family="monospace" text-anchor="end" fill="#1e293b">${etichettaProf(d)}</text>`;
                }
                svg += `<rect x="${panelA_gridX}" y="${padTop}" width="${stripW}" height="${chartH}" fill="none" stroke="#0f172a" stroke-width="1"/>`;
                stratiEff.forEach(se => {
                    const lit = se.strato;
                    if (!lit) return;
                    const y1 = yScale(se.profonditaDa), y2 = yScale(se.profonditaA);
                    const h = Math.max(0.5, y2 - y1);
                    svg += `<rect x="${panelA_gridX}" y="${y1}" width="${stripW}" height="${h}" fill="${riempimentoDi(lit)}" stroke="#0f172a" stroke-width="0.6"/>`;
                    // Lo spessore resta scritto SUL retino (scelta confermata): bianco in
                    // grassetto con contorno scuro, che si stacca sia dalle sabbie chiare sia
                    // dalle argille scure. Si scrive solo se la fascia è alta abbastanza da
                    // contenerlo, altrimenti il numero starebbe a cavallo di due strati.
                    if (h >= fSpessore * 1.25) {
                        svg += `<text x="${panelA_gridX + stripW / 2}" y="${y1 + h / 2 + fSpessore * 0.36}" font-size="${fSpessore}" font-weight="800" text-anchor="middle" fill="#ffffff" stroke="#0f172a" stroke-width="${Math.max(1.2, fSpessore * 0.24)}" paint-order="stroke fill" stroke-linejoin="round">${fmtIT(se.profonditaA - se.profonditaDa, 1)}</text>`;
                    }
                });

                if (faldaGrafico.presente) {
                    const yFalda1 = yScale(faldaGrafico.da), yFalda2 = yScale(faldaGrafico.a);
                    svg += `<rect x="${faldaX}" y="${padTop}" width="${faldaW}" height="${chartH}" fill="#ffffff" stroke="#0f172a" stroke-width="0.8"/>`;
                    svg += `<rect x="${faldaX}" y="${yFalda1}" width="${faldaW}" height="${Math.max(0.5, yFalda2 - yFalda1)}" fill="#8ee8f5" stroke="none"/>`;
                    svg += `<line x1="${faldaX}" y1="${yFalda1}" x2="${faldaX + faldaW}" y2="${yFalda1}" stroke="#0369a1" stroke-width="1.2"/>`;
                    const cx = faldaX + faldaW / 2, yv = yFalda1 - 1.5;
                    svg += `<path d="M ${cx - 3.2} ${yv - 5} L ${cx + 3.2} ${yv - 5} L ${cx} ${yv} Z" fill="#0369a1" stroke="#0369a1" stroke-width="0.6" stroke-linejoin="round"/>`;
                    svg += `<rect x="${faldaX}" y="${padTop}" width="${faldaW}" height="${chartH}" fill="none" stroke="#0f172a" stroke-width="0.8"/>`;
                    // Ancorata al triangolo appena disegnato sopra (richiesto esplicitamente: prima
                    // stava fissa in cima al grafico, scollegata da dove la falda comincia davvero, e
                    // si sovrapponeva alle etichette degli strati quando la falda iniziava a metà
                    // colonna) — centrata sul vertice, appena sopra la base del triangolo. Il
                    // Math.max evita che finisca nella banda del titolo per una falda che comincia
                    // vicinissima alla superficie (yv quasi uguale a padTop).
                    const yEtichettaFalda = Math.max(padTop + fNome, yv - 6);
                    svg += `<text x="${cx}" y="${yEtichettaFalda}" font-size="${fNome}" font-weight="700" text-anchor="middle" fill="#0369a1">${escapeHtmlDidascalia(faldaGrafico.etichetta)}</text>`;
                }

                // ---------- LEGENDA A FIANCO ----------
                if (legendaInColonna && vociStrati.length > 0) {
                    // LO SPAZIO DEI NOMI, VISIBILE (segnalato: «non è ben chiaro quale e dove sia
                    // e quanto sia largo e dove torni a capo»). Nell'editor si disegna il riquadro
                    // entro cui il testo va a capo: è esattamente la larghezza che lo slider
                    // regola, e vederla è l'unico modo per regolarla con cognizione. In stampa
                    // non compare — è una guida di lavoro, non un elemento del documento.
                    if (opzioni.mostraGuidaNomi) {
                        svg += `<rect x="${legendX}" y="${padTop}" width="${legendW}" height="${chartH}" fill="rgba(245,158,11,0.06)" stroke="#f59e0b" stroke-width="0.8" stroke-dasharray="3 3"/>`;
                        svg += `<text x="${legendX + legendW / 2}" y="${padTop - 3}" font-size="${Math.max(5, fNome * 0.85)}" text-anchor="middle" fill="#b45309">spazio nomi ${legendW}px</text>`;
                    }
                    const textX = legendX + swatch + swatchGap;
                    const charsPerRiga = Math.max(5, Math.floor((legendW - swatch - swatchGap) / (fNome * 0.62)));
                    const voci = [];
                    stratiEff.forEach(se => {
                        const lit = se.strato;
                        if (!lit) return;
                        const y1 = yScale(se.profonditaDa), y2 = yScale(se.profonditaA);
                        const righe = spezzaEtichettaInRighe(lit.name || '', charsPerRiga, 4);
                        if (righe.length === 0) return;
                        const h = righe.length * rigaLegenda;
                        voci.push({ righe, lit, h, yIdeale: (y1 + y2) / 2 - h / 2 });
                    });
                    voci.sort((a, b) => a.yIdeale - b.yIdeale);
                    disponiEtichetteSenzaSovrapposizioni(voci, padTop + 2, padTop + chartH, 2.5);
                    voci.forEach(v => {
                        svg += `<rect x="${legendX}" y="${v.y + 0.8}" width="${swatch}" height="${swatch}" fill="${riempimentoDi(v.lit)}" stroke="#0f172a" stroke-width="0.5"/>`;
                        const tspan = v.righe.map((r, i) =>
                            `<tspan x="${textX}" dy="${i === 0 ? 0 : rigaLegenda}">${escapeHtmlDidascalia(r)}</tspan>`).join('');
                        svg += `<text x="${textX}" y="${v.y + fNome}" font-size="${fNome}" font-weight="700" fill="#0f172a">${tspan}</text>`;
                    });
                }

                // ---------- Pannelli B/C ----------
                const drawDepthAxis = (gridX, gridW) => {
                    let s = `<rect x="${gridX}" y="${padTop}" width="${gridW}" height="${chartH}" fill="#f4f7fb"/>`;
                    for (let i = 0; i * passoTacche <= maxDepth + 1e-6; i++) {
                        const d = i * passoTacche;
                        const y = yScale(d);
                        s += `<line x1="${gridX}" y1="${y}" x2="${gridX + gridW}" y2="${y}" stroke="#b8c4d1" stroke-width="0.7"/>`;
                        s += `<text x="${gridX - axisGap}" y="${y + fQuota * 0.36}" font-size="${fQuota}" font-family="monospace" text-anchor="end" fill="#1e293b">${etichettaProf(d)}</text>`;
                    }
                    s += `<line x1="${gridX}" y1="${padTop}" x2="${gridX}" y2="${padTop + chartH}" stroke="#334155" stroke-width="1"/>`;
                    s += `<line x1="${gridX}" y1="${padTop + chartH}" x2="${gridX + gridW}" y2="${padTop + chartH}" stroke="#334155" stroke-width="1"/>`;
                    return s;
                };
                svg += drawDepthAxis(panelB_gridX, panelB_gridW);
                svg += drawDepthAxis(panelC_gridX, panelC_gridW);

                const xScaleB = (v) => panelB_gridX + (v / maxColpi) * panelB_gridW;
                const xScaleC = (v) => panelC_gridX + (v / maxRpd) * panelC_gridW;
                for (let v = 0; v <= maxColpi + 0.001; v += colpiStep) {
                    const x = xScaleB(v);
                    svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + chartH}" stroke="#c8d2dc" stroke-width="0.7"/>`;
                    svg += `<text x="${x}" y="${padTop - 3}" font-size="${fAsse}" text-anchor="middle" fill="#64748b">${Math.round(v)}</text>`;
                }
                for (let v = 0; v <= maxRpd + 0.001; v += rpdStep) {
                    const x = xScaleC(v);
                    svg += `<line x1="${x}" y1="${padTop}" x2="${x}" y2="${padTop + chartH}" stroke="#c8d2dc" stroke-width="0.7"/>`;
                    svg += `<text x="${x}" y="${padTop - 3}" font-size="${fAsse}" text-anchor="middle" fill="#64748b">${Math.round(v)}</text>`;
                }

                const buildStaircasePath = (xScale, getVal) => {
                    let d = '';
                    logsCalc.forEach((log, i) => {
                        const x = xScale(getVal(log));
                        const y1 = yScale(log.start), y2 = yScale(log.end);
                        d += (i === 0 ? `M ${x} ${y1} ` : `L ${x} ${y1} `) + `L ${x} ${y2} `;
                    });
                    return d;
                };
                svg += `<path d="${buildStaircasePath(xScaleB, l => l.colpi || 0)}" fill="none" stroke="#1d4ed8" stroke-width="1.4"/>`;

                const puntiRpd = logsCalc.map(log => ({
                    x: xScaleC(log.rpd || 0),
                    y: (yScale(log.start) + yScale(log.end)) / 2
                }));
                svg += `<path d="${puntiRpd.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')}" fill="none" stroke="#dc2626" stroke-width="1.4"/>`;
                puntiRpd.forEach(p => { svg += `<circle cx="${p.x}" cy="${p.y}" r="1.6" fill="#dc2626"/>`; });

                logsCalc.forEach((log, i) => {
                    const yMid = (yScale(log.start) + yScale(log.end)) / 2 + fPunto * 0.36;
                    svg += `<text x="${xScaleB(log.colpi || 0) + 3}" y="${yMid}" font-size="${fPunto}" font-weight="700" fill="#1d4ed8">${log.colpi || 0}</text>`;
                    svg += `<text x="${puntiRpd[i].x + 3}" y="${yMid}" font-size="${fPunto}" font-weight="700" fill="#dc2626">${Math.round(log.rpd || 0)}</text>`;
                });

                // ---------- CARTIGLIO DELLA LEGENDA IN BASSO ----------
                if (legendaInBasso && vociStrati.length > 0) {
                    const y0 = padTop + chartH + padBottom;
                    svg += `<rect x="0" y="${y0}" width="${totalW}" height="${legendaBassaH - 2}" fill="#f8fafc" stroke="#cbd5e1" stroke-width="0.8"/>`;
                    svg += `<text x="6" y="${y0 + fNome * 1.25}" font-size="${Math.max(5, fNome * 0.92)}" font-weight="800" letter-spacing="0.4" fill="#64748b">LEGENDA</text>`;
                    const yVoci = y0 + Math.round(fNome * 1.5) + 6;
                    const passoRiga = Math.round(swatch + swatchGap);
                    const charsCella = Math.max(4, Math.floor((legendaCellaW - swatch - swatchGap - 6) / (fNome * 0.62)));
                    vociStrati.forEach((v, i) => {
                        const col = legendaModo === 'rigaBasso' ? (i % legendaColonneN) : Math.floor(i / legendaRigheN);
                        const riga = legendaModo === 'rigaBasso' ? Math.floor(i / legendaColonneN) : (i % legendaRigheN);
                        const x = 6 + col * legendaCellaW;
                        const y = yVoci + riga * passoRiga;
                        svg += `<rect x="${x}" y="${y}" width="${swatch}" height="${swatch}" fill="${riempimentoDi(v.strato)}" stroke="#0f172a" stroke-width="0.5"/>`;
                        const nome = v.nome.length > charsCella ? v.nome.slice(0, Math.max(1, charsCella - 1)) + '…' : v.nome;
                        svg += `<text x="${x + swatch + swatchGap}" y="${y + swatch * 0.78}" font-size="${fNome}" font-weight="700" fill="#0f172a">${escapeHtmlDidascalia(nome)}</text>`;
                    });
                }

                // width:100% con max-width pari alla larghezza calcolata: dentro il suo blocco
                // 1 unità = 1 px, quindi il carattere stampa nei punti che dice di stampare. Se
                // il contenitore fosse più stretto (foglio ridotto, anteprima in miniatura) il
                // disegno si rimpicciolisce tutto insieme, che è il comportamento giusto per una
                // vista ridotta — non per una regolazione.
                return `<svg viewBox="0 0 ${totalW} ${height}" width="100%" style="max-width:${totalW}px; height:auto; display:block; margin:0 auto; background:#fff; font-family:Arial,sans-serif;">${svg}</svg>`;
            }

