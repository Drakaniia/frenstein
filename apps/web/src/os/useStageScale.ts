import { useEffect, useState } from 'react';

/**
 * FrenOS renders into a logical stage that is scaled to fill the viewport.
 *
 * The scale is chosen so that one logical px is always a *whole* number of
 * device px (`pixel`). That is what keeps the pixel-art wallpaper, icons and
 * cursor crisp on 100 %, 125 %, 150 % and 200 % displays alike, while the
 * Luna chrome (gradients, rounded corners, Tahoma) renders sharply anyway.
 *
 * Desktops aim for an XP-sized desktop of roughly 960 × 540 logical px.
 * Phones aim for a ~320 px short side so every control stays finger-sized;
 * their scale may be fractional (on 2–3× screens that is invisible).
 */
export const DESKTOP_TARGET = { w: 960, h: 540 } as const;
export const PHONE_SHORT_SIDE = 320;
export const MAX_DEVICE_PIXEL = 8;

export interface StageSize {
  /** CSS px per logical stage px (may be fractional). */
  scale: number;
  /** Device px per logical stage px (an integer on desktops). */
  pixel: number;
  w: number;
  h: number;
}

export function computeStage(vw: number, vh: number, dpr = 1): StageSize {
  const width = Math.max(1, vw);
  const height = Math.max(1, vh);
  const ratio = Number.isFinite(dpr) && dpr > 0 ? dpr : 1;
  const shortSide = Math.min(width, height);

  if (shortSide < 500) {
    // Phones: a ~320 px short side, never smaller than 1 CSS px per stage px.
    const scale = Math.max(1, shortSide / PHONE_SHORT_SIDE);
    return { scale, pixel: scale * ratio, w: Math.ceil(width / scale), h: Math.ceil(height / scale) };
  }

  // Desktops and tablets: the largest crisp scale that still leaves room.
  const desired = Math.max(1, Math.min(width / DESKTOP_TARGET.w, height / DESKTOP_TARGET.h));
  // Never render the stage below roughly 1 CSS px per logical px.
  const floor = Math.max(1, Math.ceil(ratio - 0.01));
  const pixel = Math.min(MAX_DEVICE_PIXEL, Math.max(floor, Math.floor(desired * ratio + 0.02)));

  const scale = pixel / ratio;
  return { scale, pixel, w: Math.ceil(width / scale), h: Math.ceil(height / scale) };
}

function measure(): StageSize {
  if (typeof window === 'undefined') return computeStage(1280, 720, 1);
  return computeStage(window.innerWidth, window.innerHeight, window.devicePixelRatio || 1);
}

export function useStageScale(): StageSize {
  const [stage, setStage] = useState<StageSize>(measure);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measure();
        setStage((prev) =>
          prev.w === next.w && prev.h === next.h && prev.scale === next.scale ? prev : next
        );
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.visualViewport?.addEventListener('resize', update);
    // ResizeObserver covers split-screen, devtools and programmatic viewport
    // changes that do not always emit a window resize event.
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(update) : null;
    observer?.observe(document.documentElement);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.visualViewport?.removeEventListener('resize', update);
      observer?.disconnect();
    };
  }, []);

  return stage;
}
