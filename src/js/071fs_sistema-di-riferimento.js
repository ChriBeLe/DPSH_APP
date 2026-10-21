            // IL SISTEMA DI RIFERIMENTO DEL PROGETTO (proj.sr, un EPSG; di base WGS84 in gradi): le coordinate
            // delle prove si scrivono, si incollano e si leggono in quello. Dentro restano in gradi WGS84,
            // come le dà il GPS. ETRS89 e RDN2008 da WGS84 differiscono meno di un metro: stessa formula UTM.
            // (funzioni e non costanti: la finestra GPS le chiama anche prima che questo pezzo sia letto)
            function elencoSr() {
                return [{ epsg: 4326, nome: 'WGS84 · gradi (lat, lng)' }].concat(
                    ['WGS84', 'ETRS89', 'RDN2008'].flatMap(datum => [32, 33, 34].map(z => ({
                        epsg: { WGS84: 32600, ETRS89: 25800, RDN2008: 6675 }[datum] + z, nome: `${datum} / UTM ${z}N (E, N in metri)`, zona: z }))));
            }
            function srDelProgetto() { const l = elencoSr(), proj = state.projects && state.projects[state.currentProjectId]; return l.find(s => s.epsg === (proj || {}).sr) || l[0]; }
            function nomeBreveSr(sr) { return sr.nome.replace(/ \(.*\)$/, ''); }
            /** Un punto nel sistema del progetto: «E 471719,85 N 4115631,13» oppure «37.186697, 14.681380». */
            function coordNelSr(lat, lng) {
                const sr = srDelProgetto();
                if (!sr.zona) return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
                const p = utmDaGeo(lat, lng, sr.zona);
                return `E ${numeroConVirgola(p.x, 2)} N ${numeroConVirgola(p.y, 2)}`;
            }
            /** « · E 471719,85 N 4115631,13 (ETRS89 / UTM 33N)», o niente se il progetto è in gradi. */
            function testoCoordSr(lat, lng) {
                const sr = srDelProgetto();
                if (!sr.zona || !isFinite(lat) || !isFinite(lng)) return '';
                return ` · ${coordNelSr(lat, lng)} (${nomeBreveSr(sr)})`;
            }
            /** Est e Nord da un testo incollato («471719.850,4115631.129», «471719,85 4115631,13», anche col
             * nome della prova davanti): i due numeri con almeno 5 cifre intere. */
            function geoDaTestoUtm(testo, sr) {
                let num = String(testo || '').match(/\d{5,}(?:[.,]\d+)?/g) || [];
                if (num.length === 1 && num[0].includes(',')) num = num[0].split(',');
                if (num.length < 2) return null;
                let [e, n] = num.slice(0, 2).map(v => parseFloat(v.replace(',', '.')));
                if (e > n) [e, n] = [n, e];
                if (!(e > 100000 && e < 900000 && n > 0 && n < 9500000)) return null;
                return geoDaUtm(e, n, sr.zona);
            }

            // lo stesso menu nella finestra GPS e nella barra di stato della mappa del progetto
            const SELECT_SR = ['selSrProgetto', 'selSrMappa'].map(id => document.getElementById(id));
            SELECT_SR.forEach(sel => { sel.innerHTML = elencoSr().map(s => `<option value="${s.epsg}">${s.nome}</option>`).join(''); });
            /** I campi della finestra GPS nel sistema del progetto: Est/Nord al posto di lat/lng se è UTM. */
            function aggiornaCampiSr() {
                const sr = srDelProgetto(), numE = document.getElementById('numModalGpsE'), numN = document.getElementById('numModalGpsN');
                const numModalGpsLat = document.getElementById('numModalGpsLat'), numModalGpsLng = document.getElementById('numModalGpsLng');
                document.querySelectorAll('#selSrProgetto, #selSrMappa').forEach(sel => { sel.value = String(sr.epsg); });
                document.getElementById('boxGpsGradi').style.display = sr.zona ? 'none' : 'grid';
                document.getElementById('boxGpsUtm').style.display = sr.zona ? 'grid' : 'none';
                document.getElementById('txtPasteCoords').placeholder = sr.zona ? 'es. 471719.850, 4115631.129' : 'es. 41.845912, 12.562424';
                const lat = parseFloat(numModalGpsLat.value), lng = parseFloat(numModalGpsLng.value);
                if (sr.zona && isFinite(lat) && isFinite(lng)) { const p = utmDaGeo(lat, lng, sr.zona); numE.value = p.x.toFixed(3); numN.value = p.y.toFixed(3); }
                else if (sr.zona) numE.value = numN.value = '';
            }
            const numE = document.getElementById('numModalGpsE'), numN = document.getElementById('numModalGpsN');
            SELECT_SR.forEach(sel => sel.addEventListener('change', () => {
                const proj = state.projects[state.currentProjectId];
                if (!proj) return;
                proj.sr = Number(sel.value);
                saveState();
                updateModalGpsStatusText();
                if (document.getElementById('modalVista3d').classList.contains('open')) { coordinateAreaMappa(NaN); renderSchedaProvaMappa(); }
            }));
            [numE, numN].forEach(c => c.addEventListener('input', () => {
                const sr = srDelProgetto(), e = parseFloat(numE.value), n = parseFloat(numN.value);
                if (!sr.zona || !isFinite(e) || !isFinite(n)) return;
                const g = geoDaUtm(e, n, sr.zona);
                numModalGpsLat.value = g.lat.toFixed(8); numModalGpsLng.value = g.lng.toFixed(8);
            }));
