# Mappa del codice

> Generata da `python tools/mappa_codice.py`. Non modificarla a mano: rilancia lo script.
>
> I pezzi sono elencati nell'ordine in cui `build.py` li concatena. **Tutti i `.js` di
> `src/js/` sono frammenti di UNA sola funzione** (la `(function() { ... })();` che apre
> `000_` e chiude in `shell/06_fine.html`): condividono lo stesso ambito, non sono moduli.
> Una funzione definita in un pezzo è visibile in tutti gli altri.

### `src/shell/01_head.html`
50 righe · in `dist/DPSH.html` dalla riga 1

### `src/css/00_font-incorporati.css`
41 righe · in `dist/DPSH.html` dalla riga 51

### `src/css/00b_font-interfaccia.css`
14 righe · in `dist/DPSH.html` dalla riga 92

### `src/shell/02_tra-font-e-stile.html`
2 righe · in `dist/DPSH.html` dalla riga 106

### `src/css/01_app.css`
2860 righe · in `dist/DPSH.html` dalla riga 108

### `src/css/02_passaggio-telefono-pc.css`
87 righe · in `dist/DPSH.html` dalla riga 2968

### `src/css/03_regole-di-stile.css`
194 righe · in `dist/DPSH.html` dalla riga 3055

### `src/css/04_prova-e-home.css`
1688 righe · in `dist/DPSH.html` dalla riga 3249

### `src/css/05_classi-schermate.css`
460 righe · in `dist/DPSH.html` dalla riga 4937

### `src/css/05_assistente-ia.css`
174 righe · in `dist/DPSH.html` dalla riga 5397

### `src/css/06_leggi-foglio.css`
32 righe · in `dist/DPSH.html` dalla riga 5571

### `src/css/05_leaflet.css`
670 righe · in `dist/DPSH.html` dalla riga 5603

### `src/shell/03_fine-head.html`
3 righe · in `dist/DPSH.html` dalla riga 6273

### `src/markup/00_icone-e-schermate-principali.html`
521 righe · in `dist/DPSH.html` dalla riga 6276

### `src/markup/01_modalPhoto.html`
21 righe · in `dist/DPSH.html` dalla riga 6797

finestre: `#modalPhotoPreview`

### `src/markup/02_modalGps.html`
173 righe · in `dist/DPSH.html` dalla riga 6818

finestre: `#modalGpsSettings`

### `src/markup/03_modal.html`
62 righe · in `dist/DPSH.html` dalla riga 6991

finestre: `#modalEditStep`

### `src/markup/04_modalCustomNote.html`
14 righe · in `dist/DPSH.html` dalla riga 7053

finestre: `#modalCustomNote`

### `src/markup/06_modalStrati.html`
84 righe · in `dist/DPSH.html` dalla riga 7067

finestre: `#modalManageStrati`

### `src/markup/06b_modalDaiNome.html`
20 righe · in `dist/DPSH.html` dalla riga 7151

finestre: `#modalDaiNome`

### `src/markup/06c_modalScalettaReport.html`
23 righe · in `dist/DPSH.html` dalla riga 7171

finestre: `#modalScaletta`

### `src/markup/07_modalArchivePicker.html`
15 righe · in `dist/DPSH.html` dalla riga 7194

finestre: `#modalArchivePicker`

### `src/markup/08_modalArchiveManager.html`
25 righe · in `dist/DPSH.html` dalla riga 7209

finestre: `#modalArchiveManager`

### `src/markup/09_modalArchPrefEdit.html`
370 righe · in `dist/DPSH.html` dalla riga 7234

finestre: `#modalArchPrefEdit`

### `src/markup/10_modalWizard.html`
8 righe · in `dist/DPSH.html` dalla riga 7604

finestre: `#modalWizard`

### `src/markup/11_modalProjectNotes.html`
203 righe · in `dist/DPSH.html` dalla riga 7612

finestre: `#modalProjectNotes`

### `src/markup/12_modalNotePhotoPicker.html`
17 righe · in `dist/DPSH.html` dalla riga 7815

finestre: `#modalNotePhotoPicker`

### `src/markup/13_modalStileTesto.html`
85 righe · in `dist/DPSH.html` dalla riga 7832

finestre: `#modalStileTesto`

### `src/markup/14_modalComposizioneMappa.html`
210 righe · in `dist/DPSH.html` dalla riga 7917

finestre: `#modalComposizioneMappa`

### `src/markup/15_modalRitaglio.html`
39 righe · in `dist/DPSH.html` dalla riga 8127

finestre: `#modalRitaglio`

### `src/markup/16_modalNoteDraw.html`
105 righe · in `dist/DPSH.html` dalla riga 8166

finestre: `#modalNoteDraw`

### `src/markup/17_modalEditParams.html`
20 righe · in `dist/DPSH.html` dalla riga 8271

finestre: `#modalEditParams`

### `src/markup/18_modalStratiChoice.html`
22 righe · in `dist/DPSH.html` dalla riga 8291

finestre: `#modalStratiChoice`

### `src/markup/19_modalAutoStrati.html`
35 righe · in `dist/DPSH.html` dalla riga 8313

finestre: `#modalAutoStrati`

### `src/markup/20_modalPhotoGpsFallback.html`
42 righe · in `dist/DPSH.html` dalla riga 8348

finestre: `#modalPhotoGpsFallback`

### `src/markup/21_modalQuickFalda.html`
35 righe · in `dist/DPSH.html` dalla riga 8390

finestre: `#modalQuickFalda`

### `src/markup/22_appDialog.html`
30 righe · in `dist/DPSH.html` dalla riga 8425

finestre: `#appDialog`

### `src/markup/23_modalDeleteSurvey.html`
26 righe · in `dist/DPSH.html` dalla riga 8455

finestre: `#modalDeleteSurvey`

### `src/markup/24_modalSurveySettings.html`
222 righe · in `dist/DPSH.html` dalla riga 8481

finestre: `#modalSurveySettings`

### `src/markup/26_modalConfirmDelete.html`
26 righe · in `dist/DPSH.html` dalla riga 8703

finestre: `#modalConfirmDelete`

### `src/markup/27_modalBulkImport.html`
53 righe · in `dist/DPSH.html` dalla riga 8729

finestre: `#modalBulkImport`

### `src/markup/28_modalExport.html`
163 righe · in `dist/DPSH.html` dalla riga 8782

finestre: `#modalExportFormats`

### `src/markup/28b_modalPacchettoZip.html`
28 righe · in `dist/DPSH.html` dalla riga 8945

finestre: `#modalPacchettoZip`

### `src/markup/29_modalEsportaPdf.html`
90 righe · in `dist/DPSH.html` dalla riga 8973

finestre: `#modalEsportaPdf`

### `src/markup/30_modalReportTemplates.html`
46 righe · in `dist/DPSH.html` dalla riga 9063

finestre: `#modalReportTemplates`

### `src/markup/31_modalIndicePersonalizza.html`
63 righe · in `dist/DPSH.html` dalla riga 9109

finestre: `#modalIndicePersonalizza`

### `src/markup/32_modalTplTextEditor.html`
147 righe · in `dist/DPSH.html` dalla riga 9172

finestre: `#modalTplTextEditor`

### `src/markup/33_modalAnteprimaStampaReale.html`
42 righe · in `dist/DPSH.html` dalla riga 9319

finestre: `#modalAnteprimaStampaReale`

### `src/markup/34_modalTemplateEditor.html`
326 righe · in `dist/DPSH.html` dalla riga 9361

finestre: `#modalTemplateEditor`

### `src/markup/35_modalProjectActions.html`
76 righe · in `dist/DPSH.html` dalla riga 9687

finestre: `#modalProjectActions`

### `src/markup/36_modalCronologia.html`
18 righe · in `dist/DPSH.html` dalla riga 9763

finestre: `#modalCronologia`

### `src/markup/37_modalConfrontoProve.html`
33 righe · in `dist/DPSH.html` dalla riga 9781

finestre: `#modalConfrontoProve`

### `src/markup/38_modalBackupChoice.html`
35 righe · in `dist/DPSH.html` dalla riga 9814

finestre: `#modalBackupChoice`

### `src/markup/39_modalSurveyPhotos.html`
34 righe · in `dist/DPSH.html` dalla riga 9849

finestre: `#modalSurveyPhotos`

### `src/markup/40_modalNewProject.html`
33 righe · in `dist/DPSH.html` dalla riga 9883

finestre: `#modalNewProject`

### `src/markup/41_modalNewSurvey.html`
55 righe · in `dist/DPSH.html` dalla riga 9916

finestre: `#modalNewSurvey`

### `src/markup/42_drawer.html`
288 righe · in `dist/DPSH.html` dalla riga 9971

finestre: `#drawerMenu`

### `src/markup/43_modalPortaERicevi.html`
51 righe · in `dist/DPSH.html` dalla riga 10259

### `src/markup/44_modalPalette.html`
11 righe · in `dist/DPSH.html` dalla riga 10310

finestre: `#modalScorciatoie`

### `src/markup/45_modalTerreno.html`
27 righe · in `dist/DPSH.html` dalla riga 10321

finestre: `#modalTerreno`

### `src/markup/46_modalSezione.html`
42 righe · in `dist/DPSH.html` dalla riga 10348

finestre: `#modalSezione`

### `src/markup/47_modalVista3d.html`
240 righe · in `dist/DPSH.html` dalla riga 10390

finestre: `#modalVista3d`

### `src/markup/47b_tavole3d.html`
180 righe · in `dist/DPSH.html` dalla riga 10630

### `src/markup/47c_esportaGis.html`
28 righe · in `dist/DPSH.html` dalla riga 10810

### `src/markup/47c_trovaDtm.html`
33 righe · in `dist/DPSH.html` dalla riga 10838

### `src/markup/47d_qr.html`
46 righe · in `dist/DPSH.html` dalla riga 10871

### `src/shell/03b_apre-sheetjs.html`
8 righe · in `dist/DPSH.html` dalla riga 10917

### `src/vendor/xlsx.full.min.js`
22 righe · in `dist/DPSH.html` dalla riga 10925

### `src/shell/03c_chiude-sheetjs-apre-exceljs.html`
4 righe · in `dist/DPSH.html` dalla riga 10947

### `src/vendor/exceljs.min.js`
45 righe · in `dist/DPSH.html` dalla riga 10951

### `src/shell/03d_chiude-exceljs-apre-leaflet.html`
5 righe · in `dist/DPSH.html` dalla riga 10996

### `src/vendor/leaflet.min.js`
6 righe · in `dist/DPSH.html` dalla riga 11001

### `src/shell/03e_chiude-leaflet.html`
1 righe · in `dist/DPSH.html` dalla riga 11007

### `src/shell/03f_apre-qr.html`
3 righe · in `dist/DPSH.html` dalla riga 11008

### `src/vendor/qr-generatore.min.js`
4 righe · in `dist/DPSH.html` dalla riga 11011

### `src/vendor/qr-lettore.min.js`
2 righe · in `dist/DPSH.html` dalla riga 11015

### `src/shell/03g_chiude-qr.html`
1 righe · in `dist/DPSH.html` dalla riga 11017

### `src/shell/04_apre-motore-note.html`
1 righe · in `dist/DPSH.html` dalla riga 11018

### `src/vendor/motore-note.min.js`
152 righe · in `dist/DPSH.html` dalla riga 11019

### `src/shell/04b_chiude-motore-apre-pdfjs.html`
4 righe · in `dist/DPSH.html` dalla riga 11171

