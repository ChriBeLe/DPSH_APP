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

            /** IL FOGLIO DELLE TAVOLE: quello scelto nella finestra «Tavole» (A4 o A3, orizzontale o
             * verticale), in mm e in punti; la figura ha le stesse misure del PDF delle tavole. */
            function foglioTavolaReport(mem) {
                const f = Object.assign({ carta: 'A4', verso: 'o', scritte: 1.3 }, mem.foglio || {});
                const [a, b] = f.carta === 'A3' ? [420, 297] : [297, 210];
                const [L, H] = f.verso === 'v' ? [b, a] : [a, b];
                return { carta: f.carta, verso: f.verso, scritte: f.scritte, L, H, PW: L / 25.4 * 72, PH: H / 25.4 * 72, codice: f.carta + f.verso };
            }
            function opzioniTavolaReport(mem, v, misure) {
                // Le opzioni regolate nella finestra «Tavole» (071p le memorizza); lo sfondo
                // satellitare viene dalla rete: lo si usa solo se lo si era scelto.
                return Object.assign({ sfondo: 'chiaro', basemap: false, legenda: true, nordTerreno: true, fantasma: true, ex: vista3d.ex,
                    pianta: mem.pianta || 'sotto', piante: mem.piante || {}, posizioni: mem.posizioni || {} }, mem.opzioni || {},
                    { W: misure.W, H: misure.H, reg: (mem.regola || {})[v.id], scala: 2 });
            }
            /** Le regole di stampa dei fogli delle tavole: ogni formato è una pagina con un nome, così
             * nello stesso PDF un A3 orizzontale sta in mezzo agli A4 verticali delle prove. */
            const REGOLE_PAGINE_TAVOLE = ['A4o:297mm 210mm', 'A4v:210mm 297mm', 'A3o:420mm 297mm', 'A3v:297mm 420mm']
                .map(x => { const [c, m] = x.split(':'); return `@page tavola${c} { size: ${m}; margin: 0; } .dpsh-sheet[data-formato-tavola="${c}"] { page: tavola${c}; }`; }).join('\n');

            /** Il capitolo delle tavole: { sezioni: [Modello 3D, Sezioni 2D] } (le vuote no), o null.
             * Un foglio per tavola, come nel PDF della finestra «Tavole»: titolo, sottotitolo, la
             * figura, sotto il progetto e il numero della tavola. Il formato è quello delle tavole,
             * non quello del report: niente intestazione né carta intestata (fatte per l'A4). */
            /** Le regole delle pagine delle tavole, se il documento ne ha. */
            function regolePagineTavole(html) { return /data-formato-tavola=/.test(String(html || '')) ? REGOLE_PAGINE_TAVOLE : ''; }
            async function capitoloTavoleHtml(proj, tpl, onAvanzamento) {
                const dati = datiTavoleReport(proj);
                if (!dati) return null;
                const esc = escapeHtmlDidascalia, fg = foglioTavolaReport(dati.mem), mmPt = 25.4 / 72;
                const M = MARGINE_PDF_3D * mmPt, BASSO = BASSO_PDF_3D * mmPt;
                const gruppi = { '3d': [], '2d': [] };
                let n = 0;
                for (let i = 0; i < dati.voci.length; i++) {
                    const v = dati.voci[i];
                    if (onAvanzamento) onAvanzamento(`Tavola ${i + 1} di ${dati.voci.length}…`);
                    await new Promise(ok => setTimeout(ok, 0));
                    const tt = titoliTavolaReport(dati.mem, v);
                    const conTitolo = tt.titolo !== null, conSotto = conTitolo && !!tt.sotto;
                    const misure = { W: Math.round((fg.PW - 2 * MARGINE_PDF_3D) * PX_PER_PT_3D), H: Math.round((fg.PH - altoTitoloPdf3d(conTitolo, conSotto) - BASSO_PDF_3D - 10) * PX_PER_PT_3D) };
                    let tela = null;
                    try { tela = await telaVoce3d(v, dati.d, opzioniTavolaReport(dati.mem, v, misure)); } catch (e) { tela = null; }
                    if (!tela) continue;
                    n++;
                    // La figura nel suo riquadro, alle proporzioni vere (anche nel Word, che la prende così).
                    // Sotto: la riga del progetto (6 mm) e, nel margine, il numero di pagina; 3 mm di respiro
                    // perché in Word, che arrotonda, la tavola non sfori sulla pagina dopo.
                    const RIGA = 6, boxL = fg.L - 2 * M, boxH = fg.H - M - BASSO - altoTitoloPdf3d(conTitolo, conSotto) * mmPt + 18 * mmPt - RIGA - 3;
                    const k = Math.min(boxL / tela.width, boxH / tela.height), wi = tela.width * k, hi = tela.height * k;
                    const col = COLORI_ESPORTA_3D[(dati.mem.opzioni || {}).sfondo] || COLORI_ESPORTA_3D.chiaro;
                    const titolo = `Tav. ${n}` + (tt.titolo ? ` — ${tt.titolo}` : '');
                    const foglio = `<div class="dpsh-sheet dpsh-tavola" data-formato-tavola="${fg.codice}" data-tpl-page-label="Tavola ${n}" style="width:${fg.L}mm; height:${fg.H}mm; padding:${M.toFixed(2)}mm ${M.toFixed(2)}mm ${BASSO.toFixed(2)}mm; --margine-sotto:${BASSO.toFixed(2)}mm; background:${col.fondo}; font-family: Arial, sans-serif;">`
                        + `<div class="dpsh-sheet-inner" style="display:flex; flex-direction:column;">`
                        + `<div class="tavola-report-titolo" data-titolo-indice="1" style="font-size:15pt; font-weight:700; color:${col.testo}; line-height:1.2; margin:0;">${esc(titolo)}</div>`
                        + (tt.sotto ? `<div class="tavola-report-sotto" style="font-size:9pt; color:${col.tenue}; margin-top:1mm;">${esc(tt.sotto)}</div>` : '')
                        + `<div data-blocco="immagine-libera" style="flex:1 1 auto; min-height:0; display:flex; align-items:center; justify-content:center;"><img src="${tela.toDataURL('image/jpeg', 0.9)}" alt="${esc(titolo)}" style="display:block; width:${wi.toFixed(2)}mm; height:${hi.toFixed(2)}mm;"></div>`
                        + `<div class="tavola-report-piede" style="flex:0 0 ${RIGA}mm; box-sizing:border-box; border-top:0.5pt solid ${col.tenue}; display:flex; justify-content:space-between; align-items:flex-start; padding-top:1.5mm; font-size:8pt; color:${col.tenue};"><span style="flex:1 1 auto; white-space:nowrap;">${esc(proj.name || '')}</span><span style="flex:0 0 22mm; text-align:right; white-space:nowrap;">Tav. ${n}</span></div>`
                        + `</div></div>`;
                    gruppi[v.tipo === 'sez2d' ? '2d' : '3d'].push(foglio);
                }
                if (!n) return null;
                const sezioni = [];
                // L'ancora dell'indice sta DENTRO il primo foglio: fuori, fra due fogli di formato
                // diverso, il browser le darebbe una pagina A4 tutta sua (una pagina bianca).
                const conAncora = (fogli, id) => fogli.map((f, i) => i ? f : f.replace('<div class="dpsh-sheet-inner" style="display:flex; flex-direction:column;">', `$&<a id="prova-report-${id}"></a>`)).join('');
                if (gruppi['3d'].length) sezioni.push({ id: '__tavole3d__', etichetta: 'Modello 3D', html: conAncora(gruppi['3d'], '__tavole3d__'), pageCount: gruppi['3d'].length });
                if (gruppi['2d'].length) sezioni.push({ id: '__tavole2d__', etichetta: 'Sezioni 2D', html: conAncora(gruppi['2d'], '__tavole2d__'), pageCount: gruppi['2d'].length });
                return { sezioni, pageCount: n, formato: fg.codice };
            }
