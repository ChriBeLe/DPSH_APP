// Esegue DAVVERO censimento/invarianti/convertitore estratti dal file, su note vere per forma.
const fs=require('fs');
const { JSDOM } = require('jsdom');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
  throw new Error('fine non trovata: '+nome);
}
function costante(nome){
  const i=righe.findIndex(r=>r.startsWith('            const '+nome+' = {'));
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            };') return righe.slice(i,k+1).join('\n');
  throw new Error('costante non trovata: '+nome);
}
const dom = new JSDOM('<!DOCTYPE html><body></body>');
const NOMI=['censisciVocabolarioNota','invariantiNota','confrontaInvariantiNota','convertiNotaAlNuovoSchema'];
const api = new Function('DOMParser','document', costante('VOCABOLARIO_NOTE') + '\n' + NOMI.map(corpo).join('\n\n') +
  '\nreturn {' + NOMI.join(',') + ', VOCABOLARIO_NOTE};')(dom.window.DOMParser, dom.window.document);
const { censisciVocabolarioNota: censisci, invariantiNota: inv, confrontaInvariantiNota: confronta, convertiNotaAlNuovoSchema: converti } = api;

// --- note d'esempio nella forma ESATTA che l'app produce oggi ---
const CHECK = (testo, spuntata) =>
  `<div class="note-check-item${spuntata?' checked':''}"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box"${spuntata?' checked=""':''}></label><span class="note-check-text">${testo}</span></div>`;
const NOTA_COMPLETA =
  `<h1>Sopralluogo</h1><p>Terreno <b>molto</b> umido, <i>argilla</i> in superficie.</p>` +
  CHECK('Foto del pozzo', true) + CHECK('Misura falda', false) + CHECK('Campione S1', true) +
  `<blockquote>Il committente chiede una seconda prova.</blockquote>` +
  `<ul><li>ciottoli a 1,2 m</li><li>cavità a 3,0 m</li></ul>` +
  `<p><span style="background-color: rgb(255, 235, 59);">attenzione al livello</span></p>` +
  `<table class="note-table"><tbody><tr><th>Prof.</th><th>Nota</th></tr><tr><td>1,2</td><td>ciottoli</td></tr></tbody></table>` +
  `<p><img data-note-img-id="NIMG_17_a" src=""></p><hr>` +
  `<p><a href="https://esempio.it/scheda">scheda tecnica</a></p>` +
  `<p><font color="#ff0000">rifiuto</font></p>`;

console.log('--- 1. Il censimento riconosce quello che c e ---');
const c = censisci(NOTA_COMPLETA);
t('conta i tag', c.tag.h1===1 && c.tag.table===1 && c.tag.img===1);
t('conta le classi fatte in casa', c.classi['note-check-item']===3 && c.classi['note-table']===1);
t('vede l attributo che collega l immagine', c.attributi['data-note-img-id']===1);
console.log('       sconosciuti:', JSON.stringify(c.sconosciuti));
t('su una nota "normale" non trova niente di ignoto',
  c.sconosciuti.tag.length===0 && c.sconosciuti.classi.length===0 && c.sconosciuti.attributi.length===0);
const strana = censisci('<p>x</p><marquee class="roba-mai-vista" data-chissa="1">y</marquee>');
t('ma segnala subito una costruzione mai vista',
  strana.sconosciuti.tag.includes('marquee') && strana.sconosciuti.classi.includes('roba-mai-vista') &&
  strana.sconosciuti.attributi.includes('data-chissa'));

console.log('--- 2. Gli invarianti misurano il CONTENUTO, non l HTML ---');
const i0 = inv(NOTA_COMPLETA);
console.log('       ', JSON.stringify({checklist:i0.checklist, spuntate:i0.spuntate, tabelle:i0.tabelle, celle:i0.celle, immagini:i0.immagini.length}));
t('3 checklist, 2 spuntate', i0.checklist===3 && i0.spuntate===2);
t('1 tabella, 4 celle', i0.tabelle===1 && i0.celle===4);
t('1 immagine con il suo id', i0.immagini.length===1 && i0.immagini[0]==='NIMG_17_a');
t('1 link, 1 titolo, 1 citazione, 2 righe elenco, 1 divisore',
  i0.link.length===1 && i0.titoli===1 && i0.citazioni===1 && i0.righeElenco===2 && i0.divisori===1);

console.log('--- 3. LA CONVERSIONE NON PERDE NIENTE ---');
const dopo = converti(NOTA_COMPLETA);
const perdite = confronta(NOTA_COMPLETA, dopo);
if (perdite.length) perdite.forEach(p => console.log('       PERDITA:', p));
t('nessuna perdita sulla nota completa', perdite.length===0);
t('le checklist diventano una lista di attivita, non tre',
  (dopo.match(/data-type="taskList"/g)||[]).length===1 && (dopo.match(/data-type="taskItem"/g)||[]).length===3);
t('lo stato spuntato sopravvive', (dopo.match(/data-checked="true"/g)||[]).length===2);
t('l ATTRIBUTO DELL IMMAGINE e intatto (la regola piu importante)', /data-note-img-id="NIMG_17_a"/.test(dopo));
t('l evidenziatore diventa <mark> col suo colore', /<mark data-color="rgb\(255, 235, 59\)">/.test(dopo));
t('<b> e <i> normalizzati', /<strong>molto<\/strong>/.test(dopo) && /<em>argilla<\/em>/.test(dopo));
t('<font color> diventa un colore vero', /<span style="color:#ff0000">rifiuto<\/span>/.test(dopo) && !/<font/.test(dopo));
t('celle e voci di elenco hanno un blocco dentro', /<td><p>1,2<\/p><\/td>/.test(dopo) && /<li><p>ciottoli a 1,2 m<\/p><\/li>/.test(dopo));
t('la tabella e ancora li con la sua classe', /<table class="note-table">/.test(dopo));

console.log('--- 4. Casi limite ---');
[['vuota',''], ['solo spazi','   '], ['testo nudo','ciao mondo'], ['solo un <br>','<br>'],
 ['immagine senza src','<p><img data-note-img-id="X"></p>'], ['checklist sola',CHECK('unica', false)]
].forEach(([nome, html]) => {
  let out, err=null;
  try { out = converti(html); } catch(e) { err=e; }
  t('non esplode: '+nome, !err);
  if (!err) t('...e non perde niente: '+nome, confronta(html, out).length===0);
});
t('il testo nudo viene avvolto in un paragrafo', /^<p>ciao mondo<\/p>$/.test(converti('ciao mondo')));
t('nota vecchia con solo la CLASSE checked (senza attributo) resta spuntata',
  /data-checked="true"/.test(converti('<div class="note-check-item checked"><label class="note-check-label"><input type="checkbox"></label><span class="note-check-text">vecchia</span></div>')));
t('nota con solo l ATTRIBUTO checked (senza classe) resta spuntata',
  /data-checked="true"/.test(converti('<div class="note-check-item"><label class="note-check-label"><input type="checkbox" checked=""></label><span class="note-check-text">altra</span></div>')));

console.log('--- 5. Idempotenza: riconvertire non deve rovinare ---');
const due = converti(dopo);
t('convertire due volte non perde niente', confronta(dopo, due).length===0);
t('...e non moltiplica le liste di attivita', (due.match(/data-type="taskList"/g)||[]).length===1);

console.log('--- 6. Il convertitore e una funzione PURA ---');
const copia = NOTA_COMPLETA;
converti(NOTA_COMPLETA);
t('non modifica la stringa in ingresso', NOTA_COMPLETA === copia);
t('non tocca il documento della pagina', dom.window.document.body.innerHTML === '');

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
