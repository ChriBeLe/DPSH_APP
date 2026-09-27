            // ===================== LE ECCEZIONI DI STILE, DICHIARATE =====================
            // Richiesto: "non far impazzire l'utente per ricontrollare ogni volta paranoicamente".
            // Il modo per non ricontrollare non e' togliere i comandi: e' che sia il programma a
            // dire dove ci si e' scostati dallo stile del documento. Se il pallino non c'e', il
            // blocco segue il documento — e questo si puo' credere, perche' e' misurato.
            const ECCEZIONI_DI_STILE = [
                { chiave: 'corpo', prova: b => !!b.fontSizePt, nome: 'corpo del testo scelto a mano' },
                { chiave: 'font', prova: b => /font-family\s*:/i.test(b.richHtml || ''), nome: 'carattere diverso in un punto' },
                { chiave: 'misura', prova: b => /font-size\s*:/i.test(b.richHtml || ''), nome: 'misura diversa in un punto' },
                { chiave: 'allineamento', prova: b => /text-align\s*:/i.test(b.richHtml || ''), nome: 'allineamento diverso in un punto' },
                { chiave: 'interlinea', prova: b => /line-height\s*:/i.test(b.richHtml || ''), nome: 'interlinea diversa in un punto' },
                { chiave: 'colore', prova: b => /(^|[^-])color\s*:/i.test(b.richHtml || ''), nome: 'colore del testo cambiato' }
            ];
            function eccezioniDiStile(blockObj) {
                if (!blockObj || (blockObj.type !== 'testo' && blockObj.type !== 'titolo')) return [];
                return ECCEZIONI_DI_STILE.filter(e => { try { return e.prova(blockObj); } catch (err) { return false; } });
            }
            /** Cancella le eccezioni e riporta il blocco allo stile del documento. Il testo non si
             * tocca: si tolgono solo le dichiarazioni di stile scritte dentro, che sono quelle che
             * fanno divergere il blocco dal resto. */
            function riportaAlloStileDelDocumento(blockObj) {
                if (!blockObj) return;
                delete blockObj.fontSizePt;
                if (typeof blockObj.richHtml === 'string' && blockObj.richHtml) {
                    const doc = new DOMParser().parseFromString('<div id="r">' + blockObj.richHtml + '</div>', 'text/html');
                    doc.getElementById('r').querySelectorAll('[style]').forEach(el => {
                        const tenuti = [];
                        (el.getAttribute('style') || '').split(';').forEach(pezzo => {
                            const nome = (pezzo.split(':')[0] || '').trim().toLowerCase();
                            // Si tolgono SOLO le proprieta' che competono allo stile del documento.
                            // Larghezza di un'immagine, scorrimento del testo, margini: restano,
                            // perche' non sono scelte tipografiche ma di impaginazione del pezzo.
                            if (!['font-family', 'font-size', 'text-align', 'line-height', 'color'].includes(nome) && pezzo.trim()) {
                                tenuti.push(pezzo.trim());
                            }
                        });
                        if (tenuti.length) el.setAttribute('style', tenuti.join('; ') + ';');
                        else el.removeAttribute('style');
                    });
                    blockObj.richHtml = doc.getElementById('r').innerHTML;
                }
            }

