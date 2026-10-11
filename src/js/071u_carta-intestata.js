            // ===================== LA CARTA INTESTATA =====================
            // La carta intestata dell'ufficio (un PDF, un Word o un'immagine) come SFONDO di ogni foglio
            // del report: il report ci viene scritto sopra, come su un foglio prestampato. Si carica nel
            // gruppo «Foglio» dell'editor del template; il PDF può avere due pagine (la prima per il
            // primo foglio del documento, la seconda per gli altri). I margini si adattano alle zone
            // libere della carta, per non scrivere sopra al logo o ai contatti.
            //
            // Nel template: cartaIntestata = { id, nome, prima, altre, larghezzaMm, altezzaMm } (le
            // immagini sono JPEG a 200 dpi). Nel foglio: un <div class="dpsh-carta" data-carta="id">
            // vuoto; l'immagine arriva da una regola CSS scritta UNA volta per documento
            // (regoleCarteIntestate), non ripetuta in ogni foglio: un report di 40 pagine non porta
            // 40 copie della stessa immagine. print-color-adjust fa stampare lo sfondo anche con la
            // «Grafica di sfondo» spenta nella finestra di stampa.

            const LARGHEZZA_CARTA_PX = 1654; // A4 a 200 dpi
            const QUALITA_CARTA = 0.88;

            /** La carta di un template (o dello stato dell'editor), se c'è. */
            function cartaDelTemplate(tpl) {
                const c = tpl && tpl.cartaIntestata;
                return c && c.prima && c.id ? c : null;
            }
            /** Lo sfondo di un foglio. primaPagina: true/false se chi chiama lo sa (l'editor, le
             * miniature); se no (null) lo decide il CSS: il primo foglio del documento è la prima. */
            function htmlCartaNelFoglio(carta, primaPagina) {
                if (!carta) return '';
                const quale = primaPagina === true ? ' data-prima="1"' : primaPagina === false ? ' data-altre="1"' : '';
                return `<div class="dpsh-carta" data-carta="${String(carta.id).replace(/[^\w-]/g, '')}"${quale} aria-hidden="true"></div>`;
            }
            /** Le regole CSS di una carta: l'immagine degli altri fogli e quella del primo. */
            function regoleCarta(c) {
                const id = String(c.id).replace(/[^\w-]/g, ''), sel = `.dpsh-carta[data-carta="${id}"]`;
                const url = u => `url("${u}")`;
                return `${sel}{background-image:${url(c.altre || c.prima)}}`
                    + `${sel}[data-prima],.dpsh-sheet:not(.dpsh-sheet ~ .dpsh-sheet)>${sel}:not([data-altre]){background-image:${url(c.prima)}}\n`;
            }
            /** Le regole per le carte usate in un pezzo di HTML (un documento intero): una volta sola
             * ciascuna. Le carte si cercano nei template e nell'editor aperto. */
            function regoleCarteIntestate(html) {
                const usate = new Set();
                String(html || '').replace(/data-carta="([\w-]+)"/g, (_, id) => { usate.add(id); return _; });
                if (!usate.size) return '';
                const tutte = new Map();
                Object.values(state.reportTemplates || {}).forEach(t => { const c = cartaDelTemplate(t); if (c) tutte.set(String(c.id), c); });
                const ed = typeof templateEditorState !== 'undefined' && templateEditorState ? cartaDelTemplate(templateEditorState) : null;
                if (ed) tutte.set(String(ed.id), ed);
                return Array.from(usate).filter(id => tutte.has(id)).map(id => regoleCarta(tutte.get(id))).join('');
            }
            /** In un documento intero: il primo foglio con la carta prende la prima pagina, gli altri
             * la seconda (chi l'ha già deciso, come le miniature dell'editor, resta com'è). */
            function marcaCartePrimaEAltre(html) {
                let primo = true;
                return String(html || '').replace(/<div class="dpsh-carta" data-carta="([\w-]+)"( data-(?:prima|altre)="1")?/g, (m, id, gia) => {
                    if (gia) return m;
                    const r = `<div class="dpsh-carta" data-carta="${id}" ${primo ? 'data-prima' : 'data-altre'}="1"`;
                    primo = false;
                    return r;
                });
            }
            /** Nell'app (editor e miniature): le regole della carta del template aperto. */
            function aggiornaStileCarteEditor() {
                let el = document.getElementById('stileCarteEditor');
                const c = typeof templateEditorState !== 'undefined' && templateEditorState ? cartaDelTemplate(templateEditorState) : null;
                const chiave = c ? c.id : '';
                if (el && el.dataset.chiave === chiave) return;
                if (!el) { el = document.createElement('style'); el.id = 'stileCarteEditor'; document.head.appendChild(el); }
                el.dataset.chiave = chiave;
                el.textContent = c ? regoleCarta(c) : '';
            }

            // ---- Leggere la carta: PDF, Word, immagine ----

            /** pdf.js sta nel file come testo (vendorPdfjs): si esegue la prima volta che serve. Il
             * lavoratore gira nella pagina stessa (globalThis.pdfjsWorker): niente Worker da un file
             * esterno, che dentro l'app installata o da file:// non sempre si può avviare. */
            let promessaPdfjs = null;
            function caricaPdfjs() {
                if (globalThis.pdfjsLib && globalThis.pdfjsWorker) return Promise.resolve(globalThis.pdfjsLib);
                if (promessaPdfjs) return promessaPdfjs;
                promessaPdfjs = new Promise((ok, ko) => {
                    try {
                        const lib = document.getElementById('vendorPdfjs'), lav = document.getElementById('vendorPdfjsWorker');
                        if (!lib || !lav) throw new Error('Il lettore di PDF non è in questa versione dell\'app.');
                        (0, eval)(lav.textContent);
                        (0, eval)(lib.textContent);
                        if (!globalThis.pdfjsLib) throw new Error('Il lettore di PDF non si è avviato.');
                        ok(globalThis.pdfjsLib);
                    } catch (e) { promessaPdfjs = null; ko(e); }
                });
                return promessaPdfjs;
            }
            /** Una tela bianca larga quanto la carta (A4 a 200 dpi) e alta in proporzione. */
            function telaCarta(larghezzaMm, altezzaMm) {
                const tela = document.createElement('canvas');
                tela.width = LARGHEZZA_CARTA_PX;
                tela.height = Math.round(LARGHEZZA_CARTA_PX * altezzaMm / larghezzaMm);
                const g = tela.getContext('2d');
                g.fillStyle = '#ffffff'; g.fillRect(0, 0, tela.width, tela.height);
                return { tela, g, pxMm: tela.width / larghezzaMm };
            }
            /** Le pagine (al massimo due) di un PDF, come tele. */
            async function pagineCartaDaPdf(bytes) {
                const pdfjs = await caricaPdfjs();
                const doc = await pdfjs.getDocument({ data: bytes, isEvalSupported: false, disableFontFace: false, useSystemFonts: true }).promise;
                const pagine = [];
                for (let n = 1; n <= Math.min(2, doc.numPages); n++) {
                    const p = await doc.getPage(n);
                    const v1 = p.getViewport({ scale: 1 });
                    const mm = { l: v1.width / 72 * 25.4, h: v1.height / 72 * 25.4 };
                    const { tela, g } = telaCarta(mm.l, mm.h);
                    await p.render({ canvasContext: g, viewport: p.getViewport({ scale: tela.width / v1.width }), background: '#ffffff' }).promise;
                    pagine.push({ tela, larghezzaMm: mm.l, altezzaMm: mm.h });
                }
                doc.destroy();
                return pagine;
            }
            /** Un'immagine (PNG, JPEG…) come tela, su fondo bianco. Si prende per un A4 verticale. */
            async function pagineCartaDaImmagine(file) {
                const url = URL.createObjectURL(file);
                try {
                    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('Immagine non leggibile.')); i.src = url; });
                    const { tela, g } = telaCarta(210, 210 * img.naturalHeight / img.naturalWidth);
                    g.drawImage(img, 0, 0, tela.width, tela.height);
                    return [{ tela, larghezzaMm: 210, altezzaMm: 210 * img.naturalHeight / img.naturalWidth }];
                } finally { URL.revokeObjectURL(url); }
            }

            /** IL WORD: si ridisegna quello che c'è nell'intestazione e nel piè di pagina — le
             * immagini (ancorate alla pagina o nel testo) e il testo, con le sue colonne — alla loro
             * posizione sul foglio. Due pagine se il Word ha una prima pagina diversa. È una
             * ricostruzione: le forme disegnate e i loghi in formato EMF/WMF non ci sono (lo si dice). */
            async function pagineCartaDaWord(bytes) {
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
                const sezioni = doc.getElementsByTagName('w:sectPr'), sez = sezioni[sezioni.length - 1];
                const pg = figliW(sez, 'pgSz')[0], mar = figliW(sez, 'pgMar')[0];
                const W = pg ? mmDaTwip(attrW(pg, 'w')) : 210, H = pg ? mmDaTwip(attrW(pg, 'h')) : 297;
                const m = { top: mar ? mmDaTwip(attrW(mar, 'top')) : 25, bottom: mar ? mmDaTwip(attrW(mar, 'bottom')) : 20, left: mar ? mmDaTwip(attrW(mar, 'left')) : 20,
                    right: mar ? mmDaTwip(attrW(mar, 'right')) : 20, header: mar ? mmDaTwip(attrW(mar, 'header') || 12.5) : 12.5, footer: mar ? mmDaTwip(attrW(mar, 'footer') || 12.5) : 12.5 };
                const titlePg = figliW(sez, 'titlePg').some(x => attrW(x, 'val') !== '0' && attrW(x, 'val') !== 'false');
                const parte = (tipo, quale) => { const ref = figliW(sez, tipo + 'Reference').find(r => attrW(r, 'type') === quale); return ref ? relDoc.get(ref.getAttribute('r:id')) : null; };
                // Il corpo del testo di base (Normal), per i paragrafi senza misura propria.
                const stili = xml('word/styles.xml');
                const szBase = (() => { const d = stili && stili.getElementsByTagName('w:docDefaults')[0]; const s = d && figliW(d, 'sz')[0]; return s ? Number(attrW(s, 'val')) / 2 : 10; })();
                const mancanti = new Set();

                const immagini = new Map();
                const immagine = async (nome) => {
                    if (immagini.has(nome)) return immagini.get(nome);
                    let img = null;
                    const tipo = /\.png$/i.test(nome) ? 'image/png' : /\.jpe?g$/i.test(nome) ? 'image/jpeg' : /\.gif$/i.test(nome) ? 'image/gif' : /\.bmp$/i.test(nome) ? 'image/bmp' : null;
                    if (tipo && per.has(nome)) {
                        const url = URL.createObjectURL(new Blob([per.get(nome)], { type: tipo }));
                        img = await new Promise(ok => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ok(null); i.src = url; });
                    } else if (nome) mancanti.add(nome.replace(/^.*\//, ''));
                    immagini.set(nome, img);
                    return img;
                };
                const EMU_MM = 1 / 36000;

                // Una pagina: l'intestazione (dall'alto) e il piè (dal basso) della parte scelta.
                const disegna = async (parteH, parteF) => {
                    const { tela, g, pxMm } = telaCarta(W, H);
                    const disegnaParte = async (nomeParte, inFondo) => {
                        if (!nomeParte || !per.has(nomeParte)) return;
                        const radice = xml(nomeParte), rel = relazioni(nomeParte);
                        const corpo = radice.documentElement;
                        // Prima le ancore (a posizione fissa), poi il flusso: paragrafi e tabelle.
                        for (const a of Array.from(corpo.getElementsByTagName('wp:anchor'))) {
                            const blip = a.getElementsByTagName('a:blip')[0], ext = a.getElementsByTagName('wp:extent')[0];
                            if (!blip || !ext) continue;
                            const img = await immagine(rel.get(blip.getAttribute('r:embed')));
                            if (!img) continue;
                            const w = Number(ext.getAttribute('cx')) * EMU_MM, h = Number(ext.getAttribute('cy')) * EMU_MM;
                            const pos = (asse) => {
                                const el = a.getElementsByTagName('wp:position' + asse)[0];
                                if (!el) return 0;
                                const rel0 = el.getAttribute('relativeFrom') || '', off = el.getElementsByTagName('wp:posOffset')[0], al = el.getElementsByTagName('wp:align')[0];
                                const orizz = asse === 'H';
                                const [base, lung] = orizz ? (rel0 === 'page' ? [0, W] : [m.left, W - m.left - m.right])
                                    : (rel0 === 'page' ? [0, H] : rel0 === 'margin' ? [m.top, H - m.top - m.bottom] : rel0 === 'topMargin' ? [0, m.top] : rel0 === 'bottomMargin' ? [H - m.bottom, m.bottom]
                                        : inFondo ? [H - m.footer - h, h] : [m.header, h]);
                                if (off) return base + Number(off.textContent) * EMU_MM;
                                const v = al ? al.textContent : '';
                                const dim = orizz ? w : h;
                                return v === 'center' ? base + (lung - dim) / 2 : (v === 'right' || v === 'bottom' || v === 'outside') ? base + lung - dim : base;
                            };
                            g.drawImage(img, pos('H') * pxMm, pos('V') * pxMm, w * pxMm, h * pxMm);
                        }
                        // Il flusso: ogni blocco (paragrafo o riga di tabella) con la sua altezza.
                        const blocchi = [];
                        const paragrafo = async (p, x0, larghezza) => {
                            const jc = attrW(figliW(p, 'jc')[0], 'val');
                            const allinea = { center: 'center', right: 'right', end: 'right' }[jc] || 'left';
                            const pezzi = [];
                            for (const r of figliW(p, 'r')) {
                                if (r.parentNode && r.parentNode.nodeName === 'mc:Fallback') continue;
                                const inl = r.getElementsByTagName('wp:inline')[0];
                                if (inl) {
                                    const blip = inl.getElementsByTagName('a:blip')[0], ext = inl.getElementsByTagName('wp:extent')[0];
                                    const img = blip && ext ? await immagine(rel.get(blip.getAttribute('r:embed'))) : null;
                                    if (img) pezzi.push({ img, w: Number(ext.getAttribute('cx')) * EMU_MM, h: Number(ext.getAttribute('cy')) * EMU_MM });
                                    continue;
                                }
                                const vml = r.getElementsByTagName('v:imagedata')[0];
                                if (vml) {
                                    const forma = vml.parentNode, st = (forma && forma.getAttribute('style')) || '';
                                    const pt = k => { const mm = new RegExp(k + ':\\s*([\\d.]+)pt').exec(st); return mm ? Number(mm[1]) * 25.4 / 72 : null; };
                                    const img = await immagine(rel.get(vml.getAttribute('r:id')));
                                    if (img && pt('width')) {
                                        const assoluta = /position:\s*absolute/.test(st);
                                        if (assoluta) {
                                            const suPagina = /mso-position-horizontal-relative:\s*page/.test(st), suPaginaV = /mso-position-vertical-relative:\s*page/.test(st);
                                            g.drawImage(img, ((suPagina ? 0 : m.left) + (pt('margin-left') || 0)) * pxMm, ((suPaginaV ? 0 : inFondo ? H - m.footer : m.header) + (pt('margin-top') || 0)) * pxMm, pt('width') * pxMm, pt('height') * pxMm);
                                        } else pezzi.push({ img, w: pt('width'), h: pt('height') || pt('width') });
                                    }
                                    continue;
                                }
                                const t = figliW(r, 't').map(x => x.textContent).join('') + (figliW(r, 'tab').length ? '    ' : '');
                                if (!t) continue;
                                const rPr = figliW(r, 'rPr')[0], sz = figliW(rPr, 'sz')[0];
                                const colore = attrW(figliW(rPr, 'color')[0], 'val');
                                const font = attrW(figliW(rPr, 'rFonts')[0], 'ascii') || 'Arial';
                                pezzi.push({ t, pt: sz ? Number(attrW(sz, 'val')) / 2 : szBase, b: figliW(rPr, 'b').some(x => attrW(x, 'val') !== '0'), i: figliW(rPr, 'i').some(x => attrW(x, 'val') !== '0'),
                                    colore: colore && /^[0-9A-Fa-f]{6}$/.test(colore) ? '#' + colore : '#000000', font });
                            }
                            // Le righe (si va a capo dove il testo non sta), in mm.
                            const righe = [[]];
                            let usata = 0;
                            const ff = q => `${q.i ? 'italic ' : ''}${q.b ? 'bold ' : ''}${q.pt * 25.4 / 72 * pxMm}px "${q.font}", Arial, sans-serif`;
                            for (const q of pezzi) {
                                if (q.img) { if (usata + q.w > larghezza && righe[righe.length - 1].length) { righe.push([]); usata = 0; } righe[righe.length - 1].push(q); usata += q.w; continue; }
                                g.font = ff(q);
                                for (const parola of q.t.split(/(\s+)/)) {
                                    if (!parola) continue;
                                    const lw = g.measureText(parola).width / pxMm;
                                    if (usata + lw > larghezza && righe[righe.length - 1].length && /\S/.test(parola)) { righe.push([]); usata = 0; }
                                    const ult = righe[righe.length - 1], prec = ult[ult.length - 1];
                                    if (prec && !prec.img && prec.q === q) { prec.t += parola; prec.w += lw; } else ult.push({ q, t: parola, w: lw });
                                    usata += lw;
                                }
                            }
                            const altezze = righe.map(r => Math.max(szBase * 25.4 / 72 * 1.15, ...r.map(x => x.img ? x.h : x.q.pt * 25.4 / 72 * 1.15)));
                            const spazio = (() => { const s = figliW(p, 'spacing')[0]; return s ? (Number(attrW(s, 'after') || 0)) / 56.6929 : 0; })();
                            return {
                                h: altezze.reduce((s, x) => s + x, 0) + spazio,
                                disegna: (y) => {
                                    righe.forEach((r, k) => {
                                        const lw = r.reduce((s, x) => s + x.w, 0), hR = altezze[k];
                                        let x = allinea === 'center' ? x0 + (larghezza - lw) / 2 : allinea === 'right' ? x0 + larghezza - lw : x0;
                                        r.forEach(z => {
                                            if (z.img) g.drawImage(z.img, x * pxMm, (y + hR - z.h) * pxMm, z.w * pxMm, z.h * pxMm);
                                            else { g.font = ff(z.q); g.fillStyle = z.q.colore; g.textBaseline = 'alphabetic'; g.fillText(z.t, x * pxMm, (y + hR * 0.8) * pxMm); }
                                            x += z.w;
                                        });
                                        y += hR;
                                    });
                                }
                            };
                        };
                        const xL = m.left, lungh = W - m.left - m.right;
                        for (const nodo of Array.from(corpo.childNodes)) {
                            if (nodo.nodeName === 'w:p') blocchi.push(await paragrafo(nodo, xL, lungh));
                            else if (nodo.nodeName === 'w:tbl') {
                                for (const tr of figliW(nodo, 'tr')) {
                                    const celle = Array.from(tr.childNodes).filter(c => c.nodeName === 'w:tc');
                                    if (!celle.length) continue;
                                    const lc = lungh / celle.length;
                                    const colonne = [];
                                    for (let k = 0; k < celle.length; k++) {
                                        const ps = [];
                                        for (const p of Array.from(celle[k].childNodes).filter(c => c.nodeName === 'w:p')) ps.push(await paragrafo(p, xL + k * lc, lc));
                                        colonne.push(ps);
                                    }
                                    const h = Math.max(...colonne.map(ps => ps.reduce((s, b) => s + b.h, 0)));
                                    blocchi.push({ h, disegna: (y) => colonne.forEach(ps => { let yy = y; ps.forEach(b => { b.disegna(yy); yy += b.h; }); }) });
                                }
                            }
                        }
                        // Le righe vuote in fondo all'intestazione (o in cima al piè) non spostano niente.
                        const pieni = blocchi.slice();
                        const totale = pieni.reduce((s, b) => s + b.h, 0);
                        let y = inFondo ? H - m.footer - totale : m.header;
                        pieni.forEach(b => { b.disegna(y); y += b.h; });
                    };
                    await disegnaParte(parteH, false);
                    await disegnaParte(parteF, true);
                    return { tela, larghezzaMm: W, altezzaMm: H };
                };
                const pagine = [];
                const hD = parte('header', 'default'), fD = parte('footer', 'default');
                if (titlePg) pagine.push(await disegna(parte('header', 'first'), parte('footer', 'first')));
                pagine.push(await disegna(hD, fD));
                pagine.mancanti = Array.from(mancanti);
                return pagine;
            }

            /** LE ZONE LIBERE: dove sulla carta non c'è niente stampato, lì può andare il testo. Si
             * guardano le fasce in alto (fino al 40% del foglio), in basso (30%) e ai lati (25%):
             * l'ultima riga o colonna con qualcosa disegnato, più 5 mm di respiro. Una filigrana in
             * mezzo al foglio non conta: sta sotto il testo, come deve. */
            function marginiDallaCarta(tela, larghezzaMm, altezzaMm) {
                const g = tela.getContext('2d');
                // Su una tela ridotta (4 px per mm): basta e fa presto.
                const k = 4, w = Math.round(larghezzaMm * k), h = Math.round(altezzaMm * k);
                const piccola = document.createElement('canvas'); piccola.width = w; piccola.height = h;
                const gp = piccola.getContext('2d'); gp.drawImage(tela, 0, 0, w, h);
                const d = gp.getImageData(0, 0, w, h).data;
                const pieno = (x, y) => { const i = (y * w + x) * 4; return (d[i] + d[i + 1] + d[i + 2]) / 3 < 235 && d[i + 3] > 0; };
                const rigaPiena = (y, x0, x1) => { let n = 0; for (let x = x0; x < x1; x++) if (pieno(x, y)) n++; return n >= 2; };
                const colPiena = (x, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) if (pieno(x, y)) n++; return n >= 2; };
                // Le bande laterali (piene per buona parte dell'altezza) non sono né testata né piede:
                // le righe si guardano fra le bande.
                const piena = x => { let n = 0; for (let y = 0; y < h; y++) if (pieno(x, y)) n++; return n > h * 0.6; };
                let bx0 = 0, bx1 = w;
                while (bx0 < w * 0.25 && piena(bx0)) bx0++;
                while (bx1 > w * 0.75 && piena(bx1 - 1)) bx1--;
                let sopra = 0, sotto = 0, sx = 0, dx = 0;
                for (let y = Math.round(h * 0.4); y >= 0; y--) if (rigaPiena(y, bx0, bx1)) { sopra = (y + 1) / k; break; }
                for (let y = Math.round(h * 0.7); y < h; y++) if (rigaPiena(y, bx0, bx1)) { sotto = (h - y) / k; break; }
                const y0 = Math.round((sopra + 5) * k), y1 = Math.round(h - (sotto + 5) * k);
                for (let x = Math.round(w * 0.25); x >= 0; x--) if (colPiena(x, y0, y1)) { sx = (x + 1) / k; break; }
                for (let x = Math.round(w * 0.75); x < w; x++) if (colPiena(x, y0, y1)) { dx = (w - x) / k; break; }
                const r = v => Math.round(v * 2) / 2;
                return { top: sopra ? r(sopra + 5) : null, bottom: sotto ? r(sotto + 5) : null, left: sx ? r(sx + 5) : null, right: dx ? r(dx + 5) : null };
            }

            /** Dal file alla carta: { carta, margini, avvisi }. */
            async function cartaDaFile(file) {
                const bytes = new Uint8Array(await file.arrayBuffer());
                const nome = file.name || 'carta';
                let pagine;
                if (/\.pdf$/i.test(nome) || (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46)) pagine = await pagineCartaDaPdf(bytes);
                else if (/\.docx$/i.test(nome) || (bytes[0] === 0x50 && bytes[1] === 0x4b)) pagine = await pagineCartaDaWord(bytes);
                else if (/^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|bmp)$/i.test(nome)) pagine = await pagineCartaDaImmagine(file);
                else throw new Error('Formato non riconosciuto: serve un PDF, un Word (.docx) o un\'immagine.');
                if (!pagine.length) throw new Error('Il file non ha pagine.');
                const avvisi = [];
                const p0 = pagine[0];
                if (Math.abs(p0.larghezzaMm / p0.altezzaMm - 210 / 297) > 0.03) avvisi.push(`La carta non è un A4 verticale (${Math.round(p0.larghezzaMm)} × ${Math.round(p0.altezzaMm)} mm): viene adattata al foglio.`);
                if (pagine.mancanti && pagine.mancanti.length) avvisi.push(`Nel Word ci sono immagini in un formato che qui non si disegna (${pagine.mancanti.join(', ')}): per averle, salva la carta come PDF dal Word e carica quello.`);
                const carta = {
                    id: 'carta' + Date.now().toString(36), nome,
                    prima: pagine[0].tela.toDataURL('image/jpeg', QUALITA_CARTA),
                    altre: pagine[1] ? pagine[1].tela.toDataURL('image/jpeg', QUALITA_CARTA) : null,
                    larghezzaMm: Math.round(p0.larghezzaMm * 10) / 10, altezzaMm: Math.round(p0.altezzaMm * 10) / 10
                };
                // I margini: i più larghi fra le pagine (210 × 297, il foglio vero).
                const sc = (p) => { const mm = marginiDallaCarta(p.tela, p.larghezzaMm, p.altezzaMm), fx = 210 / p.larghezzaMm, fy = 297 / p.altezzaMm;
                    return { top: mm.top && mm.top * fy, bottom: mm.bottom && mm.bottom * fy, left: mm.left && mm.left * fx, right: mm.right && mm.right * fx }; };
                const tutti = pagine.map(sc);
                const margini = {};
                ['top', 'bottom', 'left', 'right'].forEach(k => { const v = Math.max(0, ...tutti.map(x => x[k] || 0)); if (v) margini[k] = Math.min(80, Math.round(v * 2) / 2); });
                return { carta, margini, avvisi };
            }

            // ---- Nell'editor del template: il gruppo «Foglio» ----

            function renderCartaEditor() {
                aggiornaStileCarteEditor();
                const c = cartaDelTemplate(templateEditorState);
                const box = document.getElementById('tplCartaAnteprima');
                if (!box) return;
                box.hidden = !c;
                const bt = document.getElementById('btnCaricaCarta');
                if (bt) bt.lastChild.textContent = c ? ' Cambia carta intestata…' : ' Carica carta intestata…';
                ['btnCartaMargini', 'btnTogliCarta'].forEach(id => { const b = document.getElementById(id); if (b) b.hidden = !c; });
                if (!c) return;
                document.getElementById('imgCartaPrima').src = c.prima;
                const altre = document.getElementById('imgCartaAltre');
                altre.hidden = !c.altre;
                if (c.altre) altre.src = c.altre;
                document.getElementById('lblCartaNome').textContent = c.nome + (c.altre ? ' · 2 pagine' : '');
            }
            /** Applica i margini proposti (solo i lati dove la carta ha qualcosa). */
            function applicaMarginiCarta(margini) {
                const m = Object.assign(marginiPaginaDiDefault(), templateEditorState.margins || {});
                Object.entries(margini || {}).forEach(([k, v]) => { if (v != null) m[k] = v; });
                templateEditorState.margins = m;
            }
            async function caricaCartaNelTemplate(file) {
                if (!file || !templateEditorState) return;
                let r;
                try {
                    mostraToast('Leggo la carta intestata…');
                    r = await cartaDaFile(file);
                } catch (e) {
                    appAlert('Non riesco a usare questa carta intestata: ' + (e && e.message ? e.message : e));
                    return;
                }
                salvaUndoSnapshotEditor();
                templateEditorState.cartaIntestata = r.carta;
                templateEditorState.cartaMarginiProposti = r.margini;
                applicaMarginiCarta(r.margini);
                renderCartaEditor();
                sincronizzaControlliMarginiSidebar();
                renderTemplateEditorCanvas();
                if (typeof renderManigliePaginaEditor === 'function') renderManigliePaginaEditor();
                const lati = Object.keys(r.margini).map(k => ({ top: 'superiore', bottom: 'inferiore', left: 'sinistro', right: 'destro' })[k]);
                const testo = 'Carta intestata caricata: ogni foglio del report ci viene scritto sopra.'
                    + (lati.length ? ` Ho adattato i margini (${lati.join(', ')}) alle zone libere della carta: correggili se serve.` : '')
                    + (r.avvisi.length ? '\n\n' + r.avvisi.join('\n') : '');
                appDialog(testo, { title: 'Carta intestata' });
            }
            {
                const bt = document.getElementById('btnCaricaCarta'), file = document.getElementById('fileCartaIntestata');
                if (bt && file) {
                    bt.addEventListener('click', () => { file.value = ''; file.click(); });
                    file.addEventListener('change', () => caricaCartaNelTemplate(file.files && file.files[0]));
                }
                const btM = document.getElementById('btnCartaMargini');
                if (btM) btM.addEventListener('click', () => {
                    const c = cartaDelTemplate(templateEditorState);
                    if (!c) return;
                    salvaUndoSnapshotEditor();
                    // I margini dalla carta si ricalcolano dall'immagine salvata.
                    const img = new Image();
                    img.onload = () => {
                        const t = document.createElement('canvas'); t.width = img.naturalWidth; t.height = img.naturalHeight; t.getContext('2d').drawImage(img, 0, 0);
                        const mm = marginiDallaCarta(t, 210, 297), m = {};
                        Object.entries(mm).forEach(([k, v]) => { if (v) m[k] = v; });
                        applicaMarginiCarta(m);
                        sincronizzaControlliMarginiSidebar(); renderTemplateEditorCanvas();
                        if (typeof renderManigliePaginaEditor === 'function') renderManigliePaginaEditor();
                        mostraToast('Margini adattati alla carta');
                    };
                    img.src = c.prima;
                });
                const btT = document.getElementById('btnTogliCarta');
                if (btT) btT.addEventListener('click', () => {
                    salvaUndoSnapshotEditor();
                    templateEditorState.cartaIntestata = null;
                    renderCartaEditor(); renderTemplateEditorCanvas();
                });
            }
