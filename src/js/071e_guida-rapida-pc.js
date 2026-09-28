            // LA GUIDA RAPIDA DELLA PRIMA VOLTA SUL PC (prototipo PC): la prima volta che si apre una
            // prova sul PC, tre passi col punto evidenziato. Si salta con «Salta» o Esc e si rivede
            // dalla guida delle scorciatoie (?). Vista una volta, non torna: preferenza dell'app.
            const PASSI_GUIDA = [
                ['pcLato', 'Progetti e prove', 'Qui a sinistra ci sono tutti i progetti e le prove di quello aperto: un clic per andarci.'],
                ['cardIntegratedRegister', 'Il Registro', 'Un clic sceglie una riga, doppio clic la modifica, il tasto destro mostra le azioni. Con ↑ ↓ ti sposti, Canc elimina (e Ctrl Z rimette).'],
                ['pcBarra', 'Comandi e contatore', 'Ctrl K cerca qualunque comando, ? mostra tutti i tasti. «Contatore» accende il conteggio dei colpi anche qui.']
            ];
            let passoGuida = -1;

            function mostraPassoGuida() {
                const [id, titolo, testo] = PASSI_GUIDA[passoGuida];
                const r = document.getElementById(id).getBoundingClientRect();
                const buco = document.getElementById('guidaBuco');
                Object.assign(buco.style, { left: (r.left - 4) + 'px', top: (r.top - 4) + 'px', width: (r.width + 8) + 'px', height: (r.height + 8) + 'px' });
                document.getElementById('guidaTitolo').textContent = titolo;
                document.getElementById('guidaTesto').textContent = testo;
                document.getElementById('guidaPasso').textContent = `${passoGuida + 1} di ${PASSI_GUIDA.length}`;
                document.getElementById('guidaAvanti').textContent = passoGuida === PASSI_GUIDA.length - 1 ? 'Fine' : 'Avanti';
                // Il fumetto sta accanto al punto: a destra della barra laterale, sotto la barra in alto,
                // altrimenti in basso a destra.
                const fumetto = document.querySelector('.guida-fumetto');
                const destra = r.right + 16 + 340 < window.innerWidth && r.width < window.innerWidth / 2;
                Object.assign(fumetto.style, destra
                    ? { left: (r.right + 16) + 'px', top: Math.max(16, r.top) + 'px', right: 'auto', bottom: 'auto' }
                    : { left: 'auto', right: '24px', top: r.bottom + 16 + 200 < window.innerHeight ? (r.bottom + 16) + 'px' : 'auto', bottom: r.bottom + 16 + 200 < window.innerHeight ? 'auto' : '48px' });
                document.getElementById('guidaAvanti').focus();
            }

            function apriGuidaRapida() {
                passoGuida = 0;
                document.getElementById('guidaRapida').hidden = false;
                mostraPassoGuida();
            }

            function chiudiGuidaRapida() {
                passoGuida = -1;
                document.getElementById('guidaRapida').hidden = true;
                if (state.settings.guidaPcVista !== true) { state.settings.guidaPcVista = true; saveState(); }
            }

            // Da renderPc: la prima volta in una prova sul PC, se non c'è una finestra aperta.
            function forseGuidaRapida() {
                if (passoGuida >= 0 || state.settings.guidaPcVista === true || document.querySelector('.modal.open')) return;
                setTimeout(() => { if (state.uiState.currentView === 'field' && passoGuida < 0) apriGuidaRapida(); }, 400);
            }

            document.getElementById('guidaAvanti').addEventListener('click', () => {
                if (++passoGuida >= PASSI_GUIDA.length) chiudiGuidaRapida();
                else mostraPassoGuida();
            });
            document.getElementById('guidaSalta').addEventListener('click', chiudiGuidaRapida);
            document.getElementById('btnRivediGuida').addEventListener('click', () => { closeAnyOpenModal(); apriGuidaRapida(); });
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && passoGuida >= 0) chiudiGuidaRapida(); });
