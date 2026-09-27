# Note — le funzioni: cosa diventa cosa, cosa migliora, cosa mancava

> Seguito di `Piano_Note_Motore.md`. Qui: i 19 comandi uno per uno, quello che il motore nuovo **regala**, e i buchi che ho trovato guardando e che non erano in nessun piano.

---

## 1. I 19 comandi, uno per uno

### Diventano una riga (13)

Non c'è niente da progettare: TipTap li ha già, e sono comandi con uno stato interrogabile — quindi il pulsante può finalmente sapere se è acceso senza `queryCommandState`, che è la funzione che oggi sbaglia più spesso.

| Oggi | Domani |
|---|---|
| Grassetto, Corsivo, Sottolineato, Barrato | `toggleBold()` `toggleItalic()` `toggleUnderline()` `toggleStrike()` |
| Titolo 1, Titolo 2, Testo normale | `toggleHeading({level})`, `setParagraph()` |
| Citazione | `toggleBlockquote()` |
| Elenco puntato | `toggleBulletList()` |
| Lista di controllo | `toggleTaskList()` |
| Linea divisoria | `setHorizontalRule()` |
| Annulla / Ripeti | `undo()` / `redo()` — e stavolta **conoscono anche le immagini e i disegni**, perché passano dalla stessa transazione |

### Vanno riscritti, ma diventano più semplici (4)

| Oggi | Problema di oggi | Domani |
|---|---|---|
| **Inserisci link** | `createLink` su una selezione che intanto è collassata | `setLink({href})` sulla selezione, che il motore garantisce ancora viva |
| **Evidenzia / Rimuovi evidenziazione** | Due pulsanti, perché `hiliteColor` non sa spegnersi | **Uno solo**: `toggleHighlight({color})`. Premere lo stesso colore lo toglie. |
| **Inserisci tabella** | `insertHTML` di una stringa: la tabella nasce e poi è quasi immodificabile | `insertTable()`, e da lì aggiungi/togli righe e colonne con comandi veri |
| **Pulisci formattazione** | `removeFormat`, che si porta via anche cose che non volevi | `unsetAllMarks()` + `clearNodes()`: due gesti distinti, "togli il grassetto" e "torna paragrafo" |

### Restano codice nostro, ma agganciati diversamente (2)

**Carica immagine** e **Disegna a mano libera** non li tocca la libreria: il file va in IndexedDB, il disegno esce dal canvas. Quello che cambia è **come entrano nella nota**: non più `insertHTML` di una stringa, ma `insertContent({type:'image', attrs:{'data-note-img-id': id}})`. Differenza pratica: entrano nella pila dell'annulla, e il cursore finisce dove deve.

### Spariscono perché non servono più (3 pezzi di impianto)

- `restoreNoteSelectionIfNeeded` — la selezione non si perde più, quindi non c'è niente da ripristinare.
- `noteSavedSelectionRange` e il `selectionchange` che lo alimenta.
- `aggiornaStatoFormatButtons` con `queryCommandState` — lo stato lo dice il motore.

---

## 2. Quello che il motore nuovo regala

Non sono desideri: sono cose che oggi **non si possono fare** e che con uno schema diventano naturali.

### a) Scrivere senza toccare la barra

`# ` diventa un titolo. `- ` un elenco. `[] ` una lista di controllo. `> ` una citazione. `**grassetto**` si formatta da solo. `---` una linea divisoria.

Su un telefono, in cantiere, questo è il guadagno più grosso di tutti: **il viaggio dito → barra → dito sparisce**. E chi non lo sa continua a usare i pulsanti, che restano.

### b) La barra che compare quando serve

Oggi 21 pulsanti sempre presenti si mangiano l'altezza dello schermo. Con il motore nuovo: **selezioni del testo e compare una barretta** con i quattro comandi che si applicano a una selezione (grassetto, corsivo, evidenzia, link). Quella fissa resta solo per ciò che non si può scrivere: immagine, disegno, tabella.

### c) L'annulla che annulla davvero

Oggi il pulsante chiama `execCommand('undo')`, che non sa niente delle modifiche fatte a mano: annulli e salta un passo, o ne annulla uno sbagliato. Domani tutto — testo, immagini, disegni, tabelle — passa dalla stessa pila.

### d) L'incolla smette di essere una porta aperta

Vedi §3a: è insieme un miglioramento e una correzione.

---

## 3. Cosa mancava — quattro cose che non erano in nessun piano

### a) 🔴 L'incolla non è filtrato, e finisce nel report

