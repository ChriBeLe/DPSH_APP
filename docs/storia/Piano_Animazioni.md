# Piano — Movimento: togliere lo "scattoso"

> Obiettivo: *«animazioni per tutte le interazioni, espansioni, risposte fisiche dei tasti, allargamenti e collassi dei menù… l'importante è che non mi tolga nessuna funzione o comprometta il funzionamento.»*
> Tutti i numeri qui sotto sono **contati nel file**, non stimati.

---

## 1. Il censimento

| | Quante |
|---|---|
| `transition` | 61 |
| `animation` | 22 |
| `@keyframes` | 19 |
| Regole `:active` | **19** |
| Bottoni `<button>` nel markup | **334** |
| Durate diverse in uso | **12** (0,05s · 0,08 · 0,1 · 0,14 · 0,15 · 0,16 · 0,18 · 0,2 · 0,22 · 0,25 · 0,3) |
| Curve diverse | `ease` ×83, `linear` ×48, più **4** cubic-bezier |
| `prefers-reduced-motion` | **0** |

Il primo numero che salta all'occhio: **334 bottoni, 19 regole `:active`.** Il 94% dei comandi non ha **nessuna** risposta al tocco. Il problema quindi non è che le animazioni siano fatte male — è che sulla stragrande maggioranza dei comandi non ci sono, e quello che c'è non condivide un ritmo.

---

## 2. Perché si sente "scattoso" — quattro cause, tutte misurate

### a) Si animano proprietà di layout (12 punti)

`width`, `left`, `top`, `right`, `max-height`. Ogni fotogramma di queste ricalcola il layout della pagina; `transform` e `opacity` no — il browser le passa direttamente al compositore. Su un telefono da cantiere è esattamente qui che i fotogrammi cadono.

Esempi reali nel file: `transition: width 0.35s`, `transition: top 0.2s, left 0.2s`, `transition: right 0.25s`.

### b) `transition: all` in 9 punti

Anima anche proprietà che non volevi — comprese quelle di layout che cambiano insieme alle altre. È il modo più facile per pagare il costo di (a) senza accorgersene.

### c) `max-height: 900px` come sostituto dell'altezza vera

