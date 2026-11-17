            // ASSISTENTE IA A BOLLA (facoltativo, spento di serie; si accende da Impostazioni).
            // Una chat in una bolla flottante che sa leggere e fare le cose dell'app tramite "strumenti"
            // (tool-calling) e che parla con più provider: Anthropic, OpenAI, Gemini, Groq, OpenRouter
            // e Ollama in locale. Se un provider non risponde passa al successivo dell'elenco.
            //
            // Scelte di Romeo (17/11/2026): tutti e sei i provider; l'assistente LEGGE da solo ma ogni
            // MODIFICA chiede conferma con un pulsante; non può eliminare niente.
            //
            // Le chiavi API stanno in una voce propria del localStorage (AI_CHIAVE), mai in `state`:
            // così non finiscono nei backup, nelle condivisioni dei progetti né nelle copie automatiche.
            // Nessuna chiave è scritta nel codice. L'app resta offline di serie: senza interruttore
            // acceso questo pezzo non fa nessuna richiesta di rete.
            const AI_CHIAVE = 'DPSH_AI_V1';
            const AI_PROVIDER = [
                { id: 'gemini', nome: 'Google Gemini', tipo: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', pref: /flash(?!.*(lite|image|tts))/, costo: 'Gratis (con limiti giornalieri)', url: 'https://aistudio.google.com/apikey',
                  passi: ['Apri la pagina di Google AI Studio e accedi col tuo account Google.', 'Premi «Create API key» e scegli un progetto (va bene quello proposto).', 'Copia la chiave (inizia con «AIza») e incollala qui sotto.'] },
                { id: 'groq', nome: 'Groq', tipo: 'openai', base: 'https://api.groq.com/openai/v1', pref: /llama-3\.3|70b|llama/, costo: 'Gratis (con limiti), molto veloce', url: 'https://console.groq.com/keys',
                  passi: ['Apri la console di Groq e registrati (basta un account Google).', 'Vai su «API Keys» e premi «Create API Key».', 'Copia la chiave (inizia con «gsk_») e incollala qui sotto.'] },
                { id: 'openrouter', nome: 'OpenRouter', tipo: 'openai', base: 'https://openrouter.ai/api/v1', pref: /llama-3\.3.*:free|:free/, costo: 'Modelli gratuiti e a pagamento con una sola chiave', url: 'https://openrouter.ai/keys',
                  passi: ['Apri OpenRouter e crea un account.', 'Vai su «Keys» e premi «Create Key».', 'Copia la chiave (inizia con «sk-or-») e incollala qui sotto. I modelli con «:free» nel nome non costano.'] },
                { id: 'anthropic', nome: 'Anthropic (Claude)', tipo: 'anthropic', base: 'https://api.anthropic.com/v1', pref: /sonnet/, costo: 'A pagamento (credito prepagato)', url: 'https://console.anthropic.com/settings/keys',
                  passi: ['Apri la console di Anthropic e accedi.', 'In «Billing» aggiungi un po\' di credito (bastano pochi euro).', 'In «API Keys» premi «Create Key», copia la chiave (inizia con «sk-ant-») e incollala qui sotto.'] },
                { id: 'openai', nome: 'OpenAI (ChatGPT)', tipo: 'openai', base: 'https://api.openai.com/v1', pref: /mini/, costo: 'A pagamento (credito prepagato)', url: 'https://platform.openai.com/api-keys',
                  passi: ['Apri la piattaforma OpenAI e accedi.', 'In «Billing» aggiungi un po\' di credito.', 'In «API keys» premi «Create new secret key», copia la chiave (inizia con «sk-») e incollala qui sotto.'] },
                { id: 'ollama', nome: 'Ollama (sul tuo PC)', tipo: 'openai', base: 'http://localhost:11434/v1', pref: /./, costo: 'Gratis, funziona sul tuo computer', url: 'https://ollama.com/download', senzaChiave: true,
                  passi: ['Installa Ollama dalla pagina qui sopra e avvialo.', 'Da terminale scarica un modello, per esempio: ollama pull llama3.1', 'Per far parlare l\'app con Ollama avvialo con la variabile OLLAMA_ORIGINS="*" (altrimenti il browser blocca la richiesta).', 'L\'indirizzo qui sotto è quello standard: cambialo solo se Ollama è su un altro computer.'] }
            ];
            const AI_MAX_GIRI = 6;

            // --- configurazione (solo localStorage, voce a parte) ---
            let aiCfg = { attivo: false, ordine: AI_PROVIDER.map(p => p.id), provider: {} };
            try {
                const grezzo = JSON.parse(localStorage.getItem(AI_CHIAVE) || 'null');
                if (grezzo && typeof grezzo === 'object') {
                    aiCfg.attivo = !!grezzo.attivo;
                    if (grezzo.provider && typeof grezzo.provider === 'object') aiCfg.provider = grezzo.provider;
                    if (Array.isArray(grezzo.ordine)) {
                        const noti = grezzo.ordine.filter(id => AI_PROVIDER.some(p => p.id === id));
                        aiCfg.ordine = noti.concat(AI_PROVIDER.map(p => p.id).filter(id => !noti.includes(id)));
                    }
                }
            } catch (e) { /* voce rovinata: si riparte da zero, l'app non ne risente */ }
            function aiSalva() { try { localStorage.setItem(AI_CHIAVE, JSON.stringify(aiCfg)); } catch (e) { /* spazio pieno o accesso negato */ } }
            const aiDef = id => AI_PROVIDER.find(p => p.id === id);
            const aiConf = id => aiCfg.provider[id] || (aiCfg.provider[id] = {});
            const aiPronto = id => { const d = aiDef(id), c = aiConf(id); return !!(c.attivo !== false && c.modello && (d.senzaChiave ? c.configurato : c.chiave)); };
            const aiProntiInOrdine = () => aiCfg.ordine.filter(aiPronto);
            const aiEl = (tag, cls, testo) => { const e = document.createElement(tag); if (cls) e.className = cls; if (testo != null) e.textContent = testo; return e; };

            // --- strumenti: cosa può fare l'assistente ---
            // w = modifica (chiede conferma), altrimenti lettura libera. Nessuno strumento elimina dati.
            function aiProvaDati(pid, sid) {
                const proj = (state.projects || {})[pid];
                if (!proj) return null;
                if (pid === state.currentProjectId && sid === state.currentSurveyId) return { header: state.header, logs: state.logs, strati: state.strati };
                const s = (proj.surveys || {})[sid];
                return s ? { header: s.header || {}, logs: s.logs || [], strati: s.strati || [] } : null;
            }
            function aiSchedaProva(pid, sid, conIntervalli) {
                const d = aiProvaDati(pid, sid);
                if (!d) return null;
                const logs = d.logs || [];
                const h = d.header || {};
                const r = { id: sid, provaNr: h.provaNr, localita: h.localita, data: h.date, intervalli: logs.length, profonditaM: logs.length ? +logs[logs.length - 1].end.toFixed(2) : 0, faldaDaM: h.faldaDa || null, faldaAM: h.faldaA || null, gps: h.lat != null ? { lat: h.lat, lng: h.lng } : null, strati: (d.strati || []).length };
                if (conIntervalli) r.colpiPerIntervallo = logs.slice(0, 400).map(l => [+l.start.toFixed(2), +l.end.toFixed(2), l.colpi]);
                return r;
            }
            function aiAttiva(pid, sid) {
                if (!pid) pid = state.currentProjectId;
                if (!state.projects || !state.projects[pid]) throw new Error('Progetto non trovato.');
                if (pid !== state.currentProjectId || (sid && sid !== state.currentSurveyId)) { saveState(); syncProjectToActiveState(pid, sid || undefined); }
            }
            const AI_STRUMENTI = [
                { n: 'stato_app', d: 'Dice in che schermata si è e quale progetto e prova sono aperti.', p: {}, run: () => ({ vista: (state.uiState || {}).currentView, progettoId: state.currentProjectId || null, provaId: state.currentSurveyId || null, progetti: Object.keys(state.projects || {}).length }) },
                { n: 'elenco_progetti', d: 'Elenca tutti i progetti con id, nome, comune e numero di prove.', p: {}, run: () => Object.values(state.projects || {}).map(p => ({ id: p.id, nome: p.name, comune: p.comune, committente: p.committente, data: p.date, prove: Object.keys(p.surveys || {}).length })) },
                { n: 'leggi_progetto', d: 'Legge un progetto e il riepilogo di ognuna delle sue prove. Senza id usa il progetto aperto.', p: { id: { type: 'string', description: 'id del progetto' } }, run: a => {
                    const p = (state.projects || {})[a.id || state.currentProjectId];
                    if (!p) throw new Error('Progetto non trovato.');
                    return { id: p.id, nome: p.name, comune: p.comune, committente: p.committente, data: p.date, prove: Object.keys(p.surveys || {}).map(sid => aiSchedaProva(p.id, sid, false)) };
                } },
                { n: 'leggi_prova', d: 'Legge una prova: dati, falda, GPS e colpi per intervallo [da, a, colpi] in metri. Senza id usa la prova aperta.', p: { progetto_id: { type: 'string' }, prova_id: { type: 'string' } }, run: a => {
                    const pid = a.progetto_id || state.currentProjectId, sid = a.prova_id || state.currentSurveyId;
                    const r = aiSchedaProva(pid, sid, true);
                    if (!r) throw new Error('Prova non trovata.');
                    return r;
                } },
                { n: 'elenco_comandi', d: 'Elenca i comandi dell\'app disponibili adesso, da usare con esegui_comando.', p: {}, run: () => comandiPc().filter(c => c[4] && c[3]).map(c => c[1]) },
                { n: 'vai_a', d: 'Apre una schermata: home (progetti), project (scheda del progetto) o field (la prova). Con progetto_id/prova_id apre quelli.', p: { vista: { type: 'string', enum: ['home', 'project', 'field'] }, progetto_id: { type: 'string' }, prova_id: { type: 'string' } }, req: ['vista'], run: a => {
                    if (a.progetto_id) aiAttiva(a.progetto_id, a.prova_id);
                    switchView(a.vista); return { ok: true, vista: a.vista };
                } },
                { n: 'esegui_comando', d: 'Esegue un comando dell\'app dall\'elenco di elenco_comandi (apre finestre e strumenti). Usa l\'etichetta esatta.', p: { etichetta: { type: 'string' } }, req: ['etichetta'],
                  w: a => /^(nuov|annulla|ripeti|backup|aggiungi|porta)/i.test(a.etichetta || ''),
                  ds: a => `Eseguire il comando «${a.etichetta}»`, run: a => {
                    const c = comandiPc().find(x => x[3] && x[4] && x[1].toLowerCase() === String(a.etichetta).toLowerCase());
                    if (!c) throw new Error('Comando non disponibile adesso. Usa elenco_comandi.');
                    c[3](); return { ok: true };
                } },
                { n: 'crea_progetto', d: 'Crea un nuovo progetto con la sua prima prova e lo apre.', p: { comune: { type: 'string' }, nome: { type: 'string' }, committente: { type: 'string' } }, req: ['comune'], w: true,
                  ds: a => `Creare il progetto «${a.nome || a.comune + ' - Cantiere'}» (comune: ${a.comune}${a.committente ? ', committente: ' + a.committente : ''})`, run: a => {
                    const g = id => document.getElementById(id);
                    if (!String(a.comune || '').trim()) throw new Error('Serve il comune.');
                    openNewProjectModal();
                    g('txtProjComune').value = a.comune; g('txtProjName').value = a.nome || ''; g('txtProjCommittente').value = a.committente || '';
                    g('btnConfirmNewProject').click();
                    return { ok: true, progettoId: state.currentProjectId, provaId: state.currentSurveyId };
                } },
                { n: 'crea_prova', d: 'Aggiunge una nuova prova al progetto aperto, con i dati del progetto.', p: {}, w: true, ds: () => 'Creare una nuova prova nel progetto aperto', run: () => {
                    if (!state.currentProjectId) throw new Error('Apri prima un progetto.');
                    openNewSurveyModal(); return { ok: true, provaId: state.currentSurveyId };
                } },
                { n: 'aggiungi_intervalli', d: 'Aggiunge in coda alla prova aperta gli intervalli di colpi indicati (un numero per intervallo, in ordine di profondità).', p: { colpi: { type: 'array', items: { type: 'integer' } }, prova_id: { type: 'string' } }, req: ['colpi'], w: true,
                  ds: a => `Aggiungere ${(a.colpi || []).length} intervalli alla prova aperta: ${(a.colpi || []).slice(0, 12).join(', ')}${(a.colpi || []).length > 12 ? '…' : ''}`, run: a => {
                    if (!Array.isArray(a.colpi) || !a.colpi.length || a.colpi.some(n => !Number.isInteger(n) || n < 0 || n > 999)) throw new Error('I colpi devono essere numeri interi tra 0 e 999.');
                    if (a.prova_id) aiAttiva(null, a.prova_id);
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    const prima = state.logs.length;
                    openBulkImportModal();
                    const t = document.getElementById('txtBulkImportData');
                    t.value = a.colpi.join('\n'); t.dispatchEvent(new Event('input', { bubbles: true }));
                    document.getElementById('btnConfirmBulkImport').click();
                    return { aggiunti: state.logs.length - prima, profonditaM: +(state.logs.length ? state.logs[state.logs.length - 1].end : 0).toFixed(2) };
                } },
                { n: 'imposta_falda', d: 'Imposta la falda acquifera della prova aperta (metri da piano campagna). Stringhe vuote la azzerano.', p: { da: { type: 'string' }, a: { type: 'string' } }, req: ['da'], w: true,
                  ds: a => `Impostare la falda: da ${a.da || '—'} m a ${a.a || '—'} m`, run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    const ok = v => v === '' || v == null || (isFinite(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) < 100);
                    if (!ok(a.da) || !ok(a.a)) throw new Error('Valori di falda non validi.');
                    state.header.faldaDa = a.da == null ? '' : String(a.da); state.header.faldaA = a.a == null ? '' : String(a.a);
                    saveState(); updateUI(); return { ok: true };
                } },
                { n: 'modifica_dati_prova', d: 'Cambia un dato dell\'intestazione della prova aperta: localita, committente, comune, provaNr o date (AAAA-MM-GG).', p: { campo: { type: 'string', enum: ['localita', 'committente', 'comune', 'provaNr', 'date'] }, valore: { type: 'string' } }, req: ['campo', 'valore'], w: true,
                  ds: a => `Cambiare «${a.campo}» della prova aperta in «${a.valore}»`, run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    if (!['localita', 'committente', 'comune', 'provaNr', 'date'].includes(a.campo)) throw new Error('Campo non modificabile.');
                    if (a.campo === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(a.valore)) throw new Error('La data deve essere AAAA-MM-GG.');
                    state.header[a.campo] = String(a.valore); saveState(); updateUI(); return { ok: true };
                } }
            ];
            const aiMsgSistema = () => 'Sei l\'assistente integrato in DPSH, un\'app per prove penetrometriche dinamiche (DPSH) in cantiere. Rispondi sempre in italiano, in modo breve e concreto. ' +
                'Usa gli strumenti per leggere i dati reali: non inventare mai numeri, profondità o colpi. Profondità in metri, colpi per intervallo di avanzamento. ' +
                'Per le modifiche chiama lo strumento giusto: l\'app chiede la conferma all\'utente, non chiederla tu a parole. Non puoi eliminare dati: se serve, spiega come farlo a mano. ' +
                'Se uno strumento dà errore, dillo e proponi un\'alternativa. Stato attuale: ' + JSON.stringify(AI_STRUMENTI[0].run());

            // --- adattatori dei provider: tutti scambiano la stessa cronologia interna ---
            // cronologia: {r:'u',t} | {r:'a',t,calls:[{id,n,a}]} | {r:'t',res:[{id,n,c}]}
            const aiSchema = s => ({ type: 'object', properties: s.p, required: s.req || [] });
            const aiSenzaVuoti = o => Object.keys(o.properties).length ? o : undefined;
            const AI_ADATTATORI = {
                anthropic(d, c, crono) {
                    const msgs = crono.map(m => m.r === 'u' ? { role: 'user', content: m.t }
                        : m.r === 'a' ? { role: 'assistant', content: [].concat(m.t ? [{ type: 'text', text: m.t }] : [], (m.calls || []).map(k => ({ type: 'tool_use', id: k.id, name: k.n, input: k.a || {} }))) }
                        : { role: 'user', content: m.res.map(x => ({ type: 'tool_result', tool_use_id: x.id, content: x.c })) });
                    return {
                        url: d.base + '/messages', headers: { 'x-api-key': c.chiave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                        corpo: { model: c.modello, max_tokens: 1500, system: aiMsgSistema(), messages: msgs, tools: AI_STRUMENTI.map(s => ({ name: s.n, description: s.d, input_schema: aiSchema(s) })) },
                        leggi: j => ({ t: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'), calls: (j.content || []).filter(b => b.type === 'tool_use').map(b => ({ id: b.id, n: b.name, a: b.input || {} })) })
                    };
                },
                openai(d, c, crono) {
                    const msgs = [{ role: 'system', content: aiMsgSistema() }];
                    crono.forEach(m => {
                        if (m.r === 'u') msgs.push({ role: 'user', content: m.t });
                        else if (m.r === 'a') msgs.push({ role: 'assistant', content: m.t || null, ...(m.calls && m.calls.length ? { tool_calls: m.calls.map(k => ({ id: k.id, type: 'function', function: { name: k.n, arguments: JSON.stringify(k.a || {}) } })) } : {}) });
                        else m.res.forEach(x => msgs.push({ role: 'tool', tool_call_id: x.id, content: x.c }));
                    });
                    const h = { 'Content-Type': 'application/json' };
                    if (c.chiave) h.Authorization = 'Bearer ' + c.chiave;
                    return {
                        url: (c.base || d.base).replace(/\/$/, '') + '/chat/completions', headers: h,
                        corpo: { model: c.modello, messages: msgs, tools: AI_STRUMENTI.map(s => ({ type: 'function', function: { name: s.n, description: s.d, parameters: aiSchema(s) } })) },
                        leggi: j => {
                            const m = ((j.choices || [])[0] || {}).message || {};
                            return { t: m.content || '', calls: (m.tool_calls || []).map((k, i) => { let a = {}; try { a = JSON.parse(k.function.arguments || '{}'); } catch (e) { /* argomenti rovinati: strumento senza argomenti */ } return { id: k.id || ('call_' + i), n: k.function.name, a }; }) };
                        }
                    };
                },
                gemini(d, c, crono) {
                    const contents = crono.map(m => m.r === 'u' ? { role: 'user', parts: [{ text: m.t }] }
                        : m.r === 'a' ? { role: 'model', parts: [].concat(m.t ? [{ text: m.t }] : [], (m.calls || []).map(k => ({ functionCall: { name: k.n, args: k.a || {} } }))) }
                        : { role: 'user', parts: m.res.map(x => ({ functionResponse: { name: x.n, response: { result: x.c } } })) });
                    return {
                        url: d.base + '/models/' + encodeURIComponent(c.modello) + ':generateContent', headers: { 'x-goog-api-key': c.chiave },
                        corpo: { systemInstruction: { parts: [{ text: aiMsgSistema() }] }, contents, tools: [{ functionDeclarations: AI_STRUMENTI.map(s => ({ name: s.n, description: s.d, parameters: aiSenzaVuoti(aiSchema(s)) })) }] },
                        leggi: j => {
                            const parti = (((j.candidates || [])[0] || {}).content || {}).parts || [];
                            return { t: parti.filter(p => p.text).map(p => p.text).join('\n'), calls: parti.filter(p => p.functionCall).map((p, i) => ({ id: 'g' + Date.now() + i, n: p.functionCall.name, a: p.functionCall.args || {} })) };
                        }
                    };
                }
            };
            // ELENCO DEI MODELLI: si scarica dal provider (con la chiave appena incollata, che così è anche
            // verificata) e si sceglie da un menu: i nomi dei modelli cambiano di continuo e non vanno digitati.
            async function aiElencoModelli(id, v) {
                const d = aiDef(id), base = (v.base || d.base).replace(/\/$/, '');
                let url = base + '/models', h = {};
                if (d.tipo === 'anthropic') { url += '?limit=100'; h = { 'x-api-key': v.chiave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' }; }
                else if (d.tipo === 'gemini') { url += '?pageSize=200'; h = { 'x-goog-api-key': v.chiave }; }
                else if (v.chiave) h = { Authorization: 'Bearer ' + v.chiave };
                let risp;
                try { risp = await fetch(url, { headers: h }); }
                catch (e) { throw new Error(id === 'ollama' ? 'Ollama non raggiungibile: è avviato e ha OLLAMA_ORIGINS="*"?' : 'rete assente o richiesta bloccata'); }
                if (!risp.ok) throw new Error(risp.status === 401 || risp.status === 403 ? 'chiave non valida o senza permesso' : risp.status === 429 ? 'limite raggiunto' : 'errore ' + risp.status);
                const j = await risp.json();
                const non = /embed|whisper|tts|audio|transcri|moderat|guard|image|imagen|veo|dall-e|realtime|search-preview|davinci|babbage|aqa|vision-preview|robotics|computer-use/i;
                let el = [];
                if (d.tipo === 'gemini') el = (j.models || []).filter(m => /gemini|gemma/i.test(m.name) && (m.supportedGenerationMethods || []).includes('generateContent') && !non.test(m.name)).map(m => ({ id: m.name.replace(/^models\//, ''), nome: m.displayName || m.name }));
                else if (d.tipo === 'anthropic') el = (j.data || []).map(m => ({ id: m.id, nome: m.display_name || m.id }));
                else if (id === 'openrouter') el = (j.data || []).filter(m => (m.supported_parameters || []).includes('tools') && !non.test(m.id)).map(m => ({ id: m.id, nome: (m.name || m.id) + (/:free$/.test(m.id) ? ' (gratis)' : '') }));
                else if (id === 'ollama') el = (j.data || []).map(m => ({ id: m.id, nome: m.id }));
                else el = (j.data || []).filter(m => !non.test(m.id) && (id !== 'openai' || /^(gpt|o\d|chatgpt)/.test(m.id))).map(m => ({ id: m.id, nome: m.id }));
                if (id === 'openrouter') el.sort((a, b) => (/:free$/.test(b.id) ? 1 : 0) - (/:free$/.test(a.id) ? 1 : 0));
                if (!el.length) throw new Error('nessun modello disponibile' + (id === 'ollama' ? ': scaricane uno con «ollama pull llama3.1»' : ''));
                return el;
            }
            async function aiChiama(id, crono) {
                const d = aiDef(id), c = aiConf(id);
                const r = AI_ADATTATORI[d.tipo](d, c, crono);
                const ctl = new AbortController();
                const timer = setTimeout(() => ctl.abort(), 60000);
                try {
                    const risp = await fetch(r.url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, r.headers), body: JSON.stringify(r.corpo), signal: ctl.signal });
                    if (!risp.ok) {
                        let det = ''; try { const j = await risp.json(); det = (j.error && (j.error.message || j.error)) || ''; } catch (e) { /* corpo non JSON */ }
                        const m = risp.status === 401 || risp.status === 403 ? 'chiave non valida o senza permesso'
                            : risp.status === 429 ? 'limite raggiunto o credito esaurito'
                            : risp.status === 404 ? 'modello non più disponibile: riapri il provider e scegline un altro dal menu'
                            : 'errore ' + risp.status;
                        throw new Error(m + (det ? ' — ' + String(det).slice(0, 160) : ''));
                    }
                    return r.leggi(await risp.json());
                } catch (e) {
                    if (e.name === 'AbortError') throw new Error('nessuna risposta entro 60 secondi');
                    if (e instanceof TypeError) throw new Error(d.id === 'ollama' ? 'Ollama non raggiungibile: è avviato e ha OLLAMA_ORIGINS="*"?' : 'rete assente o richiesta bloccata');
                    throw e;
                } finally { clearTimeout(timer); }
            }
            // Un giro di domanda: prova i provider nell'ordine scelto, passando al successivo se uno fallisce.
            async function aiChiamaConFallback(crono, avvisa) {
                const pronti = aiProntiInOrdine();
                if (!pronti.length) throw new Error('Nessun provider configurato. Aprilo da Impostazioni › Assistente IA › Provider e chiavi API.');
                const errori = [];
                for (const id of pronti) {
                    try { const r = await aiChiama(id, crono); if (errori.length) avvisa(`Risponde ${aiDef(id).nome}.`); return r; }
                    catch (e) { errori.push(aiDef(id).nome + ': ' + e.message); avvisa(`${aiDef(id).nome} non ha funzionato (${e.message}).` + (id !== pronti[pronti.length - 1] ? ' Provo il successivo…' : '')); }
                }
                throw new Error('Nessun provider ha risposto.\n' + errori.join('\n'));
            }

            // --- bolla e chat ---
            const aiBolla = aiEl('button', null); aiBolla.id = 'aiBolla'; aiBolla.type = 'button'; aiBolla.setAttribute('aria-label', 'Assistente IA');
            aiBolla.innerHTML = '<svg class="ico"><use href="#i-sparkles"/></svg>';
            const aiPannello = aiEl('div'); aiPannello.id = 'aiPannello'; aiPannello.setAttribute('role', 'dialog'); aiPannello.setAttribute('aria-label', 'Assistente IA');
            const aiTesta = aiEl('div', 'ai-testa'); aiTesta.append(aiEl('span', null, 'Assistente IA'), aiEl('span', 'ai-spazio'));
            const aiBtnNuova = aiEl('button', null, 'Nuova chat'), aiBtnChiudi = aiEl('button', null, '✕'); aiBtnChiudi.setAttribute('aria-label', 'Chiudi');
            aiTesta.append(aiBtnNuova, aiBtnChiudi);
            const aiChat = aiEl('div', 'ai-chat'); aiChat.setAttribute('aria-live', 'polite');
            const aiPiedi = aiEl('div', 'ai-piedi');
            const aiCampo = aiEl('textarea'); aiCampo.placeholder = 'Chiedi o ordina qualcosa…'; aiCampo.rows = 1;
            const aiInvia = aiEl('button', null, 'Invia');
            aiPiedi.append(aiCampo, aiInvia);
            aiPannello.append(aiTesta, aiChat, aiPiedi);
            document.body.append(aiBolla, aiPannello);

            let aiCrono = [], aiOccupato = false;
            function aiMsg(cls, testo) { const m = aiEl('div', 'ai-msg ' + cls, testo); aiChat.appendChild(m); aiChat.scrollTop = aiChat.scrollHeight; return m; }
            function aiSaluto() { aiChat.textContent = ''; aiCrono = []; aiMsg('info', 'Posso leggere i tuoi progetti e prove, aprire schermate e, con la tua conferma, creare progetti e prove, aggiungere colpi e impostare la falda.'); }
            function aiConferma(testo) {
                return new Promise(res => {
                    const m = aiMsg('azione', 'L\'assistente vuole: ' + testo);
                    const riga = aiEl('div', 'ai-conferma'), si = aiEl('button', 'si', 'Conferma'), no = aiEl('button', null, 'Annulla');
                    riga.append(no, si); m.appendChild(riga);
                    const fine = v => { riga.remove(); m.appendChild(aiEl('div', null, v ? '✓ Confermato' : '✕ Annullato')); res(v); };
                    si.onclick = () => fine(true); no.onclick = () => fine(false);
                });
            }
            async function aiEseguiStrumento(k) {
                const s = AI_STRUMENTI.find(x => x.n === k.n);
                if (!s) return { c: JSON.stringify({ errore: 'Strumento sconosciuto.' }) };
                const args = (k.a && typeof k.a === 'object') ? k.a : {};
                const serveConferma = typeof s.w === 'function' ? s.w(args) : !!s.w;
                if (serveConferma && !(await aiConferma(s.ds ? s.ds(args) : s.n))) return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                try { const out = s.run(args); if (serveConferma) aiMsg('info', '✓ ' + (s.ds ? s.ds(args) : s.n)); return { c: JSON.stringify(out === undefined ? { ok: true } : out) }; }
                catch (e) { return { c: JSON.stringify({ errore: e.message }) }; }
            }
            async function aiInviaDomanda() {
                const testo = aiCampo.value.trim();
                if (!testo || aiOccupato) return;
                aiCampo.value = ''; aiMsg('utente', testo); aiCrono.push({ r: 'u', t: testo });
                aiOccupato = true; aiInvia.disabled = true;
                const attesa = aiMsg('info', 'Penso…');
                try {
                    for (let giro = 0; giro < AI_MAX_GIRI; giro++) {
                        const r = await aiChiamaConFallback(aiCrono, t => aiMsg('info', t));
                        aiCrono.push({ r: 'a', t: r.t, calls: r.calls });
                        if (r.t) aiMsg('ia', r.t);
                        if (!r.calls.length) break;
                        const res = [];
                        for (const k of r.calls) { const o = await aiEseguiStrumento(k); res.push({ id: k.id, n: k.n, c: o.c }); }
                        aiCrono.push({ r: 't', res });
                        if (giro === AI_MAX_GIRI - 1) aiMsg('info', 'Mi fermo qui: troppi passaggi di fila.');
                    }
                } catch (e) { aiMsg('errore', e.message); }
                attesa.remove(); aiOccupato = false; aiInvia.disabled = false; aiCampo.focus();
            }
            aiInvia.onclick = aiInviaDomanda;
            aiCampo.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiInviaDomanda(); } });
            aiBtnNuova.onclick = () => { if (!aiOccupato) aiSaluto(); };
            const aiApri = su => { aiPannello.classList.toggle('aperto', su); if (su) { if (!aiChat.children.length) aiSaluto(); if (!aiProntiInOrdine().length) aiMsg('info', 'Prima scegli un provider da Impostazioni › Assistente IA.'); setTimeout(() => aiCampo.focus(), 50); } };
            aiBolla.onclick = () => aiApri(!aiPannello.classList.contains('aperto'));
            aiBtnChiudi.onclick = () => aiApri(false);

            // --- procedura guidata dei provider ---
            const aiOv = aiEl('div'); aiOv.id = 'aiWizOverlay'; document.body.appendChild(aiOv);
            const aiWizChiudi = () => { aiOv.classList.remove('aperto'); aiOv.textContent = ''; aiAggiornaEtichetta(); };
            aiOv.addEventListener('click', e => { if (e.target === aiOv) aiWizChiudi(); });
            function aiWizMostra(nodi) { const w = aiEl('div', 'ai-wiz'); w.setAttribute('role', 'dialog'); w.append(...nodi); aiOv.textContent = ''; aiOv.appendChild(w); aiOv.classList.add('aperto'); }
            function aiWizElenco() {
                const n = [aiEl('h3', null, 'Provider IA'), aiEl('p', null, 'L\'assistente prova i provider dall\'alto in basso: se uno non risponde passa al successivo. Configurane quanti vuoi; i gratuiti vanno benissimo per cominciare.')];
                aiCfg.ordine.forEach((id, i) => {
                    const d = aiDef(id), pronto = aiPronto(id);
                    const riga = aiEl('div', 'ai-riga');
                    const nome = aiEl('span', 'ai-nome', d.nome); nome.appendChild(aiEl('span', 'ai-sotto', d.costo));
                    const su = aiEl('button', null, '↑'), giu = aiEl('button', null, '↓'), ap = aiEl('button', null, pronto ? 'Modifica' : 'Aggiungi');
                    su.disabled = i === 0; giu.disabled = i === aiCfg.ordine.length - 1; su.setAttribute('aria-label', 'Sposta su'); giu.setAttribute('aria-label', 'Sposta giù');
                    su.onclick = () => { aiCfg.ordine.splice(i - 1, 0, aiCfg.ordine.splice(i, 1)[0]); aiSalva(); aiWizElenco(); };
                    giu.onclick = () => { aiCfg.ordine.splice(i + 1, 0, aiCfg.ordine.splice(i, 1)[0]); aiSalva(); aiWizElenco(); };
                    ap.onclick = () => aiWizProvider(id);
                    riga.append(nome, aiEl('span', 'ai-badge' + (pronto ? '' : ' no'), pronto ? 'pronto' : 'non configurato'), su, giu, ap);
                    n.push(riga);
                });
                const az = aiEl('div', 'ai-azioni'), ok = aiEl('button', 'pri', 'Fatto'); ok.onclick = aiWizChiudi; az.appendChild(ok); n.push(az);
                aiWizMostra(n);
            }
            function aiWizProvider(id) {
                const d = aiDef(id), c = aiConf(id);
                const n = [aiEl('h3', null, d.nome), aiEl('p', null, d.costo + '.')];
                const ol = aiEl('ol'); d.passi.forEach(t => ol.appendChild(aiEl('li', null, t))); n.push(ol);
                const apri = aiEl('button', null, 'Apri la pagina: ' + d.url.replace(/^https:\/\//, '').split('/')[0]); apri.onclick = () => window.open(d.url, '_blank', 'noopener');
                const azA = aiEl('div', 'ai-azioni'); azA.appendChild(apri); n.push(azA);
                const campo = (et, tipo, val, ph) => { const w = aiEl('div'); w.appendChild(aiEl('label', null, et)); const i = aiEl('input'); i.type = tipo; i.value = val || ''; i.placeholder = ph || ''; i.autocomplete = 'off'; i.spellcheck = false; w.appendChild(i); n.push(w); return i; };
                const iChiave = d.senzaChiave ? null : campo('Chiave API (resta solo su questo dispositivo)', 'password', c.chiave, 'incolla qui la chiave');
                const iBase = d.senzaChiave ? campo('Indirizzo di Ollama', 'text', c.base || d.base) : null;
                const wm = aiEl('div'); wm.appendChild(aiEl('label', null, 'Modello (si scarica dal provider dopo la chiave)'));
                const sel = aiEl('select'); sel.style.cssText = 'width:100%;box-sizing:border-box;background:var(--bg-sunken);color:var(--text-main);border:1px solid var(--border);border-radius:var(--radius-md);padding:9px 10px;font:inherit;font-size:13px;';
                wm.appendChild(sel); n.push(wm);
                const esito = aiEl('div', 'ai-esito'); esito.style.display = 'none'; n.push(esito);
                const az = aiEl('div', 'ai-azioni'), indietro = aiEl('button', null, 'Indietro'), carica = aiEl('button', null, 'Carica i modelli'), prova = aiEl('button', null, 'Prova'), salva = aiEl('button', 'pri', 'Salva'), togli = aiEl('button', null, 'Rimuovi');
                const leggi = () => ({ chiave: iChiave ? iChiave.value.trim() : '', base: iBase ? iBase.value.trim() : '', modello: sel.value });
                const mostra = (ok, t) => { esito.style.display = ''; esito.className = 'ai-esito ' + (ok ? 'ok' : 'ko'); esito.textContent = t; };
                const riempi = (el, scelto) => {
                    sel.textContent = '';
                    el.forEach(m => { const o = aiEl('option', null, m.nome); o.value = m.id; sel.appendChild(o); });
                    const pref = el.find(m => m.id === scelto) || el.find(m => d.pref.test(m.id)) || el[0];
                    sel.value = pref.id;
                };
                const caricaModelli = async () => {
                    const v = leggi();
                    if (!d.senzaChiave && !v.chiave) { mostra(false, 'Incolla prima la chiave.'); return false; }
                    carica.disabled = true; mostra(true, 'Scarico l\'elenco dei modelli…');
                    try { const el = await aiElencoModelli(id, v); riempi(el, c.modello); mostra(true, el.length + ' modelli disponibili. Scegli dal menu.'); return true; }
                    catch (e) { sel.textContent = ''; mostra(false, 'Non riesco: ' + e.message); return false; }
                    finally { carica.disabled = false; }
                };
                if (c.modello) { const o = aiEl('option', null, c.modello); o.value = c.modello; sel.appendChild(o); }
                else sel.appendChild(Object.assign(aiEl('option', null, 'Prima carica i modelli'), { value: '' }));
                carica.onclick = caricaModelli;
                if (iChiave) iChiave.addEventListener('change', caricaModelli);
                if (d.senzaChiave || c.chiave) caricaModelli();
                prova.onclick = async () => {
                    const v = leggi();
                    if (!v.modello) { mostra(false, 'Scegli prima un modello (premi «Carica i modelli»).'); return; }
                    const prec = Object.assign({}, c); Object.assign(c, v, { configurato: true });
                    prova.disabled = true; mostra(true, 'Provo…');
                    try {
                        const r = await aiChiama(id, [{ r: 'u', t: 'Rispondi solo con la parola: ok' }]);
                        mostra(true, 'Funziona. Risposta: «' + (r.t || '(vuota)').slice(0, 60) + '».');
                    } catch (e) { mostra(false, 'Non funziona: ' + e.message); }
                    for (const k of Object.keys(c)) delete c[k]; Object.assign(c, prec); prova.disabled = false;
                };
                salva.onclick = () => { const v = leggi(); if (!d.senzaChiave && !v.chiave) { mostra(false, 'Incolla prima la chiave.'); return; } if (!v.modello) { mostra(false, 'Scegli un modello dal menu (premi «Carica i modelli»).'); return; } Object.assign(c, v, { configurato: true, attivo: true }); aiSalva(); aiWizElenco(); };
                togli.onclick = () => { delete aiCfg.provider[id]; aiSalva(); aiWizElenco(); };
                indietro.onclick = aiWizElenco;
                az.append(indietro); if (aiPronto(id)) az.appendChild(togli); az.append(carica, prova, salva); n.push(az);
                aiWizMostra(n);
            }

            // --- interruttore nelle Impostazioni ---
            function aiAggiornaEtichetta() {
                const e = document.getElementById('lblAssistenteProviderN'); if (e) e.textContent = '(' + aiProntiInOrdine().length + ' pronti)';
                aiBolla.classList.toggle('attiva', !!aiCfg.attivo);
                if (!aiCfg.attivo) aiApri(false);
            }
            const aiChk = document.getElementById('chkAssistenteIa');
            if (aiChk) {
                aiChk.checked = !!aiCfg.attivo;
                aiChk.addEventListener('change', () => {
                    aiCfg.attivo = aiChk.checked; aiSalva(); aiAggiornaEtichetta();
                    if (aiCfg.attivo && !aiProntiInOrdine().length) aiWizElenco();
                });
            }
            const aiBtnProv = document.getElementById('btnAssistenteProvider');
            if (aiBtnProv) aiBtnProv.addEventListener('click', aiWizElenco);
            aiAggiornaEtichetta();
        })();
