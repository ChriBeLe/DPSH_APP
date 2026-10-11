// LE TABELLE LUNGHE RISPETTANO LA LARGHEZZA DEL BLOCCO. Segnalato: nel Word (e già nel PDF) l'Allegato
// formule e la Tabella dettagliata uscivano a tutta pagina, con celle lunghissime, mentre nel template
// il blocco era più stretto e centrato. Le tabelle lunghe si spezzano in «atomi» (071), che nascevano
// dal contenuto nudo: la larghezza e l'allineamento del blocco si perdevano. Ora ogni atomo sta nel
// riquadro del blocco (styleDimensioneVoce, come la riga normale) e si misura a quella larghezza.
// (jsdom non impagina: la resa si è controllata nel browser, PDF e .docx; qui le regole.)
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const src = n => fs.readFileSync(path.join(__dirname, '..', 'src', 'js', n), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(30);
  t('un blocco che si allarga sullo spazio vuoto occupa tutta la riga', app.E(`larghezzaPctBlocco({ type: 'allegato-formule', colSpan: 3 }, 4)`) === 100);
  t('con la sua Larghezza (3 colonne su 4) ne occupa il 75%', app.E(`larghezzaPctBlocco({ type: 'allegato-formule', colSpan: 3, espandiSuSpazioVuoto: false }, 4)`) === 75);
  t('mai più del 100%', app.E(`larghezzaPctBlocco({ type: 'tabella-dettagliata-parametri', colSpan: 8, espandiSuSpazioVuoto: false }, 4)`) === 100);
  const m = src('071_motore-unificato-di-impaginazione.js');
  t('ogni atomo della tabella sta nel riquadro del blocco (larghezza e allineamento come nell\'editor)',
    /const riquadro = html => larghezzaPct < 99\.99 \? `<div style="display:flex;"><div style="\$\{styleDimensioneVoce\(bloccoFlowable, spanBlocco, cols\)\} min-width:0;">/.test(m) && /atomi\.push\(\{ html: riquadro\(/.test(m));
  t('e si misura a quella larghezza (più stretta: più a capo, righe più alte)', /misuraFigliPerStampaMm\(contenuto, mrg, rigaScaleBlocco, fontScaleBlocco, undefined, larghezzaPct\)/.test(m)
    && /padding:0 \$\{\(mrg\.right \+ \(210 - mrg\.left - mrg\.right\) \* \(1 - Math\.min\(100, larghezzaPct \|\| 100\) \/ 100\)\)/.test(src('070_impaginazione-reale-di-riepilogo-dettagliata-all.js')));
  t('anche gli avvisi di traboccamento dell\'editor misurano alla larghezza del blocco', /larghezzaPctBlocco\(blk, /.test(src('037_fase-c-avvisi-di-overflow-reali.js')));
  t('l\'app non ha dato errori', app.errori.length === 0);
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
