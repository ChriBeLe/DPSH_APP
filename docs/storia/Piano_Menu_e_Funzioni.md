# Menù, Home e nuove funzioni — piano di lavoro

> **Stato all'11 settembre 2026: ✅ fatte tutte le voci, dalla 1 alla 12, e la decisione F**, con
> test automatici e verifica nell'anteprima (esito ai §7 e §8).
> Resta da fare **sul telefono** il passo 0 della voce 8: quale dei tre modi apre le mappe nell'APK.
> Backup di partenza: `backup/Modulo1_integrato_2026-09-11_1644.html` (prima delle voci 1–2),
> `…_1713.html` (prima delle voci 3–10) e `…_1750.html` (prima delle voci 11, 12 e della F).
>
> Nasce dal giro di proposte sul menù principale e dalle tue risposte. Le azioni sono in
> ordine di velocità e complessità: prima le più rapide e semplici, in fondo le più lunghe.
> Ogni scheda dice dove sta il codice, come si interviene e come si verifica. Le righe citate
> sono quelle di `Modulo1_integrato.html` a questa data.

---

## 0. ✅ Corretto: un difetto già presente, che perdeva foto

L'ho trovato guardando come funziona "Duplica progetto", per capire come fare "Duplica prova".

**Cosa succede.** `duplicateProject` (righe 14963–14984) dà un id nuovo al progetto e alle
prove, ma **non alle foto**: la copia punta alle stesse foto dell'originale nel database
immagini. Le tre cancellazioni però non lo sanno:

| Cancellazione | Righe | Cosa controlla prima di cancellare la foto dal database |
|---|---|---|
| Singola foto | 35146–35152 | solo che la foto non sia più nella prova aperta |
| Prova | 14399–14411 | solo che quella prova non sia stata ripristinata |
| Progetto | 14946–14955 | solo che quel progetto non sia stato ripristinato |

**Lo scenario.** Duplichi "Cantiere A" e nasce "Cantiere A (copia)". Elimini l'originale.
Dopo 11 secondi le sue foto vengono cancellate dal database, e sono **le stesse** della copia:
nella galleria e nel PDF della copia le foto risultano vuote. Vale anche al contrario, e vale
eliminando una sola foto in una delle due.

**✅ Corretto l'11 settembre (voce 6).** Le tre cancellazioni ora chiedono a `idFotoAncoraInUso`
se la foto serve ancora a un'altra prova o a un altro progetto, e in quel caso non la toccano.
Verificato da `test/foto_condivise.js`.

Era la voce 6 della classifica, fatta per prima tra le medie perché è anche il prerequisito di
Duplica prova e delle Copie automatiche, che creano apposta la stessa situazione (foto condivise).

---

## 1. La classifica

"Complessità" qui vuol dire quanto è difficile da realizzare. Come carico per il telefono
nessuna voce è pesante: l'unica che lavora da sola in sottofondo è la 11, con una scrittura
ogni qualche minuto.

| # | Azione | Tempo | Complessità | Rischio | Dipende da |
|---|---|---|---|---|---|
| 1 | ✅ Rinominare il menù in "Impostazioni" — **fatto** | minuti | minima | nessuno | — |
| 2 | ✅ Spostare "Controlla note" e "Reset dati locale" — **fatto** | minuti | minima | spaziature del menù | — |
| 3 | ✅ Togliere i resti di "Condividi" — **fatto** | breve | bassa | nessuno | — |
| 4 | ✅ Informazioni app e numero di versione — **fatto** | breve | bassa | nessuno | decisione A |
| 5 | ✅ Ricerca dei progetti in Home — **fatto** | breve | bassa | basso | — |
| 6 | ✅ Cancellazione foto che controlla chi le usa ancora — **fatto** | breve | media | medio: tocca le cancellazioni | — |
| 7 | ✅ Stato del progetto, manuale — **fatto** | breve | bassa | basso | 5, per il filtro · decisione B |
| 8 | ✅ Apri in Mappe — **fatto il passo 0, da provare sul telefono** | breve + prova sul telefono | bassa | incognita APK | prova sul telefono |
| 9 | ✅ Duplica prova — **fatto** | una sessione | media | medio | 6 · decisione C |
| 10 | ✅ Riepilogo prima dell'export — **fatto** | una sessione | media | basso | decisione D |
| 11 | ✅ Copie automatiche con ripristino — **fatto** | più sessioni | alta | medio | 6 · decisione E |
| 12 | ✅ Confronto tra prove — **fatto** | più sessioni | alta | basso: sola lettura | — |

