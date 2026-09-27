# Test

Suite di verifica di `Modulo1_integrato.html`. **Non sono copie del codice**: ogni test
**estrae le funzioni vere dal file** e le esegue, quindi non possono andare fuori sincrono
con l'implementazione.

## Come si eseguono

```bash
node test/note_migrazione.js      # una suite
for f in test/*.js; do node "$f"; done   # tutte
```

Serve `jsdom` per le suite che lavorano sul DOM:

```bash
npm install jsdom
```

## Perché stanno qui e non in una cartella temporanea

Ci sono già state due occasioni in cui l'ambiente si è riavviato e ha portato via l'intera
suite. Il codice era intatto, ma la verifica no — e una verifica che sparisce vale come una
verifica che non è mai esistita. Da qui in poi vivono accanto al file che collaudano.

## Le fixture (`test/dati/`)

Dati realistici nel formato di **prima della Fase 1** (nessun `versioneSchema`), scritti
dall'app stessa e non a mano: `genera_fixture.js` apre l'app in jsdom e fa quello che farebbe un
utente (progetto, +1 e CONFERMA, intervalli multipli, strati e parametri avanzati, foto, nota con
un'immagine, interpretazione «3B»), poi esporta con le funzioni vere. Generate il 26/09/2026 dal
`dist/DPSH.html` di inizio Fase 1 (APP_VERSIONE 2026.09.11).

| File | Cos'è |
|---|---|
| `stato_v0.json` | il contenuto di `localStorage['dpsh_app_state']`: 2 progetti, 6 prove (5 più la 3B) |
| `idb_v0.json` | le foto e l'immagine della nota, come stanno in IndexedDB |
| `backup_stato_v0.json` | export «JSON» della prova (lo stato intero, foto incorporate) |
| `backup_archivio_v0.json` | «Backup completo» JSON (`{version, versioneApp, state}`) |
| `progetto_v0.json` / `progetto_v0.zip` | export di un progetto, JSON e ZIP |
| `backup_completo_v0.zip` | backup completo ZIP (con `manifest.json`) |
| `idb_finto.js` | un IndexedDB in memoria per jsdom, usato dal generatore e dalle suite |

**Attenzione:** `backup_stato_v0.json` e `progetto_v0.json` non contengono le foto. Non è un
difetto delle fixture ma dell'app di allora: al posto delle immagini c'è il segnaposto che
l'export non sostituiva (vedi `backup_foto.js`). Sono proprio i file che gli utenti hanno in mano,
per questo restano così. `backup_archivio_v0.json` ha le foto solo perché è stato esportato nella
stessa sessione in cui erano state scattate.

Non vanno rigenerate: rappresentano il formato vecchio, quello che l'app deve saper leggere per
sempre. Una fase che cambia il formato aggiunge fixture nuove accanto a queste.
