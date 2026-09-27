            // ======================= IL PACCHETTO DI PROGETTO (Fase 2) =======================
            // Per portare un progetto dal telefono al PC e ritorno: la COPIA ESATTA del progetto, in
            // uno ZIP (solo «store», come i backup: i byte delle foto non si toccano) con un manifest.
            //
            //   manifest.json      tipo, formato, versioni, progetto, quando e da quale dispositivo,
            //                      impronta del contenuto, conteggi, foto mancanti, e l'elenco di
            //                      TUTTI gli altri file con dimensione e SHA-256
            //   progetto.json      il progetto com'è salvato (foto senza immagine, note con src="")
            //   librerie.json      i template e le voci d'archivio che usa, e chi li usa (044a)
            //   registro.json      le correzioni automatiche registrate per questo progetto
            //   foto/…             le foto, byte originali; anche l'intera di una foto ritagliata
            //   immagini_note/…    le immagini delle note (anche della nota di prima del motore)
            //
            // All'arrivo ogni file si verifica con la sua impronta PRIMA di scrivere qualsiasi cosa:
            // un pacchetto rovinato si rifiuta intero. Poi si mostra cosa arriva e come sta rispetto
            // al progetto già presente (stesso id), e si sceglie: Sostituisci (con copia automatica
            // prima) o Tieni entrambi. Le copie automatiche (Cronologia) restano del dispositivo.
            //
            // «Più recente». Ogni volta che un progetto esce in un pacchetto, la sua impronta entra
            // in proj.passaggi.impronte, che il pacchetto porta con sé. Chi riceve confronta:
            //  - impronte uguali: è lo stesso progetto, non c'è niente da aggiornare;
            //  - il progetto di qui è una tappa del pacchetto: il pacchetto lo contiene e va avanti,
            //    sostituire non perde niente;
            //  - il pacchetto è una tappa del progetto di qui: qui c'è di più, sostituire perde;
            //  - hanno una tappa in comune ma sono andati avanti tutti e due: modifiche da entrambe le
            //    parti, sostituire perde quelle di qui;
            //  - nessuna tappa in comune (dati di prima di questa fase): si guardano le date di
            //    ultima modifica vera (proj.modificatoIl, 004e).

            const TIPO_PACCHETTO_PROGETTO = 'dpsh-pacchetto-progetto';
            const FORMATO_PACCHETTO = 1;
            const CHIAVE_NOME_DISPOSITIVO = 'dpsh_nome_dispositivo';
            const SUFFISSO_INTERA = '__orig'; // lo stesso di SUFFISSO_ORIGINALE (059), qui leggibile prima

            // ---------- Il nome di questo dispositivo ----------
            // Sta in una chiave sua di localStorage e non in state.settings: le impostazioni viaggiano
            // dentro ogni prova (syncStateToProject) e aprire una prova arrivata dal telefono
            // scriverebbe «Telefono» come nome del PC. E non deve finire nei backup.

            function nomeDispositivo() {
                try {
                    const n = localStorage.getItem(CHIAVE_NOME_DISPOSITIVO);
                    if (n && n.trim()) return n.trim();
                } catch (e) { ignoraErrore('nomeDispositivo', e); }
                const ua = (navigator && navigator.userAgent) || '';
                return /Android|iPhone|iPad|iPod|Mobile/i.test(ua) ? 'Telefono' : 'PC';
            }
            function impostaNomeDispositivo(nome) {
                const n = String(nome || '').trim().slice(0, 40);
                if (!n) return false;
                try { localStorage.setItem(CHIAVE_NOME_DISPOSITIVO, n); return true; } catch (e) { ignoraErrore('impostaNomeDispositivo', e); return false; }
            }
            /** «sul PC», «sul telefono», «su "Tablet Rossi"»: per le frasi della finestra Ricevi. */
            function suQuestoDispositivo() {
                const n = nomeDispositivo();
                if (/^(pc|telefono|tablet|portatile|computer)\b/i.test(n)) return 'sul ' + (/^pc\b/i.test(n) ? n : n.charAt(0).toLowerCase() + n.slice(1));
                return 'su «' + n + '»';
            }

            // ---------- Le immagini di un progetto ----------

            /** Gli id delle immagini delle note citate in un HTML. */
            function idImmaginiNelHtml(html) {
                const ids = [];
                const re = /data-note-img-id="([^"]+)"/g;
                let m;
                while ((m = re.exec(String(html || ''))) !== null) if (!ids.includes(m[1])) ids.push(m[1]);
                return ids;
            }

            /** Tutte le immagini di un progetto, in ordine: le foto delle prove (una volta sola anche se
             * condivise fra la 3 e la 3B) e le immagini delle note, ognuna con l'eventuale versione
             * intera conservata dal ritaglio (id + '__orig'). */
            function immaginiDelProgetto(proj) {
                const elenco = [];
                const viste = new Set();
                Object.keys((proj && proj.surveys) || {}).forEach(sid => {
                    const surv = proj.surveys[sid];
                    const nr = String((surv && surv.header && surv.header.provaNr) || '').trim() || '?';
                    let k = 0;
                    ((surv && surv.photos) || []).forEach(p => {
                        if (!p || !p.id || viste.has(p.id)) return;
                        viste.add(p.id);
                        k++;
                        elenco.push({ archivio: 'photos', id: p.id, prova: nr, indice: k });
                    });
                });
                ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    idImmaginiNelHtml(proj && proj.notes && proj.notes[campo]).forEach(id => {
                        if (viste.has('nota:' + id)) return;
                        viste.add('nota:' + id);
                        elenco.push({ archivio: 'noteImages', id });
                    });
                });
                return elenco;
            }

            /** Il dataUrl di un'immagine, dalla memoria o da IndexedDB; null se non c'è (o se al suo
             * posto c'è qualcosa che non è un'immagine). */
            async function leggiImmagineArchiviata(archivio, id, proj) {
                let v = null;
                if (archivio === 'photos') {
                    v = photoMemoryCache[id] || null;
                    if (!v && proj) {
                        Object.values(proj.surveys || {}).some(s => (s.photos || []).some(p => { if (p && p.id === id && p.dataUrl) { v = p.dataUrl; return true; } return false; }));
                    }
                    if (!v) { try { v = await getPhotoFromIDB(id); } catch (e) { v = null; } }
                } else {
                    v = noteImageMemoryCache[id] || null;
                    if (!v && proj && proj.notes) {
                        ['html', 'htmlPrimaDelMotore'].some(campo => {
                            const html = proj.notes[campo];
                            if (!html) return false;
                            const m = html.match(new RegExp('<img\\b[^>]*data-note-img-id="' + id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '"[^>]*>'));
                            const src = m && m[0].match(/\ssrc="(data:[^"]*)"/);
                            if (src) { v = src[1]; return true; }
                            return false;
                        });
                    }
                    if (!v) { try { v = await getNoteImageFromIDB(id); } catch (e) { v = null; } }
                }
                return (typeof v === 'string' && v.indexOf('data:') === 0 && v.indexOf(',') > 0) ? v : null;
            }

            /** Il prefisso esatto di un dataUrl («data:image/jpeg;base64»): si conserva per ricostruire
             * all'arrivo la stessa identica stringa. */
            function prefissoDataUrl(dataUrl) {
                return dataUrl.slice(0, dataUrl.indexOf(','));
            }
            function byteDaDataUrl(dataUrl) {
                const prefisso = prefissoDataUrl(dataUrl);
                const dati = dataUrl.slice(prefisso.length + 1);
                if (/;base64$/i.test(prefisso)) return dataUrlToUint8Array(dataUrl).bytes;
                return new TextEncoder().encode(decodeURIComponent(dati));
            }
            function dataUrlDaByte(byte, prefisso) {
                if (/;base64$/i.test(prefisso)) {
                    const CHUNK = 0x8000;
                    let bin = '';
                    for (let i = 0; i < byte.length; i += CHUNK) bin += String.fromCharCode.apply(null, byte.subarray(i, i + CHUNK));
                    return prefisso + ',' + btoa(bin);
                }
                return prefisso + ',' + encodeURIComponent(new TextDecoder().decode(byte));
            }
            function estensioneDaPrefisso(prefisso) {
                const mime = prefisso.slice(5).split(';')[0];
                return extFromMime(mime);
            }

            // ---------- L'impronta del contenuto ----------

            /** L'impronta di un progetto: uguale su due dispositivi se e solo se il progetto è lo stesso,
             * foto (per i loro byte), note, strati, template e voci d'archivio usati compresi, e
             * qualunque siano gli id con cui template, voci e immagini sono salvati sui due lati.
             *   librerie: dove cercare i template e le voci (il dispositivo, o quelle del pacchetto);
             *   impronteImmagini: Map id → SHA-256 dei byte di foto e immagini delle note. */
            function improntaProgetto(proj, librerie, impronteImmagini) {
                const lib = librerie || {};
                const imm = impronteImmagini || new Map();
                const rt = lib.reportTemplates || {}, it = lib.indiceTemplates || {}, la = lib.lithologyArchive || {};
                const voce = (tipo, v, id) => v ? tipo + ':' + sha256Testo(contenutoVoceLibreria(v)) : tipo + '-assente:' + id;
                const immagine = (id) => {
                    const h = imm.get(id);
                    const intera = imm.get(id + SUFFISSO_INTERA);
                    return (h ? 'img:' + h : 'img-assente:' + id) + (intera ? '+intera:' + intera : '');
                };
                const c = JSON.parse(testoContenutoProgetto(proj));
                Object.keys(c.surveys || {}).forEach(sid => {
                    const s = c.surveys[sid];
                    if (!s || typeof s !== 'object') return;
                    const tid = templateReportEffettivo(proj.surveys[sid], rt);
                    s.reportTemplateId = voce('tpl', rt[tid], tid);
                    (s.photos || []).forEach(p => { if (p && p.id) p.id = immagine(p.id); });
                });
                const idx = templateIndiceEffettivo(proj, it);
                if (idx) c.indiceTemplateId = voce('idx', it[idx], idx);
                const intro = templateIntroduzioneEffettivo(proj, rt);
                if (intro && c.introduzione) c.introduzione.templateId = voce('tpl', rt[intro], intro);
                stratiDelProgetto(c).forEach(s => { if (s.sourceArchiveId && la[s.sourceArchiveId]) s.sourceArchiveId = voce('arch', la[s.sourceArchiveId], s.sourceArchiveId); });
                if (c.notes) ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    if (typeof c.notes[campo] === 'string') c.notes[campo] = c.notes[campo].replace(/data-note-img-id="([^"]+)"/g, (_, id) => 'data-note-img="' + immagine(id) + '"');
                });
                return sha256Testo(jsonCanonico(c));
            }

            /** Le impronte (SHA-256 dei byte) delle immagini di un progetto su QUESTO dispositivo. */
            async function impronteImmaginiQui(proj) {
                const mappa = new Map();
                for (const im of immaginiDelProgetto(proj)) {
                    for (const id of [im.id, im.id + SUFFISSO_INTERA]) {
                        const d = await leggiImmagineArchiviata(im.archivio, id, proj);
                        if (d) mappa.set(id, await sha256Async(byteDaDataUrl(d)));
                    }
                    await respiraUnAttimo();
                }
                return mappa;
            }

            // ---------- Cosa c'è in un progetto (per le finestre) ----------

            function conteggiProgetto(proj) {
                const prove = Object.values((proj && proj.surveys) || {});
                const foto = new Set();
                prove.forEach(s => (s.photos || []).forEach(p => { if (p && p.id) foto.add(p.id); }));
                return {
                    prove: prove.length,
                    intervalli: prove.reduce((n, s) => n + (Array.isArray(s.logs) ? s.logs.length : 0), 0),
                    foto: foto.size,
                    strati: Array.isArray(proj && proj.strati) ? proj.strati.length : 0,
                    parametri: (Array.isArray(proj && proj.strati) ? proj.strati : []).filter(s => s && s.parametriAvanzati && Object.keys(s.parametriAvanzati).length > 0).length
                };
            }

            /** Le correzioni registrate che riguardano un progetto: quelle col suo id (dalla forma 2) e
             * quelle di prima, riconosciute dal nome del progetto con cui cominciano. */
            function correzioniDelProgetto(proj) {
                const nome = (proj && (proj.name || proj.comune)) || 'Progetto';
                return (Array.isArray(state.registroCorrezioni) ? state.registroCorrezioni : []).filter(c => c && (
                    c.projId ? c.projId === proj.id : (typeof c.cosa === 'string' && (c.cosa.indexOf(nome + ':') === 0 || c.cosa.indexOf(nome + ' · ') === 0))
                ));
            }

            /** Il progetto nella forma in cui è salvato: niente immagini (stanno nel pacchetto come
             * file), note con src="" per le immagini con id. */
            function formaSalvataProgetto(proj) {
                const c = JSON.parse(JSON.stringify(proj, (k, v) => (k === 'dataUrl' ? undefined : v)));
                if (c.notes) ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    // La stessa funzione di saveState: il progetto nel pacchetto è quello salvato.
                    if (typeof c.notes[campo] === 'string') c.notes[campo] = stripNoteImagesHtml(c.notes[campo]);
                });
                return c;
            }

            /** Peso e contenuto del pacchetto prima di crearlo: per la finestra «Porta su un altro
             * dispositivo» (il numero sul bottone) e per dire PRIMA quali immagini mancano. */
            async function stimaPacchetto(projId) {
                const proj = state.projects && state.projects[projId];
                if (!proj) return null;
                let byte = 0;
                const fotoMancanti = [], immaginiNoteMancanti = [];
                for (const im of immaginiDelProgetto(proj)) {
                    for (const id of [im.id, im.id + SUFFISSO_INTERA]) {
                        const d = await leggiImmagineArchiviata(im.archivio, id, proj);
                        // I byte dell'immagine, più la sua voce nello ZIP e nel manifest.
                        if (d) byte += Math.floor((d.length - d.indexOf(',') - 1) * 3 / 4) + 450;
                        else if (id === im.id) (im.archivio === 'photos' ? fotoMancanti : immaginiNoteMancanti).push(im);
                    }
                    await respiraUnAttimo();
                }
                const testo = JSON.stringify(formaSalvataProgetto(proj), null, 1) + JSON.stringify(librerieUsateDa({ [projId]: proj }, state), null, 1)
                    + JSON.stringify(correzioniDelProgetto(proj), null, 1);
                byte += new TextEncoder().encode(testo).length + 2500;
                return { byte, conteggi: conteggiProgetto(proj), fotoMancanti, immaginiNoteMancanti };
            }

            function formattaMegabyte(byte) {
                if (byte < 1024 * 1024) return Math.max(1, Math.round(byte / 1024)) + ' KB';
                const mb = byte / (1024 * 1024);
                return (mb < 10 ? mb.toFixed(1).replace('.', ',') : String(Math.round(mb))) + ' MB';
            }

            // ---------- Crea il pacchetto ----------

            /** Crea il pacchetto di un progetto. Ritorna { blob, nomeFile, manifest }. Registra nel
             * progetto (proj.passaggi) l'impronta con cui è uscito. Non scarica niente: lo fa chi chiama. */
            async function creaPacchettoProgetto(projId) {
                if (caricamentoDati.bloccato) throw new Error('i dati di questo dispositivo non sono stati letti: prima va risolto l\'avviso sui dati.');
                if (!state.projects || !state.projects[projId]) throw new Error('progetto non trovato');
                // Prima si salva: la prova aperta finisce nel progetto com'è adesso.
                saveState();
                const vivo = state.projects[projId];
                const dispositivo = nomeDispositivo();
                const esportatoIl = new Date().toISOString();
                const enc = new TextEncoder();
                const file = [];      // voci del manifest
                const entries = [];   // voci dello ZIP
                const impronte = new Map();
                const fotoMancanti = [], immaginiNoteMancanti = [];
                const percorsiUsati = new Set();
                const percorsoLibero = (p) => {
                    let finale = p, n = 2;
                    while (percorsiUsati.has(finale)) finale = p.replace(/(\.[^.\/]+)$/, `_${n++}$1`);
                    percorsiUsati.add(finale);
                    return finale;
                };
                const aggiungi = async (percorso, byte, extra) => {
                    const sha = await sha256Async(byte);
                    entries.push({ name: percorso, bytes: byte });
                    file.push(Object.assign({ percorso, byte: byte.length, sha256: sha }, extra || {}));
                    return sha;
                };

                // Le immagini, una alla volta: byte originali, mai ricompressi.
                for (const im of immaginiDelProgetto(vivo)) {
                    for (const id of [im.id, im.id + SUFFISSO_INTERA]) {
                        const d = await leggiImmagineArchiviata(im.archivio, id, vivo);
                        const intera = id !== im.id;
                        if (!d) {
                            if (!intera) (im.archivio === 'photos' ? fotoMancanti : immaginiNoteMancanti).push(im.archivio === 'photos' ? { id: im.id, prova: im.prova } : { id: im.id });
                            continue;
                        }
                        const prefisso = prefissoDataUrl(d);
                        const ext = estensioneDaPrefisso(prefisso);
                        const nrSicuro = String(im.prova || '').replace(/[^A-Za-z0-9._-]+/g, '_') || 'x';
                        const base = im.archivio === 'photos'
                            ? `foto/Prova_${nrSicuro}/DPSH_${nrSicuro}-${im.indice}${intera ? '_intera' : ''}.${ext}`
                            : `immagini_note/${String(im.id).replace(/[^A-Za-z0-9._-]+/g, '_')}${intera ? '_intera' : ''}.${ext}`;
                        const sha = await aggiungi(percorsoLibero(base), byteDaDataUrl(d), { archivio: im.archivio, id, prefisso });
                        impronte.set(id, sha);
                    }
                    await respiraUnAttimo();
                }

                // L'impronta del contenuto, e la tappa nel progetto (prima di scriverlo nel pacchetto,
                // così il progetto che parte e quello che arriva sono identici).
                const impronta = improntaProgetto(formaSalvataProgetto(vivo), state, impronte);
                const passaggi = (vivo.passaggi && typeof vivo.passaggi === 'object') ? vivo.passaggi : {};
                const elenco = Array.isArray(passaggi.impronte) ? passaggi.impronte : [];
                if (!elenco.length || elenco[elenco.length - 1].impronta !== impronta) {
                    elenco.push({ impronta, esportatoIl, dispositivo });
                }
                passaggi.impronte = elenco.slice(-50);
                vivo.passaggi = passaggi;
                saveState();

                const progetto = formaSalvataProgetto(vivo);
                const librerie = librerieUsateDa({ [projId]: vivo }, state);
                const registro = correzioniDelProgetto(vivo);
                await aggiungi('progetto.json', enc.encode(JSON.stringify(progetto, null, 1)));
                await aggiungi('librerie.json', enc.encode(JSON.stringify(librerie, null, 1)));
                await aggiungi('registro.json', enc.encode(JSON.stringify(registro, null, 1)));

                const manifest = {
                    tipo: TIPO_PACCHETTO_PROGETTO,
                    formatoPacchetto: FORMATO_PACCHETTO,
                    versioneSchema: VERSIONE_SCHEMA_DATI,
                    versioneApp: APP_VERSIONE,
                    progetto: { id: projId, nome: vivo.name || vivo.comune || 'Progetto' },
                    esportatoIl,
                    dispositivo,
                    modificatoIl: vivo.modificatoIl || null,
                    impronta,
                    conteggi: conteggiProgetto(vivo),
                    fotoMancanti,
                    immaginiNoteMancanti,
                    file
                };
                entries.unshift({ name: 'manifest.json', bytes: enc.encode(JSON.stringify(manifest, null, 1)) });
                const nomeFile = `${nomeFileProgetto(vivo)}_${esportatoIl.slice(0, 10)}.dpsh.zip`;
                return { blob: buildZipBlob(entries), nomeFile, manifest };
            }

            // ---------- Leggi e verifica un pacchetto ----------

            /** Vero se lo ZIP (già letto: voci { name, bytes }) è un pacchetto di progetto. */
            function vociSonoUnPacchetto(voci) {
                const m = (voci || []).find(v => v.name === 'manifest.json');
                if (!m) return false;
                try { return JSON.parse(new TextDecoder().decode(m.bytes)).tipo === TIPO_PACCHETTO_PROGETTO; } catch (e) { return false; }
            }

            /** Legge un pacchetto e controlla OGNI file con la sua impronta. Non scrive niente.
             * Ritorna { ok: true, … } con tutto quello che serve all'anteprima e all'import, oppure
             * { ok: false, problemi: [testo] }. */
            async function leggiPacchetto(file, vociGiaLette) {
                const problemi = [];
                let voci;
                try { voci = vociGiaLette || await readZipStoreOnly(file); } catch (e) { return { ok: false, problemi: ['il file non è uno ZIP leggibile: ' + e.message] }; }
                const perNome = new Map(voci.map(v => [v.name, v.bytes]));
                let manifest;
                try { manifest = JSON.parse(new TextDecoder().decode(perNome.get('manifest.json'))); } catch (e) { return { ok: false, problemi: ['manca il manifest, o non si legge: non è un pacchetto di progetto'] }; }
                if (!manifest || manifest.tipo !== TIPO_PACCHETTO_PROGETTO) return { ok: false, problemi: ['non è un pacchetto di progetto'] };
                if (!(Number.isInteger(manifest.formatoPacchetto) && manifest.formatoPacchetto >= 1)) return { ok: false, problemi: ['il formato del pacchetto non è valido'] };
                if (manifest.formatoPacchetto > FORMATO_PACCHETTO) return { ok: false, problemi: [`il pacchetto è stato creato da una versione più nuova dell'app (formato ${manifest.formatoPacchetto}). Aggiorna l'app e riprova`] };
                try { controllaVersioneFileImportato(versioneFileImportato(manifest)); } catch (e) { return { ok: false, problemi: [e.message] }; }

                const elenco = Array.isArray(manifest.file) ? manifest.file : [];
                const attesi = new Set(elenco.map(f => f && f.percorso));
                for (const f of elenco) {
                    const byte = f && perNome.get(f.percorso);
                    if (!byte) { problemi.push(`manca il file «${f && f.percorso}»`); continue; }
                    if (byte.length !== f.byte) { problemi.push(`«${f.percorso}» non ha la dimensione giusta (${byte.length} byte invece di ${f.byte})`); continue; }
                    const sha = await sha256Async(byte);
                    if (sha !== f.sha256) problemi.push(`«${f.percorso}» è rovinato: l'impronta non corrisponde`);
                }
                voci.forEach(v => { if (v.name !== 'manifest.json' && !attesi.has(v.name)) problemi.push(`c'è un file non elencato nel manifest («${v.name}»)`); });
                ['progetto.json', 'librerie.json', 'registro.json'].forEach(n => { if (!attesi.has(n)) problemi.push(`manca «${n}»`); });
                if (problemi.length) return { ok: false, problemi, manifest };

                const leggiJson = (n) => JSON.parse(new TextDecoder().decode(perNome.get(n)));
                let progetto, librerie, registro;
                try { progetto = leggiJson('progetto.json'); librerie = leggiJson('librerie.json'); registro = leggiJson('registro.json'); }
                catch (e) { return { ok: false, problemi: ['i dati del pacchetto non si leggono: ' + e.message], manifest }; }
                if (!progetto || typeof progetto !== 'object' || !progetto.id || !progetto.surveys) return { ok: false, problemi: ['il progetto nel pacchetto non è completo'], manifest };

                // Un pacchetto di un'app più vecchia passa dalle stesse migrazioni dei file (004b).
                const versione = versioneFileImportato(manifest);
                if (versione < VERSIONE_SCHEMA_DATI) progetto = migraProgettiImportati({ [progetto.id]: progetto }, versione)[progetto.id];

                const immagini = elenco.filter(f => f.archivio === 'photos' || f.archivio === 'noteImages')
                    .map(f => ({ archivio: f.archivio, id: f.id, prefisso: f.prefisso, sha256: f.sha256, byte: perNome.get(f.percorso) }));
                const impronteImmagini = new Map(immagini.map(im => [im.id, im.sha256]));
                const impronta = improntaProgetto(progetto, librerie, impronteImmagini);
                // Controllo di integrità sui dati in arrivo (004c): solo per dirlo, qui non si corregge.
                const idFoto = new Set(immagini.filter(i => i.archivio === 'photos').map(i => i.id));
                const idNote = new Set(immagini.filter(i => i.archivio === 'noteImages').map(i => i.id));
                const integrita = verificaIntegrita({ projects: { [progetto.id]: JSON.parse(JSON.stringify(progetto)) } }, { fotoPresenti: idFoto, immaginiNotePresenti: idNote });
                return {
                    ok: true, manifest, progetto, librerie, registro: Array.isArray(registro) ? registro : [], immagini,
                    verificati: elenco.length, impronta,
                    anomalie: integrita.anomalie.filter(a => !a.banale),
                    improntaDichiarataDiversa: !!manifest.impronta && manifest.impronta !== impronta
                };
            }

            /** Come sta il pacchetto rispetto al progetto con lo stesso id già su questo dispositivo. */
            async function confrontaConPresente(lettura) {
                const presente = state.projects && state.projects[lettura.progetto.id];
                if (!presente) return { presente: false, consigliata: 'nuovo' };
                const qui = improntaProgetto(formaSalvataProgetto(presente), state, await impronteImmaginiQui(presente));
                const tappe = (p) => ((p && p.passaggi && Array.isArray(p.passaggi.impronte)) ? p.passaggi.impronte : []).map(x => x && x.impronta).filter(Boolean);
                const tappePacchetto = tappe(lettura.progetto), tappeQui = tappe(presente);
                const modQui = presente.modificatoIl || null, modPacchetto = lettura.progetto.modificatoIl || null;
                let relazione;
                if (qui === lettura.impronta) relazione = 'identico';
                else if (tappePacchetto.includes(qui)) relazione = 'pacchetto-piu-recente';
                else if (tappeQui.includes(lettura.impronta)) relazione = 'presente-piu-recente';
                else if (tappePacchetto.some(h => tappeQui.includes(h))) relazione = 'divergenti';
                else if (modQui && modPacchetto) relazione = Date.parse(modPacchetto) > Date.parse(modQui) ? 'pacchetto-piu-recente-per-data' : 'presente-piu-recente';
                else if (modPacchetto && !modQui) relazione = 'pacchetto-piu-recente-per-data';
                else relazione = 'sconosciuta';
                const consigliata = (relazione === 'pacchetto-piu-recente' || relazione === 'pacchetto-piu-recente-per-data') ? 'sostituisci' : 'entrambi';
                return { presente: true, relazione, consigliata, avviso: consigliata === 'entrambi' && relazione !== 'identico', modQui, modPacchetto, improntaQui: qui, nomeQui: presente.name || presente.comune || 'Progetto' };
            }

            // ---------- Importa ----------

            /** Il nome della copia per «Tieni entrambi»: «Scuola Via Roma (Telefono 26/09)». */
            function nomeCopiaDaPacchetto(lettura) {
                const d = new Date(lettura.manifest.esportatoIl || Date.now());
                const due = (n) => String(n).padStart(2, '0');
                const base = lettura.progetto.name || lettura.progetto.comune || 'Progetto';
                return `${base} (${lettura.manifest.dispositivo || 'altro dispositivo'} ${isNaN(d.getTime()) ? '' : due(d.getDate()) + '/' + due(d.getMonth() + 1)})`.replace(' )', ')');
            }

            /** Scrive il pacchetto su questo dispositivo. scelta: 'sostituisci' | 'entrambi' | 'nuovo'.
             * L'ordine è quello che non perde niente: copia automatica (se si sostituisce), immagini
             * scritte e verificate, librerie, progetto, salvataggio. Se una scrittura di immagini
             * fallisce, il progetto NON entra (le immagini già scritte restano orfane e innocue).
             * Ritorna { projId, nome, immagini: { scritte, uguali, rinominate }, librerie }. */
            async function applicaPacchetto(lettura, scelta) {
                if (!lettura || !lettura.ok) throw new Error('pacchetto non verificato');
                if (caricamentoDati.bloccato) throw new Error('i dati di questo dispositivo non sono stati letti: prima va risolto l\'avviso sui dati.');
                const idFile = lettura.progetto.id;
                const esiste = !!(state.projects && state.projects[idFile]);
                if (scelta === 'nuovo' && esiste) scelta = 'entrambi';
                if (scelta === 'sostituisci' && !esiste) scelta = 'nuovo';
                saveState();

                if (scelta === 'sostituisci') {
                    // La copia PRIMA di sostituire, e aspettata: senza, niente sostituzione.
                    const testo = localStorage.getItem('dpsh_app_state');
                    let alSicuro = false;
                    try {
                        await Promise.resolve(copieAutomatiche.caricamento).catch(() => {});
                        const scritta = await scriviCopiaAutomatica('prima', `prima di ricevere «${lettura.manifest.progetto && lettura.manifest.progetto.nome || idFile}» da ${lettura.manifest.dispositivo || 'un altro dispositivo'}`, testo);
                        alSicuro = !!scritta || copieAutomatiche.ultimaFirma === firmaTesto(testo);
                    } catch (e) { ignoraErrore('applicaPacchetto', e); }
                    if (!alSicuro) throw new Error('non sono riuscito a fare la copia automatica del progetto di qui, quindi non l\'ho sostituito. Puoi scegliere «Tieni entrambi».');
                }

                const progetto = JSON.parse(JSON.stringify(lettura.progetto));
                const progetti = { [idFile]: progetto };

                // Le immagini: uguali a quelle già qui (stesso id, stessi byte) non si riscrivono; con lo
                // stesso id ma byte diversi (per esempio ritagliata di qua e non di là) quelle di qui
                // restano, e quelle in arrivo prendono un id nuovo.
                const perBase = new Map();
                lettura.immagini.forEach(im => {
                    const base = im.id.endsWith(SUFFISSO_INTERA) ? im.id.slice(0, -SUFFISSO_INTERA.length) : im.id;
                    const chiave = im.archivio + '|' + base;
                    if (!perBase.has(chiave)) perBase.set(chiave, { archivio: im.archivio, base, voci: [] });
                    perBase.get(chiave).voci.push(im);
                });
                const daScrivere = [];
                const rinomina = { photos: new Map(), noteImages: new Map() };
                let uguali = 0;
                for (const gruppo of perBase.values()) {
                    let conflitto = false;
                    const scrivereQui = [];
                    for (const im of gruppo.voci) {
                        const esistente = await leggiImmagineArchiviata(im.archivio, im.id, null);
                        if (!esistente) { scrivereQui.push(im); continue; }
                        if (await sha256Async(byteDaDataUrl(esistente)) === im.sha256) { uguali++; continue; }
                        conflitto = true;
                    }
                    if (conflitto) {
                        const nuovaBase = `${gruppo.base}_r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
                        rinomina[gruppo.archivio].set(gruppo.base, nuovaBase);
                        gruppo.voci.forEach(im => daScrivere.push(Object.assign({}, im, { idQui: nuovaBase + im.id.slice(gruppo.base.length) })));
                    } else {
                        scrivereQui.forEach(im => daScrivere.push(Object.assign({}, im, { idQui: im.id })));
                    }
                }
                Object.values(progetto.surveys || {}).forEach(s => (s.photos || []).forEach(p => { if (p && rinomina.photos.has(p.id)) p.id = rinomina.photos.get(p.id); }));
                if (progetto.notes && rinomina.noteImages.size) ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    if (typeof progetto.notes[campo] === 'string') progetto.notes[campo] = progetto.notes[campo].replace(/data-note-img-id="([^"]+)"/g, (t, id) => rinomina.noteImages.has(id) ? `data-note-img-id="${rinomina.noteImages.get(id)}"` : t);
                });

                const fallite = [];
                for (const im of daScrivere) {
                    const dataUrl = dataUrlDaByte(im.byte, im.prefisso || 'data:application/octet-stream;base64');
                    let ok = false;
                    if (im.archivio === 'photos') {
                        ok = await salvaFotoConGaranzia(im.idQui, dataUrl);
                    } else {
                        try {
                            await saveNoteImageToIDB(im.idQui, dataUrl);
                            const riletta = await getNoteImageFromIDB(im.idQui);
                            ok = riletta === dataUrl;
                            if (ok) noteImageMemoryCache[im.idQui] = dataUrl;
                        } catch (e) { ok = false; }
                    }
                    if (!ok) fallite.push(im.idQui);
                    await respiraUnAttimo();
                }
                if (fallite.length) throw new Error(`${fallite.length === 1 ? 'un\'immagine non è stata scritta' : fallite.length + ' immagini non sono state scritte'} su questo dispositivo (spazio esaurito?): il progetto non è stato importato. Libera spazio da Menu ☰ → Spazio occupato e riprova.`);

                // Template e voci d'archivio (044a): identici si riusano, diversi entrano come copia.
                const esitoLibrerie = accogliLibrerie(lettura.librerie, progetti, { etichetta: 'da ' + (lettura.manifest.dispositivo || 'altro dispositivo') });

                let targetId = idFile;
                if (scelta === 'entrambi') {
                    targetId = `PROJ_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                    progetto.id = targetId;
                    progetto.name = nomeCopiaDaPacchetto(lettura);
                    rinnovaIdProve(progetto);
                }
                // Correzioni banali sui dati in arrivo (004c), registrate.
                const integrita = verificaIntegrita({ projects: { [targetId]: progetto } }, { correggi: true });
                registraCorrezioni(state, integrita.correzioni, 'import');

                if (!state.projects) state.projects = {};
                state.projects[targetId] = progetto;
                // Il progetto arriva con la sua data: entrare qui non è una modifica (004e).
                accettaContenutoProgetto(targetId);
                if (scelta === 'sostituisci') riallineaProgettoAperto([targetId]);

                // Le correzioni registrate per questo progetto sull'altro dispositivo.
                const registro = Array.isArray(state.registroCorrezioni) ? state.registroCorrezioni : [];
                const giaQui = new Set(registro.map(c => [c.quando, c.tipo, c.cosa].join('|')));
                lettura.registro.forEach(c => {
                    if (!c || giaQui.has([c.quando, c.tipo, c.cosa].join('|'))) return;
                    registro.push(Object.assign({}, c, { projId: targetId }));
                });
                registro.sort((a, b) => String(a.quando || '').localeCompare(String(b.quando || '')));
                state.registroCorrezioni = registro.slice(-200);

                saveState();
                return {
                    projId: targetId, nome: progetto.name || progetto.comune || 'Progetto', scelta,
                    immagini: { scritte: daScrivere.length, uguali, rinominate: rinomina.photos.size + rinomina.noteImages.size },
                    librerie: esitoLibrerie
                };
            }
