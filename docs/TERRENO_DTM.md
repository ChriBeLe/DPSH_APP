# Terreno e sezioni (DTM)

Dal Progetto, «Terreno e sezioni» (anche con Ctrl K).

## Il DTM
- **Formati:** GeoTIFF (a strisce o a tessere; senza compressione, LZW o Deflate; predittori 2 e 3; interi o virgola mobile) e ASCII Grid (.asc).
- **Sistemi:** UTM WGS84 (EPSG 326xx), ETRS89 (258xx, 3044–3046), RDN2008 (6707–6709, 7791–7793) e coordinate geografiche (4326, 4258, 6706). Se il file non lo dice (un .asc senza .prj), l'app lo ricava dalle coordinate delle prove. Gauss-Boaga e Monte Mario non sono gestiti: l'errore dice come riproiettare.
- **Cosa si tiene:** solo il ritaglio attorno alle prove col GPS (± 150 m), al più 250 × 250 celle (media dei blocchi), in centimetri. Sta nel progetto, quindi viaggia nel pacchetto e nel backup; in campo non serve la rete.
- **Togli:** subito, con Annulla.

## Trovare il DTM: «DTM per le prove del progetto»
Dal bottone DTM della mappa del progetto (3D) e da «Terreno e sezioni» › «Trova un DTM». Pezzi: `071t_trova-dtm.js` (tutto), `071s_confini-province.js` (confini), `markup/47c_trovaDtm.html`.
- **Dove sono le prove:** da tutte le prove col GPS del progetto. Regione e provincia **senza rete**, dai confini ISTAT delle province (1/1/2026, openpolis/geojson-italy, CC BY 4.0) semplificati a ~400 m (`tools/confini_province.py`). Se una prova è a meno di 1 km da un'altra provincia, si propongono anche le fonti di quella regione. Poi il riquadro (prove ± 150 m) in UTM (fuso naturale) e in gradi, e le coordinate di ogni prova.
- **Le fonti** (catalogo scritto nel pezzo, `FONTI_DTM`): prima quelle della regione (Trento e Bolzano a parte), poi delle regioni accanto, poi nazionali; dentro ogni gruppo le più fini prima. Filtro Tutti / DTM / DSM. Per ognuna: tipo, tecnica, risoluzione, copertura, licenza, nota, le tessere per queste prove e il riquadro nel suo sistema. Ognuna dice **quanto è verificata**: «provato» (indirizzo aperto e dati letti il 10/10/2026: Copernicus, Terrarium), «dai cataloghi ufficiali» (scheda RNDT/INSPIRE trovata, indirizzo non aperto da qui), «da confermare» (portale noto). I portali italiani non si sono potuti aprire dall'ambiente di sviluppo: le voci regionali vanno provate e corrette.
  - Nazionali: Copernicus DEM GLO-30 (DSM 30 m, tessere 1°, nome e link calcolati), tessere di quota Terrarium (circa 30 m, z/x/y calcolate), TINITALY 1.1 (10 m, UTM 32: il riquadro in UTM 32 per scegliere la tessera sulla mappa del sito), LiDAR del Geoportale Nazionale (1–2 m dove volato).
