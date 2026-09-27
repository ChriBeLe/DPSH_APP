# Motore delle note — bundle e schema

`banco.min.js` è **TipTap 3 + ProseMirror + le estensioni su misura**, in un unico file
(430 KB non compressi, ~135 KB gzip). **È incluso in `Modulo1_integrato.html`**, dentro
`<script id="motoreNote">`, ed espone `window.NoteEditor = { Editor, ESTENSIONI }`.

Quando cambi `schema.js`, ricostruisci **e reinserisci**: il file dell'app contiene una
copia del bundle, non un riferimento.

## Ricostruirlo

```bash
npm install            # usa il package.json qui accanto
npx esbuild banco.js --bundle --minify --format=iife --target=es2019 --outfile=banco.min.js
```

Poi rimpiazza il contenuto di `<script id="motoreNote">` in `Modulo1_integrato.html` con il
nuovo `banco.min.js` (il tag di apertura e quello di chiusura restano dove sono).

## `schema.js` — è qui che si decide cosa sopravvive

Uno schema non è una preferenza estetica: **ciò che non è dichiarato viene scartato in
silenzio**. Ogni estensione su misura qui sotto esiste perché senza di lei si perderebbe
qualcosa che nelle note vere c'è davvero.

- **`ImmagineNota`** — la più importante. Dichiara `data-note-img-id` e accetta un `src`
  **vuoto**: il file vero sta in IndexedDB e quell'attributo è l'unico legame; uno schema
  di serie scarta un `<img>` senza `src` come "non un'immagine", e con l'id se ne va anche
  la possibilità di ritrovare il file. Dichiara inoltre `class`, `style` e
  `data-note-inline`, che sono la forma in linea (frecce, linee) e la dimensione scelta
  dall'utente: senza, ogni foto tornava a dimensione piena e ogni freccia diventava un
  blocco. È configurata `inline: true` perché le forme rapide vivono dentro la frase.
- **`TabellaNota`** — riscrive la tabella con `class="note-table"`, altrimenti si perde
  tutto il foglio di stile della stampa.
- **`ColoreTesto`** — un marcatore per `<span style="color:…">`. Non c'è un pulsante che lo
  metta: arriva dall'incolla e dalle note vecchie (`<font color>`, che il convertitore
  traduce). Il censimento del passo 1 lo ha trovato in note reali, quindi senza questo
  marcatore lo schema butterebbe via un colore che l'utente aveva messo.
- **`TaskList`/`TaskItem`** — le liste di controllo, dopo che il convertitore le ha portate
  dal vecchio `<div class="note-check-item">` alla forma che lo schema conosce.

## Cosa arriva gratis, e va saputo

Le regole d'ingresso di StarterKit sono già attive: `# `, `- `, `[] `, `> `, `1. `,
`**grassetto**`, `--- ` si trasformano mentre si scrive. Sono verificate in
`test/note_motore_montato.js` §6-bis — su un telefono in cantiere sono il guadagno più
grosso, quindi vanno misurate, non date per scontate.

## La controprova

`test/note_schema_controprova.js` apre una nota **vecchia e non convertita** con uno schema
**di serie**. Il risultato è il motivo per cui tutto questo lavoro esiste.
