// TEMPLATE IMPORTATI SICURI (Revisione 2026-11, A2 / A3 / C2).
//
// Un template di report o d'indice arriva anche da fuori: un file «ti mando il mio template», o un
// template che viaggia dentro il progetto. Il suo nome, il suo id e il testo dei suoi blocchi
// (richHtml) finivano nella pagina come HTML. Qui si importa un file con il codice dappertutto e si
// guarda che niente giri: nella libreria dei template, nella finestra di esportazione PDF, nel
// rendering del report. Si controlla anche l'altra faccia, quella che costa di piu' sbagliare: un
// testo scritto con l'editor, o il modello predefinito, deve uscire dal sanificatore IDENTICO.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const attesa = (ms) => new Promise(r => setTimeout(r, ms));

const CATTIVO = '<img src=x onerror="window.__xss=1">';

(async () => {
  const stato = JSON.stringify({ projects: {
    p1: { id: 'p1', name: 'Cantiere', createdAt: 1, strati: [], surveys: {
      s1: { id: 's1', name: 'DPSH 1', header: {}, data: [] },
      s2: { id: 's2', name: 'DPSH 2', header: {}, data: [] } } }
  }, settings: {} });
  const app = await avviaApp({ stato });
  const E = (c) => app.E(c);
  const avvisiUtente = [];
  app.w.alert = (m) => avvisiUtente.push(String(m));
  // Importa un file di template come lo farebbe l utente: legge il file, poi risponde «si» alla conferma.
  const importa = async (testo, conferma = true) => {
    avvisiUtente.length = 0;
    E(`importaBackupTemplateReport(new File([${JSON.stringify(testo)}], 't.json', { type: 'application/json' }))`);
    await attesa(300);
    const d = app.dialogo();
    if (d) { (conferma ? d.ok : d.annulla).click(); await attesa(300); }
  };

  console.log('--- Il sanificatore: ciò che l editor produce passa IDENTICO ---');
  {
    // Testo vero, prodotto dal motore dell editor (TipTap) con tutto ciò che la barra sa fare.
    const html = E(`(() => {
      const { Editor, ESTENSIONI } = window.NoteEditor;
      const el = document.createElement('div'); document.body.appendChild(el);
      const ed = new Editor({ element: el, extensions: ESTENSIONI, content: '' });
      ed.commands.setContent('<h2>Titolo</h2><p style="text-align: justify">Un <strong>grassetto</strong>, un <em>corsivo</em>, <u>sottolineato</u>, <s>barrato</s>, <sub>2</sub> e <sup>2</sup>, un <a href="https://esempio.it/x?a=1&amp;b=2">link</a> e <span style="color: #ff0000">rosso</span>. <mark>evidenziato</mark> <span data-tag="comune"></span></p><ul><li><p>uno</p></li><li><p>due</p></li></ul><ol><li><p>primo</p></li></ol><blockquote><p>cit</p></blockquote><table><tbody><tr><th><p>A</p></th><td><p>b</p></td></tr></tbody></table><pre><code>x</code></pre><hr><p>riga<br>dopo</p>');
      const out = ed.getHTML(); ed.destroy(); el.remove(); return out;
    })()`);
    if (!/<strong>/.test(html)) console.log(html);
    t('l editor ha prodotto davvero grassetto, elenchi, link, colore, tabella e tag @', /<strong>/.test(html) && /<ul>/.test(html) && /<ol>/.test(html) && /<a [^>]*href=/.test(html) && /color/.test(html) && /<table/.test(html) && /data-tag=/.test(html));
    t('esce identico dal sanificatore', E(`sanificaHtmlTemplate(${JSON.stringify(html)})`) === html);
    // Stessa cosa con un elenco di controllo e un immagine incorporata.
    const html2 = '<ul data-type="taskList"><li data-checked="true" data-type="taskItem"><label><input type="checkbox" checked="checked"><span></span></label><div><p>fatto</p></div></li></ul><p><img src="data:image/png;base64,iVBORw0KGgo=" style="width: 50%" data-note-inline="1"></p>';
    t('elenco di controllo e immagine incorporata passano identici', E(`sanificaHtmlTemplate(${JSON.stringify(html2)})`) === html2);
  }
  {
    // I testi dei modelli predefiniti dell introduzione (titolo + corpo di ogni sezione).
    const sezioni = E(`JSON.stringify(Object.values(SEZIONI_MODELLO_INTRODUZIONE).map(s => (s.titolo ? '<h' + (s.livelloTitolo || 1) + '>' + s.titolo + '</h' + (s.livelloTitolo || 1) + '>' : '') + (s.corpo || '')))`);
    const lista = JSON.parse(sezioni);
    t('ci sono i modelli predefiniti da provare', lista.length >= 3);
    t('ogni modello predefinito esce identico', lista.every(h => E(`sanificaHtmlTemplate(${JSON.stringify(h)})`) === h));
    // E non per caso: il confronto interno (nessun nodo tolto) vale anche sul testo già rigenerato.
    t('anche il testo generato dal modello (con i dati del cantiere) esce identico', E(`(() => {
      const proj = state.projects.p1;
      return Object.values(SEZIONI_MODELLO_INTRODUZIONE).every(s => {
        const modello = (s.titolo ? '<h1>' + s.titolo + '</h1>' : '') + (s.corpo || '');
        const h = generaTestoDaModello(modello, proj, 7, {}).html;
        return sanificaHtmlTemplate(h) === h;
      });
    })()`) === true);
  }

  console.log('--- Il sanificatore: toglie il codice ---');
  {
    const S = (h) => E(`sanificaHtmlTemplate(${JSON.stringify(h)})`);
    t('<img onerror> via', !/onerror|<img/i.test(S('<p>a</p>' + CATTIVO)));
    t('<script> e il suo contenuto via', !/script|alert/i.test(S('<p>a</p><script>alert(1)</script>')));
    t('<iframe> via', !/iframe/i.test(S('<iframe src="https://x.test"></iframe><p>ok</p>')) && /ok/.test(S('<iframe></iframe><p>ok</p>')));
    t('<style> via', !/style|expression/i.test(S('<style>body{background:url(x)}</style><p>a</p>')));
    t('on* via, il testo resta', (() => { const o = S('<p onclick="x()" onmouseover="y()">testo</p>'); return !/on\w+=/i.test(o) && />testo</.test(o); })());
    t('href javascript: via (anche con spazi)', !/javascript/i.test(S('<a href="java\nscript:alert(1)">x</a><a href=" JavaScript:alert(1)">y</a>')));
    t('href https resta', /href="https:\/\/a\.it"/.test(S('<a href="https://a.it" onclick="x">x</a>')));
    t('style con url( o expression via, il resto resta', (() => { const o = S('<p style="color:red; background:url(javascript:alert(1)); width:expression(alert(1))">x</p>'); return /color:\s*red/.test(o) && !/url|expression|javascript/i.test(o); })());
    t('position:fixed via', !/fixed/.test(S('<div style="position:fixed; top:0">x</div>')));
    t('immagine da URL esterno (C2) via', !/tracciatore|<img/.test(S('<p><img src="https://tracciatore.test/p.gif"></p>')));
    t('immagine data: resta', /<img src="data:image\/png;base64,AAAA"/.test(S('<img src="data:image/png;base64,AAAA">')));
    t('data:text/html in un immagine via', !/data:text/.test(S('<img src="data:text/html;base64,PHNjcmlwdD4=">')));
    t('svg e math via', !/svg|math|onload/i.test(S('<svg onload="x()"><circle/></svg><math><mi>x</mi></math>')));
    t('un tag sconosciuto perde solo il tag', S('<blink>ciao</blink>') === 'ciao');
    t('input che non e una casella via', !/<input/.test(S('<input type="text" value="x">')));
    t('non stringhe diventano vuote', E(`sanificaHtmlTemplate(null) + sanificaHtmlTemplate(5) + sanificaHtmlTemplate({})`) === '');
  }

  console.log('--- Import di un file di template con il codice dappertutto ---');
  await attesa(50);
  const file = {
    version: '1.0', app: 'DPSH Field Collector - Template di Report',
    reportTemplates: {
      ['x"><img src=x onerror="window.__xss=1">']: {
        id: 'y"><img src=x onerror="window.__xss=1">',
        name: CATTIVO + 'Template "furbo"',
        pages: [{
          rows: [{ id: 'r1', blocks: [
            { id: 'b1', type: 'testo', colSpan: 4, fontSizePt: '11;background:url(x)', richHtml: '<p>Ciao <strong>mondo</strong></p>' + CATTIVO + '<script>window.__xss=2</script><a href="javascript:window.__xss=3">x</a>' },
            { id: 'b2', type: 'titolo', fontSizePt: '11;background:url(x)', livelloTitolo: 'H1', richHtml: '<h1>Titolo' + CATTIVO + '</h1>' }
          ] }],
          header: { html: CATTIVO + '<p>testata</p>', text: CATTIVO, imageDataUrl: 'https://tracciatore.test/p.gif' },
          footer: { html: '<p>piede</p>' + CATTIVO, text: CATTIVO }
        }]
      },
      ['__proto__']: { name: 'prototipo', polluted: true }
    }
  };
  // JSON.parse crea __proto__ come proprieta propria: serve il testo, non un oggetto letterale.
  const testoFile = JSON.stringify(file).replace('"__proto__"', '"__proto__"');
  const nPrima = E('Object.keys(state.reportTemplates).length');
  await importa(testoFile);
  const nDopo = E('Object.keys(state.reportTemplates).length');
  t('il template e il suo gemello __proto__ entrano come template nuovi', nDopo - nPrima === 2);
  t('nessuna chiave dello stato e un id con codice', E(`Object.keys(state.reportTemplates).every(k => idSicuro(k))`) === true);
  t('l id interno e quello della chiave', E(`Object.entries(state.reportTemplates).every(([k, v]) => v.id === k)`) === true);
  t('il prototipo non e stato inquinato', E(`({}).polluted === undefined && Object.getPrototypeOf(state.reportTemplates).polluted === undefined`) === true);
  const importato = JSON.parse(E(`JSON.stringify(Object.values(state.reportTemplates).find(x => /furbo/.test(x.name)))`));
  const bl = importato.pages[0].rows[0].blocks;
  t('il testo del blocco e stato ripulito all ingresso', !/onerror|script|javascript/i.test(bl[0].richHtml) && /<strong>mondo<\/strong>/.test(bl[0].richHtml));
  t('fontSizePt non numerico e stato tolto', bl[0].fontSizePt === undefined && bl[1].fontSizePt === undefined);
  t('colSpan e il resto non cambiano', bl[0].colSpan === 4 && bl[0].type === 'testo' && bl[1].livelloTitolo === 'H1');
  t('intestazione e piede ripuliti, l immagine esterna tolta', !/onerror/.test(importato.pages[0].header.html) && !/onerror/.test(importato.pages[0].footer.html) && importato.pages[0].header.imageDataUrl === '');
  t('il nome resta com e (si fa escape quando si mostra)', importato.name === CATTIVO + 'Template "furbo"');

  console.log('--- La libreria dei template, la finestra PDF, il rendering ---');
  {
    E(`openReportTemplatesModal()`);
    const lista = E(`document.getElementById('reportTemplatesList').innerHTML`);
    t('la libreria mostra il nome come testo', lista.indexOf(testoEsc(CATTIVO)) >= 0 || /&lt;img/.test(lista));
    t('niente elemento img con onerror nella libreria', E(`document.querySelectorAll('#reportTemplatesList [onerror], #reportTemplatesList img').length`) === 0);
    t('nessun elemento ha attributi on*', E(`Array.from(document.querySelectorAll('#reportTemplatesList *')).every(e => !Array.from(e.attributes).some(a => /^on/i.test(a.name)))`) === true);
    t('il titolo del pulsante contiene il nome intero', E(`Array.from(document.querySelectorAll('#reportTemplatesList .tpl-report-modifica[title]')).some(b => b.title.indexOf('Template "furbo"') >= 0)`) === true);

    // Anche con un template GIA' nello stato con nome e id cattivi (stato salvato da prima, o scritto
    // da un altro percorso): la lista e la finestra PDF devono comunque mostrarlo come testo.
    E(`state.reportTemplates['tpl_diretto'] = { id: 'tpl_diretto', name: ${JSON.stringify(CATTIVO)}, pages: [] }; state.reportTemplates[${JSON.stringify('a"><img src=x onerror="window.__xss=1">')}] = { id: ${JSON.stringify('a"><img src=x onerror="window.__xss=1">')}, name: 'id cattivo', pages: [] };`);
    E(`renderReportTemplatesList()`);
    t('la lista regge anche nomi e id cattivi gia nello stato', E(`document.querySelectorAll('#reportTemplatesList [onerror], #reportTemplatesList img').length`) === 0);
    E(`state.indiceTemplates['idx_x'] = Object.assign(stileIndiceDiDefault(), { id: 'idx_x', name: ${JSON.stringify(CATTIVO)} }); state.indiceTemplates[${JSON.stringify('b"><img src=x onerror="window.__xss=1">')}] = Object.assign(stileIndiceDiDefault(), { id: ${JSON.stringify('b"><img src=x onerror="window.__xss=1">')}, name: 'idx cattivo' }); renderIndiceTemplatesList()`);
    t('la lista dei template indice non esegue niente', E(`document.querySelectorAll('#indiceTemplatesList [onerror], #indiceTemplatesList img').length`) === 0);

    E(`apriEsportazionePdfModal({ type: 'project', id: 'p1' })`);
    await attesa(50);
    t('la finestra PDF ha le opzioni dei template', E(`document.querySelectorAll('#modalEsportaPdf option, #esportaPdfListaProve option, select option').length`) > 3);
    t('nessun elemento con onerror nella finestra PDF', E(`document.querySelectorAll('[onerror]').length`) === 0);
    t('nessuna immagine con src=x nel documento', E(`Array.from(document.querySelectorAll('img')).every(i => i.getAttribute('src') !== 'x')`) === true);
    t('un option mostra il nome cattivo come testo', E(`Array.from(document.querySelectorAll('option')).some(o => o.textContent === ${JSON.stringify(CATTIVO)})`) === true);

    // Il rendering: un template che porta il codice DIRETTAMENTE nello stato (salvato prima di questa
    // correzione) non deve eseguirlo nemmeno quando il report si disegna.
    const html = E(`(() => {
      const blk = { id: 'bb', type: 'testo', fontSizePt: '11;background:url(x)', richHtml: '<p>Ciao</p>' + ${JSON.stringify(CATTIVO)} + '<script>window.__xss=4</script>' };
      const tit = { id: 'bt', type: 'titolo', livelloTitolo: 'H1', fontSizePt: '12;x:y', richHtml: '<h1>T</h1>' + ${JSON.stringify(CATTIVO)} };
      const ctx = { anteprima: true, projId: 'p1' };
      return buildBlockContentHtml('testo', ctx, blk, {}) + buildBlockContentHtml('titolo', ctx, tit, {});
    })()`);
    t('il rendering produce il testo', /Ciao/.test(html) && />T</.test(html));
    t('il rendering non contiene onerror, script, url(', !/onerror|<script|url\(/i.test(html));
    t('il rendering usa la misura di ripiego', /var\(--tpl-corpo-pt, 11pt\)/.test(html));
    const piede = E(`htmlPiedeNelMargine({ html: '<p>x</p>' + ${JSON.stringify(CATTIVO)} }, {}, {})`);
    const testata = E(`htmlIntestazioneNelMargine({ html: '<p>x</p>' + ${JSON.stringify(CATTIVO)}, text: ${JSON.stringify(CATTIVO)} }, {}, {})`);
    t('testata e piede del rendering sono ripuliti', !/onerror|<img/i.test(piede) && !/onerror/i.test(testata));
    t('il testo semplice dell intestazione e escapato', /&lt;img/.test(E(`htmlIntestazioneNelMargine({ text: ${JSON.stringify(CATTIVO)} }, {}, {})`)));
    t('un testo semplice normale non cambia', /Studio Rossi &amp; Figli/.test(E(`htmlIntestazioneNelMargine({ text: 'Studio Rossi & Figli' }, {}, {})`)));
  }
  await attesa(100);
  t('window.__xss non e mai stato impostato', E('window.__xss') === undefined);

  console.log('--- Un file di versione piu nuova si rifiuta ---');
  {
    const n0 = E('Object.keys(state.reportTemplates).length');
    const nuovo = JSON.stringify({ versioneSchema: 999, reportTemplates: { tpl_n: { id: 'tpl_n', name: 'Dal futuro', pages: [] } } });
    await importa(nuovo);
    t('non entra niente', E('Object.keys(state.reportTemplates).length') === n0);
    t('l utente riceve un messaggio che parla di versione piu nuova', /versione più nuova/.test(avvisiUtente.join(' ')));
    // Un file senza forma di template
    await importa(JSON.stringify({ reportTemplates: [1, 2] }));
    t('un elenco al posto dell oggetto non e un backup', E('Object.keys(state.reportTemplates).length') === n0 && /non è un backup valido/.test(avvisiUtente.join(' ')));
    // L esportazione porta la versione dei dati
    const v = E(`(() => { let corpo = null; const Orig = Blob; window.Blob = function (parti) { corpo = parti[0]; return new Orig(parti); }; try { esportaBackupTemplateReport(); } catch (e) {} window.Blob = Orig; return corpo ? JSON.parse(corpo).versioneSchema : null; })()`);
    t('un backup esportato porta versioneSchema', v === E('VERSIONE_SCHEMA_DATI'));
  }

  console.log('--- I template che viaggiano col progetto (accogliLibrerie) ---');
  {
    const chiaviPrima = E(`Object.keys(state.reportTemplates)`);
    const malvagio = {
      reportTemplates: {
        ['q"><img src=x onerror="window.__xss=1">']: {
          id: 'q', name: CATTIVO + 'Viaggiatore',
          pages: [{ rows: [{ blocks: [{ id: 'b', type: 'testo', fontSizePt: '9;x:url(y)', richHtml: '<p>ok</p>' + CATTIVO }] }] }]
        },
        constructor: { name: 'riservato', pages: [] }
      },
      indiceTemplates: {}, lithologyArchive: {}
    };
    const progetti = { pp: { id: 'pp', name: 'Arrivato', surveys: { ss: { id: 'ss', reportTemplateId: 'q"><img src=x onerror="window.__xss=1">' } } } };
    const esito = E(`(() => { const lib = JSON.parse(${JSON.stringify(JSON.stringify(malvagio))}); const progetti = JSON.parse(${JSON.stringify(JSON.stringify(progetti))}); const e = accogliLibrerie(lib, progetti, { tutte: true, etichetta: 'da Telefono' }); return JSON.stringify({ e, rid: progetti.pp.surveys.ss.reportTemplateId }); })()`);
    const { e, rid } = JSON.parse(esito);
    t('la voce con id cattivo entra con un id nuovo e sicuro', e.nuove.length >= 1 && E(`idSicuro(${JSON.stringify(rid)})`) === true);
    t('la prova punta alla copia', E(`!!state.reportTemplates[${JSON.stringify(rid)}] && /Viaggiatore/.test(state.reportTemplates[${JSON.stringify(rid)}].name)`) === true);
    const copia = JSON.parse(E(`JSON.stringify(state.reportTemplates[${JSON.stringify(rid)}])`));
    const b = copia.pages[0].rows[0].blocks[0];
    t('il testo del blocco e ripulito, la misura non numerica tolta', !/onerror/.test(b.richHtml) && /<p>ok<\/p>/.test(b.richHtml) && b.fontSizePt === undefined);
    t('le chiavi entrate adesso sono tutte id sicuri', E(`Object.keys(state.reportTemplates)`).filter(k => chiaviPrima.indexOf(k) < 0).every(k => E(`idSicuro(${JSON.stringify(k)})`)));
    t('niente nel DOM dopo il ridisegno', (E(`renderReportTemplatesList()`), E(`document.querySelectorAll('#reportTemplatesList [onerror], #reportTemplatesList img').length`) === 0));
  }
  await attesa(100);
  t('window.__xss ancora indefinito', E('window.__xss') === undefined);

  console.log('--- Costo del sanificatore al rendering ---');
  {
    const ms = E(`(() => { const h = '<h2>Titolo</h2>' + '<p>Un <strong>testo</strong> con <a href="https://x.it">link</a> e un po di parole in piu per farlo lungo.</p>'.repeat(30); const t0 = performance.now(); for (let i = 0; i < 200; i++) { sanificaHtmlTemplate(h + i); } return performance.now() - t0; })()`);
    console.log('  200 blocchi diversi da ~3 KB: ' + ms.toFixed(0) + ' ms');
    t('il costo per blocco e trascurabile (< 20 ms in media, anche in jsdom)', ms / 200 < 20);
  }

  console.log(`\n${ok} ok, ${ko} ko`);
  app.chiudi();
  process.exit(ko ? 1 : 0);

  function testoEsc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
})().catch(e => { console.error(e); process.exit(1); });
