            // ======================== TRACCIABILITÀ DEGLI INTERVALLI (Fase 1) ========================
            // Ogni intervallo nuovo dice QUANDO è stato registrato e DA DOVE è arrivato; una modifica
            // successiva aggiunge quando è stato cambiato. Serve a rispondere, settimane dopo, alla
            // domanda «questo 14 l'ho contato in campo o l'ho scritto io in ufficio?».
            //   registratoIl: data e ora ISO (UTC) della registrazione
            //   origine: 'contatore' (+1 e CONFERMA) | 'inserimento-multiplo' (Aggiungi intervalli
            //            multipli) | 'modifica-manuale' (un intervallo scritto a mano nella scheda) |
            //            'import' (riservato agli intervalli che arriveranno da un file esterno)
            //   modificatoIl: data e ora dell'ultima modifica di profondità, colpi o nota
            // Gli intervalli registrati prima della Fase 1 restano senza questi campi: nessuna
            // migrazione inventa una data. I campi stanno nei dati e nei JSON esportati, NON nei
            // report: nessuna pagina di stampa li legge.

            const ORIGINI_INTERVALLO = ['contatore', 'inserimento-multiplo', 'modifica-manuale', 'import'];

            /** Un intervallo nuovo, con la sua registrazione. `campi` sono start/end/colpi/asta/note... */
            function nuovoIntervallo(campi, origine) {
                return Object.assign({}, campi, {
                    registratoIl: new Date().toISOString(),
                    origine: ORIGINI_INTERVALLO.includes(origine) ? origine : 'modifica-manuale'
                });
            }

            /** I campi di misura di un intervallo, per capire se una modifica ha cambiato davvero
             * qualcosa (riaprire la scheda e premere Salva senza toccare niente non è una modifica). */
            function misuraDiIntervallo(log) {
                // Profondità al millimetro: la scheda le mostra a due decimali e le riscrive così,
                // e 0,6000000000000001 → 0,6 non è una modifica di nessuno.
                const mm = (v) => (typeof v === 'number' && isFinite(v)) ? Math.round(v * 1000) : v;
                return JSON.stringify([mm(log.start), mm(log.end), log.colpi, log.note || '', log.lithology || '']);
            }

            /** Segna la modifica, se c'è stata. `prima` è misuraDiIntervallo() presa prima di cambiarlo. */
            function segnaIntervalloModificato(log, prima) {
                if (!log) return;
                if (prima !== undefined && prima === misuraDiIntervallo(log)) return;
                log.modificatoIl = new Date().toISOString();
            }
