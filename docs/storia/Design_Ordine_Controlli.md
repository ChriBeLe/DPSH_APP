# Critica di design — Il menu del blocco e l'ordine dei controlli

> Stato: dopo le schede orizzontali (Posizione · Dimensione · Stile · Contenuto · Pagine).
> Ambito: menu del blocco nell'editor template, mobile-first. Le regole valgono per tutta l'app.

---

## Impressione generale

Le schede hanno risolto la **lunghezza**, non il **disordine**. Dentro ogni scheda i comandi restano un elenco di cose diverse messe in fila: tre bottoni, una spunta, uno slider, un campo, due frecce. Il problema non è più "dove sta la cosa che cerco" ma "che tipo di oggetto è questo e cosa mi aspetto che faccia".

La radice è misurabile: **14 etichette di sezione** e **sei modi diversi di impostare un numero** nello stesso pannello.

---

## Il censimento (dal codice, non a occhio)

| Modo di impostare un numero | Dove | Esempio |
|---|---|---|
| Cursore + campo + unità ✅ | 6 controlli | Larghezza, carattere, altezza grafico |
| Due tasti `−` / `+` col valore in mezzo | 2 | Altezza spazio, Zoom mappa |
| Campo numerico nudo + tasto "Auto" | 1 | Profondità asse |
| Cursore **senza** campo | 4 | Opacità toponimi, scala toponimi, posizione X/Y etichetta |
| Tendina | 1 | Foto da mostrare |
| Campo di testo | 2 | Testo etichetta, didascalia |

E **tre spunte** (`Larghezza fissa`, `Blocca posizione`, `Toponimi`) che non sono spunte: sono interruttori di modalità.

Quattro modi diversi di dire *"torna com'era"*: il tasto "Auto", `caption-reset`, `pan-reset`, e il doppio tocco sui cursori. Nessuno dei quattro si somiglia.

---

## Usabilità

| Problema | Gravità | Rimedio |
|---|---|---|
| "Rimuovi blocco" è un bottone a tutta larghezza in fondo — cioè **il punto più comodo per il pollice** occupato dall'azione più distruttiva e più rara | 🔴 | Fuori dal flusso: in un ⋮ nella testata del menu, accanto al nome del blocco |
| Sei idiomi per impostare un numero: ogni volta bisogna capire *come* si usa prima di usarlo | 🔴 | Un solo componente (esiste già: `htmlControlloNumerico`), migrare gli altri sei |
| Le spunte non dicono cosa succede quando le spunti — "Larghezza fissa ☐" non è una frase | 🟡 | Interruttori con etichetta di stato: **Larghezza · fissa / libera** |
| Paragrafi di spiegazione in mezzo ai comandi (griglia tabella, margini, profondità asse, interruzioni): occupano più spazio dei comandi stessi | 🟡 | ℹ️ nella testata di sezione, che apre la spiegazione in `appDialog` |
| Quattro modi di azzerare | 🟡 | Uno solo: ↺ nella testata di sezione, sempre nello stesso posto |

---

## Gerarchia visiva

**Cosa attira l'occhio per primo**, dentro una scheda: niente. Tutte le sezioni hanno lo stesso peso — stessa etichetta minuscola in maiuscoletto, stesso stacco. Un pannello senza gerarchia si legge tutto o niente.

**Ordine di lettura mancante**: dentro "Dimensione" si trova Larghezza, poi Zoom, poi una spunta, poi un bottone d'azione, poi la scala del grafico. Sono tre cose diverse (misure, vincoli, azioni) mischiate.

**L'ordine giusto, uguale in ogni scheda:**

1. **Che cos'è** — le scelte fra alternative (allineamento, griglia, livello titolo). Bottoni a segmenti.
2. **Quanto è grande** — le misure. Sempre cursore + campo + unità.
3. **Vincoli** — gli interruttori (larghezza fissa, posizione bloccata).
4. **Azioni** — i verbi (Bilancia riga, Modifica testo, Dividi, Condensa). Sempre in fondo, sempre con l'icona a sinistra.

Quattro fasce, sempre nello stesso ordine. Chi impara una scheda le ha imparate tutte.

---

## Coerenza

