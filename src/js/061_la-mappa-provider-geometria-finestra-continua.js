            // =========================================================================
            // LA MAPPA — provider, geometria, finestra continua
            //
            // Sostituisce il mosaico 5x5 a tessere intere. Li' il movimento piu' piccolo
            // possibile era largo UNA TESSERA: non era un difetto di implementazione, era che
            // "un po' piu' a destra" non esisteva come gesto. Qui il riquadro e' una finestra su
            // un piano continuo, e le tessere si posano a offset di PIXEL.
            // =========================================================================

            /** I provider disponibili. `tessere` = servizio a piastrelle z/x/y. `wms` = una sola
             * richiesta con il riquadro esatto (piu' semplice per una finestra libera, ma dipende
             * da un server regionale).
             *
             * L'ATTRIBUZIONE NON E' UN OPZIONALE: e' una condizione d'uso di questi servizi, e
             * finora non compariva da nessuna parte nella figura. In una relazione consegnata a
             * un cliente e' una mancanza formale. Ora viene stampata dentro il riquadro. */
            /** I SERVIZI WMS PRONTI, da premere invece che da ricopiare.
             *
             * Chiesto: «tanto sono sempre gli stessi». Vero — un geologo lavora quasi sempre
             * nella stessa regione, e ribattere ogni volta un indirizzo di ottanta caratteri e'
             * un invito all'errore di battitura (che poi si manifesta come un riquadro grigio,
             * senza dire perche').
             *
             * ONESTA' SU QUESTO ELENCO: sono i servizi noti dei portali cartografici italiani,
             * ma NON li ho potuti interrogare da qui per confermare che siano attivi oggi e che
             * il nome del layer sia ancora quello. Vanno intesi come punti di partenza da
             * provare, non come garanzie: il primo che funziona lo si salva e non ci si pensa
             * piu'. Ogni voce e' modificabile e cancellabile, e se ne aggiungono di proprie —
             * quelle restano salvate nelle impostazioni come l'archivio litologico.
             *
             * Molti SIT regionali sono su http://: dentro l'app installata funzionano, in una
             * pagina https il browser li blocca. E' il motivo dell'avviso rosso nel riquadro. */
            const WMS_PRONTI = [
                { nome: 'Ortofoto nazionale (Geoportale Nazionale)',
                  url: 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/ortofoto_colore_12.map',
                  layer: 'OI.ORTOIMMAGINI.2012.33', attribuzione: 'Ortofoto 2012 — Geoportale Nazionale, MASE' },
                { nome: 'Ortofoto Puglia (SIT Puglia)',
                  url: 'http://webapps.sit.puglia.it/arcgis/services/Ortofoto/Ortofoto_2016/MapServer/WMSServer',
                  layer: '0', attribuzione: 'Ortofoto 2016 — Regione Puglia, SIT' },
                { nome: 'Ortofoto Emilia-Romagna',
                  url: 'https://servizigis.regione.emilia-romagna.it/wms/ortoimmagini2020',
                  layer: 'Ortoimmagini2020', attribuzione: 'Ortofoto 2020 — Regione Emilia-Romagna' },
                { nome: 'Ortofoto Lombardia',
                  url: 'https://www.cartografia.servizirl.it/arcgis2/services/BaseMap/Ortofoto2015/MapServer/WMSServer',
                  layer: '0', attribuzione: 'Ortofoto 2015 — Regione Lombardia' },
                { nome: 'Carta topografica IGM 25.000 (Geoportale Nazionale)',
                  url: 'http://wms.pcn.minambiente.it/ogc?map=/ms_ogc/WMS_v1.3/raster/IGM_25000.map',
                  layer: 'CB.RT.IGM25000', attribuzione: 'Carta IGM 1:25.000 — Geoportale Nazionale' }
            ];
            /** I preferiti dell'utente si aggiungono a quelli pronti e vivono nelle impostazioni,
             * quindi entrano nel backup completo insieme a tutto il resto. */
            function wmsDisponibili() {
                const miei = (state.settings && Array.isArray(state.settings.wmsPersonalizzati)) ? state.settings.wmsPersonalizzati : [];
                return WMS_PRONTI.concat(miei);
            }

            const PROVIDER_MAPPA = {
                'esri-satellite': {
                    nome: 'Satellite (Esri)',
                    tipo: 'tessere',
                    zoomMax: 19,
                    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`,
                    attribuzione: 'Esri, Maxar, Earthstar Geographics'
                },
                'osm': {
                    nome: 'Mappa stradale (OSM)',
                    tipo: 'tessere',
                    zoomMax: 19,
                    url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`,
                    attribuzione: '© OpenStreetMap contributors'
                },
                // Le altre basemap a tessere. Sono indirizzi standard e stabili, non servizi
                // regionali: si aggiungono qui perche' in una relazione servono per cose diverse
                // — la topografica per il contesto morfologico, la stradale chiara quando i
                // toponimi devono restare leggibili sopra i pin.
                'esri-topo': {
                    nome: 'Topografica (Esri)',
                    tipo: 'tessere',
                    zoomMax: 19,
                    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/${z}/${y}/${x}`,
                    attribuzione: 'Esri, HERE, Garmin, USGS, Intermap'
                },
                'esri-strade': {
                    nome: 'Stradale chiara (Esri)',
                    tipo: 'tessere',
                    zoomMax: 19,
                    url: (z, x, y) => `https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/${z}/${y}/${x}`,
                    attribuzione: 'Esri, HERE, Garmin, OpenStreetMap contributors'
                },
                'opentopo': {
                    nome: 'Curve di livello (OpenTopoMap)',
                    tipo: 'tessere',
                    zoomMax: 17,
                    url: (z, x, y) => `https://tile.opentopomap.org/${z}/${x}/${y}.png`,
                    attribuzione: '© OpenTopoMap (CC-BY-SA), © OpenStreetMap contributors'
                },
                // ORTOFOTO UFFICIALE VIA WMS. Le regioni ridistribuiscono le ortofoto AGEA (20
                // cm/pixel, voli recenti) con i propri servizi: per una relazione geologica una
                // fonte ufficiale e citabile vale piu' di un'immagine satellitare generica.
                // L'indirizzo lo inserisce l'utente, perche' cambia da regione a regione e non
                // ha senso incorporarne uno solo.
                //
                // ATTENZIONE, verificato: diversi SIT regionali (la Puglia fra questi) espongono
                // i WMS su http:// e non https://. Una pagina servita in https non puo' caricare
                // immagini in http — il browser le blocca come "contenuto misto", e il riquadro
                // resterebbe vuoto senza spiegazioni. Per questo il controllo qui sotto avvisa
                // invece di lasciare un rettangolo grigio.
                'wms': {
                    nome: 'Ortofoto ufficiale (WMS)',
                    tipo: 'wms',
                    zoomMax: 21,
                    attribuzione: ''   // la scrive l'utente: e' la fonte che sta citando
                }
            };

            const ETICHETTE_MAPPA_URL = (z, x, y) =>
                `https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/${z}/${y}/${x}`;

            const LATO_TESSERA = 256;

            // ---- geometria Web Mercator, in coordinate di tessera FRAZIONARIE ----------------
            function tessereXDaLng(lng, zoom) { return (parseFloat(lng) + 180) / 360 * Math.pow(2, zoom); }
            function tessereYDaLat(lat, zoom) {
                const rad = parseFloat(lat) * Math.PI / 180;
                return (1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2 * Math.pow(2, zoom);
            }
            function lngDaTessereX(x, zoom) { return x / Math.pow(2, zoom) * 360 - 180; }
            function latDaTessereY(y, zoom) {
                const n = Math.PI - 2 * Math.PI * y / Math.pow(2, zoom);
                return 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
            }

            /** LE TESSERE CHE COPRONO UNA FINESTRA, con il loro offset in pixel.
             *
             * E' il cuore della navigazione fluida, ed e' anche l'unico punto dove un errore si
             * traduce in una mappa storta: per questo e' una funzione pura, senza DOM, con i
             * suoi test.
             *
             * `centro` e' lat/lng, la finestra e' in pixel. Il risultato dice per ogni tessera
             * dove va messa DENTRO la finestra — anche fuori dai bordi, perche' il ritaglio lo
             * fa il contenitore. */
            function calcolaTessereFinestra(centro, zoom, larghezzaPx, altezzaPx) {
                const z = Math.max(0, Math.min(22, Math.round(zoom)));
                const cx = tessereXDaLng(centro.lng, z);
                const cy = tessereYDaLat(centro.lat, z);
                // Angolo alto-sinistro della finestra, in coordinate di tessera frazionarie.
                const x0 = cx - (larghezzaPx / 2) / LATO_TESSERA;
                const y0 = cy - (altezzaPx / 2) / LATO_TESSERA;
                const primaX = Math.floor(x0), primaY = Math.floor(y0);
                const ultimaX = Math.floor(x0 + larghezzaPx / LATO_TESSERA);
                const ultimaY = Math.floor(y0 + altezzaPx / LATO_TESSERA);
                const massimo = Math.pow(2, z);
                const tessere = [];
                for (let ty = primaY; ty <= ultimaY; ty++) {
                    if (ty < 0 || ty >= massimo) continue;   // oltre i poli non esiste niente
                    for (let tx = primaX; tx <= ultimaX; tx++) {
                        // In longitudine il mondo si richiude su se' stesso: una finestra a
                        // cavallo dell'antimeridiano deve continuare, non interrompersi.
                        const txMondo = ((tx % massimo) + massimo) % massimo;
                        tessere.push({
                            z, x: txMondo, y: ty,
                            sinistra: Math.round((tx - x0) * LATO_TESSERA),
                            alto: Math.round((ty - y0) * LATO_TESSERA)
                        });
                    }
                }
                return { zoom: z, tessere, centroTessereX: cx, centroTessereY: cy, x0, y0 };
            }

            /** Dove cade un punto geografico DENTRO la finestra, in pixel. Serve alle pin, alle
             * loro etichette e al riquadro rosso dell'inquadramento regionale. */
            function puntoNellaFinestra(punto, centro, zoom, larghezzaPx, altezzaPx) {
                const z = Math.max(0, Math.min(22, Math.round(zoom)));
                const cx = tessereXDaLng(centro.lng, z), cy = tessereYDaLat(centro.lat, z);
                const px = tessereXDaLng(punto.lng, z), py = tessereYDaLat(punto.lat, z);
                return {
                    x: larghezzaPx / 2 + (px - cx) * LATO_TESSERA,
                    y: altezzaPx / 2 + (py - cy) * LATO_TESSERA
                };
            }

            /** Il riquadro geografico coperto da una finestra. Serve al riquadro rosso: il
             * perimetro del dettaglio, proiettato dentro la mappa regionale, non si disegna a
             * mano — si calcola, cosi' quando sposti il dettaglio il riquadro lo segue da solo. */
            function riquadroGeograficoFinestra(centro, zoom, larghezzaPx, altezzaPx) {
                const z = Math.max(0, Math.min(22, Math.round(zoom)));
                const cx = tessereXDaLng(centro.lng, z), cy = tessereYDaLat(centro.lat, z);
                const mezzaX = (larghezzaPx / 2) / LATO_TESSERA, mezzaY = (altezzaPx / 2) / LATO_TESSERA;
                return {
                    ovest: lngDaTessereX(cx - mezzaX, z), est: lngDaTessereX(cx + mezzaX, z),
                    nord: latDaTessereY(cy - mezzaY, z), sud: latDaTessereY(cy + mezzaY, z)
                };
            }

            /** Il centro e lo zoom che fanno stare TUTTI i punti dentro una finestra, con un
             * margine. E' cio' che permette al blocco di inquadrare da solo tutte le prove del
             * cantiere invece di centrarne una e sperare. */
            function inquadraturaPerPunti(punti, larghezzaPx, altezzaPx, zoomMax) {
                const validi = (punti || []).filter(p => p && isFinite(parseFloat(p.lat)) && isFinite(parseFloat(p.lng)));
                if (validi.length === 0) return null;
                const lats = validi.map(p => parseFloat(p.lat)), lngs = validi.map(p => parseFloat(p.lng));
                const centro = { lat: (Math.min(...lats) + Math.max(...lats)) / 2, lng: (Math.min(...lngs) + Math.max(...lngs)) / 2 };
                if (validi.length === 1) return { centro, zoom: Math.min(17, zoomMax || 19) };
                // Si scende di zoom finche' il riquadro dei punti ci sta dentro con un margine
                // del 20%: piu' semplice e piu' leggibile di una formula chiusa, e con al
                // massimo una ventina di giri.
                const margine = 0.8;
                for (let z = (zoomMax || 19); z >= 1; z--) {
                    const xs = lngs.map(l => tessereXDaLng(l, z)), ys = lats.map(l => tessereYDaLat(l, z));
                    const largo = (Math.max(...xs) - Math.min(...xs)) * LATO_TESSERA;
                    const alto = (Math.max(...ys) - Math.min(...ys)) * LATO_TESSERA;
                    if (largo <= larghezzaPx * margine && alto <= altezzaPx * margine) return { centro, zoom: z };
                }
                return { centro, zoom: 1 };
            }

            /** Le etichette della mappa hanno tutte lo stesso problema, quindi hanno tutte la
             * stessa soluzione: un MODO, non un testo. Un testo scritto dentro il template
             * viaggia col template — «ROMA» stampato su un cantiere di Brindisi. Un modo invece
             * dice cosa scrivere, e la risposta si rilegge dal cantiere ad ogni stampa.
             * Solo 'custom' e' testo vero, ed e' l'unico caso in cui l'utente ha chiesto
             * esplicitamente qualcosa che i dati non sanno. */
            function testoEtichettaAutomatica(modo, testoScritto, dati) {
                const d = dati || {};
                if (modo === 'localita') return d.localita || '';
                if (modo === 'comune') return d.comune || '';
                if (modo === 'custom') return testoScritto || '';
                return '';
            }

            /** L'INQUADRATURA CHE NON PUO' PERDERE LE PROVE.
             *
             * Segnalato, ed e' il difetto piu' grave che questo blocco abbia avuto: «avevo fatto
             * il template basandomi su Roma, ma quando lo stesso template l'ho usato su Brindisi
             * la mappa mi segnava ancora Roma, e quindi nessuna pin e' stata mostrata».
             *
             * La causa e' un errore di attribuzione del dato. Il centro geografico era salvato
             * NEL TEMPLATE, ma il centro non e' una proprieta' del template: e' una proprieta'
             * del cantiere. Il template dice come si guarda (zoom, provider, toponimi, dove
             * stanno nord e scala); dove si guarda lo decidono le coordinate delle prove. Un
             * template e' fatto per essere riusato su cantieri diversi — e' il suo scopo — quindi
             * un centro fisso dentro un template e' una bomba a orologeria, non un'impostazione.
             *
             * Qui il centro salvato viene RIVERIFICATO contro i punti veri: se tutte le prove ci
             * stanno dentro con un margine, si rispetta l'inquadratura scelta a mano (spostare la
             * mappa per far respirare la figura e' una scelta legittima, e va conservata). Se
             * anche una sola prova cadrebbe fuori, l'inquadratura viene rifatta sui punti. Non
             * c'e' un caso in cui questa funzione restituisce un riquadro che perde una prova. */
            function inquadraturaSicura(mappaSalvata, punti, larghezzaPx, altezzaPx) {
                const automatica = () => inquadraturaPerPunti(punti, larghezzaPx, altezzaPx, 19);
                const salvata = mappaSalvata && mappaSalvata.centro
                    && isFinite(parseFloat(mappaSalvata.centro.lat)) && isFinite(parseFloat(mappaSalvata.centro.lng))
                    ? mappaSalvata : null;
                if (!salvata) return automatica();
                const validi = (punti || []).filter(p => p && isFinite(parseFloat(p.lat)) && isFinite(parseFloat(p.lng)));
                if (validi.length === 0) return salvata;
                const z = Math.round(salvata.zoom || 16);
                // Il margine: la pin ha un gambo e, sotto, l'etichetta "DPSH n". Un punto che
                // cade a due pixel dal bordo e' tecnicamente dentro il riquadro ma nella figura
                // stampata risulta mozzato — che per chi legge la relazione e' lo stesso errore.
                const MARGINE = 26;
                const tuttiDentro = validi.every(p => {
                    const q = puntoNellaFinestra({ lat: parseFloat(p.lat), lng: parseFloat(p.lng) }, salvata.centro, z, larghezzaPx, altezzaPx);
                    return q.x >= MARGINE && q.x <= larghezzaPx - MARGINE
                        && q.y >= MARGINE && q.y <= altezzaPx - MARGINE;
                });
                if (tuttiDentro) return salvata;
                // Si rifa' l'inquadratura, ma si tiene il provider scelto: cambiare cantiere non
                // e' un motivo per tornare al satellite di serie se l'utente aveva scelto il WMS
                // regionale. Si sostituisce cio' che e' sbagliato, non tutto.
                const nuova = automatica();
                if (!nuova) return salvata;
                return { centro: nuova.centro, zoom: nuova.zoom, provider: salvata.provider, ricalcolata: true };
            }

            /** Converte le vecchie impostazioni del blocco nel modello nuovo.
             *
             * Il vecchio blocco diceva "tessera del pin, spostata di N tessere". Il nuovo dice
             * "centro geografico". Senza questa conversione un template gia' salvato si
             * riaprirebbe inquadrato altrove — e sarebbe una figura gia' consegnata che cambia
             * da sola. Stessa strategia della conversione delle note, per la stessa ragione. */
            function convertiInquadramentoVecchio(blockObj, latPin, lngPin) {
                if (!blockObj) return null;
                if (blockObj.mappa && blockObj.mappa.centro) return blockObj.mappa;
                const zoom = blockObj.satelliteZoom || 16;
                const offX = blockObj.satelliteOffsetX || 0;
                const offY = blockObj.satelliteOffsetY || 0;
                // Il vecchio mosaico era 5x5 centrato sulla tessera INTERA del pin, spostata di
                // offX/offY tessere: il centro geografico corrispondente e' il centro di quella
                // tessera, non la posizione del pin.
                const cx = Math.floor(tessereXDaLng(lngPin, zoom)) + offX + 0.5;
                const cy = Math.floor(tessereYDaLat(latPin, zoom)) + offY + 0.5;
                return {
                    centro: { lat: latDaTessereY(cy, zoom), lng: lngDaTessereX(cx, zoom) },
                    zoom,
                    provider: 'esri-satellite',
                    convertitoDaVecchio: true
                };
            }

            /** Le pin del blocco: una per prova, con numero ed etichetta.
             * `pin` = [{ lat, lng, numero, etichetta?, dx?, dy?, mostraEtichetta? }] */
            function htmlPinMappa(pin, centro, zoom, larghezzaPx, altezzaPx, opz) {
                const o = opz || {};
                const misuraEtichetta = Math.max(6, Math.min(24, o.misuraEtichetta || 10));
                return (pin || []).map(p => {
                    const q = puntoNellaFinestra(p, centro, zoom, larghezzaPx, altezzaPx);
                    // Fuori dalla finestra non si disegna: una pin appiccicata al bordo direbbe
                    // che la prova sta li', e non e' vero.
                    if (q.x < -40 || q.y < -40 || q.x > larghezzaPx + 40 || q.y > altezzaPx + 40) return '';
                    const mostra = p.mostraEtichetta !== false && o.etichetteAttive !== false;
                    const testo = p.etichetta || ('DPSH ' + (p.numero !== undefined ? p.numero : '?'));
                    // Scostamento PROPRIO di questa etichetta: e' il requisito che nasce
                    // dall'esperienza vera — un'etichetta chiara sopra una strada chiara non si
                    // legge, e la soluzione non e' cambiare colore, e' spostarla di due
                    // millimetri. Per questo lo scostamento e' per singola pin, non globale.
                    const dx = parseFloat(p.dx) || 0, dy = parseFloat(p.dy) || 0;
                    return `<div data-pin-mappa="${p.numero !== undefined ? p.numero : ''}" style="position:absolute; left:${q.x.toFixed(1)}px; top:${q.y.toFixed(1)}px; transform:translate(-50%,-100%); pointer-events:none;">
                            <svg width="26" height="26" viewBox="0 0 24 24" fill="#dc2626" stroke="#fff" stroke-width="1" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.6)); display:block; margin:0 auto;"><path d="M12 2C7.6 2 4 5.6 4 10c0 6 8 12 8 12s8-6 8-12c0-4.4-3.6-8-8-8z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>
                            ${p.numero !== undefined && p.numero !== '' ? `<div style="position:absolute; left:50%; top:7px; transform:translateX(-50%); color:#dc2626; font-size:9px; font-weight:800; line-height:1; pointer-events:none;">${escapeHtmlDidascalia(String(p.numero))}</div>` : ''}
                        </div>
                        ${mostra ? `<div data-pin-etichetta="${p.numero !== undefined ? p.numero : ''}" style="position:absolute; left:${(q.x + dx).toFixed(1)}px; top:${(q.y + dy).toFixed(1)}px; transform:translate(-50%, 2px); color:#fff; font-size:${misuraEtichetta}px; font-weight:800; white-space:nowrap; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px rgba(0,0,0,0.6); pointer-events:none;">${escapeHtmlDidascalia(testo)}</div>` : ''}`;
                }).join('');
            }

            /** La barra di scala, calcolata sui metri reali della finestra. */
            function htmlBarraScalaMappa(centro, zoom, larghezzaPx, larghezzaMm, opz) {
                const o = opz || {};
                const rad = parseFloat(centro.lat) * Math.PI / 180;
                const metriPerPixel = 156543.03392804097 * Math.cos(rad) / Math.pow(2, Math.round(zoom));
                const metriPerMm = (metriPerPixel * larghezzaPx) / larghezzaMm;
                const passi = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000, 20000];
                // Lunghezza voluta della barra, in frazione della figura. La barra non si stira
                // a piacere: si sceglie il passo tondo (100 m, 250 m, 1 km...) che ci va piu'
                // vicino. Una barra di scala con un valore non tondo si legge male e, peggio,
                // sembra approssimativa anche quando e' esatta.
                const frazioneVoluta = Math.max(0.12, Math.min(0.60, o.lunghezza || 0.25));
                let metri = passi[0], migliore = Infinity;
                passi.forEach(p => {
                    const mm = p / metriPerMm;
                    if (mm >= 10 && mm <= larghezzaMm * 0.75) {
                        const d = Math.abs(mm - larghezzaMm * frazioneVoluta);
                        if (d < migliore) { migliore = d; metri = p; }
                    }
                });
                const barraMm = metri / metriPerMm;
                const etichetta = metri >= 1000 ? (metri / 1000) + ' km' : metri + ' m';
                const meta = metri >= 1000 ? (metri / 2000) + ' km' : (metri / 2) + '';
                const misura = Math.max(5, Math.min(16, o.misuraScala || 7));
                const scalaRiquadro = Math.max(0.6, Math.min(2.5, o.scalaRiquadro || 1));
                // TRE SFONDI. Il cartiglio bianco andava bene su un satellite scuro e diventava
                // una macchia su un'ortofoto chiara; e su alcune figure si vuole proprio che la
                // barra stia "dentro" l'immagine, senza riquadro. Senza sfondo pero' il testo
                // dev'essere contornato, o su un campo chiaro sparisce: sono due scelte legate,
                // e infatti qui si decidono insieme.
                const sfondo = o.sfondo || 'chiaro';
                const senzaSfondo = (sfondo === 'nessuno');
                const scuro = (sfondo === 'scuro');
                const inchiostro = scuro ? '#fff' : '#0f172a';
                const oppostoInchiostro = scuro ? '#0f172a' : '#fff';
                const fondoRiquadro = senzaSfondo ? 'transparent' : (scuro ? 'rgba(15,23,42,0.88)' : 'rgba(255,255,255,0.92)');
                const bordoRiquadro = senzaSfondo ? 'none' : `1px solid ${scuro ? 'rgba(255,255,255,0.35)' : 'rgba(15,23,42,0.25)'}`;
                // Senza riquadro il testo si contorna col colore opposto: e' l'unico modo di
                // restare leggibile sopra un'immagine di cui non si sa niente.
                const ombraTesto = senzaSfondo
                    ? `text-shadow:-1px -1px 0 ${oppostoInchiostro},1px -1px 0 ${oppostoInchiostro},-1px 1px 0 ${oppostoInchiostro},1px 1px 0 ${oppostoInchiostro};`
                    : '';
                let segmenti = '';
                for (let i = 0; i < 4; i++) segmenti += `<div style="flex:1; background:${i % 2 === 0 ? inchiostro : oppostoInchiostro};"></div>`;
                return `<div data-elemento-mappa="scala" data-scala-sfondo="${sfondo}" style="position:absolute; ${posizioneElementoMappa(o.posizione, o.x, o.y)} background:${fondoRiquadro}; border:${bordoRiquadro}; border-radius:3px; padding:${(4 * scalaRiquadro).toFixed(1)}px ${(6 * scalaRiquadro).toFixed(1)}px ${(3 * scalaRiquadro).toFixed(1)}px; pointer-events:none;">
                        <div style="display:flex; height:${(5 * scalaRiquadro).toFixed(1)}px; width:${barraMm.toFixed(1)}mm; outline:${(0.8 * scalaRiquadro).toFixed(1)}px solid ${inchiostro};">${segmenti}</div>
                        <div style="display:flex; justify-content:space-between; width:${barraMm.toFixed(1)}mm; font-size:${misura}px; color:${inchiostro}; font-weight:700; margin-top:2px; ${ombraTesto}">
                            <span>0</span><span>${meta}</span><span>${etichetta}</span>
                        </div>
                    </div>`;
            }

            /** Vertici e coordinate libere SONO LO STESSO DATO: i quattro vertici scrivono nelle
             * coordinate, non sono un'impostazione parallela che puo' contraddirle. E' la
             * differenza tra un'interfaccia che aiuta e una che confonde. */
            const VERTICI_MAPPA = {
                'alto-sinistra': { x: 4, y: 4 }, 'alto-destra': { x: 96, y: 4 },
                'basso-sinistra': { x: 4, y: 96 }, 'basso-destra': { x: 96, y: 96 }
            };
            function posizioneElementoMappa(vertice, x, y) {
                const v = VERTICI_MAPPA[vertice];
                const px = (x !== undefined && x !== null) ? x : (v ? v.x : 4);
                const py = (y !== undefined && y !== null) ? y : (v ? v.y : 96);
                const ancoraX = px > 50 ? 'right:' + (100 - px).toFixed(1) + '%;' : 'left:' + px.toFixed(1) + '%;';
                const ancoraY = py > 50 ? 'bottom:' + (100 - py).toFixed(1) + '%;' : 'top:' + py.toFixed(1) + '%;';
                return ancoraX + ancoraY;
            }

            /** La freccia del nord. In Web Mercator il nord e' sempre in alto, quindi la freccia
             * e' verticale — sembra banale, ma il giorno in cui si aggiungesse una mappa ruotata
             * questa e' la riga che deve ruotare con lei, e va trovata subito. */
            function htmlNordMappa(opz) {
                const o = opz || {};
                const k = Math.max(0.5, Math.min(3, o.scala || 1));
                const rotazione = o.rotazioneGradi || 0;
                // DUE VERSI, perche' una sola combinazione non regge tutti gli sfondi: su
                // un'ortofoto chiara (campi arati, calcare, sabbia) una freccia bianca sparisce,
                // su un bosco o un abitato scuro sparisce quella nera. Non e' un gusto, e'
                // leggibilita' — e cambia con la foto, quindi deve poterla scegliere chi guarda.
                const scuro = (o.stile === 'scuro');
                const riempimento = scuro ? '#0f172a' : '#fff';
                const contorno = scuro ? '#fff' : '#0f172a';
                return `<div data-elemento-mappa="nord" data-nord-stile="${scuro ? 'scuro' : 'chiaro'}" style="position:absolute; ${posizioneElementoMappa(o.posizione, o.x, o.y)} pointer-events:none; transform:rotate(${rotazione}deg);">
                        <svg width="${(22 * k).toFixed(0)}" height="${(30 * k).toFixed(0)}" viewBox="0 0 22 30" style="filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">
                            <path d="M11 2 L17 20 L11 16 L5 20 Z" fill="${riempimento}" stroke="${contorno}" stroke-width="1.2" stroke-linejoin="round"/>
                            <text x="11" y="29" text-anchor="middle" font-size="9" font-weight="800" fill="${riempimento}" stroke="${contorno}" stroke-width="2.2" paint-order="stroke" font-family="Arial,sans-serif">N</text>
                        </svg>
                    </div>`;
            }


            /** L'INQUADRAMENTO REGIONALE, cioè la mappetta d'angolo.
             *
             * Stessa area, un'altra scala: dà in un colpo d'occhio "dove siamo", che una vista
             * di dettaglio da sola non può dire.
             *
             * Il riquadro rosso NON si disegna a mano: si CALCOLA proiettando il perimetro
             * geografico della vista di dettaglio dentro la finestra regionale. Quindi quando
             * sposti o ingrandisci il dettaglio, il riquadro lo segue da solo — e non può
             * mentire, che è la cosa che un rettangolo disegnato a mano finisce sempre per fare.
             *
             * Sul "ritagliare": qui non serve lo strumento di ritaglio delle immagini. Questa non
             * è una foto, è una finestra: cambiarne misura e centro È il ritaglio, e per giunta
             * senza perdere risoluzione. Ritagliare un raster sarebbe la stessa cosa fatta peggio.
             */
            function htmlInsetRegionaleMappa(inset, centroDettaglio, zoomDettaglio, larghezzaPxDettaglio, altezzaPxDettaglio, larghezzaMmDettaglio, altezzaMmDettaglio, opzPadre) {
                const i = inset || {};
                if (i.attivo !== true) return '';
                // LA BASEMAP SI EREDITA. Segnalato: «il riquadro regionale non cambia immagine
                // satellitare quando scelgo un'altra basemap». La causa era qui: il provider
                // dell'inset ripiegava sempre sul satellite Esri invece che su quello scelto per
                // la mappa grande, quindi i due riquadri della stessa figura potevano mostrare
                // due cartografie diverse — cosa che in una figura di relazione non ha senso.
                // Ora si eredita, e resta possibile forzarne uno diverso apposta (i.provider).
                const p = opzPadre || {};
                const chiaveProvider = i.provider || p.provider || 'esri-satellite';
                const provider = PROVIDER_MAPPA[chiaveProvider] || PROVIDER_MAPPA['esri-satellite'];
                // Misura dell'inset: in percentuale del riquadro grande, così resta proporzionato
                // anche cambiando la misura del blocco.
                const percLarghezza = Math.max(15, Math.min(60, i.percLarghezza || 34));
                const percAltezza = Math.max(15, Math.min(60, i.percAltezza || percLarghezza));
                const larghezzaMm = larghezzaMmDettaglio * percLarghezza / 100;
                const altezzaMm = altezzaMmDettaglio * percAltezza / 100;
                const PX_PER_MM = 4;
                const larghezzaPx = Math.round(larghezzaMm * PX_PER_MM);
                const altezzaPx = Math.round(altezzaMm * PX_PER_MM);
                // Il centro: quello scelto, altrimenti lo stesso del dettaglio. Lo zoom: quello
                // scelto, altrimenti cinque livelli più in là — che è più o meno il salto da
                // "un cantiere" a "una provincia".
                const centro = (i.centro && isFinite(parseFloat(i.centro.lat))) ? i.centro : centroDettaglio;
                const zoom = Math.max(1, Math.min(provider.zoomMax || 19, Math.round(
                    (i.zoom !== undefined && i.zoom !== null) ? i.zoom : Math.max(1, Math.round(zoomDettaglio) - 5))));

                // Anche il WMS: prima l'inset sapeva disegnare solo tessere, quindi scegliendo
                // l'ortofoto regionale il riquadro grande cambiava e quello piccolo restava
                // vuoto — un buco che si notava solo a figura composta.
                let tessere;
                if (provider.tipo === 'wms') {
                    const base = String(i.wmsUrl || p.wmsUrl || '').trim();
                    if (!base) {
                        tessere = `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#475569; font-size:9px; text-align:center; padding:6px;">WMS non impostato</div>`;
                    } else {
                        const rr = riquadroGeograficoFinestra(centro, zoom, larghezzaPx, altezzaPx);
                        const sep = base.indexOf('?') === -1 ? '?' : '&';
                        const url = base + sep + 'service=WMS&version=1.1.1&request=GetMap&srs=EPSG:4326'
                            + '&layers=' + encodeURIComponent(i.wmsLayer || p.wmsLayer || '')
                            + '&styles=&format=image/jpeg&transparent=false'
                            + `&width=${larghezzaPx}&height=${altezzaPx}`
                            + `&bbox=${rr.ovest},${rr.sud},${rr.est},${rr.nord}`;
                        tessere = `<img src="${url}" decoding="async" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;">`;
                    }
                } else {
                    const f = calcolaTessereFinestra(centro, zoom, larghezzaPx, altezzaPx);
                    tessere = f.tessere.map(t =>
                        `<img src="${provider.url ? provider.url(t.z, t.x, t.y) : ''}" decoding="async" style="position:absolute; left:${t.sinistra}px; top:${t.alto}px; width:${LATO_TESSERA}px; height:${LATO_TESSERA}px; display:block;">`
                    ).join('');
                }

                // ---- il riquadro rosso, calcolato ----
                let riquadroHtml = '';
                if (i.mostraRiquadro !== false) {
                    const bbox = riquadroGeograficoFinestra(centroDettaglio, zoomDettaglio, larghezzaPxDettaglio, altezzaPxDettaglio);
                    const a = puntoNellaFinestra({ lat: bbox.nord, lng: bbox.ovest }, centro, zoom, larghezzaPx, altezzaPx);
                    const b = puntoNellaFinestra({ lat: bbox.sud, lng: bbox.est }, centro, zoom, larghezzaPx, altezzaPx);
                    let x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
                    let w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
                    // A scala regionale l'area di un cantiere può ridursi a meno di un pixel: un
                    // rettangolo esatto sarebbe invisibile, cioè inutile. Si impone un minimo
                    // leggibile, centrato sul punto giusto — meglio un segno un po' più grande
                    // del vero che nessun segno.
                    const MIN = 14;
                    if (w < MIN) { x -= (MIN - w) / 2; w = MIN; }
                    if (h < MIN) { y -= (MIN - h) / 2; h = MIN; }
                    riquadroHtml = `<div data-riquadro-dettaglio="1" style="position:absolute; left:${x.toFixed(1)}px; top:${y.toFixed(1)}px; width:${w.toFixed(1)}px; height:${h.toFixed(1)}px; border:2px solid #dc2626; box-shadow:0 0 0 1px rgba(255,255,255,0.8); border-radius:2px; pointer-events:none;"></div>`;
                }

                const etichetta = i.etichetta ? `<div data-inset-etichetta="1" style="position:absolute; ${posizioneElementoMappa(i.etichettaVertice || 'basso-sinistra', i.etichettaX, i.etichettaY)} color:#fff; font-size:${Math.max(6, Math.min(20, i.etichettaMisura || 9))}px; font-weight:800; white-space:nowrap; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px rgba(0,0,0,0.7); pointer-events:none;">${escapeHtmlDidascalia(i.etichetta)}</div>` : '';

                return `<div data-inset-regionale="1" style="position:absolute; ${posizioneElementoMappa(i.posizione || 'alto-destra', i.x, i.y)} width:${larghezzaMm.toFixed(1)}mm; height:${altezzaMm.toFixed(1)}mm; overflow:hidden; border:1.5px solid #fff; box-shadow:0 1px 4px rgba(0,0,0,0.5); border-radius:3px; background:#e2e8f0;">
                        <div style="position:absolute; inset:0; overflow:hidden;">${tessere}</div>
                        ${riquadroHtml}
                        ${etichetta}
                    </div>`;
            }

            /** IL RIQUADRO SATELLITARE, ricostruito.
             *
             * Una finestra su un piano continuo: centro geografico + zoom + misura in
             * millimetri. Le tessere si posano a offset di pixel, quindi l'inquadratura si
             * sposta di quanto si vuole invece che di una tessera per volta. */
            /** Le coordinate di tutte le prove di un progetto, ordinate per numero e senza
             * quelle prive di GPS: una prova senza coordinate non va messa "da qualche parte",
             * va lasciata fuori. */
            function puntiProveDelProgetto(proj) {
                // Una pin per verticale: un'interpretazione alternativa sta nello stesso punto.
                return proveFisiche(Object.values((proj && proj.surveys) || {}))
                    .sort((a, b) => (parseInt(a.header && a.header.provaNr) || 0) - (parseInt(b.header && b.header.provaNr) || 0))
                    .map(su => ({
                        lat: su.header && su.header.lat, lng: su.header && su.header.lng,
                        numero: (su.header && su.header.provaNr) || ''
                    }))
                    .filter(p => isFinite(parseFloat(p.lat)) && isFinite(parseFloat(p.lng)));
            }

            function buildMappaInquadramentoHtml(opzioni) {
                const o = opzioni || {};
                const centro = o.centro;
                if (!centro || !isFinite(parseFloat(centro.lat)) || !isFinite(parseFloat(centro.lng))) return '';
                const provider = PROVIDER_MAPPA[o.provider] || PROVIDER_MAPPA['esri-satellite'];
                const larghezzaMm = o.larghezzaMm || 140;
                const altezzaMm = o.altezzaMm || larghezzaMm;
                // I pixel della finestra: 4 px per millimetro e' una risoluzione che regge la
                // stampa senza chiedere un numero spropositato di tessere.
                const PX_PER_MM = 4;
                const larghezzaPx = Math.round(larghezzaMm * PX_PER_MM);
                const altezzaPx = Math.round(altezzaMm * PX_PER_MM);
                const zoom = Math.max(1, Math.min(provider.zoomMax || 19, Math.round(o.zoom || 16)));

                let sfondoHtml = '';
                if (provider.tipo === 'wms') {
                    const r = riquadroGeograficoFinestra(centro, zoom, larghezzaPx, altezzaPx);
                    const base = String(o.wmsUrl || '').trim();
                    if (!base) {
                        sfondoHtml = `<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#475569; font-size:11px; text-align:center; padding:12px;">Indirizzo del servizio WMS non impostato.<br>Aprilo dal menu del blocco.</div>`;
                    } else {
                        const sep = base.indexOf('?') === -1 ? '?' : '&';
                        const url = base + sep + 'service=WMS&version=1.1.1&request=GetMap&srs=EPSG:4326'
                            + '&layers=' + encodeURIComponent(o.wmsLayer || '')
                            + '&styles=&format=image/jpeg&transparent=false'
                            + `&width=${larghezzaPx}&height=${altezzaPx}`
                            + `&bbox=${r.ovest},${r.sud},${r.est},${r.nord}`;
                        // Contenuto misto: molti SIT regionali sono su http. Se la pagina e' in
                        // https il browser blocca l'immagine e resterebbe un rettangolo vuoto,
                        // senza che nessuno capisca perche'. Meglio dirlo.
                        const avvisoHttp = (base.indexOf('http://') === 0 && typeof location !== 'undefined' && location.protocol === 'https:')
                            ? `<div style="position:absolute; left:0; right:0; top:0; background:rgba(220,38,38,0.92); color:#fff; font-size:9px; padding:3px 5px; text-align:center;">Servizio su http: il browser potrebbe bloccarlo. Nell'app installata funziona.</div>` : '';
                        sfondoHtml = `<img src="${url}" decoding="async" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover; display:block;">${avvisoHttp}`;
                    }
                } else {
                    const f = calcolaTessereFinestra(centro, zoom, larghezzaPx, altezzaPx);
                    sfondoHtml = f.tessere.map(t =>
                        `<img src="${provider.url(t.z, t.x, t.y)}" decoding="async" style="position:absolute; left:${t.sinistra}px; top:${t.alto}px; width:${LATO_TESSERA}px; height:${LATO_TESSERA}px; display:block;">`
                    ).join('');
                }

                // ---- TOPONIMI ----
                // Ingrandirli prendendoli da uno zoom PIU' SUPERFICIALE: ogni tessera copre il
                // doppio di terreno, quindi riscalata x2 per allinearsi mostra lo stesso testo
                // grande il doppio, e nella posizione geografica giusta. Il tentativo precedente
                // aveva provato il contrario (zoom piu' profondo) e otteneva testo piu' PICCOLO:
                // il ragionamento si era fermato a meta'.
                // Il prezzo, da sapere: a zoom superficiale ci sono MENO nomi. Piu' grandi, meno
                // numerosi. E' un baratto, ma onesto — al contrario di etichette spostate dal
                // loro posto, che era il compromesso di prima.
                let etichetteHtml = '';
                if (o.etichette !== false) {
                    const passiIngrandimento = Math.max(0, Math.min(2, Math.round(o.ingrandimentoToponimi || 0)));
                    const zEt = Math.max(1, zoom - passiIngrandimento);
                    const k = Math.pow(2, passiIngrandimento);
                    const fEt = calcolaTessereFinestra(centro, zEt, larghezzaPx / k, altezzaPx / k);
                    etichetteHtml = `<div data-livello-toponimi="1" style="position:absolute; inset:0; pointer-events:none; opacity:${Math.max(0, Math.min(100, o.opacitaToponimi === undefined ? 100 : o.opacitaToponimi)) / 100};">
                        <div style="position:absolute; left:0; top:0; width:${(larghezzaPx / k).toFixed(0)}px; height:${(altezzaPx / k).toFixed(0)}px; transform:scale(${k}); transform-origin:0 0;">
                            ${fEt.tessere.map(t => `<img src="${ETICHETTE_MAPPA_URL(t.z, t.x, t.y)}" decoding="async" style="position:absolute; left:${t.sinistra}px; top:${t.alto}px; width:${LATO_TESSERA}px; height:${LATO_TESSERA}px; display:block;">`).join('')}
                        </div></div>`;
                }

                const etichettaLibera = o.etichettaLibera ? `<div data-etichetta-libera="1" style="position:absolute; ${posizioneElementoMappa(o.etichettaLiberaVertice, o.etichettaLiberaX, o.etichettaLiberaY)} transform:translate(0,0); color:#fff; font-size:${Math.max(8, Math.min(28, o.etichettaLiberaMisura || 12))}px; font-weight:800; white-space:nowrap; text-shadow:-1px -1px 0 #000,1px -1px 0 #000,-1px 1px 0 #000,1px 1px 0 #000,0 0 3px rgba(0,0,0,0.6); pointer-events:none;">${escapeHtmlDidascalia(o.etichettaLibera)}</div>` : '';

                const attribuzione = o.attribuzione || provider.attribuzione;
                // L'ATTRIBUZIONE NON E' UN DETTAGLIO: e' una condizione d'uso del servizio, e
                // finora non compariva. In una relazione consegnata era una mancanza formale.
                const attribuzioneHtml = attribuzione ? `<div data-attribuzione-mappa="1" style="position:absolute; right:3px; bottom:2px; font-size:6.5px; color:#fff; text-shadow:0 0 3px rgba(0,0,0,0.9); pointer-events:none; max-width:70%; text-align:right; line-height:1.2;">${escapeHtmlDidascalia(attribuzione)}</div>` : '';

                return `<div data-mappa-inquadramento="1" style="position:relative; width:${larghezzaMm}mm; height:${altezzaMm}mm; max-width:100%; border-radius:6px; overflow:hidden; border:1.5px solid #0f172a; box-shadow:0 2px 4px rgba(0,0,0,0.15); margin:0 auto; background:#e2e8f0;">
                        <div style="position:absolute; inset:0; overflow:hidden;">${sfondoHtml}</div>
                        ${etichetteHtml}
                        ${htmlPinMappa(o.pin, centro, zoom, larghezzaPx, altezzaPx, o)}
                        ${etichettaLibera}
                        ${htmlInsetRegionaleMappa(o.inset, centro, zoom, larghezzaPx, altezzaPx, larghezzaMm, altezzaMm, o)}
                        ${o.mostraNord ? htmlNordMappa(o.nord || {}) : ''}
                        ${o.mostraScala !== false ? htmlBarraScalaMappa(centro, zoom, larghezzaPx, larghezzaMm, o.scala || {}) : ''}
                        ${attribuzioneHtml}
                    </div>`;
            }

            /** Converte l'HTML della nota in Markdown, incorporando le immagini come data URI
             * (l'unico modo per restare un file .md autonomo, senza cartella immagini a parte). */
            function noteHtmlToMarkdown(html) {
                const doc = new DOMParser().parseFromString(html || '', 'text/html');
                let out = '';
                function serializza(node) {
                    node.childNodes.forEach(n => {
                        if (n.nodeType === Node.TEXT_NODE) { out += n.textContent; return; }
                        if (n.nodeType !== Node.ELEMENT_NODE) return;
                        const tag = n.tagName.toLowerCase();
                        if (tag === 'img') {
                            const src = n.getAttribute('src') || '';
                            out += `\n\n![immagine](${src})\n\n`;
                        } else if (n.classList && n.classList.contains('note-check-item')) {
                            const cb = n.querySelector('.note-check-box');
                            const testo = n.querySelector('.note-check-text')?.textContent || '';
                            out += `\n- [${cb && cb.checked ? 'x' : ' '}] ${testo}`;
                        } else if (n.getAttribute && n.getAttribute('data-type') === 'taskItem') {
                            // Forma nuova della checklist: riconosciuta PRIMA del ramo dei <li>,
                            // che altrimenti la trasformerebbe in un semplice pallino perdendo
                            // la spunta. Vedi il commento gemello in noteHtmlToPlainText.
                            out += `\n- [${n.getAttribute('data-checked') === 'true' ? 'x' : ' '}] ${n.textContent || ''}`;
                        } else if (n.tagName.toLowerCase() === 'mark') {
                            // L'evidenziatore non ha un equivalente in markdown standard: si usa
                            // la convenzione di GitHub. Meglio due segni in più che perdere
                            // l'informazione "questo pezzo era evidenziato".
                            out += '=='; serializza(n); out += '==';
                        } else if (tag === 'u') {
                            out += '<u>'; serializza(n); out += '</u>';
                        } else if (tag === 's' || tag === 'strike') {
                            out += '~~'; serializza(n); out += '~~';
                        } else if (tag === 'h1') {
                            out += '\n\n# '; serializza(n); out += '\n\n';
                        } else if (tag === 'h2') {
                            out += '\n\n## '; serializza(n); out += '\n\n';
                        } else if (tag === 'h3') {
                            out += '\n\n### '; serializza(n); out += '\n\n';
                        } else if (tag === 'blockquote') {
                            out += '\n\n> '; serializza(n); out += '\n\n';
                        } else if (tag === 'hr') {
                            out += '\n\n---\n\n';
                        } else if (tag === 'a') {
                            const href = n.getAttribute('href') || '';
                            out += '['; serializza(n); out += `](${href})`;
                        } else if (tag === 'b' || tag === 'strong') {
                            out += '**'; serializza(n); out += '**';
                        } else if (tag === 'i' || tag === 'em') {
                            out += '_'; serializza(n); out += '_';
                        } else if (tag === 'li') {
                            out += '\n- '; serializza(n);
                        } else if (tag === 'ul' || tag === 'ol') {
                            serializza(n); out += '\n';
                        } else if (tag === 'br') {
                            out += '\n';
                        } else if (tag === 'p' || tag === 'div') {
                            serializza(n); out += '\n\n';
                        } else {
                            serializza(n);
                        }
                    });
                }
                serializza(doc.body);
                return out.replace(/\n{3,}/g, '\n\n').trim() + '\n';
            }

            function scaricaBlob(contenuto, tipo, nomeFile) {
                const blob = new Blob([contenuto], { type: tipo });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = nomeFile;
                document.body.appendChild(a); a.click(); document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            function nomeFileNotaCorrente(estensione) {
                const proj = noteProjectContext && state.projects[noteProjectContext.projId];
                const base = proj ? (proj.name || proj.comune || 'Progetto') : 'Nota';
                return `Note_${base.replace(/\s+/g, '_')}.${estensione}`;
            }

            const btnNoteExportTxt = document.getElementById('btnNoteExportTxt');
            const btnNoteExportMd = document.getElementById('btnNoteExportMd');
            const btnNoteExportJson = document.getElementById('btnNoteExportJson');

            if (btnNoteExportTxt) btnNoteExportTxt.addEventListener('click', async () => {
                if (!noteProjectContext) return;
                const html = await rehydrateNoteImagesInHtmlString(htmlNotaCorrente());
                scaricaBlob(noteHtmlToPlainText(html), 'text/plain;charset=utf-8', nomeFileNotaCorrente('txt'));
            });
            if (btnNoteExportMd) btnNoteExportMd.addEventListener('click', async () => {
                if (!noteProjectContext) return;
                const html = await rehydrateNoteImagesInHtmlString(htmlNotaCorrente());
                scaricaBlob(noteHtmlToMarkdown(html), 'text/markdown;charset=utf-8', nomeFileNotaCorrente('md'));
            });
            if (btnNoteExportJson) btnNoteExportJson.addEventListener('click', async () => {
                if (!noteProjectContext) return;
                const proj = state.projects[noteProjectContext.projId];
                const html = await rehydrateNoteImagesInHtmlString(htmlNotaCorrente());
                const payload = {
                    tipo: 'nota_progetto_dpsh', progetto: proj ? (proj.name || proj.comune) : null,
                    html, updatedAt: (proj && proj.notes && proj.notes.updatedAt) || Date.now(),
                };
                scaricaBlob(JSON.stringify(payload, null, 2), 'application/json', nomeFileNotaCorrente('json'));
            });

            // ---- Export PDF: stessa tecnica già usata per il report di prova (finestra formattata
            // + window.print(), l'utente sceglie "Salva come PDF" dal dialogo di stampa) — nessuna
            // libreria PDF aggiuntiva, coerente col resto dell'app. ----
            const btnNoteExportPdf = document.getElementById('btnNoteExportPdf');
            if (btnNoteExportPdf) btnNoteExportPdf.addEventListener('click', async () => {
                if (!noteProjectContext) return;
                const proj = state.projects[noteProjectContext.projId];
                const titolo = `Note — ${proj ? (proj.name || proj.comune || 'Progetto') : 'Progetto'}`;
                try {
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) { alert('⚠️ Consenti i pop-up nel browser per aprire la nota in PDF.'); return; }
                    const html = await rehydrateNoteImagesInHtmlString(htmlNotaCorrente());
                    const dataStr = new Date().toLocaleDateString('it-IT');
                    const fullDoc = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${titolo}</title>
                        <style>
                            body{font-family:Arial,sans-serif;margin:0;background:#fff;}
                            .a4-page{max-width:210mm;margin:0 auto;padding:16mm;box-sizing:border-box;}
                            .note-print-title{font-size:20px;font-weight:800;color:#0f172a;margin-bottom:4px;}
                            .note-print-meta{font-size:11px;color:#64748b;margin-bottom:18px;border-bottom:1px solid #e2e8f0;padding-bottom:10px;}
                            .note-print-body{font-size:13px;line-height:1.7;color:#1e293b;}
                            .note-print-body img{max-width:100%;border-radius:6px;margin:8px 0;}
                            .note-print-body:after{content:"";display:block;clear:both;}
                            .note-print-body h1{font-size:19px;font-weight:800;margin:14px 0 6px;}
                            .note-print-body h2{font-size:16px;font-weight:800;margin:14px 0 6px;}
                            .note-print-body h3{font-size:15px;font-weight:800;margin:14px 0 6px;}
                            .note-print-body ul,
                            .note-print-body ol{padding-left:20px;}
                            .note-print-body li > p{margin:0;}
                            .note-print-body blockquote{margin:8px 0;padding:6px 12px;border-left:3px solid #f59e0b;background:#f8fafc;color:#64748b;font-style:italic;}
                            .note-print-body hr{border:none;border-top:1.5px solid #e2e8f0;margin:14px 0;}
                            .note-print-body a{color:#2563eb;}
                            /* Sul TAG, non sulla classe: e' la stessa dipendenza che dentro
                               l'editor faceva nascere le tabelle senza bordi. E le celle adesso
                               contengono un <p>, che senza questa regola stampa con un margine. */
                            .note-print-body table{border-collapse:collapse;width:100%;margin:8px 0;font-size:12px;}
                            .note-print-body table th, .note-print-body table td{border:1px solid #e2e8f0;padding:5px 7px;text-align:left;vertical-align:top;}
                            .note-print-body table th{background:#f1f5f9;font-weight:700;}
                            .note-print-body table p{margin:0;}
                            .note-print-body .note-check-item{display:flex;align-items:flex-start;gap:8px;margin:3px 0;}
                            .note-print-body .note-check-box{width:14px;height:14px;margin-top:2px;}
                            .note-print-body .note-check-item.checked .note-check-text{text-decoration:line-through;color:#94a3b8;}
                            .note-print-body ul[data-type="taskList"]{list-style:none;padding-left:0;margin:4px 0;}
                            .note-print-body ul[data-type="taskList"] li{display:flex;align-items:flex-start;gap:8px;margin:3px 0;}
                            .note-print-body ul[data-type="taskList"] li > label{flex:0 0 auto;padding-top:2px;}
                            .note-print-body ul[data-type="taskList"] li > div{flex:1;}
                            .note-print-body ul[data-type="taskList"] li > div p{margin:0;}
                            .note-print-body ul[data-type="taskList"] li[data-checked="true"] > div{text-decoration:line-through;color:#94a3b8;}
                            .note-print-body mark{background:#fef08a;color:#111827 !important;}
                            @media print{ .no-print{display:none;} }
                        </style></head>
                        <body>${getIconSpriteHtml()}<div class="a4-page">
                            <div class="no-print" style="margin-bottom:14px;display:flex;justify-content:flex-end;">
                                <button onclick="window.print()" style="background:#f59e0b;color:#fff;border:none;padding:10px 18px;font-weight:800;font-size:14px;border-radius:6px;cursor:pointer;">🖨️ Stampa / Salva in PDF</button>
                            </div>
                            <div class="note-print-title">${titolo}</div>
                            <div class="note-print-meta">Esportato il ${dataStr}</div>
                            <div class="note-print-body">${html || '<p style="color:#94a3b8;">(nota vuota)</p>'}</div>
                        </div></body></html>`;
                    printWindow.document.open();
                    printWindow.document.write(fullDoc);
                    printWindow.document.close();
                } catch(e) {
                    alert('Errore durante la generazione del PDF: ' + e.message);
                }
            });

            // ---- Export Word: tecnica HTML->.doc (namespace "mso", MIME application/msword) —
            // nessuna libreria esterna, funziona offline, Word la apre e la mostra come documento
            // normale e modificabile, immagini incluse (base64 incorporato). ----
            const btnNoteExportDoc = document.getElementById('btnNoteExportDoc');
            if (btnNoteExportDoc) btnNoteExportDoc.addEventListener('click', async () => {
                if (!noteProjectContext) return;
                const proj = state.projects[noteProjectContext.projId];
                const titolo = `Note — ${proj ? (proj.name || proj.comune || 'Progetto') : 'Progetto'}`;
                const html = await rehydrateNoteImagesInHtmlString(htmlNotaCorrente());
                const dataStr = new Date().toLocaleDateString('it-IT');
                const doc = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
                    <head><meta charset="utf-8"><title>${titolo}</title>
                    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
                    <style>
                        body{font-family:Calibri,Arial,sans-serif;font-size:12pt;color:#1e293b;}
                        h1.note-doc-title{font-size:18pt;font-weight:800;color:#0f172a;margin-bottom:2pt;}
                        .meta{font-size:9pt;color:#64748b;margin-bottom:14pt;}
                        .note-body h1{font-size:15pt;font-weight:800;margin:12pt 0 4pt;}
                        .note-body h2{font-size:13.5pt;font-weight:800;margin:11pt 0 4pt;}
                        .note-body h3{font-size:13pt;font-weight:800;margin:12pt 0 4pt;}
                        .note-body blockquote{margin:8pt 0;padding:4pt 10pt;border-left:3pt solid #f59e0b;background:#f8fafc;color:#64748b;font-style:italic;}
                        .note-body hr{border:none;border-top:1pt solid #e2e8f0;margin:12pt 0;}
                        .note-body a{color:#2563eb;}
                        .note-body table{border-collapse:collapse;width:100%;margin:8pt 0;font-size:11pt;}
                        .note-body table th, .note-body table td{border:1pt solid #e2e8f0;padding:4pt 6pt;text-align:left;vertical-align:top;}
                        .note-body table th{background:#f1f5f9;font-weight:700;}
                        .note-body table p{margin:0;}
                        .note-body li > p{margin:0;}
                        .note-body .note-check-item{margin:3pt 0;}
                        .note-body ul[data-type="taskList"]{list-style:none;padding-left:0;margin:4pt 0;}
                        .note-body ul[data-type="taskList"] li{margin:3pt 0;}
                        .note-body ul[data-type="taskList"] li > div p{margin:0;}
                        .note-body ul[data-type="taskList"] li[data-checked="true"] > div{text-decoration:line-through;color:#94a3b8;}
                        .note-body mark{background:#fef08a;color:#111827 !important;}
                        img{max-width:600px;}
                        .note-body:after{content:"";display:block;clear:both;}
                    </style></head>
                    <body>
                        <h1 class="note-doc-title">${titolo}</h1>
                        <div class="meta">Esportato il ${dataStr}</div>
                        <div class="note-body">${html || '<p>(nota vuota)</p>'}</div>
                    </body></html>`;
                scaricaBlob(doc, 'application/msword', nomeFileNotaCorrente('doc'));
            });

            // PARSER EXIF MULTI-SEGMENTO PER ESTRAZIONE COORDINATE GPS
            function parseExifGps(arrayBuffer) {
                try {
                    const view = new DataView(arrayBuffer);
                    if (view.byteLength < 14) return null;
                    if (view.getUint16(0, false) !== 0xFFD8) return null;

                    let offset = 2;
                    const length = view.byteLength;

                    while (offset < length - 4) {
                        const marker = view.getUint16(offset, false);
                        if (marker === 0xFFE1) {
                            const app1Length = view.getUint16(offset + 2, false);
                            if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
                                const tiffOffset = offset + 10;
                                const byteOrder = view.getUint16(tiffOffset, false);
                                let littleEndian = (byteOrder === 0x4949);

                                const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);
                                if (firstIfdOffset >= 8) {
                                    function getRational(ptr) {
                                        const num = view.getUint32(ptr, littleEndian);
                                        const den = view.getUint32(ptr + 4, littleEndian);
                                        return den === 0 ? 0 : num / den;
                                    }

                                    function readGpsIFD(gpsOffset) {
                                        if (gpsOffset <= 0 || tiffOffset + gpsOffset >= length) return null;
                                        const entries = view.getUint16(tiffOffset + gpsOffset, littleEndian);
                                        let lat = null, latRef = 'N', lng = null, lngRef = 'E';

                                        for (let i = 0; i < entries; i++) {
                                            const entryOffset = tiffOffset + gpsOffset + 2 + (i * 12);
                                            if (entryOffset + 12 > length) break;
                                            const tag = view.getUint16(entryOffset, littleEndian);
                                            const valOffset = view.getUint32(entryOffset + 8, littleEndian);

                                            if (tag === 1) {
                                                latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                                            } else if (tag === 2) {
                                                const p = tiffOffset + valOffset;
                                                const deg = getRational(p);
                                                const min = getRational(p + 8);
                                                const sec = getRational(p + 16);
                                                lat = deg + (min / 60) + (sec / 3600);
                                            } else if (tag === 3) {
                                                lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                                            } else if (tag === 4) {
                                                const p = tiffOffset + valOffset;
                                                const deg = getRational(p);
                                                const min = getRational(p + 8);
                                                const sec = getRational(p + 16);
                                                lng = deg + (min / 60) + (sec / 3600);
                                            }
                                        }

                                        if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                                            if (latRef === 'S' || latRef === 's') lat = -lat;
                                            if (lngRef === 'W' || lngRef === 'w') lng = -lng;
                                            return { lat, lng };
                                        }
                                        return null;
                                    }

                                    const ifd0Entries = view.getUint16(tiffOffset + firstIfdOffset, littleEndian);
                                    for (let i = 0; i < ifd0Entries; i++) {
                                        const entryOffset = tiffOffset + firstIfdOffset + 2 + (i * 12);
                                        if (entryOffset + 12 > length) break;
                                        const tag = view.getUint16(entryOffset, littleEndian);
                                        if (tag === 0x8825) {
                                            const gpsPointer = view.getUint32(entryOffset + 8, littleEndian);
                                            const gpsRes = readGpsIFD(gpsPointer);
                                            if (gpsRes) return gpsRes;
                                        }
                                    }
                                }
                            }
                            offset += 2 + app1Length;
                        } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
                            const segLen = view.getUint16(offset + 2, false);
                            offset += 2 + segLen;
                        } else {
                            break;
                        }
                    }
                } catch (e) { ignoraErrore('readGpsIFD', e); }
                return null;
            }

            // Versione estesa di parseExifGps: legge anche la data/ora di scatto (DateTimeOriginal),
            // necessaria per l'interpolazione lineare delle coordinate mancanti nell'import batch
            // (IDEA 4). Riusa la stessa logica di attraversamento IFD, aggiungendo la lettura
            // dell'Exif SubIFD (tag 0x8769) e del tag ASCII DateTimeOriginal (0x9003).
            function parseExifData(arrayBuffer) {
                const result = { lat: null, lng: null, dateTimeOriginal: null };
                try {
                    const view = new DataView(arrayBuffer);
                    if (view.byteLength < 14) return result;
                    if (view.getUint16(0, false) !== 0xFFD8) return result;

                    let offset = 2;
                    const length = view.byteLength;

                    while (offset < length - 4) {
                        const marker = view.getUint16(offset, false);
                        if (marker === 0xFFE1) {
                            const app1Length = view.getUint16(offset + 2, false);
                            if (view.getUint32(offset + 4, false) === 0x45786966 && view.getUint16(offset + 8, false) === 0x0000) {
                                const tiffOffset = offset + 10;
                                const byteOrder = view.getUint16(tiffOffset, false);
                                let littleEndian = (byteOrder === 0x4949);
                                const firstIfdOffset = view.getUint32(tiffOffset + 4, littleEndian);

                                function getRational(ptr) {
                                    const num = view.getUint32(ptr, littleEndian);
                                    const den = view.getUint32(ptr + 4, littleEndian);
                                    return den === 0 ? 0 : num / den;
                                }
                                function readAscii(ptr, count) {
                                    let str = '';
                                    for (let k = 0; k < count; k++) {
                                        const c = view.getUint8(ptr + k);
                                        if (c === 0) break;
                                        str += String.fromCharCode(c);
                                    }
                                    return str;
                                }
                                function readGpsIFD(gpsOffset) {
                                    if (gpsOffset <= 0 || tiffOffset + gpsOffset >= length) return null;
                                    const entries = view.getUint16(tiffOffset + gpsOffset, littleEndian);
                                    let lat = null, latRef = 'N', lng = null, lngRef = 'E';
                                    for (let i = 0; i < entries; i++) {
                                        const entryOffset = tiffOffset + gpsOffset + 2 + (i * 12);
                                        if (entryOffset + 12 > length) break;
                                        const tag = view.getUint16(entryOffset, littleEndian);
                                        const valOffset = view.getUint32(entryOffset + 8, littleEndian);
                                        if (tag === 1) latRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                                        else if (tag === 2) {
                                            const p = tiffOffset + valOffset;
                                            lat = getRational(p) + (getRational(p + 8) / 60) + (getRational(p + 16) / 3600);
                                        } else if (tag === 3) lngRef = String.fromCharCode(view.getUint8(entryOffset + 8));
                                        else if (tag === 4) {
                                            const p = tiffOffset + valOffset;
                                            lng = getRational(p) + (getRational(p + 8) / 60) + (getRational(p + 16) / 3600);
                                        }
                                    }
                                    if (lat !== null && lng !== null && !isNaN(lat) && !isNaN(lng)) {
                                        if (latRef === 'S' || latRef === 's') lat = -lat;
                                        if (lngRef === 'W' || lngRef === 'w') lng = -lng;
                                        return { lat, lng };
                                    }
                                    return null;
                                }
                                function readExifSubIFDDate(exifOffset) {
                                    if (exifOffset <= 0 || tiffOffset + exifOffset >= length) return null;
                                    const entries = view.getUint16(tiffOffset + exifOffset, littleEndian);
                                    for (let i = 0; i < entries; i++) {
                                        const entryOffset = tiffOffset + exifOffset + 2 + (i * 12);
                                        if (entryOffset + 12 > length) break;
                                        const tag = view.getUint16(entryOffset, littleEndian);
                                        if (tag === 0x9003 || tag === 0x9004) {
                                            const count = view.getUint32(entryOffset + 4, littleEndian);
                                            const p = (count <= 4) ? (entryOffset + 8) : (tiffOffset + view.getUint32(entryOffset + 8, littleEndian));
                                            const str = readAscii(p, count);
                                            if (str) return str;
                                        }
                                    }
                                    return null;
                                }

                                if (firstIfdOffset >= 8) {
                                    const ifd0Entries = view.getUint16(tiffOffset + firstIfdOffset, littleEndian);
                                    for (let i = 0; i < ifd0Entries; i++) {
                                        const entryOffset = tiffOffset + firstIfdOffset + 2 + (i * 12);
                                        if (entryOffset + 12 > length) break;
                                        const tag = view.getUint16(entryOffset, littleEndian);
                                        if (tag === 0x8825) {
                                            const gpsRes = readGpsIFD(view.getUint32(entryOffset + 8, littleEndian));
                                            if (gpsRes) { result.lat = gpsRes.lat; result.lng = gpsRes.lng; }
                                        } else if (tag === 0x8769) {
                                            const dateStr = readExifSubIFDDate(view.getUint32(entryOffset + 8, littleEndian));
                                            if (dateStr) result.dateTimeOriginal = dateStr;
                                        }
                                    }
                                }
                            }
                            offset += 2 + app1Length;
                        } else if ((marker & 0xFF00) === 0xFF00 && marker !== 0xFFD8 && marker !== 0xFFD9) {
                            const segLen = view.getUint16(offset + 2, false);
                            offset += 2 + segLen;
                        } else {
                            break;
                        }
                    }
                } catch (e) { ignoraErrore('readExifSubIFDDate', e); }
                return result;
            }

            // Converte una data EXIF "YYYY:MM:DD HH:MM:SS" in timestamp (ms). Ritorna null se non valida.
            function parseExifDateStr(s) {
                if (!s) return null;
                const m = s.match(/^(\d{4}):(\d{2}):(\d{2})\s(\d{2}):(\d{2}):(\d{2})/);
                if (!m) return null;
                const t = new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]).getTime();
                return isNaN(t) ? null : t;
            }


            const filePhotoInputCamera = document.getElementById('filePhotoInputCamera');
            const filePhotoInputGallery = document.getElementById('filePhotoInputGallery');
            const lblPhotoCount = document.getElementById('lblPhotoCount');

            const modalPhotoOverlay = document.getElementById('modalPhotoOverlay');
            const modalPhotoPreview = document.getElementById('modalPhotoPreview');
            const imgFullPreview = document.getElementById('imgFullPreview');
            const lblPhotoTitle = document.getElementById('lblPhotoTitle');
            const lblPhotoGpsMeta = document.getElementById('lblPhotoGpsMeta');
            const btnImportPhotoGps = document.getElementById('btnImportPhotoGps');
            const btnRitagliaFoto = document.getElementById('btnRitagliaFoto');
            if (btnRitagliaFoto) {
                // Ritagliare la foto QUI la ritaglia dappertutto: i blocchi foto, il report e il
                // PDF non tengono una copia loro, leggono tutti da questo stesso archivio.
                btnRitagliaFoto.addEventListener('click', async () => {
                    const p = state.photos && state.photos[currentPreviewPhotoIdx];
                    if (!p || !p.id) return;
                    await ritagliaImmagineArchiviata({
                        id: p.id,
                        titolo: 'Ritaglia la foto',
                        leggi: getPhotoFromIDB,
                        scrivi: savePhotoToIDB,
                        cache: photoMemoryCache,
                        onFatto: (nuova) => {
                            p.dataUrl = nuova;
                            saveState();
                            if (typeof renderPhotoGallery === 'function') renderPhotoGallery();
                            if (imgFullPreview) imgFullPreview.src = nuova;
                        }
                    });
                });
            }
            const btnClosePhotoPreview = document.getElementById('btnClosePhotoPreview');

            let currentPreviewPhotoIdx = -1;

            // Gestisce il file selezionato/scattato, indipendentemente dalla sorgente (fotocamera o galleria)
            function handlePhotoFileSelected(file, sourceInput) {
                if (!file) return;

                const now = new Date();
                const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                const photoId = 'photo_' + Date.now();

                // 1. Legge il file in ArrayBuffer per analizzare metadati EXIF GPS (Outer Reader)
                const bufferReader = new FileReader();
                bufferReader.onload = (bEvt) => {
                    let exifGps = null;
                    try { exifGps = parseExifGps(bEvt.target.result); } catch (err) { ignoraErrore('handlePhotoFileSelected', err); }

                    // 2. Legge l'immagine in DataURL SENZA alcuna compressione (Inner Reader)
                    const dataReader = new FileReader();
                    dataReader.onload = async (dEvt) => {
                        const rawDataUrl = dEvt.target.result;
                        if (!rawDataUrl) return;

                        // Cascata di fallback (IDEA 1): EXIF > GPS live del dispositivo > GPS statico del cantiere
                        let photoLat, photoLng, gpsSource;
                        if (exifGps) {
                            photoLat = exifGps.lat; photoLng = exifGps.lng; gpsSource = 'exif';
                        } else if (liveGpsWatch.lat !== null && liveGpsWatch.lng !== null) {
                            photoLat = liveGpsWatch.lat; photoLng = liveGpsWatch.lng; gpsSource = 'live';
                        } else if (state.header.lat !== null && state.header.lat !== undefined && state.header.lat !== '') {
                            photoLat = state.header.lat; photoLng = state.header.lng; gpsSource = 'cantiere';
                        } else {
                            photoLat = null; photoLng = null; gpsSource = null;
                        }
                        const photoAlt = state.header.alt;

                        if (!state.photos) state.photos = [];
                        state.photos.push({
                            id: photoId,
                            dataUrl: rawDataUrl,
                            lat: photoLat,
                            lng: photoLng,
                            alt: photoAlt,
                            hasExifGps: !!exifGps,
                            gpsSource: gpsSource,
                            timestamp: `${now.toLocaleDateString()} ${timeStr}`,
                            // L'ora senza ambiguità (forma 2): `timestamp` è testo nell'ora locale
                            // del telefono, e su un PC in un altro fuso non si saprebbe più leggere.
                            scattataIl: now.toISOString()
                        });

                        saveState();
                        updateUI();
                        triggerVibrate([40, 40]);
                        if (sourceInput) sourceInput.value = '';

                        // Salvataggio VERIFICATO (non più "in background" e sperare): si attende la
                        // scrittura e la si ricontrolla rileggendola. Se fallisce, l'utente lo sa
                        // subito — mentre è ancora davanti al punto in cui ha scattato — e può
                        // mettere la foto al sicuro nei Download. Prima questa riga era
                        // `try { savePhotoToIDB(...) } catch {}` senza await: un try/catch sincrono
                        // non intercetta una funzione asincrona, quindi una foto non scritta
                        // spariva in silenzio. Volutamente DOPO updateUI: la foto compare subito in
                        // galleria e l'eventuale avviso arriva un attimo dopo, senza far sembrare
                        // che lo scatto non sia riuscito.
                        const alSicuro = await salvaFotoConGaranzia(photoId, rawDataUrl);
                        if (!alSicuro) {
                            await avvisaFotoNonSalvate([{ id: photoId, dataUrl: rawDataUrl, nome: `Foto_${timeStr.replace(/[:.]/g, '-')}` }]);
                        }

                        // IDEA 3: se nessuna coordinata è stata trovata, apre subito il fallback intelligente
                        if (photoLat === null || photoLng === null) {
                            openPhotoGpsFallbackModal(photoId);
                        }
                    };
                    dataReader.readAsDataURL(file);
                };
                bufferReader.readAsArrayBuffer(file);
            }

            // Gli input nascosti nel modal attivano la cattura
            if (filePhotoInputCamera) {
                filePhotoInputCamera.addEventListener('change', (e) => {
                    handlePhotoFileSelected(e.target.files[0], filePhotoInputCamera);
                });
            }

            if (filePhotoInputGallery) {
                filePhotoInputGallery.addEventListener('change', (e) => {
                    handlePhotoFileSelected(e.target.files[0], filePhotoInputGallery);
                });
            }

            async function renderPhotoGallery() {
                if (!state.photos) state.photos = [];
                if (lblPhotoCount) lblPhotoCount.textContent = state.photos.length;

                // La spia delle foto nella testata (Fase 3): «N foto» neutra, tratteggiata se 0.
                // Prima era una ❌ rossa, che faceva sembrare un errore una prova ancora senza foto.
                if (typeof aggiornaSpieProva === 'function') aggiornaSpieProva();

                const modalGalleryContainer = document.getElementById('modalPhotoGalleryContainer');
                const targetContainers = [modalGalleryContainer].filter(Boolean);
                if (targetContainers.length === 0) return;

                if (state.photos.length === 0) {
                    targetContainers.forEach(container => {
                        container.innerHTML = `
                            <div style="grid-column: 1 / -1; text-align: center; color: var(--text-muted); padding: 14px; font-size: 11px; background: var(--bg-card-hover); border-radius: var(--radius-sm);">
                                Nessuna foto allegata. Scatta o seleziona una foto dal cantiere!
                            </div>`;
                    });
                    return;
                }

                // Garantisce che l'URL dell'immagine in memoria sia popolato prima del rendering HTML
                for (let p of state.photos) {
                    if (!p.dataUrl && photoMemoryCache[p.id]) {
                        p.dataUrl = photoMemoryCache[p.id];
                    }
                    if (!p.dataUrl) {
                        try {
                            const idbUrl = await getPhotoFromIDB(p.id);
                            if (idbUrl) {
                                p.dataUrl = idbUrl;
                                photoMemoryCache[p.id] = idbUrl;
                            }
                        } catch (e) { ignoraErrore('renderPhotoGallery', e); }
                    }
                }

                const galleryHtml = state.photos.map((p, idx) => {
                    const imgSrc = p.dataUrl || photoMemoryCache[p.id] || '';
                    const hasGpsData = !!(p.lat && p.lng);
                    const gpsBadgeIcon = !hasGpsData ? '' : (p.hasExifGps ? ico('satellite') : ico('pin'));
                    const gpsBadgeTitle = !hasGpsData ? '' : (p.hasExifGps ? 'GPS da EXIF foto' : 'GPS da prova al momento dello scatto');
                    return `
                        <div style="position: relative; border-radius: var(--radius-sm); overflow: hidden; border: 1px solid var(--border); background: #0f172a; aspect-ratio: 1 / 1;">
                            <img src="${imgSrc}" data-photo-idx="${idx}" class="photo-thumb-img" style="width: 100%; height: 100%; object-fit: cover; cursor: pointer; display: block;">
                            ${hasGpsData ? `<div title="${gpsBadgeTitle}" style="position: absolute; top: 3px; left: 3px; background: rgba(15,23,42,0.7); border-radius: 4px; padding: 1px 4px; font-size: 10px; line-height: 1.4;">${gpsBadgeIcon}</div>` : ''}
                            <div style="position: absolute; bottom: 0; left: 0; right: 0; background: rgba(15,23,42,0.85); padding: 2px 4px; font-size: 9px; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                                ${ico('calendar')} ${p.timestamp}
                            </div>
                            <button class="btn-del-photo" data-photo-id="${p.id}" data-photo-idx="${idx}" style="position: absolute; top: 3px; right: 3px; background: rgba(239,68,68,0.85); color: #fff; border: none; border-radius: 50%; width: 22px; height: 22px; font-size: 10px; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                                ✕
                            </button>
                        </div>
                    `;
                }).join('');

                targetContainers.forEach(container => {
                    container.innerHTML = galleryHtml;

                    container.querySelectorAll('.photo-thumb-img').forEach(img => {
                        img.addEventListener('click', (e) => {
                            const idx = parseInt(e.currentTarget.getAttribute('data-photo-idx'));
                            openPhotoPreview(idx);
                        });
                    });

                    container.querySelectorAll('.btn-del-photo').forEach(btn => {
                        btn.addEventListener('click', (e) => {
                            e.stopPropagation();
                            const idx = parseInt(e.currentTarget.getAttribute('data-photo-idx'));
                            const id = e.currentTarget.getAttribute('data-photo-id');
                            deletePhoto(idx, id);
                        });
                    });
                });
            }

            async function openPhotoPreview(idx) {
                if (!state.photos || !state.photos[idx]) return;
                currentPreviewPhotoIdx = idx;
                const p = state.photos[idx];
                
                // Carica la foto 100% originale non compressa da Cache RAM o IndexedDB
                const fullDataUrl = p.dataUrl || photoMemoryCache[p.id] || await getPhotoFromIDB(p.id);
                if (fullDataUrl) photoMemoryCache[p.id] = fullDataUrl;
                imgFullPreview.src = fullDataUrl || '';
                lblPhotoTitle.innerHTML = `${ico('camera')} Foto Cantiere ${idx + 1}/${state.photos.length}`;

                const gpsSourceLabel = p.hasExifGps ? '(da EXIF foto)' : '(da GPS prova al momento dello scatto)';
                // NOTA: qui va usato innerHTML e non textContent, altrimenti il markup delle icone
                // verrebbe mostrato come testo letterale invece di essere renderizzato.
                // Le coordinate vengono convertite con Number() perché, se assegnate manualmente
                // (mappa, incolla, GPS del cantiere), possono essere stringhe e .toFixed() fallirebbe.
                const pLat = (p.lat !== null && p.lat !== undefined && p.lat !== '') ? Number(p.lat) : null;
                const pLng = (p.lng !== null && p.lng !== undefined && p.lng !== '') ? Number(p.lng) : null;
                const hasCoords = (pLat !== null && pLng !== null && !isNaN(pLat) && !isNaN(pLng));

                const gpsInfo = hasCoords
                    ? `${ico('pin')} GPS Foto: ${pLat.toFixed(6)}, ${pLng.toFixed(6)} ${gpsSourceLabel}`
                    : `${ico('pin')} Nessuna coordinata GPS registrata per questa foto`;
                lblPhotoGpsMeta.innerHTML = `${gpsInfo} • ${ico('calendar')} ${p.timestamp}`;

                if (hasCoords && btnImportPhotoGps) {
                    btnImportPhotoGps.style.display = 'block';
                    btnImportPhotoGps.innerHTML = `${ico('pin')} Importa GPS (${pLat.toFixed(5)}, ${pLng.toFixed(5)}) nella Prova`;
                } else if (btnImportPhotoGps) {
                    btnImportPhotoGps.style.display = 'none';
                }

                // Chiude la finestra del menù Foto per fare spazio al dettaglio della foto selezionata
                if (modalSurveyPhotosOverlay) modalSurveyPhotosOverlay.classList.remove('open');
                if (modalSurveyPhotos) modalSurveyPhotos.classList.remove('open');

                modalPhotoOverlay.classList.add('open');
                modalPhotoPreview.classList.add('open');
            }

            if (btnImportPhotoGps) {
                btnImportPhotoGps.addEventListener('click', () => {
                    if (currentPreviewPhotoIdx >= 0 && state.photos[currentPreviewPhotoIdx]) {
                        const p = state.photos[currentPreviewPhotoIdx];
                        if (p.lat && p.lng) {
                            state.header.lat = p.lat;
                            state.header.lng = p.lng;
                            if (p.alt) state.header.alt = p.alt;
                            saveState();
                            updateUI();
                            triggerVibrate([40, 40, 40]);
                            mostraToast(`Coordinate GPS della prova aggiornate: ${p.lat.toFixed(6)}, ${p.lng.toFixed(6)}`);
                        }
                    }
                });
            }

            function closePhotoPreview() {
                modalPhotoOverlay.classList.remove('open');
                modalPhotoPreview.classList.remove('open');
                currentPreviewPhotoIdx = -1;
            }

            // Chiude il dettaglio foto e torna al menù Foto da cui si proveniva
            function backToPhotosModalFromPreview() {
                closePhotoPreview();
                openSurveyPhotosModal();
            }

            async function deletePhoto(idx, id) {
                if (!state.photos || !state.photos[idx]) return;

                const ok = await appConfirmDelete('Eliminare questa foto dal cantiere?');
                if (!ok) return;
                if (!state.photos || !state.photos[idx]) return;

                copiaPrimaDi('eliminare una foto');
                const targetId = id || state.photos[idx].id;
                const backupPhoto = JSON.parse(JSON.stringify(state.photos[idx]));
                // Recupera il contenuto dell'immagine prima di rimuoverla, così l'annullamento
                // può ripristinarla anche se nel frattempo non era in cache.
                const backupDataUrl = backupPhoto.dataUrl || photoMemoryCache[targetId] || await getPhotoFromIDB(targetId);

                state.photos.splice(idx, 1);
                saveState();
                updateUI();
                if (typeof renderPhotoGallery === 'function') renderPhotoGallery();
                closePhotoPreview();

                showUndoBanner('Foto eliminata', async () => {
                    if (!state.photos) state.photos = [];
                    state.photos.splice(idx, 0, backupPhoto);
                    saveState();
                    updateUI();
                    if (typeof renderPhotoGallery === 'function') renderPhotoGallery();
                    // Ripristino verificato: annullare l'eliminazione deve riportare la foto per
                    // davvero, non solo nell'elenco. Se la riscrittura non riesce la voce resterebbe
                    // in galleria puntando al nulla — un "annulla" che mente è peggio di un annulla
                    // assente, perché smetti di controllare.
                    if (backupDataUrl) {
                        const alSicuro = await salvaFotoConGaranzia(targetId, backupDataUrl);
                        if (!alSicuro) await avvisaFotoNonSalvate([{ id: targetId, dataUrl: backupDataUrl, nome: backupPhoto && backupPhoto.name ? backupPhoto.name : 'Foto_ripristinata' }]);
                    }
                });

                // Rimozione definitiva dallo storage solo se l'annullamento non viene usato E se
                // nessun'altra prova usa ancora la stessa foto. "Duplica progetto" copia i
                // riferimenti, non le immagini: prima qui si guardava solo la prova aperta, e
                // cancellare una foto da una copia la cancellava anche dall'altra.
                setTimeout(() => {
                    const inUso = (typeof idFotoAncoraInUso === 'function') ? idFotoAncoraInUso() : null;
                    const ancoraUsata = inUso ? inUso.has(targetId) : (state.photos || []).some(p => p && p.id === targetId);
                    if (!ancoraUsata) {
                        deletePhotoFromIDB(targetId).catch(() => {});
                        delete photoMemoryCache[targetId];
                    }
                }, 11000);
            }

            if (btnClosePhotoPreview) btnClosePhotoPreview.addEventListener('click', backToPhotosModalFromPreview);
            if (modalPhotoOverlay) modalPhotoOverlay.addEventListener('click', backToPhotosModalFromPreview);

            // AGGIUNTA MANUALE DI UN NUOVO STEP COMPLETO VIA FINESTRA MODALE
            if (btnAddRowManual) btnAddRowManual.addEventListener('click', () => {
                editingIndex = -1;
                const stepM = state.settings.stepCm / 100;
                const start = state.currentDepthStart;
                const end = start + stepM;

                numModalStart.value = start.toFixed(2);
                numModalEnd.value = end.toFixed(2);
                numModalColpi.value = '';
                txtModalNote.value = '';

                populateStratiDropdown();
                if (selModalLithology) selModalLithology.value = '';

                const modalTitle = document.querySelector('#modalEditStep .modal-title');
                if (modalTitle) modalTitle.textContent = 'Aggiungi intervallo';

                modalOverlay.classList.add('open');
                modalEditStep.classList.add('open');

                setTimeout(() => {
                    if (numModalColpi) {
                        numModalColpi.focus();
                        numModalColpi.select();
                    }
                }, 150);
            });

            // MODAL EDITING MANUALE COMPLETO (DA, A, COLPI, NOTE)
            // senzaTastiera: aperta toccando una riga (Fase 6) la scheda non chiama la tastiera; per
            // correggere un colpo bastano − e +.
            function openEditModal(idx, { senzaTastiera = false } = {}) {
                editingIndex = idx;
                const item = state.logs[idx];
                if (!item) return;

                const modalTitle = document.querySelector('#modalEditStep .modal-title');
                if (modalTitle) modalTitle.textContent = 'Modifica intervallo';

                numModalStart.value = item.start.toFixed(2);
                numModalEnd.value = item.end.toFixed(2);
                numModalColpi.value = item.colpi === 0 ? '' : item.colpi; // Vuoto per aprire il tastierino pulito!
                txtModalNote.value = item.note || '';
                
                // Popola dropdown strati e seleziona litologia specifica dello step
                populateStratiDropdown();
                if (selModalLithology) selModalLithology.value = item.lithology || '';
                document.getElementById('lblModalOrigine').textContent = origineIntervallo(item);

                modalOverlay.classList.add('open');
                modalEditStep.classList.add('open');

                if (senzaTastiera) return;
                // Focus e selezione istantanea del campo Numero Colpi per apertura tastierino immediato
                setTimeout(() => {
                    if (numModalColpi) {
                        numModalColpi.focus();
                        numModalColpi.select();
                    }
                }, 150);
            }

            // «Registrato col contatore il 26/09/2026 alle 11:42 · corretto il …» (tracciabilità, 004d).
            // Gli intervalli di prima della Fase 1 non hanno la data: non si inventa.
            function origineIntervallo(item) {
                const quando = iso => {
                    const d = new Date(iso);
                    return isNaN(d) ? '' : `il ${d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' })} alle ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
                };
                const come = { 'contatore': 'col contatore', 'inserimento-multiplo': 'con Aggiungi intervalli', 'modifica-manuale': 'a mano', 'import': 'da un file importato' }[item.origine];
                const parti = [];
                if (item.registratoIl) parti.push(['Registrato', come, quando(item.registratoIl)].filter(Boolean).join(' '));
                if (item.modificatoIl) parti.push(['corretto', quando(item.modificatoIl)].filter(Boolean).join(' '));
                return parti.join(' · ');
            }
            [['btnModalColpiMeno', -1], ['btnModalColpiPiu', 1]].forEach(([id, passo]) => {
                document.getElementById(id).addEventListener('click', () => {
                    numModalColpi.value = Math.max(0, (parseInt(numModalColpi.value, 10) || 0) + passo);
                    triggerVibrate(20);
                });
            });

            // Premendo Invio/Enter nel campo Numero Colpi -> Salva e chiudi istantaneo
            if (numModalColpi) {
                numModalColpi.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        btnModalSave.click();
                    }
                });
            }

            // Tasti Note Rapide dentro il modale di modifica
            document.querySelectorAll('.btn-modal-tag').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const tag = btn.getAttribute('data-note');
                    if (txtModalNote) {
                        const cur = txtModalNote.value.trim();
                        txtModalNote.value = cur ? `${cur}, ${tag}` : tag;
                    }
                });
            });

            function closeModal() {
                if (modalOverlay) modalOverlay.classList.remove('open');
                if (modalEditStep) modalEditStep.classList.remove('open');
                editingIndex = -1;
            }

            if (btnModalCancel) btnModalCancel.addEventListener('click', closeModal);
            if (modalOverlay) modalOverlay.addEventListener('click', closeModal);
            if (btnCloseEditModalX) btnCloseEditModalX.addEventListener('click', closeModal);

            if (btnModalDelete) {
                btnModalDelete.addEventListener('click', () => {
                    try {
                        if (editingIndex >= 0 && editingIndex < state.logs.length) {
                            deleteLogStep(editingIndex);
                        }
                    } finally {
                        closeModal();
                    }
                });
            }

            if (btnModalSave) {
                btnModalSave.addEventListener('click', () => {
                    try {
                        if (editingIndex >= 0 && editingIndex < state.logs.length) {
                            const misuraPrima = misuraDiIntervallo(state.logs[editingIndex]);
                            const endDepth = parseFloat(numModalEnd.value) || 0;
                            state.logs[editingIndex].start = parseFloat(numModalStart.value) || 0;
                            state.logs[editingIndex].end = endDepth;
                            state.logs[editingIndex].colpi = Math.max(0, parseInt(numModalColpi.value) || 0);
                            state.logs[editingIndex].asta = getRodForDepth(endDepth);
                            state.logs[editingIndex].note = txtModalNote.value.trim();
                            if (selModalLithology) {
                                state.logs[editingIndex].lithology = selModalLithology.value || '';
                            }
                            // Solo se qualcosa è cambiato davvero: riaprire e salvare non è una modifica.
                            segnaIntervalloModificato(state.logs[editingIndex], misuraPrima);

                            triggerVibrate(40);
                            saveState();
                            updateUI();
                        } else {
                            // Salva un NUOVO step creato da dialog modal (editingIndex === -1)
                            const startDepth = parseFloat(numModalStart.value) || state.currentDepthStart;
                            const stepM = state.settings.stepCm / 100;
                            const endDepth = parseFloat(numModalEnd.value) || (startDepth + stepM);
                            const colpi = Math.max(0, parseInt(numModalColpi.value) || 0);
                            const note = txtModalNote.value.trim();
                            const lithology = selModalLithology ? selModalLithology.value || '' : '';

                            state.logs.push(nuovoIntervallo({
                                start: startDepth,
                                end: endDepth,
                                colpi: colpi,
                                asta: getRodForDepth(endDepth),
                                note: note,
                                lithology: lithology
                            }, 'modifica-manuale'));

                            state.currentDepthStart = endDepth;
                            state.currentRod = getRodForDepth(endDepth + stepM);

                            triggerVibrate([40, 60]);
                            saveState();
                            updateUI();
                        }
                    } finally {
                        closeModal();
                    }
                });
            }

            // updateFaldaDot RIMOSSA: mostrava un pallino "falda impostata" su un elemento
            // (#dotFaldaSet) che non esiste più nella pagina, quindi non faceva nulla da tempo.
            // L'informazione è comunque visibile: il tasto Falda nell'header del Registro
            // Misurazioni e la linea nel grafico dicono già se la falda è stata impostata.

            // I blocchi dei tasti #btnSetFalda e #btnResetFalda sono stati RIMOSSI: quei due
            // pulsanti non esistono più nella pagina da quando la falda si imposta dal tasto
            // dedicato nell'header del Registro Misurazioni (modale rapida Falda, vedi
            // openQuickFaldaModal poco sotto). Il codice restava agganciato a elementi mai
            // trovati, quindi non veniva mai eseguito: nessun comportamento cambia.

            // MODAL RAPIDO FALDA: richiamabile con un tocco dai pannelli Registro Integrato e Grafico,
            // senza dover aprire il drawer ☰. Sincronizzato con gli stessi campi del drawer.
            const modalQuickFaldaOverlay = document.getElementById('modalQuickFaldaOverlay');
            const modalQuickFalda = document.getElementById('modalQuickFalda');
            const numQuickFaldaDa = document.getElementById('numQuickFaldaDa');
            const numQuickFaldaA = document.getElementById('numQuickFaldaA');
            const btnCloseQuickFaldaX = document.getElementById('btnCloseQuickFaldaX');
            const btnQuickFaldaReset = document.getElementById('btnQuickFaldaReset');
            const btnQuickFaldaSave = document.getElementById('btnQuickFaldaSave');

            function openQuickFaldaModal() {
                if (numQuickFaldaDa) numQuickFaldaDa.value = state.header.faldaDa || '';
                if (numQuickFaldaA) numQuickFaldaA.value = state.header.faldaA || '';
                if (modalQuickFaldaOverlay) modalQuickFaldaOverlay.classList.add('open');
                if (modalQuickFalda) modalQuickFalda.classList.add('open');
            }
            function closeQuickFaldaModal() {
                if (modalQuickFaldaOverlay) modalQuickFaldaOverlay.classList.remove('open');
                if (modalQuickFalda) modalQuickFalda.classList.remove('open');
            }

            // La falda si imposta dalla sua spia nella testata della prova (Fase 3): prima stava nella
            // barra del Registro, cioè sotto il contatore e spesso fuori dallo schermo.
            const btnSpiaFalda = document.getElementById('btnSpiaFalda');
            if (btnSpiaFalda) btnSpiaFalda.addEventListener('click', openQuickFaldaModal);
            if (btnCloseQuickFaldaX) btnCloseQuickFaldaX.addEventListener('click', closeQuickFaldaModal);
            if (modalQuickFaldaOverlay) modalQuickFaldaOverlay.addEventListener('click', closeQuickFaldaModal);

            if (btnQuickFaldaSave) {
                btnQuickFaldaSave.addEventListener('click', () => {
                    state.header.faldaDa = numQuickFaldaDa.value;
                    state.header.faldaA = numQuickFaldaA.value;
                    triggerVibrate(30);
                    saveState();
                    updateUI();
                    closeQuickFaldaModal();
                });
            }
            if (btnQuickFaldaReset) {
                btnQuickFaldaReset.addEventListener('click', async () => {
                    if (!state.header.faldaDa && !state.header.faldaA) {
                        closeQuickFaldaModal();
                        return;
                    }
                    const ok = await appConfirmDelete('Azzerare i dati della falda acquifera per questa prova?\n\nLa linea della falda scomparirà dal grafico.');
                    if (!ok) return;
                    copiaPrimaDi('azzerare la falda');
                    {
                        const backupFaldaDa = state.header.faldaDa;
                        const backupFaldaA = state.header.faldaA;
                        state.header.faldaDa = '';
                        state.header.faldaA = '';
                        if (numQuickFaldaDa) numQuickFaldaDa.value = '';
                        if (numQuickFaldaA) numQuickFaldaA.value = '';
                        triggerVibrate(40);
                        saveState();
                        updateUI();
                        closeQuickFaldaModal();

                        showUndoBanner('Dati falda azzerati', () => {
                            state.header.faldaDa = backupFaldaDa;
                            state.header.faldaA = backupFaldaA;
                            if (numQuickFaldaDa) numQuickFaldaDa.value = backupFaldaDa;
                            if (numQuickFaldaA) numQuickFaldaA.value = backupFaldaA;
                            saveState();
                            updateUI();
                        });
                    }
                });
            }

            // TASTO RESET FALDA NEL DRAWER: azzera Falda Da/A dall'intestazione della prova

            // GESTIONE STRATI MODAL: apertura, aggiunta, chiusura
            const btnManageStrati = document.getElementById('btnManageStrati');
            const modalStratiOverlay = document.getElementById('modalStratiOverlay');
            const modalManageStrati = document.getElementById('modalManageStrati');
            const btnAddStrato = document.getElementById('btnAddStrato');
            const btnCloseStrati = document.getElementById('btnCloseStrati');

            function openStratiModal() {
                renderStratiList();
                modalStratiOverlay.classList.add('open');
                modalManageStrati.classList.add('open');
                document.body.classList.add('drawer-open');
            }

            function closeStratiModal() {
                modalStratiOverlay.classList.remove('open');
                modalManageStrati.classList.remove('open');
                document.body.classList.remove('drawer-open');
                // Rigenera dropdown strati nel modale edit
                populateStratiDropdown();
                if (editingIndex >= 0 && editingIndex < state.logs.length) {
                    selModalLithology.value = state.logs[editingIndex].lithology || '';
                }
                updateUI();
            }

            const btnOpenStratiHeader = document.getElementById('btnOpenStratiHeader');
            if (btnManageStrati) btnManageStrati.addEventListener('click', openStratiModal);
            if (btnOpenStratiHeader) btnOpenStratiHeader.addEventListener('click', openStratiModal);

            // Note di Progetto raggiungibili anche direttamente dalla schermata di conteggio
            // (prima erano apribili solo dalla card progetto in Home): stesso editor, stesso
            // progetto corrente (state.currentProjectId), nessuna duplicazione di logica.
            const btnOpenProjectNotesHeader = document.getElementById('btnOpenProjectNotesHeader');
            if (btnOpenProjectNotesHeader) {
                btnOpenProjectNotesHeader.addEventListener('click', () => {
                    if (state.currentProjectId && typeof apriNoteProgetto === 'function') {
                        apriNoteProgetto(state.currentProjectId);
                    }
                });
            }
            if (btnCloseStrati) btnCloseStrati.addEventListener('click', closeStratiModal);
            if (modalStratiOverlay) modalStratiOverlay.addEventListener('click', closeStratiModal);

            // Box informativi collassabili (Gestione dei dati litologici + Parametri avanzati):
            // un singolo listener delegato basta per tutti, presenti o generati in futuro.
            document.addEventListener('click', (e) => {
                const toggle = e.target.closest('.info-collapsible-toggle');
                if (!toggle) return;
                const box = toggle.closest('.info-collapsible');
                if (box) box.classList.toggle('open');
            });

            if (btnAddStrato) {
                btnAddStrato.addEventListener('click', () => {
                    const newIdx = state.strati.length + 1;
                    const hueColors = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];
                    const color = hueColors[(state.strati.length - 1) % hueColors.length];
                    const newId = 'strato_' + Date.now();
                    state.strati.push({
                        id: newId,
                        name: 'Strato ' + newIdx,
                        color: color
                    });
                    stratiRowExpanded.add(newId);
                    saveState();
                    renderStratiList();
                });
            }

