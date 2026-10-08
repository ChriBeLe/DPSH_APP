// INTESTAZIONE «USA PER TUTTE LE PAGINE»: nell'editor del template, sotto «Mostra intestazione»,
// una spunta rende immagine, testo e altezza dell'intestazione uguali su ogni pagina. Accesa,
// copia l'intestazione della pagina aperta su tutte (e si annulla con Annulla); cambiarla su una
// pagina la cambia su tutte; le pagine nuove la prendono già. Spenta, ogni pagina va per conto
// suo. Si salva col template, e un template nuovo non la eredita dall'ultimo aperto.
const fs = require('fs');
const path = require('path');
const { avviaApp, attesa, telefonoV0 } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
const STATO_V0 = fs.readFileSync(path.join(__dirname, 'dati', 'stato_v0.json'), 'utf8');
const $ = (app, id) => app.d.getElementById(id);
const scrivi = (app, el, v) => { el.value = v; el.dispatchEvent(new app.w.Event('input', { bubbles: true })); };
const spunta = (app, el, v) => { el.checked = v; el.dispatchEvent(new app.w.Event('change', { bubbles: true })); };

(async () => {
  const app = await avviaApp({ stato: STATO_V0, idb: telefonoV0() });
  if (app.dialogo()) app.dialogo().ok.dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  await attesa(30);

  // Un template con tre pagine, ciascuna con un blocco (serve per salvare).
  const id = app.E(`(() => {
    const pagina = n => ({ id: 'p' + n, cols: 4, header: { imageDataUrl: null, text: 'pagina ' + n }, footer: { text: '' },
      rows: [{ id: 'r' + n, blocks: [{ id: 'b' + n, type: 'dati-prova', colSpan: 4 }] }] });
    state.reportTemplates.tplIntest = { id: 'tplIntest', name: 'Intestazioni', builtIn: false, headerEnabled: true,
      pages: [pagina(1), pagina(2), pagina(3)], createdAt: 1, updatedAt: 1 };
    return 'tplIntest';
  })()`);
  app.E(`apriTemplateEditor(${JSON.stringify(id)})`);
  await attesa(30);
  const testi = () => app.E('templateEditorState.pages.map(p => (p.header || {}).text)');
  const chk = $(app, 'chkHeaderTuttePagine');
  t('la spunta «Usa per tutte le pagine» c\'è, sotto l\'intestazione, ed è spenta di base', !!chk && $(app, 'pageHeaderControls').contains(chk) && !chk.checked && /Usa per tutte le pagine/.test(chk.parentElement.textContent));

  // Spenta: ogni pagina ha la sua.
  scrivi(app, $(app, 'inputHeaderText'), 'solo la prima');
  t('spenta: cambiare l\'intestazione cambia solo la pagina aperta', JSON.stringify(testi()) === JSON.stringify(['solo la prima', 'pagina 2', 'pagina 3']));

  // Accesa dalla pagina 2: la sua intestazione va su tutte.
  app.E('templateEditorState.activePageIdx = 1; renderTemplateEditorPageControls()');
  spunta(app, chk, true);
  t('accesa: l\'intestazione della pagina aperta va su tutte', JSON.stringify(testi()) === JSON.stringify(['pagina 2', 'pagina 2', 'pagina 2']));
  t('(copie, non la stessa intestazione condivisa)', app.E('templateEditorState.pages[0].header !== templateEditorState.pages[1].header'));
  app.E('undoTemplateEditor()');
  t('Annulla dopo averla accesa: le intestazioni tornano com\'erano', JSON.stringify(testi()) === JSON.stringify(['solo la prima', 'pagina 2', 'pagina 3']));

  scrivi(app, $(app, 'inputHeaderText'), 'Studio Rossi');
  app.E(`(() => { const p = templateEditorState.pages[1]; p.header.imageDataUrl = 'data:image/png;base64,AAAA'; p.header.heightMm = 22; allineaIntestazioniEditor(p); })()`);
  t('accesa: testo, immagine e altezza cambiati su una pagina sono su tutte', app.E(`templateEditorState.pages.every(p => p.header.text === 'Studio Rossi' && p.header.imageDataUrl === 'data:image/png;base64,AAAA' && p.header.heightMm === 22)`));
  $(app, 'btnRemoveHeaderImage').dispatchEvent(new app.w.MouseEvent('click', { bubbles: true }));
  t('accesa: togliere l\'immagine la toglie da tutte', app.E('templateEditorState.pages.every(p => !p.header.imageDataUrl)'));

  app.E('aggiungiPaginaEditor()');
  t('accesa: una pagina nuova nasce con la stessa intestazione', app.E(`templateEditorState.pages.length === 4 && templateEditorState.pages[3].header.text === 'Studio Rossi' && templateEditorState.pages[3].header.heightMm === 22`));
  app.E(`templateEditorState.pages[3].rows = [{ id: 'r4', blocks: [{ id: 'b4', type: 'dati-prova', colSpan: 4 }] }]`);

  t('la spunta conta come modifica da salvare', app.E('JSON.parse(istantaneaTemplate()).headerTutte === true'));
  app.E('salvaTemplateEditor()');
  await attesa(30);
  t('si salva col template, e le pagine salvate hanno tutte la stessa intestazione', app.E(`state.reportTemplates.tplIntest.headerTutte === true && state.reportTemplates.tplIntest.pages.every(p => p.header.text === 'Studio Rossi')`));

  // Nel documento di stampa (lo stesso da cui nascono PDF e Word) ogni pagina porta l'intestazione,
  // NEL MARGINE SUPERIORE del foglio, come in Word: fuori dall'area del contenuto, che così non
  // perde spazio (prima l'intestazione stava nel contenuto e il fondo del foglio tagliava le tabelle).
  const fogli = app.E(`state.reportTemplates.tplIntest.pages.map(p => buildPaginaRigheHtml(p, templateEditorState.ctx, 1, 4, true, null, '1', false, true, false))`);
  const leggi = h => { const d = app.d.createElement('div'); d.innerHTML = h; return d.firstElementChild; };
  t('nel documento di stampa (PDF e Word) l\'intestazione è su ogni pagina', fogli.length === 4 && fogli.every(h => /data-blocco="intestazione"[\s\S]*Studio Rossi/.test(h)));
  t('nel margine superiore del foglio, fuori dall\'area del contenuto', fogli.every(h => { const f = leggi(h), i = f.querySelector('[data-blocco="intestazione"]');
    return i && i.parentElement === f && !i.closest('.dpsh-sheet-inner') && /position:absolute; top:0/.test(i.getAttribute('style')); }));
  t('alta 22 mm (più del margine di 14): la fascia si allarga e il contenuto parte più in basso', /padding-top:27mm/.test(leggi(fogli[0]).getAttribute('style'))
    && app.E(`margineConIntestazione({ top: 14 }, { heightMm: 22 }, true).top`) === 27 && app.E(`margineConIntestazione({ top: 14 }, { heightMm: 6 }, true).top`) === 14 && app.E(`margineConIntestazione({ top: 14 }, { heightMm: 22 }, false).top`) === 14);
  t('(senza altezza scelta sta nel margine: il contenuto non perde niente)', !/padding-top/.test(app.E(`buildPaginaRigheHtml(Object.assign({}, state.reportTemplates.tplIntest.pages[0], { header: { text: 'x' } }), templateEditorState.ctx, 1, 1, true, null, '1', false, true, false)`).match(/<div class="dpsh-sheet"[^>]*>/)[0]));
  // Un logo senza altezza scelta: la sua altezza NATURALE a tutta larghezza (come Word), letta
  // dal file. PNG 1572×181 (un'intestazione larga e bassa) su 186 mm di larghezza → 21,4 mm.
  const png = (w, h) => { const b = Buffer.alloc(24); b.write('\x89PNG\r\n\x1a\n', 0, 'latin1'); b.writeUInt32BE(13, 8); b.write('IHDR', 12); b.writeUInt32BE(w, 16); b.writeUInt32BE(h, 20); return 'data:image/png;base64,' + b.toString('base64'); };
  t('le dimensioni di un PNG si leggono dal file', JSON.stringify(app.E(`dimensioniImmagineDataUrl(${JSON.stringify(png(1572, 181))})`)) === '{"w":1572,"h":181}');
  const naturale = app.E(`altezzaIntestazioneMm({ imageDataUrl: ${JSON.stringify(png(1572, 181))} }, { left: 12, right: 12 })`);
  t(`un logo largo e basso prende la sua altezza naturale a tutta larghezza (${naturale.toFixed(1)} mm)`, Math.abs(naturale - 21.4) < 0.1
    && app.E(`margineConIntestazione({ top: 14, left: 12, right: 12 }, { imageDataUrl: ${JSON.stringify(png(1572, 181))} }, true).top`) > 26);
  t('(un logo quadrato si ferma a 28 mm, come prima)', app.E(`altezzaIntestazioneMm({ imageDataUrl: ${JSON.stringify(png(500, 500))} }, null)`) === 28);
  t('(un JPEG: le dimensioni dal suo segmento SOF)', JSON.stringify(app.E(`dimensioniImmagineDataUrl('data:image/jpeg;base64,' + btoa(String.fromCharCode(0xFF,0xD8,0xFF,0xE0,0,4,0,0,0xFF,0xC0,0,17,8,0,120,1,64,3)))`)) === '{"w":320,"h":120}');
  t('(e il Word la legge: la pagina di Word comincia dall\'intestazione)', /data-blocco'\) === 'intestazione'/.test(fs.readFileSync(path.join(__dirname, '..', 'src', 'js', '071i_export-word.js'), 'utf8')));

  app.E(`apriTemplateEditor('tplIntest')`);
  await attesa(30);
  t('riaprendo il template la spunta è accesa', $(app, 'chkHeaderTuttePagine').checked);
  spunta(app, $(app, 'chkHeaderTuttePagine'), false);
  scrivi(app, $(app, 'inputHeaderText'), 'di nuovo solo la prima');
  t('spenta di nuovo: ogni pagina tiene la sua copia e va per conto suo', JSON.stringify(testi()) === JSON.stringify(['di nuovo solo la prima', 'Studio Rossi', 'Studio Rossi', 'Studio Rossi']));
  app.E('templateEditorState.headerTutte = true');
  t('un template nuovo non prende l\'intestazione dall\'ultimo aperto', app.E('nuovaPaginaVuota().header.text') === '');

  t('l\'app non ha dato errori', app.errori.length === 0);
  if (app.errori.length) console.log('       ', app.errori.slice(0, 3));
  console.log(`${ok} ok, ${ko} KO`);
  app.chiudi();
  process.exit(ko ? 1 : 0);
})();
