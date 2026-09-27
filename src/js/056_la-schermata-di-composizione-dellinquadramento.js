            // =========================================================================
            // LA SCHERMATA DI COMPOSIZIONE DELL'INQUADRAMENTO
            //
            // La tavola al centro e' disegnata dalla STESSA funzione che produce la stampa
            // (buildMappaInquadramentoHtml): non e' un'anteprima somigliante, e' il risultato.
            // Ogni gesto riscrive le impostazioni e ridisegna — quindi non esiste il caso in cui
            // quello che vedi e quello che esce divergono, che e' il difetto che questa app ha
            // gia' pagato una volta con l'impaginazione.
            // =========================================================================
            const modalComposizioneMappaOverlay = document.getElementById('modalComposizioneMappaOverlay');
            const modalComposizioneMappa = document.getElementById('modalComposizioneMappa');
            const composizioneTela = document.getElementById('composizioneTela');
            let composizione = null;   // { blockId, imp, punti, scala }

            /** Legge dal blocco tutte le impostazioni della mappa in un oggetto solo, applicando
             * la conversione dal vecchio modello se serve. Da qui in poi si lavora su questo. */
            function impostazioniMappaDaBlocco(blk, punti) {
                const b = blk || {};
                const larghezzaMm = b.mappaLarghezzaMm || 140;
                const altezzaMm = b.mappaAltezzaMm || larghezzaMm;
                let mappa = b.mappa;
                if ((!mappa || !mappa.centro) && punti.length > 0) {
                    mappa = (b.mappaTutteLeProve === true)
                        ? inquadraturaPerPunti(punti, larghezzaMm * 4, altezzaMm * 4, 19)
                        : convertiInquadramentoVecchio(b, parseFloat(punti[0].lat), parseFloat(punti[0].lng));
                }
                // Stessa riverifica dell'export: aprendo su un altro cantiere un template
                // composto altrove, il compositore deve mostrare SUBITO l'inquadratura giusta.
                // Se qui e nella stampa valessero due regole diverse, l'anteprima mentirebbe —
                // ed e' il difetto che questa app ha gia' pagato una volta con l'impaginazione.
                const puntiPerRiquadro = (b.mappaTutteLeProve === true) ? punti : punti.slice(0, 1);
                if (puntiPerRiquadro.length > 0) mappa = inquadraturaSicura(mappa, puntiPerRiquadro, larghezzaMm * 4, altezzaMm * 4);
                const vecchiaScala = b.satelliteLabelsScale || 100;
                return {
                    centro: (mappa && mappa.centro) ? { lat: mappa.centro.lat, lng: mappa.centro.lng } : null,
                    zoom: (mappa && mappa.ricalcolata) ? mappa.zoom : (b.mappaZoom || (mappa && mappa.zoom) || b.satelliteZoom || 16),
                    provider: b.mappaProvider || (mappa && mappa.provider) || 'esri-satellite',
                    wmsUrl: b.mappaWmsUrl || '', wmsLayer: b.mappaWmsLayer || '', attribuzione: b.mappaAttribuzione || '',
                    larghezzaMm, altezzaMm,
                    mappaTutteLeProve: b.mappaTutteLeProve === true,
                    etichette: !(b.satelliteLabels === false),
                    ingrandimentoToponimi: (b.ingrandimentoToponimi !== undefined) ? b.ingrandimentoToponimi
                        : (vecchiaScala >= 175 ? 2 : (vecchiaScala >= 125 ? 1 : 0)),
                    opacitaToponimi: (b.satelliteLabelsOpacity !== undefined && b.satelliteLabelsOpacity !== null) ? b.satelliteLabelsOpacity : 100,
                    mappaEtichettePinAttive: b.mappaEtichettePinAttive !== false,
                    mappaEtichettePin: JSON.parse(JSON.stringify(b.mappaEtichettePin || {})),
                    // L'etichetta libera conserva i nomi vecchi (satelliteCustomLabel*) perche' e'
                    // lo stesso dato che l'export legge gia': cambiarli qui avrebbe fatto sparire
                    // l'etichetta da tutti i template esistenti.
                    etichettaModo: b.satelliteCustomLabelMode || 'none',
                    etichettaTesto: b.satelliteCustomLabelText || '',
                    etichettaMisura: b.satelliteCustomLabelFontSize || 12,
                    etichettaX: (b.satelliteCustomLabelPosX != null) ? b.satelliteCustomLabelPosX : 50,
                    etichettaY: (b.satelliteCustomLabelPosY != null) ? b.satelliteCustomLabelPosY : 20,
                    mappaMostraNord: b.mappaMostraNord === true,
                    mappaNord: Object.assign({ posizione: 'alto-destra' }, b.mappaNord || {}),
                    mappaMostraScala: b.mappaMostraScala !== false,
                    mappaScala: Object.assign({ posizione: 'basso-sinistra' }, b.mappaScala || {}),
                    misuraEtichettaPin: b.mappaMisuraEtichettaPin || 9,
                    // Il modo dell'etichetta regionale: se il blocco non ce l'ha ancora, si
                    // deduce dal vecchio interruttore etichettaComune. Nessun template gia'
                    // fatto cambia aspetto, ma da qui in poi l'etichetta e' automatica.
                    mappaInset: Object.assign(
                        { attivo: false, posizione: 'alto-destra', percLarghezza: 34,
                          etichettaModo: (b.mappaInset && b.mappaInset.etichettaComune === false) ? 'none' : 'comune',
                          trascina: 'riquadro' },
                        b.mappaInset || {})
                };
            }

            /** Il testo dell'etichetta libera, risolto dal modo scelto. «Località» e «Comune»
             * NON copiano il valore: lo leggono ogni volta dal cantiere, cosi' se domani il
             * comune viene corretto nell'anagrafica l'etichetta si corregge da sola. Solo
             * «testo mio» e' scritto a mano e resta com'e'. */
            function testoEtichettaComposizione() {
                if (!composizione) return '';
                const imp = composizione.imp;
                const d = composizione.datiCantiere || {};
                return testoEtichettaAutomatica(imp.etichettaModo, imp.etichettaTesto, d);
            }

            /** Stessa regola per l'etichetta del riquadro regionale. */
            function testoEtichettaInsetComposizione() {
                if (!composizione) return '';
                const i = composizione.imp.mappaInset || {};
                return testoEtichettaAutomatica(i.etichettaModo || 'comune', i.etichetta, composizione.datiCantiere || {});
            }

            function disegnaComposizione() {
                if (!composizione || !composizioneTela) return;
                const imp = composizione.imp;
                if (!imp.centro) {
                    composizioneTela.innerHTML = '<div style="padding:40px 20px; text-align:center; color:var(--text-muted); font-size:12px;">Nessuna prova con coordinate GPS in questo cantiere: non c&#39;e&#39; niente da inquadrare.</div>';
                    return;
                }
                const punti = imp.mappaTutteLeProve ? composizione.punti : composizione.punti.slice(0, 1);
                const html = buildMappaInquadramentoHtml({
                    centro: imp.centro, zoom: imp.zoom, provider: imp.provider,
                    wmsUrl: imp.wmsUrl, wmsLayer: imp.wmsLayer, attribuzione: imp.attribuzione,
                    larghezzaMm: imp.larghezzaMm, altezzaMm: imp.altezzaMm,
                    pin: punti.map(p => Object.assign({}, p, imp.mappaEtichettePin[p.numero] || {})),
                    etichetteAttive: imp.mappaEtichettePinAttive,
                    misuraEtichetta: imp.misuraEtichettaPin,
                    etichette: imp.etichette, ingrandimentoToponimi: imp.ingrandimentoToponimi,
                    opacitaToponimi: imp.opacitaToponimi,
                    etichettaLibera: testoEtichettaComposizione(),
                    etichettaLiberaMisura: imp.etichettaMisura,
                    etichettaLiberaX: imp.etichettaX,
                    etichettaLiberaY: imp.etichettaY,
                    mostraNord: imp.mappaMostraNord, nord: imp.mappaNord,
                    mostraScala: imp.mappaMostraScala, scala: imp.mappaScala,
                    inset: Object.assign({}, imp.mappaInset, { etichetta: testoEtichettaInsetComposizione() })
                });
                // La tavola e' in millimetri: qui si scala per stare nello schermo, e lo stesso
                // fattore serve per tradurre i pixel del dito in pixel della tavola.
                const disponibile = Math.max(220, (composizioneTela.clientWidth || 600) - 16);
                const larghezzaPxTavola = imp.larghezzaMm * 96 / 25.4;
                const k = Math.min(1, disponibile / larghezzaPxTavola);
                composizione.scala = k;
                misura('dom', () => {
                    composizioneTela.innerHTML = `<div id="composizioneTavola" style="transform:scale(${k}); transform-origin:center; ">${html}</div>`;
                    composizioneTela.style.height = Math.round(imp.altezzaMm * 96 / 25.4 * k + 16) + 'px';
                });
                misura('barra', aggiornaBarraComposizione);
                riportaMisura('ridisegno');
            }

            /** RIDISEGNARE SOLO IL DECORO, non tutta la tavola.
             *
             * Segnalato: "quando cambio i colori del nord e della scala il programma va in
             * freezing... e' davvero cosi' pesante cambiargli colore?". No, e il sospetto era
             * giusto. Il peso non era il colore: disegnaComposizione riscrive l'innerHTML
             * dell'intera tela, e cosi' facendo DISTRUGGE E RICREA tutte le immagini — una
             * sessantina di tessere fra mappa, toponimi e riquadro regionale — che il browser
             * deve richiedere e ridecodificare. Cambiare una freccia da bianca a nera non ha
             * niente a che vedere con le tessere, ma il ridisegno non lo sapeva.
             *
             * Qui il pezzo interessato viene rigenerato DA SOLO e scambiato al suo posto,
             * chiamando la stessa funzione che produce la stampa: niente tessere toccate,
             * nessun rischio che l'anteprima diverga dal PDF. Se l'elemento non c'e' (decoro
             * spento, o tavola non ancora disegnata) si ricade sul ridisegno intero, che resta
             * la strada sempre valida. */
            function scambiaElementoComposizione(selettore, nuovoHtml) {
                if (!composizione || !composizioneTela) return false;
                const vecchio = composizioneTela.querySelector(selettore);
                if (!vecchio || !nuovoHtml) return false;
                const contenitore = document.createElement('div');
                contenitore.innerHTML = nuovoHtml;
                const nuovo = contenitore.firstElementChild;
                if (!nuovo) return false;
                vecchio.replaceWith(nuovo);
                return true;
            }
            function aggiornaNordComposizione() {
                if (!composizione) return;
                const imp = composizione.imp;
                const html = misura('html', () => htmlNordMappa(imp.mappaNord));
                if (!imp.mappaMostraNord || !misura('scambio', () => scambiaElementoComposizione('[data-elemento-mappa="nord"]', html))) {
                    tappeMisura = [];
                    disegnaComposizione();
                    return;
                }
                // SOLO il gruppo che e' cambiato, non tutta la barra. aggiornaBarraComposizione
                // tocca una quarantina di comandi: per accendere due pulsanti e' sproporzionato,
                // e in un browser vero ogni cambio di classe costa un ricalcolo di stile.
                misura('pulsanti', () => {
                    rifTutti('[data-comp-nord-stile]').forEach(b => {
                        b.classList.toggle('is-active', (imp.mappaNord.stile || 'chiaro') === b.dataset.compNordStile);
                    });
                });
                riportaMisura('nord');
            }
            function aggiornaScalaComposizione() {
                if (!composizione) return;
                const imp = composizione.imp;
                // GLI STESSI NUMERI DELLA STAMPA, non numeri simili: buildMappaInquadramentoHtml
                // arrotonda i pixel e limita lo zoom al massimo del provider. Ripetere qui il
                // calcolo "quasi uguale" darebbe una barra di scala leggermente diversa fra
                // anteprima e PDF — cioe' esattamente il difetto che questa schermata esiste
                // per rendere impossibile.
                const PX_PER_MM = 4;
                const provider = PROVIDER_MAPPA[imp.provider] || PROVIDER_MAPPA['esri-satellite'];
                const zoomVero = Math.max(1, Math.min(provider.zoomMax || 19, Math.round(imp.zoom || 16)));
                const html = misura('html', () => (imp.mappaMostraScala && imp.centro)
                    ? htmlBarraScalaMappa(imp.centro, zoomVero, Math.round(imp.larghezzaMm * PX_PER_MM), imp.larghezzaMm, imp.mappaScala)
                    : '');
                if (!misura('scambio', () => scambiaElementoComposizione('[data-elemento-mappa="scala"]', html))) {
                    tappeMisura = [];
                    disegnaComposizione();
                    return;
                }
                misura('pulsanti', () => {
                    rifTutti('[data-comp-scala-sfondo]').forEach(b => {
                        b.classList.toggle('is-active', (imp.mappaScala.sfondo || 'chiaro') === b.dataset.compScalaSfondo);
                    });
                    // La lunghezza vera (250 m, 1 km...) si legge dalla barra appena rifatta.
                    const fine = composizioneTela.querySelector('[data-elemento-mappa="scala"] span:last-child');
                    const et = rif('lblComposizioneScalaLunghezza');
                    if (et && fine) et.textContent = fine.textContent;
                });
                riportaMisura('scala');
            }

            // LE REFERENZE DELLA BARRA SI RISOLVONO UNA VOLTA SOLA.
            //
            // Segnalato: "quando cambio i colori del nord e della scala il programma va in
            // freezing... e' davvero cosi' pesante cambiargli colore?". No, e il sospetto era
            // giusto: il colore non c'entrava. Questa funzione girava ad OGNI ridisegno e
            // faceva 25 getElementById piu' 11 querySelectorAll SULL'INTERO DOCUMENTO — che
            // qui e' un'app da 2,8 MB con l'editor del template aperto e le sue pagine dentro.
            // Misurato: un solo clic sul colore del nord costava 21 secondi; togliendo questa
            // chiamata scendeva a 0,1. Non era la mappa, era la ricerca degli elementi.
            //
            // La barra e' HTML statico, scritto una volta nella pagina e mai rigenerato: quindi
            // le sue referenze non possono diventare obsolete, e tenerle da parte e' lecito.
            // Se un giorno la barra venisse ricostruita da JavaScript, questa cache va svuotata
            // — e' l'unica condizione che la regge.
