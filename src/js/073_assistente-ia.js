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
            const AI_MAX_GIRI = 14;

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
            let aiUiMappa = [], aiUiSchede = {};
            const aiVisibile = e => { for (let n = e; n && n.nodeType === 1; n = n.parentElement) { if (n.hidden) return false; const cs = getComputedStyle(n); if (cs.display === 'none' || cs.visibility === 'hidden') return false; } return true; };
            // Controlli che eliminano o azzerano: mai da qui. Pulsanti di semplice navigazione: senza conferma.
            const aiUiVietato = id => { const e = aiUiMappa[id], l = ((aiUiSchede[id] || {}).etichetta || '') + ' ' + (e && e.id || ''); return /elimin|cancell|azzer|rimuov|svuot|reset|pulisci|sostitu|cestin|trash|esci/i.test(l); };
            const aiUiSicuro = id => /^(apri|chiudi|indietro|avanti|annulla|mostra|nascondi|cerca|vai|scheda|impostazioni|espandi|comprimi|ok|ho capito)\b/i.test(((aiUiSchede[id] || {}).etichetta || '').trim()) && (aiUiSchede[id] || {}).tipo === 'pulsante';
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
                } },
                // --- strati e parametri avanzati ---
                { n: 'leggi_strati', d: 'Legge gli strati della prova aperta con comportamento, Nspt, e per ogni categoria di parametro avanzato (peso di volume, angolo di attrito, coesione, moduli…) gli autori candidati [indice, autore, valore] e quello scelto.', p: {}, run: () => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    let ris = {}; try { ris = calcolaRisultatiPerStratiCorrenti(); } catch (e) { /* senza intervalli i calcoli mancano: si leggono solo i dati dello strato */ }
                    return state.strati.map((st, i) => {
                        const r = ris[st.id], o = { posizione: i + 1, id: st.id, nome: st.name, colore: st.color, comportamento: st.behavior || 'granulare', pattern: st.pattern || 'none' };
                        if (r) {
                            o.nsptFalda = r.agg.nsptFalda; o.nsptGrezzo = r.agg.nsptGrezzo;
                            o.parametri = {};
                            Object.keys(r.ris.categorie).forEach(cid => { const c = r.ris.categorie[cid]; if (c.candidati.length) o.parametri[cid] = { scelto: c.selezionato ? c.selezionato.index : null, candidati: c.candidati.map(k => [k.index, k.autore, k.valore]) }; });
                        }
                        return o;
                    });
                } },
                { n: 'scegli_parametro_avanzato', d: 'Sceglie per uno strato l\'autore (formula) di una categoria di parametro avanzato, usando gli indici di leggi_strati. indice null toglie la scelta.', p: { strato_id: { type: 'string' }, categoria: { type: 'string' }, indice: { type: 'integer' } }, req: ['strato_id', 'categoria', 'indice'], w: true,
                  ds: a => `Parametro avanzato «${a.categoria}» dello strato ${a.strato_id}: scegliere il candidato n. ${a.indice}`, run: a => {
                    const st = state.strati.find(x => x.id === a.strato_id);
                    if (!st) throw new Error('Strato non trovato.');
                    const r = calcolaRisultatiPerStratiCorrenti()[st.id];
                    const cat = r && r.ris.categorie[a.categoria];
                    if (!cat) throw new Error('Categoria sconosciuta o strato senza intervalli assegnati.');
                    if (a.indice == null) { delete ensureParametriAvanzati(st)[a.categoria]; }
                    else { if (!cat.candidati.some(k => k.index === a.indice)) throw new Error('Indice non valido per questa categoria.'); seleziona(st, a.categoria, a.indice); }
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true };
                } },
                { n: 'autocompila_parametri', d: 'Sceglie automaticamente le formule consigliate per i parametri avanzati ancora vuoti, di uno strato o di tutti.', p: { strato_id: { type: 'string' } }, w: true,
                  ds: a => a.strato_id ? `Compilare automaticamente i parametri avanzati dello strato ${a.strato_id}` : 'Compilare automaticamente i parametri avanzati di tutti gli strati', run: a => {
                    const lista = a.strato_id ? state.strati.filter(x => x.id === a.strato_id) : state.strati;
                    if (!lista.length) throw new Error('Strato non trovato.');
                    lista.forEach(st => { ensureParametriAvanzati(st); autoCompilaStrato(st); });
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true, strati: lista.length };
                } },
                { n: 'modifica_strato', d: 'Cambia nome, colore (#rrggbb) o comportamento (granulare/coesivo) di uno strato della prova aperta.', p: { strato_id: { type: 'string' }, nome: { type: 'string' }, colore: { type: 'string' }, comportamento: { type: 'string', enum: ['granulare', 'coesivo'] } }, req: ['strato_id'], w: true,
                  ds: a => `Modificare lo strato ${a.strato_id}:` + [a.nome && ` nome «${a.nome}»`, a.colore && ` colore ${a.colore}`, a.comportamento && ` comportamento ${a.comportamento}`].filter(Boolean).join(','), run: a => {
                    const st = state.strati.find(x => x.id === a.strato_id);
                    if (!st) throw new Error('Strato non trovato.');
                    if (a.colore != null && !/^#[0-9a-f]{6}$/i.test(a.colore)) throw new Error('Il colore deve essere #rrggbb.');
                    if (a.nome != null) { if (!String(a.nome).trim()) throw new Error('Nome vuoto.'); st.name = String(a.nome).trim(); }
                    if (a.colore != null) st.color = a.colore;
                    if (a.comportamento != null) { if (!['granulare', 'coesivo'].includes(a.comportamento)) throw new Error('Comportamento non valido.'); st.behavior = a.comportamento; }
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true };
                } },
                { n: 'aggiungi_strato', d: 'Aggiunge uno strato in fondo alla prova aperta.', p: { nome: { type: 'string' }, colore: { type: 'string' }, comportamento: { type: 'string', enum: ['granulare', 'coesivo'] } }, req: ['nome'], w: true,
                  ds: a => `Aggiungere lo strato «${a.nome}»`, run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    if (a.colore != null && !/^#[0-9a-f]{6}$/i.test(a.colore)) throw new Error('Il colore deve essere #rrggbb.');
                    const st = { id: 'strato_' + Date.now(), name: String(a.nome).trim() || 'Nuovo strato', color: a.colore || '#94a3b8', behavior: a.comportamento || 'granulare' };
                    state.strati.push(st); saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true, id: st.id };
                } },
                { n: 'sposta_strato', d: 'Sposta uno strato a una nuova posizione (1 = primo) nell\'elenco della prova aperta.', p: { strato_id: { type: 'string' }, posizione: { type: 'integer' } }, req: ['strato_id', 'posizione'], w: true,
                  ds: a => `Spostare lo strato ${a.strato_id} alla posizione ${a.posizione}`, run: a => {
                    const i = state.strati.findIndex(x => x.id === a.strato_id), j = a.posizione - 1;
                    if (i < 0) throw new Error('Strato non trovato.');
                    if (!Number.isInteger(j) || j < 0 || j >= state.strati.length) throw new Error('Posizione fuori elenco.');
                    state.strati.splice(j, 0, state.strati.splice(i, 1)[0]);
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true };
                } },
                { n: 'assegna_strato', d: 'Assegna uno strato a tutti gli intervalli della prova aperta compresi tra due profondità (metri).', p: { strato_id: { type: 'string' }, da_m: { type: 'number' }, a_m: { type: 'number' } }, req: ['strato_id', 'da_m', 'a_m'], w: true,
                  ds: a => `Assegnare lo strato ${a.strato_id} agli intervalli da ${a.da_m} a ${a.a_m} m`, run: a => {
                    if (!state.strati.some(x => x.id === a.strato_id)) throw new Error('Strato non trovato.');
                    let n = 0; state.logs.forEach(l => { if (l.end > a.da_m + 1e-6 && l.start < a.a_m - 1e-6) { l.lithology = a.strato_id; l.modificatoIl = new Date().toISOString(); n++; } });
                    if (!n) throw new Error('Nessun intervallo in quel tratto.');
                    saveState(); updateUI(); return { ok: true, intervalli: n };
                } },
                { n: 'modifica_intervallo', d: 'Modifica un intervallo della prova aperta (numero d\'ordine da 1): colpi e/o note.', p: { numero: { type: 'integer' }, colpi: { type: 'integer' }, note: { type: 'string' } }, req: ['numero'], w: true,
                  ds: a => `Modificare l'intervallo n. ${a.numero}:` + [a.colpi != null && ` colpi ${a.colpi}`, a.note != null && ` note «${a.note}»`].filter(Boolean).join(','), run: a => {
                    const l = state.logs[a.numero - 1];
                    if (!l) throw new Error('Intervallo non trovato.');
                    if (a.colpi != null && (!Number.isInteger(a.colpi) || a.colpi < 0 || a.colpi > 999)) throw new Error('Colpi non validi.');
                    const prima = misuraDiIntervallo(l);
                    if (a.colpi != null) l.colpi = a.colpi; if (a.note != null) l.note = String(a.note);
                    segnaIntervalloModificato(l, prima); saveState(); updateUI(); return { ok: true };
                } },
                // --- strumento, preferenze, progetto, note, GPS ---
                { n: 'leggi_strumento_e_preferenze', d: 'Legge i dati dello strumento della prova aperta e le preferenze dell\'app.', p: {}, run: () => ({ strumento: state.instrument, passoCm: state.settings.stepCm, operatore: state.settings.operator, vibrazione: !!state.settings.haptic, bip: !!state.settings.audio, schermoAcceso: !!state.settings.wakeLock, tema: state.settings.darkMode ? 'scuro' : 'chiaro', guanti: !!(document.getElementById('chkGloveMode') || {}).checked, tastoRegistra: state.settings.tastoRegistraVisibile !== false }) },
                { n: 'modifica_strumento', d: 'Cambia un dato dello strumento della prova aperta: pesoMassa, pesoAsta, lunghAsta, cambioAsta, pesoSistema, volata, passo, areaPunta, angoloPunta (numeri positivi).', p: { campo: { type: 'string', enum: ['pesoMassa', 'pesoAsta', 'lunghAsta', 'cambioAsta', 'pesoSistema', 'volata', 'passo', 'areaPunta', 'angoloPunta'] }, valore: { type: 'number' } }, req: ['campo', 'valore'], w: true,
                  ds: a => `Strumento: impostare ${a.campo} a ${a.valore}`, run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    if (!(a.campo in state.instrument)) throw new Error('Campo dello strumento non valido.');
                    if (!(typeof a.valore === 'number' && isFinite(a.valore) && a.valore > 0 && a.valore < 10000)) throw new Error('Il valore deve essere un numero positivo.');
                    state.instrument[a.campo] = a.valore; saveState(); updateUI(); return { ok: true };
                } },
                { n: 'imposta_preferenza', d: 'Cambia una preferenza dell\'app: vibrazione, bip, schermo_acceso, guanti, tasto_registra (valore true/false) oppure tema (valore «chiaro» o «scuro»).', p: { nome: { type: 'string', enum: ['vibrazione', 'bip', 'schermo_acceso', 'guanti', 'tasto_registra', 'tema'] }, valore: { type: 'string' } }, req: ['nome', 'valore'], w: true,
                  ds: a => `Preferenza «${a.nome}»: ${a.valore}`, run: a => {
                    if (a.nome === 'tema') {
                        const scuro = a.valore === 'scuro'; if (a.valore !== 'scuro' && a.valore !== 'chiaro') throw new Error('Il tema è «chiaro» o «scuro».');
                        if (!!state.settings.darkMode !== scuro) document.getElementById('btnThemeToggle').click(); return { ok: true };
                    }
                    const id = { vibrazione: 'chkHaptic', bip: 'chkAudio', schermo_acceso: 'chkWakeLock', guanti: 'chkGloveMode', tasto_registra: 'chkTastoRegistra' }[a.nome];
                    const el = id && document.getElementById(id); if (!el) throw new Error('Preferenza sconosciuta.');
                    el.checked = /^(true|si|sì|on|1)$/i.test(String(a.valore)); el.dispatchEvent(new Event('change', { bubbles: true })); return { ok: true, valore: el.checked };
                } },
                { n: 'modifica_progetto', d: 'Cambia un dato del progetto aperto: name, comune, committente, localita (le prove che non ne hanno una loro la seguono), date (AAAA-MM-GG) o operator.', p: { campo: { type: 'string', enum: ['name', 'comune', 'committente', 'localita', 'date', 'operator'] }, valore: { type: 'string' } }, req: ['campo', 'valore'], w: true,
                  ds: a => `Progetto: cambiare «${a.campo}» in «${a.valore}»`, run: a => {
                    const pr = (state.projects || {})[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    if (!['name', 'comune', 'committente', 'localita', 'date', 'operator'].includes(a.campo)) throw new Error('Campo non modificabile.');
                    if (a.campo === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(a.valore)) throw new Error('La data deve essere AAAA-MM-GG.');
                    saveState(); const vecchiaLoc = pr.localita || ''; pr[a.campo] = String(a.valore); pr.updatedAt = Date.now();
                    if (a.campo === 'localita') { Object.values(pr.surveys || {}).forEach(sv => { if (sv && sv.header && (sv.header.localita || '') === vecchiaLoc) sv.header.localita = String(a.valore); }); if ((state.header.localita || '') === vecchiaLoc) state.header.localita = String(a.valore); }
                    if (a.campo === 'comune' || a.campo === 'committente') { Object.values(pr.surveys || {}).forEach(sv => { if (sv && sv.header) sv.header[a.campo] = String(a.valore); }); state.header[a.campo] = String(a.valore); }
                    saveState(); updateUI(); return { ok: true };
                } },
                { n: 'leggi_note_progetto', d: 'Legge il testo delle note del progetto aperto.', p: {}, run: () => { const pr = (state.projects || {})[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.'); return { testo: pr.notes && pr.notes.html ? noteHtmlToPlainText(pr.notes.html).slice(0, 6000) : '' }; } },
                { n: 'aggiungi_nota_progetto', d: 'Aggiunge un paragrafo in fondo alle note del progetto aperto.', p: { testo: { type: 'string' } }, req: ['testo'], w: true,
                  ds: a => `Aggiungere alle note del progetto: «${String(a.testo).slice(0, 80)}»`, run: a => {
                    const pr = (state.projects || {})[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    const esc = String(a.testo).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                    pr.notes = pr.notes || {}; pr.notes.html = (pr.notes.html || '') + '<p>' + esc + '</p>'; pr.updatedAt = Date.now(); saveState(); return { ok: true };
                } },
                // --- eliminazioni: SOLO intervalli e strati, sempre con doppia conferma (la seconda in rosso).
                // Prove e progetti non si eliminano da qui (scelta di Romeo, 17/11/2026): si fa a mano con CANCELLA.
                { n: 'elimina_intervalli', d: 'ELIMINA gli intervalli della prova aperta dal numero da_numero al numero a_numero (da 1, estremi inclusi, al massimo 50). Azione distruttiva: usala solo se l\'utente lo chiede in modo esplicito.', p: { da_numero: { type: 'integer' }, a_numero: { type: 'integer' } }, req: ['da_numero', 'a_numero'], w: 'doppia',
                  ds: a => `Eliminare gli intervalli dal n. ${a.da_numero} al n. ${a.a_numero} della prova aperta`, run: async a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    const i = a.da_numero - 1, j = a.a_numero - 1;
                    if (!Number.isInteger(i) || !Number.isInteger(j) || i < 0 || j < i || j >= state.logs.length) throw new Error('Intervalli fuori elenco.');
                    if (j - i + 1 > 50) throw new Error('Al massimo 50 intervalli per volta.');
                    if (!(await copiaOChiedi('eliminare intervalli (assistente IA)'))) throw new Error('Copia di sicurezza non riuscita: eliminazione annullata.');
                    state.logs.splice(i, j - i + 1);
                    state.currentDepthStart = state.logs.length ? Math.max(...state.logs.map(l => l.end)) : 0;
                    state.currentRod = getRodForDepth(state.currentDepthStart + state.settings.stepCm / 100);
                    saveState(); updateUI(); return { ok: true, eliminati: j - i + 1, rimasti: state.logs.length };
                } },
                { n: 'elimina_strato', d: 'ELIMINA uno strato della prova aperta (gli intervalli che lo usavano restano senza strato). Azione distruttiva: usala solo se l\'utente lo chiede in modo esplicito.', p: { strato_id: { type: 'string' } }, req: ['strato_id'], w: 'doppia',
                  ds: a => { const st = (state.strati || []).find(x => x.id === a.strato_id); return `Eliminare lo strato «${st ? st.name : a.strato_id}» (gli intervalli assegnati restano senza strato)`; }, run: async a => {
                    const i = state.strati.findIndex(x => x.id === a.strato_id);
                    if (i < 0) throw new Error('Strato non trovato.');
                    if (!(await copiaOChiedi('eliminare uno strato (assistente IA)'))) throw new Error('Copia di sicurezza non riuscita: eliminazione annullata.');
                    state.logs.forEach(l => { if (l.lithology === a.strato_id) l.lithology = ''; });
                    state.strati.splice(i, 1);
                    if (!state.strati.length) state.strati.push({ id: 'strato_' + Date.now(), name: 'Strato 1', color: '#fbbf24' });
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList(); return { ok: true };
                } },
                // --- guidare la schermata: leggere cosa c'è e premere/compilare qualsiasi controllo dell'app,
                // così l'assistente può fare in più passaggi tutto ciò che si fa a mano. Le cose che
                // eliminano o azzerano restano escluse (si usano gli strumenti dedicati o si fa a mano).
                { n: 'leggi_schermata', d: 'Elenca cosa si vede ora: schermata, finestra aperta e i suoi controlli (pulsanti, campi, interruttori, menu) con un id da usare in clicca e compila_campo. Chiamala di nuovo dopo ogni azione: gli id cambiano.', p: {}, run: () => {
                    const aperte = Array.from(document.querySelectorAll('.modal.open, .drawer.open')).filter(e => !e.closest('#aiPannello, #aiWizOverlay'));
                    const radice = aperte.length ? aperte[aperte.length - 1] : (document.getElementById(({ home: 'viewHome', project: 'viewProject', field: 'viewField' })[(state.uiState || {}).currentView]) || document.body);
                    aiUiMappa = [];
                    Array.from(radice.querySelectorAll('button, input, select, textarea, [role=button], [role=menuitem]')).forEach(e => {
                        if (e.closest('#aiPannello, #aiWizOverlay') || e.type === 'hidden' || !aiVisibile(e)) return;
                        if (aiUiMappa.length >= 90) return;
                        const tipo = e.tagName === 'SELECT' ? 'menu' : e.tagName === 'TEXTAREA' ? 'testo' : e.tagName === 'INPUT' ? (e.type === 'checkbox' || e.type === 'radio' ? e.type : 'campo') : 'pulsante';
                        const riga = e.closest('.setting-row, .form-group, .field-row');
                        const lab = [e.getAttribute('aria-label'), e.title, e.textContent, e.placeholder, e.labels && e.labels[0] && e.labels[0].textContent, riga && (riga.querySelector('.setting-label, label') || {}).textContent, e.id].map(x => String(x || '').replace(/\s+/g, ' ').trim()).find(x => x).slice(0, 70) || '';
                        const o = { id: aiUiMappa.length, tipo, etichetta: lab };
                        if (tipo === 'campo' || tipo === 'testo' || tipo === 'menu') o.valore = String(e.value).slice(0, 60);
                        if (tipo === 'menu') o.opzioni = Array.from(e.options).slice(0, 15).map(x => x.textContent.trim());
                        if (tipo === 'checkbox' || tipo === 'radio') o.attivo = e.checked;
                        if (e.disabled) o.disabilitato = true;
                        aiUiMappa.push(e); aiUiSchede[o.id] = o;
                    });
                    return { vista: (state.uiState || {}).currentView, finestra: aperte.length ? ((aperte[aperte.length - 1].querySelector('.modal-title, .drawer-title') || {}).textContent || aperte[aperte.length - 1].id || '').replace(/\s+/g, ' ').trim() : null, controlli: aiUiMappa.map((_, i) => aiUiSchede[i]) };
                } },
                { n: 'clicca', d: 'Preme un controllo di leggi_schermata (id). Non preme controlli che eliminano o azzerano.', p: { id: { type: 'integer' } }, req: ['id'],
                  w: a => !aiUiSicuro(a.id), ds: a => `Premere «${(aiUiSchede[a.id] || {}).etichetta || a.id}»`, run: a => {
                    const e = aiUiMappa[a.id]; if (!e || !document.contains(e)) throw new Error('Controllo non più presente: richiama leggi_schermata.');
                    if (aiUiVietato(a.id)) throw new Error('Questo controllo elimina o azzera dati: usa gli strumenti di eliminazione (con doppia conferma) o chiedi all\'utente di farlo a mano.');
                    if (e.disabled) throw new Error('Il controllo è disabilitato.');
                    e.click(); return { ok: true };
                } },
                { n: 'compila_campo', d: 'Scrive un valore in un campo, menu (testo dell\'opzione) o interruttore (true/false) di leggi_schermata (id).', p: { id: { type: 'integer' }, valore: { type: 'string' } }, req: ['id', 'valore'], w: true,
                  ds: a => `Scrivere «${String(a.valore).slice(0, 60)}» in «${(aiUiSchede[a.id] || {}).etichetta || a.id}»`, run: a => {
                    const e = aiUiMappa[a.id]; if (!e || !document.contains(e)) throw new Error('Controllo non più presente: richiama leggi_schermata.');
                    if (aiUiVietato(a.id)) throw new Error('Controllo non modificabile da qui.');
                    if (e.disabled) throw new Error('Il controllo è disabilitato.');
                    if (e.tagName === 'SELECT') { const o = Array.from(e.options).find(x => x.textContent.trim().toLowerCase() === String(a.valore).trim().toLowerCase() || x.value === a.valore); if (!o) throw new Error('Opzione non trovata.'); e.value = o.value; }
                    else if (e.type === 'checkbox') e.checked = /^(true|si|sì|on|1)$/i.test(a.valore);
                    else if (e.type === 'radio') e.checked = true;
                    else e.value = a.valore;
                    e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })); return { ok: true };
                } },
                { n: 'imposta_gps', d: 'Imposta la posizione GPS della prova aperta (gradi decimali).', p: { lat: { type: 'number' }, lng: { type: 'number' }, quota_m: { type: 'number' } }, req: ['lat', 'lng'], w: true,
                  ds: a => `Impostare il GPS della prova a ${a.lat}, ${a.lng}`, run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    if (!(Math.abs(a.lat) <= 90 && Math.abs(a.lng) <= 180)) throw new Error('Coordinate non valide.');
                    state.header.lat = a.lat; state.header.lng = a.lng; if (a.quota_m != null) state.header.alt = a.quota_m; saveState(); updateUI(); return { ok: true };
                } }
            ];
            const aiMsgSistema = () => 'Sei l\'assistente integrato in DPSH, un\'app per prove penetrometriche dinamiche (DPSH) in cantiere. Rispondi sempre in italiano, in modo breve e concreto. ' +
                'REGOLA PRINCIPALE: se l\'utente chiede di fare qualcosa, LA FAI TU con gli strumenti. Non dirgli mai di premere, cliccare, aprire un menu, andare su una schermata o compilare un campo: fallo tu e poi riassumi in una frase cosa hai fatto. Chiedi all\'utente solo i dati che mancano davvero. ' +
                'Usa gli strumenti per leggere i dati reali: non inventare mai numeri, profondità o colpi. Profondità in metri, colpi per intervallo di avanzamento. ' +
                'Per le modifiche chiama lo strumento giusto: l\'app chiede la conferma all\'utente, non chiederla tu a parole. Puoi eliminare solo intervalli e strati, solo su richiesta esplicita, e l\'app chiede due conferme; prove e progetti non si eliminano da qui: spiega che serve farlo a mano scrivendo CANCELLA. Per i parametri avanzati leggi prima gli strati (leggi_strati) e usa gli indici che ti dà. ' +
                'Se non c\'è uno strumento diretto per l\'azione: prima prova elenco_comandi/esegui_comando o vai_a; altrimenti usa leggi_schermata, poi clicca e compila_campo, e rileggi la schermata dopo ogni azione (e dopo ogni apertura di finestra) finché il lavoro non è finito. ' +
                'Se uno strumento dà errore, riprova in un altro modo prima di arrenderti; solo se non è possibile dillo e proponi un\'alternativa. Stato attuale: ' + JSON.stringify(AI_STRUMENTI[0].run());

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
            const aiBtnCron = aiEl('button', null, 'Cronologia'), aiBtnNuova = aiEl('button', null, '+ Nuova'), aiBtnChiudi = aiEl('button', null, '✕'); aiBtnChiudi.setAttribute('aria-label', 'Chiudi');
            aiTesta.append(aiBtnCron, aiBtnNuova, aiBtnChiudi);
            const aiSub = aiEl('div', 'ai-sub'), aiChip = aiEl('div', 'ai-chip-prog');
            const aiSelProv = aiEl('select'), aiSelMod = aiEl('select'); aiSelProv.setAttribute('aria-label', 'Provider'); aiSelMod.setAttribute('aria-label', 'Modello');
            const aiRigaSel = aiEl('div', 'ai-sel'); aiRigaSel.append(aiSelProv, aiSelMod);
            aiSub.append(aiChip, aiRigaSel);
            const aiElencoCron = aiEl('div', 'ai-cron'); // elenco delle chat del progetto, sopra la chat
            const aiChat = aiEl('div', 'ai-chat'); aiChat.setAttribute('aria-live', 'polite');
            const aiPiedi = aiEl('div', 'ai-piedi');
            const aiCampo = aiEl('textarea'); aiCampo.placeholder = 'Chiedi o ordina qualcosa…'; aiCampo.rows = 1;
            const aiInvia = aiEl('button', null, 'Invia');
            aiPiedi.append(aiCampo, aiInvia);
            aiPannello.append(aiTesta, aiSub, aiElencoCron, aiChat, aiPiedi);
            document.body.append(aiBolla, aiPannello);

            // CRONOLOGIA PER PROGETTO: le chat si salvano in una voce propria del localStorage (come le chiavi,
            // fuori da backup e condivisioni), divise per progetto. Una chat per volta è «attiva».
            const AI_CRONO_CHIAVE = 'DPSH_AI_CRONO_V1', AI_MAX_CHAT = 25, AI_MAX_RIGHE = 80;
            let aiArchivio = {};
            try { const g = JSON.parse(localStorage.getItem(AI_CRONO_CHIAVE) || 'null'); if (g && typeof g === 'object') aiArchivio = g; } catch (e) { /* voce rovinata: si riparte vuoti */ }
            const aiPidAtt = () => state.currentProjectId || '_';
            const aiNomeProg = pid => pid === '_' ? 'Nessun progetto aperto' : (((state.projects || {})[pid] || {}).name || 'Progetto');
            function aiScriviArchivio() { try { localStorage.setItem(AI_CRONO_CHIAVE, JSON.stringify(aiArchivio)); } catch (e) { /* spazio pieno: la chat resta solo a schermo */ } }
            let aiCrono = [], aiOccupato = false, aiChatAtt = null;
            const aiNuovaChat = pid => ({ id: 'c' + Date.now(), pid, titolo: '', ts: Date.now(), vista: [], crono: [] });
            function aiSalvaChat() {
                if (!aiChatAtt || !aiChatAtt.crono.some(m => m.r === 'u')) return;
                // chat nata senza progetto che ne crea uno: da qui in poi appartiene a quel progetto
                if (aiChatAtt.pid === '_' && state.currentProjectId) { aiArchivio._ = (aiArchivio._ || []).filter(c => c.id !== aiChatAtt.id); aiChatAtt.pid = state.currentProjectId; aiChip.textContent = 'Progetto: ' + aiNomeProg(aiChatAtt.pid); }
                aiChatAtt.crono = aiCrono; aiChatAtt.vista = aiChatAtt.vista.slice(-AI_MAX_RIGHE);
                if (!aiChatAtt.titolo) aiChatAtt.titolo = (aiCrono.find(m => m.r === 'u') || {}).t.slice(0, 48);
                const lista = aiArchivio[aiChatAtt.pid] = (aiArchivio[aiChatAtt.pid] || []).filter(c => c.id !== aiChatAtt.id);
                lista.unshift(aiChatAtt); lista.length = Math.min(lista.length, AI_MAX_CHAT);
                aiScriviArchivio();
            }
            function aiMsg(cls, testo, salva) {
                const m = aiEl('div', 'ai-msg ' + cls, testo); aiChat.appendChild(m); aiChat.scrollTop = aiChat.scrollHeight;
                if (salva !== false && aiChatAtt && cls !== 'attesa') { aiChatAtt.vista.push([cls, testo]); aiSalvaChat(); }
                return m;
            }
            function aiMostraChat(c) {
                aiChatAtt = c; aiCrono = c.crono;
                aiChat.textContent = '';
                c.vista.forEach(([cls, t]) => aiChat.appendChild(aiEl('div', 'ai-msg ' + cls, t)));
                if (!c.vista.length) aiChat.appendChild(aiEl('div', 'ai-msg info', 'Posso leggere i dati di questo progetto, aprire schermate e, con la tua conferma, modificare prove, strati e parametri.'));
                aiChat.scrollTop = aiChat.scrollHeight; aiElencoCron.classList.remove('aperto');
            }
            function aiSaluto() { aiMostraChat(aiNuovaChat(aiPidAtt())); }
            function aiAggiornaTesta() {
                aiChip.textContent = 'Progetto: ' + aiNomeProg(aiChatAtt ? aiChatAtt.pid : aiPidAtt());
                const pronti = aiProntiInOrdine();
                aiSelProv.textContent = '';
                pronti.forEach(id => { const o = aiEl('option', null, aiDef(id).nome); o.value = id; aiSelProv.appendChild(o); });
                if (!pronti.length) aiSelProv.appendChild(aiEl('option', null, 'Nessun provider'));
                aiSelProv.disabled = !pronti.length; aiSelMod.disabled = !pronti.length;
                if (pronti.length) aiCaricaModelli(pronti[0]);
            }
            const aiCacheModelli = {};
            async function aiCaricaModelli(id) {
                const c = aiConf(id); aiSelMod.textContent = '';
                const metti = el => { aiSelMod.textContent = ''; el.forEach(m => { const o = aiEl('option', null, m.nome); o.value = m.id; aiSelMod.appendChild(o); }); aiSelMod.value = c.modello; };
                metti([{ id: c.modello, nome: c.modello }]);
                try {
                    if (!aiCacheModelli[id]) aiCacheModelli[id] = await aiElencoModelli(id, { chiave: c.chiave || '', base: c.base || '' });
                    const el = aiCacheModelli[id].slice(); if (!el.some(m => m.id === c.modello)) el.unshift({ id: c.modello, nome: c.modello });
                    if (aiSelProv.value === id) metti(el);
                } catch (e) { /* elenco non disponibile ora: resta il modello salvato */ }
            }
            aiSelProv.onchange = () => { const id = aiSelProv.value; aiCfg.ordine = [id].concat(aiCfg.ordine.filter(x => x !== id)); aiSalva(); aiAggiornaTesta(); };
            aiSelMod.onchange = () => { const id = aiSelProv.value; if (id && aiSelMod.value) { aiConf(id).modello = aiSelMod.value; aiSalva(); } };
            function aiMostraCronologia() {
                aiElencoCron.textContent = '';
                const lista = (aiArchivio[aiPidAtt()] || []);
                aiElencoCron.appendChild(aiEl('div', 'ai-cron-tit', 'Chat di «' + aiNomeProg(aiPidAtt()) + '»'));
                if (!lista.length) aiElencoCron.appendChild(aiEl('div', 'ai-cron-vuota', 'Nessuna chat salvata per questo progetto.'));
                lista.forEach(c => {
                    const r = aiEl('div', 'ai-cron-riga'), b = aiEl('button', 'ai-cron-apri'), x = aiEl('button', 'ai-cron-x', '✕');
                    b.append(aiEl('span', null, c.titolo || 'Chat'), aiEl('small', null, new Date(c.ts).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })));
                    b.onclick = () => { if (!aiOccupato) aiMostraChat(c); };
                    x.setAttribute('aria-label', 'Elimina questa chat'); x.onclick = () => { aiArchivio[aiPidAtt()] = lista.filter(k => k.id !== c.id); aiScriviArchivio(); if (aiChatAtt && aiChatAtt.id === c.id) aiSaluto(); aiMostraCronologia(); };
                    r.append(b, x); aiElencoCron.appendChild(r);
                });
                aiElencoCron.classList.add('aperto');
            }
            aiBtnCron.onclick = () => { if (aiElencoCron.classList.contains('aperto')) aiElencoCron.classList.remove('aperto'); else aiMostraCronologia(); };
            function aiConferma(testo, pericolo) {
                return new Promise(res => {
                    const testoM = pericolo ? 'ATTENZIONE, ultima conferma: ' + testo : 'L\'assistente vuole: ' + testo;
                    const m = aiMsg(pericolo ? 'errore' : 'azione', pericolo ? 'ATTENZIONE, ultima conferma: ' + testo + '. L\'app fa prima una copia automatica, ma l\'azione non si annulla da qui.' : 'L\'assistente vuole: ' + testo, false);
                    const riga = aiEl('div', 'ai-conferma'), si = aiEl('button', 'si', 'Conferma'), no = aiEl('button', null, 'Annulla');
                    riga.append(no, si); m.appendChild(riga);
                    const fine = v => { riga.remove(); m.appendChild(aiEl('div', null, v ? '✓ Confermato' : '✕ Annullato')); if (aiChatAtt) { aiChatAtt.vista.push([pericolo ? 'errore' : 'azione', testoM + (v ? ' — ✓ Confermato' : ' — ✕ Annullato')]); aiSalvaChat(); } res(v); };
                    si.onclick = () => fine(true); no.onclick = () => fine(false);
                });
            }
            async function aiEseguiStrumento(k) {
                const s = AI_STRUMENTI.find(x => x.n === k.n);
                if (!s) return { c: JSON.stringify({ errore: 'Strumento sconosciuto.' }) };
                const args = (k.a && typeof k.a === 'object') ? k.a : {};
                const serveConferma = typeof s.w === 'function' ? s.w(args) : !!s.w;
                if (serveConferma && !(await aiConferma(s.ds ? s.ds(args) : s.n))) return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                if (s.w === 'doppia' && !(await aiConferma(s.ds(args), true))) return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                try { const out = await s.run(args); if (serveConferma) aiMsg('info', '✓ ' + (s.ds ? s.ds(args) : s.n)); return { c: JSON.stringify(out === undefined ? { ok: true } : out) }; }
                catch (e) { return { c: JSON.stringify({ errore: e.message }) }; }
            }
            // vero se la risposta spiega all'utente cosa premere invece di farlo (l'assistente deve agire da sé)
            const aiDaIstruzioni = t => /\b(premi|clicca|cliccare|tocca|apri il menu|apri le impostazioni|vai (su|in|nel|alla|a)|seleziona|scegli la voce|puoi (premere|cliccare|aprire))\b/i.test(t || '');
            async function aiInviaDomanda() {
                const testo = aiCampo.value.trim();
                if (!testo || aiOccupato) return;
                if (!aiChatAtt) aiSaluto();
                aiCampo.value = ''; aiCrono.push({ r: 'u', t: testo }); aiChatAtt.crono = aiCrono; aiMsg('utente', testo);
                aiOccupato = true; aiInvia.disabled = true;
                const attesa = aiMsg('attesa info', 'Penso…', false);
                let spinto = false;
                try {
                    for (let giro = 0; giro < AI_MAX_GIRI; giro++) {
                        const r = await aiChiamaConFallback(aiCrono, t => aiMsg('info', t));
                        aiCrono.push({ r: 'a', t: r.t, calls: r.calls });
                        if (r.t) aiMsg('ia', r.t);
                        if (!r.calls.length) {
                            if (!spinto && aiDaIstruzioni(r.t)) { spinto = true; aiCrono.push({ r: 'u', t: 'Non dirmi come fare: fallo tu adesso con gli strumenti (esegui_comando, vai_a, leggi_schermata, clicca, compila_campo) e poi dimmi in una frase cosa hai fatto.' }); continue; }
                            break;
                        }
                        const res = [];
                        for (const k of r.calls) { const o = await aiEseguiStrumento(k); res.push({ id: k.id, n: k.n, c: o.c }); }
                        aiCrono.push({ r: 't', res });
                        if (giro === AI_MAX_GIRI - 1) aiMsg('info', 'Mi fermo qui: troppi passaggi di fila.');
                    }
                } catch (e) { aiMsg('errore', e.message); }
                aiSalvaChat(); attesa.remove(); aiOccupato = false; aiInvia.disabled = false; aiCampo.focus();
            }
            aiInvia.onclick = aiInviaDomanda;
            aiCampo.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); aiInviaDomanda(); } });
            aiBtnNuova.onclick = () => { if (!aiOccupato) { aiSaluto(); aiAggiornaTesta(); } };
            const aiApri = su => {
                aiPannello.classList.toggle('aperto', su);
                aiBollaAssesta();
                if (!su) return;
                aiPosizionaPannello(); aiRinfresca(true);
                const pid = aiPidAtt();
                if (!aiChatAtt || aiChatAtt.pid !== pid) { const ultima = (aiArchivio[pid] || [])[0]; if (ultima) aiMostraChat(ultima); else aiSaluto(); }
                aiAggiornaTesta();
                if (!aiProntiInOrdine().length) aiMsg('info', 'Prima scegli un provider da Impostazioni › Assistente IA.', false);
                setTimeout(() => aiCampo.focus(), 50);
            };
            aiBolla.onclick = () => { if (aiDopoTrascina) return; aiApri(!aiPannello.classList.contains('aperto')); };
            // POSIZIONE LIBERA: il pannello si trascina dalla testa; la bolla si trascina e si «attacca» al bordo
            // sinistro o destro (molla con un po' di rimbalzo). Posizione ricordata sul dispositivo.
            const AI_POS_CHIAVE = 'DPSH_AI_POS_V1';
            let aiPos = {};
            try { const g = JSON.parse(localStorage.getItem(AI_POS_CHIAVE) || 'null'); if (g && typeof g === 'object') aiPos = g; } catch (e) { /* senza posizione salvata */ }
            const aiSalvaPos = () => { try { localStorage.setItem(AI_POS_CHIAVE, JSON.stringify(aiPos)); } catch (e) { /* non grave */ } };
            const aiLimita = (el, x, y) => { const w = el.offsetWidth || 52, h = el.offsetHeight || 52; return { x: Math.max(4, Math.min(innerWidth - w - 4, x)), y: Math.max(4, Math.min(innerHeight - h - 4, y)) }; };
            const aiPonia = (el, k) => { const p = aiPos[k]; if (!p) return; const c = aiLimita(el, p.x, p.y); el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; };
            let aiDopoTrascina = false;
            function aiRendiTrascinabile(el, maniglia, k) {
                maniglia.style.touchAction = 'none';
                maniglia.addEventListener('pointerdown', e => {
                    if (e.button > 0 || (e.target.closest && e.target.closest('button') && e.target !== maniglia && maniglia !== el)) return;
                    const r = el.getBoundingClientRect(), dx = e.clientX - r.left, dy = e.clientY - r.top, x0 = e.clientX, y0 = e.clientY; let mosso = false;
                    const muovi = ev => {
                        if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
                        mosso = true; const c = aiLimita(el, ev.clientX - dx, ev.clientY - dy);
                        el.style.left = c.x + 'px'; el.style.top = c.y + 'px'; el.style.right = 'auto'; el.style.bottom = 'auto'; aiPos[k] = c;
                    };
                    const fine = () => {
                        removeEventListener('pointermove', muovi); removeEventListener('pointerup', fine); removeEventListener('pointercancel', fine);
                        if (mosso) { aiSalvaPos(); aiDopoTrascina = true; setTimeout(() => { aiDopoTrascina = false; }, 0); }
                    };
                    addEventListener('pointermove', muovi); addEventListener('pointerup', fine); addEventListener('pointercancel', fine);
                });
            }
            aiRendiTrascinabile(aiPannello, aiTesta, 'pannello');
            aiTesta.classList.add('ai-presa');

            // --- bolla magnetica e «gommosa» ---
            // Calcolo puro: dato il rettangolo della bolla, lo schermo e i margini sicuri, dice da che lato
            // si attacca (s = sinistra, d = destra) e dove si ferma (x, y a bolla intera, mai sotto barre o notch).
            const AI_MARGINE = 6, AI_NASCOSTA = 0.42;
            function aiSnap(p) {
                const w = p.w || 52, h = p.h || 52, ins = p.inset || {}, m = p.margine == null ? AI_MARGINE : p.margine;
                const l = ins.l || 0, r = ins.r || 0, t = ins.t || 0, b = ins.b || 0;
                const lato = p.x + w / 2 < p.vw / 2 ? 's' : 'd';
                const x = lato === 's' ? l + m : p.vw - w - r - m;
                const yMin = t + m, yMax = Math.max(yMin, p.vh - h - b - m);
                return { lato, x, y: Math.max(yMin, Math.min(yMax, p.y)) };
            }
            const aiRidotto = () => { try { return !!(matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } };
            const aiGoo = aiEl('span', 'ai-goo'); aiGoo.setAttribute('aria-hidden', 'true');
            const aiNumBolla = aiEl('span', 'ai-bolla-n'); aiNumBolla.setAttribute('aria-hidden', 'true');
            aiBolla.append(aiGoo, aiNumBolla);
            const aiB = { lato: 'd', lx: 0, ly: 0, ox: 0, oy: 0, vx: 0, vy: 0, trasc: false, raf: 0, ult: 0, px: 0, py: 0, ins: null };
            // Margini sicuri: notch/barra di sistema (env) e barre fisse dell'app in alto e in basso. Misurati solo a fine trascinamento.
            function aiMargini() {
                const ins = { t: 0, b: 0, l: 0, r: 0 };
                try {
                    const s = document.createElement('div'); s.style.cssText = 'position:fixed;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top,0px) env(safe-area-inset-right,0px) env(safe-area-inset-bottom,0px) env(safe-area-inset-left,0px)';
                    document.body.appendChild(s); const cs = getComputedStyle(s);
                    ins.t = parseFloat(cs.paddingTop) || 0; ins.r = parseFloat(cs.paddingRight) || 0; ins.b = parseFloat(cs.paddingBottom) || 0; ins.l = parseFloat(cs.paddingLeft) || 0; s.remove();
                    document.querySelectorAll('.pc-barra, .pc-stato').forEach(e => {
                        const r = e.getBoundingClientRect(); if (!r.width || !r.height || r.height > innerHeight / 3) return;
                        if (r.top <= 1) ins.t = Math.max(ins.t, r.bottom); else if (r.bottom >= innerHeight - 1) ins.b = Math.max(ins.b, innerHeight - r.top);
                    });
                } catch (e) { /* senza misure si usano i margini minimi */ }
                return ins;
            }
            const aiBVisibile = () => !aiPannello.classList.contains('aperto') && !aiB.trasc;
            const aiBTargetX = () => aiBVisibile() ? (aiB.lato === 's' ? -1 : 1) * AI_NASCOSTA * (aiBolla.offsetWidth || 52) : 0;
            // Disegno: SOLO transform e opacity. Si allunga lungo la velocità, si schiaccia di lato, si «scioglie» sul bordo.
            function aiBDisegna() {
                const tx = aiBTargetX(), w = aiBolla.offsetWidth || 52, ridotto = aiRidotto();
                let tr = 'translate3d(' + aiB.ox.toFixed(1) + 'px,' + aiB.oy.toFixed(1) + 'px,0)', g = 0;
                if (!ridotto) {
                    const v = Math.hypot(aiB.vx, aiB.vy), st = Math.min(0.32, v / 3200), a = Math.atan2(aiB.vy, aiB.vx);
                    const lungo = (aiB.lato === 's' ? -aiB.ox : aiB.ox) / w; // >0 verso il bordo (nascosta o in rimbalzo contro il muro)
                    const bordo = Math.max(0, Math.min(1, lungo / AI_NASCOSTA));
                    g = bordo;
                    tr += ' scale(' + (1 - 0.1 * bordo).toFixed(3) + ',' + (1 + 0.06 * bordo).toFixed(3) + ')';
                    if (st > 0.01) tr += ' rotate(' + a.toFixed(3) + 'rad) scale(' + (1 + st).toFixed(3) + ',' + (1 / (1 + st)).toFixed(3) + ') rotate(' + (-a).toFixed(3) + 'rad)';
                }
                aiBolla.style.transform = tr;
                aiGoo.style.opacity = g.toFixed(2);
                aiGoo.style.transform = 'scale(' + (0.4 + 0.6 * g).toFixed(2) + ',' + (0.7 + 0.5 * g).toFixed(2) + ')';
                return tx;
            }
            function aiBTick(t) {
                aiB.raf = 0;
                const dt = Math.min(0.032, Math.max(0.001, (t - (aiB.ult || t - 16)) / 1000)); aiB.ult = t;
                let vivo = false;
                if (aiB.trasc) {
                    const nx = aiB.px - aiB.lx, ny = aiB.py - aiB.ly, k = Math.min(1, dt * 14);
                    aiB.vx += ((nx - aiB.ox) / dt - aiB.vx) * k; aiB.vy += ((ny - aiB.oy) / dt - aiB.vy) * k; aiB.ox = nx; aiB.oy = ny; vivo = true;
                } else {
                    const tx = aiBTargetX(), K = 260, C = 17;
                    aiB.vx += (-K * (aiB.ox - tx) - C * aiB.vx) * dt; aiB.vy += (-K * aiB.oy - C * aiB.vy) * dt;
                    aiB.ox += aiB.vx * dt; aiB.oy += aiB.vy * dt;
                    vivo = Math.abs(aiB.ox - tx) > 0.3 || Math.abs(aiB.oy) > 0.3 || Math.abs(aiB.vx) > 6 || Math.abs(aiB.vy) > 6;
                    if (!vivo) { aiB.ox = tx; aiB.oy = 0; aiB.vx = aiB.vy = 0; }
                }
                aiBDisegna();
                if (vivo) aiB.raf = requestAnimationFrame(aiBTick); else aiB.ult = 0;
            }
            function aiBAvvia() {
                if (aiRidotto() || typeof requestAnimationFrame !== 'function') { aiB.ox = aiBTargetX(); aiB.oy = 0; aiB.vx = aiB.vy = 0; aiBDisegna(); return; }
                if (!aiB.raf) aiB.raf = requestAnimationFrame(aiBTick);
            }
            // a pannello aperto/chiuso la bolla esce o rientra nel bordo
            function aiBollaAssesta() { if (!aiB.trasc) aiBAvvia(); }
            function aiBollaMetti() { aiBolla.dataset.lato = aiB.lato; aiBolla.style.left = aiB.lx + 'px'; aiBolla.style.top = aiB.ly + 'px'; aiBolla.style.right = 'auto'; aiBolla.style.bottom = 'auto'; }
            function aiBollaRiadatta(salva) {
                const w = aiBolla.offsetWidth || 52, h = aiBolla.offsetHeight || 52, p = aiPos.bolla;
                aiB.ins = aiMargini();
                const x = p ? p.x : (aiB.lato === 's' ? 0 : innerWidth), y = p && p.y != null ? p.y : innerHeight - h - 16 - aiB.ins.b;
                const s = aiSnap({ x: p && p.lato ? (p.lato === 's' ? 0 : innerWidth) : x, y, w, h, vw: innerWidth, vh: innerHeight, inset: aiB.ins });
                aiB.lato = s.lato; aiB.lx = s.x; aiB.ly = s.y; aiB.ox = 0; aiB.oy = 0; aiB.vx = aiB.vy = 0;
                aiBollaMetti(); if (salva) { aiPos.bolla = { x: s.x, y: s.y, lato: s.lato }; aiSalvaPos(); }
                aiB.ox = aiBTargetX(); aiBDisegna();
            }
            aiBolla.addEventListener('pointerdown', e => {
                if (e.button > 0) return;
                const x0 = e.clientX, y0 = e.clientY, dx = x0 - aiB.lx, dy = y0 - aiB.ly; let mosso = false;
                try { if (e.pointerId != null && aiBolla.setPointerCapture) aiBolla.setPointerCapture(e.pointerId); } catch (er) { /* niente cattura: si va avanti lo stesso */ }
                const muovi = ev => {
                    if (!mosso && Math.hypot(ev.clientX - x0, ev.clientY - y0) < 6) return;
                    if (!mosso) { mosso = true; aiB.trasc = true; aiB.ult = 0; }
                    aiB.px = ev.clientX - dx; aiB.py = ev.clientY - dy;
                    aiB.px = Math.max(-20, Math.min(innerWidth - 32, aiB.px)); aiB.py = Math.max(0, Math.min(innerHeight - 32, aiB.py));
                    if (aiRidotto() || typeof requestAnimationFrame !== 'function') { aiB.ox = aiB.px - aiB.lx; aiB.oy = aiB.py - aiB.ly; aiBDisegna(); } else if (!aiB.raf) aiB.raf = requestAnimationFrame(aiBTick);
                };
                const fine = () => {
                    removeEventListener('pointermove', muovi); removeEventListener('pointerup', fine); removeEventListener('pointercancel', fine);
                    if (!mosso) return;
                    aiDopoTrascina = true; setTimeout(() => { aiDopoTrascina = false; }, 0);
                    const w = aiBolla.offsetWidth || 52, h = aiBolla.offsetHeight || 52, ridotto = aiRidotto();
                    const cx = aiB.lx + aiB.ox, cy = aiB.ly + aiB.oy;
                    aiB.ins = aiMargini();
                    const s = aiSnap({ x: cx + (ridotto ? 0 : aiB.vx * 0.12), y: cy, w, h, vw: innerWidth, vh: innerHeight, inset: aiB.ins });
                    aiB.trasc = false; aiB.ox = cx - s.x; aiB.oy = cy - s.y; aiB.lato = s.lato; aiB.lx = s.x; aiB.ly = s.y;
                    aiBollaMetti(); aiPos.bolla = { x: s.x, y: s.y, lato: s.lato }; aiSalvaPos();
                    aiBAvvia();
                };
                addEventListener('pointermove', muovi); addEventListener('pointerup', fine); addEventListener('pointercancel', fine);
            });
            // il pannello nuovo si apre accanto alla bolla, a meno che l'utente non l'abbia già spostato
            const aiPosizionaPannello = () => {
                if (aiPos.pannello) { aiPonia(aiPannello, 'pannello'); return; }
                const w = aiPannello.offsetWidth || 400, h = aiPannello.offsetHeight || 560, bw = aiBolla.offsetWidth || 52, bh = aiBolla.offsetHeight || 52;
                const c = aiLimita(aiPannello, aiB.lato === 's' ? aiB.lx : aiB.lx + bw - w, aiB.ly - h - 10 < 4 ? aiB.ly + bh + 10 : aiB.ly - h - 10);
                aiPannello.style.left = c.x + 'px'; aiPannello.style.top = c.y + 'px'; aiPannello.style.right = 'auto'; aiPannello.style.bottom = 'auto';
            };
            let aiRiadTimer = 0;
            const aiRiadatta = () => {
                clearTimeout(aiRiadTimer);
                aiRiadTimer = setTimeout(() => { aiBollaRiadatta(false); aiPonia(aiPannello, 'pannello'); if (aiPannello.classList.contains('aperto')) aiPosizionaPannello(); }, 60);
            };
            addEventListener('resize', aiRiadatta); addEventListener('orientationchange', aiRiadatta);
            aiBollaRiadatta(false);

            // --- bolla «intelligente»: sa dove sei e cosa manca, e propone 1-3 scorciatoie (calcolate qui, senza IA) ---
            // Contesto letto con le stesse funzioni degli strumenti (aiSchedaProva); suggerimenti = funzione pura sul contesto.
            function aiContesto() {
                const vista = (state.uiState || {}).currentView || 'home', pid = state.currentProjectId, proj = (state.projects || {})[pid];
                const c = { vista, progettoId: pid || null, nProgetti: Object.keys(state.projects || {}).length, haProgetto: vista !== 'home' && !!proj, haProva: false, gps: true, strati: 0, intervalli: 0, senzaGps: [], backup: null };
                if (c.haProgetto) Object.keys(proj.surveys || {}).forEach(sid => { const s = aiSchedaProva(pid, sid, false); if (s && !s.gps) c.senzaGps.push(sid); });
                if (vista === 'field' && state.currentSurveyId) {
                    c.haProva = true; c.provaId = state.currentSurveyId; c.gps = (state.header || {}).lat != null;
                    c.strati = (state.strati || []).length; c.intervalli = (state.logs || []).length;
                }
                try { if (typeof promemoriaBackup === 'function') c.backup = promemoriaBackup(state.projects, state.ultimoBackupCompleto, Date.now(), 7); } catch (e) { /* senza promemoria */ }
                return c;
            }
            function aiSuggerimenti(c) {
                const out = [], add = s => { if (out.length < 3 && !out.some(o => o.id === s.id)) out.push(s); };
                if (c.vista === 'home') {
                    if (!c.nProgetti) add({ id: 'nuovo', testo: 'Crea il primo progetto', cmd: 'Nuovo progetto' });
                    else if (c.backup) add({ id: 'backup', testo: 'Fai il backup', cmd: 'Backup completo dell\'archivio' });
                    if (c.nProgetti) add({ id: 'riepilogo', testo: 'Riepilogo dei progetti', chiedi: 'Fammi un riepilogo breve dei miei progetti.' });
                    return out;
                }
                if (c.haProva) {
                    if (!c.gps) add({ id: 'gps', testo: 'Aggiungi il GPS', cmd: 'Posizione GPS' });
                    if (!c.strati) add({ id: 'strati', testo: 'Aggiungi gli strati', cmd: 'Strati e parametri' });
                    if (!c.intervalli) add({ id: 'colpi', testo: 'Aggiungi i colpi', cmd: 'Aggiungi intervalli' });
                }
                const altre = (c.senzaGps || []).filter(sid => sid !== c.provaId);
                if (altre.length) add({ id: 'gps-prove', testo: 'Aggiungi GPS a ' + altre.length + (altre.length === 1 ? ' prova' : ' prove'), tool: 'vai_a', args: { vista: 'field', progetto_id: c.progettoId, prova_id: altre[0] } });
                if (c.haProgetto) add({ id: 'esporta', testo: 'Esporta il cantiere', cmd: 'Consegna' });
                if (c.backup) add({ id: 'backup', testo: 'Fai il backup', cmd: 'Backup completo dell\'archivio' });
                if (!out.length) add({ id: 'controllo', testo: 'Controlla i dati', chiedi: 'Controlla se nella prova aperta mancano dati o ci sono valori strani.' });
                return out;
            }
            const aiSugg = aiEl('div', 'ai-sugg'); aiSugg.hidden = true;
            aiPannello.insertBefore(aiSugg, aiSub.nextSibling);
            async function aiSuggEsegui(s) {
                if (aiOccupato) return;
                if (s.chiedi) { aiCampo.value = s.chiedi; aiInviaDomanda(); return; }
                const k = s.tool ? { n: s.tool, a: s.args } : { n: 'esegui_comando', a: { etichetta: s.cmd } };
                const r = await aiEseguiStrumento(k), o = (() => { try { return JSON.parse(r.c); } catch (e) { return {}; } })();
                if (o && o.errore) { if (!/annullato/i.test(o.errore)) aiMsg('errore', 'Non riesco: ' + o.errore, false); }
                else aiApri(false);
                aiRinfresca(true);
            }
            let aiSuggChiave = '';
            function aiRinfresca(forza) {
                if (!aiCfg.attivo) return;
                let chiave = '';
                try {
                    const h = state.header || {};
                    chiave = [(state.uiState || {}).currentView, state.currentProjectId, state.currentSurveyId, (state.logs || []).length, (state.strati || []).length, h.lat, state.ultimoBackupCompleto, Object.keys(state.projects || {}).length, Object.keys((state.projects || {})[state.currentProjectId] ? state.projects[state.currentProjectId].surveys || {} : {}).length].join('|');
                } catch (e) { return; }
                if (!forza && chiave === aiSuggChiave) return;
                aiSuggChiave = chiave;
                let sug = [];
                try { sug = aiSuggerimenti(aiContesto()); } catch (e) { sug = []; }
                aiSugg.textContent = '';
                sug.forEach(s => { const b = aiEl('button', 'ai-chip ai-sug', s.testo); b.type = 'button'; b.onclick = () => aiSuggEsegui(s); aiSugg.appendChild(b); });
                aiSugg.hidden = !sug.length;
                const n = sug.filter(s => !s.chiedi).length;
                aiNumBolla.textContent = n ? String(n) : ''; aiNumBolla.style.opacity = n ? '1' : '0';
                aiBolla.setAttribute('aria-label', 'Assistente IA' + (n ? ', ' + n + (n === 1 ? ' suggerimento' : ' suggerimenti') : ''));
            }
            setInterval(() => { if (aiCfg.attivo && !document.hidden) aiRinfresca(false); }, 1500);

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
                if (!aiCfg.attivo) aiApri(false); else { aiBollaRiadatta(false); aiRinfresca(true); }
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
