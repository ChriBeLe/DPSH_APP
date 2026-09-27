// IL TOAST DELL'APP (Fase 3, punto 4).
//
// Le conferme di SOLO successo non bloccano più lo schermo: un toast in basso che sparisce da solo
// (mostraToast, pezzo 002, nato da mostraToastTemplateEditor). Errori e domande restano dialoghi.
// Qui: il toast in sé (testo, durata, azione, sostituzione), l'editor dei template che ora passa
// di lì, e le conferme vere dell'app: «Aggiungi intervalli multipli», l'import di un progetto
// pulito (toast) e con qualcosa da leggere (dialogo), un errore (dialogo).
// Controprova: nell'app di prima «Importati con successo…» era un dialogo da chiudere.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const toast = app => {
  const el = app.d.getElementById('toastApp');
  return el && el.classList.contains('visibile') ? { testo: app.d.getElementById('toastAppTesto').textContent, azione: app.d.getElementById('toastAppAzione') } : null;
};

async function aggiungiIntervalliMultipli(app, testo) {
  app.E('openBulkImportModal()');
  await attesa(20);
  const campo = app.d.getElementById('txtBulkImportData');
  campo.value = testo;
  campo.dispatchEvent(new app.w.Event('input'));
  const append = app.d.querySelector('input[name="optImportMode"][value="append"]');
  if (append) append.checked = true;
  clic(app, app.d.getElementById('btnConfirmBulkImport'));
  await attesa(120);
}

(async () => {
  console.log('--- Il toast ---');
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(50);
  app.E('mostraToast("Fatto qualcosa", { durata: 250 })');
  t('compare in basso, col testo, senza azione', toast(app) && toast(app).testo === 'Fatto qualcosa' && toast(app).azione.style.display === 'none');
  t('è un avviso che si annuncia (role=status), non un dialogo', app.d.getElementById('toastApp').getAttribute('role') === 'status' && !app.dialogo());
  await attesa(400);
  t('sparisce da solo', !toast(app));
  let chiamata = 0;
  app.w.__fatto = () => { chiamata++; };
  app.E('mostraToast("Registrato", { azione: { etichetta: "Annulla", fn: () => window.__fatto() } })');
  t('con un\'azione: il bottone «Annulla»', toast(app) && toast(app).azione.textContent === 'Annulla' && toast(app).azione.style.display !== 'none');
  clic(app, toast(app).azione);
  t('toccarla fa l\'azione una volta e chiude il toast', chiamata === 1 && !toast(app));
  app.E('mostraToast("Primo", { azione: { etichetta: "Annulla", fn: () => window.__fatto() } })');
  app.E('mostraToast("Secondo")');
  t('un toast nuovo prende il posto del vecchio, e della sua azione', toast(app).testo === 'Secondo' && toast(app).azione.style.display === 'none');
  app.E('nascondiToast()');
  app.E('mostraToast("✅ Emoji tolta")');
  t('niente emoji nel testo', toast(app).testo === 'Emoji tolta');
  app.E('mostraToastTemplateEditor("Dall\'editor")');
  t('l\'avviso dell\'editor dei template ora è lo stesso toast', toast(app).testo === "Dall'editor" && !app.d.getElementById('templateEditorToast'));

  console.log('--- Le conferme dell\'app ---');
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(50);
  const prima = app.E('state.logs.length');
  await aggiungiIntervalliMultipli(app, '11 13 17');
  t('«Aggiungi intervalli multipli»: gli intervalli ci sono', app.E('state.logs.length') === prima + 3);
  t('e la conferma è un toast, nessun dialogo da chiudere', !app.dialogo() && toast(app) && toast(app).testo === 'Aggiunti 3 intervalli');
  app.E('toastODialogo("Archivio importato con successo", "")');
  t('un esito pulito va nel toast', toast(app).testo === 'Archivio importato con successo' && !app.dialogo());
  app.E('toastODialogo("Importazione completata", "\\n\\n2 foto citate nel file non c\'erano dentro")');
  await attesa(30);
  t('un esito con qualcosa da leggere resta un dialogo, col testo intero', app.dialogo() && /Importazione completata\s+2 foto citate/.test(app.dialogo().testo));
  clic(app, app.dialogo().ok);
  await attesa(30);
  await aggiungiIntervalliMultipli(app, 'nessun numero');
  t('un errore resta un dialogo', !!app.dialogo() && /Nessun numero valido/.test(app.dialogo().testo));
  if (app.dialogo()) clic(app, app.dialogo().ok);
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('      ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('--- Controprova: l\'app di prima ---');
  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  if (vecchia.dialogo()) clic(vecchia, vecchia.dialogo().ok);
  await attesa(50);
  vecchia.E('openProject(' + JSON.stringify(pid) + ')');
  await aggiungiIntervalliMultipli(vecchia, '11 13 17');
  t('(controprova) «Importati con successo…» era un dialogo da chiudere', !!vecchia.dialogo() && /Importati con successo/.test(vecchia.dialogo().testo));
  vecchia.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})();
