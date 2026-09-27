            // =========================================================================
            // UI ARCHIVIO LITOLOGICO: PICKER (per progetto) + GESTIONE GLOBALE
            // =========================================================================

            const modalArchivePickerOverlay = document.getElementById('modalArchivePickerOverlay');
            const modalArchivePicker = document.getElementById('modalArchivePicker');
            const archivePickerTitle = document.getElementById('archivePickerTitle');
            const archivePickerHint = document.getElementById('archivePickerHint');
            const archivePickerList = document.getElementById('archivePickerList');
            const btnCloseArchivePickerX = document.getElementById('btnCloseArchivePickerX');
            const btnCancelArchivePicker = document.getElementById('btnCancelArchivePicker');
            const btnConfirmArchivePicker = document.getElementById('btnConfirmArchivePicker');

            // pickerContext: { mode: 'single'|'multi', needCount, onConfirm(selectedArchIds[]) }
            let archivePickerContext = null;
            let archivePickerSelection = [];

            function renderArchivePickerList() {
                const list = getArchiveList();
                if (list.length === 0) {
                    archivePickerList.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:16px;">L'archivio è ancora vuoto. Salva uno strato dalla gestione strati per iniziare a popolarlo.</div>`;
                    return;
                }
                archivePickerList.innerHTML = list.map(arch => {
                    const stats = computeArchiveStats(arch.id);
                    const selected = archivePickerSelection.includes(arch.id);
                    return `
                        <label class="archive-pick-row" data-arch-id="${arch.id}" style="display:flex; align-items:center; gap:10px; padding:9px 10px; background:${selected ? 'var(--purple-soft)' : 'var(--bg-card-hover)'}; border:1px solid ${selected ? 'var(--purple)' : 'var(--border)'}; border-radius:var(--radius-sm); cursor:pointer;">
                            <input type="checkbox" class="archive-pick-checkbox" data-arch-id="${arch.id}" ${selected ? 'checked' : ''} style="width:18px; height:18px; flex:0 0 auto;">
                            <div style="width:24px; height:24px; border-radius:6px; flex:0 0 auto; border:1px solid rgba(0,0,0,0.25); ${getPatternCss(arch.pattern, arch.color)}"></div>
                            <div style="flex:1; min-width:0;">
                                <div style="font-weight:700; font-size:13px; color:var(--text-main);">${arch.name}</div>
                                <div style="font-size:10px; color:var(--text-muted);">${stats.projectCount} progetti • ${stats.surveyCount} prove${stats.avgColpi !== null ? ' • media ' + stats.avgColpi.toFixed(1) + ' colpi' : ''}</div>
                            </div>
                        </label>
                    `;
                }).join('');

                archivePickerList.querySelectorAll('.archive-pick-checkbox').forEach(chk => {
                    chk.addEventListener('change', (e) => {
                        const id = e.target.dataset.archId;
                        if (e.target.checked) {
                            if (archivePickerContext && archivePickerContext.mode === 'single') {
                                archivePickerSelection = [id];
                            } else if (!archivePickerSelection.includes(id)) {
                                archivePickerSelection.push(id);
                            }
                        } else {
                            archivePickerSelection = archivePickerSelection.filter(x => x !== id);
                        }
                        updateArchivePickerConfirmState();
                        renderArchivePickerList();
                    });
                });
            }

            function updateArchivePickerConfirmState() {
                if (!archivePickerContext) return;
                const need = archivePickerContext.needCount || 1;
                const ok = archivePickerContext.mode === 'single'
                    ? archivePickerSelection.length === 1
                    : archivePickerSelection.length > 0 && archivePickerSelection.length <= need;
                btnConfirmArchivePicker.style.opacity = ok ? '1' : '0.45';
                btnConfirmArchivePicker.style.pointerEvents = ok ? 'auto' : 'none';
                if (archivePickerContext.mode === 'multi') {
                    btnConfirmArchivePicker.innerHTML = `${ico('check')} Conferma (${archivePickerSelection.length}/${need})`;
                }
            }

            function openArchivePicker(context) {
                archivePickerContext = context;
                archivePickerSelection = [];
                archivePickerTitle.textContent = context.mode === 'single' ? "Scegli uno Strato dall'Archivio" : `Scegli fino a ${context.needCount} Strati dall'Archivio`;
                archivePickerHint.textContent = context.mode === 'single'
                    ? "Verrà aggiunta una copia dello strato scelto ai litologici di questo progetto."
                    : `Servono ${context.needCount} strat${context.needCount === 1 ? 'o' : 'i'} in più rispetto a quelli già configurati: scegli quali attingere dall'archivio.`;
                btnConfirmArchivePicker.textContent = 'Conferma Selezione';
                updateArchivePickerConfirmState();
                renderArchivePickerList();
                modalArchivePickerOverlay.classList.add('open');
                modalArchivePicker.classList.add('open');
            }
            function closeArchivePicker() {
                modalArchivePickerOverlay.classList.remove('open');
                modalArchivePicker.classList.remove('open');
                archivePickerContext = null;
                archivePickerSelection = [];
            }

            if (btnCloseArchivePickerX) btnCloseArchivePickerX.addEventListener('click', closeArchivePicker);
            if (btnCancelArchivePicker) btnCancelArchivePicker.addEventListener('click', closeArchivePicker);
            if (modalArchivePickerOverlay) modalArchivePickerOverlay.addEventListener('click', closeArchivePicker);

            if (btnConfirmArchivePicker) {
                btnConfirmArchivePicker.addEventListener('click', () => {
                    if (!archivePickerContext || archivePickerSelection.length === 0) return;
                    const ctx = archivePickerContext;
                    const selection = archivePickerSelection.slice();
                    closeArchivePicker();
                    ctx.onConfirm(selection);
                });
            }

            // Punto di ingresso: "Dall'Archivio" nella Gestione Strati del progetto
            const btnPickFromArchive = document.getElementById('btnPickFromArchive');
            if (btnPickFromArchive) {
                btnPickFromArchive.addEventListener('click', () => {
                    if (getArchiveList().length === 0) {
                        appAlert("L'archivio litologico è ancora vuoto. Salva uno strato con \"Salva in Archivio\" per iniziare a popolarlo, poi potrai riutilizzarlo qui e in altri progetti.");
                        return;
                    }
                    openArchivePicker({
                        mode: 'single',
                        needCount: 1,
                        onConfirm: (selectedIds) => {
                            const newStrato = createStratoFromArchive(selectedIds[0]);
                            if (!newStrato) return;
                            state.strati.push(newStrato);
                            stratiRowExpanded.add(newStrato.id);
                            saveState();
                            renderStratiList();
                            triggerVibrate(30);
                        }
                    });
                });
            }

