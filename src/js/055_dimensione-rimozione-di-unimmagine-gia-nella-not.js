            // =========================================================================
            // DIMENSIONE / RIMOZIONE DI UN'IMMAGINE GIA' NELLA NOTA — tocca una foto, una forma
            // rapida o un disegno gia' inserito per selezionarlo e far comparire la barra dei
            // preset di dimensione, oppure per rimuoverlo.
            //
            // Due cose cambiano. La selezione non la teniamo piu' noi con una classe messa e
            // tolta a mano dentro un click-handler: la tiene ProseMirror (NodeSelection), che e'
            // anche quello che disegna il bordo. E la dimensione scelta non si scrive piu' su
            // img.style dal di fuori — verrebbe rimessa com'era al primo ridisegno del documento —
            // ma passa da updateAttributes, cioe' dalla stessa transazione di tutto il resto,
            // annulla compreso.
            // =========================================================================
            const noteImageSizeBar = document.getElementById('noteImageSizeBar');
            const btnNoteImageDelete = document.getElementById('btnNoteImageDelete');

            function nascondiBarraImmagineNota() {
                if (noteImageSizeBar) noteImageSizeBar.style.display = 'none';
                if (noteTableBar) noteTableBar.style.display = 'none';
            }

            function aggiornaBarraImmagineNota() {
                aggiornaBarraTabellaNota();
                if (!noteImageSizeBar) return;
                const nodo = immagineSelezionataNota();
                if (!nodo) { noteImageSizeBar.style.display = 'none'; return; }
                noteImageSizeBar.style.display = 'flex';
                // Le forme rapide (piccole, in linea col testo) si misurano in pixel assoluti;
                // le foto e i disegni, a piena larghezza, in percentuale del blocco.
                const inline = nodo.attrs['data-note-inline'] === '1';
                // Una forma rapida vive DENTRO la frase: affiancarle il testo non vuol dire
                // niente, quindi i comandi di disposizione spariscono invece di ingannare.
                const parti = leggiStileImmagineNota(nodo.attrs.style);
                const attuale = parti.flusso === 'left' ? 'sinistra' : (parti.flusso === 'right' ? 'destra' : 'blocco');
                noteImageSizeBar.querySelectorAll('[data-img-flusso]').forEach(b => {
                    b.style.display = inline ? 'none' : 'inline-flex';
                    b.classList.toggle('is-active', b.dataset.imgFlusso === attuale);
                });
                const lblFlusso = document.getElementById('lblFlussoImmagine');
                const sepFlusso = document.getElementById('sepFlussoImmagine');
                if (lblFlusso) lblFlusso.style.display = inline ? 'none' : 'inline';
                if (sepFlusso) sepFlusso.style.display = inline ? 'none' : 'block';
                noteImageSizeBar.querySelectorAll('[data-img-size-pct]').forEach(btn => {
                    const pct = btn.dataset.imgSizePct;
                    btn.textContent = inline
                        ? { '25': 'Piccola', '50': 'Media', '75': 'Grande', '100': 'Molto grande' }[pct]
                        : { '25': '25%', '50': '50%', '75': '75%', '100': 'Originale' }[pct];
                });
            }

            /* LO STILE DELL'IMMAGINE SI LEGGE E SI RICOMPONE, NON SI RISCRIVE DA ZERO.
               Larghezza e disposizione vivono nella stessa stringa `style`: chi la sovrascrive
               intera cancella la scelta dell'altro, e l'utente vede un comando che ne disfa un
               altro senza spiegazioni. Qui si legge cosa c'e', si cambia solo il pezzo toccato,
               e si rimette insieme. */
            function leggiStileImmagineNota(stile) {
                const d = document.createElement('div');
                d.setAttribute('style', stile || '');
                return { larghezza: d.style.width || '', altezza: d.style.height || '', flusso: d.style.cssFloat || d.style.float || '' };
            }
            function componiStileImmagineNota(parti) {
                const pezzi = [];
                if (parti.larghezza) pezzi.push('width: ' + parti.larghezza);
                pezzi.push('max-width: 100%');
                if (parti.altezza) pezzi.push('height: ' + parti.altezza);
                if (parti.flusso === 'left' || parti.flusso === 'right') {
                    pezzi.push('float: ' + parti.flusso);
                    // I margini stanno nello stile in linea, non nel CSS: cosi' l'aria attorno
                    // all'immagine sopravvive anche nella stampa e nel documento Word, dove il
                    // foglio di stile dell'app non c'e'.
                    pezzi.push(parti.flusso === 'left' ? 'margin: 4px 14px 8px 0' : 'margin: 4px 0 8px 14px');
                }
                return pezzi.join('; ') + ';';
            }

            /** Cambia gli attributi dell'immagine SCELTA e la lascia scelta.
             *
             * `updateAttributes` ricostruisce il nodo, e una selezione di nodo non sopravvive al
             * rimpiazzo: torna a essere un semplice cursore. Senza rimetterla, dopo il primo
             * comando l'immagine risultava deselezionata e la sua barra spariva — per passare
             * da "50%" a "testo a destra" bisognava ritoccare la foto ogni volta. Non e' un
             * dettaglio di stile: e' meta' dei comandi che sembrano non funzionare.
             *
             * Non si chiama .focus(): questi comandi agiscono sull'immagine, non sul punto in
             * cui si scrive. Rimettere il fuoco nell'editor farebbe anche comparire la tastiera
             * per ridimensionare una foto, che e' l'ultima cosa che serve su un telefono. */
            function aggiornaAttributiImmagineNota(attrs) {
                if (!editorNote) return;
                const sel = editorNote.state.selection;
                const posizione = (sel && sel.node) ? sel.from : null;
                editorNote.chain().updateAttributes('image', attrs).run();
                if (posizione !== null) editorNote.commands.setNodeSelection(posizione);
                salvaNoteProgettoCorrente(true);
            }

            /* PERCHE' QUI NON SI CHIAMA .focus().
               Questi comandi agiscono su un'IMMAGINE SCELTA, non sul punto in cui si scrive: la
               selezione di nodo che serve loro ce l'hanno gia'. Rimettere il fuoco nell'editor
               fa passare la selezione dal DOM e puo' riportarla a un semplice cursore — cioe'
               deselezionare l'immagine dopo il primo comando, costringendo a ritoccarla per
               ognuno. E su un telefono farebbe anche comparire la tastiera per ridimensionare
               una foto, che e' l'ultima cosa che serve. */
            if (noteImageSizeBar) {
                noteImageSizeBar.querySelectorAll('[data-img-size-pct]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const nodo = immagineSelezionataNota();
                        if (!nodo || !editorNote) return;
                        const pct = parseInt(btn.dataset.imgSizePct, 10);
                        let stile;
                        if (nodo.attrs['data-note-inline'] === '1') {
                            const px = { 25: 24, 50: 32, 75: 48, 100: 64 }[pct] || 32;
                            stile = `width: ${px}px; height: ${px}px;`;
                        } else {
                            const parti = leggiStileImmagineNota(nodo.attrs.style);
                            parti.larghezza = pct === 100 ? '' : pct + '%';
                            parti.altezza = pct === 100 ? '' : 'auto';
                            stile = componiStileImmagineNota(parti);
                        }
                        aggiornaAttributiImmagineNota({ style: stile });
                    });
                });
                noteImageSizeBar.querySelectorAll('[data-img-flusso]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const nodo = immagineSelezionataNota();
                        if (!nodo || !editorNote) return;
                        const parti = leggiStileImmagineNota(nodo.attrs.style);
                        const scelto = btn.dataset.imgFlusso;
                        parti.flusso = scelto === 'sinistra' ? 'left' : (scelto === 'destra' ? 'right' : '');
                        // Affiancare un'immagine a tutta larghezza non lascerebbe spazio a
                        // niente: se non e' gia' stata rimpicciolita, si porta a meta' pagina.
                        if (parti.flusso && (!parti.larghezza || parseFloat(parti.larghezza) >= 100)) {
                            parti.larghezza = '50%'; parti.altezza = 'auto';
                        }
                        aggiornaAttributiImmagineNota({ style: componiStileImmagineNota(parti) });
                    });
                });
            }
            const btnNoteImageRitaglia = document.getElementById('btnNoteImageRitaglia');
            if (btnNoteImageRitaglia) {
                btnNoteImageRitaglia.addEventListener('click', async () => {
                    const nodo = immagineSelezionataNota();
                    if (!nodo) return;
                    const idImg = nodo.attrs['data-note-img-id'];
                    if (!idImg) return;
                    await ritagliaImmagineArchiviata({
                        id: idImg,
                        titolo: 'Ritaglia l\'immagine della nota',
                        leggi: getNoteImageFromIDB,
                        scrivi: saveNoteImageToIDB,
                        cache: noteImageMemoryCache,
                        // Il nodo tiene il src come dato: aggiornarlo di la' e' l'unica cosa
                        // che fa vedere il ritaglio senza riaprire la nota.
                        onFatto: (nuova) => aggiornaAttributiImmagineNota({ src: nuova })
                    });
                });
            }

            if (btnNoteImageDelete) {
                btnNoteImageDelete.addEventListener('click', () => {
                    const nodo = immagineSelezionataNota();
                    if (!nodo || !editorNote) return;
                    const id = nodo.attrs['data-note-img-id'];
                    editorNote.chain().deleteSelection().run();
                    if (id) {
                        delete noteImageMemoryCache[id];
                        // Se una copia automatica usa ancora l'immagine resta nel database: la recupera
                        // «Foto orfane» quando la copia scade.
                        // Lo stesso se Annulla può ancora rimetterla (pezzo 004f).
                        if (!copieAutomatiche.idNote.has(id) && !idImmaginiNoteNellaCronologia().has(id)) {
                            try { deleteNoteImageFromIDB(id); } catch (e) { ignoraErrore('eliminaImmagineNota', e); }
                        }
                    }
                    salvaNoteProgettoCorrente(true);
                });
            }




