import { useEffect, useRef, useState } from 'react';

import { ToolButton, ToolSeparator } from '@/components/controls';
import { Icon } from '@/components/Icon';
import { PHOTOS } from '@/data/photos';
import { useOs } from '@/os/OsProvider';
import type { WindowState } from '@/os/types';

const clampIndex = (n: number) => Math.max(0, Math.min(PHOTOS.length - 1, n));
const toIndex = (payload: WindowState['payload']) => clampIndex(typeof payload === 'number' ? payload : Number(payload ?? 0) || 0);

/**
 * The Picture and Fax Viewer: one photo at a time, previous/next, best fit
 * or actual size, zoom, rotate, and a slide show — with the same keys XP used.
 */
export function PhotoViewer({ win }: { win: WindowState }) {
  const { dispatch, closeWindow } = useOs();
  const [index, setIndex] = useState(() => toIndex(win.payload));
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const rev = useRef(win.payloadRev);

  // Opening another picture while the viewer is open switches to it.
  useEffect(() => {
    if (rev.current === win.payloadRev) return;
    rev.current = win.payloadRev;
    setIndex(toIndex(win.payload));
    setZoom(1);
    setRotation(0);
  }, [win.payloadRev, win.payload]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  const photo = PHOTOS[index];
  useEffect(() => {
    if (photo) dispatch({ type: 'SET_WINDOW_TITLE', id: win.id, title: `${photo.filename} - Picture Viewer` });
  }, [dispatch, win.id, photo]);

  const go = (delta: number) => {
    if (PHOTOS.length === 0) return;
    setIndex((i) => (i + delta + PHOTOS.length) % PHOTOS.length);
    setZoom(1);
    setRotation(0);
  };

  if (!photo) {
    return (
      <div className="empty-note" style={{ background: '#fff', flex: 1 }}>
        <Icon name="photo" size={48} />
        <span>This picture is no longer available.</span>
      </div>
    );
  }

  return (
    <div
      ref={ref}
      className="viewer"
      tabIndex={0}
      role="region"
      aria-label={`${photo.filename}, picture ${index + 1} of ${PHOTOS.length}`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          go(-1);
        } else if (e.key === 'ArrowRight' || e.key === ' ') {
          e.preventDefault();
          go(1);
        } else if (e.key === '+' || e.key === '=') {
          setZoom((z) => Math.min(4, z * 1.25));
        } else if (e.key === '-') {
          setZoom((z) => Math.max(1, z / 1.25));
        } else if (e.key.toLowerCase() === 'r') {
          setRotation((r) => r + (e.shiftKey ? -90 : 90));
        } else if (e.key === 'Escape') {
          e.preventDefault();
          closeWindow(win.id);
        } else if (e.key === 'F11') {
          e.preventDefault();
          dispatch({ type: 'SCREENSAVER', open: true, mode: 'slideshow', start: index });
        }
      }}
    >
      <div className="viewer-stage" data-zoomed={zoom > 1 ? 'true' : undefined} onDoubleClick={() => setZoom((z) => (z > 1 ? 1 : 2))}>
        <img
          src={photo.src}
          alt={photo.caption || photo.alt}
          draggable={false}
          style={{ transform: `rotate(${rotation}deg) scale(${zoom})` }}
        />
      </div>
      <div className="viewer-caption" aria-live="polite">
        {photo.caption || photo.alt} · {index + 1} of {PHOTOS.length}
      </div>
      <div className="viewer-bar" role="toolbar" aria-label="Picture Viewer">
        <ToolButton icon="pv-prev" label="Previous Image (Left Arrow)" onClick={() => go(-1)} />
        <ToolButton icon="pv-next" label="Next Image (Right Arrow)" onClick={() => go(1)} />
        <ToolSeparator />
        <ToolButton icon="pv-fit" label="Best Fit" pressed={zoom === 1} onClick={() => setZoom(1)} />
        <ToolButton icon="pv-slideshow" label="Start Slide Show (F11)" onClick={() => dispatch({ type: 'SCREENSAVER', open: true, mode: 'slideshow', start: index })} />
        <ToolSeparator />
        <ToolButton icon="pv-zoomin" label="Zoom In (+)" disabled={zoom >= 4} onClick={() => setZoom((z) => Math.min(4, z * 1.25))} />
        <ToolButton icon="pv-zoomout" label="Zoom Out (-)" disabled={zoom <= 1} onClick={() => setZoom((z) => Math.max(1, z / 1.25))} />
        <ToolSeparator />
        <ToolButton icon="pv-rotr" label="Rotate Clockwise (R)" onClick={() => setRotation((r) => r + 90)} />
        <ToolButton icon="pv-rotl" label="Rotate Counterclockwise (Shift+R)" onClick={() => setRotation((r) => r - 90)} />
      </div>
    </div>
  );
}
