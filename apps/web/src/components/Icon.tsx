import type { CSSProperties } from 'react';

import { iconSize, iconUrl } from '@/lib/icons';
import { useStage } from '@/os/StageContext';

interface IconProps {
  name: string;
  /** Display size in logical stage px (defaults to the art's own size). */
  size?: number;
  className?: string;
  style?: CSSProperties;
  /** A label makes the icon meaningful; omit it and the icon is decorative. */
  alt?: string;
}

/**
 * Renders a code-drawn pixel icon as crisply as the display allows: whole
 * multiples of the art size are upscaled with nearest-neighbour sampling;
 * anything else is drawn from a supersampled copy with smooth filtering, so
 * the pixels never come out uneven.
 */
export function Icon({ name, size, className, style, alt }: IconProps) {
  const { pixel } = useStage();
  const grid = iconSize(name);
  const display = size ?? grid;
  // Device pixels per art pixel at this size.
  const ratio = (display * pixel) / grid;
  const crisp = ratio >= 1 && Math.abs(ratio - Math.round(ratio)) < 0.02;
  const rendering: CSSProperties['imageRendering'] = crisp ? 'pixelated' : 'auto';
  const upscale = crisp ? 1 : Math.max(1, Math.ceil(ratio));
  return (
    <img
      src={iconUrl(name, upscale)}
      width={display}
      height={display}
      alt={alt ?? ''}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={className}
      style={{ imageRendering: rendering, flex: 'none', ...style }}
    />
  );
}