- **Comandi di ogni fonte:**
  - *Apri la pagina* — sempre.
  - *Carica nel progetto* — Terrarium (PNG decodificati nell'app e ricampionati in UTM), Copernicus (GeoTIFF in rete letto **a pezzi** con Range: intestazioni e sole tessere interne attorno alle prove, ~2,5 MB invece di ~40), WCS 1.0.0 (GetCapabilities › DescribeCoverage › GetCoverage del riquadro, nel fuso delle prove, in GeoTIFF; oggi: Emilia-Romagna). Il DTM di prima si rimette con Annulla. Se il servizio non lascia leggere i dati a una pagina (CORS, frequente nel browser del PC: Copernicus è così) l'errore dice di usare *Scarica* o *Apri la pagina*. Provato nel browser vero il 10/10/2026: Terrarium si carica (Nardò: 51 e 48 m), Copernicus è bloccato dal CORS.
  - *Scarica* — l'indirizzo diretto (tessere Copernicus; per un WCS la richiesta GetCoverage del riquadro). Aprire un indirizzo non è bloccato dal CORS; poi «Carica da file».
- **Per cercare fuori dall'app:** *Copia la scheda* / *Scheda (.txt)* (luogo, riquadro in gradi, UTM 32 e 33 con i codici EPSG WGS84/ETRS89/RDN2008, WKT, prove, fonti con pagine, tessere, link diretti e note), *Area (GeoJSON)* (riquadro e prove, per QGIS o i visualizzatori), *DTM del progetto (.asc)* (il ritaglio già caricato, col sistema nel nome del file).
- **Non c'è:** il numero del foglio IGM 1:50.000 o della sezione CTR: serve il quadro d'unione ufficiale dei fogli, non ancora nell'app.

## Cosa se ne ricava
- **Quota di ogni prova:** interpolata tra le quattro celle vicine. Si vede nella finestra, nel GPS della prova e nel segnaposto del report «Quota del piano campagna».
- **Sezione tra le prove:** prove col GPS in fila lungo la direzione principale, alle distanze vere, con nomi «DPSH N».
  - Col DTM ogni colonna parte dalla sua quota, e tra le prove c'è il profilo del terreno.
  - Gli strati con lo stesso nome si collegano tra la prova e la successiva che li ha, anche sotto le prove in mezzo, e seguono il terreno (si interpola la profondità).
  - Se una prova in mezzo li ha attraversati senza trovarli, il collegamento è tratteggiato e più chiaro, e il suggerimento dice quale prova. Senza seguito, si chiudono a metà. La falda si unisce se c'è in entrambe.
  - Si regolano l'esagerazione verticale (automatica o scelta) e la scala orizzontale.
  - Si spengono: correlazioni, etichette lungo i profili, scala di ogni prova, grafico dei colpi accanto alla colonna.
  - Legenda; si scarica in SVG.
- **Fumetto della prova:** clic su una colonna, nella sezione e nel 3D.
  - Mostra il grafico dei colpi, gli strati, la quota, la profondità, la falda e il GPS.
  - Il lucchetto lo tiene aperto e lo fa spostare.
- **Vista 3D (canvas, fluida anche mentre gira):**
  - terreno ombreggiato;
  - colonne dentro il suolo;
  - pannelli di correlazione tra prove vicine (triangolazione di Delaunay);
  - superfici di contatto: tetto degli strati comuni a tre prove, piano per tre punti, con la giacitura reale (immersione/inclinazione);
  - misure: quote e distanze.
  - Ogni livello si spegne. Solo le prove eseguite davvero.
  - Anche senza DTM: le prove col GPS partono tutte dal piano campagna (quota 0, un piano orizzontale), come nella sezione.
  - Ci si arriva anche dalla sezione e dal confronto tra prove (bottone «Vista 3D»); il DTM si carica anche dalla vista 3D, che si ridisegna col terreno.
  - Si scarica in SVG e come **modello 3D OBJ + MTL** (metri veri, Y in alto, origine scritta nel file) per Blender, MeshLab, QGIS.

## Da fare
- **Provare le voci regionali del catalogo** con gli indirizzi veri (dal browser del PC e dall'APK) e aggiungere i WCS che funzionano (`carica: 'wcs'`, `wcs: { url, coverage?, epsg?, formato?, passo }`). Con la WMS si vede soltanto un'immagine; le quote arrivano dalla WCS.
- **Fonti aggiunte dall'utente** (come i WMS personalizzati), salvate nelle impostazioni.
- **Fogli IGM 1:50.000 / sezioni CTR** delle prove: serve il quadro d'unione (es. il servizio WFS di una Regione) incorporato o letto in rete.
- **Correzione a mano delle unioni** tra strati nella sezione.
- **Sezione e vista 3D nel report PDF.**

## Test
`test/terreno_dtm.js`, `test/trova_dtm.js`, `test/sezione.js`, `test/vista_3d.js`. `trova_dtm.js` usa servizi finti: tessere Terrarium fatte nel test (PNG coi cinque filtri), un GeoTIFF «alla Copernicus» servito con Range (`test/dati/dtm/copernicus_N40_E017.tif`, da `genera_copernicus.py`), un WCS 1.0.0. I DTM di prova sono in `test/dati/dtm/`, rigenerabili con `genera_dtm.py`: un piano noto, e l'UTM è verificato con pyproj.

## Novità 28/11/2026: finestra DTM compatta e scala leggibile nel 3D
- **Finestra «DTM per le prove»:** ogni fonte è una riga stretta (pallino di verifica, nome, tipo, risoluzione, Carica/Scarica) che si apre per i dettagli. Durante il caricamento la riga mostra una barra e il passo («Tessere 3 di 6»); a fine lavoro un lampo verde, in caso di errore «riprova». In alto la scheda del DTM del progetto: anteprima ombreggiata con prove e riquadro, controllo qualità (buchi, celle fuori posto, pendenza, copertura). Anteprima, controllo e memoria offline si spengono da «Altro › Mostra».
- **Memoria offline dei DTM** (IndexedDB `DPSH_DtmCache`, fuori dai progetti e dai backup): un ritaglio già letto che copre le prove di un altro progetto si riusa senza rete. «Ricarica dalla rete» la salta; «Svuota la memoria offline» la cancella.
- **OpenTopography (guidato):** account → chiave → incolla; la chiave resta in `localStorage` (`dpsh.dtm.otChiave`), mai nel progetto. Modelli: COP30, COP90, NASADEM, SRTMGL1, AW3D30. Se il browser del PC blocca (CORS) l'errore lo dice.
- **Fonti WCS tue** (`state.settings.dtmFonti`) e **ultima fonte riuscita** (★, `state.settings.dtm.ultima`).
- **3D:** livelli nuovi in «Riferimenti» e «Sfondo»: *Righello delle profondità* (metri veri accanto alla prova più profonda), *Scala vera* (barre orizzontale e verticale; la verticale tiene conto di esagerazione e inclinazione), *Mini-vista 1:1* (colonne di lato senza esagerazione), *Terreno stretto attorno alle prove*. «Inquadra» (`inquadraCorpo3d`) avvicina la vista al corpo indagato; scatta da sola quando l'esagerazione scende a ×1.
- **Assistente:** `fonti_dtm` (campi scelti dall'utente), `leggi_dtm_progetto`, `carica_dtm_da_fonte`, `togli_dtm`, `imposta_dtm_opzioni`, `scala_vista3d`.
- **Non fatto:** il DTM nel report PDF (escluso da Romeo: serve solo per i diritti); copertura disegnata sulla mappa grande (c'è nell'anteprima della finestra).
