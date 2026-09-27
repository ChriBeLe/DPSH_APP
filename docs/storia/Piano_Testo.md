# Piano — il testo: font, tag, titoli, impaginazione

> Sette richieste, una scoperta non richiesta, e due decisioni che vanno prese **prima** di
> scrivere codice perché tutto il resto ci si appoggia sopra.

---

## 0. Una cosa che devi sapere prima di scegliere i font

Ho controllato: l'app dichiara `font-family: Arial` in tutti i blocchi di testo e titolo.

**Sul tuo telefono non è Arial.** Arial è un font Monotype, distribuito con Windows e macOS:
Android non ce l'ha. Quando la WebView incontra `Arial` non trova niente e ripiega su
**Roboto**, che ha metriche diverse. Calibri e Cambria sono Microsoft: idem, non esistono su
Android.

Conseguenze concrete, che spiegano cose che forse hai già notato:

- il PDF generato dal telefono **non ha lo stesso font** del PDF generato dal PC;
- le stesse righe occupano larghezze diverse, quindi **gli a capo cadono in punti diversi** e
  un blocco che sul PC entra nella pagina sul telefono può sforare;
- aggiungere «Calibri» a una tendina, così com'è, ti darebbe una scelta che sul campo non
  produce nessun effetto visibile. Sarebbe un comando che finge.

### La soluzione: font incorporati, metricamente compatibili

Esistono font liberi costruiti apposta per avere **le stesse identiche metriche** dei font
Microsoft — stessa larghezza di ogni lettera, stessi a capo:

| Vuoi | Si incorpora | Licenza |
|---|---|---|
| Calibri | **Carlito** | OFL |
| Arial / Helvetica | **Liberation Sans** | OFL |
| Times New Roman | **Liberation Serif** | OFL |
| Cambria | **Caladea** | OFL |

Incorporati nel file come WOFF2 **sottoinsieme latino** (solo i caratteri che servono):
~25 KB per peso. Con quattro famiglie × due pesi (tondo e grassetto) si aggiungono
**~200 KB** ai 2,8 MB attuali. È il prezzo per avere un documento che si stampa identico
ovunque — e per una relazione firmata mi sembra un prezzo giusto.

> Se preferisci non appesantire il file, l'alternativa onesta è: niente tendina dei font, e
> si dichiara una volta sola il carattere di sistema. Meglio un font solo che funziona di
> cinque che dipendono dal dispositivo.

### I font proposti

Seri, puliti, adatti a una relazione geologica. Niente di pacchiano.

**Senza grazie** (testo corrente, tabelle, didascalie)
- **Calibri** (Carlito) — umanista, moderno, lo standard di Word dal 2007
- **Arial** (Liberation Sans) — neutro, richiesto
- **Helvetica** → è Liberation Sans anche lui: non lo elenco due volte

**Con grazie** (per chi vuole un corpo del testo più "da relazione")
- **Cambria** (Caladea) — disegnata per la stampa, ottima leggibilità a corpo piccolo
- **Times New Roman** (Liberation Serif) — il classico, ancora richiesto da molti enti

**Scartati, e perché**
- Verdana: nata per lo schermo, larghissima, fa sembrare il documento anni Novanta
- Century Gothic, Comic Sans, Papyrus: fuori discussione
- Garamond: bello ma troppo chiaro a 10-11 pt su stampa laser economica
- Roboto / Noto: ottimi ma sono i font di sistema Android, non aggiungono scelta vera

**Cinque voci, non venti.** Una tendina lunga non è più libertà, è più tempo perso.

---

## 1. Prima decisione: unificare Titolo e Testo

### Il conflitto che hai visto è reale, e ti mostro dov'è

Nel codice il titolo è marcato così:

```js
return `<div class="tpl-block-richtext" data-titolo-indice="${livelloIndice}" ...>`
```

`data-titolo-indice` sta **sul contenitore del blocco**, non sul contenuto. E l'indice cerca
esattamente quello:

```js
fogli[k].querySelectorAll('[data-titolo-indice]').forEach(...)
```

Quindi: un `<h2>` scritto dentro un blocco Testo **viene disegnato come un titolo ma non
esiste per l'indice**. Il documento mostra una gerarchia che l'indice non conosce. Non è un
dettaglio estetico: è un documento che dice due cose diverse su se stesso.

### La mia opinione: sì, unificare. Ma il punto non è il blocco

Unire i due blocchi è la conseguenza, non la causa. La causa è **dove sta scritto che una
riga è un titolo**. Oggi lo dice il *tipo di blocco*; deve dirlo il *contenuto*.

È lo stesso schema che abbiamo già applicato tre volte in questo lavoro — l'indice, la
numerazione delle figure, i numeri di pagina — e che ha sempre funzionato: **si risolve sul
documento finito, non su una dichiarazione fatta a parte.** Qui la dichiarazione a parte è
«questo blocco è di tipo titolo».

Quindi: un solo blocco **Testo**, e l'indice legge gli `h1/h2/h3` prodotti dall'editor.
Il livello lo decidi con il comando che c'è già nella barra.

