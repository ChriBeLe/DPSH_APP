# Piano — Note di progetto: sostituire il motore di editing

> Scelta fatta: **libreria vera** al posto del `contenteditable` gestito a mano.

---

## 0. Prima di tutto: due cose che ho detto e che vanno corrette

**Il peso l'avevo sopravvalutato.** L'ho misurato invece di stimarlo:

| | Non compresso | gzip | Sull'app di oggi (2.155 KB) |
|---|---|---|---|
| **Quill 2** (JS + CSS) | 228 KB | 58 KB | +10,6% |
| **TipTap** con le estensioni che servono davvero qui | 428 KB | 135 KB | +19,9% |

Non è "+200KB e un rewrite totale" come avevo scritto: è un decimo o un quinto del file. E **npm nel sandbox raggiunge la rete**, quindi la libreria si può includere nel file: l'obiezione "deve funzionare offline in un APK" è risolvibile, non è un ostacolo.

**Quello che invece avevo sottovalutato è il rischio vero**, ed è di un'altra natura.

---

## 1. Il rischio vero: ogni libreria ha uno schema, e quello che non conosce lo BUTTA

Un editor serio non lavora su HTML libero: lavora su un modello di documento con uno schema. Quando gli dai un HTML che contiene costruzioni fuori schema, **le scarta in silenzio**.

Le note esistenti contengono cinque costruzioni **fatte in casa**:

| Costruzione | Com'è oggi | Perché è un problema |
|---|---|---|
| **Checklist** | `<div class="note-check-item">` con dentro una casella e `.note-check-text`, stato in `.checked` | Nessuna libreria la conosce. TipTap ha `taskList`, ma con markup **diverso** (`<ul data-type="taskList"><li data-checked>`): le checklist esistenti non ci finirebbero dentro da sole. |
| **Immagini** | `<img data-note-img-id="…">` — e il `src` viene **svuotato da `saveState`**, l'immagine vera sta in IndexedDB e viene reidratata all'apertura | È il punto più delicato di tutti: la libreria deve accettare un `<img>` **senza `src`** e non perdere l'attributo che collega il file. Uno schema standard lo scarta o lo normalizza. |
| **Tabelle** | `<table class="note-table">` | La classe si perde, e con lei tutto il foglio di stile della stampa. |
| **Evidenziatore** | `<span style="background-color:…">` da `hiliteColor` | Recuperabile, ma solo se mappato esplicitamente. |
| **Titolo del documento** | `.note-doc-title` separato dal corpo | Vive fuori dall'editor: va tenuto fuori anche dopo. |

Tradotto: **al primo avvio del nuovo editor, le note già scritte rischiano di tornare indietro mutilate.** Sono osservazioni di cantiere che finiscono in un documento professionale — è la peggiore perdita di dati possibile, e sarebbe silenziosa.

Questo non dice "non farlo". Dice che il primo passo non è installare la libreria.

---

## 2. ✅ Passo 1 (indipendente dalla libreria): l'inventario e il convertitore — FATTO

Prima di scegliere qualunque motore:

1. **Censire il vocabolario reale** delle note già scritte — non quello che il codice *può* produrre, ma quello che c'è davvero nei progetti salvati. Si legge lo stato, si estrae ogni tag/classe/attributo usato, si conta.
2. **Scrivere il convertitore** dal vecchio HTML al nuovo, costruzione per costruzione.
3. **Un test che lo esegue su note vere** e verifica che nulla si perda: stesso numero di checklist, stesse voci spuntate, stessi `data-note-img-id`, stesse righe di tabella, stessi link.
4. **Nessuna conversione distruttiva**: l'HTML originale resta salvato accanto al nuovo finché non sei tu a dire che va bene. Se il convertitore sbaglia, si torna indietro senza aver perso niente.

Questo passo serve **qualunque** libreria si scelga, e va fatto per primo perché è quello che può far cambiare idea sul resto.

---

## 3. Quale libreria

