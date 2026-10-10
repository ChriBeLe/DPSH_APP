# Piano — Dal conteggio al report: flusso, parametri, template e Word

> Scritto il 09/10/2026. **Solo piano, nessuna modifica all'app.**
> Nasce dalla richiesta dell'utente: togliere bug e vicoli ciechi tra i menu, curare estetica e
> soprattutto usabilità. Il lavoro copre l'intero percorso **conteggio → strati → parametri
> avanzati → template del report → consegna**. Per i template contano i margini, un'intestazione
> con testo formattato (RTF) e un .docx che sembri scritto in Word. Le tavole 2D e 3D entrano
> nel report come capitolo dopo le prove.
> La portabilità sul telefono resta. Cosa togliere dal telefono si decide dopo (§7).
>
> Ogni affermazione sul codice qui sotto è stata controllata nei sorgenti (`file:riga`).
> Valgono le regole di `PIANO_RIARCHITETTURA.md` §3 e §5: prima il prototipo, poi il codice;
> passi piccoli con test; si dichiara il peso prima di un lavoro grosso.

---

## 1. In breve

1. **Il percorso non ha un filo.** Ogni tappa finisce in un messaggio o in un toast, e nessuno
   dice qual è il passo dopo. Le tappe sono: riconoscere gli strati, dar loro un nome, scegliere
   i parametri, scegliere il template, esportare. Tre punti sono vicoli ciechi veri (§2).
2. **I parametri avanzati lavorano solo sulla prova aperta**, anche se gli strati e le scelte
   sono del progetto. Si aprono anche dalla schermata Progetto, ma calcolano sull'ultima prova
   aperta.
3. **Il .docx è una fotocopia del PDF, non un documento Word.** In Word si vede subito:
   - modalità compatibilità;
   - margine superiore di pochi millimetri;
   - intestazione nel corpo del testo, non nell'intestazione di Word;
   - un'interruzione di sezione per ogni pagina;
   - nessuno stile «Titolo 1».
4. **L'intestazione è un'immagine più una riga di testo semplice** a 10 px fisso. È incollata a
   3 mm dal bordo del foglio e si imposta pagina per pagina. Niente testo formattato.
5. **I margini non si comportano come in Word:**
   - si scelgono con cursori in millimetri;
   - i valori predefiniti (14/12 mm) sono lontani da quelli di Word;
   - un'intestazione alta allarga da sola il margine superiore, quindi il numero che vedi non
     è quello che ottieni.

---

## 2. I vicoli ciechi del percorso (controllati nel codice)

