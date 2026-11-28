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
                { id: 'gemini', prefisso: 'AIza', nome: 'Google Gemini', tipo: 'gemini', base: 'https://generativelanguage.googleapis.com/v1beta', pref: /2\.5-flash(?!.*(lite|image|tts))/, costo: 'Gratis (con limiti giornalieri)', url: 'https://aistudio.google.com/apikey',
                  passi: ['Apri la pagina di Google AI Studio e accedi col tuo account Google.', 'Premi «Create API key» e scegli un progetto (va bene quello proposto).', 'Copia la chiave (inizia con «AIza») e incollala qui sotto.'] },
                { id: 'groq', prefisso: 'gsk_', nome: 'Groq', tipo: 'openai', base: 'https://api.groq.com/openai/v1', pref: /llama-3\.3|70b|llama/, costo: 'Gratis (con limiti), molto veloce', url: 'https://console.groq.com/keys',
                  passi: ['Apri la console di Groq e registrati (basta un account Google).', 'Vai su «API Keys» e premi «Create API Key».', 'Copia la chiave (inizia con «gsk_») e incollala qui sotto.'] },
                { id: 'openrouter', prefisso: 'sk-or-', nome: 'OpenRouter', tipo: 'openai', base: 'https://openrouter.ai/api/v1', pref: /gpt-oss-120b:free|llama-3\.3-70b.*:free|:free/, costo: 'Modelli gratuiti e a pagamento con una sola chiave', url: 'https://openrouter.ai/keys',
                  passi: ['Apri OpenRouter e crea un account.', 'Vai su «Keys» e premi «Create Key».', 'Copia la chiave (inizia con «sk-or-») e incollala qui sotto. I modelli con «:free» nel nome non costano.'] },
                { id: 'anthropic', prefisso: 'sk-ant-', nome: 'Anthropic (Claude)', tipo: 'anthropic', base: 'https://api.anthropic.com/v1', pref: /sonnet/, costo: 'A pagamento (credito prepagato)', url: 'https://console.anthropic.com/settings/keys',
                  passi: ['Apri la console di Anthropic e accedi.', 'In «Billing» aggiungi un po\' di credito (bastano pochi euro).', 'In «API Keys» premi «Create Key», copia la chiave (inizia con «sk-ant-») e incollala qui sotto.'] },
                { id: 'openai', prefisso: 'sk-', nome: 'OpenAI (ChatGPT)', tipo: 'openai', base: 'https://api.openai.com/v1', pref: /mini/, costo: 'A pagamento (credito prepagato)', url: 'https://platform.openai.com/api-keys',
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
            function aiSalva() {
                try { localStorage.setItem(AI_CHIAVE, JSON.stringify(aiCfg)); } catch (e) { /* spazio pieno o accesso negato */ }
                // Con l'account Google e la frase sbloccata, le chiavi cifrate su Drive si tengono allineate (078).
                try { chiaviCambiate(); } catch (e) { ignoraErrore('ai/chiavi-su-drive', e); }
            }
            const aiDef = id => AI_PROVIDER.find(p => p.id === id);
            const aiConf = id => aiCfg.provider[id] || (aiCfg.provider[id] = {});
            const aiPronto = id => { const d = aiDef(id), c = aiConf(id); return !!(c.attivo !== false && c.modello && (d.senzaChiave ? c.configurato : c.chiave)); };
            const aiProntiInOrdine = () => aiCfg.ordine.filter(aiPronto);
            const aiPausa = {}; // id provider → ora (ms) fino a cui è «in pausa» perché ha finito la quota
            const aiEl = (tag, cls, testo) => { const e = document.createElement(tag); if (cls) e.className = cls; if (testo != null) e.textContent = testo; return e; };


            // Formattazione sicura delle risposte: solo nodi DOM (mai innerHTML). Capisce **grassetto**, `codice`,
            // blocchi ```codice```, elenchi con - o 1.
            function aiInline(el, t) {
                t.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach(pz => {
                    if (!pz) return;
                    if (/^\*\*[^*]+\*\*$/.test(pz)) el.appendChild(aiEl('strong', null, pz.slice(2, -2)));
                    else if (/^`[^`]+`$/.test(pz)) el.appendChild(aiEl('code', null, pz.slice(1, -1)));
                    else el.appendChild(document.createTextNode(pz));
                });
            }
            function aiFormatta(testo) {
                const fr = document.createDocumentFragment(); let lista = null, cod = null;
                String(testo == null ? '' : testo).split('\n').forEach(r => {
                    if (/^\s*```/.test(r)) { if (cod) { fr.appendChild(cod.el); cod = null; } else { lista = null; cod = { el: aiEl('pre', 'ai-cod'), righe: [] }; } return; }
                    if (cod) { cod.el.textContent += (cod.el.textContent ? '\n' : '') + r; return; }
                    const m = /^\s*(?:([-*•])|(\d+)[.)])\s+(.*)$/.exec(r);
                    if (m) {
                        const tipo = m[1] ? 'UL' : 'OL';
                        if (!lista || lista.tagName !== tipo) { lista = aiEl(tipo.toLowerCase(), 'ai-lista'); fr.appendChild(lista); }
                        const li = aiEl('li'); aiInline(li, m[3]); lista.appendChild(li); return;
                    }
                    lista = null;
                    if (!r.trim()) return;
                    const p = aiEl('div', 'ai-par'); aiInline(p, r); fr.appendChild(p);
                });
                if (cod) fr.appendChild(cod.el);
                return fr;
            }

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
                { n: 'stato_app', d: 'Dice in che schermata si è e quale progetto e prova sono aperti.', p: {}, run: () => ({ vista: (state.uiState || {}).currentView, vistaHome: typeof vistaHomeScelta === 'function' ? vistaHomeScelta() : null, progettoId: state.currentProjectId || null, provaId: state.currentSurveyId || null, progetti: Object.keys(state.projects || {}).length }) },
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
                { n: 'bussola_telefono', d: 'Bussola vera del telefono sulla mappa 2D: "leggi" dice se è accesa e la direzione in gradi; "accendi" la accende (su iPhone serve un tocco dell\'utente); "spegni" la ferma. Quando è accesa la mappa gira dove guarda l\'utente.', p: { azione: { type: 'string', enum: ['leggi', 'accendi', 'spegni'] } }, req: ['azione'], run: async a => {
                    if (a.azione === 'accendi') { const r = await accendiBussolaTel(false); return Object.assign(statoBussolaTel(), r); }
                    if (a.azione === 'spegni') spegniBussolaTel();
                    return statoBussolaTel();
                } },
                { n: 'qr_progetto', d: 'Passa un progetto piccolo da un dispositivo a un altro con una sequenza di codici QR, senza rete. "stima" dice quanti codici e quanto tempo servono; "mostra" apre la finestra e fa partire i codici (poi l\'utente li inquadra con l\'altro dispositivo); "leggi" apre il lettore (la fotocamera la accende l\'utente, serve il suo permesso). Si sceglie cosa portare: prove, note, foto piccole. DTM, tavole e foto grandi NON vanno nei QR (usa il pacchetto Porta sul PC).', p: { azione: { type: 'string', enum: ['stima', 'mostra', 'leggi'] }, progetto_id: { type: 'string' }, prove_ids: { type: 'array', items: { type: 'string' }, description: 'id delle prove da portare; senza = tutte' }, note: { type: 'boolean' }, foto: { type: 'boolean', description: 'foto piccole (pochi KB)' } }, req: ['azione'], run: async a => {
                    const pid = a.progetto_id || state.currentProjectId;
                    if (a.azione === 'leggi') { apriQr(null, 'leggi'); return { aperto: true, nota: 'Per leggere serve la fotocamera: la accende l\'utente con «Avvia la fotocamera».' }; }
                    if (!pid || !state.projects[pid]) throw new Error('Apri o indica un progetto.');
                    const sc = { prove: a.prove_ids && a.prove_ids.length ? a.prove_ids : null, note: a.note !== false, foto: !!a.foto };
                    const ora = await qrPreparaProgetto(pid, sc);
                    const esito = { codici: ora.frames.length, secondiCirca: ora.secondi, byte: ora.byte, fotoPiccole: ora.foto, fotoSenzaImmagine: ora.fotoSenza, nonNeiQr: ora.lasciati };
                    if (a.azione === 'mostra') {
                        apriQr(pid, 'mostra');
                        const f = qrEl('qrScelte');
                        if (sc.prove) f.querySelectorAll('input[data-prova]').forEach(i => { i.checked = sc.prove.includes(i.dataset.prova); });
                        const n = qrEl('qrNote'); if (n) n.checked = sc.note; const ft = qrEl('qrFoto'); if (ft) ft.checked = sc.foto;
                        await qrAggiornaRiepilogo(); await qrAvvia(); esito.inCorso = true;
                    }
                    return esito;
                } },
                { n: 'avvisi_dati', d: 'Elenca gli avvisi sui dati strani (passo, aste, strumento, βt, falda) di una prova o di tutto un progetto. Solo lettura: non cambia niente. Senza id usa la prova aperta.', p: { progetto_id: { type: 'string' }, prova_id: { type: 'string' }, tutto_il_progetto: { type: 'boolean' } }, run: a => {
                    const p = (state.projects || {})[a.progetto_id || state.currentProjectId];
                    if (!p) throw new Error('Progetto non trovato.');
                    if (state.uiState && state.uiState.currentView === 'field' && p.id === state.currentProjectId) syncStateToProject();
                    if (a.tutto_il_progetto) return avvisiDatiProgetto(p);
                    const sid = a.prova_id || state.currentSurveyId;
                    if (!p.surveys || !p.surveys[sid]) throw new Error('Prova non trovata.');
                    return { survId: sid, avvisi: avvisiDatiProva(p.surveys[sid]) };
                } },
                { n: 'riepilogo_giornata', d: 'Riepilogo di una giornata di lavoro in tutti i progetti: prove, intervalli, metri, colpi, foto, orari, avvisi. giorno = AAAA-MM-GG (senza: oggi). Solo lettura.', p: { giorno: { type: 'string' } }, run: a => {
                    if (state.uiState && state.uiState.currentView === 'field') syncStateToProject();
                    const r = riepilogoGiornata(state, a.giorno);
                    return Object.assign({ testo: testoRiepilogoGiornata(r) }, r);
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
                { n: 'vista_home', d: 'Apre la Home dei progetti nella vista scelta: griglia (anteprime con la miniatura dalla mappa), elenco (righe) o mappa (tutti i progetti su una mappa, quelli senza GPS sotto). Torna anche lo stato delle anteprime di ogni progetto.', p: { vista: { type: 'string', enum: ['griglia', 'elenco', 'mappa'] } }, req: ['vista'], run: a => {
                    if (typeof switchView === 'function') switchView('home');
                    if (!scegliVistaHome(a.vista)) throw new Error('Vista sconosciuta: usa griglia, elenco o mappa.');
                    return Object.assign({ ok: true }, statoAnteprimeHome());
                } },
                { n: 'anteprime_progetti', d: 'Dice per ogni progetto se ha l\'anteprima dalla mappa, se ha il GPS e dove sta il centro. Con rifai true rifà le anteprime (di un progetto con progetto_id, o di tutti).', p: { rifai: { type: 'boolean' }, progetto_id: { type: 'string' } }, run: a => {
                    if (a.progetto_id && !(state.projects || {})[a.progetto_id]) throw new Error('Progetto non trovato.');
                    const accodati = a.rifai ? accodaMiniatureProgetti(a.progetto_id ? [a.progetto_id] : Object.keys(state.projects || {}), true) : 0;
                    return Object.assign({ accodati }, statoAnteprimeHome());
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
                { n: 'aggiungi_intervalli', d: 'Aggiunge in coda alla prova aperta gli intervalli di colpi indicati (un numero per intervallo, in ordine di profondità). Chiamala UNA SOLA VOLTA con TUTTI i numeri nell\'array colpi, per esempio {"colpi":[3,4,5,7,9]}: non un intervallo per chiamata.', p: { colpi: { type: 'array', items: { type: 'integer' } }, prova_id: { type: 'string' } }, req: ['colpi'], w: true,
                  ds: a => `Aggiungere ${(a.colpi || []).length} intervalli alla prova aperta: ${(a.colpi || []).slice(0, 12).join(', ')}${(a.colpi || []).length > 12 ? '…' : ''}`, run: a => {
                    if (typeof a.colpi === 'string') a.colpi = (a.colpi.match(/\d+/g) || []).map(Number);
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
                { n: 'crea_stratigrafia', d: 'Crea in UNA sola volta tutta la stratigrafia della prova aperta: per ogni strato nome, da_m e a_m (metri, in ordine) e, se vuoi, colore (#rrggbb) e comportamento. Aggiunge gli strati e li assegna agli intervalli già inseriti. Chiamala UNA volta con tutti gli strati.',
                  p: { strati: { type: 'array', items: { type: 'object', properties: { nome: { type: 'string' }, da_m: { type: 'number' }, a_m: { type: 'number' }, colore: { type: 'string' }, comportamento: { type: 'string', enum: ['granulare', 'coesivo'] } }, required: ['nome', 'da_m', 'a_m'] } }, autocompila: { type: 'boolean', description: 'compila anche i parametri avanzati consigliati' } }, req: ['strati'], w: true,
                  ds: a => `Creare ${(a.strati || []).length} strati: ` + (a.strati || []).slice(0, 10).map(x => `«${x.nome}» ${x.da_m}-${x.a_m} m`).join(', ') + ((a.strati || []).length > 10 ? '…' : '') + (a.autocompila ? ', con parametri avanzati automatici' : ''), run: a => {
                    if (!state.currentSurveyId) throw new Error('Apri prima una prova.');
                    if (!Array.isArray(a.strati) || !a.strati.length) throw new Error('Serve l\'elenco degli strati.');
                    a.strati.forEach(x => {
                        if (!x || !String(x.nome || '').trim()) throw new Error('Ogni strato vuole un nome.');
                        if (!(Number(x.a_m) > Number(x.da_m)) || Number(x.da_m) < 0) throw new Error('Profondità non valide per «' + x.nome + '»: serve a_m maggiore di da_m.');
                        if (x.colore != null && !/^#[0-9a-f]{6}$/i.test(x.colore)) throw new Error('Il colore di «' + x.nome + '» deve essere #rrggbb.');
                        if (x.comportamento != null && !['granulare', 'coesivo'].includes(x.comportamento)) throw new Error('Comportamento non valido per «' + x.nome + '».');
                    });
                    const tav = ['#d4a373', '#8d6e63', '#a1887f', '#90a4ae', '#b0bec5', '#c5a880', '#7e8f6a', '#9aa5b1'];
                    let assegnati = 0, creati = 0; const vuoti = [];
                    a.strati.forEach((x, i) => {
                        const nome = String(x.nome).trim();
                        let st = state.strati.find(y => String(y.name).trim().toLowerCase() === nome.toLowerCase());
                        if (!st) { st = { id: 'strato_' + Date.now() + '_' + i, name: nome, color: x.colore || tav[state.strati.length % tav.length], behavior: x.comportamento || 'granulare' }; state.strati.push(st); creati++; }
                        else { if (x.colore) st.color = x.colore; if (x.comportamento) st.behavior = x.comportamento; }
                        let n = 0; state.logs.forEach(l => { if (l.end > x.da_m + 1e-6 && l.start < x.a_m - 1e-6) { l.lithology = st.id; l.modificatoIl = new Date().toISOString(); n++; } });
                        if (!n) vuoti.push(nome); assegnati += n;
                        if (a.autocompila) { ensureParametriAvanzati(st); autoCompilaStrato(st); }
                    });
                    saveState(); updateUI(); if (document.getElementById('modalManageStrati').classList.contains('open')) renderStratiList();
                    return { ok: true, strati_creati: creati, intervalli_assegnati: assegnati, senza_intervalli: vuoti.length ? vuoti : undefined };
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
                // --- mappa 2D: isoipse e ombreggiatura calcolate dal DTM del progetto aperto ---
                { n: 'leggi_isoipse_ombreggiatura', d: 'Legge le scelte della mappa 2D su isoipse (curve di livello) e ombreggiatura del rilievo, e se il progetto aperto ha il DTM (senza, non si possono accendere).', p: {}, run: () => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Nessun progetto aperto.');
                    const imp = impostazioniMappa2d(), dtm = pr.dtm;
                    return { haDtm: !!dtm, isoipse: { accese: imp.isoipse.on, passo_m: imp.isoipse.passo || 'automatico', passoUsato_m: dtm ? passoIsoipse(dtm, imp.isoipse.passo) : null, opacita: imp.isoipse.op },
                        ombreggiatura: { accesa: imp.ombra.on, luce_azimut: imp.ombra.az, luce_altezza: imp.ombra.alt, esagerazione: imp.ombra.es, opacita: imp.ombra.op } };
                } },
                { n: 'imposta_isoipse_ombreggiatura', d: 'Accende o spegne le isoipse e l\'ombreggiatura del rilievo sulla mappa 2D del progetto aperto, e ne cambia le scelte. Si calcolano dal DTM del progetto (anche senza rete); serve il DTM. Passare solo i campi da cambiare. passo_m: distanza tra le curve in metri (0 = automatica). luce_azimut: da dove viene la luce, gradi dal Nord (315 = Nord-Ovest). esagerazione: rilievo accentuato da 0,5 a 5.', p: { isoipse: { type: 'boolean' }, passo_m: { type: 'number' }, isoipse_opacita: { type: 'number' }, ombreggiatura: { type: 'boolean' }, luce_azimut: { type: 'number' }, luce_altezza: { type: 'number' }, esagerazione: { type: 'number' }, ombreggiatura_opacita: { type: 'number' } }, w: true,
                  ds: a => 'Mappa 2D: ' + [a.isoipse != null && (a.isoipse ? 'accendere le isoipse' : 'spegnere le isoipse'), a.passo_m != null && `isoipse ogni ${a.passo_m || 'auto'} m`, a.ombreggiatura != null && (a.ombreggiatura ? 'accendere l\'ombreggiatura' : 'spegnere l\'ombreggiatura'), a.luce_azimut != null && `luce da ${a.luce_azimut}°`, a.luce_altezza != null && `luce a ${a.luce_altezza}°`, a.esagerazione != null && `rilievo ×${a.esagerazione}`].filter(Boolean).join(', '), run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Nessun progetto aperto.');
                    const imp = impostazioniMappa2d();
                    if ((a.isoipse || a.ombreggiatura) && !pr.dtm) throw new Error('Il progetto non ha il DTM: si aggiunge dalla schermata del progetto, in «Terreno e sezioni».');
                    const nu = (v, nome) => { if (!Number.isFinite(v)) throw new Error(nome + ' non valido.'); return v; };
                    if (a.isoipse != null) imp.isoipse.on = !!a.isoipse;
                    if (a.passo_m != null) imp.isoipse.passo = Math.max(0, Math.min(1000, nu(a.passo_m, 'Il passo')));
                    if (a.isoipse_opacita != null) imp.isoipse.op = Math.max(0.1, Math.min(1, nu(a.isoipse_opacita, 'L\'opacità')));
                    if (a.ombreggiatura != null) imp.ombra.on = !!a.ombreggiatura;
                    if (a.luce_azimut != null) imp.ombra.az = ((nu(a.luce_azimut, 'L\'azimut') % 360) + 360) % 360;
                    if (a.luce_altezza != null) imp.ombra.alt = Math.max(5, Math.min(85, nu(a.luce_altezza, 'L\'altezza')));
                    if (a.esagerazione != null) imp.ombra.es = Math.max(0.5, Math.min(5, nu(a.esagerazione, 'L\'esagerazione')));
                    if (a.ombreggiatura_opacita != null) imp.ombra.op = Math.max(0.1, Math.min(1, nu(a.ombreggiatura_opacita, 'L\'opacità')));
                    saveState(); aggiornaLivelli2d(); if (typeof renderLivelli3d === 'function') renderLivelli3d();
                    return { ok: true, isoipseAccese: imp.isoipse.on, ombreggiaturaAccesa: imp.ombra.on, nota: 'Si vedono nella mappa 2D del progetto.' };
                } },
                // --- DTM: fonti, caricamento, controllo, opzioni; scala leggibile del 3D ---
                { n: 'fonti_dtm', d: 'Elenca le fonti di DTM per le prove del progetto aperto (nazionali, della regione, quelle aggiunte dall\'utente, OpenTopography). PRIMA DI CARICARE chiedi sempre all\'utente quali informazioni gli servono e quale fonte vuole usare. "campi" sceglie cosa tornare tra: ente, tipi, tecnica, risoluzione, copertura, licenza, sistema, nota, verifica, caricabile, scaricabile, in_uso, ultima, pagina. Senza "campi" tornano solo id, nome, tipi e risoluzione. "tipo": DTM (terreno nudo), DSM (superficie con edifici e alberi) o tutti.', p: { campi: { type: 'array', items: { type: 'string' } }, tipo: { type: 'string', enum: ['tutti', 'DTM', 'DSM'] } }, run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    const luogo = luogoDelleProve(pr); if (!luogo) throw new Error('Nessuna prova del progetto ha il GPS: serve per sapere quali fonti coprono la zona. Si può comunque caricare un DTM da file.');
                    sincronizzaFontiTue();
                    const o = opzDtm(), uso = pr.dtm && pr.dtm.fonte, campi = Array.isArray(a.campi) ? a.campi : [];
                    const tutti = { ente: f => f.ente, tipi: f => f.tipi, tecnica: f => f.tecnica, risoluzione: f => f.risoluzione, copertura: f => f.copertura, licenza: f => f.licenza, sistema: f => f.sistema || null, nota: f => f.nota || null,
                        verifica: f => VERIFICA_DTM[f.verifica], caricabile: f => !!f.carica, scaricabile: f => !!f.scarica, in_uso: f => !!(uso && uso.indexOf(f.nome) === 0), ultima: f => f.id === o.ultima, pagina: f => f.pagina };
                    return { regione: luogo.regioni.map(r => REGIONI_ITALIA[r]), provePerGps: luogo.punti.length, fonti: fontiPerLuogo(luogo).filter(({ f }) => !a.tipo || a.tipo === 'tutti' || f.tipi.includes(a.tipo)).map(({ f, gruppo }) => {
                        const r = { id: f.id, nome: f.nome, tipi: f.tipi, risoluzione: f.risoluzione, gruppo };
                        campi.forEach(c => { if (tutti[c]) r[c] = tutti[c](f); });
                        return r;
                    }), nota: 'Per caricare usa carica_dtm_da_fonte con l\'id scelto dall\'utente.' };
                } },
                { n: 'leggi_dtm_progetto', d: 'Dice se il progetto aperto ha un DTM e com\'è: fonte, celle, quote, peso, controllo qualità (buchi, celle fuori posto, pendenza, copertura delle prove) e le opzioni della finestra DTM (anteprima, controllo, copertura, memoria offline, modello OpenTopography; dice solo se la chiave c\'è, mai il valore).', p: {}, run: () => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    const o = opzDtm(), d = pr.dtm, luogo = luogoDelleProve(pr);
                    return { haDtm: !!d, opzioni: { anteprima: o.anteprima, controlloQualita: o.qualita, proveEriquadroSuAnteprima: o.copertura, memoriaOffline: o.cache, modelloOpenTopography: o.otSet, chiaveOpenTopographyPresente: !!chiaveOt() }, ultimaFonteUsata: o.ultima || null,
                        dtm: d ? { fonte: d.fonte, caricatoIl: d.caricatoIl, celle: d.nx + '×' + d.ny, celleOriginali_m: d.crs.tipo === 'geo' ? Math.round(d.celleOriginali * 111000) : d.celleOriginali, proveDentro: d.proveDentro, proveConGps: d.proveConGps, controllo: luogo ? qualitaDtm(d, luogo).map(c => c.stato + ': ' + c.testo) : [] } : null };
                } },
                { n: 'carica_dtm_da_fonte', d: 'Carica nel progetto aperto il DTM di una fonte (id da fonti_dtm). Chiedi PRIMA all\'utente quale fonte vuole. Usa la memoria offline se c\'è già un ritaglio che copre le prove; senza_memoria:true rilegge dalla rete. Sostituisce l\'eventuale DTM (si può annullare). Non serve per OpenTopography se manca la chiave: la inserisce l\'utente dalla finestra DTM, con la guida in tre passi.', p: { fonte: { type: 'string' }, senza_memoria: { type: 'boolean' } }, req: ['fonte'], w: true,
                  ds: a => `Caricare il DTM dalla fonte «${a.fonte}»${a.senza_memoria ? ' (dalla rete)' : ''}`, run: async a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    sincronizzaFontiTue();
                    const f = FONTI_DTM.find(x => x.id === a.fonte); if (!f) throw new Error('Fonte sconosciuta: guarda l\'elenco con fonti_dtm.');
                    if (!f.carica) throw new Error('Questa fonte non si carica direttamente: l\'utente deve scaricare il file dal sito e usare «Carica da file».');
                    if (trovaDtm.inCorso) throw new Error('Un altro caricamento DTM è già in corso.');
                    trovaDtm.projId = state.currentProjectId; trovaDtm.fatto = () => { if (typeof renderTerreno === 'function' && document.getElementById('modalTerreno').classList.contains('open')) renderTerreno(); };
                    await caricaFonteDtm(f, null, !!a.senza_memoria);
                    const stato = trovaDtm.prog[f.id] || {}, d = pr.dtm;
                    if (stato.stato === 'errore' || !d || d.fonte.indexOf(f.nome) !== 0) throw new Error(document.getElementById('trovaDtmEsito').textContent.trim() || 'Caricamento non riuscito.');
                    return { ok: true, fonte: d.fonte, proveDentro: d.proveDentro, proveConGps: d.proveConGps };
                } },
                { n: 'togli_dtm', d: 'Toglie il DTM dal progetto aperto (l\'utente può annullare).', p: {}, w: true, ds: () => 'Togliere il DTM dal progetto', run: () => {
                    const pr = state.projects[state.currentProjectId]; if (!pr || !pr.dtm) throw new Error('Il progetto non ha un DTM.');
                    const vecchio = pr.dtm; delete pr.dtm; saveState();
                    showUndoBanner('DTM tolto dal progetto', () => { pr.dtm = vecchio; saveState(); });
                    return { ok: true };
                } },
                { n: 'imposta_dtm_opzioni', d: 'Cambia le opzioni della finestra DTM: anteprima del terreno, controllo qualità, prove e riquadro sull\'anteprima, memoria offline dei DTM letti (svuota_memoria:true la cancella), modello OpenTopography da usare (COP30, COP90, NASADEM, SRTMGL1, AW3D30). Passare solo i campi da cambiare.', p: { anteprima: { type: 'boolean' }, controllo_qualita: { type: 'boolean' }, copertura: { type: 'boolean' }, memoria_offline: { type: 'boolean' }, svuota_memoria: { type: 'boolean' }, modello_opentopography: { type: 'string', enum: ['COP30', 'COP90', 'NASADEM', 'SRTMGL1', 'AW3D30'] } }, w: true,
                  ds: a => 'Opzioni DTM: ' + Object.keys(a).join(', '), run: async a => {
                    const parte = {};
                    if (a.anteprima != null) parte.anteprima = !!a.anteprima;
                    if (a.controllo_qualita != null) parte.qualita = !!a.controllo_qualita;
                    if (a.copertura != null) parte.copertura = !!a.copertura;
                    if (a.memoria_offline != null) parte.cache = !!a.memoria_offline;
                    if (a.modello_opentopography) parte.otSet = a.modello_opentopography;
                    if (Object.keys(parte).length) impostaOpzDtm(parte);
                    if (a.svuota_memoria) await dtmCache('svuota');
                    if (trovaDtm.projId && !document.getElementById('trovaDtm').hidden) renderTrovaDtm();
                    const o = opzDtm();
                    return { ok: true, anteprima: o.anteprima, controlloQualita: o.qualita, copertura: o.copertura, memoriaOffline: o.cache, modelloOpenTopography: o.otSet };
                } },
                { n: 'scala_vista3d', d: 'Legge e cambia come si legge la scala nella vista 3D del progetto aperto, anche senza esagerazione verticale: righello delle profondità (metri veri), scala vera (barre orizzontale e verticale), mini-vista 1:1 (colonne di lato), terreno stretto attorno alle prove, esagerazione verticale (1–30) e "inquadra" (avvicina la vista al corpo indagato). Senza campi dice solo lo stato. Passare solo i campi da cambiare.', p: { righello: { type: 'boolean' }, scala_vera: { type: 'boolean' }, mini_vista: { type: 'boolean' }, terreno_stretto: { type: 'boolean' }, esagerazione: { type: 'number' }, inquadra: { type: 'boolean' } }, w: true,
                  ds: a => Object.keys(a).length ? 'Vista 3D: ' + [a.righello != null && (a.righello ? 'righello delle profondità' : 'senza righello'), a.scala_vera != null && (a.scala_vera ? 'scala vera' : 'senza scala vera'), a.mini_vista != null && (a.mini_vista ? 'mini-vista 1:1' : 'senza mini-vista'), a.terreno_stretto != null && (a.terreno_stretto ? 'terreno stretto' : 'terreno largo'), a.esagerazione != null && `esagerazione ×${a.esagerazione}`, a.inquadra && 'inquadra le prove'].filter(Boolean).join(', ') : 'Leggere lo stato della scala 3D', run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    if (!datiVista3dCorrenti) datiVista3dCorrenti = datiVista3d(pr);
                    const L = vista3d.livelli;
                    if (a.righello != null) L.righello = !!a.righello;
                    if (a.scala_vera != null) L.scalaVera = !!a.scala_vera;
                    if (a.mini_vista != null) L.miniVista = !!a.mini_vista;
                    if (a.terreno_stretto != null && !!a.terreno_stretto !== !!L.terrenoStretto) { L.terrenoStretto = !!a.terreno_stretto; datiVista3dCorrenti = datiVista3d(pr); if (datiVista3dCorrenti) inquadraCorpo3d(); }
                    if (a.esagerazione != null) { if (!Number.isFinite(a.esagerazione)) throw new Error('Esagerazione non valida.'); const prima = vista3d.ex; vista3d.ex = Math.max(1, Math.min(30, Math.round(a.esagerazione))); if (prima > 1 && vista3d.ex === 1 && datiVista3dCorrenti) inquadraCorpo3d(); }
                    if (a.inquadra && datiVista3dCorrenti) inquadraCorpo3d();
                    if (document.getElementById('modalVista3d').classList.contains('open')) { renderLivelli3d(); renderVista3d(); }
                    return { righello: !!L.righello, scalaVera: !!L.scalaVera, miniVista: !!L.miniVista, terrenoStretto: !!L.terrenoStretto, esagerazione: vista3d.ex, zoom: Math.round(vista3d.zoom * 100) / 100, vistaAperta: document.getElementById('modalVista3d').classList.contains('open') };
                } },
                // --- tavole 2D e 3D del progetto aperto (registro: nome, blocco, versioni, report) ---
                { n: 'elenco_tavole', d: 'Elenca le tavole salvate del progetto aperto: id, nome, tipo, versione, se è bloccata (consegnata), se va nel report, se i dati delle prove sono cambiati.', p: {}, run: () => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    const imp = typeof improntaDatiTavole3d === 'function' ? improntaDatiTavole3d() : null;
                    return registroTavole(pr).map(t => ({ id: t.id, nome: t.nome, tipo: t.tipo, versione: t.versione, versioniPrecedenti: t.versioni.length, bloccata: !!t.bloccata, nelReport: t.inReport !== false, storica: !!t.storica, orfana: !!t.orfana, datiCambiati: !t.storica && imp ? tavolaDatiCambiati(t, imp) : false }));
                } },
                { n: 'leggi_tavola', d: 'Legge una tavola salvata con le sue impostazioni (inquadratura, titolo, foglio, pianta).', p: { tavola_id: { type: 'string' } }, req: ['tavola_id'], run: a => {
                    const t = tavolaPerId(state.projects[state.currentProjectId], a.tavola_id); if (!t) throw new Error('Tavola non trovata.');
                    return { id: t.id, nome: t.nome, tipo: t.tipo, versione: t.versione, bloccata: !!t.bloccata, nelReport: t.inReport !== false, templateId: t.templateId, impostazioni: t.impostazioni };
                } },
                { n: 'aggiungi_vista_modello', d: 'Aggiunge alle tavole del progetto una vista isometrica del modello 3D verso un lato: N (Nord), E (Est), S (Sud) o O (Ovest). Poi va nel report come le altre.', p: { verso: { type: 'string', enum: ['N', 'E', 'S', 'O'] } }, req: ['verso'], w: true,
                  ds: a => `Aggiungere alle tavole una vista del modello verso ${a.verso}`, run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    if (!['N', 'E', 'S', 'O'].includes(a.verso)) throw new Error('Il verso è N, E, S oppure O.');
                    if (!pr.tavole3d) pr.tavole3d = { regola: {}, escluse: [] };
                    const id = 'iso-x' + Date.now().toString(36); (pr.tavole3d.extra = pr.tavole3d.extra || []).push({ id, verso: a.verso }); saveState(); return { ok: true, id };
                } },
                { n: 'controllo_stampa_tavole', d: 'Controlla se le tavole salvate del progetto sono pronte per la stampa: elenca gli avvisi (dati non aggiornati, nomi doppi, pagine senza titolo...).', p: {}, run: () => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    const mem = pr.tavole3d || {}, imp = typeof improntaDatiTavole3d === 'function' ? improntaDatiTavole3d() : null, d = datiVista3dCorrenti;
                    return controlloStampaTavole(mem, d ? vociEsportazione3d(d) : [], imp);
                } },
                { n: 'confronto_prove_nelle_tavole', d: 'Aggiunge (attivo true) o toglie (false) la pagina «Confronto tra prove» fra le tavole del progetto; grandezza: colpi oppure rpd. Servono almeno due prove con intervalli.', p: { attivo: { type: 'boolean' }, grandezza: { type: 'string', enum: ['colpi', 'rpd'] } }, req: ['attivo'], w: true,
                  ds: a => a.attivo ? `Aggiungere alle tavole il confronto tra prove (${a.grandezza || 'colpi'})` : 'Togliere dalle tavole il confronto tra prove', run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    if (!pr.tavole3d) pr.tavole3d = { regola: {}, escluse: [] };
                    if (a.attivo) { if (proveConfrontabili(pr).length < 2) throw new Error('Servono almeno due prove con intervalli.'); pr.tavole3d.confronto = { grandezza: a.grandezza === 'rpd' ? 'rpd' : 'colpi' }; }
                    else delete pr.tavole3d.confronto;
                    saveState(); return { ok: true };
                } },
                { n: 'disegno_libero_nelle_tavole', d: 'Crea o sostituisce un disegno libero fra le tavole del progetto (tavola vuota 1400x860, origine in alto a sinistra). forme: elenco di { t: riga|freccia|rettangolo|testo|misura|scala, x1, y1, x2, y2, testo, colore #rrggbb }. misura = quota in metri secondo px_per_m (default 100 px = 1 m); scala = barra lunga «testo» metri. Con disegno_id sostituisce quel disegno.', p: { nome: { type: 'string' }, disegno_id: { type: 'string' }, px_per_m: { type: 'number' }, forme: { type: 'array', items: { type: 'object' } } }, req: ['forme'], w: true,
                  ds: a => `${a.disegno_id ? 'Aggiornare' : 'Creare'} il disegno libero «${a.nome || 'Disegno libero'}» con ${(a.forme || []).length} forme`, run: a => {
                    const pr = state.projects[state.currentProjectId]; if (!pr) throw new Error('Apri prima un progetto.');
                    if (!Array.isArray(a.forme) || a.forme.length > 300) throw new Error('Servono al massimo 300 forme.');
                    const forme = a.forme.map(formaLiberaPulita).filter(Boolean);
                    if (!pr.tavole3d) pr.tavole3d = { regola: {}, escluse: [] };
                    const lista = pr.tavole3d.liberi = pr.tavole3d.liberi || [];
                    let l = a.disegno_id ? lista.find(x => x.id === a.disegno_id) : null;
                    if (a.disegno_id && !l) throw new Error('Disegno non trovato.');
                    const reg = registroTavole(pr).find(t => l && t.voceId === l.id && !t.storica);
                    if (reg && reg.bloccata) throw new Error('La tavola è bloccata: sbloccala prima.');
                    if (!l) { l = { id: 'libero-' + Date.now().toString(36), nome: 'Disegno libero', forme: [] }; lista.push(l); }
                    if (a.nome && String(a.nome).trim()) l.nome = String(a.nome).trim().slice(0, 80);
                    if (a.px_per_m > 0.1) l.pxPerM = a.px_per_m;
                    l.forme = forme; saveState(); return { ok: true, id: l.id, forme: forme.length };
                } },
                { n: 'mappe_offline_elenco', d: 'Elenca le aree di mappa salvate per l\'uso senza segnale, scaricate o importate da GeoPackage (id, nome, mappa, zoom, tessere, MB) e le mappe che si possono scaricare (id e zoom massimo).', p: {}, run: async () => ({
                    aree: (await moAree()).map(a => ({ id: a.id, nome: a.nome, mappa: a.fonteNome, zoomDa: a.zmin, zoomA: a.zmax, tessere: a.n, importata: !!a.importata, nonScaricate: a.errori, mb: +((a.byte || 0) / 1048576).toFixed(1), data: a.data })),
                    mappeScaricabili: moFonti().filter(f => f.ok).map(f => ({ id: f.id, nome: f.nome, zoomMax: f.zoomMax })) }) },
                { n: 'mappe_offline_scarica', d: 'Scarica e salva una zona di mappa per usarla offline (pochi ettari, poche decine di tessere). zona: prove = attorno alle prove del progetto aperto con margine_m (default 300); vista = quello che si vede sulla mappa 2D aperta. mappa = id da mappe_offline_elenco (default esri-satellite; Google non si può). zoom_da default 15, zoom_a default 19. Max 6000 tessere.',
                  p: { nome: { type: 'string' }, mappa: { type: 'string' }, zona: { type: 'string', enum: ['prove', 'vista'] }, margine_m: { type: 'number' }, zoom_da: { type: 'number' }, zoom_a: { type: 'number' } }, w: true,
                  ds: a => `Scaricare la mappa offline «${a.nome || 'Area'}» (${a.zona === 'vista' ? 'zona visibile' : 'attorno alle prove'}, zoom ${a.zoom_da || 15}–${a.zoom_a || 19})`, run: async a => {
                    const proj = state.projects[state.currentProjectId];
                    const riquadro = a.zona === 'vista' ? moRiquadroVista() : (proj ? moRiquadroProve(proj, a.margine_m == null ? MO_MARGINE_M : a.margine_m) : null);
                    if (!riquadro) throw new Error(a.zona === 'vista' ? 'Apri prima la mappa 2D del progetto.' : 'Apri un progetto con almeno una prova con le coordinate GPS.');
                    const e = await moScaricaDaFinestra({ nome: a.nome || (proj && proj.name) || 'Area', fonteId: a.mappa || 'esri-satellite', riquadro, zmin: a.zoom_da || 15, zmax: a.zoom_a || 19, conferma: false });
                    if (e.errore) throw new Error(e.errore);
                    return { ok: true, area_id: e.area.id, tessere: e.area.n, nonScaricate: e.area.errori };
                } },
                { n: 'mappe_offline_usa', d: 'Mostra un\'area importata da GeoPackage come mappa di base della mappa 2D e ci inquadra. area_id da mappe_offline_elenco (importata: true). L\'importazione del file la fa l\'utente dalla finestra «Mappe offline» (esegui_comando «Mappe offline»): serve scegliere il file.', p: { area_id: { type: 'string' } }, req: ['area_id'], w: true,
                  ds: a => `Usare la mappa offline ${a.area_id} come mappa di base`, run: async a => {
                    const area = (await moAree()).find(x => x.id === a.area_id && x.importata); if (!area) throw new Error('Area importata non trovata.');
                    const m = mappaProgetto.mappa; if (!m || !areaMappaAperta() || areaMappa.modo !== 'mappa') throw new Error('Apri prima la mappa 2D del progetto.');
                    mappeOffline.importate = (await moAree()).filter(x => x.importata); sfondoMappaProgetto(area.fonte); renderLivelli3d(); const r = area.riquadro; m.fitBounds([[r.sud, r.ovest], [r.nord, r.est]]); return { ok: true };
                } },
                { n: 'mappe_offline_geopackage', d: 'Scarica un\'area di mappa offline come GeoPackage di tessere (.gpkg) da aprire in QGIS. area_id da mappe_offline_elenco.', p: { area_id: { type: 'string' } }, req: ['area_id'], w: true,
                  ds: a => `Esportare l'area offline ${a.area_id} in GeoPackage`, run: async a => {
                    const area = (await moAree()).find(x => x.id === a.area_id); if (!area) throw new Error('Area non trovata.');
                    scaricaBlobFile(new Blob([await moGeopackage(area)], { type: 'application/geopackage+sqlite3' }), 'DPSH_mappa_' + moNomeFile(area.nome) + '.gpkg'); return { ok: true };
                } },
                { n: 'rinomina_tavola', d: 'Cambia il nome di una tavola salvata (se il nome c\'è già aggiunge un numero).', p: { tavola_id: { type: 'string' }, nome: { type: 'string' } }, req: ['tavola_id', 'nome'], w: true,
                  ds: a => `Rinominare la tavola ${a.tavola_id} in «${a.nome}»`, run: a => {
                    const pr = state.projects[state.currentProjectId], t = tavolaPerId(pr, a.tavola_id); if (!t) throw new Error('Tavola non trovata.');
                    if (t.bloccata) throw new Error('La tavola è bloccata: sbloccala prima.');
                    if (!String(a.nome).trim()) throw new Error('Nome vuoto.');
                    t.nome = nomeTavolaLibero(pr, a.nome, t.id); t.aggiornata = Date.now(); saveState(); return { ok: true, nome: t.nome };
                } },
                { n: 'blocca_tavola', d: 'Blocca (consegnata, non cambia più) o sblocca una tavola salvata.', p: { tavola_id: { type: 'string' }, bloccata: { type: 'boolean' } }, req: ['tavola_id', 'bloccata'], w: true,
                  ds: a => `${a.bloccata ? 'Bloccare' : 'Sbloccare'} la tavola ${a.tavola_id}`, run: a => {
                    const t = bloccaTavola(state.projects[state.currentProjectId], a.tavola_id, !!a.bloccata); if (!t) throw new Error('Tavola non trovata.');
                    saveState(); return { ok: true };
                } },
                { n: 'tavola_nel_report', d: 'Mette una tavola nel report (true) o la toglie (false).', p: { tavola_id: { type: 'string' }, nel_report: { type: 'boolean' } }, req: ['tavola_id', 'nel_report'], w: true,
                  ds: a => `${a.nel_report ? 'Includere' : 'Escludere'} la tavola ${a.tavola_id} ${a.nel_report ? 'nel' : 'dal'} report`, run: a => {
                    const t = tavolaPerId(state.projects[state.currentProjectId], a.tavola_id); if (!t) throw new Error('Tavola non trovata.');
                    if (t.bloccata) throw new Error('La tavola è bloccata: sbloccala prima.');
                    t.inReport = !!a.nel_report; saveState(); return { ok: true };
                } },
                { n: 'duplica_tavola', d: 'Duplica una tavola salvata (stesse impostazioni, nome «… (copia)»).', p: { tavola_id: { type: 'string' } }, req: ['tavola_id'], w: true,
                  ds: a => `Duplicare la tavola ${a.tavola_id}`, run: a => {
                    const c = duplicaTavola(state.projects[state.currentProjectId], a.tavola_id); if (!c) throw new Error('Tavola non trovata.');
                    saveState(); return { ok: true, id: c.id, nome: c.nome };
                } },
                { n: 'ordina_tavole', d: 'Riordina le tavole salvate: elenco di id nell\'ordine voluto (quelle non nominate vanno in fondo).', p: { ids: { type: 'array', items: { type: 'string' } } }, req: ['ids'], w: true,
                  ds: a => `Riordinare le tavole (${(a.ids || []).length} indicate)`, run: a => {
                    if (!Array.isArray(a.ids)) throw new Error('Serve un elenco di id.');
                    ordinaTavole(state.projects[state.currentProjectId], a.ids.map(String)); saveState(); return { ok: true };
                } },
                { n: 'elimina_tavola', d: 'Elimina una tavola salvata (non quelle bloccate). Usala solo se l\'utente lo chiede in modo esplicito.', p: { tavola_id: { type: 'string' } }, req: ['tavola_id'], w: true,
                  ds: a => `Eliminare la tavola ${a.tavola_id}`, run: a => {
                    if (!eliminaTavola(state.projects[state.currentProjectId], a.tavola_id)) throw new Error('Tavola non trovata o bloccata.');
                    saveState(); return { ok: true };
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
                { n: 'elenco_livelli_gis', d: 'Elenca i livelli che si possono esportare per i GIS (QGIS, Google Earth) dal progetto aperto: id, nome, quanti elementi ci sono, se si possono esportare nel formato dato (gpkg, kmz o kml). Foto con la posizione, note e percorso solo nel GeoPackage.', p: { formato: { type: 'string', enum: ['gpkg', 'kmz', 'kml'] } }, run: a => livelliGisDisponibili(a.formato || 'gpkg') },
                { n: 'esporta_gis', d: 'Esporta il progetto aperto per i GIS e scarica il file: gpkg (QGIS, con gli stili; anche foto con la posizione e l\'immagine dentro, note, percorso), kmz o kml (Google Earth). Senza «livelli» mette tutti quelli disponibili; altrimenti un elenco di id (vedi elenco_livelli_gis). Se le foto pesano più di 40 MB l\'avviso lo dice: chiedi all\'utente se comprimerle e richiama con comprimi_foto true (o false per lasciarle fuori).', p: { formato: { type: 'string', enum: ['gpkg', 'kmz', 'kml'] }, livelli: { type: 'array', items: { type: 'string' } }, comprimi_foto: { type: 'boolean' } }, req: ['formato'],
                  ds: a => `Esportare il progetto in ${String(a.formato).toUpperCase()}`, run: async a => {
                    const disp = livelliGisDisponibili(a.formato), ok = disp.filter(l => l.disponibile).map(l => l.id), scelti = {};
                    const voluti = Array.isArray(a.livelli) && a.livelli.length ? a.livelli.map(String) : ok;
                    voluti.forEach(id => { if (!disp.some(l => l.id === id)) throw new Error('Livello sconosciuto: ' + id); if (ok.includes(id)) scelti[id] = true; });
                    const f = await produciFileGis(a.formato, scelti, { comprimiFoto: typeof a.comprimi_foto === 'boolean' ? a.comprimi_foto : undefined });
                    scaricaBlobFile(f.blob, f.nome);
                    return { ok: true, file: f.nome, livelli: Object.keys(scelti), avvisi: f.avvisi };
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
                        if (aiUiMappa.length >= 60) return;
                        const tipo = e.tagName === 'SELECT' ? 'menu' : e.tagName === 'TEXTAREA' ? 'testo' : e.tagName === 'INPUT' ? (e.type === 'checkbox' || e.type === 'radio' ? e.type : 'campo') : 'pulsante';
                        const riga = e.closest('.setting-row, .form-group, .field-row');
                        const lab = [e.getAttribute('aria-label'), e.title, e.textContent, e.placeholder, e.labels && e.labels[0] && e.labels[0].textContent, riga && (riga.querySelector('.setting-label, label') || {}).textContent, e.id].map(x => String(x || '').replace(/\s+/g, ' ').trim()).find(x => x).slice(0, 70) || '';
                        const o = { id: aiUiMappa.length, tipo, etichetta: lab };
                        if (e.type === 'password') o.riservato = true; // chiavi e frasi segrete: l'assistente non le legge mai
                        else if (tipo === 'campo' || tipo === 'testo' || tipo === 'menu') o.valore = String(e.value).slice(0, 60);
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
                    if (e.type === 'password') throw new Error('Questo campo è riservato (chiavi e frasi segrete): lo scrive solo l\'utente.');
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
                } },
                { n: 'importa_dati_sito_vecchio', d: 'Importa nell\'app le prove della vecchia versione del sito (dpsh.netlify.app) che sono ancora nel browser: la prova aperta e l\'archivio. Salta le copie identiche e non cancella niente di vecchio. Dice quante prove sono entrate.', p: {}, w: true,
                  ds: () => 'Importare i dati della vecchia versione del sito', run: async () => {
                    const r = await importaDatiSitoVecchio({ chiedi: false });
                    return { ok: true, prove_importate: r.importate, copie_saltate: r.copie, vuote_saltate: r.vuote, progetti_creati: r.progetti };
                } },
                { n: 'accedi_google', d: 'Accede con l\'account Google (versione web, serve rete). Si apre la finestra di Google: sceglie l\'utente. Dopo l\'accesso l\'app può chiedere all\'utente cosa fare con le chiavi API su Drive.', p: {}, w: true,
                  ds: () => 'Accedere con Google', run: async () => { const r = await googleAccedi(); if (!r.ok) throw new Error(r.motivo); return { ok: true, account: r.utente.email || r.utente.nome || 'collegato' }; } },
                { n: 'esci_google', d: 'Esce dall\'account Google: la sincronizzazione si ferma e le chiavi su Drive non si aggiornano. I dati sul dispositivo e su Drive restano.', p: {}, w: true,
                  ds: () => 'Uscire dall\'account Google', run: () => { if (!googleCollegato()) return { ok: true, nota: 'Non era collegato.' }; return googleEsci(); } },
                { n: 'salva_chiavi_su_drive', d: 'Salva su Drive le chiavi API dell\'assistente, cifrate. La frase segreta la scrive l\'utente nella finestra che si apre: tu non la vedi e non la conosci, non chiederla. Non puoi leggere né mostrare le chiavi.', p: {}, w: true,
                  ds: () => 'Salvare su Drive le chiavi API, cifrate (la frase la scrive l\'utente)', run: async () => chiaviFlusso('salva') },
                { n: 'recupera_chiavi_da_drive', d: 'Recupera da Drive le chiavi API cifrate e le mette su questo dispositivo (se sono diverse, l\'utente sceglie quali tenere). La frase la scrive l\'utente nella finestra: tu non la vedi. Non puoi leggere né mostrare le chiavi.', p: {}, w: true,
                  ds: () => 'Recuperare da Drive le chiavi API (la frase la scrive l\'utente)', run: async () => chiaviFlusso('recupera') },
                { n: 'stato_sincronizzazione', d: 'Dice se l\'app è collegata a Google, lo stato della sincronizzazione dei progetti su Drive (ultima volta, conflitti, cose da decidere) e le ultime voci del registro. Non mostra mai le chiavi API.', p: {}, run: () => {
                    const v = syncLeggi();
                    return { disponibile: googleAmmesso(), collegato: googleCollegato(), account: (googleSegno() || {}).email || null, stato: syncTestoStato() || 'Non collegato', ultima_sincronizzazione: v.ultima || null, conflitti: sync.pendenti.conflitti, da_decidere: sync.pendenti.decisioni, chiavi_su_drive_sbloccate: !!chiavi.sessione, registro: v.registro.slice(0, 8).map(r => ({ quando: r.t, cosa: r.cosa, perche: r.perche })) };
                } },
                { n: 'sincronizza_ora', d: 'Sincronizza ora i progetti con Drive (serve il login e la rete). Carica i cambiamenti di qui, scarica quelli nuovi e sostituisce quelli cambiati solo su Drive (prima una copia automatica). Non cancella mai niente: conflitti ed eliminazioni li decide l\'utente in una finestra con anteprima.', p: {}, w: true,
                  ds: () => 'Sincronizzare ora i progetti con Drive', run: async () => { const r = await sincronizza({ auto: false }); return { ok: r.ok, esito: r.esito }; } },
                { n: 'controlla_aggiornamenti_app', d: 'Controlla se è uscita una versione nuova dell\'app (versione web). Se c\'è, mostra all\'utente l\'avviso con il tasto Ricarica. Dice anche la versione in uso.', p: {}, run: async () => Object.assign({ versione_app: APP_VERSIONE }, await controllaAggiornamentiApp()) }
            ];
            const aiMsgSistema = () => 'Sei l\'assistente integrato in DPSH, un\'app per prove penetrometriche dinamiche (DPSH) in cantiere. Rispondi sempre in italiano, in modo breve e concreto. ' +
                'REGOLA PRINCIPALE: se l\'utente chiede di fare qualcosa, LA FAI TU con gli strumenti. Non dirgli mai di premere, cliccare, aprire un menu, andare su una schermata o compilare un campo: fallo tu e poi riassumi in una frase cosa hai fatto. Chiedi all\'utente solo i dati che mancano davvero. ' +
                'Usa gli strumenti per leggere i dati reali: non inventare mai numeri, profondità o colpi. Profondità in metri, colpi per intervallo di avanzamento. ' +
                'Sii veloce: raggruppa il lavoro. Più azioni indipendenti vanno chiamate insieme nello stesso passaggio; gli intervalli con aggiungi_intervalli in una sola chiamata; tutta la stratigrafia con crea_stratigrafia in una sola chiamata. Non fare un passaggio per ogni piccolo dato. Per le modifiche chiama lo strumento giusto: l\'app chiede la conferma all\'utente, non chiederla tu a parole. Puoi eliminare solo intervalli e strati, solo su richiesta esplicita, e l\'app chiede due conferme; prove e progetti non si eliminano da qui: spiega che serve farlo a mano scrivendo CANCELLA. Per i parametri avanzati leggi prima gli strati (leggi_strati) e usa gli indici che ti dà. ' +
                'Se non c\'è uno strumento diretto per l\'azione: prima prova elenco_comandi/esegui_comando o vai_a; altrimenti usa leggi_schermata, poi clicca e compila_campo, e rileggi la schermata dopo ogni azione (e dopo ogni apertura di finestra) finché il lavoro non è finito. ' +
                'Le chiavi API e le frasi segrete non le vedi mai e non le chiedi: per salvarle o recuperarle usa gli strumenti dedicati, la frase la scrive l\'utente nella finestra. ' +
                'Se uno strumento dà errore, riprova in un altro modo prima di arrenderti; solo se non è possibile dillo e proponi un\'alternativa. Stato attuale: ' + JSON.stringify(AI_STRUMENTI[0].run());


            // Strumenti inviati a ogni richiesta: sempre i generali; i gruppi specifici solo se la conversazione ne parla
            // (o se sono già stati usati). Se nessun gruppo combacia, si inviano tutti. Meno byte = meno limiti e timeout.
            const AI_CORE = ['stato_app', 'elenco_progetti', 'leggi_progetto', 'leggi_prova', 'elenco_comandi', 'avvisi_dati', 'riepilogo_giornata', 'vai_a', 'esegui_comando', 'leggi_schermata', 'clicca', 'compila_campo'];
            const AI_GRUPPI = [
                { re: /dtm|lidar|copernicus|opentopo|terrarium|quote del terreno|fonte|fonti|esagera|scala|righello|inquadr|mini-?vista|3d/i, t: ['fonti_dtm', 'leggi_dtm_progetto', 'carica_dtm_da_fonte', 'togli_dtm', 'imposta_dtm_opzioni', 'scala_vista3d'] },
                { re: /isoips|curve di livello|ombreggi|rilievo|hillshade|mappa 2d|mappa del progetto|dtm/i, t: ['leggi_isoipse_ombreggiatura', 'imposta_isoipse_ombreggiatura'] },
                { re: /strat|parametr|litolog|terren|coesion|angolo|peso|nspt|argill|sabbi|ghiai/i, t: ['crea_stratigrafia', 'leggi_strati', 'scegli_parametro_avanzato', 'autocompila_parametri', 'modifica_strato', 'aggiungi_strato', 'sposta_strato', 'assegna_strato', 'elimina_strato'] },
                { re: /colp|interval|profond|falda|gps|coordinat|dati della prova|metri/i, t: ['aggiungi_intervalli', 'modifica_intervallo', 'elimina_intervalli', 'imposta_falda', 'imposta_gps', 'modifica_dati_prova'] },
                { re: /strument|maglio|massa|asta|punta|prefer|impostazion|tema|font|unit/i, t: ['leggi_strumento_e_preferenze', 'modifica_strumento', 'imposta_preferenza'] },
                { re: /sito vecchio|vecchia versione|vecchio sito|importa.*(dati|prove)|aggiornament|versione|ricarica|netlify/i, t: ['importa_dati_sito_vecchio', 'controlla_aggiornamenti_app'] },
                { re: /google|drive|sincroniz|chiav|account|cloud|accedi|login|esci/i, t: ['accedi_google', 'esci_google', 'stato_sincronizzazione', 'sincronizza_ora', 'salva_chiavi_su_drive', 'recupera_chiavi_da_drive'] },
                { re: /bussola|orienta|nord/i, t: ['bussola_telefono'] },
                { re: /\bqr\b|codic[ei] qr|inquadr|passa.*(telefono|pc)|trasferi/i, t: ['qr_progetto'] },
                { re: /anteprim|miniatur|griglia|elenco|vista|home/i, t: ['vista_home', 'anteprime_progetti'] },
                { re: /gis|qgis|geopackage|gpkg|kml|kmz|google earth|esport/i, t: ['elenco_livelli_gis', 'esporta_gis'] },
                { re: /progett|nota|note|comune|committente|cre[ao]|nuov/i, t: ['vista_home', 'anteprime_progetti', 'crea_progetto', 'crea_prova', 'modifica_progetto', 'leggi_note_progetto', 'aggiungi_nota_progetto'] }
            ];
            function aiStrumentiPer(crono) {
                const utenti = crono.filter(m => m.r === 'u').slice(-3).map(m => m.t || '').join(' ');
                const usati = new Set(); crono.forEach(m => { (m.calls || []).forEach(k => usati.add(k.n)); });
                const gr = AI_GRUPPI.filter(g => g.re.test(utenti) || g.t.some(n => usati.has(n)));
                if (!gr.length) return AI_STRUMENTI;
                const ok = new Set(AI_CORE); gr.forEach(g => g.t.forEach(n => ok.add(n)));
                return AI_STRUMENTI.filter(x => ok.has(x.n));
            }
            // --- adattatori dei provider: tutti scambiano la stessa cronologia interna ---
            // cronologia: {r:'u',t} | {r:'a',t,calls:[{id,n,a}]} | {r:'t',res:[{id,n,c}]}

            // Allegati di un messaggio utente: m.all = [{tipo:'img', mime, b64, nome} | {tipo:'txt', nome, contenuto, tagliato}].
            // Quando una chat si salva, b64/contenuto/anteprima non vengono scritti (spazio): resta solo il nome.
            const aiTestoU = m => { let t = m.t || ''; (m.all || []).forEach(a => { if (a.tipo === 'txt') t += '\n\n[Allegato: ' + a.nome + (a.tagliato ? ' (troncato)' : '') + ']\n' + (a.contenuto != null ? a.contenuto : '(contenuto non più disponibile)'); else if (!a.b64) t += '\n\n[Immagine «' + a.nome + '» non più disponibile]'; }); return t; };
            const aiImg = m => (m.all || []).filter(a => a.tipo === 'img' && a.b64);
            const aiSchema = s => ({ type: 'object', properties: s.p, required: s.req || [] });
            const aiSenzaVuoti = o => Object.keys(o.properties).length ? o : undefined;
            const AI_ADATTATORI = {
                anthropic(d, c, crono) {
                    const msgs = crono.map(m => m.r === 'u' ? { role: 'user', content: aiImg(m).length ? aiImg(m).map(a => ({ type: 'image', source: { type: 'base64', media_type: a.mime, data: a.b64 } })).concat([{ type: 'text', text: aiTestoU(m) }]) : aiTestoU(m) }
                        : m.r === 'a' ? { role: 'assistant', content: [].concat(m.t ? [{ type: 'text', text: m.t }] : [], (m.calls || []).map(k => ({ type: 'tool_use', id: k.id, name: k.n, input: k.a || {} }))) }
                        : { role: 'user', content: m.res.map(x => ({ type: 'tool_result', tool_use_id: x.id, content: x.c })) });
                    return {
                        url: d.base + '/messages', headers: { 'x-api-key': c.chiave, 'anthropic-version': '2023-06-01', 'anthropic-dangerous-direct-browser-access': 'true' },
                        corpo: { model: c.modello, max_tokens: 1500, system: [{ type: 'text', text: aiMsgSistema(), cache_control: { type: 'ephemeral' } }], messages: msgs, tools: (t => { if (t.length) t[t.length - 1].cache_control = { type: 'ephemeral' }; return t; })(aiStrumentiPer(crono).map(s => ({ name: s.n, description: s.d, input_schema: aiSchema(s) }))) },
                        leggi: j => ({ t: (j.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n'), calls: (j.content || []).filter(b => b.type === 'tool_use').map(b => ({ id: b.id, n: b.name, a: b.input || {} })) })
                    };
                },
                openai(d, c, crono) {
                    const msgs = [{ role: 'system', content: aiMsgSistema() }];
                    crono.forEach(m => {
                        if (m.r === 'u') msgs.push({ role: 'user', content: aiImg(m).length ? [{ type: 'text', text: aiTestoU(m) }].concat(aiImg(m).map(a => ({ type: 'image_url', image_url: { url: 'data:' + a.mime + ';base64,' + a.b64 } }))) : aiTestoU(m) });
                        else if (m.r === 'a') msgs.push({ role: 'assistant', content: m.t || null, ...(m.calls && m.calls.length ? { tool_calls: m.calls.map(k => ({ id: k.id, type: 'function', function: { name: k.n, arguments: JSON.stringify(k.a || {}) } })) } : {}) });
                        else m.res.forEach(x => msgs.push({ role: 'tool', tool_call_id: x.id, content: x.c }));
                    });
                    const h = { 'Content-Type': 'application/json' };
                    if (c.chiave) h.Authorization = 'Bearer ' + c.chiave;
                    return {
                        url: (c.base || d.base).replace(/\/$/, '') + '/chat/completions', headers: h,
                        corpo: { model: c.modello, max_tokens: 1500, messages: msgs, tools: aiStrumentiPer(crono).map(s => ({ type: 'function', function: { name: s.n, description: s.d, parameters: aiSchema(s) } })) },
                        leggi: j => {
                            const m = ((j.choices || [])[0] || {}).message || {};
                            return { t: m.content || '', calls: (m.tool_calls || []).map((k, i) => { let a = {}; try { a = JSON.parse(k.function.arguments || '{}'); } catch (e) { /* argomenti rovinati: strumento senza argomenti */ } return { id: k.id || ('call_' + i), n: k.function.name, a }; }) };
                        }
                    };
                },
                gemini(d, c, crono) {
                    const contents = crono.map(m => m.r === 'u' ? { role: 'user', parts: [{ text: aiTestoU(m) }].concat(aiImg(m).map(a => ({ inlineData: { mimeType: a.mime, data: a.b64 } }))) }
                        : m.r === 'a' ? { role: 'model', parts: [].concat(m.t ? [{ text: m.t }] : [], (m.calls || []).map(k => Object.assign({ functionCall: { name: k.n, args: k.a || {} } }, k.ts ? { thoughtSignature: k.ts } : /gemini-3/i.test(c.modello || '') ? { thoughtSignature: 'skip_thought_signature_validator' } : {}))) }
                        : { role: 'user', parts: m.res.map(x => ({ functionResponse: { name: x.n, response: { result: x.c } } })) });
                    return {
                        url: d.base + '/models/' + encodeURIComponent(c.modello) + ':generateContent', headers: { 'x-goog-api-key': c.chiave },
                        corpo: { systemInstruction: { parts: [{ text: aiMsgSistema() }] }, contents, tools: [{ functionDeclarations: aiStrumentiPer(crono).map(s => ({ name: s.n, description: s.d, parameters: aiSenzaVuoti(aiSchema(s)) })) }] },
                        leggi: j => {
                            const parti = (((j.candidates || [])[0] || {}).content || {}).parts || [];
                            return { t: parti.filter(p => p.text).map(p => p.text).join('\n'), calls: parti.filter(p => p.functionCall).map((p, i) => ({ id: 'g' + Date.now() + i, n: p.functionCall.name, a: p.functionCall.args || {}, ts: p.thoughtSignature || undefined })) };
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

            // --- risposta a flusso (SSE): il testo compare mentre arriva. Se il provider non manda un flusso
            // (o il browser non lo sa leggere) si ricade sulla risposta intera, come prima. ---
            const aiJson = t => { try { return JSON.parse(t || '{}'); } catch (e) { return {}; } };
            const AI_FLUSSI = {
                anthropic: () => ({
                    corpo: { stream: true }, nuovo: () => ({ testo: '', b: {} }),
                    evento(e, st) {
                        if (e.type === 'error') throw new Error((e.error && e.error.message) || 'errore nel flusso');
                        if (e.type === 'content_block_start') st.b[e.index] = Object.assign({ txt: '', json: '' }, e.content_block);
                        else if (e.type === 'content_block_delta' && st.b[e.index]) {
                            const b = st.b[e.index], dl = e.delta || {};
                            if (dl.type === 'text_delta') b.txt += dl.text || ''; else if (dl.type === 'input_json_delta') b.json += dl.partial_json || '';
                            st.testo = Object.keys(st.b).map(Number).sort((x, y) => x - y).map(k => st.b[k]).filter(x => x.type === 'text').map(x => x.txt).join('\n');
                        }
                    },
                    fine: st => { const bl = Object.keys(st.b).map(Number).sort((x, y) => x - y).map(k => st.b[k]); return { t: st.testo, calls: bl.filter(b => b.type === 'tool_use').map(b => ({ id: b.id, n: b.name, a: aiJson(b.json) })) }; }
                }),
                openai: () => ({
                    corpo: { stream: true }, nuovo: () => ({ testo: '', k: {} }),
                    evento(e, st) {
                        if (e.error) throw new Error(e.error.message || 'errore nel flusso');
                        const dl = ((e.choices || [])[0] || {}).delta || {};
                        if (dl.content) st.testo += dl.content;
                        (dl.tool_calls || []).forEach(t => { const i = t.index || 0, x = st.k[i] || (st.k[i] = { id: '', n: '', arg: '' }); if (t.id) x.id = t.id; if (t.function) { if (t.function.name) x.n += t.function.name; if (t.function.arguments) x.arg += t.function.arguments; } });
                    },
                    fine: st => ({ t: st.testo, calls: Object.keys(st.k).map(i => ({ id: st.k[i].id || ('call_' + i), n: st.k[i].n, a: aiJson(st.k[i].arg) })) })
                }),
                gemini: (d, c) => ({
                    url: d.base + '/models/' + encodeURIComponent(c.modello) + ':streamGenerateContent?alt=sse', corpo: {}, nuovo: () => ({ testo: '', calls: [] }),
                    evento(e, st) {
                        if (e.error) throw new Error(e.error.message || 'errore nel flusso');
                        (((((e.candidates || [])[0] || {}).content) || {}).parts || []).forEach(p => { if (p.text) st.testo += p.text; if (p.functionCall) st.calls.push({ id: 'g' + Date.now() + st.calls.length, n: p.functionCall.name, a: p.functionCall.args || {}, ts: p.thoughtSignature || undefined }); });
                    },
                    fine: st => ({ t: st.testo, calls: st.calls })
                })
            };
            async function aiLeggiFlusso(risp, fl, onTesto, arma) {
                const rd = risp.body.getReader(), dec = new TextDecoder(), st = fl.nuovo(); let buf = '';
                const elabora = blocco => {
                    const dati = blocco.split(/\r?\n/).filter(l => l.startsWith('data:')).map(l => l.slice(5).trim()).join('');
                    if (!dati || dati === '[DONE]') return;
                    let ev; try { ev = JSON.parse(dati); } catch (e) { return; }
                    const prima = st.testo.length; fl.evento(ev, st);
                    if (st.testo.length !== prima) onTesto(st.testo);
                };
                for (;;) {
                    const { done, value } = await rd.read();
                    if (done) break;
                    arma(); buf += dec.decode(value, { stream: true });
                    let i; while ((i = buf.search(/\r?\n\r?\n/)) >= 0) { const bl = buf.slice(0, i); buf = buf.slice(i).replace(/^\r?\n\r?\n/, ''); elabora(bl); }
                }
                if (buf.trim()) elabora(buf);
                return fl.fine(st);
            }
            // Invio di una richiesta già costruita (url, headers, corpo) con tempo massimo e messaggi d'errore
            // in italiano. Lo usano la chat (aiChiama) e la lettura dei fogli di campo (072b).
            async function aiPostaRichiesta(d, r, ms, onTesto) {
                const ctl = new AbortController(); aiCtlAtt = ctl;
                let timer = 0; const arma = () => { clearTimeout(timer); timer = setTimeout(() => ctl.abort(), ms || 60000); }; arma();
                const fl = onTesto && r.flusso && typeof TextDecoder === 'function' ? r.flusso : null;
                try {
                    const risp = await fetch(fl && fl.url ? fl.url : r.url, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, r.headers), body: JSON.stringify(fl ? Object.assign({}, r.corpo, fl.corpo) : r.corpo), signal: ctl.signal });
                    if (!risp.ok) {
                        let det = ''; try { const j = await risp.json(); det = (j.error && (j.error.message || j.error)) || ''; } catch (e) { /* corpo non JSON */ }
                        const m = risp.status === 401 || risp.status === 403 ? 'chiave non valida o senza permesso'
                            : risp.status === 429 ? (/quota|billing|exceeded/i.test(String(det)) ? 'quota del piano finita: aspetta (di solito il giorno dopo) o scegli un altro modello dal menu, per esempio flash-lite' : 'limite raggiunto o credito esaurito')
                            : risp.status === 404 ? 'modello non più disponibile: riapri il provider e scegline un altro dal menu'
                            : 'errore ' + risp.status;
                        const err = new Error(m + (det ? ' — ' + String(det).slice(0, 160) : ''));
                        if (risp.status === 429) {
                            let att = parseFloat(risp.headers && risp.headers.get && risp.headers.get('retry-after'));
                            if (isNaN(att)) { const mm = /(?:in|after|ritenta\w*)\D{0,12}([\d.]+)\s*(ms|s|m)\b/i.exec(String(det)); att = mm ? parseFloat(mm[1]) * ({ ms: 0.001, s: 1, m: 60 })[mm[2].toLowerCase()] : (/quota|billing|exceeded/i.test(String(det)) ? 999 : 8); }
                            err.limite = true; err.attesa = att;
                        }
                        throw err;
                    }
                    if (fl && risp.body && risp.body.getReader && /event-stream/i.test((risp.headers && risp.headers.get && risp.headers.get('content-type')) || '')) return await aiLeggiFlusso(risp, fl, onTesto, arma);
                    return r.leggi(await risp.json());
                } catch (e) {
                    if (e.name === 'AbortError' && aiFermato) throw new Error('Interrotto da te.');
                    if (e.name === 'AbortError') throw new Error('nessuna risposta entro ' + Math.round((ms || 60000) / 1000) + ' secondi');
                    if (e instanceof TypeError) throw new Error(d.id === 'ollama' ? 'Ollama non raggiungibile: è avviato e ha OLLAMA_ORIGINS="*"?' : 'rete assente o richiesta bloccata');
                    throw e;
                } finally { clearTimeout(timer); }
            }

            // Prima di ogni richiesta la cronologia si «pota» (la copia salvata non cambia): risultati di strumenti
            // vecchi accorciati, immagini solo nelle ultime 2 domande, al massimo ~40 voci. Meno testo = meno timeout.
            const AI_MAX_VOCI = 40, AI_MAX_RIS = 6000, AI_MAX_RIS_VECCHIO = 500;
            function aiPotaCrono(crono) {
                let da = 0;
                if (crono.length > AI_MAX_VOCI) for (let i = crono.length - AI_MAX_VOCI; i < crono.length; i++) if (crono[i].r === 'u') { da = i; break; }
                const v = crono.slice(da), ultimaT = (() => { for (let i = v.length - 1; i >= 0; i--) if (v[i].r === 't') return i; return -1; })();
                const conImg = []; v.forEach((m, i) => { if (m.r === 'u' && (m.all || []).some(a => a.tipo === 'img' && a.b64)) conImg.push(i); });
                const tieni = new Set(conImg.slice(-2));
                const taglia = (c, lim) => (typeof c === 'string' && c.length > lim) ? c.slice(0, lim) + '…[troncato]' : c;
                return v.map((m, i) => {
                    if (m.r === 't') return Object.assign({}, m, { res: m.res.map(x => Object.assign({}, x, { c: taglia(x.c, i === ultimaT ? AI_MAX_RIS : AI_MAX_RIS_VECCHIO) })) });
                    if (m.r === 'u' && m.all && conImg.includes(i) && !tieni.has(i)) return Object.assign({}, m, { all: m.all.map(a => a.tipo === 'img' ? Object.assign({}, a, { b64: undefined }) : a) });
                    return m;
                });
            }
            async function aiChiama(id, crono, onTesto) {
                const d = aiDef(id), c = aiConf(id);
                for (let tent = 0; ; tent++) {
                    try {
                        const r = AI_ADATTATORI[d.tipo](d, c, aiPotaCrono(crono));
                        if (onTesto && AI_FLUSSI[d.tipo]) r.flusso = AI_FLUSSI[d.tipo](d, c);
                        return await aiPostaRichiesta(d, r, 120000, onTesto);
                    } catch (e) {
                        // «troppe richieste»: se l'attesa è breve si aspetta e si riprova, prima di passare al provider dopo
                        if (!e.limite || tent >= 2 || e.attesa > 30 || aiFermato) throw e;
                        for (let k = Math.ceil(e.attesa) + 1; k > 0 && !aiFermato; k--) { aiStatoFn('Limite di ' + d.nome + ' raggiunto: riprovo tra ' + k + ' s'); await new Promise(r => setTimeout(r, 1000)); }
                    }
                }
            }
            // Un giro di domanda: prova i provider nell'ordine scelto, passando al successivo se uno fallisce.
            async function aiChiamaConFallback(crono, avvisa, onTesto, azzera, inizio) {
                let pronti = aiProntiInOrdine();
                if (!pronti.length) throw new Error('Nessun provider configurato. Aprilo da Impostazioni › Assistente IA › Provider e chiavi API.');
                const errori = [];
                // chi ha appena detto «quota finita» salta il turno (non si spreca una richiesta per niente); se sono tutti in pausa si riprova
                const attivi = pronti.filter(id => !(aiPausa[id] > Date.now()));
                if (attivi.length && attivi.length < pronti.length) avvisa('In pausa per quota: ' + pronti.filter(id => !attivi.includes(id)).map(id => aiDef(id).nome).join(', ') + '.');
                if (attivi.length) pronti = attivi;
                for (const id of pronti) {
                    try { if (inizio) inizio(id); const r = await aiChiama(id, crono, onTesto); if (errori.length) avvisa(`Risponde ${aiDef(id).nome}.`); return r; }
                    catch (e) { if (azzera) azzera(); if (aiFermato) throw e; if (e.limite && e.attesa > 30) aiPausa[id] = Date.now() + Math.min(e.attesa, 1800) * 1000; errori.push(aiDef(id).nome + ': ' + e.message); avvisa(`${aiDef(id).nome} non ha funzionato (${e.message}).` + (id !== pronti[pronti.length - 1] ? ' Provo il successivo…' : '')); }
                }
                throw new Error('Nessun provider ha risposto.\n' + errori.join('\n'));
            }

            // --- bolla e chat ---
            const aiBolla = aiEl('button', null); aiBolla.id = 'aiBolla'; aiBolla.type = 'button'; aiBolla.setAttribute('aria-label', 'Assistente IA');
            aiBolla.innerHTML = '<svg class="ico"><use href="#i-sparkles"/></svg>';
            const aiPannello = aiEl('div'); aiPannello.id = 'aiPannello'; aiPannello.setAttribute('role', 'dialog'); aiPannello.setAttribute('aria-label', 'Assistente IA');
            const aiTesta = aiEl('div', 'ai-testa'); aiTesta.append(aiEl('span', null, 'Assistente IA'), aiEl('span', 'ai-spazio'));
            const aiBtnCron = aiEl('button', 'ai-ib'), aiBtnNuova = aiEl('button', 'ai-ib'), aiBtnChiudi = aiEl('button', 'ai-ib');
            [[aiBtnCron, 'i-list', 'Cronologia delle chat'], [aiBtnNuova, 'i-plus', 'Nuova chat'], [aiBtnChiudi, 'i-x', 'Chiudi']].forEach(([b, ic, et]) => { b.type = 'button'; b.setAttribute('aria-label', et); b.title = et; b.innerHTML = '<svg class="ico"><use href="#' + ic + '"/></svg>'; });
            aiTesta.append(aiBtnCron, aiBtnNuova, aiBtnChiudi);
            const aiSub = aiEl('div', 'ai-sub'), aiChip = aiEl('div', 'ai-chip-prog');
            const aiSelProv = aiEl('select'), aiSelMod = aiEl('select'); aiSelProv.setAttribute('aria-label', 'Provider'); aiSelMod.setAttribute('aria-label', 'Modello');
            const aiRigaSel = aiEl('div', 'ai-sel'); aiRigaSel.append(aiSelProv, aiSelMod);
            aiSub.append(aiChip, aiRigaSel);
            const aiElencoCron = aiEl('div', 'ai-cron'); // elenco delle chat del progetto, sopra la chat
            const aiChat = aiEl('div', 'ai-chat'); aiChat.setAttribute('aria-live', 'polite');
            const aiPiedi = aiEl('div', 'ai-piedi');
            const aiCampo = aiEl('textarea'); aiCampo.placeholder = 'Chiedi o ordina qualcosa…'; aiCampo.rows = 1;
            const aiInvia = aiEl('button', 'ai-invia', 'Invia');
            const aiClip = aiEl('button', 'ai-clip'); aiClip.type = 'button'; aiClip.setAttribute('aria-label', 'Allega un\'immagine o un file di testo'); aiClip.title = 'Allega'; aiClip.innerHTML = '<svg class="ico"><use href="#i-upload"/></svg>';
            const aiFile = aiEl('input'); aiFile.type = 'file'; aiFile.multiple = true; aiFile.hidden = true; aiFile.accept = 'image/*,.txt,.csv,.tsv,.json,.md,.xml,.kml,.gpx,.log';
            const aiAllRiga = aiEl('div', 'ai-allegati'); aiAllRiga.hidden = true;
            const aiGiu = aiEl('button', 'ai-giu'); aiGiu.type = 'button'; aiGiu.setAttribute('aria-label', 'Vai in fondo'); aiGiu.innerHTML = '<svg class="ico"><use href="#i-chevron-down"/></svg>';
            aiPiedi.append(aiClip, aiCampo, aiInvia, aiFile);
            aiPannello.append(aiTesta, aiSub, aiElencoCron, aiChat, aiGiu, aiAllRiga, aiPiedi);
            aiChat.addEventListener('scroll', () => aiGiu.classList.toggle('vis', !aiVicino()));
            aiGiu.onclick = () => { aiChat.scrollTo ? aiChat.scrollTo({ top: aiChat.scrollHeight, behavior: 'smooth' }) : (aiChat.scrollTop = aiChat.scrollHeight); };
            // allegati: immagini (rimpicciolite a 1280 px) e file di testo (fino a 60 000 caratteri), max 4 per messaggio
            let aiAllegati = [];
            function aiDisegnaAllegati() {
                aiAllRiga.textContent = ''; aiAllRiga.hidden = !aiAllegati.length;
                aiAllegati.forEach((a, i) => {
                    const c = aiEl('div', 'ai-all');
                    if (a.anteprima) { const im = aiEl('img'); im.src = a.anteprima; im.alt = ''; c.appendChild(im); } else c.appendChild(aiEl('span', 'ai-all-ico', 'TXT'));
                    const x = aiEl('button', null, '✕'); x.type = 'button'; x.setAttribute('aria-label', 'Togli ' + a.nome); x.onclick = () => { aiAllegati.splice(i, 1); aiDisegnaAllegati(); };
                    c.append(aiEl('span', 'ai-all-nome', a.nome), x); aiAllRiga.appendChild(c);
                });
            }
            async function aiLeggiAllegato(f) {
                if (/^image\//.test(f.type)) return new Promise((ok, ko) => {
                    const url = URL.createObjectURL(f), im = new Image();
                    im.onload = () => { const sc = Math.min(1, 1280 / Math.max(im.width, im.height)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(im.width * sc)); cv.height = Math.max(1, Math.round(im.height * sc)); cv.getContext('2d').drawImage(im, 0, 0, cv.width, cv.height); URL.revokeObjectURL(url); const u = cv.toDataURL('image/jpeg', 0.82); ok({ tipo: 'img', mime: 'image/jpeg', b64: u.split(',')[1], nome: f.name || 'immagine', anteprima: u }); };
                    im.onerror = () => { URL.revokeObjectURL(url); ko(new Error('Non riesco a leggere l\'immagine «' + (f.name || '') + '».')); };
                    im.src = url;
                });
                if (f.size > 3e6) throw new Error('«' + f.name + '» è troppo grande (massimo 3 MB).');
                const t = await (f.text ? f.text() : new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsText(f); }));
                if (t.indexOf('\u0000') >= 0) throw new Error('«' + f.name + '» non è un file di testo.');
                return { tipo: 'txt', nome: f.name, contenuto: t.slice(0, 60000), tagliato: t.length > 60000 };
            }
            async function aiAggiungiFile(files) {
                for (const f of files) {
                    if (aiAllegati.length >= 4) { aiMsg('info', 'Al massimo 4 allegati per messaggio.', false); break; }
                    try { aiAllegati.push(await aiLeggiAllegato(f)); } catch (e) { aiMsg('info', e.message, false); }
                }
                aiDisegnaAllegati();
            }
            aiClip.onclick = () => aiFile.click();
            aiFile.onchange = async () => { await aiAggiungiFile([].slice.call(aiFile.files)); aiFile.value = ''; };
            aiPannello.addEventListener('paste', e => { const fs = [].slice.call((e.clipboardData && e.clipboardData.files) || []).filter(f => /^image\//.test(f.type)); if (fs.length) { e.preventDefault(); aiAggiungiFile(fs); } });
            aiPannello.addEventListener('dragover', e => { if (e.dataTransfer && [].indexOf.call(e.dataTransfer.types || [], 'Files') >= 0) { e.preventDefault(); aiPannello.classList.add('trascina'); } });
            aiPannello.addEventListener('dragleave', e => { if (e.target === aiPannello) aiPannello.classList.remove('trascina'); });
            aiPannello.addEventListener('drop', e => { aiPannello.classList.remove('trascina'); if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) { e.preventDefault(); aiAggiungiFile([].slice.call(e.dataTransfer.files)); } });
            document.body.append(aiBolla, aiPannello);

            // CRONOLOGIA PER PROGETTO: le chat si salvano in una voce propria del localStorage (come le chiavi,
            // fuori da backup e condivisioni), divise per progetto. Una chat per volta è «attiva».
            const AI_CRONO_CHIAVE = 'DPSH_AI_CRONO_V1', AI_MAX_CHAT = 25, AI_MAX_RIGHE = 80;
            let aiArchivio = {};
            try { const g = JSON.parse(localStorage.getItem(AI_CRONO_CHIAVE) || 'null'); if (g && typeof g === 'object') aiArchivio = g; } catch (e) { /* voce rovinata: si riparte vuoti */ }
            const aiPidAtt = () => state.currentProjectId || '_';
            const aiNomeProg = pid => pid === '_' ? 'Nessun progetto aperto' : (((state.projects || {})[pid] || {}).name || 'Progetto');
            function aiScriviArchivio() { try { localStorage.setItem(AI_CRONO_CHIAVE, JSON.stringify(aiArchivio, (k, v) => (k === 'b64' || k === 'contenuto' || k === 'anteprima') ? undefined : v)); } catch (e) { /* spazio pieno: la chat resta solo a schermo */ } }
            let aiCrono = [], aiOccupato = false, aiChatAtt = null, aiFermato = false, aiCtlAtt = null, aiStatoFn = () => {};
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

            const aiVicino = () => aiChat.scrollHeight - aiChat.scrollTop - aiChat.clientHeight < 120;
            // sotto ogni messaggio: Copia (sempre), Modifica (le tue domande), «Mostra tutto» se è lungo
            function aiCopiaTesto(t) {
                if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
                return new Promise((ok, ko) => { const x = document.createElement('textarea'); x.value = t; x.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(x); x.select(); try { document.execCommand('copy') ? ok() : ko(); } catch (e) { ko(e); } x.remove(); });
            }
            function aiModifica(m, ci) {
                if (aiOccupato) return;
                const e = aiCrono[ci]; if (!e || e.r !== 'u') return;
                aiCampo.value = e.t === 'Guarda gli allegati.' ? '' : e.t;
                aiAllegati = (e.all || []).filter(a => a.tipo === 'txt' ? a.contenuto != null : !!a.b64);
                aiCrono.length = ci;
                if (aiChatAtt) { const k = aiChatAtt.vista.findIndex(v => v[2] === ci); if (k >= 0) aiChatAtt.vista.length = k; }
                while (m.nextSibling) m.nextSibling.remove();
                m.remove(); aiDisegnaAllegati(); aiCampo.dispatchEvent(new Event('input')); aiCampo.focus(); aiSalvaChat();
            }
            function aiRifinisci(m, testo, cls, ci) {
                m.querySelectorAll('.ai-az, .ai-espandi').forEach(x => x.remove());
                if (cls !== 'ia' && cls !== 'utente') return;
                const az = aiEl('div', 'ai-az');
                const bt = (et, ic, fn) => { const b = aiEl('button'); b.type = 'button'; b.innerHTML = '<svg class="ico"><use href="#' + ic + '"/></svg>'; b.appendChild(document.createTextNode(et)); b.onclick = fn; az.appendChild(b); };
                bt('Copia', 'i-copy', async ev => { ev.stopPropagation(); const b = ev.currentTarget; try { await aiCopiaTesto(testo); b.lastChild.textContent = 'Copiato ✓'; } catch (er) { b.lastChild.textContent = 'Non riesco'; } setTimeout(() => { b.lastChild.textContent = 'Copia'; }, 1400); });
                if (cls === 'utente' && ci != null) bt('Modifica', 'i-edit', () => aiModifica(m, ci));
                m.appendChild(az);
                if (testo && testo.length > 900) {
                    m.classList.add('lungo', 'chiuso');
                    const t = aiEl('button', 'ai-espandi', 'Mostra tutto'); t.type = 'button';
                    t.onclick = () => { const c = m.classList.toggle('chiuso'); t.textContent = c ? 'Mostra tutto' : 'Riduci'; };
                    m.appendChild(t);
                }
            }
            function aiMsg(cls, testo, salva) {
                const m = aiEl('div', 'ai-msg ' + cls, cls === 'ia' ? null : testo); if (cls === 'ia') m.appendChild(aiFormatta(testo)); const vic = aiVicino(); aiChat.appendChild(m); aiRifinisci(m, testo, cls, cls === 'utente' ? aiCrono.length - 1 : null); if (vic || cls === 'utente') aiChat.scrollTop = aiChat.scrollHeight;
                if (salva !== false && aiChatAtt && cls !== 'attesa') { aiChatAtt.vista.push(cls === 'utente' ? [cls, testo, aiCrono.length - 1] : [cls, testo]); aiSalvaChat(); }
                return m;
            }
            function aiMostraChat(c) {
                aiChatAtt = c; aiCrono = c.crono;
                aiChat.textContent = '';
                c.vista.forEach(([cls, t, ci]) => { const m = aiEl('div', 'ai-msg ' + cls, cls === 'ia' ? null : t); if (cls === 'ia') m.appendChild(aiFormatta(t)); aiChat.appendChild(m); aiRifinisci(m, t, cls, ci); });
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
                aiStatoFn('Aspetto la tua conferma…');
                return new Promise(res => {
                    const testoM = pericolo ? 'ATTENZIONE, ultima conferma: ' + testo : 'L\'assistente vuole: ' + testo;
                    const m = aiMsg(pericolo ? 'errore' : 'azione', pericolo ? 'ATTENZIONE, ultima conferma: ' + testo + '. L\'app fa prima una copia automatica, ma l\'azione non si annulla da qui.' : 'L\'assistente vuole: ' + testo, false);
                    const riga = aiEl('div', 'ai-conferma'), si = aiEl('button', 'si', 'Conferma'), no = aiEl('button', null, 'Annulla');
                    const sempre = aiEl('button', null, 'Sempre in questa chat'); sempre.title = 'Da ora le modifiche normali in questa chat non chiedono conferma. Le eliminazioni la chiedono sempre.'; if (pericolo) riga.append(no, si); else riga.append(no, sempre, si); m.appendChild(riga);
                    const fine = v => { riga.remove(); m.appendChild(aiEl('div', null, v ? '✓ Confermato' : '✕ Annullato')); if (aiChatAtt) { aiChatAtt.vista.push([pericolo ? 'errore' : 'azione', testoM + (v ? ' — ✓ Confermato' : ' — ✕ Annullato')]); aiSalvaChat(); } res(v); };
                    si.onclick = () => fine(true); no.onclick = () => fine(false); sempre.onclick = () => { if (aiChatAtt) { aiChatAtt.auto = true; aiSalvaChat(); } fine(true); };
                });
            }
            async function aiEseguiStrumento(k) {
                const s = AI_STRUMENTI.find(x => x.n === k.n);
                if (!s) return { c: JSON.stringify({ errore: 'Strumento sconosciuto.' }) };
                const args = (k.a && typeof k.a === 'object') ? k.a : {};
                const serveConferma = typeof s.w === 'function' ? s.w(args) : !!s.w;
                if (k.pre === 'no') return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                const salta = (k.pre === true || (aiChatAtt && aiChatAtt.auto)) && s.w !== 'doppia';
                if (serveConferma && !salta && !(await aiConferma(s.ds ? s.ds(args) : s.n))) return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                if (s.w === 'doppia' && !(await aiConferma(s.ds(args), true))) return { c: JSON.stringify({ errore: 'L\'utente ha annullato l\'azione.' }) };
                try { const out = await s.run(args); if (serveConferma) aiMsg('info', '✓ ' + (s.ds ? s.ds(args) : s.n)); return { c: JSON.stringify(out === undefined ? { ok: true } : out) }; }
                catch (e) { return { c: JSON.stringify({ errore: e.message }) }; }
            }
            // vero se la risposta spiega all'utente cosa premere invece di farlo (l'assistente deve agire da sé)
            const aiDaIstruzioni = t => /\b(premi|clicca|cliccare|tocca|apri il menu|apri le impostazioni|vai (su|in|nel|alla|a)|seleziona|scegli la voce|puoi (premere|cliccare|aprire))\b/i.test(t || '');
            // frase breve in italiano su cosa sta facendo l'assistente con un certo strumento
            function aiEtichetta(n, a) {
                const s = AI_STRUMENTI.find(x => x.n === n);
                if (/^leggi_schermata$/.test(n)) return 'Guardo cosa c\'è sullo schermo';
                if (n === 'clicca') return 'Premo un pulsante';
                if (n === 'compila_campo') return 'Compilo un campo';
                if (n === 'vai_a') return 'Apro la schermata' + (a && a.schermata ? ' «' + a.schermata + '»' : '');
                if (n === 'esegui_comando') return 'Eseguo il comando' + (a && a.etichetta ? ' «' + a.etichetta + '»' : '');
                if (n === 'elenco_comandi') return 'Cerco i comandi disponibili';
                if (/^(leggi|elenco|cerca|calcola|mostra)/.test(n)) return 'Leggo i dati (' + n.replace(/_/g, ' ') + ')';
                return (s && s.ds ? s.ds(a || {}) : 'Uso lo strumento «' + n.replace(/_/g, ' ') + '»');
            }
            async function aiInviaDomanda() {
                if (aiOccupato) { aiFermato = true; try { aiCtlAtt && aiCtlAtt.abort(); } catch (e) { /* già finita */ } return; }
                const testo = aiCampo.value.trim();
                if (!testo && !aiAllegati.length) return;
                if (!aiChatAtt) aiSaluto();
                const allegati = aiAllegati.slice(), testoU = testo || 'Guarda gli allegati.';
                aiCampo.value = ''; aiCampo.style.height = ''; aiAllegati = []; aiDisegnaAllegati();
                aiCrono.push({ r: 'u', t: testoU, all: allegati.length ? allegati : undefined }); aiChatAtt.crono = aiCrono;
                aiMsg('utente', testoU + (allegati.length ? '\n📎 ' + allegati.map(a => a.nome).join(', ') : ''));
                aiOccupato = true; aiFermato = false; aiInvia.textContent = 'Stop'; aiInvia.classList.add('stop'); aiPannello.classList.add('occupato'); aiBolla.classList.add('pensa');
                // la bolla di attesa dice cosa succede: fase corrente, secondi, passi già fatti
                const attesa = aiMsg('attesa info', '', false); attesa.setAttribute('role', 'status');
                const fase = aiEl('span', 'ai-fase', 'Penso'), pt = aiEl('span', 'ai-pt'), sec = aiEl('span', 'ai-sec'), passi = aiEl('div', 'ai-passi');
                for (let i = 0; i < 3; i++) pt.appendChild(aiEl('i'));
                attesa.append(fase, pt, sec, passi);
                const t0 = Date.now(), tick = setInterval(() => { sec.textContent = Math.round((Date.now() - t0) / 1000) + ' s'; }, 1000);
                const stato = t => { fase.textContent = t; }; aiStatoFn = stato;
                const passo = t => { const r = aiEl('div', 'ai-passo', t + '…'); passi.appendChild(r); while (passi.children.length > 5) passi.firstChild.remove(); aiChat.scrollTop = aiVicino() ? aiChat.scrollHeight : aiChat.scrollTop; return { ok: () => { r.classList.add('fatto'); r.textContent = '✓ ' + t; }, no: () => { r.classList.add('fallito'); r.textContent = '✕ ' + t; } }; };
                let spinto = false;
                try {
                    for (let giro = 0; giro < AI_MAX_GIRI && !aiFermato; giro++) {
                        attesa.style.display = ''; aiChat.appendChild(attesa); let vivo = null; stato(giro ? 'Rifletto sul risultato' : 'Penso');
                        const r = await aiChiamaConFallback(aiCrono, t => aiMsg('info', t), tutto => {
                            const vic = aiVicino();
                            if (!vivo) { vivo = aiEl('div', 'ai-msg ia'); aiChat.insertBefore(vivo, attesa); stato('Scrivo la risposta'); }
                            vivo.textContent = ''; vivo.appendChild(aiFormatta(tutto)); if (vic) aiChat.scrollTop = aiChat.scrollHeight;
                        }, () => { if (vivo) { vivo.remove(); vivo = null; } }, id => stato('Chiedo a ' + aiDef(id).nome + (aiConf(id).modello ? ' (' + aiConf(id).modello + ')' : '')));
                        aiCrono.push({ r: 'a', t: r.t, calls: r.calls });
                        if (vivo) { vivo.textContent = ''; vivo.appendChild(aiFormatta(r.t)); aiRifinisci(vivo, r.t, 'ia'); if (aiChatAtt) { aiChatAtt.vista.push(['ia', r.t]); aiSalvaChat(); } }
                        else if (r.t) aiMsg('ia', r.t);
                        if (!r.calls.length) {
                            if (!spinto && aiDaIstruzioni(r.t)) { spinto = true; aiCrono.push({ r: 'u', t: 'Non dirmi come fare: fallo tu adesso con gli strumenti (esegui_comando, vai_a, leggi_schermata, clicca, compila_campo) e poi dimmi in una frase cosa hai fatto.' }); continue; }
                            break;
                        }
                        const res = [];
                        // più modifiche nello stesso passaggio: una conferma sola per tutte
                        const daConf = r.calls.filter(k => { const sx = AI_STRUMENTI.find(x => x.n === k.n); return sx && (typeof sx.w === 'function' ? sx.w(k.a || {}) : !!sx.w) && sx.w !== 'doppia'; });
                        if (daConf.length > 1 && !(aiChatAtt && aiChatAtt.auto)) {
                            const riep = daConf.map(k => { const sx = AI_STRUMENTI.find(x => x.n === k.n); try { return '• ' + (sx.ds ? sx.ds(k.a || {}) : sx.n); } catch (e) { return '• ' + sx.n; } }).join('\n');
                            const ok = await aiConferma(daConf.length + ' azioni insieme:\n' + riep);
                            daConf.forEach(k => { k.pre = ok ? true : 'no'; });
                        }
                        for (const k of r.calls) {
                            if (aiFermato) break;
                            const ps = passo(aiEtichetta(k.n, k.a)); stato('Lavoro sull\'app');
                            const o = await aiEseguiStrumento(k); res.push({ id: k.id, n: k.n, c: o.c });
                            if (/"errore"/.test(o.c)) ps.no(); else ps.ok();
                        }
                        if (aiFermato) { aiCrono.push({ r: 't', res: r.calls.map(k => ({ id: k.id, n: k.n, c: (res.find(x => x.id === k.id) || {}).c || JSON.stringify({ errore: 'Interrotto.' }) })) }); break; }
                        aiCrono.push({ r: 't', res });
                        if (giro === AI_MAX_GIRI - 1) aiMsg('info', 'Mi fermo qui: troppi passaggi di fila.');
                    }
                    if (aiFermato) aiMsg('info', 'Mi sono fermato, come hai chiesto.');
                } catch (e) { aiMsg(aiFermato ? 'info' : 'errore', e.message); }
                clearInterval(tick); aiStatoFn = () => {};
                aiSalvaChat(); attesa.remove(); aiOccupato = false; aiFermato = false; aiCtlAtt = null; aiInvia.textContent = 'Invia'; aiInvia.classList.remove('stop'); aiPannello.classList.remove('occupato'); aiBolla.classList.remove('pensa'); aiCampo.focus();
            }
            aiInvia.onclick = aiInviaDomanda;
            aiCampo.addEventListener('input', () => { aiCampo.style.height = 'auto'; aiCampo.style.height = Math.min(168, Math.max(40, aiCampo.scrollHeight)) + 'px'; });
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
                if (!aiProntiInOrdine().length) { const mm = aiMsg('info', 'Manca la chiave API. ', false), bb = aiEl('button', 'ai-chip', 'Configura ora'); bb.type = 'button'; bb.onclick = aiWizElenco; mm.appendChild(bb); }
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
                    const v = Math.hypot(aiB.vx, aiB.vy), st = Math.min(0.4, v / 2600), a = Math.atan2(aiB.vy, aiB.vx);
                    const lungo = (aiB.lato === 's' ? -aiB.ox : aiB.ox) / w; // >0 verso il bordo (nascosta o in rimbalzo contro il muro)
                    // a riposo la bolla resta un cerchio perfetto; si schiaccia solo se rimbalza contro il bordo
                    const premuto = Math.max(0, Math.min(1, (lungo / AI_NASCOSTA) - 1)), lato = aiB.lato === 's' ? -1 : 1;
                    g = Math.min(1, premuto * 1.4);
                    if (premuto > 0.01) tr += ' scale(' + (1 - 0.22 * premuto).toFixed(3) + ',' + (1 + 0.12 * premuto).toFixed(3) + ')';
                    if (st > 0.01) tr += ' rotate(' + a.toFixed(3) + 'rad) scale(' + (1 + st).toFixed(3) + ',' + (1 / (1 + st)).toFixed(3) + ') rotate(' + (-a).toFixed(3) + 'rad)';
                }
                aiBolla.style.transform = tr;
                aiGoo.style.opacity = g.toFixed(2);
                aiGoo.style.transform = 'scale(' + (0.3 + 0.5 * g).toFixed(2) + ',' + (0.6 + 0.4 * g).toFixed(2) + ')';
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
                    const tx = aiBTargetX(), K = 210, C = 12;
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
            // tastiera su telefono: il pannello segue l'area davvero visibile
            if (window.visualViewport) {
                const vv = window.visualViewport, aiVv = () => { aiPannello.style.setProperty('--ai-vh', vv.height + 'px'); aiPannello.style.setProperty('--ai-off', Math.max(0, innerHeight - vv.height - vv.offsetTop) + 'px'); };
                vv.addEventListener('resize', aiVv); vv.addEventListener('scroll', aiVv); aiVv();
            }
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
                const n = [aiEl('h3', null, 'Provider IA'), aiEl('p', null, 'L\'assistente prova i provider dall\'alto in basso: se uno non risponde passa al successivo. Per cominciare bastano Gemini e OpenRouter, che hanno modelli gratis. Se uno finisce la quota, passa all\'altro.')];
                const altri = [];
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
                    if (pronto || id === 'gemini' || id === 'openrouter') n.push(riga); else altri.push(riga);
                });
                if (altri.length) { const det = aiEl('details', 'ai-altri'); det.appendChild(aiEl('summary', null, 'Altri provider (' + altri.length + ')')); altri.forEach(r => det.appendChild(r)); n.push(det); }
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
                if (iChiave) { const tg = aiEl('button', 'ai-chip', 'Mostra la chiave'); tg.type = 'button'; tg.style.alignSelf = 'flex-start'; tg.onclick = () => { const mostraC = iChiave.type === 'password'; iChiave.type = mostraC ? 'text' : 'password'; tg.textContent = mostraC ? 'Nascondi la chiave' : 'Mostra la chiave'; }; n.push(tg); }
                const iBase = d.senzaChiave ? campo('Indirizzo di Ollama', 'text', c.base || d.base) : null;
                const wm = aiEl('div'); wm.appendChild(aiEl('label', null, 'Modello (si scarica dal provider dopo la chiave)'));
                const sel = aiEl('select'); sel.style.cssText = 'width:100%;box-sizing:border-box;background:var(--bg-sunken);color:var(--text-main);border:1px solid var(--border);border-radius:var(--radius-md);padding:9px 10px;font:inherit;font-size:13px;';
                wm.appendChild(sel); n.push(wm);
                const esito = aiEl('div', 'ai-esito'); esito.style.display = 'none'; n.push(esito);
                const az = aiEl('div', 'ai-azioni'), indietro = aiEl('button', null, 'Indietro'), carica = aiEl('button', null, 'Carica i modelli'), prova = aiEl('button', null, 'Prova'), salva = aiEl('button', 'pri', 'Collega e salva'), togli = aiEl('button', null, 'Rimuovi');
                const leggi = () => ({ chiave: iChiave ? iChiave.value.trim().replace(/^["'«]+|["'»]+$/g, '').replace(/\s+/g, '') : '', base: iBase ? iBase.value.trim() : '', modello: sel.value });
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
                    if (d.prefisso && !v.chiave.startsWith(d.prefisso)) { mostra(false, 'La chiave di ' + d.nome + ' inizia con «' + d.prefisso + '». Questa no: controlla di aver copiato la chiave intera, senza spazi.'); return false; }
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
                salva.onclick = async () => { let v = leggi(); if (!v.modello && (d.senzaChiave || v.chiave)) { if (!(await caricaModelli())) return; v = leggi(); } if (!d.senzaChiave && !v.chiave) { mostra(false, 'Incolla prima la chiave.'); return; } if (!v.modello) { mostra(false, 'Scegli un modello dal menu (premi «Carica i modelli»).'); return; } Object.assign(c, v, { configurato: true, attivo: true }); aiSalva(); aiWizElenco(); };
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
