// Copie automatiche (voce 11) e promemoria del backup completo (decisione F). Le regole che decidono
// cosa tenere e cosa cancellare sono la parte che sbaglia in silenzio: una copia buttata troppo presto
// si scopre solo il giorno in cui serviva. Qui si eseguono le funzioni vere, e si controlla che ogni
// azione che toglie dati passi da una copia prima.
const fs=require('fs');
const P=__dirname + '/../dist/DPSH.html';
const src=fs.readFileSync(P,'utf8');
const righe=src.split('\n');
function corpo(nome){
  const i=righe.findIndex(r=>r.startsWith('            function '+nome+'('));
  if(i<0) throw new Error('non trovata: '+nome);
  for(let k=i+1;k<righe.length;k++) if(righe[k]==='            }') return righe.slice(i,k+1).join('\n');
}
const NOMI=['firmaTesto','riassuntoStatoPerCopia','copieDaEliminare','promemoriaBackup'];
const api=new Function(NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+'};')();
let ok=0,ko=0; const t=(n,c)=>{ if(c){ok++;console.log('  ok  '+n);} else {ko++;console.log('  KO  '+n);} };

const ORA = new Date(2026, 8, 11, 18, 0, 0).getTime();
const MIN = 60000, GIORNO = 86400000;
const REGOLE = { recenti: 20, giorni: 14, primaGiorni: 7, primaMax: 30 };
const voce = (id, quando, tipo) => ({ id, quando, tipo });

console.log('--- La firma ---');
t('stesso testo, stessa firma', api.firmaTesto('{"a":1}') === api.firmaTesto('{"a":1}'));
t('un carattere diverso cambia la firma', api.firmaTesto('{"a":1}') !== api.firmaTesto('{"a":2}'));
t('testo vuoto o assente non fa esplodere niente', typeof api.firmaTesto('') === 'string' && typeof api.firmaTesto(null) === 'string');

console.log('--- Cosa finisce nell indice ---');
const stato = {
  photos: [{ id: 'F_APERTA' }],
  projects: {
    P1: { name: 'Cantiere A', updatedAt: 5, surveys: { S1: { photos: [{ id: 'F1' }, { id: 'F2' }] }, S2: { photos: [] } },
          notes: { html: '<p>x</p><img src="" data-note-img-id="N1"><img src="" data-note-img-id="N2">' } },
    P2: { comune: 'Sava', surveys: {} }
  }
};
const r = api.riassuntoStatoPerCopia(stato);
t('ogni progetto con nome e numero di prove', r.progetti.P1.nome === 'Cantiere A' && r.progetti.P1.prove === 2 && r.progetti.P2.nome === 'Sava' && r.progetti.P2.prove === 0);
t('le foto di tutte le prove e della prova aperta', ['F1', 'F2', 'F_APERTA'].every(id => r.foto.includes(id)) && r.foto.length === 3);
t('le immagini delle note', r.note.join() === 'N1,N2');
t('uno stato vuoto non fa esplodere niente', Object.keys(api.riassuntoStatoPerCopia({}).progetti).length === 0 && api.riassuntoStatoPerCopia(null).foto.length === 0);

console.log('--- Quali copie tenere ---');
let indice = [];
for (let i = 0; i < 25; i++) indice.push(voce('oggi' + i, ORA - i * 10 * MIN, 'periodica'));
let via = api.copieDaEliminare(indice, ORA, REGOLE);
t('25 copie di oggi: restano le 20 piu recenti', via.length === 5 && ['oggi20', 'oggi21', 'oggi22', 'oggi23', 'oggi24'].every(id => via.includes(id)));

indice = [];
for (let i = 0; i < 20; i++) indice.push(voce('oggi' + i, ORA - i * MIN, 'periodica'));
for (let g = 1; g <= 20; g++) indice.push(voce('giorno' + g, ORA - g * GIORNO, 'periodica'));
via = api.copieDaEliminare(indice, ORA, REGOLE);
t('oltre le 20 recenti resta una copia per ciascuno degli ultimi 14 giorni', [1, 7, 14].every(g => !via.includes('giorno' + g)));
t('quelle piu vecchie di 14 giorni se ne vanno', [15, 16, 20].every(g => via.includes('giorno' + g)) && via.length === 6);

indice = [];
for (let i = 0; i < 20; i++) indice.push(voce('oggi' + i, ORA - i * MIN, 'periodica'));
indice.push(voce('sera', ORA - 3 * GIORNO, 'periodica'), voce('mattina', ORA - 3 * GIORNO - 5 * 3600000, 'periodica'));
via = api.copieDaEliminare(indice, ORA, REGOLE);
t('di uno stesso giorno resta la piu recente', via.join() === 'mattina');

