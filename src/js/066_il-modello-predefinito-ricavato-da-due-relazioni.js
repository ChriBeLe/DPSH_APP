            // =========================================================================
            // IL MODELLO PREDEFINITO. Ricavato da due relazioni Eurisko vere, con la grammatica
            // corretta (le originali scrivevano "5 sondaggio spinti" e "n. 1 prova spinte") e i
            // dati sostituiti dai segnaposto che l'app sa gia' calcolare.
            //
            // Le [[alternative]] stanno SOLO in apertura e in chiusura, dove il testo e' dello
            // studio. Il corpo del capitolo 2 e' fisso di proposito: e' la citazione di uno
            // standard, e riformularla a ogni relazione la renderebbe meno rigorosa, non piu'
            // originale. Chi confronta due relazioni dello stesso studio se ne accorgerebbe.
            // =========================================================================
            const SEZIONI_MODELLO_INTRODUZIONE = {
                apertura: {
                    nome: '1. Introduzione',
                    titolo: '1. INTRODUZIONE',
                    livelloTitolo: 1,
                    corpo:
'<p>[[Nel seguito viene fornita una descrizione dell\'|La presente relazione descrive l\'|Si riportano di seguito le risultanze dell\'|Nel presente elaborato è descritta l\'|La presente nota illustra l\']]attività di indagine geognostica [[realizzata|eseguita|condotta|svolta]] per conto della ditta {{committente}}, con sede in {{sedeCommittente}}, [[a corredo|nell\'ambito|a supporto|a servizio]] dell\'intervento denominato "{{denominazioneIntervento}}".</p>' +
'<p>{{fraseUbicazione}}</p>' +
// «Nel sito individuato in fig. X» parla della MAPPA, non di "la prossima che capita":
    // se un giorno si mette una foto prima dell'inquadramento, «seguente» punterebbe alla
    // foto e la frase direbbe una cosa falsa. Dirlo esplicitamente costa una parola.
    '<p>Nel sito individuato in {{figura:ruolo:inquadramento}} {{fraseSondaggi}} {{fraseProfondita}}.</p>'
                },
                metodo: {
                    nome: '2. Prove penetrometriche DPSH',
                    titolo: '2. PROVE PENETROMETRICHE DPSH',
                    livelloTitolo: 1,
                    corpo:
'<p>La prova penetrometrica, nelle sue varianti dinamica e statica, consente di pervenire — mediante correlazioni consolidate — a una caratterizzazione geotecnica affidabile dei terreni indagati.</p>' +
'<p>La prova penetrometrica dinamica consiste nell\'infissione verticale nel terreno di una punta conica metallica, solidale a un\'asta di acciaio prolungabile mediante l\'aggiunta di aste successive, registrando il numero di colpi necessari alla penetrazione di ciascun tratto di lunghezza prestabilita. L\'infissione avviene per battitura, per caduta da altezza costante di un maglio di massa nota. La resistenza offerta dal terreno risulta inversamente proporzionale alla penetrazione prodotta da ciascun colpo e direttamente proporzionale al numero di colpi (N<sub>dp</sub>) necessari a una penetrazione assegnata.</p>' +
'<p>L\'informazione restituita dalla prova è di tipo continuo: la misura della resistenza alla penetrazione accompagna l\'intera infissione, senza soluzione di continuità lungo la verticale indagata.</p>' +
'<p>Le attrezzature impiegate differiscono per massa del maglio, massa del complesso testa di battuta–guida–aste e altezza di caduta, oltre che per i seguenti parametri:</p>' +
'<ul><li><p>massa del maglio (10 ÷ 100 kg)</p></li><li><p>altezza di caduta (200 ÷ 760 mm)</p></li><li><p>diametro della punta (22 ÷ 63 mm)</p></li><li><p>forma della punta (angolo di apertura 60° – 90°, prolungamento alla base del cono)</p></li><li><p>diametro esterno delle aste (16 ÷ 45 mm)</p></li><li><p>penetrazione di riferimento (100 ÷ 300 mm)</p></li><li><p>metodo adottato per eliminare o ridurre l\'attrito laterale lungo le aste (rivestimento, fango immesso attraverso le aste, diametro della punta maggiore di quello delle aste)</p></li></ul>' +
'<p>Caratteristiche dell\'attrezzatura e modalità esecutive trovano riferimento normalizzato nelle Procedure internazionali di riferimento elaborate dall\'ISSMFE, che distinguono quattro classi di penetrometro in funzione della massa del maglio:</p>' +
'<table class="note-table"><tbody>' +
'<tr><th><p>TIPO</p></th><th><p>Sigla di riferimento</p></th><th><p>Massa battente M (kg)</p></th></tr>' +
'<tr><td><p>Leggero</p></td><td><p>DPL (light)</p></td><td><p>M ≤ 10</p></td></tr>' +
'<tr><td><p>Medio</p></td><td><p>DPM (medium)</p></td><td><p>10 &lt; M &lt; 40</p></td></tr>' +
'<tr><td><p>Pesante</p></td><td><p>DPH (heavy)</p></td><td><p>40 &lt; M &lt; 60</p></td></tr>' +
'<tr><td><p>Super pesante</p></td><td><p>DPSH (super heavy)</p></td><td><p>M ≥ 60</p></td></tr>' +
'</tbody></table>' +
'<p>La resistenza dinamica alla punta R<sub>pd</sub>, in funzione del numero di colpi N, si determina secondo la formula olandese:</p>' +
'<p style="text-align: center"><strong>R<sub>pd</sub> = M²·H / [A·e·(M + P)] = M²·H·N / [A·δ·(M + P)]</strong></p>' +
'<p>dove:</p>' +
'<ul><li><p>R<sub>pd</sub> = resistenza dinamica alla punta, di area A;</p></li><li><p>e = δ / N = infissione per colpo;</p></li><li><p>M = massa battente, con altezza di caduta H;</p></li><li><p>P = massa complessiva delle aste e del sistema di battuta.</p></li></ul>' +
'<p>Nel caso in esame {{fraseProveEseguite}} {{fraseProfondita}} dal piano campagna, impiegando un penetrometro {{nomePenetrometro}} con le seguenti caratteristiche dimensionali:</p>' +
'<ul>' +
'<li><p>Massa battente: {{massaBattente}} kg</p></li>' +
'<li><p>Altezza di caduta libera: {{altezzaCaduta}} m</p></li>' +
'<li><p>Massa del sistema di battuta: {{pesoSistemaBattuta}} kg</p></li>' +
'<li><p>Diametro della punta conica: {{diametroPunta}} mm</p></li>' +
'<li><p>Area di base della punta: {{areaPunta}} cm²</p></li>' +
'<li><p>Lunghezza delle aste: {{lunghezzaAste}} m</p></li>' +
'<li><p>Massa delle aste per metro: {{pesoAsteMetro}} kg/m</p></li>' +
'<li><p>Avanzamento della punta: {{avanzamentoPunta}} m</p></li>' +
'<li><p>Numero di colpi per avanzamento: {{numeroColpiPunta}}</p></li>' +
'<li><p>Coefficiente di correlazione: {{coeffCorrelazione}}</p></li>' +
'<li><p>Rivestimento / fanghi: {{rivestimentoFanghi}}</p></li>' +
'<li><p>Angolo di apertura della punta: {{angoloPunta}}°</p></li>' +
'</ul>' +
'<p>L\'elaborazione dei dati acquisiti ha consentito di [[ricostruire|definire|delineare|ricomporre|restituire]] la geometria e la giacitura dei corpi costituenti il primo sottosuolo e di [[definirne|caratterizzarne|precisarne]] le caratteristiche geotecniche.</p>'
                },
                normative: {
                    nome: '3. Riferimenti normativi',
                    titolo: '3. RIFERIMENTI NORMATIVI',
                    livelloTitolo: 1,
                    // ELENCO DI PARTENZA, DA CONFERMARE. Il quadro vigente e' quello delle NTC
                    // 2018, ma il set esatto di norme da citare dipende dall'opera e dalla
                    // committenza: in una relazione firmata citare una norma di troppo e' un
                    // errore quanto ometterne una. Questo testo e' modificabile come ogni altro.
                    corpo:
'<p>L\'indagine è stata condotta e interpretata nel rispetto dei seguenti riferimenti normativi e tecnici:</p>' +
'<ul>' +
'<li><p>D.M. 17 gennaio 2018 — «Aggiornamento delle Norme tecniche per le costruzioni» (NTC 2018);</p></li>' +
'<li><p>Circolare 21 gennaio 2019, n. 7 C.S.LL.PP. — Istruzioni per l\'applicazione delle NTC 2018;</p></li>' +
'<li><p>UNI EN 1997-1 e UNI EN 1997-2 (Eurocodice 7) — Progettazione geotecnica;</p></li>' +
'<li><p>UNI EN ISO 22476-2 — Indagini e prove geotecniche: prove penetrometriche dinamiche;</p></li>' +
'<li><p>UNI EN ISO 22475-1 — Metodi di campionamento e misure piezometriche;</p></li>' +
'<li><p>Raccomandazioni AGI sulle indagini geotecniche;</p></li>' +
'<li><p>Procedure internazionali di riferimento elaborate dall\'ISSMFE.</p></li>' +
'</ul>'
                }
            };

            const REPORT_BLOCK_TYPES = {
                'dati-prova': { label: 'Dati Prova', icon: 'clipboard' },
                'tabella-colpi': { label: 'Tabella Colpi/Rpd', icon: 'table' },
                'grafico-stratigrafia': { label: 'Grafico Stratigrafia', icon: 'chart' },
                'inquadramento': { label: 'Inquadramento Satellitare', icon: 'map' },
                'tabella-riepilogo-parametri': { label: 'Tabella Riepilogo Parametri', icon: 'list' },
                'tabella-dettagliata-parametri': { label: 'Tabella Dettagliata Parametri', icon: 'layers' },
                'allegato-formule': { label: 'Allegato Formule di Correlazione', icon: 'file' },
                'immagine-libera': { label: 'Foto prova', icon: 'camera' },
                'foto-singola': { label: 'Foto (una per pagina)', icon: 'camera' },
                // Blocchi di libertà d'impaginazione (richiesti esplicitamente): non legati ai dati
                // della prova, sempre disponibili e ripetibili quante volte si vuole (vedi
                // TIPI_BLOCCO_RIPETIBILI), per dare struttura/respiro al layout.
                // 'titolo' NON e' piu' nella palette: si scrive un titolo dentro il blocco di
                // testo, col comando dell'editor. Il tipo resta dichiarato perche' un template
                // salvato prima puo' ancora contenerlo finche' non viene aperto e convertito —
                // toglierlo del tutto farebbe apparire "blocco sconosciuto" al posto del titolo.
                'titolo': { label: 'Titolo (vecchio)', icon: 'heading', fuoriPalette: true },
                'testo': { label: 'Testo', icon: 'align-left' },
                'divisore': { label: 'Divisore (spazio)', icon: 'move-y' }
            };
            // Tipi di blocco che restano SEMPRE disponibili nella palette anche dopo essere stati
            // usati (a differenza dei blocchi-dati, che hanno senso una volta sola per prova): sia
            // "Foto prova" (una foto diversa ogni volta) sia i 4 blocchi di libertà d'impaginazione
            // qui sopra, che si possono voler ripetere quante volte si vuole nello stesso template.
            const TIPI_BLOCCO_RIPETIBILI = new Set(['immagine-libera', 'titolo', 'testo', 'divisore']);

            /* ============ IL DIVISORE NON È PIÙ SOLO ARIA ============
             * Restava l'unico blocco che non poteva fare niente: occupava spazio e basta. Tre
             * cose che uno spazio bianco non sa fare da solo, e che in una relazione servono:
             *  · una LINEA ORIZZONTALE, cioè il separatore tipografico fra due sezioni;
             *  · una LINEA VERTICALE, quando il divisore sta in mezzo a due colonne — è il modo
             *    di separarle con un filo invece che con un buco;
             *  · l'ELASTICITÀ, cioè prendersi tutto lo spazio che avanza sulla pagina e spingere
             *    in fondo quello che segue (il blocco firma, tipicamente), senza rimisurare i
             *    millimetri a mano ogni volta che il testo sopra cambia lunghezza.
             * Il valore di partenza resta «nessuna linea, altezza fissa»: un template già fatto
             * non cambia di un pixel. */
            const LINEE_DIVISORE = ['nessuna', 'orizzontale', 'verticale'];
            const STILI_LINEA_DIVISORE = { continua: 'solid', tratteggiata: 'dashed', punteggiata: 'dotted', doppia: 'double' };
            const TINTE_DIVISORE = {
                grigio:  { nome: 'Grigio',  colore: '#94a3b8' },
                scuro:   { nome: 'Scuro',   colore: '#334155' },
                azzurro: { nome: 'Azzurro', colore: '#7fb2d9' },
                salvia:  { nome: 'Salvia',  colore: '#8fb897' },
                sabbia:  { nome: 'Sabbia',  colore: '#c9ab7c' }
            };

            // Blocchi con il carattere regolabile tramite --tpl-font-scale (vedi i calc() in
            // buildDatiBoxHtml/buildColpiNsptTableHtml/htmlTabellaRiepilogo/Dettagliata/Allegato).
            //
            // "TUTTI i font di tutti i blocchi devono essere regolabili" (richiesto esplicitamente).
            // Il GRAFICO STRATIGRAFIA è entrato ora: le sue 12 etichette avevano la misura scritta
            // come attributo SVG font-size="7" — un numero fisso, non toccabile da nessuna
            // variabile. Ora sono style="font-size:calc(7px * var(--tpl-font-scale, 1))": in un SVG
            // in linea l'attributo style passa dal motore CSS come in qualunque altro elemento,
            // quindi eredita la variabile dal contenitore del blocco ESATTAMENTE come le tabelle,
            // sia nell'editor sia in stampa. Zero impianto nuovo: il contenitore quella variabile
            // la impostava già.
            // ATTENZIONE (limite reale, non un difetto da correggere): le etichette del grafico
            // stanno in coordinate calcolate, non in un flusso di testo. Ingrandirle troppo le fa
            // accavallare — per questo il grafico avrà un intervallo più stretto degli altri
            // blocchi (vedi il controllo del carattere nel menu).
            //
            // Restano fuori solo SEPARATORE e DIVISORE, che non hanno testo affatto: il primo è una
            // linea, il secondo uno spazio vuoto (e ha già la sua "Altezza spazio" in mm).
            // Foto e Inquadramento hanno invece la DIDASCALIA, che ha una taglia in punti propria
            // e assoluta — regolabile già oggi, da un controllo diverso che verrà unificato.
            const BLOCCHI_CON_FONT_REGOLABILE = new Set(['dati-prova', 'tabella-colpi', 'tabella-riepilogo-parametri', 'tabella-dettagliata-parametri', 'allegato-formule', 'titolo', 'testo']);
            // TRAPPOLA EVITATA: questo insieme non dice solo "ha un font regolabile" — dice ANCHE
            // "è un blocco a righe", e in 6 punti decide se il contenitore riceve --tpl-riga-scale
            // oppure zoom:${scale} (vedi styleInner in costruisciHtmlBloccoEditor). Infilarci dentro
            // il grafico avrebbe quindi silenziosamente tolto lo zoom al grafico. Il font del
            // grafico vive perciò in un insieme SEPARATO, e chi vuole sapere solo "posso regolare
            // il carattere?" chiede a bloccoHaFontRegolabile(), non all'insieme.
            const BLOCCHI_CON_FONT_SVG = new Set(['grafico-stratigrafia']);
            /** L'unica domanda giusta da fare per mostrare il controllo del carattere. */
            function bloccoHaFontRegolabile(tipo) {
                return BLOCCHI_CON_FONT_REGOLABILE.has(tipo) || BLOCCHI_CON_FONT_SVG.has(tipo);
            }
            /** Blocchi il cui testo sta in coordinate fisse invece che in un flusso: ingrandirlo
             * oltre una certa misura lo fa accavallare, quindi l'intervallo è più stretto. */
            // Il tetto era 1.35, che sulla base misurata del grafico (6,4px, le etichette dei
            // valori) valeva circa 6,5pt: chiesto esplicitamente di poter arrivare "almeno a 10
            // punti", che richiede 2,08. A 2,2 il tetto è 10,5pt, con un margine.
            // Alzarlo si poteva fare solo DOPO aver reso la geometria dipendente dalla scala del
            // carattere (vedi `fs`/`hs` in buildStratigrafiaColpiRpdSvg): prima, un carattere più
            // grande ingrandiva solo le scritte dentro colonne larghe uguale, e il testo sbordava.
            const LIMITI_FONT_SCALE_STRETTI = { 'grafico-stratigrafia': { min: 0.8, max: 2.2 } };
            function limitiFontScaleBlocco(tipo) {
                return LIMITI_FONT_SCALE_STRETTI[tipo] || { min: 0.6, max: 1.8 };
            }
            // Blocchi "flowable" (richiesto esplicitamente: "voglio che l'editor si comporti come
            // Word... si deve creare una nuova pagina che riporti il continuo di quel blocco"): il
            // loro contenuto è organizzato in categorie (vedi data-categoria-index in
            // buildAllegatoHtml/htmlTabellaDettagliata) che non si spezzano mai a metà — quando il
            // blocco supera un'intera pagina, "continua" da solo su una o più pagine automatiche
            // invece di traslocare tutto intero sulla pagina successiva (vedi
            // sincronizzaFlussiBlocchiLunghi). Non usa BLOCCHI_CON_FONT_REGOLABILE perché non tutti
            // i blocchi a righe hanno un contenuto strutturato per categorie da tagliare.
            const BLOCCHI_FLOWABLE = new Set(['allegato-formule', 'tabella-dettagliata-parametri']);

            // Soglie del semaforo predittivo di piazzamento durante il drag (vedi
            // valutaQualitaPiazzamento) — in un unico posto, nominate, così da poterle rendere
            // configurabili in futuro senza toccare la logica di calcolo (richiesto esplicitamente).
            const SOGLIA_RESTRINGIMENTO_OK = 0.08;       // 0-8% di restringimento stimato -> verde
            const SOGLIA_RESTRINGIMENTO_LIMITE = 0.25;   // 8-25% -> giallo, oltre -> rosso
            // Blocchi per cui "restringimento" non è un concetto applicabile: si autoimpaginano da
            // soli (i flowable, su pagine di continuazione) o in unità fisiche assolute (il grafico
            // di stratigrafia, in mm — vedi styleInner in costruisciHtmlBloccoEditor) invece che con
            // scale/rigaScale. Il semaforo li considera sempre verdi.
            const BLOCCHI_SENZA_SCALA = new Set([...BLOCCHI_FLOWABLE, 'grafico-stratigrafia']);
            // Stessa soglia minima di scala usata dall'algoritmo reale di "Adatta" (vedi
            // gestisciInserimentoBloccoNuovoConOverflow) — hoisted qui ed esposta come funzione
            // condivisa così il semaforo live e l'algoritmo reale non possono mai disallinearsi.
            function scalaMinimaBlocco(tipo) { return BLOCCHI_CON_FONT_REGOLABILE.has(tipo) ? 0.4 : 0.1; }
            // Margine di sicurezza (px) sotto il quale un piccolo sforo non conta come overflow —
            // stesso valore e stesso ruolo di quello (prima locale) dentro
            // gestisciInserimentoBloccoNuovoConOverflow, hoisted qui per lo stesso motivo di sopra.
            const MARGINE_SICUREZZA_PX = 3;

            /** Libreria di "layout aurei" (richiesto esplicitamente): coppie di tipi di blocco che
             * ricorrono spesso affiancati sulla stessa riga — usata per suggerire in sidebar di
             * affiancarli o di sistemarne larghezza/ordine se già affiancati ma non ottimali (vedi
             * rilevaPatternLayoutPagina/renderSuggerimentiLayoutEditor). v1: solo coppie 50/50, nessun
             * rapporto asimmetrico — "dati-colpi" replica esattamente la riga 2 del template
             * "Classico" (vedi classicoPaginaDefault: dati-prova colSpan 2 + tabella-colpi colSpan 2),
             * conferma concreta che 50/50 è una scelta sensata per queste coppie, non solo una stima.
             * "tipi" è ordinato: l'ordine qui è anche l'ordine "ideale" da sinistra a destra. */
            const PATTERN_LAYOUT_AUREI = [
                { id: 'colpi-grafico', label: 'Colpi + Grafico', tipi: ['tabella-colpi', 'grafico-stratigrafia'] },
                { id: 'dati-colpi', label: 'Dati Prova + Colpi', tipi: ['dati-prova', 'tabella-colpi'] },
                { id: 'dati-grafico', label: 'Dati Prova + Grafico', tipi: ['dati-prova', 'grafico-stratigrafia'] },
            ];

            /** Scambia la posizione di due voci nello stesso row.blocks (per rimettere in ordine
             * "ideale" una coppia già affiancata ma nell'ordine sbagliato — vedi
             * applicaPatternLayoutOttimizza). Nessun effetto se uno dei due id non è in questa riga. */
            function scambiaOrdineInRiga(row, blockIdA, blockIdB) {
                const iA = row.blocks.findIndex(e => e.id === blockIdA);
                const iB = row.blocks.findIndex(e => e.id === blockIdB);
                if (iA < 0 || iB < 0) return false;
                const tmp = row.blocks[iA];
                row.blocks[iA] = row.blocks[iB];
                row.blocks[iB] = tmp;
                return true;
            }

            /** Sola matematica del bilanciamento larghezze, estratta da bilanciaRigaBlocco (vedi
             * poco più sotto) perché il pattern-layout deve poterla applicare "in silenzio", senza
             * gli effetti collaterali di quella funzione (apre il menu del blocco, mostra un suo
             * toast) — comportamento di bilanciaRigaBlocco invariato, ora chiama questo stesso
             * helper invece di ripetere il calcolo inline. Muta row in place, nessun render/undo:
             * responsabilità del chiamante, stessa convenzione del resto di questo file. */
            function dividiLarghezzaRigaEvenmente(row, cols) {
                if (!row || row.blocks.length < 2) return false;
                const fissi = row.blocks.filter(e => e.larghezzaFissata || e.posizioneBloccata || e.reserved);
                const liberi = row.blocks.filter(e => !e.larghezzaFissata && !e.posizioneBloccata && !e.reserved);
                if (liberi.length === 0) return false;
                const pctFissi = fissi.reduce((sum, e) => sum + Math.min(cols, e.colSpan || cols) / cols * 100, 0);
                const restante = Math.max(0, 100 - pctFissi);
                if (restante <= 0.5) return false;
                const pctOgnuno = restante / liberi.length;
                liberi.forEach(e => {
                    e.colSpan = pctOgnuno / 100 * cols;
                    e.espandiSuSpazioVuoto = pctOgnuno >= 99.5;
                });
                return true;
            }

            /** Localizza un tipo di blocco sulla pagina attiva (fuori da qualunque stack — v1:
             * i pattern non toccano blocchi impilati, troppo rischioso in questa fase). Ritorna
             * {entry, row, rowIndex, colIndex} oppure null se il tipo non è presente in pagina (il
             * caso comune: è un blocco-dati usato altrove, o non ancora inserito in questo report). */
            function trovaBloccoPerTipoInPagina(page, tipo) {
                for (let r = 0; r < page.rows.length; r++) {
                    const row = page.rows[r];
                    for (let c = 0; c < row.blocks.length; c++) {
                        const entry = row.blocks[c];
                        if (entry.type === tipo && !entry.stack) return { entry, row, rowIndex: r, colIndex: c };
                    }
                }
                return null;
            }

            /** Rileva, sulla pagina data, quali PATTERN_LAYOUT_AUREI sono applicabili e con quale
             * azione — funzione pura, nessuna scrittura DOM/stato, richiamabile ad ogni render della
             * sidebar senza costo. Per ciascun pattern: se manca uno dei due tipi non è applicabile
             * (niente da mostrare); se i due blocchi sono già nella stessa riga con colSpan quasi
             * uguali (differenza < 0.1) e nell'ordine giusto, è già perfetto (niente da mostrare);
             * se sono in righe diverse o mal proporzionati/ordinati, propone rispettivamente
             * "affianca" o "ottimizza" — MAI toccando una riga che contiene un blocco bloccato (vedi
             * rigaContieneBloccoBloccato), né come sorgente né come destinazione. */
            function rilevaPatternLayoutPagina(page) {
                if (!page || !page.rows) return [];
                const risultati = [];
                for (const pattern of PATTERN_LAYOUT_AUREI) {
                    const [tipoA, tipoB] = pattern.tipi;
                    const posA = trovaBloccoPerTipoInPagina(page, tipoA);
                    const posB = trovaBloccoPerTipoInPagina(page, tipoB);
                    if (!posA || !posB) continue;
                    if (posA.rowIndex === posB.rowIndex) {
                        const cols = page.cols || 4;
                        const differenza = Math.abs((posA.entry.colSpan || cols) - (posB.entry.colSpan || cols));
                        const ordineOk = posA.colIndex < posB.colIndex;
                        if (differenza < 0.1 && ordineOk) continue; // già perfetto
                        if (rigaContieneBloccoBloccato(page, posA.row)) continue;
                        risultati.push({ pattern, azione: 'ottimizza', blockIdA: posA.entry.id, blockIdB: posB.entry.id });
                    } else {
                        if (rigaContieneBloccoBloccato(page, posA.row) || rigaContieneBloccoBloccato(page, posB.row)) continue;
                        risultati.push({ pattern, azione: 'affianca', blockIdA: posA.entry.id, blockIdB: posB.entry.id });
                    }
                }
                return risultati;
            }

            /** Applica un suggerimento "ottimizza" (blocchi già affiancati, sistema solo ordine e
             * larghezze) o "affianca" (blocchi su righe diverse, li unisce in una). Ri-verifica la
             * rilevazione appena prima di mutare (la sidebar potrebbe non essere ancora stata
             * ridisegnata da un'ultima modifica dell'utente) e, per "affianca", usa undoTemplateEditor
             * come rete di sicurezza se un passaggio fallisse a metà (riga diventata bloccata nel
             * frattempo) invece di scrivere una logica di rollback su misura. */
            function applicaPatternLayoutEditor(risultato) {
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                if (!page) return;
                const rilevatiOra = rilevaPatternLayoutPagina(page);
                const ancoraValido = rilevatiOra.some(r => r.pattern.id === risultato.pattern.id && r.azione === risultato.azione
                    && r.blockIdA === risultato.blockIdA && r.blockIdB === risultato.blockIdB);
                if (!ancoraValido) {
                    mostraToastTemplateEditor('Questo layout non è più applicabile: la pagina è cambiata');
                    renderSuggerimentiLayoutEditor();
                    return;
                }

                const cols = page.cols || 4;
                if (risultato.azione === 'ottimizza') {
                    const voceA = trovaVoceContenenteBlocco(page, risultato.blockIdA);
                    const rowIdx = voceA ? trovaIndiceRigaPerVoce(page, voceA.id) : -1;
                    const row = rowIdx >= 0 ? page.rows[rowIdx] : null;
                    if (!row) return;
                    salvaUndoSnapshotEditor();
                    scambiaOrdineInRiga(row, risultato.blockIdA, risultato.blockIdB);
                    dividiLarghezzaRigaEvenmente(row, cols);
                    renderTemplateEditorCanvas();
                    renderTemplateEditorPagesStrip();
                    renderSuggerimentiLayoutEditor();
                    mostraToastTemplateEditor(`Layout ottimizzato: ${risultato.pattern.label}`);
                    return;
                }

                // "affianca": sposta blockIdB nella riga di blockIdA.
                salvaUndoSnapshotEditor();
                const rimosso = rimuoviBloccoDaPagina(page, risultato.blockIdB);
                if (!rimosso) {
                    // Riga di B diventata bloccata nel frattempo: lo snapshot appena preso non ha
                    // ancora mutato niente, ma tanto vale non lasciarlo in giro nello stack undo.
                    // scartaUltimoSnapshotEditor e non un pop nudo: rimette anche Ripeti com'era.
                    scartaUltimoSnapshotEditor();
                    mostraToastTemplateEditor('Non è stato possibile affiancare: una riga coinvolta è bloccata');
                    renderSuggerimentiLayoutEditor();
                    return;
                }
                // Ritrova la riga di A DOPO la rimozione: se questa ha eliminato una riga sopra
                // quella di A (rowWasRemoved), l'indice di riga di A si è spostato.
                const voceA = trovaVoceContenenteBlocco(page, risultato.blockIdA);
                const rowIdxA = voceA ? trovaIndiceRigaPerVoce(page, voceA.id) : -1;
                const rowA = rowIdxA >= 0 ? page.rows[rowIdxA] : null;
                const inserito = rowA && inserisciBloccoInPagina(page, rimosso.block, { rowIndex: rowIdxA, insertIndex: rowA.blocks.length, newRow: false });
                if (!inserito) {
                    // Non dovrebbe succedere praticamente mai vista la riverifica sopra (riga di A
                    // diventata bloccata proprio tra la rimozione di B e questo inserimento): invece
                    // di lasciare B "in aria" da qualche parte, si annulla tutto in un colpo solo.
                    // senzaTraccia: lo stato di adesso (B tolto e non rimesso) non deve finire in Ripeti.
                    undoTemplateEditor({ senzaTraccia: true });
                    mostraToastTemplateEditor('Non è stato possibile completare l\'affiancamento');
                    renderSuggerimentiLayoutEditor();
                    return;
                }
                dividiLarghezzaRigaEvenmente(rowA, cols);
                renderTemplateEditorCanvas();
                renderTemplateEditorPagesStrip();
                renderSuggerimentiLayoutEditor();
                mostraToastTemplateEditor(`Blocchi affiancati: ${risultato.pattern.label}`);
            }

            /** Ridisegna la sezione "Layout suggeriti" della sidebar (vedi
             * #templateEditorLayoutSuggestionsSection) in base ai pattern rilevati sulla pagina
             * attiva — nascosta del tutto quando non c'è nulla da suggerire. Richiamata dai punti in
             * cui la pagina attiva o il suo contenuto possono essere cambiati (drop, undo, cambio
             * pagina, apertura editor, applicazione di un suggerimento) — deliberatamente NON
             * agganciata dentro renderTemplateEditorCanvas stessa (funzione lunga e con code
             * asincrone in coda, rischiosa da toccare per un effetto collaterale secondario come
             * questo): un elenco esplicito di punti di chiamata, più sicuro. */
            function renderSuggerimentiLayoutEditor() {
                const sezione = document.getElementById('templateEditorLayoutSuggestionsSection');
                const cont = document.getElementById('templateEditorLayoutSuggestions');
                if (!sezione || !cont) return;
                const page = templateEditorState.pages[templateEditorState.activePageIdx];
                const risultati = page ? rilevaPatternLayoutPagina(page) : [];
                if (risultati.length === 0) {
                    sezione.style.display = 'none';
                    cont.innerHTML = '';
                    return;
                }
                sezione.style.display = 'block';
                cont.innerHTML = risultati.map((r, i) => {
                    const testo = r.azione === 'affianca' ? `Affianca: ${r.pattern.label}` : `Ottimizza: ${r.pattern.label}`;
                    return `<button type="button" class="btn-action" data-suggerimento-idx="${i}" style="width:100%; font-size:11px; padding:6px 8px; text-align:left;">${escapeHtmlDidascalia(testo)}</button>`;
                }).join('');
                cont.querySelectorAll('[data-suggerimento-idx]').forEach(btn => {
                    btn.addEventListener('click', () => applicaPatternLayoutEditor(risultati[parseInt(btn.dataset.suggerimentoIdx, 10)]));
                });
            }

            /** I SEGMENTI DI UN BLOCCO DI TESTO: i pezzi fra un'interruzione manuale e la
             * successiva.
             *
             * Un'interruzione dentro il testo disegnava una riga tratteggiata e basta: il blocco
             * continuava a crescere oltre il bordo del foglio, e la pagina dopo non nasceva mai.
             * Qui quella riga diventa quello che dice di essere — la fine di una pagina — e i
             * pezzi che delimita diventano le unita' che l'impaginazione sposta, esattamente
             * come le categorie di una tabella lunga.
             *
             * I pezzi vuoti (due interruzioni di fila, o una in fondo) si scartano: sono un gesto
             * senza contenuto, e farne una pagina bianca sarebbe l'errore peggiore di tutti. */
            function segmentiTesto(html) {
                const testo = String(html || '');
                if (!testo || testo.indexOf('data-interruzione-pagina') === -1) return [testo];
                try {
                    const doc = new DOMParser().parseFromString('<div id="r">' + testo + '</div>', 'text/html');
                    const radice = doc.getElementById('r');
                    const pezzi = [];
                    let corrente = doc.createElement('div');
                    Array.from(radice.childNodes).forEach(nodo => {
                        if (nodo.nodeType === 1 && nodo.hasAttribute && nodo.hasAttribute('data-interruzione-pagina')) {
                            pezzi.push(corrente.innerHTML);
                            corrente = doc.createElement('div');
                            return;
                        }
                        corrente.appendChild(nodo.cloneNode(true));
                    });
                    pezzi.push(corrente.innerHTML);
                    const pieni = pezzi.filter(p => p.replace(/<[^>]+>/g, '').trim() !== '' || /<(img|table|hr)/i.test(p));
                    return pieni.length > 0 ? pieni : [testo];
                } catch (e) {
                    // Un HTML malformato non deve far sparire il testo: peggio che vada, il blocco
                    // resta intero e non si spezza. Mai il contrario.
                    return [testo];
                }
            }

            /** «Questo blocco puo' continuare sulla pagina dopo?»
             *
             * DOMANDA DIVERSA da BLOCCHI_FLOWABLE, che invece dice «questo blocco occupa la riga
             * da solo». Finora coincidevano perche' gli unici blocchi divisibili erano due
             * tabelle lunghe; tenerle unite adesso vorrebbe dire che ogni blocco di testo con
             * un'interruzione si prende la riga tutta per se' — cioe' cambiare il layout di ogni
             * template esistente per un motivo che non c'entra niente. */
            function eBloccoSpezzabile(blk) {
                if (!blk || blk.stack) return false;
                if (BLOCCHI_FLOWABLE.has(blk.type)) return true;
                return blk.type === 'testo' && segmentiTesto(blk.richHtml).length > 1;
            }

            /** Gli indici di segmento davanti ai quali si va a pagina nuova. Per una tabella
             * lunga sono le interruzioni che l'utente ha messo nel menu; per un testo sono TUTTI
             * i confini, perche' li' l'interruzione l'ha gia' scritta dentro il testo. */
            function indiciForzatiBlocco(blk, numCategorie) {
                if (!blk) return new Set();
                if (blk.type === 'testo') {
                    const forzati = new Set();
                    for (let i = 1; i < numCategorie; i++) forzati.add(i);
                    return forzati;
                }
                return new Set(Array.isArray(blk.categorieForzaPaginaPrima) ? blk.categorieForzaPaginaPrima : []);
            }
            // GRIGLIA TABELLA (richiesta esplicitamente: "disattivare le righe delle tabelle... sono
            // sempre un pugno in un occhio", con l'ipotesi — corretta — che aiuti anche a condensare).
            // Solo i blocchi che hanno DAVVERO una griglia da spegnere: 'titolo'/'testo' (pur essendo
            // in BLOCCHI_CON_FONT_REGOLABILE) non hanno tabelle, e 'dati-prova' ha sì delle tabelle
            // ma volutamente SENZA bordi tra le celle da sempre (vedi .databox-tabella e la sua
            // regola "border:none" in getReportPrintStyleBlock) — offrire il controllo lì sarebbe un
            // comando che non fa niente, peggio di un comando assente.
            const BLOCCHI_CON_GRIGLIA_TABELLA = new Set(['tabella-colpi', 'tabella-riepilogo-parametri', 'tabella-dettagliata-parametri', 'allegato-formule']);
            /** Traduce la scelta di griglia di UN blocco nelle due variabili CSS che i bordi delle
             * celle leggono (vedi la regola "th, td" in getReportPrintStyleBlock e i bordi in linea
             * di bordoExp/thExp/tdExp). Stessa tecnica di --tpl-riga-scale/--tpl-font-scale:
             * variabili ereditate dal contenuto, impostate sul contenitore del blocco — è questo che
             * garantisce che editor e stampa mostrino la stessa cosa senza duplicare logica.
             * Stringa VUOTA per il default 'tutti': nessuna variabile scritta, i valori di fallback
             * nelle var() restano quelli storici, quindi zero effetto su ogni template esistente. */
            function stileGrigliaTabellaBlocco(blockObj) {
                const scelta = blockObj && blockObj.grigliaTabella;
                if (scelta === 'nessuno') return ' --tpl-bordo-h:none; --tpl-bordo-v:none;';
                if (scelta === 'orizzontali') return ' --tpl-bordo-v:none;';
                return '';
            }
            /** Elenco {indice, etichetta} delle categorie di un blocco flowable, nello STESSO
             * ordine in cui buildAllegatoHtml/htmlTabellaDettagliata le costruiscono (data-
             * categoria-index) — usato dal menu del blocco per il "superpotere" di interruzione di
             * pagina manuale (richiesto esplicitamente). ATTENZIONE: è un elenco statico separato,
             * NON derivato dal codice che genera davvero l'HTML — se cambia l'ordine/il numero
             * delle sezioni in una delle due funzioni sopra, va aggiornato anche qui, altrimenti
             * l'etichetta mostrata nel menu non corrisponde più alla categoria giusta (gli indici
             * restano comunque corretti/funzionanti, solo l'etichetta sbaglierebbe nome). */
            function elencoCategorieBlocco(tipo, blk) {
                if (tipo === 'testo') {
                    return segmentiTesto(blk && blk.richHtml).map((_, indice) => ({ indice, etichetta: 'Parte ' + (indice + 1) }));
                }
                if (tipo === 'allegato-formule') {
                    return [
                        'Identificazione strato', 'Condizioni e tipologia', 'Peso unità di volume [t/m³]',
                        'Angolo di attrito [°]', 'Coesione non drenata [kg/cm²]', 'Modulo Elastico (Young) [kg/cm²]',
                        'Modulo Edometrico [kg/cm²]', 'Densità relativa [%]', 'Modulo di taglio [kg/cm²]',
                        'Resistenza punta CPT [kg/cm²]', 'Resistenza compressione [kg/cm²]'
                    ].map((etichetta, indice) => ({ indice, etichetta }));
                }
                if (tipo === 'tabella-dettagliata-parametri') {
                    const etichette = ['Condizioni e tipologia', 'Peso unità di volume [t/m³]'];
                    ORDINE_PARAMETRI.forEach(catId => etichette.push(ETICHETTE_PARAMETRO[catId].estesa));
                    etichette.push('Resistenza a compressione');
                    return etichette.map((etichetta, indice) => ({ indice, etichetta }));
                }
                return [];
            }
            // Stesse taglie in punti dell'elenco predefinito di Word (richiesto esplicitamente,
            // "solo per i testi... i classici numeri di grandezza che userebbe anche word"): usata
            // dal menu di Titolo/Testo al posto della percentuale Aa−/Aa+ (che resta invece per le
            // tabelle, dove una % relativa alla larghezza colonne ha più senso di un punto assoluto).
            const TAGLIE_FONT_WORD = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 44, 48, 54, 60, 66, 72, 80, 88, 96];
            // Livelli di titolo H1/H2/H3 (richiesto esplicitamente, solo per il blocco "Titolo"):
            // scegliere un livello imposta la taglia canonica di quel livello (comunque poi
            // regolabile a piacere dal selettore "Dimensione carattere" qui sopra) — serve
            // soprattutto a dichiarare la gerarchia del documento (sezione/sottosezione/paragrafo)
            // con un click solo, invece di ricordarsi a memoria quale numero di punti usare ogni
            // volta per restare coerenti tra un titolo e l'altro nello stesso report.
            const LIVELLI_TITOLO = { h1: { pt: 18, label: 'H1' }, h2: { pt: 14, label: 'H2' }, h3: { pt: 12, label: 'H3' } };

            /** Sfugge il testo di una didascalia scritta a mano prima di iniettarla come HTML
             * (l'utente digita testo libero in un campo dell'editor). */
            function escapeHtmlDidascalia(testo) {
                return String(testo).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
            }
            /** Aggiunge sotto il contenuto (foto o mappa satellitare) la didascalia — quella scritta
             * a mano dall'utente (blockObj.captionOverride) se presente, altrimenti quella automatica
             * "Figura N - ..." (vedi didascaliaAutomaticaBlocco). Se non c'è nessun testo (né override
             * né posizione nota) il contenuto resta senza didascalia, invariato. */
            function avvolgiConDidascalia(contentHtml, type, ctx, blockObj) {
                if (!contentHtml) return contentHtml;
                const override = blockObj && blockObj.captionOverride;
                const testo = (override !== undefined && override !== null && override !== '') ? override : didascaliaAutomaticaBlocco(type, blockObj, ctx);
                if (!testo) return contentHtml;
                // Dimensione didascalia (richiesta esplicitamente: "dovrebbe essere regolata dalla
                // grandezza font", indipendente dall'altezza/zoom del contenuto sopra — segnalato
                // insieme al bug per cui, per le foto, si ingrandiva insieme allo zoom del
                // riquadro perché viveva nello stesso contenitore. blockObj.captionFontSizePt,
                // selettore "Dimensione" nel menu della didascalia): 8pt di default, equivalente al
                // precedente valore fisso 10.5px.
                const ptDidascalia = (blockObj && blockObj.captionFontSizePt) || 8;
                return `${contentHtml}<div data-ruolo="didascalia" style="margin-top:6px; text-align:center; font-size:${ptDidascalia}pt; color:#334155; font-style:italic;">${marcaNumeroDidascalia(testo, blockObj, type)}</div>`;
            }

            /** Inietta le interruzioni di pagina manuali per categoria (richiesto esplicitamente,
             * "il tasto del superpotere per spezzare le categorie in una nuova pagina" — blockObj.
             * categorieForzaPaginaPrima, scelto dal menu del blocco, vedi apriMenuBloccoEditor)
             * nell'HTML già pronto in ctx (condiviso/calcolato una volta sola per tutte le istanze
             * di questo tipo di blocco, vedi computeEditorPreviewCtx) senza doverlo ricostruire da
             * capo per ognuna. Uno stile CSS mirato per data-categoria-index (vedi
             * buildAllegatoHtml/htmlTabellaDettagliata) forza "prima di questa categoria, sempre
             * una pagina nuova" in stampa reale — scoperto ad un id univoco di QUESTO blockObj (non
             * un selettore globale) così due blocchi flowable diversi nello stesso documento, con
             * interruzioni manuali diverse, non si influenzano a vicenda. Nell'editor questo stesso
             * CSS iniettato è innocuo (page-break-before non ha effetto nel canvas interattivo,
             * fuori da una vera stampa) — il taglio automatico dell'editor rispetta già le
             * interruzioni manuali per conto proprio (vedi sincronizzaFlussiBlocchiLunghi,
             * indiciForzati), questa iniezione serve alla stampa. */
            /** Avvolge SEMPRE (una volta sola) l'html del blocco flowable in un <div id="tpl-flowable-
             * {id}">, indipendentemente da quali toggle di stampa siano attivi — così
             * applicaInterruzioniPaginaManualiCategoria può iniettare un semplice <style scoped>
             * puntato a questo id per le interruzioni manuali di categoria. Va chiamata PRIMA, vedi
             * buildBlockContentHtml. */
            function avvolgiScopeFlowable(html, blockObj) {
                if (!html || !blockObj) return html;
                return `<div id="tpl-flowable-${blockObj.id}">${html}</div>`;
            }
            function applicaInterruzioniPaginaManualiCategoria(html, blockObj) {
                if (!html || !blockObj) return html;
                const indici = Array.isArray(blockObj.categorieForzaPaginaPrima) ? blockObj.categorieForzaPaginaPrima : [];
                if (indici.length === 0) return html;
                const scopeId = `tpl-flowable-${blockObj.id}`;
                const selettori = indici.map(i => `#${scopeId} table[data-categoria-index="${i}"]`).join(',');
                return `<style>${selettori}{page-break-before:always; break-before:page;}</style>${html}`;
            }

            /** "Divisione intelligente delle categorie" RIMOSSA (richiesto esplicitamente: "non deve
             * mai accadere che siano spezzate le righe di una stessa categoria" — bug segnalato con
             * screenshot: un override CSS scoped opt-in rimuoveva break-inside:avoid dal <tbody
             * data-righe-categoria>, e il motore di stampa del browser spezzava una categoria a
             * QUALUNQUE riga capitasse, anche subito dopo la riga "solo autore" e prima di tutte le
             * sue righe di dati — un taglio che non ha mai senso per il lettore). Il comportamento
             * predefinito di costruisciTabellaCategoria (break-inside:avoid sul <tbody
             * data-righe-categoria>, categoria sempre intera, mai spezzata) resta l'UNICO
             * comportamento possibile ora, per ogni blocco, senza eccezioni/opt-in. */

            // applicaRipetizioneIntestazioneContinuazione RIMOSSA (richiesto esplicitamente, poi
            // corretto: "non deve mai ripetersi l'intestazione"). Qui nell'EXPORT il titolo/info
            // prova (classe chunk-titolo-glue) non si è MAI ripetuto: fondiTitoliConSuccessivo lo
            // incolla come un unico atomo alla prima categoria, quindi compare una volta sola sulla
            // pagina fisica dove cade quella categoria — nessun cambiamento necessario qui.
            // Nell'EDITOR invece il titolo veniva ricostruito da zero su ogni pagina di
            // continuazione (vedi costruisciRigaContinuazionePagina, che re-includeva sempre
            // l'HTML completo del blocco) e quindi compariva anche lì: risolto marcandolo con
            // data-titolo-tabella-blocco ed escludendolo su ogni pagina che non sia quella di
            // origine (vedi filtraCategorieHtmlFlowable/miniaturaPaginaContinuazione).

            /** Dato il tipo di blocco e il "contesto" già calcolato una volta per l'intera prova
             * (vedi ctx in buildSurveyReportHtml), restituisce il frammento HTML del blocco. Il
             * terzo parametro `blockObj` serve al blocco "immagine-libera" ("Foto prova": quale foto
             * mostrare dipende dalla sua posizione tra i blocchi "Foto prova" del template, vedi
             * calcolaIndiciImmaginePerBlocco/ctx.immagineIndexPerBlocco), al blocco "inquadramento"
             * (blockObj.satelliteZoom sceglie lo zoom della mappa, per-blocco) e a entrambi per la
             * didascalia (blockObj.captionOverride / numerazione automatica "Figura N", vedi
             * avvolgiConDidascalia). */
            /** `geo` ({span, cols}) arriva dai due imbuti che conoscono la griglia:
             * costruisciHtmlBloccoEditor per la tela e buildContenutoVoceStampa per la stampa.
             * Serve al solo blocco grafico, che è l'unico a impaginarsi da sé in unità fisiche e
             * quindi ha bisogno di sapere quanto è largo davvero. Opzionale: chi non lo passa
             * ottiene la larghezza di riga piena, che è ciò che facevano tutti finora. */
            function buildBlockContentHtml(blockType, ctx, blockObj, geo) {
                switch (blockType) {
                    case 'dati-prova': {
                        // Disposizione/ordine personalizzati per QUESTO blocco (richiesto
                        // esplicitamente: le 3 schede possono affiancarsi in orizzontale invece di
                        // restare sempre impilate, e riordinarsi) — se il blocco non ha personalizzazioni
                        // si riusa l'HTML di default già pronto in ctx, invariato rispetto a prima.
                        /* PRIMA c'era un test `personalizzato` che ricostruiva il blocco solo se
                         * una delle personalizzazioni note era attiva, e altrimenti riusava
                         * l'HTML già pronto in ctx. Era una micro-ottimizzazione con un difetto
                         * strutturale: ogni volta che si aggiunge un'opzione bisogna ricordarsi
                         * di aggiungerla anche a quel test, e se lo si dimentica l'opzione esiste,
                         * si salva, si vede nel menu — e non fa niente. È esattamente il modo in
                         * cui i tag @ sono rimasti vuoti per due versioni. Ora: se i parametri
                         * grezzi ci sono si ricostruisce sempre, e non c'è più un elenco da tenere
                         * aggiornato. L'HTML pronto resta solo come ripiego quando i grezzi
                         * mancano. */
                        if (ctx.datiBoxRawParams) {
                            const p = ctx.datiBoxRawParams;
                            return buildDatiBoxHtml(p.numero, p.comune, p.localita, p.committente, p.dateStr, p.inst, p.passoCm, p.falda, p.stratiEff, {
                                disposizione: disposizioneSchede(blockObj),
                                ordine: blockObj && blockObj.ordineSchede,
                                zebra: !!(blockObj && blockObj.schedeZebra),
                                tinta: blockObj && blockObj.schedeTinta
                            });
                        }
                        return ctx.datiBoxHtml || '';
                    }
                    case 'tabella-colpi': return ctx.colpiTableHtml || '';
                    case 'grafico-stratigrafia': {
                        // Ricostruito PER-BLOCCO (non l'HTML condiviso già pronto in ctx) cosi la
                        // Larghezza del blocco (colSpan/cols) condensa lateralmente anche questo
                        // grafico invece di limitarsi a schiacciarlo via CSS (vedi
                        // buildStratigrafiaColpiRpdSvg).
                        const raw = ctx.stratigrafiaChartRawParams;
                        if (!raw || !raw.stratiEff || raw.stratiEff.length === 0) return ctx.stratigrafiaChartHtml || '';
                        // Compattezza: deriva dalla Larghezza unificata del blocco (colSpan/cols,
                        // richiesta esplicitamente, riorganizzazione posizionamento/
                        // ridimensionamento — non più un widthPct separato). 4 è il numero di
                        // colonne di default della griglia (page.cols), usato qui come riferimento
                        // dato che questa funzione non riceve la pagina.
                        const colsGriglia = (geo && geo.cols) || 4;
                        const spanBlocco = (geo && geo.span) || (blockObj && blockObj.colSpan) || colsGriglia;
                        const larghezzaGrafico = larghezzaBloccoGraficoPx(ctx && ctx.larghezzaUtileMm, spanBlocco, colsGriglia);
                        // Scala verticale per-blocco (richiesta esplicitamente dopo lo screenshot
                        // della prova da 1,2 m disegnata su un asse fino a 3 m): profondità del
                        // fondo scala e altezza del grafico vivono sul blocco, come colSpan qui
                        // sopra — due blocchi grafico nello stesso template possono volerle diverse
                        // (es. uno di dettaglio sui primi metri e uno d'insieme).
                        return buildStratigrafiaColpiRpdSvg(raw.stratiEff, raw.logsCalc, raw.provaNr, larghezzaGrafico, {
                            profonditaAsseM: profonditaAsseEffettiva(blockObj, ctx),
                            altezza: blockObj && blockObj.altezzaScalaGrafico,
                            fontPt: blockObj && blockObj.fontSizePt,
                            legenda: blockObj && blockObj.legendaGrafico,
                            retinoLegenda: blockObj && blockObj.retinoLegendaGrafico,
                            mostraGuidaNomi: !!(ctx && ctx.anteprima) && !!(blockObj && blockObj.mostraGuidaNomiGrafico),
                            // fontScale NON arriva più: il carattere del grafico è ora una misura
                            // in punti assoluta (fontSizePt, sopra), come in Titolo e Testo. Il
                            // moltiplicatore serviva quando il testo era `calc(px * var(--scale))`
                            // dentro l'SVG, e proprio quel doppio passaggio — una volta nel CSS del
                            // testo, una volta nella larghezza delle colonne — era ciò che faceva
                            // rimpicciolire l'intero disegno ingrandendo le scritte.
                            larghezzaColonne: blockObj && blockObj.larghezzaColonneGrafico,
                            spazioEtichette: blockObj && blockObj.spazioEtichetteGrafico,
                            // Stessa falda dell'export: viaggia dentro i "grezzi" insieme a
                            // stratiEff/logsCalc, così l'anteprima nell'editor non può mostrare
                            // una colonna falda diversa da quella che finisce nel PDF.
                            falda: raw.falda
                        });
                    }
                    case 'inquadramento': {
                        // IL BLOCCO INQUADRAMENTO, ricostruito.
                        //
                        // Era pensato per il template di UNA prova e ne mostrava una sola. Nel
                        // capitolo introduttivo deve mostrarle tutte insieme, e mostrare la
                        // stessa area a due scale. Le impostazioni vivono ora in blockObj.mappa
                        // (centro geografico + zoom); i template salvati con il vecchio modello
                        // vengono convertiti al volo, cosi' una figura gia' consegnata non si
                        // sposta da sola.
                        const b = blockObj || {};
                        const tutteLeProve = b.mappaTutteLeProve === true;
                        const puntiDisponibili = ctx.puntiProveProgetto || [];
                        const puntiBlocco = tutteLeProve
                            ? puntiDisponibili
                            : (ctx.gpsInfo ? [{ lat: ctx.gpsInfo.lat, lng: ctx.gpsInfo.lng, numero: ctx.gpsInfo.provaNr }] : []);
                        if (puntiBlocco.length === 0) return ctx.mapSatelliteHtml || '';

                        // Il centro: quello scelto a mano se c'e', altrimenti calcolato perche'
                        // TUTTI i punti ci stiano dentro. Con una prova sola si comporta come
                        // prima; con cinque, inquadra il cantiere invece di centrarne una e
                        // sperare che le altre caschino dentro.
                        const larghezzaMm = b.mappaLarghezzaMm || 140;
                        const altezzaMm = b.mappaAltezzaMm || larghezzaMm;
                        let mappa = b.mappa;
                        if (!mappa || !mappa.centro) {
                            mappa = tutteLeProve
                                ? inquadraturaPerPunti(puntiBlocco, larghezzaMm * 4, altezzaMm * 4, 19)
                                : convertiInquadramentoVecchio(b, parseFloat(puntiBlocco[0].lat), parseFloat(puntiBlocco[0].lng));
                        }
                        // IL CONTROLLO CHE MANCAVA. Fin qui il centro salvato nel template
                        // vinceva sempre, anche su un cantiere dall'altra parte d'Italia: e' il
                        // caso Roma/Brindisi. Adesso il centro viene riverificato sui punti veri.
                        mappa = inquadraturaSicura(mappa, puntiBlocco, larghezzaMm * 4, altezzaMm * 4);
                        if (!mappa || !mappa.centro) return ctx.mapSatelliteHtml || '';

                        const modoEtichetta = b.satelliteCustomLabelMode || 'none';
                        let etichettaLibera = '';
                        if (modoEtichetta === 'localita') etichettaLibera = (ctx.datiBoxRawParams && ctx.datiBoxRawParams.localita) || '';
                        else if (modoEtichetta === 'comune') etichettaLibera = (ctx.datiBoxRawParams && ctx.datiBoxRawParams.comune) || '';
                        else if (modoEtichetta === 'custom') etichettaLibera = b.satelliteCustomLabelText || '';

                        // La vecchia percentuale 100..200 dei toponimi diventa un numero di passi
                        // di zoom: ingrandisce senza spostare le etichette dal loro posto.
                        const vecchiaScalaToponimi = b.satelliteLabelsScale || 100;
                        const passiToponimi = (b.ingrandimentoToponimi !== undefined)
                            ? b.ingrandimentoToponimi
                            : (vecchiaScalaToponimi >= 175 ? 2 : (vecchiaScalaToponimi >= 125 ? 1 : 0));

                        const mapHtml = buildMappaInquadramentoHtml({
                            centro: mappa.centro,
                            // Se l'inquadratura e' stata rifatta perche' il centro salvato non
                            // teneva dentro le prove, vale il suo zoom: tenere quello vecchio
                            // rimetterebbe le pin fuori dal riquadro dalla porta di servizio.
                            zoom: mappa.ricalcolata ? mappa.zoom : (b.mappaZoom || mappa.zoom || b.satelliteZoom || 16),
                            provider: b.mappaProvider || mappa.provider || 'esri-satellite',
                            wmsUrl: b.mappaWmsUrl, wmsLayer: b.mappaWmsLayer,
                            attribuzione: b.mappaAttribuzione,
                            larghezzaMm, altezzaMm,
                            pin: puntiBlocco.map(p => Object.assign({}, p, (b.mappaEtichettePin || {})[p.numero] || {})),
                            etichetteAttive: b.mappaEtichettePinAttive !== false,
                            misuraEtichetta: b.mappaMisuraEtichettaPin,
                            etichette: !(b.satelliteLabels === false),
                            opacitaToponimi: (b.satelliteLabelsOpacity != null) ? b.satelliteLabelsOpacity : 100,
                            ingrandimentoToponimi: passiToponimi,
                            etichettaLibera,
                            etichettaLiberaMisura: b.satelliteCustomLabelFontSize,
                            etichettaLiberaX: (b.satelliteCustomLabelPosX != null) ? b.satelliteCustomLabelPosX : 50,
                            etichettaLiberaY: (b.satelliteCustomLabelPosY != null) ? b.satelliteCustomLabelPosY : 20,
                            // L'inquadramento regionale: spento di default. Un secondo riquadro
                            // che compare da solo su tutte le figure gia' fatte sarebbe una
                            // sorpresa, e le sorprese in un documento firmato non vanno bene.
                            // L'etichetta del riquadro regionale ha lo stesso problema del centro,
                            // in piccolo: scritta a mano dentro il template, un template composto
                            // a Roma stampa "ROMA" anche a Brindisi. Quindi ha un MODO, e per
                            // difetto e' automatica — si rilegge dal cantiere ad ogni stampa.
                            // Il valore va imposto DOPO l'Object.assign: prima, un'etichetta
                            // salvata vuota avrebbe zittito per sempre quella automatica.
                            inset: Object.assign(
                                Object.assign({ attivo: false, posizione: 'alto-destra' }, b.mappaInset || {}),
                                { etichetta: testoEtichettaAutomatica(
                                      (b.mappaInset && b.mappaInset.etichettaModo)
                                          || ((b.mappaInset && b.mappaInset.etichettaComune === false) ? 'none' : 'comune'),
                                      (b.mappaInset && b.mappaInset.etichetta) || '',
                                      ctx.datiBoxRawParams || {}) }
                            ),
                            mostraNord: b.mappaMostraNord === true,
                            nord: b.mappaNord || { posizione: 'alto-destra' },
                            mostraScala: b.mappaMostraScala !== false,
                            scala: Object.assign({ posizione: 'basso-sinistra' }, b.mappaScala || {})
                        });
                        return avvolgiConDidascalia(mapHtml, 'inquadramento', ctx, blockObj);
                    }
                    case 'tabella-riepilogo-parametri': return ctx.tabellaRiepilogoHtml || '';
                    // applicaInterruzioniPaginaManualiCategoria (richiesto esplicitamente, "il
                    // tasto del superpotere per spezzare le categorie in una nuova pagina"): l'HTML
                    // di ctx è condiviso/calcolato una volta sola per tutte le istanze di questo
                    // tipo di blocco (vedi computeEditorPreviewCtx) — le interruzioni manuali sono
                    // invece una scelta di QUESTO specifico blockObj, iniettate qui al momento di
                    // restituire il contenuto, sia per l'editor sia per la stampa reale (stessa
                    // funzione condivisa da entrambi, vedi buildContenutoVoceStampa/
                    // costruisciHtmlBloccoEditor più sopra — evita esattamente la stessa classe di
                    // disallineamento editor/stampa già risolta altrove in questa sessione).
                    case 'tabella-dettagliata-parametri': return applicaInterruzioniPaginaManualiCategoria(avvolgiScopeFlowable(ctx.tabellaDettagliataHtml || '', blockObj), blockObj);
                    case 'allegato-formule': return applicaInterruzioniPaginaManualiCategoria(avvolgiScopeFlowable(ctx.allegatoHtml || '', blockObj), blockObj);
                    case 'immagine-libera': {
                        // Foto automatica della prova per POSIZIONE (non più un'immagine caricata a
                        // mano): il blockObj.id individua l'indice di questo blocco tra tutti i
                        // blocchi "Foto prova" del template (vedi calcolaIndiciImmaginePerBlocco), poi
                        // quell'indice pesca la foto corrispondente nella galleria della prova
                        // (ctx.photoUrls, risolta — anche da IndexedDB — in buildSurveyReportHtml per
                        // la stampa, o da aggiornaCtxFotoEditor per l'editor).
                        const idx = blockObj && ctx.immagineIndexPerBlocco ? ctx.immagineIndexPerBlocco[blockObj.id] : undefined;
                        const url = (idx !== undefined && ctx.photoUrls) ? ctx.photoUrls[idx] : null;
                        if (!url) return '';
                        // decoding="async": foto di cantiere dal telefono, spesso diversi MB in
                        // base64 — senza questo attributo la decodifica blocca il thread principale
                        // ogni volta che il canvas viene ricostruito da capo (ogni azione su
                        // QUALSIASI blocco della stessa pagina, non solo su questa foto).
                        // Altezza del riquadro in mm, indipendente dallo zoom (richiesto
                        // esplicitamente: "lo Zoom non serve, al massimo dovrei poter regolare
                        // l'altezza del riquadro" — segnalato insieme al bug per cui la didascalia
                        // si ingrandiva insieme alla foto). object-fit:contain mantiene le proporzioni
                        // della foto dentro quell'altezza fissa, stesso identico pattern già usato per
                        // l'intestazione (page.header.heightMm). La var CSS (con fallback al valore di
                        // blockObj) permette all'anteprima dal vivo della maniglia di trascinamento di
                        // aggiornare solo questo contenitore, vedi attivaManigliaScalaBlocco.
                        const altezzaFotoMm = (blockObj && blockObj.heightMm) || 70;
                        const img = `<div style="height:calc(var(--tpl-photo-height-mm, ${altezzaFotoMm}) * 1mm); overflow:hidden; border-radius:4px;"><img src="${url}" decoding="async" style="display:block; width:100%; height:100%; object-fit:contain;"></div>`;
                        return avvolgiConDidascalia(img, 'immagine-libera', ctx, blockObj);
                    }
                    // Blocchi di libertà d'impaginazione (richiesti esplicitamente): non dipendono
                    // dai dati della prova, il contenuto vive interamente su blockObj.
                    case 'titolo': {
                        if (!blockObj || !blockObj.richHtml) return '';
                        // font-weight:700 (era 800): Arial non ha davvero un peso 800 come file — il
                        // browser lo "finge" ispessendo artificialmente il 700 esistente (bold
                        // sintetico), che è esattamente l'aspetto "strano" segnalato. 700 è il grassetto
                        // vero del font, niente più effetto sintetico. Font-family con fallback
                        // esplicito a system-ui/sans-serif generico, nel raro caso Arial non sia
                        // disponibile sul dispositivo (altro modo in cui un font può apparire "strano").
                        // Dimensione in punti scelta direttamente dall'utente (richiesto esplicitamente,
                        // "i classici numeri di grandezza che userebbe anche word"): niente più
                        // moltiplicatore --tpl-font-scale qui, la taglia è già quella scelta.
                        // La misura del titolo viene dallo STILE DEL DOCUMENTO in base al livello
                        // (H1/H2/H3). Il valore per blocco resta possibile ma diventa un'eccezione
                        // dichiarata, non piu' l'unico modo di decidere: cambiare i titoli di una
                        // relazione voleva dire aprirli uno per uno.
                        // La misura viene dallo STILE DEL DOCUMENTO, in base al livello, e passa
                        // da una variabile CSS invece che da un valore calcolato qui. Cosi' non
                        // c'e' niente da propagare fino a questo punto: anteprima e stampa leggono
                        // la stessa variabile, e non possono dire due numeri diversi.
                        // Una misura scelta per il singolo blocco resta possibile e vince, ma e'
                        // un'eccezione dichiarata, non piu' l'unico modo di decidere.
                        const livelloNum = parseInt((blockObj.livelloTitolo || 'H1').replace('H', ''), 10) || 1;
                        const ptTitolo = blockObj.fontSizePt
                            ? blockObj.fontSizePt + 'pt'
                            : `var(--tpl-h${Math.max(1, Math.min(3, livelloNum))}, 16pt)`;
                        // data-titolo-indice: e' cosi' che l'indice riconosce un'intestazione nel
                        // documento finito. Il livello (H1/H2/H3) e' la gerarchia; senza questo
                        // marcatore un titolo sarebbe indistinguibile da un testo in grassetto.
                        const livelloIndice = (blockObj.livelloTitolo || 'H1').replace('H', '');
                        return `<div class="tpl-block-richtext" data-titolo-indice="${livelloIndice}" style="font-size:${ptTitolo}; font-weight:var(--tpl-peso-titoli, 700); line-height:1.3; color:#0f172a; font-family:var(--tpl-font, Arial, sans-serif);">${blockObj.richHtml}</div>`;
                    }
                    case 'testo': {
                        if (!blockObj || !blockObj.richHtml) return '';
                        // font-weight:400 esplicito (richiesto esplicitamente: "font stranissimo e
                        // bold" su questo blocco) — prima non c'era nessun font-weight qui, quindi se
                        // il testo digitato nell'editor conteneva del grassetto "appiccicato"
                        // accidentalmente (bug noto di execCommand('bold') su contenteditable: può
                        // restare "acceso" e marcare in grassetto tutto ciò che si scrive dopo, anche
                        // senza selezione attiva) il blocco erediva quel peso senza alcun freno. Ora il
                        // testo normale è sempre e comunque regolare — un <b>/<strong> inserito DAVVERO
                        // di proposito nell'editor resta comunque in grassetto (bolder rispetto a 400
                        // regolare), solo il "tutto in grassetto per sbaglio" non può più capitare.
                        // Dimensione in punti scelta direttamente (vedi 'titolo' qui sopra per la
                        // spiegazione completa): niente più --tpl-font-scale qui.
                        // Corpo, interlinea e allineamento vengono dallo stile del documento.
                        // L'interlinea NON passa piu' da --tpl-riga-scale: era la maniglia
                        // dell'altezza a moltiplicarla, ed e' il motivo per cui trascinandola il
                        // testo "si schiacciava riga su riga". L'altezza di un testo e' un
                        // risultato (corpo x interlinea x righe), non un dato da imporre.
                        const ptTesto = blockObj.fontSizePt ? blockObj.fontSizePt + 'pt' : 'var(--tpl-corpo-pt, 11pt)';
                        // I titoli scritti QUI DENTRO diventano voci dell'indice: e' la
                        // marcatura che prima stava sul contenitore del blocco 'titolo'.
                        return `<div class="tpl-block-richtext" style="font-size:${ptTesto}; font-weight:400; line-height:var(--tpl-interlinea, 1.5); text-align:var(--tpl-allineamento, justify); color:#0f172a; font-family:var(--tpl-font, Arial, sans-serif);">${marcaTitoliPerIndice(risolviTagInStampa(blockObj.richHtml, ctx, blockObj), (typeof templateEditorState !== 'undefined' && templateEditorState.stileTesto) || (ctx && ctx.stileTesto))}</div>`;
                    }
                    // Riga sottile a tutta larghezza (la "compattezza" generica del blocco, già
                    // disponibile per qualunque tipo, permette comunque di restringerla se serve).
                    // Spazio vuoto ad altezza regolabile (vedi apriMenuBloccoEditor, controllo
                    // dedicato "Altezza spazio" per questo tipo).
                    case 'divisore': {
                        const b = blockObj || {};
                        const h = Math.max(0.5, Math.min(120, b.spacerHeightMm || 10));
                        const linea = LINEE_DIVISORE.indexOf(b.divisoreLinea) > 0 ? b.divisoreLinea : 'nessuna';
                        const elastico = !!b.divisoreElastico;
                        const stile = STILI_LINEA_DIVISORE[b.divisoreStile] || 'solid';
                        // Una linea "doppia" sotto i 3px non si vede: il browser non ha pixel
                        // abbastanza per disegnare due tratti e uno spazio, e restituisce una
                        // linea sola — cioè lo stile scelto verrebbe ignorato in silenzio.
                        const spGrezzo = Math.max(0.5, Math.min(6, parseFloat(b.divisoreSpessore) || 1));
                        const sp = stile === 'double' ? Math.max(3, spGrezzo) : spGrezzo;
                        const col = (TINTE_DIVISORE[b.divisoreTinta] || TINTE_DIVISORE.grigio).colore;
                        const lung = Math.max(10, Math.min(100, parseFloat(b.divisoreLunghezza) || 100));
                        /* LO SPAZIATORE ELASTICO. height:100% dentro una colonna flessibile
                         * significa «prenditi quello che avanza»: il foglio è una colonna flex
                         * (vedi .dpsh-sheet-inner e il canvas dell'editor) e la riga che contiene
                         * questo marcatore è l'unica autorizzata a crescere. Il min-height resta
                         * l'altezza scritta a mano, così se sulla pagina non avanza niente il
                         * divisore vale comunque quello che dice di valere invece di sparire. */
                        const boxStyle = elastico
                            ? `height:100%; min-height:${h}mm;`
                            : `height:${h}mm;`;
                        const dentro = linea === 'orizzontale'
                            ? `<div style="width:${lung}%; border-top:${sp}px ${stile} ${col};"></div>`
                            : linea === 'verticale'
                                ? `<div style="height:${lung}%; min-height:2mm; border-left:${sp}px ${stile} ${col};"></div>`
                                : '';
                        return `<div${elastico ? ' data-divisore-elastico="1"' : ''} data-divisore-linea="${linea}" style="${boxStyle} display:flex; align-items:center; justify-content:center; box-sizing:border-box;">${dentro}</div>`;
                    }
                    default: return '';
                }
            }

            /** Intestazione/piè di pagina di una pagina-template: se caricata, un'immagine di
             * intestazione (letterhead), ed eventuale testo libero nel piè di pagina.
             * NUMERAZIONE PAGINE RIMOSSA DEL TUTTO (richiesto esplicitamente, in modo definitivo, dopo
             * due tentativi falliti: prima una stima calcolata prima di costruire l'HTML — "50 pagine
             * stimate contro 127 reali", "Pagina 1 di 5 ripartiva da 1" — poi un ricalcolo a fine
             * stampa via data-tpl-page-number-slot — risultato comunque sbagliato, "35 mostrate contro
             * 56 vere", perché un blocco flowable che sfora la sua pagina logica trabocca su una
             * pagina fisica successiva tramite l'impaginazione nativa del browser, che non lascia
             * nessun marcatore su cui contare). In questa architettura (contenuto che può eccedere una
             * singola pagina logica ed essere rifluito dal motore di stampa nativo) non esiste un modo
             * affidabile di sapere in anticipo — né a posteriori senza rifare tutto il layout in JS —
             * quante pagine fisiche occuperà davvero un documento lungo: si è scelto di non mostrare
             * più nessun numero piuttosto che continuare a mostrarne uno sbagliato. pageIndex/
             * totalPages/placeholderNumerazione restano parametri della funzione (e dei suoi
             * chiamanti) solo per non dover toccare tutte le firme a cascata: non producono più
             * nessun testo, sono vestigiali. */
            // L'INTESTAZIONE STA NEL MARGINE SUPERIORE, COME IN WORD. Prima era il primo pezzo del
            // contenuto: rubava spazio alle tabelle senza che l'impaginazione lo sapesse, e il fondo
            // del foglio le tagliava. Ora vive nella fascia sopra il contenuto (il margine superiore):
            // se ci sta, il contenuto ha tutto il suo spazio; se le si è data un'altezza (maniglia,
            // header.heightMm) più grande del margine, la fascia si allarga e il contenuto parte più
            // in basso — e l'impaginazione lo sa (margineConIntestazione), quindi niente tagli.
            // Una sola regola per export, miniature, editor e controlli di impaginazione.
            const INTESTAZIONE_RESPIRO_MM = 5; // 3 mm sopra, 2 mm sotto l'intestazione

            /** I margini del foglio con la fascia dell'intestazione: sopra vale il più grande tra il
             * margine e l'altezza scelta per l'intestazione (più il respiro). */
            function margineConIntestazione(margins, header, headerEnabled) {
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                const hMm = headerEnabled && header && header.heightMm;
                if (hMm) mrg.top = Math.max(mrg.top, hMm + INTESTAZIONE_RESPIRO_MM);
                return mrg;
            }

            /** L'intestazione disegnata nella fascia del margine superiore: un riquadro assoluto dentro
             * il foglio (che è position:relative), largo quanto il contenuto, alto quanto la fascia.
             * L'immagine si adatta dentro, il testo sotto. classeExtra/idExtra servono all'editor. */
            function htmlIntestazioneNelMargine(header, margins, extra) {
                const hd = header || {};
                if (!hd.imageDataUrl && !hd.text && !(extra && extra.anche_vuota)) return '';
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                const fascia = hd.heightMm ? hd.heightMm + INTESTAZIONE_RESPIRO_MM : Math.max(mrg.top, INTESTAZIONE_RESPIRO_MM + 2);
                return `<div data-blocco="intestazione"${extra && extra.id ? ` id="${extra.id}"` : ''}${extra && extra.classe ? ` class="${extra.classe}"` : ''} style="position:absolute; top:0; left:${mrg.left}mm; right:${mrg.right}mm; height:${fascia}mm; box-sizing:border-box; padding:3mm 0 2mm; display:flex; flex-direction:column; justify-content:center; align-items:center; overflow:hidden;">
                        ${hd.imageDataUrl ? `<img src="${hd.imageDataUrl}" style="max-width:100%; min-height:0; flex:0 1 auto; max-height:100%; object-fit:contain; display:block;"/>` : ''}
                        ${hd.text ? `<div style="font-size:10px; color:#334155; text-align:center; margin-top:2px; flex-shrink:0; line-height:1.2;">${hd.text}</div>` : ''}
                    </div>`;
            }

            function buildPaginaHeaderFooterHtml(pageDef, pageIndex, totalPages, innerHtml, placeholderNumerazione, headerEnabled, footerEnabled) {
                const hd = pageDef.header || {};
                const ft = pageDef.footer || {};
                // Altezza libera dell'intestazione (hd.heightMm, regolabile con la maniglia
                // nell'editor — vedi renderManigliePaginaEditor): stesso comportamento della
                // versione a video, per un PDF identico a quanto visto nell'editor.
                const hHMm = hd.heightMm;
                // Nessuna riga/bordo aggiunto qui (rimosso, richiesto esplicitamente: "SOLO ED
                // ESCLUSIVAMENTE quello che metto nel template, niente altro" — quel bordo sotto
                // l'intestazione non era una scelta del template, era una decorazione fissa mia,
                // sempre presente anche con un'intestazione vuota o senza immagine/testo, quindi un
                // "separatore" inventato che l'utente non aveva mai chiesto). Resta solo lo spazio
                // (margin-bottom) tra intestazione e contenuto, nessuna linea disegnata.
                // hd.enabled/ft.enabled non esistono più: mostra/nascondi è del TEMPLATE
                // (headerEnabled/footerEnabled, nuovi parametri — richiesto esplicitamente, "come
                // per il numero pagine, questi devono essere globali per tutte le pagine, altrimenti
                // mi continua a sminchiare tutto", stesso identico ragionamento di
                // templateEditorState.footerShowPageNumber). Il contenuto (immagine/testo) resta
                // per-pagina in hd/ft qui sopra.
                // L'intestazione non è più qui dentro: la mette nel margine superiore del foglio chi
                // costruisce il foglio (htmlIntestazioneNelMargine).
                void hd; void hHMm;
                const headerHtml = '';
                // position:absolute; bottom:0 (non più margin-top:auto dentro un flex a colonna)
                // inchioda il piè di pagina al fondo FISICO del foglio — richiesto esplicitamente
                // ("il numero delle pagine deve trovarsi sempre in fondo al foglio"). Bug segnalato
                // esplicitamente con la versione flex precedente: quando il contenuto reale di una
                // pagina era molto più corto di un intero foglio A4 (es. solo l'inquadramento
                // satellitare), Chrome a volte spezzava fisicamente lo spazio "vuoto" creato
                // dall'auto-margin flex su una pagina FISICA successiva, lasciando una pagina quasi
                // bianca con solo "Pagina X di Y" in cima — un limite noto della stampa Chrome con
                // flexbox+min-height in colonna (la spaziatura flessibile non è "pagination-aware").
                // position:absolute rimuove il piè di pagina dal flusso/dalla distribuzione flex, che
                // è esattamente il meccanismo che causava lo sdoppiamento: il contenitore pagina
                // (vedi buildPaginaRigheHtml) resta position:relative con lo stesso min-height di
                // sempre (il controllo di impaginazione — eseguiControlloImpaginazioneStampa — misura
                // ancora correttamente un eventuale sforamento) e riserva ora un padding-bottom fisso
                // dove SOLO il piè di pagina, fuori dal flusso normale, può disegnarsi senza che il
                // contenuto normale (header+righe) ci finisca sopra per errore.
                // Numerazione RIMOSSA DEL TUTTO (richiesto esplicitamente, in modo definitivo:
                // "Rimuovi ogni enumerazione" — il tentativo precedente di ricalcolarla a fine
                // stampa restava comunque sbagliato: un blocco flowable dentro un template
                // personalizzato che sfora la sua pagina logica trabocca sulla pagina fisica
                // successiva via impaginazione nativa del browser, che non lascia nessun marcatore
                // data-tpl-report-page su cui contare — 35 mostrate contro 56 vere). pageIndex/
                // totalPages/placeholderNumerazione restano parametri della funzione per non dover
                // toccare tutti i chiamanti, ma non producono più nessun testo: l'interruttore
                // "Numero di pagina" (templateEditorState.footerShowPageNumber, vale per l'intero
                // template) resta anch'esso ignorato qui, per lo stesso motivo — nessuna via, in
                // questa architettura, garantisce un conteggio sempre corretto quando il contenuto
                // può traboccare in stampa nativa. Riguarda solo l'anteprima interattiva
                // dell'editor (vedi renderTemplateEditorCanvas), mai l'export vero.
                // Stessa correzione del bordo header qui sopra: nessuna linea sopra il piè di
                // pagina, era una decorazione fissa mia non richiesta — solo lo spazio (padding-top)
                // per staccare il testo dal contenuto, nessun bordo disegnato.
                const footerHtml = footerEnabled ? `
                    <div data-blocco="pie" style="position:absolute; left:0; right:0; bottom:0; padding-top:6px; font-size:9px; color:#94a3b8; background:#fff;">
                        <span>${ft.text || ''}</span>
                    </div>
                ` : '';
                return `${headerHtml}${innerHtml}${footerHtml}`;
            }

            /** Renderizza una pagina di un template personalizzato: le RIGHE sono bande orizzontali
             * impilate in ordine (mai sovrapposte, "logica ordinata"), ogni riga contiene 1+ blocchi
             * affiancati che si dividono la larghezza secondo colSpan/cols ("magnetici": si scelgono
             * solo frazioni intere della riga, non posizioni libere a piacere). L'altezza di ogni
             * blocco è SEMPRE quella naturale del suo contenuto (mai forzata/tagliata): un dato
             * fondamentale, perché tabella e box dati hanno un'altezza che dipende dal numero di
             * intervalli/parametri e non può essere prevista a priori come per un'immagine. Una
             * prima versione usava una vera griglia CSS con altezza-riga fissa in mm: qualunque
             * contenuto più alto della cella assegnata veniva tagliato silenziosamente — bug
             * evitato qui a monte, non gestito a valle. */
            /** Contenuto (senza posizionamento) di UNA voce/colonna per la stampa: usato sia dalla
             * riga normale (flex, buildPaginaRigheHtml) sia da una voce dentro un gruppo rowSpan
             * (griglia CSS, buildGruppoRowSpanHtmlStampa) — unica fonte di verità per come appare il
             * contenuto interno di un blocco stampato, il posizionamento (flex vs grid-column/row) è
             * responsabilità di chi chiama. */
            function buildContenutoVoceStampa(entry, ctx, span, cols) {
                // Stessa distinzione dell'editor (vedi costruisciHtmlBloccoEditor): i blocchi "a
                // righe" non usano zoom in stampa, solo --tpl-riga-scale.
                const styleScala = (item) => {
                    const fontScale = item.fontScale || 1;
                    if (BLOCCHI_CON_FONT_REGOLABILE.has(item.type)) {
                        // stileGrigliaTabellaBlocco: la griglia scelta per questo blocco viaggia
                        // insieme alla scala, come variabile CSS ereditata dal contenuto — stessa
                        // identica tecnica, quindi editor e stampa non possono divergere.
                        return `--tpl-riga-scale:${item.rigaScale || 1}; --tpl-font-scale:${fontScale};${stileGrigliaTabellaBlocco(item)}`;
                    }
                    if (item.type === 'immagine-libera') {
                        // Le foto non usano più zoom (richiesto esplicitamente, "al massimo
                        // dovrei poter regolare l'altezza del riquadro"): l'altezza vera arriva
                        // già dentro buildBlockContentHtml (item.heightMm, via --tpl-photo-height-mm
                        // con fallback inline) — applicare comunque zoom qui sommerebbe anche un
                        // eventuale "scale" residuo di un template salvato PRIMA di questa modifica,
                        // mai più corretto ora che l'altezza è già quella giusta.
                        return '';
                    }
                    if (item.type === 'grafico-stratigrafia') {
                        // Il grafico si impagina da sé in unità fisiche: uno zoom sul contenitore
                        // rimetterebbe esattamente il riscalamento uniforme che è stato tolto, e
                        // --tpl-font-scale non lo legge più nessuno. Un template salvato PRIMA di
                        // questa modifica può avere ancora uno `scale` addosso: ignorarlo qui è ciò
                        // che gli impedisce di continuare a zoomare un disegno che ora ha una sua
                        // altezza vera.
                        return '';
                    }
                    return `zoom:${item.scale || 1}; --tpl-font-scale:${fontScale};`;
                };
                if (entry.stack && entry.stack.length > 0) {
                    const itemsHtml = entry.stack.map(item => {
                        const content = buildBlockContentHtml(item.type, ctx, item, { span, cols });
                        if (!content) return '';
                        // Il contenuto riempie sempre per intero il proprio blocco (richiesto
                        // esplicitamente, riorganizzazione posizionamento/ridimensionamento: niente
                        // più "compattezza" separata dalla larghezza) — l'allineamento è ora gestito
                        // a monte, sul blocco stesso (vedi styleDimensioneVoce), non più qui dentro.
                        return `<div data-blocco="${item.type}" style="page-break-inside: avoid; ${styleScala(item)}">${content}</div>`;
                    }).join('');
                    if (!itemsHtml) return '';
                    return { html: itemsHtml, isStack: true };
                }
                const content = buildBlockContentHtml(entry.type, ctx, entry, { span, cols });
                if (!content) return '';
                // data-blocco: il tipo del blocco viaggia nel documento stampato. Lo legge l'export
                // Word, che deve sapere cosa e' testo (diventa testo di Word) e cosa e' disegno.
                return { html: `<div data-blocco="${entry.type}" style="${styleScala(entry)}">${content}</div>`, isStack: false };
            }

            /** Equivalente in stampa/PDF di renderaGruppoRowSpanEditor: rende un gruppo di righe
             * consecutive (vedi calcolaGruppiRowSpanPagina) come un'unica griglia CSS, così un
             * blocco con rowSpan>1 copre visivamente più righe anche nel documento stampato/
             * esportato, con le altre colonne delle righe coinvolte che si dispongono intorno. */
            function buildGruppoRowSpanHtmlStampa(pageDef, gruppo, ctx, cols, margineRiga) {
                const righe = pageDef.rows.slice(gruppo.startIndex, gruppo.endIndex + 1);
                let inner = '';
                righe.forEach((row, r) => {
                    const gridRow = r + 1;
                    let colCursor = 1;
                    (row.blocks || []).forEach(entry => {
                        const span = spanVoceInGriglia(entry, cols);
                        if (entry.reserved) { colCursor += span; return; }
                        const rsMax = gruppo.endIndex - gruppo.startIndex - r + 1;
                        const rowSpanEff = Math.max(1, Math.min(rsMax, entry.rowSpan || 1));
                        const risultato = buildContenutoVoceStampa(entry, ctx, span, cols);
                        if (risultato) {
                            const margineAllineamento = entry.align === 'right' ? 'margin-left:auto;' : entry.align === 'center' ? 'margin-left:auto; margin-right:auto;' : '';
                            const gridStyle = `grid-column:${colCursor} / span ${span}; grid-row:${gridRow} / span ${rowSpanEff}; min-width:0; page-break-inside:avoid; ${margineAllineamento}`;
                            inner += risultato.isStack
                                ? `<div style="${gridStyle} display:flex; flex-direction:column; gap:10px;">${risultato.html}</div>`
                                : `<div style="${gridStyle}">${risultato.html}</div>`;
                        }
                        colCursor += span;
                    });
                });
                return `<div style="display:grid; grid-template-columns:repeat(${cols}, 1fr); grid-auto-rows:min-content; column-gap:10px; row-gap:12px; margin-bottom:${margineRiga != null ? margineRiga : '12px'};">${inner}</div>`;
            }

            /** Rende un SOTTOINSIEME qualunque di righe (non necessariamente pageDef.rows per
             * intero) con la stessa identica logica di sempre (gruppi rowSpan + righe flex normali)
             * — estratta da buildPaginaRigheHtml perché ora serve anche altrove: quando una pagina
             * del template ha un blocco flowable (tabella lunga) AFFIANCATO ad altri blocchi (es. un
             * titolo sopra la tabella, sulla stessa pagina — vedi più sotto in buildSurveyReportHtml)
             * bisogna renderizzare le righe "prima"/"dopo" il blocco flowable con lo stesso motore
             * delle righe normali, non reinventarlo. calcolaGruppiRowSpanPagina/
             * buildGruppoRowSpanHtmlStampa leggono solo `.rows`/`.cols` da un oggetto "pagina": un
             * oggetto fittizio con giusto quei due campi basta, senza bisogno di una vera pageDef. */
            function buildRigheSottoinsiemeHtml(righe, ctx, cols, margineRiga) {
                if (!righe || righe.length === 0) return '';
                const pageFittizia = { rows: righe, cols };
                const gruppiRighe = calcolaGruppiRowSpanPagina(pageFittizia);
                return gruppiRighe.map(seg => {
                    if (seg.tipo === 'gruppo') {
                        return buildGruppoRowSpanHtmlStampa(pageFittizia, seg, ctx, cols, margineRiga);
                    }
                    const row = righe[seg.rowIndex];
                    const blocksHtml = (row.blocks || []).map(entry => {
                        const span = spanVoceInGriglia(entry, cols);
                        const risultato = buildContenutoVoceStampa(entry, ctx, span, cols);
                        if (!risultato) return '';
                        return risultato.isStack
                            ? `<div style="${styleDimensioneVoce(entry, span, cols)} min-width:0; display:flex; flex-direction:column; gap:10px;">${risultato.html}</div>`
                            : `<div style="${styleDimensioneVoce(entry, span, cols)} min-width:0; page-break-inside: avoid;">${risultato.html}</div>`;
                    }).join('');
                    if (!blocksHtml) return '';
                    return `<div style="display:flex; gap:10px; align-items:flex-start; margin-bottom:${margineRiga};">${blocksHtml}</div>`;
                }).join('');
            }

            function buildPaginaRigheHtml(pageDef, ctx, pageIndex, totalPages, isLastOfDoc, margins, provaNr, placeholderNumerazione, headerEnabled, footerEnabled) {
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                const cols = pageDef.cols || 4;
                // Spaziatura verticale distribuita (vedi renderTemplateEditorCanvas per la stessa
                // tecnica lato editor, unica fonte di verità condivisa concettualmente): quando
                // pageDef.distribuisciSpazioVerticale è attivo, le righe vengono avvolte in un
                // contenitore flex:1 con justify-content:space-between che apre gap uguali tra loro
                // consumando lo spazio residuo della pagina, invece di lasciarlo tutto ammassato
                // sopra al piè di pagina (margin-top:auto in buildPaginaHeaderFooterHtml). Stessa
                // condizione applicata anche qui al PDF/stampa: nessuna delle due modalità deve
                // divergere da quella vista nell'editor.
                const distribuisciSpazio = !!pageDef.distribuisciSpazioVerticale;
                const margineRiga = distribuisciSpazio ? '0' : '12px';
                const righeHtml = buildRigheSottoinsiemeHtml(pageDef.rows, ctx, cols, margineRiga);
                // height:100% invece di "flex:1 1 auto" — stessa correzione e stesso motivo spiegati
                // in costruisciPagineTemplateUnificato: le due funzioni devono produrre geometrie
                // identiche, altrimenti la miniatura nell'editor torna a non corrispondere al PDF.
                const righeHtmlAvvolto = `<div style="${distribuisciSpazio ? 'height:100%; display:flex; flex-direction:column; justify-content:space-between;' : ''}">${righeHtml}</div>`;
                const corpo = buildPaginaHeaderFooterHtml(pageDef, pageIndex, totalPages, righeHtmlAvvolto, placeholderNumerazione, headerEnabled, footerEnabled);
                // position:relative + min-height pari all'area stampabile reale (297mm meno i
                // margini sopra/sotto del template, gli stessi di @page e del riquadro dell'editor).
                // NON più display:flex/flex-direction:column (bug segnalato esplicitamente: con una
                // pagina il cui contenuto reale era molto più corto di un intero foglio — es. solo
                // l'inquadramento satellitare — l'auto-margin del piè di pagina dentro quel flex a
                // colonna poteva far "sdoppiare" fisicamente lo spazio vuoto su una pagina FISICA
                // successiva quasi bianca con solo "Pagina X di Y" in cima, un limite noto della
                // stampa Chrome con flexbox in colonna dentro page-break-after — vedi
                // buildPaginaHeaderFooterHtml, il piè di pagina è ora position:absolute e non dipende
                // più da questa distribuzione). padding-bottom riserva lo spazio dove SOLO il piè di
                // pagina (fuori dal flusso) può disegnarsi, così il contenuto normale non ci finisce
                // sopra.
                // data-tpl-report-page/-max-height-mm/-page-label: marcatori letti dal controllo di
                // impaginazione iniettato in generatePrintableReport/exportProjectPDF (vedi
                // eseguiControlloImpaginazioneStampa) — servono a misurare, con le REALI dimensioni
                // renderizzate nella finestra di stampa, se il contenuto di questa pagina supera
                // fisicamente l'altezza A4 disponibile e avvisare l'utente PRIMA che scopra la
                // sorpresa contando le pagine del PDF (bug segnalato: due blocchi sulla stessa
                // pagina nell'editor, finiti su due pagine diverse in stampa) — il passaggio a
                // position:relative/min-height (invece di flex) non cambia questa misura: offsetHeight
                // continua a crescere oltre min-height quando il contenuto normale eccede la pagina.
                // Fase A del piano di unificazione: stessa fonte unica di
                // costruisciPagineTemplateUnificato qui sopra, invece di ricalcolare a mano —
                // coerenza garantita tra miniatura editor ed export vero.
                const mrgFoglio = margineConIntestazione(mrg, pageDef.header, headerEnabled);
                const intestazione = headerEnabled ? htmlIntestazioneNelMargine(pageDef.header, mrg) : '';
                const stileSopra = mrgFoglio.top !== mrg.top ? ` padding-top:${mrgFoglio.top}mm;` : '';
                const { riservaFooterMm: paddingBottomMm, areaStampabileMm } = calcolaBudgetPaginaMm(mrgFoglio, footerEnabled);
                const maxHeightMm = areaStampabileMm.toFixed(2);
                const pageLabel = `Prova ${provaNr || '?'} — pagina ${pageIndex}/${totalPages}`;
                // FOGLIO RIGIDO: stessa identica struttura di costruisciPagineTemplateUnificato
                // (vedi il commento esteso lì e in getReportPrintStyleBlock) — questa funzione
                // costruisce le MINIATURE della striscia pagine nell'editor, quindi deve produrre
                // esattamente la stessa geometria dell'export, altrimenti la miniatura tornerebbe a
                // mentire su come verrà stampata la pagina. Il salto pagina non è più deciso qui:
                // lo impone la regola CSS .dpsh-sheet:last-child sull'ultimo foglio reale.
                return `<div class="dpsh-sheet" data-tpl-report-page="1" data-tpl-max-height-mm="${maxHeightMm}" data-tpl-page-label="${escapeHtmlDidascalia(pageLabel)}" style="font-family: var(--tpl-font, Arial, sans-serif);${stileSopra}">${intestazione}<div class="dpsh-sheet-inner" style="padding-bottom:${paddingBottomMm}mm;">${corpo}</div></div>`;
            }

            /** Il template assegnato a una prova: quello scelto esplicitamente sulla prova, altrimenti
             * "classico". Nessuna eredità dal progetto per ora — ogni prova sceglie il proprio, come
             * richiesto ("ognuno dev'essere applicabile alla singola prova"). */
            function getReportTemplateIdPerProva(survData) {
                const tid = survData && survData.reportTemplateId;
                return (tid && state.reportTemplates[tid]) ? tid : 'classico';
            }

            // surveyTemplateHaBloccoParametriAvanzati RIMOSSA (Fase 3 della riscrittura): serviva
            // solo a buildCompleteReportHtml per decidere se saltare la sezione automatica
            // Riepilogo/Dettagliata/Allegato — quella sezione automatica è già stata tolta
            // interamente dall'export (richiesto esplicitamente), quindi anche questa funzione non
            // aveva più nessun chiamante.

