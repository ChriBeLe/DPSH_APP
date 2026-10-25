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
                    ? `<li><span aria-current="page" title="${esc(p[1])}">${esc(p[1])}</span></li>`
                    : `<li><button type="button" data-vista="${p[0]}" title="${esc(p[1])}">${esc(p[1])}</button></li>`).join('');
                document.getElementById('pcBtnConsegna').style.display = proj ? '' : 'none';
                const btnContatore = document.getElementById('pcBtnContatore');
                btnContatore.style.display = vista === 'field' ? '' : 'none';
                btnContatore.setAttribute('aria-pressed', String(state.settings.contatoreSuPc === true));

                // Ogni voce ha due righe: il nome e, sotto, poche spie. Una spia spenta è un dato
                // che manca; il resto (committente, data, avvisi per esteso) sta nel suggerimento.
                const spia = (icona, testo, manca, titolo) => `<span class="pc-spia${manca ? ' manca' : ''}" title="${esc(titolo)}"><svg class="ico"><use href="#${icona}"/></svg>${testo}</span>`;
                const righe = [];
                // Sulla Home l'elenco dei progetti è già al centro: la barra fa da pannello dei filtri
                // (gli stati, con quanti progetti ha ciascuno) e porta agli strumenti della Home.
                if (vista === 'home') {
                    const tutti = Object.values(progetti);
                    righe.push('<div class="pc-lato-titolo">Stato</div>');
                    [{ id: 'tutti', etichetta: 'Tutti' }, ...STATI_PROGETTO].forEach(st => {
                        const n = st.id === 'tutti' ? tutti.length : tutti.filter(p => p.stato === st.id).length;
                        righe.push(`<button type="button" class="pc-filtro" data-filtro="${st.id}"${filtroStatoProgetti === st.id ? ' aria-current="true"' : ''}>
                            <i style="background: ${st.colore || 'var(--text-muted)'};"></i><span class="pc-voce-nome">${st.etichetta}</span><span class="pc-filtro-n">${n}</span>
                        </button>`);
                    });
                    righe.push('<div class="pc-lato-titolo pc-lato-sezione">Strumenti</div>');
                    righe.push(`<button type="button" class="pc-filtro" data-strumento="btnOpenReportTemplatesHome"><svg class="ico"><use href="#i-file"/></svg><span class="pc-voce-nome">Template di report</span></button>`);
                    righe.push(`<button type="button" class="pc-filtro" data-strumento="btnOpenArchiveManagerHome"><svg class="ico"><use href="#i-database"/></svg><span class="pc-voce-nome">Archivio litologico</span></button>`);
                    document.getElementById('pcLato').innerHTML = righe.join('');
                } else {
                    // Stesso ordine della Home, scelto col menu «Ordina»: aprire un progetto non lo sposta.
                    righe.push(`<div class="pc-lato-titolo pc-lato-titolo-ordina"><span>Progetti</span>${menuOrdineProgetti('selOrdineProgettiPc')}</div>`);
                    ordinaProgetti(Object.keys(progetti), progetti, ordineProgettiScelto()).forEach(id => {
                        const p = progetti[id];
                        const aperto = id === state.currentProjectId;
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
                        const titolo = [nome, p.comune, p.committente ? 'Committente: ' + p.committente : '', (p.modificatoIl || p.updatedAt) ? 'Modificato il ' + dataBreve(p.modificatoIl || p.updatedAt) : '', 'Tasto destro: azioni'].filter(Boolean).join('\n');
                        righe.push(`<button type="button" class="pc-voce" data-progetto="${esc(id)}" title="${esc(titolo)}"${aperto && vista === 'project' ? ' aria-current="page"' : ''}>
                            <span class="pc-voce-riga"><span class="pc-voce-nome">${esc(nome)}</span></span>
                            <span class="pc-voce-riga pc-voce-info"><span class="pc-voce-nome">${info}</span>${haNote ? spia('i-note', '', false, 'Ha delle note') : ''}</span>
                        </button>`);
                        // Le prove sotto il progetto solo dentro una prova: nella scheda del progetto
                        // sono già nella tabella al centro.
                        if (!aperto || vista !== 'field') return;
                        // La prova aperta vive in state (il progetto si aggiorna al salvataggio): si legge da lì.
                        const prove = proveInOrdine(p).map(sv => sv.id === state.currentSurveyId ? { ...sv, header: state.header, logs: state.logs, photos: state.photos } : sv);
                        const avvisi = new Map(avvisiPrimaExport({ surveys: Object.fromEntries(prove.map(sv => [sv.id, sv])) }).map(r => [r.id, r.avvisi]));
                        prove.forEach(sv => {
                            const h = sv.header || {}, logs = sv.logs || [];
                            const fondo = logs.reduce((m, l) => Math.max(m, Number(l && l.end) || 0), 0);
                            const gps = isFinite(parseFloat(h.lat)) && isFinite(parseFloat(h.lng));
                            const nFoto = (sv.photos || []).length;
                            const nStrati = contaStrati(logs);
                            const falda = parseFloat(h.faldaDa);
                            const nNote = logs.filter(l => l && String(l.note || '').trim()).length;
                            const daControllare = avvisi.get(sv.id) || [];
                            const profilo = miniProfilo(logs, fondo);
                            righe.push(`<button type="button" class="pc-voce pc-prova" data-prova="${esc(sv.id)}" title="${esc(['Prova ' + provaNr(sv), ...daControllare.map(a => '• ' + a.testo), 'Tasto destro: azioni'].join('\n'))}"${vista === 'field' && sv.id === state.currentSurveyId ? ' aria-current="page"' : ''}>
                            <span class="pc-voce-riga"><span class="pc-voce-nome">Prova ${esc(provaNr(sv))}</span>${daControllare.length ? `<i class="pc-avviso" aria-label="${daControllare.length} da controllare"></i>` : ''}<span class="pc-voce-prof">${numeroConVirgola(fondo)} m</span></span>
                            <span class="pc-voce-riga pc-voce-info">${[
                                spia('i-pin', '', !gps, gps ? 'GPS presente' : 'Senza GPS'),
                                spia('i-camera', nFoto, !nFoto, nFoto + ' foto'),
                                spia('i-stack', nStrati, !nStrati, nStrati + (nStrati === 1 ? ' strato' : ' strati')),
                                spia('i-droplet', isFinite(falda) ? numeroConVirgola(falda) : '', !isFinite(falda), isFinite(falda) ? 'Falda a ' + numeroConVirgola(falda) + ' m' : 'Falda non impostata'),
                                nNote ? spia('i-note', nNote, false, nNote + (nNote === 1 ? ' intervallo con nota' : ' intervalli con nota')) : ''
                            ].join('')}</span>${profilo}
                        </button>`);
                        });
                        // In fondo alle prove del progetto aperto, il tasto per aggiungerne una.
                        righe.push(`<button type="button" class="pc-nuova-prova" data-nuova-prova title="Nuova prova in questo progetto"><svg class="ico" aria-hidden="true"><use href="#i-plus"/></svg>Nuova prova</button>`);
                    });
                    document.getElementById('pcLato').innerHTML = righe.join('');
                }

                document.getElementById('pcStatoAiuto').textContent = ({
                    home: 'Clic su un progetto per aprirlo · tasto destro: le sue azioni',
                    project: 'Clic su una prova per aprirla · tasto destro: le sue azioni',
                    field: state.settings.contatoreSuPc === true
                        ? 'Contatore: Spazio un colpo · Backspace toglie · Invio registra · F2 modifica la riga scelta · C spegne'
                        : 'Clic sceglie · doppio clic o Invio modifica · tasto destro: azioni · ↑ ↓ scorrono · Canc elimina'
                }[vista] || '') + (vista === 'field' ? '' : ' · Esc chiude le finestre');
                document.getElementById('pcStatoVersione').textContent = 'Ctrl K comandi · Ctrl Z annulla · ? guida · DPSH ' + APP_VERSIONE;
                if (vista === 'field') forseGuidaRapida();
            }

            /** Gli strati di una prova: i tratti di intervalli consecutivi con la stessa litologia. La
             * litologia si segna sul primo intervallo dello strato e vale fino al segno dopo; prima del
             * primo segno c'è comunque uno strato, senza nome. */
            function contaStrati(logs) {
                let n = 0, prima;
                (logs || []).forEach((l, i) => {
                    const lit = (l && l.lithology) || (i ? prima : null);
                    if (!i || lit !== prima) n++;
                    prima = lit;
                });
                return n;
            }

            /** La forma della prova in piccolo, come il grafico del Registro: la profondità scende,
             * i colpi vanno a destra, ogni barra col colore del suo strato. Vuota senza intervalli. */
            function miniProfilo(logs, fondo) {
                if (!logs.length || !(fondo > 0)) return '';
                const L = 40, A = 30;
                const maxColpi = Math.max(1, ...logs.map(l => Number(l.colpi) || 0));
                const colori = new Map((state.strati || []).map(st => [st.id, st.color]));
                let colore = null;
                const barre = logs.slice().sort((a, b) => a.start - b.start).map(l => {
                    if (l.lithology) colore = colori.get(l.lithology) || null;
                    const y = l.start / fondo * A, h = Math.max(0.6, (l.end - l.start) / fondo * A);
                    return `<rect x="0" y="${y.toFixed(2)}" width="${((Number(l.colpi) || 0) / maxColpi * L).toFixed(2)}" height="${h.toFixed(2)}"${colore ? ` fill="${colore}"` : ''}/>`;
                }).join('');
                return `<svg class="pc-profilo" viewBox="0 0 ${L} ${A}" preserveAspectRatio="none" aria-hidden="true">${barre}</svg>`;
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
                if (!b) return;
                if ('nuovaProva' in b.dataset) return openNewSurveyModal();
                if (b.dataset.filtro) { filtroStatoProgetti = b.dataset.filtro; return renderHomeProjects(); }
                if (b.dataset.strumento) return document.getElementById(b.dataset.strumento).click();
                apriDalLato(b.dataset.progetto, b.dataset.prova);
            });
            document.getElementById('pcBtnConsegna').addEventListener('click', () => {
                if (state.uiState.currentView === 'field') document.getElementById('btnExportHeader').click();
                else openExportModal('project', state.currentProjectId);
            });
            document.getElementById('pcBtnImpostazioni').addEventListener('click', openDrawer);
            window.addEventListener('resize', renderPc);
