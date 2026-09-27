// SALVATAGGIO VERIFICATO (Fase 1, punto 6).
//
// Dopo localStorage.setItem si rilegge e si confronta la lunghezza, come salvaFotoConGaranzia fa
// per le foto. Qui la memoria del browser viene resa «bugiarda»: setItem non lancia errori ma
// tiene solo metà del testo. L'app deve accorgersene e dirlo, una volta, e tornare zitta appena
// un salvataggio va a buon fine. La controprova mostra che l'app di prima taceva.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));

// Una memoria che, quando si vuole, tiene solo metà di quello che le si scrive, senza lamentarsi.
function memoriaBugiarda(w) {
  const vero = w.Storage.prototype.setItem;
  w.__tronca = false;
  w.Storage.prototype.setItem = function (k, v) {
    if (w.__tronca && k === 'dpsh_app_state') return vero.call(this, k, String(v).slice(0, Math.floor(String(v).length / 2)));
    return vero.call(this, k, v);
  };
}

(async () => {
  console.log('--- Un salvataggio che non si rilegge uguale viene segnalato ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0(), primaDellApp: memoriaBugiarda });
    await attesa(200);
    t('all avvio tutto normale', !app.dialogo());
    app.w.__tronca = true;
    app.E('state.header.localita = "cambiata"; saveState();');
    await attesa(50);
    const dlg = app.dialogo();
    t('compare l avviso di salvataggio non riuscito', !!dlg && /Non è stato possibile salvare i dati/.test(dlg.testo));
    t('con il motivo: non si rilegge uguale', !!dlg && /non si rilegge uguale/.test(dlg.testo));
    clic(app, dlg && dlg.ok);
    await attesa(50);
    app.E('saveState(); saveState();');
    await attesa(50);
    t('una volta sola, non a ogni tocco', !app.dialogo());
    app.w.__tronca = false;
    app.E('saveState();');
    app.w.__tronca = true;
    app.E('saveState();');
    await attesa(50);
    t('dopo un salvataggio riuscito, un nuovo guasto si segnala di nuovo', !!app.dialogo());
    app.chiudi();
  }

  console.log('--- Un salvataggio buono non disturba ---');
  {
    const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
    await attesa(200);
    for (let i = 0; i < 5; i++) app.E('saveState()');
    t('nessun avviso', !app.dialogo());
    t('e quello che c è in memoria è quello che si voleva salvare', JSON.parse(app.salvato()).versioneSchema === app.E('VERSIONE_SCHEMA_DATI'));
    app.chiudi();
  }

  console.log('--- CONTROPROVA: l app di prima non se ne accorgeva ---');
  {
    const app = await avviaApp({ file: RIFERIMENTO, stato: STATO_V0, idb: telefonoV0(), primaDellApp: memoriaBugiarda });
    await attesa(200);
    app.w.__tronca = true;
    app.E('state.header.localita = "cambiata"; saveState();');
    await attesa(50);
    let letto = true; try { JSON.parse(app.salvato()); } catch (e) { letto = false; }
    t('(controprova) il testo salvato era rovinato', !letto);
    t('(controprova) e nessuno lo diceva', !app.dialogo());
    app.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
