// BANCO DI PROVA: TipTap con lo schema su misura legge davvero l'HTML convertito?
const fs=require('fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><body><div id="ed"></div></body>', { pretendToBeVisual: true });
const w = dom.window;
['window','document','navigator','Node','Element','HTMLElement','DocumentFragment','DOMParser','getComputedStyle','MutationObserver','Range','Selection']
  .forEach(k => { if (!(k in globalThis) && w[k]) globalThis[k] = w[k]; });
globalThis.window = w; globalThis.document = w.document;

eval(fs.readFileSync(__dirname + '/../src/vendor/motore-note.min.js','utf8'));
const { Editor, ESTENSIONI } = globalThis.NoteEditor;

// L'HTML che il convertitore dell'app produce (stessa forma del test note_migrazione.js)
const CONVERTITO =
  `<h1>Sopralluogo</h1><p>Terreno <strong>molto</strong> umido, <em>argilla</em> in superficie.</p>` +
  `<ul data-type="taskList">` +
    `<li data-type="taskItem" data-checked="true"><p>Foto del pozzo</p></li>` +
    `<li data-type="taskItem" data-checked="false"><p>Misura falda</p></li>` +
    `<li data-type="taskItem" data-checked="true"><p>Campione S1</p></li></ul>` +
  `<blockquote><p>Il committente chiede una seconda prova.</p></blockquote>` +
  `<ul><li><p>ciottoli a 1,2 m</p></li><li><p>cavità a 3,0 m</p></li></ul>` +
  `<p><mark data-color="rgb(255, 235, 59)">attenzione al livello</mark></p>` +
  `<table class="note-table"><tbody><tr><th><p>Prof.</p></th><th><p>Nota</p></th></tr>` +
    `<tr><td><p>1,2</p></td><td><p>ciottoli</p></td></tr></tbody></table>` +
  `<p><img data-note-img-id="NIMG_17_a" src=""></p><hr>` +
  `<p><a href="https://esempio.it/scheda">scheda tecnica</a></p>`;

const ed = new Editor({ element: document.getElementById('ed'), extensions: ESTENSIONI, content: CONVERTITO });
const uscita = ed.getHTML();

let ok=0, ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const conta = (h, re) => (h.match(re)||[]).length;

console.log('--- Lo schema su misura regge? ---');
t('l editor si e costruito senza errori', !!uscita);
t('titolo', /<h1>Sopralluogo<\/h1>/.test(uscita));
t('grassetto e corsivo', /<strong>molto<\/strong>/.test(uscita) && /<em>argilla<\/em>/.test(uscita));
t('3 voci di checklist', conta(uscita, /data-type="taskItem"/g)===3);
t('2 spuntate', conta(uscita, /data-checked="true"/g)===2);
t('citazione', /<blockquote>/.test(uscita));
t('2 righe di elenco normale', conta(uscita, /<li><p>/g)===2);
t('evidenziatore col colore', /<mark data-color="rgb\(255, 235, 59\)"/.test(uscita));
t('tabella con la classe note-table', /<table class="note-table">/.test(uscita));
t('4 celle', conta(uscita, /<t[hd][ >]/g)===4);
t('divisore', /<hr>/.test(uscita));
t('link con href', /href="https:\/\/esempio\.it\/scheda"/.test(uscita));
console.log('       img nell uscita:', (uscita.match(/<img[^>]*>/)||['(nessuna)'])[0]);
t('L IMMAGINE SOPRAVVIVE col suo id', /data-note-img-id="NIMG_17_a"/.test(uscita));
t('...e il src vuoto non la fa scartare', /<img[^>]*src=""/.test(uscita));

console.log('--- Andata e ritorno: rileggere la propria uscita non degrada ---');
const ed2 = new Editor({ element: document.getElementById('ed'), extensions: ESTENSIONI, content: uscita });
const uscita2 = ed2.getHTML();
t('stabile al secondo giro', uscita2 === uscita);

console.log('\n' + ok + ' ok, ' + ko + ' KO');
fs.writeFileSync(require('path').join(require('os').tmpdir(), 'uscita.html'), uscita);
process.exit(ko?1:0);