### `src/vendor/pdfjs.min.js`
22 righe · in `dist/DPSH.html` dalla riga 11175

### `src/shell/04c_apre-pdfjs-worker.html`
2 righe · in `dist/DPSH.html` dalla riga 11197

### `src/vendor/pdfjs-worker.min.js`
22 righe · in `dist/DPSH.html` dalla riga 11199

### `src/shell/04d_chiude-worker-apre-pdflib.html`
5 righe · in `dist/DPSH.html` dalla riga 11221

### `src/vendor/pdf-lib.min.js`
16 righe · in `dist/DPSH.html` dalla riga 11226

### `src/shell/04e_chiude-pdflib-apre-fontkit.html`
2 righe · in `dist/DPSH.html` dalla riga 11242

### `src/vendor/fontkit.umd.min.js`
1 righe · in `dist/DPSH.html` dalla riga 11244

### `src/shell/05_tra-motore-e-app.html`
2 righe · in `dist/DPSH.html` dalla riga 11245

### `src/js/000_avvio-stato-e-salvataggio.js`
258 righe · in `dist/DPSH.html` dalla riga 11247

`classicoPaginaDefault`, `stratiInizialiProgettoNuovo`, `flashDataChangedCards`

### `src/js/001_fase-3-gps-live-fallback-foto-import-batch.js`
369 righe · in `dist/DPSH.html` dalla riga 11505

`syncStateToProject`, `fotoSenzaImmagine`, `scriviStatoAttivoNelProgetto`, `chiaviPreferenzeApp`, `syncProjectToActiveState`, `playBeep`, `_valoreCampo`, `_campoControllabile`, `_fotografaFinestra`, `_finestraSporca`, `finestraInCima`, `_chiudiFinestraSemplice`, `_confermaPerditaDati`, `chiudiFinestraInCima`, `closeAnyOpenModal`

### `src/js/002_dialoghi-in-app.js`
367 righe · in `dist/DPSH.html` dalla riga 11874

`_initAppDialog`, `_leggiCampiAppDialog`, `_closeAppDialog`, `_dialogStyleFor`, `_cleanDialogText`, `appDialog`, `_appDialogOra`, `appAlert`, `appConfirm`, `appConfirmDelete`, `mostraToast`, `nascondiToast`, `toastODialogo`, `ignoraErrore`, `segnalaErrore`, `appPrompt`, `appPromptCampi`

### `src/js/002b_fuoco-nelle-finestre.js`
87 righe · in `dist/DPSH.html` dalla riga 12241

`_fuocoVisibile`, `_fuocoElementi`, `_fuocoCampoTesto`, `_fuocoCima`, `_fuocoApri`, `_fuocoChiudi`, `_fuocoTransizione`

### `src/js/002a_testo-sicuro-e-dati-in-ingresso.js`
93 righe · in `dist/DPSH.html` dalla riga 12328

`testoHtml`, `testoXml`, `idSicuro`, `idSicuroOppureNuovo`, `coloreSicuro`, `prefissoImmagineSicuro`, `dataUrlImmagineSicuro`, `numeroSicuro`

### `src/js/003_toggle-tema-sole-luna.js`
46 righe · in `dist/DPSH.html` dalla riga 12421

`syncThemeToggleLabel`, `applyGloveMode`

### `src/js/004_funzioni-sperimentali.js`
702 righe · in `dist/DPSH.html` dalla riga 12467

`applyDebugMode`, `ico`, `triggerVibrate`, `requestWakeLock`, `applicaStatoSalvato`, `migrazione0a1`, `loadState`, `stripNoteImagesHtml`, `annullaSalvataggioInSospeso`, `salvaDopoLaTransizione`, `scaricaSalvataggioInSospeso`, `saveState`, `avviaCopiaPeriodica`, `avvisaSalvataggioFallito`, `getStratoById`, `getEffectiveLithology`, `populateStratiDropdown`

### `src/js/004a_dati-salvati-lettura-e-quarantena.js`
173 righe · in `dist/DPSH.html` dalla riga 13169

`leggiStatoSalvato`, `datiNonCaricati`, `scriviQuarantena`, `testoAvvisoDatiNonCaricati`, `mostraAvvisoDatiNonCaricati`, `scaricaDatiNonCaricati`, `ripartiDaVuotoDopoDatiNonCaricati`, `mostraBarraSalvataggioSospeso`

### `src/js/004b_versione-dello-schema-e-migrazioni.js`
217 righe · in `dist/DPSH.html` dalla riga 13342

`migrazione4a5`, `migrazione3a4`, `migrazione2a3`, `migrazione1a2`, `versioneDeiDati`, `migraDati`, `predefinitiPerMigrazioni`, `copiaPrimaDiAggiornareIDati`, `versioneFileImportato`, `controllaVersioneFileImportato`, `migraProgettiImportati`

### `src/js/004c_controllo-di-integrita.js`
310 righe · in `dist/DPSH.html` dalla riga 13559

`verificaIntegrita`, `registraCorrezioni`, `idPresentiNelDatabaseFoto`, `verificaIntegritaConFoto`, `elencoAnomalie`, `controllaIntegritaDopoAvvio`, `tastoVaiAnomalia`, `renderIntegritaPrimaExport`

### `src/js/004d_tracciabilita-degli-intervalli.js`
52 righe · in `dist/DPSH.html` dalla riga 13869

`profonditaAlMillimetro`, `nuovoIntervallo`, `misuraDiIntervallo`, `segnaIntervalloModificato`

### `src/js/004e_impronta-e-modifiche-vere.js`
221 righe · in `dist/DPSH.html` dalla riga 13921

`costantiSha256`, `sha256Byte`, `sha256Testo`, `sha256Async`, `jsonCanonico`, `htmlNotaSenzaImmagini`, `testoContenutoProgetto`, `eseguiNormalizzazioneInSospeso`, `registraModificheVere`, `accettaContenutoProgetto`, `accettaNormalizzazioneApertura`, `primaContenutiConosciuti`, `formattaQuandoCompleto`

### `src/js/004f_annulla-e-ripeti.js`
531 righe · in `dist/DPSH.html` dalla riga 14142

`cronologia`, `testoPezzoCronologia`, `metaProvaCronologia`, `metaProgettoCronologia`, `pezziProgettoCronologia`, `fotografiaCronologia`, `pezzoDellaFotografia`, `differenzaCronologia`, `pesoPassoCronologia`, `registraPassoCronologia`, `elementoDiScrittura`, `accettaAperturaInCronologia`, `cronologiaUsabile`, `puoAnnullare`, `annullaAzione`, `ripetiAzione`, `ripristinaPassoCronologia`, `dopoRipristinoCronologia`, `descriviPassoCronologia`, `aggiornaTastiCronologia`, `idFotoNellaCronologia`, `idImmaginiNoteNellaCronologia`

### `src/js/004g_dati-grandi-fuori-da-localstorage.js`
274 righe · in `dist/DPSH.html` dalla riga 14673

`datiGrandi`, `attendiDatiGrandi`, `openDatiGrandiDB`, `nuovoIdDatoGrande`, `scriviDatoGrandeVerificato`, `accodaScritturaDatoGrande`, `sostituisciDatiGrandi`, `raccogliRiferimentiDatiGrandi`, `leggiDatiGrandi`, `risolviRiferimentiDatiGrandi`, `avviaRisoluzioneDatiGrandi`, `elencaDatiGrandi`

### `src/js/005_fase-2-riconoscimento-automatico-degli-strati.js`
155 righe · in `dist/DPSH.html` dalla riga 14947

`getStratiBoundaryIndices`, `detectStratiSegments`, `applyDetectedSegmentsToLogs`, `moveStratiBoundary`, `svgTileUrl`

### `src/js/006_retini-litologici-ufficiali-estratti-pixel-per-p.js`
182 righe · in `dist/DPSH.html` dalla riga 15102

`getPatternCss`, `getSvgPatternDef`, `buildPatternPickerHtml`, `buildArchPatternPickerHtml`

### `src/js/007_archivio-litologico-globale.js`
727 righe · in `dist/DPSH.html` dalla riga 15284

`getArchiveList`, `stratoHaCollegamentoArchivioValido`, `campiArchivioDaStrato`, `promoteStratoToArchive`, `aggiornaVoceArchivioDaStrato`, `rendiSicuraVoceArchivio`, `mergeLithologyArchiveInto`, `createStratoFromArchive`, `computeArchiveStats`, `formatUltimoUtilizzo`, `renderStratiList`

### `src/js/008_ui-archivio-litologico-picker-gestione-globale.js`
127 righe · in `dist/DPSH.html` dalla riga 16011

`renderArchivePickerList`, `updateArchivePickerConfirmState`, `openArchivePicker`, `closeArchivePicker`

### `src/js/009_gestione-archivio-globale.js`
294 righe · in `dist/DPSH.html` dalla riga 16138

`renderArchiveManagerList`, `openArchiveManager`, `closeArchiveManager`

### `src/js/010_modal-modifica-preferenza-formula.js`
57 righe · in `dist/DPSH.html` dalla riga 16432

`apriModificaPreferenzaArchivio`, `chiudiModificaPreferenzaArchivio`

### `src/js/011_export-import-archivio.js`
62 righe · in `dist/DPSH.html` dalla riga 16489

### `src/js/012_motore-di-calcolo-parametri-geotecnici-avanzati.js`
394 righe · in `dist/DPSH.html` dalla riga 16551

`lookupPesoVolume`, `classificaConsistenza`, `drSkemptonLimiSabbie`, `clamp100`, `candidatiCompatibili`, `calcolaCr`, `calcolaN160`, `condizioneFalda`, `elaboraStratiProva`, `normalizzaTesto`, `categorieDiTesto`, `categorieRiconosciuteDiStrato`, `stratoRischioCarbonatico`, `valutaSuggerimento`, `applicaFallbackSuggerimentoParziale`

### `src/js/013_note-scientifiche-per-autore-dove-possibile-veri.js`
56 righe · in `dist/DPSH.html` dalla riga 16945

`notaScientificaDi`, `categorieApplicabili`

### `src/js/014_wizard-navigazione-sempre-visibile-a-differenza.js`
108 righe · in `dist/DPSH.html` dalla riga 17001

`categoriaTipicaPerStrato`, `candidatiWizardIgnorandoTipicita`, `categoriaHaConsigliato`, `seleziona`, `ensureParametriAvanzati`, `fmtIT`, `formattaDataIT`

### `src/js/015_ponte-col-modulo-1-colpi-dpsh-nspt-nspt-rpd-per.js`
149 righe · in `dist/DPSH.html` dalla riga 17109

`faldaDaHeader`, `parametriStrumento`, `betaTCalcolato`, `betaTStrumento`, `rpdDiLog`, `nsptDiLog`, `getEffectiveLithologyIn`, `intervalloSoloGrafico`, `getLogsPerStratoIn`, `stratiEffettiviProva`

### `src/js/016_vista-interattiva-elaborazione-dati-speciali.js`
325 righe · in `dist/DPSH.html` dalla riga 17258

`primoCandidatoConsigliato`, `calcolaRisultatiPerStratiCorrenti`, `buildParametriAvanzatiBodyHtml`, `buildParametriAvanzatiSummaryHtml`, `refreshParametriAvanzatiViews`, `bindParametriAvanzatiEvents`, `renderEditParamsModalBody`, `openEditParamsModal`, `chiudiEditParamsModal`, `cancelEditParamsModal`, `saveEditParamsModal`

