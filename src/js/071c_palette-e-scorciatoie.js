            // L'OMNIBAR (Ctrl K) E LA GUIDA DELLE SCORCIATOIE (?), prototipo PC passo 4.
            // Una casella sola nella barra in alto per cercare TUTTO: i comandi di adesso, i progetti,
            // le prove di ogni progetto, il testo delle note, gli strati del progetto aperto,
            // l'archivio litologico, i template di report e le impostazioni. La guida mostra i
            // comandi coi loro tasti, dallo stesso elenco.
            // Comando: [gruppo, etichetta, tasto, azione, adesso, icona].
            function comandiPc() {
                const vista = (state.uiState && state.uiState.currentView) || 'home';
                const conProgetto = vista !== 'home' && !!(state.projects || {})[state.currentProjectId];
                const inProva = vista === 'field';
                const pid = () => state.currentProjectId;
                const clicSu = id => () => document.getElementById(id).click();
                return [
                    ['Ovunque', 'Cerca ovunque', 'Ctrl K', null, false, 'i-search'],
                    ['Ovunque', 'Guida e scorciatoie', '?', apriScorciatoie, true, 'i-info'],
                    ['Ovunque', 'Chiudi la finestra o il menu', 'Esc', null, false, 'i-x'],
                    ['Ovunque', 'Annulla l\'ultima azione', 'Ctrl Z', annullaAzione, cronologia().indietro.length > 0, 'i-undo'],
                    ['Ovunque', 'Ripeti l\'azione annullata', 'Ctrl Y', ripetiAzione, cronologia().avanti.length > 0, 'i-redo'],
                    ['Ovunque', 'Vai ai progetti', '', () => switchView('home'), vista !== 'home', 'i-home'],
                    ['Ovunque', 'Nuovo progetto', '', openNewProjectModal, true, 'i-plus'],
                    ['Ovunque', 'Ricevi un progetto', '', clicSu('btnHomeImportProject'), true, 'i-upload'],
                    ['Ovunque', 'Impostazioni', '', openDrawer, true, 'i-settings'],
                    ['Ovunque', 'Alterna tema chiaro e scuro', '', clicSu('btnThemeToggle'), true, 'i-moon'],
                    ['Ovunque', 'Template di report', '', clicSu('btnOpenReportTemplatesHome'), true, 'i-layout-pagina'],
                    ['Ovunque', 'Archivio litologico', '', clicSu('btnOpenArchiveManagerHome'), true, 'i-database'],
                    ['Ovunque', 'Backup completo dell\'archivio', '', () => openBackupChoiceModal({ type: 'global' }), true, 'i-file'],
                    ['Ovunque', 'Copie automatiche e cronologia', '', () => apriCronologia(null), true, 'i-reset'],
                    ['Progetto', 'Schermata del progetto', '', () => switchView('project'), conProgetto && vista !== 'project', 'i-folder-open'],
                    ['Progetto', 'Consegna', 'Ctrl E', clicSu('pcBtnConsegna'), conProgetto, 'i-download'],
                    ['Progetto', 'Dati del progetto', '', openCantiereInfoModal, conProgetto, 'i-building'],
                    ['Progetto', 'Azioni del progetto', '', () => openProjectActionsModal(pid()), conProgetto, 'i-more'],
                    ['Progetto', 'Strati e parametri', '', openStratiModal, conProgetto, 'i-layers'],
                    ['Progetto', 'Note del progetto', '', () => apriNoteProgetto(pid()), conProgetto, 'i-note'],
                    ['Progetto', 'Nuova prova', '', openNewSurveyModal, conProgetto, 'i-plus'],
                    ['Progetto', 'Confronto tra prove', '', () => apriConfrontoProve(pid()), conProgetto, 'i-chart'],
                    ['Progetto', 'Mappa del progetto', '', apriMappaProgetto, conProgetto, 'i-map'],
                    ['Progetto', 'Terreno e sezioni (DTM)', '', apriTerreno, conProgetto, 'i-activity'],
                    ['Progetto', 'Trova il DTM', '', () => apriTrovaDtm(pid()), conProgetto, 'i-satellite'],
                    ['Progetto', 'Sezione tra le prove', '', apriSezione, conProgetto, 'i-shape-line-h'],
                    ['Progetto', 'Vista 3D del terreno', '', apriVista3d, conProgetto, 'i-stack'],
                    ['Progetto', 'Esporta per GIS', '', () => apriEsportaGis(), conProgetto, 'i-pin'],
                    ['Progetto', 'Porta il progetto su un altro dispositivo', '', () => apriPortaProgetto(pid()), conProgetto, 'i-upload'],
                    ['Progetto', 'Cronologia del progetto', '', () => apriCronologia(pid()), conProgetto, 'i-reset'],
                    ['Prova', 'Aggiungi intervalli', 'Ctrl I', openBulkImportModal, inProva, 'i-list'],
                    ['Prova', 'Falda', 'F', openQuickFaldaModal, inProva, 'i-droplet'],
                    ['Prova', 'Foto della prova', '', clicSu('btnOpenSurveyPhotosModal'), inProva, 'i-camera'],
                    ['Prova', 'Posizione GPS', '', clicSu('btnGetGpsHeader'), inProva, 'i-satellite'],
                    ['Prova', 'Dati della prova', '', () => openSurveySettingsModal(state.currentSurveyId, 'dati'), inProva, 'i-clipboard'],
                    ['Prova', 'Strumento della prova', '', () => openSurveySettingsModal(state.currentSurveyId, 'strumento'), inProva, 'i-ruler'],
                    ['Contatore sul PC', 'Accendi o spegni il contatore', 'C', interruttoreContatorePc, inProva, 'i-target'],
                    ['Contatore sul PC', 'Un colpo', 'Spazio', null, false],
                    ['Contatore sul PC', 'Togli un colpo', 'Backspace', null, false],
                    ['Contatore sul PC', 'Registra l\'intervallo', 'Invio', null, false],
                    ['Registro', 'Scegli la riga sopra o sotto', '↑ ↓', null, false],
                    ['Registro', 'Modifica la riga scelta', 'F2 o Invio', null, false],
                    ['Registro', 'Azioni sulla riga', 'Tasto destro', null, false],
                    ['Registro', 'Elimina la riga scelta', 'Canc', null, false]
                ];
            }

            const omnibar = document.getElementById('omnibar');
            const campoOmni = document.getElementById('txtPalette');
            const listaOmni = document.getElementById('listaPalette');
            const veloOmni = document.getElementById('omnibarVelo');
            if (/Mac|iPhone|iPad/.test(navigator.platform || '')) document.getElementById('omnibarTasto').textContent = '⌘ K';

            let vociPalette = [], vocePalette = 0;
            const omnibarAperta = () => omnibar.classList.contains('aperta');

            // Il testo delle note, ricavato una volta per versione della nota: si cerca a ogni tasto.
            const testoNoteCache = new Map();
            function testoNote(proj) {
                const html = proj && proj.notes && proj.notes.html;
                if (!html) return '';
                let t = testoNoteCache.get(html);
                if (t == null) {
                    t = noteHtmlToPlainText(html).replace(/\s+/g, ' ').trim();
                    if (testoNoteCache.size > 200) testoNoteCache.clear();
                    testoNoteCache.set(html, t);
                }
                return t;
            }

            function apriProvaOvunque(projId, survId) {
                if (projId === state.currentProjectId) return apriDalLato(null, survId);
                morphProva(() => { saveState(); syncProjectToActiveState(projId, survId); switchView('field'); });
            }

            // Porta il cursore su un'impostazione del cassetto e la fa lampeggiare.
            function vaiAImpostazione(el) {
                openDrawer();
                const riga = el.closest('.setting-row') || el.closest('.drawer-section') || el;
                setTimeout(() => {
                    if (riga.scrollIntoView) riga.scrollIntoView({ block: 'center', behavior: 'smooth' });
                    riga.classList.remove('omnibar-trovata');
                    void riga.offsetWidth;
                    riga.classList.add('omnibar-trovata');
                    setTimeout(() => riga.classList.remove('omnibar-trovata'), 1800);
                }, 60);
            }

            /** Tutto ciò che si può cercare adesso. Voce: {tipo, gruppo, etichetta, sotto, cerca, tasto,
             * icona, azione}. Con la casella vuota solo comandi di adesso, progetti recenti e prove
             * del progetto aperto; scrivendo, tutto il resto. */
            function vociOmnibar(q) {
                const vista = (state.uiState && state.uiState.currentView) || 'home';
                const progetti = state.projects || {};
                const aperto = vista !== 'home' ? progetti[state.currentProjectId] : null;
                const nomeProgetto = p => p.name || p.comune || 'Progetto';
                const voci = [];
                const nomiGruppo = { Prova: 'Questa prova', 'Contatore sul PC': 'Contatore', Progetto: 'Questo progetto', Ovunque: 'Comandi' };

                // Prima i comandi del punto in cui si è (la prova, poi il progetto), poi quelli di ovunque.
                const rango = { Prova: 0, 'Contatore sul PC': 1, Progetto: 2, Ovunque: 3 };
                comandiPc().map((c, i) => [c, i]).sort((a, b) => (rango[a[0][0]] ?? 4) - (rango[b[0][0]] ?? 4) || a[1] - b[1]).forEach(([c]) => {
                    if (c[3] && c[4]) voci.push({ tipo: 'comando', gruppo: nomiGruppo[c[0]] || c[0], etichetta: c[1], tasto: c[2], icona: c[5] || 'i-sparkles', azione: c[3] });
                    else if (q && !c[3] && c[2]) voci.push({ tipo: 'tasto', gruppo: 'Scorciatoie', etichetta: c[1], sotto: c[0], tasto: c[2], icona: 'i-info', azione: apriScorciatoie });
                });

                // Lo stesso ordine della Home e della barra laterale (menu «Ordina»).
                const ids = ordinaProgetti(Object.keys(progetti), progetti, ordineProgettiScelto());
                (q ? ids : ids.slice(0, 6)).forEach(id => {
                    const p = progetti[id];
                    const prove = Object.values(p.surveys || {}).map(s => [(s.header || {}).localita, (s.header || {}).comune].join(' ')).join(' ');
                    voci.push({ tipo: 'progetto', gruppo: 'Progetti', etichetta: nomeProgetto(p),
                        sotto: [p.comune, p.committente].filter(Boolean).join(' · '),
                        cerca: [p.localita, p.operator, p.date, prove].join(' '), icona: 'i-folder', azione: () => apriDalLato(id) });
                });

                // Prove: prima quelle del progetto aperto, poi (scrivendo) quelle di ogni altro progetto.
                const provaNr = s => String((s.header || {}).provaNr || '?');
                const proveDi = (id, gruppo) => Object.values(progetti[id].surveys || {})
                    .sort((a, b) => provaNr(a).localeCompare(provaNr(b), 'it', { numeric: true }))
                    .forEach(s => {
                        const h = s.header || {};
                        voci.push({ tipo: 'prova', gruppo, etichetta: 'Prova ' + provaNr(s),
                            sotto: [id !== state.currentProjectId || !aperto ? nomeProgetto(progetti[id]) : '', h.localita, h.date].filter(Boolean).join(' · '),
                            cerca: [h.comune, h.committente, nomeProgetto(progetti[id])].join(' '), icona: 'i-target', azione: () => apriProvaOvunque(id, s.id) });
                    });
                if (aperto) proveDi(state.currentProjectId, 'Prove di ' + nomeProgetto(aperto));
                if (!q) return voci;
                ids.filter(id => !aperto || id !== state.currentProjectId).forEach(id => proveDi(id, aperto ? 'Prove degli altri progetti' : 'Prove'));

                // Note: il punto in cui compare la parola, con un pezzo di frase attorno.
                if (q.length >= 2) ids.forEach(id => {
                    const testo = testoNote(progetti[id]);
                    const norm = normalizzaPerRicerca(testo);
                    const i = norm.indexOf(q);
                    if (i < 0) return;
                    const da = Math.max(0, i - 28), a = Math.min(testo.length, i + q.length + 48);
                    voci.push({ tipo: 'nota', gruppo: 'Nelle note', etichetta: (da > 0 ? '…' : '') + testo.slice(da, a) + (a < testo.length ? '…' : ''),
                        sotto: nomeProgetto(progetti[id]), icona: 'i-note', soloContiene: true,
                        azione: async () => { await apriNoteProgetto(id); if (typeof apriRicercaNote === 'function') apriRicercaNote(campoOmni.dataset.cercato || ''); } });
                });

                if (aperto) ((vista === 'field' ? state.strati : aperto.strati) || aperto.strati || []).forEach(st => {
                    if (st && st.name) voci.push({ tipo: 'strato', gruppo: 'Strati del progetto', etichetta: st.name, icona: 'i-layers', azione: openStratiModal });
                });
                Object.values(state.lithologyArchive || {}).forEach(a => {
                    if (!a || !a.name) return;
                    voci.push({ tipo: 'archivio', gruppo: 'Archivio litologico', etichetta: a.name, icona: 'i-database', azione: () => {
                        openArchiveManager();
                        const c = document.getElementById('txtArchiveSearch');
                        if (c) { c.value = a.name; c.dispatchEvent(new Event('input')); }
                    } });
                });
                Object.keys(state.reportTemplates || {}).forEach(tid => {
                    const tpl = state.reportTemplates[tid];
                    voci.push({ tipo: 'template', gruppo: 'Template di report', etichetta: (tpl && tpl.name) || 'Template', sotto: 'Apri nell\'editor', icona: 'i-layout-pagina', azione: () => apriTemplateEditor(tid) });
                });
                document.querySelectorAll('#drawerMenu .setting-label, #drawerMenu .drawer-section-title').forEach(el => {
                    const nome = el.textContent.trim();
                    if (!nome) return;
                    const sezione = el.closest('.drawer-section');
                    const titolo = sezione && sezione.querySelector('.drawer-section-title');
                    const desc = el.closest('.setting-row') && el.closest('.setting-row').querySelector('.setting-desc');
                    voci.push({ tipo: 'impostazione', gruppo: 'Impostazioni', etichetta: nome,
                        sotto: titolo && titolo !== el ? titolo.textContent.trim() : 'Sezione', cerca: desc ? desc.textContent : '',
                        icona: 'i-settings', azione: () => vaiAImpostazione(el) });
                });
                return voci;
            }

            // Quanto una voce corrisponde: tutte le parole devono esserci, poi conta dove.
            function punteggioVoce(v, q, parole) {
                const nome = normalizzaPerRicerca(v.etichetta);
                const tutto = nome + ' ' + normalizzaPerRicerca([v.sotto, v.cerca, v.gruppo].join(' '));
                if (!parole.every(p => tutto.includes(p))) return 0;
                if (v.soloContiene) return 30;
                if (nome === q) return 100;
                if (nome.startsWith(q)) return 85;
                if (new RegExp('(^|[^a-z0-9])' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).test(nome)) return 70;
                if (nome.includes(q)) return 60;
                if (parole.every(p => nome.includes(p))) return 45;
                return 25;
            }

            function evidenzia(testo, parole) {
                const esc = escapeHtmlDidascalia;
                if (!parole.length) return esc(testo);
                // Lavora sul testo senza accenti per trovare le posizioni, poi le applica all'originale.
                const norm = Array.from(testo).map(ch => normalizzaPerRicerca(ch) || ch).join('');
                if (norm.length !== testo.length) return esc(testo);
                const segni = new Array(testo.length).fill(false);
                parole.forEach(p => { let i = norm.indexOf(p); while (i >= 0) { for (let k = i; k < i + p.length; k++) segni[k] = true; i = norm.indexOf(p, i + p.length); } });
                let html = '', dentro = false;
                for (let i = 0; i < testo.length; i++) {
                    if (segni[i] !== dentro) { html += segni[i] ? '<mark>' : '</mark>'; dentro = segni[i]; }
                    html += esc(testo[i]);
                }
                return html + (dentro ? '</mark>' : '');
            }

            const PER_GRUPPO = 8;
            function renderPalette() {
                const q = normalizzaPerRicerca(campoOmni.value).replace(/\s+/g, ' ');
                const parole = q.split(' ').filter(Boolean);
                campoOmni.dataset.cercato = campoOmni.value.trim();
                omnibar.classList.toggle('con-testo', !!q);
                const tutte = vociOmnibar(q);
                // Gruppi: con la casella vuota nell'ordine naturale; scrivendo, prima il gruppo col
                // risultato migliore, e dentro ogni gruppo le voci migliori in alto.
                const gruppi = [], perNome = {};
                tutte.forEach((v, ordine) => {
                    const punti = q ? punteggioVoce(v, q, parole) : 1;
                    if (!punti) return;
                    let g = perNome[v.gruppo];
                    if (!g) { g = perNome[v.gruppo] = { nome: v.gruppo, voci: [], meglio: 0, ordine }; gruppi.push(g); }
                    g.voci.push({ v, punti, ordine });
                    g.meglio = Math.max(g.meglio, punti);
                });
                if (q) {
                    gruppi.sort((a, b) => b.meglio - a.meglio || a.ordine - b.ordine);
                    gruppi.forEach(g => g.voci.sort((a, b) => b.punti - a.punti || a.ordine - b.ordine));
                }
                vociPalette = [];
                let html = '';
                gruppi.forEach(g => {
                    const visibili = q ? g.voci.slice(0, PER_GRUPPO) : g.voci;
                    const altre = g.voci.length - visibili.length;
                    html += `<div class="omnibar-gruppo" role="presentation">${escapeHtmlDidascalia(g.nome)}${altre > 0 ? `<span>altri ${altre}: scrivi di più per trovarli</span>` : ''}</div>`;
                    visibili.forEach(({ v }) => {
                        const i = vociPalette.push(v) - 1;
                        html += `<button type="button" role="option" id="omni-${i}" data-i="${i}" data-tipo="${v.tipo}"${i === vocePalette ? ' aria-selected="true"' : ''}>`
                            + `<svg class="ico" aria-hidden="true"><use href="#${v.icona}"/></svg>`
                            + `<span>${evidenzia(v.etichetta, parole)}</span>`
                            + (v.sotto ? `<small>${evidenzia(v.sotto, parole)}</small>` : '')
                            + (v.tasto ? `<kbd>${escapeHtmlDidascalia(v.tasto)}</kbd>` : '')
                            + '</button>';
                    });
                });
                vocePalette = Math.min(vocePalette, Math.max(0, vociPalette.length - 1));
                listaOmni.innerHTML = vociPalette.length ? html
                    : '<div class="palette-vuota">Niente con queste parole. Prova con un\'altra, o apri la guida col tasto ?</div>';
                segnaVoceScelta();
            }

            function segnaVoceScelta(scorri) {
                listaOmni.querySelectorAll('[aria-selected]').forEach(b => b.removeAttribute('aria-selected'));
                const b = listaOmni.querySelector(`[data-i="${vocePalette}"]`);
                if (b) {
                    b.setAttribute('aria-selected', 'true');
                    campoOmni.setAttribute('aria-activedescendant', b.id);
                    if (scorri && b.scrollIntoView) b.scrollIntoView({ block: 'nearest' });
                } else campoOmni.removeAttribute('aria-activedescendant');
            }

            function apriPalette() {
                if (!omnibarAperta()) {
                    closeAnyOpenModal();
                    vocePalette = 0;
                    omnibar.classList.add('aperta', 'appena-aperta');
                    document.getElementById('pcBarra').classList.add('omnibar-attiva');
                    veloOmni.classList.add('open');
                    campoOmni.setAttribute('aria-expanded', 'true');
                    renderPalette();
                }
                if (document.activeElement !== campoOmni) campoOmni.focus();
                campoOmni.select();
            }

            function chiudiPalette() {
                if (!omnibarAperta()) return;
                omnibar.classList.remove('aperta', 'appena-aperta', 'con-testo');
                document.getElementById('pcBarra').classList.remove('omnibar-attiva');
                veloOmni.classList.remove('open');
                campoOmni.setAttribute('aria-expanded', 'false');
                campoOmni.removeAttribute('aria-activedescendant');
                campoOmni.value = '';
                if (document.activeElement === campoOmni) campoOmni.blur();
            }

            function eseguiVocePalette(i, daTastiera) {
                const v = vociPalette[i];
                if (!v) return;
                // Con Invio non c'è un clic: si dice al morph (071v) da dove far crescere la finestra.
                const riga = daTastiera && listaOmni.querySelector(`[data-i="${i}"]`);
                if (riga) try { ultimoTocco = { r: riga.getBoundingClientRect(), t: performance.now() }; } catch (_) { /* senza morph */ }
                chiudiPalette();
                closeAnyOpenModal();
                v.azione();
            }

            function apriScorciatoie() {
                chiudiPalette();
                const gruppi = {};
                comandiPc().filter(c => c[2]).forEach(c => (gruppi[c[0]] = gruppi[c[0]] || []).push(c));
                document.getElementById('gruppiScorciatoie').innerHTML = Object.keys(gruppi).map(g => `<section><h3>${g}</h3>${gruppi[g].map(c => `<div><span>${c[1]}</span><kbd>${c[2]}</kbd></div>`).join('')}</section>`).join('');
                closeAnyOpenModal();
                document.getElementById('modalScorciatoieOverlay').classList.add('open');
                document.getElementById('modalScorciatoie').classList.add('open');
            }

            campoOmni.addEventListener('focus', apriPalette);
            // Le righe entrano una dopo l'altra solo all'apertura: scrivendo si aggiornano e basta.
            campoOmni.addEventListener('input', () => { if (!omnibarAperta()) apriPalette(); omnibar.classList.remove('appena-aperta'); vocePalette = 0; renderPalette(); });
            campoOmni.addEventListener('keydown', (e) => {
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    e.preventDefault();
                    const n = vociPalette.length;
                    if (n) vocePalette = (vocePalette + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
                    segnaVoceScelta(true);
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    eseguiVocePalette(vocePalette, true);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    chiudiPalette();
                }
            });
            // Il clic su una voce non deve togliere il cursore dalla casella prima di essere letto.
            document.getElementById('omnibarPannello').addEventListener('mousedown', (e) => e.preventDefault());
            listaOmni.addEventListener('click', (e) => {
                const b = e.target.closest('[data-i]');
                if (b) eseguiVocePalette(Number(b.dataset.i));
            });
            listaOmni.addEventListener('mousemove', (e) => {
                const b = e.target.closest('[data-i]');
                if (b && Number(b.dataset.i) !== vocePalette) { vocePalette = Number(b.dataset.i); segnaVoceScelta(); }
            });
            document.getElementById('omnibarPulisci').addEventListener('mousedown', (e) => {
                e.preventDefault();
                campoOmni.value = '';
                vocePalette = 0;
                renderPalette();
            });
            omnibar.addEventListener('focusout', (e) => { if (!omnibar.contains(e.relatedTarget)) chiudiPalette(); });
            veloOmni.addEventListener('click', chiudiPalette);

            document.addEventListener('keydown', (e) => {
                if (!suPc()) return;
                const k = e.key.toLowerCase();
                const ctrl = e.ctrlKey || e.metaKey;
                if (ctrl && k === 'k') {
                    e.preventDefault();
                    return omnibarAperta() ? chiudiPalette() : apriPalette();
                }
                if (document.querySelector('.modal.open, .drawer.open')) return;
                const vista = state.uiState.currentView;
                if (ctrl && k === 'e' && vista !== 'home') { e.preventDefault(); document.getElementById('pcBtnConsegna').click(); return; }
                if (ctrl && k === 'i' && vista === 'field') { e.preventDefault(); openBulkImportModal(); return; }
                if (ctrl || e.altKey || staScrivendo(e)) return;
                if (e.key === '?') { e.preventDefault(); apriScorciatoie(); }
                else if (k === 'f' && vista === 'field') { e.preventDefault(); openQuickFaldaModal(); }
            });
