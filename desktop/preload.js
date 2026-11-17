// Il ponte tra l'app e il programma da PC: l'app lo trova come window.dpshDesktop e, se c'è,
// salva il PDF direttamente invece di aprire il pannello di stampa (046).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dpshDesktop', {
    salvaPdf: (html, nome) => ipcRenderer.invoke('dpsh-salva-pdf', String(html), String(nome || 'Report.pdf'))
});
