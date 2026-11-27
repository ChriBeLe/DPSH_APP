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
    if (url.includes('groq')) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota, try again in 90s' } }) };
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
  clic($('aiPannello').querySelector('.ai-piedi .ai-invia'));
  await attesa(300);
  if (!chiamate.length) console.log('PANNELLO:', $('aiPannello').textContent);
  const ch = chiamate.filter(u => /chat\/completions|:(stream)?[gG]enerateContent/.test(u));
  t('Groq fallito → provato Gemini', ch[0].includes('groq') && ch[1].includes('generativelanguage'));
  // risposta a flusso (SSE) in pezzi spezzati a metà: testo che cresce e chiamata di strumento ricomposta
  const sse = ['data: {"choices":[{"delta":{"content":"Cia"}}]}\n\nda', 'ta: {"choices":[{"delta":{"content":"o","tool_calls":[{"index":0,"id":"c1","function":{"name":"elenco_progetti","arguments":"{\\"a"}}]}}]}\n\ndata: {"choices":[{"delta":{"tool_calls":[{"index":0,"function":{"arguments":"\\":1}"}}]}}]}\n\ndata: [DONE]\n\n'];
  const fl = await app.E(`(async () => { const pezzi = ${JSON.stringify(sse)}; let i = 0, visto = [];
    const risp = { body: { getReader: () => ({ read: async () => i < pezzi.length ? { done: false, value: new TextEncoder().encode(pezzi[i++]) } : { done: true } }) } };
    const r = await aiLeggiFlusso(risp, AI_FLUSSI.openai(), x => visto.push(x), () => {});
    return JSON.stringify({ r, visto }); })()`);
  const fo = JSON.parse(fl);
  t('flusso: testo a pezzi ricomposto', fo.r.t === 'Ciao' && fo.visto[0] === 'Cia');
  t('flusso: chiamata strumento ricomposta', fo.r.calls.length === 1 && fo.r.calls[0].n === 'elenco_progetti' && fo.r.calls[0].a.a === 1);
  // allegati: immagine e testo arrivano ai tre formati; salvata la chat restano solo i nomi
  const al = JSON.parse(app.E(`(() => { const cr = [{ r: 'u', t: 'ciao', all: [{ tipo: 'img', mime: 'image/jpeg', b64: 'QUJD', nome: 'f.jpg' }, { tipo: 'txt', nome: 'n.txt', contenuto: 'RIGA1' }] }];
    const o = AI_ADATTATORI.openai(aiDef('groq'), aiConf('groq'), cr).corpo.messages[1].content, a = AI_ADATTATORI.anthropic(aiDef('anthropic'), aiConf('anthropic'), cr).corpo.messages[0].content, g = AI_ADATTATORI.gemini(aiDef('gemini'), aiConf('gemini'), cr).corpo.contents[0].parts;
    return JSON.stringify({ o, a, g, salva: JSON.stringify(cr, (k, v) => (k === 'b64' || k === 'contenuto') ? undefined : v) }); })()`));
  t('allegati: openai ha testo e immagine', al.o[0].text.includes('RIGA1') && al.o[1].image_url.url.endsWith('QUJD'));
  t('allegati: anthropic e gemini', al.a[0].type === 'image' && al.g[1].inlineData.data === 'QUJD');
  t('allegati: salvando restano solo i nomi', !al.salva.includes('QUJD') && al.salva.includes('f.jpg'));
  const po = JSON.parse(app.E(`(() => { const g = 'x'.repeat(9000), cr = []; for (let i = 0; i < 30; i++) cr.push({ r: 'u', t: 'd' + i }, { r: 'a', t: '', calls: [{ id: 'a' + i, n: 'leggi_schermata', a: {} }] }, { r: 't', res: [{ id: 'a' + i, n: 'leggi_schermata', c: g }] });
    const p = aiPotaCrono(cr); const ts = p.filter(m => m.r === 't'); return JSON.stringify({ n: p.length, orig: cr.length, ultima: ts[ts.length - 1].res[0].c.length, vecchia: ts[0].res[0].c.length, intatto: cr[2].res[0].c.length, inizio: p[0].r }); })()`));
  t('potatura: cronologia corta e risultati accorciati', po.n <= 42 && po.inizio === 'u' && po.ultima < 6100 && po.vecchia < 600 && po.intatto === 9000);
  t('openrouter in vista nella procedura guidata', app.E("aiWizElenco(), document.getElementById('aiWizOverlay').querySelector('.ai-wiz').textContent.includes('OpenRouter') && !document.querySelector('#aiWizOverlay details.ai-altri').textContent.includes('OpenRouter')") === true);
  const ge = JSON.parse(app.E(`(() => { const cr = [{ r: 'u', t: 'x' }, { r: 'a', t: '', calls: [{ id: 'g1', n: 'elenco_progetti', a: {}, ts: 'SIG' }, { id: 'g2', n: 'stato_app', a: {} }] }, { r: 't', res: [{ id: 'g1', n: 'elenco_progetti', c: '[]' }, { id: 'g2', n: 'stato_app', c: '{}' }] }];
    const c = aiConf('gemini'), v = c.modello; c.modello = 'gemini-3-flash'; const parti = AI_ADATTATORI.gemini(aiDef('gemini'), c, cr).corpo.contents[1].parts; c.modello = v;
    const lett = AI_ADATTATORI.gemini(aiDef('gemini'), c, cr).leggi({ candidates: [{ content: { parts: [{ functionCall: { name: 'a', args: {} }, thoughtSignature: 'ZZ' }] } }] });
    return JSON.stringify({ p0: parti[0].thoughtSignature, p1: parti[1].thoughtSignature, ts: lett.calls[0].ts }); })()`));
  t('gemini 3: thoughtSignature letta e rimandata', ge.p0 === 'SIG' && ge.p1 === 'skip_thought_signature_validator' && ge.ts === 'ZZ');
  const sg = JSON.parse(app.E(`JSON.stringify({ a: aiStrumentiPer([{ r: 'u', t: 'cambia il colore del tema' }]).map(x => x.n), b: aiStrumentiPer([{ r: 'u', t: 'ok fallo' }]).length, tot: AI_STRUMENTI.length, c: aiStrumentiPer([{ r: 'u', t: 'cambia gli strati' }]).map(x => x.n) })`));
  t('strumenti: invio ridotto se il tema è chiaro, tutti se non lo è', sg.a.length < sg.tot && sg.a.includes('imposta_preferenza') && !sg.a.includes('elimina_strato') && sg.b === sg.tot && sg.c.includes('modifica_strato') && sg.c.includes('leggi_schermata'));
  const conf = $('aiPannello').querySelector('.ai-conferma');
  t('la creazione chiede conferma', !!conf && !app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  clic(conf.querySelector('.si'));
  await attesa(300);
  t('dopo la conferma il progetto esiste', app.E('Object.values(state.projects).some(p=>p.comune==="Bari")'));
  t('risposta finale mostrata', $('aiPannello').textContent.includes('Fatto.'));
  const mod = [...$('aiPannello').querySelectorAll('.ai-msg.utente .ai-az button')].find(b => b.textContent.includes('Modifica'));
  const nUtPrima = $('aiPannello').querySelectorAll('.ai-msg.utente').length;
  if (mod) clic(mod);
  t('modifica: il testo torna nel campo e la chat si accorcia', !!mod && $('aiPannello').querySelector('textarea').value !== '' && $('aiPannello').querySelectorAll('.ai-msg.utente').length < nUtPrima);
  // l'assistente che spiega invece di agire viene rimandato a usare gli strumenti
  { let n = 0, vistoSpinta = false;
    w.fetch = async (url, opz) => {
      if (url.includes('groq')) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota, try again in 90s' } }) };
      const corpo = JSON.parse(opz.body); n++;
      const ult = corpo.contents[corpo.contents.length - 1].parts[0];
      if (ult.text && /fallo tu/i.test(ult.text)) vistoSpinta = true;
      const r = n === 1 ? { text: 'Premi il menu e poi clicca su Impostazioni.' } : ult.functionResponse ? { text: 'Fatto, ho elencato i progetti.' } : { functionCall: { name: 'elenco_progetti', args: {} } };
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [r] } }] }) };
    };
    $('aiPannello').querySelector('textarea').value = 'Mostrami i progetti';
    clic($('aiPannello').querySelector('.ai-piedi .ai-invia')); await attesa(400);
    t('se spiega invece di agire, viene spinto a usare gli strumenti', vistoSpinta && $('aiPannello').textContent.includes('Fatto, ho elencato'));
  }
  // bolla trascinabile: la posizione si salva e un trascinamento non apre il pannello
  { const b = $('aiBolla'), PE = (tipo, x, y) => new w.MouseEvent(tipo, { bubbles: true, clientX: x, clientY: y });
    const apertoPrima = $('aiPannello').classList.contains('aperto');
    b.dispatchEvent(PE('pointerdown', 10, 10)); w.dispatchEvent(PE('pointermove', 60, 80)); w.dispatchEvent(PE('pointerup', 60, 80)); clic(b);
    t('trascinare la bolla non apre/chiude il pannello', $('aiPannello').classList.contains('aperto') === apertoPrima);
    t('la posizione della bolla è salvata', !!JSON.parse(app.E('localStorage.getItem("DPSH_AI_POS_V1")')).bolla && b.style.left !== '');
  }
  // bolla magnetica: calcolo del bordo e posizione salvata
  { const S = o => app.E(`aiSnap(${JSON.stringify(o)})`);
    const base = { w: 52, h: 52, vw: 400, vh: 800, inset: { t: 50, b: 30, l: 0, r: 0 } };
    const a = S({ ...base, x: 100, y: 300 }), b = S({ ...base, x: 250, y: 300 });
    t('snap: sinistra se nella metà sinistra', a.lato === 's' && a.x === 6 && a.y === 300);
    t('snap: destra se nella metà destra', b.lato === 'd' && b.x === 400 - 52 - 6);
    t('snap: resta sotto la barra in alto', S({ ...base, x: 0, y: -50 }).y === 56);
    t('snap: resta sopra la barra in basso', S({ ...base, x: 0, y: 5000 }).y === 800 - 52 - 30 - 6);
    t('snap: rispetta il notch laterale', S({ ...base, inset: { t: 0, b: 0, l: 40, r: 0 }, x: 0, y: 100 }).x === 46);
    const pos = JSON.parse(app.E('localStorage.getItem("DPSH_AI_POS_V1")')).bolla;
    t('la bolla salvata è attaccata a un bordo', (pos.lato === 's' && pos.x === 6) || (pos.lato === 'd' && pos.x > 300));
  }
  // suggerimenti calcolati in locale
  { const G = c => app.E(`aiSuggerimenti(${JSON.stringify(c)})`).map(s => s.id);
    const v = { vista: 'field', progettoId: 'p', provaId: 's1', nProgetti: 1, haProgetto: true, haProva: true, gps: true, strati: 2, intervalli: 5, senzaGps: [], backup: null };
    t('prova completa: solo esporta', JSON.stringify(G(v)) === '["esporta"]');
    t('prova senza GPS e strati: li propone per primi', JSON.stringify(G({ ...v, gps: false, strati: 0 })) === '["gps","strati","esporta"]');
    t('GPS mancante su altre prove: conteggio nel testo', app.E(`aiSuggerimenti(${JSON.stringify({ ...v, senzaGps: ['s1', 'a', 'b', 'c'] })})`).find(s => s.id === 'gps-prove').testo === 'Aggiungi GPS a 3 prove');
    t('mai più di 3 suggerimenti', G({ ...v, gps: false, strati: 0, intervalli: 0, senzaGps: ['x'], backup: { mai: true } }).length === 3);
    t('home vuota: crea il progetto', JSON.stringify(G({ vista: 'home', nProgetti: 0, senzaGps: [] })) === '["nuovo"]');
    t('home con backup vecchio: propone il backup', G({ vista: 'home', nProgetti: 2, senzaGps: [], backup: { mai: false } })[0] === 'backup');
    const cx = app.E('aiContesto()');
    t('contesto letto dall\'app', cx.vista === 'home' || typeof cx.vista === 'string');
  }
  const arch = JSON.parse(app.E('localStorage.getItem("DPSH_AI_CRONO_V1")'));
  const pidBari = app.E('state.currentProjectId');
  t('cronologia salvata per progetto, senza chiavi', arch[pidBari] && arch[pidBari][0].titolo.includes('Bari') && !JSON.stringify(arch).includes('k1'));
  // aggiunta intervalli (con conferma) e lettura
  const r = await app.E(`(async()=>{const s=AI_STRUMENTI.find(x=>x.n==='aggiungi_intervalli');return s.run({colpi:[3,4,5]})})()`);
  t('aggiungi_intervalli scrive 3 intervalli', r.aggiunti === 3 && app.E('state.logs.length') === 3);
  t('leggi_prova legge i colpi', app.E(`AI_STRUMENTI.find(x=>x.n==='leggi_prova').run({}).colpiPerIntervallo.length`) === 3);
  t('imposta_falda', (app.E(`AI_STRUMENTI.find(x=>x.n==='imposta_falda').run({da:'2.5',a:'3'}); state.header.faldaDa`)) === '2.5');
  t('si eliminano solo intervalli e strati, mai prove o progetti', JSON.stringify(app.E('AI_STRUMENTI.map(s=>s.n)').filter(n => /elimin|cancell|delete/i.test(n)).sort()) === '["elimina_intervalli","elimina_strato","elimina_tavola"]');
  t('disegno libero: l\'assistente lo crea con forme ripulite e lo aggiorna', app.E(`(() => { const T = AI_STRUMENTI.find(x => x.n === 'disegno_libero_nelle_tavole'), pr = state.projects[state.currentProjectId];
    const r = T.run({ nome: 'Schema', forme: [{ t: 'riga', x1: 0, y1: 0, x2: 100, y2: 0 }, { t: 'boh' }, { t: 'misura', x1: 0, y1: 10, x2: 200, y2: 10 }], px_per_m: 100 });
    const ok1 = r.forme === 2 && pr.tavole3d.liberi.length === 1; T.run({ disegno_id: r.id, forme: [] });
    return ok1 && pr.tavole3d.liberi[0].forme.length === 0 && pr.tavole3d.liberi[0].nome === 'Schema'; })()`) === true);
  t('le tavole: l\'assistente le elenca, rinomina, blocca, duplica, ordina ed elimina', app.E(`(() => { const T = n => AI_STRUMENTI.find(x => x.n === n), pr = state.projects[state.currentProjectId];
    const a = creaTavola(pr, { nome: 'Iso Nord', tipo: 'iso' }), b = T('duplica_tavola').run({ tavola_id: a.id });
    if (T('elenco_tavole').run({}).length !== 2) return false;
    T('rinomina_tavola').run({ tavola_id: a.id, nome: 'Prima' }); T('blocca_tavola').run({ tavola_id: a.id, bloccata: true });
    let bloccoOk = false; try { T('rinomina_tavola').run({ tavola_id: a.id, nome: 'X' }); } catch (e) { bloccoOk = true; }
    T('tavola_nel_report').run({ tavola_id: b.id, nel_report: false }); T('ordina_tavole').run({ ids: [b.id] });
    const ok = bloccoOk && T('leggi_tavola').run({ tavola_id: a.id }).nome === 'Prima' && registroTavole(pr)[0].id === b.id && registroTavole(pr)[0].inReport === false;
    T('elimina_tavola').run({ tavola_id: b.id }); return ok && T('elenco_tavole').run({}).length === 1; })()`) === true);
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
  T('crea_stratigrafia', { strati: [{ nome: 'Riporto test', da_m: 0, a_m: 0.3 }, { nome: 'Argilla test', da_m: 0.3, a_m: 99, comportamento: 'coesivo' }] });
  t('crea_stratigrafia crea tutti gli strati insieme', app2.E("state.strati.some(x => x.name === 'Riporto test') && state.strati.some(x => x.name === 'Argilla test')") === true && (!app2.E('state.logs.length') || app2.E("state.logs.every(l => l.lithology === state.strati.find(x => x.name === 'Argilla test').id || l.lithology === state.strati.find(x => x.name === 'Riporto test').id)") === true));
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
  { const cx = app2.E('aiContesto()'); t('contesto: prove senza GPS contate sul progetto', Array.isArray(cx.senzaGps) && cx.haProgetto);
    const r = app2.E('aiCfg.attivo = true, aiRinfresca(true), document.querySelectorAll("#aiPannello .ai-sug").length'); t('chip dei suggerimenti nel pannello', r >= 1 && r <= 3); }
  // guidare la schermata: aprire Impostazioni, leggere i controlli, premere/compilare
  app2.E('openDrawer()'); await attesa(100);
  const sch = T('leggi_schermata');
  t('leggi_schermata vede la finestra aperta e i controlli', sch.controlli.length > 5 && /Impostazioni/.test(sch.finestra || ''));
  const vib = sch.controlli.find(c => /Vibrazione/i.test(c.etichetta) && c.tipo === 'checkbox');
  if (vib) { const prima = vib.attivo; T('compila_campo', { id: vib.id, valore: String(!prima) }); t('compila_campo cambia l\'interruttore', app2.E('document.getElementById("chkHaptic").checked') === !prima); }
  const pul = sch.controlli.find(c => /Elimina|Cancella|Azzera|Reset/i.test(c.etichetta) && c.tipo === 'pulsante');
  if (pul) { let errore = ''; try { T('clicca', { id: pul.id }); } catch (e) { errore = String(e.message || e); } t('clicca rifiuta i pulsanti che eliminano', /elimina|azzera/i.test(errore)); }
  console.log(`\n${ok} ok, ${ko} KO`); console.log(app.errori ? app.errori.slice(0,5) : '');
  process.exit(ko ? 1 : 0);
})();
