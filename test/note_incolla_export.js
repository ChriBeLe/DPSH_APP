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
const dom = new JSDOM('<!DOCTYPE html><body></body>');
const NOMI=['escapeHtmlDidascalia','ripuliscoHtmlIncollatoNota','noteHtmlToPlainText','noteHtmlToMarkdown','invariantiNota','convertiNotaAlNuovoSchema'];
const api = new Function('DOMParser','document','Node',
  NOMI.map(corpo).join('\n\n') + '\nreturn {' + NOMI.join(',') + '};'
)(dom.window.DOMParser, dom.window.document, dom.window.Node);
const { ripuliscoHtmlIncollatoNota: pulisci, noteHtmlToPlainText: testo, noteHtmlToMarkdown: md,
        invariantiNota: inv, convertiNotaAlNuovoSchema: converti } = api;

console.log('--- 1. Incolla: entra solo cio che e nominato ---');
const DA_WORD = `<meta charset="utf-8"><style>p{font-family:Calibri}</style>` +
  `<p class="MsoNormal" style="font-family:Calibri;font-size:11pt;color:#1F497D">` +
  `Terreno <b style="mso-bidi-font-weight:normal">molto</b> umido</p>` +
  `<span style="background-color:yellow">evidenziato</span>` +
  `<div class="WordSection1"><table class="MsoTableGrid" border="1" style="border-collapse:collapse">` +
  `<tr><td style="width:100pt">1,2</td><td>ciottoli</td></tr></table></div>`;
const pulito = pulisci(DA_WORD);
console.log('       ', pulito.slice(0,180));
t('lo <style> di Word sparisce', !/<style/.test(pulito));
t('il <meta> sparisce', !/<meta/.test(pulito));
t('nessun attributo style sopravvive', !/style=/.test(pulito));
t('nessuna classe estranea sopravvive', !/class=/.test(pulito));
t('MA IL TESTO C E TUTTO', /Terreno/.test(pulito) && /umido/.test(pulito) && /ciottoli/.test(pulito));
t('il grassetto sopravvive', /<b>molto<\/b>|<strong>molto<\/strong>/.test(pulito));
t('lo sfondo giallo diventa evidenziazione vera', /<mark data-color="yellow">evidenziato<\/mark>/.test(pulito));
t('la tabella resta una tabella', /<table>/.test(pulito) && /<td>1,2<\/td>/.test(pulito));
t('il <div> non consentito lascia il posto al contenuto', !/<div/.test(pulito));

console.log('--- 1-bis. Incolla: l allineamento e informazione, non decorazione ---');
const DA_WORD_CENTRATO = '<p style="text-align:center;font-family:Calibri;color:#1F497D">Titolo centrato</p>'
  + '<h2 align="right">A destra</h2>'
  + '<p style="text-align:left">A sinistra (che e\' il normale)</p>'
  + '<p style="text-align:justify;margin-left:40pt">Giustificato</p>';
const pc = pulisci(DA_WORD_CENTRATO);
console.log('       ', pc);
t('il centrato resta centrato', /<p style="text-align: center">Titolo centrato<\/p>/.test(pc));
t('il vecchio align="right" diventa uno stile vero', /<h2 style="text-align: right">A destra<\/h2>/.test(pc));
t('l allineamento a sinistra non lascia scritture inutili', /<p>A sinistra/.test(pc));
t('il giustificato passa', /text-align: justify/.test(pc));
t('ma il resto dello stile no (font, colore, margini)', !/Calibri|1F497D|margin-left/.test(pc));

console.log('--- 2. Incolla: le trappole ---');
t('lo script sparisce', !/script/i.test(pulisci('<p>ciao</p><script>alert(1)</script>')));
t('un link javascript: perde href', !/href/.test(pulisci('<a href="javascript:alert(1)">x</a>')));
t('un link http resta cliccabile', /href="https:\/\/ok\.it"/.test(pulisci('<a href="https://ok.it" target="_blank" onclick="x()">y</a>')));
t('...ma senza target e onclick', !/target=|onclick=/.test(pulisci('<a href="https://ok.it" target="_blank" onclick="x()">y</a>')));
t('un img remoto viene scartato', !/<img/.test(pulisci('<p><img src="https://tracker.it/pixel.gif"></p>')));
t('iframe e form spariscono', !/iframe|form/i.test(pulisci('<iframe src="x"></iframe><form><input></form>')));
t('incolla vuoto non esplode', pulisci('') === '' && pulisci(null) === '');

