# Inventario dell'editor dei template (telefono)

> 27/09/2026. Primo passo della fase «Editor dei template», chiesta dall'utente: «storture, uso poco
> scorrevole, mancano i menù per eliminare, spostare ecc. i blocchi piazzati».
> Visto nel browser a 375×812 col template «Classico». Per ogni voce una proposta; la decisione è
> dell'utente.
>
> **T** tenere · **S** semplificare · **M** spostare · **U** unire · **V** togliere · **C** correggere (difetto)

## 0. Già corretto (commit 9a37335)
Il **⋮ del menu del blocco** (Sposta blocco, Rimuovi blocco) sul telefono non si apriva da nessuna
scheda tranne «Posizione»: la tendina finiva dentro quella scheda. Le azioni c'erano ma erano
irraggiungibili. Ora il ⋮ funziona da ogni scheda.

## 1. Il problema principale: come si arriva alle azioni di un blocco
Oggi, toccando un blocco:
- **un tocco** lo seleziona: compaiono un'etichetta minuscola («Tabella Colpi/Rpd», circa 8 px a zoom
  41%) e le maniglie. Nessun menu, nessun suggerimento.
- **un doppio tocco** apre il menu del blocco. Non è scritto da nessuna parte.
- Nel menu: schede Posizione · Dimensione · Stile · Contenuto (· Pagine); Sposta e Rimuovi stanno nel ⋮.
- **Duplica** non esiste, per scelta (id unici, vedi `029_blocco-in-spostamento.js`).

| # | Proposta | |
|---|---|---|
| 1 | Un tocco su un blocco **apre subito il menu** (il foglio dal basso), niente doppio tocco. Toccare fuori lo chiude. | S |
| 2 | In cima al menu, sempre visibili, **tre azioni come bottoni**: Sposta · Elimina · Chiudi. Il ⋮ sparisce. | S |
| 3 | «Sposta blocco» oggi porta solo **su un'altra pagina**. Aggiungere **Su / Giù** (nella stessa pagina) accanto a Sposta. | nuovo |
| 4 | Oggi «Rimuovi» elimina subito, e si recupera solo con ↶ in alto. Proposta: messaggio in basso «Blocco eliminato · **Annulla**». | S |

## 2. Barra in alto

| # | Cosa c'è | Proposta | |
|---|---|---|---|
| 5 | Titolo «Modific…» troncato | Il nome del template, per intero o con ellissi dopo il nome | C |
| 6 | Annulla / Ripeti | T | T |
| 7 | Salva | T | T |
| 8 | ⋮: Nascondi/visualizza riquadri · Schermo intero · Anteprima di stampa · Stile del testo · Salva come copia | T; «Riquadri» e «Schermo intero» sono rari | T |
| 9 | X | T | T |
| 10 | Riga «Anteprima con i dati di [ ] [ ] ⚠ Questa prova…»: due tendine senza testo visibile, avviso troncato | In una riga sola «Dati: Prova 2 ▾»; l'avviso dentro la tendina | S |

## 3. Il foglio

| # | Cosa c'è | Proposta | |
|---|---|---|---|
| 11 | Barra zoom (cursore + «Adatta») sopra il foglio, lo copre in parte | Solo «Adatta» e il pizzico con due dita; il cursore nel ⋮ | S |
| 12 | Etichetta del blocco selezionato, minuscola | Il nome del blocco sta in testa al menu (voce 1) | V |
| 13 | Maniglie di ridimensionamento sul blocco | T (per chi le vuole); larghezza e altezza anche nel menu | T |

## 4. «+» in basso a destra

| # | Cosa c'è | Proposta | |
|---|---|---|---|
| 14 | Apre un pannello a metà schermo con **Blocchi disponibili** e, sotto, **Colonne, Margini, Intestazione, Piè di pagina, Spaziatura, 🧹 Riordina pagina, Layout suggeriti** | Il «+» fa **solo** «Aggiungi blocco» (foglio dal basso con i blocchi) | S |
| 15 | Impostazioni della pagina mescolate ai blocchi | In «Pagine» (in basso) → ⋯ della pagina → «Impostazioni pagina» | M |
| 16 | Emoji 🧹 e ⚖️ nei bottoni | Icone del sistema `#i-…` (regola del piano) | C |

## 5. «Pagine» in basso
| # | Cosa c'è | Proposta | |
|---|---|---|---|
| 17 | Cassetto delle pagine | T; ogni pagina col suo ⋯ (Impostazioni pagina, Elimina pagina) | T |

## Cosa serve dall'utente
- Le scelte riga per riga (anche «ok a tutte»).
- 2–3 screenshot delle **storture** viste: qui sopra c'è quello che si vede aprendo l'editor, ma le
  storture che hai notato potrebbero essere altre (blocchi che si sovrappongono, testo che esce ecc.).

## Peso
Voci 1, 2, 4, 5, 12, 16: **piccolo-medio** (un passo). Voci 3, 10, 11: **medio**. Voci 14–15
(dividere «+» e impostazioni pagina): **medio**. Tutto insieme: una fase media, a passi con test.
