/**
 * Photos. Order is fixed.
 */

import hover2 from '@/assets/photos/Hover (2).jpg';
import hover3 from '@/assets/photos/Hover (3).jpg';
import memory2 from '@/assets/photos/memory2.jpg';
import memory3 from '@/assets/photos/memory3.jpg';
import photo1 from '@/assets/photos/photo1.jpg';
import photo2 from '@/assets/photos/photo2.jpg';
import photo3 from '@/assets/photos/photo3.jpg';
import photo4 from '@/assets/photos/photo4.jpg';

export interface Photo {
  src: string;
  filename: string;
  caption: string;
  alt: string;
}

const raw: Array<{ src: string; alt: string }> = [
  { src: memory2, alt: 'A treasured memory' },
  { src: memory3, alt: 'A treasured memory' },
  { src: hover2, alt: 'A favourite moment' },
  { src: hover3, alt: 'A favourite moment' },
  { src: photo1, alt: 'A new picture' },
  { src: photo2, alt: 'A new picture' },
  { src: photo3, alt: 'A new picture' },
  { src: photo4, alt: 'A new picture' },
];

export const PHOTOS: Photo[] = raw.map((p, i) => ({
  src: p.src,
  filename: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
  caption: '',
  alt: p.alt,
}));
