# Fase 2 — Passaggio telefono ↔ PC: esito

> Ramo `fase-2-telefono-pc`, 27/09/2026. `APP_VERSIONE` 2026.09.27.2 (secondo rilascio del giorno,
> dopo la Fase 1). `VERSIONE_SCHEMA_DATI` 2.
> `npm test`: **44/44 suite verdi** (40 di prima + 4 nuove), nessuna regressione.
> `dist/DPSH.html`: 4 405 776 byte (fine Fase 1: 4 296 335; +109 KB, quasi tutto commenti, testi e
> le due finestre).

Obiettivo della fase (decisione I): portare un progetto dal telefono al PC e ritorno, senza perdite e
senza dubbi su quale sia la versione buona. Il pacchetto è la **copia esatta** del progetto.

---

## 1. Cosa è fatto, punto per punto

### Punto 1 — Il pacchetto di progetto (`src/js/044b_pacchetto-di-progetto.js`)
Uno ZIP «store» (come i backup: i byte delle foto non passano da nessuna ricompressione) chiamato
`<Nome_progetto>_<AAAA-MM-GG>.dpsh.zip`. Contiene (formato nella sezione 2):
- **prove** con ogni campo così com'è salvato: GPS (lat, lng, alt, acc), falda, strumento, intervalli
  con il loro storico (`registratoIl`, `origine`, `modificatoIl`), anche i campi che l'app non usa;
- **foto** con i byte originali (EXIF intatti), una volta sola anche se condivise fra la 3 e la 3B, e
  l'**intera** di una foto ritagliata (`id__orig`); il record della foto (coordinate, fonte GPS, ora)
  sta nel progetto;
- **immagini delle note**, anche quelle di `htmlPrimaDelMotore` e l'intera di quelle ritagliate;
- **strati** con i parametri scelti, e le **voci d'archivio** a cui rimandano (`sourceArchiveId`);
- i **template di report, d'indice e d'introduzione** usati, con le loro immagini (stanno nel
  template: l'intestazione come dataUrl);
- `registroCorrezioni` del progetto.

Le copie automatiche (Cronologia) restano del dispositivo, come deciso. `ultimoBackupCompleto` non
viaggia: dice quando **questo** dispositivo ha fatto un backup completo.

**All'arrivo** (`src/js/044a_librerie-che-viaggiano-col-progetto.js`, `accogliLibrerie`): un template o
una voce d'archivio identica già presente si riusa; una diversa (anche con lo stesso id o lo stesso
nome) entra come copia «Nome (da Telefono)» e il progetto punta alla copia. **Niente del dispositivo
si sovrascrive mai.** Un «Classico» diverso da quello di qui entra come copia (non di serie) e le prove
che usavano il Classico implicitamente puntano ad essa: il report esce uguale.

**«Più recente»** (`src/js/004e_impronta-e-modifiche-vere.js`):
- `proj.modificatoIl`: l'ultima modifica **vera** del contenuto. La aggiorna `saveState` confrontando
  il contenuto con quello già visto. Non sono modifiche: aprire il progetto o passare fra le prove,
  cambiare tema o altre preferenze dell'app, salvare di nuovo, `updatedAt`, l'ora di salvataggio
  della nota, esportare, ricevere.
- **impronta del contenuto** (SHA-256): uguale su due dispositivi se e solo se il progetto è lo
  stesso, byte delle foto, note, template e voci d'archivio compresi, qualunque siano gli id con cui
  template, voci e immagini sono salvati sui due lati.
