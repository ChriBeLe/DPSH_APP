// LOGIN CON GOOGLE (pezzo 077): Google Identity Services finto, nessuna rete vera.
//  · lo script di Google non si carica finché l'utente non preme «Accedi con Google» (né a chi non ha mai fatto il login);
//  · Client ID e scope giusti, prompt '' (nessuna finestra in più), nessun client secret;
//  · il token d'accesso sta solo in memoria: in localStorage solo il segno «collegato» con email e nome;
//  · token scaduto → se ne chiede uno nuovo in silenzio; senza rete il login non parte nemmeno;
//  · in APK/Electron (e fuori da https) il tasto è spento con la spiegazione; «Esci» toglie tutto e revoca il token.
const { avviaApp } = require('./dati/app_in_jsdom');
const { creaGoogleFinto } = require('./dati/google_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const tuttoLocalStorage = (app) => JSON.stringify(Object.fromEntries(Array.from({ length: app.w.localStorage.length }, (_, i) => [app.w.localStorage.key(i), app.w.localStorage.getItem(app.w.localStorage.key(i))])));

(async () => {
  console.log('--- Lo script di Google non si carica da solo ---');
  const g = creaGoogleFinto();
  let app = await avviaApp({ stato: null, primaDellApp: w => g.installa(w) });
  t('all\'avvio, senza login, nessuno script di Google', g.gisCaricato === 0 && !app.w.google);
  const btn = app.d.getElementById('btnGoogleAccedi');
  t('il tasto «Accedi con Google» c\'è ed è attivo (https)', !!btn && !btn.disabled && /Accedi con Google/.test(btn.textContent));
  t('«Non collegato»', /Non collegato/.test(app.d.getElementById('lblGoogleStato').textContent));

  console.log('--- Il login ---');
  btn.click();
  await app.attesa(300);
  t('lo script si carica una volta sola', g.gisCaricato === 1);
  t('Client ID e scope giusti, nessun client secret', g.config && g.config.client_id === '43317256953-s1v0k8dpivor9i9ph899v0jbmof29nk4.apps.googleusercontent.com'
    && g.config.scope === 'https://www.googleapis.com/auth/drive.appdata https://www.googleapis.com/auth/drive.file' && !('client_secret' in g.config));
  t('prompt vuoto: nessuna schermata di consenso in più', g.gisRichieste.length === 1 && g.gisRichieste[0].prompt === '');
  t('lo stato dice chi è collegato', /Collegato: geologo@example\.com/.test(app.d.getElementById('lblGoogleStato').textContent));
  t('compare «Esci», sparisce «Accedi»', app.d.getElementById('btnGoogleAccedi').style.display === 'none' && app.d.getElementById('btnGoogleEsci').style.display === '');
  const ls = tuttoLocalStorage(app);
  t('in localStorage solo il segno collegato (email e nome)', JSON.parse(app.w.localStorage.getItem('dpsh_google_collegato')).email === 'geologo@example.com' && JSON.parse(app.w.localStorage.getItem('dpsh_google_collegato')).nome === 'Geologo Prova');
  t('il token d\'accesso NON è in localStorage né sessionStorage', !/tok_\d/.test(ls) && !/tok_\d/.test(JSON.stringify(Object.assign({}, app.w.sessionStorage))));
  t('le richieste a Drive portano il token, che non compare nell\'URL', g.richieste.length > 0 && g.richieste.every(r => /^Bearer tok_/.test(r.intest.Authorization) && !/tok_/.test(r.url)));

  console.log('--- Token scaduto: se ne chiede uno nuovo in silenzio ---');
  app.E('googleSt.scade = Date.now() - 1');
  const prima = g.gisRichieste.length;
  const r = await app.E(`googleFetch('https://www.googleapis.com/drive/v3/about?fields=user')`);
  t('un nuovo token, con prompt vuoto, e la richiesta riesce', g.gisRichieste.length === prima + 1 && g.gisRichieste[prima].prompt === '' && r.ok);
  g.tokenValidi.clear();
  const r2 = await app.E(`googleFetch('https://www.googleapis.com/drive/v3/about?fields=user')`);
  t('un 401 dal server: si richiede il token e si riprova una volta', r2.ok && g.gisRichieste.length === prima + 2);
  g.gisRifiuta = true;
  app.E('googleSt.scade = 0');
  let errore = '';
  try { await app.E(`googleOttieniToken()`); } catch (e) { errore = e.message; }
  t('se il browser non lascia aprire la finestra, errore chiaro e «serve un tocco»', /non ha concesso/.test(errore) && app.E('googleSt.serveTocco') === true);
  g.gisRifiuta = false;

  console.log('--- Esci ---');
  const tokenPrima = app.E('googleSt.token');
  app.d.getElementById('btnGoogleEsci').click();
  await app.attesa(100);
  const dlg = app.dialogo();
  t('chiede conferma', !!dlg && /Esci dall'account Google/.test(dlg.testo));
  dlg.ok.click();
  await app.attesa(100);
  t('segno tolto, token dimenticato (e revocato)', app.w.localStorage.getItem('dpsh_google_collegato') === null && app.E('googleSt.token') === null && g.revocati.includes(tokenPrima));
  t('di nuovo «Non collegato»', /Non collegato/.test(app.d.getElementById('lblGoogleStato').textContent));
  app.chiudi();

  console.log('--- Senza rete il login non parte, e lo script non si carica ---');
  const g2 = creaGoogleFinto();
  app = await avviaApp({ stato: null, primaDellApp: w => { g2.installa(w); Object.defineProperty(w.navigator, 'onLine', { get: () => false }); } });
  app.d.getElementById('btnGoogleAccedi').click();
  await app.attesa(300);
  const d2 = app.dialogo();
  t('«Serve internet per accedere con Google»', !!d2 && /Serve internet/.test(d2.testo));
  t('lo script di Google non è stato caricato', g2.gisCaricato === 0);
  if (d2) d2.ok.click();
  app.chiudi();

  console.log('--- APK ed Electron: tasto spento con la spiegazione ---');
  const g3 = creaGoogleFinto();
  app = await avviaApp({ stato: null, primaDellApp: w => { g3.installa(w); w.electronAPI = {}; } });
  const b3 = app.d.getElementById('btnGoogleAccedi');
  t('tasto disattivato', b3.disabled === true);
  t('spiegazione: «Il login funziona dalla versione web o installata dal browser»', /Il login funziona dalla versione web o installata dal browser/.test(app.d.getElementById('lblGoogleSpiega').textContent));
  const rr = await app.E('googleAccedi()');
  t('googleAccedi() rifiuta e non carica niente', rr.ok === false && g3.gisCaricato === 0);
  app.chiudi();
  const g4 = creaGoogleFinto();
  app = await avviaApp({ stato: null, primaDellApp: w => { g4.installa(w); w.Capacitor = {}; } });
  t('Capacitor (APK): tasto disattivato', app.d.getElementById('btnGoogleAccedi').disabled === true);
  app.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' ko');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO  errore nel test: ' + (e && e.stack || e)); process.exit(1); });
