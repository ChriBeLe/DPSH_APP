// EXPORT CON CARATTERI SPECIALI (Revisione 2026-11, problema 22 / A7).
//
// Un cantiere «Rossi & Figli <srl> "Ø"» e due prove con lo stesso numero «1/A» non devono
// rompere i file consegnati: il KML resta XML valido col testo originale, il report mostra il
// testo letterale (non lo interpreta come tag), l'Excel ha fogli con nomi validi e distinti.
// SheetJS (XLSX) arriva da CDN e nei test non c'è: qui un finto XLSX applica le STESSE regole di
// SheetJS sui nomi dei fogli (caratteri vietati, 31 caratteri, doppioni senza maiuscole), così
// il test fallisce dove fallirebbe l'export vero.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

const NOME = 'Rossi & Figli <srl> "Ø"';
const progetto = {
  id: 'proj_1', name: NOME, comune: NOME, localita: NOME, committente: NOME, date: '2026-11-01',
  surveys: {
    s1: { id: 's1', header: { provaNr: '1/A', comune: NOME, localita: NOME, committente: NOME, lat: 45.1, lng: 9.2, alt: 100, date: '2026-11-01' }, logs: [{ start: 0, end: 0.2, colpi: 3 }], photos: [], instrument: {} },
    s2: { id: 's2', header: { provaNr: '1/A', comune: NOME, localita: NOME, committente: NOME, lat: 45.2, lng: 9.3, alt: 100, date: '2026-11-01' }, logs: [{ start: 0, end: 0.2, colpi: 4 }], photos: [], instrument: {} }
  }
};

