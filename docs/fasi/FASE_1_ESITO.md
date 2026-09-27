# Fase 1 — Affidabilità dei dati: esito

> Ramo `fase-1-affidabilita-dati`, 26–27/09/2026. `APP_VERSIONE` 2026.09.27.
> `npm test`: **40/40 suite verdi**, `test/base_attesa.json` vuoto, nessuna regressione.
> `dist/DPSH.html`: 4 296 335 byte (inizio fase: 4 233 459; +63 KB, quasi tutto commenti e testi).

Obiettivo della fase: nessuna situazione in cui l'app perde o altera dati senza dirlo. Strada
facendo sono venuti fuori **quattro difetti che perdevano dati davvero**, non previsti dal piano e
corretti perché evidenti (sezione «Difetti trovati»). Il più grave: **i backup JSON non contenevano
nessuna foto**.

---

## 1. Cosa è fatto, punto per punto

### Punto 8 — Fixture (`test/dati/`)
Generate **dall'app di inizio fase** (`dist/DPSH.html` sha256 `7ba1b93c…078e1`, identico a
`riferimento/`), non scritte a mano: `test/dati/genera_fixture.js` apre l'app in jsdom con un
IndexedDB in memoria (`idb_finto.js`) e passa dai comandi veri (finestra Nuovo progetto, +1 e
CONFERMA, Aggiungi intervalli multipli, scheda dell'intervallo, strati e «compila tutti i
parametri», foto da file, nota con immagine, Duplica come interpretazione), poi esporta con le
funzioni vere.
- `stato_v0.json` (localStorage): 2 progetti, 6 prove (5 + la «3B»), strati con parametri avanzati,
  nota con un'immagine, GPS, falda, note sugli intervalli.
- `idb_v0.json`: le 3 foto e l'immagine della nota, come stanno in IndexedDB.
- Export: `backup_stato_v0.json`, `backup_archivio_v0.json`, `progetto_v0.json`,
  `progetto_v0.zip`, `backup_completo_v0.zip`.
- `app_in_jsdom.js`: l'app intera in jsdom per le suite nuove (IndexedDB funzionante, download
  catturati, `window.__dpshEval` aggiunto solo alla copia caricata nel test).
- Descritte in `test/LEGGIMI.md`. Nota: i due JSON di progetto/prova **non hanno le foto**: è il
  difetto dell'app di allora, e sono proprio i file che l'utente ha in mano.

### Punto 1 — Le 10 suite rosse
Tutte e 10 erano **test rimasti indietro**, nessun difetto dell'app: estrazioni senza
`proveFisiche`/`radiceProva`, pin di prova senza id, etichette brevi sotto i wireframe (chieste
esplicitamente), quattro risposte al blocco che non entra (la quarta chiesta esplicitamente),
adattamento a salto invece dei 14 tentativi (chiesto esplicitamente), rientro dell'indice preso dal
template, foglio dell'indice con `--idx-font`, «Modifica testo» diventato «Modifica»/«Scrivi».
Ogni test aggiornato ha un commento che dice perché. `giaRosse` è vuoto.

### Punto 2 — Caricamento sicuro (`004a_dati-salvati-lettura-e-quarantena.js`)
- `saveState` non scrive finché i dati non sono stati letti (`caricamentoDati.bloccato`, in cima
  allo script per la TDZ). Misurato: oggi nessun salvataggio parte prima di `loadState`, quindi il
  blocco d'avvio non toglie niente.
