import { useEffect, useMemo, useState } from 'react';

import { Button, StatusBar, StatusField, Tabs } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { readJson, STORAGE_KEYS, writeJson } from '@/os/persistence';
import { playSfx } from '@/os/sfx';
import type { WindowState } from '@/os/types';
import { HeartCatcher } from './HeartCatcher';

interface Memory {
  id: string;
  text: string;
}

type Tab = 'game' | 'jar';

function loadMemories(): Memory[] {
  const raw = readJson<unknown | null>(STORAGE_KEYS.heartsFavorites, null);
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (item): item is Memory =>
      !!item && typeof item === 'object' && typeof (item as Memory).id === 'string' && typeof (item as Memory).text === 'string'
  );
}

/** The Memory Jar: little notes worth keeping, saved in this browser. */
function MemoryJar() {
  const [items, setItems] = useState<Memory[]>(loadMemories);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    writeJson(STORAGE_KEYS.heartsFavorites, items);
  }, [items]);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return term ? items.filter((item) => item.text.toLowerCase().includes(term)) : items;
  }, [items, query]);

  const add = () => {
    const text = draft.trim();
    if (!text) return;
    playSfx('pop');
    const item = { id: `memory-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, text };
    setItems((list) => [item, ...list]);
    setDraft('');
    setSelected(item.id);
  };

  const remove = () => {
    if (!selected) return;
    playSfx('recycle');
    setItems((list) => list.filter((item) => item.id !== selected));
    setSelected(null);
  };

  return (
    <div className="memo">
      <p className="hint" style={{ margin: 0 }}>
        A jar for small things worth keeping: a joke, a date, a moment. Notes stay in this browser.
      </p>
      <form
        className="form-row"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input className="field" style={{ flex: 1 }} value={draft} maxLength={200} placeholder="Write a memory…" aria-label="New memory" onChange={(e) => setDraft(e.target.value)} />
        <Button type="submit" disabled={!draft.trim()} disabledReason="Write something first.">
          Add
        </Button>
      </form>
      <div className="form-row">
        <input className="field" style={{ flex: 1 }} value={query} placeholder="Search the jar…" aria-label="Search memories" onChange={(e) => setQuery(e.target.value)} />
        <Button onClick={remove} disabled={!selected} disabledReason="Select a memory first.">
          Remove
        </Button>
      </div>
      <div className="well" role="listbox" aria-label="Memories" tabIndex={0}>
        {filtered.length === 0 ? (
          <div className="empty-note">
            <Icon name="heart" size={32} />
            <span>{query ? 'No memories match that search.' : 'The jar is empty. Add the first memory above.'}</span>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} role="option" aria-selected={selected === item.id} className="memo-row" onClick={() => setSelected(item.id)}>
              <Icon name="tray-heart" size={16} />
              <span className="selectable" style={{ flex: 1 }}>
                {item.text}
              </span>
            </div>
          ))
        )}
      </div>
      <StatusBar grip={false}>
        <StatusField>{`${items.length} memor${items.length === 1 ? 'y' : 'ies'}`}</StatusField>
        <StatusField grow={false}>Saved on this computer</StatusField>
      </StatusBar>
    </div>
  );
}

/** Heart Catcher and the Memory Jar, behind one shortcut. */
export function HeartsApp({ win }: { win: WindowState }) {
  const [tab, setTab] = useState<Tab>('game');
  const idBase = `hearts-${win.id.replace(/\W/g, '')}`;
  return (
    <div className="app-fill app-pad">
      <Tabs
        idBase={idBase}
        label="Heart Catcher"
        value={tab}
        onChange={setTab}
        tabs={[
          { id: 'game', label: 'Heart Catcher' },
          { id: 'jar', label: 'Memory Jar' },
        ]}
      />
      <div className="tab-panel" id={`${idBase}-panel`} role="tabpanel" aria-labelledby={`${idBase}-tab-${tab}`} style={{ display: 'flex', flexDirection: 'column' }}>
        {tab === 'game' ? <HeartCatcher /> : <MemoryJar />}
      </div>
    </div>
  );
}
