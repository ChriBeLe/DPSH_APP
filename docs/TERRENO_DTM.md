# Terreno e sezioni (DTM)

Dal Progetto, «Terreno e sezioni» (anche con Ctrl K).

## Il DTM
- **Formati:** GeoTIFF (a strisce o a tessere; senza compressione, LZW o Deflate; predittori 2 e 3; interi o virgola mobile) e ASCII Grid (.asc).
- **Sistemi:** UTM WGS84 (EPSG 326xx), ETRS89 (258xx, 3044–3046), RDN2008 (6707–6709, 7791–7793) e coordinate geografiche (4326, 4258, 6706). Se il file non lo dice (un .asc senza .prj), l'app lo ricava dalle coordinate delle prove. Gauss-Boaga e Monte Mario non sono gestiti: l'errore dice come riproiettare.
- **Cosa si tiene:** solo il ritaglio attorno alle prove col GPS (± 150 m), al più 250 × 250 celle (media dei blocchi), in centimetri. Sta nel progetto, quindi viaggia nel pacchetto e nel backup; in campo non serve la rete.
- **Togli:** subito, con Annulla.

## Cosa se ne ricava
- **Quota di ogni prova:** interpolata tra le quattro celle vicine. Si vede nella finestra, nel GPS della prova e nel segnaposto del report «Quota del piano campagna».
- **Sezione tra le prove:** prove col GPS in fila lungo la direzione principale, alle distanze vere.
  - Col DTM ogni colonna parte dalla sua quota, e tra le prove c'è il profilo del terreno.
  - Gli strati con lo stesso nome si uniscono tra prove vicine, senza incroci; quelli che mancano si chiudono a metà. La falda si unisce se c'è in entrambe.
  - L'esagerazione verticale è scritta nella figura; c'è la legenda; si scarica in SVG.
- **Vista 3D:** il terreno attorno alle prove, ombreggiato e colorato per quota, con le colonne dentro il suolo.
  - Si gira trascinando o con le frecce; la rotella e i tasti + − avvicinano.
  - L'esagerazione è regolabile; si scarica in SVG.

## Da fare
- **WMS/WCS dei portali (Geoportale Nazionale, SIT regionali):** da provare con gli indirizzi veri, prima di scrivere codice. Con la WMS si vede soltanto un'immagine (utile come sfondo della mappa). Le quote arrivano solo dalla WCS o dal GetFeatureInfo, se il servizio le espone e accetta richieste dall'app.
- **Correzione a mano delle unioni** tra strati nella sezione.
- **Sezione e vista 3D nel report PDF.**

## Test
`test/terreno_dtm.js`, `test/sezione.js`, `test/vista_3d.js`. I DTM di prova sono in `test/dati/dtm/`, rigenerabili con `genera_dtm.py`: un piano noto, e l'UTM è verificato con pyproj.
