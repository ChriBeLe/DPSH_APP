// UN PROGETTO «RICCO» PER LE SUITE DELLA FASE 2 (passaggio telefono ↔ PC).
//
// Le fixture della Fase 1 (stato_v0.json) hanno progetti veri ma usano solo il template «Classico» e
// nessuna voce d'archivio. Per dimostrare che un progetto passa da un dispositivo all'altro IDENTICO
// servono anche le cose che stanno fuori dal progetto e che il report usa. Qui, dentro un'app già
// avviata con le fixture, si aggiunge al primo progetto (Nardò) quello che manca, passando dalle
// funzioni dell'app dove esistono:
//  - un template di report «Modello Rossi» con un'immagine d'intestazione, usato dalla prova 2 e
//    dall'introduzione;
//  - un template dell'indice «Indice Rossi», usato dal progetto;
//  - una voce d'archivio litologico creata dallo strato 2 («Salva in archivio»);
//  - la nota conservata prima della conversione al nuovo motore (htmlPrimaDelMotore) con un'immagine sua;
//  - una foto JPEG con dei dati EXIF (byte che non vanno toccati) e la versione intera di una foto
//    ritagliata (id + '__orig');
//  - intervalli nuovi dal contatore (storico: registratoIl, origine) e una correzione registrata.
//
//   const { arricchisci, png, jpegConExif } = require('./dati/progetto_ricco');
//   const r = await arricchisci(app);   // { pid, sidTemplate, idTemplate, idIndice, idArchivio, ... }
const zlib = require('zlib');

function png(larghezza, altezza, rgb) {
    const crcTab = [];
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1); crcTab[n] = c >>> 0; }
    const crc = (b) => { let c = 0xffffffff; for (const x of b) c = crcTab[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
    const blocco = (tipo, dati) => {
        const t = Buffer.from(tipo, 'ascii');
        const l = Buffer.alloc(4); l.writeUInt32BE(dati.length);
        const c = Buffer.alloc(4); c.writeUInt32BE(crc(Buffer.concat([t, dati])));
        return Buffer.concat([l, t, dati, c]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(larghezza, 0); ihdr.writeUInt32BE(altezza, 4); ihdr[8] = 8; ihdr[9] = 2;
    const righe = [];
    for (let y = 0; y < altezza; y++) {
        const r = Buffer.alloc(1 + larghezza * 3);
        for (let x = 0; x < larghezza; x++) { r[1 + x * 3] = rgb[0]; r[2 + x * 3] = (rgb[1] + x) & 255; r[3 + x * 3] = (rgb[2] + y) & 255; }
        righe.push(r);
    }
    return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), blocco('IHDR', ihdr), blocco('IDAT', zlib.deflateSync(Buffer.concat(righe))), blocco('IEND', Buffer.alloc(0))]);
}

/** Byte con l'aspetto di un JPEG con un segmento EXIF (APP1) e coordinate: non serve che si possa
 * disegnare, serve che i suoi byte arrivino dall'altra parte uguali, fino all'ultimo. */
function jpegConExif(seme) {
    const exif = Buffer.from('Exif\u0000\u0000MM\u0000*GPS 40.19741N 17.99213E alt 42 · ' + seme, 'latin1');
    const app1 = Buffer.concat([Buffer.from([0xff, 0xe1, (exif.length + 2) >> 8, (exif.length + 2) & 255]), exif]);
    const corpo = Buffer.alloc(3000 + seme.length);
    for (let i = 0; i < corpo.length; i++) corpo[i] = (i * 31 + seme.charCodeAt(i % seme.length)) & 255;
    return Buffer.concat([Buffer.from([0xff, 0xd8]), app1, corpo, Buffer.from([0xff, 0xd9])]);
}
const dataUrl = (mime, buf) => `data:${mime};base64,${buf.toString('base64')}`;

