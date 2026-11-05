import { useEffect, useRef, useState } from 'react';

import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { Icon } from './Icon';

/**
 * Lovey — a tiny heart-shaped desktop assistant in the spirit of the
 * early-2000s helpers. It appears once per session after logging on, and can
 * be summoned again from Help or the Run box.
 */
export function Assistant({ onClose }: { onClose: () => void }) {
  const { openApp } = useOs();
  const { compact } = useStage();
  const [tip, setTip] = useState<number | null>(null);
  const [frame, setFrame] = useState<1 | 2 | 3>(3);
  const ref = useRef<HTMLDivElement>(null);
  const tips = CONTENT.assistant.tips;

  useEffect(() => {
    playSfx('balloon');
    const wave = window.setTimeout(() => setFrame(1), 1400);
    const blink = window.setInterval(() => {
      setFrame(2);
      window.setTimeout(() => setFrame(1), 160);
    }, 3200);
    return () => {
      window.clearTimeout(wave);
      window.clearInterval(blink);
    };
  }, []);

  const go = (fn: () => void) => {
    playSfx('click');
    fn();
    onClose();
  };

  const nextTip = () => {
    playSfx('ding');
    setFrame(3);
    window.setTimeout(() => setFrame(1), 900);
    setTip((t) => ((t ?? -1) + 1) % tips.length);
  };

  const size = compact ? 40 : 80;

  return (
    <div ref={ref} className="assistant" role="dialog" aria-label={`${CONTENT.assistant.name}, your assistant`}>
      <div className="assistant-bubble">
        <p className="assistant-title" aria-live="polite">
          {tip === null ? CONTENT.assistant.greeting : tips[tip]}
        </p>
        <div className="assistant-options">
          <button type="button" className="as-opt" onClick={() => go(() => openApp('birthday'))}>
            Yes, let us celebrate!
          </button>
          <button type="button" className="as-opt" onClick={() => go(() => openApp('notepad'))}>
            Read my letter
          </button>
          <button type="button" className="as-opt" onClick={nextTip}>
            {tip === null ? 'Give me a tip' : 'Another tip, please'}
          </button>
          <button type="button" className="as-opt" onClick={() => go(() => openApp('help', 'secrets'))}>
            Show me the hidden surprises
          </button>
          <button type="button" className="as-opt" onClick={() => go(() => undefined)}>
            Not now, {CONTENT.assistant.name}
          </button>
        </div>
      </div>
      <button type="button" className="assistant-char" aria-label={`${CONTENT.assistant.name}: click for a tip`} onClick={nextTip}>
        <Icon name={`lovey-${frame}`} size={size} />
      </button>
    </div>
  );
}
