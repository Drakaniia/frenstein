import { createContext, useContext } from 'react';
import type { ReactNode, RefObject } from 'react';

export interface StageValue {
  /** CSS px per logical stage px. */
  scale: number;
  /** Device px per logical stage px (integer). */
  pixel: number;
  stageW: number;
  stageH: number;
  /** Narrow or short stage: full-screen windows, icon-only taskbar. */
  compact: boolean;
  stageRef: RefObject<HTMLDivElement | null>;
}

const StageContext = createContext<StageValue | null>(null);

export function StageProvider({
  value,
  children,
}: {
  value: StageValue;
  children: ReactNode;
}) {
  return <StageContext.Provider value={value}>{children}</StageContext.Provider>;
}

export function useStage(): StageValue {
  const ctx = useContext(StageContext);
  if (!ctx) throw new Error('useStage must be used inside <StageProvider>');
  return ctx;
}
