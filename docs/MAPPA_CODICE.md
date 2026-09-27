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
2850 righe · in `dist/DPSH.html` dalla riga 89

### `src/css/02_passaggio-telefono-pc.css`
66 righe · in `dist/DPSH.html` dalla riga 2939

### `src/css/03_regole-di-stile.css`
171 righe · in `dist/DPSH.html` dalla riga 3005

### `src/css/04_prova-e-home.css`
270 righe · in `dist/DPSH.html` dalla riga 3176

### `src/shell/03_fine-head.html`
3 righe · in `dist/DPSH.html` dalla riga 3446

### `src/markup/00_icone-e-schermate-principali.html`
441 righe · in `dist/DPSH.html` dalla riga 3449

### `src/markup/01_modalPhoto.html`
21 righe · in `dist/DPSH.html` dalla riga 3890

finestre: `#modalPhotoPreview`

### `src/markup/02_modalGps.html`
134 righe · in `dist/DPSH.html` dalla riga 3911

finestre: `#modalGpsSettings`

### `src/markup/03_modal.html`
59 righe · in `dist/DPSH.html` dalla riga 4045

finestre: `#modalEditStep`

### `src/markup/04_modalCustomNote.html`
14 righe · in `dist/DPSH.html` dalla riga 4104

finestre: `#modalCustomNote`

### `src/markup/06_modalStrati.html`
92 righe · in `dist/DPSH.html` dalla riga 4118

finestre: `#modalManageStrati`

### `src/markup/07_modalArchivePicker.html`
15 righe · in `dist/DPSH.html` dalla riga 4210

finestre: `#modalArchivePicker`

### `src/markup/08_modalArchiveManager.html`
25 righe · in `dist/DPSH.html` dalla riga 4225

finestre: `#modalArchiveManager`

### `src/markup/09_modalArchPrefEdit.html`
369 righe · in `dist/DPSH.html` dalla riga 4250

finestre: `#modalArchPrefEdit`

### `src/markup/10_modalWizard.html`
8 righe · in `dist/DPSH.html` dalla riga 4619

finestre: `#modalWizard`

### `src/markup/11_modalProjectNotes.html`
203 righe · in `dist/DPSH.html` dalla riga 4627

finestre: `#modalProjectNotes`

### `src/markup/12_modalNotePhotoPicker.html`
17 righe · in `dist/DPSH.html` dalla riga 4830

finestre: `#modalNotePhotoPicker`

### `src/markup/13_modalStileTesto.html`
85 righe · in `dist/DPSH.html` dalla riga 4847

finestre: `#modalStileTesto`

### `src/markup/14_modalComposizioneMappa.html`
210 righe · in `dist/DPSH.html` dalla riga 4932

finestre: `#modalComposizioneMappa`

### `src/markup/15_modalRitaglio.html`
39 righe · in `dist/DPSH.html` dalla riga 5142

finestre: `#modalRitaglio`

### `src/markup/16_modalNoteDraw.html`
105 righe · in `dist/DPSH.html` dalla riga 5181

finestre: `#modalNoteDraw`

### `src/markup/17_modalEditParams.html`
20 righe · in `dist/DPSH.html` dalla riga 5286

finestre: `#modalEditParams`

### `src/markup/18_modalStratiChoice.html`
22 righe · in `dist/DPSH.html` dalla riga 5306

finestre: `#modalStratiChoice`

### `src/markup/19_modalAutoStrati.html`
28 righe · in `dist/DPSH.html` dalla riga 5328

finestre: `#modalAutoStrati`

### `src/markup/20_modalPhotoGpsFallback.html`
42 righe · in `dist/DPSH.html` dalla riga 5356

finestre: `#modalPhotoGpsFallback`

### `src/markup/21_modalQuickFalda.html`
35 righe · in `dist/DPSH.html` dalla riga 5398

finestre: `#modalQuickFalda`

### `src/markup/22_appDialog.html`
30 righe · in `dist/DPSH.html` dalla riga 5433

finestre: `#appDialog`

### `src/markup/23_modalDeleteSurvey.html`
26 righe · in `dist/DPSH.html` dalla riga 5463

finestre: `#modalDeleteSurvey`

### `src/markup/24_modalSurveySettings.html`
217 righe · in `dist/DPSH.html` dalla riga 5489

finestre: `#modalSurveySettings`

### `src/markup/26_modalConfirmDelete.html`
21 righe · in `dist/DPSH.html` dalla riga 5706

finestre: `#modalConfirmDelete`

### `src/markup/27_modalBulkImport.html`
51 righe · in `dist/DPSH.html` dalla riga 5727

finestre: `#modalBulkImport`

### `src/markup/28_modalExport.html`
130 righe · in `dist/DPSH.html` dalla riga 5778

finestre: `#modalExportFormats`

### `src/markup/29_modalEsportaPdf.html`
111 righe · in `dist/DPSH.html` dalla riga 5908

finestre: `#modalEsportaPdf`

### `src/markup/30_modalReportTemplates.html`
46 righe · in `dist/DPSH.html` dalla riga 6019

finestre: `#modalReportTemplates`

### `src/markup/31_modalIndicePersonalizza.html`
63 righe · in `dist/DPSH.html` dalla riga 6065

finestre: `#modalIndicePersonalizza`

### `src/markup/32_modalTplTextEditor.html`
147 righe · in `dist/DPSH.html` dalla riga 6128

finestre: `#modalTplTextEditor`

### `src/markup/33_modalAnteprimaStampaReale.html`
42 righe · in `dist/DPSH.html` dalla riga 6275

finestre: `#modalAnteprimaStampaReale`

### `src/markup/34_modalTemplateEditor.html`
301 righe · in `dist/DPSH.html` dalla riga 6317

finestre: `#modalTemplateEditor`

### `src/markup/35_modalProjectActions.html`
92 righe · in `dist/DPSH.html` dalla riga 6618

finestre: `#modalProjectActions`

### `src/markup/36_modalCronologia.html`
18 righe · in `dist/DPSH.html` dalla riga 6710

finestre: `#modalCronologia`

### `src/markup/37_modalConfrontoProve.html`
23 righe · in `dist/DPSH.html` dalla riga 6728

finestre: `#modalConfrontoProve`

### `src/markup/38_modalBackupChoice.html`
35 righe · in `dist/DPSH.html` dalla riga 6751

finestre: `#modalBackupChoice`

### `src/markup/39_modalSurveyPhotos.html`
34 righe · in `dist/DPSH.html` dalla riga 6786

finestre: `#modalSurveyPhotos`

### `src/markup/40_modalNewProject.html`
33 righe · in `dist/DPSH.html` dalla riga 6820

finestre: `#modalNewProject`

### `src/markup/41_modalNewSurvey.html`
55 righe · in `dist/DPSH.html` dalla riga 6853

