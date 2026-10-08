// L'ANTEPRIMA È LA FOTOGRAFIA DEL DOCUMENTO. L'editor del template disegnava i blocchi con lo
// stile dell'app (carattere Manrope, 10,5 px, interlinea normale) e con un riquadro che toglieva
// 15 px di larghezza a ogni blocco; la stampa (PDF e Word) col carattere del documento, 10 px,
// interlinea 1,35, e i blocchi a tutta larghezza. Righe che andavano a capo in un posto e non
// nell'altro, tabelle più lunghe: un'anteprima che non diceva com'era il documento.
// Ora le regole del contenuto (tabelle, celle, box dati, carattere, interlinea) sono scritte UNA
// volta (cssRegoleFoglio) e usate da entrambi; il riquadro del blocco non occupa spazio.
// (Le misure vere, nel browser, sono state confrontate con Chromium: stesse altezze e larghezze
// entro 1 px; qui jsdom non impagina, si controlla che le regole siano davvero le stesse.)
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const css = fs.readFileSync(path.join(__dirname, '..', 'src', 'css', '01_app.css'), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  await attesa(30);
  const stampa = app.E('getReportPrintStyleBlock()');
  const regole = app.E(`cssRegoleFoglio('')`);
  const anteprima = app.d.getElementById('stileContenutoTesto').textContent;
  const senzaAmbito = (s) => s.replace(/:where\(#templateEditorCanvas\) /g, '').replace(/\s+/g, ' ').trim();

  t('il foglio di stampa usa le regole comuni (tabelle, celle, box dati)', stampa.replace(/\s+/g, ' ').includes(regole.replace(/\s+/g, ' ').trim()));
  t('e l\'anteprima dell\'editor le stesse, parola per parola', senzaAmbito(anteprima).includes(regole.replace(/\s+/g, ' ').trim()));
  t('(con :where, che non aggiunge peso: vincono le stesse regole che vincono in stampa)', /:where\(#templateEditorCanvas\) table \{/.test(anteprima) && !/[^(]#templateEditorCanvas table/.test(anteprima));
  t('nei blocchi dell\'anteprima il carattere e l\'interlinea del documento', /:where\(#templateEditorCanvas\) :is\(\.tpl-editor-block-inner, \.tpl-editor-stack-item\) \{ font-family: var\(--tpl-font, Arial, sans-serif\); color: #1e293b; line-height: 1\.35; \}/.test(anteprima)
    && /body \{\s*font-family: 'Segoe UI', Arial, sans-serif;\s*color: #1e293b;\s*line-height: 1\.35;/.test(stampa));
  t('il riquadro del blocco non toglie spazio: contorno e niente margine interno', /\.tpl-editor-block \{[^}]*border: none; outline: 1\.5px solid/.test(css) && /\.tpl-editor-block-body \{ padding: 0;/.test(css));
  t('lo spazio fra le righe del template è lo stesso: 12 px', /const margineRiga = distribuisciSpazio \? '0' : '12px';/.test(fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8'))
    && (fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8').match(/const margineRiga = distribuisciSpazio \? '0' : '(\d+)px'/g) || []).every(r => /12px/.test(r)));

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