### Blocchi di lavoro suggeriti

| Blocco | Voci | Perché insieme |
|---|---|---|
| **1** | 1, 2, 3, 4 e **6** | Le rapide, più l'urgente |
| **2** | 5, 7 e il passo 0 della 8 | La Home, e la build di prova da portare sul telefono |
| **3** | 8, 9, 10 | La 8 con il metodo che ha funzionato; la 9 ora che la 6 è fatta |
| **4** | 11, in tre passi | Il lavoro più delicato, da solo |
| **5** | 12, in due passi | Indipendente da tutto il resto |

---

## 2. Le schede

### 1. Rinominare il menù — minuti

- Riga 3321: il tooltip del tasto passa da «Cantiere, Strumento & Impostazioni» a
  «Impostazioni» (il `data-label` lo dice già).
- Riga 6510: il titolo del pannello passa da «Cantiere & Impostazioni» a «Impostazioni».
- Riga 6502: il commento elenca ancora cantiere, falda e strumento, spostati altrove da tempo.

**Verifica:** nessuna occorrenza residua dei vecchi nomi.

### 2. Riordinare il menù — minuti

**"Controlla note (prova a vuoto)"** (riga 6717) va dentro *Funzioni sperimentali*
(righe 6592–6627).

Cos'è, detto semplice: quando abbiamo cambiato il motore dell'editor delle note bisognava
essere sicuri che le note già scritte passassero al formato nuovo senza perdere niente
(checklist spuntate, tabelle, immagini, evidenziatore). Il pulsante fa quella conversione
**per finta, in memoria**, sulle note vere del telefono, e dice se qualcosa andrebbe perso.
Non modifica nulla. Si potrà togliere del tutto quando l'app smetterà di conservare la copia
delle note vecchie (`htmlPrimaDelMotore`).

**"Reset Dati Locale"** (riga 6741) esce dalla sezione *Backup*, dove oggi sta attaccato a
Esporta/Importa, e va in una sezione a sé, ultima del menù.

- Gli id non cambiano, quindi il JavaScript non si tocca: si sposta solo il markup.
- **Verifica:** anteprima del menù e spaziature delle sezioni (le regole
  `.drawer-section > *` dipendono dalla struttura).

### 3. Togliere i resti di "Condividi" — breve

Hai tolto Condividi dal pannello del progetto, ma **è ancora nella modale Esporta** e fa la
stessa cosa inutile:

- la scheda `btnOptExportShare` (riga 5553) con il suo handler (righe 27613–27622);
- per un progetto chiama `shareProjectSummary` (righe 26900–26918), che manda come testo
  nome, committente, data e numero di prove;
- per una prova clicca `btnShareFile` (righe 41070–41095), che manda un testo con numero
  prova, comune, profondità e coordinate.

Da togliere anche la parola «condividi» nel tooltip del tasto "…" in Home (riga 14713) e nei
commenti alle righe 14986–14987 e 15169.

**Verifica:** zero riferimenti residui; la modale Esporta si apre con le altre opzioni.

### 4. Informazioni app e versione — breve

**A quale versione siamo arrivati? A nessuna: l'app non è mai stata numerata.** Nel file non
c'è un numero di versione, e nella cartella di lavoro non c'è il progetto Android da cui nasce
l'APK. La storia che si ricostruisce dai file:

- 5 agosto 2026: `Modulo 1.html`, il file più vecchio;
- 26–27 agosto: i primi backup di `Modulo1_integrato.html`;
- 2–11 settembre: 11 backup nella cartella `backup/`.

