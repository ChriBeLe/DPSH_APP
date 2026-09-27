// βt: il numero che finisce STAMPATO nella relazione accanto ai parametri dello strumento.
// Se i due non corrispondono, l'errore si trascina in ogni documento consegnato — ed e'
// esattamente quello che e' successo nelle due relazioni Eurisko.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['betaTCalcolato','betaTStrumento'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const r3 = x => Math.round(x*1000)/1000;

console.log('--- I due numeri delle relazioni Eurisko ---');
const eurisko = { pesoMassa:63.0, volata:0.75, areaPunta:20, pesoAsta:6.30, pesoSistema:2.5 };
console.log('       massa 63,0 ->', r3(api.betaTCalcolato(eurisko, 20)));
t('massa 63,0 kg da 1,491 — il coefficiente della seconda relazione', r3(api.betaTCalcolato(eurisko, 20)) === 1.491);
const eurisko2 = Object.assign({}, eurisko, { pesoMassa: 63.5 });
console.log('       massa 63,5 ->', r3(api.betaTCalcolato(eurisko2, 20)));
t('massa 63,5 kg da 1,504 — il coefficiente della PRIMA relazione', r3(api.betaTCalcolato(eurisko2, 20)) === 1.504);
console.log('       -> la prima relazione ha calcolato con 63,5 e stampato 63,0 nell elenco.');

console.log('--- Il valore imposto ---');
t('senza valore imposto vale quello calcolato',
   api.betaTStrumento(eurisko, 20) === api.betaTCalcolato(eurisko, 20));
t('con un valore imposto vale quello', api.betaTStrumento(Object.assign({betaTForzato:1.504}, eurisko), 20) === 1.504);
t('ma il calcolato resta disponibile per il confronto', r3(api.betaTCalcolato(Object.assign({betaTForzato:1.504}, eurisko), 20)) === 1.491);

console.log('--- Le difese ---');
t('un campo vuoto NON azzera tutti gli Nspt', api.betaTStrumento(Object.assign({betaTForzato:''}, eurisko), 20) === api.betaTCalcolato(eurisko, 20));
t('uno zero nemmeno', api.betaTStrumento(Object.assign({betaTForzato:0}, eurisko), 20) === api.betaTCalcolato(eurisko, 20));
t('e nemmeno un testo', api.betaTStrumento(Object.assign({betaTForzato:'abc'}, eurisko), 20) === api.betaTCalcolato(eurisko, 20));
t('un negativo viene rifiutato', api.betaTStrumento(Object.assign({betaTForzato:-2}, eurisko), 20) === api.betaTCalcolato(eurisko, 20));

console.log('--- Il pannello e cablato ---');
t('il pannello esiste nella pagina', src.includes('id="lblBetaTCalcolato"') && src.includes('id="chkBetaTForzato"') && src.includes('id="numBetaTForzato"'));
t('si aggiorna mentre si digitano i parametri', /\[numPesoMassa, numPesoAsta, numVolata, numAreaPunta, numPesoSistema\]\.forEach/.test(src));
t('e anche al cambio prova', /if \(typeof aggiornaPannelloBetaT === 'function'\) aggiornaPannelloBetaT\(\);/.test(src));

console.log('--- I tre livelli: calcolato, prova, cantiere ---');
// L'ereditarieta' e' risolta in un punto solo, al caricamento della prova. Qui si riproduce
// quella riga per verificarne la regola, invece di fidarsi che sia scritta giusta.
const ereditaDalCantiere = (instrument, proj) => {
  const i = Object.assign({}, instrument);
  if (!i.betaTForzato && proj.betaTForzato) i.betaTForzato = proj.betaTForzato;
  return i;
};
const strum = { pesoMassa:63.0, volata:0.75, areaPunta:20, pesoAsta:6.30 };
t('senza niente, vale il calcolato',
   r3(api.betaTStrumento(ereditaDalCantiere(strum, {}), 20)) === 1.491);
t('il cantiere lo dichiara e la prova lo adotta',
   api.betaTStrumento(ereditaDalCantiere(strum, { betaTForzato: 1.6 }), 20) === 1.6);
t('ma una prova che ne ha uno suo NON viene sovrascritta dal cantiere',
   api.betaTStrumento(ereditaDalCantiere(Object.assign({betaTForzato:1.2}, strum), { betaTForzato: 1.6 }), 20) === 1.2);
t('e il calcolato resta sempre disponibile per il confronto',
   r3(api.betaTCalcolato(ereditaDalCantiere(strum, { betaTForzato: 1.6 }), 20)) === 1.491);

console.log('--- I comandi dei due livelli ---');
t('i due tasti esistono', src.includes('id="btnBetaTSoloProva"') && src.includes('id="btnBetaTTuttoProgetto"'));
t('"tutto il progetto" scrive su OGNI prova del cantiere',
   /Object\.values\(proj\.surveys \|\| \{\}\)\.forEach\(surv => \{[\s\S]{0,160}betaTForzato = v;/.test(src));
t('e lo dichiara sul progetto, cosi le prove nuove lo ereditano', /proj\.betaTForzato = v;/.test(src));
t('"solo questa prova" toglie la dichiarazione del cantiere senza toccare le altre prove',
   /delete proj\.betaTForzato;/.test(src));
t('il caricamento della prova applica l ereditarieta',
   /if \(!state\.instrument\.betaTForzato && proj\.betaTForzato\)/.test(src));
t('e il pannello segnala quando una prova diverge dal cantiere',
   /questa prova usa un valore diverso/.test(src));

console.log('--- I due campi nuovi dell anagrafica ---');
t('i campi esistono nell intestazione cantiere',
   src.includes('id="txtSedeCommittente"') && src.includes('id="txtDenominazioneIntervento"'));
t('si SCRIVONO sul progetto, non sulla prova',
   /scriviDatoProgettoCorrente\('sedeCommittente'/.test(src) && /scriviDatoProgettoCorrente\('denominazioneIntervento'/.test(src));
t('e si RILEGGONO dal progetto', /progettoCorrente\.sedeCommittente/.test(src) && /progettoCorrente\.denominazioneIntervento/.test(src));
t('non passano da state.header, che e della prova',
   !/state\.header\.sedeCommittente/.test(src) && !/state\.header\.denominazioneIntervento/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
