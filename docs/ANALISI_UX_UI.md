# Analisi di usabilità, UX e UI — DPSH Field Collector

> **Stato al 26 settembre 2026: solo analisi, nessuna modifica all'app.**
> Versione esaminata: `Modulo1_integrato.html` 2026.09.11 (identica a `DPSH_aggiornato_2026-09-23.html`).
>
> **Metodo.** Ho usato l'app nell'anteprima a 375×812 (telefono) e a 1280 e 1440 px di larghezza
> (desktop), con un progetto di prova da 40 intervalli. Ho aperto le schermate e le finestre
> principali e misurato dal DOM i comandi, le posizioni e le dimensioni. Ogni problema qui sotto
> è stato controllato anche nel codice. Il telefono vero, la luce del sole e i guanti non li ho
> potuti provare (vedi §7).

---

## 1. In breve

1. **Manca il livello "Progetto".** L'app ha tre concetti (Progetto → Prova → Intervallo), ma
   le schermate sono due: Home e Prova. Tutto ciò che riguarda il progetto è sparso tra il ⋯
   della card in Home, l'header della prova e la finestra Esporta della prova.
2. **Le cose di una prova stanno in sei posti diversi.** Due di questi si aprono solo con un
   gesto nascosto: la pressione lunga sul numero della prova e quella sul tasto +1.
3. **In campo ci si orienta poco e i comandi sono piccoli.** Il titolo diventa «L…», e 21
   comandi visibili su 23 sono sotto i 44 px.
4. **Su desktop l'app è un telefono al centro dello schermo**, una colonna di 600 px, e alcuni
   comandi esistono solo come gesti touch.
5. **Il linguaggio visivo si è frammentato.** Nel codice ci sono 28 dimensioni di carattere
   diverse, con il 60% degli usi sotto i 12 px, e 935 stili scritti a mano nel markup. Le
   conferme bloccano lo schermo e alcune icone sono ambigue.

La proposta (§4) è **una gerarchia a tre livelli più una Libreria**, con **una sola "scheda"
per ogni oggetto** (progetto, prova, intervallo), invece di tante finestre per singola funzione.
Sul desktop gli stessi livelli si affiancano in colonne.

---

## 2. Dove sta cosa oggi

| Concetto | Dove si trova | Come ci si arriva |
|---|---|---|
| **Prova** — località, data, N° | «Intestazione Cantiere» | tocco sul titolo dell'header (nessun segno che sia toccabile) |
| **Prova** — penetrometro, masse, βt, passo | «Impostazioni Prova» | **solo pressione lunga** (o tasto destro) sul cerchietto «1» |
| **Prova** — duplica interpretazione, elimina | dentro «Impostazioni Prova» | come sopra |
| **Prova** — falda | finestrella propria | icona goccia nella barra del Registro |
| **Prova** — GPS, foto | finestre proprie | icone nell'header |
| **Prova** — conferma intervallo | nessun tasto (di default) | **pressione lunga su +1**; il tasto CONFERMA compare solo con «Modalità Espansa» |
| **Progetto** — nome, comune, committente, data | modale di creazione | **non si modificano più** dopo la creazione |
| **Progetto** — provincia, sede committente, denominazione | dentro «Intestazione Cantiere» della prova | tocco sul titolo |
| **Progetto** — strati | «Gestione dei dati litologici» | ⋯ dell'header della prova |
| **Progetto** — note | editor note | icona nell'header della prova, **oppure** icona nella card in Home |
| **Progetto** — stato, duplica, backup, cronologia, confronta, elimina | «Azioni Progetto» | ⋯ della card, **solo dalla Home** |
| **Progetto** — report PDF/Word | riquadro «Intero progetto» | dentro «Esporta **Prova**…» |
| **Progetto** — parametri avanzati (Excel/CSV/PDF/Word) | fondo di «Gestione litologica» | ⋯ → Gestione litologica → sezione in fondo |
| **Globale** — impostazioni | cassetto laterale | in Home dal ⋯; in campo ⋯ → «Impostazioni», accanto a «Esporta questa prova» |
| **Globale** — template di report e indice | «Template di Report» | icona foglio nell'header, **solo in Home** |
| **Globale** — archivio litologico | finestra propria | ⋯ in Home, **oppure** dentro Gestione litologica |
| **Globale** — backup completo, copie automatiche | cassetto | Impostazioni |

