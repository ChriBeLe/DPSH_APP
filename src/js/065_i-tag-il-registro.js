            // ======================== I TAG @: IL REGISTRO ========================
            // Un elenco solo, da cui prendono tutti: il menu che compare scrivendo @, la
            // pastiglia che mostra il valore, e la risoluzione in stampa. Aggiungere un tag
            // qui lo fa comparire in tutti e tre — invece che in due su tre, che e' il modo in
            // cui questi elenchi si sfilacciano.
            //
            // `campo` dice DOVE il dato vive quando si vuole correggerlo: sul progetto o sulla
            // prova. E' quello che permette di compilare la sede del committente dall'editor
            // del testo, senza tornare all'anagrafica — la parte piu' utile di tutta questa
            // funzione, perche' quel dato tipicamente arriva dopo il cantiere.
            const TAG_DISPONIBILI = [
                { tipo: 'committente', etichetta: 'Committente', gruppo: 'Cantiere', campo: 'committente' , dove: 'prova' },
                { tipo: 'sedeCommittente', etichetta: 'Sede del committente', gruppo: 'Cantiere', campo: 'sedeCommittente' , dove: 'progetto' },
                { tipo: 'denominazioneIntervento', etichetta: 'Denominazione dell\'intervento', gruppo: 'Cantiere', campo: 'denominazioneIntervento' , dove: 'progetto' },
                { tipo: 'comune', etichetta: 'Comune', gruppo: 'Cantiere', campo: 'comune' , dove: 'prova' },
                { tipo: 'provincia', etichetta: 'Provincia', gruppo: 'Cantiere', campo: 'provincia' , dove: 'progetto' },
                { tipo: 'localita', etichetta: 'Località', gruppo: 'Cantiere', campo: 'localita' , dove: 'prova' },
                { tipo: 'data', etichetta: 'Data dell\'indagine', gruppo: 'Cantiere' },
                { tipo: 'coordinate', etichetta: 'Coordinate geografiche', gruppo: 'Cantiere' },
                { tipo: 'quotaPianoCampagna', etichetta: 'Quota del piano campagna', gruppo: 'Cantiere' },
                { tipo: 'numeroProve', etichetta: 'Numero di prove', gruppo: 'Indagine' },
                { tipo: 'elencoProve', etichetta: 'Elenco delle prove', gruppo: 'Indagine' },
                { tipo: 'profonditaMax', etichetta: 'Profondità massima', gruppo: 'Indagine' },
                { tipo: 'profonditaMin', etichetta: 'Profondità minima', gruppo: 'Indagine' },
                { tipo: 'fraseUbicazione', etichetta: 'Frase di ubicazione', gruppo: 'Frasi già accordate' },
                { tipo: 'fraseProveEseguite', etichetta: 'Frase «prove eseguite»', gruppo: 'Frasi già accordate' },
                { tipo: 'fraseSondaggi', etichetta: 'Frase «sondaggi realizzati»', gruppo: 'Frasi già accordate' },
                { tipo: 'fraseProfondita', etichetta: 'Frase «profondità»', gruppo: 'Frasi già accordate' },
                { tipo: 'didascaliaFigura', etichetta: 'Didascalia della figura', gruppo: 'Frasi già accordate' },
                { tipo: 'nomePenetrometro', etichetta: 'Penetrometro', gruppo: 'Strumento' },
                { tipo: 'rivestimentoFanghi', etichetta: 'Rivestimento / fanghi', gruppo: 'Strumento' },
                { tipo: 'massaBattente', etichetta: 'Massa battente', gruppo: 'Strumento' },
                { tipo: 'altezzaCaduta', etichetta: 'Altezza di caduta', gruppo: 'Strumento' },
                { tipo: 'pesoSistemaBattuta', etichetta: 'Massa del sistema di battuta', gruppo: 'Strumento' },
                { tipo: 'areaPunta', etichetta: 'Area di base della punta', gruppo: 'Strumento' },
                { tipo: 'diametroPunta', etichetta: 'Diametro della punta', gruppo: 'Strumento' },
                { tipo: 'angoloPunta', etichetta: 'Angolo di apertura della punta', gruppo: 'Strumento' },
                { tipo: 'lunghezzaAste', etichetta: 'Lunghezza delle aste', gruppo: 'Strumento' },
                { tipo: 'pesoAsteMetro', etichetta: 'Massa delle aste al metro', gruppo: 'Strumento' },
                { tipo: 'avanzamentoPunta', etichetta: 'Avanzamento della punta', gruppo: 'Strumento' },
                { tipo: 'numeroColpiPunta', etichetta: 'Numero colpi per avanzamento', gruppo: 'Strumento' },
                { tipo: 'coeffCorrelazione', etichetta: 'Coefficiente βt', gruppo: 'Strumento' }
                // Il gruppo «Riferimenti» non sta qui: dipende dalle figure che il template
                // aperto contiene davvero, quindi si costruisce all'apertura del menu — vedi
                // tagFigureDisponibili().
            ];
            // ---- I RIFERIMENTI ALLA FIGURA: a quale figura, esattamente ----------------
            //
            // Prima ce n'era uno solo, e voleva dire «la prima figura che mi segue». Va bene per
            // «nel sito individuato in fig. 1.1» con la mappa sotto, ma non permette di scrivere
            // «come si vede nell'inquadramento» in fondo al capitolo, ne' di puntare a una figura
            // scelta. Ora il tag porta un BERSAGLIO, scritto dentro il suo tipo:
            //
            //   figura                      → la prima che segue (com'era, e resta il default)
            //   figura:ruolo:inquadramento  → la mappa di inquadramento
            //   figura:ruolo:foto           → una foto della prova
            //   figura:blocco:<id>          → quella figura precisa del template
            //
            // Perche' dentro il tipo e non in un secondo attributo: il tipo e' l'unico attributo
            // che lo schema del testo conosce, e tutto cio' che lo schema non dichiara viene
            // buttato via in silenzio — e' gia' successo tre volte in questo progetto. Un tipo
            // parametrico attraversa l'editor intatto, senza toccare il motore.
            const PREFISSO_FIGURA = 'figura';
            function eRiferimentoFigura(tipo) {
                return tipo === 'figuraSeguente' || tipo === PREFISSO_FIGURA
                    || String(tipo || '').indexOf(PREFISSO_FIGURA + ':') === 0;
            }
            /** Il bersaglio scritto nel tipo. `figuraSeguente` e' la forma vecchia, e continua a
             * valere: i template gia' scritti non devono rompersi. */
            function bersaglioFigura(tipo) {
                const t = String(tipo || '');
                if (t === 'figuraSeguente' || t === PREFISSO_FIGURA) return { modo: 'seguente' };
                const p = t.split(':');
                if (p[0] !== PREFISSO_FIGURA) return { modo: 'seguente' };
                if (p[1] === 'ruolo' && p[2]) return { modo: 'ruolo', valore: p[2] };
                if (p[1] === 'blocco' && p[2]) return { modo: 'blocco', valore: p.slice(2).join(':') };
                return { modo: 'seguente' };
            }
            function etichettaBersaglioFigura(tipo) {
                const b = bersaglioFigura(tipo);
                if (b.modo === 'ruolo') {
                    if (b.valore === 'inquadramento') return 'Figura: l\'inquadramento';
                    if (b.valore === 'foto') return 'Figura: la foto della prova';
                    return 'Figura: ' + b.valore;
                }
                if (b.modo === 'blocco') return 'Figura scelta';
                return 'Figura seguente';
            }

            /** Le voci «Riferimenti» del menu @: i tre ruoli, piu' le figure vere del template
             * aperto.
             *
             * I ruoli reggono qualunque cosa succeda al layout — sposti i blocchi, il
             * riferimento resta giusto — e in un Report Completo, dove il template si ripete per
             * ogni prova, «la foto della prova» segue da sola la prova giusta. La scelta per
             * blocco e' piu' precisa quando in pagina ci sono due figure dello stesso tipo, ma
             * e' legata a quel blocco: cancellandolo, il riferimento lo dichiara invece di
             * stampare un numero a caso. */
            function tagFigureDisponibili() {
                const voci = [
                    { tipo: 'figura', etichetta: 'Figura seguente', gruppo: 'Riferimenti' },
                    { tipo: 'figura:ruolo:inquadramento', etichetta: 'Figura: l\'inquadramento', gruppo: 'Riferimenti' },
                    { tipo: 'figura:ruolo:foto', etichetta: 'Figura: la foto della prova', gruppo: 'Riferimenti' }
                ];
                const pagine = (typeof templateEditorState !== 'undefined' && templateEditorState.pages) || [];
                const ctx = (typeof templateEditorState !== 'undefined' && templateEditorState.ctx) || null;
                let n = 0;
                pagine.forEach(pag => (pag.rows || []).forEach(riga => (riga.blocks || []).forEach(entry => {
                    const items = (entry.stack && entry.stack.length > 0) ? entry.stack : [entry];
                    items.forEach(item => {
                        if (!TIPI_BLOCCO_CON_DIDASCALIA.has(item.type)) return;
                        n++;
                        const auto = didascaliaAutomaticaBlocco(item.type, item, ctx);
                        const nome = (item.captionOverride && String(item.captionOverride).trim())
                            || auto || ('Figura ' + n + ' — ' + item.type);
                        voci.push({ tipo: 'figura:blocco:' + item.id, etichetta: nome, gruppo: 'Riferimenti' });
                    });
                })));
                return voci;
            }

            /** Come si legge un riferimento che non ha ancora la sua figura.
             *
             * Prima era «fig. ?», e poi «[figura assente]»: due modi di dire «non lo so», che
             * lasciano chi guarda il foglio senza sapere nemmeno COSA stava cercando. Il tag il
             * suo nome ce l'ha — «figura inquadramento», «figura seguente» — e quello va
             * scritto: si legge come una frase, e dice da solo cosa manca per completarla. */
            function etichettaVuotaFigura(bersaglio) {
                if (bersaglio.modo === 'ruolo') {
                    if (bersaglio.valore === 'inquadramento') return 'figura inquadramento';
                    if (bersaglio.valore === 'foto') return 'figura foto della prova';
                    return 'figura ' + bersaglio.valore;
                }
                if (bersaglio.modo === 'blocco') return 'figura scelta';
                return 'figura seguente';
            }

            /** IL RIFERIMENTO ALLA FIGURA non e' un dato del cantiere: il suo valore («fig. 2.1»)
             * dipende da quante figure lo precedono nel documento finito, che mentre si scrive un
             * blocco non esiste ancora. Va quindi lasciato in pace da chi risolve i dati, e
             * numerato dopo, dalla passata sul documento intero (vedi risolviRiferimentiFigura).
             * Dichiararlo qui evita che finisca stampato come «[Riferimento alla figura]». */
            const TAG_RISOLTI_A_DOCUMENTO = { figuraSeguente: true };

            /** L'etichetta di una chiave, cercata prima nel registro dei tag e poi fra i valori
             * veri del cantiere.
             *
             * Serve perche' i due elenchi erano scritti a mano e separati: valoriCantiere conosce
             * trenta chiavi, il registro ne dichiarava diciotto, e le dodici di differenza — tutte
             * usate dal testo generato — uscivano stampate col nome grezzo della variabile,
             * «[fraseSondaggi]», dentro la relazione. Adesso i due elenchi coincidono, ed e' un
             * controllo automatico a tenerli tali; questa funzione e' la rete sotto, per il
             * giorno in cui qualcuno aggiunge un valore e si dimentica del registro. */
            function etichettaTag(tipo, valori) {
                if (eRiferimentoFigura(tipo)) return etichettaBersaglioFigura(tipo);
                const def = TAG_DISPONIBILI.find(t => t.tipo === tipo);
                if (def) return def.etichetta;
                const voce = valori && valori[tipo];
                if (voce && voce.etichetta) return voce.etichetta;
                return tipo || 'dato';
            }
            function tagPerTipo(tipo) {
                if (eRiferimentoFigura(tipo)) return { tipo, etichetta: etichettaBersaglioFigura(tipo), gruppo: 'Riferimenti', campo: null };
                return TAG_DISPONIBILI.find(t => t.tipo === tipo) || null;
            }

            /** Il progetto che alimenta l'anteprima: e' quello scelto nella tendina dell'editor
             * del template, non quello aperto nell'app. Cambiandolo, ogni pastiglia cambia. */
            function progettoPerTag() {
                const id = (typeof templateEditorState !== 'undefined' && templateEditorState.previewProjectId)
                    || state.currentProjectId;
                return (state.projects && state.projects[id]) || null;
            }
            /** Chiamata DALLA VISTA del nodo, dentro il motore: e' il ponte fra il tag e i dati
             * veri. Torna etichetta e valore, senza mai scriverlo nel documento. */
            /** Dice a tutte le pastiglie di rileggere il loro dato. Serve quando il VALORE
             * cambia senza che il documento cambi: si sceglie un altro cantiere nell'anteprima,
             * o si corregge la sede. Senza questo avviso, ogni pastiglia continuerebbe a
             * mostrare il dato del progetto precedente — il difetto che i tag esistono per
             * evitare, ricomparso un livello piu' in basso. */
            function aggiornaPastiglieTag() {
                try { document.dispatchEvent(new CustomEvent('dpsh-tag-aggiorna')); } catch (e) { /* niente eventi, niente aggiornamento: non e' fatale */ }
            }

            /** Il nome per esteso di un cantiere: e' quello che va scritto nella finestra quando
             * si compila un dato, perche' "Committente" da solo non dice a QUALE lavoro si sta
             * mettendo mano — e in un'app dove si tengono aperti piu' cantieri e si sceglie
             * quale usare per l'anteprima, e' esattamente l'informazione che serve. */
            function nomeProgettoPerAvviso(proj) {
                if (!proj) return 'nessun cantiere';
                const parti = [];
                if (proj.name) parti.push(proj.name);
                if (proj.comune && proj.comune !== proj.name) parti.push(proj.comune);
                if (proj.provincia) parti[parti.length - 1] = parti[parti.length - 1] + ' (' + proj.provincia + ')';
                const n = Object.keys(proj.surveys || {}).length;
                const quante = n === 0 ? 'nessuna prova' : (n === 1 ? '1 prova' : n + ' prove');
                return (parti.join(' — ') || 'cantiere senza nome') + ', ' + quante;
            }

            /** SCRIVE UN DATO DEL CANTIERE DOVE VIVE DAVVERO.
             *
             * I dati di intestazione hanno due case diverse, e non e' un dettaglio:
             *  · provincia, sede del committente e denominazione dell'intervento stanno SUL
             *    PROGETTO, e basta scriverli li';
             *  · comune, localita' e committente stanno nell'INTESTAZIONE DI OGNI PROVA, e la
             *    copia sul progetto e' derivata: syncStateToProject la riscrive da capo ogni
             *    volta che si salva la prova aperta.
             *
             * Scrivere solo sul progetto, per questi tre, voleva dire vederli sparire al primo
             * salvataggio — e nel frattempo la scheda «Intestazione cantiere» avrebbe continuato
             * a mostrare il valore vecchio, perche' legge l'intestazione della prova. Quindi qui
             * si scrive in tutte le case: il progetto, tutte le sue prove (comune e committente
             * sono del CANTIERE, non della singola verticale) e, se e' il cantiere aperto, anche
             * lo stato vivo, cosi' la scheda si aggiorna sotto gli occhi. */
            function scriviDatoCantiere(proj, def, valore) {
                if (!proj || !def || !def.campo) return;
                const testo = String(valore === null || valore === undefined ? '' : valore).trim();
                proj[def.campo] = testo;
                proj.updatedAt = Date.now();
                if (def.dove === 'prova') {
                    Object.values(proj.surveys || {}).forEach(sv => {
                        if (!sv.header) sv.header = {};
                        sv.header[def.campo] = testo;
                    });
                    if (proj.id === state.currentProjectId) {
                        if (!state.header) state.header = {};
                        state.header[def.campo] = testo;
                    }
                }
                saveState();
                if (proj.id === state.currentProjectId && typeof updateUI === 'function') updateUI();
            }

            globalThis.risolviTagPerVista = function (tipo) {
                // La figura non ha un valore finche' il documento non e' fatto: nell'editor si
                // mostra «fig. ?», che e' esattamente cio' che l'utente vedra' finche' non
                // esporta. Fingere un numero qui sarebbe peggio di non darne nessuno.
                if (TAG_RISOLTI_A_DOCUMENTO[tipo] || eRiferimentoFigura(tipo)) {
                    // Dentro l'editor del testo il documento non c'e' ancora: si mostra il NOME
                    // del riferimento, che si legge, invece di un punto interrogativo.
                    const b = bersaglioFigura(tipo);
                    const el = (typeof templateEditorState !== 'undefined' && templateEditorState.ctx)
                        ? figuraBersagliataNelTemplate(b, null, templateEditorState.ctx.figureTemplate) : null;
                    return { etichetta: etichettaBersaglioFigura(tipo),
                             valore: el ? ('fig. ' + el.numero) : etichettaVuotaFigura(b), attesa: !el };
                }
                try {
                    const v = valoriCantiere(progettoPerTag());
                    const voce = v && v[tipo];
                    return { etichetta: etichettaTag(tipo, v), valore: (voce && !voce.mancante) ? voce.testo : '' };
                } catch (e) {
                    // Un errore qui non deve svuotare l'editor: si mostra l'etichetta e basta.
                    return { etichetta: etichettaTag(tipo, null), valore: '' };
                }
            };

            function valoriCantiereConCorrezioni(proj, correzioni) {
                const v = valoriCantiere(proj);
                Object.keys(correzioni || {}).forEach(chiave => {
                    const testo = String(correzioni[chiave] === null || correzioni[chiave] === undefined ? '' : correzioni[chiave]).trim();
                    if (!testo) return;
                    if (!v[chiave]) v[chiave] = { etichetta: chiave, origine: 'Scritto a mano' };
                    v[chiave].testo = testo;
                    v[chiave].mancante = false;
                    v[chiave].corretto = true;
                });
                return v;
            }

            /** Sostituisce i {{segnaposto}} e avvolge ogni valore in un marcatore.
             *
             * Il marcatore serve a tre cose che senza sarebbero impossibili: evidenziare nel
             * testo cio' che viene dal campo, contare cosa manca, e riportare al dato giusto
             * quando lo si tocca. In stampa il valore lo rimette risolviTagInStampa.
             *
             * Un segnaposto MAI VISTO non resta scritto nel testo: diventa un marcatore
             * mancante. Un {{comnue}} stampato in una relazione consegnata e' precisamente la
             * figura che questo sistema esiste per impedire. */
            // Segnaposto che NON si risolvono qui: hanno bisogno del documento intero, che
            // mentre si scrive un blocco non esiste ancora. Vanno dichiarati, altrimenti
            // finirebbero contati tra le informazioni mancanti — un allarme falso.

            function applicaSegnapostiTesto(testo, valori) {
                const mancanti = [];
                const html = String(testo || '').replace(/\{\{\s*([A-Za-z][A-Za-z0-9_:-]*)\s*\}\}/g, (tutto, chiave) => {
                    // RIFERIMENTO A UNA FIGURA. Non si puo' sapere adesso a quale numero
                    // corrispondera': dipende da quante figure la precedono nel documento finito,
                    // e da quale capitolo. Si lascia un marcatore, e lo risolve l'assemblaggio.
                    if (TAG_RISOLTI_A_DOCUMENTO[chiave] || eRiferimentoFigura(chiave)) {
                        // ERA UN SEMPLICE SPAN, e lo schema del testo lo cancellava: bastava
                        // aprire il blocco una volta perche' «fig. ?» restasse scritto cosi'
                        // per sempre, senza piu' nessun aggancio alla figura. Come tag invece
                        // sopravvive, perche' il tipo e' un attributo dichiarato del nodo.
                        const b = bersaglioFigura(chiave);
                        return '<span class="dpsh-tag" data-tag="' + escapeHtmlDidascalia(chiave)
                            + '" data-rif-figura="' + escapeHtmlDidascalia(b.modo === 'seguente' ? 'seguente' : (b.modo + ':' + b.valore))
                            + '">fig. ?</span>';
                    }
                    const v = valori[chiave];
                    if (!v || v.mancante) {
                        if (mancanti.indexOf(chiave) === -1) mancanti.push(chiave);
                        const et = escapeHtmlDidascalia((v && v.etichetta) || chiave);
                        // UN SOLO MECCANISMO. Il testo generato usa gli stessi tag che si
                        // scrivono con @: prima erano due sistemi paralleli — i segnaposto del
                        // generatore e i tag scritti a mano — che dicevano la stessa cosa in due
                        // modi, con due aspetti e due comportamenti. Uno dei due era cliccabile
                        // e l'altro no, e non c'era una ragione: solo il fatto che erano nati in
                        // momenti diversi.
                        // Chi si tocca per compilare, ora, e' lo stesso ovunque.
                        return '<span class="dpsh-tag dpsh-tag-manca dato-cantiere dato-mancante" data-tag="' + escapeHtmlDidascalia(chiave) + '" data-dato="' + escapeHtmlDidascalia(chiave) + '" data-mancante="1">[' + et + ']</span>';
                    }
                    return '<span class="dpsh-tag dato-cantiere" data-tag="' + escapeHtmlDidascalia(chiave) + '" data-dato="' + escapeHtmlDidascalia(chiave) + '">' + escapeHtmlDidascalia(v.testo) + '</span>';
                });
                return { html, mancanti };
            }

            // ripulisciMarcatoriDato() STAVA QUI, e non la chiamava piu' nessuno.
            // Toglieva lo <span> lasciando il testo dentro, per la stampa. Aveva senso finche'
            // il testo VIVEVA nel marcatore; da quando il documento porta il riferimento e il
            // valore si rilegge, quello span e' vuoto per costruzione, e "lasciare il testo
            // dentro" avrebbe voluto dire cancellare il dato. Codice morto difeso da un
            // controllo verde: la combinazione peggiore, perche' sembra mantenuto.
            // In stampa il lavoro lo fa risolviTagInStampa, che il valore lo mette.

            /** Il giro completo: modello -> alternative scelte col seme -> segnaposto sostituiti.
             * Restituisce anche cosa manca, che e' l'informazione da mostrare sul blocco. */
            function generaTestoDaModello(modelloTesto, proj, seme, correzioni) {
                const casuale = generatoreCasualeDaSeme(seme);
                const conAlternative = espandiAlternativeTesto(modelloTesto, casuale);
                const valori = valoriCantiereConCorrezioni(proj, correzioni);
                const esito = applicaSegnapostiTesto(conAlternative, valori);
                return { html: esito.html, mancanti: esito.mancanti, valori };
            }

            /** Quante informazioni mancano in un testo gia' generato. Si contano i marcatori,
             * non si rigenera: il numero deve descrivere il testo che c'e' davvero nel blocco,
             * anche dopo che l'utente lo ha modificato a mano. */
            function contaDatiMancanti(html) {
                if (!html) return 0;
                return (String(html).match(/data-mancante="1"/g) || []).length;
            }


