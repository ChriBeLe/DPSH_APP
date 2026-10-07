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
const NOMI=['testoSicuro','rpdDiLog','colonnaStratigrafica','serieConfrontoProva','massimoTondo','datiConfronto','disegnoConfronto','svgDaDisegno','testoWinAnsi','larghezzaTestoPdf','coloreRgbPdf','pdfDaDisegno'];
const COSTANTI=righe.filter(r=>/^            const (COLORI_CONFRONTO|LARGHEZZE_HELVETICA|LARGHEZZE_HELVETICA_BOLD|WINANSI_EXTRA|TEMA_CONFRONTO_FILE) =/.test(r));
const api=new Function(COSTANTI.join('\n')+'\n'+NOMI.map(corpo).join('\n\n')+'\nreturn {'+NOMI.join(',')+',TEMA_CONFRONTO_FILE};')();
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
t('un valore non numerico si scarta invece di finire nel disegno', api.serieConfrontoProva({ logs: [{ start: 0, end: 0.2, colpi: 4 }] }, 'rpd').length === 0);

console.log('--- Il fondo scala ---');
t('7 -> 10', api.massimoTondo(7) === 10);
t('23 -> 25', api.massimoTondo(23) === 25);
t('51 -> 100', api.massimoTondo(51) === 100);
t('2,1 -> 2,5', api.massimoTondo(2.1) === 2.5);
t('100 -> 100, mai sotto il dato', api.massimoTondo(100) === 100);
t('zero o niente -> 10', api.massimoTondo(0) === 10 && api.massimoTondo(undefined) === 10);

console.log('--- La figura: schermo, SVG e PDF dallo stesso disegno ---');
const progetto = { name: 'Cantiere (prova)', strati };
const proveF = ['1', '2', '10bis'].map((nr, i) => ({ id: 's' + i, header: { provaNr: nr }, instrument: prova.instrument, settings: { stepCm: 20 },
  logs: [log(0, 0.2, 3 + i, 'A'), log(0.2, 0.4, 6, ''), log(0.4, 0.6, 9 + i, 'C'), log(0.6, 0.8 + i * 0.2, 14, '')] }));
const d = api.datiConfronto(progetto, proveF, new Set(['s0', 's2']), 'colpi');
t('solo le prove accese, ciascuna col suo colore fisso', d.colonne.map(c => c.numero).join() === '1,10bis' && d.colonne[1].colore === d.colore.get('s2') && d.colore.get('s2') !== d.colore.get('s1'));
t('profondità massima e strati usati dalle prove accese', Math.abs(d.maxProf - 1.2) < 1e-9 && d.strati.map(x => x.nome).join() === 'Riporto,Argilla');
const dis = api.disegnoConfronto(d, { larghezza: 1400, altezza: 990, fs: 14, perFile: true, data: '06/10/2026' });
const testi = dis.el.filter(e => e.t === 'testo').map(e => e.testo);
t('il disegno riempie lo spazio dato in altezza', dis.H === 990 && dis.W <= 1400);
t('nel file: titolo col progetto e legenda degli strati dentro la figura', testi.includes('Confronto prove · Cantiere (prova)') && testi.includes('Riporto') && testi.includes('Argilla'));
const asse = dis.el.filter(e => e.t === 'testo' && e.ancora === 'middle' && e.mono && !e.grassetto && /^[\d,]+$/.test(e.testo)).map(e => e.testo);
t('asse dei valori a passi tondi che arrivano al fondo scala', asse[0] === '0' && asse.every((v, i) => i === 0 || parseFloat(v) > parseFloat(asse[i - 1])) && parseFloat(asse[asse.length - 1]) >= 14);
const fasceRett = dis.el.filter(e => e.t === 'rett' && /^DPSH/.test(e.titolo || ''));
const yMax = Math.max(...fasceRett.map(r => r.y + r.h)), yMin = Math.min(...fasceRett.map(r => r.y));
const percorsi = dis.el.filter(e => e.t === 'percorso');
t('colonne e curve sulla stessa scala delle profondità', percorsi.length === 2
  && Math.abs(Math.min(...percorsi[0].punti.map(p => p[1])) - yMin) < 1e-6
  && Math.abs(Math.max(...percorsi[1].punti.map(p => p[1])) - yMax) < 1e-6);
