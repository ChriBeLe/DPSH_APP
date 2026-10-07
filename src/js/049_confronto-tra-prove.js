            // ============================ CONFRONTO TRA PROVE (voce 12) ============================
            // Serve a correlare gli strati tra verticali dello stesso cantiere. Le profondità sono dal piano
            // campagna: l'app non conosce la quota assoluta delle prove, e l'altitudine del GPS è troppo
            // imprecisa per allinearle.
            const COLORI_CONFRONTO = ['#2563eb', '#dc2626', '#16a34a', '#d97706', '#7c3aed', '#0891b2', '#db2777', '#65a30d'];
            let confrontoStato = { projId: null, grandezza: 'colpi', attive: new Set() };

            /** Le fasce di una colonna stratigrafica: intervalli contigui con lo stesso strato fusi in una
             * fascia. Lo strato di un intervallo è l'ultimo assegnato fino a lì, come in getEffectiveLithology;
             * prima di qualunque assegnazione, o per uno strato che non esiste più, vale il primo dell'elenco. */
            function colonnaStratigrafica(logs, strati) {
                const elenco = strati || [];
                const trova = id => elenco.find(s => s.id === id) || elenco[0] || { id: '', name: '?', color: '#94a3b8' };
                let corrente = elenco[0] ? elenco[0].id : '';
                const fasce = [];
                (logs || []).forEach(l => {
                    if (l.lithology) corrente = l.lithology;
                    const strato = trova(corrente);
                    const da = parseFloat(l.start) || 0;
                    const a = parseFloat(l.end) || 0;
                    const ultima = fasce[fasce.length - 1];
                    if (ultima && ultima.stratoId === strato.id && Math.abs(ultima.a - da) < 0.001) ultima.a = a;
                    else fasce.push({ da, a, stratoId: strato.id, nome: strato.name, colore: strato.color || '#94a3b8' });
                });
                return fasce;
            }

            /** I punti di una prova per il confronto: un valore per intervallo, colpi N o Rpd (kg/cm²),
             * ordinati per profondità. */
            function serieConfrontoProva(surv, grandezza) {
                const instrument = (surv && surv.instrument) || {};
                const stepCm = parseFloat((surv && surv.settings && surv.settings.stepCm) || 20);
                return ((surv && surv.logs) || [])
                    .map(l => ({
                        da: parseFloat(l.start) || 0,
                        a: parseFloat(l.end) || 0,
                        valore: grandezza === 'rpd' ? rpdDiLog(l, instrument, stepCm) : (parseFloat(l.colpi) || 0)
                    }))
                    .filter(pt => pt.a > pt.da && Number.isFinite(pt.valore))
                    .sort((x, y) => x.da - y.da);
            }

            /** Un fondo scala «tondo» per l'asse dei valori (1, 2, 2,5, 5 per potenze di 10), mai sotto il dato. */
            function massimoTondo(v) {
                if (!(v > 0)) return 10;
                const potenza = Math.pow(10, Math.floor(Math.log10(v)));
                for (const passo of [1, 2, 2.5, 5, 10]) {
                    if (passo * potenza >= v) return passo * potenza;
                }
                return 10 * potenza;
            }

            function proveConfrontabili(proj) {
                return Object.values((proj && proj.surveys) || {})
                    .filter(s => (s.logs || []).length > 0)
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0) || (a.updatedAt || 0) - (b.updatedAt || 0));
            }

            function apriConfrontoProve(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj) return;
                if (state.uiState && state.uiState.currentView === 'field' && projId === state.currentProjectId) syncStateToProject();
                const prove = proveConfrontabili(proj);
                if (prove.length < 2) {
                    appAlert('Per confrontare servono almeno due prove con intervalli registrati in questo progetto.');
                    return;
                }
                confrontoStato = { projId, grandezza: confrontoStato.grandezza || 'colpi', attive: new Set(proveFisiche(prove).map(s => s.id)) };
                const overlay = document.getElementById('modalConfrontoProveOverlay');
                const finestra = document.getElementById('modalConfrontoProve');
                if (overlay) overlay.classList.add('open');
                if (finestra) finestra.classList.add('open');
                // Aperta prima di disegnare: la figura si misura sullo spazio della finestra.
                renderConfrontoProve();
            }

            function chiudiConfrontoProve() {
                const overlay = document.getElementById('modalConfrontoProveOverlay');
                const finestra = document.getElementById('modalConfrontoProve');
                if (overlay) overlay.classList.remove('open');
                if (finestra) finestra.classList.remove('open');
            }

            /** I dati della figura, uguali per lo schermo e per i file: le curve delle prove accese e le
             * loro colonne stratigrafiche, coi testi ancora grezzi (li protegge chi li scrive). */
            function datiConfronto(proj, prove, attiveIds, grandezza) {
                const colore = new Map(prove.map((s, i) => [s.id, COLORI_CONFRONTO[i % COLORI_CONFRONTO.length]]));
                const attive = prove.filter(s => attiveIds.has(s.id));
                const numero = s => String((s.header && s.header.provaNr) || '?');
                const colonne = attive.map(s => ({
                    id: s.id, numero: numero(s), colore: colore.get(s.id),
                    punti: serieConfrontoProva(s, grandezza),
                    fasce: colonnaStratigrafica(s.logs, proj.strati)
                }));
                const strati = new Map();
                colonne.forEach(c => c.fasce.forEach(f => { if (!strati.has(f.stratoId)) strati.set(f.stratoId, { nome: f.nome, colore: f.colore }); }));
                return {
                    titolo: proj.name || proj.comune || 'Progetto',
                    grandezza, colonne, colore,
                    strati: Array.from(strati.values()),
                    maxProf: Math.max(1, ...attive.map(s => (s.logs || []).reduce((m, l) => Math.max(m, parseFloat(l.end) || 0), 0))),
                    maxDato: Math.max(0, ...colonne.map(c => c.punti.reduce((m, pt) => Math.max(m, pt.valore), 0)))
                };
            }

            /** La figura come elenco di segni (linee, rettangoli, spezzate, testi) in coordinate di pixel.
             * Da qui escono sia l'SVG (schermo e file) sia il PDF, così i tre non possono divergere.
             * I colori che iniziano con «@» sono quelli del tema: li risolve chi disegna.
             * opz: larghezza e altezza disponibili, fs (corpo del testo), perFile (titolo e legenda dentro). */
            function disegnoConfronto(d, opz) {
                const fs = opz.fs || 12;
                const n = Math.max(1, d.colonne.length);
                const W0 = Math.max(320, opz.larghezza || 900);
                const padL = Math.round(fs * 3.4), padR = 10, gapMezzo = Math.round(fs * 2), colGap = n > 20 ? 5 : 8;
                const spazioColonne = W0 - padL - padR - gapMezzo - Math.max(220, W0 * 0.34);
                const colW = Math.max(14, Math.min(60, Math.floor((spazioColonne + colGap) / n - colGap)));
                const larghezzaColonne = n * colW + (n - 1) * colGap;
                const plotW = Math.max(200, Math.min(W0 - padL - padR - gapMezzo - larghezzaColonne, W0 * 0.62));
                const W = Math.round(padL + plotW + gapMezzo + larghezzaColonne + padR);
                const el = [];
                const testo = (x, y, t, o) => el.push(Object.assign({ t: 'testo', x, y, testo: t, dim: fs, colore: '@muto', ancora: 'start' }, o));

                // Le etichette delle colonne: dritte se ci stanno, altrimenti in verticale.
                const lungEtichetta = Math.max(1, ...d.colonne.map(c => c.numero.length));
                const fsEtichetta = fs * 0.95;
                const ruota = lungEtichetta * fsEtichetta * 0.62 > colW + colGap - 2;
                const titoloH = opz.perFile ? Math.round(fs * 3.8) : 0;
                const padT = titoloH + Math.round(Math.max(fs * 3, ruota ? lungEtichetta * fsEtichetta * 0.62 + fs * 1.4 : 0));

                // La legenda degli strati (solo nei file: a schermo è sotto la figura, in HTML).
                let legendaRighe = [];
                if (opz.perFile && d.strati.length) {
                    let riga = [], xx = padL;
                    d.strati.forEach(s => {
                        const w = fs + 6 + larghezzaTestoPdf(s.nome, false) * fs * 0.95 + fs * 1.6;
                        if (riga.length && xx + w > W - padR) { legendaRighe.push(riga); riga = []; xx = padL; }
                        riga.push({ s, x: xx });
                        xx += w;
                    });
                    legendaRighe.push(riga);
                }
                const legendaH = legendaRighe.length ? Math.round(legendaRighe.length * fs * 1.8 + fs * 0.8) : 0;
                const padB = 12 + legendaH;
                const H = Math.round(Math.max(padT + padB + 220, opz.altezza || 0));
                const plotH = H - padT - padB;
                const y = m => padT + (m / d.maxProf) * plotH;

                // Asse dei valori: passi «tondi», tanti quanti ne stanno senza accavallarsi.
                const nPassi = Math.max(2, Math.min(10, Math.floor(plotW / (fs * 5.5))));
                const passoV = massimoTondo((d.maxDato > 0 ? d.maxDato : 10) / nPassi);
                const maxVal = Math.max(passoV, Math.ceil((d.maxDato > 0 ? d.maxDato : 10) / passoV - 1e-9) * passoV);
                const x = v => padL + (v / maxVal) * plotW;
                const virgola = (v, dec) => v.toFixed(dec).replace('.', ',');
                const decV = passoV >= 1 ? 0 : (passoV >= 0.1 ? 1 : 2);

                // Asse delle profondità: il passo più fitto che lascia almeno due righe di testo tra le tacche.
                const pxMetro = plotH / d.maxProf;
                const passoP = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50].find(p => p * pxMetro >= fs * 2.2) || 100;
                const decP = passoP < 1 ? 1 : 0;

                if (opz.perFile) {
                    testo(padL, Math.round(fs * 1.7), 'Confronto prove · ' + d.titolo, { dim: fs * 1.45, grassetto: true, colore: '@testo' });
                    testo(padL, Math.round(fs * 3.1), (d.grandezza === 'rpd' ? 'Rpd (kg/cm²)' : 'Colpi N') + ' e colonne stratigrafiche · profondità dal piano campagna (m)' + (opz.data ? ' · ' + opz.data : ''), { dim: fs * 0.9 });
                }
                for (let k = 0; k * passoP <= d.maxProf + 1e-6; k++) {
                    const m = k * passoP;
                    const metro = Math.abs(m - Math.round(m)) < 1e-6;
                    el.push({ t: 'linea', x1: padL, y1: y(m), x2: W - padR, y2: y(m), colore: '@bordo', spessore: metro ? 0.9 : 0.5, tratteggio: metro ? null : [2, 3] });
                    testo(padL - 6, y(m) + fs * 0.35, virgola(m, decP), { ancora: 'end', mono: true });
                }
                for (let v = 0; v <= maxVal + 1e-9; v += passoV) {
                    el.push({ t: 'linea', x1: x(v), y1: padT, x2: x(v), y2: H - padB, colore: '@bordo', spessore: 0.5, tratteggio: [2, 3] });
                    testo(x(v), padT - 6, virgola(v, decV), { ancora: 'middle', mono: true });
                }
                testo(padL, padT - fs * 1.6, d.grandezza === 'rpd' ? 'Rpd (kg/cm²)' : 'Colpi N', { dim: fs * 1.05, grassetto: true, colore: '@testo' });
                testo(4, padT - 6, 'm', {});
                el.push({ t: 'linea', x1: padL, y1: padT, x2: padL, y2: H - padB, colore: '@bordoForte', spessore: 1.3 });

                d.colonne.forEach(c => {
                    const punti = [];
                    let precedente = null;
                    c.punti.forEach(pt => {
                        const contiguo = precedente && Math.abs(precedente.a - pt.da) < 0.001;
                        punti.push([x(pt.valore), y(pt.da), !contiguo], [x(pt.valore), y(pt.a), false]);
                        precedente = pt;
                    });
                    if (punti.length) el.push({ t: 'percorso', punti, colore: c.colore, spessore: Math.max(1.6, fs / 6), titolo: 'DPSH ' + c.numero });
                });

                const xColonne = padL + plotW + gapMezzo;
                d.colonne.forEach((c, i) => {
                    const x0 = xColonne + i * (colW + colGap);
                    if (ruota) testo(x0 + colW / 2 + fsEtichetta * 0.35, padT - 6, c.numero, { dim: fsEtichetta, grassetto: true, colore: c.colore, mono: true, ruota: true });
                    else testo(x0 + colW / 2, padT - 6, c.numero, { dim: fsEtichetta, grassetto: true, colore: c.colore, ancora: 'middle', mono: true });
                    c.fasce.forEach(f => el.push({
                        t: 'rett', x: x0, y: y(f.da), w: colW, h: Math.max(0.5, y(f.a) - y(f.da)), riempi: f.colore, bordo: '@sfondo', spessore: 0.6,
                        titolo: `DPSH ${c.numero} · ${f.nome} · ${f.da.toFixed(2)}–${f.a.toFixed(2)} m`
                    }));
                });

                legendaRighe.forEach((riga, r) => {
                    const yy = H - legendaH + fs * 0.8 + r * fs * 1.8;
                    riga.forEach(({ s, x: xx }) => {
                        el.push({ t: 'rett', x: xx, y: yy, w: fs, h: fs, riempi: s.colore, bordo: '@bordoForte', spessore: 0.6 });
                        testo(xx + fs + 6, yy + fs * 0.85, s.nome, { dim: fs * 0.95, colore: '@testo' });
                    });
                });
                return { W, H, el };
            }

            const TEMA_CONFRONTO_SCHERMO = { testo: 'var(--text-main)', muto: 'var(--text-muted)', bordo: 'var(--border)', bordoForte: 'var(--border-strong)', sfondo: 'var(--bg-card)', font: 'inherit', mono: 'var(--font-mono)' };
            // Nei file non ci sono le variabili dell'app: colori veri, fondo bianco, un carattere che ogni
            // programma ha (lo stesso Helvetica del PDF, così SVG, PNG e PDF si somigliano).
            const TEMA_CONFRONTO_FILE = { testo: '#0f172a', muto: '#475569', bordo: '#cbd5e1', bordoForte: '#64748b', sfondo: '#ffffff', font: 'Helvetica, Arial, sans-serif', mono: 'Helvetica, Arial, sans-serif', fondoPieno: true };

            function svgDaDisegno(dis, tema, attributi) {
                const c = v => (v && v[0] === '@') ? tema[v.slice(1)] : testoSicuro(v);
                const n = v => String(Math.round(v * 100) / 100);
                let s = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dis.W} ${dis.H}" width="${dis.W}" height="${dis.H}" font-family="${tema.font}"${attributi || ''}>`;
                if (tema.fondoPieno) s += `<rect x="0" y="0" width="${dis.W}" height="${dis.H}" fill="${tema.sfondo}"/>`;
                dis.el.forEach(e => {
                    const titolo = e.titolo ? `<title>${testoSicuro(e.titolo)}</title>` : '';
                    if (e.t === 'linea') {
                        s += `<line x1="${n(e.x1)}" y1="${n(e.y1)}" x2="${n(e.x2)}" y2="${n(e.y2)}" stroke="${c(e.colore)}" stroke-width="${e.spessore}"${e.tratteggio ? ` stroke-dasharray="${e.tratteggio.join(' ')}"` : ''}/>`;
                    } else if (e.t === 'rett') {
                        s += `<rect x="${n(e.x)}" y="${n(e.y)}" width="${n(e.w)}" height="${n(e.h)}" fill="${c(e.riempi)}" stroke="${c(e.bordo)}" stroke-width="${e.spessore}">${titolo}</rect>`;
                    } else if (e.t === 'percorso') {
                        const dd = e.punti.map(p => (p[2] ? 'M' : 'L') + n(p[0]) + ',' + n(p[1])).join('');
                        s += `<path d="${dd}" fill="none" stroke="${c(e.colore)}" stroke-width="${n(e.spessore)}" stroke-linejoin="round" stroke-linecap="round">${titolo}</path>`;
                    } else if (e.t === 'testo') {
                        s += `<text x="${n(e.x)}" y="${n(e.y)}" font-size="${n(e.dim)}"${e.grassetto ? ' font-weight="700"' : ''}${e.ancora !== 'start' ? ` text-anchor="${e.ancora}"` : ''}${e.mono ? ` font-family="${tema.mono}"` : ''}${e.ruota ? ` transform="rotate(-90 ${n(e.x)} ${n(e.y)})"` : ''} fill="${c(e.colore)}">${testoSicuro(e.testo)}</text>`;
                    }
                });
                return s + '</svg>';
            }

            // Larghezze dei caratteri da 32 a 126 (millesimi del corpo) di Helvetica e Helvetica-Bold, i
            // due caratteri standard del PDF: servono per centrare e allineare a destra i testi.
            const LARGHEZZE_HELVETICA = [278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584];
            const LARGHEZZE_HELVETICA_BOLD = [278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584];
            const WINANSI_EXTRA = { '€': 0x80, '‚': 0x82, '„': 0x84, '…': 0x85, '‘': 0x91, '’': 0x92, '“': 0x93, '”': 0x94, '•': 0x95, '–': 0x96, '—': 0x97 };

            /** Un testo nella codifica WinAnsi dei caratteri standard: un byte per carattere (accentate,
             * «²», «·» e «–» comprese); quello che non c'è diventa «?». */
            function testoWinAnsi(t) {
                return Array.from(String(t)).map(ch => {
                    const k = ch.charCodeAt(0);
                    if ((k >= 32 && k < 127) || (k >= 160 && k < 256)) return String.fromCharCode(k);
                    return WINANSI_EXTRA[ch] ? String.fromCharCode(WINANSI_EXTRA[ch]) : '?';
                }).join('');
            }

            function larghezzaTestoPdf(t, grassetto) {
                const tabella = grassetto ? LARGHEZZE_HELVETICA_BOLD : LARGHEZZE_HELVETICA;
                let somma = 0;
                for (const ch of t) {
                    const k = ch.charCodeAt(0);
                    somma += (k >= 32 && k <= 126) ? tabella[k - 32] : 556;
                }
                return somma / 1000;
            }

            function coloreRgbPdf(v) {
                const s = String(v || '').trim();
                let m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
                if (m) {
                    const h = m[1].length === 3 ? m[1].split('').map(ch => ch + ch).join('') : m[1];
                    return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
                }
                m = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(s);
                if (m) return [m[1], m[2], m[3]].map(k => Math.min(255, parseFloat(k)) / 255);
                return [0.58, 0.64, 0.72];
            }

            /** Il PDF della figura, vettoriale, su un foglio A4 (orizzontale se la figura è larga), scritto
             * a mano: una pagina, i due Helvetica standard, nessuna libreria. Ritorna una stringa di byte. */
            function pdfDaDisegno(dis, tema, titolo) {
                const ruota = dis.W >= dis.H;
                const pw = ruota ? 841.89 : 595.28, ph = ruota ? 595.28 : 841.89, margine = 28;
                const k = Math.min((pw - 2 * margine) / dis.W, (ph - 2 * margine) / dis.H);
                const n = v => String(Math.round(v * 1000) / 1000);
                const c = v => coloreRgbPdf((v && v[0] === '@') ? tema[v.slice(1)] : v).map(n).join(' ');
                const stringa = t => '(' + testoWinAnsi(t).replace(/[\\()]/g, ch => '\\' + ch) + ')';
                // Da qui in poi si disegna nelle coordinate della figura (y verso il basso): la matrice
                // capovolge e scala una volta sola, i testi si raddrizzano con la loro matrice.
                const op = [`q ${n(k)} 0 0 ${n(-k)} ${n((pw - dis.W * k) / 2)} ${n(ph - (ph - dis.H * k) / 2)} cm 1 j 1 J`];
                if (tema.fondoPieno) op.push(`${c('@sfondo')} rg 0 0 ${dis.W} ${dis.H} re f`);
                dis.el.forEach(e => {
                    if (e.t === 'linea') {
                        op.push(`${c(e.colore)} RG ${n(e.spessore)} w [${e.tratteggio ? e.tratteggio.join(' ') : ''}] 0 d ${n(e.x1)} ${n(e.y1)} m ${n(e.x2)} ${n(e.y2)} l S`);
                    } else if (e.t === 'rett') {
                        op.push(`${c(e.riempi)} rg ${c(e.bordo)} RG ${n(e.spessore)} w [] 0 d ${n(e.x)} ${n(e.y)} ${n(e.w)} ${n(e.h)} re B`);
                    } else if (e.t === 'percorso') {
                        op.push(`${c(e.colore)} RG ${n(e.spessore)} w [] 0 d ` + e.punti.map(p => `${n(p[0])} ${n(p[1])} ${p[2] ? 'm' : 'l'}`).join(' ') + ' S');
                    } else if (e.t === 'testo') {
                        const sposta = e.ancora === 'middle' ? 0.5 : (e.ancora === 'end' ? 1 : 0);
                        const dx = -sposta * larghezzaTestoPdf(testoWinAnsi(e.testo), e.grassetto) * e.dim;
                        // Matrice del testo: dritta [1 0 0 -1], ruotata di 90° in senso antiorario [0 -1 -1 0].
                        const tm = e.ruota ? `0 -1 -1 0 ${n(e.x)} ${n(e.y - dx)}` : `1 0 0 -1 ${n(e.x + dx)} ${n(e.y)}`;
                        op.push(`BT ${c(e.colore)} rg /${e.grassetto ? 'F2' : 'F1'} ${n(e.dim)} Tf ${tm} Tm ${stringa(e.testo)} Tj ET`);
                    }
                });
                op.push('Q');
                const flusso = op.join('\n');
                const oggetti = [
                    '<< /Type /Catalog /Pages 2 0 R >>',
                    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
                    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pw} ${ph}] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>`,
                    `<< /Length ${flusso.length} >>\nstream\n${flusso}\nendstream`,
                    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
                    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
                    `<< /Title ${stringa(titolo || 'Confronto prove')} /Producer (DPSH Field Collector) >>`
                ];
                let pdf = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
                const posizioni = oggetti.map((o, i) => { const p = pdf.length; pdf += `${i + 1} 0 obj\n${o}\nendobj\n`; return p; });
                const xref = pdf.length;
                pdf += `xref\n0 ${oggetti.length + 1}\n0000000000 65535 f \n` + posizioni.map(p => String(p).padStart(10, '0') + ' 00000 n \n').join('');
                pdf += `trailer\n<< /Size ${oggetti.length + 1} /Root 1 0 R /Info 7 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
                return pdf;
            }

            function renderConfrontoProve() {
                const proj = state.projects && state.projects[confrontoStato.projId];
                const boxGrafico = document.getElementById('confrontoGrafico');
                if (!proj || !boxGrafico) return;
                const prove = proveConfrontabili(proj);
                const d = datiConfronto(proj, prove, confrontoStato.attive, confrontoStato.grandezza);
                const titolo = document.getElementById('lblConfrontoTitolo');
                if (titolo) titolo.textContent = 'Confronta prove · ' + d.titolo;

                const boxGrandezza = document.getElementById('confrontoGrandezza');
                if (boxGrandezza) {
                    boxGrandezza.innerHTML = [['colpi', 'Colpi N'], ['rpd', 'Rpd (kg/cm²)']].map(([id, nome]) => {
                        const attivo = confrontoStato.grandezza === id;
                        const aspetto = attivo
                            ? 'background: var(--accent); color: var(--on-accent); border: 1px solid var(--accent);'
                            : 'background: var(--bg-card); color: var(--text-main); border: 1px solid var(--border);';
                        return `<button type="button" data-grandezza="${id}" aria-pressed="${attivo}" style="padding: 6px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; ${aspetto}">${nome}</button>`;
                    }).join('');
                    boxGrandezza.querySelectorAll('[data-grandezza]').forEach(b => b.addEventListener('click', () => {
                        confrontoStato.grandezza = b.getAttribute('data-grandezza');
                        renderConfrontoProve();
                    }));
                }

                const boxProve = document.getElementById('confrontoProve');
                if (boxProve) {
                    boxProve.innerHTML = prove.map(s => {
                        const attiva = confrontoStato.attive.has(s.id);
                        const c = d.colore.get(s.id);
                        return `<button type="button" data-prova="${s.id}" aria-pressed="${attiva}" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; cursor: pointer; background: ${attiva ? 'var(--bg-card)' : 'transparent'}; color: ${attiva ? 'var(--text-main)' : 'var(--text-muted)'}; border: 1.5px solid ${attiva ? c : 'var(--border)'};"><span style="width: 10px; height: 10px; border-radius: 50%; box-sizing: border-box; background: ${attiva ? c : 'transparent'}; border: 2px solid ${c};"></span>DPSH ${testoSicuro((s.header && s.header.provaNr) || '?')}</button>`;
                    }).join('');
                    boxProve.querySelectorAll('[data-prova]').forEach(b => b.addEventListener('click', () => {
                        const id = b.getAttribute('data-prova');
                        if (confrontoStato.attive.has(id)) {
                            if (confrontoStato.attive.size > 1) confrontoStato.attive.delete(id);
                        } else {
                            confrontoStato.attive.add(id);
                        }
                        renderConfrontoProve();
                    }));
                }

                // La legenda prima della figura: la sua altezza serve a misurare quanto spazio resta.
                const legenda = document.getElementById('confrontoLegendaStrati');
                if (legenda) {
                    legenda.innerHTML = d.strati.map(f =>
                        `<span style="display: inline-flex; align-items: center; gap: 5px;"><span style="width: 12px; height: 12px; border-radius: 3px; background: ${testoSicuro(f.colore)}; border: 1px solid var(--border);"></span>${testoSicuro(f.nome)}</span>`
                    ).join('');
                }
                // La figura riempie la finestra: tutta la larghezza, e in altezza quello che resta sotto
                // i comandi e sopra la legenda (mai meno di 360 px: sotto, meglio scorrere).
                const finestra = document.getElementById('modalConfrontoProve');
                const alto = window.innerHeight * (window.innerWidth <= 760 ? 0.92 : 0.96);
                const occupato = (boxGrafico.offsetTop || 230) + (legenda ? legenda.offsetHeight + 10 : 0) + 30;
                const dis = disegnoConfronto(d, {
                    larghezza: boxGrafico.clientWidth || (finestra && finestra.clientWidth - 40) || Math.round(window.innerWidth * 0.9),
                    altezza: Math.max(360, Math.round(alto - occupato)),
                    fs: 12
                });
                boxGrafico.innerHTML = svgDaDisegno(dis, TEMA_CONFRONTO_SCHERMO, ' style="display: block; margin: 0 auto;" role="img" aria-label="Confronto tra prove per profondità"');
            }

            /** La figura per un file: quello che si vede ora (grandezza e prove accese), su fondo bianco,
             * col titolo e la legenda degli strati dentro. Proporzioni di un A4 orizzontale; con molte
             * prove si stringono le colonne, non si allarga il foglio (il testo resterebbe minuscolo). */
            function disegnoConfrontoPerFile() {
                const proj = state.projects && state.projects[confrontoStato.projId];
                if (!proj) return null;
                const d = datiConfronto(proj, proveConfrontabili(proj), confrontoStato.attive, confrontoStato.grandezza);
                return { d, dis: disegnoConfronto(d, { larghezza: 1400, altezza: 990, fs: 14, perFile: true, data: new Date().toLocaleDateString('it-IT') }) };
            }

            async function scaricaConfronto(formato) {
                const figura = disegnoConfrontoPerFile();
                if (!figura) return;
                const { d, dis } = figura;
                const nome = `Confronto_${String(d.titolo).replace(/[^\w\-]+/g, '_')}_${d.grandezza === 'rpd' ? 'Rpd' : 'Colpi'}`;
                try {
                    if (formato === 'pdf') {
                        const byte = pdfDaDisegno(dis, TEMA_CONFRONTO_FILE, 'Confronto prove · ' + d.titolo);
                        scaricaBlobFile(new Blob([Uint8Array.from(byte, ch => ch.charCodeAt(0))], { type: 'application/pdf' }), nome + '.pdf');
                        return;
                    }
                    const testo = svgDaDisegno(dis, TEMA_CONFRONTO_FILE);
                    if (formato === 'svg') {
                        scaricaBlobFile(new Blob([testo], { type: 'image/svg+xml' }), nome + '.svg');
                        return;
                    }
                    // PNG: l'SVG disegnato su una tela al doppio della risoluzione, per la stampa.
                    const img = new Image();
                    await new Promise((ok, ko) => { img.onload = ok; img.onerror = () => ko(new Error('immagine non leggibile')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(testo); });
                    const tela = document.createElement('canvas');
                    tela.width = dis.W * 2; tela.height = dis.H * 2;
                    const ctx = tela.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, tela.width, tela.height);
                    ctx.drawImage(img, 0, 0, tela.width, tela.height);
                    const blob = await new Promise(ok => tela.toBlob(ok, 'image/png'));
                    if (!blob) throw new Error('il browser non ha prodotto il PNG');
                    scaricaBlobFile(blob, nome + '.png');
                } catch (e) {
                    appAlert('Non è stato possibile esportare la figura: ' + e.message);
                }
            }

            const btnProjActConfronta = document.getElementById('btnProjActConfronta');
            if (btnProjActConfronta) btnProjActConfronta.addEventListener('click', () => {
                if (!projectActionsContext) return;
                const { projId } = projectActionsContext;
                closeProjectActionsModal();
                apriConfrontoProve(projId);
            });
            const btnCloseConfrontoX = document.getElementById('btnCloseConfrontoX');
            if (btnCloseConfrontoX) btnCloseConfrontoX.addEventListener('click', chiudiConfrontoProve);
            const modalConfrontoProveOverlay = document.getElementById('modalConfrontoProveOverlay');
            if (modalConfrontoProveOverlay) modalConfrontoProveOverlay.addEventListener('click', chiudiConfrontoProve);
            document.querySelectorAll('#modalConfrontoProve [data-formato]').forEach(b => b.addEventListener('click', () => scaricaConfronto(b.getAttribute('data-formato'))));
            let attesaConfronto = false;
            window.addEventListener('resize', () => {
                const finestra = document.getElementById('modalConfrontoProve');
                if (attesaConfronto || !finestra || !finestra.classList.contains('open')) return;
                attesaConfronto = true;
                requestAnimationFrame(() => { attesaConfronto = false; renderConfrontoProve(); });
            });


            /** Aggiorna la sezione "Spazio occupato" del menu. Gli elementi possono non esistere
             * (drawer mai aperto): in quel caso non fa nulla, come il resto dell'app. */
            let spazioUltimoCalcolo = null;
            async function aggiornaPannelloSpazio() {
                const elRiepilogo = document.getElementById('spazioRiepilogo');
                const elBarra = document.getElementById('spazioBarra');
                const elDettaglio = document.getElementById('spazioDettaglio');
                const btnOrfane = document.getElementById('btnSpazioPulisciOrfane');
                aggiornaRiepilogoCopieEBackup();
                if (!elRiepilogo) return;
                elRiepilogo.textContent = 'Calcolo in corso…';
                const s = await calcolaSpazioOccupato();
                spazioUltimoCalcolo = s;

                if (s.stimaDisponibile && s.quota > 0) {
                    const pct = Math.min(100, (s.usato / s.quota) * 100);
                    elRiepilogo.innerHTML = `<strong>${formattaByte(s.usato)}</strong> usati su <strong>${formattaByte(s.quota)}</strong> concessi all'app (${pct.toFixed(1)}%).`;
                    if (elBarra) {
                        elBarra.style.width = `${Math.max(pct, 1)}%`;
                        // Il colore cambia solo quando c'è davvero da preoccuparsi: una barra sempre
                        // allarmata è una barra che si smette di guardare.
                        elBarra.style.background = pct >= 90 ? 'var(--danger)' : (pct >= 70 ? 'var(--warning, #f59e0b)' : 'var(--accent)');
                    }
                } else {
                    // Alcuni browser (e certe WebView dentro un APK) non espongono la stima: meglio
                    // dirlo che mostrare uno zero che sembrerebbe "non stai occupando niente".
                    elRiepilogo.innerHTML = 'Questo dispositivo non comunica lo spazio totale disponibile. Qui sotto trovi comunque quanto occupano i tuoi dati.';
                    if (elBarra) elBarra.style.width = '0%';
                }

                if (elDettaglio) {
                    elDettaglio.innerHTML = [
                        `Progetti, prove e template: <strong>${formattaByte(s.localStorageBytes)}</strong>`,
                        `Foto: <strong>${formattaByte(s.fotoBytes)}</strong> (${s.fotoCount})`,
                        s.noteCount > 0 ? `Immagini nelle note: <strong>${formattaByte(s.noteBytes)}</strong> (${s.noteCount})` : '',
                        copieAutomatiche.indice.length > 0 ? `Copie automatiche: <strong>${formattaByte(copieAutomatiche.indice.reduce((n, v) => n + (v.byte || 0), 0))}</strong> (${copieAutomatiche.indice.length})` : '',
                        s.orfaneCount > 0
                            ? `<span style="color:var(--danger); font-weight:700;">Recuperabili: ${formattaByte(s.orfaneBytes)} in ${s.orfaneCount} immagini di progetti eliminati</span>`
                            : `<span style="color:var(--success);">✓ Nessuna immagine da recuperare</span>`
                    ].filter(Boolean).join('<br>');
                }
                if (btnOrfane) {
                    btnOrfane.disabled = s.orfaneCount === 0;
                    btnOrfane.style.opacity = s.orfaneCount === 0 ? '0.5' : '1';
                    btnOrfane.innerHTML = s.orfaneCount > 0
                        ? `<svg class="ico"><use href="#i-trash"/></svg> Recupera ${formattaByte(s.orfaneBytes)}`
                        : `<svg class="ico"><use href="#i-trash"/></svg> Foto orfane`;
                }
            }

            const btnSpazioRicalcola = document.getElementById('btnSpazioRicalcola');
            if (btnSpazioRicalcola) btnSpazioRicalcola.addEventListener('click', aggiornaPannelloSpazio);
            const btnSpazioPulisciOrfane = document.getElementById('btnSpazioPulisciOrfane');
            if (btnSpazioPulisciOrfane) {
                btnSpazioPulisciOrfane.addEventListener('click', async () => {
                    const s = spazioUltimoCalcolo;
                    if (!s || s.orfaneCount === 0) { await aggiornaPannelloSpazio(); return; }
                    const ok = await appConfirmDelete(
                        `Eliminare definitivamente ${s.orfaneCount} immagini rimaste da progetti già cancellati?\n\nRecuperi circa ${formattaByte(s.orfaneBytes)}.\n\nNessuna prova o nota ancora esistente le usa: non stai perdendo niente di visibile nell'app.`
                    );
                    if (!ok) return;
                    const eliminate = await eliminaFotoOrfane(s.orfaneFotoIds, s.orfaneNoteIds);
                    await aggiornaPannelloSpazio();
                    mostraToast(eliminate === 1 ? 'Rimossa 1 immagine non più utilizzata' : `Rimosse ${eliminate} immagini non più utilizzate`);
                });
            }

            // PROVA A VUOTO DELLA MIGRAZIONE NOTE. Legge, converte in memoria, confronta, e
            // riferisce. Non scrive niente: se il referto è pulito si può passare alla libreria,
            // se non lo è si aggiusta il convertitore PRIMA di toccare una nota vera.
            const btnDiagnosticaNote = document.getElementById('btnDiagnosticaNote');
            if (btnDiagnosticaNote) {
                btnDiagnosticaNote.addEventListener('click', () => {
                    const r = diagnosticaMigrazioneNote();
                    if (r.conNote === 0) {
                        appAlert(`Nessuna nota da controllare: ${r.progetti} progetti, nessuno con appunti scritti.`);
                        return;
                    }
                    const righe = [
                        `Progetti con note: ${r.conNote} su ${r.progetti}`,
                        `Testo complessivo: ${(r.caratteri / 1024).toFixed(1)} KB`,
                        '',
                        r.conPerdite.length === 0
                            ? `Conversione senza perdite su tutte e ${r.senzaPerdite} le note.`
                            : `${r.conPerdite.length} note perderebbero qualcosa:`
                    ];
                    r.conPerdite.slice(0, 6).forEach(p => righe.push(`• ${p.progetto}: ${p.perdite.join('; ')}`));
                    if (r.conPerdite.length > 6) righe.push(`…e altre ${r.conPerdite.length - 6}.`);
                    // Le costruzioni MAI VISTE sono il dato più prezioso del referto: sono
                    // esattamente quelle che una libreria butterebbe senza dire niente.
                    const s2 = r.sconosciuti;
                    if (s2.tag.length || s2.classi.length || s2.attributi.length) {
                        righe.push('', 'Costruzioni fuori dal vocabolario previsto:');
                        if (s2.tag.length) righe.push(`• tag: ${s2.tag.join(', ')}`);
                        if (s2.classi.length) righe.push(`• classi: ${s2.classi.join(', ')}`);
                        if (s2.attributi.length) righe.push(`• attributi: ${s2.attributi.join(', ')}`);
                    } else {
                        righe.push('', 'Nessuna costruzione fuori dal vocabolario previsto.');
                    }
                    righe.push('', 'Nessuna nota è stata modificata: questa è solo una prova.');
                    appAlert(righe.join('\n'));
                });
            }

            /** Avvisa UNA VOLTA SOLA delle foto che non è stato possibile salvare e offre di
             * scaricarle subito sul telefono (finiscono in Download, come già fa "Scarica foto
             * JPG"). È la rete di sicurezza: la foto è ancora in RAM, quindi finché l'app è aperta
             * si può ancora mettere al riparo — chiudere l'app senza farlo la perderebbe. */
            async function avvisaFotoNonSalvate(fallite) {
                if (!Array.isArray(fallite) || fallite.length === 0) return;
                const quante = fallite.length;
                const testo = quante === 1
                    ? 'Non è stato possibile salvare una foto nella memoria dell\'app (spazio esaurito o memoria non disponibile).\n\nLa foto è ancora aperta in questo momento, ma chiudendo l\'app andrebbe persa.\n\nVuoi salvarla subito nei Download del telefono?'
                    : `Non è stato possibile salvare ${quante} foto nella memoria dell'app (spazio esaurito o memoria non disponibile).\n\nLe foto sono ancora aperte in questo momento, ma chiudendo l'app andrebbero perse.\n\nVuoi salvarle subito nei Download del telefono?`;
                const ok = await appConfirm(testo);
                if (!ok) return;
                fallite.forEach((f, i) => {
                    if (!f || !f.dataUrl) return;
                    const a = document.createElement('a');
                    a.href = f.dataUrl;
                    a.download = `${(f.nome || 'Foto_recuperata_' + (i + 1)).replace(/[\\/:*?"<>|]/g, '_')}.jpg`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                });
            }

            /** Legge una foto da IndexedDB. Ritorna null sia se la foto non c'è, sia se non è stato
             * possibile leggerla: il contratto resta quello di prima (una decina di chiamanti fanno
             * `|| ''`), ma i due casi non sono più indistinguibili nei log. Prima il ramo d'errore
             * era un `catch { return null }` muto: una foto illeggibile diventava un riquadro vuoto
             * nel PDF senza lasciare alcuna traccia del perché, e sembrava non fosse mai stata
             * scattata. Ora nella console resta scritto quale id ha fallito e per quale motivo. */
            async function getPhotoFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return await new Promise((resolve) => {
                        const tx = db.transaction(STORE_NAME, 'readonly');
                        const store = tx.objectStore(STORE_NAME);
                        const req = store.get(id);
                        req.onsuccess = () => resolve(req.result ? req.result.dataUrl : null);
                        req.onerror = () => { console.warn('IDB: foto presente ma NON LEGGIBILE, id =', id, req.error); resolve(null); };
                    });
                } catch(e) {
                    console.warn('IDB: lettura foto non riuscita, id =', id, e);
                    return null;
                }
            }

            async function deletePhotoFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NAME, 'readwrite');
                        const store = tx.objectStore(STORE_NAME);
                        store.delete(id);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch (e) { ignoraErrore('deletePhotoFromIDB', e); }
            }

            // Stesse funzioni ma sullo store 'noteImages', per le immagini incorporate nelle
            // Note di progetto (stesso DB, stesso motivo: restare sotto il limite di localStorage).
            async function saveNoteImageToIDB(id, dataUrl) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readwrite');
                        tx.objectStore(STORE_NOTE_IMAGES).put({ id, dataUrl });
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch(e) {
                    console.warn('IDB Save error (noteImages):', e);
                }
            }
            async function getNoteImageFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readonly');
                        const req = tx.objectStore(STORE_NOTE_IMAGES).get(id);
                        req.onsuccess = (e) => resolve(req.result ? req.result.dataUrl : null);
                        req.onerror = (e) => reject(e.target.error);
                    });
                } catch(e) {
                    return null;
                }
            }
            async function deleteNoteImageFromIDB(id) {
                try {
                    const db = await openPhotoDB();
                    return new Promise((resolve, reject) => {
                        const tx = db.transaction(STORE_NOTE_IMAGES, 'readwrite');
                        tx.objectStore(STORE_NOTE_IMAGES).delete(id);
                        tx.oncomplete = () => resolve(true);
                        tx.onerror = (e) => reject(e.target.error);
                    });
                } catch (e) { ignoraErrore('deleteNoteImageFromIDB', e); }
            }

