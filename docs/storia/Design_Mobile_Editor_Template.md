# Design critique — Editor Template su mobile

App di campo (DPSH Field Collector), usata sul cantiere con una mano sola. Schermata analizzata: **editor del layout del report**. Base: i 4 screenshot + lettura del codice reale. **Nessuna modifica applicata**: questa è la bacheca delle idee che hai chiesto.

---

## Impressione generale

L'editor è potente e le funzioni ci sono tutte. Il problema non è che manchi qualcosa: è che **su mobile non vedi mai la cosa che stai modificando**. Quattro delle sei lamentele che hai elencato non sono difetti separati — sono lo stesso difetto che si manifesta in quattro punti.

### La causa unica

Nel CSS, sotto i 760px di larghezza:

```css
#templateEditorPaletteSidebar {
    position: fixed; inset: 0; z-index: 400;   /* ← occupa TUTTO lo schermo */
}
```

La palette dei blocchi diventa un pannello **a schermo intero**. Il menu del blocco è un foglio che ne copre circa il 70%. Risultato: nel momento esatto in cui agisci, il foglio A4 non è visibile.

Da qui, a cascata:

| La tua lamentela | Perché succede davvero |
|---|---|
| "Non c'è nessun elemento che suggerisca che si sta trascinando" | Il ghost, l'indicatore di rilascio, l'etichetta e l'auto-scroll ai bordi **esistono già e sono ben fatti** (li ho letti nel codice, usano `pointermove` quindi funzionano al tocco). Semplicemente **non hai niente su cui rilasciare**: sotto il pannello a schermo intero il foglio è coperto. Il feedback c'è, manca il bersaglio. |
| "Quando modifichi dal menu, lo fai alla cieca" | Il menu copre il blocco. Alcuni controlli hanno già l'anteprima dal vivo mentre trascini lo slider — ma è dietro al foglio. |
| "Il picker delle interruzioni è inutilizzabile, solo un lembo scorrevole" | La lista delle 11 categorie sta dentro un foglio già pieno di altri controlli: le restano ~60px di altezza. Non è un bug, è aritmetica. |
| "Tutto disordinato e casuale" | Il menu è **una singola colonna lunghissima** con 8 gruppi di controlli non correlati. Su desktop la vedi tutta, su mobile scorri alla cieca. |

**Se sistemi solo la geometria dei pannelli, quattro problemi si chiudono insieme.** È il punto da cui partirei.

---

## Usabilità

| Problema | Gravità | Proposta |
|---|---|---|
| Palette a schermo intero: il drag&drop non ha bersaglio | 🔴 | Palette come **barra bassa orizzontale** (~96px, scorrimento laterale), il foglio resta visibile sopra. Tutta la macchina di trascinamento già esistente torna utile senza riscriverla. |
| Menu blocco copre il blocco modificato | 🔴 | Foglio a **3 posizioni** (spia 96px / metà / intero) + il canvas scorre da solo per portare il blocco selezionato nella fascia visibile sopra il foglio. |
| Interruzioni di pagina in ~60px | 🔴 | Promuoverla a **schermata propria** a tutta altezza, aperta dal menu. Sono 11 categorie: hanno bisogno di spazio, non di un ritaglio. |
| Maniglie di ridimensionamento sotto la soglia di tocco | 🔴 | Vedi §Accessibilità: sono **13px** sul lato corto contro i 44 raccomandati. |
| "+" resta "+" a menu aperto | 🟡 | Stesso elemento che ruota di 45° e diventa ✕. Un solo bottone, due stati, animazione di 150ms. |
| Il grip a 6 pallini del menu non trascina | 🟡 | O lo si rende funzionante (aggancio del foglio alle 3 posizioni) o **va tolto**: un affordance che mente è peggio di nessun affordance. |
| Slider poco precisi (Zoom 161%, Altezza 250%…) | 🟡 | Slider + **campo numerico** affiancato, e passi sensati. Per Larghezza: pulsanti frazionari (¼ ½ ¾ 1) invece di uno slider continuo — le larghezze utili sono poche. |
| Troppo testo esplicativo dentro i controlli | 🟡 | Le spiegazioni lunghe (es. il paragrafo sulle interruzioni) vanno dietro una **ℹ️** che apre un popover, non stampate sempre. |
| Nessun annulla visibile nell'editor | 🟢 | La freccia c'è nella barra in alto ma è piccola e lontana dal pollice. Duplicarla come gesto (scuoti/due dita) o avvicinarla. |

---

## Gerarchia visiva

- **Cosa attira l'occhio per primo**: il bottone giallo "Salva Template". È l'azione meno frequente della schermata — si salva una volta, si modifica cento. Il giallo (colore accento unico) andrebbe sull'azione **primaria del momento**, non su quella finale.
- **Flusso di lettura**: nel menu del blocco non ce n'è uno. ALLINEAMENTO → DIMENSIONE → RIGHE → LARGHEZZA FISSA → BILANCIA → BLOCCA → SCALA GRAFICO → RIMUOVI sono otto concetti allo stesso livello gerarchico, senza raggruppamento percepibile.
- **Enfasi sbagliata**: "Rimuovi blocco" (distruttivo, raro) ha lo stesso peso visivo di "Larghezza" (quotidiano). Il rosso a piena larghezza in fondo lo rende il secondo elemento più evidente del pannello.
- **Il foglio A4 al 30%** (screenshot 2) è illeggibile ma occupa l'80% dello schermo: mostri tanto di una cosa che non si può leggere.

