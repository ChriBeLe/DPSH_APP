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
                const projectsToImport = migraProgettiImportati(normalizeImportedJsonToProjects(parsed), versioneFile);
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
                return { importedCount, renamedCount, restoredPhotos, fotoAssenti, anomalie: integrita.anomalie, librerie };
            }

            /** Rimanda in IndexedDB (e nella cache RAM) le foto e le immagini delle note che un
             * progetto importato porta con sé, raccogliendo le scritture in `promesseFoto`.
             * Solo le immagini VERE (dataUrl che comincia con «data:»): i backup JSON fatti fino alla
             * Fase 1 contenevano, al posto delle foto, un segnaposto rimasto lì per errore (vedi
             * segnapostoFoto). Scriverlo in IndexedDB avrebbe sostituito con un testo senza senso la
             * foto vera con lo stesso id, se c'era sul telefono. Quel segnaposto si toglie e si conta:
             * chi importa deve sapere che nel file quelle foto non ci sono.
             * Ritorna { ripristinate, assenti }. */
            function salvaImmaginiImportate(incoming, promesseFoto) {
                let ripristinate = 0, assenti = 0;
                Object.values((incoming && incoming.surveys) || {}).forEach(surv => {
                    (surv && surv.photos || []).forEach(p => {
                        if (!p || !p.id) return;
                        if (typeof p.dataUrl === 'string' && p.dataUrl.indexOf('data:') === 0) {
                            photoMemoryCache[p.id] = p.dataUrl;
                            promesseFoto.push(
                                salvaFotoConGaranzia(p.id, p.dataUrl)
                                    .then(ok => ok ? null : { id: p.id, dataUrl: p.dataUrl, nome: p.name || `Foto_${p.id}` })
                                    .catch(() => ({ id: p.id, dataUrl: p.dataUrl, nome: p.name || `Foto_${p.id}` }))
                            );
                            ripristinate++;
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
                // le sue immagini non viaggiavano.
                ['html', 'htmlPrimaDelMotore'].forEach(campo => {
                    const html = incoming && incoming.notes && incoming.notes[campo];
                    if (!html || html.indexOf('data-note-img-id') === -1) return;
                    try {
                        const doc = new DOMParser().parseFromString(html, 'text/html');
                        doc.querySelectorAll('img[data-note-img-id]').forEach(img => {
                            const id = img.getAttribute('data-note-img-id');
                            const src = img.getAttribute('src');
                            if (id && src && src.indexOf('data:') === 0) {
                                try { saveNoteImageToIDB(id, src); } catch (idbErr) { ignoraErrore('salvaImmaginiImportate', idbErr); }
                                noteImageMemoryCache[id] = src;
                                ripristinate++;
                            }
                        });
                    } catch (e) { ignoraErrore('salvaImmaginiImportate', e); }
                });
                return { ripristinate, assenti };
            }

            /** Controllo dell'esito di TUTTE le scritture delle foto importate, senza bloccare il
             * ritorno: l'import è già completo dal punto di vista dei dati, questo riguarda solo le
             * immagini. Se qualcuna non è stata scritta l'utente lo scopre subito dopo, con la
             * possibilità di salvarle nei Download finché sono ancora in memoria. */
            function controllaFotoImportate(promesseFoto) {
                if (promesseFoto.length === 0) return;
                Promise.all(promesseFoto).then(esiti => {
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
                    const { importedCount, renamedCount, fotoAssenti, anomalie, librerie } = isZip
                        ? await importProjectsFromZip(file)
                        : importProjectsFromJSON(JSON.parse(await file.text()));

                    // Successo pulito: toast. Con copie rinominate, foto assenti, librerie accolte o
                    // anomalie c'è qualcosa da leggere: resta il dialogo con tutto il testo.
                    let extra = '';
                    if (renamedCount > 0) {
                        extra += `${renamedCount} progett${renamedCount === 1 ? 'o aveva' : 'i avevano'} lo stesso ID di uno già in archivio: ${renamedCount === 1 ? 'è stato salvato' : 'sono stati salvati'} come copia separata, con "(Importato)" nel nome.`;
                    }
                    extra += testoFotoAssentiNelFile(fotoAssenti) + testoLibrerieAccolte(librerie) + testoAnomalieImportate(anomalie);
                    toastODialogo(`Importazione completata: ${importedCount} progett${importedCount === 1 ? 'o' : 'i'} importat${importedCount === 1 ? 'o' : 'i'}`, extra);
                    triggerVibrate([40, 60, 40]);

                    if (typeof renderHomeProjects === 'function') renderHomeProjects();
                    if (typeof switchView === 'function') switchView('home');
                } catch (e) {
                    console.error('Import JSON/ZIP error:', e);
                    alert('⚠️ Errore durante l\'importazione del file:\n\n' + e.message);
                } finally {
                    if (fileImportProjectJson) fileImportProjectJson.value = '';
                }
            }

            if (btnOptExportExcel) {
                btnOptExportExcel.addEventListener('click', () => {
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectExcel(exportModalContext.id);
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
                    if (projId) exportProjectCompleteReportWord(projId);
                });
            }

            if (btnOptExportKML) {
                btnOptExportKML.addEventListener('click', () => {
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectKML(exportModalContext.id);
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
                    closeExportModal();
                    if (exportModalContext.type === 'project') {
                        exportProjectPhotos(exportModalContext.id);
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

