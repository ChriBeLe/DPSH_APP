            // =========================================================================
            // WIZARD — navigazione "sempre visibile": a differenza di categorieApplicabili/
            // candidatiCompatibili qui sopra (che restano un filtro DURO, usato invariato da
            // auto-fill, dall'editor "Elaborazione Dati Speciali" e dalle tabelle di
            // export/Allegato — non li tocchiamo), nel wizard guidato NESSUNA delle 8
            // macro-categorie sparisce mai: quelle non tipiche per la natura dello strato
            // restano semplicemente spente (pallino grigio) ma restano scegliibili, con un
            // avviso che spiega perché non sono la scelta normale. La decisione finale resta
            // sempre dell'utente.
            // =========================================================================

            /** Segnale puramente informativo (mai un blocco) per il wizard: è la categoria
             * "tipica" per la natura di questo strato? Riusa lo stesso identico criterio del
             * filtro duro, solo con un nome che ne chiarisce l'uso qui. */
            function categoriaTipicaPerStrato(categoria, strato){
                return candidatiCompatibili(categoria, strato).length > 0;
            }

            /** Motivazioni scientifiche (oneste, sintetiche) del perché una categoria non è
             * tipica per una certa natura del terreno — mostrate come avviso collassabile nel
             * wizard quando l'utente naviga volutamente su una di queste. */
            const MOTIVO_NON_TIPICO = {
                angoloAttrito: { coesivo: "L'angolo di attrito (φ) descrive la resistenza per attrito tra i grani, tipica di sabbie e ghiaie. Nei terreni a grana fine saturi, sotto carico rapido, la resistenza al taglio è governata dalla coesione non drenata (cu): la componente d'attrito non è significativa nel breve termine. Le correlazioni Nspt→φ qui proposte sono tarate su depositi sabbiosi e, applicate a un'argilla o un limo argilloso, non hanno in genere un significato fisico diretto." },
                coesioneNonDrenata: { granulare: "La coesione non drenata (cu) misura la resistenza a taglio di un'argilla satura soggetta a carico rapido, senza dissipazione delle pressioni interstiziali. Nei terreni granulari (sabbie, ghiaie) l'acqua drena rapidamente durante il carico e non si sviluppa una vera resistenza \"non drenata\": in questo caso il parametro cu non descrive un meccanismo di rottura realistico." },
                densitaRelativa: { coesivo: "La densità relativa (Dr) si definisce a partire dagli indici dei vuoti massimo e minimo (emax, emin): una proprietà indice tipica dei terreni granulari privi di coesione. Nei terreni coesivi il comportamento è governato dallo stato di consistenza, non dall'addensamento relativo — il valore percentuale qui calcolato non ha un riscontro fisico diretto per un'argilla o un limo plastico." },
            };

            /** Come i candidati calcolati da elaboraStratiProva ma SENZA il filtro duro: usata
             * solo dal wizard quando la categoria corrente non è tipica per lo strato, per poter
             * comunque mostrare un valore per ogni variante (stesso ctx già calcolato in
             * preElaborazione — nessuna doppia formula, solo riuso). */
            function candidatiWizardIgnorandoTipicita(categoria, trovato){
                const pre = trovato.ris.preElaborazione;
                const ctx = {
                    nsptFalda: trovato.agg.nsptFalda, nsptGrezzo: trovato.agg.nsptGrezzo,
                    sigmaV0: pre.sigmaV0, n160: pre.n160, profonditaMedia: pre.profonditaMedia,
                    inFalda: pre.inFalda, isCoesivo: trovato.agg.isCoesivo, pesoSaturoSelezionato: pre.pesoSaturo,
                };
                return categoria.candidati.map((c,index)=>({index, autore:c.autore, terreno:c.terreno, natura:c.natura??null, valore:c.calcola(ctx)}));
            }

            /** Il wizard consiglia (badge "Consigliato" pieno, non il fallback "più vicino
             * disponibile") almeno una variante per questa categoria, in base al nome dello
             * strato? Serve per far vedere anche sui pallini di navigazione — non solo dentro
             * lo step aperto — quali categorie hanno già un suggerimento pronto, comprese
             * quelle "non tipiche" che altrimenti restano tutte indistintamente grigie. */
            function categoriaHaConsigliato(cat, strato, trovato, riconosciute){
                if (!riconosciute || riconosciute.length === 0) return false;
                const tipica = categoriaTipicaPerStrato(cat, strato);
                const candidatiBase = tipica ? (trovato.ris.categorie[cat.id]?.candidati || []) : candidatiWizardIgnorandoTipicita(cat, trovato);
                if (candidatiBase.length === 0) return false;
                const valutati = candidatiBase.map(c => ({...c, ...valutaSuggerimento(c, riconosciute, strato.name)}));
                return valutati.some(c => c.suggerito);
            }

            function seleziona(strato, categoriaId, autoreIndex){
                if(!strato.parametriAvanzati) strato.parametriAvanzati = {};
                strato.parametriAvanzati[categoriaId] = {autoreIndex};
            }
            function ensureParametriAvanzati(strato){
                if(!strato.parametriAvanzati) strato.parametriAvanzati = {};
                return strato.parametriAvanzati;
            }

            function fmtIT(n, dec=2){
                if(n===null||n===undefined||Number.isNaN(n)) return 'N/D';
                return n.toLocaleString('it-IT', {minimumFractionDigits:dec, maximumFractionDigits:dec});
            }

            /** Converte una data ISO ("AAAA-MM-GG", il formato nativo di <input type="date">) nel
             * formato italiano "GG/MM/AAAA" — bug segnalato esplicitamente: nel report esportato la
             * data della prova compariva ancora in ISO/inglese invece che italiano. Qualunque altra
             * stringa non riconosciuta (già formattata, vuota, ecc.) passa invariata. */
            function formattaDataIT(iso) {
                if (!iso) return '';
                const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso));
                if (!m) return iso;
                return `${m[3]}/${m[2]}/${m[1]}`;
            }

            const ETICHETTE_PARAMETRO = {
                pesoDiVolume: {compatta:'Peso di volume [t/m³]', estesa:'Peso di volume (secco/saturo) [t/m³]'},
                angoloAttrito: {compatta:'Angolo di attrito [°]', estesa:'Angolo di attrito [°]'},
                coesioneNonDrenata: {compatta:'Coesione Cu [kg/cm²]', estesa:'Coesione non drenata [kg/cm²]'},
                moduloElastico: {compatta:'Mod. Elastico [kg/cm²]', estesa:'Modulo Elastico (Young) [kg/cm²]'},
                moduloEdometrico: {compatta:'Mod. Edometrico [kg/cm²]', estesa:'Modulo Edometrico [kg/cm²]'},
                densitaRelativa: {compatta:'Densità relativa [%]', estesa:'Densità relativa [%]'},
                moduloTaglio: {compatta:'Mod. di taglio [kg/cm²]', estesa:'Modulo di taglio [kg/cm²]'},
                resistenzaCPT: {compatta:'Res. punta CPT [kg/cm²]', estesa:'Resistenza punta CPT [kg/cm²]'},
            };
            const ORDINE_PARAMETRI = ['angoloAttrito','coesioneNonDrenata','moduloElastico','moduloEdometrico','densitaRelativa','moduloTaglio','resistenzaCPT'];

            /**
             * Colori di sfondo ESATTI, estratti dagli stili delle celle del file
             * Nardò_DPSH1.ods originale (fogli RIEPILOGO e TABELLE) — uno per categoria
             * di parametro, riproposti identici in tutti i formati di export.
             */
            const COLORI_EXPORT = {
                intestazione: '90CAF9', preElaborazione: 'D9F0FF', condizioni: 'AFD095',
                pesoDiVolume: 'DEB887', angoloAttrito: 'FFA6A6', coesioneNonDrenata: 'E1BEE7',
                moduloElastico: 'FFFF6D', moduloEdometrico: 'D4EA6B', densitaRelativa: 'FFB66C',
                moduloTaglio: 'BF819E', resistenzaCPT: 'B7B3CA', resistenzaCompressione: 'FFE994',
            };
            // Questi sfondi sono chiari per progettazione (pensati per un documento stampato con
            // testo nero): un testo scuro fisso resta leggibile sopra, indipendentemente dal tema
            // chiaro/scuro scelto nell'app — sono colori di riferimento fissi, non colori del tema.
            const WIZ_TESTO_SU_COLORE = '#1e293b';

