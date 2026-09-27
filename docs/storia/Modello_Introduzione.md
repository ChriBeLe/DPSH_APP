# Il modello dell'introduzione — analisi, testo corretto, e come funziona

> Ricavato dalle due relazioni Eurisko. Ogni numero è stato ricalcolato con le funzioni
> dell'app, non dedotto.

---

## 1. I due coefficienti: mistero risolto

Non sono due coefficienti diversi. **È lo stesso coefficiente, calcolato con due masse
battenti diverse:**

| Massa battente usata nel calcolo | βt che ne esce | Relazione |
|---|---|---|
| 63,0 kg | **1,491** | la seconda |
| 63,5 kg | **1,504** | la prima |

Ma **entrambe le relazioni stampano «Peso Massa battente 63,0 Kg»** nell'elenco. Quindi la
prima ha calcolato con 63,5 e dichiarato 63,0: l'elenco dei parametri e il coefficiente lì
sotto non si riferiscono allo stesso strumento. Non è un dettaglio estetico — βt moltiplica
ogni singolo N<sub>SPT</sub>, e da lì passano tutti i parametri avanzati.

**Risolto** (`test/coefficiente_betat.js`, 16 controlli): il coefficiente ora si **vede** nelle
impostazioni dello strumento, aggiornato mentre digiti i parametri, con la formula scritta
sotto. E si può **imporre** un valore diverso: in quel caso il numero diventa rosso e, sopra,
resta visibile quello che i parametri direbbero. Un campo vuoto, uno zero o un testo non
possono azzerare gli N<sub>SPT</sub> in silenzio.

Con la generazione automatica il problema sparisce alla radice: elenco e coefficiente
escono dalla stessa fonte, quindi non possono divergere.

---

## 2. Da dove viene ogni dato

### Già nell'app

`{{committente}}` `{{comune}}` `{{localita}}` `{{data}}` `{{numeroProve}}` `{{elencoProve}}`
`{{profonditaMax}}` `{{profonditaMin}}` `{{massaBattente}}` `{{altezzaCaduta}}`
`{{pesoSistemaBattuta}}` `{{areaPunta}}` `{{lunghezzaAste}}` `{{pesoAsteMetro}}`
`{{avanzamentoPunta}}` `{{angoloPunta}}` `{{coordinate}}`

Più due **calcolati**, verificati contro la tua relazione:

- `{{diametroPunta}}` = 2·√(A/π) → da 20 cm² esce **50,46 mm**
- `{{coeffCorrelazione}}` = `betaTStrumento(...)` → **1,491**
- `{{numeroColpiPunta}}` = dal passo → **N(20)**

### Aggiunti adesso ✅

- `{{sedeCommittente}}` e `{{denominazioneIntervento}}` — due campi nuovi in **Intestazione
  Cantiere**, che scrivono sul progetto e non sulla prova: si compilano una volta per
  cantiere, non a ogni verticale.

### Ancora da aggiungere (fase 4)

- `{{nomePenetrometro}}` («GEO DEEP DRILL») e `{{rivestimentoFanghi}}` («No») → nello strumento.

---

## 3. Le tue relazioni sono sgrammaticate, e le ho corrette

Nello stesso punto, in due modi opposti:

> «sono stati realizzati **5 sondaggio** DPSH **spinti**» — verbo plurale, sostantivo singolare
> «è stata realizzata **n. 1 prova** DPSH, **spinte**» — verbo singolare, participio plurale

È il difetto tipico del copia-incolla adattato a metà. Per questo le concordanze **non**
diventano un linguaggio di condizioni da imparare, ma segnaposto già concordati, calcolati da
chi sa quante prove ci sono:

| Segnaposto | Con 1 prova | Con 5 prove |
|---|---|---|
| `{{fraseSondaggi}}` | è stato realizzato un sondaggio DPSH spinto | sono stati realizzati 5 sondaggi DPSH spinti |
| `{{fraseProveEseguite}}` | è stata realizzata n. 1 prova DPSH, spinta | sono state realizzate n. 5 prove DPSH, spinte |
| `{{fraseProfondita}}` | fino alla profondità di 7,0 m | fino a profondità comprese tra 5,0 e 7,0 m |
| `{{didascaliaFigura}}` | Sito di indagine e punto di sondaggio | Sito di indagine e punti di sondaggio |