Per **esportare o salvare** ci sono oggi sei porte: Esporta della prova, «Backup» ed «Esporta»
nel ⋯ del progetto, Backup completo nel cassetto, Parametri avanzati dentro Gestione litologica e
«Backup JSON» dentro Esporta. Per **importare** ce ne sono due: «Importa» in Home e «Importa» nel
cassetto.

---

## 3. Problemi rilevati

Gravità: 🔴 blocca o fa sbagliare · 🟠 rallenta o confonde · 🟡 rifinitura.

### A. Architettura e gerarchia

- **A1 🔴 Non c'è una schermata Progetto.** «Apri» porta subito dentro una prova. Le azioni di
  progetto (confronta, cronologia, stato, duplica) si raggiungono solo tornando in Home e
  aprendo il ⋯ della card. Le prove sono cerchietti numerati in cima: non mostrano profondità
  raggiunta, completezza (GPS, foto, falda) né avvisi. Gli avvisi pre-export ci sono («4 avvisi
  su 1 prova»), ma si vedono solo quando si apre Esporta.
- **A2 🔴 I dati di progetto e di prova sono mescolati, e alcuni sono duplicati.**
  - «Intestazione Cantiere» è un'unica finestra, ma scrive **in due posti**. Provincia, sede e
    denominazione vanno nel progetto (`scriviDatoProgettoCorrente`); committente, comune,
    località, data e N° vanno nella **singola prova** (`state.header`). A vederla non si capisce.
  - La card in Home mostra `proj.comune` e `proj.committente`, che **non si possono più
    modificare** dopo la creazione. Se correggi il committente nell'Intestazione, la card
    continua a mostrare quello vecchio. Il **nome del progetto non si può rinominare** da nessuna
    parte.
  - «Lunghezza asta» compare sia nell'Intestazione (`numHeaderLunghAsta`) sia in Impostazioni
    Prova (`numLunghAsta`).
  - Una «Nuova prova» richiede di nuovo l'intestazione intera, anche se precompilata: il Comune
    è obbligatorio, e lo si è già dato al progetto.
- **A3 🔴 Impostazioni Prova si apre solo con la pressione lunga** sul cerchietto della prova
  (600 ms) o con il tasto destro. Lì dentro stanno anche «Elimina questa prova» e «Duplica come
  interpretazione». Nessun segno lo suggerisce, e su desktop nessuno ci arriva per caso.
- **A4 🟠 Esporta confonde il perimetro.** Il titolo dice «Esporta Prova "Lecce (Prova)"», ma il
  primo blocco, quello evidenziato, è il report **dell'intero progetto**. Excel, KML e foto sono
  invece «solo questa prova». Il report per più prove e i parametri avanzati stanno altrove (A5).
- **A5 🟠 Export e backup hanno sei porte** (vedi §2). L'utente deve ricordarsi da dove si
  esporta cosa.
- **A6 🟠 Alcune impostazioni sono nel posto sbagliato o sono doppie.**
  - «Modalità Espansa» sta sotto *Accessibilità*, ma decide come si conta: mostra CONFERMA e
    ANNULLA STEP.
  - «Registro Grafico Integrato» sta sotto *Aspetto*, ma è lo **stesso** interruttore del tasto
    grafico/lista nella barra del Registro (`chkIntegratedChart` ↔ `btnToggleViewIntegrated`).
  - «Modalità Guanti» e «Modalità Espansa» servono allo stesso scopo (usare l'app in campo con
    le mani occupate) e sono in due sezioni diverse.
- **A7 🟡 I testi dei template si contraddicono.** Aperta dalla Home, dove non c'è nessuna prova
  aperta, la finestra dice «Classico — in uso su **questa prova**». Dice anche che Classico è «non
  modificabile», ma accanto c'è il tasto «Layout» per modificarlo, e il codice lo consente.

### B. Schermata di campo (telefono)

