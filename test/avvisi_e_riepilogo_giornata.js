// AVVISI SUI DATI E RIEPILOGO DELLA GIORNATA (072c). Regole solo dal foglio .ods e dal motore.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({ stato: '{"projects":{}}' });
  const E = app.E;
  const oggi = E('giornoLocaleDi(new Date())');
  const iso = new Date().toISOString();
  const log = (s, e, c, extra) => Object.assign({ start: s, end: e, colpi: c, asta: Math.floor((e - 0.0001) / 1) + 1, note: '', registratoIl: iso, origine: 'contatore' }, extra);
  const buona = { id: 'S1', header: { provaNr: '1', localita: 'Nardò', faldaDa: '2.4', faldaA: '3.0', date: '2026-01-01' },
    instrument: { pesoMassa: 63.5, pesoAsta: 6.3, lunghAsta: 1, pesoSistema: 8, volata: 0.75, passo: 0.2, areaPunta: 20 }, settings: { stepCm: 20 },
    logs: [log(0, 0.2, 5), log(0.2, 0.4, 7), log(0.4, 0.6, 9)], photos: [] };
  const clone = (o) => JSON.parse(JSON.stringify(o));
  app.w.__s = { buona };
  const av = (surv) => E('avvisiDatiProva(' + JSON.stringify(surv) + ')').map(a => a.tipo);
  t('prova in regola: nessun avviso', av(buona).length === 0);
  let s = clone(buona); s.logs[1].end = 0.6; s.logs[2].start = 0.6; s.logs[2].end = 0.8;
  t('intervallo lungo come il doppio del passo: avviso', av(s).includes('passo-intervallo'));
  s = clone(buona); s.logs[0].asta = 3;
  t('asta sbagliata: avviso', av(s).includes('asta'));
  s = clone(buona); s.instrument.pesoMassa = -5;
  t('strumento non valido: avviso', av(s).includes('strumento'));
  s = clone(buona); s.instrument.passo = 0.1;
  t('passo strumento diverso: avviso', av(s).includes('passo-strumento'));
  s = clone(buona); s.instrument.betaTForzato = 2;
  t('βt imposto diverso: avviso', av(s).includes('betat'));
  s = clone(buona); s.header.faldaDa = '5'; s.header.faldaA = '3';
  t('falda al contrario: avviso', av(s).includes('falda'));
  s = clone(buona); s.header.faldaDa = 'abc';
  t('falda non numerica: avviso', av(s).includes('falda'));
  s = clone(buona); s.header.faldaDa = ''; s.header.faldaA = '';
  t('falda assente: nessun avviso', av(s).length === 0);
  s = clone(buona); s.logs[0].colpi = 500;
  t('nessuna soglia sui colpi (scelta di Romeo)', av(s).length === 0);

  // riepilogo
  const stato = { projects: { P1: { id: 'P1', name: 'Cantiere', surveys: { S1: clone(buona), S2: Object.assign(clone(buona), { id: 'S2', header: { provaNr: '2', date: '2020-01-01' }, logs: [log(0, 0.2, 4, { registratoIl: '2020-01-01T10:00:00' })] }), S3: Object.assign(clone(buona), { id: 'S3', header: { provaNr: '3', interpretazioneDi: 'S1' } }) } } } };
  const r = E('riepilogoGiornata(' + JSON.stringify(stato) + ', "' + oggi + '")');
  t('oggi: una prova (la copia di interpretazione non conta)', r.totali.prove === 1 && r.prove[0].survId === 'S1');
  t('totali: 3 intervalli, 21 colpi, 0,60 m', r.totali.intervalli === 3 && r.totali.colpi === 21 && Math.abs(r.totali.metri - 0.6) < 1e-9);
  t('giorni con dati: oggi e il 2020', r.giorniConDati.includes(oggi) && r.giorniConDati.includes('2020-01-01'));
  const r0 = E('riepilogoGiornata(' + JSON.stringify(stato) + ', "2020-01-01")');
  t('un altro giorno: la prova di quel giorno', r0.prove.length === 1 && r0.prove[0].survId === 'S2');
  t('testo del riepilogo', /1 prova, 3 intervalli/.test(E('testoRiepilogoGiornata(riepilogoGiornata(' + JSON.stringify(stato) + ', "' + oggi + '"))')));
  t('niente registrato: lo dice', /niente registrato/.test(E('testoRiepilogoGiornata(riepilogoGiornata({projects:{}}, "2021-05-05"))')));

  // assistente e comandi
  const c = E('comandiPc().map(x => x[1])');
  t('comando «Riepilogo della giornata» nell\'elenco', c.includes('Riepilogo della giornata'));
  t('strumenti per l\'assistente', E('AI_STRUMENTI.some(x => x.n === "avvisi_dati") && AI_STRUMENTI.some(x => x.n === "riepilogo_giornata")'));
  t('bottone nella Home', !!app.d.getElementById('btnRiepilogoGiornata'));
  t('nessun errore', app.errori.length === 0);
  if (app.errori.length) console.log(app.errori.join('\n'));
  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
