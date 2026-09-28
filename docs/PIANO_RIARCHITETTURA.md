# Piano di riarchitettura — DPSH Field Collector

> Scritto il 26/09/2026. Parte da `docs/ANALISI_UX_UI.md` e dalle decisioni prese quel giorno.
> Ogni fase la esegue un agente diverso, **una dopo l'altra** (lavorano sugli stessi file).
> Il coordinatore (la sessione principale) prepara la fase, poi rivede, collauda e unisce il
> lavoro. Solo dopo parte la fase successiva.

---

## 0. Cosa è questo software, e perché l'ordine delle fasi è questo

L'app segue **l'intera prova**: acquisizione in campo, elaborazione (strati, parametri avanzati)
e consegna (report, Excel, KML). Quindi un dato perso o alterato non è un difetto estetico: è
una prova da rifare. Per questo le prime due fasi mettono in sicurezza i dati e il loro
trasporto, prima di spostare anche un solo bottone. Le fasi successive cambiano la struttura
dell'interfaccia e poggiano su quelle fondamenta: se una fase di interfaccia deve cambiare il
formato dei dati, usa il meccanismo di migrazione della Fase 1.

## 1. Decisioni dell'utente (26/09/2026) — valgono per tutte le fasi

| # | Decisione |
|---|---|
| G | Il tasto **CONFERMA è visibile di default**. Se l'utente lo nasconde, la scelta **resta memorizzata**. Quando è visibile deve essere evidente che **registra l'intervallo** (es. «✓ Registra 8,00–8,20 m»). *Nota di linguaggio: l'utente ha detto «aggiunge uno strato». Nell'app "strato" è lo strato litologico, mentre CONFERMA registra un **intervallo**: usare "intervallo" nell'interfaccia.* |
| H | **«Apri» porta all'ultima prova usata** del progetto, per riprendere subito in campo. La schermata Progetto esiste lo stesso e si raggiunge dalla testata della prova («‹ Nome progetto»). |
| I | **Il desktop serve alla post-produzione**: parametri avanzati degli strati, template di report, report e consegna. Il progetto deve **passare facilmente dal telefono al PC** (stessa app, forma ottimizzata per PC). I colpi si inseriscono anche dal PC, ma **non con il contatore**: si usa «Aggiungi intervalli multipli», anche per un solo intervallo. |
| J | **L'ordine del Registro non si cambia.** Al massimo si aggiunge un comando per invertirlo (scelta memorizzata). |
| K | Il tema non è una priorità: nessun lavoro dedicato. |
| — | Già decise in passato e ancora valide: «Condividi» è stato tolto apposta (non reintrodurlo), il salvataggio su cloud è sospeso, niente service worker (l'app sta dentro l'APK), niente allarme automatico di rifiuto né valori predefiniti per le prove nuove. |

## 2. Come è fatto il progetto (dalla Fase 0)

- `src/` contiene i sorgenti, divisi in pezzi. `src/ordine.txt` dice in che ordine si
  concatenano. `python build.py` scrive `dist/DPSH.html`, il file unico per l'APK e per il
  browser del PC. La build **concatena e basta**.
- **Tutti i `src/js/*.js` sono frammenti di UNA sola funzione** e condividono lo stesso ambito:
  non sono moduli. Un nuovo pezzo va aggiunto a `ordine.txt` nel punto giusto. Se usa funzioni
  o `const` di altri pezzi, deve venire dopo di loro, oppure usarli solo dentro funzioni
  chiamate più tardi: per le `const`, vedi la TDZ.
- `python build.py --mappa N` dice in quale pezzo sta la riga N di `dist/DPSH.html`. Serve
  quando un errore del browser indica una riga.
- `docs/MAPPA_CODICE.md` elenca cosa definisce ogni pezzo. Si rigenera con
  `python tools/mappa_codice.py`.
- **Test:** `npm test` (build + tutte le suite, con jsdom 30). Le suite estraggono le funzioni
  vere da `dist/DPSH.html`. `test/base_attesa.json` elenca le suite già rosse prima della
  riarchitettura: una rossa **nuova** è una regressione e blocca la fase.
- Node: `C:\Program Files\nodejs` (Node 24, npm). Python 3.13 è nel PATH.
- `riferimento/Modulo1_integrato_2026-09-11.html` è l'originale intoccato, per i confronti.

