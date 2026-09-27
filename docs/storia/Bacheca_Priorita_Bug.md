# Bacheca delle priorità — audit usabilità e robustezza

> **Stato al termine dell'ultima sessione**
>
> - ✅ **P1.4 e P1.5 RISOLTI** — creati `appPrompt`/`appPromptCampi` sull'infrastruttura `appDialog` esistente; sostituiti tutti i 12 `prompt()` e tutti i `confirm()` nativi. Nel codice dell'app non resta nessun dialogo del browser: gli unici `window.prompt`/`window.confirm` rimasti sono la rete di sicurezza dentro `appDialog`, usata solo se il markup del dialogo non esistesse. Verificato con 29 controlli automatici.
> - ✅ **P0.2 e P0.3 RISOLTI** — nuova `salvaFotoConGaranzia`: attende la scrittura e la **verifica rileggendo la foto**, confrontando anche la lunghezza (una scrittura troncata per spazio esaurito non passa). Se fallisce, l'utente lo sa subito e può salvare la foto nei Download finché è ancora in memoria. Tutti e 4 i punti di chiamata convertiti, con avviso unico sugli import multipli. `getPhotoFromIDB` distingue nei log "foto assente" da "foto illeggibile". Verificato con 18 controlli, di cui 7 eseguendo davvero la funzione contro un IndexedDB simulato.
> - ✅ **P2.7, P2.8 e P2.9 RISOLTI** — nuova sezione "Spazio occupato" nel menu hamburger (usato/concesso con barra, peso separato di dati e foto, e quanto è recuperabile). Eliminare un progetto ora cancella le sue foto da IndexedDB, con lo stesso ritardo di 11s già usato per le prove così l'annulla resta affidabile; il RESET DATI svuota anche il database immagini. Il bottone "Foto orfane" ripara pure l'accumulo dei progetti cancellati **in passato**. Verificato con 26 controlli, di cui 13 eseguendo davvero le funzioni di calcolo.
> - ✅ **P1.6 RISOLTO** — i dialoghi ora si mettono in coda: uno aperto non viene più scavalcato dal successivo (prima il secondo sovrascriveva il primo, che spariva prima di essere letto, e la sua Promise non si risolveva mai). Nessun call site toccato: `appDialog` ritorna la stessa Promise di prima, cambia solo *quando* si apre. Verificato con 4 controlli su una simulazione della coda.
> - ✅ **P3.10, P3.11 e P3.12 RISOLTI** — zero elementi fantasma rimasti (erano 11), commento falso sulla falda corretto, e i 22 `catch` vuoti ora passano da `ignoraErrore(dove, e)`: l'errore continua a non interrompere nulla ma lascia una traccia con l'etichetta del punto esatto. La località di progetto è ora esplicitamente vuota con la spiegazione (è un dato della singola prova).
> - ✅ **Export "PDF da immagine" RIMOSSO** insieme a html2canvas e jsPDF: risolto il disallineamento alla radice, non serviva più. Due librerie esterne in meno all'avvio.
> - ✅ **Seconda scheda di stampa RIMOSSA**: il PDF si stampa da un iframe nascosto nella stessa pagina. Era la causa per cui nell'APK l'export "caricava ma non apriva niente".
>
> - ✅ **P0.1 RISOLTO nella parte che contava** — `saveState()` non fallisce più in silenzio: se lo spazio si esaurisce compare un avviso che dice di fermarsi e indica le due azioni che risolvono (Esporta backup, Foto orfane). Mostrato **una volta sola** finché il problema persiste, perché `saveState` viene chiamata ad ogni azione, e riarmato dopo il primo salvataggio riuscito. Riconosce lo spazio esaurito su tutti i browser (`QuotaExceededError`, il nome di Firefox, i codici 22/1014) e distingue quel caso da un errore generico. Verificato con 7 controlli sulla logica eseguita.
> - ⏸️ **Salvataggio su cloud** (l'altra metà di P0.1): rimandato per scelta. Richiede OAuth, credenziali applicative e una libreria pesante — sproporzionato finché i dati pesano pochi kB e il pannello spazio avvisa in anticipo.
> - ❌ **P3.13 chiuso senza intervento, ed è la scelta corretta**: un service worker serve a far funzionare offline un'app scaricata da un URL. Qui l'HTML è impacchettato dentro l'APK, quindi è **già** tutto locale: aggiungerlo non darebbe alcun vantaggio e introdurrebbe una cache da invalidare ad ogni aggiornamento — un problema in più, non uno in meno.
>
> **Tutte le voci dell'audit sono chiuse.**
> - ❌ **P0.1 declassato** (decisione tua): le prove pesano pochi kB, si valuterà semmai una soluzione online.
> - ❌ **P3.13 chiuso senza intervento** (decisione tua): l'app viene convertita in APK, il service worker non serve.


Analisi statica dell'intero file (1,93 MB, 546 funzioni, 35 modali). **Nessuna correzione applicata**, come richiesto.

**Metodo e suo limite.** Ogni voce qui sotto è stata verificata leggendo il codice reale, non dedotta. Dove uno scan automatico ha prodotto un sospetto, sono andato a leggere il punto esatto prima di elencarlo: i falsi positivi trovati così sono riportati in fondo (§5) invece di essere spacciati per bug. Quello che **non** ho potuto fare è provare l'app in un browser vero: le voci P1 (dialoghi nativi su mobile) sono le uniche che dipendono dal comportamento del tuo dispositivo e vanno confermate lì.

---

## P0 — Perdita di dati silenziosa

Sono i tre casi in cui l'app **perde qualcosa senza dirtelo**. Su un'app da cantiere valgono più di qualunque problema estetico.

### 1. Il salvataggio può fallire senza che nessuno se ne accorga
`saveState()` (riga ~5512) racchiude tutto in un `try/catch` che in caso di errore fa **solo `console.warn`**.

```js
localStorage.setItem('dpsh_app_state', JSON.stringify(cleanState));
} catch (e) {
    console.warn('saveState error:', e);   // <- l'utente non vede NIENTE
}
```

Se `localStorage` è pieno (quota superata), da quel momento **ogni salvataggio successivo non fa nulla** e tu continui a lavorare convinto che stia salvando. Te ne accorgi solo riaprendo l'app: la giornata di rilievo non c'è più. Non esiste alcun controllo di quota, né un indicatore di spazio, né un avviso.

*Direzione di fix:* intercettare `QuotaExceededError` e mostrare un avviso bloccante che dica cosa fare (esporta un backup, libera spazio); aggiungere un controllo preventivo con `navigator.storage.estimate()` e un indicatore in Impostazioni.

### 2. Le foto possono non essere scritte, e l'errore è impossibile da intercettare
`savePhotoToIDB()` è `async`, ma i 4 punti che la chiamano fanno così:

```js
try { savePhotoToIDB(p.id, p.dataUrl); } catch (idbErr) {}
```

Non c'è `await`. Un `try/catch` sincrono **non può** intercettare il fallimento di una funzione asincrona: quel `catch` è decorativo. Se la scrittura su IndexedDB fallisce (spazio, modalità privata, pulizia automatica di iOS) la foto è persa in silenzio, e la Promise rifiutata resta non gestita. Le foto sono materiale probatorio del rilievo: è il punto più delicato di tutti.

*Direzione di fix:* rendere le chiamate `await` con gestione reale dell'errore, e segnalare all'utente la foto non salvata invece di ingoiare.

### 3. Una foto illeggibile sparisce dal report senza un perché
`getPhotoFromIDB()` in caso di errore fa `return null`. A valle il `null` diventa una foto vuota nel PDF, senza alcuna spiegazione: sembra che la foto non fosse mai stata scattata.

*Direzione di fix:* distinguere "foto assente" da "foto non recuperabile" e mostrarlo nel report e nella galleria.

---

## P1 — Vicoli ciechi possibili su mobile

L'app si dichiara PWA `display: standalone` (manifest a riga 17) ed è pensata per il cantiere. In quel contesto i dialoghi nativi del browser sono un punto debole noto.

### 4. 12 funzioni passano da `prompt()` nativo
`prompt()` è soppresso o degradato da diversi browser in modalità standalone/PWA. Se succede sul tuo dispositivo, **queste funzioni diventano irraggiungibili senza alcun messaggio**:

| Funzione | Dove |
|---|---|
| Nome del nuovo template | creazione template |
| Nome della copia | duplica template |
| Rinomina template | libreria template |
| Righe/colonne tabella | editor Note |
| Indirizzo e testo del link | editor Note |
| Conferma RESET DATI LOCALE | impostazioni |

Esistono già `appAlert` e `appConfirm` stilizzate, ma **`appPrompt` non esiste**: è il pezzo mancante.

*Da confermare sul tuo telefono prima di intervenire* — se `prompt()` funziona, questa voce scende di priorità.

### 5. 8 `confirm()` nativi rimasti, incoerenti con il resto
Import archivio (JSON e ZIP), quota falda, aggiunta nota a un intervallo, import template. Stesso rischio del punto 4, con in più l'incoerenza visiva: metà app usa i dialoghi stilizzati, metà quelli del sistema.

### 6. `window.alert` è sovrascritto e non è più bloccante
Riga 5151: `window.alert = function (msg) { appAlert(msg); };`

`appAlert` ritorna una Promise che nessuno attende. Conseguenze concrete:
- due `alert()` di fila → **il secondo sovrascrive il primo**, che sparisce prima di essere letto, e il suo resolver resta appeso;
- il codice scritto assumendo che `alert()` blocchi prosegue immediatamente.

C'è un commento che documenta la scelta, ma non le conseguenze.

---

## P2 — Spazio occupato che non si può recuperare

### 7. Eliminare un progetto non cancella le sue foto
Confronto istruttivo, perché mostra che il problema è un'omissione e non una scelta:

- **Eliminazione di una PROVA** (riga ~11834): purge delle foto da IndexedDB **differito di 11 secondi**, e solo se l'annullamento non è stato usato. Fatto bene.
- **Eliminazione di un PROGETTO** (`performDeleteProject`, riga ~12329): nessuna cancellazione delle foto. Mai.

Ogni progetto eliminato lascia tutte le sue foto in IndexedDB, invisibili e per sempre. Su un dispositivo da campo l'accumulo è garantito.

### 8. Nemmeno "RESET DATI LOCALE" recupera lo spazio
Il reset esegue `localStorage.removeItem('dpsh_app_state')` + `location.reload()`. **IndexedDB non viene toccato.** Quindi anche l'azione più drastica disponibile all'utente non libera le foto orfane del punto 7.

### 9. Nessuna visibilità sullo spazio
Non esiste da nessuna parte un'indicazione di quanto stai occupando né di quanto resta. Combinato con P0.1, significa che il primo segnale di "spazio finito" è la perdita di dati.

---

## P3 — Codice morto, commenti falsi, diagnosi difficile

### 10. 11 elementi referenziati dal codice ma mai presenti nella pagina
Tutti protetti da `if (elemento)`, quindi **non causano crash** — ma sono funzioni fantasma:

`btnExportCsv`, `btnGestisciTemplateReport`, `selReportTemplate`, `btnSetFalda`, `btnResetFalda`, `dotFaldaSet`, `txtFaldaDa`, `txtFaldaA`, `lblCoords`, `lblGpsMeta`, `txtProjLocalita`

**Uno merita una verifica a parte:** `txtProjLocalita`. Alla creazione di un progetto il codice fa
`localita: txtProjLocalita ? txtProjLocalita.value.trim() : ''`
e poiché quel campo non esiste, **la località di un nuovo progetto viene sempre salvata vuota**. Da capire se è voluto (la località si imposta poi per singola prova) o se è un campo perso per strada.

### 11. Un commento dice il falso
Righe 4499-4503: «Gli input txtFaldaDa/txtFaldaA e btnResetFalda **restano negli altri punti dell'app** (modale rapida Falda, editing step) invariati.» Non è vero: quegli id non esistono più da nessuna parte. La modale falda funziona con altri id (`numQuickFaldaDa`/`numQuickFaldaA`). Un commento sbagliato in un file da 1,9 MB costa tempo alla prima manutenzione.

### 12. 32 `catch` che non dicono niente
27 completamente vuoti + 5 con solo un commento, su 73 totali. Alcuni sono legittimi (non far fallire la stampa per un errore nel controllo), ma la quantità rende impossibile diagnosticare un problema segnalato: quando qualcosa "non funziona e basta", il motivo è stato buttato via.

### 13. Nessun service worker
Il manifest dichiara `display: standalone` ma non c'è alcun service worker. Installata da un URL, **l'app non si apre offline**. Se invece la apri sempre come file locale, il problema non esiste — dipende da come la usi.

---

## 4. Ordine di lavoro proposto

| # | Voce | Impatto | Sforzo |
|---|---|---|---|
| 1 | Avviso su `saveState` fallito + quota | Evita perdita di una giornata | Basso |
| 2 | `await` + errore reale su salvataggio foto | Evita perdita di foto | Basso |
| 3 | Purge foto su eliminazione progetto + su reset | Recupera spazio | Basso |
| 4 | Indicatore spazio occupato/disponibile | Previene 1 e 3 | Medio |
| 5 | `appPrompt` + sostituzione dei 12 `prompt()` | Sblocca funzioni su mobile | Medio |
| 6 | Sostituzione degli 8 `confirm()` | Coerenza + mobile | Basso |
| 7 | `alert()` in coda invece che sovrascritto | Avvisi non più persi | Basso |
| 8 | Verifica `txtProjLocalita` (località progetto) | Dato mancante | Basso |
| 9 | Pulizia codice morto + commento falso | Manutenibilità | Basso |
| 10 | Log diagnostico al posto dei catch muti | Diagnosi futura | Medio |

I primi tre sono piccoli e coprono tutta la classe "perdita silenziosa": sono il punto di partenza che consiglio.

---

## 5. Verificato e risultato SANO

Elenco quello che ho controllato e che **non** è un problema, così non ci torniamo sopra:

- **Tutte le 35 modali hanno una via di uscita.** Nessun vicolo cieco. (`modalPhotoGalleryContainer` risultava sospetto allo scan: è un contenitore dentro una modale, non una modale.)
- **36 `data-action` su 37 hanno un handler**; il 37° ("Rimuovi blocco") è gestito tramite classe CSS anziché attributo. Nessun bottone morto nell'editor.
- **Eliminazione prova/progetto:** conferma esplicita + banner di annullamento con backup completo dell'oggetto. Ben progettata.
- **Purge foto su eliminazione prova:** differito di 11 secondi apposta per non rompere l'annullamento. Attenzione al dettaglio notevole — è proprio il confronto che rende evidente l'omissione al punto 7.
- **Librerie CDN (XLSX, ExcelJS, html2canvas, jsPDF):** tutte con guardia `typeof X === 'undefined'` e messaggio chiaro. L'export Excel offline degrada in modo pulito.
- **4 nomi di funzione duplicati** (`resetSwipeBackgrounds`, `getRational`, `readGpsIFD`, `fine`): sono in scope annidati diversi, nessun conflitto reale.
- **Sintassi:** `node --check` passa sull'intero script.
