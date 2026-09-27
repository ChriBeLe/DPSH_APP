            // IL REGISTRO SUL PC (prototipo PC, passo 2): clic sceglie la riga e accende la sua barra
            // nel grafico (e viceversa); doppio clic o Invio modifica; tasto destro apre le azioni
            // dove sta il mouse; ↑ ↓ scorrono, Canc elimina. Sul telefono resta il tocco.
            let rigaScelta = -1, provaDellaScelta = null;

            function segnaRigaScelta() {
                if (provaDellaScelta !== state.currentSurveyId || rigaScelta >= state.logs.length) rigaScelta = -1;
                document.querySelectorAll('.swipe-row-wrapper.scelta, .chart-bar-group.scelta').forEach(el => el.classList.remove('scelta'));
                if (rigaScelta >= 0) document.querySelectorAll(`.swipe-row-wrapper[data-index="${rigaScelta}"], .chart-bar-group[data-index="${rigaScelta}"]`).forEach(el => el.classList.add('scelta'));
            }

            function scegliRiga(idx, scorri) {
                rigaScelta = idx;
                provaDellaScelta = state.currentSurveyId;
                segnaRigaScelta();
                if (scorri) document.querySelectorAll(`.swipe-row-wrapper[data-index="${idx}"]`).forEach(el => el.scrollIntoView && el.scrollIntoView({ block: 'nearest' }));
            }

            // Le righe nell'ordine in cui si vedono: il Registro può avere le più recenti in cima.
            function righeVisibili() {
                const integrato = document.getElementById('cardIntegratedRegister');
                const corpo = document.getElementById(integrato && integrato.style.display !== 'none' ? 'tblIntegratedLogsBody' : 'tblLogsBody');
                return [...corpo.querySelectorAll('.swipe-row-wrapper[data-index]')].map(el => Number(el.dataset.index));
            }

            // Si sta scrivendo in un campo: i tasti sono caratteri, non comandi. Non conta un campo
            // dentro una finestra chiusa, dove il fuoco resta dopo Esc. Un tasto già usato dal campo
            // (Invio che salva e chiude la scheda) conta come scrittura.
            function staScrivendo(e) {
                return e.defaultPrevented || !!(e.target.closest && e.target.closest('input, textarea, select, [contenteditable="true"]') && !e.target.closest('.modal:not(.open)'));
            }

            const menuRiga = document.getElementById('menuRiga');
            function chiudiMenuRiga() { menuRiga.classList.remove('open'); }
            function apriMenuRiga(e, idx) {
                e.preventDefault();
                scegliRiga(idx);
                const l = state.logs[idx];
                menuRiga.innerHTML = `<div class="menu-contesto-titolo">${numeroConVirgola(l.start)}–${numeroConVirgola(l.end)} m · ${l.colpi} colpi</div>
                    <button type="button" role="menuitem" data-azione="modifica"><svg class="ico"><use href="#i-edit"/></svg>Modifica<kbd>Invio</kbd></button>
                    <div class="menu-sep" aria-hidden="true"></div>
                    <button type="button" role="menuitem" data-azione="elimina" class="pericolo"><svg class="ico"><use href="#i-trash"/></svg>Elimina<kbd>Canc</kbd></button>`;
                menuRiga.classList.add('open');
                menuRiga.style.left = Math.min(e.clientX, window.innerWidth - menuRiga.offsetWidth - 8) + 'px';
                menuRiga.style.top = Math.min(e.clientY, window.innerHeight - menuRiga.offsetHeight - 38) + 'px'; // sopra la barra di stato
            }
            menuRiga.addEventListener('click', (e) => {
                const b = e.target.closest('[data-azione]');
                if (!b) return;
                chiudiMenuRiga();
                if (b.dataset.azione === 'modifica') openEditModal(rigaScelta);
                else deleteLogStep(rigaScelta);
            });
            document.addEventListener('click', (e) => { if (!menuRiga.contains(e.target)) chiudiMenuRiga(); });

            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') return chiudiMenuRiga();
                if (!suPc() || state.uiState.currentView !== 'field' || e.ctrlKey || e.altKey || e.metaKey) return;
                if (staScrivendo(e)) return;
                if (document.querySelector('.modal.open, .drawer.open')) return;
                if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                    const righe = righeVisibili();
                    if (!righe.length) return;
                    e.preventDefault();
                    const qui = righe.indexOf(rigaScelta);
                    const dove = qui < 0 ? 0 : Math.max(0, Math.min(righe.length - 1, qui + (e.key === 'ArrowDown' ? 1 : -1)));
                    scegliRiga(righe[dove], true);
                } else if (rigaScelta >= 0 && (e.key === 'F2' || (e.key === 'Enter' && state.settings.contatoreSuPc !== true))) {
                    e.preventDefault();
                    chiudiMenuRiga();
                    openEditModal(rigaScelta);
                } else if (rigaScelta >= 0 && e.key === 'Delete') {
                    e.preventDefault();
                    chiudiMenuRiga();
                    deleteLogStep(rigaScelta);
                }
            });
