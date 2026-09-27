            // ===== DIALOGHI IN-APP (sostituiscono alert/confirm nativi) =====
            // I dialoghi nativi del browser non sono personalizzabili, rompono l'estetica
            // dell'app e su Android mostrano l'URL della pagina. Qui vengono rimpiazzati da una
            // finestra coerente con il resto dell'interfaccia. Il tipo (info/errore/conferma)
            // viene dedotto dal testo, così le ~55 chiamate esistenti non vanno riscritte.
            const _appDialog = {
                overlay: null, box: null, icon: null, titleText: null, msg: null, ok: null, cancel: null, extra: null,
                resolver: null, init: false
            };

            function _initAppDialog() {
                if (_appDialog.init) return;
                _appDialog.overlay = document.getElementById('appDialogOverlay');
                _appDialog.box = document.getElementById('appDialog');
                _appDialog.icon = document.getElementById('appDialogIcon');
                _appDialog.titleText = document.getElementById('appDialogTitleText');
                _appDialog.msg = document.getElementById('appDialogMessage');
                _appDialog.ok = document.getElementById('appDialogOk');
                _appDialog.cancel = document.getElementById('appDialogCancel');
                _appDialog.extra = document.getElementById('appDialogExtra');
                _appDialog.extra2 = document.getElementById('appDialogExtra2');
                _appDialog.fields = document.getElementById('appDialogFields');
                if (!_appDialog.box) return;

                _appDialog.ok.addEventListener('click', () => _closeAppDialog(true));
                _appDialog.cancel.addEventListener('click', () => _closeAppDialog(false));
                if (_appDialog.extra) _appDialog.extra.addEventListener('click', () => _closeAppDialog('extra'));
                if (_appDialog.extra2) _appDialog.extra2.addEventListener('click', () => _closeAppDialog('extra2'));

                // ESC e click sullo sfondo equivalgono ad "annulla": è importante che risolvano
                // comunque la promise, altrimenti il codice in attesa resterebbe bloccato.
                if (_appDialog.overlay) {
                    _appDialog.overlay.addEventListener('click', () => {
                        if (_appDialog.resolver) _closeAppDialog(false);
                    });
                }
                document.addEventListener('keydown', (e) => {
                    if (e.key === 'Escape' && _appDialog.resolver) _closeAppDialog(false);
                });

                _appDialog.init = true;
            }

            /** Legge i campi attualmente mostrati nel dialogo. Ritorna un oggetto {nome: valore}
             * oppure null se manca un campo obbligatorio (in quel caso il dialogo NON si chiude e
             * il campo colpevole viene evidenziato: è la differenza pratica principale rispetto al
             * prompt() nativo, che accettava anche un nome di template vuoto). */
            function _leggiCampiAppDialog() {
                if (!_appDialog.fields || !_appDialog.campiAttivi || _appDialog.campiAttivi.length === 0) return {};
                const valori = {};
                let primoNonValido = null;
                _appDialog.campiAttivi.forEach(def => {
                    const el = _appDialog.fields.querySelector(`[data-campo="${def.name}"]`);
                    if (!el) return;
                    let v = el.value;
                    if (def.type === 'number') {
                        const n = parseFloat(v);
                        if (!isFinite(n)) { if (def.required !== false && !primoNonValido) primoNonValido = el; }
                        else v = n;
                    } else {
                        v = String(v == null ? '' : v);
                        if (def.required && !v.trim() && !primoNonValido) primoNonValido = el;
                    }
                    valori[def.name] = v;
                });
                if (primoNonValido) {
                    primoNonValido.style.borderColor = 'var(--danger)';
                    primoNonValido.focus();
                    return null;
                }
                return valori;
            }

            function _closeAppDialog(result) {
                // Con i campi attivi, "OK" deve prima superare la validazione: se un obbligatorio è
                // vuoto si resta aperti invece di risolvere con un dato inutilizzabile.
                let valori = null;
                if (result === true && _appDialog.campiAttivi && _appDialog.campiAttivi.length > 0) {
                    valori = _leggiCampiAppDialog();
                    if (valori === null) return;
                }
                if (_appDialog.overlay) _appDialog.overlay.classList.remove('open');
                if (_appDialog.box) _appDialog.box.classList.remove('open');
                const r = _appDialog.resolver;
                _appDialog.resolver = null;
                _appDialog.campiAttivi = null;
                if (_appDialog.fields) { _appDialog.fields.innerHTML = ''; _appDialog.fields.style.display = 'none'; }
                if (r) r(valori !== null ? { ok: true, valori } : result);
            }

            // Deduce aspetto e titolo dal contenuto del messaggio
            function _dialogStyleFor(message) {
                const m = String(message || '');
                if (/^\s*(⚠️|⚠)/.test(m) || /errore|impossibile|non riuscit|fallit|non supportat|bloccat/i.test(m)) {
                    return { icon: 'alert', color: 'var(--danger)', title: 'Attenzione' };
                }
                if (/^\s*(✅|✓)/.test(m) || /completat|riuscit|salvat|importat/i.test(m)) {
                    return { icon: 'check', color: 'var(--success)', title: 'Fatto' };
                }
                return { icon: 'info', color: 'var(--info)', title: 'Informazione' };
            }

            // Rimuove eventuali emoji iniziali: l'icona ora è grafica
            function _cleanDialogText(message) {
                return String(message === undefined || message === null ? '' : message)
                    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF\uFE0F]/gu, '')
                    .replace(/^\s+/, '')
                    .trim();
            }

            /** Coda dei dialoghi. Prima, due appAlert() ravvicinati si contendevano l'unica finestra
             * esistente: il secondo sovrascriveva il primo, che spariva prima di poter essere letto,
             * e il resolver del primo veniva rimpiazzato — la sua Promise non si risolveva mai.
             * Ora un dialogo aperto non viene più scavalcato: il successivo aspetta il suo turno.
             * Nessun chiamante va toccato, perché appDialog continua a ritornare una Promise con lo
             * stesso significato di prima: cambia solo QUANDO si apre, non cosa restituisce. */
            let _codaDialoghi = Promise.resolve();
            function appDialog(message, opzioni = {}) {
                const esecuzione = _codaDialoghi.then(() => _appDialogOra(message, opzioni));
                // La coda prosegue anche se un dialogo va storto: un errore non deve bloccare per
                // sempre tutti gli avvisi successivi.
                _codaDialoghi = esecuzione.catch(() => {});
                return esecuzione;
            }

            // icona/coloreIcona (Fase 1): per gli avvisi che devono sembrare avvisi senza avere il tasto
            // rosso di «danger» (che vuol dire «questa azione cancella»). Senza, l'icona si deduce dal
            // testo come prima, e un «dati salvati…» diventava una spunta verde.
            function _appDialogOra(message, { confirm = false, title = null, danger = false, extraLabel = null, extra2Label = null, okLabel = null, cancelLabel = null, fields = null, icona = null, coloreIcona = null } = {}) {
                _initAppDialog();
                if (!_appDialog.box) {
                    // Fallback estremo: se il markup non esiste, non lasciare l'utente senza risposta.
                    // Con i campi si ricade sul prompt() nativo — meno bello ma meglio che una
                    // funzione che non risponde: è l'ultima rete, non il percorso normale.
                    if (fields && fields.length > 0) {
                        const valori = {};
                        for (const f of fields) {
                            const r = window.prompt(f.label || message, f.value != null ? String(f.value) : '');
                            if (r === null) return Promise.resolve(false);
                            valori[f.name] = f.type === 'number' ? parseFloat(r) : r;
                        }
                        return Promise.resolve({ ok: true, valori });
                    }
                    return Promise.resolve(confirm ? window.confirm(message) : true);
                }
                const st = _dialogStyleFor(message);
                const iconName = icona || (danger ? 'alert' : (confirm ? 'info' : st.icon));
                const iconColor = coloreIcona || (danger ? 'var(--danger)' : (confirm ? 'var(--accent)' : st.color));

                _appDialog.icon.innerHTML = `<svg class="ico ico-lg" style="color:${iconColor}"><use href="#i-${iconName}"/></svg>`;
                _appDialog.titleText.textContent = title || (danger ? 'Conferma eliminazione' : (confirm ? 'Conferma' : st.title));
                _appDialog.msg.textContent = _cleanDialogText(message);
                _appDialog.cancel.style.display = confirm ? 'inline-flex' : 'none';
                _appDialog.cancel.textContent = cancelLabel || 'Annulla';

                if (danger) {
                    _appDialog.ok.textContent = okLabel || 'Elimina';
                    _appDialog.ok.style.background = 'var(--danger)';
                    _appDialog.ok.style.color = 'var(--on-solid)';
                } else {
                    _appDialog.ok.textContent = okLabel || (confirm ? 'Conferma' : 'OK');
                    _appDialog.ok.style.background = 'var(--accent)';
                    _appDialog.ok.style.color = 'var(--on-accent)';
                }

                if (_appDialog.extra) {
                    _appDialog.extra.style.display = extraLabel ? 'inline-flex' : 'none';
                    if (extraLabel) _appDialog.extra.textContent = extraLabel;
                }
                if (_appDialog.extra2) {
                    _appDialog.extra2.style.display = extra2Label ? 'inline-flex' : 'none';
                    if (extra2Label) _appDialog.extra2.textContent = extra2Label;
                }

                // Campi: costruiti qui e svuotati alla chiusura, così un dialogo senza "fields" si
                // comporta esattamente come prima (l'area resta display:none e campiAttivi è null).
                _appDialog.campiAttivi = (fields && fields.length > 0) ? fields : null;
                if (_appDialog.fields) {
                    if (_appDialog.campiAttivi) {
                        _appDialog.fields.innerHTML = fields.map(f => {
                            const comuni = `data-campo="${f.name}" style="width:100%; box-sizing:border-box; font-size:13px; padding:9px 10px; border:1px solid var(--border); border-radius:8px; background:var(--bg-main); color:var(--text-main);"`;
                            const valore = f.value != null ? String(f.value) : '';
                            // La TENDINA: serve quando la risposta non e' un testo libero ma una
                            // fra alternative note — per esempio a quale figura punta un
                            // riferimento. Senza, l'unica strada era «cancella e riscrivi», che
                            // non e' una risposta.
                            const opzioni = (f.options || []).map(o => {
                                const val = (o && o.value !== undefined) ? o.value : o;
                                const eti = (o && o.label !== undefined) ? o.label : String(val);
                                return `<option value="${escapeHtmlDidascalia(String(val))}"${String(val) === valore ? ' selected' : ''}>${escapeHtmlDidascalia(String(eti))}</option>`;
                            }).join('');
                            const campo = f.type === 'select'
                                ? `<select ${comuni}>${opzioni}</select>`
                                : (f.multiline
                                ? `<textarea ${comuni} rows="3" placeholder="${escapeHtmlDidascalia(f.placeholder || '')}">${escapeHtmlDidascalia(valore)}</textarea>`
                                : `<input type="${f.type === 'number' ? 'number' : 'text'}" ${comuni} value="${escapeHtmlDidascalia(valore)}" placeholder="${escapeHtmlDidascalia(f.placeholder || '')}"${f.type === 'number' ? ` min="${f.min != null ? f.min : ''}" max="${f.max != null ? f.max : ''}" step="${f.step != null ? f.step : 1}"` : ''}>`);
                            return `<label style="display:flex; flex-direction:column; gap:5px; font-size:11.5px; font-weight:700; color:var(--text-muted);">${f.label ? escapeHtmlDidascalia(f.label) : ''}${campo}</label>`;
                        }).join('');
                        _appDialog.fields.style.display = 'flex';
                        // Invio = OK (solo sui campi a riga singola: in un textarea Invio va a capo).
                        _appDialog.fields.querySelectorAll('input').forEach(inp => {
                            inp.addEventListener('keydown', (ev) => {
                                if (ev.key === 'Enter') { ev.preventDefault(); _closeAppDialog(true); }
                            });
                            // Toglie l'evidenziazione rossa appena l'utente rimedia
                            inp.addEventListener('input', () => { inp.style.borderColor = 'var(--border)'; });
                        });
                    } else {
                        _appDialog.fields.innerHTML = '';
                        _appDialog.fields.style.display = 'none';
                    }
                }
                // Il messaggio può restare vuoto quando i campi si spiegano da soli (es. "Nome del
                // template"): in quel caso si nasconde per non lasciare uno spazio morto.
                _appDialog.msg.style.display = _cleanDialogText(message) ? '' : 'none';

                _appDialog.overlay.classList.add('open');
                _appDialog.box.classList.add('open');
                if (_appDialog.campiAttivi) {
                    const primo = _appDialog.fields && _appDialog.fields.querySelector('[data-campo]');
                    if (primo) setTimeout(() => { primo.focus(); if (primo.select) primo.select(); }, 60);
                }
                return new Promise(res => { _appDialog.resolver = res; });
            }

            const appAlert = (msg) => appDialog(msg, { confirm: false });
            const appConfirm = (msg) => appDialog(msg, { confirm: true });
            const appConfirmDelete = (msg) => appDialog(msg, { confirm: true, danger: true });

            // ===== TOAST DELL'APP (Fase 3) =====
            // Per ciò che è andato bene: un avviso in basso che sparisce da solo, senza bloccare lo
            // schermo come un dialogo. Con un'azione («Annulla») quando si può tornare indietro.
            // Errori e domande restano dialoghi (appAlert/appConfirm): una conferma che sparisce
            // da sola va bene per «fatto», non per «attenzione». Nasce da mostraToastTemplateEditor,
            // che era l'unico toast dell'app e ora passa di qui.
            //   mostraToast('Importati 40 intervalli')
            //   mostraToast('Registrato 8,00–8,20 m · 14 colpi', { azione: { etichetta: 'Annulla', fn } })
            // Un toast nuovo prende il posto di quello visibile (e della sua azione).
            const toastApp = { el: null, timer: null, azione: null };
            function mostraToast(testo, opzioni = {}) {
                if (!toastApp.el) {
                    const el = document.createElement('div');
                    el.id = 'toastApp';
                    el.className = 'toast-app';
                    el.setAttribute('role', 'status');
                    el.setAttribute('aria-live', 'polite');
                    el.innerHTML = '<span class="toast-testo" id="toastAppTesto"></span><button type="button" class="toast-azione" id="toastAppAzione"></button>';
                    document.body.appendChild(el);
                    toastApp.el = el;
                    el.querySelector('.toast-azione').addEventListener('click', () => {
                        const fn = toastApp.azione;
                        nascondiToast();
                        if (typeof fn === 'function') fn();
                    });
                }
                const el = toastApp.el;
                el.querySelector('.toast-testo').textContent = _cleanDialogText(testo);
                const bottone = el.querySelector('.toast-azione');
                const azione = opzioni.azione && typeof opzioni.azione.fn === 'function' ? opzioni.azione : null;
                toastApp.azione = azione ? azione.fn : null;
                bottone.textContent = azione ? (azione.etichetta || 'Annulla') : '';
                bottone.style.display = azione ? '' : 'none';
                clearTimeout(toastApp.timer);
                el.classList.remove('visibile');
                void el.offsetWidth; // riparte l'entrata anche se il toast era già visibile
                el.classList.add('visibile');
                toastApp.timer = setTimeout(nascondiToast, opzioni.durata || 5000);
                return el;
            }
            function nascondiToast() {
                clearTimeout(toastApp.timer);
                toastApp.timer = null;
                toastApp.azione = null;
                if (toastApp.el) toastApp.el.classList.remove('visibile');
            }
            /** Un esito con eventuali aggiunte (anomalie, foto mancanti, voci rinominate): se non c'è
             * niente da aggiungere è una conferma di successo e va nel toast; altrimenti c'è qualcosa
             * da leggere con calma, e resta un dialogo con tutto il testo. */
            function toastODialogo(principale, aggiunte) {
                const extra = String(aggiunte || '').trim();
                if (!extra) { mostraToast(principale); return Promise.resolve(true); }
                return appAlert(principale + '\n\n' + extra);
            }

            /** Registra un errore che è stato deliberatamente ignorato, dicendo DOVE è successo.
             * Nasce da un problema concreto: nel file c'erano 22 blocchi di cattura errore totalmente
             * vuoti. Ignorare un errore è spesso la scelta giusta (non si deve interrompere una
             * stampa perché un controllo secondario è fallito), ma buttare via anche il MOTIVO
             * significa che quando qualcosa "non funziona e basta" non resta niente da leggere per
             * capirlo. Qui l'errore continua a non interrompere nulla, però lascia una traccia con
             * l'etichetta del punto in cui è avvenuto. */
            function ignoraErrore(dove, e) {
                try { console.debug('[ignorato] ' + dove + ':', e); } catch (_) { /* console non disponibile */ }
            }

            /** Sostituto in-app di prompt(). Stesso CONTRATTO del nativo — ritorna il testo inserito
             * oppure null se l'utente annulla — ma asincrono, perché un dialogo che vive nella pagina
             * non può bloccare il thread come faceva quello del browser. Ogni chiamante va quindi
             * atteso con await: è l'unica differenza, ed è il motivo per cui la sostituzione si fa
             * punto per punto invece che con uno scambio globale come è stato per alert().
             * Perché sostituirlo: il prompt() nativo è soppresso o degradato da diversi browser in
             * modalità standalone/PWA (questa app dichiara display:standalone), e lì la funzione
             * diventerebbe irraggiungibile senza dare alcun messaggio. */
            async function appPrompt(messaggio, valorePredefinito = '', opzioni = {}) {
                const r = await appDialog(messaggio || '', {
                    confirm: true,
                    title: opzioni.title || 'Inserisci',
                    okLabel: opzioni.okLabel || 'Conferma',
                    cancelLabel: opzioni.cancelLabel || 'Annulla',
                    fields: [{
                        name: 'valore',
                        label: opzioni.label || '',
                        value: valorePredefinito,
                        placeholder: opzioni.placeholder || '',
                        multiline: !!opzioni.multiline,
                        required: opzioni.required !== false
                    }]
                });
                return (r && r.ok) ? r.valori.valore : null;
            }

            /** Variante a più campi: un solo dialogo al posto di due prompt() consecutivi (righe e
             * colonne di una tabella, indirizzo e testo di un link). Ritorna {nome: valore} oppure
             * null se annullato. */
            async function appPromptCampi(messaggio, campi, opzioni = {}) {
                const r = await appDialog(messaggio || '', {
                    confirm: true,
                    title: opzioni.title || 'Inserisci',
                    okLabel: opzioni.okLabel || 'Conferma',
                    cancelLabel: opzioni.cancelLabel || 'Annulla',
                    fields: campi
                });
                return (r && r.ok) ? r.valori : null;
            }

            // Sostituzione globale: tutte le chiamate esistenti a alert() usano ora la finestra
            // dell'app. confirm() resta sincrono per compatibilità con il codice che ne usa il
            // valore di ritorno dentro un if, quindi viene mantenuto quello nativo dove serve.
            window.alert = function (msg) { appAlert(msg); };

