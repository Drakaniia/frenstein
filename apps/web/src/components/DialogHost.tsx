import { useEffect, useRef, useState } from 'react';

import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { readJson, STORAGE_KEYS, writeJson } from '@/os/persistence';
import { resolveRun } from '@/os/run';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { Button } from './controls';
import { Icon } from './Icon';
import { MessageBox } from './MessageBox';

const THEME_NAMES = { blue: 'Luna Blue', olive: 'Olive Green', silver: 'Silver', rose: 'Rose' } as const;

/**
 * The single global dialog surface. One dialog at a time, routed by the
 * reducer's `dialog.action`: About, Log Off, Turn Off, Run, or a message box.
 */
export function DialogHost() {
  const { state, dispatch, runEffect } = useOs();
  const dialog = state.dialog;
  if (!dialog) return null;
  const close = () => dispatch({ type: 'CLOSE_DIALOG' });

  let content: React.ReactNode = null;
  switch (dialog.action) {
    case 'about':
      content = <AboutDialog onClose={close} />;
      break;
    case 'shutdown':
      content = <TurnOffDialog onClose={close} />;
      break;
    case 'logoff':
      content = <LogOffDialog onClose={close} />;
      break;
    case 'run':
      content = <RunDialog onClose={close} />;
      break;
    case 'message':
      content = (
        <MessageBox
          title={dialog.title}
          icon={dialog.icon ?? 'info'}
          veil="none"
          onClose={close}
          buttons={[
            {
              label: dialog.confirmLabel ?? 'OK',
              isDefault: true,
              onClick: () => {
                close();
                if (dialog.then) runEffect(dialog.then);
              },
            },
          ]}
        >
          <p style={{ margin: 0, whiteSpace: 'pre-line' }}>{dialog.message}</p>
        </MessageBox>
      );
      break;
  }

  return <div className="dialog-layer">{content}</div>;
}

/* ── About ────────────────────────────────────────────────────────────── */

function AboutDialog({ onClose }: { onClose: () => void }) {
  const { state } = useOs();
  const { stageW, stageH } = useStage();
  return (
    <MessageBox title={`About ${CONTENT.osName}`} icon={null} veil="none" width={380} onClose={onClose} buttons={[{ label: 'OK', isDefault: true, onClick: onClose }]}>
      <div className="about-banner" style={{ margin: '-14px -14px 12px' }}>
        <Icon name="logo-48" size={48} />
        <div>
          <div className="about-wordmark">
            FrenOS<sup>xp</sup>
          </div>
          <div style={{ marginTop: 4 }}>{CONTENT.edition}</div>
        </div>
      </div>
      <div className="about-lines">
        <span>
          {CONTENT.osName} · Version {CONTENT.version} (Build 2306.love_sp2)
        </span>
        <span>Copyright © 2006–2026 Made With Love, Inc.</span>
      </div>
      <div className="about-rule" />
      <div className="about-lines">
        <span>This product is licensed under the Forever License Agreement to:</span>
        <strong style={{ paddingLeft: 12 }}>{CONTENT.about.licensedTo}</strong>
      </div>
      <div className="about-rule" />
      <div className="about-lines">
        <span>Physical memory available to FrenOS: 2,306 KB of memories</span>
        <span>
          Desktop: {stageW} × {stageH} · Theme: {THEME_NAMES[state.settings.theme]}
        </span>
      </div>
    </MessageBox>
  );
}

/* ── Turn Off / Log Off ───────────────────────────────────────────────── */

function useInitialFocus() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    ref.current?.querySelector<HTMLButtonElement>('.turnoff-foot button')?.focus();
    return () => opener?.focus?.();
  }, []);
  return ref;
}

interface OptionDef {
  icon: string;
  label: string;
  onSelect: () => void;
}

