            // ===== FUOCO DELLA TASTIERA NELLE FINESTRE =====
            // Una finestra aperta tiene il fuoco al suo interno (Tab e Maiusc+Tab girano in tondo
            // sulla finestra in cima) e, quando si chiude, lo restituisce a chi l'aveva aperta.
            // Le finestre si aprono e si chiudono in molti punti (classe "open" su .modal): invece di
            // toccarli tutti, un osservatore guarda la classe e agisce dopo. Esc, Indietro e clic
            // sullo sfondo non sono toccati: restano quelli definiti sopra.
            const _fuocoFinestre = new Map();   // finestra aperta -> { apritore }
            let _ultimoPuntatoreTocco = false;
            const _SEL_FUOCO = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable="true"]';

            function _fuocoVisibile(el, radice) {
                for (let n = el; n && n !== radice.parentNode; n = n.parentElement) {
                    if (n.hidden) return false;
                    const cs = getComputedStyle(n);
                    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
                }
                return true;
            }
            function _fuocoElementi(radice) {
                return Array.from(radice.querySelectorAll(_SEL_FUOCO)).filter(el =>
                    !el.disabled && el.getAttribute('tabindex') !== '-1' && !(el.type === 'hidden') && _fuocoVisibile(el, radice));
            }
            function _fuocoCampoTesto(el) {
                if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
                return el.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|file|color|range|image)$/i.test(el.type);
            }
            /** La finestra aperta più in alto (z-index, poi ordine di apertura). */
            function _fuocoCima() {
                let cima = null, mz = -Infinity, ms = -Infinity;
                _fuocoFinestre.forEach((st, m) => {
                    const z = parseInt(getComputedStyle(m).zIndex, 10) || 0;
                    if (z > mz || (z === mz && st.seq >= ms)) { cima = m; mz = z; ms = st.seq; }
                });
                return cima;
            }
            let _fuocoSeq = 0;
            function _fuocoApri(m) {
                const att = document.activeElement;
                const st = { apritore: (att && att !== document.body && !m.contains(att)) ? att : null, seq: ++_fuocoSeq };
                _fuocoFinestre.set(m, st);
                if (_ultimoPuntatoreTocco || m.contains(document.activeElement)) return;
                const el = _fuocoElementi(m);
                const bersaglio = el.find(e => !_fuocoCampoTesto(e));
                if (bersaglio) bersaglio.focus();
                else {
                    if (!m.hasAttribute('tabindex')) m.setAttribute('tabindex', '-1');
                    m.focus({ preventScroll: true });
                }
            }
            function _fuocoChiudi(m) {
                const st = _fuocoFinestre.get(m);
                _fuocoFinestre.delete(m);
                const att = document.activeElement;
                const fuoriPosto = !att || att === document.body || m.contains(att);
                if (st && st.apritore && fuoriPosto && document.contains(st.apritore) && _fuocoVisibile(st.apritore, document.documentElement)) {
                    try { st.apritore.focus({ preventScroll: true }); } catch (_) { }
                }
            }
            function _fuocoAggiorna() {
                document.querySelectorAll('.modal').forEach(m => {
                    const aperta = m.classList.contains('open');
                    if (aperta && !_fuocoFinestre.has(m)) _fuocoApri(m);
                    else if (!aperta && _fuocoFinestre.has(m)) _fuocoChiudi(m);
                });
            }
            document.addEventListener('pointerdown', (e) => { _ultimoPuntatoreTocco = e.pointerType === 'touch'; }, true);
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab' || e.defaultPrevented) return;
                _fuocoAggiorna();
                const m = _fuocoCima();
                if (!m) return;
                const el = _fuocoElementi(m);
                if (!el.length) { e.preventDefault(); m.setAttribute('tabindex', '-1'); m.focus({ preventScroll: true }); return; }
                const att = document.activeElement, primo = el[0], ultimo = el[el.length - 1];
                if (!m.contains(att) || att === m) { e.preventDefault(); (e.shiftKey ? ultimo : primo).focus(); }
                else if (e.shiftKey && att === primo) { e.preventDefault(); ultimo.focus(); }
                else if (!e.shiftKey && att === ultimo) { e.preventDefault(); primo.focus(); }
            });
            if (typeof MutationObserver !== 'undefined') {
                new MutationObserver(_fuocoAggiorna).observe(document.body || document.documentElement,
                    { subtree: true, attributes: true, attributeFilter: ['class'] });
            }
