# Piano — parte 2: le tue tre domande, e la prossima mossa

---

## 1. «Come scelgo quale paragrafo va alla pagina dopo? E se voglio spezzare un rigo?»

È la domanda giusta, e la risposta è che **quella scelta non esiste** — nel senso che nessun
programma di impaginazione la offre, e non per pigrizia.

### Perché non si spezza un rigo

Una riga di testo non è un contenitore: è il risultato di quante parole ci stanno nella
larghezza disponibile. Se spezzassi *dentro* una riga, la parte rimasta si riadatterebbe
subito — cambierebbe la larghezza disponibile, quindi le parole per riga, quindi il punto
dove volevi tagliare. Il taglio si mangerebbe da solo.

Per questo l'unità minima di divisione è **la riga intera**, e la decide la macchina.

### Quello che invece decidi tu

Non «dove si taglia», ma **quali paragrafi non si possono tagliare**. È esattamente il modello
di Word (`Formato → Paragrafo → Distribuzione testo`), e funziona da trent'anni perché è la
domanda a cui un autore sa rispondere.

Quattro regole, tutte per paragrafo, dal menu del paragrafo nell'editor:

| Regola | Cosa fa | Quando serve |
|---|---|---|
| **Non spezzare** | il paragrafo non si divide mai: se non ci sta intero, va tutto alla pagina dopo | la formula olandese con le sue definizioni sotto |
| **Tieni col successivo** | resta attaccato a quello che segue | un titolo non deve restare solo in fondo alla pagina |
| **Comincia in pagina nuova** | prima di lui va sempre un salto pagina | «il capitolo 2 comincia a pagina sua» |
| **Interruzione manuale** | una riga tratteggiata che tagli dove vuoi | il caso in cui decidi tu e basta |

**Il tuo caso — «voglio portare questo paragrafo alla pagina successiva» — si risolve con
«Non spezzare».** Se non ci sta intero, si sposta intero. Non devi calcolare niente.

### E due automatismi che tolgono la gran parte del lavoro

- **Niente righe orfane o vedove**: mai una riga sola staccata dal suo paragrafo. È la
  regola che, da sola, elimina il 90% degli aggiustamenti manuali.
- **I titoli restano coi loro paragrafi** per costruzione, senza doverlo chiedere.

### «Come mi regolo?» — te lo faccio vedere

Il pezzo che manca alla tua domanda è vedere *dove* cade il taglio. Quindi nell'editor,
dentro il testo, disegno una **riga tratteggiata con la scritta «fine pagina»** nel punto
esatto in cui il flusso taglierà.

Così non si ragiona più al buio: vedi che il taglio cade in mezzo alla formula, tocchi quel
paragrafo, dici «non spezzare», e la riga si sposta sotto tutto il paragrafo. Nessun calcolo,
nessuna prova e riprova con la stampa.

> Le due righe tratteggiate sono diverse apposta: **grigia e automatica** = «qui taglierà»,
> **colorata e con la maniglia** = «qui tagli tu». Non devono potersi confondere.

---

## 2. «Uniformare tutto da un solo posto»

D'accordo, e aggiungo una distinzione che secondo me tiene in piedi la cosa: ci sono due
livelli, e vanno tenuti separati o si torna al caos.

### Livello documento — vale per tutto, si tocca una volta

Nelle impostazioni del **template**, un pannello «Stile del testo»:

- **Carattere** (la tendina dei font)
- **Corpo del testo** in punti — es. 11
- **Interlinea** — 1 / 1,15 / **1,5** / 2
- **Allineamento** — **giustificato di default**, variabile
- **Corpi dei titoli** — H1 / H2 / H3 in punti
- **Rientro prima riga** e **spazio fra paragrafi**

**Questo è il posto normale.** Chi non vuole pensarci scrive e basta: tutto esce coerente.

### Livello paragrafo — l'eccezione, dentro l'editor

I comandi della barra (grassetto, allineamento di *questo* paragrafo, corpo diverso per una
didascalia) restano dove sono. Ma diventano **eccezioni dichiarate**, non l'impostazione
normale.

E per non impazzire, come dici tu, due cose:

- **«Riporta allo stile del documento»**: un comando che cancella tutte le eccezioni del
  blocco, o della selezione. Il tasto «annulla i miei pasticci».
- **Un pallino accanto al blocco quando ha eccezioni**, con l'elenco. Così non devi
  ricontrollare paranoicamente: se il pallino non c'è, il blocco segue il documento. Il
  controllo lo fa il programma, non tu.

---

## 3. Il font delle formule

Word usa **Cambria Math** e lo tiene anche nei documenti scritti in Calibri: le formule sono
serif per convenzione tipografica, perché le lettere con grazie si distinguono meglio quando
diventano simboli (la *l* dalla *1*, la *I* dalla *l*).

