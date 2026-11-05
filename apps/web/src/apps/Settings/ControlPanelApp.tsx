import { useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Button, Checkbox, Group, Radio, Range, Tabs } from '@/components/controls';
import { Glyph } from '@/components/Glyph';
import { Icon } from '@/components/Icon';
import { CONTENT } from '@/data/content';
import { DESKTOP_ICONS, APPS } from '@/os/apps';
import { useOs } from '@/os/OsProvider';
import { SETTINGS_CHOICES } from '@/os/persistence';
import { playSfx } from '@/os/sfx';
import type { IconSize, ScreensaverId, Settings, ThemeId, WallpaperId, WindowState } from '@/os/types';
import { paintStill } from '@/wallpaper/scenes';

type TabId = 'themes' | 'desktop' | 'screensaver' | 'appearance' | 'sounds' | 'datetime';

const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: 'themes', label: 'Themes' },
  { id: 'desktop', label: 'Desktop' },
  { id: 'screensaver', label: 'Screen Saver' },
  { id: 'appearance', label: 'Appearance' },
  { id: 'sounds', label: 'Sounds' },
  { id: 'datetime', label: 'Date & Time' },
];

const WALLPAPERS: ReadonlyArray<{ id: WallpaperId; label: string; icon: string }> = [
  { id: 'sunset', label: 'Sunset Meadow', icon: 'photo' },
  { id: 'bliss', label: 'Bliss', icon: 'display' },
  { id: 'nightfall', label: 'Starry Night', icon: 'saver' },
  { id: 'sakura', label: 'Sakura Morning', icon: 'heart' },
];

const THEMES: ReadonlyArray<{ id: ThemeId; label: string; chip: string }> = [
  { id: 'blue', label: 'FrenOS XP (Blue)', chip: 'linear-gradient(180deg,#3d8bff,#0050ee)' },
  { id: 'olive', label: 'Olive Green', chip: 'linear-gradient(180deg,#b9cd92,#7d955a)' },
  { id: 'silver', label: 'Silver', chip: 'linear-gradient(180deg,#ffffff,#a7a8bf)' },
  { id: 'rose', label: 'Rose (made for you)', chip: 'linear-gradient(180deg,#ffa3cc,#c42f72)' },
];

const SAVERS: ReadonlyArray<{ id: ScreensaverId; label: string }> = [
  { id: 'slideshow', label: 'My Pictures Slideshow' },
  { id: 'starfield', label: 'Starfield (with hearts)' },
  { id: 'hearts', label: 'FrenOS XP Logo' },
];

const minutes = (ms: number) => `${Math.round(ms / 60_000)} minute${ms === 60_000 ? '' : 's'}`;

const isTab = (v: unknown): v is TabId => typeof v === 'string' && TABS.some((t) => t.id === v);

/**
 * Display Properties, XP style. Changes preview live; OK keeps them and
 * Cancel puts everything back the way it was.
 */