### `src/js/017_wizard-guidato-parametri-avanzati-selezione-pass.js`
640 righe · in `dist/DPSH.html` dalla riga 17583

`formattaValoreWizard`, `raggruppaPerAutore`, `categorieConSceltaWizard`, `primoStratoDaCompletare`, `apriWizardParametri`, `primoCampoWizardMancante`, `chiudiWizardParametri`, `autoCompilaStrato`, `renderWizardModal`, `renderWizardStep`, `renderWizardRiepilogo`

### `src/js/018_export-tabelle-riepilogo-e-dettagliata-stesso-fo.js`
236 righe · in `dist/DPSH.html` dalla riga 18223

`autoFitTabellaExport`, `larghezzaColonnaEtichetta`, `autoFitTabellaRighe`, `thExp`, `tdExp`, `tdlExp`, `intestazioneColonneExp`, `colgroupExp`, `htmlTabellaRiepilogo`, `conIndiceRiga`, `costruisciTabellaCategoria`, `htmlTabellaDettagliata`

### `src/js/019_allegato-compendio-delle-formule-di-correlazione.js`
131 righe · in `dist/DPSH.html` dalla riga 18459

`candidatoAllegato`, `buildAllegatoHtml`

### `src/js/020_fogli-excel-riepilogo-e-dettagliata-replica-fede.js`
2093 righe · in `dist/DPSH.html` dalla riga 18590

`argbExcel`, `stileCellaExcel`, `scriviRigaExcel`, `scriviSezioneExcel`, `intestazioneWorksheetExcel`, `popolaWorksheetRiepilogo`, `popolaWorksheetDettagliata`, `datiCalcolatiProva`, `elencoProveProgetto`, `sezioneProvaHtml`, `documentoEsportazioneAvanzata`, `getRodForDepth`, `suPc`, `mostraVistaProva`, `animaUnaVolta`, `segnaIntervalloNuovo`, `renderUltimiIntervalli`, `impulsoContatoreColpi`, `numeroConVirgola`, `testoIntervallo`, `tastoRegistraVisibile`, `testiTestataProva`, `aggiornaSpieProva`, `updateUI`, `aggiornaHintManiglieStratiGrafico`, `aggiornaBottoneModificaStratiGrafico`, `renderIntegratedLogsTable`, `renderIntegratedDepthLabels`, `recalculateDepths`, `deleteLogStep`, `deleteLogStepInterno`, `renderLogsTable`, `chiudiRigheAperte`, `collegaRigaRegistro`, `renderChart`, `eseguiPiuUnColpo`, `applicaNotaRapida`, `closeCustomNoteModal`, `confirmAndNextStep`, `togliUltimoIntervallo`, `annullaRegistrazione`, `undoLastStep`, `openGpsModal`, `closeGpsModal`, `updateModalGpsStatusText`, `indirizziMappePunto`, `aggiornaApriInMappe`, `startLiveGpsWatch`, `updateLiveGpsIndicator`, `fetchGpsPositionModal`, `closeAllGpsAccordion`, `openGpsAccordion`, `setGpsMapStyle`, `gpsLiveDotIcon`, `updateGpsModalMapLiveDot`, `gpsAltraProvaIcon`, `gpsMiaProvaIcon`, `aggiornaIconaMiaProvaMappaGps`, `aggiornaAltreProveMarkersSuMappaGps`, `ensureGpsModalMapReady`

### `src/js/021_diagnostica-gps.js`
244 righe · in `dist/DPSH.html` dalla riga 20683

`diagLine`, `runGpsDiagnostics`, `showGpsMapSearchMessage`, `runGpsMapSearch`, `parsePastedCoords`

### `src/js/022_importazione-coordinate-da-file-kml-gpx.js`
609 righe · in `dist/DPSH.html` dalla riga 20927

`parseGeoFileText`, `leggiTestoKmz`, `mostraMappaDelPunto`, `applyGpsCoordsToModal`, `numeroGps`, `spostamentoProva`, `metriTra`, `coppiaGps`, `aggiornaSpostaProva`, `aggiornaModoSposta`, `aggiornaTracciaSpostamento`, `confermaSpostamentoProva`, `aggiornaConteggiHome`, `switchView`, `renderSchermataProgetto`

### `src/js/022b_importa-prove-da-excel.js`
364 righe · in `dist/DPSH.html` dalla riga 21536

`xlsxColonna`, `xlsxApplicaTinta`, `leggiXlsx`, `interpretaFoglioProve`, `esc`, `scriviProveDaExcel`, `pannelloApp`, `svgColonnaProva`, `importaProveDaExcel`

### `src/js/022c_gps-di-tutte-le-prove.js`
132 righe · in `dist/DPSH.html` dalla riga 21900

`provaNrChiave`, `ordinaProve`, `numeroDaNomePunto`, `abbinaPuntiAProve`, `numeroCoord`, `apriGpsDiTutteLeProve`

### `src/js/022d_registro-in-una-vista-su-pc.js`
34 righe · in `dist/DPSH.html` dalla riga 22032

`adattaRegistroAllaFinestra`

### `src/js/023_eliminazione-prova.js`
138 righe · in `dist/DPSH.html` dalla riga 22066

`impostaTastoEliminaProva`, `openDeleteSurveyModal`, `closeDeleteSurveyModal`

### `src/js/024_impostazioni-della-singola-prova.js`
995 righe · in `dist/DPSH.html` dalla riga 22204

`radiceProva`, `proveFisiche`, `proveInOrdine`, `prossimaLetteraInterpretazione`, `duplicaProvaComeInterpretazione`, `mostraSchedaProva`, `openSurveySettingsModal`, `apriDatiProgetto`, `closeSurveySettingsModal`, `renderSurveySwitcherBar`, `updateSurveySwitcherFade`, `promemoriaBackup`, `renderPromemoriaBackup`, `normalizzaPerRicerca`, `progettoCorrispondeRicerca`, `progettiVisibiliHome`, `vociOrdineProgetti`, `ordineProgettiScelto`, `scegliOrdineProgetti`, `ordinaProgetti`, `menuOrdineProgetti`, `renderFiltroStatoProgetti`, `ultimaProvaUsata`, `dataBreve`, `renderHomeProjects`, `openProject`, `showUndoBanner`, `hideUndoBanner`, `performUndo`, `impostaTastoEliminaProgetto`, `openConfirmDeleteModal`, `closeConfirmDeleteModal`, `deleteProject`, `performDeleteProject`, `duplicateProject`, `rinnovaIdProve`, `renderStatoAzioniProgetto`, `openProjectActionsModal`, `closeProjectActionsModal`

### `src/js/025_scelta-formato-backup.js`
295 righe · in `dist/DPSH.html` dalla riga 23199

`openBackupChoiceModal`, `closeBackupChoiceModal`, `avvisiPrimaExport`, `apriProvaPerCorreggere`, `renderRiepilogoPrimaExport`, `openExportModal`, `renderProveConsegna`, `ricordaSceltaProve`, `closeExportModal`

### `src/js/026_libreria-template-di-report.js`
602 righe · in `dist/DPSH.html` dalla riga 23494

`hrefSicuro`, `stileSanificato`, `sanificaHtmlTemplate`, `copiaSenzaChiaviRiservate`, `bloccoTemplateSanificato`, `fasciaTemplateSanificata`, `sanificaTemplateInIngresso`, `miniaturaTemplatePaginaHtml`, `miniaturaTemplateIndiceHtml`, `chiudiMenuAzioniTemplate`, `apriMenuAzioniTemplate`, `elencoTemplateReportOrdinato`, `openReportTemplatesModal`, `closeReportTemplatesModal`, `esportaBackupTemplateReport`, `esportaBackupTemplateReportOra`, `importaBackupTemplateReport`, `nomeTemplateGiaEsistente`, `prossimoNomeTemplateDisponibile`, `risolviCollisioneNomeTemplate`, `duplicaTemplateReport`, `creaTemplateVuoto`, `rinominaTemplateReport`, `eliminaTemplateReport`, `renderReportTemplatesList`

### `src/js/027_libreria-template-indice.js`
151 righe · in `dist/DPSH.html` dalla riga 24096

`elencoIndiceTemplateOrdinato`, `nomeIndiceTemplateGiaEsistente`, `prossimoNomeIndiceTemplateDisponibile`, `risolviCollisioneNomeIndiceTemplate`, `duplicaIndiceTemplate`, `creaNuovoTemplateIndice`, `rinominaIndiceTemplate`, `eliminaIndiceTemplate`, `renderIndiceTemplatesList`

### `src/js/028_editor-a-righe-del-template-di-report.js`
857 righe · in `dist/DPSH.html` dalla riga 24247

`copiaIntestazione`, `allineaIntestazioniEditor`, `nuovoIdEditor`, `nuovaPaginaVuota`, `seedPaginaDefaultClassico`, `computeEditorPreviewCtx`, `contenutoBloccoOPlaceholder`, `calcolaIndiciImmaginePerBlocco`, `calcolaIndiciFigulaPerBlocco`, `didascaliaAutomaticaBlocco`, `marcaNumeroDidascalia`, `ruoloFigura`, `elencoFigureTemplate`, `aggiornaCtxFotoEditor`, `trovaBloccoPerId`, `trovaVoceRigaPerId`, `trovaVoceRigaPerIdOvunque`, `trovaBloccoPerIdOvunque`, `trovaVoceContenenteBlocco`, `spanMinimoVoce`, `ridisegnaGraficoAnteprima`, `spanVoceInGriglia`, `flexEntryCss`, `styleDimensioneVoce`, `trovaIndiceRigaPerVoce`, `convertiScalaGraficoSalvata`, `convertiSeparatoriInDivisori`, `appiattisciRowSpanTemplate`, `rimuoviRiserveRowSpan`, `sanitizzaBlocchiFlowableIsolati`, `calcolaGruppiRowSpanPagina`, `rimuoviBloccoDaPagina`, `modalitaMobileTemplateEditor`, `inserisciBloccoATocco`

### `src/js/029_blocco-in-spostamento.js`
1613 righe · in `dist/DPSH.html` dalla riga 25104

`bloccoInSpostamento`, `avviaSpostamentoBlocco`, `annullaSpostamentoBlocco`, `eliminaBloccoInSpostamento`, `posaBloccoQui`, `avvisaSeBloccoContinuaSuPiuPagine`, `renderBarraSpostamento`, `evidenziaVoceSpostamentoNellaPalette`, `aprTendinaPaletteSeMobile`, `portaBloccoInVista`, `apriTendinaPaletteMobile`, `chiudiTendinaPaletteMobile`, `aggiornaIconaFabPalette`, `paginaGenerataDalProgramma`, `inserisciBloccoInPagina`, `catturaRettangoliEditor`, `calcolaPosizioneDropEditor`, `stimaAltezzaPerLarghezza`, `valutaQualitaPiazzamento`, `applicaMagneteDropEditor`, `messaggioQualitaDrop`, `applicaStatoQualitaGhost`, `mostraIndicatoreDropEditor`, `nascondiIndicatoreDropEditor`, `hostFloatingUiEditor`, `costruisciContenutoGhostTrascinamento`, `misuraDimensioneNaturaleGhost`, `creaGhostTrascinamentoEditor`, `posizionaGhostTrascinamentoEditor`, `rimuoviGhostTrascinamentoEditor`, `avviaTrascinamentoEditor`, `mostraCestinoTrascinamento`, `nascondiCestinoTrascinamento`, `aggiornaCestinoTrascinamento`, `avviaAutoScrollViewportEditor`, `avviaAutoScrollBordoEditor`, `fermaAutoScrollBordoEditor`, `gestisciSpostamentoEditor`, `terminaTrascinamentoEditor`, `tipiBloccoGiaUsatiNelTemplate`, `renderTemplateEditorPalette`, `mostraAnteprimaPaletteHover`, `nascondiAnteprimaPaletteHover`, `renderTemplateEditorPageControls`, `sincronizzaControlliMarginiSidebar`, `aggiornaStatiSezioniTemplate`, `cmMargine`, `mmDaCm`, `catturaRectBlocchiPerFlip`, `applicaFlipBlocchi`