**Proposta (decisione A): la versione è la data di rilascio**, per esempio `2026.09.11`; un
secondo rilascio nello stesso giorno diventa `2026.09.11.2`.

- Non c'è un conto da tenere a mente.
- Dice subito quanto è vecchio l'APK installato.
- È la stessa data dei file di backup, quindi si ritrova il file corrispondente.

Dove e come:

- una costante `APP_VERSIONE` in cima allo script, aggiornata alla fine di ogni sessione in
  cui il file cambia, insieme al backup;
- una sezione **Informazioni** in fondo al menù, con versione e data;
- lo stesso numero dentro i backup JSON (campo `versioneApp`), così di ogni backup si sa quale
  versione l'ha prodotto;
- se lo strumento che crea l'APK chiede un numero di versione, conviene usare lo stesso.

### 5. Ricerca dei progetti — breve

- Un campo di ricerca in Home, sotto *Importa / Nuovo progetto* (righe 3340–3353).
- Filtra dentro `renderHomeProjects` (riga 14648) su nome, comune, committente e località,
  **senza distinguere maiuscole e accenti** («forli» trova «Forlì»).
- Se non trova niente mostra un messaggio suo, diverso da «Nessun progetto» (riga 14652) che
  invita a crearne uno.
- Il testo cercato non viene salvato: riaprendo la Home la lista è completa.

**Verifica:** la funzione di confronto è pura, quindi si prova con Node anche senza jsdom.

### 6. ⚠ Cancellazione foto che controlla chi le usa ancora — breve, ma urgente

Il difetto è descritto al §0.

- Una sola funzione, `fotoAncoraUsata(id)`: cerca l'id in tutti i progetti, in tutte le prove
  e nella prova aperta; più avanti anche nelle copie automatiche (voce 11).
- Le tre cancellazioni (foto, prova, progetto) la chiamano prima di cancellare dal database:
  se la foto è ancora usata altrove non la toccano.
- Da controllare nello stesso giro:
  - il calcolo di "Foto orfane", che per come è definito dovrebbe già guardare i riferimenti
    di tutto l'archivio;
  - l'import di un progetto esportato mentre l'originale è ancora sul telefono, che potrebbe
    creare la stessa condivisione.
- Le immagini dentro le note non sono coinvolte: eliminare un progetto non le cancella
  (righe 14919–14922 raccolgono solo le foto delle prove).

**Verifica:** un test su uno stato finto con un progetto e la sua copia, eseguendo le funzioni
vere. Lo scenario del §0 deve lasciare intatte le foto della copia.

### 7. Stato del progetto — breve

Puramente manuale: l'app non lo cambia mai da sola.

- Nuovo campo `proj.stato`. Se manca, il progetto è senza stato: i progetti e i backup
  esistenti non cambiano.
- Stati proposti (decisione B): **In corso · Da elaborare · Consegnato**.
- **Si imposta** dal pannello "…" del progetto (riga 6291), con tre bottoni.
- **Si vede** come etichetta colorata sulla card (riga 14701).
- **Si filtra** con dei bottoni sopra l'elenco, accanto alla ricerca: *Tutti · In corso ·
  Da elaborare · Consegnato*.
- Cambiare stato **non** aggiorna la data di modifica: la lista è ordinata per ultima modifica
  (riga 14683), e segnare «Consegnato» porterebbe il progetto in cima.
- Un progetto duplicato nasce senza stato.

### 8. Apri in Mappe — breve, più una prova sul telefono

Le coordinate ci sono già (`header.lat` / `header.lng`, righe 7030–7031). Il punto delicato è
**come aprire un'altra app da dentro l'APK**: lì `window.open()` non apre niente (commento
alle righe 28553–28563, è il motivo per cui la stampa passa da un iframe).

**Passo 0, sul telefono.** Una build di prova con un pulsante temporaneo che offre tre metodi,
per vedere quale funziona nel tuo APK:

1. link `geo:`, lo standard Android per "apri una posizione": se l'APK lo passa al sistema,
   compare la scelta tra Maps, Waze e simili;