Nell'editor note il gestore dell'incolla intercetta **solo le immagini**. Per il testo lascia fare al browser, cioè **incolla HTML arbitrario** da qualunque sorgente: da un sito, da Word, da un'altra app. Classi sconosciute, `style` in linea, tabelle annidate, caratteri di un altro font — tutto entra nella nota, e dalla nota **finisce nel documento stampato**.

Due conseguenze:

- è una delle ragioni per cui le note "vengono male" senza che si capisca perché;
- è anche la ragione per cui il censimento del passo 1 può trovare costruzioni mai viste: non le ha prodotte l'app, le hai incollate tu.

Il pezzo più significativo: **l'app sa già come si fa.** L'editor di testo dei template ha il suo incolla che forza il testo semplice. Quello delle note no. Con lo schema il problema si chiude da solo — la libreria accetta solo ciò che conosce — ma va detto che oggi è un buco aperto.

### b) 🟡 Non si può cercare dentro le note

Zero occorrenze di una ricerca. Con dieci cantieri e note lunghe, *«dove avevo scritto di quella cavità?»* non ha risposta se non aprendo le note una per una. Non c'entra col motore, ma è la funzione che manca di più a un archivio di appunti.

### c) 🟡 Le note esistono solo per PROGETTO, mai per PROVA

Contato: `proj.notes` compare 31 volte, `surv.notes` **zero**. In cantiere si annota per **prova** — "in questa verticale il maglio rimbalzava a 4 m" — non solo per sito.

Lo segnalo come **domanda, non come difetto**: potrebbe essere una scelta. Ma se non lo è, è un buco funzionale più grosso di tutta la barra strumenti messa insieme.

### d) 🟡 Gli export non hanno una verifica misurabile

Nel piano avevo scritto "vanno ricontrollate". Non basta: `noteHtmlToPlainText` e `noteHtmlToMarkdown` sanno già leggere le checklist nella forma **vecchia** (`.note-check-item`). Dopo la conversione quella forma non esiste più, e senza un test **le esportazioni perderebbero le checklist in silenzio** — esattamente il tipo di perdita che il passo 1 è stato costruito per impedire, ma su un percorso che allora non avevo guardato.

Rimedio: gli stessi invarianti già scritti, applicati anche a testo semplice e markdown. Se una nota ha 3 checklist di cui 2 spuntate, il markdown deve avere 3 `- [ ]`/`- [x]` di cui 2 spuntate. È misurabile, quindi va misurato.

---

## 4. Ordine consigliato, aggiornato

| # | Cosa | Stato |
|---|---|---|
| **3a** | Bundle nel file + montaggio dell'editor dietro la conversione | ✅ fatto |
| **3b** | I 13 comandi che sono una riga + i 4 riscritti | ✅ fatto |
| **6-bis** | Export: invarianti anche su testo semplice e markdown | ✅ fatto |
| **4** | Immagini, galleria, disegno, tabelle | ✅ fatto |
| **2b** | Scorciatoie di scrittura | ✅ arrivate gratis con lo schema, e misurate |
| **2b** | Barretta sulla selezione | ✅ scritta a mano (il pacchetto BubbleMenu non serviva) |
| **3c** | Ricerca nelle note | ✅ dentro la nota e tra i progetti |

Risposta alla domanda finale: **no, le note restano per progetto** — decisione dell'utente,
"altrimenti si complica davvero troppo la situazione".

---

## 5. Quello che si è scoperto strada facendo

Tre cose che nessun piano aveva previsto, e che sono venute fuori solo misurando.

### a) Lo schema scartava la classe e lo stile delle immagini

`ImmagineNota` dichiarava `src` e `data-note-img-id`, e sembrava sufficiente. Non lo era:
`class="note-inline-shape"`, `data-note-inline` e lo `style` con la dimensione **non erano
dichiarati**, quindi ogni foto sarebbe tornata a piena larghezza e ogni freccia sarebbe
diventata un blocco a sé. Trovato prima di montare, perché il test guardava l'HTML che
esce dal motore invece che quello che ci entra.

### b) La regola 5 del convertitore spostava le cose