---

## Coerenza

| Elemento | Incoerenza | Proposta |
|---|---|---|
| Checkbox vs bottoni-segmento | "Griglia tabella" usa 3 bottoni-segmento, "Larghezza fissa"/"Blocca" usano checkbox: sono tutte scelte esclusive o binarie | Un solo linguaggio: segmenti per 3+ opzioni, interruttore (non checkbox) per i sì/no |
| Unità di misura | mm nei margini, % in larghezza/zoom/altezza, valore assoluto nelle righe | Va bene, ma l'unità deve stare **dentro** il campo, non solo nell'etichetta |
| Nomi | "Zoom" sul grafico, "Altezza righe" sulle tabelle, "Dimensione testo" altrove — tutti regolano la stessa cosa percepita ("quanto è grande") | Un nome per concetto, deciso una volta |
| Terminologia dei pannelli | "Blocchi disponibili" / "Colonne pagina" / "Manutenzione" | "Manutenzione" non dice niente all'utente: è "Sistema la pagina" |

---

## Accessibilità — i numeri reali

Misurati nel CSS, non a occhio. Riferimento: **44×44 px** (Apple HIG, WCAG 2.5.5) o **48dp** (Material).

| Elemento | Dimensione attuale | Verdetto |
|---|---|---|
| `.tpl-editor-handle-bottom` (altezza blocco) | **40 × 13 px** | ❌ 13px sul lato che conta |
| `.tpl-editor-handle-side` (larghezza blocco) | **13 × 40 px** | ❌ idem |
| `.tpl-editor-page-drag-handle` (riordino pagine) | **16 × 16 px** | ❌ meno di un terzo |
| `.tpl-editor-block-chip` (etichetta trascinabile) | ~20 px di altezza, testo 10px | ❌ |
| Bottoni del menu blocco | ~36 px | 🟡 vicino, non sufficiente con i guanti |

**La soluzione non è ingrandirli visivamente** — diventerebbero invadenti sopra il contenuto. Si allarga solo l'**area sensibile**, con uno pseudo-elemento invisibile:

```css
.tpl-editor-block-handle::before {
    content: ''; position: absolute; inset: -16px;   /* 13px + 32px = 45px reali */
}
```

L'aspetto resta identico, il dito trova il bersaglio. Da applicare a tutte le maniglie.

Altro: `user-scalable=no` nel viewport impedisce lo zoom di sistema. Su un'app da campo, con sole diretta e mani sporche, è una limitazione seria per chi ha difficoltà di vista.

---

## Cosa funziona già bene

Vale la pena dirlo, perché è roba non banale che non va buttata nella riprogettazione:

- **La macchina del trascinamento è completa**: ghost che segue il dito, indicatore di rilascio pulsante, etichetta della posizione, auto-scroll continuo ai bordi, vibrazione alla presa. Usa `pointermove`, quindi il tocco è già supportato. Va solo messa in condizione di funzionare.
- **Anteprima dal vivo** già presente su alcuni slider (il blocco cambia mentre trascini, commit al rilascio).
- **Doppio tocco per azzerare** su slider e maniglie: gesto esperto, ben scelto.
- **Vibrazione tattile** su azioni chiave.
- **La striscia pagine in basso** è il pattern giusto e funziona.
- **Gli avvisi misurati** ("almeno 2 pagine fisiche reali probabili") dicono la verità invece di una stima.

---

## Le 3 cose da fare per prime

### 1. Liberare il foglio — la palette diventa una barra bassa
Da `position: fixed; inset: 0` a una barra orizzontale di ~96px in fondo, con i blocchi scorribili di lato. Il foglio resta visibile sopra. **Chiude in un colpo il feedback di trascinamento** (che già esiste) e rende possibile capire dove stai rilasciando. È il cambiamento con più effetto per meno codice.

### 2. Foglio del menu ad altezze fisse + canvas che si sposta
Tre posizioni: spia (96px, si vede solo il nome del blocco + le 2 azioni più usate), metà, intero. Quando si apre, il canvas scorre da solo per mettere il blocco selezionato nella fascia libera sopra. **Non modifichi più alla cieca.** Il grip a 6 pallini finalmente fa quello che promette.

### 3. Aree di tocco a 44px su tutte le maniglie
Cinque righe di CSS, nessun cambiamento visivo, effetto immediato su ogni interazione dell'editor. È il miglior rapporto risultato/rischio dell'intera lista.

---

## Bacheca idee — da accumulare nel tempo

Organizzata per area così puoi aggiungere man mano. Nessuna è stata implementata.

