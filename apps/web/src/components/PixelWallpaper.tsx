import { memo, useEffect, useRef } from 'react';

import { useStage } from '@/os/StageContext';
import type { WallpaperId } from '@/os/types';
import { buildScene, type Scene } from '@/wallpaper/scenes';

/** Logical stage px per wallpaper art pixel: ~420 art px across on desktops. */
export function artScale(stageW: number): number {
  return Math.max(1, Math.min(6, Math.round(stageW / 420)));
}

interface PixelWallpaperProps {
  scene: WallpaperId;
  /** Run the animation loop (off = one still frame). */
  animate: boolean;
  /** Fewer particles and a lower frame rate. */
  lite?: boolean;
  /** Clicks puff little hearts; shooting stars can be caught. */
  interactive?: boolean;
  onWish?: () => void;
  onPointerDown?: (event: React.PointerEvent<HTMLDivElement>) => void;
}

/**
 * The animated pixel-art desktop background. The scene is painted at a low
 * "art resolution" into a canvas and upscaled by whole pixels, so it stays
 * crisp, costs a few draw calls per frame and pauses whenever it is hidden.
 */
export const PixelWallpaper = memo(function PixelWallpaper({
  scene,
  animate,
  lite = false,
  interactive = true,
  onWish,
  onPointerDown,
}: PixelWallpaperProps) {
  const { stageW, stageH } = useStage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const timeRef = useRef(0);
  const wishRef = useRef(onWish);
  wishRef.current = onWish;

  const k = artScale(stageW);
  const w = Math.ceil(stageW / k);
  const h = Math.ceil(stageH / k);

  // (Re)paint the static layers when the scene or the art size changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = w;
    canvas.height = h;
    sceneRef.current = buildScene(scene, w, h, { lite });
    const g = canvas.getContext('2d');
    if (g) {
      g.imageSmoothingEnabled = false;
      sceneRef.current.draw(g, timeRef.current, 0);
    }
  }, [scene, w, h, lite]);

  // The frame loop.
  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    g.imageSmoothingEnabled = false;
    if (!animate) {
      sceneRef.current?.draw(g, timeRef.current, 0);
      return;
    }
    const frameMs = 1000 / (lite ? 18 : 24);
    let raf = 0;
    let last = performance.now();
    let acc = frameMs;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = Math.min(250, now - last);
      last = now;
      if (document.hidden) return;
      acc += elapsed;
      if (acc < frameMs) return;
      const dt = Math.min(0.12, acc / 1000);
      acc %= frameMs;
      timeRef.current += dt;
      sceneRef.current?.draw(g, timeRef.current, dt);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animate, lite]);

  return (
    <div
      className="wallpaper-layer"
      aria-hidden
      onPointerDown={(event) => {
        onPointerDown?.(event);
        const canvas = canvasRef.current;
        const sceneNow = sceneRef.current;
        if (!canvas || !sceneNow || event.button !== 0) return;
        const rect = canvas.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
        const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
        if (animate && sceneNow.wish(x, y)) {
          wishRef.current?.();
          return;
        }
        if (interactive && animate) sceneNow.burst(x, y);
      }}
    >
      <canvas ref={canvasRef} className="wallpaper-canvas" style={{ width: w * k, height: h * k }} />
    </div>
  );
});
