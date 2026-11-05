import { useState } from 'react';
import type { KeyboardEvent } from 'react';

import { StatusBar, StatusField, TaskBox, TaskLink, TaskPane, ToolButton, ToolSeparator } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { Menu, MenuBar, MenuItem, MenuSeparator } from '@/components/MenuBar';
import { CONTENT } from '@/data/content';
import { PHOTOS } from '@/data/photos';
import { useOs } from '@/os/OsProvider';
import { useStage } from '@/os/StageContext';
import { useCoarsePointer } from '@/os/useMedia';
import type { WindowState } from '@/os/types';

/** My Pictures in Thumbnails view, with the XP "Picture Tasks" pane. */
export function PhotosApp({ win }: { win: WindowState }) {
  const { openApp, dispatch } = useOs();
  const { compact } = useStage();
  const coarse = useCoarsePointer();
  const [selected, setSelected] = useState(-1);

  const open = (index: number) => {
    if (PHOTOS[index]) openApp('viewer', index);
  };
  const slideshow = () => dispatch({ type: 'SCREENSAVER', open: true, mode: 'slideshow', start: Math.max(0, selected) });
  const current = PHOTOS[selected];

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const cols = Math.max(1, Math.floor((e.currentTarget.clientWidth - 24) / 110));
    const move = (delta: number) => {
      e.preventDefault();
      const next = Math.max(0, Math.min(PHOTOS.length - 1, (selected < 0 ? 0 : selected) + delta));
      setSelected(next);
      e.currentTarget.querySelectorAll<HTMLElement>('.thumb')[next]?.scrollIntoView({ block: 'nearest' });
    };
    if (e.key === 'ArrowRight') move(selected < 0 ? 0 : 1);
    else if (e.key === 'ArrowLeft') move(-1);
    else if (e.key === 'ArrowDown') move(selected < 0 ? 0 : cols);
    else if (e.key === 'ArrowUp') move(-cols);
    else if (e.key === 'Enter' && selected >= 0) {
      e.preventDefault();
      open(selected);
    }
  };

  return (
    <>
      <MenuBar>
        <Menu label="File">
          <MenuItem disabled={!current} onSelect={() => open(selected)}>
            Open
          </MenuItem>
          <MenuItem onSelect={slideshow}>View as Slide Show</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => dispatch({ type: 'CLOSE_WINDOW', id: win.id })}>Close</MenuItem>
        </Menu>
        <Menu label="View">
          <MenuItem checked>Thumbnails</MenuItem>
        </Menu>
        <Menu label="Help">
          <MenuItem onSelect={() => openApp('help')}>Help and Support Center</MenuItem>
        </Menu>
      </MenuBar>

      <div className="xp-toolbar" role="toolbar" aria-label="Standard Buttons">
        <ToolButton icon="tb-up" text={compact ? undefined : 'My Documents'} label="Up to My Documents" onClick={() => openApp('mydocuments')} />
        <ToolSeparator />
        <ToolButton icon="pv-slideshow" text={compact ? undefined : 'Slide Show'} label="View as a slide show" onClick={slideshow} />
      </div>

      <div className="explorer">
        {!compact ? (
          <TaskPane>
            <TaskBox title="Picture Tasks">
              <TaskLink icon="pv-slideshow" onClick={slideshow}>
                View as a slide show
              </TaskLink>
              <TaskLink icon="photo" disabled={!current} onClick={() => open(selected)}>
                Open this picture
              </TaskLink>
            </TaskBox>
            <TaskBox title="Other Places">
              <TaskLink icon="documents" onClick={() => openApp('mydocuments')}>
                My Documents
              </TaskLink>
              <TaskLink icon="computer" onClick={() => openApp('mycomputer')}>
                My Computer
              </TaskLink>
            </TaskBox>
            <TaskBox title="Details">
              <div className="tp-detail">
                <strong>{current ? current.filename : 'My Pictures'}</strong>
                {current ? current.caption || current.alt : `${PHOTOS.length} pictures of us`}
              </div>
            </TaskBox>
          </TaskPane>
        ) : null}

        <div
          className="explorer-main"
          role="listbox"
          aria-label="My Pictures"
          tabIndex={0}
          onKeyDown={onKeyDown}
          onPointerDown={(e) => {
            if (e.target === e.currentTarget) setSelected(-1);
          }}
        >
          {PHOTOS.length === 0 ? (
            <div className="empty-note">
              <Icon name="pictures" size={48} />
              <span>No pictures yet. Add some to the album to see them here.</span>
            </div>
          ) : (
            <div className="thumbs">
              {PHOTOS.map((photo, i) => (
                <button
                  key={photo.filename}
                  type="button"
                  role="option"
                  aria-selected={i === selected}
                  aria-label={`${photo.filename}, ${photo.caption || photo.alt}`}
                  className="thumb"
                  tabIndex={-1}
                  onClick={() => {
                    setSelected(i);
                    if (coarse) open(i);
                  }}
                  onDoubleClick={() => {
                    if (!coarse) open(i);
                  }}
                >
                  <span className="thumb-frame">
                    <img src={photo.src} alt="" loading="lazy" draggable={false} />
                  </span>
                  <span className="thumb-label">{photo.filename}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <StatusBar>
        <StatusField>{current ? `${current.filename} · ${current.caption || current.alt}` : `${PHOTOS.length} objects`}</StatusField>
        <StatusField grow={false} style={{ minWidth: 120 }}>
          {CONTENT.photosFreeSpace}
        </StatusField>
      </StatusBar>
    </>
  );
}