### Trascinamento e inserimento
- ✅ **FATTO — e la diagnosi iniziale era sbagliata.** Leggendo il codice: su mobile il trascinamento dalla palette **era già disattivato di proposito** (`if (modalitaMobileTemplateEditor()) { inserisciBloccoATocco(type); return; }`) — un tocco inserisce il blocco. Quindi non stavi trascinando niente: toccavi, il blocco veniva creato **in fondo alla pagina**, la palette si chiudeva… e non vedevi nulla, perché a foglio ridotto al 30% il blocco nuovo finiva fuori dalla parte visibile. Non mancava il feedback di trascinamento: mancava **l'esito visibile di un inserimento**.
  - Pannello da `inset: 0` (schermo intero) a **foglio basso da 58vh**, con barretta di presa, angoli arrotondati e scorrimento interno: sopra restano ~40% di schermo con il foglio in vista.
  - Dopo l'inserimento il canvas **scorre sul blocco appena creato** e un messaggio dice cosa è stato aggiunto e dove.
  - Toccare il foglio chiude il pannello (prima non serviva: a schermo intero un "fuori" non esisteva).
- ✅ **FAB "+" → "✕"**: stessa icona che ruota di 45°, animata. Un solo bottone che apre e chiude, nella zona del pollice — la ✕ in alto a destra è stata tolta.
- Resta aperto: valutare se **riabilitare il trascinamento vero** dalla palette ora che il foglio è visibile, o se il tocco-per-inserire + trascinamento successivo è più adatto al dito. Da provare sul campo.
- ✅ **FATTO — durante il trascinamento il resto si fa da parte.** Si sbiadiscono i *comandi* (barra zoom, maniglie, targhette, pannelli), **non il contenuto del foglio**: è guardando il contenuto che si decide dove mettere il blocco, oscurarlo toglierebbe proprio l'informazione che serve.
- ✅ **FATTO — vibrazioni distinte**: presa 15ms, ingresso nel cestino 25ms, eliminazione 40ms. Momenti diversi, sensazioni diverse — altrimenti il dito non sa se ha afferrato o lasciato. L'ingresso nel cestino vibra **una volta sola**, non a ogni movimento: una zona pericolosa deve farsi sentire, non ronzare.
- ✅ **FATTO — cestino durante il trascinamento.** Prima l'unico modo di togliere un blocco era selezionarlo, aprire il menu, trovare "Rimuovi": tre passaggi per un'operazione che il dito sta già facendo, con il blocco in mano.
  - Compare **solo per i blocchi già sul foglio**: trascinandone uno nuovo dalla palette non c'è niente da eliminare, e offrirlo sarebbe un comando che non fa niente.
  - Sopra il cestino **l'indicatore di rilascio si spegne**: lì il blocco non atterra, sparisce — due promesse contraddittorie insieme confonderebbero.
  - **Nessuna richiesta di conferma**: l'undo c'è ed è a un tocco, e chiedere "sei sicuro?" per qualcosa di annullabile è solo un ostacolo. Il messaggio dice cosa è successo e come tornare indietro.
  - Il tipo di blocco **torna disponibile nella palette**, e il menu del blocco eliminato si chiude invece di restare aperto su qualcosa che non esiste più.

### Menu del blocco
- ✅ **FATTO — altezza a tre posizioni + blocco tenuto visibile.** Il menu era già un foglio basso, ma con un tetto unico di 78vh: copriva quasi tutto e il blocco finiva sotto, da cui il "modifichi alla cieca".
  - Tre posizioni: **spia 32vh / metà 55vh / intero 88vh**. La scelta resta per le aperture successive: chi lavora "a spia" non deve riabbassare il foglio ad ogni blocco.
  - La maniglia **finalmente funziona**: aveva `cursor: default` proprio perché su mobile non faceva niente, ma i 6 pallini restavano a promettere un movimento. Ora si trascina in verticale (con aggancio alla posizione più vicina) e un tocco secco passa alla misura successiva in ciclo.
  - I 6 pallini sono stati sostituiti da una **barretta orizzontale**: su un foglio che sale dal basso è il segno che tutti riconoscono. I pallini suggerivano uno spostamento libero che qui non esiste.
  - **Il canvas scorre** per tenere il blocco selezionato sopra il foglio — ma solo se è davvero coperto, per non far ballare la vista ad ogni apertura.
  - **Nome del blocco in cima**: nella posizione "spia" si vedono poche righe, senza non sapresti su cosa stai agendo.
  - Su desktop non cambia nulla: il ramo mobile esce subito e il trascinamento libero del popover resta intatto.
- ✅ **FATTO — schede orizzontali** (Posizione · Dimensione · Stile · Contenuto · Pagine). Cinque e non quattro: i comandi specifici del tipo di blocco — testo, foto, didascalia, toponimi, etichetta e spostamento della mappa — non stavano in nessuna delle quattro previste, e infilarli a forza avrebbe reso le etichette bugiarde.
  - **Costruite dal DOM già reso, non riordinando il markup.** Il menu è un unico template di ~390 righe di frammenti condizionali annidati: spostarne i pezzi a mano per raggrupparli era il modo più rapido per romperlo. Si scorrono invece i figli e si spostano nei pannelli — spostare un nodo non stacca i suoi gestori.
  - **Come si decide dove va un pezzo**: dall'ultima etichetta di sezione incontrata, esattamente come lo legge l'occhio. I controlli numerici condivisi non hanno un'etichetta a parte perché la portano dentro di sé, e vale come tale.
  - **Schede vuote non esistono**, e con un solo gruppo non compare nessuna linguetta: scegliere fra una cosa sola non è una scelta.
  - La scheda scelta **sopravvive alla ricostruzione del menu**, che avviene a ogni modifica — stessa lezione già imparata con la seconda pagina delle interruzioni.
  - Una sezione che nessuno ha classificato finisce in "Contenuto" invece di sparire dal menu.
  - Su desktop non cambia niente: il popover è alto, la colonna unica si legge, le linguette sarebbero un clic in più per nulla.
