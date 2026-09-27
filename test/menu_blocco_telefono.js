// IL ⋮ DEL MENU DEL BLOCCO, SUL TELEFONO (editor dei template).
//
// Segnalato il 27/09/2026: «mancano menù per eliminare, spostare ecc. i blocchi piazzati».
// C'erano: nel ⋮ in testa al menu del blocco, «Sposta blocco» e «Rimuovi blocco». Ma sul telefono
// il menu si divide in schede (Posizione, Dimensione, Stile…) e la tendina del ⋮ veniva smistata
// dentro una di esse: aperta da un'altra scheda, restava nascosta e il ⋮ sembrava non fare niente.
//
// Qui: con la finestra da telefono, da OGNI scheda il ⋮ apre una tendina visibile (non dentro un
// pannello di scheda) con «Sposta blocco» e «Rimuovi blocco». Controprova: sul codice di prima
// questo test falliva (tendina dentro il pannello della scheda «Posizione»).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  // Finestra da telefono: è la condizione in cui il menu si divide in schede.
  app.w.matchMedia = q => ({ matches: /max-width:\s*760px/.test(q), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  app.E('openReportTemplatesModal()');
  await attesa(100);
  clic(app, app.d.querySelector('.tpl-report-modifica.tpl-riga-primaria'));
  await attesa(600);
  const blocchi = [...app.d.querySelectorAll('#templateEditorCanvas .tpl-editor-block')];
  t('l\'editor è aperto con i suoi blocchi', app.d.getElementById('modalTemplateEditor').classList.contains('open') && blocchi.length > 1);

  let provati = 0;
  for (const blocco of blocchi) {
    const id = blocco.dataset.blockId || blocco.getAttribute('data-block-id');
    app.E(`apriMenuBloccoEditor(${JSON.stringify(id)})`);
    await attesa(60);
    const menu = () => app.d.getElementById('templateEditorBlockMenu');
    const schede = [...menu().querySelectorAll('.tpl-editor-menu-schede [role="tab"]')];
    if (schede.length < 2) continue;
    provati++;
    for (const scheda of schede) {
      clic(app, scheda);
      await attesa(40);
      const nome = scheda.textContent.trim();
      const bottone = menu().querySelector('[data-action="apri-menu-altro"]');
      clic(app, bottone);
      await attesa(40);
      const tendina = menu().querySelector('[data-role="menu-altro"]');
      const testo = tendina ? tendina.textContent : '';
      t(`blocco ${provati}, scheda «${nome}»: il ⋮ apre la tendina, fuori dai pannelli delle schede`,
        !!tendina && !tendina.hidden && !tendina.closest('.tpl-editor-menu-pannello'));
      t(`  con «Sposta blocco» e «Rimuovi blocco»`, /Sposta blocco/.test(testo) && /Rimuovi blocco/.test(testo));
      clic(app, bottone);
      await attesa(20);
    }
    if (provati >= 2) break;
  }
  t('provati almeno due blocchi con le schede', provati >= 2);

  console.log('--- Aprire il menu: tasto destro e tocco prolungato (27/09/2026) ---');
  const menuDi = id => { const m = app.d.getElementById('templateEditorBlockMenu'); return !!m && m.dataset.blockId === id; };
  // I gesti stanno sul corpo del blocco (.tpl-editor-block-body), che porta il suo id.
  const corpo = () => app.d.querySelectorAll('#templateEditorCanvas .tpl-editor-block-body')[1];
  const idDi = el => el.dataset.blockId;
  const puntatore = (el, tipo) => el.dispatchEvent(new app.w.MouseEvent(tipo, { bubbles: true, cancelable: true, clientX: 50, clientY: 50 }));
  app.E('chiudiMenuBloccoEditor(); deselezionaBloccoEditor()');
  await attesa(40);
  let el = corpo(); let id = idDi(el);
  const destro = new app.w.MouseEvent('contextmenu', { bubbles: true, cancelable: true });
  el.dispatchEvent(destro);
  await attesa(40);
  t('il tasto destro apre il menu del blocco, senza il menu del browser', menuDi(id) && destro.defaultPrevented);
  app.E('chiudiMenuBloccoEditor(); deselezionaBloccoEditor()');
  await attesa(40);
  el = corpo(); id = idDi(el);
  puntatore(el, 'pointerdown'); await attesa(300); puntatore(el, 'pointerup'); await attesa(40);
  t('un tocco breve non lo apre', !menuDi(id));
  el = corpo();
  puntatore(el, 'pointerdown'); await attesa(650);
  t('un tocco prolungato lo apre', menuDi(id));
  puntatore(el, 'pointerup'); await attesa(40);
  t('e rilasciando resta aperto', menuDi(id));

  console.log('--- Rimuovi blocco: «Annulla» nel messaggio ---');
  const nBlocchi = () => app.d.querySelectorAll('#templateEditorCanvas .tpl-editor-block').length;
  const prima = nBlocchi();
  clic(app, app.d.querySelector('#templateEditorBlockMenu .tpl-editor-menu-remove'));
  await attesa(120);
  const toastEl = app.d.getElementById('toastApp');
  t('il blocco sparisce e il messaggio dice «Blocco eliminato» con «Annulla»', nBlocchi() === prima - 1 && !!toastEl && toastEl.classList.contains('visibile')
    && app.d.getElementById('toastAppTesto').textContent === 'Blocco eliminato' && app.d.getElementById('toastAppAzione').textContent === 'Annulla');
  clic(app, app.d.getElementById('toastAppAzione'));
  await attesa(120);
  t('«Annulla» lo rimette', nBlocchi() === prima && !!app.d.querySelector(`#templateEditorCanvas [data-block-id="${id}"]`));

  console.log('--- Correzioni minori ---');
  t('il titolo è il nome del template, non «Modifica "…"»', app.d.getElementById('lblTemplateEditorTitle').textContent === 'Classico');
  t('niente emoji nei bottoni dell\'editor', !/🧹|⚖️/.test(app.d.getElementById('modalTemplateEditor').innerHTML));
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