2. link web di Google Maps: rischia di aprirsi **dentro** l'app, al posto dell'app stessa;
3. il link di Maps mandato al pannello di condivisione del telefono, se nell'APK funziona.

Qualunque metodo vinca, c'è sempre anche **Copia coordinate**.

- **Dove:** nella finestra *Posizione GPS* della prova (riga 3598), accanto alle coordinate.
- **Verifica:** solo sul telefono, l'unico posto dove questo comportamento conta.

### 9. Duplica prova — una sessione, dopo la 6

Serve a tenere due interpretazioni stratigrafiche dello stesso dataset.

- **Dove:** nelle *Impostazioni prova* (pressione lunga sulla linguetta), accanto a «Elimina
  questa prova» (riga 5331).
- **Cosa copia:** tutto della prova, con un id nuovo: colpi, intestazione, strumento, strati,
  falda, parametri avanzati. Le foto restano condivise, senza raddoppiare lo spazio: è sicuro
  solo dopo la voce 6.
- **Nome:** la copia si distingue subito nelle linguette e nel report, per esempio «Prova 3 · B».

**Decisione C — cosa rappresenta la copia.** È la domanda vera, perché la copia **non è una
prova in più fatta sul terreno**:

- **C1, copia normale.** Diventa una prova come le altre. È semplice, ma finirebbe nei
  conteggi del testo introduttivo («sono state realizzate n. 4 prove» invece di 3) e come pin
  doppio nella tavola di inquadramento, a meno di escluderla a mano all'export.
- **C2, interpretazione alternativa.** La copia ricorda di quale prova è una variante (campo
  `interpretazioneDi`): conteggi e pin la ignorano, e all'export si sceglie quale
  interpretazione includere. Più lavoro, perché vanno trovati tutti i punti che contano le
  prove, ma il report resta giusto da solo.

Consiglio **C2**. Si può partire da C1 e passare a C2 dopo, senza rifare niente.

### 10. Riepilogo prima dell'export — una sessione

- **Dove:** in cima alla modale Esporta (`openExportModal`, riga 15151), come riquadro
  «Controllo prima dell'export». Non blocca: si può sempre esportare comunque.
- Ogni avviso si tocca e porta alla prova e alla finestra dove si corregge.
- Da verificare prima: che tutti gli export passino davvero da quella modale, perché eventuali
  scorciatoie dirette la salterebbero.

**Controlli proposti, per ogni prova** (decisione D: togli o aggiungi):

| Controllo | Come si riconosce nei dati |
|---|---|
| Nessun colpo registrato | registro vuoto (`surv.logs`) |
| GPS mancante | `lat` / `lng` vuoti |
| Nessuna foto | elenco foto vuoto |
| Falda non impostata | `faldaDa` vuoto. Nel report esce «non rilevata» (riga 11869), quindi l'avviso dice proprio questo: l'app non può distinguere «dimenticata» da «assente davvero» |
| Intestazione incompleta | committente, località o data vuoti |
| Strati non assegnati | da capire come riconoscere «solo lo strato generico di partenza» |

**Verifica:** la funzione che produce l'elenco degli avvisi è pura, quindi si prova con Node.

### 11. Copie automatiche con ripristino — più sessioni

Riprende la «macchina del tempo» dell'analisi UX (`DPSH_Analisi_UX.html`, punto 6), adattata
al codice di oggi.

**Cosa si salva.** Lo stesso stato leggero che `saveState` scrive già (righe 7979–8024): tutti
i dati, senza le foto. Si aggancia lì, dopo un salvataggio riuscito.

**Dove.** In un **database separato**, `DPSH_CopieAutomatiche`, non come nuovo archivio dentro
quello delle foto (`DPSH_PhotoStorageDB`, versione 2, righe 29374–29378). Per aggiungere un
archivio lì bisognerebbe portarlo alla versione 3, e se un giorno reinstallassi un APK più
vecchio, quell'APK non riuscirebbe più ad aprire il database delle foto. Separato, il rischio
non esiste.

**Quando.**

