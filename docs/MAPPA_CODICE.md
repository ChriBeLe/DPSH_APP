# Mappa del codice

> Generata da `python tools/mappa_codice.py`. Non modificarla a mano: rilancia lo script.
>
> I pezzi sono elencati nell'ordine in cui `build.py` li concatena. **Tutti i `.js` di
> `src/js/` sono frammenti di UNA sola funzione** (la `(function() { ... })();` che apre
> `000_` e chiude in `shell/06_fine.html`): condividono lo stesso ambito, non sono moduli.
> Una funzione definita in un pezzo è visibile in tutti gli altri.

### `src/shell/01_head.html`
45 righe · in `dist/DPSH.html` dalla riga 1

### `src/css/00_font-incorporati.css`
41 righe · in `dist/DPSH.html` dalla riga 46

### `src/shell/02_tra-font-e-stile.html`
2 righe · in `dist/DPSH.html` dalla riga 87

### `src/css/01_app.css`
2855 righe · in `dist/DPSH.html` dalla riga 89

### `src/css/02_passaggio-telefono-pc.css`
66 righe · in `dist/DPSH.html` dalla riga 2944

### `src/css/03_regole-di-stile.css`
171 righe · in `dist/DPSH.html` dalla riga 3010

### `src/css/04_prova-e-home.css`
1409 righe · in `dist/DPSH.html` dalla riga 3181

### `src/shell/03_fine-head.html`
3 righe · in `dist/DPSH.html` dalla riga 4590

### `src/markup/00_icone-e-schermate-principali.html`
490 righe · in `dist/DPSH.html` dalla riga 4593

### `src/markup/01_modalPhoto.html`
21 righe · in `dist/DPSH.html` dalla riga 5083

finestre: `#modalPhotoPreview`

### `src/markup/02_modalGps.html`
163 righe · in `dist/DPSH.html` dalla riga 5104

finestre: `#modalGpsSettings`

### `src/markup/03_modal.html`
62 righe · in `dist/DPSH.html` dalla riga 5267

finestre: `#modalEditStep`

### `src/markup/04_modalCustomNote.html`
14 righe · in `dist/DPSH.html` dalla riga 5329

finestre: `#modalCustomNote`

### `src/markup/06_modalStrati.html`
84 righe · in `dist/DPSH.html` dalla riga 5343

finestre: `#modalManageStrati`

### `src/markup/07_modalArchivePicker.html`
15 righe · in `dist/DPSH.html` dalla riga 5427

finestre: `#modalArchivePicker`

### `src/markup/08_modalArchiveManager.html`
25 righe · in `dist/DPSH.html` dalla riga 5442

finestre: `#modalArchiveManager`

### `src/markup/09_modalArchPrefEdit.html`
370 righe · in `dist/DPSH.html` dalla riga 5467

finestre: `#modalArchPrefEdit`

### `src/markup/10_modalWizard.html`
8 righe · in `dist/DPSH.html` dalla riga 5837

finestre: `#modalWizard`

### `src/markup/11_modalProjectNotes.html`
203 righe · in `dist/DPSH.html` dalla riga 5845

finestre: `#modalProjectNotes`

### `src/markup/12_modalNotePhotoPicker.html`
17 righe · in `dist/DPSH.html` dalla riga 6048

finestre: `#modalNotePhotoPicker`

### `src/markup/13_modalStileTesto.html`
85 righe · in `dist/DPSH.html` dalla riga 6065

finestre: `#modalStileTesto`

### `src/markup/14_modalComposizioneMappa.html`
210 righe · in `dist/DPSH.html` dalla riga 6150

finestre: `#modalComposizioneMappa`

### `src/markup/15_modalRitaglio.html`
39 righe · in `dist/DPSH.html` dalla riga 6360

finestre: `#modalRitaglio`

### `src/markup/16_modalNoteDraw.html`
105 righe · in `dist/DPSH.html` dalla riga 6399

finestre: `#modalNoteDraw`

### `src/markup/17_modalEditParams.html`
20 righe · in `dist/DPSH.html` dalla riga 6504

finestre: `#modalEditParams`

### `src/markup/18_modalStratiChoice.html`
22 righe · in `dist/DPSH.html` dalla riga 6524

finestre: `#modalStratiChoice`

### `src/markup/19_modalAutoStrati.html`
35 righe · in `dist/DPSH.html` dalla riga 6546

finestre: `#modalAutoStrati`

### `src/markup/20_modalPhotoGpsFallback.html`
42 righe · in `dist/DPSH.html` dalla riga 6581

finestre: `#modalPhotoGpsFallback`

### `src/markup/21_modalQuickFalda.html`
35 righe · in `dist/DPSH.html` dalla riga 6623

finestre: `#modalQuickFalda`

### `src/markup/22_appDialog.html`
30 righe · in `dist/DPSH.html` dalla riga 6658

finestre: `#appDialog`

### `src/markup/23_modalDeleteSurvey.html`
26 righe · in `dist/DPSH.html` dalla riga 6688

finestre: `#modalDeleteSurvey`

### `src/markup/24_modalSurveySettings.html`
217 righe · in `dist/DPSH.html` dalla riga 6714

finestre: `#modalSurveySettings`

### `src/markup/26_modalConfirmDelete.html`
21 righe · in `dist/DPSH.html` dalla riga 6931

finestre: `#modalConfirmDelete`

### `src/markup/27_modalBulkImport.html`
51 righe · in `dist/DPSH.html` dalla riga 6952

finestre: `#modalBulkImport`

### `src/markup/28_modalExport.html`
143 righe · in `dist/DPSH.html` dalla riga 7003

finestre: `#modalExportFormats`

### `src/markup/29_modalEsportaPdf.html`
90 righe · in `dist/DPSH.html` dalla riga 7146

finestre: `#modalEsportaPdf`

### `src/markup/30_modalReportTemplates.html`
46 righe · in `dist/DPSH.html` dalla riga 7236

finestre: `#modalReportTemplates`

### `src/markup/31_modalIndicePersonalizza.html`
63 righe · in `dist/DPSH.html` dalla riga 7282

finestre: `#modalIndicePersonalizza`

### `src/markup/32_modalTplTextEditor.html`
147 righe · in `dist/DPSH.html` dalla riga 7345

finestre: `#modalTplTextEditor`

### `src/markup/33_modalAnteprimaStampaReale.html`
42 righe · in `dist/DPSH.html` dalla riga 7492

finestre: `#modalAnteprimaStampaReale`

### `src/markup/34_modalTemplateEditor.html`
326 righe · in `dist/DPSH.html` dalla riga 7534

finestre: `#modalTemplateEditor`

### `src/markup/35_modalProjectActions.html`
92 righe · in `dist/DPSH.html` dalla riga 7860

finestre: `#modalProjectActions`

### `src/markup/36_modalCronologia.html`
18 righe · in `dist/DPSH.html` dalla riga 7952

finestre: `#modalCronologia`

### `src/markup/37_modalConfrontoProve.html`
33 righe · in `dist/DPSH.html` dalla riga 7970

finestre: `#modalConfrontoProve`

### `src/markup/38_modalBackupChoice.html`
35 righe · in `dist/DPSH.html` dalla riga 8003

finestre: `#modalBackupChoice`

### `src/markup/39_modalSurveyPhotos.html`
34 righe · in `dist/DPSH.html` dalla riga 8038

finestre: `#modalSurveyPhotos`

### `src/markup/40_modalNewProject.html`
33 righe · in `dist/DPSH.html` dalla riga 8072

finestre: `#modalNewProject`

### `src/markup/41_modalNewSurvey.html`
55 righe · in `dist/DPSH.html` dalla riga 8105

finestre: `#modalNewSurvey`

### `src/markup/42_drawer.html`
269 righe · in `dist/DPSH.html` dalla riga 8160

finestre: `#drawerMenu`

### `src/markup/43_modalPortaERicevi.html`
49 righe · in `dist/DPSH.html` dalla riga 8429

### `src/markup/44_modalPalette.html`
21 righe · in `dist/DPSH.html` dalla riga 8478

finestre: `#modalPalette`, `#modalScorciatoie`

### `src/markup/45_modalTerreno.html`
27 righe · in `dist/DPSH.html` dalla riga 8499

finestre: `#modalTerreno`

### `src/markup/46_modalSezione.html`
42 righe · in `dist/DPSH.html` dalla riga 8526

finestre: `#modalSezione`

### `src/markup/47_modalVista3d.html`
225 righe · in `dist/DPSH.html` dalla riga 8568

finestre: `#modalVista3d`

### `src/markup/47b_tavole3d.html`
153 righe · in `dist/DPSH.html` dalla riga 8793

### `src/markup/47c_esportaGis.html`
28 righe · in `dist/DPSH.html` dalla riga 8946

### `src/markup/47c_trovaDtm.html`
33 righe · in `dist/DPSH.html` dalla riga 8974

### `src/shell/04_apre-motore-note.html`
1 righe · in `dist/DPSH.html` dalla riga 9007

### `src/vendor/motore-note.min.js`
152 righe · in `dist/DPSH.html` dalla riga 9008

### `src/shell/04b_chiude-motore-apre-pdfjs.html`
4 righe · in `dist/DPSH.html` dalla riga 9160

### `src/vendor/pdfjs.min.js`
22 righe · in `dist/DPSH.html` dalla riga 9164

### `src/shell/04c_apre-pdfjs-worker.html`
2 righe · in `dist/DPSH.html` dalla riga 9186