- Le 2-3 azioni più usate sempre visibili nella posizione "spia"
- "Rimuovi blocco" spostato in un menu ⋮ o dietro scorrimento: è raro e distruttivo
- Spiegazioni lunghe dietro una ℹ️
- ✅ **FATTO — campo numerico accanto a ogni slider**, dentro un componente unico (`htmlControlloNumerico` / `collegaControlloNumerico`, vedi `Piano_Controlli_Font.md`). Cinque controlli che prima erano cinque cose diverse — due tendine, uno slider nudo, due tasti a scatti, uno slider in percentuale — hanno ora la stessa forma: cursore per esplorare, campo per essere esatti, unità dichiarata, fondo scala visibile. Regole fissate una volta sola: conferma su `change` e non a ogni tasto, valore fuori scala riportato dentro in silenzio, campo svuotato che torna al precedente, il cursore che non riscrive il campo mentre ci digiti dentro.
- ✅ **FATTO — il menu si fa da parte mentre regoli.** Toccando uno slider il pannello scende al 15% di opacità e si vede il blocco cambiare sotto. Chiude il difetto d'origine: *"l'utente lo fa alla cieca siccome non si vede minimamente quello che sta avvenendo"*. Solo mobile (su desktop il popover sta di lato e non copre niente).
- ✅ **FATTO — carattere regolabile su TUTTI i blocchi che hanno testo**, grafico stratigrafia compreso: le sue 12 etichette avevano la misura inchiodata in un attributo SVG. Restano fuori solo separatore e divisore, che testo non ne hanno. E dove c'è una prova in anteprima da cui misurare, la dimensione si legge in **punti veri** invece che in percentuale.
- ✅ **FATTO — larghezza in millimetri.** Scelta la strada (a): **mm come lingua, percentuale come dato salvato**. Il modello continua a scrivere `colSpan` derivato dalla percentuale, quindi nessun template esistente va migrato e il ramo di salvataggio non conosce affatto i millimetri — sono solo un modo di leggere lo stesso numero.
  - `93mm · 50%` nel menu, con i mm grandi e la percentuale piccola accanto: "100%" resta l'unico modo per dire a colpo d'occhio "riempie la riga", cosa che "186mm" da solo non direbbe.
  - **Anche la maniglia laterale sul foglio** dice ora la stessa cosa: era l'ultimo punto che parlava solo in percentuale, quindi il numero che leggevi trascinando non era quello che ritrovavi nel menu.
  - Sotto lo slider il fondo scala è la **riga utile reale** (`186mm (riga piena)`), non un numero fisso: stringendo i margini si aggiorna da solo.
  - La misura esce da `calcolaBudgetPaginaMm`, la stessa funzione che tiene l'altezza — riscrivere `210 - margini` altrove sarebbe stato esattamente il tipo di duplicazione che aveva causato il disallineamento editor/export.
  - 20 controlli, di cui 8 che **eseguono davvero** la funzione di conversione, inclusi i casi limite (margini che coprono il foglio, decimali, larghezza utile non nota).
- ~~Larghezza come frazioni (¼ ½ ¾ 1)~~ → superata dalla voce qui sopra. Note d'origine: Verificato nel codice che la larghezza è già un valore continuo (`colSpan = pct / 100 * cols`), quindi non c'è nessun aggancio magnetico da rompere: i mm sono una conversione lineare. Con i margini attuali la larghezza utile è `210 − sinistra − destra` = 186mm. Argomento decisivo di coerenza: i blocchi foto usano già `heightMm` e i margini sono già in mm — le percentuali sono l'unica isola che parla un'altra lingua.
  - **Decisione da prendere**: i mm dipendono dai margini. Due strade: (a) *mm come etichetta, % come dato salvato* — il blocco resta "metà riga", l'etichetta si aggiorna da sola al cambio margini, nessun template esistente si rompe; (b) *mm come dato vero* — più corretto per un documento tecnico, ma serve una regola per quando allarghi i margini e il blocco non ci sta più. Consigliata la (a) come primo passo.
  - Il massimo dello slider deve **seguire i margini**, non essere fisso a 186