### `src/js/030_guardia-contro-le-misure-degeneri.js`
1316 righe · in `dist/DPSH.html` dalla riga 26717

`filtraCategorieHtmlFlowable`, `costruisciHtmlBloccoEditor`, `renderaGruppoRowSpanEditor`, `renderTemplateEditorCanvas`, `selezionaBloccoEditor`, `deselezionaBloccoEditor`, `attivaGestureTapBloccoEditor`, `attivaChipSpostamentoBlocco`, `attivaDoppioTapResetSlider`, `confiniTaglioBlocco`, `mostraAnteprimaTaglio`, `nascondiAnteprimaTaglio`, `inserisciInterruzioneNelTesto`, `togliInterruzioneNelTesto`, `attivaManigliaScalaBlocco`

### `src/js/031_basi-del-carattere-per-i-blocchi-tabellari.js`
121 righe · in `dist/DPSH.html` dalla riga 28033

`baseFontBloccoTabellare`, `suddividiGruppoCategorie`, `ptDaFontScale`, `fontScaleDaPt`

### `src/js/032_controllo-numerico-condiviso.js`
80 righe · in `dist/DPSH.html` dalla riga 28154

`htmlSpiegazione`, `htmlInterruttore`, `htmlControlloNumerico`

### `src/js/033_schede-del-menu-del-blocco.js`
638 righe · in `dist/DPSH.html` dalla riga 28234

`spostaRimuoviNelMenuAltro`, `schedaDiSezione`, `fasciaDiSezioneMenu`, `riordinaSezioniAFasce`, `organizzaMenuInSchede`, `attivaTrasparenzaMenuDuranteRegolazione`, `collegaControlloNumerico`, `larghezzaRigaUtileMm`, `etichettaLarghezzaBlocco`, `attivaManigliaColspanBlocco`, `mostraEtichettaManigliaBlocco`, `nascondiEtichettaManigliaBlocco`, `catturaBordiAltriBlocchiEditor`, `mostraGuidaAllineamentoEditor`, `nascondiGuidaAllineamentoEditor`, `catturaBordiVerticaliAltriBlocchiEditor`, `mostraGuidaAllineamentoOrizzontaleEditor`, `nascondiGuidaAllineamentoOrizzontaleEditor`, `chiudiMenuBloccoEditor`

### `src/js/034_avvisi-che-non-restano-indietro.js`
2499 righe · in `dist/DPSH.html` dalla riga 28872

`idBloccoMenuAperto`, `firmaMisureBlocco`, `riallineaMenuBloccoAMisureNuove`, `tagliEPaginePerBlocco`, `condensaBloccoPerPagineMinime`, `riapplicaDivisioneAutomatica`, `riapplicaDivisioniAutomaticheTemplate`, `collassaMenuBloccoEditor`, `mostraBollicinaMenuBlocco`, `rimuoviBollicinaMenuBlocco`, `gestisciClickFuoriMenuBlocco`, `bilanciaRigaBlocco`, `riordinaAutomaticoPagina`, `apriMenuBloccoEditor`

### `src/js/035_editor-di-testo-per-i-blocchi-titolo-testo-richi.js`
795 righe · in `dist/DPSH.html` dalla riga 31371

`bloccoPiedeEditor`, `bloccoIntestazioneEditor`, `editorAttivo`, `dopoComandoTesto`, `collegaComandoTesto`, `pannelloDelPulsante`, `chiudiTuttiIPannelliTesto`, `creaEditorTesto`, `aggiornaSegnapostoTestoTemplate`, `apriTplTextEditor`, `chiudiTplTextEditor`, `chiudiTplTextEditorChiedendo`, `posizionaMenuBloccoEditor`, `applicaAltezzaMenuMobile`, `attivaRidimensionamentoMenuMobile`, `portaBloccoSopraIlMenu`, `attivaTrascinamentoMenuBloccoEditor`, `trovaRigaRealeInEccesso`, `rigaContieneBloccoBloccato`, `rigaHaBloccoGenuinamenteBloccato`, `spostaBlocchiInEccessoAllaPaginaSuccessiva`, `gestisciInserimentoBloccoNuovoConOverflow`

### `src/js/036_blocchi-flowable-allegato-formule-di-correlazion.js`
98 righe · in `dist/DPSH.html` dalla riga 32166

`trovaBloccoEPaginaPerId`, `paginaOrigineBlocco`, `coloreCategoriaBlocco`, `elencoSegmentiPaginaBlocco`

### `src/js/037_fase-c-avvisi-di-overflow-reali.js`
117 righe · in `dist/DPSH.html` dalla riga 32264

`calcolaAvvisiOverflowGruppiCategoria`, `ricalcolaAvvisiOverflowTuttiBlocchi`

### `src/js/038_fase-d-riconciliazione-editor-export.js`
704 righe · in `dist/DPSH.html` dalla riga 32381

`verificaPagineOrigineControMotoreReale`, `costruisciRigaContinuazionePagina`, `miniaturaPaginaContinuazione`, `sincronizzaFlussiBlocchiLunghi`, `mostraToastTemplateEditor`, `mostraLineaFinePaginaA4`, `adattaScalaEditorCanvas`, `impostaZoomEditorTemplate`, `adattaLarghezzaEditorTemplate`, `reimpostaZoomEditorTemplateAutomatico`, `aggiornaBottoneAnteprimaPulita`, `aggiornaBottoneFullscreenPreview`

### `src/js/039_fase-b-anteprima-di-stampa-reale.js`
977 righe · in `dist/DPSH.html` dalla riga 33085

`generaAnteprimaStampaReale`, `apriAnteprimaStampaReale`, `chiudiAnteprimaStampaReale`, `zoomAttualeEditorTemplate`, `neutralizzaIdentificatoriMiniatura`, `renderTemplateEditorPagesStrip`, `attivaModalitaSelezionePagine`, `togglePaginaSelezionata`, `esciModalitaSelezionePagine`, `eliminaPagineSelezionateEditor`, `gestisciSpostamentoPaginaEditor`, `mostraIndicatoreRiordinoPagine`, `nascondiIndicatoreRiordinoPagine`, `terminaRiordinoPagineEditor`, `impostaAnteprimePagineEspanse`, `aggiornaAnteprimePagineDopoCambioAltezza`, `cambiaPaginaEditor`, `eliminaPaginaEditor`, `aggiungiPaginaEditor`, `salvaUndoSnapshotEditor`, `scartaUltimoSnapshotEditor`, `undoTemplateEditor`, `redoTemplateEditor`, `ripristinaPagineEditor`, `aggiornaBottoneUndoEditor`, `marginiPaginaDiDefault`

### `src/js/040_lo-stile-del-testo-in-un-posto-solo.js`
42 righe · in `dist/DPSH.html` dalla riga 34062

`istantaneaTemplate`

### `src/js/041_le-eccezioni-di-stile-dichiarate.js`
43 righe · in `dist/DPSH.html` dalla riga 34104

`eccezioniDiStile`, `riportaAlloStileDelDocumento`

### `src/js/042_un-solo-blocco-di-testo-i-titoli-li-dichiara-il.js`
1651 righe · in `dist/DPSH.html` dalla riga 34147

`risolviTagInStampa`, `figuraBersagliataNelTemplate`, `cambiaTipoTagNelBlocco`, `marcaTitoliPerIndice`, `convertiBloccoTitoloInTesto`, `convertiTitoliDelTemplate`, `stileTestoDiDefault`, `stileTestoDelTemplate`, `pilaFont`, `cssVariabiliStileTesto`, `stileIndiceDiDefault`, `getIndiceTemplateIdPerProgetto`, `stileIndiceDelProgetto`, `fontSicuro`, `cssVariabiliStileIndice`, `separaNumeroDaEtichetta`, `numeriGerarchiciDiRighe`, `calcolaBudgetPaginaMm`, `apriTemplateEditor`, `chiudiTemplateEditor`, `templateEditorHasUnsavedChanges`, `richiediChiusuraTemplateEditor`, `salvaTemplateEditor`, `salvaTemplateEditorComeCopia`, `chiudiAlToccoFuori`, `renderTemplateEditorPreviewProjectSelector`, `renderTemplateEditorPreviewSurveySelector`, `aggiornaAvvisoTemplateEditorPreviewSurvey`, `aggiornaBottoneGridGuides`, `renderGrigliaGuidaEditor`, `attivaLongPressManigliePagina`, `nascondiManigliePaginaEditor`, `renderManigliePaginaEditor`, `resettaManigliaPagina`, `attivaTrascinamentoManigliaPagina`, `impostaDistanzaIntestazione`, `rehydrateProjectPhotosForExport`, `segnapostoFoto`, `placeholderizzaFotoProgetto`, `assemblaBlobConSegnaposto`, `contaFotoSenzaImmagine`, `avvisaFotoMancantiNelBackup`, `scaricaBlobJson`, `exportProjectJSON`, `statoConFotoPerExport`, `exportSingleJSON`

### `src/js/043_supporto-zip-nativo.js`
450 righe · in `dist/DPSH.html` dalla riga 35798

`ZIP_CRC32_TABLE`, `zipCrc32`, `zipDosDateTime`, `buildZipBlob`, `readZipStoreOnly`, `dataUrlToUint8Array`, `uint8ArrayToDataUrl`, `extFromMime`, `mimeFromZipExt`, `cloneProjectMetaSenzaFoto`, `leggiDataUrlFoto`, `respiraUnAttimo`, `estraiFotoProgettoPerZip`, `reidrataProgettoDaZip`, `scaricaBlobFile`, `exportProjectZip`, `exportProjectPhotos`, `exportGlobalZip`, `importProjectsFromZip`

### `src/js/044_fase-1-importazione-progetti-da-file-json.js`
492 righe · in `dist/DPSH.html` dalla riga 36248

`normalizeImportedJsonToProjects`, `rendiSicuriDatiImportati`, `importProjectsFromJSON`, `salvaImmaginiImportate`, `scriviImmagineImportataSenzaSovrascrivere`, `controllaFotoImportate`, `testoAnomalieImportate`, `testoFotoAssentiNelFile`, `handleImportJsonFile`, `proveDelPerimetroConsegna`

### `src/js/044a_librerie-che-viaggiano-col-progetto.js`
248 righe · in `dist/DPSH.html` dalla riga 36740

`contenutoVoceLibreria`, `templateReportEffettivo`, `templateIndiceEffettivo`, `templateIntroduzioneEffettivo`, `stratiDelProgetto`, `librerieUsateDa`, `nomeLiberoInLibreria`, `accogliLibrerie`, `estraiLibrerieDalFile`, `testoLibrerieAccolte`, `riallineaProgettoAperto`, `nomeFileProgetto`