### `src/vendor/pdfjs-worker.min.js`
22 righe · in `dist/DPSH.html` dalla riga 9188

### `src/shell/05_tra-motore-e-app.html`
2 righe · in `dist/DPSH.html` dalla riga 9210

### `src/js/000_avvio-stato-e-salvataggio.js`
247 righe · in `dist/DPSH.html` dalla riga 9212

`classicoPaginaDefault`, `stratiInizialiProgettoNuovo`, `flashDataChangedCards`

### `src/js/001_fase-3-gps-live-fallback-foto-import-batch.js`
244 righe · in `dist/DPSH.html` dalla riga 9459

`syncStateToProject`, `scriviStatoAttivoNelProgetto`, `syncProjectToActiveState`, `playBeep`, `closeAnyOpenModal`, `finestraInCima`, `closeTopModal`

### `src/js/002_dialoghi-in-app.js`
340 righe · in `dist/DPSH.html` dalla riga 9703

`_initAppDialog`, `_leggiCampiAppDialog`, `_closeAppDialog`, `_dialogStyleFor`, `_cleanDialogText`, `appDialog`, `_appDialogOra`, `appAlert`, `appConfirm`, `appConfirmDelete`, `mostraToast`, `nascondiToast`, `toastODialogo`, `ignoraErrore`, `appPrompt`, `appPromptCampi`

### `src/js/003_toggle-tema-sole-luna.js`
46 righe · in `dist/DPSH.html` dalla riga 10043

`syncThemeToggleLabel`, `applyGloveMode`

### `src/js/004_funzioni-sperimentali.js`
605 righe · in `dist/DPSH.html` dalla riga 10089

`applyDebugMode`, `ico`, `triggerVibrate`, `requestWakeLock`, `applicaStatoSalvato`, `migrazione0a1`, `loadState`, `stripNoteImagesHtml`, `saveState`, `avvisaSalvataggioFallito`, `getStratoById`, `getEffectiveLithology`, `populateStratiDropdown`

### `src/js/004a_dati-salvati-lettura-e-quarantena.js`
173 righe · in `dist/DPSH.html` dalla riga 10694

`leggiStatoSalvato`, `datiNonCaricati`, `scriviQuarantena`, `testoAvvisoDatiNonCaricati`, `mostraAvvisoDatiNonCaricati`, `scaricaDatiNonCaricati`, `ripartiDaVuotoDopoDatiNonCaricati`, `mostraBarraSalvataggioSospeso`

### `src/js/004b_versione-dello-schema-e-migrazioni.js`
157 righe · in `dist/DPSH.html` dalla riga 10867

`migrazione2a3`, `migrazione1a2`, `versioneDeiDati`, `migraDati`, `predefinitiPerMigrazioni`, `copiaPrimaDiAggiornareIDati`, `versioneFileImportato`, `controllaVersioneFileImportato`, `migraProgettiImportati`

### `src/js/004c_controllo-di-integrita.js`
293 righe · in `dist/DPSH.html` dalla riga 11024

`verificaIntegrita`, `registraCorrezioni`, `idPresentiNelDatabaseFoto`, `verificaIntegritaConFoto`, `elencoAnomalie`, `controllaIntegritaDopoAvvio`, `tastoVaiAnomalia`, `renderIntegritaPrimaExport`

### `src/js/004d_tracciabilita-degli-intervalli.js`
38 righe · in `dist/DPSH.html` dalla riga 11317

`nuovoIntervallo`, `misuraDiIntervallo`, `segnaIntervalloModificato`

### `src/js/004e_impronta-e-modifiche-vere.js`
208 righe · in `dist/DPSH.html` dalla riga 11355

`costantiSha256`, `sha256Byte`, `sha256Testo`, `sha256Async`, `jsonCanonico`, `htmlNotaSenzaImmagini`, `testoContenutoProgetto`, `registraModificheVere`, `accettaContenutoProgetto`, `accettaNormalizzazioneApertura`, `primaContenutiConosciuti`, `formattaQuandoCompleto`

### `src/js/004f_annulla-e-ripeti.js`
530 righe · in `dist/DPSH.html` dalla riga 11563

`cronologia`, `testoPezzoCronologia`, `metaProvaCronologia`, `metaProgettoCronologia`, `pezziProgettoCronologia`, `fotografiaCronologia`, `pezzoDellaFotografia`, `differenzaCronologia`, `pesoPassoCronologia`, `registraPassoCronologia`, `elementoDiScrittura`, `accettaAperturaInCronologia`, `cronologiaUsabile`, `puoAnnullare`, `puoRipetere`, `annullaAzione`, `ripetiAzione`, `ripristinaPassoCronologia`, `dopoRipristinoCronologia`, `descriviPassoCronologia`, `aggiornaTastiCronologia`, `idFotoNellaCronologia`, `idImmaginiNoteNellaCronologia`

### `src/js/005_fase-2-riconoscimento-automatico-degli-strati.js`
155 righe · in `dist/DPSH.html` dalla riga 12093

`getStratiBoundaryIndices`, `detectStratiSegments`, `applyDetectedSegmentsToLogs`, `moveStratiBoundary`, `svgTileUrl`

### `src/js/006_retini-litologici-ufficiali-estratti-pixel-per-p.js`
184 righe · in `dist/DPSH.html` dalla riga 12248

`getPatternCss`, `getSvgPatternDef`, `buildPatternOptionsHtml`, `buildPatternPickerHtml`, `buildArchPatternPickerHtml`

### `src/js/007_archivio-litologico-globale.js`
644 righe · in `dist/DPSH.html` dalla riga 12432

`getArchiveList`, `stratoHaCollegamentoArchivioValido`, `campiArchivioDaStrato`, `promoteStratoToArchive`, `aggiornaVoceArchivioDaStrato`, `mergeLithologyArchiveInto`, `createStratoFromArchive`, `computeArchiveStats`, `formatUltimoUtilizzo`, `renderStratiList`

### `src/js/008_ui-archivio-litologico-picker-gestione-globale.js`
127 righe · in `dist/DPSH.html` dalla riga 13076

`renderArchivePickerList`, `updateArchivePickerConfirmState`, `openArchivePicker`, `closeArchivePicker`

### `src/js/009_gestione-archivio-globale.js`
294 righe · in `dist/DPSH.html` dalla riga 13203

`renderArchiveManagerList`, `openArchiveManager`, `closeArchiveManager`

### `src/js/010_modal-modifica-preferenza-formula.js`
57 righe · in `dist/DPSH.html` dalla riga 13497

`apriModificaPreferenzaArchivio`, `chiudiModificaPreferenzaArchivio`

### `src/js/011_export-import-archivio.js`
62 righe · in `dist/DPSH.html` dalla riga 13554

### `src/js/012_motore-di-calcolo-parametri-geotecnici-avanzati.js`
383 righe · in `dist/DPSH.html` dalla riga 13616

`lookupPesoVolume`, `classificaConsistenza`, `drSkemptonLimiSabbie`, `clamp100`, `candidatiCompatibili`, `calcolaCr`, `calcolaN160`, `condizioneFalda`, `elaboraStratiProva`, `normalizzaTesto`, `categorieDiTesto`, `categorieRiconosciuteDiStrato`, `stratoRischioCarbonatico`, `valutaSuggerimento`, `applicaFallbackSuggerimentoParziale`

### `src/js/013_note-scientifiche-per-autore-dove-possibile-veri.js`
56 righe · in `dist/DPSH.html` dalla riga 13999

`notaScientificaDi`, `categorieApplicabili`

### `src/js/014_wizard-navigazione-sempre-visibile-a-differenza.js`
108 righe · in `dist/DPSH.html` dalla riga 14055

`categoriaTipicaPerStrato`, `candidatiWizardIgnorandoTipicita`, `categoriaHaConsigliato`, `seleziona`, `ensureParametriAvanzati`, `fmtIT`, `formattaDataIT`

### `src/js/015_ponte-col-modulo-1-colpi-dpsh-nspt-nspt-rpd-per.js`
128 righe · in `dist/DPSH.html` dalla riga 14163

`faldaDaHeader`, `betaTCalcolato`, `betaTStrumento`, `rpdDiLog`, `nsptDiLog`, `getEffectiveLithologyIn`, `intervalloSoloGrafico`, `getLogsPerStratoIn`, `stratiEffettiviProva`

### `src/js/016_vista-interattiva-elaborazione-dati-speciali.js`
325 righe · in `dist/DPSH.html` dalla riga 14291

`primoCandidatoConsigliato`, `calcolaRisultatiPerStratiCorrenti`, `buildParametriAvanzatiBodyHtml`, `buildParametriAvanzatiSummaryHtml`, `refreshParametriAvanzatiViews`, `bindParametriAvanzatiEvents`, `renderEditParamsModalBody`, `openEditParamsModal`, `chiudiEditParamsModal`, `cancelEditParamsModal`, `saveEditParamsModal`

### `src/js/017_wizard-guidato-parametri-avanzati-selezione-pass.js`
640 righe · in `dist/DPSH.html` dalla riga 14616

`formattaValoreWizard`, `raggruppaPerAutore`, `categorieConSceltaWizard`, `primoStratoDaCompletare`, `apriWizardParametri`, `primoCampoWizardMancante`, `chiudiWizardParametri`, `autoCompilaStrato`, `renderWizardModal`, `renderWizardStep`, `renderWizardRiepilogo`

### `src/js/018_export-tabelle-riepilogo-e-dettagliata-stesso-fo.js`
237 righe · in `dist/DPSH.html` dalla riga 15256

