            // ===================== LE TAVOLE 2D E 3D NEL REPORT =====================
            // Un capitolo «Tavole» dopo le prove: le tavole scelte nella finestra «Tavole» del 3D
            // (quelle escluse lì restano fuori), con le inquadrature e le opzioni regolate lì. Due per
            // foglio: sono orizzontali (1400 × 860) e il documento è A4 verticale. I fogli hanno i
            // margini e l'intestazione del template della prima prova, come il resto del documento;
            // numeri di pagina, indice, PDF e Word li fanno le stesse funzioni dei fogli delle prove.

            /** Le tavole da mettere nel report; null se il progetto non ha un modello 3D (nessuna
             * prova col GPS e con le letture) o se nella finestra sono state escluse tutte. */
            function datiTavoleReport(proj) {
                let d = null;
                try { d = proj ? datiVista3d(proj) : null; } catch (e) { d = null; }
                if (!d) return null;
                const mem = proj.tavole3d || {};
                const escluse = new Set(mem.escluse || []);
                let voci = vociEsportazione3d(d).filter(v => !escluse.has(v.id));
                // nell'ordine scelto nella finestra (le pagine nuove in fondo)
                if (Array.isArray(mem.ordine)) { const o = mem.ordine, p = v => { const k = o.indexOf(v.id); return k < 0 ? o.length : k; }; voci = voci.map((v, i) => [v, i]).sort((a, b) => p(a[0]) - p(b[0]) || a[1] - b[1]).map(x => x[0]); }
                return voci.length ? { d, voci, mem } : null;
            }

            /** Il titolo e il sottotitolo di una tavola come nella finestra: scritti a mano, se no
             * l'automatico (che segue la vista scelta coi tasti); titolo null = senza titolo. */
            function titoliTavolaReport(mem, v) {
                const r = (mem.regola || {})[v.id], vv = r && r.vista, t = (mem.titoli || {})[v.id];
                let auto = v.titolo;
                if (v.tipo === 'iso' && vv) auto = vv.tipo === 'pianta' ? 'Modello · pianta' : `Modello · vista ${vv.tipo === 'trasv' ? 'trasversale' : 'isometrica'} verso ${VERSI_3D[vv.verso || 0]}`;
                if (t && t.senza) return { titolo: null, sotto: '' };
                return { titolo: (t && t.testo && t.testo.trim()) || auto, sotto: (t && t.sotto && t.sotto.trim()) || '' };
            }

            function opzioniTavolaReport(mem, v) {
                // Le opzioni regolate nella finestra «Tavole» (071p le memorizza); lo sfondo
                // satellitare viene dalla rete: lo si usa solo se lo si era scelto.
                return Object.assign({ sfondo: 'chiaro', basemap: false, legenda: true, nordTerreno: true, fantasma: true, ex: vista3d.ex,
                    pianta: mem.pianta || 'sotto', piante: mem.piante || {}, posizioni: mem.posizioni || {} }, mem.opzioni || {},
                    { W: LARGHEZZA_TAVOLA_3D, H: ALTEZZA_TAVOLA_3D, reg: (mem.regola || {})[v.id], scala: 2 });
            }
            const LARGHEZZA_TAVOLA_3D = 1400, ALTEZZA_TAVOLA_3D = 860;

            /** Il capitolo: { html, pageCount }, o null se non ci sono tavole. tpl = il template da
             * cui prendere margini e intestazione. */
            async function capitoloTavoleHtml(proj, tpl, onAvanzamento) {
                const dati = datiTavoleReport(proj);
                if (!dati) return null;
                const esc = escapeHtmlDidascalia;
                const figure = [];
                for (let i = 0; i < dati.voci.length; i++) {
                    const v = dati.voci[i];
                    if (onAvanzamento) onAvanzamento(`Tavola ${i + 1} di ${dati.voci.length}…`);
                    await new Promise(ok => setTimeout(ok, 0));
                    let tela = null;
                    try { tela = await telaVoce3d(v, dati.d, opzioniTavolaReport(dati.mem, v)); } catch (e) { tela = null; }
                    if (!tela) continue;
                    const tt = titoliTavolaReport(dati.mem, v);
                    figure.push({ titolo: `Tavola ${figure.length + 1}` + (tt.titolo ? ` · ${tt.titolo}` : ''), sotto: tt.sotto, src: tela.toDataURL('image/jpeg', 0.9) });
                }
                if (!figure.length) return null;
                const pagina = (tpl && tpl.pages && tpl.pages[0]) || {};
                const headerEnabled = !!(tpl && tpl.headerEnabled);
                const mrg = Object.assign(marginiPaginaDiDefault(), (tpl && tpl.margins) || {});
                const piedeAcceso = !!(tpl && tpl.footerEnabled);
                const mrgFoglio = margineConIntestazione(mrg, pagina.header, headerEnabled, pagina.footer, piedeAcceso);
                const intestazione = (headerEnabled ? htmlIntestazioneNelMargine(pagina.header, mrg) : '') + (piedeAcceso ? htmlPiedeNelMargine(pagina.footer, mrg) : '');
                const { riservaFooterMm } = calcolaBudgetPaginaMm(mrgFoglio, piedeAcceso && !mrgFoglio.piedeNelMargine);
                // L'altezza di ogni tavola: metà dello spazio utile del foglio, meno titolo, sottotitolo
                // e respiro (circa 14 mm), e sul primo foglio meno il titolo del capitolo. Il foglio è
                // rigido: una tavola troppo alta verrebbe tagliata, invece di passare alla pagina dopo.
                const utileMm = 297 - mrgFoglio.top - mrgFoglio.bottom - riservaFooterMm;
                const larghezzaMm = 210 - mrg.left - mrg.right;
                const fogli = [];
                for (let i = 0; i < figure.length; i += 2) {
                    const capitolo = i === 0 ? 14 : 0;
                    const altezzaMm = Math.max(30, Math.min(larghezzaMm * ALTEZZA_TAVOLA_3D / LARGHEZZA_TAVOLA_3D, (utileMm - capitolo) / 2 - 14));
                    fogli.push(`<div class="dpsh-sheet" data-tpl-page-label="Tavole" style="font-family: var(--tpl-font, Arial, sans-serif); padding:${mrgFoglio.top}mm ${mrgFoglio.right}mm ${mrgFoglio.bottom}mm ${mrgFoglio.left}mm; --margine-sotto:${mrgFoglio.bottom}mm;">${intestazione}`
                        + `<div class="dpsh-sheet-inner" style="padding-bottom:${riservaFooterMm}mm;">`
                        + (capitolo ? '<div class="tavole-report-capitolo">Tavole</div>' : '')
                        + figure.slice(i, i + 2).map(f => `<div class="tavola-report">`
                            + `<div class="tavola-report-titolo">${esc(f.titolo)}</div>`
                            + (f.sotto ? `<div class="tavola-report-sotto">${esc(f.sotto)}</div>` : '')
                            + `<div data-blocco="immagine-libera"><img src="${f.src}" alt="${esc(f.titolo)}" style="display:block; max-width:100%; max-height:${altezzaMm.toFixed(1)}mm; margin:0 auto;"></div></div>`).join('')
                        + '</div></div>');
                }
                return { html: fogli.join(''), pageCount: fogli.length };
            }