| Elemento | Incoerenza | Rimedio |
|---|---|---|
| "Dimensione" | È il nome di una **scheda** e anche di una **sezione** dentro Stile | Scheda "Dimensione" resta; la sezione diventa "Carattere" |
| "Altezza" | Usata per: altezza righe, altezza riquadro foto, altezza grafico, altezza spazio | Sempre "Altezza" + il complemento: "Altezza righe", "Altezza foto", "Altezza grafico", "Altezza spazio" |
| "Zoom" | Zoom del contenuto e zoom della mappa | Contenuto → "Ingrandimento"; mappa → "Zoom mappa" (è il termine delle mappe, si tiene) |
| "Scala del grafico" | Contiene profondità asse **e** altezza: due cose | Diventa "Grafico", con dentro "Profondità asse" e "Altezza grafico" |
| "Manutenzione" | Suona come un pannello di sistema; dentro ci sono azioni sul layout | **"Sistema la pagina"** |
| Etichette di sezione | 14, tutte in maiuscoletto 9,5px | Le sezioni con un solo comando perdono l'etichetta: il comando la porta già dentro |

---

## Accessibilità

- **Bersagli**: i cursori sono a 30px di altezza, i campi a 40px su mobile. I bottoni a segmenti a 42px. Sotto i 44px raccomandati, ma con le aree espanse già introdotte è accettabile. Le **spunte a 19px** sono l'eccezione vera: diventando interruttori arrivano a 44 senza sforzo.
- **Contrasto**: le etichette di sezione usano `--text-muted` a 9,5px in maiuscoletto — è la combinazione peggiore possibile (piccolo + chiaro + spaziato). Portare a 11px e al colore del testo normale, togliendo il maiuscoletto.
- **Stato**: gli interruttori devono dire lo stato **a parole**, non solo con il colore.

---

## Cosa funziona già bene

- **Il controllo numerico condiviso** è il modello giusto: cursore per esplorare, campo per essere esatti, unità dichiarata, fondo scala visibile. Non va ridisegnato — va **esteso agli altri sei**.
- **Le schede** hanno una divisione sensata e ricordano dove eri.
- **Gli avvisi misurati** (millimetri veri, pagine reali) sono onesti e utili: nessun numero inventato.
- **Il doppio tocco per azzerare** è un gesto esperto ben scelto; va solo affiancato da un comando visibile per chi non lo conosce.

---

## Priorità

1. **Un solo modo di impostare un numero.** Migrare i sei controlli rimasti su `htmlControlloNumerico`. È il cambiamento con più effetto: elimina cinque idiomi in un colpo e non richiede alcuna nuova invenzione.
2. **Le quattro fasce in ogni scheda** (scelte → misure → vincoli → azioni) e "Rimuovi blocco" fuori dal flusso, in un ⋮.
3. **Interruttori al posto delle spunte**, con lo stato scritto.
4. **Un nome per concetto** e le spiegazioni dietro ℹ️.

I punti 1 e 3 sono meccanici e verificabili. Il 2 è quello che cambia davvero la sensazione d'ordine. Il 4 costa poco e si nota molto.

---

---

## ✅ Esito — il collaudo era scritto nei numeri

| Misura | Prima | Ora |
|---|---|---|
| Idiomi per impostare un numero | 6 | **1** |
| Spunte nel menu | 3 | **0** |
| Etichette di sezione | 14 | **9** |
| Nomi usati per due cose diverse | 4 | **0** |
| "Rimuovi blocco" | in fondo, a tutta larghezza | in un ⋮ nella testata |

Tutto vale **su desktop e su mobile**: fra le due modalità cambia quanto i comandi sono condensati, non l'ordine in cui si leggono. (Il riordino a fasce era finito per sbaglio dentro la funzione delle schede, che su desktop esce subito — corretto: ora vive in una funzione condivisa, quindi le due modalità non possono divergere.)

Tre errori trovati dai test, non a occhio:

- un'icona `unlock` **inesistente** nel set, che avrebbe lasciato un buco quando il blocco è sbloccato;
- l'opzione del dialogo scritta `titolo` invece di `title`, ignorata in silenzio;
- l'anteprima di "Altezza righe" che aggiornava **una sola** fetta di un blocco lungo.

## Nota di metodo

Il censimento viene dalla lettura del codice: 14 etichette di sezione, 3 spunte, 6 idiomi numerici, 4 modi di azzerare. Non è un'impressione — sono conteggi, e serviranno anche come collaudo: a lavoro finito i numeri devono essere 1 idioma numerico, 0 spunte, 1 modo di azzerare.