`autoFitTabellaExport`, `larghezzaColonnaEtichetta`, `autoFitTabellaRighe`, `thExp`, `tdExp`, `tdlExp`, `tsecExp`, `intestazioneColonneExp`, `colgroupExp`, `htmlTabellaRiepilogo`, `conIndiceRiga`, `costruisciTabellaCategoria`, `htmlTabellaDettagliata`

### `src/js/019_allegato-compendio-delle-formule-di-correlazione.js`
131 righe · in `dist/DPSH.html` dalla riga 15493

`candidatoAllegato`, `buildAllegatoHtml`

### `src/js/020_fogli-excel-riepilogo-e-dettagliata-replica-fede.js`
2033 righe · in `dist/DPSH.html` dalla riga 15624

`argbExcel`, `stileCellaExcel`, `scriviRigaExcel`, `scriviSezioneExcel`, `intestazioneWorksheetExcel`, `popolaWorksheetRiepilogo`, `popolaWorksheetDettagliata`, `datiCalcolatiProva`, `elencoProveProgetto`, `sezioneProvaHtml`, `documentoEsportazioneAvanzata`, `getRodForDepth`, `suPc`, `mostraVistaProva`, `animaUnaVolta`, `segnaIntervalloNuovo`, `renderUltimiIntervalli`, `impulsoContatoreColpi`, `numeroConVirgola`, `testoIntervallo`, `tastoRegistraVisibile`, `testiTestataProva`, `aggiornaSpieProva`, `updateUI`, `aggiornaHintManiglieStratiGrafico`, `aggiornaBottoneModificaStratiGrafico`, `renderIntegratedLogsTable`, `renderIntegratedDepthLabels`, `recalculateDepths`, `deleteLogStep`, `renderLogsTable`, `chiudiRigheAperte`, `collegaRigaRegistro`, `renderChart`, `eseguiPiuUnColpo`, `closeCustomNoteModal`, `confirmAndNextStep`, `togliUltimoIntervallo`, `annullaRegistrazione`, `undoLastStep`, `openGpsModal`, `closeGpsModal`, `updateModalGpsStatusText`, `indirizziMappePunto`, `aggiornaApriInMappe`, `startLiveGpsWatch`, `stopLiveGpsWatch`, `updateLiveGpsIndicator`, `fetchGpsPositionModal`, `closeAllGpsAccordion`, `openGpsAccordion`, `setGpsMapStyle`, `gpsLiveDotIcon`, `updateGpsModalMapLiveDot`, `gpsAltraProvaIcon`, `gpsMiaProvaIcon`, `aggiornaIconaMiaProvaMappaGps`, `aggiornaAltreProveMarkersSuMappaGps`, `ensureGpsModalMapReady`

### `src/js/021_diagnostica-gps.js`
232 righe · in `dist/DPSH.html` dalla riga 17657

`diagLine`, `runGpsDiagnostics`, `showGpsMapSearchMessage`, `runGpsMapSearch`, `parsePastedCoords`

### `src/js/022_importazione-coordinate-da-file-kml-gpx.js`
501 righe · in `dist/DPSH.html` dalla riga 17889

`parseGeoFileText`, `applyGpsCoordsToModal`, `numeroGps`, `spostamentoProva`, `metriTra`, `coppiaGps`, `aggiornaSpostaProva`, `aggiornaModoSposta`, `aggiornaTracciaSpostamento`, `confermaSpostamentoProva`, `aggiornaConteggiHome`, `switchView`, `renderSchermataProgetto`

### `src/js/023_eliminazione-prova.js`
130 righe · in `dist/DPSH.html` dalla riga 18390

`openDeleteSurveyModal`, `closeDeleteSurveyModal`

### `src/js/024_impostazioni-della-singola-prova.js`
966 righe · in `dist/DPSH.html` dalla riga 18520

`radiceProva`, `proveFisiche`, `proveInOrdine`, `prossimaLetteraInterpretazione`, `duplicaProvaComeInterpretazione`, `mostraSchedaProva`, `openSurveySettingsModal`, `closeSurveySettingsModal`, `renderSurveySwitcherBar`, `updateSurveySwitcherFade`, `promemoriaBackup`, `renderPromemoriaBackup`, `normalizzaPerRicerca`, `progettoCorrispondeRicerca`, `progettiVisibiliHome`, `vociOrdineProgetti`, `ordineProgettiScelto`, `scegliOrdineProgetti`, `ordinaProgetti`, `menuOrdineProgetti`, `renderFiltroStatoProgetti`, `ultimaProvaUsata`, `dataBreve`, `renderHomeProjects`, `openProject`, `showUndoBanner`, `hideUndoBanner`, `performUndo`, `openConfirmDeleteModal`, `closeConfirmDeleteModal`, `deleteProject`, `performDeleteProject`, `duplicateProject`, `rinnovaIdProve`, `renderStatoAzioniProgetto`, `openProjectActionsModal`, `closeProjectActionsModal`

### `src/js/025_scelta-formato-backup.js`
286 righe · in `dist/DPSH.html` dalla riga 19486

`openBackupChoiceModal`, `closeBackupChoiceModal`, `avvisiPrimaExport`, `apriProvaPerCorreggere`, `renderRiepilogoPrimaExport`, `openExportModal`, `renderProveConsegna`, `closeExportModal`

### `src/js/026_libreria-template-di-report.js`
428 righe · in `dist/DPSH.html` dalla riga 19772

`miniaturaTemplatePaginaHtml`, `miniaturaTemplateIndiceHtml`, `chiudiMenuAzioniTemplate`, `apriMenuAzioniTemplate`, `elencoTemplateReportOrdinato`, `openReportTemplatesModal`, `closeReportTemplatesModal`, `esportaBackupTemplateReport`, `importaBackupTemplateReport`, `nomeTemplateGiaEsistente`, `prossimoNomeTemplateDisponibile`, `risolviCollisioneNomeTemplate`, `duplicaTemplateReport`, `creaTemplateVuoto`, `rinominaTemplateReport`, `eliminaTemplateReport`, `renderReportTemplatesList`

### `src/js/027_libreria-template-indice.js`
151 righe · in `dist/DPSH.html` dalla riga 20200

`elencoIndiceTemplateOrdinato`, `nomeIndiceTemplateGiaEsistente`, `prossimoNomeIndiceTemplateDisponibile`, `risolviCollisioneNomeIndiceTemplate`, `duplicaIndiceTemplate`, `creaNuovoTemplateIndice`, `rinominaIndiceTemplate`, `eliminaIndiceTemplate`, `renderIndiceTemplatesList`

### `src/js/028_editor-a-righe-del-template-di-report.js`
857 righe · in `dist/DPSH.html` dalla riga 20351

`copiaIntestazione`, `allineaIntestazioniEditor`, `nuovoIdEditor`, `nuovaPaginaVuota`, `seedPaginaDefaultClassico`, `computeEditorPreviewCtx`, `contenutoBloccoOPlaceholder`, `calcolaIndiciImmaginePerBlocco`, `calcolaIndiciFigulaPerBlocco`, `didascaliaAutomaticaBlocco`, `marcaNumeroDidascalia`, `ruoloFigura`, `elencoFigureTemplate`, `aggiornaCtxFotoEditor`, `trovaBloccoPerId`, `trovaVoceRigaPerId`, `trovaVoceRigaPerIdOvunque`, `trovaBloccoPerIdOvunque`, `trovaVoceContenenteBlocco`, `spanMinimoVoce`, `ridisegnaGraficoAnteprima`, `spanVoceInGriglia`, `flexEntryCss`, `styleDimensioneVoce`, `trovaIndiceRigaPerVoce`, `convertiScalaGraficoSalvata`, `convertiSeparatoriInDivisori`, `appiattisciRowSpanTemplate`, `rimuoviRiserveRowSpan`, `sanitizzaBlocchiFlowableIsolati`, `calcolaGruppiRowSpanPagina`, `rimuoviBloccoDaPagina`, `modalitaMobileTemplateEditor`, `inserisciBloccoATocco`

### `src/js/029_blocco-in-spostamento.js`
1613 righe · in `dist/DPSH.html` dalla riga 21208

`bloccoInSpostamento`, `avviaSpostamentoBlocco`, `annullaSpostamentoBlocco`, `eliminaBloccoInSpostamento`, `posaBloccoQui`, `avvisaSeBloccoContinuaSuPiuPagine`, `renderBarraSpostamento`, `evidenziaVoceSpostamentoNellaPalette`, `aprTendinaPaletteSeMobile`, `portaBloccoInVista`, `apriTendinaPaletteMobile`, `chiudiTendinaPaletteMobile`, `aggiornaIconaFabPalette`, `paginaGenerataDalProgramma`, `inserisciBloccoInPagina`, `catturaRettangoliEditor`, `calcolaPosizioneDropEditor`, `stimaAltezzaPerLarghezza`, `valutaQualitaPiazzamento`, `applicaMagneteDropEditor`, `messaggioQualitaDrop`, `applicaStatoQualitaGhost`, `mostraIndicatoreDropEditor`, `nascondiIndicatoreDropEditor`, `hostFloatingUiEditor`, `costruisciContenutoGhostTrascinamento`, `misuraDimensioneNaturaleGhost`, `creaGhostTrascinamentoEditor`, `posizionaGhostTrascinamentoEditor`, `rimuoviGhostTrascinamentoEditor`, `avviaTrascinamentoEditor`, `mostraCestinoTrascinamento`, `nascondiCestinoTrascinamento`, `aggiornaCestinoTrascinamento`, `avviaAutoScrollViewportEditor`, `avviaAutoScrollBordoEditor`, `fermaAutoScrollBordoEditor`, `gestisciSpostamentoEditor`, `terminaTrascinamentoEditor`, `tipiBloccoGiaUsatiNelTemplate`, `renderTemplateEditorPalette`, `mostraAnteprimaPaletteHover`, `nascondiAnteprimaPaletteHover`, `renderTemplateEditorPageControls`, `sincronizzaControlliMarginiSidebar`, `aggiornaStatiSezioniTemplate`, `cmMargine`, `mmDaCm`, `catturaRectBlocchiPerFlip`, `applicaFlipBlocchi`

