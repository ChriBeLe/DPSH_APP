// ASSISTENTE IA: interruttore, bolla, provider (fallimento → passaggio al successivo),
// strumenti di lettura e di modifica con conferma. Il fetch è finto: nessuna rete.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({});
  await attesa(50);
  const w = app.w, d = app.d, $ = id => d.getElementById(id);
  const clic = el => el.dispatchEvent(new w.MouseEvent('click', { bubbles: true }));
  t('bolla nascosta di serie', !$('aiBolla').classList.contains('attiva'));
  const chk = $('chkAssistenteIa'); chk.checked = true; chk.dispatchEvent(new w.Event('change', { bubbles: true }));
  t('acceso: bolla visibile', $('aiBolla').classList.contains('attiva'));
  t('si apre la procedura guidata', $('aiWizOverlay').classList.contains('aperto') && $('aiWizOverlay').textContent.includes('Google Gemini'));
  // configuro due provider a mano (la chiave finta resta solo nel localStorage di jsdom)
  app.E(`aiConf('groq').chiave='k1'; aiConf('groq').modello='m'; aiConf('groq').configurato=true; aiConf('gemini').chiave='k2'; aiConf('gemini').modello='g'; aiConf('gemini').configurato=true; aiCfg.ordine=['groq','gemini','openai','anthropic','openrouter','ollama']; aiSalva()`);
  t('stato non contiene chiavi', !app.E('JSON.stringify(state)').includes('k1'));
  const chiamate = [];
  w.fetch = async (url, opz) => {
    chiamate.push(url);
    const corpo = JSON.parse(opz.body);
    if (url.includes('groq')) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) };
    const ultimo = corpo.contents[corpo.contents.length - 1];
    const eRisultato = ultimo.parts[0].functionResponse;
    if (!eRisultato) {
      const prima = corpo.contents.length === 1;
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [prima ? { functionCall: { name: 'elenco_progetti', args: {} } } : { functionCall: { name: 'crea_progetto', args: { comune: 'Bari' } } }] } }] }) };
    }
    if (eRisultato.name === 'elenco_progetti') return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ functionCall: { name: 'crea_progetto', args: { comune: 'Bari' } } }] } }] }) };
    return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Fatto.' }] } }] }) };
  };
  clic($('aiBolla'));
  $('aiPannello').querySelector('textarea').value = 'Crea un progetto a Bari';
  clic($('aiPannello').querySelector('.ai-piedi button'));
  await attesa(300);
  if (!chiamate.length) console.log('PANNELLO:', $('aiPannello').textContent);
  t('Groq fallito → provato Gemini', chiamate[0].includes('groq') && chiamate[1].includes('generativelanguage'));
  const conf = $('aiPannello').querySelector('.ai-conferma');
  t('la creazione chiede conferma', !!conf && !app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  clic(conf.querySelector('.si'));
  await attesa(300);
  t('dopo la conferma il progetto esiste', app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  t('risposta finale mostrata', $('aiPannello').textContent.includes('Fatto.'));
  // aggiunta intervalli (con conferma) e lettura
  const r = await app.E(`(async()=>{const s=AI_STRUMENTI.find(x=>x.n==='aggiungi_intervalli');return s.run({colpi:[3,4,5]})})()`);
  t('aggiungi_intervalli scrive 3 intervalli', r.aggiunti === 3 && app.E('state.logs.length') === 3);
  t('leggi_prova legge i colpi', app.E(`AI_STRUMENTI.find(x=>x.n==='leggi_prova').run({}).colpiPerIntervallo.length`) === 3);
  t('imposta_falda', (app.E(`AI_STRUMENTI.find(x=>x.n==='imposta_falda').run({da:'2.5',a:'3'}); state.header.faldaDa`)) === '2.5');
  t('nessuno strumento elimina', !app.E('AI_STRUMENTI.map(s=>s.n)').some(n => /elimin|cancell|delete/i.test(n)));
  // elenco modelli scaricato dal provider
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => url.includes('generativelanguage')
    ? { models: [{ name: 'models/gemini-x-flash', displayName: 'Gemini X Flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-1', supportedGenerationMethods: ['embedContent'] }] }
    : { data: [{ id: 'gpt-9-mini' }, { id: 'text-embedding-3' }, { id: 'whisper-1' }] } });
  const mg = await app.E(`aiElencoModelli('gemini',{chiave:'x'})`);
  t('Gemini: solo modelli di chat', mg.length === 1 && mg[0].id === 'gemini-x-flash');
  const mo = await app.E(`aiElencoModelli('openai',{chiave:'x'})`);
  t('OpenAI: niente embedding/whisper', mo.length === 1 && mo[0].id === 'gpt-9-mini');
  console.log(`\n${ok} ok, ${ko} KO`); console.log(app.errori ? app.errori.slice(0,5) : '');
  process.exit(ko ? 1 : 0);
})();
