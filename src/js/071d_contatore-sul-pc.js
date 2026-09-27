            // IL CONTATORE SUL PC (prototipo PC, passo 5): spento di norma, perché il PC serve alla
            // post-produzione (decisione I). L'interruttore «Contatore» in alto, o il tasto C, lo
            // accende sopra il Registro; acceso, Spazio dà un colpo, Backspace lo toglie, Invio registra.
            // È una preferenza dell'app (004e), non della prova.
            function interruttoreContatorePc() {
                if (state.settings.contatoreSuPc === true) delete state.settings.contatoreSuPc;
                else state.settings.contatoreSuPc = true;
                saveState();
                updateUI();
            }
            document.getElementById('pcBtnContatore').addEventListener('click', interruttoreContatorePc);

            document.addEventListener('keydown', (e) => {
                if (!suPc() || state.uiState.currentView !== 'field' || e.ctrlKey || e.metaKey || e.altKey || staScrivendo(e)) return;
                if (document.querySelector('.modal.open, .drawer.open')) return;
                const k = e.key.toLowerCase();
                if (k === 'c') { e.preventDefault(); return interruttoreContatorePc(); }
                if (state.settings.contatoreSuPc !== true) return;
                const bottone = { ' ': 'btnPlus', 'backspace': 'btnMinus', 'enter': 'btnConfirmStepAction' }[k];
                if (bottone) { e.preventDefault(); document.getElementById(bottone).click(); }
            });
