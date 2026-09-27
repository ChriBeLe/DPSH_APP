            // ===================== LO STILE DEL TESTO, IN UN POSTO SOLO =====================
            // Richiesto: "tutto quanto uniformabile da un singolo blocco del testo cosi' da non
            // far impazzire l'utente per ricontrollare ogni volta paranoicamente".
            //
            // Quindi due livelli, tenuti separati apposta:
            //   · QUESTO e' il livello DOCUMENTO. Vale per tutti i blocchi di testo e titolo del
            //     template. E' il posto normale: chi non vuole pensarci scrive e basta.
            //   · I comandi della barra dell'editor restano, ma diventano ECCEZIONI dichiarate
            //     su un singolo pezzo di testo — non l'impostazione di tutti i giorni.
            //
            // Prima queste misure erano scritte a mano dentro il codice dei blocchi
            // (font-family:Arial, line-height:1.5, e la dimensione salvata blocco per blocco):
            // per cambiare carattere a una relazione bisognava aprire ogni blocco.
            const FONT_DOCUMENTO = [
                // Il nome e' quello VERO del font Microsoft, non quello del gemello: cosi' su
                // Windows il src:local() prende l'originale, e l'export in Word scrive un nome
                // che Word conosce. Il gemello incorporato copre solo dove l'originale manca.
                { id: 'Calibri', nome: 'Calibri', nota: 'lo standard di Word, senza grazie', pila: "'Calibri', 'Carlito', system-ui, sans-serif" },
                { id: 'Arial', nome: 'Arial', nota: 'neutro, senza grazie', pila: "'Arial', 'Arimo', Helvetica, system-ui, sans-serif" },
                { id: 'Cambria', nome: 'Cambria', nota: 'con grazie, disegnato per la stampa', pila: "'Cambria', 'Caladea', Georgia, serif" },
                { id: 'Times New Roman', nome: 'Times New Roman', nota: 'con grazie, il classico', pila: "'Times New Roman', 'Tinos', Times, serif" }
            ];
            const FONT_FORMULE = "'Cambria Math', 'STIX Two Math', 'Cambria', serif";

            /** L'istantanea con cui si capisce se ci sono modifiche non salvate.
             * Era scritta a mano in QUATTRO punti, identica: aggiungere un campo (come lo stile
             * del testo) voleva dire ricordarsi di aggiungerlo quattro volte, e dimenticarne uno
             * significava "nessuna modifica da salvare" su una modifica vera — cioe' lavoro
             * perso in silenzio. Adesso il campo si aggiunge qui e vale ovunque. */
            function istantaneaTemplate() {
                return JSON.stringify({
                    pages: templateEditorState.pages,
                    margins: templateEditorState.margins,
                    stileTesto: templateEditorState.stileTesto,
                    footerShowPageNumber: templateEditorState.footerShowPageNumber,
                    headerEnabled: templateEditorState.headerEnabled,
                    footerEnabled: templateEditorState.footerEnabled
                });
            }

