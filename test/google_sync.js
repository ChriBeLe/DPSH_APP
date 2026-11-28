// SINCRONIZZAZIONE DEI PROGETTI SU DRIVE (pezzo 079): Drive e Google finti, due «dispositivi».
//  · prima sincronizzazione: anteprima; poi carica; un file per progetto «<nome> - <id>.zip» che è il pacchetto di progetto (si apre con l'import);
//  · cambiato solo qui → carica; solo su Drive → copia automatica e sostituisce; in tutti e due → tiene entrambi; nuovo su Drive → scarica;
//  · nessuna cancellazione: eliminato qui / sparito da Drive restano in sospeso; elenco vuoto o incompleto ≠ tutto eliminato; cestino mai delete;
//  · la sincronizzazione automatica fa solo le azioni sicure; offline si aspetta; registro delle ultime 20; nessuna chiave in niente.
const fs = require('fs');
const path = require('path');
const { avviaApp, telefonoV0 } = require('./dati/app_in_jsdom');
const { creaGoogleFinto } = require('./dati/google_finto');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const NARDO = 'PROJ_Nard__1790450327664', COPERTINO = 'PROJ_Copertino_1790450355704';
const KEY = 'gsk_TESTCHIAVE_sync_000111';
const nuovo = (g, conStato) => avviaApp({ stato: conStato === false ? null : STATO_V0, idb: telefonoV0(), primaDellApp: w => { g.installa(w); w.localStorage.setItem('DPSH_AI_V1', JSON.stringify({ attivo: false, provider: { groq: { chiave: KEY } } })); w.localStorage.setItem('dpsh_chiavi_drive_no', '1'); } });
const attesaPer = async (app, cond, ms) => { const fine = Date.now() + (ms || 8000); while (Date.now() < fine) { if (cond()) return true; await app.attesa(50); } return false; };
const accedi = async (app) => { app.d.getElementById('btnGoogleAccedi').click(); await attesaPer(app, () => { const d = app.dialogo(); return d && /Prima sincronizzazione/.test(d.titolo); }); };
const stato = (app) => JSON.parse(app.w.localStorage.getItem('dpsh_sync_drive') || '{}');
const manuale = async (app) => { const p = app.E('sincronizza({ auto: false })'); return p; };
const modifica = (app, id, nome) => app.E(`(() => { const p = state.projects[${JSON.stringify(id)}]; p.name = ${JSON.stringify(nome)}; p.modificatoIl = new Date().toISOString(); saveState(); return true; })()`);
const rispondi = async (app, re, bottone) => { await attesaPer(app, () => { const d = app.dialogo(); return d && re.test(d.testo); }); const d = app.dialogo(); if (!d) return null; (bottone ? d[bottone] : d.ok).click(); return d; };