Raccoglieva **tutti** i nodi nudi alla radice in un unico paragrafo, messo dove stava il
primo. Non perdeva niente — e infatti nessun invariante protestava — ma un'immagine
inserita in fondo alla nota si ritrovava in cima. L'ha vista il confronto del **testo
esportato prima e dopo**, che è order-sensitive per costruzione, mentre contare le immagini
non lo è. Corretta la regola (ogni gruppo di vicini resta dov'è) e aggiunto l'invariante
mancante: *immagini fuori ordine*.

La lezione, scritta perché torna utile: **contare le cose non è la stessa cosa che
lasciarle al loro posto.** Un invariante che conta passa anche quando il documento è stato
rimescolato.

### c) Il colore del testo sarebbe sparito

Il censimento aveva segnalato `color` come attributo presente in note reali, e il
convertitore lo traduce in `<span style="color:…">` — ma nello schema non c'era nessun
marcatore che lo reggesse. Aggiunto `ColoreTesto`.

### c-bis) Le tabelle si creavano, ma erano invisibili

Segnalato dall'utente come *«un bug che non crea le tabelle»*. Non era così: la tabella
veniva creata ogni volta, correttamente, e finiva anche negli export. **Non aveva bordi.**

`TabellaNota.renderHTML` aggiunge `class="note-table"`, e tutto il CSS delle tabelle della
nota era agganciato a quella classe. Ma dentro l'editor la tabella **non la disegna
`renderHTML`**: la disegna il nodeView di ProseMirror, che produce
`<div class="tableWrapper"><table style="min-width:…">` — senza quella classe. Quindi
nessuna regola CSS la raggiungeva: tre celle vuote senza un bordo, su un fondo uguale a
quello della nota. A schermo, indistinguibile da "non è successo niente".

La correzione è una riga di principio: **nella nota le tabelle si stilano sul tag, non
sulla classe** — l'unica tabella che può esistere lì è una tabella della nota. La stessa
dipendenza è stata tolta anche dal CSS di stampa e di Word, dove per ora funzionava (l'HTML
serializzato *sì* che porta la classe) ma poteva rompersi allo stesso modo domani.

**Come è saltato fuori, ed è la parte che conta.** Nessun test sui singoli pezzi poteva
vederlo: il motore inseriva la tabella, il comando esisteva, il dialogo restituiva i numeri
giusti, l'HTML serializzato era perfetto. Ho smesso di fare ipotesi e ho **acceso l'app
intera** in un DOM headless — file completo, tre progetti finti in memoria — e ho premuto il
pulsante. Il DOM vivo ha detto in una riga quello che quattro ipotesi non avevano indovinato.
Da lì è nato `test/note_app_viva.js`, che ora resta.

### d) Una nota vuota non è una stringa vuota

Per il motore il documento vuoto è `<p></p>`. Salvato così, l'elenco dei progetti avrebbe
mostrato il segno *«ha una nota»* su ogni progetto in cui la nota era stata soltanto aperta
e richiusa.

---

## 6. La garanzia data all'utente

Sotto l'editor c'è una riga che compare **solo** su una nota scritta prima del motore, e
resta finché non è l'utente a chiuderla. Tre uscite, in ordine di fiducia:

- **Scarica l'originale** — il testo di prima esce come file HTML, immagini incluse.
- **Rimetti com'era** — rimette nella nota il contenuto originale.
- **Va bene così** — la copia sparisce e la riga con lei.

Finché quella riga è lì, niente di quello che c'era prima è andato perduto.

---

## 7. La barra, riordinata

Ventun pulsanti in fila indiana: per trovarne uno bisognava leggerli tutti. Ora sono
**quattro gruppi**, ognuno con un fondo suo, e la barra va a capo *tra* i gruppi invece che
in mezzo a una famiglia di comandi.

| Gruppo | Cosa contiene | La domanda a cui risponde |
|---|---|---|
| Riga | ¶ H1 H2 citazione elenco lista-di-controllo | *che cos'è questa riga?* |
| Testo | B I U S evidenzia link | *come appare quello che ho selezionato?* |
| Inserisci | file, foto del progetto, disegno, tabella, linea | *cosa aggiungo?* |
| Azioni | annulla, ripeti, pulisci, cerca | *cosa faccio alla nota intera?* |

Icone corrette, con il perché:

- **Testo normale**: era il glifo `¶`, un carattere tipografico in mezzo a icone. Ora tre
  righe di testo — si riconosce senza sapere cosa sia un pilcrow.
- **Carica immagine** e **foto del progetto**: erano una cornice e una cartella, e nessuna
  delle due diceva *da dove viene* la foto. Ora una freccia che entra (un file da fuori) e
  una macchina fotografica (le foto già scattate nelle prove).
- **Disegna**: era la matita, che ovunque significa "modifica". Ora un tratto a mano libera
  su una riga di base.
- **Linea divisoria**: era l'icona dello strumento *forma-linea*. Ora una linea marcata tra
  due righe di testo sbiadite — che è esattamente cosa fa.

Col dito i pulsanti passano da 30 a 36 px (`@media (pointer: coarse)`).

### Una correzione a caldo: l'icona "testo normale"

Avevo scelto `align-left` per il testo normale. Segnalato subito, e giustamente: **è
letteralmente l'icona dell'allineamento a sinistra**. Peggio ancora, l'allineamento nelle
note *non esisteva*, quindi l'unica icona di allineamento presente indicava un'altra cosa.

- Testo normale → **pilcrow** (`¶` disegnato come icona), che è quello che usano Word e
  Google Docs per la stessa cosa.
- **L'allineamento è stato aggiunto davvero**: un solo pulsante che apre le quattro scelte,
  con l'icona che mostra l'allineamento della riga in cui si trova il cursore — comando e
  indicatore nello stesso posto, e la barra non cresce di quattro pulsanti.

Sta nel gruppo **Riga**, non in quello del testo, perché l'allineamento non è un marcatore
che avvolge delle parole: è un attributo della riga. L'estensione (`Allineamento` in
`schema.js`) è scritta a mano — venti righe — invece di aggiungere un altro pacchetto.

