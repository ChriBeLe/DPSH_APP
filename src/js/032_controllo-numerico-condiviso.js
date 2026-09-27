            // ===================== CONTROLLO NUMERICO CONDIVISO (slider + campo) =====================
            // (Piano_Controlli_Font, passo 2 — assorbe anche la voce di bacheca "campo numerico
            // accanto a ogni slider")
            //
            // Il problema che risolve: uno slider su un telefono non ti fa centrare un valore
            // preciso, e due tasti +/- non ti dicono dove sei. Servono entrambi, con ruoli distinti:
            // lo SLIDER per esplorare (vedi il risultato mentre trascini), il CAMPO per essere
            // esatto (scrivi 90 e sei a 90).
            //
            // Regola fondamentale: slider e campo lavorano nella STESSA unità, quella che legge
            // l'utente (mm, pt...). La conversione verso il dato salvato avviene una volta sola, al
            // momento di scrivere nel modello. Farli lavorare in unità diverse — slider in
            // percentuale e campo in millimetri — vorrebbe dire due conversioni in punti diversi
            // del codice che devono restare d'accordo, cioè il modo classico per farle divergere.
            /** Spiegazione lunga dietro una ℹ️ invece che in mezzo ai comandi.
             *
             * I paragrafi esplicativi occupavano più spazio dei comandi che spiegavano, e li si
             * legge una volta sola nella vita. Il testo non sparisce: si apre nella finestra di
             * dialogo dell'app, dove c'è spazio per leggerlo davvero. */
            function htmlSpiegazione(testo) {
                return `<button type="button" class="tpl-editor-spiegazione" data-action="spiegazione"
                    data-testo="${escapeHtmlDidascalia(testo)}" title="Cosa vuol dire" aria-label="Spiegazione">ℹ️ Cosa vuol dire</button>`;
            }

            /** Interruttore del menu del blocco.
             *
             * Sostituisce le spunte (vedi Design_Ordine_Controlli.md). Una spunta chiede "vuoi
             * questa proprietà?" e lascia indovinare cosa succede spuntandola; un interruttore
             * dichiara in che STATO sei adesso. "Larghezza fissa ☐" non è una frase — "Larghezza ·
             * libera" sì.
             *
             * Non inventa un componente nuovo: riusa .switch, quello già usato dalle Impostazioni.
             * Un solo interruttore in tutta l'app, e la modalità guanti (che lo ingrandisce già)
             * lo raggiunge senza aggiungere una riga.
             *
             * @param {string} cfg.azione       data-action, come prima
             * @param {string} cfg.etichetta    il concetto, invariato fra i due stati ("Larghezza")
             * @param {boolean} cfg.attivo
             * @param {string} cfg.statoOn      la parola dello stato acceso ("fissa")
             * @param {string} cfg.statoOff     la parola dello stato spento ("libera")
             */
            function htmlInterruttore(cfg) {
                const stato = cfg.attivo ? cfg.statoOn : cfg.statoOff;
                return `
                <label class="tpl-editor-interruttore" title="${cfg.titolo || ''}">
                    ${cfg.icona ? `<svg class="ico" style="width:13px; height:13px; flex-shrink:0;"><use href="#i-${cfg.icona}"/></svg>` : ''}
                    <span class="tpl-editor-interruttore-testo">
                        <span class="tpl-editor-interruttore-nome">${cfg.etichetta}</span>
                        <span class="tpl-editor-interruttore-stato">${stato}</span>
                    </span>
                    <span class="switch">
                        <input type="checkbox" data-action="${cfg.azione}" ${cfg.attivo ? 'checked' : ''}>
                        <span class="switch-visual"></span>
                    </span>
                </label>`;
            }

            /** @param {object} cfg vedi collegaControlloNumerico per il gemello che aggancia gli eventi */
            function htmlControlloNumerico(cfg) {
                const decimali = cfg.decimali || 0;
                const arrotonda = (v) => Number(v).toFixed(decimali);
                const passo = cfg.passo || (decimali > 0 ? 0.1 : 1);
                return `
                <div class="tpl-ctrl-num">
                    <div class="tpl-ctrl-num-testata">
                        <span class="tpl-ctrl-num-etichetta">${cfg.etichetta}</span>
                        <span class="tpl-ctrl-num-secondario" data-role="${cfg.azione}-secondario">${cfg.secondarioHtml || ''}</span>
                        <span class="tpl-ctrl-num-campo">
                            <input type="number" class="tpl-ctrl-num-input" data-role="${cfg.azione}-campo"
                                   inputmode="${decimali > 0 ? 'decimal' : 'numeric'}"
                                   value="${arrotonda(cfg.valore)}" min="${arrotonda(cfg.min)}" max="${arrotonda(cfg.max)}" step="${passo}"
                                   aria-label="${cfg.etichetta} in ${cfg.unita || 'unità'}">
                            ${cfg.unita ? `<span class="tpl-ctrl-num-unita">${cfg.unita}</span>` : ''}
                        </span>
                    </div>
                    <input type="range" data-action="${cfg.azione}" min="${cfg.min}" max="${cfg.max}" step="${passo}"
                           value="${cfg.valore}" title="${cfg.titolo || ''}" style="width:100%; accent-color:var(--accent);">
                    ${(cfg.notaMin || cfg.notaMax) ? `<div class="tpl-ctrl-num-scala"><span>${cfg.notaMin || ''}</span><span>${cfg.notaMax || ''}</span></div>` : ''}
                </div>`;
            }
