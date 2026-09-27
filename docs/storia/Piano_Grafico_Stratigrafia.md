# Piano — Colonna stratigrafica: falda, leggibilità, retini nitidi

> Riferimento: l'allegato "Stratigrafia - PROVA N° 1" (grafica vecchia, contenuto giusto).
> Ambito: `buildStratigrafiaColpiRpdSvg`, solo il **pannello A**. I pannelli Colpi(N) e Rpd non si toccano — sono già a posto.

---

## 1. La falda manca del tutto

**Il dato c'è già, non arriva al disegno.** `header.faldaDa` / `header.faldaA` esistono, li legge `faldaDaHeader()` (che restituisce `Infinity` quando la falda non è stata rilevata) e li usa già tutto il calcolo: correzione Nspt′ per dilatanza, peso di volume saturo, colonna "in falda" nelle tabelle.

Ma la firma del grafico è `(stratiEff, logsCalc, numeroProva, compattezza, opzioni)`: **la falda non entra**. Non è una dimenticanza di disegno, è un parametro mai passato.

Entrambi i chiamanti reali hanno già `falda` in mano nella riga sopra la chiamata, quindi si passa da `opzioni.falda`. Il terzo chiamante — l'anteprima nell'editor — ricostruisce il grafico da `raw`, dove la falda va aggiunta accanto a `stratiEff`/`logsCalc`.

**Cosa disegno**, colonna dedicata (~14px) tra la colonna litologica e la legenda:

- barra azzurra da `faldaDa` a `faldaA`, riquadrata come la colonna litologica;
- se `faldaA` manca, la barra scende fino a fondo scala (è il caso dell'allegato: da 4,10 in giù);
- il simbolo ▽ alla quota di inizio, sulla convenzione classica dei log di sondaggio;
- voce **"falda"** in legenda, in cima come nell'allegato.

**L'aggiunta rispetto al tuo esempio** (che infatti non ce l'ha): **l'intervallo scritto**. `4,10–10,00 m` accanto al simbolo, oppure `da 4,10 m` quando il fondo non è definito. È il dato che nell'allegato bisogna dedurre a occhio dal disegno.

**Se la falda non è rilevata la colonna non si disegna affatto** — niente colonna vuota che ruba larghezza a un grafico che stiamo cercando di rendere più compatto.

---

## 2. I numeri degli spessori si leggono male

Oggi: `7px`, testo scuro con alone bianco da 2px, e una soglia `if (h >= 12)`.

Due problemi distinti:

- **7px con un alone da 2px** su un retino fitto: l'alone si mangia il tratto della cifra.
- **Sotto i 12px di fascia il numero sparisce del tutto**, senza che nulla lo segnali.

Diventa: **8px, bianco in grassetto con contorno scuro** — la scelta del tuo allegato, ed è quella giusta perché si legge sia sui retini chiari (sabbie, travertini) sia su quelli scuri (argille, tufi), mentre il nero-su-alone-bianco funziona solo sui primi. Soglia abbassata a **9px**.

Sotto i 9px il numero non c'è, e lo dico invece di nasconderlo: su una fascia da 0,1 m non esiste spazio fisico per due cifre, e il valore è comunque nella tabella degli strati.

---

## 3. I nomi delle litologie vengono tagliati

Oggi: `(lit.name || '').substring(0, legendCharsMax)` con `legendCharsMax = max(6, round(16 × K))`. Cioè **troncamento secco a metà parola**, e più condensi il blocco più taglia: a compattezza minima restano 6 caratteri.

Diventa, come hai scelto — **ancorato alla fascia, con anti-collisione**:

- il nome resta all'altezza del suo strato (il collegamento nome↔fascia si mantiene);
- va **a capo sulle parole**, fino a 3 righe, con `<tspan>`;
- **anti-collisione in una passata dall'alto**: ogni etichetta parte alla quota della sua fascia; se il suo bordo superiore invade il bordo inferiore della precedente, scivola giù del minimo indispensabile. Se l'ultima sfora il fondo del grafico, si recupera comprimendo all'indietro.

Il taglio con "…" resta solo per il caso estremo: parola singola più lunga della colonna (`CALCARENITE` a compattezza minima). Meglio una parola troncata dichiarata che tre righe che escono dal foglio.

`legendW` cresce un po': è la colonna che serviva davvero, e lo spazio si ricava dalla condensazione degli altri elementi.

---

