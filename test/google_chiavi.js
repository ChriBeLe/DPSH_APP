// CHIAVI API CIFRATE SU DRIVE (pezzi 077a e 078 + gli strumenti dell'assistente): Drive e Google finti, WebCrypto vero.
//  · cifratura/decifratura (PBKDF2-SHA256 600000 giri, AES-GCM 256, sale 16, iv 12), frase sbagliata, file toccato o
//    con parametri assurdi; la CryptoKey non è estraibile; iv nuovo a ogni scrittura;
//  · dopo il login: nessun file → propone di salvare (frase due volte, avviso); file c'è → chiede la frase e scarica;
//    chiavi diverse → sceglie l'utente (dispositivo / Drive / unisci per provider);
//  · quando le chiavi cambiano, il file si ricarica; senza rete o scollegato no;
//  · le chiavi non finiscono mai in console, URL, altre voci di localStorage, stato dei progetti, messaggi all'IA.
const { avviaApp } = require('./dati/app_in_jsdom');
const { creaGoogleFinto } = require('./dati/google_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const KEY_GROQ = 'gsk_TESTCHIAVE_groq_0123456789', KEY_OAI = 'sk-TESTCHIAVE_openai_abcdef', KEY_GEM = 'AIzaTESTCHIAVE_gemini_xyz';
const voceIa = (provider) => JSON.stringify({ attivo: false, ordine: ['gemini', 'groq', 'openrouter', 'anthropic', 'openai', 'ollama'], provider });
const conChiavi = (g, provider) => ({ stato: null, primaDellApp: w => { g.installa(w); if (provider) w.localStorage.setItem('DPSH_AI_V1', voceIa(provider)); } });
const attesaPer = async (app, cond, ms) => { const fine = Date.now() + (ms || 6000); while (Date.now() < fine) { if (cond()) return true; await app.attesa(40); } return false; };
const dialogoCon = async (app, re) => { await attesaPer(app, () => { const d = app.dialogo(); return d && re.test(d.testo); }); const d = app.dialogo(); return d && re.test(d.testo) ? d : null; };
const campo = (app, n) => app.d.querySelector('#appDialogFields [data-campo="' + n + '"]');
const chiaviQui = (app) => { const v = JSON.parse(app.w.localStorage.getItem('DPSH_AI_V1') || '{}').provider || {}; const r = {}; Object.keys(v).forEach(k => { if (v[k].chiave) r[k] = v[k].chiave; }); return r; };
const accedi = (app) => app.d.getElementById('btnGoogleAccedi').click();
const tutto = (app) => JSON.stringify(Object.fromEntries(Array.from({ length: app.w.localStorage.length }, (_, i) => [app.w.localStorage.key(i), app.w.localStorage.getItem(app.w.localStorage.key(i))])));

(async () => {
  console.log('--- Cifratura e decifratura ---');
  const g0 = creaGoogleFinto();
  let app = await avviaApp(conChiavi(g0));
  const mappa = { groq: KEY_GROQ, openai: KEY_OAI };
  const cifrato = await app.E(`(async () => { const s = await chiaviNuovaSessione('una frase lunga'); const a = await chiaviCifra(${JSON.stringify(mappa)}, s); const b = await chiaviCifra(${JSON.stringify(mappa)}, s); return { a, b, estr: s.key.extractable, usi: s.key.usages, alg: s.key.algorithm }; })()`);
  const f = cifrato.a;
  t('il file ha v, kdf, iter, salt, iv, ct', f.v === 1 && f.kdf === 'PBKDF2-SHA256' && f.iter === 600000 && ['salt', 'iv', 'ct'].every(k => typeof f[k] === 'string' && f[k].length) && Object.keys(f).sort().join() === 'ct,iter,iv,kdf,salt,v');
  t('sale 16 byte, iv 12 byte, base64', Buffer.from(f.salt, 'base64').length === 16 && Buffer.from(f.iv, 'base64').length === 12);
  t('AES-GCM a 256 bit, la chiave non è estraibile', cifrato.alg.name === 'AES-GCM' && cifrato.alg.length === 256 && cifrato.estr === false);
  t('iv diverso a ogni scrittura, con lo stesso sale', f.iv !== cifrato.b.iv && f.salt === cifrato.b.salt && f.ct !== cifrato.b.ct);
  t('nel file non c\'è nessuna chiave in chiaro', !JSON.stringify(f).includes('TESTCHIAVE') && !Buffer.from(f.ct, 'base64').toString('latin1').includes('TESTCHIAVE'));
  const dec = await app.E(`chiaviDecifra(${JSON.stringify(f)}, 'una frase lunga')`);
  t('con la frase giusta si riapre', JSON.stringify(dec.mappa) === JSON.stringify(mappa));
  const sbagliata = await app.E(`chiaviDecifra(${JSON.stringify(f)}, 'un\\'altra frase').then(() => 'aperto', e => e.codice + '|' + e.message)`);
  t('con la frase sbagliata: errore «frase», senza dettagli', /^frase\|Frase sbagliata/.test(sbagliata) && !sbagliata.includes('TESTCHIAVE'));
  const toccato = Object.assign({}, f, { ct: Buffer.from(Buffer.from(f.ct, 'base64').map((b, i) => i === 3 ? b ^ 1 : b)).toString('base64') });
  t('un byte cambiato nel file: non si apre', await app.E(`chiaviDecifra(${JSON.stringify(toccato)}, 'una frase lunga').then(() => 'aperto', e => e.codice)`) === 'frase');
  const assurdo = await app.E(`chiaviDecifra(${JSON.stringify(Object.assign({}, f, { iter: 900000000 }))}, 'x').then(() => 'aperto', e => e.message)`);
  t('un numero di giri assurdo si rifiuta prima di calcolare', /non è valido/.test(assurdo));
  t('un file di un\'altra versione o con sale/iv di misura sbagliata si rifiuta', await app.E(`chiaviDecifra(${JSON.stringify(Object.assign({}, f, { v: 2 }))}, 'x').then(() => 'aperto', e => 'no')`) === 'no'
    && await app.E(`chiaviDecifra(${JSON.stringify(Object.assign({}, f, { salt: 'AAAA' }))}, 'x').then(() => 'aperto', e => 'no')`) === 'no');
  const puliti = await app.E(`chiaviPulisci({ groq: 'ok123', ollama: 'x', finto: 'y', openai: 5, gemini: 'a\\nb', anthropic: ${JSON.stringify('z'.repeat(500))} })`);
  t('da Drive entrano solo provider noti, con chiave testuale ragionevole', JSON.stringify(puliti) === '{"groq":"ok123"}');
  app.chiudi();

  console.log('--- Dopo il login: Drive vuoto, chiavi sul dispositivo → si propone di salvarle ---');
  const g = creaGoogleFinto();
  app = await avviaApp(conChiavi(g, { groq: { chiave: KEY_GROQ, modello: 'llama-3.3-70b', attivo: true }, openai: { chiave: KEY_OAI, modello: 'gpt-mini' } }));
  accedi(app);
  let d = await dialogoCon(app, /salvare le chiavi API su Drive/);
  t('«Vuoi salvare le chiavi API su Drive, cifrate…» con l\'avviso sulla frase persa', !!d && /Se perdi la frase, dovrai reinserire le chiavi/.test(d.testo));
  d.ok.click();
  d = await dialogoCon(app, /frase che scrivi solo tu/);
  t('la frase si scrive due volte, in campi password', !!d && campo(app, 'frase').type === 'password' && campo(app, 'frase2').type === 'password' && /Se perdi la frase/.test(d.testo));
  campo(app, 'frase').value = 'frase di prova 1'; campo(app, 'frase2').value = 'frase diversa 2';
  d.ok.click();
  d = await dialogoCon(app, /non coincidono/);
  t('due frasi diverse: si richiede', !!d);
  campo(app, 'frase').value = 'frase di prova 1'; campo(app, 'frase2').value = 'frase di prova 1';
  d.ok.click();
  await attesaPer(app, () => g.appData().length === 1 && g.appData()[0].content && g.appData()[0].content.length > 0);
  const su = g.appData()[0];
  t('su Drive c\'è dpsh-chiavi.json in appDataFolder', !!su && su.name === 'dpsh-chiavi.json' && su.parents.includes('appDataFolder'));
  const fileSu = JSON.parse(su.content.toString('utf8'));
  t('formato { v, kdf, iter, salt, iv, ct }, niente in chiaro', Object.keys(fileSu).sort().join() === 'ct,iter,iv,kdf,salt,v' && !su.content.toString('latin1').includes('TESTCHIAVE') && !su.content.toString('utf8').includes('frase di prova'));
  t('la chiave derivata resta in memoria (non estraibile)', app.E('!!chiavi.sessione && chiavi.sessione.key.extractable') === false);
  await app.attesa(300);
  const ivPrima = fileSu.iv;

  console.log('--- Le chiavi cambiano: il file si ricarica ---');
  app.E(`aiConf('gemini').chiave = ${JSON.stringify(KEY_GEM)}; aiSalva();`);
  await attesaPer(app, () => JSON.parse(g.appData()[0].content.toString('utf8')).iv !== ivPrima, 6000);
  const dopo = JSON.parse(g.appData()[0].content.toString('utf8'));
  t('ricaricato con iv nuovo', dopo.iv !== ivPrima && g.appData().length === 1);
  const letto = await app.E(`chiaviDecifra(${JSON.stringify(dopo)}, 'frase di prova 1')`);
  t('dentro ci sono le tre chiavi', Object.keys(letto.mappa).sort().join() === 'gemini,groq,openai' && letto.mappa.gemini === KEY_GEM);
  g.rete = false; app.E(`aiConf('groq').chiave = 'gsk_ALTRA_CHIAVE_000'; aiSalva();`);
  await app.attesa(2200);
  const offlineIv = JSON.parse(g.appData()[0].content.toString('utf8')).iv;
  t('offline: il file su Drive non cambia, la modifica resta in attesa', offlineIv === dopo.iv && app.E('chiavi.daCaricare') === true);
  g.rete = true;
  const richiesteUrl = g.richieste.map(r => r.url).join('\n');
  t('nessuna chiave negli URL delle richieste', !/TESTCHIAVE|ALTRA_CHIAVE|frase/.test(richiesteUrl));
  t('nessuna chiave in console, nè negli errori ignorati', !/TESTCHIAVE|ALTRA_CHIAVE/.test(app.errori.join('\n') + app.avvisi.join('\n') + JSON.stringify(app.E('registroErrori'))));
  const altreVoci = JSON.parse(tutto(app)); delete altreVoci.DPSH_AI_V1;
  t('le chiavi stanno solo nella voce DPSH_AI_V1 del localStorage (stato, sincronizzazione, segno collegato: no)', !/TESTCHIAVE|ALTRA_CHIAVE/.test(JSON.stringify(altreVoci)));
  t('né nello stato dell\'app né in un pacchetto di progetto', !/TESTCHIAVE|ALTRA_CHIAVE/.test(JSON.stringify(app.E('state'))));
  app.chiudi();

  console.log('--- Un altro dispositivo: il file c\'è, serve la frase ---');
  app = await avviaApp(conChiavi(g));
  accedi(app);
  d = await dialogoCon(app, /Scrivi la frase segreta per aprirle/);
  t('chiede la frase (campo password) e offre «Ho perso la frase»', !!d && campo(app, 'frase').type === 'password' && /Ho perso la frase/.test(d.extra.textContent));
  campo(app, 'frase').value = 'frase sbagliata';
  d.ok.click();
  d = await dialogoCon(app, /Frase sbagliata/);
  t('frase sbagliata: si riprova, niente cambia', !!d && Object.keys(chiaviQui(app)).length === 0);
  campo(app, 'frase').value = 'frase di prova 1';
  d.ok.click();
  await attesaPer(app, () => Object.keys(chiaviQui(app)).length === 3);
  t('con la frase giusta le chiavi arrivano sul dispositivo (locali vuote: nessuna domanda)', JSON.stringify(Object.keys(chiaviQui(app)).sort()) === '["gemini","groq","openai"]' && chiaviQui(app).openai === KEY_OAI);
  t('l\'assistente ora le vede come configurate ma non scrive niente in state', !/TESTCHIAVE/.test(JSON.stringify(app.E('state'))));
  app.chiudi();

  console.log('--- Chiavi diverse: sceglie l\'utente ---');
  const scelte = {};
  for (const scelta of ['dispositivo', 'drive', 'unisci']) {
    const gx = creaGoogleFinto();
    // Drive con groq=KEY_GROQ e openai=KEY_OAI
    const seme = await avviaApp(conChiavi(gx, { groq: { chiave: KEY_GROQ }, openai: { chiave: KEY_OAI } }));
    accedi(seme);
    let dd = await dialogoCon(seme, /salvare le chiavi API su Drive/); dd.ok.click();
    dd = await dialogoCon(seme, /frase che scrivi solo tu/);
    campo(seme, 'frase').value = 'frase comune 99'; campo(seme, 'frase2').value = 'frase comune 99'; dd.ok.click();
    await attesaPer(seme, () => gx.appData().length === 1 && gx.appData()[0].content && gx.appData()[0].content.length > 0);
    seme.chiudi();
    // Il dispositivo ha groq diversa e gemini in più.
    const dev = await avviaApp(conChiavi(gx, { groq: { chiave: 'gsk_DEL_DISPOSITIVO_77' }, gemini: { chiave: KEY_GEM } }));
    accedi(dev);
    dd = await dialogoCon(dev, /Scrivi la frase segreta/);
    campo(dev, 'frase').value = 'frase comune 99'; dd.ok.click();
    dd = await dialogoCon(dev, /sono diverse/);
    if (scelta === 'dispositivo') t('chiede quale tenere: 3 scelte più «Decidi dopo»', !!dd && /Tieni quelle del dispositivo/.test(dd.ok.textContent) && /Usa quelle di Drive/.test(dd.extra.textContent) && /Unisci per provider/.test(dd.extra2.textContent) && /Decidi dopo/.test(dd.annulla.textContent));
    (scelta === 'dispositivo' ? dd.ok : scelta === 'drive' ? dd.extra : dd.extra2).click();
    await app.attesa(900);
    const su2 = gx.appData()[0] ? JSON.parse(gx.appData()[0].content.toString('utf8')) : null;
    const apertoSu = su2 ? await dev.E(`chiaviDecifra(${JSON.stringify(su2)}, 'frase comune 99')`) : { mappa: {} };
    scelte[scelta] = { qui: chiaviQui(dev), drive: apertoSu.mappa };
    dev.chiudi();
  }
  t('«dispositivo»: qui invariate, su Drive le sue', scelte.dispositivo.qui.groq === 'gsk_DEL_DISPOSITIVO_77' && !scelte.dispositivo.qui.openai && scelte.dispositivo.drive.groq === 'gsk_DEL_DISPOSITIVO_77' && scelte.dispositivo.drive.gemini === KEY_GEM && !scelte.dispositivo.drive.openai);
  t('«Drive»: qui diventano quelle di Drive, Drive non cambia', scelte.drive.qui.groq === KEY_GROQ && scelte.drive.qui.openai === KEY_OAI && !scelte.drive.qui.gemini && scelte.drive.drive.groq === KEY_GROQ);
  t('«unisci»: per provider vince il dispositivo, e arrivano quelli che mancavano; uguale su Drive',
    scelte.unisci.qui.groq === 'gsk_DEL_DISPOSITIVO_77' && scelte.unisci.qui.openai === KEY_OAI && scelte.unisci.qui.gemini === KEY_GEM && JSON.stringify(Object.entries(scelte.unisci.drive).sort()) === JSON.stringify(Object.entries(scelte.unisci.qui).sort()));

  console.log('--- Frase persa: si può ricominciare, ma solo con conferma ---');
  const gp = creaGoogleFinto();
  const seme = await avviaApp(conChiavi(gp, { groq: { chiave: KEY_GROQ } }));
  accedi(seme);
  let dp = await dialogoCon(seme, /salvare le chiavi API su Drive/); dp.ok.click();
  dp = await dialogoCon(seme, /frase che scrivi solo tu/);
  campo(seme, 'frase').value = 'frase che poi si perde'; campo(seme, 'frase2').value = 'frase che poi si perde'; dp.ok.click();
  await attesaPer(seme, () => gp.appData().length === 1 && gp.appData()[0].content && gp.appData()[0].content.length > 0);
  seme.chiudi();
  const vecchio = gp.appData()[0].content.toString('utf8');
  const dev = await avviaApp(conChiavi(gp, { openai: { chiave: KEY_OAI } }));
  accedi(dev);
  dp = await dialogoCon(dev, /Scrivi la frase segreta/);
  dp.extra.click();
  dp = await dialogoCon(dev, /Le chiavi che ora sono su Drive andranno perse/);
  t('«Ho perso la frase»: avvisa che le chiavi su Drive andranno perse', !!dp);
  dp.annulla.click();
  await dev.attesa(300);
  t('se l\'utente rinuncia, Drive non cambia', gp.appData()[0].content.toString('utf8') === vecchio);
  dev.chiudi();

  console.log('--- Strumenti dell\'assistente: mai le chiavi né la frase ---');
  const gi = creaGoogleFinto();
  const ia = await avviaApp(conChiavi(gi, { groq: { chiave: KEY_GROQ } }));
  const nomi = ia.E('AI_STRUMENTI.map(s => s.n)');
  t('ci sono accedi_google, esci_google, salva_chiavi_su_drive, recupera_chiavi_da_drive', ['accedi_google', 'esci_google', 'salva_chiavi_su_drive', 'recupera_chiavi_da_drive'].every(n => nomi.includes(n)));
  t('sono tutti con conferma (w)', ['accedi_google', 'esci_google', 'salva_chiavi_su_drive', 'recupera_chiavi_da_drive'].every(n => ia.E(`!!AI_STRUMENTI.find(s => s.n === '${n}').w`)));
  t('non c\'è nessuno strumento che legga o mostri le chiavi', !nomi.some(n => /chiav/.test(n) && /leggi|mostra|elenca|vedi/.test(n)));
  const prima = await ia.E(`AI_STRUMENTI.find(s => s.n === 'salva_chiavi_su_drive').run({})`);
  t('senza login risponde «Prima accedi con Google», senza altro', prima.ok === false && /accedi con Google/.test(prima.esito));
  const accedito = await ia.E(`AI_STRUMENTI.find(s => s.n === 'accedi_google').run({})`);
  t('accedi_google dice solo chi è collegato', accedito.ok === true && accedito.account === 'geologo@example.com');
  await attesaPer(ia, () => { const x = ia.dialogo(); return x && /salvare le chiavi API su Drive/.test(x.testo); });
  const dlgSalva = ia.dialogo();
  if (dlgSalva) dlgSalva.ok.click();
  await dialogoCon(ia, /frase che scrivi solo tu/);
  const scherma = await ia.E(`AI_STRUMENTI.find(s => s.n === 'leggi_schermata').run({})`);
  const cp = scherma.controlli.filter(c => c.riservato);
  t('leggi_schermata: i campi frase sono «riservati», senza valore', cp.length === 2 && cp.every(c => c.riservato === true && !('valore' in c)));
  campo(ia, 'frase').value = 'frase dell\'utente'; 
  const prova = await ia.E(`(async () => { try { await AI_STRUMENTI.find(s => s.n === 'compila_campo').run({ id: ${cp[0].id}, valore: 'frase dell IA' }); return 'scritto'; } catch (e) { return e.message; } })()`);
  t('compila_campo non scrive nei campi password', /riservato/.test(prova) && campo(ia, 'frase').value === 'frase dell\'utente');
  campo(ia, 'frase2').value = 'frase dell\'utente';
  ia.dialogo().ok.click();
  await attesaPer(ia, () => gi.appData().length === 1 && gi.appData()[0].content && gi.appData()[0].content.length > 0);
  t('la frase la scrive l\'utente: il file è su Drive', gi.appData().length === 1);
  const esci = await ia.E(`AI_STRUMENTI.find(s => s.n === 'esci_google').run({})`);
  t('esci_google: la sessione delle chiavi si dimentica', esci.ok === true && ia.E('chiavi.sessione') === null);
  t('niente chiavi in tutto quello che l\'assistente ha potuto restituire', !/TESTCHIAVE/.test(JSON.stringify([prima, accedito, scherma, esci])));
  ia.chiudi();

  console.log('\n' + ok + ' ok, ' + ko + ' ko');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO  errore nel test: ' + (e && e.stack || e)); process.exit(1); });
