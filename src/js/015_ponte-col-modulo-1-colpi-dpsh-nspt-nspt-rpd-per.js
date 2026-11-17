            // =========================================================================
            // PONTE COL MODULO 1: colpi DPSH -> Nspt/Nspt'/Rpd, per intervallo e per strato
            // Formule verificate numericamente sul foglio Nardò_DPSH1.ods (fogli INPUT/
            // OUTPUT): βt = M²·H / (A·passo·(M+pesoAsta)·7.2); Nspt = βt·colpi;
            // Nspt' = correzione dilatanza Terzaghi-Peck se l'intervallo è in falda.
            // =========================================================================

            /** Legge la falda di un'intestazione (state.header o surv.header) con fallback "assente". */
            function faldaDaHeader(header){
                const da = parseFloat(header && header.faldaDa);
                const a = parseFloat(header && header.faldaA);
                return { faldaDa: Number.isNaN(da) ? Infinity : da, faldaA: Number.isNaN(a) ? Infinity : a };
            }

            /** UNICA fonte dei parametri dello strumento per βt e Rpd (prima la formula era scritta
             * in 4 posti con varianti). Regola scelta, uguale ovunque: un parametro vuoto, non
             * numerico, zero o negativo NON e' un valore fisico valido (una massa di 0 kg non esiste)
             * e viene sostituito dal valore standard DPSH. La sostituzione non e' silenziosa:
             * `sostituiti` elenca i campi toccati, cosi' l'interfaccia puo' avvisare.
             * Per valori validi il risultato e' identico a prima, cifra per cifra. */
            function parametriStrumento(instrument, stepCm){
                const STANDARD = { pesoMassa: 63.50, volata: 0.75, areaPunta: 20, pesoAsta: 6.30, pesoSistema: 8.00 };
                const inst = instrument || {};
                const sostituiti = [];
                const leggi = (campo) => {
                    const v = parseFloat(inst[campo]);
                    if (isFinite(v) && v > 0) return v;
                    // Un campo mai compilato (undefined/'') non e' una sostituzione da segnalare.
                    if (inst[campo] !== undefined && inst[campo] !== null && inst[campo] !== '') sostituiti.push(campo);
                    return STANDARD[campo];
                };
                const passo = parseFloat(stepCm);
                const volataM = leggi('volata');
                return {
                    M: leggi('pesoMassa'),
                    volataM,
                    H: volataM * 100,
                    A: leggi('areaPunta'),
                    s: (isFinite(passo) && passo > 0) ? passo : 20,
                    pesoAsta: leggi('pesoAsta'),
                    pesoSistema: leggi('pesoSistema'),
                    sostituiti
                };
            }

            /** Il coefficiente CALCOLATO dai parametri fisici dello strumento. Sempre disponibile,
             * anche quando ne e' imposto un altro: il confronto tra i due e' l'unica cosa che
             * rende visibile una divergenza invece di lasciarla implicita. */
            function betaTCalcolato(instrument, stepCm){
                const p = parametriStrumento(instrument, stepCm);
                return (p.M * p.M * p.H) / (p.A * p.s * (p.M + p.pesoAsta)) / 7.2;
            }

            function betaTStrumento(instrument, stepCm){
                // Valore imposto: si usa solo se c'e' ED e' un numero sensato. Un campo vuoto o
                // uno zero non devono poter azzerare tutti gli Nspt della prova in silenzio.
                if (instrument && instrument.betaTForzato) {
                    const forzato = parseFloat(instrument.betaTForzato);
                    if (isFinite(forzato) && forzato > 0) return forzato;
                }
                return betaTCalcolato(instrument, stepCm);
            }

            /** Rpd di un singolo intervallo (formula olandese, identica a quella già usata altrove in Modulo 1).
             * `astaNr` (facoltativo) sostituisce log.asta quando il log non lo porta (export di progetto). */
            function rpdDiLog(log, instrument, stepCm, astaNr){
                const p = parametriStrumento(instrument, stepCm);
                const asta = (astaNr !== undefined) ? astaNr : log.asta;
                const Mprime = (asta * p.pesoAsta) + p.pesoSistema;
                if(!log.colpi || log.colpi <= 0) return 0;
                return (p.M * p.M * p.H * log.colpi) / (p.A * p.s * (p.M + Mprime));
            }

            /** Nspt grezzo e Nspt' (falda-corretto) di un singolo intervallo. */
            function nsptDiLog(log, betaT, falda){
                const nsptGrezzo = betaT * (log.colpi || 0);
                // Confronto al millimetro (004d): un intervallo che finisce a «2,00» salvato come
                // 1,9999999999999998 deve ricevere la correzione come quello salvato 2.
                const fine = profonditaAlMillimetro(log.end);
                const finiscePoiFalda = fine >= profonditaAlMillimetro(falda.faldaDa) && fine <= profonditaAlMillimetro(falda.faldaA);
                const nsptFalda = (finiscePoiFalda && nsptGrezzo > 15) ? 15 + 0.5 * (nsptGrezzo - 15) : nsptGrezzo;
                return { nsptGrezzo, nsptFalda };
            }

            /** Litologia effettiva (con ereditarietà) per l'intervallo idx, in un array di logs/strati arbitrario
             * (serve per calcolare l'export su prove diverse da quella correntemente aperta). */
            function getEffectiveLithologyIn(idx, logsArr, stratiArr){
                if(!stratiArr || stratiArr.length === 0) return null;
                let currentLitId = stratiArr[0].id;
                for (let i = 0; i <= idx && i < logsArr.length; i++) {
                    if (logsArr[i].lithology) currentLitId = logsArr[i].lithology;
                }
                return stratiArr.find(s => s.id === currentLitId) || stratiArr[0];
            }
            function getLogsPerStratoIn(stratoId, logsArr, stratiArr){
                if(!logsArr || logsArr.length === 0) return [];
                return logsArr.filter((log, idx) => {
                    const lit = getEffectiveLithologyIn(idx, logsArr, stratiArr);
                    return lit && lit.id === stratoId;
                });
            }

            /** Costruisce l'elenco ordinato degli strati EFFETTIVAMENTE presenti in una prova (quelli con
             * almeno un intervallo assegnato), con profonditaDa/A, Nspt/Nspt'/Rpd medi aggregati sugli
             * intervalli di quella prova — pronto per elaboraStratiProva(). stratiArr = ordine di progetto
             * (top -> down); instrument/stepCm/falda sono quelli DI QUELLA PROVA (ogni prova può avere il
             * proprio strumento/passo salvato, vedi syncStateToProject). */
            function stratiEffettiviProva(logsArr, stratiArr, instrument, stepCm, falda){
                if(!logsArr || logsArr.length === 0 || !stratiArr || stratiArr.length === 0) return [];
                const betaT = betaTStrumento(instrument, stepCm);
                const risultati = [];
                for(const strato of stratiArr){
                    const logsStrato = getLogsPerStratoIn(strato.id, logsArr, stratiArr);
                    if(logsStrato.length === 0) continue;
                    let sommaGrezzo=0, sommaFalda=0, sommaRpd=0;
                    let profonditaDa=Infinity, profonditaA=-Infinity;
                    logsStrato.forEach(log=>{
                        const {nsptGrezzo, nsptFalda} = nsptDiLog(log, betaT, falda);
                        sommaGrezzo += nsptGrezzo; sommaFalda += nsptFalda;
                        sommaRpd += rpdDiLog(log, instrument, stepCm);
                        if(log.start < profonditaDa) profonditaDa = log.start;
                        if(log.end > profonditaA) profonditaA = log.end;
                    });
                    const n = logsStrato.length;
                    ensureParametriAvanzati(strato);
                    risultati.push({
                        id: strato.id,
                        strato,
                        profonditaDa, profonditaA,
                        nsptGrezzo: sommaGrezzo / n,
                        nsptFalda: sommaFalda / n,
                        rpdMedio: sommaRpd / n,
                        isCoesivo: strato.behavior === 'coesivo',
                        isIncoerente: strato.behavior !== 'coesivo',
                        parametriAvanzati: strato.parametriAvanzati,
                        nIntervalli: n,
                    });
                }
                // Ordina per profondità (top -> down): garantisce una cascata sigma'v0 corretta anche se
                // gli strati non fossero stati definiti in ordine stratigrafico in state.strati.
                risultati.sort((a,b)=>a.profonditaDa-b.profonditaDa);
                return risultati;
            }