finestre: `#modalNewSurvey`

### `src/markup/42_drawer.html`
269 righe · in `dist/DPSH.html` dalla riga 6908

finestre: `#drawerMenu`

### `src/markup/43_modalPortaERicevi.html`
49 righe · in `dist/DPSH.html` dalla riga 7177

### `src/markup/44_modalPalette.html`
18 righe · in `dist/DPSH.html` dalla riga 7226

finestre: `#modalPalette`, `#modalScorciatoie`

### `src/shell/04_apre-motore-note.html`
1 righe · in `dist/DPSH.html` dalla riga 7244

### `src/vendor/motore-note.min.js`
153 righe · in `dist/DPSH.html` dalla riga 7245

### `src/shell/05_tra-motore-e-app.html`
2 righe · in `dist/DPSH.html` dalla riga 7398

### `src/js/000_avvio-stato-e-salvataggio.js`
247 righe · in `dist/DPSH.html` dalla riga 7400

`classicoPaginaDefault`, `stratiInizialiProgettoNuovo`, `flashDataChangedCards`

### `src/js/001_fase-3-gps-live-fallback-foto-import-batch.js`
203 righe · in `dist/DPSH.html` dalla riga 7647

`syncStateToProject`, `scriviStatoAttivoNelProgetto`, `syncProjectToActiveState`, `playBeep`, `closeAnyOpenModal`

### `src/js/002_dialoghi-in-app.js`
340 righe · in `dist/DPSH.html` dalla riga 7850

`_initAppDialog`, `_leggiCampiAppDialog`, `_closeAppDialog`, `_dialogStyleFor`, `_cleanDialogText`, `appDialog`, `_appDialogOra`, `appAlert`, `appConfirm`, `appConfirmDelete`, `mostraToast`, `nascondiToast`, `toastODialogo`, `ignoraErrore`, `appPrompt`, `appPromptCampi`

### `src/js/003_toggle-tema-sole-luna.js`
46 righe · in `dist/DPSH.html` dalla riga 8190

`syncThemeToggleLabel`, `applyGloveMode`

### `src/js/004_funzioni-sperimentali.js`
600 righe · in `dist/DPSH.html` dalla riga 8236

`applyDebugMode`, `ico`, `triggerVibrate`, `requestWakeLock`, `applicaStatoSalvato`, `migrazione0a1`, `loadState`, `stripNoteImagesHtml`, `saveState`, `avvisaSalvataggioFallito`, `getStratoById`, `getEffectiveLithology`, `populateStratiDropdown`

### `src/js/004a_dati-salvati-lettura-e-quarantena.js`
173 righe · in `dist/DPSH.html` dalla riga 8836

`leggiStatoSalvato`, `datiNonCaricati`, `scriviQuarantena`, `testoAvvisoDatiNonCaricati`, `mostraAvvisoDatiNonCaricati`, `scaricaDatiNonCaricati`, `ripartiDaVuotoDopoDatiNonCaricati`, `mostraBarraSalvataggioSospeso`

### `src/js/004b_versione-dello-schema-e-migrazioni.js`
157 righe · in `dist/DPSH.html` dalla riga 9009

`migrazione2a3`, `migrazione1a2`, `versioneDeiDati`, `migraDati`, `predefinitiPerMigrazioni`, `copiaPrimaDiAggiornareIDati`, `versioneFileImportato`, `controllaVersioneFileImportato`, `migraProgettiImportati`

### `src/js/004c_controllo-di-integrita.js`
257 righe · in `dist/DPSH.html` dalla riga 9166

`verificaIntegrita`, `registraCorrezioni`, `idPresentiNelDatabaseFoto`, `verificaIntegritaConFoto`, `elencoAnomalie`, `controllaIntegritaDopoAvvio`, `renderIntegritaPrimaExport`

### `src/js/004d_tracciabilita-degli-intervalli.js`
38 righe · in `dist/DPSH.html` dalla riga 9423

`nuovoIntervallo`, `misuraDiIntervallo`, `segnaIntervalloModificato`

### `src/js/004e_impronta-e-modifiche-vere.js`
206 righe · in `dist/DPSH.html` dalla riga 9461

`costantiSha256`, `sha256Byte`, `sha256Testo`, `sha256Async`, `jsonCanonico`, `htmlNotaSenzaImmagini`, `testoContenutoProgetto`, `registraModificheVere`, `accettaContenutoProgetto`, `accettaNormalizzazioneApertura`, `primaContenutiConosciuti`, `formattaQuandoCompleto`

### `src/js/005_fase-2-riconoscimento-automatico-degli-strati.js`
155 righe · in `dist/DPSH.html` dalla riga 9667

`getStratiBoundaryIndices`, `detectStratiSegments`, `applyDetectedSegmentsToLogs`, `moveStratiBoundary`, `svgTileUrl`

### `src/js/006_retini-litologici-ufficiali-estratti-pixel-per-p.js`
184 righe · in `dist/DPSH.html` dalla riga 9822

`getPatternCss`, `getSvgPatternDef`, `buildPatternOptionsHtml`, `buildPatternPickerHtml`, `buildArchPatternPickerHtml`

### `src/js/007_archivio-litologico-globale.js`
643 righe · in `dist/DPSH.html` dalla riga 10006

`getArchiveList`, `stratoHaCollegamentoArchivioValido`, `campiArchivioDaStrato`, `promoteStratoToArchive`, `aggiornaVoceArchivioDaStrato`, `mergeLithologyArchiveInto`, `createStratoFromArchive`, `computeArchiveStats`, `formatUltimoUtilizzo`, `renderStratiList`

### `src/js/008_ui-archivio-litologico-picker-gestione-globale.js`
127 righe · in `dist/DPSH.html` dalla riga 10649

`renderArchivePickerList`, `updateArchivePickerConfirmState`, `openArchivePicker`, `closeArchivePicker`

### `src/js/009_gestione-archivio-globale.js`
294 righe · in `dist/DPSH.html` dalla riga 10776

`renderArchiveManagerList`, `openArchiveManager`, `closeArchiveManager`

### `src/js/010_modal-modifica-preferenza-formula.js`
57 righe · in `dist/DPSH.html` dalla riga 11070

`apriModificaPreferenzaArchivio`, `chiudiModificaPreferenzaArchivio`

### `src/js/011_export-import-archivio.js`
62 righe · in `dist/DPSH.html` dalla riga 11127

### `src/js/012_motore-di-calcolo-parametri-geotecnici-avanzati.js`
383 righe · in `dist/DPSH.html` dalla riga 11189

