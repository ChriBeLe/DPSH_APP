// GRAFICO DELLA PROVA E COPIE DI SICUREZZA RIMASTE (revisione 2026-11, O1 sezione 1 e B4, ultimi pezzi).
//  - il grafico SVG della prova (020) mostra nomi, id e colori degli strati come testo/colori ammessi:
//    niente onerror/onmouseover nel DOM, window.__xss indefinito;
//  - eliminare un intervallo e azzerare la falda aspettano la copia di sicurezza e, se non riesce,
//    chiedono all'utente: rifiutando, i dati restano.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
const { creaIndexedDB } = require('./dati/idb_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const DATI = path.join(__dirname, 'dati');
const STATO_V0 = fs.readFileSync(path.join(DATI, 'stato_v0.json'), 'utf8');
const IDB_V0 = JSON.parse(fs.readFileSync(path.join(DATI, 'idb_v0.json'), 'utf8'));
const telefono = () => creaIndexedDB({ DPSH_PhotoStorageDB: IDB_V0.DPSH_PhotoStorageDB });
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const IMG = '<img src=x onerror="window.__xss=1">';
const ID_MAL = 'x"><img src=x onerror="window.__xss=1">';
const COLORE_MAL = '#fff" onmouseover="window.__xss=1" x="';
const SEL = '[onerror],[onmouseover],[onload]';
const pericolosi = (app, ...ids) => ids.length ? ids.reduce((n, id) => n + app.d.querySelectorAll(SEL.split(',').map(x => '#' + id + ' ' + x).join(',')).length, 0) : app.d.querySelectorAll(SEL).length;

(async () => {
  console.log('--- Grafico della prova con strato malevolo (iniettato direttamente nello stato) ---');
  {
    const app = await avviaApp({ stato: null });
    const E = app.E;
    E(`(() => {
      const nome = ${JSON.stringify(IMG)};
      state.strati = [{ id: ${JSON.stringify(ID_MAL)}, name: nome, color: ${JSON.stringify(COLORE_MAL)}, pattern: 'none', behavior: 'granulare' }];
      state.logs = [
        { start: 0, end: 0.2, colpi: 5, asta: 1, lithology: ${JSON.stringify(ID_MAL)}, note: ${JSON.stringify(IMG)} },
        { start: 0.2, end: 0.4, colpi: 7, asta: 1 }
      ];
      state.header.faldaDa = '0.3';
    })()`);
    E('renderChart()');
    E('updateUI()');
    const svg = app.d.getElementById('svgChart');
    t('il grafico ha disegnato le barre', svg.querySelectorAll('.chart-bar-group').length === 2);
    t('il nome dello strato nel title è testo', [...svg.querySelectorAll('title')].some(x => x.textContent.indexOf('Litologia: ' + IMG) >= 0));
    t('grafico: nessun gestore in linea', pericolosi(app, 'svgChart', 'chartLegendContainer') === 0);
    t('tabella e legenda rapida: nessun gestore in linea', pericolosi(app, 'tblBody', 'tblLogsBody') === 0 && pericolosi(app) === 0);
    t('nessun <img> creato dal nome o dalla nota', svg.querySelectorAll('img').length === 0 && app.d.querySelectorAll('#tblBody img').length === 0);
    t('window.__xss indefinito', app.w.__xss === undefined);
    app.chiudi();
  }

  console.log('--- Elimina intervallo: copia che fallisce ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefono() });
    const E = app.E;
    const pid = E('Object.keys(state.projects)[0]');
    E(`openProject(${JSON.stringify(pid)})`);
    await attesa(100);
    E(`state.logs = [{ start: 0, end: 0.2, colpi: 5, asta: 1 }, { start: 0.2, end: 0.4, colpi: 7, asta: 1 }]; state.header.faldaDa = '0.3'; state.header.faldaA = '0.3'; saveState()`);
    app.idb._guasto = { scritture: true };
    const el = E('deleteLogStep(0)');
    await attesa(400);
    const d = app.dialogo();
    t('chiede se procedere senza copia', !!d && /Non sono riuscito a fare la copia di sicurezza prima di eliminare un intervallo/.test(d.testo));
    t('(finché non risponde, l intervallo c è ancora)', E('state.logs.length') === 2);
    clic(app, d && d.annulla);
    await el;
    await attesa(200);
    t('rifiutando, l intervallo resta', E('state.logs.length') === 2 && E('state.logs[0].colpi') === 5);

    const el2 = E('deleteLogStep(0)');
    await attesa(400);
    const d2 = app.dialogo();
    clic(app, d2 && d2.ok);
    await el2;
    await attesa(200);
    t('accettando, l intervallo viene eliminato', E('state.logs.length') === 1);

    // Doppio tocco mentre la conferma è aperta: un solo intervallo eliminato.
    E(`state.logs = [{ start: 0, end: 0.2, colpi: 5, asta: 1 }, { start: 0.2, end: 0.4, colpi: 7, asta: 1 }, { start: 0.4, end: 0.6, colpi: 9, asta: 1 }]; saveState()`);
    const p1 = E('deleteLogStep(0)'); const p2 = E('deleteLogStep(0)');
    await attesa(400);
    clic(app, app.dialogo() && app.dialogo().ok);
    await Promise.all([p1, p2]);
    await attesa(200);
    t('due eliminazioni ravvicinate: un solo intervallo eliminato', E('state.logs.length') === 2 && E('state.logs[0].colpi') === 7);

    console.log('--- Azzera falda: copia che fallisce ---');
    const bottone = app.d.getElementById('btnQuickFaldaReset');
    t('(il bottone c è)', !!bottone);
    const fallito = async (risposte) => {
      clic(app, bottone);
      for (const r of risposte) {
        await attesa(400);
        const dd = app.dialogo();
        if (!dd) break;
        clic(app, r === 'ok' ? dd.ok : dd.annulla);
      }
      await attesa(300);
    };
    await fallito(['ok', 'annulla']);
    t('rifiutando la copia mancante, la falda resta', E('state.header.faldaDa') === '0.3' && E('state.header.faldaA') === '0.3');
    await fallito(['ok', 'ok']);
    t('accettando, la falda viene azzerata', E('state.header.faldaDa') === '' && E('state.header.faldaA') === '');
    app.chiudi();
  }
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
