// DPSH COME PROGRAMMA DA PC (Electron). Apre la stessa app del file DPSH.html, identica a come la
// si vede in Chrome (Electron porta con sé Chromium), in una finestra sua invece che in una scheda.
//  - L'app sta in un indirizzo fisso (dpsh://app/): i progetti salvati restano gli stessi anche se
//    si sposta la cartella del programma.
//  - I link verso internet (mappe, Google Maps…) si aprono nel browser di sempre.
//  - Le finestre vuote che l'app apre per stampare restano dentro il programma.
//  - Nei campi di testo il tasto destro dà taglia/copia/incolla e i suggerimenti del correttore
//    (Electron da solo non ha nessun menu); altrove resta il tasto destro dell'app.
const { app, BrowserWindow, Menu, protocol, net, shell, session, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');

// Dove sta DPSH.html: accanto a questo file (il pacchetto) o in ../dist (dentro il progetto).
const CANDIDATI = [path.join(__dirname, 'DPSH.html'), path.join(__dirname, '..', 'dist', 'DPSH.html')];
const FILE_APP = CANDIDATI.find(f => fs.existsSync(f));

protocol.registerSchemesAsPrivileged([
    { scheme: 'dpsh', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } }
]);

function apriFinestra() {
    const finestra = new BrowserWindow({
        width: 1440, height: 900, minWidth: 1024, minHeight: 640,
        title: 'DPSH', backgroundColor: '#1a2624', autoHideMenuBar: true,
        icon: fs.existsSync(path.join(__dirname, 'icona.png')) ? path.join(__dirname, 'icona.png') : undefined,
        webPreferences: { contextIsolation: true, sandbox: true, spellcheck: true, preload: path.join(__dirname, 'preload.js') }
    });
    finestra.loadURL('dpsh://app/DPSH.html');

    finestra.webContents.setWindowOpenHandler(({ url }) => {
        if (/^https?:|^mailto:|^geo:/i.test(url)) { shell.openExternal(url); return { action: 'deny' }; }
        return { action: 'allow', overrideBrowserWindowOptions: { autoHideMenuBar: true, backgroundColor: '#ffffff' } };
    });
    finestra.webContents.on('will-navigate', (e, url) => {
        if (/^https?:/i.test(url)) { e.preventDefault(); shell.openExternal(url); }
    });

    // Il menu dei campi di testo (l'app non lo intercetta: lascia quello del «browser»).
    finestra.webContents.on('context-menu', (e, p) => {
        if (!p.isEditable && !p.selectionText) return;
        const voci = [];
        (p.dictionarySuggestions || []).slice(0, 5).forEach(s => voci.push({ label: s, click: () => finestra.webContents.replaceMisspelling(s) }));
        if (p.misspelledWord) voci.push({ label: 'Aggiungi al dizionario', click: () => finestra.webContents.session.addWordToSpellCheckerDictionary(p.misspelledWord) });
        if (voci.length) voci.push({ type: 'separator' });
        if (p.isEditable) voci.push({ label: 'Taglia', role: 'cut' });
        voci.push({ label: 'Copia', role: 'copy' });
        if (p.isEditable) voci.push({ label: 'Incolla', role: 'paste' }, { type: 'separator' }, { label: 'Seleziona tutto', role: 'selectAll' });
        Menu.buildFromTemplate(voci).popup({ window: finestra });
    });

    // F11 schermo intero, Ctrl + e Ctrl − ingrandiscono, Ctrl 0 torna al 100%, F12 strumenti.
    // Senza il menu dell'applicazione (che si prenderebbe Ctrl Z, che invece è dell'app).
    finestra.webContents.on('before-input-event', (e, t) => {
        if (t.type !== 'keyDown') return;
        const wc = finestra.webContents;
        if (t.key === 'F11') { finestra.setFullScreen(!finestra.isFullScreen()); e.preventDefault(); }
        else if (t.key === 'F12') { wc.toggleDevTools(); e.preventDefault(); }
        else if (t.control && (t.key === '+' || t.key === '=')) { wc.setZoomLevel(wc.getZoomLevel() + 0.5); e.preventDefault(); }
        else if (t.control && t.key === '-') { wc.setZoomLevel(wc.getZoomLevel() - 0.5); e.preventDefault(); }
        else if (t.control && t.key === '0') { wc.setZoomLevel(0); e.preventDefault(); }
    });
}

// IL PDF SALVATO DIRETTAMENTE: il documento di stampa dell'app (già impaginato) si apre in una
// finestra nascosta, si aspetta che le immagini (anche le mappe) siano arrivate, e lo stesso
// Chromium lo scrive in PDF A4, coi formati di pagina del documento (A3 delle tavole compreso).
ipcMain.handle('dpsh-salva-pdf', async (e, html, nome) => {
    const tmp = path.join(app.getPath('temp'), `dpsh-stampa-${Date.now()}.html`);
    fs.writeFileSync(tmp, html);
    const nascosta = new BrowserWindow({ show: false, width: 794, height: 1123, webPreferences: { sandbox: true, contextIsolation: true } });
    try {
        await nascosta.loadFile(tmp);
        await nascosta.webContents.executeJavaScript(`new Promise(fatto => {
            const t0 = Date.now();
            (function guarda() {
                const pronte = Array.from(document.images).every(i => i.complete);
                if (pronte || Date.now() - t0 > 30000) setTimeout(fatto, 600); else setTimeout(guarda, 200);
            })();
        })`);
        const pdf = await nascosta.webContents.printToPDF({ printBackground: true, preferCSSPageSize: true, pageSize: 'A4', margins: { marginType: 'none' } });
        const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
            title: 'Salva il PDF', defaultPath: path.join(app.getPath('downloads'), nome), filters: [{ name: 'PDF', extensions: ['pdf'] }]
        });
        if (canceled || !filePath) return { salvato: false };
        fs.writeFileSync(filePath, pdf);
        return { salvato: true, nome: path.basename(filePath) };
    } finally {
        nascosta.destroy();
        fs.unlink(tmp, () => {});
    }
});

app.whenReady().then(() => {
    if (!FILE_APP) {
        require('electron').dialog.showErrorBox('DPSH', 'Non trovo DPSH.html accanto al programma.');
        return app.quit();
    }
    protocol.handle('dpsh', () => net.fetch(pathToFileURL(FILE_APP).toString()));
    session.defaultSession.setSpellCheckerLanguages(['it-IT']);
    // Il salvataggio dei file (Word, PDF, Excel, backup): chiede dove, partendo da Scaricati.
    session.defaultSession.on('will-download', (e, item) => {
        item.setSaveDialogOptions({ defaultPath: path.join(app.getPath('downloads'), item.getFilename()) });
    });
    Menu.setApplicationMenu(null);
    apriFinestra();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) apriFinestra(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