(async () => {
  const fogliCreati = [];
  const app = await avviaApp({
    stato: null,
    primaDellApp(w) {
      w.XLSX = {
        utils: {
          book_new: () => ({ nomi: [] }),
          aoa_to_sheet: (a) => ({ a }),
          book_append_sheet: (wb, ws, nome) => {
            if (!nome || nome.length > 31 || /[\\/?*\[\]:]/.test(nome) || /^'|'$/.test(nome)) throw new Error('Nome foglio non valido: ' + nome);
            if (wb.nomi.some(n => n.toLowerCase() === nome.toLowerCase())) throw new Error('Nome foglio doppio: ' + nome);
            wb.nomi.push(nome);
          }
        },
        writeFile: (wb) => { fogliCreati.push(...wb.nomi); }
      };
    }
  });
  const E = (s) => app.E(s);
  E(`state.projects['proj_1'] = ${JSON.stringify(progetto)}; 0`);

  console.log('--- KML ---');
  await app.E(`exportProjectKML('proj_1', null)`);
  await new Promise(r => setTimeout(r, 200));
  const kml = await app.scaricati[app.scaricati.length - 1].blob.text();
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('');
  const doc = new dom.window.DOMParser().parseFromString(kml, 'application/xml');
  t('il KML è XML valido', !doc.getElementsByTagName('parsererror').length);
  const nomeDoc = doc.getElementsByTagName('name')[0].textContent;
  t('il nome del documento contiene il testo originale', nomeDoc.indexOf(NOME) >= 0);
  const descr = doc.getElementsByTagName('description');
  const html = new dom.window.DOMParser().parseFromString(descr[1].textContent, 'text/html');
  t('la descrizione mostra comune, località e committente letterali', (html.body.textContent.match(/Rossi & Figli <srl> "Ø"/g) || []).length >= 4);
  t('nella descrizione non nasce nessun tag <srl>', html.getElementsByTagName('srl').length === 0);

  console.log('--- KML prova singola ---');
  E(`state.header = Object.assign({}, state.header, ${JSON.stringify(progetto.surveys.s1.header)}); state.logs = ${JSON.stringify(progetto.surveys.s1.logs)}; state.photos = []; 0`);
  await app.E(`exportSingleSurveyKML()`);
  await new Promise(r => setTimeout(r, 200));
  const kml1 = await app.scaricati[app.scaricati.length - 1].blob.text();
  const doc1 = new dom.window.DOMParser().parseFromString(kml1, 'application/xml');
  t('il KML della prova singola è XML valido', !doc1.getElementsByTagName('parsererror').length);

  console.log('--- Report (Dati prova) ---');
  const box = E(`buildDatiBoxHtml(${JSON.stringify('1/A <b>')}, ${JSON.stringify(NOME)}, ${JSON.stringify(NOME)}, ${JSON.stringify(NOME)}, '2026-11-01', {}, 20, { faldaDa: NaN, faldaA: NaN }, [])`);
  const d = new dom.window.DOMParser().parseFromString('<body>' + box + '</body>', 'text/html');
  t('il report mostra il testo letterale', d.body.textContent.split(NOME).length - 1 === 3);
  t('nessun elemento <srl> o <b> nato dal testo utente', d.getElementsByTagName('srl').length === 0 && d.getElementsByTagName('b').length === 0);
  t('il titolo mostra il numero prova letterale', d.body.textContent.indexOf('1/A <b>') >= 0);
  const box2 = E(`buildDatiBoxHtml('1', ${JSON.stringify(NOME)}, ${JSON.stringify(NOME)}, ${JSON.stringify(NOME)}, '2026-11-01', {}, 20, { faldaDa: NaN, faldaA: NaN }, [], { disposizione: 'h3' })`);
  const d2 = new dom.window.DOMParser().parseFromString('<body>' + box2 + '</body>', 'text/html');
  t('anche impacchettato (h3) il testo è letterale', d2.body.textContent.split(NOME).length - 1 === 3 && d2.getElementsByTagName('srl').length === 0);

  console.log('--- Excel di progetto ---');
  let errore = null;
  try { await app.E(`exportProjectExcel('proj_1', null)`); } catch (e) { errore = e; }
  const dial = app.dialogo && app.dialogo();
  t('l export non lancia e non mostra errori', !errore && !(dial && /Errore/.test(dial.testo)));
  t('sono stati creati tre fogli (sintesi + due prove)', fogliCreati.length === 3);
  t('i nomi sono distinti senza distinguere maiuscole', new Set(fogliCreati.map(n => n.toLowerCase())).size === fogliCreati.length);
  t('i due fogli delle prove duplicate si chiamano «Prova 1-A» e «Prova 1-A (2)»', fogliCreati[1] === 'Prova 1-A' && fogliCreati[2] === 'Prova 1-A (2)');

  console.log('--- nomeFoglioExcelValido ---');
  const N = (nome, usati) => app.E(`(() => { const u = ${JSON.stringify(usati || [])}; return nomeFoglioExcelValido(${JSON.stringify(nome)}, u); })()`);
  t('un nome già valido resta identico', N('Prova 12') === 'Prova 12' && N('Sintesi Progetto') === 'Sintesi Progetto');
  t('i caratteri vietati diventano trattino', N('a\\b/c?d*e[f]g:h') === 'a-b-c-d-e-f-g-h');
  t('vuoto e solo apostrofi → «Foglio»', N('') === 'Foglio' && N("''") === 'Foglio' && N(null) === 'Foglio');
  t('niente apostrofo all inizio o alla fine', N("'Prova'") === 'Prova');
  t('non supera 31 caratteri', N('x'.repeat(50)).length === 31);
  t('il doppione prende (2), senza distinguere maiuscole', N('Prova 1', ['prova 1']) === 'Prova 1 (2)');
  t('il suffisso resta entro 31 caratteri', (() => { const b = 'y'.repeat(31); const r = N(b, [b]); return r.length <= 31 && r.endsWith(' (2)'); })());
  t('(3) se anche (2) è già preso', N('Prova 1', ['Prova 1', 'Prova 1 (2)']) === 'Prova 1 (3)');
  t('«Prova 1/A» e «Prova 1-A» non si scontrano', N('Prova 1/A', ['Prova 1-A']) === 'Prova 1-A (2)');

  app.chiudi();
  console.log(`\n${ok} ok, ${ko} KO`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