- `proj.passaggi.impronte`: ogni volta che il progetto esce in un pacchetto, la sua impronta. Chi
  riceve capisce se il suo progetto è una tappa di quello in arrivo (sostituire non perde niente),
  se è il pacchetto a essere una tappa del suo (qui c'è di più), o se hanno una tappa in comune e
  sono andati avanti tutti e due (modifiche da entrambe le parti). Senza tappe in comune (dati di
  prima) decidono le date di `modificatoIl`. Se le impronte sono uguali: «identico, non c'è niente
  da aggiornare».

Il pacchetto parte dallo ZIP di oggi (stessa scrittura store-only); tutto ciò che si importava prima
si importa ancora (JSON e ZIP della Fase 1 e del formato 0, verificato con le fixture).

### Punto 2 — Import con anteprima (`leggiPacchetto`, `confrontaConPresente`, `applicaPacchetto`)
- Prima di scrivere **qualsiasi cosa**: ogni file del manifest c'è, ha la dimensione giusta e lo
  SHA-256 giusto; nessun file in più; versione del pacchetto e dei dati leggibili. Un pacchetto
  rovinato si rifiuta intero, col motivo («"foto/…jpg" è rovinato: l'impronta non corrisponde»).
- L'anteprima mostra cosa arriva, da quale dispositivo e quando, le anomalie dei dati (controllo di
  integrità della Fase 1) e il confronto col progetto presente.
- **Sostituisci**: prima una copia automatica «prima di ricevere «Nome» da Telefono», **aspettata**:
  se non si può scrivere, non si sostituisce (si propone Tieni entrambi). Se il progetto sostituito
  è quello aperto, lo stato attivo si ricarica (altrimenti il primo salvataggio rimetteva la prova di
  prima).
- **Tieni entrambi**: copia «Nome (Telefono 26/09)» con id di progetto e di prova nuovi (le
  interpretazioni seguono la loro prova).
- Le immagini si scrivono e si **verificano** prima del progetto: se una non si scrive, il progetto
  non entra. Un'immagine già presente con lo stesso id e gli stessi byte non si riscrive; con lo
  stesso id ma byte **diversi** (ritagliata di qua e non di là) quella di qui resta e quella in arrivo
  entra con un id nuovo.

### Punto 3 — Un solo punto per ciascuno
«Porta su un altro dispositivo» nel ⋯ del progetto (finestra Azioni Progetto). «Ricevi» in Home al
posto di «Importa» (anche nello stato vuoto): se il file è un pacchetto apre l'anteprima, altrimenti
JSON e ZIP di oggi passano dalla strada di sempre.

### Punto 4 — Test di andata e ritorno
`test/pacchetto_progetto.js`, sezione 4 qui sotto: confronto profondo campo per campo del progetto
salvato sui due «dispositivi», delle librerie usate e delle correzioni; foto e immagini delle note
confrontate per SHA-256 dei byte; stesso template risolto per il report di ogni prova. Poi il
pacchetto rovinato (4 modi) rifiutato senza scrivere niente, e due dispositivi con template omonimi
ma diversi dove nessuno dei due si sovrascrive.

### Punto 5 — Interfaccia (`src/markup/43_modalPortaERicevi.html`, `src/css/02_passaggio-telefono-pc.css`, `src/js/044c_finestre-porta-e-ricevi.js`)
Come le tavole del prototipo: foglio dal basso sul telefono (≤ 760 px), finestra centrata sul PC.
- **Porta**: titolo e nome del progetto; quattro numeri (prove, intervalli, foto, strati «con
  parametri» se ce ne sono); le tre spunte verdi; «Questo dispositivo: Telefono · Cambia nome»; il
  bottone «Crea il pacchetto · 38 MB» col peso stimato dalle foto vere (mentre calcola: «Calcolo il
  peso…»); la nota sui Download. In più, rispetto al prototipo: un riquadro giallo **prima** di
  creare il pacchetto se delle foto non si trovano (bottone «Crea il pacchetto lo stesso»).
- **Ricevi**: titolo e nome del file; «Controlli» (pacchetto integro · N file verificati; versione
  compatibile; nessuna anomalia o l'elenco; immagini che mancavano già alla partenza) e «Cosa
  arriva» (nome, conteggi, «Da Telefono, esportato il 26/09/2026 alle 18:40»); riquadro di confronto
  neutro o **giallo**; le due scelte a radio con «(consigliato)»; «Annulla» e il bottone principale
  che segue la scelta («Sostituisci», «Importa come copia», «Importa»). Progetto identico: niente
  scelte, «Chiudi» e, se proprio si vuole, «Importa una copia». Pacchetto rovinato: riquadro rosso e
  solo «Chiudi».
- Solo variabili del tema, testo da 12 px in su (misurato: minimo 12 in Porta, 13 in Ricevi),
  bottoni 44 px (56 il principale di Porta), icone `#i-…`, niente emoji.

Verificato in Chromium (anteprima, origini di prova 127.0.0.6 «telefono» e 127.0.0.7 «PC», lasciate
come sono) a 375×812 e 1280×800: il foglio Porta come la tavola, il pacchetto creato, ricevuto sul PC
(template, indice, voce d'archivio, 5 immagini con l'intera del ritaglio), riquadro giallo dopo una
modifica sul PC, Sostituisci con la copia automatica in Cronologia; nessuno scorrimento orizzontale.
crypto.subtle lì c'è ed è stato usato; in jsdom no (ripiego in JavaScript, stesso risultato: testato).
Il passaggio del file fra le due origini l'ho fatto generando il pacchetto con l'app in jsdom (un
download vero dal pannello non l'ho fatto): il **giro con un file vero, cavo o cloud**, resta da
provare sui dispositivi (sezione 6).

### Punto 6
Niente cloud e niente «Condividi»: il file finisce nei Download e lo sposta l'utente.

### Il §6 della Fase 1, voce per voce

| Voce del §6 | Chiusa così |
|---|---|
| Foto: byte originali, EXIF intatti, coordinate nel record | Mantenuto, e dimostrato: SHA-256 uguali, anche di un JPEG con EXIF; prefisso del dataUrl conservato, la stringa in IndexedDB è identica carattere per carattere |
| Lo ZIP salta in silenzio le foto che non trova | Il pacchetto le dice **prima** (riquadro in Porta) e le elenca nel manifest; anche lo ZIP di progetto, quello delle foto e quello dell'archivio ora avvisano |
| Foto condivisa 3/3B scritta due volte | Una volta sola nel pacchetto e negli ZIP |
| I template non viaggiano (anche ZIP completo); immagini d'intestazione | Viaggiano nel pacchetto, nel JSON e nello ZIP del progetto (usati) e nello ZIP dell'archivio (tutti), con le immagini |
| Archivio litologico non incluso | Idem, con i collegamenti degli strati riportati alle voci giuste |
| Lo storico non viaggia; `registroCorrezioni`, `ultimoBackupCompleto` | Storico degli intervalli e correzioni del progetto viaggiano; Cronologia e `ultimoBackupCompleto` restano del dispositivo (decisione) |
| Import da Home del JSON dello stato intero ignora template e archivio; Backup completo JSON unisce l'archivio ma non i template | Tutti e due accolgono template e archivio con la regola del pacchetto; niente più doppioni «(Importato)» di voci identiche |
| `updatedAt` non affidabile | `modificatoIl` + impronta + tappe dei passaggi |
| `htmlPrimaDelMotore` senza immagini | Le porta (pacchetto, JSON, ZIP) e le rimette in IndexedDB all'import |
| Nomi dei file col comune | Col nome del progetto (pacchetto, JSON e ZIP del progetto, ZIP delle foto, JSON della prova) |
| `timestamp` delle foto in testo locale | Il testo resta com'è (viaggia identico); le foto nuove hanno anche `scattataIl` ISO. Le vecchie no: non si inventa il fuso |

### Difetti trovati e corretti (fuori dal piano, con test)
1. **Il JSON della prova (Esporta › JSON) si fermava** con «segnaposto non trovato: backup annullato»
   quando la prova aperta aveva delle foto: i segnaposto si cercavano nell'ordine in cui erano stati
   creati, non in quello del testo. Ora si cercano per posizione.
2. **Backup completo JSON sul progetto aperto**: sostituiva il progetto ma lo stato attivo restava
   quello di prima, e il salvataggio successivo rimetteva dentro la prova vecchia. Ora si ricarica.
3. **Backup completo JSON e archivio litologico**: una voce rinominata «(Importato)» lasciava gli
   strati del file collegati all'id vecchio (cioè alla voce del dispositivo). Ora puntano alla copia.

---

## 2. Formato del pacchetto e del manifest

```
Nome_progetto_2026-09-27.dpsh.zip      (ZIP, solo «store»)
  manifest.json
  progetto.json                        il progetto com'è salvato (foto senza immagine, note con src="")
  librerie.json                        { reportTemplates, indiceTemplates, lithologyArchive, usi }
  registro.json                        [ correzioni registrate del progetto ]
  foto/Prova_<N>/DPSH_<N>-<k>.<ext>    byte originali; «_intera» = la foto prima del ritaglio
  immagini_note/<id>.<ext>             anche «_intera»
```
`usi[projId] = { prove: { survId: idTemplate }, indice, introduzione }`: quale template usa davvero
ogni parte (un id che punta a un template sparito vale «Classico», come nel report).

```jsonc
{
  "tipo": "dpsh-pacchetto-progetto",
  "formatoPacchetto": 1,                 // un'app che ne legge di meno rifiuta con «aggiorna l'app»
  "versioneSchema": 2,                   // i dati; la catena di migrazioni della Fase 1 vale anche qui
  "versioneApp": "2026.09.27.2",
  "progetto": { "id": "PROJ_…", "nome": "Scuola Via Roma" },
  "esportatoIl": "2026-09-27T07:46:07.254Z",
  "dispositivo": "Telefono",             // l'etichetta di Cambia nome
  "modificatoIl": "…" ,                  // ultima modifica vera, o null
  "impronta": "<sha256 del contenuto>",  // ricalcolata all'arrivo e confrontata
  "conteggi": { "prove", "intervalli", "foto", "strati", "parametri" },
  "fotoMancanti": [ { "id", "prova" } ], "immaginiNoteMancanti": [ { "id" } ],
  "file": [
    { "percorso": "progetto.json", "byte": 7292, "sha256": "…" },
    { "percorso": "foto/Prova_2/DPSH_2-1.jpg", "byte": 3065, "sha256": "…",
      "archivio": "photos", "id": "photo_…", "prefisso": "data:image/jpeg;base64" }
  ]
}
```
Il manifest non elenca sé stesso. `prefisso` serve a ricostruire all'arrivo **la stessa stringa**
che c'era in IndexedDB. Forma dei dati 2 (migrazione 1→2 registrata, `004b`): campi nuovi che
nascono vuoti — `proj.modificatoIl`, `proj.passaggi`, `foto.scattataIl`,
`registroCorrezioni[].projId/survId`. Un'app della Fase 1 rifiuta un pacchetto (formato 2) con
«aggiorna l'app»; l'app di prima della Fase 1 dice «Formato non riconosciuto» (controprova).

Il nome del dispositivo sta in `localStorage['dpsh_nome_dispositivo']`, **non** in `state.settings`:
le impostazioni viaggiano dentro ogni prova e aprire una prova arrivata dal telefono avrebbe
chiamato «Telefono» il PC. Senza nome: «Telefono» se il browser si dichiara mobile, altrimenti «PC».

---

## 3. Test

| Suite | Cosa | Esito |
|---|---|---|
| `modifiche_vere.js` (nuova) | SHA-256 JS contro Node (lunghezze di confine, 100 KB, UTF-8) e con crypto.subtle; JSON canonico; `modificatoIl` che non si muove aprendo, cambiando prova, tema, preferenze, salvando; che si muove col contatore e su un progetto non aperto; riapertura; migrazione 1→2 con la sua copia; registro con projId; controprova | 27 ok |
| `librerie_in_viaggio.js` (nuova) | template, indice, introduzione e voce d'archivio arrivano identici e usati con JSON e ZIP del progetto, ZIP dell'archivio, JSON dello stato, Backup completo JSON (niente doppioni, progetto aperto riallineato); omonimi diversi mai sovrascritti; Classico diverso; reimport che riusa; htmlPrimaDelMotore; ZIP che avvisa e scrive una volta la foto condivisa; nomi dei file; fixture v0; controprove | 51 ok |
| `pacchetto_progetto.js` (nuova) | manifest e impronte; **andata con confronto profondo e SHA-256 delle foto**; 4 pacchetti rovinati rifiutati senza scrivere; template omonimi; **ritorno** (pacchetto più recente → Sostituisci, copia automatica, identico dopo); identico; presente più recente; modificati tutti e due; Tieni entrambi; foto con lo stesso id e byte diversi; foto mancanti; file di oggi; controprova | 61 ok |
| `finestre_passaggio.js` (nuova) | il giro coi tocchi: ⋯ → Porta → Cambia nome → Crea; Ricevi in Home → anteprima → Importa; identico; giallo con «Tieni entrambi (consigliato)» e bottone che segue la scelta; rovinato; JSON di oggi da Ricevi; controprova | 39 ok |
| `schema_e_migrazioni.js`, `salvataggio_verificato.js` | seguono `VERSIONE_SCHEMA_DATI` invece di fissarla a 1 (la catena da 0 ora ha due passi) | verdi |

`test/dati/progetto_ricco.js`: aggiunge al progetto delle fixture quello che le fixture non hanno
(template con immagine, indice, introduzione, voce d'archivio, nota di prima del motore con immagine,
JPEG con EXIF, intera di un ritaglio, intervalli dal contatore, una correzione). Le controprove girano
su `riferimento/`. **`npm test`: 44/44 verdi, nessuna regressione.**

Costo del controllo delle modifiche vere a ogni salvataggio, misurato in jsdom su uno stato di 1,3 MB
(150 progetti): 14 ms su un `saveState` che ne costa ~500 in jsdom (≈ 3%).

---

## 4. Decisioni prese, da confermare

1. **Uguaglianza delle voci di libreria senza il nome.** Due template (o voci d'archivio) sono «lo
   stesso» se è uguale tutto tranne id, nome, date e «di serie»: il report esce identico. Contando il
   nome, al ritorno «Modello Rossi (da Telefono)» non sarebbe più riconosciuto e nascerebbe una copia
   a ogni viaggio. Conseguenza: se qui c'è un template identico con un altro nome, il progetto usa
   quello.
2. **Il Classico diverso diventa una copia** («Classico (da Telefono)») e le prove puntano ad essa,
   invece di sovrascrivere il Classico del dispositivo. Vale anche per il Backup completo JSON:
   ripristinando su un dispositivo nuovo un Classico ritoccato, arriva come copia.
3. **Backup completo JSON e JSON dello stato intero** accolgono **tutte** le voci di libreria del
   file (è un backup); JSON e ZIP del progetto solo quelle usate. Il Backup completo JSON continua a
   **sostituire** i progetti con lo stesso id (con copia prima, come deciso in Fase 1): la scelta
   Sostituisci/Tieni entrambi c'è solo per il pacchetto.
4. **Un'immagine con lo stesso id ma byte diversi** entra con un id nuovo invece di sostituire quella
   di qui (che potrebbe servire a un duplicato del progetto).
5. **Se la copia automatica prima di Sostituisci non si può scrivere, non si sostituisce.** Per il
   caricamento all'avvio (Fase 1) si va avanti lo stesso; qui c'è un'alternativa sicura, Tieni entrambi.
6. **Relazioni senza tappe comuni** (progetti di prima di questa fase): decide la data di
   `modificatoIl`; senza date, «non si può dire quale sia più recente» in giallo e Tieni entrambi
   consigliato.
7. **Esportare registra la tappa** nel progetto anche se poi il file non viene spostato: è innocuo
   (dice solo che quel contenuto è esistito), e senza non si riconoscerebbe il ritorno.
8. **Nome del dispositivo fuori da `state.settings`** e fuori dai backup (vedi sezione 2).
9. **Riquadro delle foto mancanti in Porta** e riga «immagini che mancavano già» in Ricevi: non sono
   nel prototipo, ma il piano chiede di dirlo **prima** di creare il pacchetto.
10. `ultimoBackupCompleto` e le copie automatiche non viaggiano: sono del dispositivo.
11. Icone: «Ricevi» in Home ha ora `i-download`, «Porta su un altro dispositivo» `i-upload`.
12. `APP_VERSIONE` 2026.09.27.**2**: stesso giorno della Fase 1, secondo la regola scritta in `000`.

Non fatto, e perché: nessun punto del mandato è rimasto aperto. La controprova «l'app della Fase 1
rifiuta un pacchetto» non è automatica (il `dist` della Fase 1 non è nel repository): la regola è la
stessa già testata in Fase 1 (`versioneSchema` più nuovo → rifiuto).

---

## 5. Cosa resta da verificare nel browser (coordinatore)
Fatto nell'anteprima (sezione 1, punto 5), manca solo il passaggio di un file **scaricato davvero**
dal pannello e ripreso con il selettore di file: il download non l'ho fatto partire. Le animazioni
di comparsa dei fogli non si vedono col pannello nascosto (le transizioni sono ferme): con il
pannello visibile il foglio deve salire dal basso.

## 6. Da provare sul telefono e sul PC — il giro completo

Serve lo stesso `dist/DPSH.html` nell'APK del telefono e aperto nel browser del PC.

**Prima**
1. Telefono: prima apertura della versione nuova. In menu → Cronologia deve comparire una copia
   «prima di aggiornare i dati (formato 1 → 2)». I progetti sono tutti lì, uguali.

**Andata: telefono → PC**
2. Telefono: in Home, ⋯ di un progetto con foto → **Porta su un altro dispositivo**. Controllare i
   quattro numeri, e che il bottone passi da «Calcolo il peso…» a «Crea il pacchetto · N MB» con un
   peso sensato (circa quello delle foto). Se compare il riquadro giallo delle foto mancanti,
   leggerlo.
3. «Cambia nome» → scrivere «Telefono» (o come si vuole) → la riga lo mostra.
4. «Crea il pacchetto»: il file `Nome_progetto_data.dpsh.zip` deve finire nei Download, e il
   messaggio dirlo. Il foglio deve salire dal basso e i bottoni essere comodi coi guanti.
5. Portare il file sul PC (cavo o servizio a scelta).
6. PC: aprire DPSH → Home → **Ricevi** → scegliere il file. Deve aprirsi «Ricevi un progetto»:
   «Pacchetto integro · N file verificati», versione compatibile, nessuna anomalia; «Da Telefono,
   esportato il …». Se il PC non ha il progetto: «Importa».
7. PC: aprire il progetto e confrontarlo col telefono: prove con GPS, intervalli, strati e
   parametri, note con le immagini, foto (aprirle: stessa qualità; scaricata una foto, ha ancora i
   dati EXIF), template del report assegnati. **Fare il report PDF** su entrambi: deve essere uguale.

**Ritorno: PC → telefono**
8. PC: modificare qualcosa (un intervallo con «Aggiungi intervalli multipli», i parametri di uno
   strato), poi ⋯ → Porta su un altro dispositivo → Crea il pacchetto (il nome del dispositivo qui
   sarà «PC», o cambiarlo in «PC ufficio»).
9. Telefono: Home → Ricevi → il file del PC. Il riquadro deve essere **neutro** («Il pacchetto è più
   recente e contiene già tutto quello che c'è qui») e «Sostituisci quello sul telefono
   (consigliato)» selezionato. Sostituisci.
10. Telefono: il progetto ha le modifiche del PC; in Cronologia c'è «prima di ricevere «Nome» da PC».

**I casi da non sbagliare**
11. Ricevere di nuovo lo stesso file: «identico, non c'è niente da aggiornare», bottone «Chiudi».
12. Telefono: modificare il progetto; poi ricevere un pacchetto **vecchio** (quello del punto 4):
    riquadro **giallo** «è PIÙ RECENTE del pacchetto», «Tieni entrambi (consigliato)». Provare
    «Tieni entrambi»: arriva «Nome (Telefono gg/mm)» e l'originale resta com'era.
13. Modificare sia sul telefono sia sul PC dopo l'ultimo passaggio, poi mandare dal PC: giallo,
    «modificato sia qui sia su PC».
14. Un progetto con un template di report personalizzato che sul PC esiste con lo stesso nome ma
    diverso: dopo l'import, sul PC ci sono tutti e due («… (da Telefono)») e nessuno dei due è
    cambiato.
15. Un file rovinato (per esempio copiato a metà): «Questo pacchetto non si può ricevere: non è stato
    importato niente», e nulla cambia.
16. «Ricevi» con un **JSON o uno ZIP di backup di prima**: si importa come sempre.
17. Velocità del contatore: ogni salvataggio ora controlla anche se il contenuto è cambiato davvero;
    se si nota un ritardo al tocco con tanti progetti, segnalarlo.
