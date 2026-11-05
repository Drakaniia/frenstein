import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode, RefObject } from 'react';
import { createPortal } from 'react-dom';

import { cx } from '@/lib/cx';
import { useOs } from '@/os/OsProvider';
import { useStage } from '@/os/StageContext';
import { playSfx } from '@/os/sfx';

export interface ClientRectLike {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

interface FloatingMenuProps {
  /** Anchor in viewport (client) px — usually `element.getBoundingClientRect()`. */
  anchor: ClientRectLike;
  /** `below` drops down, `right` flies out, `at` opens at a point. */
  placement: 'below' | 'right' | 'at';
  label: string;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  /** Focus the first item when the menu opens (keyboard opening). */
  autoFocus?: boolean;
  /** Pointer presses inside this element do not close the menu. */
  keepOpenWithin?: RefObject<HTMLElement | null>;
}

/**
 * A popup menu rendered at the stage root, so it is never clipped by the
 * window it belongs to. It keeps itself on screen, closes on an outside
 * press or Escape, and supports arrow-key navigation.
 */
export function FloatingMenu({ anchor, placement, label, onClose, children, className, style, autoFocus, keepOpenWithin }: FloatingMenuProps) {
  const { stageRef, scale, stageW, stageH } = useStage();
  const { state } = useOs();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  // A menu left open when the screen saver starts must not float above it.
  useEffect(() => {
    if (state.screensaver) closeRef.current();
  }, [state.screensaver]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    const el = ref.current;
    if (!stage || !el) return;
    const s = stage.getBoundingClientRect();
    const toX = (v: number) => (v - s.left) / scale;
    const toY = (v: number) => (v - s.top) / scale;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    let x = placement === 'right' ? toX(anchor.right) - 2 : toX(anchor.left);
    let y = placement === 'below' ? toY(anchor.bottom) : placement === 'right' ? toY(anchor.top) - 3 : toY(anchor.top);
    if (x + w > stageW - 2) x = placement === 'right' ? toX(anchor.left) - w + 2 : stageW - w - 2;
    if (y + h > stageH - 2) y = placement === 'below' ? toY(anchor.top) - h : stageH - h - 2;
    setPos({ x: Math.max(2, Math.round(x)), y: Math.max(2, Math.round(y)) });
  }, [anchor.left, anchor.top, anchor.right, anchor.bottom, placement, scale, stageW, stageH, stageRef]);

  useEffect(() => {
    playSfx('menu');
    const onDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (ref.current?.contains(target)) return;
      if (keepOpenWithin?.current?.contains(target)) return;
      closeRef.current();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current();
      }
    };
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey, true);
    };
  }, [keepOpenWithin]);

  useEffect(() => {
    if (!autoFocus || !pos) return;
    ref.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)')?.focus();
  }, [autoFocus, pos]);

  const move = (delta: number | 'first' | 'last') => {
    const items = Array.from(ref.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled)') ?? []);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement as HTMLElement);
    let next = 0;
    if (delta === 'first') next = 0;
    else if (delta === 'last') next = items.length - 1;
    else next = current < 0 ? (delta > 0 ? 0 : items.length - 1) : (current + delta + items.length) % items.length;
    items[next]?.focus();
  };

  const stage = stageRef.current;
  if (!stage) return null;

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={label}
      className={cx('menu-popup', className)}
      style={{ left: pos?.x ?? -9999, top: pos?.y ?? -9999, visibility: pos ? 'visible' : 'hidden', zIndex: 'var(--z-start)', ...style }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          move(1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          move(-1);
        } else if (e.key === 'Home') {
          e.preventDefault();
          move('first');
        } else if (e.key === 'End') {
          e.preventDefault();
          move('last');
        } else if (e.key === 'Tab') {
          e.preventDefault();
          closeRef.current();
        }
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {children}
    </div>,
    stage
  );
}

interface MenuEntryProps {
  children: ReactNode;
  onSelect?: () => void;
  disabled?: boolean;
  disabledReason?: string;
  accelerator?: string;
  checked?: boolean;
  icon?: ReactNode;
  bold?: boolean;
  submenu?: boolean;
}

/** One row in a popup menu, with a gutter for a check mark or icon. */
export function MenuEntry({ children, onSelect, disabled, disabledReason, accelerator, checked, icon, bold, submenu }: MenuEntryProps) {
  return (
    <button
      type="button"
      role={checked === undefined ? 'menuitem' : 'menuitemcheckbox'}
      aria-checked={checked === undefined ? undefined : checked}
      className="menu-item"
      disabled={disabled}
      title={disabled ? disabledReason : undefined}
      aria-description={disabled ? disabledReason : undefined}
      onClick={() => {
        if (disabled) return;
        playSfx('click');
        onSelect?.();
      }}
      style={bold ? { fontWeight: 'bold' } : undefined}
    >
      <span className="menu-gutter" aria-hidden>
        {checked ? <CheckMark /> : icon}
      </span>
      <span>{children}</span>
      {accelerator ? <span className="menu-accel">{accelerator}</span> : null}
      {submenu ? <span className="menu-accel">▸</span> : null}
    </button>
  );
}

function CheckMark() {
  return (
    <svg width="7" height="7" viewBox="0 0 7 7" shapeRendering="crispEdges" aria-hidden focusable={false}>
      <path fill="currentColor" d="M6 0h1v1H6zM5 1h2v1H5zM0 2h1v1H0zM4 2h3v1H4zM0 3h2v1H0zM3 3h3v1H3zM0 4h5v1H0zM1 5h3v1H1zM2 6h1v1H2z" />
    </svg>
  );
}

export const MenuDivider = () => <div className="menu-sep" role="separator" />;
