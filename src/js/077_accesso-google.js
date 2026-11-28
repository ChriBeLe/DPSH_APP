            // ===================== ACCESSO CON GOOGLE (versione web) =====================
            // Serve a due cose, che stanno nei pezzi dopo: le chiavi API degli assistenti IA cifrate su Drive (078)
            // e la sincronizzazione dei progetti su Drive (079). L'app resta offline-first: senza rete, o senza
            // accedere, funziona tutta come sempre; il login è un di più.
            //
            // Google Identity Services, modello «token client» (nessun client secret, niente server nostro).
            //  - Lo script https://accounts.google.com/gsi/client si carica SOLO quando serve: quando si preme
            //    «Accedi con Google» (o «Sincronizza ora»), o, a chi si era già collegato, all'avvio per rinnovare
            //    il permesso in silenzio. Mai a chi non ha mai fatto il login, mai senza rete.
            //  - Il token d'accesso sta SOLO in memoria (mai in localStorage). Quando scade se ne chiede uno nuovo
            //    in silenzio (prompt ''); se il browser non lo permette senza un tocco, la sincronizzazione aspetta
            //    il prossimo tocco dell'utente invece di aprire finestre a sorpresa.
            //  - In localStorage resta solo il segno «collegato» con email e nome (per mostrarli).
            //  - Il login c'è solo su https o localhost: nell'APK (file://) e in Electron il tasto è spento.
            // Il Client ID è pubblico (non è un segreto): identifica l'app, non dà nessun accesso da solo.
            const GOOGLE_CLIENT_ID = '43317256953-s1v0k8dpivor9i9ph899v0jbmof29nk4.apps.googleusercontent.com';
            const GOOGLE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file';
            const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';
            const GOOGLE_SEGNO = 'dpsh_google_collegato';
            const GOOGLE_NON_DISPONIBILE = 'Il login funziona dalla versione web o installata dal browser.';
            const googleSt = { token: null, scade: 0, client: null, caricamento: null, richiesta: null, serveTocco: false };
            // Gli altri pezzi (chiavi, sincronizzazione) si agganciano qui: funzioni da chiamare dopo il login, all'uscita
            // e quando entra un altro account. Così questo pezzo non conosce gli altri e funziona anche da solo.
            const googleAgganci = { dopoLogin: [], dopoEsci: [], altroAccount: [], statoCambiato: [] };
            const googleChiama = (lista, ...args) => (googleAgganci[lista] || []).forEach(f => { try { f(...args); } catch (e) { ignoraErrore('google/aggancio ' + lista, e); } });

            /** Vero se qui il login ha senso: pagina su https o localhost, non APK né Electron. */
            function googleAmmesso() {
                try {
                    if (window.Capacitor || window.cordova || window.electronAPI || /Electron\//.test(navigator.userAgent || '')) return false;
                    const h = location.hostname;
                    return location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
                } catch (e) { return false; }
            }

            const googleInRete = () => { try { return navigator.onLine !== false; } catch (e) { return true; } };

            /** Il segno «collegato»: { email, nome } oppure null. Niente token, niente chiavi. */
            function googleSegno() {
                try {
                    const v = JSON.parse(localStorage.getItem(GOOGLE_SEGNO) || 'null');
                    if (!v || typeof v !== 'object') return null;
                    return { email: String(v.email || '').slice(0, 200), nome: String(v.nome || '').slice(0, 200) };
                } catch (e) { return null; }
            }
            function googleScriviSegno(v) {
                try { if (v) localStorage.setItem(GOOGLE_SEGNO, JSON.stringify({ email: v.email || '', nome: v.nome || '' })); else localStorage.removeItem(GOOGLE_SEGNO); } catch (e) { ignoraErrore('google/segno', e); }
            }
            const googleCollegato = () => !!googleSegno();
            const googleTokenValido = () => !!googleSt.token && Date.now() < googleSt.scade - 60000;

            /** Carica lo script di Google (una volta). Rifiuta senza rete: non si prova nemmeno. */
            function googleCaricaGis() {
                if (window.google && window.google.accounts && window.google.accounts.oauth2) return Promise.resolve();
                if (googleSt.caricamento) return googleSt.caricamento;
                if (!googleInRete()) return Promise.reject(new Error('Serve internet per accedere con Google.'));
                googleSt.caricamento = new Promise((ok, no) => {
                    const s = document.createElement('script');
                    const fine = (errore) => { clearTimeout(t); s.onload = s.onerror = null; googleSt.caricamento = null; if (errore) { try { s.remove(); } catch (_) { /* già tolto */ } no(errore); } else ok(); };
                    const t = setTimeout(() => fine(new Error('Google non risponde: riprova fra poco.')), 20000);
                    s.src = GOOGLE_GSI_URL; s.async = true;
                    s.onload = () => (window.google && window.google.accounts && window.google.accounts.oauth2) ? fine() : fine(new Error('Lo script di Google non è partito.'));
                    s.onerror = () => fine(new Error('Non riesco a raggiungere Google.'));
                    document.head.appendChild(s);
                });
                return googleSt.caricamento;
            }

            /** Un token d'accesso valido. Se quello in memoria è scaduto lo chiede in silenzio (prompt ''):
             * se Google ha bisogno di un tocco dell'utente il browser può rifiutare la finestra; in quel caso
             * googleSt.serveTocco resta vero e la sincronizzazione automatica smette di insistere. */
            async function googleOttieniToken() {
                if (!googleAmmesso()) throw new Error(GOOGLE_NON_DISPONIBILE);
                if (googleTokenValido()) return googleSt.token;
                if (googleSt.richiesta) return googleSt.richiesta;
                googleSt.richiesta = (async () => {
                    await googleCaricaGis();
                    const risposta = await new Promise((ok, no) => {
                        if (!googleSt.client) {
                            googleSt.client = window.google.accounts.oauth2.initTokenClient({
                                client_id: GOOGLE_CLIENT_ID, scope: GOOGLE_SCOPE, prompt: '',
                                callback: (r) => googleSt.inAttesa && googleSt.inAttesa.ok(r),
                                error_callback: (e) => googleSt.inAttesa && googleSt.inAttesa.no(new Error((e && (e.type || e.message)) === 'popup_closed' ? 'Accesso annullato.' : 'Google non ha concesso l\'accesso' + (e && e.type ? ' (' + e.type + ')' : '') + '.'))
                            });
                        }
                        googleSt.inAttesa = { ok, no };
                        const segno = googleSegno();
                        try { googleSt.client.requestAccessToken(Object.assign({ prompt: '' }, segno && segno.email ? { hint: segno.email } : {})); } catch (e) { no(e); }
                    });
                    if (!risposta || risposta.error || !risposta.access_token) throw new Error('Google non ha concesso l\'accesso' + (risposta && risposta.error ? ' (' + String(risposta.error).slice(0, 60) + ')' : '') + '.');
                    googleSt.token = risposta.access_token;
                    googleSt.scade = Date.now() + Math.max(60, Number(risposta.expires_in) || 3600) * 1000;
                    googleSt.serveTocco = false;
                    return googleSt.token;
                })().catch(e => { googleSt.serveTocco = true; throw e; }).finally(() => { googleSt.richiesta = null; googleSt.inAttesa = null; });
                return googleSt.richiesta;
            }

            /** fetch verso le API di Google con il token (rinnovato in silenzio se serve). Un 401 si ritenta una volta.
             * L'intestazione con il token non si registra e non si mostra mai. */
            async function googleFetch(url, opz) {
                const o = opz || {};
                const prova = async (nuovo) => {
                    if (nuovo) googleSt.token = null;
                    const token = await googleOttieniToken();
                    return fetch(url, Object.assign({}, o, { headers: Object.assign({}, o.headers || {}, { Authorization: 'Bearer ' + token }) }));
                };
                let r = await prova(false);
                if (r.status === 401) r = await prova(true);
                return r;
            }

            /** Chi è collegato (nome e email), dalle API di Drive: nessun permesso in più. */
            async function googleLeggiUtente() {
                const r = await googleFetch('https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)');
                if (!r.ok) throw new Error('Google ha risposto ' + r.status + ' leggendo l\'account.');
                const j = await r.json();
                const u = (j && j.user) || {};
                return { email: String(u.emailAddress || '').slice(0, 200), nome: String(u.displayName || '').slice(0, 200) };
            }

            /** «Accedi con Google»: chiamata da un tocco. Ritorna { ok, motivo?, utente? }. */
            async function googleAccedi() {
                if (!googleAmmesso()) return { ok: false, motivo: GOOGLE_NON_DISPONIBILE };
                if (!googleInRete()) return { ok: false, motivo: 'Serve internet per accedere con Google.' };
                try {
                    await googleOttieniToken();
                    let utente = { email: '', nome: '' };
                    try { utente = await googleLeggiUtente(); } catch (e) { ignoraErrore('google/utente', e); }
                    const prima = googleSegno();
                    googleScriviSegno(utente);
                    googleStatoCambiato();
                    // Un altro account non eredita lo stato di sincronizzazione del precedente (079).
                    if (prima && prima.email && utente.email && prima.email !== utente.email) googleChiama('altroAccount', utente);
                    googleChiama('dopoLogin', utente);
                    return { ok: true, utente };
                } catch (e) {
                    googleStatoCambiato();
                    return { ok: false, motivo: (e && e.message) || 'Accesso non riuscito.' };
                }
            }

            /** «Esci»: toglie il token (e lo revoca se Google è caricato), il segno e la chiave di sessione delle chiavi API.
             * I dati sul dispositivo e su Drive non si toccano. */
            function googleEsci() {
                const token = googleSt.token;
                googleSt.token = null; googleSt.scade = 0; googleSt.serveTocco = false;
                try { if (token && window.google && window.google.accounts && window.google.accounts.oauth2) window.google.accounts.oauth2.revoke(token, () => {}); } catch (e) { ignoraErrore('google/revoca', e); }
                googleScriviSegno(null);
                googleChiama('dopoEsci');
                googleStatoCambiato();
                return { ok: true };
            }

            // ---------- La sezione «Account Google» nelle impostazioni ----------
            const googleEl = (id) => document.getElementById(id);
            function googleStatoCambiato() {
                try {
                    const ammesso = googleAmmesso(), segno = googleSegno();
                    const stato = googleEl('lblGoogleStato'), spiega = googleEl('lblGoogleSpiega');
                    const bAccedi = googleEl('btnGoogleAccedi'), bEsci = googleEl('btnGoogleEsci'), box = googleEl('boxGoogleCollegato');
                    if (!stato) return;
                    if (!ammesso) {
                        stato.textContent = 'Non disponibile qui';
                        spiega.textContent = GOOGLE_NON_DISPONIBILE;
                        bAccedi.disabled = true; bAccedi.style.display = ''; bEsci.style.display = 'none'; box.style.display = 'none';
                        return;
                    }
                    bAccedi.disabled = false;
                    if (segno) {
                        stato.textContent = 'Collegato' + (segno.email ? ': ' + segno.email : (segno.nome ? ': ' + segno.nome : ''));
                        spiega.textContent = 'Le chiavi API e i progetti si sincronizzano con il tuo Drive quando c\'è rete.';
                        bAccedi.style.display = 'none'; bEsci.style.display = ''; box.style.display = '';
                    } else {
                        stato.textContent = 'Non collegato';
                        spiega.textContent = 'Facoltativo. Con l\'account Google puoi tenere le chiavi API (cifrate) e i progetti anche su Drive. L\'app funziona uguale senza rete e senza account.';
                        bAccedi.style.display = ''; bEsci.style.display = 'none'; box.style.display = 'none';
                    }
                    googleChiama('statoCambiato');
                } catch (e) { ignoraErrore('google/stato-ui', e); }
            }

            const googleBtnAccedi = googleEl('btnGoogleAccedi');
            if (googleBtnAccedi) googleBtnAccedi.addEventListener('click', async () => {
                const r = await googleAccedi();
                if (!r.ok) await appDialog(r.motivo, { title: 'Accesso con Google' });
            });
            const googleBtnEsci = googleEl('btnGoogleEsci');
            if (googleBtnEsci) googleBtnEsci.addEventListener('click', async () => {
                if (!(await appDialog('Esci dall\'account Google? I progetti e le chiavi restano sul dispositivo e su Drive; la sincronizzazione si ferma finché non accedi di nuovo.', { confirm: true, title: 'Esci da Google', okLabel: 'Esci' }))) return;
                googleEsci();
                mostraToast('Uscito da Google');
            });

            googleStatoCambiato();
