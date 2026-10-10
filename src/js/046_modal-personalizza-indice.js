            // ===================== MODAL "PERSONALIZZA INDICE" =====================
            // Leggero apposta: una decina di controlli, non il sistema a schede del menu blocco.
            // Riusa comunque gli stessi helper (htmlControlloNumerico/htmlInterruttore) e le stesse
            // classi tpl-editor-menu-* per restare nello stesso linguaggio visivo di ogni altro
            // pannello di personalizzazione dell'app.
            const modalIndicePersonalizzaOverlay = document.getElementById('modalIndicePersonalizzaOverlay');
            const modalIndicePersonalizza = document.getElementById('modalIndicePersonalizza');
            const btnCloseIndicePersonalizzaX = document.getElementById('btnCloseIndicePersonalizzaX');
            const idxPersControlli = document.getElementById('idxPersControlli');
            const btnIndicePersSalva = document.getElementById('btnIndicePersSalva');
            const lblIndicePersTitle = document.getElementById('lblIndicePersTitle');
            // Id del template in modifica e copia di lavoro del suo stile: una copia profonda, così
            // chiudere con la X non lascia tracce — solo "Salva" scrive davvero sulla libreria.
            let indicePersTemplateId = null;
            let indicePersStato = null;
            /** Quali gruppi dei livelli sono aperti. Vive FUORI dalla funzione di disegno perché il
             * pannello si ridisegna a ogni interruttore: se stesse dentro, ogni tocco richiuderebbe
             * tutto. Chiusi di partenza — sono tre gruppi da sei controlli, e da chiusi si legge
             * comunque il riassunto (13pt · grassetto) senza aprirli. */
            const idxPersLivelliAperti = { h1: false, h2: false, h3: false };

            /** Zoom dell'anteprima — l'unica cosa che questa schermata condivide col motivo per
             * cui l'editor a blocchi ne ha uno (vedere l'intera pagina), ma qui molto più semplice:
             * una sola pagina fissa, nessun pan/canvas da gestire, solo scale() sul contenitore. */
            function applicaZoomIndicePers(pct) {
                const p = Math.max(30, Math.min(150, Math.round(pct)));
                const wrap = document.getElementById('idxPersPreviewScaleWrap');
                if (wrap) wrap.style.transform = `scale(${p / 100})`;
                // "outer" dimensionato ESATTAMENTE alla dimensione post-scala: è questo a far
                // funzionare margin:auto sul viewport sottostante (centra quando ci sta, lascia
                // scorrere liberamente in ogni direzione — inclusa la parte alta — quando trabocca).
                const outer = document.getElementById('idxPersPreviewScaleOuter');
                if (outer) { outer.style.width = (794 * p / 100) + 'px'; outer.style.height = (1123 * p / 100) + 'px'; }
                const lbl = document.getElementById('lblIndicePersZoom');
                if (lbl) lbl.textContent = p + '%';
                const range = document.getElementById('rangeIndicePersZoom');
                if (range && Number(range.value) !== p) range.value = String(p);
            }
            function adattaZoomIndicePers() {
                const viewport = document.getElementById('idxPersViewport');
                if (!viewport) return;
                const scala = Math.min((viewport.clientWidth - 48) / 794, (viewport.clientHeight - 48) / 1123);
                applicaZoomIndicePers(scala * 100);
            }
            const rangeIndicePersZoom = document.getElementById('rangeIndicePersZoom');
            if (rangeIndicePersZoom) rangeIndicePersZoom.addEventListener('input', () => applicaZoomIndicePers(Number(rangeIndicePersZoom.value)));
            const btnIndicePersZoomFit = document.getElementById('btnIndicePersZoomFit');
            if (btnIndicePersZoomFit) btnIndicePersZoomFit.addEventListener('click', adattaZoomIndicePers);

            /** Apre la schermata sul template indice `templateId` — builtIn o no: modificare
             * "Classico" lo cambia per ogni progetto che lo usa, esattamente come "Modifica
             * layout" su "Classico" fa oggi per i Template di Report (builtIn blocca solo
             * rinomina/elimina, mai la modifica del contenuto). */
            function apriModalPersonalizzaIndice(templateId) {
                const tpl = state.indiceTemplates[templateId];
                if (!tpl) return;
                indicePersTemplateId = templateId;
                // Fuso sui valori di serie PRIMA della copia profonda: un template salvato da una
                // sessione precedente a numero/titolo/coloreTesto/coloreDivisore ne è privo del
                // tutto, e st.titolo.pt (ecc.) esploderebbe leggendo un undefined — stesso identico
                // rischio già gestito altrove (stileIndiceDelProgetto/buildIndiceReportCompletoHtml)
                // con lo stesso rimedio.
                indicePersStato = JSON.parse(JSON.stringify(Object.assign(stileIndiceDiDefault(), tpl)));
                if (lblIndicePersTitle) lblIndicePersTitle.textContent = `Personalizza «${tpl.name}»`;
                renderModalPersonalizzaIndice();
                if (modalIndicePersonalizzaOverlay) modalIndicePersonalizzaOverlay.classList.add('open');
                if (modalIndicePersonalizza) modalIndicePersonalizza.classList.add('open');
                adattaZoomIndicePers();
            }
            function chiudiModalPersonalizzaIndice() {
                if (modalIndicePersonalizzaOverlay) modalIndicePersonalizzaOverlay.classList.remove('open');
                if (modalIndicePersonalizza) modalIndicePersonalizza.classList.remove('open');
                indicePersTemplateId = null;
                indicePersStato = null;
            }
            if (btnCloseIndicePersonalizzaX) btnCloseIndicePersonalizzaX.addEventListener('click', chiudiModalPersonalizzaIndice);
            if (modalIndicePersonalizzaOverlay) modalIndicePersonalizzaOverlay.addEventListener('click', chiudiModalPersonalizzaIndice);
            if (btnIndicePersSalva) {
                btnIndicePersSalva.addEventListener('click', () => {
                    if (!indicePersTemplateId || !indicePersStato) return;
                    const tpl = state.indiceTemplates[indicePersTemplateId];
                    if (!tpl) return;
                    Object.assign(tpl, indicePersStato);
                    tpl.updatedAt = Date.now();
                    saveState();
                    // Riflette subito nome/anteprima se il modale "Template di Report" è aperto sotto.
                    if (typeof renderIndiceTemplatesList === 'function') renderIndiceTemplatesList();
                    chiudiModalPersonalizzaIndice();
                });
            }

            /** Righe finte SOLO per l'anteprima — due H1, un H2, un H3: bastano a far vedere
             * l'effetto di ogni controllo su tutti e tre i livelli senza aprire un progetto vero.
             * Mai scritte in un template, mai passate all'export reale. */
            const ETICHETTE_INDICE_ANTEPRIMA_DEFAULT = [
                '1. Introduzione',
                '2. Prove penetrometriche eseguite',
                '2.1 Attrezzatura e modalità esecutive',
                '2.1.1 Correlazioni geotecniche adottate'
            ];
            const LIVELLI_INDICE_ANTEPRIMA = [1, 1, 2, 3];
            const PAGINE_INDICE_ANTEPRIMA = [3, 5, 5, 7];
            /** Le etichette sono riscrivibili (richiesto esplicitamente: provare la veste con i
             * propri titoli veri, lunghi quanto i propri). Vivono in state.settings e NON nel
             * template: sono una preferenza di chi guarda, non un dato che deve finire nei backup
             * dei template né tantomeno nel PDF. */
            function etichetteIndiceAnteprima() {
                const salvate = state.settings && state.settings.righeIndiceAnteprima;
                return ETICHETTE_INDICE_ANTEPRIMA_DEFAULT.map((def, i) => {
                    const v = Array.isArray(salvate) ? salvate[i] : null;
                    return (typeof v === 'string' && v.trim()) ? v : def;
                });
            }
            function righeIndiceAnteprima() {
                return etichetteIndiceAnteprima().map((etichetta, i) => ({
                    etichetta, livello: LIVELLI_INDICE_ANTEPRIMA[i], id: 'anteprima-' + (i + 1), pagina: PAGINE_INDICE_ANTEPRIMA[i]
                }));
            }
            /** Ridisegna l'anteprima nell'iframe usando la STESSA identica funzione dell'export
             * vero (buildIndiceReportCompletoHtml) — mai una seconda implementazione dello stile
             * che potrebbe raccontare una storia diversa da quella reale. */
            function aggiornaAnteprimaIndicePersonalizza() {
                const iframe = document.getElementById('idxPersPreview');
                if (!iframe || !indicePersStato) return;
                // Il "name" qui non compare più da nessuna parte nel disegno (il sottotitolo col
                // nome del progetto è stato tolto ovunque, anteprima ed export reale insieme — vedi
                // buildIndiceReportCompletoHtml), ma il parametro resta obbligatorio nella firma.
                const corpo = buildIndiceReportCompletoHtml({ name: '' }, righeIndiceAnteprima(), indicePersStato);
                // Iframe ora già alle dimensioni reali di una pagina A4 (794x1123px, 96dpi): la
                // pagina rende a grandezza naturale, lo zoom della schermata scala il contenitore
                // esterno (idxPersPreviewScaleOuter/Wrap), non questo documento interno.
                iframe.srcdoc = `<!doctype html><html><head><meta charset="utf-8"><style>${getReportPrintStyleBlock()}
                    body { margin:0; background:#fff; }
                    .dpsh-sheet { margin:0; box-shadow:none; }
                    /* Le righe restano vere <a href> (necessario per il PDF reale) ma qui, in
                       anteprima, non devono essere cliccabili — richiesto esplicitamente dopo un
                       bug per cui il click ci mandava altrove nell'app. */
                    .dpsh-sheet a { pointer-events: none; }
                </style></head><body>${corpo}</body></html>`;
            }

            function renderModalPersonalizzaIndice() {
                if (!idxPersControlli || !indicePersStato) return;
                const st = indicePersStato;
                // Alcuni interruttori (numerazione, numero di pagina) fanno ridisegnare tutto il
                // pannello per far comparire/sparire i controlli dedicati: senza questo, ogni volta
                // la colonna tornerebbe in cima e l'interruttore appena toccato sparirebbe da sotto
                // il dito.
                const scrollPrec = idxPersControlli.scrollTop;
                /** Intestazione pieghevole di un livello: da chiusa mostra comunque il riassunto
                 * (dimensione e peso), così si sa cosa c'è dentro senza aprirla. */
                const intestazioneLivello = (chiave, etichetta, cfg) => {
                    const aperto = idxPersLivelliAperti[chiave];
                    const riassunto = `${String(cfg.pt).replace('.0', '')}pt · ${cfg.peso >= 700 ? 'grassetto' : 'normale'}${cfg.corsivo ? ' · corsivo' : ''}`;
                    return `<button type="button" class="tpl-editor-menu-sottosezione idx-pers-livello" data-livello="${chiave}" style="width:100%; background:none; border:none; padding:0; cursor:pointer; justify-content:space-between; text-align:left; font-family:inherit;">
                        <span>${etichetta}</span>
                        <span style="display:flex; align-items:center; gap:6px; text-transform:none; letter-spacing:0; font-size:9px; font-weight:700; color:var(--text-muted);">${aperto ? '' : riassunto}<svg class="ico" style="width:12px; height:12px; transform:rotate(${aperto ? 180 : 0}deg);"><use href="#i-chevron-down"/></svg></span>
                    </button>`;
                };
                const bottoneDivisore = (val, etichetta, svg) => `<button type="button" class="tpl-editor-menu-btn" data-action="idx-divisore" data-valore="${val}" style="flex:1; flex-direction:column; gap:3px; padding:6px 2px; background:${st.divisore === val ? 'var(--accent)' : 'var(--bg-main)'}; color:${st.divisore === val ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${st.divisore === val ? 'var(--accent)' : 'var(--border)'};"><svg viewBox="0 0 24 12" fill="none" stroke="currentColor" stroke-width="1.8" style="width:22px; height:11px;">${svg}</svg><span style="font-size:8.5px; font-weight:800;">${etichetta}</span></button>`;
                idxPersControlli.innerHTML = `
                    <div class="tpl-editor-menu-section-label" style="margin-top:0;">Carattere</div>
                    <select id="idxPersFont" style="width:100%; padding:6px 7px; font-size:11.5px; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-main); color:var(--text-main);">
                        ${FONT_DOCUMENTO.map(f => `<option value="${f.id}" ${st.font === f.id ? 'selected' : ''}>${f.nome}</option>`).join('')}
                    </select>

                    <div class="tpl-editor-menu-sottosezione">Titolo della pagina</div>
                    <div class="tpl-editor-menu-gruppo">
                        <input type="text" id="idxPersTitoloTesto" value="${(st.titoloTesto || 'Indice').replace(/"/g, '&quot;')}" placeholder="Indice" style="width:100%; padding:7px 8px; font-size:12.5px; font-weight:700; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-main); color:var(--text-main);">
                        ${htmlControlloNumerico({ azione: 'idx-titolo-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.titolo.pt, min: 14, max: 32, notaMin: '14pt', notaMax: '32pt' })}
                        ${htmlInterruttore({ azione: 'idx-titolo-grassetto', etichetta: 'Peso', attivo: st.titolo.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                    </div>

                    <div class="tpl-editor-menu-section-label">Colore</div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        <div style="display:flex; align-items:center; justify-content:space-between;">
                            <span style="font-size:11.5px; font-weight:700; color:var(--text-main);">Testo</span>
                            <input type="color" data-action="idx-colore-testo" value="${st.coloreTesto}" style="width:38px; height:26px; padding:0; border:1px solid var(--border); border-radius:5px; background:var(--bg-main); cursor:pointer;">
                        </div>
                        <div style="display:flex; align-items:center; justify-content:space-between;">
                            <span style="font-size:11.5px; font-weight:700; color:var(--text-main);">Divisore</span>
                            <input type="color" data-action="idx-colore-divisore" value="${st.coloreDivisore}" style="width:38px; height:26px; padding:0; border:1px solid var(--border); border-radius:5px; background:var(--bg-main); cursor:pointer;">
                        </div>
                        <button type="button" data-action="idx-colori-reset" class="btn-action" style="width:100%; font-size:10.5px; font-weight:800; padding:6px 8px; display:flex; align-items:center; justify-content:center; gap:5px;"><svg class="ico" style="width:12px; height:12px;"><use href="#i-undo"/></svg> Ripristina colori</button>
                    </div>

                    ${intestazioneLivello('h1', 'Titolo (H1)', st.livelli.h1)}
                    ${idxPersLivelliAperti.h1 ? `<div class="tpl-editor-menu-gruppo">
                        ${htmlControlloNumerico({ azione: 'idx-h1-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.livelli.h1.pt, min: 9, max: 20, notaMin: '9pt', notaMax: '20pt' })}
                        ${htmlControlloNumerico({ azione: 'idx-h1-rientro', etichetta: 'Rientro', unita: 'mm', valore: st.livelli.h1.rientroMm, min: 0, max: 20, notaMin: '0mm', notaMax: '20mm' })}
                        ${htmlInterruttore({ azione: 'idx-h1-grassetto', etichetta: 'Peso', attivo: st.livelli.h1.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                    </div>` : ''}

                    ${intestazioneLivello('h2', 'Livello 2 (H2)', st.livelli.h2)}
                    ${idxPersLivelliAperti.h2 ? `<div class="tpl-editor-menu-gruppo">
                        ${htmlControlloNumerico({ azione: 'idx-h2-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.livelli.h2.pt, min: 8, max: 18, notaMin: '8pt', notaMax: '18pt' })}
                        ${htmlControlloNumerico({ azione: 'idx-h2-rientro', etichetta: 'Rientro', unita: 'mm', valore: st.livelli.h2.rientroMm, min: 0, max: 25, notaMin: '0mm', notaMax: '25mm' })}
                        ${htmlInterruttore({ azione: 'idx-h2-grassetto', etichetta: 'Peso', attivo: st.livelli.h2.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                    </div>` : ''}

                    ${intestazioneLivello('h3', 'Livello 3 (H3)', st.livelli.h3)}
                    ${idxPersLivelliAperti.h3 ? `<div class="tpl-editor-menu-gruppo">
                        ${htmlControlloNumerico({ azione: 'idx-h3-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.livelli.h3.pt, min: 7, max: 16, notaMin: '7pt', notaMax: '16pt' })}
                        ${htmlControlloNumerico({ azione: 'idx-h3-rientro', etichetta: 'Rientro', unita: 'mm', valore: st.livelli.h3.rientroMm, min: 0, max: 30, notaMin: '0mm', notaMax: '30mm' })}
                        ${htmlInterruttore({ azione: 'idx-h3-grassetto', etichetta: 'Peso', attivo: st.livelli.h3.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                        ${htmlInterruttore({ azione: 'idx-h3-corsivo', etichetta: 'Stile', attivo: !!st.livelli.h3.corsivo, statoOn: 'corsivo', statoOff: 'diritto' })}
                    </div>` : ''}

                    <div class="tpl-editor-menu-section-label">Divisore</div>
                    <div style="display:grid; grid-template-columns:repeat(3, minmax(0, 1fr)); gap:4px;">
                        ${bottoneDivisore('punti', 'Puntini', '<path d="M2 6h1.5M6.5 6H8M10.5 6H12M14.5 6H16M18.5 6H20M22 6h.01"/>')}
                        ${bottoneDivisore('puntiRadi', 'Radi', '<path d="M2 6h.01M7 6h.01M12 6h.01M17 6h.01M22 6h.01"/>')}
                        ${bottoneDivisore('trattini', 'Trattini', '<path d="M2 6h4M9 6h4M16 6h4"/>')}
                        ${bottoneDivisore('linea', 'Linea', '<path d="M2 6h20"/>')}
                        ${bottoneDivisore('lineaTutti', 'Righe', '<path d="M2 3h20M2 9h20"/>')}
                        ${bottoneDivisore('colonna', 'Colonna', '<path d="M2 6h9"/><path d="M18 2v8" opacity=".55"/>')}
                        ${bottoneDivisore('nessuna', 'Nessuna', '<path d="M2 6h20" stroke-dasharray="2 2" opacity=".4"/>')}
                    </div>

                    <div class="tpl-editor-menu-section-label">Pagine</div>
                    ${htmlInterruttore({ azione: 'idx-mostra-pagina', etichetta: 'Numero di pagina', attivo: !!st.mostraPagina, statoOn: 'visibile', statoOff: 'nascosto' })}
                    ${st.mostraPagina ? `
                        <div class="tpl-editor-menu-gruppo" style="margin-top:6px;">
                            ${htmlControlloNumerico({ azione: 'idx-pagina-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.pagina.pt, min: 7, max: 18, notaMin: '7pt', notaMax: '18pt' })}
                            ${htmlInterruttore({ azione: 'idx-pagina-grassetto', etichetta: 'Peso', attivo: st.pagina.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                        </div>
                    ` : ''}

                    <!-- La numerazione vive QUI, accanto alle righe (richiesto esplicitamente:
                         "spostato nella zona contestuale alla propria funzione"): i numeri che
                         accende o spegne sono esattamente quelli che si vedono scritti nei campi
                         qui sotto. Resta però un'impostazione VERA del template, non dell'anteprima
                         — per questo ha una sua sottosezione e la nota "solo per questa anteprima"
                         sta più in basso, attaccata ai soli campi di testo. -->
                    <div class="tpl-editor-menu-section-label">Righe di prova</div>
                    <div class="tpl-editor-menu-sottosezione" style="margin-top:2px;">Numerazione capitoli</div>
                    <div class="tpl-editor-menu-gruppo">
                        ${htmlInterruttore({ azione: 'idx-gutter', etichetta: 'Mostra numerazione', attivo: !!st.gutter, statoOn: 'attiva (1 / 2.1 / 2.1.1)', statoOff: 'disattivata' })}
                        ${st.gutter ? `
                            ${htmlControlloNumerico({ azione: 'idx-numero-pt', etichetta: 'Dimensione', unita: 'pt', decimali: 1, passo: 0.5, valore: st.numero.pt, min: 7, max: 18, notaMin: '7pt', notaMax: '18pt' })}
                            ${htmlInterruttore({ azione: 'idx-numero-grassetto', etichetta: 'Peso', attivo: st.numero.peso >= 700, statoOn: 'grassetto', statoOff: 'normale' })}
                        ` : ''}
                    </div>
                    <div style="font-size:9.5px; color:var(--text-muted); line-height:1.4; margin:9px 0 7px;">I titoli qui sotto valgono solo per questa anteprima: scrivi i tuoi veri per vedere come reggono. Non finiscono mai nel PDF.</div>
                    <div class="tpl-editor-menu-gruppo">
                        ${etichetteIndiceAnteprima().map((et, i) => `
                            <div style="display:flex; align-items:center; gap:6px;">
                                <span style="font-size:9px; font-weight:800; color:var(--accent-ink); flex-shrink:0; width:16px;">H${LIVELLI_INDICE_ANTEPRIMA[i]}</span>
                                <input type="text" data-action="idx-riga-prova" data-indice="${i}" value="${et.replace(/"/g, '&quot;')}" style="flex:1; min-width:0; padding:5px 7px; font-size:11px; border-radius:var(--radius-sm); border:1px solid var(--border); background:var(--bg-main); color:var(--text-main);">
                            </div>
                        `).join('')}
                    </div>
                `;

                const font = idxPersControlli.querySelector('#idxPersFont');
                if (font) font.addEventListener('change', () => { st.font = font.value; aggiornaAnteprimaIndicePersonalizza(); });

                idxPersControlli.querySelectorAll('.idx-pers-livello').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const ch = btn.dataset.livello;
                        idxPersLivelliAperti[ch] = !idxPersLivelliAperti[ch];
                        renderModalPersonalizzaIndice();
                    });
                });

                idxPersControlli.querySelectorAll('[data-action="idx-divisore"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        st.divisore = btn.dataset.valore;
                        renderModalPersonalizzaIndice();
                        aggiornaAnteprimaIndicePersonalizza();
                    });
                });

                // anteprima E commit sono la STESSA funzione leggera: qui, a differenza del menu
                // blocco (dove "anteprima" deve toccare solo il DOM per non ricostruire l'elemento
                // sotto il dito), l'unica cosa che si aggiorna è l'iframe di anteprima — riscriverlo
                // ad ogni tick di trascinamento è già l'aggiornamento "leggero" giusto, richiesto
                // esplicitamente ("quando uso uno slider, la modifica dev'essere in tempo reale").
                const collegaLivello = (chiave, campo, azione, scala) => {
                    const applica = v => { st.livelli[chiave][campo] = scala ? scala(v) : v; aggiornaAnteprimaIndicePersonalizza(); };
                    collegaControlloNumerico(idxPersControlli, azione, { anteprima: applica, commit: applica });
                };
                collegaLivello('h1', 'pt', 'idx-h1-pt');
                collegaLivello('h1', 'rientroMm', 'idx-h1-rientro');
                collegaLivello('h2', 'pt', 'idx-h2-pt');
                collegaLivello('h2', 'rientroMm', 'idx-h2-rientro');
                collegaLivello('h3', 'pt', 'idx-h3-pt');
                collegaLivello('h3', 'rientroMm', 'idx-h3-rientro');

                collegaControlloNumerico(idxPersControlli, 'idx-titolo-pt', {
                    anteprima: v => { st.titolo.pt = v; aggiornaAnteprimaIndicePersonalizza(); },
                    commit: v => { st.titolo.pt = v; aggiornaAnteprimaIndicePersonalizza(); }
                });
                if (st.mostraPagina) {
                    collegaControlloNumerico(idxPersControlli, 'idx-pagina-pt', {
                        anteprima: v => { st.pagina.pt = v; aggiornaAnteprimaIndicePersonalizza(); },
                        commit: v => { st.pagina.pt = v; aggiornaAnteprimaIndicePersonalizza(); }
                    });
                }
                if (st.gutter) {
                    collegaControlloNumerico(idxPersControlli, 'idx-numero-pt', {
                        anteprima: v => { st.numero.pt = v; aggiornaAnteprimaIndicePersonalizza(); },
                        commit: v => { st.numero.pt = v; aggiornaAnteprimaIndicePersonalizza(); }
                    });
                }

                const interruttorePeso = (chiave, azione) => {
                    const input = idxPersControlli.querySelector(`input[data-action="${azione}"]`);
                    if (!input) return;
                    input.addEventListener('change', () => {
                        st.livelli[chiave].peso = input.checked ? 700 : 400;
                        aggiornaAnteprimaIndicePersonalizza();
                    });
                };
                interruttorePeso('h1', 'idx-h1-grassetto');
                interruttorePeso('h2', 'idx-h2-grassetto');
                interruttorePeso('h3', 'idx-h3-grassetto');
                const chkCorsivo = idxPersControlli.querySelector('input[data-action="idx-h3-corsivo"]');
                if (chkCorsivo) chkCorsivo.addEventListener('change', () => { st.livelli.h3.corsivo = chkCorsivo.checked; aggiornaAnteprimaIndicePersonalizza(); });
                // Come per la numerazione: spegnere il numero di pagina fa sparire anche i suoi
                // controlli di misura, che senza numero non regolerebbero nulla.
                const chkPagina = idxPersControlli.querySelector('input[data-action="idx-mostra-pagina"]');
                if (chkPagina) chkPagina.addEventListener('change', () => {
                    st.mostraPagina = chkPagina.checked;
                    renderModalPersonalizzaIndice();
                    aggiornaAnteprimaIndicePersonalizza();
                });
                const chkPaginaGrassetto = idxPersControlli.querySelector('input[data-action="idx-pagina-grassetto"]');
                if (chkPaginaGrassetto) chkPaginaGrassetto.addEventListener('change', () => { st.pagina.peso = chkPaginaGrassetto.checked ? 700 : 400; aggiornaAnteprimaIndicePersonalizza(); });
                const inputTitoloTesto = idxPersControlli.querySelector('#idxPersTitoloTesto');
                if (inputTitoloTesto) inputTitoloTesto.addEventListener('input', () => { st.titoloTesto = inputTitoloTesto.value; aggiornaAnteprimaIndicePersonalizza(); });
                // Righe di prova: preferenza di chi guarda, salvata subito in state.settings —
                // non è roba del template, quindi non aspetta il "Salva" del template.
                idxPersControlli.querySelectorAll('input[data-action="idx-riga-prova"]').forEach(inp => {
                    inp.addEventListener('input', () => {
                        if (!state.settings) state.settings = {};
                        const attuali = etichetteIndiceAnteprima();
                        attuali[Number(inp.dataset.indice)] = inp.value;
                        state.settings.righeIndiceAnteprima = attuali;
                        saveState();
                        aggiornaAnteprimaIndicePersonalizza();
                    });
                });
                const btnResetColori = idxPersControlli.querySelector('[data-action="idx-colori-reset"]');
                if (btnResetColori) btnResetColori.addEventListener('click', () => {
                    const dif = stileIndiceDiDefault();
                    st.coloreTesto = dif.coloreTesto;
                    st.coloreDivisore = dif.coloreDivisore;
                    renderModalPersonalizzaIndice();
                    aggiornaAnteprimaIndicePersonalizza();
                });
                const chkTitoloGrassetto = idxPersControlli.querySelector('input[data-action="idx-titolo-grassetto"]');
                if (chkTitoloGrassetto) chkTitoloGrassetto.addEventListener('change', () => { st.titolo.peso = chkTitoloGrassetto.checked ? 700 : 400; aggiornaAnteprimaIndicePersonalizza(); });
                const chkNumeroGrassetto = idxPersControlli.querySelector('input[data-action="idx-numero-grassetto"]');
                if (chkNumeroGrassetto) chkNumeroGrassetto.addEventListener('change', () => { st.numero.peso = chkNumeroGrassetto.checked ? 700 : 400; aggiornaAnteprimaIndicePersonalizza(); });
                // Attivare/disattivare la numerazione ridisegna l'intero pannello: è l'unico modo
                // per far comparire/sparire il gruppo Dimensione+Peso dedicato (de-collassato solo
                // quando serve, richiesto esplicitamente).
                const chkGutter = idxPersControlli.querySelector('input[data-action="idx-gutter"]');
                if (chkGutter) chkGutter.addEventListener('change', () => {
                    st.gutter = chkGutter.checked;
                    renderModalPersonalizzaIndice();
                    aggiornaAnteprimaIndicePersonalizza();
                });
                const inputColoreTesto = idxPersControlli.querySelector('input[data-action="idx-colore-testo"]');
                if (inputColoreTesto) inputColoreTesto.addEventListener('input', () => { st.coloreTesto = inputColoreTesto.value; aggiornaAnteprimaIndicePersonalizza(); });
                const inputColoreDivisore = idxPersControlli.querySelector('input[data-action="idx-colore-divisore"]');
                if (inputColoreDivisore) inputColoreDivisore.addEventListener('input', () => { st.coloreDivisore = inputColoreDivisore.value; aggiornaAnteprimaIndicePersonalizza(); });

                idxPersControlli.scrollTop = scrollPrec;
                aggiornaAnteprimaIndicePersonalizza();
            }
            // ===================== FINE MODAL "PERSONALIZZA INDICE" =====================

            /** Sincronizza silenziosamente nello stato persistito (state.reportTemplates) le
             * modifiche fatte nell'editor del template ma non ancora salvate con "Salva Template" —
             * causa REALE del bug segnalato con screenshot a confronto ("perché non usi lo stesso
             * motore di rendering!?"). Verificato riga per riga: la formula di scala/font che
             * genera lo stile di un blocco è GIÀ identica byte per byte tra editor (styleInner in
             * costruisciHtmlBloccoEditor) e stampa (styleScala in buildContenutoVoceStampa) — non
             * esistono due motori diversi da unificare, ce n'è già uno solo. La differenza reale
             * stava altrove: l'editor mostra sempre templateEditorState, la bozza LIVE (comprese le
             * modifiche non ancora salvate), mentre l'export leggeva SEMPRE E SOLO
             * state.reportTemplates, cioè l'ultimo salvataggio — se si tocca una maniglia
             * nell'editor e si genera un export senza aver premuto prima "Salva Template", l'export
             * si basava silenziosamente sulla versione vecchia (margini/altezza riga/font diversi),
             * senza alcun avviso. Chiamata all'inizio di ogni export (sotto), chiude il buco alla
             * radice: non serve più ricordarsi di salvare, l'export prende sempre lo stato più
             * recente dell'editor, se aperto. A differenza di salvaTemplateEditor() questa versione
             * NON chiude l'editor, NON mostra alert per pagine vuote (in quel caso salta
             * silenziosamente: l'export userà l'ultimo salvataggio valido invece di essere
             * interrotto da un popup fuori contesto) e NON tocca le liste UI dei template. */
            function sincronizzaTemplateEditorConStatoSalvato() {
                try {
                    if (!templateEditorState || !templateEditorState.templateId) return;
                    const tpl = state.reportTemplates[templateEditorState.templateId];
                    if (!tpl) return;
                    const paginaVuota = templateEditorState.pages.some(p => !p.continuaBloccoId && (!p.rows || p.rows.length === 0));
                    if (paginaVuota) return;
                    tpl.pages = JSON.parse(JSON.stringify(templateEditorState.pages.filter(p => !p.continuaBloccoId)));
                    tpl.margins = Object.assign({}, templateEditorState.margins);
                    tpl.footerShowPageNumber = !!templateEditorState.footerShowPageNumber;
                    tpl.stileTesto = Object.assign(stileTestoDiDefault(), templateEditorState.stileTesto || {});
                    tpl.headerEnabled = !!templateEditorState.headerEnabled;
                    tpl.headerTutte = !!templateEditorState.headerTutte;
                    tpl.footerEnabled = !!templateEditorState.footerEnabled;
                    saveState();
                    // Aggiorna anche lo snapshot "salvato" dell'editor: se l'utente ci torna dopo
                    // l'export non deve trovarsi un falso avviso "modifiche non salvate" per un
                    // salvataggio già avvenuto qui.
                    templateEditorState.savedSnapshot = istantaneaTemplate();
                } catch (e) { /* mai bloccare l'export per un errore qui: nel dubbio resta l'ultimo salvataggio valido */ }
            }

            /** Orchestratore della generazione vera e propria.
             *
             * La SECONDA SCHEDA È STATA RIMOSSA del tutto. Storia in breve: nasceva dal vincolo dei
             * browser, che bloccano i popup non aperti da un gesto utente sincrono — per questo
             * andava aperta come primissima istruzione, prima di qualunque await, e conteneva una
             * schermata di attesa con spinner e barra. Poi si è scoperto (segnalato dall'uso reale
             * nella versione APK) che dentro una WebView Android quella scheda non compare affatto:
             * il documento veniva costruito bene ma finiva in una finestra invisibile, e il PDF non
             * si poteva né vedere né salvare. Da lì il passaggio alla stampa da IFRAME NASCOSTO in
             * questa stessa pagina, che non dipende da popup né permessi.
             *
             * A quel punto la seconda scheda non serviva più a niente: mostrava solo un avanzamento
             * che la modale in primo piano già mostra, con lo stesso identico dato. Tenerla avrebbe
             * significato mantenere una schermata duplicata, un vincolo sull'ordine delle istruzioni
             * e un messaggio d'errore sui popup, tutto per una finestra che nell'uso reale non si
             * apre. Rimossa: resta un solo percorso, uguale su APK e su desktop. */
            async function avviaGenerazioneEsportazionePdf() {
                if (!esportaPdfContext) return;
                sincronizzaTemplateEditorConStatoSalvato();

                const selezionate = elencoProveSelezionateEsportazionePdf();
                if (selezionate.length === 0) {
                    alert('Seleziona almeno una prova da esportare.');
                    return;
                }

                const includiIndiceScelto = !!(chkEsportaPdfIndice && chkEsportaPdfIndice.checked);
                const numeraPagineScelto = !!(chkEsportaPdfNumeriPagina && chkEsportaPdfNumeriPagina.checked);
                const qualitaScelta = rangeEsportaPdfQualita ? parseInt(rangeEsportaPdfQualita.value, 10) / 100 : impostazioniEsportazionePdf.qualitaJpeg;
                impostazioniEsportazionePdf.qualitaJpeg = qualitaScelta;
                impostazioniEsportazionePdf.includiIndice = includiIndiceScelto;
                impostazioniEsportazionePdf.numeraPagine = numeraPagineScelto;

                if (esportaPdfBodyOpzioni) esportaPdfBodyOpzioni.style.display = 'none';
                if (esportaPdfBodyProgresso) esportaPdfBodyProgresso.style.display = 'block';
                if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Preparazione...';
                if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = '0%';
                if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = '';

                // Un solo posto in cui mostrare l'avanzamento: la modale qui davanti. La copia che
                // veniva scritta anche nella scheda popup è sparita insieme alla scheda stessa
                // (vedi il commento sopra la funzione) — era la stessa percentuale, calcolata una
                // volta e stampata in due punti.
                const onProgress = (i, totale) => {
                    const pct = Math.round((i / totale) * 100);
                    if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = pct + '%';
                    if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = `Elaborazione prova ${i} di ${totale}...`;
                    if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = 'Compressione foto e impaginazione in corso';
                };

                try {
                    // testoBottoneStampa rimossa: serviva solo all'etichetta del bottone giallo
                    // dentro il documento, sparito insieme alla seconda scheda (vedi sotto).
                    let titolo, pagesHtml, marginiStampa;

                    if (esportaPdfContext.type === 'survey') {
                        onProgress(0, 1);
                        const result = await buildSelezioneReportHtml([state], null, { includiIndice: false }, onProgress);
                        pagesHtml = result.pagesHtml;
                        const comuneStr = state.header?.comune || 'DPSH';
                        titolo = `Report DPSH Prova ${state.header?.provaNr || '1'} - ${comuneStr}`;
                        const tplAttivo = state.reportTemplates[getReportTemplateIdPerProva(state)];
                        marginiStampa = tplAttivo && tplAttivo.margins;
                    } else {
                        // Ambito progetto: sempre Report Completo — la spunta "Includi tabelle
                        // Parametri Avanzati" è stata rimossa (richiesto esplicitamente), quindi non
                        // esiste più il ramo alternativo "solo scheda di campo". NOTA: questo non
                        // fa MAI comparire tabelle Riepilogo/Dettagliata/Allegato automatiche —
                        // quella sezione automatica era già stata eliminata del tutto in una fase
                        // precedente (vedi il commento in buildCompleteReportHtml qui sotto): quelle
                        // tabelle compaiono SOLO se l'utente le piazza come blocco nel template
                        // della prova, mai altrimenti. La spunta rimossa distingueva solo l'indice/
                        // numerazione del "Report Completo" dalla vecchia "Report Progetto", non le
                        // tabelle Parametri Avanzati.
                        const proj = state.projects[esportaPdfContext.id];
                        onProgress(0, selezionate.length);
                        const projEsp = state.projects[esportaPdfContext.id];
                        const result = await buildCompleteReportHtml(esportaPdfContext.id, {
                            survIds: selezionate.map(s => s.id),
                            includiIndice: includiIndiceScelto,
                            numeraPagine: numeraPagineScelto,
                            includiIntroduzione: !!(projEsp && projEsp.introduzione && projEsp.introduzione.attiva),
                            includiTavole: !!(projEsp && projEsp.tavole3d && projEsp.tavole3d.nelReport && datiTavoleReport(projEsp)),
                            onAvanzamento: (testo) => { if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = testo; }
                        });
                        if (!result) {
                            alert('Nessuna prova presente nel progetto da esportare.');
                            chiudiEsportazionePdfModal();
                            return;
                        }
                        pagesHtml = result.pagesHtml;
                        titolo = `Report Completo ${proj.name || proj.comune} (${selezionate.length} Prove)`;
                        marginiStampa = null;
                        if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Impaginazione completata...';
                        if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = '95%';
                    }

                    // Contatore di utilizzo per l'esportazione (richiesto esplicitamente, mostrato
                    // nella lista dei template): un incremento per ogni TEMPLATE DISTINTO coinvolto
                    // in questa esportazione, non uno per prova — esportare 10 prove che usano tutte
                    // lo stesso template conta come UN utilizzo di quel template, non dieci. Le prove
                    // in "selezionate" (vedi elencoProveSelezionateEsportazionePdf) sono già gli
                    // oggetti prova veri, ognuno con il proprio reportTemplateId.
                    const templateIdsUsatiEsportazione = new Set(selezionate.map(s => getReportTemplateIdPerProva(s)));
                    templateIdsUsatiEsportazione.forEach(tid => {
                        const t = state.reportTemplates[tid];
                        if (t) t.exportCount = (t.exportCount || 0) + 1;
                    });
                    saveState();

                    // Lo stile del testo del template che sta producendo questo report: e' il
                    // dato che decide carattere, corpo e interlinea del PDF. Si legge dal template
                    // in uso sulla prova, non da una copia — cosi' cambiare stile e ristampare da'
                    // davvero il documento nuovo.
                    const tplStampa = state.reportTemplates && state.reportTemplates[state.reportTemplateId || 'classico'];
                    const stileTestoStampa = stileTestoDelTemplate(tplStampa);

                    const fullDoc = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>${titolo}</title>
    <style>${getReportPrintStyleBlock(marginiStampa, stileTestoStampa)}</style>
</head>
<body>
    ${getIconSpriteHtml()}
    <!-- La barra dei comandi vive FUORI dalla pila dei fogli (prima era dentro .a4-page insieme
         alle pagine): la pila deve contenere SOLO fogli veri, altrimenti la regola strutturale
         .dpsh-sheet:last-child — quella che impedisce il foglio bianco finale — ragionerebbe su un
         elemento che non è una pagina. È comunque .no-print, quindi non compare mai nel PDF. -->
    <!-- Il bottone giallo "Stampa / Salva in PDF" è stato RIMOSSO insieme alla seconda scheda:
         era il ripiego per quando la stampa automatica non partiva, ma viveva DENTRO il documento
         e ora quel documento sta in un iframe fuori schermo, dove nessuno potrebbe mai vederlo né
         toccarlo. Un comando irraggiungibile è peggio di un comando assente, perché lascia credere
         che una via d'uscita esista. Se la stampa non parte, la via d'uscita vera è il bottone
         "PDF da immagine" dentro l'anteprima 🖨️, che è nella pagina principale e si può cliccare. -->
    <!-- Contenitore neutro: nessun padding/larghezza propri. I margini del template ora vivono
         dentro ogni singolo foglio (.dpsh-sheet), non più in un wrapper condiviso + @page — è
         proprio quella doppia sorgente di margini a rendere possibile lo sfasamento di pochi mm
         da cui nascevano le pagine bianche. -->
    <div class="dpsh-sheet-stack">${pagesHtml}</div>
    ${esportaPdfContext.formato === 'word' ? '' : getControlloImpaginazioneScriptTag(true)}
</body>
</html>`;

                    // STAMPA DA IFRAME NASCOSTO, NON PIÙ DALLA SECONDA SCHEDA (segnalato: nella
                    // versione APK "carica ma poi non si apre nessuna pagina secondaria").
                    // Dentro una WebView Android window.open() non apre una scheda visibile: il
                    // documento veniva costruito correttamente ma finiva in una finestra che
                    // l'utente non vedeva mai, quindi il PDF non si poteva né vedere né salvare.
                    // Un iframe vive nella STESSA pagina, quindi non dipende da popup, schede o
                    // permessi: il documento ci viene scritto dentro e lo script già presente in
                    // fondo al documento (getControlloImpaginazioneScriptTag(true)) chiama da sé
                    // window.print() quando tutto è caricato — su Android si apre direttamente il
                    // pannello di stampa del sistema, da cui "Salva come PDF". Nessuna seconda
                    // pagina da attraversare, come richiesto.
                    // WORD: lo stesso identico documento, che invece di andare in stampa diventa un
                    // .docx (vedi 071i). Niente controllo di stampa dentro: non si stampa niente.
                    if (esportaPdfContext.formato === 'word') {
                        const risultato = await documentoStampaInDocx(fullDoc, {
                            qualitaJpeg: qualitaScelta,
                            titolo,
                            onAvanzamento: (testo, quota) => {
                                if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = testo;
                                if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = (95 + Math.round(quota * 5)) + '%';
                            }
                        });
                        scaricaBlobFile(risultato.blob, titolo.replace(/[\\/:*?"<>|]+/g, '').replace(/\s+/g, '_') + '.docx');
                        if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = '100%';
                        if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Completato';
                        if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = `${risultato.pagine} pagine in Word`;
                        if (risultato.mancanti > 0) {
                            await appDialog(`${risultato.mancanti} riquadr${risultato.mancanti === 1 ? 'o' : 'i'} di mappa non si sono scaricati: nel Word quella parte della mappa resta vuota. Se sei senza rete riprova più tardi.`, { title: 'Mappe incomplete' });
                        }
                        setTimeout(chiudiEsportazionePdfModal, 900);
                        return;
                    }

                    const vecchioIframeStampa = document.getElementById('iframeStampaReport');
                    if (vecchioIframeStampa) vecchioIframeStampa.remove();
                    const iframeStampa = document.createElement('iframe');
                    iframeStampa.id = 'iframeStampaReport';
                    // Non display:none: alcune WebView non stampano un iframe non renderizzato.
                    // Fuori schermo ma "vivo" è il compromesso che funziona ovunque.
                    iframeStampa.style.cssText = 'position:fixed; left:-10000px; top:0; width:210mm; height:297mm; border:0; visibility:hidden;';
                    document.body.appendChild(iframeStampa);

                    // Peso reale del documento HTML generato (base64 → byte): non è il peso finale
                    // esatto del PDF (dipende dal motore di stampa del browser), ma è la stima più
                    // vicina possibile senza generare davvero il PDF — dominata dalle foto, che sono
                    // già state ricompresse alla qualità scelta a questo punto.
                    const pesoReale = formattaBytesEsportazione(Math.round(fullDoc.length * 0.75));

                    /* ============ CHI ASPETTA, E CHI DECIDE, STANNO QUI ============
                     * SEGNALATO: «salta l'export dopo il caricamento, non viene prodotto il pdf».
                     * Il documento da stampare vive in un iframe FUORI SCHERMO e invisibile. Ci si
                     * era però lasciata dentro tutta l'interfaccia d'attesa: il velo «Scarico le
                     * mappe…» e — peggio — la scelta «Stampa comunque / Riprova a caricarle», con
                     * due pulsanti veri. Veri e irraggiungibili: nessuno può cliccare qualcosa che
                     * sta a -10000px con visibility:hidden. Bastava UNA tessera di mappa non
                     * arrivata (rete lenta, servizio giù, http bloccato su pagina https) perché
                     * l'export finisse in un'attesa senza fine, mentre qui davanti la modale
                     * annunciava «Completato» e si chiudeva. Il PDF non arrivava mai e non c'era
                     * niente da leggere.
                     *
                     * Ora la cornice non decide e non disegna più niente: CONTA le tessere e
                     * riferisce quaggiù. L'attesa si vede nella modale che l'utente sta già
                     * guardando, la scelta è un dialogo dell'app, e la stampa parte da qui.
                     *
                     * In più una rete di sicurezza che prima non esisteva: se la cornice non
                     * riferisce entro 30 secondi — script bloccato, errore, qualunque motivo —
                     * si stampa lo stesso. Un export può uscire imperfetto; non può sparire. */
                    let stampaGiaPartita = false;
                    let reteDiSicurezzaStampa = null;
                    const stampaOra = () => {
                        if (stampaGiaPartita) return;
                        stampaGiaPartita = true;
                        clearTimeout(reteDiSicurezzaStampa);
                        if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = '100%';
                        if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Completato';
                        if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = `Si apre il pannello di stampa: scegli "Salva come PDF" · dimensione stimata ${pesoReale}`;
                        // print() sulla finestra della cornice, chiamato da qui: è la stessa cosa
                        // che faceva lo script dentro il documento, ma se lì dentro qualcosa va
                        // storto (come è successo) qui ce ne accorgiamo e c'è il ripiego.
                        try { iframeStampa.contentWindow.focus(); } catch (e) { /* niente focus: si stampa lo stesso */ }
                        try { iframeStampa.contentWindow.print(); } catch (e) {
                            try { window.print(); } catch (e2) {
                                alert('Il browser non ha aperto il pannello di stampa. Riprova, oppure usa l\'anteprima di stampa dall\'editor del layout.');
                            }
                        }
                        setTimeout(chiudiEsportazionePdfModal, 900);
                    };

                    window.__dpshStampaAvanzamento = (d) => {
                        if (stampaGiaPartita) return;
                        const fatte = (d && d.fatte) || 0, totali = (d && d.totali) || 0;
                        if (!totali) return;
                        if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Scarico le mappe…';
                        if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = `${fatte} di ${totali} riquadri · la stampa parte solo a riquadri pieni`;
                        if (barraEsportaPdfProgresso) barraEsportaPdfProgresso.style.width = (95 + Math.round(fatte / totali * 5)) + '%';
                    };

                    window.__dpshStampaPronta = async (d) => {
                        if (stampaGiaPartita) return;
                        // La cornice ha parlato: la rete di sicurezza ha finito il suo compito.
                        // Va spenta PRIMA di aprire un dialogo, altrimenti scadrebbe mentre
                        // l'utente sta leggendo e deciderebbe al posto suo — che è l'opposto del
                        // motivo per cui esiste (esiste per il silenzio, non per l'attesa).
                        clearTimeout(reteDiSicurezzaStampa);
                        const mancanti = (d && d.mancanti) || 0;
                        const totali = (d && d.totali) || 0;
                        const eccedenti = (d && d.eccedenti) || [];
                        // L'AVVISO DI SFORAMENTO TORNA VISIBILE. Il banner giallo esisteva già, ma
                        // veniva inserito dentro la cornice invisibile ed era per giunta .no-print:
                        // un avviso che nessuno poteva vedere né nel documento né sullo schermo.
                        if (eccedenti.length > 0) {
                            const vaiAvanti = await appDialog(
                                `In ${eccedenti.length} pagina/e (${eccedenti.join(', ')}) il contenuto è più alto dello spazio utile del foglio: la parte in eccesso verrà TAGLIATA nel PDF. Il numero di pagine resta quello del template, nessuna pagina bianca viene aggiunta.\n\nStampare comunque?`,
                                { confirm: true, title: 'Contenuto fuori dal foglio', okLabel: 'Stampa comunque', cancelLabel: 'Sistemo il layout' });
                            if (!vaiAvanti) { chiudiEsportazionePdfModal(); return; }
                        }
                        if (mancanti > 0) {
                            const vaiAvanti = await appDialog(
                                `${mancanti} riquadr${mancanti === 1 ? 'o' : 'i'} di mappa su ${totali} non si è caricato: nel PDF quella parte resterebbe vuota o incompleta. Se sei senza rete, o il servizio cartografico non risponde, conviene riprovare più tardi.\n\nStampare comunque?`,
                                { confirm: true, title: 'Mappe incomplete', okLabel: 'Stampa comunque', cancelLabel: 'Riprova a caricarle' });
                            if (!vaiAvanti) {
                                try {
                                    if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Riprovo a scaricare le mappe…';
                                    iframeStampa.contentWindow.__dpshRicaricaMappe();
                                    reteDiSicurezzaStampa = setTimeout(stampaOra, 30000);
                                } catch (e) { chiudiEsportazionePdfModal(); }
                                return;
                            }
                        }
                        stampaOra();
                    };

                    reteDiSicurezzaStampa = setTimeout(stampaOra, 30000);

                    // La scrittura viene DOPO l'aggancio dei due riferimenti qui sopra: lo script
                    // in fondo al documento può riferire già al primo giro di eventi.
                    const docIframe = iframeStampa.contentWindow.document;
                    docIframe.open();
                    docIframe.write(fullDoc);
                    docIframe.close();

                    if (lblEsportaPdfProgressoStato) lblEsportaPdfProgressoStato.textContent = 'Impaginazione completata…';
                    if (lblEsportaPdfProgressoDettaglio) lblEsportaPdfProgressoDettaglio.textContent = `Preparo la stampa · dimensione stimata ${pesoReale}`;
                } catch (e) {
                    alert('Errore durante la generazione del PDF: ' + e.message);
                    if (esportaPdfBodyOpzioni) esportaPdfBodyOpzioni.style.display = '';
                    if (esportaPdfBodyProgresso) esportaPdfBodyProgresso.style.display = 'none';
                }
            }

            if (btnEsportaPdfGenera) btnEsportaPdfGenera.addEventListener('click', avviaGenerazioneEsportazionePdf);

            // MODAL IMPORTAZIONE MASSIVA COLPI
            const modalBulkImportOverlay = document.getElementById('modalBulkImportOverlay');
            const modalBulkImport = document.getElementById('modalBulkImport');
            const txtBulkImportData = document.getElementById('txtBulkImportData');
            const lblBulkImportCount = document.getElementById('lblBulkImportCount');
            const lblBulkImportDepth = document.getElementById('lblBulkImportDepth');
            const btnCancelBulkImport = document.getElementById('btnCancelBulkImport');
            const btnConfirmBulkImport = document.getElementById('btnConfirmBulkImport');
            const btnCloseBulkImportX = document.getElementById('btnCloseBulkImportX');

            // La profondità di partenza dipende dalla modalità scelta: in coda si riparte da dove
            // sono arrivati gli intervalli già registrati, sostituendo invece si riparte da 0 —
            // perché la sostituzione cancella tutto prima di generare i nuovi intervalli.
            function getBulkImportStartDepth() {
                const selectedOpt = document.querySelector('input[name="optImportMode"]:checked');
                const mode = selectedOpt ? selectedOpt.value : 'append';
                return mode === 'replace' ? 0 : state.currentDepthStart;
            }

            function openBulkImportModal() {
                if (txtBulkImportData) txtBulkImportData.value = '';
                const defaultAppendOpt = document.querySelector('input[name="optImportMode"][value="append"]');
                if (defaultAppendOpt) defaultAppendOpt.checked = true;
                updateBulkImportCount();
                if (modalBulkImportOverlay) modalBulkImportOverlay.classList.add('open');
                if (modalBulkImport) modalBulkImport.classList.add('open');
                setTimeout(() => { if (txtBulkImportData) txtBulkImportData.focus(); }, 150);
            }

            function closeBulkImportModal() {
                if (modalBulkImportOverlay) modalBulkImportOverlay.classList.remove('open');
                if (modalBulkImport) modalBulkImport.classList.remove('open');
            }

            // Una riga con tabulazioni o «;» (Excel, CSV), o con quote decimali («0.20 4», «0,20 4»,
            // «0.00,0.20,4»), è una riga di tabella: i colpi sono l'ultima colonna e le quote non contano.
            // Le altre righe sono sequenze di colpi («5 8 12», «5, 8, 12», «5,8,12»). La prima riga senza
            // numeri è un'intestazione e si salta; ogni altro valore che non è un intero ≥ 0 si segnala
            // invece di sparire in silenzio.
            function parseBulkImportNumbers(text) {
                const numeri = [], scartati = [];
                let primaRiga = true;
                String(text || '').split(/\r?\n/).forEach((riga, i) => {
                    if (!riga.trim()) return;
                    let campi;
                    if (/[\t;]/.test(riga) || /\d\.\d/.test(riga) || (/\d,\d/.test(riga) && /\s/.test(riga.trim()))) {
                        campi = riga.split(/[\t;]|\s+/).filter(c => c.trim());
                        if (campi.length === 1) campi = campi[0].split(',');
                        campi = [campi.pop().trim()];
                    } else {
                        campi = riga.split(/[\s,]+/).filter(Boolean);
                    }
                    const intestazione = primaRiga && campi.every(c => !/\d/.test(c));
                    primaRiga = false;
                    if (intestazione) return;
                    campi.forEach(c => /^\d+$/.test(c) ? numeri.push(parseInt(c, 10)) : scartati.push({ riga: i + 1, testo: c }));
                });
                return { numeri, scartati };
            }

            function updateBulkImportCount() {
                if (!txtBulkImportData || !lblBulkImportCount) return;
                const { numeri: numbers, scartati } = parseBulkImportNumbers(txtBulkImportData.value);
                lblBulkImportCount.textContent = `${numbers.length} ${numbers.length === 1 ? 'intervallo' : 'intervalli'}`;
                const stepM = (state.settings.stepCm || 20) / 100;
                const startDepth = getBulkImportStartDepth();
                if (lblBulkImportDepth) lblBulkImportDepth.textContent = `${numeroConVirgola(startDepth)} → ${numeroConVirgola(startDepth + numbers.length * stepM)} m`;
                const anteprima = document.getElementById('anteprimaBulkImport');
                anteprima.innerHTML = scartati.map(s => `<div class="anteprima-scartato">Riga ${s.riga}: «${escapeHtmlDidascalia(s.testo)}» non è un numero di colpi</div>`).join('')
                    + numbers.map((n, i) => `<div><span>${numeroConVirgola(startDepth + i * stepM)}–${numeroConVirgola(startDepth + (i + 1) * stepM)} m</span><strong>${n}</strong></div>`).join('');
                btnConfirmBulkImport.disabled = !numbers.length || scartati.length > 0;
                btnConfirmBulkImport.innerHTML = `<svg class="ico"><use href="#i-list"/></svg> ${scartati.length ? 'Correggi le righe segnate' : (numbers.length ? 'Aggiungi ' + lblBulkImportCount.textContent : 'Aggiungi')}`;
            }

            if (txtBulkImportData) {
                txtBulkImportData.addEventListener('input', updateBulkImportCount);
            }

            // Cambiare modalità (in coda / sostituisci) cambia subito il punto di partenza usato
            // sopra, quindi la profondità raggiunta va ricalcolata anche al solo tocco del radio,
            // senza dover ritoccare il testo incollato.
            document.querySelectorAll('input[name="optImportMode"]').forEach(radioEl => {
                radioEl.addEventListener('change', updateBulkImportCount);
            });

            document.querySelectorAll('.btn-open-bulk-import').forEach(btn => {
                btn.addEventListener('click', openBulkImportModal);
            });

            if (btnCancelBulkImport) btnCancelBulkImport.addEventListener('click', closeBulkImportModal);
            if (modalBulkImportOverlay) modalBulkImportOverlay.addEventListener('click', closeBulkImportModal);
            if (btnCloseBulkImportX) btnCloseBulkImportX.addEventListener('click', closeBulkImportModal);

            if (btnConfirmBulkImport) {
                btnConfirmBulkImport.addEventListener('click', () => {
                    const { numeri: numbers, scartati } = parseBulkImportNumbers(txtBulkImportData ? txtBulkImportData.value : '');
                    if (numbers.length === 0 || scartati.length) return; // il bottone è già spento

                    const selectedOpt = document.querySelector('input[name="optImportMode"]:checked');
                    const mode = selectedOpt ? selectedOpt.value : 'append';

                    if (mode === 'replace') {
                        copiaPrimaDi('sostituire tutti gli intervalli');
                        state.logs = [];
                        state.currentDepthStart = 0;
                    }

                    const stepM = (state.settings.stepCm || 20) / 100;

                    numbers.forEach(colpi => {
                        const start = state.currentDepthStart;
                        const end = start + stepM;
                        const asta = getRodForDepth(end);

                        state.logs.push(nuovoIntervallo({
                            start: start,
                            end: end,
                            colpi: colpi,
                            asta: asta,
                            note: '',
                            lithology: ''
                        }, 'inserimento-multiplo'));

                        state.currentDepthStart = end;
                    });

                    state.currentRod = getRodForDepth(state.currentDepthStart + stepM);
                    state.currentCount = 0;

                    triggerVibrate([40, 60]);
                    saveState();
                    updateUI();
                    closeBulkImportModal();
                    mostraToast(numbers.length === 1 ? 'Aggiunto 1 intervallo' : `Aggiunti ${numbers.length} intervalli`);
                });
            }

            // MODAL NUOVO PROGETTO CANTIERE
            const modalNewProjectOverlay = document.getElementById('modalNewProjectOverlay');
            const modalNewProject = document.getElementById('modalNewProject');
            const txtProjName = document.getElementById('txtProjName');
            const txtProjComune = document.getElementById('txtProjComune');
            const txtProjCommittente = document.getElementById('txtProjCommittente');
            const txtProjDate = document.getElementById('txtProjDate');
            const btnConfirmNewProject = document.getElementById('btnConfirmNewProject');
            const btnCancelNewProject = document.getElementById('btnCancelNewProject');

            function openNewProjectModal() {
                if (txtProjName) txtProjName.value = '';
                if (txtProjComune) txtProjComune.value = '';
                if (txtProjCommittente) txtProjCommittente.value = '';
                if (txtProjDate) txtProjDate.value = new Date().toISOString().split('T')[0];
                if (modalNewProjectOverlay) modalNewProjectOverlay.classList.add('open');
                if (modalNewProject) modalNewProject.classList.add('open');
                setTimeout(() => { if (txtProjComune) txtProjComune.focus(); }, 150);
            }

            function closeNewProjectModal() {
                if (modalNewProjectOverlay) modalNewProjectOverlay.classList.remove('open');
                if (modalNewProject) modalNewProject.classList.remove('open');
            }

            if (btnCancelNewProject) btnCancelNewProject.addEventListener('click', closeNewProjectModal);
            if (modalNewProjectOverlay) modalNewProjectOverlay.addEventListener('click', closeNewProjectModal);

            if (btnConfirmNewProject) {
                btnConfirmNewProject.addEventListener('click', () => {
                    const comune = txtProjComune ? txtProjComune.value.trim() : '';
                    if (!comune) {
                        alert('Il campo "Comune" è obbligatorio per creare il progetto!');
                        txtProjComune.focus();
                        return;
                    }

                    saveState();
                    const projId = `PROJ_${comune.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
                    const survId = `SURV_1_${Date.now()}`;
                    const projName = txtProjName && txtProjName.value.trim() ? txtProjName.value.trim() : `${comune} - Cantiere`;

                    const newProj = {
                        id: projId,
                        name: projName,
                        comune: comune,
                        committente: txtProjCommittente ? txtProjCommittente.value.trim() : '',
                        // localita: si imposta per SINGOLA PROVA, non per progetto — puo' riferirsi
                        // a un pozzo o a una via diversi all'interno dello stesso cantiere.
                        localita: '',
                        operator: state.settings.operator || '',
                        date: txtProjDate ? txtProjDate.value : new Date().toISOString().split('T')[0],
                        updatedAt: Date.now(),
                        surveys: {
                            [survId]: {
                                id: survId,
                                header: {
                                    committente: txtProjCommittente ? txtProjCommittente.value.trim() : '',
                                    comune: comune,
                                    localita: '', // vedi sopra: dato della singola prova
                                    provaNr: '1',
                                    faldaDa: '',
                                    faldaA: '',
                                    lat: null, lng: null, alt: null, acc: null,
                                    date: txtProjDate ? txtProjDate.value : new Date().toISOString().split('T')[0]
                                },
                                instrument: JSON.parse(JSON.stringify(state.instrument)),
                                settings: JSON.parse(JSON.stringify(state.settings)),
                                // Progetto NUOVO: si riparte dal generico Strato 1, mai dagli strati
                                // del cantiere precedente (vedi stratiInizialiProgettoNuovo).
                                currentCount: 0, currentDepthStart: 0, currentRod: 1, logs: [], strati: stratiInizialiProgettoNuovo(), photos: []
                            }
                        }
                    };

                    if (!state.projects) state.projects = {};
                    state.projects[projId] = newProj;
                    state.currentProjectId = projId;
                    state.currentSurveyId = survId;

                    syncProjectToActiveState(projId, survId);
                    saveState();
                    closeNewProjectModal();
                    switchView('field');
                    triggerVibrate([40, 60]);
                });
            }

            // MODAL NUOVA PROVA NEL PROGETTO CORRENTE
            const modalNewSurveyOverlay = document.getElementById('modalNewSurveyOverlay');
            const modalNewSurvey = document.getElementById('modalNewSurvey');
            const txtNewCommittente = document.getElementById('txtNewCommittente');
            const txtNewComune = document.getElementById('txtNewComune');
            const txtNewLocalita = document.getElementById('txtNewLocalita');
            const txtNewData = document.getElementById('txtNewData');
            const txtNewProvaNr = document.getElementById('txtNewProvaNr');
            const numNewLunghAsta = document.getElementById('numNewLunghAsta');
            const btnNewSurveyConfirm = document.getElementById('btnNewSurveyConfirm');
            const btnNewSurveyCancel = document.getElementById('btnNewSurveyCancel');

            function openNewSurveyModal() {
                let nextNr = '1';
                if (state.currentProjectId && state.projects[state.currentProjectId]) {
                    const count = proveFisiche(Object.values(state.projects[state.currentProjectId].surveys || {})).length; // le interpretazioni («3B») non sono prove in più
                    nextNr = (count + 1).toString();
                }

                txtNewCommittente.value = state.header.committente || '';
                txtNewComune.value = state.header.comune || '';
                txtNewLocalita.value = state.header.localita || '';
                txtNewData.value = state.header.date || new Date().toISOString().split('T')[0];
                txtNewProvaNr.value = nextNr;
                numNewLunghAsta.value = state.instrument.lunghAsta || '1.00';
                // Nuova prova con un tocco (Fase 4): N° successivo e dati ereditati, senza domande; si
                // correggono dopo dalla scheda della prova.
                confirmNewSurvey();
                mostraToast(`Prova ${nextNr} creata con i dati del progetto`, { azione: { etichetta: 'Scheda', fn: () => openCantiereInfoModal() } });
            }

            function closeNewSurveyModal() {
                if (modalNewSurveyOverlay) modalNewSurveyOverlay.classList.remove('open');
                if (modalNewSurvey) modalNewSurvey.classList.remove('open');
            }

            function cancelNewSurveyModal() {
                closeNewSurveyModal();
            }

            function confirmNewSurvey() {
                const comune = txtNewComune.value.trim() || state.header.comune || 'Cantiere';
                const provaNr = txtNewProvaNr.value.trim() || '1';

                saveState();

                // Se non c'è un progetto attivo, questa "nuova prova" ne crea uno da zero (vedi più
                // sotto): in quel caso vale la stessa regola del progetto nuovo — si riparte dal
                // generico Strato 1.
                // Dentro un progetto già esistente la stratigrafia si porta invece dietro, ed è
                // voluto: più prove dello stesso cantiere incontrano gli stessi terreni, e
                // riscriverli da capo a ogni prova sarebbe lavoro inutile per un dato che è
                // davvero lo stesso. La regola che hai chiesto riguarda il passaggio da un
                // CANTIERE all'altro, non da una prova all'altra dentro lo stesso.
                const questaProvaCreaAncheIlProgetto = !state.currentProjectId || !state.projects[state.currentProjectId];

                const survId = `SURV_${provaNr}_${Date.now()}`;
                const newSurv = {
                    id: survId,
                    header: {
                        committente: txtNewCommittente.value.trim() || state.header.committente,
                        comune: comune,
                        localita: txtNewLocalita.value.trim() || state.header.localita,
                        provaNr: provaNr,
                        faldaDa: '',
                        faldaA: '',
                        lat: null, lng: null, alt: null, acc: null,
                        date: txtNewData.value || state.header.date
                    },
                    instrument: JSON.parse(JSON.stringify(state.instrument)),
                    settings: JSON.parse(JSON.stringify(state.settings)),
                    currentCount: 0,
                    currentDepthStart: 0.0,
                    currentRod: 1,
                    logs: [],
                    strati: questaProvaCreaAncheIlProgetto
                        ? stratiInizialiProgettoNuovo()
                        : JSON.parse(JSON.stringify(state.strati)),
                    photos: []
                };

                if (!state.currentProjectId || !state.projects[state.currentProjectId]) {
                    const projId = `PROJ_${comune.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}`;
                    state.projects[projId] = {
                        id: projId,
                        name: `${comune} - Cantiere`,
                        comune: comune,
                        committente: newSurv.header.committente,
                        localita: newSurv.header.localita,
                        operator: state.settings.operator || '',
                        date: newSurv.header.date,
                        updatedAt: Date.now(),
                        surveys: {}
                    };
                    state.currentProjectId = projId;
                }

                state.projects[state.currentProjectId].surveys[survId] = newSurv;
                syncProjectToActiveState(state.currentProjectId, survId);

                saveState();
                closeNewSurveyModal();
                switchView('field');
                triggerVibrate([40, 60]);
            }

            if (btnNewSurveyCancel) btnNewSurveyCancel.addEventListener('click', cancelNewSurveyModal);
            if (btnNewSurveyConfirm) btnNewSurveyConfirm.addEventListener('click', confirmNewSurvey);

            // MOTORE ESPORTAZIONE KML MULTI-PROVA CON FOTO IN MAPPA (QGIS / GOOGLE EARTH)
            // soloProve: Set degli id delle prove da consegnare (null = tutte).
            async function exportProjectKML(projId, soloProve) {
                try {
                    const proj = state.projects[projId];
                    if (!proj) return;

                    const surveys = Object.values(proj.surveys || {}).filter(s => !soloProve || soloProve.has(s.id));
                    let placemarksXml = '';

                    for (let surv of surveys) {
                        const h = surv.header || {};
                        const logs = surv.logs || [];
                        const photos = surv.photos || [];
                        const maxD = logs.length > 0 ? Math.max(...logs.map(l => l.end)) : 0;
                        const totalColpi = logs.reduce((sum, l) => sum + (l.colpi || 0), 0);
                        
                        if (h.lat !== null && h.lng !== null && !isNaN(h.lat) && !isNaN(h.lng)) {
                            const alt = h.alt !== null && !isNaN(h.alt) ? h.alt : 0;

                            let photoHtml = '';
                            if (photos.length > 0) {
                                const p = photos[0];
                                const pUrl = p.dataUrl || photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : '');
                                if (pUrl) {
                                    photoHtml = `<div style="margin-top:10px; text-align:center;"><img src="${pUrl}" style="max-width:280px; max-height:200px; border-radius:8px; border:1px solid #cbd5e1;" /><br/><span style="font-size:11px; color:#64748b;"><svg class="ico"><use href="#i-camera"/></svg> Foto Cantiere: ${p.name || 'Foto 1'}</span></div>`;
                                }
                            }

                            placemarksXml += `
    <Placemark>
      <name>Prova N° ${h.provaNr || '1'} - ${proj.name || proj.comune}</name>
      <description><![CDATA[
        <div style="font-family: sans-serif; padding: 10px; color: #1e293b;">
          <h3 style="color: #d97706; margin-top:0;"><svg class="ico"><use href="#i-chart"/></svg> Prova Penetrometrica DPSH N° ${h.provaNr || '1'}</h3>
          <p style="margin:4px 0;"><strong>Cantiere:</strong> ${proj.name || proj.comune}</p>
          <p style="margin:4px 0;"><strong>Comune:</strong> ${proj.comune || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Committente:</strong> ${proj.committente || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Località:</strong> ${proj.localita || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Data:</strong> ${h.date || proj.date}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
          <p style="margin:4px 0;"><strong>Profondità Raggiunta:</strong> ${maxD.toFixed(2)} m</p>
          <p style="margin:4px 0;"><strong>Totale Colpi N:</strong> ${totalColpi}</p>
          <p style="margin:4px 0;"><strong>Quota Falda:</strong> ${h.faldaDa ? h.faldaDa + ' m' : 'Non rilevata'}</p>
          <p style="margin:4px 0;"><strong>Coordinate GPS:</strong> ${h.lat.toFixed(6)}, ${h.lng.toFixed(6)}</p>
          ${photoHtml}
        </div>
      ]]></description>
      <Point>
        <coordinates>${h.lng},${h.lat},${alt}</coordinates>
      </Point>
    </Placemark>`;
                        }
                    }

                    if (!placemarksXml) {
                        alert('Nessuna prova in questo progetto ha coordinate GPS valide per l\'esportazione KML!');
                        return;
                    }

                    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>${proj.name || proj.comune} - Prove DPSH</name>
    <description>Rilevamento Georeferenziato Multi-Prova DPSH - ${proj.comune}</description>
    ${placemarksXml}
  </Document>
</kml>`;

                    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `DPSH_Progetto_${(proj.comune || 'Cantiere').replace(/[^a-zA-Z0-9]/g, '_')}_MultiProva.kml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch(e) {
                    console.error('exportProjectKML error:', e);
                    alert('Si è verificato un errore durante l\'esportazione KML: ' + e.message);
                }
            }

            // MOTORE ESPORTAZIONE KML PER SINGOLA PROVA ATTIVA (IN CAMPAGNA)
            async function exportSingleSurveyKML() {
                try {
                    const h = state.header || {};
                    const logs = state.logs || [];
                    const photos = state.photos || [];
                    
                    if (h.lat === null || h.lng === null || isNaN(h.lat) || isNaN(h.lng)) {
                        alert('La prova corrente non ha coordinate GPS valide per l\'esportazione KML! Acquisisci prima la posizione GPS.');
                        return;
                    }

                    const maxD = logs.length > 0 ? Math.max(...logs.map(l => l.end)) : 0;
                    const totalColpi = logs.reduce((sum, l) => sum + (l.colpi || 0), 0);
                    const alt = h.alt !== null && !isNaN(h.alt) ? h.alt : 0;

                    let photoHtml = '';
                    if (photos.length > 0) {
                        const p = photos[0];
                        const pUrl = p.dataUrl || photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : '');
                        if (pUrl) {
                            photoHtml = `<div style="margin-top:10px; text-align:center;"><img src="${pUrl}" style="max-width:280px; max-height:200px; border-radius:8px; border:1px solid #cbd5e1;" /><br/><span style="font-size:11px; color:#64748b;"><svg class="ico"><use href="#i-camera"/></svg> Foto Cantiere: ${p.name || 'Foto 1'}</span></div>`;
                        }
                    }

                    const placemarkXml = `
    <Placemark>
      <name>Prova N° ${h.provaNr || '1'} - ${h.comune || 'Cantiere'}</name>
      <description><![CDATA[
        <div style="font-family: sans-serif; padding: 10px; color: #1e293b;">
          <h3 style="color: #d97706; margin-top:0;"><svg class="ico"><use href="#i-chart"/></svg> Prova Penetrometrica DPSH N° ${h.provaNr || '1'}</h3>
          <p style="margin:4px 0;"><strong>Comune:</strong> ${h.comune || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Committente:</strong> ${h.committente || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Località:</strong> ${h.localita || 'N.D.'}</p>
          <p style="margin:4px 0;"><strong>Data:</strong> ${h.date || ''}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 8px 0;"/>
          <p style="margin:4px 0;"><strong>Profondità Raggiunta:</strong> ${maxD.toFixed(2)} m</p>
          <p style="margin:4px 0;"><strong>Totale Colpi N:</strong> ${totalColpi}</p>
          <p style="margin:4px 0;"><strong>Quota Falda:</strong> ${h.faldaDa ? h.faldaDa + ' m' : 'Non rilevata'}</p>
          <p style="margin:4px 0;"><strong>Coordinate GPS:</strong> ${h.lat.toFixed(6)}, ${h.lng.toFixed(6)}</p>
          ${photoHtml}
        </div>
      ]]></description>
      <Point>
        <coordinates>${h.lng},${h.lat},${alt}</coordinates>
      </Point>
    </Placemark>`;

                    const kmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>DPSH Prova ${h.provaNr || '1'} - ${h.comune || 'Cantiere'}</name>
    <description>Rilevamento Georeferenziato Prova Singola DPSH - ${h.comune || 'Cantiere'}</description>
    ${placemarkXml}
  </Document>
</kml>`;

                    const blob = new Blob([kmlContent], { type: 'application/vnd.google-earth.kml+xml' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `DPSH_Prova_${h.provaNr || '1'}_${(h.comune || 'Cantiere').replace(/[^a-zA-Z0-9]/g, '_')}.kml`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                } catch(e) {
                    console.error('exportSingleSurveyKML error:', e);
                    alert('Errore durante l\'esportazione KML della prova: ' + e.message);
                }
            }

            // MOTORE ESPORTAZIONE EXCEL MULTI-FOGLIO (.xlsx) VIA SHEETJS CON FOTO AD ALTA RISOLUZIONE INTEGRALI (0% COMPRESSIONE)
            async function exportProjectExcel(projId, soloProve) {
                try {
                    const proj = state.projects[projId];
                    if (!proj) {
                        alert('Progetto non trovato!');
                        return;
                    }
                    if (typeof XLSX === 'undefined') {
                        alert('La libreria XLSX non è caricata. Assicurati che il dispositivo sia connesso o la pagina sia completamente caricata.');
                        return;
                    }

                    const wb = XLSX.utils.book_new();

                    // 1. FOGLIO "Sintesi Progetto"
                    const summaryData = [
                        ["PROGETTO DPSH - SINTESI CANTIERE"],
                        ["Cantiere / Nome:", proj.name || ''],
                        ["Comune:", proj.comune || ''],
                        ["Committente:", proj.committente || ''],
                        ["Località:", proj.localita || ''],
                        ["Data:", proj.date || ''],
                        ["Operatore:", proj.operator || ''],
                        [],
                        ["N° Prova", "Profondità Max (m)", "Totale Colpi N", "Quota Falda (m)", "N° Foto Allegate", "Latitudine", "Longitudine", "Accuratezza GPS (m)", "Data Prova"]
                    ];

                    const surveys = Object.values(proj.surveys || {}).filter(s => !soloProve || soloProve.has(s.id));
                    surveys.forEach(surv => {
                        const h = surv.header || {};
                        const logs = surv.logs || [];
                        const maxD = logs.length > 0 ? Math.max(...logs.map(l => l.end)) : 0;
                        const totalColpi = logs.reduce((sum, l) => sum + (l.colpi || 0), 0);
                        const photoCount = (surv.photos || []).length;
                        summaryData.push([
                            `Prova ${h.provaNr || '1'}`,
                            maxD.toFixed(2),
                            totalColpi,
                            h.faldaDa || '-',
                            photoCount,
                            h.lat !== null && h.lat !== undefined ? h.lat.toFixed(6) : '-',
                            h.lng !== null && h.lng !== undefined ? h.lng.toFixed(6) : '-',
                            h.acc !== null && h.acc !== undefined ? h.acc.toFixed(1) : '-',
                            h.date || proj.date
                        ]);
                    });

                    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
                    XLSX.utils.book_append_sheet(wb, wsSummary, "Sintesi Progetto");

                    // 2. FOGLI INDIVIDUALI "Prova 1", "Prova 2", ... CON TABELLA ED ALLEGATI FOTO HD (100% UNCOMPRESSED)
                    for (let surv of surveys) {
                        const h = surv.header || {};
                        const inst = surv.instrument || state.instrument;
                        const logs = surv.logs || [];
                        const photos = surv.photos || [];
                        
                        const sheetData = [
                            [`PROVA PENETROMETRICA DPSH N° ${h.provaNr || '1'}`],
                            ["Comune:", proj.comune || '', "Committente:", proj.committente || ''],
                            ["Località:", proj.localita || '', "Data:", h.date || proj.date],
                            ["Massa Battente (kg):", inst.pesoMassa || 63.5, "Altezza Caduta (m):", inst.volata || 0.75],
                            ["Passo Misura (cm):", (surv.settings?.stepCm || 20), "Area Punta (cm²):", inst.areaPunta || 20],
                            ["Coordinate GPS:", (h.lat && h.lng) ? `${h.lat.toFixed(6)}, ${h.lng.toFixed(6)}` : 'Non rilevate', "Quota Falda (m):", h.faldaDa || 'Assente'],
                            [],
                            ["Intervallo Da (m)", "Intervallo A (m)", "Asta N°", "Colpi N", "Rpd (kg/cm²)", "Litologia", "Note"]
                        ];

                        logs.forEach((log) => {
                            const N = log.colpi || 0;
                            const M = inst.pesoMassa || 63.5;
                            const H = (inst.volata || 0.75) * 100;
                            const A = inst.areaPunta || 20;
                            const passoCm = (surv.settings?.stepCm || 20);
                            const rodNr = log.asta || Math.floor(log.start / (inst.lunghAsta || 1.0)) + 1;
                            const Mprime = (inst.pesoSistema || 8.0) + (rodNr * (inst.pesoAsta || 6.3));
                            
                            let rpd = 0;
                            if (N > 0) {
                                rpd = ((M * M) * H * N) / (A * passoCm * (M + Mprime));
                            }

                            const projStrati = proj.strati || surv.strati;
                            const litObj = (projStrati && log.lithology) ? (projStrati.find(s => s.id === log.lithology) || { name: '' }) : { name: '' };

                            sheetData.push([
                                log.start.toFixed(2),
                                log.end.toFixed(2),
                                rodNr,
                                N,
                                N > 0 ? rpd.toFixed(2) : '0.00',
                                litObj.name || '',
                                log.note || ''
                            ]);
                        });

                        if (photos.length > 0) {
                            sheetData.push([]);
                            sheetData.push(["REGISTRO FOTO CANTIERE GEOREFERENZIATE (ZERO COMPRESSIONE - INTEGRALI HD)"]);
                            sheetData.push(["N° Foto", "Nome / Didascalia", "Data / Ora Scatto", "Coordinate GPS Foto", "Stato Foto", "Riferimento ID / DataURL (Excel Spec Compliant)"]);

                            for (let pIdx = 0; pIdx < photos.length; pIdx++) {
                                const p = photos[pIdx];
                                const fullDataUrl = p.dataUrl || photoMemoryCache[p.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(p.id) : '');
                                const gpsText = (p.lat && p.lng) ? `${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}` : 'Non georeferenziata';
                                
                                // Microsoft Excel limita la lunghezza del testo di una singola cella a 32.767 caratteri.
                                // Tronchiamo il DataURL a 1.000 caratteri per la cella Excel mantenendo le immagini intatte in IndexedDB ed in KML.
                                const safePreview = fullDataUrl 
                                    ? (fullDataUrl.length > 1000 ? fullDataUrl.substring(0, 1000) + '... [DataURL 100% HD Integrale]' : fullDataUrl)
                                    : 'Foto archiviata in IndexedDB local';

                                sheetData.push([
                                    `Foto ${pIdx + 1}`,
                                    p.name || `Foto Cantiere ${pIdx + 1}`,
                                    p.timestamp || 'N.D.',
                                    gpsText,
                                    fullDataUrl ? 'Foto HD Integrale Presente' : 'Assente',
                                    safePreview
                                ]);
                            }
                        }

                        const wsSurv = XLSX.utils.aoa_to_sheet(sheetData);
                        const sheetName = `Prova ${h.provaNr || '1'}`.substring(0, 31);
                        XLSX.utils.book_append_sheet(wb, wsSurv, sheetName);
                    }

                    const fileName = `DPSH_Progetto_${(proj.comune || 'Cantiere').replace(/[^a-zA-Z0-9]/g, '_')}_MultiFoglio.xlsx`;
                    XLSX.writeFile(wb, fileName);
                } catch(e) {
                    console.error('exportProjectExcel error:', e);
                    alert('Errore durante l\'esportazione Excel del progetto: ' + e.message);
                }
            }

            // LONG-PRESS SHORTCUTS SUI PULSANTI +1 e -1 (ROBUSTO SENZA CONFLITTI TOUCH/MOUSE)
            function setupLongPress(btn, callback, longPressMs = 500) {
                if (!btn) return { cancel: () => {} };
                let pressTimer = null;
                let isLongPress = false;
                let isTouch = false;

                const startPress = (e) => {
                    if (e.type === 'mousedown' && isTouch) return;
                    isLongPress = false;
                    if (pressTimer) clearTimeout(pressTimer);
                    pressTimer = setTimeout(() => {
                        isLongPress = true;
                        triggerVibrate([50, 30, 50]);
                        callback();
                    }, longPressMs);
                };

                const cancelPress = (e) => {
                    if (pressTimer) {
                        clearTimeout(pressTimer);
                        pressTimer = null;
                    }
                    if (e && (e.type === 'touchend' || e.type === 'touchcancel')) {
                        setTimeout(() => { isTouch = false; }, 400);
                    }
                };

                btn.addEventListener('touchstart', (e) => {
                    isTouch = true;
                    startPress(e);
                }, { passive: true });

                btn.addEventListener('touchend', cancelPress, { passive: true });
                btn.addEventListener('touchcancel', cancelPress, { passive: true });

                btn.addEventListener('mousedown', startPress);
                btn.addEventListener('mouseup', cancelPress);
                btn.addEventListener('mouseleave', cancelPress);

                // Intercetta l'evento click in fase di capture per impedire che il rilascio del tasto esegua un colpo extra!
                btn.addEventListener('click', (e) => {
                    if (isLongPress) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.stopImmediatePropagation();
                        isLongPress = false;
                    }
                }, true);

                // Esposto per poter interrompere dall'esterno un long-press già avviato.
                return { cancel: () => { cancelPress(); isLongPress = false; } };
            }

            // TASTO AZIONE DIRETTA CONFERMA INTERVALLO
            const btnConfirmStepAction = document.getElementById('btnConfirmStepAction');
            if (btnConfirmStepAction) {
                btnConfirmStepAction.addEventListener('click', confirmAndNextStep);
            }

            // Bind Long-Press shortcuts (+1 -> Avanti, -1 -> Annulla)
            let btnPlusLongPress = { cancel: () => {} };
            let btnMinusLongPress = { cancel: () => {} };
            if (btnPlus) {
                btnPlusLongPress = setupLongPress(btnPlus, () => {
                    confirmAndNextStep();
                });
            }

            if (btnMinus) {
                btnMinusLongPress = setupLongPress(btnMinus, () => {
                    undoLastStep();
                });
            }

            // INDEXEDDB PER SALVATAGGIO FOTO ORIGINALI NON COMPRESSE AD ALTA CAPACITA (SENZA LIMITI DI MEMORIA)
            const DB_NAME = 'DPSH_PhotoStorageDB';
            // v2: aggiunto lo store 'noteImages' per le immagini incorporate nelle Note di
            // progetto (stesso pattern delle foto: immagine intera solo qui + cache RAM,
            // nell'HTML della nota resta solo un riferimento data-note-img-id).
            const DB_VERSION = 2;
            const STORE_NAME = 'photos';
            const STORE_NOTE_IMAGES = 'noteImages';

            function openPhotoDB() {
                return new Promise((resolve, reject) => {
                    const req = indexedDB.open(DB_NAME, DB_VERSION);
                    req.onupgradeneeded = (e) => {
                        const db = e.target.result;
                        if (!db.objectStoreNames.contains(STORE_NAME)) {
                            db.createObjectStore(STORE_NAME, { keyPath: 'id' });
                        }
                        if (!db.objectStoreNames.contains(STORE_NOTE_IMAGES)) {
                            db.createObjectStore(STORE_NOTE_IMAGES, { keyPath: 'id' });
                        }
                    };
                    req.onsuccess = (e) => resolve(e.target.result);
                    req.onerror = (e) => reject(e.target.error);
                });
            }

            /** Scrive una foto in IndexedDB. Ritorna true/false invece di lasciar esplodere una
             * Promise che nessuno ascolta: prima, in caso di errore, questa funzione non ritornava
             * nulla e la transazione rifiutata diventava un "unhandled rejection" invisibile.
             * NON mostra nulla all'utente — decide il chiamante (vedi salvaFotoConGaranzia), perché
             * un import di 40 foto non deve aprire 40 finestre. */
            async function savePhotoToIDB(id, dataUrl) {
                try {
                    const db = await openPhotoDB();
                    return await new Promise((resolve) => {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        store.put({ id, dataUrl });
                        tx.oncomplete = () => resolve(true);
                        // resolve(false) invece di reject: l'esito è un valore da controllare, non
                        // un'eccezione da inseguire — così è impossibile "dimenticarsi" di gestirlo.
                        tx.onerror = () => { console.warn('IDB Save error (transazione):', tx.error); resolve(false); };
                        tx.onabort = () => { console.warn('IDB Save abort (spazio esaurito?):', tx.error); resolve(false); };
                    });
                } catch(e) {
                    console.warn('IDB Save error:', e);
                    return false;
                }
            }

            /** Salva una foto E VERIFICA che ci sia davvero, rileggendola.
             *
             * Perché la verifica e non solo il salvataggio: le 4 chiamate a savePhotoToIDB erano
             * scritte come `try { savePhotoToIDB(...) } catch {}`, senza await. Un try/catch
             * sincrono NON può intercettare il fallimento di una funzione asincrona: quel catch era
             * decorativo e una foto non scritta spariva senza un solo messaggio. Su un'app da
             * cantiere le foto sono materiale probatorio, quindi qui non ci si fida della scrittura:
             * si ricontrolla. Il costo è una lettura in più per foto, trascurabile rispetto al
             * rischio di scoprire l'assenza settimane dopo, in ufficio.
             *
             * Ritorna true se la foto è al sicuro, false altrimenti. Non mostra nulla: il chiamante
             * raccoglie i fallimenti e avvisa una volta sola (vedi avvisaFotoNonSalvate). */
            async function salvaFotoConGaranzia(id, dataUrl) {
                if (!id || !dataUrl) return false;
                // La copia in RAM viene messa comunque: finché l'app resta aperta la foto è
                // visibile anche se la scrittura su disco è fallita, e resta recuperabile con il
                // salvataggio d'emergenza qui sotto invece di essere già persa.
                photoMemoryCache[id] = dataUrl;
                const scritta = await savePhotoToIDB(id, dataUrl);
                if (!scritta) return false;
                try {
                    const riletta = await getPhotoFromIDB(id);
                    return !!riletta && riletta.length === dataUrl.length;
                } catch (e) {
                    console.warn('IDB verifica rilettura fallita:', e);
                    return false;
                }
            }