Una nota sul dettaglio che poteva passare inosservato: l'incolla adesso **conserva
`text-align`** sulle righe. Prima lo buttava insieme a tutto il resto dello `style`, ed era
giusto così: la nota non sapeva allineare. Da quando lo sa, buttarlo sarebbe una perdita
gratuita — un testo centrato incollato da Word è informazione che la nota può reggere.

---

## 8. Il disegno con lo sfondo trasparente

La tela era sempre bianca. Una scritta a mano inserita nella nota si portava dietro il suo
rettangolo bianco: in tema scuro, un francobollo in mezzo al testo.

Ora c'è un interruttore **Trasparente** nella barra del disegno. Quando è acceso la tela non
viene riempita: il PNG conserva il canale alpha e il tratto si posa direttamente sulla nota.
La scelta si ricorda tra un disegno e l'altro (`state.settings.disegnoSfondoTrasparente`) —
chi scrive a mano lo fa sempre, non una volta.

Due dettagli che sembrano piccoli e non lo sono:

- Con una **foto di sfondo** l'interruttore sparisce invece di restare lì a non fare niente:
  su una foto la trasparenza non vuol dire nulla.
- La **scacchiera** che si vede sotto il tratto ora segue il tema. Era fissa chiara: in tema
  scuro si sarebbe disegnato guardando un fondo che poi non ci sarebbe stato.

Il test non poteva guardare i pixel, quindi guarda un'altra cosa: una tela finta che **tiene
il registro di cosa le viene chiesto di dipingere**. Con lo sfondo trasparente il conteggio
dei riempimenti bianchi deve essere zero — e col bianco, esattamente uno.

### Poi però il "Trasparente" era una falla logica

Segnalata subito: c'erano **due comandi indipendenti per una cosa sola**. «Sfondo» sceglieva
una foto, «Trasparente» era un interruttore a parte — e potevano contraddirsi. Lo sfondo è
uno, e può essere in quattro modi. Ora è un comando solo:

- **Tinta unita**, con cinque tinte tra cui scegliere;
- **Foto del progetto…** (quelle già scattate nelle prove);
- **Immagine dal telefono…** — la piantina di cantiere, uno schizzo su carta, un ritaglio:
  roba che non è mai passata da una prova e quindi nell'archivio foto non c'è;
- **Trasparente**.

Le due sorgenti di immagine passano per **una strada sola** (`usaImmagineComeSfondoDisegno`):
ridimensionamento e adattamento della tela scritti due volte sono la cosa che, prima o poi,
diverge. A distinguerle resta solo `origine`, che serve unicamente a dire quale delle due
voci del menu è accesa — per il disegno una foto è una foto.

Scegliere un modo esclude gli altri per costruzione, che è la garanzia che due interruttori
separati non potevano dare.

Un dettaglio che mi ero perso e che il ragionamento ha tirato fuori: **«Foto» non è una
preferenza**, è una scelta di *quel* disegno — la foto vive solo finché il modale è aperto.
Ricordarla avrebbe prodotto, alla riapertura, un'etichetta che dice «Foto» sopra una tela
vuota. Ora si ricordano solo tinta e trasparente.

### E il selettore delle foto finiva sotto

