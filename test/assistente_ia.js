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
  const ch = chiamate.filter(u => /chat\/completions|:generateContent/.test(u));
  t('Groq fallito → provato Gemini', ch[0].includes('groq') && ch[1].includes('generativelanguage'));
  const conf = $('aiPannello').querySelector('.ai-conferma');
  t('la creazione chiede conferma', !!conf && !app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  clic(conf.querySelector('.si'));
  await attesa(300);
  t('dopo la conferma il progetto esiste', app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  t('risposta finale mostrata', $('aiPannello').textContent.includes('Fatto.'));
  const arch = JSON.parse(app.E('localStorage.getItem("DPSH_AI_CRONO_V1")'));
  const pidBari = app.E('state.currentProjectId');
  t('cronologia salvata per progetto, senza chiavi', arch[pidBari] && arch[pidBari][0].titolo.includes('Bari') && !JSON.stringify(arch).includes('k1'));
  // aggiunta intervalli (con conferma) e lettura
  const r = await app.E(`(async()=>{const s=AI_STRUMENTI.find(x=>x.n==='aggiungi_intervalli');return s.run({colpi:[3,4,5]})})()`);
  t('aggiungi_intervalli scrive 3 intervalli', r.aggiunti === 3 && app.E('state.logs.length') === 3);
  t('leggi_prova legge i colpi', app.E(`AI_STRUMENTI.find(x=>x.n==='leggi_prova').run({}).colpiPerIntervallo.length`) === 3);
  t('imposta_falda', (app.E(`AI_STRUMENTI.find(x=>x.n==='imposta_falda').run({da:'2.5',a:'3'}); state.header.faldaDa`)) === '2.5');
  t('si eliminano solo intervalli e strati, mai prove o progetti', JSON.stringify(app.E('AI_STRUMENTI.map(s=>s.n)').filter(n => /elimin|cancell|delete/i.test(n)).sort()) === '["elimina_intervalli","elimina_strato"]');
  // elenco modelli scaricato dal provider
  w.fetch = async (url) => ({ ok: true, status: 200, json: async () => url.includes('generativelanguage')
    ? { models: [{ name: 'models/gemini-x-flash', displayName: 'Gemini X Flash', supportedGenerationMethods: ['generateContent'] }, { name: 'models/text-embedding-1', supportedGenerationMethods: ['embedContent'] }] }
    : { data: [{ id: 'gpt-9-mini' }, { id: 'text-embedding-3' }, { id: 'whisper-1' }] } });
  const mg = await app.E(`aiElencoModelli('gemini',{chiave:'x'})`);
  t('Gemini: solo modelli di chat', mg.length === 1 && mg[0].id === 'gemini-x-flash');
  const mo = await app.E(`aiElencoModelli('openai',{chiave:'x'})`);
  t('OpenAI: niente embedding/whisper', mo.length === 1 && mo[0].id === 'gpt-9-mini');
  // strati e parametri avanzati sulla prova del progetto di prova (dati realistici)
  const st0 = require('fs').readFileSync(require('path').join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
  const app2 = await avviaApp({ stato: st0, idb: require('./dati/app_in_jsdom').telefonoV0() });
  await attesa(60);
  app2.E('openProject(Object.keys(state.projects)[0])'); await attesa(100);
  const T = (n, a) => app2.E(`AI_STRUMENTI.find(x=>x.n===${JSON.stringify(n)}).run(${JSON.stringify(a || {})})`);
  const strati = T('leggi_strati');
  t('leggi_strati elenca gli strati', Array.isArray(strati) && strati.length >= 1 && strati[0].id);
  const conCat = strati.find(x => x.parametri && Object.keys(x.parametri).length);
  if (conCat) {
    const cat = Object.keys(conCat.parametri)[0], idx = conCat.parametri[cat].candidati[0][0];
    T('scegli_parametro_avanzato', { strato_id: conCat.id, categoria: cat, indice: idx });
    t('scegli_parametro_avanzato scrive la scelta', app2.E(`state.strati.find(s=>s.id===${JSON.stringify(conCat.id)}).parametriAvanzati[${JSON.stringify(cat)}].autoreIndex`) === idx);
  } else t('(nessuno strato con categorie nella fixture)', true);
  T('modifica_strato', { strato_id: strati[0].id, nome: 'Sabbia test', colore: '#112233', comportamento: 'coesivo' });
  t('modifica_strato', app2.E('state.strati[0].name') === 'Sabbia test' && app2.E('state.strati[0].behavior') === 'coesivo');
  T('aggiungi_strato', { nome: 'Nuovo' }); T('sposta_strato', { strato_id: app2.E('state.strati[state.strati.length-1].id'), posizione: 1 });
  t('aggiungi + sposta strato', app2.E('state.strati[0].name') === 'Nuovo');
  const n0 = app2.E('state.logs.length'); if (n0) { T('modifica_intervallo', { numero: 1, colpi: 7, note: 'x' }); t('modifica_intervallo', app2.E('state.logs[0].colpi') === 7); }
  T('modifica_strumento', { campo: 'pesoMassa', valore: 64 }); t('modifica_strumento', app2.E('state.instrument.pesoMassa') === 64);
  T('imposta_preferenza', { nome: 'vibrazione', valore: 'false' }); t('imposta_preferenza', app2.E('state.settings.haptic') === false);
  T('aggiungi_nota_progetto', { testo: 'prova <b>' }); t('nota aggiunta, testo protetto', app2.E('state.projects[state.currentProjectId].notes.html').includes('&lt;b&gt;'));
  t('modifica_progetto + GPS', (T('modifica_progetto', { campo: 'committente', valore: 'ACME' }), T('imposta_gps', { lat: 40.1, lng: 18.0 }), app2.E('state.header.lat') === 40.1));
  // eliminazione con doppia conferma
  const nPrima = app2.E('state.logs.length');
  const pr = app2.E(`aiEseguiStrumento({n:'elimina_intervalli',a:{da_numero:1,a_numero:1}})`);
  await attesa(30);
  const pan = app2.d.getElementById('aiPannello');
  pan.querySelector('.ai-conferma .si').click(); await attesa(30);
  t('prima conferma: non ancora eliminato', app2.E('state.logs.length') === nPrima);
  const rosso = pan.querySelectorAll('.ai-conferma .si'); rosso[rosso.length - 1].click();
  await pr;
  t('dopo la seconda conferma elimina un intervallo', app2.E('state.logs.length') === nPrima - 1);
  // guidare la schermata: aprire Impostazioni, leggere i controlli, premere/compilare
  app2.E('openDrawer()'); await attesa(100);
  const sch = T('leggi_schermata');
  console.log(JSON.stringify(sch).slice(0,300));
  t('leggi_schermata vede la finestra aperta e i controlli', sch.controlli.length > 5 && /Impostazioni/.test(sch.finestra || ''));
  const vib = sch.controlli.find(c => /Vibrazione/i.test(c.etichetta) && c.tipo === 'checkbox');
  if (vib) { const prima = vib.attivo; T('compila_campo', { id: vib.id, valore: String(!prima) }); t('compila_campo cambia l\'interruttore', app2.E('document.getElementById("chkHaptic").checked') === !prima); }
  const pul = sch.controlli.find(c => /Elimina|Cancella|Azzera|Reset/i.test(c.etichetta) && c.tipo === 'pulsante');
  if (pul) { let errore = ''; try { T('clicca', { id: pul.id }); } catch (e) { errore = String(e.message || e); } t('clicca rifiuta i pulsanti che eliminano', /elimina|azzera/i.test(errore)); }
  console.log(`\n${ok} ok, ${ko} KO`); console.log(app.errori ? app.errori.slice(0,5) : '');
  process.exit(ko ? 1 : 0);
})();
