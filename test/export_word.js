// L'EXPORT WORD È LO STESSO DOCUMENTO DEL PDF, IN .docx.
//
// Prima il «Word» era la pagina HTML del report salvata come .doc: Word la impaginava a modo
// suo e non somigliava al PDF. Ora il pulsante Word passa dalla stessa finestra del PDF (stesse
// prove, indice, numerazione), e il documento di stampa diventa un .docx vero (071i): testo e
// tabelle di Word modificabili, disegni come immagini.
//
// jsdom non impagina, quindi qui non si misura la resa (quella si è confrontata nel browser,
// pagina per pagina, col PDF). Si controlla ciò che jsdom sa vedere:
//  - il pulsante Word apre la finestra del PDF in modalità Word, e il PDF resta PDF;
//  - il documento di stampa dice di che tipo è ogni blocco (data-blocco), che è ciò su cui
//    l'export decide cosa è testo e cosa è disegno;
//  - il pacchetto .docx è un file Word valido: le parti che servono, XML ben formato, un
//    paragrafo in fondo a ogni cella, e niente più .doc finto.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(80);

  console.log('--- Il pulsante ---');
  app.E(`openExportModal('project', ${JSON.stringify(pid)})`);
  clic(app, $(app, 'btnOptExportCompleteWord'));
  await attesa(40);
  t('Word apre la finestra del PDF, in modalità Word', $(app, 'modalEsportaPdf').classList.contains('open')
    && $(app, 'lblEsportaPdfTitolo').textContent === 'Esporta Word' && /Genera Word/.test($(app, 'btnEsportaPdfGenera').textContent));
  t('con la scelta delle prove come il PDF', app.E("esportaPdfContext.formato") === 'word' && $(app, 'esportaPdfListaProve').querySelectorAll('input[type="checkbox"]').length > 1);
  app.E('chiudiEsportazionePdfModal()');
  app.E(`openExportModal('project', ${JSON.stringify(pid)})`);
  clic(app, $(app, 'btnOptExportCompletePdf'));
  await attesa(40);
  t('e il PDF resta PDF', $(app, 'lblEsportaPdfTitolo').textContent === 'Esporta PDF' && /Genera PDF/.test($(app, 'btnEsportaPdfGenera').textContent));
  app.E('chiudiEsportazionePdfModal()');

  console.log('--- Il documento di stampa ---');
  // (Il report intero non si costruisce in jsdom: misura i blocchi in una cornice che qui non
  // impagina. Si guarda il punto in cui ogni blocco viene avvolto per la stampa.)
  const voce = app.E('buildContenutoVoceStampa')({ id: 'x', type: 'divisore', spacerHeightMm: 5 }, {}, 4, 4);
  const pila = app.E('buildContenutoVoceStampa')({ id: 'y', stack: [{ id: 'z', type: 'divisore', spacerHeightMm: 5 }] }, {}, 4, 4);
  t('ogni blocco stampato dice il suo tipo, anche dentro una pila', /^<div data-blocco="divisore"/.test(voce.html) && /^<div data-blocco="divisore"/.test(pila.html));
  t('anche le tabelle lunghe spezzate su più pagine', /data-blocco="\$\{bloccoFlowable\.type\}"/.test(fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8')));

  console.log('--- Il pacchetto .docx ---');
  const xml = '<w:p><w:r><w:t xml:space="preserve">Prova N° 1 &amp; prova</w:t></w:r></w:p>'
    + `<w:tbl>${app.E('tblPrWord')({ w: 1000 })}<w:tblGrid><w:gridCol w:w="1000"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="1000" w:type="dxa"/></w:tcPr>${app.E('chiudiCellaWord')('')}</w:tc></w:tr></w:tbl>`;
  const blob = app.E('pacchettoDocxWord')(xml, '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>', [{ nome: 'immagine1.png', bytes: new Uint8Array([137, 80, 78, 71]), rid: 'rIdImg1' }]);
  const voci = await app.E('readZipStoreOnly')(blob);
  const nomi = voci.map(v => v.name);
  t('ha le parti di un documento Word', ['[Content_Types].xml', '_rels/.rels', 'word/document.xml', 'word/styles.xml', 'word/settings.xml', 'word/_rels/document.xml.rels', 'word/media/immagine1.png'].every(n => nomi.includes(n)));
  const testo = (n) => new TextDecoder().decode(voci.find(v => v.name === n).bytes);
  const benFormati = nomi.filter(n => /\.(xml|rels)$/.test(n)).every(n => !new app.w.DOMParser().parseFromString(testo(n), 'application/xml').querySelector('parsererror'));
  t('XML ben formato in ogni parte', benFormati);
  t('l\'immagine è collegata al documento', /Id="rIdImg1"[^>]*Target="media\/immagine1\.png"/.test(testo('word/_rels/document.xml.rels')));
  t('compatibilità Word 2010: niente spazi stretti nel testo giustificato', /compatibilityMode[^>]*w:val="14"/.test(testo('word/settings.xml')));

  console.log('--- Indice e numeri di pagina: le funzioni vere di Word ---');
  {
    // La pagina indice com'è nel documento di stampa, con due voci (un titolo e un sottotitolo).
    const proj = app.E(`state.projects[${JSON.stringify(pid)}]`);
    const indiceHtml = app.E('buildIndiceReportCompletoHtml')(proj, [{ etichetta: 'Introduzione', livello: 1, id: 'a', pagina: 2 }, { etichetta: 'Dati della prova', livello: 2, id: 'b', pagina: 3 }], null);
    const box = app.d.createElement('div'); box.innerHTML = app.E('numeraPagineDocumento')(indiceHtml); app.d.body.appendChild(box);
    const foglio = box.querySelector('.dpsh-sheet');
    t('la pagina indice dice al Word che è un indice: voci, livelli, testo e pagina segnati', foglio.hasAttribute('data-sommario')
      && foglio.querySelectorAll('a[data-voce-indice][data-livello]').length === 2 && foglio.querySelectorAll('[data-testo-voce]').length === 2 && foglio.querySelectorAll('[data-pagina-voce]').length === 2);
    const ctx = app.E('nuovoContestoWord')(app.d, {});
    // jsdom non impagina: ogni elemento finge una misura, se no sembrerebbe nascosto.
    const misura = app.w.Element.prototype.getBoundingClientRect;
    app.w.Element.prototype.getBoundingClientRect = () => ({ left: 0, top: 0, right: 10, bottom: 10, width: 10, height: 10, x: 0, y: 0 });
    const som = await app.E('sommarioWord')(ctx, foglio, { left: 0, top: 0, width: 600 });
    app.w.Element.prototype.getBoundingClientRect = misura;
    t('diventa un campo SOMMARIO di Word (TOC), che «Aggiorna sommario» rifà', /<w:instrText xml:space="preserve"> TOC \\o "1-3" \\h \\z \\u \\l "1-3" <\/w:instrText>/.test(som)
      && (som.match(/fldCharType="begin"/g) || []).length === (som.match(/fldCharType="end"/g) || []).length);
    t('ogni voce è cliccabile verso il segnalibro del suo titolo', /<w:hyperlink w:anchor="_TocDpsh0"[^>]*>.*Introduzione/.test(som) && /<w:hyperlink w:anchor="_TocDpsh1"/.test(som));
    t('col numero di pagina in un campo PAGEREF (già calcolato: 2 e 3)', /PAGEREF _TocDpsh0 \\h [\s\S]*?separate[\s\S]*?<w:t[^>]*>2<\/w:t>/.test(som) && /PAGEREF _TocDpsh1 \\h /.test(som));
    t('l\'aspetto sta negli stili «Sommario 1/2» di Word', /w:styleId="TOC1"><w:name w:val="toc 1"\/>/.test(ctx.stiliSommario) && /w:styleId="TOC2"/.test(ctx.stiliSommario) && /<w:pStyle w:val="TOC2"\/>/.test(som));
    const piede = app.E('piedeWord')(ctx, foglio.querySelector('[data-numero-pagina]'));
    t('il numero di pagina è il piè di pagina di Word: «Pagina {PAGE} di {NUMPAGES}»', /Pagina [\s\S]*> PAGE <[\s\S]* di [\s\S]*> NUMPAGES </.test(piede.replace(/<w:t xml:space="preserve">/g, '>')) && /<w:framePr /.test(piede));
    box.remove();
    const conPiede = await app.E('readZipStoreOnly')(app.E('pacchettoDocxWord')(xml, '<w:sectPr><w:footerReference w:type="default" r:id="rIdPiede"/><w:pgSz w:w="11906" w:h="16838"/></w:sectPr>', [], { piede, stiliSommario: ctx.stiliSommario }));
    const tst = (n) => new TextDecoder().decode(conPiede.find(v => v.name === n).bytes);
    t('nel pacchetto: il piè di pagina, collegato e dichiarato, e gli stili del sommario', conPiede.some(v => v.name === 'word/footer1.xml')
      && /Id="rIdPiede"[^>]*Target="footer1\.xml"/.test(tst('word/_rels/document.xml.rels')) && /footer1\.xml" ContentType="[^"]*footer\+xml"/.test(tst('[Content_Types].xml')) && /styleId="TOC1"/.test(tst('word/styles.xml'))
      && conPiede.filter(v => /\.(xml|rels)$/.test(v.name)).every(v => !new app.w.DOMParser().parseFromString(new TextDecoder().decode(v.bytes), 'application/xml').querySelector('parsererror')));
    const sorg = fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071i_export-word.js'), 'utf8');
    t('i titoli dell\'indice hanno il livello di struttura e il segnalibro; le prove senza titoli un campo TC', /titoloIndice\.getAttribute\('data-titolo-indice'\)[\s\S]{0,200}outlineLvl|outlineLvl[\s\S]{0,200}data-titolo-indice/.test(sorg)
      && /segnalibroWord\(ctx, titoloIndice\.getAttribute\('data-voce-indice'\)\)/.test(sorg) && / TC "\$\{/.test(sorg));
  }

  console.log('--- Il vecchio .doc ---');
  const sorgente = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');
  t('niente più HTML salvato come .doc', !/application\/msword/.test(sorgente) && !/function costruisciDocumentoWord/.test(sorgente));
  t('anche «Parametri avanzati › Word» passa dal .docx', /btnExportProcessingWord[\s\S]{0,1500}documentoStampaInDocx/.test(sorgente));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})();
