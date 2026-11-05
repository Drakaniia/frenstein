import { useEffect, useRef, useState } from 'react';

import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import { usePrefersReducedMotion } from '@/os/useMedia';
import { heartSprite } from '@/wallpaper/paint';
import { artScale } from './PixelWallpaper';

interface Drop {
  x: number;
  y: number;
  vy: number;
  sway: number;
  phase: number;
  sprite: HTMLCanvasElement;
}

const PALETTE: Array<[string, string, string]> = [
  ['#ff5d85', '#ffd0dc', '#b3153f'],
  ['#ff8fb1', '#ffe6ee', '#d34d78'],
  ['#e23b4e', '#ffb3c0', '#8f1530'],
  ['#ffd1e0', '#ffffff', '#ff7aa2'],
  ['#c9a8ff', '#f3eaff', '#8f6ad8'],
];

/**
 * A shower of pixel hearts over the whole desktop, started by the Konami
 * code, the Run box, or a certain famous virus. Runs ~7 s, then removes
 * itself.
 */
export function LoveRain({ trigger }: { trigger: number }) {
  const { stageW, stageH } = useStage();
  const reduced = usePrefersReducedMotion();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [run, setRun] = useState(0);

  useEffect(() => {
    if (trigger > 0 && !reduced) setRun(trigger);
  }, [trigger, reduced]);

  const k = artScale(stageW);
  const w = Math.ceil(stageW / k);
  const h = Math.ceil(stageH / k);

  useEffect(() => {
    if (!run) return;
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    g.imageSmoothingEnabled = false;
    playSfx('sparkle');
    const sprites = [7, 9, 11, 13].flatMap((size) => PALETTE.map(([f, l, r]) => heartSprite(size, f, l, r)));
    const drops: Drop[] = [];
    const total = Math.round(w / 4);
    let spawned = 0;
    let raf = 0;
    let last = performance.now();
    let elapsed = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      elapsed += dt;
      const want = Math.min(total, Math.round((elapsed / 3.5) * total));
      while (spawned < want) {
        spawned++;
        drops.push({
          x: Math.random() * w,
          y: -14 - Math.random() * 20,
          vy: 30 + Math.random() * 45,
          sway: 6 + Math.random() * 14,
          phase: Math.random() * Math.PI * 2,
          sprite: sprites[Math.floor(Math.random() * sprites.length)] as HTMLCanvasElement,
        });
      }
      g.clearRect(0, 0, w, h);
      let alive = 0;
      for (const d of drops) {
        d.y += d.vy * dt;
        d.phase += dt * 2;
        if (d.y > h + 4) continue;
        alive++;
        g.globalAlpha = Math.min(1, (h - d.y) / (h * 0.25));
        g.drawImage(d.sprite, Math.round(d.x + Math.sin(d.phase) * d.sway * 0.3), Math.round(d.y));
      }
      g.globalAlpha = 1;
      if (spawned >= total && alive === 0) {
        setRun(0);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [run, w, h]);

  if (!run) return null;
  return (
    <div className="fx-layer" aria-hidden>
      <canvas ref={canvasRef} width={w} height={h} style={{ width: w * k, height: h * k }} />
    </div>
  );
}
