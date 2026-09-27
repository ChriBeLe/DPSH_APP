            // ============ LE FINESTRE «PORTA SU UN ALTRO DISPOSITIVO» E «RICEVI» (Fase 2) ============
            // Come nel prototipo approvato (tavole «Telefono · Porta su un altro dispositivo» e «PC ·
            // Ricevi un progetto»). Il lavoro vero sta in 044b; qui solo cosa si vede e cosa si tocca.

            const modalPortaProgetto = document.getElementById('modalPortaProgetto');
            const modalPortaProgettoOverlay = document.getElementById('modalPortaProgettoOverlay');
            const modalRiceviProgetto = document.getElementById('modalRiceviProgetto');
            const modalRiceviProgettoOverlay = document.getElementById('modalRiceviProgettoOverlay');
            let portaProgettoId = null;
            let portaProgettoGiro = 0;   // una stima vecchia non deve scrivere su una finestra riaperta
            let riceviStato = null;      // { file, lettura, confronto, scelta, lavoro }

            const plurale = (n, uno, tanti) => `${n} ${n === 1 ? uno : tanti}`;
            const maiuscolaIniziale = (s) => s.charAt(0).toUpperCase() + s.slice(1);

            function numeriPassaggioHtml(c) {
                const voce = (n, uno, tanti) => `<div class="numero"><b>${n}</b><span>${n === 1 ? uno : tanti}</span></div>`;
                return voce(c.prove, 'prova', 'prove') + voce(c.intervalli, 'intervallo', 'intervalli') + voce(c.foto, 'foto', 'foto')
                    + voce(c.strati, c.parametri ? 'strato, con parametri' : 'strato', c.parametri ? 'strati, con parametri' : 'strati');
            }

            // ---------- Porta su un altro dispositivo ----------

            function apriPortaProgetto(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj || !modalPortaProgetto) return;
                portaProgettoId = projId;
                const giro = ++portaProgettoGiro;
                document.getElementById('lblPortaProgettoNome').textContent = proj.name || proj.comune || 'Progetto';
                document.getElementById('portaProgettoNumeri').innerHTML = numeriPassaggioHtml(conteggiProgetto(proj));
                document.getElementById('lblPortaProgettoDispositivo').textContent = nomeDispositivo();
                const mancanti = document.getElementById('portaProgettoMancanti');
                mancanti.style.display = 'none';
                mancanti.innerHTML = '';
                const bottone = document.getElementById('btnCreaPacchetto');
                bottone.disabled = true;
                document.getElementById('lblCreaPacchetto').textContent = 'Calcolo il peso…';
                modalPortaProgettoOverlay.classList.add('open');
                modalPortaProgetto.classList.add('open');
                // Il peso vero e le immagini che mancano si sanno leggendo le foto: dopo, senza bloccare.
                stimaPacchetto(projId).then(stima => {
                    if (giro !== portaProgettoGiro || !stima) return;
                    const nMancanti = stima.fotoMancanti.length + stima.immaginiNoteMancanti.length;
                    if (nMancanti > 0) {
                        const cosa = [];
                        if (stima.fotoMancanti.length) cosa.push(plurale(stima.fotoMancanti.length, 'foto', 'foto') + ` (prov${stima.fotoMancanti.length === 1 ? 'a' : 'e'} ${[...new Set(stima.fotoMancanti.map(f => f.prova))].join(', ')})`);
                        if (stima.immaginiNoteMancanti.length) cosa.push(plurale(stima.immaginiNoteMancanti.length, 'immagine delle note', 'immagini delle note'));
                        mancanti.innerHTML = `${ico('alert')}<span>${testoSicuro(cosa.join(' e '))} non ${nMancanti === 1 ? 'si trova' : 'si trovano'} su questo dispositivo: nel pacchetto non ${nMancanti === 1 ? 'ci sarà' : 'ci saranno'}. Il resto è completo.</span>`;
                        mancanti.style.display = 'flex';
                    }
                    document.getElementById('lblCreaPacchetto').textContent = `${nMancanti > 0 ? 'Crea il pacchetto lo stesso' : 'Crea il pacchetto'} · ${formattaMegabyte(stima.byte)}`;
                    bottone.disabled = false;
                }).catch(e => {
                    if (giro !== portaProgettoGiro) return;
                    ignoraErrore('apriPortaProgetto', e);
                    document.getElementById('lblCreaPacchetto').textContent = 'Crea il pacchetto';
                    bottone.disabled = false;
                });
            }

            function chiudiPortaProgetto() {
                portaProgettoGiro++;
                portaProgettoId = null;
                if (modalPortaProgettoOverlay) modalPortaProgettoOverlay.classList.remove('open');
                if (modalPortaProgetto) modalPortaProgetto.classList.remove('open');
            }

            async function creaEScaricaPacchetto() {
                const projId = portaProgettoId;
                if (!projId) return;
                const bottone = document.getElementById('btnCreaPacchetto');
                bottone.disabled = true;
                document.getElementById('lblCreaPacchetto').textContent = 'Creo il pacchetto…';
                try {
                    const { blob, nomeFile, manifest } = await creaPacchettoProgetto(projId);
                    scaricaBlobFile(blob, nomeFile);
                    chiudiPortaProgetto();
                    const mancanti = manifest.fotoMancanti.length + manifest.immaginiNoteMancanti.length;
                    appDialog(`«${nomeFile}» · ${formattaMegabyte(blob.size)}\n\nÈ nei Download. Sull'altro dispositivo apri DPSH, tocca Ricevi nella Home e scegli questo file.`
                        + (mancanti ? `\n\nNel pacchetto mancano ${plurale(mancanti, 'immagine', 'immagini')} che non erano su questo dispositivo.` : ''),
                        { title: 'Pacchetto creato', okLabel: 'Ho capito', icona: 'check', coloreIcona: 'var(--success)' });
                } catch (e) {
                    console.error('Pacchetto di progetto:', e);
                    appAlert('Il pacchetto non è stato creato: ' + ((e && e.message) || e));
                    bottone.disabled = false;
                    document.getElementById('lblCreaPacchetto').textContent = 'Crea il pacchetto';
                }
            }

            async function cambiaNomeDispositivo() {
                const nuovo = await appPrompt('Il nome con cui questo dispositivo firma i pacchetti che crea, per esempio «Telefono» o «PC ufficio». Resta su questo dispositivo.', nomeDispositivo(), { title: 'Nome di questo dispositivo', okLabel: 'Salva', label: 'Nome' });
                if (nuovo === null) return;
                if (!impostaNomeDispositivo(nuovo)) { appAlert('Il nome non è stato salvato.'); return; }
                const lbl = document.getElementById('lblPortaProgettoDispositivo');
                if (lbl) lbl.textContent = nomeDispositivo();
            }

            if (modalPortaProgetto) {
                document.getElementById('btnChiudiPortaProgetto').addEventListener('click', chiudiPortaProgetto);
                modalPortaProgettoOverlay.addEventListener('click', chiudiPortaProgetto);
                document.getElementById('btnCreaPacchetto').addEventListener('click', creaEScaricaPacchetto);
                document.getElementById('btnCambiaNomeDispositivo').addEventListener('click', cambiaNomeDispositivo);
            }
            const btnProjActPorta = document.getElementById('btnProjActPorta');
            if (btnProjActPorta) {
                btnProjActPorta.addEventListener('click', () => {
                    if (!projectActionsContext) return;
                    const { projId } = projectActionsContext;
                    closeProjectActionsModal();
                    apriPortaProgetto(projId);
                });
            }

            // ---------- Ricevi un progetto ----------

            async function apriRiceviProgetto(file, voci) {
                if (!modalRiceviProgetto) return;
                riceviStato = { file, lettura: null, confronto: null, scelta: null, lavoro: true };
                document.getElementById('lblRiceviProgettoFile').textContent = (file && file.name) || '';
                document.getElementById('riceviProgettoCorpo').innerHTML = '<div class="in-corso">Controllo il pacchetto: verifico l\'impronta di ogni file…</div>';
                renderBottoniRicevi();
                modalRiceviProgettoOverlay.classList.add('open');
                modalRiceviProgetto.classList.add('open');
                const stato = riceviStato;
                try {
                    stato.lettura = await leggiPacchetto(file, voci);
                    if (stato.lettura.ok) stato.confronto = await confrontaConPresente(stato.lettura);
                } catch (e) {
                    stato.lettura = { ok: false, problemi: [(e && e.message) || String(e)] };
                }
                if (riceviStato !== stato) return;
                stato.lavoro = false;
                if (stato.lettura.ok) {
                    const c = stato.confronto;
                    stato.scelta = !c.presente ? 'nuovo' : (c.relazione === 'identico' ? 'identico' : c.consigliata);
                }
                renderRiceviProgetto();
            }

            function chiudiRiceviProgetto() {
                riceviStato = null;
                if (modalRiceviProgettoOverlay) modalRiceviProgettoOverlay.classList.remove('open');
                if (modalRiceviProgetto) modalRiceviProgetto.classList.remove('open');
            }

            function testoConfrontoRicevi(c, manifest) {
                const su = maiuscolaIniziale(suQuestoDispositivo());
                const quiIl = c.modQui ? `modificato il ${formattaQuandoCompleto(c.modQui)}` : '';
                const da = manifest.dispositivo || 'l\'altro dispositivo';
                switch (c.relazione) {
                    case 'identico': return `${su} c'è già questo progetto, identico al pacchetto: non c'è niente da aggiornare.`;
                    case 'pacchetto-piu-recente': return `${su} c'è già questo progetto${quiIl ? ', ' + quiIl : ''}. Il pacchetto è più recente e contiene già tutto quello che c'è qui.`;
                    case 'pacchetto-piu-recente-per-data': return `${su} c'è già questo progetto${quiIl ? ', ' + quiIl : ''}. Il pacchetto è più recente${c.modPacchetto ? ` (modificato il ${formattaQuandoCompleto(c.modPacchetto)})` : ''}.`;
                    case 'presente-piu-recente': return `${su} c'è già questo progetto, ed è PIÙ RECENTE del pacchetto${quiIl ? ': ' + quiIl : ''}. Sostituendolo perderesti quelle modifiche.`;
                    case 'divergenti': return `Questo progetto è stato modificato sia qui${c.modQui ? ` (il ${formattaQuandoCompleto(c.modQui)})` : ''} sia su «${da}»${c.modPacchetto ? ` (il ${formattaQuandoCompleto(c.modPacchetto)})` : ''} dopo l'ultimo passaggio. Sostituendolo perderesti le modifiche fatte qui.`;
                    default: return `${su} c'è già questo progetto${quiIl ? ', ' + quiIl : ''}. Non si può dire quale dei due sia più recente: sostituendolo potresti perdere delle modifiche.`;
                }
            }

            function renderRiceviProgetto() {
                const s = riceviStato;
                const corpo = document.getElementById('riceviProgettoCorpo');
                if (!s || !corpo) return;
                const l = s.lettura;
                const spunta = (tipo, testo) => `<span class="spunta${tipo === 'ok' ? '' : ' ' + tipo}">${ico(tipo === 'ok' ? 'check' : (tipo === 'no' ? 'x' : 'alert'))}<span>${testo}</span></span>`;
                if (!l.ok) {
                    corpo.innerHTML = `<div class="riquadro errore">${ico('alert')}<span><strong>Questo pacchetto non si può ricevere: non è stato importato niente.</strong><br>${
                        l.problemi.slice(0, 6).map(p => testoSicuro(maiuscolaIniziale(p))).join('<br>')}${l.problemi.length > 6 ? `<br>… e altri ${l.problemi.length - 6}` : ''}<br><br>Se l'hai copiato da un altro dispositivo, rifallo da lì e copialo di nuovo.</span></div>`;
                    renderBottoniRicevi();
                    return;
                }
                const m = l.manifest, c = s.confronto;
                const cnt = conteggiProgetto(l.progetto);
                const versione = versioneFileImportato(m);
                const controlli = [
                    spunta('ok', `Pacchetto integro · ${plurale(l.verificati, 'file verificato', 'file verificati')}`),
                    spunta('ok', 'Versione dei dati compatibile' + (versione < VERSIONE_SCHEMA_DATI ? ` (aggiornata dal formato ${versione})` : '')),
                    l.anomalie.length === 0
                        ? spunta('ok', 'Nessuna anomalia nei dati')
                        : spunta('attenzione', `${plurale(l.anomalie.length, 'anomalia', 'anomalie')} nei dati, che arrivano così come sono:<br>${l.anomalie.slice(0, 4).map(a => '· ' + testoSicuro(a.testo)).join('<br>')}${l.anomalie.length > 4 ? '<br>· …' : ''}`)
                ];
                const mancanti = (m.fotoMancanti || []).length + (m.immaginiNoteMancanti || []).length;
                if (mancanti) controlli.push(spunta('attenzione', `${plurale(mancanti, 'immagine mancava', 'immagini mancavano')} già su «${testoSicuro(m.dispositivo || 'l\'altro dispositivo')}»`));
                const riga = [plurale(cnt.prove, 'prova', 'prove'), plurale(cnt.intervalli, 'intervallo', 'intervalli'), plurale(cnt.foto, 'foto', 'foto'), plurale(cnt.strati, 'strato', 'strati')].join(' · ');
                const arriva = [
                    `<span><strong>${testoSicuro(l.progetto.name || l.progetto.comune || 'Progetto')}</strong></span>`,
                    `<span>${riga}</span>`,
                    `<span class="tenue">Da <strong>${testoSicuro(m.dispositivo || 'un altro dispositivo')}</strong>, esportato il ${formattaQuandoCompleto(m.esportatoIl) || '—'}</span>`
                ];
                let html = `<div class="colonne">
                    <div class="colonna"><span class="titoletto">Controlli</span>${controlli.join('')}</div>
                    <div class="colonna"><span class="titoletto">Cosa arriva</span>${arriva.join('')}</div>
                </div>`;
                if (c.presente) {
                    html += `<div class="riquadro${c.avviso ? ' avviso' : ''}" id="riceviConfronto" style="margin-top: 18px;">${ico(c.avviso ? 'alert' : 'info')}<span>${testoSicuro(testoConfrontoRicevi(c, m))}</span></div>`;
                    if (c.relazione !== 'identico') {
                        const suQui = suQuestoDispositivo();
                        const opzioni = [
                            { id: 'sostituisci', titolo: `Sostituisci quello ${suQui}`, testo: 'Prima viene salvata una copia automatica di quello attuale: puoi tornare indietro dalla Cronologia.' },
                            { id: 'entrambi', titolo: 'Tieni entrambi', testo: `Il pacchetto arriva come «${nomeCopiaDaPacchetto(l)}», quello ${suQui} resta com'è.` }
                        ];
                        html += `<div class="scelte" role="radiogroup" aria-label="Cosa fare" style="margin-top: 18px;">${opzioni.map(o => `
                            <button type="button" class="scelta" role="radio" data-scelta="${o.id}" aria-checked="${s.scelta === o.id}">
                                <span class="pallino"></span>
                                <span><span class="titolo">${testoSicuro(o.titolo + (o.id === c.consigliata ? ' (consigliato)' : ''))}</span><span class="testo">${testoSicuro(o.testo)}</span></span>
                            </button>`).join('')}</div>`;
                    }
                }
                corpo.innerHTML = html;
                corpo.querySelectorAll('[data-scelta]').forEach(b => b.addEventListener('click', () => {
                    if (!riceviStato || riceviStato.lavoro) return;
                    riceviStato.scelta = b.getAttribute('data-scelta');
                    renderRiceviProgetto();
                }));
                renderBottoniRicevi();
            }

            /** Le etichette dei bottoni seguono la scelta, come nel prototipo. */
            function renderBottoniRicevi() {
                const s = riceviStato;
                const annulla = document.getElementById('btnRiceviAnnulla');
                const conferma = document.getElementById('btnRiceviConferma');
                if (!annulla || !conferma) return;
                annulla.style.display = '';
                annulla.textContent = 'Annulla';
                conferma.disabled = !s || s.lavoro;
                if (!s || !s.lettura) { conferma.textContent = 'Importa'; return; }
                if (!s.lettura.ok) { annulla.style.display = 'none'; conferma.textContent = 'Chiudi'; conferma.disabled = false; return; }
                if (s.scelta === 'identico') { annulla.textContent = 'Importa una copia'; conferma.textContent = 'Chiudi'; return; }
                conferma.textContent = { sostituisci: 'Sostituisci', entrambi: 'Importa come copia', nuovo: 'Importa' }[s.scelta] || 'Importa';
            }

            async function confermaRicevi(scelta) {
                const s = riceviStato;
                if (!s || s.lavoro) return;
                if (!s.lettura || !s.lettura.ok || scelta === 'identico') { chiudiRiceviProgetto(); return; }
                s.lavoro = true;
                renderBottoniRicevi();
                document.getElementById('btnRiceviConferma').textContent = 'Importo…';
                try {
                    const esito = await applicaPacchetto(s.lettura, scelta);
                    chiudiRiceviProgetto();
                    if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    if (typeof switchView === 'function' && state.uiState && state.uiState.currentView === 'home') switchView('home');
                    triggerVibrate([40, 60, 40]);
                    let msg = esito.scelta === 'sostituisci'
                        ? `«${esito.nome}» è stato sostituito con quello del pacchetto. La versione di prima è nella Cronologia.`
                        : (esito.scelta === 'entrambi' ? `Il progetto è arrivato come «${esito.nome}». Quello che c'era resta com'è.` : `«${esito.nome}» è su questo dispositivo.`);
                    if (esito.immagini.rinominate) msg += `\n\n${plurale(esito.immagini.rinominate, 'immagine aveva', 'immagini avevano')} lo stesso nome di una diversa già qui: quella di qui resta, quella del pacchetto è entrata con un nome nuovo.`;
                    msg += testoLibrerieAccolte(esito.librerie);
                    appDialog(msg, { title: 'Progetto ricevuto', okLabel: 'Ho capito', icona: 'check', coloreIcona: 'var(--success)' });
                } catch (e) {
                    console.error('Ricevi progetto:', e);
                    s.lavoro = false;
                    renderBottoniRicevi();
                    appAlert('Il progetto non è stato importato: ' + ((e && e.message) || e));
                }
            }

            if (modalRiceviProgetto) {
                document.getElementById('btnChiudiRiceviProgetto').addEventListener('click', () => { if (!riceviStato || !riceviStato.lavoro || !riceviStato.lettura) chiudiRiceviProgetto(); });
                modalRiceviProgettoOverlay.addEventListener('click', () => { if (riceviStato && riceviStato.lavoro && riceviStato.lettura) return; chiudiRiceviProgetto(); });
                document.getElementById('btnRiceviAnnulla').addEventListener('click', () => {
                    const s = riceviStato;
                    if (s && s.scelta === 'identico' && !s.lavoro) { confermaRicevi('entrambi'); return; }
                    if (s && s.lavoro && s.lettura) return;
                    chiudiRiceviProgetto();
                });
                document.getElementById('btnRiceviConferma').addEventListener('click', () => { if (riceviStato) confermaRicevi(riceviStato.scelta); });
            }
