import { useId, useState } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, KeyboardEvent, ReactNode } from 'react';

import { cx } from '@/lib/cx';
import { Glyph } from './Glyph';
import { Icon } from './Icon';

/* ── push button ──────────────────────────────────────────────────────── */

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** The default button wears the blue focus glow even when not focused. */
  isDefault?: boolean;
  small?: boolean;
  wide?: boolean;
  /** Explains why a disabled button is disabled (tooltip + description). */
  disabledReason?: string;
}

export function Button({ isDefault, small, wide, disabledReason, className, type, title, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      type={type ?? 'button'}
      className={cx('btn', small && 'btn-sm', wide && 'btn-wide', className)}
      data-default={isDefault ? 'true' : undefined}
      title={title ?? (rest.disabled ? disabledReason : undefined)}
      aria-description={rest.disabled ? disabledReason : undefined}
    />
  );
}

/* ── toolbar button ───────────────────────────────────────────────────── */

interface ToolButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: string;
  iconSize?: number;
  label?: string;
  /** Text shown next to the icon (XP "selective text on right"). */
  text?: string;
  pressed?: boolean;
}

export function ToolButton({ icon, iconSize = 24, label, text, pressed, className, ...rest }: ToolButtonProps) {
  return (
    <button
      {...rest}
      type="button"
      className={cx('tb-btn', className)}
      aria-label={label ?? text}
      title={label ?? text}
      aria-pressed={pressed}
    >
      <Icon name={icon} size={iconSize} />
      {text ? <span>{text}</span> : null}
    </button>
  );
}

export const ToolSeparator = () => <span className="tb-sep" aria-hidden />;

/* ── check box, radio button ──────────────────────────────────────────── */

interface CheckboxProps {
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  children?: ReactNode;
  ariaLabel?: string;
}

export function Checkbox({ checked, onChange, disabled, children, ariaLabel }: CheckboxProps) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} disabled={disabled} aria-label={ariaLabel} onChange={(e) => onChange(e.target.checked)} />
      <span className="box" aria-hidden />
      {children ? <span>{children}</span> : null}
    </label>
  );
}

interface RadioProps {
  name: string;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
  disabled?: boolean;
  children?: ReactNode;
}

export function Radio({ name, value, checked, onChange, disabled, children }: RadioProps) {
  return (
    <label className="radio">
      <input type="radio" name={name} value={value} checked={checked} disabled={disabled} onChange={() => onChange(value)} />
      <span className="box" aria-hidden />
      {children ? <span>{children}</span> : null}
    </label>
  );
}

/* ── trackbar ─────────────────────────────────────────────────────────── */

interface RangeProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  ariaLabel: string;
  disabled?: boolean;
  width?: number;
  className?: string;
  style?: CSSProperties;
}

export function Range({ value, onChange, min = 0, max = 100, step = 1, ariaLabel, disabled, width, className, style }: RangeProps) {
  return (
    <input
      type="range"
      className={cx('range', className)}
      min={min}
      max={max}
      step={step}
      value={value}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{ width, ...style }}
    />
  );
}

/* ── group box ────────────────────────────────────────────────────────── */

export function Group({ label, children, style }: { label: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <fieldset className="group" style={style}>
      <legend>{label}</legend>
      {children}
    </fieldset>
  );
}

/* ── tabs ─────────────────────────────────────────────────────────────── */

export interface TabDef<T extends string> {
  id: T;
  label: string;
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  label,
  idBase,
}: {
  tabs: ReadonlyArray<TabDef<T>>;
  value: T;
  onChange: (id: T) => void;
  label: string;
  idBase: string;
}) {
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft' && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault();
    const index = tabs.findIndex((t) => t.id === value);
    let next = index;
    if (e.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (e.key === 'ArrowLeft') next = (index - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') next = 0;
    if (e.key === 'End') next = tabs.length - 1;
    const tab = tabs[next];
    if (!tab) return;
    onChange(tab.id);
    requestAnimationFrame(() => document.getElementById(`${idBase}-tab-${tab.id}`)?.focus());
  };
  return (
    <div className="tabs" role="tablist" aria-label={label} onKeyDown={onKeyDown}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          id={`${idBase}-tab-${tab.id}`}
          type="button"
          role="tab"
          className="tab"
          aria-selected={tab.id === value}
          aria-controls={`${idBase}-panel`}
          tabIndex={tab.id === value ? 0 : -1}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/* ── status bar, progress ─────────────────────────────────────────────── */

export function StatusBar({ children, grip = true }: { children: ReactNode; grip?: boolean }) {
  return (
    <div className="status-bar" role="group" aria-label="Status">
      {children}
      {grip ? <span className="status-grip" aria-hidden /> : null}
    </div>
  );
}

export function StatusField({ children, style, grow = true }: { children: ReactNode; style?: CSSProperties; grow?: boolean }) {
  return (
    <div className="status-field" style={{ flex: grow ? '1 1 auto' : '0 0 auto', ...style }}>
      {children}
    </div>
  );
}

export function Progress({ value, max = 1, ariaLabel, width, style }: { value: number; max?: number; ariaLabel: string; width?: number; style?: CSSProperties }) {
  const pct = max > 0 ? Math.max(0, Math.min(1, value / max)) : 0;
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct * 100)}
      style={{ width, ...style }}
    >
      <i style={{ width: `${pct * 100}%` }} />
    </div>
  );
}

/* ── the Explorer task pane ───────────────────────────────────────────── */

export function TaskPane({ children, label = 'Tasks' }: { children: ReactNode; label?: string }) {
  return (
    <aside className="taskpane" aria-label={label}>
      {children}
    </aside>
  );
}

export function TaskBox({ title, special, children, defaultOpen = true }: { title: string; special?: boolean; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <section className="tp-box" data-special={special ? 'true' : undefined} data-collapsed={open ? undefined : 'true'}>
      <button type="button" className="tp-head" aria-expanded={open} aria-controls={id} onClick={() => setOpen((v) => !v)}>
        <span>{title}</span>
        <span className="tp-chevron" aria-hidden>
          <Glyph name="chevrons-up" />
        </span>
      </button>
      <div className="tp-body" id={id}>
        {children}
      </div>
    </section>
  );
}

export function TaskLink({ icon, children, onClick, disabled, title }: { icon?: string; children: ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button type="button" className="tp-link" onClick={onClick} disabled={disabled} title={title} data-cursor="hand">
      {icon ? <Icon name={icon} size={16} /> : null}
      <span>{children}</span>
    </button>
  );
}
