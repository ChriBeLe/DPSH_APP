# Fase 3 — Ritocchi rapidi dell'interfaccia: esito

> Ramo `fase-3-ritocchi-ui`, 27/09/2026. `APP_VERSIONE` 2026.09.27.3 (terzo rilascio del giorno).
> `VERSIONE_SCHEMA_DATI` 3.
> `npm test`: **47/47 suite verdi** (44 di prima + 3 nuove), nessuna regressione.
> `dist/DPSH.html`: 4 423 158 byte (fine Fase 2: 4 405 776).

Obiettivo: gli interventi 1–8 del §5 dell'analisi e la decisione G, come nel prototipo approvato
(lavagna, tavole «Telefono · Prova in campo», «Telefono · Home», «Regole di stile comuni»). Il modo
in cui i dati si registrano non cambia: stessi intervalli, stessa tracciabilità (`origine`,
`registratoIl`), stesso ordine del Registro.

---

## 1. Cosa è fatto, punto per punto

### Punto 0 — Regole di stile comuni (`src/css/03_regole-di-stile.css`)
Variabili e poche classi, **sopra** il tema (i colori di temi e palette restano quelli di `01_app.css`):
- caratteri `--fs-didascalia` 12, `--fs-testo` 14, `--fs-campo` 16, `--fs-sezione` 20,
  `--fs-schermata` 28, `--fs-contatore` 96;
- bottoni `--h-bottone-pc` 36, `--h-bottone` 44, `--h-bottone-campo` 56; spaziature `--sp-1…8` a passi di 4;
- colori con un significato: accento, successo, avviso, pericolo e il neutro tratteggiato; per il
  testo sopra i fondi tenui ci sono toni chiari sul tema scuro e scuri sul chiaro;
- classi `.bt` (+ `.bt-principale`, `.bt-successo`, `.bt-tenue`, `.bt-campo`, `.bt-pc`), `.bt-icona`,
  `.bt-link`, `.pillola`, `.spia` (fatto / con quantità / `.non-ancora`), `.riga-avviso`,
  `.menu-ancora` + `.menu-azioni`, `.toast-app`.

Le due schermate toccate stanno in `src/css/04_prova-e-home.css`, scritte con queste regole.

### Punto 1 — Testata della prova
- A sinistra Home (44). Al centro, toccabile, **«Prova N»** (22 px, grassetto) e sotto
  **«Nome progetto · Comune»** (14 px, con ellissi): apre l'intestazione della prova come faceva il
  titolo. A 375 px il titolo ha 221 px (prima 20 px, «C…»).
- A destra un **⋯** (44) con Gestione litologica, Esporta, Impostazioni e «Annulla ultimo intervallo».
  Il vecchio meccanismo che spostava GPS/foto/note nel menu sotto i 360 px è tolto.
- **Spie** alte 44 sotto il titolo: GPS («GPS» con la spunta verde se c'è, tratteggio se manca),
  foto («N foto», neutra, tratteggio se 0: **niente ❌ rossa**), falda («Falda 1,20 m» o «Falda»
  tratteggiata; la falda si imposta da qui, non più dalla barra del Registro), note.
  Non sono colonne uguali: ognuna prende lo spazio che le serve, così «Falda 1,20 m» sta a 375; sotto
  i 420 px foto e falda perdono l'icona (il testo dice già cosa sono), la spunta del GPS resta.
- Riga **«Prove»**: cerchietti da 44 (erano 32) e il «+» tratteggiato dopo l'ultimo. La pressione
  lunga sul cerchietto apre ancora le impostazioni della prova.

### Punto 2 — Bersagli da 44 in campo
Misurati dal DOM nel browser a 375×812 e controllati in jsdom (suite `prova_in_campo.js`): nessun
comando visibile in testata e Vista Prova sotto i 44 px (prima 21 su 23), nessun testo sotto i 12 px
(anche le quote del Registro, la falda sul Registro, la legenda). +1 e −1 alti 96 (1/3 e 2/3),
Registra 56, lucchetto 44, salto della barra di stato 44.

### Punto 3 — CONFERMA visibile di default (decisione G)
- Bottone verde da 56 a tutta larghezza, con la spunta e **«Registra 8,00–8,20 m»**, che segue
  l'intervallo. Sotto: «Oppure tieni premuto +1» (12 px) e il link «Nascondi questo tasto».
- Nascosto, resta la riga tratteggiata «Registra tenendo premuto **+1** · Mostra il tasto». La scelta
  è `state.settings.tastoRegistraVisibile`, preferenza dell'app (non della prova, non conta come
  modifica del progetto), e resta anche riaprendo l'app.