- Testo illeggibile (JSON rotto, `null`, un elenco, versione non valida, eccezione durante il
  caricamento): il testo **resta dov'è**, una **copia esatta e riletta** va nel database delle copie
  automatiche (`QUARANTENA_…`, fuori dall'indice, così la pulizia non la tocca), compare un avviso
  e una **striscia fissa rossa** «Salvataggio sospeso» con «Cosa fare».
- L'avviso (semplice, come chiesto): **Scarica i dati** (il testo grezzo in un `.txt`), **Riparti da
  vuoto** (solo se il testo è già al sicuro sul dispositivo o scaricato, con conferma), **Chiudi**
  (resta sospeso).
- Dati di un'app **più nuova**: non si caricano, non si salva sopra, avviso «installa l'app
  aggiornata»; niente «Riparti da vuoto».
- Memoria non raggiungibile (`getItem` che lancia): non si salva, avviso.

### Punto 3 — Versione dello schema e migrazioni (`004b_versione-dello-schema-e-migrazioni.js`)
- `VERSIONE_SCHEMA_DATI = 1`; `state.versioneSchema` viaggia con lo stato salvato.
- Registro unico `MIGRAZIONI_DATI` (da N a N+1, con descrizione), `migraDati` le applica in ordine
  e si ferma con un errore se manca un passo. Regole per chi ne aggiunge una scritte in testa al pezzo.
- **Migrazione 0→1** = la conversione dei salvataggi di prima dei progetti che stava in
  `migrateLegacyState`; il resto di quella funzione è diventato `applicaStatoSalvato` (fusioni coi
  valori di serie e normalizzazioni dei template, a ogni caricamento: vedi decisioni).
- All'avvio, se servono migrazioni, `saveState` resta sospeso finché la copia automatica
  **«prima di aggiornare i dati (formato 0 → 1)»** non è scritta; poi si salva nel formato nuovo.
  Verificato anche in Chromium: sul telefono la prima apertura della versione nuova fa questa copia.
- Import: `importProjectsFromJSON`, lo ZIP (versione dal manifest) e il «Backup completo» JSON
  passano dalla stessa catena. Un file **più nuovo** si rifiuta con «Aggiorna l'app e riprova: non è
  stato importato niente», **prima** di scrivere foto o progetti.
- Export: `versioneSchema` nel progetto JSON, in `progetto.json` degli ZIP, nel manifest dello ZIP
  completo, fuori e dentro lo stato del Backup completo JSON. Il campo sul progetto serve solo al
  trasporto e si toglie all'import.

### Punto 4 — Controllo di integrità (`004c_controllo-di-integrita.js`)
`verificaIntegrita(stato, { correggi, fotoPresenti, immaginiNotePresenti })` controlla:
intervalli ordinati e contigui (tolleranza 5 mm, per i 0,6000000000000001), lunghezza positiva,
profondità numeriche, colpi interi ≥ 0; id di progetto/prova coerenti con la chiave, la stessa prova
in due progetti, strati con id doppio; interpretazioni orfane; progetto/prova aperti che non
esistono; intervalli assegnati a strati che non esistono (l'app ripiegava in silenzio sul primo
strato); foto e immagini delle note citate ma assenti da IndexedDB.
- **Segnala e non corregge**, salvo i casi banali e sicuri (id diverso dalla chiave → la chiave;
  elenco prove/intervalli assente → vuoto; colpi «12» → 12), corretti e registrati in
  `state.registroCorrezioni` (ora, origine, cosa; ultimi 200).
- **Dopo il caricamento**: correzioni banali sui dati letti, poi (asincrono, con le foto) un avviso
  «Controllo dei dati» che elenca le anomalie, **una volta sola per lo stesso insieme** (firma in
  `localStorage['dpsh_integrita_segnalata']`).
- **Prima di un export**: riquadro rosso «Controllo dei dati: N anomalie» in cima alla finestra
  Esporta e alla scelta del formato del backup (nascosto se non c'è niente). Non blocca.
- **Su un import**: stesso controllo sui dati in arrivo, correzioni banali registrate, anomalie
  elencate nel messaggio di fine import.

### Punto 5 — Tracciabilità (`004d_tracciabilita-degli-intervalli.js`)
Ogni intervallo nuovo: `registratoIl` (ISO UTC) e `origine`: `contatore` (+1 e CONFERMA),
`inserimento-multiplo`, `modifica-manuale` (scritto a mano nella scheda). Una modifica **vera**
(scheda dell'intervallo, nota rapida o personalizzata, cambio del passo che sposta le profondità)
aggiunge `modificatoIl`; riaprire la scheda e salvare senza cambiare niente no. Gli intervalli di
prima restano senza campi. Nei dati e nei JSON sì, nel report no (verificato sul report della prova).

### Punto 6 — Salvataggio verificato
Dopo `setItem` si rilegge e si confronta la lunghezza; se non torna è un errore come gli altri e
passa dall'avviso esistente (una volta, poi di nuovo solo dopo un salvataggio riuscito). La
valutazione IndexedDB è nella sezione 4.

### Punto 7 — Librerie Excel offline
**Escluso su indicazione dell'utente** (la connessione non è un problema): `xlsx` ed `exceljs`
restano dalla CDN, nessun commit su questo punto.

---

## 2. Difetti trovati e corretti (fuori dal piano, tutti con test e controprova)

1. **I backup JSON uscivano senza nessuna foto** (progetto e prova). Il segnaposto usato per non
   duplicare le foto in memoria era fra due `\u0000`, che `JSON.stringify` riscrive: non si
   ritrovava e la foto non veniva rimessa. Verificato anche in Chromium. **Reimportando** quel file,
   il segnaposto finiva in IndexedDB **al posto della foto vera** con lo stesso id.
   Ora: segnaposto in testo semplice, e se uno non si ritrova il backup si ferma con un errore;
   avviso se qualche foto citata non è sul dispositivo; l'import scrive solo immagini vere e dice
   quante foto mancavano nel file (i JSON fatti fino a oggi non le hanno: **gli ZIP sì**).
2. **Il «Backup completo» JSON** esportava lo stato in memoria: dopo un riavvio niente foto delle
   sessioni precedenti e niente immagini delle note. E il suo import **non scriveva le foto in
   IndexedDB**: sparivano al riavvio. Ora reidrata come gli altri e l'import le salva; dice anche
   quanti progetti con lo stesso id sono stati **sostituiti** (prima l'avviso diceva «senza
   cancellare i dati attuali»).
3. **Progetto fantasma «Nuovo Cantiere»**: un archivio senza progetti (appena installato, o tutti
   eliminati), riaperto, si ritrovava un progetto inventato dall'intestazione in memoria.
4. **Duplica progetto** lasciava la «3B» della copia legata alla prova del progetto originale (nella
   copia diventava una prova in più); l'import di un progetto già presente teneva gli id delle
   prove uguali all'originale. Ora le copie hanno id di prova nuovi e le interpretazioni li seguono.
5. **Ora dell'ultimo backup completo**: si salvava ma non si rileggeva; dopo ogni riavvio l'app
   diceva «mai» e il promemoria del backup lavorava a vuoto. Ora si rilegge.

Piccolo ritocco d'interfaccia, solo per gli avvisi: `appDialog` accetta `icona`/`coloreIcona`
(prima «dati salvati…» veniva mostrato con la spunta verde del successo).

---

## 3. Test

| Suite | Cosa | Esito |
|---|---|---|
| `caricamento_sicuro.js` (nuova) | testo rovinato non sovrascritto, quarantena, avviso, scarica, riparti da vuoto, controprova | 36 ok |
| `schema_e_migrazioni.js` (nuova) | registro, 0→1, fixture identiche, formati di prima dei progetti, fantasma, copia prima di aggiornare, import di tutti i file di oggi, export con versione, file più nuovo rifiutato, controprove | 51 ok |
| `backup_foto.js` (nuova) | foto nei JSON, andata e ritorno, JSON vecchio che non rovina le foto, backup completo, controprove | 26 ok |
| `controllo_integrita.js` (nuova) | tutte le anomalie, casi banali, avviso una volta, riquadri di export, import, copie di progetto, controprove | 46 ok |
| `tracciabilita_intervalli.js` (nuova) | contatore, multipli, a mano, modifiche vere e finte, nota rapida, passo, JSON sì/report no, controprova | 18 ok |
| `salvataggio_verificato.js` (nuova) | memoria che tronca in silenzio, avviso una volta, controprova | 9 ok |
| 10 suite storiche + `copie_automatiche.js` | aggiornate (sezione 1, punto 1) | verdi |

Le controprove girano sul file di `riferimento/` (l'app com'era): ogni suite nuova mostra che lì il
difetto c'è. **`npm test`: 40/40 verdi, nessuna regressione.**

Verifica nel browser (anteprima Chromium, 375×812 e 1280×800) su origini di prova create apposta
(`127.0.0.2/.4/.5:8744`, lasciate come sono): migrazione 0→1 con la copia «prima di aggiornare i
dati», avviso e riquadro del controllo dei dati, avviso e striscia dei dati illeggibili col testo
rimasto intatto.

---

## 4. Valutazione: stato principale da localStorage a IndexedDB

**Oggi.** Lo stato principale (tutto tranne foto e immagini delle note) sta in una chiave di
localStorage; foto, immagini delle note e copie automatiche sono già in IndexedDB. La fixture (2
progetti, 6 prove) pesa 30 KB: circa 4–5 KB per prova. Il limite di localStorage è intorno ai 5 MB
(10 MB di UTF-16 su alcuni browser), cioè molte centinaia di prove. Le cose che possono gonfiarlo
davvero sono le **immagini incorporate nello stato**: `templateImages` delle prove (immagini libere
dei template), le immagini d'intestazione dei template di report, e `htmlPrimaDelMotore` delle note.

**Pro di IndexedDB**
- Spazio molto più ampio (una quota del disco, non 5 MB), e si può chiedere
  `navigator.storage.persist()`.
- Scritture per progetto: si salverebbe solo il progetto cambiato, non tutto lo stato a ogni tocco.
- Transazioni: stato e foto nella stessa transazione, niente stati a metà fra i due magazzini.
- Non blocca il thread principale durante la scrittura.

**Contro e rischi**
- `saveState` è sincrono e chiamato in ~145 punti che danno per scontato che, al ritorno, il dato
  sia scritto. Con IndexedDB la scrittura finisce dopo: se il telefono uccide l'app in quel momento
  (in campo succede) l'ultimo colpo si perde. localStorage scrive subito. Servirebbe una coda con
  flush su `visibilitychange`/`pagehide`, che però non garantisce il completamento.
- Più codice asincrono nel percorso più delicato dell'app (il contatore).
- **APK vecchi**: un'app di prima reinstallata non vedrebbe i dati in IndexedDB, troverebbe
  localStorage vuoto e partirebbe vuota (senza le protezioni di questa fase). Andrebbe tenuto un
  mirror in localStorage per tutta la transizione.
- IndexedDB ha avuto difetti seri su alcune versioni di WebView/Safari; localStorage è più noioso ma
  più prevedibile.
- Ogni cambio di versione del database va gestito con cura (la lezione di `DPSH_PhotoStorageDB`
  versione 2, citata nel codice delle copie).

**Raccomandazione: non spostarlo adesso.** Con questa fase localStorage è salvato con verifica,
protetto all'avvio, affiancato dalle copie automatiche in IndexedDB. Il rischio vero è lo spazio,
e la cura più piccola e sicura è togliere dallo stato **le immagini incorporate** (`templateImages`,
immagini dei template, `htmlPrimaDelMotore`) portandole in IndexedDB come le foto: una migrazione
registrata 1→2, poche righe, niente cambi al contatore. In più: una soglia d'avviso sul peso della
chiave nel pannello «Spazio occupato» (il dato c'è già) e `navigator.storage.persist()`. Lo
spostamento completo va valutato solo se, dopo questo, lo stato di un utente reale supera ~2 MB.

---

## 5. Decisioni prese, da confermare

1. **Normalizzazioni dei template a ogni caricamento** (non solo nella migrazione 0→1): sono
   idempotenti e proteggono anche da un template vecchio importato dopo dalla libreria. La 0→1
   contiene solo la conversione dal formato senza progetti.
2. **Conversione dal formato senza progetti solo se `projects` manca** (non se è vuoto): è ciò che
   toglie il progetto fantasma.
3. **Se la copia «prima di aggiornare i dati» non si può scrivere**, l'app va avanti (lo dice solo
   nella console): bloccare l'app in campo per una copia di riserva sembrava peggio, dato che
   l'utente ha i backup.
4. **Quarantena**: la copia del testo illeggibile resta nel database delle copie finché non si fa un
   Reset, ma **non c'è un comando per riprenderla dall'app** (si scarica dall'avviso, prima di
   ripartire). Scelto per restare semplici, come chiesto; si può aggiungere alla Cronologia.
5. «Riparti da vuoto» c'è solo per i dati illeggibili, **non** per i dati di un'app più nuova (lì
   la strada è aggiornare l'app).
6. **Casi banali corretti da soli**: solo id diverso dalla chiave, elenchi assenti, colpi scritti
   come testo di un intero. Tutto il resto si segnala.
7. **Avviso del controllo dei dati una volta sola per le stesse anomalie** (un buco voluto, dopo
   aver eliminato un intervallo in mezzo, non deve ricomparire a ogni apertura); l'elenco resta
   sempre visibile nella finestra Esporta. Le foto condivise fra una prova e la sua «3B» sono giuste.
8. **Tracciabilità**: `origine: 'import'` è definita ma non ancora usata (nessun percorso oggi crea
   intervalli da un file esterno; gli intervalli importati tengono i campi che hanno). Le
   riassegnazioni di strato fatte con gli strumenti degli strati (riconoscimento automatico,
   trascinamento dei contatti, archivio) **non** segnano `modificatoIl`: sono interpretazione, non
   misura. Dalla scheda dell'intervallo invece sì, strato compreso.
9. Il Backup completo JSON **sostituisce ancora** i progetti con lo stesso id (con copia prima e ora
   dicendolo): la scelta Sostituisci/Tieni entrambi è della Fase 2.
10. Import di un progetto già presente: la copia rinominata prende anche **id di prova nuovi**
    (come Duplica). Le foto restano condivise per id, apposta.

---

## 6. Per la Fase 2: cosa oggi perde o altera il passaggio telefono ↔ PC

L'utente vuole che il pacchetto sia la **copia esatta** del progetto: GPS delle prove, foto
originali non ricompresse con le loro coordinate, immagini delle note, strati, template, storico.
Cosa ho visto nel codice di export/import attuale:

- **Foto**: nei JSON (dopo questa fase) e negli ZIP sono i **byte originali**, senza
  ricompressione, EXIF intatti; coordinate e fonte GPS stanno nel record della foto. La
  compressione (`068_compressione-foto-per-lexport-pdf.js`) vale solo per il PDF. Da tenere così.
- **Lo ZIP salta in silenzio le foto che non trova** in IndexedDB (nessun avviso, a differenza del
  JSON di adesso). Una foto condivisa fra la 3 e la 3B viene scritta due volte (innocuo, pesa di più).
- **I template non viaggiano col progetto**: progetto JSON e ZIP (anche lo ZIP completo) non
  contengono `reportTemplates` né `indiceTemplates`, a cui il progetto rimanda
  (`survey.reportTemplateId`, `proj.indiceTemplateId`, template dell'introduzione). Sull'altro
  dispositivo il riferimento resta ma il template non c'è (probabile ripiego sul Classico, da
  verificare). Stesso discorso per le immagini d'intestazione dei template.
- **Archivio litologico** non incluso nel progetto (gli strati hanno `sourceArchiveId` verso voci
  che sull'altro dispositivo possono mancare). Solo il Backup completo JSON lo porta.
- **Lo storico non viaggia mai**: le copie automatiche (Cronologia) stanno solo nell'IndexedDB del
  dispositivo. Nemmeno `registroCorrezioni` e `ultimoBackupCompleto` sono nei pacchetti di progetto.
- L'import da Home di un **JSON dello stato intero** prende solo i progetti (template e archivio
  litologico del file vengono ignorati); il Backup completo JSON unisce l'archivio litologico ma non
  i template.
- **`updatedAt` non è affidabile per dire quale versione è più recente**: ogni `saveState`
  (`syncStateToProject`) lo aggiorna per il progetto aperto anche senza modifiche, basta aprirlo.
  Per il confronto «quello presente è più recente del pacchetto» serve un'altra data (per esempio
  l'ultimo `registratoIl`/`modificatoIl` degli intervalli, o un'impronta del contenuto).
- `notes.htmlPrimaDelMotore` (la copia della nota prima della conversione al nuovo editor) viene
  esportata **senza le sue immagini** (si reidrata solo `notes.html`).
- I nomi dei file esportati usano il comune, non il nome del progetto: due progetti dello stesso
  comune escono con lo stesso nome.
- Il `timestamp` delle foto è una data locale in testo («26/09/2026 21:15»), non ISO.

---

## 7. Da provare sul telefono

1. **Prima apertura della versione nuova** con i dati veri: i progetti ci sono tutti, uguali; in
   menu → Cronologia e ripristino compare una copia «prima di aggiornare i dati (formato 0 → 1)».
2. Può comparire una volta l'avviso **«Controllo dei dati»**: leggere cosa elenca (buchi negli
   intervalli, foto non trovate…). Riaprendo l'app non deve ricomparire.
3. In una prova: qualche +1 e CONFERMA, un «Aggiungi intervalli multipli», una modifica dalla
   scheda. Chiudere e riaprire l'app: tutto al suo posto. (I campi nuovi non si vedono, stanno nei
   dati.)
4. **Backup JSON di un progetto con foto**: il file ora deve essere grande quanto le foto (prima era
   piccolo); reimportarlo (esce «(Importato)») e controllare che le foto si vedano.
5. **Backup completo JSON**: dopo aver chiuso e riaperto l'app, farlo e controllare che il file
   contenga le foto (dimensione); le foto devono esserci anche importandolo su un altro dispositivo.
6. Importare un **vecchio backup JSON** (fatto prima di oggi): il messaggio deve dire che le foto
   non c'erano nel file; le foto già sul telefono devono restare quelle.
7. Aprire Esporta su un progetto: se c'è il riquadro rosso «Controllo dei dati», leggerlo.
8. Il promemoria del backup in Home e la riga «Ultimo backup completo» nel menu devono ricordarsi il
   backup anche dopo aver chiuso l'app.
9. Duplicare un progetto con una «3B»: nella copia la 3B deve restare interpretazione della 3.
10. Velocità del contatore con molti progetti: ogni salvataggio ora rilegge lo stato per
    verificarlo; se si nota un ritardo al tocco, segnalarlo.
