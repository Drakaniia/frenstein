/**
 * The 10 photos (master spec §3.3, D26; spec 18.7). Order is fixed:
 * `memory1-4`, then `Hover (1)-(6)`. Filenames are placeholders; `caption`
 * slots are ready for the owner. `alt` text is required for all ten.
 */

import hover1 from '@/assets/photos/Hover (1).jpg';
import hover2 from '@/assets/photos/Hover (2).jpg';
import hover3 from '@/assets/photos/Hover (3).jpg';
import hover4 from '@/assets/photos/Hover (4).jpg';
import hover5 from '@/assets/photos/Hover (5).jpg';
import hover6 from '@/assets/photos/Hover (6).jpg';
import memory1 from '@/assets/photos/memory1.jpg';
import memory2 from '@/assets/photos/memory2.jpg';
import memory3 from '@/assets/photos/memory3.jpg';
import memory4 from '@/assets/photos/memory4.jpg';

export interface Photo {
  src: string;
  filename: string;
  caption: string;
  alt: string;
}

const raw: Array<{ src: string; alt: string }> = [
  { src: memory1, alt: 'A treasured memory' },
  { src: memory2, alt: 'A treasured memory' },
  { src: memory3, alt: 'A treasured memory' },
  { src: memory4, alt: 'A treasured memory' },
  { src: hover1, alt: 'A favourite moment' },
  { src: hover2, alt: 'A favourite moment' },
  { src: hover3, alt: 'A favourite moment' },
  { src: hover4, alt: 'A favourite moment' },
  { src: hover5, alt: 'A favourite moment' },
  { src: hover6, alt: 'A favourite moment' },
];

export const PHOTOS: Photo[] = raw.map((p, i) => ({
  src: p.src,
  filename: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
  caption: '',
  alt: p.alt,
}));