`lookupPesoVolume`, `classificaConsistenza`, `drSkemptonLimiSabbie`, `clamp100`, `candidatiCompatibili`, `calcolaCr`, `calcolaN160`, `condizioneFalda`, `elaboraStratiProva`, `normalizzaTesto`, `categorieDiTesto`, `categorieRiconosciuteDiStrato`, `stratoRischioCarbonatico`, `valutaSuggerimento`, `applicaFallbackSuggerimentoParziale`

### `src/js/013_note-scientifiche-per-autore-dove-possibile-veri.js`
56 righe · in `dist/DPSH.html` dalla riga 11572

`notaScientificaDi`, `categorieApplicabili`

### `src/js/014_wizard-navigazione-sempre-visibile-a-differenza.js`
108 righe · in `dist/DPSH.html` dalla riga 11628

`categoriaTipicaPerStrato`, `candidatiWizardIgnorandoTipicita`, `categoriaHaConsigliato`, `seleziona`, `ensureParametriAvanzati`, `fmtIT`, `formattaDataIT`

### `src/js/015_ponte-col-modulo-1-colpi-dpsh-nspt-nspt-rpd-per.js`
123 righe · in `dist/DPSH.html` dalla riga 11736

`faldaDaHeader`, `betaTCalcolato`, `betaTStrumento`, `rpdDiLog`, `nsptDiLog`, `getEffectiveLithologyIn`, `getLogsPerStratoIn`, `stratiEffettiviProva`

### `src/js/016_vista-interattiva-elaborazione-dati-speciali.js`
325 righe · in `dist/DPSH.html` dalla riga 11859

`primoCandidatoConsigliato`, `calcolaRisultatiPerStratiCorrenti`, `buildParametriAvanzatiBodyHtml`, `buildParametriAvanzatiSummaryHtml`, `refreshParametriAvanzatiViews`, `bindParametriAvanzatiEvents`, `renderEditParamsModalBody`, `openEditParamsModal`, `chiudiEditParamsModal`, `cancelEditParamsModal`, `saveEditParamsModal`

### `src/js/017_wizard-guidato-parametri-avanzati-selezione-pass.js`
640 righe · in `dist/DPSH.html` dalla riga 12184

`formattaValoreWizard`, `raggruppaPerAutore`, `categorieConSceltaWizard`, `primoStratoDaCompletare`, `apriWizardParametri`, `primoCampoWizardMancante`, `chiudiWizardParametri`, `autoCompilaStrato`, `renderWizardModal`, `renderWizardStep`, `renderWizardRiepilogo`

### `src/js/018_export-tabelle-riepilogo-e-dettagliata-stesso-fo.js`
237 righe · in `dist/DPSH.html` dalla riga 12824

`autoFitTabellaExport`, `larghezzaColonnaEtichetta`, `autoFitTabellaRighe`, `thExp`, `tdExp`, `tdlExp`, `tsecExp`, `intestazioneColonneExp`, `colgroupExp`, `htmlTabellaRiepilogo`, `conIndiceRiga`, `costruisciTabellaCategoria`, `htmlTabellaDettagliata`

### `src/js/019_allegato-compendio-delle-formule-di-correlazione.js`
131 righe · in `dist/DPSH.html` dalla riga 13061

`candidatoAllegato`, `buildAllegatoHtml`

### `src/js/020_fogli-excel-riepilogo-e-dettagliata-replica-fede.js`
2021 righe · in `dist/DPSH.html` dalla riga 13192

`argbExcel`, `stileCellaExcel`, `scriviRigaExcel`, `scriviSezioneExcel`, `intestazioneWorksheetExcel`, `popolaWorksheetRiepilogo`, `popolaWorksheetDettagliata`, `datiCalcolatiProva`, `elencoProveProgetto`, `sezioneProvaHtml`, `documentoEsportazioneAvanzata`, `aggiungiBgcolorPerWord`, `costruisciDocumentoWord`, `getRodForDepth`, `suPc`, `mostraVistaProva`, `renderUltimiIntervalli`, `impulsoContatoreColpi`, `numeroConVirgola`, `testoIntervallo`, `tastoRegistraVisibile`, `testiTestataProva`, `aggiornaSpieProva`, `updateUI`, `aggiornaHintManiglieStratiGrafico`, `aggiornaBottoneModificaStratiGrafico`, `renderIntegratedLogsTable`, `renderIntegratedDepthLabels`, `recalculateDepths`, `deleteLogStep`, `renderLogsTable`, `chiudiRigheAperte`, `collegaRigaRegistro`, `renderChart`, `eseguiPiuUnColpo`, `closeCustomNoteModal`, `confirmAndNextStep`, `togliUltimoIntervallo`, `annullaRegistrazione`, `undoLastStep`, `openGpsModal`, `closeGpsModal`, `updateModalGpsStatusText`, `indirizziMappePunto`, `aggiornaApriInMappe`, `startLiveGpsWatch`, `stopLiveGpsWatch`, `updateLiveGpsIndicator`, `fetchGpsPositionModal`, `closeAllGpsAccordion`, `openGpsAccordion`, `setGpsMapStyle`, `gpsLiveDotIcon`, `updateGpsModalMapLiveDot`, `gpsAltraProvaIcon`, `gpsMiaProvaIcon`, `aggiornaIconaMiaProvaMappaGps`, `aggiornaAltreProveMarkersSuMappaGps`, `ensureGpsModalMapReady`

### `src/js/021_diagnostica-gps.js`
228 righe · in `dist/DPSH.html` dalla riga 15213

`diagLine`, `runGpsDiagnostics`, `showGpsMapSearchMessage`, `runGpsMapSearch`, `parsePastedCoords`

### `src/js/022_importazione-coordinate-da-file-kml-gpx.js`
323 righe · in `dist/DPSH.html` dalla riga 15441

`parseGeoFileText`, `applyGpsCoordsToModal`, `aggiornaConteggiHome`, `switchView`, `renderSchermataProgetto`

### `src/js/023_eliminazione-prova.js`
130 righe · in `dist/DPSH.html` dalla riga 15764

`openDeleteSurveyModal`, `closeDeleteSurveyModal`

### `src/js/024_impostazioni-della-singola-prova.js`
868 righe · in `dist/DPSH.html` dalla riga 15894

`radiceProva`, `proveFisiche`, `prossimaLetteraInterpretazione`, `duplicaProvaComeInterpretazione`, `mostraSchedaProva`, `openSurveySettingsModal`, `closeSurveySettingsModal`, `renderSurveySwitcherBar`, `updateSurveySwitcherFade`, `promemoriaBackup`, `renderPromemoriaBackup`, `normalizzaPerRicerca`, `progettoCorrispondeRicerca`, `progettiVisibiliHome`, `renderFiltroStatoProgetti`, `ultimaProvaUsata`, `dataBreve`, `renderHomeProjects`, `openProject`, `showUndoBanner`, `hideUndoBanner`, `performUndo`, `openConfirmDeleteModal`, `closeConfirmDeleteModal`, `deleteProject`, `performDeleteProject`, `duplicateProject`, `rinnovaIdProve`, `renderStatoAzioniProgetto`, `openProjectActionsModal`, `closeProjectActionsModal`

