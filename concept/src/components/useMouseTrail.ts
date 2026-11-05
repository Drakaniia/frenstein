import { useCallback, useEffect, useRef, useState } from 'react';
import { animate, type AnimationPlaybackControls } from 'motion';

import Hover1 from '@/assets/Hover (1).jpg';
import Hover2 from '@/assets/Hover (2).jpg';
import Hover3 from '@/assets/Hover (3).jpg';
import Hover4 from '@/assets/Hover (4).jpg';
import Hover5 from '@/assets/Hover (5).jpg';
import Hover6 from '@/assets/Hover (6).jpg';
import Memory1 from '@/assets/memory1.jpg';
import Memory2 from '@/assets/memory2.jpg';
import Memory3 from '@/assets/memory3.jpg';
import Memory4 from '@/assets/memory4.jpg';

const trailImagePath = [
  Hover1,
  Hover2,
  Hover3,
  Hover4,
  Hover5,
  Hover6,
  Memory1,
  Memory2,
  Memory3,
  Memory4,
  Memory1,
];

export interface TrailImage {
  id: number;
  x: number;
  y: number;
  image: string;
  ref: HTMLDivElement | null;
}

/** Velocity tracking: store last N pointer positions with timestamps for smooth velocity calculation */
interface VelocitySample {
  x: number;
  y: number;
  t: number;
}

const VELOCITY_SAMPLE_COUNT = 5;
/** Minimum pointer speed (px/s) to spawn trail images */
const MIN_SPEED = 20;
/** Base spawn distance at moderate speed — scales down for faster movement */
const BASE_SPAWN_DISTANCE = 40;
/** How long trail images live before cleanup (ms) */
const TRAIL_LIFETIME = 1800;
/** Max number of trail images on screen simultaneously */
const MAX_TRAIL_IMAGES = 30;

/**
 * Apple Design mouse-trail hook:
 * - Tracks pointer velocity via timestamped position history
 * - Spawns trail elements at velocity-adaptive intervals (faster = denser trail)
 * - Uses motion spring animations for natural enter/exit
 * - Rubber-banding: images resist near container edges
 * - Interruptible: new animations replace old ones seamlessly
 */
export const useMouseTrail = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [trailImages, setTrailImages] = useState<TrailImage[]>([]);
  const imageIdCounter = useRef(0);
  const velocitySamples = useRef<VelocitySample[]>([]);
  const lastSpawnPos = useRef({ x: 0, y: 0 });
  const activeAnimations = useRef<Map<number, AnimationPlaybackControls>>(
    new Map()
  );

  /** Calculate velocity from recent samples (px/s) */
  const getVelocity = useCallback(() => {
    const samples = velocitySamples.current;
    if (samples.length < 2) return { vx: 0, vy: 0, speed: 0 };

    const first = samples[0];
    const last = samples[samples.length - 1];
    const dt = (last.t - first.t) / 1000;
    if (dt <= 0) return { vx: 0, vy: 0, speed: 0 };

    const vx = (last.x - first.x) / dt;
    const vy = (last.y - first.y) / dt;
    const speed = Math.sqrt(vx * vx + vy * vy);
    return { vx, vy, speed };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handlePointerMove = (e: PointerEvent) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // Record velocity sample
      const now = performance.now();
      const samples = velocitySamples.current;
      samples.push({ x, y, t: now });
      if (samples.length > VELOCITY_SAMPLE_COUNT) samples.shift();

      const { speed } = getVelocity();

      // Only spawn if moving (above minimum speed)
      if (speed < MIN_SPEED) return;

      // Adaptive spacing: faster movement = spawn closer together
      // Base distance divided by speed factor, clamped to reasonable range
      const speedFactor = Math.min(speed / 200, 3);
      const spawnDistance = Math.max(15, BASE_SPAWN_DISTANCE / speedFactor);

      const dx = x - lastSpawnPos.current.x;
      const dy = y - lastSpawnPos.current.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < spawnDistance) return;

      lastSpawnPos.current = { x, y };

      // Cap trail image count — remove oldest if over limit
      setTrailImages(prev => {
        if (prev.length >= MAX_TRAIL_IMAGES) {
          // Clean up oldest animation
          const oldest = prev[0];
          const anim = activeAnimations.current.get(oldest.id);
          anim?.stop();
          activeAnimations.current.delete(oldest.id);
          return [
            ...prev.slice(1),
            {
              id: imageIdCounter.current++,
              x,
              y,
              image: trailImagePath[
                Math.floor(Math.random() * trailImagePath.length)
              ],
              ref: null,
            },
          ];
        }
        return [
          ...prev,
          {
            id: imageIdCounter.current++,
            x,
            y,
            image: trailImagePath[
              Math.floor(Math.random() * trailImagePath.length)
            ],
            ref: null,
          },
        ];
      });
    };

    const handlePointerLeave = () => {
      // Clear velocity samples when pointer leaves
      velocitySamples.current = [];
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
      // Clean up all active animations
      activeAnimations.current.forEach(anim => anim.stop());
      activeAnimations.current.clear();
    };
  }, [getVelocity]);

  // Animate each trail image with motion springs
  // Phase 1: spring pop-in with overshoot. Phase 2: smooth fade-out.
  useEffect(() => {
    trailImages.forEach(img => {
      if (!img.ref) return;
      if (activeAnimations.current.has(img.id)) return;

      const rotation = Math.random() * 30 - 15;

      // Phase 1: Spring pop-in (short, bouncy)
      const popIn = animate(
        img.ref,
        { scale: [0, 1.15, 1], opacity: [0, 1] },
        { type: 'spring', bounce: 0.3, duration: 0.35 }
      );

      // Phase 2: After pop-in, gentle fade-out over remaining lifetime
      popIn.then(() => {
        const controls = animate(
          img.ref!,
          { opacity: [1, 0], rotate: rotation },
          { duration: (TRAIL_LIFETIME - 350) / 1000, ease: 'ease-out' }
        );

        controls.then(() => {
          activeAnimations.current.delete(img.id);
          setTrailImages(prev => prev.filter(i => i.id !== img.id));
        });

        // Replace the pop-in entry with the fade-out so it can be interrupted
        activeAnimations.current.set(img.id, controls);
      });

      activeAnimations.current.set(img.id, popIn);
    });
  }, [trailImages]);

  return { containerRef, trailImages };
};
