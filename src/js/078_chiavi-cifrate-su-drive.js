            // ===================== CHIAVI API CIFRATE SU DRIVE =====================
            // Le chiavi degli assistenti IA stanno in localStorage (voce AI_CHIAVE, 073). Con l'account Google si possono
            // tenere anche su Drive, cifrate, per ritrovarle su un altro dispositivo.
            //
            //  - Il file `dpsh-chiavi.json` sta in appDataFolder, la cartella nascosta dell'app su Drive:
            //      { v: 1, kdf: 'PBKDF2-SHA256', iter, salt, iv, ct }   (tutto in base64)
            //  - La frase segreta la scrive l'utente in un dialogo (campo password) e non si salva da nessuna parte.
            //    Chiave = PBKDF2-SHA256, 600000 giri, sale casuale di 16 byte → AES-GCM 256 con iv casuale di 12 byte.
            //  - La CryptoKey ricavata NON è estraibile e resta solo in memoria, per la sessione (chiavi.sessione):
            //    finché c'è, quando le chiavi cambiano il file si ricarica da solo (iv nuovo a ogni scrittura).
            //  - Le chiavi non finiscono MAI in log, console, messaggi all'IA, esportazioni, URL o file di progetto: qui
            //    passano solo da aiCfg (073) a WebCrypto e da WebCrypto a Drive, e gli errori riportano solo testi fissi.
            //  - Una frase persa non si recupera: dopo, le chiavi vanno reinserite a mano.
            const CHIAVI_FILE = 'dpsh-chiavi.json';
            const CHIAVI_GIRI = 600000;
            const CHIAVI_RIFIUTO = 'dpsh_chiavi_drive_no'; // solo «non chiedermelo più dopo il login», nessun dato
            const chiavi = { sessione: null, fileId: null, ultimaImpronta: null, daCaricare: false, applicando: false, occupato: false, timer: null };

            function chiaviSubtle() {
                const c = window.crypto;
                if (!c || !c.subtle || typeof c.getRandomValues !== 'function') throw new Error('Questo browser non può cifrare le chiavi (serve una pagina https).');
                return c.subtle;
            }
            function chiaviInBase64(byte) {
                let s = '';
                for (let i = 0; i < byte.length; i += 8192) s += String.fromCharCode.apply(null, byte.subarray(i, i + 8192));
                return btoa(s);
            }
            function chiaviDaBase64(testo, lunghezzaAttesa) {
                if (typeof testo !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(testo)) throw new Error('Il file delle chiavi su Drive non è valido.');
                const s = atob(testo), byte = new Uint8Array(s.length);
                for (let i = 0; i < s.length; i++) byte[i] = s.charCodeAt(i);
                if (lunghezzaAttesa && byte.length !== lunghezzaAttesa) throw new Error('Il file delle chiavi su Drive non è valido.');
                return byte;
            }

            /** Frase + sale → chiave AES-GCM 256 non estraibile. */
            async function chiaviDerivaChiave(frase, sale, giri) {
                const subtle = chiaviSubtle();
                const base = await subtle.importKey('raw', new TextEncoder().encode(String(frase).normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
                return subtle.deriveKey({ name: 'PBKDF2', hash: 'SHA-256', salt: sale, iterations: giri }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
            }
            async function chiaviNuovaSessione(frase) {
                chiaviSubtle();
                const sale = window.crypto.getRandomValues(new Uint8Array(16));
                return { key: await chiaviDerivaChiave(frase, sale, CHIAVI_GIRI), salt: sale, iter: CHIAVI_GIRI };
            }

            /** { id provider: chiave } → il file cifrato (oggetto). Ogni volta un iv nuovo. */
            async function chiaviCifra(mappa, sessione) {
                const iv = window.crypto.getRandomValues(new Uint8Array(12));
                const chiaro = new TextEncoder().encode(JSON.stringify({ v: 1, chiavi: mappa }));
                const ct = new Uint8Array(await chiaviSubtle().encrypt({ name: 'AES-GCM', iv }, sessione.key, chiaro));
                return { v: 1, kdf: 'PBKDF2-SHA256', iter: sessione.iter, salt: chiaviInBase64(sessione.salt), iv: chiaviInBase64(iv), ct: chiaviInBase64(ct) };
            }

            /** Il file di Drive è input non fidato: forma e limiti controllati prima di spendere 600000 giri. */
            function chiaviControllaFile(f) {
                if (!f || typeof f !== 'object' || f.v !== 1 || f.kdf !== 'PBKDF2-SHA256') throw new Error('Il file delle chiavi su Drive non è di questa versione dell\'app.');
                if (!Number.isInteger(f.iter) || f.iter < 100000 || f.iter > 2000000) throw new Error('Il file delle chiavi su Drive non è valido.');
                return { iter: f.iter, salt: chiaviDaBase64(f.salt, 16), iv: chiaviDaBase64(f.iv, 12), ct: chiaviDaBase64(f.ct) };
            }

            /** Apre il file con la frase (o con la chiave di sessione). Ritorna { mappa, sessione }.
             * Frase sbagliata (o file toccato): errore con codice 'frase', senza dire altro. */
            async function chiaviDecifra(file, frase, sessioneEsistente) {
                const p = chiaviControllaFile(file);
                const sessione = sessioneEsistente || { key: await chiaviDerivaChiave(frase, p.salt, p.iter), salt: p.salt, iter: p.iter };
                let chiaro;
                try { chiaro = await chiaviSubtle().decrypt({ name: 'AES-GCM', iv: p.iv }, sessione.key, p.ct); }
                catch (e) { const er = new Error('Frase sbagliata, oppure il file delle chiavi è stato modificato.'); er.codice = 'frase'; throw er; }
                let dati;
                try { dati = JSON.parse(new TextDecoder().decode(chiaro)); } catch (e) { throw new Error('Il file delle chiavi su Drive non si legge.'); }
                return { mappa: chiaviPulisci(dati && dati.chiavi), sessione };
            }

            /** Solo provider che l'app conosce, solo testi ragionevoli: quello che arriva da Drive non si fida. */
            function chiaviPulisci(m) {
                const fuori = {};
                if (!m || typeof m !== 'object') return fuori;
                AI_PROVIDER.forEach(d => {
                    const v = m[d.id];
                    if (!d.senzaChiave && typeof v === 'string' && v.length >= 1 && v.length <= 400 && !/[\u0000-\u001f\u007f]/.test(v)) fuori[d.id] = v.trim();
                });
                return fuori;
            }
            /** Le chiavi di questo dispositivo: { id: chiave }. Vive solo dentro questo pezzo e va solo a WebCrypto. */
            function chiaviLocali() {
                const m = {};
                AI_PROVIDER.forEach(d => { const c = aiCfg.provider[d.id]; if (!d.senzaChiave && c && typeof c.chiave === 'string' && c.chiave.trim()) m[d.id] = c.chiave.trim(); });
                return m;
            }
            const chiaviImpronta = (m) => sha256Testo(jsonCanonico(m));
            const chiaviUguali = (a, b) => chiaviImpronta(a) === chiaviImpronta(b);

            /** Scrive sul dispositivo le chiavi scelte (sostituisce quelle dei provider elencati e toglie gli altri). */
            function chiaviApplicaQui(mappa) {
                chiavi.applicando = true;
                try {
                    AI_PROVIDER.forEach(d => {
                        if (d.senzaChiave) return;
                        if (mappa[d.id]) aiConf(d.id).chiave = mappa[d.id];
                        else if (aiCfg.provider[d.id]) delete aiCfg.provider[d.id].chiave;
                    });
                    aiSalva();
                } finally { chiavi.applicando = false; }
                if (typeof aiAggiornaEtichetta === 'function') { try { aiAggiornaEtichetta(); } catch (e) { ignoraErrore('chiavi/etichetta', e); } }
            }

            function chiaviDimenticaSessione() {
                chiavi.sessione = null; chiavi.fileId = null; chiavi.ultimaImpronta = null; chiavi.daCaricare = false;
                clearTimeout(chiavi.timer);
                chiaviMostraStato();
            }

            // ---------- Drive ----------
            async function chiaviCercaSuDrive() {
                const elenco = await driveElenca("name = '" + driveQ(CHIAVI_FILE) + "' and trashed = false", 'appDataFolder');
                elenco.sort((a, b) => String(b.modifiedTime || '').localeCompare(String(a.modifiedTime || '')));
                return elenco[0] || null;
            }
            async function chiaviLeggiDaDrive(meta) {
                let testo;
                try { testo = new TextDecoder().decode(await driveScarica(meta.id)); return JSON.parse(testo); }
                catch (e) { if (e && e.stato) throw e; throw new Error('Il file delle chiavi su Drive non si legge.'); }
            }
            /** Cifra le chiavi e le mette su Drive (crea il file o lo sostituisce). */
            async function chiaviCaricaSuDrive(mappa, sessione, idFile) {
                const file = await chiaviCifra(mappa, sessione);
                const corpo = new Blob([JSON.stringify(file)], { type: 'application/json' });
                const id = idFile || chiavi.fileId || null;
                const meta = id ? { name: CHIAVI_FILE } : { name: CHIAVI_FILE, parents: ['appDataFolder'] };
                const r = await driveCarica(id, meta, corpo, 'application/json');
                chiavi.fileId = r.id; chiavi.sessione = sessione; chiavi.ultimaImpronta = chiaviImpronta(mappa); chiavi.daCaricare = false;
                chiaviMostraStato();
            }

            // ---------- I dialoghi con la frase (scritta sempre dall'utente, mai dall'IA) ----------
            const CHIAVI_AVVISO_FRASE = 'Se perdi la frase, dovrai reinserire le chiavi: non si può recuperare.';
            /** Chiede la frase. conferma = due volte (per sceglierla). Ritorna il testo o null se annulla. */
            async function chiediFrase(opz) {
                const o = opz || {};
                let messaggio = o.messaggio || '';
                for (;;) {
                    const campi = [{ name: 'frase', label: o.conferma ? 'Scegli la frase segreta (almeno 8 caratteri)' : 'Frase segreta', type: 'password', required: true }];
                    if (o.conferma) campi.push({ name: 'frase2', label: 'Scrivila di nuovo', type: 'password', required: true });
                    const r = await appDialog(messaggio, { confirm: true, title: o.titolo || 'Frase segreta', okLabel: o.okLabel || 'Conferma', fields: campi, extraLabel: o.extraLabel || null });
                    if (r === 'extra') return { extra: true };
                    if (!r || !r.ok) return null;
                    if (o.conferma) {
                        if (r.valori.frase !== r.valori.frase2) { messaggio = 'Le due frasi non coincidono. ' + (o.messaggio || ''); continue; }
                        if (r.valori.frase.length < 8) { messaggio = 'La frase è troppo corta: almeno 8 caratteri. ' + (o.messaggio || ''); continue; }
                    }
                    return r.valori.frase;
                }
            }

            /** Scegliere la frase e caricare le chiavi: il file nuovo (o sostituito). */
            async function chiaviScegliFraseECarica(mappa, idFile) {
                const frase = await chiediFrase({ conferma: true, titolo: 'Scegli la frase segreta', messaggio: 'Le chiavi si cifrano con una frase che scrivi solo tu: non viene salvata da nessuna parte. ' + CHIAVI_AVVISO_FRASE, okLabel: 'Cifra e salva' });
                if (frase === null || typeof frase !== 'string') return false;
                await chiaviCaricaSuDrive(mappa, await chiaviNuovaSessione(frase), idFile);
                return true;
            }

            /** Chiede la frase finché è giusta o l'utente rinuncia. Ritorna { mappa, sessione } | null | { persa: true }. */
            async function chiaviSbloccaConFrase(fileDrive) {
                let messaggio = 'Su Drive ci sono delle chiavi API cifrate. Scrivi la frase segreta per aprirle.';
                for (;;) {
                    const frase = await chiediFrase({ titolo: 'Chiavi API su Drive', messaggio, okLabel: 'Apri', extraLabel: 'Ho perso la frase' });
                    if (frase === null) return null;
                    if (frase.extra) return { persa: true };
                    try { return await chiaviDecifra(fileDrive, frase); }
                    catch (e) { if (e && e.codice === 'frase') { messaggio = 'Frase sbagliata. Riprova, o premi «Ho perso la frase».'; continue; } throw e; }
                }
            }

            /** Il flusso completo. modo: 'dopoLogin' | 'manuale' | 'salva' | 'recupera'. Ritorna { ok, esito } con un testo
             * fisso e breve: mai le chiavi. Se c'è già qualcosa in corso non parte. */
            async function chiaviFlusso(modo) {
                if (!googleAmmesso()) return { ok: false, esito: GOOGLE_NON_DISPONIBILE };
                if (!googleCollegato()) return { ok: false, esito: 'Prima accedi con Google.' };
                if (!googleInRete()) return { ok: false, esito: 'Sei offline: le chiavi su Drive si gestiscono quando torna la rete.' };
                if (chiavi.occupato) return { ok: false, esito: 'Un\'altra operazione sulle chiavi è già in corso.' };
                chiavi.occupato = true;
                try {
                    const locali = chiaviLocali();
                    const nLocali = Object.keys(locali).length;
                    const meta = await chiaviCercaSuDrive();
                    if (!meta) {
                        chiavi.fileId = null;
                        if (modo === 'recupera') return { ok: true, esito: 'Su Drive non ci sono chiavi salvate.' };
                        if (!nLocali) return { ok: true, esito: 'Non ci sono chiavi da salvare: aggiungile da Provider e chiavi API.' };
                        if (modo === 'dopoLogin') {
                            let rifiutato = false;
                            try { rifiutato = localStorage.getItem(CHIAVI_RIFIUTO) === '1'; } catch (e) { /* storage non disponibile */ }
                            if (rifiutato) return { ok: true, esito: 'Le chiavi restano solo su questo dispositivo.' };
                        }
                        if (modo !== 'salva') {
                            const si = await appDialog('Vuoi salvare le chiavi API su Drive, cifrate con una frase segreta che scegli tu? Così le ritrovi su un altro dispositivo.\n\n' + CHIAVI_AVVISO_FRASE,
                                { confirm: true, title: 'Chiavi API su Drive', okLabel: 'Salva su Drive', cancelLabel: 'Non ora' });
                            if (!si) {
                                try { if (modo === 'dopoLogin') localStorage.setItem(CHIAVI_RIFIUTO, '1'); } catch (e) { /* storage non disponibile */ }
                                return { ok: true, esito: 'Le chiavi restano solo su questo dispositivo.' };
                            }
                        }
                        try { localStorage.removeItem(CHIAVI_RIFIUTO); } catch (e) { /* storage non disponibile */ }
                        return (await chiaviScegliFraseECarica(locali, null)) ? { ok: true, esito: 'Chiavi salvate su Drive, cifrate.' } : { ok: true, esito: 'Annullato: le chiavi non sono state salvate.' };
                    }

                    // Il file c'è: si apre (con la chiave di sessione se vale ancora, altrimenti con la frase).
                    const fileDrive = await chiaviLeggiDaDrive(meta);
                    let aperto = null;
                    if (chiavi.sessione) { try { aperto = await chiaviDecifra(fileDrive, null, chiavi.sessione); } catch (e) { if (!(e && e.codice === 'frase')) throw e; chiavi.sessione = null; } }
                    if (!aperto) {
                        const r = await chiaviSbloccaConFrase(fileDrive);
                        if (r === null) return { ok: true, esito: 'Chiavi su Drive non aperte: nessuna modifica.' };
                        if (r.persa) {
                            if (!nLocali) return { ok: true, esito: 'Senza la frase le chiavi su Drive non si aprono. Aggiungi le chiavi a mano e salvale con una frase nuova.' };
                            const si = await appDialog('Senza la frase le chiavi su Drive non si possono aprire. Posso sostituirle con quelle di questo dispositivo, cifrate con una frase nuova.\n\nLe chiavi che ora sono su Drive andranno perse.\n\n' + CHIAVI_AVVISO_FRASE,
                                { confirm: true, danger: true, title: 'Sostituire le chiavi su Drive?', okLabel: 'Sostituisci' });
                            if (!si) return { ok: true, esito: 'Nessuna modifica.' };
                            return (await chiaviScegliFraseECarica(locali, meta.id)) ? { ok: true, esito: 'Chiavi su Drive sostituite con quelle di questo dispositivo.' } : { ok: true, esito: 'Annullato.' };
                        }
                        aperto = r;
                    }
                    chiavi.sessione = aperto.sessione; chiavi.fileId = meta.id;
                    chiaviMostraStato();
                    const remote = aperto.mappa;
                    if (chiaviUguali(locali, remote)) { chiavi.ultimaImpronta = chiaviImpronta(remote); return { ok: true, esito: 'Le chiavi di questo dispositivo e di Drive sono già uguali.' }; }
                    if (!nLocali) {
                        if (!Object.keys(remote).length) return { ok: true, esito: 'Su Drive non c\'è nessuna chiave.' };
                        chiaviApplicaQui(remote); chiavi.ultimaImpronta = chiaviImpronta(remote);
                        return { ok: true, esito: 'Chiavi prese da Drive. Se serve, scegli il modello in Provider e chiavi API.' };
                    }
                    if (!Object.keys(remote).length) {
                        await chiaviCaricaSuDrive(locali, chiavi.sessione, meta.id);
                        return { ok: true, esito: 'Le chiavi di questo dispositivo sono state salvate su Drive.' };
                    }
                    // Diverse da tutte e due le parti: sceglie l'utente.
                    const nomi = (m) => Object.keys(m).map(id => (aiDef(id) || { nome: id }).nome).join(', ') || 'nessuna';
                    const scelta = await appDialog('Le chiavi di questo dispositivo e quelle su Drive sono diverse.\n\nQui: ' + nomi(locali) + '\nSu Drive: ' + nomi(remote)
                        + '\n\nQuali tieni? «Unisci» prende, per ogni provider, quella di questo dispositivo e aggiunge i provider che mancano.',
                        { confirm: true, title: 'Chiavi API diverse', okLabel: 'Tieni quelle del dispositivo', extraLabel: 'Usa quelle di Drive', extra2Label: 'Unisci per provider', cancelLabel: 'Decidi dopo' });
                    if (scelta === true) { await chiaviCaricaSuDrive(locali, chiavi.sessione, meta.id); return { ok: true, esito: 'Tenute le chiavi del dispositivo, e salvate su Drive.' }; }
                    if (scelta === 'extra') { chiaviApplicaQui(remote); chiavi.ultimaImpronta = chiaviImpronta(remote); return { ok: true, esito: 'Usate le chiavi di Drive su questo dispositivo.' }; }
                    if (scelta === 'extra2') {
                        const unite = Object.assign({}, remote, locali);
                        chiaviApplicaQui(unite);
                        await chiaviCaricaSuDrive(unite, chiavi.sessione, meta.id);
                        return { ok: true, esito: 'Chiavi unite per provider, qui e su Drive.' };
                    }
                    return { ok: true, esito: 'Chiavi diverse: nessuna modifica, deciderai dopo.' };
                } catch (e) {
                    ignoraErrore('chiavi/flusso', e);
                    return { ok: false, esito: (e && e.message) || 'Operazione sulle chiavi non riuscita.' };
                } finally { chiavi.occupato = false; chiaviMostraStato(); }
            }

            // ---------- Quando le chiavi cambiano ----------
            /** Chiamata da aiSalva (073). Con la chiave di sessione in memoria ricarica il file cifrato; altrimenti non fa niente
             * (senza la frase non si può cifrare: la prossima apertura del flusso la chiede). */
            function chiaviCambiate() {
                if (chiavi.applicando || !chiavi.sessione) return;
                chiavi.daCaricare = true;
                clearTimeout(chiavi.timer);
                chiavi.timer = setTimeout(() => { chiaviAllineaSeServe().catch(e => ignoraErrore('chiavi/allinea', e)); }, 1500);
            }
            /** Ricarica il file cifrato se le chiavi sono cambiate. Solo collegato, online, con la chiave di sessione e senza finestre. */
            async function chiaviAllineaSeServe() {
                if (!chiavi.daCaricare || chiavi.occupato || !chiavi.sessione) return false;
                if (!googleAmmesso() || !googleCollegato() || !googleInRete()) return false;
                if (!googleTokenValido() && googleSt.serveTocco) return false;
                const locali = chiaviLocali();
                if (chiavi.ultimaImpronta && chiaviImpronta(locali) === chiavi.ultimaImpronta) { chiavi.daCaricare = false; return false; }
                chiavi.occupato = true;
                try { await chiaviCaricaSuDrive(locali, chiavi.sessione, chiavi.fileId); if (typeof registraSync === 'function') registraSync('Chiavi API aggiornate su Drive (cifrate)', 'le chiavi sono cambiate'); return true; }
                catch (e) { ignoraErrore('chiavi/ricarica', e); return false; }
                finally { chiavi.occupato = false; }
            }

            function chiaviMostraStato() {
                const e = document.getElementById('lblChiaviDrive');
                if (e) e.textContent = chiavi.sessione ? '· sbloccate' : '';
            }

            const chiaviBtn = document.getElementById('btnChiaviDrive');
            if (chiaviBtn) chiaviBtn.addEventListener('click', async () => {
                const r = await chiaviFlusso('manuale');
                await appDialog(r.esito, { title: 'Chiavi API su Drive' });
            });
            googleAgganci.dopoLogin.push(async () => { const r = await chiaviFlusso('dopoLogin'); if (r.esito) mostraToast(r.esito); });
            googleAgganci.dopoEsci.push(chiaviDimenticaSessione);
            window.addEventListener('online', () => { chiaviAllineaSeServe().catch(e => ignoraErrore('chiavi/online', e)); });
