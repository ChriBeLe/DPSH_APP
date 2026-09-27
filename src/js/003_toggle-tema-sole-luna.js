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

            // La barra sticky compare solo quando il pannello di conteggio esce dalla viewport,
            // così le informazioni critiche restano leggibili mentre si scorre il registro.
            const stickyStatusBar = document.getElementById('stickyStatusBar');
            const ssbDepth = document.getElementById('ssbDepth');
            const ssbBlows = document.getElementById('ssbBlows');
            const ssbRod = document.getElementById('ssbRod');
            const ssbJumpTop = document.getElementById('ssbJumpTop');
            const cardCounterDashboard = document.getElementById('cardCounterDashboard');

            function updateStickyStatusBar() {
                if (!stickyStatusBar) return;
                const stepM = state.settings.stepCm / 100;
                if (ssbDepth) ssbDepth.textContent = `${state.currentDepthStart.toFixed(2)}m`;
                if (ssbBlows) ssbBlows.textContent = state.currentCount;
                if (ssbRod) ssbRod.textContent = `N° ${state.currentRod}`;
            }

            if (cardCounterDashboard && stickyStatusBar && 'IntersectionObserver' in window) {
                const ssbObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        const fieldVisible = document.getElementById('viewField');
                        const isFieldOpen = fieldVisible && fieldVisible.style.display !== 'none';
                        if (!entry.isIntersecting && isFieldOpen) {
                            stickyStatusBar.classList.add('visible');
                            updateStickyStatusBar();
                        } else {
                            stickyStatusBar.classList.remove('visible');
                        }
                    });
                }, { threshold: 0, rootMargin: '-10px 0px 0px 0px' });
                ssbObserver.observe(cardCounterDashboard);
            }

            if (ssbJumpTop) {
                ssbJumpTop.addEventListener('click', () => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    triggerVibrate(20);
                });
            }

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

