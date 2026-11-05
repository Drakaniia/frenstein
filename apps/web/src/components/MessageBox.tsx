import { useEffect, useId, useRef } from 'react';
import type { CSSProperties, ReactNode } from 'react';

import type { MessageIcon } from '@/os/types';
import { Button } from './controls';
import { Glyph } from './Glyph';
import { Icon } from './Icon';

export interface MessageButton {
  label: string;
  onClick: () => void;
  isDefault?: boolean;
}

const ICONS: Record<MessageIcon, string> = {
  info: 'info',
  warning: 'msg-warning',
  error: 'msg-error',
  question: 'help',
  heart: 'heart',
};

interface MessageBoxProps {
  title: string;
  icon?: MessageIcon | null;
  /** Any registry icon instead of a standard message icon. */
  iconName?: string;
  children: ReactNode;
  buttons: MessageButton[];
  onClose: () => void;
  width?: number;
  /** `window` dims only the owning app; `none` renders the bare box. */
  veil?: 'window' | 'none';
  style?: CSSProperties;
}

/**
 * An XP message box: caption with a close button, a 32 px icon, the
 * message, and centred push buttons. Traps focus, Esc closes, Enter fires
 * the default button, and focus returns to where it was on close.
 */
export function MessageBox({ title, icon = 'info', iconName, children, buttons, onClose, width = 340, veil = 'window', style }: MessageBoxProps) {
  const ref = useRef<HTMLDivElement>(null);
  const opener = useRef<HTMLElement | null>(null);
  const titleId = useId();
  const bodyId = useId();
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const target =
      ref.current?.querySelector<HTMLElement>('[data-autofocus="true"]') ??
      ref.current?.querySelector<HTMLButtonElement>('.msgbox-actions button[data-default="true"]') ??
      ref.current?.querySelector<HTMLButtonElement>('.msgbox-actions button');
    target?.focus();
    return () => opener.current?.focus?.();
  }, []);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      closeRef.current();
      return;
    }
    if (e.key === 'Enter' && !(document.activeElement instanceof HTMLButtonElement) && !(document.activeElement instanceof HTMLTextAreaElement)) {
      const def = buttons.find((b) => b.isDefault) ?? buttons[0];
      if (def) {
        e.preventDefault();
        def.onClick();
      }
      return;
    }
    if (e.key === 'Tab') {
      const nodes = Array.from(
        ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select, textarea, [tabindex]:not([tabindex="-1"])') ?? []
      );
      if (nodes.length === 0) return;
      const first = nodes[0] as HTMLElement;
      const last = nodes[nodes.length - 1] as HTMLElement;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  const box = (
    <div
      ref={ref}
      className="msgbox"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={bodyId}
      style={{ width, ...style }}
      onKeyDown={onKeyDown}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="title-bar">
        <span className="title-bar-text" id={titleId}>
          {title}
        </span>
        <div className="title-bar-controls">
          <button type="button" className="cap-btn" data-kind="close" aria-label="Close" onClick={() => closeRef.current()}>
            <Glyph name="close" />
          </button>
        </div>
      </div>
      <div className="msgbox-body">
        {iconName || icon ? <Icon name={iconName ?? ICONS[icon as MessageIcon]} size={32} /> : null}
        <div id={bodyId} style={{ flex: 1, minWidth: 0 }}>
          {children}
        </div>
      </div>
      <div className="msgbox-actions">
        {buttons.map((b) => (
          <Button key={b.label} isDefault={b.isDefault} onClick={b.onClick}>
            {b.label}
          </Button>
        ))}
      </div>
    </div>
  );

  if (veil === 'none') return box;
  return (
    <div className="window-veil" onPointerDown={(e) => e.stopPropagation()}>
      {box}
    </div>
  );
}
