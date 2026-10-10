// L'INTESTAZIONE CON TESTO FORMATTATO. Prima l'intestazione aveva un'immagine e una riga di testo
// semplice, sempre a 10 px: niente grassetto, colori, più righe. Ora «Testo formattato…» apre lo
// stesso editor dei blocchi Testo; il testo va in page.header.html, e page.header.text ne tiene la
// versione semplice (la leggono le versioni dell'app che non conoscono il testo formattato).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const spunta = (app, el, v) => { el.checked = v; el.dispatchEvent(new app.w.Event('change', { bubbles: true })); };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E(`(() => {
    const pagina = n => ({ id: 'p' + n, cols: 4, header: { imageDataUrl: null, text: 'vecchia riga' }, footer: { text: '' },
      rows: [{ id: 'r' + n, blocks: [{ id: 'b' + n, type: 'dati-prova', colSpan: 4 }] }] });
    state.reportTemplates.tplRicca = { id: 'tplRicca', name: 'Ricca', builtIn: false, headerEnabled: true,
      pages: [pagina(1), pagina(2)], createdAt: 1, updatedAt: 1 };
  })()`);
  app.E(`apriTemplateEditor('tplRicca')`);
  await attesa(30);

  t('c\'è il tasto «Testo formattato…» nei comandi dell\'intestazione', !!$(app, 'btnFormattaIntestazione') && $(app, 'pageHeaderControls').contains($(app, 'btnFormattaIntestazione')));
  clic(app, $(app, 'btnFormattaIntestazione'));
  await attesa(80);
  t('apre l\'editor di testo, col titolo giusto', $(app, 'modalTplTextEditor').classList.contains('open') && $(app, 'lblTplTextEditorTitle').textContent === 'Testo dell\'intestazione');
  t('con dentro la riga semplice che c\'era, centrata', /vecchia riga/.test(app.E('editorTesto.getHTML()')) && /text-align: center/.test(app.E('editorTesto.getHTML()')));

  app.E(`editorTesto.commands.setContent('<p style="text-align: center"><strong>Studio Geologico Rossi</strong></p><p style="text-align: center">Via Roma 1 · Nardò</p>')`);
  clic(app, $(app, 'btnTplTextEditorSalva'));
  await attesa(30);
  const hd = () => app.E('templateEditorState.pages[0].header');
  t('salvato nella pagina come testo formattato', /<strong>Studio Geologico Rossi<\/strong>/.test(hd().html || ''));
  t('con la versione semplice per le versioni vecchie', hd().text === 'Studio Geologico Rossi · Via Roma 1 · Nardò');
  t('la riga semplice diventa da leggere (scrivendoci si perderebbe la formattazione)', $(app, 'inputHeaderText').readOnly);
  t('senza «Usa per tutte le pagine» l\'altra pagina non cambia', !app.E('templateEditorState.pages[1].header.html'));

  const html = app.E(`htmlIntestazioneNelMargine(templateEditorState.pages[0].header, templateEditorState.margins)`);
  t('sul foglio: il testo formattato, non la riga a 10 px', /tpl-intestazione-testo/.test(html) && /<strong>Studio Geologico Rossi<\/strong>/.test(html) && !/font-size:10px/.test(html));
  t('l\'altezza tiene conto delle righe (due righe: 9 mm)', app.E(`altezzaIntestazioneMm(templateEditorState.pages[0].header, templateEditorState.margins)`) === 9);
  t('nel foglio le righe dell\'intestazione stanno strette', /\.tpl-intestazione-testo p \{ margin: 0; text-indent: 0; \}/.test(app.E('getReportPrintStyleBlock()')));

  spunta(app, $(app, 'chkHeaderTuttePagine'), true);
  t('con «Usa per tutte le pagine» va su tutte', app.E('templateEditorState.pages.every(p => /Rossi/.test(p.header.html || ""))'));

  // Svuotato, torna senza testo formattato e la riga semplice si scrive di nuovo.
  clic(app, $(app, 'btnFormattaIntestazione'));
  await attesa(80);
  app.E(`editorTesto.commands.setContent('')`);
  clic(app, $(app, 'btnTplTextEditorSalva'));
  await attesa(30);
  t('svuotato: niente testo formattato, la riga semplice torna scrivibile', !('html' in hd()) && hd().text === '' && !$(app, 'inputHeaderText').readOnly);

  t('un\'intestazione senza testo formattato resta quella di prima', /font-size:10px[^>]*>vecchia riga</.test(app.E(`htmlIntestazioneNelMargine({ text: 'vecchia riga' }, {})`)));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