indice = [];
for (let i = 0; i < 35; i++) indice.push(voce('prima' + i, ORA - i * MIN, 'prima'));
indice.push(voce('primaVecchia', ORA - 8 * GIORNO, 'prima'));
via = api.copieDaEliminare(indice, ORA, REGOLE);
t('le «prima di…» restano al massimo 30', ['prima30', 'prima31', 'prima32', 'prima33', 'prima34'].every(id => via.includes(id)));
t('e non oltre 7 giorni', via.includes('primaVecchia') && via.length === 6);
const misto = [voce('periodica', ORA, 'periodica')];
for (let i = 0; i < 40; i++) misto.push(voce('x' + i, ORA - i * MIN, 'prima'));
t('le «prima di…» non rubano posto alle periodiche', !api.copieDaEliminare(misto, ORA, REGOLE).includes('periodica'));
t('indice vuoto: niente da cancellare', api.copieDaEliminare([], ORA, REGOLE).length === 0);

console.log('--- Il promemoria del backup completo ---');
const progetti = { P1: { updatedAt: ORA - 1 * GIORNO } };
t('nessun progetto: nessun promemoria', api.promemoriaBackup({}, null, ORA, 7) === null);
t('mai fatto: promemoria', api.promemoriaBackup(progetti, null, ORA, 7).mai === true);
t('backup di 3 giorni fa, anche con modifiche: ancora niente', api.promemoriaBackup(progetti, ORA - 3 * GIORNO, ORA, 7) === null);
const vecchio = api.promemoriaBackup(progetti, ORA - 10 * GIORNO, ORA, 7);
t('backup di 10 giorni fa con modifiche dopo: promemoria', !!vecchio && vecchio.mai === false && vecchio.giorni === 10);
t('backup di 10 giorni fa senza modifiche dopo: niente', api.promemoriaBackup({ P1: { updatedAt: ORA - 11 * GIORNO } }, ORA - 10 * GIORNO, ORA, 7) === null);
t('una modifica entro 2 minuti dal backup non conta (e il salvataggio del backup stesso)',
  api.promemoriaBackup({ P1: { updatedAt: ORA - 10 * GIORNO + 30000 } }, ORA - 10 * GIORNO, ORA, 7) === null);

console.log('--- Cablaggio ---');
t('database separato da quello delle foto, che resta alla versione 2',
  src.includes("const COPIE_DB_NAME = 'DPSH_CopieAutomatiche';") && src.includes('const DB_VERSION = 2;'));
t('configurazione in cima, prima di saveState (niente errori all avvio)',
  src.indexOf('const copieAutomatiche = {') > 0 && src.indexOf('const copieAutomatiche = {') < src.indexOf('function saveState()'));
t('saveState fa la copia periodica con lo stesso testo appena salvato',
  // Fra le due righe ora c'è anche la verifica del salvataggio (Fase 1): la finestra è più larga.
  /localStorage\.setItem\('dpsh_app_state', testoStato\);[\s\S]{0,1800}scriviCopiaAutomatica\('periodica', 'automatica', testoStato\);/.test(src));
t('una copia prima di ognuna delle 9 azioni che tolgono dati', (src.match(/copiaPrimaDi\(/g) || []).length - 1 === 9);
['eliminare un intervallo', 'eliminare lo strato', 'azzerare la falda', 'eliminare la Prova', 'eliminare il progetto',
 'eliminare una foto', 'importare un archivio', 'sostituire tutti gli intervalli']
  .forEach(m => t('  … ' + m, src.includes("copiaPrimaDi('" + m) || src.includes('copiaPrimaDi(`' + m)));
t('le foto che servono alle copie non si cancellano',
  /function idFotoAncoraInUso\(\) \{[\s\S]{0,1000}copieAutomatiche\.idFoto\.forEach\(id => vivi\.add\(id\)\);/.test(src));
t('nemmeno le immagini delle note',
  /function idImmaginiNoteAncoraInUso\(\) \{[\s\S]{0,1000}copieAutomatiche\.idNote\.forEach/.test(src)
  && /if \(!copieAutomatiche\.idNote\.has\(id\)\) \{\s*try \{ deleteNoteImageFromIDB\(id\);/.test(src));
t('il ripristino salva prima una copia di adesso',
  /async function ripristinaProgettoDaCopia[\s\S]{0,800}await scriviCopiaAutomatica\('prima'[\s\S]{0,200}state\.projects\[projId\] = /.test(src));
t('il ripristino ricarica la prova aperta dal progetto ripristinato, prima di salvare',
  /async function ripristinaProgettoDaCopia[\s\S]{0,2200}syncProjectToActiveState\(projId,[\s\S]{0,400}saveState\(\);/.test(src));
t('il reset cancella anche le copie', /indexedDB\.deleteDatabase\(COPIE_DB_NAME\)/.test(src));
t('il backup completo, JSON e ZIP, viene registrato',
  /if \(await exportGlobalJSONBackup\(\)\) registraBackupCompleto\(\);/.test(src) && /await exportGlobalZip\(\);\s*registraBackupCompleto\(\);/.test(src));
t('cronologia dal menu e dal progetto, ultimo backup nel menu, promemoria in Home',
  ['btnApriCronologia', 'btnProjActCronologia', 'modalCronologia', 'lblUltimoBackup', 'homePromemoriaBackup'].every(id => src.includes('id="' + id + '"')));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