| # | Dove | Cosa succede | Gravità |
|---|---|---|---|
| F1 | «Riconosci strati» (`062_…js`, `finalizeAutoStratiApplication`) | Crea strati e li applica, poi un toast: «i contatti si affinano dal grafico». Gli strati nuovi hanno nomi generici. **Il nome decide il comportamento litologico** (`categorieDiTesto(strato.name)`), quindi decide quali parametri si possono calcolare. Nessun passo «dai un nome agli strati». | 🔴 |
| F2 | Procedura guidata e card dei parametri (`017_…js:183`, `016_…js:47`) | Per uno strato senza intervalli **in questa prova** il messaggio è «assegna la litologia agli intervalli nella scheda "Prova"», ma nessun tasto porta lì. | 🔴 |
| F3 | Progetto → «Strati» (`022_…js:463` → `openStratiModal`) | Calcola su `state.logs`, cioè sull'**ultima prova aperta**, senza dirlo. In un progetto con 5 prove i valori e i candidati che vedi sono quelli di una sola prova. | 🔴 |
| F4 | Gestione dei dati litologici (`06_modalStrati.html`) | In testa ci sono due spiegazioni a scomparsa, prima del contenuto (era già D3 nell'analisi). L'**export dei parametri** sta in una sezione a scomparsa in fondo, doppione della Consegna. Le finestre si impilano su tre livelli: Strati → Archivio → Modifica voce (38 KB di markup). | 🟠 |
| F5 | Quattro strade per la stessa scelta | Card dello strato (`openEditParamsModal`), «Configurazione guidata», «Compila automaticamente» e la vista di elaborazione: scrivono tutte su `strato.parametriAvanzati`. Non si capisce quale usare né quando hai finito. | 🟠 |
| F6 | Dopo i parametri | Nessun «e ora?». Il template di ogni prova si sceglie dentro «Esporta PDF», con tendine larghe 108 px (`045_…js:75,91`). L'editor dei template sta in Libreria. Il capitolo introduttivo si accende solo da lì. | 🟠 |
| F7 | Procedura guidata | Le schede degli strati tagliano il nome a 17 caratteri. Il conteggio «3/5» non distingue i parametri tipici da quelli facoltativi (pallini). «Continua» compare o sparisce secondo regole che l'utente non vede. | 🟡 |

---

## 3. Margini, intestazione e Word (controllati nel codice)

| # | Dove | Cosa vede il tuo capo aprendo il .docx | Gravità |
|---|---|---|---|
| W1 | `071i_export-word.js:806–829` | **Layout › Margini: superiore di pochi millimetri.** Il margine superiore di Word è calcolato dalla posizione del logo (`topPagina`), perché l'intestazione è disegnata nel corpo. Con un doppio clic in alto non si apre l'intestazione: il logo è un'immagine nel testo. | 🔴 |
| W2 | `071i_export-word.js:882` | **«[Modalità compatibilità]» nella barra del titolo**: `compatibilityMode 14` (Word 2010), scelto per avere gli stessi a capo del PDF. | 🔴 |
| W3 | `foglioWord` / `chiusuraSezioneWord` | **Un'interruzione di sezione per ogni pagina**: si vede con ¶. La disposizione è rifatta con tabelle senza bordi e cornici (`framePr`): con «Griglia» attiva il documento è una scacchiera. | 🔴 |
| W4 | `pacchettoDocxWord` (stili) | Ci sono solo «Normale» e gli stili del sommario. **Niente «Titolo 1/2/3»**: il riquadro di spostamento è vuoto e il Sommario poggia su campi TC nascosti. La formattazione è tutta diretta, Arial 10 come predefinito. | 🟠 |
| W5 | `pacchettoDocxWord` (parti) | Mancano `docProps` (autore, titolo, date), `fontTable.xml` e il tema: File › Informazioni è vuoto. | 🟠 |
| W6 | `066_…js:993` `htmlIntestazioneNelMargine` | L'intestazione ha un'immagine e **una riga di testo semplice a 10 px fisso**: niente grassetto, colori, più righe o tre zone (logo · studio · contatti). È a `top:0` del foglio con 3 mm di respiro: **3 mm dal bordo**, dove molte stampanti non arrivano. In Word la distanza è 1,25 cm. | 🔴 |
| W7 | `028_…js:6`, `034_…html:117–161` | I margini si scelgono con quattro cursori da 0 a 40 mm, a passi di 1. I predefiniti sono 14/12 mm, mentre Word italiano usa 2,5 / 2 / 2 / 2 cm. Non ci sono preimpostazioni. | 🟠 |
| W8 | `066_…js:981` `margineConIntestazione` | Se l'intestazione è più alta del margine, il margine superiore **cresce da solo**: il cursore dice 14 mm e il foglio ne usa 30. | 🟠 |
| W9 | `page.header` per pagina + «Usa per tutte le pagine» | In Word l'intestazione è del documento (o della sezione), con «Prima pagina diversa». Qui è di ogni pagina, e una pagina nuova può nascere con un'intestazione diversa. | 🟡 |
| W10 | `pgSz w:w="11906" w:h="16838"` fisso | Solo A4 verticale. Le tavole 3D (1400×860, orizzontali) non ci stanno bene (§5). | 🟠 |

---

## 4. La proposta

### 4.1 Il percorso, visibile nel Progetto

Nella schermata Progetto, sopra la lista delle prove, una riga con le cinque tappe. Ognuna dice
in che stato è e porta **al punto esatto** in cui c'è da lavorare.

```
TELEFONO (390)                         PC (≥1024): stessa riga in alto, la tappa apre a destra
┌──────────────────────────────────┐
│ ‹ Progetti   Scuola Via Roma   ⋯ │
├──────────────────────────────────┤
│ ① Prove      5 prove · 2 avvisi ›│   ← avvisi pre-export
│ ② Strati     6 · 1 senza nome    ›│   ← apre «Dai un nome»
│ ③ Parametri  4/6 strati completi ›│   ← apre il primo strato da completare
│ ④ Report     Classico · 3 capitoli›│   ← scaletta del documento
│ ⑤ Consegna                       ›│
├──────────────────────────────────┤
│ Prove …                           │
└──────────────────────────────────┘
```

Regola per tutti i messaggi «vuoti» (F2, F3 e simili): **ogni messaggio che dice cosa manca ha
il tasto che ci porta**, ad esempio «Assegna gli intervalli» apre la prova sul grafico con le
maniglie degli strati.

### 4.2 Strati

- **Dopo «Riconosci strati» non un toast, ma un foglio «Dai un nome agli strati»** (F1). Ha una
  riga per strato con profondità, colori e nome. Mentre scrivi compaiono le voci
  dell'archivio: un tocco prende nome, colore, retino e parametri preferiti. In fondo, «Avanti:
  parametri».
- **Gli strati sono del progetto, e si vede.** «Strati del progetto» mostra per ogni strato in
  quali prove compare e a che profondità (strati × prove). Dalla riga di uno strato: «Apri nella
  prova N».
- Gestione dei dati litologici: il contenuto va in cima. Le spiegazioni passano dietro una «?».
  L'export dei parametri si toglie da qui e resta solo nella Consegna, che c'è già (F4).
  L'archivio si apre come pagina e non come terzo livello di finestra.

### 4.3 Parametri avanzati: una sola superficie, per progetto

Una superficie al posto delle quattro strade di F5. Sul PC è una tabella, sul telefono la
procedura guidata ripensata. Entrambe scrivono sugli stessi dati di oggi
(`strato.parametriAvanzati`), quindi **nessuna migrazione**.

- **Calcola su tutte le prove del progetto** in cui lo strato compare (F3). Per ogni candidato
  si vedono i valori prova per prova, affiancati, e la media o l'intervallo. La scelta
  dell'autore resta per strato, come oggi (decisione Q).
- **In cima: «Accetta i consigliati (★)» come azione principale.** Poi si rivedono solo le
  categorie con un avviso (non tipica, rischio carbonatico, nessun consigliato). Oggi
  «Compila automaticamente» è un tasto a parte, alla pari della procedura guidata.
- Uno stato chiaro per strato: «completo», «3 facoltativi senza scelta», «nessun dato nelle
  prove». Il tasto «Continua» c'è sempre: un parametro facoltativo si salta (F7).
- Il nome dello strato non si taglia più. Il comportamento litologico (chip Ghiaia, Sabbia, Limo,
  Argilla) sta in testa, perché da lì dipende cosa si calcola.

```
PC — Parametri · Strato «Sabbia limosa» (prove 1, 2, 4)
┌──────────────────────┬────────┬────────┬────────┬────────────┐
│ Angolo di attrito φ' │ Prova 1│ Prova 2│ Prova 4│            │
├──────────────────────┼────────┼────────┼────────┼────────────┤
│ ★ Road Bridge Spec.  │ 31,2   │ 32,0   │ 30,8   │ ● scelto   │
│   Meyerhof 1956      │ 29,5   │ 30,1   │ 29,0   │ ○          │
│   Peck-Hanson…       │ …      │ …      │ …      │ ○          │
└──────────────────────┴────────┴────────┴────────┴────────────┘
```

### 4.4 Report: la scaletta del documento

La tappa ④ apre la **scaletta**: le sezioni del documento in ordine, ognuna con il suo template
e un interruttore. Oggi tutto questo sta dentro «Esporta PDF» (F6).

```
Indice                      [Indice standard ▾]   ●
Capitolo introduttivo       [Classico ▾]          ○
Prova N° 1 … N° 5           [Classico ▾]          ●  (una riga per prova)
Tavole 2D e 3D (nuovo, §5)  [Tavole ▾]            ●  4 tavole scelte ›
Allegato formule            —                     ●
            [Anteprima]   [Modifica template]   [Imposta pagina]
```

«Esporta PDF» e «Word» nella Consegna leggono la scaletta invece di ripeterla.

### 4.5 Imposta pagina, come in Word

Una finestra **«Imposta pagina»** con le stesse schede e gli stessi nomi di Word (Margini ·
Intestazione e piè di pagina · Layout). Sostituisce cursori e spunte sparsi nella barra laterale
dell'editor (W7, W8, W9).

- **Margini in centimetri, con la virgola**, e le preimpostazioni del menu «Margini» di Word:
  - Normale: 2,5 · 2 · 2 · 2;
  - Stretto: 1,27;
  - Moderato: 2,54 / 1,91;
  - Largo: 2,54 / 5,08;
  - Personalizzati.

  I valori di Normale vanno controllati sul Word del PC dell'utente.
- **Un righello sul foglio**, come in Word, con le zone dei margini trascinabili e il valore
  scritto.
- **Il margine è quello che scrivi.** Come in Word, l'intestazione sta a una sua **distanza dal
  bordo** (predefinita 1,25 cm) dentro il margine superiore. Se non ci sta, l'editor lo dice e
  propone di alzare il margine, invece di alzarlo in silenzio (W8).
- **Orientamento per sezione** (verticale/orizzontale): serve per le tavole (W10).

### 4.6 L'intestazione con testo formattato (RTF)

- **Una per il documento, più «Prima pagina diversa»**, come in Word (decisione M). La sezione
  Tavole può averne una sua. Il contenuto per pagina di oggi passa al documento con una
  migrazione registrata. Se le pagine avevano intestazioni diverse, nessuna va persa: restano
  come eccezione sulla pagina (regola «non si perde niente», Fase 4).
- **Il contenuto è testo ricco** e si scrive con **lo stesso editor dei blocchi Testo**
  (`32_modalTplTextEditor.html`, stesso motore delle note): grassetto, corsivo, sottolineato,
  carattere, dimensione, colore, allineamento, più righe, immagini in linea (il logo).
  Ci sono tre zone (sinistra · centro · destra), come l'«Intestazione a tre colonne» di Word, e
  una riga sotto, facoltativa.
- **Campi**: Pagina, Pagine, Data, Nome progetto, Comune, Committente, Prova N°. Nel .docx
  diventano campi veri di Word (PAGE, NUMPAGES…). Lo stesso vale per il piè di pagina.
- **RTF in entrata** (decisione N):
  1. incollando da Word nell'editor la formattazione resta (caratteri, grassetto, colori,
     allineamento, immagini);
  2. **«Importa intestazione da un documento Word»**: si sceglie un .docx dell'ufficio e l'app
     ne legge intestazione e piè di pagina, immagini comprese. È il modo più sicuro di avere
     *esattamente* l'intestazione che il capo conosce;
  3. a richiesta, lo stesso da un file .rtf: solo i comandi più comuni (caratteri, stili, colori,
     allineamento, immagini PNG e JPEG).

