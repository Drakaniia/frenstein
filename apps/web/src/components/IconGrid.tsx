import type { CSSProperties, MouseEvent, RefObject } from 'react';

import { TASKBAR_H } from '@/os/apps';
import { useStage } from '@/os/StageContext';
import { useChrome } from '@/os/useChrome';
import { ICON_PIXELS, type AppId, type IconSize } from '@/os/types';
import { DesktopIcon } from './DesktopIcon';

interface IconGridProps {
  items: AppId[];
  selectedIndex: number;
  focusedIndex: number;
  gridRef: RefObject<HTMLDivElement | null>;
  showLabels: boolean;
  iconSize: IconSize;
  coarse: boolean;
  /** Override an app's icon (e.g. the full Recycle Bin). */
  iconFor: (appId: AppId) => string;
  pulse?: AppId | null;
  onSelect: (index: number) => void;
  onFocus: (index: number) => void;
  onOpen: (appId: AppId) => void;
  onContextMenu: (appId: AppId, event: MouseEvent<HTMLButtonElement>) => void;
}

const CELL_W: Record<IconSize, number> = { small: 70, medium: 78, large: 92 };

/** Column-first icon grid: one tab stop, arrow keys move in two dimensions. */
export function IconGrid({
  items,
  selectedIndex,
  focusedIndex,
  gridRef,
  showLabels,
  iconSize,
  coarse,
  iconFor,
  pulse,
  onSelect,
  onFocus,
  onOpen,
  onContextMenu,
}: IconGridProps) {
  const { stageH } = useStage();
  const { m } = useChrome();
  const size = ICON_PIXELS[iconSize];
  const cellH = size + (showLabels ? 36 : 10);
  const gap = 6;
  const available = Math.max(cellH, stageH - TASKBAR_H - m.iconOrigin * 2);
  const rows = Math.max(1, Math.floor((available + gap) / (cellH + gap)));
  const cols = Math.max(1, Math.ceil(items.length / rows));
  const cellW = CELL_W[iconSize];

  const moveTo = (index: number) => {
    if (items.length === 0) return;
    const clamped = Math.max(0, Math.min(items.length - 1, index));
    onFocus(clamped);
    onSelect(clamped);
    requestAnimationFrame(() => {
      gridRef.current?.querySelectorAll<HTMLElement>('[role="option"]')[clamped]?.focus();
    });
  };

  const rowOf = (i: number) => i % rows;
  const colOf = (i: number) => Math.floor(i / rows);

  return (
    <div
      ref={gridRef}
      className="icon-grid"
      role="listbox"
      aria-label="Desktop"
      aria-orientation="vertical"
      style={
        {
          left: m.iconOrigin,
          top: m.iconOrigin,
          height: rows * (cellH + gap),
          width: cols * (cellW + 2),
          '--win-icon-cell-w': `${cellW}px`,
        } as CSSProperties
      }
      onKeyDown={(e) => {
        const i = Math.max(0, focusedIndex);
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (rowOf(i) < rows - 1 && i + 1 < items.length) moveTo(i + 1);
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (rowOf(i) > 0) moveTo(i - 1);
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          if (i + rows < items.length) moveTo(i + rows);
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          if (colOf(i) > 0) moveTo(i - rows);
        } else if (e.key === 'Home') {
          e.preventDefault();
          moveTo(0);
        } else if (e.key === 'End') {
          e.preventDefault();
          moveTo(items.length - 1);
        }
      }}
    >
      {items.map((appId, i) => (
        <DesktopIcon
          key={appId}
          appId={appId}
          icon={iconFor(appId)}
          selected={selectedIndex === i}
          focused={focusedIndex === i}
          size={size}
          showLabel={showLabels}
          coarse={coarse}
          pulse={pulse === appId}
          onSelect={() => {
            onFocus(i);
            onSelect(i);
          }}
          onOpen={() => onOpen(appId)}
          onContextMenu={(event) => onContextMenu(appId, event)}
        />
      ))}
    </div>
  );
}

