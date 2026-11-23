// ESAGERAZIONE VERTICALE DELLE TAVOLE 3D: cursore e numero vanno insieme, fino a 100, e il valore arriva alle opzioni.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({}); await attesa(50);
  const $ = id => app.d.getElementById(id);
  const cur = $('tavole3dEsagCursore'), num = $('tavole3dEsag');
  t('esistono cursore e numero, fino a 100', cur && num && cur.max === '100' && num.max === '100');
  cur.value = '40'; cur.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('il cursore aggiorna il numero', num.value === '40');
  num.value = '75'; num.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('il numero aggiorna il cursore', cur.value === '75');
  num.value = '500'; num.dispatchEvent(new app.w.Event('input', { bubbles: true }));
  t('oltre il massimo si ferma a 100', num.value === '100');
  console.log(`\n${ok} ok, ${ko} KO`); process.exit(ko ? 1 : 0);
})();
