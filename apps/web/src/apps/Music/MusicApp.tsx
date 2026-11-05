import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

import { Glyph } from '@/components/Glyph';
import { Icon } from '@/components/Icon';
import { Menu, MenuBar, MenuItem, MenuSeparator } from '@/components/MenuBar';
import { CONTENT } from '@/data/content';
import { PLAYLIST, type Song } from '@/data/music';
import { useOs } from '@/os/OsProvider';
import { audioContext, unlockAudio } from '@/os/sfx';
import { usePrefersReducedMotion } from '@/os/useMedia';
import type { WindowState } from '@/os/types';

const BARS = 19;
const VIZ_W = BARS * 4;
const VIZ_H = 16;

function formatTime(time: number): string {
  if (!Number.isFinite(time) || time < 0) return '0:00';
  const minutes = Math.floor(time / 60);
  const seconds = Math.floor(time % 60);
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

const playable = (i: number) => !!PLAYLIST[i]?.load;

/** The next playable track after `from` in `dir`, wrapping; -1 when none. */
function step(from: number, dir: 1 | -1): number {
  for (let k = 1; k <= PLAYLIST.length; k++) {
    const i = (from + dir * k + PLAYLIST.length * 2) % PLAYLIST.length;
    if (playable(i)) return i;
  }
  return -1;
}

const indexFor = (payload: WindowState['payload']): number | null => {
  if (typeof payload === 'number' && PLAYLIST[payload]) return payload;
  if (typeof payload === 'string') {
    const i = PLAYLIST.findIndex((s) => s.id === payload);
    if (i >= 0) return i;
  }
  return null;
};

/**
 * Music — a little Winamp-style player inside an XP window. It plays our
 * songs (each lazy-loaded on first play) with a live spectrum analyser, seek,
 * volume, repeat and a playlist that moves on to the next song by itself.
 * Minimizing the window keeps the music on.
 */
export function MusicApp({ win }: { win: WindowState }) {
  const { state, dispatch, openApp } = useOs();
  const reduced = usePrefersReducedMotion();
  const audioRef = useRef<HTMLAudioElement>(null);
  const vizRef = useRef<HTMLCanvasElement>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const loadedId = useRef<string | null>(null);
  const [current, setCurrent] = useState(() => indexFor(win.payload) ?? Math.max(0, step(-1, 1)));
  const [selected, setSelected] = useState(current);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [lengths, setLengths] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repeat, setRepeat] = useState(false);
  const [elapsedMode, setElapsedMode] = useState(true);
  const rev = useRef(win.payloadRev);
  const { muted, volume } = state.settings;
  const song = PLAYLIST[current] as Song;

  // Latest values for the audio element's event handlers.
  const live = useRef<{ current: number; repeat: boolean; play: (i: number) => Promise<void> }>({
    current,
    repeat,
    play: () => Promise.resolve(),
  });

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onMeta = () => {
      const d = audio.duration || 0;
      setDuration(d);
      const id = loadedId.current;
      if (id && d) setLengths((l) => (l[id] === d ? l : { ...l, [id]: d }));
    };
    const onTime = () => setTime(audio.currentTime || 0);
    const onEnded = () => {
      const { current: now, repeat: loop, play: playAt } = live.current;
      if (loop) return;
      const next = step(now, 1);
      if (next > now) {
        void playAt(next);
      } else {
        setPlaying(false);
        setTime(0);
      }
    };
    const onErr = () => {
      if (!audio.getAttribute('src')) return;
      setError('This song could not be played.');
      setPlaying(false);
      setLoading(false);
    };
    audio.addEventListener('loadedmetadata', onMeta);
    audio.addEventListener('timeupdate', onTime);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onErr);
    return () => {
      audio.removeEventListener('loadedmetadata', onMeta);
      audio.removeEventListener('timeupdate', onTime);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onErr);
      audio.pause();
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume / 100;
  }, [muted, volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.loop = repeat;
  }, [repeat]);

  useEffect(() => {
    dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: playing ? `${song.title} - ${song.artist} - Music` : 'Music' });
  }, [dispatch, win.id, playing, song]);

  // Opening Music again with a song (e.g. Run → "lover") selects it.
  useEffect(() => {
    if (rev.current === win.payloadRev) return;
    rev.current = win.payloadRev;
    const i = indexFor(win.payload);
    if (i !== null) setSelected(i);
  }, [win.payloadRev, win.payload]);

  // The spectrum analyser: real FFT data when Web Audio is available.
  useEffect(() => {
    const canvas = vizRef.current;
    const g = canvas?.getContext('2d');
    if (!canvas || !g) return;
    const peaks = new Array<number>(BARS).fill(0);
    const bins = new Uint8Array(64);
    let raf = 0;
    let t = 0;
    const draw = () => {
      raf = requestAnimationFrame(draw);
      t += 1;
      g.fillStyle = '#000';
      g.fillRect(0, 0, VIZ_W, VIZ_H);
      const node = analyser.current;
      if (node && playing) node.getByteFrequencyData(bins);
      for (let b = 0; b < BARS; b++) {
        let level = 0;
        if (playing) {
          if (node) {
            const lo = Math.floor(Math.pow(b / BARS, 1.6) * 48);
            const hi = Math.max(lo + 1, Math.floor(Math.pow((b + 1) / BARS, 1.6) * 48));
            let sum = 0;
            for (let i = lo; i < hi; i++) sum += bins[i] ?? 0;
            level = sum / (hi - lo) / 255;
          } else {
            level = 0.35 + 0.3 * Math.sin(t * 0.21 + b * 0.9) * Math.sin(t * 0.07 + b * 0.31);
          }
        }
        const h = Math.max(0, Math.min(VIZ_H, Math.round(level * VIZ_H)));
        peaks[b] = Math.max(h, (peaks[b] ?? 0) - 0.35);
        for (let y = 0; y < h; y++) {
          g.fillStyle = y > 12 ? '#d63a13' : y > 8 ? '#d6c013' : y > 4 ? '#7ad613' : '#13b113';
          g.fillRect(b * 4, VIZ_H - 1 - y, 3, 1);
        }
        const peak = Math.round(peaks[b] ?? 0);
        if (peak > 0) {
          g.fillStyle = '#b8b8c8';
          g.fillRect(b * 4, VIZ_H - 1 - peak, 3, 1);
        }
      }
      if (!playing && peaks.every((p) => p <= 0)) cancelAnimationFrame(raf);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  const connectAnalyser = (audio: HTMLAudioElement) => {
    if (analyser.current) return;
    const ctx = audioContext();
    if (!ctx) return;
    try {
      const source = ctx.createMediaElementSource(audio);
      const node = ctx.createAnalyser();
      node.fftSize = 128;
      node.smoothingTimeConstant = 0.72;
      source.connect(node);
      node.connect(ctx.destination);
      analyser.current = node;
    } catch {
      /* the element is already wired, or Web Audio is unavailable */
    }
  };

  /** Play track `index` (loading it first if needed). */
  const playAt = async (index: number) => {
    const audio = audioRef.current;
    const target = PLAYLIST[index];
    if (!audio || !target) return;
    setCurrent(index);
    setSelected(index);
    if (!target.load) {
      setError(`“${target.title}” isn't on this computer yet.`);
      setPlaying(false);
      return;
    }
    unlockAudio();
    setError(null);
    setLoading(true);
    try {
      if (loadedId.current !== target.id) {
        audio.pause();
        audio.src = await target.load();
        loadedId.current = target.id;
        setTime(0);
        setDuration(lengths[target.id] ?? 0);
      }
      connectAnalyser(audio);
      await audio.play();
      setPlaying(true);
    } catch {
      setError(`“${target.title}” could not be played.`);
      setPlaying(false);
    } finally {
      setLoading(false);
    }
  };
  live.current = { current, repeat, play: playAt };

  const play = () => void playAt(selected !== current && playable(selected) ? selected : current);

  const pause = () => {
    audioRef.current?.pause();
    setPlaying(false);
  };

  const stop = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    audio.currentTime = 0;
    setPlaying(false);
    setTime(0);
  };

  const prev = () => {
    const audio = audioRef.current;
    if (audio && loadedId.current === song.id && time > 3) {
      audio.currentTime = 0;
      setTime(0);
      return;
    }
    const i = step(current, -1);
    if (i < 0) return;
    if (playing) void playAt(i);
    else {
      setCurrent(i);
      setSelected(i);
    }
  };

  const next = () => {
    const i = step(current, 1);
    if (i < 0) return;
    if (playing) void playAt(i);
    else {
      setCurrent(i);
      setSelected(i);
    }
  };

  const setVolume = (v: number) => dispatch({ type: 'SET_SETTINGS', patch: { volume: Math.max(0, Math.min(100, v)), muted: false } });

  const isLoaded = loadedId.current === song.id;
  const shownDuration = isLoaded ? duration : (lengths[song.id] ?? 0);
  const elapsed = isLoaded ? time : 0;
  const shown = elapsedMode ? elapsed : Math.max(0, shownDuration - elapsed);
  const pct = isLoaded && duration > 0 ? Math.min(100, (time / duration) * 100) : 0;
  const lengthOf = (s: Song) => {
    const known = lengths[s.id];
    return known ? formatTime(known) : s.duration;
  };
  const marquee = `${current + 1}. ${song.artist} - ${song.title} (${lengthOf(song)})  ***  for ${CONTENT.user.name}, with love  ***  `;
  const multi = PLAYLIST.filter((_, i) => playable(i)).length > 1;

  return (
    <>
      <audio ref={audioRef} preload="none" hidden />

      <MenuBar>
        <Menu label="File">
          <MenuItem onSelect={play}>Play</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={() => dispatch({ type: 'CLOSE_WINDOW', id: win.id })}>Exit</MenuItem>
        </Menu>
        <Menu label="Play">
          <MenuItem onSelect={() => (playing ? pause() : play())}>{playing ? 'Pause' : 'Play'}</MenuItem>
          <MenuItem onSelect={stop}>Stop</MenuItem>
          <MenuSeparator />
          <MenuItem onSelect={prev}>Previous</MenuItem>
          <MenuItem disabled={!multi} onSelect={next}>
            Next
          </MenuItem>
          <MenuSeparator />
          <MenuItem checked={repeat} onSelect={() => setRepeat((v) => !v)}>
            Repeat Song
          </MenuItem>
        </Menu>
        <Menu label="Options">
          <MenuItem checked={muted} onSelect={() => dispatch({ type: 'SET_SETTINGS', patch: { muted: !muted } })}>
            Mute
          </MenuItem>
          <MenuItem onSelect={() => setVolume(volume + 10)}>Volume Up</MenuItem>
          <MenuItem onSelect={() => setVolume(volume - 10)}>Volume Down</MenuItem>
          <MenuSeparator />
          <MenuItem checked={!elapsedMode} onSelect={() => setElapsedMode((v) => !v)}>
            Show Time Remaining
          </MenuItem>
        </Menu>
        <Menu label="Help">
          <MenuItem onSelect={() => openApp('help')}>Help and Support Center</MenuItem>
        </Menu>
      </MenuBar>

      {error ? (
        <div className="infobar" role="alert">
          <strong>{error}</strong>
        </div>
      ) : null}

      <div className="amp">
        <div className="amp-panel">
          {song.cover ? (
            <img className="amp-cover" src={song.cover} alt={`${song.title} cover art`} draggable={false} />
          ) : (
            <div className="amp-cover amp-cover-blank" role="img" aria-label={`${song.title} by ${song.artist}`}>
              <Icon name="heart" size={32} />
            </div>
          )}
          <div className="amp-display">
            <div className="amp-row">
              <span className="amp-state" aria-hidden>
                <Glyph name={playing ? 'play' : elapsed > 0 ? 'pause' : 'stop'} />
              </span>
              <button type="button" className="amp-time" title="Toggle elapsed / remaining" onClick={() => setElapsedMode((v) => !v)}>
                {elapsedMode ? '' : '-'}
                {formatTime(shown)}
              </button>
              <canvas ref={vizRef} className="amp-viz" width={VIZ_W} height={VIZ_H} aria-hidden />
            </div>
            <div className="amp-marquee" aria-label={`Now playing: ${song.artist}, ${song.title}`}>
              <span key={song.id} style={reduced ? { animation: 'none' } : undefined}>
                {marquee}
                {marquee}
              </span>
            </div>
            <div className="amp-meta" aria-hidden>
              <span>
                <b>128</b> kbps
              </span>
              <span>
                <b>44</b> kHz
              </span>
              <span>{loading ? 'buffering…' : playing ? 'stereo' : 'stopped'}</span>
            </div>
          </div>
        </div>

        <input
          type="range"
          className="amp-seek"
          min={0}
          max={duration || 1}
          step={0.1}
          value={isLoaded ? Math.min(time, duration || 0) : 0}
          disabled={!isLoaded || duration === 0}
          aria-label="Seek"
          aria-valuetext={`${formatTime(elapsed)} of ${formatTime(shownDuration)}`}
          style={{ '--pct': `${pct}%` } as CSSProperties}
          onChange={(e) => {
            const value = Number(e.target.value);
            if (audioRef.current) audioRef.current.currentTime = value;
            setTime(value);
          }}
        />

        <div className="amp-controls">
          <button type="button" className="amp-btn" aria-label="Previous" title="Previous" onClick={prev}>
            <Glyph name="prev" />
          </button>
          <button
            type="button"
            className="amp-btn"
            data-main="true"
            aria-label={playing ? 'Pause' : 'Play'}
            aria-pressed={playing}
            title={playing ? 'Pause' : 'Play'}
            onClick={() => (playing ? pause() : play())}
          >
            <Glyph name={playing ? 'pause' : 'play'} />
          </button>
          <button type="button" className="amp-btn" aria-label="Stop" title="Stop" onClick={stop}>
            <Glyph name="stop" />
          </button>
          <button type="button" className="amp-btn" aria-label="Next" title="Next" disabled={!multi} onClick={next}>
            <Glyph name="next" />
          </button>
          <button type="button" className="amp-btn amp-btn-text" aria-label="Repeat song" aria-pressed={repeat} title="Repeat song" onClick={() => setRepeat((v) => !v)}>
            REP
          </button>
          <span style={{ flex: 1 }} />
          <span className="amp-label">Vol</span>
          <input
            type="range"
            className="amp-vol"
            min={0}
            max={100}
            value={muted ? 0 : volume}
            aria-label="Volume"
            style={{ width: 76 }}
            onChange={(e) => setVolume(Number(e.target.value))}
          />
        </div>

        <div className="amp-list">
          <div className="amp-list-head">
            <span>Playlist</span>
            <span>{PLAYLIST.length} tracks</span>
          </div>
          <div
            className="amp-tracks dark-scroll"
            role="listbox"
            aria-label="Playlist"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setSelected((s) => Math.min(PLAYLIST.length - 1, s + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setSelected((s) => Math.max(0, s - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                void playAt(selected);
              }
            }}
          >
            {PLAYLIST.map((track, i) => (
              <div
                key={track.id}
                role="option"
                aria-selected={i === selected}
                aria-disabled={!track.load || undefined}
                title={track.load ? 'Double-click to play' : 'This song is not on this computer yet.'}
                className="amp-track"
                data-current={i === current && playing ? 'true' : undefined}
                onClick={() => setSelected(i)}
                onDoubleClick={() => void playAt(i)}
              >
                <span className="amp-track-name">
                  {i + 1}. {track.artist} - {track.title}
                </span>
                <span className="amp-track-time">{lengthOf(track)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