### `src/js/044b_pacchetto-di-progetto.js`
585 righe · in `dist/DPSH.html` dalla riga 36988

`nomeDispositivo`, `impostaNomeDispositivo`, `suQuestoDispositivo`, `idImmaginiNelHtml`, `immaginiDelProgetto`, `leggiImmagineArchiviata`, `prefissoDataUrl`, `byteDaDataUrl`, `dataUrlDaByte`, `estensioneDaPrefisso`, `improntaProgetto`, `impronteImmaginiQui`, `conteggiProgetto`, `correzioniDelProgetto`, `formaSalvataProgetto`, `stimaPacchetto`, `formattaMegabyte`, `creaPacchettoProgetto`, `vociSonoUnPacchetto`, `leggiPacchetto`, `confrontaConPresente`, `nomeCopiaDaPacchetto`, `applicaPacchetto`

### `src/js/044c_finestre-porta-e-ricevi.js`
283 righe · in `dist/DPSH.html` dalla riga 37573

`plurale`, `maiuscolaIniziale`, `numeriPassaggioHtml`, `apriPortaProgetto`, `chiudiPortaProgetto`, `creaEScaricaPacchetto`, `cambiaNomeDispositivo`, `apriRiceviProgetto`, `chiudiRiceviProgetto`, `testoConfrontoRicevi`, `renderRiceviProgetto`, `renderBottoniRicevi`, `confermaRicevi`

### `src/js/044d_esporta-progetto-zip.js`
335 righe · in `dist/DPSH.html` dalla riga 37856

`pacchettoErroreAnnullato`, `pacchettoEAnnullato`, `nomeFilePacchetto`, `leggimiPacchetto`, `costruisciPacchettoProgetto`, `pacchettoMostra`, `pacchettoApriFinestra`, `pacchettoChiudiFinestra`, `pacchettoAnnulla`, `pacchettoPuoCondividere`, `esportaCantiereZip`

### `src/js/045_esportazione-pdf.js`
431 righe · in `dist/DPSH.html` dalla riga 38191

`descriviFoglioTavole`, `popolaListaProveEsportazionePdf`, `impostaTemplateReportProva`, `popolaSelettoreTemplateBulkEsportazionePdf`, `elencoProveSelezionateEsportazionePdf`, `stimaPagineProva`, `stimaByteFotoOriginale`, `fattoreDimensioneJpeg`, `formattaBytesEsportazione`, `aggiornaStimaEsportazionePdf`, `apriEsportazionePdfModal`, `chiudiEsportazionePdfModal`

### `src/js/046_modal-personalizza-indice.js`
1567 righe · in `dist/DPSH.html` dalla riga 38622

`applicaZoomIndicePers`, `adattaZoomIndicePers`, `apriModalPersonalizzaIndice`, `chiudiModalPersonalizzaIndice`, `etichetteIndiceAnteprima`, `righeIndiceAnteprima`, `aggiornaAnteprimaIndicePersonalizza`, `renderModalPersonalizzaIndice`, `sincronizzaTemplateEditorConStatoSalvato`, `htmlDocumentoStampa`, `avviaGenerazioneEsportazionePdf`, `getBulkImportStartDepth`, `openBulkImportModal`, `closeBulkImportModal`, `parseBulkImportNumbers`, `updateBulkImportCount`, `openNewProjectModal`, `closeNewProjectModal`, `openNewSurveyModal`, `closeNewSurveyModal`, `cancelNewSurveyModal`, `confirmNewSurvey`, `exportProjectKML`, `exportSingleSurveyKML`, `nomeFoglioExcelValido`, `exportProjectExcel`, `setupLongPress`, `openPhotoDB`, `savePhotoToIDB`, `salvaFotoConGaranzia`

### `src/js/047_spazio-occupato-e-foto-orfane.js`
185 righe · in `dist/DPSH.html` dalla riga 40189

`elencaContenutoIDB`, `idFotoAncoraInUso`, `idImmaginiDiUnaNota`, `idImmaginiNoteAncoraInUso`, `formattaByte`, `calcolaSpazioOccupato`, `eliminaFotoOrfane`, `svuotaDatabaseImmagini`

### `src/js/048_copie-automatiche.js`
410 righe · in `dist/DPSH.html` dalla riga 40374

`openCopieDB`, `firmaTesto`, `riassuntoStatoPerCopia`, `copieDaEliminare`, `aggiornaIdProtettiDalleCopie`, `caricaIndiceCopieAutomatiche`, `potaCopieAutomatiche`, `scriviCopiaAutomatica`, `scriviCopiaAutomaticaOra`, `copiaPrimaDi`, `copiaOChiedi`, `leggiCopiaAutomatica`, `ripristinaProgettoDaCopia`, `formattaQuandoCopia`, `testoSicuro`, `apriCronologia`, `chiudiCronologia`, `renderCronologia`, `aggiornaRiepilogoCopieEBackup`, `registraBackupCompleto`

### `src/js/049_confronto-tra-prove.js`
667 righe · in `dist/DPSH.html` dalla riga 40784

`colonnaStratigrafica`, `serieConfrontoProva`, `massimoTondo`, `proveConfrontabili`, `apriConfrontoProve`, `chiudiConfrontoProve`, `datiConfronto`, `disegnoConfronto`, `svgDaDisegno`, `testoWinAnsi`, `larghezzaTestoPdf`, `coloreRgbPdf`, `pdfDaDisegno`, `renderConfrontoProve`, `disegnoConfrontoPerFile`, `scaricaConfronto`, `aggiornaPannelloSpazio`, `avvisaFotoNonSalvate`, `getPhotoFromIDB`, `deletePhotoFromIDB`, `saveNoteImageToIDB`, `getNoteImageFromIDB`, `deleteNoteImageFromIDB`

### `src/js/050_note-di-progetto-pagina-unica-di-appunti-per-pro.js`
571 righe · in `dist/DPSH.html` dalla riga 41451

`creaEditorNote`, `aggiornaSegnapostoNota`, `htmlNotaCorrente`, `immagineSelezionataNota`, `aggiornaStatoBarraNote`, `comandoBloccoNota`, `getProjNotes`, `censisciVocabolarioNota`, `invariantiNota`, `confrontaInvariantiNota`, `ripuliscoHtmlIncollatoNota`, `convertiNotaAlNuovoSchema`, `diagnosticaMigrazioneNote`, `rehydrateNoteImagesInDom`, `rehydrateNoteImagesInHtmlString`

### `src/js/051_la-barretta-sulla-selezione.js`
55 righe · in `dist/DPSH.html` dalla riga 42022

`nascondiBollaSelezione`, `aggiornaBollaSelezione`

### `src/js/052_ricerca-nelle-note.js`
407 righe · in `dist/DPSH.html` dalla riga 42077

`pluginRicercaNote`, `ricalcolaRicercaNota`, `vaiAOccorrenzaNota`, `cercaNelleAltreNote`, `renderAltreNoteTrovate`, `apriRicercaNote`, `chiudiRicercaNote`, `aggiornaRicercaNote`, `preparaNotaPerIlMotore`, `renderRigaConversioneNota`, `apriNoteProgetto`, `salvaNoteProgettoCorrente`, `salvaNoteSeInSospeso`, `chiudiNoteProgetto`, `noteDelProgettoCorrente`, `inserisciImmagineDataUrlNellaNota`, `inserisciImmagineNellaNota`

### `src/js/053_il-menu-della-chiocciola.js`
528 righe · in `dist/DPSH.html` dalla riga 42484

`inserisciTabellaNellaNota`, `aggiornaBarraTabellaNota`, `aggiornaPulsanteAllineamento`, `applicaEvidenziatoreNota`

### `src/js/054_selettore-foto-del-progetto-riusato-per-inserire.js`
77 righe · in `dist/DPSH.html` dalla riga 43012

`raccogliFotoProgetto`, `chiudiSelettoreFotoProgetto`, `apriSelettoreFotoProgetto`

### `src/js/055_dimensione-rimozione-di-unimmagine-gia-nella-not.js`
178 righe · in `dist/DPSH.html` dalla riga 43089

`nascondiBarraImmagineNota`, `aggiornaBarraImmagineNota`, `leggiStileImmagineNota`, `componiStileImmagineNota`, `aggiornaAttributiImmagineNota`

### `src/js/056_la-schermata-di-composizione-dellinquadramento.js`
217 righe · in `dist/DPSH.html` dalla riga 43267

`impostazioniMappaDaBlocco`, `testoEtichettaComposizione`, `testoEtichettaInsetComposizione`, `disegnaComposizione`, `scambiaElementoComposizione`, `aggiornaNordComposizione`, `aggiornaScalaComposizione`

### `src/js/057_un-cronometro-dentro-lapp.js`
390 righe · in `dist/DPSH.html` dalla riga 43484

`oraPrecisa`, `misura`, `riportaMisura`, `rif`, `rifTutti`, `aggiornaBarraComposizione`, `apriComposizioneMappa`, `chiudiComposizioneMappa`

### `src/js/058_il-pannello-dello-stile-del-testo.js`
439 righe · in `dist/DPSH.html` dalla riga 43874

### `src/js/059_ritaglio-delle-immagini-uno-strumento-solo-per-t.js`
274 righe · in `dist/DPSH.html` dalla riga 44313

`proporzioneRitaglio`, `limitaRiquadroRitaglio`, `applicaProporzioneRitaglio`, `ridisegnaRitaglio`, `angoliRiquadroRitaglio`, `puntoRitaglio`, `apriRitaglioImmagine`, `chiudiRitaglio`, `ritagliaImmagineArchiviata`

### `src/js/060_strumento-di-disegno-un-piccolo-editor-di-forme.js`
859 righe · in `dist/DPSH.html` dalla riga 44587

`nuovoStatoDisegno`, `riquadroForma`, `angoliRiquadro`, `formaSelezionata`, `percorsoRettangolo`, `tracciaPercorsoForma`, `disegnaTesto`, `disegnaForma`, `ridisegnaCanvasNota`, `getNoteDrawPoint`, `formaSottoIlPunto`, `manigliaSottoIlPunto`, `selezionaForma`, `aggiornaBarraFormaDisegno`, `applicaColoreDisegno`, `aggiornaPastiglieColoreDisegno`, `renderNoteDrawColors`, `etichettaSfondoDisegno`, `impostaSfondoDisegno`, `evidenziaScelteSfondoDisegno`, `usaImmagineComeSfondoDisegno`, `finalizzaPoligonoCorrente`, `chiediTestoDisegno`, `aggiornaStrumentoDisegno`, `apriStrumentoDisegno`, `chiudiStrumentoDisegno`, `noteHtmlToPlainText`

### `src/js/061_la-mappa-provider-geometria-finestra-continua.js`
1667 righe · in `dist/DPSH.html` dalla riga 45446

`wmsDisponibili`, `ETICHETTE_MAPPA_URL`, `tessereXDaLng`, `tessereYDaLat`, `lngDaTessereX`, `latDaTessereY`, `calcolaTessereFinestra`, `htmlTessereFinestra`, `puntoNellaFinestra`, `riquadroGeograficoFinestra`, `inquadraturaPerPunti`, `testoEtichettaAutomatica`, `inquadraturaSicura`, `convertiInquadramentoVecchio`, `htmlPinMappa`, `htmlSimboloProvaMappa`, `htmlBarraScalaMappa`, `posizioneElementoMappa`, `htmlNordMappa`, `htmlInsetRegionaleMappa`, `puntiProveDelProgetto`, `buildMappaInquadramentoHtml`, `noteHtmlToMarkdown`, `scaricaBlob`, `nomeFileNotaCorrente`, `documentoNotaStampa`, `parseExifGps`, `parseExifData`, `parseExifDateStr`, `handlePhotoFileSelected`, `renderPhotoGallery`, `openPhotoPreview`, `closePhotoPreview`, `backToPhotosModalFromPreview`, `deletePhoto`, `aggiornaRigaRifiuto`, `openEditModal`, `origineIntervallo`, `closeModal`, `openQuickFaldaModal`, `closeQuickFaldaModal`, `openStratiModal`, `closeStratiModal`

