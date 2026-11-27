            // ===================== SINCRONIZZAZIONE DEI PROGETTI SU DRIVE =====================
            // Un file per progetto nella cartella VISIBILE «DPSH» del Drive dell'utente (non cifrata, creata dall'app: lo scope
            // drive.file la vede solo se l'ha creata l'app). Il file è il pacchetto di progetto di sempre (044b), `<nome> - <id>.zip`,
            // quindi si apre anche con «Importa» dell'app. In appProperties: dpshId e impronta del contenuto (la stessa di 044b/004e).
            // Per ogni progetto si ricorda: impronta all'ultima sincronizzazione, id del file su Drive, modifiedTime remoto.
            //
            // Regole (sicure, decise con l'utente):
            //  - cambiato solo qui → carica;  cambiato solo su Drive → copia automatica locale (048, dentro applicaPacchetto), poi sostituisce;
            //  - cambiato in tutti e due → TIENI ENTRAMBI: il locale resta, quello di Drive entra come progetto nuovo «(da Drive, <data>)»;
            //  - progetto nuovo su Drive → si scarica;
            //  - MAI cancellare in automatico, né su Drive né qui. Un progetto eliminato qui, o sparito da Drive, non si propaga: va
            //    nell'anteprima e decide l'utente (su Drive solo cestino, mai eliminazione definitiva);
            //  - un elenco vuoto, o incompleto (una pagina che fallisce), NON vuol dire «tutto eliminato».
            // La sincronizzazione automatica (evento online, avvio, ogni 10 minuti) fa solo le azioni sicure: carica, scarica i nuovi,
            // sostituisce con copia di sicurezza. Conflitti ed eliminazioni aspettano l'utente; la prima volta c'è sempre l'anteprima.
            // Le chiavi API non entrano mai in un pacchetto né in questo stato.
            const SYNC_CHIAVE = 'dpsh_sync_drive';
            const SYNC_CARTELLA = 'DPSH';
            const SYNC_INTERVALLO = 10 * 60 * 1000;
            const sync = { inCorso: false, errore: '', pendenti: { conflitti: 0, decisioni: 0 }, timer: null, cache: new Map(), avvisato: '' };

            function syncLeggi() {
                let v = null;
                try { v = JSON.parse(localStorage.getItem(SYNC_CHIAVE) || 'null'); } catch (e) { v = null; }
                if (!v || typeof v !== 'object') v = {};
                if (!v.progetti || typeof v.progetti !== 'object') v.progetti = {};
                if (!Array.isArray(v.registro)) v.registro = [];
                return v;
            }
            function syncScrivi(v) { try { localStorage.setItem(SYNC_CHIAVE, JSON.stringify(v)); } catch (e) { ignoraErrore('sync/scrivi', e); } }
            /** Cambia lo stato salvato: sync.progetti[id] = { impronta, fileId, modificato }, cartellaId, prima, ultima, account, registro. */
            function syncModifica(fn) { const v = syncLeggi(); fn(v); syncScrivi(v); return v; }

            const syncNomeProgetto = (p) => String((p && (p.name || p.comune)) || 'Progetto').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 80) || 'Progetto';
            /** Il nome del file su Drive: leggibile, senza caratteri vietati, con l'id in fondo. */
            const syncNomeFile = (p, id) => syncNomeProgetto(p).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim() + ' - ' + id + '.zip';
            const syncOra = (iso) => { const d = new Date(iso); return isNaN(d.getTime()) ? '' : d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }); };
            const syncData = (d) => { const x = d || new Date(); return String(x.getDate()).padStart(2, '0') + '/' + String(x.getMonth() + 1).padStart(2, '0') + '/' + x.getFullYear(); };

            /** Il registro delle ultime 20 sincronizzazioni: data, cosa, perché. */
            function registraSync(cosa, perche) {
                syncModifica(v => { v.registro.unshift({ t: new Date().toISOString(), cosa: String(cosa).slice(0, 160), perche: String(perche || '').slice(0, 160) }); v.registro = v.registro.slice(0, 20); });
                syncMostraStato();
            }

            function syncTestoStato() {
                if (!googleCollegato()) return '';
                const v = syncLeggi();
                if (sync.inCorso) return 'Sincronizzazione in corso…';
                if (!googleInRete()) return 'Offline: in attesa';
                if (sync.errore) return 'Errore: ' + sync.errore;
                if (sync.pendenti.conflitti) return 'Conflitto: ' + sync.pendenti.conflitti;
                if (sync.pendenti.decisioni) return 'Da decidere: ' + sync.pendenti.decisioni;
                if (googleSt.serveTocco && !googleTokenValido()) return 'Tocca «Sincronizza ora» per riprendere';
                if (!v.prima) return 'Prima sincronizzazione da confermare';
                return v.ultima ? 'Sincronizzato alle ' + syncOra(v.ultima) : 'In attesa della prima sincronizzazione';
            }
            function syncMostraStato() {
                try {
                    const e = document.getElementById('lblSyncStato'), reg = document.getElementById('lblSyncRegistro');
                    if (e) e.textContent = syncTestoStato();
                    if (reg) {
                        const righe = syncLeggi().registro;
                        reg.textContent = '';
                        if (!righe.length) reg.textContent = 'Ancora niente.';
                        righe.forEach(r => { const d = document.createElement('div'); const q = new Date(r.t); d.textContent = (isNaN(q.getTime()) ? '' : syncData(q) + ' ' + syncOra(r.t) + ' · ') + r.cosa + (r.perche ? ' (' + r.perche + ')' : ''); reg.appendChild(d); });
                    }
                } catch (e) { ignoraErrore('sync/stato-ui', e); }
            }

            // ---------- Il confronto ----------
            /** L'impronta di un progetto di qui, calcolata come in 044b. Si ricalcola solo se il progetto è cambiato davvero (modificatoIl). */
            async function syncImprontaLocale(id, forza) {
                const p = state.projects[id];
                const chiave = p.modificatoIl ? String(p.modificatoIl) : null;
                const c = sync.cache.get(id);
                if (!forza && chiave && c && c.chiave === chiave) return c.impronta;
                const impronta = improntaProgetto(formaSalvataProgetto(p), state, await impronteImmaginiQui(p));
                if (chiave) sync.cache.set(id, { chiave, impronta }); else sync.cache.delete(id);
                return impronta;
            }

            /** Trova (o crea, se crea = true) la cartella «DPSH». Ritorna l'id o null. */
            async function syncCartella(crea) {
                const v = syncLeggi();
                if (v.cartellaId) {
                    const m = await driveMetadati(v.cartellaId);
                    if (m && !m.trashed && m.mimeType === DRIVE_CARTELLA_MIME) return v.cartellaId;
                }
                const trovate = await driveElenca("name = '" + driveQ(SYNC_CARTELLA) + "' and mimeType = '" + DRIVE_CARTELLA_MIME + "' and trashed = false", 'drive');
                trovate.sort((a, b) => String(a.modifiedTime || '').localeCompare(String(b.modifiedTime || '')));
                let id = trovate[0] ? trovate[0].id : null;
                if (!id && crea) id = (await driveCreaCartella(SYNC_CARTELLA)).id;
                if (id !== v.cartellaId) syncModifica(x => { x.cartellaId = id; });
                return id;
            }

            /** Cosa c'è su Drive: { cartellaId, remoti: Map dpshId → file }. L'elenco o è completo o è un errore. */
            async function syncLeggiRemoto() {
                const cartellaId = await syncCartella(false);
                const remoti = new Map();
                if (!cartellaId) return { cartellaId: null, remoti };
                const elenco = await driveElenca("'" + driveQ(cartellaId) + "' in parents and trashed = false and mimeType != '" + DRIVE_CARTELLA_MIME + "'", 'drive');
                elenco.forEach(f => {
                    const id = f.appProperties && f.appProperties.dpshId;
                    if (!idSicuro(id)) return; // un file che non è nostro (o con un id che non ha la forma dei nostri) si lascia stare
                    const gia = remoti.get(id);
                    if (!gia || String(f.modifiedTime || '') > String(gia.modifiedTime || '')) remoti.set(id, f);
                });
                return { cartellaId, remoti };
            }

            /** Il piano: una voce per progetto, con cosa fare. Non scrive niente, né qui né su Drive. */
            async function syncPiano(forza) {
                saveState();
                const v = syncLeggi();
                const { cartellaId, remoti } = await syncLeggiRemoto();
                const locali = Object.keys(state.projects || {}).filter(idSicuro);
                const ids = new Set([...locali, ...remoti.keys(), ...Object.keys(v.progetti).filter(idSicuro)]);
                const vuoto = remoti.size === 0 && Object.keys(v.progetti).length > 0;
                const voci = [];
                for (const id of ids) {
                    const L = locali.includes(id), R = remoti.get(id) || null, B = v.progetti[id] || null;
                    const p = L ? state.projects[id] : null;
                    const it = { id, nome: L ? syncNomeProgetto(p) : (B && B.nome) || String(R && R.name || id).slice(0, 80), remoto: R, base: B, impR: R && R.appProperties ? (R.appProperties.impronta || null) : null, impL: null, tipo: 'nulla' };
                    if (L) it.impL = await syncImprontaLocale(id, forza);
                    if (L && R) {
                        if (!B) it.tipo = it.impL === it.impR ? 'collega' : 'conflitto';
                        else {
                            const lc = it.impL !== B.impronta, rc = it.impR !== B.impronta;
                            it.tipo = !lc && !rc ? 'nulla' : lc && !rc ? 'carica' : !lc && rc ? 'scarica' : (it.impL === it.impR ? 'collega' : 'conflitto');
                        }
                    } else if (L) it.tipo = B ? 'manca-su-drive' : 'carica-nuovo';
                    else if (R) it.tipo = B ? 'eliminato-qui' : 'scarica-nuovo';
                    else it.tipo = 'dimentica';
                    if (it.tipo === 'manca-su-drive' && vuoto) it.vuoto = true;
                    voci.push(it);
                }
                return { cartellaId, voci, vuoto };
            }
            const syncSicura = (it) => ['carica', 'carica-nuovo', 'scarica', 'scarica-nuovo', 'collega', 'nulla', 'dimentica'].includes(it.tipo);

            /** fetch senza rete lancia un TypeError (nel browser come nei test): è «offline», non un errore del progetto. */
            const syncErroreDiRete = (e) => !!e && e.name === 'TypeError';

            // ---------- Le azioni ----------
            async function syncCarica(it, cartellaId) {
                const r = await creaPacchettoProgetto(it.id); // salva e calcola l'impronta del contenuto che parte davvero
                const proj = state.projects[it.id];
                const meta = { name: syncNomeFile(proj, it.id), appProperties: { dpshId: it.id, impronta: r.manifest.impronta } };
                if (!it.remoto) meta.parents = [cartellaId || await syncCartella(true)];
                const res = await driveCarica(it.remoto ? it.remoto.id : null, meta, r.blob, 'application/zip');
                syncModifica(v => { v.progetti[it.id] = { impronta: r.manifest.impronta, fileId: res.id, modificato: res.modifiedTime || null, nome: syncNomeProgetto(proj) }; });
                sync.cache.delete(it.id);
                return res;
            }
            /** Scarica e applica il pacchetto di Drive. scelta: 'sostituisci' (copia automatica prima, dentro applicaPacchetto) | 'nuovo' | 'entrambi'. */
            async function syncScarica(it, scelta) {
                const file = new File([await driveScarica(it.remoto.id)], 'drive.zip', { type: 'application/zip' });
                const l = await leggiPacchetto(file);
                if (!l.ok) throw new Error('il file su Drive non è un pacchetto valido (' + String(l.problemi[0]).slice(0, 100) + ')');
                if (l.progetto.id !== it.id) throw new Error('il file su Drive non corrisponde al suo progetto');
                const esito = await applicaPacchetto(l, scelta);
                return { l, esito };
            }
            const syncRicorda = (it, impronta) => syncModifica(v => { v.progetti[it.id] = { impronta, fileId: it.remoto.id, modificato: it.remoto.modifiedTime || null, nome: it.nome }; });

            /** Esegue le voci. opz: { conflitti, ripristina, cestina }. Ritorna i conteggi; un errore su un progetto non ferma gli altri,
             * un errore di rete sì (si risale per dire «offline»). */
            async function syncEsegui(piano, opz) {
                const o = opz || {}, n = { carica: 0, scarica: 0, nuovi: 0, conflitti: 0, ripristinati: 0, cestinati: 0, errori: 0 };
                const sbaglio = (it, e) => { if (syncErroreDiRete(e)) throw e; n.errori++; ignoraErrore('sync/' + it.tipo, e); registraSync('Non sincronizzato: ' + it.nome, (e && e.message) || 'errore'); };
                for (const it of piano.voci) {
                    try {
                        if (it.tipo === 'dimentica') { syncModifica(v => { delete v.progetti[it.id]; }); continue; }
                        if (it.tipo === 'nulla') { if (it.remoto) syncRicorda(it, it.impR); continue; }
                        if (it.tipo === 'collega') { syncRicorda(it, it.impL); registraSync('Collegato: ' + it.nome, 'uguale su Drive'); continue; }
                        if (it.tipo === 'carica' || it.tipo === 'carica-nuovo') { await syncCarica(it, piano.cartellaId); n.carica++; registraSync('Caricato: ' + it.nome, it.tipo === 'carica' ? 'cambiato solo qui' : 'progetto nuovo'); }
                        else if (it.tipo === 'scarica') { const r = await syncScarica(it, 'sostituisci'); syncRicorda(it, r.l.impronta); n.scarica++; registraSync('Sostituito da Drive: ' + it.nome, 'cambiato solo su Drive, copia automatica fatta'); }
                        else if (it.tipo === 'scarica-nuovo') { const r = await syncScarica(it, 'nuovo'); syncRicorda(it, r.l.impronta); n.nuovi++; registraSync('Scaricato: ' + it.nome, 'progetto nuovo su Drive'); }
                        else if (it.tipo === 'conflitto' && o.conflitti) {
                            const r = await syncScarica(it, 'entrambi');
                            const copia = state.projects[r.esito.projId];
                            if (copia) { copia.name = (syncNomeProgetto(r.l.progetto) + ' (da Drive, ' + syncData() + ')').slice(0, 120); saveState(); }
                            syncRicorda(it, it.impR); // da qui il locale risulta «cambiato solo qui» e sale su Drive: la versione di Drive resta nella copia
                            sync.cache.delete(it.id);
                            await syncCarica(it, piano.cartellaId);
                            n.conflitti++; registraSync('Conflitto: ' + it.nome, 'cambiato in tutti e due: tenuti entrambi, la versione di Drive è «' + (copia ? copia.name : 'copia') + '»');
                        } else if (it.tipo === 'eliminato-qui' && o.ripristina) { const r = await syncScarica(it, 'nuovo'); syncRicorda(it, r.l.impronta); n.ripristinati++; registraSync('Riportato qui: ' + it.nome, 'l\'avevi eliminato qui, lo vuoi ancora');
                        } else if (it.tipo === 'eliminato-qui' && o.cestina) { await driveCestina(it.remoto.id); syncModifica(v => { delete v.progetti[it.id]; }); n.cestinati++; registraSync('Nel cestino di Drive: ' + it.nome, 'eliminato qui, scelto dall\'utente');
                        } else if (it.tipo === 'manca-su-drive' && o.ripristina) { it.remoto = null; await syncCarica(it, piano.cartellaId); n.ripristinati++; registraSync('Ricaricato su Drive: ' + it.nome, 'mancava su Drive, scelto dall\'utente'); }
                    } catch (e) { sbaglio(it, e); }
                }
                return n;
            }

            // ---------- L'anteprima ----------
            function syncTestoAnteprima(piano) {
                const per = (tipo) => piano.voci.filter(i => i.tipo === tipo);
                const elenco = (lista) => lista.slice(0, 12).map(i => '   • ' + i.nome).join('\n') + (lista.length > 12 ? '\n   …e altri ' + (lista.length - 12) : '');
                const sezioni = [];
                const aggiungi = (titolo, lista) => { if (lista.length) sezioni.push(titolo + ' (' + lista.length + ')\n' + elenco(lista)); };
                aggiungi('Carico su Drive', piano.voci.filter(i => i.tipo === 'carica' || i.tipo === 'carica-nuovo'));
                aggiungi('Scarico da Drive (nuovi)', per('scarica-nuovo'));
                aggiungi('Sostituisco con la versione di Drive (prima una copia automatica qui)', per('scarica'));
                aggiungi('CONFLITTO, tengo entrambi (il tuo resta, quello di Drive entra come «(da Drive, ' + syncData() + ')»)', per('conflitto'));
                aggiungi('Eliminati qui ma ancora su Drive: non li tocco', per('eliminato-qui'));
                aggiungi(piano.vuoto ? 'ATTENZIONE: Drive risulta vuoto ma questi progetti erano già sincronizzati. Non li considero eliminati e non li tocco' : 'Non sono più su Drive: non li tocco', per('manca-su-drive'));
                return (sezioni.length ? sezioni.join('\n\n') : 'Niente da cambiare.') + '\n\nNiente viene cancellato, né qui né su Drive.';
            }

            // ---------- La sincronizzazione ----------
            /** opz.auto: solo azioni sicure, senza finestre. Ritorna { ok, esito }. */
            async function sincronizza(opz) {
                const auto = !!(opz && opz.auto);
                if (!googleAmmesso()) return { ok: false, esito: GOOGLE_NON_DISPONIBILE };
                if (!googleCollegato()) return { ok: false, esito: 'Prima accedi con Google.' };
                if (sync.inCorso) return { ok: false, esito: 'Una sincronizzazione è già in corso.' };
                if (!googleInRete()) { syncMostraStato(); return { ok: false, esito: 'Offline: in attesa della rete.' }; }
                if (caricamentoDati.bloccato) return { ok: false, esito: 'I dati di questo dispositivo non sono stati letti: prima va risolto l\'avviso sui dati.' };
                if (auto && !googleTokenValido() && googleSt.serveTocco) return { ok: false, esito: 'Serve un tocco per riprendere.' };
                sync.inCorso = true; sync.errore = ''; syncMostraStato();
                try {
                    await googleOttieniToken();
                    let piano = await syncPiano(!auto);
                    const v = syncLeggi();
                    const conflitti = piano.voci.filter(i => i.tipo === 'conflitto'), decisioni = piano.voci.filter(i => i.tipo === 'eliminato-qui' || i.tipo === 'manca-su-drive');
                    const sicure = piano.voci.filter(i => syncSicura(i) && i.tipo !== 'nulla' && i.tipo !== 'dimentica');
                    let esecuzione = {};
                    if (auto) {
                        if (!v.prima) { sync.pendenti = { conflitti: conflitti.length, decisioni: decisioni.length }; return { ok: true, esito: 'La prima sincronizzazione va confermata dall\'utente.' }; }
                        esecuzione = { conflitti: false };
                    } else if (!v.prima || conflitti.length || decisioni.length) {
                        sync.inCorso = false; syncMostraStato();
                        const haEl = piano.voci.some(i => i.tipo === 'eliminato-qui'), haMan = piano.voci.some(i => i.tipo === 'manca-su-drive');
                        const scelta = await appDialog(syncTestoAnteprima(piano), {
                            confirm: true, title: v.prima ? 'Sincronizzazione: da decidere' : 'Prima sincronizzazione con Drive', okLabel: 'Conferma', cancelLabel: 'Annulla',
                            extraLabel: (haEl || haMan) ? 'Conferma e riporta i mancanti' : null, extra2Label: haEl ? 'Conferma e cestina su Drive' : null
                        });
                        if (!scelta) { sync.pendenti = { conflitti: conflitti.length, decisioni: decisioni.length }; return { ok: true, esito: 'Annullato: non ho cambiato niente.' }; }
                        sync.inCorso = true; syncMostraStato();
                        esecuzione = { conflitti: true, ripristina: scelta === 'extra', cestina: scelta === 'extra2' };
                        syncModifica(x => { x.prima = true; });
                    } else esecuzione = { conflitti: false };
                    const n = await syncEsegui(piano, esecuzione);
                    // Cosa resta in sospeso (per lo stato): conflitti non risolti, eliminazioni non decise.
                    sync.pendenti = {
                        conflitti: esecuzione.conflitti ? 0 : conflitti.length,
                        decisioni: decisioni.filter(i => !(i.tipo === 'eliminato-qui' && (esecuzione.ripristina || esecuzione.cestina)) && !(i.tipo === 'manca-su-drive' && esecuzione.ripristina)).length
                    };
                    syncModifica(x => { x.ultima = new Date().toISOString(); x.account = (googleSegno() || {}).email || x.account || ''; });
                    if (!sicure.length && !n.conflitti && !n.ripristinati && !n.cestinati && !n.errori && !auto) registraSync('Controllo: tutto allineato', 'sincronizzazione manuale');
                    const parti = [];
                    if (n.carica) parti.push(n.carica + ' caricati'); if (n.scarica + n.nuovi) parti.push((n.scarica + n.nuovi) + ' scaricati');
                    if (n.conflitti) parti.push(n.conflitti + ' conflitti (tenuti entrambi)'); if (n.errori) parti.push(n.errori + ' non riusciti');
                    if (sync.pendenti.conflitti || sync.pendenti.decisioni) parti.push('da decidere: ' + (sync.pendenti.conflitti + sync.pendenti.decisioni));
                                    await chiaviAllineaSeServe().catch(() => false); // chiavi rimaste in attesa di rete
                    if (n.conflitti && auto) mostraToast('Sincronizzazione: conflitto da decidere');
                    return { ok: n.errori === 0, esito: parti.length ? parti.join(', ') + '.' : 'Tutto allineato.', dettagli: n };
                } catch (e) {
                    const rete = syncErroreDiRete(e) || !googleInRete();
                    sync.errore = (rete || (googleSt.serveTocco && !googleTokenValido())) ? '' : String((e && e.message) || 'non riuscita').slice(0, 80);
                    if (!rete) ignoraErrore('sync/errore', e);
                    return { ok: false, esito: rete ? 'Offline: in attesa della rete.' : (e && e.message) || 'Sincronizzazione non riuscita.' };
                } finally { sync.inCorso = false; syncMostraStato(); }
            }

            // ---------- Quando ----------
            const syncAuto = () => { if (googleCollegato() && googleAmmesso() && googleInRete() && document.visibilityState !== 'hidden') sincronizza({ auto: true }).catch(e => ignoraErrore('sync/auto', e)); };
            function syncAvvia() { clearInterval(sync.timer); sync.timer = setInterval(syncAuto, SYNC_INTERVALLO); }
            function syncFermaTutto() { clearInterval(sync.timer); sync.timer = null; sync.pendenti = { conflitti: 0, decisioni: 0 }; sync.errore = ''; syncMostraStato(); }
            /** Un altro account non eredita ricordi di sincronizzazione che non sono suoi. */
            function syncDimenticaAccount() { syncModifica(v => { v.progetti = {}; v.cartellaId = null; v.prima = false; v.ultima = null; v.registro = []; }); sync.cache.clear(); }

            googleAgganci.dopoLogin.push(() => { syncAvvia(); setTimeout(() => sincronizza({ auto: false }).then(r => { if (r.esito) mostraToast(r.esito); }).catch(e => ignoraErrore('sync/dopo-login', e)), 400); });
            googleAgganci.altroAccount.push(syncDimenticaAccount);
            googleAgganci.dopoEsci.push(syncFermaTutto);
            googleAgganci.statoCambiato.push(syncMostraStato);
            window.addEventListener('online', () => { syncMostraStato(); setTimeout(syncAuto, 1500); });
            window.addEventListener('offline', syncMostraStato);
            const syncBtn = document.getElementById('btnSyncOra');
            if (syncBtn) syncBtn.addEventListener('click', async () => {
                googleSt.serveTocco = false; // il tocco c'è: si può chiedere il permesso
                const r = await sincronizza({ auto: false });
                if (r.esito) mostraToast(r.esito);
            });
            if (googleCollegato() && googleAmmesso()) { syncAvvia(); setTimeout(syncAuto, 4000); }
            syncMostraStato();