### `src/js/025_scelta-formato-backup.js`
254 righe · in `dist/DPSH.html` dalla riga 16762

`openBackupChoiceModal`, `closeBackupChoiceModal`, `avvisiPrimaExport`, `apriProvaPerCorreggere`, `renderRiepilogoPrimaExport`, `openExportModal`, `closeExportModal`

### `src/js/026_libreria-template-di-report.js`
428 righe · in `dist/DPSH.html` dalla riga 17016

`miniaturaTemplatePaginaHtml`, `miniaturaTemplateIndiceHtml`, `chiudiMenuAzioniTemplate`, `apriMenuAzioniTemplate`, `elencoTemplateReportOrdinato`, `openReportTemplatesModal`, `closeReportTemplatesModal`, `esportaBackupTemplateReport`, `importaBackupTemplateReport`, `nomeTemplateGiaEsistente`, `prossimoNomeTemplateDisponibile`, `risolviCollisioneNomeTemplate`, `duplicaTemplateReport`, `creaTemplateVuoto`, `rinominaTemplateReport`, `eliminaTemplateReport`, `renderReportTemplatesList`

### `src/js/027_libreria-template-indice.js`
151 righe · in `dist/DPSH.html` dalla riga 17444

`elencoIndiceTemplateOrdinato`, `nomeIndiceTemplateGiaEsistente`, `prossimoNomeIndiceTemplateDisponibile`, `risolviCollisioneNomeIndiceTemplate`, `duplicaIndiceTemplate`, `creaNuovoTemplateIndice`, `rinominaIndiceTemplate`, `eliminaIndiceTemplate`, `renderIndiceTemplatesList`

### `src/js/028_editor-a-righe-del-template-di-report.js`
843 righe · in `dist/DPSH.html` dalla riga 17595

`nuovoIdEditor`, `nuovaPaginaVuota`, `seedPaginaDefaultClassico`, `computeEditorPreviewCtx`, `contenutoBloccoOPlaceholder`, `calcolaIndiciImmaginePerBlocco`, `calcolaIndiciFigulaPerBlocco`, `didascaliaAutomaticaBlocco`, `marcaNumeroDidascalia`, `ruoloFigura`, `elencoFigureTemplate`, `aggiornaCtxFotoEditor`, `trovaBloccoPerId`, `trovaVoceRigaPerId`, `trovaVoceRigaPerIdOvunque`, `trovaBloccoPerIdOvunque`, `trovaVoceContenenteBlocco`, `spanMinimoVoce`, `ridisegnaGraficoAnteprima`, `spanVoceInGriglia`, `flexEntryCss`, `styleDimensioneVoce`, `trovaIndiceRigaPerVoce`, `convertiScalaGraficoSalvata`, `convertiSeparatoriInDivisori`, `appiattisciRowSpanTemplate`, `rimuoviRiserveRowSpan`, `sanitizzaBlocchiFlowableIsolati`, `calcolaGruppiRowSpanPagina`, `rimuoviBloccoDaPagina`, `modalitaMobileTemplateEditor`, `inserisciBloccoATocco`

### `src/js/029_blocco-in-spostamento.js`
1540 righe · in `dist/DPSH.html` dalla riga 18438

`bloccoInSpostamento`, `avviaSpostamentoBlocco`, `annullaSpostamentoBlocco`, `eliminaBloccoInSpostamento`, `posaBloccoQui`, `avvisaSeBloccoContinuaSuPiuPagine`, `renderBarraSpostamento`, `evidenziaVoceSpostamentoNellaPalette`, `aprTendinaPaletteSeMobile`, `portaBloccoInVista`, `apriTendinaPaletteMobile`, `chiudiTendinaPaletteMobile`, `aggiornaIconaFabPalette`, `paginaGenerataDalProgramma`, `inserisciBloccoInPagina`, `catturaRettangoliEditor`, `calcolaPosizioneDropEditor`, `stimaAltezzaPerLarghezza`, `valutaQualitaPiazzamento`, `applicaMagneteDropEditor`, `messaggioQualitaDrop`, `applicaStatoQualitaGhost`, `mostraIndicatoreDropEditor`, `nascondiIndicatoreDropEditor`, `hostFloatingUiEditor`, `costruisciContenutoGhostTrascinamento`, `misuraDimensioneNaturaleGhost`, `creaGhostTrascinamentoEditor`, `posizionaGhostTrascinamentoEditor`, `rimuoviGhostTrascinamentoEditor`, `avviaTrascinamentoEditor`, `mostraCestinoTrascinamento`, `nascondiCestinoTrascinamento`, `aggiornaCestinoTrascinamento`, `avviaAutoScrollViewportEditor`, `avviaAutoScrollBordoEditor`, `fermaAutoScrollBordoEditor`, `gestisciSpostamentoEditor`, `terminaTrascinamentoEditor`, `tipiBloccoGiaUsatiNelTemplate`, `renderTemplateEditorPalette`, `mostraAnteprimaPaletteHover`, `nascondiAnteprimaPaletteHover`, `renderTemplateEditorPageControls`, `sincronizzaControlliMarginiSidebar`, `catturaRectBlocchiPerFlip`, `applicaFlipBlocchi`

### `src/js/030_guardia-contro-le-misure-degeneri.js`
1291 righe · in `dist/DPSH.html` dalla riga 19978

`filtraCategorieHtmlFlowable`, `costruisciHtmlBloccoEditor`, `renderaGruppoRowSpanEditor`, `renderTemplateEditorCanvas`, `selezionaBloccoEditor`, `deselezionaBloccoEditor`, `attivaGestureTapBloccoEditor`, `attivaChipSpostamentoBlocco`, `attivaDoppioTapResetSlider`, `confiniTaglioBlocco`, `mostraAnteprimaTaglio`, `nascondiAnteprimaTaglio`, `inserisciInterruzioneNelTesto`, `togliInterruzioneNelTesto`, `attivaManigliaScalaBlocco`

### `src/js/031_basi-del-carattere-per-i-blocchi-tabellari.js`
124 righe · in `dist/DPSH.html` dalla riga 21269

`baseFontBloccoTabellare`, `suddividiGruppoCategorie`, `ptDaFontScale`, `fontScaleDaPt`, `intervalloPtBlocco`

### `src/js/032_controllo-numerico-condiviso.js`
80 righe · in `dist/DPSH.html` dalla riga 21393

`htmlSpiegazione`, `htmlInterruttore`, `htmlControlloNumerico`

