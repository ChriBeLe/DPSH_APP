// VALORI dei calcoli geotecnici: il motore dell'app (015: βt, Nspt, Nspt', Rpd, strati effettivi;
// 012: σ'v0, Cr, N1,60, pesi di volume e tutte le correlazioni) confrontato con il foglio di
// riferimento dell'utente "Template DPSH_v1.5.ods" (fogli INPUT e OUTPUT, valori in cache).
// I dati del foglio stanno in test/dati/foglio_dpsh_v15_valori.json (strumento, 50 intervalli di
// colpi, strati, e tutte le righe numeriche del foglio OUTPUT, per strato).
//
// Come si legge l'esito:
//   ok    corrisponde al foglio
//   KO    differenza NUOVA rispetto al foglio: la suite fallisce
//   nota  differenza GIA' CONOSCIUTA e documentata (vedi DIFFERENZE_NOTE): stampa i valori ma non fallisce
//
// DIFFERENZA INTENZIONALE N1,60 (decisione dell'utente del 17/11/2026): il foglio calcola
// CN = sqrt(0.9765/σ'v0) con σ'v0 in t/m²; l'app usa CN = sqrt(9.765/σ'v0) (Liao & Whitman, stesse
// unita', tetto 1.5). Per N1,60 e per "Hatanaka & Uchida (1996)" (20+sqrt(15.4*N1,60)) il valore
// atteso e' quindi ricalcolato con la formula corretta a partire da σ'v0, Cr e Nspt' del foglio.
const fs=require('fs');
const src=fs.readFileSync(__dirname+'/../dist/DPSH.html','utf8');
const righe=src.split('\n');
const D=JSON.parse(fs.readFileSync(__dirname+'/dati/foglio_dpsh_v15_valori.json','utf8'));

function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
// Il motore 012 (tabelle, CATEGORIE, calcolaCr, calcolaN160, condizioneFalda, elaboraStratiProva)
// e' un blocco contiguo: lo si prende intero, dalla tabella dei pesi alla tassonomia litologica.
const iA=righe.findIndex(r=>r.includes('// ---- Tabella peso di volume Terzaghi-Peck ----'));
const iB=righe.findIndex(r=>r.includes('// ---- Tassonomia litologica'));
if(iA<0||iB<=iA) throw new Error('blocco 012 non trovato');
const blocco012=righe.slice(iA,iB).join('\n');
const NOMI15=['profonditaAlMillimetro','parametriStrumento','faldaDaHeader','betaTCalcolato','betaTStrumento','rpdDiLog','nsptDiLog','getEffectiveLithologyIn','getLogsPerStratoIn','stratiEffettiviProva','ensureParametriAvanzati'];
const api=new Function(NOMI15.map(corpo).join('\n\n')+'\n'+blocco012+
  '\nreturn {betaTStrumento,rpdDiLog,nsptDiLog,stratiEffettiviProva,CATEGORIE,CATEGORIE_PER_ID,calcolaCr,calcolaN160,condizioneFalda,elaboraStratiProva};')();

let ok=0,ko=0,nota=0;
const out=(tag,n)=>console.log('  '+tag+(tag==='ok'?'  ':tag==='KO'?'  ':' ')+n);
function t(n,c,dettaglio){ if(c){ok++;out('ok',n);} else {ko++;out('KO',n+(dettaglio?' — '+dettaglio:''));} }
// Differenze note: chiave = nome esatto del controllo. Il controllo stampa i valori ("nota") e non fallisce.
const DIFFERENZE_NOTE=new Map([
  ['K0 = 1 - sin(φ) (riga 201)','ERRORE DEL FOGLIO: SIN riceve φ in gradi invece che in radianti (K0 > 1 in due strati, impossibile); l\'app converte in radianti ed e\' corretta'],
]);
function conf(n,app,att,tol){
  tol=tol??1e-6;
  const diff=[];
  att.forEach((a,i)=>{
    const v=app[i];
    const bene=(a==null&&v==null)||(typeof a==='number'&&typeof v==='number'&&isFinite(v)&&Math.abs(v-a)<=tol*Math.max(1,Math.abs(a)));
    if(!bene) diff.push('strato '+(i+1)+' ('+D.strati[i].nome+'): foglio '+a+' / app '+v);
  });
  if(!diff.length){ok++;out('ok',n);return;}
  if(DIFFERENZE_NOTE.has(n)){nota++;out('nota',n+' — '+DIFFERENZE_NOTE.get(n));diff.forEach(d=>console.log('         '+d));return;}
  ko++;out('KO',n);diff.forEach(d=>console.log('         '+d));
}
const R=r=>D.righeOutput[String(r)];
const NS=D.strati.length;