**Cosa ci guadagni davvero**, oltre a togliere il conflitto:
- un capitolo diventa *un* blocco (titolo + corpo), non due da tenere allineati a mano;
- il testo generato dell'introduzione può produrre titolo e corpo insieme, che è come sono
  scritti i tuoi capitoli;
- sparisce la domanda «devo usare il blocco Titolo o scrivere un titolo nel testo?», che
  oggi non ha una risposta giusta.

**Cosa costa**, detto chiaro:
- i template già salvati hanno blocchi `titolo`. Serve una conversione, come quella già
  fatta per le note. Rischio noto e già affrontato una volta;
- il blocco Titolo aveva una sua dimensione in punti separata: va portata dentro il testo
  come formato del paragrafo.

---

## 2. Seconda decisione: l'altezza del blocco di testo

Hai descritto benissimo il sintomo: *«spostando l'altezza il testo si schiaccia riga su riga
e si condensa annullando tutto il rigore di interlinea»*.

Ecco perché succede. Nel codice:

```js
line-height: calc(1.5 * var(--tpl-riga-scale, 1))
```

La maniglia dell'altezza **moltiplica l'interlinea**. Non ridimensiona il blocco: comprime le
righe finché ci stanno. Ecco il rigore che sparisce.

### La mia opinione: la maniglia non va convertita, va tolta

Tu proponi di trasformarla in una maniglia che «taglia alla pagina successiva». Capisco
l'idea, ma credo sia la risposta a una domanda sbagliata, e ti spiego il ragionamento perché
tu possa contestarlo.

**L'altezza di un testo non è un dato: è un risultato.** È corpo del carattere × interlinea ×
numero di righe. Nel momento in cui esiste una maniglia che la imposta per conto suo, quel
numero ha due padroni — ed è esattamente la famiglia di guasti che abbiamo passato la
giornata a togliere: il centro salvato nel template contro le coordinate vere, la barra di
scala calcolata due volte, `satelliteLabelsScale` scritta da due comandi. Lo schiacciamento
che hai visto **è quel conflitto reso visibile.**

E poi: quando un testo non ci sta, la risposta onesta è «continua alla pagina dopo», non
«comprimi le righe finché non ci sta». Una relazione con l'interlinea strizzata si vede, e si
vede che è stata strizzata.

**Quindi propongo, in ordine:**

1. **L'interlinea diventa un comando vero nell'editor**, come su Word: 1 / 1,15 / 1,5 / 2.
   È una scelta tipografica, non un effetto collaterale di una maniglia.
2. **Il testo che non ci sta continua alla pagina successiva, da solo.** La macchina esiste
   già: è quella che fa scorrere le tabelle delle categorie sulle pagine di continuazione.
   Il testo è perfino più semplice — non ha righe da tenere unite, solo paragrafi.
3. **Interruzione di pagina manuale** come comando nell'editor, con una riga tratteggiata
   visibile, esattamente come il Ctrl+Invio di Word. Serve per «il capitolo 2 comincia
   qui», che è una decisione tua e nessun automatismo può indovinarla.
4. **La maniglia dell'altezza sparisce dai blocchi di testo.** Resta dove ha senso: foto,
   grafici, mappe — cose che hanno una dimensione propria.

Non è overcomplesso: è meno codice di quello che c'è adesso, perché toglie un meccanismo
invece di aggiungerne uno.

> **Se non sei d'accordo**, l'alternativa che difenderei come seconda scelta è: interlinea
> come comando, flusso automatico, e **nessuna** interruzione manuale. Mai la maniglia che
> comprime.

---

## 3. I tag `@` — come li farei

L'idea è giusta e risolve un problema vero: oggi per sapere che «Fig. 1.1» si riferisce alla
mappa bisogna crederci.

### Comportamento

Scrivendo **`@`** nell'editor compare un elenco filtrabile, in stile Notion:

**Dati del cantiere** (si compilano da soli, e si correggono da lì)
`@committente` · `@sede committente` · `@denominazione intervento` · `@comune` · `@località`
· `@provincia` · `@data` · `@coordinate` · `@numero prove` · `@profondità` · `@penetrometro`
· `@coefficiente βt`

**Riferimenti** (puntano a qualcosa nel documento)
`@figura` · `@inquadramento` · `@foto` · `@tabella` · `@grafico stratigrafia`

**Dopo l'inserimento**, il tag compare nel testo come una pastiglia colorata. Toccandola:

- se è un **dato del cantiere e c'è**: si apre il campo, già compilato, pronto da correggere.
  La correzione va **sul progetto**, non sulla copia — così vale ovunque;