### `src/js/030_guardia-contro-le-misure-degeneri.js`
1316 righe · in `dist/DPSH.html` dalla riga 22821

`filtraCategorieHtmlFlowable`, `costruisciHtmlBloccoEditor`, `renderaGruppoRowSpanEditor`, `renderTemplateEditorCanvas`, `selezionaBloccoEditor`, `deselezionaBloccoEditor`, `attivaGestureTapBloccoEditor`, `attivaChipSpostamentoBlocco`, `attivaDoppioTapResetSlider`, `confiniTaglioBlocco`, `mostraAnteprimaTaglio`, `nascondiAnteprimaTaglio`, `inserisciInterruzioneNelTesto`, `togliInterruzioneNelTesto`, `attivaManigliaScalaBlocco`

### `src/js/031_basi-del-carattere-per-i-blocchi-tabellari.js`
124 righe · in `dist/DPSH.html` dalla riga 24137

`baseFontBloccoTabellare`, `suddividiGruppoCategorie`, `ptDaFontScale`, `fontScaleDaPt`, `intervalloPtBlocco`

### `src/js/032_controllo-numerico-condiviso.js`
80 righe · in `dist/DPSH.html` dalla riga 24261

`htmlSpiegazione`, `htmlInterruttore`, `htmlControlloNumerico`

### `src/js/033_schede-del-menu-del-blocco.js`
638 righe · in `dist/DPSH.html` dalla riga 24341

`spostaRimuoviNelMenuAltro`, `schedaDiSezione`, `fasciaDiSezioneMenu`, `riordinaSezioniAFasce`, `organizzaMenuInSchede`, `attivaTrasparenzaMenuDuranteRegolazione`, `collegaControlloNumerico`, `larghezzaRigaUtileMm`, `etichettaLarghezzaBlocco`, `attivaManigliaColspanBlocco`, `mostraEtichettaManigliaBlocco`, `nascondiEtichettaManigliaBlocco`, `catturaBordiAltriBlocchiEditor`, `mostraGuidaAllineamentoEditor`, `nascondiGuidaAllineamentoEditor`, `catturaBordiVerticaliAltriBlocchiEditor`, `mostraGuidaAllineamentoOrizzontaleEditor`, `nascondiGuidaAllineamentoOrizzontaleEditor`, `chiudiMenuBloccoEditor`

### `src/js/034_avvisi-che-non-restano-indietro.js`
2499 righe · in `dist/DPSH.html` dalla riga 24979

`idBloccoMenuAperto`, `firmaMisureBlocco`, `riallineaMenuBloccoAMisureNuove`, `tagliEPaginePerBlocco`, `condensaBloccoPerPagineMinime`, `riapplicaDivisioneAutomatica`, `riapplicaDivisioniAutomaticheTemplate`, `collassaMenuBloccoEditor`, `mostraBollicinaMenuBlocco`, `rimuoviBollicinaMenuBlocco`, `gestisciClickFuoriMenuBlocco`, `bilanciaRigaBlocco`, `riordinaAutomaticoPagina`, `apriMenuBloccoEditor`

### `src/js/035_editor-di-testo-per-i-blocchi-titolo-testo-richi.js`
795 righe · in `dist/DPSH.html` dalla riga 27478

`bloccoPiedeEditor`, `bloccoIntestazioneEditor`, `editorAttivo`, `dopoComandoTesto`, `collegaComandoTesto`, `pannelloDelPulsante`, `chiudiTuttiIPannelliTesto`, `creaEditorTesto`, `aggiornaSegnapostoTestoTemplate`, `apriTplTextEditor`, `chiudiTplTextEditor`, `chiudiTplTextEditorChiedendo`, `posizionaMenuBloccoEditor`, `applicaAltezzaMenuMobile`, `attivaRidimensionamentoMenuMobile`, `portaBloccoSopraIlMenu`, `attivaTrascinamentoMenuBloccoEditor`, `trovaRigaRealeInEccesso`, `rigaContieneBloccoBloccato`, `rigaHaBloccoGenuinamenteBloccato`, `spostaBlocchiInEccessoAllaPaginaSuccessiva`, `gestisciInserimentoBloccoNuovoConOverflow`

### `src/js/036_blocchi-flowable-allegato-formule-di-correlazion.js`
98 righe · in `dist/DPSH.html` dalla riga 28273

`trovaBloccoEPaginaPerId`, `paginaOrigineBlocco`, `coloreCategoriaBlocco`, `elencoSegmentiPaginaBlocco`

### `src/js/037_fase-c-avvisi-di-overflow-reali.js`
117 righe · in `dist/DPSH.html` dalla riga 28371

`calcolaAvvisiOverflowGruppiCategoria`, `ricalcolaAvvisiOverflowTuttiBlocchi`

### `src/js/038_fase-d-riconciliazione-editor-export.js`
704 righe · in `dist/DPSH.html` dalla riga 28488

`verificaPagineOrigineControMotoreReale`, `costruisciRigaContinuazionePagina`, `miniaturaPaginaContinuazione`, `sincronizzaFlussiBlocchiLunghi`, `mostraToastTemplateEditor`, `mostraLineaFinePaginaA4`, `adattaScalaEditorCanvas`, `impostaZoomEditorTemplate`, `adattaLarghezzaEditorTemplate`, `reimpostaZoomEditorTemplateAutomatico`, `aggiornaBottoneAnteprimaPulita`, `aggiornaBottoneFullscreenPreview`

### `src/js/039_fase-b-anteprima-di-stampa-reale.js`
976 righe · in `dist/DPSH.html` dalla riga 29192

`generaAnteprimaStampaReale`, `apriAnteprimaStampaReale`, `chiudiAnteprimaStampaReale`, `zoomAttualeEditorTemplate`, `neutralizzaIdentificatoriMiniatura`, `renderTemplateEditorPagesStrip`, `attivaModalitaSelezionePagine`, `togglePaginaSelezionata`, `esciModalitaSelezionePagine`, `eliminaPagineSelezionateEditor`, `gestisciSpostamentoPaginaEditor`, `mostraIndicatoreRiordinoPagine`, `nascondiIndicatoreRiordinoPagine`, `terminaRiordinoPagineEditor`, `impostaAnteprimePagineEspanse`, `aggiornaAnteprimePagineDopoCambioAltezza`, `cambiaPaginaEditor`, `eliminaPaginaEditor`, `aggiungiPaginaEditor`, `salvaUndoSnapshotEditor`, `scartaUltimoSnapshotEditor`, `undoTemplateEditor`, `redoTemplateEditor`, `ripristinaPagineEditor`, `aggiornaBottoneUndoEditor`, `marginiPaginaDiDefault`

### `src/js/040_lo-stile-del-testo-in-un-posto-solo.js`
42 righe · in `dist/DPSH.html` dalla riga 30168

`istantaneaTemplate`

### `src/js/041_le-eccezioni-di-stile-dichiarate.js`
43 righe · in `dist/DPSH.html` dalla riga 30210

`eccezioniDiStile`, `riportaAlloStileDelDocumento`

### `src/js/042_un-solo-blocco-di-testo-i-titoli-li-dichiara-il.js`
1627 righe · in `dist/DPSH.html` dalla riga 30253

`risolviTagInStampa`, `figuraBersagliataNelTemplate`, `cambiaTipoTagNelBlocco`, `marcaTitoliPerIndice`, `convertiBloccoTitoloInTesto`, `convertiTitoliDelTemplate`, `stileTestoDiDefault`, `stileTestoDelTemplate`, `pilaFont`, `cssVariabiliStileTesto`, `stileIndiceDiDefault`, `getIndiceTemplateIdPerProgetto`, `stileIndiceDelProgetto`, `cssVariabiliStileIndice`, `separaNumeroDaEtichetta`, `numeriGerarchiciDiRighe`, `calcolaBudgetPaginaMm`, `apriTemplateEditor`, `chiudiTemplateEditor`, `templateEditorHasUnsavedChanges`, `richiediChiusuraTemplateEditor`, `salvaTemplateEditor`, `salvaTemplateEditorComeCopia`, `chiudiAlToccoFuori`, `renderTemplateEditorPreviewProjectSelector`, `renderTemplateEditorPreviewSurveySelector`, `aggiornaAvvisoTemplateEditorPreviewSurvey`, `aggiornaBottoneGridGuides`, `renderGrigliaGuidaEditor`, `attivaLongPressManigliePagina`, `nascondiManigliePaginaEditor`, `renderManigliePaginaEditor`, `resettaManigliaPagina`, `attivaTrascinamentoManigliaPagina`, `impostaDistanzaIntestazione`, `rehydrateProjectPhotosForExport`, `segnapostoFoto`, `placeholderizzaFotoProgetto`, `assemblaBlobConSegnaposto`, `contaFotoSenzaImmagine`, `avvisaFotoMancantiNelBackup`, `scaricaBlobJson`, `exportProjectJSON`, `statoConFotoPerExport`, `exportSingleJSON`