### `src/js/033_schede-del-menu-del-blocco.js`
638 righe · in `dist/DPSH.html` dalla riga 21473

`spostaRimuoviNelMenuAltro`, `schedaDiSezione`, `fasciaDiSezioneMenu`, `riordinaSezioniAFasce`, `organizzaMenuInSchede`, `attivaTrasparenzaMenuDuranteRegolazione`, `collegaControlloNumerico`, `larghezzaRigaUtileMm`, `etichettaLarghezzaBlocco`, `attivaManigliaColspanBlocco`, `mostraEtichettaManigliaBlocco`, `nascondiEtichettaManigliaBlocco`, `catturaBordiAltriBlocchiEditor`, `mostraGuidaAllineamentoEditor`, `nascondiGuidaAllineamentoEditor`, `catturaBordiVerticaliAltriBlocchiEditor`, `mostraGuidaAllineamentoOrizzontaleEditor`, `nascondiGuidaAllineamentoOrizzontaleEditor`, `chiudiMenuBloccoEditor`

### `src/js/034_avvisi-che-non-restano-indietro.js`
2499 righe · in `dist/DPSH.html` dalla riga 22111

`idBloccoMenuAperto`, `firmaMisureBlocco`, `riallineaMenuBloccoAMisureNuove`, `tagliEPaginePerBlocco`, `condensaBloccoPerPagineMinime`, `riapplicaDivisioneAutomatica`, `riapplicaDivisioniAutomaticheTemplate`, `collassaMenuBloccoEditor`, `mostraBollicinaMenuBlocco`, `rimuoviBollicinaMenuBlocco`, `gestisciClickFuoriMenuBlocco`, `bilanciaRigaBlocco`, `riordinaAutomaticoPagina`, `apriMenuBloccoEditor`

### `src/js/035_editor-di-testo-per-i-blocchi-titolo-testo-richi.js`
732 righe · in `dist/DPSH.html` dalla riga 24610

`editorAttivo`, `dopoComandoTesto`, `collegaComandoTesto`, `pannelloDelPulsante`, `chiudiTuttiIPannelliTesto`, `creaEditorTesto`, `aggiornaSegnapostoTestoTemplate`, `apriTplTextEditor`, `chiudiTplTextEditor`, `posizionaMenuBloccoEditor`, `applicaAltezzaMenuMobile`, `attivaRidimensionamentoMenuMobile`, `portaBloccoSopraIlMenu`, `attivaTrascinamentoMenuBloccoEditor`, `trovaRigaRealeInEccesso`, `rigaContieneBloccoBloccato`, `rigaHaBloccoGenuinamenteBloccato`, `spostaBlocchiInEccessoAllaPaginaSuccessiva`, `gestisciInserimentoBloccoNuovoConOverflow`

### `src/js/036_blocchi-flowable-allegato-formule-di-correlazion.js`
98 righe · in `dist/DPSH.html` dalla riga 25342

`trovaBloccoEPaginaPerId`, `paginaOrigineBlocco`, `coloreCategoriaBlocco`, `elencoSegmentiPaginaBlocco`

### `src/js/037_fase-c-avvisi-di-overflow-reali.js`
113 righe · in `dist/DPSH.html` dalla riga 25440

`calcolaAvvisiOverflowGruppiCategoria`, `ricalcolaAvvisiOverflowTuttiBlocchi`

### `src/js/038_fase-d-riconciliazione-editor-export.js`
702 righe · in `dist/DPSH.html` dalla riga 25553

`verificaPagineOrigineControMotoreReale`, `costruisciRigaContinuazionePagina`, `miniaturaPaginaContinuazione`, `sincronizzaFlussiBlocchiLunghi`, `mostraToastTemplateEditor`, `mostraLineaFinePaginaA4`, `adattaScalaEditorCanvas`, `impostaZoomEditorTemplate`, `adattaLarghezzaEditorTemplate`, `reimpostaZoomEditorTemplateAutomatico`, `aggiornaBottoneAnteprimaPulita`, `aggiornaBottoneFullscreenPreview`

### `src/js/039_fase-b-anteprima-di-stampa-reale.js`
968 righe · in `dist/DPSH.html` dalla riga 26255

`generaAnteprimaStampaReale`, `apriAnteprimaStampaReale`, `chiudiAnteprimaStampaReale`, `zoomAttualeEditorTemplate`, `neutralizzaIdentificatoriMiniatura`, `renderTemplateEditorPagesStrip`, `attivaModalitaSelezionePagine`, `togglePaginaSelezionata`, `esciModalitaSelezionePagine`, `eliminaPagineSelezionateEditor`, `gestisciSpostamentoPaginaEditor`, `mostraIndicatoreRiordinoPagine`, `nascondiIndicatoreRiordinoPagine`, `terminaRiordinoPagineEditor`, `impostaAnteprimePagineEspanse`, `aggiornaAnteprimePagineDopoCambioAltezza`, `cambiaPaginaEditor`, `eliminaPaginaEditor`, `aggiungiPaginaEditor`, `salvaUndoSnapshotEditor`, `scartaUltimoSnapshotEditor`, `undoTemplateEditor`, `redoTemplateEditor`, `ripristinaPagineEditor`, `aggiornaBottoneUndoEditor`, `marginiPaginaDiDefault`

### `src/js/040_lo-stile-del-testo-in-un-posto-solo.js`
40 righe · in `dist/DPSH.html` dalla riga 27223

`istantaneaTemplate`

### `src/js/041_le-eccezioni-di-stile-dichiarate.js`
43 righe · in `dist/DPSH.html` dalla riga 27263

`eccezioniDiStile`, `riportaAlloStileDelDocumento`

### `src/js/042_un-solo-blocco-di-testo-i-titoli-li-dichiara-il.js`
1512 righe · in `dist/DPSH.html` dalla riga 27306

`risolviTagInStampa`, `figuraBersagliataNelTemplate`, `cambiaTipoTagNelBlocco`, `marcaTitoliPerIndice`, `convertiBloccoTitoloInTesto`, `convertiTitoliDelTemplate`, `stileTestoDiDefault`, `stileTestoDelTemplate`, `pilaFont`, `cssVariabiliStileTesto`, `stileIndiceDiDefault`, `getIndiceTemplateIdPerProgetto`, `stileIndiceDelProgetto`, `cssVariabiliStileIndice`, `separaNumeroDaEtichetta`, `numeriGerarchiciDiRighe`, `calcolaBudgetPaginaMm`, `apriTemplateEditor`, `chiudiTemplateEditor`, `templateEditorHasUnsavedChanges`, `richiediChiusuraTemplateEditor`, `salvaTemplateEditor`, `salvaTemplateEditorComeCopia`, `chiudiAlToccoFuori`, `renderTemplateEditorPreviewProjectSelector`, `renderTemplateEditorPreviewSurveySelector`, `aggiornaAvvisoTemplateEditorPreviewSurvey`, `aggiornaBottoneGridGuides`, `renderGrigliaGuidaEditor`, `attivaLongPressManigliePagina`, `nascondiManigliePaginaEditor`, `renderManigliePaginaEditor`, `resettaManigliaPagina`, `attivaTrascinamentoManigliaPagina`, `rehydrateProjectPhotosForExport`, `segnapostoFoto`, `placeholderizzaFotoProgetto`, `assemblaBlobConSegnaposto`, `contaFotoSenzaImmagine`, `avvisaFotoMancantiNelBackup`, `scaricaBlobJson`, `exportProjectJSON`, `statoConFotoPerExport`, `exportSingleJSON`

