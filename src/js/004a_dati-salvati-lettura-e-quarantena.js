            // ======================= DATI SALVATI: LETTURA E QUARANTENA (Fase 1) =======================
            // Cosa succede quando il testo salvato in localStorage non si può caricare. Prima veniva
            // ignorato in silenzio: l'app partiva vuota e il primo salvataggio (basta aprire la Home)
            // lo cancellava. Una prova da rifare, per un file rovinato che magari si recuperava a mano.
            // Adesso: il testo resta dov'è (saveState è bloccato, vedi caricamentoDati in cima allo
            // script), una copia esatta va nel database delle copie automatiche, e l'utente vede un
            // avviso con due strade semplici: scaricarlo, oppure ripartire da vuoto e reimportare.

            /** Legge il testo salvato. Non tocca lo stato dell'app: dice solo se si può caricare.
             * Ritorna { ok: true, dati, versione } oppure { ok: false, motivo, dettaglio }, con motivo
             * 'illeggibile' o 'piu-nuovo' (dati scritti da un'app più recente: non si caricano, perché
             * una versione vecchia che li riscrivesse perderebbe ciò che non conosce). */
            function leggiStatoSalvato(testo) {
                let dati;
                try {
                    dati = JSON.parse(testo);
                } catch (e) {
                    return { ok: false, motivo: 'illeggibile', dettaglio: 'il testo non è un JSON valido: ' + ((e && e.message) || e) };
                }
                if (!dati || typeof dati !== 'object' || Array.isArray(dati)) {
                    return { ok: false, motivo: 'illeggibile', dettaglio: 'il contenuto non è un archivio dell\'app' };
                }
                const versione = versioneDeiDati(dati);
                if (versione === null) {
                    return { ok: false, motivo: 'illeggibile', dettaglio: 'versione dei dati non valida: ' + JSON.stringify(dati.versioneSchema) };
                }
                if (versione > VERSIONE_SCHEMA_DATI) {
                    return { ok: false, motivo: 'piu-nuovo', versione, dettaglio: `formato dati ${versione}; questa versione legge fino al ${VERSIONE_SCHEMA_DATI}` };
                }
                return { ok: true, dati, versione };
            }

            /** I dati salvati non si caricano: si blocca il salvataggio, si mette al sicuro il testo e
             * si avvisa. `testo` può essere null (memoria non raggiungibile: non c'è niente da copiare). */
            function datiNonCaricati(motivo, testo, dettaglio) {
                caricamentoDati.esito = motivo;
                caricamentoDati.bloccato = 'dati-non-letti';
                caricamentoDati.dettaglio = dettaglio || '';
                caricamentoDati.testoGrezzo = testo;
                console.warn('Dati salvati non caricati (' + motivo + '): ' + (dettaglio || ''));
                const avvisa = () => {
                    mostraBarraSalvataggioSospeso();
                    mostraAvvisoDatiNonCaricati();
                };
                if (testo) {
                    // L'avviso aspetta la copia di sicurezza: così può dire se c'è davvero.
                    scriviQuarantena(testo, motivo).then(id => {
                        caricamentoDati.quarantena = id;
                        avvisa();
                    });
                } else {
                    setTimeout(avvisa, 0);
                }
            }

            /** Copia ESATTA del testo non caricato nel database delle copie automatiche, riletta per
             * controllo come le foto (salvaFotoConGaranzia). Va nell'archivio 'copie' ma non
             * nell'indice: la pulizia delle copie vecchie lavora solo sull'indice, quindi questa resta
             * finché non la si cancella con un Reset. Ritorna l'id della copia, o null. */
            async function scriviQuarantena(testo, motivo) {
                const id = 'QUARANTENA_' + Date.now();
                try {
                    const db = await openCopieDB();
                    try {
                        await new Promise((resolve, reject) => {
                            const tx = db.transaction('copie', 'readwrite');
                            tx.objectStore('copie').put({ id, json: testo, quarantena: true, motivo: motivo || '', quando: Date.now() });
                            tx.oncomplete = () => resolve();
                            tx.onerror = () => reject(tx.error);
                            tx.onabort = () => reject(tx.error);
                        });
                        const riletta = await new Promise((resolve) => {
                            const req = db.transaction('copie', 'readonly').objectStore('copie').get(id);
                            req.onsuccess = () => resolve(req.result || null);
                            req.onerror = () => resolve(null);
                        });
                        return (riletta && typeof riletta.json === 'string' && riletta.json.length === testo.length) ? id : null;
                    } finally { db.close(); }
                } catch (e) {
                    ignoraErrore('scriviQuarantena', e);
                    return null;
                }
            }

            function testoAvvisoDatiNonCaricati() {
                const c = caricamentoDati;
                if (c.esito === 'inaccessibile') {
                    return 'La memoria in cui l\'app salva i dati non è raggiungibile (' + c.dettaglio + ').\n\n'
                        + 'Finché non torna disponibile l\'app NON salva niente, per non scrivere sopra a quello che c\'è. '
                        + 'Chiudi l\'app e riaprila; se il problema resta, controlla che i dati dell\'app non siano bloccati.';
                }
                const alSicuro = c.quarantena
                    ? 'Una copia esatta è già al sicuro sul dispositivo, nella memoria delle copie automatiche.'
                    : 'Non è stato possibile metterne una copia al sicuro sul dispositivo: scaricali prima di fare qualsiasi altra cosa.';
                if (c.esito === 'piu-nuovo') {
                    return 'I dati su questo dispositivo sono stati salvati da una versione più NUOVA dell\'app (' + c.dettaglio + ').\n\n'
                        + 'Non li ho toccati, e finché usi questa versione l\'app non salva niente sopra: installa l\'app aggiornata e riaprila.\n\n'
                        + alSicuro + '\n\n«Scarica i dati» ne salva comunque una copia in un file.';
                }
                return 'I dati salvati su questo dispositivo non si riescono a leggere.\n\n'
                    + 'Non li ho toccati: finché non scegli tu, l\'app NON salva niente sopra, quindi quello che fai adesso non viene conservato.\n\n'
                    + alSicuro + '\n\n'
                    + '· «Scarica i dati» salva il testo così com\'è in un file, da conservare o da far recuperare.\n'
                    + '· «Riparti da vuoto» riapre l\'archivio vuoto: poi reimporti i tuoi backup, o riporti i progetti dalle copie automatiche (menu → Cronologia e ripristino).\n\n'
                    + 'Dettaglio tecnico: ' + c.dettaglio;
            }

            async function mostraAvvisoDatiNonCaricati() {
                const c = caricamentoDati;
                if (!c.bloccato) return;
                const titolo = c.esito === 'piu-nuovo' ? 'Dati di una versione più nuova'
                    : c.esito === 'inaccessibile' ? 'Memoria dei dati non raggiungibile' : 'Dati salvati non leggibili';
                const conTesto = !!c.testoGrezzo;
                const scelta = await appDialog(testoAvvisoDatiNonCaricati(), {
                    // Icona d'allarme, ma NON «danger»: il tasto principale è scaricare, che non toglie
                    // niente; è «Riparti da vuoto» quello che scrive sopra, e chiede conferma a parte.
                    confirm: conTesto, title: titolo, icona: 'alert', coloreIcona: 'var(--danger)',
                    okLabel: conTesto ? 'Scarica i dati' : 'Ho capito',
                    extraLabel: (conTesto && c.esito === 'illeggibile') ? 'Riparti da vuoto' : null,
                    cancelLabel: 'Chiudi'
                });
                if (scelta === true && conTesto) scaricaDatiNonCaricati();
                else if (scelta === 'extra') await ripartiDaVuotoDopoDatiNonCaricati();
            }

            function scaricaDatiNonCaricati() {
                const c = caricamentoDati;
                if (!c.testoGrezzo) return;
                const oggi = new Date().toISOString().split('T')[0];
                scaricaBlob(c.testoGrezzo, 'text/plain;charset=utf-8', `DPSH_dati_non_letti_${oggi}.txt`);
                c.scaricato = true;
            }

            /** Si torna a salvare, partendo dall'archivio vuoto. Solo se il testo non letto è già al
             * sicuro (copia sul dispositivo o file scaricato): è l'unico momento in cui l'app scrive
             * sopra quel testo, e deve essere una scelta esplicita. */
            async function ripartiDaVuotoDopoDatiNonCaricati() {
                const c = caricamentoDati;
                if (!c.quarantena && !c.scaricato) {
                    await appAlert('Prima scarica i dati con «Scarica i dati»: sul dispositivo non c\'è ancora una copia al sicuro, e ripartire da vuoto li cancellerebbe.');
                    return mostraAvvisoDatiNonCaricati();
                }
                const ok = await appConfirmDelete('Riparto con l\'archivio vuoto e da ora salvo di nuovo.\n\n'
                    + 'Il testo che non si leggeva resta ' + (c.quarantena ? 'nella memoria delle copie automatiche' : 'nel file che hai scaricato')
                    + '. I progetti si riportano reimportando i backup o dalla Cronologia delle copie automatiche.');
                if (!ok) return mostraAvvisoDatiNonCaricati();
                c.bloccato = false;
                c.esito = 'vuoto';
                const barra = document.getElementById('barraSalvataggioSospeso');
                if (barra) barra.remove();
                saveState();
                if (typeof switchView === 'function') switchView('home');
            }

            /** Una striscia fissa in alto, finché il salvataggio resta sospeso: l'avviso si può chiudere,
             * ma il fatto che niente venga salvato non deve sparire dalla vista. */
            function mostraBarraSalvataggioSospeso() {
                if (document.getElementById('barraSalvataggioSospeso')) return;
                const barra = document.createElement('div');
                barra.id = 'barraSalvataggioSospeso';
                barra.setAttribute('role', 'alert');
                // In testa alla pagina e «sticky» (Fase 3): prima era fissa sopra tutto e copriva la
                // testata (Home e Impostazioni irraggiungibili); ora spinge giù il contenuto e resta
                // comunque in vista scorrendo.
                barra.style.cssText = 'position:sticky; top:0; left:0; right:0; z-index:9000; flex-shrink:0; display:flex; align-items:center; gap:10px; '
                    + 'padding:calc(8px + env(safe-area-inset-top, 0px)) 14px 8px; background:var(--danger); color:var(--on-solid); font-size:13px; font-weight:700; line-height:1.3;';
                barra.innerHTML = `<svg class="ico" style="flex-shrink:0;"><use href="#i-alert"/></svg>`
                    + `<span style="flex:1; min-width:0;">Salvataggio sospeso: i dati salvati non sono stati letti.</span>`
                    + `<button type="button" id="btnBarraSalvataggioSospeso" style="flex-shrink:0; min-height:44px; padding:6px 12px; border-radius:8px; border:1px solid currentColor; background:transparent; color:inherit; font-weight:800; font-size:13px;">Cosa fare</button>`;
                document.body.insertBefore(barra, document.body.firstChild);
                const btn = document.getElementById('btnBarraSalvataggioSospeso');
                if (btn) btn.addEventListener('click', () => mostraAvvisoDatiNonCaricati());
            }
