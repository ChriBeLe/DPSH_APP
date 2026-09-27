# Il blocco Inquadramento — piano di ricostruzione

> Non è una lista di funzioni da aggiungere: il blocco cambia natura. Da «una mappa con un
> pin» a **una tavola di inquadramento composta**, con una vista di dettaglio, una regionale,
> le pin numerate, il nord e la scala.

---

## 1. Le due decisioni prese

| | Scelta | Conseguenza |
|---|---|---|
| Provider | **Più provider, scelti nel blocco** | Esri come base che funziona ovunque, più le ortofoto ufficiali italiane dove servono. Vedi §2. |
| Composizione | **Schermata dedicata a tutto schermo** | Come lo strumento di disegno: si trascina e si vede. Il menu del blocco resta corto. |

---

## 2. I provider — cosa ho verificato, non ricordato

### Quello che c'è adesso
`Esri World Imagery` per l'immagine, `Esri World_Boundaries_and_Places` per i toponimi.
Nessuna chiave, buona copertura.

> **Una mancanza da sanare subito, indipendentemente dal resto.** L'attribuzione
> «Esri, Maxar, Earthstar Geographics» è **obbligatoria** ed è una condizione d'uso, ma oggi
> non compare da nessuna parte nella figura. In una relazione consegnata a un cliente è una
> mancanza formale. La aggiungo come riga in piccolo dentro il riquadro, per ogni provider.

### ✅ Fase 0 — cosa è venuto fuori dalla verifica

**AGEA non espone un WMS proprio.** Le ortofoto AGEA vengono ridistribuite dalle **regioni**,
ognuna con il suo servizio: Emilia-Romagna (`agea2023_rgb`), Veneto (ortomosaico AGEA 2024),
e così via.

**La Puglia ha una sua ortofoto 2023**, di proprietà regionale, pubblicata via WMS dal SIT.
Per i tuoi cantieri è la fonte giusta: recente, ufficiale, citabile con anno di volo.

> **Ma c'è un vincolo tecnico che va detto subito, e che ho verificato guardando gli
> endpoint:** i servizi del SIT Puglia sono esposti su **`http://`**, non `https://`. Una
> pagina servita in https non può caricare immagini in http — il browser le blocca come
> «contenuto misto» e il riquadro resta **vuoto, senza spiegazione**. Dentro l'APK, che carica
> da `file://`, le regole sono più permissive e potrebbe funzionare; nel browser no.
> Per questo il provider WMS mostra un avviso esplicito invece di un rettangolo grigio: un
> fallimento silenzioso, su una figura destinata a una relazione, è la cosa peggiore.

Conseguenza sul piano: **l'indirizzo WMS lo inserisce l'utente**, non è incorporato. Cambia da
regione a regione, e incorporarne uno solo servirebbe a un solo geologo.

### Le ortofoto italiane
Verificato: il vecchio **PCN del Ministero** espone ortofoto ferme al **2012** — troppo
vecchie per essere presentate come stato dei luoghi. **AGEA** ha invece attivato un
geoportale con ortofoto a **20 cm/pixel**, voli **2022, 2023 e 2024**.

Per una relazione geologica una fonte **ufficiale, italiana, recente e citabile** vale più di
Google: puoi scriverne l'origine e l'anno di volo sotto la figura, e nessuno può contestarla.

> **Da verificare in Fase 0**, prima di prometterlo: che AGEA esponga un servizio WMS/tile
> pubblico interrogabile da un'app, e a quali condizioni. Se non lo espone, il piano non
> cambia — resta Esri, e il selettore di provider ha comunque senso per le ortofoto regionali
> (la Puglia, per esempio, ha un proprio SIT).

### Google
Le tessere satellitari di Google si usano legalmente **solo** via Maps Static/JS API, con
chiave e fatturazione. Gli endpoint `mt.google.com` che si trovano in giro sono interni e non
autorizzati. E c'è un problema pratico prima ancora che legale: **la chiave finirebbe dentro
l'APK**, in chiaro, e chiunque la estragga spende sul tuo account. Te lo sconsiglio. Se un
giorno servisse, si aggiunge come provider con chiave inserita dall'utente — non incorporata.

---

## 3. La navigazione: via le tessere intere

Oggi il mosaico è **5×5 tessere fisse**, e lo spostamento avviene **a tessere intere**. È da
lì che viene lo scatto: non è un difetto di implementazione, è che il più piccolo movimento
possibile è largo un'intera tessera. Inquadrare «un po' più a destra» non esiste come gesto.

