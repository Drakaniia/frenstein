import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

import { Button, StatusBar, StatusField } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import type { WindowState } from '@/os/types';

type Topic = 'welcome' | 'basics' | 'secrets' | 'keys' | 'about';

const TOPICS: ReadonlyArray<{ id: Topic; label: string; icon: string }> = [
  { id: 'welcome', label: 'Welcome', icon: 'logo-16' },
  { id: 'basics', label: 'Getting around', icon: 'computer' },
  { id: 'secrets', label: 'Hidden surprises', icon: 'heart' },
  { id: 'keys', label: 'Keyboard shortcuts', icon: 'run' },
  { id: 'about', label: 'About this computer', icon: 'info' },
];

const isTopic = (v: unknown): v is Topic => typeof v === 'string' && TOPICS.some((t) => t.id === v);

/** Help and Support Center: how things work, and where the surprises hide. */
export function HelpApp({ win }: { win: WindowState }) {
  const { openApp, dispatch } = useOs();
  const { compact } = useStage();
  const [topic, setTopic] = useState<Topic>(() => (isTopic(win.payload) ? win.payload : 'welcome'));
  const [revealed, setRevealed] = useState<Set<number>>(() => new Set());
  const rev = useRef(win.payloadRev);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rev.current === win.payloadRev) return;
    rev.current = win.payloadRev;
    if (isTopic(win.payload)) setTopic(win.payload);
  }, [win.payloadRev, win.payload]);

  useEffect(() => {
    contentRef.current?.scrollTo({ top: 0 });
  }, [topic]);

  const link = (label: string, onClick: () => void) => (
    <button type="button" className="link-btn" onClick={onClick}>
      {label}
    </button>
  );

  let body: ReactNode;
  switch (topic) {
    case 'welcome':
      body = (
        <>
          <h2>Happy birthday, {CONTENT.user.name}!</h2>
          <p>
            This is <strong>{CONTENT.osName}</strong>, a little computer from the early 2000s that was rebuilt, pixel by pixel, as a
            birthday present for you. Everything on it is about us.
          </p>
          <div className="help-topic">
            <Icon name="cake" size={32} />
            <div>
              <strong>Start with your present.</strong>
              <br />
              Open {link('Happy Birthday!', () => openApp('birthday'))}, make a wish and blow out the candles.
            </div>
          </div>
          <div className="help-topic">
            <Icon name="letter" size={32} />
            <div>
              <strong>Then read the letter.</strong>
              <br />
              The {link('Love Letter', () => openApp('notepad'))} on the desktop was written just for you.
            </div>
          </div>
          <div className="help-topic">
            <Icon name="pictures" size={32} />
            <div>
              <strong>Look through our pictures</strong> in {link('My Pictures', () => openApp('photos'))}, and play{' '}
              {link('our song', () => openApp('music'))} while you do.
            </div>
          </div>
        </>
      );
      break;
    case 'basics':
      body = (
        <>
          <h2>Getting around</h2>
          <h3>Windows</h3>
          <p>Drag a window by its blue title bar. Resize it from any edge or corner. Double-click the title bar to maximize it.</p>
          <h3>The desktop</h3>
          <p>Double-click an icon to open it (one tap on a phone or tablet). Right-click the desktop for more options, like arranging icons or making it rain hearts.</p>
          <h3>The taskbar</h3>
          <p>
            Click <strong>start</strong> for every program. The little heart by the clock always has something to tell you, and the speaker
            sets the volume.
          </p>
          <h3>Make it yours</h3>
          <p>
            In the {link('Control Panel', () => openApp('settings'))} you can switch wallpapers (try Starry Night), pick the Rose colour
            scheme, and choose a screen saver.
          </p>
        </>
      );
      break;
    case 'secrets':
      body = (
        <>
          <h2>Hidden surprises</h2>
          <p>There are a few secrets hidden around this computer. Try to find them yourself first, then click a hint if you get stuck.</p>
          {CONTENT.secrets.map((secret, i) => (
            <div key={secret.title} className="help-secret" data-revealed={revealed.has(i) ? 'true' : 'false'}>
              <strong>{secret.title}</strong>
              <div>
                {revealed.has(i) ? (
                  <span className="help-secret-hint">{secret.hint}</span>
                ) : (
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => {
                      playSfx('sparkle');
                      setRevealed((set) => new Set(set).add(i));
                    }}
                  >
                    Show me a hint
                  </button>
                )}
              </div>
            </div>
          ))}
          <p style={{ marginTop: 12 }}>
            <Button small onClick={() => dispatch({ type: 'ASSISTANT', open: true })}>
              Ask {CONTENT.assistant.name} for help
            </Button>
          </p>
        </>
      );
      break;
    case 'keys':
      body = (
        <>
          <h2>Keyboard shortcuts</h2>
          <p>
            <strong>Ctrl + Esc</strong> — open the Start menu
            <br />
            <strong>Alt + Space</strong> — the window menu
            <br />
            <strong>Arrow keys, Enter</strong> — move between and open desktop icons
            <br />
            <strong>Ctrl + S, Ctrl + O</strong> — save and open in Notepad
            <br />
            <strong>F5</strong> — insert the time and date in Notepad
            <br />
            <strong>← →</strong> — previous and next picture in the viewer
          </p>
        </>
      );
      break;
    case 'about':
      body = (
        <>
          <h2>About this computer</h2>
          <p>
            {CONTENT.osName} {CONTENT.edition}, version {CONTENT.version}. It runs entirely in this browser: nothing you do here touches your
            real files, and everything is saved only on this device.
          </p>
          <p>The wallpapers, icons and cursors are all drawn in code, pixel by pixel. The sounds are synthesized live. The love is real.</p>
          <p>
            <Button small onClick={() => dispatch({ type: 'OPEN_DIALOG', action: 'about' })}>
              About {CONTENT.osName}
            </Button>
          </p>
        </>
      );
      break;
  }

  return (
    <div className="help">
      <div className="help-head">
        <Icon name="help" size={32} />
        <div className="help-title">
          Help and Support Center
          <small>{CONTENT.osName} · {CONTENT.edition}</small>
        </div>
        {!compact ? (
          <Button small onClick={() => openApp('birthday')}>
            Open my present
          </Button>
        ) : null}
      </div>
      {compact ? (
        <div className="tabs" role="tablist" aria-label="Help topics" style={{ padding: '4px 4px 0', background: '#eaf0fc' }}>
          {TOPICS.map((t) => (
            <button key={t.id} type="button" role="tab" className="tab" aria-selected={topic === t.id} onClick={() => setTopic(t.id)}>
              {t.label}
            </button>
          ))}
        </div>
      ) : null}
      <div className="help-body">
        {!compact ? (
          <nav className="help-nav" aria-label="Help topics">
            {TOPICS.map((t) => (
              <button key={t.id} type="button" className="help-nav-item" aria-current={topic === t.id} onClick={() => setTopic(t.id)}>
                <Icon name={t.icon} size={16} />
                {t.label}
              </button>
            ))}
          </nav>
        ) : null}
        <div className="help-content selectable" ref={contentRef}>
          {body}
        </div>
      </div>
      <StatusBar>
        <StatusField>Done</StatusField>
      </StatusBar>
    </div>
  );
}
