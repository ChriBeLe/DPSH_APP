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

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