### `src/js/043_supporto-zip-nativo.js`
442 righe · in `dist/DPSH.html` dalla riga 31880

`ZIP_CRC32_TABLE`, `zipCrc32`, `zipDosDateTime`, `buildZipBlob`, `readZipStoreOnly`, `dataUrlToUint8Array`, `uint8ArrayToDataUrl`, `extFromMime`, `mimeFromZipExt`, `cloneProjectMetaSenzaFoto`, `leggiDataUrlFoto`, `respiraUnAttimo`, `estraiFotoProgettoPerZip`, `reidrataProgettoDaZip`, `scaricaBlobFile`, `exportProjectZip`, `exportProjectPhotos`, `exportGlobalZip`, `importProjectsFromZip`

### `src/js/044_fase-1-importazione-progetti-da-file-json.js`
320 righe · in `dist/DPSH.html` dalla riga 32322

`normalizeImportedJsonToProjects`, `importProjectsFromJSON`, `salvaImmaginiImportate`, `controllaFotoImportate`, `testoAnomalieImportate`, `testoFotoAssentiNelFile`, `handleImportJsonFile`

### `src/js/044a_librerie-che-viaggiano-col-progetto.js`
237 righe · in `dist/DPSH.html` dalla riga 32642

`contenutoVoceLibreria`, `templateReportEffettivo`, `templateIndiceEffettivo`, `templateIntroduzioneEffettivo`, `stratiDelProgetto`, `librerieUsateDa`, `nomeLiberoInLibreria`, `accogliLibrerie`, `estraiLibrerieDalFile`, `testoLibrerieAccolte`, `riallineaProgettoAperto`, `nomeFileProgetto`

### `src/js/044b_pacchetto-di-progetto.js`
565 righe · in `dist/DPSH.html` dalla riga 32879

`nomeDispositivo`, `impostaNomeDispositivo`, `suQuestoDispositivo`, `idImmaginiNelHtml`, `immaginiDelProgetto`, `leggiImmagineArchiviata`, `prefissoDataUrl`, `byteDaDataUrl`, `dataUrlDaByte`, `estensioneDaPrefisso`, `improntaProgetto`, `impronteImmaginiQui`, `conteggiProgetto`, `correzioniDelProgetto`, `formaSalvataProgetto`, `stimaPacchetto`, `formattaMegabyte`, `creaPacchettoProgetto`, `vociSonoUnPacchetto`, `leggiPacchetto`, `confrontaConPresente`, `nomeCopiaDaPacchetto`, `applicaPacchetto`

### `src/js/044c_finestre-porta-e-ricevi.js`
270 righe · in `dist/DPSH.html` dalla riga 33444

`plurale`, `maiuscolaIniziale`, `numeriPassaggioHtml`, `apriPortaProgetto`, `chiudiPortaProgetto`, `creaEScaricaPacchetto`, `cambiaNomeDispositivo`, `apriRiceviProgetto`, `chiudiRiceviProgetto`, `testoConfrontoRicevi`, `renderRiceviProgetto`, `renderBottoniRicevi`, `confermaRicevi`

### `src/js/045_esportazione-pdf.js`
422 righe · in `dist/DPSH.html` dalla riga 33714

`descriviFoglioTavole`, `popolaListaProveEsportazionePdf`, `impostaTemplateReportProva`, `popolaSelettoreTemplateBulkEsportazionePdf`, `elencoProveSelezionateEsportazionePdf`, `stimaPagineProva`, `stimaByteFotoOriginale`, `fattoreDimensioneJpeg`, `formattaBytesEsportazione`, `aggiornaStimaEsportazionePdf`, `apriEsportazionePdfModal`, `chiudiEsportazionePdfModal`

### `src/js/046_modal-personalizza-indice.js`
1510 righe · in `dist/DPSH.html` dalla riga 34136

`applicaZoomIndicePers`, `adattaZoomIndicePers`, `apriModalPersonalizzaIndice`, `chiudiModalPersonalizzaIndice`, `etichetteIndiceAnteprima`, `righeIndiceAnteprima`, `aggiornaAnteprimaIndicePersonalizza`, `renderModalPersonalizzaIndice`, `sincronizzaTemplateEditorConStatoSalvato`, `avviaGenerazioneEsportazionePdf`, `getBulkImportStartDepth`, `openBulkImportModal`, `closeBulkImportModal`, `parseBulkImportNumbers`, `updateBulkImportCount`, `openNewProjectModal`, `closeNewProjectModal`, `openNewSurveyModal`, `closeNewSurveyModal`, `cancelNewSurveyModal`, `confirmNewSurvey`, `exportProjectKML`, `exportSingleSurveyKML`, `exportProjectExcel`, `setupLongPress`, `openPhotoDB`, `savePhotoToIDB`, `salvaFotoConGaranzia`

### `src/js/047_spazio-occupato-e-foto-orfane.js`
166 righe · in `dist/DPSH.html` dalla riga 35646

`elencaContenutoIDB`, `idFotoAncoraInUso`, `idImmaginiNoteAncoraInUso`, `formattaByte`, `calcolaSpazioOccupato`, `eliminaFotoOrfane`, `svuotaDatabaseImmagini`

### `src/js/048_copie-automatiche.js`
363 righe · in `dist/DPSH.html` dalla riga 35812

`openCopieDB`, `firmaTesto`, `riassuntoStatoPerCopia`, `copieDaEliminare`, `aggiornaIdProtettiDalleCopie`, `caricaIndiceCopieAutomatiche`, `potaCopieAutomatiche`, `scriviCopiaAutomatica`, `copiaPrimaDi`, `leggiCopiaAutomatica`, `ripristinaProgettoDaCopia`, `formattaQuandoCopia`, `testoSicuro`, `apriCronologia`, `chiudiCronologia`, `renderCronologia`, `aggiornaRiepilogoCopieEBackup`, `registraBackupCompleto`

### `src/js/049_confronto-tra-prove.js`
649 righe · in `dist/DPSH.html` dalla riga 36175

`colonnaStratigrafica`, `serieConfrontoProva`, `massimoTondo`, `proveConfrontabili`, `apriConfrontoProve`, `chiudiConfrontoProve`, `datiConfronto`, `disegnoConfronto`, `svgDaDisegno`, `testoWinAnsi`, `larghezzaTestoPdf`, `coloreRgbPdf`, `pdfDaDisegno`, `renderConfrontoProve`, `disegnoConfrontoPerFile`, `scaricaConfronto`, `aggiornaPannelloSpazio`, `avvisaFotoNonSalvate`, `getPhotoFromIDB`, `deletePhotoFromIDB`, `saveNoteImageToIDB`, `getNoteImageFromIDB`, `deleteNoteImageFromIDB`

### `src/js/050_note-di-progetto-pagina-unica-di-appunti-per-pro.js`
571 righe · in `dist/DPSH.html` dalla riga 36824

`creaEditorNote`, `aggiornaSegnapostoNota`, `htmlNotaCorrente`, `immagineSelezionataNota`, `aggiornaStatoBarraNote`, `comandoBloccoNota`, `getProjNotes`, `censisciVocabolarioNota`, `invariantiNota`, `confrontaInvariantiNota`, `ripuliscoHtmlIncollatoNota`, `convertiNotaAlNuovoSchema`, `diagnosticaMigrazioneNote`, `rehydrateNoteImagesInDom`, `rehydrateNoteImagesInHtmlString`

### `src/js/051_la-barretta-sulla-selezione.js`
55 righe · in `dist/DPSH.html` dalla riga 37395

`nascondiBollaSelezione`, `aggiornaBollaSelezione`

### `src/js/052_ricerca-nelle-note.js`
404 righe · in `dist/DPSH.html` dalla riga 37450

`pluginRicercaNote`, `ricalcolaRicercaNota`, `vaiAOccorrenzaNota`, `cercaNelleAltreNote`, `renderAltreNoteTrovate`, `apriRicercaNote`, `chiudiRicercaNote`, `aggiornaRicercaNote`, `preparaNotaPerIlMotore`, `renderRigaConversioneNota`, `apriNoteProgetto`, `salvaNoteProgettoCorrente`, `salvaNoteSeInSospeso`, `chiudiNoteProgetto`, `noteDelProgettoCorrente`, `inserisciImmagineDataUrlNellaNota`, `inserisciImmagineNellaNota`

### `src/js/053_il-menu-della-chiocciola.js`
528 righe · in `dist/DPSH.html` dalla riga 37854

`inserisciTabellaNellaNota`, `aggiornaBarraTabellaNota`, `aggiornaPulsanteAllineamento`, `applicaEvidenziatoreNota`

### `src/js/054_selettore-foto-del-progetto-riusato-per-inserire.js`
77 righe · in `dist/DPSH.html` dalla riga 38382

`raccogliFotoProgetto`, `chiudiSelettoreFotoProgetto`, `apriSelettoreFotoProgetto`

### `src/js/055_dimensione-rimozione-di-unimmagine-gia-nella-not.js`
178 righe · in `dist/DPSH.html` dalla riga 38459

`nascondiBarraImmagineNota`, `aggiornaBarraImmagineNota`, `leggiStileImmagineNota`, `componiStileImmagineNota`, `aggiornaAttributiImmagineNota`

