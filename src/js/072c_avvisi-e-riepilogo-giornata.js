            // ===================== AVVISI SUI DATI E RIEPILOGO DELLA GIORNATA =====================
            // Due strumenti che SEGNALANO soltanto: non correggono e non cambiano nessun calcolo.
            //
            // 1) Avvisi sui dati strani. Le regole vengono solo dal foglio Nardò_DPSH1.ods (campi e
            //    formule di INPUT/OUTPUT) e dal motore di calcolo già nell'app (015):
            //      - passo:      il foglio e il motore leggono i colpi come «colpi per UN passo»
            //                    (Nspt = βt·colpi, βt dipende dal passo): un intervallo di lunghezza
            //                    diversa dal passo dà un Nspt che non è confrontabile;
            //      - aste:       il numero dell'asta entra nell'Rpd (M' = asta·peso asta + peso sistema)
            //                    e si ricava dalla profondità e dalla lunghezza dell'asta;
            //      - strumento:  il motore sostituisce coi valori standard i campi non validi
            //                    (parametriStrumento) — qui lo si dice;
            //      - passo:      il passo dello strumento (m) deve essere quello della prova (cm);
            //      - βt imposto: diverso dal βt che darebbero i parametri dello strumento;
            //      - falda:      valori non numerici, o «da» sotto «a» al contrario.
            //    NESSUNA soglia sui colpi (colpi «troppo alti» o «salti»): il foglio non ne ha.
            //    Gli errori di struttura (buchi, sovrapposti, colpi non interi...) sono già nel
            //    controllo di integrità (004c): qui non si ripetono.
            // 2) Riepilogo della giornata: cosa è stato registrato in un giorno, prova per prova.
            //    Il giorno di un intervallo è quello (locale) di registratoIl (004d); per i dati
            //    vecchi, senza registratoIl, vale la data dell'intestazione della prova.

            const TOLLERANZA_AVVISI_M = 0.005;      // mezzo centimetro, come il controllo di integrità
            const TOLLERANZA_BETAT = 0.0005;        // βt si mostra con tre decimali

            const fmtM2 = (m) => (Math.round(Number(m) * 100) / 100).toFixed(2).replace('.', ',');
            const fmtBetaT = (v) => (Math.round(v * 1000) / 1000).toFixed(3).replace('.', ',');

            /** Gli avvisi di UNA prova. Ritorna [{ tipo, testo, intervalli? }] (intervalli = numeri
             * d'ordine da 1). Prova vuota o illeggibile: nessun avviso (ci pensa l'integrità). */
            function avvisiDatiProva(surv) {
                const avvisi = [];
                if (!surv || typeof surv !== 'object') return avvisi;
                const inst = surv.instrument || {};
                const h = surv.header || {};
                const stepCm = (surv.settings && Number(surv.settings.stepCm) > 0) ? Number(surv.settings.stepCm) : 20;
                const passoM = stepCm / 100;
                const logs = Array.isArray(surv.logs) ? surv.logs : [];

                // Intervalli di lunghezza diversa dal passo (gli esclusi dai calcoli non contano).
                const fuoriPasso = [];
                const astaSbagliata = [];
                const rod = parseFloat(inst.lunghAsta) > 0 ? parseFloat(inst.lunghAsta) : 1;
                logs.forEach((l, i) => {
                    if (!l || typeof l.start !== 'number' || typeof l.end !== 'number' || !isFinite(l.start) || !isFinite(l.end)) return;
                    if (typeof intervalloSoloGrafico === 'function' && intervalloSoloGrafico(l)) return;
                    if (Math.abs((l.end - l.start) - passoM) > TOLLERANZA_AVVISI_M) fuoriPasso.push(i + 1);
                    // Stessa regola di getRodForDepth (020), ma sulla lunghezza asta DI QUELLA prova.
                    const attesa = l.end <= 0 ? 1 : Math.floor((l.end - 0.0001) / rod) + 1;
                    if (Number.isFinite(l.asta) && l.asta !== attesa) astaSbagliata.push(i + 1);
                });
                const elenco = (n) => n.length <= 5 ? n.join(', ') : n.slice(0, 5).join(', ') + ' e altri ' + (n.length - 5);
                if (fuoriPasso.length) {
                    avvisi.push({ tipo: 'passo-intervallo', intervalli: fuoriPasso,
                        testo: `${fuoriPasso.length === 1 ? 'L\'intervallo' : 'Gli intervalli'} n. ${elenco(fuoriPasso)} ${fuoriPasso.length === 1 ? 'non è lungo' : 'non sono lunghi'} come il passo (${fmtM2(passoM)} m): il calcolo legge i colpi come colpi per ${fmtM2(passoM)} m` });
                }
                if (astaSbagliata.length) {
                    avvisi.push({ tipo: 'asta', intervalli: astaSbagliata,
                        testo: `Numero d'asta diverso da quello della profondità (aste da ${fmtM2(rod)} m) negli intervalli n. ${elenco(astaSbagliata)}: cambia l'Rpd` });
                }

                // Strumento: campi non validi che il motore sostituisce con i valori standard DPSH.
                if (typeof parametriStrumento === 'function') {
                    const sost = parametriStrumento(inst, stepCm).sostituiti;
                    if (sost.length) avvisi.push({ tipo: 'strumento', testo: `Strumento: ${sost.join(', ')} non ${sost.length === 1 ? 'è un valore valido' : 'sono valori validi'}, il calcolo usa il valore standard DPSH` });
                }
                // Il passo dello strumento (m) contro quello della prova (cm).
                const passoStrumento = parseFloat(inst.passo);
                if (isFinite(passoStrumento) && passoStrumento > 0 && Math.abs(passoStrumento - passoM) > 0.0005) {
                    avvisi.push({ tipo: 'passo-strumento', testo: `Il passo dello strumento (${fmtM2(passoStrumento)} m) non è quello della prova (${fmtM2(passoM)} m): il calcolo usa quello della prova` });
                }
                // βt imposto a mano contro quello dei parametri.
                const forzato = inst.betaTForzato ? parseFloat(inst.betaTForzato) : null;
                if (forzato && isFinite(forzato) && forzato > 0 && typeof betaTCalcolato === 'function') {
                    const calc = betaTCalcolato(inst, stepCm);
                    if (Math.abs(forzato - calc) > TOLLERANZA_BETAT) {
                        avvisi.push({ tipo: 'betat', testo: `βt imposto a mano (${fmtBetaT(forzato)}) diverso da quello dei parametri dello strumento (${fmtBetaT(calc)}): il calcolo usa quello imposto` });
                    }
                }

                // Falda: numeri veri, e «da» non sotto «a».
                const vuoto = (v) => v === null || v === undefined || String(v).trim() === '';
                const da = parseFloat(String(h.faldaDa).replace(',', '.'));
                const a = parseFloat(String(h.faldaA).replace(',', '.'));
                if ((!vuoto(h.faldaDa) && !isFinite(da)) || (!vuoto(h.faldaA) && !isFinite(a))) {
                    avvisi.push({ tipo: 'falda', testo: 'Falda scritta in modo che non è un numero: il calcolo la considera assente' });
                } else if (isFinite(da) && isFinite(a) && da > a + TOLLERANZA_AVVISI_M) {
                    avvisi.push({ tipo: 'falda', testo: `Falda da ${fmtM2(da)} m ad a ${fmtM2(a)} m: l'inizio è sotto la fine` });
                }
                return avvisi;
            }

            /** Gli avvisi di tutte le prove di un progetto: [{ survId, provaNr, avvisi }] solo per
             * quelle che ne hanno. Le interpretazioni alternative si controllano come le altre. */
            function avvisiDatiProgetto(proj) {
                return Object.values((proj && proj.surveys) || {})
                    .map(s => ({ survId: s && s.id, provaNr: (s && s.header && s.header.provaNr) || '?', avvisi: avvisiDatiProva(s) }))
                    .filter(r => r.avvisi.length > 0)
                    .sort((x, y) => (parseInt(x.provaNr) || 0) - (parseInt(y.provaNr) || 0));
            }

            // ---------------------------- RIEPILOGO DELLA GIORNATA ----------------------------

            /** 'AAAA-MM-GG' del giorno LOCALE di una data ISO (o di un Date). Vuoto se non è una data. */
            function giornoLocaleDi(quando) {
                const d = quando instanceof Date ? quando : new Date(quando);
                if (isNaN(d.getTime())) return '';
                const p = (n) => String(n).padStart(2, '0');
                return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
            }
            /** 'GG/MM/AAAA hh:mm' (come i timestamp delle foto) -> 'AAAA-MM-GG'. */
            function giornoDaTimestampFoto(ts) {
                const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})/.exec(String(ts || '').trim());
                return m ? m[3] + '-' + m[2].padStart(2, '0') + '-' + m[1].padStart(2, '0') : '';
            }

            /** Cosa è stato registrato in `giorno` ('AAAA-MM-GG'; senza, oggi), in tutti i progetti.
             * Le interpretazioni alternative non contano (sono copie di una prova).
             * Ritorna { giorno, prove: [...], totali: { prove, intervalli, metri, colpi, foto, avvisi }, giorniConDati }.
             * `giorniConDati`: i giorni (ordinati) in cui c'è qualcosa, per spostarsi da un giorno all'altro. */
            function riepilogoGiornata(stato, giorno) {
                const giornoVoluto = giorno || giornoLocaleDi(new Date());
                const prove = [];
                const giorni = new Set();
                Object.values((stato && stato.projects) || {}).forEach(proj => {
                    if (!proj || typeof proj !== 'object') return;
                    Object.values(proj.surveys || {}).forEach(surv => {
                        if (!surv || !surv.header || surv.header.interpretazioneDi) return;
                        const logs = Array.isArray(surv.logs) ? surv.logs.filter(l => l && typeof l === 'object') : [];
                        const conData = logs.filter(l => l.registratoIl && giornoLocaleDi(l.registratoIl));
                        // Dati vecchi (nessun intervallo con la sua data): vale la data dell'intestazione.
                        const dellaProva = (conData.length === 0 && giornoLocaleDi(surv.header.date) === giornoVoluto) ? logs : [];
                        const interv = conData.length ? conData.filter(l => giornoLocaleDi(l.registratoIl) === giornoVoluto) : dellaProva;
                        conData.forEach(l => giorni.add(giornoLocaleDi(l.registratoIl)));
                        if (conData.length === 0 && giornoLocaleDi(surv.header.date)) giorni.add(giornoLocaleDi(surv.header.date));
                        const foto = (Array.isArray(surv.photos) ? surv.photos : []).filter(p => p && giornoDaTimestampFoto(p.timestamp) === giornoVoluto).length;
                        if (!interv.length && !foto) return;
                        const valide = interv.filter(l => typeof l.start === 'number' && typeof l.end === 'number' && isFinite(l.start) && isFinite(l.end));
                        const ore = interv.map(l => Date.parse(l.registratoIl)).filter(t => isFinite(t));
                        const avvisi = avvisiDatiProva(surv).length;
                        prove.push({
                            projId: proj.id, progetto: proj.name || proj.comune || 'Progetto',
                            survId: surv.id, provaNr: surv.header.provaNr || '?', localita: surv.header.localita || '',
                            intervalli: interv.length,
                            daM: valide.length ? Math.min(...valide.map(l => l.start)) : null,
                            aM: valide.length ? Math.max(...valide.map(l => l.end)) : null,
                            metri: valide.reduce((s, l) => s + Math.max(0, l.end - l.start), 0),
                            colpi: interv.reduce((s, l) => s + (Number.isFinite(l.colpi) ? l.colpi : 0), 0),
                            primo: ore.length ? new Date(Math.min(...ore)).toISOString() : null,
                            ultimo: ore.length ? new Date(Math.max(...ore)).toISOString() : null,
                            foto, avvisi
                        });
                    });
                });
                prove.sort((x, y) => (x.primo || '').localeCompare(y.primo || '') || (parseInt(x.provaNr) || 0) - (parseInt(y.provaNr) || 0));
                return {
                    giorno: giornoVoluto, prove,
                    totali: {
                        prove: prove.length,
                        intervalli: prove.reduce((s, p) => s + p.intervalli, 0),
                        metri: prove.reduce((s, p) => s + p.metri, 0),
                        colpi: prove.reduce((s, p) => s + p.colpi, 0),
                        foto: prove.reduce((s, p) => s + p.foto, 0),
                        avvisi: prove.reduce((s, p) => s + p.avvisi, 0)
                    },
                    giorniConDati: Array.from(giorni).sort()
                };
            }

            /** Il riepilogo come testo (per il dialogo e per l'assistente). */
            function testoRiepilogoGiornata(r) {
                const [aa, mm, gg] = r.giorno.split('-');
                const ora = (iso) => { const d = new Date(iso); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); };
                const t = r.totali;
                if (!r.prove.length) return `Giorno ${gg}/${mm}/${aa}: niente registrato.`;
                const righe = [`Giorno ${gg}/${mm}/${aa}: ${t.prove} ${t.prove === 1 ? 'prova' : 'prove'}, ${t.intervalli} intervalli, ${fmtM2(t.metri)} m, ${t.colpi} colpi${t.foto ? ', ' + t.foto + ' foto' : ''}.`, ''];
                r.prove.forEach(p => {
                    const orario = p.primo ? ` · dalle ${ora(p.primo)} alle ${ora(p.ultimo)}` : '';
                    const prof = p.daM !== null ? `da ${fmtM2(p.daM)} a ${fmtM2(p.aM)} m` : 'nessun intervallo';
                    righe.push(`• Prova N° ${p.provaNr}${p.localita ? ' (' + p.localita + ')' : ''} — ${p.progetto}: ${prof}, ${p.intervalli} intervalli, ${p.colpi} colpi${p.foto ? ', ' + p.foto + ' foto' : ''}${orario}${p.avvisi ? ' · ' + p.avvisi + (p.avvisi === 1 ? ' avviso' : ' avvisi') : ''}`);
                });
                righe.push('');
                righe.push(t.avvisi ? `${t.avvisi} ${t.avvisi === 1 ? 'avviso' : 'avvisi'} sui dati: apri «Avvisi sui dati» nella prova.` : 'Nessun avviso sui dati.');
                return righe.join('\n');
            }

            /** Il dialogo del riepilogo, con «Giorno prima» e «Giorno dopo» fra i giorni che hanno dati. */
            async function apriRiepilogoGiornata(giorno) {
                if (state.uiState && state.uiState.currentView === 'field' && typeof syncStateToProject === 'function') syncStateToProject();
                const oggi = giornoLocaleDi(new Date());
                let g = giorno || oggi;
                for (;;) {
                    const r = riepilogoGiornata(state, g);
                    const prima = r.giorniConDati.filter(x => x < g).pop();
                    const dopo = r.giorniConDati.filter(x => x > g)[0];
                    const esito = await appDialog(testoRiepilogoGiornata(r), { title: g === oggi ? 'Riepilogo di oggi' : 'Riepilogo della giornata', okLabel: 'Chiudi', extraLabel: prima ? 'Giorno prima' : null, extra2Label: dopo ? 'Giorno dopo' : null, icona: 'clipboard' });
                    if (esito === 'extra' && prima) g = prima;
                    else if (esito === 'extra2' && dopo) g = dopo;
                    else return r;
                }
            }

            /** Gli avvisi della prova aperta (o di una data) in un dialogo. */
            function apriAvvisiDati(survId) {
                const surv = (survId && ((state.projects || {})[state.currentProjectId] || {}).surveys || {})[survId] || (function () {
                    if (state.uiState && state.uiState.currentView === 'field' && typeof syncStateToProject === 'function') syncStateToProject();
                    return ((state.projects || {})[state.currentProjectId] || { surveys: {} }).surveys[state.currentSurveyId];
                })();
                const av = avvisiDatiProva(surv);
                const testo = av.length ? av.map(a => '• ' + a.testo).join('\n') + '\n\nÈ solo una segnalazione: non ho cambiato niente.' : 'Nessun avviso: i dati della prova tornano con il foglio e col calcolo.';
                return appDialog(testo, { title: 'Avvisi sui dati', icona: av.length ? 'alert' : 'check', coloreIcona: av.length ? 'var(--warning)' : 'var(--success)' });
            }

            const btnRiepilogoGiornata = document.getElementById('btnRiepilogoGiornata');
            if (btnRiepilogoGiornata) btnRiepilogoGiornata.addEventListener('click', () => apriRiepilogoGiornata());
