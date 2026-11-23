# Prestazioni del salvataggio: progetto

> Scritto il 17/11/2026 per la sezione «Prestazioni e architettura» della revisione del 16/11/2026
> (problemi 11 e 18). Il progetto è di Opus, il codice dei passi lo scrive Sonnet, Opus lo verifica.

## 1. Cosa costa un tocco oggi (misura)

`tools/misura_tocco.js` apre l'app in jsdom sulla fixture e la gonfia: 80 prove da 150 intervalli,
10 foto da 1 MB nello stato della prova aperta (come le lascia `renderPhotoGallery`), una carta
intestata da 2×0,6 MB, un DTM da 0,8 MB. Chiave `dpsh_app_state`: circa 3 M caratteri.

| Operazione | Tempo medio (PC, Node 22) |
|---|---|
| `state.currentCount++; saveState()` | ~220 ms |
| `updateUI()` | ~1200 ms (jsdom, solo come ordine di grandezza) |

Su un telefono la CPU è 3–5 volte più lenta: un +1 costa quasi un secondo solo di salvataggio.

## 2. Dove va il tempo di `saveState`

A ogni chiamata, nell'ordine:

1. `scriviStatoAttivoNelProgetto` clona la prova aperta con `JSON.parse(JSON.stringify(...))`,
   **foto comprese** (`state.photos[i].dataUrl`, scritto in memoria da `renderPhotoGallery`).
2. `registraModificheVere` serializza il contenuto di **ogni** progetto.
3. `registraPassoCronologia` serializza ogni template (carta intestata compresa) e, per il
   progetto cambiato, ogni prova e ogni campo (DTM compreso).
4. `JSON.parse(JSON.stringify(state))` dell'intero stato, foto comprese, poi si tolgono le foto.
5. `stripNoteImagesHtml` riesegue `DOMParser` sulla nota di ogni progetto con immagini, anche se
   la nota non è cambiata.
6. `JSON.stringify` finale, `localStorage.setItem` e rilettura dell'intero testo.

Le foto pesano nei passi 1 e 4, che sono anche i più facili da togliere.

## 3. Il piano, in tre passi

### Passo 1 — Salvataggio leggero, senza cambiare il formato (questa pull request)
Il testo scritto in `localStorage` resta **identico byte per byte**: nessuna migrazione, nessun
rischio per gli APK vecchi, nessun conflitto con le migrazioni delle fasi A e B.

- Le foto non si clonano più: la copia della prova nel progetto e il testo salvato le lasciano
  fuori, mettendo il `dataUrl` in `photoMemoryCache` come già oggi.
- Una sola serializzazione dello stato al posto di clone + modifica + serializzazione: copie
  superficiali dei soli rami da ripulire (foto, note), poi un `JSON.stringify`.
- `stripNoteImagesHtml` ricorda l'ultimo risultato per ogni testo: la nota si rianalizza solo
  quando cambia.
- Un test che confronta il testo salvato con quello dell'app di prima, su uno stato con foto,
  note con immagini, carta intestata e DTM, più la misura prima/dopo.

**Esito (17/11/2026).** `saveState` dopo un +1, stesso stato della misura: da ~223 ms a ~44 ms
(circa 5 volte meno). Suite `test/salvataggio_leggero.js`: testo salvato identico byte per byte al
codice di prima, foto ancora raggiungibili da export e stima PDF, nota non rianalizzata se non
cambia; la controprova gira sull'originale in `riferimento/`. Due lettori delle foto guardavano solo
`dataUrl` della copia nel progetto e ora cercano anche in `photoMemoryCache`: la stima del peso del
PDF (045) e la miniatura nella mappa del progetto (071l).