| | Quill 2 | TipTap (ProseMirror) |
|---|---|---|
| Peso misurato | **58 KB gzip** | 135 KB gzip |
| Inclusione nel file | file UMD già pronto | serve un passaggio di build (esbuild, c'è nel sandbox) |
| Barra strumenti, annulla/ripeti | inclusi | da costruire (ma i comandi ci sono) |
| **Preservare markup fatto in casa** | possibile con i "Blot", API più scomoda | `parseHTML` / `renderHTML` **per nodo**: è esattamente lo strumento per tenersi `data-note-img-id` e mappare la vecchia checklist |
| Annulla che conosce ogni modifica | sì | sì |

**Consiglio: TipTap.** Non per le funzioni — su quelle si equivalgono — ma perché il problema difficile qui è **il passo 1**, e TipTap è l'unico dei due in cui "questo HTML si legge così e si riscrive così" è una regola dichiarata per ogni tipo di nodo, invece di una sottoclasse da scrivere a mano. I 77 KB in più si pagano una volta; una migrazione che perde le checklist si paga per sempre.

---

## 4. I passi

| # | Passo | Nota |
|---|---|---|
| **1** ✅ | Inventario del vocabolario reale + convertitore + test su note vere | Fatto. |
| **2** 🟡 | Bundle + schema esteso | **Schema scritto e PROVATO in un banco di prova** (15 controlli verdi). Manca solo di includere il bundle nel file dell'app. |
| **3** | Barra strumenti ricablata sui comandi della libreria | Qui sparisce `execCommand`, sparisce `restoreNoteSelectionIfNeeded`, sparisce il problema del fuoco rubato. |
| **4** | Le funzioni pesanti: inserimento immagini da file e da galleria, disegno a mano libera, tabelle | Sono le più laboriose e le più usate: vanno dopo che la base è solida. |
| **5** ✅ | Salvataggio ripensato | Fatto per primo: indipendente dalla libreria e la parte che si sente di più. |
| **6** | Esportazioni (txt, md, doc, pdf, json) e percorso di stampa | Leggono l'HTML: vanno ricontrollate contro il nuovo HTML prodotto. |
| **7** | Verifica | Conversione senza perdite su note vere, nessun `execCommand` rimasto, annulla che ripercorre anche le modifiche non testuali. |

### Il salvataggio: un guadagno che arriva comunque

Oggi ogni 600 ms di digitazione l'app chiama `saveState()`, che fa `JSON.parse(JSON.stringify(state))` sull'**intero stato** — tutti i progetti, tutte le prove, tutti i log — scrive in localStorage **e poi ridisegna l'elenco dei progetti** con `renderHomeProjects()`, sotto la finestra aperta.

È lo scatto che si sente sotto le dita, e **non c'entra niente con il motore di editing**: si risolve scrivendo solo la nota mentre scrivi e rimandando il resto alla chiusura. Va fatto comunque, e conviene farlo presto perché è la parte che si nota di più.

---

## 5. Cosa non deve regredire

- **Le immagini nelle note.** `src` svuotato al salvataggio, reidratato all'apertura da IndexedDB, e la pulizia degli orfani che già esiste. È l'architettura più delicata del sottosistema.
- **Il disegno a mano libera sopra le foto.** È la funzione più laboriosa già costruita e quella che in cantiere vale di più.
- **I cinque export e la stampa.**
- **Il titolo del documento**, che vive fuori dal corpo editabile.

---

## 6. Onestà sulla dimensione del lavoro

Non è una sessione. Il passo 1 da solo è un lavoro a sé, e i passi 3-4 toccano 21 comandi, l'inserimento immagini, la galleria, il disegno e le tabelle. Conviene procedere a blocchi, con l'app che resta funzionante alla fine di ognuno — e con la nota vecchia sempre recuperabile finché non dici tu che la conversione è buona.

---

## 7. ✅ Esito del passo 1

Quattro funzioni **pure** (stringa in, stringa fuori: nessuna tocca il documento o lo stato, quindi si eseguono davvero in un test):

- `censisciVocabolarioNota(html)` — conta tag, classi e attributi, e soprattutto separa **ciò che è dichiarato** da **ciò che non è mai stato previsto**. È l'ignoto che fa perdere dati, non il noto.
- `invariantiNota(html)` — misura il **contenuto**, non l'HTML: quante checklist, quante spuntate, quali id di immagine, quanti link, titoli, citazioni, righe di elenco, divisori, tabelle, celle, e il testo con gli spazi normalizzati.
- `convertiNotaAlNuovoSchema(html)` — la traduzione, regola per regola.
- `confrontaInvariantiNota(prima, dopo)` — restituisce **solo le perdite**. Array vuoto = niente si è perso.

E un pulsante **"Controlla note (prova a vuoto)"** nel pannello *Spazio occupato*: legge le note salvate, prova la conversione **in memoria**, e riferisce. **Non scrive niente.** Sta lì e non nell'editor perché è una diagnostica sui dati, come lo spazio occupato e le foto orfane.

### Le regole del convertitore, e perché ognuna esiste

| Regola | Senza di lei |
|---|---|
| checklist `<div class="note-check-item">` → lista di attività, **voci consecutive raggruppate in una sola lista** | Una lista per voce sarebbe formalmente valida ma spezzerebbe l'elenco in blocchi separati: all'utente sembrerebbe che la spaziatura sia impazzita. |
| lo stato spuntato letto **sia dalla classe sia dall'attributo** | Le note più vecchie hanno solo la classe: l'attributo è stato aggiunto dopo. Leggerne uno solo perderebbe le spunte di metà archivio. |
| `<span style="background-color">` → `<mark data-color>` | Tre evidenziazioni di colore diverso diventerebbero la stessa evidenziazione. |
| `<b>/<i>/<strike>` → `<strong>/<em>/<s>`, `<font color>` → colore vero | `execCommand` produceva l'uno o l'altro a seconda del punto: la stessa formattazione risultava di due tipi diversi nello stesso documento. |
| testo dentro `<td>`/`<li>` avvolto in un blocco | Uno schema non ammette testo nudo lì: se non lo avvolgiamo noi lo fa la libreria, e nel farlo a volte perde la formattazione in linea attorno. |
| testo nudo alla radice avvolto in un paragrafo | Le note vecchie iniziano spesso senza paragrafo: quel testo finirebbe fuori dal documento. |
| **le immagini non si toccano** | È la regola più importante ed è una **non-azione**: il `src` è vuoto di proposito e l'unico collegamento al file è `data-note-img-id`. È la cosa che si perde per prima quando qualcuno "ripulisce" l'HTML senza sapere cosa sta guardando. |

### Verifica

**37 controlli** che eseguono le funzioni vere su una nota costruita nella forma esatta che l'app produce oggi — titolo, grassetto/corsivo, tre checklist di cui due spuntate, citazione, elenco, evidenziatore, tabella, immagine con id, divisore, link, `<font color>`. Più i casi limite (nota vuota, solo spazi, testo nudo, solo un `<br>`, immagine senza `src`, checklist sola), l'**idempotenza** (riconvertire due volte non rovina né moltiplica le liste) e la **purezza** (la stringa in ingresso non cambia, il documento non viene toccato).

### Un errore trovato dal censimento, non da me

Alla prima esecuzione il referto ha segnalato `color` come attributo **mai dichiarato**. È quello di `<font color>`: lo conoscevo, il convertitore lo traduce, ma avevo dimenticato di metterlo nel vocabolario. Aggiunto insieme ad `align`, `width`, `height` — perché un allarme che suona su ogni nota che contiene un colore è un allarme che nessuno guarda più.

## 8. Prossimo passo

Prima di scrivere altro codice: **premi "Controlla note (prova a vuoto)"** sul telefono, con i tuoi progetti veri. Se il referto dice *nessuna perdita* e *nessuna costruzione fuori vocabolario*, si passa al bundle della libreria. Se salta fuori qualcosa, si aggiusta il convertitore **prima** di toccare una nota.

---

## 9. ✅ Passo 5 (anticipato): lo scatto sotto le dita

Fatto prima del resto perché è **indipendente dalla libreria** ed era la parte che si sente di più. Tre cose:

- La pausa prima di salvare passa da **600 ms a 2500 ms**. Da sola sarebbe un rischio, ed è per questo che c'è la seconda.
- Si salva **subito** quando l'app va in secondo piano o viene chiusa (`visibilitychange` + `pagehide`). Sono i momenti in cui un telefono uccide davvero una pagina: con quelli, la pausa più lunga non espone a niente che prima fosse protetto. `pagehide` e non `beforeunload`, che sui browser mobili spesso non arriva mai.
- **`renderHomeProjects()` esce del tutto dal percorso di digitazione.** Ridisegnava l'elenco dei progetti che sta *dietro* la finestra aperta — mentre scrivi non lo vedi nemmeno. Ora si fa una volta alla chiusura, quando quell'elenco torna visibile.

## 10. ✅ Passo 2 — lo schema è scritto e **provato**, il bundle è pronto

`note-editor/` contiene il bundle (429 KB, ~135 KB gzip) e il sorgente delle tre estensioni su misura. Non è ancora dentro l'app: prima andava dimostrato che funziona.

**Il banco di prova** (`test/note_schema_tiptap.js`, 15 controlli) costruisce un editor vero con lo schema su misura, gli dà in pasto l'HTML che il convertitore produce, e controlla cosa ne esce. Tutto sopravvive — titolo, grassetto, corsivo, 3 checklist di cui 2 spuntate, citazione, elenco, evidenziatore col suo colore, tabella con la sua classe, 4 celle, divisore, link — e **l'immagine esce come `<img src="" data-note-img-id="NIMG_17_a">`**, cioè con l'unico attributo che la collega al file. Rileggere la propria uscita non degrada niente: stabile al secondo giro.

### La controprova, che è il documento più utile di tutti

`test/note_schema_controprova.js` apre una nota **vecchia e non convertita** con uno schema **di serie**. Ecco cosa ne resta:

```
<h1>Sopralluogo</h1>
<p>Foto del pozzo</p>          ← era una checklist SPUNTATA
<p>Misura falda</p>            ← era una checklist
<p>1,2ciottoli</p>             ← era una TABELLA: due celle appiccicate
<p></p>                        ← era l'IMMAGINE
<p>attenzione</p>              ← era evidenziata
```

Persi: **l'immagine** (con l'id sparisce il legame al file in IndexedDB, che diventa irraggiungibile per sempre), **la tabella intera**, **lo stato spuntato** delle checklist, **l'evidenziatore**, la classe di stampa.

Non è un rischio teorico e non era paranoia: è il risultato reale, misurato, di aprire le note esistenti senza il lavoro del passo 1.

## 11. Prossimo blocco

Includere il bundle nel file e montare l'editor al posto del `contenteditable`, **dietro la conversione**, con l'HTML originale conservato accanto al nuovo. Poi la barra strumenti (passo 3), che è dove spariscono `execCommand` e il fuoco rubato.