**La ricostruzione**: il riquadro diventa una finestra su un piano continuo.

- Lo stato del blocco è `{ centro: {lat, lng}, zoom, larghezzaMm, altezzaMm }` — non più
  «tessera centrale + scostamento in tessere».
- Le tessere che servono si calcolano **dalla finestra**, e si posizionano a **offset in
  pixel**, non in unità di tessera.
- Trascinare sposta il centro di una frazione di tessera. Lo zoom resta a livelli interi
  (sono quelli che il servizio fornisce), ma con una scala CSS intermedia il passaggio non è
  a scatti.

È la stessa matematica già scritta (da lat/lng a x/y di tessera), applicata a una finestra
arbitraria invece che a una griglia allineata.

---

## 4. I toponimi troppo piccoli — e perché stavolta si risolve

Nel codice c'è una nota onesta di due tentativi falliti. Il secondo dice: *«scaricare le
tessere da uno zoom più profondo… non ingrandisce il testo, lo rimpicciolisce»*.

**È vero, ed è vero anche il contrario.** Il ragionamento si era fermato a metà:

- a zoom **più profondo** (z+1) ogni tessera copre **meno** terreno → il testo, disegnato
  sempre alla stessa dimensione in pixel, risulta **più piccolo** rispetto al terreno;
- a zoom **più superficiale** (z−1) ogni tessera copre il **doppio** del terreno → riscalata
  ×2 per allinearsi, la stessa tessera mostra il testo **grande il doppio**, e nella
  posizione geograficamente giusta.

Quindi: **le etichette si prendono da un livello di zoom più superficiale e si riscalano**.
Non è un compromesso geometrico come il trucco attuale (che sposta ogni etichetta di un
raggio di tessera): è **esatto**. Un controllo a tre passi — 1×, 2×, 4× — corrispondenti a
z, z−1, z−2.

> **Il costo, da dire subito:** a zoom più superficiale ci sono **meno** toponimi (la densità
> dei nomi cala con lo zoom). Si ottengono nomi più grandi ma meno numerosi. È un baratto,
> non un pasto gratis — ma è un baratto onesto e prevedibile, al contrario di etichette
> spostate dal loro posto.

---

## 5. Gli elementi della tavola

### 5a. Le pin delle prove

- **Tutte le prove insieme**, non più una sola: il blocco riceve un elenco di punti.
- **Numerate**, con lo stesso gruppo di icone già usato nella mappa GPS.
- **Etichetta sotto**, «DPSH 3», disattivabile per tutte o **per singola pin**.
- Ogni etichetta ha un **suo scostamento** dalla pin: si trascina dove serve. È il requisito
  che nasce dall'esperienza vera — un'etichetta bianca su una strada chiara non si legge, e
  la soluzione non è cambiare colore, è spostarla di due millimetri.
- Dimensione carattere regolabile, per tutte.

### 5b. L'immagine regionale

Una **seconda mappa**, con centro e zoom propri, disegnata sopra quella di dettaglio.

- Un **riquadro rosso** ne mostra il perimetro dell'immagine di dettaglio: non disegnato a
  mano, **calcolato** proiettando i confini della finestra di dettaglio nelle coordinate
  della regionale. Se sposti il dettaglio, il riquadro rosso lo segue da solo.
- **Etichetta del comune** posizionabile, per dare il riferimento immediato.
- Posizionabile ai **quattro vertici** *e* con coordinate libere (§5e).
- **Ritagliabile**: riusa lo strumento di ritaglio già costruito, invece di scrivere un
  secondo ritaglio.

### 5c. Il nord

Freccia che punta **davvero** a nord. In una proiezione Web Mercator il nord è sempre in
alto, quindi la freccia è verticale: sembra banale, ma vale la pena scriverlo nel codice —
il giorno in cui si aggiungesse una mappa ruotata, la freccia deve ruotare con lei.

### 5d. La barra di scala

**Solo sulla vista di dettaglio.** Su una regionale a copertura provinciale una barra di
scala è quasi sempre fuorviante, e non è quello che serve lì.
Carattere e dimensione del riquadro regolabili.

### 5e. Il posizionamento, per tutti gli elementi

Come hai proposto, **entrambe le strade, sullo stesso dato**:

- quattro **vertici** come preselezioni;
- **coordinate libere** in percentuale, per il ritocco fine.

I vertici *scrivono* nelle coordinate libere. Non sono due impostazioni che possono
contraddirsi: sono due modi di scrivere lo stesso numero. È la differenza tra un'interfaccia
che aiuta e una che confonde.

