// L'ORDINE DELLE PROVE NEL REPORT. Prima il report (e il suo indice) prendeva le prove
// nell'ordine in cui erano state create: rinumerandole, la schermata le mostrava in ordine
// crescente ma il documento no. Ora un ordine solo (proveInOrdine) vale per report, indice,
// elenco di esportazione, schermata del progetto e barra delle prove: di base per numero, oppure
// quello scelto a mano con «Ordina» nella schermata del progetto («Ordine crescente» lo toglie).
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const $ = (app, id) => app.d.getElementById(id);

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) clic(app, app.dialogo().ok);
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  const P = `state.projects[${JSON.stringify(pid)}]`;
  // Sei prove create in un ordine e poi rinumerate (la prima creata diventa la 12).
  app.E(`(() => { const S = ${P}.surveys, base = Object.values(S)[0]; ['copia1', 'copia2'].forEach(id => { S[id] = JSON.parse(JSON.stringify(base)); S[id].id = id; }); })()`);
  const create = app.E(`Object.keys(${P}.surveys)`);
  const numeri = ['12', '2', '1', '3B', '3', '10'];
  app.E(`(() => { const nn = ${JSON.stringify(numeri)}; Object.values(${P}.surveys).forEach((s, i) => { s.header.provaNr = nn[i] || String(20 + i); if (nn[i] === '3B') s.header.interpretazioneDi = null; }); })()`);
  const attesi = app.E(`Object.values(${P}.surveys).map(s => s.header.provaNr)`).slice().sort((a, b) => a.localeCompare(b, 'it', { numeric: true }));
  const nr = (lista) => lista.map(s => s.header.provaNr);
  t(`di base per numero, non per data di creazione: ${nr(app.E(`proveInOrdine(${P})`)).join(' ')}`, JSON.stringify(nr(app.E(`proveInOrdine(${P})`))) === JSON.stringify(attesi));
  t('(3 prima di 3B prima di 10: numeri veri, non testo)', attesi.indexOf('3') < attesi.indexOf('3B') && attesi.indexOf('3B') < attesi.indexOf('10'));

  const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');
  t('il report (e quindi il suo indice) prende le prove in quest\'ordine', /let survList = proveInOrdine\(proj\);/.test(src) && !/let survList = Object\.values\(proj\.surveys/.test(src));

  app.E(`openProject(${JSON.stringify(pid)}); switchView('project')`);
  await attesa(50);
  const righe = () => [...$(app, 'listaProveProgetto').querySelectorAll('[data-surv]')].map(r => r.querySelector('.prova-riga-n').textContent);
  t('la schermata del progetto nello stesso ordine', JSON.stringify(righe()) === JSON.stringify(attesi));
  app.E(`popolaListaProveEsportazionePdf(${P})`);
  const elencoExport = () => [...$(app, 'esportaPdfListaProve').querySelectorAll('.chk-esporta-pdf-prova')].map(c => app.E(`${P}.surveys[${JSON.stringify(c.dataset.id)}].header.provaNr`));
  t('e l\'elenco della finestra di esportazione', JSON.stringify(elencoExport()) === JSON.stringify(attesi));

  // «Ordina»: frecce, «Per numero».
  const btn = $(app, 'btnProgettoOrdina');
  t('«Ordina» c\'è sopra l\'elenco', !!btn && !btn.hidden && btn.textContent === 'Ordina');
  clic(app, btn);
  t('acceso: le righe hanno le frecce e non aprono la prova', $(app, 'listaProveProgetto').querySelectorAll('[data-sposta]').length === attesi.length * 2 && !$(app, 'barraOrdinaProve').hidden && btn.textContent === 'Fatto');
  t('(la prima non sale, l\'ultima non scende)', $(app, 'listaProveProgetto').querySelector('[data-sposta="-1"]').disabled && [...$(app, 'listaProveProgetto').querySelectorAll('[data-sposta="1"]')].pop().disabled);
  // L'ultima in cima: su, su, su...
  for (let k = 0; k < attesi.length - 1; k++) {
    const ultimaSu = [...$(app, 'listaProveProgetto').querySelectorAll('[data-surv]')].find(r => r.querySelector('.prova-riga-n').textContent === attesi[attesi.length - 1]).querySelector('[data-sposta="-1"]');
    clic(app, ultimaSu);
  }
  const aMano = [attesi[attesi.length - 1]].concat(attesi.slice(0, -1));
  t(`spostata in cima con le frecce: ${righe().join(' ')}`, JSON.stringify(righe()) === JSON.stringify(aMano));
  t('l\'ordine resta nel progetto (salvato) e lo seguono report ed esportazione', JSON.stringify(nr(app.E(`proveInOrdine(${P})`))) === JSON.stringify(aMano)
    && Array.isArray(JSON.parse(app.salvato()).projects[pid].ordineProve) && (app.E(`popolaListaProveEsportazionePdf(${P})`), JSON.stringify(elencoExport()) === JSON.stringify(aMano)));
  t('lo dice anche il conteggio', /ordine scelto a mano/.test($(app, 'lblProgettoConteggio').textContent));

  // La maniglia: la riga in fondo trascinata in cima (jsdom non impagina: le righe fingono 40 px l'una).
  clic(app, $(app, 'btnOrdinePerNumero'));
  const lista = $(app, 'listaProveProgetto');
  [...lista.children].forEach((r, i) => { r.getBoundingClientRect = () => ({ top: i * 40, bottom: i * 40 + 40, height: 40, left: 0, right: 300, width: 300 }); });
  const ultima = lista.lastElementChild, maniglia = ultima.querySelector('.prova-maniglia');
  t('ogni riga ha la maniglia per trascinarla', lista.querySelectorAll('.prova-maniglia').length === attesi.length);
  const ev = (tipo, y) => new app.w.MouseEvent(tipo, { bubbles: true, clientY: y });
  maniglia.dispatchEvent(ev('pointerdown', attesi.length * 40 - 20));
  maniglia.dispatchEvent(ev('pointermove', 100));
  maniglia.dispatchEvent(ev('pointermove', 5));
  maniglia.dispatchEvent(ev('pointerup', 5));
  t(`trascinata dalla maniglia in cima: ${righe().join(' ')}`, JSON.stringify(righe()) === JSON.stringify(aMano) && Array.isArray(app.E(`${P}.ordineProve`)));

  clic(app, $(app, 'btnOrdinePerNumero'));
  t('«Ordine crescente» le rimette per numero', JSON.stringify(righe()) === JSON.stringify(attesi) && !app.E(`${P}.ordineProve`) && $(app, 'btnOrdinePerNumero').disabled);
  clic(app, btn);
  t('«Fatto» richiude: le righe tornano ad aprire la prova', $(app, 'listaProveProgetto').querySelectorAll('[data-sposta]').length === 0 && $(app, 'listaProveProgetto').querySelectorAll('button.prova-riga').length === attesi.length);
  t('(una prova creata dopo, senza posto scelto, va al suo numero)', (() => {
    app.E(`${P}.ordineProve = ${JSON.stringify(create.slice().reverse())}`);
    const ordine = nr(app.E(`proveInOrdine(${P})`));
    app.E(`delete ${P}.ordineProve`);
    return ordine.length === attesi.length;
  })());

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
