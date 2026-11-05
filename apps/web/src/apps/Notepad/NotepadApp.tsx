import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { Button, StatusBar, StatusField } from '@/components/controls';
import { Menu, MenuBar, MenuItem, MenuSeparator } from '@/components/MenuBar';
import { LETTER_TEXT } from '@/data/letter';
import { DOCUMENT_EVENT, takePendingDocument, type OpenDocument } from '@/os/documents';
import { useOs } from '@/os/OsProvider';
import { readJson, removeKey, STORAGE_KEYS, writeJson } from '@/os/persistence';
import { playSfx } from '@/os/sfx';
import type { WindowState } from '@/os/types';

interface Doc {
  name: string;
  text: string;
}

type FontSize = 'small' | 'medium' | 'large';

interface WritableLike {
  write: (data: Blob | string) => Promise<void>;
  close: () => Promise<void>;
}

interface FileHandleLike {
  name: string;
  getFile: () => Promise<File>;
  createWritable: () => Promise<WritableLike>;
}

type PickerWindow = Window & {
  showOpenFilePicker?: (options?: { multiple?: boolean; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileHandleLike[]>;
  showSaveFilePicker?: (options?: { suggestedName?: string; types?: { description: string; accept: Record<string, string[]> }[] }) => Promise<FileHandleLike>;
};

const PICKER_TYPES = [{ description: 'Text Documents', accept: { 'text/plain': ['.txt', '.md', '.log'] } }];
const LETTER: Doc = { name: 'Letter.txt', text: LETTER_TEXT };

function loadDraft(): Doc | null {
  const raw = readJson<unknown | null>(STORAGE_KEYS.notepadDraft, null);
  if (!raw || typeof raw !== 'object') return null;
  const draft = raw as Partial<Doc>;
  if (typeof draft.text !== 'string' || draft.text.length === 0) return null;
  return { name: typeof draft.name === 'string' && draft.name ? draft.name : 'Untitled.txt', text: draft.text };
}

/**
 * Notepad: a real little editor. It opens the love letter by default (the
 * letter itself is never overwritten), any text file from My Documents, or a
 * file from the real disk; it can save a copy, and unsaved work is kept as a
 * draft that can be restored after a refresh.
 */
export function NotepadApp({ win }: { win: WindowState }) {
  const { dispatch, closeWindow, openApp } = useOs();
  const [initial] = useState<Doc>(() => takePendingDocument() ?? LETTER);
  const [name, setName] = useState(initial.name);
  const [text, setText] = useState(initial.text);
  const [dirty, setDirty] = useState(false);
  const [wrap, setWrap] = useState(true);
  const [statusBar, setStatusBar] = useState(true);
  const [font, setFont] = useState<FontSize>('medium');
  const [caret, setCaret] = useState({ line: 1, col: 1 });
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<'new' | 'open' | 'exit' | null>(null);
  const [incoming, setIncoming] = useState<OpenDocument | null>(null);
  const [draft, setDraft] = useState<Doc | null>(() => {
    const saved = loadDraft();
    return saved && saved.text !== initial.text && saved.text !== LETTER.text ? saved : null;
  });
  const handleRef = useRef<FileHandleLike | null>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const counts = useMemo(() => {
    const trimmed = text.trim();
    return { words: trimmed ? trimmed.split(/\s+/).length : 0, chars: text.length };
  }, [text]);

  useEffect(() => {
    dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: `${name} - Notepad` });
  }, [dispatch, win.id, name]);

  // Keep unsaved work as a draft, so a refresh never loses it.
  useEffect(() => {
    if (!dirty) return;
    const id = window.setTimeout(() => writeJson(STORAGE_KEYS.notepadDraft, { name, text }), 600);
    return () => window.clearTimeout(id);
  }, [name, text, dirty]);

  // Files opened from My Documents while Notepad is already open.
  useEffect(() => {
    const onDocument = (event: Event) => {
      const doc = (event as CustomEvent<OpenDocument>).detail;
      if (!doc || typeof doc.name !== 'string' || typeof doc.text !== 'string') return;
      takePendingDocument();
      if (doc.name === name && doc.text === text) return;
      if (dirty) setIncoming(doc);
      else applyDocument(doc);
    };
    window.addEventListener(DOCUMENT_EVENT, onDocument);
    return () => window.removeEventListener(DOCUMENT_EVENT, onDocument);
  });

  const focusArea = () => requestAnimationFrame(() => areaRef.current?.focus());

  const applyDocument = (doc: Doc, isDirty = false) => {
    handleRef.current = null;
    setName(doc.name);
    setText(doc.text);
    setDirty(isDirty);
    setError(null);
    setIncoming(null);
    setPending(null);
    setNotice(null);
    setCaret({ line: 1, col: 1 });
    focusArea();
  };

  const markSaved = (message: string) => {
    setDirty(false);
    setError(null);
    setNotice(message);
    removeKey(STORAGE_KEYS.notepadDraft);
    playSfx('disk');
  };

  const saveAs = async () => {
    const picker = (window as PickerWindow).showSaveFilePicker;
    if (picker) {
      try {
        const handle = await picker({ suggestedName: name, types: PICKER_TYPES });
        const writable = await handle.createWritable();
        await writable.write(text);
        await writable.close();
        handleRef.current = handle;
        setName(handle.name);
        markSaved(`Saved to ${handle.name}`);
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError('Save failed. The document is still unsaved.');
      }
      return;
    }
    try {
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = /\.\w+$/.test(name) ? name : `${name}.txt`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      markSaved('Downloaded a copy to your computer.');
    } catch {
      setError('Save failed. The document is still unsaved.');
    }
  };

  const save = async () => {
    const handle = handleRef.current;
    if (!handle) {
      await saveAs();
      return;
    }
    try {
      const writable = await handle.createWritable();
      await writable.write(text);
      await writable.close();
      markSaved(`Saved to ${handle.name}`);
    } catch {
      setError('Save failed. The document is still unsaved.');
    }
  };

  const doOpen = async () => {
    setPending(null);
    const picker = (window as PickerWindow).showOpenFilePicker;
    if (!picker) {
      fileRef.current?.click();
      return;
    }
    try {
      const [handle] = await picker({ multiple: false, types: PICKER_TYPES });
      if (!handle) return;
      const file = await handle.getFile();
      applyDocument({ name: handle.name, text: await file.text() });
      handleRef.current = handle;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setError('Could not open that file.');
    }
  };

  const request = (next: 'new' | 'open' | 'exit') => {
    if (dirty) {
      setPending(next);
      return;
    }
    run(next);
  };

  const run = (action: 'new' | 'open' | 'exit') => {
    setPending(null);
    if (action === 'new') applyDocument({ name: 'Untitled.txt', text: '' });
    else if (action === 'open') void doOpen();
    else closeWindow(win.id);
  };

  const insertAtCaret = (insert: string) => {
    const el = areaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    setText((t) => `${t.slice(0, start)}${insert}${t.slice(end)}`);
    setDirty(true);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + insert.length, start + insert.length);
    });
  };

  const timeDate = () => {
    const now = new Date();
    insertAtCaret(`${now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} ${now.toLocaleDateString()}`);
  };

  const clipboard = async (kind: 'cut' | 'copy' | 'paste') => {
    const el = areaRef.current;
    if (!el) return;
    const selection = text.slice(el.selectionStart, el.selectionEnd);
    try {
      if (kind === 'paste') {
        insertAtCaret(await navigator.clipboard.readText());
        return;
      }
      if (!selection) return;
      await navigator.clipboard.writeText(selection);
      if (kind === 'cut') insertAtCaret('');
    } catch {
      setError('The clipboard is not available here. Use Ctrl+C, Ctrl+X and Ctrl+V instead.');
    }
  };

  const updateCaret = () => {
    const el = areaRef.current;
    if (!el) return;
    const before = el.value.slice(0, el.selectionStart);
    const lines = before.split('\n');
    setCaret({ line: lines.length, col: (lines[lines.length - 1]?.length ?? 0) + 1 });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'F5') {
      e.preventDefault();
      timeDate();
      return;
    }
    if (!(e.ctrlKey || e.metaKey)) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      void (e.shiftKey ? saveAs() : save());
    } else if (key === 'o') {
      e.preventDefault();
      request('open');
    } else if (key === 'n') {
      e.preventDefault();
      request('new');
    }
  };

  const busyBanner = incoming ?? pending;

  return (
    <div className="app-fill" onKeyDown={onKeyDown}>
      <MenuBar>
        <Menu label="File">
          <MenuItem accelerator="Ctrl+N" onSelect={() => request('new')}>
            New
          </MenuItem>
          <MenuItem accelerator="Ctrl+O" onSelect={() => request('open')}>
            Open...
          </MenuItem>
          <MenuItem accelerator="Ctrl+S" onSelect={() => void save()}>
            Save
          </MenuItem>
          <MenuItem onSelect={() => void saveAs()}>Save As...</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => applyDocument(LETTER)}>Open the Love Letter</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => request('exit')}>Exit</MenuItem>
        </Menu>
        <Menu label="Edit">
          <MenuItem accelerator="Ctrl+X" onSelect={() => void clipboard('cut')}>
            Cut
          </MenuItem>
          <MenuItem accelerator="Ctrl+C" onSelect={() => void clipboard('copy')}>
            Copy
          </MenuItem>
          <MenuItem accelerator="Ctrl+V" onSelect={() => void clipboard('paste')}>
            Paste
          </MenuItem>
          <MenuSeparator />
          <MenuItem
            accelerator="Ctrl+A"
            onSelect={() => {
              areaRef.current?.focus();
              areaRef.current?.select();
            }}
          >
            Select All
          </MenuItem>
          <MenuItem accelerator="F5" onSelect={timeDate}>
            Time/Date
          </MenuItem>
        </Menu>
        <Menu label="Format">
          <MenuItem checked={wrap} onSelect={() => setWrap((v) => !v)}>
            Word Wrap
          </MenuItem>
          <MenuSeparator />
          <MenuItem checked={font === 'small'} onSelect={() => setFont('small')}>
            Small Font
          </MenuItem>
          <MenuItem checked={font === 'medium'} onSelect={() => setFont('medium')}>
            Medium Font
          </MenuItem>
          <MenuItem checked={font === 'large'} onSelect={() => setFont('large')}>
            Large Font
          </MenuItem>
        </Menu>
        <Menu label="View">
          <MenuItem checked={statusBar} onSelect={() => setStatusBar((v) => !v)}>
            Status Bar
          </MenuItem>
        </Menu>
        <Menu label="Help">
          <MenuItem onSelect={() => openApp('help')}>Help Topics</MenuItem>
          <MenuItem onSelect={() => dispatch({ type: 'OPEN_DIALOG', action: 'about' })}>About Notepad</MenuItem>
        </Menu>
      </MenuBar>

      {draft && !busyBanner ? (
        <div className="infobar" role="status">
          <strong>Unsaved draft found:</strong>
          <span>{draft.name}</span>
          <Button
            small
            onClick={() => {
              applyDocument(draft, true);
              setDraft(null);
            }}
          >
            Restore
          </Button>
          <Button
            small
            onClick={() => {
              removeKey(STORAGE_KEYS.notepadDraft);
              setDraft(null);
            }}
          >
            Discard
          </Button>
        </div>
      ) : null}

      {incoming ? (
        <div className="infobar" role="alert">
          <strong>Open {incoming.name}?</strong>
          <span>Your changes to {name} are not saved.</span>
          <Button small onClick={() => applyDocument(incoming)}>
            Discard and open
          </Button>
          <Button small onClick={() => setIncoming(null)}>
            Keep editing
          </Button>
        </div>
      ) : pending ? (
        <div className="infobar" role="alert">
          <strong>Do you want to save the changes to {name}?</strong>
          <Button
            small
            onClick={async () => {
              await saveAs();
              setPending(null);
            }}
          >
            Save
          </Button>
          <Button small onClick={() => run(pending)}>
            Don&apos;t Save
          </Button>
          <Button small onClick={() => setPending(null)}>
            Cancel
          </Button>
        </div>
      ) : null}

      {error ? (
        <div className="infobar" role="alert">
          <strong>{error}</strong>
          <Button small onClick={() => setError(null)}>
            OK
          </Button>
        </div>
      ) : null}

      <textarea
        ref={areaRef}
        className="notepad-area selectable"
        data-size={font}
        aria-label={`${name} text`}
        value={text}
        spellCheck={false}
        wrap={wrap ? 'soft' : 'off'}
        style={{ whiteSpace: wrap ? 'pre-wrap' : 'pre', overflowX: wrap ? 'hidden' : 'auto' }}
        onChange={(e) => {
          setText(e.target.value);
          setDirty(true);
          setNotice(null);
        }}
        onSelect={updateCaret}
        onKeyUp={updateCaret}
        onClick={updateCaret}
      />

      <input
        ref={fileRef}
        type="file"
        accept=".txt,.md,.log,text/plain"
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (!file) return;
          try {
            applyDocument({ name: file.name, text: await file.text() });
          } catch {
            setError('Could not read that file.');
          }
        }}
      />

      {statusBar ? (
        <StatusBar>
          <StatusField>{notice ?? (dirty ? 'Modified' : 'Ready')}</StatusField>
          <StatusField grow={false} style={{ minWidth: 120 }}>
            {counts.words} words
          </StatusField>
          <StatusField grow={false} style={{ minWidth: 104 }}>
            Ln {caret.line}, Col {caret.col}
          </StatusField>
        </StatusBar>
      ) : null}
    </div>
  );
}
