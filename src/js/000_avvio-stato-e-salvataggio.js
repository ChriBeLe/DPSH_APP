        window.addEventListener('error', function(e) {
            const banner = document.createElement('div');
            banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:var(--danger);color:#fff;padding:10px;z-index:99999;font-size:12px;font-family:monospace;word-break:break-all';
            banner.textContent = '❌ JS ERROR: ' + e.message + ' @ line ' + e.lineno + ':' + e.colno + ' | ' + (e.filename || '').split('/').pop();
            document.body.appendChild(banner);
        });
        (function() {
            // VERSIONE DELL'APP: la data del rilascio, AAAA.MM.GG (un secondo rilascio nello stesso
            // giorno diventa AAAA.MM.GG.2). Non c'è un conto da tenere a mente, dice subito quanto è
            // vecchio l'APK installato ed è la stessa data dei file in backup/. Si aggiorna alla fine
            // di ogni sessione in cui questo file cambia. Compare in fondo al menu Impostazioni e
            // dentro i backup dell'archivio (campo versioneApp).
            const APP_VERSIONE = '2026.09.27.4';
            const lblVersioneApp = document.getElementById('lblVersioneApp');
            if (lblVersioneApp) lblVersioneApp.textContent = APP_VERSIONE;

            // COPIE AUTOMATICHE (voce 11): configurazione e stato in memoria. Stanno qui in cima e non
            // accanto alle loro funzioni perché saveState le legge, e saveState può essere chiamata
            // durante l'avvio prima che lo script arrivi a metà: una const non ancora raggiunta
            // farebbe errore. Le funzioni sono più avanti, accanto al pannello "Spazio occupato".
            const COPIE_DB_NAME = 'DPSH_CopieAutomatiche';
            const COPIE_DB_VERSION = 1;
            const COPIE_REGOLE = { intervalloMs: 5 * 60 * 1000, recenti: 20, giorni: 14, primaGiorni: 7, primaMax: 30 };
            const copieAutomatiche = { indice: [], idFoto: new Set(), idNote: new Set(), ultimaPeriodica: 0, ultimaFirma: null, pronto: false, caricamento: null };
            // La promessa resta da parte: chi deve scrivere una copia appena dopo l'avvio (la copia
            // «prima di aggiornare i dati», vedi loadState) aspetta che l'indice sia letto, così la
            // copia nuova non si perde nell'elenco caricato in contemporanea.
            copieAutomatiche.caricamento = caricaIndiceCopieAutomatiche();

            // CARICAMENTO DEI DATI (Fase 1): com'è andata la lettura dei dati salvati. Sta qui in
            // cima per lo stesso motivo delle copie: saveState lo legge. Finché il caricamento non è
            // finito, e ogni volta che i dati salvati NON si sono potuti leggere, saveState non
            // scrive niente: scriverebbe lo stato vuoto di partenza sopra dati ancora recuperabili.
            // Prima succedeva proprio questo: un JSON rovinato veniva ignorato, l'app partiva vuota
            // e il primo salvataggio (quello dell'apertura della Home) lo cancellava per sempre.
            //
            // VERSIONE_SCHEMA_DATI è la forma dei dati che questa versione dell'app scrive e sa leggere
            // (un intero, non la data dell'app). Dati più vecchi passano dalle migrazioni registrate
            // in MIGRAZIONI_DATI (pezzo 004b); dati più nuovi non si caricano e non si importano.
            //   esito: 'in-corso' | 'ok' | 'vuoto' | 'illeggibile' | 'piu-nuovo' | 'inaccessibile'
            //   bloccato: perché saveState non scrive ('avvio', 'dati-non-letti', 'migrazione') o false
            const VERSIONE_SCHEMA_DATI = 3;
            const caricamentoDati = {
                esito: 'in-corso', bloccato: 'avvio', salvataggiEvitati: 0,
                dettaglio: '', testoGrezzo: null, quarantena: null, scaricato: false, migrazione: null
            };

            // ADATTAMENTO ALLA TASTIERA VIRTUALE (TOUCHSCREEN): i modali di questa app sono
            // position:fixed centrati al 50% del viewport. Quando compare la tastiera su mobile,
            // molti browser (soprattutto iOS Safari) NON spostano gli elementi fixed, quindi un
            // campo di testo o un pulsante di conferma vicino al fondo del modale può restare
            // nascosto sotto la tastiera. Qui si usa la Visual Viewport API (l'area realmente
            // visibile sopra la tastiera) per ricentrare i modali aperti su quell'area, e si
            // scorre sempre il campo appena messo a fuoco dentro la vista visibile, come rete di
            // sicurezza aggiuntiva per i browser senza Visual Viewport API.
            (function adattaViewportTastiera() {
                function riposizionaModaliAperti() {
                    if (!window.visualViewport) return;
                    const vv = window.visualViewport;
                    const centroVisibileY = vv.offsetTop + (vv.height / 2);
                    document.querySelectorAll('.modal.open').forEach(m => {
                        m.style.top = centroVisibileY + 'px';
                    });
                }
                if (window.visualViewport) {
                    window.visualViewport.addEventListener('resize', riposizionaModaliAperti);
                    window.visualViewport.addEventListener('scroll', riposizionaModaliAperti);
                }
                document.addEventListener('focusin', (e) => {
                    const el = e.target;
                    if (el && el.matches && el.matches('input, textarea, select')) {
                        setTimeout(() => {
                            riposizionaModaliAperti();
                            el.scrollIntoView({ block: 'center', behavior: 'smooth' });
                        }, 320); // attende l'animazione di apertura della tastiera
                    }
                });
                document.addEventListener('focusout', (e) => {
                    const el = e.target;
                    if (el && el.matches && el.matches('input, textarea, select')) {
                        // Al chiudersi della tastiera, il modale torna al centro standard del viewport.
                        setTimeout(() => {
                            document.querySelectorAll('.modal.open').forEach(m => { m.style.top = ''; });
                        }, 200);
                    }
                });
            })();

            /** Pagina di default del template "Classico" (richiesto esplicitamente: "voglio che
             * quello che c'è nel template venga esportato pari pari nel pdf" — la causa esatta del
             * disallineamento era che "classico" aveva pages:null, cioè un layout storico cablato a
             * mano dentro buildSurveyReportHtml che NON passava affatto dal motore a blocchi
             * dell'editor: qualunque prova senza un template esplicitamente assegnato ci finiva
             * dentro, anche se l'utente la stava guardando/modificando nell'editor a blocchi). Stessa
             * identica disposizione del vecchio layout hardcoded (inquadramento sopra, dati-prova +
             * tabella-colpi affiancati, stratigrafia sotto — vedi seedPaginaDefaultClassico, usata
             * per i template vuoti, stessa forma) ma con id STATICI invece che generati da
             * nuovoIdEditor: questa funzione va chiamata anche dentro il letterale di stato qui
             * sotto, PRIMA che nuovoIdEditor/editorIdCounter (dichiarati molto più avanti nel file
             * con let, quindi in temporal dead zone a questo punto dell'esecuzione) esistano. */
            function classicoPaginaDefault() {
                return {
                    id: 'classico-p1', cols: 4,
                    // "enabled" (mostra/nascondi) non vive più qui, vedi templateEditorState.
                    // headerEnabled/footerEnabled: sono impostazioni del TEMPLATE, non di ogni
                    // singola pagina — richiesto esplicitamente, "come per il numero pagine, devono
                    // essere globali per tutte le pagine, altrimenti mi continua a sminchiare tutto"
                    // (stesso identico paradosso già risolto per footerShowPageNumber). Qui restano
                    // solo il contenuto (immagine/testo), che può ancora variare pagina per pagina.
                    header: { imageDataUrl: null, text: '' },
                    footer: { text: '' },
                    rows: [
                        { id: 'classico-r1', blocks: [{ id: 'classico-b1', type: 'inquadramento', colSpan: 4 }] },
                        { id: 'classico-r2', blocks: [{ id: 'classico-b2', type: 'dati-prova', colSpan: 2 }, { id: 'classico-b3', type: 'tabella-colpi', colSpan: 2 }] },
                        { id: 'classico-r3', blocks: [{ id: 'classico-b4', type: 'grafico-stratigrafia', colSpan: 4 }] }
                    ]
                };
            }

            // Stato Iniziale Prova ed Architettura a Progetti Multi-Prova
            let state = {
                // Forma dei dati (vedi VERSIONE_SCHEMA_DATI): viaggia con lo stato salvato e con i
                // backup, così chi li legge sa se servono migrazioni o se sono di un'app più nuova.
                versioneSchema: VERSIONE_SCHEMA_DATI,
                currentProjectId: null,
                currentSurveyId: null,
                projects: {}, // { [projId]: { id, name, comune, committente, localita, date, operator, surveys: {} } }
                // ARCHIVIO LITOLOGICO GLOBALE: comune a tutto il software (non al singolo progetto).
                // Ogni voce è un "modello" di strato riutilizzabile; ogni strato di un progetto che
                // ne deriva porta con sé strato.sourceArchiveId per il collegamento statistico.
                lithologyArchive: {}, // { [archId]: { id, name, color, pattern, behavior, createdAt } }
                // LIBRERIA TEMPLATE DI REPORT: "classico" è precompilato e non eliminabile/rinominabile
                // (builtIn:true, vedi eliminaTemplateReport/rinominaTemplateReport), ma da qui in poi ha
                // pages valorizzato come un template vero — passa quindi anche lui dal motore generico a
                // blocchi (buildPaginaRigheHtml/buildBlockContentHtml), lo stesso usato dall'editor,
                // invece di un layout storico cablato a mano separato (era la causa esatta per cui
                // l'export poteva non corrispondere a quanto configurato nell'editor). Ogni prova sceglie
                // quale usare tramite survey.reportTemplateId (assente = usa "classico").
                reportTemplates: {
                    classico: { id: 'classico', name: 'Classico', builtIn: true, pages: [classicoPaginaDefault()], margins: { top: 14, bottom: 14, left: 12, right: 12 } }
                },
                // LIBRERIA TEMPLATE INDICE: stesso identico principio dei Template di Report qui sopra —
                // "Classico" precompilato (builtIn:true, non rinominabile/eliminabile, ma modificabile
                // nel contenuto tramite "Personalizza…") più quelli creati dall'utente. Le vesti
                // "Moderno"/"Tecnico" viste in fase di progettazione sono state tolte su richiesta
                // esplicita ("rimuovi i template degli indici preimpostati, lascia solo quello
                // classico") — restano solo come punto di partenza possibile via "Duplica" su
                // Classico o "Nuovo template Indice". Ogni progetto sceglie quale usare tramite
                // proj.indiceTemplateId (assente = usa "idx_classico").
                indiceTemplates: {
                    idx_classico: { id: 'idx_classico', name: 'Classico', builtIn: true, mostraPagina: true, font: 'Times New Roman', divisore: 'punti', gutter: false, numero: { pt: 11, peso: 700 }, titolo: { pt: 20, peso: 800 }, titoloTesto: 'Indice', pagina: { pt: 11, peso: 400 }, coloreTesto: '#1e293b', coloreDivisore: '#cbd5e1',
                        livelli: { h1: { pt: 13, rientroMm: 0, peso: 700, corsivo: false }, h2: { pt: 11.5, rientroMm: 6, peso: 400, corsivo: false }, h3: { pt: 10.5, rientroMm: 12, peso: 400, corsivo: true } } }
                },
                header: {
                    committente: '',
                    comune: '',
                    localita: '',
                    provaNr: '1',
                    faldaDa: '',
                    faldaA: '',
                    lat: null,
                    lng: null,
                    alt: null,
                    acc: null,
                    date: new Date().toISOString().split('T')[0]
                },
                instrument: {
                    pesoMassa: 63.50,
                    pesoAsta: 6.30,
                    lunghAsta: 1.00,
                    cambioAsta: 1.00,
                    pesoSistema: 8.00,
                    volata: 0.75,
                    passo: 0.20,
                    areaPunta: 20,
                    angoloPunta: 90
                },
                settings: {
                    penetrometer: 'DPSH (63.5kg)',
                    stepCm: 20,
                    operator: '',
                    haptic: true,
                    audio: true,
                    wakeLock: true,
                    darkMode: true,
                    // Tasto Registra sotto il contatore (decisione G): visibile di default; l'utente lo
                    // può nascondere e la scelta resta. Ha preso il posto di expandedMode (migrazione 2→3).
                    tastoRegistraVisibile: true,
                    themeHue: 'antracite' // 'antracite' | 'arenaria' | 'ardesia' | 'rame' | 'giada' | 'ametista' | 'granito' | 'ambra'
                },
                currentCount: 0,
                currentDepthStart: 0.0,
                currentRod: 1,
                logs: [],
                strati: [
                    { id: 'strato_1', name: 'Strato 1', color: '#fbbf24' }
                ],
                photos: [],
                archive: {},
                // Immagini dei blocchi "immagine-libera" del template di report assegnato a QUESTA
                // prova: {idBlocco: dataUrl}. Per prova, non per template (vedi buildBlockContentHtml).
                templateImages: {}
            };

            /** LA STRATIGRAFIA DI PARTENZA DI UN PROGETTO NUOVO — fonte unica.
             * Richiesto esplicitamente: «quando inizio un nuovo progetto non devono esserci mai
             * gli stessi strati del progetto precedente… deve iniziare sempre dal generico
             * Strato 1». Prima ogni punto di creazione copiava `state.strati`, cioè la
             * stratigrafia del cantiere su cui si stava lavorando un attimo prima: aprivi un
             * progetto nuovo a 200 km di distanza e ti ritrovavi "CALCARENITE TENERA" già lì.
             * Non è solo scomodo — è un dato tecnico sbagliato che parte già scritto nel
             * documento, e i nomi degli strati finiscono nel report senza che nessuno li
             * riconfermi.
             * Gli strati conosciuti si prendono dall'ARCHIVIO, che esiste apposta ed è esplicito:
             * li scegli tu, non te li ritrovi.
             * Ogni chiamata restituisce un oggetto NUOVO: due prove non devono mai condividere
             * lo stesso oggetto strato, altrimenti rinominarlo in una lo rinomina nell'altra. */
            function stratiInizialiProgettoNuovo() {
                return [{ id: 'strato_1', name: 'Strato 1', color: '#fbbf24' }];
            }

            let editingIndex = -1; // Indice intervallo in corso di modifica modal
            let dragStratiState = null; // Stato del trascinamento maniglie contatto strati (grafico separato)
            // Le maniglie per spostare manualmente il contatto tra due strati nel grafico sono
            // interattive SOLO quando questo flag è attivo (bottone a matita nell'intestazione del
            // grafico, vedi btnToggleModificaStratiGrafico) — altrimenti restano visibili ma spente,
            // per evitare trascinamenti accidentali mentre si scorre/tocca il grafico per altri motivi.
            let modalitaModificaStratiAttiva = false;
            // Flag: quando true, il prossimo render delle barre (Registro Integrato + Grafico SVG) parte
            // da larghezza zero e cresce animata (effetto "morphing"), per segnalare visivamente che i dati
            // sono cambiati (es. cambio prova). Viene attivato solo al cambio prova, non ad ogni render,
            // per evitare che le barre "sfarfallino" ad ogni singolo colpo registrato durante la battitura.
            let pendingBarGrowAnim = false;

            // Applica un breve impulso luminoso alle card Registro/Grafico per segnalare che il dato
            // visualizzato è cambiato (es. cambio prova dalla barra delle schede in alto).
            function flashDataChangedCards() {
                ['cardIntegratedRegister', 'cardLogsTable', 'cardChart'].forEach(id => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.classList.remove('data-changed-pulse');
                    void el.offsetWidth; // forza il reflow per permettere il ri-trigger dell'animazione
                    el.classList.add('data-changed-pulse');
                    setTimeout(() => el.classList.remove('data-changed-pulse'), 650);
                });
            }

