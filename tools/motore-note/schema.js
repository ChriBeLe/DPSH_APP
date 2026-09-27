import { mergeAttributes, Mark, Extension, Node } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table, TableRow, TableHeader, TableCell } from '@tiptap/extension-table';
import { Link } from '@tiptap/extension-link';
import { Highlight } from '@tiptap/extension-highlight';
import { Image } from '@tiptap/extension-image';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';

/* Un attributo dichiarato che si limita a far passare l'originale: se non lo si
   dichiara, lo schema lo scarta in silenzio. Serve per class/style delle immagini,
   che nella nota portano informazione vera (forma in linea, dimensione scelta). */
const passante = (nome) => ({
  default: null,
  parseHTML: el => el.getAttribute(nome) || null,
  renderHTML: attrs => attrs[nome] ? { [nome]: attrs[nome] } : {}
});

const ImmagineNota = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      'data-note-img-id': passante('data-note-img-id'),
      // Il src viene SVUOTATO da saveState (il file vero sta su IndexedDB): va
      // dichiarato con default '' perche' un'immagine senza src resta legittima.
      src: { default: '', parseHTML: el => el.getAttribute('src') || '', renderHTML: a => ({ src: a.src || '' }) },
      class: passante('class'),
      style: passante('style'),
      'data-note-inline': passante('data-note-inline')
    };
  },
  parseHTML() { return [{ tag: 'img[data-note-img-id]' }, { tag: 'img[src]' }]; }
}).configure({ inline: true, allowBase64: true });

/* Il colore del testo. Non c'e' un pulsante che lo metta: arriva dall'incolla e dalle
   note piu' vecchie (<font color>, che il convertitore traduce in uno span). Il censimento
   lo ha trovato in note vere, quindi senza questo marcatore lo schema lo butterebbe via
   in silenzio — cioe' esattamente la perdita che il passo 1 doveva impedire. */
const ColoreTesto = Mark.create({
  name: 'coloreTesto',
  addAttributes() {
    return { color: { default: null,
      parseHTML: el => el.style.color || null,
      renderHTML: a => a.color ? { style: 'color: ' + a.color } : {} } };
  },
  parseHTML() {
    return [{ tag: 'span[style*="color"]', getAttrs: el => (el.style && el.style.color) ? {} : false }];
  },
  renderHTML({ HTMLAttributes }) { return ['span', HTMLAttributes, 0]; },
  addCommands() {
    return {
      impostaColoreTesto: (colore) => ({ chain }) => chain().setMark('coloreTesto', { color: colore }).run(),
      togliColoreTesto: () => ({ chain }) => chain().unsetMark('coloreTesto').run()
    };
  }
});

const TabellaNota = Table.extend({
  renderHTML({ HTMLAttributes }) {
    return ['table', mergeAttributes(HTMLAttributes, { class: 'note-table' }), ['tbody', 0]];
  }
});

/* ALLINEAMENTO DEL TESTO. Non e' un marcatore che avvolge del testo: e' un ATTRIBUTO della
   riga, quindi si aggiunge ai nodi che gia' esistono (paragrafi e titoli) invece di crearne
   uno nuovo. Scritto qui a mano invece di tirare dentro un altro pacchetto: sono venti righe
   e resta una cosa sola da ricompilare. */
const Allineamento = Extension.create({
  name: 'allineamento',
  addOptions() {
    return { tipi: ['heading', 'paragraph'], valori: ['left', 'center', 'right', 'justify'] };
  },
  addGlobalAttributes() {
    return [{
      types: this.options.tipi,
      attributes: {
        textAlign: {
          default: null,
          parseHTML: el => el.style.textAlign || el.getAttribute('align') || null,
          renderHTML: attrs => attrs.textAlign ? { style: `text-align: ${attrs.textAlign}` } : {}
        }
      }
    }];
  },
  addCommands() {
    return {
      impostaAllineamento: (valore) => ({ commands }) => {
        if (!this.options.valori.includes(valore)) return false;
        // `some` e non `every`: se il cursore e' in un paragrafo, updateAttributes('heading')
        // risponde di no — e con `every` il comando direbbe di aver fallito pur avendo
        // allineato la riga. Qui la domanda giusta e': ha funzionato su almeno un tipo?
        return this.options.tipi.map(t => commands.updateAttributes(t, { textAlign: valore })).some(r => r);
      },
      togliAllineamento: () => ({ commands }) =>
        this.options.tipi.map(t => commands.resetAttributes(t, 'textAlign')).some(r => r)
    };
  }
});