function SessionDialog({ title, options, onClose }: { title: string; options: OptionDef[]; onClose: () => void }) {
  const ref = useInitialFocus();
  return (
    <div
      ref={ref}
      className="turnoff"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          onClose();
        }
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          const buttons = Array.from(ref.current?.querySelectorAll<HTMLButtonElement>('.turnoff-opt') ?? []);
          const i = buttons.indexOf(document.activeElement as HTMLButtonElement);
          buttons[(i + (e.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
        }
      }}
    >
      <div className="turnoff-head">
        <span>{title}</span>
        <Icon name="logo-32" size={32} />
      </div>
      <div className="turnoff-body">
        {options.map((o) => (
          <button key={o.label} type="button" className="turnoff-opt" onClick={o.onSelect}>
            <Icon name={o.icon} size={32} />
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <div className="turnoff-foot">
        <Button onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function TurnOffDialog({ onClose }: { onClose: () => void }) {
  const { dispatch } = useOs();
  return (
    <SessionDialog
      title="Turn off computer"
      onClose={onClose}
      options={[
        {
          icon: 'standby',
          label: 'Stand By',
          onSelect: () => {
            dispatch({ type: 'CLOSE_DIALOG' });
            dispatch({ type: 'SCREENSAVER', open: true });
          },
        },
        { icon: 'power', label: 'Turn Off', onSelect: () => dispatch({ type: 'SHUT_DOWN', mode: 'off' }) },
        { icon: 'restart', label: 'Restart', onSelect: () => dispatch({ type: 'SHUT_DOWN', mode: 'restart' }) },
      ]}
    />
  );
}

function LogOffDialog({ onClose }: { onClose: () => void }) {
  const { dispatch } = useOs();
  return (
    <SessionDialog
      title={`Log Off ${CONTENT.osName}`}
      onClose={onClose}
      options={[
        {
          icon: 'switchuser',
          label: 'Switch User',
          onSelect: () => {
            playSfx('logoff');
            dispatch({ type: 'LOCK' });
          },
        },
        { icon: 'logoff', label: 'Log Off', onSelect: () => dispatch({ type: 'LOG_OFF' }) },
      ]}
    />
  );
}

/* ── Run ──────────────────────────────────────────────────────────────── */

function loadHistory(): string[] {
  const raw = readJson<unknown>(STORAGE_KEYS.runHistory, []);
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string').slice(0, 10) : [];
}

function RunDialog({ onClose }: { onClose: () => void }) {
  const { dispatch, openApp, runEffect, message } = useOs();
  const [history] = useState(loadHistory);
  const [value, setValue] = useState(history[0] ?? '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.select();
  }, []);

  const run = () => {
    const text = value.trim();
    if (!text) return;
    writeJson(STORAGE_KEYS.runHistory, [text, ...history.filter((h) => h.toLowerCase() !== text.toLowerCase())].slice(0, 10));
    const result = resolveRun(text);
    onClose();
    switch (result.kind) {
      case 'open':
        playSfx('navigate');
        openApp(result.appId, result.payload);
        break;
      case 'effect':
        runEffect(result.effect);
        if (result.message) message(result.message);
        break;
      case 'dialog':
        dispatch({ type: 'OPEN_DIALOG', action: result.action });
        break;
      case 'message':
        playSfx(result.message.icon === 'error' ? 'error' : 'ding');
        message(result.message);
        break;
      case 'none':
        break;
    }
  };

  return (
    <MessageBox
      title="Run"
      iconName="run"
      veil="none"
      width={380}
      onClose={onClose}
      buttons={[
        { label: 'OK', isDefault: true, onClick: run },
        { label: 'Cancel', onClick: onClose },
        {
          label: 'Browse...',
          onClick: () => {
            onClose();
            openApp('mycomputer');
          },
        },
      ]}
    >
      <p style={{ margin: 0 }}>Type the name of a program, folder, document, or Internet resource, and FrenOS will open it for you.</p>
      <div className="run-open">
        <label htmlFor="run-open-field">Open:</label>
        <input
          id="run-open-field"
          ref={inputRef}
          className="field"
          list="run-history"
          autoComplete="off"
          spellCheck={false}
          data-autofocus="true"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              e.stopPropagation();
              run();
            }
          }}
        />
        <datalist id="run-history">
          {history.map((h) => (
            <option key={h} value={h} />
          ))}
        </datalist>
      </div>
    </MessageBox>
  );
}
