import { useEffect, useMemo, useRef } from 'react';

import { BootScreen } from '@/components/BootScreen';
import { Desktop } from '@/components/Desktop';
import { LoginScreen } from '@/components/LoginScreen';
import { ShutdownScreen } from '@/components/ShutdownScreen';
import { cursorStylesheet } from '@/os/cursors';
import { isCompactStage, OsProvider, useOs } from '@/os/OsProvider';
import { StageProvider } from '@/os/StageContext';
import { chromeVars } from '@/os/useChrome';
import { useCoarsePointer } from '@/os/useMedia';
import { useStageScale } from '@/os/useStageScale';

/** Installs the FrenOS XP cursor set as real CSS cursors while enabled. */
function useXpCursors(enabled: boolean, pixel: number) {
  useEffect(() => {
    if (!enabled) return;
    const style = document.createElement('style');
    style.dataset.frenos = 'cursors';
    style.textContent = cursorStylesheet(pixel, window.devicePixelRatio || 1);
    document.head.appendChild(style);
    return () => style.remove();
  }, [enabled, pixel]);
}

function Shell() {
  const { state, dispatch } = useOs();
  const stage = useStageScale();
  const coarse = useCoarsePointer();
  const stageRef = useRef<HTMLDivElement>(null);
  const compact = isCompactStage({ w: stage.w, h: stage.h });

  // Keep the reducer's work-area bounds in sync with the live stage.
  useEffect(() => {
    dispatch({ type: 'SET_STAGE', stage: { w: stage.w, h: stage.h } });
  }, [stage.w, stage.h, dispatch]);

  const cursors = state.settings.cursorEnabled && !coarse;
  useXpCursors(cursors, stage.pixel);

  const stageValue = useMemo(
    () => ({ scale: stage.scale, pixel: stage.pixel, stageW: stage.w, stageH: stage.h, compact, stageRef }),
    [stage.scale, stage.pixel, stage.w, stage.h, compact]
  );

  return (
    <div className="stage-mount">
      <StageProvider value={stageValue}>
        <div
          id="stage"
          ref={stageRef}
          className={`stage${cursors ? ' xp-cursors' : ''}`}
          data-theme={state.settings.theme}
          data-compact={compact ? 'true' : undefined}
          data-busy={state.phase === 'boot' ? 'true' : undefined}
          style={{
            width: stage.w,
            height: stage.h,
            transform: `scale(${stage.scale})`,
            ...chromeVars(),
          }}
        >
          {state.phase === 'boot' && <BootScreen onDone={() => dispatch({ type: 'BOOT_DONE' })} />}
          {state.phase === 'login' && <LoginScreen />}
          {state.phase === 'desktop' && <Desktop />}
          {state.phase === 'shutdown' && <ShutdownScreen />}
        </div>
      </StageProvider>
    </div>
  );
}

export default function App() {
  return (
    <OsProvider>
      <Shell />
    </OsProvider>
  );
}