(async () => {
  const g = creaGoogleFinto();
  const A = await nuovo(g);
  console.log('--- Prima sincronizzazione: anteprima, poi carica ---');
  const p1 = A.E('sincronizza({ auto: false })');
  const dlg = await (async () => { await attesaPer(A, () => A.dialogo()); return A.dialogo(); })();
  // Non collegato: nessun tentativo
  t('senza login non parte', (await p1).ok === false && /accedi con Google/.test((await p1).esito) && g.richieste.length === 0 && !dlg);
  A.w.localStorage.setItem('dpsh_google_collegato', JSON.stringify({ email: 'geologo@example.com', nome: 'G' }));
  const p2 = A.E('sincronizza({ auto: false })');
  await attesaPer(A, () => A.dialogo());
  const d = A.dialogo();
  t('prima volta: anteprima con i due progetti da caricare e «niente viene cancellato»', !!d && /Prima sincronizzazione/.test(d.titolo) && /Carico su Drive \(2\)/.test(d.testo) && d.testo.includes('Nardò - Scuola Via Roma') && /Niente viene cancellato/.test(d.testo));
  t('l\'anteprima non ha ancora scritto niente su Drive', g.progetti().length === 0);
  d.annulla.click();
  const r0 = await p2;
  t('Annulla: nessun cambiamento, nessuna cartella creata', /Annullato/.test(r0.esito) && g.progetti().length === 0 && !g.cartella());
  const p3 = A.E('sincronizza({ auto: false })');
  await rispondi(A, /Carico su Drive/);
  const r1 = await p3;
  t('Conferma: due caricati', r1.ok && /2 caricati/.test(r1.esito) && g.progetti().length === 2);
  const cart = g.cartella();
  t('cartella visibile «DPSH» creata dall\'app', !!cart && cart.name === 'DPSH' && g.progetti().every(f => f.parents.includes(cart.id)));
  const fN = g.progetti().find(f => f.appProperties.dpshId === NARDO);
  t('nome «<nome progetto> - <id>.zip» e appProperties dpshId + impronta', fN.name === 'Nardò - Scuola Via Roma - ' + NARDO + '.zip' && /^[0-9a-f]{64}$/.test(fN.appProperties.impronta));
  const lettura = await A.E(`(async () => { const b = await driveScarica(${JSON.stringify(fN.id)}); const l = await leggiPacchetto(new File([b], 'x.zip')); return { ok: l.ok, id: l.ok && l.progetto.id, imp: l.ok && l.impronta, man: l.ok && l.manifest.impronta }; })()`);
  t('il file è un pacchetto di progetto valido (lo apre anche l\'import) con la stessa impronta', lettura.ok && lettura.id === NARDO && lettura.imp === fN.appProperties.impronta);
  t('stato locale: impronta, id del file, modifiedTime remoto', (() => { const s = stato(A).progetti[NARDO]; return s && s.impronta === fN.appProperties.impronta && s.fileId === fN.id && s.modificato === fN.modifiedTime; })());
  const rAllineato = await A.E('sincronizza({ auto: false })');
  t('subito dopo: tutto allineato, nessun nuovo caricamento', /allineato/.test(rAllineato.esito) && g.progetti().length === 2 && g.richieste.filter(r => r.metodo === 'PUT').length === 2);

  console.log('--- Cambiato solo qui: carica ---');
  modifica(A, NARDO, 'Nardò - Scuola modificata qui');
  const ria = await A.E('sincronizza({ auto: true })');
  t('automatica: carica', /1 caricati/.test(ria.esito) && g.progetti().length === 2);
  const fN2 = g.progetti().find(f => f.appProperties.dpshId === NARDO);
  t('stesso file aggiornato (non un doppione), nome nuovo', fN2.id === fN.id && fN2.name.startsWith('Nardò - Scuola modificata qui'));

  console.log('--- Un altro dispositivo: scarica i nuovi, poi cambiato solo su Drive ---');
  const B = await nuovo(g, false);
  B.w.localStorage.setItem('dpsh_google_collegato', JSON.stringify({ email: 'geologo@example.com', nome: 'G' }));
  const autoB = await B.E('sincronizza({ auto: true })');
  t('automatica alla prima volta: non fa niente, aspetta la conferma', /va confermata/.test(autoB.esito) && Object.keys(B.E('state.projects')).length === 0);
  const pB = B.E('sincronizza({ auto: false })');
  await rispondi(B, /Scarico da Drive \(nuovi\) \(2\)/);
  const rB = await pB;
  t('B scarica i due progetti nuovi', /2 scaricati/.test(rB.esito) && Object.keys(B.E('state.projects')).sort().join() === [COPERTINO, NARDO].sort().join());
  t('B ha il nome modificato', B.E(`state.projects[${JSON.stringify(NARDO)}].name`) === 'Nardò - Scuola modificata qui');
  modifica(B, COPERTINO, 'Copertino - cambiato su B');
  await B.E('sincronizza({ auto: true })');
  const autoA = await A.E('sincronizza({ auto: true })');
  t('A: cambiato solo su Drive → sostituisce', /1 scaricati/.test(autoA.esito) && A.E(`state.projects[${JSON.stringify(COPERTINO)}].name`) === 'Copertino - cambiato su B');
  const cron = A.E(`JSON.stringify(copieAutomatiche.indice || [])`).includes('prima di ricevere');
  t('prima della sostituzione c\'è la copia automatica locale', cron === true);

  console.log('--- Conflitto: tieni entrambi, avvisa ---');
  modifica(A, NARDO, 'Nardò - versione di A');
  modifica(B, NARDO, 'Nardò - versione di B');
  await B.E('sincronizza({ auto: true })'); // B carica
  const fBefore = g.progetti().find(f => f.appProperties.dpshId === NARDO).appProperties.impronta;
  const autoConf = await A.E('sincronizza({ auto: true })');
  t('automatica: il conflitto NON si risolve da solo, resta «Conflitto: 1»', A.E(`state.projects[${JSON.stringify(NARDO)}].name`) === 'Nardò - versione di A' && g.progetti().find(f => f.appProperties.dpshId === NARDO).appProperties.impronta === fBefore
    && /Conflitto: 1/.test(A.d.getElementById('lblSyncStato').textContent));
  const pc = A.E('sincronizza({ auto: false })');
  const dc = await rispondi(A, /CONFLITTO, tengo entrambi/);
  t('anteprima del conflitto', !!dc && /Nardò - versione di A/.test(dc.testo));
  const rc = await pc;
  const nomiA = Object.values(A.E('state.projects')).map(p => p.name);
  t('il locale resta', nomiA.includes('Nardò - versione di A'));
  t('quello di Drive entra come progetto separato «(da Drive, <data>)»', nomiA.some(n => /^Nardò - versione di B \(da Drive, \d\d\/\d\d\/\d{4}\)$/.test(n)));
  t('avvisa del conflitto e lo scrive nel registro', /1 conflitti/.test(rc.esito) && stato(A).registro.some(r => /Conflitto/.test(r.cosa)));
  t('poi il locale sale su Drive e lo stato torna sereno', g.progetti().find(f => f.appProperties.dpshId === NARDO).name.startsWith('Nardò - versione di A') && !/Conflitto/.test(A.d.getElementById('lblSyncStato').textContent));
  await A.E('sincronizza({ auto: true })'); // la copia «da Drive» è un progetto nuovo: sale
  t('la copia «da Drive» si carica come progetto nuovo (nessuna perdita)', g.progetti().length === 3);

  console.log('--- Nessuna cancellazione ---');
  const prima = g.progetti().length;
  A.E(`(() => { delete state.projects[${JSON.stringify(COPERTINO)}]; saveState(); })()`);
  const autoDel = await A.E('sincronizza({ auto: true })');
  t('eliminato qui: automatica non propaga, resta «Da decidere»', g.progetti().length === prima && g.progetti().every(f => !f.trashed) && /Da decidere: 1/.test(A.d.getElementById('lblSyncStato').textContent));
  const pdel = A.E('sincronizza({ auto: false })');
  const dd = await rispondi(A, /Eliminati qui ma ancora su Drive/, 'annulla');
  t('anteprima: eliminato qui, «non li tocco», con tasti per riportarlo o cestinarlo', !!dd && /Copertino/.test(dd.testo) && /riporta i mancanti/.test(dd.extra.textContent) && /cestina su Drive/.test(dd.extra2.textContent));
  await pdel;
  t('Annulla: ancora tutto su Drive, e non è tornato qui', g.progetti().length === prima && !A.E(`!!state.projects[${JSON.stringify(COPERTINO)}]`));
  const pcest = A.E('sincronizza({ auto: false })');
  await rispondi(A, /Eliminati qui/, 'extra2');
  const rcest = await pcest;
  const fCop = Array.from(g.files.values()).find(f => f.appProperties && f.appProperties.dpshId === COPERTINO);
  t('«cestina su Drive»: trashed = true, il file esiste ancora (mai delete)', fCop && fCop.trashed === true && g.files.has(fCop.id) && !g.richieste.some(r => r.metodo === 'DELETE'));
  t('mai richieste di eliminazione definitiva', g.richieste.every(r => r.metodo !== 'DELETE'));

  console.log('--- Manca su Drive / elenco vuoto / elenco incompleto ---');
  const nProg = Object.keys(A.E('state.projects')).length;
  g.elencoVuoto = true;
  const rv = await A.E('sincronizza({ auto: true })');
  t('Drive risponde con un elenco vuoto: niente è considerato eliminato, niente si cancella qui', Object.keys(A.E('state.projects')).length === nProg && /Da decidere/.test(A.d.getElementById('lblSyncStato').textContent));
  const pv = A.E('sincronizza({ auto: false })');
  const dv = await rispondi(A, /Drive risulta vuoto/, 'annulla');
  t('l\'anteprima dice «Drive risulta vuoto… non li considero eliminati»', !!dv && /Non li considero eliminati/.test(dv.testo));
  await pv;
  g.elencoVuoto = false;
  g.pagina = 1; g.fallisci = { dopo: g.richieste.length + 2, stato: 500 };
  const rf = await A.E('sincronizza({ auto: true })');
  t('un elenco che si interrompe a metà: errore, nessuna decisione presa', rf.ok === false && Object.keys(A.E('state.projects')).length === nProg);
  g.fallisci = null; g.pagina = 100;

  console.log('--- Offline ---');
  g.rete = false;
  modifica(A, NARDO, 'Nardò - fatto offline');
  const ro = await A.E('sincronizza({ auto: true })');
  t('senza rete: «Offline: in attesa», niente perso', /Offline/.test(ro.esito) && A.E(`state.projects[${JSON.stringify(NARDO)}].name`) === 'Nardò - fatto offline');
  A.w.dispatchEvent(new A.w.Event('offline'));
  g.rete = true;
  const rb = await A.E('sincronizza({ auto: true })');
  t('tornata la rete: carica', /1 caricati/.test(rb.esito));

  console.log('--- Registro, stato, chiavi ---');
  const reg = stato(A).registro;
  t('il registro tiene al massimo 20 voci, la più recente per prima', reg.length <= 20 && reg.length > 5 && reg.every(r => r.t && r.cosa) && reg[0].t >= reg[reg.length - 1].t);
  t('il registro si vede nella sezione account', A.d.getElementById('lblSyncRegistro').children.length === reg.length);
  t('«Sincronizzato alle HH:MM»', /Sincronizzato alle \d\d:\d\d/.test(A.d.getElementById('lblSyncStato').textContent));
  const tuttoLs = JSON.stringify(Object.fromEntries(Object.entries(A.w.localStorage).filter(([k]) => k !== 'DPSH_AI_V1')));
  t('nessuna chiave API nello stato di sincronizzazione né nel resto del localStorage', !tuttoLs.includes('TESTCHIAVE'));
  const tutti = Buffer.concat(g.progetti().map(f => f.content)).toString('latin1');
  t('nessuna chiave API nei pacchetti su Drive', !tutti.includes('TESTCHIAVE') && !tutti.includes('DPSH_AI_V1'));
  t('nessuna chiave in console né negli URL', !/TESTCHIAVE/.test(A.errori.join() + A.avvisi.join() + g.richieste.map(r => r.url).join()));

  console.log('--- Un nome ostile su Drive è solo testo ---');
  const C = await nuovo(g, false);
  C.w.localStorage.setItem('dpsh_google_collegato', JSON.stringify({ email: 'geologo@example.com', nome: 'G' }));
  const ostile = g.progetti().find(f => f.appProperties.dpshId === NARDO);
  ostile.name = '<img src=x onerror=alert(1)> - ' + NARDO + '.zip';
  ostile.appProperties = Object.assign({}, ostile.appProperties);
  g.metti({ name: 'estraneo.zip', parents: [g.cartella().id], appProperties: { dpshId: '../../x"<' } });
  const pC = C.E('sincronizza({ auto: false })');
  const dC = await rispondi(C, /Scarico da Drive/);
  await pC;
  t('l\'anteprima è testo, il file con id non valido è ignorato, nessun elemento iniettato', !C.d.querySelector('img[src="x"]') && !Object.keys(C.E('state.projects')).some(k => !/^[A-Za-z0-9_-]+$/.test(k)));

  console.log('--- Assistente IA ---');
  const st = await A.E(`AI_STRUMENTI.find(s => s.n === 'stato_sincronizzazione').run({})`);
  t('stato_sincronizzazione: collegato, ultima volta, registro; nessuna chiave', st.collegato === true && !!st.ultima_sincronizzazione && st.registro.length > 0 && !JSON.stringify(st).includes('TESTCHIAVE'));
  t('sincronizza_ora è una modifica con conferma e usa la stessa sincronizzazione', A.E(`!!AI_STRUMENTI.find(s => s.n === 'sincronizza_ora').w`) === true);
  const ss = await A.E(`AI_STRUMENTI.find(s => s.n === 'sincronizza_ora').run({})`);
  t('sincronizza_ora risponde con l\'esito', ss.ok === true && /allineato|caricati|scaricati/.test(ss.esito));

  [A, B, C].forEach(x => x.chiudi());
  console.log('\n' + ok + ' ok, ' + ko + ' ko');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO  errore nel test: ' + (e && e.stack || e)); process.exit(1); });