- se è un **dato del cantiere e manca** (la sede del committente, la denominazione
  dell'intervento: le due che tipicamente arrivano dopo): si apre lo stesso campo vuoto e lo
  compili **da qui**, senza tornare all'anagrafica. È esattamente il tuo «renderlo smooth»,
  e mi sembra la parte più utile di tutta questa richiesta;
- se è un **riferimento a una figura**: si apre l'elenco delle figure disponibili nel
  progetto scelto, con l'anteprima. **L'inquadramento satellitare è il primo della lista**,
  come hai chiesto;
- se **non ci sono figure**: te lo dice, e ti dice cosa fare («aggiungi prima un blocco
  foto»). Non un elenco vuoto senza spiegazione.

### Vincolo tecnico da mettere in conto

Il menu `@` di Notion si fa, in TipTap, con l'estensione `suggestion`. **Non è nel nostro
pacchetto**: l'ho verificato, zero occorrenze in `banco.min.js`. Due strade:

- **A.** Ricostruire `banco.min.js` includendo `@tiptap/suggestion`. Pulito, ma rifà il
  pacchetto e va riverificato tutto il motore delle note.
- **B.** Scriverlo a mano come plugin ProseMirror. **Lo consiglio**: abbiamo già scritto a
  mano la barretta sulla selezione e la ricerca nelle note, funzionano, e il meccanismo è lo
  stesso — si guarda il testo prima del cursore, si mostra un pannello, si sostituisce.
  Nessun rischio sul pacchetto già collaudato.

---

## 4. Il riferimento alle figure, in dettaglio

Oggi `{{figuraSeguente}}` si risolve sul documento finito e diventa «fig. 1.1». Funziona ma è
cieco: non sa *quale* figura.

Nuovo comportamento, come hai chiesto:

1. `@figura` cerca **per primo il blocco di inquadramento satellitare** e propone quello;
2. toccando la pastiglia si apre l'elenco di **tutte** le figure del progetto selezionato
   nell'editor — comprese quelle di altri paragrafi e quelle non contigue;
3. il numero («fig. 2.3») continua a essere calcolato sul documento finito, quindi resta
   giusto anche se sposti i blocchi. Il tag conserva **a chi punta**, non il numero.

Questa distinzione è la cosa importante: se il tag salvasse il numero, spostare un blocco
renderebbe falsi tutti i riferimenti, in silenzio.

---

## 5. Il testo dell'introduzione: comune e posizione

Hai ragione, e nelle due relazioni Eurisko non c'era. È una mancanza vera: una relazione
geologica che non dice **dove** è il cantiere è incompleta.

Aggiungo al modello una frase di ubicazione, con le stesse alternative già in uso:

```
L'area di indagine [[è ubicata|ricade|si colloca]] in agro del Comune di {{comune}}
({{provincia}}), [[in località|nella contrada|in]] {{localita}}, [[alle coordinate
geografiche|in corrispondenza delle coordinate]] {{coordinate}}.
```

Con i segnaposto già concordati per il numero delle prove, così la frase regge sia con una
verticale sia con cinque. E `{{provincia}}` è un dato nuovo: va aggiunto all'anagrafica —
compilabile anche dal tag `@provincia`, per coerenza con tutto il resto.

---

## 6. Il piano, in fasi

Ogni fase è utile da sola e verificabile. Se ti stanchi a metà, quello che c'è funziona.

| # | Fase | Dipende da | Rischio |
|---|---|---|---|
| **1** | **Font incorporati + tendina a cinque voci.** Carlito, Liberation Sans/Serif, Caladea sottoinsiemati. Scelta per template, non per blocco. | — | Basso |
| **2** | **Interlinea come comando dell'editor** (1 / 1,15 / 1,5 / 2) e via il moltiplicatore `--tpl-riga-scale` dal testo. | — | Basso |
| **3** | **Ubicazione nel testo generato** + campo Provincia nell'anagrafica. | — | Basso |
| **4** | **Unificazione Titolo + Testo.** Un solo blocco; l'indice legge gli `h1/h2/h3` del contenuto; conversione dei template salvati. | 2 | **Alto** |
| **5** | **Flusso automatico del testo** sulle pagine di continuazione + **interruzione manuale** nell'editor. Risolve lo sforamento del capitolo 2. | 4 | **Alto** |
| **6** | **Motore dei tag `@`**: plugin del suggerimento, pastiglia nel testo, risoluzione in stampa. | 4 | Medio |
| **7** | **Tag dei dati del cantiere** con compilazione e correzione sul posto (sede committente, denominazione, ecc.). | 6 | Medio |
| **8** | **Tag delle figure** con elenco, anteprima, inquadramento per primo, avviso se non ce ne sono. | 6 | Medio |
| **9** | **Verifica finale**: PDF, Word, backup/ripristino, e la prova che due generazioni dello stesso progetto danno lo stesso HTML. | tutte | — |

**Le fasi 4 e 5 sono quelle da fare con calma.** La 4 tocca template già salvati — cioè
lavoro tuo già fatto — e la 5 tocca l'impaginazione, che in questo progetto ha già dato
filo da torcere. Entrambe vanno con la loro suite di controlli, come le precedenti.

---

## 7. Quello che NON farei

- **Non farei scegliere il font per singolo blocco.** Un documento con quattro caratteri
  diversi è un documento che sembra assemblato. Uno per template, punto.
- **Non farei i tag sostituibili a mano.** Se scrivi `@comune` e poi ci scrivi sopra, deve
  smettere di essere un tag e basta — niente stringhe magiche nascoste nel testo.
- **Non salverei nel tag il valore risolto.** Il tag punta; il valore si legge al momento
  della stampa. Altrimenti torniamo al problema Roma/Brindisi, in un'altra forma.
