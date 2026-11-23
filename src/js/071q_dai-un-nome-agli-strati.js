            // ===================== FOGLIO «DAI UN NOME AGLI STRATI» (Fase C) =====================
            // Dopo «Riconosci strati» gli strati hanno nomi generici («Strato 2»), ma è il NOME a
            // decidere il comportamento litologico (categorieDiTesto) e quindi quali parametri
            // avanzati si calcolano. Prima restava un toast di 8 secondi che apriva l'intera Gestione
            // degli strati: chi non faceva in tempo lo perdeva. Ora è un foglio che si apre da solo
            // e dalla tappa «Strati» del Progetto: una riga per strato, con la quota e il nome (a
            // mano o dall'Archivio litologico, che porta anche colore, retino e parametri preferiti).

            const modalDaiNome = document.getElementById('modalDaiNome');
            const modalDaiNomeOverlay = document.getElementById('modalDaiNomeOverlay');
            // Le scelte dall'Archivio fatte nel foglio, applicate solo con «Salva i nomi»: { stratoId: archId }.
            let bozzaArchivioDaiNome = {};

            /** Vero per un nome che non dice niente: vuoto, o quello che dà l'app («Strato 3»). */
            function nomeStratoGenerico(strato) {
                const n = String((strato && strato.name) || '').trim();
                return n === '' || /^strato\s*\d*$/i.test(n);
            }

            /** Una riga per strato del progetto: quelli della prova aperta in ordine di profondità, con
             * la quota da–a dei loro intervalli; poi gli altri, senza quota in questa prova. */
            function righeDaiNome() {
                const righe = (state.strati || []).map((s, i) => {
                    const logs = getLogsPerStratoIn(s.id, state.logs || [], state.strati);
                    const da = logs.length ? Math.min.apply(null, logs.map(l => Number(l.start) || 0)) : null;
                    const a = logs.length ? Math.max.apply(null, logs.map(l => Number(l.end) || 0)) : null;
                    return { strato: s, ordine: i, da, a };
                });
                return righe.sort((x, y) => (x.da == null) - (y.da == null) || (x.da != null && x.da - y.da) || x.ordine - y.ordine);
            }

            /** Per la tappa «Strati» del Progetto: quanti sono e quanti senza nome. */
            function riepilogoStratiProgetto() {
                const strati = state.strati || [];
                return { totale: strati.length, senzaNome: strati.filter(nomeStratoGenerico).length };
            }

            /** Per la tappa «Parametri» del Progetto (Fase C): quanti strati sono completi.
             * Criterio = quello della procedura guidata (primoCampoWizardMancante, 017): uno strato è
             * completo quando ogni categoria APPLICABILE ha una scelta esplicita
             * (parametriAvanzati[cat].autoreIndex != null); le non tipiche restano facoltative.
             * Differenza voluta: lì l'applicabilità si legge dall'aggregato della prova aperta e gli
             * strati senza intervalli in quella prova si saltano; qui la si ricava da strato.behavior
             * (la stessa regola con cui l'aggregato la costruisce, 015), così il conto vale per tutti
             * gli strati del PROGETTO e non cambia con la prova aperta. Il primo incompleto è lo
             * strato che il tocco apre nella procedura guidata. */
            function riepilogoParametriProgetto() {
                const strati = state.strati || [];
                let primoIncompleto = null, completi = 0;
                strati.forEach(s => {
                    const app = categorieApplicabili({ isCoesivo: s.behavior === 'coesivo', isIncoerente: s.behavior !== 'coesivo' });
                    if (categorieConSceltaWizard(s, app) >= app.length) completi++;
                    else if (!primoIncompleto) primoIncompleto = s.id;
                });
                return { totale: strati.length, completi, primoIncompleto };
            }

            function quotaDaiNome(r) {
                return r.da == null ? 'non compare in questa prova' : `da ${numeroConVirgola(r.da)} a ${numeroConVirgola(r.a)} m`;
            }

            function renderDaiNome() {
                const righe = righeDaiNome();
                const senza = righe.filter(r => nomeStratoGenerico(r.strato)).length;
                document.getElementById('lblDaiNomeIntro').textContent = senza
                    ? `${senza === 1 ? 'Uno strato non ha ancora un nome' : senza + ' strati non hanno ancora un nome'}. Il nome decide quali parametri si calcolano: scrivilo o scegli una voce dall'Archivio litologico.`
                    : 'Tutti gli strati hanno un nome. Puoi cambiarlo qui o scegliere una voce dall\'Archivio litologico.';
                document.getElementById('listaDaiNome').innerHTML = righe.map(r => {
                    const s = r.strato;
                    const arch = state.lithologyArchive && state.lithologyArchive[bozzaArchivioDaiNome[s.id]];
                    const colore = arch ? arch.color : s.color;
                    const pattern = arch ? (arch.pattern || 'none') : (s.pattern || 'none');
                    return `<div class="dai-nome-riga" data-strato="${testoHtml(s.id)}" style="background:var(--bg-card-hover); border-radius:var(--radius-sm); border-left:5px solid ${coloreSicuro(colore)}; padding:8px 10px; display:flex; flex-direction:column; gap:6px;">
                        <div class="t-didascalia">${testoSicuroStrati(quotaDaiNome(r))}${arch ? ` · dall'Archivio: ${testoSicuroStrati(arch.name)}` : ''}</div>
                        <div style="display:flex; gap:8px; align-items:center;">
                            <div style="width:26px; height:26px; border-radius:6px; border:1px solid rgba(0,0,0,0.25); flex:0 0 auto; ${getPatternCss(pattern, coloreSicuro(colore))}"></div>
                            <input type="text" class="form-control dai-nome-input" style="flex:1; min-width:0; font-weight:700;" value="${testoSicuroStrati(nomeStratoGenerico(s) ? '' : s.name)}" placeholder="${testoSicuroStrati(s.name || 'Nome dello strato')}" aria-label="Nome dello strato ${testoSicuroStrati(quotaDaiNome(r))}">
                            <button type="button" class="bt bt-tenue dai-nome-archivio">Dall'Archivio</button>
                        </div>
                    </div>`;
                }).join('');
                document.querySelectorAll('#listaDaiNome .dai-nome-archivio').forEach(b => b.addEventListener('click', () => {
                    const stratoId = b.closest('[data-strato]').dataset.strato;
                    if (getArchiveList().length === 0) {
                        appAlert("L'archivio litologico è ancora vuoto. Salva uno strato con \"Salva in Archivio\" dalla Gestione degli strati per riutilizzarlo qui e in altri progetti.");
                        return;
                    }
                    openArchivePicker({
                        mode: 'single',
                        needCount: 1,
                        onConfirm: (ids) => {
                            const arch = state.lithologyArchive[ids[0]];
                            if (!arch) return;
                            const scritti = leggiNomiDaiNome();
                            bozzaArchivioDaiNome[stratoId] = arch.id;
                            scritti[stratoId] = arch.name;
                            renderDaiNome();
                            document.querySelectorAll('#listaDaiNome [data-strato]').forEach(riga => {
                                if (scritti[riga.dataset.strato] != null) riga.querySelector('input').value = scritti[riga.dataset.strato];
                            });
                        }
                    });
                }));
            }

            /** I nomi scritti nel foglio adesso: { stratoId: testo }. */
            function leggiNomiDaiNome() {
                const out = {};
                document.querySelectorAll('#listaDaiNome [data-strato]').forEach(riga => { out[riga.dataset.strato] = riga.querySelector('input').value; });
                return out;
            }

            function daiNomeHaModifiche() {
                const scritti = leggiNomiDaiNome();
                return Object.keys(bozzaArchivioDaiNome).length > 0 || state.strati.some(s => {
                    const v = String(scritti[s.id] == null ? '' : scritti[s.id]).trim();
                    return v !== '' && v !== s.name;
                });
            }

            function apriDaiNomeStrati() {
                bozzaArchivioDaiNome = {};
                renderDaiNome();
                modalDaiNomeOverlay.classList.add('open');
                modalDaiNome.classList.add('open');
                const primo = document.querySelector('#listaDaiNome .dai-nome-input');
                if (primo) primo.focus();
            }

            function chiudiDaiNomeStrati() {
                modalDaiNomeOverlay.classList.remove('open');
                modalDaiNome.classList.remove('open');
                bozzaArchivioDaiNome = {};
                if (typeof renderSchermataProgetto === 'function' && state.uiState && state.uiState.currentView === 'project') renderSchermataProgetto();
            }

            /** «Chiudi»: se ci sono nomi scritti e non salvati lo chiede, perché sono il lavoro di chi
             * ha appena riconosciuto gli strati. */
            async function chiediChiudiDaiNome() {
                if (daiNomeHaModifiche()) {
                    const ok = await appDialog('Ci sono nomi non salvati. Chiudere senza salvarli?', { confirm: true, okLabel: 'Chiudi senza salvare', cancelLabel: 'Torna ai nomi' });
                    if (!ok) return;
                }
                chiudiDaiNomeStrati();
            }

            function salvaNomiDaiNome() {
                const scritti = leggiNomiDaiNome();
                let cambiati = 0;
                state.strati.forEach(s => {
                    const arch = state.lithologyArchive && state.lithologyArchive[bozzaArchivioDaiNome[s.id]];
                    const nome = String(scritti[s.id] == null ? '' : scritti[s.id]).trim();
                    if (arch) {
                        // Come «Dall'Archivio» nella Gestione: copia visiva e geotecnica, e il
                        // collegamento (da cui arrivano i parametri preferiti al calcolo).
                        s.color = arch.color;
                        s.pattern = arch.pattern || 'none';
                        s.behavior = arch.behavior || 'granulare';
                        s.sourceArchiveId = arch.id;
                        s.name = nome || arch.name;
                        cambiati++;
                    } else if (nome && nome !== s.name) {
                        s.name = nome;
                        cambiati++;
                    }
                });
                saveState();
                populateStratiDropdown();
                updateUI();
                if (modalManageStrati && modalManageStrati.classList.contains('open')) renderStratiList();
                chiudiDaiNomeStrati();
                const restano = riepilogoStratiProgetto().senzaNome;
                mostraToast(cambiati
                    ? (restano ? `Nomi salvati. ${restano === 1 ? 'Resta uno strato' : 'Restano ' + restano + ' strati'} senza nome` : 'Nomi salvati')
                    : 'Nessun nome da salvare');
            }

            document.getElementById('btnDaiNomeX').addEventListener('click', chiediChiudiDaiNome);
            document.getElementById('btnDaiNomeChiudi').addEventListener('click', chiediChiudiDaiNome);
            modalDaiNomeOverlay.addEventListener('click', chiediChiudiDaiNome);
            document.getElementById('btnDaiNomeSalva').addEventListener('click', salvaNomiDaiNome);
            // La Gestione completa (colori, retini, parametri) resta raggiungibile da qui.
            document.getElementById('btnDaiNomeApriStrati').addEventListener('click', async () => {
                if (daiNomeHaModifiche()) salvaNomiDaiNome(); else chiudiDaiNomeStrati();
                openStratiModal();
            });
            document.getElementById('listaDaiNome').addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.classList && e.target.classList.contains('dai-nome-input')) {
                    e.preventDefault();
                    const campi = [...document.querySelectorAll('#listaDaiNome .dai-nome-input')];
                    const i = campi.indexOf(e.target);
                    if (i >= 0 && i < campi.length - 1) campi[i + 1].focus(); else document.getElementById('btnDaiNomeSalva').focus();
                }
            });
