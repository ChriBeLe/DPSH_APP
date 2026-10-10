            // ===================== IMPORTA DA UN WORD =====================
            // Dal .docx di una relazione già fatta (la carta intestata dell'ufficio) al template aperto:
            //  - i margini e la distanza dell'intestazione dal bordo, dalla sezione del documento;
            //  - l'intestazione: l'immagine più grande (il logo, la fascia) e il testo, formattato;
            //  - il piè di pagina, come testo (le colonne di una tabella diventano una riga);
            //  - lo stile del testo: carattere, corpo, interlinea, spazio dopo i paragrafi,
            //    allineamento, corpo dei titoli 1–3.
            // Prima di cambiare qualcosa dice cosa ha trovato; si annulla col tasto Annulla
            // dell'editor (le pagine) e non salvando il template (tutto il resto).

            /** Un .docx è uno ZIP compresso (DEFLATE): readZipStoreOnly legge solo gli ZIP dell'app,
             * che non sono compressi. Qui si decomprime col motore del browser. */
            async function leggiZipCompresso(buf) {
                const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
                let fine = -1;
                for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
                    if (dv.getUint32(i, true) === 0x06054b50) { fine = i; break; }
                }
                if (fine < 0) throw new Error('Non è un file Word (.docx).');
                const n = dv.getUint16(fine + 10, true);
                let p = dv.getUint32(fine + 16, true);
                const voci = [];
                const nomi = new TextDecoder();
                for (let i = 0; i < n; i++) {
                    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Il file Word è rovinato.');
                    const metodo = dv.getUint16(p + 10, true), dim = dv.getUint32(p + 20, true);
                    const lNome = dv.getUint16(p + 28, true), lExtra = dv.getUint16(p + 30, true), lComm = dv.getUint16(p + 32, true);
                    const locale = dv.getUint32(p + 42, true);
                    const nome = nomi.decode(buf.subarray(p + 46, p + 46 + lNome));
                    const inizio = locale + 30 + dv.getUint16(locale + 26, true) + dv.getUint16(locale + 28, true);
                    const dati = buf.slice(inizio, inizio + dim);
                    voci.push({ nome, metodo, dati });
                    p += 46 + lNome + lExtra + lComm;
                }
                const servono = /^(word\/(document|styles)\.xml|word\/(header|footer)\d*\.xml|word\/_rels\/.*\.rels|word\/theme\/theme1\.xml|word\/media\/.*)$/;
                const per = new Map();
                for (const v of voci) {
                    if (!servono.test(v.nome)) continue;
                    if (v.metodo === 0) per.set(v.nome, v.dati);
                    else if (v.metodo === 8) per.set(v.nome, await decomprimiDeflate(v.dati));
                }
                return per;
            }
            async function decomprimiDeflate(dati) {
                if (typeof DecompressionStream === 'undefined') throw new Error('Questo browser non sa aprire i file Word compressi.');
                const flusso = new Blob([dati]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
                return new Uint8Array(await new Response(flusso).arrayBuffer());
            }

            const mmDaTwip = v => Math.round(Number(v) / 56.6929 * 10) / 10;
            const attrW = (el, nome) => el ? (el.getAttribute('w:' + nome) || el.getAttribute(nome)) : null;
            const figliW = (el, tag) => el ? Array.from(el.getElementsByTagName('w:' + tag)) : [];

            /** Cosa c'è nel .docx (bytes): { margini, intestazione, piede, stile }, ciascuno null se manca. */
            async function letturaDaWord(bytes) {
                const per = await leggiZipCompresso(bytes);
                const testo = n => per.has(n) ? new TextDecoder().decode(per.get(n)) : '';
                const xml = n => { const t = testo(n); return t ? new DOMParser().parseFromString(t, 'application/xml') : null; };
                const doc = xml('word/document.xml');
                if (!doc || !doc.getElementsByTagName('w:body').length) throw new Error('Non è un documento Word (.docx).');
                const relazioni = (parte) => {
                    const r = xml(parte.replace(/^word\/(.*)$/, 'word/_rels/$1.rels'));
                    return new Map(r ? Array.from(r.getElementsByTagName('Relationship')).map(x => [x.getAttribute('Id'), 'word/' + x.getAttribute('Target').replace(/^\.?\//, '')]) : []);
                };
                const relDoc = relazioni('word/document.xml');
                const sezioni = doc.getElementsByTagName('w:sectPr');
                const sez = sezioni[sezioni.length - 1];
                const mar = figliW(sez, 'pgMar')[0];
                const margini = mar ? { top: mmDaTwip(attrW(mar, 'top')), bottom: mmDaTwip(attrW(mar, 'bottom')), left: mmDaTwip(attrW(mar, 'left')),
                    right: mmDaTwip(attrW(mar, 'right')), header: mmDaTwip(attrW(mar, 'header') || 0) } : null;
                const parteDi = (tipo) => {
                    const ref = figliW(sez, tipo + 'Reference').find(r => attrW(r, 'type') === 'default');
                    return ref ? relDoc.get(ref.getAttribute('r:id')) : null;
                };

                // Il testo di una parte (intestazione o piè), paragrafo per paragrafo, in HTML semplice.
                const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                const paragrafiHtml = (radice) => figliW(radice, 'p').map(p => {
                    const jc = attrW(figliW(p, 'jc')[0], 'val');
                    const allinea = { center: 'center', right: 'right', end: 'right', both: 'justify' }[jc];
                    const runs = figliW(p, 'r').map(r => {
                        const t = figliW(r, 't').map(x => x.textContent).join('');
                        if (!t) return '';
                        const rPr = figliW(r, 'rPr')[0];
                        let h = esc(t);
                        const colore = attrW(figliW(rPr, 'color')[0], 'val');
                        if (colore && /^[0-9A-Fa-f]{6}$/.test(colore) && colore !== '000000') h = `<span style="color: #${colore}">${h}</span>`;
                        if (figliW(rPr, 'u').length) h = `<u>${h}</u>`;
                        if (figliW(rPr, 'i').some(x => attrW(x, 'val') !== '0')) h = `<em>${h}</em>`;
                        if (figliW(rPr, 'b').some(x => attrW(x, 'val') !== '0')) h = `<strong>${h}</strong>`;
                        return h;
                    }).join('');
                    return runs.trim() ? `<p${allinea ? ` style="text-align: ${allinea}"` : ''}>${runs}</p>` : '';
                }).filter(Boolean);

                let intestazione = null;
                const pH = parteDi('header');
                if (pH && per.has(pH)) {
                    const h = xml(pH), rel = relazioni(pH);
                    // L'immagine più grande: la fascia o il logo.
                    let migliore = null;
                    Array.from(h.getElementsByTagName('wp:extent')).forEach(ext => {
                        const contenitore = ext.parentNode;
                        const blip = contenitore.getElementsByTagName('a:blip')[0];
                        const parte = blip && rel.get(blip.getAttribute('r:embed'));
                        const tipo = parte && (/\.png$/i.test(parte) ? 'image/png' : /\.jpe?g$/i.test(parte) ? 'image/jpeg' : /\.gif$/i.test(parte) ? 'image/gif' : null);
                        if (!tipo || !per.has(parte)) return;
                        const w = Number(ext.getAttribute('cx')) / 36000, hh = Number(ext.getAttribute('cy')) / 36000;
                        if (!migliore || w * hh > migliore.w * migliore.h) migliore = { parte, tipo, w, h: hh };
                    });
                    const paragrafi = paragrafiHtml(h);
                    if (migliore || paragrafi.length) intestazione = {
                        immagine: migliore ? uint8ArrayToDataUrl(per.get(migliore.parte), migliore.tipo) : null,
                        larghezzaMm: migliore ? Math.round(migliore.w * 10) / 10 : 0, altezzaMm: migliore ? Math.round(migliore.h * 10) / 10 : 0,
                        html: paragrafi.join(''),
                        testo: paragrafi.map(x => x.replace(/<[^>]+>/g, '')).join(' · ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
                    };
                }

                let piede = null;
                const pF = parteDi('footer');
                if (pF && per.has(pF)) {
                    const f = xml(pF);
                    // In una tabella (i contatti su più colonne) le celle diventano pezzi della riga.
                    const pezzi = figliW(f, 'tc').length
                        ? figliW(f, 'tc').map(c => figliW(c, 'p').map(p => figliW(p, 't').map(t => t.textContent).join('').trim()).filter(Boolean).join(', '))
                        : figliW(f, 'p').map(p => figliW(p, 't').map(t => t.textContent).join('').trim());
                    const riga = pezzi.filter(Boolean).join(' · ');
                    if (riga) piede = { testo: riga, tabella: figliW(f, 'tbl').length > 0, numeroPagina: /\bPAGE\b/.test(testo(pF)) };
                }

                // Lo stile: «Normal» e «heading 1–3» per nome (l'id cambia con la lingua di Word),
                // con i valori di base del documento e i caratteri del tema.
                let stile = null;
                const st = xml('word/styles.xml');
                if (st) {
                    const tema = xml('word/theme/theme1.xml');
                    const fontTema = (tipo) => { const el = tema && tema.getElementsByTagName('a:' + tipo + 'Font')[0]; const l = el && el.getElementsByTagName('a:latin')[0]; return l ? l.getAttribute('typeface') : null; };
                    const stili = Array.from(st.getElementsByTagName('w:style'));
                    const perNome = (nome) => stili.find(s => (attrW(figliW(s, 'name')[0], 'val') || '').toLowerCase() === nome);
                    const base = st.getElementsByTagName('w:docDefaults')[0];
                    const valore = (els, tag, attr) => { for (const el of els) { const x = el && figliW(el, tag)[0]; const v = x && attrW(x, attr); if (v != null) return v; } return null; };
                    const font = (els) => {
                        for (const el of els) {
                            const f = el && figliW(el, 'rFonts')[0];
                            if (!f) continue;
                            if (attrW(f, 'ascii')) return attrW(f, 'ascii');
                            const t = attrW(f, 'asciiTheme');
                            if (t) return fontTema(/^major/.test(t) ? 'major' : 'minor');
                        }
                        return null;
                    };
                    const normale = perNome('normal');
                    const catena = [normale, base];
                    const corpo = valore(catena, 'sz', 'val');
                    const riga = valore(catena, 'spacing', 'line'), regola = valore(catena, 'spacing', 'lineRule');
                    const dopo = valore(catena, 'spacing', 'after');
                    const jc = valore(catena, 'jc', 'val');
                    const ptTitolo = (n) => { const s = perNome('heading ' + n); const v = valore([s, normale, base], 'sz', 'val'); return v ? Number(v) / 2 : null; };
                    const nomeFont = font(catena);
                    stile = {
                        font: FONT_DOCUMENTO.some(f => f.id === nomeFont) ? nomeFont : null, fontNelWord: nomeFont,
                        corpoPt: corpo ? Number(corpo) / 2 : null,
                        interlinea: riga && (!regola || regola === 'auto') ? Math.round(Number(riga) / 240 * 100) / 100 : null,
                        spazioParagrafoPt: dopo != null ? Number(dopo) / 20 : null,
                        allineamento: { both: 'justify', center: 'center', right: 'right', left: 'left', start: 'left' }[jc] || null,
                        h1Pt: ptTitolo(1), h2Pt: ptTitolo(2), h3Pt: ptTitolo(3)
                    };
                }
                return { margini, intestazione, piede, stile };
            }

            /** Le righe del riepilogo, prima di applicare. */
            function riepilogoLetturaWord(l) {
                const cm = mm => cmMargine(mm) + ' cm';
                const r = [];
                if (l.margini) r.push(`Margini: superiore ${cm(l.margini.top)}, inferiore ${cm(l.margini.bottom)}, sinistro ${cm(l.margini.left)}, destro ${cm(l.margini.right)}; intestazione a ${cm(l.margini.header)} dal bordo.`);
                if (l.intestazione) r.push(`Intestazione: ${l.intestazione.immagine ? `immagine di ${cm(l.intestazione.larghezzaMm)} × ${cm(l.intestazione.altezzaMm)}` : 'senza immagine'}${l.intestazione.testo ? `, testo «${l.intestazione.testo.slice(0, 60)}${l.intestazione.testo.length > 60 ? '…' : ''}»` : ''}.`);
                if (l.piede) r.push(`Piè di pagina: «${l.piede.testo.slice(0, 70)}${l.piede.testo.length > 70 ? '…' : ''}»${l.piede.tabella ? ' (nel Word è su più colonne: qui diventa una riga)' : ''}.`);
                if (l.stile) {
                    const s = l.stile, parti = [];
                    if (s.fontNelWord) parti.push(s.font ? s.font : `${s.fontNelWord} (non disponibile: resta il carattere di adesso)`);
                    if (s.corpoPt) parti.push(`${numeroConVirgola(s.corpoPt, 1)} pt`);
                    if (s.interlinea) parti.push(`interlinea ${numeroConVirgola(s.interlinea, 2)}`);
                    if (s.spazioParagrafoPt != null) parti.push(`${numeroConVirgola(s.spazioParagrafoPt, 0)} pt dopo i paragrafi`);
                    if (s.allineamento) parti.push({ justify: 'giustificato', center: 'centrato', right: 'a destra', left: 'a sinistra' }[s.allineamento]);
                    if (s.h1Pt) parti.push(`titoli ${[s.h1Pt, s.h2Pt, s.h3Pt].filter(Boolean).map(v => numeroConVirgola(v, 1)).join(' / ')} pt`);
                    if (parti.length) r.push('Testo: ' + parti.join(', ') + '.');
                }
                return r;
            }

            /** Applica al template aperto quello che il .docx ha dato. */
            function applicaLetturaWord(l) {
                salvaUndoSnapshotEditor();
                if (l.margini) templateEditorState.margins = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {}, l.margini);
                if (l.intestazione) {
                    templateEditorState.headerEnabled = true;
                    templateEditorState.headerTutte = true;
                    const mrg = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                    const utile = 210 - mrg.left - mrg.right;
                    // L'immagine sta nella larghezza del testo: se nel Word è più larga (una fascia
                    // a tutta pagina) si rimpicciolisce tenendo le proporzioni.
                    // Più larga del testo (la fascia della carta intestata): a tutta larghezza, dal
                    // bordo del foglio, come nel Word.
                    const tutta = !!l.intestazione.immagine && l.intestazione.larghezzaMm > utile + 2;
                    const hImg = !l.intestazione.immagine ? 0 : tutta ? Math.round(Math.min(60, 210 * l.intestazione.altezzaMm / l.intestazione.larghezzaMm))
                        : Math.round(l.intestazione.altezzaMm * Math.min(1, utile / l.intestazione.larghezzaMm));
                    const righe = l.intestazione.html ? (l.intestazione.html.match(/<p\b/g) || []).length : 0;
                    const hd = { imageDataUrl: l.intestazione.immagine, text: l.intestazione.testo || '', heightMm: Math.max(8, hImg + Math.ceil(righe * 4.5)) };
                    if (tutta) hd.tuttaPagina = true;
                    if (l.intestazione.html) hd.html = l.intestazione.html;
                    templateEditorState.pages.forEach(p => { p.header = JSON.parse(JSON.stringify(hd)); });
                }
                if (l.piede) {
                    templateEditorState.footerEnabled = true;
                    templateEditorState.pages.forEach(p => { p.footer = Object.assign({}, p.footer, { text: l.piede.testo }); });
                }
                if (l.stile) {
                    const nuovo = {};
                    Object.entries(l.stile).forEach(([k, v]) => { if (v != null && k !== 'fontNelWord') nuovo[k] = v; });
                    templateEditorState.stileTesto = Object.assign(stileTestoDiDefault(), templateEditorState.stileTesto || {}, nuovo);
                }
                renderTemplateEditorPageControls();
                renderTemplateEditorCanvas();
                renderManigliePaginaEditor();
            }

            async function importaDaWordNelTemplate(file) {
                if (!file) return;
                let lettura;
                try {
                    lettura = await letturaDaWord(new Uint8Array(await file.arrayBuffer()));
                } catch (e) {
                    appAlert('Dal Word non si legge niente: ' + (e && e.message ? e.message : e));
                    return;
                }
                const righe = riepilogoLetturaWord(lettura);
                if (!righe.length) { appAlert('Nel Word non ci sono margini, intestazione o stili da prendere.'); return; }
                const ok = await appDialog(`Da «${file.name}»:\n\n• ${righe.join('\n• ')}\n\nLo applico a questo template? Diventa definitivo quando salvi il template.`, { confirm: true, title: 'Importa da un Word', okLabel: 'Applica' });
                if (!ok) return;
                applicaLetturaWord(lettura);
                mostraToast('Preso dal Word: salva il template per tenerlo');
            }

            {
                const bottone = document.getElementById('btnImportaDaWord');
                const scelta = document.getElementById('fileImportaDaWord');
                if (bottone && scelta) {
                    bottone.addEventListener('click', () => { scelta.value = ''; scelta.click(); });
                    scelta.addEventListener('change', () => importaDaWordNelTemplate(scelta.files && scelta.files[0]));
                }
            }
