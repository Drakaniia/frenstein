import { useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent, ReactNode } from 'react';

import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import { useStage } from '@/os/StageContext';
import type { WindowState } from '@/os/types';
import { ContextMenu } from './ContextMenu';
import { Glyph } from './Glyph';
import { Icon } from './Icon';

type Edge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGES: Edge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];
const EDGE_CURSOR: Record<Edge, string> = { n: 'ns', s: 'ns', e: 'ew', w: 'ew', ne: 'nesw', sw: 'nesw', nw: 'nwse', se: 'nwse' };

interface Gesture {
  kind: 'move' | Edge;
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

interface WindowProps {
  win: WindowState;
  active: boolean;
  children: ReactNode;
}

/**
 * A Luna window: rounded blue caption with icon and title, the three XP
 * caption buttons, a system menu, and resizing from any edge or corner.
 * Geometry lives in the reducer; pointer moves are batched once per frame.
 */
export function Window({ win, active, children }: WindowProps) {
  const { scale, compact } = useStage();
  const { dispatch, focusWindow, minimizeWindow, toggleMaximize, closeWindow } = useOs();
  const gesture = useRef<Gesture | null>(null);
  const pending = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const frame = useRef(0);
  const [menu, setMenu] = useState<{ x: number; y: number; keyboard: boolean } | null>(null);

  const maximized = win.status === 'maximized';
  const minimized = win.status === 'minimized';
  const canMaximize = win.resizable && !compact;

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const flush = () => {
    frame.current = 0;
    const g = gesture.current;
    const p = pending.current;
    if (!g || !p) return;
    if (g.kind === 'move') dispatch({ type: 'MOVE_WINDOW', id: win.id, x: p.x, y: p.y });
    else dispatch({ type: 'RESIZE_WINDOW', id: win.id, x: p.x, y: p.y, w: p.w, h: p.h });
  };

  const begin = (kind: Gesture['kind'], e: ReactPointerEvent<HTMLElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    gesture.current = { kind, pointerId: e.pointerId, startX: e.clientX, startY: e.clientY, x: win.x, y: win.y, w: win.w, h: win.h };
  };

  const onMove = (e: ReactPointerEvent<HTMLElement>) => {
    const g = gesture.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const dx = (e.clientX - g.startX) / scale;
    const dy = (e.clientY - g.startY) / scale;
    if (g.kind === 'move') {
      pending.current = { x: g.x + dx, y: g.y + dy, w: g.w, h: g.h };
    } else {
      let { x, y, w, h } = g;
      if (g.kind.includes('e')) w = g.w + dx;
      if (g.kind.includes('s')) h = g.h + dy;
      if (g.kind.includes('w')) {
        w = Math.max(win.minW, g.w - dx);
        x = g.x + (g.w - w);
      }
      if (g.kind.startsWith('n')) {
        h = Math.max(win.minH, g.h - dy);
        y = g.y + (g.h - h);
      }
      pending.current = { x, y, w, h };
    }
    if (!frame.current) frame.current = requestAnimationFrame(flush);
  };

  const end = (e: ReactPointerEvent<HTMLElement>) => {
    if (gesture.current?.pointerId !== e.pointerId) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    if (frame.current) {
      cancelAnimationFrame(frame.current);
      flush();
    }
    gesture.current = null;
    pending.current = null;
  };

  const onControls = (target: EventTarget | null) => target instanceof Element && target.closest('.title-bar-controls, .title-bar-icon') !== null;

  const doMinimize = () => {
    playSfx('minimize');
    minimizeWindow(win.id);
  };
  const doMaximize = () => {
    if (!canMaximize) return;
    playSfx('maximize');
    toggleMaximize(win.id);
  };
  const doClose = () => {
    playSfx('close');
    closeWindow(win.id);
  };

  const openSystemMenu = (clientX: number, clientY: number, keyboard = false) => setMenu({ x: clientX, y: clientY, keyboard });

  return (
    <div
      role="region"
      aria-label={win.title}
      className="window"
      data-active={active}
      data-maximized={maximized}
      onPointerDownCapture={() => focusWindow(win.id)}
      onKeyDown={(e) => {
        if (e.altKey && e.key === ' ') {
          e.preventDefault();
          const r = e.currentTarget.getBoundingClientRect();
          openSystemMenu(r.left + 4, r.top + 24, true);
        }
      }}
      style={{
        left: win.x,
        top: win.y,
        width: win.w,
        height: win.h,
        zIndex: win.z,
        display: minimized ? 'none' : undefined,
      }}
    >
      <div
        className="title-bar"
        onPointerDown={(e) => {
          if (e.button !== 0 || onControls(e.target) || maximized) return;
          begin('move', e);
        }}
        onPointerMove={onMove}
        onPointerUp={end}
        onPointerCancel={end}
        onDoubleClick={(e) => {
          if (onControls(e.target)) return;
          doMaximize();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          openSystemMenu(e.clientX, e.clientY);
        }}
      >
        <button
          type="button"
          className="title-bar-icon"
          aria-label="System menu"
          tabIndex={-1}
          style={{ padding: 0, border: 0, background: 'none', lineHeight: 0 }}
          onClick={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            openSystemMenu(r.left, r.bottom);
          }}
          onDoubleClick={doClose}
        >
          <Icon name={win.icon} size={16} />
        </button>
        <span className="title-bar-text">{win.title}</span>
        <div className="title-bar-controls">
          <button type="button" className="cap-btn" aria-label="Minimize" onClick={doMinimize}>
            <Glyph name="minimize" />
          </button>
          {canMaximize ? (
            <button type="button" className="cap-btn" aria-label={maximized ? 'Restore' : 'Maximize'} onClick={doMaximize}>
              <Glyph name={maximized ? 'restore' : 'maximize'} />
            </button>
          ) : null}
          <button type="button" className="cap-btn" data-kind="close" aria-label="Close" onClick={doClose}>
            <Glyph name="close" />
          </button>
        </div>
      </div>

      <div className="window-body">{children}</div>

      {win.resizable && !maximized && !compact
        ? EDGES.map((edge) => (
            <div
              key={edge}
              className={`rz rz-${edge}`}
              data-cursor={EDGE_CURSOR[edge]}
              aria-hidden
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                e.stopPropagation();
                begin(edge, e);
              }}
              onPointerMove={onMove}
              onPointerUp={end}
              onPointerCancel={end}
            />
          ))
        : null}

      {menu ? (
        <ContextMenu
          clientX={menu.x}
          clientY={menu.y}
          keyboard={menu.keyboard}
          label={`${win.title} window menu`}
          onClose={() => setMenu(null)}
          items={[
            { id: 'restore', label: 'Restore', disabled: !maximized || compact, onSelect: doMaximize, icon: undefined },
            { id: 'min', label: 'Minimize', onSelect: doMinimize },
            { id: 'max', label: 'Maximize', disabled: maximized || !canMaximize, onSelect: doMaximize },
            { id: 'sep', separator: true },
            { id: 'close', label: 'Close', bold: true, accelerator: 'Alt+F4', onSelect: doClose },
          ]}
        />
      ) : null}
    </div>
  );
}
