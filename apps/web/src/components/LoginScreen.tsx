import { useEffect, useRef, useState } from 'react';

import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { playSfx, unlockAudio } from '@/os/sfx';
import { useCoarsePointer, usePrefersReducedMotion } from '@/os/useMedia';
import { Button } from './controls';
import { Icon } from './Icon';

const PIN_LENGTH = CONTENT.pin.length;

/**
 * The XP Welcome screen. One account (hers), a password box that takes the
 * four-digit PIN, a hint balloon, an optional on-screen keypad for touch
 * screens, and a "welcome" moment with the startup sound before the desktop.
 *
 * This is a simulated lock screen: the PIN lives in `data/content.ts` and is
 * not real authentication.
 */
export function LoginScreen() {
  const { dispatch } = useOs();
  const reduced = usePrefersReducedMotion();
  const coarse = useCoarsePointer();
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const [hint, setHint] = useState(false);
  const [shake, setShake] = useState(0);
  const [keypad, setKeypad] = useState(coarse);
  const [welcome, setWelcome] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const submitTimer = useRef(0);

  useEffect(() => {
    if (!coarse) inputRef.current?.focus();
    return () => window.clearTimeout(submitTimer.current);
  }, [coarse]);

  const submit = (value: string) => {
    window.clearTimeout(submitTimer.current);
    if (welcome) return;
    unlockAudio();
    if (value === CONTENT.pin) {
      setError(false);
      setHint(false);
      setWelcome(true);
      playSfx('startup');
      window.setTimeout(() => dispatch({ type: 'LOGIN_SUCCESS' }), reduced ? 300 : 2300);
      return;
    }
    playSfx('error');
    setError(true);
    setHint(true);
    setShake((n) => n + 1);
    setPin('');
    if (!coarse) inputRef.current?.focus();
  };

  const update = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, PIN_LENGTH);
    setPin(digits);
    if (error) setError(false);
    window.clearTimeout(submitTimer.current);
    if (digits.length === PIN_LENGTH) submitTimer.current = window.setTimeout(() => submit(digits), 220);
  };

  const press = (key: string) => {
    unlockAudio();
    playSfx('click');
    if (key === 'back') update(pin.slice(0, -1));
    else if (key === 'clear') update('');
    else update(pin + key);
  };

  return (
    <div className="welcome" onPointerDown={() => unlockAudio()}>
      <div className="welcome-top" />

      <div className="welcome-mid">
        {welcome ? (
          <div className="welcome-greeting" role="status">
            <span>welcome</span>
            <small>Loading your personal settings…</small>
          </div>
        ) : (
          <>
            <div className="welcome-left">
              <Icon name="logo-64" size={64} />
              <div className="welcome-wordmark">
                <small>{CONTENT.edition}</small>
                <strong>FrenOS</strong>
                <sup>xp</sup>
              </div>
              <div className="welcome-text">To begin, click your user name</div>
            </div>

            <div className="welcome-divider" aria-hidden />

            <div className="welcome-right">
              <button
                type="button"
                className="user-tile"
                data-selected="true"
                onClick={() => {
                  unlockAudio();
                  inputRef.current?.focus();
                }}
              >
                <span className="user-pic">
                  <Icon name="avatar" size={48} />
                </span>
                <span>
                  <span className="user-name">{CONTENT.user.name}</span>
                  <span className="user-sub" style={{ display: 'block' }}>
                    Type your password
                  </span>
                </span>
              </button>

              <form
                className="pw-wrap"
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(pin);
                }}
              >
                <label className="sr-only" htmlFor="xp-pin">
                  Password for {CONTENT.user.name}
                </label>
                <div key={shake} className={`pw-row${shake ? ' pw-error' : ''}`}>
                  <input
                    id="xp-pin"
                    ref={inputRef}
                    className="pw-field"
                    type="password"
                    inputMode="numeric"
                    autoComplete="off"
                    enterKeyHint="go"
                    maxLength={PIN_LENGTH}
                    value={pin}
                    aria-invalid={error}
                    aria-describedby={hint ? 'xp-pin-hint' : undefined}
                    onChange={(e) => update(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        update('');
                        setHint(false);
                      }
                    }}
                  />
                  <button type="submit" className="pw-go" aria-label="Log on" title="Log on">
                    ➜
                  </button>
                  <button
                    type="button"
                    className="pw-help"
                    aria-label="Password hint"
                    aria-expanded={hint}
                    title="Password hint"
                    onClick={() => {
                      playSfx('click');
                      setHint((v) => !v);
                    }}
                  >
                    ?
                  </button>
                </div>

                {hint ? (
                  <div className="pw-balloon" id="xp-pin-hint" role={error ? 'alert' : 'status'}>
                    <strong>
                      <Icon name={error ? 'msg-warning' : 'info'} size={16} />
                      {error ? 'Did you forget your password?' : 'Password hint'}
                    </strong>
                    {CONTENT.loginHint}
                  </div>
                ) : null}

                {keypad ? (
                  <div className="osk" role="group" aria-label="On-screen keypad">
                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'clear', '0', 'back'].map((k) => (
                      <Button key={k} onClick={() => press(k)} aria-label={k === 'back' ? 'Backspace' : k === 'clear' ? 'Clear' : k}>
                        {k === 'back' ? '←' : k === 'clear' ? 'C' : k}
                      </Button>
                    ))}
                  </div>
                ) : null}
                <button type="button" className="osk-toggle" onClick={() => setKeypad((v) => !v)}>
                  {keypad ? 'Hide on-screen keypad' : 'Use on-screen keypad'}
                </button>
              </form>
            </div>
          </>
        )}
      </div>

      <div className="welcome-bottom">
        <button
          type="button"
          className="welcome-power"
          onClick={() => {
            unlockAudio();
            dispatch({ type: 'SHUT_DOWN', mode: 'off' });
          }}
        >
          <Icon name="power" size={28} />
          Turn off computer
        </button>
        <div className="welcome-note">
          This computer was made with love, especially for {CONTENT.user.name}. Happy birthday! ♥
        </div>
      </div>
    </div>
  );
}
