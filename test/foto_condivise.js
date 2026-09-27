// Foto condivise tra copie. "Duplica progetto" copia i RIFERIMENTI alle foto, non le immagini:
// originale e copia puntano agli stessi file in IndexedDB. Prima ognuna delle tre cancellazioni
// (foto, prova, progetto) guardava solo l'oggetto cancellato, e dopo 11 secondi svuotava le foto
// anche all'altra copia. Qui si esegue la funzione vera che decide cosa e' ancora in uso (prove,
// prova aperta e copie automatiche), e si controlla che tutte e tre la consultino.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const inUsoCon = new Function('state', 'SUFFISSO_ORIGINALE', 'copieAutomatiche', corpo('idFotoAncoraInUso') + '\nreturn idFotoAncoraInUso();');
const nessunaCopia = { idFoto: new Set(), idNote: new Set() };
const inUso = (state, suf, copie) => inUsoCon(state, suf, copie || nessunaCopia);
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const SUF = (src.match(/const SUFFISSO_ORIGINALE = '([^']+)'/) || [])[1];
t('il suffisso degli originali ritagliati si legge dal file', !!SUF);

const prova = (id, foto) => ({ id, header: {}, photos: foto.map(f => ({ id: f })) });
const progetto = (id, foto) => ({ id, surveys: { S1: prova('S1', foto) } });

console.log('--- Il caso segnalato: un progetto e la sua copia ---');
let state = { photos: [], projects: { A: progetto('A', ['F1', 'F2']), B: progetto('B', ['F1', 'F2']) } };
delete state.projects.A;
let vive = inUso(state, SUF);
t('eliminato l originale, le foto della copia risultano ancora in uso', vive.has('F1') && vive.has('F2'));
delete state.projects.B;
vive = inUso(state, SUF);
t('eliminata anche la copia, non sono piu in uso e si possono cancellare', !vive.has('F1') && !vive.has('F2'));

console.log('--- Due prove che condividono una foto nello stesso progetto ---');
state = { photos: [], projects: { A: { id: 'A', surveys: { S1: prova('S1', ['F1']), S2: prova('S2', ['F1']) } } } };
delete state.projects.A.surveys.S1;
t('eliminata una delle due prove, la foto resta all altra', inUso(state, SUF).has('F1'));

console.log('--- La prova aperta ---');
state = { photos: [{ id: 'F9' }], projects: {} };
t('una foto che vive solo nella prova aperta conta come usata', inUso(state, SUF).has('F9'));
t('e con lei l originale messo da parte prima di un ritaglio', inUso(state, SUF).has('F9' + SUF));

console.log('--- Le copie automatiche ---');
state = { photos: [], projects: {} };
const copie = { idFoto: new Set(['F_COPIA']), idNote: new Set() };
t('una foto che serve solo a una copia automatica resta in uso', inUso(state, SUF, copie).has('F_COPIA'));
t('e con lei il suo originale ritagliato', inUso(state, SUF, copie).has('F_COPIA' + SUF));

console.log('--- Le tre cancellazioni la consultano ---');
t('cancellazione di una foto',
  /async function deletePhoto\(idx, id\)[\s\S]{0,4000}idFotoAncoraInUso\(\)[\s\S]{0,400}deletePhotoFromIDB\(targetId\)/.test(src));
t('cancellazione di una prova',
  /const inUso = [^\n]*idFotoAncoraInUso\(\)[^\n]*\n\s*survPhotos\.forEach\(ph => \{\n\s*if \(ph && ph\.id && !inUso\.has\(ph\.id\)\)/.test(src));
t('cancellazione di un progetto',
  /const inUso = [^\n]*idFotoAncoraInUso\(\)[^\n]*\n\s*for \(const idFoto of fotoDelProgetto\) \{\n\s*if \(inUso\.has\(idFoto\)\) continue;/.test(src));
t('nessun altro punto cancella dal database foto (tre cancellazioni, orfane, definizione)',
  (src.match(/deletePhotoFromIDB\(/g) || []).length === 5);

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
