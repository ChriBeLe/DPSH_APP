            // ===================== ESPORTA PER GIS: GEOPACKAGE (QGIS) E KMZ/KML (GOOGLE EARTH) =====================
            // Una finestra: il formato e i livelli da mettere (prove, sezioni e i loro estremi, punti e poligoni
            // disegnati, il modello 3D e le colonne delle prove in 3D). Gli stili vanno con i dati, come si vedono
            // nella mappa: nel GeoPackage la tabella «layer_styles» con lo stile QGIS (QML) di ogni layer, quello
            // che QGIS apre da sé (simbolo, colori, contorno, grandezza, etichette; il modello e le colonne con lo
            // stile 3D: si vedono nella «Nuova vista mappa 3D»). Nel KMZ le icone disegnate come nell'app.

            // ---- I colori ----
            /** Un colore qualunque (#rgb, #rrggbb, rgb()) → [r, g, b]. */
            function rgbColore(c) {
                const s = String(c || '').trim();
                let m = /^#([0-9a-f]{3})$/i.exec(s);
                if (m) return m[1].split('').map(h => parseInt(h + h, 16));
                m = /^#([0-9a-f]{6})/i.exec(s);
                if (m) return [0, 2, 4].map(i => parseInt(m[1].slice(i, i + 2), 16));
                m = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(s);
                if (m) return [+m[1], +m[2], +m[3]];
                return [128, 128, 128];
            }
            const coloreQgis = (c, a) => [...rgbColore(c), Math.round(255 * (a ?? 1))].join(',');
            const coloreKml = (c, a) => { const [r, g, b] = rgbColore(c), h = v => v.toString(16).padStart(2, '0'); return h(Math.round(255 * (a ?? 1))) + h(b) + h(g) + h(r); };
            const xmlEsc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

            // ---- Le geometrie (WKB ISO, con o senza Z) e l'intestazione GeoPackage ----
            function wkb(tipo, z, scrivi) {
                const parti = [], push = (n, f) => parti.push([n, f]);
                scrivi({ u32: v => push(4, (dv, o) => dv.setUint32(o, v, true)), f64: v => push(8, (dv, o) => dv.setFloat64(o, v, true)), u8: v => push(1, (dv, o) => dv.setUint8(o, v)) });
                const n = parti.reduce((s, p) => s + p[0], 0), dv = new DataView(new ArrayBuffer(5 + n));
                dv.setUint8(0, 1); dv.setUint32(1, tipo + (z ? 1000 : 0), true);
                let o = 5;
                parti.forEach(([k, f]) => { f(dv, o); o += k; });
                return new Uint8Array(dv.buffer);
            }
            const coord = (w, p, z) => { w.f64(p[0]); w.f64(p[1]); if (z) w.f64(p[2] || 0); };
            const wkbPunto = (p, z) => wkb(1, z, w => coord(w, p, z));
            const wkbLinea = (pp, z) => wkb(2, z, w => { w.u32(pp.length); pp.forEach(p => coord(w, p, z)); });
            const wkbPoligono = (anello, z) => wkb(3, z, w => { const a = anello.concat([anello[0]]); w.u32(1); w.u32(a.length); a.forEach(p => coord(w, p, z)); });
            /** Un multipoligono di triangoli (le superfici del modello 3D). */
            function wkbMultiTriangoli(tt) {
                const dv = new DataView(new ArrayBuffer(9 + tt.length * (9 + 4 + 4 * 24)));
                dv.setUint8(0, 1); dv.setUint32(1, 1006, true); dv.setUint32(5, tt.length, true);
                let o = 9;
                tt.forEach(t => {
                    dv.setUint8(o, 1); dv.setUint32(o + 1, 1003, true); dv.setUint32(o + 5, 1, true); dv.setUint32(o + 9, 4, true); o += 13;
                    [t[0], t[1], t[2], t[0]].forEach(p => { dv.setFloat64(o, p[0], true); dv.setFloat64(o + 8, p[1], true); dv.setFloat64(o + 16, p[2], true); o += 24; });
                });
                return new Uint8Array(dv.buffer);
            }
            /** La geometria del GeoPackage: «GP», versione, flag (little endian, riquadro xy), SRS, riquadro, WKB. */
            function gpkgGeom(corpo, srs, pp) {
                const xs = pp.map(p => p[0]), ys = pp.map(p => p[1]), out = new Uint8Array(40 + corpo.length), dv = new DataView(out.buffer);
                out[0] = 0x47; out[1] = 0x50; out[2] = 0; out[3] = 0x03;
                dv.setInt32(4, srs, true);
                [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)].forEach((v, i) => dv.setFloat64(8 + i * 8, v, true));
                out.set(corpo, 40);
                return out;
            }
            /** Il sistema UTM (WGS84) di una zona, per il modello 3D: in metri, come le quote. */
            const wktUtm = zona => `PROJCS["WGS 84 / UTM zone ${zona}N",GEOGCS["WGS 84",DATUM["WGS_1984",SPHEROID["WGS 84",6378137,298.257223563,AUTHORITY["EPSG","7030"]],AUTHORITY["EPSG","6326"]],PRIMEM["Greenwich",0,AUTHORITY["EPSG","8901"]],UNIT["degree",0.0174532925199433,AUTHORITY["EPSG","9122"]],AUTHORITY["EPSG","4326"]],`
                + `PROJECTION["Transverse_Mercator"],PARAMETER["latitude_of_origin",0],PARAMETER["central_meridian",${(zona - 1) * 6 - 180 + 3}],PARAMETER["scale_factor",0.9996],PARAMETER["false_easting",500000],PARAMETER["false_northing",0],`
                + `UNIT["metre",1,AUTHORITY["EPSG","9001"]],AXIS["Easting",EAST],AXIS["Northing",NORTH],AUTHORITY["EPSG","${32600 + zona}"]]`;

            // ---- Lo stile QGIS (QML) ----
            /** Le proprietà di un simbolo: nel formato di oggi (<Option>) e in quello di prima (<prop>), così le
             * leggono sia QGIS 3.x recenti che quelli fino a 3.16. */
            function proprietaQml(map) {
                const voci = Object.entries(map);
                return `<Option type="Map">${voci.map(([k, v]) => `<Option name="${k}" type="QString" value="${xmlEsc(v)}"/>`).join('')}</Option>`
                    + voci.map(([k, v]) => `<prop k="${k}" v="${xmlEsc(v)}"/>`).join('');
            }
            const simboloQml = (tipo, nome, classe, map) => `<symbol type="${tipo}" name="${nome}" alpha="1" clip_to_extent="1" force_rhr="0" frame_rate="10" is_animated="0"><layer class="${classe}" enabled="1" pass="0" locked="0">${proprietaQml(map)}</layer></symbol>`;
            /** Il simbolo di un punto (Simple marker), in pixel come nell'app: la punta in giù è il triangolo
             * girato di 180° e spostato in su di mezza grandezza. */
            function simboloPuntoQml(nome, st) {
                const f = SIMBOLI_PUNTO[st.simbolo] || SIMBOLI_PUNTO.cerchio, ig = ingombroSimbolo(st), sw = st.spessore ?? 1.5;
                const linea = !!f.linee;
                return simboloQml('marker', nome, 'SimpleMarker', {
                    name: f.qgis, color: coloreQgis(st.colore || '#dc2626'), outline_color: linea ? coloreQgis(st.colore || '#dc2626') : st.contorno ? coloreQgis(st.contorno) : '0,0,0,0',
                    outline_style: !linea && !st.contorno ? 'no' : 'solid', outline_width: String(linea ? Math.max(2, sw * 1.6) : sw), outline_width_unit: 'Pixel',
                    size: String(+ig.S.toFixed(2)), size_unit: 'Pixel', angle: String(f.angolo || 0), offset: f.suPunta ? `0,${-(ig.S / 2).toFixed(2)}` : '0,0', offset_unit: 'Pixel',
                    joinstyle: 'round', cap_style: 'round', horizontal_anchor_point: '1', vertical_anchor_point: '1', scale_method: 'diameter'
                });
            }
            const trattoQml = st => (st.tratto === 'tratteggiato' ? { use_custom_dash: '1', customdash: '8;6' } : st.tratto === 'punteggiato' ? { use_custom_dash: '1', customdash: '2;5' } : { use_custom_dash: '0', customdash: '5;2' });
            function simboloLineaQml(nome, st) {
                return simboloQml('line', nome, 'SimpleLine', { line_color: coloreQgis(st.colore), line_width: String(st.spessore || 2), line_width_unit: 'Pixel', line_style: 'solid',
                    capstyle: 'round', joinstyle: 'round', customdash_unit: 'Pixel', ...trattoQml(st) });
            }
            function simboloPoligonoQml(nome, st) {
                const o = st.opacita ?? 0.22;
                return simboloQml('fill', nome, 'SimpleFill', { color: coloreQgis(st.riempimento || st.colore, o), style: o > 0 ? 'solid' : 'no', outline_color: coloreQgis(st.colore),
                    outline_style: st.tratto === 'tratteggiato' ? 'dash' : st.tratto === 'punteggiato' ? 'dot' : 'solid', outline_width: String(st.spessore || 2), outline_width_unit: 'Pixel', joinstyle: 'round' });
            }
            /** Le etichette di un livello (QgsPalLayerSettings): carattere, colore, alone, riquadro, posizione. */
            function etichetteQml(st, campo, tipo) {
                const px = st.etichettaDimensione || 12, box = st.etichetta === 'sfondo' || st.etichetta === 'bordo';
                const buffer = st.etichettaAlone && !box ? `<text-buffer bufferDraw="1" bufferSize="1.5" bufferSizeUnits="Pixel" bufferColor="${coloreQgis(st.etichettaAlone)}" bufferOpacity="1" bufferNoFill="1" bufferJoinStyle="128" bufferBlendMode="0"/>` : '<text-buffer bufferDraw="0"/>';
                const sfondo = box ? `<background shapeDraw="1" shapeType="0" shapeSizeType="0" shapeSizeX="4" shapeSizeY="1" shapeSizeUnit="Pixel" shapeSizeUnits="Pixel" shapeFillColor="15,23,42,209" shapeOpacity="1"`
                    + ` shapeBorderColor="${st.etichetta === 'bordo' ? '255,255,255,255' : '0,0,0,0'}" shapeBorderWidth="${st.etichetta === 'bordo' ? 1 : 0}" shapeBorderWidthUnit="Pixel" shapeBorderWidthUnits="Pixel" shapeRadiiX="4" shapeRadiiY="4" shapeRadiiUnit="Pixel" shapeRadiiUnits="Pixel" shapeJoinStyle="64" shapeBlendMode="0"/>` : '<background shapeDraw="0"/>';
                // la posizione: sopra/sotto/destra/sinistra/centro rispetto al simbolo (in pixel, come nell'app);
                // QGIS: «sopra il punto» (OverPoint) col quadrante e lo spostamento (y in giù)
                let pl = 1, quad = 4, dx = 0, dy = 0;
                if (tipo === 'punto') {
                    const ig = ingombroSimbolo(st), g = 3, mezzo = -(ig.sopra - ig.sotto) / 2;
                    ({ quad, dx, dy } = { sopra: { quad: 1, dx: 0, dy: -(ig.sopra + g) }, sotto: { quad: 7, dx: 0, dy: ig.sotto + g }, destra: { quad: 5, dx: ig.lato + g, dy: mezzo },
                        sinistra: { quad: 3, dx: -(ig.lato + g), dy: mezzo }, centro: { quad: 4, dx: 0, dy: mezzo } }[st.etichettaPosizione || 'sopra']);
                } else if (tipo === 'estremo') { quad = 1; dy = -6; }
                return `<settings calloutType="simple"><text-style fieldName="${campo}" isExpression="0" fontFamily="Arial" namedStyle="${st.etichettaGrassetto === false ? 'Regular' : 'Bold'}" fontSize="${px}" fontSizeUnit="Pixel"`
                    + ` fontWeight="${st.etichettaGrassetto === false ? 50 : 75}" fontItalic="0" fontStrikeout="0" fontUnderline="0" fontKerning="1" textColor="${coloreQgis(st.etichettaColore || '#ffffff')}" textOpacity="1" multilineHeight="1" capitalization="0" allowHtml="0" previewBkgrdColor="255,255,255,255" blendMode="0" textOrientation="horizontal">`
                    + `<families/>${buffer}${sfondo}<shadow shadowDraw="0"/></text-style>`
                    + `<text-format wrapChar="" multilineAlign="1" autoWrapLength="0" useMaxLineLengthForAutoWrap="1" reverseDirectionSymbol="0" leftDirectionSymbol="&lt;" rightDirectionSymbol="&gt;" placeDirectionSymbol="0" addDirectionSymbol="0" formatNumbers="0" decimals="3" plussign="0"/>`
                    + `<placement placement="${pl}" quadOffset="${quad}" xOffset="${+dx.toFixed(2)}" yOffset="${+dy.toFixed(2)}" offsetUnits="Pixel" offsetType="0" dist="0" distUnits="Pixel" rotationAngle="0" priority="5" placementFlags="10" centroidWhole="0" centroidInside="1" fitInPolygonOnly="0" overlapHandling="AllowOverlapIfRequired" allowDegraded="1"/>`
                    + `<rendering drawLabels="1" displayAll="1" obstacle="0" scaleVisibility="0" upsidedownLabels="0" labelPerPart="0" mergeLines="0" limitNumLabels="0" fontLimitPixelSize="0" zIndex="0"/></settings>`;
            }
            /** Il documento QML: renderer 2D, etichette (accese o no), renderer 3D. */
            function documentoQml({ renderer, etichette, conEtichette, renderer3d }) {
                return `<!DOCTYPE qgis PUBLIC 'http://mrcc.com/qgis.dtd' 'SYSTEM'>\n<qgis version="3.34.0" styleCategories="Symbology|Symbology3D|Labeling" labelsEnabled="${conEtichette ? 1 : 0}">`
                    + (renderer3d || '') + renderer + (etichette || '') + '<blendMode>0</blendMode><featureBlendMode>0</featureBlendMode><layerOpacity>1</layerOpacity></qgis>';
            }
            /** Un renderer per categorie (sul campo «stile»): un simbolo per elemento, ciascuno col suo stile. */
            function categorieQml(voci, simbolo) {
                return `<renderer-v2 type="categorizedSymbol" attr="stile" forceraster="0" symbollevels="0" enableorderby="0" referencescale="-1"><categories>`
                    + voci.map((v, i) => `<category value="${xmlEsc(v.chiave)}" type="string" symbol="${i}" label="${xmlEsc(v.nome)}" render="true" uuid="${i}"/>`).join('')
                    + `</categories><symbols>${voci.map((v, i) => simbolo(String(i), v.st)).join('')}</symbols></renderer-v2>`;
            }
            /** Etichette per regola (una per elemento, col suo stile). */
            function etichettePerRegolaQml(voci, campo, tipo) {
                return `<labeling type="rule-based"><rules key="{radice}">` + voci.map((v, i) => `<rule key="{e${i}}" description="${xmlEsc(v.nome)}" filter="&quot;stile&quot; = '${xmlEsc(v.chiave).replace(/'/g, "''")}'">${etichetteQml(v.st, campo, tipo)}</rule>`).join('') + '</rules></labeling>';
            }
            /** Lo stile 3D per categorie: una regola per strato (superficie colorata, o linea). */
            function renderer3dQml(voci, tipo) {
                const sim = st => {
                    const [r, g, b] = rgbColore(st.colore), amb = [r, g, b].map(v => Math.round(v * 0.45)).join(',') + ',255';
                    const mat = `<material diffuse="${r},${g},${b},255" ambient="${amb}" specular="40,40,40,255" shininess="0" opacity="1" ka="1" kd="1" ks="0.1"/>`;
                    return tipo === 'linea'
                        ? `<symbol type="line" material_type="phong"><data alt-clamping="absolute" alt-binding="vertex" offset="0" extrusion-height="0" simple-lines="0" width="${st.larghezza || 0.6}"/>${mat}<data-defined-properties/></symbol>`
                        : `<symbol type="polygon" material_type="phong"><data alt-clamping="absolute" alt-binding="vertex" offset="0" extrusion-height="0" culling-mode="no-culling" invert-normals="0" add-back-faces="1" rendered-facade="3"/>${mat}<data-defined-properties/><edges enabled="0" width="1" color="0,0,0,255"/></symbol>`;
                };
                return `<renderer-3d type="rulebased" layer=""><vector-layer-3d-tiling zoom-levels-count="3" show-bounding-boxes="0"/><rules key="{radice3d}">`
                    + voci.map((v, i) => `<rule key="{s${i}}" description="${xmlEsc(v.nome)}" filter="&quot;strato&quot; = '${xmlEsc(v.nome).replace(/'/g, "''")}'">${sim(v.st)}</rule>`).join('') + '</rules></renderer-3d>';
            }

            // ---- I livelli del progetto (dati e stile), uguali per GeoPackage e KML ----
            const LIVELLI_GIS = [
                { id: 'prove', nome: 'Prove', nota: 'triangolo e nome, come nella mappa' },
                { id: 'sezioni', nome: 'Sezioni (tracce) e i loro estremi A, A\'' },
                { id: 'punti', nome: 'Punti disegnati' },
                { id: 'poligoni', nome: 'Poligoni disegnati (e perimetro del modello)' },
                { id: 'modello3d', nome: 'Modello 3D: gli strati come superfici 3D', solo: 'gpkg' },
                { id: 'colonne3d', nome: 'Colonne delle prove in 3D (gli strati di ogni prova)', solo: 'gpkg' }
            ];
            function contaLivelloGis(proj, d, id) {
                if (id === 'prove') return proveFisiche(proveConCoordinate(proj)).length;
                if (id === 'sezioni') return (proj.sezioniTracciate || []).length;
                if (id === 'punti') return (proj.disegni || []).filter(x => x.tipo === 'punto').length;
                if (id === 'poligoni') return (proj.disegni || []).filter(x => x.tipo === 'poligono').length;
                if (id === 'modello3d') { const so = d && modelloSolido(d); return so ? so.strati.length : 0; }
                if (id === 'colonne3d') return d ? d.prove.length : 0;
                return 0;
            }
            const zonaUtmProgetto = proj => { const s = proveFisiche(proveConCoordinate(proj))[0] || (proj.disegni || [])[0]; const lng = s ? parseFloat(s.header ? s.header.lng : s.punti[0].lng) : 15; return Math.floor((lng + 180) / 6) + 1; };
            /** Le superfici del modello 3D (in metri UTM con le quote vere): per ogni strato il tetto, il letto
             * e le pareti sul perimetro, in triangoli. */
            function superficiModello3d(d, so, zona) {
                const Q = involucroModello(so), cache = new Map();
                const col = (x, y) => { const k = x.toFixed(3) + ',' + y.toFixed(3); if (!cache.has(k)) { const g = d.geo(x, y), u = utmDaGeo(g.lat, g.lng, zona); cache.set(k, { u, c: colonnaSolido(d, so, x, y) }); } return cache.get(k); };
                const tri = triangoliniPoligono(Q, 6), passo = Math.max(1, d.lato / 80);
                return so.strati.map((st, k) => {
                    const su = p => { const v = col(p[0], p[1]); return [v.u.x, v.u.y, v.c.z - (k ? v.c.basi[k - 1] : 0)]; };
                    const giu = p => { const v = col(p[0], p[1]); return [v.u.x, v.u.y, v.c.z - v.c.basi[k]]; };
                    const spesso = p => { const v = col(p[0], p[1]); return v.c.basi[k] - (k ? v.c.basi[k - 1] : 0); };
                    const tt = [];
                    tri.forEach(t => { if (t.every(p => spesso(p) < 1e-3)) return; tt.push(t.map(su)); tt.push(t.map(giu).reverse()); });
                    Q.forEach((a, i) => {
                        const b = Q[(i + 1) % Q.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / passo));
                        for (let j = 0; j < n; j++) {
                            const p = [a[0] + (b[0] - a[0]) * j / n, a[1] + (b[1] - a[1]) * j / n], q = [a[0] + (b[0] - a[0]) * (j + 1) / n, a[1] + (b[1] - a[1]) * (j + 1) / n];
                            if (spesso(p) < 1e-3 && spesso(q) < 1e-3) continue;
                            tt.push([su(p), giu(q), su(q)], [su(p), giu(p), giu(q)]);
                        }
                    });
                    return { st, tt };
                });
            }

            /** IL GEOPACKAGE dei livelli scelti, con gli stili (layer_styles) che QGIS apre da sé. */
            function geopackageGis(proj, d, scelti) {
                const ora = new Date().toISOString().replace(/\.(\d{3})\d*Z$/, '.$1Z'), progetto = proj.name || proj.comune || '';
                const zona = zonaUtmProgetto(proj), srsUtm = 32600 + zona, L = vista3d.etichette;
                const layer = []; // { nome, descr, geom, z, srs, campi, righe: [{ geom, pp, valori }], qml }
                const riga = (geom, pp, valori) => ({ geom, pp, valori });
                if (scelti.prove) {
                    // tutte con lo stile del gruppo: un simbolo solo; se qualcuna ha il suo, uno per prova
                    const prove = proveFisiche(proveConCoordinate(proj)), st = stileLivello('prove');
                    const voci = prove.map(s => ({ chiave: 'p_' + s.id, nome: nomeDpsh(s), st: stileLivello('p:' + s.id) }));
                    const uguali = voci.every(v => JSON.stringify(v.st) === JSON.stringify(st));
                    layer.push({ nome: 'prove', descr: 'Prove DPSH — ' + progetto, geom: 'POINT', srs: 4326, campi: 'nome TEXT, numero TEXT, quota_m REAL, profondita_m REAL, falda_m REAL, stile TEXT, progetto TEXT',
                        righe: prove.map(s => {
                            const h = s.header, pp = [[parseFloat(h.lng), parseFloat(h.lat)]], q = quotaDellaProva(proj, h), pv = d && d.prove.find(p => p.s.id === s.id), fa = parseFloat(h.faldaDa);
                            return riga(wkbPunto(pp[0]), pp, [nomeDpsh(s), String(h.provaNr || ''), q === null ? null : realeSqlite(+q.toFixed(2)), pv ? realeSqlite(+pv.fondo.toFixed(2)) : null, Number.isFinite(fa) ? realeSqlite(fa) : null, 'p_' + s.id, progetto]);
                        }),
                        qml: uguali
                            ? documentoQml({ renderer: `<renderer-v2 type="singleSymbol" forceraster="0" symbollevels="0" enableorderby="0" referencescale="-1"><symbols>${simboloPuntoQml('0', st)}</symbols></renderer-v2>`,
                                etichette: `<labeling type="simple">${etichetteQml(st, 'nome', 'punto')}</labeling>`, conEtichette: L.prove })
                            : documentoQml({ renderer: categorieQml(voci, simboloPuntoQml), etichette: etichettePerRegolaQml(voci, 'nome', 'punto'), conEtichette: L.prove }) });
                }
                const tracce = proj.sezioniTracciate || [];
                if (scelti.sezioni && tracce.length) {
                    const voci = tracce.map(t => ({ chiave: 't_' + t.id, nome: t.nome, st: stileLivello('t:' + t.id), t }));
                    layer.push({ nome: 'sezioni', descr: 'Tracce delle sezioni — ' + progetto, geom: 'LINESTRING', srs: 4326, campi: 'nome TEXT, inizio TEXT, fine TEXT, lunghezza_m REAL, direzione_gradi REAL, stile TEXT, progetto TEXT',
                        righe: voci.map(v => {
                            const t = v.t, pp = [[t.a.lng, t.a.lat], [t.b.lng, t.b.lat]], s = d ? tracciaInScena(d, t) : null, [e1, e2] = estremiTraccia(t.nome);
                            const az = s ? ((Math.atan2(s.b[0] - s.a[0], s.b[1] - s.a[1]) * 180 / Math.PI) + 360) % 360 : null;
                            return riga(wkbLinea(pp), pp, [t.nome, e1, e2, s ? realeSqlite(+s.L.toFixed(2)) : null, az === null ? null : realeSqlite(+az.toFixed(1)), v.chiave, progetto]);
                        }),
                        qml: documentoQml({ renderer: categorieQml(voci, simboloLineaQml) }) });
                    // gli estremi A e A': solo l'etichetta, come nella mappa
                    layer.push({ nome: 'sezioni_estremi', descr: "Estremi delle sezioni (A, A') — " + progetto, geom: 'POINT', srs: 4326, campi: 'nome TEXT, sezione TEXT, stile TEXT',
                        righe: voci.flatMap(v => estremiTraccia(v.t.nome).map((n, i) => { const g = i ? v.t.b : v.t.a, pp = [[g.lng, g.lat]]; return riga(wkbPunto(pp[0]), pp, [n, v.t.nome, v.chiave]); })),
                        qml: documentoQml({ renderer: `<renderer-v2 type="nullSymbol"/>`, etichette: etichettePerRegolaQml(voci, 'nome', 'estremo'), conEtichette: L.sezioni }) });
                }
                const disegni = proj.disegni || [];
                [['punti', 'punto', 'disegni_punti', 'Punti disegnati', 'POINT'], ['poligoni', 'poligono', 'disegni_poligoni', 'Poligoni disegnati', 'POLYGON']].forEach(([id, tipo, nome, descr, geom]) => {
                    const xx = disegni.filter(x => x.tipo === tipo);
                    if (!scelti[id] || !xx.length) return;
                    const voci = xx.map(x => ({ chiave: 'd_' + x.id, nome: x.nome, st: stileLivello('d:' + x.id), x }));
                    layer.push({ nome, descr: descr + ' — ' + progetto, geom, srs: 4326, campi: tipo === 'punto' ? 'nome TEXT, colore TEXT, stile TEXT, progetto TEXT' : 'nome TEXT, colore TEXT, area_m2 REAL, perimetro_modello INTEGER, stile TEXT, progetto TEXT',
                        righe: voci.map(v => {
                            const pp = v.x.punti.map(p => [p.lng, p.lat]);
                            return tipo === 'punto' ? riga(wkbPunto(pp[0]), pp, [v.nome, v.x.colore, v.chiave, progetto])
                                : riga(wkbPoligono(pp), pp, [v.nome, v.x.colore, realeSqlite(+areaMetriQuadri(v.x.punti).toFixed(1)), proj.perimetroModello === v.x.id ? 1 : 0, v.chiave, progetto]);
                        }),
                        qml: documentoQml({ renderer: categorieQml(voci, tipo === 'punto' ? simboloPuntoQml : simboloPoligonoQml), etichette: etichettePerRegolaQml(voci, 'nome', tipo), conEtichette: L.disegni }) });
                });
                const so = d && modelloSolido(d);
                if (scelti.modello3d && so) {
                    const sup = superficiModello3d(d, so, zona), righe = [];
                    sup.forEach(({ st, tt }) => { for (let i = 0; i < tt.length; i += 400) { const pezzo = tt.slice(i, i + 400), pp = pezzo.flat(); righe.push({ geom: wkbMultiTriangoli(pezzo), pp, valori: [st.nome, st.colore, Math.floor(i / 400) + 1, progetto], srs: srsUtm }); } });
                    const voci = so.strati.map(st => ({ nome: st.nome, st: { colore: st.colore } }));
                    layer.push({ nome: 'modello_3d', descr: 'Modello 3D: strati (superfici con le quote) — ' + progetto, geom: 'MULTIPOLYGON', z: 1, srs: srsUtm, campi: 'strato TEXT, colore TEXT, parte INTEGER, progetto TEXT', righe,
                        qml: documentoQml({ renderer: `<renderer-v2 type="nullSymbol"/>`, renderer3d: renderer3dQml(voci, 'superficie') }) });
                }
                if (scelti.colonne3d && d) {
                    const righe = [], nomi = new Map();
                    d.prove.forEach(p => {
                        const g = d.geo(p.x, p.y), u = utmDaGeo(g.lat, g.lng, zona);
                        p.fasce.forEach(f => { const pp = [[u.x, u.y, p.z - f.da], [u.x, u.y, p.z - f.a]]; nomi.set(f.nome, f.colore); righe.push({ geom: wkbLinea(pp, true), pp, valori: [nomeDpsh(p.s), f.nome, f.colore, realeSqlite(f.da), realeSqlite(f.a), progetto] }); });
                    });
                    const voci = [...nomi].map(([nome, colore]) => ({ nome, st: { colore, larghezza: 0.6 } }));
                    layer.push({ nome: 'prove_colonne_3d', descr: 'Colonne delle prove in 3D (strati) — ' + progetto, geom: 'LINESTRING', z: 1, srs: srsUtm, campi: 'prova TEXT, strato TEXT, colore TEXT, da_m REAL, a_m REAL, progetto TEXT', righe,
                        qml: documentoQml({ renderer: `<renderer-v2 type="nullSymbol"/>`, renderer3d: renderer3dQml(voci, 'linea') }) });
                }
                if (!layer.length) throw new Error('Non c\'è niente da esportare nei livelli scelti.');
                // le tabelle del GeoPackage
                const usaUtm = layer.some(l => l.srs === srsUtm);
                const riquadro = l => { const pp = l.righe.flatMap(r => r.pp); return pp.length ? [Math.min(...pp.map(p => p[0])), Math.min(...pp.map(p => p[1])), Math.max(...pp.map(p => p[0])), Math.max(...pp.map(p => p[1]))].map(realeSqlite) : [null, null, null, null]; };
                const tabelle = [
                    { nome: 'gpkg_spatial_ref_sys', sql: 'CREATE TABLE gpkg_spatial_ref_sys (srs_name TEXT NOT NULL, srs_id INTEGER PRIMARY KEY, organization TEXT NOT NULL, organization_coordsys_id INTEGER NOT NULL, definition TEXT NOT NULL, description TEXT)',
                        righe: [
                            { rowid: -1, valori: ['Undefined cartesian SRS', null, 'NONE', -1, 'undefined', 'undefined cartesian coordinate reference system'] },
                            { rowid: 0, valori: ['Undefined geographic SRS', null, 'NONE', 0, 'undefined', 'undefined geographic coordinate reference system'] },
                            { rowid: 4326, valori: ['WGS 84 geodetic', null, 'EPSG', 4326, GPKG_WKT_4326, 'longitude/latitude coordinates in decimal degrees on the WGS 84 spheroid'] }
                        ].concat(usaUtm ? [{ rowid: srsUtm, valori: [`WGS 84 / UTM zone ${zona}N`, null, 'EPSG', srsUtm, wktUtm(zona), 'UTM (metri), per il modello 3D'] }] : []) },
                    { nome: 'gpkg_contents', sql: "CREATE TABLE gpkg_contents (table_name TEXT NOT NULL, data_type TEXT NOT NULL, identifier TEXT, description TEXT DEFAULT '', last_change DATETIME NOT NULL, min_x DOUBLE, min_y DOUBLE, max_x DOUBLE, max_y DOUBLE, srs_id INTEGER)",
                        righe: layer.map((l, i) => ({ rowid: i + 1, valori: [l.nome, 'features', l.nome, l.descr, ora, ...riquadro(l), l.srs] }))
                            .concat([{ rowid: layer.length + 1, valori: ['layer_styles', 'attributes', 'layer_styles', 'Stili dei layer (QGIS)', ora, null, null, null, null, null] }]) },
                    { nome: 'gpkg_geometry_columns', sql: 'CREATE TABLE gpkg_geometry_columns (table_name TEXT NOT NULL, column_name TEXT NOT NULL, geometry_type_name TEXT NOT NULL, srs_id INTEGER NOT NULL, z TINYINT NOT NULL, m TINYINT NOT NULL)',
                        righe: layer.map((l, i) => ({ rowid: i + 1, valori: [l.nome, 'geom', l.geom, l.srs, l.z ? 1 : 0, 0] })) },
                    ...layer.map(l => ({ nome: l.nome, sql: `CREATE TABLE ${l.nome} (fid INTEGER PRIMARY KEY, geom ${l.geom}, ${l.campi})`,
                        righe: l.righe.map((r, i) => ({ rowid: i + 1, valori: [null, gpkgGeom(r.geom, l.srs, r.pp), ...r.valori] })) })),
                    { nome: 'layer_styles', sql: 'CREATE TABLE layer_styles (id INTEGER PRIMARY KEY, f_table_catalog TEXT(256), f_table_schema TEXT(256), f_table_name TEXT(256), f_geometry_column TEXT(256), styleName TEXT(30), styleQML TEXT, styleSLD TEXT, useAsDefault BOOLEAN, description TEXT, owner TEXT(30), ui TEXT(30), update_time DATETIME)',
                        righe: layer.map((l, i) => ({ rowid: i + 1, valori: [null, '', '', l.nome, 'geom', l.nome, l.qml, '', 1, 'Stile DPSH Field Collector', '', null, ora] })) }
                ];
                return fileSqlite(tabelle);
            }

            // ---- KML e KMZ ----
            const FORME_GOOGLE = { 'triangolo-giu': 'triangle', triangolo: 'triangle', cerchio: 'placemark_circle', quadrato: 'placemark_square', rombo: 'open-diamond', stella: 'star', croce: 'cross-hairs', x: 'cross-hairs', pentagono: 'polygon', esagono: 'polygon' };
            /** L'icona di un simbolo in PNG (64×64, il punto al centro), come nell'app; null senza canvas. */
            function pngSimbolo(st) {
                const c = document.createElement('canvas'); c.width = 64; c.height = 64;
                const g = c.getContext && c.getContext('2d');
                if (!g) return null;
                const ig = ingombroSimbolo(st), E = Math.max(ig.sopra, ig.sotto, ig.lato) + (st.spessore ?? 1.5) + 2, k = 32 / E;
                const f = SIMBOLI_PUNTO[st.simbolo] || SIMBOLI_PUNTO.cerchio, r = ig.S / 2 * k;
                g.translate(32, 32); g.lineJoin = 'round'; g.lineCap = 'round';
                g.beginPath();
                if (f.cerchio) g.arc(0, 0, r, 0, Math.PI * 2);
                else if (f.linee) f.linee.forEach(([a, b]) => { g.moveTo(a[0] * r, a[1] * r); g.lineTo(b[0] * r, b[1] * r); });
                else f.punti.forEach(([x, y], i) => (i ? g.lineTo(x * r, y * r) : g.moveTo(x * r, y * r)));
                if (f.linee) { g.strokeStyle = st.colore; g.lineWidth = Math.max(2, (st.spessore ?? 1.5) * 1.6) * k; g.stroke(); }
                else { g.closePath(); g.fillStyle = st.colore || '#dc2626'; g.fill(); if (st.contorno && (st.spessore ?? 1.5) > 0) { g.strokeStyle = st.contorno; g.lineWidth = (st.spessore ?? 1.5) * k; g.stroke(); } }
                const b64 = c.toDataURL('image/png').split(',')[1], bin = atob(b64), out = new Uint8Array(bin.length);
                for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
                return { byte: out, scala: 2 * E / 32 };
            }
            /** IL KML dei livelli scelti, con gli stili; nel KMZ le icone vengono dal file. */
            function documentoKmlGis(proj, scelti, kmz) {
                const stili = [], segnaposti = [], icone = [], L = vista3d.etichette, e = xmlEsc;
                const etichetta = (st, acceso) => `<LabelStyle><color>${coloreKml(st.etichettaColore || '#ffffff')}</color><scale>${acceso ? +((st.etichettaDimensione || 12) / 14).toFixed(2) : 0}</scale></LabelStyle>`;
                const stilePunto = (id, st, acceso) => {
                    const png = kmz ? pngSimbolo(st) : null;
                    let icona;
                    if (png) { icone.push({ name: `icone/${id}.png`, bytes: png.byte }); icona = `<IconStyle><scale>${+png.scala.toFixed(2)}</scale><Icon><href>icone/${id}.png</href></Icon><hotSpot x="0.5" y="0.5" xunits="fraction" yunits="fraction"/></IconStyle>`; }
                    else icona = `<IconStyle><color>${coloreKml(st.colore || '#dc2626')}</color><scale>${+((ingombroSimbolo(st).S) / 24).toFixed(2)}</scale><Icon><href>http://maps.google.com/mapfiles/kml/shapes/${FORME_GOOGLE[st.simbolo] || 'placemark_circle'}.png</href></Icon></IconStyle>`;
                    stili.push(`<Style id="${id}">${icona}${etichetta(st, acceso)}</Style>`);
                };
                const soloEtichetta = (id, st, acceso) => stili.push(`<Style id="${id}"><IconStyle><scale>0</scale><Icon/></IconStyle>${etichetta(st, acceso)}</Style>`);
                const cartella = (nome, corpo) => corpo ? `<Folder><name>${e(nome)}</name>${corpo}</Folder>` : '';
                const punto = (nome, stile, g, descr) => `<Placemark><name>${e(nome)}</name>${descr ? `<description>${e(descr)}</description>` : ''}<styleUrl>#${stile}</styleUrl><Point><coordinates>${g.lng},${g.lat},0</coordinates></Point></Placemark>`;
                if (scelti.prove) {
                    // lo stile del gruppo per tutte; una prova con lo stile suo ha il suo
                    const stG = stileLivello('prove');
                    stilePunto('prove', stG, L.prove);
                    segnaposti.push(cartella('Prove', proveFisiche(proveConCoordinate(proj)).map(s => {
                        const stS = stileLivello('p:' + s.id), id = JSON.stringify(stS) === JSON.stringify(stG) ? 'prove' : 'p_' + s.id.replace(/\W/g, '');
                        if (id !== 'prove') stilePunto(id, stS, L.prove);
                        return punto(nomeDpsh(s), id, { lat: parseFloat(s.header.lat), lng: parseFloat(s.header.lng) }, `Prova ${s.header.provaNr || ''}`);
                    }).join('')));
                }
                const tracce = proj.sezioniTracciate || [];
                if (scelti.sezioni && tracce.length) {
                    segnaposti.push(cartella('Sezioni', tracce.map(t => {
                        const st = stileLivello('t:' + t.id), id = 't_' + t.id.replace(/\W/g, '');
                        stili.push(`<Style id="${id}"><LineStyle><color>${coloreKml(st.colore)}</color><width>${st.spessore || 2}</width></LineStyle></Style>`);
                        soloEtichetta(id + '_e', st, L.sezioni);
                        const [e1, e2] = estremiTraccia(t.nome);
                        return `<Placemark><name>${e(t.nome)}</name><styleUrl>#${id}</styleUrl><LineString><tessellate>1</tessellate><coordinates>${t.a.lng},${t.a.lat},0 ${t.b.lng},${t.b.lat},0</coordinates></LineString></Placemark>`
                            + punto(e1, id + '_e', t.a) + punto(e2, id + '_e', t.b);
                    }).join('')));
                }
                const disegni = proj.disegni || [];
                if (scelti.punti) segnaposti.push(cartella('Punti disegnati', disegni.filter(x => x.tipo === 'punto').map(x => { const id = 'd_' + x.id.replace(/\W/g, ''); stilePunto(id, stileLivello('d:' + x.id), L.disegni); return punto(x.nome, id, x.punti[0]); }).join('')));
                if (scelti.poligoni) segnaposti.push(cartella('Poligoni disegnati', disegni.filter(x => x.tipo === 'poligono').map(x => {
                    const st = stileLivello('d:' + x.id), id = 'd_' + x.id.replace(/\W/g, '');
                    stili.push(`<Style id="${id}"><LineStyle><color>${coloreKml(st.colore)}</color><width>${st.spessore || 2}</width></LineStyle><PolyStyle><color>${coloreKml(st.riempimento || st.colore, st.opacita ?? 0.22)}</color><fill>${(st.opacita ?? 0.22) > 0 ? 1 : 0}</fill><outline>1</outline></PolyStyle></Style>`);
                    soloEtichetta(id + '_e', st, L.disegni);
                    const anello = x.punti.concat([x.punti[0]]).map(p => `${p.lng},${p.lat},0`).join(' ');
                    return `<Placemark><name>${e(x.nome)}</name><styleUrl>#${id}</styleUrl><Polygon><tessellate>1</tessellate><outerBoundaryIs><LinearRing><coordinates>${anello}</coordinates></LinearRing></outerBoundaryIs></Polygon></Placemark>` + punto(x.nome, id + '_e', centroDisegno(x));
                }).join('')));
                const testo = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${e(proj.name || 'Progetto DPSH')}</name>${stili.join('')}${segnaposti.join('')}</Document></kml>`;
                return { testo, icone };
            }

            // ---- LA FINESTRA «ESPORTA»: un menu solo (tasto «Esporta…» in alto nella mappa, 2D e 3D): le tavole
            // per la relazione, i dati per i GIS (coi livelli da scegliere), la vista 3D in SVG o il modello in OBJ ----
            const gisStato = { formato: 'gpkg', scelti: null };
            const G = id => document.getElementById(id);
            const FORMATI_GIS = ['gpkg', 'kmz', 'kml'];
            const NOTE_FORMATI = {
                tavole: 'Si apre la finestra delle tavole: scegli e sistemi le pagine (modello 3D, sezioni 3D e 2D), poi PDF unico o immagini.',
                gpkg: 'Per QGIS: un file solo, i layer con i loro stili (simboli, colori, etichette) e il modello 3D da vedere nella «Nuova vista mappa 3D».',
                kmz: 'Per Google Earth: i segnaposto con le loro icone disegnate come nella mappa, colori ed etichette.',
                kml: 'KML semplice: le icone sono quelle standard di Google Earth, nei colori scelti (per le icone esatte, KMZ).',
                svg: 'La vista 3D com\'è adesso (inquadratura, tagli, livelli accesi), con la legenda: sfondo chiaro o scuro.',
                obj: 'Terreno, colonne, pannelli e superfici in metri veri (senza esagerazione), in uno ZIP con i materiali.'
            };
            function apriEsportaGis(formato) {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                const mem = proj.esportaGis || {};
                gisStato.formato = typeof formato === 'string' ? formato : mem.formato || 'gpkg';
                gisStato.scelti = Object.assign({ prove: true, sezioni: true, punti: true, poligoni: true, modello3d: true, colonne3d: true }, mem.scelti || {});
                renderEsportaGis();
                G('esportaGis').hidden = false;
            }
            function renderEsportaGis() {
                const proj = state.projects[state.currentProjectId], d = datiVista3dCorrenti || datiVista3d(proj), f = gisStato.formato;
                G('gisFormato').querySelectorAll('[data-formato]').forEach(b => {
                    b.setAttribute('aria-pressed', String(b.dataset.formato === f));
                    // le tavole vogliono almeno una prova col GPS; la vista 3D e il modello, il 3D
                    b.disabled = ['tavole', 'svg', 'obj'].includes(b.dataset.formato) && !d;
                });
                G('gisNotaFormato').textContent = NOTE_FORMATI[f] || '';
                const gis = FORMATI_GIS.includes(f);
                G('gisLivelliBox').hidden = !gis; G('gisNotaStili').hidden = !gis;
                G('gisEsporta').querySelector('span').textContent = f === 'tavole' ? 'Apri le tavole…' : 'Esporta';
                G('gisLivelli').innerHTML = LIVELLI_GIS.map(l => {
                    const n = contaLivelloGis(proj, d, l.id), ok = n > 0 && (!l.solo || l.solo === f);
                    const perche = !n ? 'niente da esportare' : l.solo && l.solo !== f ? 'solo nel GeoPackage' : `${n}`;
                    return `<label class="gis-livello${ok ? '' : ' spento'}"><input type="checkbox" data-livello-gis="${l.id}"${ok && gisStato.scelti[l.id] ? ' checked' : ''}${ok ? '' : ' disabled'}><span>${xmlEsc(l.nome)}</span><b>${perche}</b></label>`;
                }).join('');
            }
            function salvaSceltaGis() {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                proj.esportaGis = { formato: gisStato.formato, scelti: Object.assign({}, gisStato.scelti) };
                saveState();
            }
            /** Le tavole e la vista 3D si fanno dal 3D: se si è nella mappa 2D, ci si passa. */
            function nel3d() { if (areaMappa.modo !== '3d') modoAreaMappa('3d'); }
            async function esportaGis() {
                const proj = state.projects[state.currentProjectId], d = datiVista3dCorrenti || datiVista3d(proj), f = gisStato.formato;
                if (!FORMATI_GIS.includes(f)) {
                    G('esportaGis').hidden = true;
                    if (f === 'tavole') { nel3d(); apriTavole3d(false); }
                    else if (f === 'svg') { nel3d(); G('btnScaricaVista3d').click(); }
                    else if (f === 'obj') G('btnScaricaObj3d').click();
                    return;
                }
                const scelti = {};
                G('gisLivelli').querySelectorAll('[data-livello-gis]').forEach(c => { scelti[c.dataset.livelloGis] = c.checked && !c.disabled; });
                if (!Object.values(scelti).some(Boolean)) { appAlert('Scegli almeno un livello da esportare.'); return; }
                const nome = 'DPSH_' + (proj.name || 'progetto').replace(/[^\w\-]+/g, '_');
                try {
                    if (gisStato.formato === 'gpkg') scaricaBlobFile(new Blob([geopackageGis(proj, d, scelti)], { type: 'application/geopackage+sqlite3' }), nome + '.gpkg');
                    else {
                        const kmz = gisStato.formato === 'kmz', { testo, icone } = documentoKmlGis(proj, scelti, kmz);
                        if (kmz) scaricaBlobFile(buildZipBlob([{ name: 'doc.kml', bytes: new TextEncoder().encode(testo) }, ...icone]), nome + '.kmz');
                        else scaricaBlobFile(new Blob([testo], { type: 'application/vnd.google-earth.kml+xml' }), nome + '.kml');
                    }
                    G('esportaGis').hidden = true;
                } catch (e) { appAlert(e.message || String(e)); }
            }
            G('btnGpkgSezioni3d').addEventListener('click', () => apriEsportaGis('gpkg'));
            G('btnEsportaMappa').addEventListener('click', () => apriEsportaGis());
            G('gisFormato').addEventListener('click', (e) => { const b = e.target.closest('[data-formato]'); if (!b) return; gisStato.formato = b.dataset.formato; salvaSceltaGis(); renderEsportaGis(); });
            G('gisLivelli').addEventListener('change', (e) => { const c = e.target.closest('[data-livello-gis]'); if (c) { gisStato.scelti[c.dataset.livelloGis] = c.checked; salvaSceltaGis(); } });
            G('gisTutti').addEventListener('click', () => { LIVELLI_GIS.forEach(l => { gisStato.scelti[l.id] = true; }); salvaSceltaGis(); renderEsportaGis(); });
            G('gisNessuno').addEventListener('click', () => { LIVELLI_GIS.forEach(l => { gisStato.scelti[l.id] = false; }); salvaSceltaGis(); renderEsportaGis(); });
            G('gisEsporta').addEventListener('click', esportaGis);
            ['gisAnnulla', 'gisChiudi'].forEach(id => G(id).addEventListener('click', () => { G('esportaGis').hidden = true; }));
            document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !G('esportaGis').hidden) { e.stopPropagation(); G('esportaGis').hidden = true; } }, true);