- **B1 🔴 Ci si orienta poco.** Il titolo dell'header mostra il **comune** («Lecce»), non il
  nome del progetto né «Prova N° 1». A 375 px diventa «L…», perché accanto ci sono 5 icone e un
  divisorio. L'unico indizio della prova aperta è il cerchietto evidenziato.
- **B2 🔴 Bersagli piccoli.** Su 23 comandi visibili, 21 sono sotto i 44 px:
  - cerchietti delle prove: 32 px;
  - note rapide: 28 px;
  - «Aggiungi Intervallo»: **26 px**;
  - «Aggiungi intervalli multipli»: 28 px;
  - icone del Registro: 36 px;
  - lucchetto: 34 px.

  «Modalità Guanti» li ingrandisce, ma di default è spenta.
- **B3 🔴 L'azione più importante è un gesto nascosto.** Di default si passa all'intervallo
  successivo solo tenendo premuto +1 per 500 ms. Lo spiega una scritta di 9 px («Tieni premuto =
  Avanti»). Il tasto CONFERMA esiste, ma è nascosto finché non si attiva la Modalità Espansa.
- **B4 🟠 Mentre conti non vedi gli ultimi intervalli.** Il Registro comincia a y = 592 e la
  prima riga a y = 844, cioè già **fuori da uno schermo alto 812**. In più il Registro scorre
  dentro la pagina (tetto di 480 px), parte da 0,00 m e dopo l'import resta in cima: le righe più
  recenti, le uniche che servono in campo, sono in fondo a uno scorrimento dentro l'altro.
- **B5 🟠 Tre meccanismi per lo stesso problema** (il contatore occupa spazio mentre si scorre):
  il lucchetto-maniglia (tocco, 4 secondi, poi un altro tocco o un trascinamento), la barra
  compressa e la barra di stato fissa in alto. Ognuno è sensato, ma insieme sono tanti da
  imparare.
- **B6 🟠 La barra del Registro va a capo.**
  - I comandi sono cinque: tre icone senza testo (falda, grafico, riconoscimento strati in viola)
    e due pillole di peso diverso. Su un telefono vanno a capo in tre righe.
  - La riga di istruzioni «Swipe sinistra per modifica · **Swipe destra per elimina**» va contro
    la convenzione di Android e iOS, dove si scorre a sinistra per le azioni distruttive. Su
    desktop questi gesti non esistono.
  - Un tocco sulla riga apre una scheda di **sola lettura**. Da lì «Modifica» apre una **seconda**
    finestra.
- **B7 🟡** Le note rapide scorrono in orizzontale e «Personalizzata» resta tagliata fuori.
- **B8 🟡** Il badge delle foto è una ❌ rossa quando le foto sono 0: sembra un errore. Il GPS
  mancante invece non mostra niente: stessa situazione, due linguaggi diversi.
- **B9 🟠 Le conferme bloccano lo schermo.** «Fatto — Importati con successo 40 intervalli»
  resta lì finché non tocchi OK. Nel codice ci sono 54 `alert()`. L'avviso che sparisce da solo
  (toast) esiste solo nell'editor dei template (`mostraToastTemplateEditor`).

### C. Home

- **C1 🟠 Una card dentro l'altra.** Il riquadro «I tuoi progetti» contiene le card dei progetti:
  su telefono si perdono circa 40 px di larghezza, e il sottotitolo «Seleziona un progetto…»
  ripete l'ovvio.
- **C2 🟠 Card del progetto.**
  - Si apre solo dal tasto «Apri», non toccando la card.
  - L'icona delle note è `i-file`, **la stessa** di «Template di report» nell'header; in campo le
    note usano `i-note`.
  - La data è scritta come 2026-09-26, mentre ovunque altrove è 26/09/2026.
  - «Comune: Lecce · Comune di Lecce»: il committente appare senza etichetta.
- **C3 🟡** L'header ripete i conteggi già presenti nei filtri («1 Progetti • 1 Prove Totali • 0
  Georeferenziate») e a 375 px viene troncato. Si legge anche «1 Progetti».
