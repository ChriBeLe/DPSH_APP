// Numero proposto per la nuova prova. Il numero è il massimo delle prove esistenti + 1, non il
// conteggio + 1: con 1, 2, 3 e la 2 eliminata il conteggio darebbe 3, già in uso (doppione).
// Si esegue la funzione vera openNewSurveyModal dentro l'app e si legge il numero della prova creata.
const { avviaApp } = require('./dati/app_in_jsdom');

let ok = 0, ko = 0;
const t = (n, c) => { if (c) { ok++; console.log('  ok  ' + n); } else { ko++; console.log('  KO  ' + n); } };

function prova(id, nr) { return { id, header: { provaNr: nr, committente: '', comune: 'C', localita: '', date: '2026-11-17' }, instrument: {}, settings: {} }; }

async function numeroProposto(elenco) {
    const app = await avviaApp({ stato: null, attesaAvvio: 900 });
    try {
        const surveys = Object.fromEntries(elenco.map(s => [s.id, s]));
        app.E(`state.projects = { P1: { id: 'P1', name: 'Cantiere', surveys: ${JSON.stringify(surveys)} } }; state.currentProjectId = 'P1'; state.currentSurveyId = ${elenco.length ? JSON.stringify(elenco[0].id) : 'null'};`);
        const prima = app.E(`Object.keys(state.projects.P1.surveys)`);
        app.E('openNewSurveyModal()');
        const dopo = app.E(`Object.keys(state.projects.P1.surveys)`);
        // La nuova prova è l'ultima chiave aggiunta (le chiavi nascono in ordine di inserimento).
        const nuove = dopo.filter(id => !prima.includes(id));
        if (!nuove.length) return 'nessuna prova creata: ' + app.errori.join(' | ');
        return app.E(`state.projects.P1.surveys['${dopo[dopo.length - 1]}'].header.provaNr`);
    } finally { app.chiudi(); }
}

(async () => {
    console.log('--- Numero proposto per la nuova prova ---');
    t('prove 1, 3 (la 2 eliminata): la nuova e 4, non 3', await numeroProposto([prova('S1', '1'), prova('S3', '3')]) === '4');
    t('prove 3B e 7: la nuova e 8', await numeroProposto([prova('S3B', '3B'), prova('S7', '7')]) === '8');
    t('progetto senza prove: la nuova e 1', await numeroProposto([]) === '1');
    t('prove senza numero ignorate: con 2 e una senza numero la nuova e 3', await numeroProposto([prova('S2', '2'), prova('SX', '/')]) === '3');
    console.log('\n' + ok + ' ok, ' + ko + ' KO');
    process.exit(ko ? 1 : 0);
})().catch(e => { console.log('KO  eccezione: ' + e.message); process.exit(1); });