export function ControlPanelApp({ win }: { win: WindowState }) {
  const { state, dispatch } = useOs();
  const [tab, setTab] = useState<TabId>(() => (isTab(win.payload) ? win.payload : 'themes'));
  const [snapshot] = useState<Settings>(() => state.settings);
  const rev = useRef(win.payloadRev);
  const s = state.settings;
  const set = (patch: Partial<Settings>) => dispatch({ type: 'SET_SETTINGS', patch });
  const idBase = `cpl-${win.id.replace(/\W/g, '')}`;

  useEffect(() => {
    if (rev.current === win.payloadRev) return;
    rev.current = win.payloadRev;
    if (isTab(win.payload)) setTab(win.payload);
  }, [win.payloadRev, win.payload]);

  useEffect(() => {
    dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: tab === 'datetime' ? 'Date and Time Properties' : tab === 'sounds' ? 'Sounds and Audio Properties' : 'Display Properties' });
  }, [dispatch, win.id, tab]);

  const close = () => dispatch({ type: 'CLOSE_WINDOW', id: win.id });

  let panel: ReactNode = null;
  switch (tab) {
    case 'themes':
      panel = (
        <>
          <p className="hint" style={{ margin: 0 }}>
            A theme is a background plus a set of colours to personalize your computer.
          </p>
          <div className="choice-list" role="listbox" aria-label="Color scheme" style={{ height: 'auto' }}>
            {THEMES.map((t) => (
              <button key={t.id} type="button" role="option" aria-selected={s.theme === t.id} className="choice-item" onClick={() => set({ theme: t.id })}>
                <span className="theme-chip" style={{ background: t.chip }} aria-hidden />
                {t.label}
              </button>
            ))}
          </div>
          <div>Sample:</div>
          <ThemePreview theme={s.theme} />
        </>
      );
      break;
    case 'desktop':
      panel = (
        <>
          <Monitor wallpaper={s.wallpaper} />
          <div className="form-row" style={{ alignItems: 'flex-start' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ marginBottom: 3 }}>Background:</div>
              <div className="choice-list" role="listbox" aria-label="Background">
                {WALLPAPERS.map((w) => (
                  <button key={w.id} type="button" role="option" aria-selected={s.wallpaper === w.id} className="choice-item" onClick={() => set({ wallpaper: w.id })}>
                    <Icon name={w.icon} size={16} />
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Checkbox checked={s.wallpaperMotion} onChange={(v) => set({ wallpaperMotion: v })}>
            Animate the wallpaper (clouds, hearts, fireflies)
          </Checkbox>
          <Group label="Desktop icons">
            <div className="form-row" style={{ flexWrap: 'wrap', marginBottom: 6 }}>
              {(['small', 'medium', 'large'] as IconSize[]).map((size) => (
                <Radio key={size} name={`${idBase}-icons`} value={size} checked={s.iconSize === size} onChange={() => set({ iconSize: size })}>
                  {size[0]?.toUpperCase()}
                  {size.slice(1)}
                </Radio>
              ))}
            </div>
            <Checkbox checked={s.showLabels} onChange={(v) => set({ showLabels: v })}>
              Show icon names
            </Checkbox>
            <div className="btn-row" style={{ justifyContent: 'flex-start', marginTop: 6 }}>
              <Button small onClick={() => set({ iconOrder: [...DESKTOP_ICONS].sort((a, b) => APPS[a].shortcut.localeCompare(APPS[b].shortcut)) })}>
                Arrange by name
              </Button>
              <Button small onClick={() => set({ iconOrder: [...DESKTOP_ICONS] })}>
                Reset layout
              </Button>
            </div>
          </Group>
        </>
      );
      break;
    case 'screensaver':
      panel = (
        <>
          <Monitor saver={s.screensaver} />
          <Group label="Screen saver">
            <div className="form-row" style={{ flexWrap: 'wrap' }}>
              <select className="select" aria-label="Screen saver" value={s.screensaver} onChange={(e) => set({ screensaver: e.target.value as ScreensaverId })} style={{ flex: '1 1 160px' }}>
                {SAVERS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
              <Button small onClick={() => dispatch({ type: 'SCREENSAVER', open: true, mode: s.screensaver })}>
                Preview
              </Button>
            </div>
            <div className="form-row" style={{ marginTop: 8, flexWrap: 'wrap' }}>
              <Checkbox checked={s.screensaverEnabled} onChange={(v) => set({ screensaverEnabled: v })}>
                Start after
              </Checkbox>
              <select className="select" aria-label="Wait" value={s.idleMs} disabled={!s.screensaverEnabled} onChange={(e) => set({ idleMs: Number(e.target.value) })}>
                {SETTINGS_CHOICES.IDLE_CHOICES.map((ms) => (
                  <option key={ms} value={ms}>
                    {minutes(ms)}
                  </option>
                ))}
              </select>
            </div>
          </Group>
        </>
      );
      break;
    case 'appearance':
      panel = (
        <>
          <Group label="Pointers">
            <Checkbox checked={s.cursorEnabled} onChange={(v) => set({ cursorEnabled: v })}>
              Use the FrenOS XP pixel cursors
            </Checkbox>
          </Group>
          <Group label="Notifications">
            <Checkbox checked={s.notificationsEnabled} onChange={(v) => set({ notificationsEnabled: v })}>
              Show balloon tips in the notification area
            </Checkbox>
            <div className="form-row" style={{ marginTop: 6, flexWrap: 'wrap' }}>
              <span>Hide balloons after</span>
              <select className="select" aria-label="Hide balloons after" value={s.notificationMs} disabled={!s.notificationsEnabled} onChange={(e) => set({ notificationMs: Number(e.target.value) })}>
                {SETTINGS_CHOICES.NOTIFY_CHOICES.map((ms) => (
                  <option key={ms} value={ms}>
                    {ms / 1000} seconds
                  </option>
                ))}
              </select>
            </div>
          </Group>
          <Group label="Clock">
            <div className="form-row" style={{ flexWrap: 'wrap' }}>
              <Radio name={`${idBase}-clock`} value="12" checked={!s.clock24h} onChange={() => set({ clock24h: false })}>
                12-hour (7:24 PM)
              </Radio>
              <Radio name={`${idBase}-clock`} value="24" checked={s.clock24h} onChange={() => set({ clock24h: true })}>
                24-hour (19:24)
              </Radio>
            </div>
          </Group>
        </>
      );
      break;
    case 'sounds':
      panel = (
        <>
          <Group label="Device volume">
            <div className="form-row">
              <Icon name="speaker" size={32} />
              <span>Low</span>
              <Range value={s.volume} ariaLabel="Volume" onChange={(v) => set({ volume: v, muted: false })} style={{ flex: 1 }} />
              <span>High</span>
            </div>
            <Checkbox checked={s.muted} onChange={(v) => set({ muted: v })}>
              Mute
            </Checkbox>
          </Group>
          <Group label="Sound scheme: FrenOS XP">
            <div className="btn-row" style={{ justifyContent: 'flex-start' }}>
              {(
                [
                  ['Startup', 'startup'],
                  ['Notify', 'balloon'],
                  ['Ding', 'ding'],
                  ['Tada', 'tada'],
                  ['Sparkle', 'sparkle'],
                ] as const
              ).map(([label, cue]) => (
                <Button key={cue} small onClick={() => playSfx(cue)}>
                  <Glyph name="play" /> {label}
                </Button>
              ))}
            </div>
            <p className="hint" style={{ margin: '8px 0 0' }}>
              Every sound is synthesized live; nothing plays until you interact with the computer.
            </p>
          </Group>
        </>
      );
      break;
    case 'datetime':
      panel = <DateTime />;
      break;
  }

  return (
    <div className="props">
      <Tabs idBase={idBase} label="Display Properties" tabs={TABS} value={tab} onChange={setTab} />
      <div className="tab-panel" id={`${idBase}-panel`} role="tabpanel" aria-labelledby={`${idBase}-tab-${tab}`}>
        <div className="props-panel">{panel}</div>
      </div>
      <div className="props-foot">
        <Button isDefault onClick={close}>
          OK
        </Button>
        <Button
          onClick={() => {
            dispatch({ type: 'SET_SETTINGS', patch: snapshot });
            close();
          }}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}

/* ── previews ─────────────────────────────────────────────────────────── */

function Monitor({ wallpaper, saver }: { wallpaper?: WallpaperId; saver?: ScreensaverId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    if (wallpaper) {
      paintStill(wallpaper, canvas);
      return;
    }
    const g = canvas.getContext('2d');
    if (!g) return;
    g.fillStyle = '#000';
    g.fillRect(0, 0, canvas.width, canvas.height);
    g.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) g.fillRect((i * 53) % canvas.width, (i * 31) % canvas.height, 1, 1);
    g.fillStyle = '#ff7aa2';
    g.font = 'bold 12px Tahoma, sans-serif';
    g.textAlign = 'center';
    g.fillText(saver === 'slideshow' ? 'My Pictures' : saver === 'hearts' ? 'FrenOS xp ♥' : '✦ ✧ ♥ ✧ ✦', canvas.width / 2, canvas.height / 2 + 4);
  }, [wallpaper, saver]);
  return (
    <div className="monitor" aria-hidden>
      <div className="monitor-bezel" />
      <div className="monitor-screen">
        <canvas ref={ref} width={162} height={110} />
      </div>
      <div className="monitor-led" />
      <div className="monitor-neck" />
      <div className="monitor-base" />
    </div>
  );
}

function ThemePreview({ theme }: { theme: ThemeId }) {
  return (
    <div data-theme={theme} style={{ position: 'relative', padding: 10, background: '#3a6ea5', border: '1px solid var(--xp-field-border)' }} aria-hidden>
      <div style={{ background: 'var(--xp-face)', borderRadius: '8px 8px 0 0', boxShadow: 'var(--xp-frame)', paddingBottom: 3 }}>
        <div className="title-bar">
          <Icon name="computer" size={16} />
          <span className="title-bar-text">Active Window</span>
          <div className="title-bar-controls">
            <span className="cap-btn">
              <Glyph name="minimize" />
            </span>
            <span className="cap-btn">
              <Glyph name="maximize" />
            </span>
            <span className="cap-btn" data-kind="close">
              <Glyph name="close" />
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '10px 10px 8px', margin: '0 3px' }}>
          <span>Window Text</span>
          <span className="btn" style={{ pointerEvents: 'none' }}>
            OK
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Date & Time ──────────────────────────────────────────────────────── */

function daysUntilBirthday(now: Date): number | null {
  const date = CONTENT.birthday.date;
  if (!date) return null;
  const [m, d] = date.split('-').map(Number);
  if (!m || !d) return null;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < today) next = new Date(now.getFullYear() + 1, m - 1, d);
  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

function DateTime() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const [view, setView] = useState(() => ({ y: now.getFullYear(), m: now.getMonth() }));
  const cells = useMemo(() => {
    const first = new Date(view.y, view.m, 1).getDay();
    const days = new Date(view.y, view.m + 1, 0).getDate();
    return [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  }, [view]);
  const [bm, bd] = (CONTENT.birthday.date ?? '').split('-').map(Number);
  const days = daysUntilBirthday(now);
  const monthName = new Date(view.y, view.m, 1).toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  const hand = (turns: number, length: number, width: number, color: string) => {
    const a = turns * Math.PI * 2;
    return <line x1="50" y1="50" x2={50 + Math.sin(a) * length} y2={50 - Math.cos(a) * length} stroke={color} strokeWidth={width} strokeLinecap="round" />;
  };

  return (
    <>
      {days !== null ? (
        <div className="infobar" style={{ borderRadius: 3, border: '1px solid #c9c49a' }}>
          <Icon name="cake" size={24} />
          <strong>{days === 0 ? `Today is your birthday, ${CONTENT.user.name}! 🎉` : `${days} day${days === 1 ? '' : 's'} until your birthday!`}</strong>
        </div>
      ) : null}
      <div className="form-row" style={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <Group label="Date" style={{ flex: '1 1 180px' }}>
          <div className="form-row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
            <Button small aria-label="Previous month" onClick={() => setView((v) => (v.m === 0 ? { y: v.y - 1, m: 11 } : { y: v.y, m: v.m - 1 }))}>
              <Glyph name="arrow-left" />
            </Button>
            <strong>{monthName}</strong>
            <Button small aria-label="Next month" onClick={() => setView((v) => (v.m === 11 ? { y: v.y + 1, m: 0 } : { y: v.y, m: v.m + 1 }))}>
              <Glyph name="arrow-right" />
            </Button>
          </div>
          <div className="calendar" role="group" aria-label={monthName}>
            {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
              <span key={i} className="cal-dow" aria-hidden>
                {d}
              </span>
            ))}
            {cells.map((d, i) => (
              <span
                key={i}
                className="cal-day"
                data-today={d !== null && view.y === now.getFullYear() && view.m === now.getMonth() && d === now.getDate() ? 'true' : undefined}
                data-bday={d !== null && view.m + 1 === bm && d === bd ? 'true' : undefined}
                title={d !== null && view.m + 1 === bm && d === bd ? 'Her birthday ♥' : undefined}
              >
                {d ?? ''}
              </span>
            ))}
          </div>
        </Group>
        <Group label="Time" style={{ flex: '0 0 auto' }}>
          <svg width="112" height="112" viewBox="0 0 100 100" role="img" aria-label={now.toLocaleTimeString()}>
            <circle cx="50" cy="50" r="46" fill="#ffffff" stroke="#2f6fe0" strokeWidth="4" />
            {Array.from({ length: 12 }, (_, i) => {
              const a = (i / 12) * Math.PI * 2;
              return <circle key={i} cx={50 + Math.sin(a) * 38} cy={50 - Math.cos(a) * 38} r={i % 3 === 0 ? 2.4 : 1.4} fill={i === 0 ? '#e3264f' : '#56627a'} />;
            })}
            {hand(((now.getHours() % 12) + now.getMinutes() / 60) / 12, 22, 4, '#1c2438')}
            {hand((now.getMinutes() + now.getSeconds() / 60) / 60, 32, 3, '#1c2438')}
            {hand(now.getSeconds() / 60, 36, 1.2, '#e3264f')}
            <circle cx="50" cy="50" r="3" fill="#e3264f" />
          </svg>
          <div style={{ textAlign: 'center', marginTop: 4, fontVariantNumeric: 'tabular-nums' }}>{now.toLocaleTimeString()}</div>
        </Group>
      </div>
      <p className="hint" style={{ margin: 0 }}>
        Time zone: {Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local time'}
      </p>
    </>
  );
}
