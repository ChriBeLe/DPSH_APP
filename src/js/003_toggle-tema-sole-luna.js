            // ===== TOGGLE TEMA SOLE/LUNA =====
            const btnThemeToggle = document.getElementById('btnThemeToggle');
            const lblThemeToggle = document.getElementById('lblThemeToggle');
            function syncThemeToggleLabel() {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                if (lblThemeToggle) lblThemeToggle.textContent = isLight ? 'Chiaro' : 'Scuro';
            }
            if (btnThemeToggle) {
                btnThemeToggle.addEventListener('click', () => {
                    const chk = document.getElementById('chkDarkMode');
                    const nowDark = document.documentElement.getAttribute('data-theme') !== 'light';
                    // nowDark === true  -> stiamo passando a chiaro
                    if (chk) {
                        chk.checked = !nowDark;
                        chk.dispatchEvent(new Event('change'));
                    }
                    syncThemeToggleLabel();
                    triggerVibrate(20);
                });
            }

            const cardCounterDashboard = document.getElementById('cardCounterDashboard');

            // Modalità guanti: preferenza persistente, applicata come classe sul body
            const chkGloveMode = document.getElementById('chkGloveMode');
            function applyGloveMode() {
                const on = !!(state.settings && state.settings.gloveMode);
                document.body.classList.toggle('glove-mode', on);
                if (chkGloveMode) chkGloveMode.checked = on;
            }
            if (chkGloveMode) {
                chkGloveMode.addEventListener('change', (e) => {
                    if (!state.settings) state.settings = {};
                    state.settings.gloveMode = e.target.checked;
                    applyGloveMode();
                    triggerVibrate(25);
                    saveState();
                    // L'altezza delle righe cambia con la Modalità Guanti: le etichette di
                    // profondità (posizionate su coordinate pixel misurate) vanno ricalcolate.
                    setTimeout(() => {
                        if (typeof renderIntegratedDepthLabels === 'function') renderIntegratedDepthLabels();
                    }, 0);
                });
            }
            applyGloveMode();

