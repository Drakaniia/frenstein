import { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode, RefObject } from 'react';

import { FloatingMenu } from './FloatingMenu';

export { MenuEntry as MenuItem, MenuDivider as MenuSeparator } from './FloatingMenu';

interface MenuCtxValue {
  open: string | null;
  setOpen: (id: string | null) => void;
  keyboard: boolean;
  setKeyboard: (v: boolean) => void;
  barRef: RefObject<HTMLDivElement | null>;
}

const MenuCtx = createContext<MenuCtxValue | null>(null);

/** The menu bar under a window caption (File, Edit, View, …). */
export function MenuBar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const [keyboard, setKeyboard] = useState(false);
  const barRef = useRef<HTMLDivElement>(null);
  return (
    <MenuCtx.Provider value={{ open, setOpen, keyboard, setKeyboard, barRef }}>
      <div role="menubar" className="menu-bar" ref={barRef}>
        {children}
      </div>
    </MenuCtx.Provider>
  );
}

/** A top-level menu and its drop-down. The first letter is the mnemonic. */
export function Menu({ label, children }: { label: string; children: ReactNode }) {
  const ctx = useContext(MenuCtx);
  const button = useRef<HTMLButtonElement>(null);
  const [anchor, setAnchor] = useState<DOMRect | null>(null);
  if (!ctx) throw new Error('<Menu> must be inside <MenuBar>');
  const isOpen = ctx.open === label;

  const openMenu = (keyboard: boolean) => {
    const rect = button.current?.getBoundingClientRect();
    if (!rect) return;
    setAnchor(rect);
    ctx.setKeyboard(keyboard);
    ctx.setOpen(label);
  };

  const sibling = (delta: number) => {
    const items = Array.from(ctx.barRef.current?.querySelectorAll<HTMLButtonElement>('.menu-bar-item') ?? []);
    const index = items.indexOf(button.current as HTMLButtonElement);
    const next = items[(index + delta + items.length) % items.length];
    next?.focus();
    if (ctx.open) next?.click();
  };

  return (
    <>
      <button
        ref={button}
        type="button"
        role="menuitem"
        className="menu-bar-item"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => (isOpen ? ctx.setOpen(null) : openMenu(false))}
        onPointerEnter={() => {
          if (ctx.open && ctx.open !== label) openMenu(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openMenu(true);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            sibling(1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            sibling(-1);
          }
        }}
      >
        <span>
          <span style={{ textDecoration: 'underline' }}>{label.slice(0, 1)}</span>
          {label.slice(1)}
        </span>
      </button>
      {isOpen && anchor ? (
        <FloatingMenu
          anchor={anchor}
          placement="below"
          label={label}
          autoFocus={ctx.keyboard}
          keepOpenWithin={ctx.barRef}
          onClose={() => ctx.setOpen(null)}
        >
          <div role="none" onClick={() => ctx.setOpen(null)}>
            {children}
          </div>
        </FloatingMenu>
      ) : null}
    </>
  );
}
