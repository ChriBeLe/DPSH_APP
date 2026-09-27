// Interpretazioni alternative di una prova («3B»). Servono a tenere due letture stratigrafiche
// dello stesso dataset. La copia NON e' una prova in piu' fatta sul terreno: se contasse come
// tale, la relazione direbbe «4 prove eseguite» invece di 3 e l'inquadramento avrebbe due pin
// sovrapposte. Qui si eseguono le funzioni vere che decidono cosa e' una verticale reale.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['radiceProva','proveFisiche','prossimaLetteraInterpretazione','puntiProveDelProgetto'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const pv = (id, nr, di, lat) => ({ id, header: Object.assign({ provaNr: nr, lat: lat === undefined ? null : lat, lng: lat === undefined ? null : 12 }, di ? { interpretazioneDi: di } : {}) });
const progetto = elenco => ({ surveys: Object.fromEntries(elenco.map(s => [s.id, s])) });
const ids = elenco => elenco.map(s => s.id).join();
const p1 = pv('S1', '1'), p2 = pv('S2', '2'), p2b = pv('S2B', '2B', 'S2'), p2c = pv('S2C', '2C', 'S2');

console.log('--- A quale verticale appartiene una prova ---');
t('una prova normale e radice di se stessa', api.radiceProva(p1) === 'S1');
t('un interpretazione ha per radice l originale', api.radiceProva(p2b) === 'S2');

console.log('--- Una prova per verticale ---');
t('originale e due interpretazioni contano una volta', ids(api.proveFisiche([p1, p2, p2b, p2c])) === 'S1,S2');
t('vale l originale anche se l interpretazione viene prima', ids(api.proveFisiche([p2b, p2, p1])) === 'S2,S1');
t('originale eliminato: resta la prima interpretazione, sempre una sola', ids(api.proveFisiche([p1, p2b, p2c])) === 'S1,S2B');
t('senza interpretazioni non cambia niente', ids(api.proveFisiche([p1, p2])) === 'S1,S2');
t('elenco vuoto o assente', api.proveFisiche([]).length === 0 && api.proveFisiche(null).length === 0);

console.log('--- La lettera della prossima interpretazione ---');
t('la prima e B', api.prossimaLetteraInterpretazione(progetto([p2]), 'S2') === 'B');
t('dopo B viene C', api.prossimaLetteraInterpretazione(progetto([p2, p2b]), 'S2') === 'C');
t('una lettera liberata si riusa', api.prossimaLetteraInterpretazione(progetto([p2, p2c]), 'S2') === 'B');
t('le lettere di un altra verticale non contano', api.prossimaLetteraInterpretazione(progetto([p1, p2b]), 'S1') === 'B');

console.log('--- Inquadramento ---');
const punti = api.puntiProveDelProgetto(progetto([pv('S1', '1', null, 41), pv('S2', '2', null, 42), pv('S2B', '2B', 'S2', 42)]));
t('una pin per verticale, non una per interpretazione', punti.length === 2 && punti.map(x => x.numero).join() === '1,2');

console.log('--- Cablaggio ---');
t('il testo introduttivo conta le verticali', /function valoriCantiere\(proj\) \{[\s\S]{0,400}const prove = proveFisiche\(/.test(src));
t('all esportazione PDF le interpretazioni partono spente',
  /esportaPdfSelectedIds = new Set\(tutte\.filter\(s => !\(s\.header && s\.header\.interpretazioneDi\)\)\.map\(s => s\.id\)\);/.test(src)
  && /data-id="\$\{s\.id\}" \$\{esportaPdfSelectedIds\.has\(s\.id\) \? 'checked' : ''\}/.test(src));
t('il numero proposto per una nuova prova non conta le interpretazioni',
  /const count = proveFisiche\(Object\.values\(state\.projects\[state\.currentProjectId\]\.surveys \|\| \{\}\)\)\.length;/.test(src));
t('il segno di interpretazione sta nell intestazione, che il salvataggio copia intera',
  /copia\.header\.interpretazioneDi = radice;/.test(src) && /header: JSON\.parse\(JSON\.stringify\(state\.header\)\)/.test(src));
t('il bottone esiste nelle impostazioni della prova ed e collegato',
  src.includes('id="btnSurveySettingsDuplica"') && /btnSurveySettingsDuplica\.addEventListener\('click'/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
