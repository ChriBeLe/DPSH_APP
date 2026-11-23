            // ─── TESTO SICURO E DATI IN INGRESSO (Revisione 2026-11, Fase A) ───────────────────────
            // L'interfaccia si costruisce quasi tutta con innerHTML e template string. Finché i dati
            // li scrive l'utente sul suo telefono va bene; ma un progetto, un template, un archivio
            // litologico o un KML arrivano anche da fuori (un collega, una chat, una chiavetta) e
            // allora ogni campo è un pezzo di HTML che qualcun altro ha scelto. Un nome come
            // `<img src=x onerror=…>` diventa codice che vede e può cancellare tutte le prove e le
            // foto. Prima c'erano un escaper "ufficiale" (escapeHtmlDidascalia) e 4–5 copie locali,
            // usati a macchia di leopardo. Qui c'è UNA funzione per il testo, una per i valori dentro
            // un attributo style, e i controlli di forma per gli id, i colori e le immagini, da usare
            // in tutti gli import: chi aggiunge un import nuovo trova qui cosa chiamare.
            //
            // Sono dichiarazioni di funzione: salgono in cima all'ambito comune, quindi si possono
            // usare da qualunque pezzo, anche da quelli che vengono prima.

            /** Testo qualsiasi → testo sicuro dentro HTML, sia fra i tag sia dentro un attributo fra
             * virgolette (doppie o singole). null e undefined diventano stringa vuota, perché nei
             * template string scriverebbero "undefined" nella pagina. */
            function testoHtml(valore) {
                if (valore === null || valore === undefined) return '';
                return String(valore)
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;')
                    .replace(/'/g, '&#39;');
            }

            /** Testo → testo sicuro dentro XML (KML, GPX, docx). Come testoHtml, più i caratteri di
             * controllo che XML 1.0 non ammette affatto: un solo carattere così e Google Earth rifiuta
             * l'intero file. */
            function testoXml(valore) {
                if (valore === null || valore === undefined) return '';
                return testoHtml(String(valore).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, ''));
            }

            /** Forma ammessa per un id che arriva da un file: lettere, cifre, trattino e trattino
             * basso, fino a 80 caratteri. È la forma di tutti gli id che l'app genera (Date.now(),
             * 'proj_…', 'foto_…'); tutto il resto (virgolette, '<', spazi, "__proto__") non è un id
             * scritto dall'app e non deve diventare una chiave di state.projects né un data-id. */
            // (Niente const a livello del pezzo: i pezzi prima di questo potrebbero chiamare queste
            // funzioni durante l'avvio, e una const non ancora inizializzata lancerebbe — TDZ.)
            function idSicuro(id) {
                if (typeof id === 'number' && Number.isFinite(id)) id = String(id);
                if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id)) return false;
                return ['__proto__', 'constructor', 'prototype', 'hasOwnProperty', 'toString', 'valueOf'].indexOf(id) < 0;
            }

            /** L'id se ha la forma giusta, altrimenti uno nuovo con lo stesso prefisso degli id
             * dell'app. Non scarta il dato: lo rinomina, come si fa già quando l'id esiste. */
            function idSicuroOppureNuovo(id, prefisso) {
                if (idSicuro(id)) return String(id);
                return (prefisso || 'id') + '_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
            }

            /** Un colore che finisce dentro style="…": solo #rgb/#rgba/#rrggbb/#rrggbbaa, rgb()/rgba()
             * con numeri, o un nome CSS di sole lettere. Qualsiasi altra cosa (un `"` che chiude
             * l'attributo, un `;` che aggiunge proprietà, url(…)) diventa il colore di ripiego. */
            function coloreSicuro(colore, ripiego) {
                const c = typeof colore === 'string' ? colore.trim() : '';
                if (/^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(c)) return c;
                if (/^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(c)) return c;
                if (/^hsla?\(\s*\d{1,3}(?:\.\d+)?(?:deg)?\s*,\s*\d{1,3}(?:\.\d+)?%\s*,\s*\d{1,3}(?:\.\d+)?%\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/.test(c)) return c;
                if (/^[a-zA-Z]{3,20}$/.test(c)) return c;
                return ripiego === undefined ? '#888888' : ripiego;
            }

            /** Il prefisso di un dataUrl d'immagine ("data:image/jpeg;base64"), come lo scrive il
             * pacchetto di progetto nel manifest. Solo i formati che l'app produce o accetta; il
             * prefisso viene da un file e finisce in un attributo src, quindi non può contenere
             * nient'altro. */
            function prefissoImmagineSicuro(prefisso) {
                return typeof prefisso === 'string' && /^data:image\/(?:jpeg|jpg|png|webp|gif);base64$/.test(prefisso);
            }

            /** Un dataUrl d'immagine completo: prefisso ammesso e poi solo caratteri base64. Così il
             * valore è sicuro anche dentro src="…" senza escape, e una "foto" che in realtà è un
             * documento HTML (data:text/html) non entra. */
            function dataUrlImmagineSicuro(valore) {
                if (typeof valore !== 'string') return false;
                const virgola = valore.indexOf(',');
                if (virgola < 0) return false;
                return prefissoImmagineSicuro(valore.slice(0, virgola)) && /^[A-Za-z0-9+/=\s]*$/.test(valore.slice(virgola + 1));
            }

            /** Un numero per style="font-size:…pt" e simili: il valore se è un numero finito nel
             * campo atteso, altrimenti il ripiego. */
            function numeroSicuro(valore, ripiego, min, max) {
                const n = Number(valore);
                if (!Number.isFinite(n)) return ripiego;
                if (min !== undefined && n < min) return ripiego;
                if (max !== undefined && n > max) return ripiego;
                return n;
            }
