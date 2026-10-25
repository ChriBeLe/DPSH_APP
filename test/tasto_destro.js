// IL TASTO DESTRO SUL PC (071v e 071b). Le azioni di un oggetto nel menu del tasto destro, sull'oggetto:
//  - progetto: tutte le azioni direttamente (prima «Note, stato, copia, elimina…» apriva un'altra finestra);
//  - prova: anche foto, GPS, falda, strati, duplica ed elimina;
//  - strati, blocchi del template, intestazione e piè di pagina, pagine del template, template della
//    libreria: prima il tasto destro non dava niente (o apriva il pannello intero del blocco).
// Ogni voce passa dal comando che c'era già: si controlla che arrivi lì.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const destro = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true, clientX: 100, clientY: 100 }));
const voci = (app) => Array.from(app.d.querySelectorAll('#menuRiga [data-voce]')).map(b => b.textContent.replace(/\s+/g, ' ').trim());
const scegli = (app, testo) => clic(app, Array.from(app.d.querySelectorAll('#menuRiga [data-voce]')).find(b => b.textContent.includes(testo)));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  app.w.matchMedia = q => { const m = /min-width:\s*(\d+)px/.exec(q); return { matches: !!m && 1280 >= +m[1], addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }; };
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  app.E(`switchView('project')`);
  await attesa(30);

  // Progetto: tutte le azioni nel menu.
  app.E(`apriMenuProgetto(new MouseEvent('contextmenu'), ${JSON.stringify(pid)})`);
  const vp = voci(app);
  t('progetto: le azioni sono nel menu, senza un\'altra finestra', ['Note del progetto', 'Consegna', 'Confronta le prove', 'Porta su un altro dispositivo', 'Duplica il progetto', 'Cronologia', 'Elimina il progetto'].every(x => vp.some(v => v.includes(x)))
    && !vp.some(v => /Note, stato, copia/.test(v)));
  scegli(app, 'Note del progetto');
  await attesa(60);
  t('«Note del progetto» apre le note, senza passare dalla finestra del ⋯', $(app, 'modalProjectNotes').classList.contains('open') && !$(app, 'modalProjectActions').classList.contains('open'));
  app.E('typeof chiudiNoteProgetto === "function" ? chiudiNoteProgetto() : null');
  await attesa(30);

  // Prova: foto, GPS, falda, strati, duplica, elimina.
  const sid = app.E(`Object.values(state.projects[${JSON.stringify(pid)}].surveys).find(s => s.header.provaNr === '2').id`);
  app.E(`apriMenuProva(new MouseEvent('contextmenu'), ${JSON.stringify(sid)})`);
  const vs = voci(app);
  t('prova: foto, GPS, falda, strati, duplica ed elimina', ['Foto', 'Posizione GPS', 'Falda', 'Strati e parametri', 'Duplica come interpretazione', 'Elimina la prova'].every(x => vs.some(v => v.includes(x))));
  scegli(app, 'Falda');
  await attesa(300); // apriProvaPerCorreggere apre la finestra dopo 250 ms
  t('«Falda» apre quella prova e la sua falda', app.E('state.currentSurveyId') === sid && $(app, 'modalQuickFalda').classList.contains('open'));
  app.E('closeQuickFaldaModal()');

  // Strati: il tasto destro sulla riga.
  app.E('openStratiModal()');
  await attesa(30);
  const riga = app.d.querySelector('#stratiListContainer [data-strato-row-idx="1"] .strato-row-header');
  destro(app, riga);
  const vstr = voci(app);
  t('strato: tasto destro sulla riga, con parametri, rinomina, sposta, duplica, archivio, elimina',
    ['Parametri avanzati', 'Assegna gli intervalli', 'Rinomina', 'Sposta su', 'Sposta giù', 'Duplica', 'archivio', 'Elimina'].every(x => vstr.some(v => v.includes(x))));
  const nomi = () => app.E('state.strati.map(s => s.name).join("|")');
  const prima = nomi();
  scegli(app, 'Sposta su');
  await attesa(20);
  t('«Sposta su» sposta lo strato (passa dal comando del ⋮)', nomi() === prima.split('|').slice(0, 2).reverse().concat(prima.split('|').slice(2)).join('|'));
  destro(app, app.d.querySelector('#stratiListContainer [data-strato-row-idx="0"] .strato-row-header'));
  scegli(app, 'Parametri avanzati');
  await attesa(30);
  t('«Parametri avanzati…» apre la procedura guidata su quello strato', $(app, 'modalWizard').classList.contains('open'));
  app.E('chiudiWizardParametri(true); closeStratiModal()');

  // Editor del template: blocco, intestazione, pagine.
  app.E(`state.reportTemplates.tplD = { id: 'tplD', name: 'D', builtIn: false, headerEnabled: true, pages: [
    { id: 'p1', cols: 4, header: { imageDataUrl: null, text: 'Studio' }, footer: { text: '' }, rows: [{ id: 'r1', blocks: [{ id: 'b1', type: 'testo', colSpan: 4, richHtml: '<p>Ciao</p>' }] }] }], createdAt: 1, updatedAt: 1 }`);
  app.E(`apriTemplateEditor('tplD')`);
  await attesa(60);
  const blocco = app.d.querySelector('.tpl-editor-block-body[data-block-id="b1"]') || app.d.querySelector('[data-block-id="b1"]');
  destro(app, blocco);
  const vb = voci(app);
  t('blocco: tasto destro dà un menu con modifica, impostazioni, sposta, elimina (non il pannello intero)',
    ['Modifica il testo', 'Impostazioni del blocco', 'Sposta su un\'altra pagina', 'Elimina il blocco'].every(x => vb.some(v => v.includes(x))) && !app.d.getElementById('templateEditorBlockMenu'));
  // Esc col menu aperto chiude il menu, non l'editor sotto.
  app.d.dispatchEvent(new app.w.KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await attesa(30);
  t('Esc chiude solo il menu, l\'editor del template resta aperto', !$(app, 'menuRiga').classList.contains('open') && $(app, 'modalTemplateEditor').classList.contains('open'));
  destro(app, blocco);
  scegli(app, 'Modifica il testo');
  await attesa(60);
  t('«Modifica il testo…» apre l\'editor del testo del blocco', $(app, 'modalTplTextEditor').classList.contains('open'));
  app.E('chiudiTplTextEditor()');
  // Doppio clic su un testo, sul PC: lo apre da scrivere (come in Word), non il pannello.
  const su = (tipo) => blocco.dispatchEvent(app.w.PointerEvent ? new app.w.PointerEvent(tipo, { bubbles: true, clientX: 50, clientY: 50, button: 0 }) : new app.w.MouseEvent(tipo, { bubbles: true, clientX: 50, clientY: 50 }));
  su('pointerdown'); su('pointerup'); su('pointerdown'); su('pointerup');
  await attesa(60);
  t('doppio clic su un testo apre l\'editor del testo, non il pannello', $(app, 'modalTplTextEditor').classList.contains('open') && !app.d.getElementById('templateEditorBlockMenu'));
  app.E('chiudiTplTextEditor()');
  destro(app, blocco);
  scegli(app, 'Elimina il blocco');
  await attesa(40);
  t('«Elimina il blocco» lo toglie (col suo Annulla)', !JSON.stringify(app.E('templateEditorState.pages')).includes('"b1"') && /Blocco eliminato/.test(($(app, 'toastApp') || {}).textContent || ''));
  app.E('undoTemplateEditor()');
  await attesa(20);
  t('e Annulla lo rimette', JSON.stringify(app.E('templateEditorState.pages')).includes('"b1"'));

  app.E('renderTemplateEditorCanvas()');
  destro(app, $(app, 'templateEditorHeaderZone'));
  const vi = voci(app);
  t('intestazione sul foglio: testo formattato, immagine, distanza, importa da Word, nascondi', ['Testo formattato', 'Immagine', 'Distanza dal bordo', 'Importa da un Word', 'Nascondi l\'intestazione'].every(x => vi.some(v => v.includes(x))));
  scegli(app, 'Testo formattato');
  await attesa(60);
  t('«Testo formattato…» apre l\'editor dell\'intestazione', $(app, 'lblTplTextEditorTitle').textContent === 'Testo dell\'intestazione');
  app.E('chiudiTplTextEditor()');

  const pag = app.d.querySelector('.tpl-editor-page-thumb[data-page-idx="0"], .tpl-editor-page-tab[data-page-idx="0"]');
  destro(app, pag);
  t('pagina del template: apri, nuova pagina', ['Apri', 'Nuova pagina'].every(x => voci(app).some(v => v.includes(x))));
  scegli(app, 'Nuova pagina');
  t('«Nuova pagina» aggiunge una pagina', app.E('templateEditorState.pages.length') === 2);

  // Dentro un campo di testo resta il menu del browser.
  const campo = $(app, 'lblMargineTop');
  app.E("document.getElementById('menuRiga').classList.remove('open')");
  const ev = new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  campo.dispatchEvent(ev);
  t('in un campo di testo resta il menu del browser (copia, incolla)', !ev.defaultPrevented && !$(app, 'menuRiga').classList.contains('open'));

  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
