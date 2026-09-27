// LE DUE VISTE DELLA PROVA (Fase 6, punto 1): «Conta» e «Registro», coi tocchi come li fa l'utente.
//
//  - si entra nella prova su «Conta»: contatore e ultimi 3 intervalli, il registro no;
//  - gli ultimi 3 sono proprio gli ultimi, in ordine di profondità; un tocco apre la scheda;
//  - «Registro · N» (e «Tutto il registro») mostra il registro intero e nasconde il contatore;
//  - registro, tabella e grafico scorrono in un riquadro di poche righe, oppure mostrano tutte
//    le righe («Mostra tutte le righe», scelta ricordata e che non modifica il progetto);
//  - «Intervalli»: il titolo inverte l'ordine dell'elenco (solo lì), la freccia dice il verso;
//  - «Riconosci strati» si vede nel Registro, non sta più nel ⋯;
//  - spariscono il lucchetto che comprimeva il contatore e le due barre (compatta e fissa);
//  - tornando alla Home e rientrando si riparte da «Conta».
// Controprove sull'app di prima (riferimento/).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');
const { nascosto } = require('./dati/misure_stile');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);
const visibile = (app, id) => !!$(app, id) && !nascosto(app.w, $(app, id));
const virgola = n => n.toFixed(2).replace('.', ',');

