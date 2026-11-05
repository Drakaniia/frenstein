import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { ContextMenu } from '@/components/ContextMenu';
import { StatusBar, StatusField, TaskBox, TaskLink, TaskPane, ToolButton, ToolSeparator } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Menu, MenuBar, MenuItem, MenuSeparator } from '@/components/MenuBar';
import { CONTENT } from '@/data/content';
import { addressFor, findPath, FS_ROOT, resolvePath, type FsGroup, type FsNode } from '@/data/files';
import { requestDocument } from '@/os/documents';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { useCoarsePointer } from '@/os/useMedia';
import type { WindowState } from '@/os/types';

type View = 'tiles' | 'icons' | 'details';
type SortKey = 'name' | 'type' | 'size';

const GROUP_TITLES: Record<FsGroup, string> = {
  files: 'Files Stored on This Computer',
  drives: 'Hard Disk Drives',
  removable: 'Devices with Removable Storage',
};

function sizeValue(size: string): number {
  const n = parseFloat(size.replace(/,/g, ''));
  if (!Number.isFinite(n)) return -1;
  if (/GB/i.test(size)) return n * 1e6;
  if (/MB/i.test(size)) return n * 1e3;
  return n;
}

/**
 * Windows Explorer over the virtual file system: Back/Forward/Up, an
 * address bar, the blue task pane, Tiles/Icons/Details views, sorting, and
 * opening files in the right program.
 */