`.expand-region` (il pannello del contatore, le card dell'archivio, le righe strato) si apre animando `max-height` da 0 a **900px fissi**. Due conseguenze:

- un contenuto più alto di 900px viene **tagliato**;
- sotto i 900px l'animazione "corre nel vuoto" per la parte eccedente, quindi **la velocità percepita cambia a seconda di quanto è pieno il pannello**. Un pannello corto sembra scattare, uno lungo sembra lento. Stessa transizione, due sensazioni: è proprio l'incoerenza che si legge come "scattoso".

### d) Dodici durate e sei curve

Due elementi vicini che si muovono a velocità diverse leggono come un errore, anche quando ognuno preso da solo è a posto. Non serve *più* animazione: serve **una sola cadenza**.

---

## 3. La regola che governa tutto: mai animare ciò che viene misurato

Questa è la risposta a *«non comprometta il funzionamento»*, e in questo progetto **non è una precauzione teorica**:

- l'animazione FLIP che scriveva `scale(x, 0)` da una misura ancora a zero è una delle cinque piste seguite sul bug dei blocchi invisibili;
- `azzeraTransformPerMisurazioneFlusso` è esistita apposta per ripulire i `transform` in volo **prima** di misurare, ed è stata rimossa solo quando la misura DOM è sparita dal calcolo dei tagli;
- il commento nel motore lo dice senza giri di parole: *«bastava un frame di animazione ancora in corso… per sballare il conteggio».*

Da qui tre vincoli, non negoziabili:

1. **Il foglio A4 e i suoi blocchi non si animano mai in geometria.** Niente `transform`, `width`, `height` sul contenuto del foglio. Si animano **pannelli, menu e comandi** — che nessuno misura.
2. **L'iframe di stampa resta intoccato.** La misura vera dell'impaginazione avviene lì, fuori schermo, dove le animazioni non esistono: è già al sicuro per costruzione e va lasciato così.
3. **Ogni animazione dev'essere interrompibile e senza stato.** Se un render arriva a metà, l'elemento deve comunque finire nello stato giusto. Concretamente: mai far dipendere un cambiamento di stato da `animationend` o `transitionend`, e mai lasciare uno stile in linea residuo. Il bug del transform residuo nasceva esattamente da lì.

---

## 4. Il piano

### ✅ Fase 1 — Una cadenza sola *(fatta)*

Quattro durate e due curve, in variabili CSS:

| Variabile | Durata | Per cosa |
|---|---|---|
| `--mov-istante` | 90ms | risposta al tocco, hover |
| `--mov-breve` | 160ms | comparse, cambi di stato, icone che ruotano |
| `--mov-medio` | 240ms | pannelli, espansioni, menu |
| `--mov-lungo` | 320ms | solo cambi di schermata |

| Curva | Valore | Per cosa |
|---|---|---|
| `--ease-entra` | `cubic-bezier(.22,.61,.36,1)` | qualcosa che entra o si sposta (è già la curva più usata nel file: 14 volte) |
| `--ease-inloco` | `cubic-bezier(.4,0,.2,1)` | qualcosa che cambia restando dov'è |

Poi si migrano le 61 transizioni esistenti su queste. **Zero animazioni nuove in questa fase**: lo stesso movimento di adesso, con un ritmo solo. È il passo che cambia di più la sensazione e che non può rompere niente, perché non tocca né cosa si muove né quando.

### ✅ Fase 2 — La risposta fisica dei tasti *(fatta)*

Una regola sola per tutti i bottoni: alla pressione `transform: scale(0.97)` in `--mov-istante`, che si annulla al rilascio. Copre 300+ comandi in un colpo, e il `transform` non tocca il layout.

Eccezioni **dichiarate**, non dimenticate:

- **+1 / −1 del contatore**: hanno già la loro risposta, tarata sul guanto. Non si toccano.
- **Le maniglie**: si trascinano, non si premono. Uno scalino sotto il dito mentre trascini sposta il punto di presa.
- **Tutto ciò che ha `touch-action: none`** (tela da disegno, slider, canvas): lì il tocco è già un gesto.

### ✅ Fase 3 — Togliere le tre cause di scatto *(fatta)*

- `transition: all` → liste esplicite di proprietà (9 punti).
- `width` / `left` / `top` / `right` → `transform: translate/scale` dove il risultato visivo è identico. Dove non lo è (una barra di avanzamento *deve* cambiare larghezza), si lascia e si dichiara perché.
- `max-height: 900px` → `grid-template-rows: 0fr → 1fr`, che anima l'altezza **vera**: nessun numero magico, nessun contenuto tagliato, velocità coerente a qualunque lunghezza.

### ✅ Fase 4 — Le espansioni che oggi non hanno movimento *(fatta)*

La striscia delle anteprime che collassa, il menu ⋮, la barra di spostamento, il cassetto pagine su desktop. Qui sì, movimento nuovo — ma solo su pannelli, cioè fuori dalla zona misurata.

### ✅ Fase 5 — `prefers-reduced-motion` *(fatta: costava tre righe, tanto valeva farla subito)*

Un blocco solo che porta tutte le durate a ~1ms. **Non toglie nessuna funzione**: gli stati finali restano identici, sparisce solo il tragitto. Serve a chi soffre di chinetosi, e come interruttore d'emergenza se sul telefono qualcosa risultasse pesante.

### ✅ Fase 6 — Verifica *(fatta)*

Test statici che controllano ciò che a occhio non si vede:

- nessuna durata o curva fuori dalla scala (il test le conta, come ha già fatto per gli idiomi dei controlli numerici);
- **nessun selettore del foglio A4 con transizioni geometriche** — è il vincolo n.1 reso automatico;
- nessun cambiamento di stato appeso a `animationend`/`transitionend`;
- nessuno stile in linea residuo dopo un'animazione;
- le sei suite esistenti (223 controlli) devono restare verdi.

---

## 5. Cosa NON animo, e perché

- **Il contenuto del foglio e i blocchi** — sono misurati.
- **Il ghost del trascinamento** — segue il dito con 0,05s *apposta*: alzare quel numero lo farebbe "nuotare" dietro al dito, che è peggio di non animarlo affatto.
- **L'anteprima dal vivo degli slider** — deve restare istantanea, altrimenti il numero nel campo e il disegno sul foglio dicono due cose diverse nello stesso momento.
- **Il canvas durante il pinch e il pan** — è già guidato dal dito: qualunque interpolazione aggiunge ritardo a un gesto che di ritardo non ne vuole.

---

## 6. ✅ Esito delle fasi 1, 2 e 5

| Misura | Prima | Ora |
|---|---|---|
| Durate diverse | 12 | **4 token** (+2 eccezioni dichiarate) |
| Curve | 6 | **2 token** (+`linear` per le barre di avanzamento) |
| Transizioni sui token | 0 | **65** |
| `transition: all` | 9 | **0** |
| Bottoni con risposta al tocco | 19 su 334 | **tutti** |
| `prefers-reduced-motion` | assente | presente |

**Le due eccezioni fuori scala sono rimaste, e sono scritte nel codice come tali**: il ghost del trascinamento (50ms) e l'indicatore di rilascio (80ms). Inseguono il dito — portarli a 160ms li farebbe visibilmente nuotare indietro, che è peggio di non animarli.

Un errore che la migrazione automatica aveva introdotto e che il controllo ha ripreso: sul pannello dei blocchi la `visibility` era `0s linear 0.25s` — **durata zero, ritardo un quarto di secondo**. La sostituzione meccanica aveva scambiato le due cose, dando alla visibilità una durata di 90ms. Corretto a mano: `visibility 0s linear var(--mov-medio)`, cioè scatto istantaneo ritardato quanto lo scorrimento del pannello, che è ciò che il commento originale diceva di volere.

Sulle eccezioni della risposta al tocco ho tolto quattro regole che avevo scritto e che **non facevano niente**: maniglie e targhetta del blocco sono `<div>` e `<span>`, quindi la regola sui bottoni non li raggiungeva mai; e `.btn-touch` ha già la sua risposta scritta più avanti nel foglio, che vince da sola. Ne resta **una sola vera**, il lucchetto del contatore — che è un bottone davvero, e che ha già un anello di avanzamento sul medesimo gesto.

## 7. ✅ Esito delle fasi 3 e 4

**Il pannello laterale** (`.drawer`, il più grande dell'app) scorreva animando `right`: ricalcolo del layout a ogni fotogramma, per il pannello e per tutto ciò che ha intorno. Ora è `transform: translateX(100%) → 0`, che il browser passa direttamente al compositore. Risultato a schermo identico; cambia solo quanto lavoro fa il telefono. E `right: 0` fisso invece di `right: -340px` significa che a chiuso è fuori schermo **qualunque sia la sua larghezza reale** — 340px o il 90vw del telefono — senza due numeri da tenere allineati.

**Le barre che devono cambiare larghezza restano tali, ed è scritto perché**: nel grafico a barre la larghezza *è il dato*.

**Le animazioni** (non solo le transizioni) sono passate sulla stessa scala: 11 migrate. Le uniche durate letterali rimaste sono quelle **cicliche** — pulsazioni, spinner, rimbalzi d'attenzione — e restano fuori scala di proposito: la scala descrive le transizioni di stato, non il ritmo di un battito.

**Le due tendine di azioni** (⋮ del blocco e barra di spostamento) apparivano di colpo. Ora entrano. Si anima **solo l'ingresso, non l'uscita**, e non è una scorciatoia: un'animazione d'uscita obbligherebbe a ritardare la chiusura fino alla sua fine, cioè a tenere in vita un pannello che lo stato dà già per chiuso — esattamente il tipo di stato appeso a un'animazione che il vincolo n.3 vieta, e la stessa famiglia del bug del pannello «visibile col FAB già a +» che abbiamo dovuto correggere. Chiudere resta istantaneo.

### Il `max-height: 900px` — risolto senza rischio

Il numero inventato resta al suo posto, e **sopra** c'è un blocco `@supports (interpolate-size: allow-keywords)` che anima l'altezza **vera** (`height: 0 → auto`): nessun numero magico, nessun contenuto tagliato, stessa velocità a qualunque lunghezza.

La scelta di metterlo dentro `@supports` non è pigrizia: la tecnica alternativa (`grid-template-rows: 0fr → 1fr`) avrebbe richiesto di **aggiungere un `<div>` contenitore a otto punti del markup** — corpo del contatore, tre accordion GPS, righe strato, card archivio — cioè toccare la struttura di mezza app per un guadagno estetico. Così invece: sui motori che conoscono `interpolate-size` è meglio, su quelli che non lo conoscono è **identico a prima**. Non c'è uno scenario in cui peggiora.

## 8. Riepilogo finale

| Misura | Prima | Ora |
|---|---|---|
| Durate diverse (transizioni) | 12 | **4 token** + 2 eccezioni dichiarate |
| Durate diverse (animazioni) | 11 | **4 token** + le cicliche |
| Curve | 6 | **2 token** |
| `transition: all` | 9 | **0** |
| Bottoni con risposta al tocco | 19 su 334 | **tutti** |
| Animazioni su `right` del pannello grande | sì | **no** |
| `prefers-reduced-motion` | assente | presente |
| Contenuto tagliabile dal `max-height` | sì | **no**, dove il motore lo consente |

**43 controlli sul movimento**, più le sei suite esistenti: 267 in totale, tutti verdi.

---

## 9. Secondo giro: cosa era rimasto fermo

Censimento fatto dopo le prime fasi, cercando quello che ancora non si muoveva.

**Già a posto e non toccato**: interruttori (il pallino trasla già con `transform`), modali, toast dell'editor, barra di stato appiccicosa, miniature pagina, blocchi che entrano nel canvas.

| Fatto | Cos'era | Cos'è |
|---|---|---|
| **Il colore al tocco** | La regola globale animava solo `transform`: un tasto si comprimeva in modo fluido e cambiava colore a scatto **nello stesso gesto**. Due velocità sullo stesso elemento si notano più di nessuna animazione — ed era un difetto che avevo introdotto io nella fase 2. | `background-color`, `border-color` e `color` sulla stessa durata del tocco. `background-color` e non la scorciatoia `background`: quella include anche l'immagine di sfondo, e interpolare un retino litologico non ha senso. |
| **Il numerone dei colpi** | 72px al centro della schermata, l'elemento più guardato in cantiere: passava da 12 a 13 senza nessun riscontro. Con il guanto e il rumore del maglio, "la cifra è diversa" non basta. | Una spinta breve (`scale` 1→1.09→1), **non un lampeggio di colore**: il colore del numero dipende dal tema, e cambiarlo lo renderebbe illeggibile proprio mentre lo guardi. Scatta **solo quando il valore cambia davvero**, non a ogni `updateUI` — che gira anche per motivi che col conteggio non c'entrano. |
| **Le schede del menu blocco** | `display:none` ↔ visibile: cambiando scheda il pannello si sostituiva di colpo, e le due sembravano la stessa che cambia contenuto da sola. | Un accenno di entrata da 6px. Il pannello resta dov'è, cambia solo quello che c'è dentro. |
| **La barra compatta del contatore** | Compariva dal nulla nello stesso istante in cui il pannello spariva: due cambiamenti simultanei senza legame visivo. | Entra dall'alto, così racconta che è ciò che **resta** del pannello, non una cosa nuova. |
| **Il cambio pagina nell'editor** | Il foglio si ridisegnava senza il minimo stacco: non si capiva se il tocco avesse fatto qualcosa. | Un velo di opacità (0,35 → 1). **Solo opacità, mai uno scorrimento**: uno scorrimento racconterebbe meglio la direzione, ma il foglio è la zona misurata e un `transform` in volo su di lui è esattamente ciò che il vincolo n.1 vieta. |

### Cosa ho deciso di NON fare, e perché

**Le righe che compaiono** — registro, card progetto, card archivio, righe strato. Sembra il candidato ovvio, ma non lo è: quelle liste vengono **ricostruite per intero a ogni render**, quindi "la riga nuova" non è distinguibile senza cambiare il modo in cui vengono disegnate. Animarle tutte a ogni ridisegno vorrebbe dire farle pulsare a ogni modifica — ed è una lezione che questo codice ha già imparato: esiste `pendingBarGrowAnim` proprio per evitare che le barre "sfarfallino ad ogni singolo colpo registrato durante la battitura".

Va fatto, ma come lavoro a sé: prima serve un modo per riconoscere la riga nuova, poi l'animazione. Non il contrario.