/* ================================ I TAG @ ================================
   Un riferimento a un dato del cantiere o a una figura del documento.

   LA REGOLA CHE LO GOVERNA, e da cui dipende tutto: IL NODO NON MEMORIZZA IL VALORE.
   Porta solo il TIPO ('sedeCommittente', 'comune', 'figura'...). Il valore si rilegge dal
   progetto ogni volta che si disegna.

   E' la stessa lezione del centro della mappa salvato dentro il template — un dato del
   cantiere finito dentro un oggetto riusabile, che al primo riuso diceva Roma su un
   cantiere di Brindisi. Qui sarebbe: template fatto per Genzano, usato su Capurso, e la
   sede del committente resta quella di Genzano. Con un tipo soltanto non puo' succedere.

   Ma il valore si VEDE, ed e' l'altra meta' della richiesta: la pastiglia mostra il dato
   vero del progetto scelto nell'editor, quindi il testo attorno si impagina davvero — una
   sede lunga manda a capo il paragrafo, e lo si vede mentre si compone invece che a PDF
   fatto. Cucinato solo in stampa, dove il documento e' morto per definizione. */
const TagDato = Node.create({
  name: 'tagDato',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,
  addAttributes() {
    return {
      tipo: {
        default: null,
        parseHTML: el => el.getAttribute('data-tag') || null,
        renderHTML: attrs => attrs.tipo ? { 'data-tag': attrs.tipo } : {}
      }
    };
  },
  parseHTML() { return [{ tag: 'span[data-tag]' }]; },
  renderHTML({ HTMLAttributes }) {
    // Il testo visibile NON e' nel documento: lo mette la vista, leggendolo dal progetto.
    // Cosi' non esiste nessuna copia del dato che possa invecchiare.
    return ['span', mergeAttributes(HTMLAttributes, { class: 'dpsh-tag' })];
  },
  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'dpsh-tag';

      // IL VALORE SI RILEGGE, non si fissa alla nascita. Serve un ridisegno esplicito
      // perche' il dato puo' cambiare senza che il documento cambi di una virgola: si
      // sceglie un altro cantiere nell'anteprima, o si corregge la sede toccando la
      // pastiglia. Senza questo, la pastiglia continuerebbe a mostrare il valore del
      // progetto precedente — cioe' esattamente il difetto che questa funzione esiste per
      // evitare, ricomparso un livello piu' in basso.
      const disegna = (n) => {
        dom.setAttribute('data-tag', n.attrs.tipo || '');
        const risolvi = (typeof globalThis.risolviTagPerVista === 'function')
          ? globalThis.risolviTagPerVista : null;
        const esito = risolvi ? risolvi(n.attrs.tipo) : null;
        if (esito && esito.valore) {
          dom.textContent = esito.valore;
          dom.classList.remove('dpsh-tag-manca');
          dom.title = esito.etichetta + ' — tocca per correggerlo nel progetto';
        } else {
          dom.textContent = (esito && esito.etichetta) || n.attrs.tipo || 'dato';
          dom.classList.add('dpsh-tag-manca');
          dom.title = ((esito && esito.etichetta) || 'Dato') + ' — manca: tocca per compilarlo';
        }
      };
      disegna(node);

      let nodoCorrente = node;
      const suEvento = () => disegna(nodoCorrente);
      document.addEventListener('dpsh-tag-aggiorna', suEvento);

      return {
        dom,
        update(nuovo) {
          if (nuovo.type.name !== 'tagDato') return false;
          nodoCorrente = nuovo;
          disegna(nuovo);
          return true;
        },
        destroy() { document.removeEventListener('dpsh-tag-aggiorna', suEvento); }
      };
    };
  },
  addCommands() {
    return {
      inserisciTag: (tipo) => ({ commands }) =>
        commands.insertContent({ type: this.name, attrs: { tipo } })
    };
  }
});

/* ============================== LE FORMULE ==============================
   VERIFICATO PRIMA DI SCRIVERE QUESTO: senza Subscript e Superscript lo schema buttava via
   <sub> e <sup> in SILENZIO, e "R<sub>pd</sub>" diventava "Rpd". Il testo del capitolo 2 —
   la formula olandese con le sue definizioni — le usa in quattro punti. Nessun errore,
   nessun avviso: la formula perdeva significato e restava scritta male nel PDF firmato.
   E' la regola di questo motore, e questa e' la terza volta che morde: cio' che non e'
   dichiarato viene scartato.

   Il MARCATORE FORMULA applica il carattere matematico (STIX Two Math, incorporato) alla
   selezione. Word usa Cambria Math anche nei documenti scritti in Calibri: le formule
   restano con le grazie per convenzione tipografica, perche' le lettere con grazie si
   distinguono meglio quando diventano simboli (la l dall'1, la I dalla l). */
