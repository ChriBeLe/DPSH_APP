            // ===================== REGISTRO E GRAFICO IN UNA SOLA VISTA (PC) =====================
            // Su schermo largo il registro integrato mostra tutti gli intervalli senza scorrere: l'altezza
            // di ogni riga si calcola sullo spazio libero della finestra (34 px al massimo, 14 al minimo;
            // sotto i 14 px torna a scorrere). Si ricalcola quando cambiano le righe e quando si ridimensiona.
            function adattaRegistroAllaFinestra() {
                const vista = document.getElementById('viewField');
                const corpo = document.getElementById('tblIntegratedLogsBody');
                if (!vista || !corpo) return;
                if (!suPc()) { vista.classList.remove('registro-adatta', 'riga-stretta'); vista.style.removeProperty('--riga-registro'); return; }
                const n = corpo.querySelectorAll('.swipe-content').length;
                if (!n) return;
                vista.classList.add('registro-adatta');
                const wrapper = corpo.closest('.logs-table-wrapper');
                const intest = wrapper && wrapper.querySelector('.registro-intestazione');
                const r = wrapper.getBoundingClientRect();
                if (!(r.height > 0)) return;
                const libera = window.innerHeight - r.top - (intest ? intest.offsetHeight : 28) - 52;
                const h = Math.max(14, Math.min(34, Math.floor(libera / n)));
                const chiave = n + '|' + h + '|' + Math.round(r.top);
                if (chiave === adattaRegistroAllaFinestra.ultima) return;
                adattaRegistroAllaFinestra.ultima = chiave;
                vista.style.setProperty('--riga-registro', h + 'px');
                vista.classList.toggle('riga-stretta', h < 24);
                if (libera / n < 14) { vista.classList.remove('registro-adatta'); }
                // Le quote di profondità si posizionano sulle righe: vanno rifatte con l'altezza nuova.
                if (typeof renderIntegratedDepthLabels === 'function') renderIntegratedDepthLabels();
            }
            (function () {
                let t = null;
                const pianifica = () => { clearTimeout(t); t = setTimeout(() => { try { adattaRegistroAllaFinestra(); if (typeof renderChart === 'function' && suPc()) renderChart(); } catch (e) { ignoraErrore('registroUnaVista', e); } }, 60); };
                window.addEventListener('resize', pianifica);
                const corpo = document.getElementById('tblIntegratedLogsBody');
                if (corpo) new MutationObserver(pianifica).observe(corpo, { childList: true });
            })();