---

## 6. La schermata di composizione

Il motivo per cui serve, detto in numeri: due mappe, N pin con N etichette spostabili
singolarmente, il nord, la scala, il riquadro rosso, i provider, i toponimi. Sono **oltre
trenta parametri**. In un menu laterale su un telefono diventerebbe una lista da scorrere
alla cieca, esattamente il difetto già corretto altrove in questa app.

Nella schermata: la tavola a tutto schermo, si trascina la mappa per inquadrare, si
trascinano le etichette, l'inset, il nord e la scala. Una barra in basso per provider, zoom,
toponimi e le poche cose che restano numeriche.

**Si vede quello che si ottiene**, che è l'unico modo di comporre una figura.

---

## 7. Compatibilità: i template che già esistono

Il blocco `inquadramento` è già dentro i template salvati, con le sue impostazioni
(`satelliteZoom`, `satelliteOffsetX/Y`, `satelliteLabels`…).

**Non si rompe niente**: le vecchie impostazioni vengono lette e convertite una volta
(scostamento in tessere → centro in lat/lng), e da lì in poi vive il modello nuovo. Un
template vecchio si apre e mostra esattamente quello che mostrava. È la stessa strategia
della conversione delle note, e per la stessa ragione: **quello che non è dichiarato viene
perso in silenzio**, quindi si dichiara.

---

## 8. Ordine dei lavori

| Fase | Cosa | Perché lì |
|---|---|---|
| **0** | Verificare i provider: AGEA espone un servizio usabile? A quali condizioni? | Decide se il selettore ha due voci o quattro. Da fare prima di prometterlo |
| **0-bis** | **Attribuzione stampata nella figura** | Mancanza formale che esiste già oggi: si sana subito, indipendentemente dal resto |
| **1** | Il modello dati nuovo + conversione dei template esistenti, con i test | La rete prima del trapezio |
| **2** | La finestra continua: tessere a offset di pixel, niente più tessere intere | Il cuore del problema che hai segnalato |
| **3** | Toponimi da zoom superficiale (1×/2×/4×) | Piccolo e indipendente, risolve un fastidio vecchio |
| **4** | Pin multiple, numerate, con etichette spostabili singolarmente | Il motivo per cui il blocco serve nel capitolo introduttivo |
| **5** | Inset regionale con riquadro rosso calcolato + etichetta comune | L'elemento più visibile della tavola |
| **6** | Nord e barra di scala, posizionabili | Piccoli, dipendono dal sistema di posizionamento della Fase 5 |
| **7** | La schermata di composizione | Ha senso quando c'è già tutto da comporre |
| **8** | Verifica: template vecchi, PDF, Word, app viva | Come sempre |

Le fasi 1-4 danno già un blocco molto più utile di quello attuale. La 7 lo rende piacevole.

---

## 9. Le cose che possono andare storte

1. **Le tessere in stampa.** Il PDF nasce da una finestra di stampa: le tessere sono `<img>`
   remoti, e se non hanno finito di caricare al momento della stampa escono bianche. Oggi il
   rischio è lo stesso, ma con due mappe raddoppia. Da affrontare esplicitamente in Fase 2:
   attendere il caricamento prima di stampare, o incorporarle come data URL.
2. **Il numero di richieste.** Una finestra continua ne può chiedere più di 25. Con due mappe
   e più blocchi in un fascicolo si arriva a centinaia: serve una cache per sessione, e un
   limite ragionevole alla dimensione della finestra.
3. **Nessuna rete in cantiere.** Le mappe si vedono solo online. Vale già oggi, ma con
   l'inset diventa più evidente: se compone la tavola in cantiere senza rete, vede due
   riquadri vuoti. Vale la pena mostrare un avviso onesto invece di un rettangolo grigio.
4. **La conversione dei template vecchi**, se sbagliata, sposta l'inquadramento di figure già
   consegnate. Test prima, come per le note.

---

## 10. Una proposta che non mi hai chiesto

Il riquadro rosso dell'inset è calcolato dal perimetro del dettaglio. La stessa proiezione,
al contrario, dà una cosa utile quasi gratis: **una scala grafica anche per l'inset**, o
meglio, **la distanza tra le prove** stampata sulla tavola di dettaglio (per esempio «DPSH 1
– DPSH 2: 47 m»). In una relazione geognostica la distanza reciproca delle verticali è
un'informazione che si va sempre a cercare, e qui uscirebbe da sé.

La lascio come idea per dopo: non appesantisce il piano, e si aggiunge quando il resto regge.