### Interruzioni di pagina (tabelle)
- ✅ **FATTO — seconda pagina del pannello.** La sezione **non viene duplicata** in un pannello a parte: è lo stesso elemento che passa in primo piano a 92vh nascondendo il resto del menu. Così i "+" e le ✕ restano agganciati ai loro gestori senza ricollegarli, e non esistono due copie della lista da tenere allineate.
- ✅ **FATTO — da "modalità" a "navigazione"** (proposta tua: *"e se invece che 'A tutto schermo' rendessi quella zona un tasto che porta a una 'seconda pagina' di quella finestra?"*). Il bottone "A tutto schermo" era un **interruttore**: non diceva dove ti portava né cosa ci avresti trovato. Ora la sezione è, nel menu normale, **una riga sola** — `⚡ Interruzioni di pagina · 3 pagine ⚠ · ›` — che si legge come navigazione grazie al chevron, ed entra da destra con uno scorrimento che conferma "sei andato avanti di una schermata". Tre guadagni concreti:
  1. **Il riassunto risponde già alla domanda più frequente** ("quante pagine viene?") senza aprire niente, e il ⚠ rosso avvisa se una pagina trabocca davvero (dato misurato, non stimato).
  2. **Nel menu normale la sezione occupa una riga invece di mezzo pannello**, quindi gli altri comandi tornano raggiungibili senza scorrere.
  3. **Il ritorno è un `‹` da 44px** in testata, dove tutti lo cercano, invece di una scritta da 11px in fondo a un'etichetta.
  Su desktop tutto questo è disattivato: lì il popover è alto e la lista ci sta comoda, quindi si vede direttamente il contenuto come è sempre stato.
  - La lista perde il tetto di 220px e si prende tutta l'altezza libera: è questo che trasforma i ~60px reali in qualcosa di usabile.
  - Righe e "+" più grandi quando c'è spazio (padding 10px, glifo 18px): con 11 categorie e il dito, 4px non bastavano a distinguere una riga dall'altra.
  - Lo stato **sopravvive alla ricostruzione del menu**: ogni "+" richiama `apriMenuBloccoEditor` che ricrea tutto da zero, quindi senza questo accorgimento aggiungere 5 interruzioni di fila ti avrebbe sbattuto fuori 5 volte.
  - Chiudendo il menu si torna sempre al normale: il blocco successivo non si apre dentro una schermata che non hai chiesto.
- ✅ **FATTO — millimetri reali su ogni categoria.** Il dato era **già calcolato e buttato via**: `calcolaAvvisiOverflowGruppiCategoria` misurava ogni categoria, la sommava dentro il suo gruppo e scartava il dettaglio. Ora esce insieme ai gruppi (stessa misurazione, zero costo aggiuntivo) e compare in tre punti:
  - **`18mm` su ogni riga** — così sommando a mente due o tre categorie sai già se stanno insieme in una pagina, invece di provare il `+` a tentativi.
  - **`110/100mm` sul separatore** — quanto era piena la pagina che si **chiude** lì (non quella che inizia): è il numero che dice se hai tagliato troppo presto (pagina mezza vuota) o troppo tardi.
  - **`⚠ 150mm` in rosso** quando una **singola** categoria supera la pagina: caso in cui nessuna interruzione può aiutare e l'unica strada è ridurre altezza righe o testo. Prima ti saresti accanito col `+` senza capire perché non cambiava niente.
  - In fondo: `340mm di contenuto, 4 pagine nel caso migliore` — il minimo teorico contro cui misurare la disposizione attuale.
  - Se la misurazione non c'è ancora (primo render) o fallisce, i numeri semplicemente non compaiono: nessun valore inventato.
- Ogni categoria come riga alta ~56px con il numero di pagina a destra
- Anteprima in miniatura di dove cade il taglio
- ✅ **FATTO — "✂ Dividi tu al posto mio"**, dentro l'avviso rosso. Era l'ultimo punto in cui l'app ti diceva che c'era un problema senza offrirti di risolverlo: *"misurato 340mm, servono 2 pagine"* e poi toccava a te indovinare dove mettere il `+`. I millimetri per calcolarlo c'erano già tutti.
  - **Riempimento sequenziale**, non ricerca della divisione "ottima": l'ordine delle categorie è quello del documento e non si può cambiare, quindi a parità di ordine il riempimento sequenziale dà già il minimo numero di pagine — e in più taglia dove taglierebbe chiunque leggendo dall'alto.
  - **Agisce solo dentro il gruppo dell'avviso premuto**, e aggiunge alle interruzioni esistenti invece di sostituirle: quelle messe a mano altrove sono decisioni dell'utente, un automatismo non le riscrive.
  - **Guardia contro la pagina bianca**: una categoria più alta di una pagina intera non genera un taglio davanti a sé quando è già la prima della pagina — traboccherebbe comunque e in più si sprecherebbe un foglio vuoto.
  - Se restano categorie che da sole non ci stanno, **lo dice**: lì nessun taglio aiuta, serve ridurre altezza righe o testo.
  - Verificato non solo che produca dei numeri ma che quei numeri **risolvano il problema**: applicati i tagli, si ricontano le pagine e nessuna sfora.
