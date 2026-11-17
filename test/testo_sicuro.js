// TESTO SICURO E DATI IN INGRESSO (Revisione 2026-11, Fase A).
//
// Le funzioni condivise di 002a: escape del testo per HTML e XML, forma degli id che arrivano da
// un file, colori e immagini ammessi dentro style e src. Si provano dentro l'app vera (accesa in
// jsdom), così il test vede le stesse funzioni che usa l'app.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

(async () => {
  const app = await avviaApp({ stato: null });
  const E = (s) => app.E(s);

  console.log('--- testoHtml ---');
  t('i cinque caratteri pericolosi', E(`testoHtml('<a href="x" onclick=\\'y\\'>&</a>')`) === '&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;&amp;&lt;/a&gt;');
  t('null e undefined diventano vuoti', E('testoHtml(null)') === '' && E('testoHtml(undefined)') === '');
  t('i numeri restano numeri scritti', E('testoHtml(2.5)') === '2.5');
  t('dentro innerHTML resta testo, niente elemento', E(`(() => { const d = document.createElement('div'); d.innerHTML = '<span title="' + testoHtml('x" onmouseover="y') + '">' + testoHtml('<img src=x onerror=y>') + '</span>'; return d.querySelectorAll('img').length === 0 && !d.firstChild.hasAttribute('onmouseover') && d.textContent === '<img src=x onerror=y>'; })()`) === true);

  console.log('--- testoXml ---');
  t('«Rossi & Figli <srl>» è XML valido', E(`testoXml('Rossi & Figli <srl>')`) === 'Rossi &amp; Figli &lt;srl&gt;');
  t('i caratteri di controllo spariscono', E(`testoXml('a\\u0001b\\u000Bc')`) === 'abc');
  t('a capo e tab restano', E(`testoXml('a\\nb\\tc')`) === 'a\nb\tc');

  console.log('--- idSicuro ---');
  t('gli id dell app passano', E(`idSicuro('proj_1731000000000') && idSicuro(1731000000000) && idSicuro('foto_abc-1')`) === true);
  t('virgolette e tag no', E(`idSicuro('x"><img src=x onerror=1>')`) === false);
  t('__proto__ e constructor no', E(`idSicuro('__proto__') || idSicuro('constructor')`) === false);
  t('vuoto, spazi, oggetti no', E(`idSicuro('') || idSicuro('a b') || idSicuro({}) || idSicuro(null)`) === false);
  t('troppo lungo no', E(`idSicuro('a'.repeat(81))`) === false);
  t('idSicuroOppureNuovo tiene quello buono', E(`idSicuroOppureNuovo('proj_1', 'proj')`) === 'proj_1');
  t('e rinomina quello cattivo, con un id buono', E(`(() => { const n = idSicuroOppureNuovo('<x>', 'proj'); return /^proj_/.test(n) && idSicuro(n); })()`) === true);

  console.log('--- coloreSicuro ---');
  t('#hex, rgb() e nomi passano', E(`[coloreSicuro('#a1b2c3'), coloreSicuro('#fff'), coloreSicuro('rgb(1, 2, 3)'), coloreSicuro('rgba(1,2,3,0.5)'), coloreSicuro('teal')].join('|')`) === '#a1b2c3|#fff|rgb(1, 2, 3)|rgba(1,2,3,0.5)|teal');
  t('un colore che esce dall attributo diventa il ripiego', E(`coloreSicuro('#fff" onmouseover="x', '#888')`) === '#888');
  t('url() e ; no', E(`coloreSicuro('url(http://x)', 'z') + coloreSicuro('red;background:url(x)', 'z')`) === 'zz');

  console.log('--- immagini ---');
  t('prefissi ammessi', E(`prefissoImmagineSicuro('data:image/jpeg;base64') && prefissoImmagineSicuro('data:image/png;base64')`) === true);
  t('prefisso che esce da src no', E(`prefissoImmagineSicuro('x" onerror="alert(1)" a="')`) === false);
  t('data:text/html no', E(`prefissoImmagineSicuro('data:text/html;base64')`) === false);
  t('dataUrl buono', E(`dataUrlImmagineSicuro('data:image/png;base64,iVBORw0KGgo=')`) === true);
  t('dataUrl con virgolette nel corpo no', E(`dataUrlImmagineSicuro('data:image/png;base64,AAA" onerror="x')`) === false);

  console.log('--- numeroSicuro ---');
  t('numero nel campo', E(`numeroSicuro('11', 10, 4, 72)`) === 11);
  t('testo che esce da style diventa il ripiego', E(`numeroSicuro('11pt;background:url(x)', 10, 4, 72)`) === 10);

  t('nessun errore all avvio', app.errori.length === 0);
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO eccezione: ' + (e && e.stack || e)); process.exit(1); });
