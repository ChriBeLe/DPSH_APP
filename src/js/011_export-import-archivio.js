            // ===== EXPORT / IMPORT ARCHIVIO (indipendente dall'export/import dei progetti) =====
            const btnExportArchive = document.getElementById('btnExportArchive');
            const btnImportArchiveBtn = document.getElementById('btnImportArchiveBtn');
            const fileImportArchive = document.getElementById('fileImportArchive');

            if (btnExportArchive) {
                btnExportArchive.addEventListener('click', () => {
                    const list = getArchiveList();
                    if (list.length === 0) {
                        appAlert("L'archivio è vuoto: non c'è nulla da esportare.");
                        return;
                    }
                    const payload = {
                        type: 'dpsh_lithology_archive',
                        versioneApp: APP_VERSIONE,
                        exportedAt: new Date().toISOString(),
                        lithologyArchive: state.lithologyArchive
                    };
                    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Archivio_Litologico_${new Date().toISOString().split('T')[0]}.json`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate(30);
                });
            }

            if (btnImportArchiveBtn && fileImportArchive) {
                btnImportArchiveBtn.addEventListener('click', () => {
                    fileImportArchive.value = '';
                    fileImportArchive.click();
                });
                fileImportArchive.addEventListener('change', async (e) => {
                    const file = e.target.files[0];
                    if (!file) return;
                    try {
                        const text = await file.text();
                        const parsed = JSON.parse(text);
                        const incoming = parsed.lithologyArchive || (parsed.type === 'dpsh_lithology_archive' ? {} : null);
                        if (!incoming || typeof incoming !== 'object' || Object.keys(incoming).length === 0) {
                            appAlert('⚠️ Il file non contiene un archivio litologico valido.');
                            return;
                        }
                        const { imported, renamed } = mergeLithologyArchiveInto(incoming);
                        saveState();
                        renderArchiveManagerList();
                        // Successo pulito: toast. Se qualche voce è stata rinominata c'è da leggere: dialogo.
                        toastODialogo(`Importate ${imported} ${imported === 1 ? 'voce' : 'voci'} nell'archivio litologico`,
                            renamed > 0 ? `${renamed} avevano lo stesso ID di una voce già presente: salvate come copia con "(Importato)" nel nome.` : '');
                    } catch (err) {
                        appAlert('⚠️ Errore durante l\'importazione: ' + err.message);
                    } finally {
                        fileImportArchive.value = '';
                    }
                });
            }


