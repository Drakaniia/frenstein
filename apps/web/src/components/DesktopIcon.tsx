import type { MouseEvent } from 'react';

import { iconUrl } from '@/lib/icons';
import { APPS } from '@/os/apps';
import type { AppId } from '@/os/types';
import { Icon } from './Icon';

interface DesktopIconProps {
  appId: AppId;
  icon: string;
  selected: boolean;
  focused: boolean;
  size: number;
  showLabel: boolean;
  coarse: boolean;
  pulse?: boolean;
  onSelect: () => void;
  onOpen: () => void;
  onContextMenu: (event: MouseEvent<HTMLButtonElement>) => void;
}

/**
 * One desktop shortcut: click selects (the icon takes the blue selection
 * tint, the label the blue highlight), double-click or Enter opens, and a
 * single tap opens on touch screens.
 */
export function DesktopIcon({ appId, icon, selected, focused, size, showLabel, coarse, pulse, onSelect, onOpen, onContextMenu }: DesktopIconProps) {
  const label = APPS[appId].shortcut;
  const mask = `url(${iconUrl(icon, 1)})`;
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      aria-label={label}
      tabIndex={focused ? 0 : -1}
      className="icon-cell"
      data-pulse={pulse ? 'true' : undefined}
      onClick={() => {
        onSelect();
        if (coarse) onOpen();
      }}
      onDoubleClick={() => {
        if (!coarse) onOpen();
      }}
      onContextMenu={onContextMenu}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      <span className="icon-art">
        <Icon name={icon} size={size} />
        <span className="icon-tint" style={{ maskImage: mask, WebkitMaskImage: mask }} aria-hidden />
      </span>
      {showLabel ? <span className="icon-label">{label}</span> : null}
    </button>
  );
}