- Al massimo una copia ogni 5 minuti di lavoro, e solo se qualcosa è cambiato.
- Sempre, subito prima di un'azione pericolosa: eliminare foto, intervallo, strato, prova o
  progetto; import con «Sostituisci tutti gli intervalli»; import di un archivio; il ripristino
  stesso.

**Quante (decisione E).** Proposta: le ultime 20, più una al giorno per 14 giorni, più le
«prima di…» per 7 giorni. Prima di fissare i numeri si misura sul telefono quanto pesa lo stato
(lo mostra già *Spazio occupato*).

**Ripristino per progetto, non per archivio.** Una voce *Cronologia* nel pannello "…" del
progetto, con l'elenco delle copie (data, ora ed etichetta, es. «prima di eliminare Prova 2») e
il tasto *Ripristina*. Sostituisce **solo quel progetto**: ripristinare tutto l'archivio
cancellerebbe il lavoro fatto nel frattempo sugli altri. Prima di sovrascrivere si salva una
copia dello stato attuale.

**Foto (decisione E).** Un progetto ripristinato può chiedere foto cancellate nel frattempo.
Proposta: una foto usata da una copia non si cancella finché la copia esiste, cioè al massimo
14 giorni, estendendo la voce 6. *Spazio occupato* le mostra come «tenute dalle copie
automatiche».

**Reset dati locale** cancella anche le copie, e lo dice: altrimenti non sarebbe un reset.

**Tre passi:**

- **11a:** scrittura delle copie e pulizia delle vecchie. Invisibile all'utente, verificata con
  test: la regola che decide quali copie tenere è pura e si prova con Node.
- **11b:** Cronologia e ripristino.
- **11c:** foto e *Spazio occupato*.

### 12. Confronto tra prove — più sessioni

Il grafico di oggi è un SVG disegnato da `renderChart` (riga 12829) sulla sola prova aperta;
ogni prova ha già il suo registro (`surv.logs`, riga 8679).

- **12a:** una finestra *Confronta prove* dal pannello "…" del progetto. Si scelgono 2 o più
  prove e si vedono i colpi per 20 cm sovrapposti sullo stesso asse delle profondità, un colore
  per prova, con l'opzione di passare a Rpd.
- **12b:** le colonne stratigrafiche delle prove affiancate e allineate in profondità. È la
  vista che serve di più per correlare gli strati.
- **12c, facoltativo:** lo stesso confronto come blocco del report.

**Un limite da sapere.** Il confronto è per profondità dal piano campagna. Per allineare le
prove su quote assolute servirebbe la quota di ogni prova, che l'app non ha: l'altitudine del
GPS (`header.alt`, riga 13435) è troppo imprecisa, spesso di decine di metri. Se servisse, si
aggiunge un campo manuale «quota p.c.»: decisione rimandata.

---

## 3. Decisioni tue

| | Domanda | Proposta |
|---|---|---|
| **A** | Versione come data di rilascio? | ✅ Adottata: `2026.09.11` |
| **B** | Nomi degli stati del progetto | ✅ Adottati: In corso · Da elaborare · Consegnato |
| **C** | La prova duplicata è una prova in più o un'interpretazione della stessa? | ✅ Adottata C2, interpretazione |
| **D** | Quali controlli nel riepilogo prima dell'export | ✅ Adottata la tabella, senza «strati non assegnati» (vedi §7) |
| **E** | Quante copie automatiche tenere, e se proteggere le foto che usano | ✅ Adottata: 20 recenti + una al giorno per 14 giorni + «prima di…» per 7 giorni; foto protette |
| **F** | «Ultimo backup: N giorni fa» nel menù, con promemoria | ✅ Fatta dopo il «procedi»: riga nel menu e promemoria in Home con «Più tardi» |

---

## 4. La tavola di inquadramento: cos'è

È la **figura con la mappa del sito** nel capitolo introduttivo della relazione:

- la foto satellitare del cantiere, con le prove segnate da pin numerate e l'etichetta
  «DPSH n» sotto;
- un riquadro regionale con il rettangolo rosso che mostra dove si trova il dettaglio;
- la freccia del nord e la barra di scala.