- La pressione lunga su +1 registra come prima. Il contatore mostra l'intervallo in mono
  («8,00–8,20 m»), «Asta N», il numero da 96 e «colpi in questo intervallo».
- **Annulla ultimo** (l'ANNULLA STEP): tenendo premuto −1 come oggi (ora con la didascalia «tieni
  premuto: annulla ultimo»), dal ⋯ della prova e dal toast subito dopo la registrazione.
- **Migrazione 2 → 3** (`004b`, `migrazione2a3`): `expandedMode` e `compactMode` escono dalle
  impostazioni dell'app e dalle copie che ogni prova porta con sé; `tastoRegistraVisibile` vale `true`
  per tutti. Chi aveva la Modalità Espansa tiene il tasto; chi non l'aveva lo vede (decisione G). La
  copia automatica «prima di aggiornare i dati (formato 2 → 3)» si fa come per le altre migrazioni. Un
  file del formato 2 si importa ancora. La «Modalità Espansa» sparisce dal cassetto.

### Punto 4 — Toast unico
`mostraToast(testo, { azione, durata })` in `002`, in basso, sparisce da solo (5 s), con un'azione
quando si può tornare indietro; `mostraToastTemplateEditor` ora passa di lì. `toastODialogo` sceglie:
esito pulito → toast, esito con qualcosa da leggere (anomalie, foto assenti, copie rinominate,
librerie accolte) → dialogo con tutto il testo. Diventano toast: intervalli multipli aggiunti,
import di progetti/archivio/ZIP puliti, coordinate GPS aggiornate da una foto, coordinate copiate,
voci d'archivio create o aggiornate, archivio litologico importato, template importati, ripristino
da Cronologia, immagini orfane rimosse, strati rilevati, βt applicato, interpretazione creata.
Restano dialoghi gli errori, le domande e i due messaggi della Fase 2 che dicono cosa fare dopo
(«Pacchetto creato», «Progetto ricevuto»).

**Registrare** mostra «Registrato 8,00–8,20 m · 14 colpi» con **Annulla**: toglie **proprio
quell'intervallo** con la stessa logica di ANNULLA STEP (`togliUltimoIntervallo`, ora condivisa), e
i colpi tornano nel contatore. Se nel frattempo si è già contato un colpo del successivo, o l'ultimo
non è più quello, non tocca niente e lo dice.

### Punto 5 — Scrittura
Date gg/mm/aaaa in Home e nei template; «1 progetto / 2 progetti», «1 prova», «1 intervallo»;
«Committente: X» con l'etichetta; decimali con la virgola nelle etichette nuove (contatore,
Registra, spie, quote e falda del Registro); maiuscola solo all'inizio («Nuovo progetto», «Foto della
prova», «Scatta foto», titoli del Registro e del grafico non più in maiuscolo).

