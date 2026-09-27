# Capitolo introduttivo generato — il piano

> Un capitolo che si comporta come una prova, ma non lo è: ha un template suo, un testo che
> si riempie da solo con i dati del cantiere, e una variazione delle frasi che gli toglie
> l'aria del modulo compilato.

---

## 1. Le tre decisioni già prese

| Domanda | Scelta | Cosa comporta |
|---|---|---|
| Dove vive il testo | **Modello riusabile + dati del progetto** | Il modello si scrive una volta. Ogni cantiere lo riempie con i suoi dati, e le correzioni fatte su un cantiere restano lì. Migliorare il modello migliora anche i cantieri già fatti — finché non sono stati "congelati" (vedi §6). |
| Casualità | **Stabile per progetto, con tasto Rigenera** | Il seme sta nel progetto. L'anteprima è il PDF. Due export dello stesso cantiere sono identici. |
| Quanti capitoli | **Solo l'introduzione** | Un capitolo, in testa. Il meccanismo resta estendibile, ma non si costruisce l'astrazione adesso. |

La seconda merita una riga in più, perché è la meno ovvia e la più importante: **un testo
che cambia a ogni generazione rende l'anteprima una bugia.** Controlli, esporti, e nel PDF
c'è scritto altro. Con il seme nel progetto la varietà resta (due cantieri diversi leggono
diversi), ma il documento è riproducibile.

---

## 2. Dove si innesta, in ciò che c'è già

Ho guardato i punti reali prima di scrivere. Sono cinque, e nessuno richiede di riscrivere
niente di grosso.

| Punto | Cos'è oggi | Cosa gli succede |
|---|---|---|
| `buildCompleteReportHtml(projId, opzioni)` | Cicla le prove, costruisce le sezioni, poi l'indice | Riceve `opzioni.includiIntroduzione` e mette una sezione in testa |
| `buildSurveyReportHtml(surv, proj, isMultiPage)` | Costruisce le pagine di UNA prova dal suo template | Riceve una **prova sintetica** e non se ne accorge |
| `popolaListaProveEsportazionePdf(proj)` | Una riga per prova: spunta + selettore di template | Una riga in più in testa, con la stessa forma |
| `REPORT_BLOCK_TYPES` + `buildBlockContentHtml` | 13 tipi di blocco, un `case` per tipo | Due tipi nuovi: `introduzione`, `inquadramento-generale` |
| `elencoTemplateReportOrdinato()` | Restituisce tutti i template | Filtra per tipo di template |

**La chiave di volta è la prova sintetica.** «Si comporta esattamente come tutte le altre
prove» non è una descrizione: è la strategia implementativa. Se il capitolo passa dalla
stessa funzione delle prove, eredita gratis l'impaginazione a fogli A4 rigidi, i margini del
template, l'intestazione, il piè di pagina, l'indice, il PDF e il Word. Ogni alternativa
significa una seconda strada di impaginazione da tenere allineata alla prima — e questo
progetto ha già pagato quel prezzo una volta.

---

## 3. Il modello dei dati

```js
// Un template acquisisce un tipo. I template esistenti non hanno il campo: assente = 'prova'.
// Nessuna migrazione da scrivere — è la forma di migrazione che non può fallire.
tpl.tipo = 'prova' | 'introduzione'

// Sul progetto, un oggetto solo
proj.introduzione = {
    attiva: false,            // la spunta nella schermata di export
    templateId: 'intro-base',
    modelloId: 'standard',    // quale modello di testo usare
    seme: 481523,             // fissa la variazione delle frasi per QUESTO cantiere
    valori: {},               // SOLO ciò che l'utente ha corretto a mano
    htmlCongelato: null,      // vedi §6: se valorizzato, vince su tutto
    congelatoIl: null
}

// I modelli di testo, in cima allo stato (riusabili tra progetti)
state.modelliIntroduzione = {
    standard: { id, nome, testo: '…con {{segnaposto}} e [[alternative]]…' }
}
```

Tre proprietà di questa forma, dette esplicitamente perché sono il motivo per cui è questa:

- `valori` contiene **solo le correzioni**, non una copia di tutti i dati. Così un comune
  corretto nell'anagrafica del progetto si propaga da solo, e un comune corretto *nel
  capitolo* resta una decisione locale — che è esattamente la richiesta: «modificabili senza
  dover modificare tutto il progetto».
- `seme` è un numero, non il testo generato. Il testo si ricalcola sempre; è la *scelta* a
  essere memorizzata, non il suo risultato.
- `htmlCongelato` è normalmente `null`. Esiste per il giorno in cui una relazione va
  consegnata e non deve più muoversi (§6).

---

## 4. I cinque pezzi, in ordine di rischio

### 4a. Il blocco «Introduzione» deve poter attraversare più pagine 🔴

**È il pezzo più rischioso e va affrontato per primo.** Un'introduzione seria è lunga più di
una pagina. Il blocco `testo` che c'è oggi **non** si spezza: quello che non ci sta,
sparisce oltre il margine.

I blocchi che si spezzano esistono già (`allegato-formule`,
`tabella-dettagliata-parametri`): si dichiarano in `BLOCCHI_FLOWABLE`, emettono il contenuto
diviso in "categorie" numerate, e `filtraCategorieHtmlFlowable(html, da, a)` ne ritaglia la
fetta di ogni pagina.

**Il problema, verificato leggendo la funzione:** oggi quel filtro cerca `<table>`. Solo
tabelle. Un testo fatto di `<p>` e `<h2>` non verrebbe ritagliato: passerebbe intero su ogni
pagina.

Serve quindi **generalizzare il filtro** perché ritagli qualunque elemento di primo livello
che porti `data-categoria-index`, invece delle sole tabelle. È un cambiamento contenuto ma
tocca codice che regge due blocchi già in produzione: **prima i test sui due blocchi
esistenti, poi la modifica, poi il blocco nuovo.** Non l'inverso.

Ogni paragrafo (o titolo, o elenco) del testo generato diventa una categoria. Da lì
l'impaginazione, le pagine di continuazione e l'anteprima funzionano già da sole.

> **Limite che accetto e dichiaro:** le categorie sono atomiche. Un *singolo* paragrafo più
> alto di una pagina non si spezza a metà. Per un testo normale non capita mai; se capitasse,
> si vede subito e si spezza il paragrafo a mano.

### 4b. Il template di tipo «introduzione» 🟡

- `tpl.tipo`, e `elencoTemplateReportOrdinato(tipo)` che filtra.
- La **palette dell'editor** cambia con il tipo: un template di introduzione offre
  `titolo`, `introduzione`, `testo`, `inquadramento-generale`, `separatore`, `divisore`.
  Niente `Tabella Colpi`, niente `Grafico Stratigrafia`, niente `Foto prova`: non esistono
  dati di prova in un capitolo introduttivo, e una palette che offre blocchi che resteranno
  vuoti è una palette che mente.
- L'anteprima dell'editor per questi template chiede **un progetto**, non progetto+prova.

### 4c. La prova sintetica e la sezione in testa 🟡

```js
const survIntro = {
    id: '__introduzione__',
    header: { comune: proj.comune, localita: proj.localita, committente: proj.committente,
              date: proj.date, lat: …, lng: … },
    instrument: {}, logs: [], photos: [], strati: [],
    reportTemplateId: proj.introduzione.templateId,
    eIntroduzione: true
};
```

**Da verificare prima di tutto** (è la Fase 0): `buildSurveyReportHtml` con `logs: []` e
`photos: []` non deve esplodere. Attraversa `arricchisciLogsConNsptRpd`,
`stratiEffettiviProva`, `datiCalcolatiProva`: con un elenco vuoto *dovrebbero* restituire
elenchi vuoti, ma «dovrebbero» non è una verifica. Un test che chiama la funzione con una
prova vuota, prima di costruirci sopra qualunque cosa.

L'**indice** oggi scrive «Prova N° X» per ogni riga: le righe prendono un'etichetta
opzionale, e quella dell'introduzione è il titolo del capitolo.

### 4d. I segnaposto e la scheda del cantiere 🟢

Sintassi `{{nome}}`. Il dizionario iniziale, ricavato dai dati che l'app ha già:

| Segnaposto | Da dove viene |
|---|---|
| `{{comune}}` `{{localita}}` `{{committente}}` | anagrafica del progetto |
| `{{data}}` `{{dataInizio}}` `{{dataFine}}` | date delle prove |
| `{{numeroProve}}` `{{elencoProve}}` | conteggio ed elenco («DPSH 1, DPSH 2 e DPSH 3») |
| `{{profonditaMassima}}` `{{profonditaMinima}}` | dai log delle prove |
| `{{coordinate}}` | media delle coordinate delle prove |
| `{{strumento}}` `{{massaBattente}}` `{{altezzaCaduta}}` | dallo strumento configurato |

Un pannello **«Dati del cantiere»** elenca ogni segnaposto con: il valore automatico, un
campo per correggerlo, e un «torna al valore del progetto». Chi legge vede subito **quali
dati sta usando il testo** — che è più importante del testo stesso, perché è lì che si
annidano gli errori che finiscono in una relazione firmata.

Un segnaposto scritto male (`{{comnue}}`) **non resta nel testo**: viene evidenziato nel
pannello come sconosciuto. Un `{{comnue}}` stampato in una relazione consegnata è il tipo di
figura che questa app deve rendere impossibile.

### 4e. Il generatore di frasi 🟡

Due costruzioni, e basta. «Primordiale ma efficace» è un requisito, non una scusa.

```
[[in data|il giorno|nella giornata del]]      → sceglie una variante
<<Frase A. § Frase B. § Frase C.>>            → rimescola le frasi del gruppo
```

Le alternative sono annidabili (`[[molto [[fitto|compatto]]|sciolto]]`). La scelta dipende
dal seme del progetto tramite un generatore deterministico (mulberry32): stesso seme →
stesso testo, sempre.

> **La cosa che va detta chiaramente:** rimescolare frasi è pericoloso in un modo che le
> alternative non sono. Basta un «Inoltre» o un «Tale indagine» perché l'ordine conti, e il
> risultato diventi sgrammaticato. Quindi il rimescolamento **si applica solo dentro i gruppi
> che marchi tu**, ed è tua la responsabilità che ogni frase del gruppo regga da sola. Il
> pannello mostrerà un'anteprima con un tasto «prova un'altra combinazione», perché una
> regola del genere si controlla guardandola, non ragionandoci.

Un modello «standard» già pronto verrà scritto dal testo che mi darai.

### 4f. L'inquadramento generale con tutti i pin 🟡

Il blocco satellitare esiste ma pianta **un pin solo**, quello della prova
(`buildInquadramentoSatellitareHtml(lat, lng, provaNr, …)`). Serve una variante che accetti
un **elenco di punti**, centri il mosaico sul baricentro e scelga lo zoom in modo che tutte
le prove ci stiano dentro.

Il grosso del lavoro — mosaico di tessere, barra di scala, etichette, spostamento, zoom — è
già scritto e si riusa: cambia chi decide il centro e quanti pin si disegnano.

---

## 5. Cosa può andare storto

Le nomino adesso perché una sorpresa nominata prima è un rischio, dopo è un guaio.

1. **Il filtro delle categorie regge due blocchi in produzione.** Generalizzarlo senza rete
   significa rischiare l'impaginazione dell'allegato formule, che è costata sessioni intere.
   Rete = test sui due blocchi esistenti, scritti prima di toccare la funzione.
2. **La prova vuota.** Se il calcolo dei parametri non tollera zero log, «si comporta come
   una prova» costa molto più del previsto. Da verificare per primo.
3. **Il testo che cambia sotto i piedi.** Risolto dalla decisione sul seme, ma va verificato
   con un test vero: stesso progetto, due generazioni, stesso HTML.
4. **Il modello che migliora e il documento già consegnato.** Vedi §6.
5. **Il Word.** Il capitolo passa dalla stessa pipeline, quindi *dovrebbe* uscire come le
   prove. Da verificare esplicitamente, non da dare per scontato.

---

## 6. Il documento consegnato non deve muoversi

Conseguenza diretta della scelta «modello riusabile»: se domani migliori il modello, i
cantieri già esportati cambierebbero. Per una relazione già consegnata e protocollata è
inaccettabile.