- **C4 🟡** Nello stato vuoto ci sono quattro tasti per due azioni: Importa e Nuovo sia in alto
  sia nel riquadro.

### D. Finestre (modali)

- **D1 🟠 Le finestre sono circa 45**, e su telefono sono riquadri centrati invece di fogli che
  salgono dal basso. Si impilano su più livelli: Gestione litologica → Archivio → Modifica voce.
  Quelle lunghe scorrono dentro l'85% dello schermo.
- **D2 🟡** Alcune hanno due modi per chiudere: la X e il tasto «Chiudi» (Esporta, Foto,
  Template).
- **D3 🟠** In Gestione litologica i primi due elementi sono spiegazioni a scomparsa («Cosa
  sono…?», «Come funzionano…?»). Gli strati, cioè il contenuto, vengono dopo.
- **D4 🟡** In Esporta ogni formato ha un colore suo (verde, blu, giallo, viola) che non vuol dire
  niente: colpisce l'occhio ma non aiuta a scegliere.

### E. Sistema visivo

- **E1 🟠 Caratteri.** Nel codice ci sono 28 dimensioni diverse. Il 60% degli usi è tra 9 e 11,5
  px: al sole, in campo, è poco.
- **E2 🟠 Stili sparsi.** Nel markup ci sono 935 attributi `style="…"`. I bottoni hanno sette
  altezze diverse (26, 28, 32, 34, 36, 40 e 42 px) e il testo delle etichette mescola le
  maiuscole: «Aggiungi Intervallo», «Aggiungi intervalli multipli», «REGISTRO MISURAZIONI».
- **E3 🟡** Nel codice ci sono 269 colori esadecimali diversi. Il viola indica sia l'archivio sia
  il riconoscimento degli strati: l'accento di funzione si mescola con quello di stato.
- **E4 🟡** Restano delle emoji nonostante il sistema di icone: 📡 nel GPS e ❌ nel badge delle
  foto.

### F. Desktop

- **F1 🔴 Il layout è solo da telefono.** `main` ha una larghezza massima di 600 px: a 1440 px
  occupa il 42% dello schermo. L'unica regola per schermi larghi è quella dell'editor dei
  template (`min-width: 761px`).
- **F2 🟠 Alcuni comandi esistono solo come gesti touch:** lo scorrimento sulle righe, la
  pressione lunga sulla prova e la pressione lunga su +1. Mancano le scorciatoie da tastiera per
  inserire i dati: oggi da tastiera ci sono solo Esc e, nell'editor, Ctrl+Z.

---

## 4. Proposta: la nuova gerarchia

Principio: **ogni oggetto ha una sola scheda, e ogni scheda ha le stesse zone.** In alto dove
sei, al centro il contenuto e un unico ⋯ per le azioni rare.

```
HOME (Archivio)                      IMPOSTAZIONI (globali)
 ├─ Cerca · filtri stato              ├─ Campo: vibrazione, bip, schermo acceso,
 ├─ card progetto (tutta toccabile)   │         «Modalità campo» (= Guanti + Espansa)
 └─ + Nuovo  · Importa                ├─ Aspetto: tema, palette
                                      ├─ Dati: spazio, copie automatiche, backup
PROGETTO  ◄── NUOVO LIVELLO           │         completo, importa, reset
 ├─ testata: nome (modificabile), stato├─ Libreria: template report, template indice,
 ├─ Prove  ← lista con prof. max,      │           archivio litologico
 │          colpi, ✓GPS ✓foto ✓falda, └─ Info e versione · Sperimentali
 │          avvisi pre-export
 ├─ Dati progetto (tutti i campi di progetto, in un posto)
 ├─ Strati
 ├─ Note
 ├─ Consegna: report PDF/Word, Excel, parametri avanzati,
 │            KML, foto, confronta prove  (scegli: una prova / tutte)
 └─ ⋯ Duplica · Cronologia · Backup · Elimina

PROVA (campo)
 ├─ testata: ‹ Nome progetto · Prova 3        [scheda] [⋯]
 ├─ Conta: contatore, +1 / −1, CONFERMA visibile, ultimi 3 intervalli
 ├─ Registro (tabella/grafico, senza scorrimento annidato)
 └─ «Scheda prova» (un solo foglio a sezioni):
        Dati (località, data, N°) · Strumento · Falda · GPS · Foto
        ⋯ Duplica interpretazione · Elimina
```