console.log('--- 3. Export: capiscono la forma NUOVA della checklist ---');
const NUOVA = `<ul data-type="taskList">` +
  `<li data-type="taskItem" data-checked="true"><p>Foto del pozzo</p></li>` +
  `<li data-type="taskItem" data-checked="false"><p>Misura falda</p></li>` +
  `<li data-type="taskItem" data-checked="true"><p>Campione S1</p></li></ul>`;
const t1 = testo(NUOVA), m1 = md(NUOVA);
console.log('       markdown:', JSON.stringify(m1.trim()));
t('testo semplice: 3 voci', (t1.match(/\[[x ]\]/g)||[]).length===3);
t('testo semplice: 2 spuntate', (t1.match(/\[x\]/g)||[]).length===2);
t('markdown: 3 voci', (m1.match(/- \[[x ]\]/g)||[]).length===3);
t('markdown: 2 spuntate', (m1.match(/- \[x\]/g)||[]).length===2);
t('e non diventano anche pallini di elenco', !/^- (?!\[)/m.test(m1.trim()));

console.log('--- 4. Export: la forma VECCHIA continua a funzionare ---');
const VECCHIA = `<div class="note-check-item checked"><label class="note-check-label"><input type="checkbox" class="note-check-box" checked=""></label><span class="note-check-text">Foto</span></div>` +
  `<div class="note-check-item"><label class="note-check-label"><input type="checkbox" class="note-check-box"></label><span class="note-check-text">Falda</span></div>`;
t('testo semplice: 2 voci, 1 spuntata',
  (testo(VECCHIA).match(/\[[x ]\]/g)||[]).length===2 && (testo(VECCHIA).match(/\[x\]/g)||[]).length===1);
t('markdown: 2 voci, 1 spuntata',
  (md(VECCHIA).match(/- \[[x ]\]/g)||[]).length===2 && (md(VECCHIA).match(/- \[x\]/g)||[]).length===1);

console.log('--- 5. INVARIANTE VERO: convertire non cambia cio che si esporta ---');
const PRIMA = VECCHIA + '<p>Note <b>importanti</b></p><hr><p><a href="https://x.it">link</a></p>';
const DOPO = converti(PRIMA);
const spunteMd = (h) => (md(h).match(/- \[x\]/g)||[]).length;
const vociMd  = (h) => (md(h).match(/- \[[x ]\]/g)||[]).length;
t('stesso numero di voci in markdown prima e dopo', vociMd(PRIMA) === vociMd(DOPO));
t('stesso numero di spuntate in markdown prima e dopo', spunteMd(PRIMA) === spunteMd(DOPO));
const norm = s2 => s2.replace(/\s+/g,' ').trim();
t('stesso testo esportato prima e dopo', norm(testo(PRIMA)) === norm(testo(DOPO)));
t('il link sopravvive in markdown in entrambe', /\(https:\/\/x\.it\)/.test(md(PRIMA)) && /\(https:\/\/x\.it\)/.test(md(DOPO)));
t('e gli invarianti dell HTML coincidono',
  inv(PRIMA).checklist === inv(DOPO).checklist && inv(PRIMA).spuntate === inv(DOPO).spuntate);

console.log('--- 6. Markdown: le nuove costruzioni ---');
t('evidenziatore', /==giallo==/.test(md('<p><mark data-color="yellow">giallo</mark></p>')));
t('barrato', /~~via~~/.test(md('<p><s>via</s></p>')));
t('sottolineato', /<u>sotto<\/u>/.test(md('<p><u>sotto</u></p>')));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