`{{fraseProfondita}}` sceglie da sola: se le prove arrivano tutte alla stessa quota dice «fino
alla profondità di X m», se no dice «comprese tra X e Y m». Scrivere una quota sola quando ce
ne sono cinque diverse è falso, ed è il tipo di falsità che nessuno rilegge.

---

## 4. Cinque aperture, tutte corrette

Sono le cinque combinazioni che il generatore può produrre per il primo paragrafo. Le ho
scritte perché reggano davanti a un cliente: registro tecnico, niente sinonimi forzati.

**1.**
> Nel seguito viene fornita una descrizione dell'attività di indagine geognostica realizzata
> per conto della ditta **{{committente}}**, con sede in **{{sedeCommittente}}**, a corredo
> dell'intervento denominato "**{{denominazioneIntervento}}**".

**2.**
> La presente relazione descrive l'attività di indagine geognostica eseguita per conto della
> ditta **{{committente}}**, con sede in **{{sedeCommittente}}**, nell'ambito dell'intervento
> denominato "**{{denominazioneIntervento}}**".

**3.**
> Si riportano di seguito le risultanze dell'indagine geognostica condotta per conto della
> ditta **{{committente}}**, con sede in **{{sedeCommittente}}**, a supporto dell'intervento
> denominato "**{{denominazioneIntervento}}**".

**4.**
> Nel presente elaborato è descritta l'attività di indagine geognostica svolta su incarico
> della ditta **{{committente}}**, con sede in **{{sedeCommittente}}**, a corredo
> dell'intervento denominato "**{{denominazioneIntervento}}**".

**5.**
> La presente nota illustra l'indagine geognostica realizzata per conto della ditta
> **{{committente}}**, con sede in **{{sedeCommittente}}**, a servizio dell'intervento
> denominato "**{{denominazioneIntervento}}**".

Nel modello sono una riga sola:

```
[[Nel seguito viene fornita una descrizione dell'|La presente relazione descrive l'|
Si riportano di seguito le risultanze dell'|Nel presente elaborato è descritta l'|
La presente nota illustra l']]attività di indagine geognostica
[[realizzata|eseguita|condotta|svolta su incarico|realizzata]] per conto della ditta
{{committente}}, con sede in {{sedeCommittente}}, [[a corredo|nell'ambito|a supporto|
a servizio]] dell'intervento denominato "{{denominazioneIntervento}}".
```

E la chiusura del capitolo 2, cinque forme corrette:

```
L'elaborazione dei dati acquisiti ha permesso di [[ricostruire|definire|delineare|
ricomporre|restituire]] la geometria e la giacitura dei corpi che costituiscono il primo
sottosuolo e di [[definirne|caratterizzarne|precisarne]] le caratteristiche geotecniche.
```

---

## 5. Dove il testo NON deve variare

Il capitolo 2 è al 95% fisso e **deve restarlo**. Metodo, campi di variabilità della
strumentazione, richiamo alle Procedure ISSMFE, formula olandese: non sono prosa tua, sono la
citazione di uno standard. Riformularli non renderebbe il documento più originale — lo
renderebbe meno rigoroso, e a chi confronta due tue relazioni salterebbe all'occhio come
un'incoerenza.

Le alternative servono in apertura e in chiusura. Non dove il testo è di qualcun altro.

---

## 6. Le normative — proposta da confermare