Aperto dallo strumento di disegno, il selettore si vedeva ma **non si poteva toccare**: le
due finestre avevano lo stesso `z-index`, e a parità vince quella disegnata dopo nel DOM.
Funzionava dalle note per puro ordine di scrittura del file. Ora il selettore ha un livello
**dichiarato** (`tier-strati`), che è una decisione invece di una coincidenza.

---

## 9. Le forme: un piccolo editor, non una tela di pixel

Il poligono «non sembrava funzionante», ed era vero. La causa è precisa: il `pointerdown`
sulla tela chiama `preventDefault()` — serve, altrimenti il dito scrolla la pagina invece di
disegnare — ma **annullare il pointerdown impedisce al browser di generare il `dblclick`**.
Il doppio tocco per chiudere il poligono non arrivava mai. Su un telefono, l'unico modo per
chiudere era un pulsante che compariva solo se sapevi già di doverlo cercare.

Ora il poligono si chiude **ritoccando il primo vertice**, che è disegnato più grosso e
vuoto apposta per dire che è un bersaglio. Il pulsante ✓ resta come seconda strada.

**Il cambio vero, però, è sotto.** Prima ogni tratto veniva dipinto e dimenticato: la tela
era pixel, e un pixel non si può più riselezionare. Ora ogni tratto resta un **oggetto**
finché il modale è aperto. Da lì viene tutto il resto:

| | |
|---|---|
| Strumenti | seleziona · tratto libero · linea · rettangolo · cerchio · triangolo · poligono |
| Su ogni forma | contorno e riempimento **distinti**, spessore, e per il rettangolo gli angoli stondati |
| Con Seleziona | tocca per scegliere, trascina dentro per spostare, trascina un angolo per cambiare le proporzioni |

Il ridimensionamento è una sola regola applicata a tutte le forme allo stesso modo: si
costruisce il riquadro nuovo tra l'angolo opposto (che resta fermo) e il dito, e si
rimappano dentro i punti in proporzione. Vale per un cerchio come per uno scarabocchio a
mano libera, senza casi speciali. È così che si ottiene «un cerchio più preciso»: lo tracci
a occhio e poi lo aggiusti.

I colori seguono la regola di ogni editor di disegno: **si applicano alla forma scelta se ce
n'è una, altrimenti valgono per le prossime**. Un solo posto per decidere, che è anche il
posto dove si guarda — invece di una seconda fila di comandi identica alla prima.

Una trappola evitata di misura: le maniglie e il riquadro tratteggiato sono disegnati *sulla
tela*. Esportando così com'era, sarebbero finiti dentro il PNG per sempre. Prima di
rasterizzare si deseleziona e si ridisegna — e il test lo verifica contando i quadratini da
11 pixel nell'ultimo fotogramma: devono essere zero.

### La casella di testo

Ottava voce degli strumenti: tocca un punto, scrivi, e la scritta si posa lì. Ha colore,
grandezza, più righe, e — se le dai un riempimento — un fondo pieno dietro, che sopra una
foto di cantiere è la differenza tra leggibile e illeggibile.

Il testo si chiede con un **dialogo**, non scrivendo dentro il canvas. Non è pigrizia: un
cursore che lampeggia dentro una tela è una promessa che nessun browser mobile mantiene
davvero, mentre la tastiera di sistema su un campo vero conosce correzione, incolla e
dettatura. Appena scritta, la casella viene selezionata e lo strumento passa da solo a
*Seleziona*: quello che si vuole fare subito dopo aver scritto è quasi sempre spostarla.

Un caso che andava deciso e non lasciato al caso: **una scritta non si stira, si ingrandisce.**
Rimappare i suoi punti come per le altre forme avrebbe spostato l'ancoraggio senza cambiare
una virgola di quello che si vede, quindi il ridimensionamento scala la *grandezza* seguendo
l'altezza del riquadro. E svuotare il testo **cancella** la casella, invece di lasciare un
rettangolo vuoto e selezionabile: un oggetto fantasma.

---

## 10. L'immagine e il testo che le scorre a fianco

«Vorrei formattarla insieme al testo, o metterla dietro al testo per scriverci sopra.»

Sono due richieste, e hanno due risposte diverse.

**Il testo a fianco** è ora nella barra dell'immagine: *in colonna*, *testo a destra*, *testo
a sinistra*. Un'immagine affiancata che fosse ancora a tutta larghezza non lascerebbe spazio
a niente, quindi affiancandola si porta da sola a metà pagina se non è già stata
rimpicciolita. I margini stanno nello stile in linea e non nel CSS, così l'aria attorno
all'immagine sopravvive anche nella stampa e nel Word, dove il foglio di stile dell'app non
c'è.

