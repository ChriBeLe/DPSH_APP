// CARICAMENTO SICURO (Fase 1, punto 2).
//
// Il difetto: se il testo in localStorage non si leggeva, loadState lo ignorava, l'app partiva
// vuota e il primo saveState (basta aprire la Home) lo sovrascriveva. Dati ancora recuperabili,
// persi per sempre, senza un messaggio.
//
// Qui si accende l'app vera con un salvataggio rovinato e si guarda: il testo resta identico, una
// copia esatta finisce al sicuro in IndexedDB, compare l'avviso, si può scaricare il testo e si
// riparte da vuoto solo per scelta. La controprova accende l'app di prima (riferimento/) con lo
// stesso testo e mostra che lo perdeva.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0, RIFERIMENTO } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const clic = (app, el) => el && el.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
const STATO = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const ROVINATO = STATO.slice(0, Math.floor(STATO.length * 0.6)); // come un salvataggio interrotto a metà

(async () => {
  console.log('--- Un salvataggio buono si carica e si salva come prima ---');
  {
    const app = await avviaApp({ stato: STATO, idb: telefonoV0() });
    t('i due progetti ci sono', app.E('Object.keys(state.projects).length') === 2);
    t('il caricamento dice ok', app.E('caricamentoDati.esito') === 'ok' && app.E('caricamentoDati.bloccato') === false);
    t('nessun avviso', !app.dialogo() && !app.d.getElementById('barraSalvataggioSospeso'));
    app.E('saveState()');
    const dopo = JSON.parse(app.salvato());
    t('e il salvataggio scrive ancora', Object.keys(dopo.projects).length === 2);
    t('senza errori all avvio', app.errori.length === 0);
    if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
    app.chiudi();
  }

  console.log('--- Un salvataggio rovinato NON viene sovrascritto ---');
  {
    const app = await avviaApp({ stato: ROVINATO });
    await attesa(300);
    t('il testo in memoria è ancora quello, identico', app.salvato() === ROVINATO);
    t('il caricamento lo dice: illeggibile, salvataggio bloccato',
      app.E('caricamentoDati.esito') === 'illeggibile' && app.E('caricamentoDati.bloccato') === 'dati-non-letti');
    t('e l apertura della Home ha provato a salvare, invano', app.E('caricamentoDati.salvataggiEvitati') > 0);
    // Si lavora un po', come farebbe chi non ha letto l'avviso: niente deve arrivare in memoria.
    app.E('switchView("home"); saveState(); saveState();');
    t('anche dopo altri salvataggi il testo resta identico', app.salvato() === ROVINATO);

    const copie = app.idb._dump('DPSH_CopieAutomatiche');
    const q = copie && copie.copie.find(c => c.quarantena);
    t('una copia ESATTA è al sicuro nelle copie automatiche', !!q && q.json === ROVINATO && /^QUARANTENA_/.test(q.id));
    t('fuori dall indice, così la pulizia delle copie non la tocca', !copie.indice.some(v => v.id === q.id));

    const dlg = app.dialogo();
    t('compare l avviso, col suo titolo', !!dlg && dlg.titolo === 'Dati salvati non leggibili');
    t('che dice che non l ha toccato e che la copia c è', !!dlg && /Non li ho toccati/.test(dlg.testo) && /copia esatta è già al sicuro/.test(dlg.testo));
    t('con le due strade: scarica e riparti da vuoto',
      !!dlg && dlg.ok.textContent === 'Scarica i dati' && dlg.extra.textContent === 'Riparti da vuoto' && dlg.extra.style.display !== 'none');
    t('e la striscia fissa che resta anche chiudendo l avviso', !!app.d.getElementById('barraSalvataggioSospeso'));

    clic(app, dlg.ok);
    await attesa(50);
    const file = app.scaricati[app.scaricati.length - 1];
    t('«Scarica i dati» scarica il testo grezzo, identico', !!file && /^DPSH_dati_non_letti_\d{4}-\d{2}-\d{2}\.txt$/.test(file.nome) && (await file.blob.text()) === ROVINATO);
    t('e l avviso si chiude, la striscia no', !app.dialogo() && !!app.d.getElementById('barraSalvataggioSospeso'));

    clic(app, app.d.getElementById('btnBarraSalvataggioSospeso'));
    await attesa(50);
    t('la striscia riapre l avviso', !!app.dialogo());
    clic(app, app.dialogo().extra);
    await attesa(50);
    const conferma = app.dialogo();
    t('ripartire da vuoto chiede conferma', !!conferma && /Riparto con l'archivio vuoto/.test(conferma.testo));
    clic(app, conferma.annulla);
    await attesa(50);
    t('annullando non cambia niente', app.salvato() === ROVINATO && app.E('caricamentoDati.bloccato') === 'dati-non-letti');
    const di_nuovo = app.dialogo();
    if (di_nuovo) { clic(app, di_nuovo.extra); await attesa(50); }
    const conferma2 = app.dialogo();
    if (conferma2) { clic(app, conferma2.ok); await attesa(100); }
    let nuovo = null; try { nuovo = JSON.parse(app.salvato()); } catch (e) { /* resta null */ }
    t('confermando si riparte da vuoto e si salva di nuovo', !!nuovo && Object.keys(nuovo.projects).length === 0 && app.E('caricamentoDati.bloccato') === false);
    t('la striscia sparisce', !app.d.getElementById('barraSalvataggioSospeso'));
    t('la copia in quarantena resta', app.idb._dump('DPSH_CopieAutomatiche').copie.some(c => c.quarantena && c.json === ROVINATO));
    app.chiudi();
  }

  console.log('--- Senza una copia al sicuro, ripartire da vuoto non si può ---');
  {
    const app = await avviaApp({ stato: ROVINATO, primaDellApp: (w) => { w.indexedDB._guasto.scritture = true; } });
    await attesa(300);
    const dlg = app.dialogo();
    t('l avviso dice che la copia NON c è', !!dlg && /Non è stato possibile metterne una copia al sicuro/.test(dlg.testo));
    clic(app, dlg.extra);
    await attesa(50);
    const blocco = app.dialogo();
    t('e chiede di scaricare prima', !!blocco && /Prima scarica i dati/.test(blocco.testo));
    t('il testo è ancora lì', app.salvato() === ROVINATO);
    app.chiudi();
  }

  console.log('--- Altri contenuti che non sono un archivio ---');
  for (const [nome, testo] of [['null', 'null'], ['un elenco', '[1,2,3]'], ['un numero', '42']]) {
    const app = await avviaApp({ stato: testo });
    await attesa(200);
    t(nome + ': non caricato e non sovrascritto', app.E('caricamentoDati.esito') === 'illeggibile' && app.salvato() === testo);
    app.chiudi();
  }

  console.log('--- Nessun dato salvato: si parte e si salva normalmente ---');
  {
    const app = await avviaApp({ stato: null });
    t('esito vuoto, salvataggio libero', app.E('caricamentoDati.esito') === 'vuoto' && app.E('caricamentoDati.bloccato') === false);
    t('la Home ha salvato lo stato iniziale', !!app.salvato() && !!JSON.parse(app.salvato()).projects);
    t('nessun avviso', !app.dialogo());
    app.chiudi();
  }

  console.log('--- Durante l avvio non si salva niente prima di aver letto ---');
  {
    const src = fs.readFileSync(path.join(__dirname, '..', 'dist', 'DPSH.html'), 'utf8');
    const iBlocco = src.indexOf('if (caricamentoDati.bloccato) {');
    const iSave = src.indexOf('function saveState() {');
    t('saveState controlla il blocco come prima cosa', iSave > 0 && iBlocco > iSave && iBlocco - iSave < 600);
    t('e il blocco nasce attivo («avvio»), prima di state', /const caricamentoDati = \{\s*esito: 'in-corso', bloccato: 'avvio'/.test(src)
      && src.indexOf('const caricamentoDati = {') < src.indexOf('let state = {'));
  }

  console.log('--- CONTROPROVA: l app di prima perdeva il salvataggio rovinato ---');
  {
    const app = await avviaApp({ file: RIFERIMENTO, stato: ROVINATO });
    await attesa(200);
    const dopo = app.salvato();
    t('(controprova) nel file di prima il testo rovinato viene sovrascritto', dopo !== ROVINATO);
    let letto = null; try { letto = JSON.parse(dopo); } catch (e) { /* */ }
    t('(controprova) e al suo posto c è un archivio senza i progetti di prima', !!letto && !Object.values(letto.projects || {}).some(p => /Nard/.test(p.name || '')));
    app.chiudi();
  }

  console.log('\n' + ok + ' ok, ' + ko + ' KO');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); console.log('KO eccezione'); process.exit(1); });
