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
            function apriElencoTavole3d() {
                const bozza = tavole3d.bozza; if (!bozza) return;
                const P = { tavole3d: bozza }, esc = escapeHtmlDidascalia;
                let ov = document.getElementById('tavoleElenco');
                if (!ov) {
                    ov = document.createElement('div'); ov.id = 'tavoleElenco'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-label', 'Tavole salvate'); ov.setAttribute('aria-modal', 'true');
                    ov.style.cssText = 'position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.45);display:flex;align-items:center;justify-content:center;padding:12px';
                    document.body.appendChild(ov);
                }
                ov.hidden = false;
                const stato = { testo: '', tipo: '' };
                const chiudi = () => { ov.hidden = true; ov.innerHTML = ''; };
                const disegna = () => {
                    const righe = righeElencoTavole(P, Object.assign({ impronta: improntaDatiTavole3d() }, stato));
                    ov.innerHTML = `<div style="background:var(--bg-card,#fff);color:inherit;border-radius:12px;max-width:640px;width:100%;max-height:90vh;display:flex;flex-direction:column;padding:14px;gap:10px">
                        <div style="display:flex;gap:8px;align-items:center"><b style="flex:1">Tavole salvate (${registroTavole(P).length})</b><button type="button" class="bt" data-az="chiudi">Chiudi</button></div>
                        <div style="display:flex;gap:8px"><input type="search" class="form-control" data-az="cerca" aria-label="Cerca per nome" placeholder="Cerca per nome" value="${esc(stato.testo)}" style="flex:1">
                        <select class="form-control" data-az="tipo" aria-label="Filtra per tipo"><option value="">Tutti i tipi</option>${TIPI_TAVOLA.map(k => `<option value="${k}"${stato.tipo === k ? ' selected' : ''}>${NOMI_TIPO_TAVOLA[k]}</option>`).join('')}</select></div>
                        <div style="overflow:auto;display:flex;flex-direction:column;gap:6px">${righe.length ? righe.map(({ t, etichette }) => `<div style="border:1px solid var(--border,#ccc);border-radius:8px;padding:8px;display:flex;flex-direction:column;gap:4px" data-id="${esc(t.id)}">
                            <div style="display:flex;gap:8px;align-items:center">${t.miniatura ? `<img src="${esc(t.miniatura)}" alt="" style="width:64px;height:auto;border-radius:4px;border:1px solid var(--border,#ccc)">` : ''}<div><b>${esc(t.nome)}</b> <span class="t-didascalia">${NOMI_TIPO_TAVOLA[t.tipo] || t.tipo} · versione ${t.versione}${etichette.length ? ' · ' + esc(etichette.join(' · ')) : ''}</span></div></div>
                            <div style="display:flex;flex-wrap:wrap;gap:6px"><button type="button" class="bt" data-az="rinomina">Rinomina</button><button type="button" class="bt" data-az="duplica">Duplica</button>
                            <button type="button" class="bt" data-az="blocca">${t.bloccata ? 'Sblocca' : 'Blocca'}</button><button type="button" class="bt" data-az="report">${t.inReport === false ? 'Metti nel report' : 'Togli dal report'}</button>
                            <button type="button" class="bt" data-az="elimina">Elimina</button></div></div>`).join('') : '<p class="t-didascalia">Nessuna tavola salvata. Premi «Salva» nella finestra Tavole per crearle.</p>'}</div></div>`;
                    ov.querySelector('[data-az="chiudi"]').onclick = chiudi;
                    ov.querySelector('[data-az="cerca"]').oninput = e => { stato.testo = e.target.value; const p = e.target.selectionStart; disegna(); const n = ov.querySelector('[data-az="cerca"]'); n.focus(); n.setSelectionRange(p, p); };
                    ov.querySelector('[data-az="tipo"]').onchange = e => { stato.tipo = e.target.value; disegna(); };
                    ov.querySelectorAll('[data-id]').forEach(r => r.querySelectorAll('button').forEach(b => b.onclick = async () => {
                        const t = tavolaPerId(P, r.dataset.id); if (!t) return;
                        const az = b.dataset.az;
                        if (az === 'blocca') bloccaTavola(P, t.id, !t.bloccata);
                        else if (t.bloccata) { if (typeof mostraToast === 'function') mostraToast('La tavola è bloccata: sbloccala prima.'); return; }
                        else if (az === 'rinomina') { const n = await appPrompt('Nuovo nome della tavola', t.nome); if (n && n.trim()) t.nome = nomeTavolaLibero(P, n, t.id); }
                        else if (az === 'duplica') duplicaTavola(P, t.id);
                        else if (az === 'report') t.inReport = t.inReport === false;
                        else if (az === 'elimina') { if (await appConfirmDelete(`Eliminare la tavola «${t.nome}»?`)) eliminaTavola(P, t.id); }
                        statoSalvataggioTavole3d(); disegna();
                    }));
                };
                ov.onkeydown = e => { if (e.key === 'Escape') { e.stopPropagation(); chiudi(); } };
                disegna();
                const c = ov.querySelector('[data-az="cerca"]'); if (c) c.focus();
            }
