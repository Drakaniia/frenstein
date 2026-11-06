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
import photo5 from '@/assets/photos/photo5.jpg';
import photo6 from '@/assets/photos/photo6.jpg';
import photo7 from '@/assets/photos/photo7.jpg';
import photo8 from '@/assets/photos/photo8.jpg';
import photo9 from '@/assets/photos/photo9.jpg';
import photo10 from '@/assets/photos/photo10.jpg';
import photo11 from '@/assets/photos/photo11.jpg';
import photo12 from '@/assets/photos/photo12.jpg';
import photo13 from '@/assets/photos/photo13.jpg';
import photo14 from '@/assets/photos/photo14.jpg';
import photo15 from '@/assets/photos/photo15.jpg';
import photo16 from '@/assets/photos/photo16.jpg';
import photo17 from '@/assets/photos/photo17.jpg';
import photo18 from '@/assets/photos/photo18.jpg';
import photo19 from '@/assets/photos/photo19.jpg';
import photo20 from '@/assets/photos/photo20.jpg';
import photo21 from '@/assets/photos/photo21.jpg';
import photo22 from '@/assets/photos/photo22.jpg';
import photo23 from '@/assets/photos/photo23.jpg';
import photo24 from '@/assets/photos/photo24.jpg';
import photo25 from '@/assets/photos/photo25.jpg';
import photo26 from '@/assets/photos/photo26.jpg';
import photo27 from '@/assets/photos/photo27.jpg';
import photo28 from '@/assets/photos/photo28.jpg';
import photo29 from '@/assets/photos/photo29.jpg';
import photo30 from '@/assets/photos/photo30.jpg';

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
  { src: photo5, alt: 'A new picture' },
  { src: photo6, alt: 'A new picture' },
  { src: photo7, alt: 'A new picture' },
  { src: photo8, alt: 'A new picture' },
  { src: photo9, alt: 'A new picture' },
  { src: photo10, alt: 'A new picture' },
  { src: photo11, alt: 'A new picture' },
  { src: photo12, alt: 'A new picture' },
  { src: photo13, alt: 'A new picture' },
  { src: photo14, alt: 'A new picture' },
  { src: photo15, alt: 'A new picture' },
  { src: photo16, alt: 'A new picture' },
  { src: photo17, alt: 'A new picture' },
  { src: photo18, alt: 'A new picture' },
  { src: photo19, alt: 'A new picture' },
  { src: photo20, alt: 'A new picture' },
  { src: photo21, alt: 'A new picture' },
  { src: photo22, alt: 'A new picture' },
  { src: photo23, alt: 'A new picture' },
  { src: photo24, alt: 'A new picture' },
  { src: photo25, alt: 'A new picture' },
  { src: photo26, alt: 'A new picture' },
  { src: photo27, alt: 'A new picture' },
  { src: photo28, alt: 'A new picture' },
  { src: photo29, alt: 'A new picture' },
  { src: photo30, alt: 'A new picture' },
];

export const PHOTOS: Photo[] = raw.map((p, i) => ({
  src: p.src,
  filename: `IMG_${String(i + 1).padStart(4, '0')}.jpg`,
  caption: '',
  alt: p.alt,
}));
