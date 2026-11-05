import type { CSSProperties } from 'react';

import { METRICS, type MetricKey, type Metrics } from './metrics';

/** Direct access for non-component call sites (reducer geometry, etc.). */
export const CHROME: Metrics = METRICS;

/**
 * `useChrome()` — the resolved chrome metrics. Components read `m.captionH`,
 * never a bare number, so the stylesheet and the layout maths cannot drift.
 */
export function useChrome(): { m: Metrics } {
  return { m: CHROME };
}

/** Metric → CSS custom property. Only the metrics the stylesheet reads. */
const CSS_VAR_NAME: Partial<Record<MetricKey, string>> = {
  frame: '--win-frame',
  frameRadius: '--win-radius',
  captionH: '--win-caption-h',
  captionBtn: '--win-caption-btn',
  btnH: '--win-btn-h',
  btnMinW: '--win-btn-min-w',
  btnPadX: '--win-btn-pad-x',
  btnRadius: '--win-btn-radius',
  toolbarBtnH: '--win-toolbar-btn-h',
  menuH: '--win-menu-h',
  menuItemH: '--win-menu-item-h',
  menuGutter: '--win-menu-gutter',
  menuMinW: '--win-menu-min-w',
  fieldH: '--win-field-h',
  check: '--win-check',
  radio: '--win-radio',
  choiceGap: '--win-choice-gap',
  rangeTrack: '--win-range-track',
  rangeThumbW: '--win-range-thumb-w',
  rangeThumbH: '--win-range-thumb-h',
  groupPad: '--win-group-pad',
  tabH: '--win-tab-h',
  scrollbar: '--win-scrollbar',
  statusH: '--win-status-h',
  progressH: '--win-progress-h',
  icon: '--win-icon',
  iconCellW: '--win-icon-cell-w',
  iconCellH: '--win-icon-cell-h',
  taskbarH: '--win-taskbar-h',
  startW: '--win-start-w',
  taskBtnH: '--win-task-btn-h',
  taskBtnMinW: '--win-task-btn-min-w',
  taskBtnMaxW: '--win-task-btn-max-w',
  startMenuW: '--win-start-menu-w',
  startUserH: '--win-start-user-h',
  startFooterH: '--win-start-footer-h',
  balloonW: '--win-balloon-w',
  focusInset: '--win-focus-inset',
  textUi: '--text-ui',
  textTitle: '--text-title',
};

/** The CSS variables the stylesheet reads, injected once on the stage root. */
export function chromeVars(): CSSProperties {
  const out: Record<string, string> = {};
  for (const key of Object.keys(CSS_VAR_NAME) as MetricKey[]) {
    const name = CSS_VAR_NAME[key];
    if (name) out[name] = `${CHROME[key]}px`;
  }
  return out as CSSProperties;
}