### `src/js/056_la-schermata-di-composizione-dellinquadramento.js`
217 righe · in `dist/DPSH.html` dalla riga 38637

`impostazioniMappaDaBlocco`, `testoEtichettaComposizione`, `testoEtichettaInsetComposizione`, `disegnaComposizione`, `scambiaElementoComposizione`, `aggiornaNordComposizione`, `aggiornaScalaComposizione`

### `src/js/057_un-cronometro-dentro-lapp.js`
390 righe · in `dist/DPSH.html` dalla riga 38854

`oraPrecisa`, `misura`, `riportaMisura`, `rif`, `rifTutti`, `aggiornaBarraComposizione`, `apriComposizioneMappa`, `chiudiComposizioneMappa`

### `src/js/058_il-pannello-dello-stile-del-testo.js`
439 righe · in `dist/DPSH.html` dalla riga 39244

### `src/js/059_ritaglio-delle-immagini-uno-strumento-solo-per-t.js`
274 righe · in `dist/DPSH.html` dalla riga 39683

`proporzioneRitaglio`, `limitaRiquadroRitaglio`, `applicaProporzioneRitaglio`, `ridisegnaRitaglio`, `angoliRiquadroRitaglio`, `puntoRitaglio`, `apriRitaglioImmagine`, `chiudiRitaglio`, `ritagliaImmagineArchiviata`

### `src/js/060_strumento-di-disegno-un-piccolo-editor-di-forme.js`
859 righe · in `dist/DPSH.html` dalla riga 39957

`nuovoStatoDisegno`, `riquadroForma`, `angoliRiquadro`, `formaSelezionata`, `percorsoRettangolo`, `tracciaPercorsoForma`, `disegnaTesto`, `disegnaForma`, `ridisegnaCanvasNota`, `getNoteDrawPoint`, `formaSottoIlPunto`, `manigliaSottoIlPunto`, `selezionaForma`, `aggiornaBarraFormaDisegno`, `applicaColoreDisegno`, `aggiornaPastiglieColoreDisegno`, `renderNoteDrawColors`, `etichettaSfondoDisegno`, `impostaSfondoDisegno`, `evidenziaScelteSfondoDisegno`, `usaImmagineComeSfondoDisegno`, `finalizzaPoligonoCorrente`, `chiediTestoDisegno`, `aggiornaStrumentoDisegno`, `apriStrumentoDisegno`, `chiudiStrumentoDisegno`, `noteHtmlToPlainText`

### `src/js/061_la-mappa-provider-geometria-finestra-continua.js`
1726 righe · in `dist/DPSH.html` dalla riga 40816

`wmsDisponibili`, `ETICHETTE_MAPPA_URL`, `tessereXDaLng`, `tessereYDaLat`, `lngDaTessereX`, `latDaTessereY`, `calcolaTessereFinestra`, `htmlTessereFinestra`, `puntoNellaFinestra`, `riquadroGeograficoFinestra`, `inquadraturaPerPunti`, `testoEtichettaAutomatica`, `inquadraturaSicura`, `convertiInquadramentoVecchio`, `htmlPinMappa`, `htmlSimboloProvaMappa`, `htmlBarraScalaMappa`, `posizioneElementoMappa`, `htmlNordMappa`, `htmlInsetRegionaleMappa`, `puntiProveDelProgetto`, `buildMappaInquadramentoHtml`, `noteHtmlToMarkdown`, `scaricaBlob`, `nomeFileNotaCorrente`, `documentoNotaStampa`, `parseExifGps`, `parseExifData`, `parseExifDateStr`, `handlePhotoFileSelected`, `renderPhotoGallery`, `openPhotoPreview`, `closePhotoPreview`, `backToPhotosModalFromPreview`, `deletePhoto`, `aggiornaRigaRifiuto`, `openEditModal`, `origineIntervallo`, `closeModal`, `openQuickFaldaModal`, `closeQuickFaldaModal`, `openStratiModal`, `closeStratiModal`

### `src/js/062_fase-2-riconoscimento-automatico-degli-strati.js`
212 righe · in `dist/DPSH.html` dalla riga 42542

`openStratiChoiceModal`, `closeStratiChoiceModal`, `updateAutoStratiPreview`, `openAutoStratiParamsModal`, `closeAutoStratiParamsModal`, `handleOpenAutoStrati`, `buildInquadramentoSatellitareHtml`

### `src/js/063_pagina-prova-replica-fedele-del-layout-di-riferi.js`
925 righe · in `dist/DPSH.html` dalla riga 42754

`arricchisciLogsConNsptRpd`, `tintaDatiProva`, `disposizioneSchede`, `buildDatiBoxHtml`, `buildColpiNsptTableHtml`, `scalaAssePulita`, `profonditaAsseAutomatica`, `spezzaEtichettaInRighe`, `disponiEtichetteSenzaSovrapposizioni`, `legendaGrafico`, `profonditaMassimaProgetto`, `profonditaAsseEffettiva`, `larghezzaBloccoGraficoPx`, `buildStratigrafiaColpiRpdSvg`

### `src/js/064_motore-di-rendering-dei-template-di-report.js`
209 righe · in `dist/DPSH.html` dalla riga 43679

`generatoreCasualeDaSeme`, `espandiAlternativeTesto`, `elencoItaliano`, `formattaCoordinateProve`, `valoriDellaProva`, `valoriCantiere`

### `src/js/065_i-tag-il-registro.js`
351 righe · in `dist/DPSH.html` dalla riga 43888

`eRiferimentoFigura`, `bersaglioFigura`, `etichettaBersaglioFigura`, `tagFigureDisponibili`, `etichettaVuotaFigura`, `etichettaTag`, `tagPerTipo`, `progettoPerTag`, `aggiornaPastiglieTag`, `nomeProgettoPerAvviso`, `scriviDatoCantiere`, `valoriCantiereConCorrezioni`, `applicaSegnapostiTesto`, `generaTestoDaModello`, `contaDatiMancanti`

### `src/js/066_il-modello-predefinito-ricavato-da-due-relazioni.js`
1335 righe · in `dist/DPSH.html` dalla riga 44239

`bloccoHaFontRegolabile`, `limitiFontScaleBlocco`, `scalaMinimaBlocco`, `scambiaOrdineInRiga`, `dividiLarghezzaRigaEvenmente`, `trovaBloccoPerTipoInPagina`, `rilevaPatternLayoutPagina`, `applicaPatternLayoutEditor`, `renderSuggerimentiLayoutEditor`, `segmentiTesto`, `eBloccoSpezzabile`, `indiciForzatiBlocco`, `stileGrigliaTabellaBlocco`, `elencoCategorieBlocco`, `escapeHtmlDidascalia`, `avvolgiConDidascalia`, `avvolgiScopeFlowable`, `applicaInterruzioniPaginaManualiCategoria`, `buildBlockContentHtml`, `distanzaIntestazioneMm`, `respiroIntestazioneMm`, `dimensioniImmagineDataUrl`, `altezzaIntestazioneMm`, `margineConIntestazione`, `distanzaPiedeMm`, `altezzaPiedeMm`, `htmlPiedeNelMargine`, `htmlIntestazioneNelMargine`, `buildPaginaHeaderFooterHtml`, `buildContenutoVoceStampa`, `buildGruppoRowSpanHtmlStampa`, `buildRigheSottoinsiemeHtml`, `buildPaginaRigheHtml`, `getReportTemplateIdPerProva`

### `src/js/067_generatore-html-per-singola-prova.js`
160 righe · in `dist/DPSH.html` dalla riga 45574

`buildSurveyReportHtml`, `getIconSpriteHtml`

### `src/js/068_compressione-foto-per-lexport-pdf.js`
538 righe · in `dist/DPSH.html` dalla riga 45734

`comprimiImmagineDataUrl`, `risolviEComprimiFotoUrl`, `cssFontIncorporati`, `cssRegoleFoglio`, `cssAnteprimaComeStampa`, `cssContenutoTesto`, `getReportPrintStyleBlock`, `getControlloImpaginazioneScriptTag`

### `src/js/069_lattesa-delle-mappe.js`
292 righe · in `dist/DPSH.html` dalla riga 46272

`buildIndiceReportCompletoHtml`, `buildSelezioneReportHtml`

### `src/js/070_impaginazione-reale-di-riepilogo-dettagliata-all.js`
217 righe · in `dist/DPSH.html` dalla riga 46564

`misuraFigliPerStampaMm`, `fondiTitoliConSuccessivo`, `impaginaBlocchiSuPagineFisiche`

### `src/js/071_motore-unificato-di-impaginazione.js`
802 righe · in `dist/DPSH.html` dalla riga 46781

`larghezzaPctBlocco`, `costruisciAtomiPaginaTemplate`, `costruisciPagineTemplateUnificato`, `provaSinteticaIntroduzione`, `raccogliVociIndice`, `numeraFigureERisolviRiferimenti`, `numeraPagineDocumento`, `buildCompleteReportHtml`, `downloadAllSurveyPhotosJpg`, `openSurveyPhotosModal`, `closeSurveyPhotosModal`, `handleGalleryBatchFiles`

### `src/js/071a_barre-del-pc.js`
163 righe · in `dist/DPSH.html` dalla riga 47583

`renderPc`, `contaStrati`, `miniProfilo`, `apriDalLato`

### `src/js/071b_registro-sul-pc.js`
152 righe · in `dist/DPSH.html` dalla riga 47746

`segnaRigaScelta`, `scegliRiga`, `righeVisibili`, `staScrivendo`, `chiudiMenuRiga`, `apriMenuContesto`, `apriMenuRiga`, `apriMenuProgetto`, `apriMenuProva`

