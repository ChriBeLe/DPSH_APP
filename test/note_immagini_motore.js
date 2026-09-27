// Le immagini della nota sopravvivono al giro nel motore nuovo?
// (forma in linea, dimensione scelta dall'utente, id verso IndexedDB)
const fs=require('fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><body><div id="ed"></div></body>', { pretendToBeVisual: true });
const w = dom.window;
['window','document','navigator','Node','Element','HTMLElement','DocumentFragment','DOMParser','getComputedStyle','MutationObserver','Range','Selection']
  .forEach(k => { if (!(k in globalThis) && w[k]) globalThis[k] = w[k]; });
globalThis.window = w; globalThis.document = w.document;
eval(fs.readFileSync(__dirname + '/../src/vendor/motore-note.min.js','utf8'));
const { Editor, ESTENSIONI } = globalThis.NoteEditor;

const P=__dirname + '/../dist/DPSH.html';
const righe=fs.readFileSync(P,'utf8').split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
  throw new Error('fine non trovata: '+nome);
}
const NOMI=['convertiNotaAlNuovoSchema','invariantiNota'];
const api=new Function('DOMParser','document','Node', NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')(w.DOMParser,w.document,w.Node);

let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const giro = (html) => { const ed = new Editor({ element: document.createElement('div'), extensions: ESTENSIONI, content: html }); const u = ed.getHTML(); ed.destroy(); return u; };

// Esattamente cio' che l'app scrive oggi in notes.html: src svuotato da saveState,
// una foto ridimensionata al 50% e una forma rapida in linea da 32px.
const NOTA_VERA =
  `<p>Verticale S1</p>` +
  `<img data-note-img-id="nimg_1755_a1" src="" style="width: 50%; max-width: 100%; height: auto;">` +
  `<p>freccia <img data-note-img-id="nimg_1755_b2" src="" class="note-inline-shape" data-note-inline="1" style="width: 32px; height: 32px;"> verso valle</p>` +
  `<div class="note-check-item checked"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box" checked=""></label><span class="note-check-text">Foto scattata</span></div>`;

const convertito = api.convertiNotaAlNuovoSchema(NOTA_VERA);
const uscita = giro(convertito);
console.log('       ', uscita.replace(/></g,'>\n         <'));

console.log('--- Le immagini escono dal motore come sono entrate ---');
t('tutte e due le immagini ci sono ancora', (uscita.match(/<img/g)||[]).length === 2);
t('id verso IndexedDB della foto', /data-note-img-id="nimg_1755_a1"/.test(uscita));
t('id verso IndexedDB della forma', /data-note-img-id="nimg_1755_b2"/.test(uscita));
t('la dimensione scelta dall utente sopravvive (50%)', /width: 50%/.test(uscita));
t('la forma resta in linea (classe)', /class="[^"]*note-inline-shape/.test(uscita));
t('la forma resta in linea (marcatore)', /data-note-inline="1"/.test(uscita));
t('la misura in pixel della forma sopravvive', /width: 32px/.test(uscita));
t('il src svuotato non diventa un src inventato', !/src="[^"]+"/.test(uscita));
t('la checklist convertita regge il giro', /data-type="taskItem"/.test(uscita) && /data-checked="true"/.test(uscita));
t('il testo attorno alla forma non si spezza', /freccia/.test(uscita) && /verso valle/.test(uscita));

console.log('--- Invarianti prima/dopo il giro completo ---');
const a = api.invariantiNota(NOTA_VERA), b = api.invariantiNota(uscita);
t('stesso numero di immagini', a.immagini.length === b.immagini.length);
t('stessi id di immagine, nello stesso ordine', a.immagini.join('|') === b.immagini.join('|'));
t('stesso numero di checklist', a.checklist === b.checklist);
t('stesso numero di spuntate', a.spuntate === b.spuntate);

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