Nell'app è il blocco **Inquadramento** dei template di report, e si compone a tutto schermo con
**«Componi l'inquadramento»** (righe 4643–4849). Quella schermata ha le schede Cartografia,
Formato, Prove («Tutte le prove del cantiere»), Toponimi, Etichetta, Regionale, Nord e scala.

**Non è da fare: c'è già.** Il «Rimandato» in `Modello_Introduzione.md` §8 e le fasi senza ✅
in `Piano_Inquadramento.md` sono note rimaste indietro rispetto al codice. L'unica idea ancora
aperta è il §10 di quel piano: la distanza tra le prove stampata sulla tavola («DPSH 1 –
DPSH 2: 47 m»). Si lega alla decisione C: con C1 una prova duplicata comparirebbe come pin
doppio.

---

## 5. Scartate e sospese

| Voce | Esito |
|---|---|
| Avviso di rifiuto | Scartato |
| Valori predefiniti per le nuove prove | Scartati. Resta com'è quello che la nuova prova eredita già dalla precedente (intestazione, lunghezza asta, stratigrafia) |
| Salvataggio su cloud | Sospeso |
| Service worker | Chiuso. Serve alle app web aperte da un indirizzo internet per funzionare senza rete; la tua è dentro l'APK e funziona già offline |

---

## 6. Come si lavora ogni blocco

- Prima di toccare il file: copia in `backup/Modulo1_integrato_AAAA-MM-GG_HHMM.html`.
- Le funzioni pure (ricerca, foto ancora usate, controlli export, regola delle copie) si provano
  con test in `test/`, eseguiti con Node anche senza jsdom.
- Controllo della sintassi dell'intero script dopo ogni modifica.
- Anteprima nel browser su `http://localhost:8743/Modulo1_integrato.html`.
- Le voci che dipendono dall'APK (la 8, e la prova sul telefono della 11) si chiudono solo dopo
  la prova sul telefono.
- A fine blocco: `APP_VERSIONE` aggiornata e ✅ sulle voci chiuse in questo file.

---

## 7. Esito delle voci 3–10 (11 settembre 2026)

**Le decisioni A–D** non erano ancora state prese: si è andati con le proposte del §3, tutte facili
da cambiare.

**Verifiche.**
- Test nuovi, che eseguono le funzioni vere del file: `foto_condivise.js` (10), `home_ricerca_stato.js` (22),
  `apri_in_mappe.js` (15), `riepilogo_export.js` (17), `prova_interpretazione.js` (17). Tutti passano sul
  file nuovo e falliscono sul backup delle 17:13.
- Suite esistenti eseguibili su questo PC (le altre chiedono jsdom): `barra_titolo_editor` e
  `coefficiente_betat` invariati. `prova_vuota.js` aveva perso 5 controlli perché `valoriCantiere` ora
  usa `proveFisiche`: aggiunta la funzione all'elenco che il test estrae, torna come prima. Il suo
  unico KO («l'indice sa scrivere un'etichetta diversa da "Prova N°"») c'era già alle 16:44.
- Anteprima: ricerca, stato e filtri in Home; versione nel menu; export senza Condividi e con il
  controllo; Apri in Mappe con e senza coordinate; creazione della 1B, conteggi e spunte all'export;
  «Correggi» che porta alla finestra giusta. I dati di prova del browser sono stati rimessi com'erano.

**Da sapere, voce per voce.**
- **4 · Versione.** Scritta nel backup dell'archivio (JSON e ZIP), nei template e nell'archivio
  litologico. Non nel backup del singolo progetto, che è il progetto stesso senza un involucro dove
  metterla.
- **7 · Stato.** Il codice dello stato non tocca la data di modifica. Resta un comportamento vecchio:
  ogni salvataggio fatto dalla Home rinfresca la data dell'ultimo progetto aperto, qualunque cosa si salvi.
