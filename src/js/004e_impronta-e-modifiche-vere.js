            // ============== IMPRONTA DEL CONTENUTO E ULTIMA MODIFICA VERA (Fase 2) ==============
            // Per dire quale di due copie dello stesso progetto è quella buona (telefono ↔ PC),
            // updatedAt non serve: cambia a ogni salvataggio, anche solo aprendo il progetto. Qui ci
            // sono gli strumenti che servono al pacchetto di progetto (pezzo 044b):
            //
            //  - SHA-256 (sha256Byte, sha256Testo, sha256Async): l'impronta di ogni file del pacchetto
            //    e del contenuto. In JavaScript puro, perché crypto.subtle esiste solo nei contesti
            //    «sicuri» e dentro l'APK non è garantito; dove c'è, sha256Async lo usa (è più veloce).
            //  - proj.modificatoIl (ISO): l'ultima volta che il CONTENUTO del progetto è cambiato
            //    davvero su un dispositivo. Lo aggiorna saveState, confrontando il contenuto con quello
            //    già visto (contenutiConosciuti). Aprire un progetto, cambiare tema, riordinare la Home
            //    non sono modifiche. Assente = nessuna modifica vista da quando esiste il campo: la
            //    migrazione 1→2 non inventa date.
            //  - proj.passaggi: le impronte del progetto ogni volta che è uscito in un pacchetto. Il
            //    pacchetto le porta con sé, e chi lo riceve capisce se il suo progetto è un antenato
            //    di quello in arrivo (si può sostituire senza perdere niente) o se le due copie sono
            //    state modificate ognuna per conto suo.

            // Campi che non sono contenuto: orari di salvataggio, i due campi qui sopra, le immagini
            // che in memoria possono esserci o no (foto e immagini delle note stanno in IndexedDB).
            const CHIAVI_FUORI_DAL_CONTENUTO = new Set(['updatedAt', 'modificatoIl', 'passaggi', 'dataUrl']);
            // Preferenze dell'APP che syncStateToProject copia dentro ogni prova (settings) insieme al
            // passo e al penetrometro: cambiarle non modifica il progetto.
            const IMPOSTAZIONI_DELL_APP = new Set(['darkMode', 'themeHue', 'expandedMode', 'compactMode', 'tastoRegistraVisibile', 'integratedChart',
                'haptic', 'audio', 'wakeLock', 'debugMode', 'gloveMode', 'disegnoSfondoTipo', 'disegnoSfondoColore',
                'righeIndiceAnteprima', 'wmsPersonalizzati', 'registroEspanso', 'intervalliRecentiInCima', 'contatoreSuPc']);

            /** Le costanti di SHA-256 (FIPS 180-4), tenute sulla funzione stessa: niente const a
             * livello di script, quindi niente zona morta se qualcuno la chiama presto. Scritte per
             * esteso e non ricalcolate dalle radici cubiche: un errore d'arrotondamento di Math.cbrt
             * darebbe impronte sbagliate su un solo dispositivo. */
            function costantiSha256() {
                if (costantiSha256.k) return costantiSha256.k;
                costantiSha256.k = new Uint32Array([
                    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
                    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
                    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
                    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
                    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
                    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
                    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
                    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
                ]);
                return costantiSha256.k;
            }

            /** SHA-256 di una sequenza di byte (Uint8Array), in esadecimale minuscolo. */
            function sha256Byte(byte) {
                const K = costantiSha256();
                const w = new Uint32Array(64);
                let h0 = 0x6a09e667, h1 = 0xbb67ae85, h2 = 0x3c6ef372, h3 = 0xa54ff53a,
                    h4 = 0x510e527f, h5 = 0x9b05688c, h6 = 0x1f83d9ab, h7 = 0x5be0cd19;
                const blocco = (src, off) => {
                    for (let i = 0; i < 16; i++) {
                        const j = off + 4 * i;
                        w[i] = (src[j] << 24) | (src[j + 1] << 16) | (src[j + 2] << 8) | src[j + 3];
                    }
                    for (let i = 16; i < 64; i++) {
                        const x = w[i - 15], y = w[i - 2];
                        const s0 = ((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3);
                        const s1 = ((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10);
                        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
                    }
                    let a = h0, b = h1, c = h2, d = h3, e = h4, f = h5, g = h6, h = h7;
                    for (let i = 0; i < 64; i++) {
                        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
                        const ch = (e & f) ^ (~e & g);
                        const t1 = (h + S1 + ch + K[i] + w[i]) | 0;
                        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
                        const maj = (a & b) ^ (a & c) ^ (b & c);
                        const t2 = (S0 + maj) | 0;
                        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
                    }
                    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0; h3 = (h3 + d) | 0;
                    h4 = (h4 + e) | 0; h5 = (h5 + f) | 0; h6 = (h6 + g) | 0; h7 = (h7 + h) | 0;
                };
                const l = byte.length;
                const pieni = Math.floor(l / 64);
                for (let i = 0; i < pieni; i++) blocco(byte, i * 64);
                // Coda: i byte rimasti, 0x80, zeri e la lunghezza in bit (64 bit, big-endian).
                const resto = l - pieni * 64;
                const coda = new Uint8Array(resto < 56 ? 64 : 128);
                coda.set(byte.subarray(pieni * 64));
                coda[resto] = 0x80;
                const bitAlti = Math.floor(l / 0x20000000), bitBassi = (l << 3) >>> 0;
                const fine = coda.length;
                coda[fine - 8] = bitAlti >>> 24; coda[fine - 7] = bitAlti >>> 16; coda[fine - 6] = bitAlti >>> 8; coda[fine - 5] = bitAlti;
                coda[fine - 4] = bitBassi >>> 24; coda[fine - 3] = bitBassi >>> 16; coda[fine - 2] = bitBassi >>> 8; coda[fine - 1] = bitBassi;
                for (let off = 0; off < fine; off += 64) blocco(coda, off);
                return [h0, h1, h2, h3, h4, h5, h6, h7].map(v => (v >>> 0).toString(16).padStart(8, '0')).join('');
            }

            function sha256Testo(testo) {
                return sha256Byte(new TextEncoder().encode(String(testo)));
            }

            /** Come sha256Byte, ma con crypto.subtle dove c'è (stesso risultato, molto più veloce sulle
             * foto). Se subtle non c'è o si rifiuta, si ripiega sul calcolo in JavaScript. */
            async function sha256Async(byte) {
                try {
                    const subtle = window.crypto && window.crypto.subtle;
                    if (subtle && typeof subtle.digest === 'function') {
                        const buf = await subtle.digest('SHA-256', byte);
                        return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
                    }
                } catch (e) { ignoraErrore('sha256Async', e); }
                return sha256Byte(byte);
            }

            /** JSON con le chiavi in ordine alfabetico: lo stesso oggetto dà lo stesso testo su ogni
             * dispositivo, qualunque sia l'ordine in cui le chiavi sono state scritte. */
            function jsonCanonico(v) {
                if (v === null || typeof v !== 'object') {
                    const s = JSON.stringify(v);
                    return s === undefined ? 'null' : s;
                }
                if (Array.isArray(v)) return '[' + v.map(x => (x === undefined || typeof x === 'function') ? 'null' : jsonCanonico(x)).join(',') + ']';
                const chiavi = Object.keys(v).filter(k => v[k] !== undefined && typeof v[k] !== 'function').sort();
                return '{' + chiavi.map(k => JSON.stringify(k) + ':' + jsonCanonico(v[k])).join(',') + '}';
            }

            /** L'HTML di una nota senza le immagini incorporate: nello stato salvato le immagini delle
             * note hanno src="" (stanno in IndexedDB), in memoria possono averlo pieno. Per il
             * contenuto conta quale immagine c'è (data-note-img-id), non dove sta in quel momento. */
            function htmlNotaSenzaImmagini(html) {
                if (typeof html !== 'string' || html.indexOf('data-note-img-id') === -1) return html;
                return html.replace(/<img\b[^>]*>/g, tag => tag.indexOf('data-note-img-id') === -1 ? tag : tag.replace(/\ssrc="data:[^"]*"/, ' src=""'));
            }

            /** Il testo del CONTENUTO di un progetto, per accorgersi se è cambiato su questo
             * dispositivo. Non serve a confrontare dispositivi diversi (per quello c'è
             * improntaProgetto): l'ordine delle chiavi qui è quello di questo dispositivo. */
            function testoContenutoProgetto(proj) {
                return JSON.stringify(proj, function (k, v) {
                    if (CHIAVI_FUORI_DAL_CONTENUTO.has(k)) return undefined;
                    if (k === 'settings' && v && typeof v === 'object' && !Array.isArray(v)) {
                        const solo = {};
                        Object.keys(v).forEach(c => { if (!IMPOSTAZIONI_DELL_APP.has(c)) solo[c] = v[c]; });
                        return solo;
                    }
                    if ((k === 'html' || k === 'htmlPrimaDelMotore') && typeof v === 'string') return htmlNotaSenzaImmagini(v);
                    return v;
                });
            }

            // Il contenuto di ogni progetto com'era all'ultimo salvataggio (o alla lettura dei dati).
            const contenutiConosciuti = new Map();

            /** Dentro saveState, dopo syncStateToProject: i progetti il cui contenuto è cambiato
             * rispetto all'ultima volta prendono modificatoIl = adesso. Un progetto mai visto (appena
             * creato, arrivato da un file, ripristinato con Annulla) si registra e basta: la sua data
             * la porta con sé, o arriverà alla prima modifica. */
            function registraModificheVere() {
                const progetti = state.projects || {};
                let adesso = null;
                Object.keys(progetti).forEach(pid => {
                    const proj = progetti[pid];
                    if (!proj || typeof proj !== 'object') return;
                    const testo = testoContenutoProgetto(proj);
                    const prima = contenutiConosciuti.get(pid);
                    if (prima !== undefined && prima !== testo) {
                        adesso = adesso || new Date().toISOString();
                        proj.modificatoIl = adesso;
                    }
                    contenutiConosciuti.set(pid, testo);
                });
                contenutiConosciuti.forEach((_, pid) => { if (!progetti[pid]) contenutiConosciuti.delete(pid); });
            }

            /** Il contenuto attuale di un progetto va preso per buono, senza segnarlo come modificato:
             * dopo un import (il progetto arriva con la sua data) e dopo la lettura dei dati. */
            function accettaContenutoProgetto(pid) {
                const proj = state.projects && state.projects[pid];
                if (proj && typeof proj === 'object') contenutiConosciuti.set(pid, testoContenutoProgetto(proj));
            }

            /** Aprire una prova la copia nello stato attivo, e il salvataggio successivo la riscrive
             * nel progetto normalizzata (βt dichiarato dal cantiere, impostazioni dell'app, valori
             * mancanti). Quella riscrittura non è una modifica: se il progetto non aveva modifiche in
             * sospeso, si accetta già adesso il contenuto che il prossimo salvataggio scriverà per la
             * sola apertura. Qualunque cosa l'utente faccia dopo, invece, conta. */
            function accettaNormalizzazioneApertura(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj || state.currentProjectId !== projId) return;
                const conosciuto = contenutiConosciuti.get(projId);
                if (conosciuto === undefined || conosciuto !== testoContenutoProgetto(proj)) return;
                const copia = JSON.parse(JSON.stringify(proj, (k, v) => (k === 'dataUrl' ? undefined : v)));
                scriviStatoAttivoNelProgetto(copia);
                contenutiConosciuti.set(projId, testoContenutoProgetto(copia));
            }

            /** Dopo la lettura dei dati: tutto ciò che c'è è il punto di partenza, nessuna modifica. */
            function primaContenutiConosciuti() {
                contenutiConosciuti.clear();
                Object.keys(state.projects || {}).forEach(accettaContenutoProgetto);
                if (state.currentProjectId) accettaNormalizzazioneApertura(state.currentProjectId);
            }

            /** «26/09/2026 alle 18:40» da una data ISO o da millisecondi; '' se non c'è. */
            function formattaQuandoCompleto(quando) {
                if (quando === undefined || quando === null || quando === '') return '';
                const d = new Date(quando);
                if (isNaN(d.getTime())) return '';
                const due = (n) => String(n).padStart(2, '0');
                return `${due(d.getDate())}/${due(d.getMonth() + 1)}/${d.getFullYear()} alle ${due(d.getHours())}:${due(d.getMinutes())}`;
            }
