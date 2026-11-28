            // ===================== L'ELENCO DELLE TAVOLE SALVATE =====================
            // Un pannello dentro la finestra «Tavole»: tutte le tavole del progetto (anche quelle
            // vecchie, bloccate), da cercare per nome o filtrare per tipo; ogni riga si rinomina,
            // duplica, blocca, toglie dal report, elimina. Lavora sulla bozza: vale con «Salva».
            const NOMI_TIPO_TAVOLA = { iso: 'Isometrica', sez3d: 'Sezione 3D', sez2d: 'Sezione 2D', pianta: 'Pianta', profilo: 'Profilo', confronto: 'Confronto prove', libero: 'Disegno libero' };
            function righeElencoTavole(proj, { testo = '', tipo = '', impronta = null } = {}) {
                const q = String(testo || '').trim().toLowerCase();
                return registroTavole(proj).filter(t => (!tipo || t.tipo === tipo) && (!q || String(t.nome).toLowerCase().includes(q)))
                    .map(t => ({ t, etichette: [t.bloccata && 'bloccata', t.inReport === false && 'fuori dal report', t.storica && 'storica', t.orfana && 'senza pagina', t.templateId && templateTavole(t.templateId) && ('template «' + templateTavole(t.templateId).name + '»'), !t.storica && impronta && tavolaDatiCambiati(t, impronta) && 'dati cambiati'].filter(Boolean) }));
            }
            /** Un template dalle regole di UNA sola tavola: la sua pagina, il suo foglio, i suoi elementi. */
            function templateDaTavola(t, nome) {
                const imp = t.impostazioni || {}, chiave = t.voceId && /^iso-/.test(t.voceId) ? t.voceId : t.tipo;
                const regole = { foglio: Object.assign({ carta: 'A4', verso: 'o', scritte: 1.3 }, imp.foglio || {}), sfondo: 'chiaro', basemap: false, opacitaFoto: 0.5, pianta: 'sotto', ex: null,
                    elementi: Object.assign({}, TEMPLATE_TAVOLE_BASE.regole.elementi), sequenza: [chiave],
                    tipi: { 'iso-n': chiave === 'iso-n', 'iso-e': chiave === 'iso-e', sez3d: chiave === 'sez3d', sez2d: chiave === 'sez2d' } };
                if (!state.tavoleTemplates) state.tavoleTemplates = {};
                const id = 'tpl_tav_' + Date.now().toString(36), gia = Object.values(state.tavoleTemplates).find(x => x.name === String(nome).trim());
                const tp = { id: gia ? gia.id : id, name: String(nome).trim(), regole, aggiornato: Date.now() };
                state.tavoleTemplates[tp.id] = tp; saveState();
                return tp;
            }
            let chiudiElencoTavole = null; // chiude l'elenco aperto (e toglie il suo ascolto di Esc)
            function apriElencoTavole3d() {
                // dentro la finestra Tavole si lavora sulla bozza (vale con «Salva»); dalla mappa, sul progetto: si salva subito
                const proj = state.projects[state.currentProjectId], inFinestra = !!tavole3d.bozza;
                if (!inFinestra && !proj) return;
                if (!inFinestra && !proj.tavole3d) proj.tavole3d = { regola: {}, escluse: [] };
                const P = { tavole3d: inFinestra ? tavole3d.bozza : proj.tavole3d }, esc = escapeHtmlDidascalia;
                const dopoModifica = () => { if (inFinestra) statoSalvataggioTavole3d(); else { saveState(); if (typeof infoAreaMappa === 'function') infoAreaMappa(); } };
                // ogni volta un pannello nuovo, tolto dalla pagina alla chiusura: un `hidden` non basta
                // (lo stile `display:flex` lo batte e lo strato resterebbe sopra lo schermo, bloccando tutto)
                if (chiudiElencoTavole) chiudiElencoTavole();
                const vecchio = document.getElementById('tavoleElenco'); if (vecchio) vecchio.remove();
                const ov = document.createElement('div'); ov.id = 'tavoleElenco'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Tavole salvate'); ov.setAttribute('aria-modal', 'true');
                ov.style.cssText = 'position:fixed;inset:0;z-index:380;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px';
                document.body.appendChild(ov);
                const attivo = document.activeElement;
                const stato = { testo: '', tipo: '', cache: {} };
                const suEsc = e => { if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); chiudi(); } };
                const chiudi = () => {
                    document.removeEventListener('keydown', suEsc, true);
                    ov.remove(); chiudiElencoTavole = null;
                    if (attivo && attivo.focus && document.contains(attivo)) { try { attivo.focus(); } catch (e) { /* niente */ } }
                };
                document.addEventListener('keydown', suEsc, true); chiudiElencoTavole = chiudi;
                ov.addEventListener('mousedown', e => { if (e.target === ov) chiudi(); });
                const disegna = () => {
                    const righe = righeElencoTavole(P, { impronta: inFinestra ? improntaDatiTavole3d() : null, testo: stato.testo, tipo: stato.tipo });
                    // l'anteprima: quella salvata; se manca (tavole di prima), la si disegna ora dalla pagina corrispondente
                    const anteprima = t => {
                        if (t.miniatura) return t.miniatura;
                        if (!inFinestra) return null;
                        if (stato.cache[t.id] === undefined) { const v = tavole3d.voci.find(x => x.id === t.voceId); stato.cache[t.id] = (v && miniaturaVoce3d(v, 360)) || null; }
                        return stato.cache[t.id];
                    };
                    const card = ({ t, etichette }) => { const img = anteprima(t); return `<div class="tavole-el-scheda" data-id="${esc(t.id)}">
                            <div class="tavole-el-anteprima">${img ? `<img src="${esc(img)}" alt="Anteprima di ${esc(t.nome)}">` : `<span>${NOMI_TIPO_TAVOLA[t.tipo] || t.tipo}<small>anteprima non disponibile</small></span>`}</div>
                            <div class="tavole-el-info"><b>${esc(t.nome)}</b><span class="t-didascalia">${NOMI_TIPO_TAVOLA[t.tipo] || t.tipo} · versione ${t.versione}${etichette.length ? ' · ' + esc(etichette.join(' · ')) : ''}</span></div>
                            <div class="tavole-el-azioni"><button type="button" class="bt" data-az="rinomina">Rinomina</button><button type="button" class="bt" data-az="duplica">Duplica</button>
                            <button type="button" class="bt" data-az="blocca">${t.bloccata ? 'Sblocca' : 'Blocca'}</button><button type="button" class="bt" data-az="report">${t.inReport === false ? 'Metti nel report' : 'Togli dal report'}</button>
                            <button type="button" class="bt" data-az="template">Salva come template</button><button type="button" class="bt" data-az="elimina">Elimina</button></div></div>`; };
                    ov.innerHTML = `<div class="tavole-el-finestra">
                        <div class="tavole-el-testa"><b>Tavole salvate (${registroTavole(P).length})</b><button type="button" class="bt" data-az="chiudi">Chiudi</button></div>
                        <div class="tavole-el-filtri"><input type="search" class="form-control tavole-el-cerca" data-az="cerca" aria-label="Cerca per nome" placeholder="Cerca una tavola per nome…" value="${esc(stato.testo)}">
                        <select class="form-control tavole-el-tipo" data-az="tipo" aria-label="Filtra per tipo"><option value="">Tutti i tipi</option>${TIPI_TAVOLA.map(k => `<option value="${k}"${stato.tipo === k ? ' selected' : ''}>${NOMI_TIPO_TAVOLA[k]}</option>`).join('')}</select></div>
                        <div class="tavole-el-griglia">${righe.length ? righe.map(card).join('') : '<p class="t-didascalia">Nessuna tavola salvata. Premi «Salva» nella finestra Tavole per crearle.</p>'}</div></div>`;
                    ov.querySelector('[data-az="chiudi"]').onclick = chiudi;
                    ov.querySelector('[data-az="cerca"]').oninput = e => { stato.testo = e.target.value; const p = e.target.selectionStart; disegna(); const n = ov.querySelector('[data-az="cerca"]'); n.focus(); n.setSelectionRange(p, p); };
                    ov.querySelector('[data-az="tipo"]').onchange = e => { stato.tipo = e.target.value; disegna(); };
                    ov.querySelectorAll('[data-id]').forEach(r => r.querySelectorAll('button').forEach(b => b.onclick = async () => {
                        const t = tavolaPerId(P, r.dataset.id); if (!t) return;
                        const az = b.dataset.az;
                        if (az === 'template') { const n = await appPrompt('', t.nome, { title: 'Salva questa tavola come template', label: 'Nome del template', okLabel: 'Salva' }); if (n && n.trim()) { const tp = templateDaTavola(t, n); if (typeof mostraToast === 'function') mostraToast(`Template «${tp.name}» salvato.`); } return; }
                        if (az === 'blocca') bloccaTavola(P, t.id, !t.bloccata);
                        else if (t.bloccata) { if (typeof mostraToast === 'function') mostraToast('La tavola è bloccata: sbloccala prima.'); return; }
                        else if (az === 'rinomina') {
                            let n = await appPrompt('Nuovo nome della tavola', t.nome);
                            if (n && n.trim()) {
                                const libero = nomeTavolaLibero(P, n, t.id);
                                // nome già preso: si chiede ogni volta (usare il nome col numero, o scegliere un altro)
                                if (libero !== n.trim() && !(await appConfirm(`Esiste già una tavola «${n.trim()}». Uso «${libero}»?`))) return;
                                t.nome = libero;
                            }
                        }
                        else if (az === 'duplica') duplicaTavola(P, t.id);
                        else if (az === 'report') t.inReport = t.inReport === false;
                        else if (az === 'elimina') { if (await appConfirmDelete(`Eliminare la tavola «${t.nome}»?`)) eliminaTavola(P, t.id); }
                        dopoModifica(); disegna();
                    }));
                };
                disegna();
                const c = ov.querySelector('[data-az="cerca"]'); if (c) c.focus();
            }
