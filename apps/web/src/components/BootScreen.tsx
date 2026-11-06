import { useEffect, useRef, useState } from 'react';

import { CONTENT } from '@/data/content';
import { playSfx, unlockAudio } from '@/os/sfx';
import { usePrefersReducedMotion } from '@/os/useMedia';
import { Icon } from './Icon';

/**
 * Power-on: a BIOS POST screen, then the black FrenOS XP splash with the
 * famous three-block progress bar. About five seconds; any key or click
 * skips ahead (and unlocks audio for the startup sound later).
 */
export function BootScreen({ onDone }: { onDone: () => void }) {
  const reduced = usePrefersReducedMotion();
  const [phase, setPhase] = useState<'post' | 'splash'>('post');
  const [lines, setLines] = useState(reduced ? CONTENT.bootLines.length : 0);
  const done = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const finish = () => {
    if (done.current) return;
    done.current = true;
    doneRef.current();
  };

  // POST lines tick in one by one.
  useEffect(() => {
    if (phase !== 'post') return;
    if (lines >= CONTENT.bootLines.length) {
      const id = window.setTimeout(() => setPhase('splash'), reduced ? 250 : 900);
      return () => window.clearTimeout(id);
    }
    const id = window.setTimeout(
      () => {
        if (CONTENT.bootLines[lines]) playSfx('post');
        setLines((l) => l + 1);
      },
      lines === 0 ? 350 : 150
    );
    return () => window.clearTimeout(id);
  }, [phase, lines, reduced]);

  // The splash runs for a few laps of the progress bar.
  useEffect(() => {
    if (phase !== 'splash') return;
    const id = window.setTimeout(finish, reduced ? 900 : 3400);
    return () => window.clearTimeout(id);
  }, [phase, reduced]);

  // Any key or click skips ahead.
  useEffect(() => {
    const skip = (e: Event) => {
      unlockAudio();
      if (e instanceof KeyboardEvent && (e.ctrlKey || e.altKey || e.metaKey)) return;
      if (phase === 'post') {
        setLines(CONTENT.bootLines.length);
        setPhase('splash');
      } else {
        finish();
      }
    };
    window.addEventListener('keydown', skip);
    window.addEventListener('pointerdown', skip);
    return () => {
      window.removeEventListener('keydown', skip);
      window.removeEventListener('pointerdown', skip);
    };
  }, [phase]);

  return (
    <div className="boot" role="status" aria-label={`${CONTENT.osName} is starting`}>
      {phase === 'post' ? (
        <>
          <div className="bios" aria-hidden>
            {CONTENT.bootLines.slice(0, lines).map((line, i) => (
              <div key={i} className="bios-line" data-accent={i < 2 ? 'true' : undefined}>
                {line || '\u00a0'}
              </div>
            ))}
            {lines < CONTENT.bootLines.length ? <span className="caret">_</span> : null}
          </div>
          <div className="bios-logo" aria-hidden>
            <span>
              <b>FrenOS</b>
              Energy Star Ally
            </span>
            <Icon name="logo-32" size={32} />
          </div>
          <div className="bios-foot" aria-hidden>
            {CONTENT.bootSkipHint}
          </div>
        </>
      ) : (
        <div className="xp-splash">
          <div className="xp-brand">
            <Icon name="logo-64" size={64} />
            <div className="xp-wordmark">
              <small>Made With Love</small>
              <strong>FrenOS</strong>
              <sup>xp</sup>
            </div>
          </div>
          <div className="xp-progress-track" role="progressbar" aria-label="Starting up">
            <div className="xp-progress-run">
              <i />
              <i />
              <i />
            </div>
          </div>
          <div className="xp-splash-foot" aria-hidden>
            <span>Copyright © Made With Love, Inc.</span>
            <span>for {CONTENT.user.name} ♥</span>
          </div>
        </div>
      )}
    </div>
  );
}
