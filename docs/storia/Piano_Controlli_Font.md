# Piano — Unificazione dei controlli del carattere

> Obiettivo dichiarato: *«slider con a fianco valore numerico (impostabile anche dall'utente) entro un range ragionevole, con numeri che fanno riferimento alla stessa unità di misura dei testi di Word»*. Poi, come secondo passo, il menu semitrasparente durante il trascinamento degli slider.

---

## 1. Cosa c'è oggi — e perché è "scattoso"

Non è un solo controllo fatto male: sono **quattro controlli diversi per la stessa idea**, e due sistemi di dati incompatibili sotto.

| Dove | Comando | Dato salvato | Unità mostrata |
|---|---|---|---|
| Titolo, Testo | `<select>` con la scala di Word (8…96) | `blk.fontSizePt` — **punti assoluti** | pt ✅ |
| Dati Prova, Tabella Colpi, Riepilogo, Dettagliata, Allegato Formule | due tasti `Aa−` / `Aa+`, scatti da 0.1 | `blk.fontScale` — **moltiplicatore 0.6–1.8** | % ❌ |
| Didascalia foto | `<select>` (≤24) | `blk.captionFontSizePt` — punti | pt ✅ |
| Etichetta mappa | slider | proprio campo | ❌ nessuna unità |

Il difetto che hai descritto — *«due tasti e zero indicazioni sulla vera grandezza»* — è tutto nella riga 2: `Aa−` / `Aa+` a scatti fissi, e un `115%` che non dice **115% di cosa**.

### L'ostacolo vero

Nelle tabelle **non esiste "un" font size da mostrare in pt.** Ogni tabella ha la propria misura di base scritta nel codice che la genera (almeno 5 punti diversi), e in un caso (`tabella-colpi`) la base è perfino **calcolata a runtime** da un algoritmo che restringe il testo per farlo stare nella colonna. `--tpl-font-scale` moltiplica tutte queste basi insieme dentro dei `calc()`.

Quindi "12pt" su una tabella non è definibile finché non si decide **rispetto a quale base**. Questa è la decisione da prendere prima di scrivere una riga di codice.

---

## 2. La decisione: come esprimere il carattere di una tabella in punti

### Strada (a) — base dichiarata per tipo di blocco *(consigliata)*

Per ogni tipo di blocco si dichiara la sua dimensione **del corpo testo** in punti (conversione esatta: `pt = px × 0.75`). Da lì:

- **mostrare**: `pt visualizzati = base_pt × fontScale`
- **impostare**: `fontScale = pt scritto ÷ base_pt`

Il dato salvato **resta `fontScale`**. Nessun template esistente da migrare, nessun `calc()` da riscrivere, l'export non cambia di una virgola. È la stessa scelta già fatta per i millimetri della larghezza, ed è la ragione per cui quella è andata liscia.

- **Il compromesso da dichiarare**: se una tabella ha intestazioni più grandi del corpo, il numero mostrato è quello del **corpo**, e le intestazioni scalano insieme mantenendo la proporzione. Un numero che finge di descrivere tutto sarebbe peggio del `%` di adesso.

### ✅ PASSO 1 ESEGUITO — l'inventario ha cambiato il piano

Avevo previsto una tabella di costanti e un solo caso speciale. È il contrario: **quattro blocchi su cinque calcolano la base dai dati.**

| Blocco | Da cosa dipende la base | Valori |
|---|---|---|
| Dati Prova | niente, è fissa | 10.5px = **7.9pt** |
| Riepilogo · Dettagliata · Allegato | **numero di colonne** (`autoFitTabellaExport`) | 11 / 10.5 / 9.5 / 8.5 / 7.5px = 8.3 → **5.6pt** |
| Tabella Colpi | **numero di righe** (`autoFitTabellaRighe`) | 10 / 9.3 / 8.7 / 8px = 7.5 → **6pt** |

Cioè: **lo stesso template, su una prova con più strati, stampa davvero un carattere più piccolo.** Un "11pt" nominale sarebbe stato una bugia scritta bene.

**Soluzione adottata**: la base viene **letta dall'HTML già costruito** per la prova in anteprima (`templateEditorState.ctx`), con una regex sul `calc(Npx * var(--tpl-font-scale))`. Non si riproduce la logica di auto-fit in un secondo posto — si legge il suo risultato. Quindi il numero mostrato **non può andare fuori sincrono con la stampa**, che è il difetto che ha generato metà dei problemi di questo progetto.

Funzioni aggiunte, con 22 controlli che le eseguono davvero:

- `baseFontBloccoTabellare(tipo, ctx)` → `{px, pt, uniforme, quanti}` oppure `null`
- `ptDaFontScale(basePt, fontScale)` e `fontScaleDaPt(basePt, pt)` — reversibili, con i limiti 0.6–1.8 applicati riportando il valore dentro invece di rifiutarlo
- `intervalloPtBlocco(basePt)` → il "range ragionevole" **non è un numero scelto a caso**: sono i limiti già esistenti tradotti in punti (per una tabella fitta ≈ 5–15pt)

Casi limite già coperti: nessuna prova in anteprima, prova senza parametri calcolati, basi diverse dentro lo stesso blocco (vince il corpo testo e il flag `uniforme` dice che il numero va mostrato con `≈`), moltiplicatore corrotto o mancante.

### Strada (b) — punti come dato vero anche per le tabelle

Più pulita in teoria: si toglie il moltiplicatore e ogni blocco porta i suoi pt. Ma vuol dire riscrivere tutti i `calc()`, ripensare l'auto-fit della tabella colpi, migrare i template esistenti e **rimisurare l'impaginazione** — cioè rimettere le mani sul motore che abbiamo appena finito di stabilizzare. Sconsigliata adesso.

---

## 3. Il componente unico

Un solo costruttore, usato da tutti i controlli numerici del menu. Assorbe anche la voce di bacheca *"campo numerico accanto a ogni slider"*, che quindi si chiude qui.

```
┌─────────────────────────────────────┐
│ Dimensione carattere      [ 11 ] pt │   ← campo scrivibile, unità fuori
│ ●━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │   ← slider
│ 6pt                            96pt │   ← fondo scala esplicito
└─────────────────────────────────────┘
```

Regole di comportamento, decise in anticipo perché sono quelle che di solito si sbagliano:

- **Lo slider scorre sulla scala di Word** (8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28…), non sui punti lineari. Motivo: la scala è già in `TAGLIE_FONT_WORD`, dà scatti equidistanti sotto il dito, e sono le taglie che si usano davvero. **Il campo numerico accetta invece qualunque intero nel range** — lo slider è per esplorare, il campo per essere precisi. È esattamente la divisione dei ruoli che ti manca oggi.
- **Il campo si conferma su `change` e su Invio, non a ogni tasto premuto**: altrimenti digitando "12" il blocco passa da 1pt a 12pt e l'anteprima sfarfalla.
- **Valore fuori range**: si riporta dentro i limiti in silenzio e il campo mostra il valore corretto, invece di rifiutare l'input e lasciare l'utente a chiedersi perché non succede niente.
- **Campo svuotato**: si torna al valore precedente all'uscita dal campo. Nessuno stato "vuoto" che si propaga nel modello.
- **Doppio tocco sullo slider = torna al valore di partenza del blocco.** Esiste già `attivaDoppioTapResetSlider`, si riusa.
- **Il campo non deve rubare lo schermo**: `inputmode="numeric"` apre il tastierino, non la tastiera intera.

---

## 4. Ordine di lavoro

| # | Passo | Perché in questo punto |
|---|---|---|
| **1** | Inventario delle basi in pt di ogni tipo di blocco + decisione sul caso `tabella-colpi` | È l'unico passo che può cambiare il piano. Va fatto per primo, non per ultimo. |
| **2** | Costruire il componente slider+campo e usarlo **su un controllo solo** (la larghezza, che è già in mm e non ha incognite) | Si collauda il componente dove non ci sono conversioni di mezzo. Se sbaglio qualcosa, sbaglio su un caso già noto. |
| **3** | Sostituire `Aa−`/`Aa+` con il componente in pt sui 5 blocchi tabellari | Il cuore della richiesta. |
| **4** | Portare sullo stesso componente il select del testo libero, la didascalia foto e l'etichetta mappa | A questo punto è meccanico: quattro controlli diventano uno. |
| **5** | ✅ Menu semitrasparente durante il trascinamento | Fatto per ultimo, come chiesto: agisce su tutti gli slider, che ora sono quelli definitivi. |
| **6** | Verifica | Conversione pt↔fontScale eseguita davvero sui casi limite; nessun `calc()` toccato; export invariato. |

I passi 1–2 e 3 sono separabili: si può fermarsi dopo il 3 e avere già risolto il problema che hai segnalato.

---

## 5. Cosa NON farò

- **Non toccherò i `calc(...)` né l'auto-fit della tabella colpi.** Sono dentro il percorso di misurazione dell'impaginazione: cambiarli significa rimettere in discussione i fogli rigidi.
- **Non migrerò i template esistenti.** Se il piano richiedesse una migrazione, vorrebbe dire che ho scelto la strada (b) senza dirtelo.
- **Non mostrerò un numero in pt che non sia verificabile.** Dove la base è dinamica, o si dichiara che è una stima, o si lascia la percentuale.

---

## 6. Nota di metodo

Tutto quanto sopra viene dalla lettura del codice, non da un browser: come sempre, la verifica sarà analisi statica più test che eseguono le funzioni vere. La conversione pt↔fontScale è aritmetica pura, quindi **testabile davvero**; l'aspetto del componente sul telefono no, quello va guardato.
