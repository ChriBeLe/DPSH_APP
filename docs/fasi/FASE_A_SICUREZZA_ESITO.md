# Fase A (revisione 2026-11) — Sicurezza e dati: esito

Ramo `claude/project-thread-5j6dt5`, dal piano «Revisione totale DPSH Field Collector» (16/11/2026),
problemi 1–10, 22, 26, 27 e 5. Rapporto di partenza: `revisione-2026-11/O1_sicurezza.md`.

## Cosa è fatto

| # | Cosa | Dove | Test |
|---|---|---|---|
| — | Funzioni condivise: `testoHtml`, `testoXml`, `idSicuro`, `idSicuroOppureNuovo`, `coloreSicuro`, `prefissoImmagineSicuro`, `dataUrlImmagineSicuro`, `numeroSicuro` | `002a` | `testo_sicuro.js` |
| 1, 2, 4 | Id di progetti, prove, foto e voci d'archivio validati all'ingresso (JSON, ZIP, pacchetto, archivio); nomi e colori di strati e archivio con escape; galleria foto, Home, confronto, KML/GPX importati | `044`, `044b`, `006`–`009`, `017`, `020`, `022`, `024`, `049`, `061` | `import_malevolo.js`, `grafico_e_copie_rimaste.js` |
| 3 | Template importati: controllo di versione e di forma, niente `__proto__`, `richHtml` sanificato all'ingresso e al rendering (whitelist su DOMParser, immagini solo `data:`), nomi con escape; stile e testi dell'indice | `026`, `027`, `042`, `044a`, `045`, `066`, `069` | `template_importati_sicuri.js`, `indice_stile_sicuro.js` |
| 6 | L'import JSON/ZIP non sovrascrive più foto e immagini con lo stesso id (stessa regola del pacchetto) | `044` | `foto_e_copie_sicure.js` |
| 7 | Scritture delle immagini delle note attese, contate solo se riuscite, avviso se falliscono | `044`, `049`, `052` | idem |
| 8 | «Foto orfane» e copie considerano anche la nota originale conservata | `047`, `048` | idem |
| 9 | `copiaPrimaDi` attende la copia; `copiaOChiedi` chiede se procedere quando fallisce; usata da tutte le azioni distruttive; guardia sul doppio tocco di «elimina intervallo» | `048`, `007`, `020`, `023`, `024`, `046`, `061`, `072` | idem, `grafico_e_copie_rimaste.js` |
| 10 | «Importa archivio» JSON aggiunge come lo ZIP (id già presente → copia), quindi «senza cancellare» è vero | `072` | `foto_e_copie_sicure.js` |
| 22 | KML con escape XML, report con escape HTML, nomi dei fogli Excel validi e unici | `046`, `063` | `export_caratteri_speciali.js` |
| 27 | N° della nuova prova = massimo + 1 | `046` | `numero_nuova_prova.js` |
| 5, 26 | Font, SheetJS, ExcelJS e Leaflet incorporati (offline); CSP; SRI su leaflet-rotate | `shell/`, `css/00b`, `css/05`, `vendor/`, `071m`, `072` | `offline_e_csp.js` |

Verifica nel browser (Chromium, rete bloccata, CSP attiva): nessuna richiesta di rete all'avvio,
nessun errore di console, Excel (SheetJS ed ExcelJS), mappa con segnaposto, pdf.js e font tutti
funzionanti.

## Decisioni da confermare

- Nel pacchetto (`044b`) un id o un prefisso d'immagine non valido rifiuta l'intero pacchetto
  (rinominare cambierebbe l'impronta). Nell'import JSON una foto con id non valido viene scartata.
- Un colore non valido diventa grigio `#888888`.
- Un template di versione dati più nuova è rifiutato per intero; i backup senza versione si importano.
- Se IndexedDB non è disponibile, ogni eliminazione chiede conferma (prima la copia falliva in silenzio).
- Nei nomi dei fogli Excel «/» diventa «-» («Prova 1-A»).
- leaflet-rotate (GPL-3.0) resta dalla rete con impronta SRI: **confermato** dall'utente il 17/11/2026.

## Da provare sul telefono

- Avvio senza rete: l'aspetto (Manrope) resta quello di sempre; Excel di progetto; apertura mappa.
- Import di un progetto vecchio (JSON e ZIP) già presente sul telefono: entra come copia, le foto
  di qui non cambiano.
- Eliminare una prova e un intervallo: nessuna domanda in più se le copie funzionano.
- Se l'APK abilita accesso ai file dalla WebView o un ponte nativo, i problemi 1–4 erano più gravi
  di quanto stimato: il progetto Android non è in questo repository.

## Limiti noti

- La CSP ammette `'unsafe-inline'` e `'unsafe-eval'` (l'app è uno script inline, pdf.js usa eval) e
  lascia aperti `img-src`/`connect-src` (mappe, WMS, DTM, export Word): limita script esterni,
  plugin, `<base>` e form, non l'esfiltrazione.
- Id degli strati non validati all'ingresso (sono solo con escape all'uscita).
