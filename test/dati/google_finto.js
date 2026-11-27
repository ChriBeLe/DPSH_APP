// GOOGLE FINTO per le suite del login, delle chiavi cifrate e della sincronizzazione (pezzi 077, 077a, 078, 079).
//
//   const g = creaGoogleFinto();                  // Drive in memoria + Google Identity Services finto
//   avviaApp({ primaDellApp: w => g.installa(w) }) // fetch, crypto e il caricamento dello script di Google
//
// Drive finto: cartelle e file con parents, spazio (drive / appDataFolder), appProperties, cestino,
// modifiedTime che cresce a ogni scrittura, elenchi a pagine, caricamento «resumable» e download alt=media.
// Capisce le query che usa l'app: name = '…', '…' in parents, trashed = false, mimeType = / != '…', cumulate con and.
// Guasti: g.rete = false (fetch lancia come senza campo), g.elencoVuoto = true (l'elenco torna vuoto anche se i file ci sono),
// g.fallisci = { dopo: n, stato: 500 } (le richieste dopo la n-esima rispondono con errore).
// GIS finto: lo script si «carica» solo se l'app lo chiede (g.gisCaricato conta le volte), requestAccessToken risponde
// con un token nuovo o con un errore se g.gisRifiuta è vero. Nessuna rete vera.
const crypto = require('crypto');

