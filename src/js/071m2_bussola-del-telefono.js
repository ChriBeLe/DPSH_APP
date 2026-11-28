            // ===================== LA BUSSOLA VERA DEL TELEFONO (sulla mappa 2D) =====================
            // Il sensore di orientamento del telefono (DeviceOrientation) gira la mappa: in alto sta sempre dove
            // guardi. Senza sensore (PC) il tasto avvisa e non fa nulla. Il nord è quello magnetico del sensore.
            // Il calcolo dell'angolo usa la matrice di rotazione della specifica W3C DeviceOrientation.
            const bussolaTel = { attiva: false, gradi: null, ultimaMappa: null, motivo: '' };
            function gradiDaOrientamento(ev, angoloSchermo) {
                if (!ev) return null;
                let h = null;
                if (typeof ev.webkitCompassHeading === 'number' && isFinite(ev.webkitCompassHeading)) h = ev.webkitCompassHeading;
                else if (typeof ev.alpha === 'number' && typeof ev.beta === 'number' && typeof ev.gamma === 'number') {
                    const d = Math.PI / 180, a = ev.alpha * d, b = ev.beta * d, g = ev.gamma * d;
                    // quanto il telefono è disteso: piatto → conta la sua parte alta; in piedi (come una macchina fotografica) → conta il retro
                    const piatto = Math.abs(Math.cos(b) * Math.cos(g));
                    const est = piatto > 0.6 ? -Math.sin(a) * Math.cos(b) : -(Math.cos(a) * Math.sin(g) + Math.sin(a) * Math.sin(b) * Math.cos(g));
                    const nord = piatto > 0.6 ? Math.cos(a) * Math.cos(b) : -(Math.sin(a) * Math.sin(g) - Math.cos(a) * Math.sin(b) * Math.cos(g));
                    h = Math.atan2(est, nord) / d;
                }
                if (h === null) return null;
                return (((h + (angoloSchermo || 0)) % 360) + 360) % 360;
            }
            // media di due angoli sul cerchio (il passaggio 359° → 1° non salta)
            const gradiMorbidi = (prima, ora, k) => prima === null ? ora : (prima + ((((ora - prima) % 360) + 540) % 360 - 180) * k + 360) % 360;
            const nomeDirezione = g => ['N', 'NE', 'E', 'SE', 'S', 'SO', 'O', 'NO'][Math.round(g / 45) % 8];
            function sullOrientamento(ev) {
                if (!bussolaTel.attiva) return;
                const ang = (window.screen && screen.orientation && screen.orientation.angle) || 0;
                const g = gradiDaOrientamento(ev, ang);
                if (g === null) return;
                bussolaTel.gradi = gradiMorbidi(bussolaTel.gradi, g, 0.25);
                const m = mappaProgetto.mappa;
                if (m && m.setBearing && (bussolaTel.ultimaMappa === null || Math.abs(((bussolaTel.gradi - bussolaTel.ultimaMappa + 540) % 360) - 180) >= 1)) {
                    bussolaTel.ultimaMappa = bussolaTel.gradi;
                    giraMappa2d(bussolaTel.gradi);
                }
            }
            const tastoBussolaTel = () => bussola2d.querySelector('[data-bussola-tel]');
            function mostraStatoBussolaTel() {
                const t = tastoBussolaTel(); if (!t) return;
                t.classList.toggle('on', bussolaTel.attiva);
                t.setAttribute('aria-pressed', bussolaTel.attiva ? 'true' : 'false');
                t.title = bussolaTel.attiva ? 'Bussola del telefono accesa: tocca per spegnere' : 'Gira la mappa con la bussola del telefono';
            }
            function spegniBussolaTel() {
                window.removeEventListener('deviceorientationabsolute', sullOrientamento, true);
                window.removeEventListener('deviceorientation', sullOrientamento, true);
                bussolaTel.attiva = false; bussolaTel.gradi = null; bussolaTel.ultimaMappa = null;
                mostraStatoBussolaTel();
                return { acceso: false };
            }
            /** Accende il sensore. Su iPhone serve un tocco dell'utente (permesso): per questo può rispondere "serve un tocco". */
            async function accendiBussolaTel(daTocco) {
                if (bussolaTel.attiva) return { acceso: true };
                if (typeof window.DeviceOrientationEvent === 'undefined') { bussolaTel.motivo = 'Questo dispositivo non ha il sensore di orientamento.'; return { acceso: false, motivo: bussolaTel.motivo }; }
                if (typeof DeviceOrientationEvent.requestPermission === 'function') {
                    if (!daTocco) return { acceso: false, motivo: 'Serve il permesso del telefono: tocca tu il tasto della bussola sulla mappa.' };
                    try { if (await DeviceOrientationEvent.requestPermission() !== 'granted') { bussolaTel.motivo = 'Permesso negato.'; return { acceso: false, motivo: bussolaTel.motivo }; } }
                    catch (_) { bussolaTel.motivo = 'Permesso non disponibile.'; return { acceso: false, motivo: bussolaTel.motivo }; }
                }
                bussolaTel.attiva = true; bussolaTel.gradi = null; bussolaTel.ultimaMappa = null; bussolaTel.motivo = '';
                // il sensore "assoluto" (rispetto al nord) dove c'è; altrimenti quello normale (iPhone: webkitCompassHeading)
                window.addEventListener('deviceorientationabsolute', sullOrientamento, true);
                window.addEventListener('deviceorientation', sullOrientamento, true);
                mostraStatoBussolaTel();
                return { acceso: true };
            }
            const statoBussolaTel = () => ({ acceso: bussolaTel.attiva, gradi: bussolaTel.gradi === null ? null : Math.round(bussolaTel.gradi), direzione: bussolaTel.gradi === null ? null : nomeDirezione(bussolaTel.gradi), motivo: bussolaTel.motivo || undefined });
            async function alternaBussolaTel(daTocco) {
                const r = bussolaTel.attiva ? spegniBussolaTel() : await accendiBussolaTel(daTocco);
                if (!r.acceso && r.motivo) mostraToast(r.motivo);
                return r;
            }
            (() => {
                const b = document.createElement('button');
                b.type = 'button'; b.className = 'b-tasto b-ang tl'; b.setAttribute('data-bussola-tel', '1');
                b.setAttribute('aria-label', 'Bussola del telefono'); b.innerHTML = '<svg class="ico"><use href="#i-target"/></svg>';
                bussola2d.querySelector('.b-dial').appendChild(b);
                b.addEventListener('click', (e) => { e.stopPropagation(); alternaBussolaTel(true); });
                mostraStatoBussolaTel();
            })();
