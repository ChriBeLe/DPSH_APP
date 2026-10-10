            // ===================== COMPRESSIONE FOTO PER L'EXPORT PDF =====================
            // Richiesto esplicitamente: "Devo poter salvare il pdf cambiando la qualità delle jpeg
            // per diminuire il peso effettivo dei pdf... alcuni pesavano 300Mb". Le foto sono
            // salvate SEMPRE alla risoluzione originale, senza compressione (richiesto altrove,
            // "per fedeltà del rilievo" — vedi handlePhotoFileSelected): quella scelta resta intatta,
            // qui si ricomprime SOLO la copia temporanea usata per QUESTO export, mai l'originale
            // salvato. impostazioniEsportazionePdf è lo stato "di sessione" scelto nella nuova
            // schermata di esportazione (vedi apriEsportazionePdfModal) e letto da
            // risolviEComprimiFotoUrl, usato da buildSurveyReportHtml/buildFotoPaginaHtml — un solo
            // punto di verità invece di passare un parametro qualità attraverso ogni funzione.
            let impostazioniEsportazionePdf = { qualitaJpeg: 0.8, includiIndice: true, numeraPagine: false, maxDimPx: 1600 };

            /** Ricomprime un singolo dataURL immagine in JPEG alla qualità/dimensione massima
             * indicate — usa un <canvas> offscreen, Promise-based (richiede caricare l'immagine).
             * qualita 1 o dataUrl mancante/non un'immagine raster: ritorna il dataUrl originale
             * invariato (niente lavoro inutile, e le mappe/SVG non vanno comunque ricompresse). */
            function comprimiImmagineDataUrl(dataUrl, qualita, maxDimPx) {
                return new Promise((resolve) => {
                    if (!dataUrl || typeof dataUrl !== 'string' || !dataUrl.startsWith('data:image')) { resolve(dataUrl); return; }
                    if (qualita >= 0.98) { resolve(dataUrl); return; } // "Massima" = originale intatto
                    const img = new Image();
                    img.onload = () => {
                        try {
                            let w = img.naturalWidth, h = img.naturalHeight;
                            const limite = maxDimPx || 1600;
                            if (w > limite || h > limite) {
                                const scala = limite / Math.max(w, h);
                                w = Math.round(w * scala);
                                h = Math.round(h * scala);
                            }
                            const canvas = document.createElement('canvas');
                            canvas.width = w; canvas.height = h;
                            const cctx = canvas.getContext('2d');
                            cctx.drawImage(img, 0, 0, w, h);
                            const ricompresso = canvas.toDataURL('image/jpeg', qualita);
                            // Se per qualche motivo la ricompressione risulta PIÙ pesante
                            // dell'originale (immagine già molto compressa/piccola), meglio tenere
                            // l'originale — mai peggiorare il file.
                            resolve(ricompresso.length < dataUrl.length ? ricompresso : dataUrl);
                        } catch (e) { resolve(dataUrl); }
                    };
                    img.onerror = () => resolve(dataUrl);
                    img.src = dataUrl;
                });
            }

            /** Risolve l'URL di una foto (originale/cache RAM/IndexedDB, stessa catena già usata in
             * giro per l'app) e la ricomprime secondo impostazioniEsportazionePdf — punto unico
             * richiamato da tutti i posti che incorporano foto nell'export PDF. */
            async function risolviEComprimiFotoUrl(photo) {
                const url = photo.dataUrl || photoMemoryCache[photo.id] || (typeof getPhotoFromIDB === 'function' ? await getPhotoFromIDB(photo.id) : '');
                if (!url) return '';
                return comprimiImmagineDataUrl(url, impostazioniEsportazionePdf.qualitaJpeg, impostazioniEsportazionePdf.maxDimPx);
            }

            // FOGLIO DI STILE CONDIVISO PER I REPORT STAMPABILI (A4 VERTICALE)
            // Applicato sia al report di singola prova sia a quello multi-pagina di progetto,
            // così le tabelle sono sempre dimensionate e leggibili sul formato A4 ritratto.
            /** Il CSS dei caratteri incorporati, letto dal tag <style> che sta gia' nella
             * pagina. Serve anche al documento di stampa — anzi soprattutto a quello, perche'
             * e' li' che il font sbagliato diventa un PDF sbagliato. Si legge invece di
             * ripeterlo: 740 KB di base64 scritti due volte nello stesso file sarebbero 740 KB
             * buttati, e due copie che possono divergere. */
            function cssFontIncorporati() {
                const tag = document.getElementById('fontIncorporati');
                return tag ? tag.textContent : '';
            }

            /** LE REGOLE DEL CONTENUTO DI UN BLOCCO DI TESTO.
             *
             * Scritte una volta e usate in due posti: il foglio di stampa e la tela dell'editor.
             * Erano solo nel primo, e l'editor si arrangiava con lo stile in linea del blocco —
             * per questo una tabella nel testo si vedeva nelle note, ma sul foglio compariva
             * senza bordi. Due copie divergono; una sola no. */
            /** LE REGOLE DEL CONTENUTO DEL FOGLIO (tabelle, celle, box dati, immagini), UNA SOLA
             * VOLTA: le usano il foglio di stampa (PDF e Word, ambito vuoto) e l'anteprima
             * dell'editor (ambito: la tela). Prima stavano solo nel foglio di stampa, e l'anteprima
             * disegnava gli stessi blocchi col carattere, il corpo e l'interlinea dell'app: un'altra
             * pagina, che poi nel PDF non tornava. Con «A» vuoto i selettori sono quelli di sempre. */
            function cssRegoleFoglio(ambito) {
                const A = ambito ? ambito + ' ' : '';
                return `
                    ${A}table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 6px;
                        font-size: 10px;
                        table-layout: fixed;
                    }
                    ${A}th, ${A}td {
                        /* Quattro lati separati e pilotati da variabili (vedi bordoExp e
                           stileGrigliaTabellaBlocco): permette di spegnere le linee verticali,
                           tutte, o nessuna, per singolo blocco. I fallback sono il bordo storico,
                           quindi senza scelte esplicite nulla cambia. */
                        border-top: var(--tpl-bordo-h, 1px solid #cbd5e1);
                        border-bottom: var(--tpl-bordo-h, 1px solid #cbd5e1);
                        border-left: var(--tpl-bordo-v, 1px solid #cbd5e1);
                        border-right: var(--tpl-bordo-v, 1px solid #cbd5e1);
                        padding: 4px 5px;
                        text-align: center;
                        word-wrap: break-word;
                        overflow-wrap: break-word;
                        vertical-align: middle;
                    }
                    /* Sfondo/testo di RISERVA per un <th> che non porta un proprio background
                       colorato in linea (bug segnalato esplicitamente: prima qui era
                       "background:#0f172a; color:#fff" — dark navy con testo bianco — che
                       VINCEVA su qualunque <th> senza un colore in linea proprio (es. le
                       intestazioni Aste/Metri/COLPI/Nspt di buildColpiNsptTableHtml, che hanno il
                       colore sul <tr> genitore, non sul <th>), rendendo il testo bianco invisibile
                       sopra badge/celle pensate per restare chiare con testo scuro. I <th> che HANNO
                       un colore proprio (vedi thExp/cellStyle) impostano ORA anche color:#1e293b in
                       linea, quindi non dipendono più da questa regola generica — resta solo un
                       fallback neutro coerente con lo schema pastello dell'app. */
                    ${A}th { background: #e2e8f0; color: #1e293b; font-weight: 700; font-size: 9.5px; }
                    ${A}tr:nth-child(even) { background: #f8fafc; }
                    ${A}img { max-width: 100%; }

                    /* Annulla le regole generiche sopra (bordo su ogni cella, testo centrato, righe
                       pari grigie) SOLO per i box "PROVA N/DATI INDAGINE/STRUMENTO/STRATIGRAFICI"
                       (vedi buildDatiBoxHtml/.databox-tabella): quelle regole sono pensate per le
                       tabelle dati "normali" (Aste/Metri/Colpi, Riepilogo parametri...), ma qui
                       vincevano visivamente sopra lo sfondo azzurro pieno e l'allineamento a
                       sinistra propri del box, che nell'editor (canvas senza questo foglio di
                       stile di stampa) restano invece intatti — causa esatta del bug segnalato con
                       screenshot a confronto ("guarda come sono diversi gli export dal template"). */
                    ${A}.databox-tabella th, ${A}.databox-tabella td { border: none; text-align: left; }
                    ${A}.databox-tabella tr:nth-child(even) { background: transparent; }
                `;
            }
            /** L'anteprima dell'editor con le regole del foglio di stampa: lo stesso carattere (quello
             * del documento), la stessa interlinea e lo stesso colore del testo, e le stesse regole
             * di tabelle e celle (cssRegoleFoglio). Dentro i blocchi, non sui comandi dell'editor. */
            function cssAnteprimaComeStampa() {
                const tela = ':where(#templateEditorCanvas)'; // :where non aggiunge peso: vincono le stesse regole che vincono in stampa
                return `${tela} :is(.tpl-editor-block-inner, .tpl-editor-stack-item) { font-family: var(--tpl-font, Arial, sans-serif); color: #1e293b; line-height: 1.35; }
                    ${cssRegoleFoglio(tela)}`;
            }

            function cssContenutoTesto() {
                return `
                    /* I TITOLI DENTRO IL BLOCCO DI TESTO. Prendono le misure dallo stile del
                       documento, come faceva il vecchio blocco 'titolo': quello che cambia e'
                       dove sta scritto che quella riga e' un titolo — nel contenuto, non nel
                       tipo di blocco. Sono giustificati mai: un titolo giustificato apre buchi
                       fra le parole, e non e' un difetto che si nota subito ma si vede. */
                    .tpl-block-richtext h1, .tpl-block-richtext h2, .tpl-block-richtext h3 {
                        font-weight: var(--tpl-peso-titoli, 700); color: #0f172a; line-height: 1.3;
                        text-align: left; margin: 0 0 0.35em;
                        /* Un titolo non resta mai solo in fondo alla pagina, staccato dal suo
                           testo: e' la regola tipografica che toglie il grosso degli
                           aggiustamenti a mano. */
                        break-after: avoid-page; page-break-after: avoid;
                        break-inside: avoid-page; page-break-inside: avoid;
                    }
                    .tpl-block-richtext h1 { font-size: var(--tpl-h1, 16pt); }
                    .tpl-block-richtext h2 { font-size: var(--tpl-h2, 13pt); }
                    .tpl-block-richtext h3 { font-size: var(--tpl-h3, 11.5pt); }
                    .tpl-block-richtext p { margin: 0 0 var(--tpl-spazio-par, 6pt); text-indent: var(--tpl-rientro, 0); }
                    .tpl-block-richtext p:last-child { margin-bottom: 0; }
                    /* Nell'intestazione le righe stanno strette, come in quella di Word: niente spazio tra i
                       paragrafi e niente rientro, che sono del corpo del documento. */
                    .tpl-intestazione-testo p { margin: 0; text-indent: 0; }
                    /* Il piè di pagina formattato (htmlPiedeNelMargine): righe strette, e una tabella senza
                       bordi per i contatti su più colonne, come nella carta intestata di Word. */
                    .tpl-piede-testo p { margin: 0; text-indent: 0; }
                    /* Più specifiche delle regole delle tabelle del testo (bordi, a sinistra), che vengono dopo. */
                    .tpl-block-richtext.tpl-piede-testo table { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0; }
                    .tpl-block-richtext.tpl-piede-testo table td, .tpl-block-richtext.tpl-piede-testo table th { border: none; background: none; padding: 0 1.5mm; vertical-align: top; text-align: inherit; font-weight: inherit; }
                    /* Il capitolo Tavole (071r): due tavole per foglio, titolo e sottotitolo veri. */
                    .tavole-report-capitolo { font-size: 16pt; font-weight: 700; line-height: 1.2; margin: 0 0 4mm; color: #0f172a; }
                    .tavola-report { margin: 0 0 5mm; }
                    .tavola-report-titolo { font-size: 11pt; font-weight: 700; line-height: 1.3; color: #0f172a; }
                    .tavola-report-sotto { font-size: 8.5pt; line-height: 1.3; color: #475569; margin: 0.5mm 0 2mm; }
                    /* IL GRASSETTO, DICHIARATO. Il contenitore del blocco porta un
                       font-weight:400 scritto in linea (serve a impedire che un grassetto
                       rimasto acceso per sbaglio tinga tutto il blocco), e <strong> si affidava
                       alla regola di sistema "font-weight: bolder" — un valore RELATIVO, che
                       dipende da cosa ha ereditato e da quali tagli del carattere sono
                       davvero disponibili. Qui il peso e' un numero, e non dipende da niente. */
                    .tpl-block-richtext strong, .tpl-block-richtext b { font-weight: 700; }
                    .tpl-block-richtext em, .tpl-block-richtext i { font-style: italic; }
                    .tpl-block-richtext u { text-decoration: underline; }
                    .tpl-block-richtext s, .tpl-block-richtext del { text-decoration: line-through; }
                    .tpl-block-richtext table th { font-weight: 700; }
                    .tpl-block-richtext sup { font-size: 0.72em; vertical-align: super; line-height: 0; }
                    /* LE TABELLE DEL TESTO. Erano stilate SOLO per .note-editor-body, cioe'
                       dentro l'editor delle note: sul foglio — e nel PDF — la stessa tabella
                       usciva senza un bordo, quindi non sembrava affatto una tabella. E' la
                       stessa famiglia di sbaglio gia' vista due volte in questo file: una regola
                       scritta per il posto dove si e' sviluppata la cosa, e mai per il posto dove
                       la cosa finisce davvero. */
                    .tpl-block-richtext table { border-collapse: collapse; width: 100%; margin: 0.5em 0; table-layout: fixed; }
                    .tpl-block-richtext table th,
                    .tpl-block-richtext table td { border: 1px solid #94a3b8; padding: 4px 6px; text-align: left; vertical-align: top; }
                    .tpl-block-richtext table th { background: #e2e8f0; font-weight: 700; }
                    .tpl-block-richtext table p { margin: 0; text-indent: 0; }
                    /* GLI ELENCHI HANNO SEMPRE UN RIENTRO: e' il rientro a dire "questi vanno
                       insieme, e sono subordinati a cio' che precede". Un punto elenco allineato
                       al margine come il testo normale non si legge come un elenco. */
                    .tpl-block-richtext ul, .tpl-block-richtext ol { margin: 0 0 var(--tpl-spazio-par, 6pt) 6mm; padding-left: 5mm; }
                    .tpl-block-richtext li > p { margin: 0; text-indent: 0; text-align: left; }
                    .tpl-block-richtext li { margin: 0 0 0.15em; }
                    /* UNA FORMULA DA SOLA E' UN BLOCCO, non una riga di testo: centrata, senza
                       rientro e senza giustificazione — che su una riga corta aprirebbe voragini
                       fra i simboli. Dentro un capoverso resta testo, e cambia solo il carattere. */
                    .tpl-block-richtext p[data-formula-blocco] { text-align: center; text-indent: 0; margin: 0.6em 0; }
                    .tpl-block-richtext blockquote { margin: 0.5em 0; padding: 0.2em 0.8em; border-left: 2px solid #94a3b8; font-style: italic; }
                    .tpl-block-richtext hr { border: none; border-top: 1px solid #94a3b8; margin: 0.8em 0; }
                    .tpl-block-richtext img { max-width: 100%; height: auto; }
                `;
            }
            // Il tag di stile si riempie una volta sola, all'avvio: dopo, la tela dell'editor e
            // il foglio di stampa leggono le stesse identiche regole.
            {
                const tagStile = document.getElementById('stileContenutoTesto');
                if (tagStile) tagStile.textContent = cssContenutoTesto() + '\n' + cssAnteprimaComeStampa();
            }


            function getReportPrintStyleBlock(margins, stileTesto) {
                // Margini regolabili dall'editor del template (vedi renderManigliePaginaEditor):
                // @page è un'unica regola per TUTTO il documento di stampa, quindi non può variare
                // pagina per pagina — un limite del CSS di stampa, non dell'app — ma riflette
                // correttamente i margini del template usato (parametro opzionale, di default gli
                // stessi 14/12mm fissi di sempre per chi chiama questa funzione senza specificarli).
                const mrg = Object.assign(marginiPaginaDiDefault(), margins || {});
                return `
                    ${cssFontIncorporati()}
                    /* LO STILE DEL TESTO DEL DOCUMENTO, in variabili sul foglio.
                       E' l'unico punto che le scrive: i blocchi le leggono con var(), quindi
                       l'anteprima e la stampa non possono dire due numeri diversi — e' la stessa
                       riga di CSS che genera entrambe. Il valore di ripiego dentro var() serve
                       solo se un foglio viene costruito fuori da qui. */
                    .dpsh-sheet { ${cssVariabiliStileTesto(stileTesto)} }
                    ${cssContenutoTesto()}
                    /* IN STAMPA L'INTERRUZIONE NON SI VEDE: e' un salto, non un segno. La riga
                       tratteggiata serve a chi scrive, non a chi legge il PDF. */
                    .tpl-block-richtext [data-interruzione-pagina] {
                        border: none; height: 0; margin: 0;
                        break-before: page; page-break-before: always;
                    }
                    .tpl-block-richtext [data-interruzione-pagina]::after { content: none; }
                    /* LE REGOLE DEL PARAGRAFO, tradotte in CSS di stampa. */
                    .tpl-block-richtext [data-regola-pagina="non-spezzare"] { break-inside: avoid-page; page-break-inside: avoid; }
                    .tpl-block-richtext [data-regola-pagina="con-successivo"] { break-after: avoid-page; page-break-after: avoid; }
                    .tpl-block-richtext [data-regola-pagina="pagina-nuova"] { break-before: page; page-break-before: always; }
                    /* NIENTE RIGHE ORFANE O VEDOVE. E' la regola che, da sola, toglie la gran
                       parte degli aggiustamenti a mano: mai una riga sola staccata dal suo
                       paragrafo a cavallo di due pagine. */
                    .tpl-block-richtext p { orphans: 2; widows: 2; }
                    /* IN STAMPA LA PASTIGLIA SPARISCE: il colore serve a comporre, non a
                       leggere. Resta il testo, che a quel punto e' testo come tutto il resto. */
                    .tpl-block-richtext .dpsh-tag { background: none; color: inherit; box-shadow: none; padding: 0; font-style: normal; }
                    .tpl-block-richtext .dpsh-formula { font-family: var(--tpl-font-formule, 'Cambria Math', serif); }
                    .tpl-block-richtext sub { font-size: 0.72em; vertical-align: sub; line-height: 0; }

                    /* FOGLI RIGIDI — riscrittura definitiva dell'impaginazione di stampa.
                       PRIMA: @page aveva i margini del template e ogni pagina del report era un
                       blocco con "min-height" pari all'area stampabile. Quel min-height è la causa
                       UNICA e dimostrata di tutti i bug storici di questa famiglia (pagine bianche,
                       "tracciato rettangolare trasparente", piè di pagina comparso a metà di una
                       tabella lunga, "8 pagine nel template → 10 nel PDF"): "min" vuol dire che il
                       blocco PUÒ crescere, e appena cresce anche di una frazione di millimetro —
                       per uno scarto di rendering, o perché una tabella con page-break-inside:avoid
                       non entra nello spazio rimasto e viene spinta avanti in blocco — il motore di
                       stampa NATIVO del browser lo spezza da sé su un foglio fisico in più, che
                       resta quasi vuoto. Il piè di pagina (position:absolute; bottom:0) seguiva il
                       vero bordo inferiore del blocco cresciuto, quindi finiva su qualunque foglio
                       capitasse quel bordo: ecco la "riga a piè pagina messa lì senza logica".
                       ORA: @page non ha più margini (li porta il foglio stesso) e ogni pagina è un
                       .dpsh-sheet di dimensioni ESATTE e IMMUTABILI (210x297mm, height fissa, non
                       min-height, con overflow:hidden). Un .dpsh-sheet = un foglio fisico, sempre,
                       per pura geometria: il browser non ha più nessuna libertà di riflusso da
                       esercitare, quindi non può più inventare pagine né spostare niente. Il testo
                       resta HTML vero renderizzato dal browser, quindi vettoriale e selezionabile
                       nel PDF (nessuna rasterizzazione, requisito esplicito). */
                    @page { size: A4 portrait; margin: 0; }

                    /* Il foglio: dimensione fisica esatta, mai negoziabile. I margini del template
                       sono il PADDING di questo box (non più margini di @page), così restano
                       identici a quelli mostrati nell'editor e sono coerenti pagina per pagina. */
                    .dpsh-sheet {
                        position: relative;
                        box-sizing: border-box;
                        width: 210mm;
                        height: 297mm;
                        padding: ${mrg.top}mm ${mrg.right}mm ${mrg.bottom}mm ${mrg.left}mm;
                        --margine-sotto: ${mrg.bottom}mm; /* il piè di pagina col numero (numeraPagineDocumento) */
                        overflow: hidden;
                        background: #fff;
                        break-after: page;
                        page-break-after: always;
                        break-inside: avoid;
                        page-break-inside: avoid;
                    }
                    /* Area di contenuto = esattamente l'area stampabile (210-sx-dx per 297-sopra-sotto).
                       È il contenitore di riferimento del piè di pagina (position:absolute; bottom:0),
                       che così si appoggia sempre al bordo INTERNO del margine inferiore di QUESTO
                       foglio — mai più al bordo di un blocco cresciuto oltre la pagina. */
                    .dpsh-sheet-inner {
                        position: relative;
                        width: 100%;
                        height: 100%;
                        overflow: hidden;
                        /* COLONNA FLESSIBILE, per il divisore elastico. Da sola questa riga non
                           cambia niente di come si impagina: le righe restano una sotto l'altra
                           alla loro altezza naturale, perche' la regola qui sotto le inchioda a
                           flex:0 0 auto (senza, un foglio pieno le farebbe RESTRINGERE — il
                           comportamento di riserva del flex — e il contenuto si schiaccerebbe).
                           L'unica riga autorizzata a crescere e' quella che contiene un divisore
                           elastico. Stessa identica regola sulla tela dell'editor, che e' gia'
                           una colonna flex: e' quello che garantisce che l'anteprima e la stampa
                           spingano il blocco firma esattamente alla stessa quota. */
                        display: flex;
                        flex-direction: column;
                    }
                    .dpsh-sheet-inner > * { flex: 0 0 auto; }
                    .dpsh-sheet-inner > *:has([data-divisore-elastico]) { flex: 1 1 auto; min-height: 0; }
                    /* Ultimo foglio: mai un salto pagina dopo, altrimenti il PDF finisce con un
                       foglio bianco in più. Regola strutturale (CSS, sull'ultimo elemento reale)
                       invece che calcolata in JS: vale sempre, qualunque cosa abbia deciso il
                       codice che ha costruito le pagine. */
                    .dpsh-sheet:last-child {
                        break-after: auto !important;
                        page-break-after: auto !important;
                    }
                    /* Contenitore neutro della pila di fogli: nessun padding/larghezza propri, i
                       margini vivono ormai dentro ogni foglio (vedi .dpsh-sheet). */
                    .dpsh-sheet-stack { margin: 0; padding: 0; }

                    * {
                        box-sizing: border-box;
                        /* Indispensabile perché i colori di sfondo delle celle (identici a quelli
                           del foglio Nardò_DPSH1.ods) non vengano scartati dal browser in fase di
                           stampa/salvataggio PDF: senza questa regola Chrome/Edge/Firefox stampano
                           di default solo testo e bordi, ignorando ogni background-color. */
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                        color-adjust: exact;
                    }

                    html, body { background: #64748b; }

                    body {
                        font-family: 'Segoe UI', Arial, sans-serif;
                        color: #1e293b;
                        line-height: 1.35;
                        margin: 0;
                        padding: 0;
                    }

                    /* Simula sullo schermo il foglio A4 (210mm) prima della stampa/salvataggio PDF */
                    .a4-page {
                        width: 210mm;
                        min-height: 297mm;
                        max-width: 100%;
                        margin: 16px auto;
                        padding: ${mrg.top}mm ${mrg.right}mm ${mrg.bottom}mm ${mrg.left}mm;
                        background: #fff;
                        box-shadow: 0 4px 18px rgba(0,0,0,0.25);
                    }

                    ${cssRegoleFoglio('')}

                    /* Le icone del report (<svg class="ico"><use href="#i-...">) puntano a
                       <symbol> definiti nello sprite dell'app principale: la finestra di stampa è
                       un documento a sé, quindi lo sprite va reiniettato (vedi getIconSpriteHtml)
                       E questa regola di dimensionamento va duplicata qui, perché .ico normalmente
                       vive nel foglio di stile principale, non in questo. */
                    .ico {
                        width: 1.05em;
                        height: 1.05em;
                        flex: 0 0 auto;
                        vertical-align: -0.15em;
                        fill: none;
                        stroke: currentColor;
                        stroke-width: 2;
                        stroke-linecap: round;
                        stroke-linejoin: round;
                    }

                    /* A SCHERMO (finestra di anteprima prima della stampa): ogni foglio si vede
                       come un foglio vero, staccato dal successivo. In stampa lo stacco sparisce
                       (regola sotto) perché lì i fogli COINCIDONO con le pagine fisiche. */
                    .dpsh-sheet { margin: 0 auto 18px; box-shadow: 0 4px 18px rgba(0,0,0,0.25); }

                    @media print {
                        html, body { background: #fff; }
                        body { padding: 0; margin: 0; }
                        .a4-page {
                            width: auto;
                            min-height: 0;
                            margin: 0;
                            padding: 0;
                            box-shadow: none;
                        }
                        /* Nessuno stacco/ombra tra i fogli in stampa: ogni .dpsh-sheet è già
                           esattamente una pagina fisica, un margine qui creerebbe lo sfasamento
                           che questa riscrittura serve proprio a eliminare. */
                        .dpsh-sheet { margin: 0 !important; box-shadow: none !important; }
                        .no-print { display: none !important; }
                        .header-box, .grid-meta { page-break-inside: avoid; }
                        /* Di default ogni tabella resta intera su una pagina (comportamento sicuro
                           per le tabelle corte: registro colpi di prove brevi, riepilogo parametri,
                           legenda litologica...). Solo le tabelle esplicitamente marcate .tbl-long
                           (lunghe per natura: registro colpi di prove profonde, tabella dettagliata
                           dei parametri) possono proseguire su più pagine, con l'intestazione
                           ripetuta ad ogni pagina grazie a "thead" sotto. */
                        table { page-break-inside: avoid; }
                        table.tbl-long { page-break-inside: auto; }
                        thead { display: table-header-group; }
                        tr, img { page-break-inside: avoid; }
                    }
                `;
            }

            /** Script iniettato nella finestra di stampa (generatePrintableReport/exportProjectPDF):
             * dopo che TUTTO si è caricato (window.load — comprese le tessere satellitari del
             * blocco Inquadramento, scaricate dalla rete), misura ogni pagina marcata con
             * data-tpl-report-page (vedi buildPaginaRigheHtml) contro la sua vera altezza massima A4
             * (data-tpl-max-height-mm) usando un elemento sonda alto esattamente quei mm, così la
             * conversione mm→px riflette il rendering REALE di questa finestra (font, DPI, zoom del
             * browser), non un calcolo approssimato. Se una pagina sfora, mostra un avviso .no-print
             * in cima al foglio (invisibile in stampa) prima che l'utente clicchi "Stampa/Salva PDF"
             * e si ritrovi con più pagine di quelle previste dal template senza sapere perché (bug
             * segnalato: blocchi sulla stessa pagina nell'editor, finiti su due pagine diverse nel
             * PDF — la causa più comune è che l'anteprima dell'editor usa i dati di UNA prova sola,
             * mentre qui si stampano i dati REALI, spesso più ingombranti). Non impedisce la stampa:
             * è solo un avviso, l'utente resta libero di procedere comunque. */
            function getControlloImpaginazioneScriptTag(autoPrint) {
                // autoPrint (richiesto esplicitamente: "RIMUOVILO", riferito al passaggio in più di
                // dover cliccare il tasto giallo prima che parta la stampa — "voglio che si
                // generasse direttamente il pdf"): quando true, appena il documento è DAVVERO pronto
                // (stesso segnale di window.load già usato per il controllo di sforamento qui sotto —
                // window/immagini/tessere satellitari comprese, mai prima) apre da sé la finestra di
                // stampa nativa del browser, senza dover prima cliccare il pulsante giallo. Il
                // pulsante resta comunque nella pagina come fallback manuale (utile se l'utente
                // chiude per sbaglio la finestra di stampa aperta automaticamente).
                // NB: questo è codice dentro una STRINGA, iniettato nel documento da stampare —
                // vive in un altro contesto, dove ignoraErrore non esiste. Va lasciato con il
                // catch vuoto: qui l'unica cosa sensata è non far fallire la stampa.
                const autoPrintJs = autoPrint ? 'try { window.print(); } catch(e) {}' : '';
                return `
                <script>
                (function(){
                    /* DOVE VIVE QUESTO DOCUMENTO CAMBIA TUTTO. Con autoPrint il documento sta in
                     * un iframe fuori schermo e invisibile (vedi avviaGenerazioneEsportazionePdf):
                     * qui dentro NON si può disegnare niente che l'utente debba vedere o cliccare,
                     * perché non lo vedrà e non potrà cliccarlo. Ci si era messa la scelta
                     * «Stampa comunque / Riprova», ed è lì che l'export moriva in silenzio.
                     * Da qui in poi: si conta e si riferisce al padre, che ha lo schermo.
                     * Senza autoPrint il documento è una finestra vera e visibile (la stampa dei
                     * Parametri Avanzati), quindi il velo e la scelta restano dove sono e vanno
                     * benissimo. */
                    var IN_CORNICE = ${autoPrint ? 'true' : 'false'};
                    function riferisciAlPadre(nome, dati){
                        if (!IN_CORNICE) return false;
                        try {
                            var f = window.parent && window.parent['__dpshStampa' + nome];
                            if (typeof f === 'function') { f(dati); return true; }
                        } catch(e) { /* padre irraggiungibile: si torna al comportamento locale */ }
                        return false;
                    }
                    // Numerazione pagine RIMOSSA DEL TUTTO (richiesto esplicitamente, in modo
                    // definitivo, dopo che anche il tentativo di ricalcolarla a fine stampa era
                    // risultato comunque sbagliato — "35 mostrate contro 56 vere": un blocco
                    // flowable dentro un template personalizzato che sfora la sua pagina logica
                    // trabocca sulla pagina fisica successiva via impaginazione nativa del browser,
                    // che non lascia nessun marcatore su cui contare — vedi buildPaginaHeaderFooterHtml
                    // per la stessa motivazione lato costruzione dell'HTML). Nessuno script di
                    // numerazione gira più qui: resta solo il controllo di sforamento sotto, che
                    // avvisa (senza contare pagine) quando qualcosa non entra fisicamente in un
                    // foglio A4.
                    function eseguiControlloImpaginazioneStampa(){
                        try {
                            var pagine = document.querySelectorAll('[data-tpl-report-page]');
                            var eccedenti = [];
                            pagine.forEach(function(el){
                                // FOGLI RIGIDI: la misura è cambiata di natura insieme alla
                                // struttura. Prima ogni pagina era un blocco a crescita libera e si
                                // confrontava la sua altezza totale con l'A4: se sforava, il browser
                                // aggiungeva un foglio. ORA il foglio ha altezza FISSA, quindi
                                // "el.offsetHeight" varrebbe sempre 297mm esatti e questo controllo
                                // non scatterebbe MAI (falso "va tutto bene"). Il rischio residuo non
                                // è più la pagina in più — geometricamente impossibile — ma il suo
                                // opposto: contenuto TAGLIATO dall'overflow:hidden. Si misura quindi
                                // lo scorrimento reale del contenuto (scrollHeight) contro lo spazio
                                // disponibile (clientHeight) dentro l'area utile del foglio: è
                                // esattamente la definizione di "qui sto perdendo qualcosa".
                                var inner = el.querySelector('.dpsh-sheet-inner') || el;
                                if (inner.scrollHeight > inner.clientHeight + 2) {
                                    eccedenti.push(el.getAttribute('data-tpl-page-label') || 'Pagina');
                                }
                            });
                            if (eccedenti.length > 0) {
                                var banner = document.createElement('div');
                                banner.className = 'no-print';
                                banner.style.cssText = 'background:#fef3c7; border:1.5px solid #f59e0b; color:#78350f; font-size:12px; font-weight:700; padding:10px 14px; border-radius:8px; margin:0 auto 14px; max-width:210mm; line-height:1.5;';
                                banner.textContent = 'Attenzione: in ' + eccedenti.length + ' pagina/e (' + eccedenti.join(', ') + ') il contenuto è più alto dello spazio utile del foglio, quindi la parte in eccesso verrà TAGLIATA invece di comparire nel PDF. Il numero di pagine resta comunque esattamente quello del template (nessuna pagina bianca aggiunta). Per recuperare il contenuto tagliato, apri l\\'editor del layout, scegli questa prova nella tendina "Anteprima con i dati di" e riduci/sposta i blocchi coinvolti, oppure aggiungi un\\'interruzione di pagina nel menu del blocco.';
                                var host = document.querySelector('.dpsh-sheet-stack') || document.querySelector('.a4-page') || document.body;
                                host.parentNode.insertBefore(banner, host);
                            }
                            return eccedenti;
                        } catch(e) { return []; /* mai bloccare la stampa per un errore nel controllo */ }
                    }
                    // FIX (segnalato in chat: pagine bianche + piè di pagina fuori posto nel PDF —
                    // causate proprio dallo sforamento che il controllo qui sopra misura già
                    // correttamente sulle dimensioni REALI della finestra di stampa; l'avviso
                    // esisteva ma con la stampa automatica la finestra di stampa si apriva SOPRA di
                    // lui un istante dopo, nascondendolo prima che si potesse leggere — un avviso
                    // pensato per "niente sorprese" che finiva per sparire proprio quando serviva).
                    // Con sforamento rilevato E stampa automatica attiva, la stampa si ferma qui: un
                    // confirm() sincrono, che blocca finché l'utente non lo legge e chiude
                    // consapevolmente, invece di un banner nascosto sotto la finestra di stampa in
                    // mezzo secondo. Zero effetto quando non c'è sforamento (il caso normale) o
                    // quando la stampa è manuale (il banner resta comunque visibile per sempre lì).
                    // Percorso della sola finestra VISIBILE (autoPrint falso): controlla, lascia il
                    // banner giallo in cima — lì si vede davvero — e stampa. Con autoPrint attivo
                    // questa strada non si imbocca: decide e stampa il padre (vedi avvia()).
                    function eseguiPassaggioFinale(){
                        eseguiControlloImpaginazioneStampa();
                        ${autoPrintJs}
                    }
