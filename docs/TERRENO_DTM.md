# Terreno e sezioni (DTM)

Dal Progetto, «Terreno e sezioni» (anche con Ctrl K).

## Il DTM
- **Formati:** GeoTIFF (a strisce o a tessere; senza compressione, LZW o Deflate; predittori 2 e 3; interi o virgola mobile) e ASCII Grid (.asc).
- **Sistemi:** UTM WGS84 (EPSG 326xx), ETRS89 (258xx, 3044–3046), RDN2008 (6707–6709, 7791–7793) e coordinate geografiche (4326, 4258, 6706). Se il file non lo dice (un .asc senza .prj), l'app lo ricava dalle coordinate delle prove. Gauss-Boaga e Monte Mario non sono gestiti: l'errore dice come riproiettare.
- **Cosa si tiene:** solo il ritaglio attorno alle prove col GPS (± 150 m), al più 250 × 250 celle (media dei blocchi), in centimetri. Sta nel progetto, quindi viaggia nel pacchetto e nel backup; in campo non serve la rete.
- **Togli:** subito, con Annulla.

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
  - Si scarica in SVG e come **modello 3D OBJ + MTL** (metri veri, Y in alto, origine scritta nel file) per Blender, MeshLab, QGIS.

## Da fare
- **WMS/WCS dei portali (Geoportale Nazionale, SIT regionali):** da provare con gli indirizzi veri, prima di scrivere codice. Con la WMS si vede soltanto un'immagine (utile come sfondo della mappa). Le quote arrivano solo dalla WCS o dal GetFeatureInfo, se il servizio le espone e accetta richieste dall'app.
- **Correzione a mano delle unioni** tra strati nella sezione.
- **Sezione e vista 3D nel report PDF.**

## Test
`test/terreno_dtm.js`, `test/sezione.js`, `test/vista_3d.js`. I DTM di prova sono in `test/dati/dtm/`, rigenerabili con `genera_dtm.py`: un piano noto, e l'UTM è verificato con pyproj.
