// STILE DELL'INDICE SICURO (Revisione 2026-11).
//
// Un template indice arriva anche da un file (viaggia col progetto): colori, font e numeri
// finiscono in style="…" e non devono poter uscire dalla dichiarazione. I valori legittimi
// devono dare lo stesso CSS di prima (il predefinito è fissato qui sotto, parola per parola).
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

(async () => {
  const app = await avviaApp({ stato: null });
  const E = (s) => app.E(s);
  const XSS = '<img src=x onerror="window.__xss=1">';

  console.log('--- predefinito identico a prima ---');
  const atteso = "--idx-font:'Calibri', 'Carlito', system-ui, sans-serif; --idx-h1-pt:12.5px; --idx-h2-pt:11.5px; --idx-h3-pt:10.5px; --idx-h1-peso:700; --idx-h2-peso:400; --idx-h3-peso:400; --idx-numero-pt:11px; --idx-numero-peso:700; --idx-titolo-pt:20px; --idx-titolo-peso:800; --idx-pagina-pt:11px; --idx-pagina-peso:400; --idx-colore-testo:#1e293b; --idx-colore-divisore:#cbd5e1;";
  t('cssVariabiliStileIndice() di serie', E('cssVariabiliStileIndice()') === atteso);
  t('anche con il default passato esplicito', E('cssVariabiliStileIndice(stileIndiceDiDefault())') === atteso);
  t('Times New Roman (Classico) resta', E(`cssVariabiliStileIndice(state.indiceTemplates.idx_classico)`).startsWith("--idx-font:'Times New Roman', 'Tinos', Times, serif;"));
  t('un colore e un numero legittimi passano', /--idx-colore-testo:#ff0000;/.test(E(`cssVariabiliStileIndice({ coloreTesto: '#ff0000', titolo: { pt: 24, peso: 700 } })`)) && /--idx-titolo-pt:24px;/.test(E(`cssVariabiliStileIndice({ titolo: { pt: 24, peso: 700 } })`)));

  console.log('--- template ostile ---');
  const ostile = `({ font: 'Arial";} body{x', coloreTesto: 'red;background:url(x)', coloreDivisore: 'url(http://x)',
    titoloTesto: ${JSON.stringify(XSS)}, divisore: ${JSON.stringify(XSS)},
    titolo: { pt: '20px;background:url(x)', peso: 'bold;x:y' }, numero: { pt: 1e9, peso: -5 }, pagina: null,
    livelli: { h1: { pt: '12;}', peso: '700 !important' }, h2: 'x' } })`;
  const css = E(`cssVariabiliStileIndice(${ostile})`);
  t('niente url( nello stile', !/url\(/i.test(css));
  t('niente ; extra, graffe o virgolette doppie', !/[{}"]/.test(css) && !/background|important|body/i.test(css));
  t('colori ostili: ripiego di serie', /--idx-colore-testo:#1e293b; --idx-colore-divisore:#cbd5e1;$/.test(css));
  t('font ostile: ripiego di serie', css.startsWith("--idx-font:'Calibri', 'Carlito', system-ui, sans-serif;"));
  t('numeri ostili: ripiego di serie', /--idx-titolo-pt:20px; --idx-titolo-peso:800;/.test(css) && /--idx-numero-pt:11px; --idx-numero-peso:700;/.test(css) && /--idx-h1-pt:12.5px;/.test(css) && /--idx-pagina-pt:11px;/.test(css));

  console.log('--- rendering dell\'indice ---');
  const html = E(`buildIndiceReportCompletoHtml({ name: 'P' }, [{ id: 'p1', numero: 1, pagina: 1, livello: 1, etichetta: '1. Introduzione' }], Object.assign(stileIndiceDiDefault(), ${ostile}, { titoloTesto: 'Indice', divisore: 'punti', pagina: { pt: 11, peso: 400 }, livelli: stileIndiceDiDefault().livelli }))`);
  const doc = (() => { const d = new (require('jsdom').JSDOM)('<body>' + html + '</body>'); return d.window.document; })();
  const stili = [...doc.querySelectorAll('[style]')].map(e => e.getAttribute('style')).join('\n');
  t('lo style del foglio non ha url(', !/url\(/i.test(stili) && !/background:\s*url/i.test(stili));
  t('nessun attributo on* e nessun img', doc.querySelectorAll('img, [onerror]').length === 0);
  t('window.__xss indefinito', E('typeof window.__xss') === 'undefined');
  // (le strutture annidate rotte, es. pagina: null, fanno ancora eccezione in 069: fuori perimetro.)
  // etichette, titoloTesto e divisore sono scritti da 069 (fuori dal perimetro): non coperti qui.

  console.log('--- stile del testo (stesso canale) ---');
  const stTesto = E('cssVariabiliStileTesto()');
  t('predefinito del testo con pila Calibri e numeri di serie', /--tpl-font:'Calibri'/.test(stTesto) && /--tpl-allineamento:justify;/.test(stTesto) && /--tpl-corpo-pt:11pt;/.test(stTesto) && /--tpl-peso-titoli:700;/.test(stTesto));
  const ostTesto = E(`cssVariabiliStileTesto({ font: 'x;y', allineamento: 'left;background:url(x)', corpoPt: '11pt;}', interlinea: 'a', rientroMm: 'url(x)' })`);
  t('stile testo ostile: niente url( e ripieghi di serie', !/url\(|background/i.test(ostTesto) && /--tpl-allineamento:justify;/.test(ostTesto) && /--tpl-corpo-pt:11pt;/.test(ostTesto));

  t('nessun errore all avvio', app.errori.length === 0);
  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO eccezione: ' + (e && e.stack || e)); process.exit(1); });
