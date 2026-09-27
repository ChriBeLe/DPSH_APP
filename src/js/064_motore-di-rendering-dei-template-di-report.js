            // ===================== MOTORE DI RENDERING DEI TEMPLATE DI REPORT =====================
            // "classico" (pages:null) resta gestito dall'implementazione storica sotto, pixel-identica
            // a quella già approvata. Un template PERSONALIZZATO (creato con l'editor a griglia, non
            // ancora costruito) ha invece pages valorizzato e passa da qui: stesso identico contenuto
            // dei blocchi (dati prova, tabella, grafico, inquadramento, foto), ma libero di essere
            // riposizionato/ridimensionato pagina per pagina. Tenere i "contenuti" (buildBlockContentHtml)
            // separati dalla "disposizione" (buildPaginaGrigliaHtml) è ciò che permette all'editor
            // futuro di ricomporre gli stessi blocchi senza duplicare la logica di calcolo.

            // =========================================================================
            // IL TESTO DEL CAPITOLO INTRODUTTIVO — segnaposto, concordanze, alternative
            //
            // Tre cose distinte, tenute distinte di proposito:
            //
            //  1. i VALORI del cantiere, letti dal progetto e dalle sue prove;
            //  2. le CONCORDANZE (singolare/plurale), che non sono un valore ma una frase
            //     intera gia' accordata — perche' l'italiano non si concorda a segnaposto;
            //  3. le ALTERNATIVE [[a|b|c]], che danno varieta' senza toccare il significato.
            //
            // Il testo generato viene SCRITTO nel blocco, non ricalcolato in stampa: cosi'
            // l'anteprima e' il documento, per costruzione e non per attenzione.
            // =========================================================================

            /** Generatore pseudo-casuale deterministico (mulberry32): stesso seme, stessa
             * sequenza, su qualunque dispositivo. Serve proprio perche' NON sia casuale davvero:
             * due generazioni dello stesso cantiere devono dare lo stesso testo. */
            function generatoreCasualeDaSeme(seme) {
                let a = (parseInt(seme, 10) || 1) >>> 0;
                return function () {
                    a |= 0; a = (a + 0x6D2B79F5) | 0;
                    let t = Math.imul(a ^ (a >>> 15), 1 | a);
                    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
                };
            }

            /** Espande le alternative [[una|due|tre]], anche annidate. Si risolvono sempre le
             * PIU' INTERNE per prime: e' l'unico ordine che permette a un'alternativa di
             * contenerne un'altra senza che le parentesi si accavallino. */
            function espandiAlternativeTesto(testo, casuale) {
                let risultato = String(testo || '');
                let giri = 0;
                // Un limite di giri, non un while(true): un testo con parentesi sbilanciate non
                // deve poter bloccare l'app in un ciclo infinito.
                while (/\[\[[^\[\]]*\]\]/.test(risultato) && giri++ < 50) {
                    risultato = risultato.replace(/\[\[([^\[\]]*)\]\]/g, (tutto, dentro) => {
                        const scelte = String(dentro).split('|');
                        if (scelte.length === 1) return scelte[0];
                        return scelte[Math.floor(casuale() * scelte.length)] || scelte[0];
                    });
                }
                return risultato;
            }

            /** Elenco in italiano: "DPSH 1", "DPSH 1 e DPSH 2", "DPSH 1, DPSH 2 e DPSH 3". */
            function elencoItaliano(voci) {
                const v = (voci || []).filter(x => x !== null && x !== undefined && String(x).length);
                if (v.length === 0) return '';
                if (v.length === 1) return String(v[0]);
                return v.slice(0, -1).join(', ') + ' e ' + v[v.length - 1];
            }

            /** Tutti i valori che il testo puo' chiedere, letti dal progetto e dalle sue prove.
             * Ogni voce dice anche DA DOVE viene e se manca: e' quell'informazione, non il
             * valore, a rendere possibile il pannello "Dati del cantiere" e il conteggio delle
             * informazioni assenti. */
            /** Le coordinate del cantiere in forma leggibile. Una sola prova: il suo punto.
             * Piu' prove: il punto medio, perche' "le coordinate del sito" sono una cosa sola e
             * un elenco di cinque coppie in mezzo a una frase non si legge. Le prove senza GPS
             * non entrano nel conto invece di far scendere la media verso lo zero — che e' la
             * ragione per cui qui non si usa un semplice reduce su tutte. */
            function formattaCoordinateProve(prove) {
                const punti = (prove || [])
                    .map(s => ({ lat: parseFloat(s.header && s.header.lat), lng: parseFloat(s.header && s.header.lng) }))
                    .filter(p => isFinite(p.lat) && isFinite(p.lng) && (p.lat !== 0 || p.lng !== 0));
                if (punti.length === 0) return '';
                const lat = punti.reduce((a, p) => a + p.lat, 0) / punti.length;
                const lng = punti.reduce((a, p) => a + p.lng, 0) / punti.length;
                const g = (n, pos, neg) => fmtIT(Math.abs(n), 5) + '° ' + (n >= 0 ? pos : neg);
                return g(lat, 'N', 'S') + ' — ' + g(lng, 'E', 'O');
            }

            function valoriCantiere(proj) {
                // Una prova per verticale: le interpretazioni alternative («3B») sono la stessa prova
                // eseguita, non una in più. Senza, il testo direbbe «4 prove» invece di 3.
                const prove = proveFisiche(Object.values((proj && proj.surveys) || {})
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0)));
                const n = prove.length;
                const prima = prove[0] || {};
                const inst = prima.instrument || state.instrument || {};
                const passo = parseFloat((prima.settings && prima.settings.stepCm) || (state.settings && state.settings.stepCm) || 20);

                // Profondita' raggiunta da ciascuna verticale: il massimo degli intervalli.
                const profondita = prove
                    .map(s => (s.logs || []).reduce((m, l) => Math.max(m, parseFloat(l.end) || 0), 0))
                    .filter(p => p > 0);
                const pMin = profondita.length ? Math.min(...profondita) : null;
                const pMax = profondita.length ? Math.max(...profondita) : null;
                const stessaQuota = pMin !== null && Math.abs(pMax - pMin) < 0.005;

                const areaPunta = parseFloat(inst.areaPunta || 20);
                const diametro = 2 * Math.sqrt(areaPunta / Math.PI) * 10; // cm² -> mm
                const beta = betaTStrumento(inst, passo);

                const v = {};
                const metti = (chiave, testo, etichetta, origine) => {
                    const s = (testo === null || testo === undefined) ? '' : String(testo).trim();
                    v[chiave] = { testo: s, etichetta, origine, mancante: s.length === 0 };
                };

                metti('committente', proj && proj.committente, 'Committente', 'Intestazione cantiere');
                metti('sedeCommittente', proj && proj.sedeCommittente, 'Sede del committente', 'Intestazione cantiere');
                metti('denominazioneIntervento', proj && proj.denominazioneIntervento, 'Denominazione intervento', 'Intestazione cantiere');
                metti('comune', proj && proj.comune, 'Comune', 'Intestazione cantiere');
                metti('localita', proj && proj.localita, 'Località', 'Intestazione cantiere');
                metti('provincia', proj && proj.provincia, 'Provincia', 'Intestazione cantiere');
                metti('data', formattaDataIT(proj && proj.date), 'Data', 'Intestazione cantiere');
                metti('numeroProve', n > 0 ? n : '', 'Numero di prove', 'Conteggio delle prove');
                metti('elencoProve', elencoItaliano(prove.map(s => 'DPSH ' + ((s.header && s.header.provaNr) || '?'))), 'Elenco delle prove', 'Prove del progetto');
                metti('profonditaMax', pMax !== null ? fmtIT(pMax, 1) : '', 'Profondità massima (m)', 'Registro misurazioni');
                metti('profonditaMin', pMin !== null ? fmtIT(pMin, 1) : '', 'Profondità minima (m)', 'Registro misurazioni');

                metti('nomePenetrometro', inst.nomePenetrometro, 'Nome del penetrometro', 'Strumento');
                metti('rivestimentoFanghi', inst.rivestimentoFanghi, 'Rivestimento / fanghi', 'Strumento');
                metti('massaBattente', fmtIT(parseFloat(inst.pesoMassa || 63.5), 1), 'Massa battente (kg)', 'Strumento');
                metti('altezzaCaduta', fmtIT(parseFloat(inst.volata || 0.75), 2), 'Altezza di caduta (m)', 'Strumento');
                metti('pesoSistemaBattuta', fmtIT(parseFloat(inst.pesoSistema || 8), 1), 'Massa sistema di battuta (kg)', 'Strumento');
                metti('areaPunta', fmtIT(areaPunta, 0), 'Area di base punta (cm²)', 'Strumento');
                metti('diametroPunta', fmtIT(diametro, 2), 'Diametro punta (mm)', 'Calcolato dall\'area');
                metti('lunghezzaAste', fmtIT(parseFloat(inst.lunghAsta || 1), 0), 'Lunghezza aste (m)', 'Strumento');
                metti('pesoAsteMetro', fmtIT(parseFloat(inst.pesoAsta || 6.3), 1), 'Massa aste al metro (kg/m)', 'Strumento');
                metti('avanzamentoPunta', fmtIT(passo / 100, 2), 'Avanzamento punta (m)', 'Impostazioni prova');
                metti('numeroColpiPunta', 'N(' + Math.round(passo) + ')', 'Numero colpi per avanzamento', 'Impostazioni prova');
                metti('coeffCorrelazione', fmtIT(beta, 3), 'Coefficiente di correlazione βt', 'Calcolato dallo strumento');
                metti('angoloPunta', fmtIT(parseFloat(inst.angoloPunta || 90), 0), 'Angolo di apertura punta (°)', 'Strumento');

                // ---- LE CONCORDANZE ----
                // Non sono valori: sono frasi gia' accordate. L'italiano non si concorda con un
                // segnaposto — "5 sondaggio spinti" e "n. 1 prova spinte" sono esattamente gli
                // errori che nascono provandoci. Qui la frase la costruisce chi SA quante prove
                // ci sono, e all'utente resta un segnaposto solo da scrivere.
                const unaSola = n === 1;
                metti('fraseSondaggi', n === 0 ? '' : (unaSola
                    ? 'è stato realizzato un sondaggio DPSH spinto'
                    : 'sono stati realizzati ' + n + ' sondaggi DPSH spinti'),
                    'Frase «sondaggi realizzati»', 'Concordata sul numero di prove');
                metti('fraseProveEseguite', n === 0 ? '' : (unaSola
                    ? 'è stata realizzata n. 1 prova DPSH, spinta'
                    : 'sono state realizzate n. ' + n + ' prove DPSH, spinte'),
                    'Frase «prove eseguite»', 'Concordata sul numero di prove');
                metti('fraseProfondita', pMax === null ? '' : (stessaQuota
                    ? 'fino alla profondità di ' + fmtIT(pMax, 1) + ' m'
                    : 'fino a profondità comprese tra ' + fmtIT(pMin, 1) + ' e ' + fmtIT(pMax, 1) + ' m'),
                    'Frase «profondità raggiunta»', 'Concordata sulle profondità reali');
                metti('didascaliaFigura', n === 0 ? '' : (unaSola
                    ? 'Sito di indagine e punto di sondaggio'
                    : 'Sito di indagine e punti di sondaggio'),
                    'Didascalia della figura', 'Concordata sul numero di prove');
                // L'UBICAZIONE. Nelle due relazioni di riferimento non c'era: una relazione
                // geologica che non dice DOVE e' il cantiere e' incompleta, ed e' una mancanza
                // che nessuno nota finche' non serve ritrovare il sito.
                // La frase si costruisce qui perche' le sue parti sono facoltative — un cantiere
                // puo' non avere la localita', o le coordinate — e "in agro del Comune di , in
                // localita' , alle coordinate" sarebbe peggio di niente.
                metti('coordinate', formattaCoordinateProve(prove), 'Coordinate geografiche', 'GPS delle prove');

                const pezziUbicazione = [];
                const comuneU = (proj && proj.comune) ? String(proj.comune).trim() : '';
                const provinciaU = (proj && proj.provincia) ? String(proj.provincia).trim() : '';
                const localitaU = (proj && proj.localita) ? String(proj.localita).trim() : '';
                if (comuneU) pezziUbicazione.push('in agro del Comune di ' + comuneU + (provinciaU ? ' (' + provinciaU + ')' : ''));
                if (localitaU) pezziUbicazione.push('in località ' + localitaU);
                // LE COORDINATE. Due errori che si nascondevano a vicenda: la chiave
                // 'coordinate' non veniva mai creata da questa funzione, e qui la si leggeva
                // come `.valore` invece che `.testo` (il campo che metti() scrive davvero).
                // Il primo errore rendeva il secondo invisibile: v.coordinate era undefined,
                // quindi il nome sbagliato non poteva dare fastidio. Risultato: il tag
                // @Coordinate non ha mai mostrato niente, e la frase di ubicazione non ha mai
                // detto dove fosse il cantiere — proprio la mancanza per cui e' stata scritta.
                const coordU = (v.coordinate && v.coordinate.testo) ? v.coordinate.testo : '';
                if (coordU) pezziUbicazione.push('alle coordinate geografiche ' + coordU);
                metti('fraseUbicazione', pezziUbicazione.length === 0 ? '' : (
                    (unaSola ? 'L\'area di indagine è ubicata ' : 'Le aree di indagine sono ubicate ')
                    + elencoItaliano(pezziUbicazione) + '.'),
                    'Frase «ubicazione del sito»', 'Comune, provincia, località e coordinate');

                return v;
            }

            /** Applica le correzioni fatte a mano dall'utente SOPRA i valori automatici. Non
             * tocca il progetto: e' la richiesta esplicita di poter correggere il testo di un
             * cantiere senza dover rimettere mano all'anagrafica. */
