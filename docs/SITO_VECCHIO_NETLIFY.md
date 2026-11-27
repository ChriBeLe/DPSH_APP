# Il sito vecchio su dpsh.netlify.app

Letto il 27/11/2026, prima di sostituirlo con questa app. Serve per l'importatore e per il rollback.

## File pubblicati

index.html, app.js (?v=19), style.css (?v=8), manifest.json, sw.js, icon.png.
Librerie da CDN: chart.js, chartjs-plugin-datalabels, DragDropTouch, Google Identity Services, ExcelJS 4.3.0.

- `sw.js` esiste (cache `dpsh-v5`, mette in cache `/`, `/index.html`, `/style.css`, `/app.js`, `/manifest.json`),
  ma app.js v19 non lo registra. Un browser che ha aperto una versione più vecchia può averlo ancora:
  il nuovo `sw.js` sullo stesso percorso lo sostituisce e deve cancellare la cache `dpsh-v5`.
- Login Google (GIS `initTokenClient`), Client ID pubblico
  `43317256953-s1v0k8dpivor9i9ph899v0jbmof29nk4.apps.googleusercontent.com`, origine `https://dpsh.netlify.app`.
  Permessi: `drive.file` e `spreadsheets`. Salvava le prove su Google Sheets, in una cartella di Drive.
- HTTPS con HSTS, gestito da Netlify.

## Dati nel localStorage (stessa origine della nuova app)

- `dpsh_autosave`: la prova aperta, oggetto `Prova vecchia` (sotto).
- `dpsh_archives`: array (max 20, il più nuovo per primo) di `{ name, date, data }`;
  `name` = "DPSH <numero>" o "Indagine Senza Nome", `date` = `toLocaleString('it-IT')`, `data` = `Prova vecchia`.
- `dpsh_sheetId`, `dpsh_sheetUrl`: il Foglio Google collegato (solo riferimento, non dati).

Il file esportato "progetto_dpsh.json" ha la stessa forma di `Prova vecchia`.

## Forma di `Prova vecchia`

```js
{
  generali: { comune, localita, cliente, data, numero, profMax, coords },   // tutte stringhe dai campi
  strumento: { massa, pesoAsta, lunghAsta, pesoSistema, volata, passo, areaPunta, angoloPunta },
  // numeri; valori predefiniti 63.5, 6.3, 1.0, 8.0, 0.75, 0.20, 20.0, 90
  // (file molto vecchi possono avere pesoMassa al posto di massa)
  falda: '',                 // stringa, profondità della falda
  colpi: [ { prof, n } ],    // prof in metri (float), n colpi (int)
  strati: [],                // nella v19 resta sempre vuoto
  liveBlows: 0               // contatore del conteggio dal vivo
}
```

## Rollback

Netlify conserva ogni pubblicazione: Deploys, pubblicazione vecchia, "Publish deploy".
Lo zip della pubblicazione si scarica dalla stessa pagina (Download).