Restano nel costo di un tocco `registraModificheVere` e la cronologia (proporzionali all'archivio):
li toglie il passo 3.

### Passo 2 — Immagini e DTM fuori da `localStorage` (dopo la fase A, progetto del 23/11/2026)
**Idea: si sposta solo il testo salvato, non lo stato in memoria.** In memoria carte intestate,
immagini dei template, `templateImages` e `proj.dtm.quote` restano come oggi, quindi nessuno dei
circa 40 punti che li leggono cambia. Cambia solo cosa scrive `saveState`.

1. **Cosa esce.** Ogni stringa di almeno 64 KB nello stato, fuori da foto e note (che hanno già il
   loro meccanismo). Una regola generica copre carte intestate, intestazioni, `templateImages`, DTM
   e qualunque immagine grande aggiunta in futuro, senza un elenco di campi da tenere aggiornato.
2. **Dove va.** Un database IndexedDB nuovo e separato, `DPSH_DatiGrandi`, archivio `blob`
   (`{ id, testo, scrittoIl }`). Separato per non cambiare versione a `DPSH_PhotoStorageDB`.
3. **Il riferimento.** Al posto della stringa, nel testo salvato: `"dpsh-grande:<id>"`. L'id si
   assegna la prima volta che una stringa si vede (una `Map` testo → id in memoria) ed è casuale.
4. **Prima il dato, poi il riferimento.** Una stringa nuova si salva ancora **dentro** il testo di
   `localStorage`, come oggi, e intanto parte la scrittura in IndexedDB (riletta, come
   `salvaFotoConGaranzia`). Solo quando quella scrittura è confermata, i salvataggi successivi
   scrivono il riferimento. Se il telefono chiude l'app in mezzo, il dato è ancora nel testo.
   Se IndexedDB non funziona, resta tutto com'è oggi (inline): nessuna perdita, solo meno spazio.
5. **Lettura all'avvio.** `loadState` resta sincrono. Se il testo contiene riferimenti, dopo
   l'avvio li si risolve da IndexedDB e si rimettono nello stato, poi `updateUI()`. Finché non sono
   risolti, `saveState` riscrive i riferimenti così come sono (non li perde) e gli export
   aspettano la risoluzione (`attendiDatiGrandi()`), così nessun file esce con un riferimento al
   posto dell'immagine. Un riferimento che non si trova diventa un'anomalia di
   `controllaIntegritaDopoAvvio`, con l'avviso esistente.
6. **Niente cancellazioni in questo passo.** Le copie automatiche e la cronologia possono citare un
   id vecchio: un blob non si cancella mai in automatico. «Spazio occupato» mostra il peso di
   `DPSH_DatiGrandi`; la pulizia sicura (scansione di stato e copie) è un lavoro a parte.
7. **Migrazione 4→5.** Non tocca i dati (i riferimenti compaiono man mano), ma alza
   `VERSIONE_SCHEMA_DATI` a 5: un'app vecchia che trova riferimenti rifiuta i dati con il
   messaggio «dati di una versione più nuova» invece di mostrare carte intestate vuote e salvarci
   sopra.

Misura attesa: la chiave `dpsh_app_state` torna alle dimensioni dei soli dati di prova, e un +1
non riscrive più carte intestate e DTM.

### Passo 3 — Salvare solo il progetto che cambia (da decidere)
Una chiave di `localStorage` per progetto più un indice, con la stessa scrittura sincrona e
verificata di oggi: il costo di un +1 diventa proporzionale al progetto aperto, non all'archivio.
`registraModificheVere` e la cronologia guardano solo i progetti segnati come toccati. È un cambio
di formato: un APK di prima del cambio, reinstallato, non vedrebbe i progetti. Si decide dopo il
passo 2, con le misure di un archivio vero.

**Perché non IndexedDB per tutto lo stato.** Resta valida la valutazione di
`FASE_1_ESITO.md` §4: la scrittura asincrona può perdere l'ultimo colpo se il telefono chiude
l'app, e `saveState` è chiamata in circa 145 punti che contano su una scrittura già fatta.

## 4. Cosa non si tocca qui
`updateUI` a pezzi (ridisegnare solo ciò che cambia) è l'altra metà del costo di un tocco, ma
riscrive le schermate su cui lavorano le fasi C e D: va fatto dopo di loro.