const Formula = Mark.create({
  name: 'formula',
  parseHTML() { return [{ tag: 'span[data-formula]' }]; },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-formula': '1', class: 'dpsh-formula' }), 0];
  },
  addCommands() {
    return {
      impostaFormula: () => ({ commands }) => commands.setMark(this.name),
      togliFormula: () => ({ commands }) => commands.unsetMark(this.name),
      alternaFormula: () => ({ commands }) => commands.toggleMark(this.name)
    };
  }
});

/* ============================ L'INTERRUZIONE DI PAGINA ============================
   Un nodo vero, non un <hr> riciclato. La tentazione c'era — l'<hr> esiste gia' nello
   schema e non avrebbe richiesto di ricostruire il pacchetto — ma sarebbe stato dare a un
   simbolo due significati: una linea decorativa e un salto pagina non sono la stessa cosa,
   e il giorno in cui servisse davvero una linea non ci sarebbe stato modo di distinguerle.
   Il pacchetto si ricostruisce dal sorgente ed e' verificato identico al byte, quindi il
   costo di farlo bene era basso.

   E' un atomo: non ha contenuto, non si puo' scrivere dentro, e si seleziona come un
   blocco solo. In stampa diventa un salto pagina; nell'editor una riga tratteggiata con
   scritto cosa fa. */
const InterruzionePagina = Node.create({
  name: 'interruzionePagina',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: false,
  parseHTML() { return [{ tag: 'div[data-interruzione-pagina]' }]; },
  renderHTML() {
    return ['div', { 'data-interruzione-pagina': 'manuale', class: 'dpsh-interruzione' }];
  },
  addCommands() {
    return {
      inserisciInterruzionePagina: () => ({ commands }) => commands.insertContent({ type: this.name })
    };
  },
  addKeyboardShortcuts() {
    // La stessa scorciatoia di Word: e' quella che le dita conoscono gia'.
    return { 'Mod-Enter': () => this.editor.commands.inserisciInterruzionePagina() };
  }
});

/* ====================== LE REGOLE DEL PARAGRAFO ======================
   Quello che l'autore decide non e' DOVE si taglia — quella e' una conseguenza della
   larghezza e del corpo, e cambia da sola — ma QUALI paragrafi non si possono tagliare.
   E' il modello di Word (Formato > Paragrafo > Distribuzione testo), e funziona da
   trent'anni perche' e' la domanda a cui un autore sa rispondere.

   L'attributo va DICHIARATO o lo schema lo scarta in silenzio: e' la regola che governa
   tutto questo motore, e che in questo progetto ha gia' fatto sparire dati una volta. */
const REGOLE_PARAGRAFO = ['non-spezzare', 'con-successivo', 'pagina-nuova'];
const RegolaParagrafo = Extension.create({
  name: 'regolaParagrafo',
  addOptions() { return { tipi: ['paragraph', 'heading'] }; },
  addGlobalAttributes() {
    return [{
      types: this.options.tipi,
      attributes: {
        regolaPagina: {
          default: null,
          parseHTML: el => el.getAttribute('data-regola-pagina') || null,
          renderHTML: attrs => attrs.regolaPagina ? { 'data-regola-pagina': attrs.regolaPagina } : {}
        }
      }
    }];
  },
  addCommands() {
    return {
      impostaRegolaPagina: (valore) => ({ commands }) => {
        if (valore !== null && !REGOLE_PARAGRAFO.includes(valore)) return false;
        return this.options.tipi.map(t => commands.updateAttributes(t, { regolaPagina: valore })).some(r => r);
      }
    };
  }
});

export const ESTENSIONI = [
  StarterKit.configure({ link: false }),
  Link.configure({ openOnClick: false }),
  Highlight.configure({ multicolor: true }),
  ColoreTesto, Allineamento, InterruzionePagina, RegolaParagrafo,
  Subscript, Superscript, Formula, TagDato,
  ImmagineNota, TaskList, TaskItem.configure({ nested: false }),
  TabellaNota, TableRow, TableHeader, TableCell
];