### `src/js/062_fase-2-riconoscimento-automatico-degli-strati.js`
213 righe · in `dist/DPSH.html` dalla riga 47113

`openStratiChoiceModal`, `closeStratiChoiceModal`, `updateAutoStratiPreview`, `openAutoStratiParamsModal`, `closeAutoStratiParamsModal`, `handleOpenAutoStrati`, `buildInquadramentoSatellitareHtml`

### `src/js/063_pagina-prova-replica-fedele-del-layout-di-riferi.js`
925 righe · in `dist/DPSH.html` dalla riga 47326

`arricchisciLogsConNsptRpd`, `tintaDatiProva`, `disposizioneSchede`, `buildDatiBoxHtml`, `buildColpiNsptTableHtml`, `scalaAssePulita`, `profonditaAsseAutomatica`, `spezzaEtichettaInRighe`, `disponiEtichetteSenzaSovrapposizioni`, `legendaGrafico`, `profonditaMassimaProgetto`, `profonditaAsseEffettiva`, `larghezzaBloccoGraficoPx`, `buildStratigrafiaColpiRpdSvg`

### `src/js/064_motore-di-rendering-dei-template-di-report.js`
209 righe · in `dist/DPSH.html` dalla riga 48251

`generatoreCasualeDaSeme`, `espandiAlternativeTesto`, `elencoItaliano`, `formattaCoordinateProve`, `valoriDellaProva`, `valoriCantiere`

### `src/js/065_i-tag-il-registro.js`
351 righe · in `dist/DPSH.html` dalla riga 48460

`eRiferimentoFigura`, `bersaglioFigura`, `etichettaBersaglioFigura`, `tagFigureDisponibili`, `etichettaVuotaFigura`, `etichettaTag`, `tagPerTipo`, `progettoPerTag`, `aggiornaPastiglieTag`, `nomeProgettoPerAvviso`, `scriviDatoCantiere`, `valoriCantiereConCorrezioni`, `applicaSegnapostiTesto`, `generaTestoDaModello`, `contaDatiMancanti`

### `src/js/066_il-modello-predefinito-ricavato-da-due-relazioni.js`
1336 righe · in `dist/DPSH.html` dalla riga 48811

`bloccoHaFontRegolabile`, `limitiFontScaleBlocco`, `scalaMinimaBlocco`, `scambiaOrdineInRiga`, `dividiLarghezzaRigaEvenmente`, `trovaBloccoPerTipoInPagina`, `rilevaPatternLayoutPagina`, `applicaPatternLayoutEditor`, `renderSuggerimentiLayoutEditor`, `segmentiTesto`, `eBloccoSpezzabile`, `indiciForzatiBlocco`, `stileGrigliaTabellaBlocco`, `elencoCategorieBlocco`, `escapeHtmlDidascalia`, `avvolgiConDidascalia`, `avvolgiScopeFlowable`, `applicaInterruzioniPaginaManualiCategoria`, `buildBlockContentHtml`, `distanzaIntestazioneMm`, `respiroIntestazioneMm`, `dimensioniImmagineDataUrl`, `altezzaIntestazioneMm`, `margineConIntestazione`, `distanzaPiedeMm`, `altezzaPiedeMm`, `htmlPiedeNelMargine`, `htmlIntestazioneNelMargine`, `buildPaginaHeaderFooterHtml`, `buildContenutoVoceStampa`, `buildGruppoRowSpanHtmlStampa`, `buildRigheSottoinsiemeHtml`, `buildPaginaRigheHtml`, `getReportTemplateIdPerProva`

### `src/js/067_generatore-html-per-singola-prova.js`
161 righe · in `dist/DPSH.html` dalla riga 50147

`buildSurveyReportHtml`, `getIconSpriteHtml`

### `src/js/068_compressione-foto-per-lexport-pdf.js`
538 righe · in `dist/DPSH.html` dalla riga 50308

`comprimiImmagineDataUrl`, `risolviEComprimiFotoUrl`, `cssFontIncorporati`, `cssRegoleFoglio`, `cssAnteprimaComeStampa`, `cssContenutoTesto`, `getReportPrintStyleBlock`, `getControlloImpaginazioneScriptTag`

### `src/js/069_lattesa-delle-mappe.js`
309 righe · in `dist/DPSH.html` dalla riga 50846

`buildIndiceReportCompletoHtml`, `buildSelezioneReportHtml`

### `src/js/070_impaginazione-reale-di-riepilogo-dettagliata-all.js`
217 righe · in `dist/DPSH.html` dalla riga 51155

`misuraFigliPerStampaMm`, `fondiTitoliConSuccessivo`, `impaginaBlocchiSuPagineFisiche`

### `src/js/071_motore-unificato-di-impaginazione.js`
808 righe · in `dist/DPSH.html` dalla riga 51372

`larghezzaPctBlocco`, `costruisciAtomiPaginaTemplate`, `costruisciPagineTemplateUnificato`, `provaSinteticaIntroduzione`, `raccogliVociIndice`, `numeraFigureERisolviRiferimenti`, `numeraPagineDocumento`, `buildCompleteReportHtml`, `downloadAllSurveyPhotosJpg`, `openSurveyPhotosModal`, `closeSurveyPhotosModal`, `handleGalleryBatchFiles`

### `src/js/071a_barre-del-pc.js`
195 righe · in `dist/DPSH.html` dalla riga 52180

`scriviSeCambia`, `renderPc`, `contaStrati`, `miniProfilo`, `miniPianta`, `apriDalLato`

### `src/js/071b_registro-sul-pc.js`
152 righe · in `dist/DPSH.html` dalla riga 52375

`segnaRigaScelta`, `scegliRiga`, `righeVisibili`, `staScrivendo`, `chiudiMenuRiga`, `apriMenuContesto`, `apriMenuRiga`, `apriMenuProgetto`, `apriMenuProva`

### `src/js/071c_palette-e-scorciatoie.js`
369 righe · in `dist/DPSH.html` dalla riga 52527

`comandiPc`, `omnibarAperta`, `testoNote`, `apriProvaOvunque`, `vaiAImpostazione`, `vociOmnibar`, `punteggioVoce`, `evidenzia`, `renderPalette`, `segnaVoceScelta`, `apriPalette`, `chiudiPalette`, `eseguiVocePalette`, `apriScorciatoie`

### `src/js/071d_contatore-sul-pc.js`
21 righe · in `dist/DPSH.html` dalla riga 52896

`interruttoreContatorePc`

### `src/js/071e_guida-rapida-pc.js`
54 righe · in `dist/DPSH.html` dalla riga 52917

`mostraPassoGuida`, `apriGuidaRapida`, `chiudiGuidaRapida`, `forseGuidaRapida`

### `src/js/071f_terreno-dtm.js`
468 righe · in `dist/DPSH.html` dalla riga 52971

`utmDaGeo`, `geoDaUtm`, `puntoNelCrs`, `crsDaEpsg`, `leggiAsciiGrid`, `tagTiff`, `lzwTiff`, `inflateZlib`, `leggiGeoTiff`, `proveConCoordinate`, `ritaglioDtmPerProgetto`, `ritaglioDaSorgente`, `quoteDtm`, `quotaDtm`, `quotaDtmXY`, `quotaDellaProva`, `formattaMetri`, `renderTerreno`, `apriTerreno`, `chiediFileDtm`

### `src/js/071fs_sistema-di-riferimento.js`
66 righe · in `dist/DPSH.html` dalla riga 53439

`elencoSr`, `srDelProgetto`, `nomeBreveSr`, `coordNelSr`, `testoCoordSr`, `geoDaTestoUtm`, `aggiornaCampiSr`

### `src/js/071g_sezione.js`
432 righe · in `dist/DPSH.html` dalla riga 53505

`proveDellaSezione`, `nomeDpsh`, `datiSezione`, `occorrenzeFasce`, `correlazioniSezione`, `pathColpi`, `svgSezione`, `renderSezione`, `ridisegnaSezione`, `apriSezione`, `htmlFumettoProva`, `apriFumettoProva`, `chiudiFumetti`

### `src/js/071h_vista-3d.js`
2484 righe · in `dist/DPSH.html` dalla riga 53937

`triangolaDelaunay`, `datiVista3d`, `datiVista3dSenzaDtm`, `latiDelleProve`, `modelloCorrelazione`, `modelloSolido`, `involucroModello`, `colonnaSolido`, `splineSolido`, `ritagliaPoligono`, `dentroPoligono`, `areaPoligono`, `poligonoConvesso`, `triangoliPoligono`, `triangoliniPoligono`, `stratoAProfondita`, `google3d`, `sceltaSfondo3d`, `salvaSceltaSfondo3d`, `sfondoPerScena`, `caricaImmagine3d`, `scena3d`, `svgDaScena`, `vociLegenda3d`, `impaginaLegenda3d`, `conLegenda3d`, `disegnaScena`, `provaNelPunto`, `renderVista3d`, `apriVista3d`, `vistaIniziale3d`, `ridisegna3d`, `pizzicoDita`, `sposta3d`, `puntoCanvas`, `zoom3d`, `accendiSolido3d`, `livelliChiusi3d`, `righeLivelli3d`, `gruppoChiuso3d`, `renderLivelli3d`, `movimentoRidotto3d`, `dissolvenza3d`, `accendiLivello3d`, `etichetteLivello3d`, `inquadraLivello3d`, `menuQui`, `menuOpacita3d`, `menuLivello3d`, `gradi`, `sincronizzaCursori3d`, `vaiAVista3d`, `giri`, `segnoGradi`, `bussola3d`, `avviaMoto3d`, `riempiSceltaSfondo3d`, `aggiornaStatoSfondo3d`, `cambiaSfondo3d`, `sincronizzaFoto3d`, `conSolido`, `nomeFileProgetto3d`, `svgVista3dDaScaricare`, `modelloObj`

### `src/js/071i_export-word.js`
1205 righe · in `dist/DPSH.html` dalla riga 56421

`xmlTesto`, `tw`, `coloreWord`, `primaFamiglia`, `nuovoContestoWord`, `nascostoWord`, `decoratoWord`, `soloInLineaWord`, `testoVisibileWord`, `rettangoloContenuto`, `ritagliaWord`, `rettangoloWord`, `raccogliFoglieWord`, `fogliaTestoWord`, `paragrafoVuotoWord`, `cellaVuotaWord`, `tblPrWord`, `tabellaDisposizioneWord`, `chiudiCellaWord`, `immagineInLineaWord`, `disegnaSuTelaWord`, `rasterizzaWord`, `proprietaRunWord`, `testoTrasformato`, `runDelParagrafoWord`, `altezzaRigaWord`, `righeDelTestoWord`, `stringiRunWord`, `marcatoreElencoWord`, `paragrafoWord`, `bordiWord`, `marginiCellaWord`, `sfondoEffettivoWord`, `contenutoWord`, `scatolaWord`, `tabellaWord`, `dividiWord`, `fogliaWord`, `impaginaWord`, `campoWord`, `segnalibroWord`, `sommarioWord`, `piedeWord`, `piedeInSezione`, `piedeTemplateWord`, `numerazioneInSezione`, `intestazioneWord`, `immagineAncorataWord`, `ancoraWord`, `cartaDelFoglioWord`, `intestazioneInSezione`, `partiIntestazioneWord`, `foglioWord`, `chiusuraSezioneWord`, `incorporaImmaginiWord`, `pacchettoDocxWord`, `segmentiWord`, `flussoWord`, `conDocumentoStampaMisurato`, `docxDaDocumentoMisurato`, `documentoStampaInDocx`

