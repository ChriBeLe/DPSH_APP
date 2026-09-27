            // ===================== SUPPORTO ZIP NATIVO (solo metodo "store", nessuna compressione) =====================
            // Scriviamo/leggiamo file ZIP senza compressione: le foto restano byte-per-byte identiche
            // all'originale (qualità piena e dati EXIF intatti), ed evitiamo di dover implementare
            // DEFLATE/INFLATE (non necessario: le foto JPEG guadagnano pochissimo dalla compressione ZIP).

            const ZIP_CRC32_TABLE = (() => {
                const table = new Uint32Array(256);
                for (let n = 0; n < 256; n++) {
                    let c = n;
                    for (let k = 0; k < 8; k++) {
                        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
                    }
                    table[n] = c >>> 0;
                }
                return table;
            })();
            function zipCrc32(bytes) {
                let crc = 0xFFFFFFFF;
                for (let i = 0; i < bytes.length; i++) {
                    crc = ZIP_CRC32_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
                }
                return (crc ^ 0xFFFFFFFF) >>> 0;
            }

            function zipDosDateTime(date) {
                date = date || new Date();
                const dosTime = ((date.getHours() & 0x1F) << 11) | ((date.getMinutes() & 0x3F) << 5) | ((Math.floor(date.getSeconds() / 2)) & 0x1F);
                const dosDate = (((Math.max(0, date.getFullYear() - 1980)) & 0x7F) << 9) | (((date.getMonth() + 1) & 0xF) << 5) | (date.getDate() & 0x1F);
                return { dosTime, dosDate };
            }

            // Costruisce un Blob ZIP (solo metodo store) da una lista di { name, bytes(Uint8Array) }.
            // Il blob finale viene assemblato da tanti pezzi piccoli, mai un unico buffer enorme
            // concatenato a mano: stesso principio di efficienza usato per l'export JSON.
            function buildZipBlob(entries) {
                const encoder = new TextEncoder();
                const { dosTime, dosDate } = zipDosDateTime(new Date());
                const blobParts = [];
                const centralParts = [];
                let offset = 0;
                let centralSize = 0;

                entries.forEach(entry => {
                    const nameBytes = encoder.encode(entry.name);
                    const dataBytes = entry.bytes instanceof Uint8Array ? entry.bytes : new Uint8Array(entry.bytes);
                    const crc = zipCrc32(dataBytes);
                    const size = dataBytes.length;

                    const localHeader = new DataView(new ArrayBuffer(30));
                    localHeader.setUint32(0, 0x04034b50, true);
                    localHeader.setUint16(4, 20, true);
                    localHeader.setUint16(6, 0x0800, true);
                    localHeader.setUint16(8, 0, true);
                    localHeader.setUint16(10, dosTime, true);
                    localHeader.setUint16(12, dosDate, true);
                    localHeader.setUint32(14, crc, true);
                    localHeader.setUint32(18, size, true);
                    localHeader.setUint32(22, size, true);
                    localHeader.setUint16(26, nameBytes.length, true);
                    localHeader.setUint16(28, 0, true);

                    blobParts.push(new Uint8Array(localHeader.buffer));
                    blobParts.push(nameBytes);
                    blobParts.push(dataBytes);

                    const centralHeader = new DataView(new ArrayBuffer(46));
                    centralHeader.setUint32(0, 0x02014b50, true);
                    centralHeader.setUint16(4, 20, true);
                    centralHeader.setUint16(6, 20, true);
                    centralHeader.setUint16(8, 0x0800, true);
                    centralHeader.setUint16(10, 0, true);
                    centralHeader.setUint16(12, dosTime, true);
                    centralHeader.setUint16(14, dosDate, true);
                    centralHeader.setUint32(16, crc, true);
                    centralHeader.setUint32(20, size, true);
                    centralHeader.setUint32(24, size, true);
                    centralHeader.setUint16(28, nameBytes.length, true);
                    centralHeader.setUint16(30, 0, true);
                    centralHeader.setUint16(32, 0, true);
                    centralHeader.setUint16(34, 0, true);
                    centralHeader.setUint16(36, 0, true);
                    centralHeader.setUint32(38, 0, true);
                    centralHeader.setUint32(42, offset, true);

                    centralParts.push(new Uint8Array(centralHeader.buffer));
                    centralParts.push(nameBytes);

                    offset += 30 + nameBytes.length + size;
                    centralSize += 46 + nameBytes.length;
                });

                const eocd = new DataView(new ArrayBuffer(22));
                eocd.setUint32(0, 0x06054b50, true);
                eocd.setUint16(4, 0, true);
                eocd.setUint16(6, 0, true);
                eocd.setUint16(8, entries.length, true);
                eocd.setUint16(10, entries.length, true);
                eocd.setUint32(12, centralSize, true);
                eocd.setUint32(16, offset, true);
                eocd.setUint16(20, 0, true);

                const allParts = blobParts.concat(centralParts).concat([new Uint8Array(eocd.buffer)]);
                return new Blob(allParts, { type: 'application/zip' });
            }

            // Legge un file ZIP "store-only" (nessuna compressione): supporta solo backup creati da
            // questa stessa app. Restituisce un array di { name, bytes(Uint8Array) }.
            async function readZipStoreOnly(file) {
                const buf = new Uint8Array(await file.arrayBuffer());
                const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

                // Cerca la firma End Of Central Directory (EOCD) partendo dal fondo, entro l'ultimo
                // tratto del file (il commento finale può essere lungo al massimo 65535 byte).
                const maxBack = Math.min(buf.length, 65557);
                let eocdOffset = -1;
                for (let i = buf.length - 22; i >= buf.length - maxBack && i >= 0; i--) {
                    if (dv.getUint32(i, true) === 0x06054b50) { eocdOffset = i; break; }
                }
                if (eocdOffset === -1) throw new Error('File ZIP non valido o corrotto (fine della directory centrale non trovata).');

                const totalEntries = dv.getUint16(eocdOffset + 10, true);
                const centralDirOffset = dv.getUint32(eocdOffset + 16, true);

                const decoder = new TextDecoder();
                const results = [];
                let ptr = centralDirOffset;
                for (let i = 0; i < totalEntries; i++) {
                    const sig = dv.getUint32(ptr, true);
                    if (sig !== 0x02014b50) throw new Error('File ZIP non valido o corrotto (voce di directory centrale inattesa).');
                    const method = dv.getUint16(ptr + 10, true);
                    const compSize = dv.getUint32(ptr + 20, true);
                    const nameLen = dv.getUint16(ptr + 28, true);
                    const extraLen = dv.getUint16(ptr + 30, true);
                    const commentLen = dv.getUint16(ptr + 32, true);
                    const localOffset = dv.getUint32(ptr + 42, true);
                    const name = decoder.decode(buf.subarray(ptr + 46, ptr + 46 + nameLen));

                    if (method !== 0) {
                        throw new Error(`Il file "${name}" nello ZIP è compresso: questa app supporta solo backup ZIP creati da sé stessa (nessuna compressione).`);
                    }

                    // Il local file header può avere lunghezza nome/extra diversa da quella indicata
                    // nella directory centrale: la leggiamo direttamente per calcolare l'offset dei dati.
                    const localNameLen = dv.getUint16(localOffset + 26, true);
                    const localExtraLen = dv.getUint16(localOffset + 28, true);
                    const dataStart = localOffset + 30 + localNameLen + localExtraLen;
                    const dataBytes = buf.slice(dataStart, dataStart + compSize);

                    results.push({ name, bytes: dataBytes });
                    ptr += 46 + nameLen + extraLen + commentLen;
                }
                return results;
            }

            // Conversione dataURL <-> bytes grezzi, con lettura/scrittura a blocchi per non superare
            // i limiti dello stack di String.fromCharCode/atob quando le foto sono molto grandi.
            function dataUrlToUint8Array(dataUrl) {
                const commaIdx = dataUrl.indexOf(',');
                const meta = dataUrl.slice(5, commaIdx); // es. "image/jpeg;base64"
                const mime = (meta.split(';')[0] || 'application/octet-stream').trim();
                const b64 = dataUrl.slice(commaIdx + 1);
                const binStr = atob(b64);
                const len = binStr.length;
                const bytes = new Uint8Array(len);
                for (let i = 0; i < len; i++) bytes[i] = binStr.charCodeAt(i);
                return { bytes, mime };
            }
            function uint8ArrayToDataUrl(bytes, mime) {
                const CHUNK = 0x8000;
                let binStr = '';
                for (let i = 0; i < bytes.length; i += CHUNK) {
                    binStr += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
                }
                return `data:${mime || 'application/octet-stream'};base64,${btoa(binStr)}`;
            }
            function extFromMime(mime) {
                const map = { 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/heic': 'heic', 'image/heif': 'heif' };
                return map[(mime || '').toLowerCase()] || 'jpg';
            }
            function mimeFromZipExt(name) {
                const ext = (name.split('.').pop() || '').toLowerCase();
                const map = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };
                return map[ext] || 'application/octet-stream';
            }

            // Clona SOLO i metadati di un progetto, escludendo fin dall'inizio ogni dataUrl di
            // foto eventualmente già presente nell'oggetto live (il replacer di JSON.stringify
            // la salta durante la clonazione stessa, non dopo): a differenza di
            // rehydrateProjectPhotosForExport, qui il clone non contiene MAI il testo base64
            // delle foto, nemmeno per un istante. Le foto vengono lette una alla volta più avanti.
            function cloneProjectMetaSenzaFoto(proj) {
                return JSON.parse(JSON.stringify(proj, (key, value) => key === 'dataUrl' ? undefined : value));
            }

            // Legge la dataUrl di UNA foto (cache RAM -> IndexedDB), stesso fallback usato altrove.
            async function leggiDataUrlFoto(photoId) {
                if (photoMemoryCache[photoId]) return photoMemoryCache[photoId];
                if (typeof getPhotoFromIDB === 'function') {
                    try { return await getPhotoFromIDB(photoId); } catch (e) { return null; }
                }
                return null;
            }

            // Piccola pausa per restituire il controllo al thread principale del browser: sui
            // telefoni, elaborare molte foto pesanti tutte di fila SENZA mai cedere il controllo
            // può far scattare il watchdog "pagina non risponde" (soprattutto su iOS Safari),
            // che l'utente percepisce come un crash. Non costa quasi nulla e previene il problema.
            function respiraUnAttimo() {
                return new Promise(resolve => setTimeout(resolve, 0));
            }

            // Estrae dalle foto (e dalle immagini incorporate nella Nota) i dataUrl di un progetto
            // GIA CLONATO SENZA FOTO (vedi cloneProjectMetaSenzaFoto): legge, converte e accoda
            // allo ZIP UNA FOTO ALLA VOLTA, cosi non tiene mai in memoria tutte le foto del
            // progetto assieme (a differenza della vecchia versione che le pre-caricava tutte su
            // un unico clone: era proprio questo il motivo del crash su mobile). Muta `proj` in-place.
            // Le foto della prova vengono chiamate "DPSH_<numero prova>" (una sola foto) oppure
            // "DPSH_<numero prova>-<indice>" (più foto sulla stessa prova), es. DPSH_3, DPSH_1-1, DPSH_1-2.
            // Ritorna quante foto citate NON sono finite nello ZIP perché non si trovano sul
            // dispositivo (fino alla Fase 1 le saltava in silenzio): chi esporta lo dice all'utente.
            // `giaScritte` (id foto → nome nel file) evita di scrivere due volte la stessa foto,
            // per esempio quella condivisa fra la prova 3 e la sua interpretazione 3B.
            async function estraiFotoProgettoPerZip(proj, entries, prefix, giaScritte) {
                let contatore = 0;
                let mancanti = 0;
                const scritte = giaScritte || new Map();
                if (proj.surveys) {
                    for (const sid of Object.keys(proj.surveys)) {
                        const surv = proj.surveys[sid];
                        const photos = surv.photos;
                        if (!photos || photos.length === 0) continue;
                        const provaNrSafe = String((surv.header && surv.header.provaNr) || '1').trim().replace(/[^A-Za-z0-9._-]+/g, '_') || '1';
                        const usaSuffisso = photos.length > 1;
                        let indiceValido = 0;
                        for (const p of photos) {
                            // Già vista: scritta (si riusa il file) o già contata fra le mancanti.
                            if (p && scritte.has(p.id)) { if (scritte.get(p.id)) p.zipFile = scritte.get(p.id); continue; }
                            const dataUrl = await leggiDataUrlFoto(p.id);
                            if (!dataUrl || String(dataUrl).indexOf('data:') !== 0) { mancanti++; scritte.set(p.id, null); continue; }
                            indiceValido++;
                            const { bytes, mime } = dataUrlToUint8Array(dataUrl);
                            const ext = extFromMime(mime);
                            const baseName = usaSuffisso ? `DPSH_${provaNrSafe}-${indiceValido}` : `DPSH_${provaNrSafe}`;
                            const fileName = `${prefix}foto/${sid}/${baseName}.${ext}`;
                            entries.push({ name: fileName, bytes });
                            p.zipFile = fileName;
                            scritte.set(p.id, fileName);
                            contatore++;
                            if (contatore % 3 === 0) await respiraUnAttimo();
                        }
                    }
                }
                // Le immagini della Nota: sia la nota di oggi sia la copia conservata prima della
                // conversione al nuovo motore (htmlPrimaDelMotore), che fino alla Fase 1 usciva senza.
                const immaginiScritte = new Set();
                for (const campo of ['html', 'htmlPrimaDelMotore']) {
                    if (!proj.notes || !proj.notes[campo]) continue;
                    if (typeof rehydrateNoteImagesInHtmlString === 'function') {
                        // Le immagini incorporate nella Nota sono in numero contenuto e già gestite
                        // altrove con lo stesso fallback cache/IndexedDB: le reidratiamo prima di
                        // estrarle, senza appesantire il flusso principale delle foto della prova.
                        proj.notes[campo] = await rehydrateNoteImagesInHtmlString(proj.notes[campo]);
                    }
                    if (proj.notes[campo].indexOf('data-note-img-id') === -1) continue;
                    try {
                        const doc = new DOMParser().parseFromString(proj.notes[campo], 'text/html');
                        doc.querySelectorAll('img[data-note-img-id]').forEach(img => {
                            const src = img.getAttribute('src');
                            const id = img.getAttribute('data-note-img-id');
                            if (src && src.indexOf('data:') === 0 && id) {
                                const { bytes, mime } = dataUrlToUint8Array(src);
                                const ext = extFromMime(mime);
                                const fileName = `${prefix}note_immagini/${id}.${ext}`;
                                if (!immaginiScritte.has(fileName)) { entries.push({ name: fileName, bytes }); immaginiScritte.add(fileName); }
                                img.setAttribute('src', '');
                                img.setAttribute('data-zip-file', fileName);
                            }
                        });
                        proj.notes[campo] = doc.body.innerHTML;
                    } catch (e) { ignoraErrore('estraiFotoProgettoPerZip', e); }
                }
                return mancanti;
            }

            // Operazione inversa: ricostruisce i dataUrl di un progetto letto da uno ZIP, usando
            // la mappa nome-file -> bytes ottenuta da readZipStoreOnly.
            function reidrataProgettoDaZip(proj, byName) {
                if (proj.surveys) {
                    Object.values(proj.surveys).forEach(surv => {
                        (surv.photos || []).forEach(p => {
                            if (p.zipFile && byName[p.zipFile]) {
                                p.dataUrl = uint8ArrayToDataUrl(byName[p.zipFile], mimeFromZipExt(p.zipFile));
                                delete p.zipFile;
                            }
                        });
                    });
                }
                ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    if (!proj.notes || !proj.notes[campo] || proj.notes[campo].indexOf('data-zip-file') === -1) return;
                    try {
                        const doc = new DOMParser().parseFromString(proj.notes[campo], 'text/html');
                        doc.querySelectorAll('img[data-zip-file]').forEach(img => {
                            const fileName = img.getAttribute('data-zip-file');
                            if (fileName && byName[fileName]) {
                                img.setAttribute('src', uint8ArrayToDataUrl(byName[fileName], mimeFromZipExt(fileName)));
                                img.removeAttribute('data-zip-file');
                            }
                        });
                        proj.notes[campo] = doc.body.innerHTML;
                    } catch (e) { ignoraErrore('reidrataProgettoDaZip', e); }
                });
                return proj;
            }


            /** Scarica un Blob con il nome dato (i file ZIP: pacchetti e backup). */
            function scaricaBlobFile(blob, nomeFile) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = nomeFile;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                triggerVibrate([40, 60]);
            }

            // Esporta un progetto come ZIP con le foto salvate come file binari originali (nessuna
            // compressione, EXIF intatti): a differenza del backup JSON, qui le foto non passano
            // mai per base64 dentro un'unica stringa enorme, quindi è più leggero e non rischia di
            // far crashare l'app per l'uso eccessivo di memoria su progetti con molte foto.
            async function exportProjectZip(projId) {
                if (!projId || !state.projects[projId]) return;
                const proj = cloneProjectMetaSenzaFoto(state.projects[projId]);
                // La forma dei dati viaggia col progetto: chi lo importa sa se va aggiornato (004b).
                proj.versioneSchema = VERSIONE_SCHEMA_DATI;
                const entries = [];
                const mancanti = await estraiFotoProgettoPerZip(proj, entries, '');
                entries.push({ name: 'progetto.json', bytes: new TextEncoder().encode(JSON.stringify(proj, null, 2)) });
                // I template e le voci d'archivio usati dal progetto (Fase 2, pezzo 044a).
                entries.push({ name: 'librerie.json', bytes: new TextEncoder().encode(JSON.stringify(librerieUsateDa({ [projId]: state.projects[projId] }, state), null, 2)) });
                scaricaBlobFile(buildZipBlob(entries), `Progetto_${nomeFileProgetto(state.projects[projId])}_Backup.zip`);
                avvisaFotoMancantiNelBackup(mancanti);
            }

            // Esporta SOLO l'archivio fotografico del progetto (tutte le prove), senza
            // progetto.json — per il tasto "Foto Cantiere" della modale Esporta, che promette solo
            // le foto, non un backup completo (quello è "Backup Strutturato (JSON)", vedi
            // exportProjectZip sopra). Bug preesistente: il pulsante chiamava exportProjectPhotos,
            // funzione mai esistita in tutto il file (ReferenceError in console) — non aveva MAI
            // funzionato. Riusa lo stesso meccanismo "una foto alla volta" già collaudato in
            // exportProjectZip, per non tenere mai tutte le foto del progetto in memoria assieme.
            async function exportProjectPhotos(projId, soloProve) {
                if (!projId || !state.projects[projId]) return;
                const proj = cloneProjectMetaSenzaFoto(state.projects[projId]);
                if (soloProve) proj.surveys = Object.fromEntries(Object.entries(proj.surveys || {}).filter(([id]) => soloProve.has(id)));
                const numFotoTotali = Object.values(proj.surveys || {}).reduce((n, s) => n + ((s.photos || []).length), 0);
                if (numFotoTotali === 0) {
                    alert('Nessuna foto presente in questo progetto.');
                    return;
                }
                const entries = [];
                const mancanti = await estraiFotoProgettoPerZip(proj, entries, '');
                if (entries.length === 0) {
                    alert(mancanti > 0 ? 'Le foto di questo progetto non si trovano su questo dispositivo.' : 'Nessuna foto presente in questo progetto.');
                    return;
                }
                scaricaBlobFile(buildZipBlob(entries), `Progetto_${nomeFileProgetto(state.projects[projId])}_Foto.zip`);
                avvisaFotoMancantiNelBackup(mancanti);
            }

            // Esporta l'intero archivio (tutti i progetti) come ZIP: stesso principio dell'export
            // singolo, ma con un progetto.json per ciascun progetto, tutti sotto progetti/<id>/.
            async function exportGlobalZip() {
                const entries = [];
                const projectIds = Object.keys(state.projects || {});
                const manifest = { projectIds, exportedAt: Date.now(), versioneApp: APP_VERSIONE, versioneSchema: VERSIONE_SCHEMA_DATI };
                let mancanti = 0;
                // Una foto condivisa fra due progetti (un duplicato) si scrive una volta sola.
                const giaScritte = new Map();

                for (const pid of projectIds) {
                    const proj = cloneProjectMetaSenzaFoto(state.projects[pid]);
                    // Anche su ogni progetto: un progetto.json estratto e importato da solo resta leggibile.
                    proj.versioneSchema = VERSIONE_SCHEMA_DATI;
                    mancanti += await estraiFotoProgettoPerZip(proj, entries, `progetti/${pid}/`, giaScritte);
                    entries.push({ name: `progetti/${pid}/progetto.json`, bytes: new TextEncoder().encode(JSON.stringify(proj, null, 2)) });
                }
                // Le librerie intere (Fase 2): è il backup dell'archivio, non solo dei progetti.
                const librerie = { reportTemplates: state.reportTemplates || {}, indiceTemplates: state.indiceTemplates || {}, lithologyArchive: state.lithologyArchive || {}, tutte: true };
                entries.push({ name: 'librerie.json', bytes: new TextEncoder().encode(JSON.stringify(librerie, null, 2)) });
                entries.push({ name: 'manifest.json', bytes: new TextEncoder().encode(JSON.stringify(manifest, null, 2)) });

                scaricaBlobFile(buildZipBlob(entries), `DPSH_Backup_Completo_${new Date().toISOString().split('T')[0]}.zip`);
                avvisaFotoMancantiNelBackup(mancanti);
            }

            // Importa un backup ZIP (progetto singolo o archivio completo) creato da questa app,
            // ricostruendo i dataUrl delle foto dai file binari contenuti nello ZIP e passando poi
            // il risultato alla stessa pipeline di importazione già usata per i backup JSON, cosi
            // le regole di merge/rinomina/ripristino IndexedDB restano identiche in entrambi i casi.
            async function importProjectsFromZip(file) {
                const entries = await readZipStoreOnly(file);
                const byName = {};
                entries.forEach(e => { byName[e.name] = e.bytes; });
                const decoder = new TextDecoder();
                // Le librerie (Fase 2): negli ZIP di prima non ci sono, e allora niente cambia.
                const librerie = byName['librerie.json'] ? JSON.parse(decoder.decode(byName['librerie.json'])) : null;

                // Backup completo (più progetti): riconoscibile da manifest.json + progetti/<id>/progetto.json
                if (byName['manifest.json']) {
                    const manifest = JSON.parse(decoder.decode(byName['manifest.json']));
                    // Il pacchetto di progetto (Fase 2) ha la sua strada, con verifica e anteprima
                    // (044b): qui non si importa, invece di importare zero progetti in silenzio.
                    if (manifest && manifest.tipo === TIPO_PACCHETTO_PROGETTO) {
                        throw new Error('Questo è un pacchetto di progetto: si apre da «Ricevi» nella Home.');
                    }
                    // La versione è del manifest: la si controlla subito, prima di leggere i progetti.
                    controllaVersioneFileImportato(versioneFileImportato(manifest));
                    const projects = {};
                    (manifest.projectIds || []).forEach(pid => {
                        const key = `progetti/${pid}/progetto.json`;
                        if (byName[key]) {
                            const proj = JSON.parse(decoder.decode(byName[key]));
                            projects[pid] = reidrataProgettoDaZip(proj, byName);
                        }
                    });
                    const contenitore = { versioneSchema: versioneFileImportato(manifest), projects };
                    if (librerie) contenitore.librerie = librerie;
                    return importProjectsFromJSON(contenitore);
                }

                // Progetto singolo: un unico progetto.json alla radice dello ZIP.
                if (byName['progetto.json']) {
                    const proj = JSON.parse(decoder.decode(byName['progetto.json']));
                    if (librerie) proj.librerie = librerie;
                    return importProjectsFromJSON(reidrataProgettoDaZip(proj, byName));
                }

                throw new Error('Lo ZIP selezionato non contiene un backup riconoscibile di questa app (manca progetto.json).');
            }