- ~~"Dividi in parti uguali"~~ → superata: parti uguali avrebbe prodotto pagine mezze vuote, il riempimento sequenziale no.
- ✅ **FATTO — "🗜 Condensa al minimo"** accanto a "Dividi". Fa la ricetta che l'utente applicava a mano (altezza righe giù, e solo se non basta il carattere), ma **misurando davvero** ogni candidato con l'iframe di stampa invece di stimare: l'altezza di una riga non è lineare nella scala. Al massimo 11 misurazioni, e a parità di pagine vince l'impostazione **meno** aggressiva.
- ✅ **FATTO — le correzioni a mano vincono.** Appena si tocca un'interruzione, l'automatismo si mette da parte per quel blocco e smette di rifare i conti; si riattiva ripremendo il tasto. Senza, al primo ricalcolo avrebbe cancellato la sistemazione dell'utente.
- ✅ **FATTO — gli avvisi non restano indietro.** La misurazione girava in background senza essere attesa mentre il menu la leggeva all'apertura: mostrava sempre i numeri di *prima* della modifica, quindi avvisi già risolti e tagli calcolati su millimetri vecchi. Ora quando la misura arriva il menu si riallinea (mai in mezzo a un gesto, e solo se i numeri sono davvero cambiati).
- ✅ **FATTO — il minimo teorico come strumento diagnostico.** Il messaggio dice quante pagine servirebbero se le categorie si potessero spezzare ovunque: se le pagine reali sono di più, la differenza è spazio perso ai confini fra categorie. Distingue due bug che altrimenti si confondono — "divide male" contro "le categorie sono davvero grosse".

### Maniglie e tocco
- ✅ **FATTO** — aree di tocco espanse con `::before`, aspetto invariato. **Non uguale per tutte**, perché ogni maniglia ha cose diverse intorno:
  - maniglie di ridimensionamento `inset: -16px` → **45px reali** (stanno sui bordi, non coprono nulla)
  - chip di trascinamento `inset: -10px -6px` → più in verticale che in orizzontale, per non mangiarsi l'angolo del blocco dove il tocco serve a selezionare
  - grip riordino pagine `inset: -8px` → **38px**, volutamente non 44: la miniatura serve anche a cambiare pagina, un'area troppo grande trasformerebbe ogni cambio pagina in un trascinamento
  - pallino di selezione pagina: **volutamente NON espanso**. Ha `position:static` scritto in linea nella versione compatta, quindi l'area si sarebbe ancorata all'antenato sbagliato creando una zona invisibile enorme e fuori posto. In modalità selezione è comunque l'intera miniatura a fare da interruttore.
  - Verificato con 17 controlli che leggono le misure reali dal CSS.
