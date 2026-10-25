            // IL MORPH: dove una cosa diventa un'altra, la si vede trasformarsi invece di sparire e
            // ricomparire. Tre casi, tutti misurati sulle posizioni vere (niente di asincrono: le
            // schermate cambiano subito come prima, il movimento è solo sopra).
            //  1. Tra le schermate: il nome del progetto vola dalla riga della Home al titolo della scheda,
            //     «Prova N» dalla tabella al titolo della prova (e al contrario tornando indietro).
            //  2. Le finestre crescono dal tasto che le ha aperte.
            //  3. Nelle schede (Conta | Registro, Dati | Strumento, Mappa | 3D) il riquadro acceso scivola.
            // Col movimento ridotto le durate valgono 1 ms e qui non si muove niente.

            function durataMorph() {
                const d = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--mov-lungo')) || 0;
                return d >= 50 && Element.prototype.animate ? d : 0;
            }
            function curvaMorph() { return getComputedStyle(document.documentElement).getPropertyValue('--ease-entra').trim() || 'ease-out'; }

            // ---- 1. Tra le schermate ----
            /** Gli elementi che passano da una schermata all'altra, per nome. */
            function elementiMorph(vista) {
                if (vista === 'home') return { progetto: document.querySelector(`#homeProjectsContainer .card-progetto-apri[data-id="${state.currentProjectId}"] .card-progetto-nome`) };
                if (vista === 'project') return {
                    progetto: document.getElementById('lblProgettoNome'),
                    prova: document.querySelector(`#listaProveProgetto [data-surv="${state.currentSurveyId}"] .prova-riga-testo strong`)
                };
                if (vista === 'field') return { progetto: document.getElementById('lblSurveySub'), prova: document.getElementById('lblSurveySummary') };
                return {};
            }
            /** Prima del cambio: dove stanno ora. */
            function misuraMorph(vista) {
                const r = {};
                if (!durataMorph()) return r;
                Object.entries(elementiMorph(vista)).forEach(([k, el]) => {
                    const b = el && el.getBoundingClientRect();
                    if (b && b.width && b.height) r[k] = b;
                });
                return r;
            }
            /** Dopo il cambio: ognuno parte da dov'era e si posa al suo posto; quel che gli sta intorno
             * entra sfumando. Vero se ha mosso qualcosa dentro `vistaEl` (allora la schermata non entra
             * tutta insieme, o il nome partirebbe invisibile). */
            function eseguiMorph(sorgenti, vista, vistaEl) {
                const durata = durataMorph(), curva = curvaMorph();
                let dentro = false;
                if (!durata || !sorgenti) return false;
                const coppie = Object.entries(elementiMorph(vista)).filter(([k, el]) => el && sorgenti[k]);
                // Chi vola non sfuma, e nemmeno ciò che lo contiene.
                const vola = f => coppie.some(([, el]) => f.contains(el));
                coppie.forEach(([k, el]) => {
                    const r0 = sorgenti[k], r1 = el && el.getBoundingClientRect();
                    if (!r0 || !r1 || !r1.width || !r1.height) return;
                    const main = el.closest('main');
                    for (let n = el; n && n.parentElement && n.parentElement !== main; n = n.parentElement) {
                        n.getAnimations().forEach(a => a.cancel()); // un'entrata già partita lo terrebbe invisibile
                        [...n.parentElement.children].forEach(f => {
                            if (f !== n && !vola(f)) f.animate([{ opacity: 0, translate: '0 8px' }, { opacity: 1, translate: '0 0' }], { duration: durata, easing: curva, delay: durata * 0.25, fill: 'backwards' });
                        });
                        if (n.parentElement === vistaEl) dentro = true;
                    }
                    el.animate([
                        { transformOrigin: '0 0', transform: `translate(${r0.left - r1.left}px, ${r0.top - r1.top}px) scale(${r0.height / r1.height})` },
                        { transformOrigin: '0 0', transform: 'none' }
                    ], { duration: durata, easing: curva });
                });
                return dentro;
            }

            // ---- 2. Le finestre crescono dal tasto che le ha aperte ----
            let ultimoTocco = null;
            document.addEventListener('click', (e) => {
                const b = e.target.closest && e.target.closest('button, [role="menuitem"], .card-progetto-apri');
                ultimoTocco = b ? { r: b.getBoundingClientRect(), t: performance.now() } : null;
            }, true);
            function apriDalTasto(finestra) {
                const durata = durataMorph(), da = ultimoTocco;
                ultimoTocco = null;
                if (!durata || !da || performance.now() - da.t > 400 || !da.r.width) return;
                const r = finestra.getBoundingClientRect();
                const cx = da.r.left + da.r.width / 2, cy = da.r.top + da.r.height / 2;
                if (cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom) {
                    // Il tasto sta sotto la finestra (le schermate intere): si apre dal suo riquadro.
                    const inset = `${Math.max(0, da.r.top - r.top)}px ${Math.max(0, r.right - da.r.right)}px ${Math.max(0, r.bottom - da.r.bottom)}px ${Math.max(0, da.r.left - r.left)}px`;
                    finestra.animate([{ clipPath: `inset(${inset} round 10px)`, opacity: 0.6 }, { clipPath: 'inset(0px 0px 0px 0px round 0px)', opacity: 1 }], { duration: durata, easing: curvaMorph() });
                } else if (finestra.classList.contains('modal') && window.innerWidth > 760) {
                    // Le finestre al centro: partono grandi e messe come il tasto. Il punto d'arrivo è
                    // quello del CSS (translate(-50%, -50%)), così alla fine non c'è nessuno scatto.
                    const dx = cx - (r.left + r.width / 2), dy = cy - (r.top + r.height / 2);
                    const sx = Math.max(0.05, da.r.width / finestra.offsetWidth), sy = Math.max(0.05, da.r.height / finestra.offsetHeight);
                    finestra.animate([
                        { transform: `translate(-50%, -50%) translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, opacity: 0.4 },
                        { transform: 'translate(-50%, -50%) scale(1)', opacity: 1 }
                    ], { duration: durata, easing: curvaMorph() });
                }
            }

            // ---- 3. Il riquadro acceso delle schede scivola ----
            const SCHEDE_CON_CURSORE = '.schede-prova, .am-modi';
            function aggiornaCursore(gruppo) {
                const scelta = gruppo.querySelector(':scope > [aria-selected="true"]');
                if (!scelta || !gruppo.offsetWidth || !scelta.offsetWidth) { gruppo.classList.remove('con-cursore'); return; }
                gruppo.style.setProperty('--cx', scelta.offsetLeft + 'px');
                gruppo.style.setProperty('--cy', scelta.offsetTop + 'px');
                gruppo.style.setProperty('--cw', scelta.offsetWidth + 'px');
                gruppo.style.setProperty('--ch', scelta.offsetHeight + 'px');
                gruppo.classList.add('con-cursore');
            }
            const aggiornaCursori = (dentro) => (dentro || document).querySelectorAll(SCHEDE_CON_CURSORE).forEach(aggiornaCursore);

            // Un osservatore solo per i due casi: una scheda scelta, una finestra aperta.
            new MutationObserver(lista => {
                const gruppi = new Set();
                lista.forEach(m => {
                    const el = m.target;
                    if (m.attributeName === 'aria-selected') { const g = el.parentElement; if (g && g.matches(SCHEDE_CON_CURSORE)) gruppi.add(g); }
                    else if (el.classList.contains('open') && !String(m.oldValue || '').split(' ').includes('open') && (el.classList.contains('modal') || el.classList.contains('area-mappa'))) {
                        apriDalTasto(el);
                        requestAnimationFrame(() => aggiornaCursori(el));
                    }
                });
                gruppi.forEach(aggiornaCursore);
            }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['aria-selected', 'class'], attributeOldValue: true });
            window.addEventListener('resize', () => aggiornaCursori());
            aggiornaCursori();

            // ---- 4. Da una prova all'altra: ogni elemento si trasforma ----
            // Con le View Transitions del browser: prima del cambio si dà un nome a ogni pezzo della prova
            // (titolo, spie, percorso, voce accesa della barra, titolo e legenda del Registro e, riga per
            // riga, la riga, i colpi e la barra); dopo, gli stessi nomi ai pezzi della prova nuova. Il
            // browser porta ognuno dalla forma vecchia alla nuova: le barre si allungano o si accorciano,
            // le righe scivolano, la voce accesa della barra laterale corre alla prova nuova. Le righe in
            // più escono sfumando, quelle nuove entrano, in cascata. Senza View Transitions (o col
            // movimento ridotto) il cambio è quello di sempre, all'istante.
            const MORPH_PROVA_RIGHE = 60;
            function nominaMorphProva() {
                let usati = 0;
                const metti = (el, nome, classe) => {
                    if (!el || !el.getClientRects().length) return;
                    el.style.viewTransitionName = nome;
                    if (classe) el.style.viewTransitionClass = classe; // per le regole di uscita ed entrata (CSS)
                    el.setAttribute('data-morph-prova', '');
                    usati++;
                };
                metti(document.getElementById('lblSurveySummary'), 'mp-titolo');
                metti(document.getElementById('lblSurveySub'), 'mp-sotto');
                metti(document.getElementById('btnGetGpsHeader'), 'mp-gps');
                metti(document.getElementById('btnOpenSurveyPhotosModal'), 'mp-foto');
                metti(document.getElementById('btnOpenProjectNotesHeader'), 'mp-note');
                metti(document.querySelector('#pcPercorso li:last-child'), 'mp-percorso');
                metti(document.querySelector('#pcLato [aria-current]'), 'mp-lato');
                metti(document.querySelector('#surveySwitcherBar .attiva, #surveySwitcherBar [aria-current]'), 'mp-chip');
                metti(document.getElementById('lblIntegratedTotalSteps'), 'mp-reg-titolo');
                metti(document.getElementById('integratedLegendContainer'), 'mp-legenda');
                ['cardCounterDashboard', 'cardUltimiIntervalli', 'cardLogsTable', 'cardChart'].forEach(id => metti(document.getElementById(id), 'mp-' + id));
                const righe = [...document.querySelectorAll('#tblIntegratedLogsBody .swipe-row-wrapper')].slice(0, MORPH_PROVA_RIGHE);
                righe.forEach((r, i) => {
                    metti(r, 'mp-riga-' + i, 'mp-riga');
                    metti(r.querySelector('.swipe-content > div:nth-child(2)'), 'mp-colpi-' + i, 'mp-riga');
                    metti(r.querySelector('.int-bar-fill'), 'mp-barra-' + i, 'mp-riga');
                });
                return usati;
            }
            function togliNomiMorphProva() {
                document.querySelectorAll('[data-morph-prova]').forEach(el => { el.style.viewTransitionName = ''; el.style.viewTransitionClass = ''; el.removeAttribute('data-morph-prova'); });
            }
            // La cascata: ogni riga parte un poco dopo quella sopra (regole scritte una volta sola).
            (() => {
                const st = document.createElement('style');
                st.id = 'cascataMorphProva';
                let css = '';
                for (let i = 1; i < MORPH_PROVA_RIGHE; i++) {
                    const r = Math.min(i, 24) * 9;
                    css += `:root.morph-prova::view-transition-group(mp-riga-${i}),:root.morph-prova::view-transition-group(mp-colpi-${i}),:root.morph-prova::view-transition-group(mp-barra-${i}){animation-delay:${r}ms}`;
                    css += `:root.morph-prova::view-transition-old(mp-riga-${i}),:root.morph-prova::view-transition-new(mp-riga-${i}),:root.morph-prova::view-transition-old(mp-barra-${i}),:root.morph-prova::view-transition-new(mp-barra-${i}),:root.morph-prova::view-transition-old(mp-colpi-${i}),:root.morph-prova::view-transition-new(mp-colpi-${i}){animation-delay:${r}ms}`;
                }
                st.textContent = css;
                document.head.appendChild(st);
            })();
            /** Esegue il cambio di prova `cambia(conMorph)`; se si può, dentro una View Transition.
             * Vero se il cambio si anima (chi chiama allora salta i suoi lampeggi). */
            function morphProva(cambia) {
                const si = durataMorph() && typeof document.startViewTransition === 'function'
                    && state.uiState && state.uiState.currentView === 'field' && !document.querySelector('.modal.open');
                if (!si) { cambia(false); return false; }
                togliNomiMorphProva();
                nominaMorphProva();
                document.documentElement.classList.add('morph-prova');
                let vt;
                try {
                    vt = document.startViewTransition(() => {
                        togliNomiMorphProva();
                        try { cambia(true); } catch (e) { setTimeout(() => { throw e; }); }
                        nominaMorphProva();
                    });
                } catch (e) {
                    togliNomiMorphProva();
                    document.documentElement.classList.remove('morph-prova');
                    cambia(false);
                    return false;
                }
                const fine = () => { togliNomiMorphProva(); document.documentElement.classList.remove('morph-prova'); };
                vt.ready.catch(() => {});
                vt.finished.then(fine, fine);
                return true;
            }