### `src/js/071i1_pdfa-scrittore.js`
280 righe · in `dist/DPSH.html` dalla riga 57626

`caricaPdfLib`, `woff2InTrueType`, `pdfaDueCifre`, `dataPdfA`, `pdfaXml`, `pdfaHex`, `xmpPdfA`, `coloreRgbPdfA`, `creaScrittorePdfA`

### `src/js/071i2_pdfa-dal-documento-di-stampa.js`
560 righe · in `dist/DPSH.html` dalla riga 57906

`fontIncorporatiPerPdfA`, `nuovaPaginaPdf`, `opacitaEffettivaPdf`, `sbiadisciPdf`, `decorazioniPdf`, `pulisciTestoPdf`, `fontePdfPerStile`, `trattiPerFontePdf`, `paroleDelNodoPdf`, `righeDelNodoPdf`, `decorazioneTestoPdf`, `testoDelNodoPdf`, `marcatorePdf`, `testoDelElementoPdf`, `paragrafoPdf`, `byteDaDataUrlPdf`, `jpegDirettoPdf`, `inquadraImmaginePdf`, `rgbDaTelaPdf`, `jpegDaTelaPdf`, `immagineImgPdf`, `immaginePdf`, `contenutoPdf`, `scatolaPdf`, `tabellaPdf`, `foglieInPdf`, `paginaDelFoglioPdf`, `tagliPaginaPdf`, `operazioniDellaPaginaPdf`, `pagineDelFlussoPdf`, `pdfaDaDocumentoMisurato`, `documentoStampaInPdfA`

### `src/js/071j_sezioni-tracciate.js`
608 righe · in `dist/DPSH.html` dalla riga 58466

`tracceDelProgetto`, `estremiTraccia`, `prossimoNomeTraccia`, `tracciaInScena`, `tracceNellaScena3d`, `puntoAlSuolo3d`, `clicTracciaSezione3d`, `seguiTracciaSezione3d`, `creaGrigliaSezioni3d`, `contornoPerGriglia3d`, `creaGrigliaAssi3d`, `tagliaSullaTraccia3d`, `agganciaTaglioAllaGriglia3d`, `spostaTraccia`, `fineSpostaTraccia`, `tracciaSottoIlMouse3d`, `iniziaSpostaTraccia3d`, `seguiSpostaTraccia3d`, `tracciaDalTaglio3d`, `datiSezioneTracciata`, `svgSezioneTracciata`, `renderElencoSezioni3d`, `renderVistaSezioneTracciata`, `mappaSatelliteTraccia`, `paginaPdfSezione`, `esportaPdfSezioni`

### `src/js/071k_geopackage.js`
166 righe · in `dist/DPSH.html` dalla riga 59074

`realeSqlite`, `varintSqlite`, `recordSqlite`, `cellaSqlite`, `pagineTraboccoSqlite`, `paginaFogliaSqlite`, `foglieSqlite`, `paginaInternaSqlite`, `fileSqlite`

### `src/js/071l_mappa-progetto.js`
291 righe · in `dist/DPSH.html` dalla riga 59240

`schedaProvaMappaHtml`, `renderSchedaProvaMappa`, `disegnaProveMappa`, `iconaProvaMappa`, `scegliProvaMappa`, `spostaProvaDallaMappa`, `SFONDI_2D`, `livelloSfondo2d`, `sfondoMappaProgetto`, `sfondo2dAcceso`, `mostraMappa2d`, `inquadraTutteMappa2d`, `mostraProvaSullaMappa`, `vaiAllaProva2d`, `modificaDatiDallaMappa`, `apriMappaProgetto`, `chiudiMappaProgetto`

### `src/js/071m_area-mappa.js`
572 righe · in `dist/DPSH.html` dalla riga 59531

`areaMappaAperta`, `modoAreaMappa`, `infoAreaMappa`, `coordinateAreaMappa`, `misuraAreaMappa`, `scegliStrumentoMappa`, `areaMetriQuadri`, `testoMisura`, `metriPrecisi`, `togliMisura`, `disegnaMisura2d`, `misuraNellaScena3d`, `finisciMisura`, `togliProfilo2d`, `disegnaProfilo2d`, `clicStrumentoMappa2d`, `clicStrumentoMappa3d`, `agganciaMappa2d`, `vociProvaMappa`, `menuProvaMappa`, `menuTracciaMappa`, `vociTracciaMappa`, `mostraSchedaComandi`, `scriveInUnCampo`, `caricaRotazioneMappa`, `pannelli`, `elPannello`, `telefonoMappa`, `salvaPannelli`, `applicaPannelli`, `riduciPannello`, `chiudiPannello`, `trascinaPillola`, `aggiornaBussola2d`, `giraMappa2d`, `angoloBussola2d`

### `src/js/071m2_bussola-del-telefono.js`
79 righe · in `dist/DPSH.html` dalla riga 60103

`gradiDaOrientamento`, `gradiMorbidi`, `nomeDirezione`, `sullOrientamento`, `tastoBussolaTel`, `mostraStatoBussolaTel`, `spegniBussolaTel`, `accendiBussolaTel`, `statoBussolaTel`, `alternaBussolaTel`

### `src/js/071m3_qr-trasferimento.js`
311 righe · in `dist/DPSH.html` dalla riga 60182

`qrBase45Codifica`, `qrBase45Decodifica`, `qrCrc32`, `qrFlusso`, `qrImpacchetta`, `qrDisimpacchetta`, `qrFrames`, `qrNuovoRicevitore`, `qrMiniaturaFoto`, `qrSenzaImmaginiNelleNote`, `qrCostruisciProgetto`, `qrPreparaProgetto`, `qrEl`, `qrTempo`, `qrScelteDallaFinestra`, `qrAggiornaRiepilogo`, `qrDisegnaScelte`, `apriQr`, `chiudiQr`, `qrScheda`, `qrMostraFrame`, `qrAvviaTimer`, `qrAvvia`, `qrFerma`, `qrVelocita`, `qrMostraAvanzamento`, `qrLeggiTesto`, `qrImportaLetto`, `qrSpegniCamera`, `qrAvviaCamera`

### `src/js/071n_disegni.js`
105 righe · in `dist/DPSH.html` dalla riga 60493

`disegniDelProgetto`, `creaDisegno`, `salvaPoligonoDisegnato`, `testoDisegno`, `centroDisegno`, `disegniNellaMappa2d`, `disegniNellaScena3d`, `menuDisegno`, `vociDisegno`

### `src/js/071o_stili-livelli.js`
184 righe · in `dist/DPSH.html` dalla riga 60598

`etichettaDi`, `gruppoDiStile`, `tipoStile`, `stileLivello`, `stileProprio`, `togliStiliPropri`, `campiStile`, `trattoDash`, `trattoLeaflet`, `salvaStile`, `chiudiStileLivello`, `apriStileLivello`

### `src/js/071p_esporta-viste-3d.js`
1435 righe · in `dist/DPSH.html` dalla riga 60782

`vociEsportazione3d`, `conVista3dTemporanea`, `vistaBaseVoce3d`, `vistaPronta3dTavola`, `versoDaAz3d`, `ingombroScena3d`, `spostaCentroDiPixel3d`, `scenaVoce3d`, `puntoTerrenoTavola3d`, `mosaicoSfondo3d`, `sfondoEsportabile3d`, `MEZZO_ESTESO_3D`, `sfondoEstesoEsportabile3d`, `mezzoVisibile3d`, `conSfondoEsportabile3d`, `telaSezione2d`, `immagineDaSvg3d`, `ingombroPiantaSezione`, `scalaPiantaSezione`, `kPiantaSezione`, `altezzaPiantaSezione`, `largaPianta`, `disegnaPiantaTraccia3d`, `telaVoce3d`, `byteDaTela3d`, `pdfDaTavole3d`, `T3`, `foglioTavole3d`, `altoTitoloPdf3d`, `misureTavola3d`, `memoriaTavole3d`, `opzioniTavole3d`, `sfondoEstesoAnteprima3d`, `tipoTavola3d`, `versoTavola3d`, `spostaPagina3d`, `ordinaPagine3d`, `sottotitoloTavola3d`, `apriTavole3d`, `avvisoDatiCambiati3d`, `aggiungiVista3d`, `togliVistaAggiunta3d`, `improntaDatiTavole3d`, `tavolaBloccata3d`, `bloccaTavolaScelta3d`, `miniatureTavole3d`, `tavoleSporche3d`, `statoSalvataggioTavole3d`, `firmaStileTavole`, `salvaTavole3d`, `chiudiTavole3d`, `salvaMemoriaTavole3d`, `titoloTavola3d`, `e2dTavola3d`, `aggiornaTitoloVista3d`, `renderProveTavola3d`, `aggiornaTastiVista3d`, `scegliVistaTavola3d`, `renderElencoTavole3d`, `disegnaMiniaturaTavola3d`, `aggiornaContoTavole3d`, `mostraTavola3d`, `regolaTavola3d`, `ridisegnaTavola3d`, `aggiornaMiniaturaScelta3d`, `esportaTavole3d`, `pagElenco`, `sottoMeta3d`, `sceltaTasti3d`, `regolaPianta3d`, `sulBordoPianta3d`, `finePianta3d`, `lasciaPianta3d`, `rimettiPianta3d`, `dopoProveTavola3d`, `titoloScelta3d`, `dopoTitolo3d`, `puntoTavola3d`, `elementoSotto3d`, `fineTrascina3d`, `renderTemplateTavole3d`

### `src/js/071q_perimetro-modello.js`
374 righe · in `dist/DPSH.html` dalla riga 62217

`disegnoPerimetro`, `puntiPerimetroModello`, `perimetroModelloXY`, `usaPerimetroModello`, `renderPerimetroModello3d`, `leggiZipQualsiasi`, `wgs84DaEd50`, `crsPerimetroDaEpsg`, `crsDaWkt`, `gradiDaCrs`, `leggiGeoJson`, `leggiKml`, `leggiShp`, `nomiDaDbf`, `leggiGeoPackage`, `wkbPoligoni`, `poligoniDaFile`, `importaPerimetro`

### `src/js/071r_sposta-sulla-mappa.js`
174 righe · in `dist/DPSH.html` dalla riga 62591

`modificaMappaAttiva`, `aggiornaManiglieMappa`, `trascinamentoMappa`, `lasciaAlt`, `dopoModificaDisegno`, `manigliaDisegno2d`, `maniglieDisegno2d`, `schermoDalSuolo3d`, `maniglieNellaScena3d`, `elementoDaSpostare3d`, `iniziaSposta3d`, `seguiSposta3d`, `fineSposta3d`, `spostando3d`

### `src/js/071s_simbologia.js`
84 righe · in `dist/DPSH.html` dalla riga 62765

