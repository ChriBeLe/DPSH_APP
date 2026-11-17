            // ===================== LA SCALETTA DEL REPORT (Fase C, tappa ④) =====================
            // Le scelte sul contenuto del documento vivevano solo dentro «Esporta PDF»: chi voleva
            // vedere o cambiare cosa esce doveva aprire l'esportazione. La scaletta le mostra in
            // ordine, una riga per sezione, SENZA dati propri: scrive le proprietà che l'esportazione
            // già legge (proj.introduzione, surv.reportTemplateId, proj.tavole3d.nelReport,
            // proj.indiceTemplateId, impostazioniEsportazionePdf.includiIndice). Solo le prove accese
            // sono nuove: stanno in proj.scaletta.proveSpente, e finché non si tocca nulla vale il
            // vecchio default (tutte accese tranne le interpretazioni alternative).

            const modalScaletta = document.getElementById('modalScaletta');
            const modalScalettaOverlay = document.getElementById('modalScalettaOverlay');

            function scalettaProgetto() {
                return state.projects && state.projects[state.currentProjectId] || null;
            }

            /** Gli id delle prove accese, nell'ordine del report. Il default replica
             * popolaListaProveEsportazionePdf: le interpretazioni alternative partono spente. */
            function proveAcceseScaletta(proj) {
                const tutte = proveInOrdine(proj);
                const spente = proj && proj.scaletta && Array.isArray(proj.scaletta.proveSpente) ? new Set(proj.scaletta.proveSpente) : null;
                return tutte.filter(s => spente ? !spente.has(s.id) : !(s.header && s.header.interpretazioneDi)).map(s => s.id);
            }

            function impostaProvaAccesaScaletta(proj, survId, accesa) {
                const accese = new Set(proveAcceseScaletta(proj));
                if (accesa) accese.add(survId); else accese.delete(survId);
                // Si salvano le spente (non le accese): una prova creata dopo nasce accesa.
                proj.scaletta = { proveSpente: proveInOrdine(proj).filter(s => !accese.has(s.id)).map(s => s.id) };
                proj.updatedAt = Date.now();
                saveState();
            }

            /** Le sezioni che oggi uscirebbero nel documento e il nome del template, per la tappa ④. */
            function riepilogoScalettaReport(proj) {
                if (!proj) return '';
                const prove = proveAcceseScaletta(proj);
                const indice = !!impostazioniEsportazionePdf.includiIndice && prove.length > 1;
                const intro = !!(proj.introduzione && proj.introduzione.attiva);
                const tavole = !!(proj.tavole3d && proj.tavole3d.nelReport && datiTavoleReport(proj));
                const n = prove.length + (indice ? 1 : 0) + (intro ? 1 : 0) + (tavole ? 1 : 0);
                const primo = prove.length ? proj.surveys[prove[0]] : null;
                const tpl = state.reportTemplates && state.reportTemplates[(primo && primo.reportTemplateId) || state.reportTemplateId || 'classico'];
                return `${n} ${n === 1 ? 'sezione' : 'sezioni'}` + (tpl && tpl.name ? ' · ' + tpl.name : '');
            }

            function rigaScaletta(chiave, titolo, sotto, acceso, selectHtml, extra) {
                return `<div class="scaletta-riga" data-riga="${chiave}" style="display:flex; align-items:center; gap:8px; background:var(--bg-card-hover); border-radius:var(--radius-sm); padding:8px 10px;">
                    <label style="display:flex; align-items:center; gap:8px; flex:1; min-width:0; cursor:pointer;">
                        <input type="checkbox" role="switch" class="scaletta-interruttore" ${acceso ? 'checked' : ''} ${extra && extra.disabilitato ? 'disabled' : ''} aria-label="${titolo}" style="margin:0; flex-shrink:0;">
                        <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;"><strong>${titolo}</strong>${sotto ? ` <span class="t-didascalia">· ${sotto}</span>` : ''}</span>
                    </label>
                    ${selectHtml || ''}
                </div>`;
            }

            function selectTemplateScaletta(opzioni, attuale, classe, titolo) {
                return `<select class="form-control ${classe}" title="${titolo}" aria-label="${titolo}" style="width:130px; flex-shrink:0;">${opzioni.map(t => `<option value="${t.id}" ${t.id === attuale ? 'selected' : ''}>${testoSicuroStrati(t.name)}</option>`).join('')}</select>`;
            }

            function renderScaletta() {
                const proj = scalettaProgetto();
                const lista = document.getElementById('listaScaletta');
                if (!proj || !lista) return;
                const opzioni = elencoTemplateReportOrdinato();
                const prove = proveInOrdine(proj);
                const accese = new Set(proveAcceseScaletta(proj));
                const intro = proj.introduzione || (proj.introduzione = { attiva: false, templateId: 'classico' });
                const idxId = getIndiceTemplateIdPerProgetto(proj);
                const tavoleOk = !!datiTavoleReport(proj);
                let html = rigaScaletta('indice', 'Indice', 'in testa, con più di una prova', !!impostazioniEsportazionePdf.includiIndice,
                    selectTemplateScaletta(elencoIndiceTemplateOrdinato(), idxId, 'scaletta-sel-indice', 'Template dell\'indice'));
                html += rigaScaletta('introduzione', 'Capitolo introduttivo', '', !!intro.attiva,
                    selectTemplateScaletta(opzioni, intro.templateId || 'classico', 'scaletta-sel-intro', 'Template del capitolo introduttivo'));
                html += prove.map(s => {
                    const alt = !!(s.header && s.header.interpretazioneDi);
                    const sotto = alt ? 'interpretazione alternativa' : ((s.header && s.header.localita) || '');
                    return rigaScaletta('prova:' + s.id, `Prova N° ${testoSicuroStrati((s.header && s.header.provaNr) || '?')}`, testoSicuroStrati(sotto), accese.has(s.id),
                        selectTemplateScaletta(opzioni, s.reportTemplateId || 'classico', 'scaletta-sel-prova', 'Template di questa prova'));
                }).join('');
                html += rigaScaletta('tavole', 'Tavole 2D e 3D', tavoleOk ? 'dopo le prove' : 'servono prove col GPS e con le letture',
                    tavoleOk && !!(proj.tavole3d && proj.tavole3d.nelReport), '', { disabilitato: !tavoleOk });
                lista.innerHTML = html;
                lista.querySelectorAll('.scaletta-riga').forEach(riga => {
                    const chiave = riga.dataset.riga;
                    const inter = riga.querySelector('.scaletta-interruttore');
                    const sel = riga.querySelector('select');
                    inter.addEventListener('change', () => {
                        if (chiave === 'indice') impostazioniEsportazionePdf.includiIndice = inter.checked;
                        else if (chiave === 'introduzione') { intro.attiva = inter.checked; proj.updatedAt = Date.now(); saveState(); }
                        else if (chiave === 'tavole') { if (!proj.tavole3d) proj.tavole3d = { regola: {}, escluse: [] }; proj.tavole3d.nelReport = inter.checked; proj.updatedAt = Date.now(); saveState(); }
                        else impostaProvaAccesaScaletta(proj, chiave.slice(6), inter.checked);
                        aggiornaStatoTappaReport();
                    });
                    if (sel) sel.addEventListener('change', () => {
                        if (chiave === 'indice') { proj.indiceTemplateId = sel.value; proj.updatedAt = Date.now(); saveState(); }
                        else if (chiave === 'introduzione') { intro.templateId = sel.value; proj.updatedAt = Date.now(); saveState(); }
                        else impostaTemplateReportProva(proj, chiave.slice(6), sel.value);
                        aggiornaStatoTappaReport();
                    });
                });
            }

            function aggiornaStatoTappaReport() {
                const el = document.getElementById('lblTappaReport');
                if (el) el.textContent = riepilogoScalettaReport(scalettaProgetto());
            }

            function apriScalettaReport() {
                if (!scalettaProgetto()) return;
                renderScaletta();
                modalScalettaOverlay.classList.add('open');
                modalScaletta.classList.add('open');
            }
            function chiudiScalettaReport() {
                modalScalettaOverlay.classList.remove('open');
                modalScaletta.classList.remove('open');
            }

            document.getElementById('btnScalettaX').addEventListener('click', chiudiScalettaReport);
            document.getElementById('btnScalettaChiudi').addEventListener('click', chiudiScalettaReport);
            modalScalettaOverlay.addEventListener('click', chiudiScalettaReport);
            // La libreria dei template sta sopra a tutto: si chiude la scaletta e al ritorno si riapre dal Progetto.
            document.getElementById('btnScalettaTemplate').addEventListener('click', () => { chiudiScalettaReport(); openReportTemplatesModal(); });
            // Niente soloProve: l'esportazione parte dalle prove accese nella scaletta.
            document.getElementById('btnScalettaPdf').addEventListener('click', () => {
                const id = state.currentProjectId; chiudiScalettaReport();
                if (id) apriEsportazionePdfModal({ type: 'project', id });
            });
            document.getElementById('btnScalettaWord').addEventListener('click', () => {
                const id = state.currentProjectId; chiudiScalettaReport();
                if (id) apriEsportazionePdfModal({ type: 'project', id, formato: 'word' });
            });
