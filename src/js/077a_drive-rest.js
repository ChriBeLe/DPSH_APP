            // ===================== DRIVE: LE POCHE CHIAMATE CHE SERVONO =====================
            // Sopra googleFetch (077). Servono alle chiavi cifrate (078, cartella nascosta appDataFolder) e alla
            // sincronizzazione dei progetti (079, cartella visibile «DPSH»). Regole che valgono per tutto:
            //  - quello che arriva da Drive (nomi, appProperties, contenuti) è input non fidato;
            //  - un elenco si usa SOLO se è completo: se una pagina fallisce, l'errore sale e nessuno conclude
            //    «sono spariti»;
            //  - niente cancellazioni definitive: i file si mettono nel cestino (trashed: true);
            //  - nessun errore e nessun log riporta il token né il contenuto dei file.
            const DRIVE_API = 'https://www.googleapis.com/drive/v3';
            const DRIVE_CARICA = 'https://www.googleapis.com/upload/drive/v3';
            const DRIVE_CARTELLA_MIME = 'application/vnd.google-apps.folder';
            const DRIVE_CAMPI_FILE = 'id,name,mimeType,modifiedTime,appProperties,parents';

            /** Testo dentro una query di Drive (tra apici singoli). */
            const driveQ = (testo) => String(testo).replace(/\\/g, '\\\\').replace(/'/g, "\\'");

            function driveErrore(cosa, r) {
                const e = new Error('Drive: ' + cosa + ' non riuscito (' + r.status + ').');
                e.stato = r.status;
                return e;
            }

            /** Tutti i file che rispondono alla query, pagina dopo pagina. spazio: 'drive' | 'appDataFolder'. */
            async function driveElenca(q, spazio) {
                const tutti = [];
                let pagina = '';
                for (let n = 0; n < 100; n++) {
                    const url = DRIVE_API + '/files?q=' + encodeURIComponent(q) + '&spaces=' + (spazio || 'drive') + '&pageSize=100'
                        + '&fields=' + encodeURIComponent('nextPageToken,files(' + DRIVE_CAMPI_FILE + ')') + (pagina ? '&pageToken=' + encodeURIComponent(pagina) : '');
                    const r = await googleFetch(url);
                    if (!r.ok) throw driveErrore('l\'elenco dei file', r);
                    const j = await r.json();
                    (Array.isArray(j.files) ? j.files : []).forEach(f => { if (f && typeof f.id === 'string') tutti.push(f); });
                    if (!j.nextPageToken) return tutti;
                    pagina = String(j.nextPageToken);
                }
                throw new Error('Drive: troppi file, l\'elenco non è completo.');
            }

            async function driveMetadati(id) {
                const r = await googleFetch(DRIVE_API + '/files/' + encodeURIComponent(id) + '?fields=' + encodeURIComponent(DRIVE_CAMPI_FILE + ',trashed'));
                if (r.status === 404) return null;
                if (!r.ok) throw driveErrore('la lettura del file', r);
                return r.json();
            }

            /** I byte di un file (ArrayBuffer). */
            async function driveScarica(id) {
                const r = await googleFetch(DRIVE_API + '/files/' + encodeURIComponent(id) + '?alt=media');
                if (!r.ok) throw driveErrore('il download', r);
                return r.arrayBuffer();
            }

            async function driveCreaCartella(nome) {
                const r = await googleFetch(DRIVE_API + '/files?fields=' + encodeURIComponent(DRIVE_CAMPI_FILE), {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: nome, mimeType: DRIVE_CARTELLA_MIME })
                });
                if (!r.ok) throw driveErrore('la creazione della cartella', r);
                return r.json();
            }

            /** Crea (senza id) o sostituisce (con id) un file, con il caricamento «resumable»: due richieste, una
             * per i dati del file e una per i byte, va bene anche per i pacchetti con le foto.
             * meta: { name, parents?, appProperties?, mimeType? }. Ritorna i metadati del file. */
            async function driveCarica(id, meta, byte, tipo) {
                const campi = encodeURIComponent(DRIVE_CAMPI_FILE);
                const inizio = await googleFetch(DRIVE_CARICA + '/files' + (id ? '/' + encodeURIComponent(id) : '') + '?uploadType=resumable&fields=' + campi, {
                    method: id ? 'PATCH' : 'POST',
                    headers: { 'Content-Type': 'application/json; charset=UTF-8', 'X-Upload-Content-Type': tipo || 'application/octet-stream' },
                    body: JSON.stringify(meta)
                });
                if (!inizio.ok) throw driveErrore('l\'avvio del caricamento', inizio);
                const dove = inizio.headers.get('Location');
                if (!dove || !/^https:\/\/www\.googleapis\.com\//.test(dove)) throw new Error('Drive: indirizzo di caricamento non valido.');
                const r = await googleFetch(dove, { method: 'PUT', headers: { 'Content-Type': tipo || 'application/octet-stream' }, body: byte });
                if (!r.ok) throw driveErrore('il caricamento', r);
                return r.json();
            }

            /** Mette un file nel cestino di Drive (si recupera da lì). Mai cancellazione definitiva. */
            async function driveCestina(id) {
                const r = await googleFetch(DRIVE_API + '/files/' + encodeURIComponent(id) + '?fields=id,trashed', {
                    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ trashed: true })
                });
                if (!r.ok) throw driveErrore('lo spostamento nel cestino', r);
                return r.json();
            }