**Telefono, schermata Prova.** Si divide in due viste, **Conta | Registro**, con un selettore
in alto: in campo si guarda una cosa alla volta. Nella vista Conta:

```
┌──────────────────────────────────┐
│ ‹ Scuola Via Roma     Prova 3  ⋯ │  ← dove sei, sempre leggibile
│ [📍✓] [📷 2] [💧 1,20 m] [Scheda] │  ← stato della prova, tocco = scheda
├──────────────────────────────────┤
│   8,00 – 8,20 m     Asta 9        │
│              14                   │
│  [ −1 ]        [   +1 COLPO   ]   │
│  [ Annulla ]   [  ✓ CONFERMA  ]   │  ← visibile di default
│  Ciottoli · Cavità · Rifiuto · ✎  │  (≥ 40 px, vanno a capo)
├──────────────────────────────────┤
│ 7,80–8,00  12  ▓▓▓▓▓              │  ← ultimi 3 intervalli
│ 7,60–7,80  10  ▓▓▓▓               │
│ 7,40–7,60  11  ▓▓▓▓▓   Registro › │
└──────────────────────────────────┘
```

Questa struttura risolve B1, B3, B4 e B5. Il lucchetto e le barre compresse non servono più,
perché il Registro è una vista a parte.

**Desktop (≥ 1024 px): le colonne.** Il desktop serve soprattutto in ufficio (rielaborazione,
strati, report), quindi il registro ha il posto d'onore:

```
┌─────────────┬──────────────────────────────┬──────────────────┐
│ PROGETTI    │ Prova 3 · Scuola Via Roma     │ SCHEDA PROVA     │
│ ▸ Lecce …   │ ┌ Registro modificabile ─┐┌──┐│ Dati · Strumento │
│   Prova 1   │ │ da   a    N  Nspt Rpd  ││gr││ Falda · GPS      │
│ ● Prova 3   │ │ … celle modificabili,  ││a-││ Foto             │
│   Prova 4   │ │ Invio = riga dopo      ││fi││                  │
│ ▸ Taranto … │ └────────────────────────┘└co┘│ Strati           │
└─────────────┴──────────────────────────────┴──────────────────┘
```

Tra 761 e 1023 px: due colonne (lista e contenuto). Sotto i 761 px: il telefono descritto sopra.
Le finestre diventano **pannelli laterali** su desktop e **fogli dal basso** su telefono.

---

## 5. Interventi, dai più rapidi ai più lunghi

