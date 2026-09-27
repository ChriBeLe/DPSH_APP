            // ===================== FASE 2: RICONOSCIMENTO AUTOMATICO DEGLI STRATI =====================

            // Ritorna gli indici di log in cui inizia un nuovo strato (rispetto al log precedente),
            // basandosi sull'ereditarietà già usata da getEffectiveLithology.
            function getStratiBoundaryIndices() {
                const boundaries = [];
                if (!state.logs || state.logs.length < 2) return boundaries;
                let lastLitId = getEffectiveLithology(0).id;
                for (let i = 1; i < state.logs.length; i++) {
                    const litId = getEffectiveLithology(i).id;
                    if (litId !== lastLitId) {
                        boundaries.push(i);
                        lastLitId = litId;
                    }
                }
                return boundaries;
            }

            // Algoritmo di rilevamento: scorre gli intervalli e apre un nuovo "segmento" ogni volta
            // che la differenza di colpi rispetto all'intervallo precedente supera la soglia impostata
            // (sia in aumento che in diminuzione). I segmenti più sottili dello spessore minimo vengono
            // fusi con il segmento adiacente per evitare falsi positivi (es. un singolo intervallo più
            // tenace isolato in mezzo a uno strato omogeneo).
            function detectStratiSegments(minDeltaColpi, minThicknessM) {
                const logs = state.logs;
                if (!logs || logs.length < 2) return [];

                let segments = [{ startIdx: 0 }];
                for (let i = 1; i < logs.length; i++) {
                    const delta = Math.abs((logs[i].colpi || 0) - (logs[i - 1].colpi || 0));
                    if (delta > minDeltaColpi) {
                        segments.push({ startIdx: i });
                    }
                }
                segments.forEach((seg, s) => {
                    seg.endIdx = (s < segments.length - 1) ? segments[s + 1].startIdx - 1 : logs.length - 1;
                });

                // Fonde i segmenti più sottili dello spessore minimo con il segmento adiacente più vicino
                let merged = true;
                let safety = 0;
                while (merged && segments.length > 1 && safety < 500) {
                    merged = false;
                    safety++;
                    for (let s = 0; s < segments.length; s++) {
                        const thickness = logs[segments[s].endIdx].end - logs[segments[s].startIdx].start;
                        if (thickness < minThicknessM - 0.0001) {
                            if (s > 0) {
                                segments[s - 1].endIdx = segments[s].endIdx;
                                segments.splice(s, 1);
                            } else {
                                segments[s + 1].startIdx = segments[s].startIdx;
                                segments.splice(s, 1);
                            }
                            merged = true;
                            break;
                        }
                    }
                }
                return segments;
            }

            // Applica i segmenti rilevati (o ridefiniti manualmente) ai log, assegnando/creando gli
            // strati necessari. Se i segmenti rilevati sono più degli strati già configurati, vengono
            // creati automaticamente nuovi strati (nominati "Strato N") con colori progressivi presi
            // dalla stessa palette usata da "➕ Aggiungi Nuovo Strato".
            function applyDetectedSegmentsToLogs(segments) {
                if (!segments || segments.length === 0) return;
                const hueColors = ['#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#ec4899', '#f97316', '#06b6d4', '#84cc16'];

                while (state.strati.length < segments.length) {
                    const newIdx = state.strati.length + 1;
                    state.strati.push({
                        id: 'strato_auto_' + Date.now() + '_' + newIdx,
                        name: 'Strato ' + newIdx,
                        color: hueColors[(state.strati.length) % hueColors.length]
                    });
                }

                // Ripulisce tutte le assegnazioni esplicite precedenti, poi marca l'inizio di ogni
                // segmento con lo strato corrispondente (in ordine, ciclando sulla palette se ce ne
                // fossero meno del numero di segmenti rilevati).
                state.logs.forEach(l => { delete l.lithology; });
                segments.forEach((seg, s) => {
                    const strato = state.strati[s % state.strati.length];
                    state.logs[seg.startIdx].lithology = strato.id;
                });
            }

            // Sposta il contatto tra due strati (usato dalle maniglie trascinabili del grafico):
            // rimuove il marker esplicito dal vecchio indice e lo riporta sul nuovo indice.
            function moveStratiBoundary(oldIdx, newIdx) {
                if (oldIdx === newIdx) return;
                if (newIdx < 1 || newIdx >= state.logs.length) return;
                const litId = state.logs[oldIdx].lithology || getEffectiveLithology(oldIdx).id;
                if (state.logs[oldIdx] && state.logs[oldIdx].lithology) {
                    delete state.logs[oldIdx].lithology;
                }
                state.logs[newIdx].lithology = litId;
            }

            // Helper: converte una tile SVG in un data-URI utilizzabile come background-image
            // NOTA: il valore viene racchiuso tra apici SINGOLI perché questo risultato finisce
            // sempre dentro un attributo HTML style="..." racchiuso da apici DOPPI: usare url("...")
            // qui rompeva il parsing dell'attributo (le doppie virgolette si chiudevano in anticipo),
            // rendendo invisibili grafico e legenda per qualsiasi litologia con un pattern diverso da "Pieno".
            function svgTileUrl(svgMarkup) {
                const encoded = encodeURIComponent(svgMarkup).replace(/'/g, '%27');
                return `url('data:image/svg+xml,${encoded}')`;
            }

            // LIBRERIA PATTERN VISUALI PER GLI STRATI LITOLOGICI
            // Ogni pattern è una tile SVG (renderizzazione affidabile su ogni browser) sovrapposta al colore di base.
            const PATTERN_LIBRARY = [
                { id: 'none', icon: '⏹️', name: 'Pieno',
                    css: c => `background: ${c};`,
                    tw: 8, th: 8, svg: c => `<rect width="8" height="8" fill="${c}"/>` },
                { id: 'dots', icon: '⁚', name: 'Puntinato Fine',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='7' height='7'><circle cx='3.5' cy='3.5' r='1.2' fill='rgba(0,0,0,0.55)'/></svg>`)} 0 0/7px 7px, ${c};`,
                    tw: 7, th: 7, svg: c => `<rect width="7" height="7" fill="${c}"/><circle cx="3.5" cy="3.5" r="1.2" fill="rgba(0,0,0,0.55)"/>` },
                { id: 'dotsLarge', icon: '∴', name: 'Puntinato Rado',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='13' height='13'><circle cx='6.5' cy='6.5' r='2.1' fill='rgba(0,0,0,0.55)'/></svg>`)} 0 0/13px 13px, ${c};`,
                    tw: 13, th: 13, svg: c => `<rect width="13" height="13" fill="${c}"/><circle cx="6.5" cy="6.5" r="2.1" fill="rgba(0,0,0,0.55)"/>` },
                { id: 'circles', icon: '○', name: 'Cerchietti (Ghiaia)',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='16'><circle cx='8' cy='8' r='3.2' fill='none' stroke='rgba(0,0,0,0.6)' stroke-width='1.4'/></svg>`)} 0 0/16px 16px, ${c};`,
                    tw: 16, th: 16, svg: c => `<rect width="16" height="16" fill="${c}"/><circle cx="8" cy="8" r="3.2" fill="none" stroke="rgba(0,0,0,0.6)" stroke-width="1.4"/>` },
                { id: 'bricks', icon: '🧱', name: 'Mattoncini',
                    css: c => `background: repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.28) 4px, rgba(0,0,0,0.28) 5px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.28) 8px, rgba(0,0,0,0.28) 10px), ${c};`,
                    tw: 20, th: 10, svg: c => `<rect width="20" height="10" fill="${c}"/><path d="M0 5H20M10 0V5M5 5V10M15 5V10" stroke="rgba(0,0,0,0.28)" stroke-width="1"/>` },
                { id: 'bricksDots', icon: '🧱', name: 'Mattone Puntinato',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='5'><circle cx='5' cy='2.5' r='1' fill='rgba(0,0,0,0.5)'/></svg>`)} 0 0/10px 5px, repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.28) 4px, rgba(0,0,0,0.28) 5px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.28) 8px, rgba(0,0,0,0.28) 10px), ${c};`,
                    tw: 20, th: 10, svg: c => `<rect width="20" height="10" fill="${c}"/><path d="M0 5H20M10 0V5M5 5V10M15 5V10" stroke="rgba(0,0,0,0.28)" stroke-width="1"/><circle cx="5" cy="2.5" r="1" fill="rgba(0,0,0,0.5)"/><circle cx="15" cy="7.5" r="1" fill="rgba(0,0,0,0.5)"/>` },
                { id: 'bricksTratto', icon: '🧱', name: 'Mattone Tratteggiato',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='10' height='5'><line x1='2' y1='2.5' x2='8' y2='2.5' stroke='rgba(0,0,0,0.55)' stroke-width='1.4' stroke-linecap='butt'/></svg>`)} 0 0/10px 5px, repeating-linear-gradient(0deg, transparent, transparent 4px, rgba(0,0,0,0.28) 4px, rgba(0,0,0,0.28) 5px), repeating-linear-gradient(90deg, transparent, transparent 8px, rgba(0,0,0,0.28) 8px, rgba(0,0,0,0.28) 10px), ${c};`,
                    tw: 20, th: 10, svg: c => `<rect width="20" height="10" fill="${c}"/><path d="M0 5H20M10 0V5M5 5V10M15 5V10" stroke="rgba(0,0,0,0.28)" stroke-width="1"/><line x1="2" y1="2.5" x2="8" y2="2.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.4"/><line x1="12" y1="7.5" x2="18" y2="7.5" stroke="rgba(0,0,0,0.55)" stroke-width="1.4"/>` },
                { id: 'hatch', icon: '▨', name: 'Tratteggio Incrociato',
                    css: c => `background: repeating-linear-gradient(45deg, rgba(0,0,0,0.28), rgba(0,0,0,0.28) 2px, transparent 2px, transparent 7px), repeating-linear-gradient(-45deg, rgba(0,0,0,0.28), rgba(0,0,0,0.28) 2px, transparent 2px, transparent 7px), ${c};`,
                    tw: 8, th: 8, svg: c => `<rect width="8" height="8" fill="${c}"/><path d="M0 8L8 0M-1 1L1 -1M7 9L9 7" stroke="rgba(0,0,0,0.28)" stroke-width="1.4"/><path d="M0 0L8 8M-1 7L1 9M7 -1L9 1" stroke="rgba(0,0,0,0.28)" stroke-width="1.4"/>` },
                { id: 'diag', icon: '╱', name: 'Diagonale',
                    css: c => `background: repeating-linear-gradient(45deg, rgba(0,0,0,0.32), rgba(0,0,0,0.32) 2px, transparent 2px, transparent 7px), ${c};`,
                    tw: 9, th: 9, svg: c => `<rect width="9" height="9" fill="${c}"/><path d="M0 9L9 0M-1 1L1 -1M8 10L10 8" stroke="rgba(0,0,0,0.32)" stroke-width="1.6"/>` },
                { id: 'vlines', icon: '‖', name: 'Linee Verticali',
                    css: c => `background: repeating-linear-gradient(90deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 2px, transparent 2px, transparent 7px), ${c};`,
                    tw: 7, th: 7, svg: c => `<rect width="7" height="7" fill="${c}"/><line x1="0.5" y1="0" x2="0.5" y2="7" stroke="rgba(0,0,0,0.3)" stroke-width="1.6"/>` },
                { id: 'dashed', icon: '▤', name: 'Righe Orizzontali',
                    css: c => `background: repeating-linear-gradient(0deg, rgba(0,0,0,0.3), rgba(0,0,0,0.3) 2px, transparent 2px, transparent 5px), ${c};`,
                    tw: 5, th: 5, svg: c => `<rect width="5" height="5" fill="${c}"/><line x1="0" y1="0.5" x2="5" y2="0.5" stroke="rgba(0,0,0,0.3)" stroke-width="1.6"/>` },
                { id: 'tratto', icon: '┄', name: 'Tratti (Alternati)',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='16' height='20'><line x1='2' y1='5' x2='10' y2='5' stroke='rgba(0,0,0,0.6)' stroke-width='2' stroke-linecap='butt'/><line x1='10' y1='15' x2='16' y2='15' stroke='rgba(0,0,0,0.6)' stroke-width='2' stroke-linecap='butt'/><line x1='0' y1='15' x2='2' y2='15' stroke='rgba(0,0,0,0.6)' stroke-width='2' stroke-linecap='butt'/></svg>`)} 0 0/16px 20px, ${c};`,
                    tw: 16, th: 20, svg: c => `<rect width="16" height="20" fill="${c}"/><line x1="2" y1="5" x2="10" y2="5" stroke="rgba(0,0,0,0.6)" stroke-width="2"/><line x1="10" y1="15" x2="16" y2="15" stroke="rgba(0,0,0,0.6)" stroke-width="2"/><line x1="0" y1="15" x2="2" y2="15" stroke="rgba(0,0,0,0.6)" stroke-width="2"/>` },
                { id: 'puntotratto', icon: '┈', name: 'Punto e Tratto (Alternati)',
                    css: c => `background: ${svgTileUrl(`<svg xmlns='http://www.w3.org/2000/svg' width='24' height='20'><line x1='2' y1='5' x2='11' y2='5' stroke='rgba(0,0,0,0.6)' stroke-width='2' stroke-linecap='butt'/><circle cx='18' cy='5' r='1.4' fill='rgba(0,0,0,0.6)'/><line x1='14' y1='15' x2='23' y2='15' stroke='rgba(0,0,0,0.6)' stroke-width='2' stroke-linecap='butt'/><circle cx='6' cy='15' r='1.4' fill='rgba(0,0,0,0.6)'/></svg>`)} 0 0/24px 20px, ${c};`,
                    tw: 24, th: 20, svg: c => `<rect width="24" height="20" fill="${c}"/><line x1="2" y1="5" x2="11" y2="5" stroke="rgba(0,0,0,0.6)" stroke-width="2"/><circle cx="18" cy="5" r="1.4" fill="rgba(0,0,0,0.6)"/><line x1="14" y1="15" x2="23" y2="15" stroke="rgba(0,0,0,0.6)" stroke-width="2"/><circle cx="6" cy="15" r="1.4" fill="rgba(0,0,0,0.6)"/>` }
            ];

