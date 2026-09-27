            // =========================================================================
            // SELETTORE FOTO DEL PROGETTO — riusato per inserire direttamente una foto già
            // scattata nella nota, e come sfondo su cui disegnare nello strumento di disegno.
            // Raccoglie le foto di TUTTE le prove del progetto (non solo quella aperta al
            // momento), etichettandole con la prova di provenienza.
            // =========================================================================
            const modalNotePhotoPickerOverlay = document.getElementById('modalNotePhotoPickerOverlay');
            const modalNotePhotoPicker = document.getElementById('modalNotePhotoPicker');
            const btnCloseNotePhotoPickerX = document.getElementById('btnCloseNotePhotoPickerX');
            const notePhotoPickerGrid = document.getElementById('notePhotoPickerGrid');
            let notePhotoPickerOnSelect = null;

            async function raccogliFotoProgetto(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj || !proj.surveys) return [];
                const risultato = [];
                for (const sid of Object.keys(proj.surveys)) {
                    const surv = proj.surveys[sid];
                    const label = `Prova N° ${(surv.header && surv.header.provaNr) || '1'}`;
                    for (const p of (surv.photos || [])) {
                        risultato.push({ id: p.id, timestamp: p.timestamp, label });
                    }
                }
                return risultato;
            }

            function chiudiSelettoreFotoProgetto() {
                if (modalNotePhotoPickerOverlay) modalNotePhotoPickerOverlay.classList.remove('open');
                if (modalNotePhotoPicker) modalNotePhotoPicker.classList.remove('open');
                notePhotoPickerOnSelect = null;
            }

            /** Apre il selettore; onSelect(dataUrl, meta) viene chiamato con l'immagine a piena
             * risoluzione (recuperata da cache RAM o IndexedDB) quando l'utente ne tocca una. */
            async function apriSelettoreFotoProgetto(onSelect) {
                if (!noteProjectContext) return;
                notePhotoPickerOnSelect = onSelect;
                const foto = await raccogliFotoProgetto(noteProjectContext.projId);
                if (notePhotoPickerGrid) {
                    if (foto.length === 0) {
                        notePhotoPickerGrid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 20px 10px; font-size: 12px;">Nessuna foto presente in questo progetto. Scattane una da una delle prove.</div>`;
                    } else {
                        notePhotoPickerGrid.innerHTML = foto.map((p, idx) => `
                            <div class="note-photo-pick-item" data-note-photo-idx="${idx}">
                                <img data-note-photo-thumb-id="${p.id}" alt="">
                                <div class="note-photo-pick-tag">${p.label}</div>
                            </div>
                        `).join('');
                        notePhotoPickerGrid.querySelectorAll('img[data-note-photo-thumb-id]').forEach(async (imgEl) => {
                            const id = imgEl.getAttribute('data-note-photo-thumb-id');
                            const src = photoMemoryCache[id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(id) : null);
                            if (src) { imgEl.src = src; photoMemoryCache[id] = src; }
                        });
                        notePhotoPickerGrid.querySelectorAll('.note-photo-pick-item').forEach(el => {
                            el.addEventListener('click', async () => {
                                const idx = parseInt(el.getAttribute('data-note-photo-idx'), 10);
                                const meta = foto[idx];
                                if (!meta) return;
                                const dataUrl = photoMemoryCache[meta.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(meta.id) : null);
                                if (!dataUrl) return;
                                const cb = notePhotoPickerOnSelect;
                                chiudiSelettoreFotoProgetto();
                                if (cb) cb(dataUrl, meta);
                            });
                        });
                    }
                }
                if (modalNotePhotoPickerOverlay) modalNotePhotoPickerOverlay.classList.add('open');
                if (modalNotePhotoPicker) modalNotePhotoPicker.classList.add('open');
            }
            if (btnCloseNotePhotoPickerX) btnCloseNotePhotoPickerX.addEventListener('click', chiudiSelettoreFotoProgetto);
            if (modalNotePhotoPickerOverlay) modalNotePhotoPickerOverlay.addEventListener('click', chiudiSelettoreFotoProgetto);

            collegaComandoTesto('galleria', () => {
                apriSelettoreFotoProgetto((dataUrl) => inserisciImmagineDataUrlNellaNota(dataUrl));
            });