`ingombroSimbolo`, `svgFormaSimbolo`, `svgSimboloRiquadro`, `cssEtichetta`, `postoEtichetta`, `iconaSimbolo2d`, `simboloScena3d`, `etichettaScena3d`

### `src/js/071t_esporta-gis.js`
424 righe · in `dist/DPSH.html` dalla riga 62849

`rgbColore`, `coloreQgis`, `coloreKml`, `xmlEsc`, `wkb`, `coord`, `wkbPunto`, `wkbLinea`, `wkbPoligono`, `wkbMultiTriangoli`, `gpkgGeom`, `wktUtm`, `proprietaQml`, `simboloQml`, `simboloPuntoQml`, `trattoQml`, `simboloLineaQml`, `simboloPoligonoQml`, `etichetteQml`, `documentoQml`, `categorieQml`, `etichettePerRegolaQml`, `renderer3dQml`, `contaLivelloGis`, `zonaUtmProgetto`, `superficiModello3d`, `geopackageGis`, `pngSimbolo`, `documentoKmlGis`, `G`, `apriEsportaGis`, `renderEsportaGis`, `salvaSceltaGis`, `nel3d`, `esportaGis`

### `src/js/071s_confini-province.js`
119 righe · in `dist/DPSH.html` dalla riga 63273

### `src/js/071t_trova-dtm.js`
736 righe · in `dist/DPSH.html` dalla riga 63392

`anelliProvincia`, `dentroAnello`, `distanzaDaAnelloKm`, `provinceDelPunto`, `zonaUtmNaturale`, `luogoDelleProve`, `riquadroUtm`, `metriInteri`, `gradi6`, `codiciEpsgUtm`, `tessereCopernicus`, `pixelMercatore`, `tessereTerrarium`, `fontiPerLuogo`, `dettagliFonteDtm`, `schedaDtmTesto`, `linkCercaDtm`, `areaDtmGeojson`, `ascDaDtm`, `epsgDelDtm`, `erroreReteDtm`, `chiediInReteDtm`, `pixelDaPng`, `sorgenteTerrarium`, `geoTiffInRete`, `sorgenteCopernicus`, `unisciQuery`, `testoWcs`, `scopriWcs`, `urlGetCoverage`, `sorgenteWcs`, `dtmDaFonte`, `TD`, `renderTrovaDtm`, `apriTrovaDtm`, `chiudiTrovaDtm`, `caricaFonteDtm`, `scaricaFonteDtm`, `copiaTestoDtm`, `nomeFileDtm`, `datiScheda`

### `src/js/071u_carta-intestata.js`
443 righe · in `dist/DPSH.html` dalla riga 64128

`cartaDelTemplate`, `htmlCartaNelFoglio`, `regoleCarta`, `regoleCarteIntestate`, `marcaCartePrimaEAltre`, `aggiornaStileCarteEditor`, `caricaPdfjs`, `telaCarta`, `pagineCartaDaPdf`, `pagineCartaDaImmagine`, `pagineCartaDaWord`, `marginiDallaCarta`, `cartaDaFile`, `renderCartaEditor`, `applicaMarginiCarta`, `caricaCartaNelTemplate`

### `src/js/071q_strati-senza-vicoli-ciechi.js`
94 righe · in `dist/DPSH.html` dalla riga 64571

`nomeProva`, `nomeProvaAperta`, `testoSicuroStrati`, `proveDelProgettoConStrato`, `htmlStratoSenzaDati`, `renderProvaDiCalcoloStrati`, `calcolaSullaProva`, `vaiAdAssegnareIntervalli`

### `src/js/071q_dai-un-nome-agli-strati.js`
194 righe · in `dist/DPSH.html` dalla riga 64665

`nomeStratoGenerico`, `righeDaiNome`, `riepilogoStratiProgetto`, `riepilogoParametriProgetto`, `quotaDaiNome`, `renderDaiNome`, `leggiNomiDaiNome`, `daiNomeHaModifiche`, `apriDaiNomeStrati`, `chiudiDaiNomeStrati`, `chiediChiudiDaiNome`, `salvaNomiDaiNome`

### `src/js/071v_scaletta-del-report.js`
137 righe · in `dist/DPSH.html` dalla riga 64859

`scalettaProgetto`, `proveAcceseScaletta`, `impostaProvaAccesaScaletta`, `riepilogoScalettaReport`, `rigaScaletta`, `selectTemplateScaletta`, `renderScaletta`, `aggiornaStatoTappaReport`, `apriScalettaReport`, `chiudiScalettaReport`

### `src/js/071r_tavole-nel-report.js`
165 righe · in `dist/DPSH.html` dalla riga 64996

`elencoTemplateTavole`, `templateTavole`, `chiaveSequenzaTavola`, `tipoNelTemplate`, `memoriaConTemplate`, `regoleDallaMemoria`, `datiTavoleReport`, `titoliTavolaReport`, `foglioTavolaReport`, `opzioniTavolaReport`, `regolePagineTavole`, `capitoloTavoleHtml`

### `src/js/071w_registro-tavole.js`
136 righe · in `dist/DPSH.html` dalla riga 65161

`registroTavole`, `tavolaPerId`, `copiaTavola`, `idTavolaNuovo`, `nomeTavolaLibero`, `creaTavola`, `salvaTavola`, `duplicaTavola`, `bloccaTavola`, `eliminaTavola`, `ordinaTavole`, `tavolaDatiCambiati`, `sincronizzaRegistroTavole`, `tavoleDaAggiornare`, `duplicaEAggiornaTavole`, `controlloStampaTavole`, `nomeFileTavole`

### `src/js/071x_elenco-tavole.js`
77 righe · in `dist/DPSH.html` dalla riga 65297

`righeElencoTavole`, `templateDaTavola`, `apriElencoTavole3d`

### `src/js/071y_tavola-confronto.js`
52 righe · in `dist/DPSH.html` dalla riga 65374

`confrontoTavolaAttivo`, `svgTavolaConfronto`, `telaConfronto`, `mostraConfronto3d`, `commutaConfrontoTavole3d`, `grandezzaConfrontoTavole3d`

### `src/js/071z_tavola-libera.js`
109 righe · in `dist/DPSH.html` dalla riga 65426

`pxPerMLibero`, `coloreLibero`, `numLibero`, `formaLiberaPulita`, `svgFormaLibera`, `svgTavolaLibera`, `liberoPerId`, `telaLibera`, `mostraLibero3d`, `eliminaFormaLibera3d`, `aggiungiLibero3d`, `impostaScalaLibero3d`

### `src/js/071s_importa-da-word.js`
403 righe · in `dist/DPSH.html` dalla riga 65535

`leggiZipCompresso`, `decomprimiDeflate`, `mmDaTwip`, `attrW`, `figliW`, `letturaDaWord`, `riepilogoLetturaWord`, `applicaLetturaWord`, `importaDaWordNelTemplate`

### `src/js/071v_tasto-destro.js`
130 righe · in `dist/DPSH.html` dalla riga 65938

`azioneDelMenuStrato`, `apriMenuStrato`, `premiNelMenuDelBlocco`, `apriMenuBloccoPc`, `apriMenuIntestazionePc`, `apriMenuPiedePc`, `apriMenuPaginaPc`, `apriMenuTemplateLibreria`

### `src/js/071v_morph-e-schede.js`
217 righe · in `dist/DPSH.html` dalla riga 66068

`durataMorph`, `curvaMorph`, `elementiMorph`, `misuraMorph`, `eseguiMorph`, `apriDalTasto`, `aggiornaCursore`, `aggiornaCursori`, `nominaMorphProva`, `togliNomiMorphProva`, `morphProva`

### `src/js/072_fase-3-modal-fallback-gps-foto.js`
1017 righe · in `dist/DPSH.html` dalla riga 66285

`ensureLeafletLoaded`, `usaIconeLeafletIncorporate`, `showPhotoGpsFallbackStep`, `openPhotoGpsFallbackModal`, `closePhotoGpsFallbackModal`, `applyGpsToFallbackPhoto`, `openPhotoGpsMapPicker`, `scriviDatoProgettoCorrente`, `propagaDatoProgettoAlleProve`, `aggiornaPannelloBetaT`, `openDrawer`, `closeDrawer`, `openCantiereInfoModal`, `closeCantiereInfoModal`, `chiudiMenuAzioni`, `impostaTastoRegistraVisibile`, `linearScrollBy`, `animateViewSwap`, `exportGlobalJSONBackup`, `importGlobalJSONBackup`, `importGlobalZipBackup`, `renderThemeHuePicker`, `exportCsvFallback`

### `src/js/072a_foto-in-ingresso-orienta-e-comprimi.js`
160 righe · in `dist/DPSH.html` dalla riga 67302

`orientamentoExifJpeg`, `dimensioniJpeg`, `pianoFoto`, `pesoDataUrl`, `preparaFotoImportata`, `preparaFotoImportataDettaglio`

### `src/js/072b_leggi-foglio-di-campo.js`
406 righe · in `dist/DPSH.html` dalla riga 67462

`ocrNumero`, `ocrMostra`, `ocrParseRisposta`, `ocrValida`, `ocrPrecompila`, `ocrRigheUtili`, `ocrPrompt`, `ocrRichiesta`, `ocrLeggiConIA`, `ocrComprimi`, `ocrInserisci`, `apriLeggiFoglio`

### `src/js/073_assistente-ia.js`
1313 righe · in `dist/DPSH.html` dalla riga 67868

`aiSalva`, `aiDef`, `aiConf`, `aiPronto`, `aiProntiInOrdine`, `aiEl`, `aiInline`, `aiFormatta`, `aiProvaDati`, `aiSchedaProva`, `aiAttiva`, `aiVisibile`, `aiUiVietato`, `aiUiSicuro`, `aiMsgSistema`, `aiStrumentiPer`, `aiTestoU`, `aiImg`, `aiSchema`, `aiSenzaVuoti`, `aiElencoModelli`, `aiJson`, `aiLeggiFlusso`, `aiPostaRichiesta`, `aiPotaCrono`, `aiChiama`, `aiChiamaConFallback`, `aiDisegnaAllegati`, `aiLeggiAllegato`, `aiAggiungiFile`, `aiPidAtt`, `aiNomeProg`, `aiScriviArchivio`, `aiNuovaChat`, `aiSalvaChat`, `aiVicino`, `aiCopiaTesto`, `aiModifica`, `aiRifinisci`, `aiMsg`, `aiMostraChat`, `aiSaluto`, `aiAggiornaTesta`, `aiCaricaModelli`, `aiMostraCronologia`, `aiConferma`, `aiEseguiStrumento`, `aiDaIstruzioni`, `aiEtichetta`, `aiInviaDomanda`, `aiApri`, `aiSalvaPos`, `aiLimita`, `aiPonia`, `aiRendiTrascinabile`, `aiSnap`, `aiRidotto`, `aiMargini`, `aiBVisibile`, `aiBTargetX`, `aiBDisegna`, `aiBTick`, `aiBAvvia`, `aiBollaAssesta`, `aiBollaMetti`, `aiBollaRiadatta`, `aiPosizionaPannello`, `aiRiadatta`, `aiContesto`, `aiSuggerimenti`, `aiSuggEsegui`, `aiRinfresca`, `aiWizChiudi`, `aiWizMostra`, `aiWizElenco`, `aiWizProvider`, `aiAggiornaEtichetta`

### `src/shell/06_fine.html`
3 righe · in `dist/DPSH.html` dalla riga 69181
