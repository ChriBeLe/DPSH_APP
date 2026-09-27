            // ===================== IL PANNELLO DELLO STILE DEL TESTO =====================
            // Un posto solo che decide carattere, corpo, interlinea e allineamento di TUTTO il
            // documento. L'anteprima qui dentro non e' un disegnino: usa le stesse variabili CSS
            // che finiscono sul foglio, quindi quello che vedi e' quello che stampi.
            {
                const overlay = document.getElementById('modalStileTestoOverlay');
                const finestra = document.getElementById('modalStileTesto');
                const rif2 = (id) => document.getElementById(id);

                function stileInUso() {
                    if (!templateEditorState.stileTesto) templateEditorState.stileTesto = stileTestoDiDefault();
                    return templateEditorState.stileTesto;
                }
                function riempiTaglie(sel, valori, attuale) {
                    if (!sel) return;
                    sel.innerHTML = valori.map(v => `<option value="${v}">${String(v).replace('.', ',')} pt</option>`).join('');
                    sel.value = String(attuale);
                }
                function aggiornaAnteprimaStile() {
                    const st = stileInUso();
                    const box = rif2('anteprimaStileTesto');
                    if (!box) return;
                    // Le stesse variabili del foglio vero: nessuna riga di stile scritta a parte,
                    // quindi l'anteprima non puo' mentire.
                    box.setAttribute('style', box.getAttribute('style').replace(/--tpl-[^;]+;\s*/g, '')
                        + ' ' + cssVariabiliStileTesto(st));
                    const tit = rif2('anteprimaStileTitolo'), cor = rif2('anteprimaStileCorpo'), frm = rif2('anteprimaStileFormula');
                    if (tit) tit.setAttribute('style', 'font-weight:var(--tpl-peso-titoli, 700); margin-bottom:5px; font-family:var(--tpl-font); font-size:var(--tpl-h1); line-height:1.3;');
                    if (cor) cor.setAttribute('style', 'font-family:var(--tpl-font); font-size:var(--tpl-corpo-pt); line-height:var(--tpl-interlinea); text-align:var(--tpl-allineamento); text-indent:var(--tpl-rientro);');
                    if (frm) frm.setAttribute('style', 'font-family:var(--tpl-font-formule); font-size:var(--tpl-corpo-pt); font-style:italic; margin-top:6px;');
                }
                function sincronizzaPannelloStile() {
                    const st = stileInUso();
                    const selFont = rif2('selStileFont');
                    if (selFont) {
                        selFont.innerHTML = FONT_DOCUMENTO.map(f => `<option value="${f.id}">${f.nome} — ${f.nota}</option>`).join('');
                        selFont.value = st.font;
                    }
                    riempiTaglie(rif2('selStileCorpo'), [9, 9.5, 10, 10.5, 11, 11.5, 12, 13, 14], st.corpoPt);
                    riempiTaglie(rif2('selStileH1'), [12, 13, 14, 16, 18, 20, 22, 24], st.h1Pt);
                    riempiTaglie(rif2('selStileH2'), [11, 12, 13, 14, 16, 18], st.h2Pt);
                    riempiTaglie(rif2('selStileH3'), [10, 10.5, 11, 11.5, 12, 13, 14], st.h3Pt);
                    const selPeso = rif2('selStilePesoTitoli');
                    if (selPeso) selPeso.value = String(st.pesoTitoli || 700);
                    const selInt = rif2('selStileInterlinea'); if (selInt) selInt.value = String(st.interlinea);
                    document.querySelectorAll('#segStileAllineamento [data-stile-allinea]').forEach(b => {
                        b.classList.toggle('is-active', b.dataset.stileAllinea === st.allineamento);
                    });
                    const r = rif2('inpStileRientro'); if (r) r.value = st.rientroMm;
                    const sp = rif2('inpStileSpazioPar'); if (sp) sp.value = st.spazioParagrafoPt;
                    aggiornaAnteprimaStile();
                }
                // Ogni modifica ridisegna il foglio: lo stile del documento si giudica sul
                // documento, non su un campo di un modulo.
                function cambiaStile(campo, valore) {
                    stileInUso()[campo] = valore;
                    aggiornaAnteprimaStile();
                    renderTemplateEditorCanvas();
                    // Se la finestra del testo e' aperta sotto, deve cambiare anche lei: e' li'
                    // che si sta guardando il risultato.
                    const corpo = document.getElementById('tplTextEditorBody');
                    if (corpo) {
                        corpo.setAttribute('style', (corpo.getAttribute('style') || '').replace(/--tpl-[^;]+;\s*/g, '')
                            + ' ' + cssVariabiliStileTesto(templateEditorState.stileTesto));
                    }
                }
                [['selStileFont', 'font', v => v], ['selStileCorpo', 'corpoPt', parseFloat],
                 ['selStileInterlinea', 'interlinea', parseFloat], ['selStileH1', 'h1Pt', parseFloat],
                 ['selStileH2', 'h2Pt', parseFloat], ['selStileH3', 'h3Pt', parseFloat],
                 ['selStilePesoTitoli', 'pesoTitoli', v => parseInt(v, 10) || 700]
                ].forEach(([id, campo, conv]) => {
                    const el = rif2(id);
                    if (el) el.addEventListener('change', () => cambiaStile(campo, conv(el.value)));
                });
                [['inpStileRientro', 'rientroMm'], ['inpStileSpazioPar', 'spazioParagrafoPt']].forEach(([id, campo]) => {
                    const el = rif2(id);
                    if (el) el.addEventListener('input', () => cambiaStile(campo, Math.max(0, parseFloat(el.value) || 0)));
                });
                document.querySelectorAll('#segStileAllineamento [data-stile-allinea]').forEach(b => {
                    b.addEventListener('click', () => {
                        cambiaStile('allineamento', b.dataset.stileAllinea);
                        document.querySelectorAll('#segStileAllineamento [data-stile-allinea]').forEach(x => {
                            x.classList.toggle('is-active', x === b);
                        });
                    });
                });
                const apri = () => {
                    if (!templateEditorState.templateId) return;
                    sincronizzaPannelloStile();
                    if (overlay) overlay.classList.add('open');
                    if (finestra) finestra.classList.add('open');
                };
                const chiudi = () => {
                    if (overlay) overlay.classList.remove('open');
                    if (finestra) finestra.classList.remove('open');
                };
                const btnApri = rif2('btnStileTesto'); if (btnApri) btnApri.addEventListener('click', apri);
                // E DA DENTRO IL TESTO. Lo stesso pannello, aperto dal punto in cui uno si
                // accorge di volerlo: mentre scrive. La finestra del testo resta aperta sotto —
                // si cambia il carattere e si continua a scrivere.
                document.querySelectorAll('[data-comando-nota="stile-documento"]').forEach(b => b.addEventListener('click', apri));
                ['btnChiudiStileTestoX', 'btnStileTestoOk'].forEach(id => {
                    const b = rif2(id); if (b) b.addEventListener('click', chiudi);
                });
                if (overlay) overlay.addEventListener('click', chiudi);
                const btnRip = rif2('btnStileTestoRipristina');
                if (btnRip) btnRip.addEventListener('click', () => {
                    templateEditorState.stileTesto = stileTestoDiDefault();
                    sincronizzaPannelloStile();
                    renderTemplateEditorCanvas();
                });
            }

            // ---- schede, formato, misure e servizi pronti -------------------------------
            {
                // LE SCHEDE. Una alla volta a video: l'unico modo onesto di togliere confusione
                // senza togliere comandi.
                function mostraScheda(nome) {
                    document.querySelectorAll('#composizioneSchede [data-comp-scheda]').forEach(b => {
                        b.classList.toggle('is-active', b.dataset.compScheda === nome);
                    });
                    document.querySelectorAll('#composizioneBarra [data-comp-pannello]').forEach(p => {
                        p.style.display = (p.dataset.compPannello === nome) ? 'flex' : 'none';
                    });
                }
                document.querySelectorAll('#composizioneSchede [data-comp-scheda]').forEach(b => {
                    b.addEventListener('click', () => mostraScheda(b.dataset.compScheda));
                });
                window.__mostraSchedaComposizione = mostraScheda;

                // FORMATO. Il rateo NON deforma la mappa: cambia la finestra sul terreno, quindi
                // ritaglia o allarga il campo inquadrato tenendo fermo il centro. Subito dopo si
                // ripassa da inquadraturaSicura, cosi' se il nuovo taglio lasciasse fuori una
                // prova il riquadro si riadatta invece di perderla.
                function riadattaDopoFormato() {
                    if (!composizione) return;
                    const imp = composizione.imp;
                    const punti = imp.mappaTutteLeProve ? composizione.punti : composizione.punti.slice(0, 1);
                    const sicura = inquadraturaSicura({ centro: imp.centro, zoom: imp.zoom, provider: imp.provider },
                                                      punti, imp.larghezzaMm * 4, imp.altezzaMm * 4);
                    if (sicura && sicura.centro) { imp.centro = sicura.centro; if (sicura.ricalcolata) imp.zoom = sicura.zoom; }
                    disegnaComposizione();
                }
                document.querySelectorAll('#composizioneBarra [data-comp-rateo]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        const r = parseFloat(b.dataset.compRateo);
                        composizione.imp.altezzaMm = Math.round(Math.max(30, Math.min(230, composizione.imp.larghezzaMm / r)));
                        riadattaDopoFormato();
                    });
                });
                // FORMATO IN TEMPO REALE. Prima il riquadro cambiava solo al rilascio del
                // cursore, per non rifare decine di tessere ad ogni millimetro. Ma scegliere una
                // proporzione e' un giudizio visivo: senza vedere l'effetto mentre si trascina si
                // procede a tentativi, che e' peggio di qualche richiesta di rete in piu'.
                // Il compromesso che le tiene insieme: si ridisegna subito, ma raggruppando i
                // fotogrammi con requestAnimationFrame — al massimo un ridisegno per fotogramma,
                // mai uno per evento — e la reinquadratura di sicurezza (piu' costosa) si fa una
                // volta sola, alla fine del gesto.
                let attesaFotogramma = null;
                function ridisegnaSubito() {
                    if (attesaFotogramma) return;
                    attesaFotogramma = requestAnimationFrame(() => { attesaFotogramma = null; disegnaComposizione(); });
                }
                const rngLar = document.getElementById('rngComposizioneLarghezza');
                const rngAlt = document.getElementById('rngComposizioneAltezza');
                [[rngLar, 'larghezzaMm', 'lblComposizioneLarghezza'], [rngAlt, 'altezzaMm', 'lblComposizioneAltezza']].forEach(([r, campo, idEtichetta]) => {
                    if (!r) return;
                    r.addEventListener('input', () => {
                        if (!composizione) return;
                        composizione.imp[campo] = parseInt(r.value, 10);
                        const e = document.getElementById(idEtichetta);
                        if (e) e.textContent = r.value + 'mm';
                        ridisegnaSubito();
                    });
                    r.addEventListener('change', () => { if (composizione) riadattaDopoFormato(); });
                });

                const rngPin = document.getElementById('rngComposizioneMisuraPin');
                if (rngPin) rngPin.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.misuraEtichettaPin = parseInt(rngPin.value, 10);
                    // Le etichette delle pin sono testo sopra la mappa: si ridimensionano dove
                    // sono, senza rifare il mosaico sotto.
                    const et = composizioneTela ? composizioneTela.querySelectorAll('[data-pin-etichetta]') : [];
                    if (et.length) et.forEach(e2 => { e2.style.fontSize = composizione.imp.misuraEtichettaPin + 'px'; });
                    else disegnaComposizione();
                });
                const rngNord = document.getElementById('rngComposizioneNordMisura');
                if (rngNord) rngNord.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaNord.scala = parseInt(rngNord.value, 10) / 100;
                    aggiornaNordComposizione();
                });
                const rngSq = document.getElementById('rngComposizioneScalaRiquadro');
                if (rngSq) rngSq.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaScala.scalaRiquadro = parseInt(rngSq.value, 10) / 100;
                    aggiornaScalaComposizione();
                });
                const rngSt = document.getElementById('rngComposizioneScalaTesto');
                if (rngSt) rngSt.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaScala.misuraScala = parseInt(rngSt.value, 10);
                    aggiornaScalaComposizione();
                });
                const rngInsEt = document.getElementById('rngComposizioneInsetEtichettaMisura');
                if (rngInsEt) rngInsEt.addEventListener('input', () => {
                    if (!composizione) return;
                    // PRIMA SI SCRIVE IL DATO, POI SI MOSTRA. Riscrivendo questo gestore per
                    // renderlo leggero avevo perso proprio questa riga: applicava al video un
                    // valore che nessuno aveva aggiornato, quindi il cursore sembrava inerte e
                    // il salvataggio avrebbe conservato la misura vecchia.
                    composizione.imp.mappaInset.etichettaMisura = parseInt(rngInsEt.value, 10);
                    // L'etichetta e' un <div> di testo dentro il riquadro, e non ha nessun
                    // motivo di far ricaricare le tessere del riquadro stesso.
                    const el = composizioneTela && composizioneTela.querySelector('[data-inset-etichetta]');
                    if (el) el.style.fontSize = composizione.imp.mappaInset.etichettaMisura + 'px';
                    else disegnaComposizione();
                });
                document.querySelectorAll('#composizioneBarra [data-comp-inset-rateo]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        const imp = composizione.imp;
                        const r = parseFloat(b.dataset.compInsetRateo);
                        const percL = imp.mappaInset.percLarghezza || 34;
                        // percAltezza si ricava perche' il rapporto fra i lati VERI dia r.
                        imp.mappaInset.percAltezza = Math.max(15, Math.min(60,
                            Math.round((percL * imp.larghezzaMm) / (r * imp.altezzaMm))));
                        disegnaComposizione();
                    });
                });

                // I SERVIZI WMS PRONTI: un tasto per ciascuno.
                function disegnaWmsPronti() {
                    const cont = document.getElementById('composizioneWmsElenco');
                    if (!cont) return;
                    const elenco = wmsDisponibili();
                    cont.innerHTML = elenco.map((w2, i) => {
                        const mio = i >= WMS_PRONTI.length;
                        return `<span style="display:inline-flex; align-items:center;">
                            <button type="button" class="note-tb-btn" data-comp-wms="${i}" title="${escapeHtmlDidascalia(w2.url)}">${escapeHtmlDidascalia(w2.nome)}</button>
                            ${mio ? `<button type="button" class="note-tb-btn" data-comp-wms-elimina="${i - WMS_PRONTI.length}" title="Togli dai miei" style="padding:2px 6px;">&times;</button>` : ''}
                        </span>`;
                    }).join('');
                    cont.querySelectorAll('[data-comp-wms]').forEach(b => {
                        b.addEventListener('click', () => {
                            if (!composizione) return;
                            const v = wmsDisponibili()[parseInt(b.dataset.compWms, 10)];
                            if (!v) return;
                            composizione.imp.wmsUrl = v.url;
                            composizione.imp.wmsLayer = v.layer;
                            composizione.imp.attribuzione = v.attribuzione || '';
                            ['inpComposizioneWmsUrl', 'inpComposizioneWmsLayer', 'inpComposizioneAttribuzione'].forEach((id, k) => {
                                const el = document.getElementById(id);
                                if (el) el.value = [v.url, v.layer, v.attribuzione || ''][k];
                            });
                            const nota = document.getElementById('lblComposizioneWmsNota');
                            if (nota) nota.textContent = 'Se il riquadro resta grigio, il servizio non risponde: provane un altro.';
                            disegnaComposizione();
                        });
                    });
                    cont.querySelectorAll('[data-comp-wms-elimina]').forEach(b => {
                        b.addEventListener('click', () => {
                            const k = parseInt(b.dataset.compWmsElimina, 10);
                            if (!state.settings || !Array.isArray(state.settings.wmsPersonalizzati)) return;
                            state.settings.wmsPersonalizzati.splice(k, 1);
                            saveState();
                            disegnaWmsPronti();
                        });
                    });
                }
                window.__disegnaWmsPronti = disegnaWmsPronti;
                const btnWmsSalva = document.getElementById('btnComposizioneWmsSalva');
                if (btnWmsSalva) btnWmsSalva.addEventListener('click', async () => {
                    if (!composizione) return;
                    const url = (composizione.imp.wmsUrl || '').trim();
                    if (!url) { appAlert('Prima incolla l\'indirizzo del servizio, poi lo salvo fra i tuoi.'); return; }
                    // STESSA FIRMA SBAGLIATA della finestra dei tag, in un secondo posto:
                    // appPrompt vuole (messaggio, valore, opzioni) e le si passava un oggetto.
                    // Risultato: «Inserisci / [object Object]», e poi `nome.nome` su una
                    // stringa — cioe' un servizio salvato con nome `undefined` nell'elenco.
                    const nome = await appPrompt(
                        'Resta fra i tuoi servizi, e lo ritrovi in ogni cantiere.\n' + url,
                        'Ortofoto ' + (composizione.datiCantiere.comune || ''),
                        { title: 'Salva questo servizio', label: 'Come lo chiamo?', okLabel: 'Salva' }
                    );
                    if (!nome || !String(nome).trim()) return;
                    if (!state.settings) state.settings = {};
                    if (!Array.isArray(state.settings.wmsPersonalizzati)) state.settings.wmsPersonalizzati = [];
                    state.settings.wmsPersonalizzati.push({
                        nome: String(nome).trim(), url, layer: composizione.imp.wmsLayer || '', attribuzione: composizione.imp.attribuzione || ''
                    });
                    saveState();
                    disegnaWmsPronti();
                });
            }

            // ---- i comandi arrivati qui dal vecchio menu del blocco ----------------------
            {
                const rngOp = document.getElementById('rngComposizioneOpacitaToponimi');
                if (rngOp) rngOp.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.opacitaToponimi = parseInt(rngOp.value, 10);
                    // Il livello dei toponimi è già a video: si cambia la sua opacità e basta.
                    // Ridisegnare l'intera tavola ad ogni tick del cursore ricaricherebbe decine
                    // di tessere per ogni pixel di trascinamento.
                    const lay = composizioneTela && composizioneTela.querySelector('[data-livello-toponimi]');
                    if (lay) lay.style.opacity = composizione.imp.opacitaToponimi / 100;
                });
                const selEt = document.getElementById('selComposizioneEtichettaModo');
                if (selEt) selEt.addEventListener('change', () => {
                    if (!composizione) return;
                    composizione.imp.etichettaModo = selEt.value;
                    disegnaComposizione();
                    if (selEt.value === 'custom') {
                        const inp = document.getElementById('inpComposizioneEtichettaTesto');
                        if (inp) inp.focus();
                    }
                });
                const inpEt = document.getElementById('inpComposizioneEtichettaTesto');
                if (inpEt) inpEt.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.etichettaTesto = inpEt.value;
                    // Solo il testo dell'etichetta cambia: si riscrive quello, senza rifare la
                    // mappa sotto (e senza far perdere il fuoco al campo mentre si digita).
                    const el = composizioneTela && composizioneTela.querySelector('[data-etichetta-libera]');
                    if (el) el.textContent = inpEt.value;
                    else disegnaComposizione();
                });
                const rngEtM = document.getElementById('rngComposizioneEtichettaMisura');
                if (rngEtM) rngEtM.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.etichettaMisura = parseInt(rngEtM.value, 10);
                    const el = composizioneTela && composizioneTela.querySelector('[data-etichetta-libera]');
                    if (el) el.style.fontSize = composizione.imp.etichettaMisura + 'px';
                    else disegnaComposizione();
                });
                document.querySelectorAll('#composizioneBarra [data-comp-inset-zoom]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        const i = composizione.imp.mappaInset;
                        const attuale = (i.zoom != null) ? i.zoom : Math.max(1, Math.round(composizione.imp.zoom) - 5);
                        const p = PROVIDER_MAPPA[i.provider || composizione.imp.provider] || PROVIDER_MAPPA['esri-satellite'];
                        i.zoom = Math.max(1, Math.min(p.zoomMax || 19, attuale + parseInt(b.dataset.compInsetZoom, 10)));
                        disegnaComposizione();
                    });
                });
                const rngIns = document.getElementById('rngComposizioneInsetMisura');
                if (rngIns) rngIns.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaInset.percLarghezza = parseInt(rngIns.value, 10);
                    // Qui il ridisegno serve davvero: cambiando la misura cambia il numero di
                    // tessere del riquadro, non solo la sua scala.
                    disegnaComposizione();
                });
                const btnRiq = document.getElementById('btnComposizioneInsetRiquadro');
                if (btnRiq) btnRiq.addEventListener('click', () => {
                    if (!composizione) return;
                    const i = composizione.imp.mappaInset;
                    i.mostraRiquadro = (i.mostraRiquadro === false);
                    disegnaComposizione();
                });
                const selInsMod = document.getElementById('selComposizioneInsetEtichettaModo');
                if (selInsMod) selInsMod.addEventListener('change', () => {
                    if (!composizione) return;
                    composizione.imp.mappaInset.etichettaModo = selInsMod.value;
                    // Il vecchio interruttore non deve poter contraddire il modo nuovo.
                    delete composizione.imp.mappaInset.etichettaComune;
                    disegnaComposizione();
                    if (selInsMod.value === 'custom') {
                        const i2 = document.getElementById('inpComposizioneInsetEtichetta');
                        if (i2) i2.focus();
                    }
                });
                const inpIns = document.getElementById('inpComposizioneInsetEtichetta');
                if (inpIns) inpIns.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaInset.etichetta = inpIns.value;
                    const el = composizioneTela && composizioneTela.querySelector('[data-inset-etichetta]');
                    if (el) el.textContent = inpIns.value;
                    else disegnaComposizione();
                });
            }
            {
                const sel = document.getElementById('selComposizioneProvider');
                if (sel) sel.addEventListener('change', () => { if (composizione) { composizione.imp.provider = sel.value; disegnaComposizione(); } });
                [['inpComposizioneWmsUrl','wmsUrl'], ['inpComposizioneWmsLayer','wmsLayer'], ['inpComposizioneAttribuzione','attribuzione']].forEach(([id, chiave]) => {
                    const el = document.getElementById(id);
                    if (el) el.addEventListener('input', () => { if (composizione) { composizione.imp[chiave] = el.value; disegnaComposizione(); } });
                });
            }
            {
                const bx = document.getElementById('btnChiudiComposizioneX');
                const ba = document.getElementById('btnComposizioneAnnulla');
                if (bx) bx.addEventListener('click', chiudiComposizioneMappa);
                if (ba) ba.addEventListener('click', chiudiComposizioneMappa);
                if (modalComposizioneMappaOverlay) modalComposizioneMappaOverlay.addEventListener('click', chiudiComposizioneMappa);
                const bs = document.getElementById('btnComposizioneSalva');
                if (bs) bs.addEventListener('click', () => {
                    if (!composizione) return;
                    const page = paginaOrigineBlocco(composizione.blockId);
                    const blk = trovaBloccoPerId(page, composizione.blockId);
                    if (!blk) { chiudiComposizioneMappa(); return; }
                    salvaUndoSnapshotEditor();
                    const imp = composizione.imp;
                    blk.mappa = { centro: imp.centro, zoom: imp.zoom, provider: imp.provider };
                    blk.mappaZoom = imp.zoom;
                    blk.mappaProvider = imp.provider;
                    blk.mappaWmsUrl = imp.wmsUrl; blk.mappaWmsLayer = imp.wmsLayer; blk.mappaAttribuzione = imp.attribuzione;
                    blk.mappaTutteLeProve = imp.mappaTutteLeProve;
                    blk.satelliteLabels = imp.etichette;
                    blk.ingrandimentoToponimi = imp.ingrandimentoToponimi;
                    blk.satelliteLabelsOpacity = imp.opacitaToponimi;
                    blk.satelliteCustomLabelMode = imp.etichettaModo;
                    blk.satelliteCustomLabelText = imp.etichettaTesto;
                    blk.satelliteCustomLabelFontSize = imp.etichettaMisura;
                    blk.satelliteCustomLabelPosX = imp.etichettaX;
                    blk.satelliteCustomLabelPosY = imp.etichettaY;
                    blk.mappaEtichettePinAttive = imp.mappaEtichettePinAttive;
                    blk.mappaEtichettePin = imp.mappaEtichettePin;
                    blk.mappaMostraNord = imp.mappaMostraNord;
                    blk.mappaNord = imp.mappaNord;
                    blk.mappaMostraScala = imp.mappaMostraScala;
                    blk.mappaScala = imp.mappaScala;
                    blk.mappaInset = imp.mappaInset;
                    blk.mappaLarghezzaMm = imp.larghezzaMm;
                    blk.mappaAltezzaMm = imp.altezzaMm;
                    blk.mappaMisuraEtichettaPin = imp.misuraEtichettaPin;
                    // satelliteLabelsScale era la vecchia percentuale del trucco per-tessera:
                    // si toglie, altrimenti alla prossima apertura tornerebbe a decidere lei.
                    delete blk.satelliteLabelsScale;
                    const id = composizione.blockId;
                    chiudiComposizioneMappa();
                    renderTemplateEditorCanvas();
                    selezionaBloccoEditor(id);
                });
            }