### `src/js/071c_palette-e-scorciatoie.js`
128 righe · in `dist/DPSH.html` dalla riga 47898

`comandiPc`, `voceHtml`, `renderPalette`, `apriFinestraPc`, `apriPalette`, `eseguiVocePalette`, `apriScorciatoie`

### `src/js/071d_contatore-sul-pc.js`
21 righe · in `dist/DPSH.html` dalla riga 48026

`interruttoreContatorePc`

### `src/js/071e_guida-rapida-pc.js`
54 righe · in `dist/DPSH.html` dalla riga 48047

`mostraPassoGuida`, `apriGuidaRapida`, `chiudiGuidaRapida`, `forseGuidaRapida`

### `src/js/071f_terreno-dtm.js`
444 righe · in `dist/DPSH.html` dalla riga 48101

`utmDaGeo`, `geoDaUtm`, `puntoNelCrs`, `crsDaEpsg`, `leggiAsciiGrid`, `tagTiff`, `lzwTiff`, `inflateZlib`, `leggiGeoTiff`, `proveConCoordinate`, `ritaglioDtmPerProgetto`, `ritaglioDaSorgente`, `quoteDtm`, `quotaDtm`, `quotaDtmXY`, `quotaDellaProva`, `formattaMetri`, `renderTerreno`, `apriTerreno`, `chiediFileDtm`

### `src/js/071fs_sistema-di-riferimento.js`
66 righe · in `dist/DPSH.html` dalla riga 48545

`elencoSr`, `srDelProgetto`, `nomeBreveSr`, `coordNelSr`, `testoCoordSr`, `geoDaTestoUtm`, `aggiornaCampiSr`

### `src/js/071g_sezione.js`
432 righe · in `dist/DPSH.html` dalla riga 48611

`proveDellaSezione`, `nomeDpsh`, `datiSezione`, `occorrenzeFasce`, `correlazioniSezione`, `pathColpi`, `svgSezione`, `renderSezione`, `ridisegnaSezione`, `apriSezione`, `htmlFumettoProva`, `apriFumettoProva`, `chiudiFumetti`

### `src/js/071h_vista-3d.js`
2479 righe · in `dist/DPSH.html` dalla riga 49043

`triangolaDelaunay`, `datiVista3d`, `datiVista3dSenzaDtm`, `latiDelleProve`, `modelloCorrelazione`, `modelloSolido`, `involucroModello`, `colonnaSolido`, `splineSolido`, `ritagliaPoligono`, `dentroPoligono`, `areaPoligono`, `poligonoConvesso`, `triangoliPoligono`, `triangoliniPoligono`, `stratoAProfondita`, `google3d`, `sceltaSfondo3d`, `salvaSceltaSfondo3d`, `sfondoPerScena`, `caricaImmagine3d`, `scena3d`, `svgDaScena`, `vociLegenda3d`, `impaginaLegenda3d`, `conLegenda3d`, `disegnaScena`, `provaNelPunto`, `renderVista3d`, `apriVista3d`, `vistaIniziale3d`, `ridisegna3d`, `pizzicoDita`, `sposta3d`, `puntoCanvas`, `zoom3d`, `accendiSolido3d`, `livelliChiusi3d`, `righeLivelli3d`, `gruppoChiuso3d`, `renderLivelli3d`, `movimentoRidotto3d`, `dissolvenza3d`, `accendiLivello3d`, `etichetteLivello3d`, `inquadraLivello3d`, `menuQui`, `menuOpacita3d`, `menuLivello3d`, `gradi`, `direzioneVista3d`, `nomeDirezione`, `sincronizzaCursori3d`, `vaiAVista3d`, `giri`, `segnoGradi`, `bussola3d`, `avviaMoto3d`, `riempiSceltaSfondo3d`, `aggiornaStatoSfondo3d`, `cambiaSfondo3d`, `sincronizzaFoto3d`, `conSolido`, `nomeFileProgetto3d`, `svgVista3dDaScaricare`, `modelloObj`

### `src/js/071i_export-word.js`
1162 righe · in `dist/DPSH.html` dalla riga 51522

`xmlTesto`, `tw`, `coloreWord`, `primaFamiglia`, `nuovoContestoWord`, `nascostoWord`, `decoratoWord`, `soloInLineaWord`, `testoVisibileWord`, `rettangoloContenuto`, `ritagliaWord`, `rettangoloWord`, `raccogliFoglieWord`, `fogliaTestoWord`, `paragrafoVuotoWord`, `cellaVuotaWord`, `tblPrWord`, `tabellaDisposizioneWord`, `chiudiCellaWord`, `immagineInLineaWord`, `rasterizzaWord`, `proprietaRunWord`, `testoTrasformato`, `runDelParagrafoWord`, `altezzaRigaWord`, `righeDelTestoWord`, `stringiRunWord`, `marcatoreElencoWord`, `paragrafoWord`, `bordiWord`, `marginiCellaWord`, `sfondoEffettivoWord`, `contenutoWord`, `scatolaWord`, `tabellaWord`, `dividiWord`, `fogliaWord`, `impaginaWord`, `campoWord`, `segnalibroWord`, `sommarioWord`, `piedeWord`, `piedeInSezione`, `piedeTemplateWord`, `numerazioneInSezione`, `intestazioneWord`, `immagineAncorataWord`, `ancoraWord`, `cartaDelFoglioWord`, `intestazioneInSezione`, `partiIntestazioneWord`, `foglioWord`, `chiusuraSezioneWord`, `incorporaImmaginiWord`, `pacchettoDocxWord`, `segmentiWord`, `flussoWord`, `documentoStampaInDocx`

### `src/js/071j_sezioni-tracciate.js`
607 righe · in `dist/DPSH.html` dalla riga 52684

`tracceDelProgetto`, `estremiTraccia`, `prossimoNomeTraccia`, `tracciaInScena`, `tracceNellaScena3d`, `puntoAlSuolo3d`, `clicTracciaSezione3d`, `seguiTracciaSezione3d`, `creaGrigliaSezioni3d`, `contornoPerGriglia3d`, `creaGrigliaAssi3d`, `tagliaSullaTraccia3d`, `agganciaTaglioAllaGriglia3d`, `spostaTraccia`, `fineSpostaTraccia`, `tracciaSottoIlMouse3d`, `iniziaSpostaTraccia3d`, `seguiSpostaTraccia3d`, `tracciaDalTaglio3d`, `datiSezioneTracciata`, `svgSezioneTracciata`, `renderElencoSezioni3d`, `renderVistaSezioneTracciata`, `mappaSatelliteTraccia`, `paginaPdfSezione`, `esportaPdfSezioni`

### `src/js/071k_geopackage.js`
126 righe · in `dist/DPSH.html` dalla riga 53291

`realeSqlite`, `varintSqlite`, `recordSqlite`, `cellaSqlite`, `paginaFogliaSqlite`, `foglieSqlite`, `paginaInternaSqlite`, `fileSqlite`

### `src/js/071l_mappa-progetto.js`
291 righe · in `dist/DPSH.html` dalla riga 53417

`schedaProvaMappaHtml`, `renderSchedaProvaMappa`, `disegnaProveMappa`, `iconaProvaMappa`, `scegliProvaMappa`, `spostaProvaDallaMappa`, `SFONDI_2D`, `livelloSfondo2d`, `sfondoMappaProgetto`, `sfondo2dAcceso`, `mostraMappa2d`, `inquadraTutteMappa2d`, `mostraProvaSullaMappa`, `vaiAllaProva2d`, `modificaDatiDallaMappa`, `apriMappaProgetto`, `chiudiMappaProgetto`

### `src/js/071m_area-mappa.js`
567 righe · in `dist/DPSH.html` dalla riga 53708

`areaMappaAperta`, `modoAreaMappa`, `infoAreaMappa`, `coordinateAreaMappa`, `misuraAreaMappa`, `scegliStrumentoMappa`, `areaMetriQuadri`, `testoMisura`, `metriPrecisi`, `togliMisura`, `disegnaMisura2d`, `misuraNellaScena3d`, `finisciMisura`, `togliProfilo2d`, `disegnaProfilo2d`, `clicStrumentoMappa2d`, `clicStrumentoMappa3d`, `agganciaMappa2d`, `vociProvaMappa`, `menuProvaMappa`, `menuTracciaMappa`, `vociTracciaMappa`, `mostraSchedaComandi`, `scriveInUnCampo`, `caricaRotazioneMappa`, `pannelli`, `elPannello`, `telefonoMappa`, `salvaPannelli`, `applicaPannelli`, `riduciPannello`, `chiudiPannello`, `trascinaPillola`, `aggiornaBussola2d`, `giraMappa2d`, `angoloBussola2d`

### `src/js/071n_disegni.js`
105 righe · in `dist/DPSH.html` dalla riga 54275

`disegniDelProgetto`, `creaDisegno`, `salvaPoligonoDisegnato`, `testoDisegno`, `centroDisegno`, `disegniNellaMappa2d`, `disegniNellaScena3d`, `menuDisegno`, `vociDisegno`

### `src/js/071o_stili-livelli.js`
184 righe · in `dist/DPSH.html` dalla riga 54380

`etichettaDi`, `gruppoDiStile`, `tipoStile`, `stileLivello`, `stileProprio`, `togliStiliPropri`, `campiStile`, `trattoDash`, `trattoLeaflet`, `salvaStile`, `chiudiStileLivello`, `apriStileLivello`

