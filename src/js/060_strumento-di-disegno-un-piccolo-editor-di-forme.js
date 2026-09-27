            // =========================================================================
            // STRUMENTO DI DISEGNO — un piccolo editor di FORME, non una tela di pixel.
            //
            // Ogni tratto resta un oggetto finché il modale è aperto: per questo si può
            // riselezionare, spostare, ridimensionare e ricolorare dopo averlo tracciato. Alla
            // conferma tutto viene rasterizzato in un PNG e inserito come una qualunque immagine
            // della nota, quindi non nasce nessun formato dati nuovo da portarsi dietro in
            // export e backup: fuori di qui il disegno è una foto come le altre.
            //
            // LO SFONDO È UNO SOLO, e può essere in tre modi: tinta unita, una foto del
            // progetto, oppure trasparente. Prima erano due comandi indipendenti — "Sfondo" e
            // "Trasparente" — che decidevano la stessa cosa e potevano contraddirsi a vicenda.
            // =========================================================================
            const NOTE_DRAW_PALETTE = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#111827', '#ffffff'];
            const NOTE_DRAW_SFONDI = ['#ffffff', '#f1f5f9', '#fef3c7', '#e0f2fe', '#111827'];
            const NOMI_FORMA_DISEGNO = { libero: 'tratto libero', linea: 'linea', rettangolo: 'rettangolo', cerchio: 'cerchio', triangolo: 'triangolo', poligono: 'poligono', testo: 'casella di testo' };
            const SUGGERIMENTI_DISEGNO = {
                seleziona: 'Tocca una forma per sceglierla: trascinala per spostarla, usa i quadratini agli angoli per cambiarne le proporzioni.',
                libero: 'Trascina per disegnare a mano libera.',
                linea: 'Trascina da un capo all\'altro.',
                rettangolo: 'Trascina in diagonale. Dopo, con Seleziona, puoi stondarne gli angoli.',
                cerchio: 'Trascina in diagonale: tieni il riquadro quadrato per un cerchio perfetto, o aggiustalo dopo con Seleziona.',
                triangolo: 'Trascina in diagonale.',
                poligono: 'Un tocco per ogni vertice. Per chiudere: tocca di nuovo il primo vertice, oppure premi ✓.',
                testo: 'Tocca il punto dove vuoi scrivere. Con Seleziona puoi poi spostare la scritta, ingrandirla o riscriverla.'
            };

            const modalNoteDrawOverlay = document.getElementById('modalNoteDrawOverlay');
            const modalNoteDraw = document.getElementById('modalNoteDraw');
            const btnCloseNoteDrawX = document.getElementById('btnCloseNoteDrawX');
            const noteDrawCanvas = document.getElementById('noteDrawCanvas');
            const selNoteDrawWidth = document.getElementById('selNoteDrawWidth');
            const btnNoteDrawClosePolygon = document.getElementById('btnNoteDrawClosePolygon');
            const btnNoteDrawUndo = document.getElementById('btnNoteDrawUndo');
            const btnNoteDrawClear = document.getElementById('btnNoteDrawClear');
            const btnNoteDrawCancel = document.getElementById('btnNoteDrawCancel');
            const btnNoteDrawInsert = document.getElementById('btnNoteDrawInsert');
            const noteDrawShapeBar = document.getElementById('noteDrawShapeBar');
            const lblNoteDrawShapeTipo = document.getElementById('lblNoteDrawShapeTipo');
            const rigaRaggioDisegno = document.getElementById('rigaRaggioDisegno');
            const sepRaggioDisegno = document.getElementById('sepRaggioDisegno');
            const rngNoteDrawRaggio = document.getElementById('rngNoteDrawRaggio');
            const rigaTestoDisegno = document.getElementById('rigaTestoDisegno');
            const sepTestoDisegno = document.getElementById('sepTestoDisegno');
            const rngNoteDrawTesto = document.getElementById('rngNoteDrawTesto');
            const btnNoteDrawRiscrivi = document.getElementById('btnNoteDrawRiscrivi');
            const btnNoteDrawEliminaForma = document.getElementById('btnNoteDrawEliminaForma');
            const btnNoteDrawDeseleziona = document.getElementById('btnNoteDrawDeseleziona');
            const noteDrawSuggerimento = document.getElementById('noteDrawSuggerimento');
            const btnNoteDrawSfondo = document.getElementById('btnNoteDrawSfondo');
            const popSfondoDisegno = document.getElementById('popSfondoDisegno');
            const lblSfondoDisegno = document.getElementById('lblSfondoDisegno');
            const fileNoteDrawBgInput = document.getElementById('fileNoteDrawBgInput');
            const btnNoteDrawContorno = document.getElementById('btnNoteDrawContorno');
            const btnNoteDrawRiempimento = document.getElementById('btnNoteDrawRiempimento');
            const popContornoDisegno = document.getElementById('popContornoDisegno');
            const popRiempimentoDisegno = document.getElementById('popRiempimentoDisegno');

            const DEFAULT_DRAW_W = 640, DEFAULT_DRAW_H = 420;
            const MANIGLIA_DISEGNO = 11;      // lato del quadratino d'angolo, in pixel di tela
            let noteDraw = null;              // stato vivo, azzerato a ogni apertura
            let contatoreFormeDisegno = 0;

            function nuovoStatoDisegno() {
                return {
                    forme: [],
                    strumento: 'libero',
                    contorno: NOTE_DRAW_PALETTE[0],
                    riempimento: null,
                    spessore: 4,
                    dimensioneTesto: 24,
                    // Lo sfondo è un oggetto solo: cambiare `tipo` esclude automaticamente gli
                    // altri due modi, che è esattamente la garanzia che con due tasti separati
                    // non c'era. La preferenza si ricorda: chi scrive a mano su sfondo
                    // trasparente lo fa sempre, non una volta.
                    sfondo: {
                        // Da dove viene la foto: serve solo a dire quale delle due voci del menu
                        // e' quella accesa. Il disegno non se ne accorge — una foto e' una foto.
                        origine: null,
                        // "Foto" non e' una preferenza, e' una scelta di QUESTO disegno: la foto
                        // vive solo finche' il modale e' aperto. Ricordarla lascerebbe
                        // un'etichetta che dice "Foto" e una tela vuota — un'incoerenza muta.
                        tipo: ((state.settings && state.settings.disegnoSfondoTipo) === 'foto')
                            ? 'tinta' : ((state.settings && state.settings.disegnoSfondoTipo) || 'tinta'),
                        colore: (state.settings && state.settings.disegnoSfondoColore) || '#ffffff',
                        immagine: null
                    },
                    selezionata: null,
                    giu: false,
                    formaAttiva: null,
                    puntoGiu: null,
                    trascina: null,
                    poligono: null,
                    ultimoMove: null
                };
            }

            // ---- geometria di base ----------------------------------------------------------
            function riquadroForma(f) {
                // Il testo non ha punti che ne descrivano l'ingombro: ha un ancoraggio e una
                // grandezza, e quanto occupa lo sa solo il carattere. La misura vera viene presa
                // al momento di disegnarlo e lasciata qui sopra (_w/_h); prima del primo disegno
                // si usa una stima, che serve solo a non dare mai un riquadro vuoto.
                if (f.tipo === 'testo') {
                    const p = f.punti[0] || { x: 0, y: 0 };
                    const w = f._w || Math.max(24, (String(f.testo || '').length * (f.dimensione || 24) * 0.55));
                    const h = f._h || (f.dimensione || 24) * 1.5;
                    return { x0: p.x, y0: p.y, x1: p.x + w, y1: p.y + h, w, h };
                }
                let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
                f.punti.forEach(p => { if (p.x < x0) x0 = p.x; if (p.y < y0) y0 = p.y; if (p.x > x1) x1 = p.x; if (p.y > y1) y1 = p.y; });
                return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0 };
            }
            function angoliRiquadro(b) {
                return [{ x: b.x0, y: b.y0 }, { x: b.x1, y: b.y0 }, { x: b.x1, y: b.y1 }, { x: b.x0, y: b.y1 }];
            }
            function formaSelezionata() {
                if (!noteDraw || !noteDraw.selezionata) return null;
                return noteDraw.forme.find(f => f.id === noteDraw.selezionata) || null;
            }

            /** Percorso di un rettangolo con gli angoli eventualmente stondati. Il raggio si
             * limita da solo a metà del lato più corto: senza, stondare un rettangolo sottile
             * produrrebbe un disegno che si ripiega su se stesso. */
            function percorsoRettangolo(ctx, b, raggio) {
                const r = Math.max(0, Math.min(raggio || 0, Math.min(b.w, b.h) / 2));
                ctx.moveTo(b.x0 + r, b.y0);
                ctx.lineTo(b.x1 - r, b.y0);
                if (r) ctx.quadraticCurveTo(b.x1, b.y0, b.x1, b.y0 + r);
                ctx.lineTo(b.x1, b.y1 - r);
                if (r) ctx.quadraticCurveTo(b.x1, b.y1, b.x1 - r, b.y1);
                ctx.lineTo(b.x0 + r, b.y1);
                if (r) ctx.quadraticCurveTo(b.x0, b.y1, b.x0, b.y1 - r);
                ctx.lineTo(b.x0, b.y0 + r);
                if (r) ctx.quadraticCurveTo(b.x0, b.y0, b.x0 + r, b.y0);
                ctx.closePath();
            }

            function tracciaPercorsoForma(ctx, f) {
                const b = riquadroForma(f);
                ctx.beginPath();
                if (f.tipo === 'rettangolo') {
                    percorsoRettangolo(ctx, b, f.raggio);
                } else if (f.tipo === 'cerchio') {
                    const rx = Math.max(0.5, b.w / 2), ry = Math.max(0.5, b.h / 2);
                    if (ctx.ellipse) ctx.ellipse(b.x0 + rx, b.y0 + ry, rx, ry, 0, 0, Math.PI * 2);
                    else ctx.arc(b.x0 + rx, b.y0 + ry, Math.min(rx, ry), 0, Math.PI * 2);
                } else if (f.tipo === 'triangolo') {
                    ctx.moveTo(b.x0 + b.w / 2, b.y0);
                    ctx.lineTo(b.x1, b.y1);
                    ctx.lineTo(b.x0, b.y1);
                    ctx.closePath();
                } else {
                    f.punti.forEach((p, i) => { if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); });
                    if (f.chiusa) ctx.closePath();
                }
            }

            /** Una scritta sulla tela. Se ha un riempimento diventa un'etichetta con il suo
             * fondo: sopra una foto di cantiere, una scritta senza fondo e' spesso illeggibile,
             * e questo e' il modo piu' corto per renderla leggibile senza aggiungere comandi. */
            function disegnaTesto(ctx, f) {
                const p = f.punti[0] || { x: 0, y: 0 };
                const dim = f.dimensione || 24;
                const righe = String(f.testo || '').split('\n');
                ctx.font = '700 ' + dim + 'px ' + 'system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif';
                ctx.textBaseline = 'top';
                const interlinea = Math.round(dim * 1.25);
                let larghezza = 0;
                righe.forEach(r => {
                    const m = ctx.measureText ? ctx.measureText(r) : { width: r.length * dim * 0.55 };
                    if (m && m.width > larghezza) larghezza = m.width;
                });
                f._w = larghezza + dim * 0.6;
                f._h = interlinea * righe.length + dim * 0.4;
                if (f.riempimento) {
                    ctx.fillStyle = f.riempimento;
                    ctx.fillRect(p.x, p.y, f._w, f._h);
                }
                ctx.fillStyle = f.contorno || '#111827';
                righe.forEach((r, i) => {
                    if (ctx.fillText) ctx.fillText(r, p.x + dim * 0.3, p.y + dim * 0.2 + i * interlinea);
                });
            }

            function disegnaForma(ctx, f) {
                if (f.tipo === 'testo') { disegnaTesto(ctx, f); return; }
                tracciaPercorsoForma(ctx, f);
                // Prima il riempimento e poi il contorno: al contrario, il riempimento
                // coprirebbe metà dello spessore della linea.
                if (f.riempimento) { ctx.fillStyle = f.riempimento; ctx.fill(); }
                if (f.contorno) {
                    ctx.strokeStyle = f.contorno;
                    ctx.lineWidth = f.spessore;
                    ctx.lineCap = 'round';
                    ctx.lineJoin = 'round';
                    ctx.stroke();
                }
            }

            function ridisegnaCanvasNota() {
                if (!noteDrawCanvas || !noteDraw) return;
                const ctx = noteDrawCanvas.getContext('2d');
                const w = noteDrawCanvas.width, h = noteDrawCanvas.height;
                ctx.clearRect(0, 0, w, h);
                const sf = noteDraw.sfondo;
                if (sf.tipo === 'foto' && sf.immagine) {
                    ctx.drawImage(sf.immagine, 0, 0, w, h);
                } else if (sf.tipo === 'tinta') {
                    ctx.fillStyle = sf.colore || '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                }
                // Se è trasparente non si riempie niente: sotto si vede la scacchiera del
                // contenitore, che c'era già e adesso ha finalmente qualcosa da dire.

                noteDraw.forme.forEach(f => disegnaForma(ctx, f));

                // Poligono in corso: l'anteprima non è ancora una forma dell'elenco, così
                // annullare a metà non lascia niente dietro.
                if (noteDraw.poligono && noteDraw.poligono.length) {
                    const punti = noteDraw.ultimoMove ? noteDraw.poligono.concat([noteDraw.ultimoMove]) : noteDraw.poligono;
                    disegnaForma(ctx, { tipo: 'poligono', punti, contorno: noteDraw.contorno, riempimento: null, spessore: noteDraw.spessore, chiusa: false });
                    noteDraw.poligono.forEach((p, i) => {
                        ctx.beginPath();
                        ctx.arc(p.x, p.y, Math.max(4, noteDraw.spessore), 0, Math.PI * 2);
                        // Il primo vertice è più grosso e vuoto: è il bersaglio da ritoccare
                        // per chiudere, e deve dirlo da solo senza istruzioni.
                        ctx.fillStyle = i === 0 ? '#ffffff' : (noteDraw.contorno || '#111827');
                        ctx.fill();
                        ctx.lineWidth = 2;
                        ctx.strokeStyle = noteDraw.contorno || '#111827';
                        ctx.stroke();
                    });
                }

                // Maniglie della forma scelta: si disegnano per ultime e NON finiscono
                // nell'immagine (prima di esportare si deseleziona e si ridisegna).
                const sel = formaSelezionata();
                if (sel) {
                    const b = riquadroForma(sel);
                    ctx.save();
                    ctx.setLineDash && ctx.setLineDash([6, 4]);
                    ctx.lineWidth = 1.5;
                    ctx.strokeStyle = '#2563eb';
                    ctx.beginPath();
                    ctx.moveTo(b.x0, b.y0); ctx.lineTo(b.x1, b.y0); ctx.lineTo(b.x1, b.y1); ctx.lineTo(b.x0, b.y1); ctx.closePath();
                    ctx.stroke();
                    ctx.setLineDash && ctx.setLineDash([]);
                    angoliRiquadro(b).forEach(a => {
                        ctx.beginPath();
                        ctx.rect(a.x - MANIGLIA_DISEGNO / 2, a.y - MANIGLIA_DISEGNO / 2, MANIGLIA_DISEGNO, MANIGLIA_DISEGNO);
                        ctx.fillStyle = '#ffffff'; ctx.fill();
                        ctx.lineWidth = 2; ctx.strokeStyle = '#2563eb'; ctx.stroke();
                    });
                    ctx.restore();
                }
            }

            function getNoteDrawPoint(evt) {
                const rect = noteDrawCanvas.getBoundingClientRect();
                const scaleX = noteDrawCanvas.width / (rect.width || 1);
                const scaleY = noteDrawCanvas.height / (rect.height || 1);
                return { x: (evt.clientX - rect.left) * scaleX, y: (evt.clientY - rect.top) * scaleY };
            }

            // ---- selezione ------------------------------------------------------------------
            /** Quale forma sta sotto il dito. Si cerca dall'ultima disegnata alla prima, così
             * tocca a quella in cima come ci si aspetta. Il bersaglio è il riquadro, non il
             * tratto esatto: con un dito su un telefono chiedere la precisione del pixel
             * sarebbe un modo elegante di rendere la selezione inutilizzabile. */
            function formaSottoIlPunto(pt) {
                for (let i = noteDraw.forme.length - 1; i >= 0; i--) {
                    const f = noteDraw.forme[i];
                    const b = riquadroForma(f);
                    const m = Math.max(10, f.spessore);
                    if (pt.x >= b.x0 - m && pt.x <= b.x1 + m && pt.y >= b.y0 - m && pt.y <= b.y1 + m) return f;
                }
                return null;
            }
            function manigliaSottoIlPunto(pt) {
                const sel = formaSelezionata();
                if (!sel) return -1;
                const angoli = angoliRiquadro(riquadroForma(sel));
                for (let i = 0; i < 4; i++) {
                    if (Math.hypot(pt.x - angoli[i].x, pt.y - angoli[i].y) <= MANIGLIA_DISEGNO) return i;
                }
                return -1;
            }
            function selezionaForma(id) {
                if (!noteDraw) return;
                noteDraw.selezionata = id;
                aggiornaBarraFormaDisegno();
                ridisegnaCanvasNota();
            }
            function aggiornaBarraFormaDisegno() {
                const sel = formaSelezionata();
                if (noteDrawShapeBar) noteDrawShapeBar.style.display = sel ? 'flex' : 'none';
                if (!sel) return;
                if (lblNoteDrawShapeTipo) lblNoteDrawShapeTipo.textContent = NOMI_FORMA_DISEGNO[sel.tipo] || sel.tipo;
                const eRettangolo = sel.tipo === 'rettangolo';
                if (rigaRaggioDisegno) rigaRaggioDisegno.style.display = eRettangolo ? 'inline-flex' : 'none';
                if (sepRaggioDisegno) sepRaggioDisegno.style.display = eRettangolo ? 'block' : 'none';
                if (eRettangolo && rngNoteDrawRaggio) rngNoteDrawRaggio.value = String(sel.raggio || 0);
                const eTesto = sel.tipo === 'testo';
                if (rigaTestoDisegno) rigaTestoDisegno.style.display = eTesto ? 'inline-flex' : 'none';
                if (btnNoteDrawRiscrivi) btnNoteDrawRiscrivi.style.display = eTesto ? 'inline-flex' : 'none';
                if (sepTestoDisegno) sepTestoDisegno.style.display = eTesto ? 'block' : 'none';
                if (eTesto && rngNoteDrawTesto) rngNoteDrawTesto.value = String(sel.dimensione || 24);
                // I comandi di colore e spessore parlano con la forma scelta, non con la
                // prossima: un solo posto per decidere, che è anche il posto dove si guarda.
                if (selNoteDrawWidth) selNoteDrawWidth.value = String(sel.spessore);
                aggiornaPastiglieColoreDisegno();
            }

            // ---- colori ---------------------------------------------------------------------
            /** Il colore si applica alla forma scelta se ce n'è una, altrimenti diventa il
             * colore delle prossime. È la regola di ogni editor di disegno, e toglie il bisogno
             * di una seconda fila di comandi identica alla prima. */
            function applicaColoreDisegno(quale, valore) {
                if (!noteDraw) return;
                noteDraw[quale] = valore;
                const sel = formaSelezionata();
                if (sel) sel[quale] = valore;
                aggiornaPastiglieColoreDisegno();
                ridisegnaCanvasNota();
            }
            function aggiornaPastiglieColoreDisegno() {
                const sel = formaSelezionata();
                const contorno = sel ? sel.contorno : noteDraw.contorno;
                const riemp = sel ? sel.riempimento : noteDraw.riempimento;
                const pastiglia = (el, colore) => {
                    if (!el) return;
                    el.style.background = colore || 'transparent';
                    el.classList.toggle('vuota', !colore);
                };
                pastiglia(document.getElementById('pastigliaContorno'), contorno);
                pastiglia(document.getElementById('pastigliaRiempimento'), riemp);
                document.querySelectorAll('#noteDrawToolbar .note-draw-colori').forEach(griglia => {
                    const quale = griglia.dataset.quale;
                    const attuale = quale === 'sfondo' ? noteDraw.sfondo.colore : (quale === 'contorno' ? contorno : riemp);
                    griglia.querySelectorAll('[data-colore-valore]').forEach(b => {
                        b.classList.toggle('is-active', b.dataset.coloreValore === attuale);
                    });
                });
            }
            function renderNoteDrawColors() {
                document.querySelectorAll('#noteDrawToolbar .note-draw-colori').forEach(griglia => {
                    const quale = griglia.dataset.quale;
                    const tavolozza = quale === 'sfondo' ? NOTE_DRAW_SFONDI : NOTE_DRAW_PALETTE;
                    griglia.innerHTML = tavolozza.map(c =>
                        `<button type="button" class="note-draw-color" data-colore-valore="${c}" data-quale="${quale}" style="background:${c};${c === '#ffffff' ? ' box-shadow: inset 0 0 0 1px var(--border);' : ''}"></button>`
                    ).join('');
                    griglia.querySelectorAll('[data-colore-valore]').forEach(btn => {
                        btn.addEventListener('click', () => {
                            const v = btn.dataset.coloreValore;
                            if (quale === 'sfondo') impostaSfondoDisegno('tinta', v);
                            else applicaColoreDisegno(quale, v);
                        });
                    });
                });
                aggiornaPastiglieColoreDisegno();
            }

            // ---- sfondo ---------------------------------------------------------------------
            function etichettaSfondoDisegno() {
                if (!lblSfondoDisegno || !noteDraw) return;
                const t = noteDraw.sfondo.tipo;
                lblSfondoDisegno.textContent = t === 'foto' ? 'Foto' : (t === 'trasparente' ? 'Trasparente' : 'Tinta unita');
            }
            function impostaSfondoDisegno(tipo, colore, origine) {
                if (!noteDraw) return;
                noteDraw.sfondo.tipo = tipo;
                if (colore) noteDraw.sfondo.colore = colore;
                if (tipo !== 'foto') { noteDraw.sfondo.immagine = null; noteDraw.sfondo.origine = null; }
                else if (origine) noteDraw.sfondo.origine = origine;
                if (!state.settings) state.settings = {};
                state.settings.disegnoSfondoTipo = tipo;
                if (colore) state.settings.disegnoSfondoColore = colore;
                saveState();
                etichettaSfondoDisegno();
                evidenziaScelteSfondoDisegno();
                aggiornaPastiglieColoreDisegno();
                ridisegnaCanvasNota();
            }

            /** Quale voce del menu Sfondo e' accesa. Con la foto le voci sono due — dal progetto
             * o dal telefono — e a distinguerle e' `origine`, non il tipo: per il disegno sono
             * la stessa cosa, per chi guarda il menu no. */
            function evidenziaScelteSfondoDisegno() {
                if (!popSfondoDisegno || !noteDraw) return;
                const sf = noteDraw.sfondo;
                const acceso = sf.tipo === 'foto' ? (sf.origine === 'telefono' ? 'file' : 'foto') : sf.tipo;
                popSfondoDisegno.querySelectorAll('[data-sfondo]').forEach(b => b.classList.toggle('is-active', b.dataset.sfondo === acceso));
            }

            /** Un'immagine (da qualunque parte arrivi) diventa lo sfondo. Una strada sola per
             * tutte e due le sorgenti: il ridimensionamento e l'adattamento della tela sono le
             * cose che, scritte due volte, prima o poi divergono. */
            function usaImmagineComeSfondoDisegno(dataUrl, origine) {
                if (!dataUrl) return;
                const img = new Image();
                img.onload = () => {
                    if (!noteDraw) return;
                    const MAX_SIDE = 1100;
                    let w = img.naturalWidth, h = img.naturalHeight;
                    if (Math.max(w, h) > MAX_SIDE) {
                        const scala = MAX_SIDE / Math.max(w, h);
                        w = Math.round(w * scala); h = Math.round(h * scala);
                    }
                    if (noteDrawCanvas) { noteDrawCanvas.width = w || DEFAULT_DRAW_W; noteDrawCanvas.height = h || DEFAULT_DRAW_H; }
                    noteDraw.sfondo.immagine = img;
                    impostaSfondoDisegno('foto', null, origine);
                };
                img.src = dataUrl;
            }

            // ---- poligono -------------------------------------------------------------------
            function finalizzaPoligonoCorrente() {
                if (!noteDraw) return;
                const punti = noteDraw.poligono;
                noteDraw.poligono = null;
                noteDraw.ultimoMove = null;
                if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.style.display = 'none';
                // Meno di tre vertici non è un poligono: si butta invece di lasciare a schermo
                // un segmento che l'utente non ha chiesto.
                if (!punti || punti.length < 3) { ridisegnaCanvasNota(); return; }
                noteDraw.forme.push({
                    id: 'f' + (++contatoreFormeDisegno), tipo: 'poligono', punti,
                    contorno: noteDraw.contorno, riempimento: noteDraw.riempimento,
                    spessore: noteDraw.spessore, raggio: 0, chiusa: true
                });
                ridisegnaCanvasNota();
            }

            /** Chiede il testo e lo posa nel punto toccato — oppure riscrive quello di una
             * casella gia' esistente. Un dialogo invece di una scrittura diretta sulla tela: su
             * un telefono un cursore che lampeggia dentro un canvas e' una promessa che nessun
             * browser mantiene davvero, mentre la tastiera di sistema su un campo vero funziona
             * ovunque e conosce correzione, incolla e dettatura. */
            async function chiediTestoDisegno(forma, punto) {
                const dati = await appPromptCampi('', [
                    { name: 'testo', label: 'Testo', value: forma ? (forma.testo || '') : '', multiline: true, placeholder: 'Anche su piu\' righe' }
                ], { title: forma ? 'Riscrivi il testo' : 'Casella di testo', okLabel: forma ? 'Aggiorna' : 'Inserisci' });
                if (!dati || !noteDraw) return;
                const testo = String(dati.testo || '').replace(/\r/g, '');
                if (forma) {
                    // Svuotare il testo equivale a cancellare la casella: lasciare un rettangolo
                    // vuoto e selezionabile sarebbe un oggetto fantasma.
                    if (!testo.trim()) {
                        noteDraw.forme = noteDraw.forme.filter(f => f !== forma);
                        selezionaForma(null);
                        return;
                    }
                    forma.testo = testo;
                    forma._w = 0; forma._h = 0;
                    aggiornaBarraFormaDisegno();
                    ridisegnaCanvasNota();
                    return;
                }
                if (!testo.trim()) return;
                const nuova = {
                    id: 'f' + (++contatoreFormeDisegno), tipo: 'testo',
                    punti: [{ x: punto.x, y: punto.y }], testo,
                    contorno: noteDraw.contorno || '#111827',
                    riempimento: noteDraw.riempimento,
                    spessore: noteDraw.spessore, raggio: 0,
                    dimensione: noteDraw.dimensioneTesto || 24,
                    _w: 0, _h: 0
                };
                noteDraw.forme.push(nuova);
                ridisegnaCanvasNota();
                // Si passa subito a Seleziona con la casella gia' scelta: appena scritta, la cosa
                // che si vuole fare e' quasi sempre spostarla o ingrandirla.
                aggiornaStrumentoDisegno('seleziona');
                selezionaForma(nuova.id);
            }

            // ---- apertura e chiusura --------------------------------------------------------
            function aggiornaStrumentoDisegno(nome) {
                if (!noteDraw) return;
                if (noteDraw.poligono && nome !== 'poligono') finalizzaPoligonoCorrente();
                noteDraw.strumento = nome;
                if (nome !== 'seleziona') selezionaForma(null);
                document.querySelectorAll('#noteDrawToolbar .note-draw-tool').forEach(b => b.classList.toggle('is-active', b.dataset.drawTool === nome));
                if (noteDrawSuggerimento) noteDrawSuggerimento.textContent = SUGGERIMENTI_DISEGNO[nome] || '';
                if (noteDrawCanvas) noteDrawCanvas.style.cursor = nome === 'seleziona' ? 'default' : 'crosshair';
                ridisegnaCanvasNota();
            }

            function apriStrumentoDisegno() {
                if (!noteProjectContext) return;
                noteDraw = nuovoStatoDisegno();
                if (noteDrawCanvas) { noteDrawCanvas.width = DEFAULT_DRAW_W; noteDrawCanvas.height = DEFAULT_DRAW_H; }
                if (selNoteDrawWidth) selNoteDrawWidth.value = '4';
                if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.style.display = 'none';
                if (noteDrawShapeBar) noteDrawShapeBar.style.display = 'none';
                renderNoteDrawColors();
                etichettaSfondoDisegno();
                evidenziaScelteSfondoDisegno();
                aggiornaStrumentoDisegno('libero');
                if (modalNoteDrawOverlay) modalNoteDrawOverlay.classList.add('open');
                if (modalNoteDraw) modalNoteDraw.classList.add('open');
            }

            function chiudiStrumentoDisegno() {
                if (modalNoteDrawOverlay) modalNoteDrawOverlay.classList.remove('open');
                if (modalNoteDraw) modalNoteDraw.classList.remove('open');
                [popContornoDisegno, popRiempimentoDisegno, popSfondoDisegno].forEach(p => { if (p) p.style.display = 'none'; });
                noteDraw = null;
            }
            if (btnCloseNoteDrawX) btnCloseNoteDrawX.addEventListener('click', chiudiStrumentoDisegno);
            if (btnNoteDrawCancel) btnNoteDrawCancel.addEventListener('click', chiudiStrumentoDisegno);

            collegaComandoTesto('disegno', apriStrumentoDisegno);

            // ---- cablaggio della barra ------------------------------------------------------
            document.querySelectorAll('#noteDrawToolbar .note-draw-tool').forEach(btn => {
                btn.addEventListener('click', () => aggiornaStrumentoDisegno(btn.dataset.drawTool));
            });
            if (selNoteDrawWidth) {
                selNoteDrawWidth.addEventListener('change', () => {
                    if (!noteDraw) return;
                    const v = parseInt(selNoteDrawWidth.value, 10) || 4;
                    noteDraw.spessore = v;
                    const sel = formaSelezionata();
                    if (sel) sel.spessore = v;
                    ridisegnaCanvasNota();
                });
            }
            [[btnNoteDrawContorno, popContornoDisegno], [btnNoteDrawRiempimento, popRiempimentoDisegno], [btnNoteDrawSfondo, popSfondoDisegno]].forEach(([bottone, pop]) => {
                if (!bottone || !pop) return;
                bottone.addEventListener('click', (e) => {
                    e.stopPropagation(); e.preventDefault();
                    const aperto = pop.style.display === 'block';
                    [popContornoDisegno, popRiempimentoDisegno, popSfondoDisegno].forEach(p => { if (p) p.style.display = 'none'; });
                    pop.style.display = aperto ? 'none' : 'block';
                });
                pop.addEventListener('click', (e) => e.stopPropagation());
            });
            document.addEventListener('click', () => {
                [popContornoDisegno, popRiempimentoDisegno, popSfondoDisegno].forEach(p => { if (p) p.style.display = 'none'; });
            });
            document.querySelectorAll('[data-colore-disegno]').forEach(btn => {
                btn.addEventListener('click', () => {
                    applicaColoreDisegno(btn.dataset.coloreDisegno, btn.dataset.valore || null);
                    [popContornoDisegno, popRiempimentoDisegno].forEach(p => { if (p) p.style.display = 'none'; });
                });
            });
            if (popSfondoDisegno) {
                popSfondoDisegno.querySelectorAll('[data-sfondo]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const tipo = btn.dataset.sfondo;
                        if (tipo === 'foto') {
                            popSfondoDisegno.style.display = 'none';
                            apriSelettoreFotoProgetto((dataUrl) => usaImmagineComeSfondoDisegno(dataUrl, 'progetto'));
                            return;
                        }
                        if (tipo === 'file') {
                            // Una foto qualunque del telefono, non solo quelle gia' scattate
                            // nelle prove: la piantina di cantiere, uno schizzo su carta, un
                            // ritaglio. Il campo file ci arriva con la galleria e la fotocamera
                            // gia' dentro, quindi non serve altro da parte nostra.
                            popSfondoDisegno.style.display = 'none';
                            if (fileNoteDrawBgInput) fileNoteDrawBgInput.click();
                            return;
                        }
                        impostaSfondoDisegno(tipo);
                        popSfondoDisegno.style.display = 'none';
                    });
                });
            }
            if (fileNoteDrawBgInput) {
                fileNoteDrawBgInput.addEventListener('change', (e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                        const lettore = new FileReader();
                        lettore.onload = (ev) => usaImmagineComeSfondoDisegno(ev.target.result, 'telefono');
                        lettore.readAsDataURL(file);
                    }
                    // Azzerato subito: senza, riscegliere LO STESSO file non genera un 'change'
                    // e il secondo tentativo sembrerebbe non fare niente.
                    fileNoteDrawBgInput.value = '';
                });
            }

            if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.addEventListener('click', finalizzaPoligonoCorrente);
            if (btnNoteDrawUndo) {
                btnNoteDrawUndo.addEventListener('click', () => {
                    if (!noteDraw) return;
                    if (noteDraw.poligono && noteDraw.poligono.length > 0) {
                        noteDraw.poligono.pop();
                        if (noteDraw.poligono.length === 0) noteDraw.poligono = null;
                        if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.style.display = (noteDraw.poligono && noteDraw.poligono.length >= 3) ? 'inline-flex' : 'none';
                    } else {
                        noteDraw.forme.pop();
                        selezionaForma(null);
                    }
                    ridisegnaCanvasNota();
                });
            }
            if (btnNoteDrawClear) {
                btnNoteDrawClear.addEventListener('click', () => {
                    if (!noteDraw) return;
                    noteDraw.forme = [];
                    noteDraw.poligono = null;
                    if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.style.display = 'none';
                    selezionaForma(null);
                    ridisegnaCanvasNota();
                });
            }
            if (rngNoteDrawRaggio) {
                rngNoteDrawRaggio.addEventListener('input', () => {
                    const sel = formaSelezionata();
                    if (!sel) return;
                    sel.raggio = parseInt(rngNoteDrawRaggio.value, 10) || 0;
                    ridisegnaCanvasNota();
                });
            }
            if (btnNoteDrawEliminaForma) {
                btnNoteDrawEliminaForma.addEventListener('click', () => {
                    const sel = formaSelezionata();
                    if (!sel || !noteDraw) return;
                    noteDraw.forme = noteDraw.forme.filter(f => f !== sel);
                    selezionaForma(null);
                });
            }
            if (rngNoteDrawTesto) {
                rngNoteDrawTesto.addEventListener('input', () => {
                    const sel = formaSelezionata();
                    const v = parseInt(rngNoteDrawTesto.value, 10) || 24;
                    if (noteDraw) noteDraw.dimensioneTesto = v;
                    if (!sel || sel.tipo !== 'testo') return;
                    sel.dimensione = v;
                    sel._w = 0; sel._h = 0;
                    ridisegnaCanvasNota();
                });
            }
            if (btnNoteDrawRiscrivi) {
                btnNoteDrawRiscrivi.addEventListener('click', () => {
                    const sel = formaSelezionata();
                    if (sel && sel.tipo === 'testo') chiediTestoDisegno(sel, null);
                });
            }
            if (btnNoteDrawDeseleziona) btnNoteDrawDeseleziona.addEventListener('click', () => selezionaForma(null));

            // ---- il dito sulla tela ---------------------------------------------------------
            if (noteDrawCanvas) {
                noteDrawCanvas.addEventListener('pointerdown', (e) => {
                    if (!noteDraw) return;
                    e.preventDefault();
                    if (noteDrawCanvas.setPointerCapture) noteDrawCanvas.setPointerCapture(e.pointerId);
                    const pt = getNoteDrawPoint(e);
                    noteDraw.giu = true;
                    noteDraw.puntoGiu = pt;

                    if (noteDraw.strumento === 'seleziona') {
                        // Prima le maniglie, poi le forme: una maniglia sta SOPRA il riquadro
                        // che la possiede, quindi va interrogata per prima o non si potrebbe
                        // mai afferrare.
                        const maniglia = manigliaSottoIlPunto(pt);
                        const sel = formaSelezionata();
                        if (maniglia !== -1 && sel) {
                            const b = riquadroForma(sel);
                            const opposto = angoliRiquadro(b)[(maniglia + 2) % 4];
                            noteDraw.trascina = { modo: 'ridimensiona', forma: sel, fisso: opposto, riquadroIniziale: b, puntiIniziali: sel.punti.map(p => ({ x: p.x, y: p.y })), dimensioneIniziale: sel.dimensione || 24 };
                            return;
                        }
                        const sotto = formaSottoIlPunto(pt);
                        if (sotto) {
                            selezionaForma(sotto.id);
                            noteDraw.trascina = { modo: 'sposta', forma: sotto, da: pt, puntiIniziali: sotto.punti.map(p => ({ x: p.x, y: p.y })) };
                        } else {
                            selezionaForma(null);
                        }
                        return;
                    }

                    if (noteDraw.strumento === 'testo') {
                        // Il dialogo si apre al rilascio, non alla pressione: cosi' un tocco che
                        // scivola non fa comparire una finestra a sorpresa.
                        return;
                    }

                    if (noteDraw.strumento === 'libero') {
                        noteDraw.formaAttiva = { id: 'f' + (++contatoreFormeDisegno), tipo: 'libero', punti: [pt], contorno: noteDraw.contorno, riempimento: null, spessore: noteDraw.spessore, raggio: 0, chiusa: false };
                        noteDraw.forme.push(noteDraw.formaAttiva);
                    } else if (['linea', 'rettangolo', 'cerchio', 'triangolo'].indexOf(noteDraw.strumento) !== -1) {
                        noteDraw.formaAttiva = {
                            id: 'f' + (++contatoreFormeDisegno), tipo: noteDraw.strumento,
                            punti: [pt, { x: pt.x, y: pt.y }],
                            contorno: noteDraw.contorno,
                            // Una linea riempita non vuol dire niente: il riempimento vale
                            // solo per le forme che racchiudono un'area.
                            riempimento: noteDraw.strumento === 'linea' ? null : noteDraw.riempimento,
                            spessore: noteDraw.spessore, raggio: 0, chiusa: false
                        };
                        noteDraw.forme.push(noteDraw.formaAttiva);
                    }
                    ridisegnaCanvasNota();
                });

                noteDrawCanvas.addEventListener('pointermove', (e) => {
                    if (!noteDraw) return;
                    const pt = getNoteDrawPoint(e);
                    const tr = noteDraw.trascina;
                    if (tr && noteDraw.giu) {
                        if (tr.modo === 'sposta') {
                            const dx = pt.x - tr.da.x, dy = pt.y - tr.da.y;
                            tr.forma.punti = tr.puntiIniziali.map(p => ({ x: p.x + dx, y: p.y + dy }));
                        } else {
                            // Il riquadro nuovo va dall'angolo opposto (che resta fermo) al
                            // dito; i punti della forma ci vengono rimappati dentro in
                            // proporzione. Vale per tutte le forme allo stesso modo, anche per
                            // un tratto a mano libera.
                            const nb = {
                                x0: Math.min(tr.fisso.x, pt.x), y0: Math.min(tr.fisso.y, pt.y),
                                x1: Math.max(tr.fisso.x, pt.x), y1: Math.max(tr.fisso.y, pt.y)
                            };
                            nb.w = Math.max(8, nb.x1 - nb.x0); nb.h = Math.max(8, nb.y1 - nb.y0);
                            const bi = tr.riquadroIniziale;
                            const sx = nb.w / Math.max(1, bi.w), sy = nb.h / Math.max(1, bi.h);
                            if (tr.forma.tipo === 'testo') {
                                // Una scritta non si stira: si ingrandisce. Rimappare i suoi punti
                                // sposterebbe l'ancoraggio senza cambiare una virgola di quello
                                // che si vede — quindi si scala la GRANDEZZA, seguendo l'altezza.
                                tr.forma.dimensione = Math.max(10, Math.min(90, Math.round(tr.dimensioneIniziale * sy)));
                                tr.forma.punti = [{ x: nb.x0, y: nb.y0 }];
                                tr.forma._w = 0; tr.forma._h = 0;
                                if (rngNoteDrawTesto) rngNoteDrawTesto.value = String(tr.forma.dimensione);
                            } else {
                                tr.forma.punti = tr.puntiIniziali.map(p => ({ x: nb.x0 + (p.x - bi.x0) * sx, y: nb.y0 + (p.y - bi.y0) * sy }));
                            }
                        }
                        ridisegnaCanvasNota();
                        return;
                    }
                    if (noteDraw.giu && noteDraw.formaAttiva) {
                        if (noteDraw.formaAttiva.tipo === 'libero') noteDraw.formaAttiva.punti.push(pt);
                        else noteDraw.formaAttiva.punti[1] = pt;
                        ridisegnaCanvasNota();
                    } else if (noteDraw.strumento === 'poligono' && noteDraw.poligono) {
                        noteDraw.ultimoMove = pt;
                        ridisegnaCanvasNota();
                    }
                });

                const finePointer = (e) => {
                    if (!noteDraw) return;
                    const pt = getNoteDrawPoint(e);
                    if (noteDraw.strumento === 'testo' && !noteDraw.trascina) {
                        const partenza = noteDraw.puntoGiu;
                        const spostato = partenza ? Math.hypot(pt.x - partenza.x, pt.y - partenza.y) : 0;
                        noteDraw.giu = false;
                        noteDraw.puntoGiu = null;
                        if (spostato < 14) chiediTestoDisegno(null, pt);
                        return;
                    }
                    if (noteDraw.strumento === 'poligono' && !noteDraw.trascina) {
                        const partenza = noteDraw.puntoGiu;
                        const spostato = partenza ? Math.hypot(pt.x - partenza.x, pt.y - partenza.y) : 0;
                        if (spostato < 14) {
                            if (!noteDraw.poligono) noteDraw.poligono = [];
                            // Ritoccare il PRIMO vertice chiude il poligono. È il gesto che ci
                            // si aspetta, e soprattutto è l'unico che funziona col dito: il
                            // doppio tocco non genera 'dblclick' quando il pointerdown è stato
                            // annullato, ed è per questo che prima il poligono sembrava rotto.
                            const primo = noteDraw.poligono[0];
                            if (primo && noteDraw.poligono.length >= 3 && Math.hypot(pt.x - primo.x, pt.y - primo.y) <= Math.max(14, noteDraw.spessore * 3)) {
                                finalizzaPoligonoCorrente();
                            } else {
                                noteDraw.poligono.push(pt);
                                if (btnNoteDrawClosePolygon) btnNoteDrawClosePolygon.style.display = noteDraw.poligono.length >= 3 ? 'inline-flex' : 'none';
                            }
                        }
                    }
                    // Una forma nata da un tocco fermo è un puntino invisibile: si scarta,
                    // altrimenti l'elenco si riempie di forme che nessuno ha voluto.
                    const fa = noteDraw.formaAttiva;
                    if (fa && fa.tipo !== 'libero') {
                        const b = riquadroForma(fa);
                        if (b.w < 4 && b.h < 4) noteDraw.forme = noteDraw.forme.filter(f => f !== fa);
                    }
                    noteDraw.giu = false;
                    noteDraw.formaAttiva = null;
                    noteDraw.puntoGiu = null;
                    noteDraw.trascina = null;
                    aggiornaBarraFormaDisegno();
                    ridisegnaCanvasNota();
                };
                noteDrawCanvas.addEventListener('pointerup', finePointer);
                noteDrawCanvas.addEventListener('pointercancel', finePointer);
                noteDrawCanvas.addEventListener('dblclick', () => {
                    if (!noteDraw) return;
                    if (noteDraw.strumento === 'poligono') { finalizzaPoligonoCorrente(); return; }
                    const sel = formaSelezionata();
                    if (sel && sel.tipo === 'testo') chiediTestoDisegno(sel, null);
                });
            }

            if (btnNoteDrawInsert) {
                btnNoteDrawInsert.addEventListener('click', () => {
                    if (!noteDraw || !noteDrawCanvas) return;
                    if (noteDraw.poligono && noteDraw.poligono.length >= 3) finalizzaPoligonoCorrente();
                    // Si deseleziona PRIMA di rasterizzare: le maniglie e il riquadro
                    // tratteggiato sono aiuti per l'occhio, non parte del disegno, e finirebbero
                    // dentro il PNG per sempre.
                    noteDraw.selezionata = null;
                    noteDraw.poligono = null;
                    noteDraw.ultimoMove = null;
                    ridisegnaCanvasNota();
                    const dataUrl = noteDrawCanvas.toDataURL('image/png');
                    inserisciImmagineDataUrlNellaNota(dataUrl);
                    chiudiStrumentoDisegno();
                });
            }

            // ---- Export della singola nota: testo semplice/markdown, ricavati dall'HTML ----
            /** Converte l'HTML della nota (già reidratato con le immagini) in testo semplice,
             * preservando titoli/elenchi come righe leggibili: i formati .txt non supportano
             * immagini, quindi vengono sostituite da un segnaposto con il relativo indice. */
            function noteHtmlToPlainText(html) {
                const doc = new DOMParser().parseFromString(html || '', 'text/html');
                let contatoreImg = 0;
                doc.body.querySelectorAll('img').forEach(img => {
                    contatoreImg++;
                    img.replaceWith(doc.createTextNode(`\n[Immagine ${contatoreImg}]\n`));
                });
                // Voci della checklist: "[x] fatto" / "[ ] da fare", la checkbox vera viene tolta
                // (il suo testContent è comunque vuoto) e sostituita da questo prefisso leggibile.
                doc.body.querySelectorAll('.note-check-item').forEach(item => {
                    const cb = item.querySelector('.note-check-box');
                    const testo = item.querySelector('.note-check-text')?.textContent || '';
                    item.replaceWith(doc.createTextNode(`\n[${cb && cb.checked ? 'x' : ' '}] ${testo}\n`));
                });
                // FORMA NUOVA della checklist (vedi convertiNotaAlNuovoSchema). Questo lettore
                // deve capirla PRIMA che la conversione entri in funzione: se si aggiornasse
                // dopo, ci sarebbe una finestra in cui le note sono già convertite e le
                // esportazioni perdono le spunte in silenzio. Si insegna al lettore la lingua
                // nuova prima di parlarla — non il contrario.
                // Va anche PRIMA del trattamento dei <li> qui sotto, altrimenti una voce di
                // checklist si prenderebbe pure il pallino dell'elenco puntato.
                doc.body.querySelectorAll('li[data-type="taskItem"]').forEach(item => {
                    const spuntata = item.getAttribute('data-checked') === 'true';
                    item.replaceWith(doc.createTextNode(`\n[${spuntata ? 'x' : ' '}] ${item.textContent || ''}\n`));
                });
                doc.body.querySelectorAll('h1').forEach(h => { h.prepend(doc.createTextNode('# ')); h.append(doc.createTextNode('\n')); });
                doc.body.querySelectorAll('h2').forEach(h => { h.prepend(doc.createTextNode('## ')); h.append(doc.createTextNode('\n')); });
                doc.body.querySelectorAll('h3').forEach(h => { h.prepend(doc.createTextNode('## ')); h.append(doc.createTextNode('\n')); });
                doc.body.querySelectorAll('blockquote').forEach(bq => { bq.prepend(doc.createTextNode('« ')); bq.append(doc.createTextNode(' »\n')); });
                doc.body.querySelectorAll('hr').forEach(hr => hr.replaceWith(doc.createTextNode('\n----------\n')));
                doc.body.querySelectorAll('a').forEach(a => {
                    const href = a.getAttribute('href');
                    if (href) a.append(doc.createTextNode(` (${href})`));
                });
                doc.body.querySelectorAll('li').forEach(li => li.prepend(doc.createTextNode('• ')));
                doc.body.querySelectorAll('p, div, li, br').forEach(el => el.append(doc.createTextNode('\n')));
                return (doc.body.textContent || '').replace(/\n{3,}/g, '\n\n').trim();
            }