Incorporo **STIX Two Math** (OFL), disegnato per l'editoria scientifica e pensato per stare
accanto a Times/Cambria. È la scelta giusta per R<sub>pd</sub> = M²·H / [A·e·(M+P)].

**Sull'ambito, però, sono onesto: non ti costruisco l'editor di equazioni di Word.** Quello è
un progetto a sé. Quello che ha senso qui, e che copre le formule delle tue relazioni:

- uno **stile «formula»** che applica il font matematico, con le variabili in corsivo come
  vuole la convenzione;
- **apice e pedice** veri (R<sub>pd</sub>, m²);
- una **paletta di simboli** da toccare: √ ∙ × ÷ ≤ ≥ ≠ ± ° ² ³ Δ Σ α β γ δ θ λ μ π σ φ ω ∞ ∫.

Con questi tre pezzi la formula olandese si scrive in venti secondi. Se un giorno servisse
LaTeX vero ne riparliamo, ma sarebbe un altro lavoro.

---

## 4. I tag: mostrati, non cucinati — hai ragione, ed è meglio così

Sei stato chiarissimo, e la tua richiesta è più forte della mia proposta iniziale. Nel piano
avevo scritto *«non salverei nel tag il valore risolto»* pensando al rischio Roma/Brindisi.
**Ma tu chiedi un'altra cosa, e le due non sono in conflitto:**

- il tag **non memorizza** il valore → non c'è nessun dato cucinato che possa diventare falso;
- il tag **mostra** il valore, letto ogni volta dal progetto scelto nell'editor.

È la stessa distinzione che abbiamo già applicato all'etichetta del comune sulla mappa:
il modo si salva, il valore si rilegge. Qui vale identica.

### Come funziona, in concreto

```
Il tag è un nodo con UN SOLO attributo:  { tipo: 'sedeCommittente' }
Nessun valore dentro. Mai.
```

- **Nell'editor e nell'anteprima del blocco**: il nodo mostra il valore vero del progetto
  selezionato, dentro la pastiglia colorata. Cambi progetto dalla tendina «Anteprima con i
  dati di» → la pastiglia cambia testo **e il testo attorno si riadatta subito**.
- **Quindi vedi l'impaginazione vera**, che è il tuo punto: «Via dei Cazzi Scorciati 14»
  occupa lo spazio che occupa, e se manda il paragrafo a capo lo vedi mentre componi, non a
  PDF fatto.
- **In stampa**: la pastiglia sparisce e resta il testo. Solo lì il valore viene fissato,
  perché il PDF è un documento morto per definizione.
- **Se il dato manca**: la pastiglia diventa rossa e dice «sede committente — da compilare».
  Toccandola compili il campo, e la compilazione va **sul progetto**, non sulla copia.

Genzano e Capurso si comportano esattamente come hai descritto: stesso template, due sedi
diverse, due impaginazioni vere.

---

## 5. La prossima mossa

Parto dalle tre cose a rischio basso, che sono anche quelle che si vedono subito.

### Fase 1 — I font (e le formule)

1. Incorporare come WOFF2 sottoinsieme latino: **Carlito** (≈Calibri), **Liberation Sans**
   (≈Arial), **Liberation Serif** (≈Times), **Caladea** (≈Cambria), **STIX Two Math**.
   Tondo e grassetto per i primi quattro; il matematico solo tondo.
2. Dichiararli con `@font-face` in modo che valgano **anche nel documento di stampa**, non
   solo nell'app: è lì che serve davvero.
3. Tendina del carattere nelle impostazioni del template.
4. Togliere gli `Arial` scritti a mano nei blocchi, che oggi mentono su Android.

*Verifica*: che il PDF dichiari il font incorporato e non un nome che il dispositivo non ha;
che il testo esportato in Word non perda il carattere.

### Fase 2 — Stile del testo a livello documento

5. Pannello «Stile del testo» del template: corpo, interlinea, allineamento (**giustificato
   di default**), corpi dei titoli, rientro, spazio fra paragrafi.
6. Via il moltiplicatore `--tpl-riga-scale` dal testo — è quello che schiaccia le righe.
7. «Riporta allo stile del documento» + il pallino delle eccezioni.

*Verifica*: che cambiare l'interlinea nel pannello cambi davvero l'anteprima **e** la stampa,
con lo stesso numero; che il pallino compaia solo quando un'eccezione c'è per davvero.

### Fase 3 — L'ubicazione nel testo generato

8. Frase di ubicazione con comune, provincia, località e coordinate.
9. Campo **Provincia** nell'anagrafica del progetto.

*Verifica*: che la frase regga con una prova e con cinque, e che non stampi mai «undefined»
o un comune vuoto.

---

Dopo queste tre, l'unificazione Titolo+Testo e il flusso automatico — le due grosse — con la
loro suite di controlli. I tag `@` per ultimi, perché si appoggiano al blocco unificato.
