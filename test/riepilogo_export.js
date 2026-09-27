// Controllo prima dell'export. Deve segnalare cio' che manca davvero (e solo quello): una
// relazione consegnata senza coordinate o con la falda "non rilevata" per dimenticanza e' il
// caso che vuole evitare. Non blocca niente, quindi un falso allarme costa poco, ma un allarme
// che suona su ogni prova completa smette di essere letto.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const api=new Function(corpo('avvisiPrimaExport')+'\nreturn { avvisiPrimaExport };')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const copia = o => JSON.parse(JSON.stringify(o));

const completa = { id: 'S1', updatedAt: 1, logs: [{}], photos: [{ id: 'F' }],
  header: { provaNr: '1', committente: 'Rossi', localita: 'Via Roma', date: '2026-09-01', lat: 41.1, lng: 12.2, faldaDa: '3.2' } };
const vuota = { id: 'S2', updatedAt: 2, logs: [], photos: [],
  header: { provaNr: '2', committente: '', localita: '', date: '', lat: null, lng: null, faldaDa: '' } };

console.log('--- Cosa segnala ---');
t('una prova completa non ha avvisi', api.avvisiPrimaExport({ surveys: { S1: completa } }).length === 0);
const r = api.avvisiPrimaExport({ surveys: { S1: completa, S2: vuota } });
t('elenca solo la prova con dati mancanti', r.length === 1 && r[0].id === 'S2' && r[0].provaNr === '2');
t('tutti e cinque i controlli, in quest ordine', r[0].avvisi.map(a => a.tipo).join() === 'colpi,gps,foto,falda,intestazione');
t('la falda dice cosa uscira nel report', /non rilevata/.test(r[0].avvisi.find(a => a.tipo === 'falda').testo));
t('l intestazione dice quali campi mancano', /committente, località, data/.test(r[0].avvisi.find(a => a.tipo === 'intestazione').testo));
const soloData = copia(completa); soloData.header.date = '';
t('e ne nomina solo quelli vuoti', api.avvisiPrimaExport({ surveys: { S1: soloData } })[0].avvisi[0].testo === 'Intestazione senza data');

console.log('--- Niente falsi allarmi ---');
const zero = copia(completa); zero.header.lat = 0; zero.header.lng = 0;
t('coordinate 0,0 sono numeri validi, non mancanti', api.avvisiPrimaExport({ surveys: { S1: zero } }).length === 0);
const testo = copia(completa); testo.header.lat = '41.1'; testo.header.lng = '12.2';
t('coordinate scritte come testo numerico vanno bene', api.avvisiPrimaExport({ surveys: { S1: testo } }).length === 0);
const falsa = copia(completa); falsa.header.lat = 'abc';
t('ma testo non numerico conta come mancante', api.avvisiPrimaExport({ surveys: { S1: falsa } })[0].avvisi[0].tipo === 'gps');
const spazi = copia(completa); spazi.header.committente = '   ';
t('un campo di soli spazi e vuoto', api.avvisiPrimaExport({ surveys: { S1: spazi } }).length === 1);
t('progetto assente o senza prove: nessun avviso', api.avvisiPrimaExport(null).length === 0 && api.avvisiPrimaExport({}).length === 0);

console.log('--- Ordine e interpretazioni ---');
const dieci = copia(vuota); dieci.id = 'S10'; dieci.header.provaNr = '10';
const tre = copia(vuota); tre.id = 'S3'; tre.header.provaNr = '3';
t('ordinate per numero di prova, non come testo', api.avvisiPrimaExport({ surveys: { S10: dieci, S3: tre } }).map(x => x.provaNr).join() === '3,10');
const variante = copia(vuota); variante.id = 'S2B'; variante.header.provaNr = '2B'; variante.header.interpretazioneDi = 'S2';
t('segnala quando la prova e un interpretazione alternativa', api.avvisiPrimaExport({ surveys: { S2B: variante } })[0].interpretazione === true);

console.log('--- Cablaggio ---');
t('il riquadro e nella modale Esporta', src.includes('id="riepilogoPrimaExport"'));
t('si ricalcola a ogni apertura della modale', /exportModalContext = \{ type: targetType, id: targetId \};\s*renderRiepilogoPrimaExport\(targetType, targetId\);/.test(src));
t('ogni avviso porta alla finestra giusta',
  /\{ gps: openGpsModal, foto: openSurveyPhotosModal, falda: openQuickFaldaModal, intestazione: openCantiereInfoModal \}/.test(src));
t('in Vista Prova controlla i dati appena scritti, non quelli salvati prima',
  /function renderRiepilogoPrimaExport[\s\S]{0,900}syncStateToProject\(\);[\s\S]{0,80}const righe = avvisiPrimaExport\(proj\);/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