// ---------------------------------------------------------------------------------------------
console.log('--- Strumento: βt e Rpd per intervallo ---');
const S=D.strumento;
const instrument={pesoMassa:S.pesoMassa,pesoAsta:S.pesoAsta,pesoSistema:S.pesoSistema,volata:S.volata,areaPunta:S.areaPunta};
const stepCm=S.passo*100;
const betaT=api.betaTStrumento(instrument,stepCm);
t('βt = '+S.betaT+' (foglio INPUT!I19)',Math.abs(betaT-S.betaT)<1e-9*S.betaT,'app '+betaT);

const falda={faldaDa:S.faldaDa,faldaA:S.faldaA};
const logs=[]; let prec=0;
const idStrato=i=>'S'+(i+1);
let stratoIdx=0;
D.intervalli.forEach(iv=>{
  // stessa regola del foglio: l'intervallo appartiene allo strato la cui base e' >= profondita' di fine
  while(stratoIdx<NS-1 && iv.fine>D.strati[stratoIdx].a) stratoIdx++;
  logs.push({start:prec,end:iv.fine,colpi:iv.colpi,asta:iv.asta,lithology:idStrato(stratoIdx)});
  prec=iv.fine;
});
let kb=0,kn=0,kf=0,kr=0; const det=[];
logs.forEach((lg,i)=>{
  const iv=D.intervalli[i];
  const n=api.nsptDiLog(lg,betaT,falda);
  const rpd=api.rpdDiLog(lg,instrument,stepCm);
  if(Math.abs(betaT*lg.colpi-iv.nspt)>1e-9*Math.max(1,iv.nspt)){kn++;det.push('Nspt riga '+iv.riga);}
  if(Math.abs(n.nsptGrezzo-iv.nspt)>1e-9*Math.max(1,iv.nspt)){kb++;det.push('nsptDiLog grezzo riga '+iv.riga);}
  if(Math.abs(n.nsptFalda-iv.nsptF)>1e-9*Math.max(1,iv.nsptF)){kf++;det.push('Nspt\' riga '+iv.riga+': foglio '+iv.nsptF+' app '+n.nsptFalda);}
  if(Math.abs(rpd-iv.rpd)>1e-9*Math.max(1,iv.rpd)){kr++;det.push('Rpd riga '+iv.riga+': foglio '+iv.rpd+' app '+rpd);}
});
t('Nspt = βt·colpi su tutti i '+logs.length+' intervalli',kn===0&&kb===0,det.filter(d=>/Nspt riga|grezzo/.test(d)).join('; '));
t('Nspt\' con correzione falda (Terzaghi-Peck, 15+0.5·(N-15)) su tutti gli intervalli',kf===0,det.filter(d=>/Nspt'/.test(d)).join('; '));
const inFaldaIv=logs.filter(l=>l.end>=falda.faldaDa&&l.end<=falda.faldaA);
const corretti=inFaldaIv.filter((l,i)=>api.nsptDiLog(l,betaT,falda).nsptFalda<api.nsptDiLog(l,betaT,falda).nsptGrezzo);
t('la correzione scatta davvero in falda ('+corretti.length+' intervalli corretti su '+inFaldaIv.length+' in falda)',corretti.length>0);
// Confermato: la correzione vale per TUTTI i terreni, coerenti o no. Nel foglio nessun intervallo
// coesivo supera 15 in falda, quindi lo si verifica con un intervallo sintetico di uno strato coesivo.
const sintetico={start:5,end:5.2,colpi:Math.ceil(30/betaT),asta:6,lithology:idStrato(2)};
const ns=api.nsptDiLog(sintetico,betaT,falda);
t('la correzione si applica anche a uno strato coesivo (N grezzo '+ns.nsptGrezzo.toFixed(2)+' -> '+ns.nsptFalda.toFixed(2)+')',
  ns.nsptGrezzo>15&&Math.abs(ns.nsptFalda-(15+0.5*(ns.nsptGrezzo-15)))<1e-12);
t('e fuori falda nessuna correzione',api.nsptDiLog(Object.assign({},sintetico,{end:4.8}),betaT,falda).nsptFalda===api.nsptDiLog(Object.assign({},sintetico,{end:4.8}),betaT,falda).nsptGrezzo);
t('Rpd per intervallo = foglio (colonna F)',kr===0,det.filter(d=>/Rpd/.test(d)).join('; '));

// ---------------------------------------------------------------------------------------------
console.log('--- Medie per strato (stratiEffettiviProva) ---');
// Tre varianti dello stesso strato: come nel foglio (coesivo dove dice SI), tutti incoerenti, tutti coesivi.
// Servono perche' il foglio calcola ogni correlazione su ogni strato, mentre l'app mostra le
// correlazioni "granulari" solo sugli incoerenti e quelle "coesive" solo sui coesivi.
const PESO_FOGLIO='peso del foglio (secco Meyerhof ed altri, saturo Terzaghi-Peck)';
function preparaStrati(modo){
  return D.strati.map((s,i)=>({id:idStrato(i),name:s.nome,
    behavior:modo==='inc'?'incoerente':modo==='coes'?'coesivo':(s.coesivo?'coesivo':'incoerente'),parametriAvanzati:{}}));
}
// Nel foglio le due celle "peso secco" e "peso saturo" si scelgono separatamente (colore): qui
// secco = Meyerhof ed altri, saturo = Terzaghi-Peck (1967). Nel motore ogni candidato porta la
// coppia: si aggiunge un candidato di prova con quella coppia, per riprodurre la scelta del foglio.
const catPeso=api.CATEGORIE_PER_ID.pesoDiVolume;
const idxTP=catPeso.candidati.findIndex(c=>c.autore==='Terzaghi-Peck (1967)');
const idxMey=catPeso.candidati.findIndex(c=>c.autore==='Meyerhof ed altri');
catPeso.candidati.push({autore:PESO_FOGLIO,terreno:null,calcola:c=>({
  secco:catPeso.candidati[idxMey].calcola(c).secco,saturo:catPeso.candidati[idxTP].calcola(c).saturo})});
const idxFoglio=catPeso.candidati.length-1;
function esegui(modo,sceltaPhi){
  const strati=preparaStrati(modo);
  strati.forEach(s=>{s.parametriAvanzati.pesoDiVolume={autoreIndex:idxFoglio};
    if(sceltaPhi!=null) s.parametriAvanzati.angoloAttrito={autoreIndex:sceltaPhi};});
  const eff=api.stratiEffettiviProva(logs,strati,instrument,stepCm,falda);
  return {eff,el:api.elaboraStratiProva(eff,falda)};
}
const reale=esegui('reale'), inc=esegui('inc'), coes=esegui('coes');
t('gli strati effettivi sono '+NS+' e in ordine di profondita\'',reale.eff.length===NS&&reale.eff.every((e,i)=>e.id===idStrato(i)));
conf('profondita\' da (m)',reale.eff.map(e=>e.profonditaDa),D.strati.map(s=>s.da),1e-9);
conf('profondita\' a (m)',reale.eff.map(e=>e.profonditaA),D.strati.map(s=>s.a),1e-9);
conf('Nspt medio (riga 7)',reale.eff.map(e=>e.nsptGrezzo),R(7),1e-9);
conf('Nspt\' medio (riga 18, con correzione falda)',reale.eff.map(e=>e.nsptFalda),R(18),1e-9);
conf('Rpd medio (riga 19)',reale.eff.map(e=>e.rpdMedio),R(19),1e-9);

console.log('--- Pre-elaborazione: falda, profondita\' media, Cr, σ\'v0, N1,60 ---');
const pre=reale.el.map(x=>x.preElaborazione);
t('condizione di falda per strato (riga 17: '+D.righeOutput['17'].join(', ')+')',pre.every((p,i)=>p.inFalda===D.righeOutput['17'][i]),pre.map(p=>p.inFalda).join(', '));
conf('spessore (riga 5)',pre.map(p=>p.spessore),R(5),1e-9);
conf('profondita\' media strato (riga 22)',pre.map(p=>p.profonditaMedia),R(22),1e-9);
conf('Cr correzione lunghezza aste (riga 14)',pre.map(p=>p.cr),R(14),1e-12);
conf('γH — peso x spessore (riga 20)',pre.map(p=>p.gammaH),R(20),1e-9);
conf('σ\'v0 a cascata (riga 23)',pre.map(p=>p.sigmaV0),R(23),1e-9);
t('stato di consistenza (riga 26)',pre.every((p,i)=>p.statoConsistenza===D.righeOutput['26'][i]),pre.map(p=>p.statoConsistenza).join(' | '));

console.log('--- N1,60 (differenza INTENZIONALE: CN = sqrt(9.765/σ\'v0), foglio 0.9765) ---');
// Atteso: formula corretta, con σ'v0, Cr e Nspt' del foglio.
const cnOk=s=>Math.min(Math.sqrt(9.765/s),1.5), cnFoglio=s=>Math.min(Math.sqrt(0.9765/s),1.5);
const n160Corr=R(18).map((nf,i)=>nf*R(14)[i]*cnOk(R(23)[i]));
const n160Foglio=R(18).map((nf,i)=>nf*R(14)[i]*cnFoglio(R(23)[i]));
const approx=(a,b,d)=>a.every((x,i)=>Math.abs(x-b[i])<=d);
t('atteso corretto = 14.22, 7.90, 2.99, 17.39, 25.42 (a 0.01)',approx(n160Corr,[14.22,7.90,2.99,17.39,25.42],0.0051),n160Corr.map(x=>x.toFixed(2)).join(', '));
conf('N1,60 con la formula 0.9765 riproduce il foglio (riga 12): documenta la differenza',n160Foglio,R(12),1e-9);
t('la differenza e\' reale: corretto != foglio su ogni strato',n160Corr.every((x,i)=>Math.abs(x-R(12)[i])>0.01));
conf('N1,60 dell\'app (CN = sqrt(9.765/σ\'v0), tetto 1.5)',pre.map(p=>p.n160),n160Corr,1e-9);

console.log('--- Pesi di volume (righe 30-36) ---');
const trovaCand=(catId,autore,terreno)=>{
  const c=api.CATEGORIE_PER_ID[catId].candidati.findIndex(x=>x.autore===autore&&(x.terreno??null)===(terreno??null));
  if(c<0) throw new Error('candidato inesistente: '+autore+' / '+terreno);
  return c;
};
const pesoDi=(modo,autore)=>{
  const idx=trovaCand('pesoDiVolume',autore,null);
  const r=esegui(modo); // pesi calcolati direttamente con il candidato, sullo stesso ctx del motore
  return r.eff.map((e,i)=>api.CATEGORIE_PER_ID.pesoDiVolume.candidati[idx].calcola({nsptFalda:e.nsptFalda,isCoesivo:modo==='coes'||(modo==='reale'&&D.strati[i].coesivo)}));
};
conf('Terzaghi-Peck (1967) peso secco (riga 30)',pesoDi('reale','Terzaghi-Peck (1967)').map(p=>p.secco),R(30),1e-12);
conf('Terzaghi-Peck (1967) peso saturo (riga 31)',pesoDi('reale','Terzaghi-Peck (1967)').map(p=>p.saturo),R(31),1e-12);
conf('Meyerhof ed altri peso secco (riga 35)',pesoDi('reale','Meyerhof ed altri').map(p=>p.secco),R(35),1e-9);
conf('Meyerhof ed altri peso saturo incoerente (riga 32)',pesoDi('inc','Meyerhof ed altri').map(p=>p.saturo),R(32),1e-9);
conf('Meyerhof ed altri peso saturo coesivo (riga 33)',pesoDi('coes','Meyerhof ed altri').map(p=>p.saturo),R(33),1e-9);
conf('Meyerhof ed altri peso saturo scelto per tipo di strato (riga 36)',pesoDi('reale','Meyerhof ed altri').map(p=>p.saturo),R(36),1e-9);
conf('peso secco scelto nel foglio (riga 28) = '+PESO_FOGLIO,pre.map(p=>p.pesoSecco),R(28),1e-9);
conf('peso saturo scelto nel foglio (riga 29) = '+PESO_FOGLIO,pre.map(p=>p.pesoSaturo),R(29),1e-9);

console.log('--- Correlazioni: un controllo per autore (foglio OUTPUT, 5 strati) ---');
// [riga del foglio, categoria, autore, terreno, variante di strato su cui il motore le mostra]
// 'inc' = tutti incoerenti, 'coes' = tutti coesivi, 'reale' = categorie "miste" (sempre mostrate).
const M=[];
const add=(cat,modo,righeFoglio)=>righeFoglio.forEach(([r,a,te])=>M.push({r,cat,modo,a,te}));
add('angoloAttrito','inc',[[40,'Meyerhof (1965)','sabbie con limo < 5%'],[41,'Meyerhof (1965)','sabbie con limo > 5%'],
  [43,'Peck-Hanson-Thorburn (1974)','sabbie compatte e ghiaie'],[45,'Sowers (1961)','sabbie in genere'],
  [47,'De Mello (1971)','sabbie fino a ghiaiose'],[49,'Malcev (1964)','sabbie in genere'],[50,'Schmertmann (1975)',null],
  [52,'Schmertmann (1978)','sabbie fini'],[53,'Schmertmann (1978)','sabbie medie'],[54,'Schmertmann (1978)','sabbie grossolane'],
  [55,'Schmertmann (1978)','ghiaie e sabbie, ghiaietto'],[57,'Shioi-Fukui (1982)','sabbie fini e limi'],[58,'Shioi-Fukui (1982)','sabbie medie e ghiaiose'],
  [60,'Owasaki & Iwasaki (1959)','sabbie fino a ghiaiose'],[62,'Wolff (1989)','sabbie fini'],[63,'Wolff (1989)','sabbie grosse']]);
add('coesioneNonDrenata','coes',[[69,'Terzaghi-Peck (1948)','argille a bassa plasticità'],[70,'Terzaghi-Peck (1948)','arg. a medio-bassa plast.'],
  [71,'Terzaghi-Peck (1948)','argille a media plasticità'],[72,'Terzaghi-Peck (1948)','argille ad alta plasticità'],
  [73,'Terzaghi-Peck (1948)','argille sabbioso siltose'],[74,'Terzaghi-Peck (1948)','argille marnose fratturate'],
  [75,'Hara ed altri (1971)',null],[76,'Begemann (1974)',null],[77,'Stroud (1974)',null],[78,'De Beer (1983)',null],
  [79,'Fletcher (1965)',null],[80,'Houston (1960)',null],[82,'Sanglerat (1948)','argille a bassa plasticità'],
  [83,'Sanglerat (1948)','argille limoso sabbiose'],[84,'Sanglerat (1948)','argille plastiche'],[85,'Sanglerat (1948)','argille siltose'],
  [87,'Schmertmann (1978)','valori medi'],[88,'Schmertmann (1978)','valori massimi'],[90,'Shioi-Fukui (1982)','argille a bassa plasticità'],
  [91,'Shioi-Fukui (1982)','argille a media plasticità'],[92,'Shioi-Fukui (1982)','argille ad alta plasticità']]);
add('moduloElastico','reale',[[96,'Schmertmann (1978)','sabbie fini'],[97,'Schmertmann (1978)','sabbie medie'],[98,'Schmertmann (1978)','sabbie grossolane'],
  [99,'Schmertmann (1978)','limi siltoso sabbiosi (min)'],[100,'Schmertmann (1978)','limi siltoso sabbiosi (max)'],
  [102,'Schultze-Menzenbach (1961)','sabbie fini'],[103,'Schultze-Menzenbach (1961)','sabbie medie'],[104,'Schultze-Menzenbach (1961)','sabbie limose'],
  [105,'Schultze-Menzenbach (1961)','limi siltoso sabbiosi'],[106,'Schultze-Menzenbach (1961)','sabbie ghiaiose'],[107,'Schultze-Menzenbach (1961)','sabbie e ghiaie'],
  [108,'Schultze-Menzenbach (1961)','limi argillosi (IP<15)'],[109,'Schultze-Menzenbach (1961)','limi argillosi (IP>15)'],
  [111,"D'Apollonia ed altri (1970)",'sabbie'],[112,"D'Apollonia ed altri (1970)",'sabbie e ghiaie'],[113,"D'Apollonia ed altri (1970)",'sabbie SC'],
  [115,'Webb (1970)','sabbie sature'],[116,'Webb (1970)','sabbie con fine plastico'],[118,'Bowles (1982)','sabbie argillose'],
  [119,'Bowles (1982)','sabbie limose, limi sabb.'],[120,'Bowles (1982)','sabbie medie'],[121,'Bowles (1982)','sabbie ghiaiose e ghiaie'],
  [122,'Burland & Burbidge (1985)',null],[124,'Tornaghi ed altri (1988)','sabbie, sabbie e ghiaie'],[126,'Stroud (1989)','sabbie e ghiaie'],[127,'Stroud (1989)','argille']]);
add('moduloEdometrico','reale',[[131,'Buismann-Sanglerat (1974)','sabbie'],[132,'Buismann-Sanglerat (1974)','sabbie argillose'],
  [133,'Buismann-Sanglerat (1974)','argille sabbiose'],[134,'Buismann-Sanglerat (1974)','argille compatte'],
  [136,'Farrent (1963)','sabbie anche con ghiaie'],[138,'Menzenbach e Malcev','sabbie fini'],[139,'Menzenbach e Malcev','sabbie medie'],
  [140,'Menzenbach e Malcev','sabbie e ghiaie'],[141,'Menzenbach e Malcev','sabbie ghiaiose'],[143,'Begemann (1974)','limi con sabbie'],
  [144,'Begemann (1974)','ghiaie con sabbie'],[146,'Stroud e Butler (1975)','litotipi a bassa plasticità'],[147,'Stroud e Butler (1975)','litotipi a media plasticità'],
  [148,'Trofimenkov (1974)',null],[150,'Vesic (1970)','valori minimi'],[151,'Vesic (1970)','valori massimi']]);
add('densitaRelativa','inc',[[155,'Meyerhof (1957)','da limi a ghiaie'],[156,'Gibbs e Holtz (1957)',null],[158,'Skempton (1986)','sabbie fini'],
  [159,'Skempton (1986)','sabbie grosse'],[160,'Skempton (1986)','limi e sabbie'],[161,'Skempton (1986)','sabbie da fini a grosse'],
  [163,'Schultze-Menzenbach (1961)','sabbie da fini a ghiaiose'],[165,'Bazara (1967)','sabbie e ghiaie'],
  [167,'Yoshida e Kokusho (1988)','sabbie fini'],[168,'Yoshida e Kokusho (1988)','sabbie 75%, ghiaie 25%'],
  [169,'Yoshida e Kokusho (1988)','sabbie e ghiaie 50%'],[170,'Yoshida e Kokusho (1988)','tutti i terreni granulari']]);
add('moduloTaglio','reale',[[178,'Owasaki & Iwasaki (1959)','sabbie pulite'],[179,'Owasaki & Iwasaki (1959)','sabbie con fine plastico'],
  [180,'Owasaki & Iwasaki (1959)','limi plastici e argille'],[182,'Otha & Goto (1978)','sabbie fini'],[183,'Otha & Goto (1978)','sabbie medie'],
  [184,'Otha & Goto (1978)','sabbie grosse'],[185,'Otha & Goto (1978)','sabbie ghiaiose'],[186,'Otha & Goto (1978)','ghiaie e ghiaie sabbiose'],
  [188,'Robertson e Campanella (1983)','sabbie'],[190,'Crespellani & Vannucchi','sabbie in generale']]);
add('resistenzaCPT','reale',[[194,'Robertson (1983)','limi e limi sabbiosi'],[195,'Robertson (1983)','limi sabbiosi, sabbie limose'],
  [196,'Robertson (1983)','sabbie e ghiaie'],[197,'Robertson (1983)','argille limose o sabb. (min)'],[198,'Robertson (1983)','argille limose o sabb. (max)']]);
const RUN={inc,coes,reale};
const LAB={angoloAttrito:'Angolo di attrito',coesioneNonDrenata:'Coesione non drenata',moduloElastico:'Modulo elastico',moduloEdometrico:'Modulo edometrico',
  densitaRelativa:'Densita\' relativa',moduloTaglio:'Modulo di taglio',resistenzaCPT:'Resistenza CPT'};
M.forEach(m=>{
  const idx=trovaCand(m.cat,m.a,m.te);
  const app=RUN[m.modo].el.map(x=>x.categorie[m.cat].candidati.find(c=>c.index===idx)?.valore);
  conf(LAB[m.cat]+' — '+m.a+(m.te?' ('+m.te+')':'')+' [riga '+m.r+']',app,R(m.r),1e-9);
});

console.log('--- Hatanaka & Uchida (1996): usa N1,60 (differenza INTENZIONALE come sopra) ---');
{
  const idx=trovaCand('angoloAttrito','Hatanaka & Uchida (1996)','sabbie fini o limose');
  const att=n160Corr.map(n=>20+Math.sqrt(15.4*n));
  t('atteso corretto = 34.8, 31.0, 26.8, 36.4, 39.8 (a 0.05)',approx(att,[34.8,31.0,26.8,36.4,39.8],0.051),att.map(x=>x.toFixed(2)).join(', '));
  const attFoglio=n160Foglio.map(n=>20+Math.sqrt(15.4*n));
  conf('Angolo di attrito — Hatanaka & Uchida (1996) con N1,60 a 0.9765 riproduce il foglio [riga 65]',attFoglio,R(65),1e-9);
  conf('Angolo di attrito — Hatanaka & Uchida (1996) (sabbie fini o limose) [riga 65, con CN corretto]',
    inc.el.map(x=>x.categorie.angoloAttrito.candidati.find(c=>c.index===idx).valore),att,1e-9);
}

console.log('--- Derivati: Poisson, K0, qu (righe 201-204) ---');
{
  // Il foglio li ricava dall'angolo di attrito scelto PER STRATO: Meyerhof (1965) sabbie con limo > 5%
  // (riga 41) sugli strati 1-3, Peck-Hanson-Thorburn (1974) (riga 43) sugli strati 4-5.
  const idxA=trovaCand('angoloAttrito','Meyerhof (1965)','sabbie con limo > 5%');
  const idxB=trovaCand('angoloAttrito','Peck-Hanson-Thorburn (1974)','sabbie compatte e ghiaie');
  const strati=preparaStrati('inc');
  strati.forEach((s,i)=>{s.parametriAvanzati.pesoDiVolume={autoreIndex:idxFoglio};s.parametriAvanzati.angoloAttrito={autoreIndex:i<3?idxA:idxB};});
  const eff=api.stratiEffettiviProva(logs,strati,instrument,stepCm,falda);
  const rr={el:api.elaboraStratiProva(eff,falda)};
  const phiFoglio=R(41).map((v,i)=>i<3?v:R(43)[i]);
  conf('angolo di attrito scelto per strato (righe 41/43)',rr.el.map(x=>x.categorie.angoloAttrito.selezionato.valore),phiFoglio,1e-9);
  conf('Poisson da φ (riga 203)',rr.el.map(x=>x.derivati.poisson),R(203),1e-9);
  conf('qu = 12·Nspt\'·0.0102 (riga 204)',rr.el.map(x=>x.derivati.qu),R(204),1e-9);
  conf('K0 = 1 - sin(φ) (riga 201)',rr.el.map(x=>x.derivati.K0),R(201),1e-9);
  // Il foglio calcola 1-SIN(φ) con φ in GRADI passato a SIN (che vuole radianti): i suoi valori (>1) sono errati.
  const k0Giusto=phiFoglio.map(f=>1-Math.sin(f*Math.PI/180));
  t('K0 dell\'app = 1 - sin(φ in radianti) calcolato a mano dai φ del foglio',rr.el.every((x,i)=>Math.abs(x.derivati.K0-k0Giusto[i])<1e-9));
}

console.log('--- Presenti nel foglio ma non nel motore ---');
const nelFoglioSolo=['Cubrinowski-Ischiara (1988) (densita\' relativa, righe 172-174)'];
nelFoglioSolo.forEach(n=>{nota++;out('nota',n+': il foglio la calcola, l\'app non la offre tra i candidati');});
t('il motore non ha candidati "Cubrinowski-Ischiara" (se compaiono, aggiungere il controllo)',
  !api.CATEGORIE_PER_ID.densitaRelativa.candidati.some(c=>/Cubrinowski/.test(c.autore)));

console.log('\n'+ok+' ok, '+ko+' KO, '+nota+' note (differenze note)');
process.exit(ko?1:0);
