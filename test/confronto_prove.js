// Confronto tra prove (voce 12). La figura serve a correlare gli strati tra verticali: se la colonna
// stratigrafica attribuisce un intervallo allo strato sbagliato, la correlazione e' sbagliata e nessuno
// se ne accorge guardando un disegno. Qui si eseguono le funzioni vere che costruiscono fasce e valori.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['rpdDiLog','colonnaStratigrafica','serieConfrontoProva','massimoTondo'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const strati = [{ id: 'A', name: 'Riporto', color: '#aaaaaa' }, { id: 'B', name: 'Sabbia', color: '#bbbbbb' }, { id: 'C', name: 'Argilla', color: '#cccccc' }];
const log = (start, end, colpi, lithology) => ({ start, end, colpi, asta: Math.floor(start) + 1, lithology });

console.log('--- Colonna stratigrafica ---');
let f = api.colonnaStratigrafica([log(0, 0.2, 3, 'A'), log(0.2, 0.4, 4, ''), log(0.4, 0.6, 8, 'B'), log(0.6, 0.8, 9, ''), log(0.8, 1.0, 15, 'C')], strati);
t('intervalli contigui dello stesso strato diventano una fascia', f.length === 3 && f[0].da === 0 && Math.abs(f[0].a - 0.4) < 1e-9);
t('un intervallo senza strato eredita quello sopra', f[1].stratoId === 'B' && Math.abs(f[1].a - 0.8) < 1e-9);
t('con nome e colore dello strato', f[2].nome === 'Argilla' && f[2].colore === '#cccccc');
f = api.colonnaStratigrafica([log(0, 0.2, 3, ''), log(0.2, 0.4, 3, '')], strati);
t('senza nessuna assegnazione vale il primo strato, come nel grafico della prova', f.length === 1 && f[0].stratoId === 'A');
f = api.colonnaStratigrafica([log(0, 0.2, 3, 'ZZZ')], strati);
t('uno strato che non esiste piu ricade sul primo', f[0].stratoId === 'A');
f = api.colonnaStratigrafica([log(0, 0.2, 3, 'A'), log(0.6, 0.8, 3, 'A')], strati);
t('un buco nelle profondita spezza la fascia', f.length === 2);
t('nessun intervallo, nessuna fascia', api.colonnaStratigrafica([], strati).length === 0 && api.colonnaStratigrafica(null, null).length === 0);

console.log('--- I valori del confronto ---');
const prova = { instrument: { pesoMassa: 63.5, volata: 0.75, areaPunta: 20, pesoAsta: 6.3, pesoSistema: 8 }, settings: { stepCm: 20 },
  logs: [log(0.2, 0.4, 7), log(0, 0.2, 5), log(0.4, 0.4, 9)] };
const colpi = api.serieConfrontoProva(prova, 'colpi');
t('un punto per intervallo, in ordine di profondita', colpi.length === 2 && colpi[0].da === 0 && colpi[1].valore === 7);
t('gli intervalli di spessore zero si scartano', colpi.every(pt => pt.a > pt.da));
const rpd = api.serieConfrontoProva(prova, 'rpd');
t('Rpd: lo stesso numero di rpdDiLog, la formula della scheda di campo',
  rpd[0].valore > 0 && Math.abs(rpd[0].valore - api.rpdDiLog(log(0, 0.2, 5), prova.instrument, 20)) < 1e-9);
t('una prova senza intervalli da una serie vuota', api.serieConfrontoProva({}, 'colpi').length === 0);

console.log('--- Il fondo scala ---');
t('7 -> 10', api.massimoTondo(7) === 10);
t('23 -> 25', api.massimoTondo(23) === 25);
t('51 -> 100', api.massimoTondo(51) === 100);
t('2,1 -> 2,5', api.massimoTondo(2.1) === 2.5);
t('100 -> 100, mai sotto il dato', api.massimoTondo(100) === 100);
t('zero o niente -> 10', api.massimoTondo(0) === 10 && api.massimoTondo(undefined) === 10);

console.log('--- Cablaggio ---');
t('la finestra e la riga nel pannello del progetto', src.includes('id="modalConfrontoProve"') && src.includes('id="btnProjActConfronta"'));
t('le interpretazioni alternative partono nascoste', /attive: new Set\(proveFisiche\(prove\)\.map\(s => s\.id\)\)/.test(src));
t('colonne sulla stessa scala delle profondita del grafico', /colonnaStratigrafica\(s\.logs, proj\.strati\)\.forEach\(f => \{[\s\S]{0,200}y\(f\.da\)/.test(src));
t('con meno di due prove confrontabili lo dice invece di aprire una figura vuota',
  /prove\.length < 2\) \{\s*appAlert\('Per confrontare servono almeno due prove/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
