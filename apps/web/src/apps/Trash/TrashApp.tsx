import { useState } from 'react';

import { StatusBar, StatusField, TaskBox, TaskLink, TaskPane } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Menu, MenuBar, MenuItem, MenuSeparator } from '@/components/MenuBar';
import { MessageBox } from '@/components/MessageBox';
import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import type { WindowState } from '@/os/types';
import { trashStore, UNRESTORABLE, useTrash, type TrashItem } from './store';

type Confirm = { kind: 'empty' } | { kind: 'delete'; item: TrashItem } | { kind: 'refuse'; item: TrashItem } | null;

/**
 * The Recycle Bin. The things inside were thrown away on purpose: they
 * politely refuse to be restored, but can be deleted for good.
 */
export function TrashApp({ win }: { win: WindowState }) {
  const { dispatch, notify } = useOs();
  const { compact } = useStage();
  const items = useTrash();
  const [selected, setSelected] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const current = items.find((i) => i.id === selected) ?? null;
  const columns = compact ? '1fr 70px' : '1fr 130px 82px 60px';

  const restore = (item: TrashItem) => {
    if (UNRESTORABLE.has(item.id)) {
      playSfx('exclamation');
      setConfirm({ kind: 'refuse', item });
      return;
    }
    trashStore.set(items.filter((i) => i.id !== item.id));
    setSelected(null);
  };

  const remove = (item: TrashItem) => {
    playSfx('recycle');
    trashStore.set(items.filter((i) => i.id !== item.id));
    setSelected(null);
    setConfirm(null);
    notify({ title: 'Deleted for good', body: `${item.name} is gone. Good riddance.`, icon: 'bin' });
  };

  const empty = () => {
    playSfx('recycle');
    trashStore.set([]);
    setSelected(null);
    setConfirm(null);
    notify({ title: 'Recycle Bin emptied', body: CONTENT.trashEmptyLine, icon: 'bin' });
  };

  return (
    <>
      <MenuBar>
        <Menu label="File">
          <MenuItem disabled={!current} onSelect={() => current && restore(current)}>
            Restore
          </MenuItem>
          <MenuItem disabled={!current} onSelect={() => current && setConfirm({ kind: 'delete', item: current })}>
            Delete
          </MenuItem>
          <MenuSeparator />
          <MenuItem disabled={items.length === 0} onSelect={() => setConfirm({ kind: 'empty' })}>
            Empty Recycle Bin
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => dispatch({ type: 'CLOSE_WINDOW', id: win.id })}>Close</MenuItem>
        </Menu>
        <Menu label="View">
          <MenuItem checked>Details</MenuItem>
        </Menu>
      </MenuBar>

      <div className="explorer">
        {!compact ? (
          <TaskPane>
            <TaskBox title="Recycle Bin Tasks">
              <TaskLink icon="bin" disabled={items.length === 0} onClick={() => setConfirm({ kind: 'empty' })}>
                Empty the Recycle Bin
              </TaskLink>
              <TaskLink icon="restart" disabled={!current} onClick={() => current && restore(current)}>
                Restore this item
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <div className="tp-detail">
                <strong>{current ? current.name : 'Recycle Bin'}</strong>
                {current ? `Deleted ${current.deleted} from ${current.from}` : `${items.length} item${items.length === 1 ? '' : 's'}`}
              </div>
            </TaskBox>
          </TaskPane>
        ) : null}

        <div
          className="explorer-main"
          role="listbox"
          aria-label="Recycle Bin contents"
          tabIndex={0}
          onKeyDown={(e) => {
            const index = items.findIndex((i) => i.id === selected);
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setSelected(items[Math.min(items.length - 1, index + 1)]?.id ?? null);
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setSelected(items[Math.max(0, index - 1)]?.id ?? null);
            } else if (e.key === 'Delete' && current) {
              e.preventDefault();
              setConfirm({ kind: 'delete', item: current });
            } else if (e.key === 'Enter' && current) {
              e.preventDefault();
              restore(current);
            }
          }}
        >
          {items.length === 0 ? (
            <div className="empty-note">
              <Icon name="bin" size={48} />
              <span>{CONTENT.trashEmptyLine}</span>
            </div>
          ) : (
            <div>
              <div className="lv-head" style={{ gridTemplateColumns: columns }}>
                <span>Name</span>
                {!compact ? <span>Original Location</span> : null}
                {!compact ? <span>Date Deleted</span> : null}
                <span style={{ justifyContent: 'flex-end' }}>Size</span>
              </div>
              {items.map((item) => (
                <div
                  key={item.id}
                  className="lv-row"
                  role="option"
                  aria-selected={selected === item.id}
                  style={{ gridTemplateColumns: columns }}
                  onClick={() => setSelected(item.id)}
                  onDoubleClick={() => restore(item)}
                >
                  <span>
                    <Icon name="txt" size={16} />
                    {item.name}
                  </span>
                  {!compact ? <span className="muted">{item.from}</span> : null}
                  {!compact ? <span className="muted">{item.deleted}</span> : null}
                  <span className="muted" style={{ justifyContent: 'flex-end' }}>
                    {item.size}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <StatusBar>
        <StatusField>{`${items.length} object${items.length === 1 ? '' : 's'}`}</StatusField>
      </StatusBar>

      {confirm?.kind === 'refuse' ? (
        <MessageBox title="Restore" icon="heart" onClose={() => setConfirm(null)} buttons={[
          { label: 'Delete it for good', isDefault: true, onClick: () => remove(confirm.item) },
          { label: 'Keep it in the bin', onClick: () => setConfirm(null) },
        ]}>
          <p>Cannot restore {confirm.item.name}.</p>
          <p style={{ margin: 0 }}>{CONTENT.trashRefusal}</p>
        </MessageBox>
      ) : null}
      {confirm?.kind === 'delete' ? (
        <MessageBox title="Confirm File Delete" icon="question" onClose={() => setConfirm(null)} buttons={[
          { label: 'Yes', isDefault: true, onClick: () => remove(confirm.item) },
          { label: 'No', onClick: () => setConfirm(null) },
        ]}>
          <p style={{ margin: 0 }}>Are you sure you want to permanently delete &apos;{confirm.item.name}&apos;?</p>
        </MessageBox>
      ) : null}
      {confirm?.kind === 'empty' ? (
        <MessageBox title="Confirm Multiple File Delete" icon="question" onClose={() => setConfirm(null)} buttons={[
          { label: 'Yes', isDefault: true, onClick: empty },
          { label: 'No', onClick: () => setConfirm(null) },
        ]}>
          <p style={{ margin: 0 }}>Are you sure you want to delete these {items.length} items? Spoiler: you will not miss them.</p>
        </MessageBox>
      ) : null}
    </>
  );
}
