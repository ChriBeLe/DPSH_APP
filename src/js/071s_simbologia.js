            // ===================== LA SIMBOLOGIA DEI LIVELLI (come in QGIS) =====================
            // Ogni livello di punti (le prove, i punti disegnati) ha un simbolo: la forma, il riempimento, il
            // contorno e il suo spessore, la grandezza; ogni livello ha le etichette: grandezza, colore, alone,
            // posizione, grassetto. Le forme sono quelle di QGIS (stesse proporzioni: size/2 per lato), così il
            // GeoPackage e il KMZ esportati si vedono come nell'app. Le misure sono in pixel dello schermo.

            /** Le forme: punti (in unità di size/2, y in giù) come lo «Simple marker» di QGIS. La punta in giù
             * è il triangolo di QGIS girato di 180° e spostato in su di mezzo size: la punta sta sul punto. */
            const SIMBOLI_PUNTO = {
                'triangolo-giu': { nome: 'Triangolo, punta sul punto', qgis: 'triangle', angolo: 180, suPunta: true, punti: [[-1, -2], [1, -2], [0, 0]] },
                triangolo: { nome: 'Triangolo', qgis: 'triangle', punti: [[0, -1], [1, 1], [-1, 1]] },
                cerchio: { nome: 'Cerchio', qgis: 'circle', cerchio: true },
                quadrato: { nome: 'Quadrato', qgis: 'square', punti: [[-1, -1], [1, -1], [1, 1], [-1, 1]] },
                rombo: { nome: 'Rombo', qgis: 'diamond', punti: [[0, -1], [1, 0], [0, 1], [-1, 0]] },
                pentagono: { nome: 'Pentagono', qgis: 'pentagon', punti: [0, 1, 2, 3, 4].map(i => [Math.sin(i * 2 * Math.PI / 5), -Math.cos(i * 2 * Math.PI / 5)]) },
                esagono: { nome: 'Esagono', qgis: 'hexagon', punti: [0, 1, 2, 3, 4, 5].map(i => [Math.sin(i * Math.PI / 3), -Math.cos(i * Math.PI / 3)]) },
                stella: { nome: 'Stella', qgis: 'star', punti: Array.from({ length: 10 }, (_, i) => { const r = i % 2 ? 0.382 : 1, a = i * Math.PI / 5; return [r * Math.sin(a), -r * Math.cos(a)]; }) },
                croce: { nome: 'Croce', qgis: 'cross', linee: [[[0, -1], [0, 1]], [[-1, 0], [1, 0]]] },
                x: { nome: 'X', qgis: 'cross2', linee: [[[-1, -1], [1, 1]], [[-1, 1], [1, -1]]] }
            };
            const BASE_SIMBOLO = 16; // px: «dimensione» 1
            /** Quanto è grande il simbolo (px) e dove sta rispetto al punto: in su, in giù, di lato. */
            function ingombroSimbolo(st) {
                const S = BASE_SIMBOLO * (st.dimensione || 1), f = SIMBOLI_PUNTO[st.simbolo] || SIMBOLI_PUNTO.cerchio;
                return f.suPunta ? { S, sopra: S, sotto: 0, lato: S / 2 } : { S, sopra: S / 2, sotto: S / 2, lato: S / 2 };
            }
            /** Il simbolo in SVG, col punto in (cx, cy). */
            function svgFormaSimbolo(st, cx, cy, scala) {
                const f = SIMBOLI_PUNTO[st.simbolo] || SIMBOLI_PUNTO.cerchio, k = scala || 1, S = BASE_SIMBOLO * (st.dimensione || 1) * k, r = S / 2;
                const fill = st.colore || '#dc2626', stroke = st.contorno || 'none', sw = (st.spessore ?? 1.5) * k;
                const tratto = stroke === 'none' || !sw ? 'stroke="none"' : `stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"`;
                if (f.cerchio) return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" ${tratto}/>`;
                if (f.linee) return f.linee.map(([a, b]) => `<line x1="${cx + a[0] * r}" y1="${cy + a[1] * r}" x2="${cx + b[0] * r}" y2="${cy + b[1] * r}" stroke="${fill}" stroke-width="${Math.max(2, sw * 1.6)}" stroke-linecap="round"/>`).join('');
                return `<polygon points="${f.punti.map(([x, y]) => `${(cx + x * r).toFixed(2)},${(cy + y * r).toFixed(2)}`).join(' ')}" fill="${fill}" ${tratto}/>`;
            }
            /** Il simbolo da solo, in un riquadro (per l'editor dello stile e i Livelli). */
            function svgSimboloRiquadro(st, lato) {
                const ig = ingombroSimbolo(st), m = 3, L = lato || Math.ceil(ig.S + 2 * m + 2 * (st.spessore ?? 1.5));
                const k = Math.min(1, (L - 2 * m) / (ig.S + 2 * (st.spessore ?? 1.5))), cy = L / 2 + (ig.sopra - ig.sotto) / 2 * k;
                return `<svg width="${L}" height="${L}" viewBox="0 0 ${L} ${L}" aria-hidden="true">${svgFormaSimbolo(st, L / 2, cy, k)}</svg>`;
            }
            /** L'etichetta: lo stile CSS (grandezza, colore, grassetto, alone fatto di ombre). */
            function cssEtichetta(st, dimDefault) {
                const px = st.etichettaDimensione || dimDefault || 12, alone = st.etichettaAlone;
                const ombre = alone ? [[-1, -1], [1, -1], [-1, 1], [1, 1], [0, -1.4], [0, 1.4], [-1.4, 0], [1.4, 0]].map(([x, y]) => `${x}px ${y}px 0 ${alone}`).join(',') : 'none';
                return `font-size:${px}px;color:${st.etichettaColore || '#ffffff'};font-weight:${st.etichettaGrassetto === false ? 500 : 800};text-shadow:${ombre}`;
            }
            /** Dove sta l'etichetta rispetto al punto (px), secondo la posizione e il simbolo. */
            function postoEtichetta(st, pos) {
                const ig = ingombroSimbolo(st), g = 3;
                return {
                    sopra: { x: 0, y: -(ig.sopra + g), tx: '-50%', ty: '-100%' }, sotto: { x: 0, y: ig.sotto + g, tx: '-50%', ty: '0' },
                    destra: { x: ig.lato + g, y: -(ig.sopra - ig.sotto) / 2, tx: '0', ty: '-50%' }, sinistra: { x: -(ig.lato + g), y: -(ig.sopra - ig.sotto) / 2, tx: '-100%', ty: '-50%' },
                    centro: { x: 0, y: -(ig.sopra - ig.sotto) / 2, tx: '-50%', ty: '-50%' }
                }[pos || st.etichettaPosizione || 'sopra'];
            }
            /** Il segnaposto di un punto sulla mappa 2D: simbolo e (se c'è) etichetta, col punto nell'origine. */
            function iconaSimbolo2d(st, testo, extra) {
                const ig = ingombroSimbolo(st), pad = 2 + (st.spessore ?? 1.5), w = ig.S + 2 * pad, h = ig.sopra + ig.sotto + 2 * pad;
                const svg = `<svg class="sim-forma" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="left:${-w / 2}px;top:${-(ig.sopra + pad)}px">${svgFormaSimbolo(st, w / 2, ig.sopra + pad)}</svg>`;
                const p = testo ? postoEtichetta(st) : null, esc = escapeHtmlDidascalia;
                const et = testo ? `<span class="sim-et et-${st.etichetta || 'testo'}" style="left:${p.x}px;top:${p.y}px;transform:translate(${p.tx},${p.ty});${cssEtichetta(st)}">${esc(testo)}</span>` : '';
                return L.divIcon({ className: 'sim-icona' + (extra ? ' ' + extra : ''), html: svg + et, iconSize: [0, 0], iconAnchor: [0, 0] });
            }
