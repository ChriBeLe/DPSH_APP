// CONTROPROVA: cosa succederebbe SENZA lo schema su misura?
const fs=require('fs');
const { JSDOM } = require('jsdom');
const dom = new JSDOM('<!DOCTYPE html><body><div id="ed"></div></body>', { pretendToBeVisual: true });
const w = dom.window;
['window','document','navigator','Node','Element','HTMLElement','DocumentFragment','DOMParser','getComputedStyle','MutationObserver','Range','Selection']
  .forEach(k => { if (!(k in globalThis) && w[k]) globalThis[k] = w[k]; });
globalThis.window = w; globalThis.document = w.document;
eval(fs.readFileSync(__dirname + '/../src/vendor/motore-note.min.js','utf8'));
const { Editor, SOLO_STANDARD } = globalThis.NoteEditor;

// La nota VECCHIA, non convertita, aperta con uno schema di serie.
const CHECK = (t2,s2)=>`<div class="note-check-item${s2?' checked':''}"><label class="note-check-label" contenteditable="false"><input type="checkbox" class="note-check-box"${s2?' checked=""':''}></label><span class="note-check-text">${t2}</span></div>`;
const VECCHIA = `<h1>Sopralluogo</h1>` + CHECK('Foto del pozzo',true) + CHECK('Misura falda',false) +
  `<table class="note-table"><tbody><tr><td>1,2</td><td>ciottoli</td></tr></tbody></table>` +
  `<p><img data-note-img-id="NIMG_17_a" src=""></p>` +
  `<p><span style="background-color: rgb(255,235,59);">attenzione</span></p>`;

const ed = new Editor({ element: document.getElementById('ed'), extensions: SOLO_STANDARD, content: VECCHIA });
const out = ed.getHTML();
console.log('SENZA schema su misura, una nota VECCHIA diventa:');
console.log('  ', out.replace(/></g,'>\n   <'));
console.log();
const perso = [];
if (!/data-note-img-id/.test(out)) perso.push("l'IMMAGINE (id perso: il file in IndexedDB diventa irraggiungibile)");
if (!/note-table/.test(out)) perso.push('la classe della tabella (e con lei lo stile di stampa)');
if (!/<table/.test(out)) perso.push('la TABELLA intera');
if (!/checked/.test(out) && !/taskItem/.test(out)) perso.push('lo stato SPUNTATO delle checklist');
if (!/background-color|mark/.test(out)) perso.push("l'evidenziatore");
console.log('PERSO:', perso.length ? '\n  · ' + perso.join('\n  · ') : 'niente');
