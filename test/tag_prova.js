// IL TAG DELLA PROVA. Nel testo si potevano scrivere solo dati del progetto (committente,
// comune…): mancava il nome della prova, che serve per i titoli (un H2 «DPSH 3» per ogni prova
// del Report Completo) e quindi per l'indice. Ora con @ ci sono «Nome della prova» e «Numero
// della prova»: nell'editor mostrano la prova dell'anteprima, in stampa quella di ciascun pezzo.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(30);
  const pid = app.E("Object.keys(state.projects).find(id => /Nard/.test(state.projects[id].name))");
  app.E(`openProject(${JSON.stringify(pid)})`);
  await attesa(50);

  // Il menu @ filtra per etichetta: scrivendo «@Prova» devono comparire i due tag della prova.
  const conProva = app.E(`TAG_DISPONIBILI.concat(tagFigureDisponibili()).filter(t => t.etichetta.toLowerCase().includes('prova') || t.tipo.toLowerCase().includes('prova')).map(t => t.etichetta)`);
  t(`scrivendo «@Prova» compaiono: ${conProva.join(' · ')}`, conProva.includes('Nome della prova') && conProva.includes('Numero della prova'));
  t('stanno nel gruppo «Prova»', app.E(`TAG_DISPONIBILI.filter(t => t.gruppo === 'Prova').map(t => t.tipo).join()`) === 'nomeProva,numeroProva');

  // Nell'editor la pastiglia mostra la prova aperta.
  const nr = app.E('state.header && state.header.provaNr');
  const vista = app.E(`risolviTagPerVista('nomeProva')`);
  t(`nell'editor la pastiglia mostra la prova aperta («${vista.valore}»)`, vista.etichetta === 'Nome della prova' && vista.valore === 'DPSH ' + nr);

  // In stampa: ogni pezzo del Report Completo ha la sua prova.
  const h2 = '<h2 data-titolo-indice="2"><span class="dpsh-tag" data-tag="nomeProva">x</span> — prova n. <span class="dpsh-tag" data-tag="numeroProva">x</span></h2>';
  const p3 = app.E(`risolviTagInStampa(${JSON.stringify(h2)}, { projId: ${JSON.stringify(pid)}, provaNr: '3' })`);
  const p7 = app.E(`risolviTagInStampa(${JSON.stringify(h2)}, { projId: ${JSON.stringify(pid)}, provaNr: '7B' })`);
  t('in stampa ogni prova ha il suo nome: DPSH 3 / DPSH 7B', /DPSH 3<\/span> — prova n\. <span[^>]*>3</.test(p3) && /DPSH 7B</.test(p7));
  t('(senza una prova esce fra parentesi quadre, come ogni dato che manca)', /\[Nome della prova\]/.test(app.E(`risolviTagInStampa(${JSON.stringify(h2)}, { projId: ${JSON.stringify(pid)} })`)));

  // E il titolo H2 entra nell'indice col nome della prova.
  const foglio = (x) => `<div class="dpsh-sheet"><div class="dpsh-sheet-inner">${x}</div></div>`;
  const voci = app.E(`raccogliVociIndice(${JSON.stringify(foglio(p3) + foglio(p7))}, [{ id: 'a', numero: '3', pageCount: 1 }, { id: 'b', numero: '7B', pageCount: 1 }], 0).voci`);
  t(`nell'indice il titolo H2 porta il nome della prova: ${voci.map(v => v.etichetta + ' (liv ' + v.livello + ')').join(', ')}`, voci.length === 2 && voci[0].etichetta.startsWith('DPSH 3') && voci[1].etichetta.startsWith('DPSH 7B') && voci[0].livello === 2);

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
