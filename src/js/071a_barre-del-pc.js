            // BARRE DEL PC (prototipo PC, passo 1): percorso in alto, progetti e prove a sinistra,
            // aiuto e versione in basso. Solo da 1024 px; sul telefono restano nascoste.
            // Chiamata da switchView, updateUI e renderHomeProjects. Tutto dentro la funzione:
            // switchView gira anche all'avvio, prima che questo pezzo sia valutato.
            function renderPc() {
                if (!window.matchMedia('(min-width: 1024px)').matches) return;
                const vista = (state.uiState && state.uiState.currentView) || 'home';
                const progetti = state.projects || {};
                const proj = vista !== 'home' ? progetti[state.currentProjectId] : null;
                const esc = escapeHtmlDidascalia;
                const nomeProgetto = p => p.name || p.comune || 'Progetto';
                const provaNr = s => String((s.header || {}).provaNr || '?');

                const percorso = [['home', 'Progetti']];
                if (proj) percorso.push(['project', nomeProgetto(proj)]);
                if (proj && vista === 'field' && proj.surveys[state.currentSurveyId]) percorso.push(['field', 'Prova ' + provaNr(proj.surveys[state.currentSurveyId])]);
                document.getElementById('pcPercorso').innerHTML = percorso.map((p, i) => i === percorso.length - 1
                    ? `<li><span aria-current="page">${esc(p[1])}</span></li>`
                    : `<li><button type="button" data-vista="${p[0]}">${esc(p[1])}</button></li>`).join('');
                document.getElementById('pcBtnConsegna').style.display = proj ? '' : 'none';
                const btnContatore = document.getElementById('pcBtnContatore');
                btnContatore.style.display = vista === 'field' ? '' : 'none';
                btnContatore.setAttribute('aria-pressed', String(state.settings.contatoreSuPc === true));

                // Ogni voce ha due righe: il nome e, sotto, poche spie. Una spia spenta è un dato
                // che manca; il resto (committente, data, avvisi per esteso) sta nel suggerimento.
                const spia = (icona, testo, manca, titolo) => `<span class="pc-spia${manca ? ' manca' : ''}" title="${esc(titolo)}"><svg class="ico"><use href="#${icona}"/></svg>${testo}</span>`;
                const righe = ['<div class="pc-lato-titolo">Progetti</div>'];
                Object.keys(progetti).sort((a, b) => (progetti[b].updatedAt || 0) - (progetti[a].updatedAt || 0)).forEach(id => {
                    const p = progetti[id];
                    const aperto = id === state.currentProjectId && vista !== 'home';
                    const nome = nomeProgetto(p);
                    const stato = STATI_PROGETTO.find(x => x.id === p.stato);
                    const nProve = proveFisiche(Object.values(p.surveys || {})).length;
                    const note = String((p.notes && p.notes.html) || '');
                    const haNote = /<img/i.test(note) || note.replace(/<[^>]*>|&nbsp;/g, '').trim() !== '';
                    const info = [
                        stato ? `<span class="pc-stato-progetto" style="color: ${stato.colore};"><i style="background: ${stato.colore};"></i>${stato.etichetta}</span>` : '',
                        `${nProve} ${nProve === 1 ? 'prova' : 'prove'}`,
                        p.comune && !nome.includes(p.comune) ? esc(p.comune) : ''
                    ].filter(Boolean).join(' · ');
                    const titolo = [nome, p.comune, p.committente ? 'Committente: ' + p.committente : '', p.updatedAt ? 'Modificato il ' + dataBreve(p.updatedAt) : '', 'Tasto destro: azioni'].filter(Boolean).join('\n');
                    righe.push(`<button type="button" class="pc-voce" data-progetto="${esc(id)}" title="${esc(titolo)}"${aperto && vista === 'project' ? ' aria-current="page"' : ''}>
                        <span class="pc-voce-riga"><span class="pc-voce-nome">${esc(nome)}</span></span>
                        <span class="pc-voce-riga pc-voce-info"><span class="pc-voce-nome">${info}</span>${haNote ? spia('i-note', '', false, 'Ha delle note') : ''}</span>
                    </button>`);
                    if (!aperto) return;
                    // La prova aperta vive in state (il progetto si aggiorna al salvataggio): si legge da lì.
                    const prove = proveInOrdine(p).map(sv => sv.id === state.currentSurveyId ? { ...sv, header: state.header, logs: state.logs, photos: state.photos } : sv);
                    const avvisi = new Map(avvisiPrimaExport({ surveys: Object.fromEntries(prove.map(sv => [sv.id, sv])) }).map(r => [r.id, r.avvisi]));
                    prove.forEach(sv => {
                        const h = sv.header || {}, logs = sv.logs || [];
                        const fondo = logs.reduce((m, l) => Math.max(m, Number(l && l.end) || 0), 0);
                        const gps = isFinite(parseFloat(h.lat)) && isFinite(parseFloat(h.lng));
                        const nFoto = (sv.photos || []).length;
                        const nStrati = logs.filter(l => l && l.lithology).length;
                        const falda = parseFloat(h.faldaDa);
                        const nNote = logs.filter(l => l && String(l.note || '').trim()).length;
                        const daControllare = avvisi.get(sv.id) || [];
                        righe.push(`<button type="button" class="pc-voce pc-prova" data-prova="${esc(sv.id)}" title="${esc(['Prova ' + provaNr(sv), ...daControllare.map(a => '• ' + a.testo), 'Tasto destro: azioni'].join('\n'))}"${vista === 'field' && sv.id === state.currentSurveyId ? ' aria-current="page"' : ''}>
                        <span class="pc-voce-riga"><span class="pc-voce-nome">Prova ${esc(provaNr(sv))}</span>${daControllare.length ? `<i class="pc-avviso" aria-label="${daControllare.length} da controllare"></i>` : ''}<span class="pc-voce-prof">${numeroConVirgola(fondo)} m</span></span>
                        <span class="pc-voce-riga pc-voce-info">${[
                            spia('i-pin', '', !gps, gps ? 'GPS presente' : 'Senza GPS'),
                            spia('i-camera', nFoto, !nFoto, nFoto + ' foto'),
                            spia('i-stack', nStrati, !nStrati, nStrati + (nStrati === 1 ? ' strato' : ' strati')),
                            spia('i-droplet', isFinite(falda) ? numeroConVirgola(falda) : '', !isFinite(falda), isFinite(falda) ? 'Falda a ' + numeroConVirgola(falda) + ' m' : 'Falda non impostata'),
                            nNote ? spia('i-note', nNote, false, nNote + (nNote === 1 ? ' intervallo con nota' : ' intervalli con nota')) : ''
                        ].join('')}</span>
                    </button>`);
                    });
                });
                document.getElementById('pcLato').innerHTML = righe.join('');

                document.getElementById('pcStatoAiuto').textContent = {
                    home: 'Clic su un progetto per aprirlo · tasto destro: le sue azioni',
                    project: 'Clic su una prova per aprirla · tasto destro: le sue azioni',
                    field: state.settings.contatoreSuPc === true
                        ? 'Contatore: Spazio un colpo · Backspace toglie · Invio registra · F2 modifica la riga scelta · C spegne'
                        : 'Clic sceglie · doppio clic o Invio modifica · tasto destro: azioni · ↑ ↓ scorrono · Canc elimina'
                }[vista] + (vista === 'field' ? '' : ' · Esc chiude le finestre');
                document.getElementById('pcStatoVersione').textContent = 'Ctrl K comandi · Ctrl Z annulla · ? guida · DPSH ' + APP_VERSIONE;
                if (vista === 'field') forseGuidaRapida();
            }

            document.getElementById('pcPercorso').addEventListener('click', (e) => {
                const b = e.target.closest('[data-vista]');
                if (b) switchView(b.dataset.vista);
            });
            // Apre una prova del progetto aperto, o la schermata di un progetto. Serve anche alla palette.
            function apriDalLato(id, prova) {
                if (prova) {
                    if (prova !== state.currentSurveyId) { saveState(); syncProjectToActiveState(state.currentProjectId, prova); }
                    return switchView('field');
                }
                const surv = ultimaProvaUsata(state.projects[id]);
                if (!surv) return openProject(id, 'project'); // la ripara creando la prima prova
                if (id !== state.currentProjectId) { saveState(); syncProjectToActiveState(id, surv); }
                switchView('project');
            }
            document.getElementById('pcLato').addEventListener('click', (e) => {
                const b = e.target.closest('button');
                if (b) apriDalLato(b.dataset.progetto, b.dataset.prova);
            });
            document.getElementById('pcBtnConsegna').addEventListener('click', () => {
                if (state.uiState.currentView === 'field') document.getElementById('btnExportHeader').click();
                else openExportModal('project', state.currentProjectId);
            });
            document.getElementById('pcBtnImpostazioni').addEventListener('click', openDrawer);
            window.addEventListener('resize', renderPc);