- **8 · Apri in Mappe, da provare sul telefono.** Nella finestra *Posizione GPS* ci sono tre bottoni:
  1 · App mappe (`geo:`), 2 · Google Maps (link web), 3 · Scegli app (pannello di condivisione, compare
  solo se il telefono lo offre). Dimmi quale apre le mappe: si tiene quello, si tolgono gli altri.
  «Copia coordinate» resta; se il telefono non permette la copia, il messaggio mostra comunque le
  coordinate.
- **9 · Interpretazioni.** Si crea dalle *Impostazioni prova* (pressione lunga sulla linguetta). La
  copia si chiama «1B», «1C»…; il segno sta in `header.interpretazioneDi`. Conta come la stessa prova nel
  testo introduttivo, nell'inquadramento e nel numero proposto per una prova nuova; all'export PDF parte
  spenta. **L'elenco degli strati (nomi, colori, parametri) è del progetto**: nella copia si cambia a
  quali intervalli sono assegnati, non come sono definiti. Nel KML, nell'Excel di progetto e nel
  conteggio sulla card in Home la copia compare come una riga in più: lì è un dato, non un errore.
- **10 · Controllo prima dell'export.** Controlla colpi, GPS, foto, falda e intestazione (committente,
  località, data). Lasciato fuori «strati non assegnati»: l'app non distingue in modo affidabile uno
  strato scelto da quello generico di partenza, e un avviso che suona a vuoto smette di essere letto.

---

## 8. Esito delle voci 11, 12 e della decisione F (11 settembre 2026)

**Decisioni.** E presa con la proposta del §3. F era rimasta senza risposta: con il «procedi» è stata
fatta nella forma più leggera, una riga nel menu e un promemoria in Home che si chiude con «Più tardi».

**Verifiche.**
- Test nuovi: `copie_automatiche.js` (40), `confronto_prove.js` (21). `foto_condivise.js` aggiornato
  perché `idFotoAncoraInUso` ora consulta anche le copie, con un controllo in più (12).
- Suite eseguibili su questo PC: tutte come prima (`prova_vuota.js` con il suo KO di sempre).
- Anteprima: promemoria e «Più tardi»; menu con la sezione Copie automatiche; 4 intervalli importati
  (0,80 m), sostituiti con 2 (0,40 m) e ripristinati dalla Cronologia (di nuovo 0,80 m), con la copia
  «prima di ripristinare» comparsa in cima; confronto di due prove con linee, colonne, legenda, passaggio
  a Rpd e una prova nascosta. I dati di prova del browser sono stati rimessi com'erano.

**Da sapere.**
- **11 · Copie automatiche.** Si salvano da sole, senza le foto, in un database a parte
  (`DPSH_CopieAutomatiche`): al massimo una ogni 5 minuti di lavoro, solo se qualcosa è cambiato, e
  subito prima di eliminare un intervallo, uno strato, una prova, un progetto o una foto, di azzerare
  la falda, di sostituire gli intervalli con l'import in blocco e di importare un archivio.
  - **Cronologia**: dal menu mostra tutte le copie, anche dei progetti eliminati; dal ⋯ del progetto
    solo le sue. «Ripristina» rimette **solo quel progetto**, dopo aver salvato una copia di adesso.
  - Le foto usate da una copia non si cancellano finché la copia esiste. Eliminando un progetto con
    molte foto, lo spazio si libera quando scade la sua copia «prima di eliminare» (al massimo 7
    giorni): da lì «Foto orfane» lo recupera.
  - Il Reset cancella anche le copie, e lo dice.
- **12 · Confronto tra prove.** Dal ⋯ del progetto, con almeno due prove che hanno intervalli. Colpi N
  o Rpd sovrapposti e colonne stratigrafiche affiancate nella stessa figura, sulla stessa scala delle
  profondità; si tocca una prova per nasconderla. Le interpretazioni alternative partono nascoste. Le
  profondità sono dal piano campagna: niente quota assoluta.
- **F · Backup completo.** Conta solo il backup dell'intero archivio (JSON o ZIP), dal menu o dal
  promemoria; quello del singolo progetto no. Il promemoria compare se non c'è mai stato un backup
  completo, o se l'ultimo ha più di 7 giorni e dopo ci sono state modifiche.
