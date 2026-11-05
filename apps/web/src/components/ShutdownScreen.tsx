import { useEffect, useState } from 'react';

import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { usePrefersReducedMotion } from '@/os/useMedia';
import { Icon } from './Icon';

/**
 * "Saving your settings…" on the blue Welcome backdrop, then either the
 * Welcome screen (log off), a reboot (restart), or a dark screen that says
 * it is safe to turn the computer off — any key or click powers it back on.
 */
export function ShutdownScreen() {
  const { state, dispatch } = useOs();
  const reduced = usePrefersReducedMotion();
  const mode = state.shutdownMode;
  const [off, setOff] = useState(false);

  useEffect(() => {
    playSfx(mode === 'logoff' ? 'logoff' : 'shutdown');
    const id = window.setTimeout(
      () => {
        if (mode === 'off') setOff(true);
        else dispatch({ type: 'SHUTDOWN_DONE' });
      },
      reduced ? 400 : mode === 'logoff' ? 1800 : 2600
    );
    return () => window.clearTimeout(id);
  }, [mode, reduced, dispatch]);

  useEffect(() => {
    if (!off) return;
    let armed = false;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 700);
    const onAny = () => {
      if (armed) dispatch({ type: 'RESTART' });
    };
    window.addEventListener('keydown', onAny);
    window.addEventListener('pointerdown', onAny);
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener('keydown', onAny);
      window.removeEventListener('pointerdown', onAny);
    };
  }, [off, dispatch]);

  if (off) {
    return (
      <div className="poweroff" role="status">
        <span className="poweroff-heart">
          <Icon name="heart" size={48} />
        </span>
        <div className="poweroff-text">It&apos;s now safe to turn off your computer.</div>
        <div className="poweroff-sub">Sweet dreams, {CONTENT.user.name}. Press any key to turn it back on.</div>
      </div>
    );
  }

  return (
    <div className="shutdown" role="status">
      <div className="welcome-top" />
      <div className="shutdown-mid">
        <Icon name="logo-64" size={64} />
        <div className="shutdown-text">
          {mode === 'logoff' ? 'Saving your settings…' : `${CONTENT.osName} is shutting down…`}
        </div>
      </div>
      <div className="welcome-bottom" />
    </div>
  );
}