### `src/js/071p_esporta-viste-3d.js`
1272 righe · in `dist/DPSH.html` dalla riga 54564

`vociEsportazione3d`, `conVista3dTemporanea`, `vistaBaseVoce3d`, `vistaPronta3dTavola`, `versoDaAz3d`, `ingombroScena3d`, `spostaCentroDiPixel3d`, `scenaVoce3d`, `puntoTerrenoTavola3d`, `mosaicoSfondo3d`, `sfondoEsportabile3d`, `MEZZO_ESTESO_3D`, `sfondoEstesoEsportabile3d`, `mezzoVisibile3d`, `conSfondoEsportabile3d`, `telaSezione2d`, `immagineDaSvg3d`, `ingombroPiantaSezione`, `scalaPiantaSezione`, `kPiantaSezione`, `altezzaPiantaSezione`, `largaPianta`, `disegnaPiantaTraccia3d`, `telaVoce3d`, `byteDaTela3d`, `pdfDaTavole3d`, `T3`, `foglioTavole3d`, `altoTitoloPdf3d`, `misureTavola3d`, `memoriaTavole3d`, `opzioniTavole3d`, `sfondoEstesoAnteprima3d`, `tipoTavola3d`, `versoTavola3d`, `spostaPagina3d`, `ordinaPagine3d`, `sottotitoloTavola3d`, `apriTavole3d`, `chiudiTavole3d`, `salvaMemoriaTavole3d`, `titoloTavola3d`, `aggiornaTitoloVista3d`, `renderProveTavola3d`, `aggiornaTastiVista3d`, `scegliVistaTavola3d`, `renderElencoTavole3d`, `disegnaMiniaturaTavola3d`, `aggiornaContoTavole3d`, `mostraTavola3d`, `regolaTavola3d`, `ridisegnaTavola3d`, `aggiornaMiniaturaScelta3d`, `esportaTavole3d`, `pagElenco`, `sottoMeta3d`, `sceltaTasti3d`, `regolaPianta3d`, `sulBordoPianta3d`, `finePianta3d`, `lasciaPianta3d`, `rimettiPianta3d`, `dopoProveTavola3d`, `titoloScelta3d`, `dopoTitolo3d`, `puntoTavola3d`, `elementoSotto3d`, `fineTrascina3d`, `renderTemplateTavole3d`

### `src/js/071q_perimetro-modello.js`
322 righe · in `dist/DPSH.html` dalla riga 55836

`disegnoPerimetro`, `puntiPerimetroModello`, `perimetroModelloXY`, `usaPerimetroModello`, `renderPerimetroModello3d`, `leggiZipQualsiasi`, `crsDaWkt`, `leggiGeoJson`, `leggiKml`, `leggiShp`, `nomiDaDbf`, `leggiGeoPackage`, `wkbPoligoni`, `poligoniDaFile`, `importaPerimetro`

### `src/js/071r_sposta-sulla-mappa.js`
174 righe · in `dist/DPSH.html` dalla riga 56158

`modificaMappaAttiva`, `aggiornaManiglieMappa`, `trascinamentoMappa`, `lasciaAlt`, `dopoModificaDisegno`, `manigliaDisegno2d`, `maniglieDisegno2d`, `schermoDalSuolo3d`, `maniglieNellaScena3d`, `elementoDaSpostare3d`, `iniziaSposta3d`, `seguiSposta3d`, `fineSposta3d`, `spostando3d`

### `src/js/071s_simbologia.js`
84 righe · in `dist/DPSH.html` dalla riga 56332

`ingombroSimbolo`, `svgFormaSimbolo`, `svgSimboloRiquadro`, `cssEtichetta`, `postoEtichetta`, `iconaSimbolo2d`, `simboloScena3d`, `etichettaScena3d`

### `src/js/071t_esporta-gis.js`
423 righe · in `dist/DPSH.html` dalla riga 56416

`rgbColore`, `coloreQgis`, `coloreKml`, `xmlEsc`, `wkb`, `coord`, `wkbPunto`, `wkbLinea`, `wkbPoligono`, `wkbMultiTriangoli`, `gpkgGeom`, `wktUtm`, `proprietaQml`, `simboloQml`, `simboloPuntoQml`, `trattoQml`, `simboloLineaQml`, `simboloPoligonoQml`, `etichetteQml`, `documentoQml`, `categorieQml`, `etichettePerRegolaQml`, `renderer3dQml`, `contaLivelloGis`, `zonaUtmProgetto`, `superficiModello3d`, `geopackageGis`, `pngSimbolo`, `documentoKmlGis`, `G`, `apriEsportaGis`, `renderEsportaGis`, `salvaSceltaGis`, `nel3d`, `esportaGis`

### `src/js/071s_confini-province.js`
119 righe · in `dist/DPSH.html` dalla riga 56839

### `src/js/071t_trova-dtm.js`
736 righe · in `dist/DPSH.html` dalla riga 56958

`anelliProvincia`, `dentroAnello`, `distanzaDaAnelloKm`, `provinceDelPunto`, `zonaUtmNaturale`, `luogoDelleProve`, `riquadroUtm`, `metriInteri`, `gradi6`, `codiciEpsgUtm`, `tessereCopernicus`, `pixelMercatore`, `tessereTerrarium`, `fontiPerLuogo`, `dettagliFonteDtm`, `schedaDtmTesto`, `linkCercaDtm`, `areaDtmGeojson`, `ascDaDtm`, `epsgDelDtm`, `erroreReteDtm`, `chiediInReteDtm`, `pixelDaPng`, `sorgenteTerrarium`, `geoTiffInRete`, `sorgenteCopernicus`, `unisciQuery`, `testoWcs`, `scopriWcs`, `urlGetCoverage`, `sorgenteWcs`, `dtmDaFonte`, `TD`, `renderTrovaDtm`, `apriTrovaDtm`, `chiudiTrovaDtm`, `caricaFonteDtm`, `scaricaFonteDtm`, `copiaTestoDtm`, `nomeFileDtm`, `datiScheda`

### `src/js/071u_carta-intestata.js`
443 righe · in `dist/DPSH.html` dalla riga 57694

`cartaDelTemplate`, `htmlCartaNelFoglio`, `regoleCarta`, `regoleCarteIntestate`, `marcaCartePrimaEAltre`, `aggiornaStileCarteEditor`, `caricaPdfjs`, `telaCarta`, `pagineCartaDaPdf`, `pagineCartaDaImmagine`, `pagineCartaDaWord`, `marginiDallaCarta`, `cartaDaFile`, `renderCartaEditor`, `applicaMarginiCarta`, `caricaCartaNelTemplate`

### `src/js/071q_strati-senza-vicoli-ciechi.js`
94 righe · in `dist/DPSH.html` dalla riga 58137

`nomeProva`, `nomeProvaAperta`, `testoSicuroStrati`, `proveDelProgettoConStrato`, `htmlStratoSenzaDati`, `renderProvaDiCalcoloStrati`, `calcolaSullaProva`, `vaiAdAssegnareIntervalli`

### `src/js/071r_tavole-nel-report.js`
154 righe · in `dist/DPSH.html` dalla riga 58231

`elencoTemplateTavole`, `templateTavole`, `tipoNelTemplate`, `memoriaConTemplate`, `regoleDallaMemoria`, `datiTavoleReport`, `titoliTavolaReport`, `foglioTavolaReport`, `opzioniTavolaReport`, `regolePagineTavole`, `capitoloTavoleHtml`

### `src/js/071s_importa-da-word.js`
403 righe · in `dist/DPSH.html` dalla riga 58385

`leggiZipCompresso`, `decomprimiDeflate`, `mmDaTwip`, `attrW`, `figliW`, `letturaDaWord`, `riepilogoLetturaWord`, `applicaLetturaWord`, `importaDaWordNelTemplate`

### `src/js/071v_tasto-destro.js`
130 righe · in `dist/DPSH.html` dalla riga 58788

`azioneDelMenuStrato`, `apriMenuStrato`, `premiNelMenuDelBlocco`, `apriMenuBloccoPc`, `apriMenuIntestazionePc`, `apriMenuPiedePc`, `apriMenuPaginaPc`, `apriMenuTemplateLibreria`

### `src/js/071v_morph-e-schede.js`
121 righe · in `dist/DPSH.html` dalla riga 58918

`durataMorph`, `curvaMorph`, `elementiMorph`, `misuraMorph`, `eseguiMorph`, `apriDalTasto`, `aggiornaCursore`, `aggiornaCursori`

### `src/js/072_fase-3-modal-fallback-gps-foto.js`
939 righe · in `dist/DPSH.html` dalla riga 59039

`ensureLeafletLoaded`, `showPhotoGpsFallbackStep`, `openPhotoGpsFallbackModal`, `closePhotoGpsFallbackModal`, `applyGpsToFallbackPhoto`, `openPhotoGpsMapPicker`, `scriviDatoProgettoCorrente`, `aggiornaPannelloBetaT`, `openDrawer`, `closeDrawer`, `openCantiereInfoModal`, `closeCantiereInfoModal`, `chiudiMenuAzioni`, `impostaTastoRegistraVisibile`, `linearScrollBy`, `animateViewSwap`, `exportGlobalJSONBackup`, `importGlobalJSONBackup`, `importGlobalZipBackup`, `renderThemeHuePicker`, `exportCsvFallback`

### `src/shell/06_fine.html`
3 righe · in `dist/DPSH.html` dalla riga 59978
