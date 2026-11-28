            // DTM PER LE PROVE: dalle coordinate di tutte le prove del progetto si ricava dove sono
            // (regione, provincia, riquadro, coordinate UTM) e quali fonti di DTM le coprono, nazionali e
            // della regione. Per ognuna: il tipo (DTM o DSM), come è fatto, la risoluzione, la licenza, le
            // tessere da chiedere per queste prove e tre comandi: apri la pagina, carica nel progetto,
            // scarica. Tutto finisce anche in una scheda di testo, per cercare il DTM fuori dall'app.
            //
            // Il catalogo è scritto qui, non cercato in rete: i portali non hanno un indice comune. Le
            // voci dicono come sono state controllate. Caricare direttamente si può solo dove il servizio
            // dà le quote a una macchina (tessere di quota, GeoTIFF in rete, WCS) e lascia che una
            // pagina le legga (CORS): nel browser del PC molti portali non lo permettono, e allora
            // restano «Scarica» e «Apri la pagina».

            const DTM_DATA_CATALOGO = '10/10/2026';
            const REGIONI_ITALIA = { 1: 'Piemonte', 2: 'Valle d\'Aosta', 3: 'Lombardia', 4: 'Trentino-Alto Adige', 5: 'Veneto', 6: 'Friuli-Venezia Giulia', 7: 'Liguria', 8: 'Emilia-Romagna', 9: 'Toscana', 10: 'Umbria', 11: 'Marche', 12: 'Lazio', 13: 'Abruzzo', 14: 'Molise', 15: 'Campania', 16: 'Puglia', 17: 'Basilicata', 18: 'Calabria', 19: 'Sicilia', 20: 'Sardegna' };

            // verifica: 'provato' = indirizzo aperto e dati letti il giorno del catalogo; 'catalogo' = la
            // scheda del dato è nei cataloghi ufficiali (RNDT, INSPIRE), l'indirizzo non l'ho potuto
            // aprire; 'da provare' = portale noto, prodotti e indirizzo da confermare.
            const FONTI_DTM = [
                { id: 'copernicus30', nome: 'Copernicus DEM GLO-30', ente: 'Programma Copernicus (ESA, Airbus)', ambito: 'IT',
                  tipi: ['DSM'], tecnica: 'radar da satellite (TanDEM-X)', risoluzione: '30 m (1″)', ris: 30, copertura: 'tutta Italia',
                  licenza: 'libera, con citazione della fonte', crs: 'geo', sistema: 'gradi WGS84 (EPSG:4326), quote EGM2008',
                  pagina: 'https://registry.opendata.aws/copernicus-dem/', tessere: 'copernicus', carica: 'cog', scarica: 'tessere',
                  nota: 'È la superficie: tetti e chiome comprese. In aperta campagna va bene per la forma del terreno, non per quote al decimetro. Tessere da 1° × 1°, GeoTIFF da circa 40 MB: caricando se ne leggono solo i pezzi attorno alle prove.',
                  verifica: 'provato' },
                { id: 'terrarium', nome: 'Tessere di quota Terrarium', ente: 'Mapzen / Tilezen, su AWS Open Data', ambito: 'IT',
                  tipi: ['DTM'], tecnica: 'mosaico di modelli pubblici (SRTM, EU-DEM e altri)', risoluzione: 'circa 30 m in Italia', ris: 30, copertura: 'tutta Italia (e il mondo)',
                  licenza: 'libera, citando le fonti elencate nella pagina', crs: 'naturale', sistema: 'tessere web (Web Mercator), ricampionate in UTM',
                  pagina: 'https://registry.opendata.aws/terrain-tiles/', tessere: 'terrarium', carica: 'terrarium',
                  nota: 'Si carica sempre, anche dal browser del PC: è il ripiego quando le altre fonti non si raggiungono. Le quote vengono da modelli a circa 30 m: buone per la forma del terreno.',
                  verifica: 'provato' },
                { id: 'opentopography', nome: 'OpenTopography', ente: 'OpenTopography (SDSC, NSF)', ambito: 'IT',
                  tipi: ['DSM'], tecnica: 'modelli globali da satellite (Copernicus, SRTM, NASADEM, ALOS)', risoluzione: '30–90 m', ris: 30, copertura: 'tutto il mondo',
                  licenza: 'dipende dal modello scelto (Copernicus: libera con citazione)', crs: 'geo', sistema: 'gradi WGS84, GeoTIFF',
                  pagina: 'https://opentopography.org/', carica: 'ot',
                  nota: 'Serve una chiave gratuita personale: l\'app ti guida in tre passi. Se il browser del PC blocca la lettura (CORS), l\'app lo dice.',
                  verifica: 'catalogo' },
                { id: 'tinitaly', nome: 'TINITALY 1.1', ente: 'INGV, Istituto Nazionale di Geofisica e Vulcanologia', ambito: 'IT',
                  tipi: ['DTM'], tecnica: 'TIN da curve di livello, punti quotati, GPS e radar', risoluzione: '10 m', ris: 10, copertura: 'tutta Italia',
                  licenza: 'CC BY 4.0 (doi:10.13127/tinitaly/1.1)', crs: 32, sistema: 'UTM 32N WGS84 (EPSG:32632) per tutta Italia, GeoTIFF',
                  pagina: 'https://tinitaly.pi.ingv.it/Download_Area1_1.html',
                  nota: 'Le tessere si scelgono cliccando sulla mappa della pagina di download (archivi .zip): usa le coordinate UTM 32 qui sotto per riconoscere quella giusta.',
                  verifica: 'catalogo' },
                { id: 'mase-lidar', nome: 'LiDAR del Geoportale Nazionale', ente: 'Ministero dell\'Ambiente (MASE), Piano Straordinario di Telerilevamento', ambito: 'IT',
                  tipi: ['DTM', 'DSM'], tecnica: 'LiDAR da aereo', risoluzione: '1 m (in parte 2 m)', ris: 1, copertura: 'solo dove è stato volato: coste, aste fluviali, aree a rischio idrogeologico',
                  licenza: 'CC BY 4.0', crs: 'naturale', sistema: 'UTM ETRS89 / WGS84',
                  pagina: 'https://gn.mase.gov.it/',
                  nota: 'Prima guarda nel visualizzatore se il volo copre le prove. Ci sono serie regionali (per esempio Sicilia, Sardegna, Liguria); i dati si chiedono al Geoportale (gn@mase.gov.it).',
                  verifica: 'catalogo' },

                { id: 'piemonte', nome: 'DTM 5 m (ripresa ICE 2009–2011)', ente: 'Regione Piemonte', ambito: { regioni: [1] },
                  tipi: ['DTM'], tecnica: 'LiDAR a bassa densità', risoluzione: '5 m', ris: 5, copertura: 'tutta la regione',
                  licenza: 'CC BY 4.0 (dalla scheda del volo)', crs: 'naturale', sistema: 'UTM ETRS89, GeoTIFF a tessere',
                  pagina: 'https://www.geoportale.piemonte.it/', verifica: 'da provare' },
                { id: 'vda', nome: 'Modelli del terreno della Valle d\'Aosta', ente: 'Regione Autonoma Valle d\'Aosta', ambito: { regioni: [2] },
                  tipi: ['DTM', 'DSM'], tecnica: 'da verificare sul geoportale', risoluzione: 'da verificare', ris: 99, copertura: 'da verificare',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'https://geoportale.regione.vda.it/', verifica: 'da provare' },
                { id: 'lombardia', nome: 'DTM 5 × 5 m', ente: 'Regione Lombardia', ambito: { regioni: [3] },
                  tipi: ['DTM'], tecnica: 'da cartografia e rilievi regionali', risoluzione: '5 m', ris: 5, copertura: 'tutta la regione',
                  licenza: 'da verificare', crs: 'naturale', sistema: 'UTM 32N',
                  pagina: 'https://www.geoportale.regione.lombardia.it/', nota: 'Il geoportale ha anche il download per tessere: cerca «DTM» nel catalogo.', verifica: 'da provare' },
                { id: 'trento', nome: 'LiDAR della Provincia di Trento (2014, aggiornato 2018)', ente: 'Provincia autonoma di Trento', ambito: { province: ['TN'] },
                  tipi: ['DTM', 'DSM'], tecnica: 'LiDAR da aereo', risoluzione: '1 m o meglio (da verificare)', ris: 1, copertura: 'tutta la provincia',
                  licenza: 'aperta (vedi la pagina)', crs: 'naturale', sistema: 'file .ASC e .XYZ, nuvole .LAZ, a tavole',
                  pagina: 'https://www.provincia.tn.it/News/Approfondimenti/Rilievo-Lidar-del-territorio-della-Provincia-di-Trento',
                  nota: 'Il quadro d\'unione delle tavole è sul SIAT (siatservices.provincia.tn.it).', verifica: 'catalogo' },
                { id: 'bolzano', nome: 'DTM e DSM 0,5 m (LiDAR)', ente: 'Provincia autonoma di Bolzano', ambito: { province: ['BZ'] },
                  tipi: ['DTM', 'DSM'], tecnica: 'LiDAR da aereo', risoluzione: '0,5 m (c\'è anche un DTM 2,5 m)', ris: 0.5, copertura: 'tutta la provincia',
                  licenza: 'aperta (vedi la scheda)', crs: 'naturale', sistema: 'ETRS89 / UTM 32N; servizi WMS e WCS 2.0.1',
                  pagina: 'https://geonetwork1.civis.bz.it/geonetwork/srv/api/records/p_bz:Elevation:DigitalTerrainModel-0.5m',
                  nota: 'Lo strato WCS si chiama p_bz-Elevation:DigitalTerrainModel-0.5m (DSM: …DigitalElevationModel-0.5m).', verifica: 'catalogo' },
                { id: 'veneto', nome: 'DTM da LiDAR del Veneto', ente: 'Regione del Veneto', ambito: { regioni: [5] },
                  tipi: ['DTM'], tecnica: 'mosaico di rilievi LiDAR', risoluzione: 'da verificare', ris: 5, copertura: 'oltre l\'80% della regione',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'https://idt2.regione.veneto.it/', verifica: 'da provare' },
                { id: 'fvg', nome: 'Rilievo LiDAR RAFVG 2017–2020', ente: 'Regione Friuli-Venezia Giulia', ambito: { regioni: [6] },
                  tipi: ['DTM', 'DSM'], tecnica: 'LiDAR da elicottero (10–16 punti/m²)', risoluzione: '0,5 m', ris: 0.5, copertura: 'tutta la regione',
                  licenza: 'aperta (vedi la scheda IRDAT)', crs: 'naturale', sistema: 'quote ellissoidiche e ortometriche',
                  pagina: 'https://irdat.regione.fvg.it/consultatore-dati-ambientali-territoriali/detail/irdat/dataset/11826',
                  nota: 'Si scarica dal portale Eagle.fvg, «scarica basi cartografiche», per tessere.', verifica: 'catalogo' },
                { id: 'liguria', nome: 'Modelli del terreno della Liguria', ente: 'Regione Liguria', ambito: { regioni: [7] },
                  tipi: ['DTM'], tecnica: 'da verificare sul geoportale', risoluzione: 'da verificare', ris: 99, copertura: 'da verificare',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'https://geoportal.regione.liguria.it/',
                  nota: 'Per le aste fluviali c\'è anche il LiDAR 1 m del Geoportale Nazionale.', verifica: 'da provare' },
                { id: 'emilia', nome: 'DTM 5 × 5 m, edizione 2014', ente: 'Regione Emilia-Romagna', ambito: { regioni: [8] },
                  tipi: ['DTM'], tecnica: 'da CTR, aggiornato col LiDAR 2009', risoluzione: '5 m', ris: 5, copertura: 'tutta la regione',
                  licenza: 'CC BY 4.0', crs: 'naturale', sistema: 'servizio WCS',
                  pagina: 'https://geoportale.regione.emilia-romagna.it/', carica: 'wcs', scarica: 'wcs',
                  wcs: { url: 'https://servizigis.regione.emilia-romagna.it/wcs/dtm10k_ed2014', passo: 5 },
                  nota: 'C\'è anche un DTM 0,5 m (2023) delle zone alluvionate.', verifica: 'catalogo' },
                { id: 'toscana', nome: 'DTM e DSM 1 m (LiDAR 2019–2021)', ente: 'Regione Toscana', ambito: { regioni: [9] },
                  tipi: ['DTM', 'DSM'], tecnica: 'LiDAR da aereo, mosaico', risoluzione: '1 m', ris: 1, copertura: 'tutta la regione',
                  licenza: 'aperta (vedi la scheda)', crs: 32, sistema: 'RDN2008 / UTM 32N (EPSG:6707)',
                  pagina: 'https://www502.regione.toscana.it/geonetwork/srv/api/records/r_toscan:f3ff89ee-49fa-4487-89fe-c69ae58ecd0c',
                  nota: 'Si consulta anche in GEOscopio; c\'è pure il DTM 10 m del 2007 su dati.toscana.it.', verifica: 'catalogo' },
                ...[[10, 'Umbria', 'https://www.umbriageo.regione.umbria.it/'], [11, 'Marche', 'https://www.regione.marche.it/Regione-Utile/Paesaggio-Territorio-Urbanistica/Cartografia'],
                    [12, 'Lazio', 'https://geoportale.regione.lazio.it/'], [13, 'Abruzzo', 'http://geoportale.regione.abruzzo.it/'],
                    [14, 'Molise', 'https://www.regione.molise.it/'], [15, 'Campania', 'https://sit2.regione.campania.it/'],
                    [17, 'Basilicata', 'https://rsdi.regione.basilicata.it/'], [18, 'Calabria', 'http://geoportale.regione.calabria.it/']]
                    .map(([cod, reg, url]) => ({ id: 'regione-' + cod, nome: 'Geoportale della Regione ' + reg, ente: 'Regione ' + reg, ambito: { regioni: [cod] },
                        tipi: ['DTM', 'DSM'], tecnica: 'da verificare sul geoportale', risoluzione: 'da verificare', ris: 99, copertura: 'da verificare',
                        licenza: 'da verificare', crs: 'naturale', pagina: url,
                        nota: cod === 12 ? 'Su dati.lazio.it ci sono anche i DTM 5 m della CTR 2002–2003 (in DXF).' : 'Cerca «DTM» o «LiDAR» nel catalogo del geoportale.', verifica: 'da provare' })),
                { id: 'puglia', nome: 'DTM regionale (SIT Puglia)', ente: 'Regione Puglia, InnovaPuglia', ambito: { regioni: [16] },
                  tipi: ['DTM'], tecnica: 'dalla cartografia regionale', risoluzione: 'da verificare', ris: 8, copertura: 'tutta la regione',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'http://www.sit.puglia.it/',
                  nota: 'Lungo le coste c\'è anche il LiDAR 1 m del Geoportale Nazionale.', verifica: 'da provare' },
                { id: 'sicilia', nome: 'DTM 2 m (volo ATA 2007–2008)', ente: 'Regione Siciliana, SITR', ambito: { regioni: [19] },
                  tipi: ['DTM'], tecnica: 'LiDAR da aereo', risoluzione: '2 m', ris: 2, copertura: 'tutta la regione',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'https://www.sitr.regione.sicilia.it/',
                  nota: 'Per i fiumi della Sicilia c\'è anche il DTM LiDAR 1 m del Geoportale Nazionale (CC BY 4.0).', verifica: 'da provare' },
                { id: 'sardegna', nome: 'Modelli del terreno della Sardegna', ente: 'Regione Autonoma della Sardegna', ambito: { regioni: [20] },
                  tipi: ['DTM'], tecnica: 'DTM regionale e LiDAR costiero', risoluzione: '10 m in tutta la regione, 1 m dove c\'è il LiDAR (da verificare)', ris: 10, copertura: 'tutta la regione',
                  licenza: 'da verificare', crs: 'naturale', pagina: 'https://www.sardegnageoportale.it/',
                  nota: 'C\'è anche il DTM LiDAR 1 m della Sardegna del Geoportale Nazionale (CC BY 4.0).', verifica: 'da provare' }
            ];
            const VERIFICA_DTM = {
                provato: `provato il ${DTM_DATA_CATALOGO}: l'indirizzo risponde`,
                catalogo: `dai cataloghi ufficiali (${DTM_DATA_CATALOGO}); indirizzo da provare`,
                'da provare': `portale noto, prodotto e indirizzo da confermare (${DTM_DATA_CATALOGO})`
            };

            // ---- Dove sono le prove ----

            const _anelliProvince = new Map();
            function anelliProvincia(voce) {
                if (!_anelliProvince.has(voce[0])) {
                    _anelliProvince.set(voce[0], voce[3].split('|').map(a => {
                        const n = a.split(',').map(Number), punti = [];
                        let x = 0, y = 0;
                        for (let k = 0; k + 1 < n.length; k += 2) { x += n[k]; y += n[k + 1]; punti.push([x / 1000, y / 1000]); }
                        return punti;
                    }));
                }
                return _anelliProvince.get(voce[0]);
            }
            function dentroAnello(anello, lng, lat) {
                let dentro = false;
                for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
                    const [xi, yi] = anello[i], [xj, yj] = anello[j];
                    if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) dentro = !dentro;
                }
                return dentro;
            }
            /** Distanza in km dal bordo di un anello (in piano, basta per qualche km). */
            function distanzaDaAnelloKm(anello, lng, lat) {
                const kx = 111.32 * Math.cos(lat * Math.PI / 180), ky = 110.57;
                let min = Infinity;
                for (let i = 0, j = anello.length - 1; i < anello.length; j = i++) {
                    const ax = (anello[j][0] - lng) * kx, ay = (anello[j][1] - lat) * ky, bx = (anello[i][0] - lng) * kx, by = (anello[i][1] - lat) * ky;
                    const dx = bx - ax, dy = by - ay, l2 = dx * dx + dy * dy;
                    const t = l2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / l2)) : 0;
                    min = Math.min(min, Math.hypot(ax + t * dx, ay + t * dy));
                }
                return min;
            }
            /** La provincia del punto e quelle a meno di vicinoKm (i confini sono semplificati a ~400 m):
             * { dentro: voce o null, vicine: [voci] }. Fuori da tutte (in mare, all'estero), la più vicina
             * entro 5 km. */
            function provinceDelPunto(lat, lng, vicinoKm = 1) {
                let dentro = null, piuVicina = null, dMin = Infinity;
                const vicine = [];
                for (const voce of CONFINI_PROVINCE) {
                    const anelli = anelliProvincia(voce);
                    if (!dentro && anelli.some(a => dentroAnello(a, lng, lat))) { dentro = voce; continue; }
                    const d = Math.min(...anelli.map(a => distanzaDaAnelloKm(a, lng, lat)));
                    if (d < vicinoKm) vicine.push(voce);
                    if (d < dMin) { dMin = d; piuVicina = voce; }
                }
                if (!dentro && dMin < 5) dentro = piuVicina;
                return { dentro, vicine: vicine.filter(v => v !== dentro) };
            }

            const zonaUtmNaturale = lng => Math.floor((lng + 180) / 6) + 1;
            /** Tutto quello che serve a cercare un DTM per le prove del progetto; null se nessuna prova ha il GPS. */
            function luogoDelleProve(proj, margineM = DTM_MARGINE_M) {
                const prove = proveConCoordinate(proj).sort((a, b) => String(a.header.provaNr).localeCompare(String(b.header.provaNr), 'it', { numeric: true }));
                if (!prove.length) return null;
                const punti = prove.map(s => ({ nome: 'DPSH ' + (s.header.provaNr || '?'), lat: parseFloat(s.header.lat), lng: parseFloat(s.header.lng) }));
                const lats = punti.map(p => p.lat), lngs = punti.map(p => p.lng);
                const latC = (Math.min(...lats) + Math.max(...lats)) / 2;
                const dLat = margineM / 110574, dLng = margineM / (111320 * Math.cos(latC * Math.PI / 180));
                const bbox = { s: Math.min(...lats) - dLat, n: Math.max(...lats) + dLat, o: Math.min(...lngs) - dLng, e: Math.max(...lngs) + dLng };
                const conta = {};
                punti.forEach(p => { const z = zonaUtmNaturale(p.lng); conta[z] = (conta[z] || 0) + 1; });
                const zona = +Object.keys(conta).sort((a, b) => conta[b] - conta[a])[0];
                const province = [], vicine = [];
                punti.forEach(p => {
                    const r = provinceDelPunto(p.lat, p.lng);
                    p.provincia = r.dentro ? r.dentro[0] : null;
                    if (r.dentro && !province.includes(r.dentro)) province.push(r.dentro);
                    r.vicine.forEach(v => { if (!vicine.includes(v)) vicine.push(v); });
                });
                const accanto = vicine.filter(v => !province.includes(v));
                const regioni = [...new Set(province.map(v => v[2]))];
                const regioniAccanto = [...new Set(accanto.map(v => v[2]))].filter(r => !regioni.includes(r));
                return { punti, bbox, zona, province, accanto, regioni, regioniAccanto, margineM, totaleProve: Object.keys(proj.surveys || {}).length };
            }

            /** Il riquadro in UTM (fuso dato) che contiene quello in gradi: i quattro angoli e i punti a metà lato. */
            function riquadroUtm(bbox, zona) {
                const pts = [];
                for (const la of [bbox.s, (bbox.s + bbox.n) / 2, bbox.n]) for (const lo of [bbox.o, (bbox.o + bbox.e) / 2, bbox.e]) pts.push(utmDaGeo(la, lo, zona));
                return { x0: Math.floor(Math.min(...pts.map(p => p.x))), x1: Math.ceil(Math.max(...pts.map(p => p.x))), y0: Math.floor(Math.min(...pts.map(p => p.y))), y1: Math.ceil(Math.max(...pts.map(p => p.y))) };
            }
            const metriInteri = v => Math.round(v).toLocaleString('it-IT');
            const gradi6 = v => v.toFixed(6);
            const codiciEpsgUtm = z => `WGS84 EPSG:${32600 + z} · ETRS89 EPSG:${25800 + z} · RDN2008 EPSG:${6675 + z}`;

            // ---- Le tessere delle fonti che si dividono in tessere fisse ----

            /** Copernicus GLO-30: tessere da 1°, col nome dell'angolo in basso a sinistra. */
            function tessereCopernicus(bbox) {
                const out = [], d2 = n => String(Math.abs(n)).padStart(2, '0'), d3 = n => String(Math.abs(n)).padStart(3, '0');
                for (let la = Math.floor(bbox.s); la <= Math.floor(bbox.n); la++) for (let lo = Math.floor(bbox.o); lo <= Math.floor(bbox.e); lo++) {
                    const nome = `Copernicus_DSM_COG_10_${la < 0 ? 'S' : 'N'}${d2(la)}_00_${lo < 0 ? 'W' : 'E'}${d3(lo)}_00_DEM`;
                    out.push({ nome, lat: la, lng: lo, url: `https://copernicus-dem-30m.s3.amazonaws.com/${nome}/${nome}.tif` });
                }
                return out;
            }
            const URL_TERRARIUM = 'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/';
            /** Coordinate in pixel Web Mercator al livello z (256 pixel per tessera). */
            function pixelMercatore(lat, lng, z) {
                const n = 256 * Math.pow(2, z), fi = lat * Math.PI / 180;
                return { x: (lng + 180) / 360 * n, y: (1 - Math.log(Math.tan(fi) + 1 / Math.cos(fi)) / Math.PI) / 2 * n };
            }
            /** Le tessere Terrarium del riquadro: al livello 15 (il più fine), o meno se sarebbero troppe. */
            function tessereTerrarium(bbox, massimo = 30) {
                for (let z = 15; z >= 8; z--) {
                    const a = pixelMercatore(bbox.n, bbox.o, z), b = pixelMercatore(bbox.s, bbox.e, z);
                    const x0 = Math.floor(a.x / 256), x1 = Math.floor(b.x / 256), y0 = Math.floor(a.y / 256), y1 = Math.floor(b.y / 256);
                    if ((x1 - x0 + 1) * (y1 - y0 + 1) > massimo && z > 8) continue;
                    const out = [];
                    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) out.push({ z, x, y, nome: `${z}/${x}/${y}`, url: `${URL_TERRARIUM}${z}/${x}/${y}.png` });
                    return out;
                }
                return [];
            }

            /** Le fonti che riguardano il luogo: prima quelle della regione (o provincia) delle prove,
             * poi quelle delle regioni accanto, poi le nazionali; dentro ogni gruppo le più fini prima. */
            function fontiPerLuogo(luogo) {
                const sigle = luogo.province.map(v => v[0]), sigleAccanto = luogo.accanto.map(v => v[0]);
                const tocca = (f, regioni, sigleP) => f.ambito !== 'IT' && ((f.ambito.regioni || []).some(r => regioni.includes(r)) || (f.ambito.province || []).some(p => sigleP.includes(p)));
                const perRis = (a, b) => a.ris - b.ris;
                const qui = FONTI_DTM.filter(f => tocca(f, luogo.regioni, sigle)).sort(perRis);
                const accanto = FONTI_DTM.filter(f => !qui.includes(f) && tocca(f, luogo.regioniAccanto, sigleAccanto.concat(sigle))).sort(perRis);
                return [...qui.map(f => ({ f, gruppo: 'regione' })), ...accanto.map(f => ({ f, gruppo: 'accanto' })),
                    ...FONTI_DTM.filter(f => f.ambito === 'IT').sort(perRis).map(f => ({ f, gruppo: 'italia' }))];
            }

            /** Le informazioni sulle tessere e sul riquadro di una fonte, come righe { etichetta, testo, link? }. */
            function dettagliFonteDtm(f, luogo) {
                const righe = [];
                if (f.tessere === 'copernicus') tessereCopernicus(luogo.bbox).forEach(t => righe.push({ etichetta: 'Tessera', testo: t.nome, link: t.url }));
                if (f.tessere === 'terrarium') {
                    const ts = tessereTerrarium(luogo.bbox);
                    righe.push({ etichetta: `Tessere (z/x/y), ${ts.length}`, testo: ts.map(t => t.nome).join(', ') });
                }
                const zona = typeof f.crs === 'number' ? f.crs : luogo.zona;
                if (f.crs === 'geo') righe.push({ etichetta: 'Riquadro (gradi)', testo: `lat ${gradi6(luogo.bbox.s)} – ${gradi6(luogo.bbox.n)}, lng ${gradi6(luogo.bbox.o)} – ${gradi6(luogo.bbox.e)}` });
                else {
                    const r = riquadroUtm(luogo.bbox, zona);
                    righe.push({ etichetta: `Riquadro UTM ${zona}N`, testo: `E ${metriInteri(r.x0)} – ${metriInteri(r.x1)}, N ${metriInteri(r.y0)} – ${metriInteri(r.y1)}` });
                }
                if (f.sistema) righe.push({ etichetta: 'Sistema', testo: f.sistema });
                return righe;
            }

            // ---- La scheda, per cercare il DTM fuori dall'app ----

            function schedaDtmTesto(proj, luogo, voci) {
                const L = [];
                const nomeP = proj.name || proj.comune || 'Progetto';
                L.push(`DTM PER LE PROVE DEL PROGETTO «${nomeP}»`, `Scheda del ${new Date().toLocaleDateString('it-IT')}, dall'app DPSH Field Collector`, '');
                L.push(`Prove col GPS: ${luogo.punti.length} su ${luogo.totaleProve}`);
                L.push(`Regione: ${luogo.regioni.map(r => REGIONI_ITALIA[r]).join(', ') || 'non riconosciuta (fuori Italia o in mare?)'}`);
                L.push(`Provincia: ${luogo.province.map(v => `${v[1]} (${v[0]})`).join(', ') || '—'}`);
                if (luogo.accanto.length) L.push(`Vicino al confine con: ${luogo.accanto.map(v => `${v[1]} (${v[0]}, ${REGIONI_ITALIA[v[2]]})`).join(', ')}`);
                L.push('', `RIQUADRO DA CHIEDERE (le prove più ${luogo.margineM} m attorno)`);
                L.push(`  Gradi WGS84 (EPSG:4326): lat ${gradi6(luogo.bbox.s)} – ${gradi6(luogo.bbox.n)}, lng ${gradi6(luogo.bbox.o)} – ${gradi6(luogo.bbox.e)}`);
                const zone = [...new Set([luogo.zona, 32, 33])].filter(z => z >= 32 && z <= 34 || z === luogo.zona);
                zone.forEach(z => {
                    const r = riquadroUtm(luogo.bbox, z);
                    L.push(`  UTM ${z}N${z === luogo.zona ? ' (fuso naturale)' : ' (fuso esteso)'}: E ${r.x0} – ${r.x1}, N ${r.y0} – ${r.y1}   [${codiciEpsgUtm(z)}]`);
                });
                const b = luogo.bbox;
                L.push(`  WKT: POLYGON((${b.o.toFixed(6)} ${b.s.toFixed(6)}, ${b.e.toFixed(6)} ${b.s.toFixed(6)}, ${b.e.toFixed(6)} ${b.n.toFixed(6)}, ${b.o.toFixed(6)} ${b.n.toFixed(6)}, ${b.o.toFixed(6)} ${b.s.toFixed(6)}))`);
                L.push('', 'PROVE');
                luogo.punti.forEach(p => {
                    const u = utmDaGeo(p.lat, p.lng, luogo.zona);
                    L.push(`  ${p.nome}: lat ${gradi6(p.lat)}, lng ${gradi6(p.lng)} · UTM ${luogo.zona}N E ${u.x.toFixed(1)} N ${u.y.toFixed(1)}${p.provincia ? ' · ' + p.provincia : ''}`);
                });
                L.push('', 'FONTI');
                voci.forEach(({ f }, i) => {
                    L.push(`${i + 1}. ${f.nome} — ${f.ente}`);
                    L.push(`   ${f.tipi.join(' e ')} · ${f.tecnica} · ${f.risoluzione} · copertura: ${f.copertura} · licenza: ${f.licenza}`);
                    L.push(`   Pagina: ${f.pagina}`);
                    dettagliFonteDtm(f, luogo).forEach(r => L.push(`   ${r.etichetta}: ${r.testo}${r.link ? ' → ' + r.link : ''}`));
                    if (f.wcs) L.push(`   Servizio WCS: ${f.wcs.url}${f.wcs.url.includes('?') ? '&' : '?'}SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCapabilities`);
                    if (f.nota) L.push(`   Nota: ${f.nota}`);
                    L.push(`   Informazione: ${VERIFICA_DTM[f.verifica]}`);
                });
                L.push('', 'CERCA ANCHE');
                linkCercaDtm(luogo).forEach(l => L.push(`  ${l.nome}: ${l.url}`));
                return L.join('\n') + '\n';
            }

            function linkCercaDtm(luogo) {
                const reg = luogo.regioni.map(r => REGIONI_ITALIA[r]).join(' ');
                return [
                    { nome: 'Catalogo nazionale dei dati territoriali (RNDT)', url: 'https://geodati.gov.it/geoportale/' },
                    { nome: 'Geoportale INSPIRE (Europa)', url: 'https://inspire-geoportal.ec.europa.eu/' },
                    { nome: `Ricerca sul web: DTM LiDAR ${reg}`.trim(), url: 'https://www.google.com/search?q=' + encodeURIComponent(`DTM LiDAR ${reg} download geoportale`.replace(/\s+/g, ' ')) }
                ];
            }

            /** Le prove e il riquadro in GeoJSON (gradi WGS84), da aprire in QGIS o nei portali. */
            function areaDtmGeojson(proj, luogo) {
                const b = luogo.bbox;
                return JSON.stringify({
                    type: 'FeatureCollection',
                    features: [
                        { type: 'Feature', properties: { nome: `Riquadro DTM (prove + ${luogo.margineM} m)`, progetto: proj.name || '' },
                          geometry: { type: 'Polygon', coordinates: [[[b.o, b.s], [b.e, b.s], [b.e, b.n], [b.o, b.n], [b.o, b.s]]] } },
                        ...luogo.punti.map(p => ({ type: 'Feature', properties: { nome: p.nome }, geometry: { type: 'Point', coordinates: [p.lng, p.lat] } }))
                    ]
                }, null, 1);
            }

            /** Il ritaglio del progetto come ASCII Grid (quote in metri, -9999 = nessun dato). */
            function ascDaDtm(dtm) {
                const q = quoteDtm(dtm), righe = [`ncols ${dtm.nx}`, `nrows ${dtm.ny}`, `xllcorner ${dtm.x0}`, `yllcorner ${dtm.y0 - dtm.ny * dtm.dy}`, `cellsize ${dtm.dx}`, 'NODATA_value -9999'];
                for (let j = 0; j < dtm.ny; j++) {
                    const r = [];
                    for (let i = 0; i < dtm.nx; i++) { const v = q[j * dtm.nx + i]; r.push(isFinite(v) ? v.toFixed(2) : '-9999'); }
                    righe.push(r.join(' '));
                }
                return righe.join('\n') + '\n';
            }
            const epsgDelDtm = dtm => dtm.crs.tipo === 'geo' ? 4326 : 32600 + dtm.crs.zona;

            // ---- Caricare dalla rete ----

            /** Un errore di rete dice cosa fare: di solito è il servizio che non lascia leggere i dati a
             * una pagina (CORS), e allora restano «Scarica» e «Apri la pagina». */
            function erroreReteDtm(e) {
                if (e && e.dtmMessaggio) return e;
                const err = new Error('Il servizio non ha risposto, oppure non permette all\'app di leggere i dati direttamente (succede spesso nel browser del PC). Usa «Scarica» e poi «Carica da file», oppure «Apri la pagina».');
                err.dtmMessaggio = true;
                return err;
            }
            async function chiediInReteDtm(url, opzioni) {
                let r;
                try { r = await fetch(url, opzioni); } catch (e) { throw erroreReteDtm(e); }
                return r;
            }

            /** PNG a 8 bit (grigi, RGB, RGBA), non interlacciato: pixel e numero di canali. */
            async function pixelDaPng(bytes) {
                const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
                if (dv.getUint32(0) !== 0x89504E47) throw new Error('Non è un PNG.');
                let p = 8, w = 0, h = 0, canali = 0;
                const idat = [];
                while (p + 8 <= bytes.length) {
                    const n = dv.getUint32(p), tipo = String.fromCharCode(...bytes.subarray(p + 4, p + 8));
                    if (tipo === 'IHDR') {
                        w = dv.getUint32(p + 8); h = dv.getUint32(p + 12);
                        const prof = bytes[p + 16], colore = bytes[p + 17];
                        canali = { 0: 1, 2: 3, 4: 2, 6: 4 }[colore];
                        if (prof !== 8 || !canali || bytes[p + 20] !== 0) throw new Error('PNG in un formato non gestito.');
                    } else if (tipo === 'IDAT') idat.push(bytes.subarray(p + 8, p + 8 + n));
                    else if (tipo === 'IEND') break;
                    p += 12 + n;
                }
                const tutto = new Uint8Array(idat.reduce((s, b) => s + b.length, 0));
                idat.reduce((o, b) => (tutto.set(b, o), o + b.length), 0);
                const raw = await inflateZlib(tutto), riga = w * canali, out = new Uint8Array(riga * h);
                for (let y = 0; y < h; y++) {
                    const f = raw[y * (riga + 1)], src = y * (riga + 1) + 1, o = y * riga;
                    for (let x = 0; x < riga; x++) {
                        const a = x >= canali ? out[o + x - canali] : 0, b = y ? out[o - riga + x] : 0, c = x >= canali && y ? out[o - riga + x - canali] : 0;
                        let v = raw[src + x];
                        if (f === 1) v += a;
                        else if (f === 2) v += b;
                        else if (f === 3) v += (a + b) >> 1;
                        else if (f === 4) { const pp = a + b - c, pa = Math.abs(pp - a), pb = Math.abs(pp - b), pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
                        out[o + x] = v & 255;
                    }
                }
                return { w, h, canali, dati: out };
            }

            /** Le tessere Terrarium come griglia UTM (fuso naturale delle prove): ogni cella prende la
             * quota delle tessere, interpolata tra i quattro pixel vicini. */
            async function sorgenteTerrarium(luogo) {
                const tessere = tessereTerrarium(luogo.bbox);
                if (!tessere.length) throw new Error('Le prove sono troppo lontane tra loro per le tessere di quota.');
                const z = tessere[0].z, quote = new Map();
                let lette = 0;
                avanzaDtm(0, `Tessere 0 di ${tessere.length}`);
                await Promise.all(tessere.map(async t => {
                    const r = await chiediInReteDtm(t.url);
                    avanzaDtm(++lette / tessere.length * 0.8, `Tessere ${lette} di ${tessere.length}`);
                    if (!r.ok) return; // in mare aperto le tessere mancano: lì niente quote
                    const png = await pixelDaPng(new Uint8Array(await r.arrayBuffer()));
                    const q = new Float32Array(png.w * png.h);
                    for (let k = 0; k < q.length; k++) { const o = k * png.canali; q[k] = png.dati[o] * 256 + png.dati[o + 1] + png.dati[o + 2] / 256 - 32768; }
                    quote.set(t.x + ',' + t.y, q);
                }));
                if (!quote.size) throw new Error('Nessuna tessera di quota per questa zona.');
                const quotaPixel = (px, py) => {
                    const tx = Math.floor(px / 256), ty = Math.floor(py / 256), q = quote.get(tx + ',' + ty);
                    return q ? q[(Math.floor(py) - ty * 256) * 256 + (Math.floor(px) - tx * 256)] : NaN;
                };
                const zona = luogo.zona, r = riquadroUtm(luogo.bbox, zona);
                const latC = (luogo.bbox.s + luogo.bbox.n) / 2;
                // Il passo del pixel delle tessere; per un progetto esteso, quanto basta ad averne al più
                // DTM_MAX_CELLE per lato (il ritaglio non ne terrebbe di più).
                const pixel = 40075016.686 * Math.cos(latC * Math.PI / 180) / (256 * Math.pow(2, z));
                const passo = Math.max(1, Math.round(Math.max(pixel, Math.max(r.x1 - r.x0, r.y1 - r.y0) / DTM_MAX_CELLE) * 10) / 10);
                const nx = Math.ceil((r.x1 - r.x0) / passo), ny = Math.ceil((r.y1 - r.y0) / passo);
                return {
                    nx, ny, dx: passo, dy: passo, x0: r.x0, y0: r.y0 + ny * passo, epsg: 32600 + zona, z,
                    leggiFinestra: async (c0, r0, c1, r1) => {
                        const w = c1 - c0, out = new Float32Array(w * (r1 - r0));
                        for (let j = r0; j < r1; j++) for (let i = c0; i < c1; i++) {
                            const g = geoDaUtm(r.x0 + (i + 0.5) * passo, r.y0 + ny * passo - (j + 0.5) * passo, zona);
                            const p = pixelMercatore(g.lat, g.lng, z), fx = p.x - 0.5, fy = p.y - 0.5;
                            const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
                            out[(j - r0) * w + (i - c0)] = (quotaPixel(ix, iy) * (1 - tx) + quotaPixel(ix + 1, iy) * tx) * (1 - ty) + (quotaPixel(ix, iy + 1) * (1 - tx) + quotaPixel(ix + 1, iy + 1) * tx) * ty;
                        }
                        return out;
                    }
                };
            }

            /** Un GeoTIFF in rete letto a pezzi (Range): le intestazioni, poi solo le tessere che servono.
             * Se il server non conosce Range, arriva il file intero e si legge quello. */
            async function geoTiffInRete(url) {
                const testa = async (n) => {
                    const r = await chiediInReteDtm(url, { headers: { Range: `bytes=0-${n - 1}` } });
                    if (r.status === 404 || r.status === 403) return null;
                    if (!r.ok) throw new Error(`Il servizio ha risposto con un errore (${r.status}).`);
                    return { intero: r.status !== 206, buf: await r.arrayBuffer() };
                };
                for (const n of [65536, 1048576]) {
                    const h = await testa(n);
                    if (!h) return null;
                    if (h.intero) return leggiGeoTiff(h.buf);
                    try {
                        return leggiGeoTiff(h.buf, async (off, len) => {
                            const r = await chiediInReteDtm(url, { headers: { Range: `bytes=${off}-${off + len - 1}` } });
                            if (!r.ok) throw new Error(`Il servizio ha risposto con un errore (${r.status}).`);
                            const b = new Uint8Array(await r.arrayBuffer());
                            return r.status === 206 ? b : b.slice(off, off + len);
                        });
                    } catch (e) { if (!(e instanceof RangeError)) throw e; } // intestazioni più lunghe: si chiede di più
                }
                throw new Error('Il GeoTIFF in rete ha intestazioni troppo grandi.');
            }

            /** Copernicus: le tessere da 1° che servono, unite in una griglia sola (in gradi). */
            async function sorgenteCopernicus(luogo) {
                const tessere = tessereCopernicus(luogo.bbox);
                const lette = await Promise.all(tessere.map(t => geoTiffInRete(t.url)));
                const prima = lette.find(Boolean);
                if (!prima) throw new Error('Copernicus non ha tessere per questa zona (in mare non ce ne sono).');
                const lat0 = Math.min(...tessere.map(t => t.lat)), lng0 = Math.min(...tessere.map(t => t.lng));
                const lat1 = Math.max(...tessere.map(t => t.lat)) + 1, lng1 = Math.max(...tessere.map(t => t.lng)) + 1;
                const dx = prima.dx, dy = prima.dy, perX = Math.round(1 / dx), perY = Math.round(1 / dy);
                return {
                    nx: Math.round((lng1 - lng0) / dx), ny: Math.round((lat1 - lat0) / dy), dx, dy, x0: lng0, y0: lat1, epsg: 4326,
                    leggiFinestra: async (c0, r0, c1, r1) => {
                        const w = c1 - c0, out = new Float32Array(w * (r1 - r0)).fill(NaN);
                        for (let k = 0; k < tessere.length; k++) {
                            const s = lette[k];
                            if (!s) continue;
                            const oc = Math.round((tessere[k].lng - lng0) * perX), or = Math.round((lat1 - 1 - tessere[k].lat) * perY);
                            const a0 = Math.max(c0, oc), a1 = Math.min(c1, oc + s.nx), b0 = Math.max(r0, or), b1 = Math.min(r1, or + s.ny);
                            if (a0 >= a1 || b0 >= b1) continue;
                            const v = await s.leggiFinestra(a0 - oc, b0 - or, a1 - oc, b1 - or), vw = a1 - a0;
                            for (let r = b0; r < b1; r++) out.set(v.subarray((r - b0) * vw, (r - b0 + 1) * vw), (r - r0) * w + (a0 - c0));
                        }
                        return out;
                    }
                };
            }

            // ---- WCS 1.0.0: il formato che parlano quasi tutti i server (MapServer, GeoServer, ArcGIS) ----

            const _wcsScoperti = new Map();
            const unisciQuery = (url, q) => url + (url.includes('?') ? (/[?&]$/.test(url) ? '' : '&') : '?') + q;
            async function testoWcs(url) {
                const r = await chiediInReteDtm(url);
                const t = await r.text();
                if (!r.ok) throw new Error(`Il servizio WCS ha risposto con un errore (${r.status}).`);
                const ecc = /<(?:\w+:)?ServiceException[^>]*>([\s\S]*?)<\//.exec(t);
                if (ecc) throw new Error('Il servizio WCS dice: ' + ecc[1].trim());
                return t;
            }
            /** Coverage, sistemi e formato del servizio: dalla fonte se li dice, sennò da GetCapabilities e
             * DescribeCoverage. Si ricordano finché l'app resta aperta. */
            async function scopriWcs(f, luogo) {
                const chiave = f.id + ':' + luogo.zona;
                if (_wcsScoperti.has(chiave)) return _wcsScoperti.get(chiave);
                let coverage = f.wcs.coverage;
                if (!coverage) {
                    const cap = await testoWcs(unisciQuery(f.wcs.url, 'SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCapabilities'));
                    const m = /<(?:\w+:)?CoverageOfferingBrief[\s\S]*?<(?:\w+:)?name>\s*([^<]+?)\s*<\//.exec(cap);
                    if (!m) throw new Error('Il servizio WCS non elenca nessun coverage.');
                    coverage = m[1];
                }
                let epsg = f.wcs.epsg, formato = f.wcs.formato;
                if (!epsg || !formato) {
                    const desc = await testoWcs(unisciQuery(f.wcs.url, 'SERVICE=WCS&VERSION=1.0.0&REQUEST=DescribeCoverage&COVERAGE=' + encodeURIComponent(coverage)));
                    const codici = [...new Set((desc.match(/EPSG:\d+/gi) || []).map(c => +c.split(':')[1]))];
                    const sistemi = codici.map(c => ({ c, crs: crsDaEpsg(c) })).filter(x => x.crs && x.crs !== 'no');
                    const scelto = sistemi.find(x => x.crs.tipo === 'utm' && x.crs.zona === luogo.zona) || sistemi.find(x => x.crs.tipo === 'utm') || sistemi.find(x => x.crs.tipo === 'geo');
                    if (!epsg) {
                        if (!scelto) throw new Error(`Il servizio WCS dà i dati solo in sistemi che l'app non converte (${codici.map(c => 'EPSG:' + c).join(', ') || 'nessuno indicato'}).`);
                        epsg = scelto.c;
                    }
                    if (!formato) {
                        const formati = [...desc.matchAll(/<(?:\w+:)?formats?>\s*([^<]+?)\s*<\//gi)].map(m => m[1]);
                        formato = formati.find(x => /tiff/i.test(x));
                        if (!formato) throw new Error('Il servizio WCS non dà GeoTIFF' + (formati.length ? ` (solo ${formati.join(', ')})` : '') + '.');
                    }
                }
                const out = { coverage, epsg, formato };
                _wcsScoperti.set(chiave, out);
                return out;
            }
            /** L'indirizzo GetCoverage del riquadro delle prove, al passo della fonte (al più 2000 celle per lato). */
            function urlGetCoverage(f, luogo, s) {
                const crs = crsDaEpsg(s.epsg);
                let b, passo = f.wcs.passo || 5;
                if (crs.tipo === 'geo') { b = { x0: luogo.bbox.o, x1: luogo.bbox.e, y0: luogo.bbox.s, y1: luogo.bbox.n }; passo /= 111000; }
                else b = riquadroUtm(luogo.bbox, crs.zona);
                const w = Math.min(2000, Math.max(2, Math.ceil((b.x1 - b.x0) / passo))), h = Math.min(2000, Math.max(2, Math.ceil((b.y1 - b.y0) / passo)));
                return unisciQuery(f.wcs.url, `SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&COVERAGE=${encodeURIComponent(s.coverage)}&CRS=EPSG:${s.epsg}&BBOX=${b.x0},${b.y0},${b.x1},${b.y1}&WIDTH=${w}&HEIGHT=${h}&FORMAT=${encodeURIComponent(s.formato)}`);
            }
            async function sorgenteWcs(f, luogo) {
                const s = await scopriWcs(f, luogo);
                const r = await chiediInReteDtm(urlGetCoverage(f, luogo, s));
                const buf = await r.arrayBuffer();
                const inizio = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(400, buf.byteLength)));
                if (!r.ok || /^\s*</.test(inizio)) {
                    const ecc = /<(?:\w+:)?ServiceException[^>]*>([\s\S]*?)<\//.exec(new TextDecoder().decode(buf));
                    throw new Error('Il servizio WCS non ha dato il GeoTIFF' + (ecc ? ': ' + ecc[1].trim() : ` (${r.status}).`));
                }
                const sorg = leggiGeoTiff(buf);
                if (!sorg.epsg) sorg.epsg = s.epsg; // alcuni server non scrivono il sistema nel file
                return sorg;
            }

            /** Carica nel progetto il DTM della fonte. Restituisce il ritaglio (non lo salva). */
            async function dtmDaFonte(f, proj, luogo) {
                if (f.carica === 'ot') {
                    avanzaDtm(null, 'Chiedo il modello a OpenTopography…');
                    const s = await sorgenteOpenTopo(luogo);
                    avanzaDtm(0.85, 'Ritaglio attorno alle prove…');
                    const o = OT_DATI.find(x => x.id === opzDtm().otSet) || OT_DATI[0];
                    return ritaglioDaSorgente(s, `${f.nome} · ${o.nome} (${o.info})`, proj);
                }
                if (f.carica === 'terrarium') {
                    const s = await sorgenteTerrarium(luogo);
                    return ritaglioDaSorgente(s, `${f.nome} (circa 30 m, tessere z${s.z})`, proj);
                }
                if (f.carica === 'cog') {
                    avanzaDtm(null, 'Leggo le tessere a pezzi…');
                    const s = await sorgenteCopernicus(luogo);
                    return ritaglioDaSorgente(s, `${f.nome} (DSM 30 m) · ${tessereCopernicus(luogo.bbox).map(t => t.nome).join(', ')}`, proj);
                }
                if (f.carica === 'wcs') {
                    avanzaDtm(null, 'Interrogo il servizio WCS…');
                    const s = await sorgenteWcs(f, luogo);
                    return ritaglioDaSorgente(s, `${f.nome} — ${f.ente} (WCS)`, proj);
                }
                throw new Error('Questa fonte non si carica direttamente: usa «Apri la pagina».');
            }

            // ---- Opzioni, fonti tue, memoria offline, OpenTopography (guidato) ----

            const OPZ_DTM_BASE = { anteprima: true, qualita: true, copertura: true, cache: true, ultima: '', otSet: 'COP30' };
            const opzDtm = () => Object.assign({}, OPZ_DTM_BASE, (state.settings && state.settings.dtm) || {});
            function impostaOpzDtm(parte) {
                if (!state.settings) state.settings = {};
                state.settings.dtm = Object.assign({}, state.settings.dtm || {}, parte);
                saveState();
            }
            const OT_DATI = [
                { id: 'COP30', nome: 'Copernicus GLO-30', info: 'DSM, 30 m, tutto il mondo' },
                { id: 'COP90', nome: 'Copernicus GLO-90', info: 'DSM, 90 m, più leggero' },
                { id: 'NASADEM', nome: 'NASADEM', info: 'DSM, 30 m, da SRTM migliorato' },
                { id: 'SRTMGL1', nome: 'SRTM 1″', info: 'DSM, 30 m' },
                { id: 'AW3D30', nome: 'ALOS AW3D30', info: 'DSM, 30 m, da satellite giapponese' }
            ];
            const chiaveOt = () => { try { return localStorage.getItem('dpsh.dtm.otChiave') || ''; } catch (e) { return ''; } };
            const salvaChiaveOt = k => { try { if (k) localStorage.setItem('dpsh.dtm.otChiave', k); else localStorage.removeItem('dpsh.dtm.otChiave'); } catch (e) { ignoraErrore('chiaveOt', e); } };
            function urlOpenTopo(luogo, set, chiave) {
                const b = luogo.bbox;
                return `https://portal.opentopography.org/API/globaldem?demtype=${encodeURIComponent(set)}&south=${b.s.toFixed(6)}&north=${b.n.toFixed(6)}&west=${b.o.toFixed(6)}&east=${b.e.toFixed(6)}&outputFormat=GTiff&API_Key=${encodeURIComponent(chiave || 'LA_TUA_CHIAVE')}`;
            }
            async function sorgenteOpenTopo(luogo) {
                const o = opzDtm(), chiave = chiaveOt();
                if (!chiave) throw new Error('Manca la chiave di OpenTopography: segui i tre passi qui sotto.');
                const r = await chiediInReteDtm(urlOpenTopo(luogo, o.otSet, chiave));
                const buf = await r.arrayBuffer();
                const inizio = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(300, buf.byteLength)));
                if (!r.ok || /^\s*[<{]/.test(inizio)) throw new Error(`OpenTopography non ha dato il GeoTIFF (${r.status}): ${inizio.replace(/\s+/g, ' ').slice(0, 120)}. Controlla la chiave.`);
                const sorg = leggiGeoTiff(buf);
                if (!sorg.epsg) sorg.epsg = 4326;
                return sorg;
            }

            const FONTI_TUE = () => (state.settings && Array.isArray(state.settings.dtmFonti)) ? state.settings.dtmFonti : [];
            function sincronizzaFontiTue() {
                for (let k = FONTI_DTM.length - 1; k >= 0; k--) if (FONTI_DTM[k].propria) FONTI_DTM.splice(k, 1);
                FONTI_TUE().forEach(t => FONTI_DTM.push({
                    id: t.id, nome: t.nome, ente: 'Fonte aggiunta da te', ambito: 'IT', tipi: [t.tipo === 'DSM' ? 'DSM' : 'DTM'],
                    tecnica: 'servizio WCS', risoluzione: t.passo + ' m', ris: t.passo, copertura: 'da te', licenza: 'a cura di chi l\'ha aggiunta',
                    crs: 'naturale', sistema: 'scelto dal servizio', pagina: t.url, carica: 'wcs', scarica: 'wcs',
                    wcs: { url: t.url, coverage: t.coverage || '', passo: t.passo }, verifica: 'da provare', propria: true,
                    nota: 'Fonte WCS 1.0.0 che hai aggiunto tu: se non risponde, controlla l\'indirizzo.'
                }));
            }

            // La memoria offline: il ritaglio già letto resta sul dispositivo (IndexedDB), così un progetto
            // vicino lo riusa senza rete. Non entra nei progetti né nei backup. Si svuota dalle opzioni.
            function dtmCacheApri() {
                return new Promise(res => {
                    try {
                        const r = indexedDB.open('DPSH_DtmCache', 1);
                        r.onupgradeneeded = () => r.result.createObjectStore('dtm');
                        r.onsuccess = () => res(r.result);
                        r.onerror = () => res(null);
                    } catch (e) { res(null); }
                });
            }
            async function dtmCache(op, chiave, valore) {
                const db = await dtmCacheApri();
                if (!db) return null;
                return new Promise(res => {
                    try {
                        const tx = db.transaction('dtm', op === 'leggi' ? 'readonly' : 'readwrite'), st = tx.objectStore('dtm');
                        const rq = op === 'leggi' ? st.get(chiave) : op === 'scrivi' ? st.put(valore, chiave) : st.clear();
                        rq.onsuccess = () => res(rq.result === undefined ? null : rq.result);
                        rq.onerror = () => res(null);
                    } catch (e) { res(null); }
                });
            }
            const chiaveCacheDtm = f => f.id + (f.carica === 'ot' ? ':' + opzDtm().otSet : '');
            const bboxDentro = (a, b) => a.s >= b.s && a.n <= b.n && a.o >= b.o && a.e <= b.e;

            // ---- Controllo del DTM caricato e anteprima ----

            /** Controlli sul ritaglio: [{ stato: 'ok'|'avviso'|'info', testo }]. Niente calcolo DPSH: solo il terreno. */
            function qualitaDtm(dtm, luogo) {
                const q = quoteDtm(dtm), n = q.length, out = [];
                const finiti = Array.from(q).filter(isFinite);
                const vuote = n ? (n - finiti.length) / n : 1;
                out.push(vuote === 0 ? { stato: 'ok', testo: 'Nessun buco nei dati.' }
                    : { stato: vuote > 0.05 ? 'avviso' : 'info', testo: `${Math.round(vuote * 1000) / 10}% di celle senza dato${vuote > 0.05 ? ': la sezione e il 3D possono avere vuoti' : ''}.` });
                const lat = luogo && luogo.bbox ? (luogo.bbox.s + luogo.bbox.n) / 2 : 40;
                const mx = dtm.crs.tipo === 'geo' ? dtm.dx * 111000 * Math.cos(lat * Math.PI / 180) : dtm.dx, my = dtm.crs.tipo === 'geo' ? dtm.dy * 111000 : dtm.dy;
                let pMax = 0, picchi = 0;
                for (let j = 1; j < dtm.ny - 1; j++) for (let i = 1; i < dtm.nx - 1; i++) {
                    const z = q[j * dtm.nx + i], a = q[j * dtm.nx + i - 1], b = q[j * dtm.nx + i + 1], c = q[(j - 1) * dtm.nx + i], d = q[(j + 1) * dtm.nx + i];
                    if (![z, a, b, c, d].every(isFinite)) continue;
                    const s = Math.atan(Math.hypot((b - a) / (2 * mx), (d - c) / (2 * my))) * 180 / Math.PI;
                    if (s > pMax) pMax = s;
                    if (Math.abs(z - (a + b + c + d) / 4) > 10) picchi++;
                }
                out.push(picchi ? { stato: 'avviso', testo: `${picchi} celle isolate molto diverse dalle vicine (oltre 10 m): possibili errori del modello.` } : { stato: 'ok', testo: 'Nessuna cella fuori posto.' });
                out.push({ stato: 'info', testo: `Pendenza massima ${Math.round(pMax)}°, dislivello ${numeroConVirgola(Math.max(...finiti) - Math.min(...finiti), 1)} m.` });
                out.push(dtm.proveDentro >= dtm.proveConGps ? { stato: 'ok', testo: `Copre tutte le prove col GPS (${dtm.proveConGps}).` } : { stato: 'avviso', testo: `Copre ${dtm.proveDentro} prove su ${dtm.proveConGps}: le altre restano senza quota.` });
                const cella = dtm.crs.tipo === 'geo' ? dtm.celleOriginali * 111000 : dtm.celleOriginali;
                if (cella > 20) out.push({ stato: 'info', testo: `Celle da ${Math.round(cella)} m: vanno bene per la forma del terreno, non per quote precise.` });
                if (/DSM/.test(dtm.fonte)) out.push({ stato: 'info', testo: 'È una superficie (DSM): edifici e alberi alzano le quote.' });
                return out;
            }

            function disegnaAnteprimaDtm(canvas, dtm, luogo, conCopertura) {
                const ctx = canvas.getContext && canvas.getContext('2d');
                if (!ctx) return;
                const W = canvas.width, H = canvas.height, q = quoteDtm(dtm);
                const finiti = Array.from(q).filter(isFinite), zMin = Math.min(...finiti), zMax = Math.max(...finiti), dz = Math.max(0.5, zMax - zMin);
                const img = ctx.createImageData(W, H);
                for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
                    const i = Math.min(dtm.nx - 1, Math.floor(x / W * dtm.nx)), j = Math.min(dtm.ny - 1, Math.floor(y / H * dtm.ny));
                    const z = q[j * dtm.nx + i], o = (y * W + x) * 4;
                    if (!isFinite(z)) { img.data[o + 3] = 0; continue; }
                    const zo = q[j * dtm.nx + Math.max(0, i - 1)], zs = q[Math.max(0, j - 1) * dtm.nx + i];
                    const ombra = isFinite(zo) && isFinite(zs) ? Math.max(-0.5, Math.min(0.5, ((z - zo) + (z - zs)) / (dz / 6 + 0.01) * 0.15)) : 0;
                    const t = (z - zMin) / dz, k = 0.78 + ombra * 0.8;
                    img.data[o] = Math.min(255, (70 + 150 * t) * k); img.data[o + 1] = Math.min(255, (150 + 60 * (1 - Math.abs(t - 0.4))) * k); img.data[o + 2] = Math.min(255, (110 - 40 * t + 60 * (1 - t)) * k); img.data[o + 3] = 255;
                }
                ctx.putImageData(img, 0, 0);
                if (!conCopertura || !luogo) return;
                const px = (lat, lng) => { const p = puntoNelCrs(dtm.crs, lat, lng); return [(p.x - dtm.x0) / (dtm.dx * dtm.nx) * W, (dtm.y0 - p.y) / (dtm.dy * dtm.ny) * H]; };
                const b = luogo.bbox, a1 = px(b.n, b.o), a2 = px(b.s, b.e);
                ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.setLineDash([5, 3]);
                ctx.strokeRect(Math.min(a1[0], a2[0]), Math.min(a1[1], a2[1]), Math.abs(a2[0] - a1[0]), Math.abs(a2[1] - a1[1]));
                ctx.setLineDash([]);
                luogo.punti.forEach(p => { const [x, y] = px(p.lat, p.lng); ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 6.3); ctx.fillStyle = '#ef4444'; ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke(); });
            }

            // ---- La finestra ----

            const trovaDtm = { projId: null, fatto: null, tipo: 'tutti', inCorso: null, aperte: new Set(), ok: null, prog: {} };
            const TD = id => document.getElementById(id);
            let avanzaDtm = () => {};

            /** Aggiorna solo la riga della fonte (barra e testo): niente ridisegno della lista mentre carica. */
            function aggiornaRigaDtm(id) {
                const riga = document.querySelector(`#trovaDtmFonti [data-fonte="${id}"]`);
                if (!riga) return;
                const p = trovaDtm.prog[id] || {};
                riga.dataset.stato = p.stato || '';
                const barra = riga.querySelector('.fd-barra i');
                if (barra) { barra.className = p.frazione == null ? 'indef' : ''; barra.style.width = p.frazione == null ? '' : Math.round(p.frazione * 100) + '%'; }
                const t = riga.querySelector('.fd-stato');
                if (t) t.textContent = p.testo || '';
            }

            const schedaVerifica = { provato: 'fd-v-ok', catalogo: 'fd-v-med', 'da provare': 'fd-v-no' };

            function guidaOpenTopoHtml(luogo, esc) {
                const k = chiaveOt(), o = opzDtm();
                const passo = (n, fatto, titolo, corpo) => `<li class="${fatto ? 'fatto' : ''}"><span class="fd-n">${fatto ? '<svg class="ico"><use href="#i-check"/></svg>' : n}</span><div><strong>${titolo}</strong>${corpo}</div></li>`;
                return `<ol class="fd-guida">
                    ${passo(1, !!k, 'Crea l\'account gratuito', '<p class="t-didascalia">Serve una email. Ci vuole un minuto.</p><a class="bt" href="https://portal.opentopography.org/newUser" target="_blank" rel="noopener"><svg class="ico"><use href="#i-link"/></svg>Apri la registrazione</a>')}
                    ${passo(2, !!k, 'Chiedi la chiave (API key)', '<p class="t-didascalia">Dopo l\'accesso vai su «myOpenTopo» e premi «Request API Key». Poi copiala.</p><a class="bt" href="https://portal.opentopography.org/myopentopo" target="_blank" rel="noopener"><svg class="ico"><use href="#i-link"/></svg>Apri myOpenTopo</a>')}
                    ${passo(3, !!k, 'Incolla qui la chiave', `<p class="t-didascalia">Resta solo su questo dispositivo: non entra nei progetti né nei backup.</p>
                        <div class="fd-riga"><input id="dtmOtChiave" type="password" autocomplete="off" spellcheck="false" placeholder="${k ? 'chiave salvata (••••' + esc(k.slice(-4)) + ')' : 'incolla la chiave'}" aria-label="Chiave OpenTopography">
                        <button type="button" class="bt bt-tenue" data-azione-dtm="otsalva">Salva</button>${k ? '<button type="button" class="bt" data-azione-dtm="otlevachiave">Togli</button>' : ''}</div>`)}
                </ol>
                <label class="fd-campo">Quale modello
                    <select id="dtmOtSet">${OT_DATI.map(d => `<option value="${d.id}"${o.otSet === d.id ? ' selected' : ''}>${esc(d.nome)} — ${esc(d.info)}</option>`).join('')}</select></label>`;
            }

            function renderTrovaDtm(esito) {
                const proj = state.projects[trovaDtm.projId];
                const luogo = proj && luogoDelleProve(proj);
                const esc = escapeHtmlDidascalia, o = opzDtm();
                sincronizzaFontiTue();
                TD('trovaDtmEsito').innerHTML = esito ? `<div class="riga-avviso${esito.errore ? ' pericolo' : ''}" role="${esito.errore ? 'alert' : 'status'}">${esc(esito.testo)}</div>` : '';
                ['trovaDtmCopia', 'trovaDtmScheda', 'trovaDtmArea'].forEach(id => { TD(id).disabled = !luogo; });
                document.querySelectorAll('#trovaDtm [data-tipo-dtm]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tipoDtm === trovaDtm.tipo)));
                ['anteprima', 'qualita', 'copertura', 'cache'].forEach(k => { TD('dtmOpz_' + k).checked = !!o[k]; });

                // La scheda del DTM che il progetto ha già
                const sez = TD('trovaDtmProgetto'), d = proj && proj.dtm;
                sez.hidden = !d;
                if (d) {
                    const celle = d.crs.tipo === 'geo' ? d.celleOriginali * 111000 : d.celleOriginali;
                    const kb = Math.round(d.quote.length * 0.75 / 1024);
                    const cond = !!trovaDtm.ok && trovaDtm.ok === d.caricatoIl;
                    TD('trovaDtmProgettoDati').innerHTML = `<div class="fd-titolo${cond ? ' fd-ok' : ''}">${cond ? '<svg class="ico fd-spunta"><use href="#i-check"/></svg>' : ''}<strong>${esc(d.fonte)}</strong></div>
                        <p class="t-didascalia">Celle da ${numeroConVirgola(celle, celle < 10 ? 1 : 0)} m · quote ${numeroConVirgola(d.base, 0)}–${numeroConVirgola(Math.max(...Array.from(quoteDtm(d)).filter(isFinite)), 0)} m · ${kb} KB</p>
                        ${o.qualita && luogo ? `<ul class="fd-qualita">${qualitaDtm(d, luogo).map(c => `<li class="q-${c.stato}">${esc(c.testo)}</li>`).join('')}</ul>` : ''}
                        <details class="fd-dettagli"><summary>Tutti i dettagli</summary><dl class="trova-dtm-dati"><dt>Caricato</dt><dd>${esc(String(d.caricatoIl || '').slice(0, 16).replace('T', ' '))}</dd><dt>Sistema</dt><dd>${d.crs.tipo === 'geo' ? 'gradi' : 'UTM ' + d.crs.zona + ' N'}</dd><dt>Celle tenute</dt><dd>${d.nx} × ${d.ny}</dd></dl></details>`;
                    TD('trovaDtmAnteprima').hidden = !o.anteprima;
                    if (o.anteprima) disegnaAnteprimaDtm(TD('trovaDtmAnteprima'), d, luogo, o.copertura);
                }

                if (!luogo) {
                    TD('trovaDtmLuogo').innerHTML = '<p class="t-didascalia">Nessuna prova del progetto ha le coordinate: per cercare il DTM serve il GPS di almeno una prova. Intanto puoi caricare un DTM da file.</p>';
                    TD('trovaDtmFonti').innerHTML = TD('trovaDtmCerca').innerHTML = '';
                    return;
                }
                const reg = luogo.regioni.map(r => REGIONI_ITALIA[r]).join(', ');
                const prov = luogo.province.map(v => `${v[1]} (${v[0]})`).join(', ');
                const r = riquadroUtm(luogo.bbox, luogo.zona);
                TD('trovaDtmLuogo').innerHTML = `
                    <div class="trova-dtm-dove"><strong>${reg ? esc(reg) : 'Fuori dalle regioni italiane'}</strong>${prov ? `<span>${esc(prov)}</span>` : ''}
                        <span class="t-didascalia">${luogo.punti.length} prove col GPS · riquadro ${metriInteri(r.x1 - r.x0)} × ${metriInteri(r.y1 - r.y0)} m</span></div>
                    <details class="fd-dettagli"><summary>Coordinate e riquadro</summary>
                    ${luogo.accanto.length ? `<p class="t-didascalia">Vicino al confine con ${esc(luogo.accanto.map(v => `${v[1]} (${REGIONI_ITALIA[v[2]]})`).join(', '))}: ci sono anche le loro fonti.</p>` : ''}
                    <dl class="trova-dtm-dati">
                        <dt>Prove col GPS</dt><dd>${luogo.punti.length} su ${luogo.totaleProve}</dd>
                        <dt>Riquadro (± ${luogo.margineM} m)</dt><dd>${metriInteri(r.x1 - r.x0)} × ${metriInteri(r.y1 - r.y0)} m</dd>
                        <dt>UTM ${luogo.zona}N</dt><dd>E ${metriInteri(r.x0)} – ${metriInteri(r.x1)}<br>N ${metriInteri(r.y0)} – ${metriInteri(r.y1)}</dd>
                        <dt>Gradi</dt><dd>lat ${gradi6(luogo.bbox.s)} – ${gradi6(luogo.bbox.n)}<br>lng ${gradi6(luogo.bbox.o)} – ${gradi6(luogo.bbox.e)}</dd>
                    </dl>
                    <details class="trova-dtm-prove"><summary>Coordinate delle prove</summary>
                        <table><thead><tr><th>Prova</th><th>Lat</th><th>Lng</th><th>E (UTM ${luogo.zona})</th><th>N</th></tr></thead><tbody>
                        ${luogo.punti.map(p => { const u = utmDaGeo(p.lat, p.lng, luogo.zona); return `<tr><td>${esc(p.nome)}</td><td>${gradi6(p.lat)}</td><td>${gradi6(p.lng)}</td><td>${u.x.toFixed(1)}</td><td>${u.y.toFixed(1)}</td></tr>`; }).join('')}
                        </tbody></table></details></details>`;
                const voci = fontiPerLuogo(luogo).filter(({ f }) => trovaDtm.tipo === 'tutti' || f.tipi.includes(trovaDtm.tipo));
                const titoli = { regione: 'Della regione', accanto: 'Delle regioni accanto', italia: 'Per tutta Italia' };
                let gruppo = null, html = '';
                const ordinate = [];
                ['regione', 'accanto', 'italia'].forEach(g => { const v = voci.filter(x => x.gruppo === g); v.sort((a, b) => (b.f.id === o.ultima) - (a.f.id === o.ultima)); ordinate.push(...v); });
                ordinate.forEach(({ f, gruppo: g }) => {
                    if (g !== gruppo) { gruppo = g; html += `<h3 class="trova-dtm-gruppo">${titoli[g]}</h3>`; }
                    const caricabile = !!f.carica, scaricabile = !!f.scarica, inUso = !!(d && d.fonte && d.fonte.indexOf(f.nome) === 0);
                    const p = trovaDtm.prog[f.id] || {}, ot = f.carica === 'ot';
                    html += `<details class="fonte-dtm" data-fonte="${f.id}" data-stato="${p.stato || ''}"${trovaDtm.aperte.has(f.id) ? ' open' : ''}>
                        <summary>
                            <span class="fd-pallino ${schedaVerifica[f.verifica]}" title="Informazione ${esc(VERIFICA_DTM[f.verifica])}"></span>
                            <span class="fd-nome"><strong>${esc(f.nome)}</strong>${f.id === o.ultima ? '<span class="fd-ultima" title="L\'ultima che ha funzionato">★</span>' : ''}${inUso ? '<span class="fd-uso">in uso</span>' : ''}<span class="t-didascalia fd-sotto">${f.tipi.join('/')} · ${esc(f.risoluzione)} · <span class="fd-stato" aria-live="polite">${esc(p.testo || '')}</span></span></span>
                            <span class="fd-azioni">${caricabile ? `<button type="button" class="bt bt-tenue" data-azione-dtm="carica" title="Carica nel progetto"${trovaDtm.inCorso ? ' disabled' : ''}><svg class="ico"><use href="#i-upload"/></svg><span class="fd-testo-bt">Carica</span></button>` : ''}${scaricabile && !ot ? `<button type="button" class="bt" data-azione-dtm="scarica" title="Scarica il file"><svg class="ico"><use href="#i-download"/></svg><span class="fd-testo-bt">Scarica</span></button>` : ''}</span>
                            <svg class="ico fd-freccia" aria-hidden="true"><use href="#i-chevron-down"/></svg>
                        </summary>
                        <div class="fd-barra" role="progressbar" aria-label="Avanzamento"><i></i></div>
                        <div class="fd-corpo">
                            <div class="fonte-dtm-etichette"><span>${esc(f.ente)}</span><span>${esc(f.tecnica)}</span><span>${esc(f.copertura)}</span><span>Licenza: ${esc(f.licenza)}</span></div>
                            ${f.nota ? `<p class="t-didascalia">${esc(f.nota)}</p>` : ''}
                            ${ot ? guidaOpenTopoHtml(luogo, esc) : ''}
                            <dl class="fonte-dtm-fogli">${dettagliFonteDtm(f, luogo).map(x => `<dt>${esc(x.etichetta)}</dt><dd>${x.link ? `<a href="${esc(x.link)}" target="_blank" rel="noopener" download>${esc(x.testo)}</a>` : esc(x.testo)}</dd>`).join('')}</dl>
                            <div class="fonte-dtm-azioni">
                                <a class="bt" href="${esc(f.pagina)}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-link"/></svg>Apri la pagina</a>
                                ${ot ? '<button type="button" class="bt" data-azione-dtm="otlink">Copia l\'indirizzo di scarico</button>' : ''}
                                ${caricabile ? '<button type="button" class="bt" data-azione-dtm="ricarica" title="Rifà il caricamento dalla rete, senza la memoria offline">Ricarica dalla rete</button>' : ''}
                                ${f.propria ? '<button type="button" class="bt bt-pericolo" data-azione-dtm="rimuovi">Togli questa fonte</button>' : ''}
                            </div>
                            <p class="t-didascalia fonte-dtm-verifica">Informazione ${esc(VERIFICA_DTM[f.verifica])}${!caricabile ? ' · non si carica direttamente: il portale non dà le quote a un\'altra app' : ''}</p>
                        </div>
                    </details>`;
                });
                TD('trovaDtmFonti').innerHTML = html || '<p class="t-didascalia">Nessuna fonte di questo tipo.</p>';
                TD('trovaDtmCerca').innerHTML = '<h3 class="trova-dtm-gruppo">Cerca anche</h3>' + linkCercaDtm(luogo).map(l => `<a class="bt" href="${esc(l.url)}" target="_blank" rel="noopener"><svg class="ico"><use href="#i-search"/></svg>${esc(l.nome)}</a>`).join('');
            }

            /** Apre la finestra per il progetto; fatto(errore) ridisegna chi l'ha aperta dopo un caricamento. */
            function apriTrovaDtm(projId, fatto) {
                saveState(); // la prova aperta torna nel progetto, con le sue coordinate
                Object.assign(trovaDtm, { projId, fatto: fatto || (() => {}) });
                renderTrovaDtm();
                TD('trovaDtm').hidden = false;
                TD('trovaDtmChiudi').focus();
            }
            function chiudiTrovaDtm() { TD('trovaDtm').hidden = true; }

            async function caricaFonteDtm(f, bottone, senzaMemoria) {
                if (trovaDtm.inCorso) return;
                const proj = state.projects[trovaDtm.projId], luogo = proj && luogoDelleProve(proj);
                if (!luogo) return;
                trovaDtm.inCorso = f.id;
                trovaDtm.aperte.add(f.id);
                document.querySelectorAll('#trovaDtmFonti [data-azione-dtm="carica"]').forEach(b => { b.disabled = true; });
                avanzaDtm = (frazione, testo) => { trovaDtm.prog[f.id] = { stato: 'carico', frazione, testo }; aggiornaRigaDtm(f.id); };
                avanzaDtm(null, 'Avvio…');
                TD('trovaDtmEsito').innerHTML = '';
                try {
                    const o = opzDtm();
                    let nuovo = null;
                    if (o.cache && !senzaMemoria) {
                        const c = await dtmCache('leggi', chiaveCacheDtm(f));
                        if (c && c.bbox && c.dtm && bboxDentro(luogo.bbox, c.bbox)) {
                            avanzaDtm(null, 'Dalla memoria offline…');
                            nuovo = Object.assign({}, c.dtm, { caricatoIl: new Date().toISOString() });
                            nuovo.proveConGps = luogo.punti.length;
                            nuovo.proveDentro = luogo.punti.filter(p => quotaDtm(nuovo, p.lat, p.lng) !== null).length;
                        }
                    }
                    if (!nuovo) {
                        nuovo = await dtmDaFonte(f, proj, luogo);
                        if (o.cache) dtmCache('scrivi', chiaveCacheDtm(f), { bbox: luogo.bbox, dtm: nuovo });
                    }
                    const vecchio = proj.dtm;
                    proj.dtm = nuovo;
                    avanzaDtm(1, 'Fatto');
                    trovaDtm.prog[f.id] = { stato: 'fatto', frazione: 1, testo: 'Caricato' };
                    trovaDtm.ok = nuovo.caricatoIl;
                    impostaOpzDtm({ ultima: f.id });
                    trovaDtm.fatto();
                    trovaDtm.inCorso = null;
                    renderTrovaDtm({ testo: `Caricato: ${f.nome}. ${nuovo.proveDentro < nuovo.proveConGps ? `Copre ${nuovo.proveDentro} prove su ${nuovo.proveConGps} col GPS.` : 'Copre tutte le prove col GPS.'}` });
                    setTimeout(() => { if (trovaDtm.prog[f.id] && trovaDtm.prog[f.id].stato === 'fatto') { delete trovaDtm.prog[f.id]; aggiornaRigaDtm(f.id); } }, 2600);
                    if (vecchio) showUndoBanner('DTM sostituito', () => { proj.dtm = vecchio; saveState(); trovaDtm.fatto(); if (!TD('trovaDtm').hidden) renderTrovaDtm(); });
                    else mostraToast('DTM caricato');
                } catch (e) {
                    trovaDtm.inCorso = null;
                    trovaDtm.prog[f.id] = { stato: 'errore', frazione: 1, testo: 'Non riuscito · riprova' };
                    renderTrovaDtm({ errore: true, testo: `${f.nome}: ${e.message || e}` });
                } finally { trovaDtm.inCorso = null; avanzaDtm = () => {}; }
            }

            /** «Scarica»: le tessere Copernicus sono file veri, si scaricano col loro indirizzo; per un WCS
             * si costruisce la richiesta del riquadro. Aprire un indirizzo non è bloccato dal CORS. */
            async function scaricaFonteDtm(f) {
                const proj = state.projects[trovaDtm.projId], luogo = proj && luogoDelleProve(proj);
                if (!luogo) return;
                let urls = [];
                if (f.scarica === 'tessere') urls = tessereCopernicus(luogo.bbox).map(t => t.url);
                else if (f.scarica === 'wcs') {
                    try { urls = [urlGetCoverage(f, luogo, await scopriWcs(f, luogo))]; } catch (e) {
                        renderTrovaDtm({ errore: true, testo: `${f.nome}: ${e.message || e} Puoi aprire l'elenco dei dati del servizio dalla scheda (indirizzo GetCapabilities).` });
                        return;
                    }
                }
                urls.forEach(u => { const a = document.createElement('a'); a.href = u; a.target = '_blank'; a.rel = 'noopener'; a.download = ''; document.body.appendChild(a); a.click(); a.remove(); });
                renderTrovaDtm({ testo: `Scaricamento chiesto (${urls.length} file). Poi caricalo con «Carica da file».` });
            }

            async function copiaTestoDtm(testo) {
                try { if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(testo); return true; } } catch (e) { ignoraErrore('copiaSchedaDtm', e); }
                // Dentro l'APK la Clipboard API può mancare: copia da un campo di testo temporaneo.
                const campo = document.createElement('textarea');
                campo.value = testo; campo.setAttribute('readonly', ''); campo.style.position = 'fixed'; campo.style.opacity = '0';
                document.body.appendChild(campo); campo.select();
                let ok = false;
                try { ok = document.execCommand('copy'); } catch (e) { ignoraErrore('copiaSchedaDtm', e); }
                campo.remove();
                return ok;
            }

            const nomeFileDtm = proj => (proj.name || 'progetto').replace(/[^\w\-]+/g, '_');
            const datiScheda = () => {
                const proj = state.projects[trovaDtm.projId], luogo = luogoDelleProve(proj);
                return { proj, luogo, testo: schedaDtmTesto(proj, luogo, fontiPerLuogo(luogo)) };
            };

            TD('trovaDtmFonti').addEventListener('click', async (e) => {
                const b = e.target.closest('[data-azione-dtm]');
                if (!b) return;
                e.preventDefault(); // i tasti stanno nella riga: non devono aprirla o chiuderla
                const f = FONTI_DTM.find(x => x.id === b.closest('[data-fonte]').dataset.fonte), az = b.dataset.azioneDtm;
                if (az === 'carica') caricaFonteDtm(f, b);
                else if (az === 'ricarica') caricaFonteDtm(f, b, true);
                else if (az === 'scarica') scaricaFonteDtm(f);
                else if (az === 'otsalva') {
                    const v = (TD('dtmOtChiave').value || '').trim();
                    if (!v) { renderTrovaDtm({ errore: true, testo: 'Incolla prima la chiave nel campo, poi premi Salva.' }); return; }
                    salvaChiaveOt(v); trovaDtm.aperte.add(f.id);
                    renderTrovaDtm({ testo: 'Chiave salvata su questo dispositivo. Ora puoi premere «Carica».' });
                } else if (az === 'otlevachiave') { salvaChiaveOt(''); trovaDtm.aperte.add(f.id); renderTrovaDtm({ testo: 'Chiave tolta da questo dispositivo.' }); }
                else if (az === 'otlink') {
                    const luogo = luogoDelleProve(state.projects[trovaDtm.projId]);
                    const ok = luogo && await copiaTestoDtm(urlOpenTopo(luogo, opzDtm().otSet, chiaveOt()));
                    mostraToast(ok ? 'Indirizzo copiato (con la tua chiave: non condividerlo)' : 'Non sono riuscito a copiare');
                } else if (az === 'rimuovi') {
                    state.settings.dtmFonti = FONTI_TUE().filter(t => t.id !== f.id);
                    saveState(); renderTrovaDtm({ testo: 'Fonte tolta.' });
                }
            });
            TD('trovaDtmFonti').addEventListener('change', (e) => { if (e.target.id === 'dtmOtSet') impostaOpzDtm({ otSet: e.target.value }); });
            TD('trovaDtmFonti').addEventListener('toggle', (e) => {
                const r = e.target.closest && e.target.closest('[data-fonte]');
                if (r) { if (e.target.open) trovaDtm.aperte.add(r.dataset.fonte); else trovaDtm.aperte.delete(r.dataset.fonte); }
            }, true);
            ['anteprima', 'qualita', 'copertura', 'cache'].forEach(k => TD('dtmOpz_' + k).addEventListener('change', (e) => { impostaOpzDtm({ [k]: e.target.checked }); renderTrovaDtm(); }));
            TD('dtmSvuotaMemoria').addEventListener('click', async () => { await dtmCache('svuota'); mostraToast('Memoria offline dei DTM svuotata'); });
            TD('ndSalva').addEventListener('click', () => {
                const nome = TD('ndNome').value.trim(), url = TD('ndUrl').value.trim(), passo = Math.max(0.5, parseFloat(TD('ndPasso').value) || 5);
                if (!nome || !/^https?:\/\//i.test(url)) { renderTrovaDtm({ errore: true, testo: 'Serve un nome e un indirizzo che inizi con http:// o https://.' }); return; }
                if (!state.settings) state.settings = {};
                if (!Array.isArray(state.settings.dtmFonti)) state.settings.dtmFonti = [];
                state.settings.dtmFonti.push({ id: 'mia-' + Date.now().toString(36), nome, url, tipo: TD('ndTipo').value, passo, coverage: TD('ndCoverage').value.trim() });
                saveState();
                ['ndNome', 'ndUrl', 'ndCoverage'].forEach(i => { TD(i).value = ''; });
                TD('trovaDtmNuova').open = false;
                renderTrovaDtm({ testo: `Fonte «${nome}» aggiunta: la trovi nell'elenco.` });
            });
            document.querySelectorAll('#trovaDtm [data-tipo-dtm]').forEach(b => b.addEventListener('click', () => { trovaDtm.tipo = b.dataset.tipoDtm; renderTrovaDtm(); }));
            TD('trovaDtmChiudi').addEventListener('click', chiudiTrovaDtm);
            TD('trovaDtm').addEventListener('mousedown', (e) => { if (e.target === TD('trovaDtm')) chiudiTrovaDtm(); });
            // Esc chiude solo questa finestra, non quella sotto.
            document.addEventListener('keydown', (e) => {
                if (TD('trovaDtm').hidden || e.key !== 'Escape') return;
                e.preventDefault(); e.stopImmediatePropagation(); chiudiTrovaDtm();
            }, true);
            TD('trovaDtmDaFile').addEventListener('click', () => {
                const fatto = trovaDtm.fatto;
                chiediFileDtm(trovaDtm.projId, errore => {
                    if (errore) { renderTrovaDtm({ errore: true, testo: errore }); return; }
                    chiudiTrovaDtm();
                    fatto();
                });
            });
            TD('trovaDtmCopia').addEventListener('click', async () => {
                const ok = await copiaTestoDtm(datiScheda().testo);
                mostraToast(ok ? 'Scheda copiata: incollala dove vuoi' : 'Non sono riuscito a copiare: usa «Scheda (.txt)»');
            });
            TD('trovaDtmScheda').addEventListener('click', () => { const d = datiScheda(); scaricaBlob(d.testo, 'text/plain;charset=utf-8', `DTM_${nomeFileDtm(d.proj)}.txt`); });
            TD('trovaDtmArea').addEventListener('click', () => { const d = datiScheda(); scaricaBlob(areaDtmGeojson(d.proj, d.luogo), 'application/geo+json', `Area_DTM_${nomeFileDtm(d.proj)}.geojson`); });
            TD('trovaDtmRitaglio').addEventListener('click', () => {
                const proj = state.projects[trovaDtm.projId];
                if (proj && proj.dtm) scaricaBlob(ascDaDtm(proj.dtm), 'text/plain', `DTM_${nomeFileDtm(proj)}_EPSG${epsgDelDtm(proj.dtm)}.asc`);
            });

            TD('trovaDtmTogli').addEventListener('click', () => {
                const proj = state.projects[trovaDtm.projId], vecchio = proj && proj.dtm, fatto = trovaDtm.fatto;
                if (!vecchio) return;
                delete proj.dtm;
                saveState();
                fatto();
                renderTrovaDtm();
                showUndoBanner('DTM tolto dal progetto', () => { proj.dtm = vecchio; saveState(); fatto(); if (!TD('trovaDtm').hidden) renderTrovaDtm(); });
            });

            // Da «Terreno e sezioni» e dal bottone DTM della mappa del progetto.
            TD('btnTrovaDtm').addEventListener('click', () => apriTrovaDtm(state.currentProjectId, renderTerreno));
            TD('btnCaricaDtm3d').addEventListener('click', () => apriTrovaDtm(state.currentProjectId, errore => {
                if (errore) { appAlert(errore); return; }
                apriVista3d(areaMappa.modo);
            }));
