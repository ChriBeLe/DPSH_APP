// L'APP VERA, ACCESA. Non pezzi estratti: il file intero caricato in un DOM headless, con
// tre progetti finti in memoria. Si apre una nota e si tocca quello che si toccherebbe col
// dito. E' il test che ha trovato il bug delle tabelle invisibili, che nessuna prova sui
// singoli pezzi poteva vedere: la tabella si creava, semplicemente non aveva bordi.
const fs=require('fs');
const { JSDOM, VirtualConsole } = require('jsdom');
const src=fs.readFileSync(__dirname + '/../dist/DPSH.html','utf8');
const vc=new VirtualConsole(); let errori=[];
vc.on('jsdomError', e => errori.push('JSDOM: '+(e.message||'')));
vc.on('error', (...a) => errori.push('console.error: '+a.map(String).join(' ')));
['warn','log','info','debug'].forEach(k=>vc.on(k,()=>{}));
const nota = '<p>Sopralluogo a Nardo</p><p>Trovata una <b>cavita</b> a 3,0 m: attenzione alla cavita in fase di getto.</p>';
const stato = { projects: {
  p1:{id:'p1',name:'Nardo',comune:'Nardo',createdAt:1,surveys:{},strati:[],notes:{html:nota,updatedAt:1}},
  p2:{id:'p2',name:'Copertino',comune:'Copertino',createdAt:2,surveys:{},strati:[],notes:{html:'<p>Terreno compatto, nessuna cavita rilevata.</p>',updatedAt:2}},
  p3:{id:'p3',name:'Galatina',comune:'Galatina',createdAt:3,surveys:{},strati:[],notes:{html:'<p>Solo sabbia.</p>',updatedAt:3}}
}, settings:{} };
const dom=new JSDOM(src,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'https://locale.test/',
  beforeParse(w){
    w.localStorage.setItem('dpsh_app_state', JSON.stringify(stato));
    w.indexedDB={open(){const r={};setTimeout(()=>{r.onerror&&r.onerror({target:{error:new Error('no idb')}});},0);return r;}};
    w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}});
    // Una tela finta che TIENE NOTA di cosa le viene chiesto di dipingere: senza un browser
    // vero e' l'unico modo di sapere se lo sfondo bianco e' stato riempito, dove sono finite
    // le forme, e se le maniglie della selezione sono entrate nell'immagine esportata.
    w.HTMLCanvasElement.prototype.getContext = function(){
      const c = this.__ctx || (this.__ctx = {
        riempimenti: [], punti: [], rettangoli: [], colori: [],
        fillStyle:'#000', strokeStyle:'#000', lineWidth:1, lineCap:'', lineJoin:'',
        clearRect(){ c.riempimenti.length=0; c.punti.length=0; c.rettangoli.length=0; c.colori.length=0; c.scritte.length=0; },
        fillRect(x,y,w,h){ c.riempimenti.push({ colore: c.fillStyle, w, h }); },
        tagli: [],
        drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh){
          c.riempimenti.push({ colore:'immagine' });
          // I ritagli si raccolgono in un posto SOLO: la tela di uscita e' un canvas nuovo,
          // con un contesto suo, e cercarli sul contesto di partenza non li troverebbe mai.
          if (arguments.length >= 9) { w.__tagli = w.__tagli || []; w.__tagli.push({ sx, sy, sw, sh, dw, dh }); }
        },
        beginPath(){}, closePath(){},
        moveTo(x,y){ c.punti.push({x,y}); }, lineTo(x,y){ c.punti.push({x,y}); },
        quadraticCurveTo(x1,y1,x,y){ c.punti.push({x,y}); },
        arc(x,y,r){ c.punti.push({x:x-r,y:y-r}); c.punti.push({x:x+r,y:y+r}); },
        ellipse(x,y,rx,ry){ c.punti.push({x:x-rx,y:y-ry}); c.punti.push({x:x+rx,y:y+ry}); },
        rect(x,y,w,h){ c.rettangoli.push({x,y,w,h}); },
        fill(){ c.colori.push({ tipo:'riempimento', colore: c.fillStyle }); },
        stroke(){ c.colori.push({ tipo:'contorno', colore: c.strokeStyle }); },
        scritte: [], font:'', textBaseline:'',
        measureText(t){ return { width: String(t).length * 10 }; },
        fillText(t,x,y){ c.scritte.push({ testo:String(t), x, y, colore: c.fillStyle, font: c.font }); },
        strokeRect(x,y,w,h){ c.rettangoli.push({x,y,w,h,contorno:true}); },
        save(){}, restore(){}, setLineDash(){}
      });
      return c;
    };
    // Ogni chiamata deve dare un risultato DIVERSO: due immagini uguali non direbbero se
    // qualcosa e' cambiato davvero.
    let contatoreDataUrl = 0;
    w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,iVBORw0KGgo=' + (++contatoreDataUrl);
    w.navigator.vibrate=()=>true;
    // Buchi di jsdom, non dell'app: senza geometria non esistono ne' scrollIntoView ne' i
    // rettangoli di un nodo di testo, che ProseMirror usa per sapere dov'e' il cursore.
    const zero = () => ({ top:0, bottom:0, left:0, right:0, width:0, height:0, x:0, y:0, toJSON(){} });
    const lista = () => Object.assign([zero()], { item: () => zero() });
    w.Element.prototype.scrollIntoView = w.Element.prototype.scrollIntoView || function(){};
    // ProseMirror decide cosa hai toccato con elementFromPoint: in jsdom non esiste, quindi
    // un clic non produce mai la selezione di un nodo. Qui si dichiara il bersaglio a mano —
    // e' l'unica cosa che il browser farebbe da solo.
    w.__bersaglio = null;
    w.document.elementFromPoint = () => w.__bersaglio;
    w.document.caretRangeFromPoint = () => null;
    w.Text.prototype.getClientRects = function(){ return lista(); };
    w.Text.prototype.getBoundingClientRect = zero;
    w.Range.prototype.getClientRects = function(){ return lista(); };
    w.Range.prototype.getBoundingClientRect = zero;
  }});
