# Prompt per riprendere il lavoro

Copia tutto il blocco qui sotto in una nuova sessione aperta sulla cartella del progetto.

---

Riprendiamo la riarchitettura dell'app **DPSH Field Collector**, in
`C:\Users\chris\Desktop\Progetti\DPSH APP\DPSH` (repository git, ramo `main`).

**Come devi lavorare (vincolante):**
- **Niente agenti né subagenti.** Lavori tu, direttamente.
- **Stile ponytail:** modifiche minime, niente astrazioni o funzioni «per il futuro», stesso stile del codice che c'è.
- **Uso limitato.** Il mio budget d'uso è limitato. Esegui **solo le suite di test che riguardano la modifica** (`node test/esegui_tutti.js <parola>`). La suite completa (`npm test`) solo a fine fase. Nel browser fai una verifica rapida, non giri lunghi.
- **Prima di un lavoro grosso, dimmi quanto pesa** e aspetta il mio ok.
- Risposte brevi, in italiano.

**Com'è fatto il progetto** (dettagli in `README.md`):
- `src/` contiene i sorgenti in pezzi; l'ordine sta in `src/ordine.txt`.
- `python build.py` genera `dist/DPSH.html`, il file unico per l'APK e per il PC.
- Tutti i `src/js/*.js` sono frammenti di UNA sola funzione e condividono l'ambito.
- `python build.py --mappa N` dice in quale pezzo sta la riga N del file generato.
- `docs/MAPPA_CODICE.md` dice dove sta cosa.
- Node si trova in `C:\Program Files\nodejs` (in Bash: `export PATH="/c/Program Files/nodejs:$PATH"`).
- Anteprima: `.claude/launch.json` → config `dpsh-app`, porta 8744, http://localhost:8744/DPSH.html. Per avere dati di prova separati usa origini come 127.0.0.x:8744.
- Nel Bash di questo PC gli heredoc possono dimezzare le barre rovesciate: gli script con `\` scrivili con lo strumento Write.

**Documenti:**
- `docs/PIANO_RIARCHITETTURA.md`: piano, decisioni e regole.
- `docs/ANALISI_UX_UI.md`: l'analisi di partenza.
- `docs/fasi/FASE_1..3_ESITO.md`: cosa è stato fatto.
- `docs/OSSERVAZIONI.md`: le mie osservazioni dall'uso.

Prototipo approvato (lavagna): https://claude.ai/artifact/4wQitcFLA5y6gWHj4fThJY
- righe Fase 2 e Fase 3: già realizzate;
- riga «Il PC — post-produzione»: Fase 7;
- riga «Fasi 4–6 — I menù che mancavano»: Progetto, Consegna, Scheda prova, Dati del progetto, Impostazioni, Registro.

**Stato al 27/09/2026:**
- ✅ **Fase 0:** sorgenti divisi, build, git, test.
- ✅ **Fase 1:** affidabilità dei dati. Caricamento sicuro, schema versionato con migrazioni, controllo di integrità, tracciabilità degli intervalli, salvataggio verificato.
- ✅ **Fase 2:** pacchetto telefono ↔ PC, copia esatta verificata con SHA-256; finestre «Porta su un altro dispositivo» e «Ricevi».
- ✅ **Fase 3:**
  - regole di stile comuni;
  - prova in campo e Home come nel prototipo;
  - tasto «Registra da–a m» visibile di default (schema 3);
  - avvisi toast.
- ◐ **Fase 4**, fatto finora:
  - il nome del progetto si modifica dall'«Intestazione Cantiere» (commit 2329a78);
  - «Strumento e impostazioni della prova» si apre dal ⋯ della prova (commit d3a8db4).
- Test: 47/47 verdi a fine Fase 3.
- ✅ **Fase 6** (27/09/2026, sessione cloud, ramo `claude/epic-davinci-19p1z9`, da unire in `main`):
  - due viste Conta | Registro;
  - righe del Registro: tocco = scheda modificabile, scorri a sinistra = Modifica/Elimina;
  - registro compatto con «Mostra tutte le righe»;
  - finestre come fogli dal basso;
  - falda nel ⋯ della prova.

  Esito in `docs/fasi/FASE_6_ESITO.md`. Test: 48/48.
- Inventario della schermata di acquisizione in `docs/INVENTARIO_ACQUISIZIONE.md`: aspetta le mie
  scelte riga per riga.


**Le mie decisioni:**
- **G:** il tasto Registra è visibile di default e la scelta di nasconderlo si ricorda.
- **H:** «Apri» porta all'ultima prova.
- **I:** il PC serve alla post-produzione. Gli intervalli si inseriscono con «Aggiungi intervalli multipli», niente contatore.
- **J:** l'ordine del Registro non cambia; al massimo un comando per invertirlo.
- **K:** il tema non è una priorità.
- Il pacchetto telefono ↔ PC è una copia esatta.
- Niente «Condividi», niente cloud, niente service worker.

**Stato al 27/09/2026 (sera):** tutte le fasi 0–8 fatte sul ramo `claude/epic-davinci-19p1z9`
(da unire in `main`), esiti in `docs/fasi/`. 53/53 suite verdi. Editor dei template: ritocchi fatti,
inventario in `docs/INVENTARIO_EDITOR_TEMPLATE.md`.

**Cosa resta:**
1. Le mie osservazioni dall'uso delle fasi 4–8 (`docs/OSSERVAZIONI.md`).
2. Inventario della schermata di acquisizione (`docs/INVENTARIO_ACQUISIZIONE.md`): le mie scelte.
3. Editor dei template: le «storture» da screenshot.
4. Le cose «non fatte, e perché» negli esiti delle fasi 4, 5, 7, 8, se servono.
5. Prototipo PC (`docs/PROTOTIPO_PC.md`, tela https://claude.ai/artifact/3ssSnswgptKV7QvfLKxZfg):
   approvato e realizzato (6 passi); cosa manca è in fondo a quel documento.
6. Terreno e sezioni (`docs/TERRENO_DTM.md`): DTM, quote, sezione 2D, vista 3D fatti; WMS/WCS aspettano gli indirizzi dei servizi.

Parti chiedendomi se ho provato l'app sul telefono e cosa ho notato. Poi proponimi il prossimo pezzo con il suo peso.

---
