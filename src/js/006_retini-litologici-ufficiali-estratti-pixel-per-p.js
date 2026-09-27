            // =========================================================================
            // RETINI LITOLOGICI UFFICIALI — estratti pixel per pixel dal file di riferimento
            // Nardò_DPSH1.ods (foglio RETINI / stili draw:fill-image), non generati via CSS
            // come i pattern generici sopra: sono le stesse 30 texture 8×8 con colore e
            // trama già abbinati che il foglio di calcolo usa per la legenda litologica,
            // così scegliendo un retino qui si ottiene la stessa identica resa del riferimento.
            // =========================================================================
            // NOTA: ogni retino qui sotto è una maschera 8×8 con canale alfa — i pixel del
            // tratteggio sono opachi (neri), i pixel di sfondo sono trasparenti. Il colore
            // "colore" viene applicato come background-color separato (vedi getPatternCss),
            // così il retino resta lo stesso ma l'utente può cambiarne liberamente il colore.
            const RETINI_LITOLOGICI = [
                { id: 'arenarie', label: 'arenarie', colore: '#FF6D6D', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVR42mNkYGD4z0AA4FXARIwGvCYwEuMGvCYyUWwCAFSMB/9i5AWlAAAAAElFTkSuQmCC' },
                { id: 'arenarie_marnose', label: 'arenarie marnose', colore: '#BF819E', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVR42mNkYGD4z0AJYITS/wnI4zeBIjf8Z0IXINkEALnqBgHkcs58AAAAAElFTkSuQmCC' },
                { id: 'argille', label: 'argille', colore: '#9E8A7A', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHUlEQVR42mNkYGD4z4AdMDLQBzAiuQFm538G+gIA9hMDAgzc5ZIAAAAASUVORK5CYII=' },
                { id: 'argille_ghiaiose', label: 'argille ghiaiose', colore: '#A19F77', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIUlEQVR42mNkYGD4z4AJGKE0Njkqgf/4jP+Pg028CaQBAGbUB/snENm3AAAAAElFTkSuQmCC' },
                { id: 'argille_limose', label: 'argille limose', colore: '#AB8869', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIklEQVR42mNkYGD4z4AKGKE0ujiVwH98Rv/Houg/WSaRBgBd7wn5ylCJIAAAAABJRU5ErkJggg==' },
                { id: 'argille_sabbiose', label: 'argille sabbiose', colore: '#B6A17C', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVR42mNkYGD4z4AdMDLQB+Cz5z+d3AAAbiMCAil4lO8AAAAASUVORK5CYII=' },
                { id: 'argilliti', label: 'argilliti', colore: '#729FCF', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mNkYGD4z0BTwEixFYy0dyQABTIDAZZafBQAAAAASUVORK5CYII=' },
                { id: 'argilliti_arenacee', label: 'argilliti arenacee', colore: '#B7B3CA', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVR42mNkYGD4z0AJYBx4E/4zoQuQbAIAvUAGAI3DxmsAAAAASUVORK5CYII=' },
                { id: 'calcari_marnosi', label: 'calcari marnosi', colore: '#DEE6EF', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJElEQVR42mNkYGD4z0AB+M9ESAVBBYykugFDMQuSICM+hTglABq+BwXa1nDLAAAAAElFTkSuQmCC' },
                { id: 'calcestruzzo', label: 'calcestruzzo', colore: '#DDDDDD', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAG0lEQVR42mNgYGD4D8V0BHit/I/OZqK6FRgAAFO0B/voeJulAAAAAElFTkSuQmCC' },
                { id: 'cemento', label: 'cemento', colore: '#B2B2B2', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mNkYGD4zzCwgBGPGxjp5AYAhYcCAviDlbUAAAAASUVORK5CYII=' },
                { id: 'detrito_di_versante', label: 'detrito di versante', colore: '#E0C2CD', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJklEQVR42mNgQID/UIwBkCUwFDBBaUYGAgCn8WRpwOoedB3EWwkA6M4O9e/ZAjUAAAAASUVORK5CYII=' },
                { id: 'ghiaie', label: 'ghiaie', colore: '#AADD6D', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAALElEQVR42mNkgID/DAjAyIAG/uPjMzEQAIzEWIEN/MdiNVY3/GdiIBPArQAAyL8J/xn6QQcAAAAASUVORK5CYII=' },
                { id: 'ghiaie_argillose', label: 'ghiaie argillose', colore: '#A7C870', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAH0lEQVR42mNgIAAYGRgY/mMRowP4j8VqFEk4m4liKwBYDQb+yERACQAAAABJRU5ErkJggg==' },
                { id: 'ghiaie_limose', label: 'ghiaie limose', colore: '#B4C65F', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIklEQVR42mNgYGD4D8V4AbKi/2jiWBVRDvCahuIGJoqtAAA1yA31K3tFaQAAAABJRU5ErkJggg==' },
                { id: 'ghiaie_sabbiose', label: 'ghiaie sabbiose', colore: '#BFDF72', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGUlEQVR42mNgIBL8h2I6ArxWIkv8Z6LYCgAsiwf70aWYzgAAAABJRU5ErkJggg==' },
                { id: 'limi', label: 'limi', colore: '#D18236', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAI0lEQVR42mNggID/UMyAxGdgYGBgYIJyGNElGLCpxmLS0AAAzT8H/BM+MVkAAAAASUVORK5CYII=' },
                { id: 'limi_argillosi', label: 'limi argillosi', colore: '#C48447', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAALElEQVR42mNggID/UMyAxGdgYGBgYIJyGNElGLCpxmISFQAjmhsY8LmFPAAAd2IJ/FLFmjsAAAAASUVORK5CYII=' },
                { id: 'limi_ghiaiosi', label: 'limi ghiaiosi', colore: '#C79944', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAMElEQVR42mNggID/UMyAxGdgYGBgYIJyGNElGLCpxmISYcCIR+4/Ax57/5NkAl4AAATrC/rl4lLlAAAAAElFTkSuQmCC' },
                { id: 'limi_sabbiosi', label: 'limi sabbiosi', colore: '#DD9B49', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAKUlEQVR42mNggID/UMyAxGdgYGBgYIJyGNElGLCpxmISFQAjHjkqWQUAFGoI/NMS4EcAAAAASUVORK5CYII=' },
                { id: 'manto_stradale', label: 'manto stradale', colore: '#999999', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAH0lEQVR42mNkYGD4z4AHMDHQCvzHZzWyxH8mmliBAgA/kwb/KXDtmwAAAABJRU5ErkJggg==' },
                { id: 'marne', label: 'marne', colore: '#B4C7DC', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAF0lEQVR42mNkYGD4zzCwgBGPGxjp5AYAhYcCAviDlbUAAAAASUVORK5CYII=' },
                { id: 'marne_calcaree', label: 'marne calcaree', colore: '#DEE7E5', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAIklEQVR42mNkYGD4z0AB+M9ESAVBBYyUuoGBEeYYPHL4AQCIawQF2gbL9gAAAABJRU5ErkJggg==' },
                { id: 'sabbie', label: 'sabbie', colore: '#FFE680', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAE0lEQVR42mNgYGD4D8WDCdDbTQDeRgP9ARG5CQAAAABJRU5ErkJggg==' },
                { id: 'sabbie_argillose', label: 'sabbie argillose', colore: '#E7CF7F', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGUlEQVR42mNgYGD4D8UDBRjR+P8JyNMCAAB3lgMA5eUl6wAAAABJRU5ErkJggg==' },
                { id: 'sabbie_ghiaiose', label: 'sabbie ghiaiose', colore: '#EAE47B', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAGklEQVR42mNgYGD4D8V0BHit/I+DTbwJpAMAlKwH+a971MAAAAAASUVORK5CYII=' },
                { id: 'sabbie_limose', label: 'sabbie limose', colore: '#F4CD6E', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAHElEQVR42mNgYGD4D8V0Anit+49F0X+yTCINAABv3wn30uZuqgAAAABJRU5ErkJggg==' },
                { id: 'torbe', label: 'torbe', colore: '#ECD4A5', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAJUlEQVR42mNgQAX/0dlMaIIYgAmH+H8GBgZGmAJGfKYwMQw8AAAWKQUGBi9j7QAAAABJRU5ErkJggg==' },
                { id: 'travertini', label: 'travertini', colore: '#D9F5FF', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFElEQVR42mNkYGD4zzDw4P8AuwMAAC4C/zQlBU4AAAAASUVORK5CYII=' },
                { id: 'tufi_vulcanici', label: 'tufi vulcanici', colore: '#EC9BA4', png: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAH0lEQVR42mNkYGD4z4AbMMIY6IqwavqPT5KBGMmBAgCxgQX9/9dlnQAAAABJRU5ErkJggg==' },
            ];
            const RETINI_PER_ID = Object.fromEntries(RETINI_LITOLOGICI.map(r => [r.id, r]));
            const PREFISSO_RETINO = 'retino:';

            function getPatternCss(patternName, baseColor) {
                if (typeof patternName === 'string' && patternName.startsWith(PREFISSO_RETINO)) {
                    const r = RETINI_PER_ID[patternName.slice(PREFISSO_RETINO.length)];
                    // Il retino è una maschera trasparente: il colore di sfondo è quello scelto
                    // dall'utente (baseColor), non più fisso — così il retino resta "tingibile".
                    if (r) return `background-color: ${baseColor || r.colore}; background-image: url('${r.png}'); background-repeat: repeat; background-size: 8px 8px; image-rendering: pixelated;`;
                }
                const p = PATTERN_LIBRARY.find(x => x.id === patternName) || PATTERN_LIBRARY[0];
                return p.css(baseColor);
            }

            // Genera un <pattern> SVG nativo (per il grafico a barre nella vista separata),
            // equivalente visivo dei pattern CSS usati nella tabella/legenda.
            function getSvgPatternDef(patternName, patternDomId, baseColor) {
                if (typeof patternName === 'string' && patternName.startsWith(PREFISSO_RETINO)) {
                    const r = RETINI_PER_ID[patternName.slice(PREFISSO_RETINO.length)];
                    // RETINI NITIDI IN STAMPA (bug segnalato: "nell'export i retini dei pattern
                    // vengono tutti sfocati e sbiaditi"). I retini NON sono vettoriali: sono PNG 8×8
                    // con canale alfa, estratti dal foglio di riferimento. Il percorso CSS
                    // (getPatternCss, qui sopra) li protegge già con image-rendering:pixelated; questo
                    // percorso SVG non lo faceva. In stampa il PDF ricampiona il tassello a DPI più
                    // alto e, senza quell'istruzione, l'interpolazione bilineare spalma una linea da
                    // UN pixel su tre pixel di grigio: da qui "sfocati e sbiaditi". Ed è anche il
                    // motivo per cui gli stessi retini si vedono benissimo nelle tabelle e no nel
                    // grafico — stesso PNG, due percorsi, uno solo protetto.
                    // `crisp-edges` è il ripiego per i motori che non conoscono `pixelated`;
                    // preserveAspectRatio="none" impedisce che il tassello venga riquadrato con un
                    // margine invece che riempire esattamente 8×8.
                    if (r) return `<pattern id="${patternDomId}" width="8" height="8" patternUnits="userSpaceOnUse"><rect width="8" height="8" fill="${baseColor || r.colore}"/><image href="${r.png}" x="0" y="0" width="8" height="8" preserveAspectRatio="none" image-rendering="pixelated" style="image-rendering:pixelated; image-rendering:crisp-edges;"/></pattern>`;
                }
                const p = PATTERN_LIBRARY.find(x => x.id === patternName) || PATTERN_LIBRARY[0];
                const tw = p.tw || 8, th = p.th || 8;
                const inner = p.svg ? p.svg(baseColor) : `<rect width="${tw}" height="${th}" fill="${baseColor}"/>`;
                return `<pattern id="${patternDomId}" width="${tw}" height="${th}" patternUnits="userSpaceOnUse">${inner}</pattern>`;
            }

            function buildPatternOptionsHtml(selectedPattern) {
                const generici = PATTERN_LIBRARY.map(p => `<option value="${p.id}" ${selectedPattern === p.id ? 'selected' : ''}>${p.icon} ${p.name}</option>`).join('');
                const retini = RETINI_LITOLOGICI.map(r => {
                    const value = PREFISSO_RETINO + r.id;
                    return `<option value="${value}" ${selectedPattern === value ? 'selected' : ''}>${r.label}</option>`;
                }).join('');
                return `<optgroup label="Pattern generici">${generici}</optgroup><optgroup label="Retini litologici">${retini}</optgroup>`;
            }

            // Selettore visuale del pattern (sostituisce il <select> testuale nella Gestione
            // Strati): mostra l'anteprima grafica reale — colore + trama — di ogni opzione
            // mentre la si sceglie, invece di un semplice nome in un menu a tendina.
            let patpickOpenIdx = null;
            let patpickDocClickBound = false;

            function buildPatternPickerHtml(idx, patternValue, colorForPreview) {
                const isOpen = patpickOpenIdx === idx;
                const isRetino = typeof patternValue === 'string' && patternValue.startsWith(PREFISSO_RETINO);
                const currentLabel = isRetino
                    ? (RETINI_PER_ID[patternValue.slice(PREFISSO_RETINO.length)]?.label || patternValue)
                    : ((PATTERN_LIBRARY.find(p => p.id === patternValue) || PATTERN_LIBRARY[0]).name);

                const rigaGenerici = PATTERN_LIBRARY.map(p => `
                    <button type="button" class="patpick-option" data-strato-idx="${idx}" data-value="${p.id}">
                        <span class="patpick-swatch" style="${p.css(colorForPreview)}"></span>
                        <span class="patpick-option-label">${p.name}</span>
                    </button>`).join('');
                const rigaRetini = RETINI_LITOLOGICI.map(r => {
                    const value = PREFISSO_RETINO + r.id;
                    return `
                    <button type="button" class="patpick-option" data-strato-idx="${idx}" data-value="${value}">
                        <span class="patpick-swatch" style="${getPatternCss(value, r.colore)}"></span>
                        <span class="patpick-option-label">${r.label}</span>
                    </button>`;
                }).join('');

                return `
                    <div class="patpick-wrap" data-strato-idx="${idx}">
                        <button type="button" class="patpick-trigger form-control" data-strato-idx="${idx}">
                            <span class="patpick-swatch" style="${getPatternCss(patternValue, colorForPreview)}"></span>
                            <span class="patpick-trigger-label">${currentLabel}</span>
                            <span class="patpick-chevron">▾</span>
                        </button>
                        ${isOpen ? `
                            <div class="patpick-panel">
                                <div class="patpick-section-label">Pattern generici</div>
                                ${rigaGenerici}
                                <div class="patpick-section-label">Retini litologici</div>
                                ${rigaRetini}
                            </div>
                        ` : ''}
                    </div>`;
            }

            // Stessa selezione visuale del pattern (anteprima vera, niente testo/simboli), ma per
            // le voci dell'Archivio Litologico Globale: usava ancora un <select> nativo, che non
            // può mostrare uno swatch dentro le opzioni — da qui il glitch segnalato ("perché non
            // vedo più il colore, solo un simbolo strano?"). Stato di apertura e dati separati da
            // quelli della Gestione Strati di progetto (chiave per arch.id, non per indice) così i
            // due picker non si calpestano a vicenda.
            let archPatpickOpenId = null;
            let archPatpickDocClickBound = false;

            function buildArchPatternPickerHtml(archId, patternValue, colorForPreview) {
                const isOpen = archPatpickOpenId === archId;
                const isRetino = typeof patternValue === 'string' && patternValue.startsWith(PREFISSO_RETINO);
                const currentLabel = isRetino
                    ? (RETINI_PER_ID[patternValue.slice(PREFISSO_RETINO.length)]?.label || patternValue)
                    : ((PATTERN_LIBRARY.find(p => p.id === patternValue) || PATTERN_LIBRARY[0]).name);

                const rigaGenerici = PATTERN_LIBRARY.map(p => `
                    <button type="button" class="patpick-option" data-arch-id="${archId}" data-value="${p.id}">
                        <span class="patpick-swatch" style="${p.css(colorForPreview)}"></span>
                        <span class="patpick-option-label">${p.name}</span>
                    </button>`).join('');
                const rigaRetini = RETINI_LITOLOGICI.map(r => {
                    const value = PREFISSO_RETINO + r.id;
                    return `
                    <button type="button" class="patpick-option" data-arch-id="${archId}" data-value="${value}">
                        <span class="patpick-swatch" style="${getPatternCss(value, r.colore)}"></span>
                        <span class="patpick-option-label">${r.label}</span>
                    </button>`;
                }).join('');

                return `
                    <div class="patpick-wrap arch-patpick-wrap" data-arch-id="${archId}">
                        <button type="button" class="patpick-trigger form-control arch-patpick-trigger" data-arch-id="${archId}">
                            <span class="patpick-swatch" style="${getPatternCss(patternValue, colorForPreview)}"></span>
                            <span class="patpick-trigger-label">${currentLabel}</span>
                            <span class="patpick-chevron">▾</span>
                        </button>
                        ${isOpen ? `
                            <div class="patpick-panel">
                                <div class="patpick-section-label">Pattern generici</div>
                                ${rigaGenerici}
                                <div class="patpick-section-label">Retini litologici</div>
                                ${rigaRetini}
                            </div>
                        ` : ''}
                    </div>`;
            }