### `src/js/043_supporto-zip-nativo.js`
441 righe · in `dist/DPSH.html` dalla riga 28818

`ZIP_CRC32_TABLE`, `zipCrc32`, `zipDosDateTime`, `buildZipBlob`, `readZipStoreOnly`, `dataUrlToUint8Array`, `uint8ArrayToDataUrl`, `extFromMime`, `mimeFromZipExt`, `cloneProjectMetaSenzaFoto`, `leggiDataUrlFoto`, `respiraUnAttimo`, `estraiFotoProgettoPerZip`, `reidrataProgettoDaZip`, `scaricaBlobFile`, `exportProjectZip`, `exportProjectPhotos`, `exportGlobalZip`, `importProjectsFromZip`

### `src/js/044_fase-1-importazione-progetti-da-file-json.js`
315 righe · in `dist/DPSH.html` dalla riga 29259

`normalizeImportedJsonToProjects`, `importProjectsFromJSON`, `salvaImmaginiImportate`, `controllaFotoImportate`, `testoAnomalieImportate`, `testoFotoAssentiNelFile`, `handleImportJsonFile`

### `src/js/044a_librerie-che-viaggiano-col-progetto.js`
237 righe · in `dist/DPSH.html` dalla riga 29574

`contenutoVoceLibreria`, `templateReportEffettivo`, `templateIndiceEffettivo`, `templateIntroduzioneEffettivo`, `stratiDelProgetto`, `librerieUsateDa`, `nomeLiberoInLibreria`, `accogliLibrerie`, `estraiLibrerieDalFile`, `testoLibrerieAccolte`, `riallineaProgettoAperto`, `nomeFileProgetto`

### `src/js/044b_pacchetto-di-progetto.js`
565 righe · in `dist/DPSH.html` dalla riga 29811

`nomeDispositivo`, `impostaNomeDispositivo`, `suQuestoDispositivo`, `idImmaginiNelHtml`, `immaginiDelProgetto`, `leggiImmagineArchiviata`, `prefissoDataUrl`, `byteDaDataUrl`, `dataUrlDaByte`, `estensioneDaPrefisso`, `improntaProgetto`, `impronteImmaginiQui`, `conteggiProgetto`, `correzioniDelProgetto`, `formaSalvataProgetto`, `stimaPacchetto`, `formattaMegabyte`, `creaPacchettoProgetto`, `vociSonoUnPacchetto`, `leggiPacchetto`, `confrontaConPresente`, `nomeCopiaDaPacchetto`, `applicaPacchetto`

### `src/js/044c_finestre-porta-e-ricevi.js`
270 righe · in `dist/DPSH.html` dalla riga 30376

`plurale`, `maiuscolaIniziale`, `numeriPassaggioHtml`, `apriPortaProgetto`, `chiudiPortaProgetto`, `creaEScaricaPacchetto`, `cambiaNomeDispositivo`, `apriRiceviProgetto`, `chiudiRiceviProgetto`, `testoConfrontoRicevi`, `renderRiceviProgetto`, `renderBottoniRicevi`, `confermaRicevi`

### `src/js/045_esportazione-pdf.js`
363 righe · in `dist/DPSH.html` dalla riga 30646

`popolaListaProveEsportazionePdf`, `impostaTemplateReportProva`, `popolaSelettoreTemplateBulkEsportazionePdf`, `elencoProveSelezionateEsportazionePdf`, `stimaPagineProva`, `stimaByteFotoOriginale`, `fattoreDimensioneJpeg`, `formattaBytesEsportazione`, `aggiornaStimaEsportazionePdf`, `apriEsportazionePdfModal`, `chiudiEsportazionePdfModal`

### `src/js/046_modal-personalizza-indice.js`
1467 righe · in `dist/DPSH.html` dalla riga 31009

`applicaZoomIndicePers`, `adattaZoomIndicePers`, `apriModalPersonalizzaIndice`, `chiudiModalPersonalizzaIndice`, `etichetteIndiceAnteprima`, `righeIndiceAnteprima`, `aggiornaAnteprimaIndicePersonalizza`, `renderModalPersonalizzaIndice`, `sincronizzaTemplateEditorConStatoSalvato`, `avviaGenerazioneEsportazionePdf`, `getBulkImportStartDepth`, `openBulkImportModal`, `closeBulkImportModal`, `parseBulkImportNumbers`, `updateBulkImportCount`, `openNewProjectModal`, `closeNewProjectModal`, `openNewSurveyModal`, `closeNewSurveyModal`, `cancelNewSurveyModal`, `confirmNewSurvey`, `exportProjectKML`, `exportSingleSurveyKML`, `exportProjectExcel`, `setupLongPress`, `openPhotoDB`, `savePhotoToIDB`, `salvaFotoConGaranzia`

### `src/js/047_spazio-occupato-e-foto-orfane.js`
163 righe · in `dist/DPSH.html` dalla riga 32476

`elencaContenutoIDB`, `idFotoAncoraInUso`, `idImmaginiNoteAncoraInUso`, `formattaByte`, `calcolaSpazioOccupato`, `eliminaFotoOrfane`, `svuotaDatabaseImmagini`

### `src/js/048_copie-automatiche.js`
363 righe · in `dist/DPSH.html` dalla riga 32639

`openCopieDB`, `firmaTesto`, `riassuntoStatoPerCopia`, `copieDaEliminare`, `aggiornaIdProtettiDalleCopie`, `caricaIndiceCopieAutomatiche`, `potaCopieAutomatiche`, `scriviCopiaAutomatica`, `copiaPrimaDi`, `leggiCopiaAutomatica`, `ripristinaProgettoDaCopia`, `formattaQuandoCopia`, `testoSicuro`, `apriCronologia`, `chiudiCronologia`, `renderCronologia`, `aggiornaRiepilogoCopieEBackup`, `registraBackupCompleto`

### `src/js/049_confronto-tra-prove.js`
400 righe · in `dist/DPSH.html` dalla riga 33002

