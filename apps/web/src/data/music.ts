/**
 * The Music playlist, resolved against the files that actually exist in
 * `src/assets/audio/`. Audio is lazy-loaded (each song becomes its own file
 * that downloads on first play); covers are small and bundled eagerly.
 *
 * To add a song, drop `<file>.mp3` (and optionally `<cover>.jpg`) into
 * `src/assets/audio/` and list it in `CONTENT.musicPlaylist`.
 */

import { CONTENT } from './content';

const AUDIO = import.meta.glob<string>('../assets/audio/*.{mp3,m4a,ogg,wav}', { query: '?url', import: 'default' });
const COVERS = import.meta.glob<string>('../assets/audio/*.{jpg,jpeg,png,webp}', { eager: true, query: '?url', import: 'default' });

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1).replace(/\.[^.]+$/, '').toLowerCase();

const audioByName = new Map(Object.entries(AUDIO).map(([path, load]) => [baseName(path), load]));
const coverByName = new Map(Object.entries(COVERS).map(([path, url]) => [baseName(path), url]));

export interface Song {
  id: string;
  title: string;
  artist: string;
  /** Display length until the real one is known from the file. */
  duration: string;
  /** Lazily resolves to the audio URL, or `null` when the file is missing. */
  load: (() => Promise<string>) | null;
  cover: string | null;
  fileName: string;
}

interface TrackDef {
  id: string;
  title: string;
  artist: string;
  duration: string;
  file: string;
  cover?: string;
}

export const PLAYLIST: Song[] = (CONTENT.musicPlaylist as readonly TrackDef[]).map((track) => ({
  id: track.id,
  title: track.title,
  artist: track.artist,
  duration: track.duration,
  load: audioByName.get(track.file.toLowerCase()) ?? null,
  cover: coverByName.get((track.cover ?? track.file).toLowerCase()) ?? coverByName.get('cover') ?? null,
  fileName: `${track.file}.mp3`,
}));

if (import.meta.env.DEV) {
  for (const song of PLAYLIST) {
    if (!song.load) console.info(`[Music] "${song.title}" is listed but src/assets/audio/${song.fileName} is missing.`);
  }
}
