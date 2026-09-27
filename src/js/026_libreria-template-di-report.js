            // ===================== LIBRERIA TEMPLATE DI REPORT =====================
            const modalReportTemplatesOverlay = document.getElementById('modalReportTemplatesOverlay');
            const modalReportTemplates = document.getElementById('modalReportTemplates');
            const btnCloseReportTemplatesX = document.getElementById('btnCloseReportTemplatesX');
            const btnCloseReportTemplates = document.getElementById('btnCloseReportTemplates');
            const reportTemplatesList = document.getElementById('reportTemplatesList');

            /** Quanto pesa in altezza ogni tipo di blocco nella miniatura di riga. Serve a far
             * somigliare la miniatura al foglio vero: un grafico stratigrafico occupa davvero
             * mezza pagina, un divisore quasi niente. Senza pesi, ogni template avrebbe la stessa
             * faccia e la miniatura mentirebbe — che è l'unico modo in cui può fallire. */
            const PESO_MINIATURA_BLOCCO = {
                'grafico-stratigrafia': 3.2, 'tabella-colpi': 3, 'tabella-dettagliata-parametri': 2.8,
                'tabella-riepilogo-parametri': 2.4, 'foto-prove': 2.2, 'inquadramento': 2,
                'dati-prova': 1.8, 'allegato-formula': 1.6, 'testo': 1.2, 'divisore': 0.35
            };
            /** Miniatura di un template di PAGINA, disegnata dalle sue righe/blocchi veri (prima
             * pagina): tante strisce quante sono le righe, divise in orizzontale secondo i colSpan.
             * Il foglio dietro compare solo sui template a più pagine — così "5 pagine" si vede,
             * oltre che leggersi. */
            function miniaturaTemplatePaginaHtml(tpl) {
                const pagine = Array.isArray(tpl.pages) ? tpl.pages : [];
                const prima = pagine[0];
                const righe = (prima && Array.isArray(prima.rows)) ? prima.rows.filter(r => r.blocks && r.blocks.length) : [];
                const corpo = righe.length
                    ? righe.map(r => {
                        const peso = Math.max.apply(null, r.blocks.map(b => PESO_MINIATURA_BLOCCO[b.type] || 1.5));
                        return `<div style="display:flex; gap:2px; flex:${peso.toFixed(2)}; min-height:2px;">`
                            + r.blocks.map(b => `<div class="tpl-riga-blk" style="flex:${Math.max(0.4, Number(b.colSpan) || 1)};"></div>`).join('')
                            + `</div>`;
                    }).join('')
                    : `<div class="tpl-riga-blk" style="flex:1; opacity:.35;"></div>`;
                return `${pagine.length > 1 ? '<div class="tpl-riga-thumb-dietro"></div>' : ''}<div class="tpl-riga-thumb">${corpo}</div>`;
            }
            /** Miniatura di un template di INDICE: quattro voci finte disegnate con le scelte vere
             * del template — rientri per livello, guida (puntini/linea/niente), numerazione a
             * sinistra, numero di pagina a destra. */
            function miniaturaTemplateIndiceHtml(tpl) {
                const st = Object.assign(stileIndiceDiDefault(), tpl || {});
                const conGuida = st.divisore === 'punti' || st.divisore === 'puntiRadi' || st.divisore === 'trattini';
                const conLinea = st.divisore === 'linea' || st.divisore === 'lineaTutti';
                const livelli = [1, 1, 2, 3];
                const righe = livelli.map((liv, i) => {
                    const chiave = liv === 1 ? 'h1' : (liv === 2 ? 'h2' : 'h3');
                    const rientro = st.gutter ? 0 : Math.min(9, Math.round((st.livelli[chiave].rientroMm || 0) * 0.55));
                    const bordo = (conLinea && (st.divisore === 'lineaTutti' || liv === 1)) ? 'border-bottom:1px solid #a99e88; padding-bottom:1.5px;' : '';
                    return `<div class="tpl-riga-idxr" style="padding-left:${rientro}px; ${bordo}">`
                        + (st.gutter ? '<u></u>' : '')
                        + `<i style="${conGuida ? 'background:none; border-bottom:1px dotted #a99e88; height:3px;' : ''}"></i>`
                        + (st.mostraPagina ? '<b></b>' : '')
                        + `</div>`;
                }).join('');
                return `<div class="tpl-riga-thumb" style="gap:3.5px;">
                    <div class="tpl-riga-blk" style="height:3px; width:58%; background:#8a7f6b; flex:0 0 auto;"></div>
                    ${righe}
                </div>`;
            }

            /** Menù azioni di una riga (duplica/rinomina/elimina): uno solo per tutta la modale,
             * ricostruito ad ogni apertura. Le azioni rare stanno qui SCRITTE invece che in una
             * fila di icone da indovinare, e l'eliminazione non è più a portata di pollice. */
            let kebabAzioniTemplateAperto = null;
            function chiudiMenuAzioniTemplate() {
                const menu = document.getElementById('menuAzioniTemplate');
                if (menu) menu.classList.remove('open');
                if (kebabAzioniTemplateAperto) kebabAzioniTemplateAperto.classList.remove('aperto');
                kebabAzioniTemplateAperto = null;
            }
            function apriMenuAzioniTemplate(kebab, voci) {
                const menu = document.getElementById('menuAzioniTemplate');
                if (!menu) return;
                const eraQuesto = kebabAzioniTemplateAperto === kebab;
                chiudiMenuAzioniTemplate();
                if (eraQuesto) return; // secondo tocco sullo stesso bottone: chiude e basta
                menu.innerHTML = voci.map((v, i) => v.separatore
                    ? '<div class="tpl-riga-menu-sep"></div>'
                    : `<button type="button" data-voce="${i}" class="${v.pericolo ? 'pericolo' : ''}"><svg class="ico" style="width:16px; height:16px;"><use href="#${v.icona}"/></svg>${v.etichetta}</button>`).join('');
                menu.querySelectorAll('button[data-voce]').forEach(b => {
                    b.addEventListener('click', () => {
                        const voce = voci[Number(b.dataset.voce)];
                        chiudiMenuAzioniTemplate();
                        if (voce && voce.azione) voce.azione();
                    });
                });
                menu.classList.add('open');
                kebab.classList.add('aperto');
                kebabAzioniTemplateAperto = kebab;
                // Posizionato sul bottone che l'ha aperto, ripiegando in alto o a destra quando
                // non ci starebbe: la riga può stare in fondo a un elenco che scorre.
                const r = kebab.getBoundingClientRect();
                let left = r.right - menu.offsetWidth;
                let top = r.bottom + 6;
                if (top + menu.offsetHeight > window.innerHeight - 8) top = Math.max(8, r.top - menu.offsetHeight - 6);
                menu.style.left = Math.max(8, left) + 'px';
                menu.style.top = top + 'px';
            }
            document.addEventListener('click', (e) => {
                if (!kebabAzioniTemplateAperto) return;
                const menu = document.getElementById('menuAzioniTemplate');
                if (menu && menu.contains(e.target)) return;
                if (kebabAzioniTemplateAperto.contains(e.target)) return;
                chiudiMenuAzioniTemplate();
            });

            /** Elenco ordinato dei template: "Classico" sempre primo, poi gli altri per nome. */
            function elencoTemplateReportOrdinato() {
                const all = Object.values(state.reportTemplates || {});
                return all.sort((a, b) => {
                    if (a.id === 'classico') return -1;
                    if (b.id === 'classico') return 1;
                    return (a.name || '').localeCompare(b.name || '');
                });
            }

            // popolaSelettoreTemplateReport RIMOSSA insieme alla tendina #selReportTemplate che
            // riempiva: quell'elemento non esiste più nella pagina, quindi la funzione usciva
            // subito alla prima riga ed era un guscio vuoto richiamato da sei punti diversi. Il
            // template da usare si sceglie ora nella schermata di esportazione PDF, che scrive
            // direttamente surv.reportTemplateId (vedi avviaGenerazioneEsportazionePdf).

            function openReportTemplatesModal() {
                renderReportTemplatesList();
                if (typeof renderIndiceTemplatesList === 'function') renderIndiceTemplatesList();
                if (modalReportTemplatesOverlay) modalReportTemplatesOverlay.classList.add('open');
                if (modalReportTemplates) modalReportTemplates.classList.add('open');
            }
            function closeReportTemplatesModal() {
                chiudiMenuAzioniTemplate();
                if (modalReportTemplatesOverlay) modalReportTemplatesOverlay.classList.remove('open');
                if (modalReportTemplates) modalReportTemplates.classList.remove('open');
                // Il selettore nella modale di export potrebbe dover riflettere un template appena
                // creato/rinominato/eliminato mentre questa modale era aperta sopra di essa.
            }
            // "Nuovo vuoto" (richiesto esplicitamente, alternativa a "Duplica"): crea il template e
            // apre SUBITO l'editor su di esso, invece di lasciarlo nell'elenco da dover riaprire con
            // un secondo tocco — appena creato non c'è comunque altro da fare se non iniziare subito
            // a comporlo.
            const btnNewEmptyReportTemplate = document.getElementById('btnNewEmptyReportTemplate');
            if (btnNewEmptyReportTemplate) {
                // async/await: creaTemplateVuoto chiede ora il nome con il dialogo dell'app
                // (appPrompt) invece del prompt() nativo, quindi ritorna una Promise.
                btnNewEmptyReportTemplate.addEventListener('click', async () => {
                    const newId = await creaTemplateVuoto();
                    if (!newId) return; // annullato nella richiesta del nome: nessun template creato
                    if (typeof apriTemplateEditor === 'function') apriTemplateEditor(newId);
                });
            }

            /** Backup dei template di report (richiesto esplicitamente): un file JSON scaricabile
             * con tutti i template PERSONALIZZATI (non "Classico", che è predefinito/hardcoded e non
             * porterebbe alcun dato utente) — stesso identico pattern già usato per il backup globale
             * dell'archivio (vedi exportGlobalJSONBackup), solo con un payload più mirato. */
            function esportaBackupTemplateReport() {
                try {
                    const daEsportare = {};
                    Object.values(state.reportTemplates || {}).forEach(t => {
                        if (!t.builtIn) daEsportare[t.id] = t;
                    });
                    if (Object.keys(daEsportare).length === 0) {
                        alert('Non ci sono template personalizzati da esportare (solo "Classico", predefinito).');
                        return;
                    }
                    const backupData = {
                        version: '1.0',
                        exportedAt: new Date().toISOString(),
                        app: 'DPSH Field Collector - Template di Report',
                        versioneApp: APP_VERSIONE,
                        reportTemplates: daEsportare
                    };
                    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `DPSH_Template_Report_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate([40, 60]);
                } catch (e) {
                    alert('Errore durante l\'esportazione del backup: ' + e.message);
                }
            }
            /** Importa da un file di backup: SEMPRE come template NUOVI (id rigenerati), mai
             * sovrascrivendo quelli esistenti — così un'importazione non può mai far perdere lavoro
             * già fatto, nemmeno se il file importato contiene template con lo stesso id/nome. */
            function importaBackupTemplateReport(file) {
                if (!file) return;
                const reader = new FileReader();
                reader.onload = async (e) => {
                    try {
                        const imported = JSON.parse(e.target.result);
                        const daImportare = imported && imported.reportTemplates;
                        if (!daImportare || typeof daImportare !== 'object' || Object.keys(daImportare).length === 0) {
                            alert('Il file selezionato non è un backup valido di template di report.');
                            return;
                        }
                        const nomi = Object.values(daImportare).map(t => t.name || 'Senza nome');
                        if (!await appConfirm(`Importare ${nomi.length} template (${nomi.join(', ')})? Verranno aggiunti come nuovi, senza toccare quelli già presenti.`)) return;
                        Object.values(daImportare).forEach(t => {
                            const newId = 'tpl_' + Date.now() + '_' + Math.round(Math.random() * 1000);
                            // updatedAt segna QUESTO import, non quello del file di origine (che
                            // può venire da un'altra installazione con un orologio tutto suo):
                            // "modificato il" nella lista deve riflettere quando è arrivato qui.
                            state.reportTemplates[newId] = Object.assign({}, t, { id: newId, builtIn: false, createdAt: Date.now(), updatedAt: Date.now(), exportCount: 0 });
                        });
                        saveState();
                        renderReportTemplatesList();
                        mostraToast(`${nomi.length === 1 ? 'Importato 1 template' : 'Importati ' + nomi.length + ' template'}`);
                        triggerVibrate([50, 50, 50]);
                    } catch (err) {
                        alert('Impossibile leggere il file: ' + err.message);
                    }
                };
                reader.readAsText(file);
            }
            const btnExportReportTemplates = document.getElementById('btnExportReportTemplates');
            if (btnExportReportTemplates) btnExportReportTemplates.addEventListener('click', esportaBackupTemplateReport);
            const btnImportReportTemplates = document.getElementById('btnImportReportTemplates');
            const inputImportReportTemplates = document.getElementById('inputImportReportTemplates');
            if (btnImportReportTemplates && inputImportReportTemplates) {
                btnImportReportTemplates.addEventListener('click', () => inputImportReportTemplates.click());
                inputImportReportTemplates.addEventListener('change', (e) => {
                    const file = e.target.files && e.target.files[0];
                    importaBackupTemplateReport(file);
                    inputImportReportTemplates.value = '';
                });
            }
            if (btnCloseReportTemplatesX) btnCloseReportTemplatesX.addEventListener('click', closeReportTemplatesModal);
            if (btnCloseReportTemplates) btnCloseReportTemplates.addEventListener('click', closeReportTemplatesModal);
            if (modalReportTemplatesOverlay) modalReportTemplatesOverlay.addEventListener('click', closeReportTemplatesModal);
            // Scorciatoia diretta dall'header di Home, senza dover prima aprire l'export di una prova.
            const btnOpenReportTemplatesHome = document.getElementById('btnOpenReportTemplatesHome');
            if (btnOpenReportTemplatesHome) btnOpenReportTemplatesHome.addEventListener('click', openReportTemplatesModal);

            /** Nessun altro template (a parte se stesso, per la rinomina) ha già questo nome —
             * confronto senza distinguere maiuscole/minuscole e spazi ai bordi, così "Report" e
             * "report " non passano per due nomi diversi. */
            function nomeTemplateGiaEsistente(nome, escludiId) {
                const n = (nome || '').trim().toLowerCase();
                return Object.values(state.reportTemplates).some(t => t.id !== escludiId && (t.name || '').trim().toLowerCase() === n);
            }
            /** Prossimo nome libero con un numero incrementale in coda ("Nome (2)", "Nome (3)"...).
             * Se il nome di partenza ha già un "(N)" finale lo toglie prima, così rinominare
             * automaticamente due volte di fila dà "Nome (2)" poi "Nome (3)", non "Nome (2) (2)". */
            function prossimoNomeTemplateDisponibile(base) {
                const radice = base.replace(/\s*\(\d+\)\s*$/, '');
                let n = 2, candidato;
                do { candidato = `${radice} (${n})`; n++; } while (nomeTemplateGiaEsistente(candidato));
                return candidato;
            }
            /** Richiesto esplicitamente: mai due template con lo stesso nome. Chiamata SUBITO DOPO
             * l'appPrompt che chiede il nome in ognuno dei 4 punti che ne creano/rinominano uno —
             * se il nome proposto collide, offre tre strade (avviso "nome già in uso, richiesto
             * esplicitamente): rinomina automatica con un numero incrementale, scegli un altro nome
             * (ri-prompt, ricontrolla anche quello), oppure annulla del tutto. Ritorna il nome
             * finale da usare, o null se l'utente ha rinunciato in uno qualunque dei due modi. */
            async function risolviCollisioneNomeTemplate(nomeProposto, escludiId) {
                let nome = nomeProposto.trim();
                while (nomeTemplateGiaEsistente(nome, escludiId)) {
                    const scelta = await appDialog(
                        `Esiste già un template chiamato "${nome}".`,
                        { confirm: true, title: 'Nome già in uso',
                          okLabel: 'Rinomina automaticamente', extraLabel: 'Scegli un altro nome', cancelLabel: 'Annulla' }
                    );
                    if (scelta === true) return prossimoNomeTemplateDisponibile(nome);
                    if (scelta === 'extra') {
                        const nuovo = await appPrompt('', nome, { title: 'Nuovo nome', label: 'Nome del template', okLabel: 'Continua' });
                        if (!nuovo || !nuovo.trim()) return null; // rinuncia dentro al re-prompt = annulla tutto
                        nome = nuovo.trim();
                        continue; // ricontrolla il nuovo nome: potrebbe collidere a sua volta
                    }
                    return null; // "Annulla"
                }
                return nome;
            }

            /** Duplica un template esistente: per ora una copia con nome proprio ma contenuto
             * identico (stesso "pages" — null per Classico = layout storico hardcoded). La vera
             * personalizzazione (riposizionare/ridimensionare i blocchi) arriva con l'editor a
             * griglia; nel frattempo questo permette comunque di avere varianti nominate assegnabili
             * prova per prova, pronte per essere modificate quando l'editor sarà disponibile. */
            async function duplicaTemplateReport(sourceId) {
                const source = state.reportTemplates[sourceId];
                if (!source) return;
                // Nome richiesto esplicitamente all'utente invece di assegnarlo automaticamente
                // (richiesto: "quando creo un nuovo template deve chiedermi il nome che voglio
                // assegnargli"). appPrompt al posto del prompt() nativo: quest'ultimo è soppresso da
                // alcuni browser in modalità standalone/PWA, e lì la creazione di un template
                // diventava impossibile senza alcun messaggio. Annullare annulla la creazione:
                // nessun template a metà.
                let nome = await appPrompt('', `Copia di ${source.name}`, { title: 'Duplica template', label: 'Nome del nuovo template', okLabel: 'Crea' });
                if (!nome || !nome.trim()) return null;
                nome = await risolviCollisioneNomeTemplate(nome.trim());
                if (nome === null) return null;
                const newId = 'tpl_' + Date.now();
                const ora = Date.now();
                state.reportTemplates[newId] = {
                    id: newId,
                    name: nome,
                    builtIn: false,
                    pages: source.pages ? JSON.parse(JSON.stringify(source.pages)) : null,
                    createdAt: ora,
                    updatedAt: ora
                };
                saveState();
                renderReportTemplatesList();
                return newId;
            }

            /** Nuovo template completamente VUOTO (richiesto esplicitamente, come alternativa a
             * "Duplica" da un template esistente): una sola pagina senza righe/blocchi, invece del
             * layout Classico precompilato — l'utente compone da zero. `pages` è già un array (non
             * null/vuoto) apposta per NON far scattare il seed automatico del layout Classico che
             * apriTemplateEditor userebbe altrimenti per un template senza pagine (vedi
             * seedPaginaDefaultClassico). */
            async function creaTemplateVuoto() {
                // Nome richiesto esplicitamente all'utente (vedi stesso motivo/pattern in
                // duplicaTemplateReport qui sopra) invece del vecchio "Nuovo template" fisso.
                // Annullare la richiesta annulla la creazione: il chiamante (vedi
                // btnNewEmptyReportTemplate) non deve aprire l'editor se torna null.
                let nome = await appPrompt('', 'Nuovo template', { title: 'Nuovo template', label: 'Nome del nuovo template', okLabel: 'Crea' });
                if (!nome || !nome.trim()) return null;
                nome = await risolviCollisioneNomeTemplate(nome.trim());
                if (nome === null) return null;
                const newId = 'tpl_' + Date.now();
                const ora = Date.now();
                state.reportTemplates[newId] = {
                    id: newId,
                    name: nome,
                    builtIn: false,
                    pages: [nuovaPaginaVuota()],
                    createdAt: ora,
                    updatedAt: ora
                };
                saveState();
                renderReportTemplatesList();
                return newId;
            }

            async function rinominaTemplateReport(id) {
                const tpl = state.reportTemplates[id];
                if (!tpl || tpl.builtIn) return;
                // appDialog ora sa gestire anche i campi di testo (vedi l'opzione "fields" e
                // appPrompt): il prompt() nativo non serve più in nessun punto dell'app.
                let nuovoNome = await appPrompt('', tpl.name, { title: 'Rinomina template', label: 'Nome del template', okLabel: 'Rinomina' });
                if (!nuovoNome || !nuovoNome.trim()) return;
                nuovoNome = await risolviCollisioneNomeTemplate(nuovoNome.trim(), id);
                if (nuovoNome === null) return;
                tpl.name = nuovoNome;
                tpl.updatedAt = Date.now();
                saveState();
                renderReportTemplatesList();
            }

            async function eliminaTemplateReport(id) {
                const tpl = state.reportTemplates[id];
                if (!tpl || tpl.builtIn) return;
                const ok = await appConfirm(`Eliminare il template "${tpl.name}"? Le prove che lo usano torneranno automaticamente al template Classico.`);
                if (!ok) return;
                // Backup profondo PRIMA di cancellare (richiesto esplicitamente: "il classico
                // messaggio di 10 secondi che permette di annullare" — stesso schema già usato per
                // l'eliminazione di progetti/prove, vedi performDeleteProject/showUndoBanner).
                const backup = JSON.parse(JSON.stringify(tpl));
                delete state.reportTemplates[id];
                // Nessuna prova deve restare orfana di un template inesistente: quella che puntava
                // a quello eliminato torna semplicemente al fallback "classico" (getReportTemplateIdPerProva
                // già lo fa automaticamente al render, ma qui aggiorniamo anche lo stato esplicito
                // della prova attiva se necessario).
                if (state.reportTemplateId === id) state.reportTemplateId = null;
                saveState();
                renderReportTemplatesList();
                showUndoBanner(`Template "${tpl.name}" eliminato`, () => {
                    state.reportTemplates[id] = backup;
                    saveState();
                    renderReportTemplatesList();
                });
            }

            function renderReportTemplatesList() {
                if (!reportTemplatesList) return;
                chiudiMenuAzioniTemplate();
                // «In uso su questa prova» ha senso solo con una prova aperta davanti (Vista Prova, o
                // Esporta PDF da lì). Dalla Home non c'è nessuna «questa prova»: lì non si dice (Fase 3).
                const conProvaAperta = !!(state.uiState && state.uiState.currentView === 'field');
                const attuale = conProvaAperta ? (state.reportTemplateId || 'classico') : null;
                reportTemplatesList.innerHTML = elencoTemplateReportOrdinato().map(t => {
                    const isAttuale = t.id === attuale;
                    return `
                        <div style="display:flex; align-items:center; gap:10px; background:${t.builtIn ? 'var(--bg-sunken)' : (isAttuale ? 'var(--accent-soft)' : 'var(--bg-main)')}; border:1px solid ${isAttuale ? 'var(--accent)' : (t.builtIn ? 'var(--border-strong)' : 'var(--border)')}; border-style:${t.builtIn ? 'dashed' : 'solid'}; border-radius:var(--radius-sm); padding:9px 10px;">
                            <button type="button" class="tpl-riga-thumb-wrap tpl-report-modifica" data-tpl-id="${t.id}" title="Apri il layout di &quot;${t.name}&quot;">${miniaturaTemplatePaginaHtml(t)}</button>
                            <div style="flex:1; min-width:0;">
                                <div style="display:flex; align-items:center; gap:5px; font-weight:700; font-size:13px; color:var(--text-main); overflow:hidden;">
                                    ${t.builtIn ? `<svg class="ico" style="width:12px; height:12px; color:var(--text-muted); flex-shrink:0;" title="Non rinominabile né eliminabile"><use href="#i-lock"/></svg>` : ''}
                                    <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${t.name}</span>
                                </div>
                                <!-- "Predefinito"/"Personalizzato" tolti (segnalato esplicitamente: con un
                                     solo template davvero predefinito, quella parola su ogni riga non
                                     distingueva niente — lo distingue già il lucchetto sopra e il bordo
                                     tratteggiato). "Copia del layout Classico" resta: quella dice
                                     davvero qualcosa (il template non ha ancora un proprio layout). -->
                                <div style="font-size:12px; color:var(--text-muted); margin-top:1px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${(!t.builtIn && !t.pages) ? 'Copia del layout Classico' : ''}${Array.isArray(t.pages) && t.pages.length ? `${(!t.builtIn && !t.pages) ? ' · ' : ''}${t.pages.length} pagin${t.pages.length === 1 ? 'a' : 'e'}` : ''}${isAttuale ? ' · in uso su questa prova' : ''}${t.updatedAt ? ` · modificato il ${dataBreve(t.updatedAt)}` : ''}${t.exportCount ? ` · usato ${t.exportCount} volt${t.exportCount === 1 ? 'a' : 'e'} in esportazione` : ''}</div>
                            </div>
                            <button type="button" class="tpl-riga-primaria tpl-report-modifica" data-tpl-id="${t.id}"><svg class="ico"><use href="#i-layout-pagina"/></svg>Layout</button>
                            <button type="button" class="tpl-riga-kebab tpl-report-azioni" data-tpl-id="${t.id}" title="Altre azioni"><svg class="ico"><use href="#i-more"/></svg></button>
                        </div>
                    `;
                }).join('');

                reportTemplatesList.querySelectorAll('.tpl-report-modifica').forEach(btn => {
                    btn.addEventListener('click', () => { if (typeof apriTemplateEditor === 'function') apriTemplateEditor(btn.dataset.tplId); });
                });
                reportTemplatesList.querySelectorAll('.tpl-report-azioni').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const id = btn.dataset.tplId;
                        const t = state.reportTemplates[id];
                        if (!t) return;
                        const voci = [{ icona: 'i-duplica', etichetta: 'Duplica', azione: () => duplicaTemplateReport(id) }];
                        if (!t.builtIn) {
                            voci.push({ icona: 'i-rinomina', etichetta: 'Rinomina', azione: () => rinominaTemplateReport(id) });
                            voci.push({ separatore: true });
                            voci.push({ icona: 'i-trash', etichetta: 'Elimina', pericolo: true, azione: () => eliminaTemplateReport(id) });
                        }
                        apriMenuAzioniTemplate(btn, voci);
                    });
                });
            }

