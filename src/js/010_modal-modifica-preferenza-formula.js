            // ===== MODAL "MODIFICA PREFERENZA FORMULA" (una categoria alla volta) =====
            // Sostituisce il vecchio <select> inline nella scheda archivio (richiesto
            // esplicitamente): un tasto "Modifica" per categoria apre questa lista, si tocca la
            // riga voluta e si applica subito — stesso schema "tocca per applicare" già usato per
            // il pattern picker degli strati (patpick-option), niente pulsante "Salva" separato.
            const modalArchPrefEditOverlay = document.getElementById('modalArchPrefEditOverlay');
            const modalArchPrefEdit = document.getElementById('modalArchPrefEdit');
            const lblArchPrefEditTitolo = document.getElementById('lblArchPrefEditTitolo');
            const archPrefEditList = document.getElementById('archPrefEditList');
            const btnCloseArchPrefEditX = document.getElementById('btnCloseArchPrefEditX');
            let archPrefEditCtx = null; // { archId, catId }

            function apriModificaPreferenzaArchivio(archId, catId) {
                const arch = state.lithologyArchive && state.lithologyArchive[archId];
                const cat = CATEGORIE_PER_ID[catId];
                if (!arch || !cat) return;
                archPrefEditCtx = { archId, catId };
                if (lblArchPrefEditTitolo) lblArchPrefEditTitolo.innerHTML = `<svg class="ico"><use href="#i-flask"/></svg> ${cat.label}`;
                if (archPrefEditList) {
                    const pref = (arch.parametriPreferiti && arch.parametriPreferiti[catId]) || null;
                    const righe = [{ nessuna: true }].concat(cat.candidati.map(c => ({ autore: c.autore, terreno: c.terreno || null })));
                    archPrefEditList.innerHTML = righe.map((c, i) => {
                        const selezionato = c.nessuna ? !pref : (pref && pref.autore === c.autore && (pref.terreno || null) === (c.terreno || null));
                        const label = c.nessuna ? '— Nessuna preferenza —' : `${c.autore}${c.terreno ? ' — ' + c.terreno : ''}`;
                        return `
                            <button type="button" class="arch-pref-option" data-idx="${i}" style="text-align:left; display:flex; align-items:center; gap:8px; padding:9px 11px; border-radius:8px; border:1px solid ${selezionato ? 'var(--accent)' : 'var(--border)'}; background:${selezionato ? 'var(--accent-soft)' : 'var(--bg-main)'}; color:var(--text-main); font-size:12px; font-weight:${selezionato ? '700' : '500'}; cursor:pointer;">
                                ${selezionato ? '<svg class="ico" style="width:14px;height:14px;color:var(--accent);flex-shrink:0;"><use href="#i-check"/></svg>' : '<span style="width:14px;height:14px;flex-shrink:0;"></span>'}
                                <span style="${c.nessuna ? 'font-style:italic; opacity:.75;' : ''}">${label}</span>
                            </button>`;
                    }).join('');
                    archPrefEditList.querySelectorAll('.arch-pref-option').forEach((btn, i) => {
                        btn.addEventListener('click', () => {
                            const scelta = righe[i];
                            if (!arch.parametriPreferiti) arch.parametriPreferiti = {};
                            if (scelta.nessuna) {
                                delete arch.parametriPreferiti[catId];
                            } else {
                                arch.parametriPreferiti[catId] = { autore: scelta.autore, terreno: scelta.terreno || null };
                            }
                            saveState();
                            chiudiModificaPreferenzaArchivio();
                            renderArchiveManagerList();
                            triggerVibrate(20);
                        });
                    });
                }
                if (modalArchPrefEditOverlay) modalArchPrefEditOverlay.classList.add('open');
                if (modalArchPrefEdit) modalArchPrefEdit.classList.add('open');
            }
            function chiudiModificaPreferenzaArchivio() {
                archPrefEditCtx = null;
                if (modalArchPrefEditOverlay) modalArchPrefEditOverlay.classList.remove('open');
                if (modalArchPrefEdit) modalArchPrefEdit.classList.remove('open');
            }
            if (btnCloseArchPrefEditX) btnCloseArchPrefEditX.addEventListener('click', chiudiModificaPreferenzaArchivio);
            if (modalArchPrefEditOverlay) modalArchPrefEditOverlay.addEventListener('click', chiudiModificaPreferenzaArchivio);