## 3. Regole per chi esegue una fase

1. **Leggi prima:** `README.md`, questo piano (la tua fase e le sezioni 1–3),
   `docs/ANALISI_UX_UI.md` e `docs/MAPPA_CODICE.md`. Guarda gli esiti delle fasi precedenti in
   `docs/fasi/`.
2. **Git:** parti da `main` aggiornato e lavora su un ramo `fase-N-nome`. Fai commit piccoli,
   un passo per commit, con il messaggio in italiano. Non fondere in `main`: lo fa il
   coordinatore.
3. **Prima di toccare:** `npm test` per vedere la base. **Dopo ogni passo:** `npm test`. Zero
   regressioni.
4. **Ogni comportamento nuovo o corretto ha il suo test** in `test/`, e la suite deve mordere:
   una controprova mostra che il test fallirebbe sul codice vecchio. Per i dati servono le
   fixture in `test/dati/`.
5. **Dati salvati:** non cambiare mai la forma di ciò che finisce in memoria o nei file
   esportati senza una **migrazione registrata** (Fase 1), un test che parte dal formato vecchio
   e la conferma che il file vecchio si importa ancora.
6. **Operazioni distruttive** (elimina, sostituisci, ripristina, importa sopra): copia prima
   (`copiaPrimaDi`), conferma esplicita e annulla dove possibile. Foto e immagini delle note si
   cancellano solo passando da `idFotoAncoraInUso()` / `idImmaginiNoteAncoraInUso()`.
7. **Verifica nel browser:** dopo la build apri `dist/DPSH.html` (anteprima `dpsh-app`, porta
   8744) a **375×812** e a **1280×800**. Le schermate del pannello a volte scadono: verifica
   dal DOM e ripeti lo screenshot. Usa i dati di prova, mai quelli veri dell'utente.
8. **Lingua e stile:** interfaccia e commenti in italiano, come il codice esistente. I commenti
   spiegano il *perché*. Niente emoji nell'interfaccia: usa il sistema di icone `#i-…`.
9. **Non chiedere all'utente:** se incontri una decisione non coperta da questo piano, scegli
   l'opzione più prudente, reversibile e che non perde dati. Scrivila nell'esito come
   «decisione presa, da confermare».
10. **Alla fine:** rigenera la mappa, aggiorna `APP_VERSIONE` se il comportamento visibile è
    cambiato (formato `AAAA.MM.GG`) e scrivi `docs/fasi/FASE_N_ESITO.md`: cosa è fatto, cosa no
    e perché, i test aggiunti, cosa va provato **sul telefono**, i dubbi.

---

## 4. Le fasi

