            // ===================== FASE 1: IMPORTAZIONE PROGETTI DA FILE JSON =====================

            // Riconosce il formato del JSON incollato (backup completo con più progetti, singolo
            // progetto esportato dall'archivio, o vecchia prova "nuda" senza wrapper progetto) e lo
            // normalizza in un dizionario { idProgetto: oggettoProgetto } pronto per essere unito
            // a state.projects.
            function normalizeImportedJsonToProjects(parsed) {
                if (!parsed || typeof parsed !== 'object') {
                    throw new Error('Il file non contiene un JSON valido.');
                }

                // Formato "Backup Completo" (esportato con Prova Singola -> JSON): contiene l'intero
                // state, con dentro tutti i progetti dell'archivio.
                if (parsed.projects && typeof parsed.projects === 'object' && Object.keys(parsed.projects).length > 0) {
                    return parsed.projects;
                }

                // Formato "Progetto Singolo" (esportato dall'archivio Home -> Esporta Progetto -> JSON):
                // l'oggetto radice E' direttamente il progetto, riconoscibile dalla presenza di "surveys".
                if (parsed.surveys && typeof parsed.surveys === 'object') {
                    const projId = parsed.id || `PROJ_IMPORT_${Date.now()}`;
                    return { [projId]: parsed };
                }

                // Formato legacy: singola prova "nuda", senza alcun wrapper progetto/surveys.
                if (parsed.header && parsed.logs) {
                    const comune = parsed.header.comune || 'Cantiere Importato';
                    const projId = `PROJ_IMPORT_${Date.now()}`;
                    const survId = `SURV_IMPORT_${Date.now()}`;
                    return {
                        [projId]: {
                            id: projId,
                            name: comune,
                            comune: comune,
                            committente: parsed.header.committente || '',
                            localita: parsed.header.localita || '',
                            operator: (parsed.settings && parsed.settings.operator) || '',
                            date: parsed.header.date || new Date().toISOString().split('T')[0],
                            updatedAt: Date.now(),
                            strati: parsed.strati || [],
                            surveys: {
                                [survId]: {
                                    id: survId,
                                    header: parsed.header,
                                    instrument: parsed.instrument || {},
                                    settings: parsed.settings || {},
                                    currentCount: parsed.currentCount || 0,
                                    currentDepthStart: parsed.currentDepthStart || 0,
                                    currentRod: parsed.currentRod || 1,
                                    logs: parsed.logs || [],
                                    photos: parsed.photos || []
                                }
                            }
                        }
                    };
                }

                throw new Error('Formato non riconosciuto. Seleziona un file JSON esportato da questa app (Progetto o Backup Completo).');
            }

            /** Controllo di forma sui dati che arrivano da un file, PRIMA di qualunque uso: gli id di
             * progetto, prova e foto, e i colori degli strati finiscono in chiavi di state.projects e in
             * attributi HTML/style (`data-id="…"`, `style="…${color}"`), quindi un valore come
             * `x"><img src=x onerror=…>` o `__proto__` non deve entrare. Modifica `progetti` sul posto.
             * - id di progetto o di prova non valido: ne nasce uno nuovo (idSicuroOppureNuovo) e si
             *   aggiornano i riferimenti dentro lo stesso file (id del progetto, id della prova,
             *   header.interpretazioneDi, usi[] delle librerie);
             * - foto con id non valido: scartata (i suoi riferimenti non sono tracciabili in modo sicuro);
             * - dataUrl di una foto che non è un'immagine base64: tolto (la foto resta senza immagine);
             * - colore non valido: colore di ripiego neutro (coloreSicuro).
             * Ritorna { fotoScartate, immaginiScartate, idRinnovati }, per dirlo a chi importa. */
            function rendiSicuriDatiImportati(progetti, librerieFile) {
                const esito = { fotoScartate: 0, immaginiScartate: 0, idRinnovati: 0 };
                const usi = librerieFile && librerieFile.usi && typeof librerieFile.usi === 'object' ? librerieFile.usi : null;
                const coloraStrati = (lista) => {
                    if (!Array.isArray(lista)) return;
                    lista.forEach(st => { if (st && typeof st === 'object' && st.color !== undefined) st.color = coloreSicuro(st.color); });
                };
                Object.keys(progetti).forEach(chiaveFile => {
                    const proj = progetti[chiaveFile];
                    if (!proj || typeof proj !== 'object') { delete progetti[chiaveFile]; return; }
                    let chiave = chiaveFile;
                    if (!idSicuro(chiaveFile)) {
                        // Non c'è un id da cui partire: uno nuovo, unico anche fra più progetti dello stesso file.
                        chiave = idSicuroOppureNuovo(null, 'PROJ_IMPORT');
                        delete progetti[chiaveFile];
                        progetti[chiave] = proj;
                        if (usi && Object.prototype.hasOwnProperty.call(usi, chiaveFile)) { usi[chiave] = usi[chiaveFile]; delete usi[chiaveFile]; }
                        esito.idRinnovati++;
                    }
                    if (proj.id !== undefined && !idSicuro(proj.id)) { proj.id = chiave; esito.idRinnovati++; }
                    const prove = proj.surveys && typeof proj.surveys === 'object' ? proj.surveys : {};
                    const mappaProve = {};
                    Object.keys(prove).forEach(sid => {
                        const surv = prove[sid];
                        if (!surv || typeof surv !== 'object') return;
                        const nuovo = idSicuro(sid) ? sid : idSicuroOppureNuovo(null, 'SURV_IMPORT');
                        if (nuovo !== sid) { mappaProve[sid] = nuovo; delete prove[sid]; prove[nuovo] = surv; esito.idRinnovati++; }
                        // L'id scritto nella prova segue la chiave se non è valido (o se la chiave è cambiata).
                        if (surv.id !== undefined && (!idSicuro(surv.id) || surv.id === sid)) surv.id = nuovo;
                    });
                    Object.values(prove).forEach(surv => {
                        if (!surv || typeof surv !== 'object') return;
                        if (surv.header && typeof surv.header === 'object' && typeof surv.header.interpretazioneDi === 'string' && mappaProve[surv.header.interpretazioneDi]) surv.header.interpretazioneDi = mappaProve[surv.header.interpretazioneDi];
                        coloraStrati(surv.strati);
                        if (Array.isArray(surv.photos)) {
                            surv.photos = surv.photos.filter(ph => {
                                if (ph && typeof ph === 'object' && ph.id !== undefined && !idSicuro(ph.id)) { esito.fotoScartate++; return false; }
                                return true;
                            });
                            surv.photos.forEach(ph => {
                                if (ph && typeof ph.dataUrl === 'string' && ph.dataUrl.indexOf('data:') === 0 && !dataUrlImmagineSicuro(ph.dataUrl)) { delete ph.dataUrl; esito.immaginiScartate++; }
                            });
                        }
                    });
                    if (usi && usi[chiave] && usi[chiave].prove && typeof usi[chiave].prove === 'object') {
                        Object.keys(mappaProve).forEach(v => { if (v in usi[chiave].prove) { usi[chiave].prove[mappaProve[v]] = usi[chiave].prove[v]; delete usi[chiave].prove[v]; } });
                    }
                    coloraStrati(proj.strati);
                });
                // L'archivio litologico che viaggia nel file: colori ammessi, e un id d'archivio non valido
                // diventa un id nuovo anche negli strati che puntano alla voce (sourceArchiveId).
                const arch = librerieFile && librerieFile.lithologyArchive;
                if (arch && typeof arch === 'object') {
                    const mappaArch = {};
                    Object.keys(arch).forEach(aid => {
                        if (!arch[aid] || typeof arch[aid] !== 'object') { delete arch[aid]; return; }
                        rendiSicuraVoceArchivio(arch[aid]);
                        if (!idSicuro(aid)) {
                            const nuovo = idSicuroOppureNuovo(null, 'arch');
                            mappaArch[aid] = nuovo;
                            arch[nuovo] = arch[aid]; delete arch[aid];
                            arch[nuovo].id = nuovo;
                            esito.idRinnovati++;
                        } else if (arch[aid].id !== undefined && !idSicuro(arch[aid].id)) arch[aid].id = aid;
                    });
                    if (Object.keys(mappaArch).length) Object.values(progetti).forEach(proj => {
                        const liste = [proj && proj.strati].concat(Object.values((proj && proj.surveys) || {}).map(sv => sv && sv.strati));
                        liste.forEach(l => (Array.isArray(l) ? l : []).forEach(st => { if (st && typeof st.sourceArchiveId === 'string' && mappaArch[st.sourceArchiveId]) st.sourceArchiveId = mappaArch[st.sourceArchiveId]; }));
                    });
                }
                return esito;
            }

            // Unisce i progetti importati nell'archivio corrente. In caso di ID già esistente (stesso
            // progetto importato due volte, o file rinominato) crea una copia separata invece di
            // sovrascrivere silenziosamente i dati già presenti.
            function importProjectsFromJSON(parsed) {
                if (!state.projects) state.projects = {};
                // Versione dei dati PRIMA di tutto: un file di un'app più nuova si rifiuta qui, prima
                // che una sola foto o un solo progetto venga scritto (vedi 004b).
                const versioneFile = versioneFileImportato(parsed);
                controllaVersioneFileImportato(versioneFile);
                // Le librerie del file (template, archivio litologico: Fase 2) si tolgono dal contenuto
                // prima di riconoscere il formato: un progetto esportato da solo le porta in `librerie`.
                const librerieFile = estraiLibrerieDalFile(parsed);
                const progettiDelFile = normalizeImportedJsonToProjects(parsed);
                const scartati = rendiSicuriDatiImportati(progettiDelFile, librerieFile);
                const projectsToImport = migraProgettiImportati(progettiDelFile, versioneFile);
                // Controllo di integrità su ciò che arriva (004c): correzioni banali registrate,
                // anomalie restituite a chi importa perché le dica all'utente. Non blocca l'import.
                const integrita = verificaIntegrita({ projects: projectsToImport }, { correggi: true });
                registraCorrezioni(state, integrita.correzioni, 'import');
                // Template e voci d'archivio: quelli identici si riusano, quelli diversi entrano come
                // copia e i progetti puntano alla copia; niente del dispositivo viene sovrascritto.
                // Prima di rinominare i progetti: le librerie sanno i progetti per id del file.
                const librerie = librerieFile
                    ? accogliLibrerie(librerieFile, projectsToImport, { tutte: !!librerieFile.tutte, etichetta: 'importato' })
                    : null;

                let importedCount = 0;
                let renamedCount = 0;
                let restoredPhotos = 0;
                let fotoAssenti = 0;
                // Le scritture delle foto vengono raccolte qui invece di essere lanciate e
                // dimenticate. Questa funzione resta SINCRONA di proposito (ha diversi chiamanti,
                // renderla async propagherebbe il cambiamento a catena senza necessità): si
                // accumulano le promise e si controlla l'esito di tutte alla fine, avvisando una
                // volta sola. Prima ogni scrittura era `try { savePhotoToIDB(...) } catch {}` senza
                // await — un try/catch sincrono che non può intercettare una funzione asincrona,
                // quindi un'importazione poteva restituire "42 foto ripristinate" con metà delle
                // foto in realtà mai scritte.
                const promesseFoto = [];

                Object.keys(projectsToImport).forEach(origId => {
                    const incoming = JSON.parse(JSON.stringify(projectsToImport[origId]));
                    let targetId = incoming.id || origId;

                    if (state.projects[targetId]) {
                        targetId = `PROJ_IMPORT_${Date.now()}_${importedCount}`;
                        incoming.id = targetId;
                        incoming.name = (incoming.name || incoming.comune || 'Progetto') + ' (Importato)';
                        // Anche le prove della copia prendono id nuovi, come nel Duplica: due progetti
                        // non devono condividere l'id di una prova (le foto invece sì, apposta).
                        rinnovaIdProve(incoming);
                        renamedCount++;
                    }

                    const esitoImmagini = salvaImmaginiImportate(incoming, promesseFoto);
                    restoredPhotos += esitoImmagini.ripristinate;
                    fotoAssenti += esitoImmagini.assenti;

                    state.projects[targetId] = incoming;
                    importedCount++;
                });

                saveState();
                controllaFotoImportate(promesseFoto);
                return { importedCount, renamedCount, restoredPhotos, fotoAssenti, anomalie: integrita.anomalie, librerie, scartati };
            }

            /** Rimanda in IndexedDB (e nella cache RAM) le foto e le immagini delle note che un
             * progetto importato porta con sé, raccogliendo le scritture in `promesseFoto`.
             * Solo le immagini VERE (dataUrl che comincia con «data:»): i backup JSON fatti fino alla
             * Fase 1 contenevano, al posto delle foto, un segnaposto rimasto lì per errore (vedi
             * segnapostoFoto). Scriverlo in IndexedDB avrebbe sostituito con un testo senza senso la
             * foto vera con lo stesso id, se c'era sul telefono. Quel segnaposto si toglie e si conta:
             * chi importa deve sapere che nel file quelle foto non ci sono.
             *
             * Niente di ciò che c'è già su questo dispositivo viene sovrascritto (stessa regola del
             * pacchetto di progetto, 044b): con lo stesso id e gli stessi byte non si scrive nulla; con lo
             * stesso id e byte diversi (per esempio una foto ritagliata dopo il backup) quella di qui resta
             * e quella in arrivo prende un id nuovo, aggiornato nel progetto importato. Il controllo legge
             * IndexedDB, quindi è asincrono: il progetto entra subito con gli id del file e gli id che
             * cambiano si correggono a scrittura finita (controllaFotoImportate salva di nuovo).
             * Ritorna { ripristinate, assenti, conclusione }: `ripristinate` sono le immagini da
             * scrivere, `conclusione` è una promessa con { ripristinate, fallite } a cose fatte, dove
             * contano solo quelle riuscite davvero. */
            function salvaImmaginiImportate(incoming, promesseFoto) {
                let daScrivere = 0, assenti = 0;
                const proprie = [];
                const lancia = (archivio, id, dataUrl, nome, cambiaId) => {
                    // Una alla volta, in coda: due immagini con lo stesso id nello stesso file non devono
                    // controllare «c'è già?» nello stesso istante e scriversi addosso.
                    const coda = promesseFoto._coda || Promise.resolve();
                    const p = coda.then(() => scriviImmagineImportataSenzaSovrascrivere(archivio, id, dataUrl, nome, (nuovoId) => {
                        cambiaId(nuovoId);
                        promesseFoto.rinominate = (promesseFoto.rinominate || 0) + 1;
                    }));
                    promesseFoto._coda = p.catch(() => {});
                    promesseFoto.push(p);
                    proprie.push(p);
                    daScrivere++;
                };
                Object.values((incoming && incoming.surveys) || {}).forEach(surv => {
                    (surv && surv.photos || []).forEach(p => {
                        if (!p || !p.id) return;
                        if (typeof p.dataUrl === 'string' && p.dataUrl.indexOf('data:') === 0) {
                            lancia('photos', p.id, p.dataUrl, p.name || `Foto_${p.id}`, (nuovoId) => { p.id = nuovoId; });
                        } else if (p.dataUrl !== undefined) {
                            delete p.dataUrl;
                            assenti++;
                        }
                    });
                });

                // Stesso ripristino per le immagini incorporate nella Nota di progetto: il JSON
                // le contiene già come dataUrl (rehydrateProjectPhotosForExport le reincorpora
                // in esportazione), quindi basta rimandarle su IndexedDB con lo stesso id.
                // Anche la nota com'era prima del nuovo motore (htmlPrimaDelMotore): fino alla Fase 1
                // le sue immagini non viaggiavano. La stessa immagine citata da entrambe le copie si
                // scrive una volta sola.
                const notaImmagini = new Map();
                ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    const html = incoming && incoming.notes && incoming.notes[campo];
                    if (typeof html !== 'string' || html.indexOf('data-note-img-id') === -1) return;
                    try {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        doc.querySelectorAll('img[data-note-img-id]').forEach(img => {
                            const id = img.getAttribute('data-note-img-id');
                            const src = img.getAttribute('src');
                            if (id && src && src.indexOf('data:') === 0 && !notaImmagini.has(id)) notaImmagini.set(id, src);
                        });
                    } catch (e) { ignoraErrore('salvaImmaginiImportate', e); }
                });
                notaImmagini.forEach((src, id) => {
                    lancia('noteImages', id, src, `Immagine_nota_${id}`, (nuovoId) => {
                        ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                            const h = incoming.notes[campo];
                            if (typeof h === 'string') incoming.notes[campo] = h.split(`data-note-img-id="${id}"`).join(`data-note-img-id="${nuovoId}"`);
                        });
                    });
                });
                const conclusione = Promise.all(proprie).then(esiti => {
                    const fallite = esiti.filter(Boolean);
                    return { ripristinate: esiti.length - fallite.length, fallite };
                });
                return { ripristinate: daScrivere, assenti, conclusione };
            }

            /** Scrive UNA immagine importata (archivio 'photos' o 'noteImages') senza toccare quella che
             * ha già lo stesso id su questo dispositivo con byte diversi: in quel caso scrive la nuova
             * sotto un id nuovo e chiama cambiaId(nuovoId) perché il progetto importato punti lì.
             * Ritorna null se l'immagine è al sicuro, altrimenti { id, dataUrl, nome } (il formato che
             * avvisaFotoNonSalvate sa mostrare). Non lancia mai. */
            async function scriviImmagineImportataSenzaSovrascrivere(archivio, id, dataUrl, nome, cambiaId) {
                const fallita = (idQui) => ({ id: idQui, dataUrl, nome });
                const eFoto = archivio === 'photos';
                try {
                    const valida = (v) => typeof v === 'string' && v.indexOf('data:') === 0 && v.indexOf(',') > 0;
                    const inMemoria = (eFoto ? photoMemoryCache : noteImageMemoryCache)[id];
                    const suDisco = eFoto ? await getPhotoFromIDB(id) : await getNoteImageFromIDB(id);
                    const uguale = async (altra) => {
                        if (altra === dataUrl) return true;
                        try { return await sha256Async(byteDaDataUrl(altra)) === await sha256Async(byteDaDataUrl(dataUrl)); } catch (e) { return false; }
                    };
                    let diversa = false;
                    for (const altra of [suDisco, inMemoria]) {
                        if (valida(altra) && !(await uguale(altra))) { diversa = true; break; }
                    }
                    if (!diversa && valida(suDisco)) return null; // già qui, stessi byte: niente da scrivere
                    let idQui = id;
                    if (diversa) {
                        // Stesso schema del pacchetto (044b): la foto di qui resta, quella in arrivo diventa «_r…».
                        idQui = `${id}_r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
                    }
                    let ok;
                    if (eFoto) {
                        ok = await salvaFotoConGaranzia(idQui, dataUrl);
                    } else {
                        ok = (await saveNoteImageToIDB(idQui, dataUrl)) === true && (await getNoteImageFromIDB(idQui)) === dataUrl;
                        if (ok) noteImageMemoryCache[idQui] = dataUrl;
                    }
                    if (!ok) return fallita(idQui);
                    if (idQui !== id) cambiaId(idQui);
                    return null;
                } catch (e) {
                    ignoraErrore('scriviImmagineImportataSenzaSovrascrivere', e);
                    return fallita(id);
                }
            }

            /** Controllo dell'esito di TUTTE le scritture delle foto importate, senza bloccare il
             * ritorno: l'import è già completo dal punto di vista dei dati, questo riguarda solo le
             * immagini. Se qualcuna non è stata scritta l'utente lo scopre subito dopo, con la
             * possibilità di salvarle nei Download finché sono ancora in memoria. */
            function controllaFotoImportate(promesseFoto) {
                if (promesseFoto.length === 0) return;
                Promise.all(promesseFoto).then(esiti => {
                    // Foto con lo stesso id ma byte diversi da quelle di qui: nel progetto importato l'id è
                    // cambiato a scrittura finita, quindi si salva di nuovo.
                    if (promesseFoto.rinominate) { saveState(); if (typeof renderHomeProjects === 'function') renderHomeProjects(); }
                    const fallite = esiti.filter(Boolean);
                    if (fallite.length > 0) avvisaFotoNonSalvate(fallite);
                }).catch(e => console.warn('Controllo foto importate fallito:', e));
            }

            /** Righe da aggiungere al messaggio di fine import quando i dati arrivati hanno anomalie
             * (vedi verificaIntegrita): si importano lo stesso, così come sono, ma si dice cosa non torna. */
            function testoAnomalieImportate(anomalie) {
                const vere = (anomalie || []).filter(a => !a.banale);
                if (vere.length === 0) return '';
                return `\n\nNei dati importati ${vere.length === 1 ? 'c\'è un\'anomalia' : 'ci sono ' + vere.length + ' anomalie'}, lasciate come sono:\n${elencoAnomalie(vere, 6)}`;
            }

            /** Riga da aggiungere al messaggio di fine import quando nel file mancavano delle foto. */
            function testoFotoAssentiNelFile(n) {
                if (!n) return '';
                return `\n\n${n === 1 ? '1 foto citata nel file non c\'era dentro' : n + ' foto citate nel file non c\'erano dentro'}: i backup JSON fatti con le versioni dell'app fino al 26/09/2026 non contenevano le foto (gli ZIP sì). Se il file viene da questo telefono, le foto con lo stesso nome restano quelle già salvate qui.`;
            }

            // Gestisce il file scelto dall'utente tramite l'input nascosto in Home
            async function handleImportJsonFile(file) {
                if (!file) return;
                try {
                    const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip';
                    // Un pacchetto di progetto (Fase 2) ha la sua finestra, con verifica e anteprima
                    // prima di scrivere: «Ricevi un progetto» (044c). JSON e ZIP di prima restano qui.
                    if (isZip) {
                        const voci = await readZipStoreOnly(file);
                        if (vociSonoUnPacchetto(voci)) { await apriRiceviProgetto(file, voci); return; }
                    }
                    const { importedCount, renamedCount, fotoAssenti, anomalie, librerie, scartati } = isZip
                        ? await importProjectsFromZip(file)
                        : importProjectsFromJSON(JSON.parse(await file.text()));

                    // Successo pulito: toast. Con copie rinominate, foto assenti, librerie accolte o
                    // anomalie c'è qualcosa da leggere: resta il dialogo con tutto il testo.
                    let extra = '';
                    if (renamedCount > 0) {
                        extra += `${renamedCount} progett${renamedCount === 1 ? 'o aveva' : 'i avevano'} lo stesso ID di uno già in archivio: ${renamedCount === 1 ? 'è stato salvato' : 'sono stati salvati'} come copia separata, con "(Importato)" nel nome.`;
                    }
                    if (scartati && (scartati.fotoScartate || scartati.immaginiScartate)) {
                        extra += `\n\nPer sicurezza ${scartati.fotoScartate ? scartati.fotoScartate + ' foto con un id non valido non ' + (scartati.fotoScartate === 1 ? 'è stata importata' : 'sono state importate') : ''}${scartati.fotoScartate && scartati.immaginiScartate ? '; ' : ''}${scartati.immaginiScartate ? scartati.immaginiScartate + ' immagini che non erano nel formato atteso sono state tolte' : ''}.`;
                    }
                    extra += testoFotoAssentiNelFile(fotoAssenti) + testoLibrerieAccolte(librerie) + testoAnomalieImportate(anomalie);
                    toastODialogo(`Importazione completata: ${importedCount} progett${importedCount === 1 ? 'o' : 'i'} importat${importedCount === 1 ? 'o' : 'i'}`, extra);
                    triggerVibrate([40, 60, 40]);

                    if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    if (typeof switchView === 'function') switchView('home');
                } catch (e) {
                    console.error('Import JSON/ZIP error:', e);
                    alert('Errore durante l\'importazione del file:\n\n' + e.message);
                } finally {
                    if (fileImportProjectJson) fileImportProjectJson.value = '';
                }
            }

            if (btnOptExportExcel) {
                btnOptExportExcel.addEventListener('click', () => {
                    if (exportModalContext.soloProve && !exportModalContext.soloProve.size) return;
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectExcel(exportModalContext.id, exportModalContext.soloProve);
                    } else {
                        // NOTA: la logica di export Excel della singola prova vive nel listener del
                        // bottone (ora nascosto) btnExportExcel; qui lo si attiva così invece di
                        // richiamare una funzione "exportToExcel" che non esiste mai esistita
                        // (bug preesistente: prima d'ora questa opzione della modale, per una singola
                        // prova, non faceva letteralmente nulla).
                        if (btnExportExcel) btnExportExcel.click();
                    }
                });
            }

            // Unico ingresso per il Report PDF (redesign richiesto esplicitamente: la tile
            // separata "Report PDF" e questo bottone "Report Completo" finivano ormai nella
            // stessa schermata di esportazione, quindi la tile è stata rimossa e "Includi tabelle
            // Parametri Avanzati" è diventata una spunta dentro apriEsportazionePdfModal invece di
            // due bottoni distinti). Riguarda sempre un intero progetto: se la modale è aperta
            // dalla singola prova, risolviamo il progetto a cui appartiene (state.currentProjectId)
            // invece di bloccare l'utente con un errore — è comunque quello che si aspetta.
            if (btnOptExportCompletePdf) {
                btnOptExportCompletePdf.addEventListener('click', () => {
                    closeExportModal();
                    const projId = exportModalContext.type === 'project' ? exportModalContext.id : state.currentProjectId;
                    if (projId) apriEsportazionePdfModal({ type: 'project', id: projId });
                });
            }

            if (btnOptExportCompleteWord) {
                btnOptExportCompleteWord.addEventListener('click', () => {
                    closeExportModal();
                    const projId = exportModalContext.type === 'project' ? exportModalContext.id : state.currentProjectId;
                    // Il Word passa dalla stessa finestra del PDF: stesse prove, stesso indice, stessa
                    // numerazione — è lo stesso documento, salvato in un altro formato.
                    if (projId) apriEsportazionePdfModal({ type: 'project', id: projId, formato: 'word' });
                });
            }

            if (btnOptExportKML) {
                btnOptExportKML.addEventListener('click', () => {
                    if (exportModalContext.soloProve && !exportModalContext.soloProve.size) return;
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectKML(exportModalContext.id, exportModalContext.soloProve);
                    } else {
                        // Bug preesistente: chiamava "exportSingleKml", funzione mai esistita
                        // (il nome vero è exportSingleSurveyKML). Anche questa opzione, per una
                        // singola prova, non aveva mai funzionato prima d'ora.
                        if (typeof exportSingleSurveyKML === 'function') exportSingleSurveyKML();
                    }
                });
            }

            if (btnOptExportPhotos) {
                btnOptExportPhotos.addEventListener('click', () => {
                    if (exportModalContext.soloProve && !exportModalContext.soloProve.size) return;
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectPhotos(exportModalContext.id, exportModalContext.soloProve);
                    } else {
                        // Bug preesistente: chiamava "downloadPhotosAsJpg", funzione mai esistita
                        // (il nome vero è downloadAllSurveyPhotosJpg).
                        if (typeof downloadAllSurveyPhotosJpg === 'function') downloadAllSurveyPhotosJpg();
                    }
                });
            }

            if (btnOptExportJSON) {
                btnOptExportJSON.addEventListener('click', async () => {
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        await exportProjectJSON(exportModalContext.id);
                    } else {
                        await exportSingleJSON();
                    }
                });
            }

