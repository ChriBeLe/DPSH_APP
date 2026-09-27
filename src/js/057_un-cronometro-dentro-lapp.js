            // ===== UN CRONOMETRO DENTRO L'APP =====
            // Ho gia' sbagliato una volta la diagnosi di questa lentezza: avevo misurato in un
            // DOM finto, trovato un costo vero (le ricerche sull'intero documento) e concluso
            // che fosse QUELLO. Sul telefono non e' cambiato niente. La lezione e' che un
            // ambiente di prova puo' avere colli di bottiglia suoi, diversi da quelli veri.
            // Quindi qui la misura la fa l'app stessa, sul dispositivo vero: ogni operazione
            // del compositore si cronometra e, se supera i 150 ms, scrive il dettaglio nella
            // riga di stato. Sotto quella soglia non si vede niente — non e' un pannello di
            // debug, e' un termometro che si accende solo quando c'e' la febbre.
            let tappeMisura = [];
            const oraPrecisa = () => (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            function misura(nome, fn) {
                const t0 = oraPrecisa();
                const r = fn();
                tappeMisura.push(nome + ' ' + Math.round(oraPrecisa() - t0));
                return r;
            }
            function riportaMisura(operazione) {
                const totale = tappeMisura.reduce((s2, x) => s2 + (parseInt(x.split(' ').pop(), 10) || 0), 0);
                const riga = document.getElementById('lblComposizioneStato');
                if (riga && totale > 150) {
                    riga.textContent = '⏱ ' + operazione + ': ' + totale + ' ms — ' + tappeMisura.join(' · ');
                    riga.style.color = '#f59e0b';
                } else if (riga && riga.style.color) {
                    // Tornata la normalita', si spegne: un avviso che resta acceso per sempre
                    // smette di significare qualcosa.
                    riga.style.color = '';
                    aggiornaBarraComposizione();
                }
                tappeMisura = [];
            }

            const cacheRifBarra = new Map();
            function rif(id) {
                if (!cacheRifBarra.has(id)) cacheRifBarra.set(id, document.getElementById(id));
                return cacheRifBarra.get(id);
            }
            function rifTutti(selettore) {
                if (!cacheRifBarra.has(selettore)) {
                    const dentro = document.getElementById('composizioneBarra');
                    cacheRifBarra.set(selettore, dentro ? Array.from(dentro.querySelectorAll(selettore)) : []);
                }
                return cacheRifBarra.get(selettore);
            }

            function aggiornaBarraComposizione() {
                if (!composizione) return;
                const imp = composizione.imp;
                const lbl = rif('lblComposizioneZoom');
                if (lbl) lbl.textContent = 'z ' + imp.zoom;
                // LA SCALA VERA DELLA FIGURA. Diceva "Trascina per inquadrare" e basta: un
                // suggerimento che dopo il primo trascinamento non serve piu' a nessuno. In una
                // figura di relazione la scala e' invece l'informazione che si vuole sapere
                // mentre si compone — ed e' calcolata con la stessa formula della barra di scala
                // stampata, non con una sua approssimazione.
                const stato = rif('lblComposizioneStato');
                if (stato && imp.centro) {
                    const rad = parseFloat(imp.centro.lat) * Math.PI / 180;
                    const metriPerPixel = 156543.03392804097 * Math.cos(rad) / Math.pow(2, Math.round(imp.zoom));
                    // 4 px di tavola per mm: mm di carta -> metri di terreno -> denominatore.
                    const denominatore = Math.round(metriPerPixel * 4 * 1000);
                    const quante = imp.mappaTutteLeProve ? composizione.punti.length : Math.min(1, composizione.punti.length);
                    stato.textContent = 'circa 1:' + denominatore.toLocaleString('it-IT')
                        + ' · ' + quante + (quante === 1 ? ' prova' : ' prove');
                }
                const sel = rif('selComposizioneProvider');
                if (sel && !sel.dataset.pronto) {
                    sel.innerHTML = Object.keys(PROVIDER_MAPPA).map(k => `<option value="${k}">${PROVIDER_MAPPA[k].nome}</option>`).join('');
                    sel.dataset.pronto = '1';
                }
                if (sel) sel.value = imp.provider;
                const rigaWms = rif('composizioneWmsPronti');
                if (rigaWms) rigaWms.style.display = (imp.provider === 'wms') ? 'flex' : 'none';
                // Formato del riquadro: due cursori in millimetri e i ratei pronti.
                const rngL = rif('rngComposizioneLarghezza');
                const rngA = rif('rngComposizioneAltezza');
                if (rngL) { rngL.value = Math.round(imp.larghezzaMm); const e = rif('lblComposizioneLarghezza'); if (e) e.textContent = Math.round(imp.larghezzaMm) + 'mm'; }
                if (rngA) { rngA.value = Math.round(imp.altezzaMm); const e = rif('lblComposizioneAltezza'); if (e) e.textContent = Math.round(imp.altezzaMm) + 'mm'; }
                const rateoAttuale = imp.larghezzaMm / Math.max(1, imp.altezzaMm);
                rifTutti('[data-comp-rateo]').forEach(b => {
                    b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.compRateo) - rateoAttuale) < 0.02);
                });
                const rngPin = rif('rngComposizioneMisuraPin');
                if (rngPin) { rngPin.value = imp.misuraEtichettaPin; rngPin.disabled = !imp.mappaEtichettePinAttive; }
                // Nord e scala: i cursori si spengono col decoro che regolano, invece di far
                // credere che stiano cambiando qualcosa di invisibile.
                const rngNord = rif('rngComposizioneNordMisura');
                if (rngNord) { rngNord.value = Math.round((imp.mappaNord.scala || 1) * 100); rngNord.disabled = !imp.mappaMostraNord; }
                const rngScalaQ = rif('rngComposizioneScalaRiquadro');
                if (rngScalaQ) { rngScalaQ.value = Math.round((imp.mappaScala.scalaRiquadro || 1) * 100); rngScalaQ.disabled = !imp.mappaMostraScala; }
                const rngScalaT = rif('rngComposizioneScalaTesto');
                if (rngScalaT) { rngScalaT.value = imp.mappaScala.misuraScala || 7; rngScalaT.disabled = !imp.mappaMostraScala; }
                const rngScalaLun = rif('rngComposizioneScalaLunghezza');
                if (rngScalaLun) {
                    rngScalaLun.value = Math.round((imp.mappaScala.lunghezza || 0.25) * 100);
                    rngScalaLun.disabled = !imp.mappaMostraScala;
                    // Si mostra il valore VERO che ne esce (250 m, 1 km...), non la percentuale
                    // chiesta: la percentuale e' un desiderio, il passo tondo e' il risultato.
                    const barra = composizioneTela && composizioneTela.querySelector('[data-elemento-mappa="scala"] span:last-child');
                    const e2 = rif('lblComposizioneScalaLunghezza');
                    if (e2) e2.textContent = barra ? barra.textContent : '';
                }
                rifTutti('[data-comp-nord-stile]').forEach(b => {
                    b.classList.toggle('is-active', (imp.mappaNord.stile || 'chiaro') === b.dataset.compNordStile);
                    b.disabled = !imp.mappaMostraNord;
                });
                rifTutti('[data-comp-scala-sfondo]').forEach(b => {
                    b.classList.toggle('is-active', (imp.mappaScala.sfondo || 'chiaro') === b.dataset.compScalaSfondo);
                    b.disabled = !imp.mappaMostraScala;
                });
                rifTutti('[data-comp-inset-trascina]').forEach(b => {
                    b.classList.toggle('is-active', (imp.mappaInset.trascina || 'riquadro') === b.dataset.compInsetTrascina);
                });
                rifTutti('[data-comp-toponimi]').forEach(b => {
                    const v = b.dataset.compToponimi;
                    const attivo = (v === 'off') ? !imp.etichette : (imp.etichette && String(imp.ingrandimentoToponimi) === v);
                    b.classList.toggle('is-active', attivo);
                });
                rifTutti('[data-comp-toggle]').forEach(b => {
                    const chiave = b.dataset.compToggle;
                    const attivo = (chiave === 'inset') ? !!imp.mappaInset.attivo : !!imp[chiave];
                    b.classList.toggle('is-active', attivo);
                });
                // Opacità dei toponimi: il cursore si spegne quando i nomi sono spenti, perché
                // regolare la trasparenza di qualcosa che non c'è è un comando che finge.
                const rngOp = rif('rngComposizioneOpacitaToponimi');
                if (rngOp) { rngOp.value = imp.opacitaToponimi; rngOp.disabled = !imp.etichette; rngOp.style.opacity = imp.etichette ? '1' : '0.4'; }
                const selEtMod = rif('selComposizioneEtichettaModo');
                if (selEtMod) selEtMod.value = imp.etichettaModo;
                const inpEtTxt = rif('inpComposizioneEtichettaTesto');
                if (inpEtTxt) {
                    inpEtTxt.style.display = (imp.etichettaModo === 'custom') ? '' : 'none';
                    if (document.activeElement !== inpEtTxt) inpEtTxt.value = imp.etichettaTesto;
                }
                const rngEtMis = rif('rngComposizioneEtichettaMisura');
                if (rngEtMis) {
                    const attiva = imp.etichettaModo !== 'none';
                    rngEtMis.value = imp.etichettaMisura; rngEtMis.disabled = !attiva;
                    rngEtMis.style.opacity = attiva ? '1' : '0.4';
                }
                // Il gruppo del regionale compare solo quando il regionale c'è: quattro comandi
                // sempre a video per una cosa spenta sono esattamente il menu che ho appena tolto.
                // I comandi del regionale restano a video ma spenti quando il riquadro non c'e':
                // farli sparire faceva "ballare" la scheda ad ogni accensione, ed era il tipo di
                // movimento che rende un pannello difficile da imparare.
                rifTutti('[data-comp-pannello="regionale"] input, [data-comp-pannello="regionale"] select, [data-comp-pannello="regionale"] [data-comp-inset-zoom], [data-comp-pannello="regionale"] [data-comp-inset-rateo], #btnComposizioneInsetRiquadro')
                    .forEach(el => { el.disabled = !imp.mappaInset.attivo; el.style.opacity = imp.mappaInset.attivo ? '1' : '0.45'; });
                {
                    const zIns = (imp.mappaInset.zoom !== undefined && imp.mappaInset.zoom !== null)
                        ? imp.mappaInset.zoom : Math.max(1, Math.round(imp.zoom) - 5);
                    const lblIns = rif('lblComposizioneInsetZoom');
                    if (lblIns) lblIns.textContent = 'z ' + zIns;
                    const rngIns = rif('rngComposizioneInsetMisura');
                    if (rngIns) rngIns.value = imp.mappaInset.percLarghezza || 34;
                    const btnRiq = rif('btnComposizioneInsetRiquadro');
                    if (btnRiq) btnRiq.classList.toggle('is-active', imp.mappaInset.mostraRiquadro !== false);
                    const modoIns = imp.mappaInset.etichettaModo || 'comune';
                    const selIns = rif('selComposizioneInsetEtichettaModo');
                    if (selIns) selIns.value = modoIns;
                    const inpIns = rif('inpComposizioneInsetEtichetta');
                    if (inpIns) {
                        inpIns.style.display = (modoIns === 'custom') ? '' : 'none';
                        if (document.activeElement !== inpIns) inpIns.value = imp.mappaInset.etichetta || '';
                    }
                    rifTutti('[data-comp-nord-stile]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        composizione.imp.mappaNord.stile = b.dataset.compNordStile;
                        aggiornaNordComposizione();
                    });
                });
                rifTutti('[data-comp-scala-sfondo]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        composizione.imp.mappaScala.sfondo = b.dataset.compScalaSfondo;
                        aggiornaScalaComposizione();
                    });
                });
                rifTutti('[data-comp-inset-trascina]').forEach(b => {
                    b.addEventListener('click', () => {
                        if (!composizione) return;
                        composizione.imp.mappaInset.trascina = b.dataset.compInsetTrascina;
                        aggiornaBarraComposizione();
                    });
                });
                const rngScalaLun = rif('rngComposizioneScalaLunghezza');
                if (rngScalaLun) rngScalaLun.addEventListener('input', () => {
                    if (!composizione) return;
                    composizione.imp.mappaScala.lunghezza = parseInt(rngScalaLun.value, 10) / 100;
                    aggiornaScalaComposizione();
                });
                const rngInsEt = rif('rngComposizioneInsetEtichettaMisura');
                    if (rngInsEt) rngInsEt.value = imp.mappaInset.etichettaMisura || 9;
                    // Il rateo dell'inset e' il rapporto fra i suoi lati VERI, che nascono dalle
                    // due percentuali applicate ai lati del riquadro grande: confrontare le sole
                    // percentuali direbbe "1:1" anche su un riquadro grande panoramico.
                    const percL = imp.mappaInset.percLarghezza || 34;
                    const percA = imp.mappaInset.percAltezza || percL;
                    const rateoIns = (percL * imp.larghezzaMm) / Math.max(1, percA * imp.altezzaMm);
                    rifTutti('[data-comp-inset-rateo]').forEach(b => {
                        b.classList.toggle('is-active', Math.abs(parseFloat(b.dataset.compInsetRateo) - rateoIns) < 0.03);
                    });
                }
            }

            function apriComposizioneMappa(blockId) {
                const page = paginaOrigineBlocco(blockId);
                const blk = trovaBloccoPerId(page, blockId);
                if (!blk) return;
                const projId = (templateEditorState && templateEditorState.previewProjectId) || state.currentProjectId;
                const proj = state.projects && state.projects[projId];
                const punti = puntiProveDelProgetto(proj);
                if (punti.length === 0) {
                    appAlert('Nessuna prova di questo cantiere ha coordinate GPS: non ci sono punti da inquadrare.');
                    return;
                }
                // Comune e località per l'etichetta. Il comune sta sul progetto, la località
                // sulla singola prova (puo' cambiare da verticale a verticale): si prende quella
                // della prima prova, che è la stessa che finisce nell'intestazione del report.
                const primaProva = Object.values((proj && proj.surveys) || {})
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0))[0];
                const datiCantiere = {
                    comune: (proj && proj.comune) || (primaProva && primaProva.header && primaProva.header.comune) || '',
                    localita: (primaProva && primaProva.header && primaProva.header.localita) || (proj && proj.localita) || ''
                };
                composizione = { blockId, imp: impostazioniMappaDaBlocco(blk, punti), punti, scala: 1, datiCantiere };
                if (!composizione.imp.centro) composizione.imp.centro = { lat: parseFloat(punti[0].lat), lng: parseFloat(punti[0].lng) };
                const wUrl = document.getElementById('inpComposizioneWmsUrl');
                const wLayer = document.getElementById('inpComposizioneWmsLayer');
                const wAttr = document.getElementById('inpComposizioneAttribuzione');
                if (wUrl) wUrl.value = composizione.imp.wmsUrl;
                if (wLayer) wLayer.value = composizione.imp.wmsLayer;
                if (wAttr) wAttr.value = composizione.imp.attribuzione;
                if (window.__mostraSchedaComposizione) window.__mostraSchedaComposizione('mappa');
                if (window.__disegnaWmsPronti) window.__disegnaWmsPronti();
                if (modalComposizioneMappaOverlay) modalComposizioneMappaOverlay.classList.add('open');
                if (modalComposizioneMappa) modalComposizioneMappa.classList.add('open');
                setTimeout(disegnaComposizione, 30);
            }
            function chiudiComposizioneMappa() {
                if (modalComposizioneMappaOverlay) modalComposizioneMappaOverlay.classList.remove('open');
                if (modalComposizioneMappa) modalComposizioneMappa.classList.remove('open');
                composizione = null;
            }

            // ---- i gesti sulla tavola -------------------------------------------------------
            if (composizioneTela) {
                let trascina = null;
                composizioneTela.addEventListener('pointerdown', (e) => {
                    if (!composizione || !composizione.imp.centro) return;
                    e.preventDefault();
                    if (composizioneTela.setPointerCapture) composizioneTela.setPointerCapture(e.pointerId);
                    const t = e.target;
                    // Prima gli elementi, poi la mappa: un'etichetta sta SOPRA la mappa, quindi
                    // va interrogata per prima o non si potrebbe mai afferrare.
                    const etichetta = t.closest && t.closest('[data-pin-etichetta]');
                    const libera = t.closest && t.closest('[data-etichetta-libera]');
                    // L'etichetta DENTRO l'inset va interrogata prima dell'inset stesso, o
                    // afferrandola si trascinerebbe tutto il riquadro regionale che la contiene.
                    const insetEtichetta = t.closest && t.closest('[data-inset-etichetta]');
                    const inset = t.closest && t.closest('[data-inset-regionale]');
                    const elemento = t.closest && t.closest('[data-elemento-mappa]');
                    if (libera) {
                        trascina = { tipo: 'libera', x0: composizione.imp.etichettaX, y0: composizione.imp.etichettaY, x: e.clientX, y: e.clientY };
                    } else if (insetEtichetta) {
                        const i = composizione.imp.mappaInset;
                        trascina = { tipo: 'inset-etichetta', x0: i.etichettaX, y0: i.etichettaY, x: e.clientX, y: e.clientY };
                    } else if (etichetta) {
                        const numero = etichetta.getAttribute('data-pin-etichetta');
                        const corrente = composizione.imp.mappaEtichettePin[numero] || {};
                        trascina = { tipo: 'etichetta', numero, dx0: corrente.dx || 0, dy0: corrente.dy || 0, x: e.clientX, y: e.clientY };
                    } else if (inset) {
                        // Due gesti diversi sullo stesso oggetto: spostare il riquadro sulla
                        // figura, oppure spostare la mappa DENTRO il riquadro. Non si possono
                        // indovinare dal movimento, quindi lo dice l'interruttore della scheda
                        // Regionale — meglio una scelta esplicita che una regola nascosta.
                        const ins = composizione.imp.mappaInset;
                        if ((ins.trascina || 'riquadro') === 'mappa') {
                            const partenza = (ins.centro && isFinite(parseFloat(ins.centro.lat))) ? ins.centro : composizione.imp.centro;
                            trascina = { tipo: 'inset-mappa', centro0: Object.assign({}, partenza), x: e.clientX, y: e.clientY };
                        } else {
                            trascina = { tipo: 'inset', x0: ins.x, y0: ins.y, x: e.clientX, y: e.clientY };
                        }
                    } else if (elemento) {
                        const quale = elemento.getAttribute('data-elemento-mappa');
                        const cfg = quale === 'nord' ? composizione.imp.mappaNord : composizione.imp.mappaScala;
                        trascina = { tipo: quale, x0: cfg.x, y0: cfg.y, x: e.clientX, y: e.clientY };
                    } else {
                        trascina = { tipo: 'mappa', centro0: Object.assign({}, composizione.imp.centro), x: e.clientX, y: e.clientY };
                        composizioneTela.style.cursor = 'grabbing';
                    }
                });
                composizioneTela.addEventListener('pointermove', (e) => {
                    if (!trascina || !composizione) return;
                    const k = composizione.scala || 1;
                    const dx = (e.clientX - trascina.x) / k, dy = (e.clientY - trascina.y) / k;
                    const imp = composizione.imp;
                    const PX_PER_MM = 4;
                    const larghezzaPx = imp.larghezzaMm * PX_PER_MM, altezzaPx = imp.altezzaMm * PX_PER_MM;
                    // Il dito si muove in pixel di SCHERMO; la tavola e' in pixel-tavola. Il
                    // rapporto e' 96/25.4 px per mm sullo schermo contro i 4 px/mm della tavola:
                    // senza questa conversione lo spostamento sarebbe sistematicamente sbagliato.
                    const daSchermoATavola = PX_PER_MM / (96 / 25.4);
                    if (trascina.tipo === 'mappa') {
                        // Trascinare la mappa significa muovere il CENTRO nella direzione opposta.
                        const z = Math.round(imp.zoom);
                        const cx = tessereXDaLng(trascina.centro0.lng, z) - (dx * daSchermoATavola) / LATO_TESSERA;
                        const cy = tessereYDaLat(trascina.centro0.lat, z) - (dy * daSchermoATavola) / LATO_TESSERA;
                        imp.centro = { lat: latDaTessereY(cy, z), lng: lngDaTessereX(cx, z) };
                    } else if (trascina.tipo === 'etichetta') {
                        if (!imp.mappaEtichettePin[trascina.numero]) imp.mappaEtichettePin[trascina.numero] = {};
                        imp.mappaEtichettePin[trascina.numero].dx = Math.round(trascina.dx0 + dx * daSchermoATavola);
                        imp.mappaEtichettePin[trascina.numero].dy = Math.round(trascina.dy0 + dy * daSchermoATavola);
                    } else if (trascina.tipo === 'inset-mappa') {
                        // Stessa matematica della mappa grande, ma allo zoom E alle dimensioni
                        // del riquadro regionale: usare quelli della mappa grande farebbe muovere
                        // l'inset di un fattore sbagliato, che e' il classico "non segue il dito".
                        const ins = imp.mappaInset;
                        const perc = Math.max(15, Math.min(60, ins.percLarghezza || 34));
                        const percH = Math.max(15, Math.min(60, ins.percAltezza || perc));
                        const zIns = Math.round((ins.zoom != null) ? ins.zoom : Math.max(1, Math.round(imp.zoom) - 5));
                        const cx = tessereXDaLng(trascina.centro0.lng, zIns) - (dx * daSchermoATavola) / LATO_TESSERA;
                        const cy = tessereYDaLat(trascina.centro0.lat, zIns) - (dy * daSchermoATavola) / LATO_TESSERA;
                        ins.centro = { lat: latDaTessereY(cy, zIns), lng: lngDaTessereX(cx, zIns) };
                        void perc; void percH;
                    } else if (trascina.tipo === 'inset-etichetta') {
                        // Questa percentuale è relativa al riquadro REGIONALE, non alla mappa
                        // grande: usare i pixel della mappa la farebbe muovere di un terzo del
                        // dovuto, e nessuno capirebbe perché "l'etichetta non segue il dito".
                        const perc = Math.max(15, Math.min(60, imp.mappaInset.percLarghezza || 34));
                        const percH = Math.max(15, Math.min(60, imp.mappaInset.percAltezza || perc));
                        const wIns = larghezzaPx * perc / 100, hIns = altezzaPx * percH / 100;
                        const base = VERTICI_MAPPA[imp.mappaInset.etichettaVertice || 'basso-sinistra'] || { x: 4, y: 96 };
                        const x0 = (trascina.x0 != null) ? trascina.x0 : base.x;
                        const y0 = (trascina.y0 != null) ? trascina.y0 : base.y;
                        imp.mappaInset.etichettaX = Math.max(0, Math.min(100, x0 + (dx * daSchermoATavola / wIns) * 100));
                        imp.mappaInset.etichettaY = Math.max(0, Math.min(100, y0 + (dy * daSchermoATavola / hIns) * 100));
                    } else if (trascina.tipo === 'libera') {
                        imp.etichettaX = Math.max(0, Math.min(100, trascina.x0 + (dx * daSchermoATavola / larghezzaPx) * 100));
                        imp.etichettaY = Math.max(0, Math.min(100, trascina.y0 + (dy * daSchermoATavola / altezzaPx) * 100));
                    } else {
                        // Gli elementi si posizionano in PERCENTUALE del riquadro: cosi' restano
                        // dove sono anche cambiando la misura del blocco.
                        const cfg = trascina.tipo === 'inset' ? imp.mappaInset
                                  : (trascina.tipo === 'nord' ? imp.mappaNord : imp.mappaScala);
                        const base = VERTICI_MAPPA[cfg.posizione] || { x: 4, y: 96 };
                        const x0 = (trascina.x0 !== undefined && trascina.x0 !== null) ? trascina.x0 : base.x;
                        const y0 = (trascina.y0 !== undefined && trascina.y0 !== null) ? trascina.y0 : base.y;
                        cfg.x = Math.max(0, Math.min(100, x0 + (dx * daSchermoATavola / larghezzaPx) * 100));
                        cfg.y = Math.max(0, Math.min(100, y0 + (dy * daSchermoATavola / altezzaPx) * 100));
                    }
                    disegnaComposizione();
                });
                const fineTrascina = () => { trascina = null; composizioneTela.style.cursor = 'grab'; };
                composizioneTela.addEventListener('pointerup', fineTrascina);
                composizioneTela.addEventListener('pointercancel', fineTrascina);
            }

            document.querySelectorAll('#composizioneBarra [data-comp-zoom]').forEach(b => {
                b.addEventListener('click', () => {
                    if (!composizione) return;
                    const p = PROVIDER_MAPPA[composizione.imp.provider] || PROVIDER_MAPPA['esri-satellite'];
                    composizione.imp.zoom = Math.max(1, Math.min(p.zoomMax || 19, composizione.imp.zoom + parseInt(b.dataset.compZoom, 10)));
                    disegnaComposizione();
                });
            });
            document.querySelectorAll('#composizioneBarra [data-comp-toponimi]').forEach(b => {
                b.addEventListener('click', () => {
                    if (!composizione) return;
                    const v = b.dataset.compToponimi;
                    if (v === 'off') composizione.imp.etichette = false;
                    else { composizione.imp.etichette = true; composizione.imp.ingrandimentoToponimi = parseInt(v, 10); }
                    disegnaComposizione();
                });
            });
            document.querySelectorAll('#composizioneBarra [data-comp-toggle]').forEach(b => {
                b.addEventListener('click', () => {
                    if (!composizione) return;
                    const chiave = b.dataset.compToggle;
                    if (chiave === 'inset') composizione.imp.mappaInset.attivo = !composizione.imp.mappaInset.attivo;
                    else composizione.imp[chiave] = !composizione.imp[chiave];
                    // Passando a "tutte le prove" ha senso reinquadrare: altrimenti si resta
                    // centrati su una sola e le altre restano fuori dal riquadro.
                    if (chiave === 'mappaTutteLeProve' && composizione.imp.mappaTutteLeProve) {
                        const inq = inquadraturaPerPunti(composizione.punti, composizione.imp.larghezzaMm * 4, composizione.imp.altezzaMm * 4, 19);
                        if (inq) { composizione.imp.centro = inq.centro; composizione.imp.zoom = inq.zoom; }
                    }
                    disegnaComposizione();
                });
            });
