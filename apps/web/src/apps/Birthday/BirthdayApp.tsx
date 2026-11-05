import { useEffect, useRef, useState } from 'react';

import { Button } from '@/components/controls';
import { CONTENT } from '@/data/content';
import { useOs } from '@/os/OsProvider';
import { readNumber, STORAGE_KEYS, writeNumber } from '@/os/persistence';
import { playBirthdaySong, playSfx, unlockAudio } from '@/os/sfx';
import { usePrefersReducedMotion } from '@/os/useMedia';
import type { WindowState } from '@/os/types';
import { PartyScene } from './scene';

type Phase = 'wish' | 'celebrate';

/**
 * Happy Birthday! — the present. A little pixel party: blow out the candles
 * (click them one by one, or press the button), make a wish, pop balloons for
 * love notes, and the computer plays "Happy Birthday" on a music box.
 */
export function BirthdayApp({ win }: { win: WindowState }) {
  const { dispatch, openApp } = useOs();
  const reduced = usePrefersReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<PartyScene | null>(null);
  const timers = useRef<number[]>([]);
  const noteIndex = useRef(Math.floor(Math.random() * CONTENT.loveNotes.length));
  const [size, setSize] = useState<{ w: number; h: number; zoom: number } | null>(null);
  const [phase, setPhase] = useState<Phase>('wish');
  const [note, setNote] = useState<string>(`Make a wish, ${CONTENT.user.name}, then blow out the candles.`);
  const [wishes, setWishes] = useState(() => readNumber(STORAGE_KEYS.wishes, 0));
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  // Fit the art to the window: whole stage pixels per art pixel.
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      const cw = Math.floor(entry?.contentRect.width ?? 0);
      const ch = Math.floor(entry?.contentRect.height ?? 0);
      if (cw < 40 || ch < 40) return;
      const zoom = cw < 300 ? 1 : cw < 600 ? 2 : 3;
      const w = Math.floor(cw / zoom);
      const h = Math.floor(ch / zoom);
      setSize((s) => (s && s.w === w && s.h === h && s.zoom === zoom ? s : { w, h, zoom }));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Rebuild the scene when the art size changes, keeping the candles' state.
  useEffect(() => {
    if (!size) return;
    const scene = new PartyScene(size.w, size.h, CONTENT.birthday.age);
    if (phaseRef.current === 'celebrate') scene.candles.forEach((c) => (c.lit = false));
    sceneRef.current = scene;
  }, [size]);

  // The party loop (about 30 fps, paused while minimized or hidden).
  useEffect(() => {
    if (!size) return;
    const canvas = canvasRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    g.imageSmoothingEnabled = false;
    let raf = 0;
    let last = performance.now();
    let t = 0;
    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const elapsed = (now - last) / 1000;
      if (elapsed < 1 / 32) return;
      last = now;
      if (document.hidden || canvas.offsetParent === null) return;
      const dt = Math.min(0.1, elapsed);
      t += dt;
      sceneRef.current?.draw(g, t, reduced ? 0 : dt);
    };
    sceneRef.current?.draw(g, 0, 0);
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [size, reduced]);

  const nextNote = () => {
    const notes = CONTENT.loveNotes;
    const text = notes[noteIndex.current % notes.length] as string;
    noteIndex.current += 1;
    return text;
  };

  const celebrate = () => {
    if (phaseRef.current === 'celebrate') return;
    setPhase('celebrate');
    const count = wishes + 1;
    setWishes(count);
    writeNumber(STORAGE_KEYS.wishes, count);
    playSfx('tada');
    sceneRef.current?.confetti(reduced ? 40 : 160);
    setNote(count > 1 ? `Wish #${count} is on its way. Every one of them is about you.` : 'Your wish has been sent. I hope every single part of it comes true.');
    dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: CONTENT.birthday.label });
    later(() => playBirthdaySong(), 1300);
    later(() => dispatch({ type: 'LOVE_RAIN' }), 900);
  };

  const blowAll = () => {
    const scene = sceneRef.current;
    if (!scene || scene.litCount === 0) return;
    unlockAudio();
    playSfx('blow');
    scene.candles.filter((c) => c.lit).forEach((candle, i) => later(() => scene.blow(candle), i * 110));
    later(celebrate, scene.candles.length * 110 + 450);
  };

  const relight = () => {
    sceneRef.current?.relight();
    setPhase('wish');
    playSfx('sparkle');
    setNote('Candles lit again. Make another wish!');
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const scene = sceneRef.current;
    if (!scene || !size) return;
    unlockAudio();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * size.w;
    const y = ((e.clientY - rect.top) / rect.height) * size.h;
    if (scene.pop(x, y)) {
      playSfx('pop');
      setNote(nextNote());
      return;
    }
    const candle = scene.candleAt(x, y);
    if (candle) {
      playSfx('blow');
      scene.blow(candle);
      if (scene.litCount === 0) later(celebrate, 450);
      else setNote(`${scene.litCount} candle${scene.litCount === 1 ? '' : 's'} to go…`);
    }
  };

  const title = phase === 'celebrate' ? CONTENT.birthday.label : `Make a wish, ${CONTENT.user.name}!`;

  return (
    <div className="bday">
      <div className="bday-stage" ref={stageRef}>
        {size ? (
          <canvas
            ref={canvasRef}
            width={size.w}
            height={size.h}
            role="img"
            aria-label="A birthday party: a cake with lit candles, balloons and bunting. Click the candles to blow them out, or the balloons to pop them."
            style={{ width: size.w * size.zoom, height: size.h * size.zoom }}
            onPointerDown={onPointerDown}
          />
        ) : null}
        <div className="bday-banner" aria-live="polite">
          {title}
        </div>
        <div key={note} className="bday-note" role="status">
          {note}
        </div>
      </div>
      <div className="bday-bar">
        {phase === 'wish' ? (
          <Button isDefault onClick={blowAll}>
            Blow out the candles
          </Button>
        ) : (
          <Button onClick={relight}>Light the candles again</Button>
        )}
        <Button
          onClick={() => {
            unlockAudio();
            if (!playBirthdaySong()) setNote('Turn the sound on to hear the song (the speaker by the clock).');
          }}
        >
          ♪ Play the song
        </Button>
        <Button onClick={() => openApp('notepad')}>Read my letter</Button>
        <Button onClick={() => dispatch({ type: 'LOVE_RAIN' })}>Rain hearts</Button>
      </div>
    </div>
  );
}
