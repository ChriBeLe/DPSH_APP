            // ===================== LA TAVOLA «CONFRONTO TRA PROVE» =====================
            // Il confronto (colpi o Rpd con la profondità, e le stratigrafie accanto) come pagina delle
            // tavole: si aggiunge a richiesta (proj.tavole3d.confronto), ha le stesse funzioni delle
            // altre (titolo, blocco, report, registro). Il disegno è quello del confronto (049).
            const confrontoTavolaAttivo = mem => !!(mem && mem.confronto);
            function svgTavolaConfronto(proj, larghezza, altezza, grandezza) {
                const prove = proveConfrontabili(proj);
                if (prove.length < 2) return null;
                const d = datiConfronto(proj, prove, new Set(proveFisiche(prove).map(s => s.id)), grandezza === 'rpd' ? 'rpd' : 'colpi');
                const dis = disegnoConfronto(d, { larghezza, altezza, fs: Math.max(11, Math.round(larghezza / 100)), perFile: true });
                return svgDaDisegno(dis, TEMA_CONFRONTO_FILE);
            }
            /** La tela della tavola di confronto, pronta per il PDF o per un'immagine. */
            async function telaConfronto(voce, d, opz) {
                const proj = state.projects[state.currentProjectId], W = opz.W || 1400, H = opz.H || 860;
                const mem = (tavole3d.bozza && tavole3d.bozzaProgetto === state.currentProjectId ? tavole3d.bozza : proj.tavole3d) || {};
                const svg = svgTavolaConfronto(proj, W, H, (mem.confronto || {}).grandezza);
                if (!svg) return null;
                const img = await immagineDaSvg3d(svg), scala = opz.scala || 2, tela = document.createElement('canvas');
                tela.width = Math.round(W * scala); tela.height = Math.round(H * scala);
                const g = tela.getContext('2d'); g.scale(scala, scala);
                g.fillStyle = '#ffffff'; g.fillRect(0, 0, W, H);
                const k = Math.min(W / img.width, H / img.height), w = img.width * k, h = img.height * k;
                g.drawImage(img, (W - w) / 2, (H - h) / 2, w, h);
                return tela;
            }
            /** Mette il confronto nella finestra (al posto della figura 3D). */
            function mostraConfronto3d(v, tela, img) {
                const proj = state.projects[state.currentProjectId], mem = memoriaTavole3d(), box = img.parentElement;
                const svg = svgTavolaConfronto(proj, 1400, 860, (mem.confronto || {}).grandezza);
                tela.hidden = true; img.hidden = !svg; T3('tavole3dPianta').hidden = true; box.classList.remove('con-pianta', 'pianta-sopra');
                tavole3d.piantaViva = null; tavole3d.ridisegnaPianta = null;
                document.querySelectorAll('.tavole-pianta-maniglia').forEach(m => { m.hidden = true; });
                if (!svg) return;
                img.onload = () => { const k = Math.min((box.clientWidth || 800) / (img.naturalWidth || 1), (box.clientHeight || 500) / (img.naturalHeight || 1)); img.style.width = Math.round(img.naturalWidth * k) + 'px'; img.style.height = Math.round(img.naturalHeight * k) + 'px'; };
                img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
            }
            /** Aggiunge o toglie la pagina «Confronto tra prove» (con almeno due prove). */
            function commutaConfrontoTavole3d() {
                const proj = state.projects[state.currentProjectId], mem = memoriaTavole3d();
                if (!confrontoTavolaAttivo(mem) && proveConfrontabili(proj).length < 2) { appAlert('Per confrontare servono almeno due prove con intervalli registrati in questo progetto.'); return; }
                if (confrontoTavolaAttivo(mem)) { delete mem.confronto; delete (mem.regola || {}).confronto; } else mem.confronto = { grandezza: 'colpi' };
                salvaMemoriaTavole3d(); apriTavole3d(false, true);
                const i = tavole3d.voci.findIndex(v => v.id === 'confronto');
                if (i >= 0) { tavole3d.scelta = i; renderElencoTavole3d(); mostraTavola3d(); }
                statoSalvataggioTavole3d();
            }
            function grandezzaConfrontoTavole3d(g) {
                const mem = memoriaTavole3d(); if (!confrontoTavolaAttivo(mem)) return;
                mem.confronto.grandezza = g === 'rpd' ? 'rpd' : 'colpi'; salvaMemoriaTavole3d(); apriTavole3d(false, true);
                const i = tavole3d.voci.findIndex(v => v.id === 'confronto'); if (i >= 0) { tavole3d.scelta = i; renderElencoTavole3d(); mostraTavola3d(); }
            }