- ✅ **FATTO — maniglie solo sul blocco scelto.** Sulla pagina d'origine comparivano già solo da selezionato; sulle pagine di continuazione erano *sempre* accese, per via di un commento che sosteneva che lì "non esiste un concetto di selezionato" — non più vero da quando la selezione di una fetta viene instradata al blocco d'origine. Su un blocco lungo distribuito su quattro pagine si vedevano otto maniglie identiche su fette che non stavi toccando.
- Modalità guanti: tutto +20% (esiste già `body.glove-mode`, da estendere all'editor)

### ✅ CHIUSO — blocchi lunghi invisibili con le anteprime pagina aperte

**Causa vera: un `<style>` non è confinato al `<div>` che lo contiene.**

Le miniature delle pagine di continuazione (`miniaturaPaginaContinuazione`) scrivevano il filtro delle categorie così:

```css
table[data-categoria-index]{display:none}
table[data-titolo-tabella-blocco]{display:none}
table[data-categoria-index="2"],table[...="3"]{display:table}
```

Quel blocco finiva dentro la striscia delle anteprime, cioè **nella pagina viva**. Un foglio di stile in linea vale per l'intero documento, ovunque stia: quelle regole spegnevano ogni tabella di categoria dell'app, comprese quelle vere sul foglio. Con più miniature, l'unica riga `{display:table}` a sopravvivere era quella dell'**ultima** costruita.

Da qui, alla lettera, la frase che avevo davanti da tre giri: *«ora sia la prima che la seconda pagina sono non visibili, solo la terza e ultima lo è»*. Non era un indizio fra tanti: era la firma esatta del meccanismo.

**Correzione**: ogni selettore parte dal contenitore di quella miniatura. L'ancoraggio è un `data-mini-ambito`, non un `id`, perché `neutralizzaIdentificatoriMiniatura` riscrive gli `id` delle miniature e avrebbe rinominato anche quello, rimettendo le regole in circolo. È la stessa tecnica che `applicaInterruzioniPaginaManualiCategoria` usava già correttamente — il precedente era in casa.

**Verificato nel DOM, non a parole**: un test jsdom costruisce canvas + striscia, riproduce il guasto con il codice vecchio (2 tabelle su 4 spente, e sono proprio le ultime due) e lo vede sparire con quello nuovo (4 su 4), controllando anche che le miniature continuino a filtrare ognuna per conto suo.

**Perché ci ho messo così tanto** — e vale la pena scriverlo, perché l'errore è di metodo, non di lettura del codice:

- Le tre misure che avevo (tabelle presenti nel DOM, `inner` di altezza 0, `overflow: visible`) sono **tutte compatibili** con "elementi presenti ma spenti". Le ho lette invece come "problema di layout" e ho cercato cinque volte chi *spostava o schiacciava* qualcosa.
- `display:none` non lascia tracce nella geometria: un elemento spento e un elemento collassato hanno gli stessi numeri. La diagnostica misurava rettangoli, cioè guardava esattamente dove il difetto non poteva vedersi.
- **Il dato che avrebbe chiuso il caso al primo colpo era una riga sola**: `getComputedStyle(tabella).display`. Non l'ho mai stampato.
- L'utente ha ripetuto tre volte che il problema riguardava l'apertura della striscia. Avevo trattato la striscia come *concomitanza* (ruba spazio, sposta il bordo) invece che come *causa diretta* (costruisce qualcosa che agisce a distanza).

Il sintomo storico, per riferimento: aprendo la striscia delle anteprime, Allegato Formule e Tabella Dettagliata diventavano un rigo sottile. Su desktop **e** su mobile.

**Cosa sappiamo per certo** (dal referto `[diag flowable]` sul guasto reale, non per ipotesi):

- Le tabelle **sono nel DOM** (4 su 4) → non è il filtro delle categorie.
- L'intervallo di categorie è **identico** aperto o chiuso (`0..3`) → non è il calcolo dei tagli.
- `inner: 0x493` dentro un `body: 579x501` → il contenitore del contenuto ha **altezza zero e larghezza giusta**.
- `blocco top/bottom: -15041/-15041` → spedito fuori schermo.
- `overflow: visible` ovunque → non è un ritaglio.

**Le cinque piste sbagliate** (ognuna con una correzione che non ha risolto — tutte cercavano *chi sposta o schiaccia*, mentre il difetto *spegneva*):

1. Spazio rubato dal cassetto delle anteprime → reso sovrapposto.
2. Filtro categorie che svuota il blocco → rete di sicurezza (non scattava mai: le tabelle c'erano davvero).
3. Miniature che rubano `id`/`data-block-id` alle ricerche → attributi rinominati. **Era il vicino di casa del colpevole**: giusta l'intuizione che le miniature interferissero col canvas, sbagliato il canale — non le ricerche JS, il CSS.
4. `#templateEditorRowsWrap` compresso (`flex:1 1 auto` → `1 0 auto`).
5. Animazione FLIP che scrive `scale(x, 0)` → guardia sulle misure degeneri + pulizia della trasformazione.

Le correzioni 1, 4 e 5 sono comunque state tenute: sono migliorie a sé, non rattoppi di questo bug.

### Canvas
- ✅ **FATTO — cursore di zoom** al posto dei tasti "+"/"−" (*"fanno tanto Win98"*): due tasti a scatti obbligavano a tocchi ripetuti per un cambiamento che è continuo per natura. "Adatta" resta perché è un'**azione**, non una misura — riporta allo zoom calcolato sulla finestra, che non è un numero fisso. Il cursore segue lo zoom da qualunque strada arrivi (rotella, pinch, "Adatta", doppio tocco, resize), tranne mentre lo si trascina.
- ✅ **FATTO — zoom minimo dal 20% al 45%.** Sotto quella misura il foglio non si legge, e per il colpo d'occhio sull'intero template ci sono già le miniature. Il vecchio 20% restava raggiungibile solo col pinch, quindi era anche una via per finire in uno stato da cui si usciva solo con "Adatta".
- ✅ **FATTO — doppio tocco sul foglio = adatta alla larghezza.** Diverso da "Adatta", che fa entrare anche l'altezza e rimpicciolisce molto di più: mentre lavori su un blocco vuoi la pagina larga quanto lo schermo e scorrere in verticale. Riconosciuto a mano e non con `dblclick`, che sul telefono arriva tardi e non sempre; servono due tocchi vicini nel tempo **e** nello spazio, altrimenti due tocchi mentre scorri passerebbero per uno.
- ✅ **FATTO — anello di selezione persistente.** Prima il blocco selezionato si riconosceva solo da maniglie e targhetta, che su mobile finiscono spesso sotto il pannello dei comandi: stavi regolando qualcosa senza vedere su cosa. Disegnato con `outline` e non con `border`, perché un bordo occupa spazio e farebbe ballare il blocco (e l'intera riga) nel momento in cui lo selezioni.

### Coerenza generale
- Interruttori al posto delle checkbox
- ✅ **In parte fatto — unità accanto ai campi.** Ogni controllo numerico dichiara la sua unità (mm, pt, px, %) fuori dal campo, come etichetta: dentro sarebbe testo da cancellare a ogni riscrittura. Resta da fare per i campi che non passano dal componente.
- Un nome per concetto ("Dimensione" ovunque, non Zoom/Altezza righe/Dimensione testo)
- "Manutenzione" → "Sistema la pagina"

### Barra del titolo dell'editor
- ✅ **FATTO — tre zone, tre pesi** (canvas di design "Barra dell'editor template", direzione A). Prima: otto comandi con lo stesso trattamento, e le misure al contrario dell'uso — 42px per "Salva come copia" e "Aa", che si aprono quasi mai, 32px per l'anteprima di stampa; fra Salva e Chiudi due pixel e un filo grigio.
  - **Fantasma** per gli attrezzi che tocchi di continuo (Annulla/Ripeti, Riquadri, schermo intero), tenuti insieme da un fondo appena accennato. **Contorno** per quello che apre qualcosa ogni tanto (Aa, Anteprima — che ora ha la sua parola). **Pieno** solo per Salva.
  - **"Salva come copia" è la freccia attaccata a Salva.** Apre subito la richiesta del nome, che si può annullare: una tendina con una voce sola sarebbe stata un tocco in più per scegliere fra una cosa sola.
  - **Chiudi staccato davvero**: spazio e linea alta, non più un filo di un pixel accanto a Salva.
  - **"Nascondi riquadri" → "Riquadri"**, interruttore con lo stato acceso visibile. La parola non cambia più a ogni clic; cosa farà il prossimo lo dice il suggerimento. *Da confermare: è un cambio di parole.*
  - **Ripeti esiste** (prima c'era solo Annulla), anche da tastiera con Ctrl+Y e Ctrl/⌘+Maiusc+Z. Una modifica nuova chiude il ramo di Ripeti.
    - I due punti che usano l'annulla come rete di sicurezza — piazzamento rinunciato, affiancamento fallito — e l'annulla **con un blocco in mano** non finiscono in Ripeti. Altrimenti ripetere avrebbe rimesso un blocco scavalcando il controllo sullo spazio, o fatto sparire quello che avevi in mano. In più lasciano la cronologia di Ripeti esattamente com'era prima.
  - **Niente più `style=""` in linea sui bottoni**: la modalità guanti ora raggiunge anche Salva, che restava a 32px.
  - Su mobile restano Annulla/Ripeti, Salva (senza "Template"), ⋮ e Chiudi; il resto è nel menu "altro".
  - Verificato con `test/barra_titolo_editor.js` (gira senza jsdom) e nell'app vera.

### Fuori dall'editor (raccolte per non perderle)
- ✅ **FATTO — zoom di sistema riattivato** (`user-scalable=no` → `yes`, tetto al 500%). Si poteva fare senza rompere nessun gesto perché il pinch del browser parte solo dove `touch-action` lo consente: `*` è `manipulation` (pinch sì, doppio-tocco-per-ingrandire no — sulla schermata del contatore due tocchi rapidi devono restare due colpi), il canvas dell'editor è `pan-x pan-y` quindi il pinch a due dita resta lo zoom dell'editor, maniglie e tela da disegno sono `none`.
- ✅ **FATTO — e c'era un difetto vero, non solo bersagli piccoli.** Undici bottoni `.btn-icon` avevano `width:36px` scritto **nell'attributo `style`**. Uno stile in linea vince su qualunque regola del foglio, quindi vinceva anche su `body.glove-mode .btn-icon { width: 58px }`: **la modalità guanti ingrandiva 58 bottoni su 61 e saltava proprio quelli del Registro Misurazioni**, cioè la schermata che si usa col guanto. Nove sono passati a una classe `.btn-icon-sm` (stessi 36px identici a vedersi, ma ora la modalità guanti li raggiunge); i due rimasti — il ⋮ da 26px e la ℹ️ da 22px — restano piccoli di proposito perché stanno in liste fitte.
  - Aree di tocco portate a 44px senza toccare l'aspetto: comandi del registro 36→44, risalita della barra di stato 34→44, note rapide di cantiere 28→44, ⋮ dello strato 26→44 (in altezza; in orizzontale solo 6px, per non rubare il tocco alla freccia che dista 8px).
  - Il **lucchetto del contatore** è stato lasciato com'è di proposito: è un tieni-premuto che comprime la card, ed è deliberatamente difficile da premere per sbaglio. Allargarlo avrebbe lavorato contro il suo scopo.
  - 41 controlli che leggono le misure reali dal CSS, incluso il vincolo opposto: nessuna area che invada il vicino.
- Pulsanti principali entro il raggio del pollice (terzo inferiore dello schermo). **Misurato, e la voce vale meno di come suonava**: in cima ci sono solo azioni secondarie (Esporta, Impostazioni, linguette delle prove), ed è giusto che stiano lì. L'unico vero candidato sono **+1 / −1**, a metà schermo. Per scendere devono passargli sopra le note rapide, e lì c'è il conflitto: si guadagna pollice ma si allontana il numerone dei colpi dal tasto che lo incrementa. Decisione rimandata al campo.

### Anteprime pagina — chiusura al tocco fuori (desktop)

✅ **FATTO.** Su mobile toccare fuori chiudeva già il cassetto delle pagine; su desktop la striscia restava espansa finché non ritrovavi il bottone. Stesso gesto, due comportamenti diversi.

Ora è lo **stesso helper** (`chiudiAlToccoFuori`) con le stesse cautele: chiude solo per un tocco fermo — meno di 10px di movimento e meno di 600ms — quindi scorrere il foglio, trascinare un blocco o afferrare una maniglia non la chiudono. Gli stati sotto restano diversi (`drawer-open` su mobile, `pagesStripExpanded` su desktop) perché sono due cose diverse: là un pannello che si apre, qua una striscia sempre presente che si espande.

Esclusi dal "fuori": la striscia stessa, la barra degli strumenti, il menu di un blocco e la barra di spostamento — chiudere le anteprime mentre regoli un cursore sarebbe un effetto collaterale che nessuno ha chiesto.

Nel farlo ho estratto `impostaAnteprimePagineEspanse`: la parte delicata non è cambiare il flag, è la coda — rimisurare lo zoom, riportare lo scorrimento in cima, rilanciare l'animazione. Con due chiamanti, due copie di quella coda sarebbero due posti in cui dimenticare una correzione.
