            // ===================== IL REGISTRO DELLE TAVOLE DEL PROGETTO =====================
            // Ogni tavola (vista 3D, sezione 2D, pianta...) è un oggetto con id, nome, tipo e le sue
            // impostazioni, salvato in proj.tavole3d.registro. Non cambia il formato dei dati (5): è
            // un campo in più, opzionale; i file vecchi non lo hanno e le tavole si creano solo su
            // richiesta. Si salva SOLO con «salva» (mai alla prima modifica): fino ad allora le
            // modifiche stanno nella bozza. Una tavola bloccata («consegnata») non si cambia finché non
            // la si sblocca. Non tocca il calcolo DPSH.
            const TIPI_TAVOLA = ['iso', 'sez3d', 'sez2d', 'pianta', 'profilo', 'confronto', 'libero'];
            const registroTavole = proj => {
                if (!proj) return [];
                if (!proj.tavole3d) proj.tavole3d = { regola: {}, escluse: [] };
                if (!Array.isArray(proj.tavole3d.registro)) proj.tavole3d.registro = [];
                return proj.tavole3d.registro;
            };
            const tavolaPerId = (proj, id) => registroTavole(proj).find(t => t.id === id) || null;
            const copiaTavola = x => JSON.parse(JSON.stringify(x === undefined ? null : x));
            function idTavolaNuovo(proj) {
                let id; do { id = 'tav_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); } while (tavolaPerId(proj, id));
                return id;
            }
            /** Un nome libero: se c'è già, avvisa con un numero in coda («Nome (2)»). */
            function nomeTavolaLibero(proj, nome, tranne) {
                const usati = new Set(registroTavole(proj).filter(t => t.id !== tranne).map(t => t.nome));
                const base = String(nome || 'Tavola').trim() || 'Tavola'; let n = base, k = 2;
                while (usati.has(n)) n = `${base} (${k++})`;
                return n;
            }
            /** Crea una tavola nel registro. `impostazioni` = inquadratura, titoli, foglio, opzioni... */
            function creaTavola(proj, { nome, tipo, impostazioni, templateId, miniatura, datiRef, voceId }) {
                if (TIPI_TAVOLA.indexOf(tipo) < 0) throw new Error('Tipo di tavola sconosciuto: ' + tipo);
                const ora = Date.now();
                const t = { id: idTavolaNuovo(proj), nome: nomeTavolaLibero(proj, nome), tipo, impostazioni: copiaTavola(impostazioni || {}),
                    voceId: voceId || null, templateId: templateId || null, bloccata: false, inReport: true, miniatura: miniatura || null,
                    datiRef: datiRef || null, versione: 1, versioni: [], creata: ora, aggiornata: ora };
                registroTavole(proj).push(t);
                return t;
            }
            /** SALVA: solo qui le modifiche entrano nella tavola. La versione di prima va nello storico. */
            function salvaTavola(proj, id, { impostazioni, nome, miniatura, datiRef }) {
                const t = tavolaPerId(proj, id);
                if (!t) return null;
                if (t.bloccata) return { errore: 'bloccata' };
                t.versioni.push({ versione: t.versione, impostazioni: t.impostazioni, nome: t.nome, datiRef: t.datiRef, salvata: t.aggiornata });
                t.versione += 1;
                if (impostazioni) t.impostazioni = copiaTavola(impostazioni);
                if (nome) t.nome = nomeTavolaLibero(proj, nome, id);
                if (miniatura !== undefined) t.miniatura = miniatura;
                if (datiRef !== undefined) t.datiRef = datiRef;
                t.aggiornata = Date.now();
                return t;
            }
            /** Duplica il layout (con impostazioni correnti): la copia è libera, da aggiornare ai nuovi dati. */
            function duplicaTavola(proj, id, nuoviDatiRef) {
                const t = tavolaPerId(proj, id);
                if (!t) return null;
                const c = creaTavola(proj, { nome: t.nome + ' (copia)', tipo: t.tipo, impostazioni: t.impostazioni, templateId: t.templateId, miniatura: t.miniatura, datiRef: nuoviDatiRef === undefined ? t.datiRef : nuoviDatiRef });
                c.inReport = t.inReport;
                return c;
            }
            const bloccaTavola = (proj, id, si) => { const t = tavolaPerId(proj, id); if (t) t.bloccata = si !== false; return t; };
            function eliminaTavola(proj, id) {
                const r = registroTavole(proj), i = r.findIndex(t => t.id === id);
                if (i < 0) return false;
                if (r[i].bloccata) return false;
                r.splice(i, 1); return true;
            }
            function ordinaTavole(proj, idInOrdine) {
                const r = registroTavole(proj), p = t => { const k = idInOrdine.indexOf(t.id); return k < 0 ? idInOrdine.length : k; };
                r.sort((a, b) => p(a) - p(b));
                return r;
            }
            /** La tavola è ancora vera? Confronta l'impronta dei dati con quella salvata: se è diversa,
             * l'editor avvisa («continua con i vecchi dati» o «duplica e aggiorna»). */
            const tavolaDatiCambiati = (t, impronta) => !!t && t.datiRef !== null && t.datiRef !== undefined && t.datiRef !== impronta;

            /** Allinea il registro alle pagine della finestra «Tavole», al momento di «Salva»: ogni
             * pagina ha la sua tavola (per voceId) con le sue impostazioni; se cambiano, nasce una
             * versione nuova. Le bloccate non si toccano; le pagine che non esistono più restano come
             * «orfane» (i dati sono cambiati: l'utente sceglie se tenerle o aggiornarle). */
            function sincronizzaRegistroTavole(proj, voci, mem, impronta, miniature, templateId) {
                const reg = registroTavole(proj), visti = new Set();
                voci.forEach(v => {
                    visti.add(v.id);
                    const imp = { regola: (mem.regola || {})[v.id] || null, titolo: (mem.titoli || {})[v.id] || null, posizione: (mem.posizioni || {})[v.id] || null,
                        pianta: (mem.piante || {})[v.id] || null, foglio: mem.foglio || null };
                    const inReport = !(mem.escluse || []).includes(v.id);
                    let t = reg.find(x => x.voceId === v.id && !x.storica);
                    if (!t) { t = creaTavola(proj, { nome: v.titolo, tipo: v.tipo, impostazioni: imp, datiRef: impronta, voceId: v.id, templateId, miniatura: (miniature || {})[v.id] || null }); t.inReport = inReport; return; }
                    t.orfana = false;
                    if (templateId && !t.bloccata) t.templateId = templateId;
                    if (t.bloccata) return;
                    t.inReport = inReport;
                    if (miniature && miniature[v.id]) t.miniatura = miniature[v.id];
                    if (JSON.stringify(t.impostazioni) !== JSON.stringify(imp)) salvaTavola(proj, t.id, { impostazioni: imp, datiRef: impronta });
                });
                reg.forEach(t => { if (t.voceId && !t.storica && !visti.has(t.voceId)) t.orfana = true; });
                return reg;
            }

            /** Le tavole del registro fatte con dati diversi da quelli di adesso (e non bloccate né storiche). */
            const tavoleDaAggiornare = (proj, impronta) => registroTavole(proj).filter(t => !t.storica && !t.bloccata && !t.orfana && tavolaDatiCambiati(t, impronta));
            /** «Duplica il layout e aggiorna ai nuovi dati»: la vecchia resta, bloccata e storica (resta traccia);
             * la nuova ha le stesse impostazioni e l'impronta dei dati di adesso. */
            function duplicaEAggiornaTavole(proj, impronta) {
                return tavoleDaAggiornare(proj, impronta).map(t => {
                    const c = duplicaTavola(proj, t.id, impronta);
                    c.voceId = t.voceId; c.nome = nomeTavolaLibero(proj, t.nome.replace(/ \((aggiornata|copia)\)$/, '') + ' (aggiornata)');
                    t.storica = true; t.bloccata = true;
                    return c;
                });
            }

            /** «Pronta per la stampa?»: i controlli sulle tavole di un progetto. Ogni voce: { livello: 'errore' | 'avviso', testo }.
             * `mem` = la memoria delle tavole (bozza o progetto), `voci` = le pagine, `impronta` = i dati di adesso. */
            function controlloStampaTavole(mem, voci, impronta) {
                const out = [], esc = new Set((mem && mem.escluse) || []), inReport = (voci || []).filter(v => !esc.has(v.id));
                if (!inReport.length) out.push({ livello: 'errore', testo: 'Nessuna pagina da stampare.' });
                inReport.forEach(v => { const t = ((mem && mem.titoli) || {})[v.id]; if (t && t.senza) out.push({ livello: 'avviso', testo: `«${v.titolo}» è senza titolo.` }); });
                const reg = (mem && mem.registro) || [];
                reg.filter(t => !t.storica && t.inReport !== false && t.orfana).forEach(t => out.push({ livello: 'avviso', testo: `«${t.nome}» non ha più la sua pagina (dati cambiati).` }));
                const vecchie = reg.filter(t => !t.storica && !t.orfana && tavolaDatiCambiati(t, impronta));
                if (vecchie.length) out.push({ livello: 'avviso', testo: `${vecchie.length} ${vecchie.length === 1 ? 'tavola fatta' : 'tavole fatte'} con dati delle prove non aggiornati.` });
                const nomi = {}; reg.filter(t => !t.storica).forEach(t => { nomi[t.nome] = (nomi[t.nome] || 0) + 1; });
                Object.keys(nomi).filter(n => nomi[n] > 1).forEach(n => out.push({ livello: 'avviso', testo: `Due tavole si chiamano «${n}».` }));
                return out;
            }
