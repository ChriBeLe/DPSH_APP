            // ===================== BASI DEL CARATTERE PER I BLOCCHI TABELLARI =====================
            // (vedi Piano_Controlli_Font.md, passo 1)
            // I blocchi di testo libero (titolo, testo) e la didascalia foto salvano già una taglia
            // ASSOLUTA in punti. I cinque blocchi tabellari invece salvano un MOLTIPLICATORE
            // (blk.fontScale, 0.6–1.8) applicato via --tpl-font-scale dentro dei calc(): mostrarlo
            // come "115%" non dice 115% di cosa, ed è il difetto segnalato ("zero indicazioni sulla
            // vera grandezza dei typeface").
            //
            // Per tradurlo in punti serve una base. E qui sta la scoperta del passo 1: la base NON è
            // una costante per tipo di blocco. Quattro blocchi su cinque la calcolano dai dati —
            // autoFitTabellaExport la sceglie in base al NUMERO DI COLONNE (11 / 10.5 / 9.5 / 8.5 /
            // 7.5px) e autoFitTabellaRighe in base al NUMERO DI RIGHE (10 / 9.3 / 8.7 / 8px), perché
            // una tabella con dodici strati deve rimpicciolire il testo per starci. Solo "Dati Prova"
            // ha una base fissa (10.5px).
            //
            // Conseguenza pratica: lo stesso template, su una prova con più strati, stampa davvero
            // un carattere più piccolo. Un "11pt" nominale sarebbe quindi una bugia. La base viene
            // perciò LETTA dall'HTML già costruito per la prova in anteprima (templateEditorState.ctx,
            // vedi computeEditorPreviewCtx) invece di essere riprodotta qui: è la stessa identica
            // stringa che finirà in stampa, non una seconda copia della logica di auto-fit da tenere
            // allineata a quella vera.
            const CHIAVE_CTX_HTML_BLOCCO = {
                'dati-prova': 'datiBoxHtml',
                'tabella-colpi': 'colpiTableHtml',
                'tabella-riepilogo-parametri': 'tabellaRiepilogoHtml',
                'tabella-dettagliata-parametri': 'tabellaDettagliataHtml',
                'allegato-formule': 'allegatoHtml',
                // Il grafico è entrato qui insieme alla conversione delle sue 12 etichette SVG da
                // font-size="7" a style="font-size:calc(7px * ...)": adesso la stessa regex lo legge
                // come legge una tabella, senza un secondo meccanismo da mantenere.
                'grafico-stratigrafia': 'stratigrafiaChartHtml'
            };
            /** Base del carattere di un blocco tabellare, per la prova attualmente in anteprima.
             * @returns {{px:number, pt:number, uniforme:boolean, quanti:number}|null} null se il
             *   blocco non è tabellare o se non c'è contenuto da cui leggere (nessuna prova scelta,
             *   oppure prova senza parametri calcolati): in quel caso chi chiama resta sulla
             *   percentuale invece di inventare un numero.
             */
            function baseFontBloccoTabellare(tipo, ctx) {
                const chiave = CHIAVE_CTX_HTML_BLOCCO[tipo];
                if (!chiave || !ctx) return null;
                const html = ctx[chiave] || '';
                const trovati = [...html.matchAll(/font-size:\s*calc\(\s*([\d.]+)px\s*\*\s*var\(--tpl-font-scale/g)]
                    .map(m => parseFloat(m[1]))
                    .filter(v => isFinite(v) && v > 0);
                if (trovati.length === 0) return null;
                // Un blocco può contenere più tabelle (una per categoria) o più testi: se hanno
                // tutti la stessa base il numero mostrato è esatto. Altrimenti — è il caso del
                // grafico, che ha titoli, etichette d'asse e numerini di 4 misure diverse — si
                // prende la misura PIÙ RICORRENTE, cioè il corpo del blocco, non la prima che
                // capita nella stringa (che nel grafico sarebbe il titolo, il testo meno
                // rappresentativo di tutti). Chi mostra il numero lo segnala con "≈" invece di far
                // credere che descriva ogni testo del blocco.
                const uniforme = trovati.every(v => v === trovati[0]);
                let dominante = trovati[0];
                if (!uniforme) {
                    const conteggio = new Map();
                    trovati.forEach(v => conteggio.set(v, (conteggio.get(v) || 0) + 1));
                    // A parità di occorrenze vince la prima incontrata: l'ordine di Map conserva
                    // l'inserimento, quindi il risultato è stabile e non dipende dal caso.
                    conteggio.forEach((quante, v) => { if (quante > conteggio.get(dominante)) dominante = v; });
                }
                // 1pt = 1/72 di pollice, 1px CSS = 1/96 di pollice → pt = px × 0.75. In stampa questa
                // conversione è esatta, non un'approssimazione: il foglio è un A4 in millimetri veri.
                return { px: dominante, pt: dominante * 0.75, uniforme, quanti: trovati.length };
            }
            /** Dove tagliare un gruppo di categorie che non entra in una pagina sola.
             *
             * Fino a ieri l'avviso rosso diceva "misurato 340mm, servono 2 pagine" e poi lasciava
             * all'utente il compito di indovinare in quale punto mettere il "+". I millimetri per
             * farlo c'erano già tutti: questa funzione li usa.
             *
             * Riempimento sequenziale: si accumula finché la categoria successiva ci sta, altrimenti
             * il taglio va PRIMA di quella. Non si cerca la divisione "ottima" (minor numero di
             * pagine): l'ordine delle categorie è quello del documento e non si può cambiare,
             * quindi a parità di ordine il riempimento sequenziale dà già il minimo numero di
             * pagine — e in più taglia dove taglierebbe chiunque leggendo dall'alto.
             *
             * @param {number[]} indici indici di categoria del gruppo, in ordine di documento
             * @param {(i:number)=>number|null} mmDi millimetri misurati di una categoria
             * @param {number} limiteMm spazio utile di una pagina
             * @returns {{tagli:number[], nonRisolvibili:number[]}} dove mettere le interruzioni, e
             *   quali categorie da sole superano la pagina — su quelle nessun taglio può aiutare,
             *   e dirlo è più utile che fingere di aver risolto.
             */
            function suddividiGruppoCategorie(indici, mmDi, limiteMm) {
                const tagli = [];
                const nonRisolvibili = [];
                if (!Array.isArray(indici) || indici.length === 0 || !(limiteMm > 0)) return { tagli, nonRisolvibili };
                let accumulato = 0;
                indici.forEach((idx, i) => {
                    const mm = mmDi(idx) || 0;
                    if (mm > limiteMm) nonRisolvibili.push(idx);
                    // "accumulato > 0" è la guardia che evita la pagina bianca: una categoria più
                    // alta di una pagina intera non deve generare un taglio prima di sé quando è
                    // già la prima della pagina — traboccherebbe comunque, e in più si sprecherebbe
                    // un foglio vuoto davanti.
                    if (i > 0 && accumulato > 0 && accumulato + mm > limiteMm) {
                        tagli.push(idx);
                        accumulato = 0;
                    }
                    accumulato += mm;
                });
                return { tagli, nonRisolvibili };
            }

            /** Punti visualizzati = base × moltiplicatore salvato. */
            function ptDaFontScale(basePt, fontScale) {
                return basePt * (typeof fontScale === 'number' && isFinite(fontScale) ? fontScale : 1);
            }
            /** Inverso: dal valore in punti scritto dall'utente al moltiplicatore da salvare.
             * Riporta sempre dentro i limiti storici (0.6–1.8) invece di rifiutare il valore: un
             * campo che non reagisce lascia l'utente a chiedersi cosa ha sbagliato. */
            function fontScaleDaPt(basePt, pt, minScale = 0.6, maxScale = 1.8) {
                if (!(basePt > 0) || !isFinite(pt) || pt <= 0) return null;
                return Math.min(maxScale, Math.max(minScale, pt / basePt));
            }
            /** Intervallo di punti realmente raggiungibile per questo blocco, cioè i limiti del
             * moltiplicatore tradotti in punti. Serve al campo numerico per sapere cosa accettare:
             * il range "ragionevole" non è lo stesso per una tabella fitta e per un titolo. */
            function intervalloPtBlocco(basePt, minScale = 0.6, maxScale = 1.8) {
                return { minPt: basePt * minScale, maxPt: basePt * maxScale };
            }