function creaGoogleFinto(opz) {
  const o = Object.assign({ email: 'geologo@example.com', nome: 'Geologo Prova' }, opz || {});
  const g = {
    utente: { email: o.email, nome: o.nome },
    files: new Map(), sessioni: new Map(),
    rete: true, elencoVuoto: false, fallisci: null, pagina: 100,
    richieste: [], gisCaricato: 0, gisRichieste: [], gisRifiuta: false, token: 0, tokenValidi: new Set(), revocati: [],
    contatore: 0, orologio: Date.parse('2026-11-27T10:00:00Z')
  };
  const ora = () => { g.orologio += 1000; return new Date(g.orologio).toISOString(); };
  const nuovoId = (p) => p + (++g.contatore) + crypto.randomBytes(3).toString('hex');
  const risposta = (stato, corpo, intest) => {
    const buf = Buffer.isBuffer(corpo) ? corpo : Buffer.from(typeof corpo === 'string' ? corpo : JSON.stringify(corpo === undefined ? {} : corpo));
    const h = Object.assign({}, intest || {});
    return {
      ok: stato >= 200 && stato < 300, status: stato,
      headers: { get: (k) => { const kk = Object.keys(h).find(x => x.toLowerCase() === String(k).toLowerCase()); return kk ? h[kk] : null; } },
      json: async () => JSON.parse(buf.toString('utf8')), text: async () => buf.toString('utf8'),
      arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
    };
  };
  const pubblico = (f, campi) => {
    const tutti = { id: f.id, name: f.name, mimeType: f.mimeType, parents: f.parents, appProperties: f.appProperties, trashed: f.trashed, modifiedTime: f.modifiedTime, size: String(f.content ? f.content.length : 0) };
    if (!campi) return tutti;
    const r = {};
    campi.split(',').forEach(c => { const k = c.trim().replace(/\(.*$/, ''); if (k in tutti) r[k] = tutti[k]; });
    return r;
  };
  const filtra = (q, spazio) => {
    const cond = String(q || '').split(/\s+and\s+/i).map(c => c.trim()).filter(Boolean);
    return Array.from(g.files.values()).filter(f => {
      if ((f.spazio || 'drive') !== (spazio || 'drive')) return false;
      return cond.every(c => {
        let m;
        if ((m = /^name\s*=\s*'((?:[^'\\]|\\.)*)'$/.exec(c))) return f.name === m[1].replace(/\\(.)/g, '$1');
        if ((m = /^'((?:[^'\\]|\\.)*)'\s+in\s+parents$/.exec(c))) return (f.parents || []).includes(m[1].replace(/\\(.)/g, '$1'));
        if ((m = /^trashed\s*=\s*(true|false)$/.exec(c))) return f.trashed === (m[1] === 'true');
        if ((m = /^mimeType\s*=\s*'([^']*)'$/.exec(c))) return f.mimeType === m[1];
        if ((m = /^mimeType\s*!=\s*'([^']*)'$/.exec(c))) return f.mimeType !== m[1];
        throw new Error('query non capita dal Drive finto: ' + c);
      });
    });
  };
  const leggiCorpo = async (b) => {
    if (b === undefined || b === null) return Buffer.alloc(0);
    if (typeof b === 'string') return Buffer.from(b);
    if (typeof b.arrayBuffer === 'function') return Buffer.from(await b.arrayBuffer());
    return Buffer.from(b);
  };

  g.fetch = async (url, init) => {
    const i = init || {};
    const metodo = String(i.method || 'GET').toUpperCase();
    g.richieste.push({ metodo, url: String(url), intest: Object.assign({}, i.headers || {}) });
    if (!g.rete) throw new TypeError('Failed to fetch');
    const u = new URL(String(url));
    const auth = (i.headers || {}).Authorization;
    if (!auth || !g.tokenValidi.has(String(auth).replace(/^Bearer /, ''))) return risposta(401, { error: { code: 401 } });
    if (g.fallisci && g.richieste.length > g.fallisci.dopo) return risposta(g.fallisci.stato || 500, { error: 'guasto finto' });
    const p = u.pathname;
    if (p === '/drive/v3/about') return risposta(200, { user: { displayName: g.utente.nome, emailAddress: g.utente.email } });
    if (p === '/drive/v3/files' && metodo === 'GET') {
      const tutti = g.elencoVuoto ? [] : filtra(u.searchParams.get('q'), u.searchParams.get('spaces'));
      const da = Number(u.searchParams.get('pageToken') || 0), n = Math.min(Number(u.searchParams.get('pageSize')) || g.pagina, g.pagina);
      const resto = tutti.slice(da, da + n);
      const campi = (u.searchParams.get('fields') || '').replace(/^nextPageToken,\s*files\((.*)\)$/, '$1');
      return risposta(200, { files: resto.map(f => pubblico(f, campi)), nextPageToken: da + n < tutti.length ? String(da + n) : undefined });
    }
    if (p === '/drive/v3/files' && metodo === 'POST') {
      const meta = JSON.parse(await leggiCorpo(i.body));
      const f = { id: nuovoId('d'), name: meta.name, mimeType: meta.mimeType || 'application/octet-stream', parents: meta.parents || [], appProperties: meta.appProperties || {}, trashed: false, modifiedTime: ora(), spazio: (meta.parents || []).includes('appDataFolder') ? 'appDataFolder' : 'drive', content: null };
      g.files.set(f.id, f);
      return risposta(200, pubblico(f, u.searchParams.get('fields')));
    }
    let m = /^\/drive\/v3\/files\/([^/]+)$/.exec(p);
    if (m) {
      const f = g.files.get(decodeURIComponent(m[1]));
      if (!f) return risposta(404, { error: { code: 404 } });
      if (metodo === 'GET' && u.searchParams.get('alt') === 'media') return risposta(200, f.content || Buffer.alloc(0));
      if (metodo === 'GET') return risposta(200, pubblico(f, u.searchParams.get('fields')));
      if (metodo === 'PATCH') {
        const meta = JSON.parse(await leggiCorpo(i.body));
        if ('trashed' in meta) f.trashed = !!meta.trashed;
        if (meta.name) f.name = meta.name;
        f.modifiedTime = ora();
        return risposta(200, pubblico(f, u.searchParams.get('fields')));
      }
      if (metodo === 'DELETE') { g.files.delete(f.id); return risposta(204, ''); }
    }
    if (p === '/upload/drive/v3/files' && metodo === 'POST' && u.searchParams.get('uploadType') === 'resumable') {
      const meta = JSON.parse(await leggiCorpo(i.body));
      const sid = nuovoId('s');
      g.sessioni.set(sid, { meta, id: null, campi: u.searchParams.get('fields') });
      return risposta(200, {}, { Location: 'https://www.googleapis.com/upload/session/' + sid });
    }
    m = /^\/upload\/drive\/v3\/files\/([^/]+)$/.exec(p);
    if (m && metodo === 'PATCH' && u.searchParams.get('uploadType') === 'resumable') {
      if (!g.files.has(decodeURIComponent(m[1]))) return risposta(404, { error: { code: 404 } });
      const meta = JSON.parse(await leggiCorpo(i.body));
      const sid = nuovoId('s');
      g.sessioni.set(sid, { meta, id: decodeURIComponent(m[1]), campi: u.searchParams.get('fields') });
      return risposta(200, {}, { Location: 'https://www.googleapis.com/upload/session/' + sid });
    }
    m = /^\/upload\/session\/([^/]+)$/.exec(p);
    if (m && metodo === 'PUT') {
      const s = g.sessioni.get(m[1]);
      if (!s) return risposta(404, {});
      g.sessioni.delete(m[1]);
      const byte = await leggiCorpo(i.body);
      let f = s.id ? g.files.get(s.id) : null;
      if (!f) {
        f = { id: nuovoId('d'), name: s.meta.name, mimeType: s.meta.mimeType || 'application/octet-stream', parents: s.meta.parents || [], appProperties: {}, trashed: false, spazio: (s.meta.parents || []).includes('appDataFolder') ? 'appDataFolder' : 'drive' };
        g.files.set(f.id, f);
      }
      if (s.meta.name) f.name = s.meta.name;
      if (s.meta.appProperties) f.appProperties = Object.assign({}, s.meta.appProperties);
      f.content = byte; f.modifiedTime = ora();
      return risposta(200, pubblico(f, s.campi));
    }
    return risposta(404, { error: 'percorso non gestito dal Drive finto: ' + metodo + ' ' + p });
  };

  // Test: scrive un file su Drive «da un altro dispositivo» (o da un browser che lo cambia).
  g.metti = (f) => {
    const r = Object.assign({ id: nuovoId('d'), mimeType: 'application/zip', parents: [], appProperties: {}, trashed: false, spazio: 'drive', modifiedTime: ora(), content: Buffer.alloc(0) }, f);
    g.files.set(r.id, r);
    return r;
  };
  g.cartella = () => Array.from(g.files.values()).find(f => f.mimeType === 'application/vnd.google-apps.folder' && !f.trashed) || null;
  g.progetti = () => Array.from(g.files.values()).filter(f => f.spazio === 'drive' && f.mimeType !== 'application/vnd.google-apps.folder');
  g.appData = () => Array.from(g.files.values()).filter(f => f.spazio === 'appDataFolder');

  g.installa = (w) => {
    w.fetch = g.fetch;
    w.crypto = crypto.webcrypto;
    // GIS finto: lo script di Google si «carica» solo se l'app lo mette nella pagina.
    const originale = w.Node.prototype.appendChild;
    w.HTMLHeadElement.prototype.appendChild = function (el) {
      if (el && el.tagName === 'SCRIPT' && /accounts\.google\.com\/gsi\/client/.test(el.src || '')) {
        g.gisCaricato++;
        setTimeout(() => {
          w.google = { accounts: { oauth2: {
            initTokenClient(cfg) {
              g.config = cfg;
              return { requestAccessToken(opt) {
                g.gisRichieste.push(opt || {});
                setTimeout(() => {
                  if (g.gisRifiuta) { cfg.error_callback && cfg.error_callback({ type: 'popup_failed_to_open' }); return; }
                  const tk = 'tok_' + (++g.token);
                  g.tokenValidi.add(tk);
                  cfg.callback({ access_token: tk, expires_in: g.scadenza === undefined ? 3600 : g.scadenza });
                }, 0);
              } };
            },
            revoke(tk, fine) { g.revocati.push(tk); g.tokenValidi.delete(tk); if (fine) fine(); }
          } } };
          if (typeof el.onload === 'function') el.onload();
        }, 0);
        return el;
      }
      return originale.call(this, el);
    };
  };
  return g;
}

module.exports = { creaGoogleFinto };