### Fase 0 — Cantiere pulito ✅ (fatta dal coordinatore il 26/09/2026)
Copia pulita, sorgenti divisi in 125 pezzi (ricostruzione **identica byte per byte**
all'originale), build, git, test eseguibili qui (24/34 verdi, le 10 rosse sono già note) e
mappa del codice.

### Fase 1 — Affidabilità dei dati ✅ (unita in `main` il 27/09/2026)
Esito: `docs/fasi/FASE_1_ESITO.md`. 40/40 suite verdi, verificata dal coordinatore anche nel
browser (dati rovinati di proposito: non sovrascritti, avviso e barra fissa). Punto 7 escluso
dall'utente («internet non è un problema»). Il punto 6 è solo valutato: raccomandazione di
togliere prima dallo stato le immagini incorporate (migrazione 1→2), da decidere più avanti.

Obiettivo: nessuna situazione in cui l'app perde o altera dati senza dirlo.

1. **Rimettere in verde le 10 suite rosse** (`test/base_attesa.json`). Per ognuna, stabilisci se
   è il test a essere rimasto indietro (lo aggiorni) o l'app a essere sbagliata (lo scrivi
   nell'esito e lo correggi solo se è un difetto evidente). Svuota `giaRosse`.
2. **Caricamento sicuro.** Oggi `loadState` (in `004_…`), se il JSON salvato non si legge, lo
   ignora: l'app parte vuota e il primo `saveState` **sovrascrive** i dati ancora recuperabili.
   Correzione: in quel caso il testo originale viene messo al sicuro (in IndexedDB e/o in una
   chiave di quarantena), l'app **non salva sopra** e l'utente vede un avviso chiaro. L'avviso
   offre di ripristinare dall'ultima copia automatica o di scaricare il testo grezzo.
3. **Versione dello schema e migrazioni registrate.** `state.versioneSchema` è un numero intero.
   Ogni migrazione è una funzione che va da N a N+1, elencata in un registro unico, e parte
   dopo aver fatto una copia automatica «prima di aggiornare i dati». La logica di
   `migrateLegacyState` diventa la migrazione 0→1. Lo stesso meccanismo si applica ai file
   importati (JSON e ZIP) di versioni vecchie. Un file di versione **più nuova** di quella
   dell'app si rifiuta con un messaggio chiaro, senza importarlo a metà.
4. **Controllo di integrità** (`verificaIntegrita(state)`), eseguito dopo il caricamento, prima
   di un export e prima di un import. Controlla:
   - che gli intervalli siano contigui e ordinati, con colpi interi ≥ 0;
   - che ogni prova abbia un progetto e che non ci siano id duplicati;
   - che le foto citate esistano;
   - che gli strati assegnati esistano.

   Le anomalie si **segnalano** e non si correggono da sole, salvo i casi banali e sicuri:
   quelli si registrano.
5. **Tracciabilità degli intervalli.** Ogni intervallo registra `registratoIl` (data e ora) e
   `origine` (`contatore` | `inserimento-multiplo` | `modifica-manuale` | `import`). Una
   modifica aggiunge `modificatoIl`. Gli intervalli vecchi restano senza questi campi: la
   migrazione non inventa date. Questo resta nei dati e nel JSON, ma **non** nel report.
6. **Salvataggio verificato.** Dopo `localStorage.setItem` si rilegge e si confronta la
   lunghezza, come fa già `salvaFotoConGaranzia` per le foto. Valuta, **senza farla in questa
   fase**, la migrazione dello stato principale da localStorage a IndexedDB. Scrivi
   nell'esito pro, contro e rischi, con una raccomandazione.
7. **Librerie Excel offline.** `xlsx` ed `exceljs` oggi arrivano da una CDN (`shell/01_head.html`):
   in campo, senza rete, l'export Excel fallisce. Vanno incorporate come `src/vendor/` (versioni
   identiche) e caricate dal file. Verifica che il peso resti accettabile e annotalo.
8. **Fixture:** `test/dati/` con uno stato realistico nel formato di oggi: 2 progetti, 5 prove,
   strati con parametri, note con un'immagine, una prova interpretazione «3B». Servono anche
   un file JSON e uno ZIP esportati dall'app di oggi. Tutte le fasi successive le usano.

### Fase 2 — Passaggio telefono ↔ PC ✅ (unita in `main` il 27/09/2026)
Esito: `docs/fasi/FASE_2_ESITO.md`. 44/44 suite. Verificata dal coordinatore nel browser: giro
telefono → PC su due origini con foto e GPS, zero differenze e foto con lo stesso SHA-256; il caso
«più recente sul PC» avvisa in giallo e consiglia Tieni entrambi.

Obiettivo (decisione I): portare un progetto dal telefono al PC e ritorno, senza perdite e senza
dubbi su quale sia la versione buona.

