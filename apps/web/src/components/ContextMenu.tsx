import { Fragment } from 'react';

import { FloatingMenu, MenuDivider, MenuEntry } from './FloatingMenu';
import { Icon } from './Icon';

export interface ContextMenuItem {
  id: string;
  label?: string;
  onSelect?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  checked?: boolean;
  accelerator?: string;
  separator?: boolean;
  bold?: boolean;
  icon?: string;
}

interface ContextMenuProps {
  /** Where the menu was requested, in viewport (client) px. */
  clientX: number;
  clientY: number;
  items: ContextMenuItem[];
  label: string;
  onClose: () => void;
  /** Opened from the keyboard: focus the first item. */
  keyboard?: boolean;
}

/** A pointer-positioned XP menu that stays on screen and works by keyboard. */
export function ContextMenu({ clientX, clientY, items, label, onClose, keyboard }: ContextMenuProps) {
  return (
    <FloatingMenu
      anchor={{ left: clientX, top: clientY, right: clientX, bottom: clientY }}
      placement="at"
      label={label}
      onClose={onClose}
      autoFocus={keyboard ?? true}
    >
      {items.map((item) => (
        <Fragment key={item.id}>
          {item.separator ? (
            <MenuDivider />
          ) : (
            <MenuEntry
              disabled={item.disabled}
              disabledReason={item.disabledReason}
              checked={item.checked}
              accelerator={item.accelerator}
              bold={item.bold}
              icon={item.icon ? <Icon name={item.icon} size={16} /> : undefined}
              onSelect={() => {
                onClose();
                item.onSelect?.();
              }}
            >
              {item.label}
            </MenuEntry>
          )}
        </Fragment>
      ))}
    </FloatingMenu>
  );
}
