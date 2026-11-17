// Registro degli errori ignorati (002) e ultimaPeriodica che non avanza se la scrittura fallisce (004).
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../dist/DPSH.html','utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
console.debug=()=>{};
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const toast=[];
const mondo=new Function('toast','COPIE_REGOLE','scriviStub',
 "var registroErrori = { voci: [], conteggio: 0, tipiAvvisati: {} };\n"+
 "const copieAutomatiche={ultimaPeriodica:0,ultimaScritturaFallita:false};\n"+
 "function mostraToast(t){toast.push(t);}\n"+
 "function scriviCopiaAutomatica(a,b,c){return scriviStub(copieAutomatiche);}\n"+
 ['ignoraErrore','segnalaErrore','avviaCopiaPeriodica'].map(corpo).join('\n\n')+
 "\nreturn {ignoraErrore,segnalaErrore,avviaCopiaPeriodica,copieAutomatiche,reg:()=>registroErrori};");
let stub=async()=>true;
const m=mondo(toast,{intervalloMs:300000},(c)=>stub(c));

console.log('--- registro ---');
for(let i=0;i<60;i++) m.ignoraErrore('punto'+i,new Error('guasto '+i));
t('contatore conta tutti (60)', m.reg().conteggio===60);
t('buffer tiene solo gli ultimi 50', m.reg().voci.length===50 && m.reg().voci[0].dove==='punto10' && m.reg().voci[49].dove==='punto59');
t('voce con tempo, contesto, messaggio', m.reg().voci[49].messaggio==='guasto 59' && m.reg().voci[49].quando>0);
m.ignoraErrore('x','solo testo'); t('accetta anche non-Error', m.reg().voci.slice(-1)[0].messaggio==='solo testo');
m.ignoraErrore('y',null); t('accetta null', m.reg().voci.slice(-1)[0].messaggio==='');
console.log('--- toast una volta per tipo ---');
m.segnalaErrore('copia','a',new Error('e'),'testo copia'); m.segnalaErrore('copia','a',new Error('e'),'testo copia');
m.segnalaErrore('integrita','b',new Error('e'),'testo integrita');
t('un toast per tipo, non per ripetizione', toast.length===2 && toast[0]==='testo copia' && toast[1]==='testo integrita');
t('ogni segnalazione e comunque registrata', m.reg().conteggio===60+2+3);

console.log('--- ultimaPeriodica ---');
(async()=>{
  const c=m.copieAutomatiche; const T=Date.now(); const intervallo=300000;
  stub=async(cc)=>{ cc.ultimaScritturaFallita=true; return false; };
  c.ultimaPeriodica=0;
  await m.avviaCopiaPeriodica('x');
  t('scrittura fallita: non si aspetta un intervallo intero (ritenta entro ~1 minuto)', (c.ultimaPeriodica+intervallo)-Date.now()<=60000);
  t('scrittura fallita: non resta nemmeno a 0 (niente martellamento a ogni salvataggio)', c.ultimaPeriodica>0);
  stub=async(cc)=>{ cc.ultimaScritturaFallita=false; return true; };
  await m.avviaCopiaPeriodica('x');
  t('scrittura riuscita: ultimaPeriodica resta ad adesso', c.ultimaPeriodica>=T);
  console.log(ok+' ok, '+ko+' KO'); process.exit(ko?1:0);
})();
