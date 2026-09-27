            // ===== AVVISI CHE NON RESTANO INDIETRO =====
            // Segnalato: "il tasto dividi compare anche quando il conflitto è già stato risolto
            // dall'utente" e "divide male, mettendo sezioni da sole su una pagina".
            // Stessa causa per entrambi: la misurazione degli avvisi è pesante (un iframe di stampa
            // per blocco) e gira in background senza essere attesa, mentre il menu la LEGGE al
            // momento in cui si apre. Siccome ogni modifica ricostruisce il menu subito dopo il
            // render, il menu mostrava sistematicamente i numeri di PRIMA della modifica: l'avviso
            // già risolto restava lì, e "dividi" calcolava i tagli su millimetri vecchi — per
            // esempio quelli precedenti alla riduzione del carattere, quindi tagliando più del
            // necessario. Ora quando la misura arriva, se cambia qualcosa, il menu si riallinea.
            function idBloccoMenuAperto() {
                const menu = document.getElementById('templateEditorBlockMenu');
                return menu ? (menu.dataset.blockId || null) : null;
            }
            /** Impronta dei numeri misurati per un blocco: serve a NON ricostruire il menu quando
             * la misurazione conferma quello che c'era già (il caso più frequente). */
            function firmaMisureBlocco(id) {
                if (!id) return null;
                const avvisi = (templateEditorState.avvisiOverflowPerBlocco || {})[id] || [];
                const misure = (templateEditorState.mmCategoriePerBlocco || {})[id] || null;
                try { return JSON.stringify([avvisi, misure]); } catch (e) { return null; }
            }
            function riallineaMenuBloccoAMisureNuove(id, firmaPrima) {
                if (!id) return;
                const menu = document.getElementById('templateEditorBlockMenu');
                if (!menu || menu.dataset.blockId !== id) return;
                // Mai in mezzo a un gesto: ricostruire il menu mentre un dito tiene premuto uno
                // slider glielo toglierebbe da sotto. Al prossimo rilascio si riallinea comunque.
                if (menu.classList.contains('in-regolazione')) return;
                if (firmaMisureBlocco(id) === firmaPrima) return;
                apriMenuBloccoEditor(id);
            }

            // ===== LA DIVISIONE AUTOMATICA SI RIFÀ QUANDO CAMBIANO LE MISURE =====
            // Richiesto: "appena l'utente modifica queste impostazioni [altezza righe, carattere],
            // se quel tasto è stato premuto, si accorge della modifica e ricalcola in automatico".
            //
            // Serve distinguere i MIEI tagli dai TUOI: blk.tagliAutomatici tiene traccia di quelli
            // inseriti dal tasto. Al ricalcolo si tolgono solo quelli e si rifanno; le interruzioni
            // messe a mano restano dove sono e continuano a delimitare i gruppi, perché sono
            // decisioni di contenuto, non di spazio.
            //
            // Sul rischio di rincorsa infinita (questo file ne ha già viste): il ricalcolo scrive
            // solo se il risultato è DIVERSO da quello attuale. Le misure cambiano solo per una
            // modifica dell'utente, quindi il giro è: modifica → misura → ricalcolo → misura →
            // stesso risultato → stop. Converge in un passaggio e si ferma da solo.
            /** Tagli ottimali e numero di pagine per un blocco, date le sue misure.
             * Fonte unica per "quante pagine viene": la usano sia il ricalcolo automatico sia la
             * condensazione, che altrimenti potrebbero contare in due modi diversi. */
            function tagliEPaginePerBlocco(blk, mmPerCategoria, limiteMm) {
                const numCategorie = elencoCategorieBlocco(blk.type).length;
                if (numCategorie === 0 || !(limiteMm > 0)) return { tagli: [], pagine: 1 };
                const mmDi = (i) => {
                    const v = mmPerCategoria[i];
                    return (typeof v === 'number' && isFinite(v)) ? v : 0;
                };
                const automatici = Array.isArray(blk.tagliAutomatici) ? blk.tagliAutomatici : [];
                const tutti = Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : [];
                const manuali = tutti.filter(i => !automatici.includes(i));
                const gruppi = [];
                let inizio = 0;
                for (let i = 1; i < numCategorie; i++) {
                    if (manuali.includes(i)) { gruppi.push([inizio, i - 1]); inizio = i; }
                }
                gruppi.push([inizio, numCategorie - 1]);
                const tagli = [];
                gruppi.forEach(([da, a]) => {
                    const indici = [];
                    for (let i = da; i <= a; i++) indici.push(i);
                    suddividiGruppoCategorie(indici, mmDi, limiteMm).tagli.forEach(t => tagli.push(t));
                });
                // Pagine = gruppi delimitati da tagli manuali + tagli automatici, +1 per la prima.
                return { tagli, pagine: manuali.length + tagli.length + 1 };
            }

            /** Cerca le impostazioni di dimensione più CONSERVATIVE che facciano stare il blocco
             * nel minor numero di pagine possibile.
             *
             * Richiesto: "mettendo l'altezza al minimo e diminuendo di poco il font si dovrebbe
             * riuscire a farla stare in 3 pagine — però questo è come ho sempre fatto io. Fai in
             * modo che lo possa fare il più condensato possibile".
             *
             * Ogni candidato viene MISURATO DAVVERO (stesso iframe di stampa del motore di export),
             * non stimato: l'altezza di una riga non è una funzione lineare della scala, e un
             * numero stimato qui sarebbe una promessa che la stampa non mantiene. Il prezzo è che
             * ogni tentativo costa una misurazione, quindi i tentativi sono pochi e in un ordine
             * preciso: prima si abbassano le righe (non tocca la leggibilità del testo), e solo se
             * non basta si riduce il carattere — che è l'ordine in cui lo fai a mano.
             * Fra due impostazioni che danno lo stesso numero di pagine vince la MENO aggressiva:
             * condensare più del necessario è un danno, non un servizio.
             */
            async function condensaBloccoPerPagineMinime(blk) {
                if (!blk || !BLOCCHI_FLOWABLE.has(blk.type)) return null;
                // Scale di ricerca. Le righe arrivano al minimo consentito (40%), il carattere
                // scende fino al 70% — su una base misurata di ~8,3pt sono circa 5,8pt, quindi la
                // scala copre i 6,7pt che usi a mano. Restano 5+6 = 11 misurazioni al massimo.
                const passiRiga = [1, 0.85, 0.7, 0.55, 0.4];
                const passiFont = [0.95, 0.9, 0.85, 0.8, 0.75, 0.7];
                const prova = async (rigaScale, fontScale) => {
                    const candidato = Object.assign({}, blk, { rigaScale, fontScale });
                    const esito = await calcolaAvvisiOverflowGruppiCategoria(candidato);
                    if (!esito || !(esito.limiteMm > 0)) return null;
                    const { pagine, tagli } = tagliEPaginePerBlocco(candidato, esito.mmPerCategoria, esito.limiteMm);
                    // MINIMO TEORICO: quanta carta chiede il contenuto in tutto, diviso una pagina.
                    // È il numero di pagine che servirebbero se le categorie si potessero spezzare
                    // ovunque. Se le pagine reali sono di più, la differenza è spazio SPRECATO ai
                    // confini fra categorie — ed è esattamente il sintomo segnalato ("molte
                    // categorie da sole quando ci sarebbe tutto lo spazio"). Confrontare i due
                    // numeri è l'unico modo per capire se a sbagliare è la divisione o la misura,
                    // e va mostrato invece di tenerlo per sé.
                    let mmTotali = 0;
                    Object.keys(esito.mmPerCategoria).forEach(k => {
                        const v = esito.mmPerCategoria[k];
                        if (typeof v === 'number' && isFinite(v)) mmTotali += v;
                    });
                    const pagineTeoriche = Math.max(1, Math.ceil(mmTotali / esito.limiteMm - 1e-9));
                    return { rigaScale, fontScale, pagine, tagli, pagineTeoriche, mmTotali, limiteMm: esito.limiteMm };
                };
                let migliore = null;
                const considera = (r) => {
                    if (!r) return;
                    // "Meno aggressiva" = somma delle due scale più alta, a parità di pagine.
                    if (!migliore || r.pagine < migliore.pagine
                        || (r.pagine === migliore.pagine && (r.rigaScale + r.fontScale) > (migliore.rigaScale + migliore.fontScale))) {
                        migliore = r;
                    }
                };
                for (const r of passiRiga) {
                    const esito = await prova(r, blk.fontScale || 1);
                    considera(esito);
                    // Si smette di stringere appena le pagine reali coincidono col minimo teorico:
                    // da lì in poi si schiaccerebbe il documento senza guadagnare un foglio.
                    if (esito && esito.pagine <= esito.pagineTeoriche) break;
                }
                if (migliore && migliore.pagine > migliore.pagineTeoriche) {
                    for (const fo of passiFont) {
                        const esito = await prova(migliore.rigaScale, fo);
                        considera(esito);
                        if (esito && esito.pagine <= esito.pagineTeoriche) break;
                    }
                }
                return migliore;
            }

            let ricalcoloDivisioneInCorso = false;
            /** @returns {boolean} true se ha cambiato qualcosa (e quindi serve un nuovo render) */
            function riapplicaDivisioneAutomatica(blk) {
                if (!blk || !Array.isArray(blk.tagliAutomatici) || blk.tagliAutomatici.length === 0) return false;
                // LA CORREZIONE A MANO VINCE. Appena tocchi le interruzioni di questo blocco —
                // ne aggiungi una, ne togli una — l'automatismo si mette da parte e non rifà più i
                // conti da solo (richiesto: "devi darmi la possibilità di correggere manualmente,
                // perché ogni tanto fa i capricci"). Senza questa regola l'automatismo, al primo
                // ricalcolo, rimetterebbe i tagli dove dice lui e cancellerebbe la tua sistemazione:
                // il modo più sicuro per rendere odioso un aiuto. Si riattiva premendo di nuovo il
                // tasto, che è una richiesta esplicita e quindi non sorprende nessuno.
                if (blk.divisioneAutomaticaSospesa) return false;
                const misure = (templateEditorState.mmCategoriePerBlocco || {})[blk.id];
                if (!misure || !misure.perCategoria || !(misure.limiteMm > 0)) return false;
                const numCategorie = elencoCategorieBlocco(blk.type).length;
                if (numCategorie === 0) return false;
                const tuttiAttuali = Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : [];
                const automaticiVecchi = blk.tagliAutomatici;
                const manuali = tuttiAttuali.filter(i => !automaticiVecchi.includes(i));
                // I tagli manuali delimitano i gruppi: dentro ciascuno si ricalcola il riempimento.
                // Il calcolo è quello condiviso con la condensazione, così le due non possono
                // arrivare a due idee diverse di "dove va tagliato".
                const automaticiNuovi = tagliEPaginePerBlocco(blk, misure.perCategoria, misure.limiteMm).tagli;
                const uguali = automaticiNuovi.length === automaticiVecchi.length
                    && automaticiNuovi.every(i => automaticiVecchi.includes(i));
                if (uguali) return false;
                blk.categorieForzaPaginaPrima = manuali.concat(automaticiNuovi).sort((x, y) => x - y);
                blk.tagliAutomatici = automaticiNuovi;
                return true;
            }
            /** Passa su tutti i blocchi flowable con una divisione automatica attiva. */
            function riapplicaDivisioniAutomaticheTemplate() {
                if (ricalcoloDivisioneInCorso) return false;
                if (!templateEditorState || !Array.isArray(templateEditorState.pages)) return false;
                ricalcoloDivisioneInCorso = true;
                let cambiato = false;
                try {
                    templateEditorState.pages.forEach(page => (page.rows || []).forEach(row => (row.blocks || []).forEach(entry => {
                        if (entry.stack || !BLOCCHI_FLOWABLE.has(entry.type)) return;
                        if (riapplicaDivisioneAutomatica(entry)) cambiato = true;
                    })));
                } finally {
                    ricalcoloDivisioneInCorso = false;
                }
                return cambiato;
            }

            /** Nasconde il popover pieno e mostra al suo posto una bollicina tonda (stessa
             * posizione, angolo o punto in cui l'utente l'aveva trascinato) — un tap la riapre
             * intera. A differenza di chiudiMenuBloccoEditor NON deseleziona il blocco né stacca
             * l'ascoltatore "click fuori": quello resta attivo apposta, un vero tocco fuori da
             * bolla+canvas deve comunque chiudere tutto, non solo il popover pieno. */
            function collassaMenuBloccoEditor(blockId) {
                const menu = document.getElementById('templateEditorBlockMenu');
                if (menu) {
                    // Ricorda la posizione ATTUALE (anche se è quella di default, mai spostata a
                    // mano): così la bolla compare esattamente dove il popover stava, e una
                    // successiva riapertura riparte da lì invece di saltare all'angolo di default.
                    menuBloccoPosizioneManuale = { blockId, left: parseFloat(menu.style.left) || 0, top: parseFloat(menu.style.top) || 0 };
                    menu.remove();
                }
                menuBloccoCollassato = { blockId };
                mostraBollicinaMenuBlocco(blockId);
            }
            function mostraBollicinaMenuBlocco(blockId) {
                rimuoviBollicinaMenuBlocco();
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                const blk = trovaBloccoPerId(page, blockId);
                const def = (blk && REPORT_BLOCK_TYPES[blk.type]) || {};
                const bolla = document.createElement('button');
                bolla.type = 'button';
                bolla.id = 'templateEditorBlockMenuBubble';
                bolla.className = 'tpl-editor-block-menu-bubble';
                bolla.title = 'Riapri le opzioni del blocco';
                bolla.innerHTML = `<svg class="ico" style="width:20px; height:20px;"><use href="#i-${def.icon || 'file'}"/></svg>`;
                hostFloatingUiEditor().appendChild(bolla);
                const bw = 44;
                let left, top;
                if (menuBloccoPosizioneManuale && menuBloccoPosizioneManuale.blockId === blockId) {
                    left = menuBloccoPosizioneManuale.left;
                    top = menuBloccoPosizioneManuale.top;
                } else {
                    left = window.innerWidth - bw - 14;
                    top = window.innerHeight - bw - 14;
                }
                left = Math.max(8, Math.min(window.innerWidth - bw - 8, left));
                top = Math.max(8, Math.min(window.innerHeight - bw - 8, top));
                bolla.style.left = left + 'px';
                bolla.style.top = top + 'px';
                bolla.addEventListener('click', () => {
                    menuBloccoCollassato = null;
                    apriMenuBloccoEditor(blockId);
                });
            }
            function rimuoviBollicinaMenuBlocco() {
                const b = document.getElementById('templateEditorBlockMenuBubble');
                if (b) b.remove();
            }
            function gestisciClickFuoriMenuBlocco(e) {
                const menu = document.getElementById('templateEditorBlockMenu');
                const bolla = document.getElementById('templateEditorBlockMenuBubble');
                if (!menu && !bolla) return;
                if ((menu && menu.contains(e.target)) || (bolla && bolla.contains(e.target)) || e.target.closest('.tpl-editor-block-handle, .tpl-editor-block-chip')) return;
                chiudiMenuBloccoEditor();
            }
            /** "Bilancia riga" (richiesta esplicitamente, "bilanciare intorno a un blocco fisso"):
             * divide lo spazio RESTANTE di una riga in parti uguali tra i blocchi NON marcati come
             * "Larghezza fissa" (voce.larghezzaFissata) — così puoi fissare un blocco a una
             * larghezza precisa (es. una foto che deve restare a una certa proporzione) e far
             * dividere automaticamente agli altri quel che resta, invece di regolarli uno per uno.
             * I blocchi bloccati (posizioneBloccata) e i segnaposto di rowSpan (reserved) contano
             * come "fissi" per il calcolo dello spazio restante ma non vengono MAI toccati, stessa
             * garanzia del lucchetto ovunque nell'editor. Azione a comando (non automatica/continua,
             * a differenza del riflusso di pagina), annullabile come ogni altra modifica. */
            function bilanciaRigaBlocco(blockId) {
                // Pagina di ORIGINE (vedi paginaOrigineBlocco): funziona anche se il bottone è
                // stato premuto dal menu aperto su una pagina di continuazione.
                const page = paginaOrigineBlocco(blockId);
                if (!page) return;
                const voce = trovaVoceContenenteBlocco(page, blockId);
                if (!voce) return;
                const rowIdx = trovaIndiceRigaPerVoce(page, voce.id);
                if (rowIdx < 0) return;
                const row = page.rows[rowIdx];
                const cols = page.cols || 4;
                if (!row || row.blocks.length < 2) return;

                const fissi = row.blocks.filter(e => e.larghezzaFissata || e.posizioneBloccata || e.reserved);
                const liberi = row.blocks.filter(e => !e.larghezzaFissata && !e.posizioneBloccata && !e.reserved);
                if (liberi.length === 0) {
                    mostraToastTemplateEditor('Tutti i blocchi di questa riga sono fissati: niente da bilanciare');
                    return;
                }
                const pctFissi = fissi.reduce((sum, e) => sum + Math.min(cols, e.colSpan || cols) / cols * 100, 0);
                const restante = Math.max(0, 100 - pctFissi);
                if (restante <= 0.5) {
                    mostraToastTemplateEditor('I blocchi fissati occupano già tutta la riga: niente spazio da dividere');
                    return;
                }
                const pctOgnuno = restante / liberi.length;
                salvaUndoSnapshotEditor();
                // Stessa identica matematica di prima, ora condivisa con l'applicazione dei layout
                // aurei (vedi dividiLarghezzaRigaEvenmente, vicino a BLOCCHI_SENZA_SCALA): qui i due
                // controlli sopra hanno già garantito che riuscirà, quindi il valore di ritorno non
                // serve — pctOgnuno/liberi.length restano calcolati qui sopra solo per il messaggio.
                dividiLarghezzaRigaEvenmente(row, cols);
                renderTemplateEditorCanvas();
                apriMenuBloccoEditor(blockId);
                mostraToastTemplateEditor(`Riga bilanciata: ${liberi.length} blocchi a ${pctOgnuno.toFixed(0)}% ciascuno`);
            }

            /** "Riordina automatico" (richiesto esplicitamente, "proviamolo" — ma tenuto
             * DELIBERATAMENTE distinto da "Bilancia riga": qui SOLO pulizia strutturale, MAI
             * larghezze). Rimuove dalla pagina attiva: righe rimaste senza blocchi (residuo tipico
             * di spostamenti/eliminazioni — la maggior parte dei percorsi normali le rimuove già da
             * sola, questo è un passo di sicurezza per stati salvati più vecchi o casi limite) e
             * segnaposto di rowSpan "orfani" (entry.reserved il cui blocco proprietario non esiste
             * più da nessuna parte nella pagina — non dovrebbe capitare in condizioni normali, vedi
             * rimuoviRiserveRowSpan già richiamata da impostaRowSpanVoce, ma anche qui un fallback
             * di sicurezza). Rispetta SEMPRE le righe con un blocco bloccato (mai toccate, stessa
             * garanzia del lucchetto ovunque nell'editor — vedi rigaContieneBloccoBloccato). Prima
             * fa un giro di sola lettura per sapere se c'è davvero qualcosa da pulire: l'undo va
             * salvato PRIMA di mutare, ma non ha senso sporcare lo stack undo se non cambia nulla. */
            function riordinaAutomaticoPagina() {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page || !page.rows) return;

                const haRiserveOrfane = page.rows.some(row =>
                    !rigaContieneBloccoBloccato(page, row) &&
                    row.blocks.some(entry => entry.reserved && (!entry.ownerId || !trovaVoceRigaPerId(page, entry.ownerId)))
                );
                const haRigheVuote = page.rows.some(row => row.blocks.length === 0);
                if (!haRiserveOrfane && !haRigheVuote) {
                    mostraToastTemplateEditor('Pagina già in ordine: niente da pulire');
                    return;
                }

                salvaUndoSnapshotEditor();
                let riserveOrfaneRimosse = 0;
                page.rows.forEach(row => {
                    if (rigaContieneBloccoBloccato(page, row)) return;
                    for (let i = row.blocks.length - 1; i >= 0; i--) {
                        const entry = row.blocks[i];
                        if (entry.reserved && (!entry.ownerId || !trovaVoceRigaPerId(page, entry.ownerId))) {
                            row.blocks.splice(i, 1);
                            riserveOrfaneRimosse++;
                        }
                    }
                });
                let righeRimosse = 0;
                for (let i = page.rows.length - 1; i >= 0; i--) {
                    if (page.rows[i].blocks.length === 0) {
                        page.rows.splice(i, 1);
                        righeRimosse++;
                    }
                }

                renderTemplateEditorCanvas();
                renderTemplateEditorPagesStrip();
                const parti = [];
                if (righeRimosse > 0) parti.push(`${righeRimosse} riga/e vuota/e`);
                if (riserveOrfaneRimosse > 0) parti.push(`${riserveOrfaneRimosse} riserva/e orfana/e`);
                mostraToastTemplateEditor(`Pagina riordinata: rimosse ${parti.join(' e ')}`);
            }

            function apriMenuBloccoEditor(blockId) {
                /* ============ APRIRE E RICOSTRUIRE NON SONO LA STESSA COSA ============
                 * Segnalato: «per ogni azione che compio sul menu c'e' una fastidiosa animazione
                 * di rimbalzo, e lo scorrimento si azzera».
                 *
                 * Ogni comando del menu finisce con renderTemplateEditorCanvas() +
                 * apriMenuBloccoEditor(), e questa funzione ricostruiva il pannello da zero: DOM
                 * nuovo, quindi animazione d'ingresso rigiocata da capo e scrollTop a zero. Da
                 * fuori sembrava che il menu si richiudesse e riaprisse a ogni tocco — e se il
                 * comando stava in fondo a un pannello lungo, dopo averlo premuto spariva dalla
                 * vista. Un'animazione d'ingresso e' giusta quando qualcosa ENTRA; qui non
                 * entrava niente, era la stessa cosa di un istante prima.
                 *
                 * Qui si distingue: se un menu per QUESTO blocco e' gia' aperto, quella che segue
                 * e' una ricostruzione — niente animazione e scorrimento ripreso dov'era. */
                const menuPrecedente = document.getElementById('templateEditorBlockMenu');
                const eRicostruzione = !!menuPrecedente && menuPrecedente.dataset.blockId === String(blockId);
                const scorrimentoPrecedente = eRicostruzione ? {
                    menu: menuPrecedente.scrollTop,
                    // Su mobile il contenuto scorre dentro il pannello della scheda attiva, non
                    // dentro il menu: vanno ripresi tutti e due, perche' quale dei due sia quello
                    // vero dipende dalla larghezza della finestra.
                    pannello: (menuPrecedente.querySelector('.tpl-editor-menu-pannello.attiva') || {}).scrollTop || 0
                } : null;
                chiudiMenuBloccoEditor();
                // Pagina di ORIGINE del blocco (non la pagina attiva: se l'utente ha aperto il menu
                // da una pagina di continuazione, page.rows lì è sempre [] — vedi
                // paginaOrigineBlocco), così tutto il resto di questa funzione (colonne, riga
                // corrente per "Bilancia riga", ecc.) ragiona sui dati reali indipendentemente da
                // quale pagina sia visualizzata quando il menu viene aperto.
                const page = paginaOrigineBlocco(blockId);
                const blk = trovaBloccoPerId(page, blockId);
                if (!blk) return;
                const ancoraEl = document.querySelector(`.tpl-editor-stack-item[data-item-id="${blockId}"], .tpl-editor-block[data-block-id="${blockId}"]`);
                if (!ancoraEl) return;
                // Solo qui si chiede "posso regolare il carattere?": la domanda passa dall'helper,
                // non dall'insieme, perché l'insieme significa anche "blocco a righe" (vedi il
                // commento su BLOCCHI_CON_FONT_SVG). Tutti gli altri usi dell'insieme, che
                // riguardano invece riga-scale/zoom, restano com'erano.
                const haFontRegolabile = bloccoHaFontRegolabile(blk.type);
                // PUNTI VERI AL POSTO DELLA PERCENTUALE (Piano_Controlli_Font, passo 1 → 3).
                // "115%" non diceva 115% di cosa. Ora, quando c'è una prova in anteprima da cui
                // misurare, si legge "9.9pt · 120%": il punto è la misura che finisce sulla carta,
                // la percentuale resta perché è il dato salvato ed è l'unico modo per riconoscere
                // "sono al valore di partenza" a colpo d'occhio. Senza prova in anteprima (o su una
                // prova senza parametri calcolati) resta la sola percentuale: meglio un dato in
                // meno che un numero inventato.
                const limitiFontBlocco = limitiFontScaleBlocco(blk.type);
                const baseFontBlocco = baseFontBloccoTabellare(blk.type, templateEditorState.ctx);
                const fontScaleAttuale = blk.fontScale || 1;
                // Il grafico chiama le sue scritte "etichette", non "testo": sono i numeri sugli
                // assi e i nomi degli strati, non un paragrafo.
                const etichettaSezioneFont = blk.type === 'grafico-stratigrafia' ? 'Dimensione etichette' : 'Dimensione testo';
                // Configurazione del controllo: in PUNTI quando c'è una base misurabile, altrimenti
                // si ripiega sulla percentuale. Non è un ripiego pigro — senza una prova in
                // anteprima non esiste un numero di punti verificabile, e mostrarne uno inventato
                // sarebbe peggio del vecchio "115%".
                const cfgControlloFontBlocco = baseFontBlocco ? {
                    azione: 'font-blocco',
                    etichetta: etichettaSezioneFont,
                    unita: 'pt',
                    decimali: 1,
                    passo: 0.5,
                    valore: ptDaFontScale(baseFontBlocco.pt, fontScaleAttuale),
                    min: baseFontBlocco.pt * limitiFontBlocco.min,
                    max: baseFontBlocco.pt * limitiFontBlocco.max,
                    secondarioHtml: `${baseFontBlocco.uniforme ? '' : '≈ '}· ${Math.round(fontScaleAttuale * 100)}%`,
                    notaMin: `${(baseFontBlocco.pt * limitiFontBlocco.min).toFixed(1)}pt`,
                    notaMax: `${(baseFontBlocco.pt * limitiFontBlocco.max).toFixed(1)}pt`,
                    titolo: `Misura reale sulla carta. Di base questo blocco stampa a ${baseFontBlocco.pt.toFixed(1)}pt su questa prova${baseFontBlocco.uniforme ? '' : ' (misura più ricorrente: il blocco contiene anche testi di altra grandezza)'}${blk.type === 'grafico-stratigrafia' ? ' — il grafico ha un intervallo più stretto perché le etichette stanno in posizioni calcolate e ingrandendole troppo si accavallano' : ''}. Doppio tocco sul cursore per tornare alla misura di base.`
                } : {
                    azione: 'font-blocco',
                    etichetta: etichettaSezioneFont,
                    unita: '%',
                    valore: Math.round(fontScaleAttuale * 100),
                    min: Math.round(limitiFontBlocco.min * 100),
                    max: Math.round(limitiFontBlocco.max * 100),
                    titolo: 'Dimensione relativa: scegli una prova per l\'anteprima e comparirà la misura reale in punti'
                };
                // RIORGANIZZAZIONE POSIZIONAMENTO/RIDIMENSIONAMENTO (richiesta esplicitamente, "un
                // ripensamento radicale"): i vecchi 4 concetti separati per "quanto è grande questo
                // blocco" — colSpan, compattezza (widthPct), espandi-su-spazio-vuoto, scala — si
                // riducono a DUE controlli soli: Larghezza (quanto della riga occupa: sostituisce
                // colSpan+widthPct+espandi insieme) e Zoom (dimensione del contenuto, resta
                // distinto perché serve a ingrandire anche OLTRE lo spazio assegnato). Il contenuto
                // riempie sempre per intero il proprio blocco (niente più "compattezza" separata):
                // vedi costruisciHtmlBloccoEditor/buildContenutoVoceStampa, non più avvolto in un
                // contenitore con larghezza percentuale separata.
                const voceContenitore = trovaVoceContenenteBlocco(page, blockId) || blk;
                // Allineamento: vive ora sulla COLONNA (voce), come colSpan/rowSpan/posizioneBloccata
                // — non più sul singolo blocco impilato — perché descrive dove il BLOCCO si
                // posiziona nella riga quando resta più piccolo del 100%, non più dove il contenuto
                // si posiziona dentro il blocco (quella distinzione non esiste più). "Giustificato"
                // è stato tolto: non ha più significato ora che il contenuto riempie sempre il
                // blocco per intero.
                const align = voceContenitore.align || 'left';
                const cols = page.cols || 4;
                const colSpanAttuale = voceContenitore.colSpan || cols;
                // Larghezza: stesso colSpan di sempre, mostrato/editato però come UNA percentuale
                // 0-100% invece che come "colonne su griglia" — a 100% la colonna si espande anche
                // sullo spazio vuoto della riga (comportamento storico di default), sotto 100%
                // resta fissa alla sua frazione, mai più una spunta/campo separato per deciderlo
                // (vedi il handler "larghezza-input" più sotto, che deriva
                // voceContenitore.espandiSuSpazioVuoto direttamente dal valore invece di leggerlo
                // da un campo a parte).
                const larghezzaAttualePct = Math.round(Math.min(cols, colSpanAttuale) / cols * 100);
                // LARGHEZZA IN MILLIMETRI (dalla bacheca di design, decisione (a): mm come LINGUA,
                // percentuale come DATO SALVATO). Motivo: margini, altezza delle foto e ora le
                // interruzioni parlano già in millimetri — la larghezza era l'ultima isola in
                // percentuale, e "50%" non dice niente a chi deve far stare una tabella accanto a
                // un grafico su un A4. Il dato memorizzato resta colSpan/percentuale, quindi
                // nessun template esistente cambia di una virgola e la conversione è lineare
                // (verificato: colSpan = pct / 100 * cols, nessun aggancio magnetico da rompere).
                // Vantaggio concreto della scelta (a) sulla (b): allargando i margini l'etichetta
                // si aggiorna da sola e il blocco resta "metà riga", invece di sfondare la pagina.
                const larghezzaUtileRigaMm = larghezzaRigaUtileMm();
                const mmDaPct = (pct) => Math.round(pct / 100 * larghezzaUtileRigaMm);
                const pctDaMm = (mm) => larghezzaUtileRigaMm > 0 ? (mm / larghezzaUtileRigaMm * 100) : 100;
                const larghezzaAttualeMm = mmDaPct(larghezzaAttualePct);
                // "Larghezza fissa" + "Bilancia riga" (richiesti esplicitamente: poter marcare un
                // blocco come riferimento e dividere lo spazio RESTANTE della riga in parti uguali
                // tra gli altri, invece di regolarli uno per uno a mano — vedi bilanciaRigaBlocco).
                // Il bottone compare solo se la riga ha più di un blocco: bilanciare una riga con un
                // solo blocco non avrebbe senso (occuperebbe già il 100%).
                const larghezzaFissata = !!voceContenitore.larghezzaFissata;
                const rowIdxCorrente = trovaIndiceRigaPerVoce(page, voceContenitore.id);
                const vociRigaCorrente = (rowIdxCorrente >= 0 && page.rows[rowIdxCorrente]) ? page.rows[rowIdxCorrente].blocks.length : 1;
                const rowSpanAttuale = voceContenitore.rowSpan || 1;
                // Zoom vs "Altezza righe" (richiesto esplicitamente, "solo altezza" — vedi anche
                // costruisciHtmlBloccoEditor/attivaManigliaScalaBlocco): stesso campo del menu, ma
                // legato a una proprietà diversa e con range diverso a seconda del tipo di blocco.
                const bloccoARighe = BLOCCHI_CON_FONT_REGOLABILE.has(blk.type);
                // Foto (richiesto esplicitamente: "lo Zoom non serve, al massimo dovrei poter
                // regolare l'altezza del riquadro" — vedi attivaManigliaScalaBlocco per la
                // spiegazione completa): terzo ramo, altezza diretta in mm invece di zoom, e una
                // dimensione di didascalia indipendente (captionFontSizePt) più sotto nella
                // sezione "Didascalia" — mai più la didascalia che si ingrandisce insieme alla foto.
                const bloccoFoto = blk.type === 'immagine-libera';
                const altezzaFotoAttualeMm = blk.heightMm || 70;
                const captionFontSizePtAttuale = blk.captionFontSizePt || 8;
                const scalaBloccoAttuale = bloccoARighe ? (blk.rigaScale || 1) : (blk.scale || 1);
                const fontScale = blk.fontScale || 1;
                // Dimensione carattere in punti "alla Word" (richiesto esplicitamente, solo per
                // Titolo/Testo — non per le tabelle, che restano sulla % di "Dimensione testo" già
                // esistente): sostituisce la percentuale Aa−/Aa+ con una scelta diretta tra le
                // taglie classiche di Word, così il numero scelto è lo stesso che l'utente già
                // conosce da un editor di testo vero, non un moltiplicatore astratto.
                const bloccoTestoLibero = blk.type === 'titolo' || blk.type === 'testo';
                // IL CARATTERE DEL GRAFICO IN PUNTI (richiesto esplicitamente: «permettimi di
                // sceglierlo secondo la prassi di tutti gli altri font, con gli stessi valori
                // presenti nel resto del software»). Prima era un moltiplicatore con un intervallo
                // ristretto tutto suo (0,8–2,2) che per giunta entrava nella GEOMETRIA delle
                // colonne — ed è per questo che ingrandire le etichette rimpiccioliva il resto.
                // Ora è una misura assoluta in punti: stesso comando, stessa scala e stessi valori
                // di Titolo e Testo, e tocca soltanto il testo.
                const usaFontInPunti = bloccoTestoLibero || blk.type === 'grafico-stratigrafia';
                const fontSizePtDefault = blk.type === 'titolo' ? 18 : blk.type === 'grafico-stratigrafia' ? PT_GRAFICO_DEFAULT : 11;
                const fontSizePtAttuale = blk.fontSizePt || fontSizePtDefault;
                // Livello H1/H2/H3 (richiesto esplicitamente, solo per "Titolo" — "Testo" resta
                // libero, non è mai un'intestazione).
                const haLivelloTitolo = blk.type === 'titolo';
                const livelloTitoloAttuale = blk.livelloTitolo || 'h1';
                // Lucchetto posizione (richiesto esplicitamente, versione rafforzata: "non deve
                // solo vietare all'utente di spostarlo ma a tutto il sistema... non può essere più
                // editato in nient'altro"): proprietà della COLONNA (voce di riga), condivisa da
                // tutti i blocchi impilati al suo interno. Blocca DAVVERO tutto — trascinamento,
                // larghezza, zoom, righe, allineamento, eliminazione — l'unico controllo che resta
                // sempre attivo è il lucchetto stesso, per poter sbloccare. Applicato qui sotto
                // disabilitando in blocco ogni altro input/bottone del menu appena costruito (vedi
                // subito dopo menu.innerHTML), non sparso in ogni singolo controllo.
                const posizioneBloccata = !!voceContenitore.posizioneBloccata;
                // GRIGLIA DELLA TABELLA (richiesta esplicitamente: "disattivare le righe delle
                // tabelle... o poterle editare", anche per recuperare millimetri). Vive sul BLOCCO
                // (blk), come rigaScale/fontScale: due blocchi tabella nello stesso template possono
                // volere griglie diverse. Valori: 'tutti' (default, comportamento storico),
                // 'orizzontali' (via le verticali: è quasi sempre questo il "pugno in un occhio"),
                // 'nessuno'. Vedi stileGrigliaTabellaBlocco per come diventa CSS.
                const grigliaTabellaAttuale = blk.grigliaTabella || 'tutti';
                // Zoom mappa (solo blocco "Inquadramento") e didascalia (foto + inquadramento,
                // richiesti esplicitamente): calcolati qui per iniettarli nel menu sotto.
                const haZoomMappa = blk.type === 'inquadramento';
                const zoomMappa = blk.satelliteZoom || 16;
                // Spostamento mappa (richiesto esplicitamente): il pin resta sulla vera posizione
                // GPS, è la porzione di mappa mostrata a spostarsi — utile per riquadrare meglio
                // strade/edifici/altri punti di riferimento intorno al pin. In tessere intere,
                // limitato a ±2 (vedi buildInquadramentoSatellitareHtml, mosaico 5x5: oltre ±2 il
                // pin uscirebbe dal riquadro visibile).
                const offsetMappaX = blk.satelliteOffsetX || 0;
                const offsetMappaY = blk.satelliteOffsetY || 0;
                // GRAFICO STRATIGRAFIA (richiesto esplicitamente con screenshot: prova arrivata a
                // 1,2 m con l'asse disegnato fino a 3 m, "la maggior parte rimane piccolo e vuoto").
                // Due controlli distinti perché rispondono a due bisogni diversi: la PROFONDITÀ
                // decide fin dove arriva l'asse (0 = si adatta da solo al dato), l'ALTEZZA decide
                // quanto è alto il disegno a parità di profondità.
                const eGraficoStratigrafia = blk.type === 'grafico-stratigrafia';
                const profonditaAsseAttuale = blk.profonditaAsseM || 0;
                const altezzaScalaGraficoAttuale = Math.round((blk.altezzaScalaGrafico || 1) * 100);
                const larghezzaColonneGraficoAttuale = Math.round((blk.larghezzaColonneGrafico || 1) * 100);
                const spazioEtichetteGraficoAttuale = Math.round((blk.spazioEtichetteGrafico || 1) * 100);
                const retinoGraficoAttuale = Math.round((blk.retinoLegendaGrafico || 1) * 100);
                const legendaGraficoAttuale = legendaGrafico(blk.legendaGrafico);
                const profonditaCantiereAttiva = !!blk.profonditaAsseCantiere;
                const guidaNomiAttiva = !!blk.mostraGuidaNomiGrafico;
                // Profondità massima del CANTIERE: il numero che la spunta impone. Mostrarlo
                // accanto alla spunta è metà del comando — «massima del cantiere» senza dire
                // quale sia costringerebbe ad aprire le altre prove per scoprirlo, che è
                // esattamente la cosa da cui questa spunta dovrebbe liberare.
                const profonditaCantiereM = profonditaMassimaProgetto(templateEditorState.ctx && templateEditorState.ctx.projId);
                /* Le quattro disposizioni della legenda, a wireframe. Nomi come «cartiglio a
                 * griglia» si capiscono dopo averli provati; il disegnino prima. */
                const ICONE_LEGENDA = {
                    colonna: '<rect x="2" y="2" width="5" height="14" rx="1"/><rect x="9" y="3" width="3" height="3"/><rect x="13" y="4" width="8" height="1.4"/><rect x="9" y="8" width="3" height="3"/><rect x="13" y="9" width="7" height="1.4"/><rect x="9" y="13" width="3" height="3"/><rect x="13" y="14" width="6" height="1.4"/>',
                    grigliaBasso: '<rect x="2" y="2" width="5" height="9" rx="1"/><rect x="9" y="2" width="6" height="9" rx="1"/><rect x="17" y="2" width="5" height="9" rx="1"/><rect x="2" y="13" width="20" height="5" rx="1" fill="none" stroke="currentColor" stroke-width="1"/><rect x="4" y="15" width="2" height="2"/><rect x="7" y="15.6" width="4" height="1"/><rect x="13" y="15" width="2" height="2"/><rect x="16" y="15.6" width="4" height="1"/>',
                    rigaBasso: '<rect x="2" y="2" width="5" height="11" rx="1"/><rect x="9" y="2" width="6" height="11" rx="1"/><rect x="17" y="2" width="5" height="11" rx="1"/><rect x="2" y="15" width="2" height="2"/><rect x="5" y="15.6" width="3" height="1"/><rect x="9" y="15" width="2" height="2"/><rect x="12" y="15.6" width="3" height="1"/><rect x="16" y="15" width="2" height="2"/><rect x="19" y="15.6" width="3" height="1"/>',
                    nessuna: '<rect x="2" y="2" width="5" height="16" rx="1"/><rect x="9" y="2" width="6" height="16" rx="1"/><rect x="17" y="2" width="5" height="16" rx="1"/>'
                };
                const NOMI_LEGENDA = {
                    colonna: 'Nomi a fianco della colonna, ciascuno alla quota del suo strato',
                    grigliaBasso: 'Cartiglio in basso, retini disposti a griglia su più colonne',
                    rigaBasso: 'Cartiglio in basso, retini in fila: occupa pochissima altezza',
                    nessuna: 'Nessuna legenda: solo i retini nella colonna'
                };
                // Etichetta di una parola sotto l'icona (richiesta esplicitamente: le 4 icone da
                // sole si distinguevano solo leggendo la spiegazione sotto TUTTE e quattro insieme —
                // una parola per bottone toglie l'ambiguità senza dover leggere altrove).
                const NOMI_LEGENDA_BREVI = { colonna: 'Colonna', grigliaBasso: 'Griglia', rigaBasso: 'Riga', nessuna: 'Nessuna' };
                const bottoneLegenda = (val) => {
                    const on = legendaGraficoAttuale === val;
                    return `<button type="button" class="tpl-editor-menu-btn" data-action="legenda-grafico" data-val="${val}" title="${NOMI_LEGENDA[val]}" style="flex:1; padding:5px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:${on ? 'var(--accent)' : 'var(--bg-main)'}; color:${on ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${on ? 'var(--accent)' : 'var(--border)'};"><svg viewBox="0 0 24 20" style="width:22px; height:18px; fill:currentColor;">${ICONE_LEGENDA[val]}</svg><span style="font-size:8.5px; font-weight:700;">${NOMI_LEGENDA_BREVI[val]}</span></button>`;
                };
                // Profondità realmente raggiunta dalla prova scelta per l'anteprima: mostrata
                // accanto al campo perché "0 = automatico" da solo non dice quale sarà il risultato.
                const profonditaDatoM = (() => {
                    const logs = templateEditorState.ctx && templateEditorState.ctx.stratigrafiaChartRawParams && templateEditorState.ctx.stratigrafiaChartRawParams.logsCalc;
                    if (!Array.isArray(logs) || logs.length === 0) return null;
                    return Math.max(...logs.map(l => l.end || 0));
                })();
                // Toponimi (richiesto esplicitamente, accendibili/spegnibili): attivi di default
                // (come una mappa "ibrida" satellite+etichette) finché non esplicitamente
                // disattivati — stessa convenzione "default true a meno di false esplicito" già
                // usata per widthLocked. La leggibilità (opacità) è regolabile perché ogni mappa ha
                // uno sfondo diverso (zone chiare/scure, dense di elementi o no): un valore fisso non
                // andrebbe mai bene ovunque, richiesto esplicitamente ("ogni mappa sarà diversa").
                const toponimiAttivi = blk.satelliteLabels !== false;
                const opacitaToponimi = (blk.satelliteLabelsOpacity != null) ? blk.satelliteLabelsOpacity : 100;
                // Ingrandire il font dei toponimi raster resta un compromesso (richiesto comunque
                // esplicitamente indietro dall'utente dopo un primo tentativo di rimozione): qui si
                // applica uno scale() a OGNI singola tessera etichette, dal proprio centro, invece che
                // all'intero livello da un'unica origine — l'errore di posizione che ne risulta resta
                // contenuto entro il raggio di UNA tessera (non più dell'intero riquadro come nel primo
                // tentativo), un compromesso ragionevole vista l'impossibilità geometrica di
                // ingrandire un raster "sul posto" senza alcun effetto collaterale (vedi commenti in
                // buildInquadramentoSatellitareHtml).
                const scalaToponimi = blk.satelliteLabelsScale || 100;
                const modoEtichettaMappa = blk.satelliteCustomLabelMode || 'none';
                const testoEtichettaMappa = blk.satelliteCustomLabelText || '';
                const dimensioneEtichettaMappa = blk.satelliteCustomLabelFontSize || 11;
                // Posizione libera dell'etichetta di testo VERO (richiesta esplicitamente: "piazzarla
                // dove voglio"), in percentuale rispetto al riquadro mappa — sempre clampata 0-100%,
                // quindi resta per costruzione "solo nella foto", mai fuori dal riquadro visibile.
                const posXEtichettaMappa = (blk.satelliteCustomLabelPosX != null) ? blk.satelliteCustomLabelPosX : 50;
                const posYEtichettaMappa = (blk.satelliteCustomLabelPosY != null) ? blk.satelliteCustomLabelPosY : 20;
                const localitaProva = (templateEditorState.ctx && templateEditorState.ctx.datiBoxRawParams && templateEditorState.ctx.datiBoxRawParams.localita) || '';
                // "Comune" come sorgente etichetta (richiesto esplicitamente, accanto a "Località"):
                // stesso identico meccanismo, solo campo diverso di datiBoxRawParams.
                const comuneProva = (templateEditorState.ctx && templateEditorState.ctx.datiBoxRawParams && templateEditorState.ctx.datiBoxRawParams.comune) || '';
                const haDidascalia = TIPI_BLOCCO_CON_DIDASCALIA.has(blk.type);
                const didascaliaAuto = haDidascalia ? didascaliaAutomaticaBlocco(blk.type, blk, templateEditorState.ctx || {}) : '';
                // Scelta MANUALE di quale foto mostrare (richiesto esplicitamente: "capire se usare
                // 'la prima' o 'la seconda'... c'è bisogno di dare una direzione più che indicare
                // precisamente una singola foto" — quindi una posizione nella galleria, non un file
                // specifico). Di default resta "Automatica": la posizione dipende dall'ordine dei
                // blocchi "Foto prova" nel template (vedi calcolaIndiciImmaginePerBlocco). Impostando
                // blk.fotoIndiceManuale si fissa SEMPRE quella posizione per questo blocco, a
                // prescindere da dove si trova nel layout — utile quando si vuole un ordine diverso
                // da quello di lettura (es. la foto più rappresentativa sempre come prima immagine).
                const haSceltaFoto = blk.type === 'immagine-libera';
                const totaleFotoDisponibili = (templateEditorState.ctx && templateEditorState.ctx.photoUrls) ? templateEditorState.ctx.photoUrls.length : 0;
                const fotoIndiceManuale = (blk.fotoIndiceManuale != null) ? blk.fotoIndiceManuale : null;
                // Interruzioni di pagina manuali per categoria — griglia fissa (richiesto
                // esplicitamente dopo l'ennesimo bug della stessa famiglia): blk.
                // categorieForzaPaginaPrima è un elenco di indici di categoria (vedi
                // data-categoria-index in buildAllegatoHtml/htmlTabellaDettagliata) che devono
                // SEMPRE iniziare una pagina nuova — è l'UNICO criterio che decide dove si taglia,
                // letto da sincronizzaFlussiBlocchiLunghi (editor) e impaginaBlocchiSuPagineFisiche
                // (export): nessuna misura d'altezza da nessuna delle due parti.
                const elencoCategorieFlowable = BLOCCHI_FLOWABLE.has(blk.type) ? elencoCategorieBlocco(blk.type) : [];
                const categorieForzatePrima = Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : [];
                // Segmenti pagina già calcolati dall'ultimo giro di sincronizzaFlussiBlocchiLunghi
                // (richiesto esplicitamente: "far capire in automatico al sistema dove dovrebbe
                // andare l'interruzione pagina, e solo dopo far scegliere all'utente") — usati per
                // mostrare nel menu, in modo passivo, dove il sistema ha GIÀ deciso di tagliare;
                // l'utente aggiunge solo interruzioni manuali IN PIÙ, non può togliere quelle
                // automatiche (nascono dallo spazio reale disponibile, non da una sua scelta).
                const segmentiPagina = elencoCategorieFlowable.length > 0 ? elencoSegmentiPaginaBlocco(blockId, blk.type) : [];
                const indiciRotturaPagina = new Set(segmentiPagina.slice(1).map(s => s.da));
                // FASE C (vedi Piano_Riscrittura_Layout_Export.md): avvisi di overflow reali, letti
                // dalla cache di ricalcolaAvvisiOverflowTuttiBlocchi (misura vera, stesso iframe di
                // stampa del motore di export) — usati sia nei chip qui sotto sia nel totale.
                const avvisiOverflowBlocco = (templateEditorState.avvisiOverflowPerBlocco && templateEditorState.avvisiOverflowPerBlocco[blk.id]) || [];
                // Millimetri reali per categoria, dalla stessa misurazione degli avvisi qui sopra.
                // Servono a scegliere DOVE tagliare: senza, l'avviso dice solo che il gruppo non ci
                // sta. Può mancare (misurazione ancora in corso al primo render, o fallita): in quel
                // caso i chip semplicemente non mostrano il numero, non si rompe niente.
                const misureCategorie = (templateEditorState.mmCategoriePerBlocco && templateEditorState.mmCategoriePerBlocco[blk.id]) || null;
                const mmDiCategoria = (indice) => {
                    if (!misureCategorie || !misureCategorie.perCategoria) return null;
                    const v = misureCategorie.perCategoria[indice];
                    return (typeof v === 'number' && isFinite(v) && v > 0) ? v : null;
                };
                const limitePaginaMenuMm = (misureCategorie && misureCategorie.limiteMm > 0) ? misureCategorie.limiteMm : 0;
                // Quanta carta chiede il blocco in tutto: con questo e il limite di pagina si capisce
                // in un colpo d'occhio quante pagine servono NEL MIGLIORE dei casi, cioè se le
                // interruzioni fossero messe nei punti perfetti.
                const mmTotaliBlocco = elencoCategorieFlowable.reduce((s, c) => s + (mmDiCategoria(c.indice) || 0), 0);
                // Disposizione/ordine delle 3 "schede" del blocco "Dati Prova" (richiesto
                // esplicitamente: poterle affiancare in orizzontale invece di solo impilarle, e
                // riordinarle) — solo per questo tipo di blocco.
                // Blocchi di libertà d'impaginazione (richiesti esplicitamente): "Titolo"/"Testo"
                // aprono il piccolo editor di testo formattato; "Divisore" regola l'altezza dello
                // spazio vuoto in millimetri.
                const haTestoLibero = blk.type === 'titolo' || blk.type === 'testo';
                const haDivisore = blk.type === 'divisore';
                const altezzaDivisore = blk.spacerHeightMm || 10;
                const lineaDivisore = LINEE_DIVISORE.indexOf(blk.divisoreLinea) > 0 ? blk.divisoreLinea : 'nessuna';
                const stileDivisore = STILI_LINEA_DIVISORE[blk.divisoreStile] ? blk.divisoreStile : 'continua';
                const tintaDivisore = TINTE_DIVISORE[blk.divisoreTinta] ? blk.divisoreTinta : 'grigio';
                const spessoreDivisore = Math.max(0.5, Math.min(6, parseFloat(blk.divisoreSpessore) || 1));
                const lunghezzaDivisore = Math.max(10, Math.min(100, parseFloat(blk.divisoreLunghezza) || 100));
                const elasticoDivisore = !!blk.divisoreElastico;
                const ICONE_LINEA_DIV = {
                    nessuna: '<rect x="2" y="3" width="20" height="4" rx="1" opacity=".35"/><rect x="2" y="15" width="20" height="4" rx="1" opacity=".35"/>',
                    orizzontale: '<rect x="2" y="2" width="20" height="4" rx="1" opacity=".35"/><rect x="4" y="10" width="16" height="1.8" rx="0.9"/><rect x="2" y="16" width="20" height="4" rx="1" opacity=".35"/>',
                    verticale: '<rect x="2" y="2" width="8" height="18" rx="1" opacity=".35"/><rect x="11.2" y="3" width="1.8" height="16" rx="0.9"/><rect x="14" y="2" width="8" height="18" rx="1" opacity=".35"/>'
                };
                const NOMI_LINEA_DIV = {
                    nessuna: 'Solo spazio vuoto, come è sempre stato',
                    orizzontale: 'Un filo orizzontale al centro dello spazio: separa due sezioni',
                    verticale: 'Un filo verticale: separa due colonne affiancate senza lasciare un buco'
                };
                const NOMI_LINEA_DIV_BREVI = { nessuna: 'Nessuna', orizzontale: 'Orizz.', verticale: 'Vert.' };
                const bottoneLineaDiv = (val) => {
                    const on = lineaDivisore === val;
                    return `<button type="button" class="tpl-editor-menu-btn" data-action="divisore-linea" data-val="${val}" title="${NOMI_LINEA_DIV[val]}" style="flex:1; padding:5px 2px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:2px; background:${on ? 'var(--accent)' : 'var(--bg-main)'}; color:${on ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${on ? 'var(--accent)' : 'var(--border)'};"><svg viewBox="0 0 24 22" style="width:22px; height:20px; fill:currentColor;">${ICONE_LINEA_DIV[val]}</svg><span style="font-size:8.5px; font-weight:700;">${NOMI_LINEA_DIV_BREVI[val]}</span></button>`;
                };
                const haScheda = blk.type === 'dati-prova';
                const NOMI_SCHEDE_MENU = ['Prova / Dati indagine', 'Dati strumento', 'Dati stratigrafici'];
                const ordineSchede = Array.isArray(blk.ordineSchede) && blk.ordineSchede.length === 3 ? blk.ordineSchede : [0, 1, 2];
                const dispSchede = disposizioneSchede(blk);
                const zebraSchede = !!blk.schedeZebra;
                const tintaSchede = TINTE_DATI_PROVA[blk.schedeTinta] ? blk.schedeTinta : TINTA_DATI_PROVA_DEFAULT;
                /* WIREFRAME, NON PAROLE. «Tre colonne» e «righe distribuite» sono nomi che si
                 * capiscono dopo averli provati; il disegnino si capisce prima. Sono quattro
                 * rettangoli in un SVG di 24×18, in currentColor, così sul bottone attivo si
                 * invertono insieme al testo senza una seconda serie di icone. */
                const ICONE_DISPOSIZIONE = {
                    v: '<rect x="2" y="2" width="20" height="4" rx="1"/><rect x="2" y="7.5" width="20" height="4" rx="1"/><rect x="2" y="13" width="20" height="3" rx="1"/>',
                    h3: '<rect x="2" y="2" width="6" height="14" rx="1"/><rect x="9" y="2" width="2.6" height="14" rx="1"/><rect x="12.4" y="2" width="2.6" height="14" rx="1"/><rect x="16" y="2" width="6" height="14" rx="1"/>',
                    h2: '<rect x="2" y="2" width="9" height="14" rx="1"/><rect x="12.5" y="2" width="9.5" height="6" rx="1"/><rect x="12.5" y="9.5" width="9.5" height="6.5" rx="1"/>',
                };
                const NOMI_DISPOSIZIONE = {
                    v: 'Impilate una sull\'altra',
                    h3: 'Tre colonne — la scheda con molte righe si dispone su due colonne interne',
                    h2: 'Due colonne — la scheda alta da sola, le due corte impilate'
                };
                const bottoneDisposizione = (val) => {
                    const on = dispSchede === val;
                    return `<button type="button" class="tpl-editor-menu-btn" data-action="schede-layout" data-val="${val}" title="${NOMI_DISPOSIZIONE[val]}" style="flex:1; padding:5px 2px; display:flex; align-items:center; justify-content:center; background:${on ? 'var(--accent)' : 'var(--bg-main)'}; color:${on ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${on ? 'var(--accent)' : 'var(--border)'};"><svg viewBox="0 0 24 18" style="width:24px; height:18px; fill:currentColor;">${ICONE_DISPOSIZIONE[val]}</svg></button>`;
                };
                const bottoneAllineamento = (val, icona, titolo) => `<button type="button" class="tpl-editor-menu-btn tpl-editor-menu-align" data-align="${val}" title="${titolo}" style="background:${align === val ? 'var(--accent)' : 'var(--bg-main)'}; color:${align === val ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${align === val ? 'var(--accent)' : 'var(--border)'};"><svg class="ico" style="width:15px; height:15px;"><use href="#i-align-${icona}"/></svg></button>`;
                const menu = document.createElement('div');
                menu.id = 'templateEditorBlockMenu';
                // Quale blocco sta mostrando: serve a chi, finita una misurazione in background,
                // deve capire se il menu aperto è proprio quello i cui numeri sono cambiati.
                menu.dataset.blockId = blockId;
                // NIENTE PIU' RIMBALZO. La classe che c'era qui usava cubic-bezier(.34,1.56,.64,1):
                // quell'1.56 e' un sorpasso, cioe' proprio il rimbalzo segnalato. Alla prima
                // apertura resta una comparsa breve e piatta (nessuna scala, nessun sorpasso);
                // sulle ricostruzioni non c'e' nessuna animazione, perche' il pannello non sta
                // entrando — sta solo aggiornando quello che mostra.
                menu.className = 'tpl-editor-block-menu' + (eRicostruzione ? ' e-senza-entrata' : ' tpl-editor-menu-entra');
                menu.innerHTML = `
                    <div class="tpl-editor-block-menu-drag-handle" title="${modalitaMobileTemplateEditor() ? 'Trascina per cambiare l\'altezza del pannello — o toccala per passare alla misura successiva' : 'Trascina per spostare'}"><svg class="ico" style="width:16px; height:16px;"><use href="#i-grip"/></svg>
                        <button type="button" class="tpl-editor-block-menu-collapse" data-action="collapse-menu" title="Riduci a bolla">
                            <svg class="ico" style="width:14px; height:14px;"><use href="#i-chevron-down"/></svg>
                        </button>
                    </div>
                    <!-- Nome del blocco in cima: serve soprattutto nella posizione "spia" del
                         pannello, dove si vedono poche righe — senza, non sapresti su quale blocco
                         stai agendo mentre guardi l'effetto sul foglio qui sopra. -->
                    <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--text-main); padding-bottom:2px;">
                        <svg class="ico" style="width:13px; height:13px; color:var(--accent-ink); flex-shrink:0;"><use href="#i-${(REPORT_BLOCK_TYPES[blk.type] || {}).icon || 'clipboard'}"/></svg>
                        <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1; min-width:0;">${(REPORT_BLOCK_TYPES[blk.type] || {}).label || blk.type}</span>
                        <!-- ⋮ "Altro": ospita le azioni rare e distruttive. "Rimuovi blocco" stava
                             in fondo al pannello, a tutta larghezza — cioè il punto più comodo per
                             il pollice occupato dall'azione più rara e irreversibile. Il bottone
                             vero non viene ricreato qui: viene SPOSTATO dentro questa tendina da
                             spostaRimuoviNelMenuAltro, così il suo gestore resta quello di sempre. -->
                        <button type="button" class="tpl-editor-menu-altro-btn" data-action="apri-menu-altro" title="Altre azioni" aria-label="Altre azioni">⋮</button>
                    </div>
                    <div class="tpl-editor-menu-altro" data-role="menu-altro" hidden></div>
                    ${(() => {
                        const ecc = eccezioniDiStile(blk);
                        if (ecc.length === 0) return '';
                        // Compare SOLO quando c'e' davvero uno scostamento: un avviso sempre acceso
                        // smette di voler dire qualcosa dopo due giorni.
                        return `<div style="padding:8px 9px; border-radius:8px; border:1px solid #f59e0b; background:rgba(245,158,11,0.12);">
                            <div style="font-size:10.5px; font-weight:800; color:#b45309; display:flex; align-items:center; gap:5px;">
                                <span style="width:8px; height:8px; border-radius:50%; background:#f59e0b; flex-shrink:0;"></span>
                                ${ecc.length} eccezion${ecc.length === 1 ? 'e' : 'i'} allo stile del documento
                            </div>
                            <div style="font-size:10px; color:var(--text-muted); margin:4px 0 6px; line-height:1.45;">${ecc.map(e => e.nome).join(' · ')}</div>
                            <button type="button" class="tpl-editor-menu-btn" data-action="stile-ripristina" style="width:100%; font-size:11px; font-weight:800;">Riporta allo stile del documento</button>
                        </div>`;
                    })()}
                    ${haZoomMappa ? `
                    <!-- TUTTO L'INQUADRAMENTO SI COMPONE GUARDANDO, NON QUI.
                         Qui c'erano otto controlli numerici — zoom, toponimi, opacita', scala dei
                         toponimi, etichetta e le sue tre coordinate — in fondo a un menu gia'
                         lungo. Erano gli stessi parametri che ora si toccano col dito vedendo il
                         risultato: tenerli anche qui non era una scelta in piu', era lo stesso
                         comando in due posti che possono divergere. -->
                    <div style="padding:10px; border-radius:9px; border:1.5px solid var(--accent); background:var(--accent-soft); text-align:center;">
                        <div style="font-size:11px; font-weight:800; color:var(--accent-ink); margin-bottom:7px;">Inquadramento satellitare</div>
                        <button type="button" class="tpl-editor-menu-btn" data-action="componi-mappa" style="width:100%; font-size:12.5px; font-weight:800; padding:11px 8px; display:flex; align-items:center; justify-content:center; gap:7px; background:var(--accent); color:var(--on-accent); border-color:var(--accent);"><svg class="ico" style="width:16px;height:16px;"><use href="#i-map"/></svg> Apri il compositore</button>
                        <div style="font-size:10px; color:var(--text-muted); margin-top:7px; line-height:1.45;">Provider, zoom, toponimi, prove, inquadramento regionale, nord e scala: tutto in una schermata, trascinando.</div>
                    </div>
                    ` : ''}
                    <!-- data-fascia="1" esplicito: i bottoni di allineamento usano data-align, non
                         data-action, quindi l'euristica di fasciaDiSezioneMenu non li riconosce come
                         "bottoni" e finiva per giudicare la fascia dal PRIMO slider annidato più
                         sotto (Larghezza) invece che dal gruppo Allineamento stesso — scoperto
                         verificando dal vivo, non prevedibile leggendo solo il codice. -->
                    <div class="tpl-editor-menu-section-label" data-fascia="1">Allineamento</div>
                    <div class="tpl-editor-menu-row">
                        ${bottoneAllineamento('left', 'left', 'Allinea a sinistra')}
                        ${bottoneAllineamento('center', 'center', 'Centra')}
                        ${bottoneAllineamento('right', 'right', 'Allinea a destra')}
                    </div>
                    <!-- etichetta "Dimensione" tolta: la scheda si chiama gia cosi e i comandi portano il proprio nome -->
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <!-- Primo utente del controllo numerico condiviso (Piano_Controlli_Font,
                             passo 2): collaudato qui, dove i millimetri sono già l'unità di lavoro
                             e non c'è nessuna conversione da sbagliare, prima di portarlo sui
                             caratteri dove invece la conversione c'è. Slider E campo lavorano
                             entrambi in millimetri; la percentuale — che resta il dato salvato —
                             compare solo come nota, perché "100%" dice a colpo d'occhio "riempie la
                             riga", cosa che "186mm" da solo non direbbe. -->
                        ${htmlControlloNumerico({
                            azione: 'larghezza-input',
                            // SUL GRAFICO SI CHIAMA «SCALA» (richiesto esplicitamente: «questa
                            // strana gestione della larghezza dev'essere rinominata in scala,
                            // perché è questo quello che fa»). Su ogni altro blocco questo comando
                            // è davvero una larghezza: dice quanti millimetri della riga occupa il
                            // blocco, e il contenuto si riadatta dentro. Sul grafico no: il disegno
                            // ha una larghezza sua, in unità fisiche, e stringendo il blocco sotto
                            // quella misura si rimpicciolisce tutto insieme — cioè cambia scala.
                            // Lo stesso nome per due comportamenti diversi è il modo più rapido di
                            // rendere incapibile un comando. La misura orizzontale vera, sul
                            // grafico, la fa la maniglia sul lato destro.
                            etichetta: eGraficoStratigrafia ? 'Scala' : 'Larghezza',
                            unita: 'mm',
                            valore: larghezzaAttualeMm,
                            // Il minimo non è un numero tondo scelto a caso: è il 5% storico
                            // tradotto in millimetri, così il limite resta quello di sempre.
                            // Il DIVISORE ha il suo (segnalato: «dovrei poterlo stringere anche
                            // di più»): è spazio vuoto, e uno spazio vuoto di due millimetri è
                            // esattamente ciò per cui esiste — mentre una tabella larga due
                            // millimetri non è una tabella stretta, è una tabella illeggibile.
                            // Il pavimento del rendering scende con lui, vedi flexEntryCss:
                            // erano due limiti che non coincidevano, ed è per questo che il
                            // numero scendeva sotto i 48px e il blocco no.
                            min: haDivisore ? 1 : mmDaPct(5),
                            max: larghezzaUtileRigaMm,
                            secondarioHtml: `· ${larghezzaAttualePct}%`,
                            notaMax: `${larghezzaUtileRigaMm}mm = riga piena`,
                            titolo: `Quanto della riga occupa questo blocco, sui ${larghezzaUtileRigaMm}mm utili tra i margini: a riga piena occupa anche lo spazio libero, sotto resta fisso alla sua misura — doppio tocco sul cursore per tornare a riga piena`
                        })}
                        ${eGraficoStratigrafia ? '' : htmlControlloNumerico({
                            azione: 'scale-input',
                            // Un nome per concetto: "Altezza" con il complemento, mai "Zoom" per
                            // qualcosa che zoom non è. Per foto e mappe resta "Ingrandimento",
                            // che è quello che fa davvero.
                            // IL GRAFICO NON CE L'HA PIÙ (segnalato: «credo che lo slider altezza
                            // faccia circa quello che ho chiesto per l'ingrandimento, si possono
                            // fondere»). «Ingrandimento» moltiplicava la scala dell'intero disegno,
                            // il suo «Altezza» ridistribuisce le proporzioni: due comandi che a
                            // occhio si somigliavano, uno dei due sbagliato. Ne resta uno.
                            etichetta: bloccoARighe ? 'Altezza righe' : bloccoFoto ? 'Altezza foto' : 'Ingrandimento',
                            unita: bloccoFoto ? 'mm' : '%',
                            valore: bloccoFoto ? altezzaFotoAttualeMm : Math.round(scalaBloccoAttuale * 100),
                            min: bloccoARighe ? 40 : bloccoFoto ? 20 : 10,
                            max: bloccoARighe ? 250 : bloccoFoto ? 250 : 400,
                            notaMin: (bloccoARighe ? 40 : bloccoFoto ? 20 : 10) + (bloccoFoto ? 'mm' : '%'),
                            notaMax: (bloccoARighe ? 250 : bloccoFoto ? 250 : 400) + (bloccoFoto ? 'mm' : '%'),
                            titolo: bloccoARighe
                                ? 'Altezza delle righe: non tocca il carattere, solo lo spazio fra una riga e l\'altra'
                                : bloccoFoto ? 'Altezza del riquadro della foto' : 'Ingrandimento del contenuto'
                        })}
                        <!-- IL CAMPO "RIGHE" (rowSpan) NON C'È PIÙ (richiesto esplicitamente:
                             «da ogni blocco devi rimuovere assolutamente la possibilità di
                             modificare le righe. Non serve ora che abbiamo uno spaziatore che
                             possiamo sfruttare come vogliamo»). Faceva occupare a un blocco più
                             righe della griglia riservando segnaposto invisibili in quelle sotto:
                             un meccanismo con la sua logica di pulizia, di orfani e di gruppi da
                             rendere come un'unica griglia CSS — tutto per ottenere spazio verticale
                             attorno a un blocco, che ora si ottiene mettendogli accanto un divisore
                             e regolandolo. Un comando in meno nel menu, e un intero ramo di
                             impaginazione che non si percorre più. I template già salvati vengono
                             normalizzati all'avvio, vedi appiattisciRowSpanTemplate. -->
                    </div>
                    ${vociRigaCorrente > 1 ? `
                    ${htmlInterruttore({
                        azione: 'larghezza-fissata',
                        etichetta: 'Larghezza',
                        attivo: larghezzaFissata,
                        statoOn: 'fissa · esclusa da "Bilancia riga"',
                        statoOff: 'libera · "Bilancia riga" può cambiarla',
                        icona: 'pin',
                        titolo: 'Marca questo blocco come riferimento immutabile: "Bilancia riga" dividerà lo spazio restante fra gli altri'
                    })}
                    <button type="button" class="tpl-editor-menu-btn" data-action="bilancia-riga" style="width:100%; margin-top:4px; font-weight:700; padding:6px;" title="Divide lo spazio restante di questa riga in parti uguali tra i blocchi non fissati">⚖️ Bilancia riga (${vociRigaCorrente} blocchi)</button>
                    ` : ''}
                    <!-- Prima restava appeso in coda alla sezione precedente (Allineamento/Scala),
                         senza una sua etichetta: bastava una checkbox o uno slider qualunque dopo di
                         lui perché il riordino a fasce lo agganciasse a un gruppo che non c'entrava
                         niente. Etichetta propria + data-fascia="1" (vedi fasciaDiSezioneMenu): resta
                         un gruppo unico, sempre subito dopo Allineamento/Scala, mai smontato. -->
                    <div class="tpl-editor-menu-section-label" data-fascia="1">Blocco</div>
                    ${htmlInterruttore({
                        azione: 'posizione-bloccata',
                        etichetta: 'Posizione',
                        attivo: posizioneBloccata,
                        statoOn: 'bloccato · nessun comando disponibile',
                        statoOff: 'modificabile',
                        // Sempre 'lock': un'icona "unlock" nel set non c'è, e inventarne una
                        // rotta per distinguere lo stato sarebbe inutile — lo stato lo dicono già
                        // l'interruttore e la parola sotto al nome.
                        icona: 'lock',
                        titolo: 'Un blocco bloccato non viene toccato né da te né dal sistema, finché non lo sblocchi da qui'
                    })}
                    ${posizioneBloccata ? `<div style="font-size:10px; color:var(--text-muted); margin-top:2px; line-height:1.4;">Blocco bloccato: nessun altro controllo è disponibile finché non lo sblocchi da qui.</div>` : ''}
                    ${eGraficoStratigrafia ? `
                    <!-- "Grafico" mescolava quattro argomenti diversi (asse, altezza, proporzioni
                         interne, spazio etichette) come slider nudi uno sull'altro, senza nessuna
                         etichetta a distinguerli — e il riordino a fasce li spargeva pure lontano
                         dalla propria etichetta "Grafico", che restava vuota. Tre sotto-sezioni,
                         ciascuna avvolta in un contenitore con data-fascia="1" (vedi
                         fasciaDiSezioneMenu/riordinaSezioniAFasce): il gruppo resta sempre intero,
                         mai smontato dal riordino, sempre subito sotto "Grafico". -->
                    <div class="tpl-editor-menu-section-label" data-fascia="1">Grafico</div>

                    <div data-fascia="1">
                        <div class="tpl-editor-menu-sottosezione">Asse</div>
                        <div class="tpl-editor-menu-gruppo">
                            ${htmlControlloNumerico({
                                azione: 'profondita-asse',
                                etichetta: 'Profondità',
                                unita: 'm',
                                decimali: 1,
                                passo: 0.5,
                                valore: profonditaCantiereAttiva && profonditaCantiereM > 0
                                    ? profonditaAsseAutomatica(profonditaCantiereM)
                                    : (profonditaAsseAttuale || (profonditaDatoM != null ? profonditaAsseAutomatica(profonditaDatoM) : 3)),
                                min: 0.5, max: 60,
                                notaMin: '0,5m',
                                notaMax: '60m',
                                secondarioHtml: profonditaCantiereAttiva ? '· cantiere' : (profonditaAsseAttuale ? '· fisso' : '· automatico'),
                                titolo: "Fin dove arriva l'asse delle profondità. Toccandolo passa a manuale; il tasto Auto lo rimette in automatico"
                            })}
                            <!-- LA SPUNTA DEL CANTIERE (richiesta esplicitamente: «in modo che io possa
                                 regolarmi in maniera uniforme su come impaginare il grafico senza dovermi
                                 spostare su altre prove»). Con il fondo scala automatico ogni prova si
                                 adatta a se stessa: due grafici della stessa relazione finiscono su assi
                                 diversi e non si confrontano a occhio. Qui il numero lo decide il cantiere,
                                 una volta per tutte, e resta giusto anche quando domani si aggiunge una
                                 prova piu' profonda — perche' e' una regola, non un valore copiato. -->
                            <div class="tpl-editor-menu-row">
                                <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer; ${profonditaCantiereM > 0 ? '' : 'opacity:.45; cursor:default;'}">
                                    <input type="checkbox" data-action="profondita-cantiere" ${profonditaCantiereAttiva ? 'checked' : ''} ${profonditaCantiereM > 0 ? '' : 'disabled'}>
                                    Profondità massima del cantiere${profonditaCantiereM > 0 ? ` (${fmtIT(profonditaCantiereM, 1)} m)` : ' — nessun dato'}
                                </label>
                            </div>
                            ${profonditaAsseAttuale && !profonditaCantiereAttiva ? `<button type="button" class="tpl-editor-menu-btn" data-action="profondita-asse-auto" style="font-weight:800; width:100%; margin-top:-4px;" title="Torna all'adattamento automatico">↺ Torna all'asse automatico</button>` : ''}
                            <div style="font-size:10px; color:var(--text-muted); margin-top:2px; line-height:1.4;">${profonditaCantiereAttiva ? `Tutte le prove di questo cantiere useranno lo stesso fondo scala.` : (profonditaDatoM != null ? `Questa prova arriva a <b>${fmtIT(profonditaDatoM, 1)} m</b>. ` : '') + (profonditaAsseAttuale ? `Asse fisso a ${fmtIT(profonditaAsseAttuale, 1)} m.` : `In automatico l'asse si ferma a <b>${profonditaDatoM != null ? fmtIT(profonditaAsseAutomatica(profonditaDatoM), 2) : '—'} m</b>.`)}</div>
                        </div>
                    </div>

                    <div data-fascia="1">
                        <div class="tpl-editor-menu-sottosezione">Dimensioni</div>
                        <div class="tpl-editor-menu-gruppo">
                            <!-- UN SOLO COMANDO PER L'ALTEZZA. Prima ce n'erano due che si somigliavano
                                 troppo per capire quale si stesse usando: «Ingrandimento» (la scala
                                 generica del blocco, che moltiplicava tutto il disegno) e «Altezza». Il
                                 primo e' sparito per questo tipo di blocco: qui allungare il grafico
                                 significa ridistribuire lo spazio verticale, non ingrandire un'immagine. -->
                            ${htmlControlloNumerico({
                                azione: 'altezza-grafico',
                                etichetta: 'Altezza',
                                unita: '%',
                                valore: altezzaScalaGraficoAttuale,
                                min: 40,
                                max: 300,
                                passo: 5,
                                notaMin: '40%',
                                notaMax: '300%',
                                titolo: 'Quanto e alto il grafico a parita di profondita. Allunga le fasce e la griglia, senza toccare il carattere ne le larghezze'
                            })}
                            ${htmlControlloNumerico({
                                azione: 'larghezza-colonne-grafico',
                                etichetta: 'Larghezza colonne',
                                unita: '%',
                                valore: larghezzaColonneGraficoAttuale,
                                min: 60, max: 300, passo: 5,
                                notaMin: '60%',
                                notaMax: '300%',
                                titolo: 'Quanta della larghezza disponibile va alla colonna del retino e a quella della falda. Lo spazio che prendono lo cedono ai due grafici, non al foglio: l altezza non cambia'
                            })}
                        </div>
                    </div>

                    ${legendaGraficoAttuale === 'colonna' ? `
                    <div data-fascia="1">
                        <div class="tpl-editor-menu-sottosezione">Etichette strati</div>
                        <div class="tpl-editor-menu-gruppo">
                            ${htmlControlloNumerico({
                                azione: 'spazio-etichette-grafico',
                                etichetta: 'Spazio nomi',
                                unita: '%',
                                valore: spazioEtichetteGraficoAttuale,
                                min: 50, max: 300, passo: 5,
                                notaMin: '50%',
                                notaMax: '300%',
                                titolo: 'Larghezza della colonna dei nomi delle litologie: e lo spazio entro cui i nomi vanno a capo'
                            })}
                            <div class="tpl-editor-menu-row">
                                <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer;">
                                    <input type="checkbox" data-action="guida-nomi-grafico" ${guidaNomiAttiva ? 'checked' : ''}>
                                    Mostra il riquadro dei nomi
                                </label>
                            </div>
                            ${guidaNomiAttiva ? htmlSpiegazione('Il riquadro tratteggiato arancione e la larghezza che questo cursore regola: e li dentro che i nomi vanno a capo. Compare solo nell editor, mai in stampa.') : ''}
                        </div>
                    </div>
                    ` : ''}

                    <!-- "Grandezza retini" viveva staccata da "Legenda", in fondo al pannello: le due
                         cose sono lo stesso comando visto da fuori (che aspetto ha la legenda) — ora
                         restano insieme nello stesso gruppo, sempre, anche quando il riordino agisce. -->
                    <div data-fascia="1">
                        <div class="tpl-editor-menu-section-label">Legenda</div>
                        <div class="tpl-editor-menu-row" style="gap:4px;">
                            ${bottoneLegenda('colonna')}${bottoneLegenda('grigliaBasso')}${bottoneLegenda('rigaBasso')}${bottoneLegenda('nessuna')}
                        </div>
                        <div style="font-size:9.5px; color:var(--text-muted); padding:0 2px 2px; line-height:1.35;">${NOMI_LEGENDA[legendaGraficoAttuale]}</div>
                        ${legendaGraficoAttuale !== 'nessuna' ? htmlControlloNumerico({
                            azione: 'retino-legenda-grafico',
                            etichetta: 'Grandezza retini',
                            unita: '%',
                            valore: retinoGraficoAttuale,
                            min: 60, max: 250, passo: 5,
                            notaMin: '60%',
                            notaMax: '250%',
                            titolo: 'Grandezza dei quadratini col retino della litologia nella legenda'
                        }) : ''}
                    </div>
                    ` : ''}
                    ${BLOCCHI_CON_GRIGLIA_TABELLA.has(blk.type) ? `
                    <!-- GRIGLIA TABELLA (richiesta esplicitamente: "disattivare le righe delle
                         tabelle... sono sempre un pugno in un occhio", con l'ipotesi — corretta —
                         che aiuti anche a condensare). Solo per i blocchi che contengono davvero
                         una tabella (vedi BLOCCHI_CON_GRIGLIA_TABELLA): sugli altri sarebbe un
                         controllo senza effetto, peggio che assente. -->
                    <div class="tpl-editor-menu-section-label">Griglia tabella</div>
                    <!-- Icone stile "bordi tabella" di Word (richiesto esplicitamente: "fammi capire
                         che si sta parlando della griglia non solo scrivendolo") sopra l'etichetta
                         di ciascun bottone: una miniatura di tabella con tutte le linee, solo quelle
                         orizzontali, o tratteggiate/sbiadite per "nessuna". -->
                    <div class="tpl-editor-menu-row" style="gap:4px;">
                        ${[['tutti', 'Tutte', 'Griglia completa: righe orizzontali e verticali (comportamento storico)', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9.3h18M3 14.7h18M9 4v16M15 4v16"/>'],
                           ['orizzontali', 'Solo —', 'Via le linee verticali, restano solo quelle orizzontali: molto più leggero da leggere e recupera un filo di larghezza', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9.3h18M3 14.7h18"/>'],
                           ['nessuno', 'Nessuna', 'Nessuna linea: restano solo gli sfondi colorati delle categorie a separare le sezioni. È la scelta che recupera più spazio verticale', '<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9.3h18M3 14.7h18M9 4v16M15 4v16" stroke-dasharray="1.6 1.8" opacity=".4"/>']
                          ].map(([val, etichetta, titolo, svg]) => `<button type="button" class="tpl-editor-menu-btn" data-action="griglia-tabella" data-griglia="${val}" style="flex:1; flex-direction:column; gap:3px; padding:5px 2px; background:${grigliaTabellaAttuale === val ? 'var(--accent)' : 'var(--bg-main)'}; color:${grigliaTabellaAttuale === val ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${grigliaTabellaAttuale === val ? 'var(--accent)' : 'var(--border)'};" title="${titolo}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" style="width:17px; height:17px;">${svg}</svg><span style="font-size:8.5px; font-weight:800;">${etichetta}</span></button>`).join('')}
                    </div>
                    ${grigliaTabellaAttuale !== 'tutti' ? htmlSpiegazione("Meno linee = celle un po' più basse: se questo blocco veniva tagliato, prova a ricontrollare l'anteprima di stampa (🖨️) — potrebbe rientrare.") : ''}
                    ` : ''}
                    ${haLivelloTitolo ? `
                    <div class="tpl-editor-menu-section-label">Livello titolo</div>
                    <div class="tpl-editor-menu-row">
                        ${Object.keys(LIVELLI_TITOLO).map(liv => `<button type="button" class="tpl-editor-menu-btn" data-action="livello-titolo" data-livello="${liv}" style="background:${livelloTitoloAttuale === liv ? 'var(--accent)' : 'var(--bg-main)'}; color:${livelloTitoloAttuale === liv ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${livelloTitoloAttuale === liv ? 'var(--accent)' : 'var(--border)'}; font-weight:800;" title="${LIVELLI_TITOLO[liv].label} — imposta la taglia canonica (${LIVELLI_TITOLO[liv].pt}pt), poi regolabile qui sotto">${LIVELLI_TITOLO[liv].label}</button>`).join('')}
                    </div>
                    ` : ''}
                    ${usaFontInPunti ? `
                    <!-- Era una tendina con le 23 taglie di Word. Non era sbagliata, ma parlava una
                         lingua tutta sua rispetto agli altri controlli, e su un telefono una
                         tendina lunga è una lista da scorrere alla cieca. Stesso componente degli
                         altri: qui la conversione non serve nemmeno, perché il dato salvato È già
                         in punti (blk.fontSizePt). -->
                    ${htmlControlloNumerico({
                        azione: 'fontsize-pt',
                        etichetta: eGraficoStratigrafia ? 'Dimensione etichette' : 'Dimensione carattere',
                        unita: 'pt',
                        valore: fontSizePtAttuale,
                        // Stesso comando, stessa unità, stesso passo degli altri blocchi. Il
                        // grafico ha però un tetto e un pavimento suoi, e non è un capriccio: le
                        // scritte qui sono numeri di tacca dentro pannelli larghi pochi centimetri,
                        // e a 8pt — il minimo della scala di Word, giusto per un paragrafo — non
                        // ci starebbero. Il pavimento più basso è ciò che rende il comando
                        // utilizzabile su questo blocco, non una scala diversa.
                        min: eGraficoStratigrafia ? 4 : TAGLIE_FONT_WORD[0],
                        max: eGraficoStratigrafia ? 16 : TAGLIE_FONT_WORD[TAGLIE_FONT_WORD.length - 1],
                        notaMin: eGraficoStratigrafia ? '4pt' : `${TAGLIE_FONT_WORD[0]}pt`,
                        notaMax: eGraficoStratigrafia ? '16pt' : `${TAGLIE_FONT_WORD[TAGLIE_FONT_WORD.length - 1]}pt`,
                        titolo: 'Taglia in punti, la stessa unità di Word. Il cursore per provare, il campo per scrivere il valore esatto'
                    })}
                    ` : ''}
                    ${haFontRegolabile && !usaFontInPunti ? `
                    <!-- I due tasti Aa−/Aa+ con "115%" accanto sono stati sostituiti dal controllo
                         numerico condiviso (Piano_Controlli_Font, passo 3). Il difetto segnalato era
                         doppio: "poco pratico e scattoso" (scatti fissi da 0.1, nessun modo di
                         arrivare a un valore preciso) e "zero indicazioni sulla vera grandezza"
                         (115% di cosa?). Ora, quando c'è una prova in anteprima da cui misurare, si
                         lavora direttamente in PUNTI — la misura che finisce sulla carta. -->
                    ${htmlControlloNumerico(cfgControlloFontBlocco)}
                    ` : ''}
                    ${haTestoLibero ? `
                    <!-- DUE COMANDI ALLA PARI, NON UNO PRINCIPALE E UNO SECONDARIO (richiesto
                         esplicitamente: «non è genera con la IA... preferisco che siano due tasti
                         equipollenti per priorità e gerarchia. L'uno non esclude l'altro»). Prima
                         "genera-testo" viveva dentro un riquadro giallo "attenzione" — un colore da
                         avviso per un comando che si usa di continuo — e "modifica-testo" era un
                         tasto secondario isolato sotto. Via il riquadro: un risalto TENUE (tinta
                         accento leggera, non colore pieno) sul primo, perché resta il punto di
                         partenza più frequente, un "oppure" a dividerli, "Scrivi"/"Modifica" sempre
                         a un tocco per le eccezioni. Il testo viene SCRITTO nel blocco, non
                         ricalcolato in stampa: così l'anteprima è il documento, per costruzione e
                         non per attenzione. -->
                    <div class="tpl-editor-menu-section-label" data-fascia="1">Contenuto</div>
                    <div style="display:flex; align-items:center; justify-content:space-between; gap:6px; margin:-2px 0 4px;">
                        <span style="font-size:10px; color:var(--text-muted);">Assembla frasi predefinite, differenziando termini e riferimenti al progetto — non è un'intelligenza artificiale.</span>
                        ${contaDatiMancanti(blk.richHtml) > 0 ? `<span class="badge-dati-mancanti" title="Informazioni del cantiere che mancano nel testo: vanno compilate o scritte a mano"><svg class="ico" style="width:11px;height:11px;"><use href="#i-alert"/></svg> ${contaDatiMancanti(blk.richHtml)}</span>` : ''}
                    </div>
                    <select data-action="sezione-modello" style="width:100%; font-size:11.5px; padding:7px 8px; border-radius:7px; border:1px solid var(--border); background:var(--bg-card); color:var(--text-main);">
                        <option value="">— scegli il capitolo da scrivere —</option>
                        ${Object.keys(SEZIONI_MODELLO_INTRODUZIONE).map(k => `<option value="${k}" ${blk.sezioneModello === k ? 'selected' : ''}>${SEZIONI_MODELLO_INTRODUZIONE[k].nome}</option>`).join('')}
                    </select>
                    <button type="button" class="tpl-editor-menu-btn" data-action="genera-testo" ${blk.sezioneModello ? '' : 'disabled'} style="width:100%; margin-top:6px; font-size:12px; font-weight:800; padding:10px 8px; display:flex; align-items:center; justify-content:center; gap:6px; ${blk.sezioneModello ? 'background:rgba(17,190,195,.12); border-color:rgba(17,190,195,.40);' : 'opacity:.4;'}"><svg class="ico ico-dadi" style="width:15px; height:15px; color:var(--accent);"><use href="#i-dadi"/></svg> ${blk.richHtml ? 'Rigenera testo' : 'Genera testo'}</button>
                    ${blk.richHtml && blk.sezioneModello ? `<div style="font-size:10px; color:var(--text-muted); margin-top:4px; line-height:1.45;">Rigenerando esce un'altra combinazione di frasi. Le correzioni fatte a mano andranno perse.</div>` : ''}
                    <div style="display:flex; align-items:center; gap:8px; margin:5px 0;">
                        <span style="flex:1; height:1px; background:var(--border);"></span>
                        <span style="font-size:9px; font-weight:800; color:var(--text-muted); text-transform:uppercase; letter-spacing:0.03em;">oppure</span>
                        <span style="flex:1; height:1px; background:var(--border);"></span>
                    </div>
                    <button type="button" class="tpl-editor-menu-btn" data-action="modifica-testo" style="width:100%; font-size:11.5px; font-weight:700; min-height:38px; display:flex; align-items:center; justify-content:center; gap:6px;"><svg class="ico" style="width:14px; height:14px;"><use href="#i-edit"/></svg> ${blk.richHtml ? 'Modifica' : 'Scrivi'}</button>
                    ` : ''}
                    ${haDivisore ? `
                    <!-- "Altezza spazio" — l'unico motivo per cui questo blocco esiste — finiva
                         ultima di tutto il pannello: bastava la spunta "Spaziatore elastico" accanto
                         per farla classificare come "vincolo" dal riordino a fasce, sotto un'intera
                         sezione "Linea" spesso su "Nessuna". Due gruppi con data-fascia="1" (vedi
                         fasciaDiSezioneMenu): "Spazio" resta in cima, "Linea" (mode+stile+colore+
                         spessore+lunghezza) resta un blocco unico invece di spaccarsi in due. -->
                    <div data-fascia="1">
                        <div class="tpl-editor-menu-section-label">Spazio</div>
                        ${htmlControlloNumerico({
                            azione: 'spacer-height',
                            etichetta: 'Altezza',
                            unita: 'mm',
                            valore: altezzaDivisore,
                            // Pavimento sceso da 2mm a 0,5mm: un divisore serve anche a separare due
                            // blocchi di un soffio, e 2mm su un A4 non sono un soffio.
                            min: 0.5, max: 120, passo: 0.5, decimali: 1,
                            notaMin: '0,5mm', notaMax: '120mm',
                            titolo: elasticoDivisore ? 'Altezza MINIMA: con lo spaziatore elastico acceso il divisore si allunga oltre, fino a riempire la pagina' : 'Quanto spazio vuoto lascia questo blocco'
                        })}
                        <div class="tpl-editor-menu-row">
                            <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer;">
                                <input type="checkbox" data-action="divisore-elastico" ${elasticoDivisore ? 'checked' : ''}>
                                Spaziatore elastico (spingi in fondo)
                            </label>
                        </div>
                        ${elasticoDivisore ? htmlSpiegazione('Questo divisore si prende tutto lo spazio che avanza sulla pagina e spinge in fondo quello che viene dopo — tipicamente il blocco firma. Se il contenuto sopra si allunga, il divisore si accorcia da solo: non c\'è piu\' niente da rimisurare a mano.') : ''}
                    </div>
                    <div data-fascia="1">
                        <div class="tpl-editor-menu-section-label">Linea</div>
                        <div class="tpl-editor-menu-row" style="gap:4px;">
                            ${bottoneLineaDiv('nessuna')}${bottoneLineaDiv('orizzontale')}${bottoneLineaDiv('verticale')}
                        </div>
                        <div style="font-size:9.5px; color:var(--text-muted); padding:0 2px 2px; line-height:1.35;">${NOMI_LINEA_DIV[lineaDivisore]}</div>
                        ${lineaDivisore !== 'nessuna' ? `
                        <div class="tpl-editor-menu-row" style="gap:4px;">
                            ${Object.keys(STILI_LINEA_DIVISORE).map(k => {
                                const on = stileDivisore === k;
                                const tratto = { continua: '────', tratteggiata: '─ ─ ─', punteggiata: '· · · ·', doppia: '═══' }[k];
                                return `<button type="button" class="tpl-editor-menu-btn" data-action="divisore-stile" data-val="${k}" title="${k}" style="flex:1; font-size:11px; letter-spacing:-1px; background:${on ? 'var(--accent)' : 'var(--bg-main)'}; color:${on ? 'var(--on-accent)' : 'var(--text-main)'}; border-color:${on ? 'var(--accent)' : 'var(--border)'};">${tratto}</button>`;
                            }).join('')}
                        </div>
                        <div class="tpl-editor-menu-row" style="gap:4px; flex-wrap:wrap;">
                            ${Object.keys(TINTE_DIVISORE).map(k => {
                                const on = tintaDivisore === k;
                                return `<button type="button" data-action="divisore-tinta" data-val="${k}" title="${TINTE_DIVISORE[k].nome}" style="width:30px; height:22px; padding:0; border-radius:5px; cursor:pointer; border:${on ? '2px solid var(--accent)' : '1px solid var(--border)'}; background:var(--bg-main); display:flex; align-items:center; justify-content:center;"><span style="display:block; width:18px; height:0; border-top:3px solid ${TINTE_DIVISORE[k].colore};"></span></button>`;
                            }).join('')}
                        </div>
                        ${htmlControlloNumerico({
                            azione: 'divisore-spessore',
                            etichetta: 'Spessore',
                            unita: 'px',
                            decimali: 1,
                            valore: spessoreDivisore,
                            min: 0.5, max: 6, passo: 0.5,
                            notaMin: '0,5px', notaMax: '6px',
                            titolo: 'Spessore del filo. Lo stile «doppia» ha bisogno di almeno 3px per mostrare due tratti: sotto, viene alzato da sé'
                        })}
                        ${htmlControlloNumerico({
                            azione: 'divisore-lunghezza',
                            etichetta: 'Lunghezza',
                            unita: '%',
                            valore: lunghezzaDivisore,
                            min: 10, max: 100, passo: 5,
                            notaMin: '10%', notaMax: '100%',
                            titolo: 'Quanto della larghezza (o dell altezza, per la linea verticale) occupa il filo, centrato'
                        })}
                        ` : ''}
                    </div>
                    ` : ''}
                    ${haScheda ? `
                    <!-- Disposizione/Colore/Ordine sono tre facce dello stesso comando "Schede", ma
                         il riordino a fasce le sparpagliava in tre punti diversi del pannello:
                         "Disposizione" restava con i bottoni (scelte), "Colore" scivolava più in
                         basso per via della spunta zebra (vincoli), "Ordine" finiva ultima di tutte
                         perché il suo bottone di reset è marcato come azione rara. Un solo gruppo con
                         data-fascia="1" (vedi fasciaDiSezioneMenu) le tiene insieme, sempre. -->
                    <div data-fascia="1">
                        <div class="tpl-editor-menu-section-label">Schede</div>

                        <div class="tpl-editor-menu-sottosezione">Disposizione</div>
                        <div class="tpl-editor-menu-gruppo">
                            <div class="tpl-editor-menu-row" style="gap:4px;">
                                ${bottoneDisposizione('v')}${bottoneDisposizione('h3')}${bottoneDisposizione('h2')}
                            </div>
                            <div style="font-size:9.5px; color:var(--text-muted); padding:0 2px 2px; line-height:1.35;">${NOMI_DISPOSIZIONE[dispSchede]}</div>
                        </div>

                        <div class="tpl-editor-menu-sottosezione">Colore</div>
                        <div class="tpl-editor-menu-gruppo">
                            <div class="tpl-editor-menu-row" style="gap:4px; flex-wrap:wrap;">
                                ${Object.keys(TINTE_DATI_PROVA).map(k => {
                                    const t = TINTE_DATI_PROVA[k], on = tintaSchede === k;
                                    return `<button type="button" data-action="schede-tinta" data-val="${k}" title="${t.nome}" style="width:26px; height:22px; padding:0; border-radius:5px; cursor:pointer; border:${on ? '2px solid var(--accent)' : '1px solid var(--border)'}; background:linear-gradient(to bottom, ${t.sfondo} 0 50%, ${t.alt} 50% 100%);"></button>`;
                                }).join('')}
                            </div>
                            <div class="tpl-editor-menu-row">
                                <label style="display:flex; align-items:center; gap:6px; font-size:11px; cursor:pointer;">
                                    <input type="checkbox" data-action="schede-zebra" ${zebraSchede ? 'checked' : ''}>
                                    Righe a colore alternato
                                </label>
                            </div>
                        </div>

                        <div class="tpl-editor-menu-sottosezione" style="justify-content:space-between; padding-right:2px;">
                            <span style="display:flex; align-items:center; gap:5px;"><span style="width:5px; height:5px; border-radius:50%; background:var(--accent); flex-shrink:0;"></span>Ordine</span>
                            <button type="button" data-action="schede-ordine-reset" title="Rimetti l'ordine originale"
                                style="border:none; background:none; cursor:pointer; padding:2px 4px; color:var(--text-muted); display:flex; align-items:center; opacity:${ordineSchede.some((v, i) => v !== i) ? '1' : '0.35'};">
                                <svg class="ico" style="width:13px; height:13px;"><use href="#i-reset"/></svg></button>
                        </div>
                        <div class="tpl-editor-menu-gruppo">
                            <!-- FRECCE ▲▼ SOSTITUITE DAL TRASCINAMENTO. Due bottoncini da 12px, uno sopra
                                 l'altro, su un telefono si sbagliano: il bersaglio e' piu' piccolo del
                                 polpastrello e la conferma di aver colpito quello giusto arriva solo dopo.
                                 Trascinare dice cosa sta succedendo MENTRE succede, e la scheda si accende
                                 anche sul foglio, cosi' si sposta guardando il documento e non l'elenco. -->
                            <div class="tpl-editor-menu-row tpl-schede-lista" data-lista-schede style="flex-direction:column; align-items:stretch; gap:4px;">
                                ${ordineSchede.map((idx, pos) => `
                                    <div class="tpl-scheda-voce" data-voce-scheda data-pos="${pos}" data-idx="${idx}">
                                        <svg class="ico tpl-scheda-grip" style="width:14px; height:14px;"><use href="#i-grip"/></svg>
                                        <span>${NOMI_SCHEDE_MENU[idx]}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    ` : ''}
                    <!-- QUI C'ERA IL TASTIERINO A FRECCE per spostare la mappa di mezza tessera
                         alla volta. Era esattamente il difetto segnalato — "rende il puntamento
                         dell'area scattoso e poco preciso" — reso comando: nel compositore la
                         mappa si trascina col dito, in continuo. Un tasto che salta di 128 px
                         accanto a un trascinamento fluido non e' una scorciatoia, e' un residuo. -->
                    ${haSceltaFoto ? `
                    <div class="tpl-editor-menu-section-label">Foto da mostrare</div>
                    <div class="tpl-editor-menu-row">
                        <select data-action="foto-indice" style="width:100%; font-size:11.5px; padding:4px 5px; border:1px solid var(--border); border-radius:6px; background:var(--bg-main); color:var(--text-main);">
                            <option value="" ${fotoIndiceManuale === null ? 'selected' : ''}>Automatica (in base all'ordine nel layout)</option>
                            ${Array.from({ length: totaleFotoDisponibili }, (_, i) => i).map(i => `<option value="${i}" ${fotoIndiceManuale === i ? 'selected' : ''}>${i + 1}ª foto della prova</option>`).join('')}
                        </select>
                    </div>
                    ${totaleFotoDisponibili === 0 ? `<div style="font-size:10px; color:var(--text-muted); margin:-2px 0 2px;">Questa prova non ha ancora foto in galleria.</div>` : ''}
                    ` : ''}
                    ${haDidascalia ? `
                    <div class="tpl-editor-menu-section-label">Didascalia</div>
                    <div class="tpl-editor-menu-row" style="flex-direction:column; align-items:stretch; gap:4px;">
                        <input type="text" data-action="caption" placeholder="${escapeHtmlDidascalia(didascaliaAuto)}" value="${escapeHtmlDidascalia(blk.captionOverride || '')}" style="width:100%; box-sizing:border-box; font-size:11px; padding:5px 7px; border:1px solid var(--border); border-radius:6px; background:var(--bg-main); color:var(--text-main);">
                        ${blk.captionOverride ? `<button type="button" class="tpl-editor-menu-btn" data-action="caption-reset" style="font-size:10px; width:100%;">Reimposta automatica</button>` : ''}
                    </div>
                    ${htmlControlloNumerico({
                        azione: 'caption-fontsize-pt',
                        etichetta: 'Dimensione didascalia',
                        unita: 'pt',
                        valore: captionFontSizePtAttuale,
                        min: TAGLIE_FONT_WORD[0],
                        // 24pt resta il tetto storico: una didascalia più grande del titolo che
                        // sta sopra non è una scelta di impaginazione, è un errore.
                        max: 24,
                        notaMin: `${TAGLIE_FONT_WORD[0]}pt`,
                        notaMax: '24pt',
                        titolo: 'Dimensione del testo della didascalia, indipendente dall\'altezza del contenuto sopra'
                    })}
                    ` : ''}
                    ${elencoCategorieFlowable.length > 0 ? `
                    <!-- SEZIONE INTERRUZIONI: su mobile è una SECONDA PAGINA del pannello (vedi la
                         classe .solo-interruzioni). Segnalato: "non è assolutamente servibile,
                         evidentemente coperta dalle schermate, c'è solo un minuscolo lembo
                         scorrevole". Con 11 categorie dentro un foglio già pieno di altri comandi
                         restavano ~60px: non era un difetto grafico, era aritmetica.
                         La sezione NON viene duplicata in un pannello a parte: è lo stesso elemento
                         che passa in primo piano, nascondendo il resto del menu. Così tutti i "+" e
                         le ✕ restano agganciati ai loro gestori senza doverli ricollegare, e non
                         esiste una seconda copia della lista da tenere allineata alla prima. -->
                    <div class="tpl-editor-interr-sezione">
                    <!-- PAGINA 1: una sola riga che riassume e porta altrove. Sostituisce il vecchio
                         bottone "A tutto schermo", che era una MODALITÀ dello stesso schermo — questa
                         è una NAVIGAZIONE, e si legge come tale grazie al chevron. Due vantaggi
                         concreti: nel menu normale la sezione occupa una riga invece di mezzo
                         pannello, e il riassunto dice già quante pagine servono senza doverla aprire. -->
                    <button type="button" class="tpl-editor-interr-riepilogo" data-action="espandi-interruzioni" title="Apri l'elenco delle categorie per scegliere dove spezzare la tabella">
                        <span class="tpl-editor-interr-riepilogo-titolo">⚡ Interruzioni di pagina</span>
                        <span class="tpl-editor-interr-riepilogo-valore">${Math.max(1, segmentiPagina.length)} pagin${Math.max(1, segmentiPagina.length) === 1 ? 'a' : 'e'}${avvisiOverflowBlocco.some(g => g.supera) ? ' <span style="color:#f87171;">⚠</span>' : ''}</span>
                        <span class="tpl-editor-interr-riepilogo-freccia">›</span>
                    </button>
                    <!-- PAGINA 2: compare al posto del resto del menu, scorrendo da destra. -->
                    <div class="tpl-editor-interr-pagina2">
                    <div class="tpl-editor-interr-testata">
                        <button type="button" class="tpl-editor-interr-chiudi" data-action="riduci-interruzioni" title="Torna al menu del blocco">‹</button>
                        <span>Interruzioni di pagina</span>
                    </div>
                    <div class="tpl-editor-interr-intro" style="font-size:10px; color:var(--text-muted); margin:-2px 0 2px;">Senza interruzioni tutte le categorie restano su una pagina sola (che può traboccare se sono tante). Tocca "+" tra due categorie per far iniziare lì una pagina nuova — il numero "P.N" su ogni riga dice subito su quale pagina finisce.</div>
                    <div class="tpl-editor-interr-list" style="display:flex; flex-direction:column; gap:0; max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:6px; padding:5px;">
                        ${(() => {
                            // Contatore di pagina live (richiesto esplicitamente: "così già dall'anteprima
                            // avessi un'idea precisa del risultato") — si incrementa ogni volta che questo
                            // stesso elenco (indiciRotturaPagina, calcolato dall'ultimo giro REALE di
                            // sincronizzaFlussiBlocchiLunghi) segna un'interruzione prima della categoria
                            // corrente, sia essa automatica ("spazio esaurito") o manuale ("+"): il badge
                            // "P.N" su ogni categoria mostra quindi sempre la pagina VERA in cui finirà,
                            // non una stima — se il calcolo a monte è sbagliato lo sarà anche qui, ma
                            // almeno l'utente lo vede subito invece di doverlo dedurre contando i separatori.
                            let paginaCorrenteMenu = 1;
                            // FASE C (vedi Piano_Riscrittura_Layout_Export.md): "P.N" sopra conta solo i
                            // gruppi tra interruzioni MANUALI — dice sempre in quale gruppo cade una
                            // categoria, ma MAI se quel gruppo sta davvero in una pagina fisica. Qui si
                            // legge la cache di ricalcolaAvvisiOverflowTuttiBlocchi (misura reale, stesso
                            // iframe di stampa del motore di export): se un gruppo supera lo spazio di una
                            // pagina, è garantito che la stampa nativa lo taglierà in un punto scelto dal
                            // browser, non dall'utente — qui sotto diventa un avviso rosso ovvio invece di
                            // restare un problema invisibile fino al PDF finale (avvisiOverflowBlocco
                            // calcolato più sopra, condiviso anche col totale in fondo alla lista).
                            // Millimetri accumulati sulla pagina che si sta riempiendo: quando arriva
                            // un'interruzione, questo è quanto era piena la pagina che si chiude —
                            // il numero che dice se hai tagliato troppo presto (pagina mezza vuota) o
                            // troppo tardi (pagina che trabocca).
                            let mmPaginaCorrente = 0;
                            return elencoCategorieFlowable.map((c, i) => {
                                // Quanto pesa QUESTA categoria, in millimetri di carta reali. È il
                                // numero che mancava per scegliere dove tagliare senza andare a
                                // tentativi: sommando a mente due o tre righe si sa già se stanno
                                // insieme in una pagina. Sotto 1mm si scrive "<1" invece di "0mm",
                                // che sembrerebbe un errore di calcolo.
                                const mmCat = mmDiCategoria(c.indice);
                                let mmPaginaChiusa = null;
                                if (i > 0 && indiciRotturaPagina.has(c.indice)) {
                                    paginaCorrenteMenu++;
                                    mmPaginaChiusa = mmPaginaCorrente;
                                    mmPaginaCorrente = 0;
                                }
                                mmPaginaCorrente += (mmCat || 0);
                                const colore = coloreCategoriaBlocco(blk.type, c.indice);
                                const gruppoInizioQui = avvisiOverflowBlocco.find(g => g.da === c.indice);
                                const avvisoOverflow = (gruppoInizioQui && gruppoInizioQui.supera) ? `<div style="display:flex; align-items:flex-start; gap:6px; margin:${i === 0 ? '0' : '3px'} 0 4px; padding:5px 7px; border-radius:5px; background:#fee2e2; border:1px solid #fca5a5;">
                                        <svg class="ico" style="width:13px; height:13px; flex-shrink:0; margin-top:1px; color:#b91c1c;"><use href="#i-alert"/></svg>
                                        <div style="display:flex; flex-direction:column; gap:5px; min-width:0;">
                                            <span style="font-size:10px; color:#991b1b; line-height:1.4;"><b>Non entra in una pagina sola</b> — misurato ${Math.round(gruppoInizioQui.mmTotali)}mm reali, servono almeno ${gruppoInizioQui.paginePreviste} pagine fisiche. Senza un'interruzione qui in mezzo, la stampa lo taglierà dove capita, non dove scegli tu.</span>
                                            <!-- L'avviso ora offre anche la via d'uscita: i millimetri
                                                 per calcolare i tagli sono già tutti misurati, chiedere
                                                 all'utente di indovinarli era lavoro inutile. -->
                                            ${limitePaginaMenuMm > 0 ? `<div style="display:flex; gap:5px; flex-wrap:wrap;">
                                                <button type="button" class="tpl-editor-dividi-btn" data-action="dividi-gruppo" data-gruppo-da="${gruppoInizioQui.da}" data-gruppo-a="${gruppoInizioQui.a}" title="Calcola dai millimetri già misurati dove cadono i tagli e inserisce le interruzioni">✂ Dividi tu al posto mio</button>
                                                <button type="button" class="tpl-editor-dividi-btn" data-action="condensa-blocco" title="Prova impostazioni di altezza righe e carattere via via più strette, misurandole davvero, e sceglie la meno aggressiva che fa stare il blocco nel minor numero di pagine">🗜 Condensa al minimo</button>
                                            </div>` : ''}
                                        </div>
                                    </div>` : '';
                                // Caso limite che vale la pena distinguere: una SINGOLA categoria più
                                // alta di una pagina intera. Nessuna interruzione può sistemarla —
                                // l'unica strada è ridurre altezza righe o font. Segnalarla in rosso
                                // qui evita di farti provare "+" in ogni punto senza risultato.
                                const catNonEntraDaSola = mmCat !== null && limitePaginaMenuMm > 0 && mmCat > limitePaginaMenuMm;
                                const badgeMm = mmCat === null ? '' : `<span class="tpl-editor-interr-mm" style="flex-shrink:0; font-size:9px; font-weight:700; color:${catNonEntraDaSola ? '#b91c1c' : 'var(--text-muted)'};" title="${catNonEntraDaSola
                                    ? `Questa categoria da sola misura ${Math.round(mmCat)}mm e non entra in una pagina (${Math.round(limitePaginaMenuMm)}mm utili): nessuna interruzione può risolverlo, serve ridurre altezza righe o dimensione testo`
                                    : `Questa categoria occupa ${Math.round(mmCat)}mm dei ${Math.round(limitePaginaMenuMm)}mm utili di una pagina`}">${catNonEntraDaSola ? '⚠ ' : ''}${mmCat < 1 ? '&lt;1' : Math.round(mmCat)}mm</span>`;
                                const chip = `<div class="tpl-editor-interr-chip" style="display:flex; align-items:center; gap:6px; padding:4px 7px; border-radius:5px; background:#${colore}2E; border-left:4px solid #${colore};">
                                    <span class="tpl-editor-interr-badge" style="flex-shrink:0; font-size:9px; font-weight:800; color:var(--text-muted); background:var(--bg-card); border:1px solid var(--border); border-radius:999px; padding:1px 6px;" title="Questa categoria finisce sulla pagina ${paginaCorrenteMenu} del blocco">P.${paginaCorrenteMenu}</span>
                                    <span style="flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:11px; color:var(--text-main);">${escapeHtmlDidascalia(c.etichetta)}</span>
                                    ${badgeMm}
                                </div>`;
                                if (i === 0) return avvisoOverflow + chip;
                                let gap;
                                if (indiciRotturaPagina.has(c.indice)) {
                                    const manuale = categorieForzatePrima.includes(c.indice);
                                    // Riempimento della pagina che si CHIUDE qui (non di quella che
                                    // inizia): è il metro per capire se il taglio è nel punto giusto.
                                    // 118/272mm ti dice che quella pagina resta mezza vuota e forse
                                    // conviene spostare l'interruzione più in basso.
                                    const riempimento = (mmPaginaChiusa !== null && limitePaginaMenuMm > 0)
                                        ? `<span class="tpl-editor-interr-riempimento" style="flex-shrink:0; font-weight:700; opacity:.85;" title="La pagina ${paginaCorrenteMenu - 1} si chiude riempita per ${Math.round(mmPaginaChiusa)}mm sui ${Math.round(limitePaginaMenuMm)}mm utili">${Math.round(mmPaginaChiusa)}/${Math.round(limitePaginaMenuMm)}mm</span>`
                                        : '';
                                    gap = manuale
                                        ? `<div class="tpl-editor-interr-divider" style="display:flex; align-items:center; gap:5px; margin:3px 0; font-size:9.5px; color:#2563eb; font-weight:600;">
                                            <span style="flex:1; border-top:1.5px dashed #2563eb;"></span>
                                            ${riempimento}
                                            <span>✂ pagina ${paginaCorrenteMenu} (manuale)</span>
                                            <button type="button" class="tpl-editor-interr-remove-btn" data-action="rimuovi-forza-pagina" data-categoria-indice="${c.indice}" title="Rimuovi questa interruzione manuale" style="border:none; background:none; cursor:pointer; color:#2563eb; font-size:12px; line-height:1; padding:1px 3px; flex-shrink:0;">✕</button>
                                            <span style="flex:1; border-top:1.5px dashed #2563eb;"></span>
                                        </div>`
                                        : `<div class="tpl-editor-interr-divider" style="display:flex; align-items:center; gap:5px; margin:3px 0; font-size:9.5px; color:var(--text-muted);">
                                            <span style="flex:1; border-top:1px dashed var(--border);"></span>
                                            ${riempimento}
                                            <span>pagina ${paginaCorrenteMenu} · spazio esaurito</span>
                                            <span style="flex:1; border-top:1px dashed var(--border);"></span>
                                        </div>`;
                                } else {
                                    gap = `<button type="button" class="tpl-editor-interr-add-btn" data-action="forza-pagina-categoria" data-categoria-indice="${c.indice}" title="Inserisci qui un'interruzione di pagina" style="display:flex; align-items:center; gap:5px; width:100%; border:none; background:none; cursor:pointer; padding:2px 0; margin:0; color:var(--text-muted);">
                                            <span style="flex:1; border-top:1px dashed transparent;"></span>
                                            <span class="tpl-editor-interr-plus-glyph" style="font-size:12px; line-height:1;">+</span>
                                            <span style="flex:1; border-top:1px dashed transparent;"></span>
                                        </button>`;
                                }
                                return gap + avvisoOverflow + chip;
                            }).join('');
                        })()}
                    </div>
                    ${elencoCategorieFlowable.length > 1 ? `<div style="font-size:10px; color:var(--text-muted); margin-top:3px; text-align:right;">Totale: ${Math.max(1, segmentiPagina.length)} pagin${Math.max(1, segmentiPagina.length) === 1 ? 'a' : 'e'} per questo blocco${(mmTotaliBlocco > 0 && limitePaginaMenuMm > 0) ? ` · ${Math.round(mmTotaliBlocco)}mm di contenuto, ${Math.ceil(mmTotaliBlocco / limitePaginaMenuMm)} pagin${Math.ceil(mmTotaliBlocco / limitePaginaMenuMm) === 1 ? 'a' : 'e'} nel caso migliore` : ''}</div>` : ''}
                    ${avvisiOverflowBlocco.some(g => g.supera) ? `<div style="font-size:10px; color:#b91c1c; font-weight:700; margin-top:2px; text-align:right;">⚠ almeno ${avvisiOverflowBlocco.reduce((s, g) => s + g.paginePreviste, 0)} pagine fisiche reali probabili (misurate)</div>` : ''}
                    </div>
                    </div>
                    ` : ''}
                    <button type="button" class="tpl-editor-menu-sposta" data-action="sposta-blocco">
                        <svg class="ico"><use href="#i-move-y"/></svg>
                        <span class="sp-testo"><span class="sp-verbo">Sposta blocco</span><span class="sp-nota">portalo su un'altra pagina</span></span>
                    </button>
                    <button type="button" class="tpl-editor-menu-remove pericolo" data-action="remove">
                        <svg class="ico"><use href="#i-trash"/></svg>
                        <span class="sp-testo"><span class="sp-verbo">Rimuovi blocco</span><span class="sp-nota">toglilo dal template</span></span>
                    </button>
                `;
                // Prima di attaccarlo: raggruppa i comandi in schede (solo mobile). Va fatto qui,
                // sul menu ancora staccato dal documento, così l'utente non vede il rimescolamento.
                // "Rimuovi blocco" nella tendina ⋮ PRIMA dello smistamento in schede: così non
                // finisce in una scheda a caso, e la coda del menu resta libera.
                // Un solo gestore per tutte le ℹ️ del pannello, agganciato per delega: le
                // spiegazioni possono comparire e sparire con lo stato del blocco, e riagganciarle
                // una per una a ogni ricostruzione sarebbe lavoro inutile.
                menu.addEventListener('click', (e) => {
                    const info = e.target && e.target.closest ? e.target.closest('[data-action="spiegazione"]') : null;
                    // L'opzione si chiama "title", non "titolo": scriverla in italiano l'avrebbe
                    // fatta ignorare in silenzio, lasciando il dialogo senza intestazione.
                    if (info) appDialog(info.dataset.testo || '', { title: 'Cosa vuol dire' });
                });
                spostaRimuoviNelMenuAltro(menu);
                organizzaMenuInSchede(menu);
                hostFloatingUiEditor().appendChild(menu);
                attivaTrasparenzaMenuDuranteRegolazione(menu);
                if (menuBloccoPosizioneManuale && menuBloccoPosizioneManuale.blockId === blockId) {
                    // Stesso blocco di prima e l'utente aveva già spostato il popover a mano in
                    // questa sessione di modifica: resta lì invece di tornare ad ancorarsi al blocco.
                    // Ri-clampato ai bordi: il contenuto può cambiare altezza da un'apertura
                    // all'altra (es. attivando i toponimi compaiono due slider in più), quindi la
                    // posizione salvata potrebbe non stare più tutta a video con le nuove dimensioni.
                    const mw = menu.offsetWidth || 220;
                    const mh = menu.offsetHeight || 160;
                    const left = Math.max(8, Math.min(window.innerWidth - mw - 8, menuBloccoPosizioneManuale.left));
                    const top = Math.max(8, Math.min(window.innerHeight - mh - 8, menuBloccoPosizioneManuale.top));
                    menu.style.left = left + 'px';
                    menu.style.top = top + 'px';
                } else {
                    menuBloccoPosizioneManuale = null;
                    posizionaMenuBloccoEditor(menu, ancoraEl);
                }
                attivaTrascinamentoMenuBloccoEditor(menu, blockId);

                if (scorrimentoPrecedente) {
                    // Ripreso SUBITO, prima che il browser dipinga: assegnare scrollTop qui dentro
                    // significa che il pannello nuovo nasce gia' alla quota giusta. Rimandarlo a
                    // un rAF farebbe vedere un fotogramma in cima e poi un salto — che e' proprio
                    // lo scatto da cui nasce la segnalazione.
                    menu.scrollTop = scorrimentoPrecedente.menu;
                    const pannelloAttivo = menu.querySelector('.tpl-editor-menu-pannello.attiva');
                    if (pannelloAttivo) pannelloAttivo.scrollTop = scorrimentoPrecedente.pannello;
                    // La soppressione dell'entrata dura un fotogramma: serve solo a non far
                    // rigiocare l'animazione al pannello appena costruito. Tolta subito dopo, il
                    // cambio scheda continua ad avere il suo accenno di movimento — quello e'
                    // un passaggio vero fra due contenuti diversi, e li' l'animazione dice qualcosa.
                    requestAnimationFrame(() => requestAnimationFrame(() => menu.classList.remove('e-senza-entrata')));
                }

                const btnCollassaMenu = menu.querySelector('[data-action="collapse-menu"]');
                if (btnCollassaMenu) {
                    btnCollassaMenu.addEventListener('click', (e) => {
                        e.stopPropagation();
                        collassaMenuBloccoEditor(blockId);
                    });
                }

                // Toggle "Ripeti intestazione" RIMOSSO (richiesto esplicitamente, poi corretto: "non
                // deve mai ripetersi l'intestazione") — il titolo tabella/info prova NON si ripete
                // mai più, compare una sola volta sulla pagina di origine (vedi
                // data-titolo-tabella-blocco in htmlTabellaDettagliata e il filtro in
                // filtraCategorieHtmlFlowable/miniaturaPaginaContinuazione). Nessuna eccezione,
                // nessun toggle.

                // "Superpotere" interruzione di pagina manuale per categoria (richiesto
                // esplicitamente, poi ridisegnato con colori/segmenti-pagina: "possiamo far capire
                // in automatico al sistema dove dovrebbe andare l'interruzione pagina? e solo dopo
                // far scegliere all'utente?"). Il "+" tra due categorie (mostrato SOLO dove non c'è
                // già un'interruzione, automatica o manuale) AGGIUNGE un'interruzione manuale lì; la
                // "✕" (mostrata SOLO sulle interruzioni manuali, mai su quelle automatiche — quelle
                // nascono dallo spazio reale, non si tolgono a mano) la RIMUOVE. Il taglio effettivo
                // lo ricalcola sincronizzaFlussiBlocchiLunghi al prossimo render (già agganciata al
                // render tail, non serve richiamarla qui).
                // Navigazione alla "seconda pagina" del pannello (la sola sezione interruzioni).
                // menuInterruzioniEspanso è la pagina corrente ed è memorizzato FUORI da questa
                // funzione perché il menu viene RICOSTRUITO da zero ad ogni azione (ogni "+"
                // richiama apriMenuBloccoEditor): senza, aggiungere un'interruzione ti riporterebbe
                // indietro di una pagina ad ogni tocco, che è il contrario di quello che serve
                // quando ne stai sistemando diverse di fila.
                const btnEspandiInterr = menu.querySelector('[data-action="espandi-interruzioni"]');
                if (btnEspandiInterr) btnEspandiInterr.addEventListener('click', () => {
                    menuInterruzioniEspanso = true;
                    menu.classList.add('solo-interruzioni');
                    triggerVibrate(10);
                });
                const btnRiduciInterr = menu.querySelector('[data-action="riduci-interruzioni"]');
                if (btnRiduciInterr) btnRiduciInterr.addEventListener('click', () => {
                    menuInterruzioniEspanso = false;
                    menu.classList.remove('solo-interruzioni');
                    applicaAltezzaMenuMobile(menu);
                    triggerVibrate(10);
                    portaBloccoSopraIlMenu(menu);
                });
                menu.querySelectorAll('[data-action="forza-pagina-categoria"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        const idx = parseInt(btn.dataset.categoriaIndice, 10);
                        const arr = Array.isArray(blk2.categorieForzaPaginaPrima) ? blk2.categorieForzaPaginaPrima.slice() : [];
                        if (!arr.includes(idx)) arr.push(idx);
                        blk2.categorieForzaPaginaPrima = arr;
                        // Hai messo un'interruzione a mano: da qui in poi comandi tu su questo
                        // blocco. Vedi riapplicaDivisioneAutomatica.
                        blk2.divisioneAutomaticaSospesa = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                // "Dividi tu al posto mio": calcola i tagli dai millimetri già misurati e li applica.
                // Agisce SOLO dentro il gruppo dell'avviso su cui hai premuto, non su tutto il
                // blocco: le interruzioni che avevi messo a mano altrove sono decisioni tue e non
                // vanno riscritte da un automatismo.
                menu.querySelectorAll('[data-action="dividi-gruppo"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        const da = parseInt(btn.dataset.gruppoDa, 10);
                        const a = parseInt(btn.dataset.gruppoA, 10);
                        if (isNaN(da) || isNaN(a)) return;
                        const indiciGruppo = elencoCategorieFlowable
                            .map(c => c.indice)
                            .filter(i => i >= da && i <= a);
                        const { tagli, nonRisolvibili } = suddividiGruppoCategorie(indiciGruppo, mmDiCategoria, limitePaginaMenuMm);
                        if (tagli.length === 0) {
                            // Può succedere davvero: un gruppo di UNA sola categoria più alta di una
                            // pagina. Dirlo è più utile che non far niente in silenzio.
                            mostraToastTemplateEditor(nonRisolvibili.length > 0
                                ? 'Nessun taglio possibile: una categoria da sola supera la pagina. Riduci altezza righe o dimensione testo.'
                                : 'Non serve nessun taglio qui.');
                            return;
                        }
                        salvaUndoSnapshotEditor();
                        // Premere il tasto è una richiesta esplicita: riattiva l'automatismo anche
                        // se l'avevi messo a tacere correggendo i tagli a mano.
                        delete blk2.divisioneAutomaticaSospesa;
                        const arr = Array.isArray(blk2.categorieForzaPaginaPrima) ? blk2.categorieForzaPaginaPrima.slice() : [];
                        tagli.forEach(i => { if (!arr.includes(i)) arr.push(i); });
                        blk2.categorieForzaPaginaPrima = arr;
                        // Si annota QUALI tagli sono miei: quando cambierai altezza righe o
                        // carattere, saranno questi a essere rifatti — i tuoi restano dove sono.
                        const auto = Array.isArray(blk2.tagliAutomatici) ? blk2.tagliAutomatici.slice() : [];
                        tagli.forEach(i => { if (!auto.includes(i)) auto.push(i); });
                        blk2.tagliAutomatici = auto;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                        triggerVibrate(12);
                        mostraToastTemplateEditor(nonRisolvibili.length > 0
                            ? `${tagli.length} interruzion${tagli.length === 1 ? 'e inserita' : 'i inserite'}, ma ${nonRisolvibili.length} categori${nonRisolvibili.length === 1 ? 'a supera' : 'e superano'} da sola una pagina intera: lì serve ridurre il testo.`
                            : `${tagli.length} interruzion${tagli.length === 1 ? 'e inserita' : 'i inserite'}: ora ogni pagina ci sta.`);
                    });
                });
                // "Condensa al minimo": la ricetta che facevi a mano — altezza righe giù, e solo se
                // non basta anche il carattere — provata davvero, misurazione dopo misurazione.
                menu.querySelectorAll('[data-action="condensa-blocco"]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        // Ogni tentativo è una misurazione vera: si avvisa, e si blocca il tasto
                        // per non far partire due ricerche sovrapposte sullo stesso blocco.
                        btn.disabled = true;
                        const testoOriginale = btn.textContent;
                        btn.textContent = '⏳ Misuro…';
                        let migliore = null;
                        try {
                            migliore = await condensaBloccoPerPagineMinime(blk2);
                        } catch (e) {
                            ignoraErrore('condensa blocco', e);
                        }
                        btn.disabled = false;
                        btn.textContent = testoOriginale;
                        if (!migliore) { mostraToastTemplateEditor('Non sono riuscito a misurare questo blocco.'); return; }
                        const blkVivo = trovaBloccoPerId(paginaOrigineBlocco(blockId), blockId);
                        if (!blkVivo) return;
                        const rigaPrima = blkVivo.rigaScale || 1;
                        const fontPrima = blkVivo.fontScale || 1;
                        const nienteDaFare = Math.abs(migliore.rigaScale - rigaPrima) < 0.001
                            && Math.abs(migliore.fontScale - fontPrima) < 0.001
                            && migliore.tagli.length === (Array.isArray(blkVivo.tagliAutomatici) ? blkVivo.tagliAutomatici.length : 0);
                        if (nienteDaFare) {
                            mostraToastTemplateEditor(`Già al minimo: ${migliore.pagine} pagin${migliore.pagine === 1 ? 'a' : 'e'} con queste dimensioni.`
                                + (migliore.pagine > migliore.pagineTeoriche
                                    ? ` Il contenuto ne occuperebbe ${migliore.pagineTeoriche} (${Math.round(migliore.mmTotali)}mm su ${Math.round(migliore.limiteMm)}mm per pagina): il resto è spazio perso ai confini fra categorie.`
                                    : ''));
                            return;
                        }
                        salvaUndoSnapshotEditor();
                        blkVivo.rigaScale = migliore.rigaScale;
                        blkVivo.fontScale = migliore.fontScale;
                        // I tagli trovati diventano quelli automatici: da qui l'automatismo resta
                        // attivo e li rifarà se cambierai ancora le dimensioni.
                        const automaticiVecchi = Array.isArray(blkVivo.tagliAutomatici) ? blkVivo.tagliAutomatici : [];
                        const manuali = (Array.isArray(blkVivo.categorieForzaPaginaPrima) ? blkVivo.categorieForzaPaginaPrima : [])
                            .filter(i => !automaticiVecchi.includes(i));
                        blkVivo.categorieForzaPaginaPrima = manuali.concat(migliore.tagli).sort((x, y) => x - y);
                        blkVivo.tagliAutomatici = migliore.tagli;
                        delete blkVivo.divisioneAutomaticaSospesa;
                        templateEditorState.flowSyncNecessario = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                        triggerVibrate(12);
                        // Il messaggio dice anche il minimo teorico quando è più basso di quello
                        // raggiunto: la differenza è spazio sprecato ai confini fra categorie, e
                        // saperlo ti dice se conviene insistere a mano o se il limite è la struttura
                        // del contenuto (categorie che da sole riempiono quasi un foglio).
                        const sprecoPagine = migliore.pagine - migliore.pagineTeoriche;
                        mostraToastTemplateEditor(`${migliore.pagine} pagin${migliore.pagine === 1 ? 'a' : 'e'} con righe al ${Math.round(migliore.rigaScale * 100)}% e testo al ${Math.round(migliore.fontScale * 100)}%.`
                            + (sprecoPagine > 0
                                ? ` Il contenuto ne occuperebbe ${migliore.pagineTeoriche}: ${sprecoPagine} in più ${sprecoPagine === 1 ? 'nasce' : 'nascono'} dai confini fra categorie, che non si spezzano. Prova a spostare i tagli a mano.`
                                : ' È il minimo possibile con queste categorie.')
                            + ' Puoi correggere tutto a mano.');
                    });
                });
                menu.querySelectorAll('[data-action="rimuovi-forza-pagina"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        const idx = parseInt(btn.dataset.categoriaIndice, 10);
                        const arr = Array.isArray(blk2.categorieForzaPaginaPrima) ? blk2.categorieForzaPaginaPrima.slice() : [];
                        const pos = arr.indexOf(idx);
                        if (pos !== -1) arr.splice(pos, 1);
                        blk2.categorieForzaPaginaPrima = arr;
                        // Se stai togliendo un taglio che avevo messo io, smetto di considerarlo
                        // mio: altrimenti al prossimo ricalcolo te lo rimetterei lì, che è il modo
                        // più sicuro per far odiare un automatismo.
                        if (Array.isArray(blk2.tagliAutomatici)) {
                            blk2.tagliAutomatici = blk2.tagliAutomatici.filter(i => i !== idx);
                        }
                        blk2.divisioneAutomaticaSospesa = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });

                menu.querySelectorAll('.tpl-editor-menu-align').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const voce2 = trovaVoceContenenteBlocco(page2, blockId);
                        if (!voce2) return;
                        salvaUndoSnapshotEditor();
                        voce2.align = btn.dataset.align;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                // Larghezza unificata (richiesta esplicitamente, ripensamento radicale: un solo
                // controllo al posto di Colonne+Compattezza+Espandi separati): un numero 0-100%
                // che è ALLO STESSO TEMPO il colSpan (in frazione della griglia) e la decisione se
                // la colonna si espande sullo spazio vuoto — a 100% si espande (comportamento
                // storico di default), sotto 100% resta fissa alla sua frazione, mai più concetti
                // separati da conciliare. Il contenuto riempie sempre per intero il proprio blocco
                // (vedi costruisciHtmlBloccoEditor/buildContenutoVoceStampa).
                // Passa dal controllo numerico condiviso: slider e campo lavorano in MILLIMETRI, la
                // percentuale (che resta il dato salvato) si ricava una volta sola al momento di
                // scrivere nel modello. "anteprima" tocca solo la vista — un re-render completo a
                // ogni tick sostituirebbe l'elemento sotto il dito a metà trascinamento.
                collegaControlloNumerico(menu, 'larghezza-input', {
                    secondario: (mm) => `· ${Math.round(pctDaMm(mm))}%`,
                    anteprima: (mm) => {
                        const pct = pctDaMm(mm);
                        const page2 = paginaOrigineBlocco(blockId);
                        const voce2 = trovaVoceContenenteBlocco(page2, blockId);
                        const cols2 = page2 && (page2.cols || 4);
                        // querySelectorAll e non querySelector: un blocco lungo ha una colonna su
                        // OGNI pagina di continuazione. Aggiornandone una sola, trascinando la
                        // larghezza si vedeva cambiare la prima pagina e non le altre — sembrava
                        // rotto. (Incoerenza trovata dal test che confronta fra loro le anteprime
                        // di tutti gli slider, non a occhio.)
                        if (voce2) {
                            const spanAnteprima = pct / 100 * cols2;
                            const voceAnteprima = { espandiSuSpazioVuoto: pct >= 100, align: voce2.align, type: voce2.type };
                            const stile = styleDimensioneVoce(voceAnteprima, spanAnteprima, cols2);
                            document.querySelectorAll(`.tpl-editor-block[data-block-id="${voce2.id}"]`)
                                .forEach(el => { el.style.cssText += stile; });
                            // Stessa ragione della maniglia laterale: il grafico va RIDISEGNATO
                            // alla larghezza nuova, non solo ristretto nel suo contenitore.
                            ridisegnaGraficoAnteprima(blockId, spanAnteprima, cols2);
                        }
                    },
                    commit: (mm) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const voce2 = trovaVoceContenenteBlocco(page2, blockId);
                        if (!voce2) return;
                        const cols2 = page2.cols || 4;
                        // IL TERZO PAVIMENTO, ed era il piu' nascosto dei tre. Oltre al cursore
                        // (min in millimetri) e al rendering (flexEntryCss), anche il salvataggio
                        // arrotondava in su al 5%: si poteva scrivere 2mm nel campo, il valore
                        // veniva salvato come 9mm e alla riapertura del menu il cursore era
                        // tornato indietro da solo. Tre limiti scritti in tre posti diversi, e per
                        // sapere quale stesse vincendo bisognava leggerli tutti e tre. Ora il
                        // divisore ne ha uno solo e coerente in tutti e tre i punti.
                        const pctMinima = (voce2.type === 'divisore') ? 0.5 : 5;
                        const pct = Math.max(pctMinima, Math.min(100, pctDaMm(mm)));
                        salvaUndoSnapshotEditor();
                        voce2.colSpan = pct / 100 * cols2;
                        voce2.espandiSuSpazioVuoto = pct >= 100;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    },
                    // Doppio tocco = riga piena, come prima (prima era "100%", che in millimetri è
                    // esattamente la larghezza utile).
                    resetA: larghezzaUtileRigaMm
                });
                // "Larghezza fissa" + "Bilancia riga" (vedi bilanciaRigaBlocco più sotto): il pin
                // marca la colonna come riferimento immutabile, il bottone ricalcola le altre.
                const chkLarghezzaFissata = menu.querySelector('[data-action="larghezza-fissata"]');
                if (chkLarghezzaFissata) {
                    chkLarghezzaFissata.addEventListener('change', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const voce2 = trovaVoceContenenteBlocco(page2, blockId);
                        if (!voce2) return;
                        salvaUndoSnapshotEditor();
                        voce2.larghezzaFissata = chkLarghezzaFissata.checked;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                }
                const btnBilanciaRiga = menu.querySelector('[data-action="bilancia-riga"]');
                if (btnBilanciaRiga) {
                    btnBilanciaRiga.addEventListener('click', () => bilanciaRigaBlocco(blockId));
                }
                // Lucchetto posizione (richiesto esplicitamente, versione rafforzata: "non deve
                // solo vietare all'utente di spostarlo ma a tutto il sistema... non può essere più
                // editato in nient'altro") — resta l'UNICO controllo sempre attivo quando il
                // blocco è bloccato: tutti gli altri input/bottoni di questo menu vengono
                // disabilitati qui sotto in blocco, appena il menu è pronto (vedi subito dopo).
                const chkPosizioneBloccata = menu.querySelector('[data-action="posizione-bloccata"]');
                if (chkPosizioneBloccata) {
                    chkPosizioneBloccata.addEventListener('change', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const voce2 = trovaVoceContenenteBlocco(page2, blockId);
                        if (!voce2) return;
                        salvaUndoSnapshotEditor();
                        voce2.posizioneBloccata = chkPosizioneBloccata.checked;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                }
                // GRAFICO STRATIGRAFIA — fondo scala dell'asse profondità. Vuoto/0 = automatico
                // (cancella la proprietà invece di scriverci 0: un template senza la chiave è
                // esattamente un template "in automatico", nessuno stato intermedio da interpretare).
                // flowSyncNecessario = true perché cambiare profondità o altezza cambia l'altezza
                // reale del blocco, quindi l'impaginazione.
                const applicaProfonditaAsse = (valore) => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    salvaUndoSnapshotEditor();
                    const v = parseFloat(valore);
                    if (isFinite(v) && v > 0) blk2.profonditaAsseM = Math.max(0.1, Math.min(60, v));
                    else delete blk2.profonditaAsseM;
                    templateEditorState.flowSyncNecessario = true;
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                };
                // Passa dal controllo condiviso come tutti gli altri. Nessuna anteprima dal vivo:
                // cambiare il fondo scala ridisegna l'asse e rimisura l'impaginazione, troppo caro
                // per farlo a ogni scatto del cursore — si applica al rilascio.
                // La stessa geometria che usera' il render vero: senza, l'anteprima dal vivo
                // disegnerebbe alla larghezza di riga piena e al rilascio il grafico cambierebbe
                // di colpo — cioe' il cursore mostrerebbe una cosa e ne salverebbe un'altra.
                const geoGrafico = { span: blk.colSpan, cols: (paginaOrigineBlocco(blockId) || {}).cols };
                const anteprimaGrafico = (patch) => {
                    if (!templateEditorState.ctx) return;
                    const svgNuovo = buildBlockContentHtml('grafico-stratigrafia', templateEditorState.ctx,
                        Object.assign({}, blk, patch), geoGrafico);
                    if (!svgNuovo) return;
                    document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`)
                        .forEach(el => { el.innerHTML = svgNuovo; });
                };
                collegaControlloNumerico(menu, 'profondita-asse', {
                    commit: (m) => applicaProfonditaAsse(m)
                });
                const chkProfCantiere = menu.querySelector('[data-action="profondita-cantiere"]');
                if (chkProfCantiere) chkProfCantiere.addEventListener('change', () => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    salvaUndoSnapshotEditor();
                    if (chkProfCantiere.checked) blk2.profonditaAsseCantiere = true;
                    else delete blk2.profonditaAsseCantiere;
                    templateEditorState.flowSyncNecessario = true;
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                });
                const chkGuidaNomi = menu.querySelector('[data-action="guida-nomi-grafico"]');
                if (chkGuidaNomi) chkGuidaNomi.addEventListener('change', () => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    // Nessuno snapshot di annullamento: e' una guida di lavoro dell'editor, non
                    // un contenuto del documento. Metterla nella pila degli annullamenti
                    // significherebbe che «annulla» a volte non annulla una modifica vera.
                    if (chkGuidaNomi.checked) blk2.mostraGuidaNomiGrafico = true;
                    else delete blk2.mostraGuidaNomiGrafico;
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                });
                menu.querySelectorAll('[data-action="legenda-grafico"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        if (btn.dataset.val === 'colonna') delete blk2.legendaGrafico;
                        else blk2.legendaGrafico = btn.dataset.val;
                        // Il cartiglio in basso cambia l'ALTEZZA del blocco: qui la ripaginazione
                        // va rifatta davvero, al contrario delle sole larghezze.
                        templateEditorState.flowSyncNecessario = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                const btnProfonditaAsseAuto = menu.querySelector('[data-action="profondita-asse-auto"]');
                if (btnProfonditaAsseAuto) btnProfonditaAsseAuto.addEventListener('click', () => applicaProfonditaAsse(''));
                // Altezza del grafico: stessa separazione input/change già usata per Larghezza/Zoom
                // — l'etichetta segue il cursore mentre si trascina, il salvataggio (e il ricalcolo
                // dell'impaginazione, che è costoso) avviene solo al rilascio.
                // Altezza del grafico: era l'ultimo slider senza anteprima dal vivo — muovevi il
                // cursore, cambiava solo il numero, e il grafico si aggiornava al rilascio
                // (segnalato: "vorrei che lo modificasse in tempo reale, così come TUTTI gli altri").
                // L'anteprima RICOSTRUISCE davvero l'SVG con la nuova altezza invece di stirare
                // quello esistente via CSS: stirandolo si allungherebbero anche le scritte e i
                // simboli degli strati, mostrando una cosa diversa da quella che poi stampi.
                // Ricostruire costa poco — è generazione di una stringa, nessuna misurazione né
                // impaginazione — quindi si può fare a ogni scatto del cursore.
                collegaControlloNumerico(menu, 'altezza-grafico', {
                    anteprima: (val) => anteprimaGrafico({ altezzaScalaGrafico: Math.max(0.4, Math.min(3, val / 100)) }),
                    commit: (val) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        const fattore = Math.max(0.4, Math.min(3, val / 100));
                        // A 100% la proprietà si toglie invece di scriverci 1: un template che non
                        // ha mai toccato l'altezza resta identico a uno che l'ha riportata al
                        // valore di partenza, e i due file di backup restano confrontabili.
                        if (Math.abs(fattore - 1) < 0.001) delete blk2.altezzaScalaGrafico;
                        else blk2.altezzaScalaGrafico = fattore;
                        templateEditorState.flowSyncNecessario = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    },
                    resetA: 100
                });
                // LARGHEZZA COLONNE e SPAZIO NOMI STRATI: stessa meccanica dell'altezza qui sopra
                // (anteprima dal vivo ricostruendo l'SVG, proprietà cancellata al 100% per non
                // sporcare i backup), quindi si genera dalla stessa descrizione invece di
                // ricopiarla due volte — due copie della stessa logica sono due posti dove
                // dimenticarsi una correzione.
                [
                    { azione: 'larghezza-colonne-grafico', prop: 'larghezzaColonneGrafico', min: 0.6, max: 3 },
                    { azione: 'spazio-etichette-grafico',  prop: 'spazioEtichetteGrafico',  min: 0.5, max: 3 },
                    { azione: 'retino-legenda-grafico',    prop: 'retinoLegendaGrafico',    min: 0.5, max: 3 }
                ].forEach(({ azione, prop, min, max }) => {
                    const fattoreDa = (val) => Math.max(min, Math.min(max, val / 100));
                    collegaControlloNumerico(menu, azione, {
                        anteprima: (val) => anteprimaGrafico({ [prop]: fattoreDa(val) }),
                        commit: (val) => {
                            const page2 = paginaOrigineBlocco(blockId);
                            const blk2 = trovaBloccoPerId(page2, blockId);
                            if (!blk2) return;
                            salvaUndoSnapshotEditor();
                            const fattore = fattoreDa(val);
                            if (Math.abs(fattore - 1) < 0.001) delete blk2[prop];
                            else blk2[prop] = fattore;
                            // Il grafico cambia larghezza, non altezza: nessuna ripaginazione da
                            // rifare, quindi niente flowSyncNecessario (che costa misurazioni vere).
                            renderTemplateEditorCanvas();
                            apriMenuBloccoEditor(blockId);
                        },
                        resetA: 100
                    });
                });
                // GRIGLIA TABELLA: vive sul blocco (blk2), come rigaScale/fontScale.
                // flowSyncNecessario = true perché togliendo le linee le celle diventano più basse,
                // quindi cambia l'altezza reale del blocco e con essa l'impaginazione: va rifatto
                // il calcolo di Fase C/D al prossimo render "a riposo", altrimenti gli avvisi
                // resterebbero fermi a com'era il blocco prima.
                menu.querySelectorAll('[data-action="griglia-tabella"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.grigliaTabella = btn.dataset.griglia;
                        templateEditorState.flowSyncNecessario = true;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                // Zoom (foto/mappe/grafici) oppure "Altezza righe" (tabelle/testo, richiesto
                // esplicitamente "solo altezza") — stesso campo, proprietà e range diversi a seconda
                // del tipo di blocco (vedi bloccoARighe più sopra).
                // Anche questo passa dal controllo condiviso: l'anteprima dal vivo resta quella
                // di prima (variabile CSS per i blocchi a righe, altezza per le foto, zoom per il
                // resto), ma ora il valore si può anche scrivere.
                collegaControlloNumerico(menu, 'scale-input', {
                    anteprima: (val) => {
                        // querySelectorAll: un blocco lungo ha una fetta su ogni pagina di
                        // continuazione. Aggiornandone una sola si vedeva cambiare la prima pagina
                        // e non le altre — stessa incoerenza già trovata sulla larghezza, e ancora
                        // una volta l'ha vista il test che confronta fra loro tutte le anteprime,
                        // non l'occhio.
                        document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"]`).forEach(innerElScala => {
                            if (haFontRegolabile) innerElScala.style.setProperty('--tpl-riga-scale', val / 100);
                            else if (bloccoFoto) innerElScala.style.setProperty('--tpl-photo-height-mm', val);
                            else innerElScala.style.zoom = val / 100;
                        });
                    },
                    commit: (val) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        if (BLOCCHI_CON_FONT_REGOLABILE.has(blk2.type)) {
                            blk2.rigaScale = Math.max(40, Math.min(250, val)) / 100;
                        } else if (blk2.type === 'immagine-libera') {
                            blk2.heightMm = Math.max(20, Math.min(250, val));
                        } else {
                            blk2.scale = Math.max(10, Math.min(400, val)) / 100;
                        }
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    },
                    resetA: bloccoFoto ? 70 : 100
                });
                // Blocco bloccato (richiesto esplicitamente, "non può essere più editato in
                // nient'altro"): disabilita in blocco OGNI controllo del menu tranne il lucchetto
                // stesso — un solo punto, invece di spargere "disabled" in ogni singolo template
                // HTML sopra, e a prova di dimenticanza se in futuro si aggiungono altri controlli.
                if (posizioneBloccata) {
                    // "select" incluso da quando esiste il selettore taglie Word per Titolo/Testo
                    // (prima c'erano solo input/button): senza, quel controllo sarebbe rimasto
                    // l'unico editabile su un blocco bloccato, una falla nel "tutto il resto".
                    menu.querySelectorAll('input, button, select').forEach(el => {
                        if (el.dataset.action === 'posizione-bloccata') return;
                        el.disabled = true;
                    });
                }
                // Carattere del blocco: stesso controllo condiviso della larghezza. Il valore che si
                // manovra è in PUNTI quando la base è misurabile, in percentuale altrimenti — ma il
                // dato salvato resta sempre e solo blk.fontScale, il moltiplicatore di sempre.
                // Nessun template esistente cambia, nessun calc() da riscrivere.
                collegaControlloNumerico(menu, 'font-blocco', {
                    secondario: (v) => {
                        const scala = baseFontBlocco ? (v / baseFontBlocco.pt) : (v / 100);
                        return `${baseFontBlocco && !baseFontBlocco.uniforme ? '≈ ' : ''}· ${Math.round(scala * 100)}%`;
                    },
                    // Anteprima dal vivo: si scrive direttamente la variabile CSS sul contenitore
                    // del blocco, la stessa che leggono tabelle e grafico. Nessuna ricostruzione,
                    // quindi il cursore non sparisce da sotto il dito a metà trascinamento.
                    anteprima: (v) => {
                        const scala = baseFontBlocco ? (v / baseFontBlocco.pt) : (v / 100);
                        // È .tpl-editor-block-inner a portare data-block-id e lo stile con le
                        // variabili (vedi styleInner in costruisciHtmlBloccoEditor) — NON
                        // .tpl-editor-block, che invece porta l'id della COLONNA. Con più fette di
                        // uno stesso blocco lungo su pagine di continuazione i nodi sono più di uno,
                        // quindi si aggiornano tutti: altrimenti l'anteprima cambierebbe solo la
                        // prima pagina e sembrerebbe rotta.
                        // Sul GRAFICO la sola variabile CSS non basta più: da quando le colonne si
                        // allargano insieme al carattere (vedi fs/hs in buildStratigrafiaColpiRpdSvg),
                        // scrivere solo la variabile mostrerebbe scritte grandi dentro colonne
                        // vecchie — cioè un'anteprima di un disegno che al rilascio non esiste.
                        // Si ricostruisce l'SVG, come già fa il cursore dell'altezza: è generazione
                        // di una stringa, costa poco, e il cursore vive nel menu (non dentro il
                        // blocco), quindi non sparisce da sotto il dito.
                        const svgNuovo = bloccoHaFontRegolabile(blk.type) && BLOCCHI_CON_FONT_SVG.has(blk.type) && templateEditorState.ctx
                            ? buildBlockContentHtml(blk.type, templateEditorState.ctx, Object.assign({}, blk, { fontScale: scala }))
                            : null;
                        document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`)
                            .forEach(el => {
                                el.style.setProperty('--tpl-font-scale', String(scala));
                                if (svgNuovo) el.innerHTML = svgNuovo;
                            });
                    },
                    commit: (v) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        const lim = limitiFontScaleBlocco(blk2.type);
                        const scalaGrezza = baseFontBlocco ? fontScaleDaPt(baseFontBlocco.pt, v, lim.min, lim.max) : (v / 100);
                        if (scalaGrezza == null) return;
                        salvaUndoSnapshotEditor();
                        blk2.fontScale = Math.round(Math.max(lim.min, Math.min(lim.max, scalaGrezza)) * 100) / 100;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    },
                    // Doppio tocco = misura di base del blocco (moltiplicatore 1).
                    resetA: baseFontBlocco ? baseFontBlocco.pt : 100
                });
                // Taglia in punti "alla Word" (richiesto esplicitamente, solo Titolo/Testo): scelta
                // diretta invece di un moltiplicatore, salvata come pt assoluti su blk.fontSizePt —
                // vedi buildBlockContentHtml case 'titolo'/'testo' per come viene applicata.
                // Testo libero: qui i punti sono GIÀ il dato salvato, quindi nessuna conversione —
                // il controllo è lo stesso degli altri solo per non far parlare tre lingue diverse
                // a tre comandi che fanno la stessa cosa.
                collegaControlloNumerico(menu, 'fontsize-pt', {
                    // Il testo libero viene ricostruito: la taglia in punti entra nel contenuto al
                    // momento in cui lo si genera (vedi buildBlockContentHtml), non come variabile
                    // CSS, quindi non c'è una proprietà da toccare dall'esterno. È una stringa da
                    // rigenerare, costa poco.
                    anteprima: (pt) => {
                        if (!templateEditorState.ctx) return;
                        const nuovo = buildBlockContentHtml(blk.type, templateEditorState.ctx, Object.assign({}, blk, { fontSizePt: pt }),
                            { span: blk.colSpan, cols: (paginaOrigineBlocco(blockId) || {}).cols });
                        if (!nuovo) return;
                        document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`)
                            .forEach(el => { el.innerHTML = nuovo; });
                    },
                    commit: (pt) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.fontSizePt = pt;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    }
                });
                // Livello H1/H2/H3 (richiesto esplicitamente, solo Titolo): scegliere un livello
                // imposta anche la taglia canonica di quel livello, così il risultato è
                // immediatamente visibile — resta comunque possibile affinare la taglia esatta dal
                // selettore "Dimensione carattere" subito sotto, indipendentemente dal livello.
                menu.querySelectorAll('[data-action="livello-titolo"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        const liv = btn.dataset.livello;
                        if (!LIVELLI_TITOLO[liv]) return;
                        salvaUndoSnapshotEditor();
                        blk2.livelloTitolo = liv;
                        blk2.fontSizePt = LIVELLI_TITOLO[liv].pt;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                menu.querySelectorAll('[data-action="componi-mappa"]').forEach(btn => {
                    btn.addEventListener('click', () => apriComposizioneMappa(blockId));
                });
                menu.querySelectorAll('[data-action="modifica-testo"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        apriTplTextEditor(blockId);
                    });
                });
                menu.querySelectorAll('[data-action="sezione-modello"]').forEach(sel => {
                    sel.addEventListener('change', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        blk2.sezioneModello = sel.value || null;
                        apriMenuBloccoEditor(blockId);
                    });
                });
                menu.querySelectorAll('[data-action="genera-testo"]').forEach(btn => {
                    btn.addEventListener('click', async () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2 || !blk2.sezioneModello) return;
                        const sezione = SEZIONI_MODELLO_INTRODUZIONE[blk2.sezioneModello];
                        if (!sezione) return;
                        // QUESTO COMMENTO DICEVA IL CONTRARIO, ed era vero fino a ieri: "un
                        // titolo annegato dentro il corpo del testo per l'indice non esiste".
                        // Non e' piu' cosi' — l'indice legge le intestazioni del contenuto — e un
                        // commento che descrive un comportamento passato e' peggio di nessun
                        // commento: manda fuori strada chi si fida.
                        // TITOLO E CORPO INSIEME, in un blocco solo. Prima erano due blocchi,
                        // e serviva perche' l'indice leggeva il TIPO di blocco. Ora legge gli
                        // h1/h2/h3 del contenuto, quindi un capitolo e' finalmente un capitolo:
                        // un pezzo unico che si sposta, si copia e si rigenera intero, invece di
                        // due blocchi da tenere allineati a mano.
                        const liv = Math.max(1, Math.min(3, sezione.livelloTitolo || 1));
                        const modello = (sezione.titolo ? '<h' + liv + '>' + sezione.titolo + '</h' + liv + '>' : '')
                            + (sezione.corpo || '');
                        if (!modello) { appAlert('Questa sezione non prevede nessun testo.'); return; }
                        // Rigenerare BUTTA VIA quello che c'e'. Va detto prima, non scoperto dopo:
                        // il testo generato e' fatto per essere corretto a mano, quindi le
                        // modifiche perse sono esattamente il lavoro piu' prezioso del blocco.
                        if (blk2.richHtml) {
                            const ok = await appConfirmDelete('Rigenerare il testo di questo blocco?\n\nQuello che c\'e\' adesso — comprese le correzioni fatte a mano — verra\' sostituito.');
                            if (!ok) return;
                        }
                        const projId = (templateEditorState && templateEditorState.previewProjectId) || state.currentProjectId;
                        const proj = state.projects && state.projects[projId];
                        if (!proj) { appAlert('Per generare il testo serve un progetto: scegline uno nell\'anteprima dell\'editor.'); return; }
                        // Un seme nuovo a ogni generazione: e' proprio questo il gesto con cui
                        // l'utente chiede un'altra combinazione. Resta scritto nel blocco, cosi'
                        // il testo che si vede e' riproducibile.
                        salvaUndoSnapshotEditor();
                        blk2.semeTesto = Math.floor(Math.random() * 1000000);
                        const esito = generaTestoDaModello(modello, proj, blk2.semeTesto, blk2.correzioniDati || {});
                        blk2.richHtml = esito.html;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                        if (esito.mancanti.length > 0) {
                            appAlert('Testo generato, ma ' + esito.mancanti.length + ' '
                                + (esito.mancanti.length === 1 ? 'informazione manca' : 'informazioni mancano')
                                + ' e nel testo compaiono tra parentesi quadre.\n\nCompilale nell\'Intestazione Cantiere o nello Strumento, oppure scrivile a mano nel testo.');
                        }
                    });
                });
                // Era una coppia di tasti a scatti da 4mm: per passare da 10 a 60mm servivano
                // tredici tocchi. Ora il valore si scrive.
                collegaControlloNumerico(menu, 'spacer-height', {
                    // L'altezza è la misura per cui il divisore esiste: vederla cambiare mentre
                    // la si regola è metà del comando. Prima si vedeva solo al rilascio.
                    anteprima: (mm) => anteprimaDivisore({ spacerHeightMm: Math.max(0.5, Math.min(120, mm)) }),
                    commit: (mm) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.spacerHeightMm = Math.max(0.5, Math.min(120, mm));
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    },
                    resetA: 10
                });
                /* IL DIVISORE SI VEDE MENTRE LO REGOLI (richiesto esplicitamente: «vorrei che
                 * per il divisore ogni modifica fosse fatta in tempo reale»). I tre cursori —
                 * altezza, spessore, lunghezza — scrivevano il dato solo al RILASCIO: muovendoli
                 * cambiava il numero e basta, e il risultato lo scoprivi dopo. Su un blocco che è
                 * fatto solo di spazio e di una linea, "dopo" vuol dire alla cieca: non c'è un
                 * contenuto da cui dedurre come sta venendo.
                 *
                 * Ridisegnare costa pochissimo — il divisore è un div dentro un div — quindi si
                 * può fare a ogni scatto del cursore. Si ricostruisce il contenuto vero con
                 * buildBlockContentHtml invece di ritoccare uno stile a mano: così l'anteprima e
                 * il risultato salvato escono dalla STESSA funzione, e non possono divergere. */
                const anteprimaDivisore = (patch) => {
                    if (!templateEditorState.ctx) return;
                    const nuovo = buildBlockContentHtml('divisore', templateEditorState.ctx, Object.assign({}, blk, patch));
                    if (!nuovo) return;
                    document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"], .tpl-editor-stack-item[data-item-id="${blockId}"]`)
                        .forEach(el => { el.innerHTML = nuovo; });
                };
                // I comandi del divisore cambiano tutti lo stesso oggetto e vogliono lo stesso
                // seguito, quindi passano da un gestore solo — scriverlo cinque volte sarebbe
                // cinque occasioni di scriverlo diverso.
                const applicaAlDivisore = (modifica) => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    salvaUndoSnapshotEditor();
                    modifica(blk2);
                    // L'elastico e la linea cambiano l'ALTEZZA occupata: la ripaginazione va rifatta.
                    templateEditorState.flowSyncNecessario = true;
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                };
                menu.querySelectorAll('[data-action="divisore-linea"]').forEach(btn => {
                    btn.addEventListener('click', () => applicaAlDivisore(blk2 => {
                        // 'nessuna' e' il valore di partenza: si toglie la proprieta' invece di
                        // scriverla, cosi' un template che non ha mai toccato il divisore resta
                        // identico a uno riportato a mano al valore iniziale.
                        if (btn.dataset.val === 'nessuna') delete blk2.divisoreLinea;
                        else blk2.divisoreLinea = btn.dataset.val;
                    }));
                });
                menu.querySelectorAll('[data-action="divisore-stile"]').forEach(btn => {
                    btn.addEventListener('click', () => applicaAlDivisore(blk2 => {
                        if (btn.dataset.val === 'continua') delete blk2.divisoreStile;
                        else blk2.divisoreStile = btn.dataset.val;
                    }));
                });
                menu.querySelectorAll('[data-action="divisore-tinta"]').forEach(btn => {
                    btn.addEventListener('click', () => applicaAlDivisore(blk2 => {
                        if (btn.dataset.val === 'grigio') delete blk2.divisoreTinta;
                        else blk2.divisoreTinta = btn.dataset.val;
                    }));
                });
                const chkDivElastico = menu.querySelector('[data-action="divisore-elastico"]');
                if (chkDivElastico) chkDivElastico.addEventListener('change', () => {
                    applicaAlDivisore(blk2 => {
                        if (chkDivElastico.checked) blk2.divisoreElastico = true;
                        else delete blk2.divisoreElastico;
                    });
                });
                [
                    { azione: 'divisore-spessore', prop: 'divisoreSpessore', min: 0.5, max: 6, dflt: 1 },
                    { azione: 'divisore-lunghezza', prop: 'divisoreLunghezza', min: 10, max: 100, dflt: 100 }
                ].forEach(({ azione, prop, min, max, dflt }) => {
                    collegaControlloNumerico(menu, azione, {
                        anteprima: (val) => anteprimaDivisore({ [prop]: Math.max(min, Math.min(max, val)) }),
                        commit: (val) => applicaAlDivisore(blk2 => {
                            const v = Math.max(min, Math.min(max, val));
                            if (Math.abs(v - dflt) < 0.001) delete blk2[prop];
                            else blk2[prop] = v;
                        }),
                        resetA: dflt
                    });
                });
                // Un solo gestore per le tre impostazioni di aspetto del blocco Dati Prova:
                // cambiano lo stesso oggetto e vogliono lo stesso seguito (undo, ridisegno,
                // menu riaperto sulla stessa scheda), quindi scriverlo tre volte sarebbe solo
                // tre occasioni di scriverlo diverso.
                const applicaAlBloccoSchede = (modifica) => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    salvaUndoSnapshotEditor();
                    modifica(blk2);
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                };
                menu.querySelectorAll('[data-action="schede-layout"]').forEach(btn => {
                    btn.addEventListener('click', () => applicaAlBloccoSchede(blk2 => {
                        blk2.schedeDisposizione = btn.dataset.val;
                        // Il booleano storico resta allineato: se un template salvato oggi finisse
                        // su una versione precedente dell'app, l'orizzontale continuerebbe a
                        // essere orizzontale invece di tornare impilato senza spiegazione.
                        blk2.schedeOrizzontali = btn.dataset.val !== 'v';
                    }));
                });
                menu.querySelectorAll('[data-action="schede-tinta"]').forEach(btn => {
                    btn.addEventListener('click', () => applicaAlBloccoSchede(blk2 => { blk2.schedeTinta = btn.dataset.val; }));
                });
                const chkZebraSchede = menu.querySelector('[data-action="schede-zebra"]');
                if (chkZebraSchede) chkZebraSchede.addEventListener('change', () => {
                    applicaAlBloccoSchede(blk2 => { blk2.schedeZebra = chkZebraSchede.checked; });
                });
                /* ============ RIORDINO A TRASCINAMENTO ============
                 * Tre cose insieme, ed è il loro insieme a far capire cosa sta succedendo:
                 *  1. la voce in mano segue il dito senza transizione (deve stare incollata);
                 *  2. le altre si scansano CON transizione, così si legge chi cede il posto;
                 *  3. la scheda corrispondente si accende sul foglio e le altre si sbiadiscono,
                 *     perché la domanda vera dell'utente non è «quale riga sto trascinando» ma
                 *     «quale colonna del documento sto spostando».
                 * Tutto su Pointer Events: dito, penna e mouse entrano dalla stessa porta, e con
                 * setPointerCapture il trascinamento non si perde uscendo dall'elenco. */
                const listaSchede = menu.querySelector('[data-lista-schede]');
                if (listaSchede) {
                    const voci = [...listaSchede.querySelectorAll('[data-voce-scheda]')];
                    // Le schede sul foglio, in ordine di posizione: il canvas le marca con
                    // data-scheda-idx (l'identità della scheda, non la sua posizione).
                    const schedeSulFoglio = () => {
                        const corpo = document.querySelector('.tpl-editor-block-body[data-block-id="' + blockId + '"]');
                        return corpo ? [...corpo.querySelectorAll('[data-scheda-idx]')] : [];
                    };
                    const schedaSulFoglio = (idx) => schedeSulFoglio().find(el => el.dataset.schedaIdx === String(idx));

                    voci.forEach(voce => {
                        voce.addEventListener('pointerdown', (ev) => {
                            if (ev.button !== undefined && ev.button !== 0) return;
                            ev.preventDefault();
                            const passo = voce.offsetHeight + 4;   // altezza voce + gap della lista
                            const daPos = parseInt(voce.dataset.pos, 10);
                            const idxScheda = parseInt(voce.dataset.idx, 10);
                            let aPos = daPos;
                            const yIniziale = ev.clientY;
                            // La cattura del puntatore è un miglioramento, non una condizione:
                            // se il motore la rifiuta il trascinamento deve funzionare lo stesso,
                            // non morire qui portandosi dietro tutto il resto del gesto.
                            try { voce.setPointerCapture(ev.pointerId); } catch (e) { /* si tira avanti senza */ }
                            voce.classList.add('e-in-mano');
                            triggerVibrate(12);

                            const sulFoglio = schedaSulFoglio(idxScheda);
                            if (sulFoglio) {
                                sulFoglio.classList.add('databox-in-movimento');
                                schedeSulFoglio().forEach(el => { if (el !== sulFoglio) el.classList.add('databox-sbiadita'); });
                            }

                            const muovi = (e2) => {
                                const dy = e2.clientY - yIniziale;
                                voce.style.transform = 'translateY(' + dy + 'px)';
                                // Dove finirebbe se lasciassi adesso. Il round fa scattare lo
                                // scambio a metà voce, che è il punto in cui l'occhio se lo aspetta.
                                const nuova = Math.max(0, Math.min(voci.length - 1, daPos + Math.round(dy / passo)));
                                if (nuova === aPos) return;
                                aPos = nuova;
                                voci.forEach(altra => {
                                    if (altra === voce) return;
                                    const p = parseInt(altra.dataset.pos, 10);
                                    let scarto = 0;
                                    if (daPos < aPos && p > daPos && p <= aPos) scarto = -passo;
                                    else if (daPos > aPos && p >= aPos && p < daPos) scarto = passo;
                                    altra.style.transform = scarto ? 'translateY(' + scarto + 'px)' : '';
                                });
                            };
                            const lascia = () => {
                                voce.removeEventListener('pointermove', muovi);
                                voce.removeEventListener('pointerup', lascia);
                                voce.removeEventListener('pointercancel', lascia);
                                voce.classList.remove('e-in-mano');
                                voci.forEach(v2 => { v2.style.transform = ''; });
                                schedeSulFoglio().forEach(el => el.classList.remove('databox-in-movimento', 'databox-sbiadita'));
                                if (aPos === daPos) return;
                                const page2 = paginaOrigineBlocco(blockId);
                                const blk2 = trovaBloccoPerId(page2, blockId);
                                if (!blk2) return;
                                salvaUndoSnapshotEditor();
                                const ord = Array.isArray(blk2.ordineSchede) && blk2.ordineSchede.length === 3 ? blk2.ordineSchede.slice() : [0, 1, 2];
                                ord.splice(aPos, 0, ord.splice(daPos, 1)[0]);
                                blk2.ordineSchede = ord;
                                triggerVibrate(18);
                                renderTemplateEditorCanvas();
                                apriMenuBloccoEditor(blockId);
                                // Il lampo sulla scheda atterrata: il blocco si è appena ridisegnato,
                                // e senza un segnale non si capisce se qualcosa sia cambiato davvero.
                                requestAnimationFrame(() => {
                                    const arrivata = schedaSulFoglio(idxScheda);
                                    if (arrivata) arrivata.classList.add('databox-atterrata');
                                });
                            };
                            voce.addEventListener('pointermove', muovi);
                            voce.addEventListener('pointerup', lascia);
                            voce.addEventListener('pointercancel', lascia);
                        });
                    });
                }
                const btnOrdineReset = menu.querySelector('[data-action="schede-ordine-reset"]');
                if (btnOrdineReset) btnOrdineReset.addEventListener('click', () => {
                    applicaAlBloccoSchede(blk2 => { blk2.ordineSchede = [0, 1, 2]; });
                });
                const btnStileRip = menu.querySelector('[data-action="stile-ripristina"]');
                if (btnStileRip) btnStileRip.addEventListener('click', async () => {
                    const page2 = paginaOrigineBlocco(blockId);
                    const blk2 = trovaBloccoPerId(page2, blockId);
                    if (!blk2) return;
                    const ecc = eccezioniDiStile(blk2);
                    const ok2 = await appConfirm('Verranno tolte ' + ecc.length + ' eccezion'
                        + (ecc.length === 1 ? 'e' : 'i') + ' (' + ecc.map(e => e.nome).join(', ') + ').\n\n'
                        + 'Il testo non viene toccato: spariscono solo le scelte di carattere, misura, '
                        + 'allineamento e colore fatte dentro questo blocco, che tornano quelle del documento.');
                    if (!ok2) return;
                    salvaUndoSnapshotEditor();
                    riportaAlloStileDelDocumento(blk2);
                    renderTemplateEditorCanvas();
                    apriMenuBloccoEditor(blockId);
                });

                // QUI C'ERA IL CABLAGGIO dei controlli satellite del menu: zoom, spostamento a
                // frecce, toponimi, opacita', scala dei toponimi, etichetta libera e le sue tre
                // coordinate. Sono spariti insieme ai pulsanti, non prima: un gestore senza il
                // suo comando non fa danni ma mente a chi legge il file.
                // Tutti quei parametri vivono ora in apriComposizioneMappa, dove si regolano
                // guardando la mappa. Uno in particolare andava tolto per forza: 'labels-scale'
                // scriveva satelliteLabelsScale, che il compositore CANCELLA quando salva — due
                // comandi che si contendevano lo stesso dato, e uno dei due perdeva sempre.
                // Foto da mostrare (richiesto esplicitamente): scegliere una posizione fissa qui
                // sovrascrive la posizione automatica solo per QUESTO blocco — vedi
                // calcolaIndiciImmaginePerBlocco, che rispetta blk.fotoIndiceManuale se presente.
                const selectFotoIndice = menu.querySelector('[data-action="foto-indice"]');
                if (selectFotoIndice) {
                    selectFotoIndice.addEventListener('change', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.fotoIndiceManuale = selectFotoIndice.value === '' ? null : parseInt(selectFotoIndice.value, 10);
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                }
                // La didascalia si aggiorna DIGITANDO (non solo al rilascio del focus): il testo nel
                // riquadro sotto deve rispecchiare quello che si sta scrivendo. Lo snapshot undo si
                // salva una sola volta, al PRIMO carattere digitato in questa sessione di modifica —
                // non a ogni tasto, altrimenti l'undo diventerebbe inutilizzabile (un passo per lettera).
                let didascaliaUndoSalvato = false;
                let didascaliaRenderTimer = null;
                const inputDidascalia = menu.querySelector('[data-action="caption"]');
                if (inputDidascalia) {
                    inputDidascalia.addEventListener('input', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        if (!didascaliaUndoSalvato) { salvaUndoSnapshotEditor(); didascaliaUndoSalvato = true; }
                        blk2.captionOverride = inputDidascalia.value;
                        // Il ridisegno completo del canvas ricostruisce l'HTML di OGNI blocco della
                        // pagina, incluso reincorporare/ridecodificare l'immagine intera in base64 di
                        // un blocco Foto — farlo ad OGNI carattere digitato blocca il thread
                        // principale abbastanza a lungo da sembrare un blocco totale dell'app
                        // (segnalato esplicitamente: "si blocca tutto"). Il valore resta comunque
                        // aggiornato SUBITO in memoria (sopra): solo il ridisegno visivo si raggruppa
                        // dopo una breve pausa nella digitazione, e scatta comunque subito al blur —
                        // mai più di un ridisegno pesante per parola invece che uno per lettera.
                        clearTimeout(didascaliaRenderTimer);
                        didascaliaRenderTimer = setTimeout(renderTemplateEditorCanvas, 260);
                    });
                    inputDidascalia.addEventListener('blur', () => {
                        clearTimeout(didascaliaRenderTimer);
                        renderTemplateEditorCanvas();
                    });
                }
                menu.querySelectorAll('[data-action="caption-reset"]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.captionOverride = null;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    });
                });
                // Dimensione didascalia (richiesta esplicitamente, indipendente dall'altezza/zoom
                // del contenuto — vedi avvolgiConDidascalia/attivaManigliaScalaBlocco): stesso
                // pattern del selettore "Dimensione carattere" di Titolo/Testo, salvata in punti
                // assoluti su blockObj.captionFontSizePt.
                collegaControlloNumerico(menu, 'caption-fontsize-pt', {
                    // Anteprima puntuale: si tocca la sola didascalia (data-ruolo="didascalia",
                    // vedi avvolgiConDidascalia) invece di ricostruire tutto il blocco. Qui sopra
                    // c'è una foto: ricostruirla a ogni scatto del cursore la farebbe lampeggiare
                    // per niente, visto che l'immagine non cambia.
                    anteprima: (pt) => {
                        document.querySelectorAll(`.tpl-editor-block-inner[data-block-id="${blockId}"] [data-ruolo="didascalia"], .tpl-editor-stack-item[data-item-id="${blockId}"] [data-ruolo="didascalia"]`)
                            .forEach(el => { el.style.fontSize = pt + 'pt'; });
                    },
                    commit: (pt) => {
                        const page2 = paginaOrigineBlocco(blockId);
                        const blk2 = trovaBloccoPerId(page2, blockId);
                        if (!blk2) return;
                        salvaUndoSnapshotEditor();
                        blk2.captionFontSizePt = pt;
                        renderTemplateEditorCanvas();
                        apriMenuBloccoEditor(blockId);
                    }
                });
                const btnSposta = menu.querySelector('.tpl-editor-menu-sposta');
                if (btnSposta) btnSposta.addEventListener('click', () => {
                    if (posizioneBloccata) { mostraToastTemplateEditor('Blocco bloccato: sbloccalo per poterlo spostare'); return; }
                    avviaSpostamentoBlocco(blockId);
                });
                const btnRimuovi = menu.querySelector('.tpl-editor-menu-remove');
                if (btnRimuovi) btnRimuovi.addEventListener('click', () => {
                    // Blocco bloccato: non eliminabile finché non si sblocca da qui (richiesto
                    // esplicitamente, "non può essere più editato in nient'altro") — il bottone è
                    // già disabilitato più sopra quando posizioneBloccata, questo è solo un
                    // controllo di sicurezza in più.
                    if (posizioneBloccata) return;
                    // Blocco NON bloccato ma nella STESSA riga di uno che lo è GENUINAMENTE (lucchetto
                    // vero, non un semplice "inserito ugualmente" fuori margine — vedi
                    // rigaHaBloccoGenuinamenteBloccato, bug "ENORME BUG" corretto: prima si usava
                    // rigaContieneBloccoBloccato, che considerava bloccata anche una riga con un
                    // blocco solo fuori margine accettato, rendendo impossibile rimuovere/spostare
                    // qualunque suo vicino senza un modo visibile di sbloccarlo): anche questo va
                    // rifiutato, altrimenti eliminarlo farebbe comunque scalare di posizione il
                    // blocco bloccato vicino, che è proprio il "riadattamento automatico" da evitare.
                    const paginaOra = templateEditorState.pages[templateEditorState.activePageIdx];
                    const rigaIdxOra = trovaIndiceRigaPerVoce(paginaOra, voceContenitore.id);
                    const rigaOra = rigaIdxOra >= 0 ? paginaOra.rows[rigaIdxOra] : null;
                    if (rigaOra && rigaHaBloccoGenuinamenteBloccato(paginaOra, rigaOra)) {
                        mostraToastTemplateEditor('Quella riga contiene un blocco bloccato: non si può modificare finché non lo sblocchi');
                        return;
                    }
                    // Riscontro visivo IMMEDIATO (segnalato esplicitamente come "si blocca tutto"):
                    // ricostruire l'intero HTML della pagina — che su un blocco Foto/Inquadramento
                    // pesante richiede di ridecodificare una foto multi-MB o fino a 50 tessere
                    // satellitari, vedi commenti in buildInquadramentoSatellitareHtml — può metterci
                    // un attimo percepibile. Senza questo passo il tocco sembrava non aver fatto
                    // nulla per tutto quel tempo. Si chiude il menu e si dissolve subito il blocco a
                    // video, POI (al prossimo frame, lasciando che il browser disegni questo
                    // cambiamento prima di iniziare il lavoro pesante) si aggiorna davvero lo stato.
                    chiudiMenuBloccoEditor();
                    const elDaNascondere = document.querySelector(`.tpl-editor-stack-item[data-item-id="${blockId}"], .tpl-editor-block[data-block-id="${blockId}"]`);
                    if (elDaNascondere) {
                        elDaNascondere.style.transition = 'opacity var(--mov-breve) var(--ease-entra), transform var(--mov-breve) var(--ease-entra)';
                        elDaNascondere.style.opacity = '0';
                        elDaNascondere.style.transform = 'scale(0.96)';
                        elDaNascondere.style.pointerEvents = 'none';
                    }
                    templateEditorState.selectedBlockId = null;
                    requestAnimationFrame(() => {
                        const page2 = paginaOrigineBlocco(blockId);
                        salvaUndoSnapshotEditor();
                        rimuoviBloccoDaPagina(page2, blockId);
                        renderTemplateEditorCanvas();
                        renderTemplateEditorPalette();
                    });
                });

                setTimeout(() => document.addEventListener('pointerdown', gestisciClickFuoriMenuBlocco, true), 0);
            }