### Punto 6 — Doppioni
Via dal cassetto «Registro Grafico Integrato» (c'è il tasto Grafico) e la sezione Accessibilità con la
Modalità Espansa; via «Chiudi» in Esporta, Foto e Template (resta la X, ora da 44); stato vuoto della
Home con un solo «Nuovo progetto» e un solo «Ricevi».

### Punto 7 — Home e card del progetto
- Testata «Progetti» (28) con «N progetti · N prove» (le interpretazioni 3B non contano come prove
  in più); a destra Template di report, Archivio litologico e Impostazioni, tutti da 44.
- Nessuna card dentro una card. «Nuovo progetto» (principale, 48, 2/3) e «Ricevi» (1/3).
- Promemoria del backup: una riga gialla compatta «Nessun backup completo» / «Backup completo 12
  giorni fa» con «Fai backup» e una X (Più tardi).
- Ricerca alta 44; filtri a pillola alti 44 **senza conteggi**: Tutti, In corso, Da elaborare,
  Consegnati (su una riga anche a 375).
- **Card tutta toccabile** che apre **l'ultima prova usata** (decisione H). A destra un ⋯ di 48
  separato da una linea: le azioni di progetto di oggi **e le note** («Note di progetto», icona
  `i-note`; il bottone con `i-file` sulla card non c'è più). Contenuto: nome (16, grassetto) e
  pillola dello stato; «Comune · Committente: X»; «N prove · n/N GPS · N foto»; «Modificato il
  gg/mm/aaaa · riprende dalla Prova N».
- Via le emoji residue: 📍 e 📡 nel GPS (e ⏳), ❌ nel badge delle foto, ➕/✏️ nei titoli della scheda
  dell'intervallo e nel Registro vuoto, 📐/📎/⚠️ nel messaggio delle foto importate.

### Punto 8 — Testi dei template
«In uso su questa prova» compare solo con una prova aperta (Vista Prova o Esporta PDF da lì), mai
dalla Home. «Classico è il layout di partenza: si può modificare, ma non rinominare né eliminare»
al posto di «non modificabile» (il tasto Layout lo modifica, e il codice lo consente).

### Punto 9 — Striscia «Salvataggio sospeso»
È la prima cosa della pagina e `position: sticky`: spinge giù il contenuto invece di coprire la
testata, e resta in vista scorrendo. Bottone «Cosa fare» da 44.

---

## 2. I compiti, prima e dopo (telefono, 375×812)

Conteggio dei tocchi oltre ai colpi stessi; la pressione lunga conta come un gesto.

| Compito | Prima | Dopo |
|---|---|---|
| Registrare 10 intervalli con una nota | 10 pressioni lunghe su +1 (nascoste, 0,5 s l'una) + nota: pillola + conferma = **12** | 10 tocchi su «Registra» (o 10 pressioni lunghe, come prima) + pillola + conferma = **12** |
| Aggiungere foto e GPS | icona GPS (1, la ricerca parte da sola) + icona foto (1) + «Scatta foto» (1) + chiusura (1) = **4** | spia GPS (1) + spia foto (1) + «Scatta foto» (1) + X (1) = **4** |
| Impostare la falda | scorrere fino al Registro + goccia (1) + Salva (1) = **2** e uno scorrimento | spia Falda in testata (1) + Salva (1) = **2**, senza scorrere |
| Correggere un intervallo | tocco sulla riga + «Modifica» + Salva = **3** (o scorrimento a sinistra + Salva) | invariato: **3** (la riga si tocca allo stesso modo) |

Nessun compito peggiora nei tocchi. Da sapere: la testata è più alta (spie e cerchietti da 44), quindi
a 375×812 il +1 parte da y = 447 (prima 353) e il Registro da y = 838 (prima ~592): per vedere le
righe si scorre un po' di più. È il disegno approvato; la vista Conta | Registro della Fase 6 lo
risolve.

---

## 3. Test

| Suite | Cosa | Esito |
|---|---|---|
| `toast_app.js` (nuova) | toast: testo, durata, azione, sostituzione, niente emoji, editor dei template; «intervalli multipli» come toast, esito con aggiunte come dialogo, errore come dialogo; controprova | 15 ok |
| `prova_in_campo.js` (nuova) | testata, ⋯, prove; spie nei tre stati; falda dalla spia; **Registra visibile di default** e con l'intervallo; registrazione e toast; **Annulla che toglie proprio quell'intervallo** e che rifiuta se è cambiato qualcosa; pressione lunga; Annulla ultimo dal ⋯ e da −1; **nascondi/mostra ricordato** anche riaprendo e senza toccare `modificatoIl`; note rapide e Registro; **niente testo < 12 px e comandi ≥ 44 px**; **migrazione 2 → 3** (Espansa attiva e spenta, copia prima, import di un file del formato 2); controprove | 70 ok |
| `home_progetti.js` (nuova) | testata e conteggi, nessuna card nella card, promemoria, filtri senza conteggi, card e ⋯ con le note, **card che apre l'ultima prova usata** (anche dopo un altro progetto e dopo aver riaperto l'app), template, finestre senza «Chiudi», cassetto, stato vuoto, misure, striscia sospesa; controprove | 44 ok |
| `test/dati/misure_stile.js` (nuovo aiuto) | legge da jsdom la cascata del CSS e risolve `var(--…)`: carattere di ogni testo visibile, altezza e larghezza dichiarate dei comandi | — |
| `schema_e_migrazioni.js`, `modifiche_vere.js`, `pacchetto_progetto.js` | aggiornate perché la catena arriva a 3: estraggono anche `migrazione2a3`, seguono `VERSIONE_SCHEMA_DATI`; i confronti restano esatti applicando all'originale solo la modifica voluta dalla 2 → 3 | verdi |
| `note_app_viva.js` | apre le note dal ⋯ del progetto (il bottone sulla card non c'è più) | verde |

Le controprove girano su `riferimento/`: lì CONFERMA era nascosta, il titolo era il comune, 0 foto
era ❌, c'erano testi sotto i 12 px e comandi sotto i 44, «Apri» portava alla prima prova, le card
stavano in una card, i filtri avevano i conteggi, il template diceva «non modificabile».
**`npm test`: 47/47 verdi, nessuna regressione.**

Verifica nel browser (anteprima Chromium su 127.0.0.3:8744 con i dati delle fixture) a 375×812 e
1280×800, tema scuro e chiaro: misure dal DOM (nessun testo < 12, nessun comando < 44 in Home e
Vista Prova, nessuno scorrimento orizzontale), Registra → toast → Annulla, menu ⋯ sopra le spie,
falda dalla spia, card che apre la prova giusta. Sul PC l'app resta la colonna di 600 px di prima.

---

## 4. Decisioni prese, da confermare

1. **Migrazione 2 → 3**: `tastoRegistraVisibile = true` per tutti, anche per chi aveva la Modalità
   Espansa spenta (è la decisione G); `expandedMode`/`compactMode` tolti anche dalle impostazioni
   copiate nelle prove.
2. **«Annulla ultimo» visibile**: nel ⋯ della prova (con la conferma di sempre) e nel toast dopo la
   registrazione (senza conferma: è il gesto stesso di annullare, e si rifà registrando di nuovo).
   Sul −1 una didascalia da 12 px «tieni premuto: annulla ultimo», al posto di quella da 9 px.
3. **Annulla del toast prudente**: agisce solo se l'intervallo del toast è ancora l'ultimo e nel
   contatore non c'è ancora nessun colpo; altrimenti non tocca niente e rimanda a −1.
4. **Ultima prova usata senza un campo nuovo**: è la prova con `updatedAt` più recente, che solo la
   prova aperta riceve a ogni salvataggio (`syncStateToProject`). Resta vera dopo il riavvio e viaggia
   nei pacchetti. A parità o senza date (dati molto vecchi): la prima, come prima.
5. **Template di report e archivio litologico in Home**: restano due icone da 44 accanto a
   Impostazioni (un tocco, come oggi), invece che dentro un ⋯ o nel cassetto. Il prototipo ha solo
   Impostazioni: è la via più prudente finché la Libreria (Fase 5) non li riunisce.
6. **Promemoria del backup** con una X («Più tardi») oltre a «Fai backup»: il prototipo non la
   disegna, ma oggi c'è e toglierla sarebbe una funzione in meno.
7. **Il «+» della nuova prova in fondo alla riga**, come nel prototipo (prima era in testa, per non
   dover scorrere con tante prove).
8. **Puntini GPS/foto sui cerchietti tolti**: lo stato della prova aperta lo dicono le spie; quello
   delle altre prove lo mostrerà la schermata Progetto (Fase 5).
9. **Grafico** è un interruttore: premuto (`aria-pressed`) mostra tabella e grafico separati, come
   prima la «vista classica»; il suo ⋯ ha il riconoscimento degli strati solo se ci sono almeno due
   intervalli (altrimenti il ⋯ non compare, come prima il bottone viola).
10. **Spie non a colonne uguali**, e sotto i 420 px foto e falda senza icona: con quattro colonne
    uguali «Falda 1,20 m» a 375 veniva tagliato.
11. **Etichette dei filtri**: «Consegnati» al plurale come nel prototipo; la pillola della card resta
    «Consegnato».
12. **Titoli fuori scala**: «Prova N» 22 px e «Registro · N intervalli» 17 px come chiesto dal
    prototipo, anche se non sono nella scala 12/14/16/20/28.
13. Le **quote del Registro** perdono la «m» (sta nell'intestazione «Prof. (m)»): a 12 px con la
    unità non stavano nella colonna.
14. **Conferma della nota rapida** mantenuta (un tocco in più ma protegge l'ultimo intervallo).

---

## 5. Da provare sul telefono

1. **Prima apertura**: in menu → Cronologia deve comparire «prima di aggiornare i dati (formato 2 → 3)».
2. **Testata**: «Prova N» leggibile e sotto nome del progetto e comune; toccando il titolo si apre
   l'intestazione; il ⋯ si apre e si chiude toccando fuori.
3. **Spie**: GPS tratteggiato → acquisire il GPS → diventa verde con la spunta. Foto: «0 foto»
   tratteggiata, dopo uno scatto «1 foto». Falda: impostarla dalla spia.
4. **Registra coi guanti**: contare qualche colpo, toccare «Registra …» (verde, 56 px), controllare il
   toast in basso e toccare **Annulla**: l'intervallo sparisce e i colpi tornano nel contatore.
   Registrare di nuovo. Provare anche la pressione lunga su +1 e su −1.
5. **Nascondi questo tasto** → riga tratteggiata; chiudere e riaprire l'app: resta nascosto; «Mostra
   il tasto» lo rimette.
6. **Note rapide**: le pillole vanno a capo, «Altra nota…» apre la nota libera.
7. **Registro**: «Grafico» alterna le due viste; «Aggiungi» offre «Un intervallo» e «Aggiungi
   intervalli multipli»; il ⋯ ha il riconoscimento degli strati.
8. **Home**: toccare una card in un punto qualsiasi apre il progetto dalla prova su cui si era rimasti
   («riprende dalla Prova N»); il ⋯ della card ha anche «Note di progetto».
9. **Toast**: dopo «Aggiungi intervalli multipli» non c'è più il dialogo da chiudere.
10. **Tema chiaro al sole** (in menu): spie, toast e Registra devono leggersi bene.
11. Velocità del contatore: nessun ritardo al tocco rispetto a prima.

---

## 6. Schermate e menù non ancora allineati allo stile nuovo (per le fasi successive)

- **Cassetto Impostazioni**: righe, interruttori, testi da 11–12,5 px, emoji nel pannello «Spazio
  occupato» (📄 📷 🖼️ 🕘 🗑️); riordino previsto nella Fase 5.
- **Finestre della prova**: Intestazione cantiere, Impostazioni della prova, Nuova prova, Nuovo
  progetto, scheda dell'intervallo (vista e modifica, con le note rapide a icone), Aggiungi intervalli
  multipli, GPS (schede dei metodi alternativi, testi piccoli), Foto (galleria), anteprima foto,
  fallback GPS delle foto. La Scheda prova unica è della Fase 4.
- **Esporta** (formati a colori, testi da 11 px) ed **Esporta PDF**: la Consegna unica è della Fase 5.
- **Azioni progetto** (descrizioni da 11 px, «Elimina progetto» da 12), Cronologia, Confronta prove,
  Porta/Ricevi sono già nel nuovo stile (Fase 2).
- **Gestione litologica**, archivio, preferenza della formula, wizard dei parametri avanzati.
- **Editor dei template** e dell'indice, **note di progetto** e i loro strumenti (hanno lavori propri).
- **Dialoghi** (`appDialog`: etichette dei campi da 11,5 px) e il **banner di annullamento** delle
  eliminazioni (`showUndoBanner`, 10 s): da unificare col toast.
- **Vista Prova, resti della Fase 6**: lucchetto e barra compressa del contatore, barra di stato fissa
  in alto, tabella e grafico della vista separata (intestazioni da 13 px, testi SVG del grafico), gesti
  di scorrimento sulle righe.
- Codice morto innocuo lasciato per la Fase 8: i listener di `btnCancelExportModal`,
  `btnCancelPhotosModal`, `btnCloseReportTemplates`, `chkIntegratedChart`, e `lblTotalDepth` nascosto.
