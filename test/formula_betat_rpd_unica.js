// βt / Rpd: una sola formula (parametriStrumento in 015). Tutti i punti d'uso che prima
// la ricopiavano devono dare gli stessi valori di rpdDiLog / betaTCalcolato.
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../dist/DPSH.html','utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['parametriStrumento','betaTCalcolato','betaTStrumento','rpdDiLog'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

// Le vecchie copie, riprodotte alla lettera (con ||), come riferimento di non regressione.
function vecchioBeta(i,st){const M=parseFloat(i.pesoMassa||63.50),H=parseFloat(i.volata||0.75)*100,A=parseFloat(i.areaPunta||20),s=parseFloat(st||20),pa=parseFloat(i.pesoAsta||6.30);return (M*M*H)/(A*s*(M+pa))/7.2;}
function vecchioRpd(log,i,st){const M=parseFloat(i.pesoMassa||63.50),H=parseFloat(i.volata||0.75)*100,A=parseFloat(i.areaPunta||20),s=parseFloat(st||20),pa=parseFloat(i.pesoAsta||6.30),ps=parseFloat(i.pesoSistema||8.00);const Mp=(log.asta*pa)+ps;return (M*M*H*log.colpi)/(A*s*(M+Mp));}
// Copia 046 (export di progetto) come era.
function copia046(log,inst,passoCm){const N=log.colpi||0,M=inst.pesoMassa||63.5,H=(inst.volata||0.75)*100,A=inst.areaPunta||20;const rodNr=log.asta||1;const Mp=(inst.pesoSistema||8.0)+(rodNr*(inst.pesoAsta||6.3));return N>0?((M*M)*H*N)/(A*passoCm*(M+Mp)):0;}

const strumenti=[
  {pesoMassa:63.5,volata:0.75,areaPunta:20,pesoAsta:6.3,pesoSistema:8},
  {pesoMassa:63,volata:0.75,areaPunta:20,pesoAsta:6.3,pesoSistema:2.5},
  {pesoMassa:30,volata:0.20,areaPunta:10,pesoAsta:2.4,pesoSistema:3}
];
const passi=[20,20,10];
strumenti.forEach((inst,k)=>{
  const st=passi[k];
  t('strumento '+k+': betaT identico al vecchio', api.betaTCalcolato(inst,st)===vecchioBeta(inst,st));
  t('strumento '+k+': betaTStrumento identico', api.betaTStrumento(inst,st)===vecchioBeta(inst,st));
  let tutti=true;
  for(const asta of [1,2,5,11]) for(const colpi of [1,7,23]){
    const log={asta,colpi};
    if(api.rpdDiLog(log,inst,st)!==vecchioRpd(log,inst,st)) tutti=false;
    if(api.rpdDiLog(log,inst,st,asta)!==copia046(log,inst,st)) tutti=false;
  }
  t('strumento '+k+': rpd identico a vecchia 015, 046 e 072 per tutte le aste/colpi', tutti);
});
t('rpd con 0 colpi vale 0', api.rpdDiLog({asta:3,colpi:0},strumenti[0],20)===0);
t('astaNr esplicito sostituisce log.asta', api.rpdDiLog({colpi:5},strumenti[0],20,4)===api.rpdDiLog({asta:4,colpi:5},strumenti[0],20));

console.log('--- valori non validi: sempre il default, uguale ovunque ---');
const std=api.betaTCalcolato({},20);
for(const [n,v] of [['zero',0],['negativo',-5],['NaN','abc'],['vuoto','']]){
  t('massa '+n+' -> default', api.betaTCalcolato({pesoMassa:v},20)===std);
}
t('area 0 -> default (niente Infinity)', isFinite(api.betaTCalcolato({areaPunta:0},20)));
t('passo 0 -> 20', api.betaTCalcolato({},0)===api.betaTCalcolato({},20));
t('stringhe numeriche non concatenano', api.rpdDiLog({asta:2,colpi:5},{pesoSistema:'8',pesoAsta:'6.3'},20)===api.rpdDiLog({asta:2,colpi:5},{pesoSistema:8,pesoAsta:6.3},20));
t('la sostituzione e visibile: sostituiti elenca il campo', api.parametriStrumento({pesoMassa:0},20).sostituiti.join()==='pesoMassa');
t('campo mai compilato non e segnalato', api.parametriStrumento({},20).sostituiti.length===0);
console.log(ok+' ok, '+ko+' KO'); process.exit(ko?1:0);
