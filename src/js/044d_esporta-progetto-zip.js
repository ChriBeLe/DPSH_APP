            // ===================== ESPORTA CANTIERE: TUTTO IL PROGETTO IN UNO ZIP =====================
            // Un tocco, un file da consegnare. Dentro:
            //   <progetto>_Report.pdf          il report in PDF/A-2b (071i1, 071i2)
            //   <progetto>_Report.docx         lo stesso report in Word (071i)
            //   <progetto>_Registro.xlsx       l'Excel del progetto (046)
            //   <progetto>_Mappa.kmz           il KMZ per Google Earth (071t)
            //   Foto/Prova_<n>/<nome>          le foto, con il nome che avevano, una cartella per prova
            //   progetto.json, librerie.json   i dati: lo ZIP si può rimettere nell'app com'è (044)
            //   LEGGIMI.txt                    cosa c'è e, se qualcosa non è entrato, perché
            // Usa lo ZIP nativo di 043 (senza compressione: le foto sono già JPEG). Mentre lavora una
            // finestra con la barra e «Annulla». Se una parte non riesce (niente GPS per il KMZ, una
            // mappa che non scarica) le altre restano: il motivo va nel LEGGIMI e nell'avviso finale.
            // Annullare ferma tutto e non produce nessun file.

            // Quanto pesa ogni fase sulla barra (somma 100): le foto e i due report sono il lavoro lungo.
            const PACCHETTO_PESI = { report: 6, pdfa: 28, word: 20, excel: 4, kmz: 3, foto: 33, dati: 6 };

            const pacchettoErroreAnnullato = () => { const e = new Error('Operazione annullata'); e.name = 'AbortError'; return e; };
            const pacchettoEAnnullato = (e) => !!e && (e.name === 'AbortError' || /annullat/i.test(String(e.message || '')));

            /** Chi produce ciascuna parte. È un oggetto per poterlo sostituire: le prove sul pacchetto
             * (test/pacchetto_cantiere.js) non hanno un browser vero che impagini, e mettono qui dei finti. */
            const generatoriPacchetto = {
                /** Il report come HTML di stampa (lo stesso del PDF e del Word) per le prove scelte. */
                async documentoReport(projId, soloProve, segnale, onAvanzamento) {
                    sincronizzaTemplateEditorConStatoSalvato();
                    const proj = state.projects[projId];
                    const prove = proveInOrdine(proj).filter(s => !soloProve || soloProve.has(s.id));
                    if (!prove.length) return null;
                    const imp = impostazioniEsportazionePdf;
                    const risultato = await buildCompleteReportHtml(projId, {
                        survIds: prove.map(s => s.id),
                        includiIndice: imp.includiIndice,
                        numeraPagine: imp.numeraPagine,
                        includiIntroduzione: !!(proj.introduzione && proj.introduzione.attiva),
                        includiTavole: !!(proj.tavole3d && proj.tavole3d.nelReport && datiTavoleReport(proj)),
                        onAvanzamento
                    });
                    if (!risultato) return null;
                    if (segnale && segnale.aborted) throw pacchettoErroreAnnullato();
                    const titolo = `Report Completo ${proj.name || proj.comune} (${prove.length} Prove)`;
                    return { html: htmlDocumentoStampa(titolo, risultato.pagesHtml, null, true), titolo };
                },
                /** PDF/A e Word dallo stesso documento, misurato una volta sola. quali: { pdfa, word }. */
                async pdfaEWord(documento, quali, segnale, avanza) {
                    const esiti = {};
                    await conDocumentoStampaMisurato(documento.html, { titolo: documento.titolo }, async (m) => {
                        if (quali.pdfa) {
                            try {
                                const r = await pdfaDaDocumentoMisurato(m, { titolo: documento.titolo, segnale, onAvanzamento: (t, q) => avanza('pdfa', t, q) });
                                esiti.pdfa = { bytes: r.bytes, pagine: r.pagine, mancanti: r.mancanti };
                            } catch (e) { if (pacchettoEAnnullato(e)) throw e; esiti.pdfaErrore = e; }
                        }
                        if (quali.word) {
                            try {
                                const r = await docxDaDocumentoMisurato(m, { titolo: documento.titolo, segnale, qualitaJpeg: impostazioniEsportazionePdf.qualitaJpeg, onAvanzamento: (t, q) => avanza('word', t, q) });
                                esiti.word = { bytes: new Uint8Array(await r.blob.arrayBuffer()), pagine: r.pagine };
                            } catch (e) { if (pacchettoEAnnullato(e)) throw e; esiti.wordErrore = e; }
                        }
                    });
                    return esiti;
                },
                async excel(projId, soloProve) {
                    let fatto = null;
                    await exportProjectExcel(projId, soloProve, { perPacchetto: (nome, bytes) => { fatto = { nome, bytes }; } });
                    return fatto;
                },
                /** Il KMZ di Google Earth dai livelli del progetto; null se non c'è niente da mostrare. */
                async kmz(projId) {
                    const proj = state.projects[projId];
                    const scelti = { prove: true, sezioni: true, punti: true, poligoni: true, modello3d: true, colonne3d: true };
                    const { testo, icone } = documentoKmlGis(proj, scelti, true);
                    if (!/<Placemark[\s>]/.test(testo)) return null;
                    const blob = buildZipBlob([{ name: 'doc.kml', bytes: new TextEncoder().encode(testo) }, ...icone]);
                    return { bytes: new Uint8Array(await blob.arrayBuffer()) };
                }
            };

            /** Il nome di un file senza ciò che i file system non accettano. */
            function nomeFilePacchetto(nome, ripiego) {
                const pulito = String(nome || '').replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '_').replace(/^\.+/, '').trim().slice(0, 100);
                return pulito || ripiego;
            }

            /** I testi che finiscono nel LEGGIMI. */
            function leggimiPacchetto(proj, voci, note) {
                const righe = [
                    `Progetto: ${proj.name || proj.comune || 'Progetto'}`,
                    `Esportato il ${new Date().toLocaleString('it-IT')} con DPSH ${APP_VERSIONE}`,
                    '',
                    'Contenuto di questo ZIP:'
                ];
                const descrizioni = [
                    [/_Report\.pdf$/, 'il report in PDF/A-2b (per l\'archiviazione)'],
                    [/_Report\.docx$/, 'lo stesso report in Word'],
                    [/_Registro\.xlsx$/, 'i dati delle prove in Excel'],
                    [/_Mappa\.kmz$/, 'le prove sulla mappa (Google Earth)'],
                    [/^Foto\//, null],
                    [/^progetto\.json$/, 'i dati del progetto: si possono rimettere nell\'app con «Importa»'],
                    [/^librerie\.json$/, 'template e archivio litologico usati dal progetto'],
                    [/^note_immagini\//, 'immagine delle note del progetto']
                ];
                let foto = 0;
                voci.forEach(v => {
                    if (v.name === 'LEGGIMI.txt') return;
                    const d = descrizioni.find(x => x[0].test(v.name));
                    if (d && d[1] === null) { foto++; return; }
                    righe.push(`  ${v.name}${d ? ' - ' + d[1] : ''}`);
                });
                if (foto) righe.push(`  Foto/ - ${foto} foto, una cartella per prova, con il nome che avevano`);
                if (note.length) {
                    righe.push('', 'Non è entrato:');
                    note.forEach(n => righe.push('  ' + n));
                }
                return righe.join('\r\n') + '\r\n';
            }

            /** Costruisce il pacchetto e ne ritorna le voci (nome + byte). Non scarica niente.
             * opz: soloProve (Set di id, null = tutte), segnale (AbortSignal), onAvanzamento(testo, quota 0-1),
             * salta ({ report, excel, kmz, foto }: true per non produrre quella parte). */
            async function costruisciPacchettoProgetto(projId, opz) {
                const o = opz || {};
                const proj = state.projects[projId];
                if (!proj) throw new Error('Progetto non trovato.');
                const base = nomeFileProgetto(proj);
                const voci = [], note = [];
                const salta = o.salta || {};
                const controlla = () => { if (o.segnale && o.segnale.aborted) throw pacchettoErroreAnnullato(); };
                let fatto = 0;
                const ordine = ['report', 'pdfa', 'word', 'excel', 'kmz', 'foto', 'dati'];
                const avanza = (fase, testo, quota) => {
                    const prima = ordine.slice(0, ordine.indexOf(fase)).reduce((s, f) => s + PACCHETTO_PESI[f], 0);
                    fatto = prima + PACCHETTO_PESI[fase] * Math.max(0, Math.min(1, quota || 0));
                    if (o.onAvanzamento) o.onAvanzamento(testo, fatto / 100);
                };
                const aggiungi = (nome, bytes) => voci.push({ name: nome, bytes: bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes) });
                const prove = proveInOrdine(proj).filter(s => !o.soloProve || o.soloProve.has(s.id));
                if (!prove.length) throw new Error('Nessuna prova da esportare.');

                // 1. Il report: PDF/A e Word
                if (!salta.report) {
                    controlla();
                    avanza('report', 'Preparo il report…', 0);
                    try {
                        const documento = await generatoriPacchetto.documentoReport(projId, o.soloProve, o.segnale, (testo) => avanza('report', testo || 'Preparo il report…', 0.5));
                        controlla();
                        if (!documento) note.push('Report PDF/A e Word: nessuna prova da mettere nel report.');
                        else {
                            avanza('pdfa', 'Scrivo il PDF/A…', 0);
                            const esiti = await generatoriPacchetto.pdfaEWord(documento, { pdfa: true, word: true }, o.segnale, avanza);
                            if (esiti.pdfa) aggiungi(`${base}_Report.pdf`, esiti.pdfa.bytes);
                            else note.push('Report PDF/A: ' + ((esiti.pdfaErrore && esiti.pdfaErrore.message) || 'non riuscito') + '.');
                            if (esiti.word) aggiungi(`${base}_Report.docx`, esiti.word.bytes);
                            else note.push('Report Word: ' + ((esiti.wordErrore && esiti.wordErrore.message) || 'non riuscito') + '.');
                            const mancanti = (esiti.pdfa && esiti.pdfa.mancanti) || 0;
                            if (mancanti > 0) note.push(`Report: ${mancanti} riquadr${mancanti === 1 ? 'o' : 'i'} di mappa non si sono scaricati (senza rete restano vuoti).`);
                        }
                    } catch (e) {
                        if (pacchettoEAnnullato(e)) throw e;
                        ignoraErrore('costruisciPacchettoProgetto/report', e);
                        note.push('Report PDF/A e Word: ' + (e.message || 'non riusciti') + '.');
                    }
                }

                // 2. Excel
                if (!salta.excel) {
                    controlla();
                    avanza('excel', 'Preparo l\'Excel…', 0);
                    try {
                        const x = await generatoriPacchetto.excel(projId, o.soloProve);
                        if (x) aggiungi(`${base}_Registro.xlsx`, x.bytes); else note.push('Excel: non è stato prodotto.');
                    } catch (e) { if (pacchettoEAnnullato(e)) throw e; ignoraErrore('costruisciPacchettoProgetto/excel', e); note.push('Excel: ' + (e.message || 'non riuscito') + '.'); }
                }

                // 3. KMZ
                if (!salta.kmz) {
                    controlla();
                    avanza('kmz', 'Preparo il KMZ…', 0);
                    try {
                        const k = await generatoriPacchetto.kmz(projId);
                        if (k) aggiungi(`${base}_Mappa.kmz`, k.bytes); else note.push('KMZ: nessuna prova ha le coordinate GPS.');
                    } catch (e) { if (pacchettoEAnnullato(e)) throw e; ignoraErrore('costruisciPacchettoProgetto/kmz', e); note.push('KMZ: ' + (e.message || 'non riuscito') + '.'); }
                }

                // 4. Foto e dati del progetto
                controlla();
                const meta = cloneProjectMetaSenzaFoto(proj);
                meta.versioneSchema = VERSIONE_SCHEMA_DATI;
                if (o.soloProve) meta.surveys = Object.fromEntries(Object.entries(meta.surveys || {}).filter(([id]) => o.soloProve.has(id)));
                const totaleFoto = Object.values(meta.surveys || {}).reduce((n, s) => n + ((s.photos || []).length), 0);
                let passate = 0, mancantiFoto = 0;
                const fotoVoci = [];
                if (!salta.foto) {
                    avanza('foto', totaleFoto ? `Foto 0 di ${totaleFoto}…` : 'Nessuna foto', 0);
                    const cartellaDi = new Map(), cartelleUsate = new Set(), nomiUsati = new Set();
                    mancantiFoto = await estraiFotoProgettoPerZip(meta, fotoVoci, '', null, {
                        segnale: o.segnale,
                        dopoFoto: () => { passate++; avanza('foto', `Foto ${passate} di ${totaleFoto}…`, totaleFoto ? passate / totaleFoto : 1); },
                        percorso: (sid, surv, p, indice, ext) => {
                            // Una cartella per prova (due prove con lo stesso numero non si mescolano).
                            if (!cartellaDi.has(sid)) {
                                let c = 'Prova_' + nomeFilePacchetto((surv.header && surv.header.provaNr) || String(cartellaDi.size + 1), String(cartellaDi.size + 1)), n = 2;
                                const c0 = c;
                                while (cartelleUsate.has(c)) c = `${c0}_${n++}`;
                                cartelleUsate.add(c); cartellaDi.set(sid, c);
                            }
                            const cartella = cartellaDi.get(sid);
                            // Il nome com'era; se manca (foto scattate prima di questa versione) DPSH_<prova>-<n>.
                            let nome = nomeFilePacchetto(p.nomeFile, '');
                            nome = nome.replace(/\.[A-Za-z0-9]{1,5}$/, '');
                            if (!nome) nome = `DPSH_${nomeFilePacchetto((surv.header && surv.header.provaNr) || '1', '1')}-${indice}`;
                            let candidato = `Foto/${cartella}/${nome}.${ext}`, n = 2;
                            while (nomiUsati.has(candidato.toLowerCase())) candidato = `Foto/${cartella}/${nome}_${n++}.${ext}`;
                            nomiUsati.add(candidato.toLowerCase());
                            return candidato;
                        }
                    });
                    if (mancantiFoto > 0) note.push(`Foto: ${mancantiFoto} non si trovano su questo dispositivo.`);
                }
                controlla();
                avanza('dati', 'Metto insieme i dati…', 0);
                fotoVoci.forEach(v => voci.push(v));
                aggiungi('progetto.json', new TextEncoder().encode(JSON.stringify(meta, null, 2)));
                aggiungi('librerie.json', new TextEncoder().encode(JSON.stringify(librerieUsateDa({ [projId]: proj }, state), null, 2)));
                aggiungi('LEGGIMI.txt', new TextEncoder().encode(leggimiPacchetto(proj, voci, note)));
                avanza('dati', 'Pronto', 1);
                return { voci, note, nome: `${base}_Consegna.zip`, foto: passate - mancantiFoto };
            }

            // ---------- La finestra con la barra ----------

            let pacchettoInCorso = null;   // { controller, fine } mentre si lavora

            function pacchettoMostra(testo, quota, dettaglio) {
                const stato = document.getElementById('lblPacchettoStato'), barra = document.getElementById('barraPacchetto');
                if (stato) stato.textContent = testo;
                if (barra) {
                    const pct = Math.round(Math.max(0, Math.min(1, quota || 0)) * 100);
                    barra.style.width = pct + '%';
                    const box = document.getElementById('barraPacchettoBox');
                    if (box) box.setAttribute('aria-valuenow', String(pct));
                }
                const d = document.getElementById('lblPacchettoDettaglio');
                if (d && dettaglio !== undefined) d.textContent = dettaglio;
            }
            function pacchettoApriFinestra(nomeProgetto) {
                document.getElementById('lblPacchettoProgetto').textContent = nomeProgetto;
                document.getElementById('btnPacchettoSalva').style.display = 'none';
                const annulla = document.getElementById('btnPacchettoAnnulla');
                annulla.textContent = 'Annulla'; annulla.style.display = '';
                pacchettoMostra('Preparazione…', 0, '');
                document.getElementById('modalPacchettoOverlay').classList.add('open');
                document.getElementById('modalPacchettoZip').classList.add('open');
            }
            function pacchettoChiudiFinestra() {
                document.getElementById('modalPacchettoOverlay').classList.remove('open');
                document.getElementById('modalPacchettoZip').classList.remove('open');
            }
            /** Annulla (✕, Esc, «Annulla»): se sta lavorando lo ferma; se ha finito chiude e basta. */
            function pacchettoAnnulla() {
                if (pacchettoInCorso) { pacchettoInCorso.controller.abort(); pacchettoMostra('Annullo…', 0, ''); }
                else pacchettoChiudiFinestra();
            }

            /** Consegna il file: sul PC si scarica, sul telefono si apre il pannello «Condividi» (o, dove
             * non c'è, si scarica). Il pannello vuole un tocco fresco: lo dà il tasto «Salva o condividi». */
            function pacchettoPuoCondividere(file) {
                try {
                    const telefono = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
                    return telefono && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] });
                } catch (e) { return false; }
            }

            async function esportaCantiereZip(projId, soloProve) {
                if (pacchettoInCorso) return;
                const proj = state.projects[projId];
                if (!proj) return;
                const controller = new AbortController();
                const lavoro = { controller };
                pacchettoInCorso = lavoro;
                pacchettoApriFinestra(proj.name || proj.comune || 'Progetto');
                try {
                    const risultato = await costruisciPacchettoProgetto(projId, {
                        soloProve, segnale: controller.signal,
                        onAvanzamento: (testo, quota) => pacchettoMostra(testo, quota)
                    });
                    if (controller.signal.aborted) throw pacchettoErroreAnnullato();
                    pacchettoMostra('Creo lo ZIP…', 0.99);
                    await new Promise(r => setTimeout(r, 0));
                    const blob = buildZipBlob(risultato.voci);
                    pacchettoInCorso = null;
                    // Cosa non è entrato si legge nella finestra stessa (e nel LEGGIMI.txt): un dialogo in più
                    // sul telefono si metterebbe fra l'utente e il tasto «Salva o condividi».
                    const avviso = risultato.note.length ? 'Non è entrato:\n' + risultato.note.join('\n') : `${risultato.voci.length - 1} file nello ZIP.`;
                    const file = typeof File === 'function' ? new File([blob], risultato.nome, { type: 'application/zip' }) : null;
                    if (file && pacchettoPuoCondividere(file)) {
                        pacchettoMostra('Pronto', 1, avviso);
                        const salva = document.getElementById('btnPacchettoSalva'), chiudi = document.getElementById('btnPacchettoAnnulla');
                        salva.style.display = ''; chiudi.textContent = 'Chiudi';
                        salva.onclick = async () => {
                            try { await navigator.share({ files: [file], title: risultato.nome }); pacchettoChiudiFinestra(); }
                            catch (e) { if (e && e.name !== 'AbortError') { scaricaBlobFile(blob, risultato.nome); pacchettoChiudiFinestra(); } }
                        };
                    } else {
                        scaricaBlobFile(blob, risultato.nome);
                        pacchettoMostra('Fatto', 1, avviso);
                        document.getElementById('btnPacchettoAnnulla').textContent = 'Chiudi';
                        if (!risultato.note.length) setTimeout(pacchettoChiudiFinestra, 1200);
                    }
                } catch (e) {
                    pacchettoInCorso = null;
                    if (pacchettoEAnnullato(e)) { pacchettoChiudiFinestra(); mostraToast('Esportazione annullata'); }
                    else {
                        ignoraErrore('esportaCantiereZip', e);
                        pacchettoChiudiFinestra();
                        await appDialog('Il pacchetto non si è potuto creare: ' + (e && e.message ? e.message : e), { title: 'Esporta progetto' });
                    }
                } finally {
                    pacchettoInCorso = null;
                }
            }

            const btnOptEsportaCantiere = document.getElementById('btnOptEsportaCantiere');
            if (btnOptEsportaCantiere) {
                btnOptEsportaCantiere.addEventListener('click', () => {
                    if (exportModalContext.soloProve && !exportModalContext.soloProve.size) return;
                    const projId = exportModalContext.type === 'project' ? exportModalContext.id : state.currentProjectId;
                    const soloProve = exportModalContext.type === 'project' ? (exportModalContext.soloProve || null) : null;
                    closeExportModal();
                    if (projId) esportaCantiereZip(projId, soloProve);
                });
            }
            ['btnClosePacchettoX', 'btnPacchettoAnnulla'].forEach(id => { const b = document.getElementById(id); if (b) b.addEventListener('click', pacchettoAnnulla); });
