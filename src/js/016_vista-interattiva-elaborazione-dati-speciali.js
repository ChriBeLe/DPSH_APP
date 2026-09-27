            // =========================================================================
            // VISTA INTERATTIVA "ELABORAZIONE DATI SPECIALI" (wizard parametri avanzati)
            // =========================================================================

            /** Trova, tra i candidati compatibili di una categoria, il primo "consigliato" in base al nome dello strato. */
            function primoCandidatoConsigliato(categoria, strato, candidatiConValore){
                const categorieRiconosciute = categorieRiconosciuteDiStrato(strato);
                for(const c of candidatiConValore){
                    const cat = categoria.candidati[c.index];
                    const { suggerito } = valutaSuggerimento(cat, categorieRiconosciute, strato.name);
                    if(suggerito) return c.index;
                }
                return null;
            }

            /** Calcola, per la prova ATTUALMENTE APERTA, i dati aggregati (Nspt/Rpd/sigma'v0/ecc.)
             * e i risultati (candidati/valori per categoria) di ogni strato che ha almeno un
             * intervallo assegnato — mappa stratoId -> {agg, ris}. Usata sia dalla vista
             * "Elaborazione Dati Speciali" sia dai Parametri Avanzati nella Gestione Strati. */
            function calcolaRisultatiPerStratiCorrenti(){
                const falda = faldaDaHeader(state.header);
                const stratiEff = stratiEffettiviProva(state.logs, state.strati, state.instrument, state.settings.stepCm, falda);
                const risultati = elaboraStratiProva(stratiEff, falda);
                return Object.fromEntries(risultati.map((r,i)=>[stratiEff[i].id, {agg:stratiEff[i], ris:r}]));
            }

            /** Costruisce l'HTML del pannello "Parametri Avanzati" in modalità editing per un
             * singolo strato: riepilogo Nspt/Rpd/sigma'v0 + selettori per categoria. Se lo strato
             * non ha intervalli assegnati in questa prova (trovato === undefined), mostra un
             * messaggio invece dei selettori. Usata dalla finestra centrale "Modifica parametri
             * avanzati" (vedi openEditParamsModal/renderEditParamsModalBody). */
            // Ricorda quali spiegazioni "perché consigliato" sono aperte nel pannello a tendina
            // di ogni strato — chiave "stratoId:catId:index".
            const procSpiegazioniAperte = new Set();

            function buildParametriAvanzatiBodyHtml(strato, trovato, editing){
                const azioniHtml = editing ? `
                    <div style="padding:8px 12px 4px; display:flex; gap:6px;">
                        <button class="btn-action strato-cancel-params-btn" data-strato-id="${strato.id}" style="flex:1; background:var(--bg-card-hover); color:var(--text-main); border:1px solid var(--border); font-size:11.5px; font-weight:700; padding:7px;">
                            <svg class="ico"><use href="#i-x"/></svg> Annulla
                        </button>
                        <button class="btn-action strato-save-params-btn" data-strato-id="${strato.id}" style="flex:1; background:var(--success-soft); color:var(--success); border:1px solid var(--success); font-size:11.5px; font-weight:700; padding:7px;">
                            <svg class="ico"><use href="#i-check"/></svg> Salva Modifiche
                        </button>
                    </div>` : '';
                if (!trovato) {
                    return `<div style="padding:12px; font-size:11.5px; color:var(--text-muted);">Nessun intervallo assegnato a questo strato in questa prova: assegna la litologia agli intervalli nella scheda "Prova" per calcolare Nspt, Rpd e i parametri avanzati.</div>${azioniHtml}`;
                }
                const { agg, ris } = trovato;
                const pre = ris.preElaborazione;
                const riepilogoHtml = `
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(84px,1fr)); gap:6px; padding:10px 12px; background:var(--bg-sunken); border-bottom:1px solid var(--border); font-size:10.5px;">
                        <div><div style="color:var(--text-muted);">Profondità</div><div style="font-weight:700; color:var(--text-main);">${agg.profonditaDa.toFixed(2)}–${agg.profonditaA.toFixed(2)}m</div></div>
                        <div><div style="color:var(--text-muted);">Nspt medio</div><div style="font-weight:700; color:var(--text-main);">${fmtIT(agg.nsptGrezzo,1)}</div></div>
                        <div><div style="color:var(--text-muted);">Nspt' medio</div><div style="font-weight:700; color:var(--text-main);">${fmtIT(agg.nsptFalda,1)}</div></div>
                        <div><div style="color:var(--text-muted);">Rpd medio</div><div style="font-weight:700; color:var(--success);">${fmtIT(agg.rpdMedio,1)} kg/cm²</div></div>
                        <div><div style="color:var(--text-muted);">σ'v0</div><div style="font-weight:700; color:var(--text-main);">${fmtIT(pre.sigmaV0,2)} t/m²</div></div>
                        <div><div style="color:var(--text-muted);">Consistenza</div><div style="font-weight:700; color:var(--text-main); font-size:9.5px;">${pre.statoConsistenza||'N/D'}</div></div>
                    </div>`;

                const categorie = categorieApplicabili({isCoesivo: agg.isCoesivo, isIncoerente: agg.isIncoerente});
                const categorieHtml = categorie.map(cat=>{
                    const candCompat = candidatiCompatibili(cat, agg);
                    const candConValore = candCompat.map((c,index)=>({index, autore:c.autore, terreno:c.terreno, valore:c.calcola({
                        nsptFalda: agg.nsptFalda, nsptGrezzo: agg.nsptGrezzo, sigmaV0: pre.sigmaV0, n160: pre.n160,
                        profonditaMedia: pre.profonditaMedia, inFalda: pre.inFalda, isCoesivo: agg.isCoesivo,
                        pesoSaturoSelezionato: pre.pesoSaturo,
                    })}));
                    const categorieRiconosciute = categorieRiconosciuteDiStrato(strato);
                    const candConSuggerimento = candConValore.map(c => ({...c, ...valutaSuggerimento(candCompat[c.index], categorieRiconosciute, strato.name)}));
                    const suggeriti = candConSuggerimento.filter(c => c.suggerito);
                    let selezionatoIdx = strato.parametriAvanzati[cat.id]?.autoreIndex;
                    // Nessuna scelta esplicita ancora fatta per questo strato/categoria? Se lo
                    // strato deriva da una voce d'archivio con una preferenza salvata, la usiamo
                    // come proposta iniziale (solo visuale, finché l'utente non la conferma
                    // toccando il menu — a quel punto seleziona() la scrive per davvero).
                    if (selezionatoIdx == null && strato.sourceArchiveId) {
                        const archPref = state.lithologyArchive && state.lithologyArchive[strato.sourceArchiveId];
                        const pref = archPref && archPref.parametriPreferiti && archPref.parametriPreferiti[cat.id];
                        if (pref) {
                            const match = candConValore.find(c => c.autore === pref.autore && (c.terreno || null) === (pref.terreno || null));
                            if (match) selezionatoIdx = match.index;
                        }
                    }
                    const opzioniHtml = candConSuggerimento.map(c=>{
                        const label = `${c.autore}${c.terreno?' — '+c.terreno:''} — ${formattaValoreWizard(cat, c.valore)}${c.suggerito?' ★':''}`;
                        return `<option value="${c.index}" ${selezionatoIdx===c.index?'selected':''}>${label}</option>`;
                    }).join('');
                    const selNota = selezionatoIdx!=null ? notaScientificaDi(candCompat[selezionatoIdx].autore) : null;

                    // Meccanismo "perché consigliato": un chip ★ per ogni candidato suggerito;
                    // toccandolo si apre/chiude la spiegazione (stesso testo di valutaSuggerimento
                    // usato nel wizard guidato), senza dover cambiare la selezione per vederla.
                    const suggeritiHtml = suggeriti.length>0 ? `
                        <div style="display:flex; flex-wrap:wrap; gap:5px; margin-top:7px;">
                            ${suggeriti.map(c => {
                                const key = `${strato.id}:${cat.id}:${c.index}`;
                                const aperto = procSpiegazioniAperte.has(key);
                                return `<button type="button" class="proc-spiega-suggerito" data-key="${key}" style="display:inline-flex; align-items:center; gap:4px; font-size:10px; font-weight:700; letter-spacing:.02em; color:${aperto?'var(--on-accent)':'var(--accent)'}; background:${aperto?'var(--accent)':'var(--accent-soft)'}; border:1px solid var(--accent); border-radius:12px; padding:3px 8px 3px 6px; cursor:pointer;">★ ${c.autore}${c.terreno?' — '+c.terreno:''} ${aperto?'−':'?'}</button>`;
                            }).join('')}
                        </div>
                        ${suggeriti.filter(c=>procSpiegazioniAperte.has(`${strato.id}:${cat.id}:${c.index}`)).map(c=>`
                            <div style="font-size:10.5px; color:var(--accent); background:var(--accent-soft); border-radius:7px; padding:8px 10px; margin-top:6px; line-height:1.5;">${c.spiegazione}</div>
                        `).join('')}
                    ` : '';

                    // Stesso colore di categoria usato nel wizard/riepilogo/ODT, cosi la selezione
                    // manuale resta visivamente coerente con tutto il resto dell'app.
                    const coloreCat = COLORI_EXPORT[cat.id] || '90CAF9';
                    return `
                        <div style="padding:9px 12px; border-radius:8px; margin:0 0 6px; background:#${coloreCat};">
                            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                                <label style="font-size:11px; font-weight:700; color:${WIZ_TESTO_SU_COLORE}; flex:1;">${cat.label} <span style="color:${WIZ_TESTO_SU_COLORE}; opacity:.7; font-weight:400;">[${cat.unita}]</span></label>
                                <button class="btn-icon proc-info-cat" data-strato-id="${strato.id}" data-cat-id="${cat.id}" title="Perché queste formule" style="width:22px; height:22px; color:${WIZ_TESTO_SU_COLORE};"><svg class="ico" style="width:13px;height:13px;"><use href="#i-info"/></svg></button>
                            </div>
                            <select class="form-control proc-cat-select" data-strato-id="${strato.id}" data-cat-id="${cat.id}" style="font-size:11.5px; padding:7px 8px;">
                                <option value="">— Nessuna selezione —</option>
                                ${opzioniHtml}
                            </select>
                            ${suggeritiHtml}
                            ${selNota ? `<div style="font-size:10px; color:${WIZ_TESTO_SU_COLORE}; opacity:.8; margin-top:4px; line-height:1.4;">${selNota.v?'':'⚠ '}${selNota.testo}</div>` : ''}
                        </div>`;
                }).join('');

                return `
                    ${riepilogoHtml}
                    <div style="padding:8px 12px 0; font-size:10px; color:var(--text-muted); line-height:1.4; display:flex; align-items:flex-start; gap:5px;">
                        <svg class="ico" style="width:11px; height:11px; color:var(--accent); flex:0 0 auto; margin-top:1px;"><use href="#i-flask"/></svg>
                        <span>I candidati con <strong style="color:var(--accent);">★</strong> sono <strong>consigliati</strong> in base al nome dello strato: tocca il chip sotto ogni menu per vedere il perché.</span>
                    </div>
                    <div>${categorieHtml}</div>
                    ${azioniHtml}`;
            }

            /** Versione compatta e di sola lettura del pannello Parametri Avanzati, mostrata
             * per default dentro "Gestione dei dati litologici": una piccola tabella
             * riassuntiva di cosa è già stato scelto per lo strato, con un pulsante "Modifica"
             * che attiva la modalità editing (vedi buildParametriAvanzatiBodyHtml) nella stessa
             * card, senza aprire un altro menù. */
            function buildParametriAvanzatiSummaryHtml(strato, trovato){
                const btnApriHtml = `
                    <div style="padding:8px 12px 10px;">
                        <button class="btn-action strato-edit-params-btn" data-strato-id="${strato.id}" style="width:100%; background:var(--purple-soft); color:var(--purple); border:1px solid rgba(168,85,247,0.4); font-size:11.5px; font-weight:700; padding:7px;">
                            <svg class="ico"><use href="#i-edit"/></svg> Modifica
                        </button>
                    </div>`;

                if (!trovato) {
                    return `<div style="padding:12px; font-size:11.5px; color:var(--text-muted);">Nessun intervallo assegnato a questo strato in questa prova: assegna la litologia agli intervalli nella scheda "Prova" per calcolare Nspt, Rpd e i parametri avanzati.</div>${btnApriHtml}`;
                }

                const { agg, ris } = trovato;
                const pre = ris.preElaborazione;
                const riepilogoHtml = `
                    <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(84px,1fr)); gap:6px; padding:10px 12px; background:var(--bg-sunken); border-bottom:1px solid var(--border); font-size:10.5px;">
                        <div><div style="color:var(--text-muted);">Profondità</div><div style="font-weight:700; color:var(--text-main);">${agg.profonditaDa.toFixed(2)}–${agg.profonditaA.toFixed(2)}m</div></div>
                        <div><div style="color:var(--text-muted);">Nspt medio</div><div style="font-weight:700; color:var(--text-main);">${fmtIT(agg.nsptGrezzo,1)}</div></div>
                        <div><div style="color:var(--text-muted);">Rpd medio</div><div style="font-weight:700; color:var(--success);">${fmtIT(agg.rpdMedio,1)} kg/cm²</div></div>
                        <div><div style="color:var(--text-muted);">Consistenza</div><div style="font-weight:700; color:var(--text-main); font-size:9.5px;">${pre.statoConsistenza||'N/D'}</div></div>
                    </div>`;

                const categorie = categorieApplicabili({isCoesivo: agg.isCoesivo, isIncoerente: agg.isIncoerente});
                const righeHtml = categorie.map(cat => {
                    const sel = ris.categorie[cat.id] ? ris.categorie[cat.id].selezionato : null;
                    const coloreCat = COLORI_EXPORT[cat.id] || '90CAF9';
                    return `
                        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding:7px 10px; border-radius:7px; margin:0 8px 5px; background:#${coloreCat}; font-size:11px;">
                            <span style="color:${WIZ_TESTO_SU_COLORE};">${ETICHETTE_PARAMETRO[cat.id].compatta}</span>
                            ${sel ? `<span style="font-weight:700; color:${WIZ_TESTO_SU_COLORE}; text-align:right;">${formattaValoreWizard(cat, sel.valore)}<br><span style="font-weight:400; color:${WIZ_TESTO_SU_COLORE}; opacity:.7; font-size:10px;">${sel.autore}${sel.terreno ? ' — ' + sel.terreno : ''}</span></span>`
                                  : `<span style="font-weight:700; color:var(--danger); font-size:10px; background:var(--danger-soft); padding:2px 7px; border-radius:10px;">Da assegnare</span>`}
                        </div>`;
                }).join('');

                return `${riepilogoHtml}<div>${righeHtml}</div>${btnApriHtml}`;
            }

            /** Ricarica la Gestione dei dati litologici dopo ogni modifica a
             * strato.parametriAvanzati, così il riepilogo di ogni card resta coerente. */
            function refreshParametriAvanzatiViews(){
                renderStratiList();
            }

            /** Aggancia gli eventi dei selettori "Parametri Avanzati" (cambio candidato, info,
             * modifica/salva/annulla, spiegazioni) trovati dentro `container`. `refreshFn`
             * è la funzione da richiamare dopo un cambiamento che deve solo aggiornare la vista
             * corrente (selezione candidato, apertura spiegazione): di default aggiorna la
             * Gestione dei dati litologici, ma quando `container` è il corpo della finestra
             * "Modifica parametri avanzati" viene passato renderEditParamsModalBody così il
             * modale stesso si aggiorna senza chiudersi. */
            function bindParametriAvanzatiEvents(container, refreshFn){
                const refresh = refreshFn || refreshParametriAvanzatiViews;

                container.querySelectorAll('.proc-cat-select').forEach(sel => {
                    sel.addEventListener('change', (e) => {
                        const strato = getStratoById(sel.dataset.stratoId);
                        const v = e.target.value;
                        seleziona(strato, sel.dataset.catId, v === '' ? null : parseInt(v));
                        saveState();
                        refresh();
                    });
                });

                container.querySelectorAll('.proc-info-cat').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const cat = CATEGORIE_PER_ID[btn.dataset.catId];
                        if (typeof appAlert === 'function') appAlert(cat.spiegazione);
                        else alert(cat.spiegazione);
                    });
                });

                // Bind: "Modifica" nel riepilogo compatto apre la finestra centrale dedicata
                // (non modifica più la card nel drawer, per non comprometterne la leggibilità).
                container.querySelectorAll('.strato-edit-params-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        openEditParamsModal(btn.dataset.stratoId);
                    });
                });

                // Bind: "Annulla" (dentro la finestra) ripristina i parametri com'erano prima
                // di entrare in modifica e chiude la finestra.
                container.querySelectorAll('.strato-cancel-params-btn').forEach(btn => {
                    btn.addEventListener('click', () => {
                        cancelEditParamsModal();
                    });
                });

                // Bind: "Salva Modifiche" (dentro la finestra) mostra un riepilogo di conferma
                // con i valori scelti (le selezioni sono già applicate in tempo reale dal
                // proc-cat-select qui sopra; questo è il passaggio di conferma esplicita richiesto
                // prima di chiudere la finestra).
                container.querySelectorAll('.strato-save-params-btn').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        await saveEditParamsModal();
                    });
                });

                // Bind: apri/chiudi la spiegazione "perché consigliato" di un candidato ★
                container.querySelectorAll('.proc-spiega-suggerito').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const key = btn.dataset.key;
                        if (procSpiegazioniAperte.has(key)) procSpiegazioniAperte.delete(key); else procSpiegazioniAperte.add(key);
                        refresh();
                    });
                });
            }

            // =========================================================================
            // FINESTRA CENTRALE "MODIFICA PARAMETRI AVANZATI" — sovraimpressione modale,
            // non più un pannello inline nello stretto drawer "Gestione dei dati litologici"
            // (che si deformava con selettori/note lunghe). Un solo strato alla volta.
            // =========================================================================

            const modalEditParamsOverlay = document.getElementById('modalEditParamsOverlay');
            const modalEditParams = document.getElementById('modalEditParams');
            const editParamsBody = document.getElementById('editParamsBody');
            const lblEditParamsStrato = document.getElementById('lblEditParamsStrato');

            function renderEditParamsModalBody(){
                if (!editingStratoId || !editParamsBody) return;
                const strato = getStratoById(editingStratoId);
                if (!strato) { chiudiEditParamsModal(); return; }
                if (lblEditParamsStrato) lblEditParamsStrato.textContent = strato.name;
                const trovato = calcolaRisultatiPerStratiCorrenti()[strato.id];
                editParamsBody.innerHTML = buildParametriAvanzatiBodyHtml(strato, trovato, true);
                bindParametriAvanzatiEvents(editParamsBody, renderEditParamsModalBody);
            }

            function openEditParamsModal(stratoId){
                const strato = getStratoById(stratoId);
                if (!strato) return;
                ensureParametriAvanzati(strato);
                stratiParamsEditSnapshot[strato.id] = JSON.parse(JSON.stringify(strato.parametriAvanzati));
                editingStratoId = strato.id;
                renderEditParamsModalBody();
                if (modalEditParamsOverlay) modalEditParamsOverlay.classList.add('open');
                if (modalEditParams) modalEditParams.classList.add('open');
                document.body.classList.add('modal-open');
            }

            function chiudiEditParamsModal(){
                editingStratoId = null;
                if (modalEditParamsOverlay) modalEditParamsOverlay.classList.remove('open');
                if (modalEditParams) modalEditParams.classList.remove('open');
                document.body.classList.remove('modal-open');
            }

            // "Annulla" o chiusura (X / overlay) senza salvare: ripristina lo stato precedente.
            function cancelEditParamsModal(){
                const strato = editingStratoId ? getStratoById(editingStratoId) : null;
                if (strato && stratiParamsEditSnapshot[strato.id]) {
                    strato.parametriAvanzati = stratiParamsEditSnapshot[strato.id];
                    delete stratiParamsEditSnapshot[strato.id];
                    saveState();
                }
                chiudiEditParamsModal();
                renderStratiList();
            }

            async function saveEditParamsModal(){
                const strato = editingStratoId ? getStratoById(editingStratoId) : null;
                if (!strato) return;
                const trovato2 = calcolaRisultatiPerStratiCorrenti()[strato.id];
                const categorie = trovato2 ? categorieApplicabili({isCoesivo: trovato2.agg.isCoesivo, isIncoerente: trovato2.agg.isIncoerente}) : [];
                const righe = categorie.map(cat => {
                    const sel = trovato2 && trovato2.ris.categorie[cat.id] ? trovato2.ris.categorie[cat.id].selezionato : null;
                    return `${ETICHETTE_PARAMETRO[cat.id].compatta}: ${sel ? formattaValoreWizard(cat, sel.valore) + ' (' + sel.autore + (sel.terreno ? ' — ' + sel.terreno : '') + ')' : 'Non assegnato'}`;
                }).join('\n');
                const recap = `Confermi i parametri avanzati per "${strato.name}"?\n\n${righe || 'Nessun parametro applicabile.'}`;
                // Ripiego su confirm() nativo RIMOSSO: appConfirm è dichiarata all'avvio dell'app e
                // usata incondizionatamente in una decina di altri punti, quindi quel ramo non
                // poteva mai essere raggiunto — restava solo l'ultimo confirm() nativo nel codice.
                const ok = await appConfirm(recap);
                if (!ok) return;
                delete stratiParamsEditSnapshot[strato.id];
                saveState();
                chiudiEditParamsModal();
                renderStratiList();
                triggerVibrate(30);
            }

            if (modalEditParamsOverlay) modalEditParamsOverlay.addEventListener('click', cancelEditParamsModal);
            const btnCloseEditParamsX = document.getElementById('btnCloseEditParamsX');
            if (btnCloseEditParamsX) btnCloseEditParamsX.addEventListener('click', cancelEditParamsModal);

