// IL FUOCO DELLA TASTIERA NELLE FINESTRE.
// Una finestra aperta tiene il fuoco dentro (Tab e Maiusc+Tab girano in tondo), la più in alto
// è l'unica a farlo, e alla chiusura il fuoco torna a chi l'aveva aperta.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const tab = (app, shift) => {
  const el = app.d.activeElement || app.d.body;
  const ev = new app.w.KeyboardEvent('keydown', { key: 'Tab', shiftKey: !!shift, bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  return ev;
};
const focusabili = (app, m) => Array.from(m.querySelectorAll('a[href],button,input,select,textarea,[tabindex]'))
  .filter(e => !e.disabled && e.getAttribute('tabindex') !== '-1' && !e.closest('[hidden]') && app.w.getComputedStyle(e).display !== 'none');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const pid = app.E('Object.keys(state.projects)[0]');

  console.log('--- Apertura ---');
  const apritore = app.d.createElement('button');
  apritore.id = 'apritoreProva';
  app.d.body.appendChild(apritore);
  apritore.focus();
  app.E('openProjectActionsModal(' + JSON.stringify(pid) + ')');
  await attesa(30);
  const m = $(app, 'modalProjectActions');
  t('la finestra è aperta', m.classList.contains('open'));
  t('il fuoco è dentro la finestra', m.contains(app.d.activeElement) && app.d.activeElement !== m);
  t('e non su un campo di testo', !/^(TEXTAREA)$/.test(app.d.activeElement.tagName));

  console.log('--- Tab che gira ---');
  const el = focusabili(app, m);
  t('la finestra ha almeno due elementi raggiungibili', el.length >= 2);
  el[el.length - 1].focus();
  let ev = tab(app, false);
  t('Tab dall\'ultimo torna al primo', ev.defaultPrevented && app.d.activeElement === el[0]);
  ev = tab(app, true);
  t('Maiusc+Tab dal primo va all\'ultimo', ev.defaultPrevented && app.d.activeElement === el[el.length - 1]);
  el[0].focus();
  ev = tab(app, false);
  t('Tab in mezzo non è toccato', !ev.defaultPrevented);
  apritore.focus();
  tab(app, false);
  t('se il fuoco è fuori, Tab lo riporta dentro', m.contains(app.d.activeElement));

  console.log('--- Finestre una sopra l\'altra ---');
  const dp = app.E("appAlert('Prova')");
  await attesa(30);
  const ad = $(app, 'appDialog');
  t('si apre l\'avviso sopra la finestra', ad.classList.contains('open') && ad.contains(app.d.activeElement));
  const eld = focusabili(app, ad);
  eld[eld.length - 1].focus();
  tab(app, false);
  t('Tab gira dentro l\'avviso, quello in cima', app.d.activeElement === eld[0]);
  eld[eld.length - 1].click();
  await attesa(60);
  t('chiuso l\'avviso, il fuoco torna dentro la finestra sotto', !ad.classList.contains('open') && m.classList.contains('open') && m.contains(app.d.activeElement));
  tab(app, true);
  t('e ora è di nuovo la finestra sotto a trattenere il fuoco', m.contains(app.d.activeElement));

  console.log('--- Chiusura ---');
  app.E("document.getElementById('modalProjectActions').classList.remove('open')");
  await attesa(30);
  t('chiusa la finestra, il fuoco torna a chi l\'aveva aperta', app.d.activeElement === apritore);

  console.log('--- Tocco: il fuoco non si sposta ---');
  apritore.dispatchEvent(new app.w.Event('pointerdown', { bubbles: true }));
  const pd = new app.w.Event('pointerdown', { bubbles: true }); pd.pointerType = 'touch';
  apritore.dispatchEvent(pd);
  apritore.focus();
  app.E('openProjectActionsModal(' + JSON.stringify(pid) + ')');
  await attesa(30);
  t('aperta a tocco, il fuoco resta dov\'era', app.d.activeElement === apritore);
  const e2 = focusabili(app, m);
  e2[e2.length - 1].focus();
  tab(app, false);
  t('ma Tab è comunque trattenuto', app.d.activeElement === e2[0]);

  t('nessun errore nella pagina', app.errori.length === 0);
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
