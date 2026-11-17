# Librerie e font incorporati

Dalla revisione 2026-11 (Fase A, problemi 5 e 26) l'app non scarica più niente all'avvio: font e
librerie sono dentro `dist/DPSH.html`. Sono copiati **senza modifiche** dai pacchetti npm (si è
aggiunto solo l'a capo finale che `build.py` richiede). Per aggiornarne uno: `npm pack <pacchetto>@<versione>`,
copiare il file indicato, ricalcolare l'impronta, eseguire `node test/esegui_tutti.js offline mappa excel`.

| Cosa | Pacchetto npm | File | Dove sta | Licenza | sha384 del file originale |
|---|---|---|---|---|---|
| SheetJS | `xlsx@0.18.5` | `dist/xlsx.full.min.js` | `src/vendor/xlsx.full.min.js` (script, all'avvio) | Apache-2.0 | `vtjasyidUo0kW94K5MXDXntzOJpQgBKXmE7e2Ga4LG0skTTLeBi97eFAXsqewJjw` |
| ExcelJS | `exceljs@4.4.0` | `dist/exceljs.min.js` | `src/vendor/exceljs.min.js` (script, all'avvio) | MIT | `Pqp51FUN2/qzfxZxBCtF0stpc9ONI6MYZpVqmo8m20SoaQCzf+arZvACkLkirlPz` |
| Leaflet | `leaflet@1.9.4` | `dist/leaflet.js` | `src/vendor/leaflet.min.js` (testo, eseguito alla prima mappa) | BSD-2-Clause | `cxOPjt7s7Iz04uaHJceBmS+qpjv2JkIHNVcuOrM+YHwZOmJGBXI00mdUXEq65HTH` |
| Stile di Leaflet | `leaflet@1.9.4` | `dist/leaflet.css` + `dist/images/*.png` | `src/css/05_leaflet.css` (immagini come data URI) | BSD-2-Clause | — |
| Manrope 500–800 | `@fontsource/manrope@5.3.0` | `files/manrope-latin-*-normal.woff2` | `src/css/00b_font-interfaccia.css` | OFL-1.1 | — |
| JetBrains Mono 600–700 | `@fontsource/jetbrains-mono@5.3.0` | `files/jetbrains-mono-latin-*-normal.woff2` | `src/css/00b_font-interfaccia.css` | OFL-1.1 | — |

**Resta in rete:** `leaflet-rotate@0.2.8` (la rotazione della mappa, `071m`). È opzionale (senza,
la mappa resta col nord in alto) e ha licenza **GPL-3.0**: incorporarlo nel file distribuito
nell'APK potrebbe estendere la GPL all'intera app. Per questo si carica da unpkg come prima, ma con
l'impronta SRI `sha384-MtIdllebpZyms2pw9K3YJl8BEqrKNQCdSFAySjeglab6z2PkeFdF4Lb9cDsnxQuG` (se la CDN
servisse un file diverso, il browser non lo esegue). Decisione da confermare con l'utente.

**Content-Security-Policy:** in `src/shell/01_head.html`, con il perché di ogni regola.