const schermo = api.disegnoConfronto(d, { larghezza: 900, altezza: 500, fs: 12 });
t('a schermo niente titolo né legenda nella figura (sono nella finestra)', !schermo.el.some(e => e.testo === 'Riporto' || /^Confronto prove/.test(e.testo || '')));
const svg = api.svgDaDisegno(dis, api.TEMA_CONFRONTO_FILE);
t('SVG per il file: colori veri e fondo bianco, nessuna variabile dell\'app', /^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/.test(svg) && !svg.includes('var(--') && svg.includes('fill="#ffffff"'));
const nomeStrano = api.svgDaDisegno({ W: 10, H: 10, el: [{ t: 'testo', x: 0, y: 0, testo: 'A<B & "C"', dim: 10, colore: '#000', ancora: 'start' }] }, api.TEMA_CONFRONTO_FILE);
t('i testi nell\'SVG sono protetti', nomeStrano.includes('A&lt;B &amp; &quot;C&quot;'));
const pdf = api.pdfDaDisegno(dis, api.TEMA_CONFRONTO_FILE, 'Confronto prove · Cantiere (prova)');
t('PDF: intestazione, una pagina A4 orizzontale, fine file', pdf.startsWith('%PDF-1.4') && pdf.includes('/MediaBox [0 0 841.89 595.28]') && pdf.trimEnd().endsWith('%%EOF'));
const xrefPos = parseInt(pdf.match(/startxref\n(\d+)/)[1], 10);
const offs = pdf.slice(xrefPos).match(/^(\d{10}) 00000 n $/gm).map(r => parseInt(r, 10));
t('PDF: la tabella xref punta davvero agli oggetti', pdf.slice(xrefPos, xrefPos + 4) === 'xref' && offs.length === 7 && offs.every((o, i) => pdf.slice(o).startsWith((i + 1) + ' 0 obj')));
const lung = parseInt(pdf.match(/\/Length (\d+) >>\nstream\n/)[1], 10);
const inizio = pdf.indexOf('stream\n') + 7;
t('PDF: la lunghezza del flusso è quella vera', pdf.slice(inizio + lung, inizio + lung + 10) === '\nendstream');
t('PDF: un byte per carattere, niente NaN', [...pdf].every(ch => ch.charCodeAt(0) < 256) && !pdf.includes('NaN'));
t('PDF: le parentesi nei testi sono protette', pdf.includes('Cantiere \\(prova\\)'));
t('WinAnsi: accentate e simboli restano, il resto diventa ?', api.testoWinAnsi('è² · – ✓') === 'è² · \x96 ?');
t('Helvetica: 0 largo 556, «i» 222', Math.abs(api.larghezzaTestoPdf('0', false) - 0.556) < 1e-9 && Math.abs(api.larghezzaTestoPdf('i', false) - 0.222) < 1e-9);
t('colori: #rgb, #rrggbb e rgb()', api.coloreRgbPdf('#fff').join() === '1,1,1' && api.coloreRgbPdf('#000000').join() === '0,0,0' && api.coloreRgbPdf('rgb(255, 0, 0)').join() === '1,0,0');

console.log('--- Cablaggio ---');
t('la finestra e la riga nel pannello del progetto', src.includes('id="modalConfrontoProve"') && src.includes('id="btnProjActConfronta"'));
t('le interpretazioni alternative partono nascoste', /attive: new Set\(proveFisiche\(prove\)\.map\(s => s\.id\)\)/.test(src));
t('colonne stratigrafiche dalla funzione vera', /fasce: colonnaStratigrafica\(s\.logs, proj\.strati\)/.test(src));
t('si scarica in SVG, PNG e PDF', ['svg', 'png', 'pdf'].every(f => src.includes('data-formato="' + f + '"')) && /scaricaConfronto\(b\.getAttribute\('data-formato'\)\)/.test(src));
t('la finestra è grande: quasi tutto lo schermo', /\.modal\.confronto \{ max-width: 1680px; width: 97vw;/.test(src));
t('con meno di due prove confrontabili lo dice invece di aprire una figura vuota',
  /prove\.length < 2\) \{\s*appAlert\('Per confrontare servono almeno due prove/.test(src));
t('dal confronto si passa alla vista 3D delle stesse prove, anche col progetto chiuso',
  src.includes('id="btnConfronto3d"') && /btnConfronto3d'\)\.addEventListener\('click', \(\) => \{\s*if \(confrontoStato\.projId !== state\.currentProjectId\) \{ openProject\(confrontoStato\.projId\); switchView\('project'\); \}\s*apriVista3d\(\);/.test(src));

console.log('\n' + ok + ' ok, ' + ko + ' KO');
process.exit(ko?1:0);