1. **Pacchetto di progetto** (ZIP), con un `manifest.json` che contiene:
   - versione dello schema e dell'app;
   - id e nome del progetto;
   - data di esportazione e dispositivo, cioè un'etichetta scelta una volta nelle impostazioni
     («Telefono», «PC ufficio»);
   - elenco dei file con dimensione e **SHA-256**.

   **È la COPIA ESATTA del progetto** (richiesta dell'utente, 26/09/2026): tutto ciò che serve
   perché sull'altro dispositivo il progetto sia identico, report compreso:
   - prove con GPS (coordinate, precisione, altitudine) e ogni altro campo, anche quelli che
     l'app di oggi non usa;
   - foto con i **byte originali** (mai ricompresse, EXIF intatti) e il loro record (coordinate,
     fonte GPS, ora);
   - note con le immagini, `htmlPrimaDelMotore` compreso con le sue;
   - strati con i parametri scelti, e le **voci dell'archivio litologico** a cui rimandano
     (`sourceArchiveId`);
   - i **template di report e d'indice** usati dal progetto e dalle sue prove, con le loro
     immagini;
   - lo storico degli intervalli e `registroCorrezioni`.

   Le copie automatiche (Cronologia) restano del dispositivo: non viaggiano.

   Punti che oggi perdono qualcosa, trovati dalla Fase 1 (esito, §6), **da chiudere tutti**:
   - lo ZIP salta in silenzio le foto che non trova: deve dirlo prima di creare il pacchetto;
   - template e archivio litologico non viaggiano;
   - `htmlPrimaDelMotore` esce senza immagini;
   - l'import del JSON dello stato intero ignora template e archivio;
   - i nomi dei file usano il comune invece del nome del progetto.

   **All'arrivo:**
   - template e voci d'archivio che esistono già identici si riusano;
   - se esistono ma diversi, si importano come copia rinominata, senza mai sovrascrivere quelli
     del dispositivo, e il progetto punta alla copia.

   **«Più recente»:** `updatedAt` non basta, perché cambia a ogni salvataggio anche solo aprendo
   il progetto. Serve una data di ultima **modifica vera** del contenuto e un'impronta del
   contenuto. Se le impronte sono uguali, il pacchetto e il progetto presente sono lo stesso
   progetto e basta dirlo.

   Il pacchetto parte dallo ZIP di oggi: resta importabile tutto ciò che si importa adesso.
2. **Import con anteprima:** prima di scrivere mostra cosa arriva (prove, intervalli, foto, data
   di esportazione, dispositivo), verifica le impronte e confronta con il progetto già presente
   (stesso id). Scelte: **Sostituisci** (con copia automatica prima) · **Tieni entrambi**
   (rinomina) · **Annulla**. Se quello presente è più recente del pacchetto, lo si dice in modo
   esplicito.
3. **Un solo punto** per «Porta su un altro dispositivo» (esporta pacchetto) e «Ricevi da un
   altro dispositivo» (importa). Il posto definitivo lo decide la Fase 5: per ora va nel ⋯ del
   progetto e in Home.
4. **Test di andata e ritorno:** esporta → importa in uno stato vuoto → confronto profondo
   (dati, foto, note, strati, archivio, template usati) e confronto delle foto per SHA-256.
   Deve risultare **identico**. Il test ripete il giro in altri due casi:
   - con un pacchetto corrotto (impronta sbagliata), che va rifiutato senza scrivere nulla;
   - tra due «dispositivi» con template omonimi ma diversi, dove nessuno dei due va
     sovrascritto.
5. **Interfaccia:** segue il prototipo approvato. Tavole «Telefono · Porta su un altro
   dispositivo» e «PC · Ricevi un progetto» su https://claude.ai/artifact/4wQitcFLA5y6gWHj4fThJY.
6. Niente cloud e niente «Condividi» (decisioni precedenti). Il file lo sposta l'utente, con
   un cavo o un servizio a sua scelta.

### Fase 3 — Ritocchi rapidi dell'interfaccia ✅ (unita in `main` il 27/09/2026)
Gli interventi 1–8 del §5 dell'analisi, più la decisione G, secondo il prototipo approvato.

0. **Prima di tutto, le regole di stile comuni** (erano nella Fase 8): caratteri, bottoni,
   spaziature, colori e spie, come nella tavola «Regole di stile comuni» del prototipo. Vanno
   scritte come variabili CSS e classi in `src/css/`. Ogni schermata nuova o toccata da qui in
   poi le usa; la Fase 8 allinea solo le schermate vecchie.

1. Testata della prova «Prova N° · nome progetto», senza troncamenti a 375 px. GPS, foto e falda
   diventano spie di stato sotto il titolo (niente ❌ rossa, stesso linguaggio per tutte).
2. Bersagli di almeno 44 px per tutti i comandi usati in campo.
3. **CONFERMA visibile di default** con l'etichetta «Registra da–a m», e la scelta di
   nasconderlo memorizzata (decisione G). La pressione lunga su +1 resta come scorciatoia. La
   «Modalità Espansa» come impostazione separata sparisce, e chi l'aveva attiva non perde nulla
   (migrazione).
4. Toast unico per l'app (generalizza `mostraToastTemplateEditor`) al posto degli `alert` di
   sola conferma. Gli `alert` di errore e le domande restano dialoghi.
5. Date sempre gg/mm/aaaa; singolari e plurali corretti; etichetta per il committente.
6. Via i doppioni: interruttore «Registro integrato» nel cassetto, «Chiudi» dove c'è la X, tasti
   doppi nello stato vuoto della Home.
7. Card del progetto tutta toccabile; icona delle note `i-note`; via le emoji residue.
8. Testi dei template corretti («questa prova» in Home, «non modificabile»).
9. La barra fissa «Salvataggio sospeso» (Fase 1) copre la testata: deve spingere giù il
   contenuto invece di coprirlo. Visto dal coordinatore nel browser.

### Fase 4 — Un posto per ogni dato (progetto e prova) ✅ (ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire)
Esito: `docs/fasi/FASE_4_ESITO.md`. Senza migrazione: vedi «Decisione presa, da confermare».

1. **Dati di progetto modificabili**, nome compreso, in un posto solo: nome, comune, provincia,
   committente, sede, denominazione, data. La card della Home li legge da lì.
2. **Cosa è del progetto e cosa è della prova**, deciso una volta per tutte:
   - *prova*: N°, località, data dell'indagine, strumento, falda, GPS, foto;
   - *progetto*: tutto il resto.

   Una migrazione (Fase 1) sposta i campi. Dove le prove di uno stesso progetto hanno valori
   diversi (es. due committenti), **non si perde niente**: il valore più frequente va nel
   progetto, gli altri restano sulla prova come eccezione visibile.
3. **Scheda prova unica** (Dati · Strumento · Falda · GPS · Foto, più ⋯ Duplica interpretazione
   · Elimina), aperta da un tasto visibile nella testata. La pressione lunga sul cerchietto resta
   come scorciatoia. Sostituisce «Intestazione Cantiere» e «Impostazioni Prova».
4. «Nuova prova» con un tocco: N° successivo e dati ereditati dal progetto; si correggono dopo
   dalla scheda.
5. **Da valutare e scrivere nell'esito, non da fare per forza:** oggi la prova aperta vive in
   due copie (`state.header/logs/...` e `proj.surveys[id]`), riallineate da
   `syncStateToProject` / `syncProjectToActiveState`. Due copie sono una fonte classica di dati
   che si contraddicono: proponi se e come arrivare a una copia sola.

### Fase 5 — Gerarchia e navigazione ✅ (ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire)
Esito: `docs/fasi/FASE_5_ESITO.md`. 52/52 suite.

1. **Schermata Progetto:**
   - testata con nome e stato;
   - lista delle prove con N°, profondità raggiunta, n° intervalli, spie GPS/foto/falda e
     avvisi pre-export;
   - accessi a Dati progetto, Strati, Note, Consegna;
   - nel ⋯: Duplica, Cronologia, Pacchetto per altro dispositivo, Elimina.

   **«Apri» dalla Home porta all'ultima prova usata** (decisione H). Nella prova, «‹ Nome
   progetto» porta alla schermata Progetto. Il tasto indietro di Android segue la stessa
   gerarchia: se oggi non è gestito, va gestito.
2. **Consegna unica:** una sola finestra con la scelta del perimetro (questa prova · alcune ·
   tutto il progetto) e tutti i formati:
   - report PDF/Word, Excel;
   - parametri avanzati (Excel/CSV/PDF/Word);
   - KML, foto;
   - confronto prove;
   - JSON o pacchetto.

   Sostituisce le porte sparse elencate nell'analisi (§2) e i controlli pre-export stanno in
   cima.
3. **Impostazioni riordinate:**
   - *Campo*: vibrazione, bip, schermo acceso, «Modalità campo» = guanti;
   - *Dati*: spazio, copie automatiche, backup completo, importa, reset;
   - *Libreria*: template di report, template indice, archivio litologico;
   - *Aspetto*;
   - *Info e versione*;
   - *Sperimentali*.

### Fase 6 — Il campo, sul telefono ✅ (ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire)
Esito: `docs/fasi/FASE_6_ESITO.md`. 48/48 suite. Corretta dalle osservazioni dell'utente sul telefono:
il Registro scorre in un riquadro con «Mostra tutte le righe» (invece di niente riquadro), l'ordine si
inverte solo nell'elenco «Intervalli», la falda è passata dalle spie al ⋯ della prova.

1. La prova ha due viste, **Conta | Registro**. Sotto il contatore si vedono gli ultimi 3
   intervalli. Il lucchetto e le barre doppie spariscono (una sola soluzione).
2. Il Registro non ha più uno scorrimento dentro lo scorrimento. **L'ordine resta quello di
   oggi**, con un comando per invertirlo, scelta memorizzata (decisione J).
3. Righe del Registro: un tocco apre la scheda **già modificabile**. Lo scorrimento a sinistra
   mostra le azioni, compresa Elimina con annulla. Si abbandona lo «scorri a destra = elimina».
4. Su telefono le finestre diventano fogli dal basso, e le spiegazioni lunghe vanno in fondo o
   dietro una «?».
5. Note rapide su più righe, senza scorrimento orizzontale.

### Fase 7 — Il PC, per la post-produzione ✅ (ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire)
Esito: `docs/fasi/FASE_7_ESITO.md`. Versione minima; il resto dopo l'uso.

Da 1024 px in su (decisione I):
1. **Layout a colonne:** progetti e prove a sinistra, al centro il Registro con il grafico
   affiancato, a destra la scheda prova oppure gli strati. Tra 761 e 1023 px, due colonne.
2. **Niente contatore.** Si inserisce con «Aggiungi intervalli» (uno o molti, incollati o
   digitati) e si corregge direttamente nelle celle del Registro. Invio passa alla riga dopo,
   Esc annulla. Ogni modifica è tracciata (Fase 1, punto 5).
3. **Parametri avanzati degli strati** in grande: tabella per strato con autori e valori
   affiancati, invece della sequenza di card pensata per il telefono.
4. **Editor dei template** a tutto schermo, senza cambiare il suo funzionamento interno.
5. Scorciatoie da tastiera documentate (tasto `?`) e un menu ⋯ al posto dei gesti touch.

### Fase 8 — Sistema visivo e pulizia ✅ (ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire)
Esito: `docs/fasi/FASE_8_ESITO.md`. 53/53 suite. La migrazione completa degli stili resta da fare man mano.

1. **Regole di stile comuni (token):**
   - scala dei caratteri 12 · 14 · 16 · 20 · 28, più quella del contatore;
   - bottoni alti 36 · 44 · 56;
   - spaziature a passi di 4;
   - colori con un significato (accento, successo, avviso, pericolo) e basta.
2. Si migrano gli stili scritti a mano verso le classi, **schermata per schermata**, a partire
   da quelle toccate nelle fasi 3–7. Nessuna schermata deve cambiare aspetto per sbaglio: si
   confrontano le schermate prima/dopo.
3. Via il codice morto e i commenti di cantiere superati. Dai nomi più chiari ai pezzi di
   `src/js/` (aggiornando `ordine.txt`).

## 5. Come si lavora sull'interfaccia (dal 26/09/2026)

1. **Prima il prototipo, poi il codice.** Per ogni fase che cambia l'interfaccia, il
   coordinatore prepara un prototipo cliccabile a misura di telefono (390) e di PC (1280–1440)
   sulla lavagna https://claude.ai/artifact/4wQitcFLA5y6gWHj4fThJY. L'utente lo prova, anche dal
   telefono, e lo corregge. L'agente realizza quello che è stato approvato: esegue, non inventa
   l'interfaccia.
2. **Si misura su compiti veri.** Passaggi e tocchi si contano prima e dopo ogni fase, su
   questi compiti:
   - creare un progetto e iniziare una prova;
   - registrare 10 intervalli con una nota;
   - aggiungere foto e GPS;
   - impostare la falda;
   - correggere un intervallo;
   - portare il progetto sul PC e fare il report;
   - sistemare i parametri di uno strato.

   Una fase non si chiude se ne peggiora uno.
3. **Si procede per passi.** Le comodità si scoprono usando l'app. Le osservazioni dell'utente
   vanno in `docs/OSSERVAZIONI.md` con data e contesto. Prima di ogni fase il coordinatore
   riprende quelle che la riguardano; le piccole si raccolgono in un giro di ritocchi dopo la
   fase in corso.
4. Vale anche per il PC: le tavole della riga «PC — post-produzione» sono un punto di partenza
   per la Fase 7, non un disegno definitivo.

## 6. Dopo ogni fase (coordinatore)
- Rivedere il diff, eseguire `npm test`, verificare nel browser a 375 e 1280 px.
- Unire il ramo in `main` e segnare la fase con ✅ qui sopra.
- Riassumere all'utente cosa è cambiato e cosa provare sul telefono, con il file
  `dist/DPSH.html` da mettere nell'APK.
- Portare all'utente le decisioni «da confermare» prima di far partire la fase successiva.
