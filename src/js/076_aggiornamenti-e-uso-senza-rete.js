            // ===================== VERSIONE WEB: SERVICE WORKER E AGGIORNAMENTI =====================
            // Su https://dpsh.netlify.app l'app si installa (PWA) e funziona senza rete grazie a web/sw.js.
            // Il service worker si registra SOLO su https o su localhost: mai nell'APK (file://, o il
            // contenitore Capacitor/Cordova) né in Electron, dove l'app è già un file locale e un worker
            // metterebbe in cache una copia che nessuno aggiorna. Quando esce una versione nuova il worker
            // nuovo resta «in attesa» e qui si avvisa con un toast (non invadente, con il tasto Ricarica):
            // niente ricaricamenti a sorpresa mentre si registrano i colpi.
            const swApp = { registrazione: null, ricarica: false, ultimoControllo: 0 };

            /** Vero se qui ha senso un service worker: pagina su https o localhost, non APK né Electron. */
            function serviceWorkerAmmesso() {
                try {
                    if (!('serviceWorker' in navigator)) return false;
                    if (window.Capacitor || window.cordova || window.electronAPI || /Electron\//.test(navigator.userAgent || '')) return false;
                    const h = location.hostname;
                    return location.protocol === 'https:' || h === 'localhost' || h === '127.0.0.1' || h === '[::1]';
                } catch (e) { return false; }
            }

            /** Avviso «Nuova versione disponibile»: il tasto attiva il worker in attesa e ricarica la pagina. */
            function avvisaNuovaVersioneApp(reg) {
                mostraToast('Nuova versione disponibile: ricarica', {
                    durata: 20000,
                    azione: { etichetta: 'Ricarica', fn: () => attivaNuovaVersioneApp(reg) }
                });
            }

            function attivaNuovaVersioneApp(reg) {
                const attesa = reg && reg.waiting;
                if (!attesa) { location.reload(); return; }
                swApp.ricarica = true; // la pagina si ricarica quando il worker nuovo prende il controllo
                attesa.postMessage('SKIP_WAITING');
            }

            /** Guarda se c'è un worker nuovo in attesa e, se sì, avvisa. Ritorna true se c'è. */
            function versioneNuovaInAttesa(reg) {
                if (reg && reg.waiting && navigator.serviceWorker.controller) { avvisaNuovaVersioneApp(reg); return true; }
                return false;
            }

            /** Registra il worker e segue i suoi aggiornamenti. Non fa niente dove non è ammesso. */
            async function registraServiceWorker() {
                if (!serviceWorkerAmmesso()) return null;
                try {
                    const reg = await navigator.serviceWorker.register('sw.js');
                    swApp.registrazione = reg;
                    versioneNuovaInAttesa(reg);
                    reg.addEventListener('updatefound', () => {
                        const nuovo = reg.installing;
                        if (nuovo) nuovo.addEventListener('statechange', () => { if (nuovo.state === 'installed') versioneNuovaInAttesa(reg); });
                    });
                    navigator.serviceWorker.addEventListener('controllerchange', () => { if (swApp.ricarica) location.reload(); });
                    // Un controllo quando si torna all'app dopo un po' (telefono in tasca tutto il giorno).
                    document.addEventListener('visibilitychange', () => {
                        if (document.visibilityState === 'visible' && Date.now() - swApp.ultimoControllo > 3600000) controllaAggiornamentiApp().catch(e => ignoraErrore('sw/controllo', e));
                    });
                    return reg;
                } catch (e) { ignoraErrore('sw/registra', e); return null; }
            }

            /** Controlla ora se c'è una versione nuova dell'app. Ritorna { supportato, nuovaVersione, motivo? }:
             * se c'è, mostra l'avviso. Dove il service worker non c'è (APK, desktop, file locale) lo dice. */
            async function controllaAggiornamentiApp() {
                const reg = swApp.registrazione;
                if (!reg) return { supportato: false, nuovaVersione: false, motivo: 'Gli aggiornamenti automatici ci sono solo nella versione web (dpsh.netlify.app): qui l\'app è un file locale e si aggiorna reinstallandola.' };
                swApp.ultimoControllo = Date.now();
                await reg.update();
                if (reg.installing) {
                    await new Promise(fine => {
                        const w = reg.installing;
                        const chiudi = () => { clearTimeout(t); fine(); };
                        const t = setTimeout(fine, 15000);
                        w.addEventListener('statechange', () => { if (w.state === 'installed' || w.state === 'redundant') chiudi(); });
                    });
                }
                return { supportato: true, nuovaVersione: versioneNuovaInAttesa(reg) };
            }

            if (document.readyState === 'complete') registraServiceWorker();
            else window.addEventListener('load', registraServiceWorker);
