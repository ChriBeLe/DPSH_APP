            // ==================================================================================
            //  LA BARRETTA SULLA SELEZIONE
            //  Selezioni del testo e compaiono i quattro comandi che hanno senso su una
            //  selezione. Non toglie niente alla barra in cima: la affianca. Il guadagno e' tutto
            //  sul telefono, dove il viaggio dito -> barra -> dito costa piu' del comando stesso.
            // ==================================================================================
            const noteBubbleMenu = document.getElementById('noteBubbleMenu');

            function nascondiBollaSelezione() {
                if (noteBubbleMenu) noteBubbleMenu.classList.remove('aperta');
            }

            function aggiornaBollaSelezione() {
                if (!noteBubbleMenu || !editorNote) return;
                const { state, view } = editorNote;
                const sel = state.selection;
                // Si mostra solo su una selezione di TESTO non vuota: su un'immagine c'e' gia' la
                // sua barra, e su un cursore fermo non ci sarebbe niente da applicare.
                if (!editorNote.isFocused || sel.empty || sel.node || !view.hasFocus()) { nascondiBollaSelezione(); return; }
                let inizio, fine;
                try { inizio = view.coordsAtPos(sel.from); fine = view.coordsAtPos(sel.to); }
                catch (e) { nascondiBollaSelezione(); return; }
                const centro = (Math.min(inizio.left, fine.left) + Math.max(inizio.right, fine.right)) / 2;
                const alto = Math.min(inizio.top, fine.top);
                noteBubbleMenu.classList.add('aperta');
                // Restare dentro lo schermo: su una selezione a inizio riga la bolla uscirebbe.
                const larghezza = noteBubbleMenu.offsetWidth || 160;
                const x = Math.max(larghezza / 2 + 8, Math.min(window.innerWidth - larghezza / 2 - 8, centro));
                noteBubbleMenu.style.left = x + 'px';
                noteBubbleMenu.style.top = Math.max(44, alto - 8) + 'px';
                noteBubbleMenu.querySelectorAll('[data-bolla]').forEach(btn => {
                    const nome = { bold: 'bold', italic: 'italic', highlight: 'highlight', link: 'link' }[btn.dataset.bolla];
                    btn.classList.toggle('is-active', !!nome && editorNote.isActive(nome));
                });
            }

            if (noteBubbleMenu) {
                // pointerdown, non click: senza questo il tocco sulla barretta toglierebbe il
                // fuoco all'editor e con esso la selezione, cioe' proprio quello su cui il
                // comando deve agire.
                noteBubbleMenu.addEventListener('pointerdown', (e) => e.preventDefault());
                noteBubbleMenu.querySelectorAll('[data-bolla]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        if (!editorNote) return;
                        const che = btn.dataset.bolla;
                        if (che === 'bold') editorNote.chain().focus().toggleBold().run();
                        else if (che === 'italic') editorNote.chain().focus().toggleItalic().run();
                        else if (che === 'highlight') editorNote.chain().focus().toggleHighlight({ color: NOTE_HIGHLIGHT_PALETTE[0] }).run();
                        else if (che === 'link') { const b = document.getElementById('btnNoteInsertLink'); if (b) b.click(); return; }
                        salvaNoteProgettoCorrente(true);
                        aggiornaBollaSelezione();
                    });
                });
            }