Non compaiono nelle due relazioni che mi hai dato (c'è solo il richiamo ISSMFE). Proposta:
una **sezione a sé**, con un archivio di riferimenti modificabile — come già fai con
l'archivio litologico — così si aggiornano una volta e valgono per tutti i cantieri.

Elenco di partenza per un'indagine geognostica in Italia:

- **D.M. 17 gennaio 2018** — «Aggiornamento delle Norme tecniche per le costruzioni» (NTC 2018)
- **Circolare 21 gennaio 2019, n. 7 C.S.LL.PP.** — Istruzioni per l'applicazione delle NTC 2018
- **UNI EN 1997-1 / 1997-2** (Eurocodice 7) — Progettazione geotecnica
- **UNI EN ISO 22476-2** — Indagini geotecniche: prove penetrometriche dinamiche
- **UNI EN ISO 22475-1** — Metodi di campionamento e misure piezometriche
- **Raccomandazioni AGI** sulle indagini geotecniche
- **Procedure di riferimento ISSMFE** (già citate nel corpo del capitolo 2)

> **Questo elenco va confermato dal tuo Direttore Tecnico.** Ho verificato che il quadro
> vigente è quello delle NTC 2018 (D.M. 17/01/2018), ma il set esatto di norme da citare
> dipende dall'opera e dalla committenza, e in una relazione firmata citare una norma di
> troppo è un errore quanto ometterne una. L'archivio nasce con questi valori e li modifichi
> tu.

---

## 7. Come funziona, dopo le tue decisioni

### L'anteprima è il testo, non una previsione

Il testo generato viene **scritto dentro il blocco**, come qualunque altro testo. Non si
rigenera al momento della stampa. Quindi l'anteprima *è* il PDF, per costruzione — non
perché ci mettiamo attenzione.

**Rigenerare è un'azione tua**, dal menu del blocco: icona **due dadi e una scintilla**,
gialla. Prima di procedere avvisa che il testo aggiunto o modificato a mano andrà perso.

### I dati automatici si vedono, e si toccano

Ogni valore preso dal campo esce avvolto in un marcatore
(`<span data-dato="comune">Sava</span>`) ed è **evidenziato con il colore del tema**: chi
legge sa a colpo d'occhio cosa viene dai dati di cantiere e cosa è stato scritto a mano.
Toccando il valore evidenziato si va **direttamente alla sua voce** nell'elenco «Dati del
cantiere», pronta da correggere.

In stampa i marcatori spariscono: l'evidenziazione è un aiuto di redazione, non un colore
nel PDF.

### Quello che manca si conta

Se un dato previsto non c'è, il blocco porta un **triangolo di pericolo con il numero** delle
informazioni assenti. Si aggiungono a mano dal pannello, oppure si va a compilare il campo
nel progetto. Un `{{comune}}` finito stampato in una relazione consegnata è il tipo di figura
che questa app deve rendere impossibile.

### «Se la generazione cambia la lunghezza, si sminchia il layout?»

Era la mia preoccupazione, e la tua decisione l'ha già risolta. Tre ragioni:

1. **Il testo è scritto nel blocco.** Se non ci sta, lo vedi nell'anteprima nello stesso
   istante in cui generi — non alla stampa.
2. **Le alternative cambiano poche parole**, non paragrafi: «a corredo» ↔ «nell'ambito» sposta
   la riga di qualche carattere, mai di una pagina.
3. **I blocchi sono più d'uno** (§8), quindi un testo che cresce spinge il blocco successivo,
   non sfonda una pagina intera.

E se un giorno un testo davvero non ci stesse: interruzione di pagina manuale nel testo, come
in Word. Ma come dici tu, per ora è un problema inesistente.

---

## 8. Cosa cambia nel piano

| Prima | Adesso | Perché |
|---|---|---|
| Un unico blocco «Introduzione» flowable | **Più blocchi di testo**, divisi come nei tuoi esempi | Tua decisione, e toglie di mezzo il pezzo più rischioso |
| Generalizzare il filtro delle categorie (Fase 1) | **Cancellata** | Serviva solo al blocco monolitico |
| `htmlCongelato` per i lavori consegnati (§6) | **Cancellato** | «Per i lavori già consegnati: sticazzi» |
| Seme del progetto + rigenerazione a ogni render | **Testo scritto nel blocco**, rigenerazione a comando | L'anteprima non può mentire se è il testo stesso |
| Inquadramento con tutti i pin (Fase 6) | **Rimandato**, appunti presi | Ne parliamo a parte |
| — | **Sezione Normative + archivio modificabile** | Nuovo, essenziale |
| — | **βt visibile e imponibile** ✅ fatto | «RISOLVI!!!» |
| — | **Sede committente + denominazione intervento** ✅ fatti | Confermati da te |
