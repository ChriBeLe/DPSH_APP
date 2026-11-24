            // ===== FUOCO DELLA TASTIERA NELLE FINESTRE =====
            // Una finestra aperta tiene il fuoco al suo interno (Tab e Maiusc+Tab girano in tondo
            // sulla finestra in cima) e, quando si chiude, lo restituisce a chi l'aveva aperta.
            // Le finestre si aprono e si chiudono in molti punti (classe "open" su .modal): invece di
            // toccarli tutti, un osservatore guarda la classe e agisce dopo. Esc, Indietro e clic
            // sullo sfondo non sono toccati: restano quelli definiti sopra.
            const _fuocoFinestre = new Map();   // finestra aperta -> { apritore }
            let _ultimoPuntatoreTocco = false;
            const _SEL_FUOCO = 'a[href],button,input,select,textarea,summary,[tabindex],[contenteditable=""],[contenteditable="true"]';

            // Niente getComputedStyle: con il foglio di stile dell'app è lento. Si guardano l'attributo
            // hidden, il display scritto sull'elemento e, dove il motore sa disegnare, se ha un riquadro.
            const _fuocoSenzaLayout = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent || '');
            function _fuocoVisibile(el, radice) {
                for (let n = el; n && n !== radice.parentNode; n = n.parentElement) {
                    if (n.hidden || (n.style && (n.style.display === 'none' || n.style.visibility === 'hidden'))) return false;
                }
                return _fuocoSenzaLayout || el.getClientRects().length > 0;
            }
            function _fuocoElementi(radice) {
                return Array.from(radice.querySelectorAll(_SEL_FUOCO)).filter(el =>
                    !el.disabled && el.getAttribute('tabindex') !== '-1' && !(el.type === 'hidden') && _fuocoVisibile(el, radice));
            }
            function _fuocoCampoTesto(el) {
                if (el.tagName === 'TEXTAREA' || el.isContentEditable) return true;
                return el.tagName === 'INPUT' && !/^(button|submit|reset|checkbox|radio|file|color|range|image)$/i.test(el.type);
            }
            /** La finestra aperta più in alto: l'ultima aperta. */
            function _fuocoCima() {
                let cima = null, ms = -Infinity;
                _fuocoFinestre.forEach((st, m) => { if (st.seq >= ms) { cima = m; ms = st.seq; } });
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
                if (st && st.apritore && fuoriPosto && document.contains(st.apritore) && !st.apritore.closest('[hidden]')) {
                    try { st.apritore.focus({ preventScroll: true }); } catch (_) { }
                }
            }
            function _fuocoTransizione(m, eraAperta) {
                if (m.getAttribute('aria-modal') !== 'true') return;
                const aperta = m.classList.contains('open');
                if (aperta && !eraAperta && !_fuocoFinestre.has(m)) _fuocoApri(m);
                else if (!aperta && _fuocoFinestre.has(m)) _fuocoChiudi(m);
            }
            document.addEventListener('pointerdown', (e) => { _ultimoPuntatoreTocco = e.pointerType === 'touch'; }, true);
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Tab' || e.defaultPrevented) return;
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
                // Costa poco: ignora in fretta ogni mutazione che non sia la classe di una .modal
                // e agisce solo se "open" è davvero cambiata.
                new MutationObserver((lista) => {
                    for (const r of lista) {
                        const m = r.target;
                        if (!m.classList || !m.classList.contains('modal')) continue;
                        const prima = /(^|\s)open(\s|$)/.test(r.oldValue || '');
                        _fuocoTransizione(m, prima);
                    }
                }).observe(document.body || document.documentElement,
                    { subtree: true, attributes: true, attributeFilter: ['class'], attributeOldValue: true });
            }
