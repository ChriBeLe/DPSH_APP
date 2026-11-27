            // ===================== CONVERSIONE DELLE PROVE DEL SITO VECCHIO =====================
            // Fino al 27/11/2026 su dpsh.netlify.app c'era un'altra app (vedi docs/SITO_VECCHIO_NETLIFY.md):
            // stessa origine, quindi stesso localStorage. Le sue prove ("Prova vecchia") hanno questa forma:
            //   { generali: { comune, localita, cliente, data, numero, profMax, coords },
            //     strumento: { massa|pesoMassa, pesoAsta, lunghAsta, pesoSistema, volata, passo, areaPunta, angoloPunta },
            //     falda: '', colpi: [ { prof, n } ], strati: [], liveBlows: 0 }
            // Qui c'è solo la conversione (funzioni pure sui dati): produce prove e progetti nel formato
            // attuale (VERSIONE_SCHEMA_DATI) e li lascia al percorso di importazione di sempre
            // (importProjectsFromJSON, 044), che controlla id, colori e integrità. Non tocca il motore di
            // calcolo: i colpi diventano intervalli [da, a, colpi] come quelli registrati in campo.

            /** Vero se `v` ha la forma di una prova del sito vecchio: `generali` e `colpi` (la lista). */
            function eProvaSitoVecchio(v) {
                return !!v && typeof v === 'object' && !Array.isArray(v)
                    && !!v.generali && typeof v.generali === 'object' && Array.isArray(v.colpi);
            }

            /** Numero da un valore del sito vecchio (numero o testo, anche con la virgola decimale). */
            function numeroSitoVecchio(valore, ripiego) {
                if (typeof valore === 'number') return Number.isFinite(valore) ? valore : ripiego;
                if (typeof valore !== 'string') return ripiego;
                const n = parseFloat(valore.trim().replace(',', '.'));
                return Number.isFinite(n) ? n : ripiego;
            }

            /** Testo "lat, lon" (anche con punto e virgola, spazi o virgola decimale) → { lat, lng } oppure null. */
            function coordinateSitoVecchio(testo) {
                if (typeof testo !== 'string') return null;
                const trovati = testo.match(/-?\d+(?:[.,]\d+)?/g);
                if (!trovati || trovati.length < 2) return null;
                const lat = parseFloat(trovati[0].replace(',', '.')), lng = parseFloat(trovati[1].replace(',', '.'));
                if (!(Math.abs(lat) <= 90 && Math.abs(lng) <= 180)) return null;
                return { lat, lng };
            }

            /** Gli intervalli della prova vecchia: ogni colpo {prof, n} chiude un intervallo che parte dove
             * finiva il precedente (il primo parte un passo sopra). Le righe senza numeri validi si saltano. */
            function intervalliDaColpiSitoVecchio(colpi, passo, lunghAsta) {
                const buoni = colpi.map(c => ({ prof: numeroSitoVecchio(c && c.prof, NaN), n: numeroSitoVecchio(c && c.n, NaN) }))
                    .filter(c => c.prof > 0 && c.n >= 0)
                    .map(c => ({ prof: Math.round(c.prof * 100) / 100, n: Math.round(c.n) }))
                    .sort((a, b) => a.prof - b.prof);
                const lunga = lunghAsta > 0 ? lunghAsta : 1;
                let precedente = null;
                return buoni.map((c, i) => {
                    const start = i === 0 ? Math.max(0, Math.round((c.prof - passo) * 100) / 100) : precedente;
                    precedente = c.prof;
                    return { start, end: c.prof, colpi: c.n, asta: Math.max(1, Math.floor((c.prof - 0.0001) / lunga) + 1), note: '' };
                });
            }

            /** Impronta della prova vecchia, per riconoscere le copie identiche (l'autosave è quasi sempre
             * uguale alla prova più recente dell'archivio). Conta il contenuto, non il nome o la data di salvataggio. */
            function firmaProvaSitoVecchio(v) {
                const g = v.generali || {}, s = v.strumento || {};
                const t = x => String(x == null ? '' : x).trim();
                return JSON.stringify([
                    t(g.comune), t(g.localita), t(g.cliente), t(g.data), t(g.numero), t(g.profMax), t(g.coords),
                    [s.massa != null ? s.massa : s.pesoMassa, s.pesoAsta, s.lunghAsta, s.pesoSistema, s.volata, s.passo, s.areaPunta, s.angoloPunta].map(t),
                    t(v.falda), v.colpi.map(c => [c && c.prof, c && c.n].map(t))
                ]);
            }

            /** Una prova vecchia può non avere niente da salvare (l'autosave di un sito appena aperto). */
            function provaSitoVecchioVuota(v) {
                const g = v.generali || {};
                const scritto = ['comune', 'localita', 'cliente', 'numero'].some(k => String(g[k] == null ? '' : g[k]).trim() !== '');
                return v.colpi.length === 0 && !scritto;
            }

            /** Prova vecchia → prova nel formato attuale. `predefiniti` = { header, instrument, settings }
             * (predefinitiPerMigrazioni): ciò che la prova vecchia non dice resta com'è nell'app. */
            function proveDaProvaSitoVecchio(v, id, predefiniti) {
                const g = v.generali || {}, s = v.strumento || {};
                const istr = JSON.parse(JSON.stringify(predefiniti.instrument));
                const scegli = (...nomi) => { for (const k of nomi) if (s[k] !== undefined && s[k] !== null && s[k] !== '') return s[k]; return undefined; };
                [['pesoMassa', ['massa', 'pesoMassa']], ['pesoAsta', ['pesoAsta']], ['lunghAsta', ['lunghAsta']], ['pesoSistema', ['pesoSistema']],
                 ['volata', ['volata']], ['passo', ['passo']], ['areaPunta', ['areaPunta']], ['angoloPunta', ['angoloPunta']]].forEach(([dest, nomi]) => {
                    const n = numeroSitoVecchio(scegli(...nomi), NaN);
                    if (Number.isFinite(n) && n > 0) istr[dest] = n;
                });
                const impostazioni = JSON.parse(JSON.stringify(predefiniti.settings));
                impostazioni.stepCm = Math.round(istr.passo * 100);

                const falda = Math.abs(numeroSitoVecchio(v.falda, NaN));
                const faldaTesto = Number.isFinite(falda) && falda > 0 ? String(falda) : '';
                const coord = coordinateSitoVecchio(g.coords);
                const data = /^\d{4}-\d{2}-\d{2}$/.test(String(g.data || '').trim()) ? String(g.data).trim() : predefiniti.header.date;
                const header = Object.assign(JSON.parse(JSON.stringify(predefiniti.header)), {
                    committente: String(g.cliente || ''), comune: String(g.comune || ''), localita: String(g.localita || ''),
                    provaNr: String(g.numero || '').trim() || '1', date: data,
                    faldaDa: faldaTesto, faldaA: faldaTesto,
                    lat: coord ? coord.lat : null, lng: coord ? coord.lng : null, alt: null, acc: null
                });
                delete header.spostamento; delete header.interpretazioneDi;

                const logs = intervalliDaColpiSitoVecchio(v.colpi, istr.passo, istr.lunghAsta);
                const fine = logs.length ? logs[logs.length - 1].end : 0;
                const inCorso = Math.max(0, Math.round(numeroSitoVecchio(v.liveBlows, 0)));
                return {
                    id, header, instrument: istr, settings: impostazioni,
                    currentCount: inCorso, currentDepthStart: fine, currentRod: Math.floor(fine / (istr.lunghAsta > 0 ? istr.lunghAsta : 1) + 1e-9) + 1,
                    logs, strati: stratiInizialiProgettoNuovo(), photos: [], reportTemplateId: null, templateImages: {}, updatedAt: Date.now()
                };
            }

            /** Prove vecchie [{ dati, nome? }] → { progetti, convertite, copie, vuote }: un progetto per comune
             * (come faceva l'importazione dei vecchi archivi), nel formato VERSIONE_SCHEMA_DATI. Le copie identiche
             * (e quelle con impronta in `giaViste`) non entrano. */
            function progettiDaProveSitoVecchio(prove, giaViste, predefiniti) {
                const viste = giaViste instanceof Set ? giaViste : new Set();
                const base = Date.now();
                const perComune = new Map();
                let convertite = 0, copie = 0, vuote = 0, k = 0;
                prove.forEach(p => {
                    const v = p && p.dati;
                    if (!eProvaSitoVecchio(v)) return;
                    if (provaSitoVecchioVuota(v)) { vuote++; return; }
                    const firma = firmaProvaSitoVecchio(v);
                    if (viste.has(firma)) { copie++; return; }
                    viste.add(firma);
                    const comune = String(v.generali.comune || '').trim();
                    if (!perComune.has(comune)) perComune.set(comune, []);
                    perComune.get(comune).push(v);
                });
                const progetti = {};
                let n = 0;
                perComune.forEach((lista, comune) => {
                    const projId = `PROJ_SITOVECCHIO_${base}_${n++}`;
                    const prime = lista[0].generali;
                    const surveys = {};
                    lista.forEach(v => {
                        const id = `SURV_${String(v.generali.numero || '').replace(/[^A-Za-z0-9]/g, '') || (k + 1)}_${base}_${k++}`;
                        surveys[id] = proveDaProvaSitoVecchio(v, id, predefiniti);
                        convertite++;
                    });
                    const primaProva = Object.values(surveys)[0];
                    progetti[projId] = {
                        id: projId, name: comune || 'Dal sito vecchio', comune, committente: String(prime.cliente || ''), localita: String(prime.localita || ''),
                        operator: '', date: primaProva.header.date, updatedAt: Date.now(), surveys, strati: stratiInizialiProgettoNuovo()
                    };
                });
                return { progetti, convertite, copie, vuote };
            }

            /** Contenuto di un file JSON del sito vecchio ("progetto_dpsh.json": una prova; oppure una lista
             * di voci d'archivio { name, date, data }) → file nella forma che l'importazione attuale legge
             * ({ versioneSchema, projects }), oppure null se non è del sito vecchio. */
            function fileDelSitoVecchioInProgetti(parsed) {
                let prove = null;
                if (eProvaSitoVecchio(parsed)) prove = [{ dati: parsed }];
                else if (Array.isArray(parsed) && parsed.length && parsed.every(x => x && typeof x === 'object' && eProvaSitoVecchio(x.data))) {
                    prove = parsed.map(x => ({ dati: x.data, nome: x.name }));
                }
                if (!prove) return null;
                const esito = progettiDaProveSitoVecchio(prove, new Set(), predefinitiPerMigrazioni());
                if (!Object.keys(esito.progetti).length) throw new Error('Il file del sito vecchio non contiene nessuna prova da importare.');
                return { versioneSchema: VERSIONE_SCHEMA_DATI, projects: esito.progetti };
            }
