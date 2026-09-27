// LA PROVA IN CAMPO (Fase 3, punti 1–3 e decisione G), coi tocchi come li fa l'utente.
//
//  - testata: «Prova N» e «Nome progetto · Comune» (mai più «L…»), Home e ⋯ con le azioni rare;
//  - spie GPS / foto / falda / note: fatto, con quantità, non ancora (tratteggio, mai rosso);
//  - la falda si imposta dalla sua spia;
//  - il tasto Registra è VISIBILE DI DEFAULT, dice quale intervallo registra, si nasconde e la
//    scelta resta (anche riaprendo l'app); la pressione lunga su +1 registra lo stesso;
//  - il toast «Registrato … · N colpi» con «Annulla» toglie PROPRIO quell'intervallo, e non tocca
//    niente se nel frattempo è cambiato qualcosa;
//  - «Annulla ultimo intervallo» dal ⋯ e tenendo premuto −1 (con la domanda di sempre);
//  - note rapide: «Nota sull'ultimo intervallo», «Altra nota…», pillole che vanno a capo;
//  - Registro: «Registro · N intervalli», Grafico, Aggiungi (un intervallo / multipli), ⋯ strati;
//  - migrazione 2 → 3: la Modalità Espansa diventa «tasto Registra visibile»;
//  - misure: niente testo sotto i 12 px e comandi da almeno 44 px in testata e Vista Prova.
// Controprove sull'app di prima (riferimento/).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { testiConCarattere, misureComando, nascosto } = require('./dati/misure_stile');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const visibile = (app, id) => !!$(app, id) && !nascosto(app.w, $(app, id));
const toast = app => { const el = $(app, 'toastApp'); return el && el.classList.contains('visibile') ? $(app, 'toastAppTesto').textContent : null; };
async function tieniPremuto(app, el, ms = 650) {
  el.dispatchEvent(new app.w.MouseEvent('mousedown', { bubbles: true }));
  await attesa(ms);
  el.dispatchEvent(new app.w.MouseEvent('mouseup', { bubbles: true }));
  el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(50);
}
const conVersione = (v, impostazioni) => { const s = JSON.parse(STATO_V0); s.versioneSchema = v; Object.assign(s.settings, impostazioni); return JSON.stringify(s); };

async function apriPrimaProva(app) {
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);
  return pid;
}