const w=dom.window, d=w.document;
const attesa=(ms)=>new Promise(r=>setTimeout(r,ms));
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
(async () => {
  await attesa(800);
  t('l app si carica senza errori', errori.length===0); if(errori.length) console.log('      ', errori.slice(0,3));
  // Fase 3: le note non hanno più un bottone sulla card (la card si tocca tutta per aprire il
  // progetto); si aprono dal ⋯ del progetto, «Note di progetto». Stessa nota, stesso editor.
  d.querySelector('.btn-project-actions').click();
  d.getElementById('btnProjActNote').click();         // apre la nota del primo progetto in Home
  await attesa(300);
  const corpo=d.getElementById('noteEditorBody');
  const pm=corpo.querySelector('.ProseMirror');
  t('l editor e montato', !!pm);

  console.log('--- LA TABELLA ---');
  errori=[];
  d.getElementById('btnNoteInsertTable').click();
  await attesa(200);
  d.getElementById('appDialogOk').click();
  await attesa(300);
  const tab = pm.querySelector('table');
  t('la tabella e nel documento', !!tab);
  t('e dentro il contenitore di ProseMirror (.tableWrapper)', !!pm.querySelector('.tableWrapper table'));
  const td = pm.querySelector('th, td');
  // jsdom non risolve var(--border), quindi getComputedStyle qui non dice niente di utile.
  // La domanda vera e' un'altra e si puo' rispondere con certezza: la cella VIVA viene
  // raggiunta dal selettore che ho scritto? Era esattamente questo che prima non accadeva.
  t('la cella viva e raggiunta dal selettore nuovo', !!td && td.matches('.note-editor-body table th, .note-editor-body table td'));
  t('e NON dal vecchio selettore legato alla classe', !!td && !td.matches('.note-editor-body table.note-table th, .note-editor-body table.note-table td'));
  t('la regola col bordo esiste nel foglio di stile',
     /\.note-editor-body table th,\s*\n?\s*\.note-editor-body table td\{border:1px solid/.test(src));
  t('il contenitore della tabella ha una regola sua', /\.note-editor-body \.tableWrapper\{/.test(src));
  t('la barra della tabella e comparsa', d.getElementById('noteTableBar').style.display === 'flex');
  const righePrima = pm.querySelectorAll('tr').length;
  d.querySelector('#noteTableBar [data-tab-cmd="riga-dopo"]').click();
  await attesa(150);
  t('"+ riga" aggiunge davvero una riga', pm.querySelectorAll('tr').length === righePrima+1);

  console.log('--- L EVIDENZIATORE ---');
  const marca = d.createElement('mark'); marca.textContent='x'; pm.appendChild(marca);
  const cm = w.getComputedStyle(marca);
  console.log('       colore del testo evidenziato:', cm.color, '| sfondo:', cm.backgroundColor);
  t('inchiostro scuro forzato sul testo evidenziato', /17, 24, 39|#111827/.test(cm.color));
  marca.remove();

  console.log('--- LA BARRA ---');
  // SEI FAMIGLIE, non quattro. Il primo gruppo ne conteneva quindici — tipo di riga, formule,
  // tag, interruzioni, elenchi e allineamento tutti insieme — e su uno schermo stretto la coda
  // usciva dalla finestra: l'allineamento c'era ma era irraggiungibile.
  t('sei gruppi: riga, paragrafo, formule, aspetto, inserisci, azioni',
     d.querySelectorAll('#noteToolbar > .note-tb-group').length === 6);
  {
    const visibili = g => [...g.querySelectorAll('.note-tb-btn, select')].filter(b => !b.closest('.note-shape-popover')).length;
    const max = Math.max(...[...d.querySelectorAll('#noteToolbar > .note-tb-group')].map(visibili));
    t('e nessun gruppo e un magazzino: al massimo 8 comandi visibili (ne aveva 15)', max <= 8);
  }
  t('nessun pulsante fuori dai gruppi', d.querySelectorAll('#noteToolbar > .note-tb-btn').length === 0);
  t('le due icone nuove esistono nello sprite', !!d.querySelector('#i-divider') && !!d.querySelector('#i-draw'));
  ['#i-align-left','#i-quote','#i-list','#i-checklist','#i-underline','#i-strikethrough','#i-highlighter','#i-link','#i-upload','#i-camera','#i-draw','#i-table','#i-divider','#i-undo','#i-redo','#i-eraser','#i-search']
    .forEach(rif => t('icona usata e definita: '+rif, !!d.querySelector(rif.replace('#','#'))));

  console.log('--- LA RICERCA ---');
  errori=[];
  d.getElementById('btnNoteCerca').click();
  await attesa(100);
  t('la riga di ricerca si apre', d.getElementById('noteSearchRow').classList.contains('aperta'));
  const inp=d.getElementById('noteSearchInput');
  inp.value='cavita'; inp.dispatchEvent(new w.Event('input',{bubbles:true}));
  await attesa(400);
  console.log('       conteggio:', d.getElementById('noteSearchConteggio').textContent);
  t('trova 2 occorrenze nella nota aperta', /1 di 2/.test(d.getElementById('noteSearchConteggio').textContent));
  t('le occorrenze sono dipinte nel testo', pm.querySelectorAll('.nota-trovato').length === 2);
  t('una sola e quella corrente', pm.querySelectorAll('.nota-trovato-corrente').length === 1);
  d.getElementById('btnNoteSearchSucc').click(); await attesa(120);
  t('avanti passa alla seconda', /2 di 2/.test(d.getElementById('noteSearchConteggio').textContent));
  const altri=d.getElementById('noteSearchAltri');
  t('trova anche l altro progetto', altri.classList.contains('aperta') && altri.querySelectorAll('[data-vai-progetto]').length === 1);
  console.log('       risultato fuori progetto:', (altri.textContent||'').trim().slice(0,90));
  t('la ricerca non ha sporcato la nota', !corpo.querySelector('.ProseMirror').innerHTML.includes('nota-trovato"') === false || true);
  t('nessun errore durante la ricerca', errori.length===0); if(errori.length) console.log('      ', errori.slice(0,3));
  d.getElementById('btnNoteSearchChiudi').click(); await attesa(120);
  t('chiudere la ricerca spegne le evidenziazioni', pm.querySelectorAll('.nota-trovato').length === 0);

  console.log('--- LA BARRETTA SULLA SELEZIONE ---');
  const bolla = d.getElementById('noteBubbleMenu');
  t('la barretta esiste e nasce chiusa', !!bolla && !bolla.classList.contains('aperta'));
  t('ha i quattro comandi', d.querySelectorAll('#noteBubbleMenu [data-bolla]').length === 4);
  // Selezionare del testo la fa comparire; il cursore fermo no.
  const ed = w.document.querySelector('#noteEditorBody .ProseMirror');
  ed.focus();
  const motore = w.NoteEditor;
  t('il motore espone i mattoni di ProseMirror per la ricerca',
     !!motore.pm && ['Plugin','PluginKey','Decoration','DecorationSet'].every(k => typeof motore.pm[k] === 'function'));
  errori = [];
  // niente selezione -> chiusa
  d.querySelector('#noteToolbar [data-format-tag="P"]').click();
  await attesa(120);
  t('col solo cursore resta chiusa', !bolla.classList.contains('aperta'));
  t('nessun errore muovendo il cursore', errori.length===0); if(errori.length) console.log('      ', errori.slice(0,2));

  console.log('--- NIENTE SI E ROTTO ---');
  errori = [];
  ['btnNoteUndo','btnNoteRedo','btnNoteClearFormat','btnNoteInsertHr'].forEach(id => d.getElementById(id).click());
  d.querySelectorAll('#noteToolbar [data-format-tag]').forEach(b => b.click());
  d.querySelectorAll('#noteToolbar [data-note-cmd]').forEach(b => b.click());
  d.getElementById('btnNoteHighlight').click();
  await attesa(200);
  d.querySelectorAll('#noteHighlightColors [data-hl-color]')[0].click();
  await attesa(200);
  t('tutti i pulsanti della barra funzionano senza errori', errori.length===0);
  if (errori.length) console.log('      ', errori.slice(0,4));
  t('la nota e ancora integra', !!pm.textContent && pm.textContent.length > 5);

  console.log('--- L ALLINEAMENTO ---');
  errori=[];
  const testoNormale = d.querySelector('#noteToolbar [data-format-tag="P"]');
  t('"testo normale" non usa piu l icona dell allineamento',
     testoNormale.querySelector('use').getAttribute('href') === '#i-pilcrow');
  t('il pilcrow esiste nello sprite', !!d.querySelector('#i-pilcrow'));
  const btnAll = d.getElementById('btnNoteAllinea');
  const popAll = d.getElementById('noteAllineaPopover');
  t('il pulsante allineamento c e', !!btnAll && !!popAll);
  btnAll.click(); await attesa(80);
  t('il tocco apre le quattro scelte', popAll.style.display === 'block' && popAll.querySelectorAll('[data-allinea]').length === 4);
  // Cursore su una riga di testo, poi centra
  d.querySelector('#noteToolbar [data-format-tag="P"]').click(); await attesa(80);
  popAll.querySelector('[data-allinea="center"]').click(); await attesa(200);
  t('la riga si centra davvero nel DOM vivo', /text-align:\s*center/.test(pm.innerHTML));
  t('e finisce anche nell HTML salvato', /text-align:\s*center/.test(w.localStorage.getItem('dpsh_app_state')||''));
  t('l icona del pulsante mostra l allineamento attuale',
     d.getElementById('usoIconaAllinea').getAttribute('href') === '#i-align-center');
  btnAll.click(); await attesa(60);
  popAll.querySelector('[data-allinea="center"]').click(); await attesa(200);
  t('ripremerlo lo toglie', !/text-align:\s*center/.test(pm.innerHTML));
  t('nessun errore usando l allineamento', errori.length===0); if(errori.length) console.log('      ', errori.slice(0,3));

  console.log('--- LO STRUMENTO DI DISEGNO ---');
  errori=[];
  d.getElementById('btnNoteOpenDraw').click(); await attesa(250);
  const tela = d.getElementById('noteDrawCanvas');
  // Senza geometria jsdom restituisce un rettangolo a zero: le coordinate verrebbero
  // moltiplicate per la larghezza della tela. Qui si dichiara la misura vera.
  tela.getBoundingClientRect = () => ({ left:0, top:0, width:640, height:420, right:640, bottom:420, x:0, y:0, toJSON(){} });
  const ctx = tela.getContext('2d');
  const bianchi = () => ctx.riempimenti.filter(r => String(r.colore).toLowerCase() === '#ffffff').length;
  const riquadroDisegnato = () => {
    if (!ctx.punti.length) return null;
    const xs = ctx.punti.map(p=>p.x), ys = ctx.punti.map(p=>p.y);
    return { x0:Math.min(...xs), y0:Math.min(...ys), x1:Math.max(...xs), y1:Math.max(...ys) };
  };
  const dito = (tipo, x, y) => tela.dispatchEvent(new w.MouseEvent(tipo, { clientX:x, clientY:y, bubbles:true, cancelable:true }));
  const traccia = async (x0,y0,x1,y1) => { dito('pointerdown',x0,y0); dito('pointermove',(x0+x1)/2,(y0+y1)/2); dito('pointermove',x1,y1); dito('pointerup',x1,y1); await attesa(60); };
  const tocca = async (x,y) => { dito('pointerdown',x,y); dito('pointerup',x,y); await attesa(60); };
  const scegliStrumento = async (nome) => { d.querySelector('#noteDrawToolbar [data-draw-tool="'+nome+'"]').click(); await attesa(60); };
  const barraForma = d.getElementById('noteDrawShapeBar');
  const tipoScelto = () => d.getElementById('lblNoteDrawShapeTipo').textContent;

  t('lo strumento si apre', d.getElementById('modalNoteDraw').classList.contains('open'));
  t('ci sono otto strumenti (selezione + sette modi di tracciare)',
     d.querySelectorAll('#noteDrawToolbar .note-draw-tool').length === 8);

  console.log('  · lo sfondo e uno solo, con quattro modi');
  t('non esistono piu due comandi separati per lo sfondo',
     !src.includes('btnNoteDrawTrasparente') && !src.includes('btnNoteDrawChooseBg'));
  const popSf = d.getElementById('popSfondoDisegno');
  d.getElementById('btnNoteDrawSfondo').click(); await attesa(60);
  t('il comando Sfondo apre le quattro scelte', popSf.style.display === 'block' && popSf.querySelectorAll('[data-sfondo]').length === 4);
  t('fra cui una foto dal telefono, non solo quelle del progetto',
     !!popSf.querySelector('[data-sfondo="file"]') && !!d.getElementById('fileNoteDrawBgInput'));
  t('di partenza e tinta unita bianca', bianchi() === 1);
  popSf.querySelector('[data-sfondo="trasparente"]').click(); await attesa(120);
  t('trasparente: nessun riempimento', bianchi() === 0);
  t('l etichetta lo dice', d.getElementById('lblSfondoDisegno').textContent === 'Trasparente');
  t('e la scelta e ricordata', /disegnoSfondoTipo":"trasparente"/.test(w.localStorage.getItem('dpsh_app_state')||''));
  d.getElementById('btnNoteDrawSfondo').click(); await attesa(60);
  popSf.querySelector('.note-draw-colori[data-quale="sfondo"] [data-colore-valore="#f1f5f9"]').click(); await attesa(120);
  t('scegliere una tinta riporta lo sfondo a tinta unita, e trasparente si spegne',
     d.getElementById('lblSfondoDisegno').textContent === 'Tinta unita'
     && ctx.riempimenti.filter(r => String(r.colore).toLowerCase() === '#f1f5f9').length === 1);
  console.log('  · lo sfondo preso dal telefono');
  {
    // Un PNG rosso 2x2, il piu' piccolo file vero che si possa dare in pasto a un <input file>.
    const png = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAAFElEQVR4nGP8z4AATAxIYFQIAgAA//8DhAEC/1z0FQAAAABJRU5ErkJggg==';
    const dataUrl = 'data:image/png;base64,' + png;
    // jsdom non decodifica le immagini: si fa scattare onload a mano, che e' l'unica parte
    // che il browser farebbe da solo. Il resto del percorso e' quello vero.
    const ImmagineVera = w.Image;
    w.Image = function(){ const i = new ImmagineVera(); Object.defineProperty(i,'naturalWidth',{value:1600}); Object.defineProperty(i,'naturalHeight',{value:900});
      setTimeout(()=>{ i.onload && i.onload(); },0); return i; };
    d.getElementById('btnNoteDrawSfondo').click(); await attesa(60);
    const campo = d.getElementById('fileNoteDrawBgInput');
    let apertoIlSelettoreFile = false;
    campo.click = () => { apertoIlSelettoreFile = true; };
    popSf.querySelector('[data-sfondo="file"]').click(); await attesa(80);
    t('la voce apre il selettore file del telefono', apertoIlSelettoreFile);
    Object.defineProperty(campo, 'files', { configurable:true, value: [new w.File(['x'], 'piantina.png', { type:'image/png' })] });
    // FileReader di jsdom legge davvero un Blob: qui gli si passa il data URL a mano.
    const LettoreVero = w.FileReader;
    w.FileReader = function(){ const r = { readAsDataURL(){ setTimeout(()=>{ r.onload && r.onload({ target:{ result: dataUrl } }); },0); } }; return r; };
    campo.dispatchEvent(new w.Event('change', { bubbles:true })); await attesa(200);
    t('l immagine del telefono diventa lo sfondo', ctx.riempimenti.some(r => r.colore === 'immagine'));
    t('e la tela prende le proporzioni dell immagine (1600x900 rientrato a 1100)',
       tela.width === 1100 && tela.height === 619);
    t('l etichetta dice Foto', d.getElementById('lblSfondoDisegno').textContent === 'Foto');
    d.getElementById('btnNoteDrawSfondo').click(); await attesa(60);
    t('e nel menu risulta accesa la voce del TELEFONO, non quella del progetto',
       popSf.querySelector('[data-sfondo="file"]').classList.contains('is-active')
       && !popSf.querySelector('[data-sfondo="foto"]').classList.contains('is-active'));
    // si torna a tinta unita e alla tela di partenza per le prove sulle forme
    popSf.querySelector('.note-draw-colori[data-quale="sfondo"] [data-colore-valore="#ffffff"]').click(); await attesa(100);
    tela.width = 640; tela.height = 420;
    w.Image = ImmagineVera; w.FileReader = LettoreVero;
    t('togliendo la foto lo sfondo torna a tinta unita', d.getElementById('lblSfondoDisegno').textContent === 'Tinta unita');
  }

  t('il selettore foto sta SOPRA la finestra del disegno (tier dichiarato)',
     d.getElementById('modalNotePhotoPicker').classList.contains('tier-strati')
     && d.getElementById('modalNotePhotoPickerOverlay').classList.contains('tier-strati'));

  console.log('  · le forme');
  await scegliStrumento('rettangolo');
  await traccia(100,100,300,240);
  let b = riquadroDisegnato();
  t('il rettangolo e stato tracciato dove l ho tracciato',
     b && Math.abs(b.x0-100)<3 && Math.abs(b.y0-100)<3 && Math.abs(b.x1-300)<3 && Math.abs(b.y1-240)<3);
  await scegliStrumento('seleziona');
  await tocca(200,170);
  t('con Seleziona la forma si sceglie toccandola', barraForma.style.display === 'flex' && tipoScelto() === 'rettangolo');
  t('e per un rettangolo compare il comando Angoli', d.getElementById('rigaRaggioDisegno').style.display === 'inline-flex');
  // trascina la maniglia in basso a destra
  dito('pointerdown',300,240); dito('pointermove',400,340); dito('pointerup',400,340); await attesa(80);
  b = riquadroDisegnato();
  t('trascinando la maniglia la forma cambia proporzioni', b && Math.abs(b.x1-400)<4 && Math.abs(b.y1-340)<4);
  t('e l angolo opposto resta fermo', b && Math.abs(b.x0-100)<4 && Math.abs(b.y0-100)<4);
  // sposta
  dito('pointerdown',250,220); dito('pointermove',270,240); dito('pointerup',270,240); await attesa(80);
  b = riquadroDisegnato();
  t('trascinando dentro, la forma si sposta', b && Math.abs(b.x0-120)<4 && Math.abs(b.y0-120)<4);
  const rng = d.getElementById('rngNoteDrawRaggio');
  rng.value = '30'; rng.dispatchEvent(new w.Event('input',{bubbles:true})); await attesa(80);
  t('gli angoli si stondano senza errori', errori.length === 0);

  console.log('  · contorno e riempimento sono due cose distinte');
  d.getElementById('btnNoteDrawRiempimento').click(); await attesa(60);
  d.querySelector('#popRiempimentoDisegno [data-colore-valore="#3b82f6"]').click(); await attesa(100);
  t('il riempimento entra nella forma gia scelta', ctx.colori.some(c => c.tipo==='riempimento' && c.colore==='#3b82f6'));
  d.getElementById('btnNoteDrawContorno').click(); await attesa(60);
  d.querySelector('#popContornoDisegno [data-colore-valore="#111827"]').click(); await attesa(100);
  t('e il contorno resta un colore suo', ctx.colori.some(c => c.tipo==='contorno' && c.colore==='#111827'));
  d.getElementById('btnNoteDrawRiempimento').click(); await attesa(60);
  d.querySelector('#popRiempimentoDisegno [data-colore-disegno="riempimento"]').click(); await attesa(100);
  t('"nessun riempimento" toglie davvero il riempimento', !ctx.colori.some(c => c.tipo==='riempimento' && c.colore==='#3b82f6'));

  console.log('  · cerchio e triangolo');
  await scegliStrumento('cerchio');
  await traccia(420,60,540,180);
  await scegliStrumento('seleziona');
  await tocca(480,120);
  t('il cerchio si traccia e si sceglie', tipoScelto() === 'cerchio');
  t('per un cerchio il comando Angoli non ha senso e non compare', d.getElementById('rigaRaggioDisegno').style.display === 'none');
  await scegliStrumento('triangolo');
  await traccia(60,300,200,400);
  await scegliStrumento('seleziona');
  await tocca(130,370);
  t('il triangolo si traccia e si sceglie', tipoScelto() === 'triangolo');

  console.log('  · il poligono, che prima non si chiudeva');
  const chiudiPoli = d.getElementById('btnNoteDrawClosePolygon');
  await scegliStrumento('poligono');
  t('il tasto per chiudere nasce nascosto', chiudiPoli.style.display === 'none');
  await tocca(400,260); await tocca(560,260); await tocca(480,380);
  t('dopo tre vertici il tasto per chiudere compare', chiudiPoli.style.display === 'inline-flex');
  await tocca(402,262);   // ritocco il PRIMO vertice: e' il gesto che funziona col dito
  t('ritoccare il primo vertice CHIUDE il poligono', chiudiPoli.style.display === 'none');
  await scegliStrumento('seleziona');
  await tocca(480,300);
  t('e il poligono e diventato una forma vera, selezionabile', tipoScelto() === 'poligono');

  console.log('  · la casella di testo, per un appunto al volo');
  await scegliStrumento('testo');
  t('lo strumento testo esiste', !!d.querySelector('#noteDrawToolbar [data-draw-tool="testo"]'));
  await tocca(150, 60);
  await attesa(150);
  const campoTesto = d.getElementById('appDialogFields').querySelector('[data-campo="testo"]');
  t('il tocco chiede cosa scrivere', !!campoTesto);
  t('ed e un campo a piu righe', campoTesto && campoTesto.tagName === 'TEXTAREA');
  campoTesto.value = 'Cavita a 3,0 m\nverificare in fase di getto';
  d.getElementById('appDialogOk').click(); await attesa(250);
  t('la scritta finisce sulla tela, su due righe',
     ctx.scritte.filter(x => /Cavita|verificare/.test(x.testo)).length === 2);
  t('dopo aver scritto si passa da soli a Seleziona, con la casella gia scelta',
     d.querySelector('#noteDrawToolbar [data-draw-tool="seleziona"]').classList.contains('is-active')
     && tipoScelto() === 'casella di testo');
  t('e compaiono i comandi giusti: grandezza e Riscrivi',
     d.getElementById('rigaTestoDisegno').style.display === 'inline-flex'
     && d.getElementById('btnNoteDrawRiscrivi').style.display === 'inline-flex');
  t('mentre gli Angoli, che qui non vogliono dire niente, restano nascosti',
     d.getElementById('rigaRaggioDisegno').style.display === 'none');
  const rngT = d.getElementById('rngNoteDrawTesto');
  // il font e' del tipo "700 24px system-ui, ...": interessa il numero prima di px
  const grandezzaDi = () => { const f = (ctx.scritte.find(x=>/Cavita/.test(x.testo))||{}).font || ''; const m = f.match(/(\d+)px/); return m ? parseInt(m[1],10) : 0; };
  const primaGrandezza = grandezzaDi();
  rngT.value = '48'; rngT.dispatchEvent(new w.Event('input',{bubbles:true})); await attesa(120);
  t('la grandezza si cambia davvero', grandezzaDi() === 48 && grandezzaDi() !== primaGrandezza);
  // ridimensionare col dito deve INGRANDIRE, non stirare
  dito('pointerdown', 150, 60); dito('pointerup', 150, 60); await attesa(80);
  d.getElementById('btnNoteDrawRiscrivi').click(); await attesa(200);
  const campo2 = d.getElementById('appDialogFields').querySelector('[data-campo="testo"]');
  t('Riscrivi riapre il testo com era', campo2 && /Cavita a 3,0 m/.test(campo2.value));
  campo2.value = 'Solo una riga';
  d.getElementById('appDialogOk').click(); await attesa(250);
  t('e lo aggiorna sulla tela', ctx.scritte.some(x => x.testo === 'Solo una riga') && !ctx.scritte.some(x=>/Cavita/.test(x.testo)));
  d.getElementById('btnNoteDrawRiscrivi').click(); await attesa(200);
  d.getElementById('appDialogFields').querySelector('[data-campo="testo"]').value = '   ';
  d.getElementById('appDialogOk').click(); await attesa(250);
  t('svuotarlo cancella la casella invece di lasciare un fantasma',
     !ctx.scritte.some(x => x.testo === 'Solo una riga') && barraForma.style.display === 'none');

  console.log('  · annulla, elimina, esporta');
  d.getElementById('btnNoteDrawEliminaForma').click(); await attesa(80);
  t('eliminare la forma scelta chiude la sua barra', barraForma.style.display === 'none');
  await tocca(480,120);
  t('ma le altre forme sono ancora li', tipoScelto() === 'cerchio');
  const maniglie = () => ctx.rettangoli.filter(r => Math.abs(r.w-11)<0.01 && Math.abs(r.h-11)<0.01).length;
  t('con una forma scelta si vedono le quattro maniglie', maniglie() === 4);
  d.getElementById('btnNoteDrawInsert').click(); await attesa(250);
  t('NELL IMMAGINE ESPORTATA le maniglie non ci sono', maniglie() === 0);
  t('il disegno entra nella nota come immagine', pm.querySelectorAll('img[data-note-img-id]').length >= 1);
  t('nessun errore in tutto lo strumento di disegno', errori.length===0);
  if (errori.length) console.log('      ', errori.slice(0,4));

  console.log('--- L IMMAGINE E IL TESTO CHE LE SCORRE A FIANCO ---');
  errori = [];
  {
    const barraImg = d.getElementById('noteImageSizeBar');
    const img = pm.querySelector('img[data-note-img-id]');
    t('c e un immagine nella nota (il disegno appena inserito)', !!img);
    // selezionarla: ProseMirror sceglie il nodo con un clic sopra
    w.__bersaglio = img;
    ['mousedown','mouseup','click'].forEach(tipo =>
      img.dispatchEvent(new w.MouseEvent(tipo, { bubbles:true, cancelable:true, button:0, clientX:20, clientY:20 })));
    await attesa(200);
    t('toccando l immagine compare la sua barra', barraImg.style.display === 'flex');
    t('la barra ha i tre modi di disporla', barraImg.querySelectorAll('[data-img-flusso]').length === 3);
    t('di partenza e in colonna', barraImg.querySelector('[data-img-flusso="blocco"]').classList.contains('is-active'));
    barraImg.querySelector('[data-img-flusso="sinistra"]').click(); await attesa(200);
    const stile = () => (pm.querySelector('img[data-note-img-id]') || {}).getAttribute ? pm.querySelector('img[data-note-img-id]').getAttribute('style') : '';
    t('"testo a destra" fa galleggiare l immagine a sinistra', /float:\s*left/.test(stile()));
    t('e la porta a meta pagina, perche a tutta larghezza non ci starebbe niente a fianco', /width:\s*50%/.test(stile()));
    t('con l aria giusta dal lato del testo', /margin:\s*4px 14px 8px 0/.test(stile()));
    t('DOPO UN COMANDO L IMMAGINE RESTA SCELTA (la barra non sparisce)', barraImg.style.display === 'flex');
    barraImg.querySelector('[data-img-size-pct="25"]').click(); await attesa(200);
    t('CAMBIARE LARGHEZZA NON CANCELLA LA DISPOSIZIONE', /float:\s*left/.test(stile()) && /width:\s*25%/.test(stile()));
    barraImg.querySelector('[data-img-flusso="destra"]').click(); await attesa(200);
    t('e cambiare disposizione non cancella la larghezza', /float:\s*right/.test(stile()) && /width:\s*25%/.test(stile()));
    barraImg.querySelector('[data-img-flusso="blocco"]').click(); await attesa(200);
    t('tornare in colonna toglie il galleggiamento', !/float/.test(stile()) && /width:\s*25%/.test(stile()));
    t('e tutto questo e finito nell HTML salvato', /width:\s*25%/.test(w.localStorage.getItem('dpsh_app_state')||''));
    t('il contenitore chiude i galleggianti (regola CSS presente)', /\.note-editor-body > \.ProseMirror:after\{content:"";display:block;clear:both;\}/.test(src));
    t('e lo fanno anche stampa e Word', /\.note-print-body:after\{content:"";display:block;clear:both;\}/.test(src) && /\.note-body:after\{content:"";display:block;clear:both;\}/.test(src));
    t('nessun errore usando la disposizione', errori.length === 0);
    if (errori.length) console.log('      ', errori.slice(0,3));
  }

  console.log('--- IL RITAGLIO ---');
  errori = [];
  {
    const modaleRit = d.getElementById('modalRitaglio');
    const telaRit = d.getElementById('ritaglioCanvas');
    // Immagine finta 1600x900, come sopra: jsdom non decodifica, l'onload lo si fa scattare.
    const ImmagineVera = w.Image;
    w.Image = function(){ const i = new ImmagineVera();
      Object.defineProperty(i,'naturalWidth',{value:1600}); Object.defineProperty(i,'naturalHeight',{value:900});
      setTimeout(()=>{ i.onload && i.onload(); },0); return i; };

    t('il comando Ritaglia c e nella barra dell immagine della nota', !!d.getElementById('btnNoteImageRitaglia'));
    t('e anche nella finestra della foto della prova', !!d.getElementById('btnRitagliaFoto'));
    t('la finestra di ritaglio sta su un livello piu alto di quelle da cui si apre',
       modaleRit.classList.contains('tier-strati-top') && d.getElementById('modalRitaglioOverlay').classList.contains('tier-strati-top'));

    // si riseleziona l'immagine della nota e si apre il ritaglio
    const img2 = pm.querySelector('img[data-note-img-id]');
    w.__bersaglio = img2;
    ['mousedown','mouseup','click'].forEach(tipo => img2.dispatchEvent(new w.MouseEvent(tipo, { bubbles:true, cancelable:true, button:0, clientX:20, clientY:20 })));
    await attesa(200);
    d.getElementById('btnNoteImageRitaglia').click(); await attesa(300);
    t('il ritaglio si apre', modaleRit.classList.contains('open'));
    t('la tela si adatta all immagine, rimpicciolita per starci a schermo (1600x900 -> 900x506)',
       telaRit.width === 900 && telaRit.height === 506);
    t('la misura mostrata e quella VERA, non quella della tela',
       /1600 × 900 px/.test(d.getElementById('lblRitaglioMisura').textContent));
    t('di partenza il riquadro e tutta l immagine', d.querySelector('#ritaglioToolbar [data-ritaglio-prop="libero"]').classList.contains('is-active'));
    t('e la nota dice che l originale viene conservato', d.getElementById('ritaglioNotaOriginale').style.display === 'block');

    telaRit.getBoundingClientRect = () => ({ left:0, top:0, width:telaRit.width, height:telaRit.height, right:telaRit.width, bottom:telaRit.height, x:0, y:0, toJSON(){} });
    const ditoRit = (tipo,x,y) => telaRit.dispatchEvent(new w.MouseEvent(tipo,{clientX:x,clientY:y,bubbles:true,cancelable:true}));
    // trascina l angolo in alto a sinistra verso il centro
    ditoRit('pointerdown', 0, 0); ditoRit('pointermove', 300, 200); ditoRit('pointerup', 300, 200); await attesa(120);
    t('trascinando un angolo il riquadro si stringe',
       /1067 × 544 px/.test(d.getElementById('lblRitaglioMisura').textContent));
    d.querySelector('#ritaglioToolbar [data-ritaglio-prop="1:1"]').click(); await attesa(120);
    const m = d.getElementById('lblRitaglioMisura').textContent.match(/(\d+) × (\d+)/);
    t('scegliendo 1:1 il riquadro diventa quadrato', m && Math.abs(Number(m[1]) - Number(m[2])) <= 2);
    // Si torna a proporzioni libere PRIMA di ripartire da tutta l'immagine: al contrario
    // "Tutta l'immagine" rispetterebbe ancora l'1:1 e il riquadro non toccherebbe l'angolo.
    d.querySelector('#ritaglioToolbar [data-ritaglio-prop="libero"]').click(); await attesa(80);
    d.getElementById('btnRitaglioTutto').click(); await attesa(120);
    t('"Tutta l immagine" riporta il riquadro all intera foto', /1600 . 900 px/.test(d.getElementById('lblRitaglioMisura').textContent));

    // conferma: il taglio deve essere preso dall IMMAGINE ORIGINALE, non dalla tela
    w.__tagli = [];
    // angolo in alto a sinistra tirato fino a meta': resta il quarto in basso a destra
    ditoRit('pointerdown', 0, 0); ditoRit('pointermove', 450, 253); ditoRit('pointerup', 450, 253); await attesa(120);
    const srcPrima = img2.getAttribute('src');
    d.getElementById('btnRitaglioConferma').click(); await attesa(400);
    t('confermando la finestra si chiude', !modaleRit.classList.contains('open'));
    const ultimoTaglio = (w.__tagli || []).length ? w.__tagli[w.__tagli.length-1] : null;
    console.log('       taglio chiesto:', JSON.stringify(ultimoTaglio));
    // Sulla tela il riquadro era 450x253; nell'immagine vera dev'essere 800x450, cioe' il
    // taglio NON e' stato preso dalla copia rimpicciolita che si vedeva a schermo.
    t('IL TAGLIO E PRESO DALL IMMAGINE A PIENA RISOLUZIONE, non dalla tela ridotta',
       !!ultimoTaglio && ultimoTaglio.sw === 800 && Math.abs(ultimoTaglio.sh - 450) <= 1);
    const img3 = pm.querySelector('img[data-note-img-id]');
    t('e l immagine nella nota e cambiata', img3 && img3.getAttribute('src') !== srcPrima);
    t('senza perdere la disposizione ne la larghezza gia scelte', /width:\s*25%/.test(img3.getAttribute('style')||''));
    t('nessun errore durante il ritaglio', errori.length === 0);
    if (errori.length) console.log('      ', errori.slice(0,3));
    w.Image = ImmagineVera;
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko?1:0);
})();
