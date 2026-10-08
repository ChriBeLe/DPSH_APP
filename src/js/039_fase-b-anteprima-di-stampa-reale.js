            // ===================== FASE B: ANTEPRIMA DI STAMPA REALE =====================
            // (vedi Piano_Riscrittura_Layout_Export.md) Richiesta esplicitamente: "permettimi di
            // avere una reale e concreta anteprima della stampa partendo dal layout". Non è una
            // terza simulazione che si aggiunge alle due già disallineate (canvas editor vs export
            // vero): questa funzione chiama DAVVERO costruisciPagineTemplateUnificato, la stessa
            // identica funzione che l'export PDF vero chiama da buildSurveyReportHtml — se una
            // pagina qui risulta bianca o quasi vuota, lo sarà anche nel PDF finale, e viceversa.
            // Zero nuova logica di impaginazione: solo un contenitore che mostra il risultato.
            /** Costruisce e scrive nell'iframe l'HTML reale del template aperto nell'editor,
             * pagina fisica per pagina fisica. Dopo il passaggio ai FOGLI RIGIDI (vedi
             * getReportPrintStyleBlock) questa anteprima non ha più bisogno di alcun riquadro
             * "finto" per far vedere i confini di pagina: ogni pagina prodotta dal motore È già un
             * .dpsh-sheet con le dimensioni fisiche esatte di un A4, identico a quello che finirà
             * nel PDF. L'unica aggiunta di sola anteprima è l'etichetta "Pagina X di Y" sopra ogni
             * foglio (vedi .dpsh-preview-sheet), che in stampa non esiste. Quel che si vede qui è
             * quindi letteralmente lo stesso elemento che verrà stampato, non una sua imitazione. */
            async function generaAnteprimaStampaReale() {
                const iframe = document.getElementById('iframeAnteprimaStampaReale');
                const statusBar = document.getElementById('anteprimaStampaRealeStatus');
                if (!iframe) return;
                if (statusBar) statusBar.style.display = 'flex';
                try {
                    // Stesso ctx del canvas dell'editor (vedi computeEditorPreviewCtx/
                    // aggiornaCtxFotoEditor): unica fonte di verità sui dati "grezzi" della prova
                    // scelta per l'anteprima (state o un'altra prova del progetto, vedi
                    // templateEditorState.previewSurveyId) — ricalcolato qui per essere certi che
                    // rifletta l'ultimo ordine dei blocchi (da cui dipendono gli indici foto/figura).
                    if (!templateEditorState.ctx) templateEditorState.ctx = computeEditorPreviewCtx();
                    aggiornaCtxFotoEditor();
                    const ctx = templateEditorState.ctx;
                    const pages = templateEditorState.pages || [];
                    const margins = templateEditorState.margins || marginiPaginaDiDefault();
                    const headerEnabled = !!templateEditorState.headerEnabled;
                    const footerEnabled = !!templateEditorState.footerEnabled;
                    const provaNr = (ctx && ctx.provaNr) || '1';

                    // Prima passata: costruisce ogni pagina-layout (pageDef) col motore vero. Tenute
                    // separate dal join finale perché il numero TOTALE di pagine fisiche (serve per
                    // l'etichetta "Pagina X di Y") si conosce solo a fine ciclo.
                    const risultatiPerPagina = [];
                    for (let idx = 0; idx < pages.length; idx++) {
                        const pageDef = pages[idx];
                        // isLastOfDoc: vero solo sull'ultima pagina-layout, come nell'export reale di
                        // una singola prova (paginaDatiHaSeguito=false lì, vedi buildSurveyReportHtml)
                        // — questa anteprima mostra sempre il template come documento a sé, mai come
                        // parte di un Report Completo multi-prova che l'editor non conosce comunque.
                        const isLastOfDoc = (idx === pages.length - 1);
                        const risultatoPagina = await costruisciPagineTemplateUnificato(pageDef, ctx, pageDef.margins || margins, provaNr, isLastOfDoc, headerEnabled, footerEnabled);
                        risultatiPerPagina.push(risultatoPagina);
                    }
                    const totalePagineFisiche = risultatiPerPagina.reduce((sum, r) => sum + r.pageCount, 0);

                    let pagineHtml = '';
                    let contatore = 0;
                    risultatiPerPagina.forEach((risultatoPagina, pageDefIdx) => {
                        risultatoPagina.pagine.forEach((paginaHtml) => {
                            contatore++;
                            // Etichetta calcolata QUI (non riusa data-tpl-page-label del motore, che
                            // numera solo dentro la singola pagina-layout): un conteggio globale su
                            // tutto il documento aiuta a correlare subito "pagina bianca" con la sua
                            // posizione reale nel PDF finale.
                            const label = `Pagina ${contatore} di ${totalePagineFisiche} — layout pag. ${pageDefIdx + 1}`;
                            // Contenitore SENZA geometria propria (prima era class="a4-page", che
                            // aggiungeva 210mm di larghezza e i margini come padding): dopo il
                            // passaggio ai fogli rigidi, paginaHtml È GIÀ un .dpsh-sheet completo di
                            // dimensioni e margini: avvolgerlo in un altro foglio applicherebbe i
                            // margini due volte, e l'anteprima tornerebbe a non somigliare al PDF.
                            // Qui resta solo l'aggancio per l'etichetta fluttuante "Pagina X di Y".
                            pagineHtml += `<div class="dpsh-preview-sheet" data-preview-label="${escapeHtmlDidascalia(label)}">${paginaHtml}</div>`;
                        });
                    });

                    if (totalePagineFisiche === 0) {
                        pagineHtml = `<div style="max-width:210mm; margin:40px auto; padding:24px; background:#fff; border-radius:8px; text-align:center; font-family:Arial,sans-serif; color:#64748b; font-size:13px;">Questo template non ha ancora nessun blocco con contenuto da mostrare.</div>`;
                    }

                    const doc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Anteprima di stampa reale</title>
                        <style>${getReportPrintStyleBlock(margins, templateEditorState.stileTesto)}</style>
                        <style>
                            /* Stile di SOLA ANTEPRIMA — mai usato dal vero export (vedi commento sopra
                               generaAnteprimaStampaReale): dà a ogni pagina fisica il proprio riquadro
                               bianco con ombra invece di un foglio continuo, più un'etichetta
                               fluttuante "Pagina X di Y" sopra ogni foglio. */
                            body { background:#64748b; padding:26px 0 60px; margin:0; }
                            /* Larghezza pari al foglio, così l'etichetta si centra su di esso; il
                               foglio vero (.dpsh-sheet) sta dentro e porta da sé dimensioni,
                               margini, sfondo e ombra — l'anteprima mostra letteralmente lo stesso
                               elemento che finirà nel PDF, non una sua imitazione. */
                            .dpsh-preview-sheet { position:relative; width:210mm; margin:0 auto 34px; }
                            .dpsh-preview-sheet .dpsh-sheet { margin:0; }
                            .dpsh-preview-sheet::before {
                                content: attr(data-preview-label);
                                position:absolute; top:-13px; left:50%; transform:translateX(-50%);
                                background:#0f172a; color:#fff; font-size:10px; font-weight:800;
                                padding:3px 11px; border-radius:999px; white-space:nowrap;
                                font-family:Arial,sans-serif; box-shadow:0 2px 6px rgba(0,0,0,.35);
                                z-index:2;
                            }
                        </style>
                        </head><body>${getIconSpriteHtml()}${pagineHtml}</body></html>`;

                    iframe.srcdoc = doc;
                } catch (err) {
                    const msg = (err && err.message) ? String(err.message) : String(err);
                    iframe.srcdoc = `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif; padding:30px; color:#b91c1c;"><b>Errore durante la generazione dell'anteprima:</b><br>${msg.replace(/</g, '&lt;')}</body></html>`;
                } finally {
                    if (statusBar) statusBar.style.display = 'none';
                }
            }
            async function apriAnteprimaStampaReale() {
                const overlay = document.getElementById('modalAnteprimaStampaRealeOverlay');
                const modal = document.getElementById('modalAnteprimaStampaReale');
                if (!overlay || !modal) return;
                overlay.classList.add('open');
                modal.classList.add('open');
                await generaAnteprimaStampaReale();
            }
            function chiudiAnteprimaStampaReale() {
                const overlay = document.getElementById('modalAnteprimaStampaRealeOverlay');
                const modal = document.getElementById('modalAnteprimaStampaReale');
                if (overlay) overlay.classList.remove('open');
                if (modal) modal.classList.remove('open');
            }
            const btnAnteprimaStampaReale = document.getElementById('btnAnteprimaStampaReale');
            if (btnAnteprimaStampaReale) btnAnteprimaStampaReale.addEventListener('click', apriAnteprimaStampaReale);
            const btnCloseAnteprimaStampaRealeX = document.getElementById('btnCloseAnteprimaStampaRealeX');
            if (btnCloseAnteprimaStampaRealeX) btnCloseAnteprimaStampaRealeX.addEventListener('click', chiudiAnteprimaStampaReale);
            const btnAnteprimaStampaRealeRicarica = document.getElementById('btnAnteprimaStampaRealeRicarica');
            if (btnAnteprimaStampaRealeRicarica) btnAnteprimaStampaRealeRicarica.addEventListener('click', generaAnteprimaStampaReale);
            // ===================== FINE FASE B =====================


            /** Legge la scala attualmente applicata al riquadro (utile come punto di partenza
             * quando si passa da zoom automatico a manuale con rotella/pulsanti/pinch). */
            function zoomAttualeEditorTemplate() {
                const wrap = document.getElementById('templateEditorScaleWrap');
                if (!wrap) return 1;
                const m = /scale\(([\d.]+)\)/.exec(wrap.style.transform || '');
                return m ? parseFloat(m[1]) : 1;
            }

            // Zoom con rotella del mouse (o trackpad): sul canvas dell'editor, mai sulla pagina
            // intera, per non interferire con lo scroll della modale.
            const templateEditorViewportEl = document.getElementById('templateEditorViewport');
            if (templateEditorViewportEl) {
                templateEditorViewportEl.addEventListener('wheel', (e) => {
                    if (!modalTemplateEditor || !modalTemplateEditor.classList.contains('open')) return;
                    // Solo Ctrl/Cmd+rotella (o il pinch-to-zoom del trackpad, che il browser riporta
                    // come wheel con ctrlKey=true) fa zoom. La rotella/trackpad "nudo" viene lasciata
                    // al comportamento nativo dello scroll — che con overflow:auto sposta la vista sia
                    // in verticale (rotella semplice) sia in orizzontale (swipe a due dita, o
                    // Shift+rotella) — così lo zoom non ruba più il gesto di spostamento in nessuna
                    // direzione, prima "intrappolato" perché ogni wheel veniva sempre interpretato
                    // come zoom (e mai lasciato scorrere in orizzontale).
                    if (!e.ctrlKey && !e.metaKey) return;
                    e.preventDefault();
                    const base = templateEditorState.manualZoom || zoomAttualeEditorTemplate();
                    const passo = e.deltaY > 0 ? -0.08 : 0.08;
                    impostaZoomEditorTemplate(base + passo);
                }, { passive: false });

                // Toccare/cliccare uno spazio VUOTO del canvas (non un blocco, le sue maniglie,
                // l'etichetta o il menu contestuale) deseleziona il blocco eventualmente selezionato.
                templateEditorViewportEl.addEventListener('pointerdown', (e) => {
                    if (e.target.closest('.tpl-editor-block, .tpl-editor-stack-item, .tpl-editor-block-chip, .tpl-editor-block-handle, .tpl-editor-block-menu, .tpl-editor-page-margin-handle, button, input, select, textarea')) return;
                    deselezionaBloccoEditor();
                    nascondiManigliePaginaEditor();
                });

                // Pinch-to-zoom a due dita: si traccia la distanza tra i due pointer touch attivi,
                // il fattore di variazione (dist attuale / dist iniziale del gesto) moltiplica lo
                // zoom di partenza — stesso principio usato da mappe/gallerie foto native.
                const pinchPointers = new Map();
                let pinchStato = null;
                templateEditorViewportEl.addEventListener('pointerdown', (e) => {
                    if (e.pointerType !== 'touch') return;
                    pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                    if (pinchPointers.size === 2) {
                        const pts = Array.from(pinchPointers.values());
                        pinchStato = {
                            distIniziale: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y),
                            zoomIniziale: templateEditorState.manualZoom || zoomAttualeEditorTemplate()
                        };
                    }
                });
                templateEditorViewportEl.addEventListener('pointermove', (e) => {
                    if (!pinchPointers.has(e.pointerId)) return;
                    pinchPointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
                    if (pinchPointers.size === 2 && pinchStato) {
                        e.preventDefault();
                        const pts = Array.from(pinchPointers.values());
                        const distAttuale = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
                        if (pinchStato.distIniziale > 0) {
                            impostaZoomEditorTemplate(pinchStato.zoomIniziale * (distAttuale / pinchStato.distIniziale));
                        }
                    }
                }, { passive: false });
                const fineTouchPinch = (e) => {
                    pinchPointers.delete(e.pointerId);
                    if (pinchPointers.size < 2) pinchStato = null;
                };
                templateEditorViewportEl.addEventListener('pointerup', fineTouchPinch);
                templateEditorViewportEl.addEventListener('pointercancel', fineTouchPinch);

                // Pan "a mano libera" col mouse: click-e-trascina su uno spazio vuoto del canvas
                // (non su un blocco, i suoi pulsanti o la barra zoom) sposta la vista, esattamente
                // come ci si aspetta da un editor grafico — non solo scrollbar/rotella. Su touch lo
                // spostamento a un dito è già nativo grazie a touch-action:pan-x pan-y qui sopra.
                let panStatoMouse = null;
                // FIX regressione "il blocco non si seleziona più più col mouse": questo elenco
                // diceva di escludere "un blocco" dal pan (vedi commento sopra) ma non elencava
                // MAI .tpl-editor-block/.tpl-editor-block-body/.tpl-editor-stack-item — quindi un
                // pointerdown col mouse sul corpo di un blocco veniva comunque interpretato come
                // inizio di un pan, e templateEditorViewportEl.setPointerCapture(e.pointerId) qui
                // sotto dirottava TUTTI gli eventi successivi (pointermove/pointerup) dal blocco
                // al viewport: il pointerup che avrebbe dovuto far scattare selezionaBloccoEditor
                // in attivaGestureTapBloccoEditor non arrivava mai al blocco, quindi il tap
                // sembrava "non fare niente".
                const SELETTORI_NO_PAN = '.tpl-editor-block, .tpl-editor-block-body, .tpl-editor-stack-item, .tpl-editor-block-chip, .tpl-editor-block-handle, .tpl-editor-block-menu, .tpl-editor-page-margin-handle, #templateEditorZoomBar, button, input, select, textarea, a';
                // DOPPIO TOCCO SUL FOGLIO = ADATTA ALLA LARGHEZZA (voce di bacheca). Lo stesso
                // gesto che in ogni visualizzatore di documenti fa "riempi lo schermo", qui non
                // faceva niente. Si riconosce a mano invece di usare 'dblclick' perché quell'evento
                // sul telefono arriva tardi e non sempre; due pointerdown vicini nel tempo E nello
                // spazio sono un doppio tocco in qualunque browser. La soglia di 24px evita che
                // due tocchi in punti diversi del foglio, magari mentre si scorre, passino per uno.
                let ultimoToccoFoglio = { t: 0, x: 0, y: 0 };
                templateEditorViewportEl.addEventListener('pointerdown', (e) => {
                    if (e.target.closest(SELETTORI_NO_PAN)) return;
                    const ora = Date.now();
                    const vicino = Math.abs(e.clientX - ultimoToccoFoglio.x) < 24 && Math.abs(e.clientY - ultimoToccoFoglio.y) < 24;
                    if (ora - ultimoToccoFoglio.t < 320 && vicino) {
                        adattaLarghezzaEditorTemplate();
                        triggerVibrate(10);
                        ultimoToccoFoglio = { t: 0, x: 0, y: 0 };
                        return;
                    }
                    ultimoToccoFoglio = { t: ora, x: e.clientX, y: e.clientY };
                }, true);
                templateEditorViewportEl.addEventListener('pointerdown', (e) => {
                    if (e.pointerType !== 'mouse' || e.button !== 0) return;
                    if (e.target.closest(SELETTORI_NO_PAN)) return;
                    panStatoMouse = {
                        startX: e.clientX, startY: e.clientY,
                        scrollLeft: templateEditorViewportEl.scrollLeft, scrollTop: templateEditorViewportEl.scrollTop
                    };
                    templateEditorViewportEl.style.cursor = 'grabbing';
                    templateEditorViewportEl.style.userSelect = 'none';
                    templateEditorViewportEl.setPointerCapture(e.pointerId);
                });
                templateEditorViewportEl.addEventListener('pointermove', (e) => {
                    if (!panStatoMouse) return;
                    templateEditorViewportEl.scrollLeft = panStatoMouse.scrollLeft - (e.clientX - panStatoMouse.startX);
                    templateEditorViewportEl.scrollTop = panStatoMouse.scrollTop - (e.clientY - panStatoMouse.startY);
                });
                const fineDelPanMouse = () => {
                    panStatoMouse = null;
                    templateEditorViewportEl.style.cursor = 'grab';
                    templateEditorViewportEl.style.userSelect = '';
                };
                templateEditorViewportEl.addEventListener('pointerup', fineDelPanMouse);
                templateEditorViewportEl.addEventListener('pointercancel', fineDelPanMouse);
            }

            /** Fila di anteprima: in modalità compatta mostra solo etichette "Pagina N" (leggero,
             * poco ingombro verticale); in modalità espansa (default) ogni scheda diventa una vera
             * miniatura della pagina — stesso HTML del PDF (buildPaginaRigheHtml sull'anteprima già
             * calcolata in templateEditorState.ctx) rimpicciolito con zoom, non un semplice numero —
             * così si vede a colpo d'occhio come si sta riempiendo ogni pagina. Richiudibile con
             * btnToggleTemplatePagesPreview per chi preferisce la fila compatta di sempre. */
            /** Toglie alle miniature ogni attributo con cui potrebbero essere SCAMBIATE per il
             * foglio vero.
             *
             * Bug segnalato: "se apro le anteprime, il blocco della correlazione perde la
             * visualizzazione, così come la tabella dettagliata parametri". Erano proprio i due
             * blocchi lunghi, cioè gli unici la cui resa dipende da una MISURA DAL VIVO del DOM.
             *
             * Causa: ogni miniatura è una copia completa dell'HTML della pagina — `id` e
             * `data-block-id` compresi. Finché la striscia è chiusa quelle copie non esistono;
             * appena la si apre, il documento contiene di colpo N copie di ogni blocco. Da lì in
             * poi un `document.getElementById(...)` o un `document.querySelector('[data-block-id=
             * "x"]')` può rispondere con una MINIATURA invece che col blocco sul foglio — e le
             * miniature vivono dentro uno `zoom: 0.181`, quindi ogni altezza misurata lì è cinque
             * volte più piccola del vero. Il taglio dei blocchi lunghi, che si basa esattamente su
             * quelle misure, decideva quindi tagli assurdi e il contenuto spariva dalla vista pur
             * restando nel blocco.
             *
             * La soluzione non è correggere la singola query che sbagliava — sono una ventina, e
             * la prossima che qualcuno scriverà ricadrebbe nella stessa trappola. Si toglie invece
             * l'ambiguità alla radice: nelle miniature quegli attributi vengono rinominati, così
             * NESSUNA ricerca può più confonderle col foglio. Le miniature non ne perdono niente:
             * sono immagini inerti, nessuno le interroga per id (il click passa dal
             * `data-page-idx` del contenitore, che sta fuori da questo HTML).
             */
            function neutralizzaIdentificatoriMiniatura(html) {
                if (!html) return html;
                return String(html)
                    .replace(/\sid="/g, ' data-mini-id="')
                    .replace(/\sdata-block-id="/g, ' data-mini-block-id="')
                    .replace(/\sdata-item-id="/g, ' data-mini-item-id="')
                    .replace(/\sdata-entry-id="/g, ' data-mini-entry-id="');
            }

            function renderTemplateEditorPagesStrip() {
                const el = document.getElementById('templateEditorPagesStrip');
                if (!el) return;
                const espansa = templateEditorState.pagesStripExpanded !== false;
                // Da espanso il cassetto esce dal flusso e si sovrappone al foglio invece di
                // rubargli altezza (vedi .tpl-editor-pages-drawer.espanso). La classe la mette chi
                // disegna la striscia, così non può andare fuori sincrono con quello che mostra.
                const cassetto = document.getElementById('templateEditorPagesDrawer');
                if (cassetto) {
                    cassetto.classList.toggle('espanso', espansa);
                    // La barra si sovrappone al foglio (per non farlo saltare quando la apri), ma
                    // così ne copriva il fondo e non c'era modo di vederlo. Segnalato: "non mi fa
                    // più vedere il fondo della pagina".
                    // Si aggiunge quindi altrettanto spazio SCORREVOLE sotto al foglio: la barra
                    // resta sovrapposta, e il foglio può scorrere fin sopra di lei.
                    // Lo spazio va sul contenitore del foglio, non come padding del riquadro: il
                    // padding entra nel clientHeight e falserebbe lo zoom "adatta alla finestra",
                    // che proprio su quella misura si calcola.
                    requestAnimationFrame(() => {
                        const outer = document.getElementById('templateEditorScaleOuter');
                        if (!outer) return;
                        const alta = cassetto.getBoundingClientRect().height;
                        outer.style.marginBottom = (alta > 0 ? Math.round(alta + 12) : 0) + 'px';
                    });
                    // Larghezza reale della colonna degli strumenti, così il cassetto può partire
                    // dopo di lei invece di coprirla. Si misura invece di scriverla a mano perché
                    // cambia con lo schermo, e su mobile la colonna non c'è affatto (lì il cassetto
                    // parte da bordo a bordo, ed è giusto così).
                    const strumenti = document.getElementById('templateEditorPaletteSidebar');
                    const larghezzaStrumenti = (strumenti && strumenti.offsetParent !== null && getComputedStyle(strumenti).position !== 'fixed')
                        ? strumenti.getBoundingClientRect().width + 12
                        : 0;
                    cassetto.style.setProperty('--tpl-larghezza-strumenti', Math.round(larghezzaStrumenti) + 'px');
                }
                const iconaToggle = document.getElementById('iconToggleTemplatePagesPreview');
                if (iconaToggle) iconaToggle.style.transform = espansa ? 'rotate(0deg)' : 'rotate(-90deg)';
                const selMode = !!templateEditorState.pageSelectionMode;
                const selezionate = templateEditorState.selectedPageIndices || [];

                // Barra "N pagine selezionate / Elimina / Annulla": compare SOPRA la filmstrip solo
                // in modalità selezione (tocco prolungato su una miniatura, non un trascinamento).
                const barraSel = document.getElementById('templateEditorPageSelectionBar');
                if (barraSel) {
                    // Animazione di comparsa (richiesta esplicitamente, proprio questa barra come
                    // esempio) SOLO quando appare da nascosta — riavviata togliendo e rimettendo la
                    // classe con un reflow in mezzo (altrimenti il browser non la rigioca la volta
                    // successiva, visto che la classe resterebbe già presente da prima).
                    if (selMode && barraSel.style.display !== 'flex') {
                        barraSel.classList.remove('tpl-editor-anim-in');
                        void barraSel.offsetWidth;
                        barraSel.classList.add('tpl-editor-anim-in');
                    }
                    barraSel.style.display = selMode ? 'flex' : 'none';
                    const lbl = document.getElementById('lblPageSelectionCount');
                    if (lbl) lbl.textContent = selezionate.length === 1 ? '1 pagina selezionata' : `${selezionate.length} pagine selezionate`;
                    // "Seleziona tutti" diventa "Deseleziona tutti" quando sono già tutte spuntate —
                    // richiesto esplicitamente per velocizzare l'eliminazione di più pagine in blocco.
                    const btnSelAll = document.getElementById('btnSelectAllPages');
                    if (btnSelAll) btnSelAll.textContent = (selezionate.length >= templateEditorState.pages.length) ? 'Deseleziona tutti' : 'Seleziona tutti';
                }

                if (espansa && templateEditorState.ctx) {
                    aggiornaCtxFotoEditor();
                    const totalPages = templateEditorState.pages.length;
                    el.innerHTML = templateEditorState.pages.map((p, idx) => {
                        const isAttiva = idx === templateEditorState.activePageIdx;
                        const isSel = selezionate.includes(idx);
                        let miniHtml = '';
                        try {
                            // Una pagina di continuazione non ha righe proprie: buildPaginaRigheHtml
                            // (la stessa funzione usata anche per l'export reale, dove queste pagine
                            // non esistono affatto — vedi salvaTemplateEditor) la renderizzerebbe
                            // vuota. miniaturaPaginaContinuazione costruisce invece l'anteprima giusta
                            // direttamente dal contenuto del blocco che continua.
                            miniHtml = p.continuaBloccoId
                                ? miniaturaPaginaContinuazione(p)
                                : buildPaginaRigheHtml(p, templateEditorState.ctx, idx + 1, totalPages, true, templateEditorState.margins, undefined, undefined, templateEditorState.headerEnabled, templateEditorState.footerEnabled);
                        } catch (err) {
                            // Prima veniva ingoiato in silenzio (miniHtml = '', miniatura vuota
                            // indistinguibile da "pagina davvero vuota") — bug segnalato: un blocco
                            // che risultava vuoto senza nessun indizio del perché. Ora l'errore reale
                            // resta visibile in console per poterlo diagnosticare, e la miniatura lo
                            // segnala esplicitamente invece di sembrare semplicemente vuota.
                            console.error('[renderTemplateEditorPagesStrip] Errore nel render della miniatura pagina', idx, err);
                            miniHtml = `<div style="padding:8px; font-size:9px; color:#dc2626; text-align:center;">errore anteprima</div>`;
                        }
                        miniHtml = neutralizzaIdentificatoriMiniatura(miniHtml);
                        // FASE D (vedi Piano_Riscrittura_Layout_Export.md): confronto reale, calcolato
                        // da verificaPagineOrigineControMotoreReale eseguendo DAVVERO il motore di
                        // export su questa pagina — mai su una pagina di continuazione (mai un pageDef
                        // reale a sé, vedi salvaTemplateEditor). Se il PDF produrrà un numero diverso
                        // di pagine fisiche da quello mostrato qui, l'utente lo vede súbito sulla
                        // miniatura invece di scoprirlo solo aprendo il PDF finale.
                        const verificaPagina = !p.continuaBloccoId ? (templateEditorState.verificaPagineReali && templateEditorState.verificaPagineReali[p.id]) : null;
                        const avvisoDisallineamento = (verificaPagina && verificaPagina.disallineato) ? `<span title="In stampa questa pagina occuperà davvero ${verificaPagina.paginePreviste} pagin${verificaPagina.paginePreviste === 1 ? 'a' : 'e'} fisic${verificaPagina.paginePreviste === 1 ? 'a' : 'he'} (misurato), non ${verificaPagina.paginaCanvasCount} come mostrato qui — apri il menu del blocco flowable per aggiungere un'interruzione, o accetta che continuerà da sola." style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:#dc2626; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 4px rgba(0,0,0,0.4);"><svg class="ico" style="width:12px; height:12px; color:#fff;"><use href="#i-alert"/></svg></span>` : '';
                        return `
                            <div class="tpl-editor-page-thumb" data-page-idx="${idx}" style="position:relative; flex-shrink:0; width:38mm; height:53.7mm; border-radius:6px; overflow:hidden; cursor:${selMode ? 'pointer' : 'grab'}; background:#fff; border:2px solid ${(verificaPagina && verificaPagina.disallineato) ? '#dc2626' : (isSel ? 'var(--accent)' : (isAttiva ? 'var(--accent)' : 'var(--border)'))}; box-shadow:0 1px 5px rgba(0,0,0,0.3);">
                                <div style="width:210mm; zoom:0.181;">${miniHtml}</div>
                                ${selMode ? `<span class="tpl-editor-page-check${isSel ? ' checked' : ''}" style="position:absolute; top:4px; right:4px;"></span>` : `<span class="tpl-editor-page-drag-handle" title="Trascina per riordinare" style="position:absolute; top:4px; left:4px; width:22px; height:22px;"><svg class="ico" style="width:14px; height:14px;"><use href="#i-grip"/></svg></span>`}
                                ${selMode ? '' : avvisoDisallineamento}
                                <span style="position:absolute; bottom:0; left:0; right:0; background:rgba(15,23,42,0.72); color:#fff; font-size:8.5px; font-weight:800; text-align:center; padding:2px 0;">${p.continuaBloccoId ? 'continua' : 'Pagina'} ${idx + 1}</span>
                            </div>
                        `;
                    }).join('') + `<button type="button" id="btnAddPageEditor" class="btn-icon" title="Nuova pagina" style="flex-shrink:0; align-self:center;"><svg class="ico"><use href="#i-plus"/></svg></button>`;
                    el.querySelectorAll('.tpl-editor-page-thumb').forEach(thumb => {
                        thumb.addEventListener('click', (e) => {
                            if (templateEditorState.pageSelectionMode) return;
                            if (paginaDragAppenaFinita) return;
                            cambiaPaginaEditor(parseInt(thumb.dataset.pageIdx, 10));
                        });
                    });
                } else {
                    el.innerHTML = templateEditorState.pages.map((p, idx) => {
                        const isAttiva = idx === templateEditorState.activePageIdx;
                        const isSel = selezionate.includes(idx);
                        // FASE D: stesso confronto reale della miniatura sopra, versione compatta.
                        const verificaPagina = !p.continuaBloccoId ? (templateEditorState.verificaPagineReali && templateEditorState.verificaPagineReali[p.id]) : null;
                        const avvisoDisallineamento = (verificaPagina && verificaPagina.disallineato) ? `<svg class="ico" style="width:12px; height:12px; color:#dc2626; flex-shrink:0;" title="In stampa questa pagina occuperà davvero ${verificaPagina.paginePreviste} pagin${verificaPagina.paginePreviste === 1 ? 'a' : 'e'} fisic${verificaPagina.paginePreviste === 1 ? 'a' : 'he'} (misurato), non ${verificaPagina.paginaCanvasCount} come qui"><use href="#i-alert"/></svg>` : '';
                        return `
                            <div class="tpl-editor-page-tab" data-page-idx="${idx}" style="display:flex; align-items:center; gap:6px; padding:5px 9px; border-radius:6px; font-size:11.5px; font-weight:700; cursor:${selMode ? 'pointer' : 'grab'}; flex-shrink:0; background:${isAttiva ? 'var(--accent)' : 'var(--bg-main)'}; color:${isAttiva ? 'var(--on-accent)' : 'var(--text-main)'}; border:1px solid ${(verificaPagina && verificaPagina.disallineato) ? '#dc2626' : (isSel ? 'var(--accent)' : (isAttiva ? 'var(--accent)' : 'var(--border)'))};">
                                ${selMode ? `<span class="tpl-editor-page-check${isSel ? ' checked' : ''}" style="position:static; width:14px; height:14px;"></span>` : `<span class="tpl-editor-page-drag-handle" title="Trascina per riordinare"><svg class="ico"><use href="#i-grip"/></svg></span>`}
                                ${p.continuaBloccoId ? `Pagina ${idx + 1} · continua` : `Pagina ${idx + 1}`}
                                ${selMode ? '' : avvisoDisallineamento}
                            </div>
                        `;
                    }).join('') + `<button type="button" id="btnAddPageEditor" class="btn-icon" title="Nuova pagina" style="flex-shrink:0;"><svg class="ico"><use href="#i-plus"/></svg></button>`;
                    el.querySelectorAll('.tpl-editor-page-tab').forEach(tab => {
                        tab.addEventListener('click', (e) => {
                            if (templateEditorState.pageSelectionMode) return;
                            if (paginaDragAppenaFinita) return;
                            cambiaPaginaEditor(parseInt(tab.dataset.pageIdx, 10));
                        });
                    });
                }

                // Riordino pagine tenendo premuto e trascinando (stesso elemento sia in modalità
                // miniature che schede compatte, un solo binding per entrambe) — MA solo quando non
                // si è già in modalità selezione: lì un tocco qualunque spunta/deseleziona invece,
                // niente trascinamento, niente ambiguità tra i due gesti.
                el.querySelectorAll('.tpl-editor-page-thumb, .tpl-editor-page-tab').forEach(item => {
                    const idx = parseInt(item.dataset.pageIdx, 10);
                    item.addEventListener('pointerdown', (e) => {
                        if (e.pointerType === 'mouse' && e.button !== 0) return;
                        if (templateEditorState.pageSelectionMode) return;
                        // Una pagina di continuazione (vedi sincronizzaFlussiBlocchiLunghi) non si
                        // trascina né si seleziona per l'eliminazione manuale: è gestita
                        // interamente in automatico, spostarla via da qui la scollegherebbe dalla
                        // sua pagina di origine senza che l'app se ne accorga.
                        const paginaQui = templateEditorState.pages[idx];
                        if (paginaQui && paginaQui.continuaBloccoId) return;
                        paginaDragStato = {
                            pointerId: e.pointerId, fromIdx: idx,
                            startX: e.clientX, startY: e.clientY, moved: false,
                            targetIdx: idx, el: item, stripEl: el,
                            // Tenuto premuto SENZA spostarsi: dopo ~480ms si entra in modalità
                            // selezione multipla invece di continuare ad aspettare un trascinamento —
                            // esattamente "tocco prolungato, non trascinamento" come richiesto.
                            longPressTimer: setTimeout(() => {
                                if (!paginaDragStato || paginaDragStato.pointerId !== e.pointerId || paginaDragStato.moved) return;
                                paginaDragStato = null;
                                triggerVibrate(12);
                                attivaModalitaSelezionePagine(idx);
                                // Il tocco è ancora "giù": il pointerup che arriverà tra un attimo per
                                // QUESTO stesso tocco non deve spuntare/de-spuntare la pagina appena
                                // selezionata dal long-press, altrimenti resterebbe subito deselezionata
                                // (il bug segnalato: tenendo premuto su una sola pagina si deselezionava).
                                pointerIdAttivazioneSelezionePagine = e.pointerId;
                            }, 480)
                        };
                        // SOLO col mouse: catturare il puntatore col dito impedirebbe al browser di
                        // trasformare questo stesso trascinamento in uno scorrimento nativo della
                        // striscia (touch-action:pan-x sul corpo della card, vedi CSS) — segnalato
                        // esplicitamente ("permettimi di scorrere anche toccando sopra le pagine
                        // trascinando"). Col dito il riordino resta disponibile solo dalla maniglia
                        // dedicata qui sotto (.tpl-editor-page-drag-handle), che cattura per conto suo.
                        if (e.pointerType !== 'touch') item.setPointerCapture(e.pointerId);
                    });
                    item.addEventListener('pointermove', (e) => {
                        if (!paginaDragStato || paginaDragStato.pointerId !== e.pointerId) return;
                        gestisciSpostamentoPaginaEditor(e);
                    });
                    item.addEventListener('pointerup', (e) => {
                        if (templateEditorState.pageSelectionMode) {
                            if (pointerIdAttivazioneSelezionePagine === e.pointerId) {
                                pointerIdAttivazioneSelezionePagine = null;
                                return;
                            }
                            togglePaginaSelezionata(idx);
                            return;
                        }
                        if (!paginaDragStato || paginaDragStato.pointerId !== e.pointerId) return;
                        clearTimeout(paginaDragStato.longPressTimer);
                        terminaRiordinoPagineEditor();
                    });
                    item.addEventListener('pointercancel', (e) => {
                        if (pointerIdAttivazioneSelezionePagine === e.pointerId) pointerIdAttivazioneSelezionePagine = null;
                        if (!paginaDragStato) return;
                        clearTimeout(paginaDragStato.longPressTimer);
                        if (paginaDragStato.el) paginaDragStato.el.classList.remove('tpl-editor-page-drag-active');
                        paginaDragStato = null;
                        nascondiIndicatoreRiordinoPagine();
                    });

                    // Maniglia dedicata: unico modo, col dito, per avviare davvero il riordino —
                    // segnale esplicito e inequivocabile (niente ambiguità con lo scorrimento della
                    // striscia o col tocco prolungato che seleziona). Parte già in modalità "spostato"
                    // (moved:true) per dare un riscontro immediato, senza aspettare la soglia dei 6px
                    // usata dal trascinamento via mouse sul corpo della card.
                    const handle = item.querySelector('.tpl-editor-page-drag-handle');
                    if (handle) {
                        handle.addEventListener('pointerdown', (e) => {
                            if (e.pointerType === 'mouse' && e.button !== 0) return;
                            if (templateEditorState.pageSelectionMode) return;
                            e.stopPropagation();
                            e.preventDefault();
                            paginaDragStato = {
                                pointerId: e.pointerId, fromIdx: idx,
                                startX: e.clientX, startY: e.clientY, moved: true,
                                targetIdx: idx, el: item, stripEl: el, longPressTimer: null
                            };
                            item.classList.add('tpl-editor-page-drag-active');
                            handle.setPointerCapture(e.pointerId);
                            triggerVibrate(10);
                        });
                        handle.addEventListener('pointermove', (e) => {
                            if (!paginaDragStato || paginaDragStato.pointerId !== e.pointerId) return;
                            gestisciSpostamentoPaginaEditor(e);
                        });
                        const fineHandle = (e) => {
                            if (!paginaDragStato || paginaDragStato.pointerId !== e.pointerId) return;
                            clearTimeout(paginaDragStato.longPressTimer);
                            terminaRiordinoPagineEditor();
                        };
                        handle.addEventListener('pointerup', fineHandle);
                        handle.addEventListener('pointercancel', fineHandle);
                    }
                });

                const btnAdd = document.getElementById('btnAddPageEditor');
                if (btnAdd) btnAdd.addEventListener('click', aggiungiPaginaEditor);
            }

            /** Entra in modalità selezione multipla pagine (tocco prolungato su una miniatura senza
             * trascinarla): la pagina toccata parte già spuntata, le altre si aggiungono toccandole
             * — sostituisce la vecchia crocetta di eliminazione rapida su ogni singola pagina. */
            function attivaModalitaSelezionePagine(idxIniziale) {
                templateEditorState.pageSelectionMode = true;
                templateEditorState.selectedPageIndices = [idxIniziale];
                renderTemplateEditorPagesStrip();
            }
            function togglePaginaSelezionata(idx) {
                const sel = templateEditorState.selectedPageIndices;
                const pos = sel.indexOf(idx);
                if (pos >= 0) sel.splice(pos, 1); else sel.push(idx);
                if (sel.length === 0) { esciModalitaSelezionePagine(); return; }
                renderTemplateEditorPagesStrip();
            }
            function esciModalitaSelezionePagine() {
                templateEditorState.pageSelectionMode = false;
                templateEditorState.selectedPageIndices = [];
                renderTemplateEditorPagesStrip();
            }
            /** Elimina in blocco le pagine selezionate, dopo una finestra di conferma che elenca i
             * numeri di pagina coinvolti (richiesto esplicitamente) — un solo snapshot undo per
             * tutta l'operazione, non uno per pagina. Se erano selezionate TUTTE le pagine del
             * template (es. con "Seleziona tutti"), invece di bloccare l'eliminazione se ne crea
             * automaticamente una nuova vuota al posto delle vecchie — richiesto esplicitamente,
             * un template non può restare senza nessuna pagina. */
            async function eliminaPagineSelezionateEditor() {
                const indici = (templateEditorState.selectedPageIndices || []).slice().sort((a, b) => a - b);
                if (indici.length === 0) return;
                const eliminaTutte = indici.length >= templateEditorState.pages.length;
                const elenco = indici.map(i => i + 1).join(', ');
                const messaggio = indici.length === 1 ? `Eliminare la pagina ${elenco}?` : `Eliminare le pagine ${elenco}?`;
                const ok = await appConfirmDelete(messaggio);
                if (!ok) return;
                salvaUndoSnapshotEditor();
                // Dalla fine verso l'inizio: eliminare prima un indice più basso sposterebbe tutti
                // quelli successivi, invalidando gli indici ancora da togliere in questo stesso giro.
                const unaDiPrima = templateEditorState.pages[0];
                indici.slice().reverse().forEach(i => templateEditorState.pages.splice(i, 1));
                if (eliminaTutte) {
                    // Con «Usa per tutte le pagine» la pagina che resta tiene l'intestazione.
                    templateEditorState.pages.push(nuovaPaginaVuota());
                    allineaIntestazioniEditor(unaDiPrima);
                }
                if (templateEditorState.activePageIdx >= templateEditorState.pages.length) {
                    templateEditorState.activePageIdx = templateEditorState.pages.length - 1;
                }
                templateEditorState.pageSelectionMode = false;
                templateEditorState.selectedPageIndices = [];
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
            }
            const btnDeleteSelectedPages = document.getElementById('btnDeleteSelectedPages');
            if (btnDeleteSelectedPages) btnDeleteSelectedPages.addEventListener('click', eliminaPagineSelezionateEditor);
            const btnCancelPageSelection = document.getElementById('btnCancelPageSelection');
            if (btnCancelPageSelection) btnCancelPageSelection.addEventListener('click', esciModalitaSelezionePagine);
            // "Seleziona tutti" (richiesto esplicitamente): spunta in un colpo solo tutte le pagine
            // della striscia — o le desunta tutte se erano già tutte spuntate (vedi il testo del
            // bottone che si aggiorna in renderTemplateEditorPagesStrip).
            const btnSelectAllPages = document.getElementById('btnSelectAllPages');
            if (btnSelectAllPages) {
                btnSelectAllPages.addEventListener('click', () => {
                    const tutte = templateEditorState.pages.map((_, i) => i);
                    const eranoGiaTutte = (templateEditorState.selectedPageIndices || []).length >= templateEditorState.pages.length;
                    templateEditorState.selectedPageIndices = eranoGiaTutte ? [] : tutte;
                    if (templateEditorState.selectedPageIndices.length === 0) { esciModalitaSelezionePagine(); return; }
                    renderTemplateEditorPagesStrip();
                });
            }

            // Riordino pagine tenendo premuto e trascinando (richiesto esplicitamente): sotto una
            // piccola soglia di movimento resta un semplice click (cambia pagina, comportamento
            // storico invariato) — solo superata la soglia si passa alla modalità trascinamento, che
            // aggiorna solo un indicatore visivo invece di muovere il DOM a ogni pixel (un solo
            // re-render alla fine, al rilascio, come per il drag&drop dei blocchi nel canvas).
            let paginaDragStato = null;
            let paginaDragAppenaFinita = false;
            let pointerIdAttivazioneSelezionePagine = null;

            function gestisciSpostamentoPaginaEditor(e) {
                const stato = paginaDragStato;
                if (!stato.moved) {
                    if (Math.abs(e.clientX - stato.startX) < 6 && Math.abs(e.clientY - stato.startY) < 6) return;
                    stato.moved = true;
                    clearTimeout(stato.longPressTimer);
                    stato.el.classList.add('tpl-editor-page-drag-active');
                }
                // Tra le voci pagina attuali, quella su cui si trova il puntatore decide se
                // l'inserimento andrebbe prima o dopo di essa in base a quale metà si sta
                // sorvolando — stesso principio "magnetico" del drag&drop dei blocchi nel canvas.
                const voci = Array.from(stato.stripEl.querySelectorAll('.tpl-editor-page-thumb, .tpl-editor-page-tab'));
                let target = voci.length;
                for (let i = 0; i < voci.length; i++) {
                    const r = voci[i].getBoundingClientRect();
                    if (e.clientX < r.left + r.width / 2) { target = i; break; }
                }
                stato.targetIdx = target;
                mostraIndicatoreRiordinoPagine(voci, target, stato.stripEl);
            }

            function mostraIndicatoreRiordinoPagine(voci, targetIdx, stripEl) {
                let ind = document.getElementById('templateEditorPageReorderIndicator');
                if (!ind) {
                    ind = document.createElement('div');
                    ind.id = 'templateEditorPageReorderIndicator';
                    ind.style.position = 'absolute';
                    ind.style.top = '0';
                    ind.style.bottom = '0';
                    ind.style.width = '3px';
                    ind.style.background = 'var(--accent)';
                    ind.style.borderRadius = '2px';
                    ind.style.zIndex = '3';
                    ind.style.pointerEvents = 'none';
                    stripEl.appendChild(ind);
                }
                const stripRect = stripEl.getBoundingClientRect();
                let x;
                if (targetIdx < voci.length) {
                    const r = voci[targetIdx].getBoundingClientRect();
                    x = r.left - stripRect.left + stripEl.scrollLeft - 4;
                } else if (voci.length > 0) {
                    const r = voci[voci.length - 1].getBoundingClientRect();
                    x = r.right - stripRect.left + stripEl.scrollLeft + 4;
                } else {
                    x = 0;
                }
                ind.style.left = x + 'px';
                ind.style.display = 'block';
            }

            function nascondiIndicatoreRiordinoPagine() {
                const ind = document.getElementById('templateEditorPageReorderIndicator');
                if (ind) ind.remove();
            }

            function terminaRiordinoPagineEditor() {
                const stato = paginaDragStato;
                paginaDragStato = null;
                if (!stato) return;
                nascondiIndicatoreRiordinoPagine();
                if (stato.el) stato.el.classList.remove('tpl-editor-page-drag-active');
                if (!stato.moved) return; // click semplice: lo gestisce già il listener 'click' storico
                // Il 'click' sintetico che il browser genera comunque dopo un pointerup con
                // movimento non deve far cambiare pagina inaspettatamente: i listener 'click'
                // controllano questo flag ed escono subito se è appena avvenuto un vero trascinamento.
                paginaDragAppenaFinita = true;
                setTimeout(() => { paginaDragAppenaFinita = false; }, 0);

                const from = stato.fromIdx;
                let target = stato.targetIdx;
                if (target === from || target === from + 1) return; // nessuno spostamento reale
                salvaUndoSnapshotEditor();
                const pagine = templateEditorState.pages;
                const [pagina] = pagine.splice(from, 1);
                const nuovoIndice = target > from ? target - 1 : target;
                pagine.splice(nuovoIndice, 0, pagina);
                // La pagina attiva deve "seguire" il proprio contenuto: se era quella spostata,
                // resta attiva alla nuova posizione; altrimenti si ricalcola l'indice solo se lo
                // spostamento ha attraversato la posizione della pagina attiva.
                if (templateEditorState.activePageIdx === from) {
                    templateEditorState.activePageIdx = nuovoIndice;
                } else if (from < templateEditorState.activePageIdx && nuovoIndice >= templateEditorState.activePageIdx) {
                    templateEditorState.activePageIdx--;
                } else if (from > templateEditorState.activePageIdx && nuovoIndice <= templateEditorState.activePageIdx) {
                    templateEditorState.activePageIdx++;
                }
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
            }

            /** Apre/chiude la striscia delle anteprime pagina. Estratta dal gestore del bottone
             * perché ora ha DUE chiamanti — il bottone e il tocco fuori — e la parte delicata non
             * è cambiare il flag: è tutto quello che viene dopo (rimisurare lo zoom, riportare lo
             * scorrimento in cima, rilanciare l'animazione). Due copie di quella coda sarebbero due
             * posti in cui dimenticare una correzione. */
            function impostaAnteprimePagineEspanse(espansa) {
                if ((templateEditorState.pagesStripExpanded !== false) === espansa) return;
                templateEditorState.pagesStripExpanded = espansa;
                aggiornaAnteprimePagineDopoCambioAltezza();
            }
            function aggiornaAnteprimePagineDopoCambioAltezza() {
                    renderTemplateEditorPagesStrip();
                    // Rimisura il foglio dopo il cambio: da qui in poi l'altezza del riquadro non
                    // dovrebbe più cambiare (il cassetto si sovrappone), ma chiudendolo il flusso
                    // torna a includerlo e lo zoom "adatta alla finestra" va ricalcolato — senza,
                    // resterebbe quello di prima e il foglio non riempirebbe lo spazio riguadagnato.
                    adattaScalaEditorCanvas();
                    // E riporta lo sguardo in cima al foglio. Segnalato: aprendo le anteprime "il
                    // contenuto viene sobbalzato fuori dalla porzione visibile". La diagnostica ha
                    // mostrato che il contenuto c'è ed è alto: quindi non spariva, restava sopra il
                    // bordo. Cambiando l'altezza del riquadro, lo scorrimento in pixel salvato
                    // prima non punta più allo stesso posto sul foglio — e su un blocco lungo
                    // bastano poche decine di pixel perché la parte piena finisca fuori e resti in
                    // vista solo la coda bianca.
                    const viewportEditor = document.getElementById('templateEditorViewport');
                    if (viewportEditor) viewportEditor.scrollTop = 0;
                    const strip = document.getElementById('templateEditorPagesStrip');
                    if (strip) {
                        strip.classList.remove('tpl-pagestrip-anim');
                        void strip.offsetWidth;
                        strip.classList.add('tpl-pagestrip-anim');
                        strip.addEventListener('animationend', function fine() {
                            strip.classList.remove('tpl-pagestrip-anim');
                            strip.removeEventListener('animationend', fine);
                        });
                    }
            }
            const btnToggleTemplatePagesPreview = document.getElementById('btnToggleTemplatePagesPreview');
            if (btnToggleTemplatePagesPreview) {
                btnToggleTemplatePagesPreview.addEventListener('click', () => {
                    impostaAnteprimePagineEspanse(!(templateEditorState.pagesStripExpanded !== false));
                });
            }

            function cambiaPaginaEditor(idx) {
                // Niente da fare se è già la pagina attiva (richiesto esplicitamente dopo un bug:
                // premere due volte lo stesso riquadro pagina rilanciava per intero la pipeline
                // render+sincronizzaFlussiBlocchiLunghi una seconda volta, inutilmente costosa e
                // rischiosa — ogni click sullo stesso riquadro tornava comunque alla stessa pagina).
                if (idx === templateEditorState.activePageIdx) return;
                templateEditorState.activePageIdx = idx;
                // Le maniglie dirette/etichetta sono ancorate a un blocco di QUESTA pagina: cambiando
                // pagina l'id selezionato non troverebbe più corrispondenza a video, meglio deselezionare
                // esplicitamente (e chiudere l'eventuale menu contestuale ancora aperto).
                templateEditorState.selectedBlockId = null;
                chiudiMenuBloccoEditor();
                nascondiManigliePaginaEditor();
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderSuggerimentiLayoutEditor();
                // Un velo di opacità sul foglio appena disegnato: senza, la pagina 3 diventava la 4
                // senza il minimo stacco e non si capiva se il tocco avesse fatto qualcosa.
                // SOLO opacità, mai uno scorrimento: il foglio è la zona misurata (vincolo n.1).
                // La classe si toglie da sola con un timer, non con animationend — se la scheda
                // passa in background quell'evento non arriva e la classe resterebbe addosso.
                const foglioCambiato = document.getElementById('templateEditorCanvas');
                if (foglioCambiato) {
                    foglioCambiato.classList.remove('tpl-pagina-cambiata');
                    void foglioCambiato.offsetWidth;
                    foglioCambiato.classList.add('tpl-pagina-cambiata');
                    setTimeout(() => foglioCambiato.classList.remove('tpl-pagina-cambiata'), 400);
                }
            }
            function eliminaPaginaEditor(idx) {
                if (templateEditorState.pages.length <= 1) return;
                salvaUndoSnapshotEditor();
                templateEditorState.pages.splice(idx, 1);
                templateEditorState.selectedBlockId = null;
                chiudiMenuBloccoEditor();
                if (templateEditorState.activePageIdx >= templateEditorState.pages.length) {
                    templateEditorState.activePageIdx = templateEditorState.pages.length - 1;
                }
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
                renderSuggerimentiLayoutEditor();
            }
            function aggiungiPaginaEditor() {
                salvaUndoSnapshotEditor();
                templateEditorState.pages.push(nuovaPaginaVuota());
                allineaIntestazioniEditor(templateEditorState.pages[0]);
                templateEditorState.activePageIdx = templateEditorState.pages.length - 1;
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
            }

            const modalTemplateEditorOverlay = document.getElementById('modalTemplateEditorOverlay');
            const modalTemplateEditor = document.getElementById('modalTemplateEditor');

            /** Cronologia undo dell'editor: uno snapshot JSON di "pages" prima di ogni azione
             * strutturale (colSpan, scala, font, rimozione, drag&drop, pagine, intestazione/piè —
             * NON ad ogni battuta nei campi di testo, altrimenti lo stack si riempirebbe di un'entry
             * per lettera). JSON.stringify/parse invece di uno structuredClone perché "pages" è
             * dati puri (nessuna funzione/riferimento circolare) ed è già il pattern usato altrove
             * in questo file per i clonaggi profondi. */
            function salvaUndoSnapshotEditor() {
                if (!templateEditorState.undoStack) templateEditorState.undoStack = [];
                templateEditorState.undoStack.push(JSON.stringify(templateEditorState.pages));
                if (templateEditorState.undoStack.length > 30) templateEditorState.undoStack.shift();
                // Una modifica nuova apre un ramo nuovo: quello che si era annullato non si può più
                // ripetere, perché verrebbe riapplicato sopra uno stato diverso da quello da cui era
                // stato tolto. Si mette da parte invece di buttarlo subito: se questo snapshot viene
                // ritirato senza che nulla sia cambiato (vedi scartaUltimoSnapshotEditor), anche la
                // possibilità di ripetere deve tornare com'era.
                templateEditorState.redoStackScartato = templateEditorState.redoStack || [];
                templateEditorState.redoStack = [];
                aggiornaBottoneUndoEditor();
                // Le pagine di continuazione sono ora FISSE (richiesto esplicitamente: "devono
                // diventare 5 pagine, fisse e modificabili solo quando la lunghezza del blocco viene
                // modificata o vengono aggiunti nuovi blocchi") — sincronizzaFlussiBlocchiLunghi NON
                // gira più ad ogni render, solo quando qualcosa che potrebbe cambiare l'impaginazione
                // sta per essere modificato. salvaUndoSnapshotEditor è chiamata da OGNI azione
                // strutturale del genere prima di mutare lo stato (vedi il commento sopra la sua
                // definizione), quindi è il punto giusto, unico e già universale per marcare "serve
                // ricalcolare" — vedi il render tail di renderTemplateEditorCanvas.
                templateEditorState.flowSyncNecessario = true;
            }
            /** L'inverso esatto di salvaUndoSnapshotEditor, per chi l'ha chiamata e poi scopre di non
             * poter procedere: toglie lo snapshot in cima SENZA ripristinarlo (le pagine non sono state
             * ancora toccate) e rimette la cronologia di Ripeti che quello snapshot aveva chiuso.
             * Senza, un'azione rifiutata sul nascere cancellerebbe in silenzio la possibilità di
             * ripetere: l'effetto di una cosa che non è mai successa. */
            function scartaUltimoSnapshotEditor() {
                const stack = templateEditorState.undoStack;
                if (!stack || stack.length === 0) return null;
                const snapshot = stack.pop();
                templateEditorState.redoStack = templateEditorState.redoStackScartato || [];
                templateEditorState.redoStackScartato = [];
                aggiornaBottoneUndoEditor();
                return snapshot;
            }
            /** Annulla l'ultima azione strutturale, e la rende ripetibile con Ripeti.
             * Con { senzaTraccia: true } non è l'Annulla dell'utente ma un ritiro di servizio: chi la
             * chiama sta ritirando un'azione rimasta a metà (piazzamento rinunciato, affiancamento
             * fallito), quindi lo stato da cui si parte non è un documento da poter "ripetere" — e la
             * cronologia di Ripeti torna com'era prima di quell'azione, come se non fosse cominciata.
             * Vale lo stesso, senza bisogno di chiederlo, quando c'è un blocco in mano: prenderlo ha
             * salvato uno snapshot e lo ha tolto dalle pagine, quindi lo stato attuale ha quel blocco
             * FUORI dal foglio. Metterlo in Ripeti vorrebbe dire che ripetere lo fa sparire. */
            function undoTemplateEditor(opzioni) {
                const stack = templateEditorState.undoStack;
                if (!stack || stack.length === 0) return;
                const senzaTraccia = !!(opzioni && opzioni.senzaTraccia) || !!templateEditorState.bloccoInSpostamento;
                let snapshot;
                if (senzaTraccia) {
                    snapshot = scartaUltimoSnapshotEditor();
                } else {
                    snapshot = stack.pop();
                    if (!templateEditorState.redoStack) templateEditorState.redoStack = [];
                    templateEditorState.redoStack.push(JSON.stringify(templateEditorState.pages));
                }
                ripristinaPagineEditor(snapshot);
            }
            /** Ripeti: il simmetrico di undoTemplateEditor. Lo stato attuale torna in cima alla pila di
             * Annulla, così Annulla e Ripeti si alternano quante volte si vuole — ma SENZA passare da
             * salvaUndoSnapshotEditor, che per definizione chiude proprio il ramo di Ripeti che si sta
             * percorrendo. Prima questa funzione non esisteva: c'era solo Annulla. */
            function redoTemplateEditor() {
                const stack = templateEditorState.redoStack;
                if (!stack || stack.length === 0) return;
                const snapshot = stack.pop();
                if (!templateEditorState.undoStack) templateEditorState.undoStack = [];
                templateEditorState.undoStack.push(JSON.stringify(templateEditorState.pages));
                if (templateEditorState.undoStack.length > 30) templateEditorState.undoStack.shift();
                ripristinaPagineEditor(snapshot);
            }
            /** Parte comune di Annulla e Ripeti: rimette "pages" da uno snapshot e ridisegna. */
            function ripristinaPagineEditor(snapshot) {
                // Uno snapshot messo da parte si può restituire solo a quello che lo aveva chiuso:
                // dopo un Annulla o un Ripeti in cima alla pila c'è un altro snapshot, e ridargli la
                // cronologia di un altro sarebbe sbagliato.
                templateEditorState.redoStackScartato = [];
                // Se c'è un blocco in spostamento va LASCIATO CADERE, non rimesso a posto: lo snapshot è
                // stato salvato PRIMA che lo prendessi, quindi quel blocco è già dentro le pagine
                // che stiamo per ripristinare. Rimetterlo anche dalla mano lo farebbe comparire due
                // volte — due oggetti con lo stesso id, cioè il guasto che tutta questa funzione è
                // costruita per non poter produrre.
                templateEditorState.bloccoInSpostamento = null;
                templateEditorState.pages = JSON.parse(snapshot);
                if (templateEditorState.activePageIdx >= templateEditorState.pages.length) {
                    templateEditorState.activePageIdx = Math.max(0, templateEditorState.pages.length - 1);
                }
                // Annulla e Ripeti sostituiscono "pages" per intero SENZA passare da salvaUndoSnapshotEditor
                // (giustamente: un undo non deve salvare un nuovo snapshot undo di se stesso) — va
                // quindi marcato esplicitamente qui, altrimenti dopo un annulla le pagine di
                // continuazione resterebbero quelle (magari non più valide) del momento in cui è
                // stato aperto il menu, invece di essere ricalcolate sullo stato appena ripristinato.
                templateEditorState.flowSyncNecessario = true;
                renderTemplateEditorPagesStrip();
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderTemplateEditorPalette();
                renderBarraSpostamento();
                aggiornaBottoneUndoEditor();
                renderSuggerimentiLayoutEditor();
            }
            function aggiornaBottoneUndoEditor() {
                const btn = document.getElementById('btnUndoTemplateEditor');
                if (btn) btn.disabled = !(templateEditorState.undoStack && templateEditorState.undoStack.length > 0);
                const btnRipeti = document.getElementById('btnRedoTemplateEditor');
                if (btnRipeti) btnRipeti.disabled = !(templateEditorState.redoStack && templateEditorState.redoStack.length > 0);
            }
            // Avvolti in una funzione e non passati diretti: il gestore riceverebbe l'evento del clic
            // come primo argomento, cioè al posto delle opzioni di undoTemplateEditor.
            const btnUndoTemplateEditor = document.getElementById('btnUndoTemplateEditor');
            if (btnUndoTemplateEditor) btnUndoTemplateEditor.addEventListener('click', () => undoTemplateEditor());
            const btnRedoTemplateEditor = document.getElementById('btnRedoTemplateEditor');
            if (btnRedoTemplateEditor) btnRedoTemplateEditor.addEventListener('click', () => redoTemplateEditor());
            // Scorciatoie da tastiera, solo quando l'editor template è davvero aperto (non deve
            // rubare l'undo nativo di un campo di testo altrove nell'app). Esc è gestita qui invece
            // che dal chiudi-generico (modalTemplateEditor è in MODALS_NO_QUICK_CLOSE apposta),
            // perché deve comunque passare dalla richiesta di conferma se ci sono modifiche non
            // salvate, non chiudere silenziosamente.
            document.addEventListener('keydown', (e) => {
                if (!modalTemplateEditor || !modalTemplateEditor.classList.contains('open')) return;
                // (e.key || ''): Chrome manda keydown senza "key" quando l'utente sceglie un
                // suggerimento di compilazione automatica, e .toLowerCase() su undefined lancerebbe.
                const tastoMod = e.ctrlKey || e.metaKey;
                const tasto = (e.key || '').toLowerCase();
                if (tastoMod && !e.shiftKey && tasto === 'z') {
                    e.preventDefault();
                    undoTemplateEditor();
                    return;
                }
                // Ripeti: Ctrl+Y (Windows) e Ctrl/⌘+Maiusc+Z (Mac e quasi tutti gli editor) — tutte e
                // due, perché ognuno ha in mano quella del sistema da cui arriva.
                if (tastoMod && ((e.shiftKey && tasto === 'z') || (!e.shiftKey && tasto === 'y'))) {
                    e.preventDefault();
                    redoTemplateEditor();
                    return;
                }
                if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    richiediChiusuraTemplateEditor();
                }
            });

            /** Margini di default del foglio (mm): usati quando un template non ne ha ancora di
             * propri (salvato prima che questa funzione esistesse) — stessi valori che erano fissi
             * ovunque in precedenza, così nessun template esistente cambia aspetto finché l'utente
             * non li tocca esplicitamente con le maniglie (vedi renderManigliePaginaEditor). */
            function marginiPaginaDiDefault() { return { top: 14, bottom: 14, left: 12, right: 12 }; }

