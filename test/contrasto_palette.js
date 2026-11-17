// Contrasto delle 8 palette × 2 temi (Fase D della revisione 11/2026, WCAG 2.1 AA).
//
// Legge i token direttamente da src/css/01_app.css (i blocchi [data-hue="…"]) e controlla le
// soglie scritte in testa a quel file:
//   · --on-accent su --accent (il tasto principale)                       >= 4,5
//   · --accent e --accent-ink come testo su sfondo e card                 >= 4,5
//   · --accent-ink sopra --accent-soft (pillole e voci selezionate)       >= 4,5
//   · --text-muted su sfondo, card e incavato                             >= 4,5
//   · --border-control (contorno di campi e tasti) su sfondo e card       >= 3
// Più due controlli sui colori di stato condivisi: bianco su --danger pieno e i testi di
// pericolo (--pericolo-testo) sulle card dei due temi.
//
//   node test/contrasto_palette.js

const fs = require('fs');
const path = require('path');

const radice = path.join(__dirname, '..');
const css = fs.readFileSync(path.join(radice, 'src/css/01_app.css'), 'utf8');
const regole = fs.readFileSync(path.join(radice, 'src/css/03_regole-di-stile.css'), 'utf8');

function colore(v) {
  v = v.trim();
  const m = v.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)$/);
  if (m) return [m[1] / 255, m[2] / 255, m[3] / 255, m[4] === undefined ? 1 : +m[4]];
  const h = v.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(h)) throw new Error('colore non letto: ' + v);
  return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).concat(1);
}
const sopra = (c, fondo) => [0, 1, 2].map(i => c[i] * c[3] + fondo[i] * (1 - c[3])).concat(1);
function luminanza(c) {
  const f = x => (x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4));
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
function rapporto(a, b) {
  const la = luminanza(a), lb = luminanza(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}
const token = corpo => Object.fromEntries([...corpo.matchAll(/--([\w-]+):\s*([^;]+);/g)].map(m => [m[1], m[2].trim()]));

let ko = 0, controlli = 0;
function verifica(nome, valore, soglia) {
  controlli++;
  if (valore + 1e-9 < soglia) { ko++; console.log(`KO ${nome}: ${valore.toFixed(2)}:1 (serve ${soglia}:1)`); }
}

const palette = {};
for (const m of css.matchAll(/\n\s*([^\n{}]*data-hue[^\n{}]*)\{([^}]*)\}/g)) {
  const nome = m[1].match(/data-hue="(\w+)"/)[1];
  const tema = m[1].includes('light') ? 'chiaro' : 'scuro';
  palette[`${nome}/${tema}`] = token(m[2]);
}
const nomi = Object.keys(palette);
if (nomi.length !== 16) { ko++; console.log(`KO attese 16 combinazioni palette/tema, trovate ${nomi.length}`); }

for (const p of nomi) {
  const t = palette[p];
  for (const k of ['bg-main', 'bg-card', 'bg-sunken', 'text-muted', 'accent', 'accent-ink', 'accent-soft', 'on-accent', 'border-control']) {
    if (!(k in t)) { ko++; console.log(`KO ${p}: manca --${k}`); }
  }
  if (!('border-control' in t)) continue;
  const c = k => colore(t[k]);
  const fondo = c('bg-main'), card = c('bg-card'), incavato = c('bg-sunken');
  const tenue = sopra(c('accent-soft'), card);
  verifica(`${p} tasto principale (on-accent su accent)`, rapporto(c('on-accent'), c('accent')), 4.5);
  for (const [n, f] of [['sfondo', fondo], ['card', card]]) {
    verifica(`${p} accent come testo su ${n}`, rapporto(c('accent'), f), 4.5);
    verifica(`${p} accent-ink su ${n}`, rapporto(c('accent-ink'), f), 4.5);
    verifica(`${p} bordo dei controlli su ${n}`, rapporto(c('border-control'), f), 3);
  }
  verifica(`${p} accent-ink su accent-soft`, rapporto(c('accent-ink'), tenue), 4.5);
  for (const [n, f] of [['sfondo', fondo], ['card', card], ['incavato', incavato]]) {
    verifica(`${p} testo secondario su ${n}`, rapporto(c('text-muted'), f), 4.5);
  }
}

// Colori di stato
const danger = (css.match(/--danger:\s*(#[0-9a-f]{6})/i) || [])[1];
verifica('bianco su --danger pieno', rapporto(colore('#ffffff'), colore(danger)), 4.5);
const scuroPericolo = (regole.match(/:root\s*\{[^}]*--pericolo-testo:\s*(#[0-9a-f]{6})/i) || [])[1];
const chiaroPericolo = (regole.match(/:root\[data-theme="light"\]\s*\{[^}]*--pericolo-testo:\s*(#[0-9a-f]{6})/i) || [])[1];
for (const p of nomi) {
  const testo = p.endsWith('chiaro') ? chiaroPericolo : scuroPericolo;
  verifica(`${p} testo di pericolo su card`, rapporto(colore(testo), colore(palette[p]['bg-card'])), 4.5);
}

// Nessuna regola usa più il rosso pieno come colore del testo.
const fogli = fs.readdirSync(path.join(radice, 'src/css')).map(f => fs.readFileSync(path.join(radice, 'src/css', f), 'utf8')).join('\n');
const testoRosso = (fogli.match(/[^-]color:\s*var\(--danger\)/g) || []).length;
controlli++;
if (testoRosso) { ko++; console.log(`KO ${testoRosso} regole usano var(--danger) come colore del testo: usare var(--pericolo-testo)`); }

console.log(`${controlli - ko}/${controlli} controlli di contrasto superati.`);
process.exit(ko ? 1 : 0);
