# Fase 6 — Il campo, sul telefono: esito

> Ramo `claude/epic-davinci-19p1z9`, 27/09/2026, da unire in `main`. `APP_VERSIONE` 2026.09.27.4.
> `VERSIONE_SCHEMA_DATI` 3 (invariata: nessuna migrazione).
> `npm test`: **48/48 suite verdi** (47 di prima + `conta_registro.js`), nessuna regressione.

Obiettivo: la Fase 6 del piano, secondo il prototipo approvato (lavagna, tavole «Prova in campo» e
«Registro»), corretta strada facendo dalle osservazioni dell'utente sul telefono (`OSSERVAZIONI.md`,
27/09/2026). Il modo in cui i dati si registrano non cambia.

---

## 1. Cosa è fatto

### Punto 1 — Due viste, «Conta | Registro»
- Sotto la testata due schede: **Conta** (contatore, Registra, note rapide e l'elenco «Intervalli»
  con gli ultimi 3) e **Registro · N** (il registro intero, oppure tabella e grafico).
- Via il **lucchetto** che comprimeva il contatore, la **barra compatta** e la **barra fissa** in
  alto: con le due viste non servono più. Tolti anche il loro JS e il loro CSS.
- Entrando in una prova dalla Home si parte da «Conta»; la vista non si ricorda.
- «Intervalli» (era «Ultimi intervalli», rinominato dall'utente): **toccando il titolo si inverte
  l'ordine dell'elenco**, con una freccia che dice il verso. Vale solo lì: il Registro e il grafico
  restano in ordine di profondità (decisione J). La scelta si ricorda.

### Punto 2 — Il Registro
- Il piano diceva «niente scorrimento dentro lo scorrimento». L'utente, provandolo, ha chiesto il
  contrario: senza riquadro la pagina diventa lunghissima. Ora registro, tabella e grafico
  **scorrono in un riquadro di poche righe** (480 px, come prima) e sotto c'è **«Mostra tutte le
  righe» / «Mostra meno righe»**, una scelta sola per tutti e tre, ricordata.
- «Riconosci strati» è un **tasto visibile** nel Registro (con almeno 2 intervalli), non più nel ⋯.
- Il comando per invertire l'ordine del Registro (decisione J, «al massimo») **non è fatto**: il
  registro integrato è una colonna stratigrafica e le quote sono disegnate sui confini delle righe;
  capovolgerla la renderebbe sbagliata. L'utente ha chiesto l'inversione solo per l'elenco degli
  intervalli, non per il grafico.

### Punto 3 — Le righe
- **Un tocco** sulla riga (e sulle barre del grafico, e sull'elenco «Intervalli») apre la scheda
  dell'intervallo **già modificabile**, senza chiamare la tastiera: ci sono **− e +** attorno ai colpi.
- La scheda dice **come e quando** l'intervallo è stato registrato e corretto («Registrato col
  contatore il 27/09/2026 alle 11:42 · corretto il …»), dai dati della Fase 1. Per gli intervalli
  di prima non c'è data e non si inventa.
- **Scorrendo a sinistra** la riga resta aperta e mostra **Modifica** ed **Elimina** (Elimina
  chiede conferma e poi offre Annulla, come prima); un tocco la richiude, aprirne un'altra chiude la
  prima. **Via «scorri a destra = elimina»**.

### Punto 4 — Fogli dal basso e spiegazioni
- Sotto i 760 px **ogni finestra sale dal basso a tutta larghezza**, alta al massimo il 92% dello
  schermo. Restano com'erano le schermate intere (editor dei template, indice, anteprima di stampa)
  e «Porta» / «Ricevi», che erano già fogli. Sul PC nulla cambia (verificato a 1280).
- Le spiegazioni fisse dei gesti (sotto −1, sotto Registra, sopra i due registri) sono in un solo
  riquadro **«Come si usa»**, dietro una **«?»** accanto a «Nascondi questo tasto» e in ciascun registro.

### Punto 5 — Note rapide su più righe
Era già fatto nella Fase 3.

### Fuori dal piano, dalle osservazioni dell'utente
- **Falda**: non è più una spia della testata (si indica una volta sola per prova). Si imposta dalla
  voce **«Falda: … m» / «Falda: non impostata»** nel ⋯ della prova. Impostata, si vede come linea nel
  Registro; se manca lo dice già il controllo prima dell'export, che apre la finestra giusta.
  Le spie restano GPS · Foto · Note, e sul telefono stretto la foto riprende la sua icona.
- Home: tolta la linea che separava il ⋯ nella card del progetto.
- Cassetto Impostazioni: l'ombra si vedeva sul bordo destro anche a pannello chiuso.

## 2. Preferenze nuove (dell'app, non del progetto)
`registroEspanso` e `intervalliRecentiInCima`: in `IMPOSTAZIONI_DELL_APP` (004e), quindi non cambiano
l'impronta né `modificatoIl`; riapplicate al cambio di prova come le altre (001). Si scrivono **solo
quando sono attive**: assenti valgono «no», così i dati salvati dei progetti restano identici a prima
(`modifiche_vere` e `schema_e_migrazioni` lo verificano). Nessuna migrazione serve.

## 3. Test
- Nuova suite `test/conta_registro.js` (55 controlli): le due viste, l'elenco e il suo ordine, il
  registro compatto ed espanso (anche tabella e grafico), le righe (tocco, scorrimento a sinistra e a
  destra, in verticale, due righe aperte, Modifica, Elimina), − e +, la provenienza dell'intervallo,
  la «?», il ritorno dalla Home. Controprove sull'app di prima: niente schede, lucchetto e barra
  fissa presenti, contatore e registro insieme, «scorri a destra» che chiedeva di eliminare.
- `test/prova_in_campo.js` aggiornata: la voce Falda nel ⋯, tre spie, la «?», il Registro in
  «Registro», le misure in «Conta».
- I fogli dal basso non hanno un test automatico: jsdom non applica le media query. Verificati nel
  browser a 375 e 1280 px.

## 4. Da provare sul telefono
1. Conta ↔ Registro; «Tutto il registro»; rientrare da Home riparte da Conta.
2. «Intervalli ↓»: toccandolo si capovolge l'elenco; chiudendo e riaprendo l'app resta.
3. Registro: scorre nel riquadro; «Mostra tutte le righe»; «Riconosci strati».
4. Una riga: tocco → scheda con − e +, senza tastiera; scorrere a sinistra → Modifica / Elimina;
   scorrere a destra non fa niente.
5. Le finestre salgono dal basso (Falda, scheda dell'intervallo, conferme).
6. ⋯ della prova → «Falda: non impostata» → impostarla → la voce dice «Falda: 1,20 m».

## 5. Rimasto aperto
- L'inventario della schermata di acquisizione (`INVENTARIO_ACQUISIZIONE.md`) aspetta le scelte
  dell'utente riga per riga. Di quelle voci questa fase ha fatto solo quelle già nel piano.
- Nell'intestazione del registro integrato «Prof. (m)» e «Colpi» si sovrappongono (c'era già).
- Le righe del registro integrato sono alte 34 px (sotto i 44 del piano): sono anche la scala del
  grafico, cambiarle tocca le quote disegnate sopra. Da decidere con la Fase 8.
- La scheda di sola lettura (`modalViewStep`) non si apre più da nessuna riga: da togliere nella Fase 8.
- Il ⋯ della prova, con la voce lunga «Strumento e impostazioni della prova», arriva quasi al bordo
  sinistro a 375 px.
