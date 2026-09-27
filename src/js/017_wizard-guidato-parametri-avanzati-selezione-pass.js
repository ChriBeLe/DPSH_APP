            // =========================================================================
            // WIZARD GUIDATO PARAMETRI AVANZATI — selezione passo-passo e ordinata, con
            // candidati raggruppati per autore, badge "consigliato" e riepilogo finale.
            // Porting dell'esperienza del wizard originale (wizard-parametri-avanzati.html),
            // adattato per leggere/scrivere sugli stessi dati (state.strati[].parametriAvanzati)
            // usati dalle altre due viste (Gestione Strati ed Elaborazione Dati Speciali):
            // una scelta fatta nel wizard compare subito anche lì, e viceversa.
            // =========================================================================

            let wizStratoIdx = 0;
            let wizStepIdx = 0;
            let wizModoRiepilogo = false;
            const wizSpiegazioniAperte = new Set(); // chiavi "categoriaId:index" dei pannelli aperti
            let wizFiltroTesto = ''; // testo di ricerca nello step corrente: si azzera cambiando step/strato/riepilogo
            const wizAvvisiCarbonaticiAperti = new Set(); // id degli strati per cui l'avviso rischio carbonatico è stato espanso
            const wizAvvisiNonTipiciAperti = new Set(); // chiavi "stratoId:categoriaId" per l'avviso "parametro non tipico" espanso
            let wizHintPalliniMostrato = false; // true dopo la prima apertura del wizard in questa sessione: l'hint "tocca o scorri" appare una sola volta

            const ICONA_BERSAGLIO = `<svg viewBox="0 0 20 20" fill="none"><circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="4.5" stroke="currentColor" stroke-width="1.6"/><circle cx="10" cy="10" r="1.4" fill="currentColor"/></svg>`;

            function formattaValoreWizard(categoria, valore){
                if(categoria.id==='pesoDiVolume') return `${valore?.secco!=null?valore.secco.toFixed(2):'—'} / ${valore?.saturo!=null?valore.saturo.toFixed(2):'—'}`;
                return (valore!=null && !Number.isNaN(valore)) ? valore.toFixed(2) : '—';
            }

            /** Raggruppa i candidati di una categoria per autore ("cognome"), preservando l'ordine di comparsa. */
            function raggruppaPerAutore(candidati){
                const gruppi=[], mappa=new Map();
                for(const c of candidati){
                    if(!mappa.has(c.autore)){ const g={autore:c.autore, varianti:[]}; mappa.set(c.autore,g); gruppi.push(g); }
                    mappa.get(c.autore).varianti.push(c);
                }
                return gruppi;
            }

            function categorieConSceltaWizard(strato, appCats){
                return appCats.filter(cat => strato.parametriAvanzati?.[cat.id]?.autoreIndex != null).length;
            }

            const modalWizardOverlay = document.getElementById('modalWizardOverlay');
            const modalWizard = document.getElementById('modalWizard');
            const btnCloseWizardX = document.getElementById('btnCloseWizardX');

            /** Trova il primo strato con almeno una categoria applicabile ancora senza scelta,
             * così il pulsante globale "Apri il Wizard Guidato" porta subito al lavoro da fare
             * invece che sempre al primo strato dell'elenco (che potrebbe già essere completo). */
            function primoStratoDaCompletare(){
                if (!state.strati || state.strati.length === 0) return null;
                const risultatoPerId = calcolaRisultatiPerStratiCorrenti();
                for (const s of state.strati) {
                    const t = risultatoPerId[s.id];
                    if (!t) continue;
                    const appCatsS = categorieApplicabili({isCoesivo: t.agg.isCoesivo, isIncoerente: t.agg.isIncoerente});
                    if (appCatsS.length > 0 && categorieConSceltaWizard(s, appCatsS) < appCatsS.length) return s.id;
                }
                return state.strati[0].id;
            }

            function apriWizardParametri(stratoId){
                if (!state.strati || state.strati.length === 0) {
                    appAlert('Configura almeno uno strato prima di aprire il wizard guidato.');
                    return;
                }
                const idx = stratoId ? state.strati.findIndex(s => s.id === stratoId) : 0;
                wizStratoIdx = idx >= 0 ? idx : 0;
                wizStepIdx = 0;
                wizModoRiepilogo = false;
                wizSpiegazioniAperte.clear();
                renderWizardModal();
                if (modalWizardOverlay) modalWizardOverlay.classList.add('open');
                if (modalWizard) modalWizard.classList.add('open');
            }
            /** Trova la prima categoria applicabile ancora senza una scelta esplicita, scandendo
             * gli strati nell'ordine in cui compaiono nel wizard. Usata per rendere obbligatoria
             * una scelta per ogni campo prima di poter chiudere il wizard: se manca qualcosa,
             * invece di chiudere si salta dritti al passo interessato. */
            function primoCampoWizardMancante(){
                if (!state.strati || state.strati.length === 0) return null;
                const risultatoPerId = calcolaRisultatiPerStratiCorrenti();
                for (let i = 0; i < state.strati.length; i++) {
                    const s = state.strati[i];
                    const t = risultatoPerId[s.id];
                    if (!t) continue;
                    // Resta obbligatoria solo una scelta per le categorie TIPICHE (appCatsS,
                    // filtro duro invariato) — quelle non tipiche restano sempre facoltative.
                    // wizStepIdx ora indicizza l'intero CATEGORIE (8 voci fisse, mai filtrate),
                    // quindi lo step da restituire va tradotto dall'indice-in-appCatsS al suo
                    // indice-in-CATEGORIE.
                    const appCatsS = categorieApplicabili({isCoesivo: t.agg.isCoesivo, isIncoerente: t.agg.isIncoerente});
                    for (let j = 0; j < appCatsS.length; j++) {
                        if (s.parametriAvanzati?.[appCatsS[j].id]?.autoreIndex == null) {
                            const catIdx = CATEGORIE.findIndex(c => c.id === appCatsS[j].id);
                            return { stratoIdx: i, stepIdx: catIdx >= 0 ? catIdx : 0, catLabel: appCatsS[j].label, stratoName: s.name };
                        }
                    }
                }
                return null;
            }

            function chiudiWizardParametri(forza){
                if (!forza) {
                    const mancante = primoCampoWizardMancante();
                    if (mancante) {
                        wizStratoIdx = mancante.stratoIdx;
                        wizStepIdx = mancante.stepIdx;
                        wizModoRiepilogo = false;
                        wizSpiegazioniAperte.clear();
                        renderWizardModal();
                        appAlert(`Manca ancora una scelta per "${mancante.catLabel}" nello strato "${mancante.stratoName}". Completa questo campo (o usa "Compila automaticamente" nella Gestione Strati per accettare i consigliati) prima di chiudere il wizard.`);
                        return;
                    }
                }
                if (modalWizardOverlay) modalWizardOverlay.classList.remove('open');
                if (modalWizard) modalWizard.classList.remove('open');
            }
            if (btnCloseWizardX) btnCloseWizardX.addEventListener('click', () => chiudiWizardParametri(false));
            if (modalWizardOverlay) modalWizardOverlay.addEventListener('click', () => chiudiWizardParametri(false));

            // Pulsante globale "Configurazione guidata": raggiungibile con un solo tocco dalla
            // Gestione dei dati litologici, senza dover prima espandere il pannello Parametri
            // Avanzati di uno strato specifico. Porta al primo strato ancora da completare.
            const btnOpenWizardFromStrati = document.getElementById('btnOpenWizardFromStrati');
            if (btnOpenWizardFromStrati) btnOpenWizardFromStrati.addEventListener('click', () => apriWizardParametri(primoStratoDaCompletare()));

            // Compila automaticamente TUTTI gli strati del progetto in un colpo solo (non
            // sovrascrive le scelte già fatte manualmente per un dato parametro).
            function autoCompilaStrato(strato) {
                const trovato = calcolaRisultatiPerStratiCorrenti()[strato.id];
                if (!trovato) return;
                const { agg } = trovato;
                categorieApplicabili({isCoesivo: agg.isCoesivo, isIncoerente: agg.isIncoerente}).forEach(cat => {
                    if (strato.parametriAvanzati[cat.id]?.autoreIndex != null) return; // non sovrascrive scelte già fatte
                    const candCompat = candidatiCompatibili(cat, agg);
                    const candConValore = candCompat.map((c, index) => ({index}));
                    const idx = primoCandidatoConsigliato(cat, strato, candConValore);
                    if (idx != null) seleziona(strato, cat.id, idx);
                });
            }
            const btnAutoCompilaTuttiStrati = document.getElementById('btnAutoCompilaTuttiStrati');
            if (btnAutoCompilaTuttiStrati) {
                btnAutoCompilaTuttiStrati.addEventListener('click', () => {
                    (state.strati || []).forEach(strato => {
                        ensureParametriAvanzati(strato);
                        autoCompilaStrato(strato);
                    });
                    saveState();
                    refreshParametriAvanzatiViews();
                    triggerVibrate(30);
                });
            }

            function renderWizardModal(){
                const body = document.getElementById('wizardBody');
                if (!body) return;

                if (!state.strati || state.strati.length === 0) {
                    body.innerHTML = `<div class="wiz-categoria-vuota">Nessuno strato configurato per questo progetto.</div>`;
                    return;
                }
                if (wizStratoIdx >= state.strati.length) wizStratoIdx = 0;

                const risultatoPerId = calcolaRisultatiPerStratiCorrenti();
                const strato = state.strati[wizStratoIdx];
                ensureParametriAvanzati(strato);
                const trovato = risultatoPerId[strato.id];
                const appCats = trovato ? categorieApplicabili({isCoesivo: trovato.agg.isCoesivo, isIncoerente: trovato.agg.isIncoerente}) : [];
                const riconosciute = categorieRiconosciuteDiStrato(strato);

                const tabsHtml = state.strati.map((s, i) => {
                    const t = risultatoPerId[s.id];
                    const appCatsS = t ? categorieApplicabili({isCoesivo: t.agg.isCoesivo, isIncoerente: t.agg.isIncoerente}) : [];
                    const totale = appCatsS.length;
                    const fatte = categorieConSceltaWizard(s, appCatsS);
                    return `<button class="wiz-strato-tab ${i===wizStratoIdx?'wiz-attivo':''} ${totale>0 && fatte===totale?'wiz-completo':''}" data-strato-idx="${i}">
                        <span class="wiz-swatch" style="background:${s.color}"></span>
                        ${s.name.length>18 ? s.name.slice(0,17)+'…' : s.name}
                        ${totale>0 ? `<span class="wiz-badge-count">${fatte}/${totale}</span>` : ''}
                    </button>`;
                }).join('');

                let bodyHtml;
                if (!trovato) {
                    bodyHtml = `<div class="wiz-categoria-vuota">Nessun intervallo assegnato a "${strato.name}" in questa prova: assegna la litologia agli intervalli nella scheda "Prova" per poter calcolare Nspt, Rpd e usare il wizard su questo strato.</div>`;
                } else if (wizModoRiepilogo) {
                    bodyHtml = renderWizardRiepilogo(strato, trovato, appCats);
                } else {
                    bodyHtml = renderWizardStep(strato, trovato, appCats, riconosciute);
                }

                // wizStepIdx indicizza sempre l'intero CATEGORIE (8 voci fisse): nessuna
                // macro-categoria sparisce più, anche quelle non tipiche restano un pallino
                // toccabile — vedi categoriaTipicaPerStrato più sopra.
                const categoriaAttuale = CATEGORIE[wizStepIdx];
                const haSelezioneStepCorrente = !!trovato && !wizModoRiepilogo && categoriaAttuale &&
                    strato.parametriAvanzati?.[categoriaAttuale.id]?.autoreIndex != null;
                // Un parametro "non tipico" è per definizione facoltativo (vedi legenda pallini):
                // l'utente deve poter avanzare anche senza scegliere nulla. Prima il tasto Continua
                // compariva solo con una selezione già fatta, quindi su uno step non tipico senza
                // scelta l'unico modo per proseguire erano i pallini in alto — poco intuitivo.
                const stepCorrenteNonTipico = !!trovato && !wizModoRiepilogo && categoriaAttuale &&
                    !categoriaTipicaPerStrato(categoriaAttuale, strato);
                const mostraContinua = haSelezioneStepCorrente || stepCorrenteNonTipico;

                body.innerHTML = `
                    <div class="wiz-eyebrow">${trovato ? `${trovato.agg.profonditaDa.toFixed(2)}–${trovato.agg.profonditaA.toFixed(2)} m · ${trovato.agg.isCoesivo?'coesivo':'granulare'}` : 'Nessun dato in questa prova'}</div>
                    <div class="wiz-strati-tabs">${tabsHtml}</div>
                    ${trovato && !wizModoRiepilogo ? (() => {
                        const usaManuale = Array.isArray(strato.categorieManuali);
                        const attive = usaManuale ? strato.categorieManuali : categorieDiTesto(strato.name);
                        const chipsHtml = ['GHIAIA', 'SABBIA', 'LIMO', 'ARGILLA'].map(cat => {
                            const on = attive.includes(cat);
                            return `<button type="button" class="wiz-cat-chip ${on ? 'wiz-cat-chip-attiva' : ''}" data-wiz-cat-toggle="${cat}">${cat.charAt(0) + cat.slice(1).toLowerCase()}</button>`;
                        }).join('');
                        return `
                        <div class="wiz-categorie-manuali">
                            <div class="wiz-categorie-manuali-label">
                                Comportamento litologico ${usaManuale ? '— scelto manualmente' : '— dal nome dello strato'}
                            </div>
                            <div class="wiz-categorie-manuali-chips">
                                ${chipsHtml}
                                ${usaManuale ? '<button type="button" class="wiz-cat-reset" data-wiz-cat-reset="1">Ripristina automatico</button>' : ''}
                            </div>
                        </div>`;
                    })() : ''}
                    ${trovato && stratoRischioCarbonatico(strato.name) ? (() => {
                        const aperto = wizAvvisiCarbonaticiAperti.has(strato.id);
                        return `
                        <button type="button" class="wiz-avviso-carbonatico ${aperto?'wiz-avviso-aperto':''}" data-wiz-avviso-toggle="${strato.id}">
                            <svg class="wiz-avviso-ico" viewBox="0 0 20 20" fill="none"><path d="M10 2L18 17H2L10 2Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M10 8v4M10 14v.01" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                            <div class="wiz-avviso-testo">
                                <b>Nome riconosciuto come roccia arenacea/calcarenitica, assimilata a sabbia.</b>
                                ${aperto ? ` Le correlazioni Nspt qui proposte sono calibrate soprattutto su sabbie silicee: la letteratura documenta un'affidabilità molto ridotta sui terreni carbonatici. Usa i valori con cautela aggiuntiva, specie per angolo di attrito, densità relativa e resistenza CPT equivalente.` : ` <span class="wiz-avviso-hint">tocca per i dettagli</span>`}
                            </div>
                            <span class="wiz-avviso-chevron">${aperto?'−':'+'}</span>
                        </button>`;
                    })() : ''}
                    <div class="wiz-card">
                        <div class="wiz-core-strip" style="background:${strato.color}; ${getPatternCss(strato.pattern||'none', strato.color)}"></div>
                        <div class="wiz-body">${bodyHtml}</div>
                    </div>
                    ${trovato && !wizModoRiepilogo ? `<p class="wiz-foot-note">Le varianti con il badge <strong>consigliato</strong> sono quelle il cui tipo di terreno è interamente compatibile con ciò che è stato riconosciuto nel nome dello strato — mai una formula che nomini anche un materiale non presente nello strato. I pallini grigi in alto sono parametri non tipici per questo terreno: restano scelte facoltative e comunque disponibili. La scelta finale resta sempre tua.</p>` : ''}
                    ${mostraContinua ? `
                        <div class="wiz-continua-overlay">
                            <button class="wiz-btn-continua" id="wiz-btn-continua">
                                ${haSelezioneStepCorrente ? 'Continua' : 'Salta (non tipico)'}
                                <svg viewBox="0 0 16 16" fill="none"><path d="M4 8h8M8 4l4 4-4 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
                            </button>
                        </div>` : ''}
                `;

                // Bind: chip di categoria litologica manuale. Il primo tocco parte sempre dallo
                // stato auto-riconosciuto dal nome (non da zero), cosi correggere una sola
                // categoria non fa sparire le altre già indovinate correttamente dal nome.
                body.querySelectorAll('[data-wiz-cat-toggle]').forEach(el => {
                    el.addEventListener('click', () => {
                        const cat = el.dataset.wizCatToggle;
                        const base = Array.isArray(strato.categorieManuali)
                            ? strato.categorieManuali.slice()
                            : categorieDiTesto(strato.name).slice();
                        const i2 = base.indexOf(cat);
                        if (i2 >= 0) base.splice(i2, 1); else base.push(cat);
                        strato.categorieManuali = base;
                        saveState();
                        renderStratiList();
                        renderWizardModal();
                    });
                });
                body.querySelectorAll('[data-wiz-cat-reset]').forEach(el => {
                    el.addEventListener('click', () => {
                        delete strato.categorieManuali;
                        saveState();
                        renderStratiList();
                        renderWizardModal();
                    });
                });

                body.querySelectorAll('.wiz-strato-tab').forEach(el => {
                    el.addEventListener('click', () => {
                        wizStratoIdx = Number(el.dataset.stratoIdx);
                        // Se l'utente era nel riepilogo, cambiare strato deve mostrare il
                        // riepilogo del NUOVO strato — non riportarlo allo step-by-step da capo.
                        if (!wizModoRiepilogo) wizStepIdx = 0;
                        wizSpiegazioniAperte.clear();
                        wizFiltroTesto = '';
                        renderWizardModal();
                    });
                });
                body.querySelectorAll('[data-wiz-candidato]').forEach(el => {
                    el.addEventListener('click', () => {
                        const catId = el.dataset.wizCategoria;
                        const idx = Number(el.dataset.wizCandidato);
                        // Toccare di nuovo il candidato GIÀ selezionato lo deseleziona, invece di
                        // lasciarlo bloccato per forza su quella scelta: utile per correggere un
                        // tocco sbagliato senza dover scegliere un'alternativa solo per "annullare".
                        // Riguarda solo questo tocco diretto nel wizard: seleziona() resta invariata
                        // per la tendina manuale di Parametri Avanzati, che ha già la sua opzione vuota.
                        const giaSelezionato = strato.parametriAvanzati?.[catId]?.autoreIndex === idx;
                        if (giaSelezionato) {
                            delete strato.parametriAvanzati[catId];
                        } else {
                            seleziona(strato, catId, idx);
                        }
                        wizSpiegazioniAperte.clear();
                        saveState();
                        renderStratiList();
                        renderWizardModal(); // niente avanzamento automatico: resta sullo step, mostra "Continua"
                    });
                });
                const btnContinua = document.getElementById('wiz-btn-continua');
                if (btnContinua) btnContinua.addEventListener('click', () => {
                    wizSpiegazioniAperte.clear();
                    wizFiltroTesto = '';
                    if (wizStepIdx < CATEGORIE.length-1) { wizStepIdx++; } else { wizModoRiepilogo = true; }
                    renderWizardModal();
                });
                body.querySelectorAll('[data-wiz-spiega]').forEach(el => {
                    el.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const key = el.dataset.wizSpiega;
                        if (wizSpiegazioniAperte.has(key)) wizSpiegazioniAperte.delete(key); else wizSpiegazioniAperte.add(key);
                        renderWizardModal();
                    });
                });
                body.querySelectorAll('[data-wiz-jump]').forEach(el => {
                    el.addEventListener('click', () => {
                        wizStepIdx = Number(el.dataset.wizJump);
                        wizModoRiepilogo = false; wizSpiegazioniAperte.clear(); wizFiltroTesto = ''; wizHintPalliniMostrato = true;
                        renderWizardModal();
                    });
                });
                const btnIndietro = document.getElementById('wiz-nav-indietro');
                if (btnIndietro) btnIndietro.addEventListener('click', () => {
                    wizSpiegazioniAperte.clear();
                    wizFiltroTesto = '';
                    if (wizModoRiepilogo) { wizModoRiepilogo=false; wizStepIdx=CATEGORIE.length-1; }
                    else if (wizStepIdx>0) { wizStepIdx--; }
                    renderWizardModal();
                });
                const btnRiepilogo = document.getElementById('wiz-nav-riepilogo');
                if (btnRiepilogo) btnRiepilogo.addEventListener('click', () => { wizModoRiepilogo=true; wizFiltroTesto=''; renderWizardModal(); });
                const campoRicerca = document.getElementById('wiz-ricerca-input');
                if (campoRicerca) {
                    campoRicerca.addEventListener('input', () => {
                        wizFiltroTesto = campoRicerca.value;
                        renderWizardModal();
                        // dopo il re-render il focus va ridato e il cursore riportato in fondo al testo,
                        // altrimenti l'utente perderebbe il focus dall'input a ogni carattere digitato.
                        const nuovoCampo = document.getElementById('wiz-ricerca-input');
                        if (nuovoCampo) { nuovoCampo.focus(); const v = nuovoCampo.value; nuovoCampo.value=''; nuovoCampo.value=v; }
                    });
                }
                body.querySelectorAll('[data-wiz-avviso-toggle]').forEach(el => {
                    el.addEventListener('click', () => {
                        const id = el.dataset.wizAvvisoToggle;
                        if (wizAvvisiCarbonaticiAperti.has(id)) wizAvvisiCarbonaticiAperti.delete(id); else wizAvvisiCarbonaticiAperti.add(id);
                        renderWizardModal();
                    });
                });
                body.querySelectorAll('#wiz-ricerca-reset, #wiz-ricerca-reset-inline').forEach(el => {
                    el.addEventListener('click', () => {
                        wizFiltroTesto = '';
                        renderWizardModal();
                        const nuovoCampo = document.getElementById('wiz-ricerca-input');
                        if (nuovoCampo) nuovoCampo.focus();
                    });
                });
                const btnRivedi = document.getElementById('wiz-nav-rivedi');
                if (btnRivedi) btnRivedi.addEventListener('click', () => { wizModoRiepilogo=false; wizStepIdx=0; wizFiltroTesto=''; renderWizardModal(); });
                const btnSalvaArchivio = document.getElementById('wiz-nav-salva-archivio');
                if (btnSalvaArchivio) btnSalvaArchivio.addEventListener('click', () => {
                    // Stessa correzione di renderStratiList qui sopra: un collegamento orfano
                    // (sourceArchiveId che punta a una voce mai arrivata su questo dispositivo) va
                    // trattato come "da salvare di nuovo", non come "già fatto per sempre".
                    if (!strato || stratoHaCollegamentoArchivioValido(strato)) return;
                    promoteStratoToArchive(strato);
                    saveState();
                    renderWizardModal();
                    triggerVibrate([25, 25, 25]);
                });

                // Avviso "parametro non tipico": stesso comportamento a comparsa/collasso
                // dell'avviso rischio carbonatico, chiave per strato+categoria.
                body.querySelectorAll('[data-wiz-avviso-non-tipico-toggle]').forEach(el => {
                    el.addEventListener('click', () => {
                        const key = el.dataset.wizAvvisoNonTipicoToggle;
                        if (wizAvvisiNonTipiciAperti.has(key)) wizAvvisiNonTipiciAperti.delete(key); else wizAvvisiNonTipiciAperti.add(key);
                        renderWizardModal();
                    });
                });

                // Navigazione a scorrimento col dito (swipe) sulla fila di pallini: un trascinamento
                // orizzontale abbastanza ampio avanza/indietreggia di uno step, oltre al tocco
                // diretto su un pallino (già gestito da [data-wiz-jump] qui sopra).
                const dotsRow = body.querySelector('.wiz-progress-dots');
                if (dotsRow) {
                    let dragStartX = null, dragged = false;
                    dotsRow.addEventListener('pointerdown', (e) => { dragStartX = e.clientX; dragged = false; });
                    dotsRow.addEventListener('pointermove', (e) => {
                        if (dragStartX === null) return;
                        if (Math.abs(e.clientX - dragStartX) > 8) dragged = true;
                    });
                    dotsRow.addEventListener('pointerup', (e) => {
                        if (dragStartX === null) return;
                        const dx = e.clientX - dragStartX;
                        dragStartX = null;
                        if (!dragged) return; // click semplice: lo gestisce già [data-wiz-jump]
                        const SOGLIA = 36;
                        if (dx < -SOGLIA && wizStepIdx < CATEGORIE.length-1) { wizStepIdx++; wizHintPalliniMostrato = true; renderWizardModal(); }
                        else if (dx > SOGLIA && wizStepIdx > 0) { wizStepIdx--; wizHintPalliniMostrato = true; renderWizardModal(); }
                    });
                }

                // Suggerimento "tocca o scorri i pallini": mostrato una sola volta per sessione,
                // sparisce da solo dopo pochi secondi o alla prima interazione con i pallini.
                if (!wizModoRiepilogo && !wizHintPalliniMostrato) {
                    wizHintPalliniMostrato = true;
                    setTimeout(() => {
                        if (modalWizard && modalWizard.classList.contains('open')) renderWizardModal();
                    }, 3200);
                }
            }

            function renderWizardStep(strato, trovato, appCats, riconosciute){
                const categoria = CATEGORIE[wizStepIdx];
                const tipica = categoriaTipicaPerStrato(categoria, strato);
                const natura = trovato.agg.isCoesivo ? 'coesivo' : 'granulare';
                // Se la categoria non è tipica per questo strato, i suoi candidati non sono mai
                // stati calcolati nel filtro duro (trovato.ris.categorie[id].candidati è vuoto):
                // li calcoliamo qui al volo, stesso ctx, nessuna formula reinventata.
                const datiCategoria = tipica ? trovato.ris.categorie[categoria.id] : { candidati: candidatiWizardIgnorandoTipicita(categoria, trovato) };
                const sceltaIdx = strato.parametriAvanzati?.[categoria.id]?.autoreIndex;

                // Pallini SEMPRE tutti e 8, mai nascosti: quelli non tipici per la natura dello
                // strato restano spenti (grigi) ma restano un bottone toccabile — riusa lo stesso
                // meccanismo [data-wiz-jump] già cablato per il riepilogo.
                const dots = CATEGORIE.map((cat,i)=>{
                    const catTipica = categoriaTipicaPerStrato(cat, strato);
                    const fatto = strato.parametriAvanzati?.[cat.id]?.autoreIndex != null;
                    const attivo = i===wizStepIdx;
                    const haConsigliato = !attivo && categoriaHaConsigliato(cat, strato, trovato, riconosciute);
                    let classi;
                    if (attivo) classi = catTipica ? 'wiz-dot-attivo' : 'wiz-dot-attivo wiz-dot-attivo-non-tipico';
                    else if (!catTipica) classi = 'wiz-dot-non-tipico';
                    else if (fatto) classi = 'wiz-dot-fatto';
                    else classi = 'wiz-dot-tipico';
                    if (haConsigliato) classi += ' wiz-dot-consigliato';
                    const titoloConsigliato = haConsigliato ? ' — il wizard ha un consiglio pronto qui' : '';
                    return `<button type="button" class="wiz-dot-btn" data-wiz-jump="${i}" title="${cat.label}${catTipica?'':' — non tipico per questo terreno, ma disponibile'}${titoloConsigliato}"><span class="wiz-dot ${classi}"></span></button>`;
                }).join('');

                const mostraHintPallini = !wizHintPalliniMostrato;
                const chiaveAvvisoNonTipico = `${strato.id}:${categoria.id}`;
                const avvisoNonTipicoAperto = wizAvvisiNonTipiciAperti.has(chiaveAvvisoNonTipico);
                const motivoNonTipico = MOTIVO_NON_TIPICO[categoria.id]?.[natura];

                let candidatiConSuggerimento = datiCategoria.candidati.map(c=>({
                    ...c, ...valutaSuggerimento(c, riconosciute, strato.name),
                }));
                candidatiConSuggerimento = applicaFallbackSuggerimentoParziale(candidatiConSuggerimento, riconosciute, strato.name);
                let gruppi = raggruppaPerAutore(candidatiConSuggerimento);
                gruppi = [...gruppi].sort((a,b)=>{
                    const sa = a.varianti.some(v=>v.suggerito) ? 0 : 1;
                    const sb = b.varianti.some(v=>v.suggerito) ? 0 : 1;
                    return sa-sb;
                });

                // Filtro testuale: cerca sia nel cognome dell'autore sia nel nome del terreno di
                // ogni variante (accent/case-insensitive). Un gruppo resta visibile se l'autore
                // corrisponde (mostra tutte le sue varianti) oppure se corrisponde almeno una
                // variante (mostra solo quelle che corrispondono).
                const filtroAttivo = wizFiltroTesto.trim().length > 0;
                if (filtroAttivo) {
                    const q = normalizzaTesto(wizFiltroTesto.trim());
                    gruppi = gruppi.map(gruppo => {
                        const autoreMatch = normalizzaTesto(gruppo.autore).includes(q);
                        const varianti = autoreMatch ? gruppo.varianti : gruppo.varianti.filter(c => normalizzaTesto(c.terreno ?? gruppo.autore).includes(q));
                        return { ...gruppo, varianti };
                    }).filter(gruppo => gruppo.varianti.length > 0);
                }

                const gruppiHtml = gruppi.map(gruppo=>{
                    const haConsigliati = gruppo.varianti.some(v=>v.suggerito);
                    const nota = notaScientificaDi(gruppo.autore);
                    const variantiHtml = gruppo.varianti.map(c=>{
                        const isSel = c.index===sceltaIdx;
                        const key = `${categoria.id}:${c.index}`;
                        const panelAperto = wizSpiegazioniAperte.has(key);

                        const fonteTag = nota
                            ? (nota.v ? '<span class="wiz-fonte-tag">— fonte verificata</span>' : '<span class="wiz-fonte-tag">— descrizione generale, non verificata puntualmente</span>')
                            : '';
                        const voceCompatibilita = c.suggerito ? `<div class="wiz-voce"><b>Perché è compatibile:</b> ${c.spiegazione}</div>` : '';
                        const voceScientifica = nota ? `<div class="wiz-voce"><b>Base scientifica (${gruppo.autore}):</b> ${nota.testo} ${fonteTag}</div>` : '';
                        const voceAvviso = nota?.avviso ? `<div class="wiz-voce"><b>⚠ Attenzione:</b> ${nota.avviso}</div>` : '';
                        const contenutoPannello = voceCompatibilita + voceScientifica + voceAvviso || '<div class="wiz-voce">Nessuna nota disponibile per questa variante.</div>';

                        const haQualcosaDaSpiegare = c.suggerito || nota;

                        return `
                            <div class="wiz-variante ${isSel?'wiz-selezionato':''}" data-wiz-categoria="${categoria.id}" data-wiz-candidato="${c.index}">
                                <div class="wiz-variante-riga">
                                    <div class="wiz-variante-terreno">${c.terreno ?? gruppo.autore}</div>
                                    <div style="display:flex;align-items:center;gap:10px;">
                                        <div class="wiz-variante-valore">${formattaValoreWizard(categoria, c.valore)}</div>
                                        <div class="wiz-variante-check"><svg viewBox="0 0 16 16" fill="none"><path d="M3 8.5L6.2 12L13 4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
                                    </div>
                                </div>
                                ${haQualcosaDaSpiegare ? `
                                    <div class="wiz-riga-consiglio">
                                        ${c.suggerito ? (c.parziale
                                            ? `<span class="wiz-badge-consigliato wiz-badge-parziale">${ICONA_BERSAGLIO} Più vicino disponibile</span>`
                                            : `<span class="wiz-badge-consigliato">${ICONA_BERSAGLIO} Consigliato</span>`) : ''}
                                        <button class="wiz-btn-info ${c.suggerito?'wiz-btn-spiega':''}" data-wiz-spiega="${key}" title="${c.suggerito?'Perché è consigliato?':'Base scientifica'}">${panelAperto?'−':(c.suggerito?'?':'i')}</button>
                                    </div>
                                    ${panelAperto ? `<div class="wiz-spiega-panel ${c.suggerito?'':'wiz-neutro'}">${contenutoPannello}</div>` : ''}
                                ` : ''}
                            </div>`;
                    }).join('');

                    return `<div class="wiz-gruppo ${haConsigliati?'wiz-ha-consigliati':''}">
                        <div class="wiz-gruppo-intestazione"><span class="wiz-cognome">${gruppo.autore}</span></div>
                        <div class="wiz-varianti">${variantiHtml}</div>
                    </div>`;
                }).join('');

                const numTipici = CATEGORIE.filter(c=>categoriaTipicaPerStrato(c, strato)).length;

                const hintPallini = mostraHintPallini ? `<div class="wiz-dots-hint">👆 Tocca o scorri i pallini per saltare tra i parametri</div>` : '';

                const avvisoNonTipico = (!tipica && motivoNonTipico) ? `
                    <button type="button" class="wiz-avviso-non-tipico" data-wiz-avviso-non-tipico-toggle="${chiaveAvvisoNonTipico}">
                        <svg viewBox="0 0 20 20" fill="none"><path d="M10 2L18.5 17H1.5L10 2Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M10 8V11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/><circle cx="10" cy="14" r="0.9" fill="currentColor"/></svg>
                        <div class="wiz-avviso-testo">
                            <b>Parametro non tipico per questo terreno (${natura}).</b>
                            ${avvisoNonTipicoAperto ? ` ${motivoNonTipico}` : ` <span class="wiz-avviso-hint">Tocca per il motivo scientifico.</span>`}
                        </div>
                        <span class="wiz-avviso-chevron">${avvisoNonTipicoAperto ? '−' : '+'}</span>
                    </button>
                ` : '';

                return `
                    <div class="wiz-progress-row">
                        ${hintPallini}
                        <div class="wiz-progress-dots">${dots}</div>
                        <div class="wiz-progress-label">Passo ${wizStepIdx+1} di ${CATEGORIE.length} · ${numTipici} tipici</div>
                    </div>
                    <div class="wiz-progress-legend">
                        <span><b class="wiz-legend-tipico"></b> tipico</span>
                        <span><b class="wiz-legend-non-tipico"></b> non tipico (facoltativo)</span>
                        <span><b class="wiz-legend-consigliato"></b> consigliato dal wizard</span>
                    </div>
                    ${avvisoNonTipico}
                    <div class="wiz-ricerca-row">
                        <svg class="wiz-ricerca-ico" viewBox="0 0 20 20" fill="none"><circle cx="9" cy="9" r="6.5" stroke="currentColor" stroke-width="1.6"/><path d="M14 14L18 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
                        <input type="text" id="wiz-ricerca-input" class="wiz-ricerca-input" placeholder="Cerca autore o terreno (es. sabbie)…" value="${wizFiltroTesto.replace(/"/g,'&quot;')}" autocomplete="off">
                        ${filtroAttivo ? `<button type="button" id="wiz-ricerca-reset" class="wiz-ricerca-reset" title="Cancella ricerca" aria-label="Cancella ricerca">✕</button>` : ''}
                    </div>
                    <div class="wiz-categoria-header" style="background:#${COLORI_EXPORT[categoria.id] || '90CAF9'}; border-radius:10px; padding:10px 12px 12px;">
                        <h2 style="color:${WIZ_TESTO_SU_COLORE};">${categoria.label} <span class="wiz-unita" style="color:${WIZ_TESTO_SU_COLORE}; opacity:.7;">[${categoria.unita}]</span></h2>
                        <div class="wiz-spiegazione" style="background:rgba(255,255,255,.4); border-left-color:${WIZ_TESTO_SU_COLORE}; color:${WIZ_TESTO_SU_COLORE};">${categoria.spiegazione}</div>
                    </div>
                    ${gruppi.length===0
                        ? `<div class="wiz-categoria-vuota">Nessun risultato per «${wizFiltroTesto}». <button type="button" id="wiz-ricerca-reset-inline" class="wiz-link-btn">Cancella ricerca</button></div>`
                        : `<div class="wiz-candidati-list">${gruppiHtml}</div>`}
                    <div class="wiz-nav-row">
                        <button class="wiz-btn wiz-fantasma" id="wiz-nav-indietro" ${wizStepIdx===0?'disabled':''}>← Indietro</button>
                        <div style="flex:1;"></div>
                        <button class="wiz-btn" id="wiz-nav-riepilogo">Vai al riepilogo</button>
                    </div>
                `;
            }

            function renderWizardRiepilogo(strato, trovato, appCats){
                const righe = CATEGORIE.map((categoria,i)=>{
                    const tipicaCat = categoriaTipicaPerStrato(categoria, strato);
                    const d = trovato.ris.categorie[categoria.id];
                    let sel = d.selezionato;
                    let nonTipicoBadge = '';
                    const sceltaIdxRiep = strato.parametriAvanzati?.[categoria.id]?.autoreIndex;
                    if (!sel && !tipicaCat && sceltaIdxRiep != null) {
                        // Scelta atipica fatta consapevolmente dall'utente: il filtro duro non la
                        // vede (candidati=[] per questa categoria/strato), la recuperiamo qui.
                        const alt = candidatiWizardIgnorandoTipicita(categoria, trovato).find(c=>c.index===sceltaIdxRiep);
                        if (alt) { sel = alt; nonTipicoBadge = `<span class="wiz-tag-non-tipico">Non tipico</span>`; }
                    }
                    const naturaTag = sel?.natura ? `<span class="wiz-tag-natura wiz-${sel.natura}">${sel.natura}</span>` : '';
                    // Stesso sfondo della categoria (uguale al file ODT di riferimento): la riga
                    // diventa una "banda" colorata anziché un semplice separatore, così a colpo
                    // d'occhio si riconosce a quale gruppo di parametro appartiene ogni riga.
                    const coloreRiga = COLORI_EXPORT[categoria.id] || '90CAF9';
                    return `<div class="wiz-riepilogo-riga" data-wiz-jump="${i}" style="background:#${coloreRiga}; padding:9px 12px; border-radius:8px; margin-bottom:6px; border-bottom:none;">
                        <div class="wiz-riepilogo-nome" style="color:${WIZ_TESTO_SU_COLORE};">${categoria.label}</div>
                        <div class="wiz-riepilogo-dettaglio">
                            ${sel ? `
                                <div class="wiz-riepilogo-valore" style="color:${WIZ_TESTO_SU_COLORE};">${nonTipicoBadge}${formattaValoreWizard(categoria, sel.valore)} ${categoria.unita}</div>
                                <div class="wiz-riepilogo-autore" style="color:${WIZ_TESTO_SU_COLORE}; opacity:.75;">${naturaTag}${sel.autore}${sel.terreno?' · '+sel.terreno:''}</div>
                            ` : `<div class="wiz-riepilogo-manca" style="color:${WIZ_TESTO_SU_COLORE};">da scegliere →</div>`}
                        </div>
                    </div>`;
                }).join('');

                const derivati = trovato.ris.derivati;
                const coloreDerivati = COLORI_EXPORT.resistenzaCompressione;
                const derivatiRiga = `
                    <div class="wiz-riepilogo-riga" style="cursor:default; background:#${coloreDerivati}; padding:9px 12px; border-radius:8px; margin-bottom:6px; border-bottom:none;">
                        <div class="wiz-riepilogo-nome" style="color:${WIZ_TESTO_SU_COLORE};">Derivati (calcolo automatico)</div>
                        <div class="wiz-riepilogo-dettaglio">
                            <div class="wiz-riepilogo-autore" style="color:${WIZ_TESTO_SU_COLORE}; opacity:.75;">
                                qu=${derivati.qu!=null ? derivati.qu.toFixed(3) : '—'} kg/cm²
                                ${derivati.K0!=null?` · K0=${derivati.K0.toFixed(3)}`:''}
                                ${derivati.poisson!=null?` · ν=${derivati.poisson.toFixed(3)}`:''}
                            </div>
                        </div>
                    </div>`;

                // L'utente arriva qui subito dopo aver compilato tutto lo strato: è il momento
                // migliore per capire se conviene salvarlo nell'Archivio Litologico Globale (per
                // riusarlo in altri progetti) — se è già collegato (strato.sourceArchiveId), lo
                // segnaliamo soltanto invece di riproporre l'azione.
                // stratoHaCollegamentoArchivioValido: stessa correzione del badge "In Archivio"
                // nella gestione strati — un sourceArchiveId che punta a una voce mai arrivata su
                // questo dispositivo (backup non completamente ripristinato) non deve bloccare per
                // sempre il pulsante di salvataggio.
                const azioneArchivio = stratoHaCollegamentoArchivioValido(strato)
                    ? `<span class="wiz-badge-archivio"><svg class="ico" style="width:12px;height:12px;"><use href="#i-folder-open"/></svg> Già in archivio</span>`
                    : `<button class="wiz-btn wiz-btn-archivio" id="wiz-nav-salva-archivio"><svg class="ico" style="width:12px;height:12px;"><use href="#i-download"/></svg> ${strato.sourceArchiveId ? 'Ripristina collegamento archivio' : "Aggiungi all'archivio"}</button>`;

                return `
                    <div class="wiz-categoria-header">
                        <h2>Riepilogo — ${strato.name}</h2>
                    </div>
                    <div>${righe}${derivatiRiga}</div>
                    <div class="wiz-nav-row">
                        <button class="wiz-btn wiz-fantasma" id="wiz-nav-rivedi">← Rivedi dall'inizio</button>
                        <div style="flex:1;"></div>
                        ${azioneArchivio}
                    </div>
                `;
            }

