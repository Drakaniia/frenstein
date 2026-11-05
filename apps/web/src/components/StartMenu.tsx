import { useEffect, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';

import { CONTENT } from '@/data/content';
import { APPS, PROGRAM_APPS } from '@/os/apps';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import type { AppId, WindowPayload } from '@/os/types';
import { FloatingMenu } from './FloatingMenu';
import { Icon } from './Icon';

interface StartItemProps {
  icon: string;
  title: string;
  sub?: string;
  size?: 'large' | 'small';
  strong?: boolean;
  onSelect: () => void;
}

function StartItem({ icon, title, sub, size = 'small', strong, onSelect }: StartItemProps) {
  return (
    <button
      type="button"
      role="menuitem"
      className="start-item"
      data-size={size}
      data-strong={strong ? 'true' : undefined}
      onClick={onSelect}
    >
      <Icon name={icon} size={size === 'large' ? 32 : 24} />
      <span className="start-item-text">
        <span className="start-item-title">{title}</span>
        {sub ? <span className="start-item-sub">{sub}</span> : null}
      </span>
    </button>
  );
}

/**
 * The XP Start menu: the user's picture and name, pinned and recent
 * programs on the left, the "My …" places on the light-blue right, and
 * Log Off / Turn Off Computer along the bottom.
 */
export function StartMenu({ onClose }: { onClose: () => void }) {
  const { openApp, dispatch } = useOs();
  const ref = useRef<HTMLDivElement>(null);
  const allRef = useRef<HTMLButtonElement>(null);
  const [allPrograms, setAllPrograms] = useState<DOMRect | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const launch = (appId: AppId, payload?: WindowPayload) => {
    playSfx('navigate');
    openApp(appId, payload);
    closeRef.current();
  };

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('.start-item')?.focus();
    const onDown = (event: PointerEvent) => {
      const target = event.target as Element;
      if (ref.current?.contains(target)) return;
      if (target.closest?.('[data-start-button], .start-flyout')) return;
      closeRef.current();
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeRef.current();
      return;
    }
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? []);
    const index = items.indexOf(document.activeElement as HTMLElement);
    const next = items[(index + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
    next?.focus();
  };

  const openAll = () => {
    const rect = allRef.current?.getBoundingClientRect();
    if (rect) setAllPrograms(rect);
  };

  return (
    <div ref={ref} className="start-menu" role="menu" aria-label="Start menu" onKeyDown={onKeyDown}>
      <div className="start-head">
        <span className="start-avatar">
          <Icon name="avatar" size={44} />
        </span>
        <span className="start-name">{CONTENT.user.name}</span>
      </div>
      <div className="start-rule" aria-hidden />

      <div className="start-body">
        <div className="start-col">
          <StartItem icon="cake" title="Happy Birthday!" sub="Open your present" size="large" strong onSelect={() => launch('birthday')} />
          <StartItem icon="letter" title="Love Letter" sub="A letter, just for you" size="large" strong onSelect={() => launch('notepad')} />
          <div className="start-sep" role="separator" />
          <StartItem icon="pictures" title="My Pictures" sub={APPS.photos.description} size="large" onSelect={() => launch('photos')} />
          <StartItem icon="fienamp" title="Music" sub={APPS.music.description} size="large" onSelect={() => launch('music')} />
          <StartItem icon="game" title="Heart Catcher" sub={APPS.hearts.description} size="large" onSelect={() => launch('hearts')} />
          <div className="start-sep" role="separator" style={{ marginTop: 'auto' }} />
          <button
            ref={allRef}
            type="button"
            role="menuitem"
            className="start-item start-all"
            aria-haspopup="menu"
            aria-expanded={allPrograms !== null}
            data-highlight={allPrograms ? 'true' : undefined}
            onClick={openAll}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                openAll();
              }
            }}
          >
            All Programs
            <span className="start-all-arrow" aria-hidden>
              ▶
            </span>
          </button>
        </div>

        <div className="start-col start-right">
          <StartItem icon="documents" title="My Documents" strong onSelect={() => launch('mydocuments')} />
          <StartItem icon="pictures" title="My Pictures" strong onSelect={() => launch('photos')} />
          <StartItem icon="music-folder" title="My Music" strong onSelect={() => launch('music')} />
          <StartItem icon="computer" title="My Computer" strong onSelect={() => launch('mycomputer')} />
          <div className="start-sep" role="separator" />
          <StartItem icon="control" title="Control Panel" onSelect={() => launch('settings')} />
          <StartItem icon="display" title="Display" onSelect={() => launch('settings', 'desktop')} />
          <div className="start-sep" role="separator" />
          <StartItem icon="help" title="Help and Support" onSelect={() => launch('help')} />
          <StartItem icon="run" title="Run..." onSelect={() => launch('run')} />
        </div>
      </div>

      <div className="start-foot">
        <button
          type="button"
          role="menuitem"
          className="start-foot-btn"
          onClick={() => {
            playSfx('click');
            dispatch({ type: 'OPEN_DIALOG', action: 'logoff' });
          }}
        >
          <Icon name="logoff" size={22} />
          Log Off
        </button>
        <button
          type="button"
          role="menuitem"
          className="start-foot-btn"
          onClick={() => {
            playSfx('click');
            dispatch({ type: 'OPEN_DIALOG', action: 'shutdown' });
          }}
        >
          <Icon name="power" size={22} />
          Turn Off Computer
        </button>
      </div>

      {allPrograms ? (
        <FloatingMenu
          anchor={allPrograms}
          placement="right"
          label="All Programs"
          className="start-flyout"
          autoFocus
          keepOpenWithin={ref}
          onClose={() => setAllPrograms(null)}
        >
          {PROGRAM_APPS.map((appId) => (
            <button key={appId} type="button" role="menuitem" className="start-item" onClick={() => launch(appId)}>
              <Icon name={APPS[appId].icon} size={16} />
              <span className="start-item-title">{APPS[appId].label}</span>
            </button>
          ))}
          <div className="menu-sep" role="separator" />
          <button type="button" role="menuitem" className="start-item" onClick={() => launch('screensaver')}>
            <Icon name="saver" size={16} />
            <span className="start-item-title">Screen Saver</span>
          </button>
          <button type="button" role="menuitem" className="start-item" onClick={() => launch('about')}>
            <Icon name="info" size={16} />
            <span className="start-item-title">About {CONTENT.osName}</span>
          </button>
        </FloatingMenu>
      ) : null}
    </div>
  );
}
