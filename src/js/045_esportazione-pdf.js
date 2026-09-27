            // ===================== ESPORTAZIONE PDF (schermata con opzioni) =====================
            // Sostituisce le vecchie generatePrintableReport()/exportProjectPDF()/
            // exportProjectCompleteReportPDF() dirette (nessuna opzione, aprivano subito la finestra
            // di stampa) con una schermata dove si sceglie quali prove includere (solo quando ha
            // senso: progetto con più di una prova), se aggiungere l'indice cliccabile, la qualità
            // JPEG delle foto, e si vede una stima di pagine/peso PRIMA di generare davvero — tutto
            // richiesto esplicitamente. La generazione vera e propria riusa buildSelezioneReportHtml
            // (prove "standard") o buildCompleteReportHtml (Report Completo con Parametri Avanzati).
            const modalEsportaPdfOverlay = document.getElementById('modalEsportaPdfOverlay');
            const modalEsportaPdf = document.getElementById('modalEsportaPdf');
            const btnCloseEsportaPdfModal = document.getElementById('btnCloseEsportaPdfModal');
            const esportaPdfBodyOpzioni = document.getElementById('esportaPdfBodyOpzioni');
            const esportaPdfBodyProgresso = document.getElementById('esportaPdfBodyProgresso');
            const esportaPdfListaProveWrap = document.getElementById('esportaPdfListaProveWrap');
            const esportaPdfListaProve = document.getElementById('esportaPdfListaProve');
            const btnEsportaPdfSelezionaTutte = document.getElementById('btnEsportaPdfSelezionaTutte');
            const btnEsportaPdfDeselezionaTutte = document.getElementById('btnEsportaPdfDeselezionaTutte');
            const selEsportaPdfTemplateBulk = document.getElementById('selEsportaPdfTemplateBulk');
            const btnEsportaPdfApplicaTemplateTutte = document.getElementById('btnEsportaPdfApplicaTemplateTutte');
            const btnEsportaPdfGestisciTemplate = document.getElementById('btnEsportaPdfGestisciTemplate');
            const esportaPdfIndiceRow = document.getElementById('esportaPdfIndiceRow');
            const chkEsportaPdfIndice = document.getElementById('chkEsportaPdfIndice');
            const esportaPdfIndiceStileRow = document.getElementById('esportaPdfIndiceStileRow');
            const selEsportaPdfIndiceStile = document.getElementById('selEsportaPdfIndiceStile');
            const btnEsportaPdfIndicePersonalizza = document.getElementById('btnEsportaPdfIndicePersonalizza');
            const chkEsportaPdfNumeriPagina = document.getElementById('chkEsportaPdfNumeriPagina');
            const rangeEsportaPdfQualita = document.getElementById('rangeEsportaPdfQualita');
            const lblEsportaPdfQualitaValore = document.getElementById('lblEsportaPdfQualitaValore');
            const lblEsportaPdfPagineStima = document.getElementById('lblEsportaPdfPagineStima');
            const lblEsportaPdfPesoStima = document.getElementById('lblEsportaPdfPesoStima');
            const btnEsportaPdfGenera = document.getElementById('btnEsportaPdfGenera');
            const lblEsportaPdfProgressoStato = document.getElementById('lblEsportaPdfProgressoStato');
            const barraEsportaPdfProgresso = document.getElementById('barraEsportaPdfProgresso');
            const lblEsportaPdfProgressoDettaglio = document.getElementById('lblEsportaPdfProgressoDettaglio');

            // context: { type: 'survey'|'project', id: string|null }
            // 'survey' = la prova aperta al momento (state); id resta null, non serve. 'project' è
            // sempre il Report Completo (con tabelle Parametri Avanzati) — la spunta per escluderle
            // è stata rimossa (richiesto esplicitamente), quindi non esiste più la vecchia
            // distinzione "Report PDF" leggero vs "Report Completo".
            let esportaPdfContext = null;
            let esportaPdfSelectedIds = new Set();

            /** Riempie il checklist prove (solo per progetto/Report Completo con più di una prova):
             * di default tutte selezionate — l'utente toglie quelle che non vuole, non il contrario,
             * dato che nella stragrande maggioranza dei casi si vuole tutto il progetto. Ogni riga
             * porta anche il proprio selettore di template (fuso qui dentro dalla vecchia schermata
             * separata "TEMPLATE REPORT PDF (PER PROVA)", richiesto esplicitamente): scrive
             * direttamente su proj.surveys[s.id].reportTemplateId, la stessa proprietà già letta da
             * getReportTemplateIdPerProva/buildSurveyReportHtml in esportazione, quindi non serve
             * toccare nessuna logica di rendering. Il select NON è dentro il <label> della checkbox
             * per evitare che un click sul menu a tendina attivi/disattivi anche la spunta. */
            function popolaListaProveEsportazionePdf(proj) {
                if (!esportaPdfListaProve) return;
                const tutte = Object.values(proj.surveys || {})
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0));
                // Le interpretazioni alternative partono spente, altrimenti la stessa verticale uscirebbe
                // due volte nel documento: si accende la versione che si vuole consegnare.
                esportaPdfSelectedIds = new Set(tutte.filter(s => !(s.header && s.header.interpretazioneDi)).map(s => s.id));
                const opzioniTemplate = elencoTemplateReportOrdinato();
                // IL CAPITOLO INTRODUTTIVO, prima riga dell'elenco. Ha la stessa forma delle
                // prove — spunta a sinistra, template a destra — perche' e' esattamente quello
                // che e': una sezione del documento con un suo template. Nasce spento: un
                // capitolo introduttivo che compare senza che nessuno lo abbia chiesto sarebbe
                // una sorpresa in un documento firmato.
                const intro = proj.introduzione || (proj.introduzione = { attiva: false, templateId: 'classico' });
                const rigaIntroduzione = `
                    <div style="display:flex; align-items:center; gap:6px; padding:4px 0 7px; margin-bottom:4px; border-bottom:1px dashed var(--border);">
                        <label style="display:flex; align-items:center; gap:8px; font-size:12px; padding:3px 4px; cursor:pointer; flex:1; min-width:0;">
                            <input type="checkbox" id="chkEsportaPdfIntroduzione" ${intro.attiva ? 'checked' : ''} style="margin:0; flex-shrink:0;">
                            <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                <span style="font-weight:700; color:var(--accent-ink);">Capitolo introduttivo</span>
                                <span style="color:var(--text-muted);"> · in testa al documento</span>
                            </span>
                        </label>
                        <select id="selEsportaPdfTemplateIntroduzione" title="Template del capitolo introduttivo" style="width:108px; flex-shrink:0; padding:3px 4px; font-size:10.5px; border-radius:6px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-main);">
                            ${opzioniTemplate.map(t => `<option value="${t.id}" ${t.id === (intro.templateId || 'classico') ? 'selected' : ''}>${t.name}</option>`).join('')}
                        </select>
                    </div>`;
                esportaPdfListaProve.innerHTML = rigaIntroduzione + tutte.map(s => {
                    const nome = `Prova N° ${(s.header && s.header.provaNr) || '?'}`;
                    const sotto = (s.header && s.header.interpretazioneDi) ? 'interpretazione alternativa' : ((s.header && s.header.localita) || '');
                    const attuale = s.reportTemplateId || 'classico';
                    return `
                        <div style="display:flex; align-items:center; gap:6px; padding:2px 0;">
                            <label style="display:flex; align-items:center; gap:8px; font-size:12px; padding:3px 4px; cursor:pointer; flex:1; min-width:0;">
                                <input type="checkbox" class="chk-esporta-pdf-prova" data-id="${s.id}" ${esportaPdfSelectedIds.has(s.id) ? 'checked' : ''} style="margin:0; flex-shrink:0;">
                                <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                    <span style="font-weight:700; color:var(--text-main);">${nome}</span>${sotto ? ` <span style="color:var(--text-muted);">· ${sotto}</span>` : ''}
                                </span>
                            </label>
                            <select data-survey-id="${s.id}" class="sel-esporta-pdf-template-riga" title="Template report per questa prova" style="width:108px; flex-shrink:0; padding:3px 4px; font-size:10.5px; border-radius:6px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-main);">
                                ${opzioniTemplate.map(t => `<option value="${t.id}" ${t.id === attuale ? 'selected' : ''}>${t.name}</option>`).join('')}
                            </select>
                        </div>`;
                }).join('');
                esportaPdfListaProve.querySelectorAll('.chk-esporta-pdf-prova').forEach(chk => {
                    chk.addEventListener('change', () => {
                        const id = chk.getAttribute('data-id');
                        if (chk.checked) esportaPdfSelectedIds.add(id); else esportaPdfSelectedIds.delete(id);
                        aggiornaStimaEsportazionePdf();
                    });
                });
                esportaPdfListaProve.querySelectorAll('.sel-esporta-pdf-template-riga').forEach(sel => {
                    sel.addEventListener('change', () => {
                        impostaTemplateReportProva(proj, sel.dataset.surveyId, sel.value);
                    });
                });
                const chkIntro = document.getElementById('chkEsportaPdfIntroduzione');
                if (chkIntro) {
                    chkIntro.addEventListener('change', () => {
                        intro.attiva = chkIntro.checked;
                        proj.updatedAt = Date.now();
                        saveState();
                        aggiornaStimaEsportazionePdf();
                    });
                }
                const selIntro = document.getElementById('selEsportaPdfTemplateIntroduzione');
                if (selIntro) {
                    selIntro.addEventListener('change', () => {
                        intro.templateId = selIntro.value;
                        proj.updatedAt = Date.now();
                        saveState();
                    });
                }
                popolaSelettoreTemplateBulkEsportazionePdf();
            }

            /** Scrive il template scelto su una singola prova del progetto (usata sia dal select per
             * riga sia dall'applicazione massiva "Applica a tutte"), sincronizzando anche
             * state.reportTemplateId/il selettore in editor se la prova modificata è quella
             * correntemente attiva — altrimenti i due resterebbero disallineati fino al prossimo
             * cambio prova. */
            function impostaTemplateReportProva(proj, survId, templateId) {
                const surv = proj && proj.surveys && proj.surveys[survId];
                if (!surv) return;
                surv.reportTemplateId = templateId;
                proj.updatedAt = Date.now();
                if (state.currentProjectId === proj.id && state.currentSurveyId === survId) {
                    state.reportTemplateId = templateId;
                }
                saveState();
            }

            /** Popola il select "applica a tutte" con la stessa lista di template disponibili. */
            function popolaSelettoreTemplateBulkEsportazionePdf() {
                if (!selEsportaPdfTemplateBulk) return;
                selEsportaPdfTemplateBulk.innerHTML = elencoTemplateReportOrdinato()
                    .map(t => `<option value="${t.id}">${t.name}</option>`).join('');
            }

            if (btnEsportaPdfApplicaTemplateTutte) {
                btnEsportaPdfApplicaTemplateTutte.addEventListener('click', () => {
                    if (!esportaPdfContext || esportaPdfContext.type !== 'project' || !selEsportaPdfTemplateBulk) return;
                    const proj = state.projects[esportaPdfContext.id];
                    if (!proj) return;
                    const templateId = selEsportaPdfTemplateBulk.value;
                    Object.keys(proj.surveys || {}).forEach(survId => impostaTemplateReportProva(proj, survId, templateId));
                    // Riflette subito il cambio su tutti i select per riga già disegnati, senza
                    // dover ricostruire l'intero checklist (perderebbe lo stato delle spunte).
                    esportaPdfListaProve.querySelectorAll('.sel-esporta-pdf-template-riga').forEach(sel => { sel.value = templateId; });
                });
            }

            if (btnEsportaPdfGestisciTemplate) {
                btnEsportaPdfGestisciTemplate.addEventListener('click', () => {
                    if (typeof openReportTemplatesModal === 'function') openReportTemplatesModal();
                });
            }

            /** Le prove effettivamente da esportare secondo il contesto e, se applicabile, la
             * selezione dell'utente nel checklist. Per 'survey' è sempre e solo la prova aperta. */
            function elencoProveSelezionateEsportazionePdf() {
                if (!esportaPdfContext) return [];
                if (esportaPdfContext.type === 'survey') return [state];
                const proj = state.projects[esportaPdfContext.id];
                if (!proj) return [];
                const tutte = Object.values(proj.surveys || {});
                return tutte.filter(s => esportaPdfSelectedIds.has(s.id));
            }

            /** Stima (non conteggio esatto: niente costruzione HTML reale, sarebbe troppo lento per
             * un valore live aggiornato ad ogni click) delle pagine di UNA prova, riusando la stessa
             * logica "foto già piazzate dal template non contano due volte" di buildSurveyReportHtml
             * — nessuna nuova assunzione, stessa fonte di verità. +2 pagine se il Report Completo
             * include anche le tabelle Parametri Avanzati per quella prova. */
            function stimaPagineProva(surv, proj, completo) {
                const templateId = getReportTemplateIdPerProva(surv);
                const template = state.reportTemplates[templateId];
                const usaTemplatePersonalizzato = template && Array.isArray(template.pages) && template.pages.length > 0;
                const paginaDatiCount = usaTemplatePersonalizzato ? template.pages.length : 1;
                const numeroFotoGiaPiazzate = usaTemplatePersonalizzato ? Object.keys(calcolaIndiciImmaginePerBlocco(template.pages)).length : 0;
                const numFoto = (surv.photos || []).length;
                const fotoRestanti = Math.max(0, numFoto - numeroFotoGiaPiazzate);
                let totale = paginaDatiCount + fotoRestanti;
                if (completo) {
                    const strati = (proj && proj.strati) || state.strati || [];
                    const dati = datiCalcolatiProva(surv, strati);
                    if (dati.length > 0) totale += 2;
                }
                return totale;
            }

            /** Stima grezza del peso di UNA foto originale, in byte: dalla dataURL già in memoria se
             * disponibile (base64 → byte reali, non lunghezza stringa), altrimenti una cifra media
             * plausibile (foto non ancora caricata dalla cache/IndexedDB al momento della stima —
             * capita, è solo una stima, non blocchiamo l'utente per leggerla dal disco qui). */
            function stimaByteFotoOriginale(photo) {
                if (photo && photo.dataUrl && typeof photo.dataUrl === 'string') {
                    return Math.round(photo.dataUrl.length * 0.75);
                }
                return 1200000;
            }

            /** Fattore moltiplicativo (rispetto all'originale) del peso di una JPEG ricompressa alla
             * qualità indicata (0..1) — curva empirica indicativa, non una formula esatta di libreria
             * JPEG: qualità 100% = file intatto (nessuna ricompressione, vedi comprimiImmagineDataUrl),
             * sotto scende rapidamente perché è proprio l'effetto voluto (contenere i PDF da 300Mb). */
            function fattoreDimensioneJpeg(qualita) {
                if (qualita >= 0.98) return 1;
                const punti = [[0.3, 0.06], [0.4, 0.09], [0.5, 0.13], [0.6, 0.18], [0.7, 0.25], [0.8, 0.35], [0.9, 0.5], [1.0, 1.0]];
                for (let i = 1; i < punti.length; i++) {
                    if (qualita <= punti[i][0]) {
                        const [q0, f0] = punti[i - 1], [q1, f1] = punti[i];
                        const t = q1 === q0 ? 0 : (qualita - q0) / (q1 - q0);
                        return f0 + (f1 - f0) * t;
                    }
                }
                return 1;
            }

            function formattaBytesEsportazione(bytes) {
                if (!bytes || bytes <= 0) return '–';
                if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
                return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
            }

            /** Ricalcola la stima di pagine/peso mostrata nella schermata, letta dal vivo ad ogni
             * cambio di selezione prove / qualità JPEG / indice — richiesto esplicitamente ("sarebbe
             * una buona idea mostrare le pagine totali e soprattutto la dimensione del file"). */
            function aggiornaStimaEsportazionePdf() {
                if (!esportaPdfContext || !lblEsportaPdfPagineStima || !lblEsportaPdfPesoStima) return;
                const selezionate = elencoProveSelezionateEsportazionePdf();
                const proj = esportaPdfContext.type === 'survey' ? null : state.projects[esportaPdfContext.id];
                const completo = esportaPdfContext.type === 'project';
                const includiIndice = !!(chkEsportaPdfIndice && chkEsportaPdfIndice.checked) && selezionate.length > 1;
                const qualita = rangeEsportaPdfQualita ? parseInt(rangeEsportaPdfQualita.value, 10) / 100 : impostazioniEsportazionePdf.qualitaJpeg;
                const fattore = fattoreDimensioneJpeg(qualita);

                let pagineTotali = includiIndice ? 1 : 0;
                let byteTotali = selezionate.length * 60000; // testo/layout per prova, stima grezza
                selezionate.forEach(surv => {
                    pagineTotali += stimaPagineProva(surv, proj, completo);
                    (surv.photos || []).forEach(p => { byteTotali += stimaByteFotoOriginale(p) * fattore; });
                });

                lblEsportaPdfPagineStima.textContent = selezionate.length > 0 ? String(pagineTotali) : '–';
                lblEsportaPdfPesoStima.textContent = selezionate.length > 0 ? formattaBytesEsportazione(byteTotali) : '–';
            }

            /** Apre la schermata di esportazione PDF per uno dei due contesti possibili: la prova
             * singola aperta, oppure un intero progetto — quest'ultimo copre sia il vecchio "Report
             * PDF" sia il vecchio "Report Completo", ora fusi in un solo ingresso (redesign
             * richiesto esplicitamente: le due tile portavano alla stessa schermata) con "Includi
             * tabelle Parametri Avanzati" spostato qui dentro come spunta. Il checklist prove e
             * l'opzione indice compaiono solo quando il progetto ha più di una prova (con una sola
             * non avrebbe senso un indice né scegliere cosa includere); la spunta Parametri
             * Avanzati invece ha senso anche con una sola prova, quindi compare per ogni export in
             * ambito progetto. */
            function apriEsportazionePdfModal(context) {
                esportaPdfContext = context;
                if (esportaPdfBodyOpzioni) esportaPdfBodyOpzioni.style.display = '';
                if (esportaPdfBodyProgresso) esportaPdfBodyProgresso.style.display = 'none';

                const isMultiProva = context.type === 'project';
                const proj = isMultiProva ? state.projects[context.id] : null;
                const numProveProgetto = proj ? Object.keys(proj.surveys || {}).length : 0;
                const mostraSelezione = isMultiProva && numProveProgetto > 1;

                if (esportaPdfListaProveWrap) esportaPdfListaProveWrap.style.display = mostraSelezione ? 'block' : 'none';
                if (isMultiProva && proj) popolaListaProveEsportazionePdf(proj);
                else esportaPdfSelectedIds = new Set();

                if (esportaPdfIndiceRow) esportaPdfIndiceRow.style.display = mostraSelezione ? 'flex' : 'none';
                if (chkEsportaPdfIndice) chkEsportaPdfIndice.checked = impostazioniEsportazionePdf.includiIndice;
                if (chkEsportaPdfNumeriPagina) chkEsportaPdfNumeriPagina.checked = !!impostazioniEsportazionePdf.numeraPagine;
                // Stile indice: riga gemella di esportaPdfIndiceRow, stesso mostra/nascondi — con
                // una prova sola non ha senso scegliere una veste per un indice che non comparirà.
                // Le opzioni sono i template REALI della libreria (state.indiceTemplates), non più
                // 3 preset fissi — ripopolate ogni apertura così un template appena creato/rinominato
                // altrove (nel modale "Template di Report") compare subito.
                if (esportaPdfIndiceStileRow) esportaPdfIndiceStileRow.style.display = mostraSelezione ? 'flex' : 'none';
                if (selEsportaPdfIndiceStile && proj) {
                    // getIndiceTemplateIdPerProgetto PRIMA di costruire le opzioni: può innescare la
                    // migrazione pigra di un vecchio proj.indice in un nuovo template della libreria,
                    // e quella scrive in state.indiceTemplates — l'elenco va letto DOPO, altrimenti
                    // l'opzione appena creata non esiste ancora e .value resta vuoto.
                    const idAttuale = getIndiceTemplateIdPerProgetto(proj);
                    selEsportaPdfIndiceStile.innerHTML = elencoIndiceTemplateOrdinato().map(t => `<option value="${t.id}">${t.name}</option>`).join('');
                    selEsportaPdfIndiceStile.value = idAttuale;
                }

                const qualitaPct = Math.round(impostazioniEsportazionePdf.qualitaJpeg * 100);
                if (rangeEsportaPdfQualita) rangeEsportaPdfQualita.value = String(qualitaPct);
                if (lblEsportaPdfQualitaValore) lblEsportaPdfQualitaValore.textContent = qualitaPct + '%';

                aggiornaStimaEsportazionePdf();

                if (modalEsportaPdfOverlay) modalEsportaPdfOverlay.classList.add('open');
                if (modalEsportaPdf) modalEsportaPdf.classList.add('open');
            }

            function chiudiEsportazionePdfModal() {
                if (modalEsportaPdfOverlay) modalEsportaPdfOverlay.classList.remove('open');
                if (modalEsportaPdf) modalEsportaPdf.classList.remove('open');
            }

            if (btnCloseEsportaPdfModal) btnCloseEsportaPdfModal.addEventListener('click', chiudiEsportazionePdfModal);
            if (modalEsportaPdfOverlay) modalEsportaPdfOverlay.addEventListener('click', chiudiEsportazionePdfModal);

            if (btnEsportaPdfSelezionaTutte) {
                btnEsportaPdfSelezionaTutte.addEventListener('click', () => {
                    if (esportaPdfListaProve) esportaPdfListaProve.querySelectorAll('.chk-esporta-pdf-prova').forEach(chk => {
                        chk.checked = true;
                        esportaPdfSelectedIds.add(chk.getAttribute('data-id'));
                    });
                    aggiornaStimaEsportazionePdf();
                });
            }
            if (btnEsportaPdfDeselezionaTutte) {
                btnEsportaPdfDeselezionaTutte.addEventListener('click', () => {
                    if (esportaPdfListaProve) esportaPdfListaProve.querySelectorAll('.chk-esporta-pdf-prova').forEach(chk => { chk.checked = false; });
                    esportaPdfSelectedIds.clear();
                    aggiornaStimaEsportazionePdf();
                });
            }
            if (chkEsportaPdfIndice) chkEsportaPdfIndice.addEventListener('change', aggiornaStimaEsportazionePdf);
            // Scegliere una veste RISCRIVE i campi del preset sullo stile del progetto — dopodiché
            // resta tutto personalizzabile da "Personalizza…" (vedi apriModalPersonalizzaIndice).
            if (selEsportaPdfIndiceStile) {
                selEsportaPdfIndiceStile.addEventListener('change', () => {
                    const proj = esportaPdfContext && esportaPdfContext.type === 'project' ? state.projects[esportaPdfContext.id] : null;
                    if (!proj) return;
                    // Semplice assegnazione di puntatore, non più una copia di campi: il template
                    // scelto è condiviso (vedi stileIndiceDelProgetto), non va duplicato per progetto.
                    proj.indiceTemplateId = selEsportaPdfIndiceStile.value;
                    proj.updatedAt = Date.now();
                    saveState();
                });
            }
            if (btnEsportaPdfIndicePersonalizza) {
                btnEsportaPdfIndicePersonalizza.addEventListener('click', () => {
                    const proj = esportaPdfContext && esportaPdfContext.type === 'project' ? state.projects[esportaPdfContext.id] : null;
                    if (proj && typeof apriModalPersonalizzaIndice === 'function') apriModalPersonalizzaIndice(getIndiceTemplateIdPerProgetto(proj));
                });
            }
            if (rangeEsportaPdfQualita) {
                rangeEsportaPdfQualita.addEventListener('input', () => {
                    if (lblEsportaPdfQualitaValore) lblEsportaPdfQualitaValore.textContent = rangeEsportaPdfQualita.value + '%';
                    aggiornaStimaEsportazionePdf();
                });
            }

