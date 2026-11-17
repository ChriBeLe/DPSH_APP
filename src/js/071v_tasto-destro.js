            // ===================== IL TASTO DESTRO, DOVE SI LAVORA (PC) =====================
            // Sul PC le azioni di un oggetto stanno nel menu del tasto destro, sull'oggetto: niente
            // ⋮ da cercare, niente doppio clic da indovinare, niente finestre da aprire per arrivare
            // a un'azione. Il menu è quello del Registro (apriMenuContesto, 071b). Qui i punti dove
            // mancava: strati, blocchi, intestazione, piè di pagina e pagine del template, template
            // della libreria. Ogni voce riusa il comando che c'era già (stessi controlli, stesso
            // Annulla), non lo riscrive.

            /** Le voci del ⋮ di uno strato esistono solo a menu aperto: si apre (un istante) e si
             * preme la voce, così valgono i suoi controlli e il suo Annulla. */
            function azioneDelMenuStrato(idx, selettore) {
                stratoMoreMenuOpenIdx = idx;
                renderStratiList();
                const b = document.querySelector(`#stratiListContainer ${selettore}[data-strato-idx="${idx}"]`);
                if (b) b.click();
                else { stratoMoreMenuOpenIdx = null; renderStratiList(); }
            }
            function apriMenuStrato(e, idx) {
                const s = state.strati[idx];
                if (!s) return;
                const aperto = stratiRowExpanded.has(s.id);
                const voci = [
                    ['Parametri avanzati…', 'i-flask', '', () => apriWizardParametri(s.id)],
                    ['Assegna gli intervalli', 'i-edit', '', () => vaiAdAssegnareIntervalli()],
                    ['Rinomina', 'i-rinomina', '', () => {
                        const campo = document.querySelector(`#stratiListContainer .strato-name-input[data-strato-idx="${idx}"]`);
                        if (campo) { campo.focus(); campo.select(); }
                    }],
                    [aperto ? 'Chiudi colore e retino' : 'Colore, retino e comportamento', 'i-stack', '', () => {
                        const testa = document.querySelector(`#stratiListContainer .strato-row-header[data-strato-idx="${idx}"]`);
                        if (testa) testa.click();
                    }],
                    '-'
                ];
                if (idx > 0) voci.push(['Sposta su', 'i-arrow-up', '', () => azioneDelMenuStrato(idx, '.strato-move-btn[data-dir="-1"]')]);
                if (idx < state.strati.length - 1) voci.push(['Sposta giù', 'i-chevron-down', '', () => azioneDelMenuStrato(idx, '.strato-move-btn[data-dir="1"]')]);
                voci.push(['Duplica', 'i-duplica', '', () => azioneDelMenuStrato(idx, '.strato-duplicate-btn')]);
                if (stratoHaCollegamentoArchivioValido(s)) voci.push(['Aggiorna nell\'archivio', 'i-database', '', () => azioneDelMenuStrato(idx, '.strato-update-archive-btn')]);
                else voci.push(['Salva nell\'archivio', 'i-database', '', () => { const b = document.querySelector(`#stratiListContainer .strato-save-archive-btn[data-strato-idx="${idx}"]`); if (b) b.click(); }]);
                voci.push('-', ['Elimina', 'i-trash', '', () => azioneDelMenuStrato(idx, '.strato-delete-btn'), true]);
                apriMenuContesto(e, s.name || 'Strato', voci);
            }

            /** Il menu di un blocco del template: le azioni di tutti i giorni subito, le
             * impostazioni nel pannello del blocco. Sposta e Rimuovi passano dal pannello, che sa
             * dei blocchi bloccati e dà l'Annulla. */
            function premiNelMenuDelBlocco(blockId, selettore) {
                apriMenuBloccoEditor(blockId);
                const menu = document.getElementById('templateEditorBlockMenu');
                const b = menu && menu.querySelector(selettore);
                if (b && !b.disabled) b.click();
            }
            function apriMenuBloccoPc(e, blockId) {
                const blk = trovaBloccoPerIdOvunque(blockId);
                if (!blk) return;
                selezionaBloccoEditor(blockId);
                const nome = (REPORT_BLOCK_TYPES[blk.type] || {}).label || 'Blocco';
                const voci = [];
                if (blk.type === 'testo' || blk.type === 'titolo') voci.push(['Modifica il testo…', 'i-type', 'doppio clic', () => apriTplTextEditor(blockId)]);
                voci.push(['Impostazioni del blocco…', 'i-settings', '', () => apriMenuBloccoEditor(blockId)]);
                voci.push(['Sposta su un\'altra pagina…', 'i-move-y', '', () => premiNelMenuDelBlocco(blockId, '.tpl-editor-menu-sposta')]);
                voci.push('-', ['Elimina il blocco', 'i-trash', 'Canc', () => premiNelMenuDelBlocco(blockId, '.tpl-editor-menu-remove'), true]);
                apriMenuContesto(e, nome, voci);
            }

            function apriMenuIntestazionePc(e) {
                const chk = document.getElementById('chkPageHeaderEnabled');
                apriMenuContesto(e, 'Intestazione', [
                    ['Testo formattato…', 'i-type', '', () => apriTplTextEditor(ID_INTESTAZIONE_EDITOR)],
                    ['Immagine…', 'i-file', '', () => { const b = document.getElementById('btnUploadHeaderImage'); if (b) b.click(); }],
                    ['Distanza dal bordo come in Word (1,25 cm)', 'i-ruler', '', () => { const b = document.getElementById('btnDistanzaIntestazioneWord'); if (b) b.click(); }],
                    ['Importa da un Word…', 'i-upload', '', () => { const b = document.getElementById('btnImportaDaWord'); if (b) b.click(); }],
                    '-',
                    ['Nascondi l\'intestazione', 'i-eye', '', () => { if (chk) { chk.checked = false; chk.dispatchEvent(new Event('change', { bubbles: true })); } }]
                ]);
            }
            function apriMenuPiedePc(e) {
                const chk = document.getElementById('chkPageFooterEnabled');
                apriMenuContesto(e, 'Piè di pagina', [
                    ['Testo formattato…', 'i-type', '', () => apriTplTextEditor(ID_PIEDE_EDITOR)],
                    ['Importa da un Word…', 'i-upload', '', () => { const b = document.getElementById('btnImportaDaWord'); if (b) b.click(); }],
                    '-',
                    ['Nascondi il piè di pagina', 'i-eye', '', () => { if (chk) { chk.checked = false; chk.dispatchEvent(new Event('change', { bubbles: true })); } }]
                ]);
            }
            function apriMenuPaginaPc(e, idx) {
                const voci = [
                    ['Apri', 'i-folder-open', '', () => cambiaPaginaEditor(idx)],
                    ['Nuova pagina', 'i-plus', '', () => aggiungiPaginaEditor()]
                ];
                if (templateEditorState.pages.length > 1) voci.push('-', ['Elimina la pagina', 'i-trash', '', () => eliminaPaginaEditor(idx), true]);
                apriMenuContesto(e, `Pagina ${idx + 1}`, voci);
            }
            function apriMenuTemplateLibreria(e, id) {
                const t = state.reportTemplates[id];
                if (!t) return;
                const voci = [
                    ['Apri il layout', 'i-layout-pagina', '', () => apriTemplateEditor(id)],
                    ['Duplica', 'i-duplica', '', () => duplicaTemplateReport(id)]
                ];
                if (!t.builtIn) voci.push(['Rinomina', 'i-rinomina', '', () => rinominaTemplateReport(id)], '-', ['Elimina', 'i-trash', '', () => eliminaTemplateReport(id), true]);
                apriMenuContesto(e, t.name || 'Template', voci);
            }

            document.addEventListener('contextmenu', (e) => {
                if (!suPc() || !e.target.closest) return;
                const t = e.target;
                // Dentro un campo di testo resta il menu del browser (copia, incolla, correttore).
                if (t.closest('input, textarea, [contenteditable="true"]')) return;
                const strato = t.closest('#stratiListContainer [data-strato-row-idx]');
                if (strato) return apriMenuStrato(e, Number(strato.dataset.stratoRowIdx));
                if (templateEditorState && !templateEditorState.previewMode && t.closest('#modalTemplateEditor')) {
                    if (t.closest('#templateEditorHeaderZone')) return apriMenuIntestazionePc(e);
                    if (t.closest('#templateEditorFooterZone')) return apriMenuPiedePc(e);
                    const pagina = t.closest('.tpl-editor-page-thumb[data-page-idx], .tpl-editor-page-tab[data-page-idx]');
                    if (pagina) return apriMenuPaginaPc(e, Number(pagina.dataset.pageIdx));
                }
                const tpl = t.closest('#reportTemplatesList [data-tpl-id]');
                if (tpl) return apriMenuTemplateLibreria(e, tpl.dataset.tplId);
            });

            // Canc sul blocco selezionato, come in ogni editor sul PC (passa da Rimuovi, con Annulla).
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Delete' || !suPc() || !templateEditorState || !templateEditorState.selectedBlockId) return;
                const ed = document.getElementById('modalTemplateEditor');
                if (!ed || !ed.classList.contains('open') || document.querySelector('.modal.open:not(#modalTemplateEditor)')) return;
                if (e.target && e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]')) return;
                e.preventDefault();
                premiNelMenuDelBlocco(templateEditorState.selectedBlockId, '.tpl-editor-menu-remove');
            });
