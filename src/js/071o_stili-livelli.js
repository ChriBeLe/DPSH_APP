            // ---- LO STILE DI OGNI LIVELLO (come «Stile…» di HyperGram): colore, contorno, riempimento e la sua
            // trasparenza, spessore, tratto, dimensione, etichette. Un pannellino accanto al clic, non una
            // finestra: le modifiche si vedono subito; «Annulla» (o Esc) torna a com'era, un clic fuori le
            // tiene, «Di base» rimette lo stile di partenza. Vale per mappa 2D, 3D, PDF e GeoPackage; resta nel
            // progetto. Chiavi: 'prove', 'falda', 'pannelli', 'superfici', 'giaciture', 'misure', 't:<traccia>',
            // 'd:<disegno>'. Il colore degli strati no: viene dai dati del progetto. ----
            // Le etichette (tutti i livelli che ne hanno): grandezza, colore, alone, posizione, grassetto, riquadro.
            const CAMPI_ETICHETTA = ['etichettaDimensione', 'etichettaColore', 'etichettaAlone', 'etichettaPosizione', 'etichettaGrassetto', 'etichetta'];
            const etichettaDi = (px, pos) => ({ etichettaDimensione: px, etichettaColore: '#ffffff', etichettaAlone: '#111827', etichettaPosizione: pos, etichettaGrassetto: true, etichetta: 'testo' });
            const STILI_LIVELLO = {
                // le prove: di base un triangolo rosso con la punta sul punto, il nome («DPSH 1») sopra
                prove: { campi: ['simbolo', 'colore', 'contorno', 'spessore', 'dimensione', ...CAMPI_ETICHETTA], def: () => ({ simbolo: 'triangolo-giu', colore: '#dc2626', contorno: '#ffffff', spessore: 1.5, dimensione: 1.15, ...etichettaDi(12, 'sopra') }) },
                traccia: { campi: ['colore', 'spessore', 'tratto', ...CAMPI_ETICHETTA.filter(c => c !== 'etichettaPosizione')], def: () => ({ colore: '#ef4444', spessore: 4, tratto: 'continuo', ...etichettaDi(14, 'sopra'), etichettaAlone: '#000000' }) },
                disegno: { campi: ['colore', 'riempimento', 'opacita', 'contorno', 'spessore', 'tratto', 'dimensione', 'etichetta'], def: () => ({ simbolo: 'cerchio', colore: '#f59e0b', riempimento: '', opacita: 0.22, contorno: '#111827', spessore: 2.5, tratto: 'continuo', dimensione: 1, ...etichettaDi(12, 'destra') }) },
                falda: { campi: ['colore', 'riempimento', 'opacita', 'spessore', 'tratto'], def: () => ({ colore: '#0284c7', riempimento: '#38bdf8', opacita: 0.35, spessore: 3, tratto: 'continuo' }) },
                pannelli: { campi: ['contorno', 'opacita', 'spessore'], def: () => ({ contorno: '', opacita: 0.55, spessore: 0.6 }) },
                superfici: { campi: ['contorno', 'opacita', 'spessore', 'tratto'], def: () => ({ contorno: '', opacita: 0.35, spessore: 1, tratto: 'tratteggiato' }) },
                giaciture: { campi: ['spessore', 'dimensione'], def: () => ({ spessore: 2.6, dimensione: 1 }) },
                misure: { campi: ['colore', 'spessore'], def: () => ({ colore: '', spessore: 1.5 }) }
            };
            const tipoStile = k => (k.startsWith('t:') ? 'traccia' : k.startsWith('d:') ? 'disegno' : STILI_LIVELLO[k] ? k : null);
            /** Lo stile di un livello: quello di base del suo tipo con sopra le scelte salvate nel progetto. */
            function stileLivello(k) {
                const tipo = tipoStile(k), proj = state.projects[state.currentProjectId], def = STILI_LIVELLO[tipo].def();
                // il disegno ha già il suo colore (dato alla nascita)
                if (tipo === 'disegno') { const x = disegniDelProgetto().find(y => 'd:' + y.id === k); if (x) { def.colore = x.colore; if (x.tipo === 'punto') Object.assign(def, { contorno: '#ffffff', spessore: 1.5 }); else def.etichettaPosizione = 'centro'; } }
                return Object.assign(def, (proj && proj.stili && proj.stili[k]) || {});
            }
            /** I campi del pannellino: un disegno mostra quelli del suo tipo (il punto non ha tratto, il poligono non ha dimensione). */
            function campiStile(k) {
                const tipo = tipoStile(k), x = tipo === 'disegno' && disegniDelProgetto().find(y => 'd:' + y.id === k);
                if (!x) return STILI_LIVELLO[tipo].campi;
                return x.tipo === 'punto' ? ['simbolo', 'colore', 'contorno', 'spessore', 'dimensione', ...CAMPI_ETICHETTA] : ['colore', 'riempimento', 'opacita', 'spessore', 'tratto', ...CAMPI_ETICHETTA.filter(c => c !== 'etichettaPosizione')];
            }
            const trattoDash = (t, k) => (t === 'tratteggiato' ? [8 * (k || 1), 6 * (k || 1)] : t === 'punteggiato' ? [2 * (k || 1), 5 * (k || 1)] : null);
            const trattoLeaflet = (t, k) => { const d = trattoDash(t, k); return d ? d.join(' ') : null; };

            const COLORI_STILE = ['#FFB020', '#FF4FD8', '#EF4444', '#F97316', '#FACC15', '#22C55E', '#3B82F6', '#00E5FF', '#A855F7', '#FFFFFF', '#111111'];
            const NOMI_CAMPI_STILE = { simbolo: 'Simbolo', colore: 'Colore', contorno: 'Contorno', riempimento: 'Riempimento', opacita: 'Trasparenza', spessore: 'Spessore', tratto: 'Tratto', dimensione: 'Dimensione', etichetta: 'Riquadro',
                etichettaDimensione: 'Grandezza', etichettaColore: 'Colore', etichettaAlone: 'Alone', etichettaPosizione: 'Posizione', etichettaGrassetto: 'Carattere' };
            // i cursori: [min, max, passo, come si scrive]
            const CURSORI_STILE = {
                spessore: [0, 8, 0.5, v => numeroConVirgola(v, 1) + ' px'], dimensione: [0.5, 3, 0.05, v => Math.round(BASE_SIMBOLO * v) + ' px'],
                etichettaDimensione: [7, 36, 1, v => v + ' px']
            };
            const SEGMENTI_STILE = {
                tratto: [['continuo', 'Continuo'], ['tratteggiato', 'Tratteggio'], ['punteggiato', 'Punti']],
                etichetta: [['testo', 'Solo testo'], ['sfondo', 'Sfondo'], ['bordo', 'Sfondo e bordo']],
                opacita: [[0, 'Vuoto'], [0.2, '20%'], [0.35, '35%'], [0.55, '55%'], [0.75, '75%'], [1, 'Pieno']],
                etichettaPosizione: [['sopra', 'Sopra'], ['destra', 'Destra'], ['sotto', 'Sotto'], ['sinistra', 'Sinistra'], ['centro', 'Al centro']],
                etichettaGrassetto: [[true, 'Grassetto'], [false, 'Normale']]
            };
            // «Automatico» (il colore di sempre) dove il colore di base non è fisso; «Nessuno» per contorni e riempimenti.
            const VUOTO_STILE = { colore: 'Automatico', contorno: 'Come il colore', riempimento: 'Come il colore', etichettaAlone: 'Nessun alone' };
            let stilePop = null, stileStato = null;
            function salvaStile(k, valori) {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                proj.stili = proj.stili || {};
                if (valori === null) delete proj.stili[k]; else proj.stili[k] = Object.assign(proj.stili[k] || {}, valori);
                if (proj.stili[k] && !Object.keys(proj.stili[k]).length) delete proj.stili[k];
                // il colore di un disegno è anche il suo: elenco, GeoPackage, simbolo nei Livelli
                if (k.startsWith('d:') && valori && valori.colore) { const x = disegniDelProgetto().find(y => 'd:' + y.id === k); if (x) x.colore = valori.colore; }
                saveState();
                disegnaProveMappa();
                renderVista3d();
            }
            function chiudiStileLivello(tieni) {
                if (!stileStato) return;
                if (!tieni) {
                    const proj = state.projects[state.currentProjectId];
                    if (proj) { proj.stili = proj.stili || {}; if (stileStato.prima) proj.stili[stileStato.k] = stileStato.prima; else delete proj.stili[stileStato.k]; }
                    if (stileStato.coloreDisegno) { const x = disegniDelProgetto().find(y => 'd:' + y.id === stileStato.k); if (x) x.colore = stileStato.coloreDisegno; }
                    saveState(); disegnaProveMappa(); renderVista3d();
                }
                stileStato = null;
                stilePop.classList.remove('aperto');
            }
            function apriStileLivello(k, nome, ancora) {
                const tipo = tipoStile(k);
                if (!tipo) return;
                if (!stilePop) {
                    stilePop = document.createElement('div');
                    stilePop.className = 'stile-pop';
                    stilePop.setAttribute('role', 'dialog');
                    document.body.appendChild(stilePop);
                    // un clic fuori chiude tenendo le modifiche; Esc le annulla
                    document.addEventListener('mousedown', (e) => { if (stileStato && !stilePop.contains(e.target)) chiudiStileLivello(true); }, true);
                    document.addEventListener('keydown', (e) => { if (stileStato && e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); chiudiStileLivello(false); } }, true);
                }
                const proj = state.projects[state.currentProjectId], esc = escapeHtmlDidascalia;
                if (!stileStato || stileStato.k !== k) {
                    const x = k.startsWith('d:') && disegniDelProgetto().find(y => 'd:' + y.id === k);
                    stileStato = { k, nome, ancora, prima: proj.stili && proj.stili[k] ? Object.assign({}, proj.stili[k]) : null, coloreDisegno: x ? x.colore : null };
                }
                const s = stileLivello(k), base = STILI_LIVELLO[tipo].def();
                const riga = (campo, html) => `<div class="stile-riga"><span class="stile-nome">${NOMI_CAMPI_STILE[campo]}</span>${html}</div>`;
                const palette = campo => {
                    const v = String(s[campo] || ''), vuoto = base[campo] === '' || (campo !== 'colore' && campo !== 'etichettaColore');
                    const nota = !v || COLORI_STILE.includes(v.toUpperCase());
                    return riga(campo, `<div class="griglia-colori" data-campo="${campo}" role="radiogroup" aria-label="${NOMI_CAMPI_STILE[campo]}">`
                        + (vuoto ? `<button type="button" class="griglia-colore-btn predefinito" data-v="" role="radio" aria-checked="${!v}" title="${VUOTO_STILE[campo]}">A</button>` : '')
                        + COLORI_STILE.map(c => `<button type="button" class="griglia-colore-btn" data-v="${c}" role="radio" aria-checked="${v.toUpperCase() === c}" style="--c:${c}" title="${c}"></button>`).join('')
                        + `<label class="griglia-colore-btn altro" role="radio" aria-checked="${!nota}" title="Altro colore"><input type="color" value="${/^#[0-9a-f]{6}$/i.test(v) ? v : '#a855f7'}" aria-label="Altro colore"></label></div>`);
                };
                const cursore = campo => { const [mn, mx, ps, fmt] = CURSORI_STILE[campo], v = Number(s[campo] ?? mn);
                    return riga(campo, `<span class="stile-cursore"><input type="range" data-campo="${campo}" min="${mn}" max="${mx}" step="${ps}" value="${v}" aria-label="${NOMI_CAMPI_STILE[campo]}"><b>${fmt(v)}</b></span>`); };
                const segmenti = campo => riga(campo, `<div class="stile-seg" data-campo="${campo}">${SEGMENTI_STILE[campo].map(([v, t]) => `<button type="button" data-v="${v}"${String(v) === String(s[campo]) ? ' class="attivo"' : ''}>${t}</button>`).join('')}</div>`);
                // il simbolo: le forme, ciascuna disegnata coi colori di adesso
                const simboli = () => riga('simbolo', `<div class="stile-simboli" data-campo="simbolo" role="radiogroup" aria-label="Simbolo">${Object.entries(SIMBOLI_PUNTO).map(([kk, f]) =>
                    `<button type="button" data-v="${kk}" role="radio" aria-checked="${s.simbolo === kk}" title="${f.nome}">${svgSimboloRiquadro(Object.assign({}, s, { simbolo: kk, dimensione: 1.1 }), 30)}</button>`).join('')}</div>`);
                const campo = c => (c === 'simbolo' ? simboli() : /^(colore|contorno|riempimento|etichettaColore|etichettaAlone)$/.test(c) ? palette(c) : SEGMENTI_STILE[c] ? segmenti(c) : cursore(c));
                // a gruppi, come in QGIS: il simbolo (o la linea), poi le etichette
                const campi = campiStile(k), primi = campi.filter(c => !CAMPI_ETICHETTA.includes(c)), etichette = campi.filter(c => CAMPI_ETICHETTA.includes(c));
                const gruppi = `<div class="stile-gruppo">${primi.includes('simbolo') ? 'Simbolo' : 'Linea e riempimento'}</div>${primi.map(campo).join('')}`
                    + (etichette.length ? `<div class="stile-gruppo">Etichette <span>(si accendono con la «T» nei Livelli)</span></div>${etichette.map(campo).join('')}` : '');
                const toccato = !!(proj.stili && proj.stili[k]);
                stilePop.innerHTML = `<div class="stile-testa"><svg class="ico"><use href="#i-draw"/></svg><b>Stile · ${esc(nome)}</b>`
                        + `<button type="button" class="am-pnl-bt" data-az="fatto" title="Chiudi (le modifiche restano)"><svg class="ico"><use href="#i-x"/></svg></button></div>`
                    + `<div class="stile-righe">${gruppi}</div>`
                    + `<div class="stile-piede"><button type="button" class="bt-link" data-az="base"${toccato ? '' : ' disabled'} title="Torna allo stile di base"><svg class="ico"><use href="#i-reset"/></svg>Di base</button>`
                        + `<span class="stile-nota">mappa, 3D, PDF, GeoPackage, KMZ</span><button type="button" class="bt-link" data-az="annulla" title="Annulla le modifiche (Esc)">Annulla</button></div>`;
                const cambia = (campo, v) => { salvaStile(k, { [campo]: v }); stilePop.querySelector('[data-az="base"]').disabled = false; };
                stilePop.querySelectorAll('.griglia-colori').forEach(gr => {
                    const segna = v => gr.querySelectorAll('.griglia-colore-btn').forEach(b => b.setAttribute('aria-checked', String(b.dataset.v !== undefined ? b.dataset.v.toUpperCase() === v.toUpperCase() : (!!v && !COLORI_STILE.includes(v.toUpperCase())))));
                    gr.addEventListener('click', (e) => { const b = e.target.closest('button[data-v]'); if (b) { segna(b.dataset.v); cambia(gr.dataset.campo, b.dataset.v); } });
                    const libero = gr.querySelector('input[type="color"]');
                    libero.addEventListener('input', () => { segna(libero.value); cambia(gr.dataset.campo, libero.value); });
                });
                stilePop.querySelectorAll('input[type="range"][data-campo]').forEach(cur => cur.addEventListener('input', () => {
                    const v = parseFloat(cur.value);
                    cur.nextElementSibling.textContent = CURSORI_STILE[cur.dataset.campo][3](v);
                    cambia(cur.dataset.campo, v);
                }));
                stilePop.querySelectorAll('.stile-seg[data-campo]').forEach(seg => seg.addEventListener('click', (e) => {
                    const b = e.target.closest('button[data-v]');
                    if (!b) return;
                    seg.querySelectorAll('button').forEach(x => x.classList.toggle('attivo', x === b));
                    const c = seg.dataset.campo, v = c === 'opacita' ? parseFloat(b.dataset.v) : c === 'etichettaGrassetto' ? b.dataset.v === 'true' : b.dataset.v;
                    cambia(c, v);
                }));
                const sim = stilePop.querySelector('.stile-simboli');
                if (sim) sim.addEventListener('click', (e) => {
                    const b = e.target.closest('button[data-v]');
                    if (!b) return;
                    sim.querySelectorAll('button').forEach(x => x.setAttribute('aria-checked', String(x === b)));
                    cambia('simbolo', b.dataset.v);
                });
                stilePop.querySelector('[data-az="base"]').addEventListener('click', () => {
                    salvaStile(k, null);
                    const x = k.startsWith('d:') && disegniDelProgetto().find(y => 'd:' + y.id === k);
                    if (x && stileStato.coloreDisegno) { x.colore = stileStato.coloreDisegno; saveState(); disegnaProveMappa(); renderVista3d(); }
                    apriStileLivello(k, nome, ancora);
                });
                stilePop.querySelector('[data-az="annulla"]').addEventListener('click', () => chiudiStileLivello(false));
                stilePop.querySelector('[data-az="fatto"]').addEventListener('click', () => chiudiStileLivello(true));
                // accanto al punto del clic, dentro la finestra
                const W = window.innerWidth, H = window.innerHeight, r = stilePop.getBoundingClientRect();
                stilePop.style.left = Math.max(8, Math.min(W - r.width - 8, (ancora ? ancora.x : W / 2) + 10)) + 'px';
                stilePop.style.top = Math.max(8, Math.min(H - r.height - 8, (ancora ? ancora.y : H / 2) - 16)) + 'px';
                void stilePop.offsetWidth; // la posizione vale subito, la comparsa si anima
                stilePop.classList.add('aperto');
            }
