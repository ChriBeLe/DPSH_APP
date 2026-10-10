// FASE 0 DEL PIANO: il capitolo introduttivo passa dalla stessa funzione delle prove, con una
// prova SINTETICA — zero misurazioni, zero foto. Se il motore di calcolo non tollera un
// elenco vuoto, "si comporta come una prova" costa molto piu' del previsto.
// «Dovrebbe funzionare» non e' una verifica: questa lo e'.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
  throw new Error('fine non trovata: '+nome);
}
const NOMI=['betaTStrumento','betaTCalcolato','nsptDiLog','rpdDiLog','arricchisciLogsConNsptRpd',
            'getLogsPerStratoIn','stratiEffettiviProva','faldaDaHeader','elencoItaliano','formattaCoordinateProve','valoriCantiere','fmtIT','formattaDataIT',
            // la quota del piano campagna viene dal DTM del progetto (qui assente: null)
            'quotaDellaProva','quotaDtm',
            // valoriCantiere conta le verticali, non le interpretazioni alternative («3B»)
            'radiceProva','proveFisiche'];
const api=new Function('state','Math',
  NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};'
)({ instrument:{}, settings:{stepCm:20} }, Math);

let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };
const prova = (f) => { try { return { v: f(), errore: null }; } catch (e) { return { v: null, errore: e.message }; } };

const strumento = { pesoMassa:63.0, volata:0.75, areaPunta:20, pesoAsta:6.30, pesoSistema:2.5 };
const falda = api.faldaDaHeader({});

console.log('--- Una prova senza NESSUNA misurazione ---');
{
  const r1 = prova(() => api.arricchisciLogsConNsptRpd([], strumento, 20, falda));
  t('arricchisciLogsConNsptRpd non esplode', r1.errore === null);
  t('e restituisce un elenco vuoto, non undefined', Array.isArray(r1.v) && r1.v.length === 0);
  if (r1.errore) console.log('       ', r1.errore);

  const r2 = prova(() => api.stratiEffettiviProva([], [{id:'s1',name:'Strato 1'}], strumento, 20, falda));
  t('stratiEffettiviProva non esplode', r2.errore === null);
  t('e non inventa strati dove non c e nessuna misura', Array.isArray(r2.v) && r2.v.length === 0);
  if (r2.errore) console.log('       ', r2.errore);

  const r3 = prova(() => api.stratiEffettiviProva([], [], strumento, 20, falda));
  t('nemmeno senza strati', r3.errore === null && r3.v.length === 0);

  const r4 = prova(() => api.betaTStrumento({}, 20));
  t('il coefficiente regge uno strumento vuoto', r4.errore === null && isFinite(r4.v) && r4.v > 0);

  const r5 = prova(() => api.rpdDiLog({asta:1, colpi:0, end:1}, strumento, 20));
  t('Rpd con zero colpi da zero, non un infinito', r5.errore === null && r5.v === 0);
}

console.log('--- I valori del cantiere su una prova sintetica ---');
{
  // Esattamente la forma che avrebbe la prova finta del capitolo introduttivo.
  const finta = { id:'__introduzione__', header:{}, instrument:{}, settings:{}, logs:[], photos:[], strati:[] };
  const proj = { id:'p', comune:'Sava', surveys:{ __introduzione__: finta } };
  const r = prova(() => api.valoriCantiere(proj));
  t('valoriCantiere regge una prova sintetica', r.errore === null);
  if (r.errore) console.log('       ', r.errore);
  t('non inventa una profondità che non esiste', r.v && r.v.fraseProfondita.testo === '');
  t('e la segnala come mancante', r.v && r.v.fraseProfondita.mancante === true);
  t('ma i dati del progetto ci sono lo stesso', r.v && r.v.comune.testo === 'Sava');
}

console.log('--- Il quadro complessivo ---');
t('nessun passaggio della catena di calcolo richiede almeno una misurazione', ko === 0);

console.log('--- La prova sintetica e la riga di export sono cablate ---');
{
  t('la prova sintetica esiste', /function provaSinteticaIntroduzione\(proj\)/.test(src));
  t('porta zero misurazioni e zero foto', /logs: \[\], photos: \[\], strati: \[\]/.test(src));
  t('ma eredita strumento e coordinate della prima prova',
     /instrument: JSON\.parse\(JSON\.stringify\(prima\.instrument/.test(src)
     && /lat: \(prima\.header && prima\.header\.lat\)/.test(src));
  t('e passa dalla STESSA funzione delle prove',
     /const introResult = await buildSurveyReportHtml\(survIntro, proj, false\);/.test(src));
  t('la sezione entra in TESTA, prima del ciclo sulle prove',
     src.indexOf("etichetta: 'Introduzione'") < src.indexOf('for (let i = 0; i < survList.length; i++)', src.indexOf('const sezioni = [];', src.indexOf('async function buildCompleteReportHtml'))));
  // L'etichetta ora passa da separaNumeroDaEtichetta (la numerazione unica dell'indice) invece
  // di finire direttamente nel template: il ripiego su "Prova N°" è lo stesso.
  t('l indice sa scrivere un etichetta diversa da "Prova N°"', /separaNumeroDaEtichetta\(r\.etichetta \|\| \('Prova N° ' \+ r\.numero\)\)/.test(src));
  t('e conta le SEZIONI, non le prove, per decidere se serve',
     /const sezioniPreviste = survList\.length \+ \(\(opzioni && opzioni\.includiIntroduzione\) \? 1 : 0\)[^;\n]*;/.test(src));

  t('nella schermata di export c e la riga del capitolo', src.includes('id="chkEsportaPdfIntroduzione"'));
  t('con un selettore di template suo, come le prove', src.includes('id="selEsportaPdfTemplateIntroduzione"'));
  t('NASCE SPENTO: nessun capitolo a sorpresa in un documento firmato',
     /\{ attiva: false, templateId: 'classico' \}/.test(src));
  t('e la scelta arriva davvero all esportazione',
     /includiIntroduzione: !!\(projEsp && projEsp\.introduzione && projEsp\.introduzione\.attiva\)/.test(src));
}

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