### 4.7 Un .docx che sembra scritto in Word

Il PDF resta la replica esatta dell'anteprima. Il Word cambia strategia: da **fotocopia del
PDF** a **documento Word scritto come lo scriverebbe una persona** (decisione L).

| Oggi | Domani |
|---|---|
| Una sezione per pagina | Una sezione per orientamento; tra le pagine del template un'interruzione di pagina |
| Intestazione nel corpo, margine superiore di pochi mm | `header1.xml` / `footer1.xml` veri (prima pagina diversa con `titlePg`), margini = quelli di «Imposta pagina», distanze 1,25 cm |
| `compatibilityMode 14` | Modalità 15, senza la scritta «compatibilità» |
| Solo «Normale», tutto in formattazione diretta | Stili veri: Normale, Titolo 1–3 (dal blocco Titolo, che li dichiara già), Didascalia, Tabella; Sommario come campo TOC aggiornabile con F9 |
| Disposizione con tabelle senza bordi e cornici | Testo e tabelle che scorrono; le tabelle dei dati hanno la riga d'intestazione che si ripete; una tabella senza bordi solo dove due blocchi stanno davvero affiancati (grafico + tabella colpi) |
| Niente `docProps`, `fontTable`, tema | Le parti che Word scrive sempre: autore (dalle Impostazioni), titolo (nome del progetto), date, tabella dei caratteri, tema |
| Arial 10 predefinito | Il carattere del template (decisione O). Il PDF usa già Calibri, Cambria e Times incorporati (`00_font-incorporati.css`), quindi le misure coincidono |