`colonnaStratigrafica`, `serieConfrontoProva`, `massimoTondo`, `proveConfrontabili`, `apriConfrontoProve`, `chiudiConfrontoProve`, `renderConfrontoProve`, `aggiornaPannelloSpazio`, `avvisaFotoNonSalvate`, `getPhotoFromIDB`, `deletePhotoFromIDB`, `saveNoteImageToIDB`, `getNoteImageFromIDB`, `deleteNoteImageFromIDB`

### `src/js/050_note-di-progetto-pagina-unica-di-appunti-per-pro.js`
571 righe · in `dist/DPSH.html` dalla riga 33402

`creaEditorNote`, `aggiornaSegnapostoNota`, `htmlNotaCorrente`, `immagineSelezionataNota`, `aggiornaStatoBarraNote`, `comandoBloccoNota`, `getProjNotes`, `censisciVocabolarioNota`, `invariantiNota`, `confrontaInvariantiNota`, `ripuliscoHtmlIncollatoNota`, `convertiNotaAlNuovoSchema`, `diagnosticaMigrazioneNote`, `rehydrateNoteImagesInDom`, `rehydrateNoteImagesInHtmlString`

### `src/js/051_la-barretta-sulla-selezione.js`
55 righe · in `dist/DPSH.html` dalla riga 33973

`nascondiBollaSelezione`, `aggiornaBollaSelezione`

### `src/js/052_ricerca-nelle-note.js`
404 righe · in `dist/DPSH.html` dalla riga 34028

`pluginRicercaNote`, `ricalcolaRicercaNota`, `vaiAOccorrenzaNota`, `cercaNelleAltreNote`, `renderAltreNoteTrovate`, `apriRicercaNote`, `chiudiRicercaNote`, `aggiornaRicercaNote`, `preparaNotaPerIlMotore`, `renderRigaConversioneNota`, `apriNoteProgetto`, `salvaNoteProgettoCorrente`, `salvaNoteSeInSospeso`, `chiudiNoteProgetto`, `noteDelProgettoCorrente`, `inserisciImmagineDataUrlNellaNota`, `inserisciImmagineNellaNota`

### `src/js/053_il-menu-della-chiocciola.js`
528 righe · in `dist/DPSH.html` dalla riga 34432

`inserisciTabellaNellaNota`, `aggiornaBarraTabellaNota`, `aggiornaPulsanteAllineamento`, `applicaEvidenziatoreNota`

### `src/js/054_selettore-foto-del-progetto-riusato-per-inserire.js`
77 righe · in `dist/DPSH.html` dalla riga 34960

`raccogliFotoProgetto`, `chiudiSelettoreFotoProgetto`, `apriSelettoreFotoProgetto`

### `src/js/055_dimensione-rimozione-di-unimmagine-gia-nella-not.js`
177 righe · in `dist/DPSH.html` dalla riga 35037

`nascondiBarraImmagineNota`, `aggiornaBarraImmagineNota`, `leggiStileImmagineNota`, `componiStileImmagineNota`, `aggiornaAttributiImmagineNota`

### `src/js/056_la-schermata-di-composizione-dellinquadramento.js`
217 righe · in `dist/DPSH.html` dalla riga 35214

`impostazioniMappaDaBlocco`, `testoEtichettaComposizione`, `testoEtichettaInsetComposizione`, `disegnaComposizione`, `scambiaElementoComposizione`, `aggiornaNordComposizione`, `aggiornaScalaComposizione`

### `src/js/057_un-cronometro-dentro-lapp.js`
390 righe · in `dist/DPSH.html` dalla riga 35431

`oraPrecisa`, `misura`, `riportaMisura`, `rif`, `rifTutti`, `aggiornaBarraComposizione`, `apriComposizioneMappa`, `chiudiComposizioneMappa`

### `src/js/058_il-pannello-dello-stile-del-testo.js`
439 righe · in `dist/DPSH.html` dalla riga 35821

### `src/js/059_ritaglio-delle-immagini-uno-strumento-solo-per-t.js`
274 righe · in `dist/DPSH.html` dalla riga 36260

`proporzioneRitaglio`, `limitaRiquadroRitaglio`, `applicaProporzioneRitaglio`, `ridisegnaRitaglio`, `angoliRiquadroRitaglio`, `puntoRitaglio`, `apriRitaglioImmagine`, `chiudiRitaglio`, `ritagliaImmagineArchiviata`

### `src/js/060_strumento-di-disegno-un-piccolo-editor-di-forme.js`
859 righe · in `dist/DPSH.html` dalla riga 36534

`nuovoStatoDisegno`, `riquadroForma`, `angoliRiquadro`, `formaSelezionata`, `percorsoRettangolo`, `tracciaPercorsoForma`, `disegnaTesto`, `disegnaForma`, `ridisegnaCanvasNota`, `getNoteDrawPoint`, `formaSottoIlPunto`, `manigliaSottoIlPunto`, `selezionaForma`, `aggiornaBarraFormaDisegno`, `applicaColoreDisegno`, `aggiornaPastiglieColoreDisegno`, `renderNoteDrawColors`, `etichettaSfondoDisegno`, `impostaSfondoDisegno`, `evidenziaScelteSfondoDisegno`, `usaImmagineComeSfondoDisegno`, `finalizzaPoligonoCorrente`, `chiediTestoDisegno`, `aggiornaStrumentoDisegno`, `apriStrumentoDisegno`, `chiudiStrumentoDisegno`, `noteHtmlToPlainText`

### `src/js/061_la-mappa-provider-geometria-finestra-continua.js`
1692 righe · in `dist/DPSH.html` dalla riga 37393

`wmsDisponibili`, `ETICHETTE_MAPPA_URL`, `tessereXDaLng`, `tessereYDaLat`, `lngDaTessereX`, `latDaTessereY`, `calcolaTessereFinestra`, `puntoNellaFinestra`, `riquadroGeograficoFinestra`, `inquadraturaPerPunti`, `testoEtichettaAutomatica`, `inquadraturaSicura`, `convertiInquadramentoVecchio`, `htmlPinMappa`, `htmlBarraScalaMappa`, `posizioneElementoMappa`, `htmlNordMappa`, `htmlInsetRegionaleMappa`, `puntiProveDelProgetto`, `buildMappaInquadramentoHtml`, `noteHtmlToMarkdown`, `scaricaBlob`, `nomeFileNotaCorrente`, `parseExifGps`, `parseExifData`, `parseExifDateStr`, `handlePhotoFileSelected`, `renderPhotoGallery`, `openPhotoPreview`, `closePhotoPreview`, `backToPhotosModalFromPreview`, `deletePhoto`, `openEditModal`, `origineIntervallo`, `closeModal`, `openQuickFaldaModal`, `closeQuickFaldaModal`, `openStratiModal`, `closeStratiModal`

