import { useEffect, useRef, useState } from 'react';

import { artScale } from '@/components/PixelWallpaper';
import { Icon } from '@/components/Icon';
import { PHOTOS } from '@/data/photos';
import { useStage } from '@/os/StageContext';
import type { ScreensaverId } from '@/os/types';
import { heartSprite } from '@/wallpaper/paint';

interface ScreensaverProps {
  mode: ScreensaverId;
  /** First photo for the slideshow. */
  start?: number;
  onDismiss: () => void;
}

/**
 * Full-screen screen savers: "My Pictures Slideshow", a starfield with a
 * few pink hearts flying by, and the bouncing FrenOS logo. Moving the mouse,
 * clicking or pressing a key wakes the computer; that input is swallowed so
 * nothing underneath is clicked by accident.
 */
export function Screensaver({ mode, start = 0, onDismiss }: ScreensaverProps) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    let armed = false;
    let origin: { x: number; y: number } | null = null;
    const arm = window.setTimeout(() => {
      armed = true;
    }, 700);
    const wake = (e: Event) => {
      if (!armed) return;
      e.preventDefault();
      e.stopPropagation();
      dismissRef.current();
    };
    const onMove = (e: PointerEvent) => {
      if (!armed) return;
      if (!origin) {
        origin = { x: e.clientX, y: e.clientY };
        return;
      }
      if (Math.hypot(e.clientX - origin.x, e.clientY - origin.y) > 12) dismissRef.current();
    };
    window.addEventListener('keydown', wake, true);
    window.addEventListener('pointerdown', wake, true);
    window.addEventListener('pointermove', onMove, true);
    return () => {
      window.clearTimeout(arm);
      window.removeEventListener('keydown', wake, true);
      window.removeEventListener('pointerdown', wake, true);
      window.removeEventListener('pointermove', onMove, true);
    };
  }, []);

  return (
    <div className="screensaver" role="presentation" aria-hidden>
      {mode === 'slideshow' && PHOTOS.length > 0 ? <Slideshow start={start} /> : null}
      {mode === 'starfield' || (mode === 'slideshow' && PHOTOS.length === 0) ? <Starfield /> : null}
      {mode === 'hearts' ? <BouncingLogo /> : null}
      <span className="ss-hint">Move the mouse or press any key</span>
    </div>
  );
}

/* ── My Pictures Slideshow ────────────────────────────────────────────── */

function Slideshow({ start }: { start: number }) {
  const count = PHOTOS.length;
  const [index, setIndex] = useState(() => ((start % count) + count) % count);
  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), 6500);
    return () => window.clearInterval(id);
  }, [count]);
  const photo = PHOTOS[index];
  const near = (i: number) => i === index || i === (index + 1) % count || i === (index - 1 + count) % count;
  return (
    <>
      {PHOTOS.map((p, i) => (
        <div key={p.filename} className="ss-slide" data-on={i === index ? 'true' : undefined}>
          {near(i) ? <img src={p.src} alt="" /> : null}
        </div>
      ))}
      {photo ? <div className="ss-caption">{photo.caption || photo.alt}</div> : null}
    </>
  );
}

/* ── Starfield ────────────────────────────────────────────────────────── */

interface Star {
  x: number;
  y: number;
  z: number;
  heart: boolean;
}

function Starfield() {
  const { stageW, stageH, compact } = useStage();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const k = artScale(stageW);
  const w = Math.ceil(stageW / k);
  const h = Math.ceil(stageH / k);

  useEffect(() => {
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    g.imageSmoothingEnabled = false;
    const hearts = [
      heartSprite(5, '#ff5d85', '#ffd0dc', '#b3153f'),
      heartSprite(7, '#ff8fb1', '#ffe6ee', '#d34d78'),
      heartSprite(9, '#ff5d85', '#ffd0dc', '#b3153f'),
    ];
    const count = compact ? 90 : 170;
    const make = (far = false): Star => ({
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2,
      z: far ? 1 : 0.05 + Math.random() * 0.95,
      heart: Math.random() < 0.05,
    });
    const stars = Array.from({ length: count }, () => make());
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      g.fillStyle = '#000';
      g.fillRect(0, 0, w, h);
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i] as Star;
        s.z -= dt * 0.22;
        const px = w / 2 + (s.x / s.z) * (w * 0.5);
        const py = h / 2 + (s.y / s.z) * (h * 0.5);
        if (s.z <= 0.02 || px < -10 || py < -10 || px > w + 10 || py > h + 10) {
          stars[i] = make(true);
          continue;
        }
        const near = 1 - s.z;
        if (s.heart) {
          const sprite = hearts[near > 0.75 ? 2 : near > 0.45 ? 1 : 0] as HTMLCanvasElement;
          g.globalAlpha = Math.min(1, near * 1.6);
          g.drawImage(sprite, Math.round(px - sprite.width / 2), Math.round(py - sprite.height / 2));
        } else {
          const b = Math.round(120 + near * 135);
          g.globalAlpha = 1;
          g.fillStyle = `rgb(${b},${b},${Math.min(255, b + 20)})`;
          const size = near > 0.8 ? 2 : 1;
          g.fillRect(Math.round(px), Math.round(py), size, size);
        }
      }
      g.globalAlpha = 1;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [w, h, compact]);

  return <canvas ref={canvasRef} className="ss-canvas" width={w} height={h} style={{ width: w * k, height: h * k }} />;
}

/* ── Bouncing FrenOS logo ─────────────────────────────────────────────── */

const LOGO_COLORS = ['#ffffff', '#ff8fb1', '#ffd23f', '#7fd4ff', '#9be15d', '#c9a8ff', '#ff9a3c'];

function BouncingLogo() {
  const { stageW, stageH } = useStage();
  const ref = useRef<HTMLDivElement>(null);
  const [color, setColor] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let x = Math.random() * Math.max(1, stageW - 200);
    let y = Math.random() * Math.max(1, stageH - 60);
    let vx = 42;
    let vy = 32;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const bw = el.offsetWidth;
      const bh = el.offsetHeight;
      x += vx * dt;
      y += vy * dt;
      let bounced = false;
      if (x < 0 || x + bw > stageW) {
        vx = -vx;
        x = Math.max(0, Math.min(stageW - bw, x));
        bounced = true;
      }
      if (y < 0 || y + bh > stageH) {
        vy = -vy;
        y = Math.max(0, Math.min(stageH - bh, y));
        bounced = true;
      }
      if (bounced) setColor((c) => (c + 1) % LOGO_COLORS.length);
      el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [stageW, stageH]);

  return (
    <div ref={ref} className="ss-logo" style={{ color: LOGO_COLORS[color] }}>
      <Icon name="logo-32" size={32} />
      <span>
        FrenOS<sup style={{ fontStyle: 'italic', color: '#ff9a3c' }}>xp</sup> ♥
      </span>
    </div>
  );
}
