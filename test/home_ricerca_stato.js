// Ricerca e stato dei progetti in Home. La ricerca deve trovare un progetto da qualunque campo
// una persona ricordi (anche la localita' della PROVA, che sul progetto e' quasi sempre vuota),
// senza badare ad accenti e maiuscole. Lo stato e' solo un ordine personale: niente di automatico
// lo tocca, e cambiarlo non deve spostare il progetto in cima alla lista.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['normalizzaPerRicerca','progettoCorrispondeRicerca','progettiVisibiliHome','ordinaProgetti'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const progetti = {
  P1: { name: 'Cantiere Forlì Nord', comune: 'Forlì', committente: 'Mario Rossi', stato: 'in_corso',
        surveys: { S1: { header: { localita: 'Via Roma 10' } } } },
  P2: { name: 'Lotto 4', comune: 'Cantù', committente: 'Edilnord Srl', stato: 'consegnato', surveys: {} },
  P3: { name: 'Scuola', comune: 'Genzano', committente: '',
        surveys: { S1: { header: { localita: 'Località San Rocco', comune: 'Genzano di Roma' } } } }
};
const chiavi = ['P1', 'P2', 'P3'];
const vedi = (testo, stato) => api.progettiVisibiliHome(chiavi, progetti, testo, stato || 'tutti').join();

console.log('--- La ricerca ---');
t('testo vuoto: tutti', vedi('') === 'P1,P2,P3');
t('senza accenti trova con accenti («forli» -> Forlì)', vedi('forli') === 'P1');
t('e al contrario, maiuscole e accento («CANTÙ» -> Cantù)', vedi('CANTÙ') === 'P2');
t('trova dal committente', vedi('edilnord') === 'P2');
t('trova dalla localita della PROVA', vedi('san rocco') === 'P3');
t('piu parole devono esserci tutte', vedi('roma rossi') === 'P1');
t('non ne basta una sola', vedi('roma edilnord') === '');
t('gli spazi in piu non contano', vedi('  genzano  ') === 'P3');
t('rispetta l ordine ricevuto (quello scelto col menu Ordina)', api.progettiVisibiliHome(['P3', 'P1'], progetti, '', 'tutti').join() === 'P3,P1');
t('un progetto senza campi non fa esplodere niente', api.progettoCorrispondeRicerca({}, 'x') === false && api.progettoCorrispondeRicerca({}, '') === true);

console.log('--- Il filtro per stato ---');
t('solo in corso', vedi('', 'in_corso') === 'P1');
t('solo consegnati', vedi('', 'consegnato') === 'P2');
t('uno stato che nessuno ha: nessuno', vedi('', 'da_elaborare') === '');
t('filtro e ricerca insieme', vedi('forli', 'consegnato') === '' && vedi('forli', 'in_corso') === 'P1');

console.log('--- L ordine dei progetti ---');
// A: prove del 2026-03 e 2026-05 (proj.date dice 05: e' quella dell'ultima prova aperta);
// B: prova del 2026-04, modificato per ultimo; C: senza date, creato nel 2026-01 (dall'id).
const prog = {
  PROJ_A_1790000000000: { name: 'Beta', date: '2026-05-10', modificatoIl: '2026-06-01T10:00:00Z', updatedAt: 9e12,
                          surveys: { s1: { header: { date: '2026-05-10' } }, s2: { header: { date: '2026-03-01' } } } },
  PROJ_B_1790000000001: { name: 'alfa', date: '2026-04-02', modificatoIl: '2026-07-01T10:00:00Z', updatedAt: 1,
                          surveys: { s1: { header: { date: '2026-04-02' } } } },
  PROJ_C_1767225600000: { name: 'Gamma', surveys: {} }
};
const ids = Object.keys(prog);
const ord = o => api.ordinaProgetti(ids, prog, o).map(id => prog[id].name).join();
t('data, recenti prima: conta la PRIMA prova, non proj.date', ord('data_desc') === 'alfa,Beta,Gamma');
t('data, vecchi prima', ord('data_asc') === 'Gamma,Beta,alfa');
t('ultima modifica: modificatoIl, non updatedAt', ord('modifica') === 'alfa,Beta,Gamma');
t('nome: senza badare alle maiuscole', ord('nome') === 'alfa,Beta,Gamma');
t('un ordine sconosciuto vale come data, recenti prima', ord('boh') === ord('data_desc'));
const prima = ord('data_desc');
prog.PROJ_A_1790000000000.updatedAt = Date.now(); prog.PROJ_A_1790000000000.date = '2026-12-31';
t('aprire un progetto (updatedAt e proj.date nuovi) non lo sposta', ord('data_desc') === prima);
t('non cambia l elenco ricevuto', ids.join() === 'PROJ_A_1790000000000,PROJ_B_1790000000001,PROJ_C_1767225600000');
t('Home e barra laterale usano lo stesso ordine', /ordinaProgetti\(projKeys, state\.projects, ordineProgettiScelto\(\)\)/.test(src) && /ordinaProgetti\(Object\.keys\(progetti\), progetti, ordineProgettiScelto\(\)\)/.test(src));
t('nessun elenco di progetti ordinato per updatedAt', !/Object\.keys\(progetti\)\.sort\(\(a, b\) => \(progetti\[b\]\.updatedAt/.test(src) && !/projKeys\.sort\(/.test(src));

console.log('--- Cablaggio ---');
t('i tre stati con i nomi decisi',
  /\{ id: 'in_corso', etichetta: 'In corso'/.test(src) && /\{ id: 'da_elaborare', etichetta: 'Da elaborare'/.test(src) && /\{ id: 'consegnato', etichetta: 'Consegnato'/.test(src));
t('campo di ricerca e filtro in Home', src.includes('id="txtCercaProgetti"') && src.includes('id="filtroStatoProgetti"'));
t('l elenco usa ricerca e filtro', /const visibili = progettiVisibiliHome\(projKeys, state\.projects, ricercaProgettiTesto, filtroStatoProgetti\);/.test(src));
t('se non resta niente c e un modo per mostrare tutto', src.includes('id="btnAzzeraRicercaProgetti"'));
t('i bottoni di stato nel pannello del progetto', src.includes('id="projActStato"') && /renderStatoAzioniProgetto\(projId\);/.test(src));
const fnStato = (src.match(/function renderStatoAzioniProgetto\(projId\) \{[\s\S]*?\n            \}/) || [''])[0];
t('cambiare stato NON tocca la data di modifica', fnStato.length > 0 && !/updatedAt/.test(fnStato));
t('toccare lo stato acceso lo toglie', /if \(proj\.stato === nuovo\) delete proj\.stato; else proj\.stato = nuovo;/.test(src));
t('la copia di un progetto nasce senza stato', /function duplicateProject[\s\S]{0,700}delete clone\.stato;/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
