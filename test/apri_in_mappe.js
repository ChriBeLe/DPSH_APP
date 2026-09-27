// Apri in Mappe. Dentro l'APK window.open() non apre niente, quindi il punto va aperto con un
// indirizzo che il sistema sa gestire. Qui si verifica che gli indirizzi siano giusti e che
// coordinate sbagliate non producano un link che porta in mezzo al mare. Quale dei tre metodi
// funzioni davvero nell'APK si scopre solo sul telefono: questo test non puo' dirlo.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const api=new Function(corpo('indirizziMappePunto')+'\nreturn { indirizziMappePunto };')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

console.log('--- Gli indirizzi ---');
const i = api.indirizziMappePunto(41.845912, 12.562424, 'DPSH 3');
t('geo: con coordinate ed etichetta', i.geo === 'geo:41.845912,12.562424?q=41.845912,12.562424(DPSH%203)');
t('link web di Google Maps', i.web === 'https://www.google.com/maps/search/?api=1&query=41.845912,12.562424');
t('coordinate da copiare leggibili', i.coordinate === '41.845912, 12.562424');
t('accetta il testo numerico che arriva dai campi', api.indirizziMappePunto('41.5', '12.25').web.endsWith('=41.500000,12.250000'));
t('senza etichetta usa un nome generico', api.indirizziMappePunto(1, 2).geo.endsWith('(Prova%20DPSH)'));
t('longitudine negativa', api.indirizziMappePunto(40, -3.7).web.endsWith('=40.000000,-3.700000'));

console.log('--- Coordinate che non devono produrre un link ---');
t('vuote', api.indirizziMappePunto('', '') === null);
t('null', api.indirizziMappePunto(null, null) === null);
t('testo', api.indirizziMappePunto('abc', 12) === null);
t('latitudine oltre 90', api.indirizziMappePunto(95, 12) === null);
t('longitudine oltre 180', api.indirizziMappePunto(41, 190) === null);

console.log('--- Cablaggio ---');
t('il riquadro esiste nella finestra GPS', src.includes('id="boxApriInMappe"'));
t('i tre metodi da provare e la copia',
  ['lnkMappeGeo', 'lnkMappeWeb', 'btnMappeCondividi', 'btnCopiaCoordinate'].every(id => src.includes('id="' + id + '"')));
t('si aggiorna insieme allo stato delle coordinate', /function updateModalGpsStatusText\(\) \{[\s\S]{0,1500}aggiornaApriInMappe\(\);/.test(src));
t('la copia ha un ripiego per le WebView senza Clipboard API', /campo\.select\(\);\s*try \{ copiato = document\.execCommand\('copy'\);/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
