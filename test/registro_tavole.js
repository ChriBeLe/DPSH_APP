// REGISTRO DELLE TAVOLE: creare, salvare (solo con «salva»), bloccare, duplicare, nomi doppi, impronta dei dati.
const { avviaApp, attesa } = require('./dati/app_in_jsdom');
let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };
(async () => {
  const app = await avviaApp({}); await attesa(50);
  const w = app.w, proj = { tavole3d: { regola: {}, escluse: [] } };
  const ev = s => w.__dpshEval(s);
  w.__p = proj;
  const a = ev("creaTavola(__p,{nome:'Iso Nord',tipo:'iso',impostazioni:{verso:'N'},datiRef:'h1'})");
  t('creata, versione 1, nel registro', a.versione === 1 && ev("registroTavole(__p).length") === 1);
  t('nome doppio -> numero in coda', ev("creaTavola(__p,{nome:'Iso Nord',tipo:'iso'}).nome") === 'Iso Nord (2)');
  t('tipo sconosciuto rifiutato', (() => { try { ev("creaTavola(__p,{nome:'x',tipo:'zzz'})"); return false; } catch (e) { return true; } })());
  ev("salvaTavola(__p,'" + a.id + "',{impostazioni:{verso:'E'}})");
  const b = ev("tavolaPerId(__p,'" + a.id + "')");
  t('salva: versione 2 e storico con la vecchia', b.versione === 2 && b.versioni.length === 1 && b.versioni[0].impostazioni.verso === 'N' && b.impostazioni.verso === 'E');
  ev("bloccaTavola(__p,'" + a.id + "')");
  t('bloccata: salva e elimina rifiutati', ev("salvaTavola(__p,'" + a.id + "',{nome:'Y'}).errore") === 'bloccata' && ev("eliminaTavola(__p,'" + a.id + "')") === false);
  ev("bloccaTavola(__p,'" + a.id + "',false)");
  const c = ev("duplicaTavola(__p,'" + a.id + "','h2')");
  t('duplica: nuova tavola con nuovi dati e nome libero', c.id !== a.id && c.datiRef === 'h2' && c.impostazioni.verso === 'E');
  t('dati cambiati -> avviso', ev("tavolaDatiCambiati(tavolaPerId(__p,'" + a.id + "'),'h9')") === true && ev("tavolaDatiCambiati(tavolaPerId(__p,'" + a.id + "'),'h1')") === false);
  ev("ordinaTavole(__p,['" + c.id + "'])");
  t('ordina', ev("registroTavole(__p)[0].id") === c.id);
  t('un progetto vecchio senza registro resta vuoto', ev("registroTavole({}).length") === 0);
  console.log(`\n${ok} ok, ${ko} KO`); process.exit(ko ? 1 : 0);
})();
