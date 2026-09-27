import { Editor } from '@tiptap/core';
import StarterKit from '@tiptap/starter-kit';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import { ESTENSIONI } from './schema.js';

// `pm` espone i mattoni di ProseMirror che servono all'app per costruirsi da sola una
// funzione che la libreria non ha: la ricerca nella nota, fatta con le decorazioni (non
// tocca il documento, quindi non entra nella pila dell'annulla e non sporca il salvataggio).
globalThis.NoteEditor = { Editor, ESTENSIONI, SOLO_STANDARD: [StarterKit],
  pm: { Plugin, PluginKey, Decoration, DecorationSet } };
