import { useEffect, useState } from 'react';

/**
 * The taskbar clock: updates once a minute, never per second.
 */
export function useClock(): Date {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: number;
    const tick = () => {
      const current = new Date();
      setNow(current);
      const msToNextMinute = (60 - current.getSeconds()) * 1000 - current.getMilliseconds() + 20;
      timer = window.setTimeout(tick, msToNextMinute);
    };
    const msToNextMinute = (60 - new Date().getSeconds()) * 1000 + 20;
    timer = window.setTimeout(tick, msToNextMinute);
    return () => window.clearTimeout(timer);
  }, []);

  return now;
}

export function formatTime(d: Date, clock24h = true): string {
  if (clock24h) {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
  const hours = d.getHours() % 12 || 12;
  return `${hours}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

export function formatFullDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  });
}