export function ExplorerApp({ win, home }: { win: WindowState; home: string[] }) {
  const { dispatch, openApp, message } = useOs();
  const { compact } = useStage();
  const coarse = useCoarsePointer();
  const [history, setHistory] = useState<string[][]>(() => [initialPath(win, home)]);
  const [cursor, setCursor] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<View>('tiles');
  const [sort, setSort] = useState<{ key: SortKey; asc: boolean }>({ key: 'name', asc: true });
  const [menu, setMenu] = useState<{ x: number; y: number; node: FsNode } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const path = history[cursor] ?? [];
  const stack = useMemo(() => resolvePath(path), [path]);
  const folder = stack[stack.length - 1] ?? FS_ROOT;
  const atRoot = folder.id === FS_ROOT.id;

  // Re-opening with a payload (e.g. Run → "c:") navigates there.
  const payloadRev = useRef(win.payloadRev);
  useEffect(() => {
    if (payloadRev.current === win.payloadRev) return;
    payloadRev.current = win.payloadRev;
    go(initialPath(win, home));
  });

  useEffect(() => {
    dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: folder.name });
  }, [dispatch, win.id, folder.name]);

  const entries = useMemo(() => {
    const list = [...(folder.children ?? [])];
    if (atRoot) return list;
    const dir = sort.asc ? 1 : -1;
    return list.sort((a, b) => {
      const af = a.kind === 'folder' || a.kind === 'drive' || a.type === 'File Folder';
      const bf = b.kind === 'folder' || b.kind === 'drive' || b.type === 'File Folder';
      if (af !== bf) return af ? -1 : 1;
      if (sort.key === 'size') return (sizeValue(a.size) - sizeValue(b.size)) * dir;
      return a[sort.key].localeCompare(b[sort.key]) * dir;
    });
  }, [folder, atRoot, sort]);

  const selectedNode = entries.find((n) => n.id === selected) ?? null;

  function go(next: string[]) {
    playSfx('navigate');
    setHistory((h) => [...h.slice(0, cursor + 1), next]);
    setCursor((c) => c + 1);
    setSelected(null);
  }

  const back = () => {
    if (cursor === 0) return;
    playSfx('navigate');
    setCursor((c) => c - 1);
    setSelected(null);
  };
  const forward = () => {
    if (cursor >= history.length - 1) return;
    playSfx('navigate');
    setCursor((c) => c + 1);
    setSelected(null);
  };
  const up = () => {
    if (path.length > 0) go(path.slice(0, -1));
  };

  const open = (node: FsNode) => {
    if (node.alert) {
      playSfx(node.alert.icon === 'warning' || node.alert.icon === 'error' ? 'exclamation' : 'ding');
      message({ title: node.alert.title, message: node.alert.message, icon: node.alert.icon });
      return;
    }
    if (node.children) {
      go([...path, node.id]);
      return;
    }
    if (node.document) {
      requestDocument(node.document);
      openApp('notepad');
      return;
    }
    if (node.app) openApp(node.app, node.payload);
  };

  const onListKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (entries.length === 0) return;
    const index = entries.findIndex((n) => n.id === selected);
    const pick = (i: number) => {
      const node = entries[Math.max(0, Math.min(entries.length - 1, i))];
      if (!node) return;
      setSelected(node.id);
      listRef.current?.querySelector<HTMLElement>(`[data-id="${CSS.escape(node.id)}"]`)?.scrollIntoView({ block: 'nearest' });
    };
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      pick(index + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      pick(index < 0 ? 0 : index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      pick(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      pick(entries.length - 1);
    } else if (e.key === 'Enter' && selectedNode) {
      e.preventDefault();
      open(selectedNode);
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      up();
    }
  };

  const itemProps = (node: FsNode) => ({
    'data-id': node.id,
    role: 'option' as const,
    'aria-selected': selected === node.id,
    onClick: () => {
      setSelected(node.id);
      if (coarse) open(node);
    },
    onDoubleClick: () => {
      if (!coarse) open(node);
    },
    onContextMenu: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setSelected(node.id);
      setMenu({ x: e.clientX, y: e.clientY, node });
    },
  });

  const metaFor = (node: FsNode) => {
    if (node.usage) return `${node.usage.free} free of ${node.usage.total}`;
    if (node.kind === 'file') return [node.type, node.size].filter(Boolean).join(', ');
    return node.type;
  };

  const tile = (node: FsNode) => (
    <button key={node.id} type="button" className="tile" {...itemProps(node)}>
      <Icon name={node.icon} size={view === 'icons' ? 32 : 48} />
      <span className="tile-text">
        <span className="tile-name">{node.name}</span>
        {view === 'tiles' ? <span className="tile-meta">{metaFor(node)}</span> : null}
        {view === 'tiles' && node.usage ? (
          <span className="drive-bar" aria-hidden>
            <i style={{ width: `${node.usage.percent}%` }} />
          </span>
        ) : null}
      </span>
    </button>
  );

  const sortBy = (key: SortKey) => setSort((s) => ({ key, asc: s.key === key ? !s.asc : true }));
  const arrow = (key: SortKey) => (sort.key === key ? (sort.asc ? ' ▲' : ' ▼') : '');
  const columns = '1fr 132px 74px';

  const content = (() => {
    if (entries.length === 0) {
      return (
        <div className="empty-note">
          <Icon name="folder" size={48} />
          <span>This folder is empty.</span>
        </div>
      );
    }
    if (atRoot) {
      return (['files', 'drives', 'removable'] as const).map((group) => {
        const nodes = entries.filter((n) => n.group === group);
        if (nodes.length === 0) return null;
        return (
          <section key={group} role="group" aria-label={GROUP_TITLES[group]}>
            <div className="xp-section">{GROUP_TITLES[group]}</div>
            <div className="tiles">{nodes.map(tile)}</div>
          </section>
        );
      });
    }
    if (view === 'details') {
      return (
        <div>
          <div className="lv-head" style={{ gridTemplateColumns: columns }}>
            <button type="button" onClick={() => sortBy('name')}>
              Name{arrow('name')}
            </button>
            <button type="button" onClick={() => sortBy('type')}>
              Type{arrow('type')}
            </button>
            <button type="button" onClick={() => sortBy('size')} style={{ justifyContent: 'flex-end' }}>
              Size{arrow('size')}
            </button>
          </div>
          {entries.map((node) => (
            <div key={node.id} className="lv-row" style={{ gridTemplateColumns: columns }} {...itemProps(node)}>
              <span>
                <Icon name={node.icon} size={16} />
                {node.name}
              </span>
              <span className="muted">{node.type}</span>
              <span className="muted" style={{ justifyContent: 'flex-end' }}>
                {node.size}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return <div className={view === 'icons' ? 'icons-view' : 'tiles'}>{entries.map(tile)}</div>;
  })();

  const parent = stack.length > 1 ? (stack[stack.length - 2] as FsNode) : null;
  const inPhotos = folder.id === 'drive-d';

  return (
    <>
      <MenuBar>
        <Menu label="File">
          <MenuItem disabled={!selectedNode} onSelect={() => selectedNode && open(selectedNode)}>
            Open
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => dispatch({ type: 'CLOSE_WINDOW', id: win.id })}>Close</MenuItem>
        </Menu>
        <Menu label="Edit">
          <MenuItem disabled disabledReason="These files are a gift; they cannot be cut.">
            Cut
          </MenuItem>
          <MenuItem disabled disabledReason="Copy them into your heart instead.">
            Copy
          </MenuItem>
        </Menu>
        <Menu label="View">
          <MenuItem checked={view === 'tiles'} onSelect={() => setView('tiles')}>
            Tiles
          </MenuItem>
          <MenuItem checked={view === 'icons'} onSelect={() => setView('icons')}>
            Icons
          </MenuItem>
          <MenuItem checked={view === 'details'} onSelect={() => setView('details')}>
            Details
          </MenuItem>
          <MenuSeparator />
          <MenuItem disabled={atRoot} onSelect={() => sortBy('name')}>
            Arrange by Name
          </MenuItem>
          <MenuItem disabled={atRoot} onSelect={() => sortBy('type')}>
            Arrange by Type
          </MenuItem>
        </Menu>
        <Menu label="Go">
          <MenuItem disabled={cursor === 0} onSelect={back}>
            Back
          </MenuItem>
          <MenuItem disabled={cursor >= history.length - 1} onSelect={forward}>
            Forward
          </MenuItem>
          <MenuItem disabled={path.length === 0} onSelect={up}>
            Up One Level
          </MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => go([])}>My Computer</MenuItem>
          <MenuItem onSelect={() => go(['documents'])}>My Documents</MenuItem>
        </Menu>
        <Menu label="Help">
          <MenuItem onSelect={() => openApp('help')}>Help and Support Center</MenuItem>
          <MenuItem onSelect={() => dispatch({ type: 'OPEN_DIALOG', action: 'about' })}>About {CONTENT.osName}</MenuItem>
        </Menu>
      </MenuBar>

      <div className="xp-toolbar" role="toolbar" aria-label="Standard Buttons">
        <ToolButton icon="tb-back" text={compact ? undefined : 'Back'} label="Back" disabled={cursor === 0} onClick={back} />
        <ToolButton icon="tb-forward" label="Forward" disabled={cursor >= history.length - 1} onClick={forward} />
        <ToolButton icon="tb-up" label="Up" disabled={path.length === 0} onClick={up} />
        <ToolSeparator />
        <ToolButton icon="tb-views" text={compact ? undefined : 'Views'} label="Change view" onClick={() => setView((v) => (v === 'tiles' ? 'icons' : v === 'icons' ? 'details' : 'tiles'))} />
      </div>

      <div className="addr-bar">
        <span className="addr-label">Address</span>
        <div className="addr-box">
          <Icon name={folder.icon} size={16} />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{addressFor(stack)}</span>
        </div>
        {!compact ? (
          <button type="button" className="go-btn" onClick={() => go(path)}>
            <Icon name="tb-go" size={16} />
            Go
          </button>
        ) : null}
      </div>

      <div className="explorer">
        {!compact ? (
          <TaskPane>
            {atRoot ? (
              <TaskBox title="System Tasks">
                <TaskLink icon="info" onClick={() => dispatch({ type: 'OPEN_DIALOG', action: 'about' })}>
                  View system information
                </TaskLink>
                <TaskLink icon="control" onClick={() => openApp('settings')}>
                  Change a setting
                </TaskLink>
              </TaskBox>
            ) : (
              <TaskBox title="File and Folder Tasks">
                {selectedNode ? (
                  <TaskLink icon={selectedNode.icon} onClick={() => open(selectedNode)}>
                    Open {selectedNode.name}
                  </TaskLink>
                ) : (
                  <span className="tp-detail">Select an item to see what you can do with it.</span>
                )}
                {inPhotos ? (
                  <TaskLink icon="pv-slideshow" onClick={() => dispatch({ type: 'SCREENSAVER', open: true, mode: 'slideshow' })}>
                    View as a slide show
                  </TaskLink>
                ) : null}
              </TaskBox>
            )}
            <TaskBox title="Other Places">
              {parent && parent.id !== FS_ROOT.id ? (
                <TaskLink icon={parent.icon} onClick={up}>
                  {parent.name}
                </TaskLink>
              ) : null}
              {!atRoot ? (
                <TaskLink icon="computer" onClick={() => go([])}>
                  My Computer
                </TaskLink>
              ) : null}
              {folder.id !== 'documents' ? (
                <TaskLink icon="documents" onClick={() => go(['documents'])}>
                  My Documents
                </TaskLink>
              ) : null}
              {folder.id !== 'shared' ? (
                <TaskLink icon="folder" onClick={() => go(['shared'])}>
                  Shared Documents
                </TaskLink>
              ) : null}
              <TaskLink icon="bin-full" onClick={() => openApp('trash')}>
                Recycle Bin
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <div className="tp-detail">
                <strong>{selectedNode?.name ?? folder.name}</strong>
                {selectedNode ? metaFor(selectedNode) : folder.type}
                {selectedNode?.modified ? <div>Date Modified: {selectedNode.modified}</div> : null}
              </div>
            </TaskBox>
          </TaskPane>
        ) : null}

        <div
          ref={listRef}
          className="explorer-main"
          role="listbox"
          aria-label={`${folder.name} contents`}
          tabIndex={0}
          onKeyDown={onListKey}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          {content}
        </div>
      </div>

      <StatusBar>
        <StatusField>{selectedNode ? `Type: ${selectedNode.type}${selectedNode.size ? ` Size: ${selectedNode.size}` : ''}` : `${entries.length} objects`}</StatusField>
        <StatusField grow={false} style={{ minWidth: 110 }}>
          <Icon name="computer" size={16} />
          My Computer
        </StatusField>
      </StatusBar>

      {menu ? (
        <ContextMenu
          clientX={menu.x}
          clientY={menu.y}
          label={`${menu.node.name} menu`}
          onClose={() => setMenu(null)}
          items={[
            { id: 'open', label: menu.node.children ? 'Explore' : 'Open', bold: true, onSelect: () => open(menu.node) },
            { id: 's', separator: true },
            {
              id: 'props',
              label: 'Properties',
              onSelect: () =>
                message({
                  title: `${menu.node.name} Properties`,
                  icon: 'info',
                  message: [menu.node.name, `Type: ${menu.node.type}`, menu.node.size ? `Size: ${menu.node.size}` : '', menu.node.usage ? `Free space: ${menu.node.usage.free}` : '']
                    .filter(Boolean)
                    .join('\n'),
                }),
            },
          ]}
        />
      ) : null}
    </>
  );
}

function initialPath(win: WindowState, home: string[]): string[] {
  if (typeof win.payload === 'string') {
    const path = findPath(FS_ROOT, win.payload);
    if (path) return path;
  }
  return home;
}
