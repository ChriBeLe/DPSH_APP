// IMPORTA DA UN WORD. Dal .docx di una relazione dell'ufficio al template aperto: margini e
// distanza dell'intestazione, l'immagine e il testo dell'intestazione, il piè di pagina, lo stile
// del testo. Una fascia più larga del testo (la carta intestata da bordo a bordo) diventa
// un'immagine «a tutta larghezza»: nel PDF parte dal bordo del foglio, nel Word è ancorata alla
// pagina, coi byte originali.
// Il .docx è costruito qui, compresso come lo comprime Word. (jsdom non ha DecompressionStream:
// la decompressione la fa zlib di Node, al posto di quella del browser.)
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

/** Uno ZIP con le voci compresse (metodo 8), come un .docx salvato da Word. */
function zipCompresso(voci) {
  const locali = [], centrali = [];
  let offset = 0;
  for (const [nome, contenuto] of Object.entries(voci)) {
    const dati = Buffer.isBuffer(contenuto) ? contenuto : Buffer.from(contenuto, 'utf8');
    const compresso = zlib.deflateRawSync(dati);
    const n = Buffer.from(nome, 'utf8');
    const l = Buffer.alloc(30); l.writeUInt32LE(0x04034b50, 0); l.writeUInt16LE(20, 4); l.writeUInt16LE(8, 8);
    l.writeUInt32LE(zlib.crc32 ? zlib.crc32(dati) : 0, 14); l.writeUInt32LE(compresso.length, 18); l.writeUInt32LE(dati.length, 22); l.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(8, 10);
    c.writeUInt32LE(zlib.crc32 ? zlib.crc32(dati) : 0, 16); c.writeUInt32LE(compresso.length, 20); c.writeUInt32LE(dati.length, 24); c.writeUInt16LE(n.length, 28); c.writeUInt32LE(offset, 42);
    locali.push(l, n, compresso); centrali.push(c, n);
    offset += 30 + n.length + compresso.length;
  }
  const cd = Buffer.concat(centrali);
  const fine = Buffer.alloc(22); fine.writeUInt32LE(0x06054b50, 0); fine.writeUInt16LE(Object.keys(voci).length, 8); fine.writeUInt16LE(Object.keys(voci).length, 10);
  fine.writeUInt32LE(cd.length, 12); fine.writeUInt32LE(offset, 16);
  return Buffer.concat([...locali, cd, fine]);
}

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"';
const REL = 'xmlns="http://schemas.openxmlformats.org/package/2006/relationships"';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAIAAAABCAYAAAD0In+KAAAAEUlEQVR42mP8z8DwnwEIGAEAK/8D/0w0r0QAAAAASUVORK5CYII=', 'base64');
const docx = zipCompresso({
  'word/document.xml': `<?xml version="1.0"?><w:document ${W}><w:body><w:p><w:r><w:t>Corpo</w:t></w:r></w:p>`
    + `<w:sectPr><w:headerReference w:type="default" r:id="rIdH"/><w:footerReference w:type="default" r:id="rIdF"/><w:pgSz w:w="11906" w:h="16838"/>`
    + `<w:pgMar w:top="1418" w:right="1133" w:bottom="709" w:left="1620" w:header="567" w:footer="0" w:gutter="0"/></w:sectPr></w:body></w:document>`,
  'word/_rels/document.xml.rels': `<?xml version="1.0"?><Relationships ${REL}><Relationship Id="rIdH" Type="h" Target="header1.xml"/><Relationship Id="rIdF" Type="f" Target="footer1.xml"/></Relationships>`,
  'word/header1.xml': `<?xml version="1.0"?><w:hdr ${W}><w:p><w:r><w:drawing><wp:anchor><wp:extent cx="7363460" cy="930275"/><a:graphic><a:graphicData><a:blip r:embed="rId1"/></a:graphicData></a:graphic></wp:anchor></w:drawing></w:r></w:p>`
    + `<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:color w:val="1E40AF"/></w:rPr><w:t>Studio Rossi</w:t></w:r><w:r><w:t xml:space="preserve"> &amp; associati</w:t></w:r></w:p></w:hdr>`,
  'word/_rels/header1.xml.rels': `<?xml version="1.0"?><Relationships ${REL}><Relationship Id="rId1" Type="i" Target="media/image1.png"/></Relationships>`,
  'word/media/image1.png': PNG,
  'word/footer1.xml': `<?xml version="1.0"?><w:ftr ${W}><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Eurisko S.R.L.</w:t></w:r></w:p></w:tc>`
    + `<w:tc><w:p><w:r><w:t>Via Parini, 30</w:t></w:r></w:p><w:p><w:r><w:t>73100 Lecce</w:t></w:r></w:p></w:tc></w:tr></w:tbl><w:p/></w:ftr>`,
  'word/styles.xml': `<?xml version="1.0"?><w:styles ${W}><w:docDefaults><w:rPrDefault><w:rPr><w:sz w:val="22"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="160" w:line="259" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults>`
    + `<w:style w:type="paragraph" w:styleId="Normale"><w:name w:val="Normal"/><w:pPr><w:spacing w:line="360" w:lineRule="auto"/><w:jc w:val="both"/></w:pPr><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/></w:rPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="Titolo1"><w:name w:val="heading 1"/><w:rPr><w:sz w:val="36"/></w:rPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="Titolo2"><w:name w:val="heading 2"/><w:rPr><w:sz w:val="24"/></w:rPr></w:style>`
    + `<w:style w:type="paragraph" w:styleId="Titolo3"><w:name w:val="heading 3"/></w:style></w:styles>`
});

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.w.__inflate = (u8) => new Uint8Array(zlib.inflateRawSync(Buffer.from(u8)));
  app.E('decomprimiDeflate = async (b) => window.__inflate(b)');

  const l = await app.E('letturaDaWord')(new app.w.Uint8Array(docx));
  t('i margini del Word, in mm: 2,50 · 1,25 · 2,86 · 2,00; intestazione a 1,00 cm',
    JSON.stringify(l.margini) === JSON.stringify({ top: 25, bottom: 12.5, left: 28.6, right: 20, header: 10 }));
  t('l\'immagine dell\'intestazione, coi byte originali e la sua misura (20,45 × 2,58 cm)',
    /^data:image\/png;base64,/.test(l.intestazione.immagine) && l.intestazione.larghezzaMm === 204.5 && l.intestazione.altezzaMm === 25.8);
  t('il testo dell\'intestazione, con grassetto, colore e centratura',
    l.intestazione.html === '<p style="text-align: center"><strong><span style="color: #1E40AF">Studio Rossi</span></strong> &amp; associati</p>');
  t('il piè di pagina: le celle della tabella diventano una riga', l.piede.testo === 'Eurisko S.R.L. · Via Parini, 30, 73100 Lecce' && l.piede.tabella);
  t('lo stile: Calibri 11, interlinea 1,5, 8 pt dopo, giustificato, titoli 18 / 12 / 11',
    JSON.stringify(l.stile) === JSON.stringify({ font: 'Calibri', fontNelWord: 'Calibri', corpoPt: 11, interlinea: 1.5, spazioParagrafoPt: 8, allineamento: 'justify', h1Pt: 18, h2Pt: 12, h3Pt: 11 }));
  const righe = app.E('riepilogoLetturaWord')(l);
  t('il riepilogo prima di applicare dice tutto in centimetri', righe.length === 4 && /superiore 2,50 cm, inferiore 1,25 cm, sinistro 2,86 cm, destro 2,00 cm; intestazione a 1,00 cm/.test(righe[0])
    && /su più colonne/.test(righe[2]));

  // Applicato al template aperto.
  app.E(`state.reportTemplates.tplW = { id: 'tplW', name: 'W', builtIn: false, pages: [
    { id: 'p1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' }, rows: [{ id: 'r1', blocks: [{ id: 'b1', type: 'dati-prova', colSpan: 4 }] }] },
    { id: 'p2', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' }, rows: [{ id: 'r2', blocks: [{ id: 'b2', type: 'dati-prova', colSpan: 4 }] }] }], createdAt: 1, updatedAt: 1 }`);
  app.E(`apriTemplateEditor('tplW')`);
  await attesa(30);
  app.E('applicaLetturaWord')(l);
  const S = 'templateEditorState';
  t('margini e distanza dell\'intestazione nel template', app.E(`JSON.stringify(${S}.margins)`) === JSON.stringify({ top: 25, bottom: 12.5, left: 28.6, right: 20, header: 10 }));
  t('intestazione e piè di pagina accesi, uguali su tutte le pagine', app.E(`${S}.headerEnabled && ${S}.headerTutte && ${S}.footerEnabled && ${S}.pages.every(p => p.header.html && p.footer.text === 'Eurisko S.R.L. · Via Parini, 30, 73100 Lecce')`));
  t('la fascia più larga del testo diventa «a tutta larghezza», alta quanto a tutta pagina (26 mm + la riga)',
    app.E(`${S}.pages[0].header.tuttaPagina === true && ${S}.pages[0].header.heightMm === 26 + 5`));
  t('lo stile del testo del template', app.E(`${S}.stileTesto.corpoPt === 11 && ${S}.stileTesto.spazioParagrafoPt === 8 && ${S}.stileTesto.h1Pt === 18 && ${S}.stileTesto.interlinea === 1.5`));
  t('nei comandi dell\'intestazione la spunta «Immagine a tutta larghezza» è accesa', app.d.getElementById('chkHeaderTuttaPagina').checked);

  const html = app.E(`htmlIntestazioneNelMargine(${S}.pages[0].header, ${S}.margins)`);
  t('sul foglio la fascia va da bordo a bordo e parte dal bordo superiore', /top:0; left:0; right:0; padding:0 0 2mm/.test(html) && /<img data-tutta-pagina="1"[^>]*width:100%/.test(html));
  t('il testo dell\'intestazione resta dentro i margini', /margin-left:28\.6mm; margin-right:20mm/.test(html));
  t('la fascia non aggiunge la distanza dal bordo sopra di sé', app.E(`margineConIntestazione(${S}.margins, ${S}.pages[0].header, true).top`) === 33);
  const normale = app.E(`htmlIntestazioneNelMargine({ imageDataUrl: 'data:image/png;base64,AAAA', text: 'x' }, { top: 25, left: 20, right: 20, header: 10 })`);
  t('un\'immagine normale resta dentro i margini, alla sua distanza', /left:20mm; right:20mm; padding:10mm 0 2mm/.test(normale) && !/data-tutta-pagina/.test(normale));

  // Nel Word: ancorata alla pagina, coi byte originali.
  const ctx = { media: [], idDisegno: 3 };
  const img = app.d.createElement('img');
  img.setAttribute('src', l.intestazione.immagine);
  img.getBoundingClientRect = () => ({ left: 0, top: 0, width: 793.7, height: 100 });
  const anc = app.E('immagineAncorataWord')(ctx, img, { left: 0, top: 0 });
  t('nel Word la fascia è un\'immagine ancorata alla pagina, dietro al testo', /<wp:anchor [^>]*behindDoc="1"/.test(anc) && /<wp:positionH relativeFrom="page">/.test(anc) && /<wp:positionV relativeFrom="page">/.test(anc));
  t('coi byte originali del Word (non ridisegnata)', ctx.media.length === 1 && Buffer.from(ctx.media[0].bytes).equals(PNG) && ctx.media[0].nome === 'immagine3.png');

  // Un file che non è un Word.
  let errore = '';
  try { await app.E('letturaDaWord')(new app.w.Uint8Array([1, 2, 3, 4])); } catch (e) { errore = e.message; }
  t('un file che non è un Word lo dice', /Non è un file Word/.test(errore));

  t('c\'è il tasto «Importa da un Word…» vicino ai margini', /Importa da un Word/.test(app.d.getElementById('btnImportaDaWord').textContent));
  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