async function apriPrimaProva(app) {
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E('Object.keys(state.projects)[0]');
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);
  return pid;
}

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  const pid = await apriPrimaProva(app);
  const logs = JSON.parse(JSON.stringify(app.E('state.logs'))); // copia: app.E dà l'array vivo

  console.log('--- Si entra su «Conta» ---');
  t('due schede: Conta e Registro', $(app, 'btnVistaConta').textContent === 'Conta' && /^Registro/.test($(app, 'btnVistaRegistro').textContent));
  t('Conta è quella scelta', $(app, 'btnVistaConta').getAttribute('aria-selected') === 'true' && $(app, 'btnVistaRegistro').getAttribute('aria-selected') === 'false');
  t('si vedono contatore e ultimi intervalli', visibile(app, 'cardCounterDashboard') && visibile(app, 'cardUltimiIntervalli'));
  t('il registro no', !visibile(app, 'cardIntegratedRegister') && !visibile(app, 'cardLogsTable') && !visibile(app, 'cardChart'));
  t('la scheda Registro dice quanti intervalli ci sono', $(app, 'btnVistaRegistro').textContent === `Registro · ${logs.length}`);

  console.log('--- Gli ultimi 3 intervalli ---');
  const righe = [...$(app, 'listaUltimiIntervalli').querySelectorAll('.ultimo-intervallo')];
  const attese = logs.slice(-3);
  t('sono 3', logs.length >= 3 && righe.length === 3);
  t('sono proprio gli ultimi, dall\'alto in basso', righe.every((r, k) =>
    r.querySelector('.ultimo-intervallo-prof').textContent === `${virgola(attese[k].start)}–${virgola(attese[k].end)} m`
    && r.querySelector('.ultimo-intervallo-colpi').textContent === String(attese[k].colpi)));
  clic(app, righe[2]);
  t('un tocco apre la scheda di quell\'intervallo, già modificabile', $(app, 'modalEditStep').classList.contains('open') && app.E('editingIndex') === logs.length - 1);
  app.E('closeModal()');
  await attesa(20);
  const colpiPrima = app.E('state.currentCount');
  clic(app, $(app, 'btnPlus'));
  await attesa(700);
  app.E('confirmAndNextStep()');
  await attesa(300);
  const dopo = app.E('state.logs');
  const ultima = [...$(app, 'listaUltimiIntervalli').querySelectorAll('.ultimo-intervallo')].pop();
  t('registrando, l\'ultimo intervallo compare in fondo', dopo.length === logs.length + 1
    && ultima.querySelector('.ultimo-intervallo-colpi').textContent === String(colpiPrima + 1)
    && $(app, 'btnVistaRegistro').textContent === `Registro · ${dopo.length}`);

  console.log('--- «Registro» ---');
  clic(app, $(app, 'btnVistaRegistro'));
  t('mostra il registro e nasconde contatore e ultimi', visibile(app, 'cardIntegratedRegister') && !visibile(app, 'cardCounterDashboard') && !visibile(app, 'cardUltimiIntervalli'));
  t('con tutte le righe', $(app, 'tblIntegratedLogsBody').querySelectorAll('.swipe-row-wrapper').length === dopo.length);
  const involucro = $(app, 'cardIntegratedRegister').querySelector('.logs-table-wrapper');
  const scorre = el => /auto|scroll/.test(app.w.getComputedStyle(el).overflowY) && app.w.getComputedStyle(el).maxHeight === '480px';
  t('di base il registro scorre in un riquadro di poche righe', scorre(involucro));
  const espandi = $(app, 'cardIntegratedRegister').querySelector('.btn-espandi-registro');
  t('sotto c\'è «Mostra tutte le righe»', visibile(app, 'cardIntegratedRegister') && espandi.textContent === 'Mostra tutte le righe');
  const modificatoIl = () => JSON.parse(app.salvato()).projects[pid].modificatoIl || null;
  app.E('saveState()');
  const modPrima = modificatoIl();
  clic(app, espandi);
  t('toccato, mostra tutte le righe senza riquadro', !scorre(involucro) && espandi.textContent === 'Mostra meno righe');
  t('la scelta resta salvata, e non è una modifica del progetto', JSON.parse(app.salvato()).settings.registroEspanso === true && modificatoIl() === modPrima);
  t('«Riconosci strati» si vede, non più nel ⋯', visibile(app, 'btnAutoStratiIntegrated') && !$(app, 'menuAltroRegistroIntegrated'));
  clic(app, $(app, 'btnToggleViewIntegrated'));
  await attesa(250); // il cambio di vista è animato (160 ms)
  t('anche la vista col grafico sta nella scheda Registro', visibile(app, 'cardLogsTable') && visibile(app, 'cardChart') && !visibile(app, 'cardCounterDashboard'));
  const tabella = $(app, 'cardLogsTable').querySelector('.logs-table-wrapper');
  const grafico = $(app, 'cardChart').querySelector('.chart-box');
  t('espansi anche tabella e grafico (stessa scelta)', !scorre(tabella) && app.w.getComputedStyle(grafico).maxHeight === 'none');
  clic(app, $(app, 'cardChart').querySelector('.btn-espandi-registro'));
  t('e compressi di nuovo, anche dal tasto sotto il grafico', scorre(tabella) && app.w.getComputedStyle(grafico).maxHeight === '480px' && scorre(involucro));
  t('«Riconosci strati» si vede anche qui', visibile(app, 'btnAutoStratiChart'));
  clic(app, $(app, 'btnToggleViewChart'));
  await attesa(250);
  clic(app, $(app, 'btnVistaConta'));
  console.log('--- «Intervalli»: l\'ordine dell\'elenco ---');
  const colpiElenco = () => [...$(app, 'listaUltimiIntervalli').querySelectorAll('.ultimo-intervallo-colpi')].map(e => e.textContent).join(',');
  const titoloOrdine = $(app, 'btnOrdineIntervalli');
  const inOrdine = colpiElenco();
  t('il titolo è «Intervalli», con la freccia verso il basso (profondità crescente)', titoloOrdine.textContent.trim() === 'Intervalli' && titoloOrdine.querySelector('.ico') && titoloOrdine.classList.contains('crescente'));
  const righeRegistro = () => [...$(app, 'tblIntegratedLogsBody').querySelectorAll('.swipe-content')].map(e => e.getAttribute('data-index')).join(',');
  const registroPrima = righeRegistro();
  clic(app, titoloOrdine);
  t('toccato, l\'elenco si inverte e la freccia si gira', colpiElenco() === inOrdine.split(',').reverse().join(',') && !titoloOrdine.classList.contains('crescente'));
  t('il Registro e il grafico non si invertono', righeRegistro() === registroPrima && app.E('state.logs.map(l => l.start)').every((v, i, a) => i === 0 || v >= a[i - 1]));
  t('la scelta resta salvata, e non è una modifica del progetto', JSON.parse(app.salvato()).settings.intervalliRecentiInCima === true && modificatoIl() === modPrima);
  clic(app, titoloOrdine);
  t('toccato di nuovo, torna com\'era', colpiElenco() === inOrdine && titoloOrdine.classList.contains('crescente'));
  t('«Conta» riporta al contatore', visibile(app, 'cardCounterDashboard') && !visibile(app, 'cardIntegratedRegister'));
  clic(app, $(app, 'btnVaiAlRegistro'));
  t('«Tutto il registro» porta al Registro', visibile(app, 'cardIntegratedRegister') && $(app, 'btnVistaRegistro').getAttribute('aria-selected') === 'true');

  console.log('--- Le righe del Registro ---');
  const tocco = (el, tipo, x, y) => { const e = new app.w.Event(tipo, { bubbles: true }); e.touches = [{ clientX: x, clientY: y }]; el.dispatchEvent(e); };
  const scorri = (el, dx, dy = 0) => { tocco(el, 'touchstart', 200, 100); tocco(el, 'touchmove', 200 + dx, 100 + dy); tocco(el, 'touchend', 200 + dx, 100 + dy); };
  const riga = i => $(app, 'tblIntegratedLogsBody').querySelectorAll('.swipe-row-wrapper')[i];
  const contenuto = i => riga(i).querySelector('.swipe-content');
  const nPrima = app.E('state.logs.length');
  scorri(contenuto(2), 150);
  t('scorrere a destra non elimina più niente', app.E('state.logs.length') === nPrima && !app.dialogo() && !riga(2).classList.contains('azioni-aperte'));
  scorri(contenuto(2), -40);
  t('un piccolo scorrimento a sinistra non apre le azioni', !riga(2).classList.contains('azioni-aperte'));
  scorri(contenuto(2), -150);
  t('scorrere a sinistra apre Modifica ed Elimina', riga(2).classList.contains('azioni-aperte')
    && [...riga(2).querySelectorAll('.riga-azioni button')].map(b => b.textContent).join('|') === 'Modifica|Elimina');
  scorri(contenuto(2), 5, 60);
  t('scorrendo in verticale resta aperta', riga(2).classList.contains('azioni-aperte'));
  scorri(contenuto(4), -150);
  t('aprendone un\'altra, la prima si chiude', riga(4).classList.contains('azioni-aperte') && !riga(2).classList.contains('azioni-aperte'));
  // Un tocco vero sul telefono: inizio e fine del tocco nello stesso punto, poi il click.
  scorri(contenuto(4), 0); clic(app, contenuto(4));
  t('un tocco sulla riga aperta la richiude, senza aprire la scheda', !riga(4).classList.contains('azioni-aperte') && !$(app, 'modalEditStep').classList.contains('open'));
  clic(app, contenuto(1));
  t('un tocco apre la scheda di quella riga', $(app, 'modalEditStep').classList.contains('open') && app.E('editingIndex') === 1);
  t('senza chiamare la tastiera', app.d.activeElement !== $(app, 'numModalColpi'));
  const c1 = app.E('state.logs[1].colpi');
  clic(app, $(app, 'btnModalColpiPiu')); clic(app, $(app, 'btnModalColpiPiu')); clic(app, $(app, 'btnModalColpiMeno'));
  t('− e + correggono i colpi nella scheda', $(app, 'numModalColpi').value === String(c1 + 1));
  app.E('closeModal()');
  t('chiudendo senza salvare non cambia niente', app.E('state.logs[1].colpi') === c1);
  clic(app, contenuto(nPrima - 1));
  t('la scheda dice come è stato registrato l\'intervallo', /^Registrato col contatore il \d{2}\/\d{2}\/\d{4} alle \d{2}:\d{2}$/.test($(app, 'lblModalOrigine').textContent));
  app.E('closeModal()');
  clic(app, contenuto(0));
  t('per gli intervalli vecchi, senza data, non inventa nulla', $(app, 'lblModalOrigine').textContent === '');
  app.E('closeModal()');
  scorri(contenuto(3), -150);
  clic(app, riga(3).querySelector('.riga-azione-modifica'));
  t('«Modifica» apre la scheda', $(app, 'modalEditStep').classList.contains('open') && app.E('editingIndex') === 3 && !riga(3).classList.contains('azioni-aperte'));
  app.E('closeModal()');
  const daEliminare = JSON.stringify(app.E('state.logs[3]'));
  scorri(contenuto(3), -150);
  clic(app, riga(3).querySelector('.riga-azione-elimina'));
  await attesa(30);
  t('«Elimina» non chiede niente: toglie proprio quell\'intervallo e offre Annulla',
    !app.dialogo() && app.E('state.logs.length') === nPrima - 1 && !app.E('state.logs').some(l => JSON.stringify(l) === daEliminare) && $(app, 'undoNotificationBanner').style.display === 'flex');
  clic(app, $(app, 'btnUndoDeleteProject'));
  await attesa(30);
  t('Annulla lo rimette al suo posto', JSON.stringify(app.E('state.logs[3]')) === daEliminare);

  console.log('--- Le spiegazioni dietro la «?» ---');
  t('niente più scritte fisse sui gesti (sotto −1, sotto Registra, sopra il Registro)',
    !/tieni premuto: annulla|Oppure tieni premuto|scorri a sinistra/.test($(app, 'cardCounterDashboard').textContent + $(app, 'cardIntegratedRegister').textContent + $(app, 'cardLogsTable').textContent));
  const aiuti = [$(app, 'directActionButtonsRow'), $(app, 'cardIntegratedRegister'), $(app, 'cardLogsTable')].map(r => r.querySelector('.btn-aiuto-prova'));
  t('una «?» sotto Registra e una in ciascun registro', aiuti.every(Boolean));
  for (const [k, b] of aiuti.entries()) {
    clic(app, b);
    await attesa(30);
    const d = app.dialogo();
    t(`la «?» ${k + 1} apre «Come si usa» con i gesti del contatore e del registro`, !!d && d.titolo === 'Come si usa'
      && /tenuto premuto registra/.test(d.testo) && /tenuto premuto annulla/.test(d.testo) && /Scorri una riga a sinistra/.test(d.testo));
    if (d) clic(app, d.ok);
    await attesa(30);
  }

  console.log('--- Progetto e ritorno ---');
  clic(app, $(app, 'btnHomeView'));
  await attesa(50);
  app.E('openProject(' + JSON.stringify(pid) + ')');
  await attesa(80);
  t('rientrando nella prova si riparte da «Conta»', visibile(app, 'cardCounterDashboard') && $(app, 'btnVistaConta').getAttribute('aria-selected') === 'true');

  console.log('--- Via lucchetto e barre doppie ---');
  t('niente lucchetto per comprimere il contatore', !$(app, 'btnCounterLockHandle'));
  t('niente barra compatta né barra fissa in alto', !$(app, 'counterCollapsedBar') && !$(app, 'stickyStatusBar'));
  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  app.chiudi();

  console.log('--- Controprove: l\'app di prima ---');
  const vecchia = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0() });
  await apriPrimaProva(vecchia);
  t('(controprova) non c\'erano le schede Conta | Registro', !vecchia.d.getElementById('btnVistaConta'));
  t('(controprova) c\'erano il lucchetto e la barra fissa', !!vecchia.d.getElementById('btnCounterLockHandle') && !!vecchia.d.getElementById('stickyStatusBar'));
  t('(controprova) contatore e registro stavano insieme', !nascosto(vecchia.w, vecchia.d.getElementById('cardCounterDashboard')) && !nascosto(vecchia.w, vecchia.d.getElementById('cardIntegratedRegister')));
  {
    const el = vecchia.d.getElementById('tblIntegratedLogsBody').querySelector('.swipe-content');
    const tocco = (tipo, x) => { const e = new vecchia.w.Event(tipo, { bubbles: true }); e.touches = [{ clientX: x, clientY: 100 }]; el.dispatchEvent(e); };
    tocco('touchstart', 200); tocco('touchmove', 350); tocco('touchend', 350);
    await attesa(30);
    t('(controprova) scorrere a destra chiedeva di eliminare', !!vecchia.dialogo() && /Eliminare/.test(vecchia.dialogo().testo));
  }
  vecchia.chiudi();

  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
