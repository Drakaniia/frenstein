import { useEffect, useRef } from 'react';

import { useOs } from '@/os/OsProvider';
import { playSfx } from '@/os/sfx';
import type { OsNotification } from '@/os/types';
import { Button } from './controls';
import { Glyph } from './Glyph';
import { Icon } from './Icon';

/**
 * XP balloon tips above the notification area. Two are shown at a time
 * (the rest wait in line); each one times out on its own clock unless it
 * is marked persistent.
 */
export function NotificationManager() {
  const { state, dispatch, openApp } = useOs();
  const { notifications, settings } = state;
  const seen = useRef(new Set<number>());
  const timers = useRef(new Map<number, number>());

  // A soft "bloop" for every new balloon.
  useEffect(() => {
    let fresh = false;
    for (const n of notifications) {
      if (!seen.current.has(n.id)) {
        seen.current.add(n.id);
        fresh = true;
      }
    }
    if (fresh) playSfx('balloon');
  }, [notifications]);

  // Per-balloon timers: a new balloon never extends an older one's life.
  useEffect(() => {
    const live = new Set(notifications.map((n) => n.id));
    for (const n of notifications.slice(0, 2)) {
      if (n.persistent || timers.current.has(n.id)) continue;
      timers.current.set(
        n.id,
        window.setTimeout(() => {
          timers.current.delete(n.id);
          dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id });
        }, settings.notificationMs)
      );
    }
    for (const [id, timer] of timers.current) {
      if (!live.has(id)) {
        window.clearTimeout(timer);
        timers.current.delete(id);
      }
    }
  }, [notifications, settings.notificationMs, dispatch]);

  useEffect(() => {
    const map = timers.current;
    return () => map.forEach((t) => window.clearTimeout(t));
  }, []);

  if (!settings.notificationsEnabled || notifications.length === 0) return null;

  const visible = notifications.slice(0, 2);
  const queued = notifications.length - visible.length;

  const act = (n: OsNotification) => {
    if (n.actionApp) openApp(n.actionApp, n.actionPayload);
    dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id });
  };

  return (
    <div className="balloon-stack" role="region" aria-label="Notifications" aria-live="polite">
      {visible.map((n, i) => (
        <div key={n.id} className="balloon" role="status" data-tail={i === visible.length - 1 ? 'true' : undefined}>
          <div className="balloon-title">
            <Icon name={n.icon} size={16} />
            <span>{n.title}</span>
          </div>
          <button
            type="button"
            className="balloon-close"
            aria-label={`Close: ${n.title}`}
            onClick={() => dispatch({ type: 'DISMISS_NOTIFICATION', id: n.id })}
          >
            <Glyph name="x" />
          </button>
          {n.actionApp ? (
            <button type="button" className="balloon-body" data-action="true" onClick={() => act(n)}>
              {n.body}
            </button>
          ) : (
            <div className="balloon-body">{n.body}</div>
          )}
          {n.actionApp && n.actionLabel ? (
            <div className="balloon-actions">
              <Button small onClick={() => act(n)}>
                {n.actionLabel}
              </Button>
            </div>
          ) : null}
        </div>
      ))}
      {queued > 0 ? <span className="balloon-more">+{queued} more</span> : null}
    </div>
  );
}