Prezzo: nel Word qualche a capo può cadere in un punto diverso dal PDF. Lo si accetta in cambio
di un documento che si modifica come uno scritto a mano. Le pagine «a scheda» (dati della
prova, grafico, tabella colpi) restano composte, ma dentro il flusso.

### 4.8 Ritocchi all'editor dei template

Le voci già proposte in `INVENTARIO_EDITOR_TEMPLATE.md` (un tocco apre il menu del blocco, Sposta
· Elimina · Chiudi visibili, Su/Giù, Elimina con Annulla, «+» solo per i blocchi) restano
valide. Si fanno insieme a 4.5, perché le impostazioni della pagina escono dal «+».

---

## 5. Le tavole 2D e 3D nel report

Un capitolo **«Tavole»** dopo le prove, prima degli allegati. Chiude la voce «Sezione e vista 3D
nel report PDF» di `TERRENO_DTM.md`.

- **Stessa strada del capitolo introduttivo** (`provaSinteticaIntroduzione`, `071_…js:203`).
  Una sezione del documento con un suo template ottiene gratis fogli, intestazione, piè,
  indice, PDF e Word. Non serve una seconda impaginazione.
- **Il contenuto sono le tavole già scelte** nella finestra «Tavole» del 3D. Scelte e
  inquadrature sono già salvate nel progetto (`proj.tavole3d.regola/escluse`, `071p_…js:340`):
  - vista isometrica verso Nord e verso Est;
  - per ogni traccia, la sezione 3D e la sezione 2D.

  Le si sceglie e regola lì, e il report le usa così come sono.