## 4. I retini escono sfocati e sbiaditi nell'export — causa trovata

I 30 retini litologici **non sono vettoriali**: sono PNG 8×8 con canale alfa, estratti pixel per pixel dal foglio di riferimento (`Nardò_DPSH1.ods`). Il tratteggio è nero opaco, lo sfondo trasparente, e il colore dell'utente passa sotto.

Ci sono **due percorsi** per disegnarli, e uno solo dei due è protetto:

| Percorso | Codice | Ricampionamento |
|---|---|---|
| CSS (tabelle, legenda, selettore) | `getPatternCss` | `image-rendering: pixelated` ✅ |
| SVG (grafico stratigrafico) | `getSvgPatternDef` | **niente** ❌ |

`getSvgPatternDef` emette `<image href="..." width="8" height="8"/>` e basta. In stampa il PDF ricampiona quel tassello a DPI più alto: senza `pixelated` l'interpolazione bilineare trasforma una linea da **1 pixel** in una sfumatura grigia larga tre. Che è, letteralmente, "sfocati e sbiaditi" — e spiega perché nella tabella i retini si vedono e nel grafico no: è lo stesso PNG, reso da due percorsi diversi.

**Correzione**: `image-rendering="pixelated"` sull'`<image>` del pattern, con `crisp-edges` come ripiego per i motori che non supportano il primo.

**Da guardare su un PDF vero prima di dare per chiuso**: a 8px il tassello potrebbe restare troppo fitto dentro una colonna larga 20px — nel tuo allegato la colonna è più larga e il retino proporzionalmente più grosso. Se è così, il secondo passo è **raddoppiare il tassello a 16px solo nella colonna stratigrafica**, lasciando 8px ovunque altrove. Non lo do per scontato adesso: `pixelated` da solo potrebbe già bastare, e cambiare la scala del retino significa allontanarsi dalla resa del foglio di riferimento.

---

## ✅ Esito

Passi 1-4 fatti. Verifica in due strati: 47 controlli sul codice e **22 che eseguono davvero la funzione vera** estratta dal file e leggono l'SVG prodotto — falda presente/assente/oltre fondo scala/negativa, 14 strati sottili, compattezza minima, e il controllo che nessun testo e nessun riquadro esca dal riquadro del grafico.

Numeri misurati, non stimati: senza falda il grafico è **esattamente 16px più stretto** (la colonna non c'è e non lascia il vuoto); a compattezza piena il nome più lungo dell'allegato — `SABBIE LIMOSE CON INTERVALLI DEBOLMENTE CEMENTATI` — entra **intero su tre righe**, senza "…" e senza il `TENE-` a metà parola.

Resta da guardare a occhio, su un PDF vero: se a 8px il tassello del retino sia abbastanza grosso dentro una colonna larga 20px, o se serva raddoppiarlo a 16px solo lì.

## Ordine di lavoro

| # | Passo | Perché in questo punto |
|---|---|---|
| **1** | Retini nitidi (`image-rendering`) | Una riga, effetto immediato, indipendente da tutto il resto. Poi guardi un PDF e decidiamo se serve anche il tassello più grande. |
| **2** | Colonna falda + simbolo + intervallo scritto + voce in legenda | È l'unico passo che richiede di **passare un dato nuovo** attraverso tre chiamanti: va fatto prima che il pannello A cambi geometria sotto i piedi. |
| **3** | Numeri degli spessori | Indipendente, veloce. |
| **4** | Nomi a capo + anti-collisione | Ultimo perché è **geometria**: va calcolato sulla larghezza definitiva della legenda, che il passo 2 modifica. |
| **5** | Verifica | Conversioni e collisioni eseguite davvero sui casi limite: falda assente, falda oltre fondo scala, strato da 0,05 m, nome lunghissimo, compattezza minima, uno strato solo. |

I passi 1 e 3 sono separabili: si può fermarsi lì e avere già un grafico migliore.

## Cosa NON tocco

- **I pannelli Colpi(N) e Rpd** — li hai dichiarati a posto, e ogni modifica lì rimetterebbe in gioco la scala automatica degli assi.
- **La scala automatica della profondità** (`profonditaAsseAutomatica`) e l'altezza del grafico: sono già regolabili dal menu del blocco.
- **I PNG dei retini**: restano quelli del foglio di riferimento. Rifarli vettoriali sarebbe la soluzione "giusta" ma sono 30 texture e cambierebbe la resa rispetto al documento da cui vengono.
