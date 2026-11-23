// LEGGI FOGLIO DI CAMPO: lettura della risposta JSON, controlli, tabella offline, inserimento nella prova.
// Il fetch è finto: nessuna rete.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const FOTO = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wAALCAABAAEBAREA/8QAFAABAAAAAAAAAAAAAAAAAAAAA//EABQQAQAAAAAAAAAAAAAAAAAAAAD/2gAIAQEAAD8AKp//2Q==';
(async () => {
  const app = await avviaApp({});
  await attesa(50);
  const w = app.w, d = app.d, E = app.E;
  const J = o => JSON.stringify(o);

  // --- lettura della risposta ---
  const buona = J({ prova: '3', righe: [
    { da: 0, a: 0.2, colpi: 3, nota: '', box: [0.1, 0.1, 0.8, 0.05] },
    { da: 0.2, a: 0.4, colpi: '5', nota: 'falda' },
    { da: 0.4, a: 0.6, colpi: 4 }] });
  let r = E(`ocrParseRisposta(${J(buona)})`);
  t('JSON buono: 3 righe e numero prova', r.righe.length === 3 && r.provaNr === '3');
  t('colpi scritti come testo diventano numeri', r.righe[1].colpi === 5 && r.righe[1].nota === 'falda');
  t('il box valido resta, assente = null', r.righe[0].box.length === 4 && r.righe[1].box === null);
  r = E(`ocrParseRisposta(${J('```json\n' + buona + '\n```')})`);
  t('blocco ```json tollerato', r.righe && r.righe.length === 3);
  r = E(`ocrParseRisposta(${J('Ecco: ' + buona + ' fine')})`);
  t('testo attorno al JSON tollerato', r.righe && r.righe.length === 3);
  t('testo senza JSON → errore', !!E(`ocrParseRisposta('non so')`).errore);
  t('righe vuote → errore', !!E(`ocrParseRisposta('{"righe":[]}')`).errore);
  r = E(`ocrParseRisposta(${J(J({ righe: [{ da: 0, a: 20, colpi: 3 }, { da: 20, a: 40, colpi: 4 }] }))})`);
  t('profondità in cm convertite in metri', r.righe[1].a === 0.4 && r.avvisi.length === 1);
  r = E(`ocrParseRisposta(${J(J({ righe: [{ da: '0,2', a: '0,4', colpi: '7' }] }))})`);
  t('virgola decimale accettata', r.righe[0].da === 0.2 && r.righe[0].colpi === 7);

  // --- controlli ---
  const val = righe => E(`(() => { const r = ${J(righe)}; r.forEach(x => x.letta = true); const n = ocrValida(r, 20); return { n, d: r.map(x => x.dubbi) }; })()`);
  let v = val([{ da: 0, a: 0.2, colpi: 3 }, { da: 0.2, a: 0.4, colpi: 5 }, { da: 0.4, a: 0.6, colpi: 6 }]);
  t('foglio coerente: nessuna cella gialla', v.n === 0);
  v = val([{ da: 0, a: 0.2, colpi: 3 }, { da: 0.2, a: 0.4, colpi: null }]);
  t('colpi illeggibili: gialla', v.d[1].colpi === true && v.d[0].colpi === false);
  v = val([{ da: 0, a: 0.2, colpi: 3 }, { da: 0.4, a: 0.6, colpi: 4 }]);
  t('salto di profondità: «da» gialla', v.d[1].da === true);
  v = val([{ da: 0, a: 0.2, colpi: 3 }, { da: 0.2, a: 0.5, colpi: 4 }]);
  t('passo diverso da 20 cm: «a» gialla', v.d[1].a === true);
  v = val([{ da: 0.4, a: 0.2, colpi: 3 }]);
  t('profondità che torna indietro: gialla', v.d[0].a === true);
  v = val([{ da: 0, a: 0.2, colpi: 2.5 }, { da: 0.2, a: 0.4, colpi: 250 }, { da: 0.4, a: 0.6, colpi: 3, incerto: true }]);
  t('colpi non interi, enormi o incerti: gialli', v.d[0].colpi && v.d[1].colpi && v.d[2].colpi);

  // --- offline: tabella già riempita col passo ---
  const pre = E(`ocrPrecompila(10, 4, 0)`);
  t('precompilata: passo 10 cm, colpi vuoti', pre.length === 4 && pre[1].da === 0.1 && pre[3].a === 0.4 && pre.every(x => x.colpi === null));
  t('righe vuote non sono gialle', E(`(() => { const r = ocrPrecompila(20, 5); return ocrValida(r, 20); })()`) === 0);

  // --- progetto e prova ---
  E(`openNewSurveyModal()`); await attesa(50);
  const pid = E('state.currentProjectId'), sid = E('state.currentSurveyId');
  t('c\'è un progetto con una prova', !!pid && !!sid);
  E(`state.logs = []`);

  // offline: nessun provider → bottone Leggi nascosto, nota, tabella pronta
  let sch = E(`apriLeggiFoglio(${J(FOTO)})`);
  t('schermata aperta con foto e 25 righe', !!d.getElementById('ocrSchermata') && d.querySelectorAll('#ocrCorpoTab tr').length === 25);
  t('senza provider: Leggi nascosto e nota che spiega', d.getElementById('ocrLeggi').style.display === 'none' && /Nessun assistente IA/.test(d.getElementById('ocrNota').textContent));
  const riga = i => d.querySelectorAll('#ocrCorpoTab tr')[i].querySelectorAll('input');
  riga(0)[2].value = '4'; riga(0)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  riga(0)[2].dispatchEvent(new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }));
  t('Invio porta alla riga dopo, stessa colonna', d.activeElement === riga(1)[2]);
  riga(1)[2].value = '6'; riga(1)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  riga(2)[2].value = '5'; riga(2)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  riga(2)[3].value = 'falda'; riga(2)[3].dispatchEvent(new w.Event('input', { bubbles: true }));
  d.getElementById('ocrDest').value = ''; // nuova prova
  const nProveAvanti = E('Object.keys(state.projects[state.currentProjectId].surveys).length');
  d.getElementById('ocrInserisci').click();
  await attesa(300);
  t('inserita in una nuova prova', E('Object.keys(state.projects[state.currentProjectId].surveys).length') === nProveAvanti + 1);
  t('3 intervalli con profondità e colpi', E('state.logs.length') === 3 && E('state.logs.map(l=>l.colpi).join()') === '4,6,5' && E('state.logs[2].end') === 0.6);
  t('nota e tracciabilità', E('state.logs[2].note') === 'falda' && E('state.logs[0].origine') === 'import');
  t('prossimo intervallo parte dalla fine', E('state.currentDepthStart') === 0.6);
  t('foto attaccata alla prova', E('state.photos.some(p=>p.nota==="Foglio di campo")'));
  t('schermata chiusa', !d.getElementById('ocrSchermata'));
  const nuovaSid = E('state.currentSurveyId');
  await attesa(50);
  t('annulla: l\'inserimento si annulla in un passo', E('puoAnnullare()') && (E('annullaAzione()'), E('state.logs.length') === 0));
  E('ripetiAzione()');
  t('ripeti: gli intervalli tornano', E('state.logs.length') === 3);

  // --- lettura IA con fetch finto (Gemini) ---
  E(`aiConf('gemini').chiave='k2'; aiConf('gemini').modello='g'; aiConf('gemini').configurato=true; aiConf('groq').chiave='k1'; aiConf('groq').modello='m'; aiConf('groq').configurato=true; aiCfg.ordine=['groq','gemini','openai','anthropic','openrouter','ollama']`);
  const chiamate = [];
  w.fetch = async (url, opz) => {
    chiamate.push({ url, corpo: JSON.parse(opz.body) });
    if (url.includes('groq')) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) };
    const testo = J({ prova: '2', righe: [{ da: 0, a: 0.2, colpi: 3, box: [0.1, 0.1, 0.5, 0.05] }, { da: 0.2, a: 0.4, colpi: null, incerto: true }, { da: 0.4, a: 0.6, colpi: 8 }] });
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: testo }] } }] }) };
  };
  sch = E(`apriLeggiFoglio(${J(FOTO)})`);
  t('con provider: Leggi visibile e nulla inviato prima del clic', d.getElementById('ocrLeggi').style.display !== 'none' && chiamate.length === 0);
  d.getElementById('ocrLeggi').click();
  await attesa(300);
  t('Groq fallito → provato Gemini, con foto compressa nel corpo', chiamate.length === 2 && chiamate[1].url.includes('generativelanguage') && !!chiamate[1].corpo.contents[0].parts[1].inlineData.data);
  t('tabella riempita con le righe lette', d.querySelectorAll('#ocrCorpoTab tr').length === 3 && riga(2)[2].value === '8');
  t('cella illeggibile in giallo, le altre no', riga(1)[2].classList.contains('dubbio') && !riga(0)[2].classList.contains('dubbio'));
  t('numero prova letto', d.getElementById('ocrProvaNr').value === '2');
  riga(1)[2].value = '5'; riga(1)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  t('correggendo la cella il giallo sparisce', !riga(1)[2].classList.contains('dubbio'));
  riga(0)[0].dispatchEvent(new w.Event('focus'));
  t('toccando una riga si evidenzia il box', d.getElementById('ocrBox').style.display === 'block');

  // inserimento in prova esistente con dati: aggiungi in fondo / sostituisci / annulla (dialogo finto)
  d.getElementById('ocrDest').value = nuovaSid;
  const scegli = async (risposta) => { E(`appDialog = async () => ${J(risposta)}`); };
  await scegli(false);
  d.getElementById('ocrInserisci').click(); await attesa(200);
  t('annulla: nulla cambia e la schermata resta', E('state.logs.length') === 3 && !!d.getElementById('ocrSchermata'));
  await scegli('extra');
  d.getElementById('ocrInserisci').click(); await attesa(300);
  t('aggiungi in fondo: righe già coperte saltate', E('state.logs.length') === 3);
  t('aggiunta: i vecchi colpi restano', E('state.logs.slice(0,3).map(l=>l.colpi).join()') === '4,6,5');

  sch = E(`apriLeggiFoglio(${J(FOTO)})`);
  riga(0)[2].value = '9'; riga(0)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  riga(1)[2].value = '2'; riga(1)[2].dispatchEvent(new w.Event('input', { bubbles: true }));
  d.getElementById('ocrDest').value = nuovaSid;
  await scegli(true);
  d.getElementById('ocrInserisci').click(); await attesa(300);
  t('sostituisci: restano solo i nuovi', E('state.logs.map(l=>l.colpi).join()') === '9,2');
  t('sostituisci: copia di sicurezza chiesta (copiaOChiedi) senza errori', !d.getElementById('ocrSchermata'));
  t('i totali si ricalcolano (conteggio intervalli)', E('state.logs.length') === 2);

  // modalità aggiungi con profondità oltre l'esistente
  sch = E(`apriLeggiFoglio(${J(FOTO)})`);
  const r2 = d.querySelectorAll('#ocrCorpoTab tr');
  [['0.4', '0.6', '7'], ['0.6', '0.8', '3']].forEach(([a, b, c], i) => { const inp = riga(i + 2); inp[0].value = a; inp[1].value = b; inp[2].value = c; inp[2].dispatchEvent(new w.Event('input', { bubbles: true })); inp[0].dispatchEvent(new w.Event('input', { bubbles: true })); inp[1].dispatchEvent(new w.Event('input', { bubbles: true })); });
  d.getElementById('ocrDest').value = nuovaSid;
  await scegli('extra');
  d.getElementById('ocrInserisci').click(); await attesa(300);
  t('aggiungi in fondo: 2 nuovi dopo i 2 esistenti', E('state.logs.map(l=>l.colpi).join()') === '9,2,7,3' && E('state.currentDepthStart') === 0.8);

  // salvataggio nella prova memorizzata
  t('la prova salvata ha gli intervalli', E(`state.projects[state.currentProjectId].surveys[state.currentSurveyId].logs.length`) === 4);

  console.log(`\n${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO  eccezione: ' + (e.stack || e)); process.exit(1); });