- Nuovo blocco **«Tavola»** e template predefinito **«Tavole»**: una tavola per pagina, A4
  orizzontale (decisione P). Contiene titolo, immagine, sottotitolo (progetto · esagerazione
  verticale o lunghezza della traccia), legenda e cartiglio facoltativo. Le immagini si
  rendono al doppio della risoluzione di oggi (1400×860 sono circa 130 dpi su 27 cm, poco per
  la stampa).
- **Indice**: voce «Tavole» con una sottovoce per tavola.
- **Senza rete:** il terreno ombreggiato non serve, ma lo sfondo satellitare sì. Se le tessere
  non arrivano, la tavola esce senza sfondo e l'export lo dice, come fa già il Word con le mappe
  (`incorporaImmaginiWord`).
- Senza prove con GPS o senza tracce, la riga «Tavole» nella scaletta è spenta e dice perché.

---

## 6. Ordine dei lavori e peso

Ogni passo ha i suoi test (che mordono: controprova sul codice vecchio). Prima di toccare
l'interfaccia, il prototipo sulla lavagna (`PIANO_RIARCHITETTURA.md` §5.1).

| Passo | Cosa | Risolve | Peso | Dipende da |
|---|---|---|---|---|
| **A** | Prototipo sulla lavagna: percorso nel Progetto, nomina degli strati, tabella dei parametri, scaletta, «Imposta pagina», intestazione a tre zone. Telefono 390 e PC 1280 | — | piccolo | — |
| **B** | Vicoli ciechi rapidi: tasto «Assegna gli intervalli» nei messaggi vuoti (F2); «Strati» dal Progetto dice su quale prova calcola e la fa cambiare (F3, ponte verso C); export via da Gestione strati, spiegazioni dietro «?» (F4); nome intero e «Continua» sempre (F7) | F2, F3, F4, F7 | piccolo-medio | — |
| **C** | Foglio «Dai un nome agli strati» dopo il riconoscimento, con l'archivio | F1 | medio | A |
| **D** | «Imposta pagina» (margini in cm, preimpostazioni, righello, distanza dell'intestazione) e intestazione/piè a testo ricco con campi; migrazione da `page.header` | W6–W9 | **grande** | A |
| **E** | Word nativo (§4.7), compresa l'intestazione vera; «Importa intestazione da .docx» | W1–W5 | **grande** | D |
| **F** | Capitolo Tavole: blocco, template, orientamento orizzontale nel PDF e nel Word | W10, §5 | medio-grande | D (orientamento) |
| **G** | Parametri per progetto: tabella sul PC, procedura guidata rifatta sul telefono, «Accetta i consigliati» | F3, F5 | **grande** | A, B |
| **H** | Percorso nel Progetto e scaletta del report | F6, §4.1, §4.4 | medio | B, C, F |
| **I** | RTF da file .rtf (solo se N lo chiede) | — | medio | D |

**Ordine consigliato: A → B → D → E → F → C → G → H.**
- B costa poco e toglie subito i vicoli ciechi.
- D ed E sono il problema che si vede da fuori (il capo apre il Word). E poggia su D.
- F poggia sull'orientamento di D.
- G è il lavoro più lungo sull'usabilità. Viene dopo B, che intanto toglie i vicoli ciechi dei
  parametri.
- H mette il filo quando tutte le tappe esistono.

**Verifica del Word.** Nei test: XML ben formato; `header1.xml` presente; margine superiore ≥
distanza dell'intestazione; niente modalità 14; stile Titolo 1 usato; sezioni ≤ orientamenti.
A mano, per ogni passo: apertura in Word sul PC con ¶ e Griglia attivi, Layout › Margini,
doppio clic sull'intestazione, riquadro di spostamento, File › Informazioni.

---

## 7. Telefono (da decidere dopo, come richiesto)

Proposta di partenza, da rivedere quando ci arriviamo:

| Funzione | Telefono |
|---|---|
| Conta, Registro, Riconosci strati, Dai un nome | sì |
| Parametri | sì: «Accetta i consigliati» e consultazione; la tabella completa solo sul PC |
| Scaletta del report, anteprima, export PDF | sì |
| Editor dei template, Imposta pagina, intestazione ricca | in sola lettura, oppure solo i testi |
| Tavole 3D: regolazione e export | solo PC |

---

## 8. Decisioni che servono all'utente

Le lettere continuano quelle di `PIANO_RIARCHITETTURA.md` (G–K).

| # | Domanda | Proposta |
|---|---|---|
| **L** | Word: fotocopia del PDF (a capo identici) o documento Word «nativo»? | Nativo |
| **M** | Intestazione: una per il documento con «Prima pagina diversa», o pagina per pagina come oggi? | Una per il documento |
| **N** | RTF: basta incollare da Word e importare l'intestazione da un .docx, o serve anche il file .rtf? | Incolla + .docx; il .rtf solo se serve davvero |
| **O** | Carattere predefinito: quello del Word del capo (Calibri 11? Aptos 11? Times?) | Lo stesso dei documenti dell'ufficio |
| **P** | Tavole: A4 orizzontale o A3? | A4 orizzontale |
| **Q** | La scelta dell'autore di un parametro resta per strato, uguale in tutte le prove? | Sì, come oggi |

**Cosa serve dall'utente per partire:**
1. Un **.docx dell'ufficio** (anche vuoto, con la sola intestazione e i margini), come
   riferimento per margini, carattere e intestazione.
2. Uno screenshot del **problema dei margini** così come lo vedi, per essere sicuri che sia W1,
   W7 o W8 e non un altro.
3. Le scelte L–Q, anche «ok a tutte».

---

## 9. Avanzamento

L'utente ha detto di procedere in autonomia (09/10/2026). Senza il .docx dell'ufficio si usano i
valori di Word italiano. Per le decisioni L–Q valgono le proposte, da confermare.

| Data | Passo | Fatto | Test |
|---|---|---|---|
| 09/10/2026 | B (in parte) | F2, F3, F4 e la X della procedura guidata che non chiudeva; dopo «Riconosci strati» il tasto «Dai un nome» (avvio di C) | `strati_vicoli_ciechi.js` |
| 09/10/2026 | E (primo pezzo) | W1: intestazione nell'intestazione vera di Word (parte header, logo nelle sue relazioni, pagine senza intestazione con quella vuota); margine superiore vero. W2: compatibilità 15. W5: `docProps/core.xml` (titolo, lingua, date). Testo centrato in un riquadro stretto non più spostato a destra | `export_word.js` |
| 09/10/2026 | D (primo pezzo) | W7: margini in cm con la virgola, nomi e preimpostazioni di Word (Normale, Stretto, Moderato, Largo), cursore fino a 6 cm. W8: la nota dice quanto margine usa davvero l'intestazione | `margini_come_word.js` |
| 09/10/2026 | D (secondo pezzo) | «Distanza dal bordo» dell'intestazione (Word: «Intestazione: da bordo»), con «Come in Word (1,25 cm)»; senza, 3 mm come prima. Sta nei margini del template (`margins.header`), si salva con lui; nel Word diventa la distanza dell'intestazione | `margini_come_word.js` |
| 09/10/2026 | **bug dei margini** | Nel report di progetto i fogli avevano i margini PREDEFINITI (1,4 / 1,2 cm) qualunque fosse il template: solo quello superiore veniva dal template. Il contenuto però era impaginato con i margini del template: larghezze diverse tra impaginazione e stampa. Ora ogni foglio porta i quattro margini del suo template, nel PDF e quindi nel Word | `margini_come_word.js` |
| 10/10/2026 | D (terzo pezzo) | Intestazione con **testo formattato**: «Testo formattato…» apre lo stesso editor dei blocchi Testo (grassetto, colori, più righe, allineamento). Va in `page.header.html`; `page.header.text` ne tiene la versione semplice per le versioni vecchie dell'app. Nel Word grassetto e colori sono formattazione vera dell'intestazione | `intestazione_formattata.js` |
| 10/10/2026 | F | Capitolo **Tavole 2D e 3D** dopo le prove: le tavole scelte nella finestra «Tavole» del 3D, con le loro inquadrature e opzioni, due per foglio, coi margini e l'intestazione del template della prima prova; voce «Tavole» nell'indice. Si accende nell'esportazione (riga «Tavole 2D e 3D», spenta di base); senza prove col GPS la riga dice cosa serve | `tavole_nel_report.js` |
| 10/10/2026 | D (quarto pezzo) | **Importa da un Word…** (barra laterale dell'editor, sopra i margini): dal .docx dell'ufficio prende margini e distanza dell'intestazione, l'immagine e il testo dell'intestazione, il piè di pagina (una riga), lo stile del testo; prima dice cosa ha trovato. Provato col Report_Nardò_DPSH (Eurisko): 2,50 · 1,25 · 2,86 · 2,00 cm, intestazione a 1 cm, Calibri 11 con interlinea 1,5, titoli 18/12/11. Immagine **a tutta larghezza** (la fascia da bordo a bordo): nel PDF dal bordo del foglio, nel Word ancorata alla pagina coi byte originali | `importa_da_word.js` |

**Da fare dopo, nell'ordine:** il piè di pagina su più colonne (i contatti Eurisko: oggi una riga); una intestazione per documento con «Prima pagina diversa» e i campi (Pagina, Data, Progetto) nell'intestazione e nel piè di pagina; «Importa intestazione da un .docx» (D); una sezione di Word per
orientamento invece che per pagina, stili Titolo 1–3 e autore del documento (E); tavole in A4
orizzontale (F, oggi due per foglio verticale); parametri per progetto (G); percorso nel Progetto e scaletta (H).

**Annotato:** Annulla dell'editor dei template copre le pagine, non i margini né l'intestazione
accesa o spenta (era così anche prima).
