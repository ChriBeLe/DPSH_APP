            // ================ LE LIBRERIE CHE VIAGGIANO COL PROGETTO (Fase 2) ================
            // Il report di un progetto dipende da cose che stanno FUORI dal progetto, nelle librerie
            // del dispositivo: il template di report di ogni prova (survey.reportTemplateId, assente =
            // «Classico»), il template dell'indice (proj.indiceTemplateId), quello dell'introduzione
            // (proj.introduzione.templateId) e le voci dell'archivio litologico a cui rimandano gli
            // strati (strato.sourceArchiveId). Fino alla Fase 1 nessun file di progetto le portava:
            // sull'altro dispositivo il riferimento restava e il template no, e il report usciva col
            // «Classico» di quel dispositivo.
            //
            // Qui due operazioni:
            //  - librerieUsateDa: le voci che i progetti usano DAVVERO, cioè quelle che il report
            //    risolve (un id che punta a un template sparito vale «Classico», come in
            //    getReportTemplateIdPerProva), più per ogni progetto quale voce usa ogni prova;
            //  - accogliLibrerie: all'arrivo, una voce che esiste già IDENTICA si riusa; una che esiste
            //    ma è diversa (o una nuova il cui nome è già preso) entra come copia rinominata, e il
            //    progetto punta alla copia. Una voce del dispositivo non si sovrascrive MAI.
            //
            // «Identica» vuol dire stesso contenuto: contano tutti i campi tranne id, nome, date di
            // creazione/modifica e builtIn. Due template uguali con id o nomi diversi (lo stesso
            // template arrivato come copia in un viaggio precedente) sono lo stesso template.

            const TIPI_LIBRERIA = [
                { chiave: 'reportTemplates', prefisso: 'tpl_', etichetta: 'template di report', predefinito: 'classico' },
                { chiave: 'indiceTemplates', prefisso: 'idx_', etichetta: 'template dell\'indice', predefinito: 'idx_classico' },
                { chiave: 'lithologyArchive', prefisso: 'arch_', etichetta: 'voce dell\'archivio litologico', predefinito: null }
            ];

            // Cosa NON conta per dire che due voci sono la stessa: id, date, «di serie» e il NOME. Il
            // nome è un'etichetta: il report esce identico. Contarlo farebbe nascere una copia nuova a
            // ogni viaggio (all'andata «Rossi» diventa «Rossi (da Telefono)», e al ritorno non
            // sarebbe più riconosciuto come lo stesso template).
            const CHIAVI_FUORI_DAL_CONTENUTO_LIBRERIA = new Set(['id', 'createdAt', 'updatedAt', 'builtIn', 'name']);

            /** Il contenuto di una voce di libreria, per confrontarla con un'altra. */
            function contenutoVoceLibreria(voce) {
                if (!voce || typeof voce !== 'object') return 'null';
                const solo = {};
                Object.keys(voce).forEach(k => { if (!CHIAVI_FUORI_DAL_CONTENUTO_LIBRERIA.has(k)) solo[k] = voce[k]; });
                return jsonCanonico(solo);
            }

            /** Il template di report che il report userà davvero per una prova. */
            function templateReportEffettivo(surv, reportTemplates) {
                const tid = surv && surv.reportTemplateId;
                return (tid && reportTemplates && reportTemplates[tid]) ? tid : 'classico';
            }
            /** Il template dell'indice di un progetto; null se il progetto porta ancora lo stile
             * incorporato di prima della libreria (proj.indice: viaggia dentro il progetto). */
            function templateIndiceEffettivo(proj, indiceTemplates) {
                if (!proj) return null;
                if (proj.indice && !proj.indiceTemplateId) return null;
                const tid = proj.indiceTemplateId;
                return (tid && indiceTemplates && indiceTemplates[tid]) ? tid : 'idx_classico';
            }
            /** Il template della pagina d'introduzione, se il progetto ne ha una. */
            function templateIntroduzioneEffettivo(proj, reportTemplates) {
                const intro = proj && proj.introduzione;
                if (!intro || typeof intro !== 'object') return null;
                const tid = intro.templateId;
                return (tid && reportTemplates && reportTemplates[tid]) ? tid : 'classico';
            }
            /** Tutti gli strati di un progetto che possono rimandare all'archivio: quelli del progetto
             * e quelli rimasti sulle prove dei salvataggi di prima (survey.strati). */
            function stratiDelProgetto(proj) {
                const tutti = [];
                (Array.isArray(proj && proj.strati) ? proj.strati : []).forEach(s => { if (s && typeof s === 'object') tutti.push(s); });
                Object.values((proj && proj.surveys) || {}).forEach(surv => {
                    (Array.isArray(surv && surv.strati) ? surv.strati : []).forEach(s => { if (s && typeof s === 'object') tutti.push(s); });
                });
                return tutti;
            }

            /** Le voci di libreria usate da un insieme di progetti ({id: progetto}), prese da `librerie`
             * ({ reportTemplates, indiceTemplates, lithologyArchive }: quelle del dispositivo o di un
             * file). Ritorna le tre librerie ridotte alle voci usate e, per ogni progetto, quale voce
             * usa ogni sua parte (usi[projId] = { prove: {survId: tplId}, indice, introduzione }). */
            function librerieUsateDa(progetti, librerie) {
                const lib = librerie || {};
                const rt = lib.reportTemplates || {}, it = lib.indiceTemplates || {}, la = lib.lithologyArchive || {};
                const uscita = { reportTemplates: {}, indiceTemplates: {}, lithologyArchive: {}, usi: {} };
                const prendi = (dove, da, id) => { if (id && da[id]) dove[id] = JSON.parse(JSON.stringify(da[id])); };
                Object.keys(progetti || {}).forEach(pid => {
                    const proj = progetti[pid];
                    if (!proj || typeof proj !== 'object') return;
                    const uso = { prove: {}, indice: null, introduzione: null };
                    Object.keys(proj.surveys || {}).forEach(sid => {
                        const tid = templateReportEffettivo(proj.surveys[sid], rt);
                        uso.prove[sid] = tid;
                        prendi(uscita.reportTemplates, rt, tid);
                    });
                    uso.indice = templateIndiceEffettivo(proj, it);
                    prendi(uscita.indiceTemplates, it, uso.indice);
                    uso.introduzione = templateIntroduzioneEffettivo(proj, rt);
                    prendi(uscita.reportTemplates, rt, uso.introduzione);
                    stratiDelProgetto(proj).forEach(s => prendi(uscita.lithologyArchive, la, s.sourceArchiveId));
                    uscita.usi[pid] = uso;
                });
                return uscita;
            }

            /** Un nome libero nella libreria `chiave` del dispositivo: `nome`, oppure «nome (da X)»,
             * oppure «nome (da X) (2)»… */
            function nomeLiberoInLibreria(chiave, nome, etichetta) {
                const voci = Object.values(state[chiave] || {});
                const preso = (n) => voci.some(v => (v && v.name || '').trim().toLowerCase() === n.trim().toLowerCase());
                const base = (nome || 'Senza nome').trim();
                if (!preso(base)) return base;
                const conOrigine = etichetta ? `${base} (${etichetta})` : base;
                if (!preso(conOrigine)) return conOrigine;
                let n = 2;
                while (preso(`${conOrigine} (${n})`)) n++;
                return `${conOrigine} (${n})`;
            }

            /** Accoglie nelle librerie del dispositivo le voci arrivate con un file, e fa puntare i
             * progetti in arrivo (MODIFICATI qui, prima che entrino nell'archivio) alle voci giuste.
             *   inArrivo: { reportTemplates, indiceTemplates, lithologyArchive, usi? } dal file;
             *   progetti: { idNelFile: progetto } in arrivo;
             *   opzioni.tutte: accoglie tutte le voci del file (backup dell'archivio), non solo le usate;
             *   opzioni.etichetta: come si chiamano le copie («da Telefono» → «Rossi (da Telefono)»).
             * Un file senza librerie (i JSON e gli ZIP fino alla Fase 1) non cambia niente: i
             * riferimenti restano come sono, come prima.
             * Ritorna { riusate, nuove: [{ tipo, nome, copiaDi }] }. */
            function accogliLibrerie(inArrivo, progetti, opzioni) {
                const o = opzioni || {};
                const lib = inArrivo || {};
                const esito = { riusate: 0, nuove: [] };
                const usi = lib.usi || librerieUsateDa(progetti, lib).usi;
                const mappe = {};
                TIPI_LIBRERIA.forEach(tipo => {
                    const daFile = lib[tipo.chiave];
                    const mappa = mappe[tipo.chiave] = {};
                    if (!daFile || typeof daFile !== 'object') return;
                    // Quali voci accogliere: tutte, o quelle che i progetti usano.
                    let ids = Object.keys(daFile);
                    if (!o.tutte) {
                        const usate = librerieUsateDa(progetti, lib)[tipo.chiave];
                        ids = ids.filter(id => usate[id]);
                    }
                    if (!state[tipo.chiave] || typeof state[tipo.chiave] !== 'object') state[tipo.chiave] = {};
                    const qui = state[tipo.chiave];
                    const perContenuto = new Map();
                    Object.keys(qui).forEach(id => { const c = contenutoVoceLibreria(qui[id]); if (!perContenuto.has(c)) perContenuto.set(c, id); });
                    ids.forEach(id => {
                        const voce = daFile[id];
                        if (!voce || typeof voce !== 'object') return;
                        const c = contenutoVoceLibreria(voce);
                        if (qui[id] && contenutoVoceLibreria(qui[id]) === c) { mappa[id] = id; esito.riusate++; return; }
                        if (perContenuto.has(c)) { mappa[id] = perContenuto.get(c); esito.riusate++; return; }
                        const copia = JSON.parse(JSON.stringify(voce));
                        const nuovoId = qui[id] ? `${tipo.prefisso}${Date.now()}_${Math.random().toString(36).slice(2, 7)}` : id;
                        copia.id = nuovoId;
                        // Una voce «di serie» che arriva diversa è una voce qualsiasi: si può rinominare
                        // ed eliminare. Quella di serie del dispositivo resta com'è.
                        delete copia.builtIn;
                        const nome = nomeLiberoInLibreria(tipo.chiave, voce.name, o.etichetta);
                        if (nome !== voce.name) copia.name = nome;
                        qui[nuovoId] = copia;
                        perContenuto.set(contenutoVoceLibreria(copia), nuovoId);
                        mappa[id] = nuovoId;
                        esito.nuove.push({ tipo: tipo.etichetta, nome: copia.name || nuovoId, copiaDi: nome !== voce.name ? voce.name : null });
                    });
                });
                // I progetti puntano alle voci del dispositivo. Un riferimento implicito («Classico»
                // perché non c'è niente) resta implicito se il Classico di qui è identico.
                Object.keys(progetti || {}).forEach(pid => {
                    const proj = progetti[pid];
                    const uso = usi[pid];
                    if (!proj || typeof proj !== 'object' || !uso) return;
                    const mr = mappe.reportTemplates, mi = mappe.indiceTemplates, ma = mappe.lithologyArchive;
                    Object.keys(proj.surveys || {}).forEach(sid => {
                        const surv = proj.surveys[sid];
                        const tid = uso.prove && uso.prove[sid];
                        if (!surv || !tid || !(tid in mr)) return;
                        const destinazione = mr[tid];
                        if (!surv.reportTemplateId && destinazione === 'classico') return;
                        surv.reportTemplateId = destinazione;
                    });
                    if (uso.indice && uso.indice in mi) {
                        const destinazione = mi[uso.indice];
                        if (proj.indiceTemplateId || destinazione !== 'idx_classico') proj.indiceTemplateId = destinazione;
                    }
                    if (uso.introduzione && uso.introduzione in mr && proj.introduzione && typeof proj.introduzione === 'object') {
                        const destinazione = mr[uso.introduzione];
                        if (proj.introduzione.templateId || destinazione !== 'classico') proj.introduzione.templateId = destinazione;
                    }
                    stratiDelProgetto(proj).forEach(s => {
                        if (s.sourceArchiveId && s.sourceArchiveId in ma) s.sourceArchiveId = ma[s.sourceArchiveId];
                    });
                });
                return esito;
            }

            /** Le librerie che un file porta con sé, tolte dal contenuto del file: lo stato intero le
             * ha come campi suoi, un progetto esportato da solo nel campo `librerie` (Fase 2), lo ZIP
             * dell'archivio le passa già separate. Null se il file non ne ha (formati fino alla Fase 1). */
            function estraiLibrerieDalFile(parsed) {
                if (!parsed || typeof parsed !== 'object') return null;
                if (parsed.librerie && typeof parsed.librerie === 'object') {
                    const lib = parsed.librerie;
                    delete parsed.librerie;
                    return lib;
                }
                if (parsed.projects && (parsed.reportTemplates || parsed.indiceTemplates || parsed.lithologyArchive)) {
                    return { reportTemplates: parsed.reportTemplates, indiceTemplates: parsed.indiceTemplates, lithologyArchive: parsed.lithologyArchive, tutte: true };
                }
                return null;
            }

            /** Righe per il messaggio di fine import: cosa è entrato nelle librerie. */
            function testoLibrerieAccolte(esito) {
                if (!esito || esito.nuove.length === 0) return '';
                const righe = esito.nuove.slice(0, 6).map(n => `· ${n.tipo} «${n.nome}»${n.copiaDi ? ` (qui c'era già un «${n.copiaDi}» diverso: resta com'è)` : ''}`);
                if (esito.nuove.length > 6) righe.push(`· … e altre ${esito.nuove.length - 6}`);
                return `\n\nAggiunti alle librerie di questo dispositivo:\n${righe.join('\n')}`;
            }

            /** Dopo un import che ha SOSTITUITO dei progetti: se uno era quello aperto, lo stato attivo
             * (che saveState riscrive nel progetto a ogni salvataggio) va ricaricato dal progetto
             * nuovo, altrimenti il primo salvataggio rimetterebbe dentro la prova di prima. */
            function riallineaProgettoAperto(idsSostituiti) {
                const pid = state.currentProjectId;
                if (!pid || !(idsSostituiti || []).includes(pid)) return;
                const proj = state.projects && state.projects[pid];
                const prove = Object.keys((proj && proj.surveys) || {});
                if (prove.length === 0) { state.currentProjectId = null; state.currentSurveyId = null; return; }
                syncProjectToActiveState(pid, prove.includes(state.currentSurveyId) ? state.currentSurveyId : prove[0]);
            }

            /** Il nome di un progetto usabile in un nome di file: niente caratteri vietati, spazi come _.
             * Prima si usava il comune, e due progetti dello stesso comune uscivano con lo stesso nome. */
            function nomeFileProgetto(proj) {
                const nome = String((proj && (proj.name || proj.comune)) || 'Progetto')
                    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, ' ')
                    .trim().replace(/\s+/g, '_').replace(/^\.+/, '');
                return (nome || 'Progetto').slice(0, 80);
            }