Per questo `htmlCongelato`: un tasto **«Blocca questo testo»** che scrive nel progetto il
testo generato così com'è. Da quel momento il capitolo non ascolta più né il modello né i
dati; un avviso lo dice, e un tasto lo sblocca.

Non è una funzione in più: è la contropartita necessaria della decisione presa al punto 1.

---

## 7. Ordine dei lavori

| Fase | Cosa | Perché lì |
|---|---|---|
| **0** | Test: `buildSurveyReportHtml` con una prova vuota; test sui due blocchi flowable esistenti | Sono le due verifiche da cui dipende se il piano regge |
| **1** | Generalizzare `filtraCategorieHtmlFlowable` oltre le tabelle, con i test della Fase 0 verdi | Il pezzo rischioso, fatto quando c'è la rete |
| **2** | Blocco `introduzione` flowable + `tpl.tipo` + palette filtrata | La base su cui si vede qualcosa |
| **3** | Prova sintetica + sezione in testa + riga nella schermata di export + indice | Da qui il capitolo esce già nel PDF, ancora con testo scritto a mano |
| **4** | Segnaposto + pannello «Dati del cantiere» + correzioni locali | Il capitolo comincia a riempirsi da solo |
| **5** | Generatore di frasi + seme + Rigenera + «Blocca questo testo» | La parte che si controlla guardandola |
| **6** | `inquadramento-generale` con tutti i pin | Indipendente: si può fare anche prima, se ti serve vederlo |
| **7** | Verifica finale: PDF, Word, backup/ripristino, app viva | Come sempre |

Le fasi 0-3 danno già un capitolo introduttivo funzionante e impaginato, con il testo
scritto a mano. Le fasi 4-5 lo rendono automatico. Se a metà strada vuoi fermarti, ti resta
comunque qualcosa di finito.

---

## 8. Il testo vero è arrivato — cosa ha cambiato

Vedi **`Modello_Introduzione.md`** per l'analisi completa delle due relazioni Eurisko. In
sintesi, tre cose che il piano scritto a tavolino non poteva sapere:

1. **Quasi tutti i dati ci sono già.** Coefficiente di correlazione e diametro della punta,
   ricalcolati con le funzioni dell'app, danno **esattamente** i numeri stampati nella
   relazione (1,491 e 50,46 mm). L'intero elenco dei caratteri dimensionali si compila da
   solo. Mancano **quattro** campi: sede del committente, denominazione dell'intervento,
   nome del penetrometro, rivestimento/fanghi.

2. **Il capitolo occupa tre pagine e contiene una tabella.** La Fase 1 (generalizzare il
   filtro delle categorie) non era una precauzione: senza, il capitolo non esiste. E le
   categorie non saranno solo paragrafi — anche tabelle, quindi il filtro deve reggere
   entrambe le forme, non passare dall'una all'altra.

3. **Le due relazioni sono sgrammaticate**, nello stesso punto e in due modi opposti
   («5 sondaggio spinti», «n. 1 prova spinte»). È il difetto tipico del copia-incolla
   adattato a metà, ed è il vero motivo per cui questa funzione serve. Un generatore che
   ripete quell'errore non risolve niente: sposta il problema. Per questo le concordanze
   singolare/plurale **non** diventano un linguaggio di condizioni da imparare, ma
   segnaposto già concordati (`{{fraseSondaggi}}`, `{{fraseProveEseguite}}`,
   `{{fraseProfondita}}`, `{{didascaliaFigura}}`), calcolati da chi sa quante prove ci sono.

**Fase 6 si allarga:** la figura 1.1 ha un riquadro d'angolo — vista larga con un cerchio
rosso — oltre alla mappa ravvicinata con i pin.

---

## 9. Cosa serve ancora da te

- Confermi che **sede del committente** e **denominazione dell'intervento** vanno
  nell'anagrafica del progetto, accanto a committente/comune/località?
- Le due relazioni hanno **coefficienti diversi** (1,504 e 1,491) pur elencando gli stessi
  parametri. Il 1,491 lo riproduco esatto, il 1,504 no: in quella relazione un parametro
  usato nel calcolo era diverso da quello scritto nell'elenco. Vale la pena capire quale.
- **Le normative**: nel testo che mi hai dato non compaiono. Le vuoi come sezione a parte?