(async () => {
  console.log('--- Testata della prova ---');
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const pid = await apriPrimaProva(app);
  const proj = app.E('state.projects[' + JSON.stringify(pid) + ']');
  const h = app.E('state.header');
  t('il titolo è «Prova N», non il comune', $(app, 'lblSurveySummary').textContent === 'Prova ' + h.provaNr);
  t('sotto: «Nome progetto · Comune»', $(app, 'lblSurveySub').textContent === proj.name + ' · ' + h.comune);
  t('il titolo si tocca: apre l\'intestazione della prova', (clic(app, $(app, 'btnOpenSurveyDrawer')), $(app, 'modalCantiereInfo').classList.contains('open')));
  app.E('closeCantiereInfoModal()');
  t('a sinistra Home, a destra il ⋯', $(app, 'btnHomeView').closest('.testata-riga') && $(app, 'btnHeaderMore').getAttribute('aria-haspopup') === 'menu');
  const voci = [...$(app, 'headerActionsSecondary').querySelectorAll('[role="menuitem"]')].map(b => b.textContent.trim());
  t('nel ⋯: Gestione litologica, Esporta, Impostazioni, Annulla ultimo intervallo', JSON.stringify(voci) === JSON.stringify(['Gestione litologica', 'Esporta', 'Impostazioni', 'Annulla ultimo intervallo']));
  t('il ⋯ è chiuso finché non lo si tocca', !$(app, 'headerActionsSecondary').classList.contains('open'));
  clic(app, $(app, 'btnHeaderMore'));
  t('toccato si apre (aria-expanded)', $(app, 'headerActionsSecondary').classList.contains('open') && $(app, 'btnHeaderMore').getAttribute('aria-expanded') === 'true');
  clic(app, $(app, 'btnHamburger'));
  t('una voce fa la sua azione e chiude il menu', app.d.body.classList.contains('drawer-open') || $(app, 'drawerMenu').classList.contains('open'));
  t('…e il menu si è chiuso', !$(app, 'headerActionsSecondary').classList.contains('open'));
  app.E('closeDrawer()');
  const chip = [...$(app, 'surveySwitcherBar').querySelectorAll('button')];
  t('riga «Prove» con i cerchietti e il «+» tratteggiato in fondo', $(app, 'surveySwitcherBar').textContent.trim().startsWith('Prove') && chip[chip.length - 1].classList.contains('prova-chip-nuova') && chip.slice(0, -1).every(b => b.classList.contains('prova-chip')));
  t('la prova aperta è segnata (aria-current)', chip.filter(b => b.getAttribute('aria-current') === 'true').length === 1);

  console.log('--- Spie ---');
  const spia = id => ({ fatto: $(app, id).classList.contains('fatto'), nonAncora: $(app, id).classList.contains('non-ancora'), testo: $(app, id).textContent.trim() });
  app.E('state.header.lat = null; state.header.lng = null; state.photos = []; state.header.faldaDa = ""; updateUI(); renderPhotoGallery()');
  await attesa(30);
  t('GPS mancante: tratteggio, testo «GPS»', spia('btnGetGpsHeader').nonAncora && !spia('btnGetGpsHeader').fatto && spia('btnGetGpsHeader').testo === 'GPS');
  t('0 foto: «0 foto» col tratteggio, niente ❌ né rosso', spia('btnOpenSurveyPhotosModal').testo === '0 foto' && spia('btnOpenSurveyPhotosModal').nonAncora && !/❌/.test($(app, 'testataProva').textContent) && !/ef4444|danger/.test($(app, 'btnOpenSurveyPhotosModal').outerHTML));
  t('falda non impostata: «Falda» col tratteggio', spia('btnSpiaFalda').testo === 'Falda' && spia('btnSpiaFalda').nonAncora);
  app.E('state.header.lat = 40.3; state.header.lng = 18.1; state.photos = [{ id: "x1" }, { id: "x2" }]; updateUI(); renderPhotoGallery()');
  await attesa(30);
  t('GPS presente: spia «fatto» con la spunta', spia('btnGetGpsHeader').fatto && $(app, 'icoSpiaGps').innerHTML.includes('#i-check'));
  t('2 foto: «2 foto», neutra (né tratteggio né verde)', spia('btnOpenSurveyPhotosModal').testo === '2 foto' && !spia('btnOpenSurveyPhotosModal').nonAncora && !spia('btnOpenSurveyPhotosModal').fatto);
  app.E('state.photos = []; updateUI()');
  clic(app, $(app, 'btnSpiaFalda'));
  t('la spia Falda apre la finestra della falda', $(app, 'modalQuickFalda').classList.contains('open'));
  $(app, 'numQuickFaldaDa').value = '1.2';
  clic(app, $(app, 'btnQuickFaldaSave'));
  await attesa(30);
  t('e salvata dice «Falda 1,20 m»', spia('btnSpiaFalda').testo === 'Falda 1,20 m' && !spia('btnSpiaFalda').nonAncora && app.E('state.header.faldaDa') === '1.2');
  t('la falda non sta più nella barra del Registro', !$(app, 'btnQuickFaldaIntegrated') && !$(app, 'btnQuickFaldaChart'));
  t('la spia Note apre le note del progetto', (clic(app, $(app, 'btnOpenProjectNotesHeader')), await attesa(200), $(app, 'modalProjectNotes').classList.contains('open')));
  app.E('chiudiNoteProgetto && chiudiNoteProgetto()');
  await attesa(100);

  console.log('--- Registra: visibile di default ---');
  const d0 = app.E('state.currentDepthStart'), passo = app.E('state.settings.stepCm') / 100;
  const atteso = (a, b) => `${a.toFixed(2).replace('.', ',')}–${b.toFixed(2).replace('.', ',')} m`;
  t('il tasto Registra si vede', visibile(app, 'btnConfirmStepAction') && !visibile(app, 'rigaRegistraNascosto'));
  t('e dice cosa registra: «Registra da–a m»', $(app, 'btnConfirmStepAction').textContent.trim() === 'Registra ' + atteso(d0, d0 + passo));
  t('l\'intervallo del contatore è lo stesso, in mono', $(app, 'lblDepthRange').textContent === atteso(d0, d0 + passo));
  t('sotto: «Oppure tieni premuto +1» e «Nascondi questo tasto»', /Oppure tieni premuto \+1/.test($(app, 'directActionButtonsRow').textContent) && $(app, 'btnNascondiRegistra').textContent === 'Nascondi questo tasto');
  const n0 = app.E('state.logs.length');
  for (let i = 0; i < 14; i++) clic(app, $(app, 'btnPlus'));
  clic(app, $(app, 'btnConfirmStepAction'));
  await attesa(50);
  const registrato = app.E('state.logs[state.logs.length - 1]');
  t('toccato registra l\'intervallo coi suoi colpi', app.E('state.logs.length') === n0 + 1 && registrato.colpi === 14 && registrato.origine === 'contatore' && app.E('state.currentCount') === 0);
  t('il toast lo dice: «Registrato da–a m · 14 colpi», con «Annulla»', toast(app) === `Registrato ${atteso(d0, d0 + passo)} · 14 colpi` && $(app, 'toastAppAzione').textContent === 'Annulla');
  t('e l\'etichetta passa all\'intervallo dopo', $(app, 'btnConfirmStepAction').textContent.trim() === 'Registra ' + atteso(d0 + passo, d0 + 2 * passo));
  t('il Registro conta «Registro · N intervalli»', $(app, 'lblIntegratedTotalSteps').textContent === `Registro · ${n0 + 1} intervalli`);

  console.log('--- Annulla del toast: proprio quell\'intervallo ---');
  clic(app, $(app, 'toastAppAzione'));
  await attesa(50);
  t('toglie l\'intervallo appena registrato', app.E('state.logs.length') === n0);
  t('e i suoi 14 colpi tornano nel contatore, alla sua profondità', app.E('state.currentCount') === 14 && Math.abs(app.E('state.currentDepthStart') - d0) < 1e-9);
  t('senza domande, e con un toast che lo dice', !app.dialogo() && /^Annullato: .* torna nel contatore con 14 colpi$/.test(toast(app)));
  t('gli altri intervalli sono quelli di prima', JSON.stringify(app.E('state.logs.map(l => [l.start, l.colpi])')) === JSON.stringify(app.E('state.logs.slice(0,' + n0 + ').map(l => [l.start, l.colpi])')));
  clic(app, $(app, 'btnConfirmStepAction'));
  await attesa(30);
  const r2 = app.E('state.logs[state.logs.length - 1]');
  clic(app, $(app, 'btnPlus'));
  const lunghezza = app.E('state.logs.length');
  const annulla = app.E('(l) => annullaRegistrazione(l)');
  t('se si è già contato un colpo del successivo, non toglie niente', annulla(r2) === false && app.E('state.logs.length') === lunghezza && app.E('state.currentCount') === 1);
  clic(app, $(app, 'btnMinus'));
  clic(app, $(app, 'btnConfirmStepAction'));
  await attesa(30);
  t('e un «Annulla» vecchio non toglie un intervallo diverso da quello del suo toast', annulla(r2) === false && app.E('state.logs.length') === lunghezza + 1);

  console.log('--- Pressione lunga e «Annulla ultimo» ---');
  const primaLunga = app.E('state.logs.length');
  clic(app, $(app, 'btnPlus')); clic(app, $(app, 'btnPlus'));
  await tieniPremuto(app, $(app, 'btnPlus'));
  t('tenere premuto +1 registra (senza un colpo in più)', app.E('state.logs.length') === primaLunga + 1 && app.E('state.logs[state.logs.length-1].colpi') === 2);
  clic(app, $(app, 'btnHeaderMore'));
  clic(app, $(app, 'btnAnnullaUltimoMenu'));
  await attesa(40);
  t('⋯ → Annulla ultimo intervallo: chiede conferma', !!app.dialogo() && /annullare l'ultimo intervallo/.test(app.dialogo().testo));
  clic(app, app.dialogo().ok);
  await attesa(40);
  t('e confermato toglie l\'ultimo', app.E('state.logs.length') === primaLunga && app.E('state.currentCount') === 2);
  await tieniPremuto(app, $(app, 'btnMinus'));
  await attesa(40);
  t('tenere premuto −1 fa la stessa domanda', !!app.dialogo() && /annullare l'ultimo intervallo/.test(app.dialogo().testo));
  clic(app, app.dialogo().annulla);
  await attesa(30);
  t('(e rispondendo Annulla non tocca niente)', app.E('state.logs.length') === primaLunga);

  console.log('--- Nascondere il tasto: la scelta resta ---');
  clic(app, $(app, 'btnNascondiRegistra'));
  t('nascosto: resta la riga tratteggiata «Registra tenendo premuto +1 · Mostra il tasto»', !visibile(app, 'btnConfirmStepAction') && visibile(app, 'rigaRegistraNascosto') && /Registra tenendo premuto \+1/.test($(app, 'rigaRegistraNascosto').textContent) && $(app, 'btnMostraRegistra').textContent === 'Mostra il tasto');
  t('la scelta è nelle preferenze salvate', JSON.parse(app.salvato()).settings.tastoRegistraVisibile === false);
  const sid2 = app.E('Object.keys(state.projects[state.currentProjectId].surveys).find(id => id !== state.currentSurveyId)');
  clic(app, [...$(app, 'surveySwitcherBar').querySelectorAll('.prova-chip:not(.prova-chip-nuova)')].find(b => b.getAttribute('aria-current') !== 'true'));
  await attesa(30);
  t('passando a un\'altra prova resta nascosto (è dell\'app, non della prova)', app.E('state.currentSurveyId') === sid2 && !visibile(app, 'btnConfirmStepAction'));
  const salvato = app.salvato();
  app.chiudi();
  const riaperta = await avviaApp({ stato: salvato, idb: telefonoV0() });
  await apriPrimaProva(riaperta);
  t('riaprendo l\'app è ancora nascosto', !visibile(riaperta, 'btnConfirmStepAction') && visibile(riaperta, 'rigaRegistraNascosto'));
  const modificati = () => JSON.stringify(Object.values(JSON.parse(riaperta.salvato()).projects).map(p => p.modificatoIl || null));
  riaperta.E('saveState()');
  const primaDellaPreferenza = modificati();
  clic(riaperta, $(riaperta, 'btnMostraRegistra'));
  t('«Mostra il tasto» lo rimette, e anche questo resta', visibile(riaperta, 'btnConfirmStepAction') && JSON.parse(riaperta.salvato()).settings.tastoRegistraVisibile === true);
  t('cambiare la preferenza non è una modifica del progetto (modificatoIl fermo)', modificati() === primaDellaPreferenza);

  console.log('--- Note rapide e Registro ---');
  t('titolo «Nota sull\'ultimo intervallo»', $(riaperta, 'viewField').querySelector('.note-rapide-titolo').textContent === "Nota sull'ultimo intervallo");
  t('«Personalizzata» è diventata «Altra nota…»', $(riaperta, 'btnCustomNote').textContent.trim() === 'Altra nota…');
  t('le pillole vanno a capo (nessuno scorrimento di lato)', riaperta.w.getComputedStyle($(riaperta, 'viewField').querySelector('.note-tags-row')).flexWrap === 'wrap');
  t('Registro: «Grafico» e «Aggiungi» con icona e nome', /Grafico/.test($(riaperta, 'btnToggleViewIntegrated').textContent) && $(riaperta, 'btnToggleViewIntegrated').querySelector('.ico') && /Aggiungi/.test($(riaperta, 'btnAggiungiIntegrated').textContent));
  clic(riaperta, $(riaperta, 'btnAggiungiIntegrated'));
  const menuAgg = $(riaperta, 'btnAggiungiIntegrated').parentElement.querySelector('.menu-azioni');
  t('«Aggiungi» offre un intervallo o «Aggiungi intervalli multipli»', menuAgg.classList.contains('open') && /Un intervallo/.test(menuAgg.textContent) && /Aggiungi intervalli multipli/.test(menuAgg.textContent));
  clic(riaperta, menuAgg.querySelector('.btn-open-bulk-import'));
  t('…che apre la finestra di sempre', $(riaperta, 'modalBulkImport').classList.contains('open') && !menuAgg.classList.contains('open'));
  riaperta.E('closeBulkImportModal()');
  t('il riconoscimento degli strati sta nel ⋯ del Registro', $(riaperta, 'menuAltroRegistroIntegrated').contains($(riaperta, 'btnAutoStratiIntegrated')) && !nascosto(riaperta.w, $(riaperta, 'menuAltroRegistroIntegrated')));
  const ordine = riaperta.E('state.logs.map(l => l.start)');
  t('l\'ordine del Registro non cambia (dall\'alto in basso per profondità)', ordine.every((v, i) => i === 0 || v >= ordine[i - 1]));

  console.log('--- Misure: caratteri e bersagli ---');
  const radici = [$(riaperta, 'testataProva'), $(riaperta, 'viewField')];
  const piccoli = testiConCarattere(riaperta.w, radici).filter(x => x.px < 12);
  t('niente testo sotto i 12 px in testata e Vista Prova', piccoli.length === 0);
  if (piccoli.length) console.log('       ', piccoli.slice(0, 6).map(x => x.px + ' «' + x.testo + '»').join(' | '));
  const comandi = radici.flatMap(r => [...r.querySelectorAll('button')]).filter(b => !nascosto(riaperta.w, b));
  const bassi = comandi.map(b => ({ b, m: misureComando(riaperta.w, b) })).filter(x => !(x.m.altezza >= 44) || (!x.b.textContent.trim() && !(x.m.larghezza >= 44)));
  t('ogni comando visibile in campo è alto almeno 44 px (' + comandi.length + ' comandi)', bassi.length === 0 && comandi.length > 20);
  if (bassi.length) console.log('       ', bassi.slice(0, 8).map(x => (x.b.id || x.b.className) + ' ' + JSON.stringify(x.m)).join(' | '));
  const menuVoci = [...riaperta.d.querySelectorAll('#testataProva [role="menuitem"], #viewField [role="menuitem"]')];
  t('anche le voci dei menu ⋯ (44 px)', menuVoci.length >= 6 && menuVoci.every(b => misureComando(riaperta.w, b).altezza >= 44));
  t('Registra alto 56 (azione principale in campo)', misureComando(riaperta.w, $(riaperta, 'btnConfirmStepAction')).altezza === 56);
  t('l\'app non ha dato errori', riaperta.errori.length === 0 && app.errori.length === 0);
  if (riaperta.errori.length) console.log('       ', riaperta.errori.slice(0, 3));
  riaperta.chiudi();

  console.log('--- Migrazione 2 → 3: la Modalità Espansa ---');
  for (const espansa of [true, false]) {
    const testo = conVersione(2, { expandedMode: espansa });
    const a = await avviaApp({ stato: testo, idb: telefonoV0() });
    await apriPrimaProva(a);
    const s = JSON.parse(a.salvato());
    t(`Modalità Espansa ${espansa ? 'attiva' : 'spenta'}: il tasto Registra si vede`, visibile(a, 'btnConfirmStepAction'));
    t('  preferenza «tasto Registra visibile», expandedMode sparito anche dalle prove', s.versioneSchema === 3 && s.settings.tastoRegistraVisibile === true && !('expandedMode' in s.settings)
      && !/expandedMode|compactMode/.test(JSON.stringify(s.projects)));
    const copie = a.idb._dump('DPSH_CopieAutomatiche');
    const voce = copie.indice.find(v => v.motivo === 'prima di aggiornare i dati (formato 2 → 3)');
    t('  con la copia «prima di aggiornare i dati (formato 2 → 3)», col testo di prima', !!voce && copie.copie.find(c => c.id === voce.id).json === testo);
    a.chiudi();
  }
  {
    const a = await avviaApp({ stato: null });
    const progetto = JSON.parse(STATO_V0).projects;
    const pid0 = Object.keys(progetto)[0];
    const file = { versioneSchema: 2, projects: { [pid0]: progetto[pid0] } };
    Object.values(file.projects[pid0].surveys).forEach(sv => { sv.settings = Object.assign({}, sv.settings, { expandedMode: true }); });
    const importati = a.E('importProjectsFromJSON')(file);
    t('un file del formato 2 si importa ancora, e le sue prove perdono expandedMode', importati.importedCount === 1 && !/expandedMode/.test(JSON.stringify(a.E('state.projects'))));
    a.chiudi();
  }

  console.log('--- Controprove: l\'app di prima ---');
  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  await apriPrimaProva(vecchia);
  t('(controprova) CONFERMA era nascosta di default', vecchia.d.getElementById('directActionButtonsRow').style.display === 'none');
  t('(controprova) il titolo era il comune', vecchia.d.getElementById('lblSurveySummary').textContent === vecchia.E('state.header.comune'));
  vecchia.E('state.photos = []; renderPhotoGallery()');
  await attesa(30);
  t('(controprova) 0 foto era una ❌ rossa', vecchia.d.getElementById('photoBadgeStatus').textContent === '❌');
  const vPiccoli = testiConCarattere(vecchia.w, [vecchia.d.querySelector('header'), vecchia.d.getElementById('viewField')]).filter(x => x.px < 12);
  t('(controprova) e c\'erano testi sotto i 12 px (' + vPiccoli.length + ')', vPiccoli.length > 3);
  const vComandi = [...vecchia.d.querySelectorAll('#surveySwitcherBar button, .btn-tag')].filter(b => !nascosto(vecchia.w, b));
  t('(controprova) e comandi da campo sotto i 44 px', vComandi.some(b => (misureComando(vecchia.w, b).altezza || 0) < 44));
  vecchia.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})();