**L'immagine letteralmente dietro il testo del documento** non l'ho fatta, e la ragione è che
non reggerebbe: un testo sovrapposto a uno sfondo dentro un documento a flusso si sfascia
appena cambia la larghezza dello schermo, e in stampa e in Word non sopravvive affatto.
Quello che volevi ottenere — *scrivere sopra un'immagine* — lo fa già lo strumento di
disegno, e meglio: scegli la foto come sfondo, ci posi sopra le caselle di testo, e il
risultato è **una sola immagine** che attraversa intatta editor, PDF, Word e backup.

### Due difetti veri trovati qui

**a) Larghezza e disposizione si cancellavano a vicenda.** Vivono nella stessa stringa
`style`, e chi la riscriveva da zero buttava via la scelta dell'altro. Ora lo stile si
**legge, si cambia nel pezzo toccato, e si ricompone**.

**b) `updateAttributes` perde la selezione del nodo.** Non è una stranezza dell'ambiente di
prova: ricostruendo il nodo, la selezione di nodo torna a essere un cursore. Sul telefono
voleva dire che dopo *un* comando la barra dell'immagine spariva, e per passare da «50%» a
«testo a destra» bisognava ritoccare la foto ogni volta. Verificato nella libreria vera, poi
corretto: si ricorda la posizione e si riseleziona il nodo dopo l'aggiornamento.

Nello stesso punto è sparito anche il `.focus()`: questi comandi agiscono sull'immagine, non
sul punto in cui si scrive, e su un telefono rimettere il fuoco nell'editor fa comparire la
tastiera per ridimensionare una foto.

---

## 11. Il ritaglio

«Ogni qualsivoglia tipo di documento grafico dev'essere croppabile.»

Uno strumento **solo**, riusato da chi ha un'immagine da ritagliare. Non ce n'è una copia per
tipo, e non era un risparmio di righe: i blocchi foto, il report e il PDF **non tengono una
copia loro** delle foto, le leggono tutti dallo stesso archivio. Quindi ritagliare la foto una
volta la ritaglia ovunque compaia, senza che nessuno debba propagare niente.

Due punti d'ingresso:

- **Finestra della foto** (`Ritaglia questa foto`) → foto delle prove, e con esse blocchi
  foto, report, PDF, Word, selettore foto e sfondo del disegno;
- **Barra dell'immagine nella nota** (`Ritaglia`) → foto inserite, immagini dal telefono e
  disegni.

Proporzioni libere o bloccate a 1:1, 4:3, 3:4, 16:9, griglia dei terzi, e la misura in pixel
sempre a schermo.

### Il ritaglio non distrugge l'originale

Alla prima potatura l'immagine intera viene messa da parte sotto un id derivato, e **ogni
ritaglio successivo riparte da lì**. Due conseguenze pratiche, e sono il motivo della scelta:

- si può **allargare** un ritaglio fatto troppo stretto — cioè cambiare idea;
- ritagliare dieci volte non degrada niente, perché non è una catena di ricompressioni una
  sull'altra ma sempre un taglio unico dall'originale.

Questo però apriva una trappola: la pulizia delle **foto orfane** ragiona per id, e avrebbe
visto quegli originali come spazzatura di progetti cancellati — portandoseli via al primo
giro e rendendo il ritaglio definitivo senza che nessuno lo avesse deciso. Ora l'originale è
dichiarato vivo insieme all'immagine a cui appartiene. Gli originali di foto **davvero**
cancellate restano orfani, ed è giusto: quello spazio va recuperato.

### Il dettaglio che rovina un ritaglio, se lo si sbaglia

La tela mostra l'immagine **rimpicciolita** per starci sullo schermo. Se il taglio si
prendesse da lì, ritagliare rimpicciolirebbe anche di nascosto: una foto 4000 px tornerebbe
indietro a 900. Il riquadro si disegna sulla copia ridotta, ma il taglio si esegue
sull'immagine originale a piena risoluzione — e il test lo verifica sui numeri: sulla tela il
riquadro era 450×253, la richiesta di taglio dev'essere **800×450**.

Un secondo dettaglio: un disegno con lo sfondo trasparente è un PNG, e convertirlo in JPEG
gli metterebbe sotto un fondo nero. Il formato di partenza decide quello di arrivo.
