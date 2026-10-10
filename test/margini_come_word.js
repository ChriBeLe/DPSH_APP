// I MARGINI DEL TEMPLATE COME IN WORD. Nella barra laterale dell'editor i margini si leggono e si
// scrivono in centimetri con la virgola (prima «14mm», con cursori a passi di 1 mm), e ci sono le
// preimpostazioni del menu Margini di Word: Normale, Stretto, Moderato, Largo. Se l'intestazione è
// più alta del margine superiore, il foglio usa di più: prima lo faceva in silenzio, ora lo dice.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const scrivi = (app, el, v) => { el.value = v; el.dispatchEvent(new app.w.Event('change', { bubbles: true })); };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  app.E(`state.reportTemplates.tplMargini = { id: 'tplMargini', name: 'Margini', builtIn: false, headerEnabled: false,
    pages: [{ id: 'p1', cols: 4, header: { imageDataUrl: null, text: '' }, footer: { text: '' }, rows: [{ id: 'r1', blocks: [{ id: 'b1', type: 'dati-prova', colSpan: 4 }] }] }],
    createdAt: 1, updatedAt: 1 }`);
  app.E(`apriTemplateEditor('tplMargini')`);
  await attesa(30);
  const margini = () => app.E('JSON.stringify(Object.assign(marginiPaginaDiDefault(), templateEditorState.margins))');

  t('i margini si leggono in centimetri con la virgola', $(app, 'lblMargineTop').value === '1,40' && $(app, 'lblMargineLeft').value === '1,20');
  t('con i nomi di Word', /Superiore/.test($(app, 'modalTemplateEditor').textContent) && /Inferiore/.test($(app, 'modalTemplateEditor').textContent));

  scrivi(app, $(app, 'lblMargineTop'), '2,5');
  t('scrivere «2,5» mette il margine superiore a 25 mm', app.E('templateEditorState.margins.top') === 25);
  t('e il campo lo riscrive come Word: «2,50»', $(app, 'lblMargineTop').value === '2,50');
  t('il cursore segue', $(app, 'rangeMargineTop').value === '25');
  scrivi(app, $(app, 'lblMargineLeft'), '1.91');
  t('anche col punto, e coi centesimi: 19,1 mm', app.E('templateEditorState.margins.left') === 19.1);
  scrivi(app, $(app, 'lblMargineRight'), 'abc');
  t('un valore che non è un numero non cambia niente', app.E('templateEditorState.margins.right') === 12 && $(app, 'lblMargineRight').value === '1,20');
  // (Annulla dell'editor copre le pagine, non i margini: era così anche prima.)

  const preset = (n) => app.d.querySelector(`[data-margini-preset="${n}"]`);
  t('ci sono le preimpostazioni di Word', ['normale', 'stretto', 'moderato', 'largo'].every(n => !!preset(n)));
  clic(app, preset('moderato'));
  t('«Moderato»: 2,54 sopra e sotto, 1,91 ai lati', margini() === JSON.stringify({ top: 25.4, bottom: 25.4, left: 19.1, right: 19.1 }));
  t('e si vede quale è attiva', preset('moderato').classList.contains('attivo') && !preset('normale').classList.contains('attivo'));
  clic(app, preset('normale'));
  t('«Normale»: 2,5 · 2 · 2 · 2', margini() === JSON.stringify({ top: 25, bottom: 20, left: 20, right: 20 }) && $(app, 'lblMargineBottom').value === '2,00');
  clic(app, preset('largo'));
  t('«Largo»: 5,08 ai lati (il cursore arriva a 6 cm)', $(app, 'lblMargineLeft').value === '5,08' && $(app, 'rangeMargineLeft').value === '50.8');
  clic(app, $(app, 'btnResetMarginiTemplate'));
  t('il tasto di ripristino torna ai margini dell\'app', margini() === JSON.stringify({ top: 14, bottom: 14, left: 12, right: 12 }));

  // L'intestazione alta: il foglio usa più del margine superiore, e la barra lo dice.
  t('senza intestazione nessuna nota', $(app, 'notaMargineIntestazione').hidden);
  app.E(`templateEditorState.headerEnabled = true; templateEditorState.pages[0].header.heightMm = 30; renderTemplateEditorPageControls()`);
  t('intestazione di 3 cm con margine di 1,4: la nota dice quanto usa davvero (3,50 cm)', !$(app, 'notaMargineIntestazione').hidden && /3,50 cm/.test($(app, 'notaMargineIntestazione').textContent));
  scrivi(app, $(app, 'lblMargineTop'), '4');
  t('alzando il margine oltre l\'intestazione la nota sparisce', $(app, 'notaMargineIntestazione').hidden);


  // «Distanza dal bordo» dell'intestazione, come «Intestazione: da bordo» di Word.
  t('la distanza dal bordo di base è quella di prima: 0,30 cm', $(app, 'inputDistanzaIntestazione').value === '0,30');
  scrivi(app, $(app, 'lblMargineTop'), '1,4');
  clic(app, $(app, 'btnDistanzaIntestazioneWord'));
  t('«Come in Word»: 1,25 cm', app.E('templateEditorState.margins.header') === 12.5 && $(app, 'inputDistanzaIntestazione').value === '1,25');
  t('l\'intestazione comincia lì', /padding:12\.5mm 0 2mm/.test(app.E(`htmlIntestazioneNelMargine({ text: 'Studio' }, templateEditorState.margins)`)));
  t('e la fascia ne tiene conto: 3 cm d\'intestazione + 1,25 + 0,2 = 4,45 cm', app.E(`margineConIntestazione(templateEditorState.margins, { heightMm: 30 }, true).top`) === 44.5
    && /4,45 cm/.test($(app, 'notaMargineIntestazione').textContent));
  scrivi(app, $(app, 'inputDistanzaIntestazione'), '0,8');
  t('si scrive anche a mano', app.E('templateEditorState.margins.header') === 8);
  clic(app, app.d.querySelector('[data-margini-preset="stretto"]'));
  t('una preimpostazione dei margini non la cambia', app.E('templateEditorState.margins.header') === 8 && app.E('templateEditorState.margins.top') === 12.7);
  t('un template senza la distanza resta com\'era (3 mm)', /padding:3mm 0 2mm/.test(app.E(`htmlIntestazioneNelMargine({ text: 'Studio' }, { top: 14, bottom: 14, left: 12, right: 12 })`)));
  // Il foglio del report porta i margini del template, tutti e quattro: prima solo quello superiore,
  // e nel report di progetto gli altri erano quelli predefiniti (1,4 / 1,2 cm) qualunque fosse il
  // template — impaginato su una larghezza, stampato su un'altra.
  {
    const foglio = app.E(`buildPaginaRigheHtml(templateEditorState.pages[0], templateEditorState.ctx || computeEditorPreviewCtx(), 1, 1, true,
      { top: 25, bottom: 20, left: 20, right: 20 }, '1', false, false, false)`);
    t('il foglio del report ha i margini del template (2,5 · 2 · 2 · 2)', /class="dpsh-sheet"[^>]*padding:25mm 20mm 20mm 20mm/.test(foglio));
    const unificato = await app.E(`costruisciPagineTemplateUnificato(templateEditorState.pages[0], templateEditorState.ctx || computeEditorPreviewCtx(),
      { top: 25, bottom: 20, left: 20, right: 20 }, '1', true, false, false)`);
    t('anche nel motore dell\'export', unificato.pagine.length > 0 && unificato.pagine.every(f => /padding:25mm 20mm 20mm 20mm; --margine-sotto:20mm/.test(f)));
  }
  app.E('salvaTemplateEditor()');
  await attesa(30);
  t('si salva col template', app.E('state.reportTemplates.tplMargini.margins.header') === 8 && app.E('state.reportTemplates.tplMargini.margins.top') === 12.7);
  if (app.dialogo()) clic(app, app.dialogo().ok);
  app.E(`apriTemplateEditor('tplMargini')`);
  await attesa(30);
  t('e riaprendo torna: 0,80 cm, Stretto acceso', $(app, 'inputDistanzaIntestazione').value === '0,80' && app.d.querySelector('[data-margini-preset="stretto"]').classList.contains('attivo'));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