async function arricchisci(app) {
    const E = app.E, j = JSON.stringify;
    const attesa = (ms) => new Promise(r => setTimeout(r, ms));
    const pid = E('Object.keys(state.projects)[0]');
    E('openProject(' + j(pid) + ')');
    await attesa(50);
    const prove = JSON.parse(E('JSON.stringify(Object.keys(state.projects[' + j(pid) + '].surveys))'));
    const sidTemplate = prove[1];

    // Template di report con un'immagine d'intestazione, usato da una prova e dall'introduzione.
    const intestazione = dataUrl('image/png', png(40, 12, [200, 30, 30]));
    E(`(() => {
        const t = JSON.parse(JSON.stringify(state.reportTemplates.classico));
        t.id = 'tpl_rossi'; t.name = 'Modello Rossi'; delete t.builtIn; t.createdAt = 1790000000000;
        t.pages[0].header.imageDataUrl = ${j(intestazione)};
        t.pages[0].footer.text = 'Studio Rossi · relazione geotecnica';
        state.reportTemplates.tpl_rossi = t;
        const i = JSON.parse(JSON.stringify(state.indiceTemplates.idx_classico));
        i.id = 'idx_rossi'; i.name = 'Indice Rossi'; delete i.builtIn; i.font = 'Georgia'; i.titoloTesto = 'Sommario';
        state.indiceTemplates.idx_rossi = i;
        const p = state.projects[${j(pid)}];
        p.surveys[${j(sidTemplate)}].reportTemplateId = 'tpl_rossi';
        if (state.currentSurveyId === ${j(sidTemplate)}) state.reportTemplateId = 'tpl_rossi';
        p.indiceTemplateId = 'idx_rossi';
        p.introduzione = { attiva: true, templateId: 'tpl_rossi' };
        saveState();
    })()`);

    // Voce d'archivio dallo strato 2, come fa «Salva in archivio».
    const idArchivio = E('(() => { const id = promoteStratoToArchive(state.strati[1]); saveState(); return id; })()');

    // La nota com'era prima del nuovo motore, con un'immagine sua; e una correzione registrata.
    const immaginePrima = dataUrl('image/png', png(24, 24, [10, 120, 200]));
    E(`(() => {
        const p = state.projects[${j(pid)}];
        p.notes.htmlPrimaDelMotore = '<p>Nota di prima</p><img src="" data-note-img-id="nimg_prima_1">';
        saveState();
    })()`);
    await E('saveNoteImageToIDB')('nimg_prima_1', immaginePrima);
    // (L'app di prima non ha il registro: le controprove girano anche lì.)
    if (E('typeof registraCorrezioni') === 'function') E(`registraCorrezioni(state, [{ tipo: 'colpi-testo', testo: 'Nardò - Scuola Via Roma · Prova N° 1: i colpi erano testo', projId: ${j(pid)}, survId: ${j(prove[0])} }], 'avvio'); saveState();`);

    // Una foto JPEG con EXIF e la versione intera di una foto ritagliata.
    const jpeg = jpegConExif('prova-2');
    const fotoJpeg = dataUrl('image/jpeg', jpeg);
    const idJpeg = 'photo_exif_1';
    E(`(() => {
        const p = state.projects[${j(pid)}];
        const s = p.surveys[${j(sidTemplate)}];
        s.photos = (s.photos || []).concat([{ id: ${j(idJpeg)}, lat: 40.19755, lng: 17.99231, alt: 41, hasExifGps: true, gpsSource: 'exif', timestamp: '26/09/2026 18:02', scattataIl: '2026-09-26T16:02:11.000Z' }]);
        if (state.currentSurveyId === ${j(sidTemplate)}) state.photos = JSON.parse(JSON.stringify(s.photos));
        saveState();
    })()`);
    await E('savePhotoToIDB')(idJpeg, fotoJpeg);
    const idRitagliata = E('state.projects[' + j(pid) + '].surveys[' + j(prove[0]) + '].photos[0].id');
    const originaleIntero = dataUrl('image/png', png(96, 72, [139, 90, 43]));
    await E('savePhotoToIDB')(idRitagliata + '__orig', originaleIntero);

    // Due intervalli dal contatore sulla prova aperta: storico con registratoIl e origine.
    E('syncProjectToActiveState(' + j(pid) + ', ' + j(prove[0]) + '); updateUI(); saveState();');
    for (let k = 0; k < 2; k++) {
        for (let i = 0; i < 6 + k; i++) app.d.getElementById('btnPlus').click();
        app.d.getElementById('btnConfirmStepAction').click();
        await attesa(20);
    }
    E('saveState()');
    return { pid, prove, sidTemplate, idTemplate: 'tpl_rossi', idIndice: 'idx_rossi', idArchivio, idJpeg, jpeg, idRitagliata, originaleIntero, immaginePrima, intestazione };
}

module.exports = { arricchisci, png, jpegConExif, dataUrl };