### `src/js/062_fase-2-riconoscimento-automatico-degli-strati.js`
199 righe · in `dist/DPSH.html` dalla riga 39085

`openStratiChoiceModal`, `closeStratiChoiceModal`, `updateAutoStratiPreview`, `openAutoStratiParamsModal`, `closeAutoStratiParamsModal`, `handleOpenAutoStrati`, `buildInquadramentoSatellitareHtml`

### `src/js/063_pagina-prova-replica-fedele-del-layout-di-riferi.js`
899 righe · in `dist/DPSH.html` dalla riga 39284

`arricchisciLogsConNsptRpd`, `tintaDatiProva`, `disposizioneSchede`, `buildDatiBoxHtml`, `buildColpiNsptTableHtml`, `scalaAssePulita`, `profonditaAsseAutomatica`, `spezzaEtichettaInRighe`, `disponiEtichetteSenzaSovrapposizioni`, `legendaGrafico`, `profonditaMassimaProgetto`, `profonditaAsseEffettiva`, `larghezzaBloccoGraficoPx`, `buildStratigrafiaColpiRpdSvg`

### `src/js/064_motore-di-rendering-dei-template-di-report.js`
192 righe · in `dist/DPSH.html` dalla riga 40183

`generatoreCasualeDaSeme`, `espandiAlternativeTesto`, `elencoItaliano`, `formattaCoordinateProve`, `valoriCantiere`

### `src/js/065_i-tag-il-registro.js`
342 righe · in `dist/DPSH.html` dalla riga 40375

`eRiferimentoFigura`, `bersaglioFigura`, `etichettaBersaglioFigura`, `tagFigureDisponibili`, `etichettaVuotaFigura`, `etichettaTag`, `tagPerTipo`, `progettoPerTag`, `aggiornaPastiglieTag`, `nomeProgettoPerAvviso`, `scriviDatoCantiere`, `valoriCantiereConCorrezioni`, `applicaSegnapostiTesto`, `generaTestoDaModello`, `contaDatiMancanti`

### `src/js/066_il-modello-predefinito-ricavato-da-due-relazioni.js`
1179 righe · in `dist/DPSH.html` dalla riga 40717

`bloccoHaFontRegolabile`, `limitiFontScaleBlocco`, `scalaMinimaBlocco`, `scambiaOrdineInRiga`, `dividiLarghezzaRigaEvenmente`, `trovaBloccoPerTipoInPagina`, `rilevaPatternLayoutPagina`, `applicaPatternLayoutEditor`, `renderSuggerimentiLayoutEditor`, `segmentiTesto`, `eBloccoSpezzabile`, `indiciForzatiBlocco`, `stileGrigliaTabellaBlocco`, `elencoCategorieBlocco`, `escapeHtmlDidascalia`, `avvolgiConDidascalia`, `avvolgiScopeFlowable`, `applicaInterruzioniPaginaManualiCategoria`, `buildBlockContentHtml`, `buildPaginaHeaderFooterHtml`, `buildContenutoVoceStampa`, `buildGruppoRowSpanHtmlStampa`, `buildRigheSottoinsiemeHtml`, `buildPaginaRigheHtml`, `getReportTemplateIdPerProva`

### `src/js/067_generatore-html-per-singola-prova.js`
160 righe · in `dist/DPSH.html` dalla riga 41896

`buildSurveyReportHtml`, `getIconSpriteHtml`

### `src/js/068_compressione-foto-per-lexport-pdf.js`
489 righe · in `dist/DPSH.html` dalla riga 42056

`comprimiImmagineDataUrl`, `risolviEComprimiFotoUrl`, `cssFontIncorporati`, `cssContenutoTesto`, `getReportPrintStyleBlock`, `getControlloImpaginazioneScriptTag`

### `src/js/069_lattesa-delle-mappe.js`
266 righe · in `dist/DPSH.html` dalla riga 42545

`buildIndiceReportCompletoHtml`, `buildSelezioneReportHtml`

### `src/js/070_impaginazione-reale-di-riepilogo-dettagliata-all.js`
217 righe · in `dist/DPSH.html` dalla riga 42811

`misuraFigliPerStampaMm`, `fondiTitoliConSuccessivo`, `impaginaBlocchiSuPagineFisiche`

### `src/js/071_motore-unificato-di-impaginazione.js`
767 righe · in `dist/DPSH.html` dalla riga 43028

`costruisciAtomiPaginaTemplate`, `costruisciPagineTemplateUnificato`, `provaSinteticaIntroduzione`, `raccogliVociIndice`, `numeraFigureERisolviRiferimenti`, `numeraPagineDocumento`, `buildCompleteReportHtml`, `exportProjectCompleteReportWord`, `downloadAllSurveyPhotosJpg`, `openSurveyPhotosModal`, `closeSurveyPhotosModal`, `handleGalleryBatchFiles`

### `src/js/071a_barre-del-pc.js`
71 righe · in `dist/DPSH.html` dalla riga 43795

`renderPc`, `apriDalLato`

### `src/js/071b_registro-sul-pc.js`
77 righe · in `dist/DPSH.html` dalla riga 43866

`segnaRigaScelta`, `scegliRiga`, `righeVisibili`, `staScrivendo`, `chiudiMenuRiga`, `apriMenuRiga`

### `src/js/071c_palette-e-scorciatoie.js`
123 righe · in `dist/DPSH.html` dalla riga 43943

`comandiPc`, `voceHtml`, `renderPalette`, `apriFinestraPc`, `apriPalette`, `eseguiVocePalette`, `apriScorciatoie`

### `src/js/071d_contatore-sul-pc.js`
21 righe · in `dist/DPSH.html` dalla riga 44066

`interruttoreContatorePc`

### `src/js/072_fase-3-modal-fallback-gps-foto.js`
932 righe · in `dist/DPSH.html` dalla riga 44087

`ensureLeafletLoaded`, `showPhotoGpsFallbackStep`, `openPhotoGpsFallbackModal`, `closePhotoGpsFallbackModal`, `applyGpsToFallbackPhoto`, `openPhotoGpsMapPicker`, `scriviDatoProgettoCorrente`, `aggiornaPannelloBetaT`, `openDrawer`, `closeDrawer`, `openCantiereInfoModal`, `closeCantiereInfoModal`, `chiudiMenuAzioni`, `impostaTastoRegistraVisibile`, `linearScrollBy`, `animateViewSwap`, `exportGlobalJSONBackup`, `importGlobalJSONBackup`, `importGlobalZipBackup`, `renderThemeHuePicker`, `exportCsvFallback`

### `src/shell/06_fine.html`
3 righe · in `dist/DPSH.html` dalla riga 45019
