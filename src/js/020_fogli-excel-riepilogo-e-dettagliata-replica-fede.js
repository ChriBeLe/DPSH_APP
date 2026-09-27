            // =========================================================================
            // FOGLI EXCEL "Riepilogo" e "Dettagliata" — replica fedele (struttura, etichette,
            // colori di sfondo per categoria, "#N/D" per i valori non applicabili) dei fogli
            // RIEPILOGO e TABELLE del file originale Nardò_DPSH1.ods, compilati con i dati
            // calcolati della prova. Usa ExcelJS invece di SheetJS: la community edition di
            // SheetJS non scrive gli stili delle celle in un .xlsx, ExcelJS sì.
            // =========================================================================

            const BORDO_EXCEL = { style: 'thin', color: { argb: 'FF999999' } };
            const argbExcel = (hex) => 'FF' + hex.toUpperCase();

            function stileCellaExcel(cell, { bold, colore, align } = {}){
                cell.border = { top: BORDO_EXCEL, bottom: BORDO_EXCEL, left: BORDO_EXCEL, right: BORDO_EXCEL };
                cell.alignment = { vertical: 'middle', horizontal: align || 'left', wrapText: true };
                if (bold) cell.font = { bold: true };
                if (colore) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: argbExcel(colore) } };
            }

            /** Scrive "etichetta + un valore per strato" sulla riga `r`. I valori nulli/vuoti o già
             * formattati come 'N/D' da fmtIT diventano '#N/D', come nel foglio originale. */
            function scriviRigaExcel(ws, r, etichetta, celle, { colore, boldEtichetta = true, allineaValori = 'right' } = {}){
                const cLbl = ws.getCell(r, 1);
                cLbl.value = etichetta;
                stileCellaExcel(cLbl, { bold: boldEtichetta, colore, align: 'left' });
                celle.forEach((v, i) => {
                    const c = ws.getCell(r, i + 2);
                    c.value = (v === null || v === undefined || v === '' || v === 'N/D') ? '#N/D' : v;
                    stileCellaExcel(c, { colore, align: allineaValori });
                });
            }

            /** Riga "titolo di sezione": sfondo colorato, grassetto, unita su tutte le colonne —
             * come le intestazioni di sezione del foglio TABELLE originale (es. "Condizioni e
             * tipologia", "Peso unità di volume [t/m³]", una per ciascun parametro geotecnico). */
            function scriviSezioneExcel(ws, r, titolo, numColonneDati, colore){
                ws.mergeCells(r, 1, r, numColonneDati + 1);
                const c = ws.getCell(r, 1);
                c.value = titolo;
                stileCellaExcel(c, { bold: true, colore, align: 'left' });
            }

            function intestazioneWorksheetExcel(ws, titolo, dati, surv){
                const h = surv.header || {};
                const infoStr = `Comune: ${h.comune || '-'}  Località: ${h.localita || '-'}  Cliente: ${h.committente || '-'}  Data indagine: ${formattaDataIT(h.date) || '-'}`;
                scriviRigaExcel(ws, 1, titolo, dati.map(d=>d.strato.name), { colore: COLORI_EXPORT.intestazione, allineaValori: 'center' });
                scriviRigaExcel(ws, 2, infoStr, dati.map(d=>d.strato.name), { colore: COLORI_EXPORT.condizioni, boldEtichetta: false, allineaValori: 'center' });
                ws.getRow(1).font = { bold: true };
                ws.getColumn(1).width = 34;
                dati.forEach((d, i) => { ws.getColumn(i + 2).width = 20; });
                ws.views = [{ state: 'frozen', ySplit: 2 }];
            }

            function popolaWorksheetRiepilogo(ws, dati, numero, surv){
                intestazioneWorksheetExcel(ws, `Riepilogo — Prova DPSH n°${numero}`, dati, surv);
                const C = COLORI_EXPORT;
                let r = 3;
                scriviRigaExcel(ws, r++, 'profondità [m]', dati.map(d=>fmtIT(d.agg.profonditaA,1)), { colore: C.preElaborazione });
                scriviRigaExcel(ws, r++, 'spessore [m]', dati.map(d=>fmtIT(d.ris.preElaborazione.spessore,1)), { colore: C.preElaborazione });
                scriviRigaExcel(ws, r++, 'in falda', dati.map(d=>d.ris.preElaborazione.inFalda), { colore: C.preElaborazione, allineaValori: 'center' });
                scriviRigaExcel(ws, r++, "Nspt medio'", dati.map(d=>fmtIT(d.ris.preElaborazione.nsptFalda)), { colore: C.preElaborazione });
                scriviRigaExcel(ws, r++, 'Rpd [kg/cm²]', dati.map(d=>fmtIT(d.agg.rpdMedio)), { colore: C.preElaborazione });
                scriviRigaExcel(ws, r++, "σ'v0 [t/m²]", dati.map(d=>fmtIT(d.ris.preElaborazione.sigmaV0)), { colore: C.preElaborazione });
                scriviRigaExcel(ws, r++, 'incoerente', dati.map(d=>d.agg.isIncoerente?'SI':'NO'), { colore: C.preElaborazione, allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'coesivo', dati.map(d=>d.agg.isCoesivo?'SI':'NO'), { colore: C.preElaborazione, allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'Stato di consistenza (A.G.I. 1977)', dati.map(d=>d.ris.preElaborazione.statoConsistenza ?? null), { colore: C.condizioni, allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'Peso di volume secco [t/m³]', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSecco)), { colore: C.pesoDiVolume });
                scriviRigaExcel(ws, r++, 'Peso di volume saturo [t/m³]', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSaturo)), { colore: C.pesoDiVolume });
                for(const catId of ORDINE_PARAMETRI){
                    scriviRigaExcel(ws, r++, ETICHETTE_PARAMETRO[catId].compatta, dati.map(d=>fmtIT(d.ris.categorie[catId].selezionato?.valore ?? null)), { colore: C[catId] });
                }
                scriviRigaExcel(ws, r++, 'Coefficiente K0', dati.map(d=>fmtIT(d.ris.derivati.K0,3)), { colore: C.resistenzaCompressione });
                scriviRigaExcel(ws, r++, 'Coefficiente di Poisson', dati.map(d=>fmtIT(d.ris.derivati.poisson,3)), { colore: C.resistenzaCompressione });
                scriviRigaExcel(ws, r++, 'Res. compr. qu [kg/cm²]', dati.map(d=>fmtIT(d.ris.derivati.qu,3)), { colore: C.resistenzaCompressione });
            }

            function popolaWorksheetDettagliata(ws, dati, numero, surv){
                intestazioneWorksheetExcel(ws, `Dettagliata — Prova DPSH n°${numero}`, dati, surv);
                const C = COLORI_EXPORT;
                const n = dati.length;
                let r = 3;
                scriviSezioneExcel(ws, r++, 'Condizioni e tipologia', n, C.condizioni);
                scriviRigaExcel(ws, r++, 'profondità [m]', dati.map(d=>fmtIT(d.agg.profonditaA,1)));
                scriviRigaExcel(ws, r++, 'spessore [m]', dati.map(d=>fmtIT(d.ris.preElaborazione.spessore,1)));
                scriviRigaExcel(ws, r++, 'Nspt medio', dati.map(d=>fmtIT(d.agg.nsptGrezzo)));
                scriviRigaExcel(ws, r++, 'in falda', dati.map(d=>d.ris.preElaborazione.inFalda), { allineaValori: 'center' });
                scriviRigaExcel(ws, r++, "Nspt medio'", dati.map(d=>fmtIT(d.ris.preElaborazione.nsptFalda)));
                scriviRigaExcel(ws, r++, 'Rpd [kg/cm²]', dati.map(d=>fmtIT(d.agg.rpdMedio)));
                scriviRigaExcel(ws, r++, "σ'v0 [t/m²]", dati.map(d=>fmtIT(d.ris.preElaborazione.sigmaV0)));
                scriviRigaExcel(ws, r++, 'incoerente', dati.map(d=>d.agg.isIncoerente?'SI':'NO'), { allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'coesivo', dati.map(d=>d.agg.isCoesivo?'SI':'NO'), { allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'stato di consistenza (A.G.I. 1977)', dati.map(d=>d.ris.preElaborazione.statoConsistenza ?? null), { allineaValori: 'center' });

                scriviSezioneExcel(ws, r++, 'Peso unità di volume [t/m³]', n, C.pesoDiVolume);
                scriviRigaExcel(ws, r++, 'autore', dati.map(d=>d.ris.categorie.pesoDiVolume.selezionato?.autore ?? null), { allineaValori: 'center' });
                scriviRigaExcel(ws, r++, 'valore (secco)', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSecco)));
                scriviRigaExcel(ws, r++, 'valore (saturo)', dati.map(d=>fmtIT(d.ris.preElaborazione.pesoSaturo)));

                for(const catId of ORDINE_PARAMETRI){
                    scriviSezioneExcel(ws, r++, ETICHETTE_PARAMETRO[catId].estesa, n, C[catId]);
                    scriviRigaExcel(ws, r++, 'autore', dati.map(d=>d.ris.categorie[catId].selezionato?.autore ?? null), { allineaValori: 'center' });
                    scriviRigaExcel(ws, r++, 'terreno', dati.map(d=>d.ris.categorie[catId].selezionato?.terreno ?? null), { allineaValori: 'center' });
                    scriviRigaExcel(ws, r++, 'valore', dati.map(d=>fmtIT(d.ris.categorie[catId].selezionato?.valore ?? null)));
                }

                scriviSezioneExcel(ws, r++, 'Resistenza a compressione', n, C.resistenzaCompressione);
                scriviRigaExcel(ws, r++, "K0 (da φ')", dati.map(d=>fmtIT(d.ris.derivati.K0,3)));
                scriviRigaExcel(ws, r++, "Poisson (da φ')", dati.map(d=>fmtIT(d.ris.derivati.poisson,3)));
                scriviRigaExcel(ws, r++, 'qu [kg/cm²]', dati.map(d=>fmtIT(d.ris.derivati.qu,3)));
            }

            /** Ricostruisce i dati calcolati (agg + ris) di una prova (survey) qualsiasi del progetto,
             * a partire dai suoi logs/header/instrument/settings salvati — non serve che sia quella aperta. */
            function datiCalcolatiProva(surv, projStrati){
                const falda = faldaDaHeader(surv.header || {});
                const stepCm = (surv.settings && surv.settings.stepCm) || 20;
                const instrument = surv.instrument || {};
                const stratiEff = stratiEffettiviProva(surv.logs || [], projStrati, instrument, stepCm, falda);
                const risultati = elaboraStratiProva(stratiEff, falda);
                return stratiEff.map((agg,i)=>({ strato: agg.strato, agg, ris: risultati[i] }));
            }

            /** Elenco delle prove (surveys) del progetto corrente, ordinate per numero prova. */
            function elencoProveProgetto(){
                const proj = state.projects[state.currentProjectId];
                if (!proj || !proj.surveys) return [];
                syncStateToProject(); // garantisce che la prova aperta sia salvata in proj prima di esportare
                return Object.values(state.projects[state.currentProjectId].surveys)
                    .slice()
                    .sort((a,b)=> (parseInt(a.header?.provaNr)||0) - (parseInt(b.header?.provaNr)||0) || (a.updatedAt||0)-(b.updatedAt||0));
            }

            /** Sezione completa di una prova per l'export "Parametri Avanzati": scheda di campo
             * (header, tabella colpi/Rpd, grafico, foto — identica a quella del Report Completo)
             * seguita dalle tabelle Riepilogo e Dettagliata dei parametri avanzati. Così anche gli
             * export dedicati di "Elaborazione Dati Speciali" (PDF/Word) mostrano tutte le info
             * della prova, non solo le tabelle dei parametri. */
            async function sezioneProvaHtml(surv, proj, primaProva){
                const projStrati = (proj && proj.strati) || state.strati;
                const dati = datiCalcolatiProva(surv, projStrati);
                const h = surv.header || {};
                const numero = h.provaNr || '1';

                const schedaCampoHtml = (await buildSurveyReportHtml(surv, proj, false)).html;

                if (dati.length === 0) {
                    return `<div style="${primaProva?'':'page-break-after:always;'}">
                        ${schedaCampoHtml}
                        <div style="page-break-before:always; font-family:Arial,sans-serif;">
                            <h1 style="font-size:20px;margin:0 0 6px;">Parametri Avanzati — Prova DPSH n° ${numero}</h1>
                            <div style="font-size:12px;color:#a15a46;">Nessuno strato con intervalli assegnati in questa prova: nessun parametro da esportare.</div>
                        </div>
                    </div>`;
                }
                return `
                    <div style="${primaProva?'':'page-break-after:always;'}">
                        ${schedaCampoHtml}
                        <div style="page-break-before:always; font-family:Arial,sans-serif;">
                            <h1 style="font-size:20px;margin:0 0 6px;">Parametri Avanzati — Prova DPSH n° ${numero}</h1>
                            <div style="font-size:12px;margin-bottom:14px;">
                                <b>Comune:</b> ${h.comune||'-'} &nbsp; <b>Località:</b> ${h.localita||'-'} &nbsp; <b>Data indagine:</b> ${formattaDataIT(h.date)||'-'} &nbsp;
                                <b>Penetrometro:</b> ${(surv.settings&&surv.settings.penetrometer)||'-'} &nbsp;
                                <b>Falda:</b> ${h.faldaDa ? h.faldaDa+'–'+(h.faldaA||h.faldaDa)+'m' : 'non rilevata'}
                            </div>
                            ${htmlTabellaRiepilogo(dati, numero, h)}
                            <div style="height:22px;"></div>
                            ${htmlTabellaDettagliata(dati, numero, h)}
                        </div>
                        <div style="page-break-before:always;">
                            ${buildAllegatoHtml(dati, numero, h)}
                        </div>
                    </div>`;
            }

            async function documentoEsportazioneAvanzata(){
                const proj = state.projects[state.currentProjectId];
                const prove = elencoProveProgetto();
                if (prove.length === 0) return '<p style="font-family:Arial,sans-serif;">Nessuna prova disponibile in questo progetto.</p>';
                let sezioni = '';
                for (let i = 0; i < prove.length; i++) {
                    sezioni += await sezioneProvaHtml(prove[i], proj, i === 0);
                }
                return `${sezioni}
                    <p style="font-family:Arial,sans-serif;font-size:10px;color:#666;margin-top:14px;">
                        Report generato da DPSH Field Collector — Elaborazione Parametri Avanzati.
                    </p>`;
            }

            const btnExportProcessingExcel = document.getElementById('btnExportProcessingExcel');
            const btnExportProcessingCsv = document.getElementById('btnExportProcessingCsv');
            const btnExportProcessingPdf = document.getElementById('btnExportProcessingPdf');

            if (btnExportProcessingExcel) {
                btnExportProcessingExcel.addEventListener('click', async () => {
                    if (typeof ExcelJS === 'undefined') {
                        appAlert('Libreria ExcelJS non disponibile: verifica di aver caricato la pagina con connessione internet almeno una volta.');
                        return;
                    }
                    const proj = state.projects[state.currentProjectId];
                    const projStrati = (proj && proj.strati) || state.strati;
                    const prove = elencoProveProgetto();
                    if (prove.length === 0) { appAlert('Nessuna prova disponibile in questo progetto.'); return; }
                    const wb = new ExcelJS.Workbook();
                    let almenoUnFoglio = false;
                    prove.forEach(surv=>{
                        const dati = datiCalcolatiProva(surv, projStrati);
                        if (dati.length === 0) return;
                        almenoUnFoglio = true;
                        const numero = (surv.header && surv.header.provaNr) || '1';
                        const wsR = wb.addWorksheet(('P'+numero+' Riepilogo').substring(0,31));
                        popolaWorksheetRiepilogo(wsR, dati, numero, surv);
                        const wsD = wb.addWorksheet(('P'+numero+' Dettagliata').substring(0,31));
                        popolaWorksheetDettagliata(wsD, dati, numero, surv);
                    });
                    if (!almenoUnFoglio) { appAlert('Nessuno strato con parametri calcolabili in questo progetto.'); return; }
                    const projName = (proj && proj.name) || 'Progetto';
                    const buffer = await wb.xlsx.writeBuffer();
                    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Parametri_Avanzati_${projName.replace(/\s+/g, '_')}.xlsx`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate(30);
                });
            }

            if (btnExportProcessingCsv) {
                btnExportProcessingCsv.addEventListener('click', () => {
                    const proj = state.projects[state.currentProjectId];
                    const projStrati = (proj && proj.strati) || state.strati;
                    const prove = elencoProveProgetto();
                    if (prove.length === 0) { appAlert('Nessuna prova disponibile in questo progetto.'); return; }
                    const rows = [['Prova','Strato','Profondit\u00e0 A [m]',"Nspt medio'",'Rpd [kg/cm\u00b2]',"\u03c3'v0 [t/m\u00b2]",'Stato consistenza',
                        ...ORDINE_PARAMETRI.map(c=>ETICHETTE_PARAMETRO[c].compatta+' (autore)'), ...ORDINE_PARAMETRI.map(c=>ETICHETTE_PARAMETRO[c].compatta)]];
                    prove.forEach(surv=>{
                        const dati = datiCalcolatiProva(surv, projStrati);
                        const numero = (surv.header && surv.header.provaNr) || '1';
                        dati.forEach(d=>{
                            rows.push([numero, d.strato.name, d.agg.profonditaA, d.ris.preElaborazione.nsptFalda, d.agg.rpdMedio,
                                d.ris.preElaborazione.sigmaV0, d.ris.preElaborazione.statoConsistenza,
                                ...ORDINE_PARAMETRI.map(c=>d.ris.categorie[c].selezionato?.autore||''),
                                ...ORDINE_PARAMETRI.map(c=>d.ris.categorie[c].selezionato?.valore ?? '')]);
                        });
                    });
                    const csv = rows.map(r => r.map(c => `"${String(c===undefined||c===null?'':c).replace(/"/g, '""')}"`).join(';')).join('\n');
                    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    const projName = (proj && proj.name) || 'Progetto';
                    a.download = `Parametri_Avanzati_${projName.replace(/\s+/g, '_')}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate(30);
                });
            }

            if (btnExportProcessingPdf) {
                btnExportProcessingPdf.addEventListener('click', async () => {
                    const prove = elencoProveProgetto();
                    if (prove.length === 0) { appAlert('Nessuna prova disponibile in questo progetto.'); return; }
                    const projName = (state.projects[state.currentProjectId] && state.projects[state.currentProjectId].name) || 'Progetto';
                    // Apriamo la finestra subito (in modo sincrono rispetto al click) per evitare
                    // che il blocco popup del browser la scarti: il contenuto (che richiede attese
                    // asincrone per caricare le foto) viene scritto dentro non appena pronto.
                    const printWindow = window.open('', '_blank');
                    if (!printWindow) {
                        appAlert('Consenti i pop-up nel browser per aprire l\'anteprima PDF stampabile.');
                        return;
                    }
                    const contenuto = await documentoEsportazioneAvanzata();
                    printWindow.document.write(`
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Parametri Avanzati - ${projName}</title>
<style>${typeof getReportPrintStyleBlock === 'function' ? getReportPrintStyleBlock() : ''}</style>
</head><body>${getIconSpriteHtml()}<div class="a4-page">
<div class="no-print" style="margin-bottom:14px; display:flex; flex-direction:column; align-items:flex-end; gap:6px;">
    <button onclick="window.print()" style="background:#f59e0b; color:#0f172a; border:none; padding:10px 18px; font-weight:800; font-size:14px; border-radius:6px; cursor:pointer;">Stampa / Salva in PDF</button>
    <div style="font-size:10.5px; color:#64748b; max-width:320px; text-align:right;">Nella finestra di stampa assicurati che "Grafica di sfondo" (Background graphics) sia attiva, altrimenti i colori delle righe non verranno stampati.</div>
</div>
<h2 style="color:#0f172a;">Parametri Avanzati — ${projName}</h2>
${contenuto}
</div>
${typeof getControlloImpaginazioneScriptTag === 'function' ? getControlloImpaginazioneScriptTag() : ''}
</body></html>
                    `);
                    printWindow.document.close();
                    triggerVibrate(30);
                });
            }

            /** Inserisce l'attributo bgcolor (oltre allo style già presente) sulle celle colorate:
             * alcune build di Word rispettano bgcolor in modo più affidabile dello style
             * background su <td>/<th> importati da HTML, quindi lo aggiungiamo come ridondanza
             * per garantire che i colori arrivino identici anche lì. */
            function aggiungiBgcolorPerWord(html){
                return html.replace(/<(td|th)(\s+style="[^"]*background:#([0-9A-Fa-f]{6})[^"]*")/g, '<$1 bgcolor="#$3"$2');
            }

            /** Wrappa l'HTML delle tabelle in un documento .doc compatibile con Microsoft Word
             * (namespace MSO, riconosciuto e aperto nativamente da Word) — stessa formattazione,
             * stessa impaginazione e stessi colori di riga del PDF e del foglio Nardò_DPSH1.ods. */
            function costruisciDocumentoWord(titolo, bodyHtml){
                const bodyConBgcolor = aggiungiBgcolorPerWord(bodyHtml);
                return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${titolo}</title>
<!--[if gte mso 9]>
<xml>
<w:WordDocument>
<w:View>Print</w:View>
<w:Zoom>100</w:Zoom>
<w:DoNotOptimizeForBrowser/>
</w:WordDocument>
</xml>
<![endif]-->
<style>
@page WordSection1 { size: 21cm 29.7cm; margin: 1.8cm 1.5cm; mso-page-orientation: portrait; }
div.WordSection1 { page: WordSection1; }
body { font-family: 'Segoe UI', Arial, sans-serif; color:#1e293b; font-size: 11px; }
h1 { font-size: 18px; margin: 0 0 6px; }
h2 { font-size: 15px; color:#0f172a; margin: 0 0 14px; }
table { border-collapse: collapse; width: 100%; font-size: 10.5px; margin-top: 4px; mso-table-lspace:0pt; mso-table-rspace:0pt; page-break-inside: avoid; }
table.tbl-long { page-break-inside: auto; }
caption { text-align:left; font-weight:700; font-size:13px; padding-bottom:6px; }
td, th { border: 1px solid #999; padding: 5px 8px; mso-border-alt: solid #999 .5pt; }
tr { page-break-inside: avoid; }
</style>
</head>
<body>
<div class="WordSection1">
${bodyConBgcolor}
</div>
</body>
</html>`;
            }

            const btnExportProcessingWord = document.getElementById('btnExportProcessingWord');
            if (btnExportProcessingWord) {
                btnExportProcessingWord.addEventListener('click', async () => {
                    const prove = elencoProveProgetto();
                    if (prove.length === 0) { appAlert('Nessuna prova disponibile in questo progetto.'); return; }
                    const projName = (state.projects[state.currentProjectId] && state.projects[state.currentProjectId].name) || 'Progetto';
                    const contenuto = await documentoEsportazioneAvanzata();
                    const docHtml = costruisciDocumentoWord(
                        `Parametri Avanzati - ${projName}`,
                        `<h2>Parametri Avanzati — ${projName}</h2>${contenuto}`
                    );
                    const blob = new Blob(['﻿' + docHtml], { type: 'application/msword' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Parametri_Avanzati_${projName.replace(/\s+/g, '_')}.doc`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    triggerVibrate(30);
                });
            }

            function getRodForDepth(endDepth) {
                const rodLen = parseFloat(state.instrument.lunghAsta || 1.00);
                if (endDepth <= 0 || rodLen <= 0) return 1;
                return Math.floor((endDepth - 0.0001) / rodLen) + 1;
            }

            // LE DUE VISTE DELLA PROVA (Fase 6): «Conta» (contatore e ultimi 3 intervalli) e
            // «Registro» (il registro intero). Non si ricorda: entrando in una prova dalla Home si
            // riparte sempre dal contatore (vedi switchView).
            let vistaProva = 'conta';
            // Sul PC (Fase 7, decisione I) niente contatore: si lavora sul Registro, si inserisce con
            // «Aggiungi» e si corregge da tastiera.
            const suPc = () => window.matchMedia('(min-width: 1024px)').matches;
            function mostraVistaProva(vista) {
                vistaProva = vista;
                updateUI();
                (document.scrollingElement || document.documentElement).scrollTop = 0;
            }
            document.getElementById('btnVistaConta').addEventListener('click', () => mostraVistaProva('conta'));
            document.getElementById('btnVistaRegistro').addEventListener('click', () => mostraVistaProva('registro'));
            document.getElementById('btnVaiAlRegistro').addEventListener('click', () => mostraVistaProva('registro'));
            // I gesti della prova, spiegati in un posto solo dietro la «?» (Fase 6, punto 4): prima erano
            // scritte fisse sotto −1, sotto Registra e sopra il Registro.
            const AIUTO_PROVA = 'Contatore\n'
                + '• +1 aggiunge un colpo; tenuto premuto registra l\'intervallo.\n'
                + '• −1 toglie un colpo; tenuto premuto annulla l\'ultimo intervallo.\n'
                + '• Dopo aver registrato, «Annulla» nel messaggio in basso toglie proprio quell\'intervallo.\n\n'
                + 'Registro\n'
                + '• Tocca una riga per correggerla.\n'
                + '• Scorri una riga a sinistra per Modifica ed Elimina.\n'
                + '• «Mostra tutte le righe» apre il registro per intero.';
            document.querySelectorAll('.btn-aiuto-prova').forEach(b => b.addEventListener('click', () => appDialog(AIUTO_PROVA, { title: 'Come si usa' })));

            // Preferenze dell'app (004e), non del progetto: cambiarle non lo segna come modificato.
            document.getElementById('btnOrdineIntervalli').addEventListener('click', () => {
                if (state.settings.intervalliRecentiInCima === true) delete state.settings.intervalliRecentiInCima; else state.settings.intervalliRecentiInCima = true;
                updateUI();
                saveState();
            });
            document.querySelectorAll('.btn-espandi-registro').forEach(b => b.addEventListener('click', () => {
                if (state.settings.registroEspanso === true) delete state.settings.registroEspanso; else state.settings.registroEspanso = true;
                updateUI();
                saveState();
            }));

            function renderUltimiIntervalli() {
                const box = document.getElementById('listaUltimiIntervalli');
                if (!box) return;
                const logs = state.logs || [];
                const primo = Math.max(0, logs.length - 3);
                const ultimi = logs.slice(primo).map((log, k) => ({ log, idx: primo + k })).filter(r => r.log);
                // Ordine scelto toccando il titolo, ricordato (vale solo per questo elenco).
                const recentiInCima = state.settings.intervalliRecentiInCima === true;
                if (recentiInCima) ultimi.reverse();
                const titolo = document.getElementById('btnOrdineIntervalli');
                titolo.classList.toggle('crescente', !recentiInCima);
                titolo.title = recentiInCima ? 'Dal più profondo: tocca per invertire' : 'Dal più superficiale: tocca per invertire';
                titolo.setAttribute('aria-label', 'Intervalli, ' + titolo.title.toLowerCase());
                if (!ultimi.length) {
                    box.innerHTML = '<div class="ultimi-vuoto">Ancora nessun intervallo registrato.</div>';
                    return;
                }
                const maxN = Math.max(10, ...logs.map(l => (l && l.colpi) || 0));
                box.innerHTML = ultimi.map(({ log, idx }) => {
                    const lit = getEffectiveLithology(idx) || { color: '#f59e0b' };
                    const larghezza = Math.min(100, Math.max(6, ((Number(log.colpi) || 0) / maxN) * 100));
                    return `<button type="button" class="ultimo-intervallo" data-index="${idx}">
                        <span class="ultimo-intervallo-prof">${testoIntervallo(Number(log.start) || 0, Number(log.end) || 0)}</span>
                        <span class="ultimo-intervallo-colpi">${Number(log.colpi) || 0}</span>
                        <span class="ultimo-intervallo-barra"><span style="width:${larghezza}%; ${getPatternCss(lit.pattern, lit.color)}"></span></span>
                    </button>`;
                }).join('');
                box.querySelectorAll('.ultimo-intervallo').forEach(b => b.addEventListener('click', () => openEditModal(Number(b.getAttribute('data-index')), { senzaTastiera: true })));
            }

            // IL NUMERONE DEI COLPI REAGISCE QUANDO CAMBIA. È l'elemento più guardato dell'app in
            // cantiere — 72px al centro della schermata — e passava da 12 a 13 senza nessun
            // riscontro: l'unica conferma che il colpo era stato contato era la cifra diversa.
            // Con il guanto e il rumore del maglio, "la cifra è diversa" non basta.
            // Si scatta SOLO quando il valore cambia davvero, non a ogni updateUI (che gira
            // anche per motivi che col conteggio non c'entrano): altrimenti il numero
            // pulserebbe di continuo e l'impulso smetterebbe di voler dire qualcosa.
            let ultimoConteggioMostrato = null;
            function impulsoContatoreColpi() {
                if (!lblBlowCount) return;
                lblBlowCount.classList.remove('blow-display-cambiato');
                void lblBlowCount.offsetWidth; // forza il reflow: senza, l'animazione non riparte
                lblBlowCount.classList.add('blow-display-cambiato');
                // Rete di sicurezza indipendente da animationend, che può non arrivare mai (scheda
                // in background, nodo sostituito): la classe non deve restare appiccicata.
                setTimeout(() => lblBlowCount.classList.remove('blow-display-cambiato'), 400);
            }

            // SCRITTURA DEI NUMERI NELLE ETICHETTE NUOVE (Fase 3): decimali con la virgola e
            // intervalli come «8,00–8,20 m». Non toLocaleString: su qualche WebView senza i dati
            // italiani darebbe il punto.
            function numeroConVirgola(n, decimali = 2) {
                const x = Number(n);
                if (!Number.isFinite(x)) return '';
                return x.toFixed(decimali).replace('.', ',');
            }
            function testoIntervallo(da, a) {
                return `${numeroConVirgola(da)}–${numeroConVirgola(a)} m`;
            }
            /** Il tasto Registra è visibile se l'utente non l'ha nascosto (decisione G): la
             * preferenza assente vale «visibile». */
            function tastoRegistraVisibile() {
                return !(state.settings && state.settings.tastoRegistraVisibile === false);
            }
            /** Titolo e sottotitolo della testata della prova: «Prova N» e «Nome progetto · Comune». */
            function testiTestataProva() {
                const proj = state.projects && state.projects[state.currentProjectId];
                const h = state.header || {};
                const titolo = `Prova ${h.provaNr || '1'}`;
                const nome = (proj && proj.name) || '';
                const comune = h.comune || (proj && proj.comune) || '';
                const sotto = [nome, comune && comune !== nome ? comune : ''].filter(Boolean).join(' · ');
                return { titolo, sotto };
            }
            /** Le quattro spie sotto il titolo: GPS, foto, falda, note. Tre stati (vedi 03_regole-di-stile):
             * fatto, con quantità, non ancora. Mai rosso: una prova senza foto non è un errore. */
            function aggiornaSpieProva() {
                const imposta = (id, stato, testo, idTesto) => {
                    const el = document.getElementById(id);
                    if (!el) return;
                    el.classList.toggle('fatto', stato === 'fatto');
                    el.classList.toggle('non-ancora', stato === 'non-ancora');
                    const t = idTesto ? document.getElementById(idTesto) : null;
                    if (t && testo !== null) t.textContent = testo;
                };
                const h = state.header || {};
                const haGps = h.lat !== null && h.lat !== undefined && h.lat !== '' && h.lng !== null && h.lng !== undefined && h.lng !== '';
                imposta('btnGetGpsHeader', haGps ? 'fatto' : 'non-ancora', 'GPS', 'lblSpiaGps');
                const ico = document.getElementById('icoSpiaGps');
                if (ico) ico.innerHTML = `<use href="#i-${haGps ? 'check' : 'pin'}"/>`;
                const nFoto = (state.photos || []).length;
                imposta('btnOpenSurveyPhotosModal', nFoto > 0 ? 'quantita' : 'non-ancora', `${nFoto} foto`, 'photoBadgeStatus');
                const falda = parseFloat(h.faldaDa);
                document.getElementById('lblFaldaMenu').textContent = Number.isFinite(falda) ? `Falda: ${numeroConVirgola(falda)} m` : 'Falda: non impostata';
            }

            // Aggiornamento UI
            function updateUI() {
                if (ultimoConteggioMostrato !== null && ultimoConteggioMostrato !== state.currentCount) {
                    impulsoContatoreColpi();
                }
                ultimoConteggioMostrato = state.currentCount;
                lblBlowCount.textContent = state.currentCount;

                const stepM = state.settings.stepCm / 100;
                const endDepth = state.currentDepthStart + stepM;
                lblDepthRange.textContent = testoIntervallo(state.currentDepthStart, endDepth);
                {
                    const lblRegistra = document.getElementById('lblRegistraIntervallo');
                    if (lblRegistra) lblRegistra.textContent = `Registra ${testoIntervallo(state.currentDepthStart, endDepth)}`;
                }

                // Asta calcolata automaticamente in base allo step futuro
                state.currentRod = getRodForDepth(endDepth);
                lblCurrentRod.textContent = String(state.currentRod);
                if (lblTotalDepth) lblTotalDepth.textContent = state.currentDepthStart.toFixed(2);
                lblTotalSteps.textContent = `Registro · ${state.logs.length} ${state.logs.length === 1 ? 'intervallo' : 'intervalli'}`;
                // Anche quello del registro integrato, che nella vista Conta non si ridisegna.
                document.getElementById('lblIntegratedTotalSteps').textContent = lblTotalSteps.textContent;

                // Testata della prova (Fase 3): «Prova N» e sotto «Nome progetto · Comune».
                {
                    const testata = testiTestataProva();
                    lblSurveySummary.textContent = testata.titolo;
                    lblSurveySub.textContent = testata.sotto;
                }

                // Sync Inputs Cantiere
                txtCommittente.value = state.header.committente || '';
                // Questi due vivono sul progetto: leggerli dall'intestazione della prova
                // significherebbe doverli riscrivere a ogni verticale.
                {
                    const progettoCorrente = state.projects && state.projects[state.currentProjectId];
                    const txtNomeProgetto = document.getElementById('txtNomeProgetto');
                    // Non si riscrive mentre lo si sta digitando: updateUI parte a ogni tasto.
                    if (txtNomeProgetto && document.activeElement !== txtNomeProgetto) txtNomeProgetto.value = (progettoCorrente && progettoCorrente.name) || '';
                    if (txtProvincia) txtProvincia.value = (progettoCorrente && progettoCorrente.provincia) || '';
                    if (txtSedeCommittente) txtSedeCommittente.value = (progettoCorrente && progettoCorrente.sedeCommittente) || '';
                    if (txtDenominazioneIntervento) txtDenominazioneIntervento.value = (progettoCorrente && progettoCorrente.denominazioneIntervento) || '';
                }
                txtComune.value = state.header.comune || '';
                txtLocalita.value = state.header.localita || '';
                txtDataIndagine.value = state.header.date || new Date().toISOString().split('T')[0];
                txtProvaNr.value = state.header.provaNr || '1';
                numHeaderLunghAsta.value = state.instrument.lunghAsta !== undefined ? state.instrument.lunghAsta : 1.00;

                // Sync Inputs Strumento
                numPesoMassa.value = state.instrument.pesoMassa !== undefined ? state.instrument.pesoMassa : 63.50;
                numPesoAsta.value = state.instrument.pesoAsta !== undefined ? state.instrument.pesoAsta : 6.30;
                numLunghAsta.value = state.instrument.lunghAsta !== undefined ? state.instrument.lunghAsta : 1.00;
                numCambioAsta.value = state.instrument.cambioAsta !== undefined ? state.instrument.cambioAsta : 1.00;
                numPesoSistema.value = state.instrument.pesoSistema !== undefined ? state.instrument.pesoSistema : 8.00;
                numVolata.value = state.instrument.volata !== undefined ? state.instrument.volata : 0.75;
                numAreaPunta.value = state.instrument.areaPunta !== undefined ? state.instrument.areaPunta : 20;
                numAngoloPunta.value = state.instrument.angoloPunta !== undefined ? state.instrument.angoloPunta : 90;
                if (txtNomePenetrometro) txtNomePenetrometro.value = state.instrument.nomePenetrometro || '';
                if (txtRivestimentoFanghi) txtRivestimentoFanghi.value = state.instrument.rivestimentoFanghi || '';
                // Il coefficiente si ricalcola qui insieme al resto: apparirebbe fermo al valore
                // di un'altra prova se lo si aggiornasse solo mentre si digita.
                if (typeof aggiornaPannelloBetaT === 'function') aggiornaPannelloBetaT();

                // Spie di stato della prova: GPS, foto, falda (le foto anche da renderPhotoGallery).
                aggiornaSpieProva();

                // Sync Settings Drawer
                selPenetrometer.value = state.settings.penetrometer;
                selStepCm.value = state.settings.stepCm;
                chkHaptic.checked = state.settings.haptic;
                chkAudio.checked = state.settings.audio;
                chkWakeLock.checked = state.settings.wakeLock;
                chkDarkMode.checked = state.settings.darkMode;

                if (typeof syncThemeToggleLabel === 'function') syncThemeToggleLabel();

                // Tasto Registra (decisione G): visibile di default; se l'utente lo nasconde resta la
                // riga tratteggiata per rimetterlo. Sostituisce la «Modalità Espansa» (migrazione 2→3).
                {
                    const visibile = tastoRegistraVisibile();
                    const blocco = document.getElementById('directActionButtonsRow');
                    const riga = document.getElementById('rigaRegistraNascosto');
                    if (blocco) blocco.style.display = visibile ? 'flex' : 'none';
                    if (riga) riga.style.display = visibile ? 'none' : 'flex';
                    document.getElementById('chkTastoRegistra').checked = visibile;
                }

                // Theme Mode (chiaro/scuro) + Palette Colore (7 varianti, vedi THEME_HUES)
                if (state.settings.darkMode) {
                    document.documentElement.removeAttribute('data-theme');
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                }
                document.documentElement.setAttribute('data-hue', state.settings.themeHue || 'antracite');
                if (typeof renderThemeHuePicker === 'function') renderThemeHuePicker();

                // Toggle Vista Integrata vs Vista Separata Classica
                const isIntegrated = (state.settings.integratedChart !== false);
                const cardIntegratedRegister = document.getElementById('cardIntegratedRegister');
                const cardLogsTable = document.getElementById('cardLogsTable');
                const cardChart = document.getElementById('cardChart');

                // Registro e grafico: poche righe che scorrono, oppure tutte.
                {
                    const espanso = state.settings.registroEspanso === true;
                    document.getElementById('viewField').classList.toggle('registro-espanso', espanso);
                    document.querySelectorAll('.btn-espandi-registro').forEach(b => { b.textContent = espanso ? 'Mostra meno righe' : 'Mostra tutte le righe'; });
                }

                // Vista Conta | Registro (Fase 6).
                const inConta = vistaProva === 'conta' && !suPc();
                {
                    const btnConta = document.getElementById('btnVistaConta');
                    const btnRegistro = document.getElementById('btnVistaRegistro');
                    btnConta.setAttribute('aria-selected', String(inConta));
                    btnRegistro.setAttribute('aria-selected', String(!inConta));
                    btnRegistro.textContent = `Registro · ${state.logs.length}`;
                    cardCounterDashboard.style.display = inConta ? '' : 'none';
                    document.getElementById('cardUltimiIntervalli').style.display = inConta ? '' : 'none';
                    if (inConta) renderUltimiIntervalli();
                }

                if (cardIntegratedRegister && cardLogsTable && cardChart) {
                    if (inConta) {
                        cardIntegratedRegister.style.display = 'none';
                        cardLogsTable.style.display = 'none';
                        cardChart.style.display = 'none';
                    } else if (isIntegrated) {
                        cardIntegratedRegister.style.display = 'block';
                        cardLogsTable.style.display = 'none';
                        cardChart.style.display = 'none';
                        renderIntegratedLogsTable();
                    } else {
                        cardIntegratedRegister.style.display = 'none';
                        cardLogsTable.style.display = 'block';
                        cardChart.style.display = 'block';
                        renderLogsTable();
                        renderChart();
                    }
                } else {
                    renderLogsTable();
                    renderChart();
                }

                renderPhotoGallery();
                if (typeof renderSurveySwitcherBar === 'function') renderSurveySwitcherBar();

                // Pulsante "Riconoscimento Automatico Strati": visibile solo con almeno 2 intervalli
                const hasEnoughLogsForAutoStrati = state.logs && state.logs.length >= 2;
                const btnAutoStratiIntegratedEl = document.getElementById('btnAutoStratiIntegrated');
                const btnAutoStratiChartEl = document.getElementById('btnAutoStratiChart');
                if (btnAutoStratiIntegratedEl) btnAutoStratiIntegratedEl.style.display = hasEnoughLogsForAutoStrati ? '' : 'none';
                if (btnAutoStratiChartEl) btnAutoStratiChartEl.style.display = hasEnoughLogsForAutoStrati ? '' : 'none';
                aggiornaHintManiglieStratiGrafico(hasEnoughLogsForAutoStrati);
            }

            /** Testo/visibilità del suggerimento sopra il grafico: quando ci sono maniglie da
             * mostrare, invita a premere la matita se la modalità modifica è spenta, altrimenti
             * spiega come trascinarle — così il bottone a matita si scopre da solo la prima volta,
             * come richiesto esplicitamente ("far capire all'utente che premendolo può..."). */
            function aggiornaHintManiglieStratiGrafico(hasEnoughLogsForAutoStratiParam) {
                const hasEnoughLogs = hasEnoughLogsForAutoStratiParam !== undefined ? hasEnoughLogsForAutoStratiParam : (state.logs && state.logs.length >= 2);
                const lblDragHandlesHintEl = document.getElementById('lblDragHandlesHint');
                if (!lblDragHandlesHintEl) return;
                const hasHandles = hasEnoughLogs && getStratiBoundaryIndices().length > 0;
                lblDragHandlesHintEl.style.display = hasHandles ? 'flex' : 'none';
                lblDragHandlesHintEl.innerHTML = modalitaModificaStratiAttiva
                    ? `<svg class="ico"><use href="#i-move-y"/></svg> Trascina le maniglie sul lato destro del grafico per spostare manualmente il contatto tra due strati.`
                    : `<svg class="ico"><use href="#i-edit"/></svg> Premi la matita qui sopra per modificare manualmente i contatti tra strati trascinando le maniglie.`;
            }

            /** Colora il bottone a matita in accento pieno quando la modalità modifica strati è
             * attiva, come già fatto per "Anteprima pulita" nell'editor template: unico segnale di
             * stato per un bottone icona-soltanto. */
            function aggiornaBottoneModificaStratiGrafico() {
                const btn = document.getElementById('btnToggleModificaStratiGrafico');
                if (!btn) return;
                btn.classList.toggle('active', modalitaModificaStratiAttiva);
                btn.setAttribute('aria-pressed', String(modalitaModificaStratiAttiva));
                btn.style.background = modalitaModificaStratiAttiva ? 'var(--accent)' : '';
                btn.style.color = modalitaModificaStratiAttiva ? 'var(--on-accent)' : '';
                btn.style.borderColor = modalitaModificaStratiAttiva ? 'var(--accent)' : '';
            }
            const btnToggleModificaStratiGrafico = document.getElementById('btnToggleModificaStratiGrafico');
            if (btnToggleModificaStratiGrafico) {
                btnToggleModificaStratiGrafico.addEventListener('click', () => {
                    modalitaModificaStratiAttiva = !modalitaModificaStratiAttiva;
                    aggiornaBottoneModificaStratiGrafico();
                    aggiornaHintManiglieStratiGrafico();
                    renderChart();
                });
            }

            // RENDERING REGISTRO GRAFICO INTEGRATO (TABELLA + GRAFICO UNIFICATI PER RIGA)
            function renderIntegratedLogsTable() {
                const tblBody = document.getElementById('tblIntegratedLogsBody');
                const legendContainer = document.getElementById('integratedLegendContainer');
                const lblTotal = document.getElementById('lblIntegratedTotalSteps');
                if (!tblBody) return;

                if (lblTotal) lblTotal.textContent = `Registro · ${state.logs.length} ${state.logs.length === 1 ? 'intervallo' : 'intervalli'}`;

                const faldaDepth = state.header && state.header.faldaDa ? parseFloat(state.header.faldaDa) : null;

                // Render Legenda Strati Rapida
                if (legendContainer) {
                    legendContainer.innerHTML = '';
                    if (state.strati && state.strati.length > 0) {
                        state.strati.forEach(s => {
                            const badge = document.createElement('span');
                            badge.style.cssText = 'display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:600; color:var(--text-main);';
                            badge.innerHTML = `<span style="width:8px; height:8px; ${getPatternCss(s.pattern, s.color)} border-radius:3px; display:inline-block; border:1px solid rgba(0,0,0,0.2);"></span> ${s.name}`;
                            legendContainer.appendChild(badge);
                        });
                    }
                    // Quota Falda Badge se presente
                    if (faldaDepth !== null && !isNaN(faldaDepth)) {
                        const faldaBadge = document.createElement('span');
                        faldaBadge.style.cssText = 'display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:700; color:#2563eb; margin-left:auto; background:rgba(59,130,246,0.12); padding:1px 7px; border-radius:12px; border:1px solid rgba(59,130,246,0.3);';
                        faldaBadge.innerHTML = `${ico('droplet')} Falda ${numeroConVirgola(faldaDepth)} m`;
                        legendContainer.appendChild(faldaBadge);
                    }
                }

                if (!state.logs || state.logs.length === 0) {
                    tblBody.innerHTML = `
                        <div style="text-align:center; color:var(--text-muted); padding:20px; font-size:12px;">
                            Nessun intervallo registrato. Conta con <strong>+1 colpo</strong> e registra, oppure usa <strong>Aggiungi</strong>.
                        </div>
                    `;
                    return;
                }

                // Calcolo N max per ridimensionamento orizzontale dinamico (min 10)
                const maxN = Math.max(10, ...state.logs.map(l => (l && l.colpi) ? l.colpi : 0));

                const rodLen = parseFloat(state.instrument.lunghAsta || 1.00);

                // Se è stato appena richiesto un cambio prova, le barre partiranno da larghezza zero
                // e cresceranno animate verso il valore reale (vedi fondo funzione).
                const growAnim = pendingBarGrowAnim;

                tblBody.innerHTML = state.logs.map((log, idx) => {
                    if (!log) return '';

                    const startVal = (log.start !== undefined && log.start !== null) ? Number(log.start) : 0;
                    const endVal = (log.end !== undefined && log.end !== null) ? Number(log.end) : 0;
                    const colpiVal = (log.colpi !== undefined && log.colpi !== null) ? Number(log.colpi) : 0;

                    // Litologia effettiva per questo step
                    const litObj = (typeof getEffectiveLithology === 'function') ? (getEffectiveLithology(idx) || { color: '#f59e0b', name: 'Strato 1' }) : { color: '#f59e0b', name: 'Strato 1' };
                    // Vicini stesso strato: se il precedente/successivo hanno la STESSA litologia, tolgo lo
                    // spigolo condiviso cosi le celle si "toccano" a formare un'unica colonna stratigrafica
                    // continua, esattamente come la striscia litologica del grafico SVG.
                    const prevLit = idx > 0 ? getEffectiveLithology(idx - 1) : null;
                    const nextLit = idx < state.logs.length - 1 ? getEffectiveLithology(idx + 1) : null;
                    const sameAsPrev = prevLit && prevLit.id === litObj.id;
                    const sameAsNext = nextLit && nextLit.id === litObj.id;

                    const barWidthPct = Math.min(100, Math.max(6, (colpiVal / maxN) * 100));

                    const isBelowFalda = (faldaDepth !== null && !isNaN(faldaDepth) && endVal > faldaDepth);

                    // Note / Tag con Spillo
                    let noteMarkup = '';
                    if (log.note) {
                        noteMarkup = `<span style="font-size:12px; font-weight:700; color:#fff; display:inline-flex; align-items:center; gap:3px; white-space:nowrap; background:rgba(15,23,42,0.55); padding:1px 6px; border-radius:8px; margin-left:6px;" title="${log.note}"><svg class="ico"><use href="#i-note"/></svg> ${log.note}</span>`;
                    }

                    return `
                        <div class="swipe-row-wrapper" data-index="${idx}" style="border-bottom: 1px solid var(--border);">
                            <div class="riga-azioni"><button type="button" class="riga-azione-modifica">Modifica</button><button type="button" class="riga-azione-elimina">Elimina</button></div>
                            <div class="swipe-content" data-index="${idx}" style="grid-template-columns: 14% 12% 74%; padding: 0; min-height: 34px;">
                                <!-- Colonna Prof: lasciata vuota di proposito. Le quote di profondità
                                     vengono disegnate da renderIntegratedDepthLabels() in un overlay
                                     posizionato con le coordinate REALI delle righe, cosi ogni numero
                                     cade esattamente sulla linea di confine tra due strati, senza
                                     essere tagliato dal clipping dello swipe (overflow:hidden). -->
                                <div></div>
                                <div style="font-family:var(--font-mono); font-size:14px; font-weight:800; color:var(--accent); text-align:center; display:flex; align-items:center; justify-content:center; height:100%;">
                                    ${colpiVal}
                                </div>
                                <div style="position:relative; height:100%; min-height:34px; overflow:hidden;">
                                    <!-- Sfondo neutro della corsia (zona freatica evidenziata se sotto falda) -->
                                    <div style="position:absolute; inset:0; background:${isBelowFalda ? 'rgba(59,130,246,0.10)' : 'transparent'};"></div>
                                    <!-- BARRA LITOLOGICA: la larghezza rappresenta i colpi (si ferma al valore misurato),
                                         l'altezza è piena e i bordi verso righe con la STESSA litologia sono rimossi,
                                         cosi gli strati contigui si toccano come nel grafico SVG. -->
                                    <div class="int-bar-fill" data-target-w="${barWidthPct}" style="position:absolute; top:0; bottom:0; left:0; width:${growAnim ? 0 : barWidthPct}%;
                                        ${getPatternCss(litObj.pattern, litObj.color)}
                                        border-top:${sameAsPrev ? 'none' : '1px solid rgba(0,0,0,0.3)'};
                                        border-bottom:${sameAsNext ? 'none' : '1px solid rgba(0,0,0,0.3)'};
                                        border-right:1px solid rgba(0,0,0,0.35);
                                        box-shadow: 1px 0 3px rgba(0,0,0,0.25);
                                        transition: width var(--mov-medio) var(--ease-entra);
                                    "></div>
                                    <!-- Nota agganciata subito dopo la fine della barra -->
                                    <div style="position:absolute; top:0; bottom:0; left:${barWidthPct}%; display:flex; align-items:center; padding-left:6px; z-index:3; pointer-events:none;">
                                        ${noteMarkup}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');

                // Se richiesto (cambio prova), fa "crescere" le barre da zero al valore reale:
                // il doppio requestAnimationFrame garantisce che il browser abbia già disegnato
                // lo stato a larghezza 0 prima di applicare il valore finale, cosi la transizione
                // CSS ha davvero un "prima" da cui animare.
                if (growAnim) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            tblBody.querySelectorAll('.int-bar-fill').forEach(el => {
                                const t = el.getAttribute('data-target-w');
                                if (t !== null) el.style.width = t + '%';
                            });
                        });
                    });
                }

                tblBody.querySelectorAll('.swipe-content').forEach(el => collegaRigaRegistro(el, parseInt(el.getAttribute('data-index'))));

                renderIntegratedDepthLabels();
            }

            // Disegna le quote di profondità (e la linea/etichetta falda) come OVERLAY posizionato
            // sulle coordinate REALI delle righe (misurate con offsetTop/offsetHeight dopo il render),
            // invece che dentro ogni riga: cosi ogni numero cade esattamente sulla linea di confine
            // tra due strati, senza essere tagliato dal clipping usato per l'animazione di swipe
            // (overflow:hidden su .swipe-row-wrapper) e senza gli errori di arrotondamento che
            // capitavano quando la posizione della falda veniva approssimata all'inizio riga.
            function renderIntegratedDepthLabels() {
                const container = document.getElementById('tblIntegratedLogsBody');
                if (!container) return;
                container.querySelectorAll('.int-depth-overlay, .int-falda-overlay').forEach(el => el.remove());
                if (!state.logs || state.logs.length === 0) return;

                const rowWrappers = Array.from(container.querySelectorAll('.swipe-row-wrapper'));
                if (rowWrappers.length !== state.logs.length || !rowWrappers[0]) return;

                // Se il pannello non è attualmente visibile (es. è attiva la Vista Separata),
                // le misure di layout risultano tutte a zero: meglio non disegnare nulla piuttosto
                // che disegnare un overlay sbagliato. Verrà ridisegnato correttamente al prossimo
                // render utile, quando il pannello tornerà visibile.
                if (rowWrappers[0].offsetHeight === 0) return;

                container.style.position = 'relative';
                const rodLen = parseFloat(state.instrument.lunghAsta || 1.00);
                const faldaDepth = state.header && state.header.faldaDa ? parseFloat(state.header.faldaDa) : null;

                // ----- Overlay quote di profondità: una etichetta per ogni linea di confine -----
                const depthOverlay = document.createElement('div');
                depthOverlay.className = 'int-depth-overlay';
                depthOverlay.style.cssText = 'position:absolute; top:0; left:0; width:14%; height:100%; pointer-events:none; z-index:6;';

                function makeDepthLabel(depthVal, yPx, accentColor) {
                    const lbl = document.createElement('div');
                    lbl.style.cssText = `position:absolute; top:${yPx}px; left:8px; transform:translateY(-50%); font-size:12px; font-weight:800; line-height:1; white-space:nowrap; background:var(--bg-card); padding:1px 4px 1px 0; color:${accentColor};`;
                    // Fase 3: 12 px (era 10,5) e la virgola; i metri li dice la colonna «Prof. (m)».
                    lbl.textContent = numeroConVirgola(depthVal);
                    return lbl;
                }

                rowWrappers.forEach((rowEl, idx) => {
                    const startVal = Number(state.logs[idx].start) || 0;
                    const isRodChange = (startVal === 0 || (rodLen > 0 && Math.abs(startVal % rodLen) < 0.001));
                    depthOverlay.appendChild(makeDepthLabel(startVal, rowEl.offsetTop, isRodChange ? 'var(--accent)' : 'var(--text-main)'));
                });
                // Etichetta finale: fondo dell'ultimo intervallo (ultima linea di confine)
                const lastIdx = rowWrappers.length - 1;
                const lastLog = state.logs[lastIdx];
                const endVal = Number(lastLog.end) || 0;
                const isRodChangeEnd = (rodLen > 0 && Math.abs(endVal % rodLen) < 0.001);
                depthOverlay.appendChild(makeDepthLabel(endVal, rowWrappers[lastIdx].offsetTop + rowWrappers[lastIdx].offsetHeight, isRodChangeEnd ? 'var(--accent)' : 'var(--text-muted)'));

                container.appendChild(depthOverlay);

                // ----- Overlay Falda: linea + etichetta all'altezza ESATTA (proporzionale dentro
                // la riga giusta, non approssimata all'inizio riga) -----
                if (faldaDepth !== null && !isNaN(faldaDepth)) {
                    const rowIdx = state.logs.findIndex(l => l && faldaDepth >= l.start - 0.0005 && faldaDepth <= l.end + 0.0005);
                    if (rowIdx !== -1) {
                        const rowEl = rowWrappers[rowIdx];
                        const log = state.logs[rowIdx];
                        const span = (log.end - log.start) || 1;
                        const frac = Math.min(1, Math.max(0, (faldaDepth - log.start) / span));
                        const yPx = rowEl.offsetTop + frac * rowEl.offsetHeight;

                        const faldaOverlay = document.createElement('div');
                        faldaOverlay.className = 'int-falda-overlay';
                        faldaOverlay.style.cssText = 'position:absolute; top:0; left:0; width:100%; height:100%; pointer-events:none; z-index:7;';
                        faldaOverlay.innerHTML = `
                            <div style="position:absolute; top:${yPx}px; left:0; right:0; border-top:2px dashed var(--info);"></div>
                            <div style="position:absolute; top:${yPx}px; right:6px; transform:translateY(-50%); background:var(--info-soft); color:var(--info); border:1px solid rgba(59,130,246,0.4); padding:1px 7px; border-radius:9px; font-size:12px; font-weight:800; white-space:nowrap; display:inline-flex; align-items:center; gap:3px;">
                                ${ico('droplet')} Falda ${numeroConVirgola(faldaDepth)} m
                            </div>
                        `;
                        container.appendChild(faldaOverlay);
                    }
                }
            }

            // Ricalcola le etichette quando cambia la dimensione della finestra (es. rotazione
            // schermo) o quando l'altezza delle righe cambia per via della Modalità Guanti.
            window.addEventListener('resize', () => {
                if (typeof renderIntegratedDepthLabels === 'function') renderIntegratedDepthLabels();
            });

            // RICALCOLO PROFONDITA CONTINUA ED ASTE AUTOMATICHE
            function recalculateDepths() {
                const stepM = state.settings.stepCm / 100;
                let d = 0.0;
                state.logs.forEach(log => {
                    const prima = misuraDiIntervallo(log);
                    log.start = d;
                    log.end = d + stepM;
                    log.asta = getRodForDepth(log.end);
                    // Cambiare il passo sposta le profondità: per gli intervalli che cambiano è una
                    // modifica vera, e resta scritta (004d).
                    segnaIntervalloModificato(log, prima);
                    d += stepM;
                });
                state.currentDepthStart = d;
                state.currentRod = getRodForDepth(d + stepM);
            }

            // ELIMINAZIONE INTERVALLO (PRESERVA PROFONDITA E ASTE DEGLI ALTRI STEP)
            async function deleteLogStep(idx) {
                if (idx < 0 || idx >= state.logs.length) return;
                const item = state.logs[idx];

                // Conferma con la finestra dell'app (non il dialogo nativo del browser).
                // Dopo l'eliminazione resta comunque disponibile l'annullamento per 10 secondi.
                const ok = await appConfirmDelete(
                    `Eliminare l'intervallo ${item.start.toFixed(2)}m - ${item.end.toFixed(2)}m con ${item.colpi} colpi?` +
                    (item.note ? `\n\nNota associata: ${item.note}` : '')
                );
                if (!ok) return;

                // Rileggo l'indice: durante l'attesa della conferma lo stato potrebbe essere cambiato
                if (idx < 0 || idx >= state.logs.length) return;
                copiaPrimaDi('eliminare un intervallo');

                const backupItem = JSON.parse(JSON.stringify(state.logs[idx]));
                const backupDepth = state.currentDepthStart;
                const backupRod = state.currentRod;

                state.logs.splice(idx, 1);
                // NON ricalcoliamo gli altri step: ogni riga mantiene la sua profondità ed asta immutata
                if (state.logs.length > 0) {
                    const maxEnd = Math.max(...state.logs.map(l => l.end));
                    state.currentDepthStart = maxEnd;
                } else {
                    state.currentDepthStart = 0.0;
                }
                const stepM = state.settings.stepCm / 100;
                state.currentRod = getRodForDepth(state.currentDepthStart + stepM);
                triggerVibrate([80, 40, 80]);
                saveState();
                updateUI();
                closeModal();

                showUndoBanner(
                    `Intervallo ${backupItem.start.toFixed(2)}m - ${backupItem.end.toFixed(2)}m eliminato`,
                    () => {
                        state.logs.splice(idx, 0, backupItem);
                        state.currentDepthStart = backupDepth;
                        state.currentRod = backupRod;
                        saveState();
                        updateUI();
                    }
                );
            }

            // RENDERING TABELLA LOGS CON EDITING, CANCELLAZIONE E SWIPE INTERATTIVO (GIALLO EDIT / ROSSO ELIMINA)
            function renderLogsTable() {
                if (!tblLogsBody) return;
                if (!state.logs || state.logs.length === 0) {
                    tblLogsBody.innerHTML = `
                        <tr>
                            <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 20px;">
                                Nessun intervallo registrato. Premi +1 per iniziare!
                            </td>
                        </tr>`;
                    return;
                }

                // Nspt/Nspt'/Rpd calcolati una sola volta per tutti gli intervalli (stessa
                // funzione già usata da report/export, vedi arricchisciLogsConNsptRpd), poi
                // mostrati al posto delle Note — quasi sempre vuote qui — che restano comunque
                // consultabili aprendo la scheda dettaglio con un tocco sulla riga.
                const faldaAttuale = faldaDaHeader(state.header);
                const logsCalc = arricchisciLogsConNsptRpd(state.logs, state.instrument, state.settings.stepCm, faldaAttuale);

                tblLogsBody.innerHTML = logsCalc.map((log, actualIdx) => {
                    const startVal = (log && log.start !== undefined && log.start !== null) ? Number(log.start) : 0;
                    const endVal = (log && log.end !== undefined && log.end !== null) ? Number(log.end) : 0;
                    const colpiVal = (log && log.colpi !== undefined && log.colpi !== null) ? log.colpi : 0;

                    return `
                        <tr>
                            <td colspan="5" style="padding:0; border:none;">
                                <div class="swipe-row-wrapper" data-index="${actualIdx}">
                                    <div class="riga-azioni"><button type="button" class="riga-azione-modifica">Modifica</button><button type="button" class="riga-azione-elimina">Elimina</button></div>
                                    <div class="swipe-content" data-index="${actualIdx}">
                                        <div style="font-family: var(--font-mono); font-weight: 600;">${startVal.toFixed(2)} - ${endVal.toFixed(2)}m</div>
                                        <div style="font-family: var(--font-mono); font-size: 16px; font-weight: 800; color: var(--accent);">${colpiVal}</div>
                                        <div class="col-nspt-value">${fmtIT(log.nsptGrezzo, 1)}</div>
                                        <div class="col-nspt-value">${fmtIT(log.nsptFalda, 1)}</div>
                                        <div class="col-nspt-value" style="color: var(--success); font-weight: 700;">${fmtIT(log.rpd, 1)}</div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    `;
                }).join('');

                tblLogsBody.querySelectorAll('.swipe-content').forEach(el => collegaRigaRegistro(el, parseInt(el.getAttribute('data-index'))));
            }

            // LE RIGHE DEL REGISTRO (Fase 6, punto 3), uguali nelle due viste del registro. Un tocco
            // apre la scheda dell'intervallo, già modificabile. Scorrendo a sinistra la riga resta
            // aperta e mostra Modifica ed Elimina; un tocco sulla riga la richiude. Non c'è più
            // «scorri a destra = elimina»: bastava un gesto un po' largo per cancellare un intervallo.
            const LARGHEZZA_AZIONI_RIGA = 176;
            function chiudiRigheAperte(tranne) {
                document.querySelectorAll('.swipe-row-wrapper.azioni-aperte').forEach(w => {
                    if (w === tranne) return;
                    w.classList.remove('azioni-aperte');
                    const c = w.querySelector('.swipe-content');
                    if (c) c.style.transform = '';
                });
            }
            function collegaRigaRegistro(contentEl, idx) {
                const wrapperEl = contentEl.closest('.swipe-row-wrapper');
                let startX = 0, startY = 0, diffX = 0, diffY = 0, base = 0;
                contentEl.addEventListener('touchstart', (e) => {
                    startX = e.touches[0].clientX;
                    startY = e.touches[0].clientY;
                    diffX = 0;
                    diffY = 0;
                    base = wrapperEl.classList.contains('azioni-aperte') ? -LARGHEZZA_AZIONI_RIGA : 0;
                    contentEl.style.transition = 'none';
                }, { passive: true });
                contentEl.addEventListener('touchmove', (e) => {
                    diffX = e.touches[0].clientX - startX;
                    diffY = e.touches[0].clientY - startY;
                    if (Math.abs(diffX) > Math.abs(diffY)) {
                        contentEl.style.transform = `translateX(${Math.max(-LARGHEZZA_AZIONI_RIGA, Math.min(0, base + diffX))}px)`;
                    }
                }, { passive: true });
                contentEl.addEventListener('touchend', () => {
                    contentEl.style.transition = 'transform var(--mov-medio) var(--ease-entra)';
                    if (Math.abs(diffX) < 10 && Math.abs(diffY) < 10) return; // un tocco: lo gestisce il click
                    // Scorrendo in verticale la riga resta com'era; in orizzontale si apre oltre metà corsa.
                    const aperta = Math.abs(diffX) > Math.abs(diffY) ? base + diffX < -LARGHEZZA_AZIONI_RIGA / 2 : base !== 0;
                    if (aperta) chiudiRigheAperte(wrapperEl);
                    if (aperta && base === 0) triggerVibrate(20);
                    wrapperEl.classList.toggle('azioni-aperte', aperta);
                    contentEl.style.transform = aperta ? `translateX(-${LARGHEZZA_AZIONI_RIGA}px)` : '';
                });
                contentEl.addEventListener('click', () => {
                    if (Math.abs(diffX) >= 10 || Math.abs(diffY) >= 10) return;
                    const eraAperta = wrapperEl.classList.contains('azioni-aperte');
                    chiudiRigheAperte();
                    if (!eraAperta) openEditModal(idx, { senzaTastiera: !suPc() });
                });
                wrapperEl.querySelector('.riga-azione-modifica').addEventListener('click', () => { chiudiRigheAperte(); openEditModal(idx); });
                wrapperEl.querySelector('.riga-azione-elimina').addEventListener('click', () => { chiudiRigheAperte(); deleteLogStep(idx); });
            }

            // RENDERING GRAFICO PROFILO IN TEMPO REALE CON LEGENDA VISIVA DINAMICA
            function renderChart() {
                const chartLegendContainer = document.getElementById('chartLegendContainer');
                if (!svgChart) return;
                
                if (state.logs.length === 0) {
                    svgChart.setAttribute('height', '180');
                    svgChart.setAttribute('viewBox', '0 0 320 180');
                    svgChart.innerHTML = `<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-size="12">Diagramma colpi vuoto - Inizia la prova</text>`;
                    if (chartLegendContainer) {
                        chartLegendContainer.innerHTML = `<span style="color: var(--text-muted); font-size: 11px;"><svg class="ico"><use href="#i-note"/></svg> Legenda Grafico: Inizia la prova per mostrare litologie e falda</span>`;
                    }
                    return;
                }

                // 1. POPOLA LA LEGENDA HTML ESTERNA (INTERATTIVA)
                // Niente più etichetta "LEGENDA:" davanti ai badge (ridondante: si capisce da
                // sé cosa sono) e badge più compatti — meno padding, testo più piccolo.
                if (chartLegendContainer) {
                    let legendHtml = '';

                    // Ottieni solo gli strati effettivamente utilizzati nei log della prova corrente
                    const usedLitIds = new Set(state.logs.map((l, idx) => getEffectiveLithology(idx).id));
                    const usedStrati = state.strati.filter(s => usedLitIds.has(s.id));

                    (usedStrati.length > 0 ? usedStrati : state.strati.slice(0, 1)).forEach(s => {
                        legendHtml += `
                            <div style="display: flex; align-items: center; gap: 4px; background: var(--bg-card-hover); padding: 2px 6px; border-radius: 4px; border: 1px solid var(--border);">
                                <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; ${getPatternCss(s.pattern, s.color)} border: 1px solid rgba(255,255,255,0.4);"></span>
                                <span style="color: var(--text-main); font-weight: 600;">${s.name}</span>
                            </div>
                        `;
                    });

                    // Indicatore Falda
                    if (state.header.faldaDa !== null && state.header.faldaDa !== undefined && state.header.faldaDa !== '') {
                        legendHtml += `
                            <div style="display: flex; align-items: center; gap: 4px; background: var(--info-soft); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(59, 130, 246, 0.4);">
                                <span style="display: inline-block; width: 12px; height: 0; border-top: 2px dashed var(--info);"></span>
                                <span style="color: var(--info); font-weight: 700;"><svg class="ico" style="width:11px; height:11px;"><use href="#i-droplet"/></svg> Falda @ ${state.header.faldaDa}m</span>
                            </div>
                        `;
                    }

                    // Indicatore Colpi N
                    legendHtml += `
                        <div style="display: flex; align-items: center; gap: 4px; background: rgba(245, 158, 11, 0.12); padding: 2px 6px; border-radius: 4px; border: 1px solid rgba(245, 158, 11, 0.3);">
                            <span style="display: inline-block; width: 8px; height: 8px; border-radius: 2px; background: var(--accent);"></span>
                            <span style="color: var(--accent); font-weight: 700;">Colpi N</span>
                        </div>
                    `;

                    chartLegendContainer.innerHTML = legendHtml;
                }

                // 2. DISAGNA IL GRAFICO SVG IN TEMPO REALE
                const width = Math.max(300, (svgChart.clientWidth || 320));
                const padL = 48, padR = 34, padT = 20, padB = 30;
                const stepM = (state.settings.stepCm || 20) / 100;
                
                const maxDepth = Math.max(...state.logs.map(l => l.end), 1.0);
                const maxColpi = Math.max(...state.logs.map(l => l.colpi), 30);
                
                // ALTEZZA DINAMICA: 28px per ogni step (es. 20cm), estensione verso il basso
                const totalSteps = Math.ceil(maxDepth / stepM);
                const pxPerStep = 28;
                const height = Math.max(240, padT + padB + (totalSteps * pxPerStep));

                svgChart.setAttribute('height', height);
                svgChart.setAttribute('viewBox', `0 0 ${width} ${height}`);

                const xScale = (c) => padL + (c / maxColpi) * (width - padL - padR);
                const yScale = (d) => padT + (d / maxDepth) * (height - padT - padB);

                // Se è stato appena richiesto un cambio prova, le barre dell'istogramma partiranno da
                // larghezza minima e cresceranno animate verso il valore reale (vedi fondo funzione).
                const growAnim = pendingBarGrowAnim;

                let chartHtml = '';

                // DEFINIZIONI PATTERN SVG (uno per ogni litologia effettivamente usata negli step)
                // così le barre del grafico mostrano lo stesso pattern visivo della tabella/legenda.
                const litIdsUsedInChart = new Set(state.logs.map((l, idx) => getEffectiveLithology(idx).id));
                let defsHtml = '<defs>';
                litIdsUsedInChart.forEach(litId => {
                    const litForDef = getStratoById(litId);
                    if (litForDef) {
                        defsHtml += getSvgPatternDef(litForDef.pattern || 'none', `svgpat-${litForDef.id}`, litForDef.color);
                    }
                });
                defsHtml += '</defs>';
                chartHtml += defsHtml;

                // STRISCIA LITOLOGIA SINISTRA (5px bordino colorato per litologia attiva)
                let currentLitStart = 0;
                let currentLitKey = null;
                const litStripes = [];
                state.logs.forEach((log, idx) => {
                    if (log.lithology && log.lithology !== currentLitKey) {
                        if (currentLitKey !== null) {
                            litStripes.push({ start: currentLitStart, end: log.start, key: currentLitKey });
                        }
                        currentLitKey = log.lithology;
                        currentLitStart = log.start;
                    }
                    if (idx === state.logs.length - 1 && currentLitKey) {
                        litStripes.push({ start: currentLitStart, end: log.end, key: currentLitKey });
                    }
                });

                // GRIGLIA ORIZZONTALE FITTA AD OGNI PASSO (es. ogni 20cm o 10cm)
                for (let d = 0; d <= maxDepth + 0.001; d += stepM) {
                    const y = yScale(d);
                    const isMeter = Math.abs(d % 1.0) < 0.01;
                    const strokeColor = isMeter ? 'var(--border-strong)' : 'var(--border)';
                    const strokeWidth = isMeter ? '1.2' : '0.8';

                    chartHtml += `<line x1="${padL}" y1="${y}" x2="${width - padR}" y2="${y}" stroke="${strokeColor}" stroke-width="${strokeWidth}" stroke-dasharray="${isMeter ? 'none' : '2 2'}"/>`;
                    
                    // Etichetta Profondità a sinistra ad ogni maglia
                    const labelColor = isMeter ? 'var(--accent)' : 'var(--text-muted)';
                    const labelWeight = isMeter ? '700' : '400';
                    chartHtml += `<text x="${padL - 6}" y="${y + 3}" font-size="10" font-family="var(--font-mono)" font-weight="${labelWeight}" fill="${labelColor}" text-anchor="end">${d.toFixed(2)}m</text>`;
                }

                // GRIGLIA VERTICALE COLPI (ogni 5 o 10 colpi)
                const blowStep = maxColpi > 40 ? 10 : 5;
                for (let c = 0; c <= maxColpi; c += blowStep) {
                    const x = xScale(c);
                    chartHtml += `<line x1="${x}" y1="${padT}" x2="${x}" y2="${height - padB}" stroke="var(--border)" stroke-dasharray="2 2"/>`;
                    chartHtml += `<text x="${x}" y="${height - 10}" font-size="9" fill="var(--text-muted)" text-anchor="middle">${c}</text>`;
                }

                // STRISCE LITOLOGIA (bordo sinistro colorato 6px)
                litStripes.forEach(stripe => {
                    const lit = getStratoById(stripe.key);
                    if (!lit) return;
                    const y1 = yScale(stripe.start);
                    const y2 = yScale(stripe.end);
                    chartHtml += `<rect x="${padL - 6}" y="${y1}" width="6" height="${y2 - y1}" fill="${lit.color}" opacity="0.85" rx="2"/>`;
                });

                // ASSI
                chartHtml += `
                    <line x1="${padL}" y1="${padT}" x2="${padL}" y2="${height - padB}" stroke="var(--border-strong)" stroke-width="1.5"/>
                    <line x1="${padL}" y1="${height - padB}" x2="${width - padR}" y2="${height - padB}" stroke="var(--border-strong)" stroke-width="1.5"/>
                    <text x="${width - padR}" y="${height - 10}" font-size="10" font-weight="700" fill="var(--accent)" text-anchor="end">Colpi (N)</text>
                `;

                // ISTOGRAMMA PENETROMETRICO A RETTANGOLI COLORATI PER LITOLOGIA
                state.logs.forEach((log, idx) => {
                    const yStart = yScale(log.start);
                    const yEnd = yScale(log.end);
                    const barHeight = Math.max(6, yEnd - yStart - 2);
                    const barWidth = Math.max(3, xScale(log.colpi) - padL);
                    const litObj = getEffectiveLithology(idx);
                    const barFill = `url(#svgpat-${litObj.id})`;

                    chartHtml += `
                        <g class="chart-bar-group" data-index="${idx}" style="cursor: pointer;">
                            <rect x="${padL}" y="${yStart + 1}" width="${growAnim ? 3 : barWidth}" height="${barHeight}" data-target-w="${barWidth}"
                                  fill="${barFill}" fill-opacity="0.92" stroke="${litObj.color}" stroke-width="1.2" rx="3" ry="3" class="chart-rect-bar">
                                <title>Intervallo ${log.start.toFixed(2)}m - ${log.end.toFixed(2)}m: ${log.colpi} colpi | Litologia: ${litObj.name} (Tocca per dettaglio)</title>
                            </rect>
                            <text x="${padL + barWidth + 6}" y="${yStart + (barHeight / 2) + 4}" font-size="10" font-weight="800" font-family="var(--font-mono)" fill="var(--text-main)">${log.colpi}</text>
                    `;

                    if (log.note) {
                        const noteTag = log.note.split(',')[0];
                        chartHtml += `<text x="${padL + barWidth + 30}" y="${yStart + (barHeight / 2) + 4}" font-size="9" font-weight="700" fill="var(--warning)"><svg class="ico"><use href="#i-note"/></svg> ${noteTag}</text>`;
                    }

                    chartHtml += `</g>`;
                });

                // FALDA: linea tratteggiata blu orizzontale con etichetta da faldaDa a fondo
                if (state.header.faldaDa !== null && state.header.faldaDa !== undefined && state.header.faldaDa !== '') {
                    const faldaDepth = parseFloat(state.header.faldaDa);
                    if (!isNaN(faldaDepth) && faldaDepth <= maxDepth) {
                        const yFalda = yScale(faldaDepth);
                        // Rettangolo ombreggiatura zona falda (pointer-events:none per non bloccare i click sulle barre)
                        chartHtml += `<rect x="${padL}" y="${yFalda}" width="${width - padL - padR}" height="${height - padB - yFalda}" fill="var(--info-soft)" rx="0" pointer-events="none"/>`;
                        // Linea orizzontale falda
                        chartHtml += `<line x1="${padL}" y1="${yFalda}" x2="${width - padR}" y2="${yFalda}" stroke="var(--info)" stroke-width="2" stroke-dasharray="8 4" pointer-events="none"/>`;
                        // Etichetta falda
                        chartHtml += `<text x="${padL + 6}" y="${yFalda - 4}" font-size="10" font-weight="700" fill="var(--info)" pointer-events="none"><svg class="ico"><use href="#i-droplet"/></svg> Falda @ ${faldaDepth.toFixed(2)}m</text>`;
                    }
                }

                // MANIGLIE TRASCINABILI PER SPOSTARE I CONTATTI TRA STRATI (lato destro del grafico)
                // Area di tocco reale molto più ampia del segno visibile, per un drag comodo anche
                // su schermi touch piccoli (il cerchio visibile resta piccolo per non ingombrare).
                // Attive (trascinabili) SOLO in modalità modifica (vedi btnToggleModificaStratiGrafico
                // / modalitaModificaStratiAttiva): altrimenti restano visibili come riferimento ma
                // spente — pointer-events:none sul gruppo disabilita anche il cerchio di presa più
                // grande al suo interno (eredita da qui, non ha un proprio pointer-events), niente
                // trascinamenti accidentali mentre si scorre/tocca il grafico per altri motivi.
                const boundaryIndicesForHandles = getStratiBoundaryIndices();
                boundaryIndicesForHandles.forEach(bIdx => {
                    const yH = yScale(state.logs[bIdx].start);
                    const hx = width - padR + 14;
                    chartHtml += `
                        <g class="strati-drag-handle" data-boundary-idx="${bIdx}" data-orig-y="${yH}" style="cursor: ${modalitaModificaStratiAttiva ? 'ns-resize' : 'default'}; touch-action: none; opacity: ${modalitaModificaStratiAttiva ? '1' : '0.4'}; pointer-events: ${modalitaModificaStratiAttiva ? 'auto' : 'none'};">
                            <line x1="${padL}" y1="${yH}" x2="${width - padR}" y2="${yH}" stroke="var(--purple)" stroke-width="1.5" stroke-dasharray="5 3" opacity="0.85" pointer-events="none"/>
                            <circle cx="${hx}" cy="${yH}" r="24" fill="var(--purple)" opacity="0.001"/>
                            <circle cx="${hx}" cy="${yH}" r="13" fill="var(--purple)" stroke="#fff" stroke-width="2" pointer-events="none"/>
                            <text x="${hx}" y="${yH + 4}" font-size="13" fill="#fff" text-anchor="middle" pointer-events="none" font-weight="800">⇕</text>
                        </g>
                    `;
                });

                svgChart.innerHTML = chartHtml;

                // Se richiesto (cambio prova), fa "crescere" le barre dell'istogramma dal valore minimo
                // al valore reale: doppio requestAnimationFrame per garantire che il browser disegni
                // prima lo stato iniziale, cosi la transizione CSS su .chart-rect-bar ha un "prima" da cui animare.
                if (growAnim) {
                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => {
                            svgChart.querySelectorAll('.chart-rect-bar').forEach(el => {
                                const t = el.getAttribute('data-target-w');
                                if (t !== null) el.setAttribute('width', t);
                            });
                        });
                    });
                }

                // Bind click sui rettangoli del grafico per aprire la Scheda Dettaglio Intervallo
                svgChart.querySelectorAll('.chart-bar-group').forEach(group => {
                    group.addEventListener('click', (e) => {
                        const idx = parseInt(group.getAttribute('data-index'));
                        openEditModal(idx, { senzaTastiera: !suPc() });
                    });
                });

                // Bind avvio trascinamento sulle maniglie contatto strati
                svgChart.querySelectorAll('.strati-drag-handle').forEach(handle => {
                    handle.addEventListener('pointerdown', (e) => {
                        // Difesa in profondità: pointer-events:none sul gruppo (impostato sopra
                        // quando la modalità modifica è spenta) già impedisce che questo evento
                        // scatti, ma un controllo esplicito qui evita sorprese in caso di eventi
                        // "vecchi" ancora in coda durante il toggle del bottone a matita.
                        if (!modalitaModificaStratiAttiva) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const boundaryIdx = parseInt(handle.getAttribute('data-boundary-idx'));
                        const origY = parseFloat(handle.getAttribute('data-orig-y'));
                        const allBoundaries = getStratiBoundaryIndices();
                        const posInList = allBoundaries.indexOf(boundaryIdx);
                        const minIdx = posInList > 0 ? allBoundaries[posInList - 1] + 1 : 1;
                        const maxIdx = posInList < allBoundaries.length - 1 ? allBoundaries[posInList + 1] - 1 : state.logs.length - 1;

                        dragStratiState = {
                            active: true,
                            originalIdx: boundaryIdx,
                            currentSnapIdx: boundaryIdx,
                            minIdx: Math.max(1, minIdx),
                            maxIdx: Math.min(state.logs.length - 1, maxIdx),
                            origY: origY,
                            svgHeight: height,
                            handleEl: handle,
                            logYPositions: state.logs.map((l, i) => ({ idx: i, y: yScale(l.start) }))
                        };
                        try { handle.setPointerCapture(e.pointerId); } catch (err) { ignoraErrore('renderChart', err); }
                    });
                });
            }

            // Trascinamento maniglie contatto strati: listener globali (indipendenti dal re-render del grafico)
            document.addEventListener('pointermove', (e) => {
                if (!dragStratiState || !dragStratiState.active || !svgChart) return;
                const rect = svgChart.getBoundingClientRect();
                if (!rect.height) return;
                const scaleY = dragStratiState.svgHeight / rect.height;
                const svgY = (e.clientY - rect.top) * scaleY;

                let best = dragStratiState.minIdx;
                let bestDist = Infinity;
                dragStratiState.logYPositions.forEach(p => {
                    if (p.idx < dragStratiState.minIdx || p.idx > dragStratiState.maxIdx) return;
                    const d = Math.abs(p.y - svgY);
                    if (d < bestDist) { bestDist = d; best = p.idx; }
                });
                dragStratiState.currentSnapIdx = best;

                const snappedPos = dragStratiState.logYPositions.find(p => p.idx === best);
                if (snappedPos && dragStratiState.handleEl) {
                    dragStratiState.handleEl.setAttribute('transform', `translate(0, ${snappedPos.y - dragStratiState.origY})`);
                }
            });

            document.addEventListener('pointerup', () => {
                if (!dragStratiState || !dragStratiState.active) return;
                const { originalIdx, currentSnapIdx } = dragStratiState;
                dragStratiState = null;
                if (currentSnapIdx !== originalIdx) {
                    moveStratiBoundary(originalIdx, currentSnapIdx);
                    saveState();
                    triggerVibrate(30);
                }
                updateUI();
            });

            // GESTIONE EVENTI TOUCH
            function eseguiPiuUnColpo() {
                state.currentCount++;
                triggerVibrate(100);
                playBeep(800, 0.04);
                updateUI();
                saveState();
            }
            if (btnPlus) btnPlus.addEventListener('click', eseguiPiuUnColpo);
            // Scorciatoia +1 sempre raggiungibile anche a contatore compresso (vedi maniglia/lucchetto sotto).

            if (btnMinus) btnMinus.addEventListener('click', () => {
                if (state.currentCount > 0) {
                    state.currentCount--;
                    triggerVibrate([30, 40, 30]);
                    playBeep(400, 0.06);
                    updateUI();
                    saveState();
                }
            });

            // NOTE RAPIDE TAGS CON CONFERMA
            document.querySelectorAll('.btn-tag[data-note]').forEach(tagBtn => {
                tagBtn.addEventListener('click', async (e) => {
                    const noteText = e.currentTarget.getAttribute('data-note');
                    if (state.logs.length === 0) {
                        alert('Esegui prima un intervallo per applicare la nota!');
                        return;
                    }
                    if (await appConfirm(`Vuoi aggiungere la nota "${noteText}" a questo intervallo?`)) {
                        const last = state.logs[state.logs.length - 1];
                        last.note = last.note ? `${last.note}, ${noteText}` : noteText;
                        segnaIntervalloModificato(last);
                        triggerVibrate(30);
                        updateUI();
                        saveState();
                    }
                });
            });

            // MODAL DETTAGLIO SCHEDA INTERVALLO (READ-ONLY)
            let viewingIndex = -1;

            function openViewModal(idx) {
                if (idx < 0 || idx >= state.logs.length) return;
                viewingIndex = idx;
                const item = state.logs[idx];
                lblViewStepNum.textContent = `#${idx + 1}`;
                txtViewStart.value = item.start.toFixed(2);
                txtViewEnd.value = item.end.toFixed(2);
                txtViewColpi.value = item.colpi;
                txtViewAsta.value = `Asta N° ${item.asta}`;
                txtViewNote.value = item.note || '-';

                // Litologia effettiva (con ereditarietà)
                const litObj = getEffectiveLithology(idx);
                if (txtViewLithology) {
                    txtViewLithology.value = litObj ? litObj.name : '-';
                    if (txtViewLithology) txtViewLithology.style.background = litObj ? litObj.color + '33' : '';
                }

                // Calcolo Rpd istantaneo per la scheda
                const M = parseFloat(state.instrument.pesoMassa || 63.50);
                const H = parseFloat(state.instrument.volata || 0.75) * 100;
                const A = parseFloat(state.instrument.areaPunta || 20);
                const deltaS = parseFloat(state.settings.stepCm || 20);
                const pesoAsta = parseFloat(state.instrument.pesoAsta || 6.30);
                const pesoSistema = parseFloat(state.instrument.pesoSistema || 8.00);
                const M_prime = (item.asta * pesoAsta) + pesoSistema;
                if (item.colpi > 0) {
                    const rpd = (M * M * H * item.colpi) / (A * deltaS * (M + M_prime));
                    txtViewRpd.value = `${rpd.toFixed(2)} kg/cm²`;
                } else {
                    txtViewRpd.value = '-';
                }

                modalViewOverlay.classList.add('open');
                modalViewStep.classList.add('open');
            }

            function closeViewModal() {
                modalViewOverlay.classList.remove('open');
                modalViewStep.classList.remove('open');
                viewingIndex = -1;
            }

            if (btnViewClose) btnViewClose.addEventListener('click', closeViewModal);
            if (modalViewOverlay) modalViewOverlay.addEventListener('click', closeViewModal);

            if (btnViewSwitchToEdit) {
                btnViewSwitchToEdit.addEventListener('click', () => {
                    const idx = viewingIndex;
                    closeViewModal();
                    if (idx >= 0) openEditModal(idx);
                });
            }

            // HANDLERS NOTA PERSONALIZZATA
            if (btnCustomNote) {
                btnCustomNote.addEventListener('click', () => {
                    txtCustomNoteInput.value = '';
                    modalCustomNoteOverlay.classList.add('open');
                    modalCustomNote.classList.add('open');
                    setTimeout(() => txtCustomNoteInput.focus(), 100);
                });
            }

            function closeCustomNoteModal() {
                modalCustomNoteOverlay.classList.remove('open');
                modalCustomNote.classList.remove('open');
            }

            if (btnCustomNoteCancel) btnCustomNoteCancel.addEventListener('click', closeCustomNoteModal);
            if (modalCustomNoteOverlay) modalCustomNoteOverlay.addEventListener('click', closeCustomNoteModal);

            if (btnCustomNoteSave) {
                btnCustomNoteSave.addEventListener('click', () => {
                    const customText = txtCustomNoteInput.value.trim();
                    if (customText) {
                        if (state.logs.length > 0) {
                            const last = state.logs[state.logs.length - 1];
                            last.note = last.note ? `${last.note}, ${customText}` : customText;
                            segnaIntervalloModificato(last);
                        } else {
                            alert('Esegui prima un intervallo per applicare la nota!');
                        }
                    }
                    triggerVibrate(30);
                    saveState();
                    updateUI();
                    closeCustomNoteModal();
                });
            }

            // CONFERMA STEP & AVANTI
            // =========================================================================
            async function confirmAndNextStep() {
                let finalCount = state.currentCount;

                const stepM = state.settings.stepCm / 100;
                const endDepth = state.currentDepthStart + stepM;
                const rodNum = getRodForDepth(endDepth);
                
                state.logs.push(nuovoIntervallo({
                    start: state.currentDepthStart,
                    end: endDepth,
                    colpi: finalCount,
                    asta: rodNum,
                    note: ''
                }, 'contatore'));

                state.currentDepthStart = endDepth;
                state.currentCount = 0;
                state.currentRod = getRodForDepth(endDepth + stepM);

                triggerVibrate([50, 50, 100]);
                playBeep(1000, 0.08);

                updateUI();
                saveState();

                // Toast (Fase 3): cosa si è appena registrato, con «Annulla» che toglie proprio
                // quell'intervallo (vedi annullaRegistrazione).
                const registrato = state.logs[state.logs.length - 1];
                if (typeof mostraToast === 'function') {
                    mostraToast(`Registrato ${testoIntervallo(registrato.start, registrato.end)} · ${registrato.colpi} ${registrato.colpi === 1 ? 'colpo' : 'colpi'}`,
                        { azione: { etichetta: 'Annulla', fn: () => annullaRegistrazione(registrato) } });
                }
            }

            /** Toglie l'ultimo intervallo e riporta il contatore su di lui (profondità e colpi), come
             * ha sempre fatto ANNULLA STEP. Senza domande: chi chiama ha già deciso. Ritorna
             * l'intervallo tolto, o null se non c'era niente. Si può rifare: i colpi tornano nel
             * contatore e basta registrare di nuovo. */
            function togliUltimoIntervallo() {
                if (!state.logs || state.logs.length === 0) return null;
                const last = state.logs.pop();
                state.currentDepthStart = last.start;
                state.currentCount = last.colpi;
                state.currentRod = getRodForDepth(state.currentDepthStart + (state.settings.stepCm / 100));
                triggerVibrate([80, 40, 80]);
                updateUI();
                saveState();
                return last;
            }

            /** «Annulla» del toast: toglie PROPRIO l'intervallo appena registrato, e solo se è ancora
             * l'ultimo e nel contatore non si è ancora contato niente del successivo. Altrimenti non
             * tocca niente e lo dice: annullare «l'ultimo» a quel punto toglierebbe un altro
             * intervallo, o perderebbe i colpi già contati. */
            function annullaRegistrazione(intervallo) {
                const ultimo = state.logs && state.logs[state.logs.length - 1];
                if (!intervallo || ultimo !== intervallo || state.currentCount !== 0) {
                    if (typeof mostraToast === 'function') mostraToast('Non annullato: dopo la registrazione è cambiato qualcosa. Tieni premuto −1 per annullare l\'ultimo intervallo');
                    return false;
                }
                togliUltimoIntervallo();
                if (typeof mostraToast === 'function') mostraToast(`Annullato: ${testoIntervallo(intervallo.start, intervallo.end)} torna nel contatore con ${intervallo.colpi} ${intervallo.colpi === 1 ? 'colpo' : 'colpi'}`);
                return true;
            }

            // ANNULLA ULTIMO STEP
            async function undoLastStep() {
                if (state.logs.length === 0) return;
                const ok = await appConfirmDelete('Vuoi annullare l\'ultimo intervallo registrato?');
                if (!ok) return;
                togliUltimoIntervallo();
            }

            // FINESTRA FLUTTUANTE MODALE GPS (RILEVAMENTO AUTOMATICO E IMMISSIONE MANUALE)
            const modalGpsOverlay = document.getElementById('modalGpsOverlay');
            const modalGpsSettings = document.getElementById('modalGpsSettings');
            const numModalGpsLat = document.getElementById('numModalGpsLat');
            const numModalGpsLng = document.getElementById('numModalGpsLng');
            const txtPasteCoords = document.getElementById('txtPasteCoords');
            const btnApplyPastedCoords = document.getElementById('btnApplyPastedCoords');
            const lblModalGpsStatus = document.getElementById('lblModalGpsStatus');
            const btnGetGpsModal = document.getElementById('btnGetGpsModal');
            const btnSaveGpsModal = document.getElementById('btnSaveGpsModal');
            const btnClearGpsModal = document.getElementById('btnClearGpsModal');
            const btnCloseGpsModalX = document.getElementById('btnCloseGpsModalX');

            function openGpsModal() {
                if (numModalGpsLat) numModalGpsLat.value = state.header.lat !== null && state.header.lat !== undefined ? state.header.lat : '';
                if (numModalGpsLng) numModalGpsLng.value = state.header.lng !== null && state.header.lng !== undefined ? state.header.lng : '';
                if (txtPasteCoords) txtPasteCoords.value = '';

                updateModalGpsStatusText();

                // Ogni volta che il modale si riapre, l'accordion dei metodi alternativi riparte
                // sempre chiuso (nessuna voce ricordata aperta da una sessione precedente).
                if (typeof closeAllGpsAccordion === 'function') closeAllGpsAccordion();

                if (modalGpsOverlay) modalGpsOverlay.classList.add('open');
                if (modalGpsSettings) modalGpsSettings.classList.add('open');

                // Un solo tap sull'icona 📍 fa già partire subito la ricerca automatica, senza
                // costringere l'utente a un secondo tocco dentro il modale appena aperto.
                const hasGpsAlready = (state.header.lat !== null && state.header.lat !== undefined && state.header.lat !== '');
                if (!hasGpsAlready && navigator.geolocation) {
                    fetchGpsPositionModal();
                }
            }

            function closeGpsModal() {
                if (modalGpsOverlay) modalGpsOverlay.classList.remove('open');
                if (modalGpsSettings) modalGpsSettings.classList.remove('open');
            }

            function updateModalGpsStatusText() {
                if (!lblModalGpsStatus) return;
                const hasGps = (state.header.lat !== null && state.header.lat !== undefined && state.header.lat !== '' &&
                                state.header.lng !== null && state.header.lng !== undefined && state.header.lng !== '');
                if (hasGps) {
                    const lat = parseFloat(state.header.lat);
                    const lng = parseFloat(state.header.lng);
                    const altStr = state.header.alt ? ` | Quota: ${Math.round(state.header.alt)}m` : '';
                    lblModalGpsStatus.innerHTML = `<svg class="ico"><use href="#i-pin"/></svg> <strong>Coordinate Attive:</strong> ${lat.toFixed(6)}, ${lng.toFixed(6)}${altStr}`;
                    lblModalGpsStatus.style.color = 'var(--accent)';
                } else {
                    lblModalGpsStatus.innerHTML = `<svg class="ico"><use href="#i-pin"/></svg> GPS non ancora acquisito: rilevalo o inserisci latitudine e longitudine.`;
                    lblModalGpsStatus.style.color = 'var(--text-muted)';
                }
                aggiornaApriInMappe();
            }

            /** Gli indirizzi per aprire un punto nelle mappe. `geo:` è lo standard Android (apre la
             * scelta tra le app di mappe); il link web funziona ovunque ci sia un browser. Null se le
             * coordinate non sono numeri validi: meglio nessun link che uno in mezzo al mare. */
            function indirizziMappePunto(lat, lng, etichetta) {
                const la = parseFloat(lat);
                const lo = parseFloat(lng);
                if (!isFinite(la) || !isFinite(lo) || Math.abs(la) > 90 || Math.abs(lo) > 180) return null;
                const coppia = la.toFixed(6) + ',' + lo.toFixed(6);
                return {
                    coordinate: la.toFixed(6) + ', ' + lo.toFixed(6),
                    geo: 'geo:' + coppia + '?q=' + coppia + '(' + encodeURIComponent(etichetta || 'Prova DPSH') + ')',
                    web: 'https://www.google.com/maps/search/?api=1&query=' + coppia
                };
            }

            function aggiornaApriInMappe() {
                const box = document.getElementById('boxApriInMappe');
                if (!box) return;
                const h = state.header || {};
                const ind = indirizziMappePunto(h.lat, h.lng, 'DPSH ' + (h.provaNr || '1'));
                box.style.display = ind ? 'block' : 'none';
                if (!ind) return;
                const lnkGeo = document.getElementById('lnkMappeGeo');
                const lnkWeb = document.getElementById('lnkMappeWeb');
                if (lnkGeo) lnkGeo.href = ind.geo;
                if (lnkWeb) lnkWeb.href = ind.web;
                const btnCondividi = document.getElementById('btnMappeCondividi');
                if (btnCondividi) btnCondividi.style.display = navigator.share ? '' : 'none';
            }

            const btnMappeCondividi = document.getElementById('btnMappeCondividi');
            if (btnMappeCondividi) btnMappeCondividi.addEventListener('click', async () => {
                const h = state.header || {};
                const ind = indirizziMappePunto(h.lat, h.lng);
                if (!ind || !navigator.share) return;
                try { await navigator.share({ title: 'DPSH ' + (h.provaNr || '1'), url: ind.web }); }
                catch (e) { ignoraErrore('apriInMappeCondividi', e); }
            });

            const btnCopiaCoordinate = document.getElementById('btnCopiaCoordinate');
            if (btnCopiaCoordinate) btnCopiaCoordinate.addEventListener('click', async () => {
                const h = state.header || {};
                const ind = indirizziMappePunto(h.lat, h.lng);
                if (!ind) return;
                let copiato = false;
                try {
                    if (navigator.clipboard && window.isSecureContext) {
                        await navigator.clipboard.writeText(ind.coordinate);
                        copiato = true;
                    }
                } catch (e) { ignoraErrore('copiaCoordinate', e); }
                if (!copiato) {
                    // Dentro l'APK la Clipboard API può mancare: si ripiega sulla copia da un campo
                    // di testo temporaneo, che le WebView supportano.
                    const campo = document.createElement('textarea');
                    campo.value = ind.coordinate;
                    campo.setAttribute('readonly', '');
                    campo.style.cssText = 'position: fixed; left: -9999px; top: 0;';
                    document.body.appendChild(campo);
                    campo.select();
                    try { copiato = document.execCommand('copy'); } catch (e) { ignoraErrore('copiaCoordinate', e); }
                    campo.remove();
                }
                if (copiato) mostraToast(`Coordinate copiate: ${ind.coordinate}`);
                else appAlert(`Copia non riuscita. Le coordinate sono: ${ind.coordinate}`);
            });

            // GPS IN TEMPO REALE (IDEA 1): mantiene una posizione sempre aggiornata mentre l'app è
            // aperta sulla schermata di campo, cosi le foto scattate/importate senza EXIF possono
            // usare una posizione fresca invece di quella (eventualmente vecchia) del cantiere.
            function startLiveGpsWatch() {
                if (!navigator.geolocation || liveGpsWatchId !== null) return;
                // Nessun controllo preventivo sul contesto sicuro: si tenta sempre la richiesta e
                // si lascia che il browser stesso la accetti o rifiuti (già gestito in silenzio
                // sotto), cosi l'app non si autoesclude in contesti (es. WebView/APK) dove
                // l'euristica sull'origine potrebbe risultare inaffidabile o fuorviante.
                liveGpsWatchId = navigator.geolocation.watchPosition(
                    (pos) => {
                        liveGpsWatch = {
                            lat: pos.coords.latitude,
                            lng: pos.coords.longitude,
                            acc: pos.coords.accuracy || null,
                            alt: pos.coords.altitude || null,
                            timestamp: Date.now()
                        };
                        updateLiveGpsIndicator();
                    },
                    () => { /* Silenzioso: il fallback statico/manuale resta comunque disponibile */ },
                    { enableHighAccuracy: true, maximumAge: 5000, timeout: 30000 }
                );
            }
            function stopLiveGpsWatch() {
                if (liveGpsWatchId !== null && navigator.geolocation) {
                    navigator.geolocation.clearWatch(liveGpsWatchId);
                    liveGpsWatchId = null;
                }
                liveGpsWatch = { lat: null, lng: null, acc: null, alt: null, timestamp: null };
                updateLiveGpsIndicator();
            }
            function updateLiveGpsIndicator() {
                if (typeof updateGpsModalMapLiveDot === 'function') updateGpsModalMapLiveDot();
                const dot = document.getElementById('liveGpsAccuracyDot');
                if (!dot) return;
                if (liveGpsWatch.lat === null) { dot.style.display = 'none'; return; }
                const acc = liveGpsWatch.acc || 999;
                let color = 'var(--danger)';
                if (acc < 10) color = 'var(--success)';
                else if (acc < 30) color = 'var(--warning)';
                dot.style.background = color;
                dot.style.display = 'block';
                dot.title = `GPS live attivo: ±${Math.round(acc)}m`;
            }

            function fetchGpsPositionModal() {
                if (!navigator.geolocation) {
                    alert('⚠️ Geolocalizzazione non supportata dal tuo browser.');
                    return;
                }

                // I browser mobile bloccano SEMPRE la Geolocation API se la pagina non è
                // servita in contesto sicuro (HTTPS o localhost), anche con i permessi di
                // sistema (impostazioni telefono) abilitati. Su desktop molti browser sono
                // più permissivi (es. con file://), motivo per cui lì può sembrare funzionare.
                if (window.isSecureContext === false) {
                    alert('⚠️ GPS bloccato dal browser: questa pagina non è aperta in un contesto sicuro (HTTPS).\n\nAnche con i permessi di localizzazione attivi nelle impostazioni del telefono, i browser mobile impediscono l\'accesso al GPS a pagine caricate via file:// o http:// non protetto.\n\nSoluzione: carica/apri l\'app da un indirizzo HTTPS (es. tramite hosting, o installandola come PWA da un sito servito in HTTPS).');
                    return;
                }

                function describeGeoError(err) {
                    switch (err && err.code) {
                        case 1: // PERMISSION_DENIED
                            return 'Permesso negato dal browser per questo sito. Controlla le autorizzazioni del SITO (non solo del telefono) nelle impostazioni del browser: icona lucchetto/ⓘ nella barra indirizzo > Autorizzazioni > Posizione.';
                        case 2: // POSITION_UNAVAILABLE
                            return 'Posizione non disponibile: il dispositivo non riesce a determinare le coordinate al momento (segnale GPS/rete assente).';
                        case 3: // TIMEOUT
                            return 'Tempo scaduto durante la ricerca del segnale GPS.';
                        default:
                            return (err && err.message) ? err.message : 'Errore sconosciuto.';
                    }
                }

                if (btnGetGpsModal) btnGetGpsModal.innerHTML = '<svg class="ico"><use href="#i-satellite"/></svg> Ricerca del GPS in corso…';
                if (lblModalGpsStatus) lblModalGpsStatus.innerHTML = ico('satellite') + ' Connessione ai satelliti GPS in corso...';

                function handleSuccess(pos) {
                    state.header.lat = pos.coords.latitude;
                    state.header.lng = pos.coords.longitude;
                    state.header.alt = pos.coords.altitude || null;
                    state.header.acc = pos.coords.accuracy || null;
                    
                    if (numModalGpsLat) numModalGpsLat.value = state.header.lat;
                    if (numModalGpsLng) numModalGpsLng.value = state.header.lng;
                    if (btnGetGpsModal) btnGetGpsModal.innerHTML = '<svg class="ico"><use href="#i-satellite"/></svg> Rileva la posizione GPS';
                    
                    triggerVibrate([40, 40, 40]);
                    updateModalGpsStatusText();
                    updateUI();
                    saveState();
                }

                function tryLowAccuracy() {
                    navigator.geolocation.getCurrentPosition(
                        handleSuccess,
                        (err) => {
                            if (btnGetGpsModal) btnGetGpsModal.innerHTML = '<svg class="ico"><use href="#i-satellite"/></svg> Rileva la posizione GPS';
                            updateModalGpsStatusText();
                            alert(`⚠️ Impossibile acquisire posizione GPS.\n\n${describeGeoError(err)}\n\nIn alternativa inserisci Lat e Lng manualmente.`);
                        },
                        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
                    );
                }

                navigator.geolocation.getCurrentPosition(
                    handleSuccess,
                    (err) => {
                        // Se il permesso è negato in modo definitivo, non ha senso ritentare
                        // subito a bassa precisione: mostriamo l'errore chiaro all'utente.
                        if (err && err.code === 1) {
                            if (btnGetGpsModal) btnGetGpsModal.innerHTML = '<svg class="ico"><use href="#i-satellite"/></svg> Rileva la posizione GPS';
                            alert(`⚠️ Impossibile acquisire posizione GPS.\n\n${describeGeoError(err)}`);
                            return;
                        }
                        tryLowAccuracy();
                    },
                    { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
                );
            }

            if (btnGetGpsHeader) btnGetGpsHeader.addEventListener('click', openGpsModal);
            if (btnGetGpsModal) btnGetGpsModal.addEventListener('click', fetchGpsPositionModal);

            // ACCORDION METODI GPS: una voce aperta alla volta (Kml / Paste / Manual). Aprire una
            // voce chiude sempre le altre due, cosi il modale non torna ad essere affollato.
            const GPS_ACCORDION_KEYS = ['Kml', 'Paste', 'Manual'];
            function closeAllGpsAccordion() {
                GPS_ACCORDION_KEYS.forEach(k => {
                    const body = document.getElementById('gpsAccBody' + k);
                    const toggle = document.getElementById('btnGpsAcc' + k);
                    if (body) body.classList.remove('open');
                    if (toggle) toggle.classList.remove('open');
                });
            }
            async function openGpsAccordion(key) {
                closeAllGpsAccordion();
                const body = document.getElementById('gpsAccBody' + key);
                const toggle = document.getElementById('btnGpsAcc' + key);
                if (body) body.classList.add('open');
                if (toggle) toggle.classList.add('open');
                if (key === 'Manual') {
                    try {
                        await ensureLeafletLoaded();
                    } catch (e) {
                        alert('⚠️ ' + e.message);
                        closeAllGpsAccordion();
                        return;
                    }
                    ensureGpsModalMapReady();
                }
            }
            document.querySelectorAll('.gps-accordion-toggle').forEach(btn => {
                btn.addEventListener('click', () => {
                    const key = btn.dataset.key;
                    const alreadyOpen = btn.classList.contains('open');
                    if (alreadyOpen) closeAllGpsAccordion();
                    else openGpsAccordion(key);
                });
            });

            // MAPPA OSM NEL MODAL GPS CANTIERE (ultima spiaggia se il GPS del dispositivo non risponde)
            let gpsModalMapInstance = null;
            let gpsModalMapMarker = null;
            let gpsModalMapLiveMarker = null;
            let gpsModalMapBaseLayer = null;
            let gpsModalMapLabelsLayer = null;
            let gpsModalMapStyle = 'street';
            let gpsModalMapAltreProveMarkers = [];
            const btnUseGpsMapPin = document.getElementById('btnUseGpsMapPin');
            const btnGpsMapGoToMe = document.getElementById('btnGpsMapGoToMe');

            // Fonti tile gratuite, senza chiave API: OSM per la vista Strada, Esri World Imagery
            // per il Satellite, più uno strato di etichette/confini sopra le immagini per l'Ibrida.
            const GPS_MAP_TILE_SOURCES = {
                street: { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', options: { maxZoom: 19, attribution: '&copy; OpenStreetMap' } },
                satellite: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', options: { maxZoom: 19, attribution: 'Tiles &copy; Esri' } },
                hybridLabels: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', options: { maxZoom: 19 } }
            };

            function setGpsMapStyle(style) {
                if (!gpsModalMapInstance || typeof L === 'undefined') return;
                gpsModalMapStyle = style;
                if (gpsModalMapBaseLayer) { gpsModalMapInstance.removeLayer(gpsModalMapBaseLayer); gpsModalMapBaseLayer = null; }
                if (gpsModalMapLabelsLayer) { gpsModalMapInstance.removeLayer(gpsModalMapLabelsLayer); gpsModalMapLabelsLayer = null; }

                const baseSrc = (style === 'street') ? GPS_MAP_TILE_SOURCES.street : GPS_MAP_TILE_SOURCES.satellite;
                gpsModalMapBaseLayer = L.tileLayer(baseSrc.url, baseSrc.options).addTo(gpsModalMapInstance);
                gpsModalMapBaseLayer.bringToBack();

                if (style === 'hybrid') {
                    gpsModalMapLabelsLayer = L.tileLayer(GPS_MAP_TILE_SOURCES.hybridLabels.url, GPS_MAP_TILE_SOURCES.hybridLabels.options).addTo(gpsModalMapInstance);
                }

                document.querySelectorAll('.gps-map-layer-btn').forEach(b => b.classList.toggle('active', b.dataset.layer === style));
            }
            document.querySelectorAll('.gps-map-layer-btn').forEach(btn => {
                btn.addEventListener('click', () => setGpsMapStyle(btn.dataset.layer));
            });

            // Icona del pallino "posizione attuale": pulsante, ben distinta dal pin arancione
            // trascinabile (che rappresenta invece il punto scelto/da confermare).
            const gpsLiveDotIcon = () => L.divIcon({
                className: '',
                html: '<div class="gps-live-dot-wrap"><div class="gps-live-dot-pulse"></div><div class="gps-live-dot-core"></div></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });

            // Mostra/aggiorna il pallino della posizione live sulla mappa, se il GPS in tempo
            // reale ha già una posizione valida. Richiamata sia all'apertura della mappa sia ogni
            // volta che arriva una nuova posizione dal watch GPS (vedi updateLiveGpsIndicator).
            function updateGpsModalMapLiveDot() {
                if (!gpsModalMapInstance || typeof L === 'undefined') return;
                if (liveGpsWatch.lat === null || liveGpsWatch.lng === null) return;
                const ll = [liveGpsWatch.lat, liveGpsWatch.lng];
                if (!gpsModalMapLiveMarker) {
                    gpsModalMapLiveMarker = L.marker(ll, { icon: gpsLiveDotIcon(), interactive: false, zIndexOffset: -100 }).addTo(gpsModalMapInstance);
                } else {
                    gpsModalMapLiveMarker.setLatLng(ll);
                }
            }

            // Icona "pin grigio" per le altre prove del progetto (richiesto esplicitamente): solo il
            // numero prova come etichetta, per restare leggibile anche con molti punti vicini.
            const gpsAltraProvaIcon = (numero) => L.divIcon({
                className: '',
                html: `<div class="gps-altra-prova-pin"><span>${numero}</span></div>`,
                iconSize: [22, 22],
                iconAnchor: [11, 22]
            });

            // Icona del pin BLU trascinabile (la prova che si sta posizionando ora), con lo stesso
            // numero prova mostrato dai pin grigi delle altre prove (richiesto esplicitamente).
            const gpsMiaProvaIcon = (numero) => L.divIcon({
                className: '',
                html: `<div class="gps-mia-prova-pin"><span>${numero}</span></div>`,
                iconSize: [30, 30],
                iconAnchor: [15, 30]
            });

            /** Aggiorna l'icona del pin blu con il numero prova attuale (state.header.provaNr) —
             * richiamata sia all'apertura/refresh della mappa sia ogni volta che l'utente modifica
             * il campo "N° Prova" mentre la mappa è già visibile, così restano sempre allineati. */
            function aggiornaIconaMiaProvaMappaGps() {
                if (!gpsModalMapMarker) return;
                const numero = (state.header && state.header.provaNr) || '?';
                gpsModalMapMarker.setIcon(gpsMiaProvaIcon(numero));
            }

            /** Disegna sulla mappa di posizionamento manuale un pin grigio, non selezionabile, per
             * ogni ALTRA prova del progetto corrente che ha già delle coordinate — richiesto
             * esplicitamente come punto di riferimento per orientarsi quando si posiziona a mano il
             * pin di una prova (propria o senza GPS). Esclude sempre la prova attualmente aperta
             * (state.currentSurveyId), che ha già il proprio pin arancione trascinabile
             * (gpsModalMapMarker). Richiamata ad ogni apertura/refresh della mappa, così riflette
             * anche prove aggiunte o riposizionate nel frattempo. */
            function aggiornaAltreProveMarkersSuMappaGps() {
                if (!gpsModalMapInstance || typeof L === 'undefined') return;
                gpsModalMapAltreProveMarkers.forEach(m => gpsModalMapInstance.removeLayer(m));
                gpsModalMapAltreProveMarkers = [];
                const proj = state.currentProjectId ? state.projects[state.currentProjectId] : null;
                if (!proj || !proj.surveys) return;
                Object.values(proj.surveys).forEach(surv => {
                    if (surv.id === state.currentSurveyId) return; // già coperta dal pin arancione
                    const h = surv.header || {};
                    if (h.lat === null || h.lat === undefined || h.lat === '' ||
                        h.lng === null || h.lng === undefined || h.lng === '') return;
                    const lat = parseFloat(h.lat), lng = parseFloat(h.lng);
                    if (isNaN(lat) || isNaN(lng)) return;
                    const numero = h.provaNr || '?';
                    const marker = L.marker([lat, lng], {
                        icon: gpsAltraProvaIcon(numero),
                        interactive: false,
                        keyboard: false,
                        zIndexOffset: -50
                    }).addTo(gpsModalMapInstance);
                    gpsModalMapAltreProveMarkers.push(marker);
                });
            }

            // Inizializza (la prima volta) o ridimensiona/ricentra (le volte successive) la mappa
            // Leaflet dentro la voce "Coordinate manuali o mappa" dell'accordion. Richiamata da
            // openGpsAccordion('Manual') dopo aver atteso l'esito di ensureLeafletLoaded().
            function ensureGpsModalMapReady() {
                // Centro mappa: coordinate già impostate > GPS live > centro Italia come ultima risorsa
                const curLat = numModalGpsLat && numModalGpsLat.value !== '' ? parseFloat(numModalGpsLat.value) : null;
                const curLng = numModalGpsLng && numModalGpsLng.value !== '' ? parseFloat(numModalGpsLng.value) : null;
                const centerLat = (curLat !== null && !isNaN(curLat)) ? curLat : (liveGpsWatch.lat !== null ? liveGpsWatch.lat : 41.8719);
                const centerLng = (curLng !== null && !isNaN(curLng)) ? curLng : (liveGpsWatch.lng !== null ? liveGpsWatch.lng : 12.5674);

                // Attende la fine della transizione di espansione (vedi .expand-region, 0.28s) prima
                // di inizializzare/ridimensionare la mappa Leaflet: se lo facesse a metà animazione,
                // il contenitore avrebbe ancora un'altezza intermedia e la mappa nascerebbe tagliata
                // finché non arriva un resize successivo.
                setTimeout(() => {
                    if (!gpsModalMapInstance) {
                        gpsModalMapInstance = L.map('gpsMapModalEl').setView([centerLat, centerLng], 15);
                        setGpsMapStyle(gpsModalMapStyle);
                        gpsModalMapMarker = L.marker([centerLat, centerLng], { draggable: true, icon: gpsMiaProvaIcon((state.header && state.header.provaNr) || '?') }).addTo(gpsModalMapInstance);
                        gpsModalMapInstance.on('click', (e) => { gpsModalMapMarker.setLatLng(e.latlng); });
                    } else {
                        gpsModalMapInstance.invalidateSize();
                        gpsModalMapInstance.setView([centerLat, centerLng], 15);
                        gpsModalMapMarker.setLatLng([centerLat, centerLng]);
                    }
                    updateGpsModalMapLiveDot();
                    aggiornaAltreProveMarkersSuMappaGps();
                    aggiornaIconaMiaProvaMappaGps();
                }, 300);
            }

            // Pulsante "Vai alla Mia Posizione": centra la mappa sul GPS in tempo reale SENZA
            // spostare il pin arancione (che resta il punto da confermare), cosi l'utente può
            // orientarsi rispetto a dove si trova davvero prima di scegliere il punto esatto.
            if (btnGpsMapGoToMe) {
                btnGpsMapGoToMe.addEventListener('click', async () => {
                    if (!gpsModalMapInstance) return;
                    if (liveGpsWatch.lat !== null && liveGpsWatch.lng !== null) {
                        gpsModalMapInstance.setView([liveGpsWatch.lat, liveGpsWatch.lng], 17);
                        updateGpsModalMapLiveDot();
                        triggerVibrate(20);
                        return;
                    }
                    // Nessuna posizione live ancora disponibile: prova una richiesta puntuale
                    if (!navigator.geolocation) {
                        appAlert('Geolocalizzazione non supportata da questo dispositivo.');
                        return;
                    }
                    btnGpsMapGoToMe.disabled = true;
                    btnGpsMapGoToMe.innerHTML = `${ico('satellite')} Ricerca posizione...`;
                    navigator.geolocation.getCurrentPosition(
                        (pos) => {
                            liveGpsWatch.lat = pos.coords.latitude;
                            liveGpsWatch.lng = pos.coords.longitude;
                            liveGpsWatch.acc = pos.coords.accuracy || null;
                            gpsModalMapInstance.setView([liveGpsWatch.lat, liveGpsWatch.lng], 17);
                            updateGpsModalMapLiveDot();
                            updateLiveGpsIndicator();
                            btnGpsMapGoToMe.disabled = false;
                            btnGpsMapGoToMe.innerHTML = `${ico('satellite')} Vai alla Mia Posizione`;
                        },
                        (err) => {
                            btnGpsMapGoToMe.disabled = false;
                            btnGpsMapGoToMe.innerHTML = `${ico('satellite')} Vai alla Mia Posizione`;
                            appAlert('⚠️ Impossibile ottenere la posizione attuale: ' + ((err && err.message) || 'errore sconosciuto'));
                        },
                        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
                    );
                });
            }

