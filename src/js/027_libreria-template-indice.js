            // ===================== LIBRERIA TEMPLATE INDICE =====================
            // Mirror letterale della libreria Template di Report qui sopra: stessa collezione keyed
            // by id, stesse regole builtIn (non rinominabile/eliminabile, ma modificabile nel
            // contenuto), stesso flusso nome→collisione→creazione. Nessuna astrazione condivisa con
            // l'equivalente report, di proposito: sono due librerie concettualmente diverse (layout
            // di pagina contro stile del solo indice) che oggi condividono solo la forma del codice.
            const indiceTemplatesList = document.getElementById('indiceTemplatesList');

            /** Elenco ordinato: le 3 vesti precompilate in un ordine fisso (progressione naturale
             * Classico→Moderno→Tecnico, non alfabetico), poi il resto per nome. */
            function elencoIndiceTemplateOrdinato() {
                const ordineBuiltIn = ['idx_classico'];
                const all = Object.values(state.indiceTemplates || {});
                return all.sort((a, b) => {
                    const ia = ordineBuiltIn.indexOf(a.id), ib = ordineBuiltIn.indexOf(b.id);
                    if (ia !== -1 && ib !== -1) return ia - ib;
                    if (ia !== -1) return -1;
                    if (ib !== -1) return 1;
                    return (a.name || '').localeCompare(b.name || '');
                });
            }
            function nomeIndiceTemplateGiaEsistente(nome, escludiId) {
                const n = (nome || '').trim().toLowerCase();
                return Object.values(state.indiceTemplates).some(t => t.id !== escludiId && (t.name || '').trim().toLowerCase() === n);
            }
            function prossimoNomeIndiceTemplateDisponibile(base) {
                const radice = base.replace(/\s*\(\d+\)\s*$/, '');
                let n = 2, candidato;
                do { candidato = `${radice} (${n})`; n++; } while (nomeIndiceTemplateGiaEsistente(candidato));
                return candidato;
            }
            async function risolviCollisioneNomeIndiceTemplate(nomeProposto, escludiId) {
                let nome = nomeProposto.trim();
                while (nomeIndiceTemplateGiaEsistente(nome, escludiId)) {
                    const scelta = await appDialog(
                        `Esiste già un template indice chiamato "${nome}".`,
                        { confirm: true, title: 'Nome già in uso',
                          okLabel: 'Rinomina automaticamente', extraLabel: 'Scegli un altro nome', cancelLabel: 'Annulla' }
                    );
                    if (scelta === true) return prossimoNomeIndiceTemplateDisponibile(nome);
                    if (scelta === 'extra') {
                        const nuovo = await appPrompt('', nome, { title: 'Nuovo nome', label: 'Nome del template indice', okLabel: 'Continua' });
                        if (!nuovo || !nuovo.trim()) return null;
                        nome = nuovo.trim();
                        continue;
                    }
                    return null;
                }
                return nome;
            }
            async function duplicaIndiceTemplate(sourceId) {
                const source = state.indiceTemplates[sourceId];
                if (!source) return;
                let nome = await appPrompt('', `Copia di ${source.name}`, { title: 'Duplica template indice', label: 'Nome del nuovo template', okLabel: 'Crea' });
                if (!nome || !nome.trim()) return null;
                nome = await risolviCollisioneNomeIndiceTemplate(nome.trim());
                if (nome === null) return null;
                const newId = 'idx_' + Date.now();
                const ora = Date.now();
                state.indiceTemplates[newId] = Object.assign({}, JSON.parse(JSON.stringify(source)), { id: newId, name: nome, builtIn: false, createdAt: ora, updatedAt: ora });
                saveState();
                renderIndiceTemplatesList();
                return newId;
            }
            /** Nuovo template indice: parte dai valori di serie (stileIndiceDiDefault), poi apre
             * subito "Personalizza indice" su di esso — stesso schema di creaTemplateVuoto che apre
             * subito l'editor layout appena creato un template di pagina vuoto. */
            async function creaNuovoTemplateIndice() {
                let nome = await appPrompt('', 'Nuovo template indice', { title: 'Nuovo template indice', label: 'Nome del nuovo template', okLabel: 'Crea' });
                if (!nome || !nome.trim()) return null;
                nome = await risolviCollisioneNomeIndiceTemplate(nome.trim());
                if (nome === null) return null;
                const newId = 'idx_' + Date.now();
                const ora = Date.now();
                state.indiceTemplates[newId] = Object.assign({ id: newId, name: nome, builtIn: false, createdAt: ora, updatedAt: ora }, stileIndiceDiDefault());
                saveState();
                renderIndiceTemplatesList();
                return newId;
            }
            async function rinominaIndiceTemplate(id) {
                const tpl = state.indiceTemplates[id];
                if (!tpl || tpl.builtIn) return;
                let nuovoNome = await appPrompt('', tpl.name, { title: 'Rinomina template indice', label: 'Nome del template', okLabel: 'Rinomina' });
                if (!nuovoNome || !nuovoNome.trim()) return;
                nuovoNome = await risolviCollisioneNomeIndiceTemplate(nuovoNome.trim(), id);
                if (nuovoNome === null) return;
                tpl.name = nuovoNome;
                tpl.updatedAt = Date.now();
                saveState();
                renderIndiceTemplatesList();
            }
            async function eliminaIndiceTemplate(id) {
                const tpl = state.indiceTemplates[id];
                if (!tpl || tpl.builtIn) return;
                const ok = await appConfirm(`Eliminare il template indice "${tpl.name}"? I progetti che lo usano torneranno automaticamente al template Classico.`);
                if (!ok) return;
                const backup = JSON.parse(JSON.stringify(tpl));
                delete state.indiceTemplates[id];
                saveState();
                renderIndiceTemplatesList();
                showUndoBanner(`Template indice "${tpl.name}" eliminato`, () => {
                    state.indiceTemplates[id] = backup;
                    saveState();
                    renderIndiceTemplatesList();
                });
            }
            function renderIndiceTemplatesList() {
                if (!indiceTemplatesList) return;
                chiudiMenuAzioniTemplate();
                indiceTemplatesList.innerHTML = elencoIndiceTemplateOrdinato().map(t => `
                    <div style="display:flex; align-items:center; gap:10px; background:${t.builtIn ? 'var(--bg-sunken)' : 'var(--bg-main)'}; border:1px solid ${t.builtIn ? 'var(--border-strong)' : 'var(--border)'}; border-style:${t.builtIn ? 'dashed' : 'solid'}; border-radius:var(--radius-sm); padding:9px 10px;">
                        <button type="button" class="tpl-riga-thumb-wrap idx-tpl-personalizza" data-tpl-id="${t.id}" title="Apri lo stile di &quot;${t.name}&quot;">${miniaturaTemplateIndiceHtml(t)}</button>
                        <div style="flex:1; min-width:0;">
                            <div style="display:flex; align-items:center; gap:5px; font-weight:700; font-size:13px; color:var(--text-main); overflow:hidden;">
                                ${t.builtIn ? `<svg class="ico" style="width:12px; height:12px; color:var(--text-muted); flex-shrink:0;" title="Non rinominabile né eliminabile"><use href="#i-lock"/></svg>` : ''}
                                <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span>
                            </div>
                            <div style="font-size:10px; color:var(--text-muted); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.builtIn ? 'Preimpostato' : ''}${t.updatedAt ? `${t.builtIn ? ' · ' : ''}modificato il ${new Date(t.updatedAt).toLocaleDateString('it-IT')}` : ''}</div>
                        </div>
                        <button type="button" class="tpl-riga-primaria idx-tpl-personalizza" data-tpl-id="${t.id}"><svg class="ico"><use href="#i-indice-pagina"/></svg>Stile</button>
                        <button type="button" class="tpl-riga-kebab idx-tpl-azioni" data-tpl-id="${t.id}" title="Altre azioni"><svg class="ico"><use href="#i-more"/></svg></button>
                    </div>
                `).join('');

                indiceTemplatesList.querySelectorAll('.idx-tpl-personalizza').forEach(btn => {
                    btn.addEventListener('click', () => { if (typeof apriModalPersonalizzaIndice === 'function') apriModalPersonalizzaIndice(btn.dataset.tplId); });
                });
                indiceTemplatesList.querySelectorAll('.idx-tpl-azioni').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.tplId;
                        const t = state.indiceTemplates[id];
                        if (!t) return;
                        const voci = [{ icona: 'i-duplica', etichetta: 'Duplica', azione: () => duplicaIndiceTemplate(id) }];
                        if (!t.builtIn) {
                            voci.push({ icona: 'i-rinomina', etichetta: 'Rinomina', azione: () => rinominaIndiceTemplate(id) });
                            voci.push({ separatore: true });
                            voci.push({ icona: 'i-trash', etichetta: 'Elimina', pericolo: true, azione: () => eliminaIndiceTemplate(id) });
                        }
                        apriMenuAzioniTemplate(btn, voci);
                    });
                });
            }
            const btnNewIndiceTemplate = document.getElementById('btnNewIndiceTemplate');
            if (btnNewIndiceTemplate) {
                btnNewIndiceTemplate.addEventListener('click', async () => {
                    const newId = await creaNuovoTemplateIndice();
                    if (!newId) return;
                    if (typeof apriModalPersonalizzaIndice === 'function') apriModalPersonalizzaIndice(newId);
                });
            }

