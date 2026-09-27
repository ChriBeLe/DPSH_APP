// MISURE DI STILE IN JSDOM (Fase 3): caratteri e bersagli dichiarati dal foglio di stile.
//
// jsdom non impagina, ma applica la cascata del CSS (regole, specificità, stili in linea,
// ereditarietà del font-size) e conosce le variabili CSS. Qui si risolve var(--…) e si legge ciò
// che il foglio di stile DICHIARA: la dimensione del carattere di ogni testo visibile e l'altezza
// (height o min-height) e la larghezza dei comandi. Le misure vere, a schermo, si fanno nel browser;
// questa è la rete che scatta se qualcuno rimette un 10,5 px o un bottone da 32 in una schermata già
// allineata.

function risolvi(w, el, valore) {
    let v = String(valore || '').trim();
    for (let i = 0; i < 5 && /var\(/.test(v); i++) {
        v = v.replace(/var\((--[\w-]+)(?:\s*,\s*([^)]+))?\)/g, (_, nome, riserva) => {
            const x = w.getComputedStyle(el).getPropertyValue(nome).trim();
            return x || (riserva || '').trim();
        });
    }
    const m = /^(-?[\d.]+)px$/.exec(v);
    return m ? parseFloat(m[1]) : null;
}

/** Nascosto da sé o da un antenato (display:none, attributo hidden, visibility:hidden), come lo
 * direbbe il browser. */
function nascosto(w, el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        if (e.hidden) return true;
        const cs = w.getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden') return true;
    }
    return false;
}

function carattere(w, el) {
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        const px = risolvi(w, e, w.getComputedStyle(e).fontSize);
        if (px !== null) return px;
    }
    return 16;
}

/** Ogni elemento con del testo proprio, visibile, dentro `radici`, con la sua dimensione. I
 * disegni (svg) restano fuori: sono grafici, non testo da leggere. */
function testiConCarattere(w, radici) {
    const out = [];
    radici.filter(Boolean).forEach(r => r.querySelectorAll('*').forEach(e => {
        if (e.closest('svg')) return;
        const testo = [...e.childNodes].filter(n => n.nodeType === 3 && n.textContent.trim()).map(n => n.textContent.trim()).join(' ');
        if (!testo || nascosto(w, e)) return;
        out.push({ el: e, testo: testo.slice(0, 40), px: carattere(w, e) });
    }));
    return out;
}

/** Altezza e larghezza dichiarate di un comando: height/min-height, width/min-width (o null). */
function misureComando(w, el) {
    const cs = w.getComputedStyle(el);
    const h = Math.max(risolvi(w, el, cs.height) || 0, risolvi(w, el, cs.minHeight) || 0);
    const l = Math.max(risolvi(w, el, cs.width) || 0, risolvi(w, el, cs.minWidth) || 0, risolvi(w, el, cs.flexBasis) || 0);
    return { altezza: h || null, larghezza: l || null };
}

module.exports = { risolvi, nascosto, carattere, testiConCarattere, misureComando };