| # | Intervento | Risolve | Tempo | Rischio |
|---|---|---|---|---|
| **Rapidi** ||||
| 1 | Titolo dell'header «Prova N° · nome progetto»; su telefono GPS, foto e note passano sotto il titolo come «spie», così il titolo non si tronca | B1, B8 | ore | basso |
| 2 | Bersagli ≥ 44 px (cerchietti prova, note rapide, tasti del Registro) | B2 | ore | spaziature |
| 3 | Toast generale (riusa `mostraToastTemplateEditor`) al posto degli `alert` di sola conferma | B9 | ore | basso |
| 4 | Badge foto neutro (numero, niente ❌ rossa); via le emoji residue | B8, E4 | minuti | nessuno |
| 5 | Date sempre gg/mm/aaaa; «1 Progetto» al singolare; committente con etichetta | C2, C3 | minuti | nessuno |
| 6 | Togliere i doppioni: interruttore «Registro integrato» nel cassetto, «Chiudi» dove c'è la X, tasti duplicati nello stato vuoto, «Lunghezza asta» nell'Intestazione | A2, A6, C4, D2 | ore | basso |
| 7 | Card del progetto tutta toccabile; icona note = `i-note` | C2 | minuti | nessuno |
| 8 | Correggere i testi dei template («questa prova» in Home, «non modificabile») | A7 | minuti | nessuno |
| **Medi** ||||
| 9 | **Scheda prova unica** (Dati · Strumento · Falda · GPS · Foto · ⋯) da un tasto visibile; la pressione lunga resta come scorciatoia | A2, A3 | 1–2 giorni | medio |
| 10 | **Dati di progetto modificabili** in un posto solo (nome compreso); l'Intestazione della prova tiene solo i dati della prova | A2 | 1 giorno | medio (migrazione dei campi) |
| 11 | Vista **Conta \| Registro** con gli ultimi 3 intervalli sotto il contatore; Registro senza scorrimento annidato; via lucchetto e barre doppie | B4, B5 | 2 giorni | medio |
| 12 | Righe del Registro: un tocco apre la scheda **già modificabile**; scorrimento a sinistra = azioni (elimina con annulla); menu ⋯ per riga su desktop | B6, F2 | 1 giorno | basso |
| 13 | Impostazioni riordinate (Campo / Aspetto / Dati / Libreria / Info); «Modalità campo» unica | A6 | ore | basso |
| 14 | **Consegna unica** con scelta «questa prova / tutto il progetto», compresi i parametri avanzati | A4, A5 | 1–2 giorni | medio |
| 15 | Finestre come fogli dal basso su telefono; spiegazioni in fondo o dietro una «?» | D1, D3 | 1–2 giorni | medio |
| **Lunghi** ||||
| 16 | **Schermata Progetto** (lista delle prove con completezza e avvisi) | A1 | 3–5 giorni | medio |
| 17 | **Layout desktop a colonne** e registro modificabile da tastiera | F1, F2 | 1 settimana | medio |
| 18 | **Regole di stile comuni** (design token): scala dei caratteri (12 · 14 · 16 · 20 · 28 + contatore), 3 altezze di bottone (36 · 44 · 56), spaziature a passi di 4; si migrano gli stili scritti a mano un po' alla volta, schermata per schermata | E1, E2, E3 | continuo | basso se fatto a pezzi |

L'ordine consigliato: prima 1–8, tutti insieme, per un effetto immediato e a rischio basso. Poi
9 e 10, che sciolgono il nodo progetto/prova. Poi 16, che ne è la conseguenza naturale. Poi 11,
12 e 14. Il 17 alla fine, quando la gerarchia è stabile. Il 18 si fa man mano: ogni schermata
toccata nei passi precedenti si allinea alle regole comuni.

---

## 6. Decisioni che servono a te

- **G. Il tasto CONFERMA visibile di default?** Io direi di sì: la pressione lunga resterebbe come
  scorciatoia. Se hai scelto apposta di nasconderlo, ad esempio per evitare tocchi accidentali,
  si lascia com'è e si rende più visibile la spiegazione.
- **H. «Apri» il progetto porta alla schermata Progetto o direttamente all'ultima prova?**
  Proposta: porta alla schermata Progetto, con un tasto grande «Riprendi Prova 3».
- **I. A cosa serve il desktop?** Se serve all'ufficio (strati, report), il layout del §4 va
  bene. Se si conta anche da PC, per esempio trascrivendo da carta, conviene prima il registro
  modificabile da tastiera (#17).
- **J. Ordine del Registro:** le righe più recenti in alto in campo, e dall'alto in basso per
  profondità su desktop e nei report?
- **K. Tema chiaro automatico all'aperto?** Ad esempio seguendo il tema del telefono. Oggi il
  tema scuro è il predefinito e in pieno sole si legge peggio.

---

## 7. Cosa non ho potuto verificare

- **Telefono vero e APK:** luce diretta, guanti, tastiera virtuale che copre i campi, tasto
  «indietro» di Android.
- **Tema chiaro:** l'ho letto solo nel codice; le schermate le ho viste solo nel tema scuro.
- **Editor dei template e delle note:** non li ho rivisti in profondità, perché hanno già un
  lavoro dedicato (`Design_Mobile_Editor_Template.md`, `Piano_Note_*.md`).
- **Dati di prova nell'anteprima:** il progetto «Lecce - Scuola Via Roma» creato per questa
  analisi è ancora nella memoria locale del browser dell'anteprima. Non è sul telefono.